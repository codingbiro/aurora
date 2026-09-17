// SVG charts built with D3 (global `d3`). Every chart: one y-scale per row, thin marks,
// recessive grid, crosshair tooltip, colors from CSS tokens.
import { fmt } from './format.mjs';

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const MIN = 60e3, HOUR = 3600e3;

let tooltipEl = null;
function tooltip(container) {
  if (!tooltipEl) { tooltipEl = document.createElement('div'); tooltipEl.className = 'tooltip'; tooltipEl.hidden = true; document.body.appendChild(tooltipEl); }
  return {
    show(x, y, html) {
      tooltipEl.innerHTML = html; tooltipEl.hidden = false;
      const r = container.getBoundingClientRect();
      const left = Math.min(r.left + x + 14, window.innerWidth - tooltipEl.offsetWidth - 8);
      tooltipEl.style.left = `${left + window.scrollX}px`; tooltipEl.style.top = `${r.top + y + window.scrollY + 12}px`;
    },
    hide() { tooltipEl.hidden = true; },
  };
}

function svgIn(container, width, height) {
  d3.select(container).selectAll('svg').remove();
  return d3.select(container).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('role', 'img');
}

function timeAxis(g, x, height) {
  g.attr('class', 'axis').call(d3.axisBottom(x).ticks(d3.timeHour.every(1)).tickFormat(d => d3.utcFormat('%H:%M')(d)).tickSizeOuter(0));
  g.selectAll('text').attr('fill', css('--ink-2'));
}

/**
 * Short-term timeline: rows IMF, speed, coupling, Kp. Data:
 * {propagated (ascending, arrival time), now, tLast, future {times, central, p10, p90}, kpHind [{t,kp}],
 *  kpFuture [{t, median, p10, p90}], kpObs [{t,kp}], hp30 [{t,value}], geospace [{t,kp}], xMin, xMax}
 */
