// Family living room (ep5) + the bungalow outside it, with a hole punched through the ceiling and the roof above the coffee table.
// Geometry + colour only. buildLivingRoom(): {group, anchors, setHole(k)}; houseExterior(): {group, setHole(k), holePos}; roofWithHole(): a roof chunk for fly-ins.
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, cone, tor, rbox, rng, shade } from '../util.js';
import { windowFrame } from '../props/home.js';

export const LIVING_STAGE = { sky: ['#8fd0ff', '#e8f6ff'], ground: null, hemiI: 1.0, keyI: 2.0, keyPos: [3, 8, 6], fillI: 0.6, shadow: { extent: 6 } };
export const HOLE = new THREE.Vector3(0.0, 2.6, 0.6);   // centre of the ceiling hole (living-room coordinates)

function jaggedHole(R, n, seed) { const r = rng(seed), pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, rr = R * (0.78 + r() * 0.4); pts.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr)); } return pts; }

export function sofa(color = 0x3f6fb5) {
  const g = new THREE.Group(), m = mat(color, { rough: 0.85 }), d = mat(shade(color, 0.8), { rough: 0.9 });
  add(g, rbox(2.3, 0.42, 0.9, 0.1), d, [0, 0.21, 0]);
  for (const x of [-0.56, 0.56]) add(g, rbox(1.08, 0.16, 0.78, 0.07), m, [x, 0.5, 0.05]);
  add(g, rbox(2.3, 0.62, 0.24, 0.1), d, [0, 0.68, -0.36]);
  for (const x of [-0.56, 0.56]) add(g, rbox(1.06, 0.48, 0.16, 0.08), m, [x, 0.75, -0.22], [-0.12, 0, 0]);
  for (const s of [-1, 1]) add(g, rbox(0.22, 0.62, 0.9, 0.09), d, [s * 1.2, 0.42, 0]);
  for (const s of [-1, 1]) for (const z of [-0.36, 0.36]) add(g, cyl(0.035, 0.03, 0.08, 8), mat(0x3a2a1a), [s * 1.1, 0.04, z]);
  add(g, rbox(0.42, 0.36, 0.12, 0.06), mat(0xffd23f, { rough: 0.9 }), [-0.75, 0.73, -0.12], [-0.2, 0.2, 0.1]);
  add(g, rbox(0.4, 0.34, 0.12, 0.06), mat(0xff7a8a, { rough: 0.9 }), [0.8, 0.72, -0.12], [-0.2, -0.25, -0.1]);
  g.userData.seatY = 0.58; return g;
}
export function coffeeTable() {
  const g = new THREE.Group(), wood = mat(0x9a6a3e, { rough: 0.6 });
  add(g, rbox(1.2, 0.07, 0.62, 0.03), wood, [0, 0.42, 0]); add(g, rbox(1.08, 0.04, 0.5, 0.02), mat(0x7a5232, { rough: 0.7 }), [0, 0.14, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, cyl(0.03, 0.025, 0.4, 8), wood, [sx * 0.54, 0.2, sz * 0.26]);
  add(g, cyl(0.05, 0.04, 0.1, 12), mat(0xffffff), [0.35, 0.51, 0.08]); add(g, cyl(0.045, 0.045, 0.01, 12), mat(0x5a3a1a), [0.35, 0.555, 0.08]);
  add(g, rbox(0.22, 0.03, 0.16, 0.01), mat(0x2f6fd6), [-0.3, 0.47, -0.05], [0, 0.3, 0]);
  g.userData.topY = 0.455; return g;
}
export function floorLamp() { const g = new THREE.Group(); add(g, cyl(0.16, 0.18, 0.04, 16), mat(0x2a2a30), [0, 0.02, 0]); add(g, cyl(0.018, 0.018, 1.5, 8), mat(0x2a2a30, { metal: 0.6 }), [0, 0.77, 0]); add(g, cyl(0.16, 0.25, 0.3, 20, 1, true), mat(0xfff0d0, { side: THREE.DoubleSide, emissive: 0xffd890, emissiveIntensity: 0.6 }), [0, 1.6, 0]); return g; }
export function tvUnit() {
  const g = new THREE.Group(); add(g, rbox(1.8, 0.45, 0.42, 0.04), mat(0xf2ead8, { rough: 0.6 }), [0, 0.225, 0]);
  for (const x of [-0.45, 0.45]) add(g, rbox(0.8, 0.3, 0.02, 0.01), mat(0xd8cdb4), [x, 0.23, 0.215]);
  add(g, rbox(1.3, 0.76, 0.06, 0.02), mat(0x15151c, { rough: 0.3 }), [0, 0.95, -0.05]); add(g, box(1.22, 0.68, 0.01), glow(0x3a8ad6, 0.45), [0, 0.95, -0.017]);
  add(g, cyl(0.12, 0.09, 0.22, 12), mat(0xe86a4a), [0.72, 0.56, 0.05]); add(g, sph(0.16, 12, 10), mat(0x3f9f46, { rough: 0.9 }), [0.72, 0.78, 0.05]);
  return g;
}
// ---- set dressing (ep5 v3, user: the room looked "plain and unfurnished")
export function bookshelf(w = 1.1, h = 1.9, seed = 3) {
  const g = new THREE.Group(), r = rng(seed), wood = mat(0x7a5232, { rough: 0.6 }), n = 5;
  add(g, box(w, h, 0.34), mat(0x6a4428, { rough: 0.7 }), [0, h / 2, -0.02]);
  for (let i = 0; i <= n; i++) add(g, box(w - 0.04, 0.035, 0.32), wood, [0, 0.06 + i * (h - 0.1) / n, 0.02]);
  const cols = [0xc8302b, 0x2f6fd6, 0xffd23f, 0x3f9f46, 0xf2ead8, 0x8a4ad0, 0xff8a2b, 0x15151c];
  for (let i = 0; i < n; i++) {
    let x = -w / 2 + 0.06; const y0 = 0.08 + i * (h - 0.1) / n;
    while (x < w / 2 - 0.12) {
      if (r() < 0.12) { add(g, sph(0.07, 12, 10), mat(cols[Math.floor(r() * 8)], { rough: 0.4 }), [x + 0.07, y0 + 0.07, 0.04]); x += 0.17; continue; }
      const bw = r.range(0.035, 0.07), bh = r.range(0.2, 0.3);
      add(g, box(bw, bh, 0.22), mat(cols[Math.floor(r() * 8)], { rough: 0.8 }), [x + bw / 2, y0 + bh / 2, 0.04], [0, 0, r() < 0.1 ? 0.2 : 0]); x += bw + 0.006;
    }
  }
  return g;
}
export function pottedPlant(h = 1.2, seed = 5) {
  const g = new THREE.Group(), r = rng(seed);
  add(g, cyl(0.2, 0.15, 0.36, 16), mat(0xe8e0d0, { rough: 0.5 }), [0, 0.18, 0]); add(g, cyl(0.19, 0.19, 0.02, 16), mat(0x4a3020), [0, 0.35, 0]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.4, L = h * r.range(0.45, 0.8);
    add(g, cyl(0.012, 0.012, L, 5), mat(0x3a7a2a), [Math.cos(a) * L * 0.17, 0.36 + L * 0.4, Math.sin(a) * L * 0.17], [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]);
    const leaf = add(g, sph(0.1, 10, 8), mat(i % 2 ? 0x3f9f46 : 0x2f8a3a, { rough: 0.8 }), [Math.cos(a) * L * 0.35, 0.36 + L * 0.8, Math.sin(a) * L * 0.35], [0, -a, 0.6], [0.55, 0.25, 1.9]); leaf.castShadow = true;
  }
  return g;
}
export function curtains(w = 1.3, h = 1.9, color = 0xd8604a) {
  const g = new THREE.Group(), m = mat(color, { rough: 0.95 });
  add(g, cyl(0.02, 0.02, w + 1.0, 8), mat(0x2a2a30, { metal: 0.6 }), [0, h / 2 + 0.08, 0.12], [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) add(g, cyl(0.06, 0.075, h, 10), m, [s * (w / 2 + 0.08 + i * 0.09), 0, 0.1]);
  return g;
}
export function wallClock() {
  const g = new THREE.Group(); add(g, cyl(0.24, 0.24, 0.05, 32), mat(0x15151c), [0, 0, 0], [Math.PI / 2, 0, 0]); add(g, cyl(0.21, 0.21, 0.02, 32), mat(0xfaf6ee), [0, 0, 0.025], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; add(g, box(0.015, 0.04, 0.01), mat(0x15151c), [Math.sin(a) * 0.18, Math.cos(a) * 0.18, 0.04], [0, 0, -a]); }
  add(g, box(0.015, 0.12, 0.01), mat(0x15151c), [0.03, 0.04, 0.045], [0, 0, -0.7]); add(g, box(0.01, 0.16, 0.01), mat(0xc8302b), [-0.05, 0.05, 0.05], [0, 0, 0.9]);
  return g;
}
export function pendantLight() { const g = new THREE.Group(); add(g, cyl(0.006, 0.006, 0.5, 6), mat(0x15151c), [0, -0.25, 0]); add(g, cone(0.26, 0.2, 24), mat(0xffd23f, { rough: 0.5, side: THREE.DoubleSide }), [0, -0.55, 0]); add(g, sph(0.07, 12, 10), glow(0xfff2c0, 1.4), [0, -0.63, 0]); return g; }
export function framedPicture(w, h, color, accent) {
  const g = new THREE.Group(); add(g, box(w, h, 0.04), mat(0x5a3a22, { rough: 0.6 }), [0, 0, 0]); add(g, box(w - 0.08, h - 0.08, 0.02), mat(color, { rough: 0.8 }), [0, 0, 0.02]);
  add(g, sph(Math.min(w, h) * 0.18, 14, 10), mat(accent, { rough: 0.6 }), [w * 0.15, h * 0.12, 0.03], [0, 0, 0], [1, 1, 0.25]); add(g, cone(Math.min(w, h) * 0.3, h * 0.35, 3), mat(shade(color, 0.6)), [-w * 0.12, -h * 0.12, 0.03]);
  return g;
}
export function sideTable() {
  const g = new THREE.Group(), wood = mat(0x9a6a3e, { rough: 0.6 }); add(g, cyl(0.26, 0.26, 0.04, 24), wood, [0, 0.58, 0]); add(g, cyl(0.03, 0.03, 0.56, 8), wood, [0, 0.29, 0]); add(g, cyl(0.18, 0.2, 0.03, 16), wood, [0, 0.015, 0]);
  add(g, cyl(0.07, 0.09, 0.22, 12), mat(0x2f6fd6), [0.06, 0.71, 0]); add(g, cyl(0.12, 0.17, 0.16, 16, 1, true), mat(0xfff0d0, { side: THREE.DoubleSide, emissive: 0xffd890, emissiveIntensity: 0.5 }), [0.06, 0.9, 0]); add(g, box(0.16, 0.04, 0.12), mat(0xc8302b), [-0.1, 0.62, 0.05], [0, 0.4, 0]);
  return g;
}
// the room: floor (planks), rug, back wall with a window and TV, side walls with a door + picture frames, skirting, ceiling with a punch-through hole
export function buildLivingRoom({ w = 7, d = 6, h = 2.6 } = {}) {
  const g = new THREE.Group(), r = rng(12), anchors = {};
  const wall = mat(0xf3e2c4, { rough: 0.95 }), wall2 = mat(0xe9d4b0, { rough: 0.95 }), trim = mat(0xffffff, { rough: 0.6 });
  // floor planks
  for (let i = 0; i < 18; i++) add(g, box(w, 0.04, d / 18 - 0.006), mat(i % 3 === 0 ? 0xb07a48 : i % 3 === 1 ? 0xa86f40 : 0xb8824e, { rough: 0.7 }), [0, -0.02, -d / 2 + (i + 0.5) * d / 18]);
  const rug = add(g, cyl(1.6, 1.6, 0.015, 48), mat(0xc84a4a, { rough: 1 }), [0, 0.008, 0.4], [0, 0, 0], [1.2, 1, 0.8]); rug.receiveShadow = true;
  add(g, cyl(1.3, 1.3, 0.017, 48), mat(0xf2d27a, { rough: 1 }), [0, 0.01, 0.4], [0, 0, 0], [1.2, 1, 0.8]);
  add(g, cyl(1.0, 1.0, 0.019, 48), mat(0xc84a4a, { rough: 1 }), [0, 0.012, 0.4], [0, 0, 0], [1.2, 1, 0.8]);
  // walls
  add(g, box(w, h, 0.12), wall, [0, h / 2, -d / 2]);
  for (const s of [-1, 1]) add(g, box(0.12, h, d), wall2, [s * w / 2, h / 2, 0]);
  for (const s of [-1, 1]) add(g, box(0.04, 0.12, d), trim, [s * (w / 2 - 0.07), 0.06, 0]); add(g, box(w, 0.12, 0.04), trim, [0, 0.06, -d / 2 + 0.07]);
  add(g, box(w, 0.08, 0.06), trim, [0, h - 0.04, -d / 2 + 0.08]);
  const win = windowFrame(1.3, 1.1, { shutter: null }); win.position.set(-2.0, 1.45, -d / 2 + 0.07); g.add(win);
  const win2 = windowFrame(1.3, 1.1, { shutter: null }); win2.position.set(2.1, 1.45, -d / 2 + 0.07); g.add(win2);
  // picture frames on the left wall, a door on the right wall
  for (const [z, c] of [[-1.2, 0xffd23f], [0.2, 0x4aa0e0]]) { add(g, box(0.04, 0.55, 0.7), mat(0x5a3a22), [-w / 2 + 0.08, 1.6, z]); add(g, box(0.02, 0.45, 0.6), mat(c, { rough: 0.8 }), [-w / 2 + 0.1, 1.6, z]); }
  add(g, box(0.06, 2.0, 0.95), mat(0xc8302b, { rough: 0.6 }), [w / 2 - 0.08, 1.0, -0.8]); add(g, sph(0.04, 10, 8), mat(0xd8b040, { metal: 0.8 }), [w / 2 - 0.13, 1.0, -0.45]);
  const tv = tvUnit(); tv.position.set(0, 0, -d / 2 + 0.32); tv.visible = false; g.add(tv);
  const so = sofa(); so.position.set(0, 0, -1.85); g.add(so); anchors.sofa = so; anchors.seatY = so.userData.seatY;
  const ct = coffeeTable(); ct.position.set(0.0, 0, 0.0); g.add(ct); anchors.table = ct; anchors.tableY = ct.userData.topY;
  const lamp = floorLamp(); lamp.position.set(-1.6, 0, -2.3); g.add(lamp);
  const pl = new THREE.PointLight(0xffd890, 3, 6, 1.5); pl.position.set(-1.6, 1.6, -2.3); g.add(pl);
  // armchair (grandma)
  const ac = new THREE.Group(); add(ac, rbox(0.9, 0.42, 0.85, 0.1), mat(0x6aa86a, { rough: 0.9 }), [0, 0.21, 0]); add(ac, rbox(0.9, 0.7, 0.2, 0.1), mat(0x5a985a, { rough: 0.9 }), [0, 0.7, -0.33]); for (const s of [-1, 1]) add(ac, rbox(0.16, 0.6, 0.85, 0.07), mat(0x5a985a), [s * 0.45, 0.4, 0]); add(ac, rbox(0.62, 0.14, 0.66, 0.06), mat(0x7ab87a), [0, 0.48, 0.04]);
  ac.position.set(2.15, 0, -0.9); ac.rotation.y = -0.7; g.add(ac); anchors.armchair = ac; anchors.armY = 0.55;
  // dressing: shelves, plants, curtains, clock, pictures, pendant, side table, crown moulding, second rug
  const sh = bookshelf(1.1, 1.95, 3); sh.position.set(-w / 2 + 0.26, 0, -1.9); sh.rotation.y = Math.PI / 2; g.add(sh);
  const sh2 = bookshelf(1.0, 1.95, 8); sh2.position.set(w / 2 - 0.26, 0, -2.2); sh2.rotation.y = -Math.PI / 2; g.add(sh2);
  for (const [x, z, hh, sd] of [[-3.05, -2.55, 1.3, 5], [3.0, 0.9, 1.0, 9], [-2.95, 1.6, 0.9, 11]]) { const pp = pottedPlant(hh, sd); pp.position.set(x, 0, z); g.add(pp); }
  for (const x of [-2.0, 2.1]) { const cu = curtains(1.3, 1.95, 0xd8604a); cu.position.set(x, 1.35, -d / 2 + 0.06); g.add(cu); }
  const clk = wallClock(); clk.position.set(0, 2.05, -d / 2 + 0.09); g.add(clk);
  for (const [x, y, pw, ph, c, a] of [[-0.75, 1.55, 0.5, 0.38, 0x8ad0f0, 0xffd23f], [0.75, 1.5, 0.42, 0.52, 0xf2c0a0, 0x3f9f46]]) { const fp = framedPicture(pw, ph, c, a); fp.position.set(x, y, -d / 2 + 0.08); g.add(fp); }
  const st = sideTable(); st.position.set(-1.5, 0, -1.7); g.add(st);
  const pend = pendantLight(); pend.position.set(-1.6, h, -0.8); g.add(pend);
  for (const s2 of [-1, 1]) add(g, box(0.1, 0.1, d), trim, [s2 * (w / 2 - 0.1), h - 0.05, 0]); add(g, box(w, 0.1, 0.1), trim, [0, h - 0.05, -d / 2 + 0.1]);
  add(g, rbox(1.6, 0.03, 1.1, 0.02), mat(0xf2ead8, { rough: 1 }), [2.3, 0.006, 1.5]);
  // ceiling with the hole (two versions: whole and holed)
  const outer = new THREE.Shape([new THREE.Vector2(-w / 2, -d / 2), new THREE.Vector2(w / 2, -d / 2), new THREE.Vector2(w / 2, d / 2), new THREE.Vector2(-w / 2, d / 2)]);
  const ceilM = mat(0xfaf6ee, { rough: 1, side: THREE.DoubleSide });
  const whole = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.18, bevelEnabled: false }), ceilM); whole.rotation.x = Math.PI / 2; whole.position.y = h + 0.18; g.add(whole);   // a thick slab, not a plane
  const holed = outer.clone(); const hp = jaggedHole(0.62, 22, 4).map((p) => new THREE.Vector2(p.x + HOLE.x, p.y + HOLE.z)); holed.holes.push(new THREE.Path(hp));
  const hm = new THREE.Mesh(new THREE.ExtrudeGeometry(holed, { depth: 0.18, bevelEnabled: false }), ceilM); hm.rotation.x = Math.PI / 2; hm.position.y = h + 0.18; g.add(hm);
  // broken lath + plaster lips round the hole
  const lip = new THREE.Group(); g.add(lip);
  hp.forEach((p, i) => { if (i % 2) return; const m = add(lip, box(0.14, 0.05, 0.08 + r() * 0.1), mat(i % 4 ? 0xe8e0d0 : 0x9a7a52, { rough: 1 }), [p.x, h - 0.02, p.y], [r.range(-0.6, 0.6), Math.atan2(p.y - HOLE.z, p.x - HOLE.x), r.range(-0.4, 0.4)]); m.castShadow = true; });
  add(g, cyl(0.12, 0.12, 0.03, 16), mat(0xffffff), [-1.6, h - 0.02, -0.8]);   // ceiling light rose
  // snapped joists hanging into the room + pink insulation round the edge
  for (const [dx, len, rz] of [[-0.42, 0.5, 0.5], [0.4, 0.45, -0.6]]) { const j = add(lip, box(0.08, 0.16, len), mat(0x9a7a52, { rough: 0.9 }), [HOLE.x + dx, h - 0.05, HOLE.z - 0.7 + len / 2], [0.55, 0, rz]); j.castShadow = true; }
  hp.forEach((p, i) => { if (i % 3) return; add(lip, box(0.12, 0.06, 0.1), mat(0xf0a0b0, { rough: 1 }), [p.x * 0.9 + HOLE.x * 0.1, h + 0.12, p.y * 0.9 + HOLE.z * 0.1], [r() * 0.5, r() * 3, 0]); });
  g.setHole = (k) => { whole.visible = k <= 0; hm.visible = lip.visible = k > 0; };
  g.setHole(0);
  return { group: g, anchors, setHole: g.setHole, H: h };
}
// single-storey bungalow outside (faces +Z). Roof hole above the living-room hole. setHole(k).
export function houseExterior({ w = 7.4, d = 6.4, h = 2.8, seed = 2 } = {}) {
  const g = new THREE.Group(), r = rng(seed), wall = mat(0xf0d8b0, { rough: 0.9 }), roofM = mat(0xb4503a, { rough: 0.75 }), roofD = mat(0x8a3a2a, { rough: 0.8 });
  add(g, box(w, h, d), wall, [0, h / 2, 0]);
  const pitch = 0.55, half = d / 2 + 0.35, slabL = half / Math.cos(pitch);
  for (const s of [-1, 1]) {
    const slab = new THREE.Group(); slab.position.set(0, h + Math.tan(pitch) * half / 2, s * half / 2); slab.rotation.x = s * pitch; g.add(slab);
    add(slab, box(w + 0.5, 0.12, slabL), roofM, [0, 0, 0]);
    for (let i = 0; i < 9; i++) add(slab, box(w + 0.5, 0.05, 0.03), roofD, [0, 0.07, -slabL / 2 + (i + 0.5) * slabL / 9]);   // tile rows
    if (s === 1) g.userData.frontSlab = slab;
  }
  add(g, box(w + 0.55, 0.14, 0.18), roofD, [0, h + Math.tan(pitch) * half + 0.02, 0]);   // ridge
  for (const s of [-1, 1]) { const gable = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, Math.tan(pitch) * d / 2)])), mat(0xf0d8b0, { rough: 0.9, side: THREE.DoubleSide })); gable.rotation.y = Math.PI / 2; gable.position.set(s * w / 2, h, 0); g.add(gable); }
  const chim = new THREE.Group(); chim.position.set(-2.2, h + 1.6, 1.0); g.add(chim); add(chim, box(0.55, 1.6, 0.55), mat(0x9a4a3a, { rough: 0.85 }), [0, 0, 0]); add(chim, box(0.66, 0.1, 0.66), mat(0x6a2a1a), [0, 0.82, 0]); for (const x of [-0.12, 0.12]) add(chim, cyl(0.07, 0.07, 0.22, 10), mat(0xb0602a), [x, 0.95, 0]);
  g.userData.chimneyTop = new THREE.Vector3(-2.2, h + 2.47, 1.0);
  for (const x of [-2.2, 2.2]) { const wf = windowFrame(1.1, 1.0, { shutter: 0x3a8a6a, flowers: true }); wf.position.set(x, 1.45, d / 2 + 0.02); g.add(wf); }
  add(g, box(0.95, 1.95, 0.06), mat(0xc8302b, { rough: 0.6 }), [0, 0.98, d / 2 + 0.03]); add(g, box(w + 0.1, 0.25, 0.1), mat(0xb8a48a), [0, 0.12, d / 2 + 0.03]);
  // hole on the front slab, above HOLE
  const slab = g.userData.frontSlab; const hz = 0.6; // HOLE.z in house coords
  const local = new THREE.Vector3(HOLE.x, 0, (hz - half / 2) / Math.cos(pitch));
  // ep5 v3: a REAL cut through the slab (v2 drew a black decal on solid tiles and the hero passed through the slab)
  const solid = slab.children.slice();   // the whole slab + its tile rows
  const holed = new THREE.Group(); slab.add(holed);
  const W2 = (w + 0.5) / 2, hr = 0.78;
  const rect = new THREE.Shape([new THREE.Vector2(-W2, -slabL / 2), new THREE.Vector2(W2, -slabL / 2), new THREE.Vector2(W2, slabL / 2), new THREE.Vector2(-W2, slabL / 2)]);
  const ring = jaggedHole(hr, 18, 9).map((p) => new THREE.Vector2(p.x + local.x, -(p.y + local.z)));   // shape y = -slab z (rotation -90° about x)
  rect.holes.push(new THREE.Path(ring));
  const cut = new THREE.Mesh(new THREE.ExtrudeGeometry(rect, { depth: 0.12, bevelEnabled: false }), roofM); cut.rotation.x = -Math.PI / 2; cut.position.y = -0.06; cut.castShadow = cut.receiveShadow = true; holed.add(cut);
  for (let i = 0; i < 9; i++) {   // tile rows stop at the hole
    const z = -slabL / 2 + (i + 0.5) * slabL / 9, dz = Math.abs(z - local.z), gap = dz < hr ? Math.sqrt(hr * hr - dz * dz) + 0.12 : 0;
    if (!gap) { add(holed, box(w + 0.5, 0.05, 0.03), roofD, [0, 0.07, z]); continue; }
    const L1 = local.x - gap + W2, L2 = W2 - local.x - gap; add(holed, box(L1, 0.05, 0.03), roofD, [-W2 + L1 / 2, 0.07, z]); add(holed, box(L2, 0.05, 0.03), roofD, [W2 - L2 / 2, 0.07, z]);
  }
  // the cut edge: snapped rafters poking up, loose tiles on the rim, torn felt, and a dark attic below
  for (const [a, len] of [[0.3, 0.7], [2.1, 0.6], [3.6, 0.55], [5.0, 0.65]]) { const m = add(holed, box(0.09, 0.09, len), mat(0x9a7a52, { rough: 0.9 }), [local.x + Math.cos(a) * 0.72, 0.02, local.z + Math.sin(a) * 0.72], [0.6, -a, 0.4]); m.castShadow = true; }
  ring.forEach((p, i) => { if (i % 2) return; const m = add(holed, box(0.22, 0.04, 0.14), roofM, [p.x * 1.08 - local.x * 0.08, 0.1, -p.y * 1.08 - local.z * 0.08], [r.range(-0.6, 0.6), r.range(0, 3), r.range(-0.6, 0.6)]); m.castShadow = true; });
  ring.forEach((p, i) => { if (i % 3) return; add(holed, box(0.14, 0.02, 0.1), mat(0x2a2a2e, { rough: 1 }), [p.x, -0.07, -p.y], [0.4, i, 0.2]); });
  add(holed, cyl(hr * 1.05, hr * 1.05, 1.4, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x1a120c, side: THREE.BackSide }), [local.x, -0.76, local.z]);
  add(holed, new THREE.CircleGeometry(hr * 1.05, 20), new THREE.MeshBasicMaterial({ color: 0x120c08 }), [local.x, -1.45, local.z], [-Math.PI / 2, 0, 0]);
  g.setHole = (k) => { holed.visible = k > 0; for (const c of solid) c.visible = k <= 0; };
  g.setHole(0);
  g.userData.holeWorld = () => { const v = local.clone(); v.y = 0.1; return slab.localToWorld(v); };
  return g;
}
export function roofWithHole() { const g = houseExterior(); g.setHole(1); return g; }
