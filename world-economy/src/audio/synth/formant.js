// Formant voices (Annex E 3): sawtooth or noise through 2-3 bandpass formants with pitch and formant contours.
import { osc, gain, filt } from './osc.js';
import { noiseSrc } from './noise.js';

/**
 * pitch: [[dt, f], ...] contour starting at f0; formants: [[f, Q, amp], ...]; env: [[dt, level], ...] from 0.
 * rough: amplitude-modulation rate for harsh calls (0 = none). Returns end time.
 */
export function formantVoice(ctx, out, t, { f0 = 200, pitch = [], formants, env, noise = 0, rough = 0, roughDepth = 0.5, gain: g = 0.5, type = 'sawtooth' }) {
  const src = osc(ctx, type, f0, t);
  let tt = t; for (const [dt, f] of pitch) { tt += dt; src.frequency.linearRampToValueAtTime(f, tt); }
  const pre = gain(ctx, 1); src.connect(pre);
  let nz = null;
  if (noise > 0) { nz = noiseSrc(ctx, 'white', t, { loop: true }); const ng = gain(ctx, noise); nz.connect(ng); ng.connect(pre); }
  const am = gain(ctx, 1);
  let ro = null;
  if (rough) { am.gain.value = 1 - roughDepth / 2; ro = osc(ctx, 'sine', rough, t); const rg = gain(ctx, roughDepth / 2); ro.connect(rg); rg.connect(am.gain); }
  const e = gain(ctx, 0);
  for (const [f, q, a] of formants) { const b = filt(ctx, 'bandpass', f, q), ga = gain(ctx, a); pre.connect(b); b.connect(ga); ga.connect(am); }
  am.connect(e); e.connect(out);
  e.gain.setValueAtTime(0, t);
  let te = t; for (const [dt, v] of env) { te += dt; e.gain.linearRampToValueAtTime(v * g, te); }
  src.stop(te + 0.05); if (nz) nz.stop(te + 0.05); if (ro) ro.stop(te + 0.05);
  return te;
}
