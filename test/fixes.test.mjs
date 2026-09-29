// Regression tests for the model review of 2026-09-29: each test pins a failure that was reproduced before the fix.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { shortTermForecast, phaseFactorAt } from '../web/src/model/shortterm.mjs';
import { analogEnsemble, climatologyEnsemble, quantile } from '../web/src/model/integrate.mjs';
import { MagneticCoordinates, dipoleCoords } from '../web/src/model/magcoords.mjs';
import { parseKpTable, cmeArrivals, ensembleNightProb, nightCards } from '../web/src/model/longterm.mjs';
import { localSignal } from '../web/src/data/local.mjs';
import { features } from '../web/src/model/coupling.mjs';

const dataFile = (name) => readFile(new URL(`../web/data/${name}`, import.meta.url), 'utf8').then(JSON.parse);
const near = (a, e, tol, msg) => assert.ok(Math.abs(a - e) <= tol, `${msg ?? ''} expected ${e} ± ${tol}, got ${a}`);
const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;

describe('short-term forecast', async () => {
  const mag = new MagneticCoordinates(await dataFile('aacgm_europe_grid.json'), await dataFile('mlt_reference.json'));
  const coefs = await dataFile('coefficients.json');
  const cph = mag.convert(55.676, 12.568), tromso = mag.convert(69.649, 18.956);
  const now = Date.UTC(2026, 9, 10, 22, 30), tLast = now + 45 * MIN;
  const wind = (bz, v, hours = 8, end = tLast) => { const out = []; for (let t = end - hours * HOUR; t <= end; t += MIN) { const rec = { t, tMeasured: t - 50 * MIN, speed: v, density: 6, bx: 0, by: 3, bz, bt: Math.hypot(3, bz) }; Object.assign(rec, features(rec)); out.push(rec); } return out; };

  test('the local-magnetometer floor applies to what localSignal returns (it lacked the age the forecast checks)', () => {
    const t = [], x = [], y = [], z = [];
    for (let s = now - 40 * MIN; s <= now - 30e3; s += 10e3) { t.push(s); x.push(s > now - 20 * MIN ? -250 : 0); y.push(0); z.push(0); }
    const local = localSignal({ tormestorp: { series: { t, x, y, z }, quiet: { sec: [0, 86400 - 600], x: [0, 0], z: [0, 0] }, k: [] } }, now);
    assert.equal(local.tier, 3); assert.ok(local.ageMin < 2, `age ${local.ageMin}`);
    const fc = shortTermForecast({ now, propagated: wind(-2, 380), observer: cph, mag, coefficients: coefs, local });
    const r10 = fc.horizons.find(r => r.h === 10);
    assert.ok(r10.tiers.eyeDark >= 0.8 && r10.tiers.eyeCity >= 0.8, JSON.stringify(r10.tiers));
    assert.doesNotMatch(fc.verdict.headline, /^No naked-eye/);
  });

  test('the onset term uses the local-time reach at every horizon, not only where the outlook has a row', () => {
    const growth = { phase: 'growth', minutesSinceOnset: 200, ekl: 2, loaded: 170, powerRecent: 1, ilNow: -60 };
    const sparse = { chainReachMlt: 1, horizons: [10, 30, 60, 90, 120].map(h => ({ h, reachMlt: 0.3 })) };
    const fc = shortTermForecast({ now, propagated: wind(-4, 450), observer: tromso, mag, substorm: growth, outlook: sparse, coefficients: coefs });
    const f = fc.horizons.map(r => r.phaseFactor);
    // the old lookup fell back to full reach at +20, 40, 50, 70, 80, 100 and 110: a sawtooth the headline picked from
    for (let i = 1; i < f.length - 1; i++) assert.ok(Math.abs(f[i] - (f[i - 1] + f[i + 1]) / 2) < 0.03, `smooth at +${fc.horizons[i].h}: ${f.map(v => v.toFixed(2))}`);
    const mlt = mag.mlt(tromso.mlon, new Date(now + 20 * MIN));
    assert.deepEqual(phaseFactorAt(growth, 20, sparse, mlt), phaseFactorAt(growth, 20, null, mlt), 'rows do not matter once the MLT is known');
  });

  test('an onset within h counts as expansion only if it came in the last 15 minutes before h', () => {
    const growth = { phase: 'growth', minutesSinceOnset: 200, ekl: 2, loaded: 162, powerRecent: 1 };
    const f = [10, 30, 60, 90, 120].map(h => phaseFactorAt(growth, h).factor);
    assert.ok(f[4] < Math.max(...f) - 0.01, `the factor no longer climbs to the last horizon: ${f.map(v => v.toFixed(2))}`);
    assert.ok(f.every(v => v >= 0.45 - 1e-9 && v <= 1));
    near(phaseFactorAt(growth, 10).factor, 0.45 + phaseFactorAt(growth, 10).pOnset * (1 - 0.45), 1e-9, 'in the first 15 minutes every onset is still expanding');
  });

  test('"Kp now" uses the calibrated model of the horizons (Newell 2008 read nearly 3 Kp higher in a storm)', () => {
    const fc = shortTermForecast({ now, propagated: wind(-12, 600), observer: cph, mag, coefficients: coefs });
    const r10 = fc.horizons.find(r => r.h === 10);
    assert.ok(Math.abs(fc.current.kpNow - r10.kp.median) < 0.8, `Kp now ${fc.current.kpNow} vs +10 median ${r10.kp.median}`);
  });

  test('a stalled solar wind feed gives no forecast instead of a confident one', () => {
    const fc = shortTermForecast({ now, propagated: wind(-8, 600, 8, now - 2 * HOUR), observer: cph, mag, coefficients: coefs });
    assert.equal(fc.ok, false); assert.match(fc.reason, /stalled/);
  });

  test('members without two hours of driving are left out; the blend centre carries the forecast', () => {
    const hp30 = [{ t: now - 50 * MIN, value: 6.33 }]; // interval ended 20 minutes ago: a fresh anchor
    const geospaceKp = Array.from({ length: 60 }, (_, i) => ({ t: now + i * MIN, kp: 6.3 }));
    const fc = shortTermForecast({ now, propagated: wind(-10, 600, 70 / 60), observer: cph, mag, coefficients: coefs, hp30, geospaceKp });
    assert.equal(fc.ok, true);
    const r10 = fc.horizons.find(r => r.h === 10);
    assert.ok(Number.isFinite(r10.kp.median) && r10.kp.median > 5, `Kp ${r10.kp.median}`);
    assert.ok(r10.tiers.camera > 0.5, `camera needs about Kp 3.6 here: ${r10.tiers.camera}`);
  });
});

