// Model check page: calibration report, reliability, live hindcast, CME scoreboard statistics.
import { load, URLS } from './data/noaa.mjs';
import { iswaHp30 } from './data/hapi.mjs';
import { weightedRecentAverage } from './model/integrate.mjs';
import { hp30FromDriving } from './model/activity.mjs';
import { el, clear, fmt } from './ui/format.mjs';
import { ProxyClient } from './data/proxied.mjs';
import { scoreSummary } from './model/scoring.mjs';
import { kpForBoundary, TIERS } from './model/oval.mjs';
import { normalCdf } from './model/substorm.mjs';
import { AW_TIER } from './data/local.mjs';

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const HOUR = 3600e3, MIN = 60e3;
/** Charts are images named by their figure caption, for screen readers. */
function named(svg, container) { svg.attr('role', 'img'); const cap = container.closest('figure')?.querySelector('figcaption'); if (cap) { if (!cap.id) cap.id = `${container.id}-caption`; svg.attr('aria-labelledby', cap.id); } }

const [coefs, report, board] = await Promise.all(['data/coefficients.json', 'data/calibration_report.json', 'data/scoreboard_stats.json'].map(u => fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null)));

// ---- calibration section
if (coefs && coefs.skill) {
  document.getElementById('cal-sub').textContent = `${coefs.source?.years || 2} years of GFZ Hp30 versus OMNI solar wind (${coefs.hp30?.n?.toLocaleString()} half-hour intervals; generated ${fmt.dateUtc(Date.parse(coefs.generated))}). Test period is the most recent 20%.`;
  const t = clear(document.getElementById('skill-table'));
  t.append(el('thead', {}, el('tr', {}, ['Model', 'RMSE', 'MAE', 'Bias', 'r'].map((h, i) => el('th', { class: i ? 'num' : '', text: h })))));
  const rows = [['This model (calibrated)', coefs.skill.test.ours], ['Newell 2008 Kp coefficients', coefs.skill.test.newell2008], ['Persistence (previous 30 min)', coefs.skill.test.persistence], ['This model where Hp30 reached 3 (rows picked by the outcome, so any regression reads low here)', coefs.skill.test.oursOnStorms]];
  const tb = el('tbody'); for (const [name, s] of rows) if (s) tb.append(el('tr', {}, [el('td', { text: name }), ...['rmse', 'mae', 'bias', 'r'].map(k => el('td', { class: 'num', text: fmt.num(s[k], k === 'r' ? 2 : 2) }))]));
  t.append(tb);
  const notes = clear(document.getElementById('cal-notes'));
  const h = coefs.hp30, st = coefs.hp30_storm, term = (v, what) => `${v < 0 ? '−' : '+'} ${Math.abs(v).toExponential(3)} × ${what}`;
  notes.append(el('p', { text: `Hp30 = ${h.intercept.toFixed(3)} ${Number.isFinite(h.sqrtCoupling) ? term(h.sqrtCoupling, '√(4-hour weighted coupling)') + ' ' : ''}${term(h.coupling, '(4-hour weighted coupling)')} ${term(h.viscous, '(√n·v²)')}. For comparison Newell et al. 2008 published 0.05, 2.244e-4 and 2.844e-6 for Kp, without the square-root term.${st ? ` Where the general fit predicts more than ${st.from ?? 2.5}, a fit on the intervals it predicted that high (${st.intercept.toFixed(2)}, √ ${st.sqrtCoupling?.toExponential(2) ?? '–'}, ${st.coupling.toExponential(2)}, ${st.viscous.toExponential(2)}) is blended in over one Kp unit${Number.isFinite(st.testBiasBlend) ? `; on the test period its bias in that range is ${fmt.signed(st.testBiasBlend, 2)} against ${fmt.signed(st.testBiasGeneral, 2)} for the general fit` : ''}.` : ''}` }));
  notes.append(el('p', { text: 'Persistence wins at a 30-minute lag: the dashboard therefore anchors the first horizons on the last observed Hp30 or estimated Kp and lets the solar-wind model take over as the horizon grows. The model earns its keep from the 30 to 90 minutes of lead the L1 measurement provides.' }));
}
if (report && report.reliability) reliabilityChart(document.getElementById('reliability-chart'), report.reliability);
if (report && report.residuals) residualChart(document.getElementById('residual-chart'), report.residuals);

