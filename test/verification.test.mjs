// Verification loop, Geospace correction and timing smear: scoring, MOS fit, the cron's tier forecast,
// the forecast log and sighting endpoints (with an in-memory KV), and the short-term ensemble's timing offsets.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { brierScore, baseRate, auc, reliabilityBins, scoreSummary } from '../web/src/model/scoring.mjs';
import { halfHourMeans, pairWithHp30, mosFit, mosApply } from '../web/src/model/mos.mjs';
import { anchorBlend, tierForecast, normalQuantile, fetchTruth, FORECAST_LEADS, FORECAST_COLUMNS } from '../worker/src/scheduled.mjs';
import { handleApi } from '../worker/src/proxy.mjs';
import { shortTermForecast } from '../web/src/model/shortterm.mjs';
import { MagneticCoordinates } from '../web/src/model/magcoords.mjs';
import { features } from '../web/src/model/coupling.mjs';

const dataFile = (name) => readFile(new URL(`../web/data/${name}`, import.meta.url), 'utf8').then(JSON.parse);
const near = (a, e, tol, msg) => assert.ok(Math.abs(a - e) <= tol, `${msg ?? ''} expected ${e} ± ${tol}, got ${a}`);
const MIN = 60e3, HOUR = 3600e3;

describe('scoring', () => {
  test('Brier, base rate, AUC and reliability on a known set', () => {
    const pairs = [[0.9, 1], [0.8, 1], [0.2, 0], [0.1, 0], [0.6, 0], [0.4, 1]];
    near(brierScore(pairs), (0.01 + 0.04 + 0.04 + 0.01 + 0.36 + 0.36) / 6, 1e-12); near(baseRate(pairs), 0.5, 1e-12);
    near(auc(pairs), 8 / 9, 1e-12, 'ranks: 8 of 9 positive-negative pairs ordered correctly');
    assert.ok(Number.isNaN(auc([[0.5, 1], [0.5, 1]])), 'no negatives: undefined');
    const s = scoreSummary(pairs, 5);
    assert.equal(s.n, 6); near(s.brierClim, 0.25, 1e-12); near(s.bss, 1 - s.brier / 0.25, 1e-12); assert.equal(s.reliability.length, 5); assert.equal(s.reliability[4].n, 2); near(s.reliability[4].observed, 1, 1e-12);
    assert.ok(Number.isNaN(brierScore([[NaN, 1], [0.2, 2]])));
    assert.equal(reliabilityBins([[1, 1]], 10)[9].n, 1, 'p = 1 lands in the top bin');
  });
});

describe('Geospace correction', () => {
  test('half-hour means, pairing and a slope-limited fit', () => {
    const t0 = Date.UTC(2026, 8, 24, 0, 0);
    const geo = []; for (let i = 0; i < 4 * 30; i++) geo.push({ t: t0 + i * MIN, kp: 2 + Math.floor(i / 30) });
    const means = halfHourMeans(geo); assert.equal(means.size, 4); assert.equal(means.get(t0 + 60 * MIN), 4);
    const hp30 = [{ t: t0, value: 2.3 }, { t: t0 + 30 * MIN, value: 3.5 }, { t: t0 + 60 * MIN, value: 4.8 }, { t: t0 + 90 * MIN, value: 6.0 }, { t: t0 + 120 * MIN, value: 7 }];
    const pairs = pairWithHp30(geo, hp30); assert.deepEqual(pairs, [[2, 2.3], [3, 3.5], [4, 4.8], [5, 6.0]]);
    assert.equal(mosFit(pairs), null, 'too few pairs');
    const fit = mosFit(pairs, { minPairs: 4 }); near(fit.b, 1.24, 0.01); near(fit.a, -0.19, 0.02); assert.ok(fit.rmse < fit.rmseRaw);
    const steep = mosFit([[1, 5], [2, 9], [3, 13], [4, 17]], { minPairs: 4 }); assert.equal(steep.b, 1.5, 'slope clamped'); assert.equal(steep.a, 1.5, 'intercept clamped');
    near(mosApply(fit, 4), fit.a + fit.b * 4, 1e-12); assert.equal(mosApply(null, 3), 3); assert.equal(mosApply(fit, 20), 9); assert.ok(Number.isNaN(mosApply(fit, NaN)));
  });
});

