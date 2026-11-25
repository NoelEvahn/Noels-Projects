// Episode 6 page. window.renderOut(t) draws film second t synchronously; window.renderFrame(i) returns a JPEG of frame i (tools/render.mjs).
// Every frame is a pure function of its index. From the freeze (67.0) the 3D frame holds while the title card animates.
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
const fallbackWords = (line, dur) => { const ws = (line.cap ?? line.text).split(' '); const per = dur / ws.length; return ws.map((w, i) => ({ w, t0: line.t + i * per, t1: line.t + (i + 1) * per })); };
const wordsOf = (line) => WORDS[line.id] ?? fallbackWords(line, line.max ?? 1);
export const mouth = (id, t) => { const v = TL.LINES.find((x) => x.id === id); if (!v) return 0; const a = t - v.t; if (a < 0 || a > 4) return 0; const e = ENV[id]; if (e) return Math.min(1, e[Math.floor(a * 30)] ?? 0); return a < 0.8 ? Math.abs(Math.sin(a * 17)) * 0.8 : 0; };
const lineDur = (v) => { const w = WORDS[v.id]; if (w?.length) return w[w.length - 1].t1 - v.t; const e = ENV[v.id]; return e ? e.length / 30 : (v.max ?? 1); };
const ctx = { THREE, W, H, SCALE, TL, mouth, camera, renderer };

const loaders = { hook: () => import('./scenes/hook.js'), build: () => import('./scenes/build.js'), space: () => import('./scenes/space.js'), twist: () => import('./scenes/twist.js'), home: () => import('./scenes/home.js') };
const ONLY = q.get('parts')?.split(',');
const built = {};
for (const id of Object.keys(loaders)) { if (ONLY && !ONLY.includes(id)) continue; const m = await loaders[id](); built[id] = { mod: m.default, s: await m.default.build(ctx) }; }

function draw(i) {
  const f = i / TL.FPS, t = Math.min(f, TL.BEATS.freeze);     // 3D time holds at the freeze
  const part = TL.partAt(t), B = built[part.id] ?? Object.values(built)[0];
  updateNature(t); CLOCK.t = t;
  const r = B.mod.frame(t, B.s, ctx) || {};
  const c = r.cam;
  camera.far = r.far ?? 4000; camera.near = r.near ?? 0.05;
  lookFrom(camera, c.pos, c.target, c.fov ?? 40, c.roll ?? 0);
  camera.updateMatrixWorld(true);
  if (r.keyFocus !== false && B.s.stage) aimKey(B.s.stage, new THREE.Vector3(...(r.keyFocus ?? c.target)), r.keyDist ?? 9);
  r.after?.(camera);
  renderer.render(r.scene ?? B.s.scene, camera);
  g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W, H);
  if (f > TL.BEATS.freeze) { const z = 1 + (f - TL.BEATS.freeze) * 0.02; g2.drawImage(gl, (W - W * z) / 2, (H - H * z) / 2, W * z, H * z); } else g2.drawImage(gl, 0, 0, W, H);
  g2.save(); g2.scale(SCALE, SCALE);
  if (r.vignette) HUD.drawVignette(g2, r.vignette);
  if (f < TL.HUD_OFF && !r.hideHud) HUD.drawCounter(g2, f);
  HUD.drawWaitForIt(g2, f);
  for (const v of TL.LINES) {
    const y = r.capY?.[v.id] ?? r.capYAll ?? 1480;
    if (v.kind === 'narr') HUD.drawWords(g2, v, f, wordsOf(v), r.narrY ?? 1520);
    else if (v.whole) HUD.drawWhole(g2, v.cap, f - v.t, y, Math.max(0.7, lineDur(v) + 0.25));
    else if (v.kind === 'lapeace') HUD.drawPunch(g2, v.cap, f - v.t, y, Math.min(1.1, lineDur(v) + 0.2));
    else if (v.cap && (v.cap.split(' ').length <= 2)) HUD.drawPunch(g2, v.cap, f - v.t, y, Math.max(0.7, lineDur(v) + 0.25));
    else if (v.cap) HUD.drawWords(g2, v, f, wordsOf(v), y, { fill: '#ffd21f', key: '#ffd21f', maxPx: 104 });
  }
  if (f >= TL.BEATS.title) HUD.drawTitleCard(g2, f);
  if (r.flash) HUD.drawFlash(g2, r.flash, r.flashColor);
  g2.restore();
}
window.renderOut = (t) => draw(Math.min(TL.FRAMES - 1, Math.round(t * TL.FPS)));
window.renderFrame = (i) => { draw(i); return out.toDataURL('image/jpeg', parseFloat(q.get('q') || '0.92')); };
window.VH_SCENES = TL.PARTS.map((p) => ({ name: p.name, t0: p.t0, t1: p.t1 }));
window.VH_DEBUG = built;
window.renderOut(ONLY ? (TL.PARTS.find((p) => p.id === ONLY[0])?.t0 ?? 0) : 0);
window.READY = true;
