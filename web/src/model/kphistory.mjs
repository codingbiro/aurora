// Measured Kp, as opposed to forecast: GFZ Potsdam's 3-hour Kp (the official index) with NOAA's values where GFZ has not
// published yet, NOAA's running estimate for the block in progress, and the summary the dashboard leads with.

const MIN = 60e3, DAY = 86400e3;
export const BLOCK = 3 * 3600e3;

/** Start of the 3-hour UTC block that contains t. */
export const blockStart = (t) => Math.floor(t / BLOCK) * BLOCK;

const LEVELS = ['quiet', 'quiet', 'quiet', 'unsettled', 'active'];
const STORMS = ['', 'G1 minor storm', 'G2 moderate storm', 'G3 strong storm', 'G4 severe storm', 'G5 extreme storm'];

/**
 * Activity class of a Kp value on NOAA's scales: {k (integer class), g (G-scale, 0 to 5), label}. Kp comes in thirds, so
 * the class is the nearest integer (5- is 4.67, a K of 5), except that 9- still counts as G4 (NOAA: "Kp = 8, including a 9-").
 * Hp30 has no upper limit; anything from 9 up is G5.
 */
export function stormLevel(kp) {
  if (!Number.isFinite(kp)) return { k: NaN, g: NaN, label: '' };
  const k = Math.round(kp), g = kp >= 9 ? 5 : Math.max(0, Math.min(4, k - 4));
  return { k, g, label: g ? STORMS[g] : LEVELS[Math.max(0, Math.min(4, k))] };
}

const GFZ_STATUS = { def: 'final', pre: 'preliminary', now: 'nowcast' };
/** GFZ's status code in words ('def' -> 'final', 'pre' -> 'preliminary'); unknown codes pass through. */
export const statusText = (s) => GFZ_STATUS[s] || s || '';

/**
 * The finished 3-hour blocks, ascending: [{t (block start), kp, source ('GFZ' | 'NOAA' | 'NOAA running'), status, gfz, noaa}].
 * gfz: GFZ's Kp [{t, value, status}] (status 'def' once final, 'pre' until then). noaa: NOAA's 3-hour Kp [{t, kp, status}];
 * only 'observed' rows count, because the Kp forecast file labels the rest of the current UTC day 'estimated', and those
 * are forecast values. running: NOAA's 1-minute running estimate [{t, kp}]; its value in the last five minutes of a
 * finished block is NOAA's number for that block, which stands in until either file has it (a few minutes after the end).
 * Only blocks whose three hours are over count: GFZ also publishes a provisional value for the block in progress, part
 * of the way through it, and that value keeps changing until the block ends.
 */
export function kpBlocks({ gfz = [], noaa = [], running = [], now }) {
  const byT = new Map();
  const at = (t) => { let b = byT.get(t); if (!b) { b = { t, kp: NaN, source: null, status: null, gfz: NaN, noaa: NaN }; byT.set(t, b); } return b; };
  for (const r of noaa) if (r.status === 'observed' && Number.isFinite(r.kp)) at(blockStart(r.t)).noaa = r.kp;
  for (const r of gfz) if (Number.isFinite(r.value)) { const b = at(blockStart(r.t)); b.gfz = r.value; b.status = r.status || null; }
  const lastIn = new Map();
  for (const r of running) if (Number.isFinite(r.kp) && Number.isFinite(r.t)) { const t0 = blockStart(r.t), p = lastIn.get(t0); if (!p || r.t > p.t) lastIn.set(t0, r); }
  const out = [];
  for (const [t0, r] of lastIn) if (!byT.has(t0) && r.t >= t0 + BLOCK - 5 * MIN && t0 + BLOCK <= now) out.push({ t: t0, kp: r.kp, source: 'NOAA running', status: null, gfz: NaN, noaa: NaN });
  for (const b of byT.values()) {
    if (b.t + BLOCK > now) continue;
    if (Number.isFinite(b.gfz)) { b.kp = b.gfz; b.source = 'GFZ'; } else { b.kp = b.noaa; b.source = 'NOAA'; }
    out.push(b);
  }
  return out.sort((a, b) => a.t - b.t);
}

/**
 * NOAA's running estimate for the block in progress: {t (block start), kp, at (minute of the estimate)} or null. It is
 * computed from the part of the block that has passed, so it starts at 0 at every block boundary and builds up from there.
 */
export function runningBlock(running, now) {
  const t0 = blockStart(now);
  const r = running.filter(x => Number.isFinite(x.kp) && x.t >= t0 && x.t <= now + MIN).slice(-1)[0];
  return r ? { t: t0, kp: r.kp, at: r.t } : null;
}

/**
 * What the tiles show: now (the latest Hp30 half hour, GFZ's Kp at 30-minute steps, which does not restart at block
 * boundaries: {kp, t0, t1}), block (runningBlock), last (the latest finished block), max24 and max7 (the highest block
 * reaching into the last 24 h or 7 days; the block in progress counts once its running value is higher, flagged
 * inProgress; on a tie the latest block wins).
 */
export function kpSummary({ blocks = [], hp30 = [], running = [], now }) {
  const hp = hp30.filter(r => Number.isFinite(r.value) && r.t + 30 * MIN <= now + 5 * MIN).slice(-1)[0];
  const block = runningBlock(running, now);
  const candidates = block ? [...blocks, { t: block.t, kp: block.kp, source: 'NOAA running', inProgress: true }] : blocks;
  const highest = (since) => candidates.filter(b => b.t + BLOCK > since).reduce((m, b) => (!m || b.kp >= m.kp ? b : m), null);
  return {
    now: hp ? { kp: hp.value, t0: hp.t, t1: hp.t + 30 * MIN } : null,
    block,
    last: blocks.length ? blocks[blocks.length - 1] : null,
    max24: highest(now - DAY), max7: highest(now - 7 * DAY),
  };
}
