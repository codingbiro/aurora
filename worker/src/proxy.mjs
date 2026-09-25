// Allow-listed proxy for upstream feeds that send no CORS headers. Shared between the
// Cloudflare Worker (worker/src/index.mjs) and the local Node dev server (scripts/dev-server.mjs).

const FMI_STATIONS = new Set(['KEV', 'MAS', 'KIL', 'IVA', 'MUO', 'PEL', 'RAN', 'OUJ', 'MEK', 'HAN', 'NUR', 'TAR']);
const GFZ_INDICES = new Set(['Kp', 'Hp30', 'Hp60', 'ap30', 'ap60', 'ap', 'Ap']);
const HPO_MODELS = new Set(['aceprop', 'enlil', 'euhforia', 'swpc', 'mean', 'mean_bars', 'mean_bars_dark']);
const HPO_INDICES = new Set(['Hp30', 'Hp60', 'Kp']);
const TGO_SITES = new Set(['tro2a', 'and1a', 'bjn1a', 'nal1a', 'dob1a', 'bfe6d', 'lrv1a']);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/** Route table: {match, upstream(match, url) -> URL string or null, ttl seconds, type, attribution}. */
export const ROUTES = [
  {
    match: /^\/api\/gfz\/index$/, ttl: 60, type: 'application/json', attribution: 'GFZ Potsdam, CC BY 4.0',
    upstream: (_m, u) => {
      const index = u.searchParams.get('index'), start = u.searchParams.get('start'), end = u.searchParams.get('end');
      if (!GFZ_INDICES.has(index) || !ISO.test(start || '') || !ISO.test(end || '')) return null;
      return `https://kp.gfz.de/app/json/?start=${start}&end=${end}&index=${index}`;
    },
  },
  {
    match: /^\/api\/gfz\/hpo-forecast$/, ttl: 600, type: 'application/json', attribution: 'GFZ Potsdam Hpo forecast',
    upstream: (_m, u) => {
      const model = u.searchParams.get('model') || 'mean_bars', index = u.searchParams.get('index') || 'Hp30';
      if (!HPO_MODELS.has(model) || !HPO_INDICES.has(index)) return null;
      return `https://isdc-data.gfz.de/geomagnetism/HpoForecast/v0102/output/Hpo/json/hpo_forecast_${model}_${index}.json`;
    },
  },
  {
    match: /^\/api\/gfz\/ensemble$/, ttl: 900, type: 'application/json', attribution: 'GFZ Potsdam SWIFT/PAGER ensemble',
    upstream: (_m, u) => {
      const index = u.searchParams.get('index') || 'Kp';
      if (index === 'Kp') return 'https://spaceweather.gfz.de/fileadmin/Kp-Forecast/CSV/kp_product_file_FORECAST_PAGER_SWIFT_LAST.json';
      if (index === 'Hp30') return 'https://spaceweather.gfz.de/fileadmin/SW-Monitor/hp30_product_file_FORECAST_HP30_SWIFT_DRIVEN_LAST.json';
      if (index === 'Hp60') return 'https://spaceweather.gfz.de/fileadmin/SW-Monitor/hp60_product_file_FORECAST_HP60_SWIFT_DRIVEN_LAST.json';
      return null;
    },
  },
  {
    match: /^\/api\/fmi\/([A-Z]{3})\/(01|24)$/, ttl: 55, type: 'text/plain', attribution: 'Finnish Meteorological Institute, IMAGE network, CC BY 4.0',
    upstream: (m) => (FMI_STATIONS.has(m[1]) ? `https://space.fmi.fi/image/realtime/UT/${m[1]}/${m[1]}data_${m[2]}.txt` : null),
  },
  {
    match: /^\/api\/irf\/kiruna$/, ttl: 120, type: 'text/plain', attribution: 'Swedish Institute of Space Physics, Kiruna (provisional)',
    upstream: () => 'https://www2.irf.se/maggraphs/rt_iaga_last_hour_secondary.txt',
  },
  {
    // Tormestorp (56.0 N 13.9 E) 1-second variometer: only the tail of today's file (the last ~2.5 hours) is fetched, with a Range header.
    match: /^\/api\/irf\/tormestorp\/tail$/, ttl: 60, type: 'text/plain', attribution: 'Swedish Institute of Space Physics, Tormestorp (provisional)',
    upstream: () => { const d = new Date(); const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), dd = String(d.getUTCDate()).padStart(2, '0'); return `https://www2.irf.se/maggraphs/tormestorp/${y}/${m}/${dd}/lnd_${y}${m}${dd}000000.csv`; },
    headers: { Range: 'bytes=-400000' }, cacheKeyExtra: 'tail',
  },
  {
    match: /^\/api\/irf\/tormestorp\/quiet$/, ttl: 3600, type: 'text/plain', attribution: 'Swedish Institute of Space Physics, Tormestorp (quiet-day curve)',
    upstream: () => 'https://www2.irf.se/maggraphs/tormestorp/quiet_day_ascii',
  },
  {
    match: /^\/api\/irf\/tormestorp\/k$/, ttl: 120, type: 'text/plain', attribution: 'Swedish Institute of Space Physics, Tormestorp (provisional K)',
    upstream: () => 'https://www2.irf.se/maggraphs/tormestorp/get_kindex_tormestorp.php',
  },
  {
    match: /^\/api\/tgo\/k\/([a-z0-9]{5})$/, ttl: 600, type: 'text/plain', attribution: 'Tromsø Geophysical Observatory, UiT (provisional K-indices)',
    upstream: (m) => (TGO_SITES.has(m[1]) ? `https://flux.phys.uit.no/Kindice/k_${m[1]}.txt` : null),
  },
  {
    match: /^\/api\/metoffice\/overview$/, ttl: 600, type: 'application/json', attribution: 'UK Met Office, Crown copyright',
    upstream: () => 'https://data.consumer-digital.api.metoffice.gov.uk/v1/space-weather/forecast-overview',
  },
  {
    match: /^\/api\/sidc\/ursigram$/, ttl: 1800, type: 'text/plain', attribution: 'SIDC / Royal Observatory of Belgium',
    upstream: () => 'https://www.sidc.be/spaceweatherservices/managed/services/archive/product/meu/latest',
  },
];

