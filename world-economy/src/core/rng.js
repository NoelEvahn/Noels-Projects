// Deterministic RNG streams (MASTER_SPEC 4.3). xoshiro128** seeded by splitmix32. Pure.
export function splitmix32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

export function createRng(seed = 1) {
  const sm = splitmix32(seed);
  const s = new Uint32Array([sm(), sm(), sm(), sm()]);
  const rotl = (x, k) => (x << k) | (x >>> (32 - k));
  function nextU32() {
    const r = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
    s[2] ^= t; s[3] = rotl(s[3], 11) >>> 0;
    return r;
  }
  const api = {
    nextU32,
    float() { return nextU32() / 4294967296; },
    range(a, b) { return a + (b - a) * api.float(); },
    int(a, b) { return a + Math.floor(api.float() * (b - a + 1)); },
    pick(arr) { return arr[Math.floor(api.float() * arr.length)]; },
    chance(p) { return api.float() < p; },
    state() { return Array.from(s); },
    setState(arr) { for (let i = 0; i < 4; i++) s[i] = arr[i] >>> 0; },
  };
  return api;
}

/** Stateless 2D integer hash -> [0,1). Used for deterministic scatter and noise. */
export function hash2(ix, iz, seed = 0) {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iz | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
