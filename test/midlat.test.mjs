// Sky state, local ground signals near Denmark, visibility tiers and the ring-current edge.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { solarElevation, darknessClass, darkWindow, moonPhase, skyState } from '../web/src/model/sky.mjs';
import { parseTormestorp, parseQuietCurve, quietAt, parseKLine, parseAuroraWatchStatus, parseAuroraWatchActivity, tierFromNt, localSignal, TIER_NT } from '../web/src/data/local.mjs';
import { dstBoundary, dstWeight, TIERS, TIER_ORDER, kpForBoundary } from '../web/src/model/oval.mjs';
import { shortTermForecast } from '../web/src/model/shortterm.mjs';
import { MagneticCoordinates } from '../web/src/model/magcoords.mjs';
import { parseOvationText } from '../web/src/model/oval.mjs';
import { features } from '../web/src/model/coupling.mjs';
import { kpFromDriving, hp30FromDriving } from '../web/src/model/activity.mjs';

const dataFile = (name) => readFile(new URL(`../web/data/${name}`, import.meta.url), 'utf8').then(JSON.parse);
const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const near = (a, e, tol, msg) => assert.ok(Math.abs(a - e) <= tol, `${msg ?? ''} expected ${e} ± ${tol}, got ${a}`);
const MIN = 60e3, HOUR = 3600e3;

describe('sky', () => {
  test('solar elevation: Copenhagen noon in June high, midnight in December deep', () => {
    near(solarElevation(Date.UTC(2026, 5, 21, 11, 10), 55.676, 12.568), 57.7, 0.6, 'midsummer noon');
    assert.ok(solarElevation(Date.UTC(2026, 11, 21, 0, 0), 55.676, 12.568) < -50, 'midwinter midnight');
    assert.ok(solarElevation(Date.UTC(2026, 5, 21, 0, 0), 55.676, 12.568) > -12, 'no nautical darkness at midsummer');
  });
  test('darkness classes and window', () => {
    assert.deepEqual([0, -6.1, -12.1, -18.1, NaN].map(darknessClass), ['day', 'civil', 'nautical', 'astronomical', 'unknown']);
    const w = darkWindow(Date.UTC(2026, 8, 24, 12, 0), 55.676, 12.568, -12);
    assert.ok(w && w.start > Date.UTC(2026, 8, 24, 17, 0) && w.start < Date.UTC(2026, 8, 24, 20, 0) && w.end > Date.UTC(2026, 8, 25, 3, 0) && !w.active, JSON.stringify(w));
    assert.equal(darkWindow(Date.UTC(2026, 5, 21, 12, 0), 55.676, 12.568, -18), null, 'no astronomical night in June');
    const inside = darkWindow(Date.UTC(2026, 8, 24, 23, 0), 55.676, 12.568, -12); assert.equal(inside.active, true);
  });
  test('moon phase: full moon of 2026-09-26 near 0.5 and bright', () => {
    const m = moonPhase(Date.UTC(2026, 8, 26, 16, 49)); near(m.phase, 0.5, 0.03); assert.ok(m.illumination > 0.97);
    const s = skyState(Date.UTC(2026, 8, 24, 20, 0), 55.676, 12.568); assert.ok(['nautical', 'astronomical'].includes(s.class)); assert.ok(s.window && s.window.active);
  });
});

