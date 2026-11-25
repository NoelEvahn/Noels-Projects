// Registry entries for the 'interiors' pack (same item shape as ../registry.js). Owned by one builder; do not import other packs' registry files.
import * as THREE from 'three';
import { INT_STAGE, withUpdate } from '../props/interiors_core.js';
import * as FUR from '../props/interiors_furniture.js';
import * as APP from '../props/interiors_appliances.js';
import * as ELEC from '../props/interiors_electronics.js';
import * as DEC from '../props/interiors_decor.js';
import { clutter } from '../props/interiors_clutter.js';
import * as HOME from '../sets/interiors_home.js';

export const ITEMS = [];
const reg = (i) => ITEMS.push(i);
const KIT_STAGE = { ...INT_STAGE, ground: 0xb8ac98, groundR: 30, sky: ['#dfe6ee', '#cfc6b6'], shadow: { extent: 7, size: 2048 } };

// lay out props in a grid centred on the origin (z grows towards the camera); each cell: [obj, rotY?]
function layout(cells, cols, gx = 1.6, gz = 1.8) {
  const g = new THREE.Group(); const ups = [];
  cells.forEach((c, i) => {
    const [o, ry = 0, dx = 0, dz = 0] = Array.isArray(c) ? c : [c];
    const col = i % cols, row = Math.floor(i / cols), rows = Math.ceil(cells.length / cols);
    o.position.set((col - (cols - 1) / 2) * gx + dx, o.position.y, (row - (rows - 1) / 2) * gz + dz); o.rotation.y = ry; g.add(o);
    o.traverse((q) => { if (q.userData.update && !ups.includes(q.userData.update)) ups.push(q.userData.update); });
  });
  const update = (t) => ups.forEach((f) => f(t)); g.userData.update = update; update(0.6);
  return { obj: g, update };
}
// camera that frames the whole object for a 3:4 / 9:16 portrait frame: walk the camera back along a fixed elevation until all box corners project inside the frame
function fitCam(obj, { elev = 0.75, fov = 42, aspect = 0.75, pad = 0.94, lift = 0.35, yaw = 0 } = {}) {
  obj.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(obj); const c = b.getCenter(new THREE.Vector3()); const tgt = new THREE.Vector3(c.x, b.min.y + (b.max.y - b.min.y) * lift, c.z);
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 500); const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), Math.cos(yaw) * Math.cos(elev));
  const corners = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners.push(new THREE.Vector3(x, y, z));
  let d = 2; for (; d < 60; d += 0.25) { cam.position.copy(tgt).addScaledVector(dir, d); cam.lookAt(tgt); cam.updateMatrixWorld(true); cam.updateProjectionMatrix(); if (corners.every((p) => { const q = p.clone().project(cam); return Math.abs(q.x) < pad && Math.abs(q.y) < pad; })) break; }
  return { pos: cam.position.toArray(), target: tgt.toArray(), fov };
}
const kit = (id, title, note, build, camOpts = {}) => reg({ id, cat: 'props', title, note, stage: KIT_STAGE, build: () => { const r = build(); return { obj: r.obj, update: r.update, cam: fitCam(r.obj, camOpts) }; } });

