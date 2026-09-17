// Substorm detection from ground magnetometers and an onset hazard from the
// minimal substorm model (Freeman & Morley 2004).

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
 * stations: [{station, mlat, series:{t,x,y,z}}] (raw 10 s or 1 min)
 * drive: ascending [{t, power, ekl, bz}] on Earth-arrival time, covering the last several hours
 * now: ms
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
    perStation.push({ station: s.station, mlat: s.mlat, onsets, baseline: base, bay: recent.length ? Math.min(...recent) : NaN,
      latest: minute.t.length ? minute.t[minute.t.length - 1] : null, current: dev.length ? dev[dev.length - 1] : NaN });
  }
  const confirmed = confirmOnsets(perStation, { minStations: perStation.length >= 2 ? 2 : 1 }).filter(c => c.t <= now);
  const lastOnset = confirmed.length ? confirmed[confirmed.length - 1] : null;
  const minutesSince = lastOnset ? (now - lastOnset.t) / MIN : Infinity;

  // driving statistics
  const recent = drive.filter(d => d.t <= now && d.t >= now - 180 * MIN && Number.isFinite(d.power));
  const powerRecent = recent.length ? recent.reduce((s, d) => s + d.power, 0) / recent.length : NaN;
  const lastDrive = drive.filter(d => d.t <= now && Number.isFinite(d.ekl)).slice(-15);
  const ekl = lastDrive.length ? lastDrive.reduce((s, d) => s + d.ekl, 0) / lastDrive.length : NaN;
  let minutesSouthward = 0;
  for (let i = drive.length - 1; i >= 0; i--) { if (drive[i].t > now) continue; if (drive[i].bz < 0) minutesSouthward++; else break; }
  const since = lastOnset ? lastOnset.t : now - 180 * MIN;
  const loaded = drive.filter(d => d.t > since && d.t <= now && Number.isFinite(d.power)).reduce((s, d) => s + d.power, 0); // per-minute samples
  const future = drive.filter(d => d.t > now && Number.isFinite(d.power));
  const powerFuture = future.length ? future.reduce((s, d) => s + d.power, 0) / future.length : powerRecent;

  const phase = classifyPhase(minutesSince, ekl, minutesSouthward);
  return {
    phase, phaseFactor: PHASE_FACTOR[phase], lastOnset, minutesSinceOnset: minutesSince, stations: perStation,
    ekl, minutesSouthward, loaded, powerRecent,
    pOnset30: onsetProbability(loaded, powerRecent, powerFuture, 30, { ekl }),
    pOnset60: onsetProbability(loaded, powerRecent, powerFuture, 60, { ekl }),
    pOnset120: onsetProbability(loaded, powerRecent, powerFuture, 120, { ekl }),
  };
}
