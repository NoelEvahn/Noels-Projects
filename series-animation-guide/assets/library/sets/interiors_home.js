// INTERIORS pack: home sets. Every room is a dollhouse cut-away: floor + back wall + side walls (+ ceiling), open towards +Z for the camera, origin at floor centre.
// Options on all builders: { seed, wrecked: 0..1 (cracks, hole in the wall, rubble, toppled furniture, sparking wires), detail: 'high'|'low', ceiling: true }.
// Return { group, update(t), anchors, cam, size }.  group.userData.update(t) is the same function.
import * as THREE from 'three';
import { P, bg, rg, cg, sg, inst, tube, room, castAll, sign, rug, PAL, COL, smooth } from '../props/interiors_core.js';
import { mat, glow, rng, shade } from '../util.js';
import * as FUR from '../props/interiors_furniture.js';
import * as APP from '../props/interiors_appliances.js';
import * as ELEC from '../props/interiors_electronics.js';
import * as DEC from '../props/interiors_decor.js';
import { clutter } from '../props/interiors_clutter.js';
import { liveScreen } from '../props/interiors_screens.js';
import { camFor, door, wallTiles, stairs, fairyLights, sitter, stander, plaque, mountOnWall } from './interiors_common.js';

const TAU = Math.PI * 2, PI = Math.PI;
const HP = PI / 2;
// put obj on top of a surface object: obj local to the same group as parent
const on = (parent, o, x, y, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; parent.add(o); return o; };
const dens = (base, wrecked) => base * (1 + wrecked * 1.6);

// ---------------------------------------------------------------- teen bedroom
export function buildTeenBedroom({ seed = 1, wrecked = 0, time = 'day', ceiling = true, detail = 'high' } = {}) {
  const R = room({ w: 5.4, d: 4.6, h: 2.8, seed, wrecked, ceiling, wall: 0x5f86c4, wall2: 0x4f74b0, floor: { type: 'planks', colors: [0xb98a56, 0xad7e4b, 0xc29360, 0xa87848] }, hole: { x: 0.2, y: 1.8, r: 0.5 }, name: 'teenBedroom' });
  const { g, w, d, h } = R; const hw = w / 2, hd = d / 2, r = R.r; const L = hw - 0.03;
  // window + curtains (back wall, left of centre)
  const win = DEC.windowView(1.3, 1.25, { view: time === 'night' ? 'night' : 'city', seed }); R.place(win, -0.95, 1.6, -hd + 0.0);
  const cur = DEC.curtains(1.3, 1.65, 0xf2b84a, { phase: 0.4 }); R.place(cur, -0.95, 2.35, -hd + 0.05);
  // bed along the left wall (head to the wall), cat on it
  const bed = FUR.bed({ size: 'single', color: 0x3a8ad0, seed: 3, messy: 1 }); R.place(bed, -hw + 1.06, 0, -hd + 1.35, HP);
  const cat = DEC.pet('cat', { pose: 'sleep', fur: 0xe08a3a, stripe: 0xa85a1a, belly: 0xfff0d8 }); cat.scale.setScalar(0.9); R.place(cat, -hw + 1.4, 0.64, -hd + 1.2, 0.6);
  const ns = FUR.nightstand(); R.place(ns, -hw + 0.3, 0, -hd + 0.3, HP);
  const tl = DEC.tableLamp(0xff7a8a); R.place(tl, -hw + 0.3, 0.55, -hd + 0.3);
  const ac = new THREE.Group(); P(ac, rg(0.14, 0.09, 0.07, 0.02), mat(0x15151c), [0, 0.045, 0]); const acs = sign('7:42', 0.1, 0.05, { bg: '#100404', fg: '#ff4030', size: 0.8, family: 'ui-monospace, monospace', px: 64, emissive: true }); acs.position.set(0, 0.05, 0.036); ac.add(acs); R.place(ac, -hw + 0.55, 0.55, -hd + 0.2, 0.3);
  // shelf + posters above the bed, fairy lights along the walls
  const shelf = DEC.wallShelf(1.3, { seed: seed + 2 }); shelf.rotation.y = HP; shelf.position.set(-hw, 1.75, -hd + 1.3); g.add(shelf); R.reg(shelf);
  [['band', -hd + 0.65], ['rocket', -hd + 1.9], ['robot', -hd + 2.55]].forEach(([k, z], i) => { const p = DEC.poster(0.5, 0.7, { kind: k, seed: i + 5, frame: i === 1 ? 0x15151c : null, tilt: (i - 1) * 0.04 }); p.position.set(-hw + 0.003, 1.35 + (i === 2 ? 0.25 : 0), z); p.rotation.y = HP; g.add(p); });
  const fl = fairyLights([-hw + 0.1, 2.62, -hd + 0.06], [hw - 0.1, 2.62, -hd + 0.06], { n: 24, sag: 0.22, seed }); g.add(fl); R.reg(fl);
  const fl2 = fairyLights([-hw + 0.06, 2.62, -hd + 0.1], [-hw + 0.06, 2.62, hd - 0.2], { n: 16, sag: 0.18, seed: seed + 1 }); g.add(fl2); R.reg(fl2);
  // desk corner (back wall, right): hutch, monitor, chair, lamp
  const desk = FUR.desk({ w: 1.6, d: 0.72, hutch: true, color: 0x2a2e3a, accent: 0x3fd0b0, side: -1 });
  const mon = ELEC.monitor({ w: 0.62, kind: 'code', seed: seed + 3 }); on(desk, mon, -0.2, 0.75, -0.1); on(desk, ELEC.keyboard({ color: 0x20222a }), -0.2, 0.75, 0.17); on(desk, ELEC.mouse(0x20222a), 0.2, 0.75, 0.2); on(desk, DEC.mug(0xffd23f), 0.5, 0.75, 0.1); on(desk, DEC.tableLamp(0xffffff), 0.62, 0.75, -0.2);
  on(desk, ELEC.speaker({ h: 0.24 }), -0.62, 0.75, -0.15); on(desk, ELEC.speaker({ h: 0.24 }), 0.24, 0.75, -0.22); on(desk, ELEC.laptop({ kind: 'chart', w: 0.3 }), 0.5, 1.02, -0.2, -0.4);
  P(desk, new THREE.TorusGeometry(0.09, 0.015, 6, 16, Math.PI), mat(0x15151c), [0.3, 0.84, 0.12], [0, 0, 0]);
  R.place(desk, hw - 1.2, 0, -hd + 0.4);
  [['star', 0, 0], ['map', 0.55, 0.1], ['cat', -0.55, 0.05]].forEach(([k, dx, dy], i) => { const p = DEC.poster(0.42, 0.55, { kind: k, seed: i + 9, frame: 0xffffff }); p.position.set(hw - 1.2 + dx - 0.05, 2.1 + dy, -hd + 0.02); g.add(p); });
  const chair = FUR.chair({ kind: 'office', seed: 2, seat: 0x3fd0b0 }); R.place(R.topple(chair, 0.3, 0.35), hw - 1.4, 0, -hd + 1.4, PI + 0.5);
  const cr = ELEC.powerStrip(); R.place(cr, hw - 0.6, 0, -hd + 0.18, 0);
  // wardrobe + dresser/TV along the right wall
  const wd = FUR.wardrobe({ w: 1.2, h: 2.1, open: 0.55 + wrecked * 0.4, color: 0xf2ead8, seed: seed + 3 }); R.place(R.topple(wd, 0.6, 0.55, { sign: -1 }), hw - 0.3, 0, 0.35, -HP);
  const dr = FUR.dresser({ w: 1.2, h: 0.85, seed: seed + 4, color: 0x8a6a4a }); const tv = ELEC.tv({ w: 0.9, kind: 'tv', seed: 4 }); on(dr, tv, 0, 0.85, 0.0); on(dr, ELEC.gameConsole(), -0.45, 0.85, 0.14); on(dr, ELEC.controller(), 0.3, 0.85, 0.15, 0.4); on(dr, DEC.lavaLamp(0x7a5aff), 0.52, 0.85, -0.15);
  R.place(R.topple(dr, 0.6, 0.65, { sign: 1 }), hw - 0.28, 0, -hd + 2.0, -HP);
  // door on the left wall (front), mirror on its side
  const dor = door({ color: 0xf2ead8, frame: 0xf2ead8 }); R.place(dor, -hw + 0.04, 0, hd - 1.2, HP);
  const mir = DEC.mirror(0.5, 1.5); mir.position.set(-hw + 0.0, 1.2, hd - 2.3); mir.rotation.y = HP; g.add(mir);
  // floor: round rug, bean bag, guitar, clothes, toys, books
  R.place(rug(2.5, 2.5, { shape: 'round', colors: [0xff7a8a, 0xffd23f, 0x6ad0ff] }), 0.1, 0, 0.5);
  const bb = FUR.beanBag(0xff8a2b); R.place(bb, -1.6, 0, 1.55, 0.6);
  const gt = new THREE.Group(); P(gt, sg(0.16, 14, 10), mat(0xc84a2a, { rough: 0.3 }), [0, 0.2, 0], [0, 0, 0], [1, 1.2, 0.35], true); P(gt, sg(0.12, 14, 10), mat(0xc84a2a, { rough: 0.3 }), [0, 0.42, 0], [0, 0, 0], [1, 1.1, 0.35], true); P(gt, cg(0.1, 0.1, 0.01, 12), mat(0x15151c), [0, 0.27, 0.06], [HP, 0, 0]); P(gt, bg(0.045, 0.8, 0.025), mat(0x6a4428), [0, 0.95, -0.02]); P(gt, bg(0.07, 0.14, 0.03), mat(0x15151c), [0, 1.42, -0.02]);
  gt.rotation.z = 0.12; R.place(R.topple(gt, 0.15, 0.4, { sign: 1 }), -hw + 0.3, 0.0, hd - 2.0, HP * 0.9);
  const pl = DEC.plant({ kind: 'monstera', h: 1.4, seed: seed + 5 }); R.place(pl, -hw + 0.45, 0, -hd + 2.55 + 0.0 - 0.0, 0);
  R.g.add(clutter({ x: 0, z: 0.8, w: 4.2, d: 3.2 }, { kind: 'bedroom', seed: seed + 11, density: dens(1.3, wrecked), avoid: [{ x: -1.6, z: -1.3, w: 2.2, d: 1.1 }, { x: hw - 1.2, z: -hd + 0.6, w: 1.9, d: 1.0 }, { x: hw - 0.3, z: -0.2, w: 0.7, d: 3.0 }] }));
  R.g.add(clutter({ x: -hw + 1.05, z: -hd + 1.4, w: 0.8, d: 1.5 }, { kind: ['clothes', 'books'], seed: seed + 12, density: 1.2, y: 0.62, avoid: [{ x: -hw + 1.4, z: -hd + 1.3, w: 0.6, d: 0.6 }] }));
  R.g.add(clutter({ x: hw - 1.2, z: -hd + 0.4, w: 1.2, d: 0.5 }, { kind: 'office', seed: seed + 13, density: 2.2, y: 0.76, avoid: [{ x: hw - 1.4, z: -hd + 0.35, w: 0.8, d: 0.4 }] }));
  const fan = DEC.ceilingFan({ r: 0.7, color: 0x3a3a44 }); R.place(fan, 0.3, h, -0.2);
  return R.finish({ bed, desk, chair, tv, window: win, cat }, camFor(R, { fov: 56, y: 1.6 }));
}

