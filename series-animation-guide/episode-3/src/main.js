// Episode 3 page: window.renderFrame(i, {scale}) -> JPEG data URL. Every frame is a pure function of the frame index.
import * as THREE from 'three';
import { makeRenderer, makeCamera, lookFrom, aimKey } from '../../assets/library/stage.js';
import * as TL from './timeline.js';
import * as HUD from './hud.js';
import { updateNature } from '../../assets/library/props/nature.js';
import { CLOCK } from '../../assets/library/character.js';

const q = new URLSearchParams(location.search);
const SCALE = parseFloat(q.get('scale') || '1');
const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE);
// one visible canvas (VideoHub reads it directly); WebGL draws off-screen and is composited into it
const gl = new OffscreenCanvas(W, H), out = document.getElementById('out');
document.getElementById('gl')?.remove();
out.width = W; out.height = H;
const renderer = makeRenderer(gl, W, H);
const camera = makeCamera(W, H, 45);
const g2 = out.getContext('2d');
await document.fonts.load('100px Anton'); await document.fonts.load('800 40px Inter');

// ---- audio-derived data (optional): word timings, voice envelopes ----
const fetchJson = async (u) => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch { return null; } };
const WORDS = (await fetchJson(new URL('../build/audio/words.json', import.meta.url))) ?? {};
const ENV = (await fetchJson(new URL('../build/audio/voice_env.json', import.meta.url))) ?? {};
const fallbackWords = (line, dur) => { const ws = line.text.split(' '); const per = dur / ws.length; return ws.map((w, i) => ({ w, t0: line.t + i * per, t1: line.t + (i + 1) * per })); };
const wordsOf = (line, dur) => WORDS[line.id] ?? fallbackWords(line, dur);
// mouth opening 0..1 for a voiced line at time t
export const mouth = (id, t) => { const v = TL.VOICES.find((x) => x.id === id); if (!v) return 0; const a = t - v.t; if (a < 0 || a > 1.6) return 0; const e = ENV[id]; if (e) { const i = Math.floor(a * 30); return Math.min(1, e[i] ?? 0); } return a < 0.9 ? Math.abs(Math.sin(a * 17)) * 0.9 : 0; };
export const voiceAge = (id, t) => { const v = TL.VOICES.find((x) => x.id === id); return v ? t - v.t : -1; };

const ctx = { THREE, W, H, mouth, voiceAge, TL, SCALE };
const loaders = { s1: () => import('./scenes/s1.js'), s2: () => import('./scenes/s2.js'), s3: () => import('./scenes/s3.js'), s4: () => import('./scenes/s4.js'), s5: () => import('./scenes/s5.js'), s6: () => import('./scenes/s6.js'), s7: () => import('./scenes/s7.js') };
const built = {};
for (const id of Object.keys(loaders)) { const m = await loaders[id](); built[id] = { mod: m.default, s: await m.default.build(ctx) }; }   // everything built up front: renderOut must be synchronous

const noise = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const cache = { shake: 0 };

function draw(i) {
  const t = i / TL.FPS;
  const sc = TL.sceneAt(t);
  const { mod, s } = built[sc.id];
  updateNature(t); CLOCK.t = t;   // grass sway, blinks and breathing: pure functions of t
  const r = mod.frame(t, s, ctx) || {};
  const cam = r.cam;
  // counter shake on the camera (tiny), stronger on tier hits
  const age = TL.tickAge(t), tier = TL.TIERS[TL.lastTick(t)] ?? 0;
  const amp = age < 0.25 ? (1 - age / 0.25) * (0.012 + tier * 0.012) : 0;
  const sx = (noise(Math.floor(t * 30) * 1.3) - 0.5) * amp * 2, sy = (noise(Math.floor(t * 30) * 2.9) - 0.5) * amp * 2;
  // voiced close-ups: ease the lens out a little so the face clears the caption band (bottom of the frame)
  let fovMul = 1; for (const v of TL.VOICES) { if (['crowd_world', 'plazas_unison', 'washer_shout', 'ghost_echo', 'crowd_audience'].includes(v.id)) continue; const a = (t - (v.t - 0.4)) / 0.4; if (a > 0 && t < v.t + 1.0) fovMul = Math.max(fovMul, 1 + 0.16 * Math.min(1, a)); }
  lookFrom(camera, [cam.pos[0] + sx, cam.pos[1] + sy, cam.pos[2]], cam.target, (cam.fov ?? 45) * fovMul, cam.roll ?? 0);
  if (r.keyFocus !== false) aimKey(s.stage ?? r.stage, new THREE.Vector3(...(r.keyFocus ?? cam.target)), r.keyDist ?? 9);
  renderer.render(s.scene, camera);
  // composite
  g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W, H);
  if (r.freeze) { /* title-card freeze handled by scene returning same cam */ }
  g2.drawImage(gl, 0, 0, W, H);
  g2.save(); g2.scale(SCALE, SCALE);
  if (!r.hideHud) {
    HUD.drawClock(g2, Math.min(t, 89.99)); const base = HUD.drawCounter(g2, Math.min(t, 89.99));
    HUD.drawGeraldChip(g2, 290 + base * 0.58 + 70 + 24);
  }
  // captions
  if (r.banner) HUD.drawBanner(g2, r.banner, t - (r.banner.t0 ?? 0));
  if (t >= 77.6 && t < 80.7) HUD.drawSilenceWords(g2, t);
  for (const n of TL.NARRATION) { const w = wordsOf(n, 3.4); HUD.drawStoryCaption(g2, n, t, w, 1500); }
  for (const rr of TL.ROASTS) { const w = wordsOf(rr, 1.8); HUD.drawRoastCaption(g2, rr, t, w, 1575); }
  for (const v of TL.VOICES) HUD.drawVoiceCaption(g2, v, t, r.voiceY?.[v.id] ?? 1500, v.id === 'crowd_world' ? 1.8 : v.id === 'judge_disbelief' ? 0.8 : 1.0);
  if (t >= TL.BEATS.title) HUD.drawTitleCard(g2, t);
  if (r.flash) HUD.drawFlash(g2, r.flash);
  g2.restore();
}
// VideoHub contract: renderOut(t) draws second t synchronously; renderFrame(i) is kept for tools/render.mjs
window.renderOut = (t) => draw(Math.min(TL.FRAMES - 1, Math.round(t * TL.FPS)));
window.renderFrame = (i) => { draw(i); return out.toDataURL('image/jpeg', parseFloat(q.get('q') || '0.92')); };
window.VH_DEBUG = built;   // inspection from the console (scene objects per id)
window.VH_SCENES = TL.SCENES.map((x) => ({ name: x.name, t0: x.t0, t1: x.t1 }));
window.renderOut(0);
window.READY = true;
