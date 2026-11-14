// Audio engine facade (MASTER_SPEC 5.8, Annex E). WebAudio synthesis only: no samples, no AudioWorklet, no ScriptProcessor.
// Contract API (exact): init, play, loop, setListener, setEnvironment, music.setContext, setBusGain, setVoiceLimit, renderOffline.
// Additive (recorded in docs/DECISIONS.md): attach(), update(), stats(), music.sting(), emitters.add/remove, duck(), renderScene().
import { SOUND_BY_ID } from '../data/sounds.js';
import { PATCHES } from './patches/index.js';
import { createMixer, BUSES } from './buses.js';
import { createVoicePool } from './voices.js';
import { createPanner, setPos, distanceGain } from './spatial.js';
import { createAmbienceManager, reverbFor, busFilters, ambienceTargets } from './environment.js';
import { createSequencer } from './music/sequencer.js';
import { createRenderCache } from './synth/render.js';
import { ctxCache, mulberry, noiseBuffer, reseed } from './synth/noise.js';
import { textureBuffer, textureData } from './synth/grain.js';
import { noiseData } from './synth/noise.js';
import { SUITES, STINGS } from './music/suites.js';
import { log } from '../core/log.js';

const SR = 44100;
const dummyLoop = Object.freeze({ set() {}, stop() {}, setPos() {} });
const VEH_ENGINE = {
  'veh.sedan': 'eng.car_i4', 'veh.hatch_used': 'eng.car_i4', 'veh.taxi': 'eng.car_i4', 'veh.pickup': 'eng.car_v6', 'veh.coupe': 'eng.car_v6', 'veh.van': 'eng.van_diesel',
  'veh.boxtruck': 'eng.truck_diesel', 'veh.logtruck': 'eng.truck_diesel', 'veh.moto_125': 'eng.moto_small', 'veh.moto_cafe': 'eng.moto_twin', 'veh.forklift': 'eng.forklift', 'veh.utv': 'eng.forklift',
  'boat.rowboat': 'eng.outboard', 'boat.skiff': 'eng.outboard', 'boat.console': 'eng.outboard', 'boat.trawler': 'eng.boat_diesel', 'boat.workboat': 'eng.boat_diesel', 'boat.ferry': 'eng.boat_diesel',
};
const ENGINE_RANGE = { 'eng.car_i4': [800, 6500], 'eng.car_v6': [750, 7000], 'eng.van_diesel': [800, 4500], 'eng.truck_diesel': [650, 2800], 'eng.moto_small': [1400, 9000], 'eng.moto_twin': [1100, 7500], 'eng.forklift': [1000, 3600], 'eng.outboard': [900, 5500], 'eng.boat_diesel': [450, 1800], 'eng.chainsaw': [2800, 12000] };

let ctx = null, mixer = null, amb = null, ready = false, initP = null, settings = null, bus = null;
const pool = createVoicePool(32);
const slots = new Array(48).fill(null); // {vg, panner, src, hrtf}
const listener = { pos: [0, 0, 0], fwd: [0, 0, -1], up: [0, 1, 0] };
const warned = new Set();
const cache = createRenderCache({ sampleRate: SR });
let hrtfInUse = 0, voiceLimit = 32, envState = { region: 'city', district: '', interior: null, timeOfDay: 8, weather: { type: 'clear', intensity: 0 }, wetness: 0, underwater: false, speed: 0 };
let music = { cur: null, old: [], key: '', ctxReq: { mode: 'silent' } };
const emitters = new Map(); let emitterSeq = 1, emitterAcc = 0;
let deps = { getVehicle: null, getPlayerPos: null, getTime: null };
// warm-up: noise and texture buffers generated one per update after init, so the first bed or weather change does not hitch
const warm = [];
// texture loops used by the patches: [kind, density, seed]
const TEXTURES = [['ticks', 350, 3], ['ticks', 350, 7], ['ticks', 1600, 3], ['ticks', 1600, 7], ['crackle', 700, 5], ['crackle', 60, 9], ['crackle', 900, 5], ['crackle', 500, 5], ['crunch', 200, 5], ['crunch', 400, 5], ['crunch', 60, 5]];
const upMax = { ambience: 0, emitters: 0, music: 0, prerender: 0 }; // worst single-update cost per part (ms)
let player = { eng: null, tyre: null, wind: null, wake: null, vehId: null, lastSpeed: 0, acc: 0 };

