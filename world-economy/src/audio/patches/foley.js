// Player and foley (Annex E 6.2): footsteps per surface, jumps, items, doors, NPC murmurs. Spatial at the player.
import { burst, sweep, tone, knock, grains, toneGrains, splash, rnd, R, modal } from './kit.js';
import { formantVoice } from '../synth/formant.js';

// hard surfaces: heel (lowpassed click) + sole scuff (bandpassed noise); [heelF, heelQ, heelG, scuffF, scuffQ, scuffG, scuffD]
const HARD = {
  asphalt: [900, 0.9, 0.55, 2200, 1.2, 0.18, 0.09], concrete: [1300, 0.9, 0.6, 2800, 1.2, 0.16, 0.08], cobble: [1100, 1.2, 0.6, 2000, 1.0, 0.2, 0.07],
  paver: [1200, 1.0, 0.55, 2600, 1.1, 0.16, 0.08], tile: [2200, 1.5, 0.6, 3500, 1.5, 0.12, 0.05], carpet: [400, 0.7, 0.5, 900, 0.8, 0.2, 0.12],
};
// soft surfaces: grain bursts [n, span, f lo, f hi, q, gain, dur hi, twig chance]
const SOFT = {
  grass: [14, 0.12, 1000, 3800, 0.9, 0.3, 0.04, 0], forestfloor: [16, 0.14, 900, 4500, 0.9, 0.3, 0.035, 0.25], dirt: [12, 0.08, 700, 2600, 1.0, 0.4, 0.03, 0],
  gravel: [26, 0.12, 1800, 6500, 1.5, 0.35, 0.02, 0], sand: [12, 0.14, 600, 2500, 0.7, 0.28, 0.05, 0], snow: [22, 0.15, 1200, 4000, 1.2, 0.35, 0.025, 0],
};
function step(surface) {
  if (HARD[surface]) {
    const [hf, hq, hg, sf, sq, sg, sd] = HARD[surface];
    return (c, o, t, x) => { const r = rnd(x), p = x.pitch || 1; return Math.max(burst(c, o, t, { type: 'white', ftype: 'lowpass', f: hf * p * R(r, 0.9, 1.1), q: hq, d: 0.03, g: hg * 1.8, rng: r }), knock(c, o, t, [[hf * 0.18 * p, 0.05, 0.4]], 0.7, 0), burst(c, o, t + 0.035, { f: sf * R(r, 0.85, 1.15), q: sq, a: 0.01, d: sd, g: sg * 1.5, rng: r })); };
  }
  if (SOFT[surface]) {
    const [n, span, fl, fh, q, g, dh, twig] = SOFT[surface];
    return (c, o, t, x) => { const r = rnd(x); let end = Math.max(grains(c, o, t, { n, span, f: [fl, fh], q, gain: g * 2.5, dur: [0.005, dh], rng: r }), knock(c, o, t, [[110, 0.06, 0.4]], 0.6, 0)); if (r() < twig) end = Math.max(end, burst(c, o, t + span * r(), { f: 2500, q: 2, d: 0.012, g: 0.5, rng: r })); return end; };
  }
  return null;
}
const steps = {};
for (const s of [...Object.keys(HARD), ...Object.keys(SOFT)]) steps['sfx.step.' + s] = step(s);
steps['sfx.step.wood'] = (c, o, t, x) => Math.max(knock(c, o, t, [[180, 0.18, 0.45], [420, 0.12, 0.3], [900, 0.07, 0.18]], 0.75, 0.3, 1800, x.pitch || 1), burst(c, o, t + 0.03, { f: 1800, d: 0.06, g: 0.1, rng: rnd(x) }));
steps['sfx.step.metal'] = (c, o, t, x) => Math.max(knock(c, o, t, [[900, 0.35, 0.3], [2300, 0.25, 0.22], [4100, 0.15, 0.15], [610, 0.3, 0.2]], 0.7, 0.4, 4000, x.pitch || 1), burst(c, o, t + 0.03, { f: 3000, d: 0.05, g: 0.1, rng: rnd(x) }));
steps['sfx.step.mud'] = (c, o, t, x) => Math.max(sweep(c, o, t, { type: 'brown', pts: [[0, 300], [0.4, 900], [1, 400]], q: 3, dur: 0.22, g: 0.8, peakAt: 0.35, rng: rnd(x) }), toneGrains(c, o, t + 0.05, { n: 3, span: 0.12, f: [200, 500], sweep: 1.6, dur: [0.02, 0.05], gain: 0.25, rng: rnd(x) }));
steps['sfx.step.water_shallow'] = (c, o, t, x) => splash(c, o, t, { size: 0.3, g: 0.7, rng: rnd(x) });

const cloth = (c, o, t, x, d = 0.2, g = 0.35) => sweep(c, o, t, { type: 'pink', pts: [[0, 700], [0.5, 2200], [1, 1200]], q: 0.9, dur: d, g, peakAt: 0.5, rng: rnd(x) });
const thump = (c, o, t, f = 110, g = 0.7, d = 0.12) => knock(c, o, t, [[f, d, 0.5], [f * 2.3, d * 0.6, 0.2]], g, 0.15, 900);

