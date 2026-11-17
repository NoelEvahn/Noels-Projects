// Detailed prop builders (Annex A 6.5) for every prop.* archetype. Props are small: LOD0 has bevel/cylinder detail, LOD1 uses
// fewer segments, LOD2 is culled for anything under 3 m (the chunk mid ring does not draw street furniture). Decoration
// placements (world/layout/decor.js) are merged per chunk per material by the chunk manager (O1), so a prop never becomes
// its own draw call. Emissive codes >= 128 mark lamp heads (night glow + bloom, Annex A 4.4).
import { GB, srng, out } from '../kit/geo.js';
import { Builders } from '../../render/builders.js';

const G0 = new GB(8192), DS = new GB(1024);
const BIG = new Set(['prop.container', 'prop.water_tower', 'prop.harbor_crane_small', 'prop.lifeguard_tower', 'prop.scaffold', 'prop.billboard', 'prop.utility_pole', 'prop.log_pile', 'prop.channel_marker', 'prop.footbridge_wood', 'prop.bus_shelter', 'prop.tent', 'prop.rock_granite_l', 'prop.rock_dark_l', 'prop.rock_mossy_l', 'prop.fallen_tree', 'prop.hunting_stand', 'prop.streetlamp_a', 'prop.streetlamp_b']);
function P(id, fn) {
  Builders.register(id, (pl, ctx) => {
    const lod = ctx.lod || 0;
    if (lod >= 2 && !BIG.has(id)) return { batches: [] };
    const g = G0.reset(); g.ds = DS.reset();
    fn(g, lod, srng(pl.seed || 1), pl.params || {}, pl);
    return out({ 'mat.world': g, 'mat.world_ds': g.ds });
  }, { stage: 3 });
}
const seg = (lod, n) => (lod ? Math.max(4, n >> 1) : n);
const LAMP = 200; // lamp head emissive code (128 + 72): (code-128)/127 * uLampGain

