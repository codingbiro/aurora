// Short-term (10 to 120 minute) forecast for one observer.
import { weightedRecentAverage, meanBetween, analogEnsemble, climatologyEnsemble, quantile, lowerBound, mulberry32, gaussian } from './integrate.mjs';
import { kpFromDriving, hp30FromDriving, blend } from './activity.mjs';
import { equatorwardBoundary, boundaryForKp, visibilityClass, VIEW_ALLOWANCE_DEG } from './oval.mjs';
import { PHASE_FACTOR, onsetProbability } from './substorm.mjs';

const MIN = 60e3, HOUR = 3600e3;
export const DEFAULT_HORIZONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

/**
 * inputs: {now, propagated, ovation, kp1m, geospaceKp, hp30, hpoForecast, observer:{mlat, mlon},
 *          mag (MagneticCoordinates), substorm, coefficients, horizons}
 */
export function shortTermForecast(inputs) {
  const { now, propagated = [], ovation = null, geospaceKp = [], hpoForecast = [], observer, mag, substorm = null, coefficients = null } = inputs;
  const horizons = inputs.horizons || DEFAULT_HORIZONS;
  const known = propagated.filter(r => Number.isFinite(r.coupling));
  if (known.length < 60) return { ok: false, reason: 'not enough propagated solar wind data' };
  const tLast = known[known.length - 1].t;
  const leadMin = (tLast - now) / MIN;
  const lastRec = known[known.length - 1];

  // Ensemble of future coupling beyond the last measured arrival time (1-minute steps).
  const futureTimes = [];
  for (let t = Math.floor(tLast / MIN) * MIN + MIN; t <= now + horizons[horizons.length - 1] * MIN + MIN; t += MIN) futureTimes.push(t);
  const nAnalog = 100, nClim = coefficients?.extrapolation ? 100 : 0;
  const ens = futureTimes.length ? analogEnsemble(known, tLast, futureTimes, { members: nAnalog }) : { members: [], central: [] };
  const lagsMin = futureTimes.map(t => (t - tLast) / MIN);
  const clim = futureTimes.length && nClim ? climatologyEnsemble(lastRec.coupling, coefficients.extrapolation, lagsMin, { members: nClim }) : [];
  const members = ens.members.length || clim.length ? [...ens.members, ...clim] : [futureTimes.map(() => lastRec.coupling)];
  if (members.length > 1) { ens.central = futureTimes.map((_, i) => quantile(members.map(p => p[i]), 0.5)); ens.quantiles = { p10: futureTimes.map((_, i) => quantile(members.map(p => p[i]), 0.1)), p90: futureTimes.map((_, i) => quantile(members.map(p => p[i]), 0.9)) }; }
  // observed anchors for the persistence blend
  const kpObsLast = (inputs.kp1m || []).filter(r => Number.isFinite(r.kp) && r.t <= now + MIN).slice(-1)[0] || null;
  const hp30Last = (inputs.hp30 || []).filter(r => Number.isFinite(r.value) && r.t <= now).slice(-1)[0] || null;
  const anchor = hp30Last && now - (hp30Last.t + 30 * MIN) < 45 * MIN ? { value: hp30Last.value, ageMin: (now - (hp30Last.t + 30 * MIN)) / MIN, source: 'gfz-hp30' }
    : kpObsLast && now - kpObsLast.t < 30 * MIN ? { value: kpObsLast.kp, ageMin: (now - kpObsLast.t) / MIN, source: 'noaa-est-kp' } : null;
  const noise = mulberry32(11);

  // Hourly means combining known data and one member's extrapolated path.
  const knownStats = (t0, t1) => {
    const i0 = lowerBound(known, t0); let s = 0, n = 0;
    for (let i = i0; i < known.length && known[i].t < t1; i++) { s += known[i].coupling; n++; }
    return { s, n };
  };
  const extStats = (path, t0, t1) => {
    let s = 0, n = 0;
    const j0 = Math.max(0, Math.ceil((t0 - futureTimes[0]) / MIN));
    for (let j = j0; j < futureTimes.length && futureTimes[j] < t1; j++) { s += path[j]; n++; }
    return { s, n };
  };
  const weights = [1, 0.65, 0.4225, 0.274625];
  const avgForMember = (path, T) => {
    let num = 0, den = 0, used = 0;
    for (let k = 0; k < 4; k++) {
      const t0 = T - (k + 1) * HOUR, t1 = T - k * HOUR;
      const a = knownStats(t0, Math.min(t1, tLast + MIN)), b = t1 > tLast ? extStats(path, Math.max(t0, tLast + MIN), t1) : { s: 0, n: 0 };
      const n = a.n + b.n; if (!n) continue;
      num += weights[k] * (a.s + b.s) / n; den += weights[k]; used++;
    }
    return used >= 2 ? num / den : NaN;
  };
  const viscousNow = meanBetween(known, tLast - HOUR, tLast + MIN, 'viscous');
  const viscousAvg = (T) => {
    const a = weightedRecentAverage(known, Math.min(T, tLast + MIN), 'viscous', { minHours: 1 }).value;
    return Number.isFinite(a) ? a : viscousNow;
  };

  // Current state (driving integrated to now)
  const drivingNow = weightedRecentAverage(known, Math.min(now, tLast + MIN), 'coupling', { minHours: 2 }).value;
  const kpNow = kpFromDriving(drivingNow, viscousAvg(now));
  const hp30Coefs = coefficients?.hp30 || null, stormCoefs = coefficients?.hp30_storm || null;

  const rows = [];
  for (const h of horizons) {
    const T = now + h * MIN;
    const mlt = mag.mlt(observer.mlon, new Date(T));
    const couplingMembers = members.map(p => { const j = Math.round((T - futureTimes[0]) / MIN); return T <= tLast ? couplingAt(known, T) : p[Math.min(Math.max(j, 0), p.length - 1)]; });
    const drivingMembers = members.map(p => avgForMember(p, T));
    const visc = viscousAvg(T);
    let kpMembers = drivingMembers.map(d => hp30FromDriving(d, visc, hp30Coefs, stormCoefs));
    const hpMembers = kpMembers.slice();
    const kpCentralRaw = quantile(kpMembers, 0.5);

    // Blend the ensemble centre with independent model forecasts and shift members accordingly.
    const geo = valueAt(geospaceKp, T, 10 * MIN);
    const hpo = valueAt(hpoForecast.map(r => ({ t: r.t, kp: r.median })), T, 20 * MIN);
    const blended = blend([
      { value: kpCentralRaw, weight: 1, source: 'coupling' },
      { value: geo, weight: T <= tLast + 15 * MIN ? 0.8 : 0.4, source: 'noaa-geospace' },
      { value: hpo, weight: 0.5, source: 'gfz-hpo' },
    ]);
    // Persistence anchor: at short lead the last observed index beats any model (calibration: RMSE 0.62 vs 0.75
    // at 30 min), so pull the centre toward it with a weight that decays with horizon plus data age.
    let centre = Number.isFinite(blended.value) ? blended.value : kpCentralRaw;
    let wPersist = 0;
    if (anchor) { wPersist = 0.85 * Math.exp(-(h + anchor.ageMin) / 60); centre = (1 - wPersist) * centre + wPersist * anchor.value; }
    const shift = centre - kpCentralRaw;
    // Mapping error of the index regression (sigma 0.75 in calibration), smaller where the anchor still holds.
    const sigmaMap = (coefficients?.hp30?.sigma || 0.75) * (0.55 + 0.45 * Math.min(1, h / 120)) * (1 - 0.5 * wPersist);
    kpMembers = kpMembers.map(k => Math.min(9, Math.max(0, k + shift + sigmaMap * gaussian(noise))));

    // Oval boundary at this MLT, per member.
    let ovBoundary = null;
    if (ovation && h <= 70) {
      const b = equatorwardBoundary(ovation, mlt, 1.0);
      ovBoundary = Number.isFinite(b.mlat) ? b : null;
    }
    const kpBoundaries = kpMembers.map(k => boundaryForKp(k, mlt));
    const boundaries = kpBoundaries.map(b => ovBoundary ? 0.6 * (ovBoundary.atEdge ? Math.min(ovBoundary.mlat, b) : ovBoundary.mlat) + 0.4 * b : b);
    const margins = boundaries.map(b => b - observer.mlat);
    const pHorizon = margins.filter(m => m <= VIEW_ALLOWANCE_DEG).length / margins.length;
    const pOverhead = margins.filter(m => m <= 0).length / margins.length;

    // Substorm phase evolution and onset chance over the horizon.
    const factor = phaseFactorAt(substorm, h);
    rows.push({
      h, t: T, mlt, leadCovered: T <= tLast,
      coupling: { median: quantile(couplingMembers, 0.5), p10: quantile(couplingMembers, 0.1), p90: quantile(couplingMembers, 0.9) },
      driving: { median: quantile(drivingMembers, 0.5), p10: quantile(drivingMembers, 0.1), p90: quantile(drivingMembers, 0.9) },
      kp: { median: quantile(kpMembers, 0.5), p10: quantile(kpMembers, 0.1), p90: quantile(kpMembers, 0.9), sources: [...blended.sources, ...(anchor && wPersist > 0.05 ? [anchor.source] : [])], geospace: geo, gfz: hpo, anchorWeight: wPersist },
      hp30: { median: quantile(hpMembers, 0.5) + shift },
      boundary: { median: quantile(boundaries, 0.5), p10: quantile(boundaries, 0.1), p90: quantile(boundaries, 0.9), ovation: ovBoundary ? ovBoundary.mlat : null, ovationAtEdge: !!ovBoundary?.atEdge },
      margin: quantile(margins, 0.5), visibility: visibilityClass(quantile(margins, 0.5)),
      pHorizon, pOverhead, phaseFactor: factor.factor, pOnset: factor.pOnset,
      pVisible: Math.min(1, pHorizon * factor.factor), pVisibleOverhead: Math.min(1, pOverhead * factor.factor),
    });
  }

  const mltNow = mag.mlt(observer.mlon, new Date(now));
  const ovNow = ovation ? equatorwardBoundary(ovation, mltNow, 1.0) : null;
  const marginNow = ovNow && Number.isFinite(ovNow.mlat) ? ovNow.mlat - observer.mlat : NaN;
  const ovFaint = ovNow && !Number.isFinite(ovNow.mlat) ? ovNow.peakFlux : NaN;
  return {
    ok: true, now, tLast, leadMin, mltNow,
    current: { drivingNow, kpNow, coupling: lastRec.coupling, bz: lastRec.bz, bt: lastRec.bt, speed: lastRec.speed, density: lastRec.density, ekl: lastRec.ekl,
      ovationBoundary: ovNow && Number.isFinite(ovNow.mlat) ? ovNow.mlat : NaN, ovationAtEdge: !!ovNow?.atEdge, margin: marginNow, visibility: visibilityClass(marginNow),
      phase: substorm?.phase || 'unknown' },
    horizons: rows,
    ensemble: { times: futureTimes, central: ens.central, quantiles: ens.quantiles, members: members.length, analog: ens.members.length, climatology: clim.length }, anchor,
    verdict: verdict(rows, marginNow, substorm, ovFaint, mltNow),
  };
}

