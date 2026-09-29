// Aurora Nowcast: orchestration of data feeds, models and rendering.
import { load, URLS, mergePropagated, parseFlares } from './data/noaa.mjs';
import { freshness } from './data/fetch-util.mjs';
import { loadCmes } from './data/donki.mjs';
import { iswaHp30, iswaClear, ginMinute, rtswSpeedHourly } from './data/hapi.mjs';
import { ProxyClient } from './data/proxied.mjs';
import { FeedScheduler } from './data/feeds.mjs';
import { readSnapshot, writeSnapshot, buildSnapshot, freshEntries, setPath } from './data/snapshot.mjs';
import { MagneticCoordinates } from './model/magcoords.mjs';
import { parseOvationText, kpForBoundary, VIEW_ALLOWANCE_DEG, TIERS } from './model/oval.mjs';
import { skyState } from './model/sky.mjs';
import { loadLocal, localSignal } from './data/local.mjs';
import { pairWithHp30, mosFit, mosApply } from './model/mos.mjs';
import { substormState, toMinutes, quietBaseline, substormOutlook, phaseIntervals, onsetMltDensity, ONSET_CLIMATOLOGY, extendSeries } from './model/substorm.mjs';
import { shortTermForecast } from './model/shortterm.mjs';
import { weightedRecentAverage } from './model/integrate.mjs';
import { hp30FromDriving } from './model/activity.mjs';
import { parseGeomagForecast, parseThreeDayForecast, parseDiscussion, parse27Day, parseAlerts, activeGeomagneticMessages, cmeArrivals, enlilEvents, nightCards, recurrenceForecast, SOLAR_ROTATION_DAYS } from './model/longterm.mjs';
import { timelineChart, boundaryChart, substormChart, kpForecastChart, enlilChart, electrojetChart, profileChart, onsetClockChart } from './ui/charts.mjs';
import { polarMap, subsolarPoint } from './ui/map.mjs';
import { renderVerdict, renderTiles, renderFreshness, renderNights, renderCmes, renderAlerts, renderAgreement, renderDiscussion, renderHorizonTable, renderLegend, renderMethod, renderSubstormPanel, renderLocalSignals, renderDataStatus } from './ui/panels.mjs';
import { fmt } from './ui/format.mjs';

const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;
const cfg = window.AURORA_CONFIG || {};
const proxy = new ProxyClient(cfg.apiBase === '' ? location.origin : (cfg.apiBase && !cfg.apiBase.includes('PLACEHOLDER') ? cfg.apiBase : null));
// The Finnish IMAGE chain, 58 to 70 deg N (SOD excluded by licence). Order: north to south.
const STATIONS = [
  { code: 'KEV', lat: 69.76, lon: 27.01 }, { code: 'MAS', lat: 69.46, lon: 23.70 }, { code: 'KIL', lat: 69.06, lon: 20.77 }, { code: 'IVA', lat: 68.56, lon: 27.29 },
  { code: 'MUO', lat: 68.02, lon: 23.53 }, { code: 'PEL', lat: 66.90, lon: 24.08 }, { code: 'RAN', lat: 65.90, lon: 26.41 }, { code: 'OUJ', lat: 64.52, lon: 27.23 },
  { code: 'MEK', lat: 62.77, lon: 30.97 }, { code: 'HAN', lat: 62.25, lon: 26.60 }, { code: 'NUR', lat: 60.50, lon: 24.65 }, { code: 'TAR', lat: 58.26, lon: 26.46 },
];
// browser-only substorm fallback: INTERMAGNET NUR and HRN (CC BY-NC, 4-min lag)
const GIN_STATIONS = [{ code: 'NUR', lat: 60.5, lon: 24.65 }, { code: 'HRN', lat: 77.0, lon: 15.55 }];
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

const DEFAULT_OBSERVER = { lat: 55.676, lon: 12.568 };
const state = {
  observer: { ...DEFAULT_OBSERVER }, mag: null, obs: null, coefficients: null,
  propagated: [], ovation: null, ovationGrid: null, kp1m: [], geospaceKp: [], hemi: [], hp30: [], hpo: [], stations: [], stationSource: null, rtsw: null,
  kpForecast: [], geomag: null, threeDay: null, discussion: null, outlook: null, alerts: [], scales: null, enlil: null, cmes: [], gfzEnsemble: [], clear: [], recurrence: [], metoffice: null, sidc: null, flares: [],
  meta: {}, sub: null, fc: null, substormOutlook: null, tgo: null,
  geoDst: [], kyotoDst: [], localRaw: {}, local: null, sky: null, geoWeek: [], geoMos: null,
  historyReady: false, snapshotAt: null,
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function getJson(url) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 15e3);
  return fetch(url, { signal: ctrl.signal }).then(r => { if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); }).finally(() => clearTimeout(timer));
}
/**
 * The magnetic grid and MLT table: nothing is drawn without them, so they are retried until they come (a flaky
 * connection must not leave the page dead). The calibration coefficients load alongside and retry on their own.
 */
async function loadStatic() {
  for (let attempt = 1; ; attempt++) {
    const [grid, mltRef, coefs] = await Promise.allSettled([getJson('data/aacgm_europe_grid.json'), getJson('data/mlt_reference.json'), getJson('data/coefficients.json')]);
    if (coefs.status === 'fulfilled') state.coefficients = coefs.value;
    if (grid.status === 'fulfilled' && mltRef.status === 'fulfilled') {
      state.mag = new MagneticCoordinates(grid.value, mltRef.value);
      if (!state.coefficients) retryCoefficients();
      return;
    }
    console.error('static tables:', grid.reason || mltRef.reason);
    await sleep(Math.min(30e3, 1000 * 2 ** Math.min(attempt, 5)));
  }
}
async function retryCoefficients() {
  for (let attempt = 1; attempt <= 30 && !state.coefficients; attempt++) {
    await sleep(Math.min(60e3, 2000 * 2 ** Math.min(attempt, 5)));
    try { state.coefficients = await getJson('data/coefficients.json'); invalidate(['model']); } catch { /* next attempt */ }
  }
}

