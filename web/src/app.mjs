// Aurora Nowcast: orchestration of data polling, models and rendering.
import { load, URLS, mergePropagated, parseFlares } from './data/noaa.mjs';
import { fetchWithMeta, freshness, minutesAgo } from './data/fetch-util.mjs';
import { loadCmes } from './data/donki.mjs';
import { iswaHp30, iswaClear, ginMinute } from './data/hapi.mjs';
import { ProxyClient } from './data/proxied.mjs';
import { MagneticCoordinates } from './model/magcoords.mjs';
import { parseOvationText, kpForBoundary, VIEW_ALLOWANCE_DEG, TIERS } from './model/oval.mjs';
import { skyState } from './model/sky.mjs';
import { loadLocal, localSignal } from './data/local.mjs';
import { pairWithHp30, mosFit, mosApply } from './model/mos.mjs';
import { substormState, toMinutes, quietBaseline, substormOutlook, phaseIntervals, onsetMltDensity, ONSET_CLIMATOLOGY } from './model/substorm.mjs';
import { shortTermForecast } from './model/shortterm.mjs';
import { weightedRecentAverage } from './model/integrate.mjs';
import { kpFromDriving } from './model/activity.mjs';
import { parseGeomagForecast, parseThreeDayForecast, parseDiscussion, parse27Day, parseAlerts, activeGeomagneticMessages, cmeArrivals, enlilEvents, nightCards } from './model/longterm.mjs';
import { timelineChart, boundaryChart, substormChart, kpForecastChart, enlilChart, electrojetChart, profileChart, onsetClockChart } from './ui/charts.mjs';
import { polarMap, subsolarPoint } from './ui/map.mjs';
import { renderVerdict, renderTiles, renderFreshness, renderNights, renderCmes, renderAlerts, renderAgreement, renderDiscussion, renderHorizonTable, renderLegend, renderMethod, renderSubstormPanel, renderLocalSignals } from './ui/panels.mjs';
import { fmt } from './ui/format.mjs';

const MIN = 60e3, HOUR = 3600e3;
const cfg = window.AURORA_CONFIG || {};
const proxy = new ProxyClient(cfg.apiBase === '' ? location.origin : (cfg.apiBase && !cfg.apiBase.includes('PLACEHOLDER') ? cfg.apiBase : null));
// The Finnish IMAGE chain, 58 to 70 deg N (SOD excluded by licence). Order: north to south.
const STATIONS = [
  { code: 'KEV', lat: 69.76, lon: 27.01 }, { code: 'MAS', lat: 69.46, lon: 23.70 }, { code: 'KIL', lat: 69.06, lon: 20.77 }, { code: 'IVA', lat: 68.56, lon: 27.29 },
  { code: 'MUO', lat: 68.02, lon: 23.53 }, { code: 'PEL', lat: 66.90, lon: 24.08 }, { code: 'RAN', lat: 65.90, lon: 26.41 }, { code: 'OUJ', lat: 64.52, lon: 27.23 },
  { code: 'MEK', lat: 62.77, lon: 30.97 }, { code: 'HAN', lat: 62.25, lon: 26.60 }, { code: 'NUR', lat: 60.50, lon: 24.65 }, { code: 'TAR', lat: 58.26, lon: 26.46 },
];
const CHAIN_MLON = 103.5; // magnetic longitude of the chain's centre (AACGM-v2)
// Tromsø Geophysical Observatory sites with open 3-hourly K-index files; the nearest one gives a local activity number.
const TGO_SITES = [
  { site: 'tro2a', name: 'Tromsø', lat: 69.66, lon: 18.94 }, { site: 'and1a', name: 'Andenes', lat: 69.30, lon: 16.03 }, { site: 'bjn1a', name: 'Bjørnøya', lat: 74.50, lon: 19.20 },
  { site: 'nal1a', name: 'Ny-Ålesund', lat: 78.92, lon: 11.95 }, { site: 'dob1a', name: 'Dombås', lat: 62.07, lon: 9.11 }, { site: 'bfe6d', name: 'Brorfelde', lat: 55.63, lon: 11.67 }, { site: 'lrv1a', name: 'Leirvogur', lat: 64.18, lon: -21.70 },
];
function nearestTgo(lat, lon) {
  const d = (a) => Math.hypot(a.lat - lat, (a.lon - lon) * Math.cos(lat * Math.PI / 180));
  return TGO_SITES.reduce((best, s) => (d(s) < d(best) ? s : best), TGO_SITES[0]);
}

