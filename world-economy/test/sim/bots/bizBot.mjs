// Business bot: creates, staffs, stocks and operates each of the 12 business types headlessly through Sim.cmd only.
import assert from 'node:assert/strict';
import { advance, okCmd, cmd, bal, invariant, give } from '../helpers.mjs';

const SETUP = {
  'biz.vending': { site: null, roles: { maintainer: 1 }, units: 4 },
  'biz.foodstand': { site: 'site.cart.01', roles: { cook: 1 } },
  'biz.cafe': { site: 'site.city.food.03', roles: { barista: 2 } },
  'biz.restaurant': { site: 'site.city.food.04', roles: { cook: 3, server: 3 } },
  'biz.fishing': { site: 'site.ocean.berth.01', roles: { fisher: 1 } },
  'biz.delivery': { site: null, roles: { driver: 1 } },
  'biz.retail': { site: 'site.city.shop.01', roles: { clerk: 2 }, options: { assortment: 'convenience' } },
  'biz.boatrental': { site: 'site.lake.dock.01', roles: { attendant: 1 } },
  'biz.logging': { site: 'site.forest.lease.01', roles: { logger: 2, driver: 1 } },
  'biz.warehouse': { site: 'site.city.wh.01', roles: { forklift: 1 } },
  'biz.supermarket': { site: 'site.city.super.01', roles: { cashier: 6, manager: 1 } },
  'biz.rental': { site: null, roles: {} },
};
export function hire(sim, bizId, role, n) {
  for (let i = 0; i < n; i++) {
    const pool = sim.select('biz.candidates', { bizId }).filter((c) => c.role === role).sort((a, b) => b.skill - a.skill);
    if (!pool.length) throw new Error('no candidate for ' + role);
    okCmd(sim, 'biz.hire', { bizId, candidateId: pool[0].id, role });
  }
}
export function stockTargets(sim, bizId, extra = {}) {
  const t = { ...sim.select('biz.suggestTargets', { bizId }), ...extra };
  okCmd(sim, 'biz.setPolicy', { bizId, patch: { autoRestock: { enabled: true, targets: t } } });
}
/** Build a fully operational business of the given type; returns its id. */
export function setupBusiness(sim, typeId, { float = 3000000 } = {}) {
  give(sim, 60000000);
  okCmd(sim, 'bank.deposit', { amount: 40000000 });
  const S = SETUP[typeId];
  const r = okCmd(sim, 'biz.create', { typeId, name: typeId.split('.')[1], siteId: S.site || undefined, options: { payFrom: 'card', ...(S.options || {}) } });
  const bizId = r.bizId;
  okCmd(sim, 'biz.deposit', { bizId, amount: float });
  switch (typeId) {
    case 'biz.vending': {
      const sites = sim.select('biz.sites', { typeId }).filter((s) => !s.taken && !s.premium).slice(0, S.units);
      for (const s of sites) okCmd(sim, 'biz.addUnit', { bizId, modelId: 'prop.vending_machine', siteId: s.id });
      okCmd(sim, 'veh.buy', { modelId: 'veh.moto_125', used: true });
      break;
    }
    case 'biz.fishing': {
      const u = okCmd(sim, 'biz.addUnit', { bizId, modelId: 'boat.skiff' });
      hire(sim, bizId, 'fisher', 1);
      const st = sim.select('biz.detail', { bizId }).staff[0];
      okCmd(sim, 'biz.assign', { bizId, staffId: st.id, unitId: u.unitId });
      return bizId;
    }
    case 'biz.delivery': {
      const u = okCmd(sim, 'biz.addUnit', { bizId, modelId: 'veh.van' });
      hire(sim, bizId, 'driver', 1);
      const st = sim.select('biz.detail', { bizId }).staff[0];
      okCmd(sim, 'biz.assign', { bizId, staffId: st.id, unitId: u.unitId });
      return bizId;
    }
    case 'biz.boatrental':
      for (const m of ['boat.rowboat', 'boat.rowboat', 'boat.kayak', 'boat.kayak', 'boat.skiff', 'boat.pedal']) okCmd(sim, 'biz.addUnit', { bizId, modelId: m });
      break;
    case 'biz.logging': {
      okCmd(sim, 'biz.addUnit', { bizId, modelId: 'veh.logtruck' });
      break;
    }
    case 'biz.rental': {
      okCmd(sim, 'prop.buy', { propId: 'prop_3', payFrom: 'card' }); okCmd(sim, 'prop.buy', { propId: 'prop_4', payFrom: 'card' });
      okCmd(sim, 'prop.setHome', { propId: 'prop_3' });
      okCmd(sim, 'prop.setHome', { propId: 'prop_4' });
      okCmd(sim, 'prop.setRentOut', { propId: 'prop_3', rentPerDay: 10000 });
      okCmd(sim, 'biz.addUnit', { bizId, propId: 'prop_3' });
      return bizId;
    }
    default: break;
  }
  for (const [role, n] of Object.entries(S.roles)) hire(sim, bizId, role, Math.min(n, sim.select('biz.candidates', { bizId }).filter((c) => c.role === role).length));
  if (['biz.foodstand', 'biz.cafe', 'biz.restaurant', 'biz.retail', 'biz.supermarket', 'biz.vending'].includes(typeId)) {
    // initial stock: buy a first load, then keep restocking automatically
    okCmd(sim, 'biz.setPolicy', { bizId, patch: { autoRestock: { enabled: true } } });
    const t = sim.select('biz.detail', { bizId }).policies.autoRestock.targets;
    for (const [itemId, q] of Object.entries(t)) { const r2 = sim.cmd('biz.order', { bizId, itemId, qty: q }); invariant(sim); void r2; }
  }
  if (typeId === 'biz.vending') {
    for (const u of sim.select('biz.detail', { bizId }).units) for (const [itemId, q] of [['item.ing.snack', 25], ['item.ing.beverage', 25]]) cmd(sim, 'biz.restockUnit', { bizId, unitId: u.id, itemId, qty: q, from: 'biz' });
  }
  if (typeId === 'biz.warehouse') { okCmd(sim, 'biz.setHours', { bizId, from: 6, to: 18 }); okCmd(sim, 'biz.setPrice', { bizId, productId: 'slot', price: 390 }); }
  return bizId;
}
export const BIZ_TYPES = Object.keys(SETUP);
export function runDays(sim, days) { advance(sim, days * 1440); }
void assert; void bal;
