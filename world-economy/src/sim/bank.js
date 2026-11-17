// Bank (Annex D 2): deposit/withdraw, savings interest, loans, credit score. Loans are ledger accounts `loan:<n>` holding the debt as a negative balance.
import { BALANCE } from '../data/balance.js';
import { ACCOUNTS, TX } from '../data/ids.js';
import { ok, fail, ERR, posInt, clamp, dayOf } from './util.js';

export function createBank(ctx) {
  const S = () => ctx.state.bank;
  const defaults = () => ({ loans: [], creditScore: BALANCE.creditStart, nextLoan: 1, incomeDay0: null, lastNetWorth: 0, savingsRate: BALANCE.savingsDaily });
  const near = () => !ctx.services.near || ctx.services.near('atm') || ctx.services.near('poi.city.bank');
  const ownBank = (a) => a === ACCOUNTS.CASH || a === ACCOUNTS.CHECKING || a === ACCOUNTS.SAVINGS;
  const loanAcct = (l) => 'loan:' + l.id;
  const outstanding = () => S().loans.reduce((s, l) => s + l.balance, 0);
  function capMult() { const c = S().creditScore; return c <= 500 ? 0.6 : c <= 600 ? 0.6 + 0.4 * (c - 500) / 100 : c <= 750 ? 1.0 + 0.4 * (c - 600) / 150 : 1.4; }
  function rate() { const c = S().creditScore; const lo = BALANCE.loanRateWeeklyBest, hi = BALANCE.loanRateWeeklyWorst; return c >= 750 ? lo : c <= 500 ? hi : hi - (hi - lo) * (c - 500) / 250; }
  function loanCap() { return Math.max(BALANCE.loanMinCents, Math.floor(BALANCE.loanNetWorthPct * Math.max(0, ctx.reports.netWorth().total) * capMult())); }
  function offers() {
    const room = Math.max(0, loanCap() - outstanding());
    const ok_ = ctx.now() >= (S().incomeDay0 === null ? Infinity : (S().incomeDay0 - 1) * 1440 + BALANCE.loanMinIncomeDays * 1440);
    return { eligible: ok_ && room >= BALANCE.loanMinCents / 2, maxAmount: room, weeks: BALANCE.loanTerms.slice(), rateWeekly: rate() };
  }
  const cmds = {
    'bank.deposit': ({ amount }) => {
      if (!posInt(amount)) return fail(ERR.INVALID_ARG);
      if (!near()) return fail(ERR.OUT_OF_RANGE);
      const r = ctx.ledger.transfer({ from: ACCOUNTS.CASH, to: ACCOUNTS.CHECKING, amount, type: TX.TRANSFER, memo: 'Deposit' });
      if (r.ok) ctx.emit('bank:changed', {});
      return r;
    },
    'bank.withdraw': ({ amount }) => {
      if (!posInt(amount)) return fail(ERR.INVALID_ARG);
      if (!near()) return fail(ERR.OUT_OF_RANGE);
      const r = ctx.ledger.transfer({ from: ACCOUNTS.CHECKING, to: ACCOUNTS.CASH, amount, type: TX.TRANSFER, memo: 'Withdrawal' });
      if (r.ok) ctx.emit('bank:changed', {});
      return r;
    },
    'bank.transfer': ({ from, to, amount }) => {
      if (!posInt(amount)) return fail(ERR.INVALID_ARG);
      const okAcct = (a) => a === ACCOUNTS.CHECKING || a === ACCOUNTS.SAVINGS;
      if (!okAcct(from) || !okAcct(to) || from === to) return fail(ERR.INVALID_ARG, 'only checking <-> savings');
      const r = ctx.ledger.transfer({ from, to, amount, type: TX.TRANSFER, memo: 'Bank transfer' });
      if (r.ok) ctx.emit('bank:changed', {});
      return r;
    },
    'bank.takeLoan': ({ amount, weeks, toAccount = ACCOUNTS.CHECKING }) => {
      if (!posInt(amount) || !BALANCE.loanTerms.includes(weeks)) return fail(ERR.INVALID_ARG);
      if (toAccount !== ACCOUNTS.CHECKING && !(toAccount.startsWith('biz:') && ctx.biz.get(toAccount.slice(4)))) return fail(ERR.INVALID_ARG, 'bad destination');
      const o = offers();
      if (!o.eligible) return fail(ERR.REQUIREMENT, 'need 3 days of income history');
      if (outstanding() + amount > loanCap()) return fail(ERR.LIMIT, { max: o.maxAmount });
      if (amount < BALANCE.loanMinCents) return fail(ERR.INVALID_ARG, 'below minimum');
      const l = { id: S().nextLoan++, principal: amount, balance: amount, weeks, weeksLeft: weeks, rate: rate(), missed: 0, startDay: dayOf(ctx.now()) };
      ctx.ledger.openAccount(loanAcct(l), { kind: 'loan', owner: 'player', overdraft: amount });
      const r = ctx.ledger.transfer({ from: loanAcct(l), to: toAccount, amount, type: TX.LOAN_PRINCIPAL, memo: 'Loan ' + l.id });
      if (!r.ok) { ctx.ledger.closeAccount(loanAcct(l)); S().nextLoan--; return r; }
      S().loans.push(l);
      ctx.emit('bank:changed', {});
      return ok({ loanId: l.id, rate: l.rate });
    },
    'bank.repayLoan': ({ loanId, amount }) => {
      const l = S().loans.find((x) => x.id === loanId);
      if (!l) return fail(ERR.NOT_FOUND);
      if (!posInt(amount)) return fail(ERR.INVALID_ARG);
      const a = Math.min(amount, l.balance);
      const r = ctx.ledger.transfer({ from: ACCOUNTS.CHECKING, to: loanAcct(l), amount: a, type: TX.LOAN_REPAY, memo: 'Repay loan ' + l.id });
      if (!r.ok) return r;
      l.balance -= a; closeIfPaid(l);
      ctx.emit('bank:changed', {});
      return ok({ paid: a });
    },
  };
  function closeIfPaid(l) {
    if (l.balance <= 0) { ctx.ledger.closeAccount(loanAcct(l)); S().loans = S().loans.filter((x) => x !== l); }
  }
  /** midnight: savings interest + credit score progress */
  function daily() {
    const s = ctx.ledger.balance(ACCOUNTS.SAVINGS);
    const i = Math.floor(s * S().savingsRate);
    if (i > 0) ctx.ledger.transfer({ from: 'ext:bank', to: ACCOUNTS.SAVINGS, amount: i, type: TX.INTEREST_SAVINGS, memo: 'Savings interest' });
    const nw = ctx.reports.netWorth().total;
    if (nw > S().lastNetWorth) S().creditScore = clamp(S().creditScore + 1, BALANCE.creditMin, BALANCE.creditMax);
    S().lastNetWorth = nw;
  }
  /** Monday 00:00: interest and equal weekly principal instalments from checking */
  function weekly() {
    for (const l of S().loans.slice()) {
      const interest = Math.ceil(l.balance * l.rate);
      const inst = l.weeksLeft <= 1 ? l.balance : Math.min(l.balance, Math.ceil(l.principal / l.weeks));
      let paid = true;
      if (interest > 0) paid = ctx.ledger.transfer({ from: ACCOUNTS.CHECKING, to: 'ext:bank', amount: interest, type: TX.LOAN_INTEREST, memo: 'Loan ' + l.id + ' interest' }).ok;
      if (paid && inst > 0) paid = ctx.ledger.transfer({ from: ACCOUNTS.CHECKING, to: loanAcct(l), amount: inst, type: TX.LOAN_REPAY, memo: 'Loan ' + l.id + ' instalment' }).ok;
      if (paid) { l.balance -= inst; l.weeksLeft--; S().creditScore = clamp(S().creditScore + 5, BALANCE.creditMin, BALANCE.creditMax); closeIfPaid(l); }
      else {
        l.missed++; S().creditScore = clamp(S().creditScore - 40, BALANCE.creditMin, BALANCE.creditMax);
        ctx.ledger.charge({ amount: BALANCE.lateFee, to: 'ext:bank', type: TX.FEE, memo: 'Late fee', method: 'card' });
        ctx.note('bank', 'Missed loan instalment', 'Loan ' + l.id + ' is in arrears');
        if (l.missed >= BALANCE.missedForSeize) seize(l, inst + interest);
      }
    }
    ctx.emit('bank:changed', {});
  }
  function seize(l, arrears) {
    for (const acct of [ACCOUNTS.CHECKING, ACCOUNTS.SAVINGS]) {
      const take = Math.min(ctx.ledger.balance(acct), arrears, l.balance);
      if (take > 0) { const r = ctx.ledger.transfer({ from: acct, to: loanAcct(l), amount: take, type: TX.LOAN_REPAY, memo: 'Seized' }); if (r.ok) { l.balance -= take; arrears -= take; } }
    }
    if (arrears > 0) { const sold = ctx.veh.forceSellCheapest(); if (sold) { const take = Math.min(ctx.ledger.balance(ACCOUNTS.CHECKING), l.balance); if (take > 0 && ctx.ledger.transfer({ from: ACCOUNTS.CHECKING, to: loanAcct(l), amount: take, type: TX.LOAN_REPAY, memo: 'Seized sale' }).ok) l.balance -= take; } }
    l.missed = 0; closeIfPaid(l);
  }
  const selects = {
    'bank.state': () => ({ accounts: { cash: ctx.ledger.balance(ACCOUNTS.CASH), checking: ctx.ledger.balance(ACCOUNTS.CHECKING), savings: ctx.ledger.balance(ACCOUNTS.SAVINGS) }, loans: S().loans.map((l) => ({ ...l })), creditScore: S().creditScore, offers: offers() }),
  };
  return { defaults, cmds, selects, daily, weekly, outstanding, loanCap, closeIfPaid, offers };
}