function setObserver(lat, lon, remember = true) {
  state.observer = { lat, lon };
  if (remember) try { localStorage.setItem('aurora.observer', JSON.stringify(state.observer)); } catch {}
  if (!state.mag) return; // boot converts it once the magnetic grid has loaded
  state.obs = { lat, lon, ...state.mag.convert(lat, lon) };
  const thr = { horizon: kpForBoundary(state.obs.mlat + VIEW_ALLOWANCE_DEG, 23), overhead: kpForBoundary(state.obs.mlat, 23) };
  state.thresholds = { horizon: Number.isFinite(thr.horizon) ? Math.min(thr.horizon, 9) : 9, overhead: Number.isFinite(thr.overhead) ? Math.min(thr.overhead, 9) : 9 };
  state.tierThresholds = Object.fromEntries(Object.entries(TIERS).map(([k, allow]) => { const v = kpForBoundary(state.obs.mlat + allow, 23); return [k, Number.isFinite(v) ? Math.min(v, 9) : 9]; }));
}

// ---------------------------------------------------------------- feeds
// Every source is its own feed (data/feeds.mjs): it lands on its own, folds into `state` and redraws only the
// sections it enters, so a slow or failing upstream never holds back the rest. parts: 'model' (next two hours and
// substorms), 'map', 'long' (next three nights); fields: the state paths it writes, saved for the next visit;
// quiet: not named in the status line while it loads or fails.
const lean = (m) => (m ? { ok: m.ok, status: m.status, url: m.url, fetchedAt: m.fetchedAt, lastModified: m.lastModified, latencyMs: m.latencyMs, error: m.error } : null);
const tagTime = (s) => Date.parse(s + (String(s).endsWith('Z') ? '' : 'Z'));
const dstRows = (rows) => rows.map(r => ({ t: tagTime(r.time_tag), dst: +r.dst })).filter(r => Number.isFinite(r.t) && Number.isFinite(r.dst));
const HISTORY_MS = 7.5 * 86400e3; // the 7-day file plus a margin; merging every minute must not grow it without bound
function recent(rows) { const cut = Date.now() - HISTORY_MS; let i = 0; while (i < rows.length && rows[i].t < cut) i++; return i ? rows.slice(i) : rows; }

