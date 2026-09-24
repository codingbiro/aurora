// Auroral electrojet from a meridional magnetometer chain: quiet baselines the way
// IMAGE derives them, the IL / IU / IE electrojet indicators, substorm onsets on IL with
// the Newell & Gjerloev (2011) SML criterion, and the latitude of the westward electrojet
// from the north (X) and vertical (Z) perturbation profile across the chain.
//
// Sign conventions (northern hemisphere, X north, Z down): a westward electrojet gives a
// negative X bay beneath it, a positive (downward) Z perturbation on its poleward side and a
// negative Z perturbation on its equatorward side, so Z crosses zero under the current centre.

const MIN = 60e3, HOUR = 3600e3;

/**
 * Parse the multi-station text export of the IMAGE archive
 * (data_download.php?format=text): header "YYYY MM DD HH MM SS  KEV X  KEV Y  KEV Z  MAS X ...",
 * a dashed line, then one row per sample; 99999.9 = missing. Returns {CODE: {t, x, y, z}}.
 */
export function parseFmiArchive(txt) {
  const lines = txt.split('\n');
  const header = lines.find(l => /^YYYY MM DD HH MM SS/.test(l));
  if (!header) return {};
  const codes = [...header.matchAll(/([A-Z]{3}) X/g)].map(m => m[1]);
  const out = Object.fromEntries(codes.map(c => [c, { t: [], x: [], y: [], z: [] }]));
  for (const line of lines) {
    const f = line.trim().split(/\s+/);
    if (f.length < 6 + 3 * codes.length || !/^\d{4}$/.test(f[0])) continue;
    const t = Date.UTC(+f[0], +f[1] - 1, +f[2], +f[3], +f[4], +f[5]);
    codes.forEach((c, i) => {
      const X = +f[6 + 3 * i], Y = +f[7 + 3 * i], Z = +f[8 + 3 * i];
      if (X > 90000 || Y > 90000 || Z > 90000) return;
      out[c].t.push(t); out[c].x.push(X); out[c].y.push(Y); out[c].z.push(Z);
    });
  }
  return out;
}

/** Average a raw series onto 1-minute bins keeping X, Y and Z. Returns {t, x, y, z} at bin start. */
export function toMinutesXYZ(series) {
  const acc = new Map();
  for (let i = 0; i < series.t.length; i++) {
    const k = Math.floor(series.t[i] / MIN) * MIN;
    const e = acc.get(k) || { x: 0, y: 0, z: 0, n: 0 };
    e.x += series.x[i]; e.y += series.y ? series.y[i] : 0; e.z += series.z ? series.z[i] : 0; e.n++; acc.set(k, e);
  }
  const t = [...acc.keys()].sort((a, b) => a - b);
  return { t, x: t.map(k => acc.get(k).x / acc.get(k).n), y: t.map(k => acc.get(k).y / acc.get(k).n), z: t.map(k => acc.get(k).z / acc.get(k).n) };
}

function percentile(values, p) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  return v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))];
}

/**
 * Quiet baselines for a chain, following the IMAGE electrojet-indicator recipe: every 3-hour
 * window starting on a whole hour inside the data span is scored by the X range at each
 * station averaged over the stations; the window with the smallest mean range is the quiet
 * period, and each station's baseline is its mean X (and Z) inside it. Stations without data
 * in that window fall back to a high percentile of X (bays are negative) and the median of Z.
 * minuteStations: [{station, mlat, minutes: {t, x, z}}]. Returns {t0, t1, byStation: {code: {x, z, method}}}.
 */
