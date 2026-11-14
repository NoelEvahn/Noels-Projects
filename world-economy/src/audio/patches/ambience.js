// Ambience (Annex E 5): beds (non-spatial live graphs), emitters (spatial loops) and scheduler one-shots. Loops with discrete
// events expose schedule(t0, t1); the engine calls it every update with 0.25 s lookahead (offline renders call it once).
import { burst, sweep, tone, knock, grains, toneGrains, splash, fm, rnd, R, loopHandle, graph, gain, filt, noiseSrc, osc, pan, stereoNoise, eventScheduler, modal } from './kit.js';
import { textureSrc } from '../synth/grain.js';
import { formantVoice } from '../synth/formant.js';
import { chirp, phrase } from '../synth/chirp.js';
import { shaper } from '../synth/shaper.js';
import { createEngine, ENGINES } from '../synth/engine.js';
import { fireLoop } from './work.js';

/** bed scaffold: returns {G, m, h(level, opts)} */
function bed(c, o, t) { const G = graph(c, t), m = gain(c, 0); m.connect(o); return { G, m }; }
function noiseBand(c, G, type, into, ftype, f, q, g, rng) {
  const n = G.add(noiseSrc(c, type, G.t, { rng })), b = filt(c, ftype, f, q), gg = gain(c, g); n.connect(b);
  if (ftype === 'bandpass' || ftype === 'lowpass') { const l2 = filt(c, 'lowpass', f * (ftype === 'lowpass' ? 1 : 2.5), 0.7); b.connect(l2); l2.connect(gg); } else b.connect(gg);
  gg.connect(into); return { n, b, g: gg };
}
const pulseGate = (c, G, param, rate, duty, depth = 1, phase = 0) => { const p = G.osc('sawtooth', rate); const s = shaper(c, 'gate', duty), sg = gain(c, depth); p.connect(s); s.connect(sg); sg.connect(param); if (phase) p.detune.value = phase; return p; };