function reliabilityChart(container, rel) {
  const width = Math.max(container.clientWidth || 600, 400), height = 220, m = { top: 12, right: 14, bottom: 30, left: 40 };
  d3.select(container).selectAll('svg').remove();
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').call(named, container);
  const thresholds = Object.keys(rel);
  const bins = rel[thresholds[0]].map(r => r.bin);
  const x = d3.scaleLinear().domain([Math.min(...bins), Math.max(...bins) + 0.5]).range([m.left, width - m.right]);
  const y = d3.scaleLinear().domain([0, 1]).range([height - m.bottom, m.top]);
  svg.append('g').call(d3.axisLeft(y).ticks(5).tickSize(-(width - m.left - m.right)).tickFormat('')).attr('transform', `translate(${m.left},0)`).selectAll('line').attr('stroke', css('--grid'));
  const colors = [css('--s1'), css('--s2'), css('--s3')];
  thresholds.forEach((thr, i) => {
    const pts = rel[thr].filter(r => r.n >= 20);
    svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', colors[i]).attr('stroke-width', 2).attr('d', d3.line().x(r => x(r.bin + 0.25)).y(r => y(r.observedFrequency)));
    svg.selectAll(null).data(pts).enter().append('circle').attr('cx', r => x(r.bin + 0.25)).attr('cy', r => y(r.observedFrequency)).attr('r', 3).attr('fill', colors[i]);
    svg.append('text').attr('x', width - m.right).attr('y', m.top + 12 * (i + 1)).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', colors[i]).text(`observed Hp30 ≥ ${thr.replace(/^ge/, '')}`);
  });
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - m.bottom})`).call(d3.axisBottom(x).ticks(8).tickFormat(v => `${v}`)).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%'))).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('text').attr('x', width / 2).attr('y', height - 4).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', css('--muted')).text('predicted Hp30 (bin start)');
}
function residualChart(container, hist) {
  const width = Math.max(container.clientWidth || 600, 400), height = 160, m = { top: 10, right: 14, bottom: 30, left: 40 };
  d3.select(container).selectAll('svg').remove();
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').call(named, container);
  const bins = (hist.bins || hist).map(b => ({ from: b.from, to: b.to, count: b.count ?? b.n }));
  const x = d3.scaleLinear().domain([d3.min(bins, b => b.from), d3.max(bins, b => b.to)]).range([m.left, width - m.right]);
  const y = d3.scaleLinear().domain([0, d3.max(bins, b => b.count)]).nice().range([height - m.bottom, m.top]);
  svg.selectAll(null).data(bins).enter().append('rect').attr('x', b => x(b.from) + 1).attr('width', b => Math.max(1, x(b.to) - x(b.from) - 2)).attr('y', b => y(b.count)).attr('height', b => height - m.bottom - y(b.count)).attr('rx', 2).attr('fill', css('--s1'));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - m.bottom})`).call(d3.axisBottom(x).ticks(9)).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4)).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('text').attr('x', width / 2).attr('y', height - 4).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', css('--muted')).text('modeled minus observed Hp30');
}

