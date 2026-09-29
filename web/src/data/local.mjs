// Local ground signals for a mid-latitude observer near Denmark: the IRF Tormestorp variometer
// (56.0 N 13.9 E, magnetic latitude about 53, 1-second, through the Worker proxy), INTERMAGNET
// minute data from Hel (54.6 N 18.8 E, magnetic latitude about 51, browser-direct, CC BY-NC) and
// AuroraWatch UK's hourly activity level (Lancaster, stations at 51-54 magnetic latitude, browser-direct).
// Each source is turned into a "tier" of visible aurora at Copenhagen's magnetic latitude, following
// AuroraWatch's own calibration: 50 nT camera, 100 nT naked eye from a dark site, 200 nT naked eye
// from anywhere.
import { fetchWithMeta } from './fetch-util.mjs';

const MIN = 60e3;
export const TIER_NT = { camera: 50, eyeDark: 100, eyeCity: 200 };

/** Parse the Tormestorp 1-second CSV tail: "ISO-time,c1,c2,c3" (c1 north-like, c3 vertical-like), first partial line dropped. */
export function parseTormestorp(txt) {
  const t = [], x = [], y = [], z = [];
  const lines = txt.split('\n');
  for (let i = lines[0].startsWith('20') ? 0 : 1; i < lines.length; i++) {
    const f = lines[i].trim().split(',');
    if (f.length < 4 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(f[0])) continue;
    const ms = Date.parse(f[0] + 'Z'); const a = +f[1], b = +f[2], c = +f[3];
    if (!Number.isFinite(ms) || !Number.isFinite(a)) continue;
    t.push(ms); x.push(a); y.push(b); z.push(c);
  }
  return { t, x, y, z };
}

/** Parse the Tormestorp quiet-day curve "HHMMSS c1 c2 c3" at 10-minute steps -> {sec: [...], x: [...]}. */
export function parseQuietCurve(txt) {
  const sec = [], x = [], z = [];
  for (const line of txt.split('\n')) {
    const m = line.trim().match(/^(\d{2})(\d{2})(\d{2})\s+(\S+)\s+(\S+)\s+(\S+)/);
    if (!m) continue;
    sec.push(+m[1] * 3600 + +m[2] * 60 + +m[3]); x.push(+m[4]); z.push(+m[6]);
  }
  return { sec, x, z };
}

/** Quiet-curve value at a UTC time (seconds of day), linear interpolation, wrapping at midnight. */
export function quietAt(curve, t, key = 'x') {
  if (!curve || !curve.sec.length) return NaN;
  const s = ((t / 1000) % 86400 + 86400) % 86400;
  const arr = curve[key];
  let i = 0; while (i < curve.sec.length - 1 && curve.sec[i + 1] <= s) i++;
  const j = (i + 1) % curve.sec.length;
  const s0 = curve.sec[i], s1 = j === 0 ? curve.sec[j] + 86400 : curve.sec[j];
  const f = s1 === s0 ? 0 : Math.min(1, Math.max(0, (s - s0) / (s1 - s0)));
  return arr[i] + f * (arr[j] - arr[i]);
}

/** Parse "2 2 2 3 3 3 _ _" (today's eight 3-hour K values at Tormestorp). */
export function parseKLine(txt) {
  const m = (txt || '').trim().split('\n').pop().trim().split(/\s+/);
  const k = m.map(c => (/^\d$/.test(c) ? +c : null));
  return k.length === 8 ? k : [];
}

/** AuroraWatch UK current status XML -> {status, updated}. */
export function parseAuroraWatchStatus(xml) {
  const status = (xml.match(/status_id="(\w+)"/) || [])[1] || null;
  const updated = (xml.match(/<datetime>([^<]+)<\/datetime>/) || [])[1];
  return { status, updated: updated ? Date.parse(updated.replace(/\+0000$/, 'Z')) : NaN };
}

/** AuroraWatch UK site activity XML -> {thresholds: {yellow, amber, red}, hourly: [{t, value, status}]}. */
export function parseAuroraWatchActivity(xml) {
  const thresholds = {};
  for (const m of xml.matchAll(/<lower_threshold status_id="(\w+)">([\d.]+)<\/lower_threshold>/g)) thresholds[m[1]] = +m[2];
  const hourly = [];
  for (const m of xml.matchAll(/<activity status_id="(\w+)">\s*<datetime>([^<]+)<\/datetime>\s*<value>([\d.]+)<\/value>/g)) hourly.push({ status: m[1], t: Date.parse(m[2].replace(/\+0000$/, 'Z')), value: +m[3] });
  return { thresholds, hourly };
}

/** Tier index for a horizontal deviation in nT at 51-54 magnetic latitude: 0 none, 1 camera, 2 naked eye dark site, 3 naked eye city. */
export function tierFromNt(nt) {
  const a = Math.abs(nt);
  if (!Number.isFinite(a)) return NaN;
  return a >= TIER_NT.eyeCity ? 3 : a >= TIER_NT.eyeDark ? 2 : a >= TIER_NT.camera ? 1 : 0;
}
export const AW_TIER = { green: 0, yellow: 1, amber: 2, red: 3 };
export const TIER_LABEL = ['nothing', 'camera', 'eye, dark site', 'eye, city'];

/** Quiet level for a station without a quiet-day curve: a high percentile of the last day (bays are negative). */
function percentile(values, p) { const v = values.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))] : NaN; }

/**
 * Combine the local sources into one signal for the last `windowMin` minutes.
 * tormestorp: {series:{t,x,y,z}, quiet, k:[8], meta}; hel: {series:{t,x,y,z}, meta}; aurorawatch: {status, updated, hourly}
 * Returns {tier, label, sources: [{name, tier, value, t, ageMin, note}], deviation, fresh}.
 */
