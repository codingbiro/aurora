// Substorms: onset detection from ground magnetometers (a chain electrojet index when three or
// more stations report, single-station bays otherwise), the phase state machine, an onset
// hazard from the minimal substorm model (Freeman & Morley 2004), the climatology of where
// and when onsets happen, and an observer-specific outlook for the auroral zone.
import { analyseChain, ilClass, deflectionAt, rateIndex, fmiRateThreshold } from './electrojet.mjs';
import { starkovBoundary, ovalBand } from './oval.mjs';

const MIN = 60e3;

/**
 * Parse an FMI IMAGE real-time file (<STN>data_01.txt / _24.txt):
 * two header lines, then "YYYY MM DD HH MM SS X Y Z" at 10 s cadence, 99999.9 = missing.
 * Returns {t: number[], x: number[], y: number[], z: number[]} ascending in time.
 */
export function parseFmi(txt) {
  const t = [], x = [], y = [], z = [];
  for (const line of txt.split('\n')) {
    const f = line.trim().split(/\s+/);
    if (f.length < 9 || !/^\d{4}$/.test(f[0])) continue;
    const X = +f[6], Y = +f[7], Z = +f[8];
    if (X > 90000 || Y > 90000 || Z > 90000) continue;
    t.push(Date.UTC(+f[0], +f[1] - 1, +f[2], +f[3], +f[4], +f[5]));
    x.push(X); y.push(Y); z.push(Z);
  }
  return { t, x, y, z };
}

/**
 * Parse an IAGA-2002 file (INTERMAGNET GIN, IRF Kiruna): DATE TIME DOY X Y Z F rows.
 */
export function parseIaga2002(txt) {
  const t = [], x = [], y = [], z = [];
  for (const line of txt.split('\n')) {
    const m = line.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.\d+)?\s+\d+\s+(\S+)\s+(\S+)\s+(\S+)/);
    if (!m) continue;
    const X = +m[7], Y = +m[8], Z = +m[9];
    if (!(Math.abs(X) < 90000) || !(Math.abs(Y) < 90000)) continue;
    t.push(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
    x.push(X); y.push(Y); z.push(Z);
  }
  return { t, x, y, z };
}

/** Parse HAPI JSON data response ({parameters, data: [[time, ...]]}) with a Field_Vector column. */
export function parseHapiVector(json) {
  const t = [], x = [], y = [], z = [];
  for (const row of json.data || []) {
    const v = Array.isArray(row[1]) ? row[1] : row.slice(1, 4);
    if (!(Math.abs(v[0]) < 90000)) continue;
    t.push(Date.parse(row[0])); x.push(+v[0]); y.push(+v[1]); z.push(+v[2]);
  }
  return { t, x, y, z };
}

/**
 * Extend a station series with a newer chunk (FMI's 1-hour file, a twentieth of the day file) and keep the rolling
 * window the day file itself covers, so the result matches a fresh day file. Returns a new {t, x, y, z}.
 */
export function extendSeries(prev, chunk, spanMs = 24 * 60 * MIN) {
  const last = prev.t.length ? prev.t[prev.t.length - 1] : -Infinity;
  const out = { t: prev.t.slice(), x: prev.x.slice(), y: prev.y.slice(), z: prev.z.slice() };
  for (let i = 0; i < chunk.t.length; i++) {
    if (chunk.t[i] <= last) continue;
    out.t.push(chunk.t[i]); out.x.push(chunk.x[i]); out.y.push(chunk.y[i]); out.z.push(chunk.z[i]);
  }
  const end = out.t.length ? out.t[out.t.length - 1] : -Infinity;
  let i0 = 0; while (i0 < out.t.length && out.t[i0] <= end - spanMs) i0++;
  if (i0) for (const k of ['t', 'x', 'y', 'z']) out[k] = out[k].slice(i0);
  return out;
}

/** Average a 10-second series onto 1-minute bins. Returns {t, x} with t at bin start. */
export function toMinutes(series) {
  const out = new Map();
  for (let i = 0; i < series.t.length; i++) {
    const k = Math.floor(series.t[i] / MIN) * MIN;
    const e = out.get(k) || { s: 0, n: 0 };
    e.s += series.x[i]; e.n++; out.set(k, e);
  }
  const t = [...out.keys()].sort((a, b) => a - b);
  return { t, x: t.map(k => out.get(k).s / out.get(k).n) };
}

/**
 * Quiet-level baseline for the northward component. Substorm bays are negative
 * excursions, so the quiet level is estimated as a high percentile of the last day.
 */