export function chainBaseline(minuteStations, { windowHours = 3, minCoverage = 0.6 } = {}) {
  const usable = minuteStations.filter(s => s.minutes && s.minutes.t.length >= 30);
  if (!usable.length) return { t0: NaN, t1: NaN, byStation: {} };
  const tMin = Math.min(...usable.map(s => s.minutes.t[0])), tMax = Math.max(...usable.map(s => s.minutes.t[s.minutes.t.length - 1]));
  const W = windowHours * HOUR;
  let best = null;
  for (let t0 = Math.ceil(tMin / HOUR) * HOUR; t0 + W <= tMax + MIN; t0 += HOUR) {
    let sum = 0, n = 0;
    for (const s of usable) {
      const st = windowStats(s.minutes, t0, t0 + W);
      if (st.n < minCoverage * windowHours * 60) continue;
      sum += st.max - st.min; n++;
    }
    if (n < Math.max(1, Math.ceil(usable.length / 2))) continue;
    const score = sum / n;
    if (!best || score < best.score) best = { t0, t1: t0 + W, score, n };
  }
  const byStation = {};
  for (const s of usable) {
    const st = best ? windowStats(s.minutes, best.t0, best.t1) : { n: 0 };
    if (best && st.n >= minCoverage * windowHours * 60) byStation[s.station] = { x: st.meanX, z: st.meanZ, method: 'quiet-window' };
    else byStation[s.station] = { x: percentile(s.minutes.x, 0.8), z: percentile(s.minutes.z || [], 0.5), method: 'percentile' };
  }
  return { t0: best ? best.t0 : NaN, t1: best ? best.t1 : NaN, meanRange: best ? best.score : NaN, byStation };
}

function windowStats(minutes, t0, t1) {
  let i = lowerBound(minutes.t, t0), n = 0, sx = 0, sz = 0, min = Infinity, max = -Infinity;
  for (; i < minutes.t.length && minutes.t[i] < t1; i++) {
    const x = minutes.x[i]; if (!Number.isFinite(x)) continue;
    n++; sx += x; sz += minutes.z ? minutes.z[i] : 0; if (x < min) min = x; if (x > max) max = x;
  }
  return { n, min, max, meanX: n ? sx / n : NaN, meanZ: n ? sz / n : NaN };
}

function lowerBound(arr, t) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < t) lo = mid + 1; else hi = mid; }
  return lo;
}

/**
 * Deviations from baseline for every station: [{station, mlat, mlon, t, dx, dz, baseline}].
 */
export function chainDeviations(minuteStations, baseline) {
  return minuteStations.filter(s => s.minutes && baseline.byStation[s.station]).map(s => {
    const b = baseline.byStation[s.station];
    return { station: s.station, mlat: s.mlat, mlon: s.mlon, t: s.minutes.t, dx: s.minutes.x.map(v => v - b.x), dz: (s.minutes.z || []).map(v => v - b.z), baseline: b };
  });
}

/**
 * IL(t) = min over stations of the X deviation, IU(t) = max, IE = IU - IL, on a 1-minute grid;
 * minutes with fewer than `minStations` reporting stations are NaN.
 * Returns {t, il, iu, ie, ilStation, iuStation, n}.
 */
export function electrojetIndices(deviations, { minStations = 3 } = {}) {
  const grid = new Set();
  for (const s of deviations) for (const t of s.t) grid.add(t);
  const t = [...grid].sort((a, b) => a - b);
  const il = [], iu = [], ie = [], ilStation = [], iuStation = [], n = [];
  const cursors = deviations.map(() => 0);
  for (const tm of t) {
    let mn = Infinity, mx = -Infinity, sMin = null, sMax = null, cnt = 0;
    deviations.forEach((s, k) => {
      while (cursors[k] < s.t.length && s.t[cursors[k]] < tm) cursors[k]++;
      if (cursors[k] >= s.t.length || s.t[cursors[k]] !== tm) return;
      const v = s.dx[cursors[k]];
      if (!Number.isFinite(v)) return;
      cnt++;
      if (v < mn) { mn = v; sMin = s.station; }
      if (v > mx) { mx = v; sMax = s.station; }
    });
    n.push(cnt);
    if (cnt >= minStations) { il.push(mn); iu.push(mx); ie.push(mx - mn); ilStation.push(sMin); iuStation.push(sMax); }
    else { il.push(NaN); iu.push(NaN); ie.push(NaN); ilStation.push(null); iuStation.push(null); }
  }
  return { t, il, iu, ie, ilStation, iuStation, n };
}