// ---- city ---------------------------------------------------------------------------------------------------------------------------------------
P('prop.streetlamp_a', (g, lod) => { // cast-iron double-arm lamp (Old Town)
  g.mat('tex.metal_painted', 0x2a3030); g.cyl(0, 0, 0, 0.18, 0.14, 0.6, seg(lod, 10)); g.cyl(0, 0.6, 0, 0.09, 0.07, 5.0, seg(lod, 8));
  for (const s of [-1, 1]) { g.beam([0, 5.2, 0], [s * 0.9, 5.45, 0], 0.06); g.cyl(s * 0.9, 5.0, 0, 0.05, 0.22, 0.45, seg(lod, 8)); g.mat('tex.glass_window', 0xfff2d8); g.emit(LAMP); g.cyl(s * 0.9, 4.75, 0, 0.16, 0.12, 0.28, seg(lod, 8)); g.emit(0); g.mat('tex.metal_painted', 0x2a3030); }
  g.cyl(0, 5.6, 0, 0.1, 0.02, 0.4, 6);
});
P('prop.streetlamp_b', (g, lod) => { // modern cobra-head lamp
  g.mat('tex.metal_galvanized', 0xc0c4c8); g.cyl(0, 0, 0, 0.14, 0.08, 7.6, seg(lod, 8)); g.beam([0, 7.5, 0], [0, 7.8, -1.6], 0.07);
  g.mat('tex.metal_painted', 0x8a8e92); g.box(0, 7.75, -1.9, 0.32, 0.14, 0.8); g.mat('tex.glass_window', 0xfff6e8); g.emit(LAMP); g.box(0, 7.66, -1.9, 0.26, 0.04, 0.66); g.emit(0);
});
P('prop.traffic_light', (g, lod) => {
  g.mat('tex.metal_painted', 0x3a3e40); g.cyl(0, 0, 0, 0.12, 0.1, 5.4, seg(lod, 8)); g.beam([0, 5.3, 0], [0, 5.4, -4.2], 0.12);
  for (const [z, y] of [[-4.0, 4.8], [0.25, 2.8]]) {
    g.mat('tex.metal_painted', 0x1e2224); g.box(0, y, z, 0.36, 1.0, 0.28);
    const cols = [0xff2a1a, 0xffb020, 0x30ff60];
    for (let k = 0; k < 3; k++) { g.mat('tex.flat', cols[k]); g.emit(k === 2 ? 150 : 0); g.cyl(0, y + 0.3 - k * 0.3, z - 0.15, 0.1, 0.1, 0.02, 8); g.emit(0); if (lod === 0) { g.mat('tex.metal_painted', 0x1e2224); g.box(0, y + 0.42 - k * 0.3, z - 0.24, 0.26, 0.03, 0.16); } }
  }
  if (lod === 0) { g.mat('tex.metal_painted', 0xd8d8d0); g.box(0, 2.0, 0.14, 0.2, 0.3, 0.12); }
});
P('prop.utility_pole', (g, lod) => {
  g.mat('tex.wood_weathered_dark', 0xc8b8a0); g.cyl(0, -0.5, 0, 0.17, 0.12, 10.0, seg(lod, 8));
  g.box(0, 8.8, 0, 2.4, 0.12, 0.12); g.box(0, 8.1, 0, 1.6, 0.1, 0.1);
  g.mat('tex.plastic', 0x5a6a60); for (const x of [-1.05, -0.35, 0.35, 1.05]) g.cyl(x, 8.86, 0, 0.05, 0.04, 0.16, 6);
  if (lod === 0) { g.mat('tex.metal_painted', 0x5a5e5c); g.cyl(0.3, 6.6, 0, 0.28, 0.28, 0.9, 10); g.beam([0, 7.8, 0], [1.2, 0, 1.4], 0.025); }
});
P('prop.bike_dock', (g, lod) => {
  g.mat('tex.metal_painted', 0x1a4a8a); g.box(0, 0.06, 0, 0.5, 0.12, 5);
  for (let k = 0; k < 6; k++) {
    const z = -2.1 + k * 0.84; g.mat('tex.metal_painted', 0x1a4a8a); g.box(0, 0.55, z, 0.18, 1.0, 0.18);
    if (lod === 0 && k % 5 !== 2) { // docked bike: two wheels, frame, bars
      g.mat('tex.rubber_tire', 0xffffff); for (const zz of [-0.5, 0.5]) { g.push().translate(0.45, 0.35, z + zz).rotZ(Math.PI / 2); g.cyl(0, -0.02, 0, 0.34, 0.34, 0.04, 12); g.pop(); }
      g.mat('tex.metal_painted', 0x2a6ac0); g.beam([0.45, 0.35, z - 0.5], [0.45, 0.85, z + 0.1], 0.05); g.beam([0.45, 0.85, z + 0.1], [0.45, 0.35, z + 0.5], 0.05); g.beam([0.45, 0.85, z - 0.3], [0.45, 0.95, z + 0.4], 0.05);
      g.mat('tex.leather', 0xffffff); g.box(0.45, 0.98, z - 0.3, 0.12, 0.05, 0.25);
    }
  }
  g.mat('tex.metal_painted', 0xe8e8e8); g.box(0, 1.2, 2.45, 0.6, 1.6, 0.15);
});
P('prop.map_kiosk', (g) => { g.mat('tex.metal_painted', 0x2a3a4a); g.box(0, 1.1, 0, 0.8, 2.2, 0.35); g.mat('tex.paint_chipped', 0xe8e0c8); g.emit(150); g.box(0, 1.3, -0.18, 0.64, 1.1, 0.02); g.emit(0); g.mat('tex.metal_painted', 0x2a3a4a); g.box(0, 2.3, 0, 1.0, 0.12, 0.5); });
P('prop.bench', (g, lod) => {
  g.mat('tex.metal_painted', 0x2a2e2c); for (const x of [-0.7, 0.7]) { g.box(x, 0.22, 0, 0.06, 0.44, 0.5); g.box(x, 0.65, 0.22, 0.06, 0.5, 0.06); }
  g.mat('tex.wood_planks', 0xb8905a); for (let k = 0; k < (lod ? 2 : 4); k++) g.box(0, 0.45, -0.18 + k * 0.12, 1.8, 0.04, 0.09); for (let k = 0; k < (lod ? 1 : 3); k++) g.box(0, 0.6 + k * 0.13, 0.26, 1.8, 0.09, 0.03);
});
P('prop.bin', (g, lod) => { g.mat('tex.metal_painted', 0x2a4a3a); g.cyl(0, 0, 0, 0.26, 0.28, 0.9, seg(lod, 12)); g.mat('tex.metal_painted', 0x1a2a20); g.cyl(0, 0.9, 0, 0.3, 0.2, 0.12, seg(lod, 12)); });
P('prop.hydrant', (g, lod) => { g.mat('tex.paint_chipped', 0xc8281e); g.cyl(0, 0, 0, 0.16, 0.14, 0.62, seg(lod, 10)); g.cyl(0, 0.62, 0, 0.17, 0.06, 0.16, seg(lod, 10)); for (const s of [-1, 1]) { g.push().translate(s * 0.14, 0.45, 0).rotZ(s * Math.PI / 2); g.cyl(0, 0, 0, 0.06, 0.06, 0.12, 8); g.pop(); } g.cyl(0, 0, 0, 0.22, 0.22, 0.06, seg(lod, 10)); });
P('prop.mailbox', (g) => { g.mat('tex.paint_chipped', 0x1a3a7a); g.box(0, 0.75, 0, 0.45, 0.7, 0.42); g.cyl(0, 1.1, 0, 0.22, 0.22, 0.02, 10); for (const s of [-1, 1]) for (const z of [-1, 1]) g.box(s * 0.18, 0.2, z * 0.16, 0.05, 0.4, 0.05); });
P('prop.bollard', (g, lod) => { g.mat('tex.metal_painted', 0x2a2a2a); g.cyl(0, 0, 0, 0.1, 0.09, 0.9, seg(lod, 8)); g.mat('tex.flat', 0xe0e0d0); g.cyl(0, 0.72, 0, 0.095, 0.095, 0.06, seg(lod, 8)); });
P('prop.planter', (g, lod) => { g.mat('tex.concrete_cast', 0xc0bab0); g.box(0, 0.4, 0, 1.2, 0.8, 1.2); g.mat('tex.forest_floor', 0x8a7a60); g.box(0, 0.79, 0, 1.05, 0.02, 1.05); if (!lod) { g.ds.mat('tex.flat', 0x4a7a3a); for (let k = 0; k < 3; k++) g.ds.card(0, 1.15, 0, 1.0, 0.7, k * 1.05); } });
P('prop.parasol', (g, lod, R) => { g.mat('tex.metal_galvanized', 0xd0d0d0); g.cyl(0, 0, 0, 0.25, 0.25, 0.08, 10); g.cyl(0, 0, 0, 0.03, 0.03, 2.4, 6); g.ds.mat('tex.fabric_canvas', [0xb3272d, 0xe8e0d0, 0x2a5a3a][Math.floor(R() * 3)]); g.ds.cyl(0, 2.0, 0, 1.25, 0.05, 0.45, seg(lod, 10), { noBottom: true }); });
P('prop.cafe_table_set', (g, lod) => { g.mat('tex.metal_painted', 0x2a2a2a); g.cyl(0, 0, 0, 0.03, 0.03, 0.72, 6); g.cyl(0, 0.72, 0, 0.4, 0.4, 0.03, seg(lod, 12)); for (let k = 0; k < (lod ? 2 : 3); k++) { const a = (k / 3) * 6.28; const x = Math.cos(a) * 0.65, z = Math.sin(a) * 0.65; g.box(x, 0.45, z, 0.4, 0.04, 0.4); g.box(x + Math.cos(a) * 0.2, 0.7, z + Math.sin(a) * 0.2, 0.04 + Math.abs(Math.sin(a)) * 0.36, 0.5, 0.04 + Math.abs(Math.cos(a)) * 0.36); for (const s of [-1, 1]) g.box(x + s * 0.17, 0.22, z, 0.03, 0.44, 0.03); } });
P('prop.newsstand', (g) => { g.mat('tex.metal_painted', 0x2a5a3a); g.box(0, 1.1, 0, 1.5, 2.2, 1.2); g.mat('tex.paint_chipped', 0xe8e0c8); g.box(0, 1.0, -0.62, 1.3, 0.9, 0.04); g.mat('tex.metal_painted', 0x1a3a2a); g.box(0, 2.3, -0.2, 1.8, 0.1, 1.8); });
P('prop.bus_shelter', (g, lod) => {
  g.mat('tex.metal_galvanized', 0xb0b4b8); for (const x of [-1.7, 1.7]) for (const z of [-0.6, 0.6]) g.box(x, 1.25, z, 0.08, 2.5, 0.08);
  g.mat('tex.metal_painted', 0x3a4a5a); g.box(0, 2.55, 0, 3.6, 0.1, 1.5);
  g.mat('tex.glass_window', 0xd8e8f0); g.box(0, 1.35, 0.62, 3.4, 2.0, 0.02); g.box(-1.72, 1.35, 0, 0.02, 2.0, 1.2);
  g.mat('tex.paint_chipped', 0xf0e8d0); g.emit(160); g.box(1.72, 1.4, 0, 0.06, 1.8, 1.1); g.emit(0);
  if (!lod) { g.mat('tex.wood_planks', 0xa08060); g.box(0, 0.48, 0.4, 2.4, 0.05, 0.35); }
});
P('prop.sign_street', (g) => { g.mat('tex.metal_galvanized', 0xc0c0c0); g.cyl(0, 0, 0, 0.04, 0.04, 2.9, 6); g.mat('tex.metal_painted', 0x1e6a3a); g.box(0, 2.75, 0, 0.9, 0.2, 0.03); g.box(0, 2.5, 0, 0.03, 0.2, 0.9); });
P('prop.sign_shop', (g, lod, R) => { g.mat('tex.metal_painted', [0x8a2a20, 0x2a4a6a, 0x3a5a2a, 0x6a4a2a][Math.floor(R() * 4)]); g.box(0, 0, -0.35, 0.06, 0.7, 0.7); g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, 0.4, -0.3, 0.04, 0.04, 0.7); });
P('prop.billboard', (g) => { g.mat('tex.metal_galvanized', 0x9a9a9a); g.cyl(0, 0, 0, 0.35, 0.3, 7, 8); g.mat('tex.metal_painted', 0x3a3a3a); g.box(0, 9, 0, 10, 4.5, 0.4); g.mat('tex.paint_chipped', 0xe8d8b0); g.emit(170); g.box(0, 9, -0.22, 9.6, 4.1, 0.04); g.emit(0); });
P('prop.ac_unit', (g) => { g.mat('tex.metal_galvanized', 0xd8d8d0); g.box(0, 0, 0, 0.75, 0.48, 0.55); g.mat('tex.metal_painted', 0x5a5a5a); g.box(0, 0, -0.28, 0.6, 0.36, 0.02); });
P('prop.fire_escape', (g) => { g.mat('tex.metal_painted', 0x2a2a2c); g.box(0, 0, -0.65, 3, 0.06, 1.3); g.box(0, 1, -1.28, 3, 0.05, 0.05); for (let k = 0; k < 5; k++) g.box(-1.5 + k * 0.75, 0.5, -1.28, 0.04, 1, 0.04); g.beam([-1.2, 0.05, -0.4], [1.2, 3.2, -0.4], 0.5, 0.06); });
P('prop.awning', (g) => { g.ds.mat('tex.fabric_canvas', 0xb3272d); g.ds.quad([1.5, 0, 0], [-1.5, 0, 0], [-1.5, -0.7, -1.3], [1.5, -0.7, -1.3]); g.ds.quad([1.5, -0.7, -1.3], [-1.5, -0.7, -1.3], [-1.5, -0.95, -1.32], [1.5, -0.95, -1.32]); });
P('prop.water_tower', (g, lod) => { g.mat('tex.metal_painted', 0x3a3a3a); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * 1.3, 1.8, sz * 1.3, 0.16, 3.6, 0.16); g.mat('tex.wood_weathered_dark', 0xc8b8a0); g.cyl(0, 3.6, 0, 1.9, 1.8, 3.4, seg(lod, 14)); g.mat('tex.roof_shingle', 0x8a8a8a); g.cyl(0, 7.0, 0, 2.0, 0.1, 1.4, seg(lod, 14), { noBottom: true }); });
P('prop.roof_vent', (g, lod) => { g.mat('tex.metal_galvanized', 0xd0d0d0); g.cyl(0, 0, 0, 0.25, 0.25, 0.8, seg(lod, 8)); g.cyl(0, 0.8, 0, 0.4, 0.05, 0.25, seg(lod, 8)); });
P('prop.antenna', (g) => { g.mat('tex.metal_galvanized', 0xc0c0c0); g.cyl(0, 0, 0, 0.04, 0.02, 3, 4); for (let k = 0; k < 4; k++) g.box(0, 2 + k * 0.25, 0, 1.2 - k * 0.2, 0.02, 0.02); });
P('prop.dumpster', (g) => { g.mat('tex.paint_chipped', 0x2a5a3a); g.box(0, 0.7, 0, 2, 1.1, 1.2); g.mat('tex.plastic', 0x2a2a2a); g.box(0, 1.28, 0, 2.05, 0.06, 1.25); g.mat('tex.rubber_tire', 0xffffff); for (const x of [-0.8, 0.8]) for (const z of [-0.45, 0.45]) g.cyl(x, 0, z, 0.08, 0.08, 0.15, 6); });
P('prop.pallet', (g) => { g.mat('tex.wood_planks', 0xc8a878); for (let k = 0; k < 5; k++) g.box(0, 0.13, -0.45 + k * 0.225, 1.2, 0.025, 0.1); for (const x of [-0.55, 0, 0.55]) g.box(x, 0.06, 0, 0.1, 0.09, 1.0); });
P('prop.crate_wood', (g) => { g.mat('tex.wood_planks', 0xd0b080); g.box(0, 0.4, 0, 0.8, 0.8, 0.8); g.mat('tex.wood_weathered_dark', 0xffffff); for (const s of [-1, 1]) { g.box(s * 0.41, 0.4, 0, 0.02, 0.8, 0.1); g.box(0, 0.4, s * 0.41, 0.1, 0.8, 0.02); } });
P('prop.barrel', (g, lod) => { g.mat('tex.paint_chipped', 0x2a4a7a); g.lathe([[0.27, 0], [0.3, 0.45], [0.27, 0.9], [0, 0.9]], seg(lod, 12)); });
P('prop.fuel_drum', (g, lod) => { g.mat('tex.paint_chipped', 0xb02a1a); g.cyl(0, 0, 0, 0.29, 0.29, 0.88, seg(lod, 12)); g.mat('tex.rust', 0xffffff); g.cyl(0, 0.3, 0, 0.3, 0.3, 0.04, seg(lod, 12), { noTop: true, noBottom: true }); g.cyl(0, 0.6, 0, 0.3, 0.3, 0.04, seg(lod, 12), { noTop: true, noBottom: true }); });
P('prop.traffic_cone', (g) => { g.mat('tex.plastic', 0xe86020); g.cyl(0, 0.04, 0, 0.16, 0.03, 0.7, 10); g.mat('tex.flat', 0xf0f0f0); g.cyl(0, 0.35, 0, 0.1, 0.075, 0.12, 10, { noTop: true, noBottom: true }); g.mat('tex.plastic', 0x2a2a2a); g.box(0, 0.02, 0, 0.4, 0.04, 0.4); });
P('prop.barrier', (g) => { g.mat('tex.concrete_cast', 0xd8d4cc); g.push(); g.box(0, 0.15, 0, 2, 0.3, 0.6); g.box(0, 0.55, 0, 2, 0.5, 0.25); g.pop(); g.mat('tex.flat', 0xd84020); g.box(0, 0.65, -0.13, 1.6, 0.12, 0.01); });
P('prop.fence_chainlink', (g) => { g.mat('tex.metal_galvanized', 0xc0c0c0); for (const x of [-1.5, 1.5]) g.cyl(x, 0, 0, 0.04, 0.04, 2, 6); g.box(0, 1.98, 0, 3, 0.04, 0.04); g.ds.mat('tex.metal_galvanized', 0x8a8e90); g.ds.quad([1.5, 0.05, 0], [-1.5, 0.05, 0], [-1.5, 1.95, 0], [1.5, 1.95, 0]); });
P('prop.railing', (g) => { g.mat('tex.metal_galvanized', 0xd0d0d0); g.box(0, 1.0, 0, 2, 0.05, 0.05); g.box(0, 0.5, 0, 2, 0.03, 0.03); for (const x of [-1, 0, 1]) g.box(x, 0.5, 0, 0.05, 1.0, 0.05); });
P('prop.manhole', (g) => { g.groundAO = false; g.mat('tex.metal_checker', 0x6a6a6a); g.cyl(0, 0, 0, 0.35, 0.35, 0.025, 14, { noBottom: true }); });
P('prop.vending_machine', (g) => { g.mat('tex.metal_painted', 0xc82020); g.box(0, 0.95, 0, 0.9, 1.9, 0.8); g.mat('tex.glass_window', 0xffffff); g.emit(170); g.box(-0.1, 1.15, -0.41, 0.55, 1.2, 0.02); g.emit(0); });
P('prop.atm', (g) => { g.mat('tex.metal_painted', 0x3a4a5a); g.box(0, 0.95, 0, 0.7, 1.9, 0.6); g.mat('tex.flat', 0x4a8ac0); g.emit(160); g.box(0, 1.35, -0.31, 0.35, 0.25, 0.02); g.emit(0); g.mat('tex.metal_galvanized', 0xd0d0d0); g.box(0, 1.05, -0.33, 0.5, 0.1, 0.06); });
P('prop.gas_pump', (g) => { g.mat('tex.metal_painted', 0xe8e8e8); g.box(0, 0.8, 0, 0.8, 1.6, 0.5); g.mat('tex.metal_painted', 0xc02020); g.box(0, 1.5, 0, 0.82, 0.3, 0.52); g.mat('tex.flat', 0x101010); g.box(0, 1.2, -0.26, 0.5, 0.25, 0.02); g.mat('tex.rubber_tire', 0xffffff); g.beam([0.35, 1.1, -0.2], [0.5, 0.4, -0.4], 0.04); });
P('prop.parking_meter', (g) => { g.mat('tex.metal_painted', 0x5a5a5a); g.cyl(0, 0, 0, 0.04, 0.04, 1.1, 6); g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, 1.25, 0, 0.18, 0.3, 0.14); });
P('prop.scaffold', (g, lod) => { g.mat('tex.metal_galvanized', 0xc0c0c0); for (const x of [-1.2, 1.2]) for (const z of [-0.7, 0.7]) g.cyl(x, 0, z, 0.03, 0.03, 8, 4); for (let y = 2; y <= 8; y += 2) { g.mat('tex.wood_planks', 0xc0a070); g.box(0, y, 0, 2.5, 0.05, 1.5); g.mat('tex.metal_galvanized', 0xc0c0c0); g.box(0, y + 1, -0.7, 2.4, 0.03, 0.03); if (!lod) g.beam([-1.2, y - 2, -0.7], [1.2, y, -0.7], 0.03); } });
P('prop.container', (g) => { g.mat('tex.metal_corrugated', 0x2e5ea6); g.push().translate(0, 1.3, 0).rotZ(Math.PI / 2); g.box(0, 0, 0, 2.6, 2.44, 6.06); g.pop(); g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, 1.3, -3.04, 2.3, 2.4, 0.04); });
P('prop.forklift_static', (g, lod) => {
  g.mat('tex.metal_painted', 0xe0a020); g.box(0, 0.7, 0.2, 1.2, 0.9, 1.8); g.box(0, 1.15, 0.9, 1.1, 0.6, 0.6);
  g.mat('tex.metal_painted', 0x2a2a2a); for (const x of [-0.5, 0.5]) { g.box(x, 1.15, 0.55, 0.06, 1.3, 0.06); g.box(x, 1.15, -0.45, 0.06, 1.3, 0.06); } g.box(0, 1.85, 0.05, 1.1, 0.06, 1.1);
  g.box(0, 1.1, -0.75, 0.9, 2.2, 0.12); for (const x of [-0.3, 0.3]) g.box(x, 0.1, -1.3, 0.1, 0.05, 1.1);
  g.mat('tex.rubber_tire', 0xffffff); for (const x of [-0.62, 0.62]) for (const z of [-0.45, 0.8]) { g.push().translate(x, 0.3, z).rotZ(Math.PI / 2); g.cyl(0, -0.1, 0, 0.3, 0.3, 0.2, seg(lod, 10)); g.pop(); }
});

