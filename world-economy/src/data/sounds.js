// Sound inventory (Annex E 6). Record: { id, bus, kind:'oneshot'|'loop'|'engine'|'music', spatial, refDistance, maxDistance,
// priority (voice class: ui 5, player 4, vehicle-own 4, job 3, world 2, ambient one-shot 1), patch (registry key = id),
// prio:'P0'|'P1'|'P2', rms:[min,max], centroid:[minHz,maxHz], seconds, seamWin? }.
// rms: one-shots measured over their active part, loops over the whole render (Annex E 8 defaults: one-shot 0.03-0.35,
// loop 0.03-0.25). seconds: one-shot length budget (tail below -60 dB within seconds + 20 %) or loop render length.
// seamWin: loop seam window in seconds when the sound has a slow cycle (default 1 s, Annex E 8); 0 = intermittent emitter.
// Gameplay may call any id before its patch exists; the engine logs once and plays nothing (Annex E 6).

const ONE = [0.03, 0.35], LOOP = [0.03, 0.25];
const rows = [];
/** group helper: defaults then rows [id, prio, centroid, seconds, extra] */
function G(def, list) { for (const [id, prio, centroid, seconds, extra] of list) rows.push({ ...def, id, patch: id, prio, centroid: centroid || [80, 12000], seconds: seconds || (def.kind === 'oneshot' ? 1 : 8), rms: def.kind === 'oneshot' ? ONE : LOOP, ...(extra || {}) }); }

