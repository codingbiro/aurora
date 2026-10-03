// Measured Kp (web/src/model/kphistory.mjs): merging GFZ's and NOAA's 3-hour Kp, NOAA's running estimate for the block in
// progress, the tile summary, plus the Kp formatting and the dark hours the history chart shades.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { kpBlocks, runningBlock, kpSummary, stormLevel, blockStart, statusText, BLOCK } from '../web/src/model/kphistory.mjs';
import { parseKpForecast, parseKp1m } from '../web/src/data/noaa.mjs';
import { darkIntervals } from '../web/src/model/sky.mjs';
import { fmt } from '../web/src/ui/format.mjs';

const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;
const json = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8').then(JSON.parse);
const at = (h, m = 0, s = 0) => Date.UTC(2026, 9, 3, h, m, s);

describe('Kp notation and levels', () => {
  test('Kp is written in thirds, the way it is published', () => {
    assert.deepEqual([0, 0.333, 0.667, 1, 1.667, 2, 2.333, 2.67, 4.67, 8.667, 9].map(fmt.kp), ['0', '0+', '1-', '1', '2-', '2', '2+', '3-', '5-', '9-', '9']);
    assert.equal(fmt.kp(10.333), '10+'); // Hp30 has no upper limit
    assert.equal(fmt.kp(NaN), '–');
    assert.equal(fmt.block(at(9)), '09–12'); assert.equal(fmt.block(at(21)), '21–24');
    assert.equal(fmt.dayUtc(at(23, 30)), 'Sat 3 Oct');
  });

  test('NOAA classes: 4- is active, 5- is G1, 9- is still G4', () => {
    const label = (kp) => stormLevel(kp).label;
    assert.deepEqual([0, 2.333, 3.333, 3.667, 4.333].map(label), ['quiet', 'quiet', 'unsettled', 'active', 'active']);
    assert.deepEqual([4.667, 5.333, 5.667, 6.667, 7.667, 8.667, 9, 10.333].map(kp => stormLevel(kp).g), [1, 1, 2, 3, 4, 4, 5, 5]);
    assert.equal(label(4.667), 'G1 minor storm'); assert.equal(label(9), 'G5 extreme storm');
    assert.deepEqual(stormLevel(NaN), { k: NaN, g: NaN, label: '' });
    assert.equal(statusText('pre'), 'preliminary'); assert.equal(statusText('def'), 'final'); assert.equal(statusText('xyz'), 'xyz');
  });
});

describe('3-hour blocks', () => {
  test('GFZ wins where both have a block; NOAA fills the blocks GFZ has not published', () => {
    const gfz = [{ t: at(3), value: 2.333, status: 'pre' }, { t: at(6), value: 1.667, status: 'pre' }];
    const noaa = [{ t: at(3), kp: 2, status: 'observed' }, { t: at(6), kp: 2.33, status: 'observed' }, { t: at(9), kp: 2, status: 'observed' }];
    const b = kpBlocks({ gfz, noaa, now: at(12, 20) });
    assert.deepEqual(b.map(x => [x.t, x.kp, x.source]), [[at(3), 2.333, 'GFZ'], [at(6), 1.667, 'GFZ'], [at(9), 2, 'NOAA']]);
    assert.equal(b[0].noaa, 2); assert.equal(b[0].status, 'pre'); assert.ok(Number.isNaN(b[2].gfz));
  });

  test("NOAA's 'estimated' rows are the rest of the day's forecast, never a measurement (captured file)", async () => {
    // captured 2026-09-17 16:05 UTC: observed up to the 12-15 block, 'estimated' for 15, 18 and 21 UTC
    const noaa = parseKpForecast(await json('kp-forecast.json'));
    const running = parseKp1m(await json('planetary_k_index_1m.json'));
    const now = Date.UTC(2026, 8, 17, 16, 6);
    const b = kpBlocks({ noaa, running, now });
    assert.equal(b.length, noaa.filter(r => r.status === 'observed').length);
    assert.deepEqual(b[b.length - 1], { t: Date.UTC(2026, 8, 17, 12), kp: 3, source: 'NOAA', status: null, gfz: NaN, noaa: 3 });
    assert.ok(b.every(x => x.t + BLOCK <= now));
    // the forecast says 3.33 for 15-18 UTC; what NOAA had measured of that block at 16:05 was 0.67
    assert.equal(noaa.find(r => r.t === Date.UTC(2026, 8, 17, 15)).kp, 3.33);
    assert.deepEqual(runningBlock(running, now), { t: Date.UTC(2026, 8, 17, 15), kp: 0.67, at: Date.UTC(2026, 8, 17, 16, 5) });
  });

  test("the running value's last minutes stand in for a finished block until either file has it", () => {
    const running = []; for (let t = at(11); t < at(12); t += MIN) running.push({ t, kp: t >= at(11, 50) ? 2.67 : 2.33 });
    running.push({ t: at(12), kp: 0 }, { t: at(12, 1), kp: 0 });
    const b = kpBlocks({ running, now: at(12, 3) });
    assert.deepEqual(b.map(x => [x.t, x.kp, x.source]), [[at(9), 2.67, 'NOAA running']]);
    // not while the block is still running, and not from a feed that stopped twenty minutes before the end
    assert.deepEqual(kpBlocks({ running: running.filter(r => r.t < at(12)), now: at(11, 59, 30) }), []);
    assert.deepEqual(kpBlocks({ running: running.filter(r => r.t < at(11, 40)), now: at(12, 3) }), []);
    // once GFZ has the block, its value replaces the stand-in
    assert.deepEqual(kpBlocks({ gfz: [{ t: at(9), value: 2.333, status: 'pre' }], running, now: at(12, 3) }).map(x => [x.kp, x.source]), [[2.333, 'GFZ']]);
  });

  test('the running estimate restarts at every block boundary: the previous block never counts as "so far"', () => {
    const running = [{ t: at(11, 58), kp: 2.67 }, { t: at(11, 59), kp: 2.67 }];
    assert.equal(runningBlock(running, at(12, 1)), null);
    assert.deepEqual(runningBlock([...running, { t: at(12), kp: 0 }], at(12, 1)), { t: at(12), kp: 0, at: at(12) });
    assert.equal(blockStart(at(14, 59)), at(12));
  });
});

