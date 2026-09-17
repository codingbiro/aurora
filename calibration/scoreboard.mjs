// CME Arrival Time Scoreboard statistics per prediction method.
// Source: https://kauai.ccmc.gsfc.nasa.gov/CMEscoreboard/WS/get/predictions
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { quantile } from '../web/src/model/integrate.mjs';
import { round } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const SCOREBOARD_URL = 'https://kauai.ccmc.gsfc.nasa.gov/CMEscoreboard/WS/get/predictions';

export async function loadScoreboard({ offline = false, cacheDir = join(here, 'cache') } = {}) {
  await mkdir(cacheDir, { recursive: true });
  const file = join(cacheDir, 'cme_scoreboard.json');
  if (!offline || !existsSync(file)) {
    console.log('downloading CME scoreboard ...');
    const res = await fetch(SCOREBOARD_URL);
    if (!res.ok) throw new Error(`scoreboard HTTP ${res.status}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(await readFile(file, 'utf8'));
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
      const lo = +p.predictedMaxKpLowerRange, hi = +p.predictedMaxKpUpperRange, obsKp = +c.maxKP;
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
    console.error('scoreboard failed:', err.message);
    await writeFile(outFile, JSON.stringify({ generated: new Date().toISOString(), source: SCOREBOARD_URL, error: String(err.message), methods: [] }, null, 1));
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runScoreboard({ offline: process.argv.includes('--offline') });
}
