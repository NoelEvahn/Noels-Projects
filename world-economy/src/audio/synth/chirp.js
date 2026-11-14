// Chirps (Annex E 3): sine with a pitch contour and amplitude envelope; phrase helper for birds and UI blips.
import { osc, gain } from './osc.js';

/** pts: [[dt, f], ...] after f0; env attack/decay shape (sine-ish); am {rate, depth}; returns end time */
export function chirp(ctx, out, t, { f0, pts = [], dur, gain: g = 0.3, am = null, type = 'sine', a = 0.01 }) {
  const o = osc(ctx, type, f0, t);
  let tt = t; for (const [dt, f] of pts) { tt += dt; o.frequency.linearRampToValueAtTime(f, tt); }
  const e = gain(ctx, 0); o.connect(e);
  let m = null, target = out;
  if (am) { const ag = gain(ctx, 1 - am.depth / 2); m = osc(ctx, 'sine', am.rate, t); const mg = gain(ctx, am.depth / 2); m.connect(mg); mg.connect(ag.gain); e.connect(ag); target = null; ag.connect(out); }
  if (target) e.connect(out);
  e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + Math.min(a, dur / 3));
  e.gain.setValueAtTime(g, t + dur * 0.6); e.gain.linearRampToValueAtTime(0, t + dur);
  o.stop(t + dur + 0.02); if (m) m.stop(t + dur + 0.02);
  return t + dur;
}
/** phrase: list of [offset, chirpOpts] */
export function phrase(ctx, out, t, list) { let end = t; for (const [off, o] of list) { const e = chirp(ctx, out, t + off, o); if (e > end) end = e; } return end; }
