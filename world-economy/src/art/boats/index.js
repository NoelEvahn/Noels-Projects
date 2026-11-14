// Boat generators (Annex A 7.2): hulls lofted from station sections (keel, chine, sheer) with an inner cockpit/deck,
// gunwale and rub rail; superstructures and fittings as sub-generators. The trawler follows reference 15 (red hull with
// black rub rail, white wheelhouse with 9 windows, mast with radar and antennas, A-frame gantry with blue nets, green winch,
// floodlights, life ring, buoys, rudder and propeller). Origin at the design waterline, bow = local -Z.
import { GB, srng, out } from '../kit/geo.js';
import { Builders } from '../../render/builders.js';
import { ARCHETYPES } from '../../world/archetypes.js';

const G0 = new GB(16384), DS = new GB(2048);
/**
 * hull(g, L, B, sheer, keel, o): half-breadth b(t), sheer height and keel depth per station t in [-1 (bow), 1 (stern)].
 * o: { deck: inner floor height (open boat) or null (decked), n stations, m half points, transom }
 */
function hull(g, L, B, sheer, keel, o = {}) {
  const n = o.n || 12, secs = [], hl = L / 2;
  for (let k = 0; k <= n; k++) {
    const t = -1 + (2 * k) / n, z = t * hl;
    const bow = Math.min(1, (t + 1) / 0.55), b = Math.max(0.03, B / 2 * Math.pow(bow, 0.6) * (1 - 0.12 * Math.max(0, t - 0.6)));
    const sh = sheer + (o.sheerRise || 0.25) * Math.max(0, -t) ** 2, kd = keel * (0.55 + 0.45 * Math.min(1, bow * 1.6)) * (t > 0.85 ? 0.85 : 1);
    const chine = o.flat ? 0.15 : 0.55;
    const pts = [[-b, sh], [-b * 0.97, sh * 0.4], [-b * 0.86, -kd * chine], [-b * 0.45, -kd * 0.92], [0, -kd], [b * 0.45, -kd * 0.92], [b * 0.86, -kd * chine], [b * 0.97, sh * 0.4], [b, sh]];
    if (o.deck != null) { const ib = Math.max(0.01, b - 0.07); pts.push([ib, sh], [ib * 0.92, o.deck], [-ib * 0.92, o.deck], [-ib, sh]); }
    secs.push({ z, pts });
  }
  g.loft(secs, { caps: true, flip: true });
  return secs;
}
function rubRail(g, L, B, sheer, tint) {
  g.mat('tex.plastic', tint);
  const hl = L / 2;
  for (const sx of [-1, 1]) { let prev = null; for (let k = 0; k <= 8; k++) { const t = -1 + k / 4, bow = Math.min(1, (t + 1) / 0.55), b = Math.max(0.03, B / 2 * Math.pow(bow, 0.6) * (1 - 0.12 * Math.max(0, t - 0.6))) + 0.03, p = [sx * b, sheer + 0.25 * Math.max(0, -t) ** 2 - 0.06, t * hl]; if (prev) g.tube(prev, p, 0.05, 0.05, 5, { noTop: true, noBottom: true }); prev = p; } }
}
function lifeRing(g, x, y, z, yaw) { g.push().translate(x, y, z).rotY(yaw); for (let k = 0; k < 8; k++) { const a0 = (k / 8) * 6.28, a1 = ((k + 1) / 8) * 6.28; g.mat('tex.plastic', (k >> 1) % 2 ? 0xf0f0f0 : 0xe84020); g.tube([Math.cos(a0) * 0.3, Math.sin(a0) * 0.3, 0], [Math.cos(a1) * 0.3, Math.sin(a1) * 0.3, 0], 0.07, 0.07, 5, { noTop: true, noBottom: true }); } g.pop(); }
function outboard(g, z, y, hp) { const s = hp > 20 ? 1 : 0.7; g.mat('tex.metal_painted', 0x1e1e22); g.box(0, y + 0.3 * s, z + 0.2, 0.36 * s, 0.5 * s, 0.55 * s); g.mat('tex.metal_painted', 0x3a3a3e); g.box(0, y - 0.25, z + 0.25, 0.12, 0.7, 0.18); g.box(0, y - 0.62, z + 0.25, 0.1, 0.12, 0.3); g.mat('tex.metal_aluminium', 0xd0d0d0); g.box(0, y - 0.62, z + 0.44, 0.3, 0.05, 0.05); }
function rails(g, L, B, y, z0, z1) { g.mat('tex.metal_galvanized', 0xe0e0e0); for (const sx of [-1, 1]) { g.tube([sx * (B / 2 - 0.1), y + 0.8, z0], [sx * (B / 2 - 0.1), y + 0.8, z1], 0.025, 0.025, 5); for (let z = z0; z <= z1 + 0.01; z += 1.5) g.tube([sx * (B / 2 - 0.1), y, z], [sx * (B / 2 - 0.1), y + 0.8, z], 0.02, 0.02, 4); } void L; }
function cabin(g, w, h, d, x, y, z, wallTex, tint, win, emit) {
  g.mat(wallTex, tint); g.box(x, y + h / 2, z, w, h, d);
  g.mat('tex.glass_window', 0xffffff); g.emit(emit || 0);
  const wy0 = y + h * 0.5, wy1 = y + h * 0.85;
  for (let k = 0; k < win; k++) { const t = (k + 0.5) / win; g.quadUV([x - w / 2 + (t + 0.4 / win) * w, wy0, z - d / 2 - 0.01], [x - w / 2 + (t - 0.4 / win) * w, wy0, z - d / 2 - 0.01], [x - w / 2 + (t - 0.4 / win) * w, wy1, z - d / 2 - 0.01], [x - w / 2 + (t + 0.4 / win) * w, wy1, z - d / 2 - 0.01], k + 0.1, 0.1, k + 0.9, 0.9); }
  for (const sx of [-1, 1]) g.box(x + sx * (w / 2 + 0.005), (wy0 + wy1) / 2, z, 0.01, wy1 - wy0, d * 0.7);
  g.emit(0);
}