const wallBoard = (w, h, color = 0xefe2c8) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), new THREE.MeshStandardMaterial({ color, roughness: 0.95 })); m.position.set(0, h / 2, -0.06); m.receiveShadow = true; g.add(m); return g; };
const at = (o, x, y, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
const bundle = (...os) => { const g = new THREE.Group(); const ups = []; os.forEach((o) => { g.add(o); o.traverse((q) => { if (q.userData.update && !ups.includes(q.userData.update)) ups.push(q.userData.update); }); }); const update = (t) => ups.forEach((f) => f(t)); g.userData.update = update; update(0.6); return { obj: g, update }; };

kit('interiors_kit_beds', 'Beds and bedroom storage kit: single, double, bunk, cot, wardrobe (doors open), dresser, nightstand', 'FUR.bed({size:single|double|kid,color,pillows,messy,headboard}), bunkBed, cot, nightstand, wardrobe({open 0..1}), dresser',
  () => layout([FUR.bed({ size: 'single', color: 0x3a78d0, seed: 1 }), FUR.bed({ size: 'double', color: 0xe05a7a, seed: 2, headboard: 'tall' }), FUR.bunkBed(), FUR.cot(), FUR.wardrobe({ open: 0.6, seed: 2 }), FUR.dresser({ seed: 3 }), FUR.nightstand(), FUR.wardrobe({ color: 0x8a6a4a, open: 0.0, seed: 4, w: 1.0 }), FUR.bed({ size: 'kid', color: 0x3fa060, seed: 5 })], 3, 2.4, 2.6),
  { elev: 0.8 });

kit('interiors_kit_seating', 'Seating kit: sofas, armchair, bean bag, ottoman, dining / office (swivels) / school / folding / bar chairs, stool, bench', 'FUR.sofa({seats:2|3|4,color}), armchair, beanBag, ottoman, chair({kind:dining|office|school|folding|bar}), stool, bench; userData.seatY',
  () => layout([FUR.sofa({ seats: 3, color: 0x3f6fb5 }), FUR.sofa({ seats: 2, color: 0xd8605a, seed: 2 }), FUR.armchair(), FUR.beanBag(), FUR.ottoman(), FUR.chair({ kind: 'dining' }), FUR.chair({ kind: 'office', seed: 2 }), FUR.chair({ kind: 'school' }), FUR.chair({ kind: 'folding' }), FUR.chair({ kind: 'bar', seat: 0xe04a3a }), FUR.stool(), FUR.bench()], 3, 2.4, 1.7),
  { elev: 0.8 });

kit('interiors_kit_storage', 'Tables, desks and filled shelves kit: set dining table, round table, desk with hutch, school desk, TV stand, sideboard, bookshelf / toy shelf / pantry shelf, lockers, filing cabinet, trolley', 'FUR.table({kind,cloth}), desk({hutch}), schoolDesk, tvStand, sideboard, shelfFilled({kind:books|toys|pantry|records|mixed}), locker, filingCabinet, trolley',
  () => layout([FUR.table({ kind: 'rect', cloth: 0xf2d27a, w: 1.7 }), FUR.table({ kind: 'round', w: 1.1, color: 0x7a5232, top: 0xe8d8b8 }), FUR.desk({ hutch: true }), FUR.schoolDesk(), FUR.tvStand(), FUR.sideboard(), FUR.shelfFilled({ kind: 'books', seed: 1 }), FUR.shelfFilled({ kind: 'toys', seed: 2, color: 0xe8d8b8, w: 1.2, h: 1.3, rows: 3 }), FUR.shelfFilled({ kind: 'pantry', seed: 3, color: 0xc8ccd6, w: 1.0, h: 1.7 }), FUR.locker({ n: 4 }), FUR.filingCabinet(), FUR.trolley(), FUR.shelfFilled({ kind: 'mixed', seed: 7, w: 1.1, h: 1.9, color: 0x3a78d0 })], 3, 2.3, 2.1),
  { elev: 0.8 });

kit('interiors_kit_appliances', 'Kitchen appliances kit: fridge (open + closed), cooker with steaming pot, washing machine (tumbling clothes), microwave, kettle, toaster, kitchen run with sink + dripping tap, dishwasher, water cooler, vending machine', 'APP.fridge({open}), cooker, washingMachine, microwave, kettle, toaster, coffeeMachine, dishwasher, kitchenRun({w,sink,uppers}), waterCooler, vendingMachine',
  () => {
    const run = APP.kitchenRun({ w: 2.4, sink: -0.5 }); const tab = FUR.table({ kind: 'rect', w: 1.2, d: 0.7, h: 0.9, color: 0xc89a62 });
    const on = (o, x, y, z = 0) => { o.position.set(x, y, z); return o; };
    tab.add(on(APP.microwave(), -0.28, 0.9, 0)); tab.add(on(APP.kettle(), 0.35, 0.9, 0.05)); tab.add(on(APP.toaster(), 0.1, 0.9, -0.2)); tab.add(on(APP.coffeeMachine(), 0.4, 0.9, -0.2));
    return layout([APP.fridge({ open: 0.0 }), APP.fridge({ open: 0.7, seed: 2, color: 0xdfe8f2 }), APP.cooker(), APP.washingMachine(), run, tab, APP.dishwasher(), APP.waterCooler(), APP.vendingMachine()], 3, 2.7, 2.4);
  },
  { elev: 0.8 });

kit('interiors_kit_bathroom', 'Bathroom fittings kit: toilet, basin vanity with dripping tap, bath with foam, shower with falling drops and steam, towel rail', 'APP.toilet, basin({vanity,vcolor}), bathtub, shower, towelRail, toiletRoll; faucet drips, shower drops + steam',
  () => layout([APP.toilet(), APP.basin(), APP.bathtub(), APP.shower(), bundle(at(APP.towelRail(), 0, 1.2, 0), wallBoard(1.4, 2.0, 0xcfe8ec)).obj], 3, 2.4, 2.2),
  { elev: 0.8 });

kit('interiors_kit_electronics', 'Electronics kit: flat TV (cartoon / news / bars), CRT TV, monitors (code, charts, desktop), keyboard + mouse, laptops, phones, tablet, console + controller, speaker, boombox, router (blinking LEDs), PC tower, studio camera, projector, rack', 'ELEC.tv({kind}), crtTV, monitor({kind}), keyboard, mouse, laptop({kind}), phone, tablet, gameConsole, controller, speaker, boombox, router, desktopPC, tvCamera, projector, receiverRack',
  () => { const t1 = FUR.desk({ w: 1.4 }); const on = (o, x, y, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
    t1.add(on(ELEC.monitor({ kind: 'code' }), -0.3, 0.75, -0.1)); t1.add(on(ELEC.keyboard(), -0.3, 0.75, 0.15)); t1.add(on(ELEC.mouse(), 0.05, 0.75, 0.15)); t1.add(on(ELEC.laptop({ kind: 'chart' }), 0.4, 0.75, 0.0, -0.4)); t1.add(on(ELEC.phone({ kind: 'chat' }), 0.58, 0.75, 0.2, 0.5)); t1.add(on(ELEC.router(), 0.58, 0.75, -0.25));
    const tvs = FUR.tvStand({ w: 1.7 }); tvs.add(on(ELEC.tv({ w: 1.2, kind: 'tv' }), 0, 0.45, 0)); tvs.add(on(ELEC.gameConsole(), -0.6, 0.45, 0.05)); tvs.add(on(ELEC.controller(), 0.55, 0.45, 0.45, 0.4));
    const t2 = FUR.table({ kind: 'rect', w: 1.4, d: 0.6, h: 0.75, color: 0x7a5232 }); t2.add(on(ELEC.crtTV(), -0.3, 0.75, 0)); t2.add(on(ELEC.boombox(), 0.35, 0.75, 0.05)); t2.add(on(ELEC.tablet({ kind: 'desktop' }), 0.35, 0.75, 0.3, 0.3)); t2.add(on(ELEC.desktopPC(), -0.6, 0.75, 0.0));
    return layout([t1, tvs, t2, ELEC.tvCamera(), ELEC.speaker(), ELEC.receiverRack(), on(ELEC.tv({ w: 1.4, kind: 'news', wall: false }), 0, 0.0, 0), ELEC.projector(), ELEC.tv({ w: 1.0, kind: 'bars', seed: 3 })], 3, 2.7, 2.3); },
  { elev: 0.8 });

kit('interiors_kit_walldecor', 'Wall dressing kit: posters (rocket, heart, star, band, cat, map, robot...), frame gallery, ticking clocks, windows with views (day / city / night with twinkling stars, drifting clouds), swaying curtains, blinds, mirrors, shelf, bulletin board', 'DEC.poster(w,h,{kind,frame}), gallery(n), wallClock, windowView({view:day|city|night|sunset|garden|grey}), curtains, blinds, mirror, wallShelf, bulletinBoard',
  () => {
    const g = new THREE.Group(); const board = wallBoard(8.6, 5.2, 0xefe2c8); g.add(board);
    const put = (o, x, y) => { o.position.set(x, y, 0); g.add(o); return o; };
    DEC.POSTER_KINDS.forEach((k, i) => put(DEC.poster(0.42, 0.58, { kind: k, seed: i + 1, frame: i % 3 === 0 ? 0x5a3a22 : null, tilt: (i % 3 - 1) * 0.03 }), -3.6 + (i % 6) * 0.55, 4.5 - Math.floor(i / 6) * 0.72));
    put(DEC.gallery(7, { w: 1.9, h: 1.1, seed: 4 }), -1.6, 3.2 - 0.0); put(DEC.wallClock(0.24), 0.1, 4.3); put(DEC.wallClock(0.2, { color: 0x222222, frame: 0xc9a062, h0: 3, m0: 40 }), 0.8, 4.4);
    put(DEC.mirror(0.5, 0.9, { round: true }), 1.7, 4.3); put(DEC.bulletinBoard(1.2, 0.8), 3.2, 4.2); put(DEC.wallShelf(1.1, { seed: 3 }), 3.1, 3.2);
    const win = (view, x, y, fr = 0xffffff) => { const w = DEC.windowView(1.1, 1.0, { view, frame: fr, seed: x * 7 }); put(w, x, y); return w; };
    win('day', -3.2, 1.8); win('city', -1.6, 1.8); win('night', 0, 1.8, 0x3a3a50); win('sunset', 1.6, 1.8); win('garden', 3.2, 1.8, 0xc99a62);
    const cs = DEC.curtains(1.1, 1.5, 0xd8604a, { phase: 0 }); put(cs, -3.2, 2.7); const cs2 = DEC.curtains(1.1, 1.5, 0x3a78d0, { phase: 2 }); put(cs2, 0, 2.7);
    put(DEC.blinds(1.1, 1.0), 1.6, 2.4); put(DEC.blinds(1.1, 1.0, 0xffd23f, { open: 1.2 }), 3.2, 2.4);
    put(DEC.mirror(0.55, 1.1), -1.6, 0.9); const sf = put(FUR.sideboard({ w: 1.5, h: 0.7 }), 0.2, 0); sf.position.z = 0.26; put(DEC.flowerVase(0xff5c8a), -0.2, 0.75).position.z = 0.26; put(DEC.mug(0x3a78d0), 0.4, 0.75).position.z = 0.26;
    put(DEC.plant({ kind: 'monstera', h: 1.3, seed: 1 }), 2.6, 0).position.z = 0.4; put(DEC.plant({ kind: 'cactus', h: 0.8 }), 3.6, 0).position.z = 0.4; put(DEC.plant({ kind: 'fern', h: 1.0, seed: 3, pot: 0x6aa0c8 }), -3.7, 0).position.z = 0.4;
    const ups = []; g.traverse((q) => { if (q.userData.update && !ups.includes(q.userData.update)) ups.push(q.userData.update); }); const update = (t) => ups.forEach((f) => f(t)); g.userData.update = update; update(0.6); return { obj: g, update };
  }, { elev: 0.15, lift: 0.5, fov: 46 });

kit('interiors_kit_living', 'Living details kit: ceiling fan (spins), pendants (swing), fluorescent (flicker), neon sign (flicker), lamps, lava lamp (blobs rise), plants (sway), hanging plant, fish tank + bowl (fish swim, bubbles), globe (turns), mugs with steam, cat + dog (breathe)', 'DEC.ceilingFan, pendant, fluorescent, neonSign, floorLamp, tableLamp, lavaLamp, plant({kind}), hangingPlant, fishTank, fishBowl, globe, mug, steam, pet({kind,pose}), bookStack',
  () => {
    const sb = (o, y = 0) => { o.position.y = y; return o; };
    const cat = DEC.pet('cat', { pose: 'sleep', fur: 0x8a8a92, stripe: 0x5a5a66 }); const dog = DEC.pet('dog', { pose: 'loaf', fur: 0xd8a060 }); const cat2 = DEC.pet('cat', { pose: 'sit', fur: 0xf0e8d8, stripe: 0xc8a878, seed: 9 });
    const tab = FUR.table({ kind: 'rect', w: 1.3, d: 0.7, h: 0.75 }); const on = (o, x, y, z = 0) => { o.position.set(x, y, z); tab.add(o); };
    on(DEC.lavaLamp(0xff4a8a), -0.5, 0.75, 0); on(DEC.globe(0.12), -0.15, 0.75, 0.05); on(DEC.mug(0xe04a3a), 0.15, 0.75, 0.15); on(DEC.mug(0x3fa060), 0.3, 0.75, 0.0); on(DEC.bookStack(4), 0.5, 0.75, 0.0); on(DEC.fishBowl(0.13), -0.5, 0.75, 0.25); on(DEC.tableLamp(0xff7a8a), 0.55, 0.75 + 0.2, -0.2);
    const fishT = FUR.sideboard({ w: 1.3, h: 0.7 }); fishT.add(sb(DEC.fishTank(0.8, 0.45, 0.3), 0.75));
    const ceil = new THREE.Group(); ceil.add(sb(DEC.ceilingFan(), 0)); const fan = ceil.children[0]; fan.position.y = 0; const pend = DEC.pendant(0xffd23f); pend.position.x = 1.0; ceil.add(pend); const fl = DEC.fluorescent(1.0, { flicker: 0.3 }); fl.position.x = -1.1; ceil.add(fl); ceil.position.y = 2.6;
    const hp = DEC.hangingPlant(); hp.position.set(0, 2.4, 0);
    const ns = DEC.neonSign('OPEN', '#ff3a7a', 0.9, 0.35); ns.position.y = 1.5; const wb = wallBoard(1.6, 2.2, 0x2a2a3a); wb.add(ns);
    return layout([tab, bundle(sb(DEC.floorLamp(0xfff0d0), 0), at(DEC.floorLamp(0xffb890, { style: 'arc' }), 0.8, 0, 0)).obj, fishT, ceil, hp, wb, DEC.plant({ kind: 'monstera', h: 1.2 }), DEC.plant({ kind: 'tree', h: 1.5, seed: 4 }), cat, dog, cat2, bundle(DEC.plant({ kind: 'cactus', h: 0.7 }), at(DEC.plant({ kind: 'succulent', h: 0.3, pot: 0x6aa0c8 }), 0.5, 0, 0)).obj], 4, 2.0, 2.4);
  }, { elev: 0.7, fov: 44 });

kit('interiors_kit_clutter', 'Clutter scatterer: clutter(area,{seed,density,kind,y,avoid}) on a floor and on tables: toys, books, clothes, dishes, papers, trash, tools, food, office, mixed (instanced, never floating)', 'clutter({x,z,w,d},{kind:toys|books|clothes|dishes|papers|trash|tools|food|office|mixed|kitchen|garage|bedroom, density, seed, y, avoid})',
  () => {
    const g = new THREE.Group(); const kinds = ['toys', 'books', 'clothes', 'dishes', 'papers', 'trash', 'tools', 'food', 'office'];
    const floor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 9), new THREE.MeshStandardMaterial({ color: 0xc8a070, roughness: 0.8 })); floor.position.y = -0.05; floor.receiveShadow = true; g.add(floor);
    kinds.forEach((k, i) => { const x = ((i % 3) - 1) * 2.8, z = (Math.floor(i / 3) - 1) * 2.8; const sq = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.02, 2.5), new THREE.MeshStandardMaterial({ color: [0xe8d8b8, 0xb8c8e0, 0xd8e8c8][i % 3], roughness: 1 })); sq.position.set(x, 0.01, z); g.add(sq); g.add(clutter({ x, z, w: 2.4, d: 2.4 }, { kind: k, density: 5.5, seed: i + 1, y: 0.02 })); });
    return { obj: g, update: () => {} };
  }, { elev: 0.95, lift: 0.0, fov: 42 });

