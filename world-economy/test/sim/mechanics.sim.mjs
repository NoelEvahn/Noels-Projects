// Stage 4b mechanics upgrades: driveLeg (parcel condition, taxi comfort) and dockLeg (boat docking precision) read vehicle telemetry from env.vehicle().
import test from 'node:test';
import assert from 'node:assert/strict';
import { driveLeg, dockLeg } from '../../src/game/jobs/primitives.js';
import { createFakeInput } from '../../src/game/jobs/bot.js';

const inp = createFakeInput();
function run(step, frames, tel, pos, mode) {
  const env = { pos: () => pos.v, mode: () => mode, vehicle: () => tel.v };
  for (let i = 0; i < frames && step.res === 'active'; i++) { tel.step && tel.step(i); step.update(1 / 60, inp, env); }
  return step;
}
// a ride: speed profile and yaw profile over time, vehicle teleports to the target at the end
const ride = (speedAt, yawAt, hitAt = () => 0, end = 600) => { const tel = { v: { speed: 0, yaw: 0, collided: 0 } }, pos = { v: [0, 0, 0] }; tel.step = (i) => { tel.v = { speed: speedAt(i / 60), yaw: yawAt(i / 60), collided: hitAt(i) }; pos.v = i >= end ? [100, 0, 0] : [0, 0, 0]; }; return { tel, pos }; };

test('driveLeg: a smooth ride delivers a full-condition parcel; hard braking and swerving cost condition and score', () => {
  const { tel, pos } = ride((t) => Math.min(12, t * 2), () => 0);
  const smooth = run(driveLeg({ target: [100, 0, 0], radius: 5, meter: 'parcel' }), 700, tel, pos, 'vehicle'); assert.equal(smooth.res, 'done'); assert.ok(smooth.score > 0.97, 'smooth ' + smooth.score);
  // stop-start driving: 14 m/s to 0 in a quarter second, every second
  const r2 = ride((t) => (Math.floor(t * 4) % 4 === 0 ? 0 : 14), (t) => t * 0.2); const rough = run(driveLeg({ target: [100, 0, 0], radius: 5, meter: 'parcel' }), 700, r2.tel, r2.pos, 'vehicle');
  assert.ok(rough.res === 'fail' || rough.score < smooth.score, 'rough driving loses condition: ' + rough.res + ' ' + rough.score);
  const r3 = ride(() => 10, (t) => Math.sin(t * 4) * 1.2); const swerve = run(driveLeg({ target: [100, 0, 0], radius: 5, meter: 'parcel', fragile: true }), 700, r3.tel, r3.pos, 'vehicle');
  assert.ok(swerve.res === 'fail' || swerve.meter < 0.9, 'swerving a fragile parcel hurts: ' + swerve.meter);
});
test('driveLeg: collisions hurt (fragile more); a taxi collision above the impulse limit ends the ride at once; no telemetry means no penalty', () => {
  let a = ride(() => 10, () => 0, (i) => (i === 100 ? 4 : i === 101 ? 3.6 : 0)); const one = run(driveLeg({ target: [100, 0, 0], radius: 5, meter: 'parcel' }), 700, a.tel, a.pos, 'vehicle');
  a = ride(() => 10, () => 0, (i) => (i === 100 ? 4 : i === 101 ? 3.6 : 0)); const frag = run(driveLeg({ target: [100, 0, 0], radius: 5, meter: 'parcel', fragile: true }), 700, a.tel, a.pos, 'vehicle');
  assert.equal(one.hits, 1); assert.ok(frag.meter < one.meter, 'fragile parcels suffer more');
  a = ride(() => 10, () => 0, (i) => (i === 50 ? 8 : 0)); const taxi = run(driveLeg({ target: [100, 0, 0], radius: 5, meter: 'comfort', hitFail: 6 }), 700, a.tel, a.pos, 'vehicle'); assert.equal(taxi.res, 'fail'); assert.equal(taxi.score, 0);
  const none = run(driveLeg({ target: [0, 0, 0], radius: 5 }), 5, { v: null }, { v: [0, 0, 0] }, 'vehicle'); assert.equal(none.res, 'done'); assert.equal(none.score, 1);
  const foot = run(driveLeg({ target: [0, 0, 0], radius: 5 }), 5, { v: null }, { v: [0, 0, 0] }, 'foot'); assert.equal(foot.res, 'active', 'must be driving');
});
test('dockLeg: must be close and nearly stopped; precision and soft arrival raise the score; repeated bumps fail', () => {
  const dock = (d, v, hits = () => 0, frames = 200) => { const tel = { v: { speed: v, yaw: 0, collided: 0 }, step: (i) => { tel.v = { speed: v, yaw: 0, collided: hits(i) }; } }; return run(dockLeg({ target: [0, 0, 0], radius: 5, maxSpeed: 0.8 }), frames, tel, { v: [d, 0, 0] }, 'boat'); };
  const perfect = dock(0.3, 0.1); assert.equal(perfect.res, 'done'); assert.ok(perfect.score > 0.9, 'perfect dock ' + perfect.score);
  const edge = dock(4.5, 0.7); assert.equal(edge.res, 'done'); assert.ok(edge.score < perfect.score - 0.3, 'sloppy dock ' + edge.score);
  assert.equal(dock(0.3, 3).res, 'active', 'too fast: not docked yet'); assert.equal(dock(9, 0).res, 'active', 'too far');
  const bumped = dock(0.3, 0.1, (i) => (i === 5 ? 2 : i === 20 ? 2 : 0)); assert.equal(bumped.res, 'done'); assert.ok(bumped.score < perfect.score - 0.2, 'bumps cost score ' + bumped.score);
  const wrecked = dock(0.3, 0.1, (i) => (i % 10 === 5 && i < 30 ? 3 : 0), 400); assert.equal(wrecked.res, 'fail');
});
