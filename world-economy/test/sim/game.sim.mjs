// Game-layer integration (headless, real World): economy link services, job controllers through Game.jobs, owned vehicles, fuel by distance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../src/world/query.js';
import { createGame } from '../../src/game/index.js';
import { createBus } from '../../src/core/bus.js';
import { createClock } from '../../src/core/clock.js';
import { createSim } from '../../src/sim/index.js';
import { createFakeInput, botTick } from '../../src/game/jobs/bot.js';
import { invariant } from './helpers.mjs';
import { defaultSettings } from '../../src/data/settings.js';

World.init({ seed: 1 });
function boot() {
  const bus = createBus(); const sim = createSim({ bus, strict: true }); sim.init({ seed: 3 });
  const clock = createClock(bus, { total: 480 }); bus.on('time:minute', (gt) => sim.tickMinute(gt));
  const inp = createFakeInput(); inp.poll = () => {}; inp.requestPointerLock = () => Promise.resolve({ locked: false });
  const game = createGame(); game.init({ bus, input: inp, settings: defaultSettings(), clock, sim });
  return { bus, sim, clock, inp, game };
}
const frame = (g, dt = 1 / 60) => { g.game.fixedUpdate(dt); g.clock.advance(dt); g.bus.flush(); g.game.update(dt, 0); };

