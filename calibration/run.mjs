// Calibration job: fits Hp30 against OVATION-style integrated solar wind driving using
// GFZ Hp30 history and OMNI 5-minute data, derives analog-extrapolation error tables,
// writes web/data/coefficients.json and web/data/calibration_report.json, then runs the
// CME scoreboard statistics. Usage: node calibration/run.mjs [--years N] [--offline] [--no-scoreboard]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseOmniLine, parseHp30Line, buildTable, ols, robustOls, predict, skill, lagQuantiles, reliability, histogram, round, MIN, blendCalibration } from './lib.mjs';
import { NEWELL2008, hp30FromDriving } from '../web/src/model/activity.mjs';
import { runScoreboard } from './scoreboard.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, 'cache');
const dataDir = join(here, '..', 'web', 'data');
export const HP30_URL = 'https://kp.gfz.de/app/files/Hp30_ap30_complete_series.txt';
export const omniUrl = (y) => `https://spdf.gsfc.nasa.gov/pub/data/omni/high_res_omni/omni_5min${y}.asc`;

function args() {
  const a = process.argv.slice(2);
  const years = a.includes('--years') ? +a[a.indexOf('--years') + 1] : 2;
  return { years: Number.isFinite(years) && years > 0 ? years : 2, offline: a.includes('--offline'), scoreboard: !a.includes('--no-scoreboard') };
}

