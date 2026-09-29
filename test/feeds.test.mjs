// Unit tests for the feed scheduler (web/src/data/feeds.mjs) and the saved-data snapshot (web/src/data/snapshot.mjs).
// Timers and the clock are fake, so every test runs instantly and deterministically.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FeedScheduler, nextDelay, RETRY_MS } from '../web/src/data/feeds.mjs';
import { buildSnapshot, freshEntries, getPath, setPath, SNAPSHOT_VERSION } from '../web/src/data/snapshot.mjs';

const MIN = 60e3;
const quiet = { error: () => {} };
const settle = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r)); };

/** Fake clock with a timer queue; advance(ms) fires due timers in time order and lets their promises settle. */
function fakeTime() {
  let now = 1_000_000, seq = 0; const timers = new Map();
  return {
    now: () => now,
    setTimer: (fn, ms) => { const id = ++seq; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimer: (id) => { timers.delete(id); },
    due: () => [...timers.values()].map(t => t.at - now).sort((a, b) => a - b),
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]); now = next[1].at; next[1].fn(); await settle();
      }
      now = end;
    },
  };
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const okResult = (data = [1]) => ({ meta: { ok: true, status: 200 }, data });

describe('nextDelay', () => {
  test('regular runs keep the cadence from the start of the last run', () => {
    assert.equal(nextDelay(MIN, true, 0, 200, 0), MIN);
    assert.equal(nextDelay(MIN, true, 0, 200, 700), MIN - 700);
    assert.equal(nextDelay(MIN, true, 0, 200, 5 * MIN), MIN / 10, 'a run longer than the cadence still leaves a gap');
  });
  test('failures retry after 15 s, doubling, never later than the cadence', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(n => nextDelay(15 * MIN, false, n, 0)), [15e3, 30e3, 60e3, 120e3, 240e3, 480e3, 900e3]);
    assert.equal(nextDelay(MIN, false, 3, 502), MIN, 'capped at the cadence');
    assert.equal(RETRY_MS, 15e3);
  });
  test('a client error (the upstream has no data for the request) waits for the cadence; 408 and 429 retry', () => {
    assert.equal(nextDelay(15 * MIN, false, 1, 404), 15 * MIN);
    assert.equal(nextDelay(15 * MIN, false, 1, 429), 15e3);
    assert.equal(nextDelay(15 * MIN, false, 1, 408), 15e3);
  });
});