export function timelineChart(container, d) {
  const width = Math.max(container.clientWidth || 720, 480);
  const rows = [
    { key: 'imf', title: 'IMF Bz and Bt, nT', h: 90 },
    { key: 'speed', title: 'Solar wind speed, km/s', h: 70 },
    { key: 'coupling', title: 'Newell coupling dΦ/dt', h: 90 },
    { key: 'kp', title: 'Kp: modeled, NOAA estimated, GFZ Hp30, Geospace', h: 110 },
  ];
  const m = { top: 8, right: 14, bottom: 26, left: 44 }, gap = 22;
  const height = m.top + rows.reduce((s, r) => s + r.h + gap, 0) + m.bottom;
  const svg = svgIn(container, width, height);
  const x = d3.scaleUtc().domain([d.xMin, d.xMax]).range([m.left, width - m.right]);
  const P = d.propagated.filter(r => r.t >= d.xMin && r.t <= d.xMax);
  let y0 = m.top;
  const rowScales = {};
  for (const r of rows) {
    const g = svg.append('g').attr('transform', `translate(0,${y0})`);
    const yTop = 14, yBot = r.h;
    const inner = [yBot, yTop];
    let series = [], y;
    if (r.key === 'imf') {
      const ext = d3.extent([...P.map(p => p.bz), ...P.map(p => p.bt), 5, -5]);
      y = d3.scaleLinear().domain([Math.min(ext[0], -2), Math.max(ext[1], 2)]).nice().range(inner);
      shading(g, x, d, yTop, yBot);
      g.append('line').attr('x1', x.range()[0]).attr('x2', x.range()[1]).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', css('--axis')).attr('stroke-dasharray', '2 3');
      line(g, P, x, y, p => p.bt, css('--muted'), 1.5);
      line(g, P, x, y, p => p.bz, css('--s1'), 2);
      series = [{ label: 'Bz', get: p => p.bz, unit: 'nT' }, { label: 'Bt', get: p => p.bt, unit: 'nT' }];
    } else if (r.key === 'speed') {
      const ext = d3.extent(P, p => p.speed);
      y = d3.scaleLinear().domain([Math.max(200, (ext[0] || 300) - 40), (ext[1] || 500) + 40]).nice().range(inner);
      shading(g, x, d, yTop, yBot);
      line(g, P, x, y, p => p.speed, css('--s2'), 2);
      series = [{ label: 'speed', get: p => p.speed, unit: 'km/s' }];
    } else if (r.key === 'coupling') {
      const maxKnown = d3.max(P, p => p.coupling) || 1000;
      const maxFut = d.future && d.future.p90 ? d3.max(d.future.p90) : 0;
      y = d3.scaleLinear().domain([0, Math.max(maxKnown * 1.1, Math.min(maxFut || 0, maxKnown * 3), 2000)]).nice().range(inner);
      shading(g, x, d, yTop, yBot);
      if (d.future && d.future.times.length) {
        const F = d.future.times.map((t, i) => ({ t, c: d.future.central[i], lo: d.future.p10[i], hi: d.future.p90[i] }));
        g.append('path').datum(F).attr('fill', css('--s1')).attr('opacity', 0.18).attr('d', d3.area().x(p => x(p.t)).y0(p => y(p.lo)).y1(p => y(p.hi)).defined(p => Number.isFinite(p.lo) && Number.isFinite(p.hi)));
        g.append('path').datum(F).attr('fill', 'none').attr('stroke', css('--s1')).attr('stroke-width', 2).attr('stroke-dasharray', '4 3').attr('d', d3.line().x(p => x(p.t)).y(p => y(p.c)).defined(p => Number.isFinite(p.c)));
      }
      line(g, P, x, y, p => p.coupling, css('--s1'), 2);
      series = [{ label: 'dΦ/dt', get: p => p.coupling, unit: '' }];
    } else if (r.key === 'kp') {
      y = d3.scaleLinear().domain([0, Math.max(5, d3.max([...(d.kpObs || []).map(k => k.kp), ...(d.kpFuture || []).map(k => k.p90), ...(d.hp30 || []).map(k => k.value)]) + 0.5 || 5)]).nice().range(inner);
      shading(g, x, d, yTop, yBot);
      for (let k = 1; k <= 9; k++) if (k <= y.domain()[1]) g.append('line').attr('class', 'grid').attr('x1', x.range()[0]).attr('x2', x.range()[1]).attr('y1', y(k)).attr('y2', y(k)).attr('stroke', css('--grid'));
      if (d.thresholds) {
        for (const [name, v] of Object.entries(d.thresholds)) if (Number.isFinite(v) && v <= y.domain()[1]) {
          g.append('line').attr('x1', x.range()[0]).attr('x2', x.range()[1]).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', css('--s3')).attr('stroke-dasharray', '2 4');
          g.append('text').attr('x', x.range()[1] - 2).attr('y', y(v) - 3).attr('text-anchor', 'end').attr('font-size', 10).attr('fill', css('--ink-2')).text(`${name} Kp ${v.toFixed(1)}`);
        }
      }
      if (d.kpFuture && d.kpFuture.length) {
        g.append('path').datum(d.kpFuture).attr('fill', css('--s1')).attr('opacity', 0.18).attr('d', d3.area().x(p => x(p.t)).y0(p => y(p.p10)).y1(p => y(p.p90)));
        g.append('path').datum(d.kpFuture).attr('fill', 'none').attr('stroke', css('--s1')).attr('stroke-width', 2).attr('stroke-dasharray', '4 3').attr('d', d3.line().x(p => x(p.t)).y(p => y(p.median)));
      }
      if (d.kpHind && d.kpHind.length) line(g, d.kpHind, x, y, p => p.kp, css('--s1'), 2);
      if (d.hp30 && d.hp30.length) step(g, d.hp30.map(h => ({ t: h.t, v: h.value })), x, y, css('--s2'), 30 * MIN);
      if (d.kpObs && d.kpObs.length) line(g, d.kpObs, x, y, p => p.kp, css('--s4'), 1.5);
      if (d.geospace && d.geospace.length) line(g, d.geospace, x, y, p => p.kp, css('--s7'), 1.5);
      series = [];
    }
    g.append('text').attr('class', 'row-title').attr('x', m.left).attr('y', 10).attr('font-size', 11).text(r.title);
    g.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickSizeOuter(0)).selectAll('text').attr('fill', css('--ink-2'));
    rowScales[r.key] = { y, y0, series };
    y0 += r.h + gap;
  }
  timeAxis(svg.append('g').attr('transform', `translate(0,${height - m.bottom + 4})`), x, height);
  // now / L1 markers
  for (const [t, label] of [[d.now, 'now'], [d.tLast, 'measured at L1 until']]) {
    if (!Number.isFinite(t)) continue;
    svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.top).attr('y2', height - m.bottom + 4).attr('stroke', css('--ink')).attr('stroke-width', label === 'now' ? 1.5 : 1).attr('stroke-dasharray', label === 'now' ? null : '3 3').attr('opacity', 0.6);
    svg.append('text').attr('x', x(t) + 3).attr('y', height - m.bottom - 2).attr('font-size', 10).attr('fill', css('--ink-2')).text(label);
  }
  // crosshair
  const tip = tooltip(container);
  const overlay = svg.append('rect').attr('x', m.left).attr('y', m.top).attr('width', width - m.left - m.right).attr('height', height - m.top - m.bottom).attr('fill', 'transparent');
  const cross = svg.append('line').attr('y1', m.top).attr('y2', height - m.bottom).attr('stroke', css('--ink')).attr('opacity', 0).attr('pointer-events', 'none');
  const bis = d3.bisector(p => p.t).center;
  overlay.on('pointermove', (ev) => {
    const [px, py] = d3.pointer(ev, svg.node());
    const t = x.invert(px).getTime();
    cross.attr('x1', px).attr('x2', px).attr('opacity', 0.5);
    const i = bis(P, t); const p = P[i];
    const rows = [];
    if (p && Math.abs(p.t - t) < 10 * MIN) rows.push(['Bz', fmt.num(p.bz, 1), 'nT'], ['Bt', fmt.num(p.bt, 1), 'nT'], ['speed', fmt.int(p.speed), 'km/s'], ['density', fmt.num(p.density, 1), '/cm³'], ['coupling', fmt.int(p.coupling), '']);
    const near = (arr, get, label, unit) => { if (!arr || !arr.length) return; const j = bis(arr, t); const q = arr[j]; if (q && Math.abs(q.t - t) < 20 * MIN) rows.push([label, fmt.num(get(q), 2), unit]); };
    near(d.kpHind, q => q.kp, 'Kp modeled', ''); near(d.kpFuture, q => q.median, 'Kp forecast', ''); near(d.kpObs, q => q.kp, 'Kp NOAA est.', ''); near(d.hp30, q => q.value, 'Hp30 GFZ', ''); near(d.geospace, q => q.kp, 'Kp Geospace', '');
    if (!rows.length) { tip.hide(); return; }
    tip.show(px * (container.clientWidth / width), py * (container.clientWidth / width), `<div class="t">${fmt.dateUtc(t)}</div><table>${rows.map(r => `<tr><td>${r[0]}</td><td class="v">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>`);
  }).on('pointerleave', () => { cross.attr('opacity', 0); tip.hide(); });
}

function shading(g, x, d, yTop, yBot) {
  if (Number.isFinite(d.now) && Number.isFinite(d.tLast) && d.tLast > d.now) g.append('rect').attr('x', x(d.now)).attr('width', x(d.tLast) - x(d.now)).attr('y', yTop).attr('height', yBot - yTop).attr('fill', css('--shade-transit'));
  if (Number.isFinite(d.tLast) && d.xMax > d.tLast) g.append('rect').attr('x', x(Math.max(d.tLast, d.now))).attr('width', x(d.xMax) - x(Math.max(d.tLast, d.now))).attr('y', yTop).attr('height', yBot - yTop).attr('fill', css('--shade-future'));
}
function line(g, data, x, y, get, color, w) {
  g.append('path').datum(data).attr('fill', 'none').attr('stroke', color).attr('stroke-width', w).attr('stroke-linejoin', 'round')
    .attr('d', d3.line().x(p => x(p.t)).y(p => y(get(p))).defined(p => Number.isFinite(get(p))));
}
function step(g, data, x, y, color, width) {
  g.selectAll(null).data(data.filter(p => Number.isFinite(p.v))).enter().append('line').attr('x1', p => x(p.t)).attr('x2', p => x(p.t + width)).attr('y1', p => y(p.v)).attr('y2', p => y(p.v)).attr('stroke', color).attr('stroke-width', 2.5);
}

/**
 * Boundary vs observer: horizons [{h, boundary{median,p10,p90,ovation}, margin, pVisible}], observerMlat, allowance.
 */
export function boundaryChart(container, horizons, observerMlat, allowance = 8) {
  const width = Math.max(container.clientWidth || 720, 480), height = 200;
  const m = { top: 12, right: 14, bottom: 28, left: 44 };
  const svg = svgIn(container, width, height);
  const x = d3.scaleLinear().domain([0, 120]).range([m.left, width - m.right]);
  const lo = Math.min(observerMlat - 4, d3.min(horizons, r => r.boundary.p10) - 1), hi = Math.max(observerMlat + allowance + 4, d3.max(horizons, r => r.boundary.p90) + 1);
  const y = d3.scaleLinear().domain([Math.floor(lo), Math.ceil(hi)]).range([height - m.bottom, m.top]);
  svg.append('rect').attr('x', m.left).attr('width', width - m.left - m.right).attr('y', y(observerMlat + allowance)).attr('height', y(observerMlat) - y(observerMlat + allowance)).attr('fill', css('--aurora-1')).attr('opacity', 0.45);
  svg.append('rect').attr('x', m.left).attr('width', width - m.left - m.right).attr('y', y(observerMlat)).attr('height', Math.max(0, height - m.bottom - y(observerMlat))).attr('fill', css('--aurora-3')).attr('opacity', 0.3);
  svg.append('g').attr('class', 'grid').call(d3.axisLeft(y).ticks(5).tickSize(-(width - m.left - m.right)).tickFormat('')).attr('transform', `translate(${m.left},0)`).selectAll('line').attr('stroke', css('--grid'));
  svg.append('path').datum(horizons).attr('fill', css('--s3')).attr('opacity', 0.2).attr('d', d3.area().x(r => x(r.h)).y0(r => y(r.boundary.p10)).y1(r => y(r.boundary.p90)));
  svg.append('path').datum(horizons).attr('fill', 'none').attr('stroke', css('--s3')).attr('stroke-width', 2).attr('d', d3.line().x(r => x(r.h)).y(r => y(r.boundary.median)));
  const ov = horizons.filter(r => Number.isFinite(r.boundary.ovation));
  svg.selectAll(null).data(ov).enter().append('circle').attr('cx', r => x(r.h)).attr('cy', r => y(r.boundary.ovation)).attr('r', 3.5).attr('fill', css('--s2')).attr('stroke', css('--surface')).attr('stroke-width', 1.5);
  svg.append('line').attr('x1', m.left).attr('x2', width - m.right).attr('y1', y(observerMlat)).attr('y2', y(observerMlat)).attr('stroke', css('--ink')).attr('stroke-width', 1.5);
  svg.append('text').attr('x', m.left + 4).attr('y', y(observerMlat) - 4).attr('font-size', 10).attr('fill', css('--ink')).text(`you: ${observerMlat.toFixed(1)}° magnetic`);
  svg.append('text').attr('x', m.left + 4).attr('y', y(observerMlat + allowance) - 4).attr('font-size', 10).attr('fill', css('--ink-2')).text(`visible low in the north when the edge is above this line (${allowance}° allowance)`);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - m.bottom})`).call(d3.axisBottom(x).tickValues([0, 30, 60, 90, 120]).tickFormat(v => `+${v} min`).tickSizeOuter(0)).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(v => `${v}°`).tickSizeOuter(0)).selectAll('text').attr('fill', css('--ink-2'));
  const tip = tooltip(container);
  svg.selectAll(null).data(horizons).enter().append('rect').attr('x', r => x(r.h) - 5).attr('width', 10).attr('y', m.top).attr('height', height - m.top - m.bottom).attr('fill', 'transparent')
    .on('pointerenter', (ev, r) => { const [px, py] = d3.pointer(ev, svg.node()); tip.show(px * (container.clientWidth / width), py * (container.clientWidth / width), `<div class="t">+${r.h} min · ${fmt.hm(r.t)} UTC · MLT ${r.mlt.toFixed(1)}</div><table><tr><td>edge (median)</td><td class="v">${fmt.deg(r.boundary.median)}</td></tr><tr><td>edge 10–90%</td><td class="v">${fmt.deg(r.boundary.p10)}–${fmt.deg(r.boundary.p90)}</td></tr>${Number.isFinite(r.boundary.ovation) ? `<tr><td>OVATION edge</td><td class="v">${fmt.deg(r.boundary.ovation)}</td></tr>` : ''}<tr><td>margin</td><td class="v">${fmt.signed(r.margin)}°</td></tr><tr><td>P(visible)</td><td class="v">${fmt.pct(r.pVisible)}</td></tr></table>`); })
    .on('pointerleave', () => tip.hide());
}

