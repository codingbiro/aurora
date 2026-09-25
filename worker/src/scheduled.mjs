// Cron job: light-weight nowcast for the configured observer, verification trail, notifications.
// Avoids the 7-day file and the analog ensemble to stay far below the free plan's 10 ms CPU
// budget: it keeps its own rolling 6-hour driving history in KV instead.
import { parsePropagated } from '../../web/src/data/noaa.mjs';
import { weightedRecentAverage } from '../../web/src/model/integrate.mjs';
import { kpFromDriving, hp30FromDriving } from '../../web/src/model/activity.mjs';
import { boundaryForKp, VIEW_ALLOWANCE_DEG, TIERS, TIER_ORDER, dstBoundary, dstWeight } from '../../web/src/model/oval.mjs';
import { MagneticCoordinates } from '../../web/src/model/magcoords.mjs';
import { normalCdf, latitudeRegime } from '../../web/src/model/substorm.mjs';
import grid from '../../web/data/aacgm_europe_grid.json' with { type: 'json' };
import mltRef from '../../web/data/mlt_reference.json' with { type: 'json' };
import coefficients from '../../web/data/coefficients.json' with { type: 'json' };

const PROPAGATED = 'https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind-1-hour.json';
const KYOTO_DST = 'https://services.swpc.noaa.gov/products/kyoto-dst.json';
const AURORAWATCH = 'https://aurorawatch-api.lancs.ac.uk/0.2/status/current-status.xml';
const TORMESTORP_K = 'https://www2.irf.se/maggraphs/tormestorp/get_kindex_tormestorp.php';
const HIST_KEY = 'driving:rolling';
const STATE_KEY = 'state:latest';
/** Leads (minutes) logged for verification and the columns of each `fc:` row. */
export const FORECAST_LEADS = [10, 30, 60];
export const FORECAST_COLUMNS = ['time', 'place', 'lead', 'centre', 'sigma', 'pCamera', 'pEyeDark', 'pEyeCity', 'pOverhead', 'kpModel', 'anchorHp30', 'anchorAgeMin', 'dst', 'auroraWatch', 'tormestorpK', 'mlt'];

/** Linear interpolation on a small table, clamped at the ends. */
function interp(xs, ys, x) { if (!xs || !xs.length) return NaN; if (x <= xs[0]) return ys[0]; for (let i = 0; i + 1 < xs.length; i++) if (x <= xs[i + 1]) { const f = (x - xs[i]) / (xs[i + 1] - xs[i]); return ys[i] + f * (ys[i + 1] - ys[i]); } return ys[ys.length - 1]; }

/**
 * Blend of the solar-wind model with the last observed Hp30, as the dashboard does it: the persistence
 * weight per lead from the blend calibration, scaled by the anchor's age; sigma is the calibrated spread.
 */
export function anchorBlend(kpModel, anchorValue, anchorAgeMin, leadMin, blend = coefficients.blend) {
  const hasAnchor = Number.isFinite(anchorValue) && Number.isFinite(anchorAgeMin) && anchorAgeMin < 90;
  const fresh = hasAnchor ? Math.min(1, Math.max(0, 1 - Math.max(0, anchorAgeMin - 20) / 60)) : 0;
  const w = blend ? interp(blend.leads, blend.weight, leadMin) * fresh : 0;
  const centre = Number.isFinite(kpModel) ? (1 - w) * kpModel + w * (hasAnchor ? anchorValue : 0) : (hasAnchor ? anchorValue : NaN);
  const sigma = blend ? interp(blend.leads, blend.sigma, leadMin) * (hasAnchor ? 1 : 1.15) : 0.75;
  return { centre, sigma, w };
}

/**
 * Tier probabilities for an observer from a normal Kp distribution (centre, sigma), the Starkov/NOAA edge at
 * the observer's MLT blended with the ring-current edge, and the visibility rule the dashboard uses without a
 * magnetometer chain (factor 0.55 for the phase-gated tiers).
 */
