// Ledger (MASTER_SPEC 5.4, Annex D 1): the single source of truth for money. Pure, integer cents, double entry.
import { ERR, ACCOUNTS } from '../data/ids.js';

const JOURNAL_CAP = 5000;

export function createLedger({ bus = null, now = () => 0 } = {}) {
  /** @type {Map<string,{kind:string, owner:string, overdraft:number, external:boolean, balance:number}>} */
  const accounts = new Map();
  let journal = [];
  let nextTx = 1;
  let daily = {};          // daily[day][account][type] = {in, out}
  let lifetime = {};       // folded older days
  const DAILY_KEEP = 56;

  const err = (error, detail) => ({ ok: false, error, detail });

  function openAccount(id, { kind = 'cash', owner = 'player', overdraft = 0 } = {}) {
    if (accounts.has(id)) return err(ERR.INVALID_ARG, 'account exists');
    const external = id.startsWith('ext:');
    accounts.set(id, { kind: external ? 'external' : kind, owner, overdraft: external ? Infinity : overdraft, external, balance: 0 });
    return { ok: true };
  }
  function closeAccount(id) {
    const a = accounts.get(id);
    if (!a) return err(ERR.NOT_FOUND);
    if (a.balance !== 0) return err(ERR.INVALID_ARG, 'balance must be 0');
    accounts.delete(id);
    return { ok: true };
  }
  const balance = (id) => { const a = accounts.get(id); return a ? a.balance : 0; };
  function canAfford(id, amount) {
    const a = accounts.get(id);
    return !!a && Number.isInteger(amount) && amount > 0 && a.balance - amount >= -a.overdraft;
  }

  function bump(day, acct, type, dir, amount) {
    const d = (daily[day] ||= {});
    const a = (d[acct] ||= {});
    const t = (a[type] ||= { in: 0, out: 0 });
    t[dir] += amount;
  }
  function foldOld(day) {
    for (const k of Object.keys(daily)) {
      if (Number(k) <= day - DAILY_KEEP) {
        for (const [acct, types] of Object.entries(daily[k])) {
          for (const [type, v] of Object.entries(types)) {
            const l = ((lifetime[acct] ||= {})[type] ||= { in: 0, out: 0 });
            l.in += v.in; l.out += v.out;
          }
        }
        delete daily[k];
      }
    }
  }

  function transfer({ from, to, amount, type, memo, ref }) {
    if (!Number.isInteger(amount) || amount <= 0) return err(ERR.INVALID_ARG, 'amount must be a positive integer');
    if (typeof type !== 'string' || !type) return err(ERR.INVALID_ARG, 'type required');
    const a = accounts.get(from), b = accounts.get(to);
    if (!a || !b) return err(ERR.NOT_FOUND, !a ? from : to);
    if (from === to) return err(ERR.INVALID_ARG, 'same account');
    if (a.balance - amount < -a.overdraft) {
      if (bus) bus.emit('ledger:insufficient', { account: from, amount, type });
      return err(ERR.INSUFFICIENT_FUNDS);
    }
    a.balance -= amount; b.balance += amount;
    const t = now();
    const tx = { id: nextTx++, t, from, to, amount, type };
    if (memo !== undefined) tx.memo = memo;
    if (ref !== undefined) tx.ref = ref;
    journal.push(tx);
    if (journal.length > JOURNAL_CAP) journal.shift();
    const day = Math.floor(t / 1440) + 1;
    bump(day, from, type, 'out', amount);
    bump(day, to, type, 'in', amount);
    if (tx.id % 256 === 0) foldOld(day);
    if (bus) bus.emit('ledger:tx', { tx });
    return { ok: true, data: { tx } };
  }

  /** Player pays. method 'auto': cash if it covers the whole amount, else bank:checking, else fails (never splits). */
  function charge({ amount, to, type, memo, ref, method = 'auto' }) {
    let from;
    if (method === 'cash') from = ACCOUNTS.CASH;
    else if (method === 'card') from = ACCOUNTS.CHECKING;
    else from = canAfford(ACCOUNTS.CASH, amount) ? ACCOUNTS.CASH : ACCOUNTS.CHECKING;
    return transfer({ from, to, amount, type, memo, ref });
  }

  function query({ account, type, fromDay, toDay, limit } = {}) {
    const out = [];
    for (let i = journal.length - 1; i >= 0; i--) {
      const tx = journal[i];
      const day = Math.floor(tx.t / 1440) + 1;
      if (account && tx.from !== account && tx.to !== account) continue;
      if (type && tx.type !== type) continue;
      if (fromDay !== undefined && day < fromDay) continue;
      if (toDay !== undefined && day > toDay) continue;
      out.push(tx);
      if (limit && out.length >= limit) break;
    }
    return out;
  }

  function totals({ account, fromDay, toDay }) {
    const res = {};
    for (const [k, accts] of Object.entries(daily)) {
      const d = Number(k);
      if (d < fromDay || d > toDay) continue;
      const types = accts[account];
      if (!types) continue;
      for (const [type, v] of Object.entries(types)) {
        const r = (res[type] ||= { in: 0, out: 0 });
        r.in += v.in; r.out += v.out;
      }
    }
    return res;
  }

  function checkInvariant() {
    let sum = 0;
    for (const a of accounts.values()) sum += a.balance;
    return { ok: sum === 0, sum };
  }

  function serialize() {
    const acc = {};
    for (const [id, a] of accounts) acc[id] = a.balance;
    const meta = {};
    for (const [id, a] of accounts) meta[id] = { kind: a.kind, owner: a.owner, overdraft: a.external ? -1 : a.overdraft };
    return { accounts: acc, accountMeta: meta, journal: journal.slice(), daily: JSON.parse(JSON.stringify(daily)), lifetime: JSON.parse(JSON.stringify(lifetime)), nextTx };
  }
  function restore(s) {
    accounts.clear();
    const meta = s.accountMeta || {};
    for (const [id, bal] of Object.entries(s.accounts)) {
      const m = meta[id] || { kind: id.startsWith('ext:') ? 'external' : 'cash', owner: 'player', overdraft: id.startsWith('ext:') ? -1 : 0 };
      const external = m.overdraft === -1 || id.startsWith('ext:');
      accounts.set(id, { kind: m.kind, owner: m.owner, overdraft: external ? Infinity : m.overdraft, external, balance: bal });
    }
    journal = (s.journal || []).slice();
    daily = JSON.parse(JSON.stringify(s.daily || {}));
    lifetime = JSON.parse(JSON.stringify(s.lifetime || {}));
    nextTx = s.nextTx || journal.length + 1;
  }

  function reset() { accounts.clear(); journal = []; nextTx = 1; daily = {}; lifetime = {}; }

  return { reset, openAccount, closeAccount, balance, canAfford, transfer, charge, query, totals, checkInvariant, serialize, restore, accountIds: () => Array.from(accounts.keys()) };
}
