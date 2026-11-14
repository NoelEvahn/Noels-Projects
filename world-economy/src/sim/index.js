// Sim facade (MASTER_SPEC 5.3). Stage 2 skeleton: ledger + starting state; every cmd/select returns a defined Result.
import { createLedger } from './ledger.js';
import { openStartingAccounts, genesis } from './state.js';
import { ERR, ACCOUNTS, TX } from '../data/ids.js';

export function createSim({ bus = null } = {}) {
  let totalMinutes = 480;
  const ledger = createLedger({ bus, now: () => totalMinutes });
  let flags = { tutorial: 0 };
  let cheated = false;

  function init({ state, seed } = {}) {
    if (state && state.ledger) {
      ledger.restore(state.ledger);
      flags = { ...(state.flags || {}) };
    } else {
      ledger.reset();
      cheated = false;
      openStartingAccounts(ledger);
      genesis(ledger);
      flags = { tutorial: 0 };
    }
    void seed;
  }
  function tickMinute(gt) { totalMinutes = gt.total; }

  const cmds = {
    'debug.grant': ({ cents }) => {
      const r = ledger.transfer({ from: 'ext:debug', to: ACCOUNTS.CASH, amount: cents, type: TX.DEBUG, memo: 'QA grant' });
      if (r.ok) cheated = true;
      return r;
    },
  };
  function cmd(name, args = {}) {
    const f = cmds[name];
    if (!f) return { ok: false, error: ERR.NOT_FOUND, detail: 'unknown command ' + name };
    try { return f(args); } catch (e) { return { ok: false, error: ERR.INVALID_ARG, detail: String(e && e.message || e) }; }
  }
  const selects = {
    cash: () => ledger.balance(ACCOUNTS.CASH),
    'ledger.balance': ({ id }) => ledger.balance(id),
    'ledger.invariant': () => ledger.checkInvariant(),
    'ledger.recent': ({ limit = 20 } = {}) => ledger.query({ limit }),
    cheated: () => cheated,
  };
  function select(name, args) {
    const f = selects[name];
    return f ? f(args) : undefined;
  }
  function serialize() { return { ledger: ledger.serialize(), flags: { ...flags } }; }
  return { init, tickMinute, cmd, select, serialize, ledger, get cheated() { return cheated; } };
}
export const Sim = createSim();
