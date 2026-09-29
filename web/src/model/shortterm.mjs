// Short-term (10 to 120 minute) forecast for one observer.
import { weightedRecentAverage, meanBetween, analogEnsemble, climatologyEnsemble, quantile, lowerBound, mulberry32, gaussian } from './integrate.mjs';
import { hp30FromDriving, blend } from './activity.mjs';
import { equatorwardBoundary, boundaryForKp, visibilityClass, VIEW_ALLOWANCE_DEG, TIERS, TIER_ORDER, dstBoundary, dstWeight } from './oval.mjs';
import { PHASE_FACTOR, onsetProbability, latitudeRegime, localReachMlt } from './substorm.mjs';

const MIN = 60e3, HOUR = 3600e3;
export const DEFAULT_HORIZONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

/** Linear interpolation on a small table, clamped at the ends. */
function interp(xs, ys, x) {
  if (!xs || !xs.length) return NaN;
  if (x <= xs[0]) return ys[0];
  for (let i = 0; i + 1 < xs.length; i++) if (x <= xs[i + 1]) { const f = (x - xs[i]) / (xs[i + 1] - xs[i]); return ys[i] + f * (ys[i + 1] - ys[i]); }
  return ys[ys.length - 1];
}

/**
 * inputs: {now, propagated, ovation, kp1m, geospaceKp, hp30, hpoForecast, observer:{mlat, mlon},
 *          mag (MagneticCoordinates), substorm, outlook, coefficients, horizons,
 *          dst (latest observed Dst, nT), local ({tier, ageMin} from the local ground signals), regime}
 */