describe('cron tier forecast', async () => {
  const coefs = await dataFile('coefficients.json');
  const mag = new MagneticCoordinates(await dataFile('aacgm_europe_grid.json'), await dataFile('mlt_reference.json'));
  const cph = mag.convert(55.676, 12.568), tromso = mag.convert(69.649, 18.956);
  test('normalQuantile inverts the normal CDF', () => { near(normalQuantile(0.5), 0, 1e-9); near(normalQuantile(0.975), 1.95996, 1e-4); near(normalQuantile(0.001), -3.0902, 1e-3); assert.equal(normalQuantile(0), -Infinity); });
  test('anchorBlend uses the calibrated weights and spreads', () => {
    const b0 = anchorBlend(3, 4, 10, 0, coefs.blend); near(b0.w, coefs.blend.weight[0], 1e-9); near(b0.centre, (1 - b0.w) * 3 + b0.w * 4, 1e-9); near(b0.sigma, coefs.blend.sigma[0], 1e-9);
    const b30 = anchorBlend(3, 4, 10, 30, coefs.blend); near(b30.w, coefs.blend.weight[1], 1e-9);
    const older = anchorBlend(3, 4, 40, 30, coefs.blend); near(older.w, coefs.blend.weight[1] * (1 - 20 / 60), 1e-9, 'an older anchor weighs less');
    const stale = anchorBlend(3, 4, 50, 30, coefs.blend); assert.equal(stale.w, 0, 'an interval that ended 45+ min ago is no anchor, as on the dashboard'); assert.equal(stale.centre, 3);
    const none = anchorBlend(3, NaN, NaN, 30, coefs.blend); assert.equal(none.w, 0); assert.equal(none.centre, 3); near(none.sigma, coefs.blend.modelRmse[1], 1e-9, 'no anchor: the model\'s own error');
    assert.equal(stale.sigma, none.sigma);
    assert.equal(anchorBlend(3, 4, 10, 30, null).sigma, 0.75);
  });
  test('tierForecast: Copenhagen tiers rise with the centre, storm floor and Dst edge apply', () => {
    const quiet = tierForecast({ centre: 2, sigma: 0.6, mlat: cph.mlat, mlt: 23 }); assert.ok(quiet.camera < 0.05 && quiet.overhead === 0, JSON.stringify(quiet));
    const kp5 = tierForecast({ centre: 5, sigma: 0.7, mlat: cph.mlat, mlt: 23 }); assert.ok(kp5.camera > 0.5 && kp5.eyeDark > 0.2 && kp5.eyeCity < kp5.eyeDark, JSON.stringify(kp5));
    near(kp5.camera / kp5.eyeDark, (kp5.camera / 0.55) / (kp5.eyeDark / 0.55), 1e-9, 'both faint tiers carry the 0.55 no-chain factor');
    const kp7 = tierForecast({ centre: 7, sigma: 0.7, mlat: cph.mlat, mlt: 23 }); assert.ok(kp7.eyeCity > 0.8 && kp7.camera > 0.95, JSON.stringify(kp7));
    const storm = tierForecast({ centre: 7, sigma: 0.7, mlat: cph.mlat, mlt: 23, dst: -150 }); assert.ok(storm.overhead > kp7.overhead, 'ring-current edge lifts the overhead tier');
    const north = tierForecast({ centre: 2, sigma: 0.6, mlat: tromso.mlat, mlt: 23 }); near(north.camera, 0.55, 1e-9, 'auroral zone without the chain: factor 0.55'); assert.equal(tierForecast({ centre: NaN, sigma: 1, mlat: 60, mlt: 23 }), null);
    assert.deepEqual(FORECAST_LEADS, [10, 30, 60]); assert.equal(FORECAST_COLUMNS.length, 16);
  });
  test('fetchTruth parses the four small feeds and survives failures', async () => {
    const now = Date.UTC(2026, 8, 24, 18, 5);
    const fake = async (url) => {
      const text = (t) => ({ ok: true, text: async () => t, json: async () => JSON.parse(t) });
      if (url.includes('kp.gfz.de')) return text(JSON.stringify({ datetime: ['2026-09-24T17:00:00Z', '2026-09-24T17:30:00Z'], Hp30: [2.0, 2.333] }));
      if (url.includes('kyoto-dst')) return text(JSON.stringify([{ time_tag: '2026-09-24T16:00:00', dst: -30 }, { time_tag: '2026-09-24T17:00:00', dst: -41 }]));
      if (url.includes('aurorawatch')) return text('<site_status status_id="amber"/>');
      if (url.includes('tormestorp')) return text('2 2 2 3 3 3 _ _\n');
      throw new Error('unexpected ' + url);
    };
    const t = await fetchTruth(now, fake);
    assert.deepEqual(t.hp30, { value: 2.333, t: Date.UTC(2026, 8, 24, 17, 30), ageMin: 5 }); assert.equal(t.dst, -41); assert.equal(t.auroraWatch, 'amber'); assert.equal(t.tormestorpK, 3);
    const broken = await fetchTruth(now, async () => { throw new Error('down'); });
    assert.equal(broken.hp30, null); assert.ok(Number.isNaN(broken.dst)); assert.equal(broken.auroraWatch, null);
  });
});

