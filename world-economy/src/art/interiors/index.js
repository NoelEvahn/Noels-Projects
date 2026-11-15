// Interiors (Annex A 6.4): inward-facing room shells (floor, walls, ceiling) plus furniture sets, in the host building's local
// frame (door on the -Z face). Host builders append them at LOD0 only (lazily: the detail ring is the 40-150 m "near door"
// zone), so an interior costs nothing at distance. Lighting: emissive fixtures (night/interior glow), the fireplace is
// emissive and registered as a fire light by world decor; exposure adapts in lighting.js when the camera is inside.
import { GB, srng, out } from '../kit/geo.js';
import { Builders } from '../../render/builders.js';

const LIGHT = 236;
/** inward room shell: w x d x h centred, floor at y0; door gap on -Z (width dw) */
export function room(g, w, d, h, y0, o) {
  const hw = w / 2, hd = d / 2, y1 = y0 + h, t = 1 / 1;
  g.groundAO = false;
  g.mat(o.floor, o.floorTint || 0xffffff); g.quadUV([-hw, y0 + 0.03, hd], [hw, y0 + 0.03, hd], [hw, y0 + 0.03, -hd], [-hw, y0 + 0.03, -hd], 0, 0, w / g.tile, d / g.tile);
  g.mat(o.ceil || o.wall, o.ceilTint || o.wallTint || 0xffffff); g.quadUV([-hw, y1, -hd], [hw, y1, -hd], [hw, y1, hd], [-hw, y1, hd], 0, 0, w / g.tile, d / g.tile);
  g.mat(o.wall, o.wallTint || 0xffffff);
  const dw = o.door || 1.2;
  // back (+Z) wall faces -Z
  g.quadUV([hw, y0, hd], [-hw, y0, hd], [-hw, y1, hd], [hw, y1, hd], 0, 0, w / g.tile, h / g.tile);
  // side walls
  g.quadUV([-hw, y0, hd], [-hw, y0, -hd], [-hw, y1, -hd], [-hw, y1, hd], 0, 0, d / g.tile, h / g.tile);
  g.quadUV([hw, y0, -hd], [hw, y0, hd], [hw, y1, hd], [hw, y1, -hd], 0, 0, d / g.tile, h / g.tile);
  // front (-Z) wall faces +Z, with a door gap at x = 0 (open side when o.openFront)
  if (!o.openFront) {
    g.quadUV([-hw, y0, -hd], [-dw / 2, y0, -hd], [-dw / 2, y1, -hd], [-hw, y1, -hd], 0, 0, (hw - dw / 2) / g.tile, h / g.tile);
    g.quadUV([dw / 2, y0, -hd], [hw, y0, -hd], [hw, y1, -hd], [dw / 2, y1, -hd], 0, 0, (hw - dw / 2) / g.tile, h / g.tile);
    g.quadUV([-dw / 2, y0 + 2.2, -hd], [dw / 2, y0 + 2.2, -hd], [dw / 2, y1, -hd], [-dw / 2, y1, -hd], 0, 0, dw / g.tile, (h - 2.2) / g.tile);
  }
  if (o.windows) { g.mat('tex.glass_window', 0xd8e4ec); for (const [x, z, yaw] of o.windows) { g.push().translate(x, y0 + 1.6, z).rotY(yaw); g.quadUV([-0.6, -0.5, 0], [0.6, -0.5, 0], [0.6, 0.5, 0], [-0.6, 0.5, 0], 0.1, 0.1, 0.9, 0.9); g.pop(); } }
  g.groundAO = true; void t;
}
const table = (g, x, y, z, w, d, tex = 'tex.wood_planks', tint = 0xb08858) => { g.mat(tex, tint); g.box(x, y + 0.74, z, w, 0.05, d); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(x + sx * (w / 2 - 0.06), y + 0.36, z + sz * (d / 2 - 0.06), 0.06, 0.72, 0.06); };
const chair = (g, x, y, z, yaw, tint = 0x8a6a48) => { g.push().translate(x, y, z).rotY(yaw); g.mat('tex.wood_planks', tint); g.box(0, 0.45, 0, 0.42, 0.04, 0.42); g.box(0, 0.7, 0.19, 0.42, 0.5, 0.04); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * 0.18, 0.22, sz * 0.18, 0.04, 0.45, 0.04); g.pop(); };
const shelf = (g, x, y, z, w, h, yaw, R, items = true) => { g.push().translate(x, y, z).rotY(yaw); g.mat('tex.metal_painted', 0x8a8e92); g.box(-w / 2, h / 2, 0, 0.04, h, 0.45); g.box(w / 2, h / 2, 0, 0.04, h, 0.45); for (let k = 0; k < 4; k++) { g.box(0, 0.15 + k * (h - 0.3) / 3, 0, w, 0.03, 0.45); if (items && k < 3) { const nb = Math.max(1, Math.round(w / 1.2)); for (let i = 0; i < nb; i++) { g.mat('tex.plastic', [0xc84a3a, 0x3a7ab0, 0xe0c040, 0x4a9a5a, 0xe8e0d0][Math.floor(R() * 5)]); g.box(-w / 2 + (i + 0.5) * (w / nb), 0.3 + k * (h - 0.3) / 3, 0, w / nb - 0.08, 0.26, 0.32, { noBottom: true }); } g.mat('tex.metal_painted', 0x8a8e92); } } g.pop(); };
const ceilingLamp = (g, x, y, z) => { g.mat('tex.glass_window', 0xfff4e0); g.emit(LIGHT); g.box(x, y - 0.05, z, 0.5, 0.06, 0.5); g.emit(0); };
const counter = (g, x, y, z, w, yaw, top = 0xd8d0c0, front = 0x6a4a3a) => { g.push().translate(x, y, z).rotY(yaw); g.mat('tex.wood_painted', front); g.box(0, 0.5, 0, w, 1.0, 0.7); g.mat('tex.concrete_cast', top); g.box(0, 1.03, -0.05, w + 0.06, 0.06, 0.8); g.pop(); };
const bed = (g, x, y, z, yaw) => { g.push().translate(x, y, z).rotY(yaw); g.mat('tex.wood_planks', 0x8a6040); g.box(0, 0.22, 0, 1.0, 0.3, 2.0); g.box(0, 0.55, 0.98, 1.0, 0.7, 0.06); g.mat('tex.fabric_cloth', 0xe8e4dc); g.box(0, 0.44, 0.05, 0.94, 0.16, 1.9); g.mat('tex.fabric_cloth', 0x6a3a2a); g.box(0, 0.53, -0.25, 0.96, 0.04, 1.3); g.mat('tex.fabric_cloth', 0xf0f0e8); g.box(0, 0.58, 0.75, 0.6, 0.12, 0.3); g.pop(); };

