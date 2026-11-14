// Vehicles and boats (Annex E 6.3, 6.4): engines (synth/engine.js), starts/stops, doors, tyres, skid, wind, crashes, boat
// wake and bumps, plus the cheap P1 cues. Loops return handles; params documented per loop.
import { burst, sweep, tone, knock, grains, rnd, R, loopHandle, graph, gain, filt, noiseSrc, osc, stereoNoise, eventScheduler, modal } from './kit.js';
import { createEngine, ENGINES } from '../synth/engine.js';
import { textureSrc } from '../synth/grain.js';
import { shaper } from '../synth/shaper.js';

const engines = {};
for (const id of Object.keys(ENGINES)) if (id !== 'eng.generator') engines[id] = (c, o, t, x) => createEngine(c, o, t, ENGINES[id], x.params || {});

const latch = (c, o, t, g = 0.6) => knock(c, o, t, [[1900, 0.04, 0.3], [3200, 0.03, 0.2], [700, 0.05, 0.2]], g, 0.5, 2500);
const seal = (c, o, t, x) => Math.max(knock(c, o, t, [[70, 0.2, 0.55], [140, 0.12, 0.3], [330, 0.06, 0.12]], 0.85, 0.2, 600), burst(c, o, t, { type: 'pink', ftype: 'lowpass', f: 700, d: 0.1, g: 0.3, rng: rnd(x) }));
const horn = (c, o, t, f1, f2, d, lp = 2500, g = 0.25) => Math.max(tone(c, o, t, { type: 'square', f: f1, lp, a: 0.02, hold: d, d: 0.08, g }), tone(c, o, t, { type: 'square', f: f2, lp, a: 0.02, hold: d, d: 0.08, g }));
function crash(c, o, t, x, heavy) {
  const r = rnd(x);
  const modes = heavy ? [[230, 0.5, 0.25], [470, 0.4, 0.2], [810, 0.35, 0.18], [1290, 0.3, 0.15], [2140, 0.25, 0.12], [3400, 0.2, 0.08]] : [[310, 0.25, 0.25], [720, 0.2, 0.2], [1210, 0.15, 0.15], [2080, 0.12, 0.1]];
  let end = Math.max(knock(c, o, t, modes, heavy ? 0.55 : 0.6, 0.6, 1500), burst(c, o, t, { type: 'white', f: 1200, q: 0.6, d: heavy ? 0.35 : 0.15, g: heavy ? 0.5 : 0.35, rng: r }), knock(c, o, t, [[60, heavy ? 0.4 : 0.2, 0.6]], 0.8, 0));
  if (heavy) end = Math.max(end, grains(c, o, t + 0.05, { n: 30, span: 0.9, f: [4000, 8000], q: 6, gain: 0.2, dur: [0.02, 0.08], rng: r, ramp: 1.6 }));
  return end;
}

