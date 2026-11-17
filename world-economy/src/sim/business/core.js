// Business framework (Annex D 6): creation, staff, units, finance, daily/weekly close. Money moves only through the ledger.
import { BIZ_TABLE, BIZ_BY_ID, SITE_BY_ID, SITES, ASSORTMENTS, ROLE_WAGE, FIRST_NAMES, LAST_NAMES } from '../../data/businesses.js';
import { ITEM_BY_ID, LICENCE_BY_ID } from '../../data/items.js';
import { MARKETS } from '../../data/markets.js';
import { VEHICLE_ECON } from '../../data/vehicles.js';
import { BALANCE } from '../../data/balance.js';
import { ACCOUNTS, TX } from '../../data/ids.js';
import { ok, fail, ERR, posInt, clamp, dayOf, hourOf, payerAccount, clone } from '../util.js';
import { createHour } from './hour.js';

const FOOD = ['biz.foodstand', 'biz.cafe', 'biz.restaurant'];
const COLD_MODELS = new Set(['fishing', 'warehouse']);
const GROUND_MIX = {
  lake: [['item.fish.carp', 0.35], ['item.fish.perch', 0.3], ['item.fish.bass', 0.2], ['item.fish.pike', 0.1], ['item.fish.trout', 0.05]],
  ocean: [['item.fish.mackerel', 0.4], ['item.fish.cod', 0.3], ['item.fish.snapper', 0.15], ['item.fish.shrimp', 0.1], ['item.fish.tuna', 0.05]],
};
const QUOTA = { lake: 150, ocean: 1500 };

