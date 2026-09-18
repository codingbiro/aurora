// Cloudflare Worker: /api proxy for CORS-less feeds, plus a 5-minute cron that keeps a
// rolling driving history, evaluates a light nowcast for the configured observer, stores a
// verification trail in KV and (optionally) pushes a notification through ntfy.sh.
import { handleApi } from './proxy.mjs';
import { runScheduled, resolveObservers, sendAlert, channelNames } from './scheduled.mjs';
import { corsHeaders } from './proxy.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/cron') {
      // Manual trigger for the scheduled job (verification, or an external scheduler as a fallback).
      const auth = request.headers.get('Authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : url.searchParams.get('token');
      if (!env.CRON_TOKEN || !token || token !== env.CRON_TOKEN) return new Response('not found', { status: 404 });
      if (url.searchParams.get('telegram') === 'updates') {
        // Helper for setup: list the chats that have messaged the bot, so TELEGRAM_CHAT_ID can be set without exposing the token.
        if (!env.TELEGRAM_BOT_TOKEN) return new Response(JSON.stringify({ ok: false, error: 'TELEGRAM_BOT_TOKEN secret not set' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        const r = await fetch(`https://api.telegram.org/bot${String(env.TELEGRAM_BOT_TOKEN).trim()}/getUpdates`);
        const j = await r.json().catch(() => null);
        const chats = [];
        for (const u of (j && j.result) || []) { const m = u.message || u.channel_post || u.my_chat_member?.chat && { chat: u.my_chat_member.chat }; if (m && m.chat) chats.push({ id: m.chat.id, type: m.chat.type, name: m.chat.title || [m.chat.first_name, m.chat.last_name].filter(Boolean).join(' '), username: m.chat.username, text: (m.text || '').slice(0, 40) }); }
        const uniq = [...new Map(chats.map(c => [c.id, c])).values()];
        return new Response(JSON.stringify({ ok: r.ok && !!j?.ok, status: r.status, botOk: j?.ok, chats: uniq, hint: uniq.length ? 'set TELEGRAM_CHAT_ID to the id you want' : 'send any message to the bot first, then call again' }), { headers: { 'Content-Type': 'application/json' } });
      }
      if (url.searchParams.get('test') === '1') {
        // Send a test notification to every observer's topic through the same code path as real alerts.
        const results = [];
        for (const o of resolveObservers(env)) results.push({ place: o.name, channels: channelNames(o, env), ...(await sendAlert(o, `Aurora alert test: ${o.name}`, `Test from the Worker at ${new Date().toISOString()}. ${env.DASHBOARD_URL || ''}`, env)) });
        const lastError = env.SNAP ? await env.SNAP.get('notify:lasterror') : null;
        // Diagnostics: does the token reach ntfy, and what does that account have left? (token itself never returned)
        const tok = env.NTFY_TOKEN || '';
        const tokenInfo = { present: !!tok, length: tok.length, prefixOk: tok.startsWith('tk_'), hasWhitespace: /\s/.test(tok) };
        let account = null;
        if (tok) {
          try {
            const server = (env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/$/, '');
            const r = await fetch(`${server}/v1/account`, { headers: { Authorization: `Bearer ${tok.trim()}` } });
            const j = await r.json().catch(() => null);
            account = { status: r.status, username: j?.username, role: j?.role, tier: j?.tier?.name || j?.tier, limits: j?.limits, stats: j?.stats };
          } catch (err) { account = { error: String(err && err.message || err) }; }
        }
        return new Response(JSON.stringify({ ok: true, results, tokenInfo, account, lastError: lastError ? JSON.parse(lastError) : null }), { headers: { 'Content-Type': 'application/json' } });
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
