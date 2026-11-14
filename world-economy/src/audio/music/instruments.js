// Music instrument patches (Annex E 7.1). Each: (ctx, out, t, midi, dur, vel) -> end time. `midi` null for drums.
import { osc, gain, filt, wave } from '../synth/osc.js';
import { perc, adsr } from '../synth/env.js';
import { fm } from '../synth/fm.js';
import { pluck } from '../synth/pluck.js';
import { modal } from '../synth/modal.js';
import { noiseSrc } from '../synth/noise.js';
import { grains } from '../synth/grain.js';

export const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const INSTRUMENTS = {
  /** 2-op FM, ratio 1:1 body + 1:14 tine, tremolo through the shared chorus */
  ep(c, o, t, m, dur, v = 0.7) { const f = hz(m); return Math.max(fm(c, o, t, { f, ratio: 1, index: 1.4 * v, decay: Math.min(2.5, dur + 0.8), gain: 0.22 * v, indexDecay: 0.4 }), fm(c, o, t, { f, ratio: 14, index: 0.25, decay: 0.25, gain: 0.05 * v })); },
  /** 3 detuned saws -> lowpass with slow envelope */
  pad(c, o, t, m, dur, v = 0.6) {
    const f = hz(m), lp = filt(c, 'lowpass', 600, 0.8), e = gain(c, 0);
    const oscs = [-9, 0, 8].map((d) => { const s = osc(c, 'sawtooth', f, t, d); s.connect(lp); return s; });
    lp.connect(e); e.connect(o);
    lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(400 + 1400 * v, t + Math.min(1.5, dur * 0.5));
    const end = adsr(e.gain, t, { a: Math.min(0.8, dur * 0.3), d: 0.4, s: 0.8, r: 1.0, hold: Math.max(0, dur - Math.min(0.8, dur * 0.3) - 0.4), peak: 0.06 * v });
    for (const s of oscs) s.stop(end + 0.05); return end;
  },
  strings(c, o, t, m, dur, v = 0.6) {
    const f = hz(m), s = osc(c, 'sawtooth', f, t), vib = osc(c, 'sine', 5.2, t), vg = gain(c, 0), bp = filt(c, 'bandpass', Math.min(3000, f * 3), 0.6), e = gain(c, 0);
    vib.connect(vg); vg.connect(s.frequency); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.006, t + 0.6);
    s.connect(bp); bp.connect(e); e.connect(o);
    const end = adsr(e.gain, t, { a: 0.35, d: 0.3, s: 0.85, r: 0.6, hold: Math.max(0, dur - 0.65), peak: 0.14 * v });
    s.stop(end + 0.05); vib.stop(end + 0.05); return end;
  },
  bass(c, o, t, m, dur, v = 0.8) {
    const f = hz(m), s = osc(c, 'sine', f, t), saw = osc(c, 'sawtooth', f, t), lp = filt(c, 'lowpass', 500, 1), sg = gain(c, 0.35), e = gain(c, 0);
    s.connect(e); saw.connect(lp); lp.connect(sg); sg.connect(e); e.connect(o);
    const end = perc(e.gain, t, 0.32 * v, 0.008, Math.min(1.2, dur + 0.25));
    s.stop(end + 0.05); saw.stop(end + 0.05); return end;
  },
  guitar(c, o, t, m, dur, v = 0.7) { return pluck(c, o, t, hz(m), { gain: 0.22 * v, damp: 0.996, bright: 0.55, dur: Math.min(2.2, dur + 1.2) }); },
  ukulele(c, o, t, m, dur, v = 0.7) { return pluck(c, o, t, hz(m), { gain: 0.2 * v, damp: 0.99, bright: 0.7, dur: Math.min(1.2, dur + 0.5) }); },
  harmonic(c, o, t, m, dur, v = 0.6) { return pluck(c, o, t, hz(m + 12), { gain: 0.16 * v, damp: 0.998, bright: 0.3, dur: 2.5 }); },
  marimba(c, o, t, m, dur, v = 0.7) { const f = hz(m); return Math.max(fm(c, o, t, { f, ratio: 4, index: 1.2 * v, decay: 0.45, gain: 0.25 * v, indexDecay: 0.04 }), modal(c, o, t, { modes: [[f, 0.35, 0.3]], gain: 0.15 * v, click: 0.08, clickF: f * 4 })); },
  flute(c, o, t, m, dur, v = 0.6) {
    const f = hz(m), s = osc(c, 'sine', f, t), vib = osc(c, 'sine', 5, t), vg = gain(c, 0), e = gain(c, 0);
    vib.connect(vg); vg.connect(s.frequency); vg.gain.setValueAtTime(0, t); vg.gain.setValueAtTime(0, t + 0.25); vg.gain.linearRampToValueAtTime(f * 0.01, t + 0.6);
    const n = noiseSrc(c, 'white', t), bp = filt(c, 'bandpass', f * 2, 3), ng = gain(c, 0.12);
    s.connect(e); n.connect(bp); bp.connect(ng); ng.connect(e); e.connect(o);
    const end = adsr(e.gain, t, { a: 0.08, d: 0.15, s: 0.8, r: 0.25, hold: Math.max(0, dur - 0.23), peak: 0.16 * v });
    s.stop(end + 0.05); vib.stop(end + 0.05); n.stop(end + 0.05); return end;
  },
  /** approximation: Karplus-Strong body + FM attack, velocity lowpass */
  piano(c, o, t, m, dur, v = 0.7) {
    const f = hz(m), lp = filt(c, 'lowpass', 1200 + 3500 * v, 0.7); lp.connect(o);
    return Math.max(pluck(c, lp, t, f, { gain: 0.2 * v, damp: 0.998, bright: 0.45, dur: Math.min(3, dur + 1.5) }), fm(c, lp, t, { f, ratio: 1, index: 1.5, decay: 0.3, gain: 0.08 * v, indexDecay: 0.05 }));
  },
  bell(c, o, t, m, dur, v = 0.6) { return fm(c, o, t, { f: hz(m), ratio: 3.5, index: 1.6 * v, decay: 2.2, gain: 0.12 * v, indexDecay: 0.6 }); },
  // drums (midi ignored)
  kick(c, o, t, m, dur, v = 0.8) { const s = osc(c, 'sine', 120, t), e = gain(c, 0); s.frequency.exponentialRampToValueAtTime(45, t + 0.12); s.connect(e); e.connect(o); const end = perc(e.gain, t, 0.5 * v, 0.002, 0.35); s.stop(end + 0.05); return end; },
  snare(c, o, t, m, dur, v = 0.7) { const n = noiseSrc(c, 'white', t, { loop: false }), hp = filt(c, 'highpass', 1500, 0.7), e = gain(c, 0), s = osc(c, 'triangle', 180, t), se = gain(c, 0); n.connect(hp); hp.connect(e); e.connect(o); s.connect(se); se.connect(o); perc(se.gain, t, 0.2 * v, 0.001, 0.12); const end = perc(e.gain, t, 0.3 * v, 0.001, 0.22); n.stop(end + 0.05); s.stop(end + 0.05); return end; },
  hat(c, o, t, m, dur, v = 0.5) { const n = noiseSrc(c, 'white', t, { loop: false }), hp = filt(c, 'highpass', 7000, 0.7), e = gain(c, 0); n.connect(hp); hp.connect(e); e.connect(o); const end = perc(e.gain, t, 0.18 * v, 0.001, 0.06); n.stop(end + 0.05); return end; },
  brush(c, o, t, m, dur, v = 0.5) { const n = noiseSrc(c, 'pink', t), bp = filt(c, 'bandpass', 2500, 0.8), e = gain(c, 0); bp.frequency.setValueAtTime(1800, t); bp.frequency.linearRampToValueAtTime(4000, t + 0.15); n.connect(bp); bp.connect(e); e.connect(o); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.2 * v, t + 0.04); e.gain.linearRampToValueAtTime(0, t + 0.2); n.stop(t + 0.25); return t + 0.2; },
  shaker(c, o, t, m, dur, v = 0.5) { return grains(c, o, t, { n: 6, span: 0.05, f: [5000, 9000], q: 1.2, gain: 0.12 * v, dur: [0.005, 0.02] }); },
  rim(c, o, t, m, dur, v = 0.6) { return modal(c, o, t, { modes: [[1700, 0.04, 0.3], [820, 0.05, 0.2]], gain: 0.45 * v, click: 0.3, clickF: 3500 }); },
};
void wave;