export function createBusiness(ctx) {
  const S = () => ctx.state;
  const acct = (b) => 'biz:' + b.id;
  const defaults = () => ({ businesses: [], sites: {}, bizMeta: { nextBiz: 1, nextStaff: 1, nextUnit: 1, nextCand: 1, nextContract: 1, grounds: { lake: { rich: 1, landed: 0 }, ocean: { rich: 1, landed: 0 } } } });
  const get = (id) => S().businesses.find((b) => b.id === id);
  const typeOf = (b) => BIZ_BY_ID[b.typeId];
  const upgradeDef = (b, id) => { const T = typeOf(b); return T.upgrades.find((u) => u.id === id); };
  const isFood = (id) => { const b = get(id); return !!b && FOOD.includes(b.typeId); };
  const isCold = (b) => COLD_MODELS.has(typeOf(b).model) || b.typeId === 'biz.restaurant' || b.typeId === 'biz.supermarket' || b.upgrades.some((u) => (upgradeDef(b, u) || { effect: {} }).effect.coldDays);
  const storageCap = (b) => ({ 'biz.supermarket': 8000, 'biz.warehouse': 40000, 'biz.logging': 400000 }[b.typeId] || 800 + 400 * b.tier);
  const refOf = (b, p) => p.ref;
  const mgmt = () => ctx.skills.level('skill.management');
  const staffCap = (b) => 6 + 4 * b.tier + Math.floor(mgmt() / 3) + (b.typeId === 'biz.supermarket' ? 6 : 0);
  const inv = (b) => 'biz:' + b.id;
  const isMine = (id) => !!get(id);
  const meta = () => S().bizMeta;
  // ---- helpers used by the hourly module ------------------------------------------------------------------------------------
  function freshness(b) {
    const c = S().inventory.containers[inv(b)]; if (!c) return 1;
    let n = 0, s = 0;
    for (const itemId of Object.keys(c.items)) { if (!ITEM_BY_ID[itemId] || !ITEM_BY_ID[itemId].perishable) continue; n++; const g = ctx.inv.grade(inv(b), itemId); s += g === 'fresh' ? 1 : g === 'stale' ? 0.6 : 0.2; }
    return n ? s / n : 1;
  }
  const maxServable = (b, p) => { let m = Infinity; for (const [it, n] of Object.entries(p.recipe)) m = Math.min(m, Math.floor(ctx.inv.qty(inv(b), it) / n)); return m === Infinity ? 0 : m; };
  function consume(b, p, n) { for (const [it, q] of Object.entries(p.recipe)) ctx.inv.remove(inv(b), it, q * n); }
  function shrink(b, pct) {
    const c = S().inventory.containers[inv(b)]; if (!c) return;
    for (const [it, e] of Object.entries(c.items)) { const loss = Math.floor(e.qty * pct + (ctx.rng.sim.float() < (e.qty * pct) % 1 ? 1 : 0)); if (loss > 0) ctx.inv.remove(inv(b), it, Math.min(loss, e.qty)); }
  }
  function alert(b, kind, data) {
    const al = (b.stats.today.alerted ||= {});
    const key = kind + (data && data.unitId ? data.unitId : '');
    if (al[key]) return; al[key] = 1;
    ctx.emit('biz:alert', { bizId: b.id, kind, data });
    ctx.note('biz', b.name + ': ' + kind, '');
  }
  /** business pays an obligation; a shortfall becomes a payable retried daily (Annex D 6.6) */
  function pay(b, to, amount, type, memo) {
    if (amount <= 0) return true;
    const r = ctx.ledger.transfer({ from: acct(b), to, amount, type, memo, ref: b.id });
    if (r.ok) return true;
    const f = b.finance, k = to + '|' + type;
    f.owed[k] = (f.owed[k] || 0) + amount; f.payables += amount; if (!f.payablesSince) f.payablesSince = dayOf(ctx.now());
    alert(b, 'lowCash', {});
    return false;
  }
  function receive(b, from, amount, type, memo) {
    if (amount <= 0) return;
    const r = ctx.ledger.transfer({ from, to: acct(b), amount, type, memo, ref: b.id });
    if (r.ok) b.finance.lifetimeRevenue += amount;
  }
  function landFish(b, ground, kg) {
    let left = kg;
    const mix = GROUND_MIX[ground], parts = mix.map(([id, f]) => [id, Math.floor(kg * f)]);
    parts[0][1] += kg - parts.reduce((s, p) => s + p[1], 0);
    for (const [itemId, k] of parts) {
      if (k <= 0) continue;
      ctx.inv.add(inv(b), itemId, k, { force: true });
      left -= k;
    }
    const pol = b.policies.fishSale || 'auto';
    if (pol === 'auto') {
      for (const [itemId, k] of parts) {
        if (k <= 0 || ctx.inv.qty(inv(b), itemId) < k) continue;
        let best = null, bp = 0;
        for (const [mid, M] of Object.entries(MARKETS)) { const spec = M.items[itemId]; if (spec && spec.buys && mid !== 'mkt.forest.sawmill') { const pr = ctx.market.sellPrice(mid, itemId); if (pr > bp) { bp = pr; best = mid; } } }
        if (best) ctx.market.doSell({ marketId: best, itemId, qty: k, fromContainer: inv(b), acct: acct(b), player: false });
      }
    } else if (pol.startsWith('transfer:')) {
      const to = get(pol.slice(9));
      if (to && FOOD.includes(to.typeId)) for (const [itemId, k] of parts) { const q = Math.min(k, ctx.inv.qty(inv(b), itemId)); if (q > 0) { const prem = ITEM_BY_ID[itemId].tags.includes('premium'); if (ctx.inv.add(inv(to), prem ? 'item.ing.fish_premium' : 'item.ing.fish', q * 4, { force: true }).ok) ctx.inv.remove(inv(b), itemId, q); } }
    }
  }
  function sellLogs(b) {
    if ((b.policies.logSale || 'auto') !== 'auto') return;
    for (const it of ['item.wood.log_pine', 'item.wood.log_spruce']) { const q = ctx.inv.qty(inv(b), it); if (q > 0) ctx.market.doSell({ marketId: 'mkt.forest.sawmill', itemId: it, qty: q, fromContainer: inv(b), acct: acct(b), player: false }); }
  }
  const H = createHour(ctx, { upgradeDef, refOf, freshness, maxServable, consume, shrink, alert, pay, receive, landFish, sellLogs });
  // ---- valuation --------------------------------------------------------------------------------------------------------------
  function assetValue(b) {
    let v = Math.floor((b.finance.equipCost || 0) * BALANCE.closeSellPct);
    for (const u of b.units) { if (u.kind === 'machine') v += Math.floor((u.cost || 0) * BALANCE.machineResalePct); else if (u.kind === 'boat' && !u.vehId) v += Math.floor((u.cost || 0) * BALANCE.machineResalePct); }
    return v;
  }
  // ---- candidates -------------------------------------------------------------------------------------------------------------
  function genCandidates(b) {
    const T = typeOf(b), r = ctx.rng.sim, pool = [];
    for (const role of [...T.roles, 'manager']) {
      const n = r.int(BALANCE.candidatePool[0], BALANCE.candidatePool[1]);
      for (let i = 0; i < n; i++) {
        const skill = r.int(1, 5), base = ROLE_WAGE[role] || 1300;
        pool.push({ id: 'c' + meta().nextCand++, name: r.pick(FIRST_NAMES) + ' ' + r.pick(LAST_NAMES), role, skill, wageAsk: Math.round(base * (0.8 + 0.12 * skill)) });
      }
    }
    b.candidates = { day: dayOf(ctx.now()), pool };
  }
  // ---- creation ---------------------------------------------------------------------------------------------------------------
  function defaultProducts(T, assortment) {
    if (T.assortments) { const A = ASSORTMENTS[assortment]; return A.items.map((it) => ({ id: it.split('.').pop(), item: it, name: ITEM_BY_ID[it].name, ref: Math.round(ITEM_BY_ID[it].base * A.refMult), price: Math.round(ITEM_BY_ID[it].base * A.refMult), recipe: { [it]: 1 }, share: 1 / A.items.length, active: true })); }
    return T.products.map((p) => ({ id: p.id, name: p.name, ref: p.ref, price: p.ref, recipe: { ...p.recipe }, share: p.share, active: p.active }));
  }
  function startupCosts(T, { siteId, truck, buySite }) {
    const items = [];
    const site = siteId ? SITE_BY_ID[siteId] : null;
    items.push({ what: 'fit-out', type: TX.PURCHASE_EQUIPMENT, to: 'ext:suppliers', amount: truck && T.truckStartup ? T.truckStartup : T.startup });
    for (const l of T.licences) { const L = LICENCE_BY_ID[l]; if (L.perBusiness || !ctx.jobs.hasLicence(l)) items.push({ what: l, type: TX.OPEX_LICENSE, to: 'ext:services', amount: L.price, licence: l }); }
    if (site && buySite) items.push({ what: 'site purchase', type: TX.PURCHASE_PROPERTY, to: 'ext:sellers', amount: site.buyPrice });
    else if (site && site.deposit > 0) items.push({ what: 'deposit', type: TX.RENT_PAID, to: 'ext:landlords', amount: site.deposit });
    if (T.stock) items.push({ what: 'opening stock', type: TX.PURCHASE_GOODS, to: 'ext:suppliers', amount: T.stock });
    return items.filter((i) => i.amount > 0);
  }
  function create({ typeId, name, siteId, options = {} }) {
    const T = BIZ_BY_ID[typeId];
    if (!T) return fail(ERR.NOT_FOUND, 'type');
    if (S().businesses.length >= BALANCE.maxBusinesses) return fail(ERR.LIMIT);
    let site = null;
    if (T.needsSite) {
      if (!siteId) return fail(ERR.INVALID_ARG, 'site required');
      site = SITE_BY_ID[siteId]; if (!site || !site.kinds.includes(typeId)) return fail(ERR.INVALID_ARG, 'site not suitable');
      if (S().sites[siteId]) return fail(ERR.BUSY, 'site taken');
    }
    if (T.assortments && !ASSORTMENTS[options.assortment || 'convenience']) return fail(ERR.INVALID_ARG, 'assortment');
    const costs = startupCosts(T, { siteId, truck: options.truck, buySite: options.buySite });
    const total = costs.reduce((s, c) => s + c.amount, 0) + (options.seed || 0);
    const payer = payerAccount(ctx.ledger, options.payFrom, total);
    if (total > 0 && !ctx.ledger.canAfford(payer, total)) return fail(ERR.INSUFFICIENT_FUNDS, { needed: total });
    const id = 'b' + meta().nextBiz++;
    ctx.ledger.openAccount('biz:' + id, { kind: 'business', owner: 'player' });
    let equipCost = 0, stockCost = 0;
    for (const c of costs) {
      ctx.ledger.transfer({ from: payer, to: c.to, amount: c.amount, type: c.type, memo: T.name + ': ' + c.what, ref: id });
      if (c.what === 'fit-out') equipCost = c.amount;
      if (c.what === 'opening stock') stockCost = c.amount;
      if (c.licence && !LICENCE_BY_ID[c.licence].perBusiness) ctx.state.jobs.licences.push(c.licence);
    }
    if (options.seed > 0) ctx.ledger.transfer({ from: payer, to: 'biz:' + id, amount: options.seed, type: TX.EQUITY_IN, memo: 'Working capital', ref: id });
    const assortment = T.assortments ? (options.assortment || 'convenience') : null;
    const b = {
      id, typeId, name: name || T.name, siteId: siteId || null, tier: 1, createdDay: dayOf(ctx.now()), hours: { from: T.model === 'vending' ? 0 : 7, to: T.model === 'vending' ? 24 : 19, days: [0, 1, 2, 3, 4, 5, 6] }, reputation: 0.5,
      products: defaultProducts(T, assortment), staff: [], units: [], upgrades: [], assortment, seats: T.seatsStart || 0, ownerOperates: false, assist: null,
      policies: { autoRestock: { enabled: false, targets: {}, source: 'wholesale' }, pricing: 'manual', managerId: null, reinvestPct: 0, fishSale: 'auto', logSale: 'auto' },
      finance: { payables: 0, payablesSince: 0, owed: {}, lossCarry: [], equipCost, accrued: 0, hoursToday: 0, lifetimeRevenue: 0, siteMode: site ? (options.buySite ? 'own' : 'lease') : null },
      stats: { hour: {}, today: { revenue: 0, customers: 0, lost: 0, stockouts: 0, qualitySum: 0, qualityN: 0, hoursOpen: 0, usage: {} }, days: [] },
      contracts: [], candidates: { day: 0, pool: [] },
    };
    if (T.model === 'warehouse') b.slotPrice = T.slotRef;
    S().businesses.push(b);
    if (site) S().sites[siteId] = { bizId: id, mode: options.buySite ? 'own' : 'lease', since: dayOf(ctx.now()) };
    ctx.inv.ensure(inv(b));
    if (stockCost > 0) { const A = ASSORTMENTS[assortment]; const per = Math.floor(stockCost / A.items.length); for (const it of A.items) { const q = Math.floor(per / ITEM_BY_ID[it].base); if (q > 0) ctx.inv.add(inv(b), it, q, { force: true }); } }
    genCandidates(b);
    ctx.emit('biz:created', { bizId: id, typeId });
    ctx.state.flags.autosaveDue = true;
    return ok({ bizId: id, spent: total });
  }
  function findUnitCost(b, modelId) {
    const T = typeOf(b);
    if (T.model === 'vending') return T.unitCost;
    if (T.model === 'boatrental' && T.fleet[modelId]) return T.fleet[modelId].price;
    return null;
  }
  // ---- commands ---------------------------------------------------------------------------------------------------------------
  const own = (bizId) => { const b = get(bizId); return b ? { b } : { err: fail(ERR.NOT_FOUND, 'business') }; };
  const cmds = {
    'biz.create': (a) => create(a),
    'biz.deposit': ({ bizId, amount }) => { const { b, err } = own(bizId); if (err) return err; if (!posInt(amount)) return fail(ERR.INVALID_ARG); const from = payerAccount(ctx.ledger, 'auto', amount); return ctx.ledger.transfer({ from, to: acct(b), amount, type: TX.EQUITY_IN, memo: 'Owner deposit', ref: b.id }); },
    'biz.withdraw': ({ bizId, amount }) => { const { b, err } = own(bizId); if (err) return err; if (!posInt(amount)) return fail(ERR.INVALID_ARG); return ctx.ledger.transfer({ from: acct(b), to: ACCOUNTS.CHECKING, amount, type: TX.EQUITY_OUT, memo: 'Owner withdrawal', ref: b.id }); },
    'biz.setHours': ({ bizId, from, to, days }) => {
      const { b, err } = own(bizId); if (err) return err;
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 24 || from === to) return fail(ERR.INVALID_ARG);
      if (days && (!Array.isArray(days) || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))) return fail(ERR.INVALID_ARG);
      b.hours = { from, to, days: days || b.hours.days }; ctx.emit('biz:changed', { bizId }); return ok();
    },
    'biz.setPrice': ({ bizId, productId, price }) => {
      const { b, err } = own(bizId); if (err) return err;
      if (!posInt(price)) return fail(ERR.INVALID_ARG);
      const T = typeOf(b);
      if (T.model === 'boatrental') {
        const f = T.fleet[productId]; if (!f) return fail(ERR.NOT_FOUND);
        if (price < f.ref * BALANCE.priceMin || price > f.ref * BALANCE.priceMax) return fail(ERR.INVALID_ARG, 'price out of range');
        for (const u of b.units) if (u.modelId === productId) u.price = price; return ok();
      }
      if (T.model === 'warehouse' && productId === 'slot') { if (price < T.slotRef * BALANCE.priceMin || price > T.slotRef * BALANCE.priceMax) return fail(ERR.INVALID_ARG); b.slotPrice = price; return ok(); }
      const p = b.products.find((x) => x.id === productId); if (!p) return fail(ERR.NOT_FOUND);
      if (price < p.ref * BALANCE.priceMin || price > p.ref * BALANCE.priceMax) return fail(ERR.INVALID_ARG, 'price out of range');
      p.price = price; ctx.emit('biz:changed', { bizId }); return ok();
    },
    'biz.setProductActive': ({ bizId, productId, active }) => {
      const { b, err } = own(bizId); if (err) return err;
      const p = b.products.find((x) => x.id === productId); if (!p) return fail(ERR.NOT_FOUND);
      if (p.id === 'hot' && typeOf(b).model === 'vending' && !b.upgrades.includes('vend.hotfood') && !b.units.some((u) => u.upg && u.upg.includes('vend.hotfood'))) return fail(ERR.REQUIREMENT);
      if (b.typeId === 'biz.restaurant' && active && b.products.filter((x) => x.active).length >= 8) return fail(ERR.LIMIT, 'menu holds 8 dishes');
      p.active = !!active; return ok();
    },
    'biz.hire': ({ bizId, candidateId, role }) => {
      const { b, err } = own(bizId); if (err) return err;
      const c = b.candidates.pool.find((x) => x.id === candidateId); if (!c) return fail(ERR.NOT_FOUND, 'candidate');
      if (role && role !== c.role) return fail(ERR.INVALID_ARG, 'role mismatch');
      if (b.staff.length >= staffCap(b)) return fail(ERR.LIMIT, 'staff slots full');
      const e = { id: 'e' + meta().nextStaff++, name: c.name, role: c.role, skill: c.skill, wage: Math.max(1, Math.round(c.wageAsk * (1 - 0.01 * (mgmt() - 1)))), morale: 0.7, hiredDay: dayOf(ctx.now()), unitId: null };
      b.staff.push(e); b.candidates.pool = b.candidates.pool.filter((x) => x !== c);
      if (c.role === 'manager' && !b.policies.managerId) b.policies.managerId = e.id;
      ctx.emit('biz:changed', { bizId });
      return ok({ staffId: e.id });
    },
    'biz.fire': ({ bizId, staffId }) => {
      const { b, err } = own(bizId); if (err) return err;
      const i = b.staff.findIndex((e) => e.id === staffId); if (i < 0) return fail(ERR.NOT_FOUND);
      if (b.policies.managerId === staffId) b.policies.managerId = null;
      b.staff.splice(i, 1); ctx.emit('biz:changed', { bizId }); return ok();
    },
    'biz.setWage': ({ bizId, staffId, wage }) => {
      const { b, err } = own(bizId); if (err) return err;
      const e = b.staff.find((x) => x.id === staffId); if (!e) return fail(ERR.NOT_FOUND);
      if (!posInt(wage) || wage > 10000) return fail(ERR.INVALID_ARG);
      if (wage > e.wage) e.morale = Math.min(1, e.morale + 0.05); e.wage = wage; return ok();
    },
    'biz.assign': ({ bizId, staffId, unitId }) => {
      const { b, err } = own(bizId); if (err) return err;
      const e = b.staff.find((x) => x.id === staffId); if (!e) return fail(ERR.NOT_FOUND, 'staff');
      if (unitId !== null && !b.units.find((u) => u.id === unitId)) return fail(ERR.NOT_FOUND, 'unit');
      e.unitId = unitId; return ok();
    },
    'biz.order': ({ bizId, itemId, qty, source = 'wholesale' }) => {
      const { b, err } = own(bizId); if (err) return err;
      if (!ITEM_BY_ID[itemId] || !posInt(qty)) return fail(ERR.INVALID_ARG);
      const r = orderFor(b, itemId, qty, source, null);
      return r;
    },
    'biz.setPolicy': ({ bizId, patch }) => {
      const { b, err } = own(bizId); if (err) return err;
      if (!patch || typeof patch !== 'object') return fail(ERR.INVALID_ARG);
      const P = b.policies;
      if (patch.autoRestock) {
        const a = patch.autoRestock;
        if (a.targets && Object.entries(a.targets).some(([k, v]) => !ITEM_BY_ID[k] || !Number.isInteger(v) || v < 0)) return fail(ERR.INVALID_ARG, 'targets');
        P.autoRestock = { ...P.autoRestock, ...a, targets: a.targets ? { ...a.targets } : P.autoRestock.targets, autoTargets: a.targets ? false : (a.autoTargets !== undefined ? !!a.autoTargets : P.autoRestock.autoTargets !== false) };
        if (P.autoRestock.enabled && !Object.keys(P.autoRestock.targets).length) P.autoRestock.targets = suggestTargets(b);
      }
      if (patch.pricing) { if (!['manual', 'auto'].includes(patch.pricing)) return fail(ERR.INVALID_ARG); if (patch.pricing === 'auto' && !managerOk(b)) return fail(ERR.REQUIREMENT, 'needs a manager and management L3'); P.pricing = patch.pricing; }
      if (patch.managerId !== undefined) { if (patch.managerId !== null && !b.staff.find((e) => e.id === patch.managerId && e.role === 'manager')) return fail(ERR.NOT_FOUND); P.managerId = patch.managerId; }
      if (patch.reinvestPct !== undefined) { if (!(patch.reinvestPct >= 0 && patch.reinvestPct <= 1)) return fail(ERR.INVALID_ARG); P.reinvestPct = patch.reinvestPct; }
      for (const k of ['fishSale', 'logSale']) if (patch[k] !== undefined) P[k] = patch[k];
      if (patch.ownerOperates !== undefined) b.ownerOperates = !!patch.ownerOperates;
      if (patch.slotPrice !== undefined) return cmds['biz.setPrice']({ bizId, productId: 'slot', price: patch.slotPrice });
      if (patch.assortment !== undefined) { if (!typeOf(b).assortments || !ASSORTMENTS[patch.assortment]) return fail(ERR.INVALID_ARG); if (patch.assortment !== b.assortment) { const fee = 300000; const r = ctx.ledger.transfer({ from: acct(b), to: 'ext:suppliers', amount: fee, type: TX.PURCHASE_EQUIPMENT, memo: 'Refit', ref: b.id }); if (!r.ok) return r; b.assortment = patch.assortment; b.products = defaultProducts(typeOf(b), patch.assortment); } }
      ctx.emit('biz:changed', { bizId }); return ok();
    },
    'biz.buyUpgrade': ({ bizId, upgradeId, unitId }) => {
      const { b, err } = own(bizId); if (err) return err;
      const T = typeOf(b);
      if (/^tier\.\d$/.test(upgradeId)) {
        const tier = Number(upgradeId.slice(5)), td = T.tiers.find((x) => x.tier === tier);
        if (!td || tier !== b.tier + 1) return fail(ERR.INVALID_ARG);
        if (b.finance.lifetimeRevenue < (td.minRevenue || 0)) return fail(ERR.REQUIREMENT, 'lifetime revenue');
        if (td.minUnits && b.units.length < td.minUnits && !(T.model === 'rental' && ctx.property.rentalCount(b.id) >= td.minUnits)) return fail(ERR.REQUIREMENT, 'units');
        if (mgmt() < tier) return fail(ERR.REQUIREMENT, 'skill.management');
        if (td.cost > 0) { const r = ctx.ledger.transfer({ from: acct(b), to: 'ext:suppliers', amount: td.cost, type: TX.PURCHASE_UPGRADE, memo: 'Tier ' + tier, ref: b.id }); if (!r.ok) return r; }
        b.tier = tier; ctx.emit('biz:changed', { bizId }); return ok({ tier });
      }
      const u = T.upgrades.find((x) => x.id === upgradeId); if (!u) return fail(ERR.NOT_FOUND);
      if (u.perUnit) {
        const un = b.units.find((x) => x.id === unitId); if (!un) return fail(ERR.NOT_FOUND, 'unit');
        un.upg = un.upg || []; if (un.upg.includes(upgradeId)) return fail(ERR.BUSY, 'owned');
        const r = ctx.ledger.transfer({ from: acct(b), to: 'ext:suppliers', amount: u.cost, type: TX.PURCHASE_UPGRADE, memo: u.name, ref: b.id }); if (!r.ok) return r;
        un.upg.push(upgradeId); b.finance.equipCost += u.cost; if (u.effect.beverageRef) { /* handled per unit */ } ctx.emit('biz:changed', { bizId }); return ok();
      }
      if (b.upgrades.includes(upgradeId)) return fail(ERR.BUSY, 'owned');
      if (u.requires && !b.upgrades.includes(u.requires)) return fail(ERR.REQUIREMENT, u.requires);
      if (u.cost > 0) { const r = ctx.ledger.transfer({ from: acct(b), to: 'ext:suppliers', amount: u.cost, type: TX.PURCHASE_UPGRADE, memo: u.name, ref: b.id }); if (!r.ok) return r; }
      b.upgrades.push(upgradeId); b.finance.equipCost += u.cost;
      if (u.effect.seats) b.seats += u.effect.seats;
      if (u.effect.product) { const p = b.products.find((x) => x.id === u.effect.product); if (p) p.active = true; }
      ctx.emit('biz:changed', { bizId }); return ok();
    },
    'biz.addUnit': ({ bizId, modelId, vehId, siteId, propId }) => addUnit(bizId, { modelId, vehId, siteId, propId }),
    'biz.removeUnit': ({ bizId, unitId }) => {
      const { b, err } = own(bizId); if (err) return err;
      const i = b.units.findIndex((u) => u.id === unitId); if (i < 0) return fail(ERR.NOT_FOUND);
      const u = b.units[i];
      if (u.kind === 'machine' || (u.kind === 'boat' && !u.vehId)) { const v = Math.floor((u.cost || 0) * BALANCE.machineResalePct); if (v > 0) ctx.ledger.transfer({ from: 'ext:buyers', to: acct(b), amount: v, type: TX.SALE_GOODS, memo: 'Unit sold', ref: b.id }); }
      if (u.vehId) ctx.veh.unassign(u.vehId);
      if (u.siteId && S().sites[u.siteId] && S().sites[u.siteId].bizId === b.id) delete S().sites[u.siteId];
      for (const e of b.staff) if (e.unitId === unitId) e.unitId = null;
      b.units.splice(i, 1); ctx.emit('biz:changed', { bizId }); return ok();
    },
    'biz.restockUnit': ({ bizId, unitId, itemId, qty, from = 'player' }) => {
      const { b, err } = own(bizId); if (err) return err;
      const u = b.units.find((x) => x.id === unitId); if (!u || u.kind !== 'machine') return fail(ERR.NOT_FOUND);
      if (!ITEM_BY_ID[itemId] || !posInt(qty)) return fail(ERR.INVALID_ARG);
      const T = typeOf(b);
      const sellable = b.products.some((p) => p.recipe[itemId]);
      if (!sellable) return fail(ERR.INVALID_ARG, 'not a product of this machine');
      if (ctx.services.nearUnit && !ctx.services.nearUnit(u.siteId)) return fail(ERR.OUT_OF_RANGE);
      const cur = Object.values(u.stock).reduce((s, n) => s + n, 0);
      if (cur + qty > T.unitSlots) return fail(ERR.CAPACITY, { free: T.unitSlots - cur });
      const src = from === 'biz' ? inv(b) : 'player';
      if (ctx.inv.qty(src, itemId) < qty) return fail(ERR.NOT_FOUND, 'not enough stock');
      ctx.inv.remove(src, itemId, qty); u.stock[itemId] = (u.stock[itemId] || 0) + qty;
      ctx.emit('biz:changed', { bizId }); return ok({ stock: u.stock[itemId] });
    },
    'biz.collectUnit': ({ bizId, unitId }) => {
      const { b, err } = own(bizId); if (err) return err;
      const u = b.units.find((x) => x.id === unitId); if (!u || u.kind !== 'machine') return fail(ERR.NOT_FOUND);
      if (ctx.services.nearUnit && !ctx.services.nearUnit(u.siteId)) return fail(ERR.OUT_OF_RANGE);
      const got = u.cash; u.cash = 0; u.fullBox = false; return ok({ collected: got });
    },
    'biz.repairUnit': ({ bizId, unitId }) => {
      const { b, err } = own(bizId); if (err) return err;
      const u = b.units.find((x) => x.id === unitId); if (!u) return fail(ERR.NOT_FOUND);
      if (ctx.services.nearUnit && u.siteId && !ctx.services.nearUnit(u.siteId)) return fail(ERR.OUT_OF_RANGE);
      return repairUnit(b, u, 'player');
    },
    'biz.acceptContract': ({ bizId, contractId }) => {
      const { b, err } = own(bizId); if (err) return err;
      if (typeOf(b).model !== 'delivery') return fail(ERR.REQUIREMENT);
      const c = (S().bizMeta.contracts || []).find((x) => x.id === contractId); if (!c || c.takenBy) return fail(ERR.NOT_FOUND);
      if (!b.units.some((u) => u.kind === 'vehicle' && (c.kind !== 'freight' || u.modelId === 'veh.boxtruck'))) return fail(ERR.REQUIREMENT, 'vehicle');
      c.takenBy = b.id; (b.contracts ||= []).push({ id: c.id, fee: c.fee, accepted: true, done: false, kind: c.kind }); return ok();
    },
    'biz.staffAssist': ({ bizId, hours, score }) => {
      const { b, err } = own(bizId); if (err) return err;
      if (!(hours > 0 && hours <= 12) || !Number.isFinite(score)) return fail(ERR.INVALID_ARG);
      b.assist = { hours: Math.min(12, (b.assist ? b.assist.hours : 0) + hours), score: clamp(score, 0, 1) }; return ok();
    },
    'biz.close': ({ bizId }) => closeBiz(bizId),
    'biz.sell': ({ bizId }) => sellBiz(bizId),
    'site.lease': ({ siteId, bizId }) => siteLease(siteId, bizId, false),
    'site.buy': ({ siteId, bizId }) => siteLease(siteId, bizId, true),
    'site.release': ({ siteId }) => siteRelease(siteId),
  };
  function managerOk(b) { return !!b.policies.managerId && mgmt() >= 3; }
  function repairUnit(b, u, who) {
    const T = typeOf(b);
    if (u.condition >= 0.999 && !u.jammed) return fail(ERR.INVALID_ARG, 'no repair needed');
    const src = who === 'player' && ctx.inv.qty('player', 'item.parts') > 0 ? 'player' : ctx.inv.qty(inv(b), 'item.parts') > 0 ? inv(b) : null;
    if (src) ctx.inv.remove(src, 'item.parts', 1);
    else { const fee = 4000; const payer = who === 'player' ? payerAccount(ctx.ledger, 'auto', fee) : acct(b); const r = ctx.ledger.transfer({ from: payer, to: 'ext:services', amount: fee, type: TX.OPEX_MAINTENANCE, memo: 'Machine repair', ref: b.id }); if (!r.ok) return r; }
    u.condition = 1; u.jammed = false; void T; return ok();
  }
  function siteLease(siteId, bizId, buy) {
    const site = SITE_BY_ID[siteId]; if (!site) return fail(ERR.NOT_FOUND);
    if (S().sites[siteId]) return fail(ERR.BUSY);
    const b = bizId ? get(bizId) : null; if (bizId && !b) return fail(ERR.NOT_FOUND, 'business');
    if (b && !site.kinds.includes(b.typeId)) return fail(ERR.INVALID_ARG, 'site not suitable');
    const cost = buy ? site.buyPrice : site.deposit;
    if (cost > 0) { const payer = payerAccount(ctx.ledger, 'auto', cost); const r = ctx.ledger.transfer({ from: payer, to: buy ? 'ext:sellers' : 'ext:landlords', amount: cost, type: buy ? TX.PURCHASE_PROPERTY : TX.RENT_PAID, memo: siteId }); if (!r.ok) return r; }
    S().sites[siteId] = { bizId: bizId || null, mode: buy ? 'own' : 'lease', since: dayOf(ctx.now()) };
    if (b) { b.siteId = siteId; b.finance.siteMode = buy ? 'own' : 'lease'; }
    return ok();
  }
  function siteRelease(siteId) {
    const s = S().sites[siteId]; if (!s) return fail(ERR.NOT_FOUND);
    const site = SITE_BY_ID[siteId], b = s.bizId ? get(s.bizId) : null;
    if (b && (b.siteId === siteId)) return fail(ERR.BUSY, 'close or move the business first');
    if (b && b.units.some((u) => u.siteId === siteId)) return fail(ERR.BUSY, 'unit placed here');
    releaseSite(siteId, s, site, 'checking');
    return ok();
  }
  function releaseSite(siteId, s, site, dest) {
    const to = dest === 'checking' ? ACCOUNTS.CHECKING : dest;
    if (s.mode === 'own') { const v = Math.floor(site.buyPrice * BALANCE.propertySellPct); if (v > 0) ctx.ledger.transfer({ from: 'ext:buyers', to, amount: v, type: TX.SALE_PROPERTY, memo: siteId }); }
    else if (site.deposit > 0) ctx.ledger.transfer({ from: 'ext:landlords', to, amount: site.deposit, type: TX.RENT_RECEIVED, memo: 'Deposit refund ' + siteId });
    delete S().sites[siteId];
  }
  function addUnit(bizId, { modelId, vehId, siteId, propId }) {
    const { b, err } = own(bizId); if (err) return err;
    const T = typeOf(b);
    const id = 'u' + meta().nextUnit++;
    const bump = () => { meta().nextUnit--; };
    if (T.model === 'vending') {
      if (modelId && modelId !== 'prop.vending_machine') { bump(); return fail(ERR.INVALID_ARG); }
      const site = SITE_BY_ID[siteId]; if (!site || !site.kinds.includes('biz.vending')) { bump(); return fail(ERR.INVALID_ARG, 'site'); }
      if (S().sites[siteId]) { bump(); return fail(ERR.BUSY, 'site taken'); }
      if (site.premium && b.tier < 3) { bump(); return fail(ERR.REQUIREMENT, 'tier 3'); }
      if (b.units.filter((u) => u.kind === 'machine').length >= 4 && b.tier < 2) { bump(); return fail(ERR.REQUIREMENT, 'tier 2 company needed for more than 4 machines'); }
      if (b.units.filter((u) => u.kind === 'machine').length >= 20 && b.tier < 3) { bump(); return fail(ERR.REQUIREMENT, 'tier 3'); }
      if (ctx.services.nearUnit && !ctx.services.nearUnit(siteId)) { bump(); return fail(ERR.OUT_OF_RANGE); }
      const cost = Math.round(T.unitCost * (b.tier >= 2 ? 1 - 0.10 : 1));
      const payer = payerAccount(ctx.ledger, 'auto', cost);
      const r = ctx.ledger.transfer({ from: payer, to: 'ext:suppliers', amount: cost, type: TX.PURCHASE_EQUIPMENT, memo: 'Vending machine', ref: b.id });
      if (!r.ok) { bump(); return r; }
      b.units.push({ id, kind: 'machine', modelId: 'prop.vending_machine', siteId, condition: 1, stock: {}, cash: 0, fullBox: false, jammed: false, cost, upg: [] });
      S().sites[siteId] = { bizId: b.id, mode: 'lease', since: dayOf(ctx.now()), unit: id };
      ctx.emit('biz:changed', { bizId }); return ok({ unitId: id });
    }
    if (T.model === 'rental') {
      bump();
      if (!propId) return fail(ERR.INVALID_ARG);
      return ctx.property.assignToRental(propId, b.id);
    }
    if (T.model === 'boatrental') {
      const d = T.fleet[modelId]; if (!d) { bump(); return fail(ERR.INVALID_ARG, 'model'); }
      const payer = payerAccount(ctx.ledger, 'auto', d.price);
      const r = ctx.ledger.transfer({ from: payer, to: 'ext:suppliers', amount: d.price, type: TX.PURCHASE_EQUIPMENT, memo: modelId, ref: b.id });
      if (!r.ok) { bump(); return r; }
      b.units.push({ id, kind: 'boat', modelId, condition: 1, busy: 0, cost: d.price, price: d.rate });
      ctx.emit('biz:changed', { bizId }); return ok({ unitId: id });
    }
    if (T.model === 'fishing' || T.model === 'delivery' || T.model === 'logging') {
      const table = T.model === 'fishing' ? T.boats : T.model === 'delivery' ? T.vehicles : { 'veh.logtruck': {} };
      let v;
      if (vehId) { v = ctx.veh.get(vehId); if (!v) { bump(); return fail(ERR.NOT_FOUND, 'vehicle'); } if (v.bizId) { bump(); return fail(ERR.BUSY, 'already assigned'); } }
      else {
        if (!table[modelId]) { bump(); return fail(ERR.INVALID_ARG, 'model not usable here'); }
        const r = ctx.veh.buyInternal({ modelId, used: !!VEHICLE_ECON[modelId].used, payFrom: 'auto', colour: 0 }); if (!r.ok) { bump(); return r; }
        v = ctx.veh.get(r.data.vehId);
      }
      if (!table[v.model]) { bump(); return fail(ERR.INVALID_ARG, 'model not usable here'); }
      if (T.model === 'fishing' && !(v.model.startsWith('boat.'))) { bump(); return fail(ERR.INVALID_ARG); }
      ctx.veh.assign(v.id, b.id);
      b.units.push({ id, kind: T.model === 'fishing' ? 'boat' : 'vehicle', modelId: v.model, vehId: v.id, siteId: siteId || b.siteId, condition: v.condition, stock: {}, trip: null });
      ctx.emit('biz:changed', { bizId }); return ok({ unitId: id });
    }
    bump(); return fail(ERR.INVALID_ARG, 'this business type has no units');
  }
  // ---- ordering ----------------------------------------------------------------------------------------------------------------
  function deliverySurcharge(b, manual) {
    if (hasWarehouseSupply()) return -0.12;
    if (ownDeliveryCapacity()) return 0;
    if (manual) return BALANCE.wholesaleDeliveryPct;
    return managerOk(b) ? BALANCE.wholesaleDeliveryPct * 0 : BALANCE.autoRestockSurcharge;
  }
  const hasWarehouseSupply = () => S().businesses.some((x) => x.typeId === 'biz.warehouse' && x.staff.some((e) => e.role === 'forklift') && !x.suspended);
  const ownDeliveryCapacity = () => S().businesses.some((x) => x.typeId === 'biz.delivery' && x.units.some((u) => u.kind === 'vehicle') && !x.suspended);
  function pickMarket(itemId, source) {
    if (MARKETS[source] && MARKETS[source].items[itemId] && MARKETS[source].items[itemId].sells) return source;
    let best = null, bp = Infinity;
    for (const [mid, M] of Object.entries(MARKETS)) { const sp = M.items[itemId]; if (sp && sp.sells) { const p = ctx.market.buyPrice(mid, itemId); if (p < bp) { bp = p; best = mid; } } }
    return best;
  }
  function orderFor(b, itemId, qty, source, autoMode) {
    const mk = pickMarket(itemId, source);
    if (!mk) return fail(ERR.NOT_FOUND, 'no market sells ' + itemId);
    return ctx.market.doBuy({ marketId: mk, itemId, qty, toContainer: inv(b), acct: acct(b), surcharge: deliverySurcharge(b, autoMode === null), check: false, memo: 'Order ' + itemId + ' x' + qty });
  }
  function suggestTargets(b) {
    const T = typeOf(b), t = {};
    const days = 1.0, grow = 1.5;
    for (const p of b.products) if (p.active) for (const [it, n] of Object.entries(p.recipe)) {
      const used = (b.stats.days.length ? b.stats.days.slice(-3).reduce((s, d) => s + ((d.usage && d.usage[it]) || 0), 0) / Math.min(3, b.stats.days.length) : 0);
      const dflt = T.model === 'vending' ? 30 * (b.units.filter((u) => u.kind === 'machine').length || 1) : T.id === 'biz.supermarket' ? 800 : T.id === 'biz.retail' ? 150 : 80;
      t[it] = Math.max(t[it] || 0, Math.ceil(Math.max(used * grow * days, dflt * n)));
    }
    return t;
  }
  function autoRestock(b, lowOnly) {
    const P = b.policies.autoRestock;
    if (!P.enabled) return;
    if (!lowOnly && P.autoTargets !== false) P.targets = { ...P.targets, ...suggestTargets(b) };
    for (const [it, target] of Object.entries(P.targets)) {
      const have = ctx.inv.qty(inv(b), it);
      if (lowOnly && have >= target * 0.3) continue;
      let need = target - have; if (need <= 0) continue;
      const mk = pickMarket(it, P.source); if (!mk) continue;
      const free = ctx.inv.freeKg(inv(b)) / (ITEM_BY_ID[it].weight || 1); need = Math.min(need, Math.floor(free));
      const stock = Math.floor(ctx.market.stockOf(mk, it)); need = Math.min(need, stock);
      const afford = (qty) => Math.ceil(ctx.market.quote(mk, it, qty, 'buy').total * (1 + deliverySurcharge(b, false)));
      while (need > 0 && !ctx.ledger.canAfford(acct(b), afford(need))) need = Math.floor(need * 0.7);
      if (need > 0) ctx.market.doBuy({ marketId: mk, itemId: it, qty: need, toContainer: inv(b), acct: acct(b), surcharge: deliverySurcharge(b, false), check: false, memo: 'Auto-restock ' + it });
    }
  }
  // ---- close / sell ------------------------------------------------------------------------------------------------------------
  function liquidate(b) {
    // equipment, machines and fleet at resale; stock at market sell value; owner vehicles are released not sold
    let proceeds = assetValue(b);
    const c = S().inventory.containers[inv(b)];
    if (c) for (const [it, e] of Object.entries(c.items)) proceeds += e.qty * ctx.market.unitValue(it);
    return proceeds;
  }
  function wind(b, endType) {
    const A = acct(b);
    const val = liquidate(b);
    if (val > 0) ctx.ledger.transfer({ from: 'ext:buyers', to: A, amount: val, type: endType, memo: 'Liquidation', ref: b.id });
    // pay payables
    for (const [k, amt] of Object.entries(b.finance.owed)) { const [to, type] = k.split('|'); ctx.ledger.transfer({ from: A, to, amount: amt, type, memo: 'Settled payable', ref: b.id }); }
    b.finance.owed = {}; b.finance.payables = 0;
    const accr = b.finance.accrued; if (accr > 0) ctx.ledger.transfer({ from: A, to: 'ext:staff', amount: Math.min(accr, ctx.ledger.balance(A)), type: TX.PAYROLL, memo: 'Final payroll', ref: b.id });
    // release units and sites
    for (const u of b.units) if (u.vehId) ctx.veh.unassign(u.vehId);
    for (const [siteId, s] of Object.entries(S().sites)) if (s.bizId === b.id) releaseSite(siteId, s, SITE_BY_ID[siteId], A);
    const bal = ctx.ledger.balance(A);
    if (bal > 0) ctx.ledger.transfer({ from: A, to: ACCOUNTS.CHECKING, amount: bal, type: TX.EQUITY_OUT, memo: 'Business closed', ref: b.id });
    delete S().inventory.containers[inv(b)];
    ctx.ledger.closeAccount(A);
    S().businesses = S().businesses.filter((x) => x !== b);
    ctx.property.releaseRental(b.id);
  }
  function deficit(b) {
    // projected cash after liquidation vs owed
    const owed = b.finance.payables + b.finance.accrued;
    return Math.max(0, owed - (ctx.ledger.balance(acct(b)) + liquidate(b)));
  }
  function closeBiz(bizId) {
    const { b, err } = own(bizId); if (err) return err;
    const d = deficit(b);
    if (d > 0) return fail(ERR.INSUFFICIENT_FUNDS, { deficit: d });
    wind(b, TX.SALE_GOODS);
    ctx.emit('biz:closed', { bizId, typeId: b.typeId });
    return ok();
  }
  function sellBiz(bizId) {
    const { b, err } = own(bizId); if (err) return err;
    if (deficit(b) > 0) return fail(ERR.INSUFFICIENT_FUNDS, 'pay your payables first');
    const days = b.stats.days.slice(-28), weekly = days.length ? days.reduce((s, d) => s + d.profit, 0) / Math.max(1, days.length) * 7 : 0;
    const premium = Math.max(0, Math.floor(weekly * BALANCE.goingConcernWeeks));
    wind(b, TX.SALE_GOODS);
    if (premium > 0) ctx.ledger.transfer({ from: 'ext:buyers', to: ACCOUNTS.CHECKING, amount: premium, type: TX.SALE_GOODS, memo: 'Going-concern premium', ref: b.id });
    ctx.emit('biz:closed', { bizId, typeId: b.typeId, sold: true });
    return ok({ premium });
  }
  // ---- ticks -------------------------------------------------------------------------------------------------------------------
  function hourly(hour, t) {
    for (const b of S().businesses.slice()) {
      H.simulateHour(b, hour, t);
      if (b.policies.autoRestock.enabled && !b.suspended && hour % 3 === 2) autoRestock(b, true);
      ctx.emit('biz:hourly', { bizId: b.id, report: { revenue: b.stats.today.revenue, customers: b.stats.today.customers } });
    }
  }
  function dailyClose(b) {
    const T = typeOf(b), today = dayOf(ctx.now()) - 1; // closing the day that just ended
    const A = acct(b), site = SITE_BY_ID[b.siteId];
    let allPaid = true;
    const f = b.finance;
    if (f.accrued > 0) { const amt = f.accrued; f.accrued = 0; allPaid = pay(b, 'ext:staff', amt, TX.PAYROLL, 'Payroll') && allPaid; }
    f.hoursToday = 0;
    if (site && f.siteMode === 'lease' && site.leasePerDay > 0) allPaid = pay(b, 'ext:landlords', site.leasePerDay, TX.RENT_PAID, 'Lease') && allPaid;
    const fx = T.fixedPerDay;
    if (fx.utilities) allPaid = pay(b, 'ext:services', fx.utilities, TX.OPEX_UTILITIES, 'Utilities') && allPaid;
    if (fx.site && site) allPaid = pay(b, 'ext:services', fx.site, TX.OPEX_SITE, 'Pitch fee') && allPaid;
    if (fx.parking) allPaid = pay(b, 'ext:services', fx.parking * Math.max(1, b.units.filter((u) => u.kind === 'vehicle').length), TX.PARKING, 'Parking') && allPaid;
    if (fx.upkeep) allPaid = pay(b, 'ext:services', fx.upkeep, TX.OPEX_MAINTENANCE, 'Upkeep') && allPaid;
    for (const u of b.units) { if (u.kind === 'machine') { const s = SITE_BY_ID[u.siteId]; if (s && s.feePerDay) allPaid = pay(b, 'ext:services', s.feePerDay, TX.OPEX_SITE, 'Site fee ' + u.siteId) && allPaid; u.condition = Math.max(0, u.condition - 0.01); } else if (u.kind === 'boat' && !u.vehId) u.condition = Math.max(0, u.condition - 0.002); }
    // retry payables
    if (f.payables > 0) {
      for (const [k, amt] of Object.entries(f.owed)) { const [to, type] = k.split('|'); const can = Math.min(amt, ctx.ledger.balance(A)); if (can > 0 && ctx.ledger.transfer({ from: A, to, amount: can, type, memo: 'Payable', ref: b.id }).ok) { f.owed[k] -= can; f.payables -= can; if (f.owed[k] <= 0) delete f.owed[k]; } }
      if (f.payables <= 0) { f.payables = 0; f.payablesSince = 0; b.suspended = false; }
      else if (f.payablesSince && today + 1 - f.payablesSince > BALANCE.payablesSuspendDays && !b.suspended) { b.suspended = true; ctx.note('biz', b.name + ' suspended', 'Unpaid bills'); }
    }
    // spoilage and shrink on stock
    // staff morale
    for (const e of b.staff.slice()) {
      e.morale = clamp(e.morale + (allPaid ? 0.02 : -0.1), 0, 1);
      if (e.morale < 0.3) { alert(b, 'staffQuit', { staffId: e.id }); b.staff = b.staff.filter((x) => x !== e); if (b.policies.managerId === e.id) b.policies.managerId = null; }
    }
    // maintainers service vending machines
    // auto restock, then maintainers distribute
    autoRestock(b);
    if (T.model === 'vending') maintain(b);
    if (managerOk(b) && b.policies.pricing === 'auto') autoPrice(b);
    // growth of ground richness handled globally; daily report
    const rep = ctx.reports.pnlRange(b.id, today, today);
    const st = b.stats.today;
    const report = { day: today, revenue: rep.revenue, cogs: rep.cogs, payroll: rep.payroll, opex: rep.opex, tax: rep.tax, profit: rep.profit, customers: st.customers, lost: Math.round(st.lost), stockouts: st.stockouts, avgQuality: st.qualityN ? Math.round(st.qualitySum / st.qualityN * 100) / 100 : 0, reputation: Math.round(b.reputation * 1000) / 1000, usage: st.usage || {} };
    b.stats.days.push(report); if (b.stats.days.length > 28) b.stats.days.shift();
    b.stats.today = { revenue: 0, customers: 0, lost: 0, stockouts: 0, qualitySum: 0, qualityN: 0, hoursOpen: 0, usage: {} };
    if (rep.profit > 0) ctx.skills.addXp('skill.management', 15);
    if (b.reputation >= 0 && T.model === 'retail') { const r = Math.round(clamp(1 + 4 * b.reputation, 1, 5) * 10) / 10; if (today % 3 === 0) { ctx.emit('biz:alert', { bizId: b.id, kind: 'review', data: { score: r } }); } }
    if (today % BALANCE.candidateRefreshDays === 0) genCandidates(b);
    ctx.emit('biz:daily', { bizId: b.id, report });
  }
  function maintain(b) {
    const maint = b.staff.filter((e) => e.role === 'maintainer'); if (!maint.length) return;
    const hasVehicle = b.units.some((u) => u.kind === 'vehicle') || ctx.veh.count() > 0; if (!hasVehicle) return;
    let visits = maint.length * 12; if (!visits) return;
    for (const u of b.units) {
      if (u.kind !== 'machine' || visits <= 0) continue;
      visits--;
      // collect
      u.cash = 0; u.fullBox = false;
      // restock from the business depot up to par
      const act = new Set(); for (const p of b.products) if (p.active && (!p.hot || (u.upg && u.upg.includes('vend.hotfood')))) for (const it of Object.keys(p.recipe)) act.add(it);
      for (const it of act) {
        const p = { active: true };
        const have = u.stock[it] || 0, par = Math.floor(typeOf(b).unitSlots / act.size); const need = Math.min(par - have, ctx.inv.qty(inv(b), it));
        const cur = Object.values(u.stock).reduce((s, n) => s + n, 0);
        const room = Math.min(need, typeOf(b).unitSlots - cur);
        if (room > 0 && (p.active || have > 0)) { ctx.inv.remove(inv(b), it, room); u.stock[it] = have + room; }
      }
      if (u.condition < 0.6 || u.jammed) repairUnit(b, u, 'biz');
    }
  }
  function autoPrice(b) {
    for (const p of b.products) { const stock = maxServable(b, p); const target = stock < 10 ? 1.08 : stock > 80 ? 0.96 : 1.0; p.price = clamp(Math.round(p.ref * target), Math.ceil(p.ref * 0.9), Math.floor(p.ref * 1.1)); }
  }
  function daily() {
    // fishing grounds: quota depletion and 5% recovery (Annex D 7.5)
    for (const [g, q] of Object.entries(QUOTA)) { const gr = meta().grounds[g]; if (gr.landed > q) gr.rich = Math.max(0.4, gr.rich - 0.1 * (gr.landed - q) / q); gr.rich = Math.min(1, gr.rich + 0.05 * (1 - gr.rich + 0.2)); gr.landed = 0; }
    // delivery contract board
    const day = dayOf(ctx.now());
    meta().contracts = [];
    for (let i = 0; i < 5; i++) { const kind = i < 3 ? 'parcel' : i === 3 ? 'restock' : 'freight'; meta().contracts.push({ id: 'k' + meta().nextContract++, kind, fee: kind === 'freight' ? 90000 : kind === 'restock' ? 25000 : 14000, day, takenBy: null }); }
    for (const b of S().businesses.slice()) dailyClose(b);
    for (const b of S().businesses) { for (const c of (b.contracts || [])) c.stale = true; b.contracts = (b.contracts || []).filter((c) => !c.done); }
  }
  /** Monday 00:00: 12% tax on the previous week's positive cash-basis profit (Annex D 3.2), losses carry 4 weeks */
  function weekly() {
    const today = dayOf(ctx.now());
    for (const b of S().businesses.slice()) {
      const rep = ctx.reports.pnlRange(b.id, today - 7, today - 1);
      let profit = rep.profit; const week = Math.floor((today - 1) / 7);
      b.finance.lossCarry = b.finance.lossCarry.filter((l) => week - l.week <= BALANCE.lossCarryWeeks);
      if (profit < 0) { b.finance.lossCarry.push({ week, amt: -profit }); continue; }
      for (const l of b.finance.lossCarry) { const use = Math.min(l.amt, profit); l.amt -= use; profit -= use; }
      b.finance.lossCarry = b.finance.lossCarry.filter((l) => l.amt > 0);
      const tax = Math.ceil(profit * BALANCE.businessTax);
      if (tax > 0) pay(b, 'ext:tax', tax, TX.TAX_BUSINESS, 'Business tax');
    }
  }
  // ---- selects -----------------------------------------------------------------------------------------------------------------
  const summary = (b) => ({ id: b.id, typeId: b.typeId, name: b.name, siteId: b.siteId, tier: b.tier, balance: ctx.ledger.balance(acct(b)), reputation: Math.round(b.reputation * 100) / 100, staff: b.staff.length, units: b.units.length, suspended: !!b.suspended, payables: b.finance.payables, today: { revenue: b.stats.today.revenue, customers: b.stats.today.customers } });
  const selects = {
    'biz.list': () => S().businesses.map(summary),
    'biz.detail': ({ bizId }) => {
      const b = get(bizId); if (!b) return null;
      const T = typeOf(b), capOut = {}; H.capacity(b, T, false, capOut);
      return { ...clone(b), balance: ctx.ledger.balance(acct(b)), capacity: capOut, stock: (ctx.inv.get(inv(b)) || { items: {} }).items, assetValue: assetValue(b), pnl: ctx.reports.pnl({ scope: b.id, period: 'week' }) };
    },
    'biz.types': () => BIZ_TABLE.map((t) => ({ id: t.id, name: t.name, priority: t.p, startup: t.startup + t.licences.reduce((s, l) => s + LICENCE_BY_ID[l].price, 0) + (t.stock || 0), licences: t.licences, roles: t.roles, needsSite: t.needsSite, model: t.model, unlocked: true, implemented: true })),
    'biz.sites': ({ typeId } = {}) => SITES.filter((s) => (!typeId || s.kinds.includes(typeId))).map((s) => ({ id: s.id, kinds: s.kinds, district: s.district, footfall: s.footfall, leasePerDay: s.leasePerDay, deposit: s.deposit, buyPrice: s.buyPrice, feePerDay: s.feePerDay, near: s.near, taken: !!S().sites[s.id], premium: !!s.premium })),
    'biz.candidates': ({ bizId }) => { const b = get(bizId); return b ? b.candidates.pool.slice() : []; },
    'biz.upgrades': ({ bizId }) => { const b = get(bizId); if (!b) return null; const T = typeOf(b); return { available: T.upgrades.filter((u) => !b.upgrades.includes(u.id)), owned: b.upgrades.slice(), tiers: T.tiers, tier: b.tier }; },
    'biz.contracts': ({ bizId } = {}) => ({ open: (S().bizMeta.contracts || []).filter((c) => !c.takenBy), active: (S().bizMeta.contracts || []).filter((c) => c.takenBy && (!bizId || c.takenBy === bizId)) }),
    'biz.suggestTargets': ({ bizId }) => { const b = get(bizId); return b ? suggestTargets(b) : null; },
  };
  return { defaults, get, create, cmds, selects, hourly, daily, weekly, assetValue, storageCap, isCold, isFood, suggestTargets, orderFor, quality: H.quality, capacity: H.capacity };
}
