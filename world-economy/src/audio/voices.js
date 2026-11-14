// Voice manager and ducking logic (Annex E 2, 7.3). Pure (no WebAudio), Node-testable, allocation-free per request.
// Rule: when the pool is full, steal the quietest voice of the lowest priority class; never steal a higher class.
export const PRIORITY = { ui: 5, player: 4, vehicle: 4, job: 3, world: 2, ambient: 1 };

export function createVoicePool(limit = 32) {
  const MAX = 48;
  const prio = new Int8Array(MAX), level = new Float32Array(MAX), end = new Float64Array(MAX), active = new Uint8Array(MAX), serial = new Uint32Array(MAX);
  let cap = Math.min(MAX, limit), count = 0, next = 1;
  const P = {
    get limit() { return cap; }, get count() { return count; },
    setLimit(n) { cap = Math.max(1, Math.min(MAX, n | 0)); },
    /**
     * Request a voice. Returns {slot, stolen} (stolen = slot index whose voice must be stopped, or -1), or null when refused.
     * `lvl` = expected loudness at the listener (gain x distance attenuation); `until` = end time (Infinity for loops).
     */
    request(p, lvl, until) {
      let slot = -1, stolen = -1;
      // over the limit after a setLimit() shrink: count active voices beyond cap as full
      if (count < cap) { for (let i = 0; i < MAX; i++) if (!active[i]) { slot = i; break; } }
      if (slot < 0) {
        let lowP = 127; for (let i = 0; i < MAX; i++) if (active[i] && prio[i] < lowP) lowP = prio[i];
        if (lowP > p) return null;
        let q = -1, ql = Infinity; for (let i = 0; i < MAX; i++) if (active[i] && prio[i] === lowP && level[i] < ql) { ql = level[i]; q = i; }
        if (q < 0) return null;
        slot = q; stolen = q; count--;
      }
      active[slot] = 1; prio[slot] = p; level[slot] = lvl; end[slot] = until; serial[slot] = next++; count++;
      return { slot, stolen, serial: serial[slot] };
    },
    release(slot, ser) { if (active[slot] && (ser === undefined || serial[slot] === ser)) { active[slot] = 0; count--; return true; } return false; },
    /** frees voices whose end time has passed; calls onFree(slot) for each */
    expire(now, onFree) { for (let i = 0; i < MAX; i++) if (active[i] && end[i] <= now) { active[i] = 0; count--; if (onFree) onFree(i); } },
    isActive(slot) { return !!active[slot]; },
    serialOf(slot) { return serial[slot]; },
    priorityOf(slot) { return prio[slot]; },
  };
  return P;
}

/**
 * Duck state (Mixer.duck(bus, dB, attack, hold, release)): concurrent ducks on one bus combine by taking the deepest.
 * levelAt(bus, now) -> dB (<= 0). Pure.
 */
export function createDuckState() {
  const ducks = []; // {bus, db, t0, a, h, r}
  return {
    add(bus, db, attack, hold, release, now) { ducks.push({ bus, db: -Math.abs(db), t0: now, a: Math.max(0.001, attack), h: Math.max(0, hold), r: Math.max(0.001, release) }); },
    levelAt(bus, now) {
      let deepest = 0;
      for (let i = ducks.length - 1; i >= 0; i--) {
        const d = ducks[i], x = now - d.t0;
        if (x >= d.a + d.h + d.r) { ducks.splice(i, 1); continue; }
        if (d.bus !== bus || x < 0) continue;
        const v = x < d.a ? d.db * (x / d.a) : x < d.a + d.h ? d.db : d.db * (1 - (x - d.a - d.h) / d.r);
        if (v < deepest) deepest = v;
      }
      return deepest;
    },
    get size() { return ducks.length; },
  };
}
