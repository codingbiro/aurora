// Model check page: calibration report, reliability, live hindcast, CME scoreboard statistics.
import { load, URLS } from './data/noaa.mjs';
import { iswaHp30 } from './data/hapi.mjs';
import { weightedRecentAverage } from './model/integrate.mjs';
import { hp30FromDriving } from './model/activity.mjs';
import { el, clear, fmt } from './ui/format.mjs';

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const HOUR = 3600e3, MIN = 60e3;

const [coefs, report, board] = await Promise.all(['data/coefficients.json', 'data/calibration_report.json', 'data/scoreboard_stats.json'].map(u => fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null)));

// ---- calibration section
if (coefs && coefs.skill) {
  document.getElementById('cal-sub').textContent = `${coefs.source?.years || 2} years of GFZ Hp30 versus OMNI solar wind (${coefs.hp30?.n?.toLocaleString()} half-hour intervals; generated ${fmt.dateUtc(Date.parse(coefs.generated))}). Test period is the most recent 20%.`;
  const t = clear(document.getElementById('skill-table'));
  t.append(el('thead', {}, el('tr', {}, ['Model', 'RMSE', 'MAE', 'Bias', 'r'].map((h, i) => el('th', { class: i ? 'num' : '', text: h })))));
  const rows = [['This model (calibrated)', coefs.skill.test.ours], ['Newell 2008 Kp coefficients', coefs.skill.test.newell2008], ['Persistence (previous 30 min)', coefs.skill.test.persistence], ['This model on storm intervals (Hp30 ≥ 3)', coefs.skill.test.oursOnStorms]];
  const tb = el('tbody'); for (const [name, s] of rows) if (s) tb.append(el('tr', {}, [el('td', { text: name }), ...['rmse', 'mae', 'bias', 'r'].map(k => el('td', { class: 'num', text: fmt.num(s[k], k === 'r' ? 2 : 2) }))]));
  t.append(tb);
  const notes = clear(document.getElementById('cal-notes'));
  notes.append(el('p', { text: `Hp30 = ${coefs.hp30.intercept.toFixed(3)} + ${coefs.hp30.coupling.toExponential(3)} × (4-hour weighted coupling) + ${coefs.hp30.viscous.toExponential(3)} × (√n·v²). For comparison Newell et al. 2008 published 0.05, 2.244e-4 and 2.844e-6 for Kp. Above Hp30 ≈ 3 the storm-only fit (${coefs.hp30_storm.intercept.toFixed(2)}, ${coefs.hp30_storm.coupling.toExponential(2)}, ${coefs.hp30_storm.viscous.toExponential(2)}) is blended in, because the general fit under-predicts storms by ${Math.abs(coefs.hp30_storm.testBiasGeneral).toFixed(2)} on average.` }));
  notes.append(el('p', { text: 'Persistence wins at a 30-minute lag: the dashboard therefore anchors the first horizons on the last observed Hp30 or estimated Kp and lets the solar-wind model take over as the horizon grows. The model earns its keep from the 30 to 90 minutes of lead the L1 measurement provides.' }));
}
if (report && report.reliability) reliabilityChart(document.getElementById('reliability-chart'), report.reliability);
if (report && report.residuals) residualChart(document.getElementById('residual-chart'), report.residuals);

function reliabilityChart(container, rel) {
  const width = Math.max(container.clientWidth || 600, 400), height = 220, m = { top: 12, right: 14, bottom: 30, left: 40 };
  d3.select(container).selectAll('svg').remove();
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%');
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
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%');
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
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%');
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
