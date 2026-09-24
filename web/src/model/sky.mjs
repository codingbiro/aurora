// Sky conditions that decide whether a forecast is usable at all: solar elevation (darkness),
// the astronomical-night window, and moon illumination. Low-precision algorithms (NOAA solar
// position, mean synodic moon phase), good to a fraction of a degree and a few percent.

const DEG = Math.PI / 180;

/** Solar elevation in degrees at a UTC time for a site (NOAA General Solar Position approximation). */
export function solarElevation(t, lat, lon) {
  const d = new Date(t);
  const doy = Math.floor((t - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400e3) + 1;
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const g = (2 * Math.PI / 365) * (doy - 1 + (hours - 12) / 24);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  let tst = (hours * 60 + eqt + 4 * lon) % 1440; if (tst < 0) tst += 1440;
  const ha = (tst / 4 < 0 ? tst / 4 + 180 : tst / 4 - 180) * DEG;
  const la = lat * DEG;
  return Math.asin(Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha)) / DEG;
}

/**
 * Darkness classes by solar elevation: 'day' (> -6), 'civil' (-6 to -12), 'nautical' (-12 to -18),
 * 'astronomical' (< -18). Aurora photography works from nautical twilight, the naked eye needs
 * darker than about -12 as well; only astronomical darkness gives the full contrast.
 */
export function darknessClass(elevation) {
  if (!Number.isFinite(elevation)) return 'unknown';
  if (elevation > -6) return 'day';
  if (elevation > -12) return 'civil';
  if (elevation > -18) return 'nautical';
  return 'astronomical';
}

/**
 * The next interval (searched from `from` over 30 hours, 5-minute steps) during which the sun stays
 * below `limit` degrees: {start, end, active} or null when it never does (midsummer at high latitude).
 */
export function darkWindow(from, lat, lon, limit = -12) {
  const step = 5 * 60e3; let start = null;
  for (let t = from - 12 * 3600e3; t <= from + 30 * 3600e3; t += step) {
    const dark = solarElevation(t, lat, lon) < limit;
    if (dark && start === null) start = t;
    if (!dark && start !== null) { if (t > from) return { start, end: t, active: from >= start }; start = null; }
  }
  return start !== null ? { start, end: from + 30 * 3600e3, active: from >= start } : null;
}

/** Moon phase fraction 0..1 (0 = new, 0.5 = full) from the mean synodic month, and illuminated fraction. */
export function moonPhase(t) {
  const synodic = 29.530588853 * 86400e3, ref = Date.UTC(2000, 0, 6, 18, 14); // new moon 2000-01-06 18:14 UTC
  const phase = (((t - ref) / synodic) % 1 + 1) % 1;
  return { phase, illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2 };
}

/** Everything the dashboard shows about the sky: elevation, class, tonight's window, moon. */
export function skyState(t, lat, lon) {
  const elevation = solarElevation(t, lat, lon);
  const moon = moonPhase(t);
  return { elevation, class: darknessClass(elevation), window: darkWindow(t, lat, lon, -12), astronomical: darkWindow(t, lat, lon, -18), moonIllumination: moon.illumination, moonPhase: moon.phase };
}
