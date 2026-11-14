// Archetype registry (MASTER_SPEC 5.5, Annex A 6-9): placeable object definitions with colliders, anchors and LOD distances.
// One entry for every archetype id named in Annex A sections 6-9. Placement data never changes between blockout and detailed builders.
import { SCALE } from '../data/ids.js';

/** @type {Record<string, any>} */
export const ARCHETYPES = {};

function add(id, category, size, o = {}) {
  const [w, h, d] = size;
  const colliders = o.colliders !== undefined ? o.colliders
    : o.noCollide ? []
      : [{ shape: o.round ? 'cyl' : 'box', pos: [0, h / 2, 0], half: [w / 2, h / 2, d / 2], radius: Math.max(w, d) / 2, height: h, rotY: 0, yMin: 0, yMax: h, walkable: false }];
  ARCHETYPES[id] = {
    id, category, size, colliders,
    anchors: o.anchors || [],
    lod: o.lod || (category === 'building' ? [120, 400, 1200] : category === 'prop' ? [40, 90, 160] : [60, 160, 400]),
    paramSchema: o.paramSchema,
    storey: o.storey, floors: o.floors, overWater: !!o.overWater, round: !!o.round, color: o.color, tags: o.tags || [],
    category2: o.category2,
  };
}

// ---- buildings (Annex A 6.2) -----------------------------------------------------------------------------------
// [id, default footprint [w,d], floors [min,max], storey height, blockout colour, flags]
const BUILDINGS = [
  ['bld.brick_loft', [30, 24], [4, 7], 4.2, 0x8a4a3a], ['bld.brick_walkup', [24, 18], [3, 5], 3.2, 0x7d4a3c],
  ['bld.mixed_use', [30, 22], [3, 6], 3.6, 0xa8957f], ['bld.panel_midrise', [36, 22], [6, 10], 3.2, 0xc9c6bd],
  ['bld.office_midrise', [40, 28], [6, 12], 3.8, 0x8d98a3], ['bld.glass_tower', [42, 42], [18, 45], 3.8, 0x2a3a52],
  ['bld.podium_mall', [60, 40], [3, 5], 4.5, 0x35455c], ['bld.house_suburban', [14, 11], [1, 2], 3.2, 0xcdb99a],
  ['bld.apartment_block', [50, 22], [4, 8], 3.2, 0xb08f78], ['bld.warehouse', [50, 30], [1, 1], 9, 0x8a8f94],
  ['bld.factory', [50, 34], [2, 2], 6, 0x7a4f44], ['bld.gas_station', [30, 22], [1, 1], 5, 0xc9c3b0],
  ['bld.supermarket', [70, 45], [1, 1], 8, 0xb9b8ae], ['bld.diner', [26, 20], [2, 2], 4.5, 0x9a4a40],
  ['bld.garage_workshop', [34, 24], [1, 1], 6, 0x6f767d], ['bld.bank', [44, 34], [3, 3], 4.5, 0xbab3a2],
  ['bld.bus_station', [70, 36], [1, 1], 7, 0x6d7a86], ['bld.parking_deck', [60, 36], [3, 4], 3, 0x9a9a96],
  ['bld.construction_site', [50, 40], [1, 1], 12, 0x8b8b7a], ['bld.cabin_log', [9, 7], [1, 1], 3.2, 0x7a5a3a],
  ['bld.cabin_plank', [8, 6], [1, 1], 3.2, 0xa8452f], ['bld.fishing_hut', [6, 5], [1, 1], 3.2, 0x6a5240, 'overWater'],
  ['bld.boathouse', [14, 10], [1, 1], 5, 0x4a3a2c, 'overWater'], ['bld.lodge_restaurant', [24, 14], [1, 2], 3.6, 0x6a4a30],
  ['bld.general_store', [12, 9], [1, 1], 4.2, 0x8a6a48], ['bld.market_stall', [6, 4], [1, 1], 3, 0xc9a24a],
  ['bld.harbor_shed', [14, 9], [1, 2], 3.4, 0x5a6a72], ['bld.port_town_house', [10, 9], [2, 3], 3.2, 0xe0d2b6],
  ['bld.lighthouse', [8, 8], [1, 1], 28, 0xe8e4da, 'overWater', 'round'], ['bld.beach_bar', [10, 8], [1, 1], 3.4, 0xb89a60],
  ['bld.container_terminal', [80, 60], [1, 1], 10, 0x4a6a8a], ['bld.sawmill', [30, 18], [1, 1], 9, 0x7a5a3a],
  ['bld.shed_corrugated', [16, 10], [1, 1], 5, 0x7a8a82], ['bld.ranger_station', [14, 9], [1, 1], 3.4, 0x6a4a30],
  ['bld.fire_tower', [6, 6], [1, 1], 26, 0x6a5a48], ['bld.player_built', [10, 10], [1, 1], 3.2, 0xc4b8a0],
  // ids not named in Annex A (logged in docs/DECISIONS.md): showroom and market hall for dealers and the wholesale market
  ['bld.showroom', [50, 30], [1, 1], 6, 0xa7b4bd], ['bld.market_hall', [60, 36], [1, 1], 9, 0x9a8a72],
];
export const BUILDING_IDS = [];
for (const [id, fp, fl, st, color, ...flags] of BUILDINGS) {
  const overWater = flags.includes('overWater'), round = flags.includes('round');
  const h = st * (fl[0] + fl[1]) / 2;
  add(id, 'building', [fp[0], h, fp[1]], {
    floors: fl, storey: st, color, overWater, round,
    anchors: [{ kind: 'door', pos: [0, 0, -fp[1] / 2], size: [1.2, SCALE.doorHeight], rotY: 0 }],
    paramSchema: { floors: fl, w: fp[0], d: fp[1] },
  });
  BUILDING_IDS.push(id);
}

