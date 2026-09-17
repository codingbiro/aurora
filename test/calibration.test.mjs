import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOmniLine, parseHp30Line, ols, robustOls, predict, skill, lagQuantiles, buildTable, reliability, OMNI_COL } from '../calibration/lib.mjs';
import { scoreboardStats } from '../calibration/scoreboard.mjs';
import { newellCoupling } from '../web/src/model/coupling.mjs';

// Synthetic OMNI HRO line built from the verified column layout (46 columns + 3 GOES fluxes).
function omniLine({ year = 2026, doy = 212, hour = 23, minute = 55, by = -3.12, bz = 2.83, speed = 308.4, density = 7.01, fillB = false, fillV = false }) {
  const cols = new Array(49).fill('0');
  cols[OMNI_COL.year] = String(year); cols[OMNI_COL.doy] = String(doy); cols[OMNI_COL.hour] = String(hour); cols[OMNI_COL.minute] = String(minute);
  cols[4] = '51'; cols[5] = '51'; cols[6] = '4'; cols[7] = '1'; cols[8] = '75'; cols[9] = '1218'; cols[10] = '165'; cols[11] = '0.02'; cols[12] = '10';
  cols[OMNI_COL.bmag] = '4.97'; cols[OMNI_COL.bx] = '-3.12'; cols[15] = '2.83'; cols[16] = '2.62';
  cols[OMNI_COL.byGsm] = fillB ? '9999.99' : String(by); cols[OMNI_COL.bzGsm] = fillB ? '9999.99' : String(bz);
  cols[OMNI_COL.speed] = fillV ? '99999.9' : String(speed); cols[22] = '-308.2'; cols[23] = '-11.2'; cols[24] = '-3.5';
  cols[OMNI_COL.density] = String(density); cols[OMNI_COL.temperature] = '54595.';
  return cols.join(' ');
}

test('OMNI line parser: time, GSM field, speed, density and derived coupling', () => {
  const r = parseOmniLine(omniLine({}));
  assert.ok(r, 'record parsed');
  assert.equal(new Date(r.t).toISOString(), '2026-07-31T23:55:00.000Z'); // DOY 212 of 2026 is 31 July
  assert.equal(r.by, -3.12); assert.equal(r.bz, 2.83); assert.equal(r.speed, 308.4); assert.equal(r.density, 7.01);
  assert.ok(Math.abs(r.coupling - newellCoupling(308.4, -3.12, 2.83)) < 1e-9);
  assert.ok(r.viscous > 0);
});

test('OMNI line parser drops fill values and malformed lines', () => {
  assert.equal(parseOmniLine(omniLine({ fillB: true })), null);
  assert.equal(parseOmniLine(omniLine({ fillV: true })), null);
  assert.equal(parseOmniLine('# header'), null);
  assert.equal(parseOmniLine(''), null);
});

test('Hp30 line parser: interval start/end, value, missing flag', () => {
  const r = parseHp30Line('2026 09 16 23.0 23.25 34592.95833 34592.96875  2.333    9 0');
  assert.ok(r);
  assert.equal(new Date(r.tStart).toISOString(), '2026-09-16T23:00:00.000Z');
  assert.equal(new Date(r.tEnd).toISOString(), '2026-09-16T23:30:00.000Z');
  assert.equal(r.hp30, 2.333); assert.equal(r.ap30, 9); assert.equal(r.definitive, false);
  const half = parseHp30Line('2024 05 10 22.5 22.75 33733.93750 33733.94792  9.000  400 1');
  assert.equal(new Date(half.tStart).toISOString(), '2024-05-10T22:30:00.000Z'); assert.equal(half.definitive, true);
  assert.equal(parseHp30Line('2026 09 17 00.0 00.25 1 1 -1.000 -1 0'), null, 'missing value skipped');
  assert.equal(parseHp30Line('# comment'), null);
});

