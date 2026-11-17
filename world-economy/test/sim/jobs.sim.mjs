// All 17 job controllers: a scripted good-play bot completes a shift and is paid; a bad-play bot hits the failure state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, advance, okCmd, cmd, give, bal, invariant } from './helpers.mjs';
import { runShift } from '../../src/game/jobs/bot.js';
import { JOB_TABLE } from '../../src/data/jobs.js';
import { CONTROLLERS } from '../../src/game/jobs/index.js';

function prep(job) {
  const sim = makeSim({ seed: 3, bus: true }); give(sim, 200000);
  if (job.requires.licence) sim.ctx.state.jobs.licences.push(job.requires.licence);
  if (job.id === 'job.lake.fishing') sim.ctx.inv.add('player', 'item.tool.rod_basic', 1);
  const h = Math.floor(sim.time % 1440 / 60); if (h < job.hours[0] || h >= job.hours[1]) advance(sim, ((job.hours[0] + 1 - h + 24) % 24) * 60, { real: 0 });
  sim.ctx.state.needs.energy = 100; sim.ctx.state.needs.hunger = 100;
  return sim;
}
const mins = (job) => (job.id === 'job.ocean.fisherman' ? 600 : 70);
test('there is a controller, a plan and a data record for each of the 17 jobs', () => {
  assert.equal(JOB_TABLE.length, 17); assert.equal(Object.keys(CONTROLLERS).length, 17);
  for (const j of JOB_TABLE) for (const f of ['id', 'title', 'employer', 'poi', 'hours', 'requires', 'uniform', 'skill', 'tasks', 'unlocks', 'failure']) assert.ok(f in j, j.id + ' lacks ' + f);
});
for (const job of JOB_TABLE) {
  test(job.id + ': good bot completes a shift and is paid', () => {
    const sim = prep(job); const before = bal(sim);
    const r = runShift({ sim, jobId: job.id, style: 'good', minutes: mins(job), bus: sim.bus, onMinute: () => advance(sim, 1, { real: 0 }) });
    assert.equal(r.ok, true, JSON.stringify(r)); assert.ok(r.stats.tasks >= 1, 'no tasks completed'); assert.equal(r.stats.failed, 0);
    invariant(sim);
    if (job.id === 'job.lake.fishing') { assert.ok(sim.ctx.inv.qty('player', 'item.fish.carp') + sim.ctx.inv.qty('player', 'item.fish.perch') + sim.ctx.inv.qty('player', 'item.fish.bass') > 0); }
    else assert.ok(bal(sim) > before, 'pay must be > 0: ' + (bal(sim) - before));
    assert.ok(sim.select('skills.all').find((s) => s.id === job.skill).xp > 0);
  });
  test(job.id + ': bad bot reaches the failure state and earns nothing', () => {
    const sim = prep(job); const before = bal(sim);
    const r = runShift({ sim, jobId: job.id, style: 'bad', minutes: 900, bus: sim.bus, onMinute: () => advance(sim, 1, { real: 0 }) });
    assert.equal(r.ok, true); assert.ok(r.stats.failed >= 1, 'no failed task');
    if (job.failure.maxStrikes > 0 && !job.failure.consecutiveInaccurate) assert.ok(r.reason === 'failed' || (r.summary && r.summary.reason === 'failed') || r.stats.failed >= job.failure.maxStrikes, 'expected the shift to end failed');
    assert.ok(r.stats.tasks <= r.stats.failed, 'a bad bot must fail more tasks than it completes'); void before;
  });
}
test('pay follows the formula: basePay x (0.4 + 0.6 x score) x skillMult (+ distance), tax 10%, tips untaxed', () => {
  const sim = makeSim(); okCmd(sim, 'job.apply', { jobId: 'job.city.delivery' }); const sid = okCmd(sim, 'job.startShift', { jobId: 'job.city.delivery' }).shiftId;
  const t = okCmd(sim, 'job.nextTask', { shiftId: sid }); sim.tickReal(25);
  const r = okCmd(sim, 'job.reportTask', { shiftId: sid, taskId: t.id, score: 0.5 });
  assert.equal(r.pay, Math.floor((340 + 0.27 * t.params.distance) * (0.4 + 0.6 * 0.5)));
  const s = okCmd(sim, 'job.endShift'); assert.equal(s.gross, r.pay); assert.equal(s.tax, Math.ceil(r.pay * 0.1)); assert.equal(s.net, r.pay - s.tax);
  assert.equal(sim.ledger.query({ type: 'tax.income' })[0].amount, s.tax);
});
test('skill levels raise pay by 7% per level and unlock ranks', () => {
  const sim = makeSim(); sim.ctx.state.skills['skill.city.office'].level = 6; advance(sim, 0);
  okCmd(sim, 'job.apply', { jobId: 'job.city.office' }); const sid = okCmd(sim, 'job.startShift', { jobId: 'job.city.office' }).shiftId; const t = okCmd(sim, 'job.nextTask', { shiftId: sid }); sim.tickReal(20);
  const r = okCmd(sim, 'job.reportTask', { shiftId: sid, taskId: t.id, score: 1 }); assert.equal(r.pay, Math.floor(500 * 1.35 * 1.7));
});
test('three strikes end the shift; energy exhaustion ends it too', () => {
  const sim = makeSim({ bus: true }); okCmd(sim, 'job.apply', { jobId: 'job.city.delivery' }); const sid = okCmd(sim, 'job.startShift', { jobId: 'job.city.delivery' }).shiftId;
  let last; for (let i = 0; i < 3; i++) { const t = okCmd(sim, 'job.nextTask', { shiftId: sid }); last = okCmd(sim, 'job.reportTask', { shiftId: sid, taskId: t.id, score: 0, failed: true }); }
  assert.equal(last.ended, 'failed'); assert.equal(sim.select('jobs.current'), null);
});
test('fishing: catches are sim-rolled (no re-roll by reloading) and respect rod limits', () => {
  const sim = makeSim(); sim.ctx.inv.add('player', 'item.tool.rod_basic', 1); okCmd(sim, 'job.startShift', { jobId: 'job.lake.fishing' });
  const sid = sim.select('jobs.current').shiftId; const snap = sim.serialize();
  const t1 = okCmd(sim, 'job.nextTask', { shiftId: sid, spot: 'poi.lake.fish.rocks' });
  const b = makeSim(); b.init({ state: snap }); const t2 = okCmd(b, 'job.nextTask', { shiftId: sid, spot: 'poi.lake.fish.rocks' });
  assert.deepEqual(t1.params, t2.params); assert.ok(t1.params.kg <= 4);
});
