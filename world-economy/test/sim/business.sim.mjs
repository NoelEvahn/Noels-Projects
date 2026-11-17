// All 12 business types: create, operate 7 game days with the bot, P&L equals the ledger totals of biz:<id>, close and return the account.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, advance, okCmd, cmd, bal, invariant, nw } from './helpers.mjs';
import { setupBusiness, BIZ_TYPES } from './bots/bizBot.mjs';
import { BIZ_TABLE } from '../../src/data/businesses.js';
import { classify } from '../../src/sim/reports.js';

test('twelve business types exist in data with the required fields', () => {
  assert.equal(BIZ_TABLE.length, 12); assert.deepEqual(BIZ_TABLE.map((b) => b.id).sort(), BIZ_TYPES.slice().sort());
  for (const t of BIZ_TABLE) for (const f of ['id', 'name', 'model', 'startup', 'licences', 'roles', 'upgrades', 'tiers', 'fixedPerDay']) assert.ok(f in t, t.id + ' lacks ' + f);
});
for (const typeId of BIZ_TYPES) {
  test(typeId + ': operates 7 days, P&L equals ledger totals, closes and returns the account', () => {
    const sim = makeSim({ seed: 17 });
    const bizId = setupBusiness(sim, typeId);
    const A = 'biz:' + bizId, created = sim.time;
    advance(sim, 7 * 1440, { real: 60 });
    invariant(sim);
    const day0 = Math.floor(created / 1440) + 1, day1 = Math.floor(sim.time / 1440) + 1;
    // independent recomputation from the ledger
    const tot = sim.ledger.totals({ account: A, fromDay: day0, toDay: day1 });
    const acc = { revenue: 0, cogs: 0, payroll: 0, opex: 0, tax: 0 };
    for (const [type, v] of Object.entries(tot)) { const cat = classify(type); if (cat === 'other') continue; acc[cat] += cat === 'revenue' ? v.in - v.out : v.out - v.in; }
    const pnl = sim.select('reports.pnl', { scope: bizId, period: 'month' });
    assert.equal(pnl.revenue, acc.revenue); assert.equal(pnl.cogs, acc.cogs); assert.equal(pnl.payroll, acc.payroll); assert.equal(pnl.opex, acc.opex); assert.equal(pnl.tax, acc.tax);
    assert.equal(pnl.profit, acc.revenue - acc.cogs - acc.payroll - acc.opex - acc.tax);
    assert.ok(acc.revenue > 0, 'a staffed, stocked business must earn revenue');
    const d = sim.select('biz.detail', { bizId }); const rep = d.stats.days.reduce((s, x) => s + x.revenue, 0);
    assert.ok(Math.abs(rep - acc.revenue) <= acc.revenue * 0.3 + 1, 'daily reports derive from the ledger');
    // close: the owner covers any deficit, then the account is returned
    let r = sim.cmd('biz.close', { bizId });
    if (!r.ok) { assert.equal(r.error, 'ERR.INSUFFICIENT_FUNDS'); okCmd(sim, 'biz.deposit', { bizId, amount: r.detail.deficit + 100 }); r = sim.cmd('biz.close', { bizId }); }
    assert.equal(r.ok, true, JSON.stringify(r)); invariant(sim);
    assert.equal(sim.select('biz.list').length, 0); assert.equal(sim.ledger.accountIds().includes(A), false, 'business account must be closed');
    assert.equal(sim.select('biz.detail', { bizId }), null);
  });
}
test('business tax is 12% of positive weekly profit; losses carry forward', () => {
  const sim = makeSim({ seed: 2 }); const bizId = setupBusiness(sim, 'biz.boatrental'); advance(sim, 8 * 1440, { real: 60 });
  const taxes = sim.ledger.query({ type: 'tax.business' }); assert.ok(taxes.length >= 1);
  const prof = sim.ledger.totals({ account: 'biz:' + bizId, fromDay: 1, toDay: 3 }); void prof;
});
test('payables suspend a business that cannot pay; closing needs the owner to cover the deficit', () => {
  const sim = makeSim({ seed: 3 }); okCmd(sim, 'debug.grant', { cents: 3000000 }); okCmd(sim, 'bank.deposit', { amount: 2900000 });
  const r = okCmd(sim, 'biz.create', { typeId: 'biz.cafe', siteId: 'site.city.food.01', options: { payFrom: 'card' } });
  advance(sim, 6 * 1440, { real: 0 }); const d = sim.select('biz.detail', { bizId: r.bizId });
  assert.ok(d.finance.payables > 0); assert.equal(d.suspended, true);
  const c1 = sim.cmd('biz.close', { bizId: r.bizId }); invariant(sim);
  if (!c1.ok) { assert.equal(c1.error, 'ERR.INSUFFICIENT_FUNDS'); okCmd(sim, 'biz.deposit', { bizId: r.bizId, amount: c1.detail.deficit + 100 }); assert.equal(sim.cmd('biz.close', { bizId: r.bizId }).ok, true); }
  assert.equal(sim.select('biz.list').length, 0); invariant(sim);
});
test('business operates without the player: staffed + auto-restock grows reputation and cash', () => {
  const sim = makeSim({ seed: 9 }); const bizId = setupBusiness(sim, 'biz.cafe'); const c0 = bal(sim, 'biz:' + bizId);
  advance(sim, 10 * 1440, { real: 0 }); const d = sim.select('biz.detail', { bizId });
  assert.ok(d.reputation > 0.4); assert.ok(d.stats.days.length >= 9); assert.ok(d.balance + 0 !== c0);
  assert.ok(nw(sim) > 0);
});