// ---------------------------------------------------------------- kitchen
export function buildKitchen({ seed = 2, wrecked = 0, ceiling = true, detail = 'high' } = {}) {
  const R = room({ w: 5.6, d: 4.6, h: 2.8, seed, wrecked, ceiling, wall: 0xf6e8b8, wall2: 0xf0dca0, trim: 0xffffff, floor: { type: 'tiles', size: 0.4, c1: 0xf2ece0, c2: 0xd4553a, grout: 0x8a8a88 }, hole: { x: -1.6, y: 1.9, r: 0.55 }, name: 'kitchen' });
  const { g, w, d, h } = R; const hw = w / 2, hd = d / 2; const r = R.r;
  // backsplash tiles + counter run along the back wall
  wallTiles(R, 'back', [-hw + 0.03, hw - 0.03, 0.92, 1.52], { size: 0.15, c1: 0xf6f6f0, c2: 0x6ab0d8, pattern: 'rows', seed });
  const run = APP.kitchenRun({ w: 3.6, sink: 0.3, uppers: 1, seed, color: 0x3a8a9a, panelColor: 0x4aa0b0, top: 0xf2e8d0 }); R.place(run, -0.3, 0, -hd + 0.33);
  const cooker = APP.cooker({ seed }); R.place(cooker, hw - 0.8 - 0.0, 0, -hd + 0.34); const hood = APP.rangeHood(); R.place(hood, hw - 0.8, 1.55, -hd + 0.25);
  const fr = APP.fridge({ open: 0.0 + wrecked * 0.6, seed, magnets: true }); R.place(R.topple(fr, 0.35, 0.8), -hw + 0.45, 0, -hd + 0.42);
  // window over the sink with curtains (it sits between the upper cabinets)
  const win = DEC.windowView(1.0, 0.8, { view: 'garden', seed, frame: 0xffffff, panes: [2, 1] }); R.place(win, 0.3, 1.68, -hd + 0.0);
  const cur = DEC.curtains(1.0, 0.9, 0xd8604a, { phase: 1.3, sway: 0.04 }); R.place(cur, 0.3, 2.15, -hd + 0.05);
  // on the counter: kettle, toaster, coffee machine, mugs, dish rack, fruit bowl, plants
  const top = 0.94; on(run, APP.kettle(), -1.3, top, 0.0); on(run, APP.toaster(), -0.95, top, 0.0); on(run, APP.coffeeMachine(), -0.55, top, -0.05); on(run, DEC.mug(0xe04a3a), -0.15, top, 0.05); on(run, DEC.plant({ kind: 'succulent', h: 0.3, pot: 0x6aa0c8 }), 0.0 + 0.3, top + 0.0, -0.18);
  on(run, DEC.plant({ kind: 'fern', h: 0.5, seed: 4, pot: 0xffd23f }), 1.5, top, -0.1); const mw = APP.microwave(); on(run, mw, 1.05, top, 0.0);
  const fb = new THREE.Group(); P(fb, new THREE.SphereGeometry(0.17, 16, 6, 0, TAU, PI * 0.5, PI * 0.5), mat(0x6ab0d8, { rough: 0.3 }), [0, 0.1, 0], [0, 0, 0], [1, 0.8, 1]); for (let i = 0; i < 7; i++) P(fb, sg(0.045, 10, 8), mat([0xe04a3a, 0xffd23f, 0x3fa060, 0xff8a2b][i % 4], { rough: 0.4 }), [Math.cos(i * 1.2) * 0.07, 0.1 + 0.05 * (i % 3), Math.sin(i * 1.2) * 0.07]); on(run, fb, 0.8, top + 0.0, 0.1);
  R.g.add(clutter({ x: -0.3, z: -hd + 0.45, w: 3.4, d: 0.35 }, { kind: 'dishes', seed: seed + 4, density: dens(2.5, wrecked), y: 0.94, avoid: [{ x: -1.6, z: -hd + 0.4, w: 1.4, d: 0.5 }, { x: 0.3, z: -hd + 0.5, w: 0.6, d: 0.5 }] }));
  // island table with stools + a pot-rack of swinging utensils
  const island = FUR.table({ kind: 'rect', w: 1.8, d: 0.8, h: 0.92, color: 0xc89a62, top: 0xe8d8b8 }); R.place(island, 0.2, 0, 0.5);
  on(island, DEC.flowerVase(0xff7aa0), -0.5, 0.92, 0.0); on(island, DEC.mug(0x3a78d0), 0.1, 0.92, 0.2); const pt = APP.pot({ r: 0.14, h: 0.16, color: 0xc84a4a, lid: true }); on(island, pt, 0.5, 0.92, -0.05);
  R.g.add(clutter({ x: 0.2, z: 0.5, w: 1.6, d: 0.7 }, { kind: ['food', 'dishes'], seed: seed + 6, density: 1.6, y: 0.94, avoid: [{ x: -0.3, z: 0.5, w: 0.3, d: 0.3 }, { x: 0.7, z: 0.45, w: 0.4, d: 0.4 }, { x: 0.3, z: 0.7, w: 0.3, d: 0.3 }] }));
  for (const x of [-0.5, 0.2, 0.9]) R.place(R.topple(FUR.chair({ kind: 'bar', seat: 0xd4553a }), 0.2, 0.45), x + 0.0, 0, 1.15);
  const rack = new THREE.Group(); P(rack, cg(0.012, 0.012, 1.3, 6), mat(0x2a2a30, { metal: 0.6 }), [0, 0, 0], [0, 0, HP]); const sw = []; for (let i = 0; i < 6; i++) { const u = new THREE.Group(); u.position.set(-0.55 + i * 0.22, 0, 0); P(u, cg(0.006, 0.006, 0.25, 5), mat(0x2a2a30), [0, -0.12, 0]); if (i % 2) P(u, cg(0.07, 0.07, 0.02, 12), mat(0xc8ccd6, { metal: 0.8 }), [0, -0.27, 0]); else P(u, rg(0.07, 0.15, 0.02, 0.01), mat(0xc8ccd6, { metal: 0.8 }), [0, -0.3, 0]); rack.add(u); sw.push([u, i]); }
  for (const x of [-0.6, 0.6]) P(rack, cg(0.004, 0.004, 0.5, 4), mat(0x2a2a30), [x, 0.25, 0]); rack.userData.update = (t) => sw.forEach(([u, i]) => { u.rotation.z = Math.sin(t * 1.3 + i) * 0.05 + 0.02 * Math.sin(t * 3 + i * 2); u.rotation.x = Math.cos(t * 0.9 + i) * 0.03; });
  R.place(rack, 0.2, 2.35, 0.5);
  // right side: washing machine + bin + dog bed with a dog; left: shelf pantry
  const wm = APP.washingMachine(); R.place(wm, hw - 0.4, 0, -hd + 1.5, -HP);
  const bin = new THREE.Group(); P(bin, new THREE.CylinderGeometry(0.22, 0.18, 0.6, 16), mat(0xc8ccd6, { metal: 0.6, rough: 0.35 }), [0, 0.3, 0], [0, 0, 0], 1, true); P(bin, new THREE.CylinderGeometry(0.23, 0.23, 0.04, 16), mat(0x2a2a30), [0, 0.62, 0]); R.place(bin, hw - 0.4, 0, -hd + 2.3);
  const dogbed = new THREE.Group(); P(dogbed, cg(0.55, 0.5, 0.14, 24), mat(0xe05a7a, { rough: 1 }), [0, 0.07, 0]); P(dogbed, cg(0.42, 0.42, 0.06, 24), mat(0xf6e0d0, { rough: 1 }), [0, 0.15, 0]); R.place(dogbed, hw - 1.1, 0, 1.4);
  const dog = DEC.pet('dog', { pose: 'loaf', fur: 0xc8905a }); dog.scale.setScalar(0.85); R.place(dog, hw - 1.1, 0.14, 1.4, 2.5);
  const shelf = FUR.shelfFilled({ w: 0.9, h: 1.9, d: 0.34, kind: 'pantry', seed: seed + 8, color: 0xc89a62 }); R.place(shelf, -hw + 0.22, 0, 0.9, HP);
  // clock, calendar poster, family photos, door, pendants, ceiling light
  const clk = DEC.wallClock(0.24, { color: 0xfff6d8, frame: 0xd4553a, h0: 6, m0: 20 }); mountOnWall(R, clk, 1.95, 2.3);
  const pc = DEC.poster(0.45, 0.6, { kind: 'abstract', seed: 4, frame: 0xffffff }); pc.position.set(-hw + 0.003, 1.55, -0.6); pc.rotation.y = HP; g.add(pc);
  const dor = door({ color: 0x3a8a9a, frame: 0xffffff, glass: true }); R.place(dor, hw - 0.04, 0, hd - 1.3, -HP);
  const p1 = DEC.pendant(0xffd23f, { drop: 0.55, r: 0.2, swing: 0.03 }); R.place(p1, -0.5, h, 0.5); const p2 = DEC.pendant(0xe04a3a, { drop: 0.55, r: 0.2, swing: 0.03 }); R.place(p2, 0.9, h, 0.5);
  R.place(rug(1.6, 1.0, { colors: [0x3a8a9a, 0xf2e8d0, 0xd4553a] }), -0.3, 0, -hd + 1.05);
  const lf = DEC.fluorescent(1.1, { flicker: 0.0 }); R.place(lf, -1.7, h, 0.3);
  // wrecked: cupboard doors hang open + stuff on the floor
  if (wrecked > 0.2) R.g.add(clutter({ x: -0.2, z: 0.7, w: 4.5, d: 2.4 }, { kind: 'kitchen', seed: seed + 20, density: wrecked * 2.5, avoid: [{ x: 0.2, z: 0.5, w: 2, d: 1.0 }] }));
  return R.finish({ island, cooker, fridge: fr }, camFor(R, { fov: 56, y: 1.6 }));
}

