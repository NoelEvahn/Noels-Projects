// Retail shops: fixed retail prices for personal items, tools and licences (Annex D 4.3-4.4). Also bulk-licence purchases.
import { SHOPS, ITEM_BY_ID, LICENCE_BY_ID } from '../data/items.js';
import { TX } from '../data/ids.js';
import { ok, fail, ERR, posInt, payerAccount } from './util.js';

export function createShops(ctx) {
  function buy({ poiId, itemId, qty = 1, payFrom }) {
    if (!SHOPS[poiId] && poiId !== 'poi.city.cityhall') return fail(ERR.NOT_FOUND, poiId);
    if (ctx.services.near && !ctx.services.near(poiId)) return fail(ERR.OUT_OF_RANGE);
    if (!posInt(qty)) return fail(ERR.INVALID_ARG);
    if (LICENCE_BY_ID[itemId]) {
      const L = LICENCE_BY_ID[itemId];
      if (L.perBusiness) return fail(ERR.INVALID_ARG, 'licence is bought per business');
      if (poiId !== L.poi) return fail(ERR.NOT_FOUND);
      if (ctx.jobs.hasLicence(itemId)) return fail(ERR.BUSY, 'already owned');
      const r = ctx.ledger.charge({ amount: L.price, to: 'ext:services', type: TX.OPEX_LICENSE, memo: L.name, method: payFrom || 'auto' });
      if (!r.ok) return r;
      ctx.state.jobs.licences.push(itemId);
      ctx.emit('job:licence', { licence: itemId });
      return ok({ price: L.price });
    }
    if (!SHOPS[poiId].includes(itemId)) return fail(ERR.NOT_FOUND, 'not sold here');
    const it = ITEM_BY_ID[itemId], unit = it.price;
    const total = unit * qty;
    const acct = payerAccount(ctx.ledger, payFrom, total);
    if (!ctx.ledger.canAfford(acct, total)) return fail(ERR.INSUFFICIENT_FUNDS);
    const room = ctx.inv.add('player', itemId, qty);
    if (!room.ok) return room;
    const r = ctx.ledger.transfer({ from: acct, to: 'ext:sellers', amount: total, type: TX.PURCHASE_ITEM, memo: it.name + ' x' + qty });
    if (!r.ok) { ctx.inv.remove('player', itemId, qty); return r; }
    if (total >= 100000) ctx.state.flags.autosaveDue = true;
    return ok({ total });
  }
  const listing = ({ poiId }) => (SHOPS[poiId] || []).map((id) => ({ itemId: id, price: ITEM_BY_ID[id].price, name: ITEM_BY_ID[id].name })).concat(poiId === 'poi.city.cityhall' ? Object.values(LICENCE_BY_ID).filter((l) => !l.perBusiness).map((l) => ({ itemId: l.id, price: l.price, name: l.name, owned: ctx.jobs.hasLicence(l.id) })) : []);
  return { buy, selects: { 'shop.listing': listing }, cmds: {} };
}
