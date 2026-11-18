// Sky props: puffy clouds, cloud floor, hot-air balloon, airliner (exterior + cabin window wall), parachute canopy, rainbow, sun, birds.
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, cap, cone, tor, rbox, rng, canvasTex, C } from '../util.js';

export function cloud(r = rng(1), s = 1, color = 0xffffff) {
  const g = new THREE.Group(), m = mat(color, { rough: 1, emissive: 0xdfeeff, emissiveIntensity: 0.25 });
  const n = 6 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) { const x = (i - n / 2) * 0.55 * s + r.range(-0.15, 0.15), rr = (0.55 + r() * 0.35) * s * (1 - Math.abs(i - n / 2) / n * 0.7); add(g, sph(rr, 16, 12), m, [x, rr * 0.3 + r() * 0.2 * s, r.range(-0.3, 0.3) * s]); }
  g.children.forEach((c) => (c.castShadow = false));
  return g;
}
// Instanced cloud floor: puffs scattered over a disc at y=0
export function cloudFloor(count = 260, radius = 60, seed = 4, color = 0xffffff) {
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), mat(color, { rough: 1, emissive: 0xcfe4ff, emissiveIntensity: 0.3 }), count), d = new THREE.Object3D(), r = rng(seed);
  for (let i = 0; i < count; i++) { const a = r() * 6.283, rr = Math.sqrt(r()) * radius; d.position.set(Math.cos(a) * rr, r.range(-0.6, 0.4), Math.sin(a) * rr); d.scale.set(r.range(2.5, 6), r.range(1.2, 2.4), r.range(2.5, 6)); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  im.castShadow = false; im.receiveShadow = false; return im;
}
export function hotAirBalloon({ colors = [0xe53935, 0xffd23f, 0x2f6fd6], s = 1 } = {}) {
  const g = new THREE.Group();
  const tex = canvasTex(256, 64, (c, w, h) => { const n = 12; for (let i = 0; i < n; i++) { c.fillStyle = '#' + colors[i % colors.length].toString(16).padStart(6, '0'); c.fillRect(i * w / n, 0, w / n + 1, h); } });
  const env = add(g, sph(1.5 * s, 36, 28), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), [0, 3.1 * s, 0], [0, 0, 0], [1, 1.2, 1]);
  add(g, cone(0.4 * s, 0.9 * s, 12), mat(colors[0]), [0, 1.2 * s, 0], [Math.PI, 0, 0]);
  const basket = add(g, rbox(0.9 * s, 0.6 * s, 0.9 * s, 0.06), mat(0xb98a54, { rough: 0.9 }), [0, 0.0, 0]);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; add(g, cyl(0.012, 0.012, 1.7 * s, 4), mat(0x6a5a40), [Math.cos(a) * 0.38 * s, 0.9 * s, Math.sin(a) * 0.38 * s], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]); }
  add(g, cone(0.08 * s, 0.22 * s, 8), glow(0xffa030, 1.4), [0, 0.7 * s, 0]);
  g.basketTop = new THREE.Vector3(0, 0.3 * s, 0); return g;
}
export function airliner(s = 1) {
  const g = new THREE.Group(), w = mat(0xf4f6fa, { rough: 0.35 });
  add(g, cap(0.55 * s, 5 * s, 10, 24), w, [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(g, cone(0.5 * s, 0.9 * s, 20), mat(0x2f6fd6), [0, 0, 3.2 * s], [Math.PI / 2, 0, 0], [1, 1, 1]);
  for (const sd of [-1, 1]) { add(g, box(3.4 * s, 0.1 * s, 1.2 * s), w, [sd * 2.1 * s, -0.15 * s, 0.4 * s], [0, sd * -0.45, sd * 0.06]); add(g, cyl(0.2 * s, 0.2 * s, 0.9 * s, 14), mat(0x9aa4b4, { metal: 0.6 }), [sd * 1.6 * s, -0.5 * s, 0.9 * s], [Math.PI / 2, 0, 0]); add(g, box(1.3 * s, 0.08 * s, 0.6 * s), w, [sd * 0.8 * s, 0.1 * s, -2.7 * s], [0, sd * -0.4, 0]); }
  add(g, box(0.08 * s, 1.1 * s, 0.9 * s), mat(0x2f6fd6), [0, 0.8 * s, -2.7 * s], [-0.3, 0, 0]);
  for (let i = 0; i < 14; i++) for (const sd of [-1, 1]) add(g, rbox(0.12 * s, 0.17 * s, 0.03, 0.04), mat(0x35506a), [sd * 0.55 * s, 0.16 * s, (i - 6) * 0.26 * s + 0.2 * s], [0, Math.PI / 2, 0]);
  return g;
}
// Cabin wall segment facing +Z: curved panel with N oval windows (clear glass through which the sky shows) + seat backs below. Passengers added by caller.
export function cabinWall(n = 3, w = 5, h = 3) {
  const g = new THREE.Group();
  add(g, box(w, h, 0.2), mat(0xe9e6df, { rough: 0.7 }), [0, h / 2, -0.15]);
  for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * (w / n); const ring = add(g, tor(0.42, 0.06, 8, 28), mat(0xcfd2d8), [x, h * 0.62, 0.0], [0, 0, 0], [0.8, 1, 1]); add(g, sph(0.4, 20, 14), mat(0x8fd0ff, { emissive: 0x6fb8ff, emissiveIntensity: 0.9, rough: 0.1 }), [x, h * 0.62, -0.05], [0, 0, 0], [0.78, 1, 0.1]); }
  add(g, box(w, 0.25, 0.3), mat(0x2f3a55), [0, 0.12, 0]);
  return g;
}
export function parachuteCanopy(colors = [0xff6a2b, 0xffffff], s = 1) { const g = new THREE.Group(); const tex = canvasTex(128, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = '#' + colors[i % colors.length].toString(16).padStart(6, '0'); c.fillRect(i * w / 8, 0, w / 8 + 1, h); } }); add(g, sph(1.1 * s, 28, 14, 0, 6.283, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.7 }), [0, 1.6 * s, 0], [0, 0, 0], [1, 0.8, 1]); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; add(g, cyl(0.006, 0.006, 1.7 * s, 3), mat(0x333333), [Math.cos(a) * 0.55 * s, 0.85 * s, Math.sin(a) * 0.55 * s], [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]); } return g; }
export function rainbow(R = 8, w = 1.2) { const g = new THREE.Group(); const cols = [0xff4a4a, 0xff9a3a, 0xffe14a, 0x4acb6a, 0x4a9aff, 0x7a5aff]; cols.forEach((c, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(R - i * w * 0.18, w * 0.1, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); g.add(t); }); return g; }
export function sunDisc(r = 3) { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff0b0, toneMapped: false })); g.add(m); const tex = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,180,0.9)'); gr.addColorStop(1, 'rgba(255,220,140,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sp.scale.setScalar(r * 6); g.add(sp); return g; }
export function bird() { const g = new THREE.Group(); for (const s of [-1, 1]) add(g, cone(0.05, 0.3, 3), mat(0x333333), [s * 0.14, 0, 0], [0, 0, -s * 1.35], [1, 1, 0.2]); return g; }
