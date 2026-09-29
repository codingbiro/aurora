// Hindcast of the short-term decision for one observer: how well do the solar-wind model, the
// persistence of the observed Hp30, and the dashboard's blend of the two predict the Hp30 of the
// interval ending h minutes ahead, and the events "Hp30 at or above the observer's camera (8 deg)
// and naked-eye (5 deg) thresholds"? The blend is the dashboard's own: weights and spreads from
// coefficients.json (blend table), the anchor's age scaling as in shortterm.mjs. In-sample: the shipped
// coefficients were fitted on these years. Uses the cached GFZ Hp30 series and OMNI 5-minute files
// from `npm run calibrate`.
// Usage: node calibration/hindcast.mjs [years=2] [lat=55.676] [lon=12.568] [mltForThreshold=23] [eventThresholdHp30]
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parseOmniLine, parseHp30Line, MIN } from './lib.mjs';
import { hp30FromDriving } from '../web/src/model/activity.mjs';
import { kpForBoundary, VIEW_ALLOWANCE_DEG, TIERS } from '../web/src/model/oval.mjs';
import { normalCdf } from '../web/src/model/substorm.mjs';
import { MagneticCoordinates } from '../web/src/model/magcoords.mjs';

const cacheDir = fileURLToPath(new URL('./cache/', import.meta.url));
const years = +(process.argv[2] || 2), lat = +(process.argv[3] || 55.676), lon = +(process.argv[4] || 12.568), mltThr = +(process.argv[5] || 23), thrOverride = process.argv[6] ? +process.argv[6] : NaN;
const HOUR = 3600e3;
const coefs = JSON.parse(await readFile(new URL('../web/data/coefficients.json', import.meta.url), 'utf8'));
const mag = new MagneticCoordinates(JSON.parse(await readFile(new URL('../web/data/aacgm_europe_grid.json', import.meta.url), 'utf8')), JSON.parse(await readFile(new URL('../web/data/mlt_reference.json', import.meta.url), 'utf8')));
const { mlat, mlon } = mag.convert(lat, lon);
/** The dashboard's blend at a lead (shortterm.mjs): table weight scaled by the anchor's freshness, the table's spread. */
const interp = (xs, ys, x) => { if (x <= xs[0]) return ys[0]; for (let i = 0; i + 1 < xs.length; i++) if (x <= xs[i + 1]) return ys[i] + (x - xs[i]) / (xs[i + 1] - xs[i]) * (ys[i + 1] - ys[i]); return ys[ys.length - 1]; };
const dashBlend = (h, ageMin) => ({ w: interp(coefs.blend.leads, coefs.blend.weight, h) * Math.min(1, Math.max(0, 1 - Math.max(0, ageMin - 20) / 60)), sigma: interp(coefs.blend.leads, coefs.blend.sigma, h) });

const now = new Date();
const start = Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate());
const omni = [];
for (let y = new Date(start).getUTCFullYear(); y <= now.getUTCFullYear(); y++) {
  let txt; try { txt = await readFile(join(cacheDir, `omni_5min${y}.asc`), 'utf8'); } catch { continue; }
  for (const line of txt.split('\n')) { const r = parseOmniLine(line); if (r && r.t >= start - 5 * HOUR) omni.push(r); }
}
omni.sort((a, b) => a.t - b.t);
const hpTxt = await readFile(join(cacheDir, 'Hp30_ap30_complete_series.txt'), 'utf8');
const hp = []; for (const line of hpTxt.split('\n')) { const r = parseHp30Line(line); if (r && r.tStart >= start) hp.push(r); }
const hpByEnd = new Map(hp.map(r => [r.tEnd, r.hp30]));
console.log(`OMNI samples ${omni.length}, Hp30 intervals ${hp.length}, from ${new Date(start).toISOString().slice(0, 10)}`);

