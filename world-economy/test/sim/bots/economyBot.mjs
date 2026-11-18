// Economy bots (Annex D 14): headless players that follow a strategy through Sim.cmd and the job controllers, measuring real (awake) minutes.
import { advance, nw } from '../helpers.mjs';
import { runShift } from '../../../src/game/jobs/bot.js';
import { SITES } from '../../../src/data/businesses.js';
import { hire } from './bizBot.mjs';

export function createEconomyBot(sim, { strategy = 'courier-vendor', useLoans = true } = {}) {
  const S = { played: 0, milestones: {}, log: [] };
  const mark = (k) => { if (S.milestones[k] === undefined) S.milestones[k] = Math.round(S.played); };
  const cash = () => sim.ledger.balance('cash') + sim.ledger.balance('bank:checking');
  function tick(minutes, sleeping = false) { advance(sim, minutes, { real: 0 }); if (!sleeping) S.played += minutes; }
  function checkMarks() {
    const n = nw(sim); if (cash() >= 25000) mark('cash250'); if (n >= 100000) mark('nw1k'); if (n >= 1000000) mark('nw10k'); if (n >= 10000000) mark('nw100k'); if (n >= 100000000) mark('nw1m');
    if (sim.select('biz.list').some((b) => b.typeId === 'biz.vending' && b.units > 0)) mark('firstBusiness');
    if (sim.select('biz.list').filter((b) => b.typeId === 'biz.vending').reduce((s, b) => s + b.units, 0) >= 5 || sim.select('biz.list').some((b) => b.typeId === 'biz.foodstand')) mark('fiveMachines');
    if (sim.select('biz.list').some((b) => b.typeId === 'biz.cafe')) mark('cafe'); if (sim.select('prop.owned').some((p) => p.kind === 'flat' || p.kind === 'house')) mark('property');
    if (sim.select('biz.list').some((b) => b.typeId === 'biz.restaurant')) mark('restaurant');
    if (sim.select('veh.owned').length) mark('vehicle');
  }
  function care() {
    const need = sim.select('needs.state');
    if (need.hunger < 30 && sim.ledger.balance('cash') >= 600) { sim.cmd('shop.buy', { poiId: 'poi.city.supermarket', itemId: 'item.food.sandwich', qty: 1 }); sim.cmd('inv.use', { itemId: 'item.food.sandwich' }); }
    if (need.energy < 22) { if (sim.ledger.balance('cash') < 1800) sim.cmd('bank.withdraw', { amount: 2000 }); const r = sim.cmd('needs.sleep', { untilHour: 6 }); if (r.ok) tick(r.data.minutes + 5, true); }
  }
  const job = (jobId, minutes) => { const r = runShift({ sim, jobId, style: 'good', pace: 1.5, scoreScale: 0.85, minutes, bus: sim.bus, onMinute: () => { advance(sim, 1, { real: 0 }); S.played += 1; } }); if (r.ok && r.summary && !S.milestones.firstWage && r.summary.net > 0) mark('firstWage');
    if (!r.ok && (r.error === 'ERR.CLOSED' || r.error === 'ERR.BUSY')) { if (sim.ledger.balance('cash') < 1800) sim.cmd('bank.withdraw', { amount: 2000 }); const sl = sim.cmd('needs.sleep', { untilHour: 6 }); if (sl.ok) tick(sl.data.minutes + 2, true); else tick(60, true); }
    return r; };
  function bank() { const c = sim.ledger.balance('cash'); if (c > 5000) sim.cmd('bank.deposit', { amount: c - 3000 }); }
  function withdrawBiz(b) { const bal = sim.ledger.balance('biz:' + b.id); const wk = sim.select('reports.pnl', { scope: b.id, period: 'week' }); const keep = Math.max(b.tier >= 2 || b.units > 4 ? 120000 : 20000, Math.round(wk.revenue * 0.2)); if (bal > keep + 1000) sim.cmd('biz.withdraw', { bizId: b.id, amount: bal - keep }); }
  function ensureVending(expand = false) {
    let v = sim.select('biz.list').find((b) => b.typeId === 'biz.vending');
    if (!v) { if (cash() < 62000) return; const r = sim.cmd('biz.create', { typeId: 'biz.vending', options: { payFrom: 'auto' } }); if (!r.ok) return; v = { id: r.data.bizId }; }
    const d = sim.select('biz.detail', { bizId: v.id }); const machines = d.units.filter((u) => u.kind === 'machine').length;
    const free = sim.select('biz.sites', { typeId: 'biz.vending' }).filter((s) => !s.taken && !s.premium).sort((a, b) => b.footfall.reduce((x, y) => x + y, 0) / (b.feePerDay + 300) - a.footfall.reduce((x, y) => x + y, 0) / (a.feePerDay + 300));
    const cap = expand ? (d.tier >= 2 ? 20 : 5) : strategy === 'tycoon' ? 5 : 4;
    if (machines < cap && cash() >= 45000 + (expand && d.tier >= 2 ? 90000 : 8000) && free.length) { sim.cmd('bank.withdraw', { amount: Math.max(0, 45000 - sim.ledger.balance('cash') + 6000) }); const r = sim.cmd('biz.addUnit', { bizId: v.id, modelId: 'prop.vending_machine', siteId: free[0].id }); if (r.ok) tick(3); }
    if (expand && machines >= 5 && d.tier < 2) { fund(v.id, 130000); sim.cmd('biz.buyUpgrade', { bizId: v.id, upgradeId: 'tier.2' }); }
    if (expand && d.tier >= 2 && machines >= 6) {
      const want = Math.ceil(machines / 12), have = d.staff.filter((e) => e.role === 'maintainer').length;
      if (have < want) { const c = sim.select('biz.candidates', { bizId: v.id }).filter((x) => x.role === 'maintainer').sort((a, b) => a.wageAsk / a.skill - b.wageAsk / b.skill)[0]; if (c) sim.cmd('biz.hire', { bizId: v.id, candidateId: c.id }); if (!sim.select('veh.owned').length && cash() >= 70000) sim.cmd('veh.buy', { modelId: 'veh.moto_125', used: true }); }
      if (have >= 1) { sim.cmd('biz.setPolicy', { bizId: v.id, patch: { autoRestock: { enabled: true } } }); fund(v.id, 150000); }
    }
    if (d.tier >= 2 && d.staff.some((e) => e.role === 'maintainer')) { withdrawBiz(v); return; }
    restock(v.id); withdrawBiz(v);
  }
  function restock(bizId) {
    const d = sim.select('biz.detail', { bizId }); if (!d.units.length) return;
    for (const u of d.units) {
      for (const itemId of ['item.ing.snack', 'item.ing.beverage']) {
        const have = u.stock[itemId] || 0, want = 30 - have; if (want < 6) continue;
        sim.cmd('bank.withdraw', { amount: 3000 }); const buy = sim.cmd('market.buy', { marketId: 'mkt.city.wholesale', itemId, qty: want, toContainer: 'player', payFrom: 'auto' });
        if (buy.ok) sim.cmd('biz.restockUnit', { bizId, unitId: u.id, itemId, qty: want, from: 'player' });
      }
      sim.cmd('biz.collectUnit', { bizId, unitId: u.id }); tick(1);
    }
  }
  function fund(bizId, amount) { let need = amount - sim.ledger.balance('biz:' + bizId); need = Math.min(need, cash() - 8000); if (need > 500) sim.cmd('biz.deposit', { bizId, amount: need }); }
  function openFood(typeId, siteId, roles, float, options = {}) {
    const c0 = sim.ledger.balance('cash'); if (c0 > 0) sim.cmd('bank.deposit', { amount: c0 });   // one pot: creation and float both draw on checking
    const r = sim.cmd('biz.create', { typeId, siteId, options: { payFrom: 'card', ...options } }); if (!r.ok) return null;
    const bizId = r.data.bizId; sim.cmd('biz.deposit', { bizId, amount: float });
    for (const [role, n] of Object.entries(roles)) for (let i = 0; i < n; i++) { const c = sim.select('biz.candidates', { bizId }).filter((x) => x.role === role).sort((a, b) => a.wageAsk / a.skill - b.wageAsk / b.skill)[0]; if (c) sim.cmd('biz.hire', { bizId, candidateId: c.id, role }); }
    sim.cmd('biz.setPolicy', { bizId, patch: { autoRestock: { enabled: true } } });
    for (const [itemId, q] of Object.entries(sim.select('biz.detail', { bizId }).policies.autoRestock.targets)) sim.cmd('biz.order', { bizId, itemId, qty: q });
    tick(5); return bizId;
  }
  // Capital allocation for the tycoon path: every business account keeps a working reserve (a tax week and a day of costs), the rest goes back to
  // the owner and into the next project of the list (Annex D 14 order: cafe, studio, restaurant, then retail, more food sites, supermarket).
  /** a business with unpaid bills is suspended after 3 days: pay them from the owner's pocket (the alert a real player would see) */
  function rescue() {
    for (const b of sim.select('biz.list')) if (b.payables > 0 && cash() > b.payables + 2000) { const c0 = sim.ledger.balance('cash'); if (c0 > 0) sim.cmd('bank.deposit', { amount: c0 }); sim.cmd('biz.deposit', { bizId: b.id, amount: b.payables + 500 }); }
  }
  function manageAll() {
    rescue();
    for (const b of sim.select('biz.list')) {
      if (b.typeId === 'biz.vending') continue;
      const bal = sim.ledger.balance('biz:' + b.id), wk = sim.select('reports.pnl', { scope: b.id, period: 'week' });
      const keep = Math.max(b.typeId === 'biz.supermarket' ? 1500000 : 150000, Math.round(wk.revenue * 0.12));
      if (bal > keep * 1.5) sim.cmd('biz.withdraw', { bizId: b.id, amount: bal - keep });
      else if (bal < keep * 0.5 && cash() > 600000) sim.cmd('biz.deposit', { bizId: b.id, amount: keep - bal });
    }
  }
  const PROJECTS = [
    { id: 'cafe', type: 'biz.cafe', site: 'site.city.food.03', roles: { barista: 2 }, cost: 1430000 + 22000, float: 150000 },
    { id: 'studio', prop: 'prop_1', cost: 1600000, float: 100000 },
    { id: 'restaurant', type: 'biz.restaurant', site: 'site.city.food.04', roles: { cook: 3, server: 3 }, cost: 3830000 + 52000, float: 250000 },
    { id: 'restaurant2', type: 'biz.restaurant', site: 'site.city.food.06', roles: { cook: 3, server: 3 }, cost: 3830000 + 52000, float: 250000 },
    { id: 'cafe2', type: 'biz.cafe', site: 'site.city.food.05', roles: { barista: 2 }, cost: 1430000 + 22000, float: 150000 },
    { id: 'restaurant3', type: 'biz.restaurant', site: 'site.city.food.02', roles: { cook: 3, server: 3 }, cost: 3830000 + 52000, float: 250000 },
    { id: 'cafe3', type: 'biz.cafe', site: 'site.city.food.01', roles: { barista: 2 }, cost: 1430000 + 22000, float: 150000 },
    { id: 'retail', type: 'biz.retail', site: 'site.city.shop.01', roles: { clerk: 2 }, cost: 2610000 + 30000, float: 200000, options: { assortment: 'convenience' } },
    { id: 'retail2', type: 'biz.retail', site: 'site.city.shop.02', roles: { clerk: 2 }, cost: 2610000 + 30000, float: 200000, options: { assortment: 'convenience' } },
    { id: 'retail3', type: 'biz.retail', site: 'site.city.shop.03', roles: { clerk: 2 }, cost: 2610000 + 30000, float: 200000, options: { assortment: 'convenience' } },
    { id: 'super', type: 'biz.supermarket', site: 'site.city.super.01', roles: { cashier: 8, manager: 1 }, cost: 18010000, float: 1500000 },
    { id: 'retail4', type: 'biz.retail', site: 'site.city.shop.04', roles: { clerk: 2 }, cost: 2610000 + 30000, float: 200000, options: { assortment: 'convenience' } },
    { id: 'retail5', type: 'biz.retail', site: 'site.city.shop.05', roles: { clerk: 2 }, cost: 2610000 + 30000, float: 200000, options: { assortment: 'convenience' } },
    { id: 'retail6', type: 'biz.retail', site: 'site.city.shop.06', roles: { clerk: 2 }, cost: 2610000 + 30000, float: 200000, options: { assortment: 'convenience' } },
  ];
  const done = new Set();
  /** take a 12-week loan covering `short` cents if the bank offers it (leverage is legal play; weekly instalments come out of checking) */
  function borrow(short) {
    const o = sim.select('bank.state').offers; if (!o.eligible) return false;
    const amount = Math.max(50000, Math.ceil(short / 10000) * 10000); if (amount > o.maxAmount) return false;
    return sim.cmd('bank.takeLoan', { amount, weeks: 12 }).ok;
  }
  function openProject(P) {
    if (P.prop) { const r = sim.cmd('prop.buy', { propId: P.prop, payFrom: 'card' }); if (r.ok) sim.cmd('prop.setRentOut', { propId: P.prop, rentPerDay: 25000 }); return r.ok; }
    const taken = sim.select('biz.sites', { typeId: P.type }).find((x) => x.id === P.site);
    if (taken && taken.taken) return false;
    const id = openFood(P.type, P.site, P.roles, P.float, P.options); return !!id;
  }
  function tycoon() {
    manageAll();
    for (const P of PROJECTS) {
      if (done.has(P.id)) continue;
      const need = P.cost + P.float + 2000;
      if (cash() < need) { if (!(useLoans && borrow(need - cash()))) return; if (cash() < need) return; }   // saves (or borrows) for the first unfinished project
      if (openProject(P)) done.add(P.id);
      return;
    }
  }
  function step() {
    care(); checkMarks();
    if (strategy === 'courier-vendor') { ensureVending(); bank(); job('job.city.delivery', 240); }
    else if (strategy === 'courier-only') { bank(); job('job.city.delivery', 240); }
    else if (strategy === 'tycoon') { ensureVending(); tycoon(); bank(); job(sim.select('skills.all').find((x) => x.id === 'skill.city.delivery').level >= 3 ? 'job.city.delivery' : 'job.city.delivery', 240); }
    else if (strategy === 'angler-trader') {
      const hasLic = sim.ctx.state.jobs.licences.includes('lic.fishing_commercial'), hasRod = sim.ctx.inv.qty('player', 'item.tool.rod_basic') > 0;
      if (!hasLic || !hasRod) {
        if (cash() >= 19000) { sim.cmd('bank.withdraw', { amount: Math.max(0, 19000 - sim.ledger.balance('cash')) }); if (!hasLic) sim.cmd('shop.buy', { poiId: 'poi.city.cityhall', itemId: 'lic.fishing_commercial' }); if (!hasRod) sim.cmd('shop.buy', { poiId: 'poi.lake.store', itemId: 'item.tool.rod_basic' }); }
        else { job('job.city.delivery', 120); bank(); }
        return;
      }
      ensureVending(); bank();
      job('job.lake.fishing', 180);
      for (const it of sim.select('inv.container', { id: 'player' }).items) if (it.itemId.startsWith('item.fish')) { const m = sim.cmd('market.sell', { marketId: 'mkt.ocean.seafood', itemId: it.itemId, qty: it.qty }); if (!m.ok) sim.cmd('market.sell', { marketId: 'mkt.lake.fish', itemId: it.itemId, qty: it.qty }); }
    }
    checkMarks();
  }
  function run(maxMinutes) { let guard = 0; while (S.played < maxMinutes && guard++ < 5000) { step(); if (S.milestones[strategy === 'tycoon' ? 'nw1m' : 'nw10k'] !== undefined) break; } return S; }
  return { S, run, step };
}
