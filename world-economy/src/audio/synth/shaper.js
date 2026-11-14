// WaveShaper curves (Annex E 3): soft clip, fold, unipolar pulse gate. Cached per context.
import { ctxCache } from './noise.js';
export function curve(ctx, kind, k = 2) {
  const c = ctxCache(ctx), key = kind + ':' + k;
  if (c.curves[key]) return c.curves[key];
  const n = 1024, a = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    if (kind === 'soft') a[i] = Math.tanh(k * x) / Math.tanh(k);
    else if (kind === 'fold') a[i] = Math.sin(x * k * Math.PI / 2);
    else if (kind === 'gate') a[i] = x > 1 - 2 * k ? 1 : 0;        // pulse with duty k from a sine/saw input
    else if (kind === 'uni') a[i] = (x + 1) / 2;                     // bipolar -> 0..1
    else if (kind === 'pow') a[i] = Math.pow((x + 1) / 2, k);         // 0..1 with sharpened peaks
  }
  return (c.curves[key] = a);
}
export function shaper(ctx, kind, k) { const w = ctx.createWaveShaper(); w.curve = curve(ctx, kind, k); return w; }