// ---- lake / dock ------------------------------------------------------------------------------------------------------------------------------
P('prop.dock_section', (g) => { g.mat('tex.wood_weathered_dark', 0xffffff); g.box(0, 0.15, 0, 3, 0.15, 6); for (const x of [-1.3, 1.3]) g.box(x, 0, 0, 0.2, 0.25, 6); g.mat('tex.plastic', 0xd8d8d0); for (const x of [-1, 1]) for (const z of [-2, 2]) g.box(x, -0.15, z, 0.9, 0.3, 1.6); });
P('prop.pile', (g, lod) => { g.mat('tex.wood_weathered_dark', 0xffffff); g.cyl(0, -1.5, 0, 0.15, 0.15, 4.5, seg(lod, 8)); });
P('prop.pile_rope', (g, lod) => { g.mat('tex.wood_weathered_dark', 0xffffff); g.cyl(0, -1.5, 0, 0.18, 0.18, 4.6, seg(lod, 8)); g.mat('tex.fabric_canvas', 0xc8b088); for (let k = 0; k < (lod ? 2 : 6); k++) g.cyl(0, 1.6 + k * 0.09, 0, 0.215, 0.215, 0.08, seg(lod, 10), { noTop: true, noBottom: true }); g.cyl(0, 3.1, 0, 0.19, 0.04, 0.15, 8); });
P('prop.rope_coil', (g, lod) => { g.mat('tex.fabric_canvas', 0xb89a68); for (let k = 0; k < (lod ? 2 : 4); k++) g.cyl(0, k * 0.05, 0, 0.32 - k * 0.02, 0.32 - k * 0.02, 0.05, seg(lod, 12)); });
P('prop.hook_chain', (g) => { g.mat('tex.metal_painted', 0x3a3a3a); g.cyl(0, -1.6, 0, 0.02, 0.02, 1.6, 4); g.beam([0, -1.6, 0], [0, -1.8, -0.12], 0.05); g.beam([0, -1.8, -0.12], [0, -1.65, -0.2], 0.04); });
P('prop.oar', (g) => { g.mat('tex.wood_planks', 0xc8a070); g.beam([0, 0.05, -1.2], [0, 0.05, 0.8], 0.05); g.box(0, 0.05, 1.05, 0.16, 0.02, 0.55); });
P('prop.outboard', (g, lod) => { g.mat('tex.metal_painted', 0x2a2a2e); g.box(0, 0.5, 0, 0.35, 0.45, 0.5); g.cyl(0, -0.6, 0.05, 0.06, 0.06, 0.9, seg(lod, 8)); g.box(0, -0.65, 0.05, 0.08, 0.2, 0.35); g.mat('tex.metal_aluminium', 0xffffff); g.box(0, -0.65, 0.22, 0.25, 0.04, 0.04); });
P('prop.fish_rack', (g) => { g.mat('tex.wood_weathered_dark', 0xffffff); for (const x of [-1, 1]) g.box(x, 0.9, 0, 0.08, 1.8, 0.08); for (let k = 0; k < 3; k++) g.box(0, 0.8 + k * 0.4, 0, 2.1, 0.04, 0.04); g.mat('tex.metal_aluminium', 0xc0c4c8); for (let k = 0; k < 6; k++) g.box(-0.8 + k * 0.32, 1.45, 0, 0.06, 0.35, 0.02); });
P('prop.net_drying', (g) => { g.mat('tex.wood_weathered_dark', 0xffffff); for (const x of [-1.5, 1.5]) g.box(x, 1, 0, 0.1, 2, 0.1); g.box(0, 2, 0, 3.1, 0.06, 0.06); g.ds.mat('tex.fabric_cloth', 0x3a5a8a); g.ds.quad([1.45, 0.4, 0], [-1.45, 0.4, 0], [-1.45, 1.95, 0], [1.45, 1.95, 0]); });
P('prop.lantern', (g) => { g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, 0.05, 0, 0.18, 0.04, 0.18); g.box(0, 0.33, 0, 0.18, 0.04, 0.18); g.mat('tex.glass_window', 0xffe0a0); g.emit(220); g.box(0, 0.19, 0, 0.14, 0.24, 0.14); g.emit(0); });
P('prop.picnic_table', (g) => { g.mat('tex.wood_planks', 0xb89060); g.box(0, 0.75, 0, 1.8, 0.05, 0.75); for (const s of [-1, 1]) { g.box(0, 0.45, s * 0.6, 1.8, 0.05, 0.28); g.beam([s * 0.7, 0, -0.6], [s * 0.7, 0.75, 0.15], 0.07); g.beam([s * 0.7, 0, 0.6], [s * 0.7, 0.75, -0.15], 0.07); } });
P('prop.campfire', (g) => { g.mat('tex.rock_dark', 0xffffff); for (let k = 0; k < 9; k++) { const a = (k / 9) * 6.28; g.box(Math.cos(a) * 0.5, 0.08, Math.sin(a) * 0.5, 0.22, 0.16, 0.18); } g.mat('tex.log_round', 0x8a6a4a); for (let k = 0; k < 4; k++) { const a = k * 1.57; g.beam([Math.cos(a) * 0.35, 0.05, Math.sin(a) * 0.35], [0, 0.4, 0], 0.08); } g.mat('tex.flat', 0xff8020); g.emit(255); g.cyl(0, 0.05, 0, 0.18, 0.02, 0.35, 6); g.emit(0); });
P('prop.tent', (g, lod, R) => { const t = [0x3a6a3a, 0xc86020, 0x2a5a9a][Math.floor(R() * 3)]; g.ds.mat('tex.fabric_canvas', t); g.ds.quad([1.4, 0, -1.6], [1.4, 0, 1.6], [0, 1.7, 1.6], [0, 1.7, -1.6]); g.ds.quad([-1.4, 0, 1.6], [-1.4, 0, -1.6], [0, 1.7, -1.6], [0, 1.7, 1.6]); g.ds._tri3([-1.4, 0, 1.6], [1.4, 0, 1.6], [0, 1.7, 1.6]); g.ds.mat('tex.fabric_canvas', 0x2a2a2a); g.ds._tri3([-0.5, 0, -1.61], [0.5, 0, -1.61], [0, 1.1, -1.61]); g.mat('tex.wood_planks', 0x9a7a50); g.box(0, 0.85, 1.75, 0.05, 1.7, 0.05); });
P('prop.kayak', (g, lod) => { g.mat('tex.plastic', 0xe86020); g.loft([-1.7, -1, 0, 1, 1.7].map((z, i) => { const r = [0.05, 0.3, 0.34, 0.3, 0.05][i]; return { z, pts: Array.from({ length: lod ? 6 : 10 }, (_, k) => { const a = (k / (lod ? 6 : 10)) * Math.PI * 2; return [Math.cos(a) * r, 0.18 + Math.sin(a) * r * 0.55]; }) }; }), { caps: true }); g.mat('tex.plastic', 0x2a2a2a); g.cyl(0, 0.3, 0.1, 0.24, 0.24, 0.05, 12); });
P('prop.life_ring', (g, lod) => { const n = seg(lod, 12); for (let k = 0; k < n; k++) { const a0 = (k / n) * 6.28, a1 = ((k + 1) / n) * 6.28; g.mat('tex.plastic', (k >> 1) % 2 ? 0xf0f0f0 : 0xe84020); g.tube([Math.cos(a0) * 0.32, Math.sin(a0) * 0.32, 0], [Math.cos(a1) * 0.32, Math.sin(a1) * 0.32, 0], 0.08, 0.08, 6, { noTop: true, noBottom: true }); } });
P('prop.buoy_small', (g, lod) => { g.mat('tex.plastic', 0xf0f0f0); g.lathe([[0, -0.2], [0.2, -0.1], [0.22, 0.1], [0.12, 0.3], [0, 0.32]], seg(lod, 10)); });
P('prop.buoy_red', (g, lod) => { g.mat('tex.paint_chipped', 0xe8452c); g.lathe([[0, -0.3], [0.32, -0.15], [0.36, 0.15], [0.2, 0.45], [0, 0.48]], seg(lod, 12)); g.mat('tex.metal_painted', 0x2a2a2a); g.cyl(0, 0.48, 0, 0.03, 0.03, 0.4, 4); });
P('prop.sign_wood', (g) => { g.mat('tex.wood_weathered_dark', 0xffffff); g.box(0, 0.6, 0, 0.1, 1.2, 0.1); g.mat('tex.wood_planks', 0xd0b080); g.box(0, 1.3, 0, 1.0, 0.4, 0.05); });
P('prop.trail_sign', (g) => { g.mat('tex.wood_weathered_dark', 0xffffff); g.box(0, 0.8, 0, 0.12, 1.6, 0.12); g.mat('tex.wood_planks', 0xc8a070); g.push().translate(0.35, 1.4, 0).rotY(0.2); g.box(0, 0, 0, 0.8, 0.2, 0.04); g.pop(); g.push().translate(-0.3, 1.15, 0).rotY(-0.3); g.box(0, 0, 0, 0.7, 0.2, 0.04); g.pop(); });
P('prop.reeds', (g) => { g.ds.mat('tex.flat', 0x6a7a3a); for (let k = 0; k < 4; k++) g.ds.card(0, 0.8, 0, 1.0, 1.6, k * 0.8); });
P('prop.footbridge_wood', (g) => { g.mat('tex.wood_planks', 0xc0a078); g.box(0, 1.0, 0, 2.4, 0.15, 10); g.mat('tex.wood_weathered_dark', 0xffffff); for (const x of [-1.15, 1.15]) { g.box(x, 1.95, 0, 0.08, 0.08, 10); for (let k = 0; k <= 5; k++) g.box(x, 1.45, -5 + k * 2, 0.1, 1.0, 0.1); } for (const z of [-4.5, 4.5]) for (const x of [-1, 1]) g.cyl(x, -1, z, 0.12, 0.12, 2, 6); });

