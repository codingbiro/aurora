// NASA CCMC DONKI (keyless host). CORS "*" for simple GET requests.
import { fetchWithMeta } from './fetch-util.mjs';

export const DONKI = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get';

const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);

/** CMEs with nested analyses and WSA-Enlil runs for the last `daysBack` days. */
export async function loadCmes(now = Date.now(), daysBack = 10) {
  const url = `${DONKI}/CME?startDate=${ymd(now - daysBack * 86400e3)}&endDate=${ymd(now + 86400e3)}`;
  const m = await fetchWithMeta(url, { timeoutMs: 30000 });
  return { meta: m, data: m.ok && Array.isArray(m.body) ? m.body : [] };
}

/** Recent geomagnetic storm records (observed Kp >= 5 events). */
export async function loadStorms(now = Date.now(), daysBack = 30) {
  const url = `${DONKI}/GST?startDate=${ymd(now - daysBack * 86400e3)}&endDate=${ymd(now)}`;
  const m = await fetchWithMeta(url);
  return { meta: m, data: m.ok && Array.isArray(m.body) ? m.body : [] };
}
