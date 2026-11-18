// HUD + captions drawn on a 2D canvas over the rendered frame. Pure function of (t, timeline). 1080x1920 design space (scaled by ctx).
import { counterText, unitText, tickAge, tagAt, exp2, TIERS, lastTick, NARRATION, ROASTS, VOICES, TITLE, BEATS } from './timeline.js';

const W = 1080, H = 1920, M = 70;
const ease = (t) => { t = Math.min(1, Math.max(0, t)); return 1 - Math.pow(1 - t, 3); };
const back = (t) => { t = Math.min(1, Math.max(0, t)) - 1; return t * t * (2.7 * t + 1.7) + 1; };
const noise = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function strokeFill(g, text, x, y, fill, stroke, lw) { g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y); }
function fitFont(g, text, family, maxPx, maxW, weight = '') { let px = maxPx; g.font = `${weight} ${px}px ${family}`; const w = g.measureText(text).width; if (w > maxW) px = Math.floor(px * maxW / w); return px; }

export function drawClock(g, t) {
  const s = Math.floor(t), mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 40px Inter, sans-serif';
  strokeFill(g, `⏱ ${mm}:${ss}`, W / 2, 128, '#ffffff', 'rgba(0,0,0,0.85)', 8);
}
export function drawCounter(g, t, shakeAmp = 1) {
  const txt = counterText(t), age = tickAge(t), tick = lastTick(t), tier = TIERS[tick] ?? 0;
  const punch = age < 0.36 ? 1 + (0.22 + tier * 0.08) * (1 - ease(age / 0.36)) * Math.cos(age * 14) : 1;
  const px0 = fitFont(g, txt, 'Anton, Impact, sans-serif', 215, W - 2 * M - 40);
  const base = Math.min(px0, 215); const maxScale = (W - 2 * M) / (base * 0.5 * txt.length * 0.9 + 1);
  let sc = Math.min(punch, Math.max(1, (W - 2 * M) / (g.measureText(txt).width * (base / px0) || 1)));
  sc = Math.min(punch, sc);
  const sh = age < 0.3 ? (1 - age / 0.3) * (7 + tier * 4) * shakeAmp : 0;
  const ox = (noise(tick * 3.1 + Math.floor(age * 30)) - 0.5) * 2 * sh, oy = (noise(tick * 7.7 + Math.floor(age * 30)) - 0.5) * 2 * sh;
  g.save(); g.translate(W / 2 + ox, 290 + oy); g.scale(sc, sc); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${base}px Anton, Impact, sans-serif`;
  const w = g.measureText(txt).width; // clamp so the punched number never crosses the side margins
  strokeFill(g, txt, 0, 0, '#ffd21f', '#101014', Math.max(10, base * 0.1));
  g.restore();
  // unit
  g.textAlign = 'center'; g.font = '800 40px Inter, sans-serif'; strokeFill(g, unitText(t), W / 2, 290 + base * 0.58 + 22, '#ffffff', 'rgba(0,0,0,0.9)', 8);
  // tag line
  const tag = tagAt(t);
  if (tag) { const tp = fitFont(g, tag, 'Inter, sans-serif', 36, W - 2 * M - 20, '800'); g.font = `800 ${tp}px Inter, sans-serif`; const age2 = t - [...tagTimes].reverse().find((x) => x <= t); const a = Math.min(1, age2 / 0.25); g.globalAlpha = a; strokeFill(g, tag, W / 2, 290 + base * 0.58 + 70, '#9be7ff', 'rgba(0,0,0,0.9)', 8); g.globalAlpha = 1; }
  // x2 badge
  if (age < 0.7 && t > 0.01) { const k = back(age / 0.28), fade = 1 - ease((age - 0.4) / 0.3); g.save(); g.globalAlpha = Math.max(0, fade); g.translate(W - M - 52, 150 + 18); g.scale(k, k); g.rotate(0.12); g.fillStyle = '#ff3f7f'; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#fff'; g.font = '800 44px Anton, Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('×2', 0, 3); g.restore(); }
  return base;
}
import { TAGS } from './timeline.js';
const tagTimes = TAGS.map((x) => x[0]);

export function drawCatIcon(g, cx, cy, s = 1) { g.save(); g.translate(cx, cy); g.scale(s, s); g.fillStyle = '#f08a2e'; g.beginPath(); g.arc(0, 0, 17, 0, 7); g.fill(); g.beginPath(); g.moveTo(-16, -6); g.lineTo(-12, -24); g.lineTo(-3, -14); g.fill(); g.beginPath(); g.moveTo(16, -6); g.lineTo(12, -24); g.lineTo(3, -14); g.fill(); g.fillStyle = '#c4e05a'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 7, -1, 4.5, 4, 0, 0, 7); g.fill(); } g.fillStyle = '#f08a2e'; g.fillRect(-12, -6, 24, 3.5); g.restore(); }
// Gerald's chip: never changes while the counter explodes. Drawn under the tag line.
export function drawGeraldChip(g, y = 470) {
  const w = 560, h = 46, x = W / 2 - w / 2;
  g.save(); g.fillStyle = 'rgba(20,20,26,0.72)'; g.strokeStyle = '#ff9a3d'; g.lineWidth = 4; g.beginPath(); g.roundRect(x, y, w, h, 28); g.fill(); g.stroke();
  // little cat head icon
  const cx = x + 40, cy = y + h / 2 + 2; g.fillStyle = '#f08a2e'; g.beginPath(); g.arc(cx, cy, 17, 0, 7); g.fill(); g.beginPath(); g.moveTo(cx - 16, cy - 6); g.lineTo(cx - 12, cy - 24); g.lineTo(cx - 3, cy - 14); g.fill(); g.beginPath(); g.moveTo(cx + 16, cy - 6); g.lineTo(cx + 12, cy - 24); g.lineTo(cx + 3, cy - 14); g.fill();
  g.fillStyle = '#c4e05a'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 7, cy - 1, 4.5, 4, 0, 0, 7); g.fill(); } g.fillStyle = '#f08a2e'; g.fillRect(cx - 12, cy - 6, 24, 3.5);   // half-lids
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '800 24px Inter, sans-serif'; g.fillStyle = '#fff'; g.fillText('GERALD', x + 72, y + h / 2 + 1); g.fillStyle = '#ffb870'; g.fillText('· LOVES YOU:', x + 200, y + h / 2 + 1); g.fillStyle = '#ff5a5a'; g.fillText('NO', x + 440, y + h / 2 + 1);
  g.restore();
}

// ---------- captions ----------
// words: [{t0, t1, w}] per narration/roast id loaded from audio build; falls back to even spacing.
export function chunkWords(words, per = 3) { const out = []; for (let i = 0; i < words.length; i += per) out.push(words.slice(i, i + per)); return out; }
export function drawStoryCaption(g, line, t, words, y = 1500) {
  if (!words || !words.length) return;
  const t0 = words[0].t0, t1 = words[words.length - 1].t1 + 0.45;
  if (t < t0 - 0.02 || t > t1) return;
  const chunks = chunkWords(words, 3);
  let cur = null; for (const c of chunks) if (t >= c[0].t0 - 0.02) cur = c;
  if (!cur) return;
  const age = t - cur[0].t0, k = back(age / 0.16);
  const keyIdx = new Set(); const full = words.map((w) => w.w.toUpperCase().replace(/[^A-Z0-9']/g, ''));
  for (const kk of line.key) { const kw = kk.split(' '); for (let i = 0; i + kw.length <= full.length; i++) if (kw.every((q, j) => full[i + j] === q.replace(/[^A-Z0-9']/g, ''))) for (let j = 0; j < kw.length; j++) keyIdx.add(i + j); }
  const shown = cur.filter((w) => t >= w.t0 - 0.02);
  const txt = shown.map((w) => w.w.toUpperCase()).join(' ');
  const px = fitFont(g, txt, 'Anton, Impact, sans-serif', 96, W - 2 * M - 30);
  g.save(); g.translate(W / 2, y); g.scale(k, k); g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `${px}px Anton, Impact, sans-serif`;
  const sp = g.measureText(' ').width; let total = 0; const ws = shown.map((w) => { const m = g.measureText(w.w.toUpperCase()).width; total += m; return m; }); total += sp * (shown.length - 1);
  let x = -total / 2; shown.forEach((w, i) => { const gi = words.indexOf(w); const key = keyIdx.has(gi); strokeFill(g, w.w.toUpperCase(), x, 0, key ? '#ffd21f' : '#ffffff', '#101014', Math.max(10, px * 0.12)); x += ws[i] + sp; });
  g.restore();
}
export function drawRoastCaption(g, line, t, words, y = 1575) {
  if (!words || !words.length) return;
  const t0 = words[0].t0, t1 = words[words.length - 1].t1 + 0.4;
  if (t < t0 - 0.02 || t > t1) return;
  const shown = words.filter((w) => t >= w.t0 - 0.02); const age = t - words[0].t0, k = back(age / 0.18);
  const full = words.map((w) => w.w.toUpperCase().replace(/[^A-Z0-9']/g, '')), keyIdx = new Set();
  for (const kk of line.key) { const kw = kk.split(' '); for (let i = 0; i + kw.length <= full.length; i++) if (kw.every((q, j) => full[i + j] === q.replace(/[^A-Z0-9']/g, ''))) for (let j = 0; j < kw.length; j++) keyIdx.add(i + j); }
  const txt = shown.map((w) => w.w.toUpperCase()).join(' ');
  const px = fitFont(g, txt, 'Anton, Impact, sans-serif', 72, W - 2 * M - 30);
  g.save(); g.translate(W / 2, y); g.scale(k, k); g.textBaseline = 'middle'; g.font = `${px}px Anton, Impact, sans-serif`; g.textAlign = 'left';
  const sp = g.measureText(' ').width; let total = 0; const ws = shown.map((w) => { const m = g.measureText(w.w.toUpperCase()).width; total += m; return m; }); total += sp * (shown.length - 1);
  let x = -total / 2; shown.forEach((w, i) => { const key = keyIdx.has(words.indexOf(w)); strokeFill(g, w.w.toUpperCase(), x, 0, key ? '#ffd21f' : '#ffb27a', '#3a1608', Math.max(8, px * 0.12)); x += ws[i] + sp; });
  g.restore();
}
// Big yellow voiced caption with shake. anchor y kept clear of faces by the caller (default 1360)
export function drawVoiceCaption(g, v, t, y = 1360, dur = 1.0) {
  const a = t - v.t; if (a < -0.0 || a > dur) return;
  const k = back(a / 0.14) * (a > dur - 0.2 ? 1 - ease((a - (dur - 0.2)) / 0.2) : 1);
  const sh = a < 0.5 ? (1 - a / 0.5) * 9 : 0; const ox = (noise(a * 60 + v.t) - 0.5) * sh, oy = (noise(a * 60 + v.t + 9) - 0.5) * sh;
  const big = v.id === 'crowd_world' ? 1.45 : 1;
  const px = fitFont(g, v.cap, 'Anton, Impact, sans-serif', 150 * big, W - 2 * M - 20);
  g.save(); g.translate(W / 2 + ox, y + oy); g.scale(k, k); g.rotate(-0.03); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${px}px Anton, Impact, sans-serif`;
  strokeFill(g, v.cap, 0, 0, '#ffd21f', '#101014', Math.max(12, px * 0.13)); g.restore();
}
// "HE GAVE / ONE / HUG." text-only captions in the silence
export function drawSilenceWords(g, t) {
  const items = [[77.6, 78.8, 'HE GAVE'], [78.8, 79.6, 'ONE'], [79.6, 80.0, 'HUG.']];
  for (const [a, b, w] of items) { if (t >= a && t < b + (w === 'HUG.' ? 0.6 : 0)) { const k = back((t - a) / 0.22); g.save(); g.translate(W / 2, 1500); g.scale(k, k); g.textAlign = 'center'; g.textBaseline = 'middle'; const px = w === 'HUG.' ? 220 : 150; g.font = `${px}px Anton, Impact, sans-serif`; strokeFill(g, w, 0, 0, '#ffffff', '#101014', 16); g.restore(); } }
}
export function drawTitleCard(g, t) {
  const a = t - BEATS.title; if (a < 0) return; const k = back(a / 0.3);
  g.save(); g.fillStyle = `rgba(8,6,20,${Math.min(0.72, a * 4)})`; g.fillRect(0, 0, W, H); g.translate(W / 2, 0);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = ['WHAT IF EVERY', '2 SECONDS,', 'TWICE AS MANY', 'PEOPLE LOVED YOU?']; let y = 520;
  g.save(); g.translate(0, 0); g.scale(k, k); for (const [i, l] of lines.entries()) { const px = fitFont(g, l, 'Anton, Impact, sans-serif', 150, W - 2 * M); g.font = `${px}px Anton, Impact, sans-serif`; strokeFill(g, l, 0, y, i === 3 ? '#ffd21f' : '#ffffff', '#101014', 16); y += 160; } g.restore();
  const fa = Math.min(1, Math.max(0, (a - 0.3) / 0.3)); g.globalAlpha = fa;
  g.font = '800 44px Inter, sans-serif'; strokeFill(g, 'FINAL COUNT', 0, 1230, '#9be7ff', '#000', 8);
  const px = fitFont(g, '17,592,186,044,416', 'Anton, Impact, sans-serif', 130, W - 2 * M); g.font = `${px}px Anton, Impact, sans-serif`; strokeFill(g, '17,592,186,044,416', 0, 1330, '#ffd21f', '#101014', 14);
  g.font = '800 44px Inter, sans-serif'; strokeFill(g, 'PEOPLE WHO LOVE YOU', 0, 1425, '#fff', '#000', 8);
  g.font = '800 38px Inter, sans-serif'; strokeFill(g, 'NOT COUNTED: 1 CAT', 20, 1500, '#ffb27a', '#000', 8); drawCatIcon(g, -250, 1498, 1.5);
  g.restore();
}
export function drawBanner(g, b, age) { if (age < 0) return; const k = back(age / 0.25); g.save(); g.translate(W / 2, b.y ?? 1180); g.scale(k, k); g.rotate(b.rot ?? -0.02); g.textAlign = 'center'; g.textBaseline = 'middle'; const px = fitFont(g, b.text, 'Anton, Impact, sans-serif', b.size ?? 120, W - 2 * M - 20); g.font = `${px}px Anton, Impact, sans-serif`; strokeFill(g, b.text, 0, 0, b.fill ?? '#ffffff', '#101014', Math.max(10, px * 0.12)); g.restore(); }
export function drawFlash(g, a) { if (a <= 0) return; g.save(); g.fillStyle = `rgba(255,255,255,${Math.min(1, a)})`; g.fillRect(0, 0, W, H); g.restore(); }
export { W, H, M, ease, back };
