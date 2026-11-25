// INTERIORS pack: public-place sets (classroom, supermarket aisle, diner, gym, cinema, hospital room, elevator).
// Same conventions as interiors_home.js: open towards +Z, origin at floor centre, { seed, wrecked, ceiling, people } options, returns { group, update, anchors, cam, size }.
import * as THREE from 'three';
import { P, bg, rg, cg, sg, inst, tube, room, sign, rug, PAL, COL, smooth, setInst } from '../props/interiors_core.js';
import { mat, glow, rng, shade } from '../util.js';
import * as FUR from '../props/interiors_furniture.js';
import * as APP from '../props/interiors_appliances.js';
import * as ELEC from '../props/interiors_electronics.js';
import * as DEC from '../props/interiors_decor.js';
import { clutter } from '../props/interiors_clutter.js';
import { liveScreen } from '../props/interiors_screens.js';
import { camFor, door, wallTiles, sitter, stander, mountOnWall } from './interiors_common.js';

const TAU = Math.PI * 2, PI = Math.PI, HP = PI / 2;
const on = (parent, o, x, y, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; parent.add(o); return o; };

// ---------------------------------------------------------------- classroom
export function buildClassroom({ seed = 11, wrecked = 0, ceiling = true, people = true } = {}) {
  const R = room({ w: 7.6, d: 6.8, h: 3.0, seed, wrecked, ceiling, wall: 0xf4ecc8, wall2: 0xe8e0b8, trim: 0xffffff, wainscot: 0x4a8a9a, floor: { type: 'lino', color: 0xd8d0b8, color2: 0xc8bea0 }, hole: { x: 2.7, y: 2.0, r: 0.6 }, name: 'classroom' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  // whiteboard with text, clock, flag, alphabet strip, pull-down map
  const wbW = 3.4, wbH = 1.25; const wb = new THREE.Group(); P(wb, rg(wbW + 0.1, wbH + 0.1, 0.05, 0.02), mat(0xc8ccd6, { metal: 0.5 }), [0, 0, 0.025]); const bs = sign('', wbW, wbH, { bg: '#fbfbf6', px: 512, lines: ['TODAY: SIZES!', 'blue whale = 25 m', 'school bus = 12 m', 'YOU = 1.2 m'], fg: '#2a4a9a', size: 0.62, font: '700', family: '"Comic Sans MS", Inter, sans-serif' }); bs.position.z = 0.052; wb.add(bs); P(wb, bg(0.8, 0.03, 0.08), mat(0xc8ccd6, { metal: 0.5 }), [0, -wbH / 2 - 0.07, 0.07]); for (let i = 0; i < 3; i++) P(wb, cg(0.012, 0.012, 0.1, 6), mat([0xe04a3a, 0x3a78d0, 0x15151c][i]), [-0.2 + i * 0.12, -wbH / 2 - 0.045, 0.1], [0, 0, HP]);
  R.place(wb, -0.4, 1.75, -hd);
  const abc = sign('A B C D E F G H I J K L M N O P Q R S T U V W X Y Z', 3.4, 0.22, { bg: '#ffd23f', fg: '#2a4a9a', size: 0.62, px: 512 }); abc.position.set(-0.4, 2.7, -hd + 0.01); g.add(abc);
  const clk = DEC.wallClock(0.27, { frame: 0xe04a3a, h0: 10, m0: 5 }); R.place(clk, 2.0, 2.45, -hd);
  const mapP = DEC.poster(1.1, 0.8, { kind: 'map', seed: 2, frame: 0x6a4428 }); R.place(mapP, -2.8, 1.9, -hd + 0.003);
  const fl = new THREE.Group(); P(fl, cg(0.012, 0.012, 0.7, 6), mat(0xc8ccd6), [0, 0, 0], [0, 0, HP * 0.3]); const fm = P(fl, bg(0.6, 0.38, 0.01), mat(0x2a3a8a, { rough: 0.9 }), [0.3, -0.1, 0.01]); for (let i = 0; i < 4; i++) P(fl, bg(0.6, 0.05, 0.012), mat(0xe04a3a), [0.3, -0.25 + i * 0.1, 0.012]); fl.userData.update = (t) => { fm.scale.y = 1 + Math.sin(t * 2) * 0.04; fm.rotation.z = Math.sin(t * 1.5) * 0.03; }; R.place(fl, 3.0, 2.5, -hd + 0.1);
  // side walls: windows with blinds (left), bulletin boards (right), bookshelf + fish tank
  for (const z of [-2.0, 0.0, 2.0]) { const win = DEC.windowView(1.2, 1.3, { view: 'day', seed: z + 5, frame: 0xffffff }); mountOnWall(R, win, z, 1.7, 'left'); const bl = DEC.blinds(1.2, 0.5, 0xf2ead8, { open: 0.7 }); mountOnWall(R, bl, z, 2.55, 'left'); }
  const bb = DEC.bulletinBoard(1.6, 0.9, { seed }); mountOnWall(R, bb, -1.6, 1.9, 'right'); const bb2 = DEC.bulletinBoard(1.3, 0.9, { seed: seed + 3 }); mountOnWall(R, bb2, 0.4, 1.9, 'right');
  [['cat', 0.6, 0.45], ['rocket', 0.45, 0.6], ['heart', 0.4, 0.5], ['star', 0.5, 0.4]].forEach(([k, pw, ph], i) => { const p = DEC.poster(pw, ph, { kind: k, seed: i + 1 }); mountOnWall(R, p, 1.7 + i * 0.6, 1.9 + (i % 2) * 0.35, 'right'); });
  const shelf = FUR.shelfFilled({ w: 1.5, h: 1.3, d: 0.4, kind: 'books', seed: seed + 3, rows: 3, color: 0xc89a62 }); R.place(R.topple(shelf, 0.75, 0.7), hw - 0.22, 0, 2.2, -HP); on(shelf, DEC.fishTank(0.7, 0.4, 0.28), 0.0, 1.3, 0.0);
  const gb = DEC.globe(0.15); R.place(gb, hw - 0.4, 0.9, 0.5); const tb = FUR.table({ w: 0.7, d: 0.5, h: 0.75, color: 0x8a6a4a }); R.place(tb, hw - 0.4, 0, 0.5, -HP); gb.position.y = 0.75;
  // teacher's desk + chair + computer, apple, mug
  const td = FUR.desk({ w: 1.6, d: 0.8, color: 0xc89a62, accent: 0x4a8a9a, side: -1 }); on(td, ELEC.monitor({ w: 0.5, kind: 'desktop' }), 0.2, 0.75, -0.1, 0); on(td, ELEC.keyboard(), 0.2, 0.75, 0.15); on(td, DEC.mug(0xe04a3a), -0.3, 0.75, 0.1); on(td, DEC.bookStack(4, { seed: 2 }), -0.5, 0.75, -0.1); const ap = new THREE.Group(); P(ap, sg(0.045, 10, 8), mat(0xe03030, { rough: 0.3 }), [0, 0.045, 0]); P(ap, cg(0.004, 0.004, 0.03, 4), mat(0x4a2a1a), [0, 0.1, 0]); on(td, ap, -0.05, 0.75, 0.2);
  R.place(R.topple(td, 0.8, 0.9), hw - 1.5, 0, -hd + 1.4, PI); const tch = FUR.chair({ kind: 'office', seed: 3, seat: 0xe04a3a }); R.place(tch, hw - 1.5, 0, -hd + 0.55, 0);
  // student desks 4 x 3 with chairs, bags, books
  const sitters = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    const x = -2.7 + col * 1.8, z = -0.8 + row * 1.35; const dk = FUR.schoolDesk({ color: [0xe0c898, 0xd8b878][(row + col) % 2] }); on(dk, DEC.bookStack(2 + (col % 2), { seed: row * 4 + col, w: 0.18 }), -0.15, 0.76, 0.0); if ((row + col) % 3 === 0) on(dk, DEC.mug(0x3a78d0, { steamOn: false }), 0.2, 0.76, 0.1);
    const ch = FUR.chair({ kind: 'school', seed: row * 4 + col }); const bag = new THREE.Group(); P(bag, rg(0.3, 0.4, 0.14, 0.06), mat(PAL[(row + col * 2) % 9], { rough: 0.8 }), [0, 0.65, 0.0], [0, 0, 0], 1, true); P(bag, rg(0.2, 0.18, 0.04, 0.02), mat(shade(PAL[(row + col * 2) % 9], 0.7)), [0, 0.6, 0.09]); on(ch, bag, 0, 0, -0.27);
    const fall = (row === 1 && col === 2);
    R.place(R.topple(dk, 0.35, 0.5 + (row + col) * 0.05), x, 0, z, 0); R.place(fall ? R.topple(ch, 0.22, 0.4) : ch, x, 0, z + 0.62, PI);
    if (people && (row * 4 + col) % 2 === 1 && wrecked < 0.5) { const s = sitter(r, { seat: 0.46, ry: PI, typing: false, scale: 0.62 }); R.place(s, x, 0, z + 0.62); sitters.push(s); }
  }
  R.g.add(clutter({ x: 0, z: 0.9, w: 7, d: 5.3 }, { kind: ['papers', 'toys', 'trash'], seed: seed + 4, density: 0.5 + wrecked * 2.5, avoid: [] }));
  for (const [x, z] of [[-1.8, -0.2], [1.8, 1.4]]) R.place(DEC.ceilingFan({ r: 0.7, color: 0xf2ead8, light: false, speed: 4 }), x, h, z);
  for (const [x, z] of [[-2.4, -1.2], [0.4, -1.2], [2.8, -1.2], [-2.4, 1.6], [0.4, 1.6], [2.8, 1.6]]) R.place(DEC.fluorescent(1.2, { flicker: (x === 0.4 && z === 1.6) ? 0.3 : 0, seed: x + z }), x, h, z);
  const pj = ELEC.projector(); pj.rotation.y = PI; R.place(pj, 0, h - 0.12, 0.4);
  R.place(DEC.plant({ kind: 'monstera', h: 1.2, seed: 3 }), -hw + 0.5, 0, -hd + 0.5); R.place(DEC.plant({ kind: 'cactus', h: 0.6 }), -hw + 0.5, 0, 2.9);
  const bin = new THREE.Group(); P(bin, new THREE.CylinderGeometry(0.2, 0.16, 0.45, 12), mat(0x3a78d0, { rough: 0.5 }), [0, 0.22, 0], [0, 0, 0], 1, true); R.place(bin, -hw + 0.4, 0, -hd + 1.6);
  const dor = door({ color: 0x4a8a9a, frame: 0xffffff, glass: true }); R.place(dor, hw - 0.04, 0, hd - 0.9, -HP);
  return R.finish({ sitters }, camFor(R, { fov: 56, y: 1.7, ty: 1.15 }));
}

// ---------------------------------------------------------------- supermarket aisle (camera looks down the aisle)
export function buildSupermarketAisle({ seed = 12, wrecked = 0, ceiling = true, people = true } = {}) {
  const R = room({ w: 8.0, d: 11, h: 3.6, seed, wrecked, ceiling, wall: 0xf2f2ea, wall2: 0xe8e8e0, trim: 0xe04a3a, floor: { type: 'tiles', size: 0.6, c1: 0xefece4, c2: 0xdedad0, grout: 0xb8b4a8 }, hole: { x: 2.0, y: 2.6, r: 0.7 }, crown: false, dust: 36, name: 'supermarket' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  const rr = rng(seed + 77); const boxes = [], cans = [];
  const gondola = (x, faces, zlen, rows = 5) => {
    const grp = new THREE.Group(); grp.position.set(x, 0, 0); g.add(grp);
    P(grp, bg(faces === 2 ? 1.0 : 0.5, 0.15, zlen), mat(0x6a6e76, { metal: 0.3 }), [0, 0.075, 0], [0, 0, 0], 1, true);
    if (faces === 2) P(grp, bg(0.05, 1.9, zlen), mat(0xb8bcc4, { metal: 0.3 }), [0, 0.95, 0], [0, 0, 0], 1, true);
    P(grp, bg(faces === 2 ? 1.04 : 0.54, 0.08, zlen), mat(0xe04a3a), [0, 1.94, 0]);
    for (let k = 0; k < rows; k++) { const y = 0.22 + k * 0.34; for (const f of faces === 2 ? [-1, 1] : [1]) { P(grp, bg(0.42, 0.025, zlen), mat(0xc8ccd6, { metal: 0.5 }), [f * 0.26, y, 0]); P(grp, bg(0.012, 0.045, zlen), mat(0xfff3a0), [f * 0.47, y + 0.018, 0]);
      for (let z = -zlen / 2 + 0.1; z < zlen / 2 - 0.08; z += 0.1 + rr() * 0.07) { const c = PAL[Math.floor(rr() * 9)], kind = rr(); if (kind < 0.3) cans.push({ p: [x + f * (0.2 + rr() * 0.12), y + 0.1, z], s: [0.075, 0.17, 0.075], c }); else { const bh = rr.range(0.14, 0.28), bw = rr.range(0.07, 0.13); boxes.push({ p: [x + f * (0.2 + rr() * 0.12), y + 0.012 + bh / 2, z], s: [0.12, bh, bw], c }); } } } }
    return grp;
  };
  const zl = 8.0;
  const gl = gondola(-1.5, 2, zl), gr = gondola(1.5, 2, zl); const wl = gondola(-hw + 0.38, 1, zl, 5); const wr = gondola(hw - 0.38, 1, zl, 5);
  wl.children.forEach(() => {}); // wall runs face the aisle
  inst(g, bg(1, 1, 1), mat(0xffffff, { rough: 0.55 }), boxes); inst(g, cg(0.5, 0.5, 1, 10), mat(0xffffff, { rough: 0.3, metal: 0.3 }), cans);
  // hanging aisle signs
  const names = [['AISLE 3', 'SNACKS'], ['AISLE 4', 'CEREAL']]; [-1.5, 1.5].forEach((x, i) => { const s = sign('', 1.3, 0.55, { bg: '#e04a3a', fg: '#fff', lines: names[i], size: 0.7, px: 256, border: '#ffffff' }); const sg2 = new THREE.Group(); sg2.add(s); P(sg2, cg(0.006, 0.006, 0.8, 4), mat(0x15151c), [0.5, 0.5, 0]); P(sg2, cg(0.006, 0.006, 0.8, 4), mat(0x15151c), [-0.5, 0.5, 0]); const back = s.clone(); back.rotation.y = PI; sg2.add(back); sg2.userData.update = (t) => { sg2.rotation.y = Math.sin(t * 0.6 + i) * 0.04; }; R.place(sg2, x, h - 0.9, 0.0, HP); });
  // freezer wall at the back: glowing glass doors with food
  const fz = new THREE.Group(); const doors = 7, dw = (w - 0.4) / doors;
  P(fz, bg(w - 0.3, 2.1, 0.7), mat(0xdfe4ea, { rough: 0.4 }), [0, 1.05, 0.35], [0, 0, 0], 1, true);
  const fItems = []; for (let i = 0; i < doors; i++) { const x = -(w - 0.4) / 2 + (i + 0.5) * dw; P(fz, bg(dw - 0.06, 1.9, 0.02), mat(0xcfeaff, { opacity: 0.3, rough: 0.05 }), [x, 1.05, 0.72]); P(fz, bg(dw - 0.06, 1.85, 0.02), glow(0xdff6ff, 0.9), [x, 1.05, 0.5]); P(fz, bg(0.03, 0.5, 0.04), mat(0x555a66), [x + dw * 0.35, 1.05, 0.75]);
    for (let k = 0; k < 4; k++) for (let j = 0; j < 5; j++) fItems.push({ p: [x - dw * 0.35 + j * dw * 0.17, 0.35 + k * 0.45, 0.55], s: [0.12, 0.28, 0.1], c: PAL[(i + j + k * 2) % 9] }); }
  inst(fz, bg(1, 1, 1), mat(0xffffff, { rough: 0.5, emissive: 0x333344, emissiveIntensity: 0.4 }), fItems); R.place(fz, 0, 0, -hd);
  const fb = sign('FROZEN · DAIRY · DELI', 6, 0.5, { bg: '#2a6ad0', fg: '#fff', size: 0.55, px: 512 }); fb.position.set(0, 2.55, -hd + 0.01); g.add(fb);
  // pyramid of cans, cart, wet floor sign, baskets, price screens
  const py = new THREE.Group(); for (let k = 0; k < 4; k++) for (let i = 0; i < 4 - k; i++) for (let j = 0; j < 4 - k; j++) P(py, cg(0.065, 0.065, 0.15, 12), mat([0xe04a3a, 0xffd23f, 0x3a78d0, 0x3fa060][(i + j + k) % 4], { rough: 0.3, metal: 0.3 }), [(i - (3 - k) / 2) * 0.14, 0.075 + k * 0.15, (j - (3 - k) / 2) * 0.14]); R.place(R.topple(py, 0.3, 0.6), 0.0, 0, 3.4);
  const cart = new THREE.Group(); P(cart, bg(0.6, 0.04, 1.0), mat(0xc8ccd6, { metal: 0.7 }), [0, 0.35, 0]); for (let i = 0; i < 7; i++) { P(cart, bg(0.6, 0.01, 0.01), mat(0xc8ccd6, { metal: 0.7 }), [0, 0.55 + 0.0, -0.45 + i * 0.15]); } for (const s of [-1, 1]) { P(cart, bg(0.01, 0.3, 1.0), mat(0xc8ccd6, { metal: 0.7 }), [s * 0.3, 0.5, 0]); P(cart, bg(0.01, 0.01, 1.0), mat(0xc8ccd6, { metal: 0.7 }), [s * 0.3, 0.65, 0]); P(cart, sg(0.04, 6, 5), mat(0x15151c), [s * 0.28, 0.04, 0.4]); P(cart, sg(0.04, 6, 5), mat(0x15151c), [s * 0.28, 0.04, -0.4]); } P(cart, bg(0.6, 0.02, 0.02), mat(0xe04a3a), [0, 0.95, 0.5]); for (let i = 0; i < 4; i++) P(cart, rg(0.2, 0.25, 0.15, 0.03), mat(PAL[i * 2], { rough: 0.5 }), [(i % 2 - 0.5) * 0.25, 0.5, -0.2 + (i > 1 ? 0.3 : 0)]); R.place(R.topple(cart, 0.3, 0.7), -0.7, 0, 1.6, 0.25);
  const ws = new THREE.Group(); for (const s of [-1, 1]) P(ws, bg(0.4, 0.6, 0.02), mat(0xffd23f, { rough: 0.5 }), [0, 0.3, s * 0.1], [s * 0.25, 0, 0], 1, true); const wsg = sign('WET FLOOR', 0.36, 0.2, { bg: '#ffd23f', fg: '#15151c', size: 0.5, px: 128 }); wsg.position.set(0, 0.35, 0.145); wsg.rotation.x = -0.25; ws.add(wsg); R.place(ws, 0.6, 0, 1.4, 0.4);
  const puddle = P(g, cg(0.5, 0.5, 0.004, 24), new THREE.MeshStandardMaterial({ color: 0x9ad8ff, roughness: 0.05, transparent: true, opacity: 0.45 }), [0.7, 0.012, 1.0], [0, 0, 0], [1.5, 1, 1]);
  const ps = ELEC.tv({ w: 0.8, kind: 'menu', screenOpts: { title: 'SALE!', items: ['MILK 99c', 'EGGS $2', 'BREAD $1', 'PIZZA $3'] }, wall: true }); const psg = new THREE.Group(); psg.add(ps); P(psg, cg(0.006, 0.006, 1.0, 4), mat(0x15151c), [0, 0.95, 0]); psg.userData.update = (t) => {}; R.place(psg, 0, h - 1.4, 2.9, 0);
  const mirror = DEC.mirror(0.9, 0.9, { round: true }); R.place(mirror, hw - 0.01, 3.0, -2.5, -HP);
  // lights: rows of fluorescents, one flickering; exit sign; floor reflections
  for (let z = -4; z <= 4; z += 2) for (const x of [-1.5, 1.5]) R.place(DEC.fluorescent(1.2, { flicker: (z === 0 && x > 0) ? 0.4 : 0, seed: z + x }), x, h, z);
  const ex = sign('EXIT', 0.5, 0.2, { bg: '#0a5a2a', fg: '#7dff9a', size: 0.7, px: 128, emissive: true }); ex.userData.update = (t) => { ex.material.color.setScalar(0.8 + 0.2 * Math.sin(t * 3)); }; R.place(ex, -hw + 0.3, 2.9, 3.6, HP);
  if (people) { R.place(stander(r, { pose: 'idle', ry: PI - 0.2 }), 0.9, 0, 2.6); R.place(stander(r, { pose: 'idle', ry: 0.4 }), 1.6, 0, -2.4); }
  R.g.add(clutter({ x: 0, z: 0, w: 2.4, d: 7 }, { kind: ['food', 'trash', 'papers'], seed: seed + 3, density: 0.4 + wrecked * 3, avoid: [{ x: 0, z: 3.4, w: 0.8, d: 0.8 }] }));
  const cam = { pos: [0.0, 1.75, hd + 3.2], target: [0, 1.4, -hd + 2.0], fov: 62 };
  return R.finish({}, cam);
}

// ---------------------------------------------------------------- diner
export function buildDiner({ seed = 13, wrecked = 0, ceiling = true, people = true } = {}) {
  const R = room({ w: 8.6, d: 6.0, h: 3.0, seed, wrecked, ceiling, wall: 0x6ad0c8, wall2: 0xf8e8d0, trim: 0xc8ccd6, wainscot: 0xe04a3a, floor: { type: 'tiles', size: 0.4, c1: 0xf6f2ea, c2: 0x20222a, grout: 0x555a66, vary: 0.01 }, hole: { x: -2.5, y: 2.0, r: 0.6 }, name: 'diner' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  // chrome strip + kitchen pass-through behind the counter
  P(g, bg(w, 0.06, 0.03), mat(0xdfe4ea, { metal: 0.9, rough: 0.15 }), [0, 1.25, -hd + 0.03]); P(g, bg(w, 0.06, 0.03), mat(0xdfe4ea, { metal: 0.9, rough: 0.15 }), [0, 2.6, -hd + 0.03]);
  P(g, bg(3.6, 0.9, 0.04), mat(0x15151c), [-1.2, 1.9, -hd + 0.02]); const kit = liveScreen('custom', 3.5, 0.8, { px: 256, draw: (c, ww, hh) => { c.fillStyle = '#ffb870'; c.fillRect(0, 0, ww, hh); c.fillStyle = '#c86a2a'; c.fillRect(0, hh * 0.7, ww, hh * 0.3); } }); kit.position.set(-1.2, 1.9, -hd + 0.045); g.add(kit);
  for (let i = 0; i < 6; i++) P(g, cg(0.09, 0.09, 0.02, 14), mat(0xffffff, { rough: 0.3 }), [-2.7 + i * 0.35, 2.0, -hd + 0.2], [HP, 0, 0]);
  const menu = ELEC.tv({ w: 1.4, kind: 'menu', wall: true, screenOpts: { title: 'DINER', items: ['BURGER  $5', 'FRIES  $2', 'SHAKE  $4', 'PIE  $3'] } }); R.place(menu, 2.3, 1.55, -hd); const menu2 = ELEC.tv({ w: 1.4, kind: 'menu', wall: true, seed: 3, screenOpts: { title: 'BREAKFAST', items: ['PANCAKES $4', 'EGGS  $3', 'COFFEE $1', 'BACON $2'] } }); R.place(menu2, 3.9, 1.55, -hd);
  const cl = DEC.wallClock(0.3, { frame: 0xe04a3a, color: 0xfff6d8, h0: 12, m0: 15 }); R.place(cl, -hw + 0.8, 2.5, -hd);
  R.place(DEC.neonSign('DINER', '#ff3a7a', 1.3, 0.45, { seed }), 0.0, 2.55, -hd + 0.03); R.place(DEC.neonSign('PIE', '#6ad0ff', 0.6, 0.3, { seed: seed + 4, flicker: 0.25 }), -3.4, 2.5, -hd + 0.03); R.place(DEC.neonSign('OPEN 24H', '#ffd23f', 0.9, 0.3, { seed: seed + 8, flicker: 0.1 }), hw - 0.03, 2.4, 0.0, -HP);
  // counter with stools, taps, mixers, coffee pots, pie case, napkins
  const cx = 0.6, cz = -hd + 1.55, cw = 5.2; const ct = new THREE.Group(); P(ct, rg(cw, 1.0, 0.7, 0.04), mat(0xe04a3a, { rough: 0.35 }), [0, 0.5, 0], [0, 0, 0], 1, true); P(ct, rg(cw + 0.1, 0.06, 0.82, 0.02), mat(0xf4f4f0, { rough: 0.2 }), [0, 1.03, 0.02]); P(ct, bg(cw, 0.04, 0.04), mat(0xdfe4ea, { metal: 0.9, rough: 0.15 }), [0, 0.12, 0.36]); P(ct, bg(cw, 0.1, 0.02), mat(0x20222a), [0, 0.06, 0.36]);
  const mixers = []; for (let i = 0; i < 2; i++) { const mx = new THREE.Group(); P(mx, rg(0.2, 0.05, 0.2, 0.02), mat(0xdfe4ea, { metal: 0.8 }), [0, 0.025, 0]); P(mx, cg(0.015, 0.015, 0.35, 6), mat(0xdfe4ea, { metal: 0.8 }), [0, 0.2, -0.08]); P(mx, rg(0.1, 0.09, 0.14, 0.03), mat(0xff7aa0, { rough: 0.3 }), [0, 0.38, -0.02]); const cup = P(mx, new THREE.CylinderGeometry(0.06, 0.04, 0.16, 12, 1, true), mat(0xdfe4ea, { metal: 0.8, side: THREE.DoubleSide }), [0, 0.12, 0.05]); const sp = P(mx, cg(0.005, 0.005, 0.2, 4), mat(0xdfe4ea, { metal: 0.8 }), [0, 0.2, 0.05]); mx.userData.update = (t) => { sp.rotation.y = t * 30; cup.rotation.y = t * 30; }; on(ct, mx, -1.2 + i * 0.55, 1.06, 0.0); }
  for (let i = 0; i < 3; i++) on(ct, DEC.mug(i % 2 ? 0xffffff : 0xe04a3a), 0.3 + i * 0.4, 1.06, 0.1); const pie = new THREE.Group(); P(pie, cg(0.28, 0.28, 0.03, 20), mat(0xdfe4ea, { metal: 0.8 }), [0, 0.015, 0]); P(pie, new THREE.CylinderGeometry(0.25, 0.22, 0.08, 18), mat(0xd8a050, { rough: 0.8 }), [0, 0.07, 0]); P(pie, new THREE.SphereGeometry(0.28, 18, 8, 0, TAU, 0, PI / 2), mat(0xcfeaff, { opacity: 0.35, rough: 0.05 }), [0, 0.03, 0]); on(ct, pie, 1.8, 1.06, 0.0); const cm = APP.coffeeMachine(); on(ct, cm, 2.2, 1.06, 0.05);
  const nap = new THREE.Group(); P(nap, rg(0.1, 0.14, 0.08, 0.02), mat(0xdfe4ea, { metal: 0.8 }), [0, 0.07, 0]); for (const x of [-1.9, -0.3, 1.0]) on(ct, nap.clone(), x, 1.06, 0.2);
  R.place(ct, cx, 0, cz);
  for (let i = 0; i < 7; i++) { const st = FUR.chair({ kind: 'bar', seat: 0xe04a3a }); R.place(R.topple(st, 0.19, 0.5 + i * 0.05), cx - 2.25 + i * 0.75, 0, cz + 0.85); }
  const back = new THREE.Group(); P(back, bg(cw, 0.9, 0.5), mat(0xc8ccd6, { metal: 0.3 }), [0, 0.45, 0]); R.place(back, cx, 0, -hd + 0.4);
  // booths along the left wall
  for (let i = 0; i < 3; i++) { const z = -0.2 + i * 1.5; const tb = FUR.table({ kind: 'rect', w: 0.9, d: 0.8, h: 0.74, color: 0xdfe4ea, top: 0xf6f2ea }); on(tb, DEC.mug(0xffffff), 0.1, 0.74, 0.1); const mn = new THREE.Group(); P(mn, rg(0.12, 0.2, 0.05, 0.02), mat(0xe04a3a), [0, 0.1, 0]); on(tb, mn, -0.1, 0.74, 0.0); R.place(R.topple(tb, 0.45, 0.8), -hw + 1.55, 0, z, HP);
    for (const s of [-1, 1]) { const bench = new THREE.Group(); P(bench, rg(0.55, 0.45, 0.9, 0.08), mat(0xc8302b, { rough: 0.45 }), [0, 0.225, 0], [0, 0, 0], 1, true); P(bench, rg(0.14, 0.75, 0.9, 0.06), mat(0xc8302b, { rough: 0.45 }), [-0.2, 0.7, 0], [0, 0, 0], 1, true); P(bench, bg(0.04, 0.04, 0.9), mat(0xdfe4ea, { metal: 0.9 }), [-0.2, 1.1, 0]); bench.userData.seatY = 0.47; R.place(bench, -hw + 1.55 + s * 1.0, 0, z, s > 0 ? -HP : HP); }
    const wn = DEC.windowView(0.9, 0.8, { view: i % 2 ? 'city-night' : 'city', seed: i + 3, frame: 0xdfe4ea }); mountOnWall(R, wn, z, 1.7, 'left'); }
  // jukebox, round tables on the right, plants
  const jb = new THREE.Group(); P(jb, rg(0.9, 1.5, 0.55, 0.15), mat(0xe04a3a, { rough: 0.3 }), [0, 0.75, 0], [0, 0, 0], 1, true); P(jb, new THREE.CylinderGeometry(0.45, 0.45, 0.55, 18, 1, false, 0, PI), mat(0xe04a3a, { rough: 0.3 }), [0, 1.5, 0], [0, 0, 0], 1, true).rotation.x = HP; P(jb, rg(0.6, 0.5, 0.04, 0.02), glow(0xffd23f, 0.7), [0, 1.15, 0.28]);
  const jl = []; for (let i = 0; i < 7; i++) jl.push(P(jb, bg(0.07, 1.1, 0.02), glow([0xff3a7a, 0x6ad0ff, 0xffd23f, 0x7dff9a][i % 4], 1.6), [-0.35 + i * 0.117, 0.75, 0.28])); P(jb, cg(0.2, 0.2, 0.02, 20), mat(0x15151c), [0, 1.5, 0.28], [HP, 0, 0]); jb.userData.update = (t) => jl.forEach((m, i) => { m.material = m.material; m.scale.y = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 5 + i * 1.3)); });
  R.place(R.topple(jb, 0.45, 0.8), hw - 0.5, 0, -hd + 1.0, -HP);
  for (const [x, z] of [[2.6, 0.9], [2.6, 2.1]]) { const t2 = FUR.table({ kind: 'round', w: 0.8, h: 0.74, color: 0xdfe4ea, top: 0xf6f2ea }); on(t2, DEC.flowerVase(0xff5c8a, { seed: Math.round(z * 3) }), 0, 0.74, 0); R.place(R.topple(t2, 0.4, 0.7), x, 0, z); for (const s of [-1, 1]) R.place(R.topple(FUR.chair({ kind: 'bar', seat: 0x3a78d0 }), 0.19, 0.6), x + s * 0.7, 0, z); }
  for (const x of [-1, 2]) R.place(DEC.ceilingFan({ r: 0.65, color: 0xdfe4ea, speed: 5 }), x + 1.0, h, 0.7);
  R.place(DEC.plant({ kind: 'tree', h: 1.6, seed: 4 }), hw - 0.5, 0, hd - 0.5);
  if (people) { R.place(stander(r, { pose: 'idle', ry: 0 }), -1.8, 0, -hd + 0.5); R.place(stander(r, { pose: 'idle', ry: 0 }), -0.6, 0, -hd + 0.5); R.place(sitter(r, { seat: 0.47, ry: -HP }), -hw + 2.55, 0, -0.2); R.place(sitter(r, { seat: 0.47, ry: HP }), -hw + 0.55, 0, 1.3); R.place(sitter(r, { seat: 0.47, ry: -HP }), -hw + 2.55, 0, 2.8); }
  R.g.add(clutter({ x: 0, z: 1.2, w: 7, d: 3.2 }, { kind: ['papers', 'dishes', 'food'], seed: seed + 4, density: 0.2 + wrecked * 3, avoid: [{ x: cx, z: cz + 0.8, w: 5.4, d: 0.8 }] }));
  return R.finish({}, camFor(R, { fov: 56, y: 1.7, ty: 1.1 }));
}

// ---------------------------------------------------------------- gym
export function buildGym({ seed = 14, wrecked = 0, ceiling = true, people = true } = {}) {
  const R = room({ w: 9.2, d: 7.4, h: 3.8, seed, wrecked, ceiling, wall: 0xdfe4ea, wall2: 0xcfd8e0, trim: 0x2a3a5a, floor: { type: 'carpet', color: 0x3a3e48, size: 0.6 }, hole: { x: 3.0, y: 2.6, r: 0.7 }, name: 'gym' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  // mirror wall (back), banners
  for (let i = 0; i < 5; i++) { const m = DEC.mirror(1.5, 1.9, { frame: 0x2a3a5a }); m.position.set(-3.5 + i * 1.75, 1.3, -hd + 0.0); g.add(m); }
  const bn = sign('', 3.2, 0.6, { bg: '#e04a3a', fg: '#fff', lines: ['NO PAIN NO GAIN'], size: 0.55, px: 512, family: 'Anton, Inter, sans-serif', font: '400' }); bn.position.set(0, 3.0, -hd + 0.02); g.add(bn);
  // treadmills (belt stripes move) on the right
  const treads = []; for (let i = 0; i < 3; i++) { const t = new THREE.Group(); P(t, rg(0.85, 0.2, 1.8, 0.05), mat(0x2a2e38), [0, 0.18, 0], [0, 0, 0], 1, true); P(t, bg(0.62, 0.02, 1.5), mat(0x15151c, { rough: 0.9 }), [0, 0.29, 0.0]); const stripes = []; for (let k = 0; k < 14; k++) stripes.push({ p: [0, 0.302, 0], s: [0.6, 0.004, 0.04], c: 0x555a66 }); const im = inst(t, bg(1, 1, 1), mat(0xffffff, { rough: 0.9 }), stripes); for (const s of [-1, 1]) { P(t, cg(0.025, 0.025, 1.2, 8), mat(0xc8ccd6, { metal: 0.7 }), [s * 0.4, 0.95, -0.7], [-0.1, 0, 0]); P(t, bg(0.05, 0.05, 0.6), mat(0x15151c), [s * 0.4, 1.0, -0.5]); } P(t, rg(0.8, 0.3, 0.1, 0.04), mat(0x20222a), [0, 1.5, -0.95], [-0.3, 0, 0]); const sc = liveScreen('telemetry', 0.6, 0.2, { px: 160, seed: i }); sc.position.set(0, 1.5, -0.89 + 0.0); sc.rotation.x = -0.3; t.add(sc); for (let q = 0; q < 6; q++) P(t, sg(0.01, 4, 3), glow(0x3aff6a, 2), [-0.3 + q * 0.12, 1.4, -0.87]);
    t.userData.update = (tt) => { stripes.forEach((s, k) => { const z = -0.75 + (((k / 14) * 1.5 + tt * 1.4) % 1.5); setInst(im, k, { p: [0, 0.302, z], s: s.s, c: s.c }); }); im.instanceMatrix.needsUpdate = true; }; t.userData.update(0.6); t.scale.setScalar(1.0); R.place(R.topple(t, 0.45, 0.8 + i * 0.05), hw - 1.2 - 0.0, 0, -1.6 + i * 1.8 - 0.4, -0.0); treads.push(t); }
  // bikes
  for (let i = 0; i < 2; i++) { const b = new THREE.Group(); P(b, rg(0.5, 0.1, 1.0, 0.03), mat(0x2a2e38), [0, 0.05, 0]); const fw = new THREE.Group(); fw.position.set(0, 0.5, 0.35); b.add(fw); P(fw, cg(0.3, 0.3, 0.06, 24), mat(0xe04a3a, { metal: 0.4 }), [0, 0, 0], [0, 0, HP], 1, true); for (let k = 0; k < 4; k++) P(fw, bg(0.02, 0.5, 0.03), mat(0xffffff), [0, 0, 0], [k * HP / 2, 0, 0]); P(b, cg(0.03, 0.03, 0.9, 8), mat(0x2a2e38), [0, 0.7, -0.15], [0.3, 0, 0]); P(b, rg(0.2, 0.06, 0.34, 0.03), mat(0x15151c), [0, 1.18, -0.38]); P(b, cg(0.02, 0.02, 0.5, 6), mat(0xc8ccd6, { metal: 0.7 }), [0, 1.05, 0.35], [-0.2, 0, 0]); P(b, bg(0.4, 0.03, 0.04), mat(0x15151c), [0, 1.3, 0.3]); const cr = new THREE.Group(); cr.position.set(0, 0.45, 0.0); b.add(cr); for (const s of [-1, 1]) { P(cr, bg(0.03, 0.3, 0.03), mat(0xc8ccd6, { metal: 0.7 }), [s * 0.1, s * 0.15, 0]); P(cr, bg(0.1, 0.03, 0.08), mat(0x15151c), [s * 0.14, s * 0.3, 0]); } b.userData.update = (t) => { fw.rotation.x = t * 9; cr.rotation.x = t * 6 + i; }; b.userData.update(0.6); R.place(R.topple(b, 0.3, 0.8), hw - 3.8 - i * 1.0, 0, -1.5, 0); }
  // weights rack with dumbbells (instanced), bench press, mats and balls
  const rk = new THREE.Group(); P(rk, bg(2.4, 0.04, 0.5), mat(0x2a2e38), [0, 0.4, 0]); P(rk, bg(2.4, 0.04, 0.5), mat(0x2a2e38), [0, 0.9, 0]); for (const x of [-1.2, 1.2, 0]) P(rk, bg(0.05, 1.0, 0.5), mat(0x2a2e38), [x, 0.5, 0]); const db = [], dm = []; for (let k = 0; k < 2; k++) for (let i = 0; i < 8; i++) { const x = -1.05 + i * 0.3, y = 0.42 + k * 0.5, s = 0.05 + i * 0.008; db.push({ p: [x, y + 0.08, 0], s: [0.02, 0.2, 0.02], r: [0, 0, HP], c: 0xc8ccd6 }); }
  const dbi = []; for (let k = 0; k < 2; k++) for (let i = 0; i < 8; i++) { const x = -1.05 + i * 0.3, y = 0.46 + k * 0.5, s = 0.06 + i * 0.01; dbi.push({ p: [x, y + s, 0.05], s: [s * 2.4, s * 2.0, s * 2.0], c: 0x20222a }); dbi.push({ p: [x, y + s, -0.08], s: [s * 2.4, s * 2.0, s * 2.0], c: 0x20222a }); }
  inst(rk, bg(1, 1, 1), mat(0xffffff, { rough: 0.4, metal: 0.4 }), dbi); R.place(rk, -hw + 1.6, 0, -hd + 0.6);
  const bench = new THREE.Group(); P(bench, rg(0.4, 0.1, 1.2, 0.03), mat(0x20222a), [0, 0.45, 0.0]); for (const s of [-1, 1]) { P(bench, bg(0.05, 0.9, 0.05), mat(0xc8ccd6, { metal: 0.7 }), [s * 0.4, 0.45, -0.5]); } P(bench, cg(0.015, 0.015, 1.8, 8), mat(0xc8ccd6, { metal: 0.8 }), [0, 0.95, -0.5], [0, 0, HP]); for (const s of [-1, 1]) P(bench, cg(0.22, 0.22, 0.06, 20), mat(0x20222a), [s * 0.78, 0.95, -0.5], [0, 0, HP], 1, true), P(bench, cg(0.16, 0.16, 0.06, 20), mat(0xe04a3a), [s * 0.7, 0.95, -0.5], [0, 0, HP]); R.place(R.topple(bench, 0.9, 0.9), -1.8, 0, 0.8, 0);
  const mats = new THREE.Group(); [0x3a78d0, 0xe04a3a, 0x3fa060].forEach((c, i) => P(mats, rg(0.6, 0.02, 1.8, 0.01), mat(c, { rough: 0.9 }), [i * 0.7, 0.012, 0])); R.place(mats, -2.6, 0, 2.2, 0.1);
  const balls = []; for (let i = 0; i < 6; i++) balls.push({ p: [-2.0 + i * 0.32 + (i % 2) * 0.1, 0.2, 2.7 + (i % 3) * 0.2], s: 0.4, c: [0xe04a3a, 0x3a78d0, 0xffd23f][i % 3] }); inst(R.g, sg(0.5, 14, 10), mat(0xffffff, { rough: 0.4 }), balls, { cast: true });
  const kb = []; for (let i = 0; i < 8; i++) kb.push({ p: [-hw + 0.6 + (i % 4) * 0.3, 0.11, hd - 0.8 - Math.floor(i / 4) * 0.3], s: 0.22, c: [0x15151c, 0xe04a3a][i % 2] }); inst(R.g, sg(0.5, 12, 8), mat(0xffffff, { rough: 0.4, metal: 0.4 }), kb, { cast: true });
  // punching bag swinging from the ceiling
  const pb = new THREE.Group(); const sw = new THREE.Group(); pb.add(sw); P(sw, cg(0.006, 0.006, 1.2, 5), mat(0x15151c), [0, -0.6, 0]); P(sw, cg(0.17, 0.17, 1.0, 18), mat(0xe04a3a, { rough: 0.5 }), [0, -1.7, 0], [0, 0, 0], 1, true); P(sw, cg(0.18, 0.18, 0.06, 18), mat(0x15151c), [0, -1.2, 0]); P(sw, cg(0.18, 0.18, 0.06, 18), mat(0x15151c), [0, -2.2, 0]); pb.userData.update = (t) => { sw.rotation.z = Math.sin(t * 1.9) * 0.2 * Math.exp(-0.0); sw.rotation.x = Math.sin(t * 1.3) * 0.05; }; R.place(pb, 0.4, h, -1.9);
  // wall TVs, lockers, water cooler, clock, towels, windows, fans
  const tv1 = ELEC.tv({ w: 1.3, kind: 'news', wall: true, seed: 2 }); R.place(tv1, -2.2, 2.35, -hd + 0.0); const tv2 = ELEC.tv({ w: 1.3, kind: 'chart', wall: true, seed: 4 }); R.place(tv2, 2.2, 2.35, -hd + 0.0);
  const lk = FUR.locker({ n: 6, color: 0x2a4a8a }); R.place(R.topple(lk, 0.96, 0.9), -hw + 0.26, 0, 0.8, HP); R.place(APP.waterCooler(), -hw + 0.4, 0, 2.5, HP);
  for (const z of [-2.4, 0, 2.4]) { const wn = DEC.windowView(1.4, 1.0, { view: 'city', seed: z + 8, frame: 0xdfe4ea }); mountOnWall(R, wn, z, 2.5, 'right'); }
  const cl = DEC.wallClock(0.3, { frame: 0x2a3a5a, h0: 6, m0: 30 }); R.place(cl, 0, 3.4, -hd + 0.01);
  for (const [x, z] of [[-2.5, 1.0], [2.5, 1.0]]) R.place(DEC.ceilingFan({ r: 0.9, color: 0xdfe4ea, light: false, speed: 6 }), x, h, z);
  for (let i = 0; i < 4; i++) R.place(DEC.panelLight(0.9, 0.9), -3 + i * 2, h, -0.5);
  const pl = DEC.plant({ kind: 'tree', h: 1.5, seed: 9 }); R.place(pl, hw - 0.5, 0, hd - 0.6);
  if (people) { const a = stander(r, { pose: 'flex', ry: 0.2 }); R.place(a, -0.6, 0, 1.4); const b2 = sitter(r, { seat: 0.46, ry: PI }); R.place(b2, -1.8, 0.0, 0.8); }
  R.g.add(clutter({ x: 0, z: 1.4, w: 6, d: 4 }, { kind: ['trash', 'clothes'], seed: seed + 4, density: 0.2 + wrecked * 2.5, avoid: [] }));
  return R.finish({}, camFor(R, { fov: 56, y: 1.8, ty: 1.5, fit: 1.3 }));
}

// ---------------------------------------------------------------- cinema (camera behind the audience; floor rakes up towards the camera)
export function buildCinema({ seed = 15, wrecked = 0, ceiling = true, people = true, rows = 7, cols = 9 } = {}) {
  const R = room({ w: 10, d: 11, h: 5.0, seed, wrecked, ceiling, wall: 0x4a1a2a, wall2: 0x3a1422, trim: 0xc9a062, ceilColor: 0x3a2a32, floor: { type: 'carpet', color: 0x5a1a2a, size: 0.8 }, hole: { x: -3.5, y: 3.0, r: 0.8 }, crown: false, dust: 50, name: 'cinema' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  // screen + frame + stage + curtains + speakers
  const sW = 7.2, sH = 3.0; const scr = liveScreen('movie', sW, sH, { px: 384, fps: 12 }); scr.position.set(0, 2.6, -hd + 0.12); g.add(scr); R.reg(scr);
  P(g, bg(sW + 0.3, 0.15, 0.2), mat(0x15151c), [0, 2.6 + sH / 2 + 0.07, -hd + 0.1]); P(g, bg(sW + 0.3, 0.15, 0.2), mat(0x15151c), [0, 2.6 - sH / 2 - 0.07, -hd + 0.1]); for (const s of [-1, 1]) P(g, bg(0.15, sH + 0.3, 0.2), mat(0x15151c), [s * (sW / 2 + 0.07), 2.6, -hd + 0.1]);
  P(g, rg(sW + 1.5, 0.3, 1.2, 0.05), mat(0x3a2a1a), [0, 0.15, -hd + 0.6]); for (const s of [-1, 1]) { const cp = DEC.clothPanel(1.3, 4.2, 0xb02a3a, { folds: 6, amp: 0.07, sway: 0.05, phase: s }); cp.position.set(s * (sW / 2 + 0.95), 4.3, -hd + 0.35); g.add(cp); R.reg(cp); const sp = ELEC.speaker({ h: 1.2, color: 0x20222a }); R.place(sp, s * (sW / 2 + 0.7), 0.3, -hd + 0.8); sp.position.y = 0.3; }
  // raked seating: row i at z = -hd + 2.6 + i*0.95, y = i*0.22
  const base = [], back = [], arms = []; const seatC = [0xb02a3a, 0xa02434];
  for (let i = 0; i < rows; i++) {
    const z = -hd + 2.8 + i * 0.95, y = i * 0.23; P(g, bg(w - 0.2, y + 0.12, 0.95), mat(0x2a1a22, { rough: 1 }), [0, (y - 0.12) / 2 + 0.0, z]); P(g, bg(w - 0.2, 0.02, 0.95), mat(0x5a1a2a, { rough: 1 }), [0, y + 0.01, z]);
    P(g, bg(w - 0.2, 0.03, 0.04), glow(0xffa030, 0.9), [0, y + 0.03, z - 0.45]);
    for (let c = 0; c < cols; c++) { const aisleShift = c >= cols / 2 ? 0.9 : 0; const x = (c - (cols - 1) / 2) * 0.62 + (c >= cols / 2 ? 0.45 : -0.45); const col = seatC[(i + c) % 2]; base.push({ p: [x, y + 0.3, z + 0.02], s: [0.52, 0.12, 0.5], c: col }); back.push({ p: [x, y + 0.72, z - 0.22], s: [0.5, 0.7, 0.1], r: [-0.12, 0, 0], c: col }); if (c % 3 === 0 || c === cols - 1) arms.push({ p: [x + (c % 3 === 0 ? -0.29 : 0.29), y + 0.46, z], s: [0.07, 0.08, 0.5], c: 0x2a2a30 }); }
  }
  inst(g, rg(1, 1, 1, 0.1), mat(0xffffff, { rough: 0.8 }), base, { cast: true }); inst(g, rg(1, 1, 1, 0.1), mat(0xffffff, { rough: 0.8 }), back, { cast: true }); inst(g, bg(1, 1, 1), mat(0xffffff, { rough: 0.6 }), arms);
  // people in the seats (low-detail, facing the screen)
  const sit = []; if (people) { const pr = rng(seed + 9); const taken = new Set(); for (let n = 0; n < 11; n++) { const i = 1 + Math.floor(pr() * (rows - 1)), c = Math.floor(pr() * cols); const key = i * 20 + c; if (taken.has(key)) continue; taken.add(key); const z = -hd + 2.8 + i * 0.95, y = i * 0.23; const x = (c - (cols - 1) / 2) * 0.62 + (c >= cols / 2 ? 0.45 : -0.45); const s = sitter(pr, { seat: 0.36, ry: PI, lookAround: 0.08 }); R.place(s, x, y, z - 0.05); sit.push(s); } }
  // projection booth with beam (flickers) + dust
  const booth = new THREE.Group(); const by = (rows - 1) * 0.23 + 3.3; P(booth, bg(1.2, 0.8, 0.2), mat(0x15151c), [0, by, hd - 0.15]); P(booth, bg(0.4, 0.3, 0.02), glow(0xcfe8ff, 1.0), [0, by, hd - 0.26]); g.add(booth);
  const sx = 0, sy = by, sz = hd - 0.3, tx = 0, ty = 2.6, tz = -hd + 0.14; const L = Math.hypot(ty - sy, tz - sz); const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 3.4, L, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.set((sx + tx) / 2, (sy + ty) / 2, (sz + tz) / 2); beam.lookAt(tx, ty, tz); beam.rotateX(HP); beam.rotation.z = PI / 4; g.add(beam); beam.scale.set(1, 1, 0.6); beam.userData.update = (t) => { beam.material.opacity = 0.06 + 0.025 * Math.sin(t * 23) * Math.sin(t * 7) + 0.01 * Math.sin(t * 3); }; R.reg(beam);
  // sconces, exit signs (pulse), aisle step lights, popcorn on the floor, side posters
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const y = i * 0.23 * 1.7 + 0.0; const sc2 = new THREE.Group(); P(sc2, rg(0.25, 0.5, 0.12, 0.05), glow(0xffb870, 0.8), [0, 0, 0.06]); P(sc2, bg(0.3, 0.55, 0.04), mat(0xc9a062, { metal: 0.6 }), [0, 0, 0.0]); mountOnWall(R, sc2, -hd + 3.6 + i * 1.7, 2.2 + i * 0.35, s < 0 ? 'left' : 'right'); }
  for (const s of [-1, 1]) { const ex = sign('EXIT', 0.6, 0.24, { bg: '#0a5a2a', fg: '#7dff9a', size: 0.7, px: 128, emissive: true }); ex.userData.update = (t) => { ex.material.color.setScalar(0.75 + 0.25 * Math.sin(t * 2.5 + s)); }; mountOnWall(R, ex, hd - 1.2, 3.2, s < 0 ? 'left' : 'right'); }
  [['robot', 0.9, 1.3], ['rocket', 0.9, 1.3], ['star', 0.9, 1.3]].forEach(([k, pw, ph], i) => { const p = DEC.poster(pw, ph, { kind: k, seed: i + 4, frame: 0x15151c }); mountOnWall(R, p, -2.0 + i * 1.6, 2.0, 'left'); const p2 = DEC.poster(pw, ph, { kind: ['cat', 'heart', 'map'][i], seed: i + 9, frame: 0x15151c }); mountOnWall(R, p2, -2.0 + i * 1.6, 2.0, 'right'); });
  R.g.add(clutter({ x: 0, z: 1.5, w: 9, d: 7 }, { kind: ['food', 'trash'], seed: seed + 5, density: 0.5 + wrecked * 2, y: 0.0, avoid: [{ x: 0, z: 1.5, w: 8, d: 7 }] }));
  const fl = []; for (let i = 0; i < 6; i++) fl.push({ p: [(i - 2.5) * 1.4, 0.015 + 0.0, hd - 1.8], s: [0.2, 0.01, 0.16], c: 0xfff0b0 }); inst(R.g, bg(1, 1, 1), mat(0xffffff), fl);
  const cam = { pos: [0.0, (rows - 1) * 0.23 + 1.6, hd + 2.2], target: [0, 2.3, -hd + 1.0], fov: 62 };
  return R.finish({ screen: scr }, cam);
}

// ---------------------------------------------------------------- hospital room
export function buildHospitalRoom({ seed = 16, wrecked = 0, ceiling = true, people = true } = {}) {
  const R = room({ w: 5.2, d: 4.8, h: 2.8, seed, wrecked, ceiling, wall: 0xdff2ec, wall2: 0xd0e8e2, trim: 0xffffff, wainscot: 0x8ac8b8, floor: { type: 'lino', color: 0xe4ece8, color2: 0xd4dfdb }, hole: { x: -1.8, y: 1.9, r: 0.55 }, name: 'hospital' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  // hospital bed: raised, rails, lamp, patient lump
  const bed = new THREE.Group(); P(bed, rg(1.0, 0.1, 2.1, 0.03), mat(0xc8ccd6, { metal: 0.6 }), [0, 0.5, 0], [0, 0, 0], 1, true); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { P(bed, cg(0.03, 0.03, 0.4, 8), mat(0x888d99, { metal: 0.7 }), [sx * 0.45, 0.25, sz * 0.9]); P(bed, sg(0.05, 8, 6), mat(0x15151c), [sx * 0.45, 0.04, sz * 0.9]); }
  P(bed, rg(0.92, 0.16, 2.0, 0.06), mat(0xf6f8f8, { rough: 0.9 }), [0, 0.62, 0], [0, 0, 0], 1, true); P(bed, rg(0.96, 0.12, 1.2, 0.05), mat(0x8ac8e0, { rough: 0.95 }), [0, 0.72, 0.35], [0, 0, 0], 1, true); P(bed, rg(0.5, 0.12, 0.35, 0.06), mat(0xffffff, { rough: 0.9 }), [0, 0.74, -0.8], [-0.2, 0, 0]); P(bed, rg(0.96, 0.06, 0.8, 0.03), mat(0xf6f8f8), [0, 0.8, -0.55], [-0.3, 0, 0]);
  for (const s of [-1, 1]) { P(bed, bg(0.03, 0.03, 1.1), mat(0xc8ccd6, { metal: 0.7 }), [s * 0.5, 0.95, 0.1]); for (let i = 0; i < 4; i++) P(bed, bg(0.02, 0.3, 0.02), mat(0xc8ccd6, { metal: 0.7 }), [s * 0.5, 0.8, -0.4 + i * 0.35]); }
  P(bed, rg(1.05, 0.5, 0.06, 0.03), mat(0xc8ccd6, { metal: 0.5 }), [0, 0.8, -1.05], [0, 0, 0]); P(bed, rg(1.0, 0.35, 0.06, 0.03), mat(0xc8ccd6, { metal: 0.5 }), [0, 0.7, 1.05]);
  R.place(R.topple(bed, 0.5, 0.9), -hw + 1.2, 0, -hd + 1.4, 0); 
  // IV stand with dripping bag, heart monitor with ECG, bedside table, flowers, cards
  const iv = new THREE.Group(); P(iv, cg(0.015, 0.015, 1.9, 6), mat(0xc8ccd6, { metal: 0.8 }), [0, 0.95, 0]); P(iv, cg(0.25, 0.28, 0.03, 16), mat(0x555a66, { metal: 0.5 }), [0, 0.02, 0]); for (let i = 0; i < 4; i++) P(iv, sg(0.03, 6, 5), mat(0x15151c), [Math.cos(i * HP) * 0.25, 0.03, Math.sin(i * HP) * 0.25]); P(iv, bg(0.5, 0.02, 0.02), mat(0xc8ccd6, { metal: 0.8 }), [0, 1.9, 0]); P(iv, rg(0.2, 0.3, 0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.6, roughness: 0.1 }), [0.1, 1.72, 0]); P(iv, rg(0.16, 0.16, 0.04, 0.03), mat(0x9ad8ff, { rough: 0.2 }), [0.1, 1.67, 0.002]); P(iv, cg(0.015, 0.015, 0.06, 6), mat(0xffffff), [0.1, 1.53, 0]); tube(iv, [[0.1, 1.5, 0], [0.05, 1.0, 0.05], [-0.4, 0.8, 0.1], [-0.55, 0.78, 0.3]], 0.004, 0xe8f0f0, { seg: 12, sides: 3 });
  const dr = P(iv, sg(0.012, 6, 5), new THREE.MeshBasicMaterial({ color: 0x9ad8ff }), [0.1, 1.48, 0]); iv.userData.update = (t) => { const ph = (t * 1.1) % 1; dr.position.y = 1.52 - ph * 0.18; dr.visible = ph < 0.85; }; R.place(iv, -hw + 2.0, 0, -hd + 1.0);
  const hm = new THREE.Group(); P(hm, cg(0.02, 0.02, 1.4, 6), mat(0x555a66, { metal: 0.6 }), [0, 0.7, 0]); P(hm, cg(0.25, 0.28, 0.04, 16), mat(0x555a66), [0, 0.02, 0]); P(hm, rg(0.6, 0.45, 0.2, 0.04), mat(0xdfe4ea, { rough: 0.3 }), [0, 1.5, 0], [0, 0, 0], 1, true); const ec = liveScreen('ecg', 0.5, 0.33, { px: 256, fps: 15 }); ec.position.set(0, 1.5, 0.105); hm.add(ec); P(hm, bg(0.45, 0.03, 0.04), mat(0x555a66), [0, 1.3, 0.1]); for (let i = 0; i < 3; i++) P(hm, sg(0.012, 6, 5), glow([0x3aff6a, 0xffaa2a, 0x6ad0ff][i], 2), [-0.15 + i * 0.05, 1.3, 0.125]); hm.rotation.y = 0.4; R.place(hm, -hw + 2.3, 0, -hd + 1.6, 0.5); tube(R.g, [[-hw + 2.2, 1.2, -hd + 1.6], [-hw + 1.8, 0.8, -hd + 1.5], [-hw + 1.4, 0.8, -hd + 1.4]], 0.006, 0x3a78d0, { seg: 12, sides: 3 });
  const ns = FUR.nightstand({ color: 0xdfe4ea }); on(ns, DEC.flowerVase(0xff5c8a, { seed: 3 }), -0.05, 0.55, 0.0); on(ns, DEC.mug(0xffffff), 0.15, 0.55, 0.1); const card = new THREE.Group(); P(card, bg(0.12, 0.16, 0.004), mat(0xff7a8a), [0, 0.08, 0], [-0.3, 0, 0]); on(ns, card, -0.18, 0.55, 0.12); R.place(R.topple(ns, 0.23, 0.7), -hw + 2.3 + 0.9, 0, -hd + 0.3);
  // window + curtain, privacy curtain on a ceiling track (swaying), TV on arm, sink, cabinet, wheelchair, sanitizer, clock, posters
  const win = DEC.windowView(1.5, 1.2, { view: 'day', seed, frame: 0xffffff }); R.place(win, 1.0, 1.75, -hd); R.place(DEC.blinds(1.5, 0.7, 0xf2ead8, { open: 0.5 }), 1.0, 2.5, -hd + 0.1);
  const pc = DEC.clothPanel(1.9, 2.1, 0x8ac8e0, { folds: 8, amp: 0.05, sway: 0.07, phase: 1 }); const track = new THREE.Group(); P(track, bg(2.0, 0.03, 0.04), mat(0xc8ccd6, { metal: 0.7 }), [0, 0, 0]); pc.position.set(0, -0.03, 0); track.add(pc); R.place(track, -hw + 2.9, h - 0.05, -hd + 1.8 + 0.6, HP);
  const tv = ELEC.tv({ w: 0.9, kind: 'tv', wall: true, seed: 5 }); R.place(tv, hw - 0.04, 2.1, 0.6, -HP);
  const sink = APP.basin({ w: 0.6, vcolor: 0xdfe4ea, mirrorOn: false }); R.place(sink, hw - 0.3, 0, -hd + 1.0, -HP); const mir = DEC.mirror(0.5, 0.7); mountOnWall(R, mir, -hd + 1.0, 1.55, 'right');
  const cab = FUR.shelfFilled({ w: 0.9, h: 1.7, d: 0.4, kind: 'pantry', seed: seed + 3, color: 0xdfe4ea, rows: 5 }); R.place(R.topple(cab, 0.45, 0.6), hw - 0.22, 0, 1.9, -HP);
  const wc = new THREE.Group(); for (const s of [-1, 1]) { P(wc, cg(0.3, 0.3, 0.04, 20), mat(0x15151c), [s * 0.3, 0.3, -0.1], [0, 0, HP], 1, true); P(wc, new THREE.TorusGeometry(0.26, 0.012, 6, 20), mat(0xc8ccd6, { metal: 0.8 }), [s * 0.33, 0.3, -0.1], [0, HP, 0]); } P(wc, rg(0.5, 0.06, 0.5, 0.02), mat(0x3a78d0, { rough: 0.8 }), [0, 0.5, 0.0]); P(wc, rg(0.5, 0.5, 0.06, 0.02), mat(0x3a78d0, { rough: 0.8 }), [0, 0.8, -0.27]); for (const s of [-1, 1]) P(wc, bg(0.04, 0.05, 0.4), mat(0x2a2a30), [s * 0.27, 0.68, -0.05]); R.place(R.topple(wc, 0.4, 0.6), hw - 0.8, 0, -hd + 2.6, 2.5);
  const san = new THREE.Group(); P(san, rg(0.1, 0.2, 0.08, 0.03), mat(0xffffff), [0, 0, 0.04]); P(san, bg(0.06, 0.06, 0.02), mat(0x3a78d0), [0, -0.02, 0.1]); mountOnWall(R, san, 0.3, 1.3, 'back');
  const cl = DEC.wallClock(0.25, { frame: 0xffffff, h0: 3, m0: 50 }); R.place(cl, -0.2, 2.4, -hd);
  const cross = new THREE.Group(); P(cross, bg(0.4, 0.4, 0.02), mat(0xffffff), [0, 0, 0.01]); P(cross, bg(0.28, 0.08, 0.025), mat(0xe03030), [0, 0, 0.012]); P(cross, bg(0.08, 0.28, 0.025), mat(0xe03030), [0, 0, 0.012]); mountOnWall(R, cross, hw - 1.4, 2.4, 'back');
  const gc = DEC.poster(0.5, 0.35, { kind: 'landscape', seed: 3, frame: 0xffffff }); mountOnWall(R, gc, -1.2, 1.7, 'right'); mountOnWall(R, DEC.poster(0.5, 0.35, { kind: 'sunset', seed: 2, frame: 0xffffff }), 0.6, 1.7, 'right');
  R.place(DEC.plant({ kind: 'fern', h: 0.9, seed: 5, pot: 0xffffff }), hw - 0.45, 0, hd - 0.5); const chr = FUR.chair({ kind: 'folding' }); R.place(R.topple(chr, 0.22, 0.5), -hw + 2.5, 0, 0.45, 0.6);
  R.place(DEC.panelLight(0.6, 1.2), -0.6, h, 0.0); R.place(DEC.panelLight(0.6, 1.2), 1.4, h, 0.0);
  if (people) R.place(sitter(r, { seat: 0.46, ry: 0.6 }), -hw + 2.5, 0, 0.4);
  R.g.add(clutter({ x: 0.5, z: 0.4, w: 3.5, d: 3, }, { kind: ['papers', 'trash'], seed: seed + 4, density: wrecked * 2.5 + 0.1, avoid: [] }));
  return R.finish({ bed }, camFor(R, { fov: 56, y: 1.65, ty: 1.15, fit: 1.35 }));
}

// ---------------------------------------------------------------- elevator (doors on the back wall open / close; floor numbers count)
export function buildElevator({ seed = 17, wrecked = 0, ceiling = true, people = false, doorsOpen = null } = {}) {
  const R = room({ w: 2.5, d: 2.3, h: 2.7, seed, wrecked, ceiling, wall: 0xc8ccd6, wall2: 0xb8bcc8, trim: 0x8a8e98, floor: { type: 'tiles', size: 0.3, c1: 0x55596a, c2: 0x45495a, grout: 0x2a2e3a, vary: 0.0 }, crown: false, dust: 12, name: 'elevator', baseH: 0.1 });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  const dwid = 1.1; const dl = new THREE.Group(), dr = new THREE.Group(); const dm = mat(0xdfe4ea, { metal: 0.85, rough: 0.2 }); P(dl, bg(dwid / 2, 2.2, 0.04), dm, [-dwid / 4, 1.1, 0], [0, 0, 0], 1, true); P(dr, bg(dwid / 2, 2.2, 0.04), dm, [dwid / 4, 1.1, 0], [0, 0, 0], 1, true); for (const gp of [dl, dr]) { P(gp, bg(0.02, 2.0, 0.01), mat(0x8a8e98), [gp === dl ? -0.01 : 0.01, 1.1, 0.025]); }
  dl.position.set(0, 0, -hd + 0.06); dr.position.set(0, 0, -hd + 0.06); g.add(dl); g.add(dr);
  P(g, bg(dwid + 0.2, 2.35, 0.03), mat(0x2a2a30), [0, 1.17, -hd + 0.02]); for (const s of [-1, 1]) P(g, bg(0.12, 2.3, 0.08), mat(0xdfe4ea, { metal: 0.8 }), [s * (dwid / 2 + 0.1), 1.15, -hd + 0.07]); P(g, bg(dwid + 0.4, 0.1, 0.08), mat(0xdfe4ea, { metal: 0.8 }), [0, 2.32, -hd + 0.07]);
  const hall = new THREE.Group(); P(hall, bg(1.6, 2.4, 0.02), mat(0xf2e8c8, { rough: 1, emissive: 0xf2e8c8, emissiveIntensity: 0.9 }), [0, 1.2, -hd - 0.9]); P(hall, bg(1.6, 0.02, 1.2), mat(0x8a3a4a, { rough: 1, emissive: 0x8a3a4a, emissiveIntensity: 0.6 }), [0, 0.01, -hd - 0.4]); const pl = DEC.plant({ kind: 'fern', h: 0.9, seed: 2 }); pl.position.set(0.3, 0, -hd - 0.7); hall.add(pl); const hp = DEC.poster(0.4, 0.5, { kind: 'abstract', frame: 0xc9a062 }); hp.position.set(-0.25, 1.4, -hd - 0.88); hall.add(hp); g.add(hall); R.reg(hall);
  const fl = liveScreen('floor', 0.28, 0.2, { px: 96, fps: 4, value: (t) => 1 + (Math.floor(t * 0.4) % 9) }); fl.position.set(0, 2.5, -hd + 0.07); g.add(fl); R.reg(fl); P(g, rg(0.34, 0.26, 0.04, 0.02), mat(0x15151c), [0, 2.5, -hd + 0.045]); const ar = P(g, new THREE.ConeGeometry(0.05, 0.08, 3), glow(0xff9a3a, 2), [0.28, 2.5, -hd + 0.08]); ar.userData.update = (t) => { ar.visible = Math.floor(t * 2) % 2 === 0; }; R.reg(ar);
  // mirrored left wall, handrail, button panel on the right wall with glowing buttons, plates
  const mir = DEC.mirror(1.7, 1.3, { frame: 0xdfe4ea }); mountOnWall(R, mir, 0.0, 1.35, 'left');
  for (const s of [-1, 1]) { const rail = new THREE.Group(); P(rail, cg(0.025, 0.025, 1.8, 8), mat(0xdfe4ea, { metal: 0.9, rough: 0.2 }), [0, 0, 0], [HP, 0, 0]); for (const z of [-0.8, 0.8]) P(rail, cg(0.012, 0.012, 0.08, 6), mat(0xdfe4ea, { metal: 0.9 }), [0, 0, z], [0, 0, HP]); rail.position.set(s < 0 ? -hw + 0.07 : hw - 0.07, 1.0, 0); if (s > 0) rail.position.z = 0.35; g.add(rail); }
  const panel = new THREE.Group(); P(panel, rg(0.3, 0.9, 0.04, 0.02), mat(0xdfe4ea, { metal: 0.9, rough: 0.2 }), [0, 0, 0.02]); const btn = []; for (let i = 0; i < 9; i++) { const b = P(panel, cg(0.03, 0.03, 0.02, 14), mat(0xf2f2f6, { rough: 0.3, emissive: 0xffe0a0, emissiveIntensity: 0.2 }), [(i % 3 - 1) * 0.08, 0.3 - Math.floor(i / 3) * 0.12, 0.05], [HP, 0, 0]); btn.push(b); } P(panel, rg(0.2, 0.06, 0.01, 0.01), mat(0xc8302b), [0, -0.38, 0.045]); panel.userData.update = (t) => { btn.forEach((b, i) => { b.material = b.material; }); }; const lit = P(panel, cg(0.034, 0.034, 0.012, 14), glow(0xffa030, 2), [0.08, 0.3 - 0.12, 0.055], [HP, 0, 0]); lit.userData.update = (t) => { lit.visible = Math.floor(t * 1.5) % 4 !== 3; }; R.place(panel, hw - 0.0, 1.15, 0.6, -HP); R.reg(panel);
  const pl2 = sign('MAX 8 PERSONS · 630 kg', 0.34, 0.1, { bg: '#2a2e38', fg: '#fff', size: 0.45, px: 192 }); mountOnWall(R, pl2, 0.6, 1.9, 'right'); const sp = new THREE.Group(); P(sp, cg(0.06, 0.06, 0.02, 14), mat(0x2a2a30), [0, 0, 0.01], [HP, 0, 0]); sp.userData.update = () => {}; R.place(sp, 0, h - 0.02, 0.5, 0);
  // ceiling light panel (flickers lightly), vent, cable
  R.place(DEC.panelLight(1.2, 1.0, { k: 1.4 }), 0, h, 0.1); const fl2 = DEC.fluorescent(0.6, { flicker: 0.12, seed }); R.place(fl2, 0, h - 0.0, 0.8);
  // sliding doors: auto-cycle (open ~40% of the time) or set doorsOpen 0..1
  const upd = (t) => { const ph = (t * 0.15) % 1; const k = doorsOpen ?? (ph < 0.2 ? smooth(ph / 0.2) : ph < 0.6 ? 1 : ph < 0.8 ? 1 - smooth((ph - 0.6) / 0.2) : 0); dl.position.x = -k * dwid / 2.2; dr.position.x = k * dwid / 2.2; hall.visible = k > 0.02; };
  R.anim(upd);
  if (people) R.place(stander(r, { pose: 'idle', ry: 0 }), -0.4, 0, 0.3, 0);
  R.g.add(clutter({ x: 0, z: 0.3, w: 1.8, d: 1.6 }, { kind: ['papers', 'trash'], seed: seed + 2, density: wrecked * 2.5, avoid: [] }));
  return R.finish({}, { pos: [0.0, 1.5, hd + 2.4], target: [0, 1.2, -hd], fov: 56 });
}