export function shortTermForecast(inputs) {
  const { now, propagated = [], ovation = null, geospaceKp = [], hpoForecast = [], observer, mag, substorm = null, coefficients = null, outlook = null, dst = NaN, local = null } = inputs;
  const regime = inputs.regime || latitudeRegime(observer.mlat);
  const blendTable = coefficients?.blend && Array.isArray(coefficients.blend.leads) ? coefficients.blend : null;
  const dstB = dstBoundary(dst), wDst = dstWeight(dst);
  const horizons = inputs.horizons || DEFAULT_HORIZONS;
  const known = propagated.filter(r => Number.isFinite(r.coupling));
  if (known.length < 60) return { ok: false, reason: 'not enough propagated solar wind data' };
  const tLast = known[known.length - 1].t;
  const leadMin = (tLast - now) / MIN;
  // the last measured minute normally arrives 30 to 90 minutes from now; half an hour in the past, the feed has stalled
  if (leadMin < -30) return { ok: false, reason: `The last solar wind measurement reached Earth ${Math.round(-leadMin)} min ago: the feed has stalled, so there is no forecast until it moves again.` };
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
  // Arrival-time uncertainty of the flat-plane L1 shift ("errors of ±15 min are common", Cash et al. 2016): every
  // member reads the measured series with its own timing offset, normal with a 10-minute spread, clipped at ±20 min.
  const timingNoise = mulberry32(23), timingSd = Number.isFinite(inputs.timingSdMin) ? inputs.timingSdMin : 10;
  const shifts = members.map(() => (members.length > 1 ? Math.max(-20, Math.min(20, gaussian(timingNoise) * timingSd)) * MIN : 0));
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
  const avgForMember = (path, T, shift = 0) => {
    // shift > 0 means the solar wind arrives later than stamped: the member reads the series at T - shift
    const Ts = T - shift;
    let num = 0, den = 0, used = 0;
    for (let k = 0; k < 4; k++) {
      const t0 = Ts - (k + 1) * HOUR, t1 = Ts - k * HOUR;
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
  const hp30Coefs = coefficients?.hp30 || null, stormCoefs = coefficients?.hp30_storm || null;
  const kpNow = hp30FromDriving(drivingNow, viscousAvg(now), hp30Coefs, stormCoefs); // the same calibrated model as every horizon

  const rows = [];
  for (const h of horizons) {
    const T = now + h * MIN;
    const mlt = mag.mlt(observer.mlon, new Date(T));
    const couplingMembers = members.map((p, m) => { const Ts = T - shifts[m]; const j = Math.round((Ts - futureTimes[0]) / MIN); return Ts <= tLast ? couplingAt(known, Ts) : p[Math.min(Math.max(j, 0), p.length - 1)]; });
    const drivingMembers = members.map((p, m) => avgForMember(p, T, shifts[m]));
    const visc = viscousAvg(T);
    // members without two hours of driving history carry no information: left out, not counted as "not visible"
    let kpMembers = drivingMembers.map(d => hp30FromDriving(d, visc, hp30Coefs, stormCoefs)).filter(Number.isFinite);
    const hpMembers = kpMembers.slice();
    const kpCentralRaw = quantile(kpMembers, 0.5);

    // Blend the ensemble centre with independent model forecasts and shift members accordingly.
    const geo = valueAt(geospaceKp, T, 10 * MIN);
    const hpo = valueAt(hpoForecast.map(r => ({ t: r.t, kp: r.median })), T, 20 * MIN);
    const blended = blend([
      { value: kpCentralRaw, weight: 1, source: 'coupling' },
      { value: geo, weight: T <= tLast + 15 * MIN ? 0.8 : 0.4, source: 'noaa-geospace' },
      { value: hpo, weight: h <= 60 ? 0.25 : 0.5, source: 'gfz-hpo' },
    ]);
    // Persistence anchor: the last observed index beats any model at short lead (calibration: RMSE 0.62 vs 0.75 at
    // 30 min). The weight per lead comes from the blend calibration (0.65 at +0, 0.45 at +30, 0.40 beyond) scaled by
    // how fresh the anchor is; without a calibration table it decays with horizon plus data age.
    let centre = Number.isFinite(blended.value) ? blended.value : kpCentralRaw;
    let wPersist = 0;
    if (anchor) {
      const fresh = Math.min(1, Math.max(0, 1 - Math.max(0, anchor.ageMin - 20) / 60));
      wPersist = blendTable ? interp(blendTable.leads, blendTable.weight, h) * fresh : 0.85 * Math.exp(-(h + anchor.ageMin) / 60);
      centre = Number.isFinite(centre) ? (1 - wPersist) * centre + wPersist * anchor.value : anchor.value;
    }
    // no driving-based member at all (an hour of data): the members are drawn around the blended centre instead
    if (!kpMembers.length && Number.isFinite(centre)) kpMembers = new Array(members.length).fill(centre);
    const shift = Number.isFinite(kpCentralRaw) ? centre - kpCentralRaw : 0;
    // Spread of the blended index: the calibrated RMSE of the blend at this lead while the driving is measured; beyond
    // the measured lead the analog ensemble carries the driving uncertainty and only the measured-lead spread is added.
    // without an anchor the spread is the model's own calibrated error (modelRmse), not the blend's
    const lead = T <= tLast ? h : Math.max(0, leadMin);
    const sigmaMap = blendTable
      ? (anchor ? interp(blendTable.leads, blendTable.sigma, lead) : Array.isArray(blendTable.modelRmse) ? interp(blendTable.leads, blendTable.modelRmse, lead) : interp(blendTable.leads, blendTable.sigma, lead) * 1.15)
      : (coefficients?.hp30?.sigma || 0.75) * (0.55 + 0.45 * Math.min(1, h / 120)) * (1 - 0.5 * wPersist);
    kpMembers = kpMembers.map(k => Math.min(9, Math.max(0, k + shift + sigmaMap * gaussian(noise))));

    // Oval boundary at this MLT, per member.
    let ovBoundary = null;
    if (ovation && h <= 70) {
      const b = equatorwardBoundary(ovation, mlt, 1.0);
      ovBoundary = Number.isFinite(b.mlat) ? b : null;
    }
    const kpBoundaries = kpMembers.map(k => boundaryForKp(k, mlt));
    let boundaries = kpBoundaries.map(b => ovBoundary ? 0.6 * (ovBoundary.atEdge ? Math.min(ovBoundary.mlat, b) : ovBoundary.mlat) + 0.4 * b : b);
    // Storm main phase: the ring current sets the equatorward edge (Yokoyama et al. 1998), which Kp-driven ovals miss.
    if (wDst > 0 && Number.isFinite(dstB)) boundaries = boundaries.map(b => (1 - wDst) * b + wDst * Math.min(b, dstB));
    const margins = boundaries.map(b => b - observer.mlat);
    const pHorizon = margins.filter(m => m <= VIEW_ALLOWANCE_DEG).length / margins.length;
    const pOverhead = margins.filter(m => m <= 0).length / margins.length;
    const marginMedian = quantile(margins, 0.5), kpMedian = quantile(kpMembers, 0.5);

    // Substorm phase evolution and onset chance over the horizon.
    const factor = phaseFactorAt(substorm, h, outlook, mlt);
    // Visibility tiers. In the auroral zone the substorm phase decides whether anything bright is up; at lower
    // latitudes a storm-level oval is a continuous glow, so the phase only modulates the faint tiers and never
    // below one half. Fresh local magnetometer signals floor the tiers they already show for the next half hour.
    const tiers = {};
    for (const name of TIER_ORDER) {
      const geom = margins.filter(m => m <= TIERS[name]).length / margins.length;
      let f;
      if (regime === 'auroral') f = factor.factor;
      else if (name === 'eyeCity' || name === 'overhead' || kpMedian >= 6) f = 1;
      else f = Math.max(0.5, factor.factor);
      let p = Math.min(1, geom * f);
      if (local && Number.isFinite(local.tier) && local.ageMin <= 25 && h <= 30 && TIER_ORDER.indexOf(name) < local.tier) p = Math.max(p, h <= 10 ? 0.8 : 0.6);
      tiers[name] = p;
    }
    const headlineTier = regime === 'auroral' ? Math.min(1, pHorizon * factor.factor) : tiers.eyeDark;
    rows.push({
      h, t: T, mlt, leadCovered: T <= tLast,
      coupling: { median: quantile(couplingMembers, 0.5), p10: quantile(couplingMembers, 0.1), p90: quantile(couplingMembers, 0.9) },
      driving: { median: quantile(drivingMembers, 0.5), p10: quantile(drivingMembers, 0.1), p90: quantile(drivingMembers, 0.9) },
      kp: { median: quantile(kpMembers, 0.5), p10: quantile(kpMembers, 0.1), p90: quantile(kpMembers, 0.9), sources: [...blended.sources, ...(anchor && wPersist > 0.05 ? [anchor.source] : [])], geospace: geo, gfz: hpo, anchorWeight: wPersist },
      hp30: { median: quantile(hpMembers, 0.5) + shift },
      boundary: { median: quantile(boundaries, 0.5), p10: quantile(boundaries, 0.1), p90: quantile(boundaries, 0.9), ovation: ovBoundary ? ovBoundary.mlat : null, ovationAtEdge: !!ovBoundary?.atEdge },
      margin: marginMedian, visibility: visibilityClass(marginMedian),
      pHorizon, pOverhead, phaseFactor: factor.factor, pOnset: factor.pOnset, pOnsetSector: factor.pOnsetSector,
      tiers, pVisible: headlineTier, pVisibleOverhead: tiers.overhead, dstBoundary: wDst > 0 ? dstB : NaN,
    });
  }

  if (rows.every(r => !Number.isFinite(r.pVisible))) return { ok: false, reason: 'Not enough solar wind history yet: the driving average needs two hours of data.' };
  const mltNow = mag.mlt(observer.mlon, new Date(now));
  const ovNow = ovation ? equatorwardBoundary(ovation, mltNow, 1.0) : null;
  let marginNow = ovNow && Number.isFinite(ovNow.mlat) ? ovNow.mlat - observer.mlat : NaN;
  if (Number.isFinite(marginNow) && wDst > 0 && Number.isFinite(dstB)) marginNow = (1 - wDst) * marginNow + wDst * Math.min(marginNow, dstB - observer.mlat);
  const ovFaint = ovNow && !Number.isFinite(ovNow.mlat) ? ovNow.peakFlux : NaN;
  return {
    ok: true, now, tLast, leadMin, mltNow, regime,
    current: { drivingNow, kpNow, coupling: lastRec.coupling, bz: lastRec.bz, bt: lastRec.bt, speed: lastRec.speed, density: lastRec.density, ekl: lastRec.ekl,
      ovationBoundary: ovNow && Number.isFinite(ovNow.mlat) ? ovNow.mlat : NaN, ovationAtEdge: !!ovNow?.atEdge, margin: marginNow, visibility: visibilityClass(marginNow),
      phase: substorm?.phase || 'unknown', dst, dstBoundary: dstB, local: local || null },
    horizons: rows,
    ensemble: { times: futureTimes, central: ens.central, quantiles: ens.quantiles, members: members.length, analog: ens.members.length, climatology: clim.length, timingSdMin: timingSd }, anchor,
    blend: blendTable ? { weights: blendTable.weight, sigma: blendTable.sigma, leads: blendTable.leads } : null,
    verdict: verdict(rows, marginNow, substorm, ovFaint, mltNow, outlook, regime, local),
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
export function phaseFactorAt(substorm, h, outlook = null, mlt = NaN) {
  if (!substorm || !substorm.phase || substorm.phase === 'unknown') return { factor: 0.55, pOnset: NaN, pOnsetSector: NaN }; // no magnetometer: climatological middle
  const since = (Number.isFinite(substorm.minutesSinceOnset) ? substorm.minutesSinceOnset : 1e6) + h;
  let base, ongoing = false;
  if (since <= 15) { base = PHASE_FACTOR.expansion; ongoing = true; }
  else if (since <= 45) { base = PHASE_FACTOR.recovery; ongoing = true; }
  else if ((substorm.phase === 'expansion' || substorm.phase === 'recovery') && h <= 30) { base = PHASE_FACTOR[substorm.phase]; ongoing = true; } // long-lived activity seen in the index
  else base = substorm.phase === 'growth' || (substorm.ekl >= 0.6) ? PHASE_FACTOR.growth : PHASE_FACTOR.quiet;
  // An ongoing substorm at the chain counts only in so far as the observer's local-time sector is the active one.
  const chainReach = outlook && Number.isFinite(outlook.chainReachMlt) ? outlook.chainReachMlt : 1;
  if (ongoing) base = PHASE_FACTOR.quiet + (base - PHASE_FACTOR.quiet) * chainReach;
  const P = (m) => (m > 0 ? onsetProbability(substorm.loaded, substorm.powerRecent, substorm.powerRecent, m, { ekl: substorm.ekl }) : 0);
  const pOn = P(h);
  // the chance that an onset in the observer's sector reaches them, from the magnetic local time at the horizon (the
  // outlook only has rows for some horizons; a missing row used to count as full reach)
  const row = outlook?.horizons?.find(r => r.h === h);
  const reach = Number.isFinite(mlt) ? localReachMlt(mlt) : row && Number.isFinite(row.reachMlt) ? row.reachMlt : 1;
  if (!Number.isFinite(pOn) || !Number.isFinite(reach)) return { factor: base, pOnset: pOn, pOnsetSector: NaN };
  // At the horizon the observer is in expansion only if the onset came in its last 15 minutes, in recovery if it came
  // 15 to 45 minutes before; an earlier onset is over. (Counting any onset within h as expansion made the factor climb
  // with the horizon, so the auroral-zone headline always picked the last one.)
  const pExp = (pOn - P(h - 15)) * reach, pRec = (P(h - 15) - P(h - 45)) * reach;
  return { factor: base + pExp * (PHASE_FACTOR.expansion - base) + pRec * (PHASE_FACTOR.recovery - base), pOnset: pOn, pOnsetSector: pOn * reach };
}

function verdict(rows, marginNow, substorm, ovFaint, mltNow, outlook = null, regime = 'midlatitude', local = null) {
  const at = (h) => rows.find(r => r.h === h) || rows[rows.length - 1];
  const r30 = at(30), r60 = at(60), r120 = at(120);
  const best = rows.reduce((a, b) => (b.pVisible > a.pVisible ? b : a), rows[0]);
  const pct = (p) => `${Math.round(p * 100)}%`;
  const what = regime === 'auroral' ? '' : ' by eye from a dark site';
  let headline, tone;
  if (best.pVisible >= 0.6) { headline = `Good chance${what}: ${pct(best.pVisible)} around +${best.h} min`; tone = 'good'; }
  else if (best.pVisible >= 0.3) { headline = `Possible${what}: ${pct(best.pVisible)} around +${best.h} min`; tone = 'maybe'; }
  else if (best.pVisible >= 0.1) { headline = `Unlikely${what}: at most ${pct(best.pVisible)} in the next two hours`; tone = 'low'; }
  else { headline = regime === 'auroral' ? 'No aurora expected here in the next two hours' : 'No naked-eye aurora expected here in the next two hours'; tone = 'none'; }
  const bestCity = rows.reduce((a, b) => (b.tiers.eyeCity > a.tiers.eyeCity ? b : a), rows[0]), bestCam = rows.reduce((a, b) => (b.tiers.camera > a.tiers.camera ? b : a), rows[0]);
  const tiersTxt = regime === 'auroral' ? '' : ` From the city ${pct(bestCity.tiers.eyeCity)}, with a camera on a dark northern horizon ${pct(bestCam.tiers.camera)}.`;
  const geometry = Number.isFinite(marginNow)
    ? (marginNow <= 0 ? 'The modeled oval already reaches overhead.' : marginNow <= VIEW_ALLOWANCE_DEG ? `Oval edge ${marginNow.toFixed(1)} deg north of you: low on the northern horizon.` : `Oval edge ${marginNow.toFixed(1)} deg north of you, out of view.`)
    : Number.isFinite(ovFaint) ? `OVATION shows only faint aurora at your local time (${mltNow.toFixed(1)} h MLT, peak ${ovFaint.toFixed(2)} erg cm⁻² s⁻¹).` : 'Oval position unknown.';
  const phase = substorm?.phase ? `Substorm phase: ${substorm.phase}${Number.isFinite(substorm.ilNow) ? ` (IL ${substorm.ilNow.toFixed(0)} nT)` : ''}.` : 'No magnetometer data for substorm phase.';
  const zone = outlook && outlook.regime === 'auroral' && outlook.headline ? ` ${outlook.headline}: see the substorm section.` : '';
  const loc = local && Number.isFinite(local.tier) && local.fresh ? ` Local magnetometers now: ${local.label}${local.tier > 0 ? ' level' : ''}.` : '';
  return { headline, tone, detail: `${geometry}${tiersTxt} ${phase}${zone}${loc}`, p30: r30?.pVisible, p60: r60?.pVisible, p120: r120?.pVisible, bestH: best.h };
}
