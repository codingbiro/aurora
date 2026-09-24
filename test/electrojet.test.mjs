// Chain electrojet index, onset detection and electrojet location, checked against a real day
// (2026-08-18, Kp 5-) from the IMAGE archive and FMI's own IL/IU indicator file for that day.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseFmiArchive, toMinutesXYZ, chainBaseline, chainDeviations, electrojetIndices, detectOnsetsNG, chainProfile, electrojetCentre, deflectionAt, ilClass, IL_CLASSES, rateIndex, fmiRateThreshold, analyseChain } from '../web/src/model/electrojet.mjs';
import { substormState, phaseFromIndex, phaseIntervals, ONSET_CLIMATOLOGY, onsetMltDensity, expectedOnsetMlat, reachFactor, localReach, localReachMlt, chainReachMlt, primeWindow, latitudeRegime, expectedSubstormSize, substormOutlook } from '../web/src/model/substorm.mjs';
import { MagneticCoordinates } from '../web/src/model/magcoords.mjs';
import { parseOvationText, ovalBand } from '../web/src/model/oval.mjs';
import { shortTermForecast, phaseFactorAt } from '../web/src/model/shortterm.mjs';
import { features } from '../web/src/model/coupling.mjs';

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const dataFile = (name) => readFile(new URL(`../web/data/${name}`, import.meta.url), 'utf8').then(JSON.parse);
const near = (actual, expected, tol, msg) => assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} expected ${expected} ± ${tol}, got ${actual}`);
const MIN = 60e3, HOUR = 3600e3;
const MLAT = { KEV: 67.14, MAS: 66.92, KIL: 66.60, IVA: 65.91, MUO: 65.45, PEL: 64.28, RAN: 63.20, OUJ: 61.77, MEK: 59.93, HAN: 59.42, NUR: 57.60, TAR: 55.23 };
const T = (h, m, d = 18) => Date.UTC(2026, 7, d, h, m);

describe('chain electrojet index on 2026-08-18', async () => {
  const archive = parseFmiArchive(await fixture('image_chain_20260818_1min.txt'));
  const stations = Object.entries(archive).map(([code, series]) => ({ station: code, mlat: MLAT[code], series }));
  const fmi = (await fixture('image_ie_20260818.txt')).split('\n').filter(l => /^\d{4} /.test(l)).map(l => { const f = l.trim().split(/\s+/); return { t: Date.UTC(+f[0], +f[1] - 1, +f[2], +f[3], +f[4], +f[5]), il: +f[6], iu: +f[7] }; });
  const dayEnd = T(0, 0, 19);
  const a = analyseChain(stations, { now: dayEnd });

  test('parseFmiArchive reads twelve stations, keeps only complete rows per station', () => {
    assert.deepEqual(Object.keys(archive), ['KEV', 'MAS', 'KIL', 'IVA', 'MUO', 'PEL', 'RAN', 'OUJ', 'MEK', 'HAN', 'NUR', 'TAR']);
    assert.equal(archive.KEV.t.length, 1440); assert.equal(archive.OUJ.t.length, 0, 'Oulujärvi was down all day'); assert.equal(archive.NUR.t.length, 675);
    assert.equal(new Date(archive.KEV.t[0]).toISOString(), '2026-08-18T00:00:00.000Z');
    assert.deepEqual([archive.KEV.x[0], archive.KEV.y[0], archive.KEV.z[0]], [10048.9, 2909.0, 53459.7]);
    assert.deepEqual(parseFmiArchive('nothing here'), {});
  });
  test('toMinutesXYZ keeps all three components', () => {
    const m = toMinutesXYZ({ t: [0, 10e3, 60e3], x: [1, 3, 5], y: [2, 4, 6], z: [7, 9, 11] });
    assert.deepEqual(m, { t: [0, 60e3], x: [2, 5], y: [3, 6], z: [8, 11] });
  });
  test('quiet baseline window is the same 09-12 UT interval FMI chose', () => {
    assert.equal(new Date(a.baseline.t0).toISOString(), '2026-08-18T09:00:00.000Z');
    assert.equal(new Date(a.baseline.t1).toISOString(), '2026-08-18T12:00:00.000Z');
    assert.ok(Object.values(a.baseline.byStation).every(b => b.method === 'quiet-window'));
    assert.equal(a.deviations.length, 10, 'two stations had no data');
    near(a.baseline.byStation.KEV.x, 10345.7, 0.5, 'Kevo quiet X');
  });
  test('IL matches FMI IL (40 stations) whenever the westward current is over Finland', () => {
    const byT = new Map(fmi.map(r => [r.t, r]));
    const hourMin = (arr, get, h) => Math.min(...arr.filter(r => new Date(r.t).getUTCHours() === h).map(get).filter(Number.isFinite));
    const mineRows = a.index.t.map((t, i) => ({ t, il: a.index.il[i] }));
    for (const h of [0, 1, 19, 22]) near(hourMin(mineRows, r => r.il, h), hourMin(fmi, r => r.il, h), 1, `hourly minimum at ${h} UT`);
    let se = 0, n = 0; for (const r of mineRows) { const f = byT.get(r.t); if (!f || !Number.isFinite(r.il)) continue; se += (r.il - f.il) ** 2; n++; }
    assert.ok(n >= 1400 && Math.sqrt(se / n) < 60, `RMS difference over the day (Norwegian/Icelandic stations missing from the chain): ${Math.sqrt(se / n)}`);
    const mine = Math.min(...a.index.il.filter(Number.isFinite)), theirs = Math.min(...fmi.map(r => r.il));
    near(mine, -456, 1, 'chain minimum'); near(theirs, -590, 1, 'FMI minimum includes Norwegian and Icelandic stations');
    assert.ok(a.index.n.every(n => n >= 0) && a.index.t.length === 1440);
  });
  test('Newell & Gjerloev onsets: 20:03 confirmed, intensifications at 20:29 and 21:05, 20-minute lockout', () => {
    assert.deepEqual(a.onsets.map(o => [new Date(o.t).toISOString().slice(11, 16), o.status]), [['20:03', 'confirmed'], ['20:29', 'confirmed'], ['21:05', 'confirmed']]);
    const first = a.onsets[0];
    near(first.il0, -45, 1); near(first.ilMin, -456, 1); assert.equal(new Date(first.tMin).toISOString().slice(11, 16), '20:54'); near(first.depth, 411, 1);
    assert.equal(first.minutesOfData, 27);
    const none = detectOnsetsNG(a.index, { until: T(19, 0) });
    assert.equal(none.length, 0, 'quiet before 19 UT');
    const strict = detectOnsetsNG(a.index, { sustain: 1000 });
    assert.equal(strict.length, 0, 'an impossible sustain requirement finds nothing');
  });
  test('an onset is provisional after 3 minutes and confirmed once 30 minutes of data exist', () => {
    const at2010 = analyseChain(stations, { now: T(20, 10) });
    assert.deepEqual(at2010.onsets.map(o => [new Date(o.t).toISOString().slice(11, 16), o.status, o.minutesOfData]), [['20:03', 'provisional', 4]]);
    const at2040 = analyseChain(stations, { now: T(20, 40) });
    assert.deepEqual(at2040.onsets.map(o => [new Date(o.t).toISOString().slice(11, 16), o.status]), [['20:03', 'confirmed'], ['20:29', 'provisional']]);
    assert.equal(at2010.latest.ilStation, 'IVA'); near(at2010.latest.il, -138, 1);
  });
  test('electrojet centre: onset at 62 deg (Z sign change), poleward expansion to 66.5 deg an hour later', () => {
    const c2030 = electrojetCentre(chainProfile(a.deviations, T(20, 30)));
    assert.equal(c2030.method, 'x+z'); near(c2030.mlat, 61.96, 0.05); assert.equal(c2030.station, 'RAN'); near(c2030.fromZ, 61.68, 0.05); near(c2030.fromX, 62.25, 0.05); assert.equal(c2030.beyond, null);
    const c2130 = electrojetCentre(chainProfile(a.deviations, T(21, 30)));
    assert.equal(c2130.method, 'x+z'); near(c2130.mlat, 66.52, 0.05); assert.equal(c2130.station, 'KIL');
    assert.equal(electrojetCentre(chainProfile(a.deviations, T(20, 0))), null, 'no current before onset');
    const p2010 = chainProfile(a.deviations, T(20, 10));
    assert.equal(electrojetCentre(p2010).method, 'x', 'Z has not crossed zero yet: X minimum only');
    assert.equal(electrojetCentre([]), null); assert.equal(electrojetCentre([{ station: 'A', mlat: 60, dx: -300, dz: 10 }]), null, 'one station is not a profile');
  });
  test('electrojet beyond the chain is only reported for large bays', () => {
    const north = [{ station: 'A', mlat: 60, dx: -20, dz: -10 }, { station: 'B', mlat: 63, dx: -60, dz: -40 }, { station: 'C', mlat: 66, dx: -150, dz: -90 }];
    assert.deepEqual(electrojetCentre(north), { mlat: 67.5, amplitude: -150, station: 'C', method: 'beyond-chain', beyond: 'poleward', fromX: NaN, fromZ: NaN });
    assert.equal(electrojetCentre(north.map(r => ({ ...r, dx: r.dx / 2 }))), null, 'a 75 nT bay at the end of the chain is not located');
    const south = [{ station: 'A', mlat: 60, dx: -200, dz: 60 }, { station: 'B', mlat: 63, dx: -80, dz: 30 }, { station: 'C', mlat: 66, dx: -10, dz: 5 }];
    assert.equal(electrojetCentre(south).beyond, 'equatorward'); near(electrojetCentre(south).mlat, 58.5, 1e-9);
  });
  test('deflectionAt interpolates between stations and flags the ends', () => {
    const p = chainProfile(a.deviations, T(20, 50));
    const tro = deflectionAt(p, 67.26); assert.equal(tro.station, 'KEV'); assert.equal(tro.extrapolated, true); near(tro.dx, -138, 1);
    const rov = deflectionAt(p, 63.84); assert.equal(rov.extrapolated, false); near(rov.dx, -413, 1); assert.equal(rov.station, 'PEL');
    assert.ok(Number.isNaN(deflectionAt([], 60).dx));
  });
  test('rateIndex: hourly maximum of the 1-minute derivative of X and Y (FMI Auroras Now rule)', () => {
    const t = [], x = [], y = [];
    for (let i = 0; i < 90 * 6; i++) { const min = Math.floor(i / 6); t.push(T(20, 0) + i * 10e3); x.push(min === 40 ? 1030 : 1000); y.push(min === 70 ? 560 : 500); }
    const r = rateIndex({ t, x, y }, T(21, 15));
    near(r.rate, 1, 1e-9, '60 nT in one minute in Y'); assert.equal(r.t, T(21, 10));
    near(rateIndex({ t, x, y }, T(20, 45)).rate, 0.5, 1e-9, '30 nT step in X at 20:40');
    assert.ok(Number.isNaN(rateIndex({ t, x, y }, T(23, 0)).rate), 'nothing in the window');
    assert.equal(fmiRateThreshold('KEV'), 0.57); assert.equal(fmiRateThreshold('NUR'), 0.30); assert.equal(fmiRateThreshold('MAS', 66.92), 0.57); near(fmiRateThreshold('RAN', 63.2), 0.46, 0.01); assert.ok(Number.isNaN(fmiRateThreshold('XXX', NaN)));
  });
  test('ilClass bands', () => {
    assert.deepEqual([-10, -50, -100, -170, -299, -300, -874, -875, NaN].map(ilClass), ['quiet', 'weak', 'weak', 'moderate', 'moderate', 'strong', 'strong', 'intense', 'unknown']);
    assert.equal(IL_CLASSES.length, 5);
  });
  test('substormState uses the chain path with three or more stations and the IL-based phase', () => {
    const drive = []; for (let i = -240; i <= 60; i++) drive.push({ t: T(20, 50) + i * MIN, power: 20000, ekl: 1.5, bz: -5 });
    const s = substormState(stations, drive, T(20, 50));
    assert.equal(s.method, 'chain'); assert.equal(s.phase, 'expansion'); assert.equal(s.chain.stations, 10);
    assert.equal(new Date(s.lastOnset.t).toISOString().slice(11, 16), '20:29'); assert.equal(s.lastOnset.status, 'provisional');
    near(s.ilNow, -448, 1); assert.equal(s.ilClass, 'strong'); near(s.eklHour, 1.5, 1e-9);
    assert.ok(s.stations.every(st => Number.isFinite(st.rateThreshold)));
    near(s.chain.centre.mlat, 62.19, 0.05);
    const later = substormState(stations, drive.map(d => ({ ...d, t: d.t + 130 * MIN })), T(23, 0));
    assert.equal(later.phase, 'recovery'); assert.equal(later.lastOnset.status, 'confirmed');
    const two = substormState(stations.slice(0, 2), drive, T(20, 50));
    assert.equal(two.method, 'stations', 'fewer than three stations: per-station bays');
  });
  test('phaseFromIndex and phaseIntervals', () => {
    const idx = { t: [], il: [] }; for (let i = 0; i <= 90; i++) { idx.t.push(T(0, i)); idx.il.push(i < 10 ? -20 : i < 25 ? -20 - 30 * (i - 9) : i < 60 ? -470 + 8 * (i - 24) : -190 + 2 * (i - 59)); }
    const onset = { t: T(0, 10) };
    assert.equal(phaseFromIndex(idx, onset, T(0, 15), 1, 20).phase, 'expansion', 'first 12 minutes');
    assert.equal(phaseFromIndex(idx, onset, T(0, 27), 1, 20).phase, 'expansion', 'still near the deepest point');
    const r = phaseFromIndex(idx, onset, T(0, 50), 1, 20); assert.equal(r.phase, 'recovery'); near(r.ilMin, -470, 1e-9); assert.equal(r.tMin, T(0, 24));
    assert.equal(phaseFromIndex(idx, onset, T(1, 30), 0.3, 0).phase, 'quiet', 'bay gone and driving weak');
    assert.equal(phaseFromIndex(idx, onset, T(1, 30), 1.0, 30).phase, 'growth');
    assert.equal(phaseFromIndex(idx, null, T(0, 50), 1.0, 30).phase, 'growth');
    const iv = phaseIntervals([{ t: T(0, 10), tMin: T(0, 24) }, { t: T(0, 40), tMin: T(0, 55) }], T(1, 0));
    assert.deepEqual(iv, [{ start: T(0, 10), end: T(0, 24), kind: 'expansion' }, { start: T(0, 24), end: T(0, 40), kind: 'recovery' }, { start: T(0, 40), end: T(0, 55), kind: 'expansion' }, { start: T(0, 55), end: T(1, 0), kind: 'recovery' }]);
  });
});

describe('onset climatology and observer outlook', async () => {
  const mag = new MagneticCoordinates(await dataFile('aacgm_europe_grid.json'), await dataFile('mlt_reference.json'));
  const ovation = parseOvationText(await fixture('ovation_latest_aurora_n.txt'));
  const tromso = mag.convert(69.649, 18.956), rovaniemi = mag.convert(66.503, 25.729), cph = mag.convert(55.676, 12.568);

  test('onset local-time density peaks at 23 MLT and wraps around midnight', () => {
    assert.ok(onsetMltDensity(23) > onsetMltDensity(22) && onsetMltDensity(22) > onsetMltDensity(21));
    near(onsetMltDensity(0.5), onsetMltDensity(21.5), 1e-12, 'symmetric on the circle');
    let s = 0; for (let m = 0; m < 24; m += 0.1) s += onsetMltDensity(m) * 0.1; near(s, 1, 0.01, 'normalised');
    assert.equal(ONSET_CLIMATOLOGY.mltMean, 23); assert.equal(ONSET_CLIMATOLOGY.mltSd, 1.3);
  });
  test('expected onset latitude follows the merging electric field, else Kp', () => {
    near(expectedOnsetMlat(NaN, 23, ONSET_CLIMATOLOGY, 1), 67.8, 1e-9); near(expectedOnsetMlat(NaN, 23, ONSET_CLIMATOLOGY, 4), 62.6, 1e-9);
    assert.equal(expectedOnsetMlat(NaN, 23, ONSET_CLIMATOLOGY, 9), expectedOnsetMlat(NaN, 23, ONSET_CLIMATOLOGY, 6), 'capped at 6 mV/m');
    near(expectedOnsetMlat(2, 23), 66.5, 0.1); near(expectedOnsetMlat(5, 23), 62.9, 0.1); assert.equal(expectedOnsetMlat(0, 23), 70, 'quiet fallback capped');
    assert.ok(expectedOnsetMlat(3, 23) > expectedOnsetMlat(4, 23));
  });
  test('reach kernel: full inside the bulge, tapering to zero, asymmetric in latitude', () => {
    assert.equal(reachFactor(0, 0), 1); assert.equal(reachFactor(-1.5, 5), 1); assert.equal(reachFactor(1.5, -1.5), 1);
    assert.equal(reachFactor(-3.2, 0), 0); assert.equal(reachFactor(3.0, 0), 0); assert.equal(reachFactor(0, 8.5), 0); assert.equal(reachFactor(0, -4), 0);
    near(reachFactor(0, 6.75), 0.5, 1e-9); near(reachFactor(-2.35, 0), 0.5, 1e-9);
  });
  test('localReach: an auroral-zone observer near magnetic midnight sees most onsets, Copenhagen none', () => {
    const on = expectedOnsetMlat(NaN, 23, ONSET_CLIMATOLOGY, 1.5);
    const r = (mlt, mlat) => localReach(mlt, mlat, on);
    assert.ok(r(23, tromso.mlat) > 0.8 && r(23, tromso.mlat) <= 1, `Tromsø at 23 MLT: ${r(23, tromso.mlat)}`);
    assert.ok(r(18, tromso.mlat) < 0.05, 'early evening');
    assert.ok(r(23, rovaniemi.mlat) > 0.3 && r(23, rovaniemi.mlat) < r(23, tromso.mlat), 'Rovaniemi is 3 deg equatorward of the onset arc');
    assert.equal(r(23, cph.mlat), 0);
    assert.ok(localReachMlt(23) > 0.9 && localReachMlt(17) < 0.1);
    assert.equal(chainReachMlt(-0.2), 1); assert.equal(chainReachMlt(-2.7), (3.2 - 2.7) / (3.2 - 1.5));
    assert.ok(Number.isNaN(localReach(NaN, 60, 66)));
  });
  test('primeWindow finds the 3-hour window around 23 MLT for the observer longitude', () => {
    const now = Date.UTC(2026, 8, 24, 14, 0);
    const p = primeWindow(mag, tromso.mlon, now);
    assert.ok(p.start > now && p.end > p.start && p.active === false);
    near((p.end - p.start) / HOUR, 3, 0.1);
    near(mag.mlt(tromso.mlon, new Date(p.peak)), 23, 0.1);
    const inside = primeWindow(mag, tromso.mlon, p.peak); assert.equal(inside.active, true); assert.equal(inside.start, p.start);
  });
  test('latitudeRegime and expectedSubstormSize', () => {
    assert.deepEqual([tromso.mlat, rovaniemi.mlat, 60, cph.mlat].map(latitudeRegime), ['auroral', 'auroral', 'subauroral', 'midlatitude']);
    near(expectedSubstormSize(4421).il, -350, 1); near(expectedSubstormSize(13000).il, -670, 1); assert.equal(expectedSubstormSize(4421).class, 'strong'); assert.equal(expectedSubstormSize(NaN).class, 'unknown');
  });
  test('substormOutlook for Tromsø during the 18 August substorm and for Copenhagen', async () => {
    const archive = parseFmiArchive(await fixture('image_chain_20260818_1min.txt'));
    const stations = Object.entries(archive).map(([code, series]) => ({ station: code, mlat: MLAT[code], series }));
    const now = T(20, 50);
    const drive = []; for (let i = -240; i <= 60; i++) drive.push({ t: now + i * MIN, power: 20000, ekl: 1.5, bz: -5 });
    const sub = substormState(stations, drive, now);
    const out = substormOutlook({ sub, observer: tromso, mag, now, kp: 3, ovation, couplingRecent: 8000 });
    assert.equal(out.regime, 'auroral'); assert.equal(out.tone, 'good'); assert.match(out.headline, /Strong substorm in progress/);
    assert.equal(out.onsetMlatFrom, 'merging-field'); near(out.onsetMlat, 66.6, 0.1);
    assert.ok(out.currentReach >= 0.95, `centre 5 deg south, at the edge of the full poleward reach: ${out.currentReach}`);
    assert.ok(out.horizons.every(r => Number.isFinite(r.pOnsetLocal) && r.pOnsetLocal <= r.pOnset));
    assert.equal(out.oval.position, 'inside'); assert.equal(out.activity.class, 'strong'); assert.equal(out.activity.rateStation, 'KEV');
    assert.match(out.detail, /electrojet centred at 62\.2°, 5\.1° south of you/);
    assert.match(out.detail, /FMI's 0\.57 nT\/s aurora threshold/);
    const rov = substormOutlook({ sub, observer: rovaniemi, mag, now, kp: 3, ovation, couplingRecent: 8000 });
    assert.equal(rov.tone, 'good'); near(rov.activity.localDx, -413, 1);
    const c = substormOutlook({ sub, observer: cph, mag, now, kp: 3, ovation, couplingRecent: 8000 });
    assert.equal(c.regime, 'midlatitude'); assert.equal(c.tone, 'info'); assert.match(c.detail, /1\.0 h east of you/);
    const none = substormOutlook({ sub: null, observer: tromso, mag, now, kp: 3, ovation });
    assert.equal(none.tone, 'info'); assert.match(none.headline, /No magnetometer data/); assert.ok(none.prime);
    const quiet = substormOutlook({ sub: substormState(stations, drive, T(19, 0)), observer: tromso, mag, now: T(19, 0), kp: 2, ovation: null, couplingRecent: 3000 });
    assert.equal(quiet.oval, null); assert.ok(['maybe', 'good', 'low'].includes(quiet.tone));
  });
  test('the visibility model scales the onset chance by the sector reach and the ongoing phase by the chain offset', () => {
    const sub = { phase: 'expansion', minutesSinceOnset: 5, ekl: 2, loaded: 0, powerRecent: 1 };
    const far = { chainReachMlt: 0, horizons: [{ h: 5, reachMlt: 0 }, { h: 60, reachMlt: 0 }] };
    near(phaseFactorAt(sub, 5, far).factor, 0.25, 1e-9, 'a substorm in another sector counts as quiet');
    assert.equal(phaseFactorAt(sub, 5, { chainReachMlt: 1, horizons: [] }).factor, 1);
    const growth = { phase: 'growth', minutesSinceOnset: Infinity, ekl: 1, loaded: 81, powerRecent: 1 };
    const full = phaseFactorAt(growth, 30, { chainReachMlt: 1, horizons: [{ h: 30, reachMlt: 1 }] }), half = phaseFactorAt(growth, 30, { chainReachMlt: 1, horizons: [{ h: 30, reachMlt: 0.5 }] });
    near(half.pOnsetSector, full.pOnsetSector / 2, 1e-12); assert.ok(half.factor < full.factor);
    const longLived = { phase: 'recovery', minutesSinceOnset: 100, ekl: 1, loaded: 10, powerRecent: 1, ilNow: -200 };
    near(phaseFactorAt(longLived, 10).factor, 0.75 + (1 - 0.75) * phaseFactorAt(longLived, 10).pOnset, 1e-9, 'index still shows recovery: recovery factor');
  });
  test('shortTermForecast carries the sector onset chance into its rows and verdict', () => {
    const now = Date.UTC(2026, 8, 17, 22, 0), tLast = now + 40 * MIN, propagated = [];
    for (let t = tLast - 8 * HOUR; t <= tLast; t += MIN) { const rec = { t, tMeasured: t - 50 * MIN, speed: 500, density: 5, bx: 0, by: 0, bz: -6, bt: 6 }; Object.assign(rec, features(rec)); propagated.push(rec); }
    const sub = { phase: 'growth', minutesSinceOnset: Infinity, ekl: 3, loaded: 100, powerRecent: 1, ilNow: -30 };
    const outlook = substormOutlook({ sub, observer: tromso, mag, now, kp: 4, ovation, couplingRecent: 13000 });
    const fc = shortTermForecast({ now, propagated, ovation, observer: tromso, mag, substorm: sub, outlook });
    assert.equal(fc.ok, true);
    assert.ok(fc.horizons.every(r => Number.isFinite(r.pOnsetSector) && r.pOnsetSector <= r.pOnset + 1e-12));
    assert.match(fc.verdict.detail, /see the substorm section/);
    assert.match(fc.verdict.detail, /IL -30 nT/);
  });
  test('ovalBand positions an observer relative to both edges', () => {
    const b = ovalBand(ovation, 23, 1.0, tromso.mlat);
    assert.equal(b.equatorward, 61.5); assert.equal(b.poleward, 71); assert.equal(b.position, 'inside'); assert.equal(b.peakMlat, 65.5);
    assert.equal(ovalBand(ovation, 23, 1.0, 75).position, 'poleward'); near(ovalBand(ovation, 23, 1.0, 75).offset, 4, 1e-9);
    assert.equal(ovalBand(ovation, 23, 1.0, cph.mlat).position, 'equatorward');
    assert.equal(ovalBand(ovation, 12, 1.0, 67).position, 'none');
  });
});
