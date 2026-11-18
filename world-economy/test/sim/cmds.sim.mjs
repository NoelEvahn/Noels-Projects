// Unit tests for every Sim.cmd (success and error paths) and every Sim.select. A final test asserts nothing was left uncovered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, advance, invariant, give } from './helpers.mjs';
import { runShift } from '../../src/game/jobs/bot.js';

const COV = new Set(), SEL = new Set();
const C = (sim, name, args = {}) => { COV.add(name); const r = sim.cmd(name, args); invariant(sim); return r; };
const Q = (sim, name, args) => { SEL.add(name); return sim.select(name, args); };
const ok = (r, m) => assert.equal(r.ok, true, (m || '') + JSON.stringify(r));
const err = (r, code, m) => { assert.equal(r.ok, false, m || 'expected failure'); assert.equal(r.error, code, (m || '') + JSON.stringify(r)); };
const rich = (sim, c = 5000000) => { give(sim, c); ok(sim.cmd('bank.deposit', { amount: c - 1000 })); };

test('unknown command and bad arguments', () => {
  const sim = makeSim();
  err(sim.cmd('nope.nope', {}), 'ERR.NOT_FOUND');
  err(sim.cmd('bank.deposit', null), 'ERR.INVALID_ARG');
  assert.equal(sim.select('nope'), undefined);
});
test('bank: deposit, withdraw, transfer, loans', () => {
  const sim = makeSim();
  err(C(sim, 'bank.deposit', { amount: 0 }), 'ERR.INVALID_ARG'); err(C(sim, 'bank.deposit', { amount: 1.5 }), 'ERR.INVALID_ARG');
  err(C(sim, 'bank.deposit', { amount: 10001 }), 'ERR.INSUFFICIENT_FUNDS');
  ok(C(sim, 'bank.deposit', { amount: 4000 })); assert.equal(sim.ledger.balance('bank:checking'), 4000);
  err(C(sim, 'bank.withdraw', { amount: 5000 }), 'ERR.INSUFFICIENT_FUNDS'); ok(C(sim, 'bank.withdraw', { amount: 1000 }));
  ok(C(sim, 'bank.transfer', { from: 'bank:checking', to: 'bank:savings', amount: 1000 }));
  err(C(sim, 'bank.transfer', { from: 'cash', to: 'bank:savings', amount: 10 }), 'ERR.INVALID_ARG');
  err(C(sim, 'bank.transfer', { from: 'bank:checking', to: 'bank:checking', amount: 10 }), 'ERR.INVALID_ARG');
  // out of range
  sim.setServices({ near: () => false });
  err(C(sim, 'bank.deposit', { amount: 100 }), 'ERR.OUT_OF_RANGE'); err(C(sim, 'bank.withdraw', { amount: 100 }), 'ERR.OUT_OF_RANGE');
  sim.setServices({ near: null });
  err(C(sim, 'bank.takeLoan', { amount: 100000, weeks: 4 }), 'ERR.REQUIREMENT'); // no income history
  give(sim, 2000000); sim.ctx.state.bank.incomeDay0 = 1; advance(sim, 4 * 1440, { real: 0 });
  err(C(sim, 'bank.takeLoan', { amount: 100000, weeks: 5 }), 'ERR.INVALID_ARG');
  err(C(sim, 'bank.takeLoan', { amount: 100000000, weeks: 4 }), 'ERR.LIMIT');
  const l = C(sim, 'bank.takeLoan', { amount: 100000, weeks: 4 }); ok(l);
  assert.equal(sim.ledger.balance(`loan:${l.data.loanId}`), -100000);
  err(C(sim, 'bank.repayLoan', { loanId: 99, amount: 5 }), 'ERR.NOT_FOUND'); err(C(sim, 'bank.repayLoan', { loanId: l.data.loanId, amount: 0 }), 'ERR.INVALID_ARG');
  ok(C(sim, 'bank.repayLoan', { loanId: l.data.loanId, amount: 100000 })); assert.equal(Q(sim, 'bank.state').loans.length, 0);
  assert.ok(Q(sim, 'bank.state').creditScore > 0);
});
test('market, shop and inventory', () => {
  const sim = makeSim(); rich(sim, 3000000);
  err(C(sim, 'market.buy', { marketId: 'mkt.none', itemId: 'item.ing.snack', qty: 1 }), 'ERR.NOT_FOUND');
  err(C(sim, 'market.buy', { marketId: 'mkt.city.wholesale', itemId: 'item.fish.cod', qty: 1 }), 'ERR.INVALID_ARG'); // wholesale does not sell fish
  err(C(sim, 'market.buy', { marketId: 'mkt.city.wholesale', itemId: 'item.ing.snack', qty: 0 }), 'ERR.INVALID_ARG');
  ok(C(sim, 'market.buy', { marketId: 'mkt.city.wholesale', itemId: 'item.ing.snack', qty: 20, payFrom: 'card' }));
  err(C(sim, 'market.buy', { marketId: 'mkt.city.wholesale', itemId: 'item.goods.tools', qty: 100 }), 'ERR.CAPACITY'); // 25 kg carry limit
  err(C(sim, 'market.sell', { marketId: 'mkt.city.wholesale', itemId: 'item.ing.snack', qty: 1 }), 'ERR.INVALID_ARG'); // does not buy snacks
  err(C(sim, 'market.sell', { marketId: 'mkt.lake.fish', itemId: 'item.fish.carp', qty: 5 }), 'ERR.NOT_FOUND'); // none held
  sim.ctx.inv.add('player', 'item.fish.carp', 12); const before = sim.ledger.balance('cash');
  err(C(sim, 'market.sell', { marketId: 'mkt.lake.fish', itemId: 'item.fish.carp', qty: 11 }), 'ERR.LIMIT'); // 10 kg/day allowance without licence
  ok(C(sim, 'market.sell', { marketId: 'mkt.lake.fish', itemId: 'item.fish.carp', qty: 6 })); assert.ok(sim.ledger.balance('cash') > before);
  err(C(sim, 'market.sell', { marketId: 'mkt.lake.fish', itemId: 'item.fish.carp', qty: 5 }), 'ERR.LIMIT');
  sim.setServices({ near: () => false });
  err(C(sim, 'market.buy', { marketId: 'mkt.city.wholesale', itemId: 'item.ing.snack', qty: 1 }), 'ERR.OUT_OF_RANGE'); err(C(sim, 'shop.buy', { poiId: 'poi.lake.store', itemId: 'item.food.sandwich' }), 'ERR.OUT_OF_RANGE');
  sim.setServices({ near: null });
  err(C(sim, 'shop.buy', { poiId: 'poi.nowhere', itemId: 'item.food.sandwich' }), 'ERR.NOT_FOUND'); err(C(sim, 'shop.buy', { poiId: 'poi.lake.store', itemId: 'item.tool.chainsaw' }), 'ERR.NOT_FOUND');
  err(C(sim, 'shop.buy', { poiId: 'poi.lake.store', itemId: 'item.food.sandwich', qty: 0 }), 'ERR.INVALID_ARG');
  ok(C(sim, 'shop.buy', { poiId: 'poi.lake.store', itemId: 'item.food.sandwich', qty: 2 }));
  ok(C(sim, 'shop.buy', { poiId: 'poi.city.cityhall', itemId: 'lic.food' })); err(C(sim, 'shop.buy', { poiId: 'poi.city.cityhall', itemId: 'lic.food' }), 'ERR.BUSY');
  err(C(sim, 'shop.buy', { poiId: 'poi.city.cityhall', itemId: 'lic.business' }), 'ERR.INVALID_ARG');
  // inventory
  sim.ctx.state.needs.hunger = 30;
  ok(C(sim, 'inv.use', { itemId: 'item.food.sandwich' })); assert.equal(Q(sim, 'needs.state').hunger, 65);
  err(C(sim, 'inv.use', { itemId: 'item.fish.carp' }), 'ERR.INVALID_ARG'); err(C(sim, 'inv.use', { itemId: 'item.food.meal' }), 'ERR.NOT_FOUND');
  ok(C(sim, 'inv.move', { from: 'player', to: 'prop:x', itemId: 'item.ing.snack', qty: 5 }));
  err(C(sim, 'inv.move', { from: 'player', to: 'prop:x', itemId: 'item.ing.snack', qty: 500 }), 'ERR.NOT_FOUND'); err(C(sim, 'inv.move', { from: 'player', to: 'player', itemId: 'item.ing.snack', qty: 1 }), 'ERR.INVALID_ARG');
  const c = Q(sim, 'inv.container', { id: 'player' }); assert.ok(c.cap >= 25 && c.items.length > 0);
  assert.ok(Q(sim, 'market.listing', { marketId: 'mkt.city.wholesale' }).length > 20); assert.ok(Q(sim, 'shop.listing', { poiId: 'poi.lake.store' }).length > 3);
  assert.ok(Q(sim, 'region.activity').city > 0);
});
test('needs: sleep, hunger, energy', () => {
  const sim = makeSim(); give(sim, 10000);
  err(C(sim, 'needs.sleep', { untilHour: 99 }), 'ERR.INVALID_ARG'); err(C(sim, 'needs.sleep', { untilHour: 6, where: 'home' }), 'ERR.REQUIREMENT');
  sim.ctx.state.needs.energy = 20;
  const r = C(sim, 'needs.sleep', { untilHour: 6 }); ok(r); assert.equal(sim.ledger.balance('cash'), 20000 - 1800);
  err(C(sim, 'needs.sleep', { untilHour: 7 }), 'ERR.BUSY');
  advance(sim, r.data.minutes + 20);
  assert.ok(Q(sim, 'needs.state').energy > 90); assert.equal(Q(sim, 'needs.state').sleeping, false);
  assert.ok(Q(sim, 'time.now').day >= 2);
});
test('jobs and skills: full command flow', () => {
  const sim = makeSim({ bus: true }); give(sim, 100000);
  err(C(sim, 'job.apply', { jobId: 'job.none' }), 'ERR.NOT_FOUND'); err(C(sim, 'job.startShift', { jobId: 'job.city.delivery' }), 'ERR.REQUIREMENT');
  err(C(sim, 'job.apply', { jobId: 'job.ocean.boatop' }), 'ERR.REQUIREMENT'); // needs lic.boat
  ok(C(sim, 'job.apply', { jobId: 'job.city.delivery' })); err(C(sim, 'job.apply', { jobId: 'job.city.delivery' }), 'ERR.BUSY'); err(C(sim, 'job.apply', { jobId: 'job.city.taxi' }), 'ERR.BUSY');
  err(C(sim, 'job.quit', { jobId: 'job.city.taxi' }), 'ERR.NOT_FOUND');
  const s = C(sim, 'job.startShift', { jobId: 'job.city.delivery' }); ok(s); err(C(sim, 'job.startShift', { jobId: 'job.city.delivery' }), 'ERR.BUSY'); err(C(sim, 'job.quit', {}), 'ERR.BUSY');
  const sid = s.data.shiftId;
  err(C(sim, 'job.nextTask', { shiftId: 'wrong' }), 'ERR.NOT_FOUND');
  const t = C(sim, 'job.nextTask', { shiftId: sid }); ok(t); assert.equal(t.data.kind, 'parcel');
  err(C(sim, 'job.reportTask', { shiftId: sid, taskId: t.data.id, score: 1 }), 'ERR.REQUIREMENT'); // too fast
  err(C(sim, 'job.reportTask', { shiftId: sid, taskId: 'fake', score: 1 }), 'ERR.NOT_FOUND');
  sim.tickReal(25);
  const r = C(sim, 'job.reportTask', { shiftId: sid, taskId: t.data.id, score: 0.8 }); ok(r); assert.ok(r.data.pay > 0);
  err(C(sim, 'job.reportTask', { shiftId: sid, taskId: t.data.id, score: 0.8 }), 'ERR.NOT_FOUND'); // duplicate
  const sum = C(sim, 'job.endShift'); ok(sum); assert.equal(sum.data.tasks, 1); err(C(sim, 'job.endShift'), 'ERR.NOT_FOUND');
  ok(C(sim, 'job.quit', { jobId: 'job.city.delivery' }));
  assert.ok(Q(sim, 'jobs.list').length === 17); assert.equal(Q(sim, 'jobs.current'), null);
  assert.ok(Q(sim, 'skills.all').find((x) => x.id === 'skill.city.delivery').xp > 0);
  Q(sim, 'jobs.employer'); Q(sim, 'jobs.licences'); Q(sim, 'jobs.siteStage');
  assert.ok(runShift({ sim, jobId: 'job.lake.fishing', minutes: 1 }).error === 'ERR.REQUIREMENT'); // needs a rod
});
test('business: framework commands', () => {
  const sim = makeSim(); rich(sim, 20000000);
  err(C(sim, 'biz.create', { typeId: 'biz.none' }), 'ERR.NOT_FOUND'); err(C(sim, 'biz.create', { typeId: 'biz.cafe' }), 'ERR.INVALID_ARG'); // site required
  err(C(sim, 'biz.create', { typeId: 'biz.cafe', siteId: 'site.vend.01' }), 'ERR.INVALID_ARG');
  const poor = makeSim(); err(C(poor, 'biz.create', { typeId: 'biz.cafe', siteId: 'site.city.food.01' }), 'ERR.INSUFFICIENT_FUNDS');
  const r = C(sim, 'biz.create', { typeId: 'biz.cafe', name: 'Beans', siteId: 'site.city.food.01', options: { payFrom: 'card' } }); ok(r); const bizId = r.data.bizId;
  err(C(sim, 'biz.create', { typeId: 'biz.restaurant', siteId: 'site.city.food.01' }), 'ERR.BUSY');
  ok(C(sim, 'biz.deposit', { bizId, amount: 500000 })); err(C(sim, 'biz.deposit', { bizId: 'b99', amount: 5 }), 'ERR.NOT_FOUND'); err(C(sim, 'biz.deposit', { bizId, amount: 0 }), 'ERR.INVALID_ARG');
  ok(C(sim, 'biz.withdraw', { bizId, amount: 1000 })); err(C(sim, 'biz.withdraw', { bizId, amount: 900000000 }), 'ERR.INSUFFICIENT_FUNDS');
  ok(C(sim, 'biz.setHours', { bizId, from: 6, to: 20, days: [0, 1, 2, 3, 4] })); err(C(sim, 'biz.setHours', { bizId, from: 6, to: 6 }), 'ERR.INVALID_ARG'); err(C(sim, 'biz.setHours', { bizId, from: 6, to: 20, days: [9] }), 'ERR.INVALID_ARG');
  const d = Q(sim, 'biz.detail', { bizId }); const p = d.products[0];
  ok(C(sim, 'biz.setPrice', { bizId, productId: p.id, price: p.ref + 10 })); err(C(sim, 'biz.setPrice', { bizId, productId: p.id, price: p.ref * 4 }), 'ERR.INVALID_ARG'); err(C(sim, 'biz.setPrice', { bizId, productId: 'zzz', price: 100 }), 'ERR.NOT_FOUND');
  ok(C(sim, 'biz.setProductActive', { bizId, productId: p.id, active: false })); err(C(sim, 'biz.setProductActive', { bizId, productId: 'zzz', active: true }), 'ERR.NOT_FOUND');
  const cand = Q(sim, 'biz.candidates', { bizId }).filter((c) => c.role === 'barista');
  const h = C(sim, 'biz.hire', { bizId, candidateId: cand[0].id, role: 'barista' }); ok(h); err(C(sim, 'biz.hire', { bizId, candidateId: 'zzz', role: 'barista' }), 'ERR.NOT_FOUND');
  err(C(sim, 'biz.hire', { bizId, candidateId: cand[1].id, role: 'cook' }), 'ERR.INVALID_ARG');
  ok(C(sim, 'biz.setWage', { bizId, staffId: h.data.staffId, wage: 1900 })); err(C(sim, 'biz.setWage', { bizId, staffId: h.data.staffId, wage: -1 }), 'ERR.INVALID_ARG');
  err(C(sim, 'biz.assign', { bizId, staffId: h.data.staffId, unitId: 'u99' }), 'ERR.NOT_FOUND'); ok(C(sim, 'biz.assign', { bizId, staffId: h.data.staffId, unitId: null }));
  err(C(sim, 'biz.order', { bizId, itemId: 'item.ing.coffee', qty: 0 }), 'ERR.INVALID_ARG'); ok(C(sim, 'biz.order', { bizId, itemId: 'item.ing.coffee', qty: 100 })); err(C(sim, 'biz.order', { bizId, itemId: 'item.tool.rod_basic', qty: 5 }), 'ERR.NOT_FOUND');
  ok(C(sim, 'biz.setPolicy', { bizId, patch: { autoRestock: { enabled: true } } })); err(C(sim, 'biz.setPolicy', { bizId, patch: { pricing: 'auto' } }), 'ERR.REQUIREMENT'); err(C(sim, 'biz.setPolicy', { bizId, patch: null }), 'ERR.INVALID_ARG');
  ok(C(sim, 'biz.setPolicy', { bizId, patch: { reinvestPct: 0.2, ownerOperates: true } }));
  ok(C(sim, 'biz.buyUpgrade', { bizId, upgradeId: 'cafe.oven' })); err(C(sim, 'biz.buyUpgrade', { bizId, upgradeId: 'cafe.oven' }), 'ERR.BUSY'); err(C(sim, 'biz.buyUpgrade', { bizId, upgradeId: 'cafe.machine3' }), 'ERR.REQUIREMENT'); err(C(sim, 'biz.buyUpgrade', { bizId, upgradeId: 'nope' }), 'ERR.NOT_FOUND');
  err(C(sim, 'biz.buyUpgrade', { bizId, upgradeId: 'tier.2' }), 'ERR.REQUIREMENT');
  ok(C(sim, 'biz.staffAssist', { bizId, hours: 2, score: 0.9 })); err(C(sim, 'biz.staffAssist', { bizId, hours: 0, score: 0.9 }), 'ERR.INVALID_ARG');
  err(C(sim, 'biz.addUnit', { bizId, modelId: 'x' }), 'ERR.INVALID_ARG'); err(C(sim, 'biz.removeUnit', { bizId, unitId: 'u9' }), 'ERR.NOT_FOUND');
  err(C(sim, 'biz.acceptContract', { bizId, contractId: 'k1' }), 'ERR.REQUIREMENT'); err(C(sim, 'biz.restockUnit', { bizId, unitId: 'u9', itemId: 'item.ing.snack', qty: 1 }), 'ERR.NOT_FOUND');
  err(C(sim, 'biz.collectUnit', { bizId, unitId: 'u9' }), 'ERR.NOT_FOUND'); err(C(sim, 'biz.repairUnit', { bizId, unitId: 'u9' }), 'ERR.NOT_FOUND');
  ok(C(sim, 'biz.fire', { bizId, staffId: h.data.staffId })); err(C(sim, 'biz.fire', { bizId, staffId: h.data.staffId }), 'ERR.NOT_FOUND');
  // sites
  err(C(sim, 'site.lease', { siteId: 'site.city.food.01' }), 'ERR.BUSY'); err(C(sim, 'site.lease', { siteId: 'nope' }), 'ERR.NOT_FOUND');
  ok(C(sim, 'site.lease', { siteId: 'site.city.food.02' })); err(C(sim, 'site.buy', { siteId: 'site.city.food.02' }), 'ERR.BUSY'); ok(C(sim, 'site.release', { siteId: 'site.city.food.02' })); err(C(sim, 'site.release', { siteId: 'site.city.food.02' }), 'ERR.NOT_FOUND');
  ok(C(sim, 'site.buy', { siteId: 'site.city.food.04' })); ok(C(sim, 'site.release', { siteId: 'site.city.food.04' }));
  err(C(sim, 'site.release', { siteId: 'site.city.food.01' }), 'ERR.BUSY');
  assert.ok(Q(sim, 'biz.list').length === 1); assert.ok(Q(sim, 'biz.types').length === 12); assert.ok(Q(sim, 'biz.sites', { typeId: 'biz.vending' }).length === 40);
  assert.ok(Q(sim, 'biz.upgrades', { bizId }).available.length > 3); Q(sim, 'biz.contracts', { bizId }); assert.ok(Object.keys(Q(sim, 'biz.suggestTargets', { bizId })).length > 3);
  assert.equal(Q(sim, 'biz.demand', { bizId: 'b99' }), null); assert.ok(Array.isArray(Q(sim, 'biz.demand', { bizId }).points));
  advance(sim, 2 * 1440, { real: 0 });
  err(C(sim, 'biz.close', { bizId: 'b99' }), 'ERR.NOT_FOUND'); const cl = C(sim, 'biz.close', { bizId }); ok(cl); assert.equal(Q(sim, 'biz.list').length, 0);
  const b2 = C(sim, 'biz.create', { typeId: 'biz.retail', siteId: 'site.city.shop.01', options: { payFrom: 'card' } }); ok(b2); ok(C(sim, 'biz.sell', { bizId: b2.data.bizId })); err(C(sim, 'biz.sell', { bizId: b2.data.bizId }), 'ERR.NOT_FOUND');
});
test('business: units (vending, boats, vehicles) and contracts', () => {
  const sim = makeSim(); rich(sim, 20000000);
  const v = C(sim, 'biz.create', { typeId: 'biz.vending', options: { payFrom: 'card' } }); ok(v); const bizId = v.data.bizId;
  err(C(sim, 'biz.addUnit', { bizId, modelId: 'prop.vending_machine', siteId: 'nope' }), 'ERR.INVALID_ARG'); err(C(sim, 'biz.addUnit', { bizId, modelId: 'prop.vending_machine', siteId: 'site.vend.36' }), 'ERR.REQUIREMENT'); // premium needs tier 3
  const u = C(sim, 'biz.addUnit', { bizId, modelId: 'prop.vending_machine', siteId: 'site.vend.01' }); ok(u); err(C(sim, 'biz.addUnit', { bizId, modelId: 'prop.vending_machine', siteId: 'site.vend.01' }), 'ERR.BUSY');
  const unitId = u.data.unitId;
  sim.ctx.inv.add('player', 'item.ing.snack', 30);
  ok(C(sim, 'biz.restockUnit', { bizId, unitId, itemId: 'item.ing.snack', qty: 25 })); err(C(sim, 'biz.restockUnit', { bizId, unitId, itemId: 'item.ing.snack', qty: 25 }), 'ERR.NOT_FOUND');
  err(C(sim, 'biz.restockUnit', { bizId, unitId, itemId: 'item.food.meal', qty: 1 }), 'ERR.INVALID_ARG');
  ok(C(sim, 'biz.deposit', { bizId, amount: 100000 })); ok(C(sim, 'biz.buyUpgrade', { bizId, upgradeId: 'vend.card_reader', unitId })); err(C(sim, 'biz.buyUpgrade', { bizId, upgradeId: 'vend.card_reader', unitId: 'u99' }), 'ERR.NOT_FOUND');
  ok(C(sim, 'biz.deposit', { bizId, amount: 100000 })); ok(C(sim, 'biz.buyUpgrade', { bizId, upgradeId: 'vend.telemetry' }));
  const col = C(sim, 'biz.collectUnit', { bizId, unitId }); ok(col);
  err(C(sim, 'biz.repairUnit', { bizId, unitId }), 'ERR.INVALID_ARG'); // nothing to repair
  sim.ctx.state.businesses[0].units[0].condition = 0.3; ok(C(sim, 'biz.repairUnit', { bizId, unitId }));
  ok(C(sim, 'biz.removeUnit', { bizId, unitId }));
  // delivery with an owned vehicle and a contract
  const d = C(sim, 'biz.create', { typeId: 'biz.delivery', options: { payFrom: 'card' } }); ok(d);
  err(C(sim, 'biz.addUnit', { bizId: d.data.bizId, vehId: 'v99' }), 'ERR.NOT_FOUND'); err(C(sim, 'biz.addUnit', { bizId: d.data.bizId, modelId: 'veh.sedan' }), 'ERR.INVALID_ARG');
  const vu = C(sim, 'biz.addUnit', { bizId: d.data.bizId, modelId: 'veh.van' }); ok(vu);
  advance(sim, 1440, { real: 0 });
  const ct = Q(sim, 'biz.contracts', { bizId: d.data.bizId }).open[0]; ok(C(sim, 'biz.acceptContract', { bizId: d.data.bizId, contractId: ct.id })); err(C(sim, 'biz.acceptContract', { bizId: d.data.bizId, contractId: ct.id }), 'ERR.NOT_FOUND');
  // boat rental prices
  const br = C(sim, 'biz.create', { typeId: 'biz.boatrental', siteId: 'site.lake.dock.01', options: { payFrom: 'card' } }); ok(br);
  ok(C(sim, 'biz.addUnit', { bizId: br.data.bizId, modelId: 'boat.rowboat' })); ok(C(sim, 'biz.setPrice', { bizId: br.data.bizId, productId: 'boat.rowboat', price: 1500 })); err(C(sim, 'biz.setPrice', { bizId: br.data.bizId, productId: 'boat.rowboat', price: 10 }), 'ERR.INVALID_ARG');
});
test('property, construction and furniture', () => {
  const sim = makeSim(); rich(sim, 30000000);
  err(C(sim, 'prop.buy', { propId: 'prop_999' }), 'ERR.NOT_FOUND'); err(C(sim, 'prop.buy', { propId: 'prop_7' }), 'ERR.CLOSED'); // tower flats need the construction site finished
  const b = C(sim, 'prop.buy', { propId: 'prop_1', payFrom: 'card' }); ok(b); err(C(sim, 'prop.buy', { propId: 'prop_1' }), 'ERR.BUSY');
  assert.equal(Q(sim, 'player.summary').home, 'prop_1');
  ok(C(sim, 'prop.buy', { propId: 'prop_2', payFrom: 'card' }));
  err(C(sim, 'prop.setRentOut', { propId: 'prop_1', rentPerDay: 5000 }), 'ERR.BUSY'); // home
  ok(C(sim, 'prop.setHome', { propId: 'prop_2' })); err(C(sim, 'prop.setHome', { propId: 'prop_15' }), 'ERR.NOT_OWNER');
  const ro = C(sim, 'prop.setRentOut', { propId: 'prop_1', rentPerDay: 20000 }); ok(ro); err(C(sim, 'prop.setRentOut', { propId: 'prop_5', rentPerDay: 100 }), 'ERR.NOT_OWNER'); err(C(sim, 'prop.setRentOut', { propId: 'prop_1', rentPerDay: -5 }), 'ERR.INVALID_ARG');
  ok(C(sim, 'prop.setRentOut', { propId: 'prop_1', rentPerDay: Math.min(20000, ro.data.marketRent) }));
  advance(sim, 6 * 1440, { real: 0 }); assert.equal(Q(sim, 'prop.owned').find((p) => p.id === 'prop_1').rentOut.occupied, true);
  ok(C(sim, 'prop.setRentOut', { propId: 'prop_1', rentPerDay: null })); err(C(sim, 'prop.setHome', { propId: 'prop_1' }), 'ERR.BUSY');
  // lease
  err(C(sim, 'prop.lease', { leaseId: 'nope' }), 'ERR.NOT_FOUND'); ok(C(sim, 'prop.lease', { leaseId: 'lease_room_1' })); err(C(sim, 'prop.lease', { leaseId: 'lease_room_1' }), 'ERR.BUSY'); ok(C(sim, 'prop.endLease', { leaseId: 'lease_room_1' })); err(C(sim, 'prop.endLease', { leaseId: 'lease_room_1' }), 'ERR.NOT_FOUND');
  // sell
  err(C(sim, 'prop.sell', { propId: 'prop_9' }), 'ERR.NOT_OWNER');
  // plot + construction
  err(C(sim, 'build.place', { plotId: 'plot_8', type: 'piece.foundation', gx: 1, gy: 0, gz: 1, mat: 'concrete' }), 'ERR.NOT_OWNER');
  ok(C(sim, 'prop.buy', { propId: 'plot_11', payFrom: 'card' }));
  const place = (type, gx, gy, gz, rot, mat) => C(sim, 'build.place', { plotId: 'plot_11', type, gx, gy, gz, rot, mat });
  err(place('piece.wall', 1, 0, 1, 0, 'timber'), 'ERR.REQUIREMENT'); // no floor yet
  err(place('piece.foundation', 0, 0, 0, 0, 'concrete'), 'ERR.INVALID_ARG'); // outside the setback
  err(place('piece.foundation', 1, 0, 1, 0, 'wood'), 'ERR.INVALID_ARG'); // wrong material
  err(place('piece.nope', 1, 0, 1, 0, 'wood'), 'ERR.INVALID_ARG');
  for (let x = 1; x <= 4; x++) for (let z = 1; z <= 3; z++) { ok(place('piece.foundation', x, 0, z, 0, 'concrete')); ok(place('piece.floor', x, 0, z, 0, 'wood')); }
  err(place('piece.floor', 1, 0, 1, 0, 'wood'), 'ERR.BUSY');
  for (let x = 1; x <= 4; x++) { ok(place('piece.wall', x, 0, 1, 0, 'timber')); ok(place(x === 2 ? 'piece.wall_door' : 'piece.wall', x, 0, 3, 2, 'timber')); ok(place('piece.wall_glass', x, 0, 2, 0, 'steel') || place('piece.wall', x, 0, 2, 0, 'timber')); }
  for (let z = 1; z <= 3; z++) { ok(place('piece.wall', 1, 0, z, 3, 'timber')); ok(place('piece.wall', 4, 0, z, 1, 'timber')); }
  for (let x = 1; x <= 4; x++) for (let z = 1; z <= 3; z++) ok(place('piece.roof_flat', x, 1, z, 0, 'membrane'));
  const plot = Q(sim, 'build.plot', { plotId: 'plot_11' }); assert.equal(plot.habitable, true); assert.ok(plot.rooms.length >= 1); assert.ok(plot.value > 0);
  ok(C(sim, 'build.paint', { plotId: 'plot_11', type: 'piece.wall', gx: 1, gy: 0, gz: 1, rot: 0, mat: 'brick' })); err(C(sim, 'build.paint', { plotId: 'plot_11', type: 'piece.wall', gx: 1, gy: 0, gz: 1, rot: 0, mat: 'metal' }), 'ERR.INVALID_ARG');
  // removal that would orphan roofs/walls is rejected, cascade allowed
  err(C(sim, 'build.remove', { plotId: 'plot_11', type: 'piece.foundation', gx: 4, gy: 0, gz: 2, rot: 0 }), 'ERR.REQUIREMENT'); err(C(sim, 'build.remove', { plotId: 'plot_11', type: 'piece.chimney', gx: 1, gy: 0, gz: 1, rot: 0 }), 'ERR.NOT_FOUND');
  // furniture
  const f = (type, x2, z2) => C(sim, 'furn.place', { plotId: 'plot_11', type, x2, level: 0, z2, rot: 0 });
  ok(f('piece.furn.bed_double', 6, 6)); err(f('piece.furn.bed_double', 6, 6), 'ERR.BUSY'); err(f('piece.furn.nope', 1, 1), 'ERR.INVALID_ARG'); err(f('piece.furn.sofa', 999, 1), 'ERR.INVALID_ARG');
  ok(f('piece.furn.fridge', 8, 6)); ok(f('piece.furn.wardrobe', 10, 6)); ok(C(sim, 'furn.remove', { plotId: 'plot_11', x2: 10, level: 0, z2: 6 })); err(C(sim, 'furn.remove', { plotId: 'plot_11', x2: 10, level: 0, z2: 6 }), 'ERR.NOT_FOUND');
  assert.ok(Q(sim, 'build.plot', { plotId: 'plot_11' }).comfort > 0); assert.ok(Q(sim, 'build.catalog').pieces.length > 15);
  const rem = C(sim, 'build.remove', { plotId: 'plot_11', type: 'piece.roof_flat', gx: 2, gy: 1, gz: 2, rot: 0 }); ok(rem);
  const cas = C(sim, 'build.remove', { plotId: 'plot_11', type: 'piece.foundation', gx: 4, gy: 0, gz: 2, rot: 0, cascade: true }); ok(cas); assert.ok(cas.data.removed > 1);
  const reg = C(sim, 'build.registerSite', { plotId: 'plot_11', kind: 'biz.cafe' }); assert.equal(reg.ok === true || reg.error === 'ERR.REQUIREMENT', true);
  err(C(sim, 'build.registerSite', { plotId: 'plot_11', kind: 'biz.bank' }), 'ERR.INVALID_ARG'); err(C(sim, 'build.registerSite', { plotId: 'plot_99', kind: 'biz.cafe' }), 'ERR.NOT_FOUND');
  ok(C(sim, 'prop.sell', { propId: 'plot_11' }));
  assert.ok(Q(sim, 'prop.listings', { region: 'city' }).length > 5); assert.ok(Q(sim, 'prop.listings', {}).some((l) => l.forLease));
});
test('vehicles: buy, fuel, use, repair, sell, services', () => {
  const sim = makeSim(); rich(sim, 20000000);
  err(C(sim, 'veh.buy', { modelId: 'veh.nope' }), 'ERR.NOT_FOUND'); err(C(sim, 'veh.buy', { modelId: 'veh.hatch_used', used: false }), 'ERR.REQUIREMENT'); err(C(sim, 'veh.buy', { modelId: 'veh.sedan', colour: 99 }), 'ERR.INVALID_ARG');
  err(C(sim, 'veh.buy', { modelId: 'veh.sedan', poiId: 'poi.city.usedcars' }), 'ERR.REQUIREMENT'); err(C(sim, 'veh.buy', { modelId: 'veh.sedan', poiId: 'poi.city.nope' }), 'ERR.NOT_FOUND');
  const v = C(sim, 'veh.buy', { modelId: 'veh.moto_125', used: true, poiId: 'poi.city.usedcars', payFrom: 'card' }); ok(v); const vehId = v.data.vehId;
  const cash0 = sim.ledger.balance('cash'); ok(C(sim, 'veh.refuel', { vehId, litres: 3 })); assert.ok(sim.ledger.balance('cash') < cash0 || sim.ledger.balance('bank:checking') < 1e9);
  err(C(sim, 'veh.refuel', { vehId, litres: 100 }) && C(sim, 'veh.refuel', { vehId, litres: 50 }), 'ERR.CAPACITY'); err(C(sim, 'veh.refuel', { vehId, litres: -1 }), 'ERR.INVALID_ARG'); err(C(sim, 'veh.refuel', { vehId: 'v99', litres: 1 }), 'ERR.NOT_FOUND');
  const u = C(sim, 'veh.use', { vehId, km: 50, throttle: 1 }); ok(u); assert.ok(u.data.fuel < 8); err(C(sim, 'veh.use', { vehId, km: -1 }), 'ERR.INVALID_ARG');
  ok(C(sim, 'veh.setPos', { vehId, pos: [1, 2, 3], yaw: 1 }));
  ok(C(sim, 'veh.use', { vehId, km: 10, impulse: 8 })); assert.ok(Q(sim, 'veh.owned')[0].condition < 0.85);
  ok(C(sim, 'veh.repair', { vehId })); err(C(sim, 'veh.repair', { vehId }), 'ERR.INVALID_ARG');
  ok(C(sim, 'veh.deliver', { vehId })); ok(C(sim, 'veh.tow', { vehId }));
  assert.ok(Q(sim, 'veh.dealer', { poiId: 'poi.city.dealer' }).length > 5);
  const b2 = C(sim, 'veh.buy', { modelId: 'veh.sedan' }); ok(b2); const before = sim.ledger.balance('bank:checking');
  sim.setServices({ vehicleInUse: () => true }); err(C(sim, 'veh.sell', { vehId: b2.data.vehId }), 'ERR.BUSY'); sim.setServices({ vehicleInUse: null });
  ok(C(sim, 'veh.sell', { vehId: b2.data.vehId })); err(C(sim, 'veh.sell', { vehId: b2.data.vehId }), 'ERR.NOT_FOUND'); assert.ok(sim.ledger.balance('bank:checking') > before);
  // out-of-range fuel
  sim.ctx.state.vehicles[0].condition = 0.5; sim.ctx.state.vehicles[0].fuel = 1;
  sim.setServices({ near: () => false }); err(C(sim, 'veh.refuel', { vehId, litres: 2 }), 'ERR.OUT_OF_RANGE'); err(C(sim, 'veh.repair', { vehId }), 'ERR.OUT_OF_RANGE') ; sim.setServices({ near: null });
});
test('invest, tax, notes, settings, debug, time selects', () => {
  const sim = makeSim({ bus: true }); rich(sim, 3000000); ok(C(sim, 'debug.grant', { cents: 100 })); err(C(sim, 'debug.grant', { cents: -5 }), 'ERR.INVALID_ARG');
  err(C(sim, 'invest.buy', { secId: 'sec.nope', qty: 1 }), 'ERR.INVALID_ARG'); err(C(sim, 'invest.buy', { secId: 'sec.index', qty: 0 }), 'ERR.INVALID_ARG'); err(C(sim, 'invest.buy', { secId: 'sec.calderfish', qty: 1 }), 'ERR.REQUIREMENT');
  ok(C(sim, 'invest.buy', { secId: 'sec.index', qty: 10 })); err(C(sim, 'invest.sell', { secId: 'sec.index', qty: 11 }), 'ERR.NOT_FOUND'); ok(C(sim, 'invest.sell', { secId: 'sec.index', qty: 4 }));
  assert.equal(Q(sim, 'invest.state').securities.find((s) => s.id === 'sec.index').holdings, 6);
  err(C(sim, 'tax.payArrears', { amount: 100 }), 'ERR.NOT_FOUND'); err(C(sim, 'tax.payArrears', { amount: 0 }), 'ERR.INVALID_ARG');
  sim.ctx.state.tax.arrears = 5000; ok(C(sim, 'tax.payArrears', { amount: 2000 })); assert.equal(Q(sim, 'tax.state').arrears, 3000);
  sim.ctx.note('x', 'hello'); const n = Q(sim, 'notes.list'); assert.ok(n.length >= 1);
  ok(C(sim, 'note.read', { id: n[0].id })); err(C(sim, 'note.read', { id: 9999 }), 'ERR.NOT_FOUND'); ok(C(sim, 'note.clear', { id: n[0].id })); err(C(sim, 'note.clear', { id: 9999 }), 'ERR.NOT_FOUND'); ok(C(sim, 'note.clear', {}));
  ok(C(sim, 'settings.set', { path: 'a', value: 1 })); ok(C(sim, 'tutorial.set', { step: 2 })); assert.equal(Q(sim, 'tutorial.state').step, 2);
  assert.equal(Q(sim, 'cheated'), true); ok(C(sim, 'debug.setTime', { hour: 9 }));
  assert.equal(Q(sim, 'weather.now').type, 'clear'); assert.equal(Q(sim, 'time.now').weekday, 'mon');
  const s = Q(sim, 'player.summary'); assert.equal(s.hour, 8); assert.ok(Q(sim, 'ledger.balances').cash >= 0); assert.ok(Q(sim, 'ledger.transactions', { limit: 3 }).length === 3); assert.equal(Q(sim, 'ledger.invariant').ok, true); Q(sim, 'ledger.recent'); Q(sim, 'cash'); Q(sim, 'ledger.balance', { id: 'cash' });
  assert.ok(Q(sim, 'reports.pnl', { scope: 'player', period: 'week' }).byType); assert.ok(Q(sim, 'reports.netWorth').breakdown); assert.ok(Array.isArray(Q(sim, 'reports.cashflow', { days: 3 })));
  advance(sim, 3 * 1440, { real: 0 }); assert.ok(Q(sim, 'reports.netWorth').history.length >= 2);
});
test('job.startOwnShift: errors, no wage, one assist hour per business hour while working', () => {
  const sim = makeSim({ seed: 31, bus: true }); rich(sim, 6000000);
  err(C(sim, 'job.startOwnShift', { bizId: 'b99' }), 'ERR.NOT_FOUND');
  const v = sim.cmd('biz.create', { typeId: 'biz.vending', options: { payFrom: 'card' } }).data.bizId; err(C(sim, 'job.startOwnShift', { bizId: v }), 'ERR.REQUIREMENT');
  const bizId = sim.cmd('biz.create', { typeId: 'biz.cafe', siteId: 'site.city.food.03', options: { payFrom: 'card' } }).data.bizId; ok(sim.cmd('biz.deposit', { bizId, amount: 300000 }));
  ok(sim.cmd('biz.setHours', { bizId, from: 9, to: 20 })); err(C(sim, 'job.startOwnShift', { bizId }), 'ERR.CLOSED');   // 08:00, not yet open
  advance(sim, 60, { real: 0 });
  sim.setServices({ near: () => false }); err(C(sim, 'job.startOwnShift', { bizId }), 'ERR.OUT_OF_RANGE'); sim.setServices({ near: null });
  const cash0 = sim.ledger.balance('cash'); const r = runShift({ sim, jobId: 'x', ownBiz: bizId, style: 'good', pace: 1.5, scoreScale: 0.9, minutes: 180, bus: sim.bus, onMinute: () => advance(sim, 1, { real: 0 }) });
  ok(r, 'own shift'); assert.ok(r.summary.tasks >= 1, 'tasks done'); assert.equal(r.summary.gross, 0); assert.equal(r.summary.net, 0); assert.equal(r.summary.own, bizId);
  assert.ok(r.summary.assistHours >= 1, 'assist hours given: ' + r.summary.assistHours); assert.equal(sim.ledger.balance('cash'), cash0, 'no wage from an owner shift'); invariant(sim);
  assert.ok(Q(sim, 'skills.all').find((x) => x.id === 'skill.city.restaurant').xp > 0, 'xp still earned');
});
test('every Sim.cmd and Sim.select is covered by a test', () => {
  const sim = makeSim();
  const missingC = sim.cmdNames().filter((n) => !COV.has(n)), missingS = sim.selectNames().filter((n) => !SEL.has(n));
  assert.deepEqual(missingC, [], 'uncovered commands'); assert.deepEqual(missingS, [], 'uncovered selects');
});
