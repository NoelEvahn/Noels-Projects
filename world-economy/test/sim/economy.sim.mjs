// Economy bots (Annex D 14): headless players follow a strategy through Sim.cmd and the job controllers (average pacing: 1.5x the task minimum,
// score x0.85). Milestones are measured in real (awake) minutes at scale 1 = game minutes / 60 and must land within +-35% of the targets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, invariant } from './helpers.mjs';
import { createEconomyBot } from './bots/economyBot.mjs';

const within = (v, lo, hi) => v !== undefined && v / 60 >= lo * 0.65 && v / 60 <= hi * 1.35;
const run = (strategy, max) => { const sim = makeSim({ seed: 7, bus: true }); const bot = createEconomyBot(sim, { strategy }); const S = bot.run(max); invariant(sim); return S; };
const fmt = (S) => Object.entries(S.milestones).map(([k, v]) => `${k}=${(v / 60).toFixed(1)}min`).join(' ');

test('courier -> vendor: wage, $250, first business, $1k, $10k within tolerance', () => {
  const S = run('courier-vendor', 60 * 600); const M = S.milestones; console.log('courier-vendor', fmt(S));
  assert.ok(M.firstWage / 60 <= 6 * 1.35, 'first wage'); assert.ok(within(M.cash250, 15, 20), 'cash250 ' + M.cash250 / 60);
  assert.ok(within(M.firstBusiness, 35, 50), 'first business ' + M.firstBusiness / 60); assert.ok(within(M.nw1k, 60, 80), 'nw1k ' + M.nw1k / 60);
  assert.ok(within(M.nw10k, 240, 330), 'nw10k ' + M.nw10k / 60);
});
test('job-only player reaches $10,000 in 9-12 h; businesses are clearly better', () => {
  const only = run('courier-only', 60 * 1200), vend = run('courier-vendor', 60 * 600);
  console.log('courier-only', fmt(only)); assert.ok(within(only.milestones.nw10k, 540, 720), 'job-only $10k ' + only.milestones.nw10k / 60);
  assert.ok(vend.milestones.nw10k < only.milestones.nw10k * 0.75, 'businesses must be clearly better than jobs alone');
});
test('angler-trader reaches $10k; cafe and first property land inside tolerance (tycoon path)', () => {
  const a = run('angler-trader', 60 * 1000); console.log('angler-trader', fmt(a)); assert.ok(a.milestones.nw10k !== undefined && a.milestones.nw10k / 60 <= 16 * 60, 'angler reaches $10k within 16 h');
  const t = run('tycoon', 60 * 1000); console.log('tycoon', fmt(t));
  assert.ok(within(t.milestones.cafe, 360, 420), 'cafe ' + t.milestones.cafe / 60); assert.ok(within(t.milestones.property, 420, 540), 'property ' + t.milestones.property / 60);
});