export function quietBaseline(values, pct = 0.8) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  return v[Math.min(v.length - 1, Math.floor(pct * (v.length - 1)))];
}

/**
 * Onset detector for one station's 1-minute northward component. Newell & Gjerloev's
 * SML criterion (15 nT/min for 3 min) is defined on the multi-station lower envelope,
 * which is sharper than any single station, so per station we require a drop of at
 * least `drop3` nT over 3 minutes that deepens to at least `drop10` nT within 10 minutes.
 * Returns onset times (ms); re-triggers within `refractoryMin` minutes are suppressed.
 */
export function detectOnsets(minute, { drop3 = 30, drop10 = 50, refractoryMin = 30 } = {}) {
  const { t, x } = minute; const onsets = [];
  let last = -Infinity;
  for (let i = 3; i < t.length; i++) {
    if (t[i] - t[i - 3] !== 3 * MIN) continue;
    if (!(x[i] - x[i - 3] <= -drop3)) continue;
    let deep = false;
    for (let j = i; j < t.length && t[j] - t[i - 3] <= 10 * MIN; j++) if (x[j] - x[i - 3] <= -drop10) { deep = true; break; }
    if (!deep) continue;
    const t0 = t[i - 3];
    if (t0 - last >= refractoryMin * MIN) { onsets.push(t0); last = t0; }
  }
  return onsets;
}

/**
 * Combine several stations: an onset is confirmed when >= minStations stations show one
 * within `windowMin` minutes. Returns confirmed onset times (earliest of each cluster).
 */
export function confirmOnsets(perStation, { minStations = 2, windowMin = 10 } = {}) {
  const all = perStation.flatMap(s => s.onsets.map(t => ({ t, station: s.station }))).sort((a, b) => a.t - b.t);
  const confirmed = [];
  for (let i = 0; i < all.length; i++) {
    const cluster = new Set([all[i].station]);
    for (let j = i + 1; j < all.length && all[j].t - all[i].t <= windowMin * MIN; j++) cluster.add(all[j].station);
    if (cluster.size >= minStations && !(confirmed.length && all[i].t - confirmed[confirmed.length - 1].t < 30 * MIN)) {
      confirmed.push({ t: all[i].t, stations: [...cluster] });
    }
  }
  return confirmed;
}

/** Median phase durations in minutes (Partamies et al. 2013). */
export const PHASE = { growth: 31, expansion: 12, recovery: 31, quiet: 75 };

/**
 * Current phase from the last confirmed onset and the driving.
 * ekl: current Kan-Lee field (mV/m); minutesSinceOnset: Infinity when none known.
 */
export function classifyPhase(minutesSinceOnset, ekl, minutesSouthward) {
  if (minutesSinceOnset <= 15) return 'expansion';
  if (minutesSinceOnset <= 45) return 'recovery';
  if (ekl >= 0.6 && minutesSouthward >= 10) return 'growth';
  return 'quiet';
}

/**
 * Phase from the electrojet index itself: expansion while the index is still deepening
 * (within the first 12 minutes unconditionally, up to 60 minutes while the running minimum
 * keeps moving), recovery while the bay is still at least 40 % of its depth (and at least
 * 100 nT) or for 45 minutes, then back to the driving-based growth/quiet rule.
 * Returns {phase, ilMin, tMin, ilNow}.
 */
export function phaseFromIndex(index, onset, now, ekl, minutesSouthward) {
  if (!onset) return { phase: classifyPhase(Infinity, ekl, minutesSouthward), ilMin: NaN, tMin: NaN, ilNow: latestValue(index, now) };
  const since = (now - onset.t) / MIN;
  let ilMin = Infinity, tMin = onset.t, ilNow = NaN;
  for (let i = 0; i < index.t.length; i++) {
    if (index.t[i] < onset.t || index.t[i] > now || !Number.isFinite(index.il[i])) continue;
    if (index.il[i] < ilMin) { ilMin = index.il[i]; tMin = index.t[i]; }
    ilNow = index.il[i];
  }
  if (!Number.isFinite(ilMin)) ilMin = NaN;
  let phase;
  if (since <= 12) phase = 'expansion';
  else if (since <= 60 && (now - tMin <= 8 * MIN || (Number.isFinite(ilNow) && ilNow <= 0.9 * ilMin))) phase = 'expansion';
  else if (since <= 150 && Number.isFinite(ilNow) && ilNow <= 0.4 * ilMin && ilNow <= -100) phase = 'recovery';
  else if (since <= 45) phase = 'recovery';
  else phase = classifyPhase(Infinity, ekl, minutesSouthward);
  return { phase, ilMin, tMin, ilNow };
}