describe('forecast log and sightings API', () => {
  const store = new Map();
  const SNAP = { get: async (k, type) => { const v = store.get(k); return v === undefined ? null : type === 'json' ? JSON.parse(v) : type === 'stream' ? new Response(v).body : v; }, put: async (k, v) => { store.set(k, v); } };
  const req = (path, init = {}) => new Request(`https://proxy.test${path}`, init);
  test('/api/trail returns the fc rows by day', async () => {
    const today = new Date().toISOString().slice(0, 10);
    store.set(`fc:${today}`, JSON.stringify([['2026-09-24T18:00:00.000Z', 'Copenhagen', 30, 2.1, 0.7, 0.01, 0, 0, 0, 2.0, 2.0, 5, -33, 'green', 3, 21.5]]));
    const yesterday = new Date(Date.now() - 86400e3).toISOString().slice(0, 10);
    store.set(`fc:${yesterday}`, JSON.stringify([['x', 'Tromsø', 10], ['y', 'Tromsø', 30]]));
    const r = await handleApi(req('/api/trail?days=3'), { SNAP });
    assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.columns.length, 16); assert.equal(j.days[today].length, 1); assert.equal(j.days[yesterday].length, 2);
    assert.deepEqual(Object.keys(j.days), [today, yesterday], 'days without a log are left out');
    assert.equal((await handleApi(req('/api/trail'), {})).status, 404, 'no store');
  });
  test('sightings need the token and validate the body', async () => {
    const env = { SNAP, SIGHTING_TOKEN: 'secret' };
    assert.equal((await handleApi(req('/api/sighting', { method: 'POST', body: '{}' }), { SNAP })).status, 404, 'unconfigured');
    assert.equal((await handleApi(req('/api/sighting', { method: 'POST', body: '{}' }), env)).status, 401);
    const bad = await handleApi(req('/api/sighting', { method: 'POST', headers: { Authorization: 'Bearer secret' }, body: JSON.stringify({ seen: 'maybe', lat: 55, lon: 12 }) }), env); assert.equal(bad.status, 400);
    const t = Math.floor(Date.now() / MIN) * MIN - HOUR;
    const ok = await handleApi(req('/api/sighting', { method: 'POST', headers: { Authorization: 'Bearer secret' }, body: JSON.stringify({ seen: 'eye', lat: 55.676, lon: 12.568, note: 'faint arc', t }) }), env);
    assert.equal(ok.status, 200); const j = await ok.json(); assert.equal(j.row.seen, 'eye'); assert.equal(j.row.t, new Date(t).toISOString()); assert.equal(j.count, 1);
    for (const far of [Date.now() + 5 * 86400e3, 8.64e15 + 1, 'soon']) assert.equal((await handleApi(req('/api/sighting', { method: 'POST', headers: { Authorization: 'Bearer secret' }, body: JSON.stringify({ seen: 'eye', lat: 55, lon: 12, t: far }) }), env)).status, 400, `t ${far} is refused`);
    assert.equal((await handleApi(req('/api/sighting', { method: 'POST', headers: { Authorization: 'Bearer secre' }, body: '{}' }), env)).status, 401, 'a near-miss token');
    const list = await handleApi(req('/api/sightings?months=2', { headers: { Authorization: 'Bearer secret' } }), env); assert.equal(list.status, 200);
    assert.equal((await handleApi(req('/api/sightings'), env)).status, 401);
    assert.equal((await handleApi(req('/api/sighting', { method: 'PUT' }), env)).status, 405);
    const pre = await handleApi(req('/api/sighting', { method: 'OPTIONS', headers: { Origin: 'https://a.b' } }), env); assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-headers'), 'Content-Type, Authorization');
  });
});

describe('timing smear', async () => {
  const mag = new MagneticCoordinates(await dataFile('aacgm_europe_grid.json'), await dataFile('mlt_reference.json'));
  const coefs = await dataFile('coefficients.json');
  const cph = mag.convert(55.676, 12.568);
  test('a sharp southward turning 20 minutes ahead spreads the members only when timing is uncertain', () => {
    const now = Date.UTC(2026, 9, 10, 22, 30), tLast = now + 45 * MIN, turn = now + 20 * MIN;
    const propagated = []; for (let t = tLast - 8 * HOUR; t <= tLast; t += MIN) { const bz = t < turn ? 2 : -15; const rec = { t, tMeasured: t - 50 * MIN, speed: 500, density: 5, bx: 0, by: 0, bz, bt: Math.abs(bz) }; Object.assign(rec, features(rec)); propagated.push(rec); }
    const smeared = shortTermForecast({ now, propagated, observer: cph, mag, coefficients: coefs });
    const exact = shortTermForecast({ now, propagated, observer: cph, mag, coefficients: coefs, timingSdMin: 0 });
    const r20s = smeared.horizons.find(r => r.h === 20), r20e = exact.horizons.find(r => r.h === 20);
    assert.equal(exact.ensemble.timingSdMin, 0); assert.equal(smeared.ensemble.timingSdMin, 10);
    assert.ok(r20s.coupling.p90 - r20s.coupling.p10 > r20e.coupling.p90 - r20e.coupling.p10 + 100, `smeared spread ${r20s.coupling.p10}-${r20s.coupling.p90} vs exact ${r20e.coupling.p10}-${r20e.coupling.p90}`);
    // 100 minutes past the turning (at +60 the one-hour window still straddles it by ±20 min of smear)
    const r120s = smeared.horizons.find(r => r.h === 120), r120e = exact.horizons.find(r => r.h === 120);
    near(r120s.driving.median, r120e.driving.median, 0.05 * r120e.driving.median, 'well past the turning the medians agree');
  });
});
