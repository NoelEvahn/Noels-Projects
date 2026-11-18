// Space: starfield, Earth at origin (R=3) with moon; earth.setPink(k) turns the night lights pink.
import * as THREE from 'three';
import { makeEarth, makeMoon, starfield, solarSystem, makeGalaxy } from '../props/world.js';
export const SPACE_STAGE = { sky: ['#02030a', '#0a1230'], ground: null, hemiI: 0.35, keyI: 2.8, keyPos: [8, 3, 10], fillI: 0.12 };
export function buildSpace({ R = 3 } = {}) {
  const g = new THREE.Group();
  g.add(starfield(1400, 400, 2));
  const earth = makeEarth(R); g.add(earth);
  const moon = makeMoon(R * 0.27); moon.position.set(R * 4.4, R * 0.5, -R * 1.5); g.add(moon);
  return { group: g, earth, moon, update: (t, { pink = 0, spin = 0.05 } = {}) => { earth.setPink(pink); earth.planet.rotation.y = t * spin; earth.update(t); } };
}
export function buildCosmos() { const g = new THREE.Group(); g.add(starfield(1600, 500, 5)); const ss = solarSystem(1); g.add(ss); const gal = makeGalaxy(3, 4000, 60); gal.position.set(0, -2, -120); gal.rotation.x = 0.9; g.add(gal); return { group: g, solar: ss, galaxy: gal }; }
