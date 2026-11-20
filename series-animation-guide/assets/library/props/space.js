// Space props (ep5): ISS, satellite, Voyager 1 (googly eyes), the Sun with sunglasses, banded gas giants, Saturn, icy rocks + comet,
// a nebula pillar, picnic blanket, telescope, tiny planet, airliner cockpit nose, Moon flag. Geometry, vertex colours and light only.
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, cone, tor, rbox, rng, shade } from '../util.js';

const gold = () => mat(0xd8a832, { metal: 0.85, rough: 0.3 }), white = () => mat(0xeeeeee, { rough: 0.45 }), panelM = () => mat(0x1f3a7a, { metal: 0.5, rough: 0.25, emissive: 0x0a1a40, emissiveIntensity: 0.4 });
// solar array: a wing of cells (geometry grid, not a texture)
function wing(w, h, cols = 6, rows = 2) { const g = new THREE.Group(); add(g, box(w, 0.02, h), mat(0xc8c8d0, { metal: 0.6 }), [0, -0.012, 0]); const cw = w / cols, ch = h / rows; for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) add(g, box(cw * 0.92, 0.02, ch * 0.9), panelM(), [-w / 2 + cw * (i + 0.5), 0, -h / 2 + ch * (j + 0.5)]); return g; }

export function issStation() {
  const g = new THREE.Group();
  add(g, box(9, 0.28, 0.28), mat(0xb8b8c0, { metal: 0.6, rough: 0.4 }), [0, 0, 0]);   // main truss
  for (let i = -4; i <= 4; i++) add(g, box(0.06, 0.3, 0.3), mat(0x8a8a92), [i, 0, 0]);
  for (const x of [-4.2, -3.0, 3.0, 4.2]) for (const s of [-1, 1]) { const w = wing(1.0, 3.2, 2, 8); w.position.set(x, 0, s * 1.85); g.add(w); }
  const mod = mat(0xf2f2f2, { rough: 0.5 });
  for (const [x, z, l, r] of [[0, 0.9, 2.6, 0.42], [0, -0.9, 2.0, 0.42], [1.1, 0.9, 1.4, 0.38], [-1.2, 0.9, 1.6, 0.4]]) { const m = add(g, cyl(r, r, l, 20), mod, [x, -0.45, z], [0, 0, Math.PI / 2]); for (let k = -1; k <= 1; k += 2) add(g, tor(r * 1.01, 0.02, 6, 24), mat(0xc0c0c8), [x + k * l * 0.35, -0.45, z], [0, Math.PI / 2, 0]); }
  add(g, cyl(0.42, 0.42, 1.8, 20), mod, [0, -0.45, 1.8], [Math.PI / 2, 0, 0]);
  // radiators
  for (const x of [-1.8, 1.8]) add(g, box(0.9, 0.02, 1.8), mat(0xf6f6f6, { rough: 0.6 }), [x, 0.4, 0], [0, 0, 0.3]);
  // the cupola: 7-window dome under the node (Gerald sits in it)
  const cu = new THREE.Group(); cu.position.set(0, -1.05, 2.4); cu.scale.setScalar(1.8); g.add(cu);
  add(cu, cyl(0.5, 0.55, 0.35, 7), mat(0xe8e8e8), [0, 0, 0]);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  add(cu, cyl(0.38, 0.5, 0.3, 7, 1, true), glassM, [0, -0.32, 0]); add(cu, cyl(0.3, 0.3, 0.02, 14), glassM, [0, -0.48, 0]);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; add(cu, box(0.05, 0.32, 0.05), mat(0xd8d8d8), [Math.cos(a) * 0.44, -0.32, Math.sin(a) * 0.44], [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]); }
  g.userData.cupola = cu; return g;
}
export function satellite(seed = 1, s = 1) {
  const r = rng(seed), g = new THREE.Group();
  add(g, rbox(0.8 * s, 0.9 * s, 0.8 * s, 0.05 * s), r() < 0.5 ? gold() : mat(0xe8e8ea, { metal: 0.3, rough: 0.4 }), [0, 0, 0]);
  for (const sd of [-1, 1]) { const w = wing(2.2 * s, 0.8 * s, 6, 2); w.rotation.x = Math.PI / 2; w.position.set(sd * 1.6 * s, 0, 0); g.add(w); add(g, cyl(0.03 * s, 0.03 * s, 0.4 * s, 6), mat(0x9a9aa2), [sd * 0.5 * s, 0, 0], [0, 0, Math.PI / 2]); }
  const dish = add(g, sph(0.45 * s, 20, 10, 0, Math.PI * 2, 0, 1.0), mat(0xf4f4f4, { rough: 0.4, side: THREE.DoubleSide }), [0, 0.55 * s, 0.1 * s], [Math.PI, 0, 0]); dish.scale.y = 0.4;
  add(g, cyl(0.02 * s, 0.02 * s, 0.4 * s, 6), mat(0x9a9aa2), [0, 0.65 * s, 0.1 * s]);
  return g;
}
// Voyager 1: high-gain dish (googly eyes on it), 10-sided bus, magnetometer boom, RTG boom, science boom
export function voyager1() {
  const g = new THREE.Group();
  const dish = new THREE.Group(); g.add(dish);
  const pts = []; for (let i = 0; i <= 12; i++) { const x = i / 12 * 1.85; pts.push(new THREE.Vector2(x, x * x * 0.18)); }
  add(dish, new THREE.LatheGeometry(pts, 40), mat(0xf2f0ea, { rough: 0.45, side: THREE.DoubleSide }), [0, 0, 0]);
  add(dish, cyl(0.04, 0.04, 1.0, 8), mat(0xc8c8c8), [0, 0.5, 0]); add(dish, cyl(0.12, 0.08, 0.15, 12), mat(0xe8e8e8), [0, 1.05, 0]);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; add(dish, cyl(0.015, 0.015, 1.4, 6), mat(0xc0c0c0), [Math.cos(a) * 0.7, 0.5, Math.sin(a) * 0.7], [Math.sin(a) * 0.95, 0, -Math.cos(a) * 0.95]); }
  // googly eyes on the dish face (look up at the hero): white balls + black pupils that wobble
  const eyes = []; for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(s * 0.55, 0.32, 0.35); dish.add(e); add(e, sph(0.32, 24, 18), mat(0xffffff, { rough: 0.3 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.55]); const p = add(e, sph(0.16, 18, 14), mat(0x111111, { rough: 0.2 }), [0, 0, 0.14], [0, 0, 0], [1, 1, 0.5]); eyes.push({ e, p }); }
  const bus = add(g, cyl(0.85, 0.85, 0.45, 10), gold(), [0, -0.3, 0]);
  add(g, cyl(0.86, 0.86, 0.05, 10), mat(0x6a5a3a, { metal: 0.6 }), [0, -0.08, 0]);
  add(g, cyl(0.03, 0.03, 6.5, 6), mat(0xd0d0d0), [3.2, -0.3, 0], [0, 0, Math.PI / 2]);   // magnetometer boom
  add(g, cyl(0.025, 0.025, 2.4, 6), mat(0xc8c8c8), [-1.6, -0.5, 0.6], [0, -0.35, Math.PI / 2 - 0.1]);   // RTG boom
  for (let i = 0; i < 3; i++) add(g, cyl(0.2, 0.2, 0.35, 8), mat(0x5a5a62, { metal: 0.6 }), [-2.0 - i * 0.38, -0.55, 0.75], [0, 0, Math.PI / 2]);
  add(g, cyl(0.03, 0.03, 2.2, 6), mat(0xc8c8c8), [-0.6, -0.4, -1.4], [Math.PI / 2 - 0.2, 0, 0.3]);   // science boom
  add(g, rbox(0.5, 0.35, 0.4, 0.04), mat(0x8a8a92, { metal: 0.6 }), [-0.9, -0.5, -2.3]);
  g.userData = { dish, eyes };
  g.look = (t, at = [0, 1]) => { eyes.forEach((o, i) => { o.p.position.x = Math.sin(t * 9 + i * 2) * 0.06 + at[0] * 0.08; o.p.position.y = Math.cos(t * 7 + i) * 0.05 + at[1] * 0.08; }); };
  return g;
}
// the Sun: emissive sphere with a cartoon face; sunglasses come down (setShades 0..1); open mouth 0..1
export function sunFace(R = 6) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false })); g.add(body);
  const corona = new THREE.Mesh(new THREE.SphereGeometry(R * 1.35, 32, 24), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); v = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 n; varying vec3 v; void main(){ float f = pow(abs(dot(n, v)), 2.5); gl_FragColor = vec4(vec3(1.0,0.6,0.15) * f * 1.2, 1.0); }' })); g.add(corona);
  const face = new THREE.Group(); face.position.z = R * 0.92; g.add(face);
  const dark = new THREE.MeshBasicMaterial({ color: 0x7a2a08 });
  const eyes = [-1, 1].map((s) => add(face, sph(R * 0.11, 16, 12), dark, [s * R * 0.32, R * 0.18, 0.1], [0, 0, 0], [1, 1.3, 0.4]));
  const mouth = add(face, sph(R * 0.2, 20, 14), dark, [0, -R * 0.32, 0.12], [0, 0, 0], [1.3, 0.3, 0.4]);
  for (const s of [-1, 1]) add(face, sph(R * 0.09, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff8a3a }), [s * R * 0.55, -R * 0.12, 0.05], [0, 0, 0], [1.3, 0.8, 0.3]);
  const shades = new THREE.Group(); face.add(shades);
  const lensM = new THREE.MeshStandardMaterial({ color: 0x08080c, metalness: 0.9, roughness: 0.1 });
  for (const s of [-1, 1]) add(shades, rbox(R * 0.48, R * 0.3, R * 0.06, R * 0.08), lensM, [s * R * 0.32, R * 0.18, R * 0.12]);
  add(shades, box(R * 0.24, R * 0.05, R * 0.05), lensM, [0, R * 0.26, R * 0.12]);
  for (const s of [-1, 1]) add(shades, box(R * 0.05, R * 0.05, R * 0.6), lensM, [s * R * 0.58, R * 0.24, -R * 0.15]);
  g.userData = { shades, mouth, eyes, body };
  g.setShades = (k) => { shades.position.y = (1 - k) * R * 1.6; shades.visible = k > 0.001; };
  g.setMouth = (k) => { mouth.scale.set(1.3 - 0.4 * k, 0.3 + 1.0 * k, 0.4); };
  g.setShades(0); g.setMouth(0);
  return g;
}
// banded gas giant: vertex colours by latitude (no texture) + optional storm spot
export function bandedPlanet(R = 5, bands = [0xe8d0a8, 0xc89a6a, 0xf2e2c4, 0xb8845a, 0xe8c89a, 0xd8b088, 0xf0e0c8], { spot = 0xc8603a, seed = 4 } = {}) {
  const geo = new THREE.SphereGeometry(R, 64, 48), col = [], c = new THREE.Color(), r = rng(seed), p = geo.attributes.position;
  const edges = bands.map((_, i) => -1 + 2 * (i + 1) / bands.length + (r() - 0.5) * 0.08);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / R, x = p.getX(i), z = p.getZ(i), wob = Math.sin(Math.atan2(z, x) * 5 + y * 9) * 0.02; let k = 0; while (k < bands.length - 1 && y + wob > edges[k]) k++; c.set(bands[k]); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const g = new THREE.Group(); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })); g.add(m);
  if (spot) add(g, sph(R * 0.16, 24, 16), mat(spot, { rough: 0.8 }), [R * 0.62, -R * 0.32, R * 0.68], [0, 0.75, 0], [1.6, 0.8, 0.35]);
  g.userData.body = m; return g;
}
export function saturn(R = 4) {
  const g = bandedPlanet(R, [0xf0dcaa, 0xe0c890, 0xf4e6c0, 0xd8b880, 0xeedcb0], { spot: null, seed: 9 });
  const rings = [[1.25, 1.55, 0xd8c8a0], [1.58, 1.95, 0xe8dcc0], [2.0, 2.05, 0x5a5040], [2.08, 2.35, 0xc8b890]];
  for (const [a, b, c] of rings) { const m = new THREE.Mesh(new THREE.RingGeometry(R * a, R * b, 128, 1), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9, transparent: true, opacity: 0.92 })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; g.add(m); }
  g.userData.ringR = R * 1.8; return g;
}
export function icyRock(seed = 1, s = 1) {
  const r = rng(seed), geo = new THREE.IcosahedronGeometry(s, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.75 + r() * 0.45; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); }
  geo.computeVertexNormals(); return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: r() < 0.5 ? 0xbfd6e8 : 0x9aaabb, roughness: 0.6, flatShading: true }));
}
export function comet(s = 1) {
  const g = new THREE.Group(); const head = icyRock(77, 0.8 * s); g.add(head);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.1 * s, 9 * s, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  tail.rotation.z = Math.PI / 2; tail.position.x = -4.6 * s; g.add(tail);
  const coma = new THREE.Mesh(new THREE.SphereGeometry(1.2 * s, 20, 14), new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); g.add(coma);
  g.userData.head = head; return g;
}
// pillar of gas and dust (Orion): stacked lumpy spheres with warm rim colour, a flat top for the picnic
export function nebulaPillar(h = 14, seed = 3) {
  const r = rng(seed), g = new THREE.Group();
  for (let i = 0; i < 26; i++) { const u = i / 25, rad = 2.6 * (1 - u * 0.55) + r() * 0.6; const m = add(g, sph(rad, 18, 14), mat(u > 0.85 ? 0x6a3a5a : shade(0x5a2a40, 0.8 + r() * 0.4), { rough: 1, emissive: 0x401020, emissiveIntensity: 0.3 }), [r.range(-0.8, 0.8) * (1 - u), u * h, r.range(-0.8, 0.8) * (1 - u)]); m.scale.y = 0.8; }
  add(g, cyl(1.9, 2.3, 0.6, 24), mat(0x6a3a5a, { rough: 1 }), [0, h + 0.2, 0]);
  g.userData.top = h + 0.5; return g;
}
export function picnicBlanket(w = 2.0, d = 1.6) { const g = new THREE.Group(), n = 8, m = 6; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) add(g, box(w / n, 0.02, d / m), mat((i + j) % 2 ? 0xffffff : 0xd9262c, { rough: 1 }), [-w / 2 + (i + 0.5) * w / n, 0.01, -d / 2 + (j + 0.5) * d / m]); add(g, rbox(0.5, 0.3, 0.35, 0.05), mat(0xb8864a, { rough: 0.9 }), [w * 0.3, 0.17, -d * 0.25]); add(g, cyl(0.12, 0.12, 0.05, 16), mat(0xffffff), [-w * 0.2, 0.05, 0.1]); add(g, sph(0.08, 12, 10), mat(0x9ad040), [-w * 0.2, 0.12, 0.1]); return g; }
export function telescope() { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; add(g, cyl(0.02, 0.02, 1.0, 6), mat(0x5a3a22), [Math.cos(a) * 0.25, 0.45, Math.sin(a) * 0.25], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]); } const tube = new THREE.Group(); tube.position.y = 0.95; g.add(tube); add(tube, cyl(0.07, 0.09, 0.9, 16), mat(0xd8a832, { metal: 0.7, rough: 0.3 }), [0, 0.2, 0], [0.9, 0, 0]); add(tube, cyl(0.1, 0.1, 0.06, 16), mat(0x2a2a30), [0, 0.53, 0.37], [0.9, 0, 0]); g.userData.tube = tube; return g; }
export function tinyPlanet(R = 2.4, color = 0x6a5aa8, seed = 6) { const g = new THREE.Group(), r = rng(seed); add(g, sph(R, 48, 32), mat(color, { rough: 0.9 }), [0, 0, 0]); for (let i = 0; i < 14; i++) { const v = new THREE.Vector3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize(); add(g, sph(R * r.range(0.08, 0.2), 14, 10), mat(shade(color, 0.7), { rough: 1 }), v.clone().multiplyScalar(R * 0.97).toArray(), [0, 0, 0], [1, 0.35, 1]).lookAt(v.clone().multiplyScalar(R * 2)); } return g; }
export function moonFlag() { const g = new THREE.Group(); add(g, cyl(0.02, 0.02, 1.6, 8), mat(0xdddddd, { metal: 0.6 }), [0, 0.8, 0]); add(g, box(0.9, 0.02, 0.02), mat(0xdddddd), [0.45, 1.58, 0]); const f = new THREE.Group(); f.position.set(0.45, 1.33, 0); g.add(f); for (let i = 0; i < 7; i++) add(f, box(0.9, 0.07, 0.01), mat(i % 2 ? 0xffffff : 0xd9262c), [0, 0.21 - i * 0.07, 0]); add(f, box(0.38, 0.24, 0.012), mat(0x2a3a8a), [-0.26, 0.12, 0.002]); return g; }
// airliner nose with a cockpit you can see into: the sphere cap is built in pieces leaving a windscreen opening (glass over it).
// pilot seat at userData.seat (faces +Z). Nose points +Z.
export function cockpitNose(R = 1.9) {
  const g = new THREE.Group(), skin = mat(0xf4f6fa, { rough: 0.35, metal: 0.15, side: THREE.DoubleSide });
  add(g, cyl(R, R, 10, 40, 1, true), skin, [0, 0, -5], [Math.PI / 2, 0, 0]);
  const nose = new THREE.Group(); nose.scale.set(1, 1, 1.4); g.add(nose);
  const ta = Math.acos(0.86), tb = Math.acos(0.28), w = 0.62, P2 = Math.PI / 2;
  const piece = (ps, pl, ts, tl, m = skin) => { const geo = new THREE.SphereGeometry(R, 48, 32, ps, pl, ts, tl); const mesh = new THREE.Mesh(geo, m); nose.add(mesh); return mesh; };
  // only the front half (z > 0): phi in [0, PI] covers z >= 0
  piece(0, Math.PI, 0, ta); piece(0, Math.PI, tb, Math.PI - tb);
  piece(0, P2 - w, ta, tb - ta); piece(P2 + w, Math.PI - (P2 + w), ta, tb - ta);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xa8d8ff, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const gl = piece(P2 - w, 2 * w, ta, tb - ta, glassM); gl.scale.setScalar(1.002);
  // window frame bars
  for (const a of [P2 - w, P2 - w / 3, P2 + w / 3, P2 + w]) { const geo = new THREE.SphereGeometry(R * 1.006, 4, 12, a - 0.025, 0.05, ta, tb - ta); nose.add(new THREE.Mesh(geo, mat(0x22252c))); }
  add(g, box(2 * R - 0.05, 0.22, 10), mat(0x2f6fd6, { rough: 0.4 }), [0, -0.35, -5]);   // cheat line
  add(g, rbox(1.5, 0.35, 0.5, 0.05), mat(0x2a2d36), [0, 0.05, 1.55]);   // instrument panel
  add(g, box(2 * R - 0.2, 0.05, 6), mat(0x3a3d46), [0, -0.5, -1.5]);  // cockpit floor
  add(g, rbox(0.6, 0.9, 0.2, 0.06), mat(0x3a3a48), [0, -0.1, 0.2]);   // seat back
  g.userData.seat = new THREE.Vector3(0.0, -0.5, 0.55); return g;
}
