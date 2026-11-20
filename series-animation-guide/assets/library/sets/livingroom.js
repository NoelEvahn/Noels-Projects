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
  // ceiling with the hole (two versions: whole and holed)
  const outer = new THREE.Shape([new THREE.Vector2(-w / 2, -d / 2), new THREE.Vector2(w / 2, -d / 2), new THREE.Vector2(w / 2, d / 2), new THREE.Vector2(-w / 2, d / 2)]);
  const ceilM = mat(0xfaf6ee, { rough: 1, side: THREE.DoubleSide });
  const whole = new THREE.Mesh(new THREE.ShapeGeometry(outer), ceilM); whole.rotation.x = Math.PI / 2; whole.position.y = h; g.add(whole);
  const holed = outer.clone(); const hp = jaggedHole(0.62, 22, 4).map((p) => new THREE.Vector2(p.x + HOLE.x, p.y + HOLE.z)); holed.holes.push(new THREE.Path(hp));
  const hm = new THREE.Mesh(new THREE.ExtrudeGeometry(holed, { depth: 0.18, bevelEnabled: false }), ceilM); hm.rotation.x = Math.PI / 2; hm.position.y = h + 0.18; g.add(hm);
  // broken lath + plaster lips round the hole
  const lip = new THREE.Group(); g.add(lip);
  hp.forEach((p, i) => { if (i % 2) return; const m = add(lip, box(0.14, 0.05, 0.08 + r() * 0.1), mat(i % 4 ? 0xe8e0d0 : 0x9a7a52, { rough: 1 }), [p.x, h - 0.02, p.y], [r.range(-0.6, 0.6), Math.atan2(p.y - HOLE.z, p.x - HOLE.x), r.range(-0.4, 0.4)]); m.castShadow = true; });
  add(g, cyl(0.12, 0.12, 0.03, 16), mat(0xffffff), [-1.6, h - 0.02, -0.8]);   // ceiling light rose
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
  const hole = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(jaggedHole(0.75, 18, 9))), new THREE.MeshBasicMaterial({ color: 0x1a0e08 })); hole.rotation.x = -Math.PI / 2; hole.position.set(local.x, 0.075, local.z); slab.add(hole);
  const shards = new THREE.Group(); slab.add(shards);
  jaggedHole(0.82, 14, 10).forEach((p, i) => { const m = add(shards, box(0.24, 0.05, 0.16), roofM, [local.x + p.x, 0.1, local.z + p.y], [r.range(-0.5, 0.5), r.range(0, 3), r.range(-0.5, 0.5)]); m.castShadow = true; });
  g.setHole = (k) => { hole.visible = shards.visible = k > 0; };
  g.setHole(0);
  g.userData.holeWorld = () => { const v = local.clone(); v.y = 0.1; return slab.localToWorld(v); };
  return g;
}
export function roofWithHole() { const g = houseExterior(); g.setHole(1); return g; }
