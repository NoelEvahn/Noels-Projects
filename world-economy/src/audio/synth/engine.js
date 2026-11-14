// Engine model (Annex E 4.3). firing f = rpm/60 x cyl/2 (four-stroke; two-strokes fire every revolution: rpm/60 x cyl).
// core PeriodicWave at f + sub at f/2, "lump" AM at f/cyl, load-driven drive into a soft clipper, load-driven lowpass,
// resonant exhaust band, brown-noise exhaust with firing tremolo, pink intake at high rpm, turbo whistle, diesel clatter
// (pulse-gated noise per firing), electric / gear whine, outboard water gurgle, boat hull resonance. Interior = lowpass + sub.
import { wave, osc, gain, filt, lfo } from './osc.js';
import { noiseSrc } from './noise.js';
import { shaper } from './shaper.js';

export const ENGINES = {
  'eng.moto_small': { cyl: 1, strokes: 4, idle: 1400, red: 9000, harm: [1, 0.8, 0.7, 0.55, 0.5, 0.4, 0.35, 0.3, 0.25, 0.2], sub: 0.08, lump: 0.0, drive: 3, lp: [900, 4000], exhaust: [180, 4, 0.15], brown: 0.15, intake: 0.15 },
  'eng.moto_twin': { cyl: 2, strokes: 4, uneven: 0.3, idle: 1100, red: 7500, harm: [1, 0.6, 0.45, 0.3, 0.22, 0.15, 0.1], sub: 0.08, lump: 0.12, drive: 2.5, lp: [500, 2600], exhaust: [140, 5, 0.35], brown: 0.18, intake: 0.08 },
  'eng.car_i4': { cyl: 4, strokes: 4, idle: 800, red: 6500, harm: [1, 0.5, 0.3, 0.2, 0.12, 0.08], sub: 0.08, lump: 0.12, drive: 1.5, lp: [300, 1800], exhaust: [110, 3, 0.2], brown: 0.12, intake: 0.06 },
  'eng.car_v6': { cyl: 6, strokes: 4, idle: 750, red: 7000, harm: [1, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1], sub: 0.08, lump: 0.12, drive: 2.2, lp: [300, 2400], exhaust: [95, 4, 0.3], brown: 0.15, intake: 0.08 },
  'eng.van_diesel': { cyl: 4, strokes: 4, idle: 800, red: 4500, harm: [1, 0.55, 0.4, 0.3, 0.2, 0.15], sub: 0.08, lump: 0.12, drive: 1.8, lp: [300, 1600], exhaust: [100, 3, 0.2], brown: 0.15, intake: 0.05, turbo: [4000, 7500, 0.03], clatter: 0.12 },
  'eng.truck_diesel': { cyl: 6, strokes: 4, idle: 650, red: 2800, harm: [1, 0.7, 0.5, 0.35, 0.25, 0.18, 0.12], sub: 0.08, lump: 0.12, drive: 2, lp: [250, 1200], exhaust: [90, 3, 0.3], brown: 0.18, intake: 0.04, turbo: [4500, 9000, 0.04], clatter: 0.1 },
  'eng.forklift': { cyl: 2, strokes: 4, idle: 1000, red: 3600, harm: [1, 0.5, 0.3, 0.2], sub: 0.08, lump: 0.1, drive: 1.2, lp: [400, 1500], exhaust: [150, 2, 0.1], brown: 0.08, intake: 0.03, whine: [600, 0.06] },
  'eng.outboard': { cyl: 2, strokes: 2, idle: 900, red: 5500, harm: [1, 0.75, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2], sub: 0.08, lump: 0.1, drive: 2.5, lp: [600, 3000], exhaust: [200, 3, 0.15], brown: 0.12, intake: 0.1, gurgle: 0.2 },
  'eng.boat_diesel': { cyl: 6, strokes: 4, idle: 450, red: 1800, harm: [1, 0.7, 0.5, 0.35, 0.25], sub: 0.08, lump: 0.12, drive: 1.6, lp: [200, 900], exhaust: [70, 3, 0.35], brown: 0.15, intake: 0.02, clatter: 0.08, hull: 0.25 },
  'eng.chainsaw': { cyl: 1, strokes: 2, idle: 2800, red: 12000, harm: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25], sub: 0.03, lump: 0.0, drive: 3, lp: [1200, 5000], exhaust: [400, 2, 0.15], brown: 0.1, intake: 0.15 },
  // ambience emitter: small generator, fixed rpm
  'eng.generator': { cyl: 1, strokes: 4, idle: 3600, red: 3600, harm: [1, 0.6, 0.45, 0.3, 0.2], sub: 0.08, lump: 0.0, drive: 1.5, lp: [800, 800], exhaust: [120, 3, 0.2], brown: 0.12, intake: 0.05 },
};
export function firingHz(def, rpm) { return (rpm / 60) * def.cyl * (def.strokes === 2 ? 1 : 0.5); }

