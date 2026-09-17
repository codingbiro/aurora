// North polar map of NOAA's OVATION aurora grid with the observer marked.
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

let landCache = null;
async function land() {
  if (landCache) return landCache;
  try {
    const topo = await (await fetch('vendor/land-110m.json')).json();
    landCache = topojson.feature(topo, topo.objects.land);
  } catch { landCache = null; }
  return landCache;
}

/**
 * grid: NOAA ovation_aurora_latest.json ({coordinates: [[lon, lat, value]], "Forecast Time"}),
 * observer: {lat, lon}; sun: optional {lat, lon} of the subsolar point.
 */
export async function polarMap(container, grid, observer, sun) {
  const size = Math.max(container.clientWidth || 360, 280);
  d3.select(container).selectAll('svg').remove();
  const svg = d3.select(container).append('svg').attr('viewBox', `0 0 ${size} ${size}`).attr('width', '100%').attr('role', 'img');
  const proj = d3.geoAzimuthalEquidistant().rotate([0, -90]).clipAngle(50).translate([size / 2, size / 2]).scale(size / 2 / (50 * Math.PI / 180) * 0.98);
  const path = d3.geoPath(proj);
  svg.append('circle').attr('cx', size / 2).attr('cy', size / 2).attr('r', size / 2 * 0.98).attr('fill', css('--surface-2'));
  const geo = await land();
  if (geo) svg.append('path').datum(geo).attr('d', path).attr('fill', css('--surface-3')).attr('stroke', 'none');
  // aurora cells: the grid is 1 deg with a noise floor of a few percent; draw cells at or above 8
  const cells = (grid?.coordinates || []).filter(c => c[1] >= 42 && c[2] >= 8);
  const color = d3.scaleLinear().domain([8, 20, 40, 60, 90]).range([css('--aurora-1'), css('--aurora-2'), css('--aurora-3'), css('--aurora-4'), css('--aurora-5')]).clamp(true);
  const cellPath = d3.geoPath(proj);
  svg.append('g').selectAll('path').data(cells).enter().append('path')
    // d3-geo wants exterior rings wound clockwise (north, east, south, west); the reverse selects the whole sphere minus the cell
    .attr('d', c => cellPath({ type: 'Polygon', coordinates: [[[c[0], c[1]], [c[0], c[1] + 1], [c[0] + 1, c[1] + 1], [c[0] + 1, c[1]], [c[0], c[1]]]] }))
    .attr('fill', c => color(c[2])).attr('opacity', 0.9).attr('stroke', 'none');
  if (geo) svg.append('path').datum(geo).attr('d', path).attr('fill', 'none').attr('stroke', css('--ink-2')).attr('stroke-width', 0.6).attr('opacity', 0.8);
  svg.append('path').datum(d3.geoGraticule().step([30, 10]).extent([[-180, 40], [180, 90.01]])()).attr('d', path).attr('fill', 'none').attr('stroke', css('--axis')).attr('stroke-width', 0.5).attr('opacity', 0.7);
  for (const lat of [50, 60, 70]) { const p = proj([0, lat]); svg.append('text').attr('x', p[0] + 3).attr('y', p[1] - 2).attr('font-size', 9).attr('fill', css('--muted')).text(`${lat}°`); }
  if (sun) { const p = proj([sun.lon, Math.max(sun.lat, 40.5)]); if (p) svg.append('text').attr('x', p[0]).attr('y', p[1]).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', css('--s4')).text('☀'); }
  const o = proj([observer.lon, observer.lat]);
  if (o) {
    svg.append('circle').attr('cx', o[0]).attr('cy', o[1]).attr('r', 5).attr('fill', css('--ink')).attr('stroke', css('--surface')).attr('stroke-width', 2);
    svg.append('text').attr('x', o[0] + 8).attr('y', o[1] + 4).attr('font-size', 10).attr('fill', css('--ink')).text('you');
  }
  // legend
  const lg = svg.append('g').attr('transform', `translate(8,${size - 14})`);
  [[8, 'faint'], [40, 'likely'], [90, 'bright']].forEach(([v, label], i) => {
    lg.append('rect').attr('x', i * 62).attr('y', -8).attr('width', 10).attr('height', 10).attr('fill', color(v));
    lg.append('text').attr('x', i * 62 + 14).attr('y', 1).attr('font-size', 9).attr('fill', css('--ink-2')).text(label);
  });
}

/** Subsolar point (approximate) for a Date. */
export function subsolarPoint(date) {
  const d = (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400e3;
  const decl = -23.44 * Math.cos((2 * Math.PI / 365) * (d + 10));
  const utcH = date.getUTCHours() + date.getUTCMinutes() / 60;
  return { lat: decl, lon: ((180 - utcH * 15) + 540) % 360 - 180 };
}