export function tierForecast({ centre, sigma, mlat, mlt, dst = NaN, regime = null }) {
  if (!Number.isFinite(centre)) return null;
  const reg = regime || latitudeRegime(mlat);
  const dstB = dstBoundary(dst), wD = dstWeight(dst);
  const counts = Object.fromEntries(TIER_ORDER.map(k => [k, 0]));
  const N = 41;
  for (let i = 0; i < N; i++) {
    const q = (i + 0.5) / N; // equal-probability quantiles of the normal
    const kp = Math.min(9, Math.max(0, centre + sigma * normalQuantile(q)));
    let b = boundaryForKp(kp, mlt);
    if (wD > 0 && Number.isFinite(dstB)) b = (1 - wD) * b + wD * Math.min(b, dstB);
    const margin = b - mlat;
    for (const k of TIER_ORDER) if (margin <= TIERS[k]) counts[k]++;
  }
  const out = {};
  for (const k of TIER_ORDER) {
    const geom = counts[k] / N;
    const f = reg === 'auroral' ? 0.55 : (k === 'eyeCity' || k === 'overhead' || centre >= 6) ? 1 : 0.55;
    out[k] = Math.min(1, geom * f);
  }
  return out;
}

/** Inverse normal CDF (Acklam's rational approximation, |error| < 1.2e-9). */
export function normalQuantile(p) {
  if (!(p > 0 && p < 1)) return p <= 0 ? -Infinity : Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > ph) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Small truth fetches for the log; every one is optional and failures are swallowed. */
export async function fetchTruth(now, fetchFn = fetch) {
  const out = { hp30: null, dst: NaN, auroraWatch: null, tormestorpK: null };
  const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const tasks = [
    fetchFn(`https://kp.gfz.de/app/json/?start=${iso(now - 4 * 3600e3)}&end=${iso(now + 3600e3)}&index=Hp30`).then(r => r.json()).then(j => {
      const rows = (j.datetime || []).map((d, i) => ({ t: Date.parse(d), value: j.Hp30[i] })).filter(r => Number.isFinite(r.t) && r.value >= 0 && r.t <= now);
      if (rows.length) { const last = rows[rows.length - 1]; out.hp30 = { value: +last.value, t: last.t, ageMin: (now - (last.t + 30 * 60e3)) / 60e3 }; }
    }).catch(() => {}),
    fetchFn(KYOTO_DST).then(r => r.json()).then(j => { const rows = (j || []).map(r => ({ t: Date.parse(r.time_tag + (String(r.time_tag).endsWith('Z') ? '' : 'Z')), dst: +r.dst })).filter(r => Number.isFinite(r.t) && r.t <= now && Number.isFinite(r.dst)); const last = rows[rows.length - 1]; if (last && now - last.t < 3 * 3600e3) out.dst = last.dst; }).catch(() => {}),
    fetchFn(AURORAWATCH).then(r => r.text()).then(x => { const m = x.match(/status_id="(\w+)"/); if (m) out.auroraWatch = m[1]; }).catch(() => {}),
    fetchFn(TORMESTORP_K).then(r => r.text()).then(t => { const k = t.trim().split('\n').pop().trim().split(/\s+/).map(c => (/^\d$/.test(c) ? +c : null)); const last = k.filter(v => v !== null).pop(); if (last !== undefined) out.tormestorpK = last; }).catch(() => {}),
  ];
  await Promise.all(tasks);
  return out;
}

/**
 * Observers to evaluate. env.OBSERVERS may be a JSON array (string or object) of
 * {name, lat, lon, topic?, alertOn?: 'horizon'|'overhead', minKpLead?}. Falls back to the
 * single OBSERVER_LAT/OBSERVER_LON pair. `topic` defaults to env.NTFY_TOPIC.
 */
