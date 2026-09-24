// DOM panels: verdict, tiles, freshness, night cards, CME cards, alerts, agreement, discussion, tables, method.
import { el, clear, fmt } from './format.mjs';

export function renderVerdict(fc, obs, mag, extra = {}) {
  const badge = document.getElementById('verdict-badge'), head = document.getElementById('verdict-headline'), det = document.getElementById('verdict-detail');
  if (!fc || !fc.ok) { badge.className = 'verdict-badge error'; badge.textContent = 'no data'; head.textContent = 'Could not compute a forecast'; det.textContent = fc?.reason || 'Waiting for the solar wind feed.'; return; }
  const tone = fc.verdict.tone; badge.className = `verdict-badge ${tone}`;
  badge.textContent = { good: 'go outside', maybe: 'worth a look', low: 'unlikely', none: 'quiet' }[tone] || tone;
  head.textContent = fc.verdict.headline; det.textContent = fc.verdict.detail;
  const facts = clear(document.getElementById('site-facts'));
  const rows = [
    ['Magnetic latitude', `${obs.mlat.toFixed(1)}° ${obs.method === 'dipole' ? '(dipole approx.)' : ''}`],
    ['Magnetic local time', `${fc.mltNow.toFixed(1)} h`],
    ['Kp now (modeled)', fmt.num(fc.current.kpNow, 1)],
    ['Bz / speed at Earth', `${fmt.num(fc.current.bz, 1)} nT / ${fmt.int(fc.current.speed)} km/s`],
    ['Solar wind measured until', `${fmt.hm(fc.tLast)} UTC (+${fmt.int(fc.leadMin)} min)`],
    ['Needs for horizon / overhead', `Kp ${fmt.num(extra.thresholds?.horizon, 1)} / ${fmt.num(extra.thresholds?.overhead, 1)}`],
  ];
  if (Number.isFinite(extra.hp30)) rows.splice(3, 0, ['Hp30 observed (GFZ)', fmt.num(extra.hp30, 2)]);
  if (Number.isFinite(extra.kpObs)) rows.splice(3, 0, ['Kp estimated (NOAA)', fmt.num(extra.kpObs, 2)]);
  for (const [k, v] of rows) facts.append(el('div', {}, [el('dt', { text: k }), el('dd', { text: v })]));
}

export function renderTiles(fc) {
  const box = clear(document.getElementById('tiles'));
  if (!fc || !fc.ok) return;
  for (const h of [10, 30, 60, 90, 120]) {
    const r = fc.horizons.find(x => x.h === h); if (!r) continue;
    const cls = r.pVisible >= 0.5 ? 'overhead' : r.pVisible >= 0.2 ? 'horizon' : 'none';
    box.append(el('div', { class: `tile ${cls}`, role: 'listitem' }, [
      el('div', { class: 'tile-h', text: `+${h} min · ${fmt.hm(r.t)}Z` }),
      el('div', { class: 'tile-value', text: fmt.pct(r.pVisible) }),
      el('div', { class: 'tile-sub', text: `${r.leadCovered ? 'measured' : 'extrapolated'} · Kp ${fmt.num(r.kp.median, 1)} · edge ${fmt.signed(r.margin, 0)}°` }),
    ]));
  }
}

export function renderFreshness(items) {
  const ul = clear(document.getElementById('freshness'));
  for (const it of items) {
    ul.append(el('li', { class: it.level, title: it.title || '' }, [it.label, ' ', el('span', { class: 'age', text: fmt.age(it.ageMin) })]));
  }
}

