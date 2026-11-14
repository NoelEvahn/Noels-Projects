// Quality system (Annex G 3): presets, custom switch, validation, derived params, persistence round-trip, storage blocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuality, PRESETS, derive, resolveAuto, benchmarkMedian, STORAGE_KEY, coerce } from '../../src/render/quality.js';
import { createBus } from '../../src/core/bus.js';

function memStore() { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; }
const throwing = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); }, removeItem() { throw new Error('SecurityError'); } };

test('every preset writes every field of its Annex G 3.3 row', () => {
  for (const name of ['low', 'medium', 'high', 'ultra']) {
    const q = createQuality({ storage: memStore() });
    q.applyPreset(name);
    const g = q.get().graphics;
    assert.equal(g.preset, name);
    for (const [k, v] of Object.entries(PRESETS[name].graphics)) assert.equal(g[k], v, `${name}.${k}`);
    assert.equal(q.get('audio.voiceLimit'), PRESETS[name].audio.voiceLimit);
    assert.equal(q.get('audio.hrtf'), PRESETS[name].audio.hrtf);
  }
});

test('preset table spot checks against Annex G 3.3', () => {
  const d = (p) => { const q = createQuality({ storage: memStore() }); q.applyPreset(p); return q.derived(); };
  const lo = d('low'), me = d('medium'), hi = d('high'), ul = d('ultra');
  assert.deepEqual([lo.shadows.cascades, lo.shadows.mapSize], [1, 1024]);
  assert.deepEqual([me.shadows.cascades, me.shadows.pcf], [2, 5]);
  assert.deepEqual([hi.shadows.cascades, hi.shadows.mapSize, hi.shadows.pcf], [3, 2048, 9]);
  assert.deepEqual([ul.shadows.cascades, ul.shadows.pcf], [4, 16]);
  assert.deepEqual(lo.chunkRadii, [2, 5]); assert.deepEqual(me.chunkRadii, [3, 6]); assert.deepEqual(hi.chunkRadii, [3, 8]); assert.deepEqual(ul.chunkRadii, [4, 10]);
  assert.deepEqual(lo.textures.H, [512, 256]); assert.equal(hi.textures.atlas, 2048); assert.deepEqual(ul.textures.H, [1024, 1024]);
  assert.deepEqual(lo.vegetation.treeCaps, [80, 800]); assert.deepEqual(ul.vegetation.treeCaps, [450, 4000]);
  assert.equal(lo.particles.maxAlive, 500); assert.equal(ul.particles.maxAlive, 8000);
  assert.equal(ul.msaaSamples, 4); assert.equal(ul.reflections.ssr, true); assert.equal(lo.reflections.mode, 'off');
  assert.equal(lo.shadows.lastCascadeEvery, 2); assert.equal(hi.shadows.lastCascadeEvery, 1);
});

test('editing a graphics field switches the preset to custom; comfort fields do not', () => {
  const q = createQuality({ storage: memStore() });
  q.applyPreset('high');
  q.set('graphics.fov', 70);
  assert.equal(q.get('graphics.preset'), 'high');
  q.set('graphics.bloom', false);
  assert.equal(q.get('graphics.preset'), 'custom');
});

test('validation: out-of-range numbers are clamped/snapped, unknown enums rejected', () => {
  assert.equal(coerce('resolutionScale', 0.33), 0.5);
  assert.equal(coerce('resolutionScale', 0.77), 0.75);
  assert.equal(coerce('shadows', 'extreme'), undefined);
  assert.equal(coerce('anisotropy', 3), undefined);
  const q = createQuality({ storage: memStore() });
  q.set('graphics.shadows', 'extreme');
  assert.equal(q.get('graphics.shadows'), 'high');
});