describe('local signals', () => {
  const csv = '2026-09-24T18:16:16,83.97,513.66,506.30\n2026-09-24T18:16:17,83.96,513.63,506.14\n2026-09-24T18:16:18,-20.00,513.6,506.1\n';
  test('parsers', () => {
    const s = parseTormestorp('partial,line\n' + csv);
    assert.equal(s.t.length, 3); assert.equal(new Date(s.t[0]).toISOString(), '2026-09-24T18:16:16.000Z'); assert.deepEqual(s.x, [83.97, 83.96, -20]); assert.deepEqual(s.z, [506.3, 506.14, 506.1]);
    const q = parseQuietCurve('000000 112.54 499.63 475.17\n001000 110.24 496.44 474.89\n235000 114.00 500 476\n');
    assert.deepEqual(q.sec, [0, 600, 85800]); near(quietAt(q, Date.UTC(2026, 8, 24, 0, 5)), 111.39, 1e-9, 'midway'); near(quietAt(q, Date.UTC(2026, 8, 24, 23, 55)), 113.27, 1e-9, 'wraps to midnight');
    assert.deepEqual(parseKLine('2 2 2 3 3 3 _ _'), [2, 2, 2, 3, 3, 3, null, null]); assert.deepEqual(parseKLine(''), []);
    const st = parseAuroraWatchStatus('<current_status><updated><datetime>2026-09-24T18:15:32+0000</datetime></updated><site_status status_id="amber"/></current_status>');
    assert.equal(st.status, 'amber'); assert.equal(new Date(st.updated).toISOString(), '2026-09-24T18:15:32.000Z');
    const act = parseAuroraWatchActivity('<lower_threshold status_id="yellow">50</lower_threshold><activity status_id="yellow"><datetime>2026-09-24T17:00:00+0000</datetime><value>62.2</value></activity>');
    assert.deepEqual(act.thresholds, { yellow: 50 }); assert.equal(act.hourly[0].value, 62.2); assert.equal(act.hourly[0].status, 'yellow');
    assert.deepEqual([10, -50, -100, -199, -200, NaN].map(tierFromNt), [0, 1, 2, 2, 3, NaN]); assert.deepEqual(TIER_NT, { camera: 50, eyeDark: 100, eyeCity: 200 });
  });
  test('localSignal combines the freshest sources into the highest tier', () => {
    const now = Date.UTC(2026, 8, 24, 22, 0);
    const t = [], x = []; for (let i = 0; i < 1800; i++) { t.push(now - (1800 - i) * 1000); x.push(i > 1500 ? -150 : 100); }
    const quiet = parseQuietCurve('000000 100 0 0\n230000 100 0 0\n');
    const sig = localSignal({ tormestorp: { series: { t, x, y: x, z: x }, quiet, k: [1, 1, 1, 1, 1, 1, 5, null] }, hel: { series: { t: t.filter((_, i) => i % 60 === 0), x: x.filter((_, i) => i % 60 === 0), y: [], z: [] } }, aurorawatch: { status: 'yellow', updated: now - 4 * MIN, hourly: [{ t: now - HOUR, value: 55, status: 'yellow' }] } }, now);
    assert.equal(sig.tier, 3, 'a 250 nT drop at Tormestorp is the naked-eye-from-the-city tier'); assert.equal(sig.label, 'eye, city'); assert.equal(sig.fresh, 3);
    const tor = sig.sources.find(s => s.name.startsWith('Tormestorp')); near(tor.value, -250, 1e-9); assert.equal(tor.note, 'K 5');
    assert.equal(sig.sources.find(s => s.name.startsWith('AuroraWatch')).tier, 1);
    const stale = localSignal({ aurorawatch: { status: 'red', updated: now - 40 * MIN, hourly: [] } }, now); assert.ok(Number.isNaN(stale.tier)); assert.equal(stale.fresh, 0);
    assert.equal(localSignal({}, now).label, 'no data');
  });
});