// ---- live hindcast
const now = Date.now();
const [p7, hp, kp3] = await Promise.all([load.propagated(URLS.propagated7d), iswaHp30(now, 72), load.kp3h()]);
const kp1 = await load.kp1m();
const model = [];
for (let t = now - 72 * HOUR; t <= now; t += 30 * MIN) {
  const d = weightedRecentAverage(p7.data, t, 'coupling', { minHours: 2 }).value, v = weightedRecentAverage(p7.data, t, 'viscous', { minHours: 1 }).value;
  const kp = hp30FromDriving(d, v, coefs?.hp30, coefs?.hp30_storm); if (Number.isFinite(kp)) model.push({ t, kp });
}
const obs = hp.data.map(r => ({ t: r.t + 30 * MIN, kp: r.hp30 })); // GFZ stamps interval start; compare at interval end
hindcastChart(document.getElementById('hindcast-chart'), model, obs, kp1.data, kp3.data);
const pairs = obs.map(o => { const mm = model.find(x => Math.abs(x.t - o.t) < 16 * MIN); return mm ? { t: o.t, obs: o.kp, model: mm.kp } : null; }).filter(Boolean);
const rmse = Math.sqrt(pairs.reduce((s, p) => s + (p.model - p.obs) ** 2, 0) / Math.max(1, pairs.length)), bias = pairs.reduce((s, p) => s + (p.model - p.obs), 0) / Math.max(1, pairs.length);
document.getElementById('live-sub').textContent = `Kp modeled from NOAA's propagated solar wind versus what was observed. Over the last 3 days: ${pairs.length} half-hours compared, RMSE ${rmse.toFixed(2)}, bias ${fmt.signed(bias, 2)} (model minus observed Hp30).`;
const ht = clear(document.getElementById('hindcast-table'));
ht.append(el('thead', {}, el('tr', {}, ['Time UTC', 'Modeled Kp', 'Observed Hp30', 'Difference'].map((h, i) => el('th', { class: i ? 'num' : '', text: h })))));
const htb = el('tbody'); for (const p of pairs.slice(-24)) htb.append(el('tr', {}, [el('td', { text: fmt.dateUtc(p.t) }), el('td', { class: 'num', text: fmt.num(p.model, 2) }), el('td', { class: 'num', text: fmt.num(p.obs, 2) }), el('td', { class: 'num', text: fmt.signed(p.model - p.obs, 2) })]));
ht.append(htb);

function hindcastChart(container, model, obs, kp1m, kp3h) {
  const width = Math.max(container.clientWidth || 600, 400), height = 220, m = { top: 12, right: 14, bottom: 30, left: 36 };
  d3.select(container).selectAll('svg').remove();
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').call(named, container);
  const x = d3.scaleUtc().domain([now - 72 * HOUR, now]).range([m.left, width - m.right]);
  const y = d3.scaleLinear().domain([0, Math.max(5, d3.max([...model, ...obs], r => r.kp) + 0.5 || 5)]).nice().range([height - m.bottom, m.top]);
  svg.append('g').call(d3.axisLeft(y).ticks(5).tickSize(-(width - m.left - m.right)).tickFormat('')).attr('transform', `translate(${m.left},0)`).selectAll('line').attr('stroke', css('--grid'));
  const line = (data, color, w, dash) => svg.append('path').datum(data).attr('fill', 'none').attr('stroke', color).attr('stroke-width', w).attr('stroke-dasharray', dash || null).attr('d', d3.line().x(r => x(r.t)).y(r => y(r.kp)).defined(r => Number.isFinite(r.kp)));
  svg.selectAll(null).data(kp3h.filter(r => r.t >= now - 72 * HOUR)).enter().append('rect').attr('x', r => x(r.t) + 1).attr('width', r => Math.max(1, x(r.t + 3 * HOUR) - x(r.t) - 2)).attr('y', r => y(r.kp)).attr('height', r => height - m.bottom - y(r.kp)).attr('fill', css('--s1')).attr('opacity', 0.15);
  line(obs, css('--s2'), 2); line(kp1m, css('--s4'), 1.2); line(model, css('--s1'), 2, '4 3');
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - m.bottom})`).call(d3.axisBottom(x).ticks(d3.utcHour.every(12)).tickFormat(d3.utcFormat('%a %H:%M'))).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5)).selectAll('text').attr('fill', css('--ink-2'));
  const lg = clear(document.getElementById('hindcast-legend'));
  for (const [label, color, kind] of [['modeled Kp from solar wind', 'var(--s1)', 'dash'], ['observed Hp30 (GFZ)', 'var(--s2)', ''], ['NOAA estimated Kp', 'var(--s4)', ''], ['NOAA 3-h Kp', 'var(--s1)', 'area']]) lg.append(el('span', { class: kind, style: `--c:${color}`, text: label }));
}

// ---- scoreboard
if (board && board.methods) {
  const t = clear(document.getElementById('scoreboard-table'));
  t.append(el('thead', {}, el('tr', {}, ['Method', 'Predictions', 'Mean abs. error (h)', 'Median (h)', 'Bias (h)', 'Within ±7 h', 'Kp range hit'].map((h, i) => el('th', { class: i ? 'num' : '', text: h })))));
  const tb = el('tbody');
  for (const mth of board.methods.slice(0, 10)) tb.append(el('tr', {}, [el('td', { text: mth.name }), el('td', { class: 'num', text: mth.n }), el('td', { class: 'num', text: fmt.num(mth.mae, 1) }), el('td', { class: 'num', text: fmt.num(mth.median, 1) }), el('td', { class: 'num', text: fmt.signed(mth.bias, 1) }), el('td', { class: 'num', text: fmt.pct(mth.within7h) }), el('td', { class: 'num', text: mth.kpN ? fmt.pct(mth.kpHit) : '–' })]));
  t.append(tb);
  t.after(el('p', { class: 'note', text: `${board.nCme} CMEs with observed arrivals since ${board.since.slice(0, 10)}. The dashboard's arrival windows come from the NASA M2M WSA-Enlil runs: about half of their predictions land within ±7 h, and their Kp ranges have historically been high, so treat the range as an upper bound.` }));
}