// ---- ocean ------------------------------------------------------------------------------------------------------------------------------------------
P('prop.fish_crate', (g, lod, R) => { g.mat('tex.plastic', [0x2a5a9a, 0xd8d8d0, 0xe06020][Math.floor(R() * 3)]); g.box(0, 0.15, 0, 0.8, 0.3, 0.5); if (!lod) { g.mat('tex.flat', 0xd0d8e0); g.box(0, 0.28, 0, 0.72, 0.03, 0.42); } });
P('prop.crab_pot', (g, lod) => { g.mat('tex.metal_galvanized', 0x8a9a8a); g.box(0, 0.3, 0, 0.9, 0.04, 0.9); g.box(0, 0.02, 0, 0.9, 0.04, 0.9); for (const x of [-0.43, 0.43]) for (const z of [-0.43, 0.43]) g.box(x, 0.16, z, 0.04, 0.3, 0.04); g.ds.mat('tex.fabric_cloth', 0x5a7a5a); g.ds.quad([0.45, 0, -0.45], [-0.45, 0, -0.45], [-0.45, 0.32, -0.45], [0.45, 0.32, -0.45]); g.ds.quad([-0.45, 0, 0.45], [0.45, 0, 0.45], [0.45, 0.32, 0.45], [-0.45, 0.32, 0.45]); g.mat('tex.plastic', 0xe8a020); if (!lod) g.cyl(0.3, 0.32, 0.3, 0.1, 0.1, 0.2, 6); });
P('prop.net_pile', (g) => { g.mat('tex.fabric_cloth', 0x3a5a8a); g.cyl(0, 0, 0, 0.9, 0.3, 0.5, 9); g.mat('tex.plastic', 0xe8a020); for (let k = 0; k < 4; k++) g.cyl(Math.cos(k) * 0.6, 0.15, Math.sin(k) * 0.6, 0.08, 0.08, 0.12, 6); });
P('prop.bollard_mooring', (g, lod) => { g.mat('tex.metal_painted', 0x2a2a2a); g.lathe([[0.22, 0], [0.18, 0.35], [0.2, 0.45], [0.28, 0.5], [0.28, 0.56], [0, 0.56]], seg(lod, 12)); });
P('prop.gangway', (g) => { g.mat('tex.metal_checker', 0xffffff); g.beam([0, 0.2, -3], [0, -0.6, 3], 1.1, 0.08); g.mat('tex.metal_galvanized', 0xd0d0d0); for (const x of [-0.55, 0.55]) g.beam([x, 1.2, -3], [x, 0.4, 3], 0.05); });
P('prop.harbor_crane_small', (g) => { g.mat('tex.metal_painted', 0xd8a020); g.cyl(0, 0, 0, 0.6, 0.5, 6, 10); g.box(0, 6.3, 0, 1.4, 1.2, 1.6); g.beam([0, 6.6, 0], [0, 8.4, -6], 0.4); g.mat('tex.metal_painted', 0x2a2a2a); g.cyl(0, 3.5, -5.9, 0.02, 0.02, 4.8, 3); g.box(0, 3.4, -5.9, 0.2, 0.3, 0.2); });
P('prop.ice_bin', (g) => { g.mat('tex.plastic', 0xe8e8e0); g.box(0, 0.4, 0, 1.2, 0.8, 0.8); g.mat('tex.plastic', 0x2a6aa0); g.box(0, 0.83, 0, 1.22, 0.06, 0.82); });
P('prop.sun_lounger', (g, lod, R) => { g.mat('tex.wood_planks', 0xe0c8a0); g.box(0, 0.32, 0.3, 0.65, 0.05, 1.3); g.push().translate(0, 0.32, -0.35).rotX(0.7); g.box(0, 0.3, 0, 0.65, 0.05, 0.6); g.pop(); g.ds.mat('tex.fabric_canvas', [0x2a6aa0, 0xe8e0d0, 0xd86040][Math.floor(R() * 3)]); g.ds.quad([0.3, 0.36, 0.95], [-0.3, 0.36, 0.95], [-0.3, 0.36, -0.3], [0.3, 0.36, -0.3]); for (const x of [-0.28, 0.28]) for (const z of [-0.2, 0.9]) g.box(x, 0.15, z, 0.04, 0.3, 0.04); });
P('prop.beach_umbrella', (g, lod) => { g.mat('tex.wood_planks', 0xd0b080); g.cyl(0, 0, 0, 0.03, 0.03, 2.3, 6); const n = seg(lod, 12); for (let k = 0; k < n; k++) { const a0 = (k / n) * 6.28, a1 = ((k + 1) / n) * 6.28; g.ds.mat('tex.fabric_canvas', k % 2 ? 0xf0ead8 : 0x2a6aa0); g.ds._tri3([0, 2.4, 0], [Math.cos(a1) * 1.1, 1.95, Math.sin(a1) * 1.1], [Math.cos(a0) * 1.1, 1.95, Math.sin(a0) * 1.1]); } });
P('prop.lifeguard_tower', (g) => { g.mat('tex.wood_painted', 0xe8e0d0); for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.8]) g.box(x, 1.0, z, 0.12, 2.0, 0.12); g.box(0, 2.05, 0, 2.0, 0.1, 2.0); g.mat('tex.wood_painted', 0xd8402a); g.box(0, 2.7, 0.6, 2.0, 1.2, 0.08); g.box(-0.96, 2.7, 0, 0.08, 1.2, 2.0); g.box(0.96, 2.7, 0, 0.08, 1.2, 2.0); g.mat('tex.wood_painted', 0xe8e0d0); g.box(0, 3.4, 0, 2.3, 0.1, 2.3); g.beam([0, 0, -2.2], [0, 2.05, -0.9], 0.6, 0.06); });
P('prop.channel_marker', (g, lod) => { g.mat('tex.paint_chipped', 0x2a8a3a); g.cyl(0, -1, 0, 0.45, 0.35, 1.8, seg(lod, 10)); g.cyl(0, 0.8, 0, 0.12, 0.12, 2.4, 6); g.box(0, 3.2, 0, 0.7, 0.7, 0.05); g.mat('tex.glass_window', 0x60ff80); g.emit(255); g.cyl(0, 3.6, 0, 0.1, 0.1, 0.2, 6); g.emit(0); });
P('prop.driftwood', (g) => { g.mat('tex.log_round', 0xc8c0b0); g.tube([-1.2, 0.12, 0], [1.1, 0.16, 0.3], 0.14, 0.09, 6); g.tube([0.3, 0.12, 0.08], [0.9, 0.3, -0.4], 0.06, 0.03, 5); });

