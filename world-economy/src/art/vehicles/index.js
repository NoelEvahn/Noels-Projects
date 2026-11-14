// Land vehicle generators (Annex A 7.1): lofted bodies from cross-sections (parametric length/width/hood/roof/trunk), glass
// greenhouse, pillars, bumpers, grille, emissive head/tail lights, mirrors, plates; wheels are a separate builder
// (`wheelGeometry`) so entity views can spin and steer them. Paint goes to 'mat.carpaint' (clearcoat, Annex A 5.1).
// LOD0 ~3-8k tris, LOD1 ~1k (fewer sections, no interior), LOD2 ~150 (box mass). Front = local -Z, origin on the ground.
import { GB, srng, out } from '../kit/geo.js';
import { Builders } from '../../render/builders.js';
import { ARCHETYPES } from '../../world/archetypes.js';

const G0 = new GB(8192), PAINT = new GB(8192);
const HEAD = 236, TAIL = 200;
/** car specs: L W from the archetype; wb wheelbase, wr wheel radius, cl clearance, belt [[z,y]..] top of lower body, cabin [zA windscreen base, zB roof front, zC roof rear, zD rear base], roof height */
const CARS = {
  'veh.hatch_used': { wb: 2.5, wr: 0.31, cl: 0.22, belt: [[-1, 0.62], [-0.78, 0.86], [-0.42, 0.98], [0.55, 1.0], [0.96, 0.98], [1, 0.62]], cabin: [-0.4, -0.12, 0.62, 0.95], roof: 1.45, paint: [0x8a2a24, 0x5a6a7a, 0xb8b0a0, 0x3a5a3a] },
  'veh.sedan': { wb: 2.8, wr: 0.33, cl: 0.2, belt: [[-1, 0.6], [-0.8, 0.82], [-0.45, 0.94], [0.62, 0.96], [0.94, 0.92], [1, 0.62]], cabin: [-0.42, -0.14, 0.32, 0.62], roof: 1.45, paint: [0x2a3a5a, 0xd8d8d4, 0x1a1a1c, 0x7a2a2a, 0x6a7078, 0xa8a090] },
  'veh.taxi': { base: 'veh.sedan', paint: [0xe8b820], sign: true },
  'veh.police': { base: 'veh.sedan', paint: [0x1a1e2a], police: true },
  'veh.coupe': { wb: 2.7, wr: 0.34, cl: 0.16, belt: [[-1, 0.55], [-0.8, 0.76], [-0.4, 0.86], [0.6, 0.9], [0.95, 0.86], [1, 0.58]], cabin: [-0.36, -0.04, 0.3, 0.7], roof: 1.3, paint: [0xb02020, 0x1a1a1a, 0xe8e8e8, 0x2a4a9a] },
  'veh.pickup': { wb: 3.2, wr: 0.4, cl: 0.32, belt: [[-1, 0.9], [-0.8, 1.12], [-0.5, 1.2], [1, 1.2]], cabin: [-0.46, -0.24, 0.06, 0.12], roof: 1.8, bed: [0.16, 1.0], paint: [0xd8b030, 0x2a4a3a, 0xc8c8c4, 0x5a2a20] },
  'veh.van': { wb: 3.3, wr: 0.36, cl: 0.25, belt: [[-1, 0.8], [-0.86, 1.05], [-0.7, 1.15], [1, 1.15]], cabin: [-0.7, -0.5, 0.98, 1.0], roof: 2.2, box: true, paint: [0xe8e8e4, 0xd8d8d0, 0x3a5a8a] },
};
const lerpBelt = (belt, t) => { for (let i = 1; i < belt.length; i++) if (t <= belt[i][0]) { const a = belt[i - 1], b = belt[i], f = (t - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * f; } return belt[belt.length - 1][1]; };

function carBody(g, p, S, lod, R, id) {
  const [W, , L] = ARCHETYPES[id].size, hl = L / 2, hw = W / 2, cl = S.cl;
  const paint = p.paint != null ? p.paint : S.paint[Math.floor(R() * S.paint.length)];
  const P = g.paintGB; P.mat('tex.carpaint_flake', paint);
  // lower body loft (paint)
  const nz = lod ? 7 : 15, secs = [];
  for (let k = 0; k <= nz; k++) {
    const t = -1 + (2 * k) / nz, z = t * hl, yt = lerpBelt(S.belt, t) * (S.box ? 1 : 1);
    const end = 1 - Math.pow(Math.abs(t), 6) * 0.25, w2 = hw * end;
    secs.push({ z, pts: [[-w2 * 0.9, cl], [w2 * 0.9, cl], [w2, cl + 0.18], [w2, yt - 0.14], [w2 * 0.9, yt], [-w2 * 0.9, yt], [-w2, yt - 0.14], [-w2, cl + 0.18]] });
  }
  P.loft(secs, { caps: true, flip: true });
  // greenhouse: glass loft + painted roof skin + pillars
  const [zA, zB, zC, zD] = S.cabin.map((c) => c * hl);
  const yB = lerpBelt(S.belt, S.cabin[0]) - 0.02, rf = S.roof, ins = 0.12;
  g.mat('tex.glass_window', 0x9aa4ac);
  const cab = [[zA, yB, hw - 0.06], [zB, rf, hw - ins - 0.1], [zC, rf, hw - ins - 0.1], [zD, lerpBelt(S.belt, S.cabin[3]) - 0.02, hw - 0.06]];
  for (let i = 0; i < 3; i++) {
    const [z0, y0, w0] = cab[i], [z1, y1, w1] = cab[i + 1];
    g.quad([-w0, y0, z0], [w0, y0, z0], [w1, y1, z1], [-w1, y1, z1]);                       // top/windscreen
    g.quad([w0, y0, z0], [w0, yB - 0.0, z0], [w1, yB, z1], [w1, y1, z1]);                     // right side
    g.quad([-w0, yB, z0], [-w0, y0, z0], [-w1, y1, z1], [-w1, yB, z1]);                       // left side
  }
  g.quad([hw - 0.06, yB, zD], [-hw + 0.06, yB, zD], [-cab[3][2], cab[3][1], zD], [cab[3][2], cab[3][1], zD]);
  P.mat('tex.carpaint_flake', paint);
  P.quad([-(hw - ins - 0.08), rf + 0.015, zB + 0.05], [hw - ins - 0.08, rf + 0.015, zB + 0.05], [hw - ins - 0.08, rf + 0.015, zC - 0.05], [-(hw - ins - 0.08), rf + 0.015, zC - 0.05]);
  for (const sx of [-1, 1]) { P.beam([sx * (hw - 0.08), yB, zA + 0.05], [sx * (hw - ins - 0.1), rf, zB], 0.08); P.beam([sx * (hw - ins - 0.1), rf, zC], [sx * (hw - 0.07), yB, zD - 0.02], 0.12); if (!lod) P.beam([sx * (hw - 0.09), yB, (zB + zC) / 2], [sx * (hw - ins - 0.08), rf, (zB + zC) / 2 + 0.05], 0.09); }
  // bumpers, grille, lights, plates, mirrors
  g.mat('tex.plastic', 0x1e1e20); g.box(0, cl + 0.22, -hl - 0.02, W * 0.94, 0.26, 0.16); g.box(0, cl + 0.22, hl + 0.02, W * 0.94, 0.26, 0.16);
  g.mat('tex.metal_painted', 0x101012); g.box(0, lerpBelt(S.belt, -1) - 0.16, -hl - 0.005, W * 0.42, 0.18, 0.04);
  g.mat('tex.glass_window', 0xfff8f0); g.emit(HEAD); for (const sx of [-1, 1]) g.box(sx * hw * 0.68, lerpBelt(S.belt, -1) - 0.12, -hl + 0.02, 0.36, 0.12, 0.06); g.emit(0);
  g.mat('tex.plastic', 0xd02818); g.emit(TAIL); for (const sx of [-1, 1]) g.box(sx * hw * 0.72, lerpBelt(S.belt, 1) - 0.14, hl - 0.01, 0.3, 0.12, 0.06); g.emit(0);
  if (!lod) {
    g.mat('tex.flat', 0xe8e8e0); g.box(0, cl + 0.3, -hl - 0.11, 0.5, 0.11, 0.02); g.box(0, cl + 0.38, hl + 0.11, 0.5, 0.11, 0.02);
    g.mat('tex.plastic', 0x1e1e20); for (const sx of [-1, 1]) g.box(sx * (hw + 0.08), yB + 0.08, zA + 0.15, 0.14, 0.1, 0.06);
    g.mat('tex.metal_aluminium', 0xd0d0d0); for (const sx of [-1, 1]) g.box(sx * (hw + 0.01), yB - 0.18, (zA + zC) / 2, 0.02, 0.03, 0.18);
    // interior silhouettes behind glass: seats, wheel
    g.mat('tex.leather', 0x5a5a5a); for (const sx of [-1, 1]) { g.box(sx * hw * 0.45, yB - 0.25, zB + 0.55, 0.5, 0.12, 0.5); g.box(sx * hw * 0.45, yB + 0.1, zB + 0.8, 0.5, 0.6, 0.12); }
    g.mat('tex.plastic', 0x2a2a2a); g.box(0, yB - 0.08, zA + 0.25, W * 0.85, 0.12, 0.35);
  }
  if (S.bed) { // pickup bed: open box behind the cab
    const z0 = S.bed[0] * hl, z1 = S.bed[1] * hl, yt = lerpBelt(S.belt, 0.5);
    g.mat('tex.metal_checker', 0x5a5a5a); g.box(0, yt - 0.42, (z0 + z1) / 2, W - 0.2, 0.04, z1 - z0 - 0.1);
    P.mat('tex.carpaint_flake', paint); P.box(0, yt + 0.02, z1 - 0.04, W - 0.04, 0.05, 0.08);
  }
  if (S.box) { // van: tall load box from the cab back
    P.mat('tex.carpaint_flake', paint); P.box(0, (cl + 2.15) / 2 + 0.05, (zC + hl) / 2, W, 2.15 - cl, hl - zC);
    g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, 1.2, hl + 0.01, 0.03, 1.6, 0.02);
  }
  if (p.sign || S.sign) { g.mat('tex.plastic', 0xf0e060); g.emit(220); g.box(0, rf + 0.13, (zB + zC) / 2, 0.8, 0.22, 0.25); g.emit(0); g.mat('tex.flat', 0x101010); for (let k = 0; k < 6; k++) P.mat('tex.carpaint_flake', paint), g.box(hw + 0.002, cl + 0.6, -hl * 0.4 + k * 0.25, 0.01, 0.12, 0.12); }
  if (p.police || S.police) { P.mat('tex.carpaint_flake', 0xf0f0f0); for (const sx of [-1, 1]) P.box(sx * (hw - 0.01), (cl + yB) / 2 + 0.05, (zA + zD) / 2, 0.02, 0.3, (zD - zA) * 0.9); g.mat('tex.plastic', 0x2040ff); g.emit(252); g.box(-0.3, rf + 0.1, (zB + zC) / 2, 0.5, 0.12, 0.25); g.mat('tex.plastic', 0xff2020); g.box(0.3, rf + 0.1, (zB + zC) / 2, 0.5, 0.12, 0.25); g.emit(0); }
}