/**
 * Substorm onsets on an electrojet index with the Newell & Gjerloev (2011) SML criterion:
 * the index must fall by at least 15, 30 and 45 nT over the first three minutes and stay on
 * average at least 100 nT below its onset value over minutes 4 to 30. Candidates whose
 * 30-minute window is not complete yet (the series ends first) are reported as `provisional`;
 * those that fail the sustain test are dropped. A new onset is not accepted within
 * `refractoryMin` minutes of the previous one, so intensifications count as one substorm.
 * Returns [{t, status, il0, ilMin, tMin, depth, minutesOfData}].
 */
export function detectOnsetsNG(index, { drops = [15, 30, 45], sustain = 100, sustainFrom = 4, sustainTo = 30, refractoryMin = 20, until = Infinity } = {}) {
  const { t, il } = index; const out = [];
  let last = -Infinity;
  for (let i = 0; i + 3 < t.length; i++) {
    if (t[i] > until || t[i] - last < refractoryMin * MIN) continue;
    if (t[i + 3] - t[i] !== 3 * MIN || !Number.isFinite(il[i])) continue;
    let ok = true;
    for (let k = 1; k <= 3; k++) if (!(il[i + k] - il[i] <= -drops[k - 1])) { ok = false; break; }
    if (!ok) continue;
    let sum = 0, n = 0, expected = 0;
    for (let k = sustainFrom; k <= sustainTo; k++) {
      const tk = t[i] + k * MIN; if (tk > until) break;
      expected++;
      const j = i + k; if (j < t.length && t[j] === tk && Number.isFinite(il[j])) { sum += il[j]; n++; }
    }
    const complete = expected === sustainTo - sustainFrom + 1 && n >= 0.8 * expected;
    const mean = n ? sum / n : NaN;
    let status;
    if (complete) { if (mean <= il[i] - sustain) status = 'confirmed'; else continue; }
    else if (n === 0 || mean <= il[i] - sustain * Math.min(1, n / 10)) status = 'provisional';
    else continue;
    // deepest point within the next hour, not beyond the data
    let ilMin = il[i], tMin = t[i];
    for (let j = i; j < t.length && t[j] - t[i] <= 60 * MIN && t[j] <= until; j++) if (il[j] < ilMin) { ilMin = il[j]; tMin = t[j]; }
    out.push({ t: t[i], status, il0: il[i], ilMin, tMin, depth: il[i] - ilMin, minutesOfData: n });
    last = t[i];
  }
  return out;
}

/**
 * Deviation profile across the chain at time t (latest minute within `tolMin` before t),
 * sorted by magnetic latitude: [{station, mlat, dx, dz, t}].
 */
export function chainProfile(deviations, t, tolMin = 3) {
  const rows = [];
  for (const s of deviations) {
    let i = lowerBound(s.t, t + 1) - 1;
    if (i < 0 || t - s.t[i] > tolMin * MIN) continue;
    if (!Number.isFinite(s.dx[i])) continue;
    rows.push({ station: s.station, mlat: s.mlat, dx: s.dx[i], dz: Number.isFinite(s.dz[i]) ? s.dz[i] : NaN, t: s.t[i] });
  }
  return rows.sort((a, b) => a.mlat - b.mlat);
}

/**
 * Latitude of the westward electrojet centre from a profile sorted by mlat. Uses the station
 * with the deepest negative X bay, refined by a parabola through its neighbours, and the
 * latitude where the Z perturbation changes sign from negative (equatorward side) to positive
 * (poleward side). When the deepest bay sits at the end of the chain and Z has the same sign
 * everywhere, the current runs beyond the chain and only a bound is returned.
 * Returns {mlat, amplitude, station, method, beyond, fromX, fromZ} or null when the chain is quiet.
 */
