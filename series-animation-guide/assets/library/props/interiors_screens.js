// INTERIORS pack: live screens. A screen is a plane with a small canvas that is repainted as a pure function of t (flicker, scrolling text, radar sweeps...).
// liveScreen(kind, w, h, {px, fps, seed, ...}) -> Mesh with userData.update(t). Kinds: code news chart radar tv bars desktop telemetry map ecg movie countdown chat game stocks menu weather floor custom.
// Canvas is used for readable text / UI only, as the rules allow.
import * as THREE from 'three';
import { rng } from '../util.js';

const WORDS = ['init', 'load', 'sync', 'node', 'data', 'link', 'scan', 'core', 'ping', 'proc', 'mem', 'lock', 'boot', 'echo', 'grid', 'flux', 'cell', 'path', 'trace', 'heap', 'alpha', 'omega', 'relay', 'vector', 'uplink', 'cache'];
const hash = (i, s = 0) => { let x = Math.imul((i + 1) * 374761393 + s * 668265263, 1274126177); x ^= x >>> 13; x = Math.imul(x, 1103515245); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const MONO = 'ui-monospace, "DejaVu Sans Mono", monospace';
const SANS = 'Inter, "DejaVu Sans", sans-serif';

export const DRAW = {
  code(g, w, h, t, o) {
    g.fillStyle = o.bg ?? '#06140f'; g.fillRect(0, 0, w, h);
    const lh = h / 13, base = Math.floor(t * 2.2), fr = (t * 2.2) % 1;
    g.font = `700 ${lh * 0.78}px ${MONO}`; g.textBaseline = 'middle';
    for (let k = 0; k < 15; k++) {
      const idx = base + k, y = (14 - k - fr) * lh + lh * 0.2; const ind = Math.floor(hash(idx, o.seed) * 4) * lh * 1.1;
      const n = 2 + Math.floor(hash(idx, o.seed + 1) * 3); let x = 8 + ind;
      for (let q = 0; q < n; q++) { g.fillStyle = [o.fg ?? '#7dffb0', '#ffd866', '#78dce8', '#ff6188', '#e0e0e0'][Math.floor(hash(idx * 5 + q, o.seed + 2) * 5)]; const s = WORDS[Math.floor(hash(idx * 7 + q, o.seed + 3) * WORDS.length)] + (hash(idx + q, 9) < 0.3 ? '();' : ' '); g.fillText(s, x, y); x += g.measureText(s).width + 4; }
    }
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  },
  news(g, w, h, t, o) {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, o.c1 ?? '#0d2a66'); gr.addColorStop(1, o.c2 ?? '#2a6ad0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const heads = o.heads ?? ['GIANT CAT ON THE LOOSE', 'CITY HALL STORMED BY PIGEONS', 'LOCAL HERO SAVES BREAKFAST', 'WEATHER: CLOUDY WITH MEATBALLS'];
    const i = Math.floor(t / 3) % heads.length; g.fillStyle = '#fff'; g.font = `900 ${h * 0.12}px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(heads[i], w * 0.06, h * 0.42, w * 0.88); g.font = `600 ${h * 0.07}px ${SANS}`; g.fillStyle = '#cfe0ff'; g.fillText('LIVE FROM THE NEWSROOM', w * 0.06, h * 0.58, w * 0.8);
    g.fillStyle = '#e5173f'; g.fillRect(0, h * 0.82, w, h * 0.18); g.fillStyle = '#fff'; g.font = `800 ${h * 0.09}px ${SANS}`;
    const tk = ' ★ BREAKING ★ MARKETS UP ★ TRAFFIC DOWN ★ SPORT: HOME TEAM WINS 3-2 ★ MORE AFTER THE BREAK '; const tw = g.measureText(tk).width; const off = (t * w * 0.18) % tw;
    g.save(); g.beginPath(); g.rect(0, h * 0.82, w, h * 0.18); g.clip(); g.fillText(tk + tk, -off, h * 0.91); g.restore();
    if (Math.floor(t * 1.5) % 2 === 0) { g.fillStyle = '#e5173f'; g.beginPath(); g.roundRect(w * 0.06, h * 0.06, w * 0.16, h * 0.12, 6); g.fill(); g.fillStyle = '#fff'; g.font = `900 ${h * 0.08}px ${SANS}`; g.fillText('LIVE', w * 0.085, h * 0.12); }
  },
  chart(g, w, h, t, o) {
    g.fillStyle = o.bg ?? '#0b1020'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,160,255,0.18)'; g.lineWidth = 1;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, h * i / 6); g.lineTo(w, h * i / 6); g.stroke(); }
    for (let k = 0; k < 2; k++) { g.strokeStyle = k ? '#ff6188' : '#78dce8'; g.lineWidth = Math.max(2, w * 0.008); g.beginPath(); for (let x = 0; x <= 40; x++) { const u = x / 40, y = h * (0.5 - 0.3 * Math.sin(u * 6 + t * 1.2 + k * 2) * Math.sin(u * 2.3 + t * 0.4) - 0.1 * (k ? 1 : -1)); x ? g.lineTo(u * w, y) : g.moveTo(u * w, y); } g.stroke(); }
    for (let b = 0; b < 8; b++) { const bh = h * (0.1 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.5 + b))); g.fillStyle = '#ffd866'; g.fillRect(w * 0.08 + b * w * 0.11, h - bh - 4, w * 0.07, bh); }
  },
  radar(g, w, h, t, o) {
    g.fillStyle = o.bg ?? '#031a0c'; g.fillRect(0, 0, w, h); const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46;
    g.strokeStyle = '#1e8a4a'; g.lineWidth = 2; for (let i = 1; i <= 4; i++) { g.beginPath(); g.arc(cx, cy, R * i / 4, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    const a = t * 2.4; for (let i = 0; i < 28; i++) { g.strokeStyle = `rgba(80,255,140,${0.5 * (1 - i / 28)})`; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - i * 0.04) * R, cy + Math.sin(a - i * 0.04) * R); g.stroke(); }
    for (let i = 0; i < 6; i++) { const ang = hash(i, o.seed) * 6.28, rr = R * (0.2 + hash(i, o.seed + 4) * 0.7); const d = ((a - ang) % 6.28 + 6.28) % 6.28; g.fillStyle = `rgba(190,255,200,${Math.max(0.1, 1 - d / 5)})`; g.beginPath(); g.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, R * 0.035, 0, 7); g.fill(); }
  },
  tv(g, w, h, t, o) {
    const sc = Math.floor(t / 2.5), pal = [['#ffd23f', '#ff5c8a'], ['#6ad0ff', '#3a5ad0'], ['#7dff9a', '#2f8a5a'], ['#ff9a4a', '#c0392b']][sc % 4];
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 3; i++) { const x = ((t * 30 * (i + 1) + i * 90) % (w + 80)) - 40; g.beginPath(); g.ellipse(x, h * (0.18 + i * 0.1), 36, 14, 0, 0, 7); g.fill(); }
    const bx = w * (0.5 + 0.38 * Math.sin(t * 1.7)), by = h * (0.78 - 0.4 * Math.abs(Math.sin(t * 2.6)));
    g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, h * 0.12, 0, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(bx - h * 0.04, by - h * 0.02, h * 0.018, 0, 7); g.arc(bx + h * 0.04, by - h * 0.02, h * 0.018, 0, 7); g.fill(); g.beginPath(); g.arc(bx, by + h * 0.02, h * 0.05, 0.1, 3); g.stroke();
    g.fillStyle = '#fff'; g.strokeStyle = '#222'; g.lineWidth = 4; g.font = `900 ${h * 0.14}px ${SANS}`; g.textAlign = 'center'; const words = o.words ?? ['ZAP!', 'POW!', 'BOING!', 'WOW!']; g.strokeText(words[sc % 4], w / 2, h * 0.22); g.fillText(words[sc % 4], w / 2, h * 0.22);
    g.fillStyle = `rgba(255,255,255,${0.04 + 0.05 * hash(Math.floor(t * 30), 3)})`; g.fillRect(0, 0, w, h); g.textAlign = 'left';
  },
  bars(g, w, h, t, o) {
    const cols = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']; cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 7, 0, w / 7 + 1, h * 0.75); });
    ['#0000c0', '#111', '#c000c0', '#111', '#00c0c0', '#111', '#c0c0c0'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w / 7, h * 0.75, w / 7 + 1, h * 0.25); });
    g.fillStyle = 'rgba(255,255,255,0.18)'; const y = (t * h * 0.6) % h; g.fillRect(0, y, w, h * 0.06);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,255,255,${hash(i + Math.floor(t * 20), 4) * 0.25})`; g.fillRect(hash(i, Math.floor(t * 20)) * w, hash(i, 8 + Math.floor(t * 20)) * h, w * 0.08, 2); }
  },
  desktop(g, w, h, t, o) {
    g.fillStyle = o.bg ?? '#2a4a7a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a2238'; g.fillRect(0, h * 0.93, w, h * 0.07);
    for (let i = 0; i < 5; i++) { g.fillStyle = ['#ffd866', '#78dce8', '#ff6188', '#a9dc76', '#ab9df2'][i]; g.fillRect(w * (0.05 + i * 0.05), h * 0.945, w * 0.035, h * 0.04); }
    const wins = [[0.06, 0.08, 0.5, 0.55], [0.4, 0.28, 0.54, 0.58]]; wins.forEach(([x, y, ww, hh], k) => {
      g.fillStyle = '#f4f4f6'; g.fillRect(w * x, h * y, w * ww, h * hh); g.fillStyle = k ? '#5a8ad0' : '#d05a5a'; g.fillRect(w * x, h * y, w * ww, h * 0.07);
      g.fillStyle = '#556'; for (let l = 0; l < 6; l++) { const lw = (0.2 + 0.7 * hash(l + k * 7, o.seed)) * w * ww * 0.85; g.fillRect(w * (x + 0.03), h * (y + 0.12 + l * 0.065), lw, h * 0.02); }
    });
    if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = '#222'; g.fillRect(w * 0.3 + (Math.floor(t) % 4) * 4, h * 0.38, 3, h * 0.03); }
  },
  telemetry(g, w, h, t, o) {
    g.fillStyle = o.bg ?? '#07101c'; g.fillRect(0, 0, w, h); g.font = `700 ${h * 0.075}px ${MONO}`; g.textBaseline = 'middle';
    for (let r = 0; r < 8; r++) { const v = (hash(r, o.seed) * 900 + Math.sin(t * (1 + r * 0.3) + r) * 40 + t * (r + 1) * 0.7).toFixed(1); g.fillStyle = r % 3 === 0 ? '#ffd866' : '#78dce8'; g.fillText(['ALT', 'VEL', 'FUEL', 'TEMP', 'PRESS', 'ROLL', 'YAW', 'THRUST'][r] + ' ' + v.padStart(7, ' '), w * 0.04, h * (0.08 + r * 0.115)); g.fillStyle = '#1e3a5a'; g.fillRect(w * 0.62, h * (0.05 + r * 0.115), w * 0.34, h * 0.06); g.fillStyle = r % 4 === 3 ? '#ff6188' : '#a9dc76'; g.fillRect(w * 0.62, h * (0.05 + r * 0.115), w * 0.34 * (0.5 + 0.5 * Math.sin(t * 0.9 + r * 1.7)), h * 0.06); }
  },
  map(g, w, h, t, o) {
    g.fillStyle = o.bg ?? '#0a2a4a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,200,255,0.18)'; for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(w * i / 10, 0); g.lineTo(w * i / 10, h); g.stroke(); } for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, h * i / 5); g.lineTo(w, h * i / 5); g.stroke(); }
    g.fillStyle = '#2e7d52'; const blobs = [[0.2, 0.35, 0.12, 0.2], [0.27, 0.7, 0.07, 0.15], [0.52, 0.3, 0.1, 0.12], [0.55, 0.62, 0.08, 0.2], [0.75, 0.32, 0.18, 0.18], [0.85, 0.75, 0.06, 0.07]];
    blobs.forEach(([x, y, a, b]) => { g.beginPath(); g.ellipse(w * x, h * y, w * a, h * b, 0, 0, 7); g.fill(); });
    g.strokeStyle = '#ffd866'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(w * 0.2, h * 0.7); g.quadraticCurveTo(w * 0.5, h * 0.05, w * 0.85, h * 0.6); g.stroke(); g.setLineDash([]);
    const u = (t * 0.1) % 1, px = (1 - u) * (1 - u) * w * 0.2 + 2 * (1 - u) * u * w * 0.5 + u * u * w * 0.85, py = (1 - u) * (1 - u) * h * 0.7 + 2 * (1 - u) * u * h * 0.05 + u * u * h * 0.6;
    g.fillStyle = '#ff3a5a'; g.beginPath(); g.arc(px, py, h * 0.03 * (1 + 0.4 * Math.sin(t * 8)), 0, 7); g.fill();
    for (let i = 0; i < 6; i++) { g.fillStyle = Math.floor(t * 2 + i) % 3 ? '#78dce8' : '#fff'; g.fillRect(w * hash(i, 5), h * hash(i, 6), 4, 4); }
  },
  ecg(g, w, h, t, o) {
    g.fillStyle = o.bg ?? '#02100a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#41ff8a'; g.lineWidth = Math.max(2, h * 0.025); g.beginPath();
    const bpm = o.bpm ?? 72, per = 60 / bpm;
    for (let x = 0; x <= w; x += 2) { const tt = t - (w - x) / w * 3; const ph = ((tt % per) + per) % per / per; let y = 0; if (ph > 0.1 && ph < 0.18) y = Math.sin((ph - 0.1) / 0.08 * Math.PI) * 0.12; else if (ph > 0.3 && ph < 0.34) y = -(ph - 0.3) / 0.04 * 0.2; else if (ph >= 0.34 && ph < 0.4) y = -0.2 + (ph - 0.34) / 0.06 * 1.0; else if (ph >= 0.4 && ph < 0.45) y = 0.8 - (ph - 0.4) / 0.05 * 0.9; else if (ph > 0.55 && ph < 0.7) y = Math.sin((ph - 0.55) / 0.15 * Math.PI) * 0.18; x ? g.lineTo(x, h * 0.62 - y * h * 0.5) : g.moveTo(x, h * 0.62); }
    g.stroke(); g.fillStyle = '#41ff8a'; g.font = `800 ${h * 0.2}px ${MONO}`; g.textAlign = 'right'; g.fillText(String(bpm + Math.round(Math.sin(t) * 2)), w * 0.96, h * 0.25); g.font = `700 ${h * 0.09}px ${MONO}`; g.fillText('BPM', w * 0.96, h * 0.36); g.textAlign = 'left';
  },
  movie(g, w, h, t, o) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a1050'); gr.addColorStop(0.6, '#d0508a'); gr.addColorStop(1, '#ffb050'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))})`; g.fillRect(hash(i, 1) * w, hash(i, 2) * h * 0.55, 3, 3); }
    g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(w * 0.72, h * 0.42 + Math.sin(t * 0.4) * 6, h * 0.14, 0, 7); g.fill();
    g.fillStyle = '#16102a'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.78); for (let x = 0; x <= 12; x++) g.lineTo(x * w / 12, h * (0.72 + 0.08 * Math.sin(x * 1.7))); g.lineTo(w, h); g.fill();
    const hx = (t * 0.07 % 1.2) * w - w * 0.1; g.fillStyle = '#16102a'; g.beginPath(); g.arc(hx, h * 0.68 - Math.abs(Math.sin(t * 4)) * h * 0.03, h * 0.035, 0, 7); g.fill(); g.fillRect(hx - h * 0.025, h * 0.7 - Math.abs(Math.sin(t * 4)) * h * 0.03, h * 0.05, h * 0.07);
    g.fillStyle = '#fff'; g.font = `900 ${h * 0.12}px ${SANS}`; g.textAlign = 'center'; g.fillText(o.title ?? 'THE LAST SUNSET', w / 2, h * 0.16); g.textAlign = 'left';
    g.fillStyle = `rgba(0,0,0,${0.05 * hash(Math.floor(t * 24), 1)})`; g.fillRect(0, 0, w, h);
  },
  countdown(g, w, h, t, o) {
    g.fillStyle = '#050505'; g.fillRect(0, 0, w, h); const T = (o.start ?? 754) - t * (o.rate ?? 1); const s = Math.abs(Math.floor(T));
    const txt = `${T < 0 ? '+' : '-'} ${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    g.fillStyle = o.fg ?? '#ff4a3a'; g.font = `900 ${h * 0.5}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h * 0.5, w * 0.95); g.textAlign = 'left';
  },
  chat(g, w, h, t, o) {
    g.fillStyle = '#e9edf5'; g.fillRect(0, 0, w, h); const base = Math.floor(t * 0.8), fr = (t * 0.8) % 1; const lh = h * 0.16;
    for (let k = 0; k < 8; k++) { const idx = base + k, me = hash(idx, o.seed) < 0.5, bw = w * (0.3 + 0.4 * hash(idx, 3)), y = h - (k - 0 + fr) * lh - lh;
      g.fillStyle = me ? '#3a78d0' : '#ffffff'; g.beginPath(); g.roundRect(me ? w - bw - w * 0.05 : w * 0.05, y, bw, lh * 0.75, h * 0.04); g.fill(); g.fillStyle = me ? '#cfe0ff' : '#aab'; g.fillRect((me ? w - bw - w * 0.05 : w * 0.05) + bw * 0.1, y + lh * 0.3, bw * 0.7, lh * 0.12); }
  },
  game(g, w, h, t, o) {
    g.fillStyle = '#10162e'; g.fillRect(0, 0, w, h); const cs = h / 12;
    for (let i = 0; i < 14; i++) { const x = Math.floor(hash(i, o.seed) * (w / cs)) * cs, y = ((t * cs * (1.5 + hash(i, 4)) + hash(i, 5) * h) % (h + cs)) - cs; g.fillStyle = ['#ff5c8a', '#ffd23f', '#6ad0ff', '#7dff9a'][i % 4]; g.fillRect(x, Math.floor(y / cs) * cs, cs - 2, cs - 2); }
    g.fillStyle = '#fff'; g.font = `800 ${h * 0.09}px ${MONO}`; g.fillText('SCORE ' + String(Math.floor(t * 130)).padStart(6, '0'), 8, h * 0.07);
  },
  stocks(g, w, h, t, o) {
    g.fillStyle = '#04070c'; g.fillRect(0, 0, w, h); g.font = `800 ${h * 0.08}px ${MONO}`; g.textBaseline = 'middle';
    ['ACME', 'GLOB', 'MEOW', 'BOOM', 'FOOD', 'TOYS', 'CATS', 'ZZZZ'].forEach((n, i) => { const v = Math.sin(t * 0.7 + i * 1.3) * 3, up = v >= 0; g.fillStyle = '#9ab'; g.fillText(n, w * 0.04, h * (0.08 + i * 0.115)); g.fillStyle = up ? '#41ff8a' : '#ff5a5a'; g.fillText((100 + i * 17 + v).toFixed(2) + (up ? ' ▲' : ' ▼'), w * 0.4, h * (0.08 + i * 0.115)); });
  },
  weather(g, w, h, t, o) {
    g.fillStyle = '#4a9ae0'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(w * 0.28, h * 0.4, h * 0.2, 0, 7); g.fill();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + t; g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.moveTo(w * 0.28 + Math.cos(a) * h * 0.25, h * 0.4 + Math.sin(a) * h * 0.25); g.lineTo(w * 0.28 + Math.cos(a) * h * 0.33, h * 0.4 + Math.sin(a) * h * 0.33); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w * 0.45 + Math.sin(t * 0.5) * 10, h * 0.5, w * 0.12, h * 0.1, 0, 0, 7); g.fill(); g.font = `900 ${h * 0.22}px ${SANS}`; g.fillText('21°', w * 0.62, h * 0.4); g.font = `700 ${h * 0.09}px ${SANS}`; g.fillText('SUNNY SPELLS', w * 0.1, h * 0.85);
  },
  menu(g, w, h, t, o) {
    g.fillStyle = '#1a1410'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23f'; g.font = `900 ${h * 0.14}px ${SANS}`; g.textAlign = 'center'; g.fillText(o.title ?? 'TODAY', w / 2, h * 0.16);
    g.font = `700 ${h * 0.085}px ${SANS}`; g.textAlign = 'left'; (o.items ?? ['BURGER  $5', 'FRIES  $2', 'SHAKE  $4', 'PIE  $3']).forEach((s, i) => { g.fillStyle = i % 2 ? '#fff' : '#ffb98a'; g.fillText(s, w * 0.1, h * (0.34 + i * 0.16)); });
  },
  floor(g, w, h, t, o) {
    g.fillStyle = '#080808'; g.fillRect(0, 0, w, h); const v = o.value ? o.value(t) : 1 + (Math.floor(t * 0.5) % 8); g.fillStyle = '#ff9a3a'; g.font = `900 ${h * 0.8}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(v), w / 2, h * 0.54); g.textAlign = 'left';
  },
  custom(g, w, h, t, o) { o.draw(g, w, h, t, o); },
};

export function liveScreen(kind = 'code', w = 1, h = 0.6, o = {}) {
  const px = o.px ?? 256, pw = px, ph = Math.max(16, Math.round(px * h / w)), fps = o.fps ?? 10;
  const c = document.createElement('canvas'); c.width = pw; c.height = ph; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 2;
  const fn = typeof kind === 'function' ? kind : DRAW[kind];
  const opt = { seed: 1, ...o }; let last = -1;
  const paint = (t) => { const f = Math.floor(t * fps); if (f === last) return; last = f; g.save(); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; fn(g, pw, ph, f / fps + (o.t0 ?? 0), opt); g.restore(); tex.needsUpdate = true; };
  paint(0.6);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  m.userData.update = (t) => paint(t); m.userData.paint = paint; m.userData.noShadow = true;
  m.castShadow = false; m.receiveShadow = false; return m;
}
