// Vehicle and boat parameter table (Annex D 10 ownership table + Annex A 7 handling stubs).
// topSpeed in m/s. dims = [width, height, length] metres. Stage 4 owns balance values.
export const VEHICLES = {
  'veh.moto_125': { class: 'motorcycle', topSpeed: 24, seats: 1, dims: [0.8, 1.2, 2.0], accel: 6, wheelbase: 1.3 },
  'veh.moto_cafe': { class: 'motorcycle', topSpeed: 42, seats: 1, dims: [0.8, 1.2, 2.1], accel: 9, wheelbase: 1.4 },
  'veh.hatch_used': { class: 'car', topSpeed: 34, seats: 4, dims: [1.75, 1.45, 3.9], accel: 4.5, wheelbase: 2.5 },
  'veh.sedan': { class: 'car', topSpeed: 44, seats: 4, dims: [1.85, 1.45, 4.6], accel: 5.5, wheelbase: 2.8 },
  'veh.pickup': { class: 'car', topSpeed: 40, seats: 2, dims: [1.95, 1.8, 5.3], accel: 4.8, wheelbase: 3.2 },
  'veh.coupe': { class: 'car', topSpeed: 58, seats: 2, dims: [1.85, 1.3, 4.4], accel: 8, wheelbase: 2.7 },
  'veh.van': { class: 'van', topSpeed: 36, seats: 2, dims: [2.0, 2.2, 5.2], accel: 4, wheelbase: 3.3 },
  'veh.boxtruck': { class: 'truck', topSpeed: 30, seats: 2, dims: [2.4, 3.2, 7.0], accel: 3, wheelbase: 4.2 },
  'veh.logtruck': { class: 'truck', topSpeed: 26, seats: 2, dims: [2.5, 3.4, 9.0], accel: 2.6, wheelbase: 5.2 },
  'boat.rowboat': { class: 'boat', topSpeed: 5, seats: 2, dims: [1.4, 0.8, 3.6], accel: 1.5 },
  'boat.skiff': { class: 'boat', topSpeed: 14, seats: 3, dims: [1.8, 1.0, 4.8], accel: 3 },
  'boat.console': { class: 'boat', topSpeed: 22, seats: 5, dims: [2.6, 2.2, 7.0], accel: 4 },
  'boat.trawler': { class: 'boat', topSpeed: 6, seats: 4, dims: [5.5, 8.0, 18.0], accel: 0.8 },
  'boat.workboat': { class: 'boat', topSpeed: 6, seats: 3, dims: [5.0, 5.0, 16.0], accel: 0.8 },
  'boat.ferry': { class: 'boat', topSpeed: 10, seats: 2, dims: [3.6, 3.5, 12.0], accel: 1.4 },
};
export const START_VEHICLE = 'veh.sedan';
export const START_BOAT = 'boat.skiff';

// Ownership economy (Annex D 10). Prices in cents; `used` = used price (null = not sold used); tank litres; use L/km; cargo kg.
const V = (price, used, tank, use, cargo, seats, licence = null, extra = {}) => ({ price, used, tank, use, cargo, seats, licence, ...extra });
export const VEHICLE_ECON = {
  'veh.moto_125': V(140000, 65000, 8, 0.03, 20, 1), 'veh.moto_cafe': V(520000, null, 13, 0.045, 10, 1),
  'veh.hatch_used': V(null, 180000, 40, 0.07, 150, 4), 'veh.sedan': V(950000, 520000, 55, 0.08, 200, 4),
  'veh.pickup': V(1400000, 800000, 70, 0.11, 600, 2), 'veh.coupe': V(3200000, null, 60, 0.10, 80, 2),
  'veh.van': V(1250000, 650000, 70, 0.11, 800, 2), 'veh.boxtruck': V(2800000, 1500000, 120, 0.20, 3000, 2, 'lic.driver_commercial'),
  'veh.logtruck': V(4600000, 2400000, 200, 0.32, 14000, 2, 'lic.driver_commercial'),
  'boat.rowboat': V(40000, null, 5, 0.10, 150, 2, null, { outboard: 50000 }), 'boat.skiff': V(380000, 220000, 25, 0.25, 300, 3),
  'boat.console': V(1800000, null, 150, 0.60, 600, 5), 'boat.trawler': V(8500000, 5200000, 1200, 2.5, 800, 4, 'lic.boat'),
  'boat.workboat': V(16000000, null, 2000, 3.5, 10000, 3, 'lic.boat'), 'boat.ferry': V(6000000, null, 400, 1.2, 12, 2, 'lic.boat'),
};
/** Dealers (veh.buy): poi -> {models, usedOnly}. */
export const DEALERS = {
  'poi.city.dealer': { models: ['veh.moto_cafe', 'veh.sedan', 'veh.pickup', 'veh.coupe', 'veh.van', 'veh.boxtruck', 'veh.logtruck', 'veh.moto_125'], used: false },
  'poi.city.usedcars': { models: ['veh.moto_125', 'veh.hatch_used', 'veh.sedan', 'veh.pickup', 'veh.van', 'veh.boxtruck', 'veh.logtruck'], used: true },
  'poi.ocean.marine_dealer': { models: ['boat.rowboat', 'boat.skiff', 'boat.console', 'boat.trawler', 'boat.workboat', 'boat.ferry'], used: false, usedOk: true },
};
export const PAINTS = 8;