const B = {
  'boat.rowboat': (g, lod) => {
    const [W, , L] = ARCHETYPES['boat.rowboat'].size;
    g.mat('tex.wood_painted', 0x8a6a48); hull(g, L, W, 0.42, 0.28, { deck: 0.0, n: lod ? 6 : 12 });
    if (!lod) { g.mat('tex.wood_weathered_dark', 0xffffff); for (let k = 0; k < 4; k++) rubRail(g, L * (1 - k * 0.04), W * (1 - k * 0.06), 0.42 - k * 0.14, 0x5a4636); }
    g.mat('tex.wood_planks', 0xb09070); for (const z of [-0.6, 0.3, 1.1]) g.box(0, 0.24, z, W - 0.25, 0.04, 0.25);
    g.mat('tex.wood_planks', 0xc8a070); for (const sx of [-1, 1]) g.beam([sx * 0.4, 0.3, 0.2], [sx * 0.55, 0.28, -2.0], 0.05);
    outboard(g, L / 2, 0.45, 6);
  },
  'boat.skiff': (g, lod) => {
    const [W, , L] = ARCHETYPES['boat.skiff'].size;
    g.mat('tex.metal_aluminium', 0xd8dcdc); hull(g, L, W, 0.55, 0.32, { deck: 0.05, n: lod ? 6 : 12, flat: true });
    g.mat('tex.metal_painted', 0x2a5a9a); rubRail(g, L, W, 0.45, 0x2a5a9a);
    g.mat('tex.metal_aluminium', 0xc8ccd0); for (const z of [-1.2, 0.2, 1.4]) g.box(0, 0.38, z, W - 0.25, 0.05, 0.35);
    if (!lod) { g.mat('tex.plastic', 0xe06020); g.box(0, 0.42, -1.6, 0.4, 0.2, 0.3); }
    outboard(g, L / 2, 0.6, 25);
  },
  'boat.console': (g, lod) => {
    const [W, , L] = ARCHETYPES['boat.console'].size;
    g.mat('tex.plastic', 0xf0f0ec); hull(g, L, W, 0.85, 0.55, { deck: 0.25, n: lod ? 6 : 14 });
    rubRail(g, L, W, 0.85, 0x2a4a7a);
    g.mat('tex.plastic', 0xe8e8e4); g.box(0, 0.75, 0.2, 1.1, 1.0, 0.9); g.mat('tex.glass_window', 0xa0b0c0); g.quad([-0.55, 1.25, -0.25], [0.55, 1.25, -0.25], [0.5, 1.7, -0.05], [-0.5, 1.7, -0.05]);
    g.mat('tex.metal_aluminium', 0xe0e0e0); for (const sx of [-1, 1]) for (const z of [-0.2, 0.7]) g.tube([sx * 0.6, 1.25, z], [sx * 0.7, 2.25, z], 0.03, 0.03, 5);
    g.ds.mat('tex.fabric_canvas', 0x2a4a7a); g.ds.quad([0.8, 2.25, -0.4], [-0.8, 2.25, -0.4], [-0.8, 2.25, 0.9], [0.8, 2.25, 0.9]);
    if (!lod) { g.mat('tex.metal_aluminium', 0xe0e0e0); for (let k = 0; k < 4; k++) g.tube([-0.5 + k * 0.33, 2.25, 0.9], [-0.55 + k * 0.36, 3.2, 1.5], 0.015, 0.008, 4); }
    for (const sx of [-1, 1]) { g.push().translate(sx * 0.45, 0, 0); outboard(g, L / 2, 0.9, 150); g.pop(); }
  },
  'boat.trawler': (g, lod, R, p) => {
    const [W, , L] = ARCHETYPES['boat.trawler'].size, hullCol = p.livery === 'blue' ? 0x2e63a6 : 0xb8261e;
    const P = g.paintGB; P.mat('tex.paint_chipped', hullCol); hull(P, L, W, 1.9, 2.2, { n: lod ? 8 : 16, sheerRise: 0.9 });
    g.mat('tex.paint_chipped', 0x1a1a1a); rubRail(g, L, W, 1.8, 0x1a1a1a);
    if (!lod) { g.mat('tex.rust', 0xffffff); for (let k = 0; k < 6; k++) g.box(W / 2 * 0.98 - 0.0, 1.0, -L * 0.35 + k * L * 0.13, 0.02, 1.4, 0.25); }
    // deck (checker plate) and bulwarks
    g.mat('tex.metal_checker', 0x9a9a8a); g.box(0, 1.92, 0.5, W - 0.3, 0.06, L * 0.8);
    P.mat('tex.paint_chipped', hullCol); for (const sx of [-1, 1]) g.mat('tex.paint_chipped', hullCol), g.box(sx * (W / 2 - 0.15), 2.3, 1.0, 0.1, 0.8, L * 0.65);
    // wheelhouse with 9 windows (3 front, 3 per side) and roof
    const wz = -L * 0.12, wy = 1.95;
    cabin(g, W * 0.62, 2.3, 4.0, 0, wy, wz, 'tex.paint_chipped', 0xf2f0ea, 3, 40);
    g.mat('tex.glass_window', 0xffffff); for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) g.box(sx * (W * 0.31 + 0.01), wy + 1.6, wz - 1.3 + k * 1.3, 0.02, 0.7, 0.9);
    g.mat('tex.paint_chipped', 0xe8e4dc); g.box(0, wy + 2.42, wz, W * 0.7, 0.15, 4.4);
    g.mat('tex.paint_chipped', 0xf2f0ea); g.box(0, wy + 1.0, wz + 3.2, W * 0.5, 2.0, 2.4);
    // mast, radar, antennas, floodlights
    g.mat('tex.metal_painted', 0xf0f0f0); g.cyl(0, wy + 2.5, wz + 0.5, 0.12, 0.08, 5.5, 8); g.box(0, wy + 6.0, wz + 0.5, 2.6, 0.1, 0.1);
    g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, wy + 2.9, wz - 0.8, 1.8, 0.1, 0.28); g.cyl(0, wy + 2.5, wz - 0.8, 0.15, 0.15, 0.4, 8);
    g.mat('tex.metal_galvanized', 0xd0d0d0); for (const x of [-1.1, 1.1]) g.cyl(x, wy + 6.0, wz + 0.5, 0.02, 0.01, 2.2, 3);
    g.mat('tex.glass_window', 0xfff4e0); g.emit(230); for (const x of [-0.9, 0.9]) g.box(x, wy + 5.0, wz + 0.25, 0.3, 0.25, 0.15); g.emit(0);
    // stern A-frame gantry with blue nets, green winch, net drum
    g.mat('tex.metal_painted', 0xe08020); const gz = L / 2 - 1.2;
    for (const sx of [-1, 1]) g.beam([sx * (W / 2 - 0.4), 1.95, gz], [sx * 0.9, 7.2, gz - 0.6], 0.25); g.box(0, 7.2, gz - 0.6, 2.2, 0.3, 0.3);
    g.mat('tex.metal_painted', 0x3a7a3a); g.push().translate(0, 2.8, wz + 5.2).rotZ(Math.PI / 2); g.cyl(0, -1.2, 0, 0.55, 0.55, 2.4, lod ? 8 : 14); g.pop();
    g.mat('tex.fabric_cloth', 0x2a5a9a); g.push().translate(0, 3.1, gz - 2.2).rotZ(Math.PI / 2); g.cyl(0, -1.3, 0, 0.75, 0.75, 2.6, lod ? 8 : 14); g.pop();
    g.ds.mat('tex.fabric_cloth', 0x2a5a9a); g.ds.quad([1.0, 7.0, gz - 0.6], [-1.0, 7.0, gz - 0.6], [-1.4, 2.0, gz + 0.4], [1.4, 2.0, gz + 0.4]);
    // red buoys, life rings, rudder and propeller
    g.mat('tex.paint_chipped', 0xe8452c); for (let k = 0; k < 4; k++) { g.push().translate(-W * 0.3 + k * 0.5, 2.25, gz - 3.4); g.lathe([[0, -0.2], [0.22, -0.1], [0.24, 0.1], [0, 0.22]], 8); g.pop(); }
    lifeRing(g, W * 0.31 + 0.08, wy + 1.0, wz + 1.2, Math.PI / 2); lifeRing(g, -W * 0.31 - 0.08, wy + 1.0, wz + 1.2, -Math.PI / 2);
    g.mat('tex.paint_chipped', 0x1a1a1a); g.box(0, -1.2, L / 2 - 0.3, 0.12, 1.6, 1.0);
    g.mat('tex.metal_aluminium', 0xc8a050); for (let k = 0; k < 4; k++) { g.push().translate(0, -1.4, L / 2 - 1.0).rotZ((k / 4) * Math.PI * 2); g.box(0, 0.3, 0, 0.12, 0.6, 0.04); g.pop(); }
    // anchor at the bow
    g.mat('tex.metal_painted', 0x2a2a2a); g.box(W * 0.3, 2.4, -L / 2 + 1.5, 0.08, 0.7, 0.4);
    void R;
  },
  'boat.workboat': (g, lod) => {
    const [W, , L] = ARCHETYPES['boat.workboat'].size, P = g.paintGB;
    P.mat('tex.paint_chipped', 0x2a3a2e); hull(P, L, W, 1.6, 1.9, { n: lod ? 8 : 14, sheerRise: 0.4 });
    g.mat('tex.rubber_tire', 0xffffff); for (let k = 0; k < (lod ? 4 : 10); k++) for (const sx of [-1, 1]) { g.push().translate(sx * (W / 2 + 0.05), 1.1, -L * 0.4 + k * L * 0.085).rotZ(Math.PI / 2); g.cyl(0, -0.12, 0, 0.4, 0.4, 0.24, 8); g.pop(); }
    g.mat('tex.metal_checker', 0x8a8a7a); g.box(0, 1.62, 0, W - 0.3, 0.06, L * 0.85);
    cabin(g, W * 0.6, 2.4, 3.6, 0, 1.65, -L * 0.18, 'tex.paint_chipped', 0xe8c040, 3, 50);
    g.mat('tex.metal_painted', 0xe0a020); g.cyl(0, 1.65, L * 0.15, 0.4, 0.35, 2.2, 8); g.beam([0, 3.6, L * 0.15], [0, 5.5, L * 0.15 + 4.5], 0.3);
    g.mat('tex.rubber_tire', 0xffffff); g.box(0, 1.4, -L / 2 - 0.1, 1.6, 1.0, 0.4);
  },
  'boat.ferry': (g, lod) => {
    const [W, , L] = ARCHETYPES['boat.ferry'].size, P = g.paintGB;
    P.mat('tex.paint_chipped', 0xf0f0ec); hull(P, L, W, 1.1, 1.0, { n: lod ? 8 : 12 });
    rubRail(g, L, W, 1.0, 0x2a5a9a);
    g.mat('tex.metal_checker', 0x9a9a9a); g.box(0, 1.12, 0, W - 0.3, 0.05, L * 0.85);
    cabin(g, W * 0.86, 2.0, L * 0.55, 0, 1.15, 0.3, 'tex.paint_chipped', 0xf2f0ea, 6, 60);
    g.mat('tex.metal_painted', 0x2a5a9a); g.box(0, 3.25, 0.3, W * 0.9, 0.12, L * 0.6);
    rails(g, L, W, 1.15, -L * 0.42, -L * 0.25);
  },
  'boat.yacht': (g, lod) => {
    const [W, , L] = ARCHETYPES['boat.yacht'].size, P = g.paintGB;
    P.mat('tex.plastic', 0xf6f6f2); hull(P, L, W, 1.4, 1.1, { n: lod ? 8 : 14, sheerRise: 0.5 });
    rubRail(g, L, W, 1.3, 0x2a2a3a);
    g.mat('tex.wood_planks', 0xc8a070); g.box(0, 1.42, 0.5, W - 0.4, 0.05, L * 0.75);
    g.mat('tex.plastic', 0xf6f6f2); g.box(0, 2.2, 0, W * 0.7, 1.5, L * 0.4); g.box(0, 3.15, 0.3, W * 0.55, 0.5, L * 0.25);
    g.mat('tex.glass_window', 0x404a58); for (const sx of [-1, 1]) g.box(sx * (W * 0.35 + 0.01), 2.4, 0, 0.02, 0.5, L * 0.32); g.quad([-W * 0.33, 2.3, -L * 0.2 - 0.01], [W * 0.33, 2.3, -L * 0.2 - 0.01], [W * 0.3, 2.9, -L * 0.17], [-W * 0.3, 2.9, -L * 0.17]);
    rails(g, L, W, 1.45, -L * 0.45, L * 0.4);
  },
  'boat.sailboat': (g, lod) => {
    const [W, , L] = ARCHETYPES['boat.sailboat'].size, P = g.paintGB;
    P.mat('tex.plastic', 0xf2f0ea); hull(P, L, W, 1.0, 0.9, { n: lod ? 8 : 12 });
    g.mat('tex.paint_chipped', 0x1a1a1a); g.box(0, -1.4, 0.3, 0.2, 1.8, 1.6);
    g.mat('tex.plastic', 0xe8e8e4); g.box(0, 1.35, 0.6, W * 0.5, 0.6, L * 0.3);
    g.mat('tex.metal_aluminium', 0xe0e0e0); g.cyl(0, 1.0, -0.6, 0.08, 0.06, 11.5, 6); g.beam([0, 2.3, -0.6], [0, 2.3, 3.2], 0.08);
    g.mat('tex.metal_galvanized', 0xc0c0c0); g.tube([0, 12.4, -0.6], [0, 1.2, -L / 2 + 0.3], 0.01, 0.01, 3); g.tube([0, 12.4, -0.6], [0, 1.2, L / 2 - 0.2], 0.01, 0.01, 3); for (const sx of [-1, 1]) g.tube([0, 11.5, -0.6], [sx * W / 2, 1.1, -0.4], 0.01, 0.01, 3);
    g.ds.mat('tex.fabric_canvas', 0xe8e4da); g.ds._tri3([0, 2.5, -0.5], [0, 11.8, -0.55], [0, 2.4, 3.1]);
  },
  'boat.cargo_ship': (g, lod) => {
    const [W, , L] = ARCHETYPES['boat.cargo_ship'].size, P = g.paintGB;
    P.mat('tex.paint_chipped', 0x8a2e2e); hull(P, L, W, 6, 8, { n: lod ? 8 : 14, sheerRise: 2 });
    g.mat('tex.paint_chipped', 0x1a1a1a); g.box(0, 6.1, 0, W - 0.5, 0.2, L * 0.92);
    const cols = [0xb23a2e, 0x2e5ea6, 0x3a8a4a, 0xc9a23a, 0xd8d8d0];
    for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) { g.mat('tex.metal_corrugated', cols[(i * 3 + j * 7) % 5]); g.box(-W * 0.3 + j * W * 0.3, 6.2 + 1.3 + (i % 3) * 2.6 * 0, -L * 0.38 + i * 6.3, W * 0.28, 2.6 * (1 + (i + j) % 3), 6.0); }
    g.mat('tex.paint_chipped', 0xf0f0ea); g.box(0, 6.2 + 7, L * 0.38, W * 0.8, 14, 9); g.mat('tex.glass_window', 0xffffff); g.emit(70); g.box(0, 6.2 + 12.5, L * 0.38 - 4.51, W * 0.75, 1.2, 0.02); g.emit(0);
    g.mat('tex.paint_chipped', 0x2a2a2a); g.cyl(0, 20.2, L * 0.42, 1.6, 1.6, 4, 10);
  },
};
for (const id in B) Builders.register(id, (pl, ctx) => {
  const lod = ctx.lod || 0, g = G0.reset(); g.ds = DS.reset(); g.paintGB = g;
  if (lod >= 2) {
    const [W, H, L] = ARCHETYPES[id].size; g.mat(id === 'boat.trawler' ? 'tex.paint_chipped' : 'tex.plastic', id === 'boat.trawler' ? 0xb8261e : 0xe8e8e4);
    g.box(0, Math.min(1, H * 0.25) / 2, 0, W * 0.9, Math.min(1.8, H * 0.3), L * 0.9); if (H > 2) { g.mat('tex.paint_chipped', 0xf0f0ea); g.box(0, H * 0.45, -L * 0.1, W * 0.5, H * 0.4, L * 0.25); }
  } else B[id](g, lod, srng(pl.seed || 9), pl.params || {});
  return out({ 'mat.world': g, 'mat.world_ds': g.ds });
}, { stage: 3 });