/** wheel (tyre + rim + spokes/brake disc) centred at the origin, axis along X; width w, radius r */
export function wheel(g, r, w, lod, spokes = 5, rimTint = 0xc8ccd0) {
  const n = lod ? 10 : 18;
  g.push().rotZ(Math.PI / 2);
  g.mat('tex.rubber_tire', 0xffffff); g.cyl(0, -w / 2, 0, r, r, w, n, { noTop: true, noBottom: true, uScale: 0.5 });
  g.cyl(0, -w / 2, 0, r * 0.7, r, 0.001, n, { noTop: true, noBottom: true }); g.cyl(0, w / 2, 0, r, r * 0.7, 0.001, n, { noTop: true, noBottom: true });
  g.mat('tex.metal_aluminium', rimTint); g.cyl(0, -w / 2 + 0.02, 0, r * 0.68, r * 0.62, w - 0.04, n, {});
  g.pop();
  if (!lod) { g.mat('tex.metal_painted', 0x3a3a3a); for (let k = 0; k < spokes; k++) { const a = (k / spokes) * Math.PI * 2; for (const sx of [-1, 1]) g.beam([sx * (w / 2 + 0.005), 0, 0], [sx * (w / 2 + 0.005), Math.sin(a) * r * 0.58, Math.cos(a) * r * 0.58], 0.04, 0.02); } }
}
/** wheel hard points for an archetype (x, y, z, r, w) */
export function wheelSpec(id) {
  const A = ARCHETYPES[id]; if (!A) return [];
  const [W, , L] = A.size;
  if (id.includes('moto')) { const r = 0.32, wb = id === 'veh.moto_cafe' ? 1.4 : 1.3; return [[0, r, -wb / 2, r, 0.12], [0, r, wb / 2, r, 0.14]]; }
  const S = CARS[id] && (CARS[id].base ? CARS[CARS[id].base] : CARS[id]);
  const r = S ? S.wr : id === 'veh.logtruck' || id === 'veh.boxtruck' ? 0.5 : id === 'veh.forklift' ? 0.3 : 0.38;
  const wb = S ? S.wb : id === 'veh.logtruck' ? 5.2 : id === 'veh.boxtruck' ? 4.2 : L * 0.6;
  const tw = id === 'veh.forklift' ? 0.24 : 0.26, x = W / 2 - tw / 2 - 0.02;
  const front = -wb / 2 - (L / 2 - wb / 2 > 1.2 ? 0.25 : 0), out = [];
  for (const z of [front, front + wb]) for (const sx of [-1, 1]) out.push([sx * x, r, z, r, tw]);
  if (id === 'veh.logtruck') for (const sx of [-1, 1]) out.push([sx * x, r, front + wb - 1.4, r, tw]);
  return out;
}