describe('ensembles', async () => {
  const coefs = await dataFile('coefficients.json');
  const t0 = Date.UTC(2026, 8, 20);
  test('analog starts come from a level like the current one (a quiet week multiplied a storm tenfold)', () => {
    const quiet = Array.from({ length: 7 * 1440 }, (_, i) => ({ t: t0 + i * MIN, coupling: 400 + 3000 * (i % 600 === 0) + 300 * Math.sin(i / 50) }));
    const tLast = quiet[quiet.length - 1].t; quiet[quiet.length - 1].coupling = 30000;
    const times = Array.from({ length: 120 }, (_, i) => tLast + (i + 1) * MIN);
    assert.equal(analogEnsemble(quiet, tLast, times).members.length, 0, 'nothing alike in a quiet week: the climatology members take over');
    const stormy = quiet.map((r, i) => ({ ...r, coupling: i > 3 * 1440 && i < 4 * 1440 ? 20000 + 15000 * Math.sin(i / 90) ** 2 : r.coupling }));
    const ens = analogEnsemble(stormy, tLast, times);
    assert.ok(ens.members.length > 0);
    const weekMax = Math.max(...stormy.map(r => r.coupling));
    assert.ok(ens.quantiles.p90[119] < 2 * weekMax, `p90 ${ens.quantiles.p90[119]} vs the week's max ${weekMax}`);
  });
  test('climatology members invert ln((b + floor) / (a + floor)) exactly (northward field stayed near zero)', () => {
    const paths = climatologyEnsemble(0, coefs.extrapolation, [10, 60, 120], { members: 400 });
    const med = [0, 1, 2].map(i => quantile(paths.map(p => p[i]), 0.5));
    assert.ok(med[1] < 400 && med[2] < 600, `medians ${med.map(Math.round)} (the old inverse gave about 436 / 952 / 1302)`);
  });
});

