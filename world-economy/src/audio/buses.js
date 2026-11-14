// Mixer (Annex E 2): buses music, ambience, sfx, vehicles, ui -> per-bus gain (user volume, squared curve) -> duck gain ->
// per-bus lowpass (occlusion / interior / underwater; ui bypasses) -> dry to master + reverb send (two generated convolvers,
// crossfaded over 1.5 s) -> master gain -> DynamicsCompressor limiter -> destination.
import { gain, filt } from './synth/osc.js';
import { mulberry } from './synth/noise.js';
import { createDuckState } from './voices.js';
import { dbToGain } from './synth/env.js';

export const BUSES = ['music', 'ambience', 'sfx', 'vehicles', 'ui'];
// Impulse responses (Annex E 2): seconds, wet level, darkness (lowpass sweep end Hz), early slap
export const IRS = {
  'ir.open': { sec: 0.5, wet: 0.06, dark: 6000 }, 'ir.city': { sec: 1.3, wet: 0.12, dark: 5000, slap: 0.07 }, 'ir.forest': { sec: 0.9, wet: 0.14, dark: 2500 },
  'ir.room_small': { sec: 0.35, wet: 0.18, dark: 5000 }, 'ir.room_large': { sec: 1.6, wet: 0.22, dark: 4000 }, 'ir.cabin': { sec: 0.5, wet: 0.15, dark: 3000 },
};
// Headroom: bus trims so a typical mix sits around -20 dBFS RMS before the limiter (music -6 dB relative to ambience peaks).
const TRIM = { music: 0.5, ambience: 0.8, sfx: 0.8, vehicles: 0.75, ui: 0.6 };

/** stereo noise x exponential decay x lowpass sweep (one-pole, cutoff falling from 12 kHz to `dark`) */
export function makeIR(ctx, id) {
  const d = IRS[id] || IRS['ir.open'], sr = ctx.sampleRate, n = Math.max(1, Math.round(sr * d.sec));
  const buf = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const a = buf.getChannelData(ch), r = mulberry(17 + ch * 101 + Math.round(d.sec * 1000));
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n, fc = 12000 * Math.pow(d.dark / 12000, x), k = 1 - Math.exp(-2 * Math.PI * fc / sr);
      lp += k * ((r() * 2 - 1) - lp);
      a[i] = lp * Math.exp(-6.9 * x) * 0.6;
    }
    if (d.slap) { const s = Math.round(sr * d.slap); if (s < n) a[s] += ch ? 0.25 : 0.3; }
  }
  return buf;
}

export function createMixer(ctx, { destination = null, reverb = true } = {}) {
  const dest = destination || ctx.destination;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8; limiter.knee.value = 6; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.2;
  const master = gain(ctx, 0.8); master.connect(limiter); limiter.connect(dest);
  const revIn = gain(ctx, 1);
  const conv = [ctx.createConvolver(), ctx.createConvolver()], convG = [gain(ctx, 1), gain(ctx, 0)];
  for (let i = 0; i < 2; i++) { revIn.connect(conv[i]); conv[i].connect(convG[i]); convG[i].connect(master); }
  let cur = 0, curIr = null, reverbOn = reverb;
  const irCache = {};
  const buses = {};
  for (const b of BUSES) {
    const input = gain(ctx, 1), vol = gain(ctx, TRIM[b] * 0.64), duck = gain(ctx, 1), lp = filt(ctx, 'lowpass', 20000, 0.5), send = gain(ctx, 0);
    input.connect(vol); vol.connect(duck);
    if (b === 'ui') duck.connect(master); else { duck.connect(lp); lp.connect(master); lp.connect(send); send.connect(revIn); }
    buses[b] = { input, vol, duck, lp, send, user: 0.8, duckDb: 0 };
  }
  const ducks = createDuckState();
  const M = {
    ctx, master, limiter, buses, ducks,
    input(bus) { return (buses[bus] || buses.sfx).input; },
    /** user volume 0..1, squared curve; 'master' targets the master gain */
    setBusGain(bus, v, ramp = 0.05) {
      const g = Math.max(0, Math.min(1, v)); const at = ctx.currentTime;
      if (bus === 'master') { master.gain.setTargetAtTime(g * g, at, ramp / 3); return; }
      const B = buses[bus]; if (!B) return; B.user = g; B.vol.gain.setTargetAtTime(TRIM[bus] * g * g, at, ramp / 3);
    },
    setLowpass(bus, hz, tc = 0.15) { const B = buses[bus]; if (B && bus !== 'ui') B.lp.frequency.setTargetAtTime(hz, ctx.currentTime, tc); },
    setReverbEnabled(on) { reverbOn = !!on; for (const b of BUSES) if (b !== 'ui') buses[b].send.gain.setTargetAtTime(on && curIr ? IRS[curIr].wet * 2 : 0, ctx.currentTime, 0.2); },
    /** crossfade to a generated impulse response over 1.5 s */
    setReverb(id) {
      if (!IRS[id] || id === curIr) return;
      const at = ctx.currentTime, nxt = 1 - cur;
      conv[nxt].buffer = irCache[id] || (irCache[id] = makeIR(ctx, id));
      convG[nxt].gain.setValueAtTime(curIr ? 0 : 1, at); convG[nxt].gain.linearRampToValueAtTime(1, at + 1.5);
      convG[cur].gain.setValueAtTime(convG[cur].gain.value, at); convG[cur].gain.linearRampToValueAtTime(0, at + 1.5);
      cur = nxt; curIr = id;
      for (const b of BUSES) if (b !== 'ui') buses[b].send.gain.setTargetAtTime(reverbOn ? IRS[id].wet * 2 : 0, at, 0.5);
    },
    get reverb() { return curIr; },
    duck(bus, db, attack = 0.05, hold = 0.5, release = 0.5) { ducks.add(bus, db, attack, hold, release, ctx.currentTime); },
    /** per frame: apply duck levels (only when changed by > 0.1 dB) */
    update(now = ctx.currentTime) {
      for (const b of BUSES) {
        const B = buses[b], db = ducks.levelAt(b, now);
        if (Math.abs(db - B.duckDb) > 0.1 || (db === 0 && B.duckDb !== 0)) { B.duckDb = db; B.duck.gain.setTargetAtTime(dbToGain(db), now, 0.02); }
      }
    },
  };
  return M;
}
