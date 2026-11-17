// Inventory (Annex D 5.3). Containers hold {qty, t} per item (t = weighted-average acquisition minute, for freshness).
import { ITEM_BY_ID } from '../data/items.js';
import { BALANCE } from '../data/balance.js';
import { VEHICLE_ECON } from '../data/vehicles.js';
import { PROPERTY_BY_ID } from '../data/properties.js';
import { ok, fail, ERR, posInt } from './util.js';

export function createInventory(ctx) {
  const S = () => ctx.state.inventory;
  const defaults = () => ({ containers: { player: { cap: BALANCE.playerCapKg, cold: false, items: {} } } });
  function capFor(id) {
    if (id === 'player') {
      const it = S().containers.player.items;
      let cap = it['item.gear.backpack'] && it['item.gear.backpack'].qty > 0 ? BALANCE.backpackCapKg : BALANCE.playerCapKg;
      if (it['item.tool.keepnet'] && it['item.tool.keepnet'].qty > 0) cap += 10;
      if (it['item.tool.cooler'] && it['item.tool.cooler'].qty > 0) cap += 60;
      const lvl = ctx.skills ? ctx.skills.level('skill.fitness') : 1;
      return cap * (1 + 0.02 * (lvl - 1));
    }
    if (id.startsWith('veh:')) { const v = ctx.state.vehicles.find((x) => 'veh:' + x.id === id); return v ? (VEHICLE_ECON[v.model] ? (VEHICLE_ECON[v.model].cargo || 100) : 100) : 100; }
    if (id.startsWith('prop:')) {
      const pid = id.slice(5); const base = PROPERTY_BY_ID[pid] ? PROPERTY_BY_ID[pid].storageKg : 60;
      return base + (ctx.cons ? ctx.cons.storageBonus(pid) : 0);
    }
    if (id.startsWith('biz:')) { const b = ctx.biz ? ctx.biz.get(id.slice(4)) : null; return b ? ctx.biz.storageCap(b) : 1000; }
    return 1000;
  }
  function isCold(id) {
    if (id === 'player') { const it = S().containers.player.items; return !!(it['item.tool.cooler'] && it['item.tool.cooler'].qty > 0); }
    if (id.startsWith('biz:')) { const b = ctx.biz ? ctx.biz.get(id.slice(4)) : null; return b ? ctx.biz.isCold(b) : false; }
    if (id.startsWith('prop:')) return ctx.cons ? ctx.cons.hasFridge(id.slice(5)) : false;
    return false;
  }
  function ensure(id) {
    const c = S().containers;
    if (!c[id]) c[id] = { cap: 0, cold: false, items: {} };
    c[id].cap = capFor(id); c[id].cold = isCold(id);
    return c[id];
  }
  const get = (id) => { const c = S().containers[id]; return c ? ensure(id) : (id === 'player' || /^(veh|prop|biz|unit):/.test(id) ? ensure(id) : null); };
  const qty = (id, itemId) => { const c = S().containers[id]; return c && c.items[itemId] ? c.items[itemId].qty : 0; };
  function used(c) { let w = 0; for (const [k, e] of Object.entries(c.items)) w += (ITEM_BY_ID[k] ? ITEM_BY_ID[k].weight : 1) * e.qty; return w; }
  function add(id, itemId, n, opts = {}) {
    if (!posInt(n) || !ITEM_BY_ID[itemId]) return fail(ERR.INVALID_ARG);
    const c = ensure(id);
    if (!opts.force && used(c) + ITEM_BY_ID[itemId].weight * n > c.cap + 1e-9) return fail(ERR.CAPACITY, { free: c.cap - used(c) });
    const e = c.items[itemId] || (c.items[itemId] = { qty: 0, t: ctx.now() });
    const t = opts.t !== undefined ? opts.t : ctx.now();
    e.t = Math.round((e.t * e.qty + t * n) / (e.qty + n));
    e.qty += n;
    ctx.emit('inv:changed', { containerId: id });
    return ok();
  }
  function remove(id, itemId, n) {
    const c = S().containers[id];
    if (!posInt(n)) return fail(ERR.INVALID_ARG);
    if (!c || !c.items[itemId] || c.items[itemId].qty < n) return fail(ERR.NOT_FOUND, 'not enough ' + itemId);
    const t = c.items[itemId].t;
    c.items[itemId].qty -= n;
    if (c.items[itemId].qty === 0) delete c.items[itemId];
    ctx.emit('inv:changed', { containerId: id });
    return ok({ t });
  }
  function freeKg(id) { const c = ensure(id); return c.cap - used(c); }
  /** age in days of the stock of an item in a container */
  function ageDays(id, itemId) { const c = S().containers[id]; if (!c || !c.items[itemId]) return 0; return (ctx.now() - c.items[itemId].t) / 1440; }
  /** 'fresh' | 'stale' | 'rotten' */
  function grade(id, itemId) {
    const it = ITEM_BY_ID[itemId]; if (!it || !it.perishable) return 'fresh';
    const c = ensure(id); const days = ageDays(id, itemId);
    const lim = c.cold ? it.perishable.coldDays : it.perishable.freshDays;
    return days > 2 * lim ? 'rotten' : days > lim ? 'stale' : 'fresh';
  }
  /** daily spoilage: perishables older than twice their fresh window disappear (Annex D 5.2). Returns removed value-less count. */
  function spoilage() {
    let n = 0;
    for (const id of Object.keys(S().containers)) {
      const c = ensure(id);
      for (const itemId of Object.keys(c.items)) {
        if (grade(id, itemId) === 'rotten') { n += c.items[itemId].qty; delete c.items[itemId]; ctx.emit('inv:changed', { containerId: id }); }
      }
    }
    return n;
  }
  function inRange(id) { return ctx.services.nearContainer ? ctx.services.nearContainer(id) : true; }
  const cmds = {
    'inv.move': ({ from, to, itemId, qty: q }) => {
      if (!from || !to || from === to || !ITEM_BY_ID[itemId] || !posInt(q)) return fail(ERR.INVALID_ARG);
      if (!S().containers[from]) return fail(ERR.NOT_FOUND, from);
      if (qty(from, itemId) < q) return fail(ERR.NOT_FOUND, 'not enough ' + itemId);
      // ownership: biz containers must belong to the player (all do); range check via services
      if (!inRange(from) || !inRange(to)) return fail(ERR.OUT_OF_RANGE);
      let t = null;
      const c = S().containers[from]; t = c.items[itemId].t;
      let q2 = q;
      // fish into a food business converts to portions on transfer (Annex D 4.2)
      let dest = itemId, mult = 1;
      if (to.startsWith('biz:') && ITEM_BY_ID[itemId].category === 'fish' && ctx.biz && ctx.biz.isFood(to.slice(4))) { dest = ITEM_BY_ID[itemId].tags.includes('premium') ? 'item.ing.fish_premium' : 'item.ing.fish'; mult = 4; }
      const a = add(to, dest, q2 * mult, { t });
      if (!a.ok) return a;
      remove(from, itemId, q);
      return ok({ moved: q2 * mult });
    },
    'inv.use': ({ itemId }) => {
      const it = ITEM_BY_ID[itemId];
      if (!it || !it.effect) return fail(ERR.INVALID_ARG);
      if (qty('player', itemId) < 1) return fail(ERR.NOT_FOUND);
      remove('player', itemId, 1);
      ctx.needs.apply(it.effect);
      return ok();
    },
  };
  const selects = {
    'inv.container': ({ id }) => {
      const c = get(id || 'player'); if (!c) return null;
      return { id: id || 'player', cap: c.cap, cold: c.cold, used: used(c), items: Object.entries(c.items).map(([itemId, e]) => ({ itemId, qty: e.qty, freshness: grade(id || 'player', itemId) })) };
    },
  };
  return { defaults, ensure, get, qty, add, remove, used, freeKg, grade, ageDays, spoilage, cmds, selects, capFor };
}