export function renderNights(cards, extras) {
  const box = clear(document.getElementById('nights'));
  if (!cards || !cards.length) { box.append(el('p', { class: 'empty', text: 'No Kp forecast available.' })); return; }
  cards.forEach((c, i) => {
    const ph = c.estimates.horizon?.probability, po = c.estimates.overhead?.probability;
    const tone = ph >= 0.5 ? 'good' : ph >= 0.2 ? 'maybe' : 'low';
    const label = i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow night' : fmt.dayLocal(c.evening);
    const chips = [];
    for (const w of extras.watches || []) { const day = w.byDay?.find(d => sameDay(d.label, c.evening) || sameDay(d.label, c.evening + 86400e3)); if (day && day.level > 0) chips.push(el('span', { class: 'chip watch', text: `NOAA watch G${day.level}` })); }
    for (const cme of extras.cmes || []) if (cme.arrival >= c.start - 7 * 3600e3 && cme.arrival <= c.end + 7 * 3600e3) chips.push(el('span', { class: 'chip cme', text: `CME ${fmt.hm(cme.arrival)}Z ±7 h${cme.glancing ? ' glancing' : ''}` }));
    box.append(el('div', { class: `night ${tone}`, role: 'listitem' }, [
      el('div', { class: 'night-h', text: label }),
      el('div', { class: 'night-d', text: `${fmt.dayLocal(c.evening)} evening → morning` }),
      el('div', { class: 'night-p', text: fmt.pct(ph) }),
      el('div', { class: 'night-row' }, [el('span', { text: 'low in the north' }), el('b', { text: fmt.pct(ph) })]),
      el('div', { class: 'night-row' }, [el('span', { text: 'overhead' }), el('b', { text: fmt.pct(po) })]),
      el('div', { class: 'night-row' }, [el('span', { text: 'max forecast Kp' }), el('b', { text: fmt.num(c.kpMax, 2) })]),
      chips.length ? el('div', { class: 'chips' }, chips) : null,
    ]));
  });
}
function sameDay(label, t) { const d = new Date(t); const m = label.match(/(\w{3}) (\d{1,2})/); if (!m) return false; return d.getUTCDate() === +m[2] && d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }) === m[1]; }

export function renderCmes(cmes, now) {
  const box = clear(document.getElementById('cmes'));
  box.append(el('h3', { text: 'Coronal mass ejections heading this way (NASA DONKI WSA-Enlil runs)' }));
  if (!cmes || !cmes.length) { box.append(el('p', { class: 'empty', text: 'No Earth-directed CME arrival predicted in the next five days.' })); return; }
  for (const c of cmes) {
    const k = c.kp; const range = Number.isFinite(k?.k90) ? `Kp ${k.k90}–${k.k180} depending on field orientation` : 'Kp range not given';
    box.append(el('div', { class: 'cme' }, [
      el('h3', { text: `Arrival ${fmt.dateUtc(c.arrival)} ± 7 h · ${c.glancing ? 'glancing blow' : 'direct hit'}${c.minor ? ', minor' : ''}` }),
      el('div', { class: 'meta', text: `launched ${fmt.dateUtc(c.start)} · ${fmt.int(c.speed)} km/s · half-angle ${fmt.int(c.halfAngle)}° · run ${fmt.dateUtc(c.modelCompleted)}` }),
      el('p', { text: `${range}. ${c.arrival < now ? 'Arrival window is open now.' : `In ${((c.arrival - now) / 3600e3).toFixed(0)} h.`} ${c.note ? c.note.slice(0, 220) : ''}` }),
    ]));
  }
}

export function renderAlerts(msgs) {
  const box = clear(document.getElementById('alerts'));
  box.append(el('h3', { text: 'NOAA geomagnetic watches, warnings and alerts' }));
  if (!msgs || !msgs.length) { box.append(el('p', { class: 'empty', text: 'None active.' })); return; }
  for (const a of msgs.slice(0, 6)) {
    const first = a.message.split('\n').find(l => /^(WATCH|WARNING|ALERT|EXTENDED|CONTINUED|SUMMARY)/.test(l)) || a.code;
    box.append(el('div', { class: `alert ${a.kind}` }, [el('h3', { text: first }), el('div', { class: 'meta', text: `${a.code} · issued ${fmt.dateUtc(a.issued)}${a.validUntil ? ` · valid until ${fmt.dateUtc(a.validUntil)}` : ''}` })]));
  }
}

export function renderAgreement(items) {
  const box = clear(document.getElementById('agreement'));
  box.append(el('h3', { text: 'What the forecast centres say' }));
  for (const it of items) {
    if (!it.text) continue;
    box.append(el('div', { class: 'agree' }, [el('h3', { text: it.title }), el('div', { class: 'meta', text: it.meta || '' }), el('p', { text: it.text })]));
  }
}

export function renderDiscussion(disc, threeDay) {
  const box = clear(document.getElementById('discussion'));
  box.append(el('h3', { text: 'NOAA forecaster discussion' }));
  if (threeDay?.rationale) box.append(el('p', { text: `Kp rationale: ${threeDay.rationale}` }));
  if (disc?.sections?.solarWind) box.append(el('p', { text: `Solar wind: ${disc.sections.solarWind.forecast}` }));
  if (disc?.sections?.geospace) box.append(el('p', { text: `Geospace: ${disc.sections.geospace.forecast}` }));
  if (disc?.issued) box.append(el('div', { class: 'meta', text: `issued ${fmt.dateUtc(disc.issued)}` }));
}

