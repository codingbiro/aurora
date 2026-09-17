// NOAA SWPC products (services.swpc.noaa.gov). All send CORS "*" and refresh every minute.
import { fetchWithMeta, noaaTime } from './fetch-util.mjs';
import { features } from '../model/coupling.mjs';

export const NOAA = 'https://services.swpc.noaa.gov';
export const URLS = {
  propagated1h: `${NOAA}/products/geospace/propagated-solar-wind-1-hour.json`,
  propagated7d: `${NOAA}/products/geospace/propagated-solar-wind.json`,
  rtswMag: `${NOAA}/json/rtsw/rtsw_mag_1m.json`,
  rtswWind: `${NOAA}/json/rtsw/rtsw_wind_1m.json`,
  summaryMag: `${NOAA}/products/summary/solar-wind-mag-field.json`,
  summarySpeed: `${NOAA}/products/summary/solar-wind-speed.json`,
  geospaceKp1h: `${NOAA}/json/geospace/geospace_pred_est_kp_1_hour.json`,
  geospaceDst1h: `${NOAA}/json/geospace/geospace_dst_1_hour.json`,
  ovationText: `${NOAA}/text/ovation_latest_aurora_n.txt`,
  ovationGrid: `${NOAA}/json/ovation_aurora_latest.json`,
  hemiPower: `${NOAA}/text/aurora-nowcast-hemi-power.txt`,
  kp1m: `${NOAA}/json/planetary_k_index_1m.json`,
  kp3h: `${NOAA}/products/noaa-planetary-k-index.json`,
  kpForecast: `${NOAA}/products/noaa-planetary-k-index-forecast.json`,
  scales: `${NOAA}/products/noaa-scales.json`,
  geomagForecast: `${NOAA}/text/3-day-geomag-forecast.txt`,
  threeDay: `${NOAA}/text/3-day-forecast.txt`,
  discussion: `${NOAA}/text/discussion.txt`,
  outlook27: `${NOAA}/text/27-day-outlook.txt`,
  enlil: `${NOAA}/json/enlil_time_series.json`,
  alerts: `${NOAA}/products/alerts.json`,
  xrayFlares7d: `${NOAA}/json/goes/primary/xray-flares-7-day.json`,
  kyotoDst: `${NOAA}/products/kyoto-dst.json`,
};

/**
 * Propagated solar wind (array-of-arrays with a header row) -> ascending records keyed by
 * Earth arrival time: {t (arrival), tMeasured, speed, density, temperature, bx, by, bz, bt,
 * vx, vy, vz, coupling, ekl, power, viscous, pdyn}.
 */