// ---------------------------------------------------------------- dining room with a set table
export function buildDiningRoom({ seed = 3, wrecked = 0, ceiling = true, detail = 'high' } = {}) {
  const R = room({ w: 5.8, d: 4.8, h: 2.9, seed, wrecked, ceiling, wall: 0x8a3a4a, wall2: 0x7a3040, trim: 0xf2ead8, wainscot: 0xf2ead8, floor: { type: 'planks', colors: [0x6a4428, 0x5e3a22, 0x74502e, 0x5a3820], pw: 0.14 }, hole: { x: 1.9, y: 1.9, r: 0.6 }, name: 'diningRoom' });
  const { g, w, d, h } = R; const hw = w / 2, hd = d / 2; const r = R.r;
  // big window with long curtains (back wall centre) + sideboard + paintings
  const win = DEC.windowView(1.5, 1.4, { view: 'garden', seed, frame: 0xf2ead8, panes: [3, 2] }); R.place(win, 0, 1.75, -hd);
  const cur = DEC.curtains(1.5, 2.1, 0xe8c85a, { phase: 0.2, sway: 0.06 }); R.place(cur, 0, 2.62, -hd + 0.05);
  const sb = FUR.sideboard({ w: 1.7, h: 0.88, color: 0x4a2e1c }); R.place(R.topple(sb, 0.8, 0.8), -1.95, 0, -hd + 0.3); const pb = FUR.sideboard({ w: 1.7, h: 0.88, color: 0x4a2e1c }); R.place(pb, 1.95, 0, -hd + 0.3);
  on(sb, DEC.plant({ kind: 'fern', h: 0.7, seed: 3, pot: 0xe8d8b8 }), -0.5, 0.93, 0.0); on(sb, DEC.flowerVase(0xffd23f, { seed: 3 }), 0.4, 0.93, 0.0); const wine = new THREE.Group(); for (let i = 0; i < 3; i++) { P(wine, cg(0.04, 0.04, 0.2, 10), mat([0x2a5a2a, 0x5a1a2a, 0x2a5a2a][i], { rough: 0.2 }), [i * 0.1, 0.1, 0]); P(wine, cg(0.015, 0.02, 0.1, 8), mat([0x2a5a2a, 0x5a1a2a, 0x2a5a2a][i], { rough: 0.2 }), [i * 0.1, 0.25, 0]); } on(sb, wine, -0.1, 0.93, 0.05);
  on(pb, DEC.bookStack(5, { seed: 2 }), -0.4, 0.93, 0.0); on(pb, DEC.globe(0.12), 0.1, 0.93, 0.0); on(pb, DEC.tableLamp(0xf2d27a), 0.55, 0.93, -0.05);
  for (const [x, c, k] of [[-1.95, 0xd8a040, 'landscape'], [1.95, 0xd8a040, 'portrait']]) { const p = DEC.poster(0.8, 0.6, { kind: k, seed: Math.round(x * 3) + 12, frame: 0xc9a062 }); p.position.set(x, 1.75, -hd + 0.003); g.add(p); }
  // the table: cloth, centrepiece, plates, cutlery, glasses, candles with flickering flames, roast with steam
  const tw = 2.5, td = 1.05; const table = FUR.table({ kind: 'rect', w: tw, d: td, h: 0.76, color: 0x5a3820, top: 0x7a5232, cloth: 0xf6f0e4 });
  const th = 0.776; const plates = [], cut = [];
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = (i - 1) * 0.72, z = s * 0.34; plates.push({ p: [x, th + 0.008, z], s: [0.24, 0.016, 0.24], c: 0xffffff }); plates.push({ p: [x, th + 0.017, z], s: [0.15, 0.006, 0.15], c: 0xe8f0ff }); cut.push({ p: [x - 0.17, th + 0.004, z], s: [0.008, 0.006, 0.17], c: 0xc8ccd6 }, { p: [x + 0.17, th + 0.004, z], s: [0.008, 0.006, 0.17], c: 0xc8ccd6 }, { p: [x + 0.2, th + 0.004, z], s: [0.008, 0.006, 0.15], c: 0xc8ccd6 }); }
  inst(table, cg(0.5, 0.5, 1, 18), mat(0xffffff, { rough: 0.2 }), plates); inst(table, bg(1, 1, 1), mat(0xc8ccd6, { metal: 0.8, rough: 0.3 }), cut);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = (i - 1) * 0.72 + 0.12, z = s * 0.34 - 0.2 * s; P(table, new THREE.CylinderGeometry(0.035, 0.025, 0.1, 12, 1, true), mat(0xcfeaff, { opacity: 0.5, rough: 0.05, side: THREE.DoubleSide }), [x, th + 0.05, z]); P(table, cg(0.022, 0.022, 0.05, 10), mat(0xb02a4a, { opacity: 0.7, rough: 0.1 }), [x, th + 0.03, z]); }
  const flames = []; for (const x of [-0.4, 0.4]) { P(table, cg(0.025, 0.025, 0.28, 10), mat(0xf6f0e4, { rough: 0.6 }), [x, th + 0.14 + 0.0, 0]); P(table, cg(0.05, 0.06, 0.02, 12), mat(0xc9a062, { metal: 0.6 }), [x, th + 0.01, 0]); const f = P(table, new THREE.ConeGeometry(0.02, 0.07, 8), glow(0xffa030, 2.2), [x, th + 0.32, 0]); flames.push(f); }
  const roast = new THREE.Group(); P(roast, cg(0.2, 0.18, 0.05, 20), mat(0xffffff, { rough: 0.2 }), [0, 0.025, 0]); P(roast, sg(0.13, 14, 10), mat(0xb8682a, { rough: 0.5 }), [0, 0.1, 0], [0, 0, 0], [1.3, 0.8, 1]); for (let i = 0; i < 6; i++) P(roast, sg(0.035, 8, 6), mat(i % 2 ? 0xff8a2b : 0x3fa060), [Math.cos(i * 1.1) * 0.18, 0.07, Math.sin(i * 1.1) * 0.12]); const st = DEC.steam(5, { h: 0.3, r: 0.05, op: 0.3 }); st.position.y = 0.16; roast.add(st); on(table, roast, 0.0, th, 0.0);
  on(table, DEC.flowerVase(0xff5c8a, { seed: 9 }), 0.78, th, 0.0); on(table, DEC.flowerVase(0xffd23f, { seed: 10 }), -0.78, th, 0.0);
  table.userData.update = (t) => flames.forEach((f, i) => { f.scale.set(1 + 0.12 * Math.sin(t * 17 + i), 1 + 0.25 * Math.sin(t * 13 + i * 2), 1); f.rotation.z = Math.sin(t * 9 + i) * 0.08; });
  R.place(table, 0, 0, 0.1);
  // eight chairs (two toppled when wrecked)
  const cc = [-0.8, 0, 0.8]; cc.forEach((x, i) => { for (const s of [-1, 1]) { const ch = FUR.chair({ kind: 'dining', seat: i % 2 ? 0xb02a4a : 0xd8a040, color: 0x5a3820 }); R.place(R.topple(ch, 0.24, 0.45 + i * 0.12), x * 0.9, 0, 0.1 + s * 0.78, s > 0 ? PI : 0); } });
  const hc1 = FUR.chair({ kind: 'dining', seat: 0xb02a4a, color: 0x5a3820 }); R.place(hc1, -1.6, 0, 0.1, HP); const hc2 = FUR.chair({ kind: 'dining', seat: 0xb02a4a, color: 0x5a3820 }); R.place(R.topple(hc2, 0.24, 0.6), 1.6, 0, 0.1, -HP);
  R.place(rug(3.6, 2.3, { colors: [0x2a3a6a, 0xc9a062, 0x8a3a4a, 0xf2ead8] }), 0, 0, 0.1);
  // chandelier: swinging, glowing candle bulbs
  const ch = new THREE.Group(); const csw = new THREE.Group(); ch.add(csw); P(csw, cg(0.01, 0.01, 0.6, 6), mat(0x15151c), [0, -0.3, 0]); P(csw, cg(0.04, 0.04, 0.2, 10), mat(0xd8b040, { metal: 0.8, rough: 0.3 }), [0, -0.7, 0]); P(csw, new THREE.TorusGeometry(0.4, 0.015, 6, 28), mat(0xd8b040, { metal: 0.8, rough: 0.3 }), [0, -0.75, 0], [HP, 0, 0]);
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6; P(csw, cg(0.016, 0.016, 0.09, 8), mat(0xf6f0e4), [Math.cos(a) * 0.4, -0.7, Math.sin(a) * 0.4]); P(csw, new THREE.ConeGeometry(0.014, 0.04, 6), glow(0xffd070, 2), [Math.cos(a) * 0.4, -0.63, Math.sin(a) * 0.4]); P(csw, sg(0.018, 6, 5), mat(0xcfeaff, { opacity: 0.6, rough: 0.05 }), [Math.cos(a) * 0.4, -0.82, Math.sin(a) * 0.4]); }
  ch.userData.update = (t) => { csw.rotation.z = Math.sin(t * 0.7) * 0.025; csw.rotation.x = Math.cos(t * 0.55) * 0.02; csw.rotation.y = t * 0.1; }; R.place(ch, 0, h, 0.1);
  const clk = DEC.wallClock(0.26, { frame: 0xc9a062, h0: 6, m0: 55 }); mountOnWall(R, clk, 0, 2.75);
  const dor = door({ color: 0xf2ead8, frame: 0xf2ead8 }); R.place(dor, -hw + 0.04, 0, hd - 1.2, HP);
  const pl = DEC.plant({ kind: 'tree', h: 1.6, seed: 5 }); R.place(pl, hw - 0.5, 0, hd - 0.9);
  R.g.add(clutter({ x: 0, z: 0.1, w: 5, d: 3.6 }, { kind: ['dishes', 'food'], seed: seed + 3, density: wrecked * 2.2, avoid: [] }));
  return R.finish({ table }, camFor(R, { fov: 56, y: 1.7, ty: 1.1 }));
}