export function renderHorizonTable(fc) {
  const t = clear(document.getElementById('horizon-table'));
  if (!fc || !fc.ok) return;
  const th = ['Horizon', 'Time UTC', 'MLT', 'Source', 'Coupling', 'Kp median', 'Kp 10–90%', 'Edge °', 'Margin °', 'P(edge in view)', 'Phase factor', 'P(onset)', 'P(onset, your sector)', 'P(visible)'];
  t.append(el('thead', {}, el('tr', {}, th.map((h, i) => el('th', { class: i >= 4 ? 'num' : '', text: h })))));
  const tb = el('tbody');
  for (const r of fc.horizons) tb.append(el('tr', {}, [
    el('td', { text: `+${r.h} min` }), el('td', { text: fmt.hm(r.t) }), el('td', { class: 'num', text: fmt.num(r.mlt, 1) }), el('td', { text: r.leadCovered ? 'measured at L1' : 'extrapolated' }),
    el('td', { class: 'num', text: fmt.int(r.coupling.median) }), el('td', { class: 'num', text: fmt.num(r.kp.median, 2) }), el('td', { class: 'num', text: `${fmt.num(r.kp.p10, 1)}–${fmt.num(r.kp.p90, 1)}` }),
    el('td', { class: 'num', text: fmt.num(r.boundary.median, 1) }), el('td', { class: 'num', text: fmt.signed(r.margin, 1) }), el('td', { class: 'num', text: fmt.pct(r.pHorizon) }),
    el('td', { class: 'num', text: fmt.num(r.phaseFactor, 2) }), el('td', { class: 'num', text: fmt.pct(r.pOnset) }), el('td', { class: 'num', text: fmt.pct(r.pOnsetSector) }), el('td', { class: 'num', text: fmt.pct(r.pVisible) }),
  ]));
  t.append(tb);
}

export function renderLegend(id, items) {
  const box = clear(document.getElementById(id));
  for (const it of items) box.append(el('span', { class: it.kind || '', style: `--c:${it.color}`, text: it.label }));
}

export function renderMethod() {
  const box = clear(document.getElementById('method'));
  const blocks = [
    ['Next two hours', 'NOAA time-shifts the solar wind measured at L1 (SOLAR-1, with IMAP and ACE as backups) to Earth; that gives 30 to 90 minutes of measured lead. The Newell coupling function is averaged over four hours with OVATION Prime\'s 0.65-per-hour weights and mapped to Kp with the Newell 2008 regression, blended with NOAA\'s Geospace model and GFZ\'s Hp30 forecast when available. Beyond the measured lead, an analog ensemble of the last week\'s solar wind widens the band.'],
    ['Where the oval is', 'The equatorward edge of the aurora at your magnetic local time comes from NOAA\'s OVATION Prime grid (1 erg cm⁻² s⁻¹ contour) for the next hour and from the Starkov statistical oval driven by forecast Kp afterwards. Citizen-science validation shows aurora is seen up to about 8° equatorward of that edge, so that allowance defines "visible low in the north".'],
    ['Substorms', 'The twelve Finnish IMAGE magnetometers (58 to 70°N) are combined into the IL and IU electrojet indicators the way FMI does it: quiet baselines from the calmest three-hour window of the day, IL the lowest and IU the highest deviation across the chain. Onsets are detected on IL with the Newell & Gjerloev (2011) SuperMAG criterion (drops of 15, 30 and 45 nT in the first three minutes, then at least 100 nT below the onset level for half an hour; provisional after three minutes, confirmed after thirty). The westward electrojet is located from the X profile and the sign change of Z across the chain. A minimal substorm model (energy loading at the Akasofu rate, release about every 2.7 h under steady driving) gives the chance of the next onset; the chance that it happens in your sky follows the IMAGE FUV onset climatology (median 23 MLT, latitude 73° − 5.2√Em from the merging electric field) and the average reach of the expanding bulge (about 5° poleward within the hour, roughly 1.5 h of local time either side). FMI\'s own aurora indicator, the hourly maximum of the minute-to-minute change of the horizontal field, is shown against the station thresholds FMI published (85 % of exceedances came with aurora at Sodankylä).'],
    ['Next three nights', 'NOAA\'s 3-hourly Kp forecast and its daily probabilities of active, minor, moderate and strong storms, GFZ\'s 72-hour ensemble, NASA DONKI CME arrival predictions (±7 h, Kp range by field orientation) and WSA-Enlil\'s predicted solar wind speed at Earth. The night probabilities average these estimates for the Kp your latitude needs.'],
    ['Limits', 'The magnetic field orientation inside a CME is unknown until it reaches L1, so multi-day forecasts stay probabilistic. Clouds and daylight are deliberately ignored here.'],
  ];
  for (const [h, p] of blocks) { box.append(el('h3', { text: h })); box.append(el('p', { text: p })); }
}

