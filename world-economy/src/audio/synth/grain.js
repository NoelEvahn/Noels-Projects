// Grain clouds (Annex E 3): short enveloped noise or tone grains with random pitch, filter, pan and timing. Also JS-rendered
// seamless texture buffers (grains written with wrap-around, so the buffer loops without a seam).
import { noiseSrc, ctxCache, mulberry } from './noise.js';
import { filt, gain, pan, osc } from './osc.js';
import { perc } from './env.js';

const R = (r, a, b) => a + (b - a) * r();
/** noise grains: n grains over `span` s; each bandpassed in [fLo,fHi] with Q; dur [a,b]; returns end time */
export function grains(ctx, out, t, { n = 8, span = 0.3, dur = [0.005, 0.03], f = [800, 3000], q = 1.5, gain: g = 0.3, type = 'white', spread = 0, rng = Math.random, shape = 'perc', ramp = 0 }) {
  let end = t;
  for (let i = 0; i < n; i++) {
    const tt = t + (ramp ? span * Math.pow(i / Math.max(1, n - 1), ramp) : rng() * span), d = R(rng, dur[0], dur[1]);
    const s = noiseSrc(ctx, type, tt, { loop: false, rng });
    const b = filt(ctx, 'bandpass', R(rng, f[0], f[1]), q), e = gain(ctx, 0);
    s.connect(b); b.connect(e);
    if (spread) { const p = pan(ctx, R(rng, -spread, spread)); e.connect(p); p.connect(out); } else e.connect(out);
    const amp = g * R(rng, 0.5, 1);
    const te = shape === 'perc' ? perc(e.gain, tt, amp, 0.001, d) : (e.gain.setValueAtTime(0, tt), e.gain.linearRampToValueAtTime(amp, tt + d * 0.5), e.gain.linearRampToValueAtTime(0, tt + d), tt + d);
    s.stop(te + 0.02);
    if (te > end) end = te;
  }
  return end;
}
/** tone grains (bubbles, blips): sine with exponential pitch sweep */
export function toneGrains(ctx, out, t, { n = 4, span = 0.2, f = [600, 1800], sweep = 1.8, dur = [0.01, 0.04], gain: g = 0.2, rng = Math.random }) {
  let end = t;
  for (let i = 0; i < n; i++) {
    const tt = t + rng() * span, d = R(rng, dur[0], dur[1]), f0 = R(rng, f[0], f[1]);
    const o = osc(ctx, 'sine', f0, tt), e = gain(ctx, 0);
    o.frequency.exponentialRampToValueAtTime(f0 * sweep, tt + d);
    o.connect(e); e.connect(out);
    const te = perc(e.gain, tt, g * R(rng, 0.5, 1), 0.002, d);
    o.stop(te + 0.02); if (te > end) end = te;
  }
  return end;
}

/**
 * Seamless JS texture buffer, cached: `kind` 'ticks' (rain), 'crackle' (fire, sizzle), 'crunch' (gravel).
 * density = events per second. Events wrap around the end so the loop has no seam.
 */
export function textureBuffer(ctx, kind, density, seconds = 4, seed = 5) {
  const c = ctxCache(ctx), key = `tx:${kind}:${density}:${seconds}:${seed}`;
  if (c.buffers[key]) return c.buffers[key];
  const sr = ctx.sampleRate, n = Math.round(sr * seconds), d = new Float32Array(n), r = mulberry(seed * 977 + density);
  const count = Math.round(density * seconds);
  for (let e = 0; e < count; e++) {
    const pos = Math.floor(r() * n), amp = Math.pow(r(), kind === 'crackle' ? 3 : 1.5);
    const len = kind === 'ticks' ? Math.round(sr * (0.002 + r() * 0.006)) : kind === 'crackle' ? Math.round(sr * (0.0008 + r() * 0.004)) : Math.round(sr * (0.004 + r() * 0.012));
    const tau = len / 4;
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const w = r() * 2 - 1, hp = w - prev; prev = w;                 // first difference = brighter
      const v = (kind === 'crunch' ? w : hp) * amp * Math.exp(-i / tau);
      d[(pos + i) % n] += v;
    }
  }
  let m = 0; for (let i = 0; i < n; i++) m += d[i]; m /= n;
  let s2 = 0; for (let i = 0; i < n; i++) { d[i] -= m; s2 += d[i] * d[i]; }
  const k = 0.25 / Math.sqrt(s2 / n || 1);
  const buf = ctx.createBuffer(1, n, sr), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = Math.max(-1, Math.min(1, d[i] * k));
  c.bytes += n * 4;
  return (c.buffers[key] = buf);
}
export function textureSrc(ctx, kind, density, t, { rate = 1, rng = Math.random, seconds = 4, seed = 5 } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = textureBuffer(ctx, kind, density, seconds, seed); s.loop = true; s.playbackRate.value = rate;
  s.start(t, rng() * (seconds - 0.1)); return s;
}
