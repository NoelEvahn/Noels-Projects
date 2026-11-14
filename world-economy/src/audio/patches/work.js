// Work environments, tools, trees, fire, weather and world one-shots (Annex E 6.6-6.8). P0 and the cheap P1 cues.
import { burst, sweep, tone, knock, grains, toneGrains, chime, fm, rnd, R, loopHandle, graph, gain, filt, noiseSrc, modal } from './kit.js';
import { textureSrc } from '../synth/grain.js';
import { createEngine, ENGINES } from '../synth/engine.js';
import { shaper } from '../synth/shaper.js';

const box = (c, o, t, x, f = 120, g = 0.8) => Math.max(knock(c, o, t, [[f, 0.12, 0.5], [f * 2.2, 0.07, 0.25]], g, 0.25, 600), burst(c, o, t, { type: 'pink', ftype: 'lowpass', f: 900, d: 0.08, g: 0.3, rng: rnd(x) }));
const ceramic = (c, o, t, p = 1, g = 0.6) => knock(c, o, t, [[1800 * p, 0.35, 0.3], [2900 * p, 0.25, 0.22], [4400 * p, 0.18, 0.15], [6200 * p, 0.12, 0.1]], g, 0.4, 5000);
const can = (c, o, t, p = 1, g = 0.5) => knock(c, o, t, [[900 * p, 0.15, 0.3], [2100 * p, 0.1, 0.2], [3700 * p, 0.07, 0.12]], g, 0.5, 3000);
const clicks = (c, o, t, x, n, gap, f, g = 0.6) => { let e = t; for (let i = 0; i < n; i++) e = Math.max(e, burst(c, o, t + i * gap, { f, q: 2, d: 0.01, g, rng: rnd(x) })); return e; };
const sizzleLoop = (c, o, t, x, density, hp, level, bubble = 0) => {
  const G = graph(c, t), m = gain(c, 0); m.connect(o);
  const tx = G.add(textureSrc(c, 'crackle', density, t, { rng: rnd(x) })), f = filt(c, 'highpass', hp, 0.7), fl = filt(c, 'lowpass', hp * 2.2, 0.7), fl2 = filt(c, 'lowpass', hp * 2.5, 0.7), tg = gain(c, 1.2); tx.connect(f); f.connect(fl); fl.connect(fl2); fl2.connect(tg); tg.connect(m);
  const n = G.add(noiseSrc(c, 'pink', t, { rng: rnd(x) })), nf = filt(c, 'bandpass', hp * 1.5, 0.8), nl = filt(c, 'lowpass', hp * 2.5, 0.7), ng = gain(c, 0.3); n.connect(nf); nf.connect(nl); nl.connect(ng); ng.connect(m);
  if (bubble) { const b = G.add(noiseSrc(c, 'brown', t, { rng: rnd(x) })), bf = filt(c, 'bandpass', 500, 3), bg = gain(c, bubble); G.lfo(bg.gain, 9, bubble * 0.8); b.connect(bf); bf.connect(bg); bg.connect(m); }
  return loopHandle(c, G, m, level);
};

