// Canvas2D atlases (Annex A 5.3): tex.leaf_atlas (8 foliage cards with alpha: pine needles, spruce, broadleaf cluster, maple,
// palm frond, fern, grass blades, reeds/flowers), atlas.particles (smoke, splash, spark, leaf, drop, dust, flare, rain streak),
// atlas.decals (light pool, puddle, oil stain, tyre marks). Seeded drawing so every run is identical.
import * as THREE from 'three';
import { MemTracker } from '../perf.js';
import { srng } from '../../art/kit/geo.js';

function canvas(n) { const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(n, n) : document.createElement('canvas'); c.width = n; c.height = n; return c; }
function tex(c, n, srgb = true, mips = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = mips; t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.anisotropy = 4;
  MemTracker.addTexture(t, n, n, 4, true, mips);
  return t;
}
/** leaf atlas cells: 4 x 2 grid. index -> [u0, v0, u1, v1] (v up) */
export const LEAF_CELLS = ['pine', 'spruce', 'broad', 'maple', 'palm', 'fern', 'grass', 'reeds'];
export function leafCell(name) { const i = LEAF_CELLS.indexOf(name); const cx = i % 4, cy = Math.floor(i / 4); return [cx / 4, 1 - (cy + 1) / 2, (cx + 1) / 4, 1 - cy / 2]; }

