// Aurora Nowcast: orchestration of data polling, models and rendering.
import { load, URLS, mergePropagated, parseFlares } from './data/noaa.mjs';
import { fetchWithMeta, freshness, minutesAgo } from './data/fetch-util.mjs';
import { loadCmes } from './data/donki.mjs';
import { iswaHp30, iswaClear, ginMinute } from './data/hapi.mjs';
import { ProxyClient } from './data/proxied.mjs';
import { MagneticCoordinates } from './model/magcoords.mjs';
import { parseOvationText, kpForBoundary, VIEW_ALLOWANCE_DEG } from './model/oval.mjs';
import { substormState, toMinutes, quietBaseline } from './model/substorm.mjs';
import { shortTermForecast } from './model/shortterm.mjs';
import { weightedRecentAverage } from './model/integrate.mjs';
import { kpFromDriving } from './model/activity.mjs';
import { parseGeomagForecast, parseThreeDayForecast, parseDiscussion, parse27Day, parseAlerts, activeGeomagneticMessages, cmeArrivals, enlilEvents, nightCards } from './model/longterm.mjs';
import { timelineChart, boundaryChart, substormChart, kpForecastChart, enlilChart } from './ui/charts.mjs';
import { polarMap, subsolarPoint } from './ui/map.mjs';
import { renderVerdict, renderTiles, renderFreshness, renderNights, renderCmes, renderAlerts, renderAgreement, renderDiscussion, renderHorizonTable, renderLegend, renderMethod } from './ui/panels.mjs';
import { fmt } from './ui/format.mjs';

const MIN = 60e3, HOUR = 3600e3;
const cfg = window.AURORA_CONFIG || {};
const proxy = new ProxyClient(cfg.apiBase === '' ? location.origin : (cfg.apiBase && !cfg.apiBase.includes('PLACEHOLDER') ? cfg.apiBase : null));
const STATIONS = [
  { code: 'KEV', lat: 69.76, lon: 27.01 }, { code: 'MUO', lat: 68.02, lon: 23.53 }, { code: 'PEL', lat: 66.90, lon: 24.08 },
  { code: 'OUJ', lat: 64.52, lon: 27.23 }, { code: 'HAN', lat: 62.25, lon: 26.60 }, { code: 'NUR', lat: 60.50, lon: 24.65 },
];

const state = {
  observer: { lat: 55.676, lon: 12.568 }, mag: null, obs: null, coefficients: null,
  propagated: [], ovation: null, ovationGrid: null, kp1m: [], geospaceKp: [], hemi: [], hp30: [], hpo: [], stations: [], rtsw: null,
  kpForecast: [], geomag: null, threeDay: null, discussion: null, outlook: null, alerts: [], scales: null, enlil: null, cmes: [], gfzEnsemble: [], clear: [], metoffice: null, sidc: null, flares: [],
  meta: {}, sub: null, fc: null,
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
  try { localStorage.setItem('aurora.observer', JSON.stringify(state.observer)); } catch {}
}

// ---------------------------------------------------------------- polling groups
async function pollFast() {
  const [p1, kp, geo, hemi, summary] = await Promise.all([load.propagated(URLS.propagated1h), load.kp1m(), load.geospaceKp(), load.hemiPower(), load.rtsw()]);
  state.meta.propagated = p1.meta; if (p1.data.length) state.propagated = mergePropagated(state.propagated, p1.data);
  state.meta.kp1m = kp.meta; if (kp.data.length) state.kp1m = kp.data;
  state.meta.geospace = geo.meta; if (geo.data.length) state.geospaceKp = geo.data;
  state.meta.hemi = hemi.meta; if (hemi.data.length) state.hemi = hemi.data;
  if (summary.data) state.rtsw = summary.data;
  if (proxy.available) {
    const now = Date.now();
    const st = await Promise.all(STATIONS.map(async s => { const r = await proxy.fmiStation(s.code, '24'); return { station: s.code, mlat: state.mag.convert(s.lat, s.lon).mlat, series: r.series, meta: r.meta }; }));
    if (st.some(s => s.series && s.series.t.length)) { state.stations = st.filter(s => s.series && s.series.t.length); state.meta.fmi = st.find(s => s.meta.ok)?.meta || st[0].meta; }
  }
}