const REG = (id, fn) => Builders.register(id, (pl, ctx) => {
  const lod = ctx.lod || 0, g = G0.reset(), P = PAINT.reset(); g.paintGB = P;
  const R = srng(pl.seed || 7), p = pl.params || {};
  if (lod >= 2) { // LOD2: painted mass + dark glass band
    const [W, H, L] = ARCHETYPES[id].size; P.mat('tex.carpaint_flake', 0x8a8a8a); P.box(0, H * 0.35 + 0.15, 0, W, H * 0.5, L); g.mat('tex.glass_window', 0xffffff); g.box(0, H * 0.75, 0, W * 0.85, H * 0.4, L * 0.45);
  } else {
    fn(g, lod, R, p, id);
    if (!p.noWheels) for (const [x, y, z, r, w] of wheelSpec(id)) { g.push().translate(x, y, z); wheel(g, r, w, lod); g.pop(); }
  }
  return out({ 'mat.world': g, 'mat.carpaint': P });
}, { stage: 3 });

for (const id of ['veh.hatch_used', 'veh.sedan', 'veh.taxi', 'veh.police', 'veh.coupe', 'veh.pickup', 'veh.van']) {
  REG(id, (g, lod, R, p) => { const S0 = CARS[id], S = S0.base ? { ...CARS[S0.base], ...S0 } : S0; carBody(g, { ...p, sign: S0.sign, police: S0.police }, S, lod, R, id); });
}

