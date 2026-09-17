// Fetch helpers with timing, freshness metadata and graceful failure.

export async function fetchWithMeta(url, { timeoutMs = 20000, as = 'json', headers = {} } = {}) {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers, cache: 'no-store' });
    const latencyMs = Date.now() - started;
    if (!res.ok) return { ok: false, status: res.status, url, latencyMs, fetchedAt: Date.now(), error: `HTTP ${res.status}` };
    const body = as === 'json' ? await res.json() : await res.text();
    const lm = res.headers.get('x-upstream-last-modified') || res.headers.get('last-modified');
    return { ok: true, status: res.status, url, latencyMs, fetchedAt: Date.now(), lastModified: lm ? Date.parse(lm) : null, body };
  } catch (err) {
    return { ok: false, status: 0, url, latencyMs: Date.now() - started, fetchedAt: Date.now(), error: err.name === 'AbortError' ? 'timeout' : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

/** Parse NOAA time tags: "2026-09-17T14:05:00" (UTC, no Z) or with Z. */
export function noaaTime(s) {
  if (!s) return NaN;
  return Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z');
}

export const minutesAgo = (t, now = Date.now()) => Number.isFinite(t) ? (now - t) / 60e3 : NaN;

/**
 * Freshness label for the status strip. `expectedMin` is the normal update interval.
 */
export function freshness(dataTime, expectedMin, now = Date.now()) {
  const age = minutesAgo(dataTime, now);
  if (!Number.isFinite(age)) return { age, level: 'missing' };
  if (age <= expectedMin * 2) return { age, level: 'fresh' };
  if (age <= expectedMin * 6) return { age, level: 'aging' };
  return { age, level: 'stale' };
}
