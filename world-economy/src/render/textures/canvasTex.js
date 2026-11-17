// Canvas2D atlases (Annex A 5.3): tex.leaf_atlas (8 foliage cards with alpha: pine needles, spruce, broadleaf cluster, maple,
// palm frond, fern, grass blades, reeds/flowers), atlas.particles (smoke, splash, spark, leaf, drop, dust, flare, rain streak),
// atlas.decals (light pool, puddle, oil stain, tyre marks). Seeded drawing so every run is identical.
import * as THREE from 'three';
import { MemTracker } from '../perf.js';
import { srng } from '../../art/kit/geo.js';

function canvas(n, h = n) { const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(n, h) : document.createElement('canvas'); c.width = n; c.height = h; return c; }
function tex(c, n, srgb = true, mips = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = mips; t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.anisotropy = 4;
  MemTracker.addTexture(t, n, c.height, 4, true, mips);
  return t;
}
/** leaf atlas cells: 4 x 4 grid (canvas is size x size*4/3, cells keep the 3-row aspect). index -> [u0, v0, u1, v1] (v up) */
export const LEAF_CELLS = ['pine', 'spruce', 'broad', 'maple', 'palm', 'fern', 'grass', 'reeds', 'flowers', 'litter', 'clover', 'shrub', 'lawn', 'marram', 'cattail', 'daisy'];
export function leafCell(name) { const i = LEAF_CELLS.indexOf(name); const cx = i % 4, cy = Math.floor(i / 4); return [cx / 4, 1 - (cy + 1) / 4, (cx + 1) / 4, 1 - cy / 4]; }