describe('summary for the tiles', () => {
  const hp30 = [{ t: at(11), value: 1.667 }, { t: at(11, 30), value: 2 }, { t: at(12), value: 3 }];

  test('Kp now is the latest finished Hp30 half hour, not one still running', () => {
    const s = kpSummary({ hp30, now: at(12, 7) });
    assert.deepEqual(s.now, { kp: 2, t0: at(11, 30), t1: at(12) });
    assert.deepEqual(kpSummary({ hp30, now: at(12, 31) }).now, { kp: 3, t0: at(12), t1: at(12, 30) });
    assert.equal(kpSummary({ now: at(12) }).now, null);
  });

  test('highest of 24 h and 7 days: the latest of equal blocks, and the block in progress once it is higher', () => {
    const now = at(12, 40);
    const blocks = [
      { t: now - 8 * DAY, kp: 7, source: 'GFZ' }, { t: blockStart(now - 6 * DAY), kp: 5.333, source: 'GFZ' },
      { t: at(0), kp: 3.333, source: 'GFZ' }, { t: at(6), kp: 3.333, source: 'GFZ' }, { t: at(9), kp: 2, source: 'GFZ' },
    ];
    let s = kpSummary({ blocks, running: [{ t: at(12, 39), kp: 1.667 }], now });
    assert.equal(s.max24.t, at(6)); assert.equal(s.max24.kp, 3.333);
    assert.equal(s.max7.kp, 5.333);
    assert.equal(s.last.t, at(9));
    assert.deepEqual(s.block, { t: at(12), kp: 1.667, at: at(12, 39) });
    s = kpSummary({ blocks, running: [{ t: at(12, 39), kp: 4.667 }], now });
    assert.equal(s.max24.kp, 4.667); assert.equal(s.max24.inProgress, true); assert.equal(s.max24.t, at(12));
    assert.equal(s.max7.kp, 5.333);
  });
});

describe('dark hours for the history chart', () => {
  test('Copenhagen in early October: one night, roughly 18 to 04 UTC', () => {
    const iv = darkIntervals(at(12), at(12) + DAY, 55.676, 12.568);
    assert.equal(iv.length, 1);
    const h = (t) => (t - at(0)) / HOUR;
    assert.ok(h(iv[0].start) > 17 && h(iv[0].start) < 19, `start ${h(iv[0].start)}`);
    assert.ok(h(iv[0].end) > 27 && h(iv[0].end) < 29, `end ${h(iv[0].end)}`);
  });

  test('no darkness under the midnight sun, and edges that do not move with the clock', () => {
    assert.deepEqual(darkIntervals(Date.UTC(2026, 5, 20), Date.UTC(2026, 5, 22), 69.649, 18.956), []);
    const a = darkIntervals(at(0), at(0) + 3 * DAY, 55.676, 12.568), b = darkIntervals(at(0) + 7 * MIN, at(0) + 3 * DAY + 7 * MIN, 55.676, 12.568);
    assert.equal(a.length, b.length);
    assert.deepEqual(a.slice(1, -1), b.slice(1, -1));
    assert.equal(a[0].start, at(0)); // the window opened in the dark
  });
});
