// HUD + captions on the 2D canvas (1080x1920 design space). Pure functions of (t, timeline).
// Only the height counter and essential story text (user rule): no timer, no tag line, no Gerald UI.
import * as TL from './timeline.js';
const W = 1080, H = 1920, M = 70;
const ease = (t) => { t = Math.min(1, Math.max(0, t)); return 1 - Math.pow(1 - t, 3); };
const back = (t) => { t = Math.min(1, Math.max(0, t)) - 1; return t * t * (2.7 * t + 1.7) + 1; };
const noise = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const AN = 'Anton, Impact, sans-serif', IN = 'Inter, "Segoe UI", Arial, sans-serif';
function sf(g, text, x, y, fill, stroke, lw) { g.lineJoin = 'round'; if (lw > 0) { g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, x, y); } g.fillStyle = fill; g.fillText(text, x, y); }
function fit(g, text, family, maxPx, maxW, weight = '') { let px = maxPx; g.font = `${weight} ${px}px ${family}`; const w = g.measureText(text).width; if (w > maxW) px = Math.floor(px * maxW / w); return px; }

// HEIGHT: 14.4 M  (label above, big yellow number, small unit), punch on each tick, glitch from 26.0, ERROR from 35.6
export function drawCounter(g, t) {
  const sh = TL.shown(t), age = TL.tickAge(t), n = Math.floor(t * 30);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let jx = 0, jy = 0; if (sh.broken) { const k = sh.broken === 2 ? 1 : 0.5; jx = (noise(n) - 0.5) * 26 * k; jy = (noise(n + 3) - 0.5) * 12 * k; }
  g.font = `800 42px ${IN}`; sf(g, 'HEIGHT', W / 2 + jx * 0.5, 150, '#ffffff', 'rgba(0,0,0,0.9)', 9);
  let txt = sh.broken === 2 ? (noise(n * 7) < 0.15 ? 'ERR0R' : 'ERROR') : `${sh.value} ${sh.unit}`;
  if (sh.broken === 1 && noise(n * 11) < 0.18) txt = txt.replace(/\d/g, (d) => String((+d + 3) % 10));   // digits flicker
  const punch = !sh.broken && age < 0.36 && t > 1.9 ? 1 + 0.22 * (1 - ease(age / 0.36)) * Math.cos(age * 14) : 1;
  const px = fit(g, txt, AN, 190, W - 2 * M - 40);
  g.save(); g.translate(W / 2 + jx, 292 + jy); g.scale(punch, punch); g.font = `${px}px ${AN}`;
  if (sh.broken) { g.globalAlpha = 0.75; sf(g, txt, -9, 0, '#00e5ff', '', 0); sf(g, txt, 9, 0, '#ff2a5a', '', 0); g.globalAlpha = 1; }
  sf(g, txt, 0, 0, sh.broken === 2 ? '#ff4040' : '#ffd21f', '#101014', Math.max(10, px * 0.1)); g.restore();
  if (sh.broken) for (let i = 0; i < 3; i++) { const yy = 200 + noise(n * 3 + i) * 170, hh = 5 + noise(n * 5 + i) * 12; g.fillStyle = sh.broken === 2 ? 'rgba(255,60,60,0.35)' : 'rgba(120,220,255,0.25)'; g.fillRect(M, yy, W - 2 * M, hh); }
  // x2 badge on each tick (inside the 60 px margins)
  if (!sh.broken && t > 1.9 && age < 0.7) {
    const k = back(age / 0.28), f = 1 - ease((age - 0.4) / 0.3);
    g.save(); g.globalAlpha = Math.max(0, f); g.translate(W - M - 70, 285); g.scale(k, k); g.rotate(0.12);
    g.fillStyle = '#ff8a1f'; g.beginPath(); g.arc(0, 0, 52, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.font = `48px ${AN}`; g.fillText('×2', 0, 3); g.restore();
  }
}
// ---- captions
const keyIdx = (line, words) => { const full = words.map((w) => w.w.toUpperCase().replace(/[^A-Z0-9']/g, '')), s = new Set(); for (const kk of (line.key ?? [])) { const kw = kk.split(' '); for (let i = 0; i + kw.length <= full.length; i++) if (kw.every((q, j) => full[i + j] === q)) for (let j = 0; j < kw.length; j++) s.add(i + j); } return s; };
function wordsLine(g, shown, words, keys, y, px, fill, key, stroke, k) {
  g.save(); g.translate(W / 2, y); g.scale(k, k); g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `${px}px ${AN}`;
  const sp = g.measureText(' ').width; let total = 0; const ws = shown.map((w) => { const m = g.measureText(w.w.toUpperCase()).width; total += m; return m; }); total += sp * (shown.length - 1);
  let x = -total / 2; shown.forEach((w, i) => { const isK = keys.has(words.indexOf(w)); sf(g, w.w.toUpperCase(), x, 0, isK ? key : fill, stroke, Math.max(9, px * 0.12)); x += ws[i] + sp; }); g.restore();
}
// word-by-word caption in chunks of up to 3 words (narration: white + yellow keys; dialogue: all yellow)
export function drawWords(g, line, t, words, y, { fill = '#ffffff', key = '#ffd21f', maxPx = 96, chunk = 3 } = {}) {
  if (!words?.length) return; const t1 = Math.min(words[words.length - 1].t1 + 0.35, line.max ? line.t + line.max + 0.45 : 1e9); if (t < words[0].t0 - 0.02 || t > t1) return;
  const chunks = []; for (let i = 0; i < words.length; i += chunk) chunks.push(words.slice(i, i + chunk));
  let cur = null; for (const c of chunks) if (t >= c[0].t0 - 0.02) cur = c; if (!cur) return;
  const shown = cur.filter((w) => t >= w.t0 - 0.02), txt = shown.map((w) => w.w.toUpperCase()).join(' ');
  const px = fit(g, txt, AN, maxPx, W - 2 * M - 30); wordsLine(g, shown, words, keyIdx(line, words), y, px, fill, key, '#101014', back((t - cur[0].t0) / 0.16));
}
// short punchy caption (la peace, "WHAT?", "OW.")
export function drawPunch(g, text, a, y = 1500, dur = 1.0, big = 1) {
  if (a < 0 || a > dur) return;
  const k = back(a / 0.14) * (a > dur - 0.2 ? 1 - ease((a - (dur - 0.2)) / 0.2) : 1);
  const s = a < 0.5 ? (1 - a / 0.5) * 9 : 0, ox = (noise(a * 60) - 0.5) * s, oy = (noise(a * 60 + 9) - 0.5) * s;
  const px = fit(g, text, AN, 140 * big, W - 2 * M - 20);
  g.save(); g.translate(W / 2 + ox, y + oy); g.scale(k, k); g.rotate(-0.03); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${px}px ${AN}`; sf(g, text, 0, 0, '#ffd21f', '#101014', Math.max(12, px * 0.13)); g.restore();
}
// a whole line on screen from its first frame (frame-0 hook caption: readable at once, no fade-in), two lines when long
export function drawWhole(g, text, a, y, dur) {
  if (a < -0.06 || a > dur) return; const f = a > dur - 0.2 ? 1 - ease((a - (dur - 0.2)) / 0.2) : 1;
  const words = text.split(' '), half = Math.ceil(words.length / 2), L = words.length > 3 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [text];
  g.save(); g.globalAlpha = f; g.textAlign = 'center'; g.textBaseline = 'middle';
  L.forEach((l, i) => { const px = fit(g, l, AN, 130, W - 2 * M - 20); g.font = `${px}px ${AN}`; sf(g, l, W / 2, y + i * px * 1.05, '#ffd21f', '#101014', Math.max(12, px * 0.13)); }); g.restore();
}
// WAIT FOR IT: big, slightly shaking, centred low
export function drawWaitForIt(g, t) {
  const [a, b] = TL.BEATS.waitFor; if (t < a || t > b) return; const u = t - a, k = back(u / 0.25) * (t > b - 0.2 ? 1 - ease((t - (b - 0.2)) / 0.2) : 1);
  const n = Math.floor(t * 30), j = 3 + u * 3;
  g.save(); g.translate(W / 2 + (noise(n) - 0.5) * j, 1520 + (noise(n + 5) - 0.5) * j); g.scale(k, k); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `150px ${AN}`; sf(g, 'WAIT FOR IT', 0, 0, '#ffffff', '#101014', 18); g.restore();
}
// title card (67.0 ->): freeze frame darkened, three blocks
export function drawTitleCard(g, t) {
  const a = t - TL.BEATS.title; if (a < 0) return; const k = back(a / 0.3);
  g.save(); g.fillStyle = `rgba(8,6,20,${Math.min(0.55, a * 2.5)})`; g.fillRect(0, 0, W, H); g.translate(W / 2, 0); g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = [['WHAT IF YOU GOT', '#ffffff'], ['2× TALLER', '#ffd21f'], ['EVERY 2 SECONDS?', '#ffffff']]; let y = 250;
  g.save(); g.scale(k, k); for (const [l, c] of lines) { const px = fit(g, l, AN, l.startsWith('2') ? 170 : 120, W - 2 * M); g.font = `${px}px ${AN}`; sf(g, l, 0, y, c, '#101014', 16); y += px * 0.5 + 70; } g.restore();
  const f1 = Math.min(1, Math.max(0, (a - 0.35) / 0.3)), f2 = Math.min(1, Math.max(0, (a - 0.75) / 0.3));
  g.globalAlpha = f1; g.font = `800 46px ${IN}`; sf(g, 'FINAL HEIGHT', 0, 760, '#9be7ff', '#000', 8);
  let px = fit(g, 'NOT FOUND…', AN, 120, W - 2 * M); g.font = `${px}px ${AN}`; sf(g, 'NOT FOUND…', 0, 850, '#ffffff', '#101014', 14);
  g.globalAlpha = f2; g.save(); g.translate(0, 1010); g.scale(back((a - 0.75) / 0.3), back((a - 0.75) / 0.3)); g.font = `800 46px ${IN}`; sf(g, 'MOM', 0, 0, '#ff9ad0', '#000', 8);
  px = fit(g, 'UNDEFEATED', AN, 150, W - 2 * M); g.font = `${px}px ${AN}`; sf(g, 'UNDEFEATED', 0, 100, '#ffd21f', '#101014', 16); g.restore();
  g.restore();
}
export function drawFlash(g, a, color = '255,255,255') { if (a <= 0) return; g.save(); g.fillStyle = `rgba(${color},${Math.min(1, a)})`; g.fillRect(0, 0, W, H); g.restore(); }
export function drawVignette(g, k) { if (k <= 0) return; const gr = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${k})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
export { W, H, M };