export const WORK = {
  'sfx.kitchen.chop': (c, o, t, x) => Math.max(knock(c, o, t, [[400, 0.08, 0.4], [900, 0.05, 0.3], [1900, 0.03, 0.15]], 0.8, 0.6, 3000), burst(c, o, t, { f: 4000, d: 0.01, g: 0.3, rng: rnd(x) })),
  'sfx.kitchen.flip': (c, o, t, x) => Math.max(sweep(c, o, t, { type: 'white', pts: [[0, 2500], [1, 1200]], q: 1.5, dur: 0.15, g: 0.4, rng: rnd(x) }), knock(c, o, t + 0.2, [[600, 0.1, 0.3], [1500, 0.06, 0.2]], 0.6, 0.3, 2000)),
  'sfx.kitchen.plate': (c, o, t) => Math.max(ceramic(c, o, t), ceramic(c, o, t + 0.07, 1.02, 0.35)),
  'sfx.kitchen.bell': (c, o, t) => modal(c, o, t, { modes: [[2400, 1.5, 0.3], [5100, 1.0, 0.18], [8000, 0.6, 0.08], [1180, 0.8, 0.12]], gain: 0.8, click: 0.2, clickF: 5000 }),
  'sfx.kitchen.burn': (c, o, t, x) => burst(c, o, t, { type: 'white', ftype: 'bandpass', f: 3500, q: 0.6, a: 0.05, d: 1.0, g: 0.6, rng: rnd(x) }),
  'sfx.kitchen.fridge_door': (c, o, t, x) => Math.max(knock(c, o, t, [[80, 0.15, 0.5], [170, 0.1, 0.3]], 0.8, 0.2, 500), burst(c, o, t, { type: 'pink', ftype: 'lowpass', f: 600, d: 0.1, g: 0.3, rng: rnd(x) })),
  'sfx.kitchen.pour_coffee': (c, o, t, x) => { const n = noiseSrc(c, 'pink', t, { rng: rnd(x) }), b = filt(c, 'bandpass', 700, 3), e = gain(c, 0); b.frequency.linearRampToValueAtTime(1300, t + 1.2); n.connect(b); b.connect(e); e.connect(o); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(1.1, t + 0.1); e.gain.setValueAtTime(1.1, t + 1.1); e.gain.linearRampToValueAtTime(0, t + 1.3); n.stop(t + 1.4); return t + 1.3; },
  'sfx.kitchen.sizzle': (c, o, t, x) => sizzleLoop(c, o, t, x, 900, 2500, 0.55),
  'sfx.kitchen.fryer': (c, o, t, x) => sizzleLoop(c, o, t, x, 500, 900, 0.5, 0.6),
  'sfx.kitchen.espresso': (c, o, t, x) => { const G = graph(c, t), m = gain(c, 0); m.connect(o); const p = G.osc('sawtooth', 50), pl = filt(c, 'lowpass', 300, 2), pg = gain(c, 0.4); p.connect(pl); pl.connect(pg); pg.connect(m); const n = G.add(noiseSrc(c, 'pink', t, { rng: rnd(x) })), nf = filt(c, 'bandpass', 2500, 0.8), nl = filt(c, 'lowpass', 4000, 0.7), ng = gain(c, 0.2); n.connect(nf); nf.connect(nl); nl.connect(ng); ng.connect(m); return loopHandle(c, G, m, 0.5); },
  'sfx.shop.scan_beep': (c, o, t) => tone(c, o, t, { type: 'square', f: 2200, lp: 4000, a: 0.002, hold: 0.08, d: 0.02, g: 0.25 }),
  'sfx.shop.bag': (c, o, t, x) => grains(c, o, t, { n: 24, span: 0.45, f: [1500, 5000], q: 1, gain: 1.1, dur: [0.005, 0.03], rng: rnd(x) }),
  'sfx.shop.till_open': (c, o, t, x) => Math.max(knock(c, o, t, [[900, 0.05, 0.3], [2000, 0.04, 0.2]], 0.7, 0.4, 2500), sweep(c, o, t + 0.05, { type: 'white', pts: [[0, 900], [1, 1800]], q: 2, dur: 0.35, g: 0.25, rng: rnd(x) }), knock(c, o, t + 0.4, [[200, 0.1, 0.4]], 0.6, 0.2, 800)),
  'sfx.shop.shelf_place': (c, o, t, x) => box(c, o, t, x, 160, 0.7),
  'sfx.shop.belt': (c, o, t, x) => { const G = graph(c, t), m = gain(c, 0); m.connect(o); const mo = G.osc('sawtooth', 60), l = filt(c, 'lowpass', 400, 1), g = gain(c, 0.35); mo.connect(l); l.connect(g); g.connect(m); const n = G.add(noiseSrc(c, 'brown', t, { rng: rnd(x) })), nl = filt(c, 'lowpass', 300, 0.7), ng = gain(c, 0.6); n.connect(nl); nl.connect(ng); ng.connect(m); return loopHandle(c, G, m, 0.5); },
  'sfx.shop.cart_roll': (c, o, t, x) => { const G = graph(c, t), m = gain(c, 0); m.connect(o); const tx = G.add(textureSrc(c, 'crunch', 60, t, { rng: rnd(x) })), f = filt(c, 'bandpass', 900, 0.8), fl = filt(c, 'lowpass', 2000, 0.7), g = gain(c, 1.0); tx.connect(f); f.connect(fl); fl.connect(g); g.connect(m); const n = G.add(noiseSrc(c, 'brown', t, { rng: rnd(x) })), nl = filt(c, 'lowpass', 300, 0.7), ng = gain(c, 0.5); n.connect(nl); nl.connect(ng); ng.connect(m); return loopHandle(c, G, m, 0.5); },
  'sfx.parcel.pickup': (c, o, t, x) => Math.max(box(c, o, t, x, 140, 0.7), sweep(c, o, t, { type: 'pink', pts: [[0, 500], [1, 900]], q: 1, dur: 0.2, g: 0.15, rng: rnd(x) })),
  'sfx.parcel.drop': (c, o, t, x) => box(c, o, t, x, 105, 0.9),
  'sfx.parcel.doorbell': (c, o, t) => Math.max(fm(c, o, t, { f: 659.3, ratio: 3, index: 0.6, decay: 1.0, gain: 0.4 }), fm(c, o, t + 0.45, { f: 523.3, ratio: 3, index: 0.6, decay: 1.1, gain: 0.4 })),
  'sfx.parcel.sign': (c, o, t, x) => { const n = noiseSrc(c, 'white', t, { rng: rnd(x) }), b = filt(c, 'bandpass', 3200, 2), e = gain(c, 0), am = gain(c, 0.5); const r = rnd(x); n.connect(b); b.connect(am); am.connect(e); e.connect(o); let tt = t; e.gain.setValueAtTime(0, t); for (let i = 0; i < 8; i++) { tt += R(r, 0.06, 0.11); e.gain.linearRampToValueAtTime(R(r, 0.9, 2.0), tt); } e.gain.linearRampToValueAtTime(0, tt + 0.05); n.stop(tt + 0.1); return tt + 0.05; },
  'sfx.vend.restock': (c, o, t, x) => { const r = rnd(x); let e = t; for (let i = 0; i < 6; i++) e = Math.max(e, can(c, o, t + i * R(r, 0.08, 0.15), R(r, 0.9, 1.15))); return e; },
  'sfx.vend.coin_box': (c, o, t, x) => { const r = rnd(x); let e = t; for (let i = 0; i < 7; i++) { const f = R(r, 2600, 5200); e = Math.max(e, knock(c, o, t + i * R(r, 0.03, 0.07), [[f, 0.22, 0.3], [f * 1.53, 0.15, 0.2]], 0.6, 0.2, 6000)); } return e; },
  'sfx.vend.dispense': (c, o, t, x) => Math.max(knock(c, o, t, [[95, 0.2, 0.55], [210, 0.12, 0.3]], 0.85, 0.3, 800), grains(c, o, t + 0.05, { n: 6, span: 0.2, f: [800, 2500], q: 3, gain: 0.15, dur: [0.01, 0.03], rng: rnd(x) })),
  'sfx.vend.jam': (c, o, t, x) => Math.max(tone(c, o, t, { type: 'square', f: 110, lp: 900, a: 0.01, hold: 0.4, d: 0.08, g: 0.3 }), box(c, o, t + 0.5, x, 150, 0.6)),
  'sfx.vend.repair': (c, o, t, x) => clicks(c, o, t, x, 9, 0.065, 2200, 1.6),
  'sfx.dock.crate_set': (c, o, t) => knock(c, o, t, [[110, 0.2, 0.5], [250, 0.12, 0.3], [560, 0.06, 0.15]], 0.85, 0.3, 1000),
  'sfx.dock.ice_shovel': (c, o, t, x) => grains(c, o, t, { n: 30, span: 0.35, f: [2000, 6000], q: 2, gain: 1.4, dur: [0.005, 0.025], rng: rnd(x) }),
  'sfx.dock.fish_dump': (c, o, t, x) => { const r = rnd(x); let e = t; for (let i = 0; i < 6; i++) e = Math.max(e, knock(c, o, t + i * R(r, 0.08, 0.16), [[R(r, 150, 260), 0.1, 0.5]], 0.6, 0.4, 1200)); return e; },
  'sfx.dock.conveyor': (c, o, t, x) => { const G = graph(c, t), m = gain(c, 0); m.connect(o); const n = G.add(noiseSrc(c, 'brown', t, { rng: rnd(x) })), nl = filt(c, 'lowpass', 300, 0.7), ng = gain(c, 0.6); n.connect(nl); nl.connect(ng); ng.connect(m); const r = G.osc('sawtooth', 14), rs = shaper(c, 'gate', 0.2), w = G.add(noiseSrc(c, 'pink', t, { rng: rnd(x) })), wf = filt(c, 'bandpass', 1200, 2), wg = gain(c, 0); r.connect(rs); rs.connect(wg.gain); w.connect(wf); wf.connect(wg); wg.connect(m); return loopHandle(c, G, m, 0.6); },
  'sfx.rental.life_jacket': (c, o, t, x) => sweep(c, o, t, { type: 'pink', pts: [[0, 600], [0.5, 2000], [1, 900]], q: 0.8, dur: 0.35, g: 0.9, rng: rnd(x) }),
  'sfx.rental.boat_push': (c, o, t, x) => Math.max(sweep(c, o, t, { type: 'brown', pts: [[0, 300], [1, 700]], q: 1.5, dur: 0.7, g: 0.7, peakAt: 0.5, rng: rnd(x) }), sweep(c, o, t + 0.5, { type: 'white', pts: [[0, 600], [0.2, 2200], [1, 500]], q: 0.9, dur: 0.5, g: 0.3, rng: rnd(x) })),
  'sfx.rental.whistle': (c, o, t) => { const s = tone(c, o, t, { f: 2900, a: 0.02, hold: 0.35, d: 0.1, g: 0.25 }); return Math.max(s, tone(c, o, t, { type: 'triangle', f: 2900 * 1.01, a: 0.02, hold: 0.35, d: 0.1, g: 0.1 })); },
  // tools, trees, fire
  'sfx.tool.axe_swing': (c, o, t, x) => sweep(c, o, t, { type: 'pink', pts: [[0, 500], [0.6, 2400], [1, 800]], q: 1.8, dur: 0.3, g: 1.2, peakAt: 0.6, rng: rnd(x) }),
  'sfx.tool.axe_chop': (c, o, t, x) => Math.max(knock(c, o, t, [[300, 0.15, 0.45], [700, 0.1, 0.3], [1500, 0.06, 0.18]], 0.85, 0.6, 2500), burst(c, o, t, { f: 3000, d: 0.02, g: 0.4, rng: rnd(x) })),
  'sfx.tool.axe_stuck': (c, o, t) => knock(c, o, t, [[140, 0.12, 0.5], [320, 0.06, 0.25]], 0.8, 0.2, 700),
  'sfx.tool.chainsaw_start': (c, o, t, x) => { let e = clicks(c, o, t, x, 6, 0.045, 1200, 0.5); const eng = createEngine(c, o, t + 0.45, ENGINES['eng.chainsaw'], { rpm: 3200, load: 0.2, gain: 0.5 }); eng.stop(t + 1.2, 0.3); return Math.max(e, t + 1.6); },
  'sfx.tool.chainsaw_kick': (c, o, t, x) => Math.max(burst(c, o, t, { type: 'white', f: 1500, q: 0.8, d: 0.3, g: 0.5, rng: rnd(x) }), knock(c, o, t, [[120, 0.15, 0.6]], 0.8, 0)),
  'sfx.tool.chainsaw_cut': (c, o, t, x) => { const G = graph(c, t), m = gain(c, 0); m.connect(o); const tx = G.add(textureSrc(c, 'crunch', 400, t, { rng: rnd(x) })), f = filt(c, 'bandpass', 2200, 0.8), fl = filt(c, 'lowpass', 4000, 0.7), g = gain(c, 1.0); tx.connect(f); f.connect(fl); fl.connect(g); g.connect(m); return loopHandle(c, G, m, 0.5); },
  'sfx.tree.crack': (c, o, t, x) => { const r = rnd(x); let e = t; for (let i = 0; i < 7; i++) e = Math.max(e, knock(c, o, t + Math.pow(i / 6, 1.5) * 1.2, [[R(r, 250, 500), 0.12, 0.4], [R(r, 900, 1600), 0.06, 0.2]], 0.7, 0.7, 2500)); return e; },
  'sfx.tree.fall': (c, o, t, x) => sweep(c, o, t, { type: 'pink', pts: [[0, 2500], [1, 600]], q: 0.7, dur: 2.2, g: 0.5, peakAt: 0.7, rng: rnd(x) }),
  'sfx.tree.impact': (c, o, t, x) => Math.max(knock(c, o, t, [[45, 0.8, 0.6], [90, 0.5, 0.3], [180, 0.3, 0.2]], 0.9, 0.3, 500), grains(c, o, t, { n: 30, span: 1.0, f: [700, 3500], q: 1.5, gain: 0.2, dur: [0.005, 0.03], rng: rnd(x) })),
  'sfx.tool.wrench_ratchet': (c, o, t, x) => clicks(c, o, t, x, 8, 0.06, 2400, 1.6),
  'sfx.tool.impact_gun': (c, o, t, x) => { const r = rnd(x); let e = t; for (let i = 0; i < 12; i++) e = Math.max(e, knock(c, o, t + i * 0.05, [[420, 0.05, 0.4], [1100, 0.03, 0.2]], 0.6, 0.5, 2000)); void r; return e; },
  'sfx.tool.torque_click': (c, o, t) => knock(c, o, t, [[2500, 0.03, 0.4], [4800, 0.02, 0.2]], 0.8, 0.6, 4000),
  'sfx.tool.oil_drain': (c, o, t, x) => { const n = noiseSrc(c, 'brown', t, { rng: rnd(x) }), b = filt(c, 'bandpass', 380, 4), e = gain(c, 0); n.connect(b); b.connect(e); e.connect(o); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.9, t + 0.1); e.gain.setValueAtTime(0.9, t + 1.1); e.gain.linearRampToValueAtTime(0, t + 1.4); n.stop(t + 1.5); return t + 1.4; },
  'sfx.tool.hood': (c, o, t) => knock(c, o, t, [[75, 0.3, 0.55], [190, 0.15, 0.3], [600, 0.08, 0.1]], 0.85, 0.3, 700),
  'sfx.fire.ignite': (c, o, t, x) => sweep(c, o, t, { type: 'brown', pts: [[0, 200], [0.3, 1500], [1, 400]], q: 0.7, dur: 0.8, g: 0.9, peakAt: 0.2, rng: rnd(x) }),
  'sfx.fire.loop': (c, o, t, x) => fireLoop(c, o, t, x, 0.55),
  // weather / world
  'sfx.weather.lightning_crack': (c, o, t, x) => Math.max(burst(c, o, t, { type: 'white', f: 3000, q: 0.4, d: 0.25, g: 0.7, rng: rnd(x) }), burst(c, o, t + 0.05, { type: 'brown', ftype: 'lowpass', f: 600, q: 0.7, a: 0.1, d: 3.0, g: 0.5, f1: 120, sweep: 2.5, rng: rnd(x) })),
  'sfx.weather.gust': (c, o, t, x) => sweep(c, o, t, { type: 'pink', pts: [[0, 300], [0.5, 800], [1, 350]], q: 1.5, dur: 2.5, g: 1.0, peakAt: 0.5, rng: rnd(x) }),
  'sfx.world.crossing_beep': (c, o, t) => tone(c, o, t, { type: 'square', f: 1200, lp: 2500, a: 0.003, hold: 0.12, d: 0.03, g: 0.25 }),
  'sfx.world.bus_brake': (c, o, t, x) => Math.max(burst(c, o, t + 0.8, { type: 'pink', f: 3000, q: 0.6, d: 0.5, g: 0.8, rng: rnd(x) }), tone(c, o, t, { type: 'sawtooth', f: 2900, lp: 3500, a: 0.1, hold: 0.5, d: 0.2, g: 0.08 })),
  'sfx.world.church_bell': (c, o, t) => modal(c, o, t, { modes: [[220, 3.5, 0.3], [440, 3.0, 0.2], [528, 2.5, 0.15], [660, 2.0, 0.12], [880, 1.5, 0.08], [1100, 1.0, 0.05]], gain: 0.8, click: 0.15, clickF: 1500 }),
  'sfx.world.construction_clank': (c, o, t) => knock(c, o, t, [[520, 0.4, 0.3], [1310, 0.3, 0.22], [2470, 0.2, 0.15], [3900, 0.12, 0.08]], 0.75, 0.5, 2500),
};
export function fireLoop(c, o, t, x, level) {
  const G = graph(c, t), m = gain(c, 0); m.connect(o);
  const tx = G.add(textureSrc(c, 'crackle', 60, t, { rng: rnd(x), seed: 9 })), f = filt(c, 'bandpass', 1800, 0.7), fl = filt(c, 'lowpass', 3000, 0.7), tg = gain(c, 1.6); tx.connect(f); f.connect(fl); fl.connect(tg); tg.connect(m);
  const n = G.add(noiseSrc(c, 'brown', t, { rng: rnd(x) })), nf = filt(c, 'lowpass', 300, 0.7), nf2 = filt(c, 'lowpass', 400, 0.7), ng = gain(c, 1.2); G.lfo(ng.gain, 0.3, 0.2); n.connect(nf); nf.connect(nf2); nf2.connect(ng); ng.connect(m);
  return loopHandle(c, G, m, level);
}
void toneGrains; void chime;
