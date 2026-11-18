// Golden-hour hilltop: rolling terrain, rounded trees (instanced), flowers, distant town. update(waveR) bends trees as the love-wave passes.
import * as THREE from 'three';
import { mat, add, sph, cyl, rng, C } from '../util.js';
export const HILL_STAGE = { sky: ['#6a3a9a', '#ffb060', '#ff8a5a'], ground: null, fog: ['#ffb27a', 40, 200], hemiSky: 0xffc8a0, hemiGround: 0x7a5a3a, hemiI: 1.0, key: 0xffb070, keyI: 2.6, keyPos: [-10, 5, 8], shadow: { extent: 20 } };
export const hillH = (x, z) => 3.2 * Math.exp(-((x * x + z * z) / 520)) + 0.9 * Math.sin(x * 0.07 + 1) * Math.cos(z * 0.06) + 0.6 * Math.sin(z * 0.11) - 0.0;
export function buildHilltop({ seed = 4, trees = 90, R = 90 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const geo = new THREE.CircleGeometry(R, 96, 0, Math.PI * 2); geo.rotateX(-Math.PI / 2);
  // add rings of vertices by using a plane instead for better tessellation
  const pl = new THREE.PlaneGeometry(R * 2, R * 2, 140, 140); pl.rotateX(-Math.PI / 2); const p = pl.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = hillH(x, z); p.setY(i, h); const k = Math.min(1, Math.max(0, h / 4)); const c = new THREE.Color().setRGB(0.16 + 0.1 * k, 0.5 + 0.12 * k, 0.12 + 0.04 * k); col.set([c.r, c.g, c.b], i * 3); }
  pl.setAttribute('color', new THREE.BufferAttribute(col, 3)); pl.computeVertexNormals();
  const ground = new THREE.Mesh(pl, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); ground.receiveShadow = true; g.add(ground);
  // instanced trees: trunk + 3 blobs
  const T = []; for (let i = 0; i < trees; i++) { const a = r() * 6.283, d = r.range(9, R * 0.7); const x = Math.cos(a) * d, z = Math.sin(a) * d; T.push({ x, z, y: hillH(x, z), s: r.range(0.8, 1.6), a, d }); }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1.6, 8), mat(0x6a4a2e), trees), leaf = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), mat(0x4a9a3a, { rough: 0.9 }), trees * 3);
  trunk.castShadow = leaf.castShadow = true;
  const col2 = new THREE.Color(); for (let i = 0; i < trees * 3; i++) { col2.setHSL(0.27 + r.range(-0.03, 0.04), 0.5, r.range(0.28, 0.4)); leaf.setColorAt(i, col2); }
  g.add(trunk, leaf);
  const d = new THREE.Object3D();
  const place = (waveR = -999, time = 0) => {
    T.forEach((t, i) => {
      const k = Math.max(0, 1 - Math.abs(t.d - waveR) / 6), bend = k * 1.15 * Math.sin(Math.min(1, k) * 1.6), flat = waveR > t.d ? Math.exp(-(waveR - t.d) / 14) * 0.35 : 0;
      const sway = Math.sin(time * 1.5 + i) * 0.015; const tilt = bend + flat * 0 + sway;
      const dx = Math.cos(t.a), dz = Math.sin(t.a);
      const place1 = (mesh, idx, ox, oy, sc) => { d.position.set(t.x + dx * Math.sin(tilt) * oy * t.s + ox, t.y + Math.cos(tilt) * oy * t.s, t.z + dz * Math.sin(tilt) * oy * t.s); d.rotation.set(dz * tilt, 0, -dx * tilt); d.scale.set(...sc.map((q) => q * t.s)); d.updateMatrix(); mesh.setMatrixAt(idx, d.matrix); };
      place1(trunk, i, 0, 0.8, [1, 1, 1]); place1(leaf, i * 3, 0, 2.4, [1.0, 1.0, 1.0]); place1(leaf, i * 3 + 1, 0.6, 1.9, [0.7, 0.7, 0.7]); place1(leaf, i * 3 + 2, -0.6, 1.8, [0.75, 0.75, 0.75]);
    });
    trunk.instanceMatrix.needsUpdate = true; leaf.instanceMatrix.needsUpdate = true;
  };
  place();
  // flowers
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 6, 5), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 400); const fc = new THREE.Color();
  for (let i = 0; i < 400; i++) { const a = r() * 6.283, dd = r.range(2, 40); const x = Math.cos(a) * dd, z = Math.sin(a) * dd; d.position.set(x, hillH(x, z) + 0.1, z); d.scale.setScalar(r.range(0.8, 1.5)); d.rotation.set(0, 0, 0); d.updateMatrix(); fl.setMatrixAt(i, d.matrix); fc.set(r.pick([0xff5c8a, 0xffd23f, 0xffffff, 0xb07aff, 0xff8a2b])); fl.setColorAt(i, fc); }
  g.add(fl);
  // distant town
  const town = new THREE.Group(); for (let i = 0; i < 40; i++) { const x = -40 + (i % 8) * 6 + r.range(-1, 1), z = -70 - Math.floor(i / 8) * 6 + r.range(-1, 1); const h = new THREE.Group(); add(h, new THREE.BoxGeometry(2.4, 1.8, 2.4), mat(r.pick([0xf0d8b0, 0xf4b8a8, 0xbfe0c8, 0xf6e2a0])), [0, 0.9, 0]); add(h, new THREE.ConeGeometry(2, 1.3, 4), mat(0xb4503a), [0, 2.4, 0], [0, Math.PI / 4, 0]); h.position.set(x, hillH(x, z) * 0 - 0.2, z); town.add(h); } g.add(town);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false })); sun.position.set(-60, 14, -120); g.add(sun);
  return { group: g, update: (waveR, t = 0) => place(waveR, t), trees: T };
}
