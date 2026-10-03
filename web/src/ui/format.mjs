// Formatting helpers for the dashboard.
export const fmt = {
  pct: (p) => (Number.isFinite(p) ? `${Math.round(p * 100)}%` : '–'),
  num: (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '–'),
  int: (x) => (Number.isFinite(x) ? Math.round(x).toString() : '–'),
  deg: (x, d = 1) => (Number.isFinite(x) ? `${x.toFixed(d)}°` : '–'),
  hm: (t) => (Number.isFinite(t) ? new Date(t).toISOString().slice(11, 16) : '–'),
  hmLocal: (t) => (Number.isFinite(t) ? new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '–'),
  dayLocal: (t) => (Number.isFinite(t) ? new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '–'),
  dateUtc: (t) => (Number.isFinite(t) ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '–'),
  age: (min) => (!Number.isFinite(min) ? 'no data' : min < 1 ? 'just now' : min < 90 ? `${Math.round(min)} min` : min < 48 * 60 ? `${(min / 60).toFixed(1)} h` : `${Math.round(min / 1440)} d`),
  signed: (x, d = 1) => (Number.isFinite(x) ? (x > 0 ? '+' : '') + x.toFixed(d) : '–'),
  /** Kp in thirds, the way the index is published: 1.667 -> "2-", 2 -> "2", 2.333 -> "2+". */
  kp: (x) => { if (!Number.isFinite(x)) return '–'; const n = Math.round(x * 3), k = Math.round(n / 3), r = n - 3 * k; return `${k}${r < 0 ? '-' : r > 0 ? '+' : ''}`; },
  dayUtc: (t) => (Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '–'),
  /** A 3-hour block by its UTC hours, "09–12"; the last block of a day ends at 24. */
  block: (t) => { if (!Number.isFinite(t)) return '–'; const h = new Date(t).getUTCHours(); return `${String(h).padStart(2, '0')}–${String(h + 3).padStart(2, '0')}`; },
};

/** Escape text for the few places that build HTML strings (chart tooltips): upstream strings must never become markup. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c !== null && c !== undefined) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