export function localSignal({ tormestorp, hel, aurorawatch }, now, windowMin = 30) {
  const sources = [];
  if (tormestorp?.series?.t?.length) {
    const s = tormestorp.series; let worst = 0, latest = NaN, tLatest = NaN;
    for (let i = 0; i < s.t.length; i++) {
      if (s.t[i] < now - windowMin * MIN || s.t[i] > now) continue;
      const q = tormestorp.quiet ? quietAt(tormestorp.quiet, s.t[i]) : NaN;
      const dev = Number.isFinite(q) ? s.x[i] - q : NaN;
      if (!Number.isFinite(dev)) continue;
      if (Math.abs(dev) > Math.abs(worst)) worst = dev;
      latest = dev; tLatest = s.t[i];
    }
    const kNow = tormestorp.k && tormestorp.k.length ? tormestorp.k.filter(v => v !== null).slice(-1)[0] : null;
    if (Number.isFinite(latest)) sources.push({ name: 'Tormestorp (IRF, 130 km NE)', tier: tierFromNt(worst), value: worst, latest, t: tLatest, ageMin: (now - tLatest) / MIN, note: kNow !== null && kNow !== undefined ? `K ${kNow}` : '' });
  }
  if (hel?.series?.t?.length) {
    const s = hel.series; const base = percentile(s.x, 0.8); let worst = 0, latest = NaN, tLatest = NaN;
    for (let i = 0; i < s.t.length; i++) {
      if (s.t[i] < now - windowMin * MIN || s.t[i] > now || !Number.isFinite(s.x[i])) continue;
      const dev = s.x[i] - base; if (Math.abs(dev) > Math.abs(worst)) worst = dev; latest = dev; tLatest = s.t[i];
    }
    if (Number.isFinite(latest)) sources.push({ name: 'Hel (INTERMAGNET, 1 h east)', tier: tierFromNt(worst), value: worst, latest, t: tLatest, ageMin: (now - tLatest) / MIN, note: '' });
  }
  if (aurorawatch?.status) {
    const tier = AW_TIER[aurorawatch.status] ?? NaN;
    const last = aurorawatch.hourly?.length ? aurorawatch.hourly[aurorawatch.hourly.length - 1] : null;
    sources.push({ name: 'AuroraWatch UK', tier, value: last ? last.value : NaN, latest: last ? last.value : NaN, t: aurorawatch.updated, ageMin: (now - aurorawatch.updated) / MIN, note: aurorawatch.status });
  }
  const fresh = sources.filter(s => Number.isFinite(s.tier) && s.ageMin <= 25);
  const tier = fresh.length ? Math.max(...fresh.map(s => s.tier)) : NaN;
  // ageMin of the sources that set the tier: the forecast floors its first half hour on a fresh signal only
  const setting = fresh.filter(s => s.tier === tier);
  return { tier, label: Number.isFinite(tier) ? TIER_LABEL[tier] : 'no data', sources, fresh: fresh.length, ageMin: setting.length ? Math.min(...setting.map(s => s.ageMin)) : NaN };
}

/** Fetchers. proxy: ProxyClient or null. Each returns {meta, ...parsed}. */
export const loadLocal = {
  async tormestorp(proxy) {
    if (!proxy || !proxy.available) return { meta: { ok: false, error: 'no proxy' }, series: null };
    const [tail, quiet, k] = await Promise.all([
      fetchWithMeta(proxy.url('/api/irf/tormestorp/tail'), { as: 'text' }), fetchWithMeta(proxy.url('/api/irf/tormestorp/quiet'), { as: 'text' }), fetchWithMeta(proxy.url('/api/irf/tormestorp/k'), { as: 'text' }),
    ]);
    return { meta: tail, series: tail.ok ? parseTormestorp(tail.body) : null, quiet: quiet.ok ? parseQuietCurve(quiet.body) : null, k: k.ok ? parseKLine(k.body) : [] };
  },
  async hel(now = Date.now()) {
    const day = (t) => new Date(t).toISOString().slice(0, 10);
    const url = `https://imag-data.bgs.ac.uk/GIN_V1/GINServices?Request=GetData&format=json&testObsys=0&observatoryIagaCode=HLP&samplesPerDay=minute&publicationState=adj-or-rep&dataStartDate=${day(now - 86400e3)}&dataDuration=2&orientation=Native`;
    const m = await fetchWithMeta(url);
    if (!m.ok || !m.body || !Array.isArray(m.body.datetime)) return { meta: m, series: null };
    const t = [], x = [], y = [], z = [];
    m.body.datetime.forEach((d, i) => { const X = m.body.X[i]; if (X === null || !Number.isFinite(X)) return; t.push(Date.parse(d)); x.push(X); y.push(m.body.Y[i]); z.push(m.body.Z[i]); });
    return { meta: m, series: { t, x, y, z } };
  },
  async aurorawatch() {
    const [st, act] = await Promise.all([fetchWithMeta('https://aurorawatch-api.lancs.ac.uk/0.2/status/current-status.xml', { as: 'text' }), fetchWithMeta('https://aurorawatch-api.lancs.ac.uk/0.2/status/alerting-site-activity.xml', { as: 'text' })]);
    if (!st.ok) return { meta: st, status: null };
    return { meta: st, ...parseAuroraWatchStatus(st.body), ...(act.ok ? parseAuroraWatchActivity(act.body) : { thresholds: {}, hourly: [] }) };
  },
};