const FEEDS = [
  { id: 'propagated7', label: 'solar wind history', every: 30 * MIN, parts: ['model'], fields: ['propagated'],
    get: () => load.propagated(URLS.propagated7d),
    put: (r) => { if (!r.data.length) return false; state.propagated = recent(mergePropagated(r.data, state.propagated)); return true; } },
  { id: 'propagated', label: 'L1 solar wind', every: MIN, parts: ['model'], fields: ['propagated'],
    get: () => load.propagated(URLS.propagated1h),
    put: (r) => {
      if (!r.data.length) return false;
      // a hole since the last known minute (the tab slept, or fetches failed) is filled from the 7-day file
      const known = state.propagated.length ? state.propagated[state.propagated.length - 1].tMeasured : NaN;
      if (Number.isFinite(known) && Math.min(...r.data.map(x => x.tMeasured)) - known > 10 * MIN) scheduler.runNow('propagated7');
      state.propagated = recent(mergePropagated(state.propagated, r.data)); return true;
    } },
  { id: 'kp1m', label: 'NOAA est. Kp', every: MIN, parts: ['model'], fields: ['kp1m'], get: () => load.kp1m(), put: (r) => { if (!r.data.length) return false; state.kp1m = r.data; return true; } },
  { id: 'geospace', label: 'Geospace Kp', every: MIN, parts: ['model'], fields: ['geospaceKp'], get: () => load.geospaceKp(), put: (r) => { if (!r.data.length) return false; state.geospaceKp = r.data; return true; } },
  { id: 'geoDst', label: 'Geospace Dst', quiet: true, every: MIN, parts: ['model'], fields: ['geoDst'], get: () => load.json(URLS.geospaceDst1h), put: (r) => { const rows = Array.isArray(r.data) ? dstRows(r.data) : []; if (!rows.length) return false; state.geoDst = rows; return true; } },
  { id: 'hemi', label: 'hemispheric power', quiet: true, delay: 5e3, every: MIN, parts: [], fields: ['hemi'], get: () => load.hemiPower(), put: (r) => { if (!r.data.length) return false; state.hemi = r.data; return true; } },
  // 4.7 MB of JSON for the spacecraft name only (the L1 chip takes its time from the propagated file as well)
  { id: 'rtsw', label: 'L1 spacecraft status', quiet: true, delay: 5e3, every: 10 * MIN, parts: [], fields: ['rtsw'], get: () => load.rtsw(), put: (r) => { if (!r.data) return false; state.rtsw = r.data; return true; } },
  { id: 'stations', label: proxy.available ? 'FMI magnetometers' : 'INTERMAGNET', every: proxy.available ? MIN : 2 * MIN, parts: ['model'], fields: ['stations', 'stationSource'], afterGate: true,
    get: async () => {
      await staticReady;
      if (!proxy.available) {
        const list = await Promise.all(GIN_STATIONS.map(async s => ({ ...s, r: await ginMinute(s.code.toLowerCase(), Date.now(), 24) })));
        return { meta: (list.find(s => s.r.meta.ok) || list[0]).r.meta, list };
      }
      // the day file once per station, then the last hour to extend it (3 KB instead of 64 KB a minute)
      const now = Date.now();
      const list = await Promise.all(STATIONS.map(async s => {
        const have = state.stations.find(x => x.station === s.code)?.series;
        const len = have?.t.length && now - have.t[have.t.length - 1] < 45 * MIN ? '01' : '24';
        return { ...s, len, r: await proxy.fmiStation(s.code, len) };
      }));
      return { meta: (list.find(s => s.r.meta.ok) || list[0]).r.meta, list };
    },
    put: ({ list }) => {
      const now = Date.now(), got = [];
      for (const s of list) {
        const have = state.stations.find(x => x.station === s.code)?.series;
        let series = s.r.series && s.r.series.t.length ? s.r.series : null;
        if (series && s.len === '01') series = have ? extendSeries(have, series) : null;
        // a station that misses one poll stays in the chain with what it had, rather than blinking out
        if (!series && have?.t.length && now - have.t[have.t.length - 1] < 10 * MIN) series = have;
        if (!series) continue;
        const c = state.mag.convert(s.lat, s.lon);
        got.push({ station: s.code, mlat: c.mlat, mlon: c.mlon, series, meta: lean(s.r.meta) });
      }
      if (!list.some(s => s.r.series && s.r.series.t.length) || !got.length) return false;
      state.stations = got; state.stationSource = proxy.available ? 'FMI' : 'INTERMAGNET'; return true;
    } },
  { id: 'hp30', label: proxy.available ? 'GFZ Hp30' : 'Hp30 (iSWA mirror)', every: 2 * MIN, parts: ['model'], fields: ['hp30'],
    get: () => { const now = Date.now(); return proxy.available ? proxy.gfzIndex('Hp30', now - 7 * 86400e3, now + HOUR) : iswaHp30(now, 168); },
    put: (r) => { if (!r.data.length) return false; state.hp30 = r.data.map(x => ({ t: x.t, value: x.value ?? x.hp30 })); return true; } },
  { id: 'hpo', label: 'GFZ Hpo forecast', quiet: true, proxy: true, every: 2 * MIN, parts: ['model'], fields: ['hpo'],
    // the L1-driven run where it has values, the model mean elsewhere: aceprop holds -1 beyond its first hour, so a single
    // finite value was not enough to use it alone (the forecast then found nothing at any horizon)
    get: async () => {
      const [ace, bars] = await Promise.all([proxy.gfzHpoForecast('aceprop', 'Hp30'), proxy.gfzHpoForecast('mean_bars', 'Hp30')]);
      const byT = new Map(bars.data.map(r => [r.t, r]));
      for (const r of ace.data) if (Number.isFinite(r.median)) byT.set(r.t, r);
      return { meta: bars.meta.ok ? bars.meta : ace.meta, data: [...byT.values()].sort((a, b) => a.t - b.t) };
    },
    put: (r) => { if (!r.data.some(x => Number.isFinite(x.median))) return false; state.hpo = r.data; return true; } },
  { id: 'tormestorp', label: 'Tormestorp', proxy: true, every: 2 * MIN, parts: ['model'], fields: ['localRaw.tormestorp'],
    get: () => loadLocal.tormestorp(proxy),
    put: (r) => { if (!r.series) return false; const prev = state.localRaw.tormestorp; state.localRaw.tormestorp = { ...r, quiet: r.quiet || prev?.quiet || null, k: r.k?.length ? r.k : prev?.k || [], meta: lean(r.meta) }; return true; } },
  { id: 'hel', label: 'Hel (INTERMAGNET)', every: 2 * MIN, parts: ['model'], fields: ['localRaw.hel'],
    get: () => loadLocal.hel(Date.now()), put: (r) => { if (!r.series) return false; state.localRaw.hel = { ...r, meta: lean(r.meta) }; return true; } },
  { id: 'aurorawatch', label: 'AuroraWatch UK', every: 2 * MIN, parts: ['model'], fields: ['localRaw.aurorawatch'],
    get: () => loadLocal.aurorawatch(), put: (r) => { if (!r.status) return false; state.localRaw.aurorawatch = { ...r, meta: lean(r.meta) }; return true; } },
  // Parsed results are checked before they replace anything: a 200 with an error page or a changed layout parses to
  // nothing (OVATION to a grid of zeros), which would otherwise be stored, saved and shown as fresh.
  { id: 'ovation', label: 'OVATION', every: 5 * MIN, parts: ['model'], fields: ['ovation'], get: () => load.ovationText(), put: (r) => { if (!r.text) return false; const o = parseOvationText(r.text); if (o.rows < 7000 || !Number.isFinite(o.obsTime)) return false; state.ovation = o; return true; } },
  { id: 'ovationGrid', label: 'OVATION map', quiet: true, every: 5 * MIN, parts: ['map'], fields: ['ovationGrid'], get: () => load.json(URLS.ovationGrid), put: (r) => { if (!r.data) return false; state.ovationGrid = r.data; return true; } },
  { id: 'kyotoDst', label: 'Kyoto Dst', quiet: true, every: 15 * MIN, parts: ['model'], fields: ['kyotoDst'], get: () => load.json(URLS.kyotoDst), put: (r) => { const rows = Array.isArray(r.data) ? dstRows(r.data) : []; if (!rows.length) return false; state.kyotoDst = rows; return true; } },
  // a week of the Geospace model's Kp for the running correction against observed Hp30
  { id: 'geoWeek', label: 'Geospace Kp week', quiet: true, every: 15 * MIN, parts: ['model'], fields: ['geoWeek'], get: () => load.json(URLS.geospaceKp7d),
    put: (r) => { if (!Array.isArray(r.data)) return false; const now = Date.now(); const rows = r.data.map(x => ({ t: tagTime(x.model_prediction_time || x.time_tag), kp: +(x.k ?? x.kp) })).filter(x => Number.isFinite(x.t) && Number.isFinite(x.kp) && x.t <= now); if (!rows.length) return false; state.geoWeek = rows; return true; } },
  { id: 'tgo', label: 'TGO K-index', quiet: true, proxy: true, every: 15 * MIN, parts: ['model'], fields: ['tgo'],
    get: async () => { const site = nearestTgo(state.observer.lat, state.observer.lon); return { ...(await proxy.tgoK(site.site)), site }; },
    put: (r) => {
      if (r.site.site !== nearestTgo(state.observer.lat, state.observer.lon).site) { scheduler.runNow('tgo'); return false; } // the place changed meanwhile
      if (!(r.days && r.days.length)) return false;
      state.tgo = { site: r.site.site, name: r.site.name, days: r.days, meta: lean(r.meta) }; return true;
    } },
  { id: 'kpForecast', label: 'Kp forecast', every: 15 * MIN, parts: ['long'], fields: ['kpForecast'], get: () => load.kpForecast(), put: (r) => { if (!r.data.length) return false; state.kpForecast = r.data; return true; } },
  { id: 'geomag', label: 'NOAA storm probabilities', quiet: true, every: 15 * MIN, parts: ['long'], fields: ['geomag'], get: () => load.text(URLS.geomagForecast), put: (r) => { if (!r.text) return false; const g = parseGeomagForecast(r.text); if (!g.probabilities.length) return false; state.geomag = g; return true; } },
  { id: 'threeDay', label: 'NOAA 3-day forecast', quiet: true, every: 15 * MIN, parts: ['long'], fields: ['threeDay'], get: () => load.text(URLS.threeDay), put: (r) => { if (!r.text) return false; const t = parseThreeDayForecast(r.text); if (!t.kp.length && !t.rationale) return false; state.threeDay = t; return true; } },
  { id: 'discussion', label: 'NOAA discussion', quiet: true, every: 15 * MIN, parts: ['long'], fields: ['discussion'], get: () => load.text(URLS.discussion), put: (r) => { if (!r.text) return false; const d = parseDiscussion(r.text); if (!Number.isFinite(d.issued)) return false; state.discussion = d; return true; } },
  { id: 'outlook27', label: '27-day outlook', quiet: true, every: 15 * MIN, parts: ['long'], fields: ['outlook'], get: () => load.text(URLS.outlook27), put: (r) => { if (!r.text) return false; const o = parse27Day(r.text); if (!o.days.length) return false; state.outlook = o; return true; } },
  { id: 'alerts', label: 'NOAA alerts', quiet: true, every: 15 * MIN, parts: ['long'], fields: ['alerts'], get: () => load.json(URLS.alerts), put: (r) => { if (!Array.isArray(r.data)) return false; state.alerts = parseAlerts(r.data); return true; } },
  { id: 'scales', label: 'NOAA scales', quiet: true, every: 15 * MIN, parts: ['long'], fields: ['scales'], get: () => load.scales(), put: (r) => { if (!r.data) return false; state.scales = r.data; return true; } },
  { id: 'enlil', label: 'WSA-Enlil', every: 15 * MIN, parts: ['long'], fields: ['enlil'], get: () => load.json(URLS.enlil), put: (r) => { if (!Array.isArray(r.data)) return false; state.enlil = enlilEvents(r.data, Date.now()); return true; } },
  { id: 'donki', label: 'DONKI CMEs', every: 15 * MIN, parts: ['long'], fields: ['cmes'], get: () => loadCmes(Date.now(), 10), put: (r) => { if (!r.meta.ok) return false; state.cmes = cmeArrivals(r.data, Date.now(), { horizonDays: 5 }); return true; } },
  { id: 'flares', label: 'GOES flares', quiet: true, delay: 5e3, every: 15 * MIN, parts: [], fields: ['flares'], get: () => load.json(URLS.xrayFlares7d), put: (r) => { if (!Array.isArray(r.data)) return false; state.flares = parseFlares(r.data); return true; } },
  // CLEAR's ambient forecast only while its runs reach into the future (stopped since 2026-09-23): no 404 every cycle
  { id: 'clear', label: 'CLEAR solar wind model', quiet: true, every: 15 * MIN, parts: ['long'], fields: ['clear'], get: () => iswaClear(Date.now()), put: (r) => { if (!r.meta.ok) return false; state.clear = r.data; return true; } },
  // the solar wind one solar rotation ago as the forecast to five days ahead (WSA-Enlil's run ends a day or two out);
  // what is already here, saved or fetched, is not fetched again, so after the first week it is an hour at a time
  { id: 'recurrence', label: '27-day recurrence', quiet: true, delay: 3e3, afterGate: true, every: HOUR, parts: ['long'], fields: ['recurrence'],
    get: async () => {
      const shift = SOLAR_ROTATION_DAYS * DAY, now = Date.now();
      const need0 = Math.floor((now - shift - 12 * HOUR) / HOUR) * HOUR, need1 = Math.ceil((now - shift + 5 * DAY) / HOUR) * HOUR;
      const last = state.recurrence.length ? state.recurrence[state.recurrence.length - 1].t : NaN;
      const from = last >= need0 && last < need1 ? Math.floor(last / HOUR) * HOUR + HOUR : need0;
      const r = from < need1 ? await rtswSpeedHourly(from, need1) : { meta: { ok: true, status: 200 }, data: [] };
      return { ...r, need0 };
    },
    put: (r) => {
      if (!r.meta.ok) return false;
      const byHour = new Map([...state.recurrence, ...r.data].map(x => [x.t, x]));
      state.recurrence = [...byHour.values()].filter(x => x.t >= r.need0).sort((a, b) => a.t - b.t);
      return state.recurrence.length > 0;
    } },
  { id: 'gfzEnsemble', label: 'GFZ ensemble', proxy: true, every: 15 * MIN, parts: ['long'], fields: ['gfzEnsemble'], get: () => proxy.gfzEnsemble('Kp'), put: (r) => { if (!r.data.length) return false; state.gfzEnsemble = r.data; return true; } },
  { id: 'metoffice', label: 'UK Met Office', quiet: true, proxy: true, every: 15 * MIN, parts: ['long'], fields: ['metoffice'], get: () => proxy.metOffice(), put: (r) => { if (!r.text) return false; state.metoffice = { text: r.text, saved: r.saved }; return true; } },
  { id: 'sidc', label: 'SIDC', quiet: true, proxy: true, every: 15 * MIN, parts: ['long'], fields: ['sidc'], get: () => proxy.sidc(), put: (r) => { if (!r.text || (!r.predictions?.length && !r.geomagnetism)) return false; state.sidc = { text: r.text, predictions: r.predictions, geomagnetism: r.geomagnetism }; return true; } },
].filter(f => !f.proxy || proxy.available);

