// Reports derived from the ledger (Annex D 13): net worth, P&L, cashflow.
import { ACCOUNTS } from '../data/ids.js';
import { ITEM_BY_ID } from '../data/items.js';
import { dayOf } from './util.js';

const REVENUE = new Set(['sale.goods', 'sale.vehicle', 'sale.property', 'rent.received', 'tip', 'wage', 'interest.savings', 'invest.dividend']);
const OPEX_PREFIX = ['opex.'];
const OPEX = new Set(['rent.paid', 'fuel', 'repair', 'insurance', 'parking', 'fee', 'fine', 'build.refund']);
export function classify(type) {
  if (REVENUE.has(type)) return 'revenue';
  if (type === 'purchase.goods') return 'cogs';
  if (type === 'payroll') return 'payroll';
  if (type.startsWith('tax.')) return 'tax';
  if (OPEX_PREFIX.some((p) => type.startsWith(p)) || OPEX.has(type)) return 'opex';
  return 'other';
}
export function createReports(ctx) {
  function netWorth() {
    const L = ctx.ledger, b = ctx.state.businesses;
    const cash = L.balance(ACCOUNTS.CASH), bank = L.balance(ACCOUNTS.CHECKING) + L.balance(ACCOUNTS.SAVINGS);
    let businesses = 0, inventory = 0, payables = 0;
    for (const biz of b) { businesses += L.balance('biz:' + biz.id) + ctx.biz.assetValue(biz); payables += (biz.finance && biz.finance.payables) || 0; }
    for (const [id, c] of Object.entries(ctx.state.inventory.containers)) {
      if (id.startsWith('biz:') || id === 'player' || id.startsWith('prop:') || id.startsWith('veh:')) for (const [itemId, e] of Object.entries(c.items)) if (ITEM_BY_ID[itemId] && !ITEM_BY_ID[itemId].price) inventory += e.qty * ctx.market.unitValue(itemId);
    }
    const vehicles = ctx.veh.totalValue(), property = ctx.property.totalValue();
    const securities = ctx.invest.value();
    let loans = 0; for (const l of ctx.state.bank.loans) loans += l.balance;
    loans += ctx.tax.arrears() + payables;
    const total = cash + bank + businesses + inventory + vehicles + property + securities - loans;
    return { total, breakdown: { cash, bank, businesses, vehicles, property, inventory, securities, loans: -loans } };
  }
  function accountsOf(scope) { return scope === 'player' ? [ACCOUNTS.CASH, ACCOUNTS.CHECKING, ACCOUNTS.SAVINGS] : ['biz:' + scope]; }
  function pnl({ scope = 'player', period = 'day', offset = 0 } = {}) {
    const today = dayOf(ctx.now()), len = period === 'day' ? 1 : period === 'week' ? 7 : 28;
    const toDay = today - offset * len, fromDay = toDay - len + 1;
    return pnlRange(scope, fromDay, toDay, period);
  }
  function pnlRange(scope, fromDay, toDay) {
    const out = { revenue: 0, cogs: 0, payroll: 0, opex: 0, tax: 0, profit: 0, byType: {}, series: [], fromDay, toDay };
    const accts = accountsOf(scope);
    const add = (tot, acc) => {
      for (const [type, v] of Object.entries(tot)) {
        const cat = classify(type); if (cat === 'other') continue;
        const net = cat === 'revenue' ? v.in - v.out : v.out - v.in;
        acc[cat] += net; if (acc.byType) acc.byType[type] = (acc.byType[type] || 0) + (cat === 'revenue' ? v.in - v.out : -(v.out - v.in));
      }
    };
    for (const a of accts) add(ctx.ledger.totals({ account: a, fromDay, toDay }), out);
    out.profit = out.revenue - out.cogs - out.payroll - out.opex - out.tax;
    for (let d = fromDay; d <= toDay && toDay - fromDay < 30; d++) {
      const day = { day: d, revenue: 0, cogs: 0, payroll: 0, opex: 0, tax: 0 };
      for (const a of accts) add(ctx.ledger.totals({ account: a, fromDay: d, toDay: d }), day);
      day.profit = day.revenue - day.cogs - day.payroll - day.opex - day.tax; out.series.push(day);
    }
    return out;
  }
  const selects = {
    'reports.pnl': (a) => pnl(a || {}),
    'reports.netWorth': () => ({ ...netWorth(), history: ctx.state.flags.nwHistory || [] }),
    'reports.cashflow': ({ days = 14 } = {}) => { const today = dayOf(ctx.now()); return pnlRange('player', today - days + 1, today).series; },
  };
  return { netWorth, pnl, pnlRange, selects, accountsOf };
}
