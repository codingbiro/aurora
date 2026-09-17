// Long-term (1 to 3 day) panel: parsers for NOAA text products, CME arrival handling,
// WSA-Enlil event extraction and nightly visibility probabilities.

const DAY = 86400e3;
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

/** ":Issued: 2026 Sep 16 2205 UTC" -> ms */
export function parseIssued(txt) {
  const m = txt.match(/:Issued:\s+(\d{4}) (\w{3}) (\d{1,2}) (\d{2})(\d{2}) UTC/);
  return m ? Date.UTC(+m[1], MONTHS[m[2]], +m[3], +m[4], +m[5]) : null;
}

/**
 * text/3-day-geomag-forecast.txt -> {issued, ap: {observed, estimated, predicted[3]},
 * probabilities: [{date, active, minor, moderate, strong}], kp: [{t, kp}] (3-h bins)}
 */
export function parseGeomagForecast(txt) {
  const issued = parseIssued(txt);
  const out = { issued, ap: {}, probabilities: [], kp: [] };
  const apObs = txt.match(/Observed Ap (\d{2}) (\w{3}) (\d+)/);
  const apEst = txt.match(/Estimated Ap (\d{2}) (\w{3}) (\d+)/);
  const apPred = txt.match(/Predicted Ap (\d{2}) (\w{3})-(\d{2}) (\w{3}) ([\d-]+)/);
  if (apObs) out.ap.observed = +apObs[3];
  if (apEst) out.ap.estimated = +apEst[3];
  if (apPred) out.ap.predicted = apPred[5].split('-').map(Number);
  const probHeader = txt.match(/Probabilities (\d{2}) (\w{3})-(\d{2}) (\w{3})/);
  const rows = {};
  for (const [key, label] of [['active', 'Active'], ['minor', 'Minor storm'], ['moderate', 'Moderate storm'], ['strong', 'Strong-Extreme storm']]) {
    const m = txt.match(new RegExp(label + '\\s+(\\d+)/(\\d+)/(\\d+)'));
    if (m) rows[key] = [+m[1], +m[2], +m[3]];
  }
  const year = issued ? new Date(issued).getUTCFullYear() : new Date().getUTCFullYear();
  const dates = parseKpTable(txt, year);
  if (probHeader && rows.active) {
    const d0 = dates.days[0] ?? Date.UTC(year, MONTHS[probHeader[2]], +probHeader[1]);
    for (let i = 0; i < 3; i++) {
      out.probabilities.push({ date: d0 + i * DAY, active: rows.active[i] / 100, minor: rows.minor[i] / 100, moderate: rows.moderate[i] / 100, strong: rows.strong[i] / 100 });
    }
  }
  out.kp = dates.kp;
  return out;
}

/** Parse the 3-column "HH-HHUT  a  b  c" Kp table found in both 3-day products. */
export function parseKpTable(txt, year) {
  const header = txt.match(/\s+(\w{3}) (\d{1,2})\s+(\w{3}) (\d{1,2})\s+(\w{3}) (\d{1,2})\s*\n/);
  const kp = [], days = [];
  if (!header) return { kp, days };
  for (let i = 0; i < 3; i++) {
    const mon = MONTHS[header[1 + 2 * i]]; let y = year;
    days.push(Date.UTC(y, mon, +header[2 + 2 * i]));
  }
  // handle year wrap (Dec -> Jan)
  for (let i = 1; i < 3; i++) if (days[i] < days[i - 1]) days[i] += 365 * DAY;
  const re = /(\d{2})-(\d{2})UT\s+([\d.]+)(?: \(G\d\))?\s+([\d.]+)(?: \(G\d\))?\s+([\d.]+)(?: \(G\d\))?/g;
  let m;
  while ((m = re.exec(txt))) {
    const h = +m[1];
    for (let i = 0; i < 3; i++) kp.push({ t: days[i] + h * 3600e3, kp: +m[3 + i] });
  }
  kp.sort((a, b) => a.t - b.t);
  return { kp, days };
}

