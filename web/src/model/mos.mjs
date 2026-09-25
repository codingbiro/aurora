// Model output statistics for NOAA's Geospace Kp: a linear correction Hp30 ≈ a + b · Kp_geospace fitted
// continuously on the last week of overlap with GFZ Hp30. Measured 2026-09-24: overall bias about zero
// but 0.3 to 0.7 low on active intervals, i.e. a slope above one, which a plain bias cannot fix.

const MIN = 60e3;

/** Half-hour means of a 1-minute [{t, kp}] series, keyed by interval start (ms). */
export function halfHourMeans(series) {
  const acc = new Map();
  for (const r of series) {
    if (!Number.isFinite(r.t) || !Number.isFinite(r.kp)) continue;
    const k = Math.floor(r.t / (30 * MIN)) * 30 * MIN;
    const e = acc.get(k) || { s: 0, n: 0 }; e.s += r.kp; e.n++; acc.set(k, e);
  }
  const out = new Map();
  for (const [k, e] of acc) if (e.n >= 10) out.set(k, e.s / e.n);
  return out;
}

/** Pair Geospace half-hour means with observed Hp30 intervals [{t (start), value}] -> [[geo, hp30], ...]. */
export function pairWithHp30(geoSeries, hp30) {
  const means = halfHourMeans(geoSeries);
  const pairs = [];
  for (const h of hp30) { const g = means.get(h.t); if (Number.isFinite(g) && Number.isFinite(h.value)) pairs.push([g, h.value]); }
  return pairs;
}

/**
 * Least-squares fit hp30 = a + b * geo with the slope kept within [0.7, 1.5] and the intercept within
 * [-1.5, 1.5]; returns null with fewer than `minPairs` pairs. Also reports the RMSE before and after.
 */
export function mosFit(pairs, { minPairs = 96, slopeRange = [0.7, 1.5], interceptRange = [-1.5, 1.5] } = {}) {
  const n = pairs.length;
  if (n < minPairs) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of pairs) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const vx = sxx / n - (sx / n) ** 2;
  let b = vx > 1e-9 ? (sxy / n - (sx / n) * (sy / n)) / vx : 1;
  b = Math.min(slopeRange[1], Math.max(slopeRange[0], b));
  let a = sy / n - b * sx / n;
  a = Math.min(interceptRange[1], Math.max(interceptRange[0], a));
  let seRaw = 0, seFit = 0;
  for (const [x, y] of pairs) { seRaw += (x - y) ** 2; seFit += (a + b * x - y) ** 2; }
  return { a, b, n, rmseRaw: Math.sqrt(seRaw / n), rmse: Math.sqrt(seFit / n), biasRaw: (sx - sy) / n };
}

/** Apply a fit to one value (clamped to the Kp scale); identity without a fit. */
export function mosApply(fit, v) {
  if (!Number.isFinite(v)) return NaN;
  if (!fit) return v;
  return Math.min(9, Math.max(0, fit.a + fit.b * v));
}
