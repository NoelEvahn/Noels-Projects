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