// ---- forest ---------------------------------------------------------------------------------------------------------------------------------------
P('prop.log_pile', (g, lod) => { g.mat('tex.bark_pine', 0xffffff); const rows = [5, 4, 3]; let y = 0.28; for (const n of rows) { for (let k = 0; k < n; k++) g.tube([-1.9 + (n === 5 ? 0 : n === 4 ? 0.28 : 0.56) + k * 0.56 + 0.28 - 0.28, y, -3], [-1.9 + (n === 5 ? 0 : n === 4 ? 0.28 : 0.56) + k * 0.56, y, 3], 0.27, 0.27, seg(lod, 8), { noTop: true, noBottom: true }); y += 0.47; } g.mat('tex.log_round', 0xe0c8a0); for (const z of [-3, 3]) g.box(-0.8, 0.7, z, 3.0, 1.4, 0.02); g.mat('tex.wood_weathered_dark', 0xffffff); for (const x of [-2.3, 0.6]) g.box(x, 0.8, 0, 0.18, 1.6, 0.18); });
P('prop.log_single', (g, lod) => { g.mat('tex.bark_pine', 0xffffff); g.tube([0, 0.25, -2], [0, 0.25, 2], 0.25, 0.22, seg(lod, 8)); });
P('prop.stump', (g, lod) => { g.mat('tex.bark_oak', 0xffffff); g.cyl(0, -0.1, 0, 0.42, 0.34, 0.7, seg(lod, 10), { noTop: true }); g.mat('tex.log_round', 0xe8d0b0); g.cyl(0, 0.6, 0, 0.34, 0.34, 0.01, seg(lod, 10), { noBottom: true }); });
P('prop.fallen_tree', (g, lod) => { g.mat('tex.bark_pine', 0xd8d0c0); g.tube([0, 0.4, -4], [0.3, 0.25, 4], 0.4, 0.15, seg(lod, 8)); g.mat('tex.moss', 0xffffff); g.tube([0, 0.62, -3.5], [0.2, 0.42, 1.5], 0.2, 0.08, 5); g.mat('tex.bark_pine', 0xd8d0c0); for (let k = 0; k < 3; k++) g.tube([0.1, 0.4, -1 + k * 1.5], [0.9 - k * 0.4, 1.2, -0.3 + k * 1.4], 0.08, 0.03, 4); });
P('prop.sawhorse', (g) => { g.mat('tex.wood_planks', 0xc8a070); g.box(0, 0.8, 0, 0.12, 0.12, 1.4); for (const z of [-0.6, 0.6]) for (const s of [-1, 1]) g.beam([0, 0.8, z], [s * 0.35, 0, z], 0.07); });
P('prop.workbench', (g, lod) => { g.mat('tex.wood_planks', 0xb08858); g.box(0, 0.9, 0, 2, 0.08, 0.8); for (const x of [-0.9, 0.9]) for (const z of [-0.35, 0.35]) g.box(x, 0.45, z, 0.08, 0.9, 0.08); g.box(0, 0.25, 0, 1.9, 0.04, 0.7); if (!lod) { g.mat('tex.metal_painted', 0x5a5a5a); g.box(0.6, 1.0, 0.2, 0.3, 0.12, 0.2); g.box(-0.5, 0.96, -0.1, 0.4, 0.04, 0.1); } });
P('prop.anvil', (g) => { g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, 0.6, 0, 0.6, 0.2, 0.25); g.box(0, 0.4, 0, 0.25, 0.25, 0.2); g.box(-0.4, 0.62, 0, 0.25, 0.12, 0.12); g.mat('tex.log_round', 0x9a7a50); g.cyl(0, 0, 0, 0.3, 0.3, 0.28, 10); });
P('prop.hunting_stand', (g) => { g.mat('tex.wood_weathered_dark', 0xffffff); for (const x of [-0.6, 0.6]) for (const z of [-0.6, 0.6]) g.beam([x * 1.3, 0, z * 1.3], [x, 3.2, z], 0.1); g.box(0, 3.2, 0, 1.4, 0.08, 1.4); g.box(0, 3.65, -0.68, 1.4, 0.9, 0.05); g.box(-0.68, 3.65, 0, 0.05, 0.9, 1.4); g.box(0.68, 3.65, 0, 0.05, 0.9, 1.4); g.mat('tex.roof_metal_red', 0x8a8a6a); g.box(0, 4.3, 0, 1.6, 0.06, 1.6); for (let k = 0; k < 8; k++) g.box(0, 0.4 + k * 0.38, -1.1 + k * 0.05, 0.5, 0.04, 0.08); });
P('prop.gate_barrier', (g) => { g.mat('tex.metal_painted', 0x2a2a2a); g.box(-2.6, 0.55, 0, 0.2, 1.1, 0.2); g.mat('tex.paint_chipped', 0xe8e0d0); g.box(0, 0.95, 0, 5, 0.1, 0.1); g.mat('tex.paint_chipped', 0xc82a1e); for (let k = 0; k < 5; k++) g.box(-2 + k, 0.95, -0.055, 0.4, 0.11, 0.01); });