/** text/3-day-forecast.txt -> {issued, maxObserved, maxExpected, rationale, kp[]} */
export function parseThreeDayForecast(txt) {
  const issued = parseIssued(txt);
  const year = issued ? new Date(issued).getUTCFullYear() : new Date().getUTCFullYear();
  const maxObs = txt.match(/greatest observed 3 hr Kp over the past 24 hours was ([\d.]+)/);
  const maxExp = txt.match(/greatest expected 3 hr Kp for .*? is ([\d.]+)/s);
  const rat = txt.match(/Rationale:\s*(?:Rationale:\s*)?([\s\S]*?)\n\s*\n\s*B\./);
  return { issued, maxObserved: maxObs ? +maxObs[1] : NaN, maxExpected: maxExp ? +maxExp[1] : NaN,
    rationale: rat ? rat[1].replace(/\s+/g, ' ').trim() : '', kp: parseKpTable(txt, year).kp };
}

/** text/discussion.txt -> {issued, sections: {solarWind: {summary, forecast}, geospace: {...}, solar: {...}}} */
export function parseDiscussion(txt) {
  const issued = parseIssued(txt);
  const sections = {};
  const names = { 'Solar Activity': 'solar', 'Energetic Particle': 'particles', 'Solar Wind': 'solarWind', 'Geospace': 'geospace' };
  const parts = txt.split(/\n(?=(?:Solar Activity|Energetic Particle|Solar Wind|Geospace)\n)/);
  for (const p of parts) {
    const title = p.split('\n')[0].trim();
    if (!names[title]) continue;
    const sum = p.match(/\.24 hr Summary\.\.\.\s*([\s\S]*?)(?=\n\.Forecast|\n\s*$)/);
    const fc = p.match(/\.Forecast\.\.\.\s*([\s\S]*?)$/);
    sections[names[title]] = { summary: sum ? clean(sum[1]) : '', forecast: fc ? clean(fc[1]) : '' };
  }
  return { issued, sections };
}
const clean = (s) => s.replace(/\s+/g, ' ').trim();

/** text/27-day-outlook.txt -> {issued, days: [{date, f107, ap, kpMax}]} */
export function parse27Day(txt) {
  const issued = parseIssued(txt);
  const days = [];
  const re = /^(\d{4}) (\w{3}) (\d{2})\s+(\d+)\s+(\d+)\s+(\d+)\s*$/gm;
  let m;
  while ((m = re.exec(txt))) days.push({ date: Date.UTC(+m[1], MONTHS[m[2]], +m[3]), f107: +m[4], ap: +m[5], kpMax: +m[6] });
  return { issued, days };
}

/**
 * products/alerts.json -> normalized list with NOAA message codes and, for watches,
 * the predicted G level per day.
 */
export function parseAlerts(list) {
  const out = [];
  for (const a of list) {
    const msg = a.message || '';
    const code = (msg.match(/Space Weather Message Code:\s*(\w+)/) || [])[1] || a.product_id;
    const issue = Date.parse(a.issue_datetime.replace(' ', 'T') + 'Z');
    const item = { code, productId: a.product_id, issued: issue, message: msg, kind: kindFromCode(code) };
    const gm = code && code.match(/^WATA(\d\d)/);
    if (gm) {
      item.watchLevel = { '20': 1, '30': 2, '50': 3, '99': 4 }[gm[1]] ?? null;
      item.byDay = [...msg.matchAll(/(\w{3}) (\d{1,2}):\s+(G\d|None)/g)].map(m => ({ label: `${m[1]} ${m[2]}`, level: m[3] === 'None' ? 0 : +m[3][1] }));
      item.cancelled = /CANCEL WATCH/.test(msg);
    }
    const km = code && code.match(/^(?:WARK|ALTK)0?(\d)/);
    if (km) item.kLevel = +km[1];
    const valid = msg.match(/Valid (?:From|Until|To):\s*(\d{4} \w{3} \d{2} \d{4}) UTC/g);
    if (valid) item.validUntil = parseNoaaTime((msg.match(/(?:Now Valid Until|Valid To|Valid Until):\s*(\d{4} \w{3} \d{2} \d{4}) UTC/) || [])[1]);
    out.push(item);
  }
  return out.sort((a, b) => b.issued - a.issued);
}
function kindFromCode(code = '') {
  if (code.startsWith('WAT')) return 'watch';
  if (code.startsWith('WAR')) return 'warning';
  if (code.startsWith('ALT')) return 'alert';
  if (code.startsWith('SUM')) return 'summary';
  return 'other';
}
function parseNoaaTime(s) {
  if (!s) return null;
  const m = s.match(/(\d{4}) (\w{3}) (\d{2}) (\d{2})(\d{2})/);
  return m ? Date.UTC(+m[1], MONTHS[m[2]], +m[3], +m[4], +m[5]) : null;
}