export function electrojetCentre(profile, { minAmplitude = 60, minBeyond = 100 } = {}) {
  const rows = profile.filter(r => Number.isFinite(r.dx));
  if (rows.length < 2) return null;
  let k = 0; for (let i = 1; i < rows.length; i++) if (rows[i].dx < rows[k].dx) k = i;
  const deepest = rows[k];
  if (!(deepest.dx <= -minAmplitude)) return null;
  const zRows = rows.filter(r => Number.isFinite(r.dz));
  const allNeg = zRows.length >= 2 && zRows.every(r => r.dz < 0), allPos = zRows.length >= 2 && zRows.every(r => r.dz > 0);
  if (k === rows.length - 1 && (allNeg || zRows.length < 2)) return deepest.dx <= -minBeyond ? { mlat: deepest.mlat + 1.5, amplitude: deepest.dx, station: deepest.station, method: 'beyond-chain', beyond: 'poleward', fromX: NaN, fromZ: NaN } : null;
  if (k === 0 && (allPos || zRows.length < 2)) return deepest.dx <= -minBeyond ? { mlat: deepest.mlat - 1.5, amplitude: deepest.dx, station: deepest.station, method: 'beyond-chain', beyond: 'equatorward', fromX: NaN, fromZ: NaN } : null;
  // parabolic refinement of the X minimum
  let fromX = deepest.mlat;
  if (k > 0 && k < rows.length - 1) {
    const [a, b, c] = [rows[k - 1], rows[k], rows[k + 1]];
    const den = (a.mlat - b.mlat) * (a.dx - c.dx) - (a.mlat - c.mlat) * (a.dx - b.dx);
    if (Math.abs(den) > 1e-9) {
      const num = (a.mlat - b.mlat) ** 2 * (a.dx - c.dx) - (a.mlat - c.mlat) ** 2 * (a.dx - b.dx);
      const v = a.mlat - 0.5 * num / den;
      if (v > a.mlat && v < c.mlat) fromX = v;
    }
  }
  // Z zero crossing nearest the X minimum (negative below, positive above)
  let fromZ = NaN, bestDist = Infinity;
  for (let i = 0; i + 1 < zRows.length; i++) {
    const lo = zRows[i], hi = zRows[i + 1];
    if (lo.dz < 0 && hi.dz > 0) {
      const cross = lo.mlat + (hi.mlat - lo.mlat) * (-lo.dz) / (hi.dz - lo.dz);
      const d = Math.abs(cross - fromX);
      if (d < bestDist) { bestDist = d; fromZ = cross; }
    }
  }
  const useZ = Number.isFinite(fromZ) && bestDist <= 2.5;
  const mlat = useZ ? 0.5 * (fromX + fromZ) : fromX;
  return { mlat, amplitude: deepest.dx, station: deepest.station, method: useZ ? 'x+z' : 'x', beyond: null, fromX, fromZ };
}

/**
 * X deviation interpolated to an observer's magnetic latitude from the profile, with the
 * nearest station. Beyond the chain the end station's value is used and flagged.
 */
export function deflectionAt(profile, mlat) {
  const rows = profile.filter(r => Number.isFinite(r.dx));
  if (!rows.length) return { dx: NaN, station: null, extrapolated: true, distance: NaN };
  let nearest = rows[0]; for (const r of rows) if (Math.abs(r.mlat - mlat) < Math.abs(nearest.mlat - mlat)) nearest = r;
  if (mlat <= rows[0].mlat) return { dx: rows[0].dx, station: rows[0].station, extrapolated: true, distance: rows[0].mlat - mlat };
  if (mlat >= rows[rows.length - 1].mlat) { const e = rows[rows.length - 1]; return { dx: e.dx, station: e.station, extrapolated: true, distance: mlat - e.mlat }; }
  for (let i = 0; i + 1 < rows.length; i++) {
    const lo = rows[i], hi = rows[i + 1];
    if (mlat >= lo.mlat && mlat <= hi.mlat) {
      const f = (mlat - lo.mlat) / (hi.mlat - lo.mlat);
      return { dx: lo.dx + f * (hi.dx - lo.dx), station: nearest.station, extrapolated: false, distance: Math.abs(nearest.mlat - mlat) };
    }
  }
  return { dx: nearest.dx, station: nearest.station, extrapolated: false, distance: Math.abs(nearest.mlat - mlat) };
}

/**
 * Plain-language class for a westward electrojet strength (nT, negative). The 50 nT floor is the
 * weak-bay limit of Juusola et al. (2011) / Partamies et al. (2013); the other steps are Space
 * Weather Canada's auroral-zone bands (unsettled 94-168, active 169-299, stormy 300-874, major
 * storm >= 875 nT hourly range), which describe the same latitudes as the Finnish chain.
 */
