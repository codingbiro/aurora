// End-to-end smoke test in Node: pull live data, run the short-term model for one observer.
// Usage: node scripts/smoke.mjs [lat] [lon]
import { readFile } from 'node:fs/promises';
import { load, URLS, mergePropagated } from '../web/src/data/noaa.mjs';
import { fetchWithMeta } from '../web/src/data/fetch-util.mjs';
import { parseOvationText, equatorwardBoundary, kpForBoundary } from '../web/src/model/oval.mjs';
import { MagneticCoordinates } from '../web/src/model/magcoords.mjs';
import { parseFmi, substormState, substormOutlook } from '../web/src/model/substorm.mjs';
import { shortTermForecast } from '../web/src/model/shortterm.mjs';

const lat = +(process.argv[2] || 55.676), lon = +(process.argv[3] || 12.568);
const t0 = Date.now();
const grid = JSON.parse(await readFile(new URL('../web/data/aacgm_europe_grid.json', import.meta.url), 'utf8'));
const mltRef = JSON.parse(await readFile(new URL('../web/data/mlt_reference.json', import.meta.url), 'utf8'));
const mag = new MagneticCoordinates(grid, mltRef);
const obs = mag.convert(lat, lon);
const now = Date.now();
console.log(`observer ${lat},${lon} -> mlat ${obs.mlat.toFixed(2)} mlon ${obs.mlon.toFixed(2)} (${obs.method}), MLT now ${mag.mlt(obs.mlon, new Date(now)).toFixed(2)} h`);

const [p7, p1, ov, kp1, geo] = await Promise.all([load.propagated(URLS.propagated7d), load.propagated(URLS.propagated1h), load.ovationText(), load.kp1m(), load.geospaceKp()]);
const propagated = mergePropagated(p7.data, p1.data);
console.log(`propagated: ${propagated.length} rows, last arrival ${new Date(propagated.at(-1).t).toISOString()} (lead ${((propagated.at(-1).t - now) / 60e3).toFixed(1)} min), fetch ${p7.meta.latencyMs}+${p1.meta.latencyMs} ms`);
const ovation = ov.text ? parseOvationText(ov.text) : null;
if (ovation) console.log(`ovation: HP ${ovation.hemisphericPower} GW, Kp ${ovation.forecastKp}, forecast ${new Date(ovation.forecastTime).toISOString()}, boundary at MLT now (1 erg):`, equatorwardBoundary(ovation, mag.mlt(obs.mlon, new Date(now)), 1).mlat);
console.log(`kp1m latest ${kp1.data.at(-1)?.kp} @ ${new Date(kp1.data.at(-1)?.t).toISOString()}; geospace kp latest ${geo.data.at(-1)?.kp} @ ${new Date(geo.data.at(-1)?.t).toISOString()}`);