// ---------------------------------------------------------------- bathroom
export function buildBathroom({ seed = 4, wrecked = 0, ceiling = true, detail = 'high' } = {}) {
  const R = room({ w: 3.9, d: 3.6, h: 2.6, seed, wrecked, ceiling, wall: 0xcfe8ec, wall2: 0xc4e0e6, trim: 0xffffff, floor: { type: 'tiles', size: 0.3, c1: 0xdce8ec, c2: 0x7ab0c4, grout: 0xb8c8cc }, hole: { x: 0.9, y: 2.0, r: 0.45 }, name: 'bathroom' });
  const { g, w, d, h } = R; const hw = w / 2, hd = d / 2;
  wallTiles(R, 'back', [-hw + 0.03, hw - 0.03, 0.02, 1.7], { size: 0.2, c1: 0xf4f8f8, c2: 0x4a9ab8, pattern: 'rows', seed });
  wallTiles(R, 'left', [-hd + 0.03, hd - 0.03, 0.02, 1.7], { size: 0.2, c1: 0xf4f8f8, c2: 0x4a9ab8, pattern: 'rows', seed });
  wallTiles(R, 'right', [-hd + 0.03, hd - 0.03, 0.02, 1.7], { size: 0.2, c1: 0xf4f8f8, c2: 0x4a9ab8, pattern: 'rows', seed });
  // bath under a frosted window, duck, foam; shower on the right; toilet + basin on the left
  const bath = APP.bathtub({ w: 1.7, d: 0.75 }); R.place(bath, -hw + 1.0, 0, -hd + 0.42);
  const duck = new THREE.Group(); P(duck, sg(0.06, 10, 8), mat(0xffd23f, { rough: 0.3 }), [0, 0.05, 0], [0, 0, 0], [1.2, 0.9, 1]); P(duck, sg(0.04, 10, 8), mat(0xffd23f, { rough: 0.3 }), [0.05, 0.12, 0]); P(duck, new THREE.ConeGeometry(0.02, 0.04, 6), mat(0xff8a2b), [0.1, 0.12, 0], [0, 0, -HP]); P(duck, sg(0.008, 5, 4), mat(0x111111), [0.075, 0.14, 0.025]);
  duck.userData.update = (t) => { duck.position.set(-hw + 1.0 + Math.sin(t * 0.4) * 0.3, 0.52 + Math.sin(t * 2.1) * 0.008, -hd + 0.42 + Math.sin(t * 0.6) * 0.08); duck.rotation.y = Math.sin(t * 0.4) * 0.6; duck.rotation.z = Math.sin(t * 2.1) * 0.06; }; R.place(duck, -hw + 1.0, 0.52, -hd + 0.42);
  const win = DEC.windowView(1.0, 0.8, { view: 'grey', seed, frame: 0xffffff, panes: [2, 2] }); R.place(win, -hw + 1.0, 1.85, -hd);
  const bl = DEC.blinds(1.0, 0.8, 0xf2ead8, { open: 0.9 }); R.place(bl, -hw + 1.0, 2.25, -hd + 0.1);
  const sh = APP.shower({ w: 1.0, h: 2.1 }); R.place(sh, hw - 0.55, 0, -hd + 0.55);
  const toilet = APP.toilet(); R.place(R.topple(toilet, 0.25, 0.85), hw - 0.45, 0, 0.4, -HP); const roll = APP.toiletRoll(); R.place(roll, hw - 0.12, 0.7, 0.8, 0); roll.rotation.y = -HP;
  const basin = APP.basin({ w: 0.8, vcolor: 0x4a9ab8 }); R.place(basin, 0.5, 0, -hd + 0.3);
  const mir = DEC.mirror(0.7, 0.9, { frame: 0xc8ccd6 }); mir.position.set(0.5, 1.65, -hd + 0.0); g.add(mir);
  const mc = new THREE.Group(); P(mc, rg(0.5, 0.65, 0.12, 0.02), mat(0xf4f4f6), [0, 0, 0.06]); R.place(mc, 1.45, 1.7, -hd + 0.02);
  on(basin, DEC.mug(0x3a78d0, { steamOn: false }), -0.3, 0.87, 0.1); const tb = new THREE.Group(); P(tb, cg(0.02, 0.02, 0.18, 8), mat(0xff5c8a), [0, 0.09, 0], [0, 0, 0.2]); on(basin, tb, -0.28, 0.87, 0.1);
  const soap = new THREE.Group(); P(soap, cg(0.05, 0.05, 0.14, 12), mat(0xff8aa0, { rough: 0.3 }), [0, 0.07, 0]); P(soap, cg(0.015, 0.015, 0.05, 8), mat(0xffffff), [0.0, 0.17, 0]); on(basin, soap, 0.3, 0.87, 0.08);
  const tr = APP.towelRail(); mountOnWall(R, tr, -0.4, 1.25, 'back'); const tr2 = APP.towelRail({ w: 0.5 }); mountOnWall(R, tr2, -hd + 1.4, 1.3, 'left');
  const shelf = DEC.wallShelf(0.8, { seed: seed + 2 }); mountOnWall(R, shelf, -hd + 1.3, 1.85, 'left');
  R.place(rug(0.9, 0.55, { colors: [0xff7aa0, 0xffd0dc] }), 0.2, 0, -hd + 1.05); R.place(rug(0.6, 0.4, { colors: [0x6ad0ff, 0xcfeaff] }), hw - 0.7, 0, -hd + 1.4);
  const lb = new THREE.Group(); P(lb, new THREE.CylinderGeometry(0.22, 0.18, 0.55, 14), mat(0xe8d8b8, { rough: 1 }), [0, 0.28, 0], [0, 0, 0], 1, true); P(lb, rg(0.3, 0.14, 0.05, 0.02), mat(0xff7aa0, { rough: 1 }), [0.03, 0.6, 0], [0, 0, 0.5]); R.place(R.topple(lb, 0.2, 0.7), -hw + 0.5, 0, hd - 0.7);
  const pl = DEC.plant({ kind: 'fern', h: 0.9, seed: 8, pot: 0xffffff }); R.place(pl, 1.15, 0, hd - 0.6);
  const dor = door({ color: 0x4a9ab8, frame: 0xffffff }); R.place(dor, -hw + 0.04, 0, hd - 1.1, HP);
  const lt = DEC.panelLight(0.5, 0.5); R.place(lt, 0, h, 0.2);
  const steamA = DEC.steam(8, { h: 1.6, r: 0.25, op: 0.12, speed: 0.12 }); R.place(steamA, hw - 0.8, 0.9, -hd + 0.6);
  R.g.add(clutter({ x: 0, z: 0.5, w: 3.2, d: 2.0 }, { kind: 'clothes', seed: seed + 5, density: 0.8 + wrecked * 2, avoid: [] }));
  return R.finish({ bath }, camFor(R, { fov: 58, y: 1.5, ty: 1.2, fit: 0.95 }));
}

