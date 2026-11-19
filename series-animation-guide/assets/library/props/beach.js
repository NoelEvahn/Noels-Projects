// Sand-play props: toy shovel (holdable), sand bucket. Geometry + colour only (no textures).
import * as THREE from 'three';
import { mat, add, cyl, sph, rbox, tor } from '../util.js';

// Red toy shovel, authored upright (+Y) with the grip at the origin: ch.hold(toyShovel(), 'R')
export function toyShovel(color = 0xe0262b) {
  const g = new THREE.Group(), m = mat(color, { rough: 0.45 });
  add(g, cyl(0.016, 0.016, 0.36, 12), m, [0, 0.06, 0]);                                   // shaft
  add(g, rbox(0.11, 0.035, 0.035, 0.015), m, [0, -0.13, 0]);                                 // T grip
  const blade = add(g, new THREE.SphereGeometry(0.09, 20, 12, 0, Math.PI, 0, Math.PI * 0.62), mat(color, { rough: 0.45, side: THREE.DoubleSide }), [0, 0.3, 0.0], [Math.PI / 2 + 0.25, 0, 0], [1, 1.5, 0.55]);   // scoop
  add(g, tor(0.022, 0.008, 6, 14), m, [0, 0.235, 0], [Math.PI / 2, 0, 0]);                  // collar
  g.userData.blade = blade;
  g.userData.grip = { upright: true, hand: 'grip' };
  return g;
}

// Bright blue sand bucket with a white handle; base at y=0
export function sandBucket(color = 0x1ec8f0) {
  const g = new THREE.Group(), m = mat(color, { rough: 0.35, side: THREE.DoubleSide });
  add(g, cyl(0.15, 0.11, 0.2, 28, 1, true), m, [0, 0.1, 0]);
  add(g, cyl(0.11, 0.11, 0.01, 28), m, [0, 0.005, 0]);
  add(g, tor(0.15, 0.012, 6, 32), m, [0, 0.2, 0], [Math.PI / 2, 0, 0]);
  add(g, tor(0.155, 0.006, 4, 24, Math.PI), mat(0xf4f4f4, { rough: 0.4 }), [0, 0.2, 0], [0, 0, 0]);   // handle arc
  add(g, cyl(0.14, 0.14, 0.02, 24), mat(0xd9b77a, { rough: 1 }), [0, 0.17, 0]);                         // sand inside
  return g;
}