export function makeLeafAtlas(size = 1024) {
  const c = canvas(size), g = c.getContext('2d'), R = srng(77);
  const cw = size / 4, ch = size / 2;
  g.clearRect(0, 0, size, size);
  const cell = (i) => [(i % 4) * cw, Math.floor(i / 4) * ch];
  const col = (r, gg, b, v = 0.12) => { const k = 1 - v / 2 + R() * v; return `rgb(${Math.round(r * k)},${Math.round(gg * k)},${Math.round(b * k)})`; };
  // 0 pine: drooping branch with needle tufts (card spans branch from base at left-centre)
  const branch = (ox, oy, dark, droop, dense) => {
    g.save(); g.translate(ox, oy);
    g.strokeStyle = 'rgb(70,52,38)'; g.lineWidth = cw * 0.025; g.beginPath(); g.moveTo(cw * 0.04, ch * 0.5); g.quadraticCurveTo(cw * 0.5, ch * (0.5 + droop * 0.3), cw * 0.96, ch * (0.5 + droop)); g.stroke();
    for (let k = 0; k < dense; k++) {
      const t = R(); const x = cw * (0.06 + 0.9 * t), y = ch * (0.5 + droop * t * t) + (R() - 0.5) * ch * 0.55 * (1 - t * 0.5);
      g.strokeStyle = col(dark[0], dark[1], dark[2], 0.35); g.lineWidth = 1.4 + R() * 1.2;
      const a = (R() - 0.5) * 2.4, l = cw * (0.05 + 0.06 * R());
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    g.restore();
  };
  { const [x, y] = cell(0); branch(x, y, [46, 78, 46], 0.18, 2600); }
  { const [x, y] = cell(1); branch(x, y, [34, 60, 40], 0.3, 3000); }
  // 2 broadleaf cluster: many overlapping ovate leaves in a rough disc
  const leafBlob = (ox, oy, base, lobed) => {
    for (let k = 0; k < 260; k++) {
      const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.44;
      const x = ox + cw * (0.5 + Math.cos(a) * r), y = oy + ch * (0.5 + Math.sin(a) * r * 0.9);
      const s = cw * (0.03 + 0.03 * R()), rot = R() * Math.PI * 2;
      g.save(); g.translate(x, y); g.rotate(rot);
      const shade = 0.75 + 0.5 * (1 - r) * (0.6 + 0.4 * Math.sin(a + 2.2));
      g.fillStyle = col(base[0] * shade, base[1] * shade, base[2] * shade, 0.3);
      g.beginPath();
      if (lobed) { for (let q = 0; q < 5; q++) { const aa = (q / 5) * Math.PI * 2; g.ellipse(Math.cos(aa) * s * 0.5, Math.sin(aa) * s * 0.5, s * 0.55, s * 0.3, aa, 0, Math.PI * 2); } }
      else g.ellipse(0, 0, s, s * 0.48, 0, 0, Math.PI * 2);
      g.fill(); g.restore();
    }
  };
  { const [x, y] = cell(2); leafBlob(x, y, [70, 110, 50], false); }
  { const [x, y] = cell(3); leafBlob(x, y, [96, 118, 52], true); }
  // 4 palm frond: rachis with long leaflets both sides
  { const [x, y] = cell(4); g.save(); g.translate(x, y); g.strokeStyle = 'rgb(120,110,60)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cw * 0.03, ch * 0.5); g.quadraticCurveTo(cw * 0.5, ch * 0.42, cw * 0.97, ch * 0.58); g.stroke();
    for (let k = 0; k < 70; k++) { const t = k / 70, bx = cw * (0.05 + 0.9 * t), by = ch * (0.5 - 0.06 * Math.sin(t * 3.14) + 0.08 * t * t); const L = ch * 0.42 * Math.sin(Math.min(1, t * 1.1 + 0.1) * 3.0) * (1 - t * 0.4);
      for (const sd of [-1, 1]) { g.strokeStyle = col(70, 112, 48, 0.3); g.lineWidth = 2.2; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + cw * 0.04, by + sd * L * 0.6, bx + cw * 0.07, by + sd * L); g.stroke(); } }
    g.restore(); }
  // 5 fern: bipinnate frond (centre column, base at bottom)
  { const [x, y] = cell(5); g.save(); g.translate(x, y);
    for (let f = 0; f < 3; f++) { const ox = cw * (0.3 + f * 0.2); g.strokeStyle = 'rgb(60,90,40)'; g.lineWidth = 2; g.beginPath(); g.moveTo(ox, ch * 0.98); g.quadraticCurveTo(ox + (f - 1) * cw * 0.1, ch * 0.5, ox + (f - 1) * cw * 0.2, ch * 0.05); g.stroke();
      for (let k = 0; k < 26; k++) { const t = k / 26, px = ox + (f - 1) * cw * 0.2 * t * t, py = ch * (0.95 - 0.88 * t), L = cw * 0.16 * Math.sin((1 - t) * 2.6);
        for (const sd of [-1, 1]) { g.strokeStyle = col(72, 118, 46, 0.3); g.lineWidth = 3.2 * (1 - t * 0.6); g.beginPath(); g.moveTo(px, py); g.lineTo(px + sd * L, py - L * 0.25); g.stroke(); } } }
    g.restore(); }
  // 6 grass blades (base at bottom)
  { const [x, y] = cell(6); g.save(); g.translate(x, y);
    for (let k = 0; k < 140; k++) { const bx = cw * (0.05 + 0.9 * R()), h = ch * (0.45 + 0.5 * R()), lean = (R() - 0.5) * cw * 0.25; const dry = R() < 0.25;
      g.strokeStyle = dry ? col(150, 140, 80, 0.3) : col(84, 120, 50, 0.4); g.lineWidth = 1.5 + R() * 2; g.beginPath(); g.moveTo(bx, ch); g.quadraticCurveTo(bx + lean * 0.3, ch - h * 0.6, bx + lean, ch - h); g.stroke(); }
    g.restore(); }
  // 7 reeds with seed heads and a few flowers
  { const [x, y] = cell(7); g.save(); g.translate(x, y);
    for (let k = 0; k < 60; k++) { const bx = cw * (0.08 + 0.84 * R()), h = ch * (0.6 + 0.38 * R()), lean = (R() - 0.5) * cw * 0.12; g.strokeStyle = col(110, 120, 60, 0.3); g.lineWidth = 2; g.beginPath(); g.moveTo(bx, ch); g.lineTo(bx + lean, ch - h); g.stroke();
      if (R() < 0.3) { g.fillStyle = 'rgb(96,70,44)'; g.fillRect(bx + lean - 2, ch - h, 4, ch * 0.06); } }
    for (let k = 0; k < 18; k++) { g.fillStyle = ['#e8d86a', '#f0f0f0', '#c86ab0'][k % 3]; g.beginPath(); g.arc(x * 0 + cw * (0.1 + 0.8 * R()), ch * (0.55 + 0.4 * R()), 4, 0, Math.PI * 2); g.fill(); }
    g.restore(); }
  return tex(c, size);
}

