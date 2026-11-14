// Adaptive governor (Annex G 4.1, MASTER_SPEC 9.3 acceptance 7) with synthetic frame-time sequences.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGovernor, applyLevel, attachGovernor, MAX_LEVEL } from '../../src/render/governor.js';
import { createQuality, PRESETS } from '../../src/render/quality.js';
import { createBus } from '../../src/core/bus.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const feed = (g, ms, frames) => { let changes = 0; for (let i = 0; i < frames; i++) changes += g.sample(ms) !== 0 ? 1 : 0; return changes; };
const userHigh = () => ({ ...createQuality({ storage: mem() }).get().graphics, ...PRESETS.ultra.graphics, preset: 'ultra' });

test('steps down after 45 frames of p95 > 1.08 T, with a 90-frame cooldown', () => {
  const g = createGovernor({ targetFps: 60 });
  feed(g, 10, 120); // healthy window
  let first = -1;
  for (let i = 0; i < 200; i++) { if (g.sample(25) === -1) { first = i; break; } }
  // p95 of the 120-frame window exceeds 18 ms once 7 slow frames are in it (index 6), then 45 consecutive frames are needed
  assert.ok(first >= 45 && first <= 60, 'first step at ' + first);
  assert.equal(g.level, 1);
  assert.equal(feed(g, 25, 90), 0, 'no change during cooldown');
  let second = -1;
  for (let i = 0; i < 100; i++) if (g.sample(25) === -1) { second = i; break; }
  assert.equal(second, 44, 'next step 45 frames after the cooldown');
  assert.equal(g.level, 2);
});

test('restores with hysteresis: needs 300 frames of mean < 0.72 T; frames between 0.72 T and 1.08 T hold the level', () => {
  const g = createGovernor({ targetFps: 60 });
  while (g.level < 3) g.sample(30);
  feed(g, 14, 2000); // 14 ms: mean > 12 ms (0.72 T) and p95 < 18 ms: dead band, nothing changes
  assert.equal(g.level, 3);
  let at = -1;
  for (let i = 0; i < 2000; i++) if (g.sample(8) === 1) { at = i; break; }
  assert.ok(at >= 299 && at < 400, 'stepped up at ' + at);
  assert.equal(g.level, 2);
  feed(g, 8, 5000);
  assert.equal(g.level, 0, 'never above level 0');
});

test('ignores a single hitch; disabled when adaptive is false; target 30 fps', () => {
  const g = createGovernor({ targetFps: 60 });
  feed(g, 10, 300); g.sample(120); feed(g, 10, 300);
  assert.equal(g.level, 0);
  const off = createGovernor({ targetFps: 60, adaptive: false });
  feed(off, 40, 1000); assert.equal(off.level, 0);
  const g30 = createGovernor({ targetFps: 30 });
  feed(g30, 30, 1000); assert.equal(g30.level, 0, '30 ms is within a 33 ms target');
  feed(g30, 40, 200); assert.ok(g30.level >= 1);
});

test('ladder order (Annex G 4.1): each level adds exactly its step', () => {
  const u = userHigh();
  const L = (n) => applyLevel(u, n);
  assert.deepEqual(L(0).graphics, u);
  assert.equal(L(1).graphics.resolutionScale, 0.9); assert.equal(L(2).graphics.resolutionScale, 0.8); assert.equal(L(3).graphics.resolutionScale, 0.7);
  assert.equal(L(3).graphics.godRays, true);
  assert.equal(L(4).graphics.godRays, false); assert.equal(L(4).graphics.fogCards, 'low'); assert.equal(L(4).graphics.ao, 'high');
  assert.equal(L(5).graphics.ao, 'low'); assert.equal(L(5).graphics.reflections, 'planar');
  assert.equal(L(6).graphics.reflections, 'env'); assert.equal(L(6).graphics.shadowDistance, 350);
  assert.equal(L(7).graphics.shadowDistance, 245); assert.equal(L(7).gov.cascadesDelta, -1); assert.equal(L(7).graphics.groundCoverRadius, 80);
  assert.equal(L(8).graphics.groundCoverRadius, 40); assert.equal(L(8).graphics.vegetationDensity, 0.938); assert.equal(L(8).graphics.crowdDensity, 1.25);
  assert.equal(L(9).graphics.crowdDensity, 0.875); assert.equal(L(9).graphics.trafficDensity, 0.875); assert.equal(L(9).graphics.particles, 'high'); assert.equal(L(9).graphics.bloom, true);
  assert.equal(L(10).graphics.ao, 'off'); assert.equal(L(10).graphics.bloom, false); assert.equal(L(10).graphics.antialiasing, 'fxaa'); assert.equal(L(10).graphics.lodBias, 1.3);
  assert.equal(L(11).graphics.lodBias, 1.04); assert.equal(L(11).gov.midRadiusDelta, -2);
  assert.equal(MAX_LEVEL, 11);
});

