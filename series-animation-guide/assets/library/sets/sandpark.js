// Park sand pit: a round sand play area with a diggable hole (heightfield updated from a 0..1 dig amount), a concrete kerb,
// grass + trees around it, a bench and a few toys. Geometry + vertex colours only (no textures).
//   const sp = buildSandPark(); scene.add(sp.group); sp.dig(k);   // k 0..1: the hole grows forward (+Z) under whoever sits at the origin
//   sp.heightAt(x, z) -> ground height (after the last dig()), sp.PIT = hole description
// Stage preset: SANDPARK_STAGE. First used in episode 4.
import * as THREE from 'three';
import { mat, add, rbox, cyl, smooth, clamp, rng } from '../util.js';
import { groundCover, treeLine, rock } from '../props/nature.js';
import { sandBucket, toyShovel } from '../props/beach.js';

export const SANDPARK_STAGE = { sky: ['#a9d4f5', '#f4ead6'], hemiSky: 0xe6f0ff, hemiGround: 0xc9a46e, hemiI: 1.0, keyI: 2.2, keyPos: [5, 9, 6], fillI: 0.75, ground: null, shadow: { extent: 6, size: 2048 } };   // the set brings its own lawn (a ring, so the pit stays open)

export const PIT = { x: 0, z: -0.5, rx: 0.42, rz0: 0.32, grow: 0.25, depth: 0.42 };   // grows forward by `grow` and back stays put
const SAND = new THREE.Color(0xdcb57c), DAMP = new THREE.Color(0x9c7646), SAND_DK = new THREE.Color(0xcaa068);

function pitDepth(x, z, k) {
  const rz = PIT.rz0 + PIT.grow * k, cz = PIT.z + PIT.grow * k * 0.8;
  const ex = (x - PIT.x) / PIT.rx, ez = (z - cz) / rz, r = Math.hypot(ex, ez);
  const hole = PIT.depth * smooth((1 - r) / 0.32) * (0.92 + 0.08 * Math.cos(ex * 2) * Math.cos(ez * 2));
  const rim = 0.055 * Math.exp(-(((r - 1.18) / 0.16) ** 2)) * (1 - 0.5 * Math.max(0, ez));   // dug sand piled round the edge (less at the front)
  return { hole, rim, r };
}
const bumps = (x, z) => 0.014 * Math.sin(x * 3.1 + 0.4) * Math.cos(z * 2.7) + 0.008 * Math.sin(x * 7.3 + z * 5.1) + 0.006 * Math.cos(x * 11 - z * 9);
const pile = (x, z, k) => (0.1 + 0.08 * k) * Math.exp(-(((x + 0.7) / 0.28) ** 2 + ((z + 0.75) / 0.24) ** 2));   // on the digger's right (-X)   // shovelled pile beside the digger

