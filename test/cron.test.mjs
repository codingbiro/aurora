// The Worker's scheduled job end to end, with an in-memory KV and stubbed upstreams: KV writes per run, alerts that
// survive a failing store, one model value per lead in the forecast log, stale data, and the /api/cron fallback rules.
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { runScheduled } from '../worker/src/scheduled.mjs';
import worker from '../worker/src/index.mjs';

const MIN = 60e3, HOUR = 3600e3;
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const iso = (ms) => new Date(ms).toISOString().replace('Z', '');

/** NOAA's 1-hour propagated file: arrival times from now-10 to now+49 min, northward field until now+20 min, then Bz -15. */
function propagated(now, { lead = 50 } = {}) {
  const head = ['time_tag', 'speed', 'density', 'temperature', 'bx', 'by', 'bz', 'bt', 'vx', 'vy', 'vz', 'propagated_time_tag'];
  const rows = [head];
  for (let i = 0; i < 60; i++) {
    const tArr = now + (lead - 60 + i) * MIN, bz = tArr > now + 20 * MIN ? -15 : 3;
    rows.push([iso(tArr - 50 * MIN), '600', '8', '1e5', '1', '2', String(bz), '15', '-600', '0', '0', iso(tArr)]);
  }
  return rows;
}
function memKV({ failPuts = false } = {}) {
  const store = new Map(), puts = [];
  return { store, puts, get: async (k, type) => { const v = store.get(k); return v === undefined ? null : type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { puts.push(k); if (failPuts) throw new Error('KV put() limit exceeded for the day.'); store.set(k, v); } };
}
function stubUpstreams(now, { lead, hooks }) {
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('propagated-solar-wind-1-hour')) return Response.json(propagated(now, { lead }));
    if (u.includes('kp.gfz.de')) return Response.json({ datetime: [new Date(now - 90 * MIN).toISOString()], Hp30: [2.333] });
    if (u.includes('kyoto-dst')) return Response.json([]);
    if (u.includes('aurorawatch')) return new Response('<current_status><site_status status_id="green"/></current_status>');
    if (u.includes('tormestorp')) return new Response('1 2 1');
    if (u.startsWith('https://hook.test/')) { hooks.push(JSON.parse(init.body)); return new Response('ok'); }
    return new Response('not stubbed', { status: 599 });
  };
}
const ENV = (SNAP) => ({ SNAP, OBSERVERS: [{ name: 'Tromsø', lat: 69.649, lon: 18.956, alertOn: 'horizon', minKpLead: 0 }], ALERT_WEBHOOK_URL: 'https://hook.test/x' });

describe('runScheduled', () => {
  test('two KV writes a run (state with history, forecast log), an alert, and a model value per lead', async () => {
    const now = Date.UTC(2026, 8, 29, 22, 0), kv = memKV(), hooks = [];
    stubUpstreams(now, { lead: 50, hooks });
    const s = await runScheduled(ENV(kv), now);
    assert.equal(s.stale, false);
    assert.equal(hooks.length, 1, 'the webhook alert went out');
    const logWrites = kv.puts.filter(k => !k.startsWith('notify:'));
    assert.deepEqual(logWrites.sort(), ['fc:2026-09-29', 'state:latest'], 'no trail and no separate history key');
    const saved = JSON.parse(kv.store.get('state:latest'));
    assert.ok(saved.rolling.length >= 60, 'the driving history travels with the state');
    const o = saved.observers[0];
    assert.equal(o.alerted, true);
    assert.deepEqual(Object.keys(o.alertResult).sort(), ['channels', 'ok']);
    assert.ok(o.alertResult.channels.every(c => !('text' in c)), 'no upstream reply text in the public state');
    const fc = JSON.parse(kv.store.get('fc:2026-09-29'));
    assert.deepEqual(fc.map(r => r[2]), [10, 30, 60]);
    const kpModel = fc.map(r => r[9]);
    assert.ok(kpModel[0] < kpModel[2], `the southward turning at +20 min enters the +60 min row only: ${kpModel}`);
    // the next run a few minutes later: no second alert, the log grows as text
    const again = await runScheduled(ENV(kv), now + 5 * MIN);
    assert.equal(hooks.length, 1, 'one alert per place every 2 hours');
    assert.equal(again.observers[0].alerted, undefined);
    assert.equal(JSON.parse(kv.store.get('fc:2026-09-29')).length, 6);
  });

  test('a store that refuses every write still lets the alert out', async () => {
    const now = Date.UTC(2026, 8, 29, 22, 0), kv = memKV({ failPuts: true }), hooks = [];
    stubUpstreams(now, { lead: 50, hooks });
    const s = await runScheduled(ENV(kv), now);
    assert.equal(hooks.length, 1);
    assert.equal(s.observers[0].alerted, true);
  });

  test('frozen solar wind (the product stopped advancing) never alerts', async () => {
    const now = Date.UTC(2026, 8, 29, 22, 0), kv = memKV(), hooks = [];
    stubUpstreams(now, { lead: -30, hooks }); // the last measured minute arrived 31 minutes ago
    const s = await runScheduled(ENV(kv), now);
    assert.equal(s.stale, true);
    assert.equal(hooks.length, 0);
  });
});

describe('/api/cron', () => {
  const call = (path, headers = {}, env) => worker.fetch(new Request(`https://aurora.test${path}`, { headers }), env, { waitUntil() {} });
  test('the token only counts in the Authorization header', async () => {
    const env = { CRON_TOKEN: 'secret', SNAP: memKV() };
    assert.equal((await call('/api/cron', {}, {})).status, 404, 'no CRON_TOKEN configured');
    assert.equal((await call('/api/cron?token=secret', {}, env)).status, 404, 'not from the query string');
    assert.equal((await call('/api/cron', { Authorization: 'Bearer secre' }, env)).status, 404);
  });
  test('a fallback call right after the scheduled run is skipped', async () => {
    const kv = memKV(); kv.store.set('state:latest', JSON.stringify({ time: new Date(Date.now() - 60e3).toISOString() }));
    globalThis.fetch = async () => { throw new Error('no upstream call expected'); };
    const r = await call('/api/cron', { Authorization: 'Bearer secret' }, { CRON_TOKEN: 'secret', SNAP: kv });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.ok, true); assert.match(j.skipped, /recent/);
    assert.equal(kv.puts.length, 0);
  });
});