function latestValue(index, now) {
  for (let i = index.t.length - 1; i >= 0; i--) if (index.t[i] <= now && Number.isFinite(index.il[i])) return index.il[i];
  return NaN;
}

/**
 * Factor by which the geometric visibility probability is scaled for each phase:
 * bright active forms during expansion and early recovery, faint arcs in growth,
 * little during quiet. Heuristic, documented in PLAN.md.
 */
export const PHASE_FACTOR = { expansion: 1.0, recovery: 0.75, growth: 0.45, quiet: 0.25 };

/**
 * Minimal substorm model hazard. The magnetotail stores energy at rate P (Akasofu power,
 * relative units) since the last onset; it releases when the store reaches a threshold.
 * With constant driving the recurrence is D = 2.7 h, so the threshold is expressed as
 * D times the recent mean power, with a lognormal spread (sigma) that reproduces the
 * observed waiting-time scatter. Returns P(onset within `dtMin` minutes).
 *
 * loaded: energy integrated since the last onset (same units as power * minutes)
 * powerRecent: mean power over the last 3 h; powerFuture: expected power over the horizon
 */
export function onsetProbability(loaded, powerRecent, powerFuture, dtMin, { D = 162, sigma = 0.55, ekl = 1 } = {}) {
  if (!(powerRecent > 0) || !(loaded >= 0)) return NaN;
  const threshold = D * powerRecent;
  const now = Math.max(loaded, 1e-9) / threshold;
  const later = (loaded + Math.max(powerFuture, 0) * dtMin) / threshold;
  const F = (r) => normalCdf(Math.log(r) / sigma);
  const surv = 1 - F(now);
  let p = surv > 1e-9 ? (F(later) - F(now)) / surv : 1;
  if (ekl < 0.6) p *= 0.25; // Li et al. 2013: onsets need a merging field of ~0.6 mV/m; spontaneous ones are rare
  return Math.min(1, Math.max(0, p));
}

export function normalCdf(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}
function erf(x) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

/**
 * Assemble the substorm state for the dashboard.
 * stations: [{station, mlat, mlon?, series:{t,x,y,z}}] (raw 10 s or 1 min)
 * drive: ascending [{t, power, ekl, bz}] on Earth-arrival time, covering the last several hours
 * now: ms
 *
 * With three or more reporting stations the chain electrojet index IL (lower envelope of the
 * baseline-corrected X deviations) is built and onsets are taken from it with the Newell &
 * Gjerloev criterion; otherwise the per-station bay detector is used and two stations must
 * agree (one when only one reports).
 */