// ---------------------------------------------------------------- saved data (instant first paint)
// The next visit draws from the last data seen, then the live feeds replace it source by source. The two-hour and
// substorm sections only use saved data younger than the reach of the one-hour solar wind file, so live minutes join
// it without a hole; the three nights use saved data up to a day old. Ages are per field: data that kept failing to
// refresh is never re-stamped as new.
const KEEP_MODEL = 45 * MIN, KEEP_LONG = 24 * HOUR, FIRST_SAVE_MS = 10e3, SAVE_EVERY_MS = 15 * MIN;
const KEEP = new Map();
for (const f of FEEDS) for (const p of [...f.fields, `meta.${f.id}`]) KEEP.set(p, Math.max(KEEP.get(p) || 0, f.parts.includes('long') ? KEEP_LONG : KEEP_MODEL));
// The map only draws northern cells with a value, so only those (and the two times) are saved; of the solar wind only
// the last 12 hours (the first paint needs 6, and the 7-day file is fetched again on every visit). About 4 MB a save.
const COMPACT = {
  ovationGrid: (g) => ({ 'Observation Time': g['Observation Time'], 'Forecast Time': g['Forecast Time'], coordinates: (g.coordinates || []).filter(c => c[1] >= 0 && c[2] > 0) }),
  propagated: (rows) => rows.filter(r => r.t >= Date.now() - 12 * HOUR),
};
const fieldTimes = {}; // state path -> when its upstream last delivered it
let unsaved = false, lastSave = 0, saveTimer = null;
const bootAt = Date.now();

