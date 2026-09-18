import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveObservers, shouldAlert } from '../worker/src/scheduled.mjs';

test('resolveObservers falls back to the single lat/lon pair', () => {
  const o = resolveObservers({ OBSERVER_LAT: '55.676', OBSERVER_LON: '12.568', NTFY_TOPIC: 't1' });
  assert.equal(o.length, 1); assert.equal(o[0].lat, 55.676); assert.equal(o[0].topic, 't1'); assert.equal(o[0].alertOn, 'horizon'); assert.equal(o[0].minKpLead, 0);
});
test('resolveObservers parses a JSON list (string or object) with per-place options', () => {
  const list = [{ name: 'Copenhagen', lat: 55.676, lon: 12.568 }, { name: 'Tromsø', lat: 69.649, lon: 18.956, alertOn: 'overhead', minKpLead: 2, topic: 'north' }];
  for (const v of [JSON.stringify(list), list]) {
    const o = resolveObservers({ OBSERVERS: v, NTFY_TOPIC: 'default' });
    assert.equal(o.length, 2); assert.equal(o[0].topic, 'default'); assert.equal(o[1].topic, 'north'); assert.equal(o[1].alertOn, 'overhead'); assert.equal(o[1].minKpLead, 2);
  }
  assert.equal(resolveObservers({ OBSERVERS: 'not json', OBSERVER_LAT: '1', OBSERVER_LON: '2' })[0].lat, 1);
});
test('shouldAlert respects topic, visibility class and minimum Kp', () => {
  const cph = { topic: 't', alertOn: 'horizon', minKpLead: 0 }, tro = { topic: 't', alertOn: 'overhead', minKpLead: 2 };
  assert.equal(shouldAlert(cph, { visible: 'horizon', kpLead: 4 }), true);
  assert.equal(shouldAlert(cph, { visible: 'none', kpLead: 4 }), false);
  assert.equal(shouldAlert({ ...cph, topic: '' }, { visible: 'overhead', kpLead: 4 }), false);
  assert.equal(shouldAlert(tro, { visible: 'horizon', kpLead: 4 }), false);
  assert.equal(shouldAlert(tro, { visible: 'overhead', kpLead: 1.5 }), false);
  assert.equal(shouldAlert(tro, { visible: 'overhead', kpLead: 2.5 }), true);
});

import { headerValue } from '../worker/src/scheduled.mjs';
test('headerValue keeps ASCII and RFC 2047-encodes anything else', () => {
  assert.equal(headerValue('Aurora alert: Copenhagen'), 'Aurora alert: Copenhagen');
  const enc = headerValue('Aurora alert: Tromsø');
  assert.match(enc, /^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
  assert.equal(Buffer.from(enc.slice(10, -2), 'base64').toString('utf8'), 'Aurora alert: Tromsø');
});
