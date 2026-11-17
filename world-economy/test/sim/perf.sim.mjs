// Perf budget (Annex D 9.4 #8): Sim.tickMinute <= 0.3 ms mean, hourly tick <= 4 ms with 30 businesses and 300 employees.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSim, okCmd, give } from './helpers.mjs';
import { BIZ_TABLE, SITES } from '../../src/data/businesses.js';

test('tickMinute and hourly tick stay inside budget with 30 businesses and 300 employees', () => {
  const sim = makeSim({ seed: 5 }); give(sim, 900000000); sim.cmd('bank.deposit', { amount: 800000000 });
  const types = ['biz.cafe', 'biz.restaurant', 'biz.retail', 'biz.vending', 'biz.foodstand', 'biz.delivery'];
  const freeSite = (t) => SITES.find((s) => s.kinds.includes(t) && !sim.ctx.state.sites[s.id]);
  let n = 0;
  for (let i = 0; i < 80 && n < 30; i++) {
    const t = types[i % types.length]; const bt = BIZ_TABLE.find((b) => b.id === t); const site = bt.needsSite ? freeSite(t) : null; if (bt.needsSite && !site) continue;
    const r = sim.cmd('biz.create', { typeId: t, siteId: site ? site.id : undefined, options: { payFrom: 'card' } }); if (!r.ok) continue; n++;
    sim.cmd('biz.deposit', { bizId: r.data.bizId, amount: 5000000 });
    const b = sim.ctx.state.businesses.find((x) => x.id === r.data.bizId);
    for (let k = 0; k < 10; k++) b.staff.push({ id: 'e' + (1000 + n * 20 + k), name: 'Staff', role: bt.roles[k % bt.roles.length], skill: 3, wage: 1400, morale: 0.8, hiredDay: 1, unitId: null });
    sim.cmd('biz.setPolicy', { bizId: r.data.bizId, patch: { autoRestock: { enabled: true } } });
    if (t === 'biz.vending') for (const s of SITES.filter((x) => x.kinds.includes('biz.vending') && !sim.ctx.state.sites[x.id]).slice(0, 3)) sim.cmd('biz.addUnit', { bizId: r.data.bizId, modelId: 'prop.vending_machine', siteId: s.id });
  }
  assert.equal(sim.select('biz.list').length, 30); assert.equal(sim.ctx.state.businesses.reduce((s, b) => s + b.staff.length, 0), 300);
  const min = [], hour = [], day = [];
  for (let i = 0; i < 3 * 1440; i++) {
    const t = sim.time + 1; const gt = { day: Math.floor(t / 1440) + 1, minute: t % 1440, total: t };
    const t0 = process.hrtime.bigint(); sim.tickMinute(gt); const dt = Number(process.hrtime.bigint() - t0) / 1e6;
    (gt.minute === 0 ? day : gt.minute % 60 === 0 ? hour : min).push(dt);
  }
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  console.log(`tickMinute mean ${mean(min).toFixed(3)} ms, hourly mean ${mean(hour).toFixed(2)} ms (max ${Math.max(...hour).toFixed(2)}), daily mean ${mean(day).toFixed(2)} ms`);
  assert.ok(mean(min) <= 0.3, 'tickMinute mean ' + mean(min)); assert.ok(mean(hour) <= 4, 'hourly mean ' + mean(hour));
});
