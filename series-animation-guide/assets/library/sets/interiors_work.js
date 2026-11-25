// INTERIORS pack: workplace sets (office cubicles, TV news studio, NASA-style mission control, secret military control room, science lab).
// Conventions as in interiors_home.js: open towards +Z, origin at floor centre, { seed, wrecked, ceiling, people } -> { group, update, anchors, cam, size }.
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
// a screen template that can be cloned cheaply (clones share one canvas texture; only the template's update repaints)
const shared = (R, kind, w, h, o = {}) => { const s = liveScreen(kind, w, h, o); R.reg(s); const clone = () => { const c = s.clone(); c.userData = { noShadow: true }; return c; }; return { s, clone }; };

// ---------------------------------------------------------------- office with cubicles
export function buildOfficeCubicles({ seed = 21, wrecked = 0, ceiling = true, people = true } = {}) {
  const R = room({ w: 10.4, d: 7.6, h: 2.9, seed, wrecked, ceiling, wall: 0xe4e8ee, wall2: 0xd8dde6, trim: 0xffffff, floor: { type: 'carpet', color: 0x6d7a96, size: 0.5 }, hole: { x: 3.0, y: 2.0, r: 0.6 }, name: 'office' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  const kinds = ['code', 'chart', 'desktop', 'stocks']; const sc = kinds.map((k, i) => shared(R, k, 0.5, 0.29, { px: 192, seed: i + 2, fps: 8 }));
  // cubicle grid 3 x 2, each with partitions, desk, monitor, keyboard, chair, plant, notes
  for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
    const cx = -3.2 + col * 3.2, cz = -0.8 + row * 2.6; const c = new THREE.Group(); const fabric = [0x3a78d0, 0x3fa090, 0xd8704a][(row + col) % 3];
    P(c, rg(2.4, 1.45, 0.07, 0.03), mat(fabric, { rough: 1 }), [0, 0.72, -1.0], [0, 0, 0], 1, true); P(c, rg(0.07, 1.45, 2.0, 0.03), mat(fabric, { rough: 1 }), [-1.2, 0.72, 0], [0, 0, 0], 1, true); P(c, rg(0.07, 1.25, 2.0, 0.03), mat(shade(fabric, 0.9), { rough: 1 }), [1.2, 0.62, 0], [0, 0, 0], 1, true);
    P(c, bg(2.42, 0.05, 0.1), mat(0xc8ccd6, { metal: 0.5 }), [0, 1.45, -1.0]);
    const dk = new THREE.Group(); P(dk, rg(2.0, 0.04, 0.8, 0.015), mat(0xe8e4dc, { rough: 0.5 }), [0, 0.74, 0], [0, 0, 0], 1, true); P(dk, bg(0.04, 0.72, 0.7), mat(0xc8ccd6, { metal: 0.4 }), [-0.95, 0.36, 0]); P(dk, bg(0.04, 0.72, 0.7), mat(0xc8ccd6, { metal: 0.4 }), [0.95, 0.36, 0]); P(dk, rg(0.4, 0.5, 0.6, 0.02), mat(0xc8ccd6, { metal: 0.4 }), [0.7, 0.44, 0]);
    const m = sc[(row * 3 + col) % 4].clone(); const mon = new THREE.Group(); P(mon, rg(0.56, 0.35, 0.04, 0.015), mat(0x20222a), [0, 0, 0]); m.position.z = 0.022; mon.add(m); P(mon, bg(0.04, 0.16, 0.03), mat(0x20222a), [0, -0.22, -0.03]); P(mon, rg(0.2, 0.012, 0.16, 0.005), mat(0x20222a), [0, -0.3, 0.0]); on(dk, mon, -0.1, 1.07, -0.18);
    on(dk, ELEC.keyboard(), -0.1, 0.76, 0.12); on(dk, ELEC.mouse(), 0.25, 0.76, 0.12); on(dk, DEC.mug([0xe04a3a, 0xffffff, 0xffd23f][col % 3], { steamOn: (row + col) % 2 === 0 }), 0.6, 0.76, 0.2); on(dk, DEC.bookStack(3, { seed: row * 3 + col }), -0.7, 0.76, -0.1); const ph = ELEC.phone({ kind: 'chat' }); ph.rotation.x = -HP; on(dk, ph, 0.7, 0.77, -0.1);
    on(dk, DEC.plant({ kind: col % 2 ? 'succulent' : 'cactus', h: 0.3, pot: 0xe8d8b8 }), 0.8, 0.76, -0.3);
    const ph2 = DEC.poster(0.22, 0.28, { kind: 'cat', seed: col + row, frame: 0xffffff }); ph2.position.set(0.7, 1.1, -0.95); c.add(ph2); for (let i = 0; i < 5; i++) { const n = P(c, bg(0.07, 0.07, 0.004), mat([0xfff3a0, 0xffc8d8, 0xc8f0d0][i % 3], { rough: 1 }), [-0.9 + i * 0.12, 1.2 + (i % 2) * 0.1, -0.955], [0, 0, (i - 2) * 0.1]); }
    c.add(dk); const chair = FUR.chair({ kind: 'office', seed: row * 3 + col, seat: [0x20222a, 0x3a3e58, 0x2a4a5a][col % 3] }); on(c, chair, 0.0, 0.0, 0.62, PI + (col - 1) * 0.3);
    R.place(R.topple(c, 1.2, 0.85), cx, 0, cz);
    if (people && (row + col) % 2 === 0 && wrecked < 0.5) { const s = sitter(r, { seat: 0.52, ry: PI, typing: true }); s.position.set(cx, 0, cz + 0.62 + 0.0); R.place(s, cx, 0, cz + 0.62); }
    R.g.add(clutter({ x: cx - 0.2, z: cz + 0.0, w: 1.0, d: 0.5 }, { kind: 'office', seed: seed + row * 3 + col, density: 3, y: 0.76, avoid: [{ x: cx - 0.1, z: cz - 0.2, w: 0.7, d: 0.3 }, { x: cx - 0.1, z: cz + 0.1, w: 0.5, d: 0.2 }] }));
  }
  // back wall: whiteboard with a chart, big city window, clock, notice; right: printer, water cooler, filing, coffee
  const wbb = sign('', 2.6, 1.1, { bg: '#fbfbf6', px: 512, lines: ['Q3 TARGETS', '▲ SALES   ▲ COFFEE', '▼ MEETINGS'], fg: '#2a4a9a', size: 0.55, font: '700', border: '#c8ccd6' }); wbb.position.set(-2.8, 1.75, -hd + 0.01); g.add(wbb);
  const win = DEC.windowView(3.0, 1.6, { view: 'city', seed, frame: 0xdfe4ea, panes: [3, 1] }); R.place(win, 1.6, 1.7, -hd); const bl = DEC.blinds(3.0, 0.8, 0xe8e4dc, { open: 0.6 }); R.place(bl, 1.6, 2.5, -hd + 0.1);
  R.place(DEC.wallClock(0.25, { frame: 0x20222a, h0: 9, m0: 41 }), -0.8, 2.4, -hd);
  const pr = new THREE.Group(); P(pr, rg(0.6, 0.35, 0.5, 0.04), mat(0xdfe4ea, { rough: 0.4 }), [0, 0.8, 0], [0, 0, 0], 1, true); P(pr, rg(0.52, 0.05, 0.4, 0.02), mat(0xffffff), [0, 0.99, 0]); P(pr, bg(0.6, 0.62, 0.5), mat(0x555a66), [0, 0.31, 0]); const pl2 = []; for (let i = 0; i < 4; i++) pl2.push(P(pr, sg(0.012, 6, 5), glow([0x3aff6a, 0xffaa2a, 0x3aa0ff, 0x3aff6a][i], 2), [-0.2 + i * 0.05, 0.88, 0.255])); const pap = P(pr, bg(0.21, 0.003, 0.3), mat(0xffffff), [0, 1.0, 0.0]); pr.userData.update = (t) => { pl2.forEach((l, i) => { l.visible = ((Math.floor(t * (3 + i)) * 2654435761) >>> 0) % 5 > 0; }); const ph = (t * 0.25) % 1; pap.position.set(0, 1.0 + (ph < 0.3 ? ph * 0.2 : 0), ph < 0.3 ? 0.1 + ph * 0.5 : 0.0); }; R.place(R.topple(pr, 0.3, 0.7), hw - 0.5, 0, -hd + 0.5);
  R.place(APP.waterCooler(), hw - 0.5, 0, -hd + 1.5); const cof = FUR.table({ w: 0.8, d: 0.5, h: 0.9, color: 0xdfe4ea }); on(cof, APP.coffeeMachine(), -0.1, 0.9, 0); on(cof, DEC.mug(0xffffff), 0.28, 0.9, 0.0); R.place(cof, hw - 0.5, 0, -hd + 2.5, -HP);
  R.place(FUR.filingCabinet(), -hw + 0.4, 0, -hd + 0.5); R.place(FUR.filingCabinet(), -hw + 0.4, 0, -hd + 1.3); R.place(FUR.shelfFilled({ w: 1.2, h: 1.9, kind: 'books', seed: seed + 3, color: 0x8a8e98 }), -hw + 0.22, 0, 1.6, HP);
  const gl = DEC.gallery(5, { w: 2.0, h: 0.9, seed: seed + 1 }); mountOnWall(R, gl, 0.0, 1.8, 'left'); const tr = DEC.poster(0.5, 0.7, { kind: 'map', seed: 3, frame: 0x20222a }); mountOnWall(R, tr, 2.0, 1.8, 'left');
  const bn = sign('KEEP CALM AND CARRY ON', 1.4, 0.3, { bg: '#e04a3a', fg: '#fff', size: 0.45, px: 256 }); mountOnWall(R, bn, -2.6, 2.2, 'right');
  R.place(DEC.plant({ kind: 'tree', h: 1.8, seed: 3 }), -hw + 0.5, 0, hd - 0.6); R.place(DEC.plant({ kind: 'monstera', h: 1.3, seed: 5, pot: 0xffffff }), hw - 0.5, 0, hd - 0.6);
  for (const [x, z] of [[-3.2, -1.2], [0, -1.2], [3.2, -1.2], [-3.2, 1.4], [0, 1.4], [3.2, 1.4]]) R.place(DEC.panelLight(1.2, 0.6, { k: 1.1 }), x, h, z);
  R.place(DEC.ceilingFan({ r: 0.6, color: 0xdfe4ea, light: false, speed: 4 }), 1.6, h, 0.3);
  const bin = new THREE.Group(); P(bin, new THREE.CylinderGeometry(0.2, 0.17, 0.42, 12, 1, true), mat(0x3a3e48, { rough: 0.5, side: THREE.DoubleSide }), [0, 0.21, 0]); R.place(R.topple(bin, 0.2, 0.7), 1.6, 0, 3.0);
  const dor = door({ color: 0x3a78d0, frame: 0xffffff, glass: true }); R.place(dor, hw - 0.04, 0, hd - 1.2, -HP);
  R.g.add(clutter({ x: 0, z: 0.7, w: 9, d: 5.8 }, { kind: ['papers', 'trash', 'office'], seed: seed + 8, density: 0.25 + wrecked * 2.4, avoid: [] }));
  return R.finish({}, camFor(R, { fov: 56, y: 1.8, ty: 1.3, fit: 1.2 }));
}

// ---------------------------------------------------------------- TV news studio
export function buildNewsStudio({ seed = 22, wrecked = 0, ceiling = true, people = true } = {}) {
  const R = room({ w: 10.4, d: 7.8, h: 4.6, seed, wrecked, ceiling, wall: 0x1a2a5a, wall2: 0x141e44, trim: 0x2a3a7a, ceilColor: 0x20243a, floor: { type: 'tiles', size: 0.5, c1: 0x20263a, c2: 0x2a3250, grout: 0x10141f, checker: true }, hole: { x: -3.6, y: 2.4, r: 0.8 }, crown: false, name: 'newsStudio' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  // LED wall: 3 screens (news, map, weather) + logo strip + ticker
  const mk = (kind, x, ww, hh, o = {}) => { const s = liveScreen(kind, ww, hh, { px: 384, fps: 10, ...o }); s.position.set(x, 2.6, -hd + 0.1); g.add(s); R.reg(s); P(g, bg(ww + 0.15, hh + 0.15, 0.1), mat(0x0a0e1c), [x, 2.6, -hd + 0.05]); return s; };
  mk('news', -2.9, 3.6, 2.2, { heads: ['SIZE MATTERS: GIANT CAT SPOTTED', 'MAYOR OPENS NEW SKYSCRAPER', 'WEATHER: GLORIOUS'] }); mk('map', 0.3, 2.6, 2.2); mk('weather', 3.3, 2.6, 2.2);
  const logo = sign('', 4.2, 0.5, { bg: '#e5173f', fg: '#fff', lines: ['SIX O\'CLOCK NEWS'], size: 0.7, px: 512, family: 'Anton, Inter, sans-serif', font: '400' }); logo.position.set(-1.2, 4.0, -hd + 0.07); g.add(logo);
  for (let i = 0; i < 5; i++) { const bb = P(g, bg(0.22, 3.2, 0.1), glow(i % 2 ? 0x3a78d0 : 0xe5173f, 0.9), [-hw + 0.5 + i * 0.28, 1.9, -hd + 0.08]); bb.userData.update = (t) => { bb.material = bb.material; }; }
  // curved anchor desk: segments on an arc, glowing under-strip, logo plate, monitors, papers, mugs; two anchors
  const desk = new THREE.Group(); const N = 9; for (let i = 0; i < N; i++) { const a = (i - (N - 1) / 2) * 0.17; const seg = new THREE.Group(); seg.position.set(Math.sin(a) * 3.2, 0, -Math.cos(a) * 3.2 + 3.2); seg.rotation.y = -a; P(seg, rg(0.62, 0.95, 0.7, 0.04), mat(0xf4f4f8, { rough: 0.25 }), [0, 0.475, 0], [0, 0, 0], 1, true); P(seg, bg(0.62, 0.05, 0.06), glow(i % 2 ? 0x3a78d0 : 0xe5173f, 1.4), [0, 0.12, 0.36]); P(seg, rg(0.64, 0.05, 0.74, 0.02), mat(0x15151c, { rough: 0.2 }), [0, 0.97, 0.0]); desk.add(seg); }
  const lp = sign('6', 0.6, 0.6, { bg: '#e5173f', fg: '#fff', size: 0.9, px: 128, family: 'Anton, Inter, sans-serif', font: '400' }); lp.position.set(0, 0.5, 0.375 + 0.0); const pl = new THREE.Group(); pl.position.set(0, 0, -0.0 + 0.0); desk.add(lp); lp.position.set(0, 0.5, 0.36);
  for (const x of [-0.9, 0.9]) { const mo = ELEC.monitor({ w: 0.42, kind: 'chart', seed: x > 0 ? 3 : 4, stand: true }); mo.position.set(x, 0.99, -0.12 + 0.0); mo.rotation.y = -x * 0.15; desk.add(mo); }
  on(desk, DEC.mug(0xffffff), -0.3, 0.99, 0.0); const pap = new THREE.Group(); for (let i = 0; i < 3; i++) P(pap, bg(0.21, 0.004, 0.3), mat(0xffffff), [0, 0.003 * i, 0], [0, 0.2 * i, 0]); on(desk, pap, 0.4, 1.0, 0.05); on(desk, DEC.mug(0x3a78d0), 0.6, 0.99, 0.15);
  R.place(desk, 0.0, 0, -1.4 - 0.0);
  const anchors = []; if (people) for (const x of [-0.55, 0.6]) { const a = sitter(r, { seat: 0.52, ry: 0, lookAround: 0.1 }); R.place(a, x, 0, -2.1); anchors.push(a); }
  for (const x of [-0.55, 0.6]) { const ch = FUR.chair({ kind: 'office', seat: 0x20222a, seed: x }); R.place(ch, x, 0, -2.1, 0); }
  // 2 studio cameras (pan slowly), teleprompter, boom mic, light grid with spots, floor cables, side sofa set, ON AIR light
  const cam1 = ELEC.tvCamera(); R.place(cam1, -2.4, 0, 2.0, PI + 0.4); const cam2 = ELEC.tvCamera(); R.place(cam2, 2.8, 0, 2.2, PI - 0.5);
  const grid = new THREE.Group(); for (let i = 0; i < 5; i++) P(grid, cg(0.02, 0.02, w - 0.6, 6), mat(0x555a66, { metal: 0.6 }), [0, 0, -2.4 + i * 1.6], [0, 0, HP]); for (let i = 0; i < 4; i++) P(grid, cg(0.02, 0.02, 7, 6), mat(0x555a66, { metal: 0.6 }), [-3.6 + i * 2.4, 0, 0.8], [HP, 0, 0]); R.place(grid, 0, h - 0.4, 0);
  const spots = []; for (let i = 0; i < 14; i++) { const sx = -3.8 + (i % 7) * 1.3, sz = -2.2 + Math.floor(i / 7) * 3.6; const sp = new THREE.Group(); P(sp, cg(0.14, 0.12, 0.3, 14), mat(0x15151c), [0, -0.1, 0], [0, 0, 0]); P(sp, cg(0.12, 0.12, 0.02, 14), glow(i % 3 ? 0xfff0d0 : 0x9ad0ff, 1.5), [0, -0.26, 0]); sp.rotation.x = 0.4; sp.userData.update = (t) => {}; R.place(sp, sx, h - 0.45, sz); spots.push(sp); }
  const onair = sign('ON AIR', 0.9, 0.3, { bg: '#300000', fg: '#ff2a2a', size: 0.7, px: 192, emissive: true, border: '#ff2a2a' }); onair.userData.update = (t) => { onair.material.color.setScalar(Math.floor(t * 1.5) % 6 < 5 ? 1 : 0.3); }; mountOnWall(R, onair, -hd + 1.2, 3.4, 'right');
  const so = FUR.sofa({ seats: 2, color: 0x3a78d0 }); R.place(so, 4.0, 0, -2.4, -HP - 0.2); const tb2 = FUR.table({ kind: 'round', w: 0.7, h: 0.5, color: 0xdfe4ea }); R.place(tb2, 3.0, 0, -2.2); on(tb2, DEC.flowerVase(0xff5c8a), 0, 0.5, 0); on(tb2, DEC.mug(0xe04a3a), 0.2, 0.5, 0.1); R.place(DEC.plant({ kind: 'tree', h: 1.6, seed: 8 }), 4.6, 0, -3.3);
  const tp = new THREE.Group(); P(tp, rg(0.55, 0.35, 0.05, 0.02), mat(0x15151c), [0, 0, 0]); const ts = liveScreen('code', 0.5, 0.3, { px: 128, fg: '#ffffff', bg: '#10141a' }); ts.position.z = 0.03; tp.add(ts); R.reg(ts); tp.position.set(0, 1.3, 0.62); cam1.add(tp);
  const cabl = new THREE.Group(); for (let i = 0; i < 4; i++) tube(cabl, [[-4 + i * 1.6, 0.015, 3.4], [-3.4 + i * 1.2, 0.015, 2.0], [-1.5 + i * 0.7, 0.015, 0.2], [0.5 + i * 0.5, 0.015, -2.6]], 0.015, 0x15151c, { seg: 18, sides: 4 }); R.g.add(cabl);
  R.g.add(clutter({ x: 0, z: 1.6, w: 9, d: 4 }, { kind: ['papers', 'trash', 'office'], seed: seed + 8, density: 0.15 + wrecked * 2.4, avoid: [] }));
  return R.finish({ anchors }, { pos: [0.0, 1.9, hd + 3.0], target: [0, 1.6, -hd + 1.2], fov: 56 });
}

// ---------------------------------------------------------------- mission control (raked rows of consoles + huge wall display; camera behind the staff)
export function buildMissionControl({ seed = 23, wrecked = 0, ceiling = true, people = true, rows = 4, perRow = 6 } = {}) {
  const R = room({ w: 14, d: 11, h: 6.0, seed, wrecked, ceiling, wall: 0x1a2440, wall2: 0x141c34, trim: 0x2a3a5a, ceilColor: 0x1a2030, floor: { type: 'carpet', color: 0x2a3550, size: 0.7 }, hole: { x: -5.0, y: 3.0, r: 0.9 }, crown: false, dust: 50, name: 'missionControl' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  // big wall display: central map + two side panels + countdown strip
  const big = liveScreen('map', 7.0, 3.6, { px: 512, fps: 10 }); big.position.set(0, 3.5, -hd + 0.12); g.add(big); R.reg(big); P(g, bg(7.2, 3.8, 0.12), mat(0x0a0e1c), [0, 3.5, -hd + 0.06]);
  const sL = liveScreen('telemetry', 3.4, 2.4, { px: 320, fps: 8, seed: 3 }); sL.position.set(-5.0, 3.2, -hd + 0.12); g.add(sL); R.reg(sL); P(g, bg(3.6, 2.6, 0.12), mat(0x0a0e1c), [-5.0, 3.2, -hd + 0.06]);
  const sR = liveScreen('radar', 3.4, 2.4, { px: 320, fps: 12 }); sR.position.set(5.0, 3.2, -hd + 0.12); g.add(sR); R.reg(sR); P(g, bg(3.6, 2.6, 0.12), mat(0x0a0e1c), [5.0, 3.2, -hd + 0.06]);
  const cd = liveScreen('countdown', 3.2, 0.9, { px: 320, fps: 4, start: 754 }); cd.position.set(0, 5.6, -hd + 0.12); g.add(cd); R.reg(cd); P(g, bg(3.4, 1.1, 0.12), mat(0x0a0e1c), [0, 5.6, -hd + 0.06]); const lt = sign('MISSION ELAPSED TIME', 3.2, 0.25, { bg: '#0a0e1c', fg: '#78dce8', size: 0.6, px: 256 }); lt.position.set(0, 6.22 - 0.0, -hd + 0.2); lt.visible = false;
  const clocks = [['HOUSTON', 9], ['LONDON', 15], ['TOKYO', 23]]; clocks.forEach(([n, hr], i) => { const c = DEC.wallClock(0.3, { color: 0x0a0e1c, frame: 0x3a78d0, h0: hr, m0: 10 + i * 7 }); c.children.forEach((q) => { if (q.material && q.material.color && q.material.color.getHex() === 0x15151c) q.material = mat(0xdfe4ea); }); R.place(c, -2.7 + i * 2.7, 6.0 - 0.15 * 0, -hd + 0.15); const ls = sign(n, 0.7, 0.14, { bg: '#0a0e1c', fg: '#78dce8', size: 0.6, px: 128 }); ls.position.set(-2.7 + i * 2.7, 5.55, -hd + 0.16); g.add(ls); });
  // shared screens for the consoles
  const kinds = ['code', 'telemetry', 'chart', 'radar', 'map', 'stocks']; const sc = kinds.map((k, i) => { const s = liveScreen(k, 0.5, 0.3, { px: 192, seed: i + 5, fps: 8 }); R.reg(s); return s; });
  const sitters = [];
  for (let row = 0; row < rows; row++) {
    const z = -hd + 3.4 + row * 1.7, y = row * 0.45;
    P(g, bg(w - 0.4, y + 0.1, 1.7), mat(0x1a2240, { rough: 1 }), [0, (y - 0.1) / 2 - 0.0, z]); P(g, bg(w - 0.4, 0.03, 0.06), glow(0x3a78d0, 1.2), [0, y + 0.02, z - 0.84]);
    // long curved-ish console bench: continuous desk
    const dk = new THREE.Group(); const len = perRow * 1.8; P(dk, rg(len, 0.05, 0.9, 0.02), mat(0xdfe4ea, { rough: 0.35 }), [0, 0.74, 0], [0, 0, 0], 1, true); P(dk, rg(len, 0.7, 0.55, 0.03), mat(0x2a3046, { rough: 0.5 }), [0, 0.37, -0.15], [0, 0, 0], 1, true); P(dk, bg(len, 0.03, 0.04), glow(0x3a78d0, 1.0), [0, 0.1, 0.13]);
    for (let i = 0; i <= perRow; i++) P(dk, bg(0.04, 0.5, 0.6), mat(0x555a66, { metal: 0.4 }), [-len / 2 + i * 1.8, 1.05, -0.3]);
    for (let i = 0; i < perRow; i++) { const x = -len / 2 + 0.9 + i * 1.8; for (const s of [-1, 1]) { const m = sc[(row * 3 + i * 2 + (s > 0 ? 1 : 0)) % 6].clone(); m.userData = { noShadow: true }; const mon = new THREE.Group(); P(mon, rg(0.55, 0.34, 0.04, 0.015), mat(0x15151c), [0, 0, 0]); m.position.z = 0.022; mon.add(m); mon.position.set(x + s * 0.3, 1.16, -0.3); mon.rotation.y = -s * 0.22; dk.add(mon); }
      on(dk, ELEC.keyboard({ color: 0x20222a }), x, 0.77, 0.12); on(dk, DEC.mug([0xffffff, 0xe04a3a, 0x3a78d0][i % 3], { steamOn: (i + row) % 3 === 0 }), x + 0.55, 0.77, 0.15); const hs = new THREE.Group(); P(hs, new THREE.TorusGeometry(0.07, 0.012, 6, 14, PI), mat(0x15151c), [0, 0.07, 0]); P(hs, sg(0.03, 6, 5), mat(0x15151c), [-0.07, 0.04, 0]); on(dk, hs, x - 0.55, 0.77, 0.15);
      const ch = FUR.chair({ kind: 'office', seed: row * 6 + i, seat: [0x3a78d0, 0x2a3046][i % 2] }); ch.position.set(x, 0, 0.85); ch.rotation.y = PI; dk.add(ch);
      if (people && (i + row * 2) % 3 !== 2 && wrecked < 0.5) { const s2 = sitter(r, { seat: 0.52, ry: PI, typing: true }); s2.position.set(x, 0, 0.9); dk.add(s2); sitters.push(s2); } }
    dk.position.set(0, y, z); R.place(R.topple(dk, len / 2, 0.9), 0, y, z, 0);
    R.g.add(clutter({ x: 0, z: z, w: len - 0.4, d: 0.5 }, { kind: 'office', seed: seed + row, density: 1.2, y: y + 0.76, avoid: [] }));
  }
  // ceiling light grid, wall cable trays, side doors, flags, emergency lights (rotating red), plants
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) R.place(DEC.panelLight(1.4, 1.4, { color: 0x9ac0ff, k: 0.8 }), -4.5 + i * 3, h, -3 + j * 3);
  const bc = new THREE.Group(); const lamp = P(bc, cg(0.1, 0.1, 0.12, 12), mat(0xe03030, { emissive: 0xff2020, emissiveIntensity: 1.6 }), [0, 0.06, 0]); const beam = P(bc, new THREE.ConeGeometry(0.5, 2.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), [1.1, 0.06, 0], [0, 0, -HP]); bc.userData.update = (t) => { bc.rotation.y = t * 4; }; R.place(bc, hw - 0.4, 4.2, -hd + 0.4); R.place(bc.clone(), -hw + 0.4, 4.2, -hd + 0.4);
  for (const s of [-1, 1]) { const dor = door({ w: 1.2, h: 2.3, color: 0x3a4660, frame: 0x8a8e98 }); R.place(dor, s * (hw - 0.04), 0, hd - 1.5, s * -HP); }
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const fl = new THREE.Group(); P(fl, cg(0.012, 0.012, 0.8, 6), mat(0xc8ccd6), [0, 0, 0], [0, 0, HP * 0.2]); P(fl, bg(0.5, 0.32, 0.01), mat([0xe04a3a, 0x3a78d0, 0xffd23f][(i + (s > 0 ? 1 : 0)) % 3]), [0.25, -0.1, 0.01]); mountOnWall(R, fl, -1.5 + i * 2.0, 3.5, s < 0 ? 'left' : 'right'); }
  R.g.add(clutter({ x: 0, z: 1.8, w: 12, d: 7 }, { kind: ['papers', 'trash'], seed: seed + 9, density: 0.1 + wrecked * 2.4, avoid: [] }));
  const cam = { pos: [0.0, (rows - 1) * 0.45 + 2.3, hd + 3.0], target: [0, 3.0, -hd + 1.0], fov: 62 };
  return R.finish({ bigScreen: big, sitters }, cam);
}

// ---------------------------------------------------------------- secret military control room
export function buildSecretControlRoom({ seed = 24, wrecked = 0, ceiling = true, people = true } = {}) {
  const R = room({ w: 9.4, d: 8.2, h: 3.8, seed, wrecked, ceiling, wall: 0x4a5260, wall2: 0x3a4250, trim: 0x2a2e38, ceilColor: 0x2a2e38, floor: { type: 'tiles', size: 0.6, c1: 0x3a3e48, c2: 0x30343e, grout: 0x15161c, checker: true }, hole: { x: 3.2, y: 2.3, r: 0.8 }, crown: false, dust: 40, name: 'secretControl' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  // riveted steel panels (instanced bolts) on the back wall + pipes
  const bolts = []; for (let x = -hw + 0.6; x < hw; x += 1.2) for (let y = 0.4; y < h; y += 1.0) { bolts.push({ p: [x, y, -hd + 0.015], s: [0.05, 0.05, 0.03], c: 0x2a2e38 }); P(g, bg(0.015, h, 0.012), mat(0x2a2e38), [x - 0.6, h / 2, -hd + 0.008]); }
  inst(g, cg(0.5, 0.5, 1, 6), mat(0xffffff, { metal: 0.6, rough: 0.4 }), bolts.map((b) => ({ ...b, r: [HP, 0, 0] })));
  for (let i = 0; i < 3; i++) { tube(g, [[-hw, h - 0.3 - i * 0.18, -hd + 0.2], [0, h - 0.3 - i * 0.18, -hd + 0.2], [hw, h - 0.3 - i * 0.18, -hd + 0.2]], 0.06, [0x8a8e98, 0xc84a3a, 0x3a78a0][i], { seg: 4, sides: 10 }); }
  // blast door (back wall, left) with hazard stripes + wheel
  const bd = new THREE.Group(); P(bd, bg(1.6, 2.5, 0.2), mat(0x5a6270, { metal: 0.5, rough: 0.4 }), [0, 1.25, 0.1], [0, 0, 0], 1, true); for (let i = 0; i < 8; i++) P(bd, bg(0.14, 0.14, 0.01), mat(i % 2 ? 0xffd23f : 0x15151c), [-0.7 + i * 0.2, 2.4, 0.205]); P(bd, new THREE.TorusGeometry(0.3, 0.04, 8, 20), mat(0xc84a3a, { metal: 0.6 }), [0, 1.2, 0.24]); for (let i = 0; i < 4; i++) P(bd, bg(0.04, 0.6, 0.04), mat(0xc84a3a, { metal: 0.6 }), [0, 1.2, 0.24], [0, 0, i * HP / 2]); R.place(bd, -hw + 1.3, 0, -hd);
  // big radar (round) + map wall with pins + telemetry
  const radar = liveScreen('radar', 3.0, 3.0, { px: 384, fps: 15 }); radar.position.set(0.8, 2.1, -hd + 0.12); g.add(radar); R.reg(radar); P(g, new THREE.TorusGeometry(1.55, 0.08, 8, 40), mat(0x20222a, { metal: 0.5 }), [0.8, 2.1, -hd + 0.1]); radar.material = new THREE.MeshBasicMaterial({ map: radar.material.map, toneMapped: false });
  const mw = liveScreen('map', 2.6, 1.7, { px: 320, fps: 8 }); mw.position.set(3.4, 2.0, -hd + 0.12); g.add(mw); R.reg(mw); P(g, bg(2.75, 1.85, 0.1), mat(0x15161c), [3.4, 2.0, -hd + 0.07]);
  const tl = liveScreen('telemetry', 2.0, 1.2, { px: 256, fps: 8, seed: 4 }); tl.position.set(-2.0, 2.2, -hd + 0.12); g.add(tl); R.reg(tl); P(g, bg(2.15, 1.35, 0.1), mat(0x15161c), [-2.0, 2.2, -hd + 0.07]);
  // central holo table: glowing grid + rising blips + rotating sweep ring
  const ht = new THREE.Group(); P(ht, new THREE.CylinderGeometry(1.3, 1.4, 0.85, 8), mat(0x2a2e38, { metal: 0.4 }), [0, 0.42, 0], [0, 0, 0], 1, true); P(ht, new THREE.CylinderGeometry(1.25, 1.25, 0.05, 8), mat(0x0a2a3a, { emissive: 0x1a6a8a, emissiveIntensity: 0.9 }), [0, 0.87, 0]);
  for (let i = -3; i <= 3; i++) { P(ht, bg(2.4, 0.006, 0.01), glow(0x6ad0ff, 1.5), [0, 0.9, i * 0.3]); P(ht, bg(0.01, 0.006, 2.4), glow(0x6ad0ff, 1.5), [i * 0.3, 0.9, 0]); }
  const ring = P(ht, new THREE.TorusGeometry(0.9, 0.012, 6, 40), glow(0x9aff9a, 2), [0, 0.95, 0], [HP, 0, 0]); const blips = []; for (let i = 0; i < 8; i++) blips.push(P(ht, new THREE.ConeGeometry(0.05, 0.14, 4), glow(i % 3 ? 0xff6a4a : 0xffd23f, 2), [Math.cos(i * 0.8) * 0.7, 1.0, Math.sin(i * 0.8) * 0.7]));
  const gl = P(ht, new THREE.CylinderGeometry(0.0, 0.9, 0.9, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x6ad0ff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), [0, 1.35, 0], [PI, 0, 0]);
  ht.userData.update = (t) => { ring.scale.setScalar(0.5 + (t * 0.35 % 1)); ring.material = ring.material; blips.forEach((b, i) => { b.position.y = 1.0 + 0.04 * Math.sin(t * 3 + i); b.rotation.y = t + i; b.visible = ((Math.floor(t * 2 + i) * 2654435761) >>> 0) % 6 > 0; }); gl.rotation.y = t * 0.5; }; R.place(ht, 0.3, 0, 0.6);
  // consoles along the side walls with CRT-ish monitors, server racks blinking, chairs, coffee, paper
  const sc2 = ['code', 'telemetry', 'radar', 'chart'].map((k, i) => { const s = liveScreen(k, 0.5, 0.3, { px: 160, seed: i + 7, fps: 8, bg: '#0a1410' }); R.reg(s); return s; });
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { const cn = new THREE.Group(); P(cn, rg(2.2, 0.8, 0.7, 0.04), mat(0x555a66, { metal: 0.3, rough: 0.5 }), [0, 0.4, 0], [0, 0, 0], 1, true); P(cn, rg(2.2, 0.06, 0.8, 0.02), mat(0x2a2e38), [0, 0.83, 0.02]); P(cn, rg(2.2, 0.5, 0.06, 0.02), mat(0x555a66), [0, 1.08, -0.2], [-0.6, 0, 0]);
    for (let k = 0; k < 2; k++) { const m = sc2[(i * 2 + k + (s > 0 ? 1 : 0)) % 4].clone(); m.userData = { noShadow: true }; const mon = new THREE.Group(); P(mon, rg(0.55, 0.34, 0.06, 0.02), mat(0x15161c), [0, 0, 0]); m.position.z = 0.032; mon.add(m); on(cn, mon, -0.5 + k * 1.0, 1.1, -0.1, 0); mon.rotation.x = -0.25; }
    for (let q = 0; q < 8; q++) P(cn, bg(0.06, 0.03, 0.02), glow([0xff4a3a, 0x3aff6a, 0xffaa2a][q % 3], 1.6), [-0.5 + q * 0.14, 0.9, 0.25 + 0.0]);
    on(cn, DEC.mug(0x2a3a5a), 0.8, 0.86, 0.15); on(cn, ELEC.keyboard({ color: 0x2a2e38 }), 0.0, 0.86, 0.2); R.place(R.topple(cn, 1.1, 0.85), s * (hw - 0.55), 0, -0.6 + i * 2.8 - 0.4, -s * HP);
    const ch = FUR.chair({ kind: 'office', seed: i + s, seat: 0x3a4250 }); R.place(R.topple(ch, 0.3, 0.55), s * (hw - 1.5), 0, -0.6 + i * 2.8 - 0.4, s * HP + (s > 0 ? PI : PI));
    if (people && i === 0 && wrecked < 0.5) { const p = sitter(r, { seat: 0.52, ry: -s * HP, typing: true }); R.place(p, s * (hw - 1.5), 0, -0.6 + i * 2.8 - 0.4); } }
  for (let i = 0; i < 3; i++) { const rk = ELEC.receiverRack({ units: 9, seed: i + 3 }); R.place(R.topple(rk, 0.28, 0.8), -hw + 0.6 + i * 0.7 + 0.0, 0, -hd + 0.35); }
  // rotating beacons, caged ceiling lamps, wall alarm, hazard sign, steam vent puffs, cables on the floor
  for (const [x, z] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) { const bc = new THREE.Group(); P(bc, cg(0.12, 0.12, 0.1, 12), mat(0x2a2e38), [0, 0, 0]); const bl = P(bc, sg(0.1, 10, 8), mat(0xe03030, { emissive: 0xff2020, emissiveIntensity: 1.8 }), [0, -0.1, 0]); const bm = P(bc, new THREE.ConeGeometry(0.4, 2.0, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), [1.0, -0.1, 0], [0, 0, -HP]); bc.userData.update = (t) => { bc.rotation.y = t * 5 + x; }; if (x < 0 && z < 0) R.place(bc, x, h - 0.1, z); else if (wrecked > 0.2 || (x > 0 && z > 0)) R.place(bc, x, h - 0.1, z); }
  for (let i = 0; i < 4; i++) { const cl = new THREE.Group(); P(cl, cg(0.14, 0.14, 0.2, 12), glow(0xfff0c0, 1.2), [0, -0.1, 0]); for (let k = 0; k < 6; k++) P(cl, bg(0.01, 0.24, 0.01), mat(0x2a2e38), [Math.cos(k * 1.05) * 0.16, -0.1, Math.sin(k * 1.05) * 0.16]); R.place(cl, -3.4 + i * 2.3, h - 0.1, -1.0); }
  const hz = sign('RESTRICTED AREA', 1.6, 0.3, { bg: '#ffd23f', fg: '#15151c', size: 0.5, px: 256, border: '#15151c' }); R.place(hz, 0.8, 3.4, -hd + 0.02);
  const vent = DEC.steam(6, { h: 1.2, r: 0.12, op: 0.2, speed: 0.4 }); R.place(vent, hw - 0.8, 0.1, -hd + 0.9); P(g, bg(0.5, 0.1, 0.5), mat(0x15161c), [hw - 0.8, 0.05, -hd + 0.9]);
  const cbl = new THREE.Group(); for (let i = 0; i < 5; i++) tube(cbl, [[-hw + 1.2 + i * 0.3, 0.02, -hd + 0.8], [-1.5 + i * 0.3, 0.02, -1.5], [0.2 + i * 0.2, 0.02, 0.0]], 0.02, [0x15151c, 0xc84a3a, 0xffd23f, 0x3a78d0, 0x15151c][i], { seg: 16, sides: 4 }); R.g.add(cbl);
  const crates = new THREE.Group(); for (let i = 0; i < 3; i++) { P(crates, rg(0.7, 0.5, 0.5, 0.03), mat(0x6a7a4a, { rough: 0.7 }), [i * 0.75, 0.25, 0], [0, 0, 0], 1, true); P(crates, bg(0.5, 0.02, 0.01), mat(0xffd23f), [i * 0.75, 0.3, 0.255]); } P(crates, rg(0.7, 0.5, 0.5, 0.03), mat(0x6a7a4a, { rough: 0.7 }), [0.4, 0.75, 0.0], [0, 0.2, 0], 1, true); R.place(R.topple(crates, 0.7, 0.7), hw - 1.1, 0, hd - 1.2, 0.2);
  R.g.add(clutter({ x: 0, z: 1.5, w: 8, d: 5 }, { kind: ['papers', 'trash'], seed: seed + 9, density: 0.2 + wrecked * 2.6, avoid: [{ x: 0.3, z: 0.6, w: 3, d: 3 }] }));
  return R.finish({ radar }, camFor(R, { fov: 56, y: 1.8, ty: 1.5, fit: 1.1 }));
}

// ---------------------------------------------------------------- science lab (benches with bubbling glassware, centrifuge, tesla coil, skeleton, whiteboard)
export function buildLab({ seed = 25, wrecked = 0, ceiling = true, people = true } = {}) {
  const R = room({ w: 9.0, d: 6.8, h: 3.4, seed, wrecked, ceiling, wall: 0xe8f0f2, wall2: 0xdce8ec, trim: 0xffffff, floor: { type: 'tiles', size: 0.5, c1: 0xdfe8ec, c2: 0xaebfc8, grout: 0x8a9aa4 }, hole: { x: 3.4, y: 2.2, r: 0.7 }, name: 'lab' });
  const { g, w, d, h, r } = R; const hw = w / 2, hd = d / 2;
  wallTiles(R, 'back', [-hw + 0.03, hw - 0.03, 0.9, 1.5], { size: 0.15, c1: 0xffffff, c2: 0x8ac8d8, pattern: 'band', seed });
  // whiteboard with equations + periodic table (instanced coloured cells) + wall monitor
  const wb = sign('', 3.0, 1.3, { bg: '#fbfbf6', px: 512, lines: ['E = mc²', 'size ∝ scale³', 'LOVE = ??'], fg: '#2a6a4a', size: 0.55, font: '700', border: '#c8ccd6' }); wb.position.set(-2.4, 2.0, -hd + 0.01); g.add(wb);
  const cells = []; for (let i = 0; i < 18; i++) for (let j = 0; j < 7; j++) { if (j < 3 && i > 1 && i < 12 && j > 0) continue; cells.push({ p: [-0.4 + i * 0.1, 2.5 - j * 0.1, -hd + 0.015], s: [0.09, 0.09, 0.01], c: [0xe04a3a, 0x3a78d0, 0xffd23f, 0x3fa060, 0x8a5ad0, 0xff8a2b][(i + j * 2) % 6] }); } inst(g, bg(1, 1, 1), mat(0xffffff, { rough: 0.6 }), cells);
  const mon = liveScreen('chart', 1.6, 1.0, { px: 256, fps: 8 }); mon.position.set(3.2, 2.1, -hd + 0.06); g.add(mon); R.reg(mon); P(g, bg(1.7, 1.1, 0.08), mat(0x15161c), [3.2, 2.1, -hd + 0.04]);
  R.place(DEC.wallClock(0.26, { frame: 0x3a78a8, h0: 2, m0: 33 }), 1.3, 2.9, -hd);
  // lab benches: glassware with coloured liquids + bubbles, Bunsen flame, microscope, test-tube racks
  const bench = (len = 2.6) => { const b = new THREE.Group(); P(b, rg(len, 0.06, 0.9, 0.02), mat(0x20262e, { rough: 0.3 }), [0, 0.92, 0], [0, 0, 0], 1, true); P(b, bg(len - 0.1, 0.84, 0.8), mat(0xdfe6ee, { rough: 0.5 }), [0, 0.42, 0], [0, 0, 0], 1, true); for (let i = 0; i < Math.floor(len / 0.65); i++) P(b, rg(0.58, 0.7, 0.03, 0.02), mat(0xc4ccd6), [-len / 2 + 0.4 + i * 0.65, 0.42, 0.41]); return b; };
  const flask = (c, hgt = 0.26, sph = true) => { const f = new THREE.Group(); const glass = new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }); if (sph) { P(f, sg(0.1, 16, 12), glass, [0, 0.1, 0]); P(f, new THREE.SphereGeometry(0.085, 16, 8, 0, TAU, PI * 0.45, PI * 0.55), mat(c, { emissive: c, emissiveIntensity: 0.35, rough: 0.2 }), [0, 0.1, 0]); P(f, cg(0.025, 0.025, 0.14, 10), glass, [0, 0.24, 0]); } else { P(f, cg(0.06, 0.06, hgt, 14), glass, [0, hgt / 2, 0]); P(f, cg(0.055, 0.055, hgt * 0.6, 14), mat(c, { emissive: c, emissiveIntensity: 0.35, rough: 0.2 }), [0, hgt * 0.3, 0]); } const bb = []; for (let i = 0; i < 5; i++) bb.push(P(f, sg(0.012, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }), [0, 0, 0])); f.userData.update = (t) => bb.forEach((b, i) => { const ph = (t * 0.7 + i / 5) % 1; b.position.set(Math.sin(i * 3 + t) * 0.02, 0.08 + ph * (sph ? 0.14 : hgt * 0.55), Math.cos(i * 2) * 0.02); b.scale.setScalar(1 - ph * 0.5); }); return f; };
  const b1 = bench(3.0); [[-1.1, 0xff5c9a, true], [-0.6, 0x7bff9a, false], [-0.2, 0xffd23f, true], [0.3, 0xb07aff, false]].forEach(([x, c, s]) => on(b1, flask(c, 0.28, s), x, 0.95, -0.05)); const bn = new THREE.Group(); P(bn, cg(0.05, 0.06, 0.03, 10), mat(0x2a2e38), [0, 0.015, 0]); P(bn, cg(0.012, 0.012, 0.2, 6), mat(0xc8ccd6, { metal: 0.8 }), [0, 0.12, 0]); const fl = P(bn, new THREE.ConeGeometry(0.025, 0.1, 8), glow(0x6a8aff, 2.0), [0, 0.27, 0]); bn.userData.update = (t) => { fl.scale.set(1 + 0.1 * Math.sin(t * 25), 1 + 0.25 * Math.sin(t * 19), 1); }; on(b1, bn, 0.8, 0.95, 0.0); const flk = flask(0x7bd0ff, 0.3, true); on(b1, flk, 0.95, 1.1, 0.0); flk.position.y = 1.1; const ms = new THREE.Group(); P(ms, rg(0.18, 0.04, 0.22, 0.01), mat(0x20262e), [0, 0.02, 0]); P(ms, cg(0.02, 0.02, 0.3, 8), mat(0xc8ccd6, { metal: 0.8 }), [0, 0.18, -0.05], [0.3, 0, 0]); P(ms, cg(0.03, 0.03, 0.16, 10), mat(0x15151c), [0, 0.32, 0.03], [0.4, 0, 0]); on(b1, ms, 1.3, 0.95, 0.0);
  R.place(R.topple(b1, 1.5, 0.8), -1.5, 0, 0.6); const b2 = bench(3.0); const rk = new THREE.Group(); P(rk, rg(0.7, 0.04, 0.16, 0.01), mat(0x8a5a3a), [0, 0.12, 0]); P(rk, rg(0.7, 0.04, 0.16, 0.01), mat(0x8a5a3a), [0, 0.01, 0]); const cs = [0xff5c9a, 0x7bff9a, 0xffd23f, 0x4aa0e0, 0xb07aff, 0xff8a2b]; for (let i = 0; i < 6; i++) { P(rk, new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.4, roughness: 0.05 }), [-0.27 + i * 0.108, 0.17, 0]); P(rk, cg(0.024, 0.024, 0.1, 8), mat(cs[i], { emissive: cs[i], emissiveIntensity: 0.3 }), [-0.27 + i * 0.108, 0.1, 0]); } on(b2, rk, -0.6, 0.95, 0); on(b2, ELEC.laptop({ kind: 'code', w: 0.34 }), 0.6, 0.95, 0.1, 0.4);
  // centrifuge spinning
  const cf = new THREE.Group(); P(cf, rg(0.4, 0.2, 0.4, 0.05), mat(0xdfe4ea), [0, 0.1, 0]); const rot = new THREE.Group(); rot.position.y = 0.22; cf.add(rot); for (let i = 0; i < 6; i++) P(rot, cg(0.02, 0.02, 0.1, 8), mat(cs[i]), [Math.cos(i * 1.047) * 0.12, 0, Math.sin(i * 1.047) * 0.12], [0.5 * Math.cos(i * 1.047), 0, 0.5 * Math.sin(i * 1.047)]); P(cf, new THREE.SphereGeometry(0.19, 14, 6, 0, TAU, 0, HP), new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.35, roughness: 0.05 }), [0, 0.2, 0]); cf.userData.update = (t) => { rot.rotation.y = t * 25; }; on(b2, cf, 0.0, 0.95, 0);
  R.place(R.topple(b2, 1.5, 0.85), 2.3, 0, 0.6);
  // tesla coil with flickering arcs
  const tc = new THREE.Group(); P(tc, cg(0.3, 0.35, 0.2, 18), mat(0x2a2e38), [0, 0.1, 0], [0, 0, 0], 1, true); P(tc, cg(0.12, 0.2, 0.9, 16), mat(0xc87a3a, { metal: 0.6, rough: 0.4 }), [0, 0.65, 0], [0, 0, 0], 1, true); for (let i = 0; i < 8; i++) P(tc, new THREE.TorusGeometry(0.15 - i * 0.004, 0.012, 6, 16), mat(0x8a4a1a, { metal: 0.5 }), [0, 0.3 + i * 0.1, 0], [HP, 0, 0]); P(tc, sg(0.2, 18, 12), mat(0xc8ccd6, { metal: 0.9, rough: 0.15 }), [0, 1.25, 0], [0, 0, 0], 1, true);
  const arcs = []; for (let i = 0; i < 4; i++) { const a = new THREE.Group(); for (let k = 0; k < 4; k++) P(a, bg(0.02, 0.02, 0.2), glow(0xc8a0ff, 3), [0, 0, 0]); a.position.y = 1.25; tc.add(a); arcs.push(a); }
  tc.userData.update = (t) => arcs.forEach((a, i) => { const f = Math.floor(t * 18 + i * 3); const hh = (n) => (((f * 2654435761 + n * 40503) >>> 0) % 1000) / 1000; a.visible = hh(1) > 0.25; let px = 0, py = 0, pz = 0; const ang = hh(2) * TAU, el = (hh(3) - 0.3) * 1.2; a.children.forEach((s, k) => { const nx = px + Math.cos(ang + (hh(k + 4) - 0.5) * 1.2) * Math.cos(el) * 0.25, ny = py + Math.sin(el) * 0.25 + (hh(k + 8) - 0.5) * 0.1, nz = pz + Math.sin(ang + (hh(k + 4) - 0.5) * 1.2) * Math.cos(el) * 0.25; s.position.set((px + nx) / 2, (py + ny) / 2, (pz + nz) / 2); s.scale.z = 1.3; s.lookAt(a.position.x + nx, a.position.y + ny, a.position.z + nz); px = nx; py = ny; pz = nz; }); });
  R.place(R.topple(tc, 0.3, 0.8), hw - 1.0, 0, -hd + 1.0);
  // skeleton on a stand, lab coat hooks, fume hood, safety shower, shelves of chemicals, cage, plants
  const sk = new THREE.Group(); const bn2 = mat(0xf0ead8, { rough: 0.6 }); P(sk, cg(0.015, 0.015, 1.9, 6), mat(0x555a66, { metal: 0.6 }), [0, 0.95, -0.1]); P(sk, cg(0.2, 0.22, 0.03, 14), mat(0x555a66), [0, 0.015, -0.1]); P(sk, sg(0.12, 14, 10), bn2, [0, 1.65, 0], [0, 0, 0], [1, 1.1, 1]); P(sk, bg(0.08, 0.06, 0.06), bn2, [0, 1.52, 0.05]); for (const s of [-1, 1]) P(sk, sg(0.025, 6, 5), mat(0x15151c), [s * 0.04, 1.67, 0.1]); for (let i = 0; i < 5; i++) P(sk, new THREE.TorusGeometry(0.1 - i * 0.008, 0.012, 6, 14, PI), bn2, [0, 1.38 - i * 0.07, 0.0], [HP, 0, PI / 2]); P(sk, cg(0.015, 0.015, 0.7, 6), bn2, [0, 1.15, -0.04]); P(sk, new THREE.TorusGeometry(0.14, 0.02, 6, 14), bn2, [0, 0.78, -0.05], [HP, 0, 0]); for (const s of [-1, 1]) { P(sk, cg(0.012, 0.012, 0.6, 5), bn2, [s * 0.18, 1.2, 0.0], [0, 0, s * 0.05]); P(sk, cg(0.015, 0.015, 0.8, 5), bn2, [s * 0.08, 0.4, -0.05]); } sk.userData.update = (t) => { sk.rotation.z = Math.sin(t * 1.2) * 0.006; }; R.place(R.topple(sk, 0.2, 0.75), -hw + 0.6, 0, -hd + 0.5);
  const sh = FUR.shelfFilled({ w: 1.4, h: 1.9, d: 0.4, kind: 'pantry', seed: seed + 2, color: 0xdfe4ea }); R.place(sh, -hw + 0.22, 0, 1.2, HP);
  const fh = new THREE.Group(); P(fh, bg(1.8, 2.3, 0.8), mat(0xdfe4ea, { rough: 0.4 }), [0, 1.15, 0], [0, 0, 0], 1, true); P(fh, bg(1.5, 0.9, 0.04), new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.3, roughness: 0.05 }), [0, 1.4, 0.4]); P(fh, bg(1.5, 0.05, 0.6), mat(0x20262e), [0, 0.95, 0.1]); on(fh, flask(0x7bff9a, 0.3, true), -0.3, 0.98, 0.1); on(fh, flask(0xff5c9a, 0.3, false), 0.3, 0.98, 0.1); const stc = DEC.steam(5, { h: 0.7, r: 0.08, op: 0.25, speed: 0.4 }); stc.position.set(-0.3, 1.3, 0.1); fh.add(stc); R.place(fh, hw - 0.9, 0, -hd + 0.5 + 2.2 - 0.0, 0);
  const cg2 = new THREE.Group(); for (let i = 0; i < 3; i++) { const coat = new THREE.Group(); P(coat, rg(0.45, 0.9, 0.08, 0.04), mat(0xffffff, { rough: 0.9 }), [0, -0.45, 0], [0, 0, 0], 1, true); P(coat, sg(0.03, 6, 5), mat(0x3a78d0), [0, -0.1, 0.05]); coat.userData.update = (t) => { coat.rotation.z = Math.sin(t * 1.4 + i) * 0.02; }; coat.position.set(i * 0.5, 0, 0); cg2.add(coat); } P(cg2, bg(1.5, 0.05, 0.05), mat(0x8a5a3a), [0.5, 0.02, -0.03]); R.place(cg2, -0.8, 2.0, -hd + 0.05);
  const cage = new THREE.Group(); P(cage, bg(0.6, 0.04, 0.4), mat(0x9a9aa6), [0, 0.02, 0]); for (let i = 0; i <= 10; i++) { P(cage, cg(0.006, 0.006, 0.35, 4), mat(0xb8bcc8, { metal: 0.7 }), [-0.28 + i * 0.056, 0.2, 0.19]); } P(cage, bg(0.6, 0.01, 0.4), mat(0xb8bcc8, { metal: 0.7 }), [0, 0.38, 0]); const wheel = new THREE.Group(); wheel.position.set(-0.12, 0.17, 0); cage.add(wheel); P(wheel, new THREE.TorusGeometry(0.12, 0.008, 6, 20), mat(0xff5c5c), [0, 0, 0]); for (let i = 0; i < 3; i++) P(wheel, cg(0.004, 0.004, 0.24, 4), mat(0xff5c5c), [0, 0, 0], [0, 0, i * 1.047 + HP]); cage.userData.update = (t) => { wheel.rotation.z = t * 8; }; on(b2, cage, 1.0, 0.95, 0.0);
  R.place(DEC.plant({ kind: 'tree', h: 1.6, seed: 2 }), hw - 0.5, 0, hd - 0.6); R.place(DEC.plant({ kind: 'fern', h: 0.9, seed: 3, pot: 0xffffff }), -hw + 0.5, 0, hd - 0.6);
  for (let i = 0; i < 4; i++) R.place(DEC.panelLight(0.9, 0.5), -3 + i * 2, h, 0.2); R.place(DEC.fluorescent(1.2, { flicker: 0.3, seed }), 3.0, h, -1.8);
  const dor = door({ color: 0xc4ccd6, frame: 0xffffff, glass: true }); R.place(dor, hw - 0.04, 0, hd - 1.3, -HP);
  if (people) { R.place(stander(r, { pose: 'think', preset: 'scientistA', ry: 0.2, scale: 0.95 }), -1.0, 0, 1.6); R.place(stander(r, { pose: 'idle', preset: 'scientistB', ry: -0.3, scale: 0.95 }), 1.6, 0, 1.7); }
  R.g.add(clutter({ x: 0, z: 1.6, w: 8, d: 4 }, { kind: ['papers', 'trash'], seed: seed + 9, density: 0.1 + wrecked * 2.4, avoid: [{ x: -1.5, z: 0.6, w: 3.2, d: 1.0 }, { x: 2.3, z: 0.6, w: 3.2, d: 1.0 }] }));
  return R.finish({}, camFor(R, { fov: 56, y: 1.8, ty: 1.4, fit: 1.1 }));
}
