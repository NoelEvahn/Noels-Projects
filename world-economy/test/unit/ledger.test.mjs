import test from 'node:test';
import assert from 'node:assert/strict';
import { createLedger } from '../../src/sim/ledger.js';
import { createSim } from '../../src/sim/index.js';
import { createRng } from '../../src/core/rng.js';
import { ERR } from '../../src/data/ids.js';

function ledger() {
  const l = createLedger({ now: () => 600 });
  l.openAccount('cash', { kind: 'cash' }); l.openAccount('bank:checking', { kind: 'bank' }); l.openAccount('ext:genesis'); l.openAccount('ext:market');
  return l;
}
test('ledger: transfer, insufficient funds, validation', () => {
  const l = ledger();
  assert.equal(l.transfer({ from: 'ext:genesis', to: 'cash', amount: 10000, type: 'genesis' }).ok, true);
  assert.equal(l.balance('cash'), 10000);
  const r = l.transfer({ from: 'cash', to: 'ext:market', amount: 10001, type: 'purchase.item' });
  assert.deepEqual([r.ok, r.error], [false, ERR.INSUFFICIENT_FUNDS]);
  assert.equal(l.transfer({ from: 'cash', to: 'ext:market', amount: 1.5, type: 'x' }).error, ERR.INVALID_ARG);
  assert.equal(l.transfer({ from: 'cash', to: 'nope', amount: 5, type: 'x' }).error, ERR.NOT_FOUND);
  assert.equal(l.charge({ amount: 2500, to: 'ext:market', type: 'purchase.item' }).ok, true);
  assert.equal(l.balance('cash'), 7500);
  assert.equal(l.canAfford('cash', 7500), true); assert.equal(l.canAfford('cash', 7501), false);
  assert.equal(l.query({ type: 'purchase.item' }).length, 1);
  assert.deepEqual(l.totals({ account: 'cash', fromDay: 1, toDay: 1 })['purchase.item'], { in: 0, out: 2500 });
});
test('ledger: invariant sum = 0 after 10,000 random transfers', () => {
  const l = ledger(); const rng = createRng(7);
  l.transfer({ from: 'ext:genesis', to: 'cash', amount: 100000, type: 'genesis' });
  const ids = ['cash', 'bank:checking', 'ext:genesis', 'ext:market'];
  let ok = 0;
  for (let i = 0; i < 10000; i++) {
    const a = rng.pick(ids), b = rng.pick(ids);
    const r = l.transfer({ from: a, to: b, amount: rng.int(1, 5000), type: 'transfer' });
    if (r.ok) ok++;
    if (i % 997 === 0) assert.deepEqual(l.checkInvariant(), { ok: true, sum: 0 });
  }
  assert.ok(ok > 5000);
  assert.deepEqual(l.checkInvariant(), { ok: true, sum: 0 });
  assert.ok(l.balance('cash') >= 0 && l.balance('bank:checking') >= 0);
});
test('new game: $100.00 cash and exactly one genesis transaction', () => {
  const sim = createSim(); sim.init({});
  assert.equal(sim.ledger.balance('cash'), 10000);
  const all = sim.ledger.query({});
  assert.equal(all.length, 1); assert.equal(all[0].type, 'genesis');
  assert.equal(sim.select('cash'), 10000);
  assert.equal(sim.cmd('nope').ok, false);
  assert.equal(sim.cmd('debug.grant', { cents: 500 }).ok, true); assert.equal(sim.select('cash'), 10500); assert.equal(sim.cheated, true);
  assert.deepEqual(sim.select('ledger.invariant'), { ok: true, sum: 0 });
});
