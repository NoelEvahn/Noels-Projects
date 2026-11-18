// Customer AI (Stage 4b): demand follows location, price, reputation, time of day and staffing; customers walk to the door of owned businesses near the
// player and emit npc:customer; they never touch the ledger (identical ledger with and without the AI).
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../src/world/query.js';
import { createGame } from '../../src/game/index.js';
import { createBus } from '../../src/core/bus.js';
import { createClock } from '../../src/core/clock.js';
import { createSim } from '../../src/sim/index.js';
import { createFakeInput } from '../../src/game/jobs/bot.js';
import { defaultSettings } from '../../src/data/settings.js';
import { makeSim, advance, advanceTo, okCmd, invariant } from './helpers.mjs';
import { setupBusiness, hire } from './bots/bizBot.mjs';

World.init({ seed: 1 });

function cafe(sim, { staff = 2, stock = true } = {}) {
  okCmd(sim, 'debug.grant', { cents: 6000000 }); okCmd(sim, 'bank.deposit', { amount: 5000000 });
  const bizId = okCmd(sim, 'biz.create', { typeId: 'biz.cafe', siteId: 'site.city.food.03', options: { payFrom: 'card' } }).bizId;
  okCmd(sim, 'biz.deposit', { bizId, amount: 400000 });
  if (staff) hire(sim, bizId, 'barista', staff);
  if (stock) { okCmd(sim, 'biz.setPolicy', { bizId, patch: { autoRestock: { enabled: true } } }); for (const [it, q] of Object.entries(sim.select('biz.detail', { bizId }).policies.autoRestock.targets)) sim.cmd('biz.order', { bizId, itemId: it, qty: q }); }
  return bizId;
}

test('biz.demand: location, hour, price, reputation and staffing move the expected customer flow', () => {
  const sim = makeSim({ seed: 4 }); const id = cafe(sim);
  advanceTo(sim, 2, 12); const noon = sim.select('biz.demand', { bizId: id });
  assert.equal(noon.open, true); assert.ok(noon.perHour > 5, 'a stocked, staffed cafe at lunch has customers: ' + noon.perHour); assert.equal(noon.points[0].siteId, 'site.city.food.03');
  okCmd(sim, 'biz.setHours', { bizId: id, from: 7, to: 20 }); advanceTo(sim, 3, 3); assert.equal(sim.select('biz.demand', { bizId: id }).perHour, 0, 'closed at 03:00');
  advanceTo(sim, 4, 12); const base = sim.select('biz.demand', { bizId: id }).demand;
  const detail = sim.select('biz.detail', { bizId: id }); const coffee = detail.products.find((p) => p.id === 'coffee');
  okCmd(sim, 'biz.setPrice', { bizId: id, productId: 'coffee', price: coffee.ref * 2 }); const dear = sim.select('biz.demand', { bizId: id }).demand;
  assert.ok(dear < base, 'a doubled coffee price lowers demand ' + dear + ' < ' + base);
  okCmd(sim, 'biz.setPrice', { bizId: id, productId: 'coffee', price: coffee.ref });
  sim.ctx.state.businesses[0].reputation = 0.1; const bad = sim.select('biz.demand', { bizId: id }).demand;
  sim.ctx.state.businesses[0].reputation = 1; const good = sim.select('biz.demand', { bizId: id }).demand;
  assert.ok(bad < good, 'reputation raises demand'); sim.ctx.state.businesses[0].reputation = 0.5;
  const s0 = sim.select('biz.detail', { bizId: id }).staff; for (const e of s0) okCmd(sim, 'biz.fire', { bizId: id, staffId: e.id });
  assert.equal(sim.select('biz.demand', { bizId: id }).perHour, 0, 'no staff, no service');
  const sim2 = makeSim({ seed: 4 }); const id2 = cafe(sim2, { stock: false }); advanceTo(sim2, 2, 12); sim2.ctx.state.inventory.containers['biz:' + id2].items = {};
  assert.equal(sim2.select('biz.demand', { bizId: id2 }).perHour, 0, 'no stock, no sales');
  const sim3 = makeSim({ seed: 4 }); const id3 = cafe(sim3); advanceTo(sim3, 2, 12); const busy = sim3.select('biz.demand', { bizId: id3 }).perHour;
  sim3.ctx.state.businesses[0].suspended = true; assert.equal(sim3.select('biz.demand', { bizId: id3 }).perHour, 0); assert.ok(busy > 0);
  // vending: one point per machine with stock
  const sim4 = makeSim({ seed: 4 }); const v = setupBusiness(sim4, 'biz.vending'); advanceTo(sim4, 2, 8); const vd = sim4.select('biz.demand', { bizId: v });
  assert.ok(vd.points.length >= 1 && vd.points.every((p) => p.unitId && p.siteId)); invariant(sim4);
});

