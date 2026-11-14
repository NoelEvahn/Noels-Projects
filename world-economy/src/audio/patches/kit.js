// Shared recipe helpers for patches. One-shot patch: (ctx, out, t, o) -> end time. Loop patch: (ctx, out, t, o) -> handle
// {set(param, value, ramp?), stop(at?, fade?), schedule?(t0, t1)}. o = { pitch, params, rng }. Any BaseAudioContext.
import { osc, gain, filt, graph, pan } from '../synth/osc.js';
import { noiseSrc } from '../synth/noise.js';
import { perc, glide } from '../synth/env.js';
import { modal } from '../synth/modal.js';
import { fm } from '../synth/fm.js';
import { grains, toneGrains } from '../synth/grain.js';

export const rnd = (o) => o.rng || Math.random;
export const R = (r, a, b) => a + (b - a) * r();

/** filtered noise burst with percussive envelope */
export function burst(ctx, out, t, { type = 'white', f = 2000, q = 0.8, ftype = 'bandpass', a = 0.001, d = 0.05, g = 0.4, f1 = null, sweep = 0, rng }) {
  const n = noiseSrc(ctx, type, t, { loop: true, rng });
  const b = filt(ctx, ftype, f, q), e = gain(ctx, 0);
  if (f1) glide(b.frequency, t, f, f1, sweep || d);
  n.connect(b);
  // steeper skirts: second-order filters alone leave broadband noise above the band
  if (ftype === 'bandpass' || ftype === 'lowpass') { const l2 = filt(ctx, 'lowpass', Math.max(f, f1 || f) * (ftype === 'lowpass' ? 1 : 2.5), 0.7); b.connect(l2); l2.connect(e); } else b.connect(e);
  e.connect(out);
  const end = perc(e.gain, t, g, a, d); n.stop(end + 0.05);
  return end;
}
/** noise swept through a bandpass with a shaped (rise/fall) envelope: whooshes, drawer slides, splashes */
export function sweep(ctx, out, t, { type = 'pink', pts, q = 1.5, dur, g = 0.4, peakAt = 0.3, rng }) {
  const n = noiseSrc(ctx, type, t, { rng });
  const b = filt(ctx, 'bandpass', pts[0][1], q), e = gain(ctx, 0);
  b.frequency.setValueAtTime(pts[0][1], t);
  let fmax = pts[0][1];
  for (const [tt, f] of pts.slice(1)) { b.frequency.exponentialRampToValueAtTime(f, t + tt * dur); if (f > fmax) fmax = f; }
  const l2 = filt(ctx, 'lowpass', fmax * 1.6, 0.7);
  n.connect(b); b.connect(l2); l2.connect(e); e.connect(out);
  e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + dur * peakAt); e.gain.linearRampToValueAtTime(0, t + dur);
  n.stop(t + dur + 0.05);
  return t + dur;
}
/** simple tone with envelope */
export function tone(ctx, out, t, { type = 'sine', f, f1 = null, a = 0.005, d = 0.2, g = 0.3, lp = 0, hold = 0 }) {
  const o = osc(ctx, type, f, t), e = gain(ctx, 0);
  if (f1) glide(o.frequency, t, f, f1, a + hold + d * 0.5);
  if (lp) { const l = filt(ctx, 'lowpass', lp, 0.7); o.connect(l); l.connect(e); } else o.connect(e);
  e.connect(out);
  let end;
  if (hold) { e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + a); e.gain.setValueAtTime(g, t + a + hold); e.gain.setTargetAtTime(0, t + a + hold, d / 6.9); end = t + a + hold + d; }
  else end = perc(e.gain, t, g, a, d);
  o.stop(end + 0.05); return end;
}
export const knock = (ctx, out, t, modes, g = 0.5, click = 0.3, clickF = 2500, pitch = 1) => modal(ctx, out, t, { modes, gain: g, click, clickF, pitch });
export const chime = (ctx, out, t, notes, { ratio = 3.5, index = 1.2, decay = 0.8, g = 0.3, step = 0.1 } = {}) => { let end = t; notes.forEach((f, i) => { end = Math.max(end, fm(ctx, out, t + i * step, { f, ratio, index, decay, gain: g })); }); return end; };
export const marimba = (ctx, out, t, f, g = 0.4, decay = 0.5) => Math.max(fm(ctx, out, t, { f, ratio: 4, index: 1.5, decay, gain: g, indexDecay: 0.05 }), modal(ctx, out, t, { modes: [[f, decay * 0.6, 0.3]], gain: g * 0.5, click: 0.1, clickF: f * 4 }));
export { grains, toneGrains, modal, fm, perc, glide };

/** splash: noise burst through a fast rising then falling bandpass + bubble chirps */
export function splash(ctx, out, t, { size = 1, g = 0.5, rng }) {
  const d = 0.25 + 0.35 * size;
  let end = sweep(ctx, out, t, { type: 'pink', pts: [[0, 400], [0.15, 2200 - size * 500], [1, 450]], q: 0.9, dur: d, g: g * 1.6, peakAt: 0.12, rng });
  end = Math.max(end, toneGrains(ctx, out, t + 0.05, { n: Math.round(3 + size * 4), span: d * 0.8, f: [500, 1600], sweep: 1.9, dur: [0.015, 0.05], gain: g * 0.4, rng }));
  return end;
}

/** loop handle around a graph helper and a master gain; setters: {param: fn(value, at, ramp)} */
export function loopHandle(ctx, G, master, level, { setters = {}, schedule = null, fadeIn = 0.05 } = {}) {
  master.gain.setValueAtTime(0, G.t); master.gain.linearRampToValueAtTime(level, G.t + fadeIn);
  let stopped = false;
  return {
    set(param, value, ramp) { const f = setters[param]; if (f) f(value, ctx.currentTime, ramp == null ? 0.05 : Math.max(0.01, ramp)); },
    stop(at, fade = 0.3) { if (stopped) return; stopped = true; const a = at == null ? ctx.currentTime : at; master.gain.cancelScheduledValues(a); master.gain.setTargetAtTime(0, a, Math.max(0.005, fade / 4)); G.stop(a + fade + 0.1); },
    schedule: schedule ? (t0, t1) => { if (!stopped) schedule(t0, t1); } : null,
    get stopped() { return stopped; },
  };
}
/** Poisson-ish event scheduler for loops: calls fire(time) for events in [t0, t1) with gap in [gapLo, gapHi] seconds */
export function eventScheduler(t, gapLo, gapHi, rng, fire) {
  let next = t + rng() * gapLo;
  return (t0, t1) => { while (next < t1) { if (next >= t0 - 0.05) fire(Math.max(next, t0)); next += gapLo + (gapHi - gapLo) * rng(); } };
}
/** stereo decorrelated noise pair: returns [left, right] panned sources feeding `into` */
export function stereoNoise(ctx, G, type, into, width = 0.7, rng = Math.random) {
  for (const p of [-width, width]) { const n = G.add(noiseSrc(ctx, type, G.t, { rng })); const pn = pan(ctx, p); n.connect(pn); pn.connect(into); }
}
export { osc, gain, filt, graph, pan, noiseSrc };
