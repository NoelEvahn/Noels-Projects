// Tutorial flow (Stage 4b): data-driven steps from the first $100 to the first machine and its first sale, events and selectors for the Stage 5 UI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, advance, invariant } from './helpers.mjs';
import { runShift } from '../../src/game/jobs/bot.js';
import { TUTORIAL_STEPS, TUTORIAL_TIPS } from '../../src/data/tutorial.js';

test('tutorial data: unique ids, every step has a title, body, ui selectors and a done condition', () => {
  const ids = new Set();
  for (const s of TUTORIAL_STEPS) { assert.ok(!ids.has(s.id)); ids.add(s.id); assert.ok(s.title && s.body && s.ui && s.done, s.id); }
  for (const t of TUTORIAL_TIPS) { assert.ok(!ids.has(t.id)); ids.add(t.id); assert.ok(t.title && t.body && t.when, t.id); }
  assert.equal(TUTORIAL_STEPS[0].id, 'tut.move');
});

test('a scripted player walks the whole flow: move, jobs app, first shift, summary ack, deposit, vending machine, first sale; events in order', () => {
  const sim = makeSim({ seed: 8, bus: true }); const ev = [];
  for (const n of ['tutorial:step', 'tutorial:progress', 'tutorial:tip', 'tutorial:done']) sim.bus.on(n, (p) => ev.push([n, p]));
  const st = () => sim.select('tutorial.state');
  advance(sim, 5, { real: 0 });
  assert.equal(st().current.id, 'tut.move'); assert.equal(st().done, false); assert.equal(st().steps[0].state, 'active'); assert.equal(st().steps.length, TUTORIAL_STEPS.length);
  for (let i = 0; i < 12; i++) { assert.equal(st().step, 0); sim.cmd('tutorial.signal', { name: 'moved' }); }
  assert.equal(st().current.id, 'tut.jobs'); assert.ok(ev.some((e) => e[0] === 'tutorial:progress' && e[1].have === 6 && e[1].need === 12));
  sim.cmd('tutorial.signal', { name: 'ui:open', data: { screen: 'scr.phone.jobs' } }); assert.equal(st().current.id, 'tut.shift');
  const r = runShift({ sim, jobId: 'job.city.delivery', style: 'good', pace: 1.5, scoreScale: 0.9, minutes: 60, bus: sim.bus, onMinute: () => advance(sim, 1, { real: 0 }) });
  assert.ok(r.ok && r.summary.net > 0); assert.equal(st().current.id, 'tut.summary');
  assert.equal(sim.cmd('tutorial.ack', {}).ok, true); assert.equal(st().current.id, 'tut.bank');
  sim.cmd('bank.deposit', { amount: 3000 }); assert.equal(st().current.id, 'tut.goal');
  sim.cmd('debug.grant', { cents: 100000 }); sim.cmd('bank.deposit', { amount: 100000 });
  assert.ok(ev.some((e) => e[0] === 'tutorial:tip' && e[1].id === 'tip.bizhub'), 'business hub tip once cash >= $350');
  const bz = sim.cmd('biz.create', { typeId: 'biz.vending', options: { payFrom: 'card' } }); assert.ok(bz.ok);
  const site = sim.select('biz.sites', { typeId: 'biz.vending' }).find((s) => !s.taken && !s.premium);
  assert.ok(sim.cmd('biz.addUnit', { bizId: bz.data.bizId, modelId: 'prop.vending_machine', siteId: site.id }).ok); assert.equal(st().current.id, 'tut.income');
  assert.ok(ev.some((e) => e[0] === 'tutorial:tip' && e[1].id === 'tip.goals'));
  const unit = sim.select('biz.detail', { bizId: bz.data.bizId }).units[0];
  for (const it of ['item.ing.snack', 'item.ing.beverage']) { sim.cmd('market.buy', { marketId: 'mkt.city.wholesale', itemId: it, qty: 20, payFrom: 'card' }); sim.cmd('biz.restockUnit', { bizId: bz.data.bizId, unitId: unit.id, itemId: it, qty: 20 }); }
  advance(sim, 24 * 60, { real: 0 });
  assert.equal(st().done, true); assert.equal(st().current, null); assert.equal(st().step, TUTORIAL_STEPS.length);
  const steps = ev.filter((e) => e[0] === 'tutorial:step').map((e) => e[1].id); assert.deepEqual(steps.slice(0, 8), [...TUTORIAL_STEPS.map((s) => s.id), null]);
  assert.equal(ev.filter((e) => e[0] === 'tutorial:done').length, 1); assert.equal(ev.filter((e) => e[0] === 'tutorial:tip' && e[1].id === 'tip.bizhub').length, 1, 'tips fire once');
  invariant(sim);
});

test('out-of-order play never blocks: a step already satisfied completes at once; skip ends the flow; state survives save and load', () => {
  const sim = makeSim({ seed: 9, bus: true });
  sim.cmd('bank.deposit', { amount: 100 }); sim.cmd('tutorial.signal', { name: 'ui:open', data: { screen: 'scr.phone.jobs' } });
  for (let i = 0; i < 12; i++) sim.cmd('tutorial.signal', { name: 'moved' });
  assert.equal(sim.select('tutorial.state').current.id, 'tut.shift');
  const saved = JSON.parse(JSON.stringify(sim.serialize())); const sim2 = makeSim({ seed: 1, bus: true }); sim2.init({ state: saved });
  assert.deepEqual(sim2.select('tutorial.state'), sim.select('tutorial.state'));
  sim2.cmd('tutorial.signal', { name: 'moved' }); assert.equal(sim2.select('tutorial.state').current.id, 'tut.shift');
  assert.equal(sim2.cmd('tutorial.skip', {}).ok, true); const s = sim2.select('tutorial.state'); assert.equal(s.done, true); assert.equal(s.skipped, true);
  sim2.cmd('tutorial.signal', { name: 'moved' }); assert.equal(sim2.select('tutorial.state').done, true);
  // dev jump keeps the original command working
  const sim3 = makeSim({ seed: 2 }); sim3.cmd('tutorial.set', { step: 3 }); assert.equal(sim3.select('tutorial.state').step, 3);
});