/** interior id -> filler (g, w, d, h, y0, R) */
export const INTERIORS = {
  'int.cabin_log': (g, w, d, h, y0, R) => { // reference 11: plank walls, log floor, round log rafters, stone fireplace with fire
    room(g, w - 0.5, d - 0.5, h - 0.3, y0, { floor: 'tex.log_round', wall: 'tex.planks_wall', ceil: 'tex.planks_wall', ceilTint: 0xa08060, windows: [[-(w / 2 - 0.27), 0, Math.PI / 2], [w * 0.1, d / 2 - 0.27, Math.PI]] });
    g.mat('tex.log_round', 0xe0c8a8); for (let k = 0; k < 4; k++) g.tube([-w / 2 + 0.3, y0 + h - 0.45, -d / 2 + 0.8 + k * (d - 1.6) / 3], [w / 2 - 0.3, y0 + h - 0.45, -d / 2 + 0.8 + k * (d - 1.6) / 3], 0.13, 0.13, 8);
    g.tube([0, y0 + h - 0.35, -d / 2 + 0.3], [0, y0 + h - 0.35, d / 2 - 0.3], 0.16, 0.16, 8);
    const fx = w / 2 - 0.9; // fireplace on the +X wall
    g.mat('tex.stone_fieldstone', 0xffffff); g.box(fx, y0 + 0.6, 0, 1.0, 1.2, 2.2); g.box(fx + 0.15, y0 + 1.2 + (h - 1.5) / 2, 0, 0.7, h - 1.5, 1.4); g.box(fx - 0.05, y0 + 1.25, 0, 1.15, 0.12, 2.4);
    g.mat('tex.flat', 0x0a0806); g.box(fx - 0.51, y0 + 0.55, 0, 0.02, 0.75, 0.9);
    g.mat('tex.log_round', 0x6a4a30); for (let k = 0; k < 3; k++) g.tube([fx - 0.4, y0 + 0.22 + k * 0.06, -0.3 + k * 0.1], [fx - 0.2, y0 + 0.25, 0.3 - k * 0.1], 0.07, 0.07, 6);
    g.mat('tex.flat', 0xff7a20); g.emit(255); g.cyl(fx - 0.32, y0 + 0.22, 0, 0.32, 0.03, 0.62, 7); g.mat('tex.flat', 0xffc040); g.cyl(fx - 0.34, y0 + 0.22, 0.12, 0.18, 0.02, 0.45, 5); g.cyl(fx - 0.3, y0 + 0.22, -0.15, 0.16, 0.02, 0.4, 5); g.emit(0);
    // workbench, stump stools, anvil, bed, table, wall torch
    table(g, -w / 2 + 1.2, y0, d / 2 - 1.0, 1.8, 0.8, 'tex.wood_planks', 0x9a7048);
    g.mat('tex.bark_oak', 0xffffff); for (const [x, z] of [[-0.3, 0.6], [0.6, -0.4]]) { g.cyl(x, y0, z, 0.25, 0.22, 0.45, 8, { noTop: true }); g.mat('tex.log_round', 0xd8b890); g.cyl(x, y0 + 0.45, z, 0.22, 0.22, 0.01, 8, { noBottom: true }); g.mat('tex.bark_oak', 0xffffff); }
    g.mat('tex.metal_painted', 0x2a2a2a); g.box(-w / 2 + 2.6, y0 + 0.55, -d / 2 + 1.1, 0.5, 0.18, 0.2);
    bed(g, -w / 2 + 0.85, y0, -0.2, 0);
    g.mat('tex.metal_painted', 0x2a2a2a); g.box(-w / 2 + 0.3, y0 + 1.9, d / 2 - 2.2, 0.08, 0.25, 0.08); g.mat('tex.flat', 0xffa040); g.emit(250); g.cyl(-w / 2 + 0.32, y0 + 2.02, d / 2 - 2.2, 0.06, 0.02, 0.18, 5); g.emit(0);
    void R;
  },
  'int.boathouse': (g, w, d, h, y0, R) => { // reference 4: crates, hook, rope (the shell is the open timber frame itself)
    g.mat('tex.wood_planks', 0xd0b890); for (let k = 0; k < 5; k++) g.box(-w / 2 + 0.5 + (k % 2) * 0.85, y0 + 0.62 + Math.floor(k / 2) * 0.82 - 0.35, d / 2 - 1.2 - (k > 2 ? 0.9 : 0), 0.8, 0.8, 0.8);
    g.mat('tex.fabric_canvas', 0xb89a68); for (let k = 0; k < 3; k++) g.cyl(w / 2 - 0.8, y0 + 0.3 + k * 0.05, -d / 4, 0.32 - k * 0.03, 0.32 - k * 0.03, 0.05, 10);
    g.mat('tex.wood_planks', 0xc8a070); for (const z of [0.5, 1.3]) g.beam([w / 2 - 0.25, y0 + 1.2, z], [w / 2 - 0.25, y0 + 1.0, z + 1.8], 0.05);
    g.mat('tex.metal_painted', 0x3a3a3a); g.box(w / 2 - 0.3, y0 + 1.5, -1, 0.04, 0.04, 1.4); g.box(0, y0 + h - 2.4, d * 0.1, 0.15, 0.2, 0.08);
    g.mat('tex.glass_window', 0xffe0a0); g.emit(LIGHT); g.box(-w / 2 + 0.6, y0 + 2.4, -d / 2 + 0.6, 0.15, 0.22, 0.15); g.emit(0); void R;
  },
  'int.diner': (g, w, d, h, y0, R) => {
    room(g, w - 0.6, d - 0.6, h - 0.3, y0, { floor: 'tex.tile_floor', wall: 'tex.plaster_interior', wallTint: 0xf0e0c8, door: 1.6 });
    counter(g, 0, y0, d / 2 - 2.2, w * 0.6, 0, 0xe0dcd4, 0xa83028);
    g.mat('tex.metal_aluminium', 0xd8d8d8); g.box(-w * 0.2, y0 + 0.9, d / 2 - 0.65, 1.6, 1.8, 0.6); g.box(w * 0.1, y0 + 0.45, d / 2 - 0.65, 1.4, 0.9, 0.6); g.mat('tex.metal_painted', 0x2a2a2a); g.box(w * 0.1, y0 + 0.92, d / 2 - 0.65, 1.3, 0.04, 0.5);
    for (let k = 0; k < 5; k++) { g.mat('tex.metal_aluminium', 0xd0d0d0); g.cyl(-w * 0.25 + k * w * 0.12, y0, d / 2 - 3.0, 0.03, 0.03, 0.7, 6); g.mat('tex.leather', 0xa02020); g.cyl(-w * 0.25 + k * w * 0.12, y0 + 0.7, d / 2 - 3.0, 0.2, 0.2, 0.08, 10); }
    for (let k = 0; k < 4; k++) { const x = -w / 2 + 1.6 + k * (w - 3.2) / 3; table(g, x, y0, -d / 2 + 1.6, 1.0, 0.8, 'tex.plastic', 0xe8e0d0); chair(g, x, y0, -d / 2 + 2.3, 0, 0xa02020); chair(g, x, y0, -d / 2 + 0.9, Math.PI, 0xa02020); }
    for (let k = 0; k < 4; k++) ceilingLamp(g, -w / 3 + k * w / 4.5, y0 + h - 0.3, 0); void R;
  },
  'int.cafe': (g, w, d, h, y0, R) => { room(g, w - 0.6, d - 0.6, h - 0.3, y0, { floor: 'tex.wood_planks', wall: 'tex.brick_painted_white', door: 1.4 }); counter(g, w * 0.2, y0, d / 2 - 1.4, w * 0.4, 0, 0x5a4a3a, 0x3a2a20); g.mat('tex.metal_aluminium', 0xd0d0d0); g.box(w * 0.3, y0 + 1.25, d / 2 - 1.4, 0.6, 0.45, 0.45); for (let k = 0; k < 5; k++) { const x = -w / 2 + 1.2 + (k % 3) * 1.6, z = -d / 2 + 1.2 + Math.floor(k / 3) * 1.6; table(g, x, y0, z, 0.7, 0.7); chair(g, x + 0.55, y0, z, Math.PI / 2); } ceilingLamp(g, 0, y0 + h - 0.3, 0); void R; },
  'int.shop_small': (g, w, d, h, y0, R) => { room(g, w - 0.6, d - 0.6, h - 0.3, y0, { floor: 'tex.wood_planks', wall: 'tex.planks_wall', door: 1.4 }); counter(g, -w / 2 + 1.5, y0, -d / 2 + 1.5, 1.8, Math.PI / 2); for (let k = 0; k < 3; k++) shelf(g, w / 2 - 0.5, y0, -d / 2 + 1.5 + k * 1.6, 1.4, 2.0, -Math.PI / 2, R); shelf(g, 0, y0, d / 2 - 0.5, w * 0.6, 2.0, Math.PI, R); ceilingLamp(g, 0, y0 + h - 0.3, 0); },
  'int.supermarket': (g, w, d, h, y0, R) => { room(g, w - 0.6, d - 0.6, h - 0.3, y0, { floor: 'tex.tile_floor', wall: 'tex.plaster_interior', door: 3 }); for (let a = 0; a < 6; a++) shelf(g, -w / 2 + 6 + a * (w - 12) / 5, y0, 2, d * 0.5, 2.0, Math.PI / 2, R); for (let k = 0; k < 3; k++) counter(g, -w / 4 + k * 4, y0, -d / 2 + 4, 2.2, 0, 0x404040, 0xd0d0d0); for (let k = 0; k < 8; k++) ceilingLamp(g, -w / 3 + (k % 4) * w / 4.5, y0 + h - 0.3, k < 4 ? -d / 5 : d / 5); },
  'int.warehouse': (g, w, d, h, y0, R) => { for (let r = 0; r < 4; r++) { const z = -d / 2 + 4 + r * (d - 8) / 3; g.mat('tex.metal_painted', 0x2a5a9a); for (let k = 0; k <= 5; k++) g.box(-w / 3 + k * w / 7.5, y0 + 2.4, z, 0.1, 4.8, 1.0); g.mat('tex.metal_painted', 0xe08020); for (let l = 0; l < 3; l++) g.box(0, y0 + 0.9 + l * 1.6, z, w * 0.68, 0.08, 1.1); for (let l = 0; l < 3; l++) for (let k = 0; k < 6; k++) if (R() < 0.7) { g.mat('tex.wood_planks', 0xc8a878); g.box(-w / 3 + 0.8 + k * w / 7.5, y0 + 1.0 + l * 1.6, z, 1.0, 0.12, 1.0); g.mat('tex.paint_chipped', 0xc8b090); g.box(-w / 3 + 0.8 + k * w / 7.5, y0 + 1.5 + l * 1.6, z, 0.9, 0.9, 0.9); } } for (let k = 0; k < 6; k++) ceilingLamp(g, -w / 3 + (k % 3) * w / 3, y0 + h - 1.5, k < 3 ? -d / 4 : d / 4); },
  'int.garage': (g, w, d, h, y0, R) => { g.mat('tex.concrete_cast', 0x9a968e); for (let k = 0; k < 3; k++) { const x = -w / 3 + k * w / 3; for (const s of [-1, 1]) { g.mat('tex.metal_painted', 0xc82a20); g.box(x + s * 1.3, y0 + 1.0, 0, 0.25, 2.0, 0.25); g.mat('tex.metal_painted', 0x3a3a3a); g.box(x + s * 1.3, y0 + 0.9, 0, 0.12, 0.08, 1.8); } } shelf(g, 0, y0, d / 2 - 0.5, w * 0.5, 2.2, Math.PI, R); g.mat('tex.wood_planks', 0x9a7a50); g.box(-w / 2 + 0.5, y0 + 1.6, 0, 0.05, 1.2, 3); g.mat('tex.metal_painted', 0x5a5a5a); for (let k = 0; k < 8; k++) g.box(-w / 2 + 0.53, y0 + 1.3 + (k % 2) * 0.5, -1.2 + k * 0.3, 0.03, 0.3, 0.05); for (let k = 0; k < 3; k++) ceilingLamp(g, -w / 3 + k * w / 3, y0 + h - 0.6, 0); },
  'int.bank_lobby': (g, w, d, h, y0, R) => { room(g, w - 1, d - 1, Math.min(h, 5), y0, { floor: 'tex.paver', wall: 'tex.concrete_cast', wallTint: 0xf0e8dc, door: 2.4 }); counter(g, 0, y0, d / 4, w * 0.6, 0, 0xc8c0b0, 0x6a5040); g.mat('tex.glass_window', 0xe0e8f0); g.box(0, y0 + 1.6, d / 4 - 0.1, w * 0.6, 1.0, 0.02); for (let k = 0; k < 3; k++) { g.mat('tex.metal_painted', 0x3a4a5a); g.box(-w / 2 + 1, y0 + 0.95, -d / 4 + k * 1.2, 0.6, 1.9, 0.7); } for (let k = 0; k < 4; k++) ceilingLamp(g, -w / 4 + (k % 2) * w / 2, y0 + 4.7, k < 2 ? -d / 6 : d / 6); void R; },
  'int.hostel_room': (g, w, d, h, y0) => { room(g, 4, 3.5, 2.8, y0, { floor: 'tex.wood_planks', wall: 'tex.plaster_interior', wallTint: 0xd8dcc8, windows: [[0, 1.73, Math.PI]] }); bed(g, -1.2, y0, 0.4, 0); g.mat('tex.metal_painted', 0x5a6a7a); g.box(1.5, y0 + 0.9, 1.3, 0.6, 1.8, 0.5); ceilingLamp(g, 0, y0 + 2.8, 0); void w; void d; void h; },
  'int.apartment_s': (g, w, d, h, y0) => { room(g, 6, 5, 2.8, y0, { floor: 'tex.wood_planks', wall: 'tex.plaster_interior' }); bed(g, -2, y0, 1, 0); table(g, 1.2, y0, -0.5, 1.2, 0.8); chair(g, 1.2, y0, 0.2, 0); ceilingLamp(g, 0, y0 + 2.8, 0); void w; void d; void h; },
  'int.apartment_m': (g, w, d, h, y0) => { room(g, 8, 6, 2.8, y0, { floor: 'tex.wood_planks', wall: 'tex.plaster_interior', wallTint: 0xe8e0d0 }); bed(g, -3, y0, 1.5, 0); table(g, 1.5, y0, 0, 1.6, 0.9); for (const x of [0.9, 2.1]) chair(g, x, y0, 0.75, 0); g.mat('tex.fabric_cloth', 0x5a6a7a); g.box(2.5, y0 + 0.4, -2.3, 2.2, 0.8, 0.9); ceilingLamp(g, 0, y0 + 2.8, 0); void w; void d; void h; },
  'int.apartment_l': (g, w, d, h, y0) => { room(g, 11, 8, 3.0, y0, { floor: 'tex.wood_planks', wall: 'tex.plaster_interior', wallTint: 0xf0ece4 }); bed(g, -4, y0, 2.5, 0); bed(g, -2.6, y0, 2.5, 0); table(g, 2, y0, 0, 2.0, 1.0); for (const x of [1.3, 2.7]) { chair(g, x, y0, 0.8, 0); chair(g, x, y0, -0.8, Math.PI); } g.mat('tex.fabric_cloth', 0x3a4a5a); g.box(3.5, y0 + 0.4, -3.3, 3.0, 0.8, 0.9); for (const x of [-2, 2]) ceilingLamp(g, x, y0 + 3.0, 0); void w; void d; void h; },
  'int.office_floor': (g, w, d, h, y0, R) => { room(g, Math.min(w, 20), Math.min(d, 14), 3.2, y0, { floor: 'tex.tile_floor', floorTint: 0x8a8e94, wall: 'tex.plaster_interior' }); for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const x = -6 + k * 4, z = -4 + r * 4; table(g, x, y0, z, 1.6, 0.8, 'tex.plastic', 0xe0e0dc); g.mat('tex.flat', 0x101418); g.emit(200); g.box(x, y0 + 1.0, z + 0.2, 0.55, 0.32, 0.03); g.emit(0); chair(g, x, y0, z - 0.6, Math.PI, 0x2a2a2a); } for (let k = 0; k < 6; k++) ceilingLamp(g, -6 + (k % 3) * 6, y0 + 3.2, k < 3 ? -3 : 3); void R; },
  'int.lodge_restaurant': (g, w, d, h, y0, R) => { room(g, w - 0.6, d - 0.6, h - 0.3, y0, { floor: 'tex.wood_planks', wall: 'tex.log_round', ceil: 'tex.planks_wall', door: 1.6 }); counter(g, w / 2 - 2.5, y0, d / 2 - 1.2, 3.5, 0, 0x6a4a30, 0x4a3420); for (let k = 0; k < 6; k++) { const x = -w / 2 + 2 + (k % 3) * 3, z = -d / 4 + Math.floor(k / 3) * 3; table(g, x, y0, z, 1.2, 1.2); chair(g, x - 0.8, y0, z, -Math.PI / 2); chair(g, x + 0.8, y0, z, Math.PI / 2); } for (let k = 0; k < 4; k++) ceilingLamp(g, -w / 3 + k * w / 4.5, y0 + h - 0.4, 0); void R; },
  'int.sawmill': (g, w, d, h, y0, R) => { g.mat('tex.metal_painted', 0x6a7a6a); g.box(0, y0 + 0.9, 0, w * 0.8, 0.2, 1.2); g.mat('tex.metal_painted', 0xd8a020); g.box(0, y0 + 1.6, 0, 1.8, 1.6, 1.6); g.mat('tex.metal_aluminium', 0xd0d0d0); g.cyl(0, y0 + 0.8, -0.85, 0.7, 0.7, 0.03, 16); for (let k = 0; k < 4; k++) ceilingLamp(g, -w / 3 + k * w / 4.5, y0 + 6, 0); void R; void d; void h; },
  'int.wheelhouse': (g, w, d, h, y0) => { room(g, 3.2, 3.6, 2.2, y0, { floor: 'tex.wood_planks', wall: 'tex.wood_painted', wallTint: 0xe8e4dc, openFront: true }); g.mat('tex.wood_planks', 0x7a5a38); g.box(0, y0 + 0.5, -1.5, 3.0, 1.0, 0.5); g.mat('tex.metal_painted', 0x2a2a2a); g.push().translate(0, y0 + 1.15, -1.25).rotX(-0.5); g.cyl(0, 0, 0, 0.3, 0.3, 0.04, 12); g.pop(); g.mat('tex.flat', 0x20a060); g.emit(220); g.box(0.9, y0 + 1.15, -1.45, 0.45, 0.32, 0.04); g.emit(0); void w; void d; void h; },
};
for (const id in INTERIORS) Builders.register(id, (pl, ctx) => {
  if ((ctx.lod || 0) > 0) return { batches: [] };
  const p = pl.params || {}, g = new GB(4096);
  INTERIORS[id](g, p.w || 10, p.d || 8, p.h || 3.2, 0, srng(pl.seed || 1));
  return out({ 'mat.world': g });
}, { stage: 3 });
/** host builders call this to put an interior inside their shell at LOD0 */
export function addInterior(g, id, w, d, h, y0, seed) { INTERIORS[id](g, w, d, h, y0, srng(seed || 1)); }
