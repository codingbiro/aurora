// Unit tests for the model modules (coupling, integration, activity, magnetic coordinates,
// oval geometry, substorm detection, short-term forecast). Offline; fixtures under test/fixtures.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { newellCoupling, kanLeeField, clockAngle, akasofuPower, viscousTerm, dynamicPressure, features, NEWELL_MEAN } from '../web/src/model/coupling.mjs';
import { weightedRecentAverage, meanBetween, lowerBound, quantile, analogEnsemble, mulberry32, OVATION_WEIGHTS } from '../web/src/model/integrate.mjs';
import { kpFromDriving, hp30FromDriving, blend, gScale, kpThirds, probabilityAtLeast, probabilityFromPoint, clamp, NEWELL2008 } from '../web/src/model/activity.mjs';
import { MagneticCoordinates, dipoleCoords, mltBin, DIPOLE_POLE } from '../web/src/model/magcoords.mjs';
import { parseOvationText, electronFlux, noaaProbability, equatorwardBoundary, hemisphericPower, alFromKp, starkovBoundary, noaaRuleBoundary, boundaryForKp, kpForBoundary, visibilityClass, VIEW_ALLOWANCE_DEG, OVATION_MLT_BINS, OVATION_MLAT_BINS, OVATION_MLAT0 } from '../web/src/model/oval.mjs';
import { parseFmi, parseIaga2002, parseHapiVector, toMinutes, quietBaseline, detectOnsets, confirmOnsets, classifyPhase, onsetProbability, normalCdf, substormState, PHASE, PHASE_FACTOR } from '../web/src/model/substorm.mjs';
import { shortTermForecast, valueAt, phaseFactorAt, DEFAULT_HORIZONS } from '../web/src/model/shortterm.mjs';

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const dataFile = (name) => readFile(new URL(`../web/data/${name}`, import.meta.url), 'utf8').then(JSON.parse);
const near = (actual, expected, tol, msg) => assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} expected ${expected} ± ${tol}, got ${actual}`);
const HOUR = 3600e3, MIN = 60e3;

describe('coupling', () => {
  test('Newell coupling function on reference inputs', () => {
    near(newellCoupling(400, 0, -5), 8617.74, 0.05, 'v=400 Bz=-5');
    near(newellCoupling(700, 0, -20), 45794.93, 0.05, 'v=700 Bz=-20');
    assert.equal(newellCoupling(400, 0, 5), 0, 'purely northward field gives zero');
    assert.ok(Number.isNaN(newellCoupling(0, 0, -5)), 'zero speed is NaN');
    assert.ok(Number.isNaN(newellCoupling(400, NaN, -5)), 'NaN field is NaN');
    assert.equal(NEWELL_MEAN, 4421);
  });
  test('clock angle convention: 0 north, pi south, +pi/2 for +By', () => {
    assert.equal(clockAngle(0, 5), 0);
    near(clockAngle(0, -5), Math.PI, 1e-12);
    near(clockAngle(5, 0), Math.PI / 2, 1e-12);
    near(clockAngle(-5, 0), -Math.PI / 2, 1e-12);
  });
  test('Kan-Lee field in mV/m: v Bt sin^2(theta/2) 1e-3', () => {
    near(kanLeeField(400, 0, -5), 2.0, 1e-12, 'southward 5 nT at 400 km/s = 2 mV/m');
    assert.equal(kanLeeField(400, 0, 5), 0);
    near(kanLeeField(400, 5, 0), 1.0, 1e-9, 'pure By gives half');
  });
  test('Akasofu power, viscous term, dynamic pressure', () => {
    near(akasofuPower(400, 0, 0, -5), 10000, 1e-9);
    near(viscousTerm(5, 500), Math.sqrt(5) * 250000, 1e-6);
    assert.equal(viscousTerm(-1, 500), 0, 'negative density clamps to 0');
    near(dynamicPressure(5, 400), 1.33808, 1e-9);
  });
  test('features() bundles all per-record quantities', () => {
    const f = features({ speed: 500, density: 5, bx: 0, by: 0, bz: -6, bt: 6 });
    assert.deepEqual(Object.keys(f).sort(), ['coupling', 'ekl', 'pdyn', 'power', 'viscous']);
    near(f.coupling, 13103.71, 0.05);
    near(f.ekl, 3, 1e-9);
    near(f.power, 18000, 1e-9);
  });
});

describe('integrate', () => {
  const T = Date.UTC(2026, 8, 17, 12, 0);
  const series = [];
  for (let k = 0; k < 4; k++) for (let m = 0; m < 60; m++) series.push({ t: T - (k + 1) * HOUR + m * MIN, coupling: 100 * (k + 1) });
  series.sort((a, b) => a.t - b.t);

  test('OVATION weights are 0.65^k', () => {
    assert.deepEqual(OVATION_WEIGHTS.map(w => +w.toFixed(6)), [1, 0.65, 0.4225, 0.274625]);
  });
  test('weightedRecentAverage: normalized 0.65^k weighting of hourly means', () => {
    const w = [1, 0.65, 0.4225, 0.274625];
    const expected = (100 * w[0] + 200 * w[1] + 300 * w[2] + 400 * w[3]) / w.reduce((a, b) => a + b);
    const r = weightedRecentAverage(series, T, 'coupling');
    near(r.value, expected, 1e-9);
    assert.equal(r.hoursUsed, 4);
    assert.equal(r.coverage, 1);
  });
  test('weightedRecentAverage honours minHours', () => {
    const lastHour = series.filter(r => r.t >= T - HOUR);
    const strict = weightedRecentAverage(lastHour, T, 'coupling');
    assert.ok(Number.isNaN(strict.value), 'default minHours=2 gives NaN with one hour');
    assert.equal(strict.hoursUsed, 1);
    assert.equal(strict.coverage, 0.25);
    assert.equal(weightedRecentAverage(lastHour, T, 'coupling', { minHours: 1 }).value, 100);
  });
  test('lowerBound and meanBetween', () => {
    assert.equal(lowerBound(series, T - HOUR), 180);
    assert.equal(lowerBound(series, series[0].t), 0);
    assert.equal(lowerBound(series, T + 1), series.length);
    assert.equal(lowerBound(series, -1), 0);
    assert.equal(meanBetween(series, T - HOUR, T, 'coupling'), 100);
    assert.ok(Number.isNaN(meanBetween(series, T, T + HOUR, 'coupling')));
  });
  test('quantile: linear interpolation, ignores non-finite, empty is NaN', () => {
    assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3);
    assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
    assert.equal(quantile([3, NaN, 1, 2], 0.5), 2);
    assert.equal(quantile([1, 2, 3, 4, 5], 0), 1);
    assert.equal(quantile([1, 2, 3, 4, 5], 1), 5);
    assert.ok(Number.isNaN(quantile([], 0.5)));
  });
  test('mulberry32 is deterministic', () => {
    assert.equal(mulberry32(1)(), mulberry32(1)());
    const r = mulberry32(1)();
    assert.ok(r >= 0 && r < 1);
  });
  test('analogEnsemble shape, finiteness and reproducibility', () => {
    const hist = [];
    const t0 = T - 3 * 24 * HOUR, rnd = mulberry32(7);
    for (let i = 0; i < 3 * 24 * 60; i++) hist.push({ t: t0 + i * MIN, coupling: 2000 + 1500 * Math.sin(i / 200) + 500 * rnd() });
    const tLast = hist[hist.length - 1].t;
    const horizons = []; for (let h = 10; h <= 120; h += 10) horizons.push(tLast + h * MIN);
    const e1 = analogEnsemble(hist, tLast, horizons, { members: 50, seed: 3 });
    const e2 = analogEnsemble(hist, tLast, horizons, { members: 50, seed: 3 });
    assert.equal(e1.members.length, 50);
    assert.ok(e1.members.every(p => p.length === horizons.length));
    assert.ok(e1.central.every(Number.isFinite));
    assert.ok(e1.central.every(v => v > 0 && v < 20000), 'central stays within a plausible range of the history');
    assert.deepEqual(Object.keys(e1.quantiles), ['p10', 'p25', 'p75', 'p90']);
    assert.ok(e1.quantiles.p10.every((v, i) => v <= e1.central[i] && e1.central[i] <= e1.quantiles.p90[i]));
    assert.deepEqual(e1.central, e2.central, 'same seed gives the same ensemble');
  });
  test('analogEnsemble degrades gracefully with too little history', () => {
    const hist = []; for (let i = 0; i < 100; i++) hist.push({ t: T + i * MIN, coupling: 1000 });
    const tLast = hist[99].t;
    const e = analogEnsemble(hist, tLast, [tLast + 10 * MIN, tLast + 120 * MIN], { members: 20 });
    assert.equal(e.members.length, 0);
    assert.equal(e.central.length, 2);
    assert.ok(e.central.every(Number.isNaN));
    assert.equal(e.quantiles, null);
  });
});

describe('activity', () => {
  test('Newell 2008 Kp regression', () => {
    assert.deepEqual(NEWELL2008, { intercept: 0.05, coupling: 2.244e-4, viscous: 2.844e-6 });
    near(kpFromDriving(0, 0), 0.05, 1e-12);
    near(kpFromDriving(10000, 0), 0.05 + 2.244, 1e-9);
    near(kpFromDriving(10000, 1e6), 0.05 + 2.244 + 2.844, 1e-9);
    assert.equal(kpFromDriving(1e6, 0), 9, 'clamped to 9');
    assert.ok(Number.isNaN(kpFromDriving(NaN, 0)));
    near(kpFromDriving(10000, NaN), 2.294, 1e-9, 'NaN viscous term treated as 0');
  });
  test('hp30FromDriving: fallback to Kp coefficients, custom coefficients, cap at 12', () => {
    near(hp30FromDriving(10000, 0, null), 2.294, 1e-9);
    near(hp30FromDriving(10000, 0, { intercept: 1, coupling: 1e-3, viscous: 0 }), 9, 1e-9, 'kpFromDriving clamps to 9 first');
    assert.ok(hp30FromDriving(1e6, 0, { intercept: 0, coupling: 1, viscous: 0 }) <= 12);
  });
  test('clamp, blend, gScale, kpThirds', () => {
    assert.equal(clamp(5, 0, 3), 3); assert.equal(clamp(-1, 0, 3), 0); assert.equal(clamp(2, 0, 3), 2);
    assert.deepEqual(blend([{ value: 1, weight: 1, source: 'a' }, { value: 3, weight: 1, source: 'b' }, { value: NaN, weight: 1, source: 'c' }, { value: 5, weight: 0, source: 'd' }]), { value: 2, sources: ['a', 'b'] });
    assert.ok(Number.isNaN(blend([]).value));
    assert.deepEqual([0, 4, 4.99, 5, 5.67, 6, 7, 8, 9].map(gScale), [0, 0, 0, 1, 1, 2, 3, 4, 5]);
    assert.deepEqual([0, 0.33, 0.67, 1, 4, 4.33, 4.67, 5, 8.67, 9].map(kpThirds), ['0o', '0+', '1-', '1o', '4o', '4+', '5-', '5o', '9-', '9o']);
    assert.equal(kpThirds(NaN), '–');
  });
  test('probabilities', () => {
    assert.equal(probabilityAtLeast([1, 2, 3, 4], 3), 0.5);
    assert.ok(Number.isNaN(probabilityAtLeast([], 3)));
    assert.equal(probabilityAtLeast([NaN, 4], 3), 1);
    assert.equal(probabilityFromPoint(4, 4), 0.5, '0.5 at the threshold');
    assert.ok(probabilityFromPoint(5, 4) > probabilityFromPoint(4.5, 4) && probabilityFromPoint(4.5, 4) > 0.5, 'monotonic increasing above threshold');
    assert.ok(probabilityFromPoint(3, 4) < 0.5);
    near(probabilityFromPoint(5, 4) + probabilityFromPoint(3, 4), 1, 1e-12, 'symmetric');
    assert.ok(Number.isNaN(probabilityFromPoint(NaN, 4)));
  });
});

describe('magcoords', async () => {
  const grid = await dataFile('aacgm_europe_grid.json');
  const mltRef = await dataFile('mlt_reference.json');
  const fixtures = JSON.parse(await readFile(new URL('./fixtures_aacgm.json', import.meta.url), 'utf8'));
  const mag = new MagneticCoordinates(grid, mltRef);

  test('grid file shape', () => {
    assert.equal(grid.nlat, 55); assert.equal(grid.nlon, 141);
    assert.equal(grid.mlat.length, 55 * 141); assert.equal(grid.mlon.length, 55 * 141);
    assert.equal(mltRef.ref.length, 366); assert.equal(mltRef.ref[0].length, 24);
  });
  test('AACGM-v2 latitude, longitude and MLT match the reference values for six cities', () => {
    for (const [name, f] of Object.entries(fixtures)) {
      const c = mag.convert(f.glat, f.glon);
      assert.equal(c.method, 'aacgm', `${name} is inside the grid`);
      near(c.mlat, f.mlat, 0.15, `${name} mlat`);
      near(c.mlon, f.mlon, 0.5, `${name} mlon`);
      near(mag.mlt(c.mlon, new Date('2026-09-17T22:00:00Z')), f['mlt_2026-09-17T22:00Z'], 0.05, `${name} MLT Sept`);
      near(mag.mlt(c.mlon, new Date('2026-03-03T04:30:00Z')), f['mlt_2026-03-03T04:30Z'], 0.05, `${name} MLT March`);
    }
  });
  test('Copenhagen specifically', () => {
    const c = mag.convert(55.676, 12.568);
    near(c.mlat, 52.42, 0.05); near(c.mlon, 88.71, 0.1);
  });
  test('dipole fallback outside the grid and without a grid', () => {
    assert.equal(mag.convert(40, 10).method, 'dipole');
    assert.equal(mag.convert(64.838, -147.716).method, 'dipole', 'Fairbanks is outside the European grid');
    assert.equal(mag.inGrid(45, -30), true); assert.equal(mag.inGrid(72, 40), true);
    assert.equal(mag.inGrid(44.9, 0), false); assert.equal(mag.inGrid(50, 40.1), false);
    const noGrid = new MagneticCoordinates(null, mltRef);
    const d = noGrid.convert(55.676, 12.568);
    assert.equal(d.method, 'dipole');
    near(d.mlat, 55.34, 0.05, 'centered dipole is ~2.9 deg poleward of AACGM in Denmark');
    assert.deepEqual(DIPOLE_POLE, { lat: 80.79, lon: -72.76 });
    const raw = dipoleCoords(55.676, 12.568);
    near(raw.mlat, d.mlat, 1e-12); near(raw.mlon, d.mlon, 1e-12);
  });
  test('reference longitude interpolates within the hour and MLT wraps', () => {
    near(mag.referenceLongitude(new Date('2026-09-17T22:00:00Z')), mltRef.ref[259][22], 1e-9);
    const a = mltRef.ref[259][22], b = mltRef.ref[259][23];
    near(mag.referenceLongitude(new Date('2026-09-17T22:30:00Z')), (a + b) / 2, 1e-9);
    const m = mag.mlt(0, new Date('2026-09-17T22:00:00Z'));
    assert.ok(m >= 0 && m < 24);
    near(mag.mlt(359.9, new Date('2026-09-17T22:00:00Z')), m - 0.1 / 15 + 24 * ((m - 0.1 / 15) < 0 ? 1 : 0), 1e-9);
  });
  test('mltBin', () => {
    assert.equal(mltBin(0), 0); assert.equal(mltBin(0.24), 0); assert.equal(mltBin(0.25), 1);
    assert.equal(mltBin(23.99), 95); assert.equal(mltBin(24), 0); assert.equal(mltBin(-0.5), 94); assert.equal(mltBin(12.5), 50);
  });
});

describe('oval', async () => {
  const grid = parseOvationText(await fixture('ovation_latest_aurora_n.txt'));

  test('parseOvationText header and grid', () => {
    assert.equal(grid.rows, 7680);
    assert.equal(OVATION_MLT_BINS * OVATION_MLAT_BINS, 7680);
    assert.equal(OVATION_MLAT0, 50);
    assert.equal(grid.hemisphericPower, 28.7);
    assert.equal(grid.forecastKp, 3);
    assert.equal(new Date(grid.runTime).toISOString(), '2026-09-17T14:10:00.000Z');
    assert.equal(new Date(grid.obsTime).toISOString(), '2026-09-17T14:05:00.000Z');
    assert.equal(new Date(grid.forecastTime).toISOString(), '2026-09-17T15:04:38.000Z');
    for (const k of ['diff', 'mono', 'wave', 'ions']) assert.equal(grid[k].length, 7680);
    const empty = parseOvationText('');
    assert.equal(empty.rows, 0); assert.equal(empty.runTime, null); assert.ok(Number.isNaN(empty.hemisphericPower));
  });
  test('electronFlux sums the three electron components', () => {
    near(electronFlux(grid, 0, 30), grid.diff[30] + grid.mono[30] + grid.wave[30], 1e-12);
  });
  test('integrated hemispheric power is within 1.5 GW of the header', () => {
    near(hemisphericPower(grid), 28.7, 1.5);
  });
  test('equatorward boundary at midnight', () => {
    const b1 = equatorwardBoundary(grid, 0, 1.0);
    assert.equal(b1.mlat, 61); assert.equal(b1.atEdge, false); assert.equal(b1.threshold, 1);
    assert.equal(b1.peakMlat, 65); near(b1.peakFlux, 2.3346, 1e-3);
    assert.equal(equatorwardBoundary(grid, 0, 0.25).mlat, 58.5);
    assert.equal(equatorwardBoundary(grid, 24, 1.0).mlat, 61, 'MLT 24 wraps to 0');
    assert.equal(equatorwardBoundary(grid, -0.1, 1.0).mlat, 61, 'negative MLT wraps');
    assert.ok(Number.isNaN(equatorwardBoundary(grid, 12, 1.0).mlat), 'noon sector never reaches 1 erg in this run');
    assert.ok(Number.isNaN(equatorwardBoundary(grid, 0, 1000).mlat));
  });
  test('NOAA probability mapping', () => {
    assert.equal(noaaProbability(1), 18); assert.equal(noaaProbability(0), 0); assert.equal(noaaProbability(-1), 0);
    assert.equal(noaaProbability(20), 100); assert.equal(noaaProbability(0.5), 14);
  });
  test('Starkov Kp to AL and the diffuse midnight boundary table', () => {
    near(alFromKp(0), 18, 1e-9); near(alFromKp(3), 171.9, 1e-9); near(alFromKp(9), 652.5, 1e-9);
    assert.equal(alFromKp(-1), 18, 'clamped at 0'); assert.equal(alFromKp(12), 652.5, 'clamped at 9');
    const expected = [65.9, 64.9, 63.1, 61.1, 59.1, 57.1, 55.4, 54.1];
    expected.forEach((v, kp) => near(starkovBoundary(kp, 0, 'diffuse'), v, 0.05, `Kp ${kp}`));
    near(starkovBoundary(0, 0, 'oval'), 69.9, 0.05); near(starkovBoundary(3, 0, 'oval'), 63.8, 0.05);
    near(starkovBoundary(0, 0, 'poleward'), 71.5, 0.05);
    assert.ok(starkovBoundary(3, 0, 'poleward') > starkovBoundary(3, 0, 'oval') && starkovBoundary(3, 0, 'oval') > starkovBoundary(3, 0, 'diffuse'), 'poleward > oval > diffuse');
  });
  test('NOAA rule of thumb', () => {
    assert.equal(noaaRuleBoundary(0), 66); assert.equal(noaaRuleBoundary(3), 60); assert.equal(noaaRuleBoundary(9), 48);
    assert.equal(noaaRuleBoundary(12), 48); assert.equal(noaaRuleBoundary(-2), 66);
  });
  test('hybrid boundaryForKp: Starkov to Kp 6, continuous, then -2 deg per Kp, capped at 9.5', () => {
    near(boundaryForKp(3, 0), starkovBoundary(3, 0, 'diffuse'), 1e-12);
    near(boundaryForKp(6, 0), starkovBoundary(6, 0, 'diffuse'), 1e-12);
    near(boundaryForKp(5.999, 0), boundaryForKp(6.001, 0), 0.01, 'continuous at Kp 6');
    near(boundaryForKp(7, 0) - boundaryForKp(6, 0), -2, 1e-9);
    near(boundaryForKp(9, 0) - boundaryForKp(8, 0), -2, 1e-9);
    near(boundaryForKp(9, 0), 49.41, 0.01);
    assert.equal(boundaryForKp(10, 0), boundaryForKp(12, 0), 'capped beyond 9.5');
  });
  test('kpForBoundary inverts the hybrid boundary', () => {
    near(kpForBoundary(60.4, 23), 3.59, 0.05, 'Copenhagen horizon threshold');
    near(kpForBoundary(52.4, 23), 7.65, 0.05, 'Copenhagen overhead threshold');
    assert.equal(kpForBoundary(70, 23), 0, 'already reached at Kp 0');
    assert.equal(kpForBoundary(30, 23), Infinity, 'never reached');
    assert.equal(kpForBoundary(52.4, 23, 'diffuse'), Infinity, 'pure Starkov diffuse saturates above 53 deg');
    near(kpForBoundary(62, 23, 'oval'), 4.92, 0.05);
  });
  test('visibility classes', () => {
    assert.equal(VIEW_ALLOWANCE_DEG, 8);
    assert.deepEqual([-1, 0, 0.001, 8, 8.001, 20, NaN].map(visibilityClass), ['overhead', 'overhead', 'horizon', 'horizon', 'none', 'none', 'unknown']);
  });
});

describe('substorm', async () => {
  const kev = parseFmi(await fixture('fmi_KEVdata_24.txt'));
  const nur = parseFmi(await fixture('fmi_NURdata_01.txt'));
  const T0 = Date.UTC(2026, 0, 1);

  test('parseFmi: 10-second samples, ascending, missing values dropped', () => {
    assert.equal(kev.t.length, 8640);
    assert.equal(new Date(kev.t[0]).toISOString(), '2026-09-16T16:09:00.000Z');
    assert.equal(new Date(kev.t[kev.t.length - 1]).toISOString(), '2026-09-17T16:08:50.000Z');
    assert.deepEqual([kev.x[0], kev.y[0], kev.z[0]], [10370.7, 2699.3, 53304.1]);
    assert.ok(kev.t.every((t, i) => i === 0 || t > kev.t[i - 1]));
    assert.equal(nur.t.length, 360);
    const withMissing = parseFmi('h1\nh2\n2026 09 17 14 23 40    10364.8  2701.8 53308.0\n2026 09 17 14 23 50    99999.9  2702.1 53307.6\n');
    assert.equal(withMissing.t.length, 1);
  });
  test('parseIaga2002 and parseHapiVector skip 99999 fills', () => {
    const iaga = 'DATE       TIME         DOY     KIRX        KIRY    KIRZ      KIRF   |\n2026-09-17 14:16:00.000 260     10468.88    306.38  52398.35  53381.01\n2026-09-17 14:17:00.000 260     99999.00    306.38  52398.35  53381.01\n2026-09-17 14:18:00.000 260     10460.00    300.00  52390.00  53380.00\n';
    const s = parseIaga2002(iaga);
    assert.deepEqual(s.x, [10468.88, 10460]); assert.deepEqual(s.y, [306.38, 300]);
    assert.equal(new Date(s.t[0]).toISOString(), '2026-09-17T14:16:00.000Z');
    const h = parseHapiVector({ data: [['2026-09-17T14:17Z', [7608.78, 1583, 54436.75]], ['2026-09-17T14:18Z', [99999, 1, 1]], ['2026-09-17T14:19Z', 7604.55, 1585.83, 54439.6]] });
    assert.deepEqual(h.x, [7608.78, 7604.55]); assert.deepEqual(h.z, [54436.75, 54439.6]);
  });
  test('toMinutes averages onto 1440 minute bins', () => {
    const m = toMinutes(kev);
    assert.equal(m.t.length, 1440);
    assert.equal(new Date(m.t[0]).toISOString(), '2026-09-16T16:09:00.000Z');
    near(m.x[0], 10370.15, 1e-6);
    assert.ok(m.t.every((t, i) => i === 0 || t > m.t[i - 1]));
  });
  test('quietBaseline is a high percentile', () => {
    assert.equal(quietBaseline([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 8);
    assert.equal(quietBaseline([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5), 5);
    assert.ok(Number.isNaN(quietBaseline([])));
    near(quietBaseline(toMinutes(kev).x), 10381.72, 0.01);
  });
  test('detectOnsets finds the two Kevo bays of 2026-09-17', () => {
    const onsets = detectOnsets(toMinutes(kev));
    assert.deepEqual(onsets.map(t => new Date(t).toISOString()), ['2026-09-17T02:13:00.000Z', '2026-09-17T13:40:00.000Z']);
    assert.equal(detectOnsets(toMinutes(kev), { drop3: 45, drop10: 500 }).length, 0, 'an impossible depth requirement finds nothing');
    assert.equal(detectOnsets(toMinutes(nur)).length, 0, 'sub-auroral Nurmijärvi hour is quiet');
  });
  test('detectOnsets on a synthetic 20 nT/min ramp reports the minute before the drop starts', () => {
    const t = [], x = [];
    for (let i = 0; i < 60; i++) { t.push(T0 + i * MIN); x.push(i < 20 ? 1000 : i < 25 ? 1000 - 20 * (i - 19) : 900); }
    assert.deepEqual(detectOnsets({ t, x }).map(v => (v - T0) / MIN), [18]);
  });
  test('confirmOnsets clusters stations within the window', () => {
    const c = confirmOnsets([{ station: 'A', onsets: [T0, T0 + 120 * MIN] }, { station: 'B', onsets: [T0 + 5 * MIN] }, { station: 'C', onsets: [T0 + 200 * MIN] }]);
    assert.deepEqual(c, [{ t: T0, stations: ['A', 'B'] }]);
    const single = confirmOnsets([{ station: 'A', onsets: [T0, T0 + 120 * MIN] }], { minStations: 1 });
    assert.equal(single.length, 2);
  });
  test('classifyPhase', () => {
    assert.equal(classifyPhase(10, 1, 0), 'expansion'); assert.equal(classifyPhase(15, 1, 0), 'expansion');
    assert.equal(classifyPhase(16, 1, 0), 'recovery'); assert.equal(classifyPhase(45, 1, 0), 'recovery');
    assert.equal(classifyPhase(46, 1, 20), 'growth'); assert.equal(classifyPhase(46, 0.5, 20), 'quiet');
    assert.equal(classifyPhase(Infinity, 0.7, 5), 'quiet', 'needs 10 min southward'); assert.equal(classifyPhase(Infinity, 0.7, 10), 'growth');
    assert.equal(classifyPhase(Infinity, NaN, 0), 'quiet');
    assert.deepEqual(PHASE, { growth: 31, expansion: 12, recovery: 31, quiet: 75 });
    assert.deepEqual(PHASE_FACTOR, { expansion: 1, recovery: 0.75, growth: 0.45, quiet: 0.25 });
  });
  test('onsetProbability: bounded, monotonic in loading and horizon, damped when the merging field is weak', () => {
    const D = 162;
    const ps = [0, 0.25, 0.5, 0.9, 1.5].map(f => onsetProbability(f * D, 1, 1, 60));
    assert.ok(ps.every(p => p >= 0 && p <= 1));
    assert.ok(ps.every((p, i) => i === 0 || p >= ps[i - 1]), 'increasing with loaded energy');
    near(ps[0], 0.0355, 5e-4); near(ps[2], 0.3309, 5e-4);
    const byDt = [10, 30, 60, 120].map(dt => onsetProbability(0.5 * D, 1, 1, dt));
    assert.ok(byDt.every((p, i) => i === 0 || p > byDt[i - 1]), 'increasing with horizon');
    assert.equal(onsetProbability(0.5 * D, 1, 1, 0), 0);
    near(onsetProbability(0.9 * D, 1, 1, 60, { ekl: 0.2 }), onsetProbability(0.9 * D, 1, 1, 60) * 0.25, 1e-12, 'quartered below 0.6 mV/m');
    assert.equal(onsetProbability(0.9 * D, 1, 1, 60, { ekl: 0.6 }), onsetProbability(0.9 * D, 1, 1, 60));
    assert.ok(Number.isNaN(onsetProbability(10, 0, 1, 60))); assert.ok(Number.isNaN(onsetProbability(10, NaN, 1, 60))); assert.ok(Number.isNaN(onsetProbability(-1, 1, 1, 60)));
    assert.equal(normalCdf(0), 0.5); near(normalCdf(1.96), 0.975, 1e-3); near(normalCdf(-1.96), 0.025, 1e-3);
  });
  test('substormState with the Kevo day: 27 min after the 02:13 onset is recovery, at noon it is quiet', () => {
    const s1 = substormState([{ station: 'KEV', mlat: 67.1, series: kev }], [], Date.UTC(2026, 8, 17, 2, 40));
    assert.equal(s1.phase, 'recovery', 'expansion median is 12 min, so 27 min after onset is recovery');
    near(s1.minutesSinceOnset, 27, 1e-9);
    assert.deepEqual(s1.lastOnset.stations, ['KEV']);
    assert.equal(new Date(s1.lastOnset.t).toISOString(), '2026-09-17T02:13:00.000Z');
    assert.equal(s1.phaseFactor, 0.75);
    near(s1.stations[0].bay, -182.7, 0.1, 'deepest deviation in the 30 min before 02:40');
    assert.ok(s1.stations[0].onsets.every(t => t <= Date.UTC(2026, 8, 17, 2, 40)), 'future onsets are ignored');
    const s2 = substormState([{ station: 'KEV', mlat: 67.1, series: kev }], [], Date.UTC(2026, 8, 17, 12, 0));
    assert.equal(s2.phase, 'quiet');
    near(s2.minutesSinceOnset, 587, 1e-9);
    assert.equal(s2.phaseFactor, 0.25);
  });
  test('substormState with steady southward driving goes to growth with a rising onset hazard', () => {
    const now = Date.UTC(2026, 8, 17, 12, 0);
    const drive = []; for (let i = -180; i <= 60; i++) drive.push({ t: now + i * MIN, power: 20000, ekl: 2.0, bz: -6 });
    const s = substormState([{ station: 'KEV', mlat: 67.1, series: kev }], drive, now);
    assert.equal(s.phase, 'growth');
    assert.equal(s.ekl, 2); assert.equal(s.minutesSouthward, 181);
    assert.equal(s.powerRecent, 20000); assert.equal(s.loaded, 181 * 20000);
    assert.ok(s.pOnset30 < s.pOnset60 && s.pOnset60 < s.pOnset120);
    near(s.pOnset60, 0.44, 0.01);
  });
  test('substormState with an empty station series has no onsets', () => {
    const s = substormState([{ station: 'X', mlat: 60, series: { t: [], x: [], y: [], z: [] } }], [], T0);
    assert.equal(s.stations.length, 0); assert.equal(s.lastOnset, null); assert.equal(s.phase, 'quiet'); assert.ok(Number.isNaN(s.pOnset30));
  });
});

describe('shortterm', async () => {
  const grid = await dataFile('aacgm_europe_grid.json');
  const mltRef = await dataFile('mlt_reference.json');
  const mag = new MagneticCoordinates(grid, mltRef);
  const ovation = parseOvationText(await fixture('ovation_latest_aurora_n.txt'));
  const now = Date.UTC(2026, 8, 17, 22, 0), tLast = now + 40 * MIN;
  const propagated = [];
  for (let t = tLast - 8 * HOUR; t <= tLast; t += MIN) {
    const rec = { t, tMeasured: t - 50 * MIN, speed: 500, density: 5, bx: 0, by: 0, bz: -6, bt: 6 };
    Object.assign(rec, features(rec)); propagated.push(rec);
  }
  const observer = { mlat: 52.42, mlon: 88.71 };

  test('DEFAULT_HORIZONS', () => assert.deepEqual(DEFAULT_HORIZONS, [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]));
  test('constant moderate southward driving for Copenhagen', () => {
    const fc = shortTermForecast({ now, propagated, ovation, kp1m: [], geospaceKp: [], observer, mag, substorm: null });
    assert.equal(fc.ok, true);
    assert.equal(fc.leadMin, 40);
    assert.equal(fc.horizons.length, 12);
    near(fc.mltNow, 23.187, 0.01);
    assert.ok(fc.horizons.filter(r => r.h <= 40).every(r => r.leadCovered), 'measured through the transit window');
    assert.ok(fc.horizons.filter(r => r.h >= 50).every(r => !r.leadCovered), 'extrapolated beyond it');
    for (const r of fc.horizons) {
      assert.ok(Number.isFinite(r.kp.median) && r.kp.median >= 0 && r.kp.median <= 9, `Kp median finite at +${r.h}`);
      assert.ok(r.kp.p10 <= r.kp.median && r.kp.median <= r.kp.p90);
      assert.ok(r.pVisible >= 0 && r.pVisible <= 1);
      assert.ok(r.pHorizon >= 0 && r.pHorizon <= 1 && r.pOverhead >= 0 && r.pOverhead <= 1);
      assert.ok(r.boundary.median >= 45 && r.boundary.median <= 80, `boundary in range at +${r.h}`);
      assert.ok(r.mlt >= 0 && r.mlt < 24);
      assert.deepEqual(r.kp.sources, ['coupling'], 'no other models supplied');
    }
    near(fc.current.kpNow, 4.58, 0.01, 'Newell 2008 Kp for this driving');
    near(fc.current.drivingNow, 13103.7, 0.1);
    assert.equal(fc.current.ovationBoundary, 61.5);
    assert.equal(fc.current.visibility, 'none');
    assert.equal(fc.current.phase, 'unknown');
    assert.equal(fc.horizons[0].boundary.ovation, 61.5, 'OVATION boundary used inside its validity');
    assert.equal(fc.horizons[11].boundary.ovation, null, 'not used at +120');
    assert.equal(fc.horizons[0].phaseFactor, 0.55, 'climatological factor without magnetometers');
    assert.equal(typeof fc.verdict.headline, 'string');
    assert.ok(['good', 'maybe', 'low', 'none'].includes(fc.verdict.tone));
    assert.ok(fc.ensemble.members >= 100, 'at least 100 ensemble members');
    assert.equal(fc.ensemble.times.length, 81, '1-minute steps from tLast+1 to now+121');
  });
  test('fails cleanly without enough data', () => {
    assert.deepEqual(shortTermForecast({ now, propagated: propagated.slice(0, 10), ovation, observer, mag }), { ok: false, reason: 'not enough propagated solar wind data' });
  });
  test('blends the Geospace and GFZ forecasts and uses the substorm state', () => {
    const geo = []; for (let h = 0; h <= 60; h++) geo.push({ t: now + h * MIN, kp: 3.0 });
    const sub = { phase: 'expansion', minutesSinceOnset: 5, ekl: 2, loaded: 0, powerRecent: 1 };
    const fc = shortTermForecast({ now, propagated, ovation, geospaceKp: geo, hpoForecast: [{ t: now + 60 * MIN, median: 4 }], observer, mag, substorm: sub });
    const h10 = fc.horizons[0], h60 = fc.horizons[5];
    assert.deepEqual(h10.kp.sources, ['coupling', 'noaa-geospace']);
    assert.equal(h10.kp.geospace, 3);
    near(h10.kp.median, (4.5803 * 1 + 3 * 0.8) / 1.8, 0.2, 'weighted blend inside the transit window (mapping noise adds spread)');
    assert.deepEqual(h60.kp.sources, ['coupling', 'noaa-geospace', 'gfz-hpo']);
    assert.equal(h60.kp.gfz, 4);
    assert.equal(h10.phaseFactor, 1, 'still in expansion at +10');
    assert.equal(fc.current.phase, 'expansion');
    assert.ok(fc.horizons.every(r => Number.isFinite(r.pOnset)));
  });
  test('valueAt picks the nearest value within tolerance', () => {
    const ser = [{ t: 1000, kp: 1 }, { t: 2000, kp: 2 }, { t: 3000, kp: NaN }];
    assert.equal(valueAt(ser, 1900, 200), 2);
    assert.ok(Number.isNaN(valueAt(ser, 1500, 100)));
    assert.ok(Number.isNaN(valueAt(ser, 3000, 100)), 'NaN values are skipped');
    assert.equal(valueAt(ser, 1500, 500), 1, 'ties go to the first nearest');
    assert.ok(Number.isNaN(valueAt([], 1, 1))); assert.ok(Number.isNaN(valueAt(null, 1, 1)));
  });
  test('phaseFactorAt evolves the phase and folds in the onset chance', () => {
    assert.deepEqual(phaseFactorAt(null, 30), { factor: 0.55, pOnset: NaN });
    assert.deepEqual(phaseFactorAt({ phase: 'unknown' }, 30), { factor: 0.55, pOnset: NaN });
    const sub = { phase: 'expansion', minutesSinceOnset: 5, ekl: 2, loaded: 0, powerRecent: 1 };
    assert.equal(phaseFactorAt(sub, 5).factor, 1);
    near(phaseFactorAt(sub, 20).factor, 0.75, 0.001, 'recovery 25 min after onset');
    const late = phaseFactorAt(sub, 60);
    assert.ok(late.factor > 0.45 && late.factor < 0.5, 'growth factor lifted slightly by the onset chance');
    const quiet = phaseFactorAt({ phase: 'quiet', minutesSinceOnset: Infinity, ekl: 0.1, loaded: 0, powerRecent: 1 }, 30);
    near(quiet.factor, 0.25, 0.001);
    const growth = phaseFactorAt({ phase: 'growth', minutesSinceOnset: Infinity, ekl: 1, loaded: 81, powerRecent: 1 }, 30);
    assert.ok(growth.factor > 0.45 && growth.pOnset > 0.1);
  });
});
