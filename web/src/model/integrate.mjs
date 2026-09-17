// Time integration of the coupling function the way OVATION Prime does it:
// hourly means of the current and three preceding hours, weighted 0.65^k, normalized.

export const OVATION_WEIGHTS = [1, 0.65, 0.65 ** 2, 0.65 ** 3];
const HOUR = 3600e3;

/** Binary search: first index with series[i].t >= t. */
export function lowerBound(series, t) {
  let lo = 0, hi = series.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].t < t) lo = mid + 1; else hi = mid;
  }
  return lo;
}

/** Mean of `key` over records with t in [t0, t1); NaN when no finite samples. */
export function meanBetween(series, t0, t1, key) {
  const i0 = lowerBound(series, t0);
  let sum = 0, n = 0;
  for (let i = i0; i < series.length && series[i].t < t1; i++) {
    const x = series[i][key];
    if (Number.isFinite(x)) { sum += x; n++; }
  }
  return n ? sum / n : NaN;
}

/**
 * Weighted average of hourly means for the `hours` hours ending at time T.
 * Hours with no data are dropped and the weights renormalized; needs at least
 * `minHours` populated hours, otherwise NaN. Returns {value, hoursUsed, coverage}.
 */
export function weightedRecentAverage(series, T, key = 'coupling', opts = {}) {
  const { weights = OVATION_WEIGHTS, minHours = 2 } = opts;
  let num = 0, den = 0, used = 0;
  for (let k = 0; k < weights.length; k++) {
    const m = meanBetween(series, T - (k + 1) * HOUR, T - k * HOUR, key);
    if (Number.isFinite(m)) { num += weights[k] * m; den += weights[k]; used++; }
  }
  return { value: used >= minHours ? num / den : NaN, hoursUsed: used, coverage: used / weights.length };
}

/**
 * Analog ensemble for the coupling beyond the last measured point.
 * history: ascending [{t, coupling}] (Earth-arrival time), covering several days.
 * tLast: time of the last known value; horizonsMs: future times to produce.
 * Each member takes a random past starting point and scales that historical path
 * by the ratio of the current value to the historical start value, so the spread
 * reflects how much the coupling actually changed over the same lag in recent days.
 */
export function analogEnsemble(history, tLast, horizonsMs, { members = 200, seed = 1, floor = 300, maxRatio = 25 } = {}) {
  const iLast = lowerBound(history, tLast);
  const last = history[Math.min(iLast, history.length - 1)];
  const xLast = Math.max(Number.isFinite(last?.coupling) ? last.coupling : NaN, floor);
  const maxLag = horizonsMs[horizonsMs.length - 1] - tLast;
  const candidates = [];
  for (let i = 0; i < history.length; i++) {
    if (history[i].t + maxLag <= tLast && Number.isFinite(history[i].coupling)) candidates.push(i);
  }
  const rand = mulberry32(seed);
  const paths = [];
  if (!Number.isFinite(xLast) || candidates.length < 50) return { members: [], central: horizonsMs.map(() => NaN), quantiles: null };
  for (let m = 0; m < members; m++) {
    const s = candidates[Math.floor(rand() * candidates.length)];
    const x0 = Math.max(history[s].coupling, floor);
    const path = new Array(horizonsMs.length);
    for (let h = 0; h < horizonsMs.length; h++) {
      const tH = history[s].t + (horizonsMs[h] - tLast);
      const j = lowerBound(history, tH);
      const rec = history[Math.min(j, history.length - 1)];
      const xh = Number.isFinite(rec?.coupling) ? Math.max(rec.coupling, floor) : x0;
      const ratio = Math.min(Math.max(xh / x0, 1 / maxRatio), maxRatio);
      path[h] = xLast * ratio;
    }
    paths.push(path);
  }
  const central = horizonsMs.map((_, h) => quantile(paths.map(p => p[h]), 0.5));
  const q = (p) => horizonsMs.map((_, h) => quantile(paths.map(pp => pp[h]), p));
  return { members: paths, central, quantiles: { p10: q(0.1), p25: q(0.25), p75: q(0.75), p90: q(0.9) } };
}

export function quantile(values, p) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const idx = (v.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return v[lo] + (v[hi] - v[lo]) * (idx - lo);
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const Z_LEVELS = [[0.10, 'p10'], [0.25, 'p25'], [0.50, 'p50'], [0.75, 'p75'], [0.90, 'p90']];

/**
 * Members drawn from calibrated climatological log-ratio quantiles (coefficients.json
 * `extrapolation`): each member takes one probability level p and follows the quantile path
 * Q(lag, p) for every lag, which keeps its trajectory coherent in time.
 * table: {lagMin: [...], logRatioQuantiles: {all|low|mid|high: {p10:[], ...}}, terciles: [t1, t2], floor}
 */
export function climatologyEnsemble(xLast, table, lagsMin, { members = 100, seed = 7 } = {}) {
  if (!table || !table.lagMin || !Number.isFinite(xLast)) return [];
  const floor = table.floor ?? 300;
  const group = table.terciles ? (xLast < table.terciles[0] ? 'low' : xLast < table.terciles[1] ? 'mid' : 'high') : 'all';
  const Q = table.logRatioQuantiles[group] || table.logRatioQuantiles.all;
  const lags = table.lagMin;
  const rand = mulberry32(seed);
  const out = [];
  for (let m = 0; m < members; m++) {
    const p = Math.min(0.995, Math.max(0.005, rand()));
    const path = lagsMin.map(lag => {
      if (lag <= 0) return xLast;
      // interpolate the quantile curve in lag, then in probability (linear tails beyond p10/p90)
      let i = 0; while (i < lags.length - 1 && lags[i + 1] < lag) i++;
      const j = Math.min(i + 1, lags.length - 1);
      const f = lags[j] === lags[i] ? 0 : Math.min(1, Math.max(0, (lag - lags[i]) / (lags[j] - lags[i])));
      const qAt = (key) => Q[key][i] * (1 - f) + Q[key][j] * f;
      const pts = Z_LEVELS.map(([pl, key]) => [pl, qAt(key)]);
      let v;
      if (p <= pts[0][0]) v = pts[0][1] - (pts[0][0] - p) * (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]);
      else if (p >= pts[4][0]) v = pts[4][1] + (p - pts[4][0]) * (pts[4][1] - pts[3][1]) / (pts[4][0] - pts[3][0]);
      else { let k = 0; while (p > pts[k + 1][0]) k++; const [p0, v0] = pts[k], [p1, v1] = pts[k + 1]; v = v0 + (v1 - v0) * (p - p0) / (p1 - p0); }
      return Math.max(0, (Math.max(xLast, floor) + floor) * Math.exp(v) - floor);
    });
    out.push(path);
  }
  return out;
}

/** Deterministic standard-normal sample from a seeded uniform generator (Box-Muller). */
export function gaussian(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