// ---- beds ----------------------------------------------------------------------------------------------------------------
const BEDS = {
  'amb.city.traffic_hum': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    const a = noiseBand(c, G, 'brown', m, 'lowpass', 220, 0.7, 1.0, r); noiseBand(c, G, 'brown', m, 'bandpass', 90, 1.5, 1.2, r);
    G.lfo(a.g.gain, 0.07, 0.3); noiseBand(c, G, 'pink', m, 'bandpass', 1200, 1.5, 0.05, r);
    return loopHandle(c, G, m, 0.45);
  },
  'amb.city.crowd': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x), lp = filt(c, 'lowpass', 2500, 0.7); lp.connect(m);
    for (let i = 0; i < 6; i++) {
      const s = G.osc('sawtooth', R(r, 110, 230)), p = pan(c, R(r, -0.8, 0.8)), am = gain(c, 0.5);
      G.lfo(s.frequency, R(r, 0.2, 0.5), R(r, 8, 20));
      for (const [f, q, a, rate] of [[R(r, 500, 750), 4, 1, R(r, 0.3, 0.7)], [R(r, 1100, 1700), 5, 0.5, R(r, 0.4, 0.9)]]) { const b = filt(c, 'bandpass', f, q), g = gain(c, a); G.lfo(b.frequency, rate, f * 0.25); s.connect(b); b.connect(g); g.connect(am); }
      G.lfo(am.gain, R(r, 3.2, 5.5), 0.45, 'sine', r()); G.lfo(am.gain, R(r, 0.15, 0.35), 0.3, 'sine', r());
      am.connect(p); p.connect(lp);
    }
    return loopHandle(c, G, m, 0.22);
  },
  'amb.city.hvac': (c, o, t, x) => {
    const { G, m } = bed(c, o, t);
    for (const [f, g] of [[100, 0.25], [120, 0.3], [200, 0.08], [240, 0.06]]) { const s = G.osc('sine', f), sg = gain(c, g); s.connect(sg); sg.connect(m); }
    noiseBand(c, G, 'pink', m, 'bandpass', 300, 1.2, 0.3, rnd(x));
    return loopHandle(c, G, m, 0.35);
  },
  /** params: wind 0..1 */
  'amb.wind.open': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    for (const pz of [-0.7, 0.7]) {
      const n = G.add(noiseSrc(c, 'pink', t, { rng: r })), b = filt(c, 'bandpass', 550, 1.2), g = gain(c, 0.8), p = pan(c, pz);
      G.lfo(b.frequency, R(r, 0.08, 0.13), 250, 'sine', r()); G.lfo(g.gain, R(r, 0.11, 0.17), 0.35, 'sine', r()); G.lfo(g.gain, R(r, 0.5, 0.8), 0.12, 'sine', r());
      const l2 = filt(c, 'lowpass', 1400, 0.7); n.connect(b); b.connect(l2); l2.connect(g); g.connect(p); p.connect(m);
    }
    const w = (x.params && x.params.wind != null) ? x.params.wind : 0.5;
    return loopHandle(c, G, m, 0.3 + 0.5 * w, { setters: { wind: (v, at, rr) => m.gain.setTargetAtTime(0.3 + 0.5 * v, at, rr) } });
  },
  'amb.wind.trees': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x), am = gain(c, 0.6); am.connect(m);
    stereoNoise(c, G, 'pink', (() => { const h = filt(c, 'highpass', 2000, 0.7), l = filt(c, 'lowpass', 6500, 0.7); h.connect(l); l.connect(am); return h; })(), 0.7, r);
    G.lfo(am.gain, 7, 0.25); G.lfo(am.gain, 0.21, 0.25);
    return loopHandle(c, G, m, 0.45);
  },
  'amb.wind.pines': (c, o, t, x) => { const { G, m } = bed(c, o, t); const a = noiseBand(c, G, 'pink', m, 'bandpass', 500, 0.8, 0.8, rnd(x)); G.lfo(a.g.gain, 0.08, 0.35); G.lfo(a.b.frequency, 0.05, 120); return loopHandle(c, G, m, 0.45); },
  'amb.water.lake_lap': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    noiseBand(c, G, 'brown', m, 'lowpass', 600, 0.7, 0.35, r);
    const sch = eventScheduler(t, 1.5, 4, r, (tt) => { const p = pan(c, R(r, -0.6, 0.6)); p.connect(m); sweep(c, p, tt, { type: 'brown', pts: [[0, 250], [0.3, R(r, 600, 1100)], [1, 300]], q: 1.2, dur: R(r, 0.25, 0.45), g: R(r, 0.6, 1.1), peakAt: 0.25, rng: r }); });
    return loopHandle(c, G, m, 0.4, { schedule: sch });
  },
  'amb.water.river': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    const a = noiseBand(c, G, 'pink', m, 'bandpass', 900, 1, 0.8, r), b = noiseBand(c, G, 'pink', m, 'bandpass', 1800, 1.2, 0.5, r);
    G.lfo(a.g.gain, 5.3, 0.2); G.lfo(b.g.gain, 8.7, 0.15); G.lfo(a.b.frequency, 1.3, 120);
    return loopHandle(c, G, m, 0.45);
  },
  'amb.water.ocean_waves': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    noiseBand(c, G, 'brown', m, 'lowpass', 400, 0.7, 0.25, r); // continuous low wash
    const harbor = x.params && x.params.harbor;
    const sch = eventScheduler(t, harbor ? 4 : 7, harbor ? 6 : 11, r, (tt) => {
      const P = harbor ? R(r, 4, 6) : R(r, 7, 11), p = pan(c, R(r, -0.5, 0.5)); p.connect(m);
      const n = noiseSrc(c, 'brown', tt, { rng: r }), w = noiseSrc(c, 'white', tt, { rng: r });
      const lp = filt(c, 'lowpass', 300, 0.6), lp2 = filt(c, 'lowpass', 2500, 0.7), e = gain(c, 0), hs = filt(c, 'bandpass', 3000, 0.8), hl = filt(c, 'lowpass', 6000, 0.7), he = gain(c, 0);
      n.connect(lp); lp.connect(lp2); lp2.connect(e); e.connect(p); w.connect(hs); hs.connect(hl); hl.connect(he); he.connect(p);
      // approach (rise, darker) -> break (bright peak) -> hiss retreat
      lp.frequency.setValueAtTime(300, tt); lp.frequency.exponentialRampToValueAtTime(3500, tt + P * 0.4); lp.frequency.exponentialRampToValueAtTime(700, tt + P * 0.8);
      const L = harbor ? 0.5 : 1.0;
      e.gain.setValueAtTime(0, tt); e.gain.linearRampToValueAtTime(1.0 * L, tt + P * 0.4); e.gain.linearRampToValueAtTime(0.35 * L, tt + P * 0.6); e.gain.linearRampToValueAtTime(0, tt + P);
      he.gain.setValueAtTime(0, tt + P * 0.35); he.gain.linearRampToValueAtTime(0.18 * L, tt + P * 0.45); he.gain.linearRampToValueAtTime(0, tt + P * 0.95);
      n.stop(tt + P + 0.1); w.stop(tt + P + 0.1);
    });
    return loopHandle(c, G, m, 0.45, { schedule: sch });
  },
  'amb.water.harbor': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    noiseBand(c, G, 'pink', m, 'lowpass', 800, 0.7, 0.35, r);
    const sch = eventScheduler(t, 0.6, 2.5, r, (tt) => { const p = pan(c, R(r, -0.7, 0.7)); p.connect(m); knock(c, p, tt, [[R(r, 160, 220), 0.12, 0.5], [R(r, 320, 380), 0.08, 0.3]], R(r, 0.4, 0.8), 0.2, 700); burst(c, p, tt, { type: 'pink', f: 600, q: 1, d: 0.15, g: 0.3, rng: r }); });
    return loopHandle(c, G, m, 0.4, { schedule: sch });
  },
  'amb.rain.light': (c, o, t, x) => rain(c, o, t, x, 350, 0.55),
  'amb.rain.heavy': (c, o, t, x) => rain(c, o, t, x, 1600, 0.5),
  'amb.night.crickets': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    [4200, 4500, 4800].forEach((f, i) => {
      const s = G.osc('sine', f + R(r, -40, 40)), g1 = gain(c, 0), g2 = gain(c, 0), p = pan(c, [-0.6, 0.1, 0.7][i]);
      pulseGate(c, G, g1.gain, R(r, 16, 22), 0.4); pulseGate(c, G, g2.gain, R(r, 0.7, 1.6), 0.55);
      s.connect(g1); g1.connect(g2); g2.connect(p); p.connect(m);
    });
    return loopHandle(c, G, m, 0.3);
  },
  'amb.night.frogs': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    noiseBand(c, G, 'brown', m, 'lowpass', 300, 0.7, 0.05, r);
    const call = (tt, pz, f0) => { const p = pan(c, pz); p.connect(m); return formantVoice(c, p, tt, { f0, pitch: [[0.25, f0 * 0.85]], formants: [[650, 4, 1], [1400, 6, 0.4]], env: [[0.02, 1], [0.2, 0.7], [0.08, 0]], rough: R(r, 22, 30), roughDepth: 0.9, gain: 1.8 }); };
    const sch = eventScheduler(t, 0.5, 1.8, r, (tt) => { const e = call(tt, -0.5, R(r, 140, 190)); if (r() < 0.7) call(e + R(r, 0.1, 0.4), 0.5, R(r, 120, 170)); });
    return loopHandle(c, G, m, 1.0, { schedule: sch });
  },
  'amb.forest.day': (c, o, t, x) => { const { G, m } = bed(c, o, t), r = rnd(x); const a = noiseBand(c, G, 'white', m, 'bandpass', 1800, 12, 1.2, r), b = noiseBand(c, G, 'white', m, 'bandpass', 3200, 15, 0.9, r); G.lfo(a.g.gain, 0.17, 0.6); G.lfo(b.g.gain, 0.23, 0.5); G.lfo(a.b.frequency, 3, 60); return loopHandle(c, G, m, 0.25); },
  'amb.interior.room': (c, o, t, x) => { const { G, m } = bed(c, o, t); noiseBand(c, G, 'brown', m, 'lowpass', 300, 0.7, 0.03, rnd(x)); for (const [f, g] of [[50, 0.008], [100, 0.006]]) { const s = G.osc('sine', f), sg = gain(c, g); s.connect(sg); sg.connect(m); } return loopHandle(c, G, m, 1.0); },
  'amb.interior.diner': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    const tx = G.add(textureSrc(c, 'crackle', 700, t, { rng: r })), hf = filt(c, 'bandpass', 3000, 0.8), hl = filt(c, 'lowpass', 5000, 0.7), tg = gain(c, 0.12); tx.connect(hf); hf.connect(hl); hl.connect(tg); tg.connect(m);
    noiseBand(c, G, 'pink', m, 'bandpass', 300, 1, 0.5, r); const h = G.osc('sine', 120), hg = gain(c, 0.05); h.connect(hg); hg.connect(m);
    const cr = noiseBand(c, G, 'pink', m, 'lowpass', 500, 0.7, 0.6, r); G.lfo(cr.g.gain, 4.1, 0.25); G.lfo(cr.g.gain, 0.3, 0.2);
    return loopHandle(c, G, m, 0.4);
  },
  /** params: speed m/s */
  'amb.interior.vehicle': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    const rum = noiseBand(c, G, 'brown', m, 'lowpass', 150, 0.8, 1, r), wh = noiseBand(c, G, 'pink', m, 'bandpass', 900, 0.8, 0.2, r);
    const set = (v, at, rr) => { rum.g.gain.setTargetAtTime(0.4 + Math.min(1, v / 30) * 0.8, at, rr); wh.g.gain.setTargetAtTime(Math.min(1, (v * v) / 900) * 0.35, at, rr); };
    set((x.params && x.params.speed) != null ? x.params.speed : 15, t, 0.01);
    return loopHandle(c, G, m, 0.45, { setters: { speed: set } });
  },
  'amb.boat.hull': (c, o, t, x) => {
    const { G, m } = bed(c, o, t), r = rnd(x);
    const rush = noiseBand(c, G, 'pink', m, 'bandpass', 700, 0.9, 0.9, r); G.lfo(rush.g.gain, 0.4, 0.2);
    const sch = eventScheduler(t, 0.7, 2.2, r, (tt) => { knock(c, m, tt, [[R(r, 80, 110), 0.15, 0.6], [R(r, 180, 230), 0.08, 0.3]], R(r, 0.4, 0.8), 0.3, 600); burst(c, m, tt, { type: 'pink', f: 1500, q: 0.8, d: 0.2, g: 0.15, rng: r }); });
    const sp = (x.params && x.params.speed) != null ? x.params.speed : 6;
    const lv = (v) => 0.25 + Math.min(1, v / 12) * 0.25;
    return loopHandle(c, G, m, lv(sp), { schedule: sch, setters: { speed: (v, at, rr) => m.gain.setTargetAtTime(lv(v), at, rr) } });
  },
};
function rain(c, o, t, x, density, level) {
  const { G, m } = bed(c, o, t), r = rnd(x);
  const lp = filt(c, 'lowpass', 16000, 0.5); lp.connect(m);
  for (const pz of [-0.6, 0.6]) { const tx = G.add(textureSrc(c, 'ticks', density, t, { rng: r, seed: pz > 0 ? 7 : 3 })), hp = filt(c, 'highpass', 1500, 0.7), tl = filt(c, 'lowpass', 6000, 0.7), p = pan(c, pz), g = gain(c, 0.8); tx.connect(hp); hp.connect(tl); tl.connect(g); g.connect(p); p.connect(lp); }
  noiseBand(c, G, 'pink', lp, 'bandpass', 3500, 0.7, density > 1000 ? 0.7 : 0.4, r);
  // params: interior 0/1 (roof drumming: dark lowpass)
  return loopHandle(c, G, m, level, { setters: { interior: (v, at) => lp.frequency.setTargetAtTime(v ? 900 : 16000, at, 0.3) } });
}