export function substormState(stations, drive, now) {
  const perStation = [];
  for (const s of stations) {
    if (!s.series || s.series.t.length < 30) continue;
    const minute = toMinutes(s.series);
    const base = quietBaseline(minute.x);
    const dev = minute.x.map(v => v - base);
    const onsets = detectOnsets(minute).filter(t => t <= now);
    const recent = dev.filter((_, i) => minute.t[i] >= now - 30 * MIN);
    const rate = rateIndex(s.series, now);
    perStation.push({ station: s.station, mlat: s.mlat, onsets, baseline: base, bay: recent.length ? Math.min(...recent) : NaN,
      latest: minute.t.length ? minute.t[minute.t.length - 1] : null, current: dev.length ? dev[dev.length - 1] : NaN,
      rate: rate.rate, rateThreshold: fmiRateThreshold(s.station, s.mlat), rateT: rate.t });
  }
  const chain = analyseChain(stations, { now, minStations: 3 });

  // driving statistics
  const recent = drive.filter(d => d.t <= now && d.t >= now - 180 * MIN && Number.isFinite(d.power));
  const powerRecent = recent.length ? recent.reduce((s, d) => s + d.power, 0) / recent.length : NaN;
  const lastDrive = drive.filter(d => d.t <= now && Number.isFinite(d.ekl)).slice(-15);
  const ekl = lastDrive.length ? lastDrive.reduce((s, d) => s + d.ekl, 0) / lastDrive.length : NaN;
  const hourDrive = drive.filter(d => d.t <= now && d.t > now - 60 * MIN && Number.isFinite(d.ekl));
  const eklHour = hourDrive.length >= 20 ? hourDrive.reduce((s, d) => s + d.ekl, 0) / hourDrive.length : NaN;
  let minutesSouthward = 0;
  for (let i = drive.length - 1; i >= 0; i--) { if (drive[i].t > now) continue; if (drive[i].bz < 0) minutesSouthward++; else break; }

  let lastOnset = null, onsets = [], method = 'stations', phase, phaseInfo = null;
  if (chain) {
    method = 'chain';
    onsets = chain.onsets.filter(o => o.t <= now).map(o => ({ t: o.t, status: o.status, il0: o.il0, ilMin: o.ilMin, tMin: o.tMin, depth: o.depth, stations: [chain.index.ilStation[chain.index.t.indexOf(o.t)] || chain.index.ilStation[chain.index.t.indexOf(o.tMin)]].filter(Boolean) }));
    lastOnset = onsets.length ? onsets[onsets.length - 1] : null;
    phaseInfo = phaseFromIndex(chain.index, lastOnset, now, ekl, minutesSouthward);
    phase = phaseInfo.phase;
  } else {
    const confirmed = confirmOnsets(perStation, { minStations: perStation.length >= 2 ? 2 : 1 }).filter(c => c.t <= now);
    onsets = confirmed.map(c => ({ t: c.t, status: 'confirmed', stations: c.stations }));
    lastOnset = onsets.length ? onsets[onsets.length - 1] : null;
    phase = classifyPhase(lastOnset ? (now - lastOnset.t) / MIN : Infinity, ekl, minutesSouthward);
  }
  const minutesSince = lastOnset ? (now - lastOnset.t) / MIN : Infinity;
  const since = lastOnset ? lastOnset.t : now - 180 * MIN;
  const loaded = drive.filter(d => d.t > since && d.t <= now && Number.isFinite(d.power)).reduce((s, d) => s + d.power, 0); // per-minute samples
  const future = drive.filter(d => d.t > now && Number.isFinite(d.power));
  const powerFuture = future.length ? future.reduce((s, d) => s + d.power, 0) / future.length : powerRecent;

  const ilNow = chain?.latest ? chain.latest.il : NaN;
  return {
    phase, phaseFactor: PHASE_FACTOR[phase], lastOnset, minutesSinceOnset: minutesSince, onsets, method, stations: perStation,
    // without a known onset the loading start is assumed (3 h ago), so the store's fill would be a constant: unknown
    ekl, eklHour, minutesSouthward, loaded, powerRecent, loadFraction: lastOnset && powerRecent > 0 ? loaded / (162 * powerRecent) : NaN,
    chain: chain ? { index: chain.index, baseline: chain.baseline, deviations: chain.deviations, profile: chain.profile, centre: chain.centre, latest: chain.latest, stations: chain.deviations.length } : null,
    ilNow, ilClass: ilClass(ilNow), ilMin: phaseInfo ? phaseInfo.ilMin : NaN, tMin: phaseInfo ? phaseInfo.tMin : NaN,
    pOnset30: onsetProbability(loaded, powerRecent, powerFuture, 30, { ekl }),
    pOnset60: onsetProbability(loaded, powerRecent, powerFuture, 60, { ekl }),
    pOnset120: onsetProbability(loaded, powerRecent, powerFuture, 120, { ekl }),
  };
}

/**
 * Expansion and recovery intervals for chart shading: [{start, end, kind}] from the onset list
 * (expansion until the deepest point, recovery for the median 31 minutes after it, both cut at
 * the next onset and at `now`).
 */
export function phaseIntervals(onsets, now) {
  const out = [];
  onsets.forEach((o, i) => {
    const next = onsets[i + 1] ? onsets[i + 1].t : Infinity;
    const tMin = Number.isFinite(o.tMin) && o.tMin > o.t ? o.tMin : o.t + PHASE.expansion * MIN;
    const e1 = Math.min(tMin, next, now);
    if (e1 > o.t) out.push({ start: o.t, end: e1, kind: 'expansion' });
    const r1 = Math.min(e1 + PHASE.recovery * MIN, next, now);
    if (r1 > e1) out.push({ start: e1, end: r1, kind: 'recovery' });
  });
  return out;
}

// ---------------------------------------------------------------------------------
// Where and when substorms start, and how far an expansion reaches. Constants are
// referenced in research/substorms_auroral_zone.md.