function couplingAt(series, T) {
  const i = lowerBound(series, T);
  const r = series[Math.min(i, series.length - 1)];
  return r ? r.coupling : NaN;
}

/** Value of a [{t, kp}] series nearest to T within a tolerance, else NaN. */
export function valueAt(series, T, tolMs) {
  if (!series || !series.length) return NaN;
  let best = null;
  for (const r of series) { if (!Number.isFinite(r.kp)) continue; const d = Math.abs(r.t - T); if (d <= tolMs && (!best || d < best.d)) best = { d, v: r.kp }; }
  return best ? best.v : NaN;
}

/**
 * Expected phase factor h minutes ahead: the current phase evolves (expansion -> recovery
 * after 15 min -> quiet after 45 min) and a new onset may occur with probability pOnset(h),
 * which resets the factor to the expansion value.
 */
export function phaseFactorAt(substorm, h) {
  if (!substorm || !substorm.phase || substorm.phase === 'unknown') return { factor: 0.55, pOnset: NaN }; // no magnetometer: climatological middle
  const since = (Number.isFinite(substorm.minutesSinceOnset) ? substorm.minutesSinceOnset : 1e6) + h;
  let base;
  if (since <= 15) base = PHASE_FACTOR.expansion;
  else if (since <= 45) base = PHASE_FACTOR.recovery;
  else base = substorm.phase === 'growth' || (substorm.ekl >= 0.6) ? PHASE_FACTOR.growth : PHASE_FACTOR.quiet;
  const pOn = onsetProbability(substorm.loaded, substorm.powerRecent, substorm.powerRecent, h, { ekl: substorm.ekl });
  const p = Number.isFinite(pOn) ? pOn : 0;
  return { factor: (1 - p) * base + p * PHASE_FACTOR.expansion, pOnset: pOn };
}

