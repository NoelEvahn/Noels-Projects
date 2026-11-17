// Save/load round trips (Annex D 9.4 #7): canonical-JSON equality mid-shift, mid-business-hour and while driving; determinism after reload.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, advance, okCmd, give, invariant } from './helpers.mjs';
import { canonicalJSON, createSave } from '../../src/core/save.js';
import { createSim } from '../../src/sim/index.js';
import { setupBusiness } from './bots/bizBot.mjs';
import { runShift } from '../../src/game/jobs/bot.js';

const rt = (sim) => { const raw = JSON.stringify(sim.serialize()); const a = canonicalJSON(JSON.parse(raw)); const b = createSim(); b.init({ state: JSON.parse(raw) }); return { a, b: canonicalJSON(b.serialize()), sim2: b }; };

test('round trip: fresh game', () => { const r = rt(makeSim()); assert.equal(r.a, r.b); assert.equal(r.sim2.select('cash'), 10000); });
test('round trip: mid-shift (open tasks, accrued pay) and no duplicate payout', () => {
  const sim = makeSim({ bus: true }); okCmd(sim, 'job.apply', { jobId: 'job.city.delivery' }); const sid = okCmd(sim, 'job.startShift', { jobId: 'job.city.delivery' }).shiftId;
  const t1 = okCmd(sim, 'job.nextTask', { shiftId: sid }); okCmd(sim, 'job.nextTask', { shiftId: sid }); sim.tickReal(25); okCmd(sim, 'job.reportTask', { shiftId: sid, taskId: t1.id, score: 0.9 });
  const r = rt(sim); assert.equal(r.a, r.b);
  const cashBefore = sim.select('cash'); const end1 = okCmd(sim, 'job.endShift'); const afterPay = sim.select('cash');
  assert.equal(afterPay - cashBefore, end1.net + end1.tips);
  // the loaded copy pays exactly once as well, and the restored task cannot be reported twice
  const b = r.sim2; assert.equal(b.cmd('job.reportTask', { shiftId: sid, taskId: t1.id, score: 1 }).ok, false); const end2 = okCmd(b, 'job.endShift'); assert.equal(end2.gross, end1.gross); assert.equal(b.select('cash'), afterPay);
  assert.equal(b.cmd('job.endShift').ok, false);
});
test('round trip: mid business hour, then identical futures', () => {
  const sim = makeSim({ seed: 31 }); const bizId = setupBusiness(sim, 'biz.cafe'); advance(sim, 3 * 1440 + 23, { real: 0 });
  assert.notEqual(sim.time % 60, 0); const r = rt(sim); assert.equal(r.a, r.b);
  advance(sim, 5 * 1440, { real: 0 }); advance(r.sim2, 5 * 1440, { real: 0 });
  assert.equal(canonicalJSON(sim.serialize()), canonicalJSON(r.sim2.serialize())); void bizId;
});
test('round trip: while driving (vehicle fuel, wear, position) and owned property/plots', () => {
  const sim = makeSim(); give(sim, 5000000); sim.cmd('bank.deposit', { amount: 4000000 });
  const v = okCmd(sim, 'veh.buy', { modelId: 'veh.sedan', payFrom: 'card' }); okCmd(sim, 'veh.use', { vehId: v.vehId, km: 12.5, throttle: 0.8 }); okCmd(sim, 'veh.setPos', { vehId: v.vehId, pos: [10.5, 2, -4.25], yaw: 1.2 });
  okCmd(sim, 'prop.buy', { propId: 'plot_8', payFrom: 'card' }); okCmd(sim, 'build.place', { plotId: 'plot_8', type: 'piece.foundation', gx: 1, gy: 0, gz: 1, rot: 0, mat: 'concrete' });
  okCmd(sim, 'prop.buy', { propId: 'prop_1', payFrom: 'card' }); okCmd(sim, 'furn.place', { propId: 'prop_1', type: 'piece.furn.bed_double', x2: 3, level: 0, z2: 3, rot: 0 });
  const r = rt(sim); assert.equal(r.a, r.b); assert.equal(r.sim2.select('veh.owned')[0].odo, 12.5);
  assert.deepEqual(r.sim2.select('build.plot', { plotId: 'plot_8' }).pieces, [[0, 1, 0, 1, 0, 0]]);
});
test('round trip through core/save (SaveV1 envelope, slots and export code)', async () => {
  const sim = makeSim({ seed: 6 }); setupBusiness(sim, 'biz.vending'); advance(sim, 2 * 1440 + 777, { real: 0 });
  const mem = new Map(); const storage = { setItem: (k, v) => mem.set(k, v), getItem: (k) => mem.get(k) ?? null, removeItem: (k) => mem.delete(k) };
  const collect = () => ({ v: 1, meta: { createdAt: 0, savedAt: 0, playTimeSec: 1, build: 't', cheated: sim.cheated }, rng: {}, time: { total: sim.time, scale: 1 }, sim: sim.serialize(), player: { pos: [0, 0, 0], yaw: 0, mode: 'foot', vehicleId: null, outfit: {} }, env: {}, settingsRef: false });
  const restore = (s) => sim.init({ state: s.sim });
  const save = createSave({ collect, restore, storage }); const before = canonicalJSON(sim.serialize());
  assert.equal(save.write('1').ok, true); advance(sim, 1440, { real: 0 }); assert.notEqual(canonicalJSON(sim.serialize()), before);
  const rd = save.read('1'); assert.equal(rd.ok, true); assert.equal(save.apply(rd.data).ok, true); assert.equal(canonicalJSON(sim.serialize()), before);
  const code = await save.toCode(); const back = await save.fromCode(code); assert.equal(back.ok, true); assert.equal(canonicalJSON(back.data.sim), before);
  invariant(sim);
});
test('reloading cannot re-roll randomness (candidates, markets, used cars)', () => {
  const sim = makeSim({ seed: 12 }); give(sim, 3000000); sim.cmd('bank.deposit', { amount: 2500000 }); advance(sim, 1440, { real: 0 });
  const snap = JSON.parse(canonicalJSON(sim.serialize()));
  const roll = (s) => { const v = s.cmd('veh.buy', { modelId: 'veh.sedan', used: true, payFrom: 'card' }); return canonicalJSON([s.select('veh.owned')[0], v.data.price]); };
  const a = roll(sim); const b2 = createSim(); b2.init({ state: JSON.parse(JSON.stringify(snap)) }); assert.equal(roll(b2), a);
});