export const ONSET_CLIMATOLOGY = {
  // Onset local time: median 23.0 MLT over 2437 IMAGE FUV onsets (Frey et al. 2004); the spread is 1.35 h
  // (Frey & Mende 2006) to 1.1 h (Liou 2010, Polar UVI); the central 80 % fall between about 21:05 and 00:40 MLT.
  mltMean: 23.0,
  mltSd: 1.3,
  // Onset latitude in darkness follows the merging electric field: MLAT = 73 - 5.2 sqrt(Em), Em in mV/m averaged
  // over the hour before onset (Wang et al. 2005, R = 0.57; confirmed by Wang et al. 2007 on 4192 onsets). The
  // total spread is 2.2 to 2.9 degrees (Liou 2010; Frey & Mende 2006); after the regression about 2 remain.
  mlatIntercept: 73, mlatSlope: 5.2, emMax: 6,
  mlatSd: 2.0,
  mlatOffset: 1.0,    // fallback without solar wind: just poleward of Starkov's discrete-oval edge for the Kp level
  mlatCap: 70.0,      // quietest onsets reach about 73 deg (Wang 2005); the Kp fallback is capped lower
  // Reach of the expansion relative to the onset point, in hours of MLT (negative = west, the surge direction) and
  // degrees of latitude (positive = poleward, the bulge direction). "Full" is where an observer has the active
  // display in the sky, "zero" where it has dropped to the horizon. Bulges expand about equally west and east
  // (Gjerloev et al. 2007), the current wedge ends up about 6 h of MLT wide (Kepko et al. 2015, Kullen et al. 2009),
  // and the electron aurora expands 3.5 deg poleward in 5 min and 5.5 deg within an hour on average (Mende et al.
  // 2003), several times more in large events (Akasofu 2021). Equatorward the onset arc moves little (1-2 deg).
  reach: { westFull: 1.5, westZero: 3.2, eastFull: 1.5, eastZero: 3.0, equatorFull: 1.5, equatorZero: 4.0, poleFull: 5.0, poleZero: 8.5 },
};

/** Density of onset local time (per hour) on the 24-hour circle. */
export function onsetMltDensity(mlt, c = ONSET_CLIMATOLOGY) {
  let d = ((mlt - c.mltMean) % 24 + 36) % 24 - 12;
  return Math.exp(-0.5 * (d / c.mltSd) ** 2) / (c.mltSd * Math.sqrt(2 * Math.PI));
}

/**
 * Expected onset latitude. With the merging electric field of the last hour (em, mV/m) the Wang et al. (2005)
 * darkness regression is used; without it, the Kp-driven Starkov discrete-oval edge plus an offset.
 */
export function expectedOnsetMlat(kp, mlt, c = ONSET_CLIMATOLOGY, em = NaN) {
  if (Number.isFinite(em)) return c.mlatIntercept - c.mlatSlope * Math.sqrt(Math.min(Math.max(em, 0), c.emMax));
  const k = Math.min(Math.max(Number.isFinite(kp) ? kp : 2, 0), 7);
  return Math.min(c.mlatCap, starkovBoundary(k, Number.isFinite(mlt) ? mlt : 23, 'oval') + c.mlatOffset);
}

function trapezoid(v, negZero, negFull, posFull, posZero) {
  if (v >= -negFull && v <= posFull) return 1;
  if (v < -negZero || v > posZero) return 0;
  return v < 0 ? (v + negZero) / (negZero - negFull) : (posZero - v) / (posZero - posFull);
}

/**
 * Fraction of an expansion an observer gets to see, given the observer's offset from the onset
 * point: dMlt in hours (positive = observer east of the onset meridian), dMlat in degrees
 * (positive = observer poleward of the onset arc). 1 = the bulge passes through the observer's sky.
 */
export function reachFactor(dMlt, dMlat, c = ONSET_CLIMATOLOGY) {
  const r = c.reach;
  return trapezoid(dMlt, r.westZero, r.westFull, r.eastFull, r.eastZero) * trapezoid(dMlat, r.equatorZero, r.equatorFull, r.poleFull, r.poleZero);
}

/**
 * Probability that a substorm starting somewhere in the night sector puts its expansion in the
 * observer's sky: the reach factor integrated over the onset local-time and latitude climatology.
 */
export function localReach(observerMlt, observerMlat, onsetMlat, c = ONSET_CLIMATOLOGY) {
  if (!Number.isFinite(observerMlt) || !Number.isFinite(observerMlat) || !Number.isFinite(onsetMlat)) return NaN;
  const dm = 0.25, dl = 0.5;
  let sum = 0, weight = 0;
  for (let m = c.mltMean - 3.5 * c.mltSd; m <= c.mltMean + 3.5 * c.mltSd + 1e-9; m += dm) {
    const fm = onsetMltDensity(m, c) * dm;
    const dMlt = ((observerMlt - m) % 24 + 36) % 24 - 12;
    for (let l = onsetMlat - 3 * c.mlatSd; l <= onsetMlat + 3 * c.mlatSd + 1e-9; l += dl) {
      const fl = Math.exp(-0.5 * ((l - onsetMlat) / c.mlatSd) ** 2) * dl;
      const w = fm * fl;
      weight += w;
      sum += w * reachFactor(dMlt, observerMlat - l, c);
    }
  }
  return weight > 0 ? sum / weight : NaN;
}

