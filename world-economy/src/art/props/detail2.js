// Detail Batch 2 props (docs/DETAIL_CATALOG.md): bike racks with locked bikes, potted plants, firewood stacks, split-rail fences, crate / barrel /
// pallet stacks, tyre fenders, mooring bollards with rope, stump variants, poster columns, graffiti walls, string lights, steam vents,
// laundry lines, sandbags. Same contract as props/index.js: merged per chunk per material by the chunk manager (no extra draw calls),
// LOD0 detail, LOD1 coarser, LOD2 culled. Emissive codes >= 128 glow at night (bloom).
import { GB, srng, out } from '../kit/geo.js';
import { Builders } from '../../render/builders.js';

const G0 = new GB(8192), DS = new GB(2048);
function P(id, fn) {
  Builders.register(id, (pl, ctx) => {
    const lod = ctx.lod || 0;
    if (lod >= 2) return { batches: [] };
    const g = G0.reset(); g.ds = DS.reset();
    fn(g, lod, srng(pl.seed || 1), pl.params || {}, pl);
    return out({ 'mat.world': g, 'mat.world_ds': g.ds });
  }, { stage: 3 });
}
const seg = (lod, n) => (lod ? Math.max(4, n >> 1) : n);
const pick = (R, a) => a[Math.floor(R() * a.length) % a.length];