/** Active geomagnetic watches and warnings (not cancelled, still valid or issued in the last 3 days). */
export function activeGeomagneticMessages(alerts, now) {
  return alerts.filter(a => (a.kind === 'watch' || a.kind === 'warning' || a.kind === 'alert') && /Geomagnetic/i.test(a.message) && !a.cancelled
    && (a.validUntil ? a.validUntil >= now - 6 * 3600e3 : a.issued >= now - 3 * DAY));
}

/**
 * NASA DONKI CME list -> Earth-directed arrival predictions, one per CME (latest
 * most-accurate WSA-Enlil run), with the Kp range spanned by the field-orientation scenarios.
 */
export function cmeArrivals(cmes, now, { horizonDays = 5 } = {}) {
  const out = [];
  for (const c of cmes) {
    let best = null;
    for (const a of c.cmeAnalyses || []) {
      for (const e of a.enlilList || []) {
        if (!e.estimatedShockArrivalTime) continue;
        const done = Date.parse(e.modelCompletionTime);
        const score = (a.isMostAccurate ? 1e15 : 0) + done;
        if (!best || score > best.score) best = { score, a, e };
      }
    }
    if (!best) continue;
    const arrival = Date.parse(best.e.estimatedShockArrivalTime);
    if (arrival < now - 12 * 3600e3 || arrival > now + horizonDays * DAY) continue;
    out.push({
      id: c.activityID, start: Date.parse(c.startTime), source: c.sourceLocation || '', note: c.note || '',
      speed: best.a.speed, halfAngle: best.a.halfAngle, type: best.a.type, lat: best.a.latitude, lon: best.a.longitude,
      arrival, uncertaintyH: 7, duration: best.e.estimatedDuration, glancing: !!best.e.isEarthGB, minor: !!best.e.isEarthMinorImpact,
      kp: { k90: best.e.kp_90, k135: best.e.kp_135, k180: best.e.kp_180 }, modelCompleted: Date.parse(best.e.modelCompletionTime),
      link: best.e.link || c.link,
    });
  }
  return out.sort((a, b) => a.arrival - b.arrival);
}

/**
 * WSA-Enlil time series at Earth -> ascending records plus detected events:
 * high-speed-stream ramps (v_r rises >= 100 km/s within 24 h) and CME cloud passages.
 */
export function enlilEvents(series, now) {
  const rows = series.map(r => ({ t: Date.parse(r.time_tag + (r.time_tag.endsWith('Z') ? '' : 'Z')), v: r.v_r, n: r.earth_particles_per_cm3, b: Math.hypot(r.b_r, r.b_theta, r.b_phi), polarity: r.polarity, cloud: r.cloud }))
    .filter(r => Number.isFinite(r.t)).sort((a, b) => a.t - b.t);
  const events = [];
  // CME cloud passages in the future
  let inCloud = false, start = null;
  for (const r of rows) {
    if (r.cloud > 0.1 && !inCloud) { inCloud = true; start = r.t; }
    if (r.cloud <= 0.1 && inCloud) { inCloud = false; if (start >= now - DAY) events.push({ kind: 'cme-cloud', start, end: r.t }); }
  }
  if (inCloud && start) events.push({ kind: 'cme-cloud', start, end: rows[rows.length - 1].t });
  // HSS ramps: compare each point to the minimum in the preceding 24 h
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].t < now - DAY) continue;
    let vmin = Infinity, tmin = rows[i].t;
    for (let j = i; j >= 0 && rows[i].t - rows[j].t <= DAY; j--) if (rows[j].v < vmin) { vmin = rows[j].v; tmin = rows[j].t; }
    if (rows[i].v - vmin >= 100 && !events.some(e => e.kind === 'hss' && Math.abs(e.start - tmin) < 12 * 3600e3)) {
      events.push({ kind: 'hss', start: tmin, peakT: rows[i].t, from: vmin, to: rows[i].v });
    }
  }
  const last = rows.length ? rows[rows.length - 1].t : null;
  return { rows, events, horizonEnd: last };
}

// ---------------------------------------------------------------------------------
// Nightly visibility probability