export function parsePropagated(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return [];
  const h = arr[0]; const idx = Object.fromEntries(h.map((k, i) => [k, i]));
  const out = [];
  for (let i = 1; i < arr.length; i++) {
    const r = arr[i];
    const rec = {
      tMeasured: noaaTime(r[idx.time_tag]), t: noaaTime(r[idx.propagated_time_tag]),
      speed: num(r[idx.speed]), density: num(r[idx.density]), temperature: num(r[idx.temperature]),
      bx: num(r[idx.bx]), by: num(r[idx.by]), bz: num(r[idx.bz]), bt: num(r[idx.bt]),
      vx: num(r[idx.vx]), vy: num(r[idx.vy]), vz: num(r[idx.vz]),
    };
    if (!Number.isFinite(rec.t)) continue;
    Object.assign(rec, features(rec));
    out.push(rec);
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}
const num = (v) => (v === null || v === undefined || v === '' ? NaN : +v);

/** Merge two propagated series (7-day + 1-hour), de-duplicating on measurement time. */
export function mergePropagated(a, b) {
  const map = new Map();
  for (const r of a) map.set(r.tMeasured, r);
  for (const r of b) map.set(r.tMeasured, r);
  return [...map.values()].sort((x, y) => x.t - y.t);
}

/** Latest active-spacecraft summary from the RTSW files (which spacecraft, how old). */
export function rtswStatus(mag, wind) {
  const pick = (rows) => {
    const active = (rows || []).filter(r => r.active);
    const newest = active.length ? active[0] : (rows || [])[0];
    const sources = [...new Set((rows || []).map(r => r.source))];
    return newest ? { source: newest.source, active: newest.active, t: noaaTime(newest.time_tag), quality: newest.overall_quality, sources } : null;
  };
  return { mag: pick(mag), wind: pick(wind) };
}

/** json/planetary_k_index_1m.json -> ascending [{t, kp, kpIndex}] */
export function parseKp1m(rows) {
  return rows.map(r => ({ t: noaaTime(r.time_tag), kp: +r.estimated_kp, kpIndex: r.kp_index })).filter(r => Number.isFinite(r.t)).sort((a, b) => a.t - b.t);
}

/** json/geospace/geospace_pred_est_kp_1_hour.json -> ascending [{t, kp}] */
export function parseGeospaceKp(rows) {
  return rows.map(r => ({ t: noaaTime(r.model_prediction_time), kp: +r.k })).filter(r => Number.isFinite(r.t)).sort((a, b) => a.t - b.t);
}

/** text/aurora-nowcast-hemi-power.txt -> ascending [{tObs, tForecast, north, south}] */
export function parseHemiPower(txt) {
  const out = [];
  for (const line of txt.split('\n')) {
    const m = line.match(/^(\d{4}-\d{2}-\d{2})_(\d{2}:\d{2})\s+(\d{4}-\d{2}-\d{2})_(\d{2}:\d{2})\s+(\d+)\s+(\d+)/);
    if (m) out.push({ tObs: Date.parse(`${m[1]}T${m[2]}:00Z`), tForecast: Date.parse(`${m[3]}T${m[4]}:00Z`), north: +m[5], south: +m[6] });
  }
  return out;
}

/** products/noaa-planetary-k-index-forecast.json -> ascending [{t, kp, status, scale}] */
export function parseKpForecast(rows) {
  return rows.map(r => ({ t: noaaTime(r.time_tag), kp: +r.kp, status: r.observed, scale: r.noaa_scale || null })).filter(r => Number.isFinite(r.t)).sort((a, b) => a.t - b.t);
}

/** products/noaa-planetary-k-index.json -> ascending [{t, kp}] (3-hour) */
export function parseKp3h(rows) {
  return rows.map(r => ({ t: noaaTime(r.time_tag), kp: +r.Kp })).filter(r => Number.isFinite(r.t)).sort((a, b) => a.t - b.t);
}

/** products/noaa-scales.json -> {now: {g, ...}, days: [{date, g, gText}]} */
export function parseScales(obj) {
  const day = (k) => { const d = obj[k]; return d ? { date: Date.parse(`${d.DateStamp}T00:00:00Z`), g: d.G && d.G.Scale !== null ? +d.G.Scale : null, gText: d.G?.Text, r: d.R, s: d.S } : null; };
  return { yesterday: day('-1'), now: day('0'), days: ['1', '2', '3'].map(day).filter(Boolean) };
}

/** json/goes/primary/xray-flares-7-day.json -> [{t, cls, peak, begin, end}] newest last */
export function parseFlares(rows) {
  return rows.map(r => ({ t: noaaTime(r.max_time || r.time_tag), cls: r.max_class, begin: noaaTime(r.begin_time), end: noaaTime(r.end_time) }))
    .filter(r => Number.isFinite(r.t)).sort((a, b) => a.t - b.t);
}

/** Convenience loaders returning {meta, data}. */
export const load = {
  async propagated(url = URLS.propagated1h) { const m = await fetchWithMeta(url); return { meta: m, data: m.ok ? parsePropagated(m.body) : [] }; },
  async kp1m() { const m = await fetchWithMeta(URLS.kp1m); return { meta: m, data: m.ok ? parseKp1m(m.body) : [] }; },
  async geospaceKp() { const m = await fetchWithMeta(URLS.geospaceKp1h); return { meta: m, data: m.ok ? parseGeospaceKp(m.body) : [] }; },
  async hemiPower() { const m = await fetchWithMeta(URLS.hemiPower, { as: 'text' }); return { meta: m, data: m.ok ? parseHemiPower(m.body) : [] }; },
  async ovationText() { const m = await fetchWithMeta(URLS.ovationText, { as: 'text' }); return { meta: m, text: m.ok ? m.body : null }; },
  async kpForecast() { const m = await fetchWithMeta(URLS.kpForecast); return { meta: m, data: m.ok ? parseKpForecast(m.body) : [] }; },
  async kp3h() { const m = await fetchWithMeta(URLS.kp3h); return { meta: m, data: m.ok ? parseKp3h(m.body) : [] }; },
  async scales() { const m = await fetchWithMeta(URLS.scales); return { meta: m, data: m.ok ? parseScales(m.body) : null }; },
  async text(url) { const m = await fetchWithMeta(url, { as: 'text' }); return { meta: m, text: m.ok ? m.body : null }; },
  async json(url) { const m = await fetchWithMeta(url); return { meta: m, data: m.ok ? m.body : null }; },
  async summary() {
    const [mag, spd] = await Promise.all([fetchWithMeta(URLS.summaryMag), fetchWithMeta(URLS.summarySpeed)]);
    const m = mag.ok && Array.isArray(mag.body) ? mag.body[0] : null, s = spd.ok && Array.isArray(spd.body) ? spd.body[0] : null;
    return { meta: mag, data: m ? { t: noaaTime(m.time_tag), bt: +m.bt, bz: +m.bz_gsm, speed: s ? +s.proton_speed : NaN } : null };
  },
  async rtsw() {
    const [mag, wind] = await Promise.all([fetchWithMeta(URLS.rtswMag), fetchWithMeta(URLS.rtswWind)]);
    return { meta: mag, data: mag.ok && wind.ok ? rtswStatus(mag.body, wind.body) : null };
  },
};
