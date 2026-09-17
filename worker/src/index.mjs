// Cloudflare Worker: /api proxy for CORS-less feeds, plus a 5-minute cron that keeps a
// rolling driving history, evaluates a light nowcast for the configured observer, stores a
// verification trail in KV and (optionally) pushes a notification through ntfy.sh.
import { handleApi } from './proxy.mjs';
import { runScheduled } from './scheduled.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    if (url.pathname === '/') {
      return new Response(`aurora proxy. Health: /api/health. Dashboard: ${env.DASHBOARD_URL || 'https://codingbiro.github.io/aurora/'}`, { headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('not found', { status: 404 });
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(env, controller.scheduledTime));
  },
};
