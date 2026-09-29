// Independent data feeds. Every source loads on its own clock, folds its result into the dashboard state as soon as
// it lands and asks for the sections it feeds to be redrawn, so one slow or failing upstream (DONKI, iSWA, a proxy
// route) never holds back the rest of the page. A failed feed retries after 15 s, doubling up to its regular
// cadence; a client error (4xx: the upstream has no data for the request) waits for the regular cadence.

export const RETRY_MS = 15e3;

/**
 * Milliseconds until the next run of a feed that just finished after `elapsed` ms. Regular runs count from the start
 * of the last one, so feeds with the same cadence stay in step and land together (one redraw instead of several).
 */
export function nextDelay(every, ok, fails, status = 0, elapsed = 0) {
  const clientError = status >= 400 && status < 500 && status !== 408 && status !== 429;
  if (ok || clientError) return Math.max(every / 10, every - elapsed);
  return Math.min(every, RETRY_MS * 2 ** Math.max(0, Math.min(fails - 1, 8)));
}

/**
 * feeds: [{id, every (ms), get: async () => result, put: (result) => true when it brought usable data, ...}]; any
 * other properties (label, parts, fields) are kept on the feed. Optional per feed: `delay` (ms before the first run,
 * for bulky data nothing on screen waits for) and `afterGate` (wait for the gate before fetching, for feeds whose
 * request depends on the saved data). `gate` returns a promise awaited between get and put (saved data is applied
 * before live data lands); `onSettled(feed, ok, result)` runs after every attempt. Timers and the clock are
 * injectable for tests.
 */
export class FeedScheduler {
  constructor(feeds, { gate = null, onSettled = () => {}, log = console, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id), now = () => Date.now() } = {}) {
    this.feeds = feeds.map(f => ({ ...f, timer: null, running: false, again: false, done: false, fails: 0, lastRun: 0, lastOk: 0, error: null, status: 0 }));
    this.byId = new Map(this.feeds.map(f => [f.id, f]));
    Object.assign(this, { gate, onSettled, log, setTimer, clearTimer, now });
  }

  start() { for (const f of this.feeds) { if (f.delay > 0) f.timer = this.setTimer(() => this.run(f), f.delay); else this.run(f); } }
  get(id) { return this.byId.get(id); }

  /** Run a feed now, or right after its current attempt when one is in flight. */
  runNow(id) { const f = this.byId.get(id); if (f) this.run(f); }

  async run(f) {
    if (f.running) { f.again = true; return; }
    this.clearTimer(f.timer); f.timer = null; f.running = true; f.again = false;
    const started = this.now();
    let ok = false, result = null;
    try {
      if (f.afterGate && this.gate) await this.gate();
      result = await f.get();
      f.status = result?.meta?.status ?? 0;
      if (this.gate) await this.gate();
      ok = !!f.put(result);
      f.error = ok ? null : (result?.meta?.error || 'no data');
    } catch (err) {
      f.status = 0; f.error = String(err?.message || err);
      this.log.error(`feed ${f.id}:`, err);
    }
    f.running = false; f.done = true; f.lastRun = started;
    if (ok) { f.fails = 0; f.lastOk = this.now(); } else f.fails++;
    try { this.onSettled(f, ok, result); } catch (err) { this.log.error(`feed ${f.id} settle:`, err); }
    f.timer = this.setTimer(() => this.run(f), f.again ? 0 : nextDelay(f.every, ok, f.fails, f.status, this.now() - started));
  }

  /** After the page was hidden (timers throttled or frozen): run every feed whose last attempt is a cadence old. */
  refreshStale() { const t = this.now(); for (const f of this.feeds) if (!f.running && t - f.lastRun >= f.every) this.run(f); }
  /** Run the feeds whose last attempt failed (back online, or the place changed). */
  retryFailed() { for (const f of this.feeds) if (!f.running && f.done && f.fails > 0) this.run(f); }
  /** Feeds that have not finished a first attempt. */
  pending() { return this.feeds.filter(f => !f.done); }
  /** Feeds whose last attempt failed. */
  failing() { return this.feeds.filter(f => f.done && f.fails > 0); }
}