/** Substorm small multiples: stations [{station, mlat, minutes:{t, dev}, onsets}], now. */
export function substormChart(container, stations, now, lastOnset) {
  const width = Math.max(container.clientWidth || 360, 300);
  const rowH = 44, m = { top: 6, right: 10, bottom: 24, left: 40 };
  const height = m.top + stations.length * rowH + m.bottom;
  const svg = svgIn(container, width, height);
  const x = d3.scaleUtc().domain([now - 6 * HOUR, now]).range([m.left, width - m.right]);
  const ext = d3.max(stations, s => d3.max(s.minutes.dev, v => Math.abs(v))) || 50;
  stations.forEach((s, i) => {
    const g = svg.append('g').attr('transform', `translate(0,${m.top + i * rowH})`);
    const y = d3.scaleLinear().domain([-Math.max(ext, 50), Math.max(ext, 50) / 2]).range([rowH - 4, 4]);
    g.append('line').attr('x1', m.left).attr('x2', width - m.right).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', css('--grid'));
    const pts = s.minutes.t.map((t, j) => ({ t, v: s.minutes.dev[j] })).filter(p => p.t >= now - 6 * HOUR);
    g.append('path').datum(pts).attr('fill', 'none').attr('stroke', css('--s1')).attr('stroke-width', 1.5).attr('d', d3.line().x(p => x(p.t)).y(p => y(p.v)).defined(p => Number.isFinite(p.v)));
    g.selectAll(null).data(s.onsets.filter(t => t >= now - 6 * HOUR)).enter().append('line').attr('x1', t => x(t)).attr('x2', t => x(t)).attr('y1', 2).attr('y2', rowH - 2).attr('stroke', css('--s2')).attr('stroke-width', 2);
    g.append('text').attr('x', 2).attr('y', 12).attr('font-size', 10).attr('fill', css('--ink')).text(s.station);
    g.append('text').attr('x', 2).attr('y', 24).attr('font-size', 9).attr('fill', css('--muted')).text(`${s.mlat.toFixed(0)}°`);
  });
  if (lastOnset) svg.append('line').attr('x1', x(lastOnset)).attr('x2', x(lastOnset)).attr('y1', m.top).attr('y2', height - m.bottom).attr('stroke', css('--s2')).attr('stroke-dasharray', '3 3');
  timeAxis(svg.append('g').attr('transform', `translate(0,${height - m.bottom + 2})`), x, height);
}

