// Taxes (Annex D 3): property tax weekly from checking; shortfalls become arrears growing 4% per week.
import { BALANCE } from '../data/balance.js';
import { ACCOUNTS, TX } from '../data/ids.js';
import { ok, fail, ERR, posInt } from './util.js';

export function createTax(ctx) {
  const S = () => ctx.state.tax;
  const defaults = () => ({ arrears: 0 });
  /** pay a tax from checking (or cash if it covers); shortfall accrues as arrears */
  function payOrAccrue(amount, type, memo) {
    if (amount <= 0) return 0;
    const acct = ctx.ledger.canAfford(ACCOUNTS.CHECKING, amount) ? ACCOUNTS.CHECKING : ctx.ledger.canAfford(ACCOUNTS.CASH, amount) ? ACCOUNTS.CASH : null;
    if (acct) { ctx.ledger.transfer({ from: acct, to: 'ext:tax', amount, type, memo }); return 0; }
    S().arrears += amount; ctx.note('tax', 'Tax arrears', 'Unpaid ' + type + ': $' + (amount / 100).toFixed(2));
    return amount;
  }
  function weekly() { if (S().arrears > 0) S().arrears += Math.ceil(S().arrears * BALANCE.arrearsRateWeekly); }
  const cmds = {
    'tax.payArrears': ({ amount }) => {
      if (!posInt(amount)) return fail(ERR.INVALID_ARG);
      const a = Math.min(amount, S().arrears);
      if (a <= 0) return fail(ERR.NOT_FOUND, 'no arrears');
      const r = ctx.ledger.charge({ amount: a, to: 'ext:tax', type: TX.TAX_PROPERTY, memo: 'Arrears', method: 'auto' });
      if (!r.ok) return r;
      S().arrears -= a;
      return ok({ paid: a, remaining: S().arrears });
    },
  };
  return { defaults, payOrAccrue, weekly, cmds, arrears: () => S().arrears, selects: { 'tax.state': () => ({ arrears: S().arrears }) } };
}
