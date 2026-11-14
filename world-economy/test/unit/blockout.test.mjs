// Stage 2 acceptance 8: a blockout builder exists for 100% of archetype ids; builders return valid raw geometry.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../../src/blockout/index.js';
import { Builders } from '../../src/render/builders.js';
import { ARCHETYPES, ARCHETYPE_IDS } from '../../src/world/archetypes.js';

test('blockout builder registered for every archetype id (and nothing extra)', () => {
  assert.ok(ARCHETYPE_IDS.length >= 200);
  assert.deepEqual(ARCHETYPE_IDS.filter((i) => !Builders.has(i)), []);
  assert.deepEqual(Builders.ids().filter((i) => !ARCHETYPES[i]), []);
  assert.equal(Builders.blockoutIds().length, ARCHETYPE_IDS.length);
});
test('every builder returns finite raw geometry with matching attribute lengths', () => {
  for (const id of ARCHETYPE_IDS) {
    const A = ARCHETYPES[id];
    for (const lod of [0, 1, 2]) {
      const r = Builders.get(id)({ id: 't', archetype: id, x: 0, y: 0, z: 0, rotY: 0, seed: 123, params: { w: A.size[0], d: A.size[2], h: A.size[1], floors: A.floors ? A.floors[0] : 1 } }, { lod });
      assert.ok(Array.isArray(r.batches), id);
      for (const b of r.batches) {
        const g = b.geometry;
        assert.equal(g.position.length, g.normal.length); assert.equal(g.position.length, g.color.length);
        assert.ok(g.index.length % 3 === 0 && g.index.length > 0, id);
        for (const v of g.position) assert.ok(Number.isFinite(v), id);
        for (const i of g.index) assert.ok(i < g.position.length / 3, id);
        assert.equal(b.materialId, 'mat.blockout');
      }
      if (A.category !== 'interior' && !(A.category2 === 'infra')) assert.ok(r.batches.length >= 1, id);
    }
  }
});
test('building blockouts have the placement footprint and height', () => {
  const r = Builders.get('bld.brick_loft')({ archetype: 'bld.brick_loft', seed: 1, params: { w: 30, d: 24, h: 29.4, floors: 7 } }, { lod: 1 });
  const p = r.batches[0].geometry.position;
  let minx = 1e9, maxx = -1e9, maxy = -1e9, minz = 1e9, maxz = -1e9;
  for (let i = 0; i < p.length; i += 3) { minx = Math.min(minx, p[i]); maxx = Math.max(maxx, p[i]); maxy = Math.max(maxy, p[i + 1]); minz = Math.min(minz, p[i + 2]); maxz = Math.max(maxz, p[i + 2]); }
  assert.ok(Math.abs(maxx - minx - 30) < 1e-4 && Math.abs(maxz - minz - 24) < 1e-4 && Math.abs(maxy - 29.4) < 1e-4);
});