describe('tiers and ring current', async () => {
  const mag = new MagneticCoordinates(await dataFile('aacgm_europe_grid.json'), await dataFile('mlt_reference.json'));
  const coefs = await dataFile('coefficients.json');
  const ovation = parseOvationText(await fixture('ovation_latest_aurora_n.txt'));
  const cph = mag.convert(55.676, 12.568), tromso = mag.convert(69.649, 18.956);
  const now = Date.UTC(2026, 9, 10, 22, 30), tLast = now + 45 * MIN;
  const wind = (bz, v) => { const out = []; for (let t = tLast - 8 * HOUR; t <= tLast; t += MIN) { const rec = { t, tMeasured: t - 50 * MIN, speed: v, density: 6, bx: 0, by: 3, bz, bt: Math.hypot(3, bz) }; Object.assign(rec, features(rec)); out.push(rec); } return out; };
  test('dstBoundary and dstWeight follow Yokoyama et al. 1998', () => {
    assert.ok(Number.isNaN(dstBoundary(-20))); near(dstBoundary(-50), 55, 1e-9); near(dstBoundary(-100), 50, 1e-9); near(dstBoundary(-200), 43.5, 1e-9);
    assert.equal(dstWeight(-30), 0); near(dstWeight(-75), 0.25, 1e-9); assert.equal(dstWeight(-150), 0.5);
    assert.deepEqual(TIERS, { camera: 8, eyeDark: 5, eyeCity: 3, overhead: 0 }); assert.deepEqual(TIER_ORDER, ['camera', 'eyeDark', 'eyeCity', 'overhead']);
    near(kpForBoundary(cph.mlat + TIERS.eyeDark, 23), 5.04, 0.05, 'naked eye from a dark site needs about Kp 5 at Copenhagen'); near(kpForBoundary(cph.mlat + TIERS.eyeCity, 23), 6.15, 0.05);
  });
  test('coefficients carry the square-root term and the blend table, and the model stays monotonic', () => {
    assert.ok(Number.isFinite(coefs.hp30.sqrtCoupling)); assert.deepEqual(coefs.blend.leads, [0, 30, 60, 90, 120]);
    assert.ok(coefs.blend.weight[0] > coefs.blend.weight[2] && coefs.blend.weight[2] >= 0.3); assert.ok(coefs.blend.sigma[0] < coefs.blend.sigma[4]);
    const vals = [1000, 4421, 12000, 30000, 60000].map(c => hp30FromDriving(c, 5e5, coefs.hp30, coefs.hp30_storm));
    assert.ok(vals.every((v, i) => i === 0 || v >= vals[i - 1] - 1e-9), `monotonic: ${vals}`); assert.ok(vals[1] > 2 && vals[1] < 4.5, 'mean driving gives Kp 2-4');
    assert.equal(kpFromDriving(4421, 0, { intercept: 0, coupling: 0, viscous: 0, sqrtCoupling: 0.03 }), 0.03 * Math.sqrt(4421));
  });
  test('Copenhagen in a G4 storm: overhead and city tiers saturate whatever the Finnish chain says', () => {
    const quiet = { phase: 'quiet', minutesSinceOnset: Infinity, ekl: 0.3, loaded: 10, powerRecent: 1, ilNow: -30 };
    const fc = shortTermForecast({ now, propagated: wind(-20, 700), ovation, observer: cph, mag, substorm: quiet, coefficients: coefs, dst: -150 });
    const r30 = fc.horizons.find(r => r.h === 30);
    assert.equal(fc.regime, 'midlatitude'); assert.ok(r30.kp.median > 7, `Kp ${r30.kp.median}`);
    assert.ok(r30.tiers.overhead > 0.9 && r30.tiers.eyeCity > 0.9 && r30.tiers.eyeDark > 0.9, JSON.stringify(r30.tiers));
    assert.ok(fc.verdict.tone === 'good' && /by eye from a dark site/.test(fc.verdict.headline), fc.verdict.headline);
    assert.ok(Number.isFinite(r30.dstBoundary) && r30.dstBoundary < 50, 'ring-current edge blended in');
    assert.equal(fc.blend.leads.length, 5);
  });
  test('Copenhagen at Kp 4: camera possible, naked eye unlikely, quiet chain halves the faint tiers only', () => {
    const fcNone = shortTermForecast({ now, propagated: wind(-5, 450), ovation, observer: cph, mag, substorm: null, coefficients: coefs });
    const r = fcNone.horizons.find(x => x.h === 30);
    assert.ok(r.tiers.camera > r.tiers.eyeDark && r.tiers.eyeDark >= r.tiers.eyeCity && r.tiers.eyeCity >= r.tiers.overhead, JSON.stringify(r.tiers));
    assert.ok(r.tiers.eyeCity < 0.15, `city tier at Kp 4 is small: ${r.tiers.eyeCity}`);
    const quiet = { phase: 'quiet', minutesSinceOnset: Infinity, ekl: 0.3, loaded: 10, powerRecent: 1, ilNow: -30 };
    const fcQuiet = shortTermForecast({ now, propagated: wind(-5, 450), ovation, observer: cph, mag, substorm: quiet, coefficients: coefs });
    const rq = fcQuiet.horizons.find(x => x.h === 30);
    near(rq.tiers.camera, 0.5 * (r.tiers.camera / 0.55) * 1, 0.02, 'camera tier scaled by the 0.5 floor instead of 0.25');
    assert.equal(rq.tiers.eyeCity, r.tiers.eyeCity / 0.55 <= 1 ? Math.min(1, r.tiers.eyeCity / 0.55) : 1, 'city tier not gated by phase');
  });
  test('a fresh local naked-eye signal floors the first half hour', () => {
    const local = { tier: 2, label: 'eye, dark site', ageMin: 3, fresh: 2, sources: [] };
    const fc = shortTermForecast({ now, propagated: wind(-2, 380), ovation, observer: cph, mag, substorm: null, coefficients: coefs, local });
    const r10 = fc.horizons.find(x => x.h === 10), r30 = fc.horizons.find(x => x.h === 30), r60 = fc.horizons.find(x => x.h === 60);
    assert.ok(r10.tiers.camera >= 0.8 && r10.tiers.eyeDark >= 0.8 && r10.tiers.eyeCity < 0.5, JSON.stringify(r10.tiers));
    assert.ok(r30.tiers.eyeDark >= 0.6 && r60.tiers.eyeDark < 0.6, `floor ends after 30 min: ${r30.tiers.eyeDark} ${r60.tiers.eyeDark}`);
    assert.match(fc.verdict.detail, /Local magnetometers now: eye, dark site level/);
  });
  test('auroral-zone observer keeps the substorm-gated headline', () => {
    const fc = shortTermForecast({ now, propagated: wind(-6, 500), ovation, observer: tromso, mag, substorm: { phase: 'expansion', minutesSinceOnset: 5, ekl: 2, loaded: 0, powerRecent: 1, ilNow: -400 }, coefficients: coefs });
    assert.equal(fc.regime, 'auroral'); const r = fc.horizons.find(x => x.h === 10); near(r.pVisible, r.pHorizon * r.phaseFactor, 1e-9);
    assert.doesNotMatch(fc.verdict.headline, /dark site/);
  });
});
