// Probabilistic verification: Brier score and skill, rank AUC, reliability bins. Pure functions
// shared by the hindcast script, the Worker log verification and the model-check page.
// pairs: [[probability, outcome 0|1], ...]

export function brierScore(pairs) {
  let s = 0, n = 0;
  for (const [p, o] of pairs) { if (!Number.isFinite(p) || !(o === 0 || o === 1)) continue; s += (p - o) ** 2; n++; }
  return n ? s / n : NaN;
}

/** Base rate of the outcome. */
export function baseRate(pairs) {
  let s = 0, n = 0;
  for (const [, o] of pairs) { if (o === 0 || o === 1) { s += o; n++; } }
  return n ? s / n : NaN;
}

/** Rank-based area under the ROC curve; NaN without both outcomes. */
export function auc(pairs) {
  const pos = [], neg = [];
  for (const [p, o] of pairs) { if (!Number.isFinite(p)) continue; if (o === 1) pos.push(p); else if (o === 0) neg.push(p); }
  if (!pos.length || !neg.length) return NaN;
  const all = [...pos.map(p => [p, 1]), ...neg.map(p => [p, 0])].sort((a, b) => a[0] - b[0]);
  let rankSum = 0;
  for (let i = 0; i < all.length;) {
    let j = i; while (j < all.length && all[j][0] === all[i][0]) j++;
    const r = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) if (all[k][1] === 1) rankSum += r;
    i = j;
  }
  return (rankSum - pos.length * (pos.length + 1) / 2) / (pos.length * neg.length);
}

/** Reliability bins of width 1/nBins: [{lo, hi, n, forecast, observed}]. */
export function reliabilityBins(pairs, nBins = 10) {
  const bins = Array.from({ length: nBins }, (_, i) => ({ lo: i / nBins, hi: (i + 1) / nBins, n: 0, forecast: 0, observed: 0 }));
  for (const [p, o] of pairs) {
    if (!Number.isFinite(p) || !(o === 0 || o === 1)) continue;
    const b = bins[Math.min(nBins - 1, Math.max(0, Math.floor(p * nBins)))];
    b.n++; b.forecast += p; b.observed += o;
  }
  return bins.map(b => ({ lo: b.lo, hi: b.hi, n: b.n, forecast: b.n ? b.forecast / b.n : NaN, observed: b.n ? b.observed / b.n : NaN }));
}

/** Summary: n, base rate, Brier, climatological Brier, Brier skill score, AUC, reliability. */
export function scoreSummary(pairs, nBins = 10) {
  const valid = pairs.filter(([p, o]) => Number.isFinite(p) && (o === 0 || o === 1));
  const base = baseRate(valid), brier = brierScore(valid);
  const brierClim = base * (1 - base);
  return { n: valid.length, base, brier, brierClim, bss: brierClim > 0 ? 1 - brier / brierClim : NaN, auc: auc(valid), reliability: reliabilityBins(valid, nBins) };
}
