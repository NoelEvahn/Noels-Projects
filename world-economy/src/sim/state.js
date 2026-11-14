// Sim state helpers (Stage 2 skeleton; Stage 4 owns the full state).
import { ACCOUNTS, TX } from '../data/ids.js';
import { BALANCE } from '../data/balance.js';

export function openStartingAccounts(ledger) {
  ledger.openAccount(ACCOUNTS.CASH, { kind: 'cash', owner: 'player' });
  ledger.openAccount(ACCOUNTS.CHECKING, { kind: 'bank', owner: 'player' });
  ledger.openAccount(ACCOUNTS.SAVINGS, { kind: 'bank', owner: 'player' });
  for (const id of ACCOUNTS.EXT) ledger.openAccount(id, { kind: 'external', owner: 'world' });
}
export function genesis(ledger) {
  return ledger.transfer({ from: 'ext:genesis', to: ACCOUNTS.CASH, amount: BALANCE.startCash, type: TX.GENESIS, memo: 'Starting cash' });
}
