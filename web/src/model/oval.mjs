// Auroral oval geometry: OVATION Prime output parsing, equatorward boundary at a
// magnetic local time, and Kp-driven statistical ovals (Starkov 1994 via Sigernes 2011,
// NOAA rule of thumb).

export const OVATION_MLT_BINS = 96;   // 0.25 h
export const OVATION_MLAT_BINS = 80;  // 50.0 .. 89.5 in 0.5 deg
export const OVATION_MLAT0 = 50;

/**
 * Parse text/ovation_latest_aurora_n.txt. Returns
 * {runTime, obsTime, forecastTime, hemisphericPower, forecastKp, diff, mono, wave, ions}
 * with the flux arrays indexed [mltBin * 80 + mlatBin] in erg/cm^2/s.
 */
export function parseOvationText(txt) {
  const out = { runTime: null, obsTime: null, forecastTime: null, hemisphericPower: NaN, forecastKp: NaN };
  const n = OVATION_MLT_BINS * OVATION_MLAT_BINS;
  const diff = new Float32Array(n), mono = new Float32Array(n), wave = new Float32Array(n), ions = new Float32Array(n);
  let rows = 0;
  for (const line of txt.split('\n')) {
    if (line.startsWith('Model_Run Time:')) out.runTime = parseUtc(line.slice(15));
    else if (line.startsWith('Observation Time:')) out.obsTime = parseUtc(line.slice(17));
    else if (line.startsWith('Forecast Time:')) out.forecastTime = parseUtc(line.slice(14));
    else if (line.startsWith('Hemispheric Power:')) out.hemisphericPower = parseFloat(line.slice(18));
    else if (line.startsWith('Forecast Kp:')) out.forecastKp = parseFloat(line.slice(12));
    else if (/^\s+[\d.]+e[+-]\d+\s/.test(line)) {
      const f = line.trim().split(/\s+/).map(Number);
      if (f.length < 6) continue;
      const mltBin = Math.round((f[0] - 0.001) / 0.25);
      const mlatBin = Math.round((f[1] - OVATION_MLAT0 - 0.001) / 0.5);
      if (mltBin < 0 || mltBin >= OVATION_MLT_BINS || mlatBin < 0 || mlatBin >= OVATION_MLAT_BINS) continue;
      const k = mltBin * OVATION_MLAT_BINS + mlatBin;
      diff[k] = f[2]; mono[k] = f[3]; wave[k] = f[4]; ions[k] = f[5]; rows++;
    }
  }
  return { ...out, rows, diff, mono, wave, ions };
}

function parseUtc(s) {
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
}

/** Total electron energy flux (diffuse + monoenergetic + broadband) at a grid cell. */
export function electronFlux(grid, mltBin, mlatBin) {
  const k = mltBin * OVATION_MLAT_BINS + mlatBin;
  return grid.diff[k] + grid.mono[k] + grid.wave[k];
}

/** NOAA's displayed aurora value: P(%) = 10 + 8 * electron energy flux, capped at 100 (Case et al. 2016). */
export function noaaProbability(flux) {
  return flux > 0 ? Math.min(100, 10 + 8 * flux) : 0;
}

/**
 * Most equatorward magnetic latitude at the given MLT where electron flux >= threshold,
 * averaging the MLT bin with its neighbours. Returns {mlat, peakMlat, peakFlux, atEdge}.
 * `atEdge` is true when the flux still exceeds the threshold at the 50 deg grid edge.
 */
export function equatorwardBoundary(grid, mlt, threshold = 1.0) {
  const b = Math.floor((((mlt % 24) + 24) % 24) / 0.25);
  const bins = [(b + 95) % 96, b, (b + 1) % 96];
  let boundary = NaN, atEdge = false, peakFlux = 0, peakMlat = NaN;
  for (let j = 0; j < OVATION_MLAT_BINS; j++) {
    const flux = bins.reduce((s, mb) => s + electronFlux(grid, mb, j), 0) / bins.length;
    if (flux > peakFlux) { peakFlux = flux; peakMlat = OVATION_MLAT0 + j * 0.5; }
    if (!Number.isFinite(boundary) && flux >= threshold) { boundary = OVATION_MLAT0 + j * 0.5; atEdge = j === 0; }
  }
  return { mlat: boundary, atEdge, peakFlux, peakMlat, threshold };
}

/** Hemispheric power from the grid (GW), for cross-checking the header value. */
export function hemisphericPower(grid) {
  // cell area: 0.5 deg lat x 0.25 h (3.75 deg) lon on a sphere of radius R_E + 110 km
  const R = 6371e3 + 110e3; let sum = 0;
  for (let i = 0; i < OVATION_MLT_BINS; i++) for (let j = 0; j < OVATION_MLAT_BINS; j++) {
    const lat = (OVATION_MLAT0 + j * 0.5 + 0.25) * Math.PI / 180;
    const area = R * R * (0.5 * Math.PI / 180) * (3.75 * Math.PI / 180) * Math.cos(lat); // m^2
    const k = i * OVATION_MLAT_BINS + j;
    const flux = grid.diff[k] + grid.mono[k] + grid.wave[k] + grid.ions[k]; // erg/cm^2/s = 1e-3 W/m^2
    sum += flux * 1e-3 * area;
  }
  return sum / 1e9;
}

