// Audio pure logic (Node): voice limiting, ducking, spatial math, environment rules, music theory/sequencer, data
// coverage, and a self-test of the analysis functions on synthetic signals (so the offline-render checks are trustworthy).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoicePool, createDuckState } from '../../src/audio/voices.js';
import { distanceGain, dopplerCents, occlusion } from '../../src/audio/spatial.js';
import { ambienceTargets, schedulerRates, reverbFor, busFilters, trafficHour } from '../../src/audio/environment.js';
import { SUITES, STINGS, inScale, chord, degree } from '../../src/audio/music/suites.js';
import { planBar, pieceForm } from '../../src/audio/music/sequencer.js';
import { mulberry, fillNoise } from '../../src/audio/synth/noise.js';
import { SOUNDS, REQUIRED_IDS, SOUND_BY_ID } from '../../src/data/sounds.js';
import { ENGINES, firingHz } from '../../src/audio/synth/engine.js';
import * as A from './analysis.mjs';

test('voice pool: fills to the limit, steals the quietest of the lowest class, never a higher class', () => {
  const p = createVoicePool(4);
  const a = p.request(2, 0.5, 10), b = p.request(2, 0.1, 10), c = p.request(4, 0.2, 10), d = p.request(5, 0.9, 10);
  assert.ok(a && b && c && d && a.stolen === -1 && d.stolen === -1);
  assert.equal(p.count, 4);
  const e = p.request(3, 1.0, 10); // lowest class is 2 -> steal its quietest voice (b)
  assert.equal(e.stolen, b.slot);
  const f = p.request(1, 1.0, 10); // ambient one-shot cannot steal class 2+
  assert.equal(f, null);
  const g = p.request(2, 0.3, 10); // same class as the lowest (a, 0.5) -> steals a
  assert.equal(g.stolen, a.slot);
  assert.equal(p.count, 4);
});
test('voice pool: expiry, release by serial, limit change', () => {
  const p = createVoicePool(16);
  const v = []; for (let i = 0; i < 16; i++) v.push(p.request(2, 0.5, i < 8 ? 1 : Infinity));
  const freed = []; p.expire(2, (s) => freed.push(s));
  assert.equal(freed.length, 8); assert.equal(p.count, 8);
  assert.equal(p.release(v[8].slot, v[8].serial + 99), false, 'stale serial ignored');
  assert.equal(p.release(v[8].slot, v[8].serial), true);
  p.setLimit(48); assert.equal(p.limit, 48);
  for (let i = 0; i < 100; i++) p.request(4, Math.random(), Infinity);
  assert.equal(p.count, 48);
});
test('ducking: attack/hold/release envelope, deepest wins, expired ducks removed', () => {
  const d = createDuckState();
  d.add('music', 8, 0.1, 1.0, 0.5, 0);
  assert.equal(d.levelAt('music', 0), 0);
  assert.ok(Math.abs(d.levelAt('music', 0.05) + 4) < 1e-9);
  assert.equal(d.levelAt('music', 0.5), -8);
  assert.ok(Math.abs(d.levelAt('music', 1.35) + 4) < 1e-9);
  assert.equal(d.levelAt('ambience', 0.5), 0);
  d.add('music', 4, 0.01, 3, 0.1, 0.5);
  assert.equal(d.levelAt('music', 0.6), -8, 'deepest of concurrent ducks');
  assert.equal(d.levelAt('music', 2.0), -4);
  d.levelAt('music', 10); assert.equal(d.size, 0);
});
test('spatial: inverse distance gain, doppler clamp, occlusion', () => {
  assert.equal(distanceGain(1, 1, 100), 1);
  assert.ok(Math.abs(distanceGain(10, 1, 100) - 0.1) < 1e-9);
  assert.equal(distanceGain(1000, 1, 100), distanceGain(100, 1, 100));
  assert.ok(dopplerCents(0, 20) > 90 && dopplerCents(0, 20) < 110);
  assert.ok(dopplerCents(0, -20) < -90);
  assert.equal(dopplerCents(0, 300), 300); assert.equal(dopplerCents(-300, 0), -300);
  assert.deepEqual(occlusion('int.diner', null), { gainDb: -9, lowpass: 900 });
  assert.equal(occlusion(null, null).gainDb, 0);
});
test('environment rules (Annex E 5): beds by region, time, weather, interior', () => {
  const day = ambienceTargets({ region: 'city', district: 'city.downtown', timeOfDay: 12, weather: { type: 'clear', intensity: 0 } });
  assert.ok(day['amb.city.traffic_hum'] > 0.7 && day['amb.city.crowd'] > 0 && day['amb.city.hvac'] > 0 && day['amb.wind.open'] > 0);
  assert.equal(day['amb.night.crickets'], undefined);
  const nightLake = ambienceTargets({ region: 'lake', district: 'lake.shore', timeOfDay: 23, weather: 'clear' });
  assert.ok(nightLake['amb.night.crickets'] && nightLake['amb.night.frogs'] && nightLake['amb.water.lake_lap']);
  const rain = ambienceTargets({ region: 'forest', district: 'forest.gate', timeOfDay: 22, weather: { type: 'rain', intensity: 0.3 } });
  assert.ok(rain['amb.rain.light'] && !rain['amb.night.crickets'] && !rain['amb.rain.heavy']);
  assert.ok(ambienceTargets({ region: 'forest', timeOfDay: 14, weather: { type: 'storm', intensity: 0.9 } })['amb.rain.heavy']);
  const ocean = ambienceTargets({ region: 'ocean', district: 'ocean.palmcove', timeOfDay: 10 }), harbour = ambienceTargets({ region: 'ocean', district: 'ocean.marina', timeOfDay: 10 });
  assert.ok(ocean['amb.water.ocean_waves'] > harbour['amb.water.ocean_waves'] && harbour['amb.water.harbor']);
  const inside = ambienceTargets({ region: 'city', district: 'city.oldtown', timeOfDay: 12, interior: 'int.diner' });
  assert.ok(inside['amb.interior.room'] === 1 && inside['amb.interior.diner'] && inside['amb.city.traffic_hum'] < 0.4);
  assert.equal(reverbFor({ interior: 'int.boathouse' }), 'ir.room_large'); assert.equal(reverbFor({ region: 'city' }), 'ir.city'); assert.equal(reverbFor({ region: 'forest' }), 'ir.forest');
  assert.equal(busFilters({ underwater: true }).sfx, 400); assert.equal(busFilters({ interior: 'int.diner' }).ambience, 1200); assert.equal(busFilters({ inVehicle: true }).trimDb, -4);
  for (const k of Object.keys({ ...day, ...nightLake, ...rain, ...ocean, ...inside })) assert.ok(SOUND_BY_ID[k], 'bed id exists: ' + k);
  assert.ok(trafficHour(3) < trafficHour(8));
});
test('scheduler rates (Annex E 5 table)', () => {
  const f = schedulerRates({ region: 'forest', district: 'forest.timberline', timeOfDay: 6 });
  assert.ok(Math.abs(f['amb.once.bird_song_a'] * 3 - 20) < 1e-9, 'forest 10/min x dawn 2');
  assert.equal(f['amb.once.crow'], 3);
  assert.equal(schedulerRates({ region: 'ocean', district: 'ocean.sea', timeOfDay: 12 })['amb.once.gull'], 6);
  assert.equal(schedulerRates({ region: 'lake', timeOfDay: 12, weather: { type: 'storm', intensity: 1 } })['amb.once.thunder'], 1.2);
  assert.deepEqual(schedulerRates({ region: 'city', interior: 'int.diner', timeOfDay: 12 }), {});
  for (const k of Object.keys(f)) assert.ok(SOUND_BY_ID[k]);
});
test('music: suites use the specified keys/modes/tempos; every generated pitched note is in the scale', () => {
  const spec = { 'mus.menu': [62, 'major', 84], 'mus.city.day': [65, 'major', 78], 'mus.city.night': [62, 'dorian', 64], 'mus.lake.day': [67, 'major', 92], 'mus.lake.night': [64, 'minor', 60], 'mus.ocean.day': [60, 'major', 104], 'mus.ocean.night': [69, 'minor', 66], 'mus.forest.day': [62, 'dorian', 70], 'mus.forest.night': [60, 'aeolian', 52] };
  for (const [id, [root, mode, tempo]] of Object.entries(spec)) {
    const s = SUITES[id]; assert.deepEqual([s.root, s.mode, s.tempo], [root, mode, tempo], id);
    const form = pieceForm(s), rng = mulberry(5), st = {};
    const barSec = (s.steps / 4) * 60 / s.tempo;
    assert.ok(form.length * barSec >= 110 && form.length * barSec <= 200, `${id} piece ${(form.length * barSec).toFixed(0)} s`);
    let pitched = 0, inside = 0;
    for (let b = 0; b < form.length; b++) for (const e of planBar(s, form, b, rng, st, null)) if (e.midi != null) { pitched++; if (inScale(s.root, s.mode, e.midi)) inside++; }
    assert.ok(pitched > 100 && inside === pitched, `${id}: ${inside}/${pitched}`);
  }
  assert.deepEqual(chord(60, 'major', 1, 4).map((m) => m - 60), [2, 5, 9, 12], 'ii7 in C');
  assert.equal(degree(60, 'major', 7), 72);
  for (const s of Object.values(STINGS)) for (const n of s.notes) assert.ok(inScale(s.root, s.mode, degree(s.root, s.mode, n[1])));
});
test('data: required ids (amb.*, mus.*, P0) listed; ids unique; records complete', () => {
  const ids = SOUNDS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(SOUNDS.length >= 190, 'about 190 ids: ' + SOUNDS.length);
  for (const s of SOUNDS) { assert.ok(['ui', 'sfx', 'vehicles', 'ambience', 'music'].includes(s.bus)); assert.ok(['P0', 'P1', 'P2'].includes(s.prio)); assert.ok(s.rms[0] < s.rms[1] && s.centroid[0] < s.centroid[1]); assert.ok(s.priority >= 1 && s.priority <= 5); }
  assert.ok(REQUIRED_IDS.length > 130);
  for (const id of ['eng.car_i4', 'eng.van_diesel', 'eng.outboard', 'sfx.ui.click', 'sfx.step.wood', 'sfx.fish.reel', 'sfx.kitchen.sizzle']) assert.ok(REQUIRED_IDS.includes(id));
  assert.equal(firingHz(ENGINES['eng.car_i4'], 6000), 200); assert.equal(firingHz(ENGINES['eng.outboard'], 3000), 100);
});
test('analysis self-test on synthetic signals', () => {
  const sr = 44100, n = sr, sine = (f, a = 0.5) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = a * Math.sin(2 * Math.PI * f * i / sr); return x; };
  const s1k = sine(1000);
  assert.ok(Math.abs(A.centroid(s1k, sr) - 1000) < 40);
  const b = A.basic([s1k, s1k], sr);
  assert.ok(Math.abs(b.rms - 0.5 / Math.SQRT2) < 1e-3 && Math.abs(b.peak - 0.5) < 1e-3 && Math.abs(b.dc) < 1e-4);
  const y = A.yin(sine(110), sr, { fmin: 30, fmax: 400, start: 0.1, len: 0.5 });
  assert.ok(Math.abs(y.f - 110) < 1);
  // harmonic-rich with weak sub-octave: YIN reports the fundamental, not the sub
  const h = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; h[i] = 0.5 * Math.sin(2 * Math.PI * 80 * t) + 0.25 * Math.sin(2 * Math.PI * 160 * t) + 0.05 * Math.sin(2 * Math.PI * 40 * t); }
  assert.ok(Math.abs(A.yin(h, sr, { fmin: 20, fmax: 300, thr: 0.35, start: 0.1, len: 0.5 }).f - 80) < 2);
  // onsets: 10 clicks
  const c = new Float32Array(n); for (let k = 0; k < 10; k++) for (let i = 0; i < 300 && Math.floor(k * n / 10) + 3000 + i < n; i++) c[Math.floor(k * n / 10) + 3000 + i] = Math.sin(i * 0.3) * Math.exp(-i / 60);
  assert.equal(A.onsets(c, sr), 10);
  // seam: seamless noise vs a buffer with an injected step
  const w = fillNoise(new Float32Array(sr * 2), 'brown', 3, sr);
  assert.ok(A.bufferSeam(w).excess < 0.02);
  const bad = w.slice(); for (let i = bad.length - 32; i < bad.length; i++) bad[i] += 0.5; // level mismatch across the wrap assert.ok(A.bufferSeam(bad).excess > 0.02);
  assert.ok(Math.abs(A.seamDb(s1k, sr, 0.25)) < 0.1);
});