/**
 * Longitude-only version of localReach: the chance that an onset somewhere in the night sector
 * activates the observer's local-time sector at all, regardless of latitude. Used to scale the
 * onset hazard in the visibility model, where latitude is already handled by the oval geometry.
 */
export function localReachMlt(observerMlt, c = ONSET_CLIMATOLOGY) {
  if (!Number.isFinite(observerMlt)) return NaN;
  const r = c.reach, dm = 0.25;
  let sum = 0, weight = 0;
  for (let m = c.mltMean - 3.5 * c.mltSd; m <= c.mltMean + 3.5 * c.mltSd + 1e-9; m += dm) {
    const fm = onsetMltDensity(m, c) * dm;
    const dMlt = ((observerMlt - m) % 24 + 36) % 24 - 12;
    weight += fm; sum += fm * trapezoid(dMlt, r.westZero, r.westFull, r.eastFull, r.eastZero);
  }
  return weight > 0 ? sum / weight : NaN;
}

/** Whether the chain's longitude sector is the observer's: MLT part of the reach kernel for the chain offset. */
export function chainReachMlt(chainOffsetHours, c = ONSET_CLIMATOLOGY) {
  const r = c.reach;
  return trapezoid(chainOffsetHours, r.westZero, r.westFull, r.eastFull, r.eastZero);
}

/**
 * The next interval when the observer's MLT is within `halfWidth` hours of the onset peak
 * (the "prime time" for a breakup overhead): {start, end, peak, active} in ms, searched from
 * 4 hours ago to 26 hours ahead. mag: MagneticCoordinates, mlon: observer magnetic longitude.
 */
export function primeWindow(mag, mlon, now, { halfWidth = 1.5, c = ONSET_CLIMATOLOGY } = {}) {
  const step = 5 * MIN; let start = null, end = null, peak = null, best = Infinity;
  for (let t = now - 4 * 3600e3; t <= now + 26 * 3600e3; t += step) {
    const d = ((mag.mlt(mlon, new Date(t)) - c.mltMean) % 24 + 36) % 24 - 12;
    const inside = Math.abs(d) <= halfWidth;
    if (inside && start === null) { start = t; best = Infinity; }
    if (inside && Math.abs(d) < best) { best = Math.abs(d); peak = t; }
    if (!inside && start !== null) { end = t; if (end >= now) break; start = null; end = null; peak = null; }
  }
  if (start === null) return null;
  if (end === null) end = now + 26 * 3600e3;
  return { start, end, peak, active: now >= start && now <= end };
}

/** Observer regime from magnetic latitude: where substorms are the whole story, part of it, or a bonus. */
export function latitudeRegime(mlat) {
  if (mlat >= 63) return 'auroral';
  if (mlat >= 58) return 'subauroral';
  return 'midlatitude';
}

/**
 * Expected peak of the chain index for the next substorm from the recent driving. Substorm intensity
 * scales linearly with the dayside reconnection field (Li et al. 2013); the line is anchored so that mean
 * driving (dPhi/dt 4421) gives the -350 nT of an average isolated substorm and strong storm-time driving
 * (about 13 000) the -670 nT of storm-time events (Tanskanen et al. 2002). Returns {il, class}.
 */
export function expectedSubstormSize(couplingRecent) {
  if (!Number.isFinite(couplingRecent)) return { il: NaN, class: 'unknown' };
  const il = -(185 + 0.0373 * couplingRecent);
  return { il, class: ilClass(il) };
}

/**
 * Observer-specific substorm outlook.
 * inputs: {sub (substormState), observer:{mlat, mlon}, mag, now, kp (current activity level), ovation (parsed grid or null),
 *          couplingRecent (mean Newell coupling over the last hour), horizons (minutes), chainMlon (magnetic longitude of the chain)}
 */