// ---- emitters --------------------------------------------------------------------------------------------------------------
const EMIT = {
  'amb.emit.fountain': (c, o, t, x) => { const { G, m } = bed(c, o, t), r = rnd(x); noiseBand(c, G, 'white', m, 'bandpass', 3000, 0.7, 0.8, r); noiseBand(c, G, 'pink', m, 'bandpass', 900, 0.8, 0.4, r);
    const sch = eventScheduler(t, 0.12, 0.4, r, (tt) => toneGrains(c, m, tt, { n: 1, span: 0.01, f: [1500, 3000], sweep: 1.8, dur: [0.02, 0.04], gain: 0.2, rng: r })); return loopHandle(c, G, m, 0.4, { schedule: sch }); },
  'amb.emit.neon_buzz': (c, o, t, x) => { const { G, m } = bed(c, o, t); const s = G.osc('sawtooth', 120), b = filt(c, 'bandpass', 1200, 2), g = gain(c, 0.7); s.connect(b); b.connect(g); g.connect(m); G.lfo(g.gain, 11.3, 0.15); G.lfo(g.gain, 0.7, 0.2, 'square'); void x; return loopHandle(c, G, m, 0.4); },
  'amb.emit.generator': (c, o, t, x) => createEngine(c, o, t, ENGINES['eng.generator'], { rpm: 3600, load: 0.4, gain: 0.8, ...(x.params || {}) }),
  'amb.emit.rigging': (c, o, t, x) => { const { G, m } = bed(c, o, t), r = rnd(x); noiseBand(c, G, 'pink', m, 'bandpass', 900, 0.8, 0.1, r);
    const sch = eventScheduler(t, 0.4, 1.6, r, (tt) => { if (r() < 0.7) { const f = R(r, 1800, 3500); knock(c, m, tt, [[f, 0.25, 0.4], [f * 1.7, 0.15, 0.25]], R(r, 0.5, 0.9), 0.1, 4000); } else { const f = R(r, 350, 550); tone(c, m, tt, { type: 'sawtooth', f, f1: f * 1.6, lp: 1500, a: 0.15, hold: 0.25, d: 0.2, g: 0.35 }); } });
    return loopHandle(c, G, m, 0.8, { schedule: sch }); },
  'amb.emit.flag': (c, o, t, x) => { const { G, m } = bed(c, o, t), r = rnd(x); const a = noiseBand(c, G, 'pink', m, 'bandpass', 650, 1.2, 0.8, r); G.lfo(a.g.gain, 15, 0.5); G.lfo(a.g.gain, 0.3, 0.3); G.lfo(a.b.frequency, 0.4, 300); return loopHandle(c, G, m, 0.5); },
  'amb.emit.campfire': (c, o, t, x) => fireLoop(c, o, t, x, 0.55),
  'amb.emit.fireplace': (c, o, t, x) => fireLoop(c, o, t, x, 0.45),
  'amb.emit.sawmill': (c, o, t, x) => { const { G, m } = bed(c, o, t), r = rnd(x); const s = G.osc('sawtooth', 900), b = filt(c, 'bandpass', 1800, 3), g = gain(c, 0.4); G.lfo(s.frequency, 0.12, 120); s.connect(b); b.connect(g); g.connect(m);
    const c2 = noiseBand(c, G, 'white', m, 'bandpass', 1500, 2, 0, r); pulseGate(c, G, c2.g.gain, 12, 0.25, 0.5); noiseBand(c, G, 'brown', m, 'lowpass', 200, 0.7, 0.4, r); return loopHandle(c, G, m, 0.45); },
  'amb.emit.weir': (c, o, t, x) => { const { G, m } = bed(c, o, t), r = rnd(x); noiseBand(c, G, 'pink', m, 'lowpass', 2500, 0.5, 0.9, r); const a = noiseBand(c, G, 'white', m, 'bandpass', 1500, 0.5, 0.5, r); G.lfo(a.g.gain, 3.7, 0.1); return loopHandle(c, G, m, 0.5); },
  'amb.emit.buoy_bell': (c, o, t, x) => { const { G, m } = bed(c, o, t), r = rnd(x); noiseBand(c, G, 'pink', m, 'lowpass', 500, 0.7, 0.05, r);
    const sch = eventScheduler(t, 3, 7, r, (tt) => { fm(c, m, tt, { f: 620, ratio: 2.76, index: 1.2, decay: 2.5, gain: 0.35 }); modal(c, m, tt, { modes: [[620, 2.5, 0.2], [1240 * 1.02, 1.6, 0.12], [1710, 1.2, 0.08]], gain: 0.7, click: 0.1, clickF: 2500 }); });
    return loopHandle(c, G, m, 0.6, { schedule: sch }); },
  'amb.emit.lighthouse_horn': (c, o, t, x) => { const { G, m } = bed(c, o, t); let next = t + 0.5;
    const sch = (t0, t1) => { while (next < t1) { if (next >= t0 - 0.05) { tone(c, m, next, { type: 'sawtooth', f: 98, lp: 500, a: 0.15, hold: 1.4, d: 0.5, g: 0.5 }); tone(c, m, next + 2.2, { type: 'sawtooth', f: 82, lp: 500, a: 0.15, hold: 1.6, d: 0.6, g: 0.5 }); } next += 30; } };
    void x; return loopHandle(c, G, m, 0.7, { schedule: sch }); },
  'amb.emit.crane': (c, o, t, x) => { const { G, m } = bed(c, o, t), r = rnd(x); const s = G.osc('sine', 600), s2 = G.osc('sine', 1200), g = gain(c, 0.2), g2 = gain(c, 0.08); G.lfo(s.frequency, 0.07, 40); s.connect(g); s2.connect(g2); g.connect(m); g2.connect(m);
    noiseBand(c, G, 'brown', m, 'lowpass', 250, 0.7, 0.3, r);
    const sch = eventScheduler(t, 1.2, 4, r, (tt) => knock(c, m, tt, [[R(r, 300, 500), 0.3, 0.3], [R(r, 900, 1300), 0.2, 0.2], [R(r, 2000, 2600), 0.12, 0.1]], 0.6, 0.4, 2000));
    return loopHandle(c, G, m, 0.5, { schedule: sch }); },
  'amb.emit.pa_station': (c, o, t, x) => { const { G, m } = bed(c, o, t), r = rnd(x); const pa = filt(c, 'bandpass', 1200, 0.6); pa.connect(m); noiseBand(c, G, 'pink', m, 'lowpass', 400, 0.7, 0.06, r);
    const sch = eventScheduler(t, 4, 9, r, (tt) => { let e = tt; for (let i = 0; i < 6; i++) e = formantVoice(c, pa, e + 0.05, { f0: R(r, 160, 220), pitch: [[0.2, R(r, 150, 230)], [0.2, R(r, 140, 200)]], formants: [[R(r, 500, 800), 4, 1], [R(r, 1100, 1800), 5, 0.6], [2600, 8, 0.3]], env: [[0.03, 1], [0.15, 0.5], [0.1, 0.9], [0.15, 0]], rough: 5, roughDepth: 0.5, gain: 2.2 }); });
    return loopHandle(c, G, m, 0.6, { schedule: sch }); },
  'amb.emit.dock_creak': (c, o, t, x) => { const { G, m } = bed(c, o, t), r = rnd(x); noiseBand(c, G, 'brown', m, 'lowpass', 300, 0.7, 0.05, r);
    const sch = eventScheduler(t, 1.0, 3.5, r, (tt) => { const f = R(r, 250, 500); tone(c, m, tt, { type: 'sawtooth', f, f1: f * R(r, 1.3, 1.8), lp: 1400, a: R(r, 0.1, 0.25), hold: R(r, 0.2, 0.5), d: 0.2, g: 0.25 }); });
    return loopHandle(c, G, m, 0.7, { schedule: sch }); },
  'amb.emit.power_hum': (c, o, t, x) => { const { G, m } = bed(c, o, t); for (const [f, g] of [[60, 0.4], [120, 0.25], [180, 0.12], [240, 0.06]]) { const s = G.osc('sine', f), sg = gain(c, g); s.connect(sg); sg.connect(m); } void x; return loopHandle(c, G, m, 0.25); },
};