// ---- rocks (granite / dark basalt / mossy) --------------------------------------------------------------------------------------------------
function rock(g, lod, R, s, tex, tint, moss) {
  // irregular boulder: lathe with jittered radii, flattened, rotated randomly; optional moss cap
  const n = seg(lod, 9), prof = [];
  for (let k = 0; k <= 5; k++) { const t = k / 5; prof.push([Math.max(0.001, Math.sin(Math.PI * Math.min(0.98, 0.1 + t * 0.9)) * s * (0.8 + R() * 0.35)), (-0.25 + t * 1.1) * s * 0.7]); }
  prof[prof.length - 1][0] = 0.001;
  g.push().rotY(R() * 6.28).scale(1 + R() * 0.4, 1, 0.8 + R() * 0.3); g.mat(tex, tint); g.lathe(prof, n, { r: s });
  if (moss) { g.mat('tex.moss', 0xffffff); g.lathe(prof.slice(2).map(([r, y]) => [r * 1.02, y + 0.02]), n, { r: s }); }
  g.pop();
}
for (const [kind, tex, tint, moss] of [['granite', 'tex.rock_granite', 0xffffff, false], ['dark', 'tex.rock_dark', 0xffffff, false], ['mossy', 'tex.rock_granite', 0xd8d8d0, true]]) {
  for (const [sz, s] of [['s', 0.45], ['m', 1.0], ['l', 2.1]]) P(`prop.rock_${kind}_${sz}`, (g, lod, R) => { rock(g, lod, R, s, tex, tint, moss); if (sz !== 's' && !lod) rock(g, lod, R, s * 0.45, tex, tint, moss); });
}

