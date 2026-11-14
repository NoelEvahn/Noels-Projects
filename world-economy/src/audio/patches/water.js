// Water and fishing (Annex E 6.4, 6.5). Splash synthesis: noise burst through a fast rising then falling bandpass + bubbles.
import { burst, sweep, tone, knock, grains, toneGrains, splash, chime, rnd, R, loopHandle, graph, gain, filt, noiseSrc, osc } from './kit.js';
import { pluck } from '../synth/pluck.js';
import { shaper } from '../synth/shaper.js';

/** ratchet loop: noise bandpass gated by a pulse train at `rate` Hz; param rate */
function ratchet(c, o, t, x, { rate, f, q, level, whine = 0 }) {
  const G = graph(c, t), m = gain(c, 0); m.connect(o);
  const n = G.add(noiseSrc(c, 'white', t, { rng: rnd(x) })), b = filt(c, 'bandpass', f, q), gt = gain(c, 0);
  const p = G.osc('sawtooth', rate), sh = shaper(c, 'gate', 0.12); p.connect(sh); sh.connect(gt.gain);
  n.connect(b); b.connect(gt); gt.connect(m);
  if (whine) { const w = G.osc('sine', f * 0.9), wg = gain(c, whine); w.connect(wg); wg.connect(m); }
  const prm = x.params || {};
  if (prm.rate) p.frequency.value = prm.rate;
  return loopHandle(c, G, m, level, { setters: { rate: (v, at, r) => p.frequency.setTargetAtTime(Math.max(0.5, v), at, r), tension: (v, at, r) => m.gain.setTargetAtTime(level * (0.4 + 0.6 * v), at, r) } });
}

export const WATER = {
  'sfx.water.splash_small': (c, o, t, x) => splash(c, o, t, { size: 0.5, g: 0.6, rng: rnd(x) }),
  'sfx.water.splash_big': (c, o, t, x) => Math.max(splash(c, o, t, { size: 1.4, g: 0.6, rng: rnd(x) }), knock(c, o, t, [[70, 0.3, 0.6]], 0.7, 0), grains(c, o, t + 0.2, { n: 14, span: 0.8, f: [800, 3000], q: 2, gain: 0.15, dur: [0.02, 0.06], rng: rnd(x) })),
  'sfx.water.wade': (c, o, t, x) => sweep(c, o, t, { type: 'pink', pts: [[0, 300], [0.5, 1200], [1, 500]], q: 1.2, dur: 0.6, g: 0.6, peakAt: 0.4, rng: rnd(x) }),
  'sfx.water.drip': (c, o, t, x) => toneGrains(c, o, t, { n: 1, span: 0.01, f: [900, 1300], sweep: 2.2, dur: [0.03, 0.05], gain: 0.5, rng: rnd(x) }),
  'sfx.fish.cast_whoosh': (c, o, t, x) => sweep(c, o, t, { type: 'pink', pts: [[0, 400], [0.4, 2200], [1, 600]], q: 2, dur: 0.38, g: 1.3, peakAt: 0.4, rng: rnd(x) }),
  'sfx.fish.line_out': (c, o, t, x) => {
    const n = noiseSrc(c, 'white', t, { rng: rnd(x) }), b = filt(c, 'bandpass', 4200, 2.5), gt = gain(c, 0), e = gain(c, 0);
    const p = osc(c, 'sawtooth', 45, t), sh = shaper(c, 'gate', 0.15); p.frequency.exponentialRampToValueAtTime(12, t + 1.2); p.connect(sh); sh.connect(gt.gain);
    n.connect(b); b.connect(gt); gt.connect(e); e.connect(o);
    e.gain.setValueAtTime(0.9, t); e.gain.setTargetAtTime(0, t + 0.5, 0.18);
    n.stop(t + 1.4); p.stop(t + 1.4); return t + 1.3;
  },
  'sfx.fish.bobber_plop': (c, o, t, x) => Math.max(splash(c, o, t, { size: 0.15, g: 0.25, rng: rnd(x) }), tone(c, o, t + 0.01, { f: 420, f1: 110, a: 0.004, d: 0.25, g: 0.55 })),
  'sfx.fish.nibble': (c, o, t, x) => toneGrains(c, o, t, { n: 2, span: 0.12, f: [700, 1200], sweep: 2, dur: [0.02, 0.04], gain: 0.5, rng: rnd(x) }),
  'sfx.fish.bite': (c, o, t, x) => Math.max(toneGrains(c, o, t, { n: 3, span: 0.1, f: [600, 1100], sweep: 2, dur: [0.02, 0.04], gain: 0.4, rng: rnd(x) }), knock(c, o, t + 0.05, [[90, 0.15, 0.6], [180, 0.08, 0.3]], 0.8, 0.2, 800)),
  'sfx.fish.line_snap': (c, o, t, x) => Math.max(pluck(c, o, t, 196, { gain: 0.6, damp: 0.985, bright: 0.9, dur: 0.5 }), sweep(c, o, t, { type: 'white', pts: [[0, 6000], [1, 1500]], q: 1, dur: 0.25, g: 0.35, peakAt: 0.05, rng: rnd(x) })),
  'sfx.fish.thrash': (c, o, t, x) => { const r = rnd(x); let e = t; const n = 4 + Math.floor(r() * 3); for (let i = 0; i < n; i++) e = Math.max(e, splash(c, o, t + i * R(r, 0.18, 0.3), { size: R(r, 0.3, 0.7), g: 0.5, rng: r })); return e; },
  'sfx.fish.landed': (c, o, t, x) => Math.max(knock(c, o, t, [[100, 0.15, 0.6], [230, 0.1, 0.3]], 0.8, 0.3, 900), splash(c, o, t, { size: 0.2, g: 0.3, rng: rnd(x) }), chime(c, o, t + 0.35, [1047, 1319, 1568], { ratio: 2, index: 1, decay: 0.6, g: 0.25, step: 0.09 })),
  'sfx.fish.reel': (c, o, t, x) => ratchet(c, o, t, x, { rate: 12, f: 3000, q: 1.5, level: 2.0 }),
  'sfx.fish.drag_scream': (c, o, t, x) => ratchet(c, o, t, x, { rate: 42, f: 5200, q: 2, level: 0.8, whine: 0.04 }),
  /** params: tension 0..1 */
  'sfx.fish.line_tension': (c, o, t, x) => {
    const G = graph(c, t), m = gain(c, 0); m.connect(o);
    const s = G.osc('sine', 900), sg = gain(c, 0.4); s.connect(sg); sg.connect(m); G.lfo(s.frequency, 5.5, 12);
    const tn = (x.params && x.params.tension) || 0.5; s.frequency.value = 600 + tn * 900;
    return loopHandle(c, G, m, 0.5, { setters: { tension: (v, at, r) => s.frequency.setTargetAtTime(600 + v * 900, at, r) } });
  },
};
void burst;
