// Investments (Annex D 3.4, P2): six securities, hourly log-price update from the saved market RNG stream.
import { BALANCE } from '../data/balance.js';
import { ACCOUNTS, TX } from '../data/ids.js';
import { ok, fail, ERR, posInt } from './util.js';

export const SECURITIES = [
  { id: 'sec.index', name: 'Harlan Index Fund', p0: 10000, sigma: BALANCE.invSigmaIndex, link: 'index' },
  { id: 'sec.harlanfoods', name: 'Harlan Foods', p0: 4200, link: 'wholesale' },
  { id: 'sec.calderfish', name: 'Calder Fisheries', p0: 3100, link: 'fish' },
  { id: 'sec.timberco', name: 'TimberCo', p0: 2600, link: 'lumber' },
  { id: 'sec.metrologistics', name: 'Metro Logistics', p0: 5200, link: 'activity' },
  { id: 'sec.harlanreit', name: 'Harlan REIT', p0: 7800, link: 'property' },
];
export function createInvest(ctx) {
  const S = () => ctx.state.invest;
  function defaults() { return { holdings: {}, prices: Object.fromEntries(SECURITIES.map((s) => [s.id, s.p0])), history: Object.fromEntries(SECURITIES.map((s) => [s.id, [s.p0]])), links: {}, propIndex: 1 }; }
  function normal() { const r = ctx.rng.market; const u = Math.max(1e-9, r.float()), v = r.float(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function linkValue(link) {
    const m = ctx.market;
    switch (link) {
      case 'wholesale': return m.mid('mkt.city.wholesale', 'item.ing.meat');
      case 'fish': return m.mid('mkt.ocean.seafood', 'item.fish.cod');
      case 'lumber': return m.mid('mkt.forest.sawmill', 'item.wood.lumber');
      case 'activity': return m.activity('city') * 100;
      case 'property': return S().propIndex * 100;
      default: return 100;
    }
  }
  function hourly() {
    const st = S(), changes = {};
    for (const sec of SECURITIES) {
      if (sec.link === 'index') continue;
      const v = linkValue(sec.link), last = st.links[sec.id] || v;
      changes[sec.id] = Math.max(-0.2, Math.min(0.2, Math.log(v / last))); st.links[sec.id] = v;
    }
    const avg = Object.values(changes).reduce((a, b) => a + b, 0) / Object.keys(changes).length;
    for (const sec of SECURITIES) {
      const sector = sec.link === 'index' ? avg : changes[sec.id];
      const p = st.prices[sec.id];
      const lp = Math.log(p) + BALANCE.invMu + (sec.sigma || BALANCE.invSigma) * normal() + BALANCE.invKappa * (Math.log(sec.p0) - Math.log(p)) + BALANCE.invLambda * sector;
      st.prices[sec.id] = Math.max(100, Math.round(Math.exp(lp) * 100) / 100);
      if (ctx.hour() === 0) { const h = st.history[sec.id]; h.push(st.prices[sec.id]); if (h.length > 60) h.shift(); }
    }
  }
  function weekly() {
    let v = 0;
    for (const [id, q] of Object.entries(S().holdings)) v += q * S().prices[id];
    const d = Math.floor(v * BALANCE.dividendWeekly);
    if (d > 0) ctx.ledger.transfer({ from: 'ext:securities', to: ACCOUNTS.CHECKING, amount: d, type: TX.INVEST_DIVIDEND, memo: 'Dividends' });
  }
  const sec = (id) => SECURITIES.find((s) => s.id === id);
  function value() { let v = 0; for (const [id, q] of Object.entries(S().holdings)) v += Math.floor(q * S().prices[id]); return v; }
  const cmds = {
    'invest.buy': ({ secId, qty }) => {
      if (!sec(secId) || !posInt(qty)) return fail(ERR.INVALID_ARG);
      if (ctx.skills && secId !== 'sec.index' && !ctx.jobs.securitiesOpen() && secId !== 'sec.harlanfoods') return fail(ERR.REQUIREMENT, 'office L5 unlocks all securities');
      const cost = Math.ceil(qty * S().prices[secId]), fee = Math.ceil(cost * BALANCE.invFee);
      if (!ctx.ledger.canAfford(ACCOUNTS.CHECKING, cost + fee)) return fail(ERR.INSUFFICIENT_FUNDS);
      ctx.ledger.transfer({ from: ACCOUNTS.CHECKING, to: 'ext:securities', amount: cost, type: TX.INVEST_BUY, memo: secId + ' x' + qty });
      if (fee > 0) ctx.ledger.transfer({ from: ACCOUNTS.CHECKING, to: 'ext:services', amount: fee, type: TX.FEE, memo: 'Trade fee' });
      S().holdings[secId] = (S().holdings[secId] || 0) + qty;
      return ok({ cost, fee });
    },
    'invest.sell': ({ secId, qty }) => {
      if (!sec(secId) || !posInt(qty)) return fail(ERR.INVALID_ARG);
      if ((S().holdings[secId] || 0) < qty) return fail(ERR.NOT_FOUND, 'not enough holdings');
      const gross = Math.floor(qty * S().prices[secId]), fee = Math.ceil(gross * BALANCE.invFee);
      if (gross <= 0) return fail(ERR.INVALID_ARG);
      ctx.ledger.transfer({ from: 'ext:securities', to: ACCOUNTS.CHECKING, amount: gross, type: TX.INVEST_SELL, memo: secId + ' x' + qty });
      if (fee > 0 && !ctx.ledger.transfer({ from: ACCOUNTS.CHECKING, to: 'ext:services', amount: fee, type: TX.FEE, memo: 'Trade fee' }).ok) ctx.ledger.transfer({ from: ACCOUNTS.CASH, to: 'ext:services', amount: Math.min(fee, ctx.ledger.balance(ACCOUNTS.CASH)) || 1, type: TX.FEE });
      S().holdings[secId] -= qty; if (S().holdings[secId] === 0) delete S().holdings[secId];
      return ok({ gross, fee });
    },
  };
  const selects = { 'invest.state': () => ({ securities: SECURITIES.map((s) => ({ id: s.id, name: s.name, price: S().prices[s.id], change: Math.round((S().prices[s.id] / (S().history[s.id].slice(-2)[0] || S().prices[s.id]) - 1) * 10000) / 100, holdings: S().holdings[s.id] || 0, history: S().history[s.id].slice() })) }) };
  return { defaults, hourly, weekly, value, cmds, selects };
}