const memoryCache = new Map(); // upstream url -> {expires, status, type, body, lastModified, fetchedAt}

export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env && env.ALLOWED_ORIGINS ? String(env.ALLOWED_ORIGINS) : '*').split(',').map(s => s.trim()).filter(Boolean);
  const allow = allowed.includes('*') ? '*' : (allowed.includes(origin) ? origin : allowed[0] || '');
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-Upstream-Last-Modified, X-Proxy-Cache, X-Proxy-Fetched-At, X-Attribution', 'Vary': 'Origin' };
}

/** Handle an /api request and return a Response. `env` may carry ALLOWED_ORIGINS. */
export async function handleApi(request, env = {}) {
  const url = new URL(request.url);
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  if (url.pathname === '/api/sighting' && request.method === 'POST') return recordSighting(request, env, cors);
  if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, cors);
  if (url.pathname === '/api/health') return json({ ok: true, time: new Date().toISOString(), routes: ROUTES.length, cached: memoryCache.size }, 200, cors);
  if (url.pathname === '/api/state' && env.SNAP) {
    const state = await env.SNAP.get('state:latest');
    return new Response(state || 'null', { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (url.pathname === '/api/trail') return forecastLog(url, env, cors);
  if (url.pathname === '/api/sightings') return listSightings(request, url, env, cors);

  for (const route of ROUTES) {
    const m = url.pathname.match(route.match);
    if (!m) continue;
    const upstream = route.upstream(m, url);
    if (!upstream) return json({ error: 'bad parameters' }, 400, cors);
    const now = Date.now();
    const cacheId = route.cacheKeyExtra ? `${upstream}#${route.cacheKeyExtra}` : upstream;
    const hit = memoryCache.get(cacheId);
    if (hit && hit.expires > now) return respond(hit, route, cors, 'HIT', now);
    const edge = await edgeCacheGet(cacheId, route, now);
    if (edge) { memoryCache.set(cacheId, edge); return respond(edge, route, cors, 'EDGE', now); }
    try {
      const res = await fetch(upstream, { headers: { 'User-Agent': 'aurora-dashboard/1.0 (+https://github.com/codingbiro/aurora)', 'Accept': '*/*', ...(route.headers || {}) }, redirect: 'follow' });
      if (!res.ok) { // 206 Partial Content counts as ok
        if (hit) return respond(hit, route, cors, 'STALE', now);
        return json({ error: `upstream ${res.status}`, upstream }, 502, cors);
      }
      const body = await res.arrayBuffer();
      const entry = { expires: now + route.ttl * 1000, status: 200, type: route.type, body, lastModified: res.headers.get('last-modified') || '', fetchedAt: now };
      memoryCache.set(cacheId, entry);
      pruneCache();
      await edgeCachePut(cacheId, entry, route);
      return respond(entry, route, cors, 'MISS', now);
    } catch (err) {
      if (hit) return respond(hit, route, cors, 'STALE', now);
      return json({ error: 'upstream fetch failed', detail: String((err && err.message) || err), upstream }, 502, cors);
    }
  }
  return json({ error: 'not found' }, 404, cors);
}

/** The cron's forecast log for the last `days` days (max 60): {days: {YYYY-MM-DD: rows}, columns}. */
async function forecastLog(url, env, cors) {
  if (!env.SNAP) return json({ error: 'no store' }, 404, cors);
  const days = Math.min(60, Math.max(1, +(url.searchParams.get('days') || 14)));
  const out = {};
  const today = Date.now();
  for (let i = 0; i < days; i++) {
    const date = new Date(today - i * 86400e3).toISOString().slice(0, 10);
    const rows = await env.SNAP.get(`fc:${date}`, 'json');
    if (rows && rows.length) out[date] = rows;
  }
  return json({ columns: ['time', 'place', 'lead', 'centre', 'sigma', 'pCamera', 'pEyeDark', 'pEyeCity', 'pOverhead', 'kpModel', 'anchorHp30', 'anchorAgeMin', 'dst', 'auroraWatch', 'tormestorpK', 'mlt'], days: out }, 200, cors);
}

function sightingAuth(request, env) {
  const token = String(env.SIGHTING_TOKEN || '').trim();
  if (!token) return 'unconfigured';
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${token}` ? 'ok' : 'denied';
}

/** POST /api/sighting {t?, lat, lon, seen: 'eye'|'camera'|'none', note?} with Authorization: Bearer SIGHTING_TOKEN. */
async function recordSighting(request, env, cors) {
  const auth = sightingAuth(request, env);
  if (auth === 'unconfigured') return json({ error: 'SIGHTING_TOKEN not set' }, 404, cors);
  if (auth !== 'ok') return json({ error: 'unauthorized' }, 401, cors);
  if (!env.SNAP) return json({ error: 'no store' }, 404, cors);
  let body; try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400, cors); }
  const seen = ['eye', 'camera', 'none'].includes(body.seen) ? body.seen : null;
  const lat = +body.lat, lon = +body.lon; const t = Number.isFinite(+body.t) ? +body.t : Date.now();
  if (!seen || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return json({ error: 'need seen (eye|camera|none), lat, lon' }, 400, cors);
  const row = { t: new Date(t).toISOString(), lat: +lat.toFixed(3), lon: +lon.toFixed(3), seen, note: String(body.note || '').slice(0, 140) };
  const key = `sightings:${row.t.slice(0, 7)}`;
  const rows = (await env.SNAP.get(key, 'json')) || [];
  rows.push(row); if (rows.length > 2000) rows.splice(0, rows.length - 2000);
  await env.SNAP.put(key, JSON.stringify(rows));
  return json({ ok: true, count: rows.length, row }, 200, cors);
}

/** GET /api/sightings?months=N (Bearer SIGHTING_TOKEN): the logged sightings, newest month first. */
async function listSightings(request, url, env, cors) {
  const auth = sightingAuth(request, env);
  if (auth === 'unconfigured') return json({ error: 'SIGHTING_TOKEN not set' }, 404, cors);
  if (auth !== 'ok') return json({ error: 'unauthorized' }, 401, cors);
  if (!env.SNAP) return json({ error: 'no store' }, 404, cors);
  const months = Math.min(12, Math.max(1, +(url.searchParams.get('months') || 3)));
  const rows = [];
  const d = new Date();
  for (let i = 0; i < months; i++) { const key = `sightings:${new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7)}`; const r = await env.SNAP.get(key, 'json'); if (r) rows.push(...r); }
  return json({ rows: rows.sort((a, b) => a.t.localeCompare(b.t)) }, 200, cors);
}

function respond(entry, route, cors, cacheState, now) {
  const headers = {
    ...cors,
    'Content-Type': entry.type + (entry.type.startsWith('text/') ? '; charset=utf-8' : ''),
    'Cache-Control': `public, max-age=${Math.max(0, Math.floor((entry.expires - now) / 1000))}`,
    'X-Proxy-Cache': cacheState,
    'X-Proxy-Fetched-At': new Date(entry.fetchedAt).toISOString(),
    'X-Attribution': route.attribution,
  };
  if (entry.lastModified) headers['X-Upstream-Last-Modified'] = entry.lastModified;
  return new Response(entry.body, { status: entry.status, headers });
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function pruneCache() {
  if (memoryCache.size <= 64) return;
  const now = Date.now();
  for (const [k, v] of memoryCache) if (v.expires <= now) memoryCache.delete(k);
  while (memoryCache.size > 64) memoryCache.delete(memoryCache.keys().next().value);
}

// Edge cache (Cloudflare Cache API): shared across isolates on a custom domain; silently unavailable elsewhere.
const cacheKey = (upstream) => new Request('https://aurora-proxy-cache.invalid/' + encodeURIComponent(upstream));
async function edgeCacheGet(upstream, route, now) {
  try {
    if (typeof caches === 'undefined' || !caches.default) return null;
    const res = await caches.default.match(cacheKey(upstream));
    if (!res) return null;
    const fetchedAt = +res.headers.get('X-Proxy-Fetched-At-Ms') || now;
    if (fetchedAt + route.ttl * 1000 <= now) return null;
    return { expires: fetchedAt + route.ttl * 1000, status: 200, type: route.type, body: await res.arrayBuffer(), lastModified: res.headers.get('X-Upstream-Last-Modified') || '', fetchedAt };
  } catch { return null; }
}
async function edgeCachePut(upstream, entry, route) {
  try {
    if (typeof caches === 'undefined' || !caches.default) return;
    const headers = { 'Content-Type': entry.type, 'Cache-Control': `public, s-maxage=${route.ttl}`, 'X-Proxy-Fetched-At-Ms': String(entry.fetchedAt) };
    if (entry.lastModified) headers['X-Upstream-Last-Modified'] = entry.lastModified;
    await caches.default.put(cacheKey(upstream), new Response(entry.body.slice(0), { headers }));
  } catch { /* cache unavailable */ }
}