function hydrate(snap) {
  const entries = freshEntries(snap, Date.now(), (path) => KEEP.get(path) || 0);
  for (const e of entries) { setPath(state, e.path, e.v); fieldTimes[e.path] = e.t; }
  if (entries.some(e => e.path === 'propagated')) state.historyReady = true;
  if (entries.length) state.snapshotAt = snap.savedAt;
}
function scheduleSave() {
  if (!unsaved || saveTimer) return;
  const due = lastSave ? lastSave + SAVE_EVERY_MS : bootAt + FIRST_SAVE_MS;
  saveTimer = setTimeout(saveNow, Math.max(0, due - Date.now()));
}
function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  if (!unsaved) return;
  unsaved = false; lastSave = Date.now();
  try { writeSnapshot(buildSnapshot(state, fieldTimes, lastSave, COMPACT)); } catch (e) { console.error(e); }
}

let scheduler = null;
function onSettled(f, ok, result) {
  if (f.id === 'propagated7') state.historyReady = true; // with or without it: a failed history must not blank the forecast
  if (ok) {
    const t = Date.now();
    if (result?.meta) state.meta[f.id] = lean(result.meta);
    for (const p of [...f.fields, `meta.${f.id}`]) fieldTimes[p] = t;
    unsaved = true;
  }
  // while the page is still loading every landing shows at once; later, feeds that land together share one redraw
  invalidate(f.parts, scheduler.pending().length ? 40 : 1000);
}
const pending = (id) => { const f = scheduler?.get(id); return !!f && !f.done; };
/** 'ok' once a source's data is in (live or saved), else 'loading' until its first attempt ends, then 'failed'. */
function sourceState(id, path) {
  if (Number.isFinite(fieldTimes[path])) return 'ok';
  return pending(id) ? 'loading' : 'failed';
}

// ---------------------------------------------------------------- compute + render
function compute() {
  const now = Date.now();
  // inputs that stopped updating must not describe "now": stations silent for 20 minutes, an OVATION run over 30 old
  const stations = state.stations.filter(s => s.series?.t?.length && now - s.series.t[s.series.t.length - 1] <= 20 * MIN);
  const ovation = state.ovation && Number.isFinite(state.ovation.obsTime) && now - state.ovation.obsTime <= 30 * MIN ? state.ovation : null;
  const drive = state.propagated.filter(r => r.t >= now - 6 * HOUR).map(r => ({ t: r.t, power: r.power, ekl: r.ekl, bz: r.bz }));
  state.sub = stations.length ? substormState(stations, drive, now) : null;
  // activity level for the onset-latitude climatology: the freshest observed index, else the driving
  const hpLast = state.hp30.length ? state.hp30[state.hp30.length - 1] : null, kpLast = state.kp1m.length ? state.kp1m[state.kp1m.length - 1] : null;
  let kpLevel = hpLast && now - (hpLast.t + 30 * MIN) < 45 * MIN ? hpLast.value : kpLast && now - kpLast.t < 30 * MIN ? kpLast.kp : NaN;
  if (!Number.isFinite(kpLevel)) kpLevel = modeledKp(now);
  const arrived = state.propagated.filter(r => r.t <= now && r.t >= now - HOUR && Number.isFinite(r.coupling));
  const couplingRecent = arrived.length ? arrived.reduce((s, r) => s + r.coupling, 0) / arrived.length : NaN;
  state.substormOutlook = state.obs ? substormOutlook({ sub: state.sub, observer: state.obs, mag: state.mag, now, kp: kpLevel, ovation, couplingRecent, chainMlon: CHAIN_MLON }) : null;
  // ring current: the latest observed Kyoto Dst when it is less than three hours old, else NOAA's modeled Dst
  const kyotoLast = state.kyotoDst.filter(r => r.t <= now).slice(-1)[0], geoLast = state.geoDst.filter(r => r.t <= now).slice(-1)[0];
  state.dst = kyotoLast && now - kyotoLast.t < 3 * HOUR ? { value: kyotoLast.dst, t: kyotoLast.t, source: 'Kyoto' } : geoLast ? { value: geoLast.dst, t: geoLast.t, source: 'Geospace model' } : null;
  state.local = localSignal(state.localRaw, now);
  state.sky = skyState(now, state.observer.lat, state.observer.lon);
  // Geospace Kp corrected by the running fit against observed Hp30 (model output statistics)
  state.geoMos = state.geoWeek.length && state.hp30.length ? mosFit(pairWithHp30(state.geoWeek, state.hp30)) : null;
  const geoCorrected = state.geoMos ? state.geospaceKp.map(r => ({ ...r, kp: mosApply(state.geoMos, r.kp) })) : state.geospaceKp;
  state.fc = shortTermForecast({ now, propagated: state.propagated, ovation, kp1m: state.kp1m, geospaceKp: geoCorrected, hp30: state.hp30, hpoForecast: state.hpo,
    observer: state.obs, mag: state.mag, substorm: state.sub, coefficients: state.coefficients, outlook: state.substormOutlook, dst: state.dst ? state.dst.value : NaN, local: state.local });
}