export const PARTICLE_CELLS = ['smoke', 'splash', 'spark', 'leaf', 'drop', 'dust', 'flare', 'streak'];
export function particleCell(name) { const i = PARTICLE_CELLS.indexOf(name); return [(i % 4) / 4, 1 - (Math.floor(i / 4) + 1) / 2, (i % 4 + 1) / 4, 1 - Math.floor(i / 4) / 2]; }
export function makeParticleAtlas(size = 512) {
  const c = canvas(size), g = c.getContext('2d'), R = srng(5);
  const cw = size / 4, ch = size / 2;
  g.clearRect(0, 0, size, size);
  const at = (i) => [(i % 4) * cw + cw / 2, Math.floor(i / 4) * ch + ch / 2];
  const radial = (i, stops) => { const [x, y] = at(i); const gr = g.createRadialGradient(x, y, 0, x, y, Math.min(cw, ch) / 2); for (const [o, s] of stops) gr.addColorStop(o, s); g.fillStyle = gr; g.fillRect(x - cw / 2, y - ch / 2, cw, ch); };
  { const [x, y] = at(0); for (let k = 0; k < 30; k++) { const a = R() * 6.28, r = R() * cw * 0.25, gr = g.createRadialGradient(x + Math.cos(a) * r, y + Math.sin(a) * r, 0, x + Math.cos(a) * r, y + Math.sin(a) * r, cw * 0.22); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - cw / 2, y - ch / 2, cw, ch); } }
  radial(1, [[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(220,235,245,0.5)'], [1, 'rgba(255,255,255,0)']]);
  radial(2, [[0, 'rgba(255,240,200,1)'], [0.2, 'rgba(255,170,60,0.8)'], [1, 'rgba(255,120,0,0)']]);
  { const [x, y] = at(3); g.fillStyle = 'rgb(150,110,50)'; g.beginPath(); g.ellipse(x, y, cw * 0.3, ch * 0.14, 0.4, 0, 6.28); g.fill(); }
  radial(4, [[0, 'rgba(230,240,255,0.95)'], [0.5, 'rgba(200,220,240,0.5)'], [1, 'rgba(200,220,240,0)']]);
  radial(5, [[0, 'rgba(255,250,235,0.5)'], [1, 'rgba(255,250,235,0)']]);
  radial(6, [[0, 'rgba(255,255,255,1)'], [0.08, 'rgba(255,250,230,0.9)'], [0.3, 'rgba(255,230,180,0.25)'], [1, 'rgba(255,220,160,0)']]);
  { const [x, y] = at(7); const gr = g.createLinearGradient(x, y - ch / 2, x, y + ch / 2); gr.addColorStop(0, 'rgba(220,230,245,0)'); gr.addColorStop(0.5, 'rgba(220,230,245,0.7)'); gr.addColorStop(1, 'rgba(220,230,245,0)'); g.fillStyle = gr; g.fillRect(x - cw * 0.04, y - ch / 2, cw * 0.08, ch); }
  return tex(c, size);
}
export const DECAL_CELLS = ['pool', 'puddle', 'oil', 'tyre'];
export function decalCell(name) { const i = DECAL_CELLS.indexOf(name); return [(i % 2) / 2, 1 - (Math.floor(i / 2) + 1) / 2, (i % 2 + 1) / 2, 1 - Math.floor(i / 2) / 2]; }
export function makeDecalAtlas(size = 512) {
  const c = canvas(size), g = c.getContext('2d'), R = srng(9);
  const s = size / 2;
  g.clearRect(0, 0, size, size);
  { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,214,150,0.9)'); gr.addColorStop(0.35, 'rgba(255,190,120,0.45)'); gr.addColorStop(1, 'rgba(255,170,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }
  for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(40,40,44,0.35)'; g.beginPath(); g.ellipse(s + s * (0.25 + 0.5 * R()), s * (0.25 + 0.5 * R()), s * 0.18 * (0.5 + R()), s * 0.1 * (0.5 + R()), R() * 3, 0, 6.28); g.fill(); }
  { const gr = g.createRadialGradient(s / 2, s * 1.5, 0, s / 2, s * 1.5, s * 0.45); gr.addColorStop(0, 'rgba(10,10,10,0.6)'); gr.addColorStop(1, 'rgba(10,10,10,0)'); g.fillStyle = gr; g.fillRect(0, s, s, s); }
  for (let k = 0; k < 2; k++) for (let y = 0; y < s; y += 6) { g.fillStyle = 'rgba(20,20,20,0.35)'; g.fillRect(s + s * (0.32 + k * 0.28), s + y, s * 0.1, 3); }
  return tex(c, size);
}
