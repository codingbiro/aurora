// Cloudflare Worker: /api proxy for CORS-less feeds, plus a 5-minute cron that keeps a
// rolling driving history, evaluates a light nowcast for the configured observer, stores a
// verification trail in KV and (optionally) pushes a notification through ntfy.sh.
import { handleApi } from './proxy.mjs';
import { runScheduled, resolveObservers, sendNtfy } from './scheduled.mjs';
import { corsHeaders } from './proxy.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/cron') {
      // Manual trigger for the scheduled job (verification, or an external scheduler as a fallback).
      const auth = request.headers.get('Authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : url.searchParams.get('token');
      if (!env.CRON_TOKEN || !token || token !== env.CRON_TOKEN) return new Response('not found', { status: 404 });
      if (url.searchParams.get('test') === '1') {
        // Send a test notification to every observer's topic through the same code path as real alerts.
        const results = [];
        for (const o of resolveObservers(env)) results.push({ place: o.name, topic: o.topic ? o.topic.slice(0, 4) + '…' : '', ...(o.topic ? await sendNtfy(o.topic, `Aurora alert test: ${o.name}`, `Test from the Worker at ${new Date().toISOString()}. ${env.DASHBOARD_URL || ''}`, env) : { ok: false, status: 0, text: 'no topic' }) });
        const lastError = env.SNAP ? await env.SNAP.get('notify:lasterror') : null;
        return new Response(JSON.stringify({ ok: true, results, lastError: lastError ? JSON.parse(lastError) : null }), { headers: { 'Content-Type': 'application/json' } });
      }
      try {
        const state = await runScheduled(env, Date.now());
        return new Response(JSON.stringify({ ok: true, state }), { headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: String(err && err.stack || err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    // Everything else is a static asset (web/); when assets are not configured, point at the dashboard.
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response(`aurora proxy. Health: /api/health. Dashboard: ${env.DASHBOARD_URL || 'https://aurora.birovince.com/'}`, { headers: { 'Content-Type': 'text/plain' } });
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(env, controller.scheduledTime));
  },
};
