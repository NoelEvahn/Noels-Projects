// Episode 5 page. window.renderOut(t) draws film second t synchronously; window.renderFrame(i) returns a JPEG of film frame i (tools/render.mjs).
// Every frame is a pure function of its index: film time -> story time through the EDL (hook flash-forward, rewind, story).
import * as THREE from 'three';
import { makeRenderer, makeCamera, lookFrom, aimKey } from '../../assets/library/stage.js';
import { CLOCK } from '../../assets/library/character.js';
import { updateNature } from '../../assets/library/props/nature.js';
import * as TL from './timeline.js';
import * as HUD from './hud.js';

const q = new URLSearchParams(location.search);
const SCALE = parseFloat(q.get('scale') || '1');
const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE);
const gl = new OffscreenCanvas(W, H), out = document.getElementById('out');
out.width = W; out.height = H;
const renderer = makeRenderer(gl, W, H);
const camera = makeCamera(W, H, 40);
const g2 = out.getContext('2d');
await document.fonts.load('100px Anton');

const fetchJson = async (u) => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch { return null; } };
const WORDS = (await fetchJson(new URL('../build/audio/words.json', import.meta.url))) ?? {};
const ENV = (await fetchJson(new URL('../build/audio/voice_env.json', import.meta.url))) ?? {};
const fallbackWords = (line, dur) => { const ws = line.text.split(' '); const per = dur / ws.length; return ws.map((w, i) => ({ w, t0: line.t + i * per, t1: line.t + (i + 1) * per })); };
const wordsOf = (line, dur) => WORDS[line.id] ?? fallbackWords(line, dur);
export const mouth = (id, t) => { const v = TL.VOICES.find((x) => x.id === id); if (!v) return 0; const a = t - v.t; if (a < 0 || a > 2.0) return 0; const e = ENV[id]; if (e) return Math.min(1, e[Math.floor(a * 30)] ?? 0); return a < 0.9 ? Math.abs(Math.sin(a * 17)) * 0.8 : 0; };
const ctx = { THREE, W, H, SCALE, TL, mouth, camera, renderer };

const loaders = { p1: () => import('./scenes/p1.js'), p2: () => import('./scenes/p2.js'), p3: () => import('./scenes/p3.js'), p4: () => import('./scenes/p4.js'), p5: () => import('./scenes/p5.js'), p6: () => import('./scenes/p6.js'), p7: () => import('./scenes/p7.js'), p8: () => import('./scenes/p8.js') };
const ONLY = q.get('parts')?.split(',');
const built = {};
for (const id of Object.keys(loaders)) { if (ONLY && !ONLY.includes(id)) continue; const m = await loaders[id](); built[id] = { mod: m.default, s: await m.default.build(ctx) }; }
const noise = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function draw(i) {
  const f = i / TL.FPS, ed = TL.edit(f), t = ed.s;
  const part = TL.partAt(t), B = built[part.id] ?? Object.values(built)[0];
  updateNature(t); CLOCK.t = t; ctx.hook = ed.kind === 'hook';
  const r = B.mod.frame(t, B.s, ctx) || {};
  const c = r.cam;
  // tick shake (small), on the counter beats only while the counter lives
  const age = TL.tickAge(t), tier = TL.TIERS[TL.lastTick(t)] ?? 0, amp = t < TL.BREAK && age < 0.25 && t > 0.1 ? (1 - age / 0.25) * (0.008 + tier * 0.008) * (r.shakeK ?? 1) : 0;
  const n = Math.floor(t * 30), sx = (noise(n * 1.3) - 0.5) * amp * 2, sy = (noise(n * 2.9) - 0.5) * amp * 2;
  lookFrom(camera, [c.pos[0] + sx, c.pos[1] + sy, c.pos[2]], c.target, c.fov ?? 40, c.roll ?? 0);
  camera.updateMatrixWorld(true);
  if (r.keyFocus !== false && B.s.stage) aimKey(B.s.stage, new THREE.Vector3(...(r.keyFocus ?? c.target)), r.keyDist ?? 9);
  r.after?.(camera);
  renderer.render(r.scene ?? B.s.scene, camera);
  g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W, H); g2.drawImage(gl, 0, 0, W, H);
  g2.save(); g2.scale(SCALE, SCALE);
  if (ed.kind === 'hook') {
    HUD.drawPremise(g2);
    if (r.plus2) HUD.drawPlus2(g2, r.plus2);
  } else if (ed.kind === 'rewind') {
    HUD.drawRewind(g2, ed.u);
  } else {
    if (!r.hideHud && t < TL.BEATS.title) { HUD.drawClock(g2, t); HUD.drawCounter(g2, t); }   // user 2026-11-20: no Gerald chip
    if (r.plus2) HUD.drawPlus2(g2, r.plus2);
    if (r.label) { const p = r.label.pos.clone().project(camera); HUD.drawLabel(g2, r.label.text, (p.x * 0.5 + 0.5) * 1080, (1 - (p.y * 0.5 + 0.5)) * 1920); }
    if (t >= TL.BEATS.travelling && t < TL.BEATS.travelling + 1.3) HUD.drawFlag(g2, 'TRAVELLING?', t - TL.BEATS.travelling, 300, 1010);
    for (const nn of TL.NARRATION) HUD.drawStoryCaption(g2, nn, t, wordsOf(nn, 2.8), r.capY ?? 1500);
    for (const rr of TL.ROASTS) HUD.drawRoastCaption(g2, rr, t, wordsOf(rr, 1.6), r.roastY ?? 1580);
    for (const v of TL.VOICES) { const cut = TL.SHOTS.find((x) => x > v.t + 0.01) ?? TL.STORY_DUR; HUD.drawVoiceCaption(g2, v, t, r.voiceY?.[v.id] ?? 1500, Math.min(v.id === 'hero_deep' ? 1.6 : v.id === 'moon' ? 1.2 : 1.0, cut - v.t)); }
    if (t >= TL.BEATS.title) HUD.drawTitleCard(g2, t);
  }
  if (r.flash) HUD.drawFlash(g2, r.flash, r.flashColor);
  g2.restore();
}
window.renderOut = (t) => draw(Math.min(TL.FRAMES - 1, Math.round(t * TL.FPS)));
window.renderFrame = (i) => { draw(i); return out.toDataURL('image/jpeg', parseFloat(q.get('q') || '0.92')); };
window.VH_SCENES = [{ name: 'Hook + rewind', t0: 0, t1: 1.6 }, ...TL.PARTS.map((p) => ({ name: p.name, t0: p.t0 + TL.HOOK, t1: p.t1 + TL.HOOK }))];
window.VH_DEBUG = built;
window.renderOut(0);
window.READY = true;