// ---- scheduler one-shots ---------------------------------------------------------------------------------------------------
const gullCry = (c, o, t, f) => formantVoice(c, o, t, { f0: f, pitch: [[0.08, f * 1.1], [0.25, f * 0.65]], formants: [[1500, 3, 1], [2600, 4, 0.6], [900, 3, 0.3]], noise: 0.15, env: [[0.02, 1], [0.2, 0.7], [0.12, 0]], gain: 0.55 });
const ONCE = {
  'amb.once.bird_song_a': (c, o, t, x) => { const r = rnd(x), f = R(r, 3200, 4200), L = []; for (let i = 0; i < 12; i++) L.push([i * 0.07, { f0: f * (1 - i * 0.012), pts: [[0.03, f * 0.8 * (1 - i * 0.012)]], dur: 0.05, gain: 0.4 }]); return phrase(c, o, t, L); },
  'amb.once.bird_song_b': (c, o, t, x) => { const r = rnd(x), f = R(r, 2600, 3100); return phrase(c, o, t, [[0, { f0: f, pts: [[0.15, f * 1.02]], dur: 0.22, gain: 0.45 }], [0.32, { f0: f * 0.8, pts: [[0.2, f * 0.78]], dur: 0.28, gain: 0.45 }], [0.75, { f0: f, pts: [[0.12, f * 1.02]], dur: 0.18, gain: 0.3 }]]); },
  'amb.once.bird_song_c': (c, o, t, x) => { const r = rnd(x), f = R(r, 3000, 3800); return chirp(c, o, t, { f0: f, pts: [[0.3, f * 1.2], [0.3, f * 0.9], [0.3, f * 1.15], [0.3, f]], dur: 1.3, gain: 0.4, am: { rate: 28, depth: 0.6 } }); },
  'amb.once.gull': (c, o, t, x) => { const r = rnd(x), n = 2 + Math.floor(r() * 3); let e = t; for (let i = 0; i < n; i++) e = Math.max(e, gullCry(c, o, t + i * 0.45, R(r, 700, 850) * (1 - i * 0.05))); return e; },
  'amb.once.crow': (c, o, t, x) => { const r = rnd(x), n = 1 + Math.floor(r() * 3); let e = t; for (let i = 0; i < n; i++) e = Math.max(e, formantVoice(c, o, t + i * 0.55, { f0: R(r, 450, 550), pitch: [[0.3, 380]], formants: [[1200, 3, 1], [2000, 4, 0.5]], noise: 0.25, rough: 60, roughDepth: 0.8, env: [[0.03, 1], [0.25, 0.6], [0.1, 0]], gain: 0.6 })); return e; },
  'amb.once.loon': (c, o, t, x) => { const r = rnd(x), d = c.createDelay(1), fb = gain(c, 0.35), wet = gain(c, 0.5), f = R(r, 560, 640); d.delayTime.value = 0.33; d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(o);
    const e = chirp(c, o, t, { f0: f, pts: [[0.6, f * 1.5], [0.8, f * 1.5], [0.5, f * 1.25], [0.6, f * 1.3]], dur: 2.6, gain: 0.45, am: { rate: 5, depth: 0.2 }, a: 0.3 });
    chirp(c, d, t, { f0: f, pts: [[0.6, f * 1.5], [0.8, f * 1.5], [0.5, f * 1.25], [0.6, f * 1.3]], dur: 2.6, gain: 0.3, a: 0.3 }); return e + 1.5; },
  'amb.once.owl': (c, o, t, x) => { const r = rnd(x), f = R(r, 360, 400); let e = t; for (const [off, d] of [[0, 0.35], [0.6, 0.25], [0.95, 0.55]]) e = Math.max(e, chirp(c, o, t + off, { f0: f, pts: [[d, f * 0.9]], dur: d, gain: 0.5, a: 0.08 })); return Math.max(e, burst(c, o, t, { type: 'pink', f: 500, q: 1, a: 0.1, d: 0.3, g: 0.05, rng: r })); },
  'amb.once.woodpecker': (c, o, t, x) => { const r = rnd(x), f = R(r, 900, 1300); let e = t; for (let i = 0; i < 14; i++) e = Math.max(e, knock(c, o, t + i * 0.055, [[f, 0.05, 0.4], [f * 2.3, 0.03, 0.2]], 0.7 * (1 - i * 0.03), 0.5, 2500)); return e; },
  'amb.once.dog_bark': (c, o, t, x) => { const r = rnd(x); let e = t; for (let i = 0; i < 2; i++) e = Math.max(e, formantVoice(c, o, t + i * R(r, 0.3, 0.45), { f0: R(r, 380, 460), pitch: [[0.12, 260]], formants: [[700, 3, 1], [1500, 4, 0.6]], noise: 0.4, rough: 40, roughDepth: 0.5, env: [[0.01, 1], [0.08, 0.6], [0.06, 0]], gain: 0.6 })); return e; },
  'amb.once.car_horn': (c, o, t) => Math.max(tone(c, o, t, { type: 'square', f: 400, lp: 1800, a: 0.02, hold: 0.5, d: 0.08, g: 0.25 }), tone(c, o, t, { type: 'square', f: 506, lp: 1800, a: 0.02, hold: 0.5, d: 0.08, g: 0.25 })),
  'amb.once.siren': (c, o, t) => { const s = osc(c, 'sawtooth', 650, t), s2 = osc(c, 'sawtooth', 660, t), lp = filt(c, 'lowpass', 1100, 1.0), e = gain(c, 0); for (const n of [s, s2]) { for (let i = 0; i < 3; i++) { n.frequency.linearRampToValueAtTime(1350, t + i + 0.5); n.frequency.linearRampToValueAtTime(650, t + i + 1); } n.connect(lp); }
    lp.connect(e); e.connect(o); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.25, t + 0.3); e.gain.setValueAtTime(0.25, t + 2.6); e.gain.linearRampToValueAtTime(0, t + 3); s.stop(t + 3.1); s2.stop(t + 3.1); return t + 3; },
  'amb.once.boat_horn': (c, o, t) => Math.max(tone(c, o, t, { type: 'sawtooth', f: 110, lp: 600, a: 0.15, hold: 2.0, d: 0.6, g: 0.35 }), tone(c, o, t, { type: 'sawtooth', f: 165, lp: 600, a: 0.15, hold: 2.0, d: 0.6, g: 0.22 })),
  'amb.once.chainsaw_far': (c, o, t) => { const lp = filt(c, 'lowpass', 1200, 0.7); lp.connect(o); const e = createEngine(c, lp, t, ENGINES['eng.chainsaw'], { rpm: 4000, load: 0.3, gain: 0.7 }); void e; e.stop(t + 2.6, 0.4); return t + 3.1; },
  'amb.once.thunder': (c, o, t, x) => { const r = rnd(x); let e = burst(c, o, t, { type: 'brown', ftype: 'lowpass', f: 3000, q: 0.5, a: 0.02, d: 5.0, g: 0.9, f1: 150, sweep: 3, rng: r }); for (let i = 0; i < 3; i++) e = Math.max(e, burst(c, o, t + R(r, 0.5, 3), { type: 'brown', ftype: 'lowpass', f: 600, q: 0.6, a: 0.2, d: R(r, 1.5, 2.5), g: R(r, 0.4, 0.7), rng: r })); return e; },
  'amb.once.fish_jump': (c, o, t, x) => splash(c, o, t, { size: 0.3, g: 0.6, rng: rnd(x) }),
  'amb.once.train_far': (c, o, t, x) => Math.max(tone(c, o, t + 0.5, { type: 'sawtooth', f: 220, lp: 700, a: 0.2, hold: 1.4, d: 0.6, g: 0.25 }), tone(c, o, t + 0.5, { type: 'sawtooth', f: 277, lp: 700, a: 0.2, hold: 1.4, d: 0.6, g: 0.18 }),
    burst(c, o, t, { type: 'brown', ftype: 'lowpass', f: 140, q: 0.7, a: 1.5, d: 3.5, g: 0.8, rng: rnd(x) })),
};
export const AMBIENCE = { ...BEDS, ...EMIT, ...ONCE };
void grains; void splash;