export function buildSandPark({ R = 5.2 } = {}) {
  const group = new THREE.Group(), r = rng(41);
  // sand heightfield (circle of radius R, dense near the pit)
  const N = 230, geo = new THREE.PlaneGeometry(2 * R, 2 * R, N, N); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const near = [];   // vertex indices around the pit (only these change when digging)
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); if (Math.abs(x) < 1.4 && z > -1.8 && z < 1.0) near.push(i); }
  const sand = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); sand.receiveShadow = true; sand.castShadow = false;
  sand.position.y = 0.0; group.add(sand);
  const c = new THREE.Color();
  const setV = (i, k) => {
    const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z);
    const edge = smooth((R - d) / 0.25);   // sand dips to the kerb line
    const p = pitDepth(x, z, k), y = (0.06 + bumps(x, z) + p.rim + pile(x, z, k)) * edge - p.hole - 0.04 * (1 - edge);   // outside the kerb the sand sinks under the lawn
    pos.setY(i, y);
    c.copy(SAND).lerp(SAND_DK, clamp(0.5 + bumps(x, z) * 30)).lerp(DAMP, clamp(p.hole / PIT.depth * 1.6));
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  };
  for (let i = 0; i < pos.count; i++) setV(i, 0);
  geo.computeVertexNormals();
  let lastK = 0;
  const dig = (k) => { k = clamp(k, 0, 1.6); /* > 1 = the ledge caves in (collapse) */ if (Math.abs(k - lastK) < 1e-4) return; lastK = k; for (const i of near) setV(i, k); pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals(); };
  const heightAt = (x, z) => { const d = Math.hypot(x, z), edge = smooth((R - d) / 0.25), p = pitDepth(x, z, lastK); return (0.06 + bumps(x, z) + p.rim + pile(x, z, lastK)) * edge - p.hole; };

  // lawn around the sand (ring: nothing covers the pit)
  const lawn = add(group, new THREE.RingGeometry(R - 0.05, 70, 96, 1), mat(0x6aa84f, { rough: 0.95 }), [0, 0.001, 0], [-Math.PI / 2, 0, 0]); lawn.receiveShadow = true; lawn.castShadow = false;
  // concrete kerb ring
  const kerbM = mat(0xc9c4ba, { rough: 0.9 }), segs = 40;
  for (let i = 0; i < segs; i++) { const a = i / segs * Math.PI * 2, b = add(group, rbox(2 * Math.PI * R / segs * 1.02, 0.16, 0.24, 0.03), kerbM, [Math.cos(a) * (R + 0.1), 0.06, Math.sin(a) * (R + 0.1)], [0, -a + Math.PI / 2, 0]); b.castShadow = true; b.receiveShadow = true; }
  // grass, trees, rocks outside the pit
  group.add(groundCover({ area: [-16, -16, 16, 16], clear: [{ x: 0, z: 0, r: R + 0.3 }], density: 3.5, scale: 0.6, seed: 44 }));
  const tl = []; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2 + r() * 0.1, d = 10 + r() * 4; tl.push([Math.cos(a) * d, Math.sin(a) * d]); }
  group.add(treeLine(tl, { seed: 47, scale: 1.3, kinds: ['round', 'round', 'birch'] }));
  for (const [x, z, s] of [[-6.4, 2.5, 0.5], [6.8, -1.5, 0.4], [-5.8, -4.6, 0.6]]) { const k = rock({ seed: Math.round(x * 10), size: s }); k.position.set(x, 0, z); group.add(k); }
  // park bench outside the kerb
  const bench = new THREE.Group(), wood = mat(0x9a6a3e, { rough: 0.8 }), iron = mat(0x3a3d44, { rough: 0.5, metal: 0.4 });
  for (let i = 0; i < 3; i++) add(bench, rbox(1.6, 0.04, 0.12, 0.01), wood, [0, 0.45, -0.14 + i * 0.14]);
  for (let i = 0; i < 2; i++) add(bench, rbox(1.6, 0.1, 0.03, 0.01), wood, [0, 0.62 + i * 0.13, -0.26], [-0.15, 0, 0]);
  for (const s of [-1, 1]) { add(bench, rbox(0.05, 0.45, 0.4, 0.01), iron, [s * 0.7, 0.225, -0.05]); add(bench, rbox(0.05, 0.4, 0.05, 0.01), iron, [s * 0.7, 0.62, -0.27]); }
  bench.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  bench.position.set(-2.4, 0, -6.4); group.add(bench);
  // toys left in the sand
  const bucket = sandBucket(); bucket.position.set(0.95, 0.04, 0.55); bucket.rotation.y = 0.5; group.add(bucket);
  const spare = toyShovel(0x2f9be0); spare.position.set(-1.3, 0.08, 1.0); spare.rotation.set(Math.PI / 2, 0, 1.1); group.add(spare);
  const bucket2 = sandBucket(0xff7ab0); bucket2.position.set(-2.2, 0.05, -1.5); bucket2.rotation.set(0, 0, 1.4); bucket2.position.y = 0.15; group.add(bucket2);
  for (const o of [bucket, spare, bucket2]) o.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group, dig, heightAt, sand, anchors: { bucket } };
}