/**
 * createEngine(ctx, out, t, def, {rpm, load, speed, interior}) -> {set(param, value, ramp), stop(t, fade), nodes}
 * params: rpm (absolute; default idle), load 0..1, speed m/s (whine), interior 0..1, gearChange (dip trigger).
 */
export function createEngine(ctx, out, t, def, p = {}) {
  const st = { rpm: p.rpm || def.idle, load: p.load || 0, speed: p.speed || 0, interior: p.interior || 0 };
  const src = [];
  const S = (n) => { src.push(n); return n; };
  const f = firingHz(def, st.rpm);
  const master = gain(ctx, 0); const dcb = filt(ctx, 'highpass', 18, 0.7); master.connect(dcb); dcb.connect(out);
  const outLp = filt(ctx, 'lowpass', 16000, 0.5); outLp.connect(master);
  // core + sub -> lump AM -> drive -> tone lowpass
  const core = S(osc(ctx, wave(ctx, def.harm), f, t));
  const sub = S(osc(ctx, 'sine', f / 2, t));
  const coreG = gain(ctx, 0.55), subG = gain(ctx, def.sub);
  core.connect(coreG); sub.connect(subG);
  const am = gain(ctx, 1 - (def.lump || 0) / 2);
  coreG.connect(am); subG.connect(am);
  let lumpO = null;
  if (def.lump) { lumpO = S(lfo(ctx, am.gain, f / def.cyl, def.lump / 2, t)); }
  const driveG = gain(ctx, 0.6 + st.load * def.drive * 0.3);
  const sh = shaper(ctx, 'soft', def.drive);
  const tone = filt(ctx, 'lowpass', def.lp[0] + st.load * def.lp[1], 0.9);
  am.connect(driveG); driveG.connect(sh); sh.connect(tone);
  const toneG = gain(ctx, 0.5); tone.connect(toneG); toneG.connect(outLp);
  // exhaust resonance band fed from the core
  const ex = filt(ctx, 'bandpass', def.exhaust[0], def.exhaust[1]); const exG = gain(ctx, def.exhaust[2] * 2);
  am.connect(ex); ex.connect(exG); exG.connect(outLp);
  // exhaust noise with firing tremolo
  const bn = S(noiseSrc(ctx, 'brown', t));
  const bnF = filt(ctx, 'lowpass', 300 + f * 3, 0.7), trem = gain(ctx, def.brown * 0.6);
  const tremO = S(lfo(ctx, trem.gain, f, def.brown * 0.5, t));
  bn.connect(bnF); bnF.connect(trem); trem.connect(outLp);
  // intake: pink highpassed, level by rpm fraction squared
  const pn = S(noiseSrc(ctx, 'pink', t)); const pnF = filt(ctx, 'highpass', 1800, 0.7); const intake = gain(ctx, 0);
  pn.connect(pnF); pnF.connect(intake); intake.connect(outLp);
  let turbo = null, turboG = null, clatG = null, clatO = null, whine = null, whineG = null;
  if (def.turbo) { turbo = S(osc(ctx, 'sine', def.turbo[0], t)); turboG = gain(ctx, 0); turbo.connect(turboG); turboG.connect(outLp); }
  if (def.clatter) {
    const cn = S(noiseSrc(ctx, 'white', t)); const cf = filt(ctx, 'bandpass', 2600, 1.2); clatG = gain(ctx, 0);
    clatO = S(osc(ctx, 'sawtooth', f, t)); const gate = shaper(ctx, 'gate', 0.15); const gg = gain(ctx, def.clatter);
    clatO.connect(gate); gate.connect(gg); gg.connect(clatG.gain);
    cn.connect(cf); cf.connect(clatG); clatG.connect(outLp);
  }
  if (def.whine) { whine = S(osc(ctx, 'sine', def.whine[0], t)); whineG = gain(ctx, 0); whine.connect(whineG); whineG.connect(outLp); }
  if (def.gurgle) {
    const gn = S(noiseSrc(ctx, 'pink', t)); const gf = filt(ctx, 'bandpass', 420, 2.5); const gg = gain(ctx, def.gurgle);
    S(lfo(ctx, gg.gain, 7.3, def.gurgle * 0.6, t)); S(lfo(ctx, gf.frequency, 2.1, 120, t));
    gn.connect(gf); gf.connect(gg); gg.connect(outLp);
  }
  if (def.hull) {
    const hf = filt(ctx, 'bandpass', 55, 6); const hg = gain(ctx, def.hull * 3); am.connect(hf); hf.connect(hg); hg.connect(outLp);
  }
  const tc = 0.04;
  function apply(at, ramp) {
    const r = Math.max(0.01, ramp == null ? tc : ramp);
    const ff = firingHz(def, st.rpm), x = Math.max(0, Math.min(1, (st.rpm - def.idle) / Math.max(1, def.red - def.idle)));
    core.frequency.setTargetAtTime(ff, at, r); sub.frequency.setTargetAtTime(ff / 2, at, r);
    if (lumpO) lumpO.frequency.setTargetAtTime(ff / def.cyl, at, r);
    tremO.frequency.setTargetAtTime(ff, at, r); bnF.frequency.setTargetAtTime(300 + ff * 3, at, r);
    if (clatO) { clatO.frequency.setTargetAtTime(ff, at, r); clatG.gain.setTargetAtTime(0, at, r); }
    tone.frequency.setTargetAtTime(def.lp[0] + st.load * def.lp[1] + x * def.lp[1] * 0.3, at, r);
    driveG.gain.setTargetAtTime(0.6 + st.load * def.drive * 0.3, at, r);
    intake.gain.setTargetAtTime(def.intake * x * x, at, r);
    if (turbo) { turbo.frequency.setTargetAtTime(def.turbo[0] + (def.turbo[1] - def.turbo[0]) * x, at, r); turboG.gain.setTargetAtTime(def.turbo[2] * st.load * (0.3 + x), at, r * 3); }
    if (whine) { whine.frequency.setTargetAtTime(def.whine[0] + st.speed * 60, at, r); whineG.gain.setTargetAtTime(def.whine[1] * Math.min(1, st.speed / 6), at, r); }
    outLp.frequency.setTargetAtTime(st.interior ? 900 : 16000, at, 0.1);
    subG.gain.setTargetAtTime(def.sub * (1 + st.interior), at, 0.1);
  }
  apply(t, 0.001);
  master.gain.setValueAtTime(0, t); master.gain.linearRampToValueAtTime(p.gain == null ? 1 : p.gain, t + 0.05);
  return {
    set(param, value, ramp) {
      const at = ctx.currentTime;
      if (param === 'gearChange') { master.gain.setTargetAtTime(0.55, at, 0.02); master.gain.setTargetAtTime(p.gain == null ? 1 : p.gain, at + 0.12, 0.05); return; }
      if (param === 'gain') { master.gain.setTargetAtTime(value, at, 0.05); p.gain = value; return; }
      if (!(param in st)) return;
      st[param] = param === 'rpm' ? Math.max(def.idle * 0.5, Math.min(def.red * 1.05, value)) : value;
      apply(at, ramp);
    },
    stop(at, fade = 0.3) { const a = at == null ? ctx.currentTime : at; master.gain.setTargetAtTime(0, a, fade / 4); for (const s of src) { try { s.stop(a + fade + 0.1); } catch (e) { /* stopped */ } } },
    state: st,
  };
}