// ---- forecast log verification
const cfg = window.AURORA_CONFIG || {};
const proxy = new ProxyClient(cfg.apiBase === '' ? location.origin : (cfg.apiBase && !cfg.apiBase.includes('PLACEHOLDER') ? cfg.apiBase : null));
await verifyLog();

async function verifyLog() {
  const sub = document.getElementById('ver-sub');
  if (!proxy.available) { sub.textContent = 'The forecast log lives in the Worker; this mirror has no proxy configured.'; return; }
  const days = 30;
  const [log, hp, st] = await Promise.all([
    fetch(proxy.url(`/api/trail?days=${days}`)).then(r => (r.ok ? r.json() : null)).catch(() => null), proxy.gfzIndex('Hp30', now - days * 86400e3, now + HOUR),
    fetch(proxy.url('/api/state')).then(r => (r.ok ? r.json() : null)).catch(() => null), // where each logged place is (lat, lon, magnetic latitude)
  ]);
  if (!log || !log.days || !Object.keys(log.days).length) { sub.textContent = log ? 'No forecast log yet: the Worker starts logging with its next 5-minute run.' : 'The forecast log could not be loaded; reload to try again.'; return; }
  const col = Object.fromEntries(log.columns.map((c, i) => [c, i]));
  const rows = Object.values(log.days).flat().map(r => ({ t: Date.parse(r[col.time]), place: r[col.place], lead: +r[col.lead], p: { camera: r[col.pCamera], eyeDark: r[col.pEyeDark], eyeCity: r[col.pEyeCity], overhead: r[col.pOverhead] }, centre: r[col.centre], sigma: r[col.sigma], mlt: r[col.mlt], aw: r[col.auroraWatch], torK: r[col.tormestorpK], anchor: r[col.anchorHp30] })).filter(r => Number.isFinite(r.t));
  const where = Object.fromEntries((st?.observers || []).map(o => [o.name, o]));
  const places = [...new Set(rows.map(r => r.place))];
  let sightings = [];
  let token = null; try { token = localStorage.getItem('aurora.sightingToken'); } catch {}
  if (token) { const r = await fetch(proxy.url('/api/sightings?months=3'), { headers: { Authorization: `Bearer ${token}` } }).catch(() => null); if (r && r.ok) sightings = (await r.json()).rows || []; }
  const sel = document.getElementById('ver-place');
  sel.replaceChildren(...places.map(p => el('option', { value: p, text: p })));
  sel.value = places.includes('Copenhagen') ? 'Copenhagen' : places[0];
  sel.onchange = () => scoreLog(sel.value, rows, hp, where, sightings, token, Object.keys(log.days).length);
  scoreLog(sel.value, rows, hp, where, sightings, token, Object.keys(log.days).length);
}