/**
 * Substorm section: headline, tiles, explanation for the observer's latitude regime, chain notes.
 * d: {outlook, sub, obs, placeName, now, chainStations, stationSource, tgo:{name, days}|null, proxyAvailable}
 */
export function renderSubstormPanel(d) {
  const { outlook, sub, obs } = d;
  const badge = document.getElementById('substorm-badge'), head = document.getElementById('substorm-headline'), det = document.getElementById('substorm-detail');
  const tiles = clear(document.getElementById('substorm-tiles'));
  const why = document.getElementById('substorm-why'), note = document.getElementById('substorm-note');
  const regime = outlook?.regime || (obs ? (obs.mlat >= 63 ? 'auroral' : obs.mlat >= 58 ? 'subauroral' : 'midlatitude') : 'unknown');
  why.textContent = {
    auroral: `At ${obs.mlat.toFixed(1)}° magnetic latitude the oval is over you on most nights (Tromsø sees some aurora on about three clear nights in four once Kp reaches 2, and more Kp does not raise that). What decides between a faint arc and a display is the substorm cycle: a breakup near ${fmt.deg(outlook?.onsetMlat)} around magnetic midnight, then a bulge expanding poleward by about 5° within the hour. Strong driving moves the onset arc south of you, so the best nights here are Kp 2 to 4 with repeated substorms; OVATION cannot show any of this, the magnetometers can.`,
    subauroral: `At ${obs.mlat.toFixed(1)}° magnetic latitude the quiet oval sits a few degrees north of you; substorms pull its equatorward edge 1–3° closer and light the northern sky. Both the oval position above and the substorm phase here matter.`,
    midlatitude: `At ${obs.mlat.toFixed(1)}° magnetic latitude a substorm only matters once a storm has already expanded the oval to about ${(obs.mlat + 8).toFixed(0)}°: the panel above tracks that. This section shows what the Finnish chain sees, which is where the action is on ordinary nights.`,
  }[regime] || '';
  if (!outlook || !sub) {
    badge.className = 'verdict-badge none'; badge.textContent = 'no data'; head.textContent = 'Waiting for magnetometer data'; det.textContent = d.proxyAvailable ? 'The Finnish IMAGE chain has not answered yet.' : 'Magnetometer feeds need the Worker proxy (or the INTERMAGNET fallback).';
    note.textContent = ''; return;
  }
  badge.className = `verdict-badge ${outlook.tone}`;
  badge.textContent = { good: 'active', maybe: 'watch', low: 'quiet', info: 'context' }[outlook.tone] || outlook.tone;
  head.textContent = outlook.headline; det.textContent = outlook.detail;
  const r30 = outlook.horizons.find(r => r.h === 30), r60 = outlook.horizons.find(r => r.h === 60), r120 = outlook.horizons.find(r => r.h === 120);
  const centre = outlook.centre;
  const items = [
    { h: 'Phase now', v: sub.phase, s: sub.lastOnset ? `onset ${fmt.hm(sub.lastOnset.t)}Z (${fmt.int(sub.minutesSinceOnset)} min ago${sub.lastOnset.status === 'provisional' ? ', provisional' : ''})` : 'no onset in the last day', cls: sub.phase === 'expansion' ? 'overhead' : sub.phase === 'recovery' || sub.phase === 'growth' ? 'horizon' : 'none' },
    { h: 'Electrojet now', v: Number.isFinite(sub.ilNow) ? `${fmt.int(sub.ilNow)} nT` : '–', s: `IL at ${outlook.activity.station || '–'} · ${sub.ilClass}${Number.isFinite(outlook.activity.localDx) ? ` · ${fmt.int(outlook.activity.localDx)} nT at your latitude` : ''}`, cls: sub.ilNow <= -300 ? 'overhead' : sub.ilNow <= -170 ? 'horizon' : 'none' },
    { h: 'Field change (FMI indicator)', v: Number.isFinite(outlook.activity.rate) ? `${fmt.num(outlook.activity.rate, 2)} nT/s` : '–', s: Number.isFinite(outlook.activity.rateThreshold) ? `at ${outlook.activity.rateStation} · FMI aurora threshold ${fmt.num(outlook.activity.rateThreshold, 2)} nT/s · max of the last hour` : 'no station', cls: outlook.activity.rate >= outlook.activity.rateThreshold ? 'overhead' : outlook.activity.rate >= 0.5 * outlook.activity.rateThreshold ? 'horizon' : 'none' },
    { h: 'Where the current is', v: centre ? (centre.beyond ? (centre.beyond === 'poleward' ? 'north of chain' : 'south of chain') : fmt.deg(centre.mlat)) : 'no electrojet', s: centre && !centre.beyond ? `${Math.abs(obs.mlat - centre.mlat).toFixed(1)}° ${centre.mlat < obs.mlat ? 'south' : 'north'} of you · in your sky ${fmt.pct(outlook.currentReach)}` : `breakup arc expected near ${fmt.deg(outlook.onsetMlat)}${outlook.oval && outlook.oval.position !== 'none' ? ` · oval ${outlook.oval.position === 'inside' ? 'overhead' : outlook.oval.position + ' by ' + fmt.deg(outlook.oval.offset)}` : ''}`, cls: centre && outlook.currentReach >= 0.5 ? 'overhead' : centre ? 'horizon' : 'none' },
    { h: 'New onset in 30 / 60 min', v: `${fmt.pct(r30?.pOnset)} / ${fmt.pct(r60?.pOnset)}`, s: `in your sky ${fmt.pct(r30?.pOnsetLocal)} / ${fmt.pct(r60?.pOnsetLocal)} · 2 h ${fmt.pct(r120?.pOnsetLocal)}`, cls: r60?.pOnsetLocal >= 0.4 ? 'overhead' : r60?.pOnsetLocal >= 0.15 ? 'horizon' : 'none' },
    { h: 'Tail energy store', v: Number.isFinite(sub.loadFraction) ? fmt.pct(Math.min(sub.loadFraction, 1.5)) : '–', s: `of the usual release level · Bz south ${sub.minutesSouthward} min · ${fmt.num(sub.ekl, 1)} mV/m`, cls: sub.loadFraction >= 0.8 ? 'overhead' : sub.loadFraction >= 0.4 ? 'horizon' : 'none' },
    { h: 'Prime onset window', v: outlook.prime ? `${fmt.hm(outlook.prime.start)}–${fmt.hm(outlook.prime.end)}Z` : '–', s: outlook.prime ? `${outlook.prime.active ? 'now' : outlook.prime.start > d.now ? `in ${((outlook.prime.start - d.now) / 3600e3).toFixed(1)} h` : 'passed'} · local ${fmt.hmLocal(outlook.prime.start)}–${fmt.hmLocal(outlook.prime.end)} · you are at ${outlook.mltNow.toFixed(1)} MLT` : '', cls: outlook.prime?.active ? 'overhead' : 'none' },
    { h: 'Next substorm size', v: outlook.intensity.class !== 'unknown' ? outlook.intensity.class : '–', s: Number.isFinite(outlook.intensity.il) ? `about ${fmt.int(Math.abs(outlook.intensity.il))} nT at the current driving` : 'needs solar wind data', cls: outlook.intensity.class === 'strong' || outlook.intensity.class === 'intense' ? 'overhead' : outlook.intensity.class === 'moderate' ? 'horizon' : 'none' },
  ];
  for (const it of items) tiles.append(el('div', { class: `tile ${it.cls}`, role: 'listitem' }, [el('div', { class: 'tile-h', text: it.h }), el('div', { class: 'tile-value', text: it.v }), el('div', { class: 'tile-sub', text: it.s })]));
  const parts = [];
  if (sub.method === 'chain') parts.push(`IL/IU from ${sub.chain.stations} ${d.stationSource || 'FMI IMAGE'} stations, quiet baseline ${Number.isFinite(sub.chain.baseline.t0) ? `${fmt.hm(sub.chain.baseline.t0)}–${fmt.hm(sub.chain.baseline.t1)}Z` : 'per station'}; onsets by the Newell & Gjerloev criterion (15/30/45 nT in 3 min, 100 nT sustained).`);
  else parts.push(`Single-station bay detection (${sub.stations.map(s => s.station).join(', ')}): fewer than three stations reporting.`);
  parts.push(`The chain sits ${Math.abs(outlook.chainOffset).toFixed(1)} h of magnetic local time ${outlook.chainOffset < 0 ? 'east' : 'west'} of you.`);
  if (d.tgo && d.tgo.days.length) { const today = d.tgo.days[d.tgo.days.length - 1]; parts.push(`Local K-index at ${d.tgo.name} (Tromsø Geophysical Observatory) today: ${today.k.map(k => (k === null ? '·' : k)).join(' ')}.`); }
  note.textContent = parts.join(' ');
}
