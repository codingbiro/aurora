// Cron job: light-weight nowcast for the configured observer, verification trail, notifications.
// Avoids the 7-day file and the analog ensemble to stay far below the free plan's 10 ms CPU
// budget: it keeps its own rolling 6-hour driving history in KV instead.
import { parsePropagated } from '../../web/src/data/noaa.mjs';
import { weightedRecentAverage } from '../../web/src/model/integrate.mjs';
import { kpFromDriving } from '../../web/src/model/activity.mjs';
import { boundaryForKp, VIEW_ALLOWANCE_DEG } from '../../web/src/model/oval.mjs';
import { MagneticCoordinates } from '../../web/src/model/magcoords.mjs';
import grid from '../../web/data/aacgm_europe_grid.json' with { type: 'json' };
import mltRef from '../../web/data/mlt_reference.json' with { type: 'json' };

const PROPAGATED = 'https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind-1-hour.json';
const HIST_KEY = 'driving:rolling';
const STATE_KEY = 'state:latest';

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
export function shouldAlert(observer, state) {
  if (!observer.topic) return false;
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
  const kpNow = kpFromDriving(drivingNow, viscous), kpLead = kpFromDriving(drivingLead, viscous);

  const states = [];
  const trailRows = [];
  for (const o of resolveObservers(env)) {
    const obs = mag.convert(o.lat, o.lon);
    const mltLead = mag.mlt(obs.mlon, new Date(tLast));
    const boundary = boundaryForKp(kpLead, mltLead);
    const margin = boundary - obs.mlat;
    const state = {
      name: o.name, lat: o.lat, lon: o.lon, mlat: round(obs.mlat, 2), mltLead: round(mltLead, 2),
      kpNow: round(kpNow, 2), kpLead: round(kpLead, 2), boundary: round(boundary, 1), margin: round(margin, 1),
      visible: margin <= VIEW_ALLOWANCE_DEG ? (margin <= 0 ? 'overhead' : 'horizon') : 'none',
      alertOn: o.alertOn, minKpLead: o.minKpLead, alerts: !!o.topic,
    };
    states.push(state);
    trailRows.push([new Date(now).toISOString(), o.name, state.kpNow, state.kpLead, state.margin]);

    if (shouldAlert(o, state)) {
      const lastKey = `notify:last:${o.name}`;
      const last = await env.SNAP.get(lastKey);
      if (!last || now - Date.parse(last) > 2 * 3600e3) {
        const result = await sendNtfy(o.topic, `Aurora alert: ${o.name}`,
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
  if (env.NTFY_TOKEN) headers.Authorization = `Bearer ${env.NTFY_TOKEN}`;
  let last = { ok: false, status: 0, text: 'not attempted', server };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${server}/${encodeURIComponent(topic)}`, { method: 'POST', headers, body });
      const text = (await res.text()).slice(0, 300);
      last = { ok: res.ok, status: res.status, text, server, attempts: attempt + 1 };
      if (res.ok || res.status === 429 || res.status === 401 || res.status === 403) break; // quota/auth errors do not improve on retry
    } catch (err) {
      last = { ok: false, status: 0, text: String((err && err.message) || err), server, attempts: attempt + 1 };
    }
    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
  }
  return last;
}