// ---- thresholds for the observer (Starkov/NOAA hybrid boundary at the given MLT)
const thrHorizon = kpForBoundary(mlat + VIEW_ALLOWANCE_DEG, mltThr), thrEye = kpForBoundary(mlat + TIERS.eyeDark, mltThr), thrOverhead = kpForBoundary(mlat, mltThr);
const toThird = (k) => Math.ceil(k * 3 - 1e-9) / 3; // Hp30 comes in thirds: the first value at or above the threshold
const E = [['camera', Number.isFinite(thrOverride) ? thrOverride : toThird(thrHorizon)], ['eyeDark', Number.isFinite(thrEye) ? toThird(thrEye) : Infinity], ['Kp5', 4.667], ['Kp6', 5.667], ['overhead', Number.isFinite(thrOverhead) ? toThird(thrOverhead) : Infinity]].filter(([, v]) => Number.isFinite(v));
console.log(`observer ${lat}, ${lon} (mlat ${mlat.toFixed(2)}): camera threshold Kp ${thrHorizon.toFixed(2)} (Hp30 >= ${E[0][1].toFixed(3)}), naked eye ${Number.isFinite(thrEye) ? thrEye.toFixed(2) : 'never'}, overhead ${Number.isFinite(thrOverhead) ? thrOverhead.toFixed(2) : 'never'}`);

// ---- driving averages with the OVATION weights; samples after `known` are frozen at the last known value
const W = [1, 0.65, 0.4225, 0.274625];
function lowerBound(t) { let lo = 0, hi = omni.length; while (lo < hi) { const m = (lo + hi) >> 1; if (omni[m].t < t) lo = m + 1; else hi = m; } return lo; }
function weighted(T, key, known = Infinity) {
  let num = 0, den = 0, used = 0;
  const iK = known < T ? lowerBound(known + 1) - 1 : -1; const frozen = iK >= 0 ? omni[iK][key] : NaN;
  for (let k = 0; k < 4; k++) {
    const t0 = T - (k + 1) * HOUR, t1 = T - k * HOUR; let s = 0, n = 0;
    for (let i = lowerBound(t0); i < omni.length && omni[i].t < t1; i++) { const v = omni[i].t > known ? frozen : omni[i][key]; if (Number.isFinite(v)) { s += v; n++; } }
    if (n) { num += W[k] * s / n; den += W[k]; used++; }
  }
  return used >= 3 ? num / den : NaN;
}

// ---- solar elevation at Copenhagen for the darkness mask (NOAA approximation)
function solarElevation(t) {
  const d = new Date(t); const doy = Math.floor((t - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400e3) + 1;
  const g = (2 * Math.PI / 365) * (doy - 1 + (d.getUTCHours() - 12) / 24);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = (d.getUTCHours() * 60 + d.getUTCMinutes() + eqt + 4 * lon) % 1440;
  const ha = ((tst / 4 < 0 ? tst / 4 + 180 : tst / 4 - 180)) * Math.PI / 180;
  const la = lat * Math.PI / 180;
  return Math.asin(Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha)) * 180 / Math.PI;
}

// ---- climatology of the decision during darkness
const dark = hp.filter(r => solarElevation(r.tStart + 15 * MIN) < -12);
const perYear = (n) => (n * 0.5 / years).toFixed(0);
console.log(`\nDark intervals (sun below -12 deg at the observer): ${dark.length} of ${hp.length} (${perYear(dark.length)} h/yr)`);
for (const [name, thr] of [['Hp30 >= 3.667 (Kp 4-)', 3.667], [`horizon threshold ${E[0][1].toFixed(2)}`, E[0][1]], ['>= 4.667 (Kp 5-)', 4.667], ['>= 5.667 (Kp 6-)', 5.667], ['>= 6.667 (Kp 7-)', 6.667], ['>= 7.667 (Kp 8-)', 7.667]]) {
  const hits = dark.filter(r => r.hp30 >= thr); const nights = new Set(hits.map(r => new Date(r.tStart - 12 * HOUR).toISOString().slice(0, 10)));
  console.log(`  ${name.padEnd(30)} ${String(hits.length).padStart(5)} intervals = ${perYear(hits.length).padStart(4)} h/yr on ${(nights.size / years).toFixed(1)} nights/yr`);
}
// magnetic-midnight sector only (MLT 21-03 at the observer)
const sector = dark.filter(r => { const m = mag.mlt(mlon, new Date(r.tStart + 15 * MIN)); return m >= 21 || m < 3; });
console.log(`  of which in the 21-03 MLT sector: ${sector.length} intervals; >= horizon threshold ${sector.filter(r => r.hp30 >= E[0][1]).length} (${perYear(sector.filter(r => r.hp30 >= E[0][1]).length)} h/yr), >= Kp 5- ${sector.filter(r => r.hp30 >= 4.667).length}, >= Kp 6- ${sector.filter(r => r.hp30 >= 5.667).length}`);

