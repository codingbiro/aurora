// Calibration library: parsers for GFZ Hp30 and OMNI HRO files, least squares, quantiles,
// skill metrics. Pure functions, no network, so they can be unit-tested offline.
import { newellCoupling, viscousTerm } from '../web/src/model/coupling.mjs';
import { weightedRecentAverage, quantile } from '../web/src/model/integrate.mjs';

export const MIN = 60e3;

/**
 * OMNI HRO whitespace-split column indices, verified against
 * https://spdf.gsfc.nasa.gov/pub/data/omni/high_res_omni/hroformat.txt (fetched 2026-09-17):
 * Year(0) Day(1) Hour(2) Minute(3) IMF-ID(4) SW-ID(5) nIMF(6) nPlasma(7) %interp(8) timeshift(9)
 * rmsTimeshift(10) rmsPFN(11) DBOT1(12) |B|(13) Bx(14) By_GSE(15) Bz_GSE(16) By_GSM(17) Bz_GSM(18)
 * rmsSD_B(19) rmsSD_vec(20) flowSpeed(21) Vx(22) Vy(23) Vz(24) protonDensity(25) temperature(26) ...
 */
export const OMNI_COL = { year: 0, doy: 1, hour: 2, minute: 3, bmag: 13, bx: 14, byGsm: 17, bzGsm: 18, speed: 21, density: 25, temperature: 26 };
export const OMNI_FILL = { b: 9999.99, speed: 99999.9, density: 999.99 };

/** Parse one OMNI HRO line -> {t, by, bz, speed, density, coupling, viscous} or null (fill / malformed). */
export function parseOmniLine(line) {
  const f = line.trim().split(/\s+/);
  if (f.length < 27) return null;
  const year = +f[OMNI_COL.year], doy = +f[OMNI_COL.doy], hour = +f[OMNI_COL.hour], minute = +f[OMNI_COL.minute];
  if (!(year > 1900) || !(doy >= 1)) return null;
  const by = +f[OMNI_COL.byGsm], bz = +f[OMNI_COL.bzGsm], speed = +f[OMNI_COL.speed], density = +f[OMNI_COL.density];
  if (by >= OMNI_FILL.b || bz >= OMNI_FILL.b || speed >= OMNI_FILL.speed || density >= OMNI_FILL.density) return null;
  const t = Date.UTC(year, 0, 1) + (doy - 1) * 86400e3 + hour * 3600e3 + minute * MIN;
  const bx = +f[OMNI_COL.bx];
  return { t, bx: bx >= OMNI_FILL.b ? NaN : bx, by, bz, speed, density, coupling: newellCoupling(speed, by, bz), viscous: viscousTerm(density, speed) };
}

/**
 * Parse one GFZ Hp30 line (Hp30_ap30_complete_series.txt):
 * "YYYY MM DD hh.h hh._m days days_m Hp30 ap30 D" -> {tStart, tEnd, hp30, ap30, definitive} or null.
 */
export function parseHp30Line(line) {
  if (!line || line.startsWith('#')) return null;
  const f = line.trim().split(/\s+/);
  if (f.length < 9) return null;
  const y = +f[0], m = +f[1], d = +f[2], hh = +f[3], hp = +f[7], ap = +f[8];
  if (!(y > 1900) || !(m >= 1) || !(hp >= 0)) return null; // -1 = missing
  const tStart = Date.UTC(y, m - 1, d) + Math.round(hh * 60) * MIN;
  return { tStart, tEnd: tStart + 30 * MIN, hp30: hp, ap30: ap, definitive: f[9] === '1' };
}

/**
 * Build the regression table: for each Hp30 interval, the OVATION-style weighted 4-hour
 * averages of coupling and viscous term evaluated at the interval end.
 * omni: ascending [{t, coupling, viscous}] ; hp: ascending [{tStart, tEnd, hp30}]
 */
export function buildTable(omni, hp, { minHours = 3 } = {}) {
  const rows = [];
  let prev = null;
  for (const h of hp) {
    const c = weightedRecentAverage(omni, h.tEnd, 'coupling', { minHours });
    const v = weightedRecentAverage(omni, h.tEnd, 'viscous', { minHours });
    if (Number.isFinite(c.value) && Number.isFinite(v.value)) {
      rows.push({ t: h.tEnd, hp30: h.hp30, coupling: c.value, sqrtCoupling: Math.sqrt(Math.max(c.value, 0)), viscous: v.value, prevHp30: prev && prev.tEnd === h.tStart ? prev.hp30 : NaN });
    }
    prev = h;
  }
  return rows;
}