function verdict(rows, marginNow, substorm, ovFaint, mltNow) {
  const at = (h) => rows.find(r => r.h === h) || rows[rows.length - 1];
  const r30 = at(30), r60 = at(60), r120 = at(120);
  const best = rows.reduce((a, b) => (b.pVisible > a.pVisible ? b : a), rows[0]);
  const pct = (p) => `${Math.round(p * 100)}%`;
  let headline, tone;
  if (best.pVisible >= 0.6) { headline = `Good chance: ${pct(best.pVisible)} around +${best.h} min`; tone = 'good'; }
  else if (best.pVisible >= 0.3) { headline = `Possible: ${pct(best.pVisible)} around +${best.h} min`; tone = 'maybe'; }
  else if (best.pVisible >= 0.1) { headline = `Unlikely: at most ${pct(best.pVisible)} in the next two hours`; tone = 'low'; }
  else { headline = 'No aurora expected here in the next two hours'; tone = 'none'; }
  const geometry = Number.isFinite(marginNow)
    ? (marginNow <= 0 ? 'The modeled oval already reaches overhead.' : marginNow <= VIEW_ALLOWANCE_DEG ? `Oval edge ${marginNow.toFixed(1)} deg north of you: low on the northern horizon.` : `Oval edge ${marginNow.toFixed(1)} deg north of you, out of view.`)
    : Number.isFinite(ovFaint) ? `OVATION shows only faint aurora at your local time (${mltNow.toFixed(1)} h MLT, peak ${ovFaint.toFixed(2)} erg cm⁻² s⁻¹).` : 'Oval position unknown.';
  const phase = substorm?.phase ? `Substorm phase: ${substorm.phase}.` : 'No magnetometer data for substorm phase.';
  return { headline, tone, detail: `${geometry} ${phase}`, p30: r30?.pVisible, p60: r60?.pVisible, p120: r120?.pVisible, bestH: best.h };
}