function truck(g, lod, R, id) {
  const [W, H, L] = ARCHETYPES[id].size, hw = W / 2, hl = L / 2, P = g.paintGB, paint = [0xc83020, 0x2a4a7a, 0xe8e8e0, 0x3a5a3a][Math.floor(R() * 4)];
  // cab: lofted nose + box
  P.mat('tex.carpaint_flake', paint);
  const cz0 = -hl, cz1 = -hl + 2.3;
  P.loft([0, 0.25, 0.6, 1].map((t) => { const z = cz0 + t * (cz1 - cz0), top = 1.4 + t * 1.5 + (t > 0.2 ? 0.2 : 0); return { z, pts: [[-hw, 0.7], [hw, 0.7], [hw, top - 0.15], [hw - 0.1, top], [-hw + 0.1, top], [-hw, top - 0.15]] }; }), { caps: true, flip: true });
  g.mat('tex.glass_window', 0x9aa4ac); g.quad([-hw + 0.15, 2.15, cz0 + 0.62], [hw - 0.15, 2.15, cz0 + 0.62], [hw - 0.2, 2.95, cz0 + 1.2], [-hw + 0.2, 2.95, cz0 + 1.2]);
  for (const sx of [-1, 1]) g.box(sx * (hw + 0.005), 2.4, cz0 + 1.5, 0.02, 0.7, 0.9);
  g.mat('tex.metal_aluminium', 0xd0d0d0); g.box(0, 1.1, cz0 - 0.02, W * 0.7, 0.6, 0.06);
  g.mat('tex.glass_window', 0xfff8f0); g.emit(HEAD); for (const sx of [-1, 1]) g.box(sx * hw * 0.75, 1.0, cz0 - 0.03, 0.3, 0.2, 0.05); g.emit(0);
  g.mat('tex.plastic', 0x1e1e20); g.box(0, 0.6, cz0 - 0.05, W, 0.3, 0.2);
  g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, 0.75, 0, W * 0.6, 0.3, L * 0.9); // chassis rails
  if (!lod) { g.mat('tex.metal_aluminium', 0xd8d8d8); g.cyl(hw + 0.1, 1.2, cz1 - 0.2, 0.08, 0.08, 1.8, 8); for (const sx of [-1, 1]) g.box(sx * (hw + 0.2), 2.4, cz0 + 0.6, 0.06, 0.4, 0.2); }
  if (id === 'veh.boxtruck') { P.mat('tex.carpaint_flake', 0xe8e8e4); P.box(0, (1.0 + H) / 2, (cz1 + 0.2 + hl) / 2, W + 0.05, H - 1.0, hl - cz1 - 0.2); g.mat('tex.metal_painted', 0x5a5a5a); g.box(0, 1.6, hl + 0.02, W * 0.9, 1.8, 0.03); g.mat('tex.plastic', 0xd02818); g.emit(TAIL); for (const sx of [-1, 1]) g.box(sx * hw * 0.8, 0.95, hl + 0.03, 0.2, 0.12, 0.04); g.emit(0); }
  if (id === 'veh.logtruck') {
    g.mat('tex.metal_painted', 0x3a3a3a); g.box(0, 1.15, (cz1 + hl) / 2 + 0.6, W - 0.1, 0.12, hl - cz1 - 1.2);
    for (let k = 0; k < 3; k++) { const z = cz1 + 1.6 + k * 2.0; for (const sx of [-1, 1]) g.box(sx * (hw - 0.1), 2.1, z, 0.14, 1.9, 0.14); g.box(0, 1.25, z, W, 0.15, 0.2); }
    g.mat('tex.bark_pine', 0xffffff); for (let k = 0; k < (lod ? 4 : 9); k++) { const x = -0.8 + (k % 3) * 0.8, y = 1.6 + Math.floor(k / 3) * 0.6; g.tube([x, y, cz1 + 0.8], [x, y, hl + 0.6], 0.3, 0.27, lod ? 6 : 9); }
    g.mat('tex.log_round', 0xe0c8a0); // cut ends
    // loader crane behind the cab (folded): post, boom, grapple
    g.mat('tex.metal_painted', 0xe0a020); g.cyl(0, 1.2, cz1 + 0.4, 0.22, 0.2, 2.6, 8); g.beam([0, 3.6, cz1 + 0.4], [0, 4.0, cz1 + 3.2], 0.28); g.beam([0, 4.0, cz1 + 3.2], [0, 3.0, cz1 + 4.6], 0.22);
    g.mat('tex.metal_painted', 0x2a2a2a); for (const s of [-1, 1]) g.beam([0, 3.0, cz1 + 4.6], [s * 0.4, 2.3, cz1 + 4.8], 0.08);
  }
}
REG('veh.boxtruck', (g, lod, R) => truck(g, lod, R, 'veh.boxtruck'));
REG('veh.logtruck', (g, lod, R) => truck(g, lod, R, 'veh.logtruck'));

