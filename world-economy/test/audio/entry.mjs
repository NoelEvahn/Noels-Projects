// Test page entry (bundled by audio.spec.cjs with esbuild): exposes the audio engine, data and analysis to the page.
import { Audio } from '../../src/audio/engine.js';
import { SOUNDS, SOUND_BY_ID, REQUIRED_IDS } from '../../src/data/sounds.js';
import { PATCHES } from '../../src/audio/patches/index.js';
import { ENGINES, firingHz } from '../../src/audio/synth/engine.js';
import { SUITES, STINGS, inScale } from '../../src/audio/music/suites.js';
import { noiseBuffer } from '../../src/audio/synth/noise.js';
import { textureBuffer } from '../../src/audio/synth/grain.js';
import * as A from './analysis.mjs';

const SR = 44100;
/** renders one id and returns compact stats (all analysis in-page) */
async function measure(id, seconds, params) {
  const rec = SOUND_BY_ID[id];
  const t0 = performance.now();
  const chs = await Audio.renderOffline(id, seconds, params);
  const ms = performance.now() - t0;
  const b = A.basic(chs, SR), m = A.mono(chs);
  const out = { id, ms: Math.round(ms), bad: b.bad, peak: b.peak, rms: b.rms, activeRms: b.activeRms, dc: b.dc, tailEnd: b.tailEnd, allZero: b.allZero, centroid: A.centroid(m, SR) };
  if (rec && (rec.kind === 'loop' || rec.kind === 'engine')) { const w = rec.seamWin === undefined ? 1 : rec.seamWin; out.seamWin = w; out.seamDb = w > 0 ? A.seamDb(m, SR, w) : null; }
  if (id.startsWith('mus.')) {
    out.onsets = A.onsets(m, SR);
    const notes = chs.notes || [];
    const suite = SUITES[id] || STINGS[id] || SUITES['mus.city.day'];
    const pitched = notes.filter((n) => n.pitched);
    out.notes = notes.length; out.pitched = pitched.length;
    out.inScale = pitched.length ? pitched.filter((n) => inScale(suite.root, suite.mode, n.midi)).length / pitched.length : 1;
  }
  return out;
}
async function engineSweep(id) {
  const def = ENGINES[id], pts = [];
  for (const [label, x] of [['idle', 0], ['mid', 0.5], ['redline', 1]]) {
    const rpm = def.idle + (def.red - def.idle) * x;
    const chs = await Audio.renderOffline(id, 2.0, { rpm, load: x });
    const m = A.mono(chs), y = A.yin(m, SR, { fmin: Math.max(5, firingHz(def, def.idle) * 0.4), fmax: firingHz(def, def.red) * 1.6, thr: 0.35, start: 0.6, len: 0.8 });
    pts.push({ label, rpm, expected: firingHz(def, rpm), detected: y.f, confidence: y.confidence });
  }
  return { id, pts };
}
function loopBuffers() {
  const off = new OfflineAudioContext(1, 1, SR), out = [];
  for (const t of ['white', 'pink', 'brown']) out.push(['noise.' + t, A.bufferSeam(noiseBuffer(off, t).getChannelData(0))]);
  for (const [k, d] of [['ticks', 350], ['ticks', 1600], ['crackle', 60], ['crackle', 900], ['crunch', 200]]) out.push([`texture.${k}.${d}`, A.bufferSeam(textureBuffer(off, k, d).getChannelData(0))]);
  return out;
}
async function scene() {
  const spec = { env: { region: 'city', district: 'city.oldtown', timeOfDay: 12, weather: { type: 'clear', intensity: 0 } }, music: 'mus.city.day', engine: { id: 'eng.car_i4', params: { rpm: 2500, load: 0.4 } },
    oneshots: [[1, 'sfx.step.asphalt'], [2.5, 'sfx.door.open'], [4, 'amb.once.car_horn'], [6, 'sfx.money.cash_register'], [8, 'amb.once.bird_song_a'], [10, 'sfx.ui.notify']] };
  const r = await Audio.renderScene(spec, 14);
  const b = A.basic(r.channels, SR);
  // concurrency: beds + engine + 2 s of music + all six one-shots inside the same 2 s window (nodes alive at once, worst case)
  const c = await Audio.renderScene({ ...spec, oneshots: spec.oneshots.map(([t, id], i) => [0.1 + i * 0.25, id]) }, 2);
  return { peak: b.peak, rmsDb: 20 * Math.log10(b.rms), nodesTotal14s: r.nodes, nodes: c.nodes, bad: b.bad };
}
window.T = { Audio, SOUNDS, SOUND_BY_ID, REQUIRED_IDS, PATCHES, ENGINES, measure, engineSweep, loopBuffers, scene, ready: true };