test('apply() is idempotent and emits settings:changed + quality:changed once per real change', () => {
  const bus = createBus(); const evs = [];
  bus.on('settings:changed', (p) => evs.push(['s', p.path])); bus.on('quality:changed', (p) => evs.push(['q', p.preset]));
  const q = createQuality({ storage: memStore(), bus });
  q.apply({ shadowDistance: 150 });
  const n = evs.length;
  q.apply({ shadowDistance: 150 });
  assert.equal(evs.length, n, 'second identical apply emits nothing');
  assert.ok(evs.some((e) => e[0] === 's' && e[1] === 'graphics.shadowDistance'));
  assert.ok(evs.some((e) => e[0] === 'q' && e[1] === 'custom'));
});

test('persistence round-trip through storage', () => {
  const st = memStore();
  const q = createQuality({ storage: st });
  q.applyPreset('medium'); q.set('graphics.lodBias', 1.2); q.set('audio.music', 0.25);
  assert.ok(st.m.has(STORAGE_KEY));
  const q2 = createQuality({ storage: st });
  assert.equal(q2.get('graphics.preset'), 'custom');
  assert.equal(q2.get('graphics.lodBias'), 1.2);
  assert.equal(q2.get('graphics.shadows'), 'medium');
  assert.equal(q2.get('audio.music'), 0.25);
});

test('storage that throws: quality still works in memory', () => {
  const q = createQuality({ storage: throwing });
  assert.equal(q.storageAvailable, false);
  q.applyPreset('ultra');
  assert.equal(q.get('graphics.shadows'), 'ultra');
  assert.equal(q.persist(), false);
});

test('corrupt or hostile stored JSON falls back to defaults per field', () => {
  const st = memStore();
  st.setItem(STORAGE_KEY, '{"graphics":{"shadows":"nope","resolutionScale":9,"bloom":"yes"},"audio":{"master":"loud"}}');
  const q = createQuality({ storage: st });
  assert.equal(q.get('graphics.shadows'), 'high');
  assert.equal(q.get('graphics.resolutionScale'), 1.0);
  assert.equal(q.get('graphics.bloom'), true);
  assert.equal(q.get('audio.master'), 0.8);
  st.setItem(STORAGE_KEY, '{not json');
  assert.equal(createQuality({ storage: st }).get('graphics.preset'), 'auto');
});

test('auto preset (Annex G 3.4)', () => {
  assert.equal(resolveAuto({ rendererString: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))', medianFrameMs: 3 }), 'low');
  assert.equal(resolveAuto({ medianFrameMs: 6.9 }), 'ultra');
  assert.equal(resolveAuto({ medianFrameMs: 11 }), 'high');
  assert.equal(resolveAuto({ medianFrameMs: 19 }), 'medium');
  assert.equal(resolveAuto({ medianFrameMs: 25 }), 'low');
  const frames = new Float32Array(90).fill(100); for (let i = 30; i < 90; i++) frames[i] = 10 + (i % 3);
  assert.equal(benchmarkMedian(frames), 11);
  const q = createQuality({ storage: memStore() });
  q.resolveAutoPreset({ rendererString: 'llvmpipe' });
  assert.equal(q.get('graphics.preset'), 'auto');
  assert.equal(q.get('graphics.autoResolved'), 'low');
  assert.equal(q.get('graphics.shadows'), 'low');
  assert.equal(q.get('graphics.adaptive'), true);
});

test('adapter receives derived params on every change', () => {
  const q = createQuality({ storage: memStore() });
  const calls = [];
  q.setAdapter({ apply(d, e, changed) { calls.push({ ratio: d.pixelRatio, changed }); } });
  assert.deepEqual(calls[0].changed, ['*']);
  q.set('graphics.resolutionScale', 0.8);
  assert.equal(calls.length, 2);
  assert.ok(Math.abs(calls[1].ratio - 0.8) < 1e-9);
  assert.equal(derive({ ...q.get().graphics, maxPixelRatio: 1.5 }, undefined, 2).pixelRatio, 1.5 * 0.8);
});