async function pollHp30() {
  const now = Date.now();
  if (proxy.available) {
    const r = await proxy.gfzIndex('Hp30', now - 3 * 86400e3, now + HOUR);
    state.meta.hp30 = r.meta; if (r.data.length) state.hp30 = r.data.map(x => ({ t: x.t, value: x.value }));
    const f = await proxy.gfzHpoForecast('aceprop', 'Hp30');
    if (!f.data.length || !f.data.some(x => Number.isFinite(x.median))) { const g = await proxy.gfzHpoForecast('mean_bars', 'Hp30'); state.hpo = g.data; state.meta.hpo = g.meta; } else { state.hpo = f.data; state.meta.hpo = f.meta; }
  } else {
    const r = await iswaHp30(now, 72); state.meta.hp30 = r.meta; if (r.data.length) state.hp30 = r.data.map(x => ({ t: x.t, value: x.hp30 }));
    // browser-only substorm fallback: INTERMAGNET NUR and HRN (CC BY-NC, 4-min lag)
    const gin = await Promise.all([['nur', 60.5, 24.65], ['hrn', 77.0, 15.55]].map(async ([code, la, lo]) => { const g = await ginMinute(code, now, 24); return { station: code.toUpperCase(), mlat: state.mag.convert(la, lo).mlat, series: g.series, meta: g.meta }; }));
    if (gin.some(s => s.series.t.length)) { state.stations = gin.filter(s => s.series.t.length); state.meta.fmi = gin[0].meta; state.stationSource = 'INTERMAGNET'; }
  }
}

async function pollOvation() {
  const [txt, grid] = await Promise.all([load.ovationText(), load.json(URLS.ovationGrid)]);
  state.meta.ovation = txt.meta; if (txt.text) state.ovation = parseOvationText(txt.text);
  if (grid.data) state.ovationGrid = grid.data;
}

async function pollSlow() {
  const now = Date.now();
  const [kpf, geomag, three, disc, out, alerts, scales, enlil, cmes, flares] = await Promise.all([
    load.kpForecast(), load.text(URLS.geomagForecast), load.text(URLS.threeDay), load.text(URLS.discussion), load.text(URLS.outlook27), load.json(URLS.alerts), load.scales(), load.json(URLS.enlil), loadCmes(now, 10), load.json(URLS.xrayFlares7d),
  ]);
  state.meta.kpForecast = kpf.meta; if (kpf.data.length) state.kpForecast = kpf.data;
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
  if (proxy.available) {
    const [ens, mo, sidc] = await Promise.all([proxy.gfzEnsemble('Kp'), proxy.metOffice(), proxy.sidc()]);
    state.meta.gfzEnsemble = ens.meta; if (ens.data.length) state.gfzEnsemble = ens.data;
    state.metoffice = mo.text ? mo : null; state.sidc = sidc.text ? sidc : null;
  }
}

// ---------------------------------------------------------------- compute + render
function compute() {
  const now = Date.now();
  const drive = state.propagated.filter(r => r.t >= now - 6 * HOUR).map(r => ({ t: r.t, power: r.power, ekl: r.ekl, bz: r.bz }));
  state.sub = state.stations.length ? substormState(state.stations, drive, now) : null;
  state.fc = shortTermForecast({ now, propagated: state.propagated, ovation: state.ovation, kp1m: state.kp1m, geospaceKp: state.geospaceKp, hp30: state.hp30, hpoForecast: state.hpo,
    observer: state.obs, mag: state.mag, substorm: state.sub, coefficients: state.coefficients });
}

