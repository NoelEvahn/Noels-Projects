// Oscillators, PeriodicWave recipes, filters, gains, LFOs (Annex E 3) plus a tiny graph helper that tracks sources to stop.
import { ctxCache } from './noise.js';

/** PeriodicWave from harmonic amplitudes [a1, a2, ...] (sine phase), cached per context. */
export function wave(ctx, harm) {
  const c = ctxCache(ctx), key = 'w:' + harm.join(',');
  if (c.waves[key]) return c.waves[key];
  const real = new Float32Array(harm.length + 1), imag = new Float32Array(harm.length + 1);
  for (let i = 0; i < harm.length; i++) imag[i + 1] = harm[i];
  return (c.waves[key] = ctx.createPeriodicWave(real, imag));
}
export function osc(ctx, type, f, t, detune = 0) {
  const o = ctx.createOscillator();
  if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
  o.frequency.setValueAtTime(f, t);
  if (detune) o.detune.setValueAtTime(detune, t);
  o.start(t);
  return o;
}
export function gain(ctx, v = 1) { const g = ctx.createGain(); g.gain.value = v; return g; }
export function filt(ctx, type, f, Q = 0.707, g = 0) {
  const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; if (g) b.gain.value = g; return b;
}
export function pan(ctx, p) { if (ctx.createStereoPanner) { const s = ctx.createStereoPanner(); s.pan.value = p; return s; } return gain(ctx, 1); }
/** connects a chain of nodes left to right; returns the last */
export function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }
/** LFO: oscillator -> gain(depth) -> param (param keeps its own base value). Returns the oscillator. */
export function lfo(ctx, param, rate, depth, t, type = 'sine', phase = 0) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = rate;
  const g = gain(ctx, depth); o.connect(g); g.connect(param);
  o.start(Math.max(0, t - phase / Math.max(0.001, rate)));
  return o;
}

/** Graph helper for loops: collects sources so stop(t) ends them all. */
export function graph(ctx, t) {
  const sources = [];
  const G = {
    ctx, t, sources,
    add(src) { sources.push(src); return src; },
    osc(type, f, detune) { return G.add(osc(ctx, type, f, t, detune)); },
    lfo(param, rate, depth, type, phase) { return G.add(lfo(ctx, param, rate, depth, t, type, phase)); },
    stop(at) { for (const s of sources) { try { s.stop(at); } catch (e) { /* already stopped */ } } },
  };
  return G;
}