export function substormOutlook({ sub, observer, mag, now, kp, ovation = null, couplingRecent = NaN, horizons = [10, 30, 60, 90, 120], chainMlon = 103.5 }) {
  const mltNow = mag.mlt(observer.mlon, new Date(now));
  const chainMlt = mag.mlt(chainMlon, new Date(now));
  const chainOffset = ((mltNow - chainMlt) % 24 + 36) % 24 - 12; // hours; negative = observer west of the chain
  const regime = latitudeRegime(observer.mlat);
  const em = sub && Number.isFinite(sub.eklHour) ? sub.eklHour : NaN;
  const onsetMlat = expectedOnsetMlat(kp, mltNow, ONSET_CLIMATOLOGY, em);
  const reachNow = localReach(mltNow, observer.mlat, onsetMlat);
  const centre = sub?.chain?.centre || null;
  // reach of the substorm that is (or was last) in progress at the chain's longitude
  const currentReach = centre ? reachFactor(chainOffset, observer.mlat - centre.mlat) : reachFactor(chainOffset, observer.mlat - onsetMlat);
  const rows = horizons.map(h => {
    const T = now + h * MIN; const mlt = mag.mlt(observer.mlon, new Date(T));
    const reach = localReach(mlt, observer.mlat, expectedOnsetMlat(kp, mlt, ONSET_CLIMATOLOGY, em));
    const reachMlt = localReachMlt(mlt);
    const pOnset = sub ? onsetProbability(sub.loaded, sub.powerRecent, sub.powerRecent, h, { ekl: sub.ekl }) : NaN;
    return { h, t: T, mlt, reach, reachMlt, pOnset, pOnsetLocal: Number.isFinite(pOnset) && Number.isFinite(reach) ? pOnset * reach : NaN, pOnsetSector: Number.isFinite(pOnset) && Number.isFinite(reachMlt) ? pOnset * reachMlt : NaN };
  });
  const prime = primeWindow(mag, observer.mlon, now);
  const oval = ovation ? ovalBand(ovation, mltNow, 1.0, observer.mlat) : null;
  const local = sub?.chain?.profile?.length ? deflectionAt(sub.chain.profile, observer.mlat) : null;
  const nearest = sub?.stations?.length ? sub.stations.reduce((a, b) => (Math.abs(b.mlat - observer.mlat) < Math.abs(a.mlat - observer.mlat) ? b : a)) : null;
  const activity = { il: sub?.ilNow ?? NaN, class: sub?.ilClass || 'unknown', station: sub?.chain?.latest?.ilStation || null, localDx: local ? local.dx : NaN, localStation: local ? local.station : null, localExtrapolated: local ? local.extrapolated : true,
    rate: nearest ? nearest.rate : NaN, rateThreshold: nearest ? nearest.rateThreshold : NaN, rateStation: nearest ? nearest.station : null, rateT: nearest ? nearest.rateT : NaN };
  const intensity = expectedSubstormSize(couplingRecent);
  const text = outlookText({ regime, sub, observer, mltNow, onsetMlat, centre, currentReach, rows, prime, oval, activity, intensity, chainOffset, now });
  return { regime, mltNow, chainMlt, chainOffset, chainReachMlt: chainReachMlt(chainOffset), onsetMlat, onsetMlatFrom: Number.isFinite(em) ? 'merging-field' : 'kp', em, reachNow, currentReach, horizons: rows, prime, oval, activity, intensity, centre, ...text };
}

const pct = (p) => `${Math.round(p * 100)}%`;
const hm = (t) => new Date(t).toISOString().slice(11, 16);