// ---------------------------------------------------------------- full living room (cluttered, fireplace, pets, TV)
export function buildLivingRoomFull({ seed = 5, wrecked = 0, ceiling = true, detail = 'high' } = {}) {
  const R = room({ w: 6.6, d: 5.4, h: 2.9, seed, wrecked, ceiling, wall: 0xf0d8a8, wall2: 0xe8caa0, trim: 0xffffff, floor: { type: 'planks', colors: [0xb07a48, 0xa86f40, 0xb8824e, 0x9e683a] }, hole: { x: 1.9, y: 1.95, r: 0.62 }, name: 'livingRoom' });
  const { g, w, d, h } = R; const hw = w / 2, hd = d / 2; const r = R.r;
  // fireplace centre of the back wall: brick surround, mantel with clock + photos, flickering fire
  const fp = new THREE.Group(); P(fp, bg(2.0, 1.25, 0.4), mat(0xb5553a, { rough: 1 }), [0, 0.62, 0.2], [0, 0, 0], 1, true); for (let i = 0; i < 9; i++) P(fp, bg(2.02, 0.015, 0.405), mat(0x8a3a2a), [0, 0.1 + i * 0.14, 0.2]); P(fp, bg(1.0, 0.8, 0.02), mat(0x15100c), [0, 0.5, 0.405]); P(fp, rg(2.3, 0.08, 0.55, 0.02), mat(0x6a4428, { rough: 0.5 }), [0, 1.29, 0.28], [0, 0, 0], 1, true); P(fp, bg(1.05, 0.06, 0.45), mat(0x3a3a40), [0, 0.1, 0.4]);
  P(fp, bg(1.0, 0.04, 0.12), mat(0x3a3a40), [0, 0.78, 0.42]);
  const fl = []; for (let i = 0; i < 5; i++) { const f = P(fp, new THREE.ConeGeometry(0.1 - i * 0.008, 0.4, 8), glow([0xff5a1a, 0xff8a2a, 0xffb040, 0xff6a2a, 0xffd060][i], 1.8), [(i - 2) * 0.17, 0.3, 0.45]); fl.push(f); }
  for (let i = 0; i < 3; i++) P(fp, cg(0.06, 0.06, 0.8, 8), mat(0x4a2e1c, { rough: 1 }), [0, 0.15 + i * 0.01, 0.43 + (i - 1) * 0.0], [0, 0, HP], 1, false).position.x = (i - 1) * 0.0;
  fp.userData.update = (t) => fl.forEach((f, i) => { const k = 1 + 0.3 * Math.sin(t * 9 + i * 2.3) + 0.15 * Math.sin(t * 17 + i); f.scale.set(1 - 0.1 * (k - 1), k, 1); f.position.y = 0.3 + 0.2 * (k - 1) * 0.5; f.rotation.z = Math.sin(t * 7 + i) * 0.1; });
  R.place(fp, 0, 0, -hd);
  const mc = new THREE.Group(); const clk = DEC.wallClock(0.16, { frame: 0x6a4428, h0: 8, m0: 30 }); clk.rotation.x = -0.0; P(mc, cg(0.12, 0.14, 0.02, 12), mat(0x6a4428), [0, 0.01, 0]); clk.position.set(0, 0.2, 0.0); mc.add(clk); R.place(mc, 0.0, 1.34, -hd + 0.35);
  for (const [x, c] of [[-0.7, 0xffd23f], [0.7, 0xff7a8a]]) { const p = DEC.poster(0.28, 0.36, { kind: x < 0 ? 'portrait' : 'landscape', seed: 3, frame: 0x5a3a22 }); p.position.set(x, 1.55, 0.2); p.rotation.x = 0; fp.add(p); }
  const art = DEC.poster(1.2, 0.8, { kind: 'sunset', seed: 4, frame: 0xc9a062 }); art.position.set(0, 2.2, -hd + 0.003); g.add(art);
  // windows either side + curtains
  for (const [x, ph] of [[-2.2, 0], [2.2, 1.7]]) { const win = DEC.windowView(1.2, 1.3, { view: x < 0 ? 'day' : 'garden', seed: seed + (x < 0 ? 1 : 2), frame: 0xffffff }); R.place(win, x, 1.75, -hd); const cu = DEC.curtains(1.2, 1.9, x < 0 ? 0xd8604a : 0x3f9a8a, { phase: ph, sway: 0.055 }); R.place(cu, x, 2.62, -hd + 0.05); }
  // seating: sofa facing the TV is on the camera side? keep the sofa back to the camera's left, armchair right, TV on the left wall
  const sofa = FUR.sofa({ seats: 3, color: 0x3f6fb5, seed: 1 }); R.place(R.topple(sofa, 1.1, 0.9), -hw + 1.5, 0, 0.8, HP);
  const sofa2 = FUR.sofa({ seats: 2, color: 0xd8605a, seed: 2 }); R.place(sofa2, 0.2, 0, hd - 0.7, PI);
  const arm = FUR.armchair({ color: 0x6aa86a }); R.place(R.topple(arm, 0.5, 0.55), hw - 1.5, 0, 0.9, -HP - 0.5);
  const cat = DEC.pet('cat', { pose: 'loaf', fur: 0xe9e0d0, stripe: 0xb8a888 }); cat.scale.setScalar(0.85); R.place(cat, -hw + 1.55, 0.58, 1.55, HP + 0.2);
  const ct = FUR.coffeeTable(0x7a5232); R.place(R.topple(ct, 0.55, 0.7), -0.7, 0, 0.9);
  on(ct, DEC.mug(0xe04a3a), -0.3, 0.42, 0.05); on(ct, DEC.mug(0x3fa060), 0.0, 0.42, -0.12); on(ct, DEC.bookStack(3, { seed: 4 }), 0.35, 0.42, 0.0); const pz = new THREE.Group(); P(pz, bg(0.32, 0.04, 0.32), mat(0xc8a060, { rough: 1 }), [0, 0.02, 0]); P(pz, new THREE.CylinderGeometry(0.14, 0.14, 0.012, 3), mat(0xffc040), [0, 0.046, 0], [0, 0.6, 0]); on(ct, pz, 0.1, 0.42, 0.2, 0.4);
  const rc = new THREE.Group(); P(rc, rg(0.16, 0.025, 0.05, 0.01), mat(0x15151c), [0, 0.0125, 0]); on(ct, rc, -0.4, 0.42, 0.2, 0.5);
  // TV + console on the left wall
  const tvs = FUR.tvStand({ w: 1.7 }); const tv = ELEC.tv({ w: 1.35, kind: 'tv', seed: seed + 3, wall: false }); on(tvs, tv, 0.0, 0.45, 0.0); on(tvs, ELEC.gameConsole(), -0.6, 0.45, 0.1); on(tvs, ELEC.router(), 0.62, 0.45, 0.05); on(tvs, ELEC.speaker({ h: 0.6 }), -1.05, 0.0, 0.0); on(tvs, ELEC.speaker({ h: 0.6 }), 1.05, 0.0, 0.0);
  R.place(R.topple(tvs, 0.8, 0.8), -hw + 0.32, 0, 0.8 - 1.6 + 0.0 + 0.0, HP);  // TV on the left wall in front of the sofa? (sofa is in front, facing TV)
  // bookshelves right side + back corners, filled
  const bk = FUR.shelfFilled({ w: 1.2, h: 2.0, kind: 'books', seed: seed + 1 }); R.place(R.topple(bk, 0.6, 0.7), hw - 0.2, 0, -hd + 1.0, -HP); const bk2 = FUR.shelfFilled({ w: 1.2, h: 2.0, kind: 'mixed', seed: seed + 2, color: 0x4a2e1c }); R.place(bk2, -hw + 0.2, 0, -hd + 0.9, HP);
  const bk3 = FUR.shelfFilled({ w: 1.0, h: 1.4, kind: 'toys', seed: seed + 3, color: 0xe8d8b8, rows: 3 }); R.place(bk3, hw - 0.2, 0, -hd + 2.3, -HP);
  // gallery wall, floor lamp, plants, rug, toys on the floor, dog
  const gal = DEC.gallery(7, { w: 2.0, h: 1.1, seed: seed + 6 }); gal.position.set(hw - 0.0, 1.95, 0.9); gal.rotation.y = -HP; g.add(gal);
  const lamp = DEC.floorLamp(0xfff0d0, { style: 'arc' }); R.place(R.topple(lamp, 0.3, 0.5), hw - 0.9, 0, 0.2, 0);
  R.place(DEC.plant({ kind: 'monstera', h: 1.5, seed: 2 }), -hw + 0.5, 0, -hd + 2.2); R.place(DEC.plant({ kind: 'tree', h: 1.8, seed: 5, pot: 0x6aa0c8 }), hw - 0.45, 0, hd - 0.5); R.place(DEC.hangingPlant({ seed: 2 }), 1.9, 2.5, -hd + 0.4);
  R.place(rug(3.2, 2.3, { colors: [0xc84a4a, 0xf2d27a, 0x3a78a8, 0xf2ead8] }), -0.5, 0, 0.8);
  const dog = DEC.pet('dog', { pose: 'sleep', fur: 0xd8a060 }); dog.scale.setScalar(0.9); R.place(dog, 0.9, 0, 1.5, 0.8);
  const fan = DEC.ceilingFan({ r: 0.7, color: 0x6a4428 }); R.place(fan, -0.2, h, 0.6);
  R.g.add(clutter({ x: -0.3, z: 1.1, w: 5.4, d: 3.6 }, { kind: 'mixed', seed: seed + 9, density: dens(1.4, wrecked), avoid: [{ x: -hw + 0.8, z: 0.8, w: 1.4, d: 3 }, { x: -0.7, z: 0.9, w: 1.4, d: 0.8 }, { x: 0.2, z: hd - 0.7, w: 1.9, d: 1.0 }, { x: hw - 1.5, z: 0.9, w: 1.1, d: 1.1 }] }));
  const dor = door({ color: 0xc8302b }); R.place(dor, hw - 0.04, 0, hd - 1.1, -HP);
  return R.finish({ sofa, tv, rug: null }, camFor(R, { fov: 56, y: 1.7, ty: 1.1 }));
}

