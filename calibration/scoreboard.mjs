// CME Arrival Time Scoreboard statistics per prediction method.
// Source: https://ccmc.gsfc.nasa.gov/CMESB-Earth/WS/get/predictions (until September 2026 on kauai.ccmc.gsfc.nasa.gov,
// which now redirects to a news page). The new endpoint serves the last 365 days, so downloads are merged into the
// history kept in the cache, which holds every CME since 2013 from the old host.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { quantile } from '../web/src/model/integrate.mjs';
import { round } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const SCOREBOARD_URL = 'https://ccmc.gsfc.nasa.gov/CMESB-Earth/WS/get/predictions';

const cmeList = (x) => (Array.isArray(x) ? x : Array.isArray(x?.predictions) ? x.predictions : []);

/** The cached history with a download merged in: one entry per cmeID, the downloaded one winning, newest first. */
export function mergeScoreboard(cached, fresh) {
  const byId = new Map(cmeList(cached).filter(c => c?.cmeID).map(c => [c.cmeID, c]));
  for (const c of cmeList(fresh)) if (c?.cmeID) byId.set(c.cmeID, c);
  return [...byId.values()].sort((a, b) => (a.cmeID < b.cmeID ? 1 : a.cmeID > b.cmeID ? -1 : 0));
}

export async function loadScoreboard({ offline = false, cacheDir = join(here, 'cache') } = {}) {
  await mkdir(cacheDir, { recursive: true });
  const file = join(cacheDir, 'cme_scoreboard.json');
  let cached = [];
  if (existsSync(file)) try { cached = cmeList(JSON.parse(await readFile(file, 'utf8'))); } catch (err) { console.error(`cached scoreboard unreadable (${err.message})`); }
  if (offline && cached.length) return cached;
  console.log('downloading CME scoreboard ...');
  try {
    const res = await fetch(SCOREBOARD_URL);
    if (!res.ok) throw new Error(`scoreboard HTTP ${res.status}`);
    // the old host answers with a redirect to an HTML page and a 200: anything but a list of CMEs leaves the cache alone
    const fresh = await res.json().catch(() => null);
    if (!Array.isArray(fresh)) throw new Error('scoreboard: the answer is not a list of CMEs');
    const merged = mergeScoreboard(cached, fresh);
    await writeFile(file, JSON.stringify(merged));
    return merged;
  } catch (err) {
    if (!cached.length) throw err;
    console.error(`${err.message}: using the cached copy`); // a failed download must not throw the history away
    return cached;
  }
}

/**
 * Per-method statistics for CMEs with an observed arrival since `since`.
 * Sign convention: differenceInHrs is taken as given by the scoreboard (predicted minus observed
 * arrival, positive = predicted late); it is recomputed from the timestamps when missing.
 */
export function scoreboardStats(cmes, { since = Date.UTC(2023, 0, 1) } = {}) {
  const per = new Map();
  const add = (name, rec) => { const e = per.get(name) || { name, errs: [], kpHit: 0, kpN: 0 }; e.errs.push(rec.err); if (rec.kp !== null) { e.kpN++; if (rec.kp) e.kpHit++; } per.set(name, e); };
  let nCme = 0;
  for (const c of cmes) {
    const obsT = Date.parse(c.arrivalTime || '');
    if (!Number.isFinite(obsT) || c.noArrivalObserved) continue;
    const startT = Date.parse(c.observedTime || c.cmeID || '');
    if (Number.isFinite(startT) ? startT < since : obsT < since) continue;
    nCme++;
    for (const p of c.predictions || []) {
      let err = Number.isFinite(+p.differenceInHrs) && p.differenceInHrs !== null ? +p.differenceInHrs : NaN;
      if (!Number.isFinite(err)) { const pt = Date.parse(p.predictedArrivalTime || ''); if (Number.isFinite(pt)) err = (pt - obsT) / 3600e3; }
      if (!Number.isFinite(err)) continue;
      let kp = null;
      // null, not 0: +null is 0, which counted 213 CMEs without an observed maximum as Kp misses (and ranges from 0)
      const num = (v) => (v === null || v === undefined || v === '' ? NaN : +v);
      const lo = num(p.predictedMaxKpLowerRange), hi = num(p.predictedMaxKpUpperRange), obsKp = num(c.maxKP);
      if (Number.isFinite(lo) && Number.isFinite(hi) && Number.isFinite(obsKp) && hi > 0) kp = obsKp >= lo && obsKp <= hi;
      const rec = { err, kp };
      add(p.predictedMethodName || 'unknown', rec);
      add('All methods', rec);
    }
  }
  const rows = [...per.values()].map(e => ({
    name: e.name, n: e.errs.length,
    mae: round(e.errs.reduce((s, x) => s + Math.abs(x), 0) / e.errs.length, 3),
    median: round(quantile(e.errs.map(Math.abs), 0.5), 3),
    bias: round(e.errs.reduce((s, x) => s + x, 0) / e.errs.length, 3),
    within7h: round(e.errs.filter(x => Math.abs(x) <= 7).length / e.errs.length, 3),
    kpHit: e.kpN ? round(e.kpHit / e.kpN, 3) : null, kpN: e.kpN,
  })).sort((a, b) => b.n - a.n);
  const donkiLike = rows.filter(r => /WSA-ENLIL/i.test(r.name) && /(NASA|M2M|GSFC|CCMC)/i.test(r.name));
  return { since: new Date(since).toISOString(), nCme, signConvention: 'differenceInHrs as published by the scoreboard (predicted minus observed arrival; positive = predicted too late)', methods: rows, donkiLike };
}

export async function runScoreboard(opts = {}) {
  const outFile = join(here, '..', 'web', 'data', 'scoreboard_stats.json');
  try {
    const cmes = await loadScoreboard(opts);
    const stats = scoreboardStats(Array.isArray(cmes) ? cmes : cmes.predictions || []);
    const out = { generated: new Date().toISOString(), source: SCOREBOARD_URL, ...stats, methods: stats.methods.slice(0, 15) };
    await writeFile(outFile, JSON.stringify(out, null, 1));
    console.log(`scoreboard: ${stats.nCme} CMEs since ${out.since}; top methods:`);
    for (const m of out.methods.slice(0, 8)) console.log(`  ${m.name.padEnd(48)} n=${String(m.n).padStart(4)} MAE=${m.mae} h  within7h=${m.within7h}  kpHit=${m.kpHit ?? '-'}`);
    return out;
  } catch (err) {
    console.error(`scoreboard failed (${err.message}): ${outFile} left as it was`);
    process.exitCode = 1;
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runScoreboard({ offline: process.argv.includes('--offline') });
}
