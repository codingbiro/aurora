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
  const th = ['Horizon', 'Time UTC', 'MLT', 'Source', 'Coupling', 'Kp median', 'Kp 10–90%', 'Edge °', 'Margin °', 'P(edge in view)', 'Phase factor', 'P(onset)', 'P(visible)'];
  t.append(el('thead', {}, el('tr', {}, th.map((h, i) => el('th', { class: i >= 4 ? 'num' : '', text: h })))));
  const tb = el('tbody');
  for (const r of fc.horizons) tb.append(el('tr', {}, [
    el('td', { text: `+${r.h} min` }), el('td', { text: fmt.hm(r.t) }), el('td', { class: 'num', text: fmt.num(r.mlt, 1) }), el('td', { text: r.leadCovered ? 'measured at L1' : 'extrapolated' }),
    el('td', { class: 'num', text: fmt.int(r.coupling.median) }), el('td', { class: 'num', text: fmt.num(r.kp.median, 2) }), el('td', { class: 'num', text: `${fmt.num(r.kp.p10, 1)}–${fmt.num(r.kp.p90, 1)}` }),
    el('td', { class: 'num', text: fmt.num(r.boundary.median, 1) }), el('td', { class: 'num', text: fmt.signed(r.margin, 1) }), el('td', { class: 'num', text: fmt.pct(r.pHorizon) }),
    el('td', { class: 'num', text: fmt.num(r.phaseFactor, 2) }), el('td', { class: 'num', text: fmt.pct(r.pOnset) }), el('td', { class: 'num', text: fmt.pct(r.pVisible) }),
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
    ['Substorms', 'Onsets are detected as sharp drops in the northward component at Finnish IMAGE magnetometers. A minimal substorm model (energy loading at the Akasofu rate, release about every 2.7 h under steady driving) gives the chance of the next onset; bright, moving aurora is far more likely during an expansion phase than during quiet loading.'],
    ['Next three nights', 'NOAA\'s 3-hourly Kp forecast and its daily probabilities of active, minor, moderate and strong storms, GFZ\'s 72-hour ensemble, NASA DONKI CME arrival predictions (±7 h, Kp range by field orientation) and WSA-Enlil\'s predicted solar wind speed at Earth. The night probabilities average these estimates for the Kp your latitude needs.'],
    ['Limits', 'The magnetic field orientation inside a CME is unknown until it reaches L1, so multi-day forecasts stay probabilistic. Clouds and daylight are deliberately ignored here.'],
  ];
  for (const [h, p] of blocks) { box.append(el('h3', { text: h })); box.append(el('p', { text: p })); }
}