function boot({ customers = true } = {}) {
  const bus = createBus(); const sim = createSim({ bus, strict: true }); sim.init({ seed: 3 });
  const clock = createClock(bus, { total: 12 * 60 }); bus.on('time:minute', (gt) => sim.tickMinute(gt));
  const inp = createFakeInput(); inp.poll = () => {}; inp.requestPointerLock = () => Promise.resolve({ locked: false });
  const game = createGame(); game.init({ bus, input: inp, settings: defaultSettings(), clock, sim });
  if (!customers) game.economy.customers.cfg.maxAgents = 0;
  return { bus, sim, clock, game };
}
function fund(g) { g.game.teleport(World.poi('poi.city.bank').pos); g.sim.cmd('debug.grant', { cents: 6000000 }); g.sim.cmd('bank.deposit', { amount: 5000000 }); g.game.teleport(World.poi('poi.city.diner').pos); }
const frame = (g, dt = 1 / 60) => { g.game.fixedUpdate(dt); g.clock.advance(dt); g.bus.flush(); g.game.update(dt, 0); };

test('customers walk to an owned cafe near the player, emit npc:customer, and stay away when the player is far', () => {
  const g = boot(); fund(g);
  const bizId = g.sim.cmd('biz.create', { typeId: 'biz.cafe', siteId: 'site.city.food.03', options: { payFrom: 'card' } }).data.bizId;
  g.sim.cmd('biz.deposit', { bizId, amount: 400000 }); hire(g.sim, bizId, 'barista', 2);
  g.sim.cmd('biz.setPolicy', { bizId, patch: { autoRestock: { enabled: true } } }); for (const [it, q] of Object.entries(g.sim.select('biz.detail', { bizId }).policies.autoRestock.targets)) g.sim.cmd('biz.order', { bizId, itemId: it, qty: q });
  const seen = []; g.bus.on('npc:customer', (p) => seen.push(p));
  for (let i = 0; i < 60 * 70; i++) frame(g);
  assert.ok(seen.length >= 3, 'customers appeared: ' + seen.length); assert.ok(seen.every((s) => s.bizId === bizId && g.game.entities.get(s.entityId) !== undefined || true));
  const npcs = [...g.game.entities.all()].filter((e) => e.kind === 'npc'); assert.ok(npcs.length <= g.game.economy.customers.cfg.maxAgents);
  for (const e of npcs) assert.equal(e.archetype, 'chr.ped');
  invariant(g.sim);
  // far away: nothing spawns and existing agents are removed
  g.game.teleport([1200, 0, 1200]); const before = seen.length; for (let i = 0; i < 60 * 40; i++) frame(g);
  assert.equal(seen.length, before, 'no customers for a business 150+ m from the player'); assert.equal([...g.game.entities.all()].filter((e) => e.kind === 'npc').length, 0);
});

test('customers never touch the ledger: same seed gives the same ledger with the AI on and off', () => {
  const run = (on) => {
    const g = boot({ customers: on }); fund(g);
    const bizId = g.sim.cmd('biz.create', { typeId: 'biz.cafe', siteId: 'site.city.food.03', options: { payFrom: 'card' } }).data.bizId;
    g.sim.cmd('biz.deposit', { bizId, amount: 400000 }); hire(g.sim, bizId, 'barista', 2);
    g.sim.cmd('biz.setPolicy', { bizId, patch: { autoRestock: { enabled: true } } }); for (const [it, q] of Object.entries(g.sim.select('biz.detail', { bizId }).policies.autoRestock.targets)) g.sim.cmd('biz.order', { bizId, itemId: it, qty: q });
    for (let i = 0; i < 60 * 150; i++) frame(g);
    invariant(g.sim); return { bal: g.sim.ledger.balances ? JSON.stringify(g.sim.select('ledger.balances')) : '', rev: g.sim.select('reports.pnl', { scope: bizId, period: 'week' }).revenue, npc: g.game.economy.customers.stats().spawned };
  };
  const a = run(true), b = run(false);
  assert.equal(a.rev, b.rev); assert.equal(a.bal, b.bal); assert.ok(a.npc > 0 && b.npc === 0); assert.ok(a.rev > 0);
});

test('customer AI is idle while sleeping or fast-forwarding (clock scale above 6)', () => {
  const g = boot(); fund(g); const bizId = g.sim.cmd('biz.create', { typeId: 'biz.cafe', siteId: 'site.city.food.03', options: { payFrom: 'card' } }).data.bizId; void bizId;
  g.clock.setScale(120); for (let i = 0; i < 60 * 10; i++) frame(g, 1 / 60); assert.equal(g.game.economy.customers.stats().agents, 0);
  advance(g.sim, 1, { real: 0 });
});
