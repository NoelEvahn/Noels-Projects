// Shared helpers for sim modules. Pure.
import { ERR, ACCOUNTS } from '../data/ids.js';
export const ok = (data) => (data === undefined ? { ok: true } : { ok: true, data });
export const fail = (error, detail) => (detail === undefined ? { ok: false, error } : { ok: false, error, detail });
export const clone = (v) => JSON.parse(JSON.stringify(v));
/** "round toward the house": player pays rounded up, receives rounded down (Annex D 15 #12). */
export const payUp = (x) => Math.ceil(x - 1e-9);
export const recvDown = (x) => Math.floor(x + 1e-9);
export const isInt = (n) => Number.isInteger(n);
export const posInt = (n) => Number.isInteger(n) && n > 0;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const dayOf = (t) => Math.floor(t / 1440) + 1;
export const hourOf = (t) => Math.floor((t % 1440) / 60);
export const weekdayOf = (t) => (dayOf(t) - 1) % 7; // 0 = Monday
/** account the player pays from: 'cash' | 'card'/'bank'/'checking' | 'auto'(default) */
export function payerAccount(ledger, method, amount) {
  if (method === 'cash') return ACCOUNTS.CASH;
  if (method === 'card' || method === 'bank' || method === 'checking') return ACCOUNTS.CHECKING;
  return ledger.canAfford(ACCOUNTS.CASH, amount) ? ACCOUNTS.CASH : ACCOUNTS.CHECKING;
}
export function stochRound(x, rng) { const f = Math.floor(x); return f + (rng.float() < x - f ? 1 : 0); }
export { ERR };