// magnetometers direct from FMI (Node has no CORS restriction)
const stations = [['KEV', 69.76, 27.01], ['MAS', 69.46, 23.70], ['KIL', 69.06, 20.77], ['IVA', 68.56, 27.29], ['MUO', 68.02, 23.53], ['PEL', 66.90, 24.08], ['RAN', 65.90, 26.41], ['OUJ', 64.52, 27.23], ['MEK', 62.77, 30.97], ['HAN', 62.25, 26.60], ['NUR', 60.50, 24.65], ['TAR', 58.26, 26.46]];
const fmi = await Promise.all(stations.map(async ([code, la, lo]) => {
  const m = await fetchWithMeta(`https://space.fmi.fi/image/realtime/UT/${code}/${code}data_24.txt`, { as: 'text' });
  const c = mag.convert(la, lo);
  return { station: code, mlat: c.mlat, mlon: c.mlon, series: m.ok ? parseFmi(m.body) : null, latency: m.latencyMs };
}));
const drive = propagated.filter(r => r.t >= now - 6 * 3600e3).map(r => ({ t: r.t, power: r.power, ekl: r.ekl, bz: r.bz }));
const sub = substormState(fmi, drive, now);
console.log(`substorm (${sub.method}): phase ${sub.phase}, IL now ${sub.ilNow?.toFixed(0)} nT (${sub.ilClass}), last onset ${sub.lastOnset ? new Date(sub.lastOnset.t).toISOString() + ' ' + sub.lastOnset.status + ' ' + sub.lastOnset.stations : 'none'}, ekl ${sub.ekl?.toFixed(2)} mV/m (hour ${sub.eklHour?.toFixed(2)}), southward ${sub.minutesSouthward} min, load ${sub.loadFraction?.toFixed(2)}, pOnset30 ${sub.pOnset30?.toFixed(2)} pOnset60 ${sub.pOnset60?.toFixed(2)}`);
if (sub.chain) console.log(`  chain: ${sub.chain.stations} stations, baseline ${new Date(sub.chain.baseline.t0).toISOString().slice(11, 16)}-${new Date(sub.chain.baseline.t1).toISOString().slice(11, 16)}Z, centre ${sub.chain.centre ? `${sub.chain.centre.mlat.toFixed(1)} (${sub.chain.centre.method}, ${sub.chain.centre.amplitude.toFixed(0)} nT at ${sub.chain.centre.station})` : 'none'}, onsets today ${sub.onsets.map(o => new Date(o.t).toISOString().slice(11, 16) + (o.status === 'provisional' ? '?' : '')).join(' ') || '-'}`);
for (const s of sub.stations) console.log(`  ${s.station} mlat ${s.mlat.toFixed(1)} latest ${s.latest ? new Date(s.latest).toISOString().slice(11, 16) : '-'} dev now ${s.current?.toFixed(0)} nT bay30 ${s.bay?.toFixed(0)} rate ${s.rate?.toFixed(2)}/${s.rateThreshold?.toFixed(2)} nT/s onsets ${s.onsets.length}`);
const arrived = propagated.filter(r => r.t <= now && r.t >= now - 3600e3 && Number.isFinite(r.coupling));
const outlook = substormOutlook({ sub, observer: obs, mag, now, kp: kp1.data.at(-1)?.kp, ovation, couplingRecent: arrived.length ? arrived.reduce((s, r) => s + r.coupling, 0) / arrived.length : NaN });
console.log(`outlook (${outlook.regime}): MLT ${outlook.mltNow.toFixed(1)}, chain offset ${outlook.chainOffset.toFixed(2)} h, onset arc ${outlook.onsetMlat.toFixed(1)} (${outlook.onsetMlatFrom}), reach now ${outlook.reachNow?.toFixed(2)}, current reach ${outlook.currentReach?.toFixed(2)}, prime ${outlook.prime ? new Date(outlook.prime.start).toISOString().slice(11, 16) + '-' + new Date(outlook.prime.end).toISOString().slice(11, 16) + 'Z' + (outlook.prime.active ? ' (now)' : '') : '-'}, oval ${outlook.oval?.position}`);
console.log(`  [${outlook.tone}] ${outlook.headline} — ${outlook.detail}`);
console.log('  h   reach  pOnset  pOnsetLocal'); for (const r of outlook.horizons) console.log(`  ${String(r.h).padStart(3)} ${r.reach.toFixed(2).padStart(6)} ${r.pOnset.toFixed(2).padStart(7)} ${r.pOnsetLocal.toFixed(2).padStart(8)}`);

const fc = shortTermForecast({ now, propagated, ovation, kp1m: kp1.data, geospaceKp: geo.data, observer: obs, mag, substorm: sub, outlook });
if (!fc.ok) { console.log('forecast failed:', fc.reason); process.exit(1); }
console.log(`current: driving ${fc.current.drivingNow?.toFixed(0)} -> Kp ${fc.current.kpNow?.toFixed(2)}; Bz ${fc.current.bz} nT v ${fc.current.speed} km/s; ovation boundary ${fc.current.ovationBoundary?.toFixed(1)} margin ${fc.current.margin?.toFixed(1)} (${fc.current.visibility})`);
console.log(`thresholds for this site at MLT 23: horizon Kp ${kpForBoundary(obs.mlat + 8, 23).toFixed(2)}, overhead Kp ${kpForBoundary(obs.mlat, 23).toFixed(2)}`);
console.log('h   lead  cpl(med p10-p90)      Kp(med p10-p90)   geo   bound(med) margin  pHor  pOver phase pOn  pVis');
for (const r of fc.horizons) {
  console.log(`${String(r.h).padStart(3)} ${r.leadCovered ? 'meas' : 'ext '} ${r.coupling.median.toFixed(0).padStart(6)} (${r.coupling.p10.toFixed(0)}-${r.coupling.p90.toFixed(0)})`.padEnd(38)
    + `${r.kp.median.toFixed(2)} (${r.kp.p10.toFixed(2)}-${r.kp.p90.toFixed(2)})`.padEnd(20) + `${Number.isFinite(r.kp.geospace) ? r.kp.geospace.toFixed(2) : '  -  '} `
    + `${r.boundary.median.toFixed(1).padStart(6)} ${r.margin.toFixed(1).padStart(7)} ${r.pHorizon.toFixed(2).padStart(6)} ${r.pOverhead.toFixed(2).padStart(6)} ${r.phaseFactor.toFixed(2)} ${Number.isFinite(r.pOnset) ? r.pOnset.toFixed(2) : ' -  '} ${r.pVisible.toFixed(2)}`);
}
console.log('verdict:', fc.verdict.headline, '|', fc.verdict.detail);
console.log(`done in ${Date.now() - t0} ms`);
