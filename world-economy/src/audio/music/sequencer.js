// Generative sequencer (Annex E 7.1): suites as data, a seeded melody generator around the motif, piece form
// intro / A / B / A / B / A' / outro (2-3 minutes) then 40-90 s of silence. planBar() is pure (Node-testable); createSequencer
// schedules the events on a BaseAudioContext with lookahead (schedule(t0, t1)).
import { SUITES, LAYERS, STINGS, MOTIF, degree, chord, inScale } from './suites.js';
import { INSTRUMENTS } from './instruments.js';
import { mulberry } from '../synth/noise.js';
import { gain, filt, osc } from '../synth/osc.js';

/** piece form: array of section names, one per bar */
export function pieceForm(suite) {
  const barSec = (suite.steps / 4) * 60 / suite.tempo;
  const form = ['intro', 'intro'];
  const order = ['A', 'B', 'A', 'B', 'A2', 'A', 'B'];
  for (const s of order) { for (let i = 0; i < 8; i++) form.push(s); if (form.length * barSec >= 130 && (s === 'A2' || s === 'B')) break; }
  form.push('outro', 'outro');
  return form;
}

/**
 * Events for one bar: [{step, midi|null, ins, dur(steps), vel}]. Pure. st = {prevLead} mutated (melodic continuity).
 * layer: LAYERS entry or null; layerOnly: only the layer's parts.
 */
