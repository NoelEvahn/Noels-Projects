// 2-operator FM (Annex E 3): modulator gain into carrier frequency. Bells, electric piano, marimba, UI tones.
import { osc, gain } from './osc.js';
import { perc, adsr } from './env.js';

/** f carrier Hz; ratio modulator/carrier; index peak modulation index; decay T60; returns end time */
export function fm(ctx, out, t, { f, ratio = 1, index = 2, decay = 0.6, attack = 0.002, gain: g = 0.4, indexDecay = null, hold = 0, sustain = 0, release = 0.2, detune = 0 }) {
  const car = osc(ctx, 'sine', f, t, detune), mod = osc(ctx, 'sine', f * ratio, t);
  const mg = gain(ctx, 0), e = gain(ctx, 0);
  mod.connect(mg); mg.connect(car.frequency); car.connect(e); e.connect(out);
  const peakDev = index * f * ratio;
  mg.gain.setValueAtTime(peakDev, t);
  mg.gain.setTargetAtTime(peakDev * 0.15, t + attack, Math.max(0.005, (indexDecay || decay * 0.5) / 4));
  const end = sustain > 0 ? adsr(e.gain, t, { a: attack, d: decay, s: sustain, r: release, hold, peak: g }) : perc(e.gain, t, g, attack, decay);
  car.stop(end + 0.05); mod.stop(end + 0.05);
  return end;
}