// ---- skill by lead
const leads = [0, 30, 60, 90, 120];
const stats = (pairs) => { const n = pairs.length; if (!n) return null; let se = 0, ae = 0, b = 0; for (const [p, o] of pairs) { const e = p - o; se += e * e; ae += Math.abs(e); b += e; } return { n, rmse: Math.sqrt(se / n), mae: ae / n, bias: b / n }; };
const brier = (probs) => { let s = 0; for (const [p, o] of probs) s += (p - o) ** 2; return s / probs.length; };
const auc = (probs) => { // rank-based AUC
  const pos = probs.filter(x => x[1] === 1).map(x => x[0]), neg = probs.filter(x => x[1] === 0).map(x => x[0]); if (!pos.length || !neg.length) return NaN;
  const all = [...pos.map(p => [p, 1]), ...neg.map(p => [p, 0])].sort((a, b) => a[0] - b[0]); let rankSum = 0;
  for (let i = 0; i < all.length;) { let j = i; while (j < all.length && all[j][0] === all[i][0]) j++; const r = (i + 1 + j) / 2; for (let k = i; k < j; k++) if (all[k][1] === 1) rankSum += r; i = j; }
  return (rankSum - pos.length * (pos.length + 1) / 2) / (pos.length * neg.length);
};
const sigmaModel = coefs.hp30.sigma;
console.log(`\nSkill of the Hp30 forecast for the interval ending h minutes after issue (all hours, ${hp.length} targets):`);
console.log('  h    | model: driving measured | model: driving frozen at issue | persistence (last complete) | dashboard blend | best blend w | Brier(horizon) clim/persist/model/blend/blend-calib | AUC persist/model/blend');
const rowsOut = [];
for (const h of leads) {
  const pairs = { measured: [], frozen: [], persist: [], blend: [], blendC: [] }; const probs = { clim: [], persist: [], model: [], blend: [], blendC: [] };
  const kBack = Math.ceil((h + 15) / 30); // last complete interval at issue time is on average 15 min old
  const { w: wPersist, sigma: sigmaDash } = dashBlend(h, kBack * 30 - h);
  const thr = E[0][1];
  let base = 0, cnt = 0;
  const cand = [];
  for (const r of hp) {
    const T = r.tEnd, issue = T - h * MIN;
    const cM = weighted(T, 'coupling'), vM = weighted(T, 'viscous');
    const cF = weighted(T, 'coupling', issue), vF = weighted(T, 'viscous', issue);
    const pers = hpByEnd.get(T - kBack * 30 * MIN);
    if (![cM, vM, cF, vF, pers].every(Number.isFinite)) continue;
    const mMeasured = hp30FromDriving(cM, vM, coefs.hp30, coefs.hp30_storm), mFrozen = hp30FromDriving(cF, vF, coefs.hp30, coefs.hp30_storm);
    const model = h <= 45 ? mMeasured : mFrozen; // inside the typical L1 lead the driving is measured
    const blend = (1 - wPersist) * model + wPersist * pers;
    cand.push({ o: r.hp30, mMeasured, mFrozen, pers, model, blend });
  }
  for (const c of cand) { pairs.measured.push([c.mMeasured, c.o]); pairs.frozen.push([c.mFrozen, c.o]); pairs.persist.push([c.pers, c.o]); pairs.blend.push([c.blend, c.o]); base += c.o >= thr ? 1 : 0; cnt++; }
  // best linear blend weight for persistence at this lead
  let bestW = 0, bestR = Infinity;
  for (let w = 0; w <= 1.0001; w += 0.05) { let se = 0; for (const c of cand) { const e = (1 - w) * c.model + w * c.pers - c.o; se += e * e; } const rm = Math.sqrt(se / cand.length); if (rm < bestR) { bestR = rm; bestW = w; } }
  const sBlend = stats(pairs.blend);
  const clim = base / cnt;
  for (const c of cand) {
    const o = c.o >= thr ? 1 : 0;
    probs.clim.push([clim, o]);
    probs.persist.push([1 - normalCdf((thr - c.pers) / 0.623), o]);
    probs.model.push([1 - normalCdf((thr - c.model) / sigmaModel), o]);
    probs.blend.push([1 - normalCdf((thr - c.blend) / sigmaDash), o]);
    probs.blendC.push([1 - normalCdf((thr - c.blend) / sBlend.rmse), o]);
  }
  const f = (s) => (s ? s.rmse.toFixed(3) : '  -  ');
  console.log(`  ${String(h).padStart(3)}  | ${f(stats(pairs.measured))} | ${f(stats(pairs.frozen))} | ${f(stats(pairs.persist))} | ${f(sBlend)} (w ${wPersist.toFixed(2)}, sigma ${sigmaDash.toFixed(2)}) | w ${bestW.toFixed(2)} -> ${bestR.toFixed(3)} | ${brier(probs.clim).toFixed(4)} / ${brier(probs.persist).toFixed(4)} / ${brier(probs.model).toFixed(4)} / ${brier(probs.blend).toFixed(4)} / ${brier(probs.blendC).toFixed(4)} | ${auc(probs.persist).toFixed(3)} / ${auc(probs.model).toFixed(3)} / ${auc(probs.blend).toFixed(3)}`);
  rowsOut.push({ h, n: cnt, base: clim, rmse: { measured: stats(pairs.measured).rmse, frozen: stats(pairs.frozen).rmse, persist: stats(pairs.persist).rmse, blend: sBlend.rmse, bestW, bestBlend: bestR }, brier: { clim: brier(probs.clim), persist: brier(probs.persist), model: brier(probs.model), blend: brier(probs.blend), blendCalibrated: brier(probs.blendC) }, auc: { persist: auc(probs.persist), model: auc(probs.model), blend: auc(probs.blend) } });
  // reliability of the dashboard blend for the horizon event
  const bins = new Map();
  for (const [p, o] of probs.blend) { const b = Math.min(9, Math.floor(p * 10)); const e = bins.get(b) || { n: 0, o: 0, p: 0 }; e.n++; e.o += o; e.p += p; bins.set(b, e); }
  console.log('       reliability (dashboard blend, horizon event): ' + [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([b, e]) => `${(b / 10).toFixed(1)}-${((b + 1) / 10).toFixed(1)}: n ${e.n} obs ${(e.o / e.n).toFixed(2)}`).join(' | '));
}
// storm-time bias of the model when it matters (targets with Hp30 >= horizon threshold)
{
  const thr = E[0][1]; let se = 0, b = 0, n = 0, seP = 0, bP = 0;
  for (const r of hp) { if (r.hp30 < thr) continue; const c = weighted(r.tEnd, 'coupling'), v = weighted(r.tEnd, 'viscous'); const p = hpByEnd.get(r.tEnd - 30 * MIN); if (![c, v, p].every(Number.isFinite)) continue; const m = hp30FromDriving(c, v, coefs.hp30, coefs.hp30_storm); se += (m - r.hp30) ** 2; b += m - r.hp30; seP += (p - r.hp30) ** 2; bP += p - r.hp30; n++; }
  console.log(`\nOn the ${n} intervals at or above the horizon threshold: model (measured driving) RMSE ${Math.sqrt(se / n).toFixed(3)} bias ${(b / n).toFixed(3)}; persistence (30 min) RMSE ${Math.sqrt(seP / n).toFixed(3)} bias ${(bP / n).toFixed(3)}`);
}
console.log('\nJSON:', JSON.stringify({ years, mlat, thresholds: Object.fromEntries(E), darkHoursPerYear: +perYear(dark.length), leads: rowsOut }));