export function planBar(suite, form, bar, rng, st, layer = null, layerOnly = false) {
  const ev = [], S = suite.steps, sec = form[bar] || 'outro';
  const prog = sec === 'B' ? suite.progB : suite.prog;
  const [deg, size] = prog[bar % prog.length];
  const ch = chord(suite.root - 12, suite.mode, deg, size);
  const beat = S === 12 ? 6 : 4; // steps per beat group (6/8: dotted quarter = 6 sixteenths)
  const push = (step, midi, ins, dur, vel) => ev.push({ step, midi, ins, dur, vel });
  if (!layerOnly) {
    // harmony
    if (suite.padIns) for (const m of ch.slice(0, 3)) push(0, m, suite.padIns, S, sec === 'intro' || sec === 'outro' ? 0.45 : 0.6);
    if (sec !== 'intro' || suite.comp === 'pad') {
      const ci = suite.compIns;
      if (suite.comp === 'pad') for (const m of ch) push(0, m, ci, S, 0.6);
      else if (suite.comp === 'jazz') { for (const m of ch) push(0, m + 12, ci, 6, 0.42); if (rng() < 0.8) for (const m of ch.slice(1)) push(6, m + 12, ci, 4, 0.35); }
      else if (suite.comp === 'strum') { for (const s of [0, 6, 8, 12]) ch.slice(0, 3).forEach((m, i) => push(s + i * 0.12, m + 12, ci, 4, s === 0 ? 0.7 : 0.5)); }
      else if (suite.comp === 'arp') { const seq = [0, 1, 2, 1, 3 % ch.length, 2, 1, 2]; for (let i = 0; i < S / 2; i++) push(i * 2, ch[seq[i % 8] % ch.length] + 12, ci, 3, i % beat === 0 ? 0.6 : 0.45); }
      else if (suite.comp === 'harm') { for (const s of [0, beat * 2 - (S === 12 ? 0 : 2)]) if (rng() < 0.85) push(s, ch[Math.floor(rng() * ch.length)] + 24, ci, 6, 0.5); }
    }
    // bass
    if (suite.bassIns) {
      const r = ch[0] - 12 + (suite.bassOct || 0);
      if (sec === 'outro') push(0, r, suite.bassIns, S, 0.7);
      else if (suite.comp === 'jazz') { const walk = [ch[0], ch[1], ch[2], degree(suite.root - 12, suite.mode, deg + 1)]; walk.forEach((m, i) => push(i * 4, m - 12, suite.bassIns, 3, 0.7)); }
      else { push(0, r, suite.bassIns, S / 2, 0.75); push(S / 2, sec === 'intro' ? r : ch[2] - 12 + (suite.bassOct || 0), suite.bassIns, S / 2, 0.65); }
    }
    // lead melody (A sections quote the motif in their first two bars)
    if (sec === 'A' || sec === 'B' || sec === 'A2') {
      const secStart = form.indexOf(sec === 'A2' ? 'A2' : sec);
      const inSec = (bar - secStart) % 8;
      const base = suite.lead - 12;
      if ((sec === 'A' || sec === 'A2') && inSec < 2 && suite.leadIns) {
        for (let i = 0; i < 4; i++) { const d = MOTIF[inSec * 4 + i]; const m = degree(base, suite.mode, d + (sec === 'A2' ? 7 : 0)); push(i * beat * (S === 12 ? 0.5 : 1), m, suite.leadIns, beat * 0.9, 0.6); st.prevLead = m; }
      } else if (suite.leadIns) {
        const slots = S === 12 ? [0, 3, 6, 9] : [0, 2, 4, 6, 8, 10, 12, 14];
        for (const s of slots) {
          const strong = s % beat === 0;
          if (rng() > suite.density * (strong ? 1.4 : 0.8)) continue;
          // strong steps: chord tone nearest to the previous note; weak steps: diatonic neighbour
          let m;
          if (strong || st.prevLead == null) { let best = null; for (const c0 of ch) for (const o of [12, 24, 36]) { const cand = c0 + o; if (cand < base - 3 || cand > base + 16) continue; const d = Math.abs(cand - (st.prevLead == null ? base + 4 : st.prevLead)) + rng() * 3; if (!best || d < best[0]) best = [d, cand]; } m = best ? best[1] : base; }
          else { const step = rng() < 0.5 ? -1 : 1; m = nextScale(suite, st.prevLead, step); }
          push(s, m, suite.leadIns, strong ? 3 : 2, strong ? 0.6 : 0.45);
          st.prevLead = m;
        }
      }
      if (suite.extraIns && inSec % 4 === 3 && rng() < 0.7) push(S / 2, ch[ch.length - 1] + 24, suite.extraIns, S / 2, 0.5);
    }
    // drums
    if (suite.drums && sec !== 'intro') for (const [ins, pat] of Object.entries(suite.drums)) for (let s = 0; s < Math.min(S, pat.length); s++) if (pat[s] === 'x') push(s, null, ins, 1, sec === 'outro' ? 0.4 : 0.6);
  }
  if (layer) {
    for (const [ins, pat] of Object.entries(layer.drums)) for (let s = 0; s < Math.min(S, pat.length); s++) if (pat[s] === 'x') push(s, null, ins, 1, 0.55);
    if (layer.ostinato) { const r = ch[0] - 12; for (let s = 0; s < S; s += 2) push(s, s % 4 === 0 ? r : r + 12, 'bass', 1.5, 0.55); }
  }
  return ev;
}
function nextScale(suite, m, dir) { for (let k = 1; k <= 2; k++) { const c = m + dir * k; if (inScale(suite.root, suite.mode, c)) return c; } return m; }

/**
 * createSequencer(ctx, out, id, {seed, layer, layerOnly, start, loopPieces}) -> {schedule(t0,t1), notes, fadeOut(at,dur), fadeIn(at,dur), nextBar(t), output}
 * id: suite id, layer id (plays the layer over the city day harmony when alone), or sting id.
 */