export function makeLeafAtlas(size = 1024) {
  const c = canvas(size, Math.round(size * 4 / 3)), g = c.getContext('2d'), R = srng(77);
  const cw = size / 4, ch = size / 3;
  g.clearRect(0, 0, c.width, c.height);
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
  // tapered filled blade from base (x, y) up to a tip, gradient base -> tip (colours are 'r,g,b')
  const blade = (x, y, h, lean, w, c0, c1) => {
    const gr = g.createLinearGradient(x, y, x + lean, y - h); gr.addColorStop(0, `rgb(${c0})`); gr.addColorStop(1, `rgb(${c1})`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y);
    g.quadraticCurveTo(x - w * 0.25 + lean * 0.15, y - h * 0.62, x + lean, y - h);
    g.quadraticCurveTo(x + w * 0.35 + lean * 0.25, y - h * 0.6, x + w / 2, y); g.closePath(); g.fill();
  };
  const mix3 = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',');
  // 6 meadow grass: loose fan of tapered blades with a few seed stems (base at bottom)
  { const [x, y] = cell(6); g.save(); g.translate(x, y);
    for (let k = 0; k < 46; k++) { const t = R(), bx = cw * (0.5 + (t - 0.5) * 0.7), h = ch * (0.4 + 0.55 * R()), lean = (bx - cw * 0.5) * 0.9 + (R() - 0.5) * cw * 0.18, dry = R() < 0.22;
      blade(bx, ch, h, lean, cw * (0.035 + 0.03 * R()), dry ? mix3([110, 100, 50], [120, 110, 60], R()) : mix3([46, 76, 30], [64, 98, 38], R()), dry ? mix3([196, 176, 104], [214, 196, 128], R()) : mix3([118, 156, 62], [160, 190, 84], R())); }
    for (let k = 0; k < 5; k++) { const bx = cw * (0.25 + 0.5 * R()), h = ch * (0.78 + 0.18 * R()), lean = (R() - 0.5) * cw * 0.2; g.strokeStyle = 'rgb(150,150,86)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(bx, ch); g.quadraticCurveTo(bx + lean * 0.3, ch - h * 0.6, bx + lean, ch - h); g.stroke(); g.fillStyle = 'rgb(176,160,96)'; g.beginPath(); g.ellipse(bx + lean, ch - h - 5, 2.6, 9, lean * 0.01, 0, 6.28); g.fill(); }
    g.restore(); }
  // 7 reeds with seed heads and a few flowers (kept for the reed cards)
  { const [x, y] = cell(7); g.save(); g.translate(x, y);
    for (let k = 0; k < 34; k++) { const bx = cw * (0.08 + 0.84 * R()), h = ch * (0.6 + 0.38 * R()), lean = (R() - 0.5) * cw * 0.16; blade(bx, ch, h, lean, cw * 0.035, mix3([84, 100, 44], [96, 112, 52], R()), mix3([150, 150, 84], [176, 170, 100], R())); }
    for (let k = 0; k < 14; k++) { const bx = cw * (0.1 + 0.8 * R()), h = ch * (0.7 + 0.25 * R()); g.fillStyle = 'rgb(110,78,50)'; g.fillRect(bx - 2, ch - h, 4, ch * 0.05); }
    g.restore(); }
  // 8 wildflowers on thin stems (base at bottom): yellow, white, violet, red, blue heads over small leaves
  { const [x, y] = cell(8); g.save(); g.translate(x, y);
    for (let k = 0; k < 40; k++) { const bx = cw * (0.06 + 0.88 * R()), h = ch * (0.2 + 0.4 * R()), lean = (R() - 0.5) * cw * 0.14; blade(bx, ch, h, lean, cw * 0.03, '56,92,36', '96,140,56'); }
    for (let k = 0; k < 34; k++) { const bx = cw * (0.08 + 0.84 * R()), by = ch * (0.2 + 0.45 * R()), r = cw * (0.026 + 0.026 * R()), c = ['#f4e24a', '#ffffff', '#c85ab8', '#e8503a', '#7a8ae8', '#f4e24a'][k % 6];
      g.strokeStyle = 'rgb(64,104,42)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (R() - 0.5) * 4, ch); g.stroke();
      g.fillStyle = c; for (let q = 0; q < 5; q++) { const a = q / 5 * 6.28; g.beginPath(); g.ellipse(bx + Math.cos(a) * r * 0.9, by + Math.sin(a) * r * 0.9, r * 0.75, r * 0.5, a, 0, 6.28); g.fill(); }
      g.fillStyle = '#d89a20'; g.beginPath(); g.arc(bx, by, r * 0.45, 0, 6.28); g.fill(); }
    g.restore(); }
  // 9 forest litter: needles, small leaves, twigs scattered flat (ground-lying card, mostly opaque brown with holes)
  { const [x, y] = cell(9); g.save(); g.translate(x, y);
    for (let k = 0; k < 900; k++) { const px = cw * (0.02 + 0.96 * R()), py = ch * (0.02 + 0.96 * R()), a = R() * 6.28;
      const tone = R(); g.strokeStyle = tone < 0.5 ? col(120, 84, 50, 0.4) : tone < 0.8 ? col(88, 60, 36, 0.4) : col(150, 120, 60, 0.4); g.lineWidth = 1 + R() * 1.4;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * cw * 0.07, py + Math.sin(a) * cw * 0.07); g.stroke(); }
    for (let k = 0; k < 60; k++) { const px = cw * (0.05 + 0.9 * R()), py = ch * (0.05 + 0.9 * R()); g.fillStyle = col(R() < 0.5 ? 150 : 110, R() < 0.5 ? 100 : 84, 40, 0.4); g.save(); g.translate(px, py); g.rotate(R() * 6.28); g.beginPath(); g.ellipse(0, 0, cw * 0.035, cw * 0.018, 0, 0, 6.28); g.fill(); g.restore(); }
    g.restore(); }
  // 10 clover / low broadleaf plants and 11 shrub twig spray (small dark-green leaves on branching twigs)
  { const [x, y] = cell(10); g.save(); g.translate(x, y); for (let k = 0; k < 140; k++) { const px = cw * (0.08 + 0.84 * R()), py = ch * (0.5 + 0.48 * R()); g.fillStyle = col(64, 112, 46, 0.4); g.beginPath(); g.ellipse(px, py, cw * 0.05, cw * 0.035, R() * 6.28, 0, 6.28); g.fill(); } g.restore(); }
  { const [x, y] = cell(11); g.save(); g.translate(x, y); g.strokeStyle = 'rgb(80,60,40)'; g.lineWidth = 2;
    for (let b = 0; b < 5; b++) { const bx = cw * (0.2 + 0.15 * b); g.beginPath(); g.moveTo(bx, ch); g.quadraticCurveTo(bx + (b - 2) * 10, ch * 0.5, bx + (b - 2) * 24, ch * 0.08); g.stroke(); }
    for (let k = 0; k < 260; k++) { const px = cw * (0.05 + 0.9 * R()), py = ch * (0.05 + 0.9 * R()); g.fillStyle = col(52, 92, 40, 0.4); g.beginPath(); g.ellipse(px, py, cw * 0.04, cw * 0.022, R() * 6.28, 0, 6.28); g.fill(); } g.restore(); }
  // 12 lawn tuft: short dense fan of fine blades (tinted per instance), base at bottom
  { const [x, y] = cell(12); g.save(); g.translate(x, y);
    for (let k = 0; k < 34; k++) { const bx = cw * (0.5 + (R() - 0.5) * 0.62), h = ch * (0.28 + 0.4 * R()), lean = (bx - cw * 0.5) * 0.85 + (R() - 0.5) * cw * 0.1;
      blade(bx, ch, h, lean, cw * (0.045 + 0.03 * R()), mix3([44, 84, 30], [60, 100, 38], R()), mix3([104, 156, 58], [150, 196, 82], R())); }
    g.restore(); }
  // 13 marram dune grass: long arching pale blades in a clump
  { const [x, y] = cell(13); g.save(); g.translate(x, y);
    for (let k = 0; k < 30; k++) { const bx = cw * (0.5 + (R() - 0.5) * 0.3), h = ch * (0.55 + 0.42 * R()), lean = (bx - cw * 0.5) * 3.2 + (R() - 0.5) * cw * 0.3;
      blade(bx, ch, h, lean, cw * (0.04 + 0.025 * R()), mix3([118, 130, 70], [136, 146, 82], R()), mix3([206, 200, 140], [226, 218, 164], R())); }
    g.restore(); }
  // 14 cattails: tall stems with brown sausage heads and long sword leaves
  { const [x, y] = cell(14); g.save(); g.translate(x, y);
    for (let k = 0; k < 9; k++) { const bx = cw * (0.14 + 0.72 * R()), h = ch * (0.5 + 0.42 * R()), lean = (R() - 0.5) * cw * 0.3; blade(bx, ch, h, lean, cw * 0.05, '70,98,40', mix3([110, 140, 64], [150, 170, 84], R())); }
    for (let k = 0; k < 6; k++) { const bx = cw * (0.2 + 0.6 * R()), h = ch * (0.62 + 0.3 * R()), lean = (R() - 0.5) * cw * 0.1;
      g.strokeStyle = 'rgb(104,128,58)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(bx, ch); g.lineTo(bx + lean, ch - h); g.stroke();
      g.fillStyle = 'rgb(92,58,34)'; g.beginPath(); g.roundRect ? g.roundRect(bx + lean - cw * 0.024, ch - h - ch * 0.12, cw * 0.048, ch * 0.14, cw * 0.02) : g.rect(bx + lean - 4, ch - h - 36, 8, 42); g.fill();
      g.strokeStyle = 'rgb(130,110,60)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(bx + lean, ch - h - ch * 0.12); g.lineTo(bx + lean, ch - h - ch * 0.19); g.stroke(); }
    g.restore(); }
  // 15 lawn flowers: leaf rosette with dandelions, daisies and a seed puff
  { const [x, y] = cell(15); g.save(); g.translate(x, y);
    for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.6, l = cw * (0.18 + 0.22 * R()); g.fillStyle = `rgb(${mix3([52, 96, 36], [72, 120, 44], R())})`; g.beginPath(); g.ellipse(cw * 0.5 + Math.cos(a) * l * 0.5, ch * 0.96 + Math.sin(a) * l * 0.5, l * 0.55, cw * 0.035, a, 0, 6.28); g.fill(); }
    const heads = [[0.28, 0.5, 'dand'], [0.55, 0.38, 'daisy'], [0.72, 0.58, 'dand'], [0.42, 0.66, 'daisy'], [0.18, 0.74, 'daisy'], [0.82, 0.8, 'puff'], [0.6, 0.78, 'dand']];
    for (const [hx, hy, kind] of heads) { const bx = cw * hx, by = ch * hy; g.strokeStyle = 'rgb(70,110,46)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cw * 0.5 + (bx - cw * 0.5) * 0.3, ch * 0.96); g.quadraticCurveTo(bx - 4, ch * (hy + 0.3), bx, by); g.stroke();
      if (kind === 'puff') { g.fillStyle = 'rgba(240,240,232,0.85)'; g.beginPath(); g.arc(bx, by, cw * 0.06, 0, 6.28); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1; for (let q = 0; q < 14; q++) { const a = q / 14 * 6.28; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(a) * cw * 0.075, by + Math.sin(a) * cw * 0.075); g.stroke(); } }
      else { const r = cw * (kind === 'dand' ? 0.06 : 0.05), petals = kind === 'dand' ? 16 : 10; g.fillStyle = kind === 'dand' ? '#f2c820' : '#fafafa'; for (let q = 0; q < petals; q++) { const a = q / petals * 6.28; g.beginPath(); g.ellipse(bx + Math.cos(a) * r * 0.75, by + Math.sin(a) * r * 0.75, r * 0.62, r * 0.2, a, 0, 6.28); g.fill(); } g.fillStyle = kind === 'dand' ? '#e0a010' : '#f0c020'; g.beginPath(); g.arc(bx, by, r * 0.4, 0, 6.28); g.fill(); } }
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
export const DECAL_CELLS = ['pool', 'puddle', 'oil', 'tyre', 'blob', 'lilypad', 'lily', 'bushblob'];
/** decal atlas: 4 x 4 grid of square cells (v up) */
export function decalCell(name) { const i = DECAL_CELLS.indexOf(name); const cx = i % 4, cy = Math.floor(i / 4); return [cx / 4, 1 - (cy + 1) / 4, (cx + 1) / 4, 1 - cy / 4]; }
export function makeDecalAtlas(size = 1024) {
  const c = canvas(size), g = c.getContext('2d'), R = srng(9);
  const s = size / 4;
  g.clearRect(0, 0, size, size);
  const at = (i) => [(i % 4) * s, Math.floor(i / 4) * s];
  const radial = (i, stops, rx = 0.5, ry = 0.5) => { const [ox, oy] = at(i); g.save(); g.translate(ox + s / 2, oy + s / 2); g.scale(rx * 2, ry * 2); const gr = g.createRadialGradient(0, 0, 0, 0, 0, s / 2); for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(-s / 2, -s / 2, s, s); g.restore(); };
  radial(0, [[0, 'rgba(255,214,150,0.9)'], [0.35, 'rgba(255,190,120,0.45)'], [1, 'rgba(255,170,100,0)']]);
  { const [ox, oy] = at(1); for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(40,40,44,0.35)'; g.beginPath(); g.ellipse(ox + s * (0.25 + 0.5 * R()), oy + s * (0.25 + 0.5 * R()), s * 0.18 * (0.5 + R()), s * 0.1 * (0.5 + R()), R() * 3, 0, 6.28); g.fill(); } }
  radial(2, [[0, 'rgba(10,10,10,0.6)'], [1, 'rgba(10,10,10,0)']], 0.9, 0.9);
  { const [ox, oy] = at(3); for (let k = 0; k < 2; k++) for (let y = 0; y < s; y += s / 21) { g.fillStyle = 'rgba(20,20,20,0.35)'; g.fillRect(ox + s * (0.32 + k * 0.28), oy + y, s * 0.1, s / 42); } }
  // 4 contact-shadow blob under trees (soft, near-black)
  radial(4, [[0, 'rgba(0,0,0,0.62)'], [0.45, 'rgba(0,0,0,0.42)'], [0.8, 'rgba(0,0,0,0.12)'], [1, 'rgba(0,0,0,0)']]);
  // 5 lily pad: round leaf with a notch, veins and a darker rim
  { const [ox, oy] = at(5), cx = ox + s / 2, cy = oy + s / 2, r = s * 0.44, notch = 0.35;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgb(84,130,52)'); gr.addColorStop(0.8, 'rgb(62,106,40)'); gr.addColorStop(1, 'rgb(40,78,30)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, notch, Math.PI * 2 - notch); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(150,190,96,0.55)'; g.lineWidth = 1.4; for (let k = 0; k < 11; k++) { const a = notch + 0.2 + (k / 10) * (Math.PI * 2 - 2 * notch - 0.4); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94); g.stroke(); }
    g.fillStyle = 'rgba(60,40,20,0.18)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(cx + (R() - 0.5) * r, cy + (R() - 0.5) * r, 2 + R() * 3, 0, 6.28); g.fill(); } }
  // 6 water lily flower seen from above (two rings of petals around a golden centre)
  { const [ox, oy] = at(6), cx = ox + s / 2, cy = oy + s / 2;
    for (let ring = 0; ring < 3; ring++) { const n = 8 + ring * 2, rr = s * (0.42 - ring * 0.11); for (let q = 0; q < n; q++) { const a = q / n * 6.28 + ring * 0.3; g.fillStyle = ring === 0 ? '#f6dce8' : ring === 1 ? '#fbeaf2' : '#fff6fa'; g.beginPath(); g.ellipse(cx + Math.cos(a) * rr * 0.55, cy + Math.sin(a) * rr * 0.55, rr * 0.5, rr * 0.17, a, 0, 6.28); g.fill(); g.strokeStyle = 'rgba(210,120,150,0.45)'; g.lineWidth = 1; g.stroke(); } }
    g.fillStyle = '#f2b81e'; g.beginPath(); g.arc(cx, cy, s * 0.07, 0, 6.28); g.fill(); }
  // 7 bush ground blob (wider and softer than the tree blob)
  radial(7, [[0, 'rgba(0,0,0,0.5)'], [0.55, 'rgba(0,0,0,0.28)'], [1, 'rgba(0,0,0,0)']]);
  return tex(c, size);
}
