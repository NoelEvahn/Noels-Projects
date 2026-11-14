// Karplus-Strong plucks (Annex E 3) rendered in JS into buffers, cached per pitch / damping / length.
import { ctxCache, mulberry } from './noise.js';
import { gain } from './osc.js';

export function pluckBuffer(ctx, f, { damp = 0.996, bright = 0.5, dur = 1.6 } = {}) {
  const c = ctxCache(ctx), key = `ks:${Math.round(f * 10)}:${damp}:${bright}:${dur}`;
  if (c.buffers[key]) return c.buffers[key];
  const sr = ctx.sampleRate, n = Math.round(sr * dur), P = Math.max(2, sr / f);
  const N = Math.floor(P), frac = P - N;
  const line = new Float32Array(N + 2), r = mulberry(Math.round(f * 100));
  let lp = 0;
  for (let i = 0; i < line.length; i++) { const w = r() * 2 - 1; lp = lp + bright * (w - lp); line[i] = lp; }
  let m = 0; for (let i = 0; i < line.length; i++) m += line[i]; m /= line.length; for (let i = 0; i < line.length; i++) line[i] -= m;
  const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
  let idx = 0, peak = 0;
  for (let i = 0; i < n; i++) {
    const a = line[idx], b = line[(idx + 1) % line.length];
    const y = a * (1 - frac) + b * frac;
    d[i] = y; if (Math.abs(y) > peak) peak = Math.abs(y);
    line[idx] = damp * 0.5 * (a + b);
    idx = (idx + 1) % line.length;
  }
  const fade = Math.round(sr * 0.03), k = peak ? 0.9 / peak : 1;
  for (let i = 0; i < n; i++) d[i] *= k * (i > n - fade ? (n - i) / fade : 1);
  c.bytes += n * 4;
  return (c.buffers[key] = buf);
}
export function pluck(ctx, out, t, f, { gain: g = 0.4, damp, bright, dur = 1.6, rate = 1 } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = pluckBuffer(ctx, f, { damp, bright, dur }); s.playbackRate.value = rate;
  const e = gain(ctx, g); s.connect(e); e.connect(out);
  s.start(t); return t + dur / rate;
}