export function createSequencer(ctx, out, id, { seed = 1, layer = null, layerOnly = false, start = 0, loopPieces = true, night = false, bright = false } = {}) {
  const isLayerId = !!LAYERS[id];
  const suite = SUITES[id] || (isLayerId ? SUITES['mus.city.day'] : null);
  const lay = isLayerId ? LAYERS[id] : (layer ? LAYERS[layer] : null);
  const only = isLayerId || layerOnly;
  const rng = mulberry(seed * 7919 + 13);
  const notes = [];
  const LEVEL = 0.8; // headroom: dense suites (comp + drums) peak near full scale otherwise
  const outG = gain(ctx, LEVEL); const dcb = filt(ctx, 'highpass', 20, 0.7); outG.connect(dcb); dcb.connect(out);
  const tone = filt(ctx, 'lowpass', night ? 6000 : bright || (lay && lay.bright) ? 16000 : 11000, 0.5); tone.connect(outG);
  // shared chorus for pads/ep: two modulated delays
  const bus = gain(ctx, 1); bus.connect(tone);
  const chorusIn = gain(ctx, 0.5); bus.connect(chorusIn);
  const lfos = [];
  for (const [dt, rate] of [[0.012, 0.6], [0.017, 0.43]]) { const d = ctx.createDelay(0.05); d.delayTime.value = dt; const l = osc(ctx, 'sine', rate, start); const lg = gain(ctx, 0.003); l.connect(lg); lg.connect(d.delayTime); chorusIn.connect(d); const dg = gain(ctx, 0.5); d.connect(dg); dg.connect(tone); lfos.push(l); }
  if (STINGS[id]) {
    const S = STINGS[id], beat = 60 / S.tempo;
    return {
      notes, output: outG,
      schedule(t0) { if (this._done) return; this._done = true; for (const [b, d, ins, beats] of S.notes) { const m = degree(S.root, S.mode, d); const tt = Math.max(t0, start) + b * beat; INSTRUMENTS[ins](ctx, bus, tt, m, beats * beat, 0.8); notes.push({ t: tt, midi: m, ins, pitched: true }); } for (const l of lfos) l.stop(start + 8); },
      fadeOut() {}, fadeIn() {}, nextBar: (t) => t, scaleRoot: S.root, mode: S.mode,
    };
  }
  const tempo = suite.tempo * (lay ? lay.tempoMul : 1);
  const stepDur = 60 / tempo / 4;
  const S = suite.steps, barDur = S * stepDur;
  let form = pieceForm(suite);
  let bar = 0, barTime = start, silentUntil = 0;
  const st = { prevLead: null };
  let stopped = false;
  function scheduleBar() {
    const ev = planBar(suite, form, bar, rng, st, lay, only);
    for (const e of ev) {
      let tt = barTime + e.step * stepDur;
      if (suite.swing && Math.round(e.step) % 4 === 2) tt += suite.swing * stepDur;
      const f = INSTRUMENTS[e.ins];
      if (!f) continue;
      f(ctx, bus, tt, e.midi, e.dur * stepDur, e.vel);
      notes.push({ t: tt, midi: e.midi, ins: e.ins, pitched: e.midi != null });
    }
  }
  return {
    notes, output: outG, scaleRoot: suite.root, mode: suite.mode, barDur,
    schedule(t0, t1) {
      if (stopped) return;
      while (barTime < t1) {
        if (silentUntil) { if (barTime < silentUntil) { barTime = silentUntil; continue; } silentUntil = 0; }
        if (barTime + barDur >= t0) scheduleBar();
        barTime += barDur; bar++;
        if (bar >= form.length) { if (!loopPieces) { stopped = true; return; } bar = 0; form = pieceForm(suite); silentUntil = barTime + 40 + rng() * 50; }
      }
    },
    nextBar(t) { let b = barTime; while (b - barDur > t) b -= barDur; return b < t ? b + barDur : b; },
    fadeOut(at, dur) { outG.gain.setValueAtTime(outG.gain.value, at); outG.gain.linearRampToValueAtTime(0, at + dur); setTimeoutSafe(() => { stopped = true; }, ctx, at + dur); for (const l of lfos) { try { l.stop(at + dur + 0.1); } catch (e) { /* stopped */ } } },
    fadeIn(at, dur) { outG.gain.setValueAtTime(0, at); outG.gain.linearRampToValueAtTime(LEVEL, at + dur); },
    setTone(f, at) { tone.frequency.setTargetAtTime(f, at, 0.3); },
    get stopped() { return stopped; },
    stop(at) { stopped = true; outG.gain.setTargetAtTime(0, at, 0.1); for (const l of lfos) { try { l.stop(at + 0.5); } catch (e) { /* stopped */ } } },
  };
}
function setTimeoutSafe(fn, ctx, at) { if (typeof setTimeout === 'function' && ctx.currentTime !== undefined && !(typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext)) setTimeout(fn, Math.max(0, (at - ctx.currentTime) * 1000)); }