export const FOLEY = {
  ...steps,
  'sfx.player.jump': (c, o, t, x) => cloth(c, o, t, x, 0.22, 1.0),
  'sfx.player.land_soft': (c, o, t, x) => Math.max(thump(c, o, t, 100, 0.7), cloth(c, o, t, x, 0.15, 0.12)),
  'sfx.player.land_hard': (c, o, t, x) => Math.max(thump(c, o, t, 70, 0.9, 0.2), burst(c, o, t, { f: 1500, d: 0.08, g: 0.3, rng: rnd(x) })),
  'sfx.player.eat': (c, o, t, x) => { const r = rnd(x); let e = t; for (let i = 0; i < 3; i++) e = Math.max(e, grains(c, o, t + i * 0.22, { n: 10, span: 0.08, f: [900, 3000], q: 1.2, gain: 1.1, dur: [0.004, 0.02], rng: r })); return e; },
  'sfx.player.drink': (c, o, t, x) => { const r = rnd(x); let e = t; for (let i = 0; i < 3; i++) e = Math.max(e, formantVoice(c, o, t + i * 0.24, { f0: 180, pitch: [[0.12, 120]], formants: [[400, 4, 1], [900, 5, 0.4]], env: [[0.02, 1], [0.12, 0]], gain: 2.0, type: 'triangle' })); void r; return e; },
  'sfx.player.sleep': (c, o, t) => Math.max(tone(c, o, t, { type: 'triangle', f: 523, f1: 392, a: 0.4, hold: 0.8, d: 1.2, g: 0.18 }), tone(c, o, t, { type: 'triangle', f: 659, f1: 494, a: 0.4, hold: 0.8, d: 1.2, g: 0.12 }), tone(c, o, t, { type: 'triangle', f: 392, f1: 294, a: 0.4, hold: 0.8, d: 1.2, g: 0.15 })),
  'sfx.item.pickup': (c, o, t, x) => Math.max(cloth(c, o, t, x, 0.16, 0.35), thump(c, o, t + 0.12, 220, 0.4, 0.08)),
  'sfx.item.drop': (c, o, t, x) => Math.max(thump(c, o, t, 95, 0.8, 0.18), burst(c, o, t, { f: 900, d: 0.06, g: 0.25, rng: rnd(x) })),
  'sfx.item.carry_set': (c, o, t, x) => Math.max(cloth(c, o, t, x, 0.12, 0.2), thump(c, o, t + 0.1, 130, 0.7, 0.12)),
  'sfx.door.open': (c, o, t, x) => Math.max(knock(c, o, t, [[2100, 0.05, 0.3], [3500, 0.04, 0.2]], 0.6, 0.4, 3000),
    sweep(c, o, t + 0.08, { type: 'white', pts: [[0, 300], [1, 520]], q: 9, dur: 0.6, g: 0.8, peakAt: 0.5, rng: rnd(x) }), tone(c, o, t + 0.08, { type: 'sawtooth', f: 260, f1: 420, lp: 1200, a: 0.1, hold: 0.3, d: 0.2, g: 0.16 })),
  'sfx.door.close': (c, o, t) => Math.max(knock(c, o, t, [[90, 0.25, 0.5], [180, 0.18, 0.35], [410, 0.08, 0.15]], 0.8, 0.3, 900), knock(c, o, t + 0.04, [[2100, 0.05, 0.25], [3500, 0.04, 0.15]], 0.5, 0.3, 3000)),
  'sfx.door.locked': (c, o, t) => Math.max(knock(c, o, t, [[1800, 0.05, 0.3], [3300, 0.04, 0.2]], 0.7, 0.5, 3000), knock(c, o, t + 0.12, [[1700, 0.05, 0.3], [3100, 0.04, 0.2]], 0.7, 0.5, 3000)),
  'sfx.door.shop_bell': (c, o, t) => Math.max(modal(c, o, t, { modes: [[2350, 1.0, 0.35], [3720, 0.7, 0.25]], gain: 0.7, click: 0.1, clickF: 4000 }), modal(c, o, t + 0.15, { modes: [[2350, 0.8, 0.25], [3720, 0.5, 0.18]], gain: 0.6, click: 0.05, clickF: 4000 })),
  'sfx.npc.murmur_a': (c, o, t) => murmur(c, o, t, [[0.12, 210], [0.15, 240], [0.2, 190]]),
  'sfx.npc.murmur_b': (c, o, t) => murmur(c, o, t, [[0.15, 230], [0.15, 260], [0.25, 280]]),
  'sfx.npc.murmur_c': (c, o, t) => murmur(c, o, t, [[0.2, 180], [0.15, 170], [0.25, 140]]),
  'sfx.npc.whistle_hail': (c, o, t) => Math.max(tone(c, o, t, { f: 2000, f1: 2600, a: 0.03, hold: 0.15, d: 0.1, g: 0.3 }), tone(c, o, t + 0.3, { f: 2600, f1: 1900, a: 0.03, hold: 0.2, d: 0.15, g: 0.3 })),
};
function murmur(c, o, t, pitch) {
  return formantVoice(c, o, t, { f0: pitch[0][1], pitch, formants: [[600, 5, 1], [1300, 6, 0.6], [2500, 8, 0.25]], env: [[0.04, 1], [0.12, 0.4], [0.08, 0.9], [0.15, 0.3], [0.1, 0.8], [0.2, 0]], rough: 4.5, roughDepth: 0.6, gain: 1.5 });
}
