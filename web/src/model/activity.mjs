// Mapping integrated solar wind driving to geomagnetic activity indices.

/** Newell et al. 2008: Kp = 0.05 + 2.244e-4 dPhi/dt + 2.844e-6 n^(1/2) v^2 (3-hour averages). */
export const NEWELL2008 = { intercept: 0.05, coupling: 2.244e-4, viscous: 2.844e-6 };

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function kpFromDriving(couplingAvg, viscousAvg, coef = NEWELL2008) {
  if (!Number.isFinite(couplingAvg)) return NaN;
  const visc = Number.isFinite(viscousAvg) ? viscousAvg : 0;
  return clamp(coef.intercept + coef.coupling * couplingAvg + coef.viscous * visc, 0, 9);
}

/**
 * Hp30 from our calibrated linear model (coefficients.json). Falls back to the Kp
 * regression, since Hp30 is on the Kp scale. Coefficient object shape:
 * { intercept, coupling, viscous, sigma, fittedOn, n }.
 */
export function hp30FromDriving(couplingAvg, viscousAvg, coefs, stormCoefs = null) {
  const c = coefs && Number.isFinite(coefs.coupling) ? coefs : NEWELL2008;
  const g = kpFromDriving(couplingAvg, viscousAvg, c);
  if (!Number.isFinite(g)) return NaN;
  // The general fit under-predicts storms (bias about -0.55 for Hp30 >= 3 in calibration); blend toward
  // the storm-only fit between 2.5 and 3.5.
  if (stormCoefs && Number.isFinite(stormCoefs.coupling) && g > 2.5) {
    const st = kpFromDriving(couplingAvg, viscousAvg, stormCoefs);
    const w = Math.min(1, (g - 2.5) / 1.0);
    return Math.min(12, (1 - w) * g + w * st);
  }
  return Math.min(g, 12); // Hp30 is open-ended above 9
}

/** Weighted blend of independent estimates: [{value, weight, source}] -> {value, sources}. */
export function blend(estimates) {
  let num = 0, den = 0; const used = [];
  for (const e of estimates) {
    if (Number.isFinite(e.value) && e.weight > 0) { num += e.value * e.weight; den += e.weight; used.push(e.source); }
  }
  return { value: den ? num / den : NaN, sources: used };
}

/** NOAA G scale from Kp. */
export function gScale(kp) {
  if (!(kp >= 5)) return 0;
  return Math.min(5, Math.floor(kp) - 4); // 5->G1, 6->G2, 7->G3, 8->G4, 9->G5
}

/** Kp value as NOAA's thirds string, e.g. 4.33 -> "4+" , 4.67 -> "5-", 4 -> "4o". */
export function kpThirds(kp) {
  if (!Number.isFinite(kp)) return '–';
  const thirds = Math.round(kp * 3);
  const whole = Math.floor(thirds / 3), rem = thirds - whole * 3;
  if (rem === 0) return `${whole}o`;
  if (rem === 1) return `${whole}+`;
  return `${whole + 1}-`;
}

/** Fraction of a Kp ensemble at or above a threshold. */
export function probabilityAtLeast(values, threshold) {
  const v = values.filter(Number.isFinite);
  if (!v.length) return NaN;
  return v.filter(x => x >= threshold).length / v.length;
}

/**
 * Turn a deterministic Kp forecast into P(Kp >= threshold) with a logistic
 * error model; sigma is the forecast RMSE on the Kp scale.
 */
export function probabilityFromPoint(kp, threshold, sigma = 0.7) {
  if (!Number.isFinite(kp)) return NaN;
  const z = (kp - threshold) / (sigma * 0.5513); // logistic scale matched to normal sigma
  return 1 / (1 + Math.exp(-z));
}