function scoreLog(place, rows, hp, where, sightings, token, nDays) {
  const sub = document.getElementById('ver-sub'), table = clear(document.getElementById('ver-table')), notes = clear(document.getElementById('ver-notes'));
  const mine = rows.filter(r => r.place === place), pos = where[place];
  // truth 1: observed Hp30 of the interval containing the target time against the tier's Kp threshold at the target MLT.
  // It is a geometric event, so it is scored against the geometric part of the forecast: P(index at or above the
  // threshold) from the logged centre and spread, without the substorm factor the logged tiers carry.
  const hpByStart = new Map(hp.data.map(h => [h.t, h.value]));
  const hpAt = (t) => hpByStart.get(Math.floor(t / (30 * MIN)) * 30 * MIN);
  // Hp30 comes in thirds: it reaches the rounded threshold when the continuous index is within a sixth below it
  const pIndex = (r, thr) => (Number.isFinite(r.centre) && r.sigma > 0 ? 1 - normalCdf((thr - 1 / 6 - r.centre) / r.sigma) : NaN);
  // truth 2: AuroraWatch UK level logged by the run closest to the target time (within 6 minutes)
  const awByTime = mine.filter(r => r.lead === 10 && r.aw).map(r => [r.t, r.aw]).sort((a, b) => a[0] - b[0]);
  const awT = awByTime.map(a => a[0]), closest = d3.bisector(v => v).center;
  const awAt = (t) => { if (!awT.length) return null; const i = closest(awT, t); return Math.abs(awT[i] - t) <= 6 * MIN ? awByTime[i][1] : null; };
  // truth 3: your reports within 45 minutes and 150 km of the place; a camera-only sighting is a miss for the eye tiers
  const km = (la1, lo1, la2, lo2) => { const r = Math.PI / 180, a = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(a)); };
  const here = pos ? sightings.filter(s => km(pos.lat, pos.lon, +s.lat, +s.lon) <= 150) : [];
  const seenAt = (t, tier) => {
    const near = here.filter(s => Math.abs(Date.parse(s.t) - t) <= 45 * MIN); if (!near.length) return null;
    return near.some(s => s.seen === 'eye' || (tier === 'camera' && s.seen === 'camera')) ? 1 : 0;
  };
  const tiers = ['camera', 'eyeDark', 'eyeCity'];
  const awLevel = { camera: 1, eyeDark: 2, eyeCity: 3 };
  const results = [];
  for (const lead of [10, 30, 60]) for (const tier of tiers) {
    const pairsHp = [], pairsAw = [], pairsSee = [];
    for (const r of mine.filter(x => x.lead === lead)) {
      const T = r.t + lead * MIN, p = r.p[tier]; if (!Number.isFinite(p)) continue;
      const h = hpAt(T);
      if (Number.isFinite(h) && pos) {
        const thr = kpForBoundary(pos.mlat + TIERS[tier], Number.isFinite(r.mlt) ? r.mlt : 23);
        if (Number.isFinite(thr)) { const thrR = Math.ceil(thr * 3 - 1e-9) / 3, pi = pIndex(r, thrR); if (Number.isFinite(pi)) pairsHp.push([pi, h >= thrR ? 1 : 0]); }
      }
      const a = awAt(T); if (a && a in AW_TIER) pairsAw.push([p, AW_TIER[a] >= awLevel[tier] ? 1 : 0]);
      const seen = seenAt(T, tier); if (seen !== null) pairsSee.push([p, seen]);
    }
    results.push({ lead, tier, hp: scoreSummary(pairsHp), aw: scoreSummary(pairsAw), see: scoreSummary(pairsSee) });
  }
  sub.textContent = `${place}${pos ? ` (${fmt.num(pos.mlat, 1)}° magnetic)` : ''}: ${mine.length} logged forecasts over ${nDays} days (${fmt.dateUtc(Math.min(...mine.map(r => r.t)))} to ${fmt.dateUtc(Math.max(...mine.map(r => r.t)))}). Truths: observed Hp30 above the tier's threshold at the target time${pos ? '' : ' (not scored: the place is no longer in the Worker\'s list)'}; AuroraWatch UK's level (yellow = camera, amber = eye at a dark site, red = eye anywhere); your sighting reports within 45 minutes and 150 km.`;
  const head = ['Lead', 'Tier', 'n (Hp30)', 'base', 'Brier', 'BSS', 'AUC', 'n (AuroraWatch)', 'base', 'Brier', 'BSS', 'AUC', 'n (sightings)', 'base', 'Brier', 'AUC'];
  table.append(el('thead', {}, el('tr', {}, head.map((h, i) => el('th', { class: i >= 2 ? 'num' : '', text: h })))));
  const tb = el('tbody');
  const label = { camera: 'camera', eyeDark: 'eye, dark site', eyeCity: 'eye, city' };
  const cell = (v, d = 2) => el('td', { class: 'num', text: Number.isFinite(v) ? v.toFixed(d) : '–' });
  for (const r of results) tb.append(el('tr', {}, [el('td', { text: `+${r.lead} min` }), el('td', { text: label[r.tier] }), cell(r.hp.n, 0), cell(r.hp.base), cell(r.hp.brier, 3), cell(r.hp.bss), cell(r.hp.auc), cell(r.aw.n, 0), cell(r.aw.base), cell(r.aw.brier, 3), cell(r.aw.bss), cell(r.aw.auc), cell(r.see.n, 0), cell(r.see.base), cell(r.see.brier, 3), cell(r.see.auc)]));
  table.append(tb);
  const pick = results.find(r => r.lead === 30 && r.tier === 'eyeDark');
  if (pick && (pick.hp.n >= 20 || pick.aw.n >= 20)) reliabilityLog(document.getElementById('ver-reliability'), pick); else { d3.select('#ver-reliability').selectAll('svg').remove(); clear(document.getElementById('ver-legend')); }
  notes.append(el('p', { text: 'Brier skill score (BSS) is relative to the base rate of the period: above 0 the forecast beats climatology, 1 is perfect. AUC is the chance that a random event night is ranked above a random non-event night (0.5 = no skill). The Hp30 columns check the index chain alone: the chance that Hp30 reaches the tier\'s threshold, taken from the logged centre and spread without the substorm factor, against whether it did. The AuroraWatch and sighting columns score the tier probabilities as issued: AuroraWatch UK is a real aurora indicator near Copenhagen\'s magnetic latitude but 1 h of local time west; sightings are the only true visibility test and need many nights before the numbers mean anything.' }));
  const stTable = clear(document.getElementById('sightings-table'));
  if (sightings.length) {
    stTable.append(el('thead', {}, el('tr', {}, ['Time UTC', 'Seen', 'Place', 'Note'].map(h => el('th', { text: h })))));
    const sb = el('tbody'); for (const sgt of sightings.slice(-40).reverse()) sb.append(el('tr', {}, [el('td', { text: fmt.dateUtc(Date.parse(sgt.t)) }), el('td', { text: sgt.seen }), el('td', { text: `${sgt.lat}, ${sgt.lon}` }), el('td', { text: sgt.note || '' })])); stTable.append(sb);
  } else stTable.append(el('caption', { text: token ? 'No sightings logged yet.' : 'Log sightings from the dashboard (the token is asked for once) to see them here.' }));
}

