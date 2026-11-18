// Theatre / talent-show props: velvet curtains, seat rows, audience crowd (instanced), judges' table, scoreboard, spotlights, marquee bulbs.
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, cap, cone, tor, rbox, rng, textBoard, canvasTex, C } from '../util.js';

export function curtain(w = 3, h = 6, color = 0xa3162b, folds = 9) {
  const g = new THREE.Group(); const m = mat(color, { rough: 0.7 });
  for (let i = 0; i < folds; i++) { const x = -w / 2 + (i + 0.5) * (w / folds); add(g, cap(w / folds * 0.62, h - w / folds * 1.2, 6, 14), m, [x, h / 2, (i % 2) * 0.12]); }
  return g;
}
export function velvetStage(w = 12, d = 6) {
  const g = new THREE.Group();
  add(g, box(w, 0.5, d), mat(0x7a4a2a, { rough: 0.55 }), [0, 0.25, 0]);                                                   // stage
  const star = canvasTex(256, 256, (c, ww, hh) => { c.fillStyle = '#6b3d22'; c.fillRect(0, 0, ww, hh); c.strokeStyle = 'rgba(255,220,150,0.25)'; c.lineWidth = 3; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, hh); c.stroke(); } });
  add(g, box(w - 0.2, 0.02, d - 0.2), new THREE.MeshStandardMaterial({ map: star, roughness: 0.4 }), [0, 0.51, 0]);
  add(g, box(w + 0.4, 0.14, 0.3), mat(C.gold, { metal: 0.8, rough: 0.3 }), [0, 0.57, d / 2 - 0.1]);                         // front lip
  return g;
}
export function marquee(w = 7, cols = 14, bulb = 0xfff0b0) { // row of lit bulbs on a gold arch bar
  const g = new THREE.Group(); add(g, box(w, 0.35, 0.18), mat(C.gold, { metal: 0.7, rough: 0.3 }), [0, 0, 0]);
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: bulb, toneMapped: false }), cols); const d = new THREE.Object3D();
  for (let i = 0; i < cols; i++) { d.position.set(-w / 2 + 0.3 + i * ((w - 0.6) / (cols - 1)), 0, 0.12); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } g.add(im);
  g.bulbs = im; return g;
}
// Instanced theatre seats: rows x cols, tiered. Returns {mesh, seatPos[]}
export function seatRows(rows = 8, cols = 14, { gap = 0.75, rowGap = 1.0, rise = 0.22, color = 0xa3162b } = {}) {
  const g = new THREE.Group(); const n = rows * cols;
  const seat = new THREE.InstancedMesh(rbox(0.6, 0.12, 0.55, 0.05), mat(color, { rough: 0.7 }), n), back = new THREE.InstancedMesh(rbox(0.6, 0.6, 0.1, 0.05), mat(color, { rough: 0.7 }), n);
  const d = new THREE.Object3D(), pos = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, x = (c - (cols - 1) / 2) * gap, y = r * rise, z = -r * rowGap; pos.push([x, y, z]);
    d.rotation.set(0, 0, 0); d.position.set(x, y + 0.45, z); d.updateMatrix(); seat.setMatrixAt(i, d.matrix);
    d.position.set(x, y + 0.8, z - 0.27); d.rotation.set(-0.1, 0, 0); d.updateMatrix(); back.setMatrixAt(i, d.matrix);
  }
  seat.castShadow = back.castShadow = true; seat.receiveShadow = back.receiveShadow = true; g.add(seat, back);
  g.seatPos = pos; return g;
}
// Cheap instanced audience seated in the rows. update(t, cheer 0..1, seed) animates arms-up bobbing.
export function audience(seatPos, { seed = 5, fill = 0.9, palette = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x264653, 0xf4a261, 0x7b2cbf, 0x3a86ff, 0xff006e, 0x8bc34a], skins = [0xf2b98f, 0xd99a6c, 0x9b6338, 0x6b4226, 0xf8d5b8] } = {}) {
  const r = rng(seed), g = new THREE.Group(), idx = []; seatPos.forEach((p, i) => { if (r() < fill) idx.push(i); });
  const n = idx.length;
  const bodyI = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.2, 4, 10), new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
  const headI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n);
  const armI = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.055, 0.28, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.7 }), n * 2);
  const hairI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ roughness: 0.7 }), n);
  const col = new THREE.Color(); const S = [];
  idx.forEach((si, k) => { const c1 = r.pick(palette), sk = r.pick(skins), hc = r.pick([0x15100c, 0x3a2a1a, 0x6a4a28, 0xc9a24a, 0x8a8a92, 0x15100c]); col.set(c1); bodyI.setColorAt(k, col); col.set(sk); headI.setColorAt(k, col); armI.setColorAt(k * 2, col); armI.setColorAt(k * 2 + 1, col); col.set(hc); hairI.setColorAt(k, col); S.push({ si, ph: r() * 6.28, sp: r.range(0.8, 1.2), s: r.range(0.9, 1.1), bald: r() < 0.1 }); });
  const d = new THREE.Object3D();
  g.update = (t, cheer = 0, hold = 0) => {
    S.forEach((s, k) => {
      const [x, y, z] = seatPos[s.si], bob = Math.sin(t * 9 * s.sp + s.ph) * 0.5 + 0.5, up = cheer * (0.6 + 0.4 * bob);
      d.rotation.set(0, 0, 0); d.scale.setScalar(s.s);
      d.position.set(x, y + 0.85 + up * 0.08, z); d.updateMatrix(); bodyI.setMatrixAt(k, d.matrix);
      d.position.set(x, y + 1.28 + up * 0.1, z); d.updateMatrix(); headI.setMatrixAt(k, d.matrix);
      d.position.set(x, y + 1.3 + up * 0.1, z - 0.01); d.rotation.set(-0.25, 0, 0); d.scale.set(s.s, s.bald ? 0.0001 : s.s, s.s); d.updateMatrix(); hairI.setMatrixAt(k, d.matrix);
      for (const sd of [-1, 1]) { d.scale.setScalar(s.s); d.position.set(x + sd * 0.27, y + 1.0 + up * 0.35, z + 0.02); d.rotation.set(0, 0, -sd * (0.15 + up * 2.6) * 0.5 - 0.0 * sd); d.updateMatrix(); armI.setMatrixAt(k * 2 + (sd > 0 ? 1 : 0), d.matrix); }
    });
    for (const m of [bodyI, headI, armI, hairI]) m.instanceMatrix.needsUpdate = true;
  };
  g.add(bodyI, headI, armI, hairI); g.count = n; g.update(0);
  return g;
}
export function judgesTable(w = 6) { const g = new THREE.Group(); add(g, rbox(w, 0.08, 1.0, 0.04), mat(0x2a1a14, { rough: 0.35 }), [0, 0.88, 0]); add(g, rbox(w, 0.85, 0.12, 0.03), mat(0x3a2418, { rough: 0.45 }), [0, 0.42, 0.45]); add(g, box(w + 0.1, 0.05, 1.05), mat(C.gold, { metal: 0.8 }), [0, 0.9, 0]); return g; }
export function spotlightBeam(color = 0xfff4cc, h = 9, r = 1.6) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r, h, 28, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })); m.position.y = h / 2; m.castShadow = false; return m; }
export function scoreboard(lines, { w = 3.2, h = 1.9 } = {}) { const b = textBoard(w, h, lines, { bg: '#10163a', border: '#ffd23f' }); return b; }
export function confettiCannon() { const g = new THREE.Group(); add(g, cyl(0.12, 0.17, 0.7, 14), mat(0xff3f7f, { rough: 0.4 }), [0, 0.35, 0], [0, 0, -0.25]); add(g, tor(0.13, 0.02, 6, 16), mat(0xffd23f), [-0.045, 0.7, 0], [Math.PI / 2, 0, -0.25]); return g; }
