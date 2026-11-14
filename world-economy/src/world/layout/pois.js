// Points of interest (Annex B 6). Positions are binding to +-30 m of the annex; Stage 2 snapped a few (see DECISIONS.md) and this file
// is now the source of truth. Region/district are derived from the position. Ids are exact.
import { regionAt, districtAt } from './regions.js';

const PI = Math.PI;
// b: explicit building rect {a, cx, cz, w, d, floors, yaw, params}; auto: building placed beside the position by the lot placer
const B = (a, cx, cz, w, d, floors = 1, yaw = 0, params) => ({ a, cx, cz, w, d, floors, yaw, params });
const AUTO = (a, w, d, floors = 1, params) => ({ a, w, d, floors, params });

// [id, name, type(s), x, z, opts]
const RAW = [
  // ---- city ----------------------------------------------------------------------------------------------------------------
  ['poi.city.spawn', 'Harlan Central Bus Terminal, River St exit', 'transit', -147, 372, { yaw: 0, b: B('bld.bus_station', -90, 400, 80, 40, 1, 0), tags: ['spawn', 'hub'] }],
  ['poi.city.hostel', 'Bridgeview Hostel', 'lodging', -100, 339, { b: B('bld.brick_walkup', -100, 325, 26, 20, 4, PI), tags: ['int.hostel_room'] }],
  ['poi.city.diner', "Marlowe's Diner", 'job', 0, 368, { b: B('bld.diner', 12, 379, 26, 22, 2, 0), tags: ['job.city.restaurant', 'int.diner'] }],
  ['poi.city.jobcentre', 'WorkLink Job Centre', 'service', 90, 368, { b: B('bld.mixed_use', 90, 380, 28, 24, 4, 0), tags: ['board'] }],
  ['poi.city.bank', 'First Harlan Bank', 'bank', 330, 361, { b: B('bld.bank', 330, 386, 46, 36, 3, 0), tags: ['int.bank_lobby', 'atm'] }],
  ['poi.city.cityhall', 'City Hall', 'civic', 470, 400, { b: B('bld.bank', 470, 396, 56, 44, 3, 0, { variant: 'cityhall' }), tags: ['licences', 'tax'] }],
  ['poi.city.realty', 'Harlan Realty', 'service', 330, 200, { b: B('bld.office_midrise', 330, 200, 40, 30, 8, 0), tags: ['property'] }],
  ['poi.city.office', 'Northgate Financial Tower', 'job', 610, 300, { b: B('bld.glass_tower', 610, 300, 44, 44, 30, 0), tags: ['job.city.office', 'int.office_floor'] }],
  ['poi.city.construction', 'Harlan Yards site', 'job', 470, 200, { b: B('bld.construction_site', 470, 200, 56, 46, 1, 0), tags: ['job.city.construction'] }],
  ['poi.city.footbridge', 'Central Ave footbridge', 'landmark', 400, 200, { tags: ['infra.footbridge_steel'] }],
  ['poi.city.park', 'Founders Park', 'landmark', 750, 350, { tags: ['park', 'vending'], clear: 60 }],
  ['poi.city.police', '3rd Precinct', 'civic', 190, 100, { b: B('bld.mixed_use', 190, 100, 40, 30, 3, 0, { variant: 'police' }) }],
  ['poi.city.supermarket', 'FreshWay', ['job', 'shop'], 750, 600, { b: B('bld.supermarket', 750, 600, 80, 50, 1, 0), tags: ['job.city.supermarket', 'int.supermarket'] }],
  ['poi.city.furniture', 'Loft & Home', 'shop', 610, 600, { b: B('bld.mixed_use', 610, 600, 50, 36, 4, 0), tags: ['furniture'] }],
  ['poi.city.dealer', 'Harlan Motors', 'dealer', 890, 400, { b: B('bld.showroom', 890, 395, 60, 36, 1, 0), tags: ['vehicles'] }],
  ['poi.city.usedcars', 'Budget Wheels', 'dealer', -90, 700, { b: B('bld.showroom', -90, 700, 60, 36, 1, 0, { variant: 'used' }), tags: ['vehicles.used'] }],
  ['poi.city.mechanic', 'Torque & Sons', ['job', 'service'], 50, 700, { b: B('bld.garage_workshop', 50, 700, 40, 30, 1, 0), tags: ['job.city.mechanic', 'int.garage'] }],
  ['poi.city.taxi', 'Metro Cab depot', 'job', 50, 600, { b: B('bld.warehouse', 50, 600, 44, 32, 1, 0, { variant: 'taxi' }), tags: ['job.city.taxi'] }],
  ['poi.city.gas', 'Harlan Fuel', 'fuel', 140, 670, { b: B('bld.gas_station', 155, 692, 36, 26, 1, 0), tags: ['fuel'] }],
  ['poi.city.depot', 'Swift Parcel depot', 'job', 470, 800, { b: B('bld.warehouse', 470, 800, 72, 42, 1, 0), tags: ['job.city.delivery', 'hub'] }],
  ['poi.city.hardware', 'BuildRight', 'shop', 610, 800, { b: B('bld.warehouse', 610, 800, 60, 40, 1, 0, { variant: 'hardware' }), tags: ['tools'] }],
  ['poi.city.warehouse', 'Calder Logistics', 'job', 890, 800, { b: B('bld.warehouse', 890, 800, 72, 42, 1, 0), tags: ['job.city.warehouse', 'int.warehouse'] }],
  ['poi.city.wholesale', 'Harlan Wholesale Market', 'market', 330, 900, { b: B('bld.market_hall', 326, 900, 72, 40, 1, 0), tags: ['mkt.city.wholesale'] }],
  ['poi.city.quay', 'City Quay public slip', 'dock', 330, 1095, { tags: ['dock', 'infra.quay_wall'], dock: { x: 330, z: 1112 } }],
  ['poi.city.riverdock', 'Riverside dock', 'dock', -285, 600, { tags: ['dock', 'infra.dock_floating'], water: true, dock: { x: -296, z: 600 } }],
  ['poi.city.apartments', 'Northgate Apartments', 'landmark', 330, -200, { b: B('bld.apartment_block', 330, -200, 60, 36, 8, 0), tags: ['purchasable'] }],
  ['poi.city.lofts', 'Riverside Lofts', 'landmark', -225, 200, { b: B('bld.brick_loft', -225, 200, 50, 30, 6, PI / 2), tags: ['purchasable'] }],
  ['poi.city.northgate_exit', 'North Road junction', 'transit', 540, -350, { tags: ['hub'] }],
  ['poi.city.east_tunnel', 'East Highway tunnel', 'transit', 1900, 350, { tags: ['infra.tunnel_portal'], noAccess: true }],
  // ---- lake ----------------------------------------------------------------------------------------------------------------
  ['poi.lake.pinehaven', 'Pinehaven village square', 'transit', -700, -1080, { tags: ['hub'] }],
  ['poi.lake.store', 'Pinehaven General Store and Fish Counter', ['market', 'shop'], -700, -1050, { auto: AUTO('bld.general_store', 14, 10, 1), tags: ['mkt.lake.fish'] }],
  ['poi.lake.fishhut', 'Pinehaven Bait & Tackle', ['job', 'shop'], -775, -1120, { b: B('bld.fishing_hut', -775, -1120, 6, 5, 1, PI / 2), tags: ['job.lake.fishhut', 'int.shop_small'], water: true }],
  ['poi.lake.boathire', 'Mirror Lake Boat Hire', 'job', -780, -1040, { tags: ['job.lake.boatrental', 'dock', 'infra.pier_timber'], water: true, dock: { x: -790, z: -1040 } }],
  ['poi.lake.grill', 'The Lakeside Grill', 'job', -765, -980, { auto: AUTO('bld.lodge_restaurant', 24, 14, 1), tags: ['job.lake.restaurant', 'int.lodge_restaurant'] }],
  ['poi.lake.gas', 'Pinehaven Fuel (road and boat fuel)', 'fuel', -660, -1010, { auto: AUTO('bld.gas_station', 22, 16, 1), tags: ['fuel'] }],
  ['poi.lake.boathouse', 'Old Boathouse', ['landmark', 'dock'], -900, -800, { b: B('bld.boathouse', -900, -805, 14, 10, 1, PI), tags: ['dock', 'int.boathouse', 'purchasable'], water: true, dock: { x: -905, z: -825 } }],
  ['poi.lake.campground', 'North Shore Campground', 'camp', -1200, -1440, { tags: ['camp', 'vending', 'dock'], dock: { x: -1200, z: -1415 }, clear: 26 }],
  ['poi.lake.redcabin', 'Red Roof Cabin and footbridge', 'landmark', -1640, -1150, { auto: AUTO('bld.cabin_plank', 8, 6, 1), tags: ['infra.footbridge_wood'] }],
  ['poi.lake.weir', 'Mirror Lake weir', 'landmark', -860, -830, { tags: ['infra.weir'], noAccess: true }],
  ['poi.lake.fish.dock', 'Village dock', 'fishspot', -790, -1070, { tags: ['fishspot', 'dock'], water: true, dock: { x: -800, z: -1070 } }],
  ['poi.lake.fish.rocks', 'Rocky Point', 'fishspot', -1250, -785, { tags: ['fishspot'] }],
  ['poi.lake.fish.reeds', 'Reed Bay', 'fishspot', -1480, -1340, { tags: ['fishspot', 'boatonly'], water: true }],
  ['poi.lake.fish.inlet', 'Inlet footbridge', 'fishspot', -1630, -1150, { tags: ['fishspot'] }],
  ['poi.lake.fish.deep', 'Lake centre (boat only)', 'fishspot', -1200, -1100, { tags: ['fishspot', 'boatonly'], water: true }],
  ['poi.lake.fish.heron', 'Heron Pond', 'fishspot', -420, -1300, { tags: ['fishspot', 'boatonly'], water: true }],
  ['poi.lake.cabin.1', 'Shore cabin 1', 'landmark', -1000, -1420, { auto: AUTO('bld.cabin_log', 9, 7, 1), tags: ['purchasable'] }],
  ['poi.lake.cabin.2', 'Shore cabin 2', 'landmark', -1400, -1400, { auto: AUTO('bld.cabin_log', 9, 7, 1), tags: ['purchasable'] }],
  ['poi.lake.cabin.3', 'Shore cabin 3', 'landmark', -1700, -1000, { auto: AUTO('bld.cabin_plank', 8, 6, 1), tags: ['purchasable'] }],
  ['poi.lake.cabin.4', 'Shore cabin 4', 'landmark', -1450, -770, { auto: AUTO('bld.cabin_plank', 8, 6, 1), tags: ['purchasable'] }],
  ['poi.lake.lots', 'Lakeview Lots', 'landmark', -640, -1160, { tags: ['plots'], plots: [['plot_1', -648, -1176], ['plot_2', -620, -1176], ['plot_3', -648, -1148], ['plot_4', -620, -1148]], plotSize: [24, 24], clear: 30 }],
  // ---- ocean ---------------------------------------------------------------------------------------------------------------
  ['poi.ocean.portcalder', 'Port Calder harbour square', 'transit', -900, 1040, { tags: ['hub'] }],
  ['poi.ocean.harbor', 'Fishing harbour, trawler berths', ['job', 'dock'], -880, 1150, { tags: ['job.ocean.fisherman', 'dock'], water: true, dock: { x: -880, z: 1175 } }],
  ['poi.ocean.seafood', 'Calder Seafood Market', 'market', -1040, 1125, { tags: ['mkt.ocean.seafood'], stalls: [-1064, -1054, -1044, -1034, -1024, -1014] }],
  ['poi.ocean.terminal', 'Calder Terminal', 'job', -640, 1100, { auto: AUTO('bld.container_terminal', 70, 50, 1), tags: ['job.ocean.port'] }],
  ['poi.ocean.boatyard', 'Calder Boatyard', 'service', -760, 1160, { b: B('bld.harbor_shed', -760, 1129, 16, 10, 1, PI), tags: ['boatyard'], water: true }],
  ['poi.ocean.fueldock', 'Harbour fuel dock', 'fuel', -980, 1165, { tags: ['fuel', 'dock'], water: true, dock: { x: -980, z: 1175 } }],
  ['poi.ocean.marina', 'Calder Marina', 'dock', -1240, 1150, { tags: ['dock', 'berths'], water: true, dock: { x: -1240, z: 1170 } }],
  ['poi.ocean.marine_dealer', 'Calder Marine', 'dealer', -1200, 1090, { auto: AUTO('bld.showroom', 30, 20, 1, { variant: 'marine' }), tags: ['boats'] }],
  ['poi.ocean.ferry', 'Water-taxi pier', ['job', 'dock'], -1160, 1150, { tags: ['job.ocean.boatop', 'dock'], water: true, dock: { x: -1160, z: 1170 } }],
  ['poi.ocean.lighthouse', 'Calder Light', 'landmark', -1120, 1420, { b: B('bld.lighthouse', -1120, 1420, 8, 8, 1, 0), tags: ['infra.breakwater'], water: true, noAccess: true }],
  ['poi.ocean.seagrass', 'Seagrass Row', 'landmark', -1410, 1040, { tags: ['purchasable', 'houses'] }],
  ['poi.ocean.palmcove_parking', 'Palm Cove car park', 'transit', -1600, 1060, { tags: ['hub', 'parking'] }],
  ['poi.ocean.beach', 'Palm Cove beach', 'landmark', -1650, 1130, { tags: ['beach'], clear: 20 }],
  ['poi.ocean.beachbar', "Coco's Beach Bar", 'shop', -1700, 1090, { auto: AUTO('bld.beach_bar', 10, 8, 1), tags: ['food-site'] }],
  ['poi.ocean.pier', 'Palm Cove pier', ['dock', 'fishspot'], -1560, 1230, { tags: ['dock', 'fishspot', 'infra.pier_timber'], water: true, dock: { x: -1560, z: 1250 } }],
  ['poi.ocean.gullrock', 'Gull Rock', ['landmark', 'dock'], -1750, 1650, { tags: ['dock', 'island'], water: false, dock: { x: -1750, z: 1690 }, noAccess: true }],
  ['poi.ocean.grounds.a', 'Fishing grounds A', 'fishspot', -900, 1700, { tags: ['fishspot', 'trawl', 'boatonly'], water: true }],
  ['poi.ocean.grounds.b', 'Fishing grounds B', 'fishspot', -1500, 1780, { tags: ['fishspot', 'trawl', 'boatonly'], water: true }],
  ['poi.ocean.grounds.c', 'Fishing grounds C', 'fishspot', -300, 1800, { tags: ['fishspot', 'trawl', 'boatonly'], water: true }],
  ['poi.ocean.gas', 'Coast Fuel', 'fuel', -820, 1020, { auto: AUTO('bld.gas_station', 22, 16, 1), tags: ['fuel'] }],
  // ---- forest --------------------------------------------------------------------------------------------------------------
  ['poi.forest.gate', 'Timberline Ranger Station', 'job', 520, -620, { auto: AUTO('bld.ranger_station', 14, 9, 1), tags: ['job.forest.forestry', 'hub'] }],
  ['poi.forest.store', 'Gate Trading Post', 'shop', 480, -650, { auto: AUTO('bld.general_store', 12, 9, 1), tags: ['tools'] }],
  ['poi.forest.gas', 'Forest Fuel', 'fuel', 560, -600, { auto: AUTO('bld.gas_station', 22, 16, 1), tags: ['fuel'] }],
  ['poi.forest.sawmill', 'Sawmill Junction', ['market', 'service'], 700, -900, { auto: AUTO('bld.sawmill', 30, 18, 1), tags: ['mkt.forest.sawmill', 'int.sawmill'] }],
  ['poi.forest.timberline', 'Timberline Yard', 'job', 1150, -1300, { tags: ['job.forest.logger', 'hub', 'yard'], yard: true, clear: 40 }],
  ['poi.forest.stand.a', 'Logging stand A', 'resource', 1300, -1450, { tags: ['stand'], clear: 20 }],
  ['poi.forest.stand.b', 'Logging stand B', 'resource', 950, -1500, { tags: ['stand'], clear: 20 }],
  ['poi.forest.stand.c', 'Logging stand C', 'resource', 1450, -1100, { tags: ['stand'], clear: 20 }],
  ['poi.forest.firetower', 'High Ridge Fire Tower', 'landmark', 800, -1650, { auto: AUTO('bld.fire_tower', 6, 6, 1), tags: ['forestry'] }],
  ['poi.forest.camp.fern', 'Fern Hollow Campsite', 'camp', 350, -1050, { tags: ['camp'], clear: 24 }],
  ['poi.forest.camp.eagle', 'Eagle Ridge Campsite', 'camp', 1500, -1600, { tags: ['camp'], clear: 24 }],
  ['poi.forest.meadow', 'Elk Meadow', 'landmark', 900, -1150, { tags: ['wildlife'], clear: 70, noAccess: true }],
  ['poi.forest.cabin.1', 'Forest cabin 1', 'landmark', 250, -800, { auto: AUTO('bld.cabin_log', 9, 7, 1), tags: ['purchasable', 'int.cabin_log'] }],
  ['poi.forest.cabin.2', 'Forest cabin 2', 'landmark', 600, -1300, { auto: AUTO('bld.cabin_log', 9, 7, 1), tags: ['purchasable', 'int.cabin_log'] }],
  ['poi.forest.cabin.3', 'Forest cabin 3', 'landmark', 1300, -900, { auto: AUTO('bld.cabin_log', 9, 7, 1), tags: ['purchasable', 'int.cabin_log'] }],
  ['poi.forest.lots', 'Ridge Lots', 'landmark', 420, -760, { tags: ['plots'], plots: [['plot_8', 408, -772], ['plot_9', 442, -772], ['plot_10', 425, -738]], plotSize: [30, 30], clear: 40 }],
  ['poi.forest.plant.1', 'Replanting plot 1', 'resource', 1330, -1400, { tags: ['plant'], clear: 14 }],
  ['poi.forest.plant.2', 'Replanting plot 2', 'resource', 990, -1470, { tags: ['plant'], clear: 14 }],
  ['poi.forest.plant.3', 'Replanting plot 3', 'resource', 1420, -1140, { tags: ['plant'], clear: 14 }],
  ['poi.forest.plant.4', 'Replanting plot 4', 'resource', 1250, -1500, { tags: ['plant'], clear: 14 }],
];

export function buildPoiDefs() {
  return RAW.map(([id, name, type, x, z, o]) => {
    const types = Array.isArray(type) ? type : [type];
    const region = regionAt(x, z), district = districtAt(x, z);
    return {
      id, name, type: types[0], types, region, district, pos: [x, 0, z], rotY: o.yaw || 0, tags: o.tags ? o.tags.slice() : [],
      data: { building: o.b || null, auto: o.auto || null, water: !!o.water, noAccess: !!o.noAccess, dock: o.dock || null, clear: o.clear, plots: o.plots, plotSize: o.plotSize, yard: !!o.yard, stalls: o.stalls },
    };
  });
}
export const POI_COUNT_STATIC = RAW.length;
