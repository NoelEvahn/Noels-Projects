// Everyday props: trees, bushes, fences, grill, picnic table, chairs, paddling pool, bunting, house facades, windows.
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, cap, cone, tor, rbox, rng, canvasTex, C } from '../util.js';

export function tree(r = rng(1), { trunk = 0x7a5232, leaf = 0x49b04e, h = 2.2, s = 1 } = {}) {
  const g = new THREE.Group();
  add(g, cyl(0.12 * s, 0.18 * s, h * 0.55, 10), mat(trunk), [0, h * 0.27, 0]);
  const leafM = mat(leaf, { rough: 0.85 });
  const blobs = [[0, h * 0.78, 0, 0.72], [0.45, h * 0.62, 0.1, 0.5], [-0.45, h * 0.64, -0.1, 0.52], [0.05, h * 0.62, 0.45, 0.48], [0.0, h * 1.0, 0.0, 0.45]];
  for (const [x, y, z, rr] of blobs) add(g, sph(rr * s, 18, 12), leafM, [x * s, y, z * s]);
  return g;
}
export function bush(color = 0x3f9f46, s = 1) { const g = new THREE.Group(); for (const [x, y, z, r] of [[0, 0.3, 0, 0.35], [0.3, 0.25, 0.1, 0.28], [-0.3, 0.25, -0.05, 0.3], [0.05, 0.28, 0.25, 0.26]]) add(g, sph(r * s, 14, 10), mat(color, { rough: 0.9 }), [x * s, y * s, z * s]); return g; }
export function flowerPatch(r = rng(5), n = 12, w = 1.2, cols = [0xff5c8a, 0xffd23f, 0xffffff, 0xb07aff]) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const x = r.range(-w, w), z = r.range(-w * 0.4, w * 0.4); add(g, cyl(0.012, 0.012, 0.22, 5), mat(0x2f8f3a), [x, 0.11, z]); add(g, sph(0.065, 8, 6), mat(r.pick(cols)), [x, 0.24, z]); }
  return g;
}
// Picket fence segment along X, length L. returns group.
export function fence(L = 6, { h = 1.0, color = 0xfdfaf0 } = {}) {
  const g = new THREE.Group(); const n = Math.round(L / 0.22);
  const im = new THREE.InstancedMesh(box(0.14, h, 0.05), mat(color, { rough: 0.8 }), n); const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) { d.position.set(-L / 2 + (i + 0.5) * (L / n), h / 2, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  im.castShadow = im.receiveShadow = true; g.add(im);
  add(g, box(L, 0.07, 0.07), mat(color), [0, h * 0.28, -0.04]); add(g, box(L, 0.05, 0.16), mat(color), [0, h + 0.025, 0]);   // flat top board (cats sit on it) add(g, box(L, 0.07, 0.07), mat(color), [0, h * 0.78, -0.04]);
  return g;
}
export function grill() {
  const g = new THREE.Group(); const dark = mat(0x2c2c34, { rough: 0.4, metal: 0.5 });
  add(g, sph(0.42, 24, 14, 0, 6.283, 0, 1.57), dark, [0, 0.85, 0], [Math.PI, 0, 0], [1, 0.7, 1]); // bowl (open top)
  add(g, cyl(0.38, 0.38, 0.02, 24), mat(0x888894, { metal: 0.6 }), [0, 0.88, 0]);
  add(g, sph(0.42, 24, 14, 0, 6.283, 0, 1.57), mat(0xd23a2a, { rough: 0.35 }), [0, 1.0, -0.05], [-0.9, 0, 0], [1, 0.8, 1]); // lid propped open
  for (const [x, z] of [[0.28, 0.2], [-0.28, 0.2], [0, -0.3]]) add(g, cyl(0.025, 0.025, 0.55, 8), dark, [x, 0.3, z], [x * 0.2, 0, z * 0.2]);
  add(g, cyl(0.2, 0.2, 0.03, 16), mat(0xff5a1f, { emissive: 0xff4a10, emissiveIntensity: 0.9 }), [0, 0.89, 0]); // coals
  return g;
}
export function burger() {
  const g = new THREE.Group();
  add(g, sph(0.09, 14, 8, 0, 6.283, 0, 1.57), mat(0xd9954a), [0, 0.04, 0], [0, 0, 0], [1, 0.8, 1]);
  add(g, cyl(0.085, 0.085, 0.03, 14), mat(0x5a2c1a), [0, 0.0, 0]); add(g, cyl(0.09, 0.09, 0.012, 14), mat(0x69c24a), [0, 0.02, 0]);
  add(g, sph(0.09, 14, 8, 0, 6.283, 1.57, 1.57), mat(0xd9954a), [0, -0.03, 0], [0, 0, 0], [1, 0.5, 1]);
  return g;
}
export function picnicTable() {
  const g = new THREE.Group(); const wood = mat(0xb9824a, { rough: 0.8 });
  add(g, rbox(2.0, 0.08, 0.9, 0.03), wood, [0, 0.78, 0]);
  for (const s of [-1, 1]) { add(g, rbox(2.0, 0.14, 0.34, 0.04), wood, [0, 0.27, s * 0.7]); add(g, box(0.07, 0.8, 0.07), wood, [s * 0.78, 0.4, 0.3], [0.3 * s, 0, 0]); add(g, box(0.07, 0.8, 0.07), wood, [s * 0.78, 0.4, -0.3], [-0.3 * s, 0, 0]); }
  add(g, box(1.9, 0.012, 0.8), mat(0xf6f0e0), [0, 0.825, 0]); // cloth
  return g;
}
// Lawn chair: seat top at 0.34 (matches POSES.sitOn(t, 0.34)), thick cushion, back rest. Faces +Z.
export function lawnChair(color = 0x2bb7b0) {
  const g = new THREE.Group(); const fr = mat(0xd8d8e0, { metal: 0.6, rough: 0.3 });
  add(g, rbox(0.62, 0.16, 0.56, 0.06), mat(color), [0, 0.26, 0]);                                   // cushion: top at 0.34
  add(g, rbox(0.6, 0.56, 0.1, 0.05), mat(color), [0, 0.64, -0.26], [-0.18, 0, 0]);                   // back
  for (const x of [-1, 1]) { for (const z of [-1, 1]) add(g, cyl(0.018, 0.018, 0.2, 6), fr, [x * 0.27, 0.1, z * 0.22]); add(g, rbox(0.05, 0.05, 0.5, 0.02), fr, [x * 0.3, 0.45, -0.02]); add(g, cyl(0.018, 0.018, 0.4, 6), fr, [x * 0.3, 0.3, -0.2], [0.3, 0, 0]); }
  return g;
}
export function pool(r = 0.9) {
  const g = new THREE.Group();
  add(g, tor(r, 0.12, 12, 32), mat(0xff6a9a, { rough: 0.5 }), [0, 0.14, 0], [Math.PI / 2, 0, 0]);
  add(g, cyl(r, r, 0.2, 32), mat(0x4fc3f7, { rough: 0.15, metal: 0.1, opacity: 0.9 }), [0, 0.08, 0]);
  return g;
}
// Triangular bunting between two points (world coords in group), n flags
export function bunting(a = [-2, 2.5, 0], b = [2, 2.5, 0], n = 10, cols = [0xff5c8a, 0xffd23f, 0x4aa0e0, 0x4cd07a, 0xffffff]) {
  const g = new THREE.Group(); const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; const p = A.clone().lerp(B, t); p.y -= Math.sin(t * Math.PI) * 0.35; pts.push(p); }
  for (let i = 0; i < 24; i++) { const m = pts[i].clone().add(pts[i + 1]).multiplyScalar(0.5); const l = pts[i].distanceTo(pts[i + 1]); add(g, cyl(0.008, 0.008, l, 4), mat(0xdddddd), [m.x, m.y, m.z], [0, 0, Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x) - Math.PI / 2]); }
  for (let k = 0; k < n; k++) { const p = pts[Math.round(((k + 0.5) / n) * 24)]; const f = add(g, cone(0.14, 0.3, 3), mat(cols[k % cols.length], { side: THREE.DoubleSide }), [p.x, p.y - 0.15, p.z], [Math.PI, 0, 0], [1, 1, 0.15]); f.castShadow = false; }
  return g;
}
export function gazebo(w = 3, h = 2.6) {
  const g = new THREE.Group(); const wood = mat(0xf2ece0, { rough: 0.7 });
  for (const x of [-1, 1]) for (const z of [-1, 1]) add(g, cyl(0.07, 0.07, h, 10), wood, [x * w / 2, h / 2, z * w / 2]);
  add(g, cone(w * 0.85, 1.0, 4), mat(0x3a6ea5, { rough: 0.6 }), [0, h + 0.5, 0], [0, Math.PI / 4, 0]);
  add(g, cyl(w * 0.62, w * 0.62, 0.1, 4), wood, [0, h + 0.02, 0], [0, Math.PI / 4, 0]);
  return g;
}
// House window with frame, sill, shutters, flower box; faces +Z. size w x h
export function windowFrame(w = 0.9, h = 1.2, { glass = 0x9fd6ff, frame = 0xffffff, shutter = null, flowers = false } = {}) {
  const g = new THREE.Group(); const fm = mat(frame, { rough: 0.5 });
  add(g, box(w, h, 0.04), mat(glass, { rough: 0.1, metal: 0.2, emissive: glass, emissiveIntensity: 0.25 }), [0, 0, 0]);
  for (const [bw, bh, x, y] of [[w + 0.12, 0.07, 0, h / 2 + 0.03], [w + 0.12, 0.07, 0, -h / 2 - 0.03], [0.07, h, -w / 2 - 0.03, 0], [0.07, h, w / 2 + 0.03, 0], [0.04, h, 0, 0], [w, 0.04, 0, 0]]) add(g, box(bw, bh, 0.07), fm, [x, y, 0.02]);
  add(g, box(w + 0.3, 0.06, 0.18), fm, [0, -h / 2 - 0.09, 0.08]);
  if (shutter) for (const s of [-1, 1]) add(g, box(w * 0.32, h, 0.04), mat(shutter), [s * (w / 2 + w * 0.2), 0, 0.03]);
  if (flowers) { add(g, box(w + 0.2, 0.14, 0.16), mat(0x8a5a3a), [0, -h / 2 - 0.2, 0.14]); for (let i = 0; i < 6; i++) add(g, sph(0.07, 8, 6), mat([0xff5c8a, 0xffd23f, 0xff8a2b][i % 3]), [-w / 2 + 0.1 + i * (w / 5.5), -h / 2 - 0.07, 0.15]); }
  return g;
}
export function door(w = 0.9, h = 1.9, color = 0xc8302b) {
  const g = new THREE.Group();
  add(g, box(w, h, 0.08), mat(color, { rough: 0.5 }), [0, h / 2, 0]);
  for (const k of [0.62, 0.3]) add(g, rbox(w * 0.7, h * 0.28, 0.04, 0.03), mat(0x000000, { opacity: 0.12 }), [0, h * (k + 0.2), 0.05]);
  add(g, sph(0.05, 10, 8), mat(C.gold, { metal: 0.8, rough: 0.3 }), [w * 0.32, h * 0.48, 0.09]);
  add(g, box(w + 0.16, 0.08, 0.12), mat(0xffffff), [0, h + 0.04, 0]); for (const s of [-1, 1]) add(g, box(0.08, h, 0.12), mat(0xffffff), [s * (w / 2 + 0.04), h / 2, 0]);
  return g;
}
// Terraced / detailed house front: faces +Z, width w, height ~3.2 + roof. Pitched tiled roof with chimney.
export function houseFront({ w = 3.2, floors = 2, wall = 0xf0d8b0, roof = 0xb4503a, doorColor = 0xc8302b, seed = 1, depth = 3 } = {}) {
  const r = rng(seed), g = new THREE.Group(), fh = 1.7, H = floors * fh;
  add(g, box(w, H, depth), mat(wall, { rough: 0.9 }), [0, H / 2, -depth / 2]);
  // pitched tiled roof: two slanted slabs
  for (const s of [-1, 1]) add(g, box(w * 0.62, 0.12, depth + 0.5), mat(roof, { rough: 0.75 }), [s * w * 0.27, H + w * 0.2, -depth / 2], [0, 0, -s * 0.6]);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) add(g, box(w * 0.58, 0.03, 0.02), mat(0x000000, { opacity: 0.18 }), [s * w * 0.27, H + w * 0.2 + 0.07 - 0.0, -depth / 2 + (i - 2) * (depth / 5)], [0, 0, -s * 0.6]);
  // gable end wall fill
  add(g, cone(w * 0.56, w * 0.32, 4), mat(wall, { rough: 0.9 }), [0, H + w * 0.16, -0.05], [0, Math.PI / 4, 0], [1, 1, 0.12]);
  add(g, box(0.38, 1.0, 0.38), mat(0x9a4a3a), [w * 0.3, H + 0.75, -depth * 0.6]); add(g, box(0.46, 0.08, 0.46), mat(0x6a2a1a), [w * 0.3, H + 1.28, -depth * 0.6]);
  // windows
  for (let f = 0; f < floors; f++) for (const s of f === 0 ? [-1] : [-1, 1]) { const wf = windowFrame(0.7, 0.95, { shutter: 0x3a8a6a, flowers: f === 0 && r() < 0.8 }); wf.position.set(s * w * 0.27, f * fh + fh * 0.62, 0.02); g.add(wf); }
  const d = door(0.85, 1.55, doorColor); d.position.set(w * 0.27, 0, 0.02); g.add(d);
  add(g, box(w + 0.1, 0.25, 0.08), mat(0xb8a48a), [0, 0.12, 0.02]); // plinth
  g.userData.height = H; g.userData.doorPos = new THREE.Vector3(w * 0.27, 0, 0.1);
  return g;
}
// Back of a house for the garden: wall + patio door + 2 windows (faces +Z), width w
export function houseBack(w = 9, h = 4.2, wall = 0xf3dfba) {
  const g = new THREE.Group();
  add(g, box(w, h, 0.5), mat(wall, { rough: 0.9 }), [0, h / 2, 0]);
  for (const x of [-w * 0.32, w * 0.32]) { const wf = windowFrame(1.1, 1.3, { shutter: 0x3a8a6a, flowers: true }); wf.position.set(x, 2.8, 0.28); g.add(wf); }
  const dr = door(1.7, 2.2, 0x3a6ea5); dr.position.set(0, 0, 0.28); g.add(dr);
  add(g, box(w + 0.6, 0.12, 0.9), mat(0xd9d2c4), [0, 0.06, 0.35]); // patio step
  add(g, box(w + 0.4, 0.1, 0.8), mat(0xb4503a), [0, h + 0.05, 0]); // roof edge
  return g;
}
export function tablet() { const g = new THREE.Group(); add(g, rbox(0.34, 0.24, 0.025, 0.02), mat(0x15151c), [0, 0, 0]); add(g, box(0.3, 0.2, 0.004), glow(0x4aa0e0, 0.8), [0, 0, 0.013]); return g; }
export function phone(screenColor = 0x4cd07a) { const g = new THREE.Group(); add(g, rbox(0.1, 0.19, 0.012, 0.012), mat(0x15151c), [0, 0, 0]); add(g, box(0.088, 0.17, 0.003), glow(screenColor, 0.8), [0, 0, 0.007]); return g; }
export function trashCan(color = 0x3a8a6a) { const g = new THREE.Group(); add(g, cyl(0.28, 0.24, 0.8, 16), mat(color, { rough: 0.5 }), [0, 0.4, 0]); add(g, cyl(0.3, 0.3, 0.06, 16), mat(0x2a6a4a), [0, 0.83, 0]); return g; }
export function lamppost(h = 3.2) { const g = new THREE.Group(); add(g, cyl(0.05, 0.07, h, 8), mat(0x2c3a44, { metal: 0.5 }), [0, h / 2, 0]); add(g, sph(0.2, 14, 10), glow(0xfff2b0, 0.8), [0, h + 0.1, 0]); add(g, cone(0.26, 0.2, 12), mat(0x2c3a44), [0, h + 0.35, 0]); return g; }