function renderShort() {
  const now = Date.now(); const fc = state.fc;
  const kpObs = state.kp1m.length ? state.kp1m[state.kp1m.length - 1].kp : NaN;
  const hp30 = state.hp30.length ? state.hp30[state.hp30.length - 1].value : NaN;
  renderVerdict(fc, state.obs, state.mag, { thresholds: state.thresholds, kpObs, hp30 });
  renderTiles(fc);
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
    boundaryChart(document.getElementById('boundary-chart'), fc.horizons, state.obs.mlat, VIEW_ALLOWANCE_DEG);
  }
  // substorm
  const subBox = document.getElementById('substorm-chart'), subNote = document.getElementById('substorm-note');
  if (state.sub && state.sub.stations.length) {
    const rows = state.stations.map(s => { const minute = toMinutes(s.series); const base = quietBaseline(minute.x); const st = state.sub.stations.find(x => x.station === s.station); return { station: s.station, mlat: s.mlat, minutes: { t: minute.t, dev: minute.x.map(v => v - base) }, onsets: st ? st.onsets : [] }; });
    substormChart(subBox, rows, now, state.sub.lastOnset?.t);
    subNote.textContent = `Phase: ${state.sub.phase}. ${state.sub.lastOnset ? `Last onset ${fmt.hm(state.sub.lastOnset.t)} UTC at ${state.sub.lastOnset.stations.join(', ')}.` : 'No onset in the last day.'} Merging field ${fmt.num(state.sub.ekl, 2)} mV/m, Bz southward for ${state.sub.minutesSouthward} min. Chance of a new onset: ${fmt.pct(state.sub.pOnset30)} in 30 min, ${fmt.pct(state.sub.pOnset60)} in 60 min.${state.stationSource === 'INTERMAGNET' ? ' Source: INTERMAGNET (proxy unavailable).' : ''}`;
  } else { subBox.replaceChildren(); subNote.textContent = proxy.available ? 'Magnetometer data not available yet.' : 'No proxy configured: magnetometer feeds need the Worker (or INTERMAGNET fallback).'; }
  // map
  if (state.ovationGrid) {
    polarMap(document.getElementById('map-chart'), state.ovationGrid, state.observer, subsolarPoint(new Date(now)));
    document.getElementById('map-note').textContent = `Forecast for ${fmt.hm(Date.parse(state.ovationGrid['Forecast Time']))} UTC from observations at ${fmt.hm(Date.parse(state.ovationGrid['Observation Time']))} UTC. Hemispheric power ${fmt.int(state.ovation?.hemisphericPower)} GW.`;
  }
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
    { label: 'Kp forecast', t: state.meta.kpForecast?.lastModified || state.meta.kpForecast?.fetchedAt, exp: 12 * 60 }, { label: 'DONKI CMEs', t: state.meta.donki?.fetchedAt, exp: 30 },
    { label: 'WSA-Enlil', t: state.meta.enlil?.lastModified, exp: 12 * 60 }, { label: 'GFZ ensemble', t: state.meta.gfzEnsemble?.lastModified, exp: 4 * 60, hide: !proxy.available },
  ];
  renderFreshness(items.filter(i => !i.hide).map(i => { const f = freshness(i.t, i.exp, now); return { label: i.label, ageMin: f.age, level: f.level, title: Number.isFinite(i.t) ? new Date(i.t).toISOString() : 'no data' }; }));
}

function renderAll() { try { compute(); renderShort(); } catch (e) { console.error(e); renderVerdict({ ok: false, reason: String(e.message || e) }); } try { renderLong(); } catch (e) { console.error(e); } renderFreshnessStrip(); }

// ---------------------------------------------------------------- boot
async function boot() {
  renderMethod();
  await loadStatic();
  let saved = null; try { saved = JSON.parse(localStorage.getItem('aurora.observer') || 'null'); } catch {}
  const init = saved && Number.isFinite(saved.lat) ? saved : { lat: 55.676, lon: 12.568 };
  setObserver(init.lat, init.lon); syncLocationForm();
  const seven = await load.propagated(URLS.propagated7d); state.meta.propagated7 = seven.meta; state.propagated = seven.data;
  await Promise.all([pollFast(), pollOvation(), pollHp30(), pollSlow()]);
  renderAll();
  setInterval(async () => { await pollFast(); renderAll(); }, 60e3);
  setInterval(async () => { await pollOvation(); renderAll(); }, 5 * 60e3);
  setInterval(async () => { await pollHp30(); renderAll(); }, 2 * 60e3);
  setInterval(async () => { await pollSlow(); renderAll(); }, 15 * 60e3);
  window.addEventListener('resize', debounce(renderAll, 250));
  window.__aurora = state;
}

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
