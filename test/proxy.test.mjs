// Unit tests for the Worker proxy handler. Only paths that never reach the network are exercised.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { handleApi, corsHeaders, ROUTES } from '../worker/src/proxy.mjs';

const req = (path, init = {}) => new Request(`https://proxy.test${path}`, init);

describe('route table', () => {
  test('seven allow-listed routes with ttl, type and attribution', () => {
    assert.equal(ROUTES.length, 7);
    for (const r of ROUTES) {
      assert.ok(r.match instanceof RegExp); assert.equal(typeof r.upstream, 'function');
      assert.ok(r.ttl > 0); assert.ok(['application/json', 'text/plain'].includes(r.type)); assert.ok(r.attribution.length > 0);
    }
  });
  test('upstream builders validate parameters', () => {
    const gfz = ROUTES.find(r => r.match.test('/api/gfz/index'));
    assert.equal(gfz.upstream(null, new URL('https://x/api/gfz/index?index=Hp30&start=2026-09-16T00:00:00Z&end=2026-09-17T00:00:00Z')),
      'https://kp.gfz.de/app/json/?start=2026-09-16T00:00:00Z&end=2026-09-17T00:00:00Z&index=Hp30');
    assert.equal(gfz.upstream(null, new URL('https://x/api/gfz/index?index=Hp30&start=2026-09-16&end=2026-09-17T00:00:00Z')), null, 'dates must be full ISO with Z');
    assert.equal(gfz.upstream(null, new URL('https://x/api/gfz/index?index=Nope&start=2026-09-16T00:00:00Z&end=2026-09-17T00:00:00Z')), null);
    const fmi = ROUTES.find(r => r.match.test('/api/fmi/KEV/24'));
    assert.equal(fmi.upstream('/api/fmi/KEV/24'.match(fmi.match)), 'https://space.fmi.fi/image/realtime/UT/KEV/KEVdata_24.txt');
    assert.equal(fmi.upstream(['x', 'SOD', '24']), null, 'Sodankylä is excluded (licence)');
    assert.equal(fmi.match.test('/api/fmi/KEV/02'), false);
    const hpo = ROUTES.find(r => r.match.test('/api/gfz/hpo-forecast'));
    assert.equal(hpo.upstream(null, new URL('https://x/api/gfz/hpo-forecast')), 'https://isdc-data.gfz.de/geomagnetism/HpoForecast/v0102/output/Hpo/json/hpo_forecast_mean_bars_Hp30.json');
    assert.equal(hpo.upstream(null, new URL('https://x/api/gfz/hpo-forecast?model=bogus')), null);
    const ens = ROUTES.find(r => r.match.test('/api/gfz/ensemble'));
    assert.equal(ens.upstream(null, new URL('https://x/api/gfz/ensemble?index=Hp30')), 'https://spaceweather.gfz.de/fileadmin/SW-Monitor/hp30_product_file_FORECAST_HP30_SWIFT_DRIVEN_LAST.json');
    assert.equal(ens.upstream(null, new URL('https://x/api/gfz/ensemble?index=Ap')), null);
  });
});

describe('handleApi (offline paths)', () => {
  test('/api/health', async () => {
    const r = await handleApi(req('/api/health'));
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'application/json');
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    const body = await r.json();
    assert.equal(body.ok, true); assert.equal(body.routes, 7); assert.equal(typeof body.cached, 'number');
    assert.ok(!Number.isNaN(Date.parse(body.time)));
  });
  test('OPTIONS preflight returns 204 with CORS headers', async () => {
    const r = await handleApi(req('/api/gfz/index', { method: 'OPTIONS', headers: { Origin: 'https://a.b' } }));
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    assert.equal(r.headers.get('access-control-allow-methods'), 'GET, OPTIONS');
    assert.equal(r.headers.get('access-control-allow-headers'), 'Content-Type');
    assert.equal(r.headers.get('vary'), 'Origin');
  });
  test('rejects other methods', async () => {
    const r = await handleApi(req('/api/health', { method: 'POST' }));
    assert.equal(r.status, 405); assert.deepEqual(await r.json(), { error: 'method not allowed' });
  });
  test('bad parameters give 400 without fetching', async () => {
    assert.equal((await handleApi(req('/api/fmi/XXX/01'))).status, 400);
    assert.deepEqual(await (await handleApi(req('/api/fmi/XXX/01'))).json(), { error: 'bad parameters' });
    assert.equal((await handleApi(req('/api/gfz/index?index=Kp&start=bad&end=2026-09-17T00:00:00Z'))).status, 400);
    assert.equal((await handleApi(req('/api/gfz/index?index=Nope&start=2026-09-16T00:00:00Z&end=2026-09-17T00:00:00Z'))).status, 400);
    assert.equal((await handleApi(req('/api/gfz/hpo-forecast?model=bogus'))).status, 400);
    assert.equal((await handleApi(req('/api/gfz/ensemble?index=Ap'))).status, 400);
  });
  test('unknown paths give 404', async () => {
    const r = await handleApi(req('/api/nothing'));
    assert.equal(r.status, 404); assert.deepEqual(await r.json(), { error: 'not found' });
    assert.equal((await handleApi(req('/api/fmi/KEV/02'))).status, 404, 'length must be 01 or 24');
    assert.equal((await handleApi(req('/api/state'))).status, 404, 'state needs the KV binding');
  });
  test('/api/state reads the KV binding when present', async () => {
    const withState = await handleApi(req('/api/state'), { SNAP: { get: async () => JSON.stringify({ kpNow: 1 }) } });
    assert.equal(withState.status, 200); assert.deepEqual(await withState.json(), { kpNow: 1 });
    const empty = await handleApi(req('/api/state'), { SNAP: { get: async () => null } });
    assert.equal(await empty.text(), 'null');
  });
});

describe('corsHeaders', () => {
  test('defaults to *, echoes an allowed origin, falls back to the first allowed one', () => {
    assert.equal(corsHeaders(req('/x'), {})['Access-Control-Allow-Origin'], '*');
    assert.equal(corsHeaders(req('/x'), null)['Access-Control-Allow-Origin'], '*');
    assert.equal(corsHeaders(req('/x', { headers: { Origin: 'https://zzz' } }), { ALLOWED_ORIGINS: '*' })['Access-Control-Allow-Origin'], '*');
    const env = { ALLOWED_ORIGINS: 'https://a.b, https://b.c' };
    assert.equal(corsHeaders(req('/x', { headers: { Origin: 'https://b.c' } }), env)['Access-Control-Allow-Origin'], 'https://b.c');
    assert.equal(corsHeaders(req('/x', { headers: { Origin: 'https://zzz' } }), env)['Access-Control-Allow-Origin'], 'https://a.b');
    const h = corsHeaders(req('/x'), env);
    assert.equal(h['Access-Control-Allow-Methods'], 'GET, OPTIONS'); assert.equal(h.Vary, 'Origin');
  });
});