// ---- infrastructure (Annex A 6.2) -------------------------------------------------------------------------------
// colliders are generated per placement by world/layout/infra.js (world-space), so the archetype default is empty.
export const INFRA_IDS = ['infra.bridge_suspension', 'infra.bridge_girder', 'infra.bridge_small', 'infra.footbridge_steel', 'infra.footbridge_wood',
  'infra.quay_wall', 'infra.breakwater', 'infra.pier_timber', 'infra.dock_floating', 'infra.tunnel_portal', 'infra.retaining_wall', 'infra.weir'];
for (const id of INFRA_IDS) add(id, 'piece', [10, 4, 10], { colliders: [], lod: [200, 600, 2400], category2: 'infra' });

// ---- interiors (Annex A 6.4); not drawn in Stage 2 ---------------------------------------------------------------
export const INTERIOR_IDS = ['int.diner', 'int.hostel_room', 'int.bank_lobby', 'int.supermarket', 'int.warehouse', 'int.garage', 'int.cafe', 'int.shop_small',
  'int.boathouse', 'int.cabin_log', 'int.apartment_s', 'int.apartment_m', 'int.apartment_l', 'int.office_floor', 'int.lodge_restaurant', 'int.sawmill', 'int.wheelhouse'];
for (const id of INTERIOR_IDS) add(id, 'interior', [10, 3, 8], { colliders: [], lod: [40, 80, 80] });

