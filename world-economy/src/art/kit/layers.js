// Texture-layer table (Annex A 5.3): every tex.* set lives in one of three GPU texture arrays (H, S, D tiers).
// Pure data shared by art builders (layer index + tile size for UVs) and render/textures/library.js (GLSL recipes).
// Layer index ranges: H 0..63, S 64..127, D 128..191. `avg` is the recipe's average sRGB colour (shown until baked).
const H = [
  ['tex.brick_red', 2.4, 0x8a4a3a], ['tex.concrete_cast', 4, 0x9a9890], ['tex.asphalt', 6, 0x45474a], ['tex.cobble', 2, 0x6e655c],
  ['tex.wood_planks', 2, 0x7a5e40], ['tex.wood_weathered_dark', 2, 0x4a3e34], ['tex.grass_ground', 4, 0x5f7a40], ['tex.forest_floor', 4, 0x4a4430],
  ['tex.sand_pale', 4, 0xe2d2ae], ['tex.rock_granite', 4, 0x86847c],
];
const S = [
  ['tex.brick_brown', 2.4, 0x6a4232], ['tex.brick_painted_white', 2.4, 0xd8d4cc], ['tex.concrete_panel', 3, 0xbdbab2], ['tex.stucco', 3, 0xd8ccb4],
  ['tex.asphalt_worn', 6, 0x55565a], ['tex.paver', 2, 0x9a8f80], ['tex.glass_curtain', 3.6, 0x34465a], ['tex.metal_painted', 2, 0xc8c8c8],
  ['tex.metal_galvanized', 2, 0x9a9ea2], ['tex.metal_corrugated', 2, 0xa0a4a6], ['tex.rust', 2, 0x7a4a2a], ['tex.paint_chipped', 2, 0xcfcfcf],
  ['tex.planks_wall', 2.4, 0x9a7650], ['tex.log_round', 1, 0x8a6440], ['tex.wood_painted', 2, 0xd0d0cc], ['tex.bark_pine', 1, 0x5a4434],
  ['tex.bark_oak', 1, 0x4e4438], ['tex.dirt_track', 4, 0x7d6a50], ['tex.mud', 4, 0x4e4234], ['tex.gravel', 3, 0x8e887c],
  ['tex.rock_dark', 4, 0x3e3c3a], ['tex.stone_fieldstone', 2, 0x7a746a], ['tex.roof_shingle', 2, 0x4a4442], ['tex.roof_metal_red', 2, 0x9a3e2c],
  ['tex.roof_tile', 2, 0xa85a3a], ['tex.water_normal_a', 8, 0x8080ff], ['tex.water_normal_b', 23, 0x8080ff], ['tex.cloud_noise', 1, 0x808080],
];
const D = [
  ['tex.curb_stone', 1, 0x9a9890], ['tex.glass_window', 1, 0x3a4652], ['tex.metal_checker', 0.5, 0x8a8c8e], ['tex.metal_aluminium', 1, 0xb8bcc0],
  ['tex.bark_palm', 1, 0x8a7458], ['tex.moss', 2, 0x5a7a30], ['tex.sand_lake', 4, 0x9a8a6a], ['tex.fabric_canvas', 1, 0xe8e4da],
  ['tex.fabric_cloth', 0.5, 0xd8d8d8], ['tex.rubber_tire', 0.5, 0x1c1c1e], ['tex.carpaint_flake', 0.5, 0xd0d0d0], ['tex.leather', 0.5, 0x4a3426],
  ['tex.plastic', 0.5, 0xd0d0d0], ['tex.tile_floor', 1, 0xd8d4cc], ['tex.plaster_interior', 3, 0xe0dcd2], ['tex.snow_rock', 8, 0xd8dade],
  ['tex.foam', 4, 0xe8eef0], ['tex.caustics', 3, 0x202020], ['tex.noise_shared', 1, 0x808080], ['tex.flat', 1, 0xcccccc],
];
export const TIERS = { H: 0, S: 64, D: 128 };
/** id -> { index, tier, slot, tile, avg } */
export const LAYERS = {};
export const LAYER_LIST = [];
for (const [tier, list] of [['H', H], ['S', S], ['D', D]]) {
  list.forEach(([id, tile, avg], slot) => { const e = { id, index: TIERS[tier] + slot, tier, slot, tile, avg }; LAYERS[id] = e; LAYER_LIST.push(e); });
}
export const TIER_COUNT = { H: H.length, S: S.length, D: D.length };
export function layerIndex(id) { const e = LAYERS[id]; if (!e) throw new Error('unknown texture layer ' + id); return e.index; }
/** terrain splat slots (8 fixed layers, two vec4 weight attributes) */
export const TERRAIN_SLOTS = ['tex.grass_ground', 'tex.forest_floor', 'tex.rock_granite', 'tex.sand_pale', 'tex.dirt_track', 'tex.mud', 'tex.gravel', 'tex.snow_rock'];