/** Kp from the solar wind driving integrated to t, with the calibrated model the forecast uses. */
function modeledKp(t) {
  const c = state.coefficients;
  return hp30FromDriving(weightedRecentAverage(state.propagated, t, 'coupling', { minHours: 2 }).value, weightedRecentAverage(state.propagated, t, 'viscous', { minHours: 1 }).value, c?.hp30, c?.hp30_storm);
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
    for (let t = now - 6 * HOUR; t <= Math.min(now, fc.tLast); t += 10 * MIN) { const kp = modeledKp(t); if (Number.isFinite(kp)) kpHind.push({ t, kp }); }
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
}

function renderMap() {
  const g = state.ovationGrid; if (!g) return;
  polarMap(document.getElementById('map-chart'), g, state.observer, subsolarPoint(new Date())).catch(e => console.error(e));
  document.getElementById('map-note').textContent = `Forecast for ${fmt.hm(Date.parse(g['Forecast Time']))} UTC from observations at ${fmt.hm(Date.parse(g['Observation Time']))} UTC. Hemispheric power ${fmt.int(state.ovation?.hemisphericPower)} GW.`;
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
  const watches = state.alerts.filter(a => a.kind === 'watch' && !a.cancelled && !a.superseded && a.issued >= now - 3 * 86400e3);
  // the CME list was cut at fetch time and may come from saved data: arrivals more than 12 h ago are over
  const cmes = state.cmes.filter(c => c.arrival >= now - 12 * HOUR);
  const cards = state.kpForecast.length ? nightCards(now, state.kpForecast.filter(b => b.status !== 'observed' || b.t >= now - 3 * HOUR), state.geomag?.probabilities || [], state.gfzEnsemble, state.thresholds) : [];
  state.cards = cards;
  renderNights(cards, { watches, cmes, source: sourceState('kpForecast', 'kpForecast') });
  if (state.kpForecast.length) {
    kpForecastChart(document.getElementById('kp-chart'), { now, noaa: state.kpForecast.filter(b => b.t >= now - 12 * HOUR), gfz: state.gfzEnsemble, thresholds: state.thresholds, cmes, nights: cards.map(c => ({ start: c.start, end: c.end })) });
    renderLegend('kp-legend', [{ label: 'NOAA 3-h Kp (dark = predicted, light = observed)', color: 'var(--s1)' }, { label: 'GFZ ensemble median and 25–75%', color: 'var(--s2)' }, { label: 'CME arrival ±7 h with Kp range', color: 'var(--s2)', kind: 'dash' }, { label: 'your thresholds', color: 'var(--s3)', kind: 'dash' }]);
  }
  renderCmes(cmes, now, sourceState('donki', 'cmes'));
  const rec = state.recurrence.length ? recurrenceForecast(state.recurrence, now) : null;
  if (state.enlil || rec?.rows.length) {
    enlilChart(document.getElementById('enlil-chart'), state.enlil?.rows || [], state.enlil?.events || [], now, rec?.rows || []);
    renderLegend('enlil-legend', [state.enlil ? { label: 'WSA-Enlil run (NOAA)', color: 'var(--s2)' } : null, state.enlil?.rows.some(r => r.cloud > 0.1) ? { label: 'CME ejecta in the run', color: 'var(--s5)', kind: 'area' } : null, rec?.rows.length ? { label: 'the solar wind one solar rotation ago (27-day recurrence)', color: 'var(--s1)', kind: 'dash' } : null].filter(Boolean));
    const note = [];
    if (state.enlil) {
      const hss = state.enlil.events.filter(e => e.kind === 'hss' && e.peakT >= now - 6 * HOUR), cl = state.enlil.events.filter(e => e.kind === 'cme-cloud' && e.end >= now);
      note.push(`Run covers to ${fmt.dateUtc(state.enlil.horizonEnd)}.`, hss.length ? `Stream ramp ${fmt.int(hss[0].from)} → ${fmt.int(hss[0].to)} km/s peaking ${fmt.dateUtc(hss[0].peakT)}.` : 'No new high-speed stream ramp in the run.', cl.length ? `CME ejecta at Earth ${fmt.dateUtc(cl[0].start)} to ${fmt.dateUtc(cl[0].end)}.` : 'No CME ejecta in the run.');
    }
    // a rotation is 27 d 6.6 h, so the shifted hours fall at odd minutes: to the hour, which is all the precision there is
    const hr = (t) => fmt.dateUtc(Math.round(t / HOUR) * HOUR);
    if (rec?.peak) note.push(`27-day recurrence to ${hr(rec.rows[rec.rows.length - 1].t)}: ${rec.ramps.length ? `stream ramp ${fmt.int(rec.ramps[0].from)} → ${fmt.int(rec.ramps[0].to)} km/s by ${hr(rec.ramps[0].peakT)}, ` : 'no stream ramp, '}peak ${fmt.int(rec.peak.v)} km/s around ${hr(rec.peak.t)}.`);
    const clearAhead = state.clear.filter(r => r.t > now);
    if (clearAhead.length) note.push(`CLEAR ambient model peak in the next 5 days: ${fmt.int(Math.max(...clearAhead.map(r => r.speed)))} km/s.`);
    document.getElementById('enlil-note').textContent = note.join(' ');
  }
  const agreement = [];
  if (state.scales) agreement.push({ title: 'NOAA scales by day', meta: 'products/noaa-scales.json', text: state.scales.days.map(d => `${fmt.dayLocal(d.date)}: G${d.g ?? 0}`).join(' · ') + (state.geomag ? ` · storm probabilities ${state.geomag.probabilities.map(p => `${fmt.dayLocal(p.date)} G1+ ${fmt.pct(p.minor + p.moderate + p.strong)}`).join(', ')}` : '') });
  if (state.gfzEnsemble.length) { const mx = Math.max(...state.gfzEnsemble.map(r => r.median)); const pk = state.gfzEnsemble.reduce((a, b) => (b.median > a.median ? b : a)); agreement.push({ title: 'GFZ PAGER/SWIFT ensemble', meta: `72 h · updated ${fmt.dateUtc(state.meta.gfzEnsemble?.lastModified)}`, text: `Peak median Kp ${fmt.num(mx, 1)} around ${fmt.dateUtc(pk.t)}; P(Kp≥5) then ${fmt.pct(pk.pGe5)}.` }); }
  if (state.metoffice) agreement.push({ title: 'UK Met Office', meta: state.metoffice.saved ? `saved ${fmt.dateUtc(state.metoffice.saved)}` : '', text: state.metoffice.text.slice(0, 600) });
  if (state.sidc) agreement.push({ title: 'SIDC Brussels', meta: 'daily URSIGRAM', text: `${state.sidc.geomagnetism ? 'Geomagnetism: ' + state.sidc.geomagnetism + '. ' : ''}${state.sidc.predictions.map(p => `${p.day}: Ap ${p.ap}`).join(' · ')}` });
  if (state.outlook) { const ago = state.outlook.days.find(d => Math.abs(d.date - (now - 27 * 86400e3)) < 12 * HOUR); const next = state.outlook.days.filter(d => d.date >= now - 86400e3).slice(0, 5); agreement.push({ title: 'Recurrence (27-day outlook)', meta: `issued ${fmt.dateUtc(state.outlook.issued)}`, text: `${next.map(d => `${fmt.dayLocal(d.date)}: Kp max ${d.kpMax}`).join(' · ')}${ago ? ` · one rotation ago: Kp max ${ago.kpMax}` : ''}` }); }
  renderAgreement(agreement, ['scales', 'gfzEnsemble', 'metoffice', 'sidc', 'outlook27'].some(pending));
  renderAlerts(activeGeomagneticMessages(state.alerts, now), sourceState('alerts', 'alerts'));
  renderDiscussion(state.discussion, state.threeDay, sourceState('discussion', 'discussion'));
}