function reliabilityLog(container, r) {
  const width = Math.max(container.clientWidth || 600, 400), height = 220, m = { top: 12, right: 14, bottom: 30, left: 40 };
  d3.select(container).selectAll('svg').remove();
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').call(named, container);
  const x = d3.scaleLinear().domain([0, 1]).range([m.left, width - m.right]), y = d3.scaleLinear().domain([0, 1]).range([height - m.bottom, m.top]);
  svg.append('line').attr('x1', x(0)).attr('x2', x(1)).attr('y1', y(0)).attr('y2', y(1)).attr('stroke', css('--axis')).attr('stroke-dasharray', '3 3');
  const series = [['hp', css('--s1'), 'observed Hp30 above the tier threshold'], ['aw', css('--s2'), 'AuroraWatch UK level'], ['see', css('--s3'), 'your sightings']];
  const lg = clear(document.getElementById('ver-legend'));
  for (const [key, color, label] of series) {
    const pts = r[key].reliability.filter(b => b.n >= 5);
    if (!pts.length) continue;
    svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('d', d3.line().x(b => x(b.forecast)).y(b => y(b.observed)));
    svg.selectAll(null).data(pts).enter().append('circle').attr('cx', b => x(b.forecast)).attr('cy', b => y(b.observed)).attr('r', b => Math.min(8, 2 + Math.sqrt(b.n))).attr('fill', color).attr('opacity', 0.8);
    lg.append(el('span', { style: `--c:${color}`, text: `${label} (n ${r[key].n})` }));
  }
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - m.bottom})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.0%'))).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%'))).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('text').attr('x', width / 2).attr('y', height - 4).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', css('--muted')).text('forecast probability (circle size = number of forecasts)');
}