// ---- Detail Batch 1 props ----------------------------------------------------------------------------------------------------------------------
// post-mounted rural mailbox with a red flag (cabin, house and farm lots)
P('prop.mailbox_post', (g, lod, R) => {
  const col = [0x2a2a2c, 0x3a5a3a, 0x7a2a22, 0xc8c4bc, 0x24406a][Math.floor(R() * 5)];
  g.mat('tex.wood_weathered_dark', 0xb8a890); g.box(0, 0.55, 0, 0.1, 1.1, 0.1, { noBottom: true });
  g.mat('tex.metal_painted', col); g.box(0, 1.2, 0, 0.26, 0.24, 0.5); g.cyl(0, 1.32, -0.25, 0.13, 0.13, 0.5, seg(lod, 10), { noTop: true, noBottom: true });
  g.mat('tex.metal_painted', 0xc82820); g.box(0.15, 1.28, 0.05, 0.02, 0.2, 0.04);
});
// street litter: a pile of black and green bin bags
P('prop.trash_bags', (g, lod, R) => {
  g.groundAO = false;
  const n = 3 + Math.floor(R() * 3);
  for (let k = 0; k < n; k++) {
    const a = k * 2.2 + R(), r = k ? 0.28 + R() * 0.1 : 0, s = 0.9 + R() * 0.4; g.mat('tex.plastic', k % 3 === 2 ? 0x2a4a34 : 0x16161a);
    g.push().translate(Math.cos(a) * r, 0, Math.sin(a) * r).scale(s * 0.42, s * 0.38, s * 0.4); g.lathe([[0.001, 0.02], [0.7, 0.18], [1.0, 0.55], [0.75, 1.0], [0.3, 1.25], [0.05, 1.18]], seg(lod, 8)); g.pop();
  }
  g.groundAO = true;
});
// newspaper vending boxes, 3 colours in a row
P('prop.newspaper_box', (g) => {
  const cols = [0xc02a20, 0x2a5aa0, 0xe0b020, 0x2a7a4a];
  for (let k = 0; k < 3; k++) { const x = (k - 1) * 0.46; g.mat('tex.metal_painted', cols[k]); g.box(x, 0.55, 0, 0.4, 0.78, 0.4); g.mat('tex.glass_window', 0xc8d4dc); g.box(x, 0.72, -0.205, 0.28, 0.22, 0.01); g.mat('tex.metal_painted', 0x2a2a2c); g.box(x, 0.2, 0, 0.1, 0.4, 0.1, { noBottom: true }); }
});