function moto(g, lod, R, id) {
  const cafe = id === 'veh.moto_cafe', wb = cafe ? 1.4 : 1.3, r = 0.32, P = g.paintGB;
  const tankCol = cafe ? 0xa82018 : [0x2a4a8a, 0x1a1a1a, 0x8a1a1a][Math.floor(R() * 3)];
  // tubular frame (cradle) in chrome/black
  g.mat('tex.metal_painted', 0x1a1a1c);
  const head = [0, 0.95, -wb / 2 + 0.2], seat = [0, 0.82, wb / 2 - 0.25], low = [0, 0.32, -0.05], swing = [0, 0.42, 0.18];
  g.tube(head, seat, 0.025, 0.025, 6); g.tube(head, low, 0.025, 0.025, 6); g.tube(low, swing, 0.025, 0.025, 6); g.tube(seat, swing, 0.025, 0.025, 6);
  for (const sx of [-1, 1]) { g.tube([sx * 0.09, 0.42, 0.18], [sx * 0.08, r, wb / 2], 0.02, 0.02, 6); g.tube([sx * 0.08, 0.8, wb / 2 - 0.3], [sx * 0.08, r + 0.05, wb / 2], 0.018, 0.018, 6); }
  // fork + gaiters, bars, round headlight
  g.mat('tex.metal_aluminium', 0xe8e8e8); for (const sx of [-1, 1]) g.tube([sx * 0.09, 0.98, -wb / 2 + 0.2], [sx * 0.07, r, -wb / 2], 0.022, 0.022, 6);
  if (cafe) { g.mat('tex.rubber_tire', 0xffffff); for (const sx of [-1, 1]) g.tube([sx * 0.085, 0.62, -wb / 2 + 0.12], [sx * 0.075, 0.45, -wb / 2 + 0.06], 0.035, 0.035, 8); }
  g.mat('tex.metal_aluminium', 0xd8d8d8); g.tube([-0.33, 1.02, -wb / 2 + 0.28], [0.33, 1.02, -wb / 2 + 0.28], 0.012, 0.012, 5);
  g.push().translate(0, 0.98, -wb / 2 + 0.08).rotX(Math.PI / 2); g.cyl(0, 0, 0, 0.1, 0.09, 0.14, lod ? 8 : 14); g.pop();
  g.mat('tex.glass_window', 0xfff4e0); g.emit(HEAD); g.push().translate(0, 0.98, -wb / 2 + 0.07).rotX(Math.PI / 2); g.cyl(0, -0.15, 0, 0.085, 0.085, 0.01, lod ? 8 : 14); g.pop(); g.emit(0);
  // tank (lofted teardrop), seat, side covers
  P.mat('tex.carpaint_flake', tankCol);
  P.loft([-0.3, -0.15, 0.05, 0.2].map((t, i) => { const z = t, rr = [0.06, 0.13, 0.14, 0.08][i], y0 = 0.86 - t * 0.12; return { z, pts: Array.from({ length: lod ? 6 : 10 }, (_, k) => { const a = (k / (lod ? 6 : 10)) * Math.PI * 2; return [Math.cos(a) * rr * 1.1, y0 + Math.sin(a) * rr * 0.75]; }) }; }), { caps: true, flip: true });
  g.mat('tex.leather', cafe ? 0x5a3a28 : 0x1a1a1a); g.box(0, 0.86, 0.38, 0.22, 0.08, 0.45);
  if (cafe) { P.mat('tex.carpaint_flake', tankCol); P.box(0, 0.9, 0.62, 0.22, 0.1, 0.14); }
  // finned engine block (parallel twin) and chrome exhaust
  g.mat('tex.metal_aluminium', 0xb8b8b4); g.box(0, 0.4, -0.02, 0.32, 0.22, 0.38);
  const fins = lod ? 3 : 8; for (let k = 0; k < fins; k++) g.box(0, 0.54 + k * 0.03, -0.08 - k * 0.01, 0.34 - k * 0.012, 0.012, 0.28);
  g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, 0.6 + fins * 0.03, -0.12, 0.26, 0.05, 0.2);
  g.mat('tex.metal_aluminium', 0xf0f0f0); for (const sx of [-1, 1]) { g.tube([sx * 0.12, 0.5, -0.24], [sx * 0.16, 0.3, -0.05], 0.025, 0.025, 6); g.tube([sx * 0.16, 0.3, -0.05], [sx * 0.17, 0.36, wb / 2 + 0.1], 0.028, 0.035, 8); }
  g.mat('tex.plastic', 0xd02818); g.emit(TAIL); g.box(0, 0.88, wb / 2 + 0.02, 0.1, 0.05, 0.04); g.emit(0);
  // spoked wheels: rim ring + spokes (replace the generic wheels)
  for (const z of [-wb / 2, wb / 2]) {
    g.push().translate(0, r, z); g.push().rotZ(Math.PI / 2); g.mat('tex.rubber_tire', 0xffffff); g.cyl(0, -0.06, 0, r, r, 0.12, lod ? 10 : 20, { noTop: true, noBottom: true });
    g.mat('tex.metal_aluminium', 0xe0e0e0); g.cyl(0, -0.03, 0, r * 0.82, r * 0.82, 0.06, lod ? 10 : 20, { noTop: true, noBottom: true }); g.cyl(0, -0.05, 0, 0.05, 0.05, 0.1, 8); g.pop();
    if (!lod) for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beam([k % 2 ? 0.03 : -0.03, 0, 0], [0, Math.sin(a) * r * 0.8, Math.cos(a) * r * 0.8], 0.006); }
    g.pop();
  }
}
for (const id of ['veh.moto_125', 'veh.moto_cafe']) Builders.register(id, (pl, ctx) => {
  const lod = ctx.lod || 0, g = G0.reset(), P = PAINT.reset(); g.paintGB = P;
  if (lod >= 2) { g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, 0.6, 0, 0.3, 0.8, 1.9); } else moto(g, lod, srng(pl.seed || 3), id);
  return out({ 'mat.world': g, 'mat.carpaint': P });
}, { stage: 3 });