test('OLS recovers known coefficients and the robust refit tolerates one outlier', () => {
  const rows = [];
  for (let i = 0; i < 400; i++) { const c = 500 + i * 60, v = 1e5 + (i % 7) * 3e4; rows.push({ hp30: 0.4 + 2e-4 * c + 3e-6 * v, coupling: c, viscous: v }); }
  const coef = ols(rows);
  assert.ok(Math.abs(coef.intercept - 0.4) < 1e-6 && Math.abs(coef.coupling - 2e-4) < 1e-9 && Math.abs(coef.viscous - 3e-6) < 1e-11);
  rows.push({ hp30: 40, coupling: 600, viscous: 1e5 }); // gross outlier
  const rob = robustOls(rows);
  assert.equal(rob.dropped, 1);
  assert.ok(Math.abs(rob.coef.coupling - 2e-4) < 1e-7);
  const s = skill(rows.slice(0, 400).map(r => predict(rob.coef, r)), rows.slice(0, 400).map(r => r.hp30));
  assert.ok(s.rmse < 1e-3 && s.r > 0.999);
});

test('buildTable aligns Hp30 intervals with weighted 4-hour driving', () => {
  const t0 = Date.UTC(2026, 0, 1);
  const omni = []; for (let i = 0; i < 12 * 8; i++) omni.push({ t: t0 + i * 5 * 60e3, coupling: 1000 + i, viscous: 5e4 });
  const hp = [{ tStart: t0 + 4 * 3600e3, tEnd: t0 + 4.5 * 3600e3, hp30: 2 }, { tStart: t0 + 4.5 * 3600e3, tEnd: t0 + 5 * 3600e3, hp30: 3 }];
  const rows = buildTable(omni, hp);
  assert.equal(rows.length, 2);
  assert.ok(rows[0].coupling > 1000 && rows[0].coupling < 1100);
  assert.ok(Number.isNaN(rows[0].prevHp30) && rows[1].prevHp30 === 2);
});

test('lag quantile table has one entry per lag for every tercile group', () => {
  const series = []; let x = 2000;
  for (let i = 0; i < 5000; i++) { x = Math.max(50, x * Math.exp((Math.sin(i) + Math.cos(i * 0.37)) * 0.05)); series.push({ t: i * 5 * 60e3, coupling: x }); }
  const q = lagQuantiles(series, [10, 60, 120], 5 * 60e3);
  assert.deepEqual(q.lagMin, [10, 60, 120]);
  for (const g of ['all', 'low', 'mid', 'high']) { assert.equal(q.logRatioQuantiles[g].p50.length, 3); assert.ok(q.logRatioQuantiles[g].p10[0] <= q.logRatioQuantiles[g].p90[0]); }
  const rel = reliability([1, 2, 3.2, 4.6], [0, 3, 3, 5], [3], 1);
  assert.ok(rel.ge3.length >= 3);
});

test('scoreboard statistics per method', () => {
  const cmes = [{ observedTime: '2024-05-10T17:00Z', arrivalTime: '2024-05-10T17:00Z', maxKP: 9, predictions: [
    { predictedMethodName: 'WSA-ENLIL + Cone (NASA M2M)', differenceInHrs: 3, predictedMaxKpLowerRange: 6, predictedMaxKpUpperRange: 9 },
    { predictedMethodName: 'Other', predictedArrivalTime: '2024-05-10T07:00Z', predictedMaxKpLowerRange: 4, predictedMaxKpUpperRange: 6 }] },
    { observedTime: '2022-01-01T00:00Z', arrivalTime: '2022-01-03T00:00Z', predictions: [{ predictedMethodName: 'Other', differenceInHrs: 1 }] }];
  const s = scoreboardStats(cmes, { since: Date.UTC(2023, 0, 1) });
  assert.equal(s.nCme, 1);
  const other = s.methods.find(m => m.name === 'Other');
  assert.equal(other.n, 1); assert.equal(other.mae, 10); assert.equal(other.within7h, 0); assert.equal(other.kpHit, 0);
  assert.equal(s.donkiLike.length, 1); assert.equal(s.donkiLike[0].kpHit, 1);
  assert.equal(s.methods.find(m => m.name === 'All methods').n, 2);
});