describe('FeedScheduler', () => {
  test('a slow feed does not hold back a fast one (the page used to wait for every feed)', async () => {
    const clock = fakeTime(); const slow = deferred(); const landed = [];
    const s = new FeedScheduler([
      { id: 'fast', every: MIN, get: async () => okResult(), put: () => { landed.push('fast'); return true; } },
      { id: 'slow', every: MIN, get: () => slow.promise, put: () => { landed.push('slow'); return true; } },
    ], { ...clock, log: quiet, onSettled: (f, ok) => landed.push(`settled ${f.id} ${ok}`) });
    s.start(); await settle();
    assert.deepEqual(landed, ['fast', 'settled fast true']);
    assert.deepEqual(s.pending().map(f => f.id), ['slow']);
    slow.resolve(okResult()); await settle();
    assert.deepEqual(landed.slice(2), ['slow', 'settled slow true']);
    assert.equal(s.pending().length, 0);
  });

  test('a failing or throwing feed is isolated, retried fast with backoff, and back on its cadence after a success', async () => {
    const clock = fakeTime(); let calls = 0, fail = true; const settled = [];
    const s = new FeedScheduler([
      { id: 'flaky', every: 15 * MIN, get: async () => { calls++; if (fail) throw new Error('network'); return okResult(); }, put: () => true },
      { id: 'fine', every: 15 * MIN, get: async () => okResult(), put: () => true },
    ], { ...clock, log: quiet, onSettled: (f, ok) => settled.push(`${f.id}:${ok}`) });
    s.start(); await settle();
    assert.deepEqual(settled.sort(), ['fine:true', 'flaky:false']);
    assert.equal(s.get('flaky').error, 'network');
    assert.deepEqual(s.failing().map(f => f.id), ['flaky']);
    await clock.advance(15e3); assert.equal(calls, 2, 'first retry after 15 s');
    await clock.advance(29e3); assert.equal(calls, 2);
    await clock.advance(1e3); assert.equal(calls, 3, 'second retry 30 s later');
    fail = false;
    await clock.advance(60e3); assert.equal(calls, 4);
    assert.equal(s.get('flaky').fails, 0); assert.equal(s.failing().length, 0);
    await clock.advance(15 * MIN - 1); assert.equal(calls, 4);
    await clock.advance(1); assert.equal(calls, 5, 'regular cadence after the success');
  });

  test('a put that throws or finds nothing counts as a failure', async () => {
    const clock = fakeTime(); const results = [];
    const s = new FeedScheduler([
      { id: 'bad', every: MIN, get: async () => okResult(), put: () => { throw new TypeError('list is not iterable'); } },
      { id: 'empty', every: MIN, get: async () => ({ meta: { ok: false, status: 0, error: 'timeout' }, data: [] }), put: () => false },
    ], { ...clock, log: quiet, onSettled: (f, ok) => results.push([f.id, ok, f.error]) });
    s.start(); await settle();
    assert.deepEqual(results.sort(), [['bad', false, 'list is not iterable'], ['empty', false, 'timeout']]);
  });

  test('results wait at the gate; afterGate feeds do not even fetch before it opens', async () => {
    const clock = fakeTime(); const gate = deferred(); const log = [];
    const s = new FeedScheduler([
      { id: 'early', every: MIN, get: async () => { log.push('get early'); return okResult(); }, put: () => { log.push('put early'); return true; } },
      { id: 'late', every: MIN, afterGate: true, get: async () => { log.push('get late'); return okResult(); }, put: () => { log.push('put late'); return true; } },
    ], { ...clock, log: quiet, gate: () => gate.promise });
    s.start(); await settle();
    assert.deepEqual(log, ['get early']);
    gate.resolve(); await settle();
    assert.deepEqual([...log].sort(), ['get early', 'get late', 'put early', 'put late']);
    assert.ok(log.indexOf('get late') < log.indexOf('put late'));
  });

  test('delay postpones only the first run', async () => {
    const clock = fakeTime(); let calls = 0;
    const s = new FeedScheduler([{ id: 'bulky', every: 10 * MIN, delay: 5e3, get: async () => { calls++; return okResult(); }, put: () => true }], { ...clock, log: quiet });
    s.start(); await settle();
    assert.equal(calls, 0); assert.equal(s.pending().length, 1);
    await clock.advance(5e3); assert.equal(calls, 1);
    await clock.advance(10 * MIN); assert.equal(calls, 2);
  });

  test('runNow during a run queues exactly one more run right after it', async () => {
    const clock = fakeTime(); const first = deferred(); let calls = 0;
    const s = new FeedScheduler([{ id: 'tgo', every: 15 * MIN, get: () => { calls++; return calls === 1 ? first.promise : Promise.resolve(okResult()); }, put: () => true }], { ...clock, log: quiet });
    s.start(); await settle();
    s.runNow('tgo'); s.runNow('tgo'); await settle();
    assert.equal(calls, 1, 'no second request while one is in flight');
    first.resolve(okResult()); await settle();
    await clock.advance(0); assert.equal(calls, 2);
    await clock.advance(MIN); assert.equal(calls, 2, 'then back to the cadence');
    s.runNow('unknown'); // ignored
  });

  test('refreshStale runs feeds a cadence old (throttled background timers); retryFailed runs the failed ones', async () => {
    const clock = fakeTime(); const calls = { a: 0, b: 0, c: 0 }; let cFails = true;
    const s = new FeedScheduler([
      { id: 'a', every: MIN, get: async () => { calls.a++; return okResult(); }, put: () => true },
      { id: 'b', every: 15 * MIN, get: async () => { calls.b++; return okResult(); }, put: () => true },
      { id: 'c', every: 15 * MIN, get: async () => { calls.c++; return okResult(); }, put: () => !cFails },
    ], { ...clock, log: quiet });
    s.start(); await settle();
    // pretend the timers never fired while the tab was hidden: drop them and move the clock
    for (const f of s.feeds) clock.clearTimer(f.timer);
    await clock.advance(2 * MIN);
    s.refreshStale(); await settle();
    assert.deepEqual(calls, { a: 2, b: 1, c: 1 });
    cFails = false; s.retryFailed(); await settle();
    assert.deepEqual(calls, { a: 2, b: 1, c: 2 });
    s.retryFailed(); await settle();
    assert.equal(calls.c, 2, 'nothing left to retry');
  });

  test('status is read by the client error code of the result', async () => {
    const clock = fakeTime();
    const s = new FeedScheduler([{ id: 'clear', every: 15 * MIN, get: async () => ({ meta: { ok: false, status: 404, error: 'HTTP 404' }, data: [] }), put: () => false }], { ...clock, log: quiet });
    s.start(); await settle();
    assert.equal(s.get('clear').status, 404);
    assert.deepEqual(clock.due(), [15 * MIN], 'no fast retries against a 404');
  });
});