export const VEHICLES = {
  ...engines,
  'sfx.veh.start': (c, o, t, x) => {
    // starter whirr (pulsed saw) -> catch -> idle tail
    const s = osc(c, 'sawtooth', 160, t), pg = gain(c, 0), e = gain(c, 0), lp = filt(c, 'lowpass', 1400, 1);
    const pul = osc(c, 'sine', 11, t), ps = shaper(c, 'uni'); pul.connect(ps); ps.connect(pg.gain);
    s.connect(pg); pg.connect(lp); lp.connect(e); e.connect(o);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.35, t + 0.03); e.gain.setValueAtTime(0.35, t + 0.65); e.gain.linearRampToValueAtTime(0, t + 0.75);
    s.stop(t + 0.8); pul.stop(t + 0.8);
    // catch: a short revving burst of the car engine model, then fade (the live idle loop is started by the caller)
    createEngine(c, o, t + 0.65, ENGINES['eng.car_i4'], { rpm: 2600, load: 0.6, gain: 0.9 }).stop(t + 1.2, 0.3);
    void x; return t + 1.6;
  },
  'sfx.veh.stop': (c, o, t, x) => {
    const s = osc(c, 'sawtooth', 26, t), e = gain(c, 0), lp = filt(c, 'lowpass', 400, 1.2);
    s.frequency.exponentialRampToValueAtTime(8, t + 0.7);
    s.connect(lp); lp.connect(e); e.connect(o);
    e.gain.setValueAtTime(0.6, t); e.gain.setTargetAtTime(0, t + 0.2, 0.12);
    s.stop(t + 1); return Math.max(t + 0.9, knock(c, o, t + 0.55, [[60, 0.2, 0.5], [140, 0.1, 0.2]], 0.6, 0.1, 500), burst(c, o, t, { type: 'brown', ftype: 'lowpass', f: 300, d: 0.5, g: 0.3, rng: rnd(x) }));
  },
  'sfx.veh.door_open': (c, o, t, x) => Math.max(latch(c, o, t), burst(c, o, t + 0.02, { type: 'pink', f: 900, d: 0.15, g: 0.2, rng: rnd(x) })),
  'sfx.veh.door_close': (c, o, t, x) => Math.max(seal(c, o, t, x), latch(c, o, t + 0.01, 0.35)),
  'sfx.veh.horn_car': (c, o, t) => horn(c, o, t, 420, 525, 0.45),
  'sfx.veh.horn_truck': (c, o, t) => horn(c, o, t, 165, 207, 0.7, 1200, 0.24),
  'sfx.veh.horn_moto': (c, o, t) => horn(c, o, t, 600, 760, 0.35, 3000),
  'sfx.veh.suspension_thump': (c, o, t, x) => Math.max(knock(c, o, t, [[60, 0.25, 0.6], [110, 0.15, 0.3]], 0.9, 0.2, 500), grains(c, o, t + 0.02, { n: 6, span: 0.15, f: [600, 2000], q: 3, gain: 0.15, dur: [0.01, 0.03], rng: rnd(x) })),
  'sfx.veh.crash_light': (c, o, t, x) => crash(c, o, t, x, false),
  'sfx.veh.crash_heavy': (c, o, t, x) => crash(c, o, t, x, true),
  'sfx.veh.indicator': (c, o, t) => knock(c, o, t, [[1400, 0.02, 0.3], [2900, 0.015, 0.2]], 0.8, 0.6, 3000),
  'sfx.veh.reverse_beep': (c, o, t) => tone(c, o, t, { f: 1000, a: 0.005, hold: 0.35, d: 0.04, g: 0.35 }),
  'sfx.veh.handbrake': (c, o, t, x) => { let e = t; for (let i = 0; i < 6; i++) e = Math.max(e, burst(c, o, t + i * 0.05, { f: 1800, q: 3, d: 0.015, g: 2.2, rng: rnd(x) })); return e; },
  'sfx.veh.gear_shift': (c, o, t) => knock(c, o, t, [[180, 0.08, 0.5], [520, 0.05, 0.3], [1300, 0.03, 0.15]], 0.7, 0.3, 1500),
  'sfx.veh.fuel_cap': (c, o, t) => knock(c, o, t, [[900, 0.05, 0.3], [2100, 0.04, 0.2]], 0.8, 0.5, 2500),
  'sfx.veh.fuel_done': (c, o, t) => knock(c, o, t, [[300, 0.1, 0.5], [800, 0.06, 0.25]], 0.8, 0.3, 1200),
  'sfx.veh.air_brake': (c, o, t, x) => sweep(c, o, t, { type: 'pink', pts: [[0, 3500], [1, 700]], q: 0.7, dur: 1.0, g: 0.9, peakAt: 0.05, rng: rnd(x) }),
  'sfx.veh.taxi_meter': (c, o, t) => knock(c, o, t, [[2500, 0.03, 0.3], [4100, 0.02, 0.2]], 0.8, 0.5, 3000),
  'sfx.veh.passenger_in': (c, o, t, x) => Math.max(seal(c, o, t + 0.3, x), burst(c, o, t, { type: 'pink', f: 600, d: 0.3, a: 0.1, g: 0.2, rng: rnd(x) })),
  'sfx.veh.passenger_out': (c, o, t, x) => Math.max(seal(c, o, t, x), burst(c, o, t + 0.15, { type: 'pink', f: 600, d: 0.3, a: 0.1, g: 0.2, rng: rnd(x) })),
  'sfx.veh.pallet_set': (c, o, t) => knock(c, o, t, [[120, 0.2, 0.5], [260, 0.12, 0.3], [600, 0.06, 0.15]], 0.8, 0.3, 1200),
  'sfx.veh.pallet_drop': (c, o, t, x) => Math.max(knock(c, o, t, [[100, 0.3, 0.5], [230, 0.2, 0.3], [520, 0.1, 0.15]], 0.85, 0.5, 1500), grains(c, o, t, { n: 10, span: 0.3, f: [500, 3000], q: 2, gain: 0.2, dur: [0.01, 0.04], rng: rnd(x) })),
  'sfx.veh.loader_grapple': (c, o, t) => Math.max(tone(c, o, t, { type: 'sawtooth', f: 140, f1: 210, lp: 900, a: 0.1, hold: 0.6, d: 0.3, g: 0.25 }), knock(c, o, t + 0.8, [[200, 0.2, 0.5], [450, 0.1, 0.3]], 0.6, 0.4, 1500)),
  'sfx.veh.log_drop': (c, o, t) => Math.max(knock(c, o, t, [[55, 0.6, 0.5], [120, 0.4, 0.3], [260, 0.2, 0.2]], 0.9, 0.3, 800), knock(c, o, t + 0.15, [[70, 0.4, 0.4], [150, 0.2, 0.2]], 0.6, 0.2, 800)),
  'sfx.veh.log_roll': (c, o, t, x) => { const r = rnd(x); let e = t; for (let i = 0; i < 5; i++) e = Math.max(e, knock(c, o, t + i * 0.17, [[R(r, 70, 110), 0.25, 0.5], [R(r, 180, 260), 0.15, 0.25]], 0.6, 0.2, 800)); return e; },
  // loops ---------------------------------------------------------------------------------------------------------------
  /** params: speed m/s (default 15), surface 'asphalt'|'cobble'|'gravel'|'wet' */
  'sfx.veh.tyre_roll': (c, o, t, x) => {
    const G = graph(c, t), m = gain(c, 0), p = x.params || {}; m.connect(o);
    const surf = p.surface || 'asphalt';
    const hiss = filt(c, 'bandpass', surf === 'wet' ? 3500 : 1400, 0.8), hg = gain(c, 0.5); hiss.connect(hg); hg.connect(m);
    G.add(noiseSrc(c, 'pink', t, { rng: rnd(x) })).connect(hiss);
    const rum = filt(c, 'lowpass', 220, 0.9), rg = gain(c, surf === 'cobble' ? 1.2 : 0.45); rum.connect(rg); rg.connect(m);
    G.add(noiseSrc(c, 'brown', t, { rng: rnd(x) })).connect(rum);
    if (surf === 'cobble') G.lfo(rg.gain, 9, 0.6, 'square');
    if (surf === 'gravel') { const tx = G.add(textureSrc(c, 'crunch', 200, t, { rng: rnd(x) })); const tg = gain(c, 0.5); tx.connect(tg); tg.connect(m); }
    const lv = (s) => Math.min(1, 0.15 + s / 25) * 0.55;
    const h = loopHandle(c, G, m, lv(p.speed == null ? 15 : p.speed), { setters: { speed: (v, at, r) => { m.gain.setTargetAtTime(lv(v), at, r); hiss.frequency.setTargetAtTime(900 + v * 50, at, r); } } });
    hiss.frequency.value = 900 + (p.speed == null ? 15 : p.speed) * 50; return h;
  },
  /** params: slip 0..1 (default 0.8) */
  'sfx.veh.skid': (c, o, t, x) => {
    const G = graph(c, t), m = gain(c, 0); m.connect(o);
    const n = G.add(noiseSrc(c, 'pink', t, { rng: rnd(x) }));
    for (const [f, q, g] of [[1100, 7, 1.4], [820, 5, 0.9], [1350, 9, 0.7]]) { const b = filt(c, 'bandpass', f, q), bg = gain(c, g); n.connect(b); b.connect(bg); bg.connect(m); }
    const p = x.params || {}; const lv = (s) => 0.9 * Math.min(1, s);
    return loopHandle(c, G, m, lv(p.slip == null ? 0.8 : p.slip), { setters: { slip: (v, at, r) => m.gain.setTargetAtTime(lv(v), at, r) } });
  },
  /** params: speed m/s (default 20). Level by speed squared. */
  'sfx.veh.wind': (c, o, t, x) => {
    const G = graph(c, t), m = gain(c, 0); m.connect(o);
    const b = filt(c, 'bandpass', 700, 0.6); b.connect(m);
    stereoNoise(c, G, 'pink', b, 0.6, rnd(x));
    G.lfo(b.frequency, 0.23, 150);
    const p = x.params || {}; const lv = (s) => Math.min(1, (s * s) / 900) * 0.9;
    return loopHandle(c, G, m, lv(p.speed == null ? 20 : p.speed), { setters: { speed: (v, at, r) => { m.gain.setTargetAtTime(lv(v), at, r); b.frequency.setTargetAtTime(500 + v * 25, at, r); } } });
  },
  'sfx.veh.fuel_pump': (c, o, t, x) => {
    const G = graph(c, t), m = gain(c, 0); m.connect(o);
    const hum = G.osc('sawtooth', 120), hl = filt(c, 'lowpass', 500, 1), hg = gain(c, 0.25); hum.connect(hl); hl.connect(hg); hg.connect(m);
    const n = G.add(noiseSrc(c, 'pink', t, { rng: rnd(x) })), gf = filt(c, 'bandpass', 500, 3), gg = gain(c, 0.5); n.connect(gf); gf.connect(gg); gg.connect(m);
    G.lfo(gf.frequency, 3.1, 150); G.lfo(gg.gain, 5.7, 0.3);
    return loopHandle(c, G, m, 0.5);
  },
  'sfx.veh.forklift_mast': (c, o, t) => {
    const G = graph(c, t), m = gain(c, 0); m.connect(o);
    const w = G.osc('sawtooth', 340), l = filt(c, 'bandpass', 900, 2), g = gain(c, 0.5); w.connect(l); l.connect(g); g.connect(m); G.lfo(w.frequency, 0.4, 15);
    const s = G.osc('sine', 1020), sg = gain(c, 0.15); s.connect(sg); sg.connect(m);
    return loopHandle(c, G, m, 0.45);
  },
  // boats ----------------------------------------------------------------------------------------------------------------
  /** params: speed m/s (default 8) */
  'sfx.boat.wake': (c, o, t, x) => {
    const G = graph(c, t), m = gain(c, 0); m.connect(o);
    const b = filt(c, 'bandpass', 1200, 0.7); b.connect(m);
    stereoNoise(c, G, 'white', b, 0.8, rnd(x));
    const lp = filt(c, 'lowpass', 500, 0.7), lg = gain(c, 0.6); lp.connect(lg); lg.connect(m); G.add(noiseSrc(c, 'brown', t, { rng: rnd(x) })).connect(lp);
    G.lfo(m.gain, 0.37, 0.06);
    const p = x.params || {}; const lv = (s) => Math.min(1, 0.2 + s / 14) * 0.5;
    return loopHandle(c, G, m, lv(p.speed == null ? 8 : p.speed), { setters: { speed: (v, at, r) => { m.gain.setTargetAtTime(lv(v), at, r); b.frequency.setTargetAtTime(600 + v * 120, at, r); } } });
  },
  'sfx.boat.winch': (c, o, t, x) => {
    const G = graph(c, t), m = gain(c, 0); m.connect(o);
    const mo = G.osc('sawtooth', 95), l = filt(c, 'lowpass', 700, 2), g = gain(c, 0.4); mo.connect(l); l.connect(g); g.connect(m); G.lfo(g.gain, 13, 0.15);
    const n = G.add(noiseSrc(c, 'white', t, { rng: rnd(x) })), b = filt(c, 'bandpass', 1500, 1.5), ng = gain(c, 0.25); n.connect(b); b.connect(ng); ng.connect(m);
    return loopHandle(c, G, m, 0.55);
  },
  'sfx.boat.bow_slap': (c, o, t, x) => Math.max(knock(c, o, t, [[85, 0.15, 0.6], [190, 0.08, 0.3]], 0.8, 0.2, 600), burst(c, o, t + 0.02, { type: 'pink', f: 1400, q: 0.8, d: 0.3, g: 0.25, rng: rnd(x) })),
  'sfx.boat.hull_bump': (c, o, t) => knock(c, o, t, [[220, 0.6, 0.35], [540, 0.45, 0.25], [1100, 0.3, 0.15], [90, 0.3, 0.4]], 0.7, 0.3, 1200),
  'sfx.boat.dock_bump': (c, o, t) => knock(c, o, t, [[120, 0.3, 0.5], [260, 0.18, 0.3], [480, 0.08, 0.12]], 0.85, 0.3, 700),
  'sfx.boat.rope_tie': (c, o, t, x) => { const r = rnd(x); let e = t; for (let i = 0; i < 3; i++) { const f = R(r, 300, 450); e = Math.max(e, tone(c, o, t + i * 0.22, { type: 'sawtooth', f, f1: f * 1.5, lp: 1400, a: 0.05, hold: 0.1, d: 0.06, g: 0.35 })); } return e; },
  'sfx.boat.rope_throw': (c, o, t, x) => sweep(c, o, t, { type: 'pink', pts: [[0, 500], [0.5, 1800], [1, 700]], q: 1.2, dur: 0.45, g: 1.1, peakAt: 0.4, rng: rnd(x) }),
  'sfx.boat.cleat': (c, o, t) => knock(c, o, t, [[260, 0.12, 0.45], [780, 0.08, 0.3], [1900, 0.05, 0.15]], 0.8, 0.4, 2000),
  'sfx.boat.oar_stroke': (c, o, t, x) => Math.max(sweep(c, o, t + 0.1, { type: 'pink', pts: [[0, 400], [0.5, 1500], [1, 600]], q: 1.4, dur: 0.6, g: 0.4, peakAt: 0.4, rng: rnd(x) }), knock(c, o, t, [[350, 0.1, 0.4], [900, 0.05, 0.2]], 0.6, 0.3, 1500)),
  'sfx.boat.horn': (c, o, t) => Math.max(tone(c, o, t, { type: 'sawtooth', f: 110, lp: 700, a: 0.08, hold: 1.3, d: 0.4, g: 0.3 }), tone(c, o, t, { type: 'sawtooth', f: 165, lp: 700, a: 0.08, hold: 1.3, d: 0.4, g: 0.2 })),
  'sfx.boat.net_out': (c, o, t, x) => sweep(c, o, t, { type: 'pink', pts: [[0, 700], [1, 1300]], q: 1.2, dur: 1.0, g: 1.0, peakAt: 0.3, rng: rnd(x) }),
  'sfx.boat.net_in': (c, o, t, x) => Math.max(sweep(c, o, t, { type: 'pink', pts: [[0, 1300], [1, 800]], q: 1.2, dur: 1.0, g: 1.0, peakAt: 0.3, rng: rnd(x) }), grains(c, o, t, { n: 16, span: 1.1, f: [800, 3000], q: 3, gain: 0.2, dur: [0.01, 0.05], rng: rnd(x) })),
  'sfx.boat.net_tear': (c, o, t, x) => burst(c, o, t, { type: 'pink', f: 2200, q: 0.8, a: 0.02, d: 0.5, g: 1.2, f1: 1000, sweep: 0.5, rng: rnd(x) }),
};
void modal; void eventScheduler;