export const IL_CLASSES = [
  { max: -875, key: 'intense', label: 'intense' },
  { max: -300, key: 'strong', label: 'strong' },
  { max: -170, key: 'moderate', label: 'moderate' },
  { max: -50, key: 'weak', label: 'weak' },
  { max: Infinity, key: 'quiet', label: 'quiet' },
];

/**
 * FMI's "Auroras Now" indicator (Kauristie et al. 2016): the hourly maximum of the time derivative of
 * the geographic X and Y components at 1-minute resolution, in nT/s, compared with a station threshold
 * (0.30 nT/s at Nurmijärvi, 0.35 Hankasalmi, 0.42 Oulujärvi, 0.50 Sodankylä, 0.52 Muonio, 0.57 Kevo);
 * at Sodankylä 85 % of threshold exceedances came with aurora and no bright aurora was seen below it.
 * Returns {rate, t} (t = the minute of the largest step) over the last `windowMin` minutes.
 */
export function rateIndex(series, now, windowMin = 60) {
  const m = toMinutesXYZ(series);
  let best = NaN, tBest = NaN;
  const t0 = now - windowMin * MIN;
  for (let i = 1; i < m.t.length; i++) {
    if (m.t[i] < t0 || m.t[i] > now || m.t[i] - m.t[i - 1] !== MIN) continue;
    const r = Math.max(Math.abs(m.x[i] - m.x[i - 1]), Math.abs(m.y[i] - m.y[i - 1])) / 60;
    if (!(r <= best)) { best = r; tBest = m.t[i]; }
  }
  return { rate: best, t: tBest };
}

const FMI_RATE = { KEV: 0.57, KIL: 0.57, MUO: 0.52, SOD: 0.50, OUJ: 0.42, HAN: 0.35, NUR: 0.30 };
/** FMI's published threshold for the station (Kilpisjärvi shares Kevo's), or an interpolation in magnetic latitude for the others. */
export function fmiRateThreshold(station, mlat) {
  if (FMI_RATE[station]) return FMI_RATE[station];
  if (!Number.isFinite(mlat)) return NaN;
  const pts = [[57.6, 0.30], [59.4, 0.35], [61.8, 0.42], [64.7, 0.50], [65.5, 0.52], [66.6, 0.57], [67.1, 0.57]];
  if (mlat <= pts[0][0]) return pts[0][1];
  if (mlat >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i + 1 < pts.length; i++) if (mlat >= pts[i][0] && mlat <= pts[i + 1][0]) { const f = (mlat - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return +(pts[i][1] + f * (pts[i + 1][1] - pts[i][1])).toFixed(3); }
  return NaN;
}
export function ilClass(il) {
  if (!Number.isFinite(il)) return 'unknown';
  for (const c of IL_CLASSES) if (il <= c.max) return c.key;
  return 'quiet';
}

/**
 * Convenience: build minute series, baselines, deviations, indices and onsets from raw
 * station series [{station, mlat, mlon, series:{t,x,y,z}}]. Returns null with fewer than
 * `minStations` usable stations.
 */
export function analyseChain(stations, { now = Date.now(), minStations = 3, onsetOptions = {} } = {}) {
  const minuteStations = stations.filter(s => s.series && s.series.t.length >= 30).map(s => ({ station: s.station, mlat: s.mlat, mlon: s.mlon, minutes: toMinutesXYZ(s.series) }));
  if (minuteStations.length < minStations) return null;
  const baseline = chainBaseline(minuteStations);
  const deviations = chainDeviations(minuteStations, baseline);
  const index = electrojetIndices(deviations, { minStations });
  const onsets = detectOnsetsNG(index, { until: now, ...onsetOptions });
  const profile = chainProfile(deviations, now, 3);
  const centre = electrojetCentre(profile);
  const iNow = lastFiniteIndex(index, now);
  return { minuteStations, baseline, deviations, index, onsets, profile, centre, latest: iNow >= 0 ? { t: index.t[iNow], il: index.il[iNow], iu: index.iu[iNow], ie: index.ie[iNow], ilStation: index.ilStation[iNow] } : null };
}

function lastFiniteIndex(index, now) {
  for (let i = index.t.length - 1; i >= 0; i--) if (index.t[i] <= now && Number.isFinite(index.il[i])) return i;
  return -1;
}