describe('coordinates and dates', () => {
  test('dipole magnetic longitude runs east, zero on the meridian through the geographic south pole', () => {
    near(dipoleCoords(90, 0).mlon, 180, 1e-6);
    near(dipoleCoords(64.84, -147.72).mlon, 265, 1.5, 'Fairbanks');
    assert.ok(dipoleCoords(69.649, 18.956).mlon > dipoleCoords(55.676, 12.568).mlon, 'Tromsø east of Copenhagen');
  });
  const table = (a, b, c) => `:Issued: x\n             ${a}       ${b}       ${c}\n00-03UT       2.00         2.33         1.67\n03-06UT       2.00         2.00         1.33\n`;
  test('a Kp table issued on 31 December covers January of the next year', () => {
    const { days } = parseKpTable(table('Jan 01', 'Jan 02', 'Jan 03'), 2026, Date.UTC(2026, 11, 31, 22, 5));
    assert.deepEqual(days, [Date.UTC(2027, 0, 1), Date.UTC(2027, 0, 2), Date.UTC(2027, 0, 3)]);
  });
  test('a year wrap inside the table is a calendar step, also in a leap year', () => {
    const { days, kp } = parseKpTable(table('Dec 30', 'Dec 31', 'Jan 01'), 2028, Date.UTC(2028, 11, 30, 0, 30));
    assert.deepEqual(days, [Date.UTC(2028, 11, 30), Date.UTC(2028, 11, 31), Date.UTC(2029, 0, 1)]);
    assert.equal(kp.length, 6); assert.equal(kp[kp.length - 1].t, Date.UTC(2029, 0, 1, 3));
  });
});

describe('long range', () => {
  const now = Date.UTC(2026, 8, 20, 12);
  const run = (done, arrival, accurate = true) => ({ isMostAccurate: accurate, speed: 800, halfAngle: 30, enlilList: [{ modelCompletionTime: new Date(done).toISOString(), estimatedShockArrivalTime: arrival ? new Date(arrival).toISOString() : null, kp_90: 4, kp_180: 6 }] });
  test('the latest most-accurate WSA-Enlil run decides, also when it predicts a miss', () => {
    const arrival = now + DAY;
    const missLater = { activityID: 'a', startTime: new Date(now - DAY).toISOString(), cmeAnalyses: [run(now - 12 * HOUR, arrival), run(now - 2 * HOUR, null)] };
    assert.equal(cmeArrivals([missLater], now).length, 0, 'the newer run no longer reaches Earth');
    const hitLater = { activityID: 'b', startTime: new Date(now - DAY).toISOString(), cmeAnalyses: [run(now - 12 * HOUR, null), run(now - 2 * HOUR, arrival)] };
    assert.deepEqual(cmeArrivals([hitLater], now).map(c => c.arrival), [arrival]);
  });
  test('GFZ night probability counts members whose night maximum reaches the threshold', () => {
    const start = now, bins = Array.from({ length: 5 }, (_, i) => ({ t: start + i * 3 * HOUR, members: [5, 2, 2, 2, 2, 2, 2, 2, 2], pGe4: 1 / 9, pGe5: 1 / 9, pGe6: 0, pGe7: 0, pGe8: 0 }));
    near(ensembleNightProb(bins, 5), 1 / 9, 1e-9, 'one stormy member is one ninth, not 1 - (8/9)^5 = 0.45');
    const noMembers = bins.map(({ members, ...r }) => r);
    near(ensembleNightProb(noMembers, 5), 1 / 9, 1e-9, 'without members: the largest bin probability');
    const cards = nightCards(Date.UTC(2026, 8, 20, 12), [], [], bins.map(b => ({ ...b, t: Date.UTC(2026, 8, 20, 18) + (b.t - start) })), { horizon: 5 });
    near(cards[0].estimates.horizon.probability, 1 / 9, 1e-9);
  });
});