async function download(url, file, { offline, maxAgeH = 20 }) {
  if (existsSync(file) && (offline || (Date.now() - statSync(file).mtimeMs) < maxAgeH * 3600e3) && statSync(file).size > 1000) return true;
  if (offline) { console.error(`offline and no cache for ${url}`); return existsSync(file); }
  console.log(`downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) { console.error(`  failed: HTTP ${res.status}`); return existsSync(file); }
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function parseFile(file, parseLine, keep) {
  const out = [];
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) { const r = parseLine(line); if (r && keep(r)) out.push(r); }
  return out;
}

export async function calibrate({ years = 2, offline = false } = {}) {
  await mkdir(cacheDir, { recursive: true }); await mkdir(dataDir, { recursive: true });
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate());
  const yearList = []; for (let y = new Date(start).getUTCFullYear(); y <= now.getUTCFullYear(); y++) yearList.push(y);

  const hpFile = join(cacheDir, 'Hp30_ap30_complete_series.txt');
  const okHp = await download(HP30_URL, hpFile, { offline });
  const omni = [];
  for (const y of yearList) {
    const f = join(cacheDir, `omni_5min${y}.asc`);
    const ok = await download(omniUrl(y), f, { offline, maxAgeH: y === now.getUTCFullYear() ? 20 : 24 * 30 });
    if (ok) omni.push(...await parseFile(f, parseOmniLine, r => r.t >= start - 5 * 3600e3));
  }
  omni.sort((a, b) => a.t - b.t);
  const hp = okHp ? await parseFile(hpFile, parseHp30Line, r => r.tStart >= start) : [];
  console.log(`OMNI 5-min samples: ${omni.length} (${yearList.join(', ')}); Hp30 intervals: ${hp.length}; window from ${new Date(start).toISOString().slice(0, 10)}`);
  if (omni.length) console.log(`OMNI coverage ${new Date(omni[0].t).toISOString()} -> ${new Date(omni[omni.length - 1].t).toISOString()}`);

  const note = [];
  let coefficients = { generated: now.toISOString(), source: { hp30: HP30_URL, omni: yearList.map(omniUrl), years, windowStart: new Date(start).toISOString() }, hp30: null, hp30_storm: null, extrapolation: null, skill: null };
  let report = { generated: now.toISOString() };

  const table = omni.length && hp.length ? buildTable(omni, hp) : [];
  console.log(`regression rows (Hp30 intervals with >= 3 h of solar wind coverage): ${table.length}`);
  if (table.length < 500) {
    note.push(`fit skipped: only ${table.length} usable rows (need >= 500)`);
  } else {
    const split = Math.floor(table.length * 0.8);
    const train = table.slice(0, split), test = table.slice(split);
    const fitTrain = robustOls(train);
    const obs = test.map(r => r.hp30);
    const ours = skill(test.map(r => predict(fitTrain.coef, r)), obs);
    const newell = skill(test.map(r => predict(NEWELL2008, r)), obs);
    const persistence = skill(test.map(r => r.prevHp30), obs);
    const stormTest = test.filter(r => r.hp30 >= 3), stormSkillOurs = skill(stormTest.map(r => predict(fitTrain.coef, r)), stormTest.map(r => r.hp30));
    // The storm branch is trained on the rows where the general fit predicts more than STORM_FROM, which is where the
    // runtime blends it in (hp30FromDriving). Selecting on the observed Hp30 >= 3 chose rows by the outcome: regression
    // to the mean then looked like a storm bias, and the branch pushed moderate predictions up by 0.1-0.2.
    // It ships only if the runtime blend beats the general fit on the test rows it touches.
    // The threshold is chosen on a validation slice inside the training years (the last fifth), so the test period
    // stays untouched: the candidate whose runtime blend lowers the validation RMSE most, or none.
    const cut = Math.floor(train.length * 0.8), fitA = robustOls(train.slice(0, cut)), val = train.slice(cut);
    const rmseOn = (rows, general, storm, from) => skill(rows.map(r => hp30FromDriving(r.coupling, r.viscous, general, storm && { ...storm, from })), rows.map(r => r.hp30)).rmse;
    let STORM_FROM = null, bestVal = rmseOn(val, fitA.coef, null);
    const valScores = { none: round(bestVal, 4) };
    for (const from of [2.5, 3, 3.5, 4]) {
      const rowsA = train.slice(0, cut).filter(r => predict(fitA.coef, r) > from);
      if (rowsA.length < 100) continue;
      const e = rmseOn(val, fitA.coef, robustOls(rowsA).coef, from); valScores[from] = round(e, 4);
      if (e < bestVal - 1e-4) { bestVal = e; STORM_FROM = from; }
    }
    console.log(`  storm threshold on the validation slice (RMSE over all its rows): ${JSON.stringify(valScores)} -> ${STORM_FROM ?? 'none'}`);
    const stormRows = (rows, coef) => (STORM_FROM === null ? [] : rows.filter(r => predict(coef, r) > STORM_FROM));
    const stormTrainFit = stormRows(train, fitTrain.coef).length >= 100 ? robustOls(stormRows(train, fitTrain.coef)) : null;
    const touched = stormRows(test, fitTrain.coef);
    const runtime = (general, storm) => touched.map(r => hp30FromDriving(r.coupling, r.viscous, general, storm && { ...storm, from: STORM_FROM }));
    const generalOnly = skill(runtime(fitTrain.coef, null), touched.map(r => r.hp30));
    const blended = stormTrainFit ? skill(runtime(fitTrain.coef, stormTrainFit.coef), touched.map(r => r.hp30)) : null;
    const byBin = (pred) => [[STORM_FROM ?? 2.5, (STORM_FROM ?? 2.5) + 1], [(STORM_FROM ?? 2.5) + 1, (STORM_FROM ?? 2.5) + 2], [(STORM_FROM ?? 2.5) + 2, Infinity]].map(([a, b]) => { const idx = touched.map((r, i) => i).filter(i => { const g = predict(fitTrain.coef, touched[i]); return g >= a && g < b; }); const sk = skill(idx.map(i => pred[i]), idx.map(i => touched[i].hp30)); return { from: a, n: sk.n, bias: round(sk.bias, 3), rmse: round(sk.rmse, 3) }; });
    const stormHelps = !!blended && blended.rmse < generalOnly.rmse; // confirmed on the untouched test period
    const fitAll = robustOls(table); // shipped coefficients use all data; sigma is the honest test RMSE
    const stormFit = stormHelps && stormRows(table, fitAll.coef).length >= 100 ? robustOls(stormRows(table, fitAll.coef)) : null;
    const lags = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
    const extrap = lagQuantiles(omni, lags, 5 * MIN);
    coefficients.hp30 = { intercept: round(fitAll.coef.intercept, 5), sqrtCoupling: round(fitAll.coef.sqrtCoupling, 5), coupling: round(fitAll.coef.coupling, 6), viscous: round(fitAll.coef.viscous, 5), sigma: round(ours.rmse, 4), n: table.length,
      fittedOn: 'GFZ Hp30 (CC BY 4.0) vs OMNI 5-min at the bow shock nose, OVATION 4-hour weighting; Hp30 = a + d sqrt(coupling) + b coupling + c viscous, robust OLS on all rows; sigma = RMSE on the chronological 20% test split', droppedOutliers: fitAll.dropped };
    coefficients.hp30_storm = stormFit ? { intercept: round(stormFit.coef.intercept, 5), sqrtCoupling: round(stormFit.coef.sqrtCoupling, 5), coupling: round(stormFit.coef.coupling, 6), viscous: round(stormFit.coef.viscous, 5), n: stormRows(table, fitAll.coef).length,
      from: STORM_FROM, testRows: touched.length, testBiasGeneral: round(generalOnly.bias, 4), testRmseGeneral: round(generalOnly.rmse, 4), testBiasBlend: round(blended.bias, 4), testRmseBlend: round(blended.rmse, 4),
      note: `fit on the intervals where the general fit predicts more than ${STORM_FROM}, where the runtime blends it in over one Kp unit; test scores on those rows of the chronological 20% split` } : null;
    // persistence weight and total spread of the model/persistence blend, per lead
    coefficients.blend = { ...blendCalibration(omni, hp, fitAll.coef), note: 'weight = share of the last observed Hp30 in the blend (issue-time age about 15 min); sigma = RMSE of that blend on the Hp30 scale, used as the probability spread; driving measured for leads <= 45 min, frozen at issue time beyond' };
    coefficients.extrapolation = { members: 200, floor: 300, cadenceMin: 5, ...extrap };
    coefficients.skill = { test: { n: test.length, ours: fmt(ours), newell2008: fmt(newell), persistence: fmt(persistence), stormRows: stormTest.length, oursOnStorms: fmt(stormSkillOurs) },
      train: { n: train.length, coef: fitTrain.coef, dropped: fitTrain.dropped } };
    coefficients.source.nSamples = { omni: omni.length, hp30: hp.length, rows: table.length };
    const pred = test.map(r => predict(fitTrain.coef, r));
    report = { ...report, skill: coefficients.skill, reliability: reliability(pred, obs, [3, 4, 5], 0.5), residuals: histogram(pred.map((p, i) => p - obs[i]), 0.25, -4, 4),
      testWindow: { from: new Date(test[0].t).toISOString(), to: new Date(test[test.length - 1].t).toISOString() },
      hp30Distribution: { train: dist(train.map(r => r.hp30)), test: dist(obs) } };
    console.log('\nHp30 = a + d*sqrt(coupling4h) + b*coupling4h + c*viscous4h');
    console.log(`  shipped (all rows, robust): a=${coefficients.hp30.intercept} d=${coefficients.hp30.sqrtCoupling} b=${coefficients.hp30.coupling} c=${coefficients.hp30.viscous} (dropped ${fitAll.dropped} outliers)`);
    console.log(`  train fit: a=${round(fitTrain.coef.intercept, 5)} d=${round(fitTrain.coef.sqrtCoupling, 5)} b=${round(fitTrain.coef.coupling, 6)} c=${round(fitTrain.coef.viscous, 5)}`);
    console.log(`  blend by lead: ${coefficients.blend.leads.map((h, i) => `+${h}: w ${coefficients.blend.weight[i]} sigma ${coefficients.blend.sigma[i]} (model ${coefficients.blend.modelRmse[i]}, persistence ${coefficients.blend.persistenceRmse[i]}, n ${coefficients.blend.n[i]})`).join('; ')}`);
    console.log(`  test (${test.length} rows, ${report.testWindow.from.slice(0, 10)} .. ${report.testWindow.to.slice(0, 10)}):`);
    for (const [k, v] of Object.entries(coefficients.skill.test)) if (v && typeof v === 'object') console.log(`    ${k.padEnd(14)} rmse=${v.rmse} mae=${v.mae} bias=${v.bias} r=${v.r}`);
    console.log(`  storm branch on the ${touched.length} test rows predicted above ${STORM_FROM}: general alone rmse ${round(generalOnly.rmse, 3)} bias ${round(generalOnly.bias, 3)}${blended ? `; runtime blend rmse ${round(blended.rmse, 3)} bias ${round(blended.bias, 3)}` : ''} -> ${stormFit ? 'shipped' : 'not shipped'}`);
    console.log(`    by predicted value, general alone: ${JSON.stringify(byBin(runtime(fitTrain.coef, null)))}`);
    if (stormTrainFit) console.log(`    by predicted value, runtime blend: ${JSON.stringify(byBin(runtime(fitTrain.coef, stormTrainFit.coef)))}`);
    console.log(`  extrapolation p10/p50/p90 of log-ratio at 60 min: ${extrap.logRatioQuantiles.all.p10[5]} / ${extrap.logRatioQuantiles.all.p50[5]} / ${extrap.logRatioQuantiles.all.p90[5]}`);
  }
  if (note.length) { coefficients.note = note.join('; '); console.error(coefficients.note); }
  // no fit (no data, e.g. --offline on a fresh clone): the shipped coefficients stay as they are
  if (!coefficients.hp30) { console.error('no fit: web/data/coefficients.json left as it was'); process.exitCode = 1; return null; }
  await writeFile(join(dataDir, 'coefficients.json'), JSON.stringify(coefficients, null, 1));
  await writeFile(join(dataDir, 'calibration_report.json'), JSON.stringify(report, null, 1));
  console.log(`wrote ${join(dataDir, 'coefficients.json')} and calibration_report.json`);
  return coefficients;
}

const fmt = (s) => ({ n: s.n, rmse: round(s.rmse, 4), mae: round(s.mae, 4), bias: round(s.bias, 4), r: round(s.r, 4) });
function dist(v) { const s = [...v].sort((a, b) => a - b); const q = (p) => s[Math.floor(p * (s.length - 1))]; return { n: s.length, p50: q(0.5), p90: q(0.9), p99: q(0.99), max: s[s.length - 1], fracGe4: round(s.filter(x => x >= 4).length / s.length, 4), fracGe5: round(s.filter(x => x >= 5).length / s.length, 4) }; }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = args();
  const t0 = Date.now();
  calibrate(opts).then(async () => {
    if (opts.scoreboard) await runScoreboard({ offline: opts.offline });
    console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }).catch(err => { console.error(err); process.exit(1); });
}