function bike(g, x, z, yaw, col, lod) { // standing bike (frame in the xz plane rotated by yaw), leaning on the rack
  g.push().translate(x, 0, z).rotY(yaw);
  g.mat('tex.rubber_tire', 0xffffff);
  for (const zz of [-0.5, 0.5]) { g.push().translate(0, 0.33, zz).rotZ(Math.PI / 2); g.cyl(0, -0.02, 0, 0.33, 0.33, 0.04, seg(lod, 12)); g.pop(); }
  g.mat('tex.metal_painted', col);
  g.beam([0, 0.33, -0.5], [0, 0.72, -0.12], 0.04); g.beam([0, 0.72, -0.12], [0, 0.33, 0.5], 0.035); g.beam([0, 0.72, -0.12], [0, 0.75, 0.32], 0.035); g.beam([0, 0.75, 0.32], [0, 0.33, 0.5], 0.03);
  g.beam([0, 0.33, -0.5], [0, 0.95, -0.42], 0.03); g.beam([-0.22, 0.97, -0.42], [0.22, 0.97, -0.42], 0.025);
  g.mat('tex.leather', 0x1a1a1a); g.box(0, 0.8, 0.32, 0.1, 0.04, 0.22);
  g.pop();
}
P('prop.bike_rack', (g, lod, R) => {
  g.mat('tex.metal_galvanized', 0xc8ccd0);
  for (let k = 0; k < 4; k++) { const z = -1.2 + k * 0.8; g.beam([0, 0.02, z], [0, 0.8, z], 0.05); g.beam([-0.0, 0.8, z], [0.0, 0.8, z + 0.0], 0.05); }
  g.beam([0, 0.8, -1.2], [0, 0.8, 1.2], 0.05); g.beam([0, 0.05, -1.2], [0, 0.05, 1.2], 0.04);
  const cols = [0xc02a20, 0x2a5aa0, 0x2a2a2c, 0xe0b020, 0x2a7a4a, 0xe8e8e4, 0x7a2a7a];
  const n = 1 + Math.floor(R() * 3);
  for (let k = 0; k < n; k++) bike(g, (R() < 0.5 ? -1 : 1) * 0.12, -0.8 + k * 0.8 + (R() - 0.5) * 0.1, Math.PI / 2 + (R() - 0.5) * 0.12, pick(R, cols), lod);
});
P('prop.potted_plant', (g, lod, R) => {
  g.mat('tex.paint_chipped', pick(R, [0xa8582e, 0x8a4a2a, 0x3a5a6a, 0xc8c0b0, 0x2a3a2a]));
  g.lathe([[0.001, 0], [0.16, 0], [0.2, 0.34], [0.23, 0.38], [0.2, 0.38], [0.001, 0.36]], seg(lod, 10));
  g.mat('tex.flat', pick(R, [0x3a6a2a, 0x4a7a32, 0x2e5a2a, 0x5a7a30]));
  g.push().translate(0, 0.62, 0).scale(0.3 + R() * 0.08, 0.3, 0.3 + R() * 0.08); g.lathe([[0.001, -1], [0.7, -0.6], [1, 0], [0.7, 0.7], [0.001, 1]], seg(lod, 8)); g.pop();
  if (!lod) { g.mat('tex.flat', pick(R, [0xe84a5a, 0xf0d040, 0xffffff, 0xc85ab8, 0xf08030])); for (let k = 0; k < 6; k++) { const a = R() * 6.28, r = 0.17 + R() * 0.12; g.box(Math.cos(a) * r, 0.62 + (R() - 0.3) * 0.3, Math.sin(a) * r, 0.07, 0.07, 0.07); } }
});
P('prop.firewood_stack', (g, lod, R) => {
  // split logs stacked end-on (axis along z) between two frame posts, with a plank cap
  g.mat('tex.wood_weathered_dark', 0xffffff);
  for (const x of [-0.95, 0.95]) g.box(x, 0.65, 0, 0.1, 1.3, 0.12, { noBottom: true });
  g.mat('tex.log_round', 0xe8d4b0);
  const rows = 5, cols = 7, d = 0.27;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols - (r & 1); c++) {
    const x = -0.8 + c * d + (r & 1) * d * 0.5 + (R() - 0.5) * 0.02, y = 0.15 + r * d * 0.9, len = 0.45 + R() * 0.12;
    g.push().translate(x, y, 0).rotX(Math.PI / 2); g.cyl(0, -len / 2, 0, 0.115 + R() * 0.02, 0.115, len, 5); g.pop();
  }
  g.mat('tex.wood_planks', 0x8a6a4a); g.box(0, 1.34, 0, 2.1, 0.04, 0.7);
  if (!lod) { g.mat('tex.log_round', 0xd8c4a0); for (let k = 0; k < 3; k++) { g.push().translate(0.2 + k * 0.28, 0.12, -0.45 - R() * 0.2).rotY(R() * 3).rotZ(Math.PI / 2); g.cyl(0, -0.2, 0, 0.1, 0.1, 0.4, 5); g.pop(); } }
});
P('prop.rail_fence', (g, lod, R) => { // 3 m split-rail section (local x along the run)
  g.mat('tex.wood_weathered_dark', 0xe0d0b8);
  for (const x of [-1.5, 1.5]) { g.beam([x, 0, 0.12], [x, 1.1, 0.12], 0.12); g.beam([x, 0, -0.12], [x, 1.1, -0.12], 0.12); }
  for (let k = 0; k < 3; k++) { const y = 0.3 + k * 0.32, o = (k % 2 ? 1 : -1) * 0.12; g.beam([-1.7, y + 0.04, -o], [1.7, y - 0.02 * (k & 1), o], 0.09, 0.08); }
  void lod; void R;
});
P('prop.crate_stack', (g, lod, R) => {
  const n = 3 + Math.floor(R() * 6), cols = [0xd0b080, 0x2a5a9a, 0xd8d8d0, 0xe06020, 0x6a8a5a];
  const stackAt = (x, z, levels) => { for (let l = 0; l < levels; l++) { const s = 0.7 + R() * 0.1, wood = R() < 0.6; g.mat(wood ? 'tex.wood_planks' : 'tex.plastic', wood ? 0xd0b080 : pick(R, cols)); g.push().translate(x + (R() - 0.5) * 0.06, l * 0.5, z + (R() - 0.5) * 0.06).rotY((R() - 0.5) * 0.4); g.box(0, 0.25, 0, s, 0.46, s * 0.7); if (!lod && wood) { g.mat('tex.wood_weathered_dark', 0xffffff); g.box(0, 0.25, -s * 0.35 - 0.005, s * 0.9, 0.06, 0.01); g.box(0, 0.25, s * 0.35 + 0.005, s * 0.9, 0.06, 0.01); g.mat('tex.flat', pick(R, [0xe8e0d0, 0xf0c040, 0xc84030])); g.box(0.1, 0.27, -s * 0.35 - 0.012, 0.28, 0.16, 0.005); } g.pop(); } };
  let placed = 0, i = 0;
  while (placed < n && i < 4) { const levels = Math.min(n - placed, 1 + Math.floor(R() * 3)); stackAt((i % 2) * 0.8 - 0.4, Math.floor(i / 2) * 0.62 - 0.3, levels); placed += levels; i++; }
});
P('prop.barrel_group', (g, lod, R) => {
  const n = 3 + Math.floor(R() * 4), cols = [0x2a4a7a, 0xb02a1a, 0x2a6a3a, 0xc8a020, 0x5a5a5e, 0x8a4a20];
  for (let k = 0; k < n; k++) {
    const a = k * 2.1 + R() * 0.6, r = k ? 0.52 + R() * 0.15 : 0, x = Math.cos(a) * r, z = Math.sin(a) * r;
    g.mat(R() < 0.3 ? 'tex.rust' : 'tex.paint_chipped', pick(R, cols)); g.push().translate(x, 0, z);
    if (R() < 0.15 && k) { g.rotZ(Math.PI / 2).translate(-0.3, 0.27, 0); } // one lying on its side
    g.lathe([[0.001, 0], [0.27, 0], [0.3, 0.45], [0.27, 0.9], [0.001, 0.9]], seg(lod, 12));
    if (!lod) { g.mat('tex.metal_painted', 0x3a3a3e); for (const y of [0.18, 0.72]) g.cyl(0, y, 0, 0.292, 0.292, 0.03, 12, { noTop: true, noBottom: true }); }
    g.pop();
  }
});
P('prop.pallet_stack', (g, lod, R) => {
  const lv = 1 + Math.floor(R() * 3);
  for (let l = 0; l < lv; l++) {
    const y = l * 0.95; g.mat('tex.wood_planks', 0xc8a878);
    for (let k = 0; k < 5; k++) g.box(0, y + 0.13, -0.45 + k * 0.225, 1.2, 0.025, 0.1); for (const x of [-0.55, 0, 0.55]) g.box(x, y + 0.06, 0, 0.1, 0.09, 1.0);
    g.mat('tex.plastic', pick(R, [0xe8e8e4, 0xd8e0e8, 0x2a2a30, 0xc8b078])); g.box(0, y + 0.52, 0, 1.1, 0.78, 0.9);
    if (!lod) { g.mat('tex.flat', 0xf0f0e8); g.box(0.2, y + 0.55, -0.455, 0.4, 0.25, 0.005); }
  }
});
P('prop.tyre_fender', (g, lod) => { // three hanging tyres in a row (local x along the quay edge)
  g.mat('tex.rubber_tire', 0xffffff);
  for (let k = 0; k < 3; k++) { g.push().translate((k - 1) * 0.9, 0.35, 0).rotX(Math.PI / 2); g.lathe([[0.14, 0], [0.34, 0], [0.34, 0.28], [0.14, 0.28]], seg(lod, 12), { r: 0.34 }); g.pop(); g.mat('tex.fabric_canvas', 0xb09870); g.beam([(k - 1) * 0.9, 0.7, 0.05], [(k - 1) * 0.9, 1.1, 0.12], 0.03); g.mat('tex.rubber_tire', 0xffffff); }
});
P('prop.bollard_rope', (g, lod, R) => { // mooring bollard with rope loops and a line trailing over the edge
  g.mat('tex.metal_painted', 0x2a2a2a); g.lathe([[0.22, 0], [0.18, 0.35], [0.2, 0.45], [0.28, 0.5], [0.28, 0.56], [0.001, 0.56]], seg(lod, 12));
  g.mat('tex.fabric_canvas', 0xc0a070);
  for (let k = 0; k < (lod ? 2 : 4); k++) g.cyl(0, 0.12 + k * 0.07, 0, 0.215 - (k & 1) * 0.01, 0.215, 0.06, seg(lod, 10), { noTop: true, noBottom: true });
  if (!lod) { const a = R() * 6.28, dx = Math.cos(a), dz = Math.sin(a); g.tube([dx * 0.2, 0.3, dz * 0.2], [dx * 0.9, 0.04, dz * 0.9], 0.035, 0.035, 5); g.tube([dx * 0.9, 0.04, dz * 0.9], [dx * 1.5, 0.03, dz * 1.2], 0.035, 0.035, 5); }
});
for (const [kind, tex, tint, moss, sz] of [['mossy', 'tex.bark_oak', 0xc8c0b0, true, 0.38], ['fresh', 'tex.bark_pine', 0xd8d0c0, false, 0.34], ['rotten', 'tex.wood_weathered_dark', 0xd8d0c4, true, 0.4]]) {
  P(`prop.stump_${kind}`, (g, lod, R) => {
    const h = 0.35 + R() * 0.5, r = sz * (0.8 + R() * 0.5);
    g.mat(tex, tint); g.cyl(0, -0.15, 0, r * 1.25, r, h + 0.15, seg(lod, 9), { noTop: true });
    for (let k = 0; k < (lod ? 0 : 4); k++) { const a = k * 1.6 + R(); g.beam([Math.cos(a) * r * 0.9, h * 0.3, Math.sin(a) * r * 0.9], [Math.cos(a) * r * 1.9, -0.02, Math.sin(a) * r * 1.9], 0.14, 0.06); }
    if (kind === 'rotten') { g.mat('tex.forest_floor', 0x3a2a1a); g.cyl(0, h - 0.02, 0, r * 0.6, r * 0.6, 0.02, seg(lod, 9), { noBottom: true }); g.mat('tex.log_round', 0xb09870); g.cyl(0, h, 0, r, r * 0.65, 0.02, seg(lod, 9), { noBottom: true, noTop: true }); }
    else { g.mat('tex.log_round', kind === 'fresh' ? 0xf0dcb8 : 0xc8b490); g.cyl(0, h, 0, r, r, 0.01, seg(lod, 9), { noBottom: true }); }
    if (moss) { g.mat('tex.moss', 0xffffff); g.cyl(0, h * 0.45, 0, r * 1.03, r * 1.03, h * 0.5, seg(lod, 9), { noBottom: true, noTop: true }); }
    if (kind === 'fresh' && !lod) { g.mat('tex.metal_painted', 0x2a2a2a); g.beam([r * 0.2, h + 0.02, 0], [r * 0.9, h + 0.28, 0.05], 0.07, 0.03); g.mat('tex.wood_planks', 0xb08858); g.beam([r * 0.9, h + 0.28, 0.05], [r * 0.9 + 0.3, h + 0.12, 0.06], 0.05); } // axe wedged in the cut
  });
}
P('prop.poster_column', (g, lod, R) => { // advertising column: tin cylinder wrapped in colourful bills, domed cap
  g.mat('tex.metal_painted', 0x2a3a2e); g.cyl(0, 0, 0, 0.55, 0.5, 0.25, seg(lod, 12)); g.cyl(0, 2.45, 0, 0.5, 0.55, 0.1, seg(lod, 12));
  g.push().translate(0, 2.55, 0).scale(0.5, 0.3, 0.5); g.lathe([[0.001, 0], [1.1, 0], [0.8, 0.8], [0.001, 1.3]], seg(lod, 12)); g.pop();
  const n = seg(lod, 12), pal = [0xe84a3a, 0xf0d040, 0x3a7ac8, 0xf0f0e8, 0x58b070, 0xd85aa8, 0xff9a30, 0x2a2a30];
  for (let k = 0; k < n; k++) { const a0 = k / n * 6.2832, a1 = (k + 1) / n * 6.2832, r = 0.5; g.mat('tex.flat', pick(R, pal));
    g.quad([Math.cos(a0) * r, 0.3, Math.sin(a0) * r], [Math.cos(a1) * r, 0.3, Math.sin(a1) * r], [Math.cos(a1) * r, 0.3 + (1.0 + R() * 0.9), Math.sin(a1) * r], [Math.cos(a0) * r, 0.3 + (1.0 + R() * 0.9), Math.sin(a0) * r]);
    if (!lod) { g.mat('tex.flat', pick(R, pal)); const y0 = 0.5 + R() * 1.2; g.quad([Math.cos(a0) * 0.505, y0, Math.sin(a0) * 0.505], [Math.cos(a1) * 0.505, y0, Math.sin(a1) * 0.505], [Math.cos(a1) * 0.505, y0 + 0.5, Math.sin(a1) * 0.505], [Math.cos(a0) * 0.505, y0 + 0.5, Math.sin(a0) * 0.505]); } }
});
P('prop.graffiti_wall', (g, lod, R) => { // concrete panel wall with spray tags (thin coloured strokes) and a stencil blob
  g.mat('tex.concrete_cast', 0xb8b4aa); g.box(0, 1.1, 0, 4.2, 2.2, 0.25); g.box(0, 0.12, 0, 4.4, 0.24, 0.4);
  if (lod) return;
  const cols = [0xe83a8a, 0x30c8e8, 0xf0e030, 0x40e060, 0xf0f0f0, 0xff7020];
  for (let t = 0; t < 4; t++) {
    g.mat('tex.flat', pick(R, cols)); const x0 = -1.8 + t * 0.95 + R() * 0.3, y0 = 0.7 + R() * 1.0;
    let px = x0, py = y0; for (let k = 0; k < 6; k++) { const nx = px + 0.1 + R() * 0.16, ny = Math.max(0.4, Math.min(2.0, py + (R() - 0.5) * 0.5)); g.beam([px, py, -0.132], [nx, ny, -0.132], 0.045, 0.04); px = nx; py = ny; }
  }
  g.mat('tex.flat', pick(R, cols)); g.push().translate(R() * 1.5 - 0.75, 1.0, -0.13).scale(0.5, 0.35, 0.01); g.lathe([[0.001, -1], [1, -0.4], [1, 0.4], [0.001, 1]], 8); g.pop();
});
P('prop.string_lights', (g, lod, R) => { // two poles 6 m apart with a sagging wire and warm bulbs (emissive, glow at night)
  g.mat('tex.wood_weathered_dark', 0xe0d0b8); for (const x of [-3, 3]) g.cyl(x, 0, 0, 0.06, 0.05, 3.3, 6);
  const N = lod ? 6 : 12, pts = [];
  for (let k = 0; k <= N; k++) { const t = k / N; pts.push([-3 + 6 * t, 3.2 - 0.55 * Math.sin(Math.PI * t) * 1.0, 0]); }
  g.mat('tex.metal_painted', 0x1a1a1a); for (let k = 0; k < N; k++) g.beam(pts[k], pts[k + 1], 0.015);
  g.mat('tex.glass_window', 0xffe2a0); g.emit(230); for (let k = 1; k < N; k++) { const p = pts[k]; g.box(p[0], p[1] - 0.09, 0, 0.09, 0.12, 0.09); } g.emit(0);
});
P('prop.steam_vent', (g, lod) => { // street steam stack: orange-white striped pipe with a cowl and a grated base
  g.mat('tex.metal_painted', 0xd0601a); g.cyl(0, 0, 0, 0.17, 0.15, 1.1, seg(lod, 10));
  g.mat('tex.flat', 0xf0f0e8); for (const y of [0.25, 0.55, 0.85]) g.cyl(0, y, 0, 0.172, 0.172, 0.12, seg(lod, 10), { noTop: true, noBottom: true });
  g.mat('tex.metal_painted', 0x3a3a3c); g.cyl(0, 1.1, 0, 0.28, 0.1, 0.18, seg(lod, 10)); g.cyl(0, 0, 0, 0.45, 0.45, 0.03, seg(lod, 12));
});
P('prop.laundry_line', (g, lod, R) => { // yard washing line: two poles, a line and hung clothes (double-sided cloth)
  g.mat('tex.metal_painted', 0x4a4e50); for (const x of [-2, 2]) { g.cyl(x, 0, 0, 0.04, 0.035, 2.2, 6); g.beam([x, 2.1, 0], [x, 2.2, 0.5 * (x > 0 ? -1 : 1)], 0.03); }
  g.beam([-2, 2.1, 0], [2, 2.1, 0], 0.012);
  if (lod) return;
  const cols = [0xf0f0e8, 0x2a5aa0, 0xc83a3a, 0xf0d060, 0x4a8a5a, 0xd890b0, 0x8a8a90];
  let x = -1.7; while (x < 1.6) { const w = 0.3 + R() * 0.3, h = 0.4 + R() * 0.5; g.ds.mat('tex.fabric_cloth', pick(R, cols)); g.ds.quad([x + w, 2.08, 0], [x, 2.08, 0], [x, 2.08 - h, 0.02], [x + w, 2.08 - h, 0.02]); x += w + 0.08 + R() * 0.15; }
});
P('prop.sandbags', (g, lod, R) => { g.mat('tex.fabric_canvas', 0xb8a880); for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) { g.push().translate(-0.9 + c * 0.55 + r * 0.27, 0.1 + r * 0.17, 0).rotY((R() - 0.5) * 0.15).scale(0.28, 0.1, 0.17); g.lathe([[0.001, -1], [1, -0.4], [1, 0.4], [0.001, 1]], seg(lod, 6)); g.pop(); } });