function warnOnce(id, why) { if (warned.has(id)) return; warned.add(id); log.info(`[audio] ${id}: ${why}`); }
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function freeSlot(i) {
  const s = slots[i]; if (!s) return;
  slots[i] = null;
  if (s.hrtf) hrtfInUse--;
  try { if (s.stop) s.stop(); else if (s.src) s.src.stop(); } catch (e) { /* stopped */ }
  try { s.vg.disconnect(); if (s.panner) s.panner.disconnect(); } catch (e) { /* gone */ }
}
function routeFor(rec, pos, g) {
  const vg = ctx.createGain(); vg.gain.value = g;
  let panner = null, hrtf = false;
  if (rec.spatial && pos) { hrtf = !!(settings && settings.audio.hrtf) && hrtfInUse < 6; if (hrtf) hrtfInUse++; panner = createPanner(ctx, rec, pos, hrtf); vg.connect(panner); panner.connect(mixer.input(rec.bus)); }
  else vg.connect(mixer.input(rec.bus));
  return { vg, panner, hrtf };
}
function oneShotFn(id) { const p = PATCHES[id]; return (c, o, t) => p(c, o, t, { pitch: 1, params: {}, rng: mulberry(id.length * 31 + 7) }); }

function startLoopRaw(id, dest, params = {}) {
  const rec = SOUND_BY_ID[id], p = PATCHES[id];
  if (!rec || !p) { warnOnce(id, 'no patch (stub)'); return null; }
  const h = p(ctx, dest, ctx.currentTime + 0.01, { pitch: 1, params, rng: Math.random });
  return h && h.set ? h : null;
}

function setEnv(env) {
  envState = { ...envState, ...env };
  if (!ready) return;
  amb.setEnvironment(envState);
  mixer.setReverb(reverbFor(envState));
  const f = busFilters(envState);
  for (const b of ['ambience', 'sfx', 'vehicles', 'music']) mixer.setLowpass(b, f[b]);
}

function musicId(c) {
  if (!c || c.mode === 'silent') return '';
  if (c.mode === 'menu') return 'mus.menu';
  const id = `mus.${c.region || 'city'}.${c.night ? 'night' : 'day'}`;
  return SUITES[id] ? id : 'mus.city.day';
}
function setMusicContext(c) {
  music.ctxReq = { ...music.ctxReq, ...c };
  if (!ready) return;
  const id = musicId(music.ctxReq), layer = music.ctxReq.activity === 'work' ? 'mus.layer.work' : music.ctxReq.activity === 'drive' ? 'mus.layer.drive' : null;
  const key = id + '|' + layer;
  if (key === music.key) return;
  music.key = key;
  const now = ctx.currentTime, cur = music.cur;
  const at = cur && !cur.stopped ? Math.max(now + 0.05, cur.nextBar(now)) : now + 0.1;
  const beat = cur ? cur.barDur / 4 : 0.7;
  if (cur) { cur.fadeOut(at, beat * 4); music.old.push({ seq: cur, until: at + beat * 4 + 0.5 }); }
  music.cur = null;
  if (!id) return;
  const seq = createSequencer(ctx, mixer.input('music'), id, { seed: (Math.random() * 1e6) | 0, layer, start: at, night: !!music.ctxReq.night });
  seq.fadeIn(at, cur ? beat * 4 : 1.5);
  music.cur = seq;
}