// ---- props (Annex A 6.5) ------------------------------------------------------------------------------------------
const PROP_SIZES = {
  streetlamp_a: [0.3, 6, 0.3], streetlamp_b: [0.3, 5, 0.3], traffic_light: [0.4, 5.5, 0.4], utility_pole: [0.35, 9, 0.35], bike_dock: [1.2, 1.1, 5],
  map_kiosk: [0.8, 2.2, 0.4], bench: [1.8, 0.9, 0.6], bin: [0.5, 0.9, 0.5], hydrant: [0.35, 0.8, 0.35], mailbox: [0.5, 1.2, 0.5], bollard: [0.2, 0.9, 0.2],
  planter: [1.2, 0.9, 1.2], parasol: [2.2, 2.4, 2.2], cafe_table_set: [1.6, 1, 1.6], newsstand: [1.5, 2.4, 1.2], bus_shelter: [3.5, 2.6, 1.4],
  water_tower: [4, 5, 4], dumpster: [2, 1.4, 1.2], pallet: [1.2, 0.15, 1], crate_wood: [0.8, 0.8, 0.8], barrel: [0.6, 0.9, 0.6], container: [2.4, 2.6, 6.1],
  vending_machine: [0.9, 1.9, 0.8], atm: [0.7, 1.9, 0.6], gas_pump: [0.8, 1.6, 0.5], tent: [3, 1.8, 3.5], picnic_table: [1.8, 0.8, 1.6], campfire: [1, 0.4, 1],
  kayak: [0.7, 0.4, 3.4], dock_section: [3, 0.3, 6], pile: [0.3, 3, 0.3], footbridge_wood: [3, 2, 10], log_pile: [4, 1.8, 6], stump: [0.8, 0.6, 0.8],
  workbench: [2, 1, 0.8], harbor_crane_small: [3, 8, 3], sun_lounger: [0.7, 0.4, 2], beach_umbrella: [2.2, 2.2, 2.2], lifeguard_tower: [2, 3.5, 2],
  channel_marker: [1, 4, 1], forklift_static: [1.3, 2.2, 2.8], scaffold: [2.5, 8, 1.5], fire_escape: [1.2, 3.2, 3], hunting_stand: [1.5, 4, 1.5], fallen_tree: [1, 1, 8],
};
const PROP_NOCOLLIDE = ['awning', 'manhole', 'fence_chainlink', 'net_drying', 'reeds', 'sign_shop', 'sign_street', 'sign_wood', 'trail_sign', 'billboard', 'roof_vent', 'antenna',
  'ac_unit', 'roof_vent', 'hook_chain', 'rope_coil', 'oar', 'life_ring', 'lantern', 'net_pile', 'buoy_small', 'buoy_red', 'driftwood', 'ice_bin', 'fish_crate', 'parking_meter', 'traffic_cone'];
const PROP_NAMES = ['ac_unit', 'antenna', 'anvil', 'atm', 'awning', 'barrel', 'barrier', 'beach_umbrella', 'bench', 'bike_dock', 'billboard', 'bin', 'bollard', 'bollard_mooring',
  'buoy_red', 'buoy_small', 'bus_shelter', 'cafe_table_set', 'campfire', 'channel_marker', 'container', 'crab_pot', 'crate_wood', 'dock_section', 'driftwood', 'dumpster', 'fallen_tree',
  'fence_chainlink', 'fire_escape', 'fish_crate', 'fish_rack', 'footbridge_wood', 'forklift_static', 'fuel_drum', 'gangway', 'gas_pump', 'gate_barrier', 'harbor_crane_small', 'hook_chain',
  'hunting_stand', 'hydrant', 'ice_bin', 'kayak', 'lantern', 'life_ring', 'lifeguard_tower', 'log_pile', 'log_single', 'mailbox', 'manhole', 'map_kiosk', 'net_drying', 'net_pile', 'newsstand',
  'oar', 'outboard', 'pallet', 'parasol', 'parking_meter', 'picnic_table', 'pile', 'pile_rope', 'planter', 'railing', 'reeds', 'roof_vent', 'rope_coil', 'sawhorse', 'scaffold', 'sign_shop',
  'sign_street', 'sign_wood', 'streetlamp_a', 'streetlamp_b', 'stump', 'sun_lounger', 'tent', 'traffic_cone', 'traffic_light', 'trail_sign', 'utility_pole', 'vending_machine', 'water_tower', 'workbench'];
for (const rock of ['granite', 'dark', 'mossy']) for (const sz of ['s', 'm', 'l']) PROP_NAMES.push(`rock_${rock}_${sz}`);
export const PROP_IDS = [];
for (const n of PROP_NAMES) {
  let size = PROP_SIZES[n] || [0.6, 0.8, 0.6];
  if (n.startsWith('rock_')) { const k = { s: 0.7, m: 1.6, l: 3.4 }[n.slice(-1)]; size = [k, k * 0.7, k]; }
  add('prop.' + n, 'prop', size, { noCollide: PROP_NOCOLLIDE.includes(n) });
  PROP_IDS.push('prop.' + n);
}

