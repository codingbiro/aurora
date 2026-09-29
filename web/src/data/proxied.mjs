// Sources that need the Worker proxy because they send no CORS headers:
// GFZ (Hp30 nowcast, Hpo forecast, SWIFT ensemble), FMI IMAGE magnetometers,
// IRF Kiruna, UK Met Office overview, SIDC bulletin.
import { fetchWithMeta } from './fetch-util.mjs';
import { parseFmi, parseIaga2002 } from '../model/substorm.mjs';

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

export class ProxyClient {
  constructor(base) { this.base = base ? base.replace(/\/$/, '') : null; }
  get available() { return !!this.base; }
  url(path) { return `${this.base}${path}`; }

  /** GFZ index (Hp30 | Hp60 | Kp | ap30) -> ascending [{t, value, status}] */
  async gfzIndex(index, tMin, tMax) {
    const m = await fetchWithMeta(this.url(`/api/gfz/index?index=${index}&start=${iso(tMin)}&end=${iso(tMax)}`));
    if (!m.ok || !m.body || !m.body.datetime) return { meta: m, data: [] };
    const vals = m.body[index] || [];
    const status = m.body.status || [];
    const data = m.body.datetime.map((d, i) => ({ t: Date.parse(d), value: vals[i] === null || vals[i] === -1 ? NaN : +vals[i], status: status[i] || null })).filter(r => Number.isFinite(r.value));
    return { meta: m, data, license: m.body.meta?.license };
  }

  /** GFZ Hpo forecast (ISDC). model: aceprop | enlil | swpc | mean | mean_bars; index: Hp30 | Hp60 | Kp */
  async gfzHpoForecast(model = 'mean_bars', index = 'Hp30') {
    const m = await fetchWithMeta(this.url(`/api/gfz/hpo-forecast?model=${model}&index=${index}`));
    if (!m.ok || !m.body) return { meta: m, data: [] };
    const body = m.body;
    const toRows = (obj) => Object.entries(obj).map(([k, v]) => ({ t: Date.parse(k.endsWith('Z') ? k : k + 'Z'), value: v === -1 ? NaN : +v }));
    let data;
    if (body.MEDIAN) {
      const med = toRows(body.MEDIAN), max = toRows(body.MAX || {});
      data = med.map((r, i) => ({ t: r.t, median: r.value, max: max[i]?.value ?? NaN }));
    } else data = toRows(body).map(r => ({ t: r.t, median: r.value }));
    return { meta: m, data: data.filter(r => Number.isFinite(r.t)).sort((a, b) => a.t - b.t) };
  }

  /** GFZ SWIFT/PAGER ensemble -> ascending [{t, min, q25, median, q75, max, pGe4, pGe5, pGe6, pGe7, pGe8}] */
  async gfzEnsemble(index = 'Kp') {
    const m = await fetchWithMeta(this.url(`/api/gfz/ensemble?index=${index}`));
    if (!m.ok || !m.body) return { meta: m, data: [] };
    const b = m.body; const times = b['Time (UTC)'] || {};
    const col = (name) => b[name] || {};
    const memberCols = Object.keys(b).filter(c => /^kp_\d+$/.test(c)); // the ensemble's runs, for night maxima
    const data = Object.keys(times).map(k => {
      const tm = String(times[k]).match(/(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/);
      const t = tm ? Date.UTC(+tm[3], +tm[2] - 1, +tm[1], +tm[4], +tm[5]) : NaN;
      const p45 = +col('prob 4-5')[k], p56 = +col('prob 5-6')[k], p67 = +col('prob 6-7')[k], p78 = +col('prob 7-8')[k], p8 = +col('prob >= 8')[k];
      const members = memberCols.map(c => +b[c][k]).filter(Number.isFinite);
      return { t, min: +col('minimum')[k], q25: +col('0.25-quantile')[k], median: +col('median')[k], q75: +col('0.75-quantile')[k], max: +col('maximum')[k],
        pGe4: p45 + p56 + p67 + p78 + p8, pGe5: p56 + p67 + p78 + p8, pGe6: p67 + p78 + p8, pGe7: p78 + p8, pGe8: p8, members: members.length === memberCols.length ? members : null };
    }).filter(r => Number.isFinite(r.t)).sort((a, b) => a.t - b.t);
    return { meta: m, data, lastModified: m.lastModified };
  }

  /** FMI IMAGE station file (01 = last hour, 24 = last day) -> {meta, series} */
  async fmiStation(code, len = '24') {
    const m = await fetchWithMeta(this.url(`/api/fmi/${code}/${len}`), { as: 'text' });
    return { meta: m, series: m.ok ? parseFmi(m.body) : null };
  }

  /** IRF Kiruna secondary magnetometer, 1-min IAGA-2002 for the last ~2 h */
  async kiruna() {
    const m = await fetchWithMeta(this.url('/api/irf/kiruna'), { as: 'text' });
    return { meta: m, series: m.ok ? parseIaga2002(m.body) : null };
  }

  /** Tromsø Geophysical Observatory provisional K-indices (7 days, 3-hourly) -> {meta, days:[{date, k:[8]}]} */
  async tgoK(site = 'tro2a') {
    const m = await fetchWithMeta(this.url(`/api/tgo/k/${site}`), { as: 'text' });
    return { meta: m, ...(m.ok ? parseTgoK(m.body) : { name: null, days: [] }) };
  }

  /** UK Met Office space weather overview (HTML in JSON) -> {meta, text, saved} */
  async metOffice() {
    const m = await fetchWithMeta(this.url('/api/metoffice/overview'));
    if (!m.ok || !m.body) return { meta: m, text: null };
    const html = m.body.simplified_content || m.body.content || '';
    return { meta: m, text: stripHtml(html), saved: m.body.saved_dt ? Date.parse(m.body.saved_dt) : null };
  }

  /** SIDC URSIGRAM -> {meta, text, predictions: [{day, f107, ap}], geomagnetism} */
  async sidc() {
    const m = await fetchWithMeta(this.url('/api/sidc/ursigram'), { as: 'text' });
    if (!m.ok) return { meta: m, text: null };
    const txt = m.body;
    const preds = [...txt.matchAll(/PREDICTIONS FOR (\d{1,2} \w{3} \d{4})\s+10CM FLUX:\s*(\d+)\s*\/\s*AP:\s*(\d+)/g)].map(x => ({ day: x[1], f107: +x[2], ap: +x[3] }));
    const geo = (txt.match(/GEOMAGNETISM\s*:\s*([^\n]+)/) || [])[1] || '';
    return { meta: m, text: txt, predictions: preds, geomagnetism: geo.trim() };
  }
}

export function stripHtml(html) {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Parse a TGO K-index file: "K-Indices for Tromso", then rows "18 sep. 2026 4111 0123" with eight
 * 3-hour digits (x = not yet available). Returns {name, days:[{date (ms, UTC midnight), k:[8 numbers or null]}]}.
 */
export function parseTgoK(txt) {
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mai: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, des: 11 };
  const name = (txt.match(/K-Indices for (.+)/) || [])[1]?.trim() || null;
  const days = [];
  for (const line of txt.split('\n')) {
    const m = line.trim().match(/^(\d{1,2}) ([a-z]{3})\.? (\d{4}) ([0-9x]{4}) ([0-9x]{4})$/i);
    if (!m) continue;
    const mon = MONTHS[m[2].toLowerCase()]; if (mon === undefined) continue;
    const digits = (m[4] + m[5]).split('').map(c => (c === 'x' ? null : +c));
    days.push({ date: Date.UTC(+m[3], mon, +m[1]), k: digits });
  }
  return { name, days };
}
