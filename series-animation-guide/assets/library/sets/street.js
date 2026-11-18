// Street of terraced houses with road, pavement, lamps, cars, postbox, bunting. Road runs along X at z in [-1.5, 5]; houses on both sides.
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, cap, rng, canvasTex, C } from '../util.js';
import { houseFront, tree, lamppost, trashCan } from '../props/home.js';
import { bunting } from '../props/home.js';
import { car, iceCreamTruck } from '../props/world.js';

export function postbox() { const g = new THREE.Group(); add(g, cyl(0.28, 0.28, 0.9, 16), mat(0xd9262c, { rough: 0.35 }), [0, 0.45, 0]); add(g, sph(0.28, 16, 10, 0, 6.283, 0, 1.57), mat(0xd9262c, { rough: 0.35 }), [0, 0.9, 0]); add(g, box(0.3, 0.05, 0.12), mat(0x111111), [0, 0.7, 0.27]); add(g, cyl(0.285, 0.285, 0.06, 16), mat(0xffd23f), [0, 0.55, 0]); return g; }
export function mailSack(full = 1) { const g = new THREE.Group(); add(g, sph(0.4, 18, 14), mat(0xb89a6a, { rough: 0.95 }), [0, 0.38, 0], [0, 0, 0], [1, 1.1, 0.9]); add(g, cyl(0.16, 0.2, 0.18, 12), mat(0xa4875a), [0, 0.8, 0]); for (let i = 0; i < 3 * full; i++) add(g, box(0.18, 0.012, 0.12), mat(0xffffff), [(i - 1) * 0.08, 0.92 + i * 0.012, 0], [0, i * 0.4, 0.2]); return g; }
export function buildStreet({ seed = 6, n = 7 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const cols = [0xf0d8b0, 0xf4b8a8, 0xbfe0c8, 0xf6e2a0, 0xb7d3ee, 0xe9c8e0, 0xf0c690], roofs = [0xb4503a, 0x6a4a3a, 0x8a3a3a, 0x4a5a7a], doors = [0xc8302b, 0x2f6fd6, 0x2fa66a, 0xffd23f, 0x8a52c9];
  add(g, box(120, 0.2, 60), mat(0x8bbf6a, { rough: 0.95 }), [0, -0.1, 0]);                                                       // verges
  add(g, box(120, 0.12, 6.6), mat(0x4a4e5a, { rough: 0.85 }), [0, 0.0, 2.0]);                                                  // road
  for (let i = 0; i < 40; i++) add(g, box(1.4, 0.02, 0.18), mat(0xf4f4ee), [-30 + i * 2.4, 0.07, 2.0]);                          // markings
  for (const z of [-2.0, 6.0]) add(g, box(120, 0.14, 1.5), mat(0xc9c4b8, { rough: 0.9 }), [0, 0.02, z]);                          // pavements
  const mkSide = (z0, rot) => { const grp = new THREE.Group(); for (let i = 0; i < n; i++) { const h = houseFront({ w: 3.6, floors: i % 3 === 1 ? 3 : 2, wall: cols[(i + (rot ? 3 : 0)) % cols.length], roof: roofs[i % roofs.length], doorColor: doors[i % doors.length], seed: i + (rot ? 20 : 0) }); h.position.x = (i - (n - 1) / 2) * 3.75; grp.add(h); } grp.position.set(0, 0, z0); grp.rotation.y = rot; return grp; };
  const left = mkSide(-3.4, 0), right = mkSide(7.4, Math.PI); g.add(left, right);
  // trees, lamps, cars
  for (let i = 0; i < 6; i++) { const t = tree(r, { h: 3, s: 1.2 }); t.position.set(-10 + i * 4.1, 0, -2.4 + (i % 2) * 0); g.add(t); const l = lamppost(3.4); l.position.set(-8 + i * 3.8, 0, 5.8); g.add(l); }
  const c1 = car(0xe53935); c1.position.set(-6, 0, 0.5); g.add(c1); const c2 = car(0x2f6fd6); c2.position.set(8, 0, 4.6); c2.rotation.y = Math.PI; g.add(c2);
  const pb = postbox(); pb.position.set(2.5, 0, -1.7); g.add(pb);
  const b1 = bunting([-11, 5.2, -3], [11, 5.2, 7], 30); g.add(b1);
  const b2 = bunting([-11, 5.0, 6.8], [11, 5.0, -2.8], 30); g.add(b2);
  return { group: g, left, right, anchors: { roadZ: 2.0, postbox: pb.position.clone(), doors: [...Array(n)].map((_, i) => new THREE.Vector3((i - (n - 1) / 2) * 3.75 + 0.97, 0, -3.4 + 0.1)) } };
}