const state = {
  observer: { lat: 55.676, lon: 12.568 }, mag: null, obs: null, coefficients: null,
  propagated: [], ovation: null, ovationGrid: null, kp1m: [], geospaceKp: [], hemi: [], hp30: [], hpo: [], stations: [], rtsw: null,
  kpForecast: [], geomag: null, threeDay: null, discussion: null, outlook: null, alerts: [], scales: null, enlil: null, cmes: [], gfzEnsemble: [], clear: [], metoffice: null, sidc: null, flares: [],
  meta: {}, sub: null, fc: null, substormOutlook: null, tgo: null,
  geoDst: [], kyotoDst: [], localRaw: {}, local: null, sky: null, geoWeek: [], geoMos: null,
};

async function loadStatic() {
  const [grid, mltRef, coefs] = await Promise.all([
    fetch('data/aacgm_europe_grid.json').then(r => r.json()), fetch('data/mlt_reference.json').then(r => r.json()),
    fetch('data/coefficients.json').then(r => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  state.mag = new MagneticCoordinates(grid, mltRef);
  state.coefficients = coefs;
}

function setObserver(lat, lon) {
  state.observer = { lat, lon };
  state.obs = { lat, lon, ...state.mag.convert(lat, lon) };
  const thr = { horizon: kpForBoundary(state.obs.mlat + VIEW_ALLOWANCE_DEG, 23), overhead: kpForBoundary(state.obs.mlat, 23) };
  state.thresholds = { horizon: Number.isFinite(thr.horizon) ? Math.min(thr.horizon, 9) : 9, overhead: Number.isFinite(thr.overhead) ? Math.min(thr.overhead, 9) : 9 };
  state.tierThresholds = Object.fromEntries(Object.entries(TIERS).map(([k, allow]) => { const v = kpForBoundary(state.obs.mlat + allow, 23); return [k, Number.isFinite(v) ? Math.min(v, 9) : 9]; }));
  try { localStorage.setItem('aurora.observer', JSON.stringify(state.observer)); } catch {}
}

// ---------------------------------------------------------------- polling groups
async function pollFast() {
  const [p1, kp, geo, hemi, summary, gd] = await Promise.all([load.propagated(URLS.propagated1h), load.kp1m(), load.geospaceKp(), load.hemiPower(), load.rtsw(), load.json(URLS.geospaceDst1h)]);
  state.meta.propagated = p1.meta; if (p1.data.length) state.propagated = mergePropagated(state.propagated, p1.data);
  if (Array.isArray(gd.data)) state.geoDst = gd.data.map(r => ({ t: Date.parse(r.time_tag + (String(r.time_tag).endsWith('Z') ? '' : 'Z')), dst: +r.dst })).filter(r => Number.isFinite(r.t) && Number.isFinite(r.dst));
  state.meta.kp1m = kp.meta; if (kp.data.length) state.kp1m = kp.data;
  state.meta.geospace = geo.meta; if (geo.data.length) state.geospaceKp = geo.data;
  state.meta.hemi = hemi.meta; if (hemi.data.length) state.hemi = hemi.data;
  if (summary.data) state.rtsw = summary.data;
  if (proxy.available) {
    const now = Date.now();
    const st = await Promise.all(STATIONS.map(async s => { const r = await proxy.fmiStation(s.code, '24'); const c = state.mag.convert(s.lat, s.lon); return { station: s.code, mlat: c.mlat, mlon: c.mlon, series: r.series, meta: r.meta }; }));
    if (st.some(s => s.series && s.series.t.length)) { state.stations = st.filter(s => s.series && s.series.t.length); state.meta.fmi = st.find(s => s.meta.ok)?.meta || st[0].meta; }
  }
}

async function pollHp30() {
  const now = Date.now();
  if (proxy.available) {
    const r = await proxy.gfzIndex('Hp30', now - 7 * 86400e3, now + HOUR);
    state.meta.hp30 = r.meta; if (r.data.length) state.hp30 = r.data.map(x => ({ t: x.t, value: x.value }));
    const f = await proxy.gfzHpoForecast('aceprop', 'Hp30');
    if (!f.data.length || !f.data.some(x => Number.isFinite(x.median))) { const g = await proxy.gfzHpoForecast('mean_bars', 'Hp30'); state.hpo = g.data; state.meta.hpo = g.meta; } else { state.hpo = f.data; state.meta.hpo = f.meta; }
  } else {
    const r = await iswaHp30(now, 168); state.meta.hp30 = r.meta; if (r.data.length) state.hp30 = r.data.map(x => ({ t: x.t, value: x.hp30 }));
    // browser-only substorm fallback: INTERMAGNET NUR and HRN (CC BY-NC, 4-min lag)
    const gin = await Promise.all([['nur', 60.5, 24.65], ['hrn', 77.0, 15.55]].map(async ([code, la, lo]) => { const g = await ginMinute(code, now, 24); const c = state.mag.convert(la, lo); return { station: code.toUpperCase(), mlat: c.mlat, mlon: c.mlon, series: g.series, meta: g.meta }; }));
    if (gin.some(s => s.series.t.length)) { state.stations = gin.filter(s => s.series.t.length); state.meta.fmi = gin[0].meta; state.stationSource = 'INTERMAGNET'; }
  }
}

async function pollLocal() {
  const now = Date.now();
  const [tor, hel, aw] = await Promise.all([loadLocal.tormestorp(proxy), loadLocal.hel(now), loadLocal.aurorawatch()]);
  state.localRaw = { tormestorp: tor.series ? tor : state.localRaw.tormestorp || null, hel: hel.series ? hel : state.localRaw.hel || null, aurorawatch: aw.status ? aw : state.localRaw.aurorawatch || null };
  state.meta.tormestorp = tor.meta; state.meta.hel = hel.meta; state.meta.aurorawatch = aw.meta;
}

async function pollOvation() {
  const [txt, grid] = await Promise.all([load.ovationText(), load.json(URLS.ovationGrid)]);
  state.meta.ovation = txt.meta; if (txt.text) state.ovation = parseOvationText(txt.text);
  if (grid.data) state.ovationGrid = grid.data;
}

async function pollSlow() {
  const now = Date.now();
  const [kpf, geomag, three, disc, out, alerts, scales, enlil, cmes, flares, kyoto] = await Promise.all([
    load.kpForecast(), load.text(URLS.geomagForecast), load.text(URLS.threeDay), load.text(URLS.discussion), load.text(URLS.outlook27), load.json(URLS.alerts), load.scales(), load.json(URLS.enlil), loadCmes(now, 10), load.json(URLS.xrayFlares7d), load.json(URLS.kyotoDst),
  ]);
  state.meta.kpForecast = kpf.meta; if (kpf.data.length) state.kpForecast = kpf.data;
  if (Array.isArray(kyoto.data)) state.kyotoDst = kyoto.data.map(r => ({ t: Date.parse(r.time_tag + (String(r.time_tag).endsWith('Z') ? '' : 'Z')), dst: +r.dst })).filter(r => Number.isFinite(r.t) && Number.isFinite(r.dst));
  if (geomag.text) state.geomag = parseGeomagForecast(geomag.text);
  if (three.text) state.threeDay = parseThreeDayForecast(three.text);
  if (disc.text) state.discussion = parseDiscussion(disc.text);
  if (out.text) state.outlook = parse27Day(out.text);
  state.meta.alerts = alerts.meta; if (alerts.data) state.alerts = parseAlerts(alerts.data);
  if (scales.data) state.scales = scales.data;
  state.meta.enlil = enlil.meta; if (enlil.data) state.enlil = enlilEvents(enlil.data, now);
  state.meta.donki = cmes.meta; state.cmes = cmeArrivals(cmes.data, now, { horizonDays: 5 });
  if (flares.data) state.flares = parseFlares(flares.data);
  const clear = await iswaClear(now).catch(() => ({ data: [] })); state.clear = clear.data || [];
  // a week of the Geospace model's Kp for the running correction against observed Hp30
  const gw = await load.json(URLS.geospaceKp7d).catch(() => ({ data: null }));
  if (Array.isArray(gw.data)) state.geoWeek = gw.data.map(r => ({ t: Date.parse((r.model_prediction_time || r.time_tag) + (String(r.model_prediction_time || r.time_tag).endsWith('Z') ? '' : 'Z')), kp: +(r.k ?? r.kp) })).filter(r => Number.isFinite(r.t) && Number.isFinite(r.kp) && r.t <= now);
  if (proxy.available) {
    const tgoSite = nearestTgo(state.observer.lat, state.observer.lon);
    const [ens, mo, sidc, tgo] = await Promise.all([proxy.gfzEnsemble('Kp'), proxy.metOffice(), proxy.sidc(), proxy.tgoK(tgoSite.site)]);
    state.meta.gfzEnsemble = ens.meta; if (ens.data.length) state.gfzEnsemble = ens.data;
    state.metoffice = mo.text ? mo : null; state.sidc = sidc.text ? sidc : null;
    state.tgo = tgo.days && tgo.days.length ? { site: tgoSite.site, name: tgoSite.name, days: tgo.days, meta: tgo.meta } : null;
  }
}

// ---------------------------------------------------------------- compute + render
function compute() {
  const now = Date.now();
  const drive = state.propagated.filter(r => r.t >= now - 6 * HOUR).map(r => ({ t: r.t, power: r.power, ekl: r.ekl, bz: r.bz }));
  state.sub = state.stations.length ? substormState(state.stations, drive, now) : null;
  // activity level for the onset-latitude climatology: the freshest observed index, else the driving
  const hpLast = state.hp30.length ? state.hp30[state.hp30.length - 1] : null, kpLast = state.kp1m.length ? state.kp1m[state.kp1m.length - 1] : null;
  let kpLevel = hpLast && now - (hpLast.t + 30 * MIN) < 45 * MIN ? hpLast.value : kpLast && now - kpLast.t < 30 * MIN ? kpLast.kp : NaN;
  if (!Number.isFinite(kpLevel)) kpLevel = kpFromDriving(weightedRecentAverage(state.propagated, now, 'coupling', { minHours: 2 }).value, weightedRecentAverage(state.propagated, now, 'viscous', { minHours: 1 }).value);
  const arrived = state.propagated.filter(r => r.t <= now && r.t >= now - HOUR && Number.isFinite(r.coupling));
  const couplingRecent = arrived.length ? arrived.reduce((s, r) => s + r.coupling, 0) / arrived.length : NaN;
  state.substormOutlook = state.obs ? substormOutlook({ sub: state.sub, observer: state.obs, mag: state.mag, now, kp: kpLevel, ovation: state.ovation, couplingRecent, chainMlon: CHAIN_MLON }) : null;
  // ring current: the latest observed Kyoto Dst when it is less than three hours old, else NOAA's modeled Dst
  const kyotoLast = state.kyotoDst.filter(r => r.t <= now).slice(-1)[0], geoLast = state.geoDst.filter(r => r.t <= now).slice(-1)[0];
  state.dst = kyotoLast && now - kyotoLast.t < 3 * HOUR ? { value: kyotoLast.dst, t: kyotoLast.t, source: 'Kyoto' } : geoLast ? { value: geoLast.dst, t: geoLast.t, source: 'Geospace model' } : null;
  state.local = localSignal(state.localRaw, now);
  state.sky = skyState(now, state.observer.lat, state.observer.lon);
  // Geospace Kp corrected by the running fit against observed Hp30 (model output statistics)
  state.geoMos = state.geoWeek.length && state.hp30.length ? mosFit(pairWithHp30(state.geoWeek, state.hp30)) : null;
  const geoCorrected = state.geoMos ? state.geospaceKp.map(r => ({ ...r, kp: mosApply(state.geoMos, r.kp) })) : state.geospaceKp;
  state.fc = shortTermForecast({ now, propagated: state.propagated, ovation: state.ovation, kp1m: state.kp1m, geospaceKp: geoCorrected, hp30: state.hp30, hpoForecast: state.hpo,
    observer: state.obs, mag: state.mag, substorm: state.sub, coefficients: state.coefficients, outlook: state.substormOutlook, dst: state.dst ? state.dst.value : NaN, local: state.local });
}

function renderShort() {
  const now = Date.now(); const fc = state.fc;
  const kpObs = state.kp1m.length ? state.kp1m[state.kp1m.length - 1].kp : NaN;
  const hp30 = state.hp30.length ? state.hp30[state.hp30.length - 1].value : NaN;
  renderVerdict(fc, state.obs, state.mag, { thresholds: state.thresholds, tierThresholds: state.tierThresholds, kpObs, hp30, sky: state.sky, dst: state.dst, geoMos: state.geoMos });
  renderTiles(fc);
  renderLocalSignals({ local: state.local, dst: state.dst, sky: state.sky, now, regime: fc?.regime });
  renderHorizonTable(fc);
  document.getElementById('short-sub').textContent = fc?.ok ? `Solar wind measured at L1 is already known up to ${fmt.hm(fc.tLast)} UTC (${fmt.int(fc.leadMin)} min ahead). Beyond that the band widens with an analog ensemble of the last week.` : 'Waiting for solar wind data.';
  if (fc?.ok) {
    // hindcast Kp for the last 6 h from the same driving integral
    const kpHind = [];
    for (let t = now - 6 * HOUR; t <= Math.min(now, fc.tLast); t += 10 * MIN) {
      const d = weightedRecentAverage(state.propagated, t, 'coupling', { minHours: 2 }).value, v = weightedRecentAverage(state.propagated, t, 'viscous', { minHours: 1 }).value;
      const kp = kpFromDriving(d, v); if (Number.isFinite(kp)) kpHind.push({ t, kp });
    }
    const kpFuture = fc.horizons.map(r => ({ t: r.t, median: r.kp.median, p10: r.kp.p10, p90: r.kp.p90 }));
    const fut = fc.ensemble; const q = fut.quantiles || { p10: fut.central, p90: fut.central };
    timelineChart(document.getElementById('timeline-chart'), { propagated: state.propagated, now, tLast: fc.tLast, xMin: now - 6 * HOUR, xMax: now + 2 * HOUR,
      future: { times: fut.times, central: fut.central, p10: q.p10, p90: q.p90 }, kpHind, kpFuture, kpObs: state.kp1m, hp30: state.hp30.filter(h => h.t >= now - 7 * HOUR), geospace: state.geospaceKp, thresholds: state.thresholds });
    renderLegend('timeline-legend', [
      { label: 'Bz (nT)', color: 'var(--s1)' }, { label: 'Bt (nT)', color: 'var(--muted)' }, { label: 'speed', color: 'var(--s2)' }, { label: 'coupling, forecast band', color: 'var(--s1)', kind: 'area' },
      { label: 'Kp modeled from solar wind', color: 'var(--s1)' }, { label: 'Kp forecast (median, 10–90%)', color: 'var(--s1)', kind: 'dash' }, { label: 'Hp30 observed (GFZ)', color: 'var(--s2)' }, { label: 'Kp estimated (NOAA)', color: 'var(--s4)' }, { label: 'Kp Geospace model (NOAA)', color: 'var(--s7)' },
    ]);
    boundaryChart(document.getElementById('boundary-chart'), fc.horizons, state.obs.mlat, VIEW_ALLOWANCE_DEG, fc.regime === 'auroral' ? null : TIERS);
  }
  // map
  if (state.ovationGrid) {
    polarMap(document.getElementById('map-chart'), state.ovationGrid, state.observer, subsolarPoint(new Date(now)));
    document.getElementById('map-note').textContent = `Forecast for ${fmt.hm(Date.parse(state.ovationGrid['Forecast Time']))} UTC from observations at ${fmt.hm(Date.parse(state.ovationGrid['Observation Time']))} UTC. Hemispheric power ${fmt.int(state.ovation?.hemisphericPower)} GW.`;
  }
}

function placeName() {
  const sel = document.getElementById('place'); const opt = sel.selectedOptions && sel.selectedOptions[0];
  return opt && opt.value !== 'custom' ? opt.textContent.replace(/^Lapland: /, '') : 'you';
}

function renderSubstorms() {
  const now = Date.now(); const sub = state.sub, out = state.substormOutlook;
  renderSubstormPanel({ outlook: out, sub, obs: state.obs, now, thresholds: state.thresholds, stationSource: state.stationSource === 'INTERMAGNET' ? 'INTERMAGNET' : 'FMI IMAGE', tgo: state.tgo, proxyAvailable: proxy.available });
  const ejBox = document.getElementById('electrojet-chart'), profBox = document.getElementById('profile-chart');
  if (sub?.chain) {
    // the station nearest the observer's magnetic latitude, for the dashed local trace
    const nearest = sub.chain.deviations.reduce((a, b) => (Math.abs(b.mlat - state.obs.mlat) < Math.abs(a.mlat - state.obs.mlat) ? b : a));
    electrojetChart(ejBox, { index: sub.chain.index, onsets: sub.onsets, phases: phaseIntervals(sub.onsets, now), now, xMin: now - 12 * HOUR, xMax: now + 30 * MIN,
      local: nearest ? { t: nearest.t, dx: nearest.dx } : null, localLabel: nearest ? `${nearest.station} (nearest to you)` : '', baseline: sub.chain.baseline });
    renderLegend('electrojet-legend', [{ label: 'IL: strongest westward current in the chain', color: 'var(--s1)' }, { label: 'IU: strongest eastward current', color: 'var(--muted)' }, { label: `X at ${nearest ? nearest.station : 'nearest station'}`, color: 'var(--s3)', kind: 'dash' }, { label: 'onset (dashed = provisional)', color: 'var(--s2)' }, { label: 'expansion', color: 'var(--s2)', kind: 'area' }, { label: 'recovery', color: 'var(--s4)', kind: 'area' }, { label: 'quiet baseline window', color: 'var(--s3)' }]);
    profileChart(profBox, { profile: sub.chain.profile, observerMlat: state.obs.mlat, oval: out?.oval, onsetMlat: out?.onsetMlat, centre: sub.chain.centre, observerLabel: placeName() });
  } else { ejBox.replaceChildren(); profBox.replaceChildren(); renderLegend('electrojet-legend', []); }
  const clockBox = document.getElementById('onset-clock-chart'), clockNote = document.getElementById('onset-clock-note');
  if (out && state.obs) {
    const tMin = now - 2 * HOUR, tMax = now + 22 * HOUR, curve = [];
    for (let t = tMin; t <= tMax; t += 10 * MIN) curve.push({ t, density: onsetMltDensity(state.mag.mlt(state.obs.mlon, new Date(t))) });
    onsetClockChart(clockBox, { curve, now, prime: out.prime, tMin, tMax });
    clockNote.textContent = `Breakups cluster around ${ONSET_CLIMATOLOGY.mltMean} h magnetic local time; you are at ${out.mltNow.toFixed(1)} h MLT now. ${out.prime ? `Prime window ${fmt.hm(out.prime.start)}–${fmt.hm(out.prime.end)} UTC (${fmt.hmLocal(out.prime.start)}–${fmt.hmLocal(out.prime.end)} local).` : ''} Daylight and clouds are ignored.`;
  } else { clockBox.replaceChildren(); clockNote.textContent = ''; }
  const subBox = document.getElementById('substorm-chart');
  if (sub && sub.stations.length) {
    const rows = state.stations.filter(s => s.series && s.series.t.length >= 30).map(s => { const minute = toMinutes(s.series); const base = quietBaseline(minute.x); const st = sub.stations.find(x => x.station === s.station); return { station: s.station, mlat: s.mlat, minutes: { t: minute.t, dev: minute.x.map(v => v - base) }, onsets: st ? st.onsets : [] }; }).sort((a, b) => b.mlat - a.mlat);
    substormChart(subBox, rows, now, sub.lastOnset?.t);
  } else subBox.replaceChildren();
}

function renderLong() {
  const now = Date.now();
  const watches = state.alerts.filter(a => a.kind === 'watch' && !a.cancelled && a.issued >= now - 3 * 86400e3);
  const cards = state.kpForecast.length ? nightCards(now, state.kpForecast.filter(b => b.status !== 'observed' || b.t >= now - 3 * HOUR), state.geomag?.probabilities || [], state.gfzEnsemble, state.thresholds) : [];
  state.cards = cards;
  renderNights(cards, { watches, cmes: state.cmes });
  if (state.kpForecast.length) {
    kpForecastChart(document.getElementById('kp-chart'), { now, noaa: state.kpForecast.filter(b => b.t >= now - 12 * HOUR), gfz: state.gfzEnsemble, thresholds: state.thresholds, cmes: state.cmes, nights: cards.map(c => ({ start: c.start, end: c.end })) });
    renderLegend('kp-legend', [{ label: 'NOAA 3-h Kp (dark = predicted, light = observed)', color: 'var(--s1)' }, { label: 'GFZ ensemble median and 25–75%', color: 'var(--s2)' }, { label: 'CME arrival ±7 h with Kp range', color: 'var(--s2)', kind: 'dash' }, { label: 'your thresholds', color: 'var(--s3)', kind: 'dash' }]);
  }
  renderCmes(state.cmes, now);
  if (state.enlil) {
    enlilChart(document.getElementById('enlil-chart'), state.enlil.rows, state.enlil.events, now);
    const hss = state.enlil.events.filter(e => e.kind === 'hss' && e.peakT >= now - 6 * HOUR), cl = state.enlil.events.filter(e => e.kind === 'cme-cloud');
    document.getElementById('enlil-note').textContent = `Run covers to ${fmt.dateUtc(state.enlil.horizonEnd)}. ${hss.length ? `Stream ramp ${fmt.int(hss[0].from)} → ${fmt.int(hss[0].to)} km/s peaking ${fmt.dateUtc(hss[0].peakT)}.` : 'No new high-speed stream ramp in the run.'} ${cl.length ? `CME ejecta at Earth ${fmt.dateUtc(cl[0].start)} to ${fmt.dateUtc(cl[0].end)}.` : 'No CME ejecta in the run.'} ${state.clear.length ? `CLEAR ambient model peak in the next 5 days: ${fmt.int(Math.max(...state.clear.filter(r => r.t > now).map(r => r.speed)))} km/s.` : ''}`;
  }
  const agreement = [];
  if (state.scales) agreement.push({ title: 'NOAA scales by day', meta: 'products/noaa-scales.json', text: state.scales.days.map(d => `${fmt.dayLocal(d.date)}: G${d.g ?? 0}`).join(' · ') + (state.geomag ? ` · storm probabilities ${state.geomag.probabilities.map(p => `${fmt.dayLocal(p.date)} G1+ ${fmt.pct(p.minor + p.moderate + p.strong)}`).join(', ')}` : '') });
  if (state.gfzEnsemble.length) { const mx = Math.max(...state.gfzEnsemble.map(r => r.median)); const pk = state.gfzEnsemble.reduce((a, b) => (b.median > a.median ? b : a)); agreement.push({ title: 'GFZ PAGER/SWIFT ensemble', meta: `72 h · updated ${fmt.dateUtc(state.meta.gfzEnsemble?.lastModified)}`, text: `Peak median Kp ${fmt.num(mx, 1)} around ${fmt.dateUtc(pk.t)}; P(Kp≥5) then ${fmt.pct(pk.pGe5)}.` }); }
  if (state.metoffice) agreement.push({ title: 'UK Met Office', meta: state.metoffice.saved ? `saved ${fmt.dateUtc(state.metoffice.saved)}` : '', text: state.metoffice.text.slice(0, 600) });
  if (state.sidc) agreement.push({ title: 'SIDC Brussels', meta: 'daily URSIGRAM', text: `${state.sidc.geomagnetism ? 'Geomagnetism: ' + state.sidc.geomagnetism + '. ' : ''}${state.sidc.predictions.map(p => `${p.day}: Ap ${p.ap}`).join(' · ')}` });
  if (state.outlook) { const ago = state.outlook.days.find(d => Math.abs(d.date - (now - 27 * 86400e3)) < 12 * HOUR); const next = state.outlook.days.filter(d => d.date >= now - 86400e3).slice(0, 5); agreement.push({ title: 'Recurrence (27-day outlook)', meta: `issued ${fmt.dateUtc(state.outlook.issued)}`, text: `${next.map(d => `${fmt.dayLocal(d.date)}: Kp max ${d.kpMax}`).join(' · ')}${ago ? ` · one rotation ago: Kp max ${ago.kpMax}` : ''}` }); }
  renderAgreement(agreement);
  renderAlerts(activeGeomagneticMessages(state.alerts, now));
  renderDiscussion(state.discussion, state.threeDay);
}

function renderFreshnessStrip() {
  const now = Date.now();
  const last = (arr, key = 't') => (arr && arr.length ? arr[arr.length - 1][key] : NaN);
  const items = [
    { label: `L1 solar wind (${state.rtsw?.mag?.source || 'NOAA'})`, t: state.rtsw?.mag?.t ?? (state.propagated.length ? state.propagated[state.propagated.length - 1].tMeasured : NaN), exp: 5 },
    { label: 'OVATION', t: state.ovation?.obsTime, exp: 20 }, { label: 'NOAA est. Kp', t: last(state.kp1m), exp: 10 }, { label: 'Geospace Kp', t: state.meta.geospace?.lastModified || state.meta.geospace?.fetchedAt, exp: 10 },
    { label: proxy.available ? 'GFZ Hp30' : 'Hp30 (iSWA mirror)', t: last(state.hp30) + 30 * MIN, exp: proxy.available ? 35 : 90 },
    { label: state.stationSource === 'INTERMAGNET' ? 'INTERMAGNET' : 'FMI magnetometers', t: state.stations.length ? Math.max(...state.stations.map(s => s.series.t[s.series.t.length - 1])) : NaN, exp: 10 },
    { label: 'Tormestorp', t: state.localRaw.tormestorp?.series?.t?.length ? state.localRaw.tormestorp.series.t[state.localRaw.tormestorp.series.t.length - 1] : NaN, exp: 5, hide: !proxy.available },
    { label: 'Hel (INTERMAGNET)', t: state.localRaw.hel?.series?.t?.length ? state.localRaw.hel.series.t[state.localRaw.hel.series.t.length - 1] : NaN, exp: 15 },
    { label: 'AuroraWatch UK', t: state.localRaw.aurorawatch?.updated, exp: 10 },
    { label: 'Kp forecast', t: state.meta.kpForecast?.lastModified || state.meta.kpForecast?.fetchedAt, exp: 12 * 60 }, { label: 'DONKI CMEs', t: state.meta.donki?.fetchedAt, exp: 30 },
    { label: 'WSA-Enlil', t: state.meta.enlil?.lastModified || state.meta.enlil?.fetchedAt, exp: 12 * 60 }, { label: 'GFZ ensemble', t: state.meta.gfzEnsemble?.lastModified || state.meta.gfzEnsemble?.fetchedAt, exp: 4 * 60, hide: !proxy.available },
  ];
  renderFreshness(items.filter(i => !i.hide).map(i => { const f = freshness(i.t, i.exp, now); return { label: i.label, ageMin: f.age, level: f.level, title: Number.isFinite(i.t) ? new Date(i.t).toISOString() : 'no data' }; }));
}

function renderAll() {
  try { compute(); renderShort(); } catch (e) { console.error(e.stack || e); renderVerdict({ ok: false, reason: String(e.message || e) }); }
  try { renderSubstorms(); } catch (e) { console.error(e.stack || e); }
  try { renderLong(); } catch (e) { console.error(e.stack || e); }
  renderFreshnessStrip();
}

// ---------------------------------------------------------------- boot
async function boot() {
  renderMethod();
  await loadStatic();
  let saved = null; try { saved = JSON.parse(localStorage.getItem('aurora.observer') || 'null'); } catch {}
  // ?lat=69.649&lon=18.956 in the URL selects a place for this load (shareable links); otherwise the remembered one.
  const q = new URLSearchParams(location.search); const qLat = parseFloat(q.get('lat')), qLon = parseFloat(q.get('lon'));
  const init = Number.isFinite(qLat) && Number.isFinite(qLon) && Math.abs(qLat) <= 90 && Math.abs(qLon) <= 180 ? { lat: qLat, lon: qLon } : saved && Number.isFinite(saved.lat) ? saved : { lat: 55.676, lon: 12.568 };
  setObserver(init.lat, init.lon); syncLocationForm();
  const seven = await load.propagated(URLS.propagated7d); state.meta.propagated7 = seven.meta; state.propagated = seven.data;
  await Promise.all([pollFast(), pollOvation(), pollHp30(), pollSlow(), pollLocal()]);
  renderAll();
  setInterval(async () => { await pollFast(); renderAll(); }, 60e3);
  setInterval(async () => { await pollLocal(); renderAll(); }, 2 * 60e3);
  setInterval(async () => { await pollOvation(); renderAll(); }, 5 * 60e3);
  setInterval(async () => { await pollHp30(); renderAll(); }, 2 * 60e3);
  setInterval(async () => { await pollSlow(); renderAll(); }, 15 * 60e3);
  window.addEventListener('resize', debounce(renderAll, 250));
  window.__aurora = state;
}

// ---------------------------------------------------------------- sightings (verification truth)
async function logSighting(seen) {
  const status = document.getElementById('sighting-status');
  if (!proxy.available) { status.textContent = 'Needs the Worker.'; return; }
  let token = null; try { token = localStorage.getItem('aurora.sightingToken'); } catch {}
  if (!token) { token = prompt('Sighting token (the SIGHTING_TOKEN secret of the Worker):'); if (!token) return; try { localStorage.setItem('aurora.sightingToken', token.trim()); } catch {} token = token.trim(); }
  status.textContent = 'Sending…';
  try {
    const res = await fetch(proxy.url('/api/sighting'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ t: Date.now(), lat: state.observer.lat, lon: state.observer.lon, seen, note: document.getElementById('sighting-note').value }) });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) { try { localStorage.removeItem('aurora.sightingToken'); } catch {} status.textContent = 'Token rejected; try again.'; return; }
    status.textContent = res.ok ? `Logged "${seen}" at ${fmt.hm(Date.now())} UTC (${j.count} this month). Thanks: it feeds the model check.` : `Failed: ${j.error || res.status}`;
    if (res.ok) document.getElementById('sighting-note').value = '';
  } catch (e) { status.textContent = `Failed: ${e.message}`; }
}
for (const b of document.querySelectorAll('#sighting-form button[data-seen]')) b.addEventListener('click', () => logSighting(b.dataset.seen));