describe('snapshot', () => {
  test('getPath and setPath follow dotted paths and create what is missing', () => {
    const o = { localRaw: {} };
    setPath(o, 'localRaw.hel', { series: 1 }); setPath(o, 'meta.kp1m', { ok: true }); setPath(o, 'kp1m', [1]);
    assert.deepEqual(o, { localRaw: { hel: { series: 1 } }, meta: { kp1m: { ok: true } }, kp1m: [1] });
    assert.equal(getPath(o, 'localRaw.hel.series'), 1);
    assert.equal(getPath(o, 'localRaw.tormestorp.series'), undefined);
    assert.equal(getPath(o, 'nothing.here'), undefined);
  });

  test('buildSnapshot keeps each field with the time its upstream last delivered it, compacted, and survives structured cloning', () => {
    const state = { kp1m: [{ t: 1, kp: 2 }], ovation: { diff: new Float32Array([1, 2, 3]), obsTime: 5 }, grid: { coordinates: [[0, 50, 0], [0, 60, 12], [0, -60, 30]] }, tgo: null, localRaw: { hel: { series: { t: [1], x: [2] } } } };
    const times = { kp1m: 100, ovation: 90, grid: 80, tgo: 70, 'localRaw.hel': 60, missing: 50, bad: NaN };
    state.bad = [1];
    const snap = buildSnapshot(state, times, 200, { grid: (g) => ({ coordinates: g.coordinates.filter(c => c[1] >= 0 && c[2] > 0) }) });
    assert.equal(snap.version, SNAPSHOT_VERSION); assert.equal(snap.savedAt, 200);
    assert.deepEqual(Object.keys(snap.fields).sort(), ['grid', 'kp1m', 'localRaw.hel', 'ovation'], 'null, undefined and untimed fields are left out');
    assert.deepEqual(snap.fields.grid, { t: 80, v: { coordinates: [[0, 60, 12]] } });
    const copy = structuredClone(snap);
    assert.ok(copy.fields.ovation.v.diff instanceof Float32Array);
    assert.deepEqual([...copy.fields.ovation.v.diff], [1, 2, 3]);
  });

  test('freshEntries returns only fields young enough for their section', () => {
    const now = 10 * 3600e3;
    const snap = { version: SNAPSHOT_VERSION, savedAt: now - MIN, fields: {
      propagated: { t: now - 30 * MIN, v: [1] }, stations: { t: now - 50 * MIN, v: [2] },
      kpForecast: { t: now - 20 * 3600e3, v: [3] }, cmes: { t: now - 26 * 3600e3, v: [] }, future: { t: now + 3600e3, v: 1 }, broken: { v: 1 }, unknown: { t: now, v: 1 },
    } };
    const keep = (p) => ({ propagated: 45 * MIN, stations: 45 * MIN, kpForecast: 24 * 3600e3, cmes: 24 * 3600e3, future: 24 * 3600e3 }[p] || 0);
    assert.deepEqual(freshEntries(snap, now, keep).map(e => e.path).sort(), ['kpForecast', 'propagated']);
    assert.deepEqual(freshEntries(snap, now, keep).find(e => e.path === 'propagated'), { path: 'propagated', t: now - 30 * MIN, v: [1] });
    assert.deepEqual(freshEntries({ ...snap, version: SNAPSHOT_VERSION + 1 }, now, keep), [], 'another version is ignored');
    assert.deepEqual(freshEntries(null, now, keep), []);
    assert.deepEqual(freshEntries({ version: SNAPSHOT_VERSION, fields: 'x' }, now, keep), []);
  });
});