function outlookText({ regime, sub, observer, mltNow, onsetMlat, centre, currentReach, rows, prime, oval, activity, intensity, chainOffset, now }) {
  const at = (h) => rows.find(r => r.h === h) || rows[rows.length - 1];
  const r60 = at(60), r30 = at(30);
  const phase = sub?.phase || 'unknown';
  const il = activity.il;
  const where = centre
    ? (centre.beyond ? `electrojet ${centre.beyond === 'poleward' ? 'north of the whole chain' : 'south of the whole chain'}` : `electrojet centred at ${centre.mlat.toFixed(1)}°, ${Math.abs(observer.mlat - centre.mlat).toFixed(1)}° ${centre.mlat < observer.mlat ? 'south' : 'north'} of you`)
    : 'no electrojet located';
  const onsetWhere = `${onsetMlat.toFixed(1)}° (${Math.abs(observer.mlat - onsetMlat).toFixed(1)}° ${onsetMlat < observer.mlat ? 'south' : 'north'} of you)`;
  const chance = Number.isFinite(r60?.pOnsetLocal) ? `Chance of a new onset in your sky: ${pct(r30.pOnsetLocal)} within 30 min, ${pct(r60.pOnsetLocal)} within an hour (any onset: ${pct(r30.pOnset)} / ${pct(r60.pOnset)}).` : 'Onset chance unknown without solar wind data.';
  const primeTxt = prime ? (prime.active ? `You are in the prime onset window (until ${hm(prime.end)} UTC).` : `Prime onset window ${hm(prime.start)}–${hm(prime.end)} UTC${prime.start > now ? `, in ${((prime.start - now) / 3600e3).toFixed(1)} h` : ''}.`) : '';
  let headline, tone, detail;
  if (regime === 'midlatitude') {
    headline = `Substorms reach ${observer.mlat.toFixed(0)}° only inside a storm`;
    tone = 'info';
    detail = `At your latitude the oval has to expand to about ${(observer.mlat + 8).toFixed(0)}° before a substorm matters; the panel above tracks that. The Finnish chain (${chainOffset < 0 ? `${(-chainOffset).toFixed(1)} h east` : `${chainOffset.toFixed(1)} h west`} of you) is now ${phase}${Number.isFinite(il) ? `, IL ${il.toFixed(0)} nT` : ''}.`;
    return { headline, tone, detail };
  }
  const near = Number.isFinite(il) ? `IL ${il.toFixed(0)} nT (${activity.class})` : 'no chain data';
  if (!sub) {
    return { headline: 'No magnetometer data: climatology only', tone: 'info', detail: `Without the Finnish chain the phase is unknown. The breakup would start near ${onsetWhere}. ${primeTxt}` };
  }
  if ((phase === 'expansion' || phase === 'recovery') && Number.isFinite(il) && il <= -170) {
    const strong = il <= -300;
    headline = phase === 'expansion' ? `${strong ? 'Strong' : 'Active'} substorm in progress` : 'Substorm recovery: activity continuing';
    tone = currentReach >= 0.5 ? 'good' : 'maybe';
    detail = `${near}, ${where}: ${currentReach >= 0.5 ? 'bright, moving aurora should be in your sky now' : currentReach > 0 ? 'the active region is at the edge of your sky' : 'the active region is outside your sky'}. ${phase === 'recovery' ? 'Expect patchy and pulsating forms; ' : ''}${chance}`;
  } else if (phase === 'growth') {
    headline = 'Growth phase: loading, onset likely';
    tone = Number.isFinite(r60?.pOnsetLocal) && r60.pOnsetLocal >= 0.3 ? 'good' : 'maybe';
    detail = `Southward IMF for ${sub.minutesSouthward} min, merging field ${sub.ekl.toFixed(1)} mV/m, tail store at ${pct(Math.min(1.5, sub.loadFraction))} of its usual release level. A quiet arc is likely now; the breakup would start near ${onsetWhere}. ${chance} ${primeTxt}`;
  } else if (phase === 'expansion' || phase === 'recovery') {
    headline = `Weak substorm: ${near}`;
    tone = 'maybe';
    detail = `${where[0].toUpperCase()}${where.slice(1)}. Faint to moderate forms; ${chance} ${primeTxt}`;
  } else {
    headline = Number.isFinite(il) && il <= -50 ? `Quiet, some current: ${near}` : 'Quiet: no substorm activity';
    tone = 'low';
    detail = `${sub && Number.isFinite(sub.ekl) ? `Merging field ${sub.ekl.toFixed(1)} mV/m. ` : ''}A faint arc at most until an onset. ${chance} ${primeTxt}`;
  }
  if (Number.isFinite(activity.rate) && Number.isFinite(activity.rateThreshold)) detail += ` Field change at ${activity.rateStation}: ${activity.rate.toFixed(2)} nT/s, ${activity.rate >= activity.rateThreshold ? 'above' : 'below'} FMI's ${activity.rateThreshold.toFixed(2)} nT/s aurora threshold.`;
  if (oval && oval.position === 'poleward') detail += ` The modeled oval lies south of you (edge ${oval.offset.toFixed(1)}° south): look towards the southern horizon.`;
  else if (oval && oval.position === 'equatorward') detail += ` The modeled oval lies ${oval.offset.toFixed(1)}° north of you; an expansion pushes it 1–3° closer.`;
  else if (oval && oval.position === 'inside') detail += ` The modeled oval is overhead (${oval.equatorward.toFixed(1)}–${oval.poleward.toFixed(1)}°, brightest at ${oval.peakMlat.toFixed(1)}°).`;
  if (intensity.class !== 'unknown') detail += ` Expected size of the next substorm at this driving: ${intensity.class} (about ${Math.abs(intensity.il).toFixed(0)} nT).`;
  return { headline, tone, detail };
}