export function resolveObservers(env) {
  let list = env.OBSERVERS;
  if (typeof list === 'string') { try { list = JSON.parse(list); } catch { list = null; } }
  if (!Array.isArray(list) || !list.length) {
    list = [{ name: 'default', lat: +(env.OBSERVER_LAT ?? 55.676), lon: +(env.OBSERVER_LON ?? 12.568) }];
  }
  return list.filter(o => Number.isFinite(+o.lat) && Number.isFinite(+o.lon)).map((o, i) => ({
    name: String(o.name || `observer-${i + 1}`), lat: +o.lat, lon: +o.lon,
    topic: o.topic || env.NTFY_TOPIC || '', alertOn: o.alertOn === 'overhead' ? 'overhead' : 'horizon',
    minKpLead: Number.isFinite(+o.minKpLead) ? +o.minKpLead : 0,
  }));
}

/** Whether a computed state should trigger an alert for this observer. */
export function shouldAlert(observer, state, env = {}) {
  if (!observer.topic && !hasTelegram(env) && !hasWebhook(env)) return false;
  if (state.visible === 'none') return false;
  if (observer.alertOn === 'overhead' && state.visible !== 'overhead') return false;
  return (state.kpLead ?? 0) >= observer.minKpLead;
}

export async function runScheduled(env, scheduledTime = Date.now()) {
  if (!env.SNAP) return null; // no KV binding configured: nothing to do
  const now = scheduledTime || Date.now();
  const res = await fetch(PROPAGATED);
  if (!res.ok) return null;
  const fresh = parsePropagated(await res.json());
  const prev = (await env.SNAP.get(HIST_KEY, 'json')) || [];
  const map = new Map(prev.map(r => [r.t, r]));
  for (const r of fresh) map.set(r.t, { t: r.t, coupling: round(r.coupling, 0), viscous: round(r.viscous, 0), bz: r.bz, speed: r.speed, ekl: round(r.ekl, 2) });
  const cutoff = now - 6 * 3600e3;
  const rolling = [...map.values()].filter(r => r.t >= cutoff).sort((a, b) => a.t - b.t);
  await env.SNAP.put(HIST_KEY, JSON.stringify(rolling));

  const mag = new MagneticCoordinates(grid, mltRef);
  const tLast = rolling.length ? rolling[rolling.length - 1].t : now;
  const drivingNow = weightedRecentAverage(rolling, Math.min(now, tLast + 60e3), 'coupling', { minHours: 1 }).value; // the rolling window fills up over the first hours
  const drivingLead = weightedRecentAverage(rolling, tLast + 60e3, 'coupling', { minHours: 1 }).value; // includes everything already measured at L1
  const viscous = weightedRecentAverage(rolling, tLast + 60e3, 'viscous', { minHours: 1 }).value;
  const kpNow = hp30FromDriving(drivingNow, viscous, coefficients.hp30, coefficients.hp30_storm), kpLead = hp30FromDriving(drivingLead, viscous, coefficients.hp30, coefficients.hp30_storm);
  const truth = await fetchTruth(now).catch(() => ({ hp30: null, dst: NaN, auroraWatch: null, tormestorpK: null }));

  const states = [];
  const trailRows = [];
  const fcRows = [];
  for (const o of resolveObservers(env)) {
    const obs = mag.convert(o.lat, o.lon);
    const mltLead = mag.mlt(obs.mlon, new Date(tLast));
    const boundary = boundaryForKp(kpLead, mltLead);
    const margin = boundary - obs.mlat;
    const regime = latitudeRegime(obs.mlat);
    const tiersByLead = {};
    for (const lead of FORECAST_LEADS) {
      const T = now + lead * 60e3;
      const bl = anchorBlend(T <= tLast + 60e3 ? kpLead : kpLead, truth.hp30 ? truth.hp30.value : NaN, truth.hp30 ? truth.hp30.ageMin : NaN, lead);
      const tiers = tierForecast({ centre: bl.centre, sigma: bl.sigma, mlat: obs.mlat, mlt: mag.mlt(obs.mlon, new Date(T)), dst: truth.dst, regime });
      if (!tiers) continue;
      tiersByLead[lead] = { centre: round(bl.centre, 2), sigma: round(bl.sigma, 2), ...Object.fromEntries(TIER_ORDER.map(k => [k, round(tiers[k], 3)])) };
      fcRows.push([new Date(now).toISOString(), o.name, lead, round(bl.centre, 2), round(bl.sigma, 2), round(tiers.camera, 3), round(tiers.eyeDark, 3), round(tiers.eyeCity, 3), round(tiers.overhead, 3), round(kpLead, 2), truth.hp30 ? truth.hp30.value : null, truth.hp30 ? round(truth.hp30.ageMin, 0) : null, Number.isFinite(truth.dst) ? truth.dst : null, truth.auroraWatch, truth.tormestorpK, round(mag.mlt(obs.mlon, new Date(T)), 2)]);
    }
    const state = {
      name: o.name, lat: o.lat, lon: o.lon, mlat: round(obs.mlat, 2), mltLead: round(mltLead, 2), regime,
      kpNow: round(kpNow, 2), kpLead: round(kpLead, 2), boundary: round(boundary, 1), margin: round(margin, 1),
      visible: margin <= VIEW_ALLOWANCE_DEG ? (margin <= 0 ? 'overhead' : 'horizon') : 'none',
      tiers: tiersByLead, anchorHp30: truth.hp30 ? truth.hp30.value : null, dst: Number.isFinite(truth.dst) ? truth.dst : null, auroraWatch: truth.auroraWatch, tormestorpK: truth.tormestorpK,
      alertOn: o.alertOn, minKpLead: o.minKpLead, alerts: !!(o.topic || hasTelegram(env) || hasWebhook(env)), channels: channelNames(o, env),
    };
    states.push(state);
    trailRows.push([new Date(now).toISOString(), o.name, state.kpNow, state.kpLead, state.margin]);

    if (shouldAlert(o, state, env)) {
      const lastKey = `notify:last:${o.name}`;
      const last = await env.SNAP.get(lastKey);
      if (!last || now - Date.parse(last) > 2 * 3600e3) {
        const result = await sendAlert(o, `Aurora alert: ${o.name}`,
          `Modeled oval edge ${state.margin} deg from ${o.name} (${state.visible}). Kp now ${state.kpNow}, in about ${round((tLast - now) / 60e3, 0)} min ${state.kpLead}. ${env.DASHBOARD_URL || ''}`, env);
        state.alertResult = result;
        if (result.ok) { await env.SNAP.put(lastKey, new Date(now).toISOString()); state.alerted = true; }
        else await env.SNAP.put('notify:lasterror', JSON.stringify({ time: new Date(now).toISOString(), place: o.name, ...result }));
      }
    }
  }

  const summary = { time: new Date(now).toISOString(), tLast: new Date(tLast).toISOString(), leadMin: round((tLast - now) / 60e3, 1), samples: rolling.length, kpNow: round(kpNow, 2), kpLead: round(kpLead, 2), observers: states };
  await env.SNAP.put(STATE_KEY, JSON.stringify(summary));

  // verification trail: one compact row per observer per run, one key per UTC day
  const trailKey = `trail:${summary.time.slice(0, 10)}`;
  const trail = (await env.SNAP.get(trailKey, 'json')) || [];
  trail.push(...trailRows);
  await env.SNAP.put(trailKey, JSON.stringify(trail), { expirationTtl: 60 * 86400 });
  // forecast log for verification: tier probabilities per observer and lead with the truth signals seen at issue time
  if (fcRows.length) {
    const fcKey = `fc:${summary.time.slice(0, 10)}`;
    const fc = (await env.SNAP.get(fcKey, 'json')) || [];
    fc.push(...fcRows);
    await env.SNAP.put(fcKey, JSON.stringify(fc), { expirationTtl: 60 * 86400 });
  }
  return summary;
}