test('never raises a value the user set lower; resolution floor = user - 0.3, never below 0.5', () => {
  const u = { ...userHigh(), resolutionScale: 0.6, ao: 'off', fogCards: 'off', reflections: 'off', antialiasing: 'off', particles: 'low', shadows: 'off', godRays: false };
  for (let lvl = 0; lvl <= MAX_LEVEL; lvl++) {
    const { graphics: g, gov } = applyLevel(u, lvl);
    assert.ok(g.resolutionScale >= 0.5 && g.resolutionScale <= 0.6);
    assert.equal(g.ao, 'off'); assert.equal(g.fogCards, 'off'); assert.equal(g.reflections, 'off'); assert.equal(g.antialiasing, 'off'); assert.equal(g.particles, 'low'); assert.equal(g.godRays, false);
    assert.equal(gov.cascadesDelta, 0, 'shadows off stays off');
  }
  const u2 = { ...userHigh(), ao: 'low', reflections: 'env', antialiasing: 'fxaa' };
  assert.equal(applyLevel(u2, 5).graphics.ao, 'low');
  assert.equal(applyLevel(u2, 6).graphics.reflections, 'env');
  assert.equal(applyLevel(u2, 10).graphics.antialiasing, 'fxaa');
  // monotone: no field ever goes up with the level
  const U = userHigh();
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    const a = applyLevel(U, lvl - 1).graphics, b = applyLevel(U, lvl).graphics;
    for (const k of ['resolutionScale', 'shadowDistance', 'groundCoverRadius', 'vegetationDensity', 'crowdDensity', 'trafficDensity', 'lodBias']) assert.ok(b[k] <= a[k], `${k} rose at level ${lvl}`);
  }
});

test('attached to Quality: overrides the effective settings, never the saved ones, emits quality:changed', () => {
  const bus = createBus(); const evs = [];
  bus.on('quality:changed', (p) => evs.push(p.governorLevel));
  const q = createQuality({ storage: mem(), bus });
  q.applyPreset('ultra');
  const gov = attachGovernor(q);
  for (let i = 0; i < 400 && gov.level < 4; i++) gov.sample(40);
  assert.ok(gov.level >= 2, 'level ' + gov.level);
  assert.equal(q.get('graphics.resolutionScale'), 1.0, 'saved settings untouched');
  assert.ok(q.effective().resolutionScale < 1.0);
  assert.equal(q.governorLevel, gov.level);
  assert.ok(evs.includes(1) && evs.includes(2));
  // a user edit while governed: the override base follows the new user value
  q.set('graphics.resolutionScale', 0.8);
  assert.ok(q.effective().resolutionScale < 0.8);
  // adaptive off -> back to level 0 and user values
  q.set('graphics.adaptive', false);
  assert.equal(gov.level, 0);
  assert.equal(q.effective().resolutionScale, 0.8);
});

test('no allocation pattern: sample() does not grow memory over 100k calls', () => {
  const g = createGovernor();
  for (let i = 0; i < 1000; i++) g.sample(10 + (i % 7));
  if (global.gc) global.gc();
  const h0 = process.memoryUsage().heapUsed;
  for (let i = 0; i < 100000; i++) g.sample(10 + (i % 7));
  const grow = process.memoryUsage().heapUsed - h0;
  assert.ok(grow < 4 * 1048576, 'heap grew ' + grow);
});
