// Checks on web/index.html: the preload list covers the whole module graph (so the page loads in one round of
// requests), scripts run in the order the app needs, and every place in the picker is a valid, findable location.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MagneticCoordinates } from '../web/src/model/magcoords.mjs';
import { latitudeRegime } from '../web/src/model/substorm.mjs';

const WEB = fileURLToPath(new URL('../web/', import.meta.url));
const html = await readFile(join(WEB, 'index.html'), 'utf8');

async function moduleGraph(entry) {
  const seen = new Set(), queue = [entry];
  while (queue.length) {
    const file = queue.shift(); if (seen.has(file)) continue; seen.add(file);
    const src = await readFile(join(WEB, file), 'utf8');
    for (const m of src.matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)) if (m[1].startsWith('.')) queue.push(normalize(join(dirname(file), m[1])));
  }
  return seen;
}

describe('index.html', () => {
  test('every module reachable from src/app.mjs is modulepreloaded, and every preload exists', async () => {
    const graph = await moduleGraph('src/app.mjs');
    const preloads = new Set([...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(m => m[1]));
    assert.deepEqual([...graph].filter(f => !preloads.has(f)), [], 'modules missing a <link rel="modulepreload">');
    for (const p of preloads) await access(join(WEB, p));
    for (const m of html.matchAll(/<link rel="preload" href="([^"]+)" as="fetch" crossorigin>/g)) await access(join(WEB, m[1]));
  });

  test('classic scripts are deferred and come before the module, so config.js and d3 are in place when the app runs', () => {
    const scripts = [...html.matchAll(/<script ([^>]*)><\/script>/g)].map(m => m[1]);
    const classic = scripts.filter(a => !a.includes('type="module"')), mod = scripts.findIndex(a => a.includes('type="module"'));
    assert.deepEqual(classic, ['src="config.js" defer', 'src="vendor/d3.v7.min.js" defer', 'src="vendor/topojson-client.min.js" defer']);
    assert.equal(mod, scripts.length - 1);
  });

  test('the web font stylesheet does not block rendering or scripts', () => {
    assert.match(html, /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]+" media="print" onload="this\.media='all'">/);
  });
});

describe('places', async () => {
  const mag = new MagneticCoordinates(JSON.parse(await readFile(join(WEB, 'data/aacgm_europe_grid.json'), 'utf8')), JSON.parse(await readFile(join(WEB, 'data/mlt_reference.json'), 'utf8')));
  const options = [...html.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(m => ({ value: m[1], name: m[2] })).filter(o => o.value !== 'custom');

  test('every place is a valid coordinate pair inside the AACGM grid', () => {
    assert.ok(options.length >= 15);
    for (const o of options) {
      const [lat, lon] = o.value.split(',').map(Number);
      assert.ok(Math.abs(lat) <= 90 && Math.abs(lon) <= 180, o.name);
      assert.equal(mag.convert(lat, lon).method, 'aacgm', `${o.name} falls back to the dipole`);
    }
    assert.equal(new Set(options.map(o => o.value)).size, options.length, 'no duplicates');
  });

  test('Nordkapp: the North Cape plateau (71°10′21″N 25°47′04″E), in the auroral zone', () => {
    const o = options.find(x => x.name === 'Nordkapp');
    assert.ok(o, 'Nordkapp is in the picker');
    assert.equal(o.value, '71.172,25.784');
    const html1 = html.slice(html.indexOf('<optgroup label="Auroral zone">'));
    assert.ok(html1.indexOf('Nordkapp') < html1.indexOf('</optgroup>'), 'listed under the auroral zone');
    const c = mag.convert(71.172, 25.784);
    assert.ok(c.mlat > 67 && c.mlat < 69, `magnetic latitude ${c.mlat}`);
    assert.equal(latitudeRegime(c.mlat), 'auroral');
  });
});
