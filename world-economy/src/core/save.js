// Save (MASTER_SPEC 5.9, 8). Dependency-injected so core/ stays free of sim/game imports.
import { ERR } from '../data/ids.js';

export const SAVE_VERSION = 1;
const KEYS = { auto: 'loe.save.auto', 1: 'loe.save.1', 2: 'loe.save.2', 3: 'loe.save.3' };

export function canonicalJSON(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalJSON).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonicalJSON(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

function b64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
async function pipeBytes(stream, bytes) {
  const w = stream.writable.getWriter();
  w.write(bytes); w.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

export function validateSave(s) {
  if (!s || typeof s !== 'object') return false;
  if (s.v !== SAVE_VERSION) return false;
  if (!s.meta || !s.time || !s.sim || !s.sim.ledger || typeof s.sim.ledger.accounts !== 'object') return false;
  if (!s.player || !Array.isArray(s.player.pos)) return false;
  for (const bal of Object.values(s.sim.ledger.accounts)) if (!Number.isInteger(bal)) return false;
  return true;
}
function migrate(s) { return s; } // v -> v+1 migrations run here in order

export function createSave({ collect, restore, storage = null } = {}) {
  let store = storage;
  let available = false;
  try {
    if (!store && typeof localStorage !== 'undefined') store = localStorage;
    if (store) { store.setItem('loe.probe', '1'); store.removeItem('loe.probe'); available = true; }
  } catch (e) { available = false; }
  const memory = {};

  function write(slot) {
    const key = KEYS[slot];
    if (!key) return { ok: false, error: ERR.INVALID_ARG };
    const save = collect();
    save.meta.savedAt = Date.now();
    const text = JSON.stringify(save);
    memory[key] = text;
    if (available) { try { store.setItem(key, text); } catch (e) { return { ok: true, data: { memoryOnly: true } }; } }
    return { ok: true };
  }
  function read(slot) {
    const key = KEYS[slot];
    if (!key) return { ok: false, error: ERR.INVALID_ARG };
    let text = memory[key];
    if (available) { try { text = store.getItem(key) || text; } catch (e) { /* fall back to memory */ } }
    if (!text) return { ok: false, error: ERR.NOT_FOUND };
    try { const s = JSON.parse(text); return validateSave(s) ? { ok: true, data: s } : { ok: false, error: ERR.SAVE_INVALID }; }
    catch (e) { return { ok: false, error: ERR.SAVE_INVALID }; }
  }
  function apply(save) {
    if (!validateSave(save)) return { ok: false, error: ERR.SAVE_INVALID };
    const migrated = migrate(JSON.parse(JSON.stringify(save)));
    if (!validateSave(migrated)) return { ok: false, error: ERR.SAVE_INVALID };
    restore(migrated);
    return { ok: true };
  }
  function slots() {
    const out = [];
    for (const slot of Object.keys(KEYS)) {
      const r = read(slot);
      if (r.ok) out.push({ slot, day: Math.floor(r.data.time.total / 1440) + 1, netWorth: r.data.sim.ledger.accounts.cash || 0, playTime: r.data.meta.playTimeSec, savedAt: r.data.meta.savedAt });
    }
    return out;
  }
  async function toCode() {
    const bytes = new TextEncoder().encode(JSON.stringify(collect()));
    if (typeof CompressionStream !== 'undefined') return 'LOE1.' + b64url(await pipeBytes(new CompressionStream('deflate-raw'), bytes));
    return 'LOE0.' + b64url(bytes);
  }
  async function fromCode(str) {
    try {
      const [tag, body] = String(str).trim().split('.');
      let bytes = unb64url(body);
      if (tag === 'LOE1') bytes = await pipeBytes(new DecompressionStream('deflate-raw'), bytes);
      else if (tag !== 'LOE0') return { ok: false, error: ERR.SAVE_INVALID };
      const s = JSON.parse(new TextDecoder().decode(bytes));
      return validateSave(s) ? { ok: true, data: s } : { ok: false, error: ERR.SAVE_INVALID };
    } catch (e) { return { ok: false, error: ERR.SAVE_INVALID }; }
  }
  return { get storageAvailable() { return available; }, slots, write, read, apply, toCode, fromCode };
}