/** P(max Kp over a UTC day >= threshold) from NOAA's four category probabilities. */
export function dayProbabilityAtLeast(p, threshold) {
  // categories describe the day's peak: Active = Kp 4, Minor = 5, Moderate = 6, Strong-Extreme = 7+
  const ge4 = p.active + p.minor + p.moderate + p.strong;
  const ge5 = p.minor + p.moderate + p.strong;
  const ge6 = p.moderate + p.strong;
  const ge7 = p.strong;
  const pts = [[4, ge4], [5, ge5], [6, ge6], [7, ge7]];
  if (threshold <= 4) return Math.min(1, ge4 + (4 - threshold) * (1 - ge4) / 4); // below Kp 4 NOAA gives no category; taper to 1 at Kp 0
  if (threshold >= 7) return ge7 * Math.max(0, 1 - (threshold - 7) / 2);
  for (let i = 0; i < pts.length - 1; i++) {
    const [k0, p0] = pts[i], [k1, p1] = pts[i + 1];
    if (threshold >= k0 && threshold <= k1) return p0 + (p1 - p0) * (threshold - k0) / (k1 - k0);
  }
  return NaN;
}

/**
 * Night cards for the next three nights. A night runs from 16:00 to 06:00 UTC (covering
 * European darkness with margin; daylight itself is deliberately ignored here).
 * kpForecast: [{t, kp}] 3-h bins (NOAA); probabilities: from parseGeomagForecast;
 * ensemble: optional GFZ rows [{t, median, q25, q75, pGe4, pGe5, pGe6, pGe7}];
 * thresholds: {horizon, overhead} Kp values for the observer.
 */
export function nightCards(now, kpForecast, probabilities, ensemble, thresholds, { nights = 3, sigma = 0.8 } = {}) {
  const cards = [];
  const startDay = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
  // if it is already past 06 UTC we start with tonight; otherwise the current night is still running
  const firstEvening = new Date(now).getUTCHours() < 6 ? startDay - DAY : startDay;
  for (let i = 0; i < nights; i++) {
    const evening = firstEvening + i * DAY;
    const start = evening + 16 * 3600e3, end = evening + DAY + 6 * 3600e3;
    const bins = kpForecast.filter(b => b.t >= start - 3 * 3600e3 && b.t < end);
    const kpMax = bins.length ? Math.max(...bins.map(b => b.kp)) : NaN;
    const days = probabilities.filter(p => p.date === evening || p.date === evening + DAY);
    const card = { evening, start, end, kpMax, bins, estimates: {} };
    for (const [name, thr] of Object.entries(thresholds)) {
      const parts = [];
      if (Number.isFinite(kpMax)) parts.push({ source: 'noaa-kp', value: probFromBins(bins, thr, sigma) });
      if (days.length) parts.push({ source: 'noaa-probabilities', value: Math.max(...days.map(d => dayProbabilityAtLeast(d, thr))) * nightShare(days.length) });
      const ens = (ensemble || []).filter(r => r.t >= start - 3 * 3600e3 && r.t < end);
      if (ens.length) parts.push({ source: 'gfz-ensemble', value: 1 - ens.reduce((s, r) => s * (1 - ensembleProbAtLeast(r, thr)), 1) });
      const vals = parts.filter(p => Number.isFinite(p.value));
      card.estimates[name] = { probability: vals.length ? vals.reduce((s, p) => s + p.value, 0) / vals.length : NaN, parts: vals, threshold: thr };
    }
    cards.push(card);
  }
  return cards;
}
const nightShare = (nDays) => (nDays >= 2 ? 0.9 : 0.75); // a day's peak may fall outside the night window
function probFromBins(bins, thr, sigma) {
  // probability that at least one 3-h bin reaches the threshold, treating bins as correlated (use the max)
  const kpMax = Math.max(...bins.map(b => b.kp));
  const z = (kpMax - thr) / (sigma * 0.5513);
  return 1 / (1 + Math.exp(-z));
}
function ensembleProbAtLeast(r, thr) {
  if (Number.isFinite(r.pGe4)) {
    const pts = [[4, r.pGe4], [5, r.pGe5], [6, r.pGe6], [7, r.pGe7], [8, r.pGe8 ?? 0]];
    if (thr <= 4) return Math.min(1, r.pGe4 + (4 - thr) * (1 - r.pGe4) / 4);
    for (let i = 0; i < pts.length - 1; i++) if (thr >= pts[i][0] && thr <= pts[i + 1][0]) return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (thr - pts[i][0]);
    return 0;
  }
  return NaN;
}
