// HUD + captions on the 2D canvas over the 3D frame. Pure functions of (t, timeline). 1080x1920 design space.
import * as TL from './timeline.js';
const W = 1080, H = 1920, M = 70;
const ease = (t) => { t = Math.min(1, Math.max(0, t)); return 1 - Math.pow(1 - t, 3); };
const back = (t) => { t = Math.min(1, Math.max(0, t)) - 1; return t * t * (2.7 * t + 1.7) + 1; };
const noise = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const AN = 'Anton, Impact, sans-serif', IN = 'Inter, "Segoe UI", Arial, sans-serif';
function sf(g, text, x, y, fill, stroke, lw) { g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y); }
function fit(g, text, family, maxPx, maxW, weight = '') { let px = maxPx; g.font = `${weight} ${px}px ${family}`; const w = g.measureText(text).width; if (w > maxW) px = Math.floor(px * maxW / w); return px; }

export function drawClock(g, t) {
  const s = Math.floor(Math.max(0, t)), mm = String(Math.floor(s / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 40px ${IN}`; sf(g, `⏱ ${mm}:${ss}`, W / 2, 128, '#ffffff', 'rgba(0,0,0,0.85)', 8);
}
// returns the y below the HUD block (for the Gerald chip)
export function drawCounter(g, t, { compact = false } = {}) {
  const sh = TL.shown(t), age = TL.tickAge(t), tick = TL.lastTick(t), tier = TL.TIERS[tick] ?? 0;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (sh.broken === 2) {   // HEIGHT: NOT FOUND
    const y = 300; g.font = `800 40px ${IN}`; sf(g, 'HEIGHT:', W / 2, 192, '#ffffff', 'rgba(0,0,0,0.9)', 8);
    const px = fit(g, 'NOT FOUND', AN, 130, W - 2 * M - 40); g.font = `${px}px ${AN}`; sf(g, 'NOT FOUND', W / 2, y, '#ffd21f', '#101014', 14);
    return y + 80;
  }
  if (sh.broken === 1) {   // ERROR: glitching red, jitters, RGB split
    const a = t - TL.BREAK, n = Math.floor(t * 30), jx = (noise(n) - 0.5) * 26, jy = (noise(n + 3) - 0.5) * 14;
    const px = 200; g.font = `${px}px ${AN}`;
    g.globalAlpha = 0.75; sf(g, 'ERROR', W / 2 + jx - 9, 290 + jy, '#00e5ff', 'rgba(0,0,0,0)', 0); sf(g, 'ERROR', W / 2 + jx + 9, 290 + jy, '#ff2a5a', 'rgba(0,0,0,0)', 0); g.globalAlpha = 1;
    sf(g, noise(n * 7) < 0.12 ? 'ERR0R' : 'ERROR', W / 2 + jx, 290 + jy, '#ff4040', '#101014', 18);
    for (let i = 0; i < 3; i++) { const yy = 200 + noise(n * 3 + i) * 180, hh = 6 + noise(n * 5 + i) * 14; g.fillStyle = 'rgba(255,60,60,0.35)'; g.fillRect(M, yy, W - 2 * M, hh); }
    g.font = `800 40px ${IN}`; sf(g, TL.tagAt(t), W / 2, 290 + 130, '#ff9a9a', 'rgba(0,0,0,0.9)', 8);
    drawBadge(g, t);
    return 290 + 180;
  }
  const txt = sh.value;
  const punch = age < 0.36 ? 1 + (0.2 + tier * 0.07) * (1 - ease(age / 0.36)) * Math.cos(age * 14) : 1;
  const base = fit(g, txt, AN, 200, W - 2 * M - 60);
  const shk = age < 0.3 ? (1 - age / 0.3) * (6 + tier * 4) : 0;
  const ox = (noise(tick * 3.1 + Math.floor(age * 30)) - 0.5) * 2 * shk, oy = (noise(tick * 7.7 + Math.floor(age * 30)) - 0.5) * 2 * shk;
  g.save(); g.translate(W / 2 + ox, 270 + oy); g.font = `${base}px ${AN}`;
  const w = g.measureText(txt).width, sc = Math.min(punch, (W - 2 * M) / Math.max(1, w)); g.scale(sc, sc);
  sf(g, txt, 0, 0, '#ffd21f', '#101014', Math.max(10, base * 0.1)); g.restore();
  g.font = `800 44px ${IN}`; sf(g, sh.unit === 'M' ? 'METRES' : sh.unit, W / 2, 270 + base * 0.52 + 24, '#ffffff', 'rgba(0,0,0,0.9)', 8);
  const tag = TL.tagAt(t), tp = fit(g, tag, IN, 38, W - 2 * M - 20, '800'); g.font = `800 ${tp}px ${IN}`;
  const ta = Math.min(1, age / 0.25); g.globalAlpha = ta; sf(g, tag, W / 2, 270 + base * 0.52 + 74, '#9be7ff', 'rgba(0,0,0,0.9)', 8); g.globalAlpha = 1;
  if (t >= 1.99) drawBadge(g, t);
  return 270 + base * 0.52 + 110;
}
function drawBadge(g, t) {
  const b = TL.badgeAt(t); let label = b, age;
  if (!b) { age = TL.tickAge(t); if (age > 0.7 || t >= TL.BREAK) return; label = '×5'; } else age = t - (t < 62.4 ? 62.0 : t < 62.8 ? 62.4 : 62.8);
  const k = back(age / 0.28), fade = b === 'ERROR' ? 1 - ease((t - 63.6) / 0.4) : b ? 1 : 1 - ease((age - 0.4) / 0.3);
  g.save(); g.globalAlpha = Math.max(0, fade); g.translate(W - M - 62, 168); g.scale(k, k); g.rotate(0.12);
  const red = b === 'ERROR' || b === '×∞'; g.fillStyle = red ? '#ff3a3a' : '#ff8a1f'; g.beginPath(); g.arc(0, 0, label.length > 2 ? 58 : 50, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#fff'; g.font = `${label.length > 2 ? 30 : 46}px ${AN}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 0, 3); g.restore();
}
export function drawCatIcon(g, cx, cy, s = 1) { g.save(); g.translate(cx, cy); g.scale(s, s); g.fillStyle = '#f08a2e'; g.beginPath(); g.arc(0, 0, 17, 0, 7); g.fill(); g.beginPath(); g.moveTo(-16, -6); g.lineTo(-12, -24); g.lineTo(-3, -14); g.fill(); g.beginPath(); g.moveTo(16, -6); g.lineTo(12, -24); g.lineTo(3, -14); g.fill(); g.fillStyle = '#c4e05a'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 7, -1, 4.5, 4, 0, 0, 7); g.fill(); } g.fillStyle = '#f08a2e'; g.fillRect(-12, -6, 24, 3.5); g.restore(); }
// ---- captions
const keyIdx = (line, words) => { const full = words.map((w) => w.w.toUpperCase().replace(/[^A-Z0-9']/g, '')), s = new Set(); for (const kk of line.key) { const kw = kk.split(' '); for (let i = 0; i + kw.length <= full.length; i++) if (kw.every((q, j) => full[i + j] === q)) for (let j = 0; j < kw.length; j++) s.add(i + j); } return s; };
function wordsLine(g, shown, words, keys, y, px, fill, key, stroke, k) {
  g.save(); g.translate(W / 2, y); g.scale(k, k); g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `${px}px ${AN}`;
  const sp = g.measureText(' ').width; let total = 0; const ws = shown.map((w) => { const m = g.measureText(w.w.toUpperCase()).width; total += m; return m; }); total += sp * (shown.length - 1);
  let x = -total / 2; shown.forEach((w, i) => { const isK = keys.has(words.indexOf(w)); sf(g, w.w.toUpperCase(), x, 0, isK ? key : fill, stroke, Math.max(9, px * 0.12)); x += ws[i] + sp; }); g.restore();
}
export function drawStoryCaption(g, line, t, words, y = 1500) {
  if (!words?.length) return; const t1 = words[words.length - 1].t1 + 0.4; if (t < words[0].t0 - 0.02 || t > t1) return;
  const chunks = []; for (let i = 0; i < words.length; i += 3) chunks.push(words.slice(i, i + 3));
  let cur = null; for (const c of chunks) if (t >= c[0].t0 - 0.02) cur = c; if (!cur) return;
  const shown = cur.filter((w) => t >= w.t0 - 0.02), txt = shown.map((w) => w.w.toUpperCase()).join(' ');
  const px = fit(g, txt, AN, 96, W - 2 * M - 30); wordsLine(g, shown, words, keyIdx(line, words), y, px, '#ffffff', '#ffd21f', '#101014', back((t - cur[0].t0) / 0.16));
}
export function drawRoastCaption(g, line, t, words, y = 1575) {
  if (!words?.length) return; const t1 = words[words.length - 1].t1 + 0.4; if (t < words[0].t0 - 0.02 || t > t1) return;
  const chunks = words.length > 5 ? [words.slice(0, Math.ceil(words.length / 2)), words.slice(Math.ceil(words.length / 2))] : [words];
  let cur = chunks[0]; for (const c of chunks) if (t >= c[0].t0 - 0.02) cur = c;
  const shown = cur.filter((w) => t >= w.t0 - 0.02), txt = shown.map((w) => w.w.toUpperCase()).join(' ');
  const px = fit(g, txt, AN, 76, W - 2 * M - 30); wordsLine(g, shown, words, keyIdx(line, words), y, px, '#ffb27a', '#ffd21f', '#3a1608', back((t - cur[0].t0) / 0.18));
}
export function drawVoiceCaption(g, v, t, y = 1500, dur = 1.0) {
  const a = t - v.t; if (a < 0 || a > dur) return;
  const k = back(a / 0.14) * (a > dur - 0.2 ? 1 - ease((a - (dur - 0.2)) / 0.2) : 1);
  const s = a < 0.5 ? (1 - a / 0.5) * 9 : 0, ox = (noise(a * 60 + v.t) - 0.5) * s, oy = (noise(a * 60 + v.t + 9) - 0.5) * s;
  const big = v.id === 'family' ? 1.3 : 1, px = fit(g, v.cap, AN, 150 * big, W - 2 * M - 20);
  g.save(); g.translate(W / 2 + ox, y + oy); g.scale(k, k); g.rotate(-0.03); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${px}px ${AN}`; sf(g, v.cap, 0, 0, '#ffd21f', '#101014', Math.max(12, px * 0.13)); g.restore();
}
// TRAVELLING? flag (text only, left empty space)
export function drawFlag(g, text, age, x = 300, y = 980, dur = 1.2) {
  if (age < 0 || age > dur) return; const k = back(age / 0.2) * (age > dur - 0.2 ? 1 - ease((age - dur + 0.2) / 0.2) : 1);
  g.save(); g.translate(x, y); g.rotate(-0.08); g.scale(k, k); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `110px ${AN}`; sf(g, text, 0, 0, '#ffd21f', '#101014', 14); g.restore();
}
export function drawLabel(g, text, x, y) { g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 40px ${IN}`; sf(g, text, Math.min(W - M - 110, Math.max(M + 110, x)), Math.max(640, y), '#ffd21f', 'rgba(0,0,0,0.9)', 8); g.restore(); }
export function drawPlus2(g, p) { if (!p || p.age < 0 || p.age > 1.0) return; const k = back(p.age / 0.25), f = 1 - ease((p.age - 0.8) / 0.2); g.save(); g.globalAlpha = f; g.translate(p.x, p.y - p.age * 40); g.scale(k, k); g.rotate(0.1); g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(0, 0, 64, 0, 7); g.fill(); g.lineWidth = 7; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#101014'; g.font = `70px ${AN}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+2', 0, 4); g.restore(); }
// hook premise caption (frame 1, no fade-in)
export function drawPremise(g, k = 1) {
  g.save(); g.globalAlpha = k; g.textAlign = 'center'; g.textBaseline = 'middle';
  const L = [['WHAT IF YOU JUMPED', '#ffffff'], ['5× HIGHER', '#ffd21f'], ['EVERY 2 SECONDS?', '#ffffff']]; let y = 190;
  for (const [l, c] of L) { const px = fit(g, l, AN, l.startsWith('5') ? 150 : 96, W - 2 * M); g.font = `${px}px ${AN}`; sf(g, l, W / 2, y, c, '#101014', Math.max(12, px * 0.12)); y += px * 0.5 + 62; }
  g.restore(); return y;
}
export function drawRewind(g, u) {
  g.fillStyle = 'rgba(20,30,60,0.28)'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.10)'; for (let y = (u * 400) % 24; y < H; y += 24) g.fillRect(0, y, W, 6);
  g.font = `900 130px ${IN}`; g.textAlign = 'left'; g.textBaseline = 'middle'; sf(g, '◀◀', 70, 1640, '#ffffff', '#000', 14);
}
export function drawTitleCard(g, t) {
  const a = t - TL.BEATS.title; if (a < 0) return; const k = back(a / 0.3);
  g.save(); g.fillStyle = `rgba(8,6,20,${Math.min(0.66, a * 3)})`; g.fillRect(0, 0, W, H); g.translate(W / 2, 0); g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = [['WHAT IF', '#ffffff'], ['YOU JUMPED', '#ffffff'], ['5× HIGHER', '#ffd21f'], ['EVERY 2 SECONDS?', '#ffffff']]; let y = 330;
  g.save(); g.scale(k, k); for (const [l, c] of lines) { const px = fit(g, l, AN, 150, W - 2 * M); g.font = `${px}px ${AN}`; sf(g, l, 0, y, c, '#101014', 16); y += 160; } g.restore();
  const fa = Math.min(1, Math.max(0, (a - 0.3) / 0.3)); g.globalAlpha = fa;
  g.font = `800 44px ${IN}`; sf(g, 'FINAL HEIGHT', 0, 1040, '#9be7ff', '#000', 8);
  const px = fit(g, 'NOT FOUND', AN, 130, W - 2 * M); g.font = `${px}px ${AN}`; sf(g, 'NOT FOUND', 0, 1140, '#ffd21f', '#101014', 14);
  g.restore();
}
export function drawFlash(g, a, color = '255,255,255') { if (a <= 0) return; g.save(); g.fillStyle = `rgba(${color},${Math.min(1, a)})`; g.fillRect(0, 0, W, H); g.restore(); }
export { W, H, M };