function attachEvents(b) {
  const on = (t, f) => b.on(t, f);
  on('player:region', (p) => { setEnv({ region: p.to }); setMusicContext({ region: p.to }); });
  on('player:district', (p) => setEnv({ district: p.to }));
  on('player:interior', (p) => setEnv({ interior: p.interiorId }));
  on('env:weather', (p) => setEnv({ weather: { type: p.type, intensity: p.intensity } }));
  on('env:phase', (p) => setMusicContext({ night: p.phase === 'night' }));
  on('time:hour', (p) => { setEnv({ timeOfDay: deps.getTime ? deps.getTime() : p.hour }); setMusicContext({ night: p.hour >= 20 || p.hour < 6 }); });
  on('player:step', (p) => { const s = String(p.surface || 'surf.concrete').replace('surf.', ''); Audio.play('sfx.step.' + s, { pos: deps.getPlayerPos ? deps.getPlayerPos() : listener.pos, gain: Math.min(1, 0.5 + (p.speed || 2) / 8) }); });
  on('veh:enter', (p) => startPlayerVehicle(p.vehId));
  on('veh:exit', () => stopPlayerVehicle());
  on('veh:collision', (p) => { const pos = deps.getPlayerPos ? deps.getPlayerPos() : listener.pos; if ((p.impulse || 0) > 6) Audio.play('sfx.veh.crash_heavy', { pos }); else if ((p.impulse || 0) > 1.5) Audio.play('sfx.veh.crash_light', { pos }); });
  on('skill:levelUp', () => { Audio.play('sfx.level_up'); Audio.music.sting('mus.sting.levelup'); });
  on('job:taskDone', (p) => Audio.play(p.score >= 0.95 ? 'sfx.job.task_perfect' : p.score > 0 ? 'sfx.job.task_ok' : 'sfx.job.task_fail'));
  on('job:shiftStart', () => { Audio.play('sfx.job.shift_start'); setMusicContext({ activity: 'work' }); });
  on('job:shiftEnd', () => { Audio.play('sfx.job.shift_end'); setMusicContext({ activity: 'idle' }); });
  on('biz:created', () => Audio.music.sting('mus.sting.business_open'));
  on('ui:open', () => { if (ready) mixer.setLowpass('music', 2500); });
  on('ui:close', () => { if (ready) mixer.setLowpass('music', busFilters(envState).music); });
  on('settings:changed', (p) => { if (p && String(p.path).startsWith('audio.')) applySettings(); });
}
function applySettings() {
  if (!settings || !ready) return;
  const a = settings.audio;
  mixer.setBusGain('master', a.master);
  for (const b of BUSES) mixer.setBusGain(b, a[b]);
  mixer.setReverbEnabled(a.reverb);
  Audio.setVoiceLimit(a.voiceLimit);
}

function startPlayerVehicle(vehId) {
  if (!ready) return;
  stopPlayerVehicle();
  const v = deps.getVehicle ? deps.getVehicle() : null;
  const arch = v ? v.archetype : 'veh.sedan';
  const engId = VEH_ENGINE[arch] || 'eng.car_i4';
  const pos = deps.getPlayerPos ? deps.getPlayerPos() : listener.pos;
  const boat = arch.startsWith('boat.');
  Audio.play(boat ? 'sfx.boat.cleat' : 'sfx.veh.door_close', { pos });
  player.vehId = vehId; player.engId = engId; player.boat = boat;
  player.eng = Audio.loop(engId, { pos, params: { rpm: ENGINE_RANGE[engId][0], load: 0, interior: boat ? 0 : 1 } });
  if (boat) player.wake = Audio.loop('sfx.boat.wake', { pos, params: { speed: 0 } });
  else { player.tyre = Audio.loop('sfx.veh.tyre_roll', { pos, params: { speed: 0 } }); player.wind = Audio.loop('sfx.veh.wind', { pos, params: { speed: 0 } }); }
  setEnv({ inVehicle: !boat, onBoat: boat });
  setMusicContext({ activity: 'drive' });
}
function stopPlayerVehicle() {
  for (const k of ['eng', 'tyre', 'wind', 'wake']) if (player[k]) { player[k].stop(0.4); player[k] = null; }
  if (player.vehId != null) { const pos = deps.getPlayerPos ? deps.getPlayerPos() : listener.pos; Audio.play(player.boat ? 'sfx.boat.dock_bump' : 'sfx.veh.door_close', { pos }); player.vehId = null; setEnv({ inVehicle: false, onBoat: false }); setMusicContext({ activity: 'idle' }); }
}
function updatePlayerVehicle(dt) {
  if (!player.eng || !deps.getVehicle) return;
  player.acc += dt; if (player.acc < 0.05) return; // 20 Hz parameter updates
  const v = deps.getVehicle(); if (!v) return;
  const step = player.acc; player.acc = 0;
  const sp = Math.abs(v.speed || 0), accel = (sp - player.lastSpeed) / step; player.lastSpeed = sp;
  const [idle, red] = ENGINE_RANGE[player.engId];
  const load = Math.max(0, Math.min(1, v.throttle != null ? v.throttle : accel / 3 + 0.15));
  const rpm = idle + Math.max(0, Math.min(1, v.rpm != null ? v.rpm : sp / 30)) * (red - idle);
  player.eng.set('rpm', rpm); player.eng.set('load', load); player.eng.set('speed', sp);
  const pos = deps.getPlayerPos ? deps.getPlayerPos() : listener.pos;
  for (const k of ['eng', 'tyre', 'wind', 'wake']) if (player[k]) { player[k].setPos(pos); if (k !== 'eng') player[k].set('speed', sp); }
  if (ready) amb.setParam('speed', sp);
}

