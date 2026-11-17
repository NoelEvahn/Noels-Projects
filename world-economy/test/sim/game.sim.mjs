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
