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

// ---- Detail Batch 2/3 ----------------------------------------------------------------------------------------------------------------------------
test('every decor item is in its chunk list (Batch 1 street dressing was missing before)', () => {
  let n = 0; for (const c of D.byChunk) n += c.length;
  assert.equal(n, D.items.length);
});
test('Batch 2 props exist and have builders with geometry at LOD0 and LOD1, none at LOD2', () => {
  const ids = ['bike_rack', 'potted_plant', 'firewood_stack', 'rail_fence', 'crate_stack', 'barrel_group', 'pallet_stack', 'tyre_fender', 'bollard_rope', 'stump_mossy', 'stump_fresh', 'stump_rotten', 'poster_column', 'graffiti_wall', 'string_lights', 'steam_vent', 'laundry_line', 'sandbags'].map((n) => 'prop.' + n);
  for (const id of ids) {
    assert.ok(Builders.has(id), id);
    for (const lod of [0, 1]) { const r = Builders.get(id)({ archetype: id, seed: 5, x: 0, y: 0, z: 0, rotY: 0, params: {} }, { lod }); assert.ok(r.batches.length > 0 && r.batches[0].geometry.index.length > 0, id + ' lod' + lod); }
    assert.equal(Builders.get(id)({ archetype: id, seed: 5, x: 0, y: 0, z: 0, rotY: 0, params: {} }, { lod: 2 }).batches.length, 0, id + ' lod2');
  }
  const c = {}; for (const it of D.items) c[it.archetype] = (c[it.archetype] || 0) + 1;
  for (const id of ['prop.bike_rack', 'prop.firewood_stack', 'prop.rail_fence', 'prop.crate_stack', 'prop.barrel_group', 'prop.stump_fresh', 'prop.steam_vent', 'prop.string_lights', 'prop.poster_column']) assert.ok(c[id] > 5, id + ' ' + c[id]);
});
test('detail2 lists: wires, perched birds, waterfowl over water, rings, steam, chimneys, weeds', () => {
  const d = D.detail2;
  assert.ok(d.wires.length / 6 > 600 && d.perches.length / 6 > 200 && d.fowl.length / 9 > 10 && d.fish.length / 7 > 20 && d.rings.length / 4 > 100 && d.steam.length > 30 && d.chimneys.length > 30 && d.weeds.length / 6 > 1000);
  for (let i = 0; i < d.fowl.length; i += 9) { const wb = waterBodyAt(d.fowl[i], d.fowl[i + 1]); assert.ok(wb && Math.abs(wb.level - d.fowl[i + 2]) < 0.01, 'fowl anchor over water'); }
  for (let i = 0; i < d.rings.length; i += 4) { const wb = waterBodyAt(d.rings[i], d.rings[i + 2]); assert.ok(wb && Math.abs(d.rings[i + 1] - wb.level - 0.03) < 0.01); }
  for (let i = 0; i < d.wires.length; i += 6) assert.ok(Math.hypot(d.wires[i + 3] - d.wires[i], d.wires[i + 5] - d.wires[i + 2]) < 62.5);
});
test('detail2 placement is deterministic for a seed', () => {
  const a = Array.from(D.detail2.perches.slice(0, 60)), n = D.items.length;
  World.init({ seed: 1 });
  assert.deepEqual(Array.from(World.data.decor.detail2.perches.slice(0, 60)), a); assert.equal(World.data.decor.items.length, n);
});
