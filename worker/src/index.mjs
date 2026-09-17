// Cloudflare Worker: /api proxy for CORS-less feeds, plus a 5-minute cron that keeps a
// rolling driving history, evaluates a light nowcast for the configured observer, stores a
// verification trail in KV and (optionally) pushes a notification through ntfy.sh.
import { handleApi } from './proxy.mjs';
import { runScheduled } from './scheduled.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    // Everything else is a static asset (web/); when assets are not configured, point at the dashboard.
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response(`aurora proxy. Health: /api/health. Dashboard: ${env.DASHBOARD_URL || 'https://aurora.birovince.com/'}`, { headers: { 'Content-Type': 'text/plain' } });
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(env, controller.scheduledTime));
  },
};
