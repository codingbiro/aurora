// Magnetic coordinates: AACGM-v2 lookup grid for Europe plus a centered-dipole fallback,
// and magnetic local time from a precomputed reference-longitude table.

const DEG = Math.PI / 180;
/** IGRF-14 (epoch 2025) centered-dipole north geomagnetic pole. */
export const DIPOLE_POLE = { lat: 80.79, lon: -72.76 };

export function dipoleCoords(lat, lon) {
  const la = lat * DEG, lo = lon * DEG, lp = DIPOLE_POLE.lat * DEG, lop = DIPOLE_POLE.lon * DEG;
  const sinMlat = Math.sin(la) * Math.sin(lp) + Math.cos(la) * Math.cos(lp) * Math.cos(lo - lop);
  const mlat = Math.asin(Math.min(1, Math.max(-1, sinMlat))) / DEG;
  const y = Math.cos(la) * Math.sin(lo - lop);
  const x = Math.sin(la) * Math.cos(lp) - Math.cos(la) * Math.sin(lp) * Math.cos(lo - lop);
  const mlon = ((Math.atan2(y, x) / DEG) + 360) % 360;
  return { mlat, mlon };
}

export class MagneticCoordinates {
  /** grid: contents of aacgm_europe_grid.json; mltRef: contents of mlt_reference.json */
  constructor(grid, mltRef) {
    this.grid = grid;
    this.mltRef = mltRef;
  }

  inGrid(lat, lon) {
    const g = this.grid;
    return lat >= g.lat0 && lat <= g.lat1 && lon >= g.lon0 && lon <= g.lon1;
  }

  /** {mlat, mlon, method: 'aacgm'|'dipole'} */
  convert(lat, lon) {
    if (!this.grid || !this.inGrid(lat, lon)) return { ...dipoleCoords(lat, lon), method: 'dipole' };
    const g = this.grid;
    const fi = (lat - g.lat0) / g.dlat, fj = (lon - g.lon0) / g.dlon;
    const i0 = Math.min(Math.floor(fi), g.nlat - 2), j0 = Math.min(Math.floor(fj), g.nlon - 2);
    const di = fi - i0, dj = fj - j0;
    const at = (arr, i, j) => arr[i * g.nlon + j];
    const bil = (arr, wrap) => {
      let a = at(arr, i0, j0), b = at(arr, i0, j0 + 1), c = at(arr, i0 + 1, j0), d = at(arr, i0 + 1, j0 + 1);
      if (wrap) { // unwrap longitudes around a
        const fix = (x) => { let y = x; while (y - a > 180) y -= 360; while (y - a < -180) y += 360; return y; };
        b = fix(b); c = fix(c); d = fix(d);
      }
      const v = a * (1 - di) * (1 - dj) + b * (1 - di) * dj + c * di * (1 - dj) + d * di * dj;
      return wrap ? ((v % 360) + 360) % 360 : v;
    };
    return { mlat: bil(g.mlat, false), mlon: bil(g.mlon, true), method: 'aacgm' };
  }

  /** Reference magnetic longitude of noon for a UTC Date (AACGM-v2 convention). */
  referenceLongitude(date) {
    const r = this.mltRef;
    const start = Date.UTC(date.getUTCFullYear(), 0, 1);
    const doy = Math.floor((date.getTime() - start) / 86400e3); // 0-based
    const row = r.ref[Math.min(doy, r.ref.length - 1)];
    const next = r.ref[Math.min(doy + 1, r.ref.length - 1)];
    const hf = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const h0 = Math.floor(hf), f = hf - h0;
    const a = row[h0], b = h0 + 1 < 24 ? row[h0 + 1] : next[0];
    let bb = b; while (bb - a > 180) bb -= 360; while (bb - a < -180) bb += 360;
    return (((a + (bb - a) * f) % 360) + 360) % 360;
  }

  /** Magnetic local time in hours [0, 24) for a magnetic longitude and UTC Date. */
  mlt(mlon, date) {
    const ref = this.referenceLongitude(date);
    return (((12 + (mlon - ref) / 15) % 24) + 24) % 24;
  }
}

/** Convert an MLT in hours to the OVATION 0.25 h bin index (0..95). */
export function mltBin(mlt) {
  return Math.min(95, Math.max(0, Math.floor((((mlt % 24) + 24) % 24) / 0.25)));
}
