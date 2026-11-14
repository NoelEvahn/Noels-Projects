import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim } from '../../src/sim/index.js';
import { createSave, canonicalJSON, validateSave } from '../../src/core/save.js';
import { ERR } from '../../src/data/ids.js';

function harness() {
  const sim = createSim(); sim.init({});
  const player = { pos: [-147, 8.1, 372], yaw: 0, mode: 'foot', vehicleId: null, outfit: {} };
  const collect = () => ({ v: 1, meta: { createdAt: 0, savedAt: 0, playTimeSec: 12, build: '0.2.0', cheated: sim.cheated }, rng: {}, time: { total: 480, scale: 1 }, sim: sim.serialize(), player: { ...player }, env: {}, settingsRef: false });
  const restore = (s) => { sim.init({ state: s.sim }); Object.assign(player, s.player); };
  const mem = new Map();
  const storage = { setItem: (k, v) => mem.set(k, v), getItem: (k) => mem.get(k) ?? null, removeItem: (k) => mem.delete(k) };
  return { sim, player, save: createSave({ collect, restore, storage }), collect };
}
test('save: slot write/read/apply round-trip is canonical-JSON equal', () => {
  const h = harness();
  h.sim.cmd('debug.grant', { cents: 12345 }); h.player.pos[0] = -100;
  assert.equal(h.save.storageAvailable, true);
  assert.equal(h.save.write('1').ok, true);
  const before = canonicalJSON(h.collect().sim);
  const r = h.save.read('1'); assert.equal(r.ok, true);
  h.sim.init({}); assert.equal(h.sim.select('cash'), 10000);
  assert.equal(h.save.apply(r.data).ok, true);
  assert.equal(canonicalJSON(h.collect().sim), before);
  assert.equal(h.sim.select('cash'), 22345);
  assert.equal(h.save.slots().length, 1);
});
test('save: export code round-trip (compressed) and rejection of garbage', async () => {
  const h = harness();
  const code = await h.save.toCode();
  assert.match(code, /^LOE1\./);
  const r = await h.save.fromCode(code); assert.equal(r.ok, true);
  assert.equal(canonicalJSON(r.data.sim), canonicalJSON(h.collect().sim));
  const bad = await h.save.fromCode('LOE1.AAAA'); assert.deepEqual([bad.ok, bad.error], [false, ERR.SAVE_INVALID]);
  assert.equal(h.save.apply({ v: 2 }).ok, false);
  assert.equal(validateSave(null), false);
});
test('save: storage that throws falls back to memory', () => {
  const sim = createSim(); sim.init({});
  const s = createSave({ collect: () => ({ v: 1, meta: {}, time: { total: 1 }, sim: sim.serialize(), player: { pos: [0, 0, 0] } }), restore() {}, storage: { setItem() { throw new Error('denied'); }, getItem() { throw new Error('denied'); }, removeItem() {} } });
  assert.equal(s.storageAvailable, false);
  assert.equal(s.write('auto').ok, true);
  assert.equal(s.read('auto').ok, true);
});
