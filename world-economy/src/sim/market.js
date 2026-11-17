// Markets (Annex D 5.1-5.2): price model, sliced trading, hourly NPC flow. Player pays ceil, receives floor.
import { MARKETS, MARKET_IDS, seasonParams } from '../data/markets.js';
import { ITEM_BY_ID } from '../data/items.js';
import { BALANCE } from '../data/balance.js';
import { ACCOUNTS, TX } from '../data/ids.js';
import { ok, fail, ERR, posInt, payUp, recvDown, payerAccount, clamp, dayOf } from './util.js';

export function createMarket(ctx) {
  const S = () => ctx.state.markets;
  function defaults() {
    const st = { stock: {}, soldKg: { day: 0, kg: 0 }, activity: { city: 1, lake: 1, ocean: 1, forest: 1 } };
    for (const id of MARKET_IDS) { st.stock[id] = {}; for (const [itemId, m] of Object.entries(MARKETS[id].items)) st.stock[id][itemId] = m.target; }
    return st;
  }
  const spec = (marketId, itemId) => (MARKETS[marketId] ? MARKETS[marketId].items[itemId] : undefined);
  const season = (itemId, day) => { const p = seasonParams(itemId); return 1 + p.a * Math.sin(2 * Math.PI * day / 28 + p.phi); };
  function midAt(marketId, itemId, stock, day) {
    const m = spec(marketId, itemId), it = ITEM_BY_ID[itemId];
    const ratio = m.target / Math.max(stock, 0.1 * m.target);
    return it.base * m.factor * clamp(Math.pow(ratio, m.k), BALANCE.priceClamp[0], BALANCE.priceClamp[1]) * season(itemId, day);
  }
  function stockOf(marketId, itemId) { return S().stock[marketId][itemId]; }
  const mid = (marketId, itemId) => midAt(marketId, itemId, stockOf(marketId, itemId), dayOf(ctx.now()));
  /** single-unit quotes at current stock */
  const buyPrice = (m, i) => payUp(mid(m, i) * (1 + BALANCE.spread));
  const sellPrice = (m, i) => recvDown(mid(m, i) * (1 - BALANCE.spread));
  function sliceSize(marketId, itemId) { return Math.max(1, Math.round(spec(marketId, itemId).target * BALANCE.sliceFraction)); }
  /** Priced in slices of 5% of target; buy slices priced after removal, sell slices after adding (always against the trader). */
  function quote(marketId, itemId, qty, side, mult = 1) {
    let stock = stockOf(marketId, itemId), total = 0, left = qty;
    const day = dayOf(ctx.now()), sz = sliceSize(marketId, itemId);
    while (left > 0) {
      const q = Math.min(sz, left);
      if (side === 'buy') { stock -= q; total += q * payUp(midAt(marketId, itemId, Math.max(stock, 0), day) * (1 + BALANCE.spread)); }
      else { stock += q; total += q * recvDown(midAt(marketId, itemId, stock, day) * (1 - BALANCE.spread) * mult); }
      left -= q;
    }
    return { total, endStock: stock };
  }
  function listing(marketId) {
    const M = MARKETS[marketId]; if (!M) return [];
    return Object.entries(M.items).map(([itemId, m]) => ({ itemId, buy: m.sells ? buyPrice(marketId, itemId) : null, sell: m.buys ? sellPrice(marketId, itemId) : null, stock: Math.round(stockOf(marketId, itemId) * 10) / 10, target: m.target, trend: Math.round((mid(marketId, itemId) / ITEM_BY_ID[itemId].base - 1) * 1000) / 10 }));
  }
  function nearMarket(marketId) { return !ctx.services.near || ctx.services.near(MARKETS[marketId].poi); }
  /** buy: player or business pays market. `acct` pays; goods go to `toContainer`. */
  function doBuy({ marketId, itemId, qty, toContainer, acct, surcharge = 0, check = true, memo }) {
    const m = spec(marketId, itemId);
    if (!m || !m.sells || !posInt(qty)) return fail(ERR.INVALID_ARG);
    if (check && !nearMarket(marketId)) return fail(ERR.OUT_OF_RANGE);
    if (stockOf(marketId, itemId) < qty) return fail(ERR.CAPACITY, 'market stock');
    let { total, endStock } = quote(marketId, itemId, qty, 'buy');
    total = payUp(total * (1 + surcharge));
    if (total <= 0) return fail(ERR.INVALID_ARG);
    if (!ctx.ledger.canAfford(acct, total)) return fail(ERR.INSUFFICIENT_FUNDS);
    const room = ctx.inv.add(toContainer, itemId, qty);
    if (!room.ok) return room;
    const r = ctx.ledger.transfer({ from: acct, to: 'ext:market', amount: total, type: TX.PURCHASE_GOODS, memo: memo || marketId + ' ' + itemId + ' x' + qty, ref: toContainer });
    if (!r.ok) { ctx.inv.remove(toContainer, itemId, qty); return r; }
    S().stock[marketId][itemId] = endStock;
    ctx.emit('market:updated', { marketId });
    return ok({ total, qty, unit: Math.round(total / qty) });
  }
  function doSell({ marketId, itemId, qty, fromContainer, acct, player }) {
    const m = spec(marketId, itemId), it = ITEM_BY_ID[itemId];
    if (!m || !m.buys || !posInt(qty)) return fail(ERR.INVALID_ARG);
    if (player && !nearMarket(marketId)) return fail(ERR.OUT_OF_RANGE);
    if (ctx.inv.qty(fromContainer, itemId) < qty) return fail(ERR.NOT_FOUND, 'not enough ' + itemId);
    const lic = it.category === 'fish' && ctx.jobs.hasLicence('lic.fishing_commercial');
    if (player && it.category === 'fish' && fromContainer === 'player' && !lic) {
      const day = dayOf(ctx.now());
      if (S().soldKg.day !== day) S().soldKg = { day, kg: 0 };
      if (S().soldKg.kg + qty > BALANCE.fishAllowanceKgPerDay) return fail(ERR.LIMIT, { allowance: BALANCE.fishAllowanceKgPerDay - S().soldKg.kg });
    }
    const g = ctx.inv.grade(fromContainer, itemId);
    if (g === 'rotten') return fail(ERR.INVALID_ARG, 'rotten');
    const mult = (lic ? 1.1 : 1) * (g === 'stale' ? 0.6 : 1);
    const { total, endStock } = quote(marketId, itemId, qty, 'sell', mult);
    if (total <= 0) return fail(ERR.INVALID_ARG, 'worthless');
    const r = ctx.ledger.transfer({ from: 'ext:market', to: acct, amount: total, type: TX.SALE_GOODS, memo: marketId + ' ' + itemId + ' x' + qty, ref: fromContainer });
    if (!r.ok) return r;
    ctx.inv.remove(fromContainer, itemId, qty);
    S().stock[marketId][itemId] = endStock;
    if (player && it.category === 'fish' && fromContainer === 'player' && !lic) S().soldKg.kg += qty;
    ctx.noteIncome();
    ctx.emit('market:updated', { marketId });
    return ok({ total, qty, unit: Math.floor(total / qty) });
  }
  const acctOf = (v, dflt) => (v ? (v === 'cash' ? ACCOUNTS.CASH : v === 'card' || v === 'bank' ? ACCOUNTS.CHECKING : v) : dflt);
  const cmds = {
    'market.buy': ({ marketId, itemId, qty, toContainer = 'player', payFrom }) => {
      if (!MARKETS[marketId]) return fail(ERR.NOT_FOUND);
      let acct;
      if (payFrom && payFrom.startsWith('biz:')) { if (!ctx.ledger.balance(payFrom) && !ctx.state.businesses.some((b) => 'biz:' + b.id === payFrom)) return fail(ERR.NOT_OWNER); acct = payFrom; }
      else { const est = quote(marketId, itemId, Math.max(1, qty || 1), 'buy').total; acct = payerAccount(ctx.ledger, payFrom, est); }
      return doBuy({ marketId, itemId, qty, toContainer, acct });
    },
    'market.sell': ({ marketId, itemId, qty, fromContainer = 'player', payTo }) => {
      if (!MARKETS[marketId]) return fail(ERR.NOT_FOUND);
      const acct = acctOf(payTo, ACCOUNTS.CASH);
      return doSell({ marketId, itemId, qty, fromContainer, acct, player: fromContainer === 'player' });
    },
    'shop.buy': ({ poiId, itemId, qty = 1, payFrom }) => ctx.shops.buy({ poiId, itemId, qty, payFrom }),
  };
  /** hourly NPC flow + mean reversion (Annex D 5.2) */
  function hourly(hour) {
    const rng = ctx.rng.market;
    const act = S().activity;
    for (const id of MARKET_IDS) {
      const M = MARKETS[id];
      const a = act[M.region] || 1;
      const diurnal = hour >= 6 && hour < 22 ? 1.2 : 0.4;
      for (const [itemId, m] of Object.entries(M.items)) {
        const j = 0.5 + rng.float();
        let st = S().stock[id][itemId];
        st += m.supply * j - m.demand * diurnal * a * (1.5 - j * 0.5);
        st += (m.target - st) * BALANCE.mktReversion;
        S().stock[id][itemId] = Math.max(0, Math.round(st * 100) / 100);
      }
      ctx.emit('market:updated', { marketId: id });
    }
  }
  function dailyActivity() { for (const r of Object.keys(S().activity)) S().activity[r] += (1 - S().activity[r]) * 0.05; }
  function bumpActivity(region, amt) { const a = S().activity; if (a[region] !== undefined) a[region] = clamp(a[region] + amt, BALANCE.activityMin, BALANCE.activityMax); }
  function addStock(marketId, itemId, q) { if (spec(marketId, itemId)) S().stock[marketId][itemId] = Math.max(0, S().stock[marketId][itemId] + q); }
  const activity = (region) => S().activity[region] || 1;
  const selects = { 'market.listing': ({ marketId }) => listing(marketId), 'region.activity': () => ({ ...S().activity }) };
  /** value of one unit of an item for inventory valuation: best market sell price, else half base */
  function unitValue(itemId) {
    let best = 0;
    for (const id of MARKET_IDS) { const m = spec(id, itemId); if (m && m.buys) best = Math.max(best, sellPrice(id, itemId)); }
    return best || Math.floor((ITEM_BY_ID[itemId] ? ITEM_BY_ID[itemId].base : 0) * 0.5);
  }
  return { defaults, mid, buyPrice, sellPrice, quote, listing, doBuy, doSell, cmds, selects, hourly, dailyActivity, bumpActivity, addStock, activity, unitValue, spec, stockOf };
}