function renderFreshnessStrip() {
  const now = Date.now();
  const last = (arr, key = 't') => (arr && arr.length ? arr[arr.length - 1][key] : NaN);
  const l1 = [state.rtsw?.mag?.t, state.propagated.length ? state.propagated[state.propagated.length - 1].tMeasured : NaN].filter(Number.isFinite);
  const items = [
    { feed: 'propagated', label: `L1 solar wind (${state.rtsw?.mag?.source || 'NOAA'})`, t: l1.length ? Math.max(...l1) : NaN, exp: 5 },
    { feed: 'ovation', label: 'OVATION', t: state.ovation?.obsTime, exp: 20 }, { feed: 'kp1m', label: 'NOAA est. Kp', t: last(state.kp1m), exp: 10 }, { feed: 'geospace', label: 'Geospace Kp', t: state.meta.geospace?.lastModified || state.meta.geospace?.fetchedAt, exp: 10 },
    { feed: 'hp30', label: proxy.available ? 'GFZ Hp30' : 'Hp30 (iSWA mirror)', t: last(state.hp30) + 30 * MIN, exp: proxy.available ? 35 : 90 },
    { feed: 'stations', label: state.stationSource === 'INTERMAGNET' || !proxy.available ? 'INTERMAGNET' : 'FMI magnetometers', t: state.stations.length ? Math.max(...state.stations.map(s => s.series.t[s.series.t.length - 1])) : NaN, exp: 10 },
    { feed: 'tormestorp', label: 'Tormestorp', t: state.localRaw.tormestorp?.series?.t?.length ? state.localRaw.tormestorp.series.t[state.localRaw.tormestorp.series.t.length - 1] : NaN, exp: 5, hide: !proxy.available },
    { feed: 'hel', label: 'Hel (INTERMAGNET)', t: state.localRaw.hel?.series?.t?.length ? state.localRaw.hel.series.t[state.localRaw.hel.series.t.length - 1] : NaN, exp: 15 },
    { feed: 'aurorawatch', label: 'AuroraWatch UK', t: state.localRaw.aurorawatch?.updated, exp: 10 },
    { feed: 'kpForecast', label: 'Kp forecast', t: state.meta.kpForecast?.lastModified || state.meta.kpForecast?.fetchedAt, exp: 12 * 60 }, { feed: 'donki', label: 'DONKI CMEs', t: state.meta.donki?.fetchedAt, exp: 30 },
    { feed: 'enlil', label: 'WSA-Enlil', t: state.meta.enlil?.lastModified || state.meta.enlil?.fetchedAt, exp: 12 * 60 }, { feed: 'gfzEnsemble', label: 'GFZ ensemble', t: state.meta.gfzEnsemble?.lastModified || state.meta.gfzEnsemble?.fetchedAt, exp: 4 * 60, hide: !proxy.available },
  ];
  renderFreshness(items.filter(i => !i.hide).map(i => {
    const f = freshness(i.t, i.exp, now); const level = f.level === 'missing' && pending(i.feed) ? 'loading' : f.level;
    return { label: i.label, ageMin: f.age, level, title: Number.isFinite(i.t) ? new Date(i.t).toISOString() : level === 'loading' ? 'loading' : 'no data' };
  }));
}

/** One line on where the data on screen comes from: saved from the last visit, loading, live, or partly failing. */
function renderStatus() {
  if (!scheduler) return;
  const named = (list) => list.filter(f => !f.quiet).map(f => f.label);
  const waiting = named(scheduler.pending()), failing = named(scheduler.failing());
  const lastOk = Math.max(0, ...scheduler.feeds.map(f => f.lastOk));
  if (!lastOk) {
    const saved = state.snapshotAt ? `the data saved at ${fmt.hmLocal(state.snapshotAt)}` : '';
    if (scheduler.pending().length) renderDataStatus({ level: 'loading', text: saved ? `Showing ${saved} while live data loads…` : 'Loading live data…' });
    else renderDataStatus({ level: 'aging', text: `No source is answering (offline?)${saved ? `; showing ${saved}` : ''}. Retrying.` });
    return;
  }
  const text = [`Live data, updated ${fmt.hmLocal(lastOk)}`, waiting.length ? `still loading: ${waiting.join(', ')}` : '', failing.length ? `not answering, retrying: ${failing.join(', ')}` : ''].filter(Boolean).join(' · ');
  renderDataStatus({ level: failing.length ? 'aging' : waiting.length ? 'loading' : 'fresh', text });
}