// ---- vehicles and boats (Annex A 7) -----------------------------------------------------------------------------------
const VEH = {
  'veh.hatch_used': [1.75, 1.45, 3.9], 'veh.sedan': [1.85, 1.45, 4.6], 'veh.taxi': [1.85, 1.6, 4.6], 'veh.police': [1.85, 1.5, 4.7], 'veh.pickup': [1.95, 1.8, 5.3],
  'veh.coupe': [1.85, 1.3, 4.4], 'veh.moto_125': [0.8, 1.2, 2.0], 'veh.moto_cafe': [0.8, 1.2, 2.1], 'veh.van': [2.0, 2.2, 5.2], 'veh.boxtruck': [2.4, 3.2, 7.0],
  'veh.logtruck': [2.5, 3.4, 9.0], 'veh.forklift': [1.2, 2.2, 2.6], 'veh.utv': [1.5, 1.9, 3.0],
};
export const VEHICLE_IDS = Object.keys(VEH);
for (const [id, s] of Object.entries(VEH)) add(id, 'vehicle', s, { lod: [25, 120, 250] });
const BOATS = {
  'boat.rowboat': [1.4, 0.8, 3.6], 'boat.skiff': [1.8, 1.0, 4.8], 'boat.console': [2.6, 2.2, 7], 'boat.trawler': [5.5, 8, 18], 'boat.workboat': [5, 5, 16],
  'boat.ferry': [3.6, 3.5, 12], 'boat.yacht': [4, 5, 14], 'boat.sailboat': [3, 12, 10], 'boat.cargo_ship': [22, 18, 120],
};
export const BOAT_IDS = Object.keys(BOATS);
for (const [id, s] of Object.entries(BOATS)) add(id, 'boat', s, { lod: [40, 160, 600] });

// ---- vegetation (Annex A 8) -----------------------------------------------------------------------------------------------
const VEG = {
  'veg.pine_a': [4, 16, 4], 'veg.pine_b': [4, 20, 4], 'veg.spruce_a': [4.5, 22, 4.5], 'veg.oak_a': [8, 11, 8], 'veg.maple_a': [7, 10, 7], 'veg.street_tree': [5, 8, 5],
  'veg.palm_a': [4, 9, 4], 'veg.palm_b': [4, 11, 4], 'veg.bush_a': [1.6, 1.2, 1.6], 'veg.bush_b': [1.4, 1.0, 1.4], 'veg.hedge': [3, 1.2, 0.8], 'veg.fern': [1, 0.7, 1],
  'veg.grass_tuft': [0.6, 0.5, 0.6], 'veg.reeds': [1, 1.6, 1], 'veg.groundcover': [1, 0.3, 1], 'veg.flowers': [0.6, 0.4, 0.6], 'veg.ivy': [1, 3, 0.1],
};
export const VEG_IDS = Object.keys(VEG);
for (const [id, s] of Object.entries(VEG)) add(id, 'vegetation', s, { colliders: [], lod: [80, 250, 900] });
// ---- characters, animals (Annex A 9) -----------------------------------------------------------------------------------------
add('chr.player', 'character', [SCALE.capsuleRadius * 2, SCALE.capsuleHeight, SCALE.capsuleRadius * 2], { colliders: [{ shape: 'cyl', pos: [0, SCALE.capsuleHeight / 2, 0], radius: SCALE.capsuleRadius, height: SCALE.capsuleHeight, yMin: 0, yMax: SCALE.capsuleHeight, walkable: false }], lod: [20, 60, 120] });
add('chr.ped', 'character', [0.6, 1.75, 0.6], { lod: [20, 60, 120] });
add('chr.worker', 'character', [0.6, 1.8, 0.6], { lod: [20, 60, 120] });
for (const [id, s] of Object.entries({ 'ani.gull': [0.5, 0.3, 0.5], 'ani.crow': [0.4, 0.3, 0.4], 'ani.songbird': [0.2, 0.15, 0.2], 'ani.deer': [0.6, 1.3, 1.6], 'ani.rabbit': [0.2, 0.25, 0.4], 'ani.fish': [0.1, 0.1, 0.4], 'ani.butterfly': [0.1, 0.05, 0.1], 'ani.firefly': [0.02, 0.02, 0.02] })) {
  add(id, 'animal', s, { colliders: [], lod: [30, 80, 150] });
}

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);
export function archetype(id) { return ARCHETYPES[id]; }
