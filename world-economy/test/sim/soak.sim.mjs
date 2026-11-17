// 60-game-day soak with random (mostly valid) commands: ledger invariant after every command, no negative balances, integer money.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, advance } from './helpers.mjs';
import { createRng } from '../../src/core/rng.js';
import { runShift } from '../../src/game/jobs/bot.js';
import { MARKET_IDS, MARKETS } from '../../src/data/markets.js';
import { JOBS } from '../../src/data/ids.js';
import { SITES } from '../../src/data/businesses.js';

test('soak: 60 game days of random commands keeps the ledger consistent', () => {
  const sim = makeSim({ seed: 99, bus: true, strict: false }); const rng = createRng(2024);
  const checkAll = () => {
    const inv = sim.ledger.checkInvariant(); assert.equal(inv.ok, true, 'invariant sum ' + inv.sum);
    for (const id of sim.ledger.accountIds()) { const b = sim.ledger.balance(id); assert.ok(Number.isInteger(b), id + ' not integer'); if (!id.startsWith('ext:') && !id.startsWith('loan:')) assert.ok(b >= 0, id + ' negative: ' + b); if (id.startsWith('loan:')) assert.ok(b <= 0); }
  };
  const bizIds = () => sim.select('biz.list').map((b) => b.id);
  let ncmd = 0;
  const fire = (name, args) => { ncmd++; const r = sim.cmd(name, args); const v = sim.ledger.checkInvariant(); assert.equal(v.ok, true, name + ' broke the invariant'); return r; };
  const items = (m) => Object.keys(MARKETS[m].items);
  const actions = [
    () => fire('debug.grant', { cents: rng.int(10000, 3000000) }),
    () => fire('bank.deposit', { amount: rng.int(1, 200000) }), () => fire('bank.withdraw', { amount: rng.int(1, 100000) }),
    () => fire('bank.transfer', { from: 'bank:checking', to: 'bank:savings', amount: rng.int(1, 100000) }),
    () => fire('bank.takeLoan', { amount: rng.int(50000, 400000), weeks: rng.pick([4, 8, 12]) }),
    () => { const l = sim.select('bank.state').loans; if (l.length) fire('bank.repayLoan', { loanId: l[0].id, amount: rng.int(1000, 80000) }); },
    () => { const m = rng.pick(MARKET_IDS); fire('market.buy', { marketId: m, itemId: rng.pick(items(m)), qty: rng.int(1, 12), payFrom: rng.pick(['cash', 'card', undefined]) }); },
    () => { const m = rng.pick(MARKET_IDS), c = sim.select('inv.container', { id: 'player' }); if (c.items.length) { const it = rng.pick(c.items); fire('market.sell', { marketId: m, itemId: it.itemId, qty: rng.int(1, it.qty) }); } },
    () => fire('shop.buy', { poiId: rng.pick(['poi.lake.store', 'poi.city.hardware', 'poi.city.cityhall']), itemId: rng.pick(['item.food.sandwich', 'item.tool.rod_basic', 'lic.food', 'item.tool.cooler']), qty: rng.int(1, 2) }),
    () => fire('inv.use', { itemId: 'item.food.sandwich' }),
    () => fire('needs.sleep', { untilHour: rng.int(5, 9) }),
    () => { const j = rng.pick(JOBS); fire('job.apply', { jobId: j }); const r = runShift({ sim, jobId: j, minutes: rng.int(1, 4), seed: rng.int(1, 999), bus: sim.bus, onMinute: () => advance(sim, 1, { real: 0 }) }); void r; sim.cmd('job.endShift'); },
    () => fire('biz.create', { typeId: rng.pick(['biz.vending', 'biz.foodstand', 'biz.cafe', 'biz.retail', 'biz.delivery', 'biz.boatrental']), siteId: rng.pick(SITES).id, options: { payFrom: 'card' } }),
    () => { const ids = bizIds(); if (!ids.length) return; const bizId = rng.pick(ids); const d = sim.select('biz.detail', { bizId }); const t = rng.int(0, 7);
      if (t === 0) fire('biz.deposit', { bizId, amount: rng.int(1000, 800000) }); else if (t === 1) { const c = sim.select('biz.candidates', { bizId }); if (c.length) fire('biz.hire', { bizId, candidateId: rng.pick(c).id, role: undefined }); }
      else if (t === 2) fire('biz.setPolicy', { bizId, patch: { autoRestock: { enabled: true } } }); else if (t === 3 && d.products.length) { const p = rng.pick(d.products); fire('biz.setPrice', { bizId, productId: p.id, price: Math.round(p.ref * rng.range(0.15, 3.2)) }); }
      else if (t === 4) { const it = rng.pick(['item.ing.snack', 'item.ing.coffee', 'item.ing.meat', 'item.goods.grocery']); fire('biz.order', { bizId, itemId: it, qty: rng.int(1, 80) }); }
      else if (t === 5) fire('biz.withdraw', { bizId, amount: rng.int(1000, 500000) }); else if (t === 6 && d.units.length) fire('biz.addUnit', { bizId, modelId: 'prop.vending_machine', siteId: rng.pick(SITES).id }); else fire('biz.close', { bizId }); },
    () => fire('prop.buy', { propId: rng.pick(['prop_1', 'prop_2', 'prop_26', 'plot_8', 'plot_1', 'prop_15']), payFrom: 'card' }),
    () => fire('prop.sell', { propId: rng.pick(['prop_1', 'prop_2', 'prop_26', 'plot_8', 'plot_1', 'prop_15']) }),
    () => fire('prop.setRentOut', { propId: rng.pick(['prop_1', 'prop_2', 'prop_26']), rentPerDay: rng.pick([null, rng.int(500, 30000)]) }),
    () => fire('build.place', { plotId: rng.pick(['plot_8', 'plot_1']), type: 'piece.foundation', gx: rng.int(1, 6), gy: 0, gz: rng.int(1, 6), rot: 0, mat: 'concrete' }),
    () => fire('veh.buy', { modelId: rng.pick(['veh.moto_125', 'veh.hatch_used', 'veh.sedan', 'boat.skiff']), used: rng.chance(0.5), payFrom: 'card' }),
    () => { const v = sim.select('veh.owned'); if (!v.length) return; const x = rng.pick(v); const t = rng.int(0, 3); if (t === 0) fire('veh.refuel', { vehId: x.id, litres: rng.range(1, 30) }); else if (t === 1) fire('veh.use', { vehId: x.id, km: rng.range(0, 60), impulse: rng.pick([0, 0, 5]) }); else if (t === 2) fire('veh.repair', { vehId: x.id }); else fire('veh.sell', { vehId: x.id }); },
    () => fire('invest.buy', { secId: 'sec.index', qty: rng.int(1, 20) }), () => fire('invest.sell', { secId: 'sec.index', qty: rng.int(1, 20) }),
    () => fire('tax.payArrears', { amount: rng.int(1, 5000) }),
  ];
  for (let step = 0; step < 60 * 24 * 3; step++) { // 20 game minutes per step = 60 days
    advance(sim, 20, { real: 0.0 });
    const n = rng.int(1, 3); for (let k = 0; k < n; k++) rng.pick(actions)();
    if (step % 72 === 0) checkAll();
  }
  checkAll();
  assert.ok(ncmd > 3000, 'ran ' + ncmd + ' commands');
  assert.ok(sim.time >= 480 + 60 * 1440 - 1);
  for (const tx of sim.ledger.query({ limit: 5000 })) assert.ok(Number.isInteger(tx.amount) && tx.amount > 0);
  assert.equal(sim.select('cheated'), true);
});