// ---------------------------------------------------------------- hallway + stairs
export function buildHallwayStairs({ seed = 6, wrecked = 0, ceiling = true, detail = 'high' } = {}) {
  const R = room({ w: 4.0, d: 7.6, h: 3.3, seed, wrecked, ceiling, wall: 0xe8d8b8, wall2: 0xe0cca4, trim: 0xffffff, wainscot: 0x6a8a7a, floor: { type: 'tiles', size: 0.4, c1: 0xe8e0d0, c2: 0x4a4a52, grout: 0x9a9a98 }, hole: { x: -0.7, y: 1.9, r: 0.55 }, name: 'hallway' });
  const { g, w, d, h } = R; const hw = w / 2, hd = d / 2;
  // front door at the end with side lights; welcome mat; post on the floor
  const dor = door({ w: 1.0, h: 2.2, color: 0x2f6a4a, frame: 0xffffff, glass: true }); R.place(dor, 0.0, 0, -hd);
  for (const s of [-1, 1]) { const sl = DEC.windowView(0.35, 1.8, { view: 'garden', seed: s + 3, frame: 0xffffff, panes: [1, 3], sill: false }); R.place(sl, s * 1.0, 1.25, -hd); }
  R.place(rug(0.9, 0.55, { colors: [0x6a4428, 0xc9a062] }), 0, 0, -hd + 0.6);
  R.g.add(clutter({ x: 0, z: -hd + 1.1, w: 1.4, d: 0.8 }, { kind: ['papers'], seed: seed + 1, density: 3 + wrecked * 3, avoid: [] }));
  // stairs along the right wall rising towards the back
  const st = stairs({ n: 14, w: 1.05, rise: 0.2, run: 0.28, side: -1 }); R.place(st, hw - 0.6, 0, hd - 0.5, 0);
  const upper = new THREE.Group(); P(upper, bg(1.4, 0.2, 1.6), mat(0xc99a62), [0, 2.8, 0]); R.place(upper, hw - 0.7, 0, -hd + 0.9, 0);
  // left wall: console table, mirror, lamp, coat rack, shoes, umbrella stand, gallery, clock
  const cons = FUR.sideboard({ w: 1.3, h: 0.82, color: 0x4a2e1c }); R.place(cons, -hw + 0.28, 0, 0.0, HP); on(cons, DEC.tableLamp(0xffd23f), 0.4, 0.88, 0.0); on(cons, DEC.flowerVase(0xff7aa0, { seed: 2 }), -0.2, 0.88, 0.0); const keys = new THREE.Group(); P(keys, rg(0.2, 0.012, 0.1, 0.005), mat(0xc9a062), [0, 0.006, 0]); on(cons, keys, 0.05, 0.88, 0.1);
  const mir = DEC.mirror(0.7, 1.0, { round: false, frame: 0xc9a062 }); mir.position.set(-hw + 0.003, 1.65, 0.0); mir.rotation.y = HP; g.add(mir);
  const gal = DEC.gallery(6, { w: 2.2, h: 0.95, seed: seed + 1 }); gal.position.set(-hw + 0.003, 2.1, -2.2); gal.rotation.y = HP; g.add(gal);
  const gal2 = DEC.gallery(5, { w: 1.6, h: 0.9, seed: seed + 5 }); gal2.position.set(-hw + 0.003, 2.1, 2.1); gal2.rotation.y = HP; g.add(gal2);
  const cr = DEC.coatRack(seed); R.place(R.topple(cr, 0.2, 0.5), -hw + 0.4, 0, 1.6);
  const shoes = clutter({ x: -hw + 0.55, z: 2.6, w: 0.8, d: 1.0 }, { kind: 'clothes', seed: seed + 3, density: 3, avoid: [] }); R.g.add(shoes);
  const us = new THREE.Group(); P(us, new THREE.CylinderGeometry(0.14, 0.12, 0.5, 12, 1, true), mat(0x2a2a30, { metal: 0.5, side: THREE.DoubleSide }), [0, 0.25, 0], [0, 0, 0], 1, true); for (let i = 0; i < 3; i++) { P(us, cg(0.008, 0.008, 0.9, 5), mat([0xe04a3a, 0x15151c, 0x3a78d0][i], { rough: 0.5 }), [(i - 1) * 0.05, 0.5, 0], [0, 0, (i - 1) * 0.12]); P(us, new THREE.TorusGeometry(0.02, 0.006, 5, 8, Math.PI), mat(0x15151c), [(i - 1) * 0.05 + (i - 1) * 0.11, 0.96, 0], [0, 0, 0]); } R.place(us, -hw + 0.4, 0, -1.7);
  const clk = DEC.wallClock(0.3, { frame: 0x4a2e1c, h0: 3, m0: 14 }); clk.position.set(0, 2.9, -hd + 0.0); R.place(clk, -1.0, 2.7, -hd);
  // runner rug along the hall, plants, pendants swinging, wall lights, cat on the stairs
  R.place(rug(1.1, 5.2, { colors: [0x8a3a4a, 0xf2ead8, 0x8a3a4a] }), -0.5, 0, 0.1);
  R.place(DEC.plant({ kind: 'tree', h: 1.6, seed: 6 }), -hw + 0.5, 0, -hd + 0.55); R.place(DEC.plant({ kind: 'fern', h: 0.9, seed: 8, pot: 0xffd23f }), hw - 0.4, 0, -hd + 0.4);
  for (const z of [-2.2, 0.8, 2.8]) R.place(DEC.pendant(0xf2ead8, { drop: z === 0.8 ? 0.8 : 0.5, r: 0.22, shape: 'dome', swing: 0.035 }), -0.5, h, z);
  const cat = DEC.pet('cat', { pose: 'loaf', fur: 0xf08a2e, stripe: 0xb8531a }); cat.scale.setScalar(0.8); R.place(cat, hw - 0.6, 0.2 * 6, hd - 0.5 - 0.28 * 5.5, 0);
  R.place(DEC.hangingPlant({ seed: 4 }), 0.6, 3.0, -hd + 0.6);
  return R.finish({ stairs: st }, { pos: [0.2, 1.7, hd + 2.4], target: [0, 1.3, -hd + 2.5], fov: 62 });
}