/** Ordinary least squares for y = a + b x1 + c x2 (normal equations, 3x3). Returns {intercept, coupling, viscous}. */
export function ols(rows, xKeys = ['coupling', 'viscous'], yKey = 'hp30') {
  const k = xKeys.length + 1;
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const B = new Array(k).fill(0);
  for (const r of rows) {
    const x = [1, ...xKeys.map(key => r[key])];
    if (x.some(v => !Number.isFinite(v)) || !Number.isFinite(r[yKey])) continue;
    for (let i = 0; i < k; i++) { B[i] += x[i] * r[yKey]; for (let j = 0; j < k; j++) A[i][j] += x[i] * x[j]; }
  }
  const beta = solve(A, B);
  if (!beta) return null;
  const out = { intercept: beta[0] };
  xKeys.forEach((key, i) => { out[key] = beta[i + 1]; });
  return out;
}

/** Gaussian elimination with partial pivoting. */
export function solve(A, B) {
  const n = B.length;
  const M = A.map((row, i) => [...row, B[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-300) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Hp30 = a + b coupling + c viscous (+ d sqrt(coupling) when the coefficient is present). */
export function predict(coef, r) {
  const sq = Number.isFinite(coef.sqrtCoupling) ? coef.sqrtCoupling * (Number.isFinite(r.sqrtCoupling) ? r.sqrtCoupling : Math.sqrt(Math.max(r.coupling, 0))) : 0;
  return coef.intercept + coef.coupling * r.coupling + coef.viscous * r.viscous + sq;
}

/** Regressors of the shipped model: the square-root term lifts the storm end of the fit. */
export const MODEL_KEYS = ['sqrtCoupling', 'coupling', 'viscous'];

/** Robust refit: fit, drop |residual| > k sigma, fit again. */
export function robustOls(rows, k = 3, keys = MODEL_KEYS) {
  const first = ols(rows, keys);
  if (!first) return null;
  const res = rows.map(r => r.hp30 - predict(first, r));
  const sigma = Math.sqrt(res.reduce((s, e) => s + e * e, 0) / Math.max(1, res.length));
  const kept = rows.filter((r, i) => Math.abs(res[i]) <= k * sigma);
  return { coef: ols(kept, keys) || first, dropped: rows.length - kept.length, sigmaFirst: sigma };
}

/**
 * Blend calibration by lead: for the interval ending h minutes after issue, the model is run with the
 * driving measured (h <= 45 min, inside the usual L1 lead) or frozen at issue time (beyond it), and
 * blended with the last complete Hp30 at issue time (on average 15 min old). Returns, per lead, the
 * persistence weight that minimises the RMSE, that RMSE (the spread to use for probabilities), and the
 * RMSE of model and persistence alone.
 * omni: ascending 5-min [{t, coupling, viscous}]; hp: ascending [{tStart, tEnd, hp30}]; coef: shipped coefficients.
 */
export function blendCalibration(omni, hp, coef, leads = [0, 30, 60, 90, 120]) {
  const HOUR = 3600e3, W = [1, 0.65, 0.4225, 0.274625];
  const lowerBound = (t) => { let lo = 0, hi = omni.length; while (lo < hi) { const m = (lo + hi) >> 1; if (omni[m].t < t) lo = m + 1; else hi = m; } return lo; };
  const weighted = (T, key, known) => {
    let num = 0, den = 0, used = 0;
    const iK = known < T ? lowerBound(known + 1) - 1 : -1; const frozen = iK >= 0 ? omni[iK][key] : NaN;
    for (let k = 0; k < 4; k++) {
      const t0 = T - (k + 1) * HOUR, t1 = T - k * HOUR; let s = 0, n = 0;
      for (let i = lowerBound(t0); i < omni.length && omni[i].t < t1; i++) { const v = omni[i].t > known ? frozen : omni[i][key]; if (Number.isFinite(v)) { s += v; n++; } }
      if (n) { num += W[k] * s / n; den += W[k]; used++; }
    }
    return used >= 3 ? num / den : NaN;
  };
  const byEnd = new Map(hp.map(r => [r.tEnd, r.hp30]));
  const step = Math.max(1, Math.floor(hp.length / 12000)); // subsample for speed; the fit needs a few thousand rows
  const out = { leads, weight: [], sigma: [], modelRmse: [], persistenceRmse: [], n: [] };
  for (const h of leads) {
    const kBack = Math.ceil((h + 15) / 30); const known = h <= 45 ? Infinity : null;
    const cand = [];
    for (let i = 0; i < hp.length; i += step) {
      const r = hp[i], T = r.tEnd, issue = T - h * MIN;
      const c = weighted(T, 'coupling', known === null ? issue : Infinity), v = weighted(T, 'viscous', known === null ? issue : Infinity);
      const pers = byEnd.get(T - kBack * 30 * MIN);
      if (![c, v, pers].every(Number.isFinite)) continue;
      cand.push({ o: r.hp30, m: Math.max(0, predict(coef, { coupling: c, sqrtCoupling: Math.sqrt(Math.max(c, 0)), viscous: v })), p: pers });
    }
    let bestW = 0, bestR = Infinity, mR = 0, pR = 0;
    for (const c of cand) { mR += (c.m - c.o) ** 2; pR += (c.p - c.o) ** 2; }
    for (let w = 0; w <= 1.0001; w += 0.05) { let se = 0; for (const c of cand) { const e = (1 - w) * c.m + w * c.p - c.o; se += e * e; } const rm = Math.sqrt(se / cand.length); if (rm < bestR) { bestR = rm; bestW = w; } }
    out.weight.push(round(bestW, 3)); out.sigma.push(round(bestR, 4)); out.modelRmse.push(round(Math.sqrt(mR / cand.length), 4)); out.persistenceRmse.push(round(Math.sqrt(pR / cand.length), 4)); out.n.push(cand.length);
  }
  return out;
}

/** RMSE, MAE, bias, Pearson r between predictions and observations (NaN-safe). */
export function skill(pred, obs) {
  let n = 0, se = 0, ae = 0, bias = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < pred.length; i++) {
    const p = pred[i], o = obs[i];
    if (!Number.isFinite(p) || !Number.isFinite(o)) continue;
    n++; const e = p - o; se += e * e; ae += Math.abs(e); bias += e; sx += p; sy += o; sxx += p * p; syy += o * o; sxy += p * o;
  }
  if (!n) return { n: 0, rmse: NaN, mae: NaN, bias: NaN, r: NaN };
  const cov = sxy / n - (sx / n) * (sy / n), vx = sxx / n - (sx / n) ** 2, vy = syy / n - (sy / n) ** 2;
  return { n, rmse: Math.sqrt(se / n), mae: ae / n, bias: bias / n, r: vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : NaN };
}

/**
 * Log-ratio change quantiles of the coupling over the given lags (minutes), overall and by
 * tercile of the starting value. series: ascending [{t, coupling}] at a fixed cadence (ms).
 */
export function lagQuantiles(series, lagsMin, cadenceMs, { floor = 300, maxSamples = 400000 } = {}) {
  const vals = series.map(r => r.coupling).filter(Number.isFinite).sort((a, b) => a - b);
  const t1 = vals[Math.floor(vals.length / 3)], t2 = vals[Math.floor(2 * vals.length / 3)];
  const groups = { all: {}, low: {}, mid: {}, high: {} };
  const step = Math.max(1, Math.floor(series.length / maxSamples));
  const out = { lagMin: lagsMin, terciles: [t1, t2], logRatioQuantiles: {} };
  for (const g of Object.keys(groups)) out.logRatioQuantiles[g] = { p10: [], p25: [], p50: [], p75: [], p90: [], n: [] };
  for (const lag of lagsMin) {
    const k = Math.round(lag * MIN / cadenceMs);
    const buckets = { all: [], low: [], mid: [], high: [] };
    for (let i = 0; i + k < series.length; i += step) {
      const a = series[i], b = series[i + k];
      if (b.t - a.t !== k * cadenceMs || !Number.isFinite(a.coupling) || !Number.isFinite(b.coupling)) continue;
      const lr = Math.log(b.coupling + floor) - Math.log(a.coupling + floor);
      buckets.all.push(lr);
      buckets[a.coupling < t1 ? 'low' : a.coupling < t2 ? 'mid' : 'high'].push(lr);
    }
    for (const g of Object.keys(buckets)) {
      const q = out.logRatioQuantiles[g];
      for (const [name, p] of [['p10', 0.1], ['p25', 0.25], ['p50', 0.5], ['p75', 0.75], ['p90', 0.9]]) q[name].push(round(quantile(buckets[g], p), 4));
      q.n.push(buckets[g].length);
    }
  }
  return out;
}

/** Reliability table: predicted-value bins vs observed frequency of exceeding thresholds. */
export function reliability(pred, obs, thresholds = [3, 4, 5], binWidth = 0.5) {
  const out = {};
  for (const thr of thresholds) {
    const bins = new Map();
    for (let i = 0; i < pred.length; i++) {
      if (!Number.isFinite(pred[i]) || !Number.isFinite(obs[i])) continue;
      const b = Math.floor(pred[i] / binWidth) * binWidth;
      const e = bins.get(b) || { bin: b, n: 0, hits: 0 };
      e.n++; if (obs[i] >= thr) e.hits++; bins.set(b, e);
    }
    out[`ge${thr}`] = [...bins.values()].sort((a, b) => a.bin - b.bin).map(e => ({ bin: round(e.bin, 2), n: e.n, observedFrequency: round(e.hits / e.n, 4) }));
  }
  return out;
}

export function histogram(values, width = 0.25, lo = -4, hi = 4) {
  const bins = [];
  for (let x = lo; x < hi; x += width) bins.push({ from: round(x, 3), to: round(x + width, 3), n: 0 });
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    const i = Math.floor((Math.min(Math.max(v, lo), hi - 1e-9) - lo) / width);
    bins[i].n++;
  }
  return bins;
}

export function round(x, d = 4) {
  if (!Number.isFinite(x)) return null;
  return +x.toPrecision(d);
}
