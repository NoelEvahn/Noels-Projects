// staffAssist wiring (Stage 4b): a hands-on owner shift lifts the business's hours (capacity of one skilled worker + quality), pays no wage,
// and runs through Game.jobs.startOwn with the real controller and the business's door as the work location.
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../../src/world/query.js';
import { createGame } from '../../src/game/index.js';
import { createBus } from '../../src/core/bus.js';
import { createClock } from '../../src/core/clock.js';
import { createSim } from '../../src/sim/index.js';
import { createFakeInput, botTick } from '../../src/game/jobs/bot.js';
import { runShift } from '../../src/game/jobs/bot.js';
import { defaultSettings } from '../../src/data/settings.js';
import { makeSim, advance, advanceTo, okCmd, invariant } from './helpers.mjs';
import { hire } from './bots/bizBot.mjs';

World.init({ seed: 1 });

function understaffedShop(sim) {
  okCmd(sim, 'debug.grant', { cents: 6000000 }); okCmd(sim, 'bank.deposit', { amount: 5000000 });
  const bizId = okCmd(sim, 'biz.create', { typeId: 'biz.retail', siteId: 'site.city.shop.01', options: { payFrom: 'card', assortment: 'convenience' } }).bizId;
  okCmd(sim, 'biz.deposit', { bizId, amount: 900000 }); hire(sim, bizId, 'clerk', 1);
  okCmd(sim, 'biz.setHours', { bizId, from: 6, to: 22 });
  for (const p of sim.select('biz.detail', { bizId }).products) okCmd(sim, 'biz.setPrice', { bizId, productId: p.id, price: Math.round(p.ref * 0.7) });   // promo prices: more shoppers than one clerk can serve
  okCmd(sim, 'biz.setPolicy', { bizId, patch: { autoRestock: { enabled: true } } });
  for (const [it, q] of Object.entries(sim.select('biz.detail', { bizId }).policies.autoRestock.targets)) sim.cmd('biz.order', { bizId, itemId: it, qty: q * 3 });
  return bizId;
}

test('an owner shift at the midday rush raises the shop day (one skilled worker more) and pays no wage', () => {
  const day = (own) => {
    const sim = makeSim({ seed: 12, bus: true }); const id = understaffedShop(sim);
    advanceTo(sim, 1, 10); const before = sim.select('biz.detail', { bizId: id }).stats.today;
    if (own) { const r = runShift({ sim, jobId: 'x', ownBiz: id, style: 'good', pace: 1, scoreScale: 0.9, minutes: 240, bus: sim.bus, onMinute: () => advance(sim, 1, { real: 0 }) }); assert.ok(r.ok && r.summary && r.summary.assistHours >= 2, JSON.stringify(r)); }
    else advance(sim, 240, { real: 0 });
    invariant(sim);
    advanceTo(sim, 2, 0);
    const d = sim.select('biz.detail', { bizId: id }).stats.days.find((x) => x.day === 1); void before;
    return d;
  };
  const a = day(false), b = day(true);
  assert.ok(b.revenue > a.revenue * 1.05, 'owner shift raises the day: ' + b.revenue + ' vs ' + a.revenue); assert.ok(b.customers > a.customers);
});

test('Game.jobs.startOwn: real controller at the business door, bot plays it, assist booked, no wage, ledger intact', () => {
  const bus = createBus(); const sim = createSim({ bus, strict: true }); sim.init({ seed: 5 });
  const clock = createClock(bus, { total: 9 * 60 }); bus.on('time:minute', (gt) => sim.tickMinute(gt));
  const inp = createFakeInput(); inp.poll = () => {}; inp.requestPointerLock = () => Promise.resolve({ locked: false });
  const game = createGame(); game.init({ bus, input: inp, settings: defaultSettings(), clock, sim });
  game.teleport(World.poi('poi.city.bank').pos); sim.cmd('debug.grant', { cents: 6000000 }); sim.cmd('bank.deposit', { amount: 5000000 });
  const bizId = okCmd(sim, 'biz.create', { typeId: 'biz.cafe', siteId: 'site.city.food.03', options: { payFrom: 'card' } }).bizId;
  okCmd(sim, 'biz.deposit', { bizId, amount: 300000 }); okCmd(sim, 'biz.setHours', { bizId, from: 6, to: 22 }); hire(sim, bizId, 'barista', 1);
  assert.equal(game.jobs.startOwn(bizId).error, 'ERR.OUT_OF_RANGE', 'must stand at the business');
  game.teleport(World.poi('poi.city.diner').pos);
  const r = game.jobs.startOwn(bizId); assert.equal(r.ok, true, JSON.stringify(r)); assert.ok(game.jobs.active);
  const cash0 = sim.ledger.balance('cash'); const st = { cool: 0 }; let ended = null; bus.on('job:shiftEnd', (p) => { ended = p; });
  for (let i = 0; i < 60 * 60 * 3 && game.jobs.active; i++) {
    const c = game.jobs.controller; botTick(c, inp, { pos: () => game.playerPos(), mode: () => 'foot', poi: (id) => game.economy.poiPos(id), teleport: (p) => game.teleport(p), setMode() {} }, 'good', st, 1 / 60);
    game.fixedUpdate(1 / 60); clock.advance(1 / 60); bus.flush(); game.update(1 / 60, 0);
  }
  game.jobs.stop(); bus.flush(); assert.ok(ended && ended.summary.own === bizId, 'shift ended with an owner summary'); assert.ok(ended.summary.tasks >= 1);
  assert.equal(sim.ledger.balance('cash'), cash0, 'owner shift pays no wage'); invariant(sim);
});
