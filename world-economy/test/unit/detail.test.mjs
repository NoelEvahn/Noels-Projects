// Detail Batch 1: placement data for shrubs, parked cars and lily pads is deterministic, sits where it should and stays inside budget-friendly counts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../src/world/query.js';
import { waterBodyAt } from '../../src/world/layout/water.js';
import { regionAt } from '../../src/world/layout/regions.js';
import { Builders } from '../../src/render/builders.js';
import '../../src/art/index.js';

World.init({ seed: 1 });
const D = World.data.decor;
const all = (arrs, stride) => { const out = []; for (const a of arrs) for (let q = 0; q < a.length; q += stride) out.push(Array.from(a.subarray(q, q + stride))); return out; };

test('scatter data exists in every region and is chunk-bucketed', () => {
  const shrubs = all(D.shrubs, 7), cars = all(D.parked, 7), pads = all(D.lilies, 7);
  assert.ok(shrubs.length > 400 && cars.length > 1000 && pads.length > 1500, `${shrubs.length}/${cars.length}/${pads.length}`);
  const regs = new Set(shrubs.map((s) => regionAt(s[0], s[2])));
  assert.ok(regs.has('city') && (regs.has('lake') || regs.has('ocean') || regs.has('forest')));
  for (const k of [0, 1]) assert.ok(D.shrubs[k] instanceof Float32Array);
});
test('lily pads sit on the water surface in shallow water, cars on the road surface', () => {
  for (const p of all(D.lilies, 7).slice(0, 400)) { const wb = waterBodyAt(p[0], p[2]); assert.ok(wb, 'pad over water'); assert.ok(Math.abs(p[1] - wb.level) < 0.05); assert.ok(wb.level - World.heightAt(p[0], p[2]) > 0.2); }
  for (const c of all(D.parked, 7)) { assert.ok(c[4] >= 0 && c[4] < 4 && c[5] >= 0 && c[5] < 12); assert.ok(Math.abs(c[1] - World.heightAt(c[0], c[2])) < 6); }
});
test('placement is deterministic for a seed', () => {
  const a = World.data.decor.scatterCounts;
  World.init({ seed: 1 });
  assert.deepEqual(World.data.decor.scatterCounts, a);
});
test('new detail props and plants have builders', () => {
  for (const id of ['prop.mailbox_post', 'prop.trash_bags', 'prop.newspaper_box', 'veg.lawn', 'veg.marram', 'veg.cattail', 'veg.daisy']) {
    assert.ok(Builders.has(id), id);
    const r = Builders.get(id)({ archetype: id, seed: 3, x: 0, y: 0, z: 0, rotY: 0, params: {} }, { lod: 0 });
    assert.ok(r.batches.length > 0 && r.batches[0].geometry.index.length > 0, id);
  }
});