function syncLocationForm() {
  const sel = document.getElementById('place'); const key = `${state.observer.lat},${state.observer.lon}`;
  const opt = [...sel.options].find(o => o.value === key); sel.value = opt ? key : 'custom';
  document.getElementById('lat').value = state.observer.lat; document.getElementById('lon').value = state.observer.lon;
}
document.getElementById('place').addEventListener('change', (e) => { if (e.target.value === 'custom') return; const [la, lo] = e.target.value.split(',').map(Number); document.getElementById('lat').value = la; document.getElementById('lon').value = lo; });
document.getElementById('location-form').addEventListener('submit', (e) => { e.preventDefault(); const la = +document.getElementById('lat').value, lo = +document.getElementById('lon').value; if (Number.isFinite(la) && Number.isFinite(lo)) { setObserver(la, lo); syncLocationForm(); renderAll(); } });
document.getElementById('geolocate').addEventListener('click', () => { navigator.geolocation?.getCurrentPosition(p => { setObserver(+p.coords.latitude.toFixed(3), +p.coords.longitude.toFixed(3)); syncLocationForm(); renderAll(); }, () => alert('Location not available')); });
document.getElementById('theme-toggle').addEventListener('click', () => { const root = document.documentElement; const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); root.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('aurora.theme', root.dataset.theme); } catch {} renderAll(); });
try { const th = localStorage.getItem('aurora.theme'); if (th) document.documentElement.dataset.theme = th; } catch {}
function debounce(fn, ms) { let id; return () => { clearTimeout(id); id = setTimeout(fn, ms); }; }

boot().catch(err => { console.error(err); renderVerdict({ ok: false, reason: String(err.message || err) }); });