/**
 * Long-term Kp chart: {now, noaa [{t,kp,status}], gfz [{t, median, q25, q75}], thresholds {horizon, overhead}, cmes [{arrival, glancing, kp}], nights [{start,end}]}
 */
export function kpForecastChart(container, d) {
  const width = Math.max(container.clientWidth || 600, 420), height = 240;
  const m = { top: 14, right: 14, bottom: 40, left: 36 };
  const svg = svgIn(container, width, height);
  const xMin = d.now - 12 * HOUR, xMax = Math.max(d.now + 72 * HOUR, d3.max(d.noaa, b => b.t + 3 * HOUR) || 0);
  const x = d3.scaleUtc().domain([xMin, xMax]).range([m.left, width - m.right]);
  const y = d3.scaleLinear().domain([0, Math.max(6, d3.max(d.noaa, b => b.kp) + 1 || 6, ...(d.cmes || []).map(c => (c.kp?.k180 || 0) + 0.5))]).nice().range([height - m.bottom, m.top]);
  for (const n of d.nights || []) svg.append('rect').attr('x', x(n.start)).attr('width', Math.max(0, x(n.end) - x(n.start))).attr('y', m.top).attr('height', height - m.top - m.bottom).attr('fill', css('--shade-night'));
  for (let k = 1; k <= 9; k++) if (k <= y.domain()[1]) svg.append('line').attr('x1', m.left).attr('x2', width - m.right).attr('y1', y(k)).attr('y2', y(k)).attr('stroke', css('--grid'));
  if (d.gfz && d.gfz.length) {
    svg.append('path').datum(d.gfz).attr('fill', css('--s2')).attr('opacity', 0.18).attr('d', d3.area().x(p => x(p.t + 1.5 * HOUR)).y0(p => y(p.q25)).y1(p => y(p.q75)).defined(p => Number.isFinite(p.q25)));
    svg.append('path').datum(d.gfz).attr('fill', 'none').attr('stroke', css('--s2')).attr('stroke-width', 2).attr('d', d3.line().x(p => x(p.t + 1.5 * HOUR)).y(p => y(p.median)).defined(p => Number.isFinite(p.median)));
  }
  const bw = Math.max(2, x(3 * HOUR) - x(0) - 2);
  svg.selectAll(null).data(d.noaa.filter(b => b.t + 3 * HOUR >= xMin)).enter().append('rect').attr('x', b => x(b.t) + 1).attr('width', bw).attr('y', b => y(b.kp)).attr('height', b => height - m.bottom - y(b.kp)).attr('rx', 2)
    .attr('fill', css('--s1')).attr('opacity', b => (b.status === 'predicted' ? 0.85 : 0.4));
  for (const [name, v] of Object.entries(d.thresholds || {})) if (Number.isFinite(v) && v <= y.domain()[1]) {
    svg.append('line').attr('x1', m.left).attr('x2', width - m.right).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', css('--s3')).attr('stroke-width', 1.5).attr('stroke-dasharray', '3 4');
    svg.append('text').attr('x', width - m.right - 2).attr('y', y(v) - 3).attr('text-anchor', 'end').attr('font-size', 10).attr('fill', css('--ink-2')).text(`${name}: Kp ${v.toFixed(1)}`);
  }
  (d.cmes || []).forEach((c, ci) => {
    const x0 = x(c.arrival - 7 * HOUR), x1 = x(c.arrival + 7 * HOUR);
    svg.append('rect').attr('x', x0).attr('width', x1 - x0).attr('y', m.top).attr('height', height - m.top - m.bottom).attr('fill', css('--s2')).attr('opacity', 0.12);
    svg.append('line').attr('x1', x(c.arrival)).attr('x2', x(c.arrival)).attr('y1', m.top).attr('y2', height - m.bottom).attr('stroke', css('--s2')).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');
    if (Number.isFinite(c.kp?.k90) && Number.isFinite(c.kp?.k180)) {
      svg.append('line').attr('x1', x(c.arrival)).attr('x2', x(c.arrival)).attr('y1', y(c.kp.k90)).attr('y2', y(c.kp.k180)).attr('stroke', css('--s2')).attr('stroke-width', 5).attr('stroke-linecap', 'round');
    }
    svg.append('text').attr('x', x(c.arrival) + 4).attr('y', m.top + 10 + ci * 12).attr('font-size', 10).attr('fill', css('--ink')).text(`CME ${fmt.hm(c.arrival)}Z${c.glancing ? ' glancing' : ''}`);
  });
  svg.append('line').attr('x1', x(d.now)).attr('x2', x(d.now)).attr('y1', m.top).attr('y2', height - m.bottom).attr('stroke', css('--ink')).attr('opacity', 0.6);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - m.bottom})`).call(d3.axisBottom(x).ticks(d3.utcHour.every(12)).tickFormat(d3.utcFormat('%a %H:%M')).tickSizeOuter(0)).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(6).tickSizeOuter(0)).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('text').attr('x', m.left).attr('y', height - 4).attr('font-size', 10).attr('fill', css('--muted')).text('UTC; shaded columns are the nights (16–06 UTC)');
  const tip = tooltip(container);
  svg.selectAll(null).data(d.noaa).enter().append('rect').attr('x', b => x(b.t)).attr('width', bw + 2).attr('y', m.top).attr('height', height - m.top - m.bottom).attr('fill', 'transparent')
    .on('pointerenter', (ev, b) => { const [px, py] = d3.pointer(ev, svg.node()); const g = (d.gfz || []).find(r => Math.abs(r.t - b.t) < 90 * MIN);
      tip.show(px * (container.clientWidth / width), py * (container.clientWidth / width), `<div class="t">${fmt.dateUtc(b.t)} (+3 h)</div><table><tr><td>NOAA Kp (${b.status})</td><td class="v">${fmt.num(b.kp, 2)}</td></tr>${g ? `<tr><td>GFZ ensemble median</td><td class="v">${fmt.num(g.median, 2)}</td></tr><tr><td>GFZ 25–75%</td><td class="v">${fmt.num(g.q25, 1)}–${fmt.num(g.q75, 1)}</td></tr><tr><td>P(Kp≥5)</td><td class="v">${fmt.pct(g.pGe5)}</td></tr>` : ''}</table>`); })
    .on('pointerleave', () => tip.hide());
}

/** Enlil speed chart: rows [{t, v, n, cloud}], events, now. */
export function enlilChart(container, rows, events, now) {
  const width = Math.max(container.clientWidth || 600, 420), height = 170;
  const m = { top: 12, right: 14, bottom: 28, left: 40 };
  const svg = svgIn(container, width, height);
  const R = rows.filter(r => r.t >= now - 2 * 86400e3);
  if (!R.length) return;
  const x = d3.scaleUtc().domain(d3.extent(R, r => r.t)).range([m.left, width - m.right]);
  const y = d3.scaleLinear().domain([Math.max(200, d3.min(R, r => r.v) - 30), d3.max(R, r => r.v) + 30]).nice().range([height - m.bottom, m.top]);
  svg.append('rect').attr('x', x(now)).attr('width', Math.max(0, x.range()[1] - x(now))).attr('y', m.top).attr('height', height - m.top - m.bottom).attr('fill', css('--shade-future'));
  const clouds = R.filter(r => r.cloud > 0.1);
  svg.selectAll(null).data(clouds).enter().append('rect').attr('x', r => x(r.t)).attr('width', 2).attr('y', m.top).attr('height', height - m.top - m.bottom).attr('fill', css('--s2')).attr('opacity', 0.35);
  svg.append('g').call(d3.axisLeft(y).ticks(4).tickSize(-(width - m.left - m.right)).tickFormat('')).attr('transform', `translate(${m.left},0)`).selectAll('line').attr('stroke', css('--grid'));
  svg.append('path').datum(R).attr('fill', 'none').attr('stroke', css('--s2')).attr('stroke-width', 2).attr('d', d3.line().x(r => x(r.t)).y(r => y(r.v)));
  events.filter(e => e.kind === 'hss' && e.peakT >= now - 6 * HOUR).forEach((e, i) => svg.append('text').attr('x', Math.max(m.left + 2, x(e.start) + 3)).attr('y', m.top + 10 + i * 12).attr('font-size', 10).attr('fill', css('--ink')).text(`ramp ${fmt.int(e.from)}→${fmt.int(e.to)} km/s by ${fmt.hm(e.peakT)}Z`));
  svg.append('line').attr('x1', x(now)).attr('x2', x(now)).attr('y1', m.top).attr('y2', height - m.bottom).attr('stroke', css('--ink')).attr('opacity', 0.6);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - m.bottom})`).call(d3.axisBottom(x).ticks(d3.utcHour.every(12)).tickFormat(d3.utcFormat('%a %H:%M')).tickSizeOuter(0)).selectAll('text').attr('fill', css('--ink-2'));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.left},0)`).call(d3.axisLeft(y).ticks(4).tickSizeOuter(0)).selectAll('text').attr('fill', css('--ink-2'));
  const tip = tooltip(container);
  const bis = d3.bisector(r => r.t).center;
  svg.append('rect').attr('x', m.left).attr('y', m.top).attr('width', width - m.left - m.right).attr('height', height - m.top - m.bottom).attr('fill', 'transparent')
    .on('pointermove', (ev) => { const [px, py] = d3.pointer(ev, svg.node()); const r = R[bis(R, x.invert(px).getTime())]; if (!r) return;
      tip.show(px * (container.clientWidth / width), py * (container.clientWidth / width), `<div class="t">${fmt.dateUtc(r.t)}</div><table><tr><td>speed</td><td class="v">${fmt.int(r.v)} km/s</td></tr><tr><td>density</td><td class="v">${fmt.num(r.n, 1)} /cm³</td></tr><tr><td>CME tracer</td><td class="v">${fmt.num(r.cloud, 2)}</td></tr></table>`); })
    .on('pointerleave', () => tip.hide());
}