// ---------------------------------------------------------------- sets
const setItem = (id, title, note, fn, opts = {}, camOverride = null) => reg({ id, cat: 'sets', title, note, stage: INT_STAGE, build: () => { const s = fn(opts); return { obj: s.group, cam: camOverride ?? s.cam, update: s.update }; } });
const OPT = 'options { seed, wrecked: 0..1, ceiling } · returns { group, update(t), anchors, cam }';
setItem('interiors_set_teenbedroom', 'Teen bedroom (cluttered): bed + sleeping cat, desk with code monitor, TV + console, wardrobe, guitar, posters, fairy lights, swaying curtains, ceiling fan', 'buildTeenBedroom({time:day|night, wrecked}) · ' + OPT, HOME.buildTeenBedroom);
setItem('interiors_set_teenbedroom_wrecked', 'Teen bedroom, wrecked 0.9: hole in the wall, cracks, rubble, toppled wardrobe / chair / dresser, sparking wires', 'buildTeenBedroom({wrecked:0.9})', HOME.buildTeenBedroom, { wrecked: 0.9, time: 'night' });
setItem('interiors_set_kitchen', 'Kitchen: tiled backsplash, run of cabinets with sink + steaming pot + kettle, island with stools, swinging pot rack, dog + washing machine', 'buildKitchen() · ' + OPT, HOME.buildKitchen);
setItem('interiors_set_kitchen_wrecked', 'Kitchen, wrecked 0.8: fridge down, dishes on the floor, hole in the wall', 'buildKitchen({wrecked:0.8})', HOME.buildKitchen, { wrecked: 0.8 });
setItem('interiors_set_diningroom', 'Dining room with a set table: cloth, plates, cutlery, glasses, flickering candles, steaming roast, 8 chairs, chandelier, sideboards, curtains', 'buildDiningRoom() · ' + OPT, HOME.buildDiningRoom);
setItem('interiors_set_bathroom', 'Bathroom: tiled walls, bath with foam + bobbing duck, shower with falling drops and steam, toilet, basin with dripping tap, mirror, towels', 'buildBathroom() · ' + OPT, HOME.buildBathroom);
setItem('interiors_set_livingroom', 'Living room (full): flickering fireplace, sofas, armchair, filled bookshelves, TV + console, cat + dog, plants, gallery wall, swaying curtains, ceiling fan', 'buildLivingRoomFull() · ' + OPT, HOME.buildLivingRoomFull);
setItem('interiors_set_livingroom_wrecked', 'Living room, wrecked 0.9', 'buildLivingRoomFull({wrecked:0.9})', HOME.buildLivingRoomFull, { wrecked: 0.9 });
setItem('interiors_set_hallway', 'Hallway with staircase: front door with side lights, console table, gallery walls, coat rack, shoes, runner rug, swinging pendants, cat on the stairs', 'buildHallwayStairs() · ' + OPT, HOME.buildHallwayStairs);
setItem('interiors_set_garage', 'Garage: roll-up door, pegboard + workbench, shelving, car, bike, ladder, tyres, barrels, mower, swinging bulbs, flickering strip light, oscillating fan', 'buildGarage() · ' + OPT, HOME.buildGarage);
