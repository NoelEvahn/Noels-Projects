// Modal synthesis (Annex E 3): exciter (click or noise burst) plus a bank of 3-8 damped resonances. Each mode is a sine with
// its own T60 decay (additive form of a resonant filter bank: predictable levels, same spectrum). Returns the end time.
import { osc, gain, filt } from './osc.js';
import { perc } from './env.js';
import { noiseSrc } from './noise.js';

/** modes: [[freqHz, t60, amp], ...]; click: 0..1 exciter level; clickF: exciter band centre */
export function modal(ctx, out, t, { modes, gain: g = 0.5, click = 0.3, clickF = 3000, clickQ = 0.8, clickDur = 0.012, pitch = 1, attack = 0.001 }) {
  let end = t;
  for (const [f, d, a] of modes) {
    const o = osc(ctx, 'sine', f * pitch, t);
    const e = gain(ctx, 0);
    o.connect(e); e.connect(out);
    const te = perc(e.gain, t, a * g, attack, d);
    o.stop(te + 0.05);
    if (te > end) end = te;
  }
  if (click > 0) {
    const n = noiseSrc(ctx, 'white', t, { loop: false });
    const b = filt(ctx, 'bandpass', clickF * pitch, clickQ), e = gain(ctx, 0);
    n.connect(b); b.connect(e); e.connect(out);
    perc(e.gain, t, click * g * 2.5, 0.0005, clickDur);
    n.stop(t + clickDur + 0.05);
  }
  return end;
}
