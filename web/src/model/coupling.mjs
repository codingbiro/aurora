// Solar wind to magnetosphere coupling functions.
// Units throughout: speed v in km/s, magnetic field in nT (GSM), density n in cm^-3.

/** Solar-cycle mean of the Newell coupling function in these units (OvationPyme dFave). */
export const NEWELL_MEAN = 4421;

/** IMF clock angle: 0 = purely northward, +-pi = purely southward. */
export function clockAngle(by, bz) {
  return Math.atan2(by, bz);
}

/**
 * Newell et al. 2007 coupling function dPhi_MP/dt = v^(4/3) Bt^(2/3) sin^(8/3)(theta_c/2).
 * Rate at which magnetic flux is opened at the magnetopause, arbitrary units.
 */
export function newellCoupling(v, by, bz) {
  const bt = Math.hypot(by, bz);
  if (!(v > 0) || !Number.isFinite(bt)) return NaN;
  const s = Math.abs(Math.sin(clockAngle(by, bz) / 2));
  return Math.pow(v, 4 / 3) * Math.pow(bt, 2 / 3) * Math.pow(s, 8 / 3);
}

/** Kan-Lee merging electric field in mV/m: v Bt sin^2(theta_c/2). */
export function kanLeeField(v, by, bz) {
  const bt = Math.hypot(by, bz);
  const s = Math.sin(clockAngle(by, bz) / 2);
  return v * bt * s * s * 1e-3;
}

/**
 * Perreault-Akasofu epsilon power without the constant factors: v B^2 sin^4(theta_c/2).
 * Used as the loading rate of the minimal substorm model; only ratios matter.
 */
export function akasofuPower(v, bx, by, bz) {
  const b2 = bx * bx + by * by + bz * bz;
  const s = Math.sin(clockAngle(by, bz) / 2);
  return v * b2 * s * s * s * s;
}

/** Newell et al. 2008 viscous term n^(1/2) v^2. */
export function viscousTerm(n, v) {
  return Math.sqrt(Math.max(n, 0)) * v * v;
}

/** Solar wind dynamic pressure in nPa (protons only). */
export function dynamicPressure(n, v) {
  return 1.6726e-6 * n * v * v;
}

/**
 * Compute all per-minute features for a propagated solar wind record.
 * rec: {speed, density, bx, by, bz, bt}
 */
export function features(rec) {
  const v = rec.speed;
  const { bx, by, bz, density: n } = rec;
  return {
    coupling: newellCoupling(v, by, bz),
    ekl: kanLeeField(v, by, bz),
    power: akasofuPower(v, bx ?? 0, by, bz),
    viscous: viscousTerm(n, v),
    pdyn: dynamicPressure(n, v),
  };
}