test('services gate by distance to the real POI (bank, market, shop) and ATM tags', () => {
  const g = boot(); g.sim.cmd('debug.grant', { cents: 100000 });
  assert.equal(g.sim.cmd('bank.deposit', { amount: 100 }).error, 'ERR.OUT_OF_RANGE'); // spawn is not at the bank
  g.game.teleport(World.poi('poi.city.bank').pos); assert.equal(g.sim.cmd('bank.deposit', { amount: 500 }).ok, true);
  assert.equal(g.sim.cmd('market.buy', { marketId: 'mkt.city.wholesale', itemId: 'item.ing.snack', qty: 1 }).error, 'ERR.OUT_OF_RANGE');
  g.game.teleport(World.poi('poi.city.wholesale').pos); assert.equal(g.sim.cmd('market.buy', { marketId: 'mkt.city.wholesale', itemId: 'item.ing.snack', qty: 1 }).ok, true);
  invariant(g.sim);
});
test('Game.jobs runs a courier shift end to end with the live Game, Sim and a scripted input bot', () => {
  const g = boot(); g.game.teleport(World.poi('poi.city.depot').pos);
  const env = { pos: () => g.game.playerPos(), mode: () => (g.game.player.mode === 'foot' ? 'foot' : 'vehicle'), poi: (id) => g.game.economy.poiPos(id), snap: (x, z) => g.game.economy.snapRoad(x, z),
    teleport(p) { g.game.teleport([p[0], p[1], p[2]]); },
    setMode(m) { if (m === 'vehicle' && g.game.player.mode === 'foot') { let best = null, bd = 1e12; const pp = g.game.playerPos(); for (const [id, v] of g.game.vehicles) if (v.kind === 'vehicle') { const d = (v.ent.pos[0] - pp[0]) ** 2 + (v.ent.pos[2] - pp[2]) ** 2; if (d < bd) { bd = d; best = id; } } g.game.teleport([g.game.vehicles.get(best).ent.pos[0] + 2, 0, g.game.vehicles.get(best).ent.pos[2]]); g.game.enterVehicle(best); } } };
  const r = g.game.jobs.start('job.city.delivery', { env, input: g.inp }); assert.equal(r.ok, true, JSON.stringify(r));
  const ctrl = g.game.jobs.controller, st = { cool: 0 }; const cash0 = g.sim.select('cash');
  for (let i = 0; i < 60 * 130 && g.game.jobs.active; i++) { botTick(ctrl, g.inp, env, 'good', st, 1 / 60); frame(g); }
  assert.ok(ctrl.stats.tasks >= 3, 'tasks ' + ctrl.stats.tasks); const end = g.game.jobs.stop(); void end;
  assert.ok(g.sim.select('cash') > cash0); invariant(g.sim); assert.equal(g.game.jobs.hud(), null);
});
test('owned vehicles spawn on purchase, burn fuel by distance and are removed on sale', () => {
  const g = boot(); g.sim.cmd('debug.grant', { cents: 3000000 }); g.sim.cmd('bank.deposit', { amount: 100 });
  g.game.teleport(World.poi('poi.city.usedcars').pos); g.sim.cmd('bank.withdraw', { amount: 1 });
  const before = g.game.entities.count; const v = g.sim.cmd('veh.buy', { modelId: 'veh.hatch_used', used: true, poiId: 'poi.city.usedcars', payFrom: 'cash' }); assert.equal(v.ok, true, JSON.stringify(v));
  assert.equal(g.game.entities.count, before + 1);
  const eid = g.game.economy.entityOf.get(v.data.vehId); assert.ok(eid !== undefined);
  g.game.enterVehicle(eid); g.inp.setAxis('throttle', 1);
  for (let i = 0; i < 60 * 12; i++) { g.inp.setAxis('throttle', 1); frame(g); }
  const owned = g.sim.select('veh.owned')[0]; assert.ok(owned.odo > 0.02, 'odometer ' + owned.odo); assert.ok(owned.fuel < 12);
  g.game.exitVehicle(); assert.equal(g.sim.cmd('veh.sell', { vehId: v.data.vehId }).ok, true);
  assert.equal(g.game.economy.entityOf.has(v.data.vehId), false); invariant(g.sim);
});
test('veh.deliver brings an owned vehicle (existing or not yet spawned) next to the player; veh.tow moves it to a fuel stop; busy while driven', () => {
  const g = boot(); g.sim.cmd('debug.grant', { cents: 3000000 }); g.game.teleport(World.poi('poi.city.bank').pos); g.sim.cmd('bank.deposit', { amount: 2000000 });
  g.game.teleport(World.poi('poi.city.usedcars').pos);
  const v = g.sim.cmd('veh.buy', { modelId: 'veh.hatch_used', used: true, poiId: 'poi.city.usedcars', payFrom: 'card' }); assert.equal(v.ok, true, JSON.stringify(v));
  const eid = g.game.economy.entityOf.get(v.data.vehId), ent = g.game.entities.get(eid);
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]);
  // far away: delivery moves the same entity to within 20 m of the player and records the position in the sim
  const far = World.poi('poi.city.hardware').pos; g.game.teleport(far);
  assert.ok(dist(ent.pos, far) > 30, 'vehicle starts away from the player');
  const d = g.sim.cmd('veh.deliver', { vehId: v.data.vehId }); assert.equal(d.ok, true, JSON.stringify(d)); g.bus.flush();
  { const rs = g.game.roadSpot(far[0], far[2]); assert.ok(rs && dist(ent.pos, far) < 90, 'delivered to the nearest road beside the player: ' + dist(ent.pos, far).toFixed(1) + ' m'); }
  const rec = g.sim.select('veh.owned').find((x) => x.id === v.data.vehId); assert.ok(rec.pos && dist(rec.pos, ent.pos) < 1, 'sim keeps the delivered position');
  // a vehicle that is not in the world yet (loaded from a save) is spawned at the destination
  g.game.economy.entityOf.delete(v.data.vehId); g.game.vehicles.delete(eid); g.game.entities.destroy(eid);
  g.game.teleport(World.poi('poi.city.cityhall').pos); g.sim.cmd('veh.deliver', { vehId: v.data.vehId }); g.bus.flush();
  const eid2 = g.game.economy.entityOf.get(v.data.vehId); assert.ok(eid2 !== undefined, 'spawned by delivery'); assert.ok(dist(g.game.entities.get(eid2).pos, World.poi('poi.city.cityhall').pos) < 70);
  // tow: to the nearest fuel stop, with fuel in the tank
  g.sim.ctx.state.vehicles[0].fuel = 0; g.game.teleport(World.poi('poi.lake.store').pos); g.sim.cmd('veh.tow', { vehId: v.data.vehId }); g.bus.flush();
  const e3 = g.game.entities.get(g.game.economy.entityOf.get(v.data.vehId)); const fuels = World.pois({ type: 'fuel' }).map((q) => dist(q.pos, e3.pos)); assert.ok(Math.min(...fuels) < 30, 'towed to a fuel stop: ' + Math.min(...fuels).toFixed(1) + ' m');
  assert.ok(g.sim.select('veh.owned')[0].fuel >= 5);
  // driving it blocks both services
  g.game.enterVehicle(g.game.economy.entityOf.get(v.data.vehId)); assert.equal(g.sim.cmd('veh.deliver', { vehId: v.data.vehId }).error, 'ERR.BUSY'); assert.equal(g.sim.cmd('veh.tow', { vehId: v.data.vehId }).error, 'ERR.BUSY');
  invariant(g.sim);
});
test('tutorial: walking and opening the jobs app in the live Game advance the sim tutorial', () => {
  const g = boot(); g.game.update(1 / 60, 0); g.sim.ctx.tutorial.evaluate();
  assert.equal(g.sim.select('tutorial.state').current.id, 'tut.move');
  g.inp.setAxis('moveY', 1); for (let i = 0; i < 60 * 14; i++) { g.inp.setAxis('moveY', 1); frame(g); }
  assert.equal(g.sim.select('tutorial.state').current.id, 'tut.jobs', 'twelve footsteps of walking completed the first step');
  g.bus.emit('ui:open', { screen: 'scr.phone.jobs' }); assert.equal(g.sim.select('tutorial.state').current.id, 'tut.shift');
});