// ---- ambience beds (non-spatial loops) -------------------------------------------------------------------------------------
G({ bus: 'ambience', kind: 'loop', spatial: false, refDistance: 1, maxDistance: 1, priority: 1 }, [
  ['amb.city.traffic_hum', 'P0', [60, 500], 8], ['amb.city.crowd', 'P0', [250, 2200], 8], ['amb.city.hvac', 'P0', [60, 700], 8],
  ['amb.wind.open', 'P0', [200, 1300], 12, { seamWin: 4 }], ['amb.wind.trees', 'P0', [1800, 9000], 12, { seamWin: 4 }], ['amb.wind.pines', 'P0', [250, 1200], 16, { seamWin: 6 }],
  ['amb.water.lake_lap', 'P0', [150, 1500], 24, { seamWin: 8 }], ['amb.water.river', 'P0', [500, 3000], 8], ['amb.water.ocean_waves', 'P0', [150, 3000], 40, { seamWin: 12 }],
  ['amb.water.harbor', 'P0', [150, 1800], 16, { seamWin: 5 }], ['amb.rain.light', 'P0', [1500, 9000], 8], ['amb.rain.heavy', 'P0', [1200, 8000], 8],
  ['amb.night.crickets', 'P0', [3500, 5500], 8], ['amb.night.frogs', 'P0', [250, 2200], 24, { seamWin: 8 }], ['amb.forest.day', 'P0', [1000, 4500], 12, { rms: [0.008, 0.06], seamWin: 4 }],
  ['amb.interior.room', 'P0', [30, 400], 8, { rms: [0.002, 0.03] }], ['amb.interior.diner', 'P0', [200, 3500], 8], ['amb.interior.vehicle', 'P0', [40, 1500], 8],
  ['amb.boat.hull', 'P0', [150, 2200], 16, { seamWin: 4 }],
]);
// ---- ambience emitters (spatial loops) -------------------------------------------------------------------------------------
G({ bus: 'ambience', kind: 'loop', spatial: true, refDistance: 6, maxDistance: 80, priority: 2 }, [
  ['amb.emit.fountain', 'P0', [1200, 6500], 8], ['amb.emit.neon_buzz', 'P0', [250, 3000], 8, { refDistance: 2, maxDistance: 25 }], ['amb.emit.generator', 'P0', [80, 1500], 8],
  ['amb.emit.rigging', 'P0', [600, 5000], 16, { seamWin: 5 }], ['amb.emit.flag', 'P0', [250, 2500], 12, { seamWin: 4 }], ['amb.emit.campfire', 'P0', [150, 3500], 8, { refDistance: 3, maxDistance: 40 }],
  ['amb.emit.fireplace', 'P0', [120, 3000], 8, { refDistance: 3, maxDistance: 30 }], ['amb.emit.sawmill', 'P0', [400, 4000], 12, { refDistance: 15, maxDistance: 250, seamWin: 4 }], ['amb.emit.weir', 'P0', [500, 4500], 8, { refDistance: 15, maxDistance: 220 }],
  ['amb.emit.buoy_bell', 'P0', [300, 3000], 24, { refDistance: 20, maxDistance: 400, seamWin: 8 }], ['amb.emit.lighthouse_horn', 'P0', [80, 600], 34, { refDistance: 60, maxDistance: 2000, seamWin: 0 }], ['amb.emit.crane', 'P0', [250, 3000], 16, { refDistance: 15, maxDistance: 250, seamWin: 5 }],
  ['amb.emit.pa_station', 'P0', [300, 3000], 16, { refDistance: 10, maxDistance: 120, seamWin: 8 }], ['amb.emit.dock_creak', 'P0', [150, 2200], 16, { refDistance: 4, maxDistance: 40, seamWin: 6 }], ['amb.emit.power_hum', 'P0', [50, 400], 8, { refDistance: 2, maxDistance: 25 }],
]);
// ---- ambient one-shots (schedulers) ----------------------------------------------------------------------------------------
G({ bus: 'ambience', kind: 'oneshot', spatial: true, refDistance: 12, maxDistance: 500, priority: 1 }, [
  ['amb.once.bird_song_a', 'P0', [2000, 6500], 1.2], ['amb.once.bird_song_b', 'P0', [1800, 5500], 1.0], ['amb.once.bird_song_c', 'P0', [2000, 6500], 1.6],
  ['amb.once.gull', 'P0', [700, 3800], 2.6], ['amb.once.crow', 'P0', [600, 3200], 2.0], ['amb.once.loon', 'P0', [350, 1600], 4.5],
  ['amb.once.owl', 'P0', [200, 900], 2.6], ['amb.once.woodpecker', 'P0', [400, 3500], 1.2], ['amb.once.dog_bark', 'P0', [350, 2600], 1.0],
  ['amb.once.car_horn', 'P0', [350, 2500], 0.9], ['amb.once.siren', 'P0', [450, 2200], 3.4], ['amb.once.boat_horn', 'P0', [90, 800], 3.2, { maxDistance: 1500 }],
  ['amb.once.chainsaw_far', 'P0', [120, 1400], 3.4], ['amb.once.thunder', 'P0', [40, 800], 7, { maxDistance: 5000, refDistance: 200 }], ['amb.once.fish_jump', 'P0', [400, 4500], 0.6, { maxDistance: 80 }],
  ['amb.once.train_far', 'P0', [70, 900], 5.5, { maxDistance: 5000 }],
]);
// ---- music -----------------------------------------------------------------------------------------------------------------
G({ bus: 'music', kind: 'music', spatial: false, refDistance: 1, maxDistance: 1, priority: 5, rms: [0.03, 0.2] }, [
  ['mus.menu', 'P0', [150, 3500], 40], ['mus.city.day', 'P0', [150, 3500], 40], ['mus.city.night', 'P0', [100, 3000], 40], ['mus.lake.day', 'P0', [150, 3500], 40],
  ['mus.lake.night', 'P0', [150, 3500], 40], ['mus.ocean.day', 'P0', [150, 4000], 40], ['mus.ocean.night', 'P0', [150, 3500], 40], ['mus.forest.day', 'P0', [150, 3500], 40],
  ['mus.forest.night', 'P0', [80, 3000], 40], ['mus.layer.work', 'P0', [100, 5000], 40], ['mus.layer.drive', 'P0', [80, 5000], 40],
  ['mus.sting.levelup', 'P0', [300, 4500], 3, { kind: 'sting' }], ['mus.sting.business_open', 'P0', [250, 4000], 4, { kind: 'sting' }], ['mus.sting.purchase_big', 'P0', [200, 4000], 3, { kind: 'sting' }],
  ['mus.sting.newday', 'P0', [200, 4000], 4, { kind: 'sting' }], ['mus.sting.fail', 'P0', [100, 2500], 2.5, { kind: 'sting' }], ['mus.sting.milestone', 'P0', [250, 4500], 4, { kind: 'sting' }],
]);
for (const r of rows) if (r.kind === 'music' || r.kind === 'sting') r.rms = [0.03, 0.2];
// ---- engines -----------------------------------------------------------------------------------------------------------------
G({ bus: 'vehicles', kind: 'engine', spatial: true, refDistance: 5, maxDistance: 160, priority: 4 }, [
  ['eng.car_i4', 'P0', [60, 1500], 4], ['eng.van_diesel', 'P0', [60, 1500], 4], ['eng.outboard', 'P0', [80, 2500], 4],
  ['eng.moto_small', 'P1', [80, 3000], 4], ['eng.moto_twin', 'P1', [60, 2000], 4], ['eng.car_v6', 'P1', [50, 1600], 4],
  ['eng.truck_diesel', 'P1', [80, 700], 4, { maxDistance: 250 }], ['eng.forklift', 'P1', [60, 1500], 4], ['eng.boat_diesel', 'P1', [40, 800], 4, { maxDistance: 400 }],
  ['eng.chainsaw', 'P1', [200, 4500], 4, { maxDistance: 300 }],
]);
// ---- UI and money (non-spatial) ----------------------------------------------------------------------------------------------
G({ bus: 'ui', kind: 'oneshot', spatial: false, refDistance: 1, maxDistance: 1, priority: 5 }, [
  ['sfx.ui.click', 'P0', [1500, 6000], 0.08], ['sfx.ui.hover', 'P1', [1200, 4000], 0.08], ['sfx.ui.back', 'P0', [400, 3000], 0.25], ['sfx.ui.open', 'P0', [500, 3500], 0.25],
  ['sfx.ui.close', 'P0', [400, 3000], 0.25], ['sfx.ui.toggle_on', 'P1', [600, 4000], 0.25], ['sfx.ui.toggle_off', 'P1', [500, 3500], 0.25], ['sfx.ui.error', 'P0', [150, 1500], 0.4],
  ['sfx.ui.confirm', 'P0', [600, 4000], 0.8], ['sfx.ui.notify', 'P0', [600, 4500], 0.9], ['sfx.ui.phone_open', 'P1', [500, 5000], 0.4], ['sfx.ui.phone_close', 'P1', [500, 5000], 0.4],
  ['sfx.ui.type', 'P1', [1500, 7000], 0.06], ['sfx.ui.slider', 'P2'], ['sfx.ui.map_ping', 'P1', [600, 3500], 1.0],
  ['sfx.money.cash_register', 'P0', [400, 5000], 1.4], ['sfx.money.coins', 'P0', [1500, 8000], 0.9], ['sfx.money.pay', 'P0', [800, 3000], 0.4],
  ['sfx.money.income_tick', 'P1', [800, 5000], 0.5], ['sfx.money.big_purchase', 'P1', [150, 4000], 1.6], ['sfx.level_up', 'P0', [500, 5000], 1.6],
  ['sfx.job.task_ok', 'P0', [500, 4500], 0.8, { priority: 3 }], ['sfx.job.task_perfect', 'P0', [800, 7000], 1.2, { priority: 3 }], ['sfx.job.task_fail', 'P0', [100, 1500], 0.6, { priority: 3 }],
  ['sfx.job.shift_start', 'P1', [600, 3500], 1.0, { priority: 3 }], ['sfx.job.shift_end', 'P1', [200, 4000], 0.6, { priority: 3 }],
  ['sfx.build.place', 'P1', [200, 2500], 0.4, { priority: 3 }], ['sfx.build.remove', 'P1', [200, 2500], 0.4, { priority: 3 }], ['sfx.build.invalid', 'P1', [60, 800], 0.4, { priority: 3 }],
]);
// ---- player and foley ------------------------------------------------------------------------------------------------------
const STEP_P0 = ['asphalt', 'concrete', 'wood', 'grass', 'dirt'];
G({ bus: 'sfx', kind: 'oneshot', spatial: true, refDistance: 1, maxDistance: 30, priority: 4 }, [
  ...['asphalt', 'concrete', 'cobble', 'paver', 'tile', 'carpet'].map((s) => [`sfx.step.${s}`, STEP_P0.includes(s) ? 'P0' : 'P1', s === 'carpet' ? [150, 2500] : [300, 5000], 0.25]),
  ['sfx.step.wood', 'P0', [150, 2000], 0.35], ['sfx.step.metal', 'P1', [400, 6000], 0.5],
  ...['grass', 'forestfloor', 'dirt', 'gravel', 'sand', 'mud', 'snow'].map((s) => [`sfx.step.${s}`, STEP_P0.includes(s) ? 'P0' : 'P1', s === 'mud' ? [150, 2500] : s === 'gravel' ? [1000, 7000] : [300, 6000], 0.3]),
  ['sfx.step.water_shallow', 'P1', [300, 4500], 0.5],
  ['sfx.player.jump', 'P1', [300, 4000], 0.3], ['sfx.player.land_soft', 'P1', [80, 2000], 0.35], ['sfx.player.land_hard', 'P1', [60, 1500], 0.45],
  ['sfx.player.cloth', 'P2'], ['sfx.player.breath_tired', 'P2'], ['sfx.player.eat', 'P1', [500, 5000], 0.8], ['sfx.player.drink', 'P1', [200, 2000], 0.8], ['sfx.player.sleep', 'P1', [150, 2000], 2.5, { spatial: false }],
  ['sfx.item.pickup', 'P0', [200, 4000], 0.35], ['sfx.item.drop', 'P0', [80, 2500], 0.45], ['sfx.item.carry_set', 'P0', [80, 2500], 0.45],
  ['sfx.door.open', 'P0', [200, 3000], 1.0], ['sfx.door.close', 'P0', [100, 2500], 0.9], ['sfx.door.locked', 'P0', [400, 4500], 0.5],
  ['sfx.door.shop_bell', 'P1', [1500, 6000], 1.4], ['sfx.door.garage_roll', 'P2'], ['sfx.door.sliding', 'P2'], ['sfx.switch.light', 'P2'],
  ['sfx.npc.murmur_a', 'P1', [250, 2500], 0.9, { priority: 2 }], ['sfx.npc.murmur_b', 'P1', [250, 2500], 0.9, { priority: 2 }], ['sfx.npc.murmur_c', 'P1', [200, 2500], 0.9, { priority: 2 }],
  ['sfx.npc.whistle_hail', 'P1', [1500, 4000], 0.8, { priority: 2, maxDistance: 80 }],
]);
// ---- vehicles ----------------------------------------------------------------------------------------------------------------
G({ bus: 'vehicles', kind: 'oneshot', spatial: true, refDistance: 3, maxDistance: 80, priority: 4 }, [
  ['sfx.veh.start', 'P0', [80, 2500], 1.6], ['sfx.veh.stop', 'P0', [40, 1500], 1.0], ['sfx.veh.door_open', 'P0', [150, 3500], 0.5], ['sfx.veh.door_close', 'P0', [60, 2500], 0.5],
  ['sfx.veh.horn_car', 'P1', [350, 2500], 0.7, { maxDistance: 250 }], ['sfx.veh.horn_truck', 'P1', [150, 1500], 1.0, { maxDistance: 300 }], ['sfx.veh.horn_moto', 'P1', [500, 3000], 0.6, { maxDistance: 200 }],
  ['sfx.veh.suspension_thump', 'P0', [50, 1500], 0.5], ['sfx.veh.crash_light', 'P0', [200, 4000], 0.8], ['sfx.veh.crash_heavy', 'P0', [150, 5000], 1.8, { maxDistance: 200 }],
  ['sfx.veh.brake_squeal', 'P2'], ['sfx.veh.indicator', 'P1', [800, 5000], 0.1], ['sfx.veh.reverse_beep', 'P1', [900, 1300], 0.6], ['sfx.veh.handbrake', 'P1', [500, 5000], 0.5], ['sfx.veh.gear_shift', 'P1', [100, 3000], 0.25],
  ['sfx.veh.fuel_cap', 'P1', [400, 4000], 0.3], ['sfx.veh.fuel_done', 'P1', [100, 2500], 0.4], ['sfx.veh.air_brake', 'P1', [600, 6000], 1.2],
  ['sfx.veh.taxi_meter', 'P1', [1000, 5000], 0.15], ['sfx.veh.passenger_in', 'P1', [60, 2500], 0.6], ['sfx.veh.passenger_out', 'P1', [60, 2500], 0.6],
  ['sfx.veh.pallet_set', 'P1', [80, 1500], 0.5], ['sfx.veh.pallet_drop', 'P1', [80, 3000], 0.8], ['sfx.veh.crane_hook', 'P2'], ['sfx.veh.container_lock', 'P2'], ['sfx.veh.container_set', 'P2'],
  ['sfx.veh.loader_grapple', 'P1', [100, 2500], 1.2], ['sfx.veh.log_drop', 'P1', [50, 1200], 1.2], ['sfx.veh.log_roll', 'P1', [60, 1500], 1.2],
]);
G({ bus: 'vehicles', kind: 'loop', spatial: true, refDistance: 3, maxDistance: 80, priority: 4 }, [
  ['sfx.veh.tyre_roll', 'P0', [150, 3000], 6], ['sfx.veh.skid', 'P0', [500, 2500], 6], ['sfx.veh.wind', 'P0', [150, 3000], 6], ['sfx.veh.scrape', 'P2'],
  ['sfx.veh.fuel_pump', 'P1', [80, 2000], 6], ['sfx.veh.forklift_mast', 'P1', [200, 2500], 6], ['sfx.veh.crane_slew', 'P2'],
]);
// ---- boats and water ---------------------------------------------------------------------------------------------------------
G({ bus: 'vehicles', kind: 'oneshot', spatial: true, refDistance: 3, maxDistance: 80, priority: 4 }, [
  ['sfx.boat.bow_slap', 'P1', [80, 2500], 0.6], ['sfx.boat.hull_bump', 'P0', [80, 2000], 0.9], ['sfx.boat.dock_bump', 'P0', [60, 1200], 0.7],
  ['sfx.boat.rope_tie', 'P1', [200, 2500], 0.8], ['sfx.boat.rope_throw', 'P1', [300, 3000], 0.6], ['sfx.boat.cleat', 'P1', [150, 3000], 0.4], ['sfx.boat.oar_stroke', 'P1', [200, 3000], 1.0],
  ['sfx.boat.anchor_chain', 'P2'], ['sfx.boat.horn', 'P1', [90, 800], 2.0, { maxDistance: 1200 }], ['sfx.boat.net_out', 'P1', [200, 3000], 1.2], ['sfx.boat.net_in', 'P1', [200, 4000], 1.4], ['sfx.boat.net_tear', 'P1', [600, 5000], 0.7],
  ['sfx.boat.bilge', 'P2'], ['sfx.boat.sonar_ping', 'P2'],
]);
G({ bus: 'vehicles', kind: 'loop', spatial: true, refDistance: 3, maxDistance: 80, priority: 4 }, [['sfx.boat.wake', 'P0', [400, 4000], 6], ['sfx.boat.winch', 'P1', [100, 2500], 6]]);
G({ bus: 'sfx', kind: 'oneshot', spatial: true, refDistance: 2, maxDistance: 60, priority: 2 }, [
  ['sfx.water.splash_small', 'P0', [400, 4500], 0.6], ['sfx.water.splash_big', 'P1', [250, 4000], 1.2], ['sfx.water.wade', 'P1', [300, 3500], 0.7], ['sfx.water.drip', 'P1', [500, 4000], 0.3],
  ['sfx.water.pour', 'P2'], ['sfx.water.bail', 'P2'],
]);
// ---- fishing (job) -------------------------------------------------------------------------------------------------------------
G({ bus: 'sfx', kind: 'oneshot', spatial: true, refDistance: 2, maxDistance: 40, priority: 3 }, [
  ['sfx.fish.cast_whoosh', 'P0', [400, 3500], 0.5], ['sfx.fish.line_out', 'P0', [1500, 7000], 1.4], ['sfx.fish.bobber_plop', 'P0', [150, 3000], 0.6],
  ['sfx.fish.nibble', 'P0', [400, 4000], 0.3], ['sfx.fish.bite', 'P0', [80, 3000], 0.5], ['sfx.fish.line_snap', 'P0', [300, 6000], 0.7],
  ['sfx.fish.thrash', 'P0', [300, 4500], 1.8], ['sfx.fish.landed', 'P0', [150, 4000], 1.6],
  ['sfx.fish.net_scoop', 'P2'], ['sfx.fish.cooler_lid', 'P2'], ['sfx.fish.scale_beep', 'P2'], ['sfx.fish.fillet_cut', 'P2'],
]);
G({ bus: 'sfx', kind: 'loop', spatial: true, refDistance: 2, maxDistance: 40, priority: 3 }, [
  ['sfx.fish.reel', 'P0', [1200, 6500], 4], ['sfx.fish.drag_scream', 'P0', [2000, 8000], 4], ['sfx.fish.line_tension', 'P1', [400, 4000], 4],
]);
// ---- forest and tools ----------------------------------------------------------------------------------------------------------
G({ bus: 'sfx', kind: 'oneshot', spatial: true, refDistance: 3, maxDistance: 80, priority: 3 }, [
  ['sfx.tool.axe_swing', 'P1', [300, 3500], 0.4], ['sfx.tool.axe_chop', 'P1', [200, 3500], 0.6], ['sfx.tool.axe_stuck', 'P1', [80, 1500], 0.4],
  ['sfx.tool.chainsaw_start', 'P1', [100, 3500], 1.6], ['sfx.tool.chainsaw_kick', 'P1', [150, 4000], 0.6],
  ['sfx.tree.crack', 'P1', [200, 4000], 1.6, { maxDistance: 200 }], ['sfx.tree.fall', 'P1', [150, 3500], 2.5, { maxDistance: 250 }], ['sfx.tree.impact', 'P1', [40, 1500], 2.0, { maxDistance: 300 }],
  ['sfx.tool.dig', 'P2'], ['sfx.tool.tamp', 'P2'], ['sfx.tool.plant', 'P2'], ['sfx.tool.hammer', 'P2'], ['sfx.tool.nailgun', 'P2'], ['sfx.tool.rivet', 'P2'],
  ['sfx.tool.wrench_ratchet', 'P1', [800, 6000], 0.6], ['sfx.tool.impact_gun', 'P1', [200, 3500], 0.8], ['sfx.tool.torque_click', 'P1', [800, 6000], 0.2],
  ['sfx.tool.oil_drain', 'P1', [150, 2000], 1.5], ['sfx.tool.hood', 'P1', [60, 1800], 0.6], ['sfx.tool.extinguish', 'P2'], ['sfx.tool.camera_shutter', 'P2'], ['sfx.tool.binoculars', 'P2'],
  ['sfx.fire.ignite', 'P1', [100, 2500], 1.0],
]);
G({ bus: 'sfx', kind: 'loop', spatial: true, refDistance: 3, maxDistance: 60, priority: 3 }, [
  ['sfx.tool.chainsaw_cut', 'P1', [300, 5000], 4], ['sfx.tool.saw_hand', 'P2'], ['sfx.tool.jackhammer', 'P2'], ['sfx.tool.wheelbarrow', 'P2'], ['sfx.tool.spray_hose', 'P2'],
  ['sfx.fire.loop', 'P1', [150, 3500], 6],
]);
// ---- work environments ---------------------------------------------------------------------------------------------------------
G({ bus: 'sfx', kind: 'oneshot', spatial: true, refDistance: 2, maxDistance: 30, priority: 3 }, [
  ['sfx.kitchen.chop', 'P0', [250, 4000], 0.3], ['sfx.kitchen.flip', 'P1', [500, 5000], 0.4], ['sfx.kitchen.plate', 'P0', [1200, 7000], 0.8], ['sfx.kitchen.bell', 'P0', [1500, 7500], 1.8],
  ['sfx.kitchen.burn', 'P1', [1500, 8000], 1.2], ['sfx.kitchen.fridge_door', 'P1', [60, 1500], 0.5], ['sfx.kitchen.pour_coffee', 'P1', [300, 3000], 1.5],
  ['sfx.shop.scan_beep', 'P1', [1500, 3500], 0.2], ['sfx.shop.bag', 'P1', [1000, 7000], 0.6], ['sfx.shop.till_open', 'P1', [300, 4000], 0.6], ['sfx.shop.shelf_place', 'P1', [80, 2000], 0.4],
  ['sfx.parcel.pickup', 'P0', [80, 2000], 0.4], ['sfx.parcel.drop', 'P0', [60, 1800], 0.5], ['sfx.parcel.doorbell', 'P0', [400, 2500], 1.6], ['sfx.parcel.sign', 'P0', [1500, 7000], 0.9],
  ['sfx.office.key', 'P2'], ['sfx.office.mouse', 'P2'], ['sfx.office.printer', 'P2'], ['sfx.office.paper', 'P2'], ['sfx.office.phone_ring', 'P2'], ['sfx.office.stamp', 'P2'],
  ['sfx.vend.restock', 'P0', [500, 5000], 1.0], ['sfx.vend.coin_box', 'P0', [1500, 8000], 0.9], ['sfx.vend.dispense', 'P0', [80, 2500], 0.8], ['sfx.vend.jam', 'P0', [100, 2000], 0.8], ['sfx.vend.repair', 'P0', [800, 6000], 0.8],
  ['sfx.dock.crate_set', 'P1', [60, 1500], 0.5], ['sfx.dock.ice_shovel', 'P1', [1500, 8000], 0.6], ['sfx.dock.fish_dump', 'P1', [200, 3000], 1.2],
  ['sfx.rental.life_jacket', 'P1', [300, 4000], 0.5], ['sfx.rental.boat_push', 'P1', [150, 3500], 1.2], ['sfx.rental.whistle', 'P1', [1800, 4500], 0.6],
  ['sfx.tray.wobble', 'P2'], ['sfx.tray.tray_spill', 'P2'], ['sfx.tray.glass_clink', 'P2'], ['sfx.tray.bill', 'P2'],
]);
G({ bus: 'sfx', kind: 'loop', spatial: true, refDistance: 2, maxDistance: 30, priority: 3 }, [
  ['sfx.kitchen.sizzle', 'P0', [1500, 8000], 6], ['sfx.kitchen.fryer', 'P1', [400, 5000], 6], ['sfx.kitchen.espresso', 'P1', [200, 4000], 6],
  ['sfx.shop.belt', 'P1', [80, 1500], 6], ['sfx.shop.cart_roll', 'P1', [100, 3000], 6], ['sfx.dock.conveyor', 'P1', [80, 2000], 6],
]);
// ---- weather and world one-shots -----------------------------------------------------------------------------------------------
G({ bus: 'sfx', kind: 'oneshot', spatial: true, refDistance: 8, maxDistance: 300, priority: 2 }, [
  ['sfx.weather.rain_start', 'P2'], ['sfx.weather.lightning_crack', 'P1', [100, 5000], 4, { maxDistance: 3000, refDistance: 50 }], ['sfx.weather.gust', 'P1', [200, 1500], 3, { spatial: false }],
  ['sfx.world.traffic_light_tick', 'P2'], ['sfx.world.crossing_beep', 'P1', [800, 3000], 0.3], ['sfx.world.bus_brake', 'P1', [500, 6000], 1.4],
  ['sfx.world.church_bell', 'P1', [200, 2500], 4.5, { maxDistance: 1200 }], ['sfx.world.ship_bell', 'P2'], ['sfx.world.crowd_cheer', 'P2'], ['sfx.world.construction_clank', 'P1', [300, 5000], 1.0],
]);

export const SOUNDS = rows;
export const SOUND_BY_ID = Object.freeze(Object.fromEntries(rows.map((r) => [r.id, r])));
/** ids Stage 3 must implement and verify (MASTER_SPEC 9.3 acceptance 9): every amb.*, mus.*, and P0 sfx.* / eng.* */
export const REQUIRED_IDS = rows.filter((r) => r.id.startsWith('amb.') || r.id.startsWith('mus.') || r.prio === 'P0').map((r) => r.id);
