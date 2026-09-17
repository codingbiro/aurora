// Unit tests for the parsers: NOAA text products, alerts, DONKI, WSA-Enlil, night cards,
// NOAA JSON products, fetch utilities and proxied-source helpers. Offline, fixture-based.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { parseIssued, parseGeomagForecast, parseKpTable, parseThreeDayForecast, parseDiscussion, parse27Day, parseAlerts, activeGeomagneticMessages, cmeArrivals, enlilEvents, dayProbabilityAtLeast, nightCards } from '../web/src/model/longterm.mjs';
import { parsePropagated, mergePropagated, rtswStatus, parseKp1m, parseGeospaceKp, parseHemiPower, parseKpForecast, parseKp3h, parseScales, parseFlares, URLS, NOAA, load } from '../web/src/data/noaa.mjs';
import { noaaTime, minutesAgo, freshness } from '../web/src/data/fetch-util.mjs';
import { ProxyClient, stripHtml } from '../web/src/data/proxied.mjs';

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const json = async (name) => JSON.parse(await fixture(name));
const iso = (ms) => new Date(ms).toISOString();
const near = (actual, expected, tol, msg) => assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} expected ${expected} ± ${tol}, got ${actual}`);
const DAY = 86400e3, HOUR = 3600e3;

describe('NOAA text products', async () => {
  const geomagTxt = await fixture('3-day-geomag-forecast.txt');

  test('parseIssued', () => {
    assert.equal(parseIssued(':Issued: 2026 Sep 16 2205 UTC'), Date.UTC(2026, 8, 16, 22, 5));
    assert.equal(parseIssued('nothing here'), null);
  });
  test('parseGeomagForecast: Ap, storm probabilities, 3-hour Kp table', () => {
    const g = parseGeomagForecast(geomagTxt);
    assert.equal(iso(g.issued), '2026-09-16T22:05:00.000Z');
    assert.deepEqual(g.ap, { observed: 8, estimated: 18, predicted: [22, 12, 10] });
    assert.equal(g.probabilities.length, 3);
    assert.deepEqual(g.probabilities.map(p => iso(p.date).slice(0, 10)), ['2026-09-17', '2026-09-18', '2026-09-19']);
    const d1 = g.probabilities[0];
    assert.equal(d1.active, 0.35); assert.equal(d1.minor, 0.45); assert.equal(d1.moderate, 0.1); assert.equal(d1.strong, 0.01);
    assert.deepEqual([g.probabilities[2].active, g.probabilities[2].minor], [0.2, 0.05]);
    assert.equal(g.kp.length, 24);
    assert.ok(g.kp.every((r, i) => i === 0 || r.t > g.kp[i - 1].t), 'ascending');
    assert.deepEqual([iso(g.kp[0].t), g.kp[0].kp], ['2026-09-17T00:00:00.000Z', 4]);
    assert.deepEqual([iso(g.kp[1].t), g.kp[1].kp], ['2026-09-17T03:00:00.000Z', 4.67]);
    assert.deepEqual([iso(g.kp[8].t), g.kp[8].kp], ['2026-09-18T00:00:00.000Z', 3.67], 'day 2 starts at bin 8');
    assert.deepEqual([iso(g.kp[23].t), g.kp[23].kp], ['2026-09-19T21:00:00.000Z', 2.67]);
  });
  test('parseKpTable days', () => {
    assert.deepEqual(parseKpTable(geomagTxt, 2026).days.map(d => iso(d).slice(0, 10)), ['2026-09-17', '2026-09-18', '2026-09-19']);
    assert.deepEqual(parseKpTable('no table', 2026), { kp: [], days: [] });
  });
  test('parseThreeDayForecast: observed/expected maxima, rationale, G-tagged bins', async () => {
    const f = parseThreeDayForecast(await fixture('3-day-forecast.txt'));
    assert.equal(iso(f.issued), '2026-09-17T12:30:00.000Z');
    assert.equal(f.maxObserved, 3); assert.equal(f.maxExpected, 4.67);
    assert.equal(f.kp.length, 24);
    assert.ok(f.rationale.startsWith('Active to G1'), f.rationale);
    assert.ok(!/Rationale:/.test(f.rationale), 'the duplicated label is stripped');
    const g1 = f.kp.find(b => b.kp === 4.67);
    assert.equal(iso(g1.t), '2026-09-17T21:00:00.000Z', 'the "(G1)" suffix does not break the row');
  });
  test('parseDiscussion sections', async () => {
    const d = parseDiscussion(await fixture('discussion.txt'));
    assert.equal(iso(d.issued), '2026-09-17T12:30:00.000Z');
    assert.deepEqual(Object.keys(d.sections), ['solar', 'particles', 'solarWind', 'geospace']);
    assert.ok(d.sections.solarWind.summary.startsWith('Solar wind parameters were enhanced'));
    assert.ok(d.sections.geospace.forecast.startsWith('Geomagnetic activity is likely to reach'));
    assert.ok(d.sections.solar.forecast.startsWith('Solar activity is expected'));
    assert.ok(d.sections.particles.summary.length > 0);
    assert.ok(!/\n/.test(d.sections.geospace.forecast), 'whitespace collapsed');
  });
  test('parse27Day', async () => {
    const o = parse27Day(await fixture('27-day-outlook.txt'));
    assert.equal(iso(o.issued), '2026-09-14T01:17:00.000Z');
    assert.equal(o.days.length, 27);
    assert.deepEqual(o.days[0], { date: Date.UTC(2026, 8, 14), f107: 105, ap: 18, kpMax: 4 });
    assert.deepEqual(o.days[26], { date: Date.UTC(2026, 9, 10), f107: 115, ap: 5, kpMax: 2 });
  });
});

describe('alerts', async () => {
  const alerts = parseAlerts(await json('alerts.json'));
  const now = Date.UTC(2026, 8, 17, 14, 0);

  test('normalizes codes, kinds and ordering', () => {
    assert.equal(alerts.length, 82);
    assert.ok(alerts.every((a, i) => i === 0 || a.issued <= alerts[i - 1].issued), 'newest first');
    assert.deepEqual([...new Set(alerts.map(a => a.kind))].sort(), ['alert', 'summary', 'warning', 'watch']);
    assert.ok(alerts.every(a => /^(WAT|WAR|ALT|SUM)/.test(a.code)), 'every message carries a NOAA code');
  });
  test('watches carry the level and the per-day prediction', () => {
    const watches = alerts.filter(a => a.kind === 'watch');
    assert.equal(watches.length, 8);
    const w = watches[0];
    assert.equal(w.code, 'WATA20'); assert.equal(w.watchLevel, 1); assert.equal(w.cancelled, false);
    assert.deepEqual(w.byDay, [{ label: 'Sep 16', level: 1 }, { label: 'Sep 17', level: 1 }, { label: 'Sep 18', level: 0 }]);
    assert.equal(iso(w.issued), '2026-09-15T17:37:51.220Z');
    const cancelled = watches.find(x => x.cancelled);
    assert.equal(cancelled.code, 'WATA30'); assert.equal(cancelled.watchLevel, 2); assert.equal(cancelled.byDay.length, 0);
  });
  test('K-index warnings and alerts carry the level and validity', () => {
    const k = alerts.filter(a => a.kLevel);
    assert.equal(k.length, 28);
    const warn = k.find(a => a.code === 'WARK04');
    assert.equal(warn.kLevel, 4); assert.equal(warn.kind, 'warning'); assert.equal(iso(warn.validUntil), '2026-09-16T18:00:00.000Z');
    const alert = k.find(a => a.code === 'ALTK05');
    assert.equal(alert.kLevel, 5); assert.equal(alert.kind, 'alert');
  });
  test('activeGeomagneticMessages filters by validity and age', () => {
    const active = activeGeomagneticMessages(alerts, now);
    assert.deepEqual(active.map(a => `${a.code} ${iso(a.issued).slice(0, 16)}`), ['ALTK04 2026-09-16T00:34', 'WATA20 2026-09-15T17:37', 'ALTK04 2026-09-14T18:02', 'WATA20 2026-09-14T15:47']);
    assert.equal(activeGeomagneticMessages(alerts, now + 30 * DAY).length, 0);
    assert.ok(active.every(a => !a.cancelled));
  });
});

describe('DONKI and WSA-Enlil', async () => {
  const cmes = await json('donki_cme.json');
  const now = Date.UTC(2026, 8, 17, 14, 0);

  test('cmeArrivals keeps one Earth-directed run per CME with its Kp scenarios', () => {
    const arr = cmeArrivals(cmes, now, { horizonDays: 30 });
    assert.equal(arr.length, 2);
    assert.ok(arr[0].arrival <= arr[1].arrival, 'sorted by arrival');
    const c = arr.find(x => x.id === '2026-09-14T11:08:00-CME-001');
    assert.equal(iso(c.arrival), '2026-09-17T06:00:00.000Z');
    assert.deepEqual(c.kp, { k90: 3, k135: 4, k180: 4 });
    assert.equal(c.glancing, true); assert.equal(c.minor, false); assert.equal(c.uncertaintyH, 7);
    assert.equal(c.speed, 897); assert.equal(c.type, 'C');
    assert.equal(iso(c.modelCompleted), '2026-09-14T15:32:00.000Z');
    assert.equal(iso(c.start), '2026-09-14T11:08:00.000Z');
    const d = arr.find(x => x.id === '2026-09-13T21:12:00-CME-001');
    assert.deepEqual(d.kp, { k90: 2, k135: 4, k180: 4 }); assert.equal(iso(d.arrival), '2026-09-17T12:00:00.000Z');
    assert.equal(cmeArrivals(cmes, now).length, 2, 'default 5-day horizon includes both');
    assert.equal(cmeArrivals(cmes, Date.UTC(2026, 8, 16), { horizonDays: 5 }).length, 3, 'one more when looking from the 16th');
    assert.equal(cmeArrivals([], now).length, 0);
  });
  test('enlilEvents: ascending rows, horizon end, HSS ramps', async () => {
    const en = enlilEvents(await json('enlil_time_series_sub.json'), now);
    assert.equal(en.rows.length, 215);
    assert.ok(en.rows.every((r, i) => i === 0 || r.t > en.rows[i - 1].t));
    assert.equal(iso(en.rows[0].t), '2026-09-12T19:45:08.000Z');
    assert.equal(iso(en.horizonEnd), '2026-09-19T19:01:34.000Z');
    assert.deepEqual(Object.keys(en.rows[0]).sort(), ['b', 'cloud', 'n', 'polarity', 't', 'v']);
    assert.equal(en.rows[0].cloud, 0); near(en.rows[0].v, 278.104, 1e-9);
    assert.ok(Array.isArray(en.events) && en.events.length >= 1);
    for (const e of en.events) {
      assert.ok(['hss', 'cme-cloud'].includes(e.kind));
      if (e.kind === 'hss') { assert.ok(e.to - e.from >= 100, 'ramp of at least 100 km/s'); assert.ok(e.peakT > e.start); }
    }
    assert.equal(en.events[0].kind, 'hss');
    assert.equal(iso(en.events[0].start), '2026-09-16T07:10:14.000Z');
  });
});

describe('nightly probabilities', async () => {
  const g = parseGeomagForecast(await fixture('3-day-geomag-forecast.txt'));
  const now = Date.UTC(2026, 8, 17, 14, 0);
  const p1 = g.probabilities[0];

  test('dayProbabilityAtLeast interpolates NOAA categories and is monotone decreasing', () => {
    near(dayProbabilityAtLeast(p1, 4), 0.91, 1e-9); near(dayProbabilityAtLeast(p1, 5), 0.56, 1e-9);
    near(dayProbabilityAtLeast(p1, 6), 0.11, 1e-9); near(dayProbabilityAtLeast(p1, 7), 0.01, 1e-9);
    near(dayProbabilityAtLeast(p1, 4.5), 0.735, 1e-9); near(dayProbabilityAtLeast(p1, 0), 1, 1e-9);
    const vals = [0, 2, 3.6, 4, 4.5, 5, 6, 7, 8, 9].map(t => dayProbabilityAtLeast(p1, t));
    assert.ok(vals.every((v, i) => i === 0 || v <= vals[i - 1]), 'monotone');
    assert.ok(vals.every(v => v >= 0 && v <= 1));
  });
  test('nightCards: three nights, both thresholds, blended parts', () => {
    const cards = nightCards(now, g.kp, g.probabilities, null, { horizon: 3.6, overhead: 7.65 });
    assert.equal(cards.length, 3);
    assert.deepEqual(cards.map(c => iso(c.evening).slice(0, 10)), ['2026-09-17', '2026-09-18', '2026-09-19']);
    assert.equal(iso(cards[0].start), '2026-09-17T16:00:00.000Z'); assert.equal(iso(cards[0].end), '2026-09-18T06:00:00.000Z');
    assert.deepEqual(cards.map(c => c.kpMax), [3.67, 3, 2.67]);
    for (const c of cards) {
      for (const name of ['horizon', 'overhead']) {
        const e = c.estimates[name];
        assert.ok(e.probability >= 0 && e.probability <= 1, `${name} probability in range`);
        assert.ok(e.parts.length >= 1);
        assert.equal(e.threshold, name === 'horizon' ? 3.6 : 7.65);
      }
      assert.ok(c.estimates.overhead.probability < c.estimates.horizon.probability);
    }
    assert.deepEqual(cards[0].estimates.horizon.parts.map(p => p.source), ['noaa-kp', 'noaa-probabilities']);
    near(cards[0].estimates.horizon.probability, 0.683, 0.005);
    assert.ok(cards[0].estimates.horizon.probability > cards[1].estimates.horizon.probability && cards[1].estimates.horizon.probability > cards[2].estimates.horizon.probability, 'quieter nights later in the forecast');
  });
  test('nightCards before 06 UTC still covers the running night; ensemble adds a part', () => {
    const early = nightCards(Date.UTC(2026, 8, 17, 3, 0), g.kp, g.probabilities, null, { horizon: 3.6 });
    assert.equal(iso(early[0].evening).slice(0, 10), '2026-09-16');
    const ens = []; for (let t = now; t < now + 3 * DAY; t += 3 * HOUR) ens.push({ t, median: 3, pGe4: 0.3, pGe5: 0.1, pGe6: 0.02, pGe7: 0.005, pGe8: 0 });
    const cards = nightCards(now, g.kp, g.probabilities, ens, { horizon: 3.6 });
    assert.deepEqual(cards[0].estimates.horizon.parts.map(p => p.source), ['noaa-kp', 'noaa-probabilities', 'gfz-ensemble']);
  });
});

describe('NOAA JSON products', async () => {
  test('parsePropagated: ascending by arrival with derived features', async () => {
    const rows = parsePropagated(await json('propagated-1-hour.json'));
    assert.equal(rows.length, 54);
    assert.ok(rows.every((r, i) => i === 0 || r.t >= rows[i - 1].t));
    assert.equal(iso(rows[0].t), '2026-09-17T15:59:01.000Z');
    assert.equal(iso(rows[0].tMeasured), '2026-09-17T15:08:00.000Z');
    assert.ok(rows[0].t - rows[0].tMeasured > 30 * 60e3, 'arrival is later than measurement');
    for (const k of ['speed', 'density', 'temperature', 'bx', 'by', 'bz', 'bt', 'vx', 'vy', 'vz', 'coupling', 'ekl', 'power', 'viscous', 'pdyn']) assert.ok(k in rows[0], k);
    assert.ok(rows.every(r => Number.isFinite(r.coupling)));
    near(rows[53].coupling, 462.92, 0.01); assert.equal(rows[53].speed, 453.9); assert.equal(rows[53].bz, 0.92);
    assert.deepEqual(parsePropagated([]), []); assert.deepEqual(parsePropagated(null), []); assert.deepEqual(parsePropagated([['time_tag']]), []);
  });
  test('mergePropagated de-duplicates on measurement time', async () => {
    const rows = parsePropagated(await json('propagated-1-hour.json'));
    assert.equal(mergePropagated(rows, rows.slice(10, 20)).length, 54);
    const extra = { ...rows[0], tMeasured: rows[0].tMeasured + 1, t: rows[0].t + 1 };
    assert.equal(mergePropagated(rows, [extra]).length, 55);
  });
  test('rtswStatus picks the active spacecraft', () => {
    const s = rtswStatus(
      [{ time_tag: '2026-09-17T14:09:00', active: true, source: 'SOLAR1', overall_quality: 0 }, { time_tag: '2026-09-17T14:09:00', active: false, source: 'ACE' }],
      [{ time_tag: '2026-09-17T14:08:00', active: false, source: 'ACE' }, { time_tag: '2026-09-17T14:08:00', active: true, source: 'SOLAR1' }]);
    assert.equal(s.mag.source, 'SOLAR1'); assert.equal(s.mag.active, true); assert.equal(s.mag.t, Date.UTC(2026, 8, 17, 14, 9)); assert.deepEqual(s.mag.sources, ['SOLAR1', 'ACE']);
    assert.equal(s.wind.source, 'SOLAR1'); assert.deepEqual(s.wind.sources, ['ACE', 'SOLAR1']);
    assert.deepEqual(rtswStatus([], []), { mag: null, wind: null });
  });
  test('index series parsers', async () => {
    const kp1 = parseKp1m(await json('planetary_k_index_1m.json'));
    assert.equal(kp1.length, 358); assert.deepEqual(kp1[kp1.length - 1], { t: Date.UTC(2026, 8, 17, 16, 5), kp: 0.67, kpIndex: 1 });
    assert.ok(kp1.every((r, i) => i === 0 || r.t >= kp1[i - 1].t));
    const geo = parseGeospaceKp(await json('geospace_pred_est_kp_1_hour.json'));
    assert.equal(geo.length, 94); assert.deepEqual(geo[geo.length - 1], { t: Date.UTC(2026, 8, 17, 16, 41), kp: 1.333 });
    const hp = parseHemiPower(await fixture('aurora-nowcast-hemi-power.txt'));
    assert.equal(hp.length, 194);
    assert.deepEqual(hp[0], { tObs: Date.UTC(2026, 8, 17, 0, 0), tForecast: Date.UTC(2026, 8, 17, 0, 48), north: 16, south: 16 });
    assert.deepEqual(hp[hp.length - 1], { tObs: Date.UTC(2026, 8, 17, 16, 5), tForecast: Date.UTC(2026, 8, 17, 17, 0), north: 13, south: 13 });
    const kf = parseKpForecast(await json('kp-forecast.json'));
    assert.equal(kf.length, 81);
    assert.equal(kf.filter(r => r.status === 'predicted').length, 17);
    assert.equal(kf.filter(r => r.status === 'observed').length, 61);
    assert.equal(kf.filter(r => r.status === 'estimated').length, 3);
    assert.deepEqual(kf[0], { t: Date.UTC(2026, 8, 10, 0, 0), kp: 2.67, status: 'observed', scale: null });
    assert.deepEqual(kf[kf.length - 1], { t: Date.UTC(2026, 8, 20, 0, 0), kp: 2.33, status: 'predicted', scale: null });
    assert.ok(kf.some(r => r.scale === 'G1'));
    const k3 = parseKp3h([{ time_tag: '2026-09-17T09:00:00', Kp: 1.67, a_running: 6, station_count: 8 }]);
    assert.deepEqual(k3, [{ t: Date.UTC(2026, 8, 17, 9), kp: 1.67 }]);
  });
  test('parseScales and parseFlares', async () => {
    const s = parseScales(await json('noaa-scales.json'));
    assert.deepEqual(Object.keys(s), ['yesterday', 'now', 'days']);
    assert.equal(s.now.g, 0); assert.equal(s.now.gText, 'none'); assert.equal(s.now.date, Date.UTC(2026, 8, 17));
    assert.equal(s.days.length, 3);
    assert.deepEqual(s.days.map(d => d.g), [1, 0, 0]); assert.equal(s.days[0].gText, 'minor');
    assert.deepEqual(s.days.map(d => iso(d.date).slice(0, 10)), ['2026-09-17', '2026-09-18', '2026-09-19']);
    assert.equal(s.yesterday.date, Date.UTC(2026, 8, 16));
    const fl = parseFlares([{ time_tag: '2026-09-17T12:08:00Z', max_time: '2026-09-17T12:16:00Z', max_class: 'B3.2', begin_time: '2026-09-17T12:08:00Z', end_time: '2026-09-17T12:24:00Z' }]);
    assert.deepEqual(fl, [{ t: Date.UTC(2026, 8, 17, 12, 16), cls: 'B3.2', begin: Date.UTC(2026, 8, 17, 12, 8), end: Date.UTC(2026, 8, 17, 12, 24) }]);
  });
  test('URL table and loaders exist', () => {
    assert.equal(NOAA, 'https://services.swpc.noaa.gov');
    assert.equal(Object.keys(URLS).length, 23);
    assert.ok(Object.values(URLS).every(u => u.startsWith(NOAA + '/')));
    assert.equal(URLS.propagated1h, `${NOAA}/products/geospace/propagated-solar-wind-1-hour.json`);
    assert.deepEqual(Object.keys(load).sort(), ['geospaceKp', 'hemiPower', 'json', 'kp1m', 'kp3h', 'kpForecast', 'ovationText', 'propagated', 'rtsw', 'scales', 'summary', 'text']);
  });
});

describe('fetch utilities and proxied helpers', () => {
  test('noaaTime accepts NOAA stamps with and without a zone', () => {
    const expected = Date.UTC(2026, 8, 17, 14, 5);
    assert.equal(noaaTime('2026-09-17T14:05:00'), expected);
    assert.equal(noaaTime('2026-09-17T14:05:00Z'), expected);
    assert.equal(noaaTime('2026-09-17 14:05:00'), expected);
    assert.equal(noaaTime('2026-09-17T14:05:00+00:00'), expected);
    assert.ok(Number.isNaN(noaaTime(''))); assert.ok(Number.isNaN(noaaTime(null)));
  });
  test('minutesAgo and freshness levels', () => {
    assert.equal(minutesAgo(1000, 61000), 1); assert.ok(Number.isNaN(minutesAgo(NaN)));
    assert.deepEqual(freshness(0, 5, 5 * 60e3), { age: 5, level: 'fresh' });
    assert.deepEqual(freshness(0, 5, 10 * 60e3), { age: 10, level: 'fresh' });
    assert.deepEqual(freshness(0, 5, 11 * 60e3), { age: 11, level: 'aging' });
    assert.deepEqual(freshness(0, 5, 30 * 60e3), { age: 30, level: 'aging' });
    assert.deepEqual(freshness(0, 5, 31 * 60e3), { age: 31, level: 'stale' });
    assert.equal(freshness(NaN, 5, 0).level, 'missing');
  });
  test('ProxyClient availability and URL building', () => {
    const none = new ProxyClient(null);
    assert.equal(none.available, false); assert.equal(none.base, null);
    const some = new ProxyClient('http://x/');
    assert.equal(some.available, true); assert.equal(some.base, 'http://x'); assert.equal(some.url('/api/health'), 'http://x/api/health');
  });
  test('stripHtml', () => {
    assert.equal(stripHtml('<p>Hello <b>world</b>&amp; more</p><p>Line<br/>two&nbsp;x</p>\n\n\n\n<div>end</div>'), 'Hello world& more\nLine\ntwo x\n\nend');
    assert.equal(stripHtml(''), '');
  });
});
