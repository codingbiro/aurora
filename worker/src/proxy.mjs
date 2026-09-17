// Allow-listed proxy for upstream feeds that send no CORS headers. Shared between the
// Cloudflare Worker (worker/src/index.mjs) and the local Node dev server (scripts/dev-server.mjs).

const FMI_STATIONS = new Set(['KEV', 'MAS', 'KIL', 'IVA', 'MUO', 'PEL', 'RAN', 'OUJ', 'MEK', 'HAN', 'NUR', 'TAR']);
const GFZ_INDICES = new Set(['Kp', 'Hp30', 'Hp60', 'ap30', 'ap60', 'ap', 'Ap']);
const HPO_MODELS = new Set(['aceprop', 'enlil', 'euhforia', 'swpc', 'mean', 'mean_bars', 'mean_bars_dark']);
const HPO_INDICES = new Set(['Hp30', 'Hp60', 'Kp']);
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
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Expose-Headers': 'X-Upstream-Last-Modified, X-Proxy-Cache, X-Proxy-Fetched-At, X-Attribution', 'Vary': 'Origin' };
}

/** Handle an /api request and return a Response. `env` may carry ALLOWED_ORIGINS. */
export async function handleApi(request, env = {}) {
  const url = new URL(request.url);
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, cors);
  if (url.pathname === '/api/health') return json({ ok: true, time: new Date().toISOString(), routes: ROUTES.length, cached: memoryCache.size }, 200, cors);
  if (url.pathname === '/api/state' && env.SNAP) {
    const state = await env.SNAP.get('state:latest');
    return new Response(state || 'null', { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  for (const route of ROUTES) {
    const m = url.pathname.match(route.match);
    if (!m) continue;
    const upstream = route.upstream(m, url);
    if (!upstream) return json({ error: 'bad parameters' }, 400, cors);
    const now = Date.now();
    const hit = memoryCache.get(upstream);
    if (hit && hit.expires > now) return respond(hit, route, cors, 'HIT', now);
    try {
      const res = await fetch(upstream, { headers: { 'User-Agent': 'aurora-dashboard/1.0 (+https://github.com/codingbiro/aurora)', 'Accept': '*/*' }, redirect: 'follow' });
      if (!res.ok) {
        if (hit) return respond(hit, route, cors, 'STALE', now);
        return json({ error: `upstream ${res.status}`, upstream }, 502, cors);
      }
      const body = await res.arrayBuffer();
      const entry = { expires: now + route.ttl * 1000, status: 200, type: route.type, body, lastModified: res.headers.get('last-modified') || '', fetchedAt: now };
      memoryCache.set(upstream, entry);
      pruneCache();
      return respond(entry, route, cors, 'MISS', now);
    } catch (err) {
      if (hit) return respond(hit, route, cors, 'STALE', now);
      return json({ error: 'upstream fetch failed', detail: String((err && err.message) || err), upstream }, 502, cors);
    }
  }
  return json({ error: 'not found' }, 404, cors);
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
