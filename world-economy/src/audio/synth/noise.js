// Noise buffers (Annex E 3): pre-rendered 2 s loopable white, pink (Kellet) and brown noise with crossfaded ends, cached per
// context. Seeded PRNG so offline renders are reproducible. Works with any BaseAudioContext.
export function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const cache = new WeakMap();
// default randomness for noise offsets and grains: a seeded stream (cosmetic variation live; reproducible offline renders)
let defaultRng = mulberry(12345);
export function reseed(seed) { defaultRng = mulberry(seed >>> 0); }
export const rand = () => defaultRng();
export function ctxCache(ctx) { let c = cache.get(ctx); if (!c) { c = { buffers: {}, waves: {}, curves: {}, bytes: 0 }; cache.set(ctx, c); } return c; }

/** Fills `out` (length n) with seamless noise of the given colour, RMS-normalised to 0.3. */
export function fillNoise(out, type, seed, sr) {
  const n = out.length, xf = Math.min(Math.round(sr * 0.05), n >> 2);
  const raw = new Float32Array(n + xf);
  const r = mulberry(seed);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < raw.length; i++) {
    const w = r() * 2 - 1;
    if (type === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
      raw[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
    } else if (type === 'brown') { last = (last + 0.02 * w) / 1.02; raw[i] = last; }
    else raw[i] = w;
  }
  for (let i = 0; i < n; i++) out[i] = raw[i];
  for (let i = 0; i < xf; i++) { const a = i / xf; out[i] = raw[i] * a + raw[n + i] * (1 - a); }
  let m = 0; for (let i = 0; i < n; i++) m += out[i]; m /= n;
  let s2 = 0; for (let i = 0; i < n; i++) { out[i] -= m; s2 += out[i] * out[i]; }
  const k = 0.3 / Math.sqrt(s2 / n || 1);
  for (let i = 0; i < n; i++) out[i] *= k;
  return out;
}

// sample data is context-independent: generated once (at boot via Audio.prewarm, behind the loading screen) and copied
// into an AudioBuffer per context, which is fast
const dataCache = new Map();
export function noiseData(type, sr, seconds = 2) {
  const key = type + ':' + sr + ':' + seconds;
  let d = dataCache.get(key);
  if (!d) { d = fillNoise(new Float32Array(Math.round(sr * seconds)), type, type === 'white' ? 11 : type === 'pink' ? 23 : 37, sr); dataCache.set(key, d); }
  return d;
}
export function noiseBuffer(ctx, type = 'white', seconds = 2) {
  const c = ctxCache(ctx), key = 'n:' + type + seconds;
  if (c.buffers[key]) return c.buffers[key];
  const sr = ctx.sampleRate, d = noiseData(type, sr, seconds);
  const buf = ctx.createBuffer(1, d.length, sr);
  buf.copyToChannel(d, 0);
  c.bytes += d.length * 4;
  return (c.buffers[key] = buf);
}

/** Looping noise source started at t (random start offset decorrelates layers). */
export function noiseSrc(ctx, type, t, { loop = true, offset = null, rate = 1, rng = rand } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(ctx, type);
  s.loop = loop; s.playbackRate.value = rate;
  s.start(t, offset == null ? rng() * 1.9 : offset);
  return s;
}
