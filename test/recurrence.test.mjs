// Unit tests for the 27-day recurrence forecast (NOAA real-time solar wind archive on iSWA) and the CLEAR gate.
// fetch is stubbed, so nothing reaches the network.
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { hourlyMeans, rtswSpeedHourly, iswaClear, ISWA } from '../web/src/data/hapi.mjs';
import { recurrenceForecast, streamRamps, SOLAR_ROTATION_DAYS, enlilEvents } from '../web/src/model/longterm.mjs';

const HOUR = 3600e3, DAY = 86400e3;
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
/** Stub fetch: route(url) -> {status, body}; every requested URL is recorded. */
function stubFetch(route) {
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(String(url)); const r = route(String(url)); return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), { status: r.status || 200 }); };
  return calls;
}
const csvMinutes = (t0, minutes, speed) => Array.from({ length: minutes }, (_, i) => `${new Date(t0 + i * 60e3).toISOString().replace('.000', '')},${typeof speed === 'function' ? speed(i) : speed}`).join('\n');

describe('hourly means of the archive', () => {
  test('minutes are averaged per hour, stamped mid-hour; fills and thin hours are dropped', () => {
    const t0 = Date.UTC(2026, 8, 1, 14);
    const csv = [csvMinutes(t0, 60, (i) => 400 + i), csvMinutes(t0 + HOUR, 10, 500), '2026-09-01T16:00:00Z,-9999', 'garbage', ''].join('\n');
    assert.deepEqual(hourlyMeans(csv), [{ t: t0 + HOUR / 2, v: 429.5, n: 60 }]);
    assert.equal(hourlyMeans(csv, 10).length, 2);
    assert.deepEqual(hourlyMeans(''), []);
  });

  test('rtswSpeedHourly asks iSWA for BulkSpeed as CSV over the window', async () => {
    const t0 = Date.UTC(2026, 8, 1, 14), calls = stubFetch(() => ({ body: csvMinutes(t0, 120, 450) }));
    const r = await rtswSpeedHourly(t0, t0 + 2 * HOUR);
    assert.equal(calls[0], `${ISWA}/data?id=swpc_rtsw_plasma_P1M&time.min=2026-09-01T14:00:00Z&time.max=2026-09-01T16:00:00Z&parameters=BulkSpeed&format=csv`);
    assert.equal(r.meta.ok, true);
    assert.deepEqual(r.data.map(x => x.v), [450, 450]);
  });
});

describe('27-day recurrence', () => {
  test('one solar rotation forward, inside the window, with the peak and ramps ahead of now', () => {
    const now = Date.UTC(2026, 8, 29, 0), shift = SOLAR_ROTATION_DAYS * DAY;
    // measured a rotation ago: 380 km/s, a stream rising to 600 km/s over a day, starting 2 days after "then"
    const hourly = Array.from({ length: 24 * 7 }, (_, i) => { const t = now - shift - DAY + i * HOUR; const h = i - 72; return { t, v: h < 0 ? 380 : Math.min(600, 380 + h * 10) }; });
    const rec = recurrenceForecast(hourly, now);
    assert.equal(rec.rows[0].t, now - 12 * HOUR, 'starts 12 h before now');
    assert.ok(rec.rows.every(r => r.t <= now + 5 * DAY));
    assert.equal(rec.rows.length, 24 * 5 + 12 + 1);
    assert.deepEqual(rec.peak && [rec.peak.v, rec.peak.t > now], [600, true]);
    assert.ok(rec.ramps.length >= 1); // a long plateau can add a second, later detection; the note shows the first
    assert.equal(rec.ramps[0].from, 380);
    assert.ok(rec.ramps[0].to - rec.ramps[0].from >= 100);
    assert.equal(rec.ramps[0].start, now + 2 * DAY, 'the ramp starts where the measured one did (its last 380 km/s hour), one rotation later');
    assert.deepEqual(recurrenceForecast([], now), { rows: [], peak: null, ramps: [] });
  });

  test('streamRamps is the same ramp rule the WSA-Enlil run uses', () => {
    const t0 = Date.UTC(2026, 8, 20), rows = Array.from({ length: 48 }, (_, i) => ({ t: t0 + i * HOUR, v: i < 20 ? 350 : 350 + (i - 20) * 20 }));
    const ramps = streamRamps(rows, t0);
    assert.equal(ramps.length, 1);
    assert.deepEqual([ramps[0].from, ramps[0].to, ramps[0].peakT], [350, 450, t0 + 25 * HOUR]);
    const series = rows.map(r => ({ time_tag: new Date(r.t).toISOString().slice(0, 19), v_r: r.v, earth_particles_per_cm3: 5, b_r: 1, b_theta: 1, b_phi: 1, polarity: 1, cloud: 0 }));
    assert.deepEqual(enlilEvents(series, t0 + DAY).events.filter(e => e.kind === 'hss'), streamRamps(rows, t0));
  });
});

describe('CLEAR gate', () => {
  test('a dataset whose runs stopped is not asked for data (no 404 every cycle)', async () => {
    const now = Date.UTC(2026, 8, 29);
    const calls = stubFetch((url) => (url.includes('/info?') ? { body: { HAPI: '2.0', startDate: '2026-08-19T16:00:00Z', stopDate: '2026-09-23T06:00:00Z' } } : { status: 404, body: '{}' }));
    const r = await iswaClear(now);
    assert.equal(calls.length, 1, 'only the info request');
    assert.match(calls[0], /\/info\?id=CLEAR_daily_forecast_sw_P1H$/);
    assert.equal(r.meta.ok, true); assert.deepEqual(r.data, []);
    assert.equal(r.stoppedAt, Date.UTC(2026, 8, 23, 6));
  });

  test('a current dataset is fetched and parsed as before', async () => {
    const now = Date.UTC(2026, 8, 29);
    const data = { parameters: [{ name: 'Time' }, { name: 'density' }, { name: 'bulk_speed' }, { name: 'b_mag' }, { name: 'bz' }], data: [['2026-09-30T00:00:00Z', 5, 450, 6, -2]] };
    const calls = stubFetch((url) => (url.includes('/info?') ? { body: { startDate: '2026-08-19T16:00:00Z', stopDate: '2026-10-03T00:00:00Z' } } : { body: data }));
    const r = await iswaClear(now);
    assert.equal(calls.length, 2);
    assert.match(calls[1], /\/data\?id=CLEAR_daily_forecast_sw_P1H&time\.min=2026-09-27T00:00:00Z&time\.max=2026-10-05T00:00:00Z&format=json&parameters=Time,density,bulk_speed,b_mag,bz$/);
    assert.deepEqual(r.data.map(x => [x.t, x.speed, x.bz]), [[Date.UTC(2026, 8, 30), 450, -2]]);
  });

  test('an unreachable info endpoint is a failure (retried), not an empty forecast', async () => {
    stubFetch(() => ({ status: 503, body: 'down' }));
    const r = await iswaClear(Date.UTC(2026, 8, 29));
    assert.equal(r.meta.ok, false); assert.deepEqual(r.data, []);
  });
});