// Redraws are batched: sections are marked dirty and drawn together in the next frame (none while the tab is hidden).
const dirty = new Set();
let flushTimer = null, flushDue = 0, framePending = false;
function invalidate(parts = ['model', 'long'], delay = 40) {
  for (const p of parts) dirty.add(p);
  if (framePending) return;
  const due = Date.now() + delay;
  if (flushTimer !== null) { if (due >= flushDue) return; clearTimeout(flushTimer); }
  flushDue = due;
  flushTimer = setTimeout(() => { flushTimer = null; framePending = true; requestAnimationFrame(flush); }, delay);
}
function flush() {
  framePending = false;
  const d = new Set(dirty); dirty.clear();
  if (state.obs) {
    // the two-hour model needs the solar wind history (7-day file, or saved data): an hour alone gives wrong numbers
    if (d.has('model') && state.historyReady) {
      try { compute(); renderShort(); } catch (e) { console.error(e.stack || e); renderVerdict({ ok: false, reason: String(e.message || e) }); }
      try { renderSubstorms(); } catch (e) { console.error(e.stack || e); }
    }
    if (d.has('model') || d.has('map')) { try { renderMap(); } catch (e) { console.error(e.stack || e); } }
    if (d.has('long')) { try { renderLong(); } catch (e) { console.error(e.stack || e); } }
  }
  try { renderFreshnessStrip(); } catch (e) { console.error(e.stack || e); }
  renderStatus();
  scheduleSave();
}

// ---------------------------------------------------------------- boot
function initialObserver() {
  let saved = null; try { saved = JSON.parse(localStorage.getItem('aurora.observer') || 'null'); } catch {}
  // ?lat=69.649&lon=18.956 in the URL selects a place for this load only (shareable links); otherwise the remembered one.
  const q = new URLSearchParams(location.search); const qLat = parseFloat(q.get('lat')), qLon = parseFloat(q.get('lon'));
  if (Number.isFinite(qLat) && Number.isFinite(qLon) && Math.abs(qLat) <= 90 && Math.abs(qLon) <= 180) return { lat: qLat, lon: qLon, fromUrl: true };
  return saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lon) ? { lat: saved.lat, lon: saved.lon } : { ...DEFAULT_OBSERVER };
}

let resolveStatic; const staticReady = new Promise(r => { resolveStatic = r; });

async function boot() {
  renderMethod();
  const init = initialObserver(); state.observer = { lat: init.lat, lon: init.lon }; syncLocationForm();
  let openGate; const gate = new Promise(resolve => { openGate = resolve; });
  scheduler = new FeedScheduler(FEEDS, { gate: () => gate, onSettled });
  window.__aurora = state; window.__auroraFeeds = scheduler;
  scheduler.start(); // every request goes out now; results wait at the gate until the saved data is in place
  const statics = loadStatic().then(() => { setObserver(state.observer.lat, state.observer.lon, !init.fromUrl); resolveStatic(); invalidate(['model', 'map', 'long'], 0); });
  const snap = await readSnapshot({ timeoutMs: 1000 });
  if (snap) hydrate(snap);
  openGate(); // live data flows from here; the sections draw once the magnetic grid is in (usually already)
  invalidate(['model', 'map', 'long'], 0);
  await statics;
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
  const sel = document.getElementById('place'); const { lat, lon } = state.observer;
  // compare as numbers: the option "68.350,18.830" is the place 68.35, 18.83
  const opt = [...sel.options].find(o => { const [a, b] = o.value.split(',').map(Number); return Math.abs(a - lat) < 5e-4 && Math.abs(b - lon) < 5e-4; });
  sel.value = opt ? opt.value : 'custom';
  document.getElementById('lat').value = lat; document.getElementById('lon').value = lon;
}
function applyObserver(lat, lon) {
  if (state.tgo && state.tgo.site !== nearestTgo(lat, lon).site) state.tgo = null;
  setObserver(lat, lon); syncLocationForm();
  // a place picked here replaces one that came in a shared link, also on reload
  if (location.search.includes('lat=')) try { history.replaceState(null, '', location.pathname + location.hash); } catch {}
  if (scheduler) { scheduler.runNow('tgo'); scheduler.retryFailed(); }
  invalidate(['model', 'map', 'long'], 0);
}
// picking a place shows it at once; Apply is for typed coordinates
document.getElementById('place').addEventListener('change', (e) => { if (e.target.value === 'custom') return; const [la, lo] = e.target.value.split(',').map(Number); applyObserver(la, lo); });
document.getElementById('location-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const la = parseFloat(document.getElementById('lat').value), lo = parseFloat(document.getElementById('lon').value);
  if (Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) applyObserver(la, lo);
});
document.getElementById('geolocate').addEventListener('click', () => { navigator.geolocation?.getCurrentPosition(p => applyObserver(+p.coords.latitude.toFixed(3), +p.coords.longitude.toFixed(3)), () => alert('Location not available')); });
document.getElementById('theme-toggle').addEventListener('click', () => { const root = document.documentElement; const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); root.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('aurora.theme', root.dataset.theme); } catch {} invalidate(['model', 'map', 'long'], 0); });
try { const th = localStorage.getItem('aurora.theme'); if (th) document.documentElement.dataset.theme = th; } catch {}
// charts follow the width; phones fire resize for the address bar on every scroll, which changes only the height
let lastWidth = window.innerWidth;
window.addEventListener('resize', debounce(() => { if (window.innerWidth === lastWidth) return; lastWidth = window.innerWidth; invalidate(['model', 'map', 'long'], 0); }, 250));
// background tabs throttle or freeze timers: catch up when the page is shown again, save when it is left
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { saveNow(); return; }
  if (scheduler) { scheduler.refreshStale(); scheduler.retryFailed(); }
  invalidate(['model', 'map', 'long'], 0);
});
window.addEventListener('pagehide', saveNow);
window.addEventListener('pageshow', (e) => { if (e.persisted && scheduler) { scheduler.refreshStale(); invalidate(['model', 'map', 'long'], 0); } });
window.addEventListener('online', () => scheduler?.retryFailed());
function debounce(fn, ms) { let id; return () => { clearTimeout(id); id = setTimeout(fn, ms); }; }

boot().catch(err => { console.error(err); renderVerdict({ ok: false, reason: String(err.message || err) }); });
