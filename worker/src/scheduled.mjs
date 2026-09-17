// Cron job: light-weight nowcast for the configured observer, verification trail, notifications.
// Avoids the 7-day file and the analog ensemble to stay far below the free plan's 10 ms CPU
// budget: it keeps its own rolling 6-hour driving history in KV instead.
import { parsePropagated } from '../../web/src/data/noaa.mjs';
import { weightedRecentAverage } from '../../web/src/model/integrate.mjs';
import { kpFromDriving } from '../../web/src/model/activity.mjs';
import { boundaryForKp, VIEW_ALLOWANCE_DEG } from '../../web/src/model/oval.mjs';
import { MagneticCoordinates } from '../../web/src/model/magcoords.mjs';
import grid from '../../web/data/aacgm_europe_grid.json';
import mltRef from '../../web/data/mlt_reference.json';

const PROPAGATED = 'https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind-1-hour.json';
const HIST_KEY = 'driving:rolling';
const STATE_KEY = 'state:latest';

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

  const lat = +(env.OBSERVER_LAT ?? 55.676), lon = +(env.OBSERVER_LON ?? 12.568);
  const mag = new MagneticCoordinates(grid, mltRef);
  const obs = mag.convert(lat, lon);
  const tLast = rolling.length ? rolling[rolling.length - 1].t : now;
  const drivingNow = weightedRecentAverage(rolling, Math.min(now, tLast + 60e3), 'coupling', { minHours: 1 }).value; // the rolling window fills up over the first hours
  const drivingLead = weightedRecentAverage(rolling, tLast + 60e3, 'coupling', { minHours: 1 }).value; // includes everything already measured at L1
  const viscous = weightedRecentAverage(rolling, tLast + 60e3, 'viscous', { minHours: 1 }).value;
  const kpNow = kpFromDriving(drivingNow, viscous), kpLead = kpFromDriving(drivingLead, viscous);
  const mltLead = mag.mlt(obs.mlon, new Date(tLast));
  const boundary = boundaryForKp(kpLead, mltLead);
  const margin = boundary - obs.mlat;
  const state = {
    time: new Date(now).toISOString(), tLast: new Date(tLast).toISOString(), leadMin: round((tLast - now) / 60e3, 1),
    observer: { lat, lon, mlat: round(obs.mlat, 2) }, kpNow: round(kpNow, 2), kpLead: round(kpLead, 2),
    boundary: round(boundary, 1), margin: round(margin, 1),
    visible: margin <= VIEW_ALLOWANCE_DEG ? (margin <= 0 ? 'overhead' : 'horizon') : 'none', samples: rolling.length,
  };
  await env.SNAP.put(STATE_KEY, JSON.stringify(state));

  // verification trail: one compact record per run, one key per UTC day
  const day = state.time.slice(0, 10);
  const trailKey = `trail:${day}`;
  const trail = (await env.SNAP.get(trailKey, 'json')) || [];
  trail.push([state.time, state.kpNow, state.kpLead, state.margin]);
  await env.SNAP.put(trailKey, JSON.stringify(trail), { expirationTtl: 60 * 86400 });

  if (env.NTFY_TOPIC && state.visible !== 'none') {
    const lastKey = 'notify:last';
    const last = await env.SNAP.get(lastKey);
    if (!last || now - Date.parse(last) > 2 * 3600e3) {
      await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`, {
        method: 'POST', headers: { Title: 'Aurora alert', Priority: 'high', Tags: 'milky_way' },
        body: `Modeled oval edge ${state.margin} deg from you (${state.visible}). Kp now ${state.kpNow}, in about ${state.leadMin} min ${state.kpLead}. ${env.DASHBOARD_URL || ''}`,
      });
      await env.SNAP.put(lastKey, new Date(now).toISOString());
    }
  }
  return state;
}

const round = (x, d) => (Number.isFinite(x) ? +x.toFixed(d) : null);