const round = (x, d) => (Number.isFinite(x) ? +x.toFixed(d) : null);

/** RFC 2047 encoding for header values that are not plain ASCII (ntfy accepts it). */
export function headerValue(str) {
  return /^[\x20-\x7e]*$/.test(str) ? str : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(str)))}?=`;
}

/**
 * Post a notification to ntfy.sh (or env.NTFY_SERVER) and report the outcome. Never throws.
 * env.NTFY_TOKEN (optional) authenticates against an ntfy account for higher rate limits.
 */
export async function sendNtfy(topic, title, body, env = {}, { priority = 'high', tags = 'milky_way' } = {}) {
  const server = (env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/$/, '');
  const headers = { Title: headerValue(title), Priority: priority, Tags: tags, 'Content-Type': 'text/plain; charset=utf-8' };
  if (env.NTFY_TOKEN) headers.Authorization = `Bearer ${String(env.NTFY_TOKEN).trim()}`;
  let last = { ok: false, status: 0, text: 'not attempted', server };
  const via = env.NTFY_PROXY ? 'proxy' : 'direct';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let res;
      if (env.NTFY_PROXY) {
        // Through the user's HTTP forward proxy over a TCP socket, so ntfy meters the proxy's IP instead of Cloudflare's
        // shared egress. TLS inside the tunnel (startTls) is not usable here, so this leg is plain HTTP; ntfy.sh accepts it.
        // The account token is deliberately not sent on this unencrypted path: the proxy's own IP quota is what we rely on.
        const { fetchViaHttpProxy } = await import('./proxyfetch.mjs');
        const plainServer = server.replace(/^https:/, 'http:');
        const { Authorization, ...plainHeaders } = headers;
        res = await fetchViaHttpProxy(String(env.NTFY_PROXY).trim(), `${plainServer}/${encodeURIComponent(topic)}`, { method: 'POST', headers: plainHeaders, body });
        last = { ok: res.ok, status: res.status, text: res.text.slice(0, 300), server: plainServer, via, attempts: attempt + 1 };
      } else {
        res = await fetch(`${server}/${encodeURIComponent(topic)}`, { method: 'POST', headers, body });
        const text = (await res.text()).slice(0, 300);
        last = { ok: res.ok, status: res.status, text, server, via, attempts: attempt + 1 };
      }
      if (res.ok || res.status === 429 || res.status === 401 || res.status === 403) break; // quota/auth errors do not improve on retry
    } catch (err) {
      last = { ok: false, status: 0, text: String((err && err.message) || err), server, via, attempts: attempt + 1 };
    }
    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
  }
  return last;
}

export const hasTelegram = (env) => !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
export const hasWebhook = (env) => !!env.ALERT_WEBHOOK_URL;
export function channelNames(observer, env) {
  const c = []; if (observer.topic) c.push('ntfy'); if (hasTelegram(env)) c.push('telegram'); if (hasWebhook(env)) c.push('webhook'); return c;
}

/** Telegram Bot API sendMessage. Never throws. */
export async function sendTelegram(env, text) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${String(env.TELEGRAM_BOT_TOKEN).trim()}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(env.TELEGRAM_CHAT_ID).trim(), text, disable_web_page_preview: true }),
    });
    return { channel: 'telegram', ok: res.ok, status: res.status, text: (await res.text()).slice(0, 200) };
  } catch (err) { return { channel: 'telegram', ok: false, status: 0, text: String((err && err.message) || err) }; }
}

/** Generic JSON webhook: Slack incoming webhooks read `text`, Discord webhooks read `content`. Never throws. */
export async function sendWebhook(env, title, body) {
  try {
    const res = await fetch(String(env.ALERT_WEBHOOK_URL).trim(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${title}\n${body}`, content: `**${title}**\n${body}` }),
    });
    return { channel: 'webhook', ok: res.ok, status: res.status, text: (await res.text()).slice(0, 200) };
  } catch (err) { return { channel: 'webhook', ok: false, status: 0, text: String((err && err.message) || err) }; }
}

/** Fan out one alert to every configured channel; ok when at least one delivered. */
export async function sendAlert(observer, title, body, env) {
  const results = [];
  if (observer.topic) results.push({ channel: 'ntfy', ...(await sendNtfy(observer.topic, title, body, env)) });
  if (hasTelegram(env)) results.push(await sendTelegram(env, `${title}\n${body}`));
  if (hasWebhook(env)) results.push(await sendWebhook(env, title, body));
  return { ok: results.some(r => r.ok), results };
}