// ---------------------------------------------------------------- garage
export function buildGarage({ seed = 7, wrecked = 0, ceiling = true, detail = 'high' } = {}) {
  const R = room({ w: 6.6, d: 5.8, h: 3.0, seed, wrecked, ceiling, wall: 0xb8bcc4, wall2: 0xa8acb4, trim: 0x8a8e96, floor: { type: 'concrete', color: 0x8a8a90, stains: 4 }, hole: { x: -1.8, y: 2.0, r: 0.6 }, crown: false, name: 'garage' });
  const { g, w, d, h } = R; const hw = w / 2, hd = d / 2; const r = R.r;
  // roll-up door on the back wall: ribbed slats, windows row, rail, spring
  const dw = 3.6, dh = 2.3; const sl = []; for (let i = 0; i < 12; i++) sl.push({ p: [0, 0.1 + i * 0.19, -hd + 0.07], s: [dw, 0.17, 0.05], c: shade(0xe8e4dc, 0.94 + (i % 2) * 0.06) });
  inst(g, bg(1, 1, 1), mat(0xffffff, { rough: 0.5 }), sl, { cast: false }); for (let i = 0; i < 4; i++) P(g, bg(0.6, 0.2, 0.01), mat(0xcfeaff, { opacity: 0.6, rough: 0.05 }), [-1.35 + i * 0.9, 2.05, -hd + 0.1]);
  for (const s of [-1, 1]) P(g, bg(0.08, dh + 0.1, 0.1), mat(0x6a6e76, { metal: 0.5 }), [s * (dw / 2 + 0.05), dh / 2, -hd + 0.09]); P(g, bg(dw + 0.2, 0.12, 0.14), mat(0x6a6e76, { metal: 0.5 }), [0, dh + 0.1, -hd + 0.1]); P(g, cg(0.08, 0.08, dw, 14), mat(0x2a2a30, { metal: 0.5 }), [0, dh + 0.3, -hd + 0.25], [0, 0, HP]);
  P(g, bg(0.3, 0.4, 0.14), mat(0xd8d8d0), [dw / 2 + 0.4, 1.2, -hd + 0.1]); P(g, sg(0.03, 8, 6), glow(0xff3a2a, 2), [dw / 2 + 0.4, 1.3, -hd + 0.18]);
  // pegboard + tool outlines + workbench with vice on the left wall
  const pegW = 2.4, pegH = 1.2; const peg = new THREE.Group(); P(peg, bg(pegW, pegH, 0.03), mat(0xc89a62, { rough: 0.8 }), [0, 0, 0.015]); const holes = []; for (let i = 0; i < 20; i++) for (let j = 0; j < 10; j++) holes.push({ p: [-pegW / 2 + 0.07 + i * 0.12, -pegH / 2 + 0.07 + j * 0.12, 0.031], s: [0.012, 0.012, 0.004], c: 0x4a3a28 }); inst(peg, bg(1, 1, 1), mat(0xffffff, { rough: 1 }), holes);
  const tools = [[0xe04a3a, 0.05, 0.4, -0.9, 0.25], [0xffd23f, 0.04, 0.5, -0.5, 0.2], [0xc8ccd6, 0.035, 0.55, -0.15, 0.2], [0x3a78d0, 0.05, 0.35, 0.2, 0.25], [0xc8ccd6, 0.03, 0.6, 0.55, 0.15], [0xe04a3a, 0.06, 0.28, 0.9, 0.25]]; tools.forEach(([c, tw, th, x, y]) => { P(peg, rg(tw, th, 0.03, 0.01), mat(c, { rough: 0.4, metal: c === 0xc8ccd6 ? 0.8 : 0 }), [x, y - 0.15, 0.05]); P(peg, rg(tw * 2.2, th * 0.3, 0.035, 0.01), mat(c === 0xc8ccd6 ? 0x3a3e46 : 0x15151c), [x, y + th * 0.3 - 0.15, 0.052]); });
  peg.position.set(0, 0, 0); R.place(peg, -hw + 0.01, 1.9, -0.8, HP);
  const bench = FUR.table({ kind: 'rect', w: 2.4, d: 0.75, h: 0.92, color: 0x6a4a2a, top: 0x8a6a3a }); R.place(bench, -hw + 0.45, 0, -0.8, HP);
  P(bench, bg(2.2, 0.04, 0.6), mat(0x6a4a2a), [0, 0.3, 0.0]); const vice = new THREE.Group(); P(vice, bg(0.2, 0.12, 0.14), mat(0x3a5a8a, { metal: 0.5 }), [0, 0.06, 0]); P(vice, bg(0.05, 0.1, 0.2), mat(0xc8ccd6, { metal: 0.7 }), [0, 0.15, 0.17]); on(bench, vice, 0.8, 0.92, 0.1);
  on(bench, ELEC.boombox({ color: 0xffd23f }), -0.5, 0.92, 0.05); const bx = ELEC.boombox(); bx.visible = false; R.g.add(clutter({ x: -hw + 0.45, z: -0.8, w: 0.6, d: 2.2 }, { kind: 'tools', seed: seed + 1, density: 5, y: 0.93, avoid: [{ x: -hw + 0.45, z: -0.3, w: 0.4, d: 0.5 }, { x: -hw + 0.45, z: -1.3, w: 0.5, d: 0.4 }] }));
  // shelving units on the right wall with boxes, paint, jars
  for (const [z, sd] of [[-1.0, 1], [0.35, 2], [1.7, 3]]) { const s = FUR.shelfFilled({ w: 1.2, h: 2.1, d: 0.5, kind: sd === 2 ? 'pantry' : 'toys', seed: seed + sd, color: 0x7a8294 }); R.place(R.topple(s, 0.6, 0.55 + sd * 0.05), hw - 0.28, 0, z, -HP); }
  // car (toy-style, real 4.3 m) in the middle
  const car = new THREE.Group(); const cc = 0xd4403a; P(car, rg(1.8, 0.55, 4.2, 0.2), mat(cc, { rough: 0.25, metal: 0.3 }), [0, 0.55, 0], [0, 0, 0], 1, true); P(car, rg(1.5, 0.5, 2.0, 0.18), mat(cc, { rough: 0.25, metal: 0.3 }), [0, 1.0, -0.2], [0, 0, 0], 1, true); P(car, rg(1.4, 0.4, 1.8, 0.14), mat(0x9ad8f0, { rough: 0.05, opacity: 0.8 }), [0, 1.02, -0.2]);
  for (const sx of [-1, 1]) for (const sz of [-1.35, 1.35]) { P(car, cg(0.36, 0.36, 0.24, 18), mat(0x15151c, { rough: 0.9 }), [sx * 0.88, 0.36, sz], [0, 0, HP], 1, true); P(car, cg(0.2, 0.2, 0.26, 14), mat(0xc8ccd6, { metal: 0.8 }), [sx * 0.88, 0.36, sz], [0, 0, HP]); }
  for (const sx of [-1, 1]) { P(car, rg(0.3, 0.14, 0.05, 0.02), glow(0xfff2c8, 1.2), [sx * 0.6, 0.62, 2.08]); P(car, rg(0.3, 0.12, 0.05, 0.02), glow(0xe53030, 0.8), [sx * 0.6, 0.62, -2.08]); } P(car, bg(1.2, 0.1, 0.05), mat(0xc8ccd6, { metal: 0.8 }), [0, 0.35, 2.1]);
  car.userData.realWidthM = 1.8; car.userData.realHeightM = 1.4; R.place(R.topple(car, 0.9, 0.95), 0.9, 0, 0.0, 0.0); car.rotation.y = 0.05;
  // bikes, ladder, tyres, barrels, mower, toolbox, paint cans, bare bulbs on swinging cords, fluorescents, fan
  const tyres = new THREE.Group(); for (let i = 0; i < 4; i++) P(tyres, new THREE.TorusGeometry(0.28, 0.12, 10, 20), mat(0x15151c, { rough: 0.95 }), [0, 0.12 + i * 0.22, 0], [HP, 0, 0], 1, true); R.place(tyres, -hw + 0.7, 0, 2.2);
  const barrel = new THREE.Group(); P(barrel, cg(0.3, 0.3, 0.85, 18), mat(0x2f6a9a, { rough: 0.5, metal: 0.4 }), [0, 0.42, 0], [0, 0, 0], 1, true); for (const y of [0.15, 0.7]) P(barrel, new THREE.TorusGeometry(0.3, 0.015, 6, 20), mat(0x1a4a6a), [0, y, 0], [HP, 0, 0]); R.place(R.topple(barrel, 0.3, 0.5), hw - 0.5, 0, 2.2); R.place(R.topple(barrel.clone(), 0.3, 0.7), hw - 1.0, 0, 2.5);
  const ladder = new THREE.Group(); for (const s of [-1, 1]) P(ladder, bg(0.05, 2.0, 0.04), mat(0xe8a020, { rough: 0.5 }), [s * 0.2, 1.0, 0], [0, 0, 0], 1, true); for (let i = 0; i < 7; i++) P(ladder, cg(0.015, 0.015, 0.4, 6), mat(0xc8ccd6, { metal: 0.7 }), [0, 0.25 + i * 0.28, 0], [0, 0, HP]); ladder.rotation.x = -0.12; R.place(R.topple(ladder, 0.25, 0.5), -1.2, 0, -hd + 0.3);
  const bike = new THREE.Group(); for (const z of [-0.42, 0.42]) P(bike, new THREE.TorusGeometry(0.34, 0.025, 8, 24), mat(0x15151c), [0, 0.36, z], [0, HP, 0]); P(bike, cg(0.01, 0.01, 0.9, 5), mat(0xe04a3a, { metal: 0.4 }), [0, 0.5, 0.0], [HP, 0, 0.3]); P(bike, cg(0.01, 0.01, 0.55, 5), mat(0xe04a3a, { metal: 0.4 }), [0, 0.56, 0.18], [0.7, 0, 0]); P(bike, cg(0.01, 0.01, 0.5, 5), mat(0xe04a3a, { metal: 0.4 }), [0, 0.62, -0.4], [-0.4, 0, 0]); P(bike, bg(0.4, 0.02, 0.02), mat(0x15151c), [0, 0.86, -0.5]); P(bike, bg(0.1, 0.03, 0.2), mat(0x15151c), [0, 0.8, 0.12]); bike.scale.setScalar(1.05); R.place(R.topple(bike, 0.5, 0.6), hw - 0.9, 0, -hd + 1.7, 0);
  const mower = new THREE.Group(); P(mower, rg(0.5, 0.2, 0.7, 0.07), mat(0x3fa050, { rough: 0.4 }), [0, 0.28, 0], [0, 0, 0], 1, true); P(mower, cg(0.14, 0.14, 0.12, 14), mat(0x15151c), [0, 0.45, 0.0]); for (const x of [-0.28, 0.28]) for (const z of [-0.25, 0.25]) P(mower, cg(0.1, 0.1, 0.06, 12), mat(0x15151c), [x, 0.1, z], [0, 0, HP]); P(mower, cg(0.012, 0.012, 0.9, 6), mat(0xc8ccd6, { metal: 0.7 }), [0, 0.7, -0.5], [-0.6, 0, 0]); P(mower, bg(0.5, 0.03, 0.04), mat(0x15151c), [0, 1.1, -0.82]); R.place(mower, -hw + 1.0, 0, hd - 0.8, 0.5);
  const bulbs = []; for (const [x, z] of [[-1.8, -0.4], [1.2, 1.4]]) { const pb = new THREE.Group(); const swg = new THREE.Group(); pb.add(swg); P(swg, cg(0.006, 0.006, 0.7, 5), mat(0x15151c), [0, -0.35, 0]); P(swg, sg(0.06, 10, 8), glow(0xfff0c0, 2.2), [0, -0.75, 0]); P(swg, cg(0.03, 0.03, 0.06, 8), mat(0x8a8a90), [0, -0.68, 0]); pb.userData.update = (t) => { swg.rotation.z = Math.sin(t * 0.8 + x) * 0.05; swg.rotation.x = Math.cos(t * 0.6 + z) * 0.04; }; R.place(pb, x, h, z); }
  const fl = DEC.fluorescent(1.2, { flicker: 0.35, seed: seed }); R.place(fl, 1.0, h, -1.2); const fl2 = DEC.fluorescent(1.2, { flicker: 0, seed: seed + 3 }); R.place(fl2, -1.2, h, 1.8);
  const fan = new THREE.Group(); P(fan, cg(0.2, 0.2, 0.05, 14), mat(0x555a66, { metal: 0.5 }), [0, 0.0, 0]); const blades = new THREE.Group(); fan.add(blades); for (let i = 0; i < 4; i++) P(blades, rg(0.2, 0.012, 0.05, 0.005), mat(0xc8ccd6, { metal: 0.7 }), [Math.cos(i * HP) * 0.1, Math.sin(i * HP) * 0.1, 0.05], [0, 0, i * HP]); P(fan, cg(0.02, 0.02, 0.8, 8), mat(0x555a66), [0, -0.4, 0]); P(fan, cg(0.2, 0.22, 0.03, 12), mat(0x555a66), [0, -0.8, 0]); fan.userData.update = (t) => { blades.rotation.z = t * 22; fan.rotation.y = Math.sin(t * 0.4) * 0.5; }; fan.position.set(0, 0, 0); const fp = new THREE.Group(); fp.add(fan); fan.position.y = 1.2; R.place(fp, hw - 0.5, 0, 0.2);
  // radio on a crate, cobweb-ish cables on the ceiling, oil spills; clutter
  R.g.add(clutter({ x: 0, z: 0.8, w: 5.6, d: 4.2 }, { kind: 'garage', seed: seed + 6, density: dens(0.9, wrecked), avoid: [{ x: 0.9, z: 0, w: 2.1, d: 4.6 }] }));
  R.place(DEC.neonSign('GARAGE', '#6ad0ff', 0.8, 0.28, { flicker: 0.25, seed }), -hw + 0.1, 2.5, 1.6, HP);
  return R.finish({ car }, camFor(R, { fov: 56, y: 1.7, ty: 1.2 }));
}