// ---------------------------------------------------------------------------------
// Starkov 1994 oval boundaries (as formulated by Sigernes et al. 2011).
// Colatitude Theta(t) = A0 + A1 cos(15(t + a1)) + A2 cos(15(2t + a2)) + A3 cos(15(3t + a3)),
// t = MLT in hours, angles in degrees, each coefficient a cubic in log10|AL|.
// Rows: powers 0..3 of log10|AL|; columns A0, A1, A2, A3, a1, a2, a3.
// Coefficients transcribed from habtie-phys/auroraloval (research/starkov1994_coeffs.csv).

const STARKOV = {
  poleward: [
    [-0.07, -10.06, -4.44, -3.77, -6.61, 6.37, -4.48],
    [24.54, 19.83, 7.47, 7.90, 10.17, -1.10, 10.16],
    [-12.53, -9.33, -3.01, -4.73, -5.80, 0.34, -5.87],
    [2.15, 1.24, 0.25, 0.91, 1.19, -0.38, 0.98],
  ],
  oval: [
    [1.61, -9.59, -12.07, -6.56, -2.22, -23.98, -20.07],
    [23.21, 17.78, 17.49, 11.44, 1.50, 42.79, 36.67],
    [-10.97, -7.20, -7.96, -6.73, -0.58, -26.96, -24.20],
    [2.03, 0.96, 1.15, 1.31, 0.08, 5.56, 5.11],
  ],
  diffuse: [
    [3.44, -2.41, -0.74, -2.12, -1.68, 8.69, 8.61],
    [29.77, 7.89, 3.94, 3.24, -2.48, -20.73, -5.34],
    [-16.38, -4.32, -3.09, -1.67, 1.58, 13.03, -1.36],
    [3.35, 0.87, 0.72, 0.31, -0.28, -2.14, 0.76],
  ],
};

/** Starkov's Kp to |AL| (nT) relation, valid to about Kp 7. */
export function alFromKp(kp) {
  const k = Math.min(Math.max(kp, 0), 9);
  return Math.max(1, 18 - 12.3 * k + 27.2 * k * k - 2.0 * k * k * k);
}

/**
 * Magnetic latitude of a Starkov boundary. kind: 'diffuse' (equatorward edge of the
 * diffuse aurora), 'oval' (equatorward edge of the discrete oval) or 'poleward'.
 */
export function starkovBoundary(kp, mlt, kind = 'diffuse') {
  const table = STARKOV[kind];
  const L = Math.log10(alFromKp(kp));
  const c = new Array(7).fill(0);
  for (let p = 0; p < 4; p++) for (let i = 0; i < 7; i++) c[i] += table[p][i] * Math.pow(L, p);
  const rad = Math.PI / 180, t = mlt;
  const theta = c[0] + c[1] * Math.cos(15 * (t + c[4]) * rad) + c[2] * Math.cos(15 * (2 * t + c[5]) * rad) + c[3] * Math.cos(15 * (3 * t + c[6]) * rad);
  return 90 - theta;
}

/** NOAA rule of thumb: about 66 deg at Kp 0, 2 deg equatorward per Kp step. */
export function noaaRuleBoundary(kp) {
  return 66 - 2 * Math.min(Math.max(kp, 0), 9);
}

/**
 * Boundary used for Kp-driven horizons: Starkov's diffuse equatorward edge up to Kp 6
 * (it carries the MLT dependence), continued at NOAA's 2 deg per Kp step above that,
 * because Starkov's Kp-to-AL relation saturates for strong storms.
 */
export function boundaryForKp(kp, mlt) {
  const k = Math.min(Math.max(kp, 0), 6);
  const b = starkovBoundary(k, mlt, 'diffuse');
  return kp > 6 ? b - 2 * (Math.min(kp, 9.5) - 6) : b;
}

/**
 * Smallest Kp at which the boundary reaches `targetMlat` at the given MLT.
 * Returns a value in [0, 9] or Infinity when even Kp 9 does not reach it.
 */
export function kpForBoundary(targetMlat, mlt, kind = 'hybrid') {
  const f = (kp) => (kind === 'hybrid' ? boundaryForKp(kp, mlt) : starkovBoundary(kp, mlt, kind)) - targetMlat;
  if (f(0) <= 0) return 0;
  if (f(9) > 0) return Infinity;
  let lo = 0, hi = 9;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  return hi;
}

/** Visibility class from the margin (boundary latitude minus observer latitude). */
export const VIEW_ALLOWANCE_DEG = 8; // Case et al. 2016: sightings extend ~8 deg equatorward of the 1 erg edge
export function visibilityClass(marginDeg) {
  if (!Number.isFinite(marginDeg)) return 'unknown';
  if (marginDeg <= 0) return 'overhead';
  if (marginDeg <= VIEW_ALLOWANCE_DEG) return 'horizon';
  return 'none';
}
