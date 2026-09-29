// HAPI servers with CORS "*": NASA iSWA (GFZ Hp30 mirror, CLEAR ambient forecast) and
// INTERMAGNET GIN (1-minute observatory data, CC BY-NC 4.0).
import { fetchWithMeta } from './fetch-util.mjs';

export const ISWA = 'https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi';
export const GIN = 'https://imag-data.bgs.ac.uk/GIN_V1/hapi';

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

export async function hapiData(base, id, tMin, tMax, extra = '') {
  const url = `${base}/data?id=${encodeURIComponent(id)}&time.min=${iso(tMin)}&time.max=${iso(tMax)}&format=json${extra}`;
  const m = await fetchWithMeta(url, { timeoutMs: 30000 });
  return { meta: m, data: m.ok ? m.body : null };
}

/** GFZ Hp30 via iSWA (about 50 min behind GFZ's own feed) -> ascending [{t, hp30, ap30}] */
export async function iswaHp30(now = Date.now(), hoursBack = 72) {
  const r = await hapiData(ISWA, 'gfz_obs_geo_30m_indices', now - hoursBack * 3600e3, now + 3600e3);
  const rows = (r.data && r.data.data) || [];
  return { meta: r.meta, data: rows.map(x => ({ t: Date.parse(x[0]), hp30: x[1] === null ? NaN : +x[1], ap30: x[2] })).filter(x => Number.isFinite(x.hp30)) };
}

/** A dataset's time coverage from its HAPI info: {meta, start, stop} (ms). */
export async function hapiInfo(base, id) {
  const m = await fetchWithMeta(`${base}/info?id=${encodeURIComponent(id)}`);
  const ok = m.ok && m.body && typeof m.body === 'object';
  return { meta: m, start: ok ? Date.parse(m.body.startDate) : NaN, stop: ok ? Date.parse(m.body.stopDate) : NaN };
}

/**
 * CLEAR ambient solar wind forecast at Earth -> ascending [{t, speed, density, bz, bmag}]. The data are only requested
 * while the latest run still reaches into the future: CLEAR's runs stopped on 2026-09-23 (every request since is a
 * 404), and a stopped dataset answers {meta (ok), data: [], stoppedAt} so the dashboard shows nothing instead of
 * retrying, and picks the forecast up again once runs resume.
 */
export async function iswaClear(now = Date.now()) {
  const info = await hapiInfo(ISWA, 'CLEAR_daily_forecast_sw_P1H');
  if (!info.meta.ok) return { meta: info.meta, data: [] };
  if (!(info.stop > now)) return { meta: info.meta, data: [], stoppedAt: info.stop };
  // HAPI returns the requested parameters in the dataset's own order: Time, density, bulk_speed, b_mag, bz
  const r = await hapiData(ISWA, 'CLEAR_daily_forecast_sw_P1H', now - 2 * 86400e3, now + 6 * 86400e3, '&parameters=Time,density,bulk_speed,b_mag,bz');
  const rows = (r.data && r.data.data) || [];
  const names = (r.data && r.data.parameters || []).map(p => p.name);
  const col = (n, fallback) => { const i = names.indexOf(n); return i >= 0 ? i : fallback; };
  const iN = col('density', 1), iV = col('bulk_speed', 2), iB = col('b_mag', 3), iZ = col('bz', 4);
  return { meta: r.meta, data: rows.map(x => ({ t: Date.parse(x[0]), speed: +x[iV], density: +x[iN] * 1e24 / 1.6726, bz: +x[iZ], bmag: +x[iB] })).filter(x => Number.isFinite(x.speed)) };
}

/**
 * Hourly means of "time,value" CSV rows (HAPI csv with one parameter) -> ascending [{t (middle of the hour), v, n}].
 * Fill values (-9999, blanks) are skipped and hours with fewer than `minSamples` minutes are dropped.
 */
export function hourlyMeans(csv, minSamples = 20) {
  const bins = new Map();
  for (const line of csv.split('\n')) {
    const i = line.indexOf(','); if (i < 0) continue;
    const t = Date.parse(line.slice(0, i)), v = parseFloat(line.slice(i + 1));
    if (!Number.isFinite(t) || !Number.isFinite(v) || v < 0) continue;
    const h = Math.floor(t / 3600e3) * 3600e3; const b = bins.get(h) || { s: 0, n: 0 };
    b.s += v; b.n++; bins.set(h, b);
  }
  return [...bins.entries()].filter(([, b]) => b.n >= minSamples).sort((a, b) => a[0] - b[0]).map(([h, b]) => ({ t: h + 1800e3, v: b.s / b.n, n: b.n }));
}

/**
 * Measured solar wind speed at L1, hourly means, from NOAA's real-time solar wind archive on iSWA (primary
 * spacecraft, back to 2000; about 27 bytes per minute, so a week is ~270 KB): {meta, data: [{t, v, n}]}.
 */
export async function rtswSpeedHourly(tMin, tMax) {
  const url = `${ISWA}/data?id=swpc_rtsw_plasma_P1M&time.min=${iso(tMin)}&time.max=${iso(tMax)}&parameters=BulkSpeed&format=csv`;
  const m = await fetchWithMeta(url, { as: 'text', timeoutMs: 30000 });
  return { meta: m, data: m.ok ? hourlyMeans(m.body) : [] };
}

/**
 * INTERMAGNET GIN 1-minute XYZF for an observatory (lower-case IAGA code), best available data.
 * Returns {meta, series: {t, x, y, z}}.
 */
export async function ginMinute(obs, now = Date.now(), hoursBack = 24) {
  const id = `${obs.toLowerCase()}/best-avail/PT1M/xyzf`;
  const r = await hapiData(GIN, id, now - hoursBack * 3600e3, now);
  const rows = (r.data && r.data.data) || [];
  const series = { t: [], x: [], y: [], z: [] };
  for (const row of rows) {
    const v = Array.isArray(row[1]) ? row[1] : row.slice(1, 4);
    if (!(Math.abs(+v[0]) < 90000)) continue;
    series.t.push(Date.parse(row[0])); series.x.push(+v[0]); series.y.push(+v[1]); series.z.push(+v[2]);
  }
  return { meta: r.meta, series };
}