function updateEmitters(dt) {
  emitterAcc += dt; if (emitterAcc < 0.5) return; emitterAcc = 0;
  for (const e of emitters.values()) {
    const rec = SOUND_BY_ID[e.id]; if (!rec) continue;
    const d = dist3(listener.pos, e.pos);
    if (!e.h && d < rec.maxDistance) { e.h = Audio.loop(e.id, { pos: e.pos }); emitterAcc = 0.45; return; } // one graph build per update (hitch rule)
    else if (e.h && d > rec.maxDistance * 1.1) { e.h.stop(1); e.h = null; }
  }
}

export const Audio = {
  /** call inside a user gesture; resolves when running; safe to call twice */
  init() {
    if (initP) { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); return initP; }
    initP = new Promise((resolve) => {
      const AC = typeof AudioContext !== 'undefined' ? AudioContext : (typeof window !== 'undefined' && window.webkitAudioContext);
      if (!AC) { warnOnce('init', 'WebAudio unavailable'); resolve(false); return; }
      try { ctx = new AC({ latencyHint: 'interactive', sampleRate: SR }); } catch (e) { try { ctx = new AC(); } catch (e2) { warnOnce('init', 'AudioContext failed'); resolve(false); return; } }
      mixer = createMixer(ctx, { reverb: settings ? settings.audio.reverb : true });
      amb = createAmbienceManager({ ctx, out: (b) => mixer.input(b), startLoop: startLoopRaw, play: (id, o) => Audio.play(id, o) });
      for (const t of ['brown', 'pink', 'white']) warm.push(() => noiseBuffer(ctx, t));
      for (const [k, d, sd] of TEXTURES) warm.push(() => textureBuffer(ctx, k, d, 4, sd));
      ready = true;
      pool.setLimit(voiceLimit);
      applySettings();
      setEnv({});
      if (bus) bus.emit('audio:ready', {});
      const done = () => resolve(true);
      const unlock = () => { if (ctx.state !== 'running') ctx.resume().catch(() => {}); if (ctx.state === 'running') remove(); };
      const remove = () => { if (typeof window !== 'undefined') { window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); } };
      ctx.onstatechange = () => { if (ctx.state === 'running') { remove(); done(); } };
      if (ctx.state === 'running') done();
      else {
        ctx.resume().then(() => { if (ctx.state === 'running') done(); }).catch(() => {});
        if (typeof window !== 'undefined') { window.addEventListener('pointerdown', unlock, true); window.addEventListener('keydown', unlock, true); }
      }
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
        if (!ctx) return;
        if (document.hidden && (!settings || settings.audio.muteOnBlur)) ctx.suspend().catch(() => {});
        else if (!document.hidden && ctx.state === 'suspended') ctx.resume().catch(() => {});
      });
    });
    return initP;
  },
  /** generates noise and texture sample data (no AudioContext needed): call at boot behind the loading screen. Returns ms. */
  prewarm() {
    const P = typeof performance !== 'undefined' ? performance : Date, t = P.now();
    for (const ty of ['brown', 'pink', 'white']) noiseData(ty, SR);
    for (const [k, d, sd] of TEXTURES) textureData(k, d, 4, sd, SR);
    return P.now() - t;
  },
  /** wires bus events and game read-only accessors: { bus, settings, getVehicle(), getPlayerPos(), getTime() } */
  attach({ bus: b, settings: s, getVehicle = null, getPlayerPos = null, getTime = null }) {
    bus = b; settings = s; deps = { getVehicle, getPlayerPos, getTime };
    if (s) voiceLimit = s.audio.voiceLimit;
    if (b) attachEvents(b);
  },
  /** one-shot -> VoiceHandle {stop()} | null */
  play(soundId, { pos = null, entityId = null, gain = 1, pitch = 1, params = null } = {}) {
    if (!ready) return null;
    const rec = SOUND_BY_ID[soundId];
    if (!rec) { warnOnce(soundId, 'unknown sound id'); return null; }
    if (rec.kind === 'sting') { Audio.music.sting(soundId); return null; }
    const patch = PATCHES[soundId];
    if (!patch || rec.kind !== 'oneshot') { warnOnce(soundId, patch ? 'not a one-shot' : 'no patch (stub)'); return null; }
    let lvl = gain;
    if (rec.spatial && pos) { const d = dist3(listener.pos, pos); if (d > rec.maxDistance) return null; lvl *= distanceGain(d, rec.refDistance, rec.maxDistance); }
    const now = ctx.currentTime, t = now + 0.005;
    const req = pool.request(rec.priority, lvl, now + rec.seconds * 1.2 + 0.2);
    if (!req) return null;
    if (req.stolen >= 0) freeSlot(req.stolen);
    const vary = Math.pow(10, (Math.random() * 4 - 2) / 20); // +-2 dB
    const r = routeFor(rec, pos, gain * vary);
    const buf = cache.get(soundId);
    let src = null;
    if (buf) {
      const ab = ctx.createBuffer(1, buf.length, SR); ab.copyToChannel(buf, 0);
      src = ctx.createBufferSource(); src.buffer = ab; src.playbackRate.value = pitch * (1 + (Math.random() - 0.5) * 0.12); src.connect(r.vg); src.start(t);
    } else {
      patch(ctx, r.vg, t, { pitch, params: params || {}, rng: Math.random });
      cache.enqueue(soundId, oneShotFn(soundId), rec.seconds * 1.2 + 0.1);
    }
    slots[req.slot] = { ...r, src, serial: req.serial };
    if (soundId === 'sfx.veh.crash_heavy' || soundId === 'amb.once.thunder') { mixer.duck('ambience', 4, 0.05, 1.0, 0.45); mixer.duck('music', 4, 0.05, 1.0, 0.45); }
    void entityId;
    const slot = req.slot, serial = req.serial;
    return { id: soundId, stop() { if (pool.release(slot, serial)) freeSlot(slot); } };
  },
  /** loop -> LoopHandle {set(param, value, ramp?), stop(fadeSec?), setPos(pos)} (dummy before init) */
  loop(soundId, { pos = null, entityId = null, gain = 1, params = null } = {}) {
    if (!ready) return dummyLoop;
    const rec = SOUND_BY_ID[soundId], patch = PATCHES[soundId];
    if (!rec || !patch || (rec.kind !== 'loop' && rec.kind !== 'engine')) { warnOnce(soundId, !rec ? 'unknown sound id' : 'no loop patch (stub)'); return dummyLoop; }
    let lvl = gain;
    if (rec.spatial && pos) lvl *= distanceGain(dist3(listener.pos, pos), rec.refDistance, rec.maxDistance);
    const req = pool.request(rec.priority, lvl, Infinity);
    if (!req) return dummyLoop;
    if (req.stolen >= 0) freeSlot(req.stolen);
    const r = routeFor(rec, pos, gain);
    const h = patch(ctx, r.vg, ctx.currentTime + 0.01, { pitch: 1, params: params || {}, rng: Math.random });
    const slot = req.slot, serial = req.serial;
    let alive = true;
    slots[slot] = { ...r, serial, stop: () => { if (alive) { alive = false; h.stop(ctx.currentTime, 0.1); } } };
    void entityId;
    return {
      set(param, value, ramp) { if (alive) h.set(param, value, ramp); },
      stop(fadeSec = 0.3) { if (!alive) return; alive = false; h.stop(ctx.currentTime, fadeSec); const vg = r.vg, pn = r.panner; setTimeout(() => { if (pool.release(slot, serial)) { if (slots[slot] && slots[slot].serial === serial) { slots[slot] = null; if (r.hrtf) hrtfInUse--; } try { vg.disconnect(); if (pn) pn.disconnect(); } catch (e) { /* gone */ } } }, fadeSec * 1000 + 300); },
      setPos(p) { if (alive && r.panner && p) setPos(r.panner, p); },
      get schedule() { return h.schedule; },
    };
  },
  setListener(pos, forward, up) {
    listener.pos[0] = pos[0]; listener.pos[1] = pos[1]; listener.pos[2] = pos[2];
    if (forward) { listener.fwd[0] = forward[0]; listener.fwd[1] = forward[1]; listener.fwd[2] = forward[2]; }
    if (up) { listener.up[0] = up[0]; listener.up[1] = up[1]; listener.up[2] = up[2]; }
    if (!ready) return;
    const L = ctx.listener, t = ctx.currentTime, f = listener.fwd, u = listener.up;
    if (L.positionX) { L.positionX.setTargetAtTime(pos[0], t, 0.02); L.positionY.setTargetAtTime(pos[1], t, 0.02); L.positionZ.setTargetAtTime(pos[2], t, 0.02); L.forwardX.setTargetAtTime(f[0], t, 0.02); L.forwardY.setTargetAtTime(f[1], t, 0.02); L.forwardZ.setTargetAtTime(f[2], t, 0.02); L.upX.setTargetAtTime(u[0], t, 0.02); L.upY.setTargetAtTime(u[1], t, 0.02); L.upZ.setTargetAtTime(u[2], t, 0.02); }
    else { L.setPosition(pos[0], pos[1], pos[2]); L.setOrientation(f[0], f[1], f[2], u[0], u[1], u[2]); }
    amb.setListener(pos);
  },
  setEnvironment(env) { setEnv(env || {}); },
  music: {
    setContext(c) { setMusicContext(c || {}); },
    /** stinger on bus:music; the running suite is ducked by 8 dB while it plays */
    sting(id) {
      if (!ready || !STINGS[id]) return;
      const now = ctx.currentTime, s = createSequencer(ctx, mixer.input('music'), id, { start: now + 0.05 });
      s.schedule(now);
      const len = (Math.max(...STINGS[id].notes.map((n) => n[0] + n[3])) * 60) / STINGS[id].tempo + 1;
      if (music.cur) { const g = music.cur.output.gain; g.setTargetAtTime(0.32, now, 0.05); g.setTargetAtTime(0.8, now + len, 0.3); }
    },
    get current() { return music.key; },
  },
  setBusGain(busName, value) { if (settings && settings.audio && busName in settings.audio) settings.audio[busName] = value; if (ready) mixer.setBusGain(busName, value); },
  setVoiceLimit(n) {
    voiceLimit = [16, 24, 32, 48].includes(n) ? n : Math.max(8, Math.min(48, n | 0));
    pool.setLimit(voiceLimit);
    if (!ready) return;
    // shrink: stop the lowest-priority, oldest voices until within the limit
    while (pool.count > pool.limit) { let v = -1, lp = 99; for (let i = 0; i < slots.length; i++) if (slots[i] && pool.isActive(i) && pool.priorityOf(i) < lp) { lp = pool.priorityOf(i); v = i; } if (v < 0) break; pool.release(v); freeSlot(v); }
  },
  duck(busName, db, attack, hold, release) { if (ready) mixer.duck(busName, db, attack, hold, release); },
  emitters: {
    add(id, pos) { const k = emitterSeq++; emitters.set(k, { id, pos: pos.slice(), h: null }); emitterAcc = 1; return k; },
    remove(k) { const e = emitters.get(k); if (e && e.h) e.h.stop(1); emitters.delete(k); },
    get size() { return emitters.size; },
  },
  /** per frame (main loop): voices, ducks, ambience beds/schedulers, emitters, music lookahead, player vehicle params, pre-render queue */
  update(dt) {
    if (!ready || ctx.state !== 'running') return;
    const now = ctx.currentTime, P = typeof performance !== 'undefined' ? performance : Date;
    if (warm.length) { warm.shift()(); return; } // startup frames: one buffer per frame, nothing else yet
    let t0 = P.now(), t1;
    pool.expire(now, freeSlot);
    mixer.update(now);
    amb.update(dt); t1 = P.now(); if (t1 - t0 > upMax.ambience) upMax.ambience = t1 - t0; t0 = t1;
    updateEmitters(dt); updatePlayerVehicle(dt); t1 = P.now(); if (t1 - t0 > upMax.emitters) upMax.emitters = t1 - t0; t0 = t1;
    if (music.cur) music.cur.schedule(now, now + 0.2);
    for (let i = music.old.length - 1; i >= 0; i--) { const o = music.old[i]; if (now > o.until) { o.seq.stop(now); music.old.splice(i, 1); } else o.seq.schedule(now, Math.min(o.until, now + 0.2)); }
    t1 = P.now(); if (t1 - t0 > upMax.music) upMax.music = t1 - t0; t0 = t1;
    cache.pump(); t1 = P.now(); if (t1 - t0 > upMax.prerender) upMax.prerender = t1 - t0;
  },
  stats() {
    return { ready, state: ctx ? ctx.state : 'none', voices: pool.count, voiceLimit: pool.limit, bufferBytes: cache.bytes + (ctx ? ctxCache(ctx).bytes : 0), cachedOneShots: cache.size, prerenderQueue: cache.queued, beds: amb ? amb.beds.size : 0, music: music.key, reverb: mixer ? mixer.reverb : null, emitters: emitters.size, updateMaxMs: { ...upMax } };
  },
  get context() { return ctx; },
  get ready() { return ready; },

  /** offline render for tests (MASTER_SPEC 5.8) -> Promise<Float32Array[]> (stereo). `.notes` carries the music note log. */
  async renderOffline(soundId, seconds, params = null) {
    const rec = SOUND_BY_ID[soundId];
    const n = Math.max(1, Math.ceil(seconds * SR));
    const off = new OfflineAudioContext(2, n, SR);
    let notes = null;
    let h = 7; for (let i = 0; i < soundId.length; i++) h = (h * 31 + soundId.charCodeAt(i)) >>> 0; reseed(h); // reproducible renders
    if (soundId.startsWith('mus.')) {
      const seq = createSequencer(off, off.destination, soundId, { seed: (params && params.seed) || 1, loopPieces: false, start: 0, night: soundId.includes('.night') });
      seq.schedule(0, seconds); notes = seq.notes;
    } else {
      const patch = PATCHES[soundId];
      if (!rec || !patch) throw new Error('no patch for ' + soundId);
      const o = { pitch: 1, params: params || {}, rng: mulberry(soundId.length * 131 + 3) };
      if (rec.kind === 'oneshot') patch(off, off.destination, 0.01, o);
      else { const h = patch(off, off.destination, 0, o); if (h.schedule) h.schedule(0, seconds); }
    }
    const buf = await off.startRendering();
    const out = [buf.getChannelData(0), buf.getChannelData(1)];
    if (notes) out.notes = notes;
    return out;
  },
  /**
   * Full mix offline (Annex E 8 "Mix" and "Budget"): environment beds + one-shots + engine + music through the real mixer and limiter.
   * spec = { env, music, engine:{id, params}, oneshots:[[t, id], ...] }. Returns { channels, nodes }.
   */
  async renderScene(spec, seconds) {
    const off = new OfflineAudioContext(2, Math.ceil(seconds * SR), SR);
    let nodes = 0;
    for (const k of Object.getOwnPropertyNames(BaseAudioContext.prototype)) if (k.startsWith('create') && k !== 'createBuffer' && k !== 'createPeriodicWave') { const f = off[k]; if (typeof f === 'function') off[k] = (...a) => { nodes++; return f.apply(off, a); }; }
    const mx = createMixer(off, { reverb: true });
    mx.setBusGain('master', 0.8);
    for (const b of BUSES) mx.setBusGain(b, { music: 0.6, ambience: 0.8, sfx: 0.9, vehicles: 0.8, ui: 0.7 }[b]);
    mx.setReverb(reverbFor(spec.env || {}));
    const opts = (id) => ({ pitch: 1, params: {}, rng: mulberry(id.length * 17 + 1) });
    const T = ambienceTargets(spec.env || {});
    for (const [id, lvl] of Object.entries(T)) { const g = off.createGain(); g.gain.value = lvl; g.connect(mx.input('ambience')); const h = PATCHES[id](off, g, 0, opts(id)); if (h.schedule) h.schedule(0, seconds); }
    if (spec.engine) { const h = PATCHES[spec.engine.id](off, mx.input('vehicles'), 0, { ...opts(spec.engine.id), params: spec.engine.params || {} }); void h; }
    if (spec.music) { const seq = createSequencer(off, mx.input('music'), spec.music, { seed: 3, loopPieces: false, start: 0 }); seq.schedule(0, seconds); }
    for (const [t, id] of spec.oneshots || []) { const rec = SOUND_BY_ID[id]; PATCHES[id](off, mx.input(rec.bus), t, opts(id)); }
    const buf = await off.startRendering();
    return { channels: [buf.getChannelData(0), buf.getChannelData(1)], nodes };
  },
  /** test helper: pre-render every implemented one-shot into the cache; returns {bytes, count} */
  async prerenderAll() {
    const ids = Object.keys(PATCHES).filter((id) => SOUND_BY_ID[id] && SOUND_BY_ID[id].kind === 'oneshot');
    for (const id of ids) await cache.render(id, oneShotFn(id), SOUND_BY_ID[id].seconds * 1.2 + 0.1);
    return { bytes: cache.bytes, count: cache.size, total: ids.length, max: cache.maxBytes };
  },
};