REG('veh.forklift', (g, lod) => {
  const P = g.paintGB; P.mat('tex.carpaint_flake', 0xe0a020); P.box(0, 0.75, 0.25, 1.15, 0.9, 1.7); P.box(0, 1.2, 0.95, 1.1, 0.5, 0.5);
  g.mat('tex.metal_painted', 0x2a2a2a); for (const x of [-0.5, 0.5]) { g.box(x, 1.25, 0.6, 0.06, 1.4, 0.06); g.box(x, 1.25, -0.35, 0.06, 1.4, 0.06); } g.box(0, 1.95, 0.12, 1.1, 0.06, 1.0);
  g.box(0, 1.25, -0.72, 0.85, 2.5, 0.1); for (const x of [-0.3, 0.3]) g.box(x, 0.12, -1.25, 0.1, 0.05, 1.05);
  g.mat('tex.leather', 0x2a2a2a); g.box(0, 1.25, 0.45, 0.5, 0.1, 0.45); void lod;
});
REG('veh.utv', (g, lod) => {
  const P = g.paintGB; P.mat('tex.carpaint_flake', 0x3a5a2a); P.box(0, 0.75, -0.6, 1.4, 0.5, 1.2); P.box(0, 0.7, 1.0, 1.4, 0.35, 1.0);
  g.mat('tex.metal_painted', 0x1a1a1a); for (const sx of [-1, 1]) { g.tube([sx * 0.65, 0.9, -0.3], [sx * 0.6, 1.85, -0.1], 0.03, 0.03, 6); g.tube([sx * 0.6, 1.85, -0.1], [sx * 0.6, 1.85, 0.5], 0.03, 0.03, 6); g.tube([sx * 0.6, 1.85, 0.5], [sx * 0.65, 0.9, 0.55], 0.03, 0.03, 6); }
  g.mat('tex.leather', 0x2a2a2a); g.box(0, 0.95, 0.15, 1.2, 0.12, 0.5); g.mat('tex.metal_checker', 0x6a6a6a); g.box(0, 0.88, 1.0, 1.3, 0.04, 0.9); void lod;
});
