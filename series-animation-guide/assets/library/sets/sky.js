// "Cloud Nine": bright sky above a cloud floor. Balloons, airliner, skydivers can be added by the caller.
import * as THREE from 'three';
import { mat, add, rng, C } from '../util.js';
import { cloud, cloudFloor, sunDisc, rainbow, hotAirBalloon, airliner, parachuteCanopy } from '../props/sky.js';
import { makeCharacter, PRESETS, POSES, FACES } from '../character.js';

export const SKY_STAGE = { sky: ['#3d8ef0', '#bfe3ff', '#7fc0ff'], ground: null, fog: ['#cfe8ff', 60, 260], hemiI: 1.25, shadow: { extent: 14 }, keyPos: [-6, 10, 8] };
// Builds cloud floor + scattered clouds + sun; returns group + helper to place objects.
export function buildSkyScene({ seed = 3, clouds = 22, withBalloons = 3, withLiner = true } = {}) {
  const r = rng(seed), g = new THREE.Group();
  g.add(cloudFloor(420, 90, seed));
  for (let i = 0; i < clouds; i++) { const c = cloud(r, r.range(1.4, 3), 0xffffff); c.position.set(r.range(-40, 40), r.range(2, 22), r.range(-60, 5)); g.add(c); }
  const sun = sunDisc(5); sun.position.set(-30, 28, -90); g.add(sun);
  const rb = rainbow(26, 2.4); rb.position.set(20, -4, -70); g.add(rb);
  const balloons = []; for (let i = 0; i < withBalloons; i++) { const b = hotAirBalloon({ colors: [[0xe53935, 0xffd23f, 0x2f6fd6], [0xff5c9a, 0xffffff, 0x4aa0e0], [0x2fa66a, 0xffd23f, 0xffffff]][i % 3], s: 1 }); b.position.set(-12 + i * 12, 6 + i * 3, -14 - i * 6); balloons.push(b); g.add(b); }
  let liner = null; if (withLiner) { liner = airliner(1.2); liner.position.set(14, 11, -30); liner.rotation.y = -0.6; g.add(liner); }
  return { group: g, balloons, liner, update: (t) => { balloons.forEach((b, i) => { b.position.y = 6 + i * 3 + Math.sin(t * 0.6 + i) * 0.3; }); } };
}
// Skydivers hold hands in a heart formation (top-down). Returns {group, update(t)}; uses low-detail characters.
export function skydiverHeart(n = 28, { seed = 2 } = {}) {
  const g = new THREE.Group(), pts = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push([x * 0.22, y * 0.22]); }
  const divers = pts.map(([x, z], i) => { const c = makeCharacter({ ...PRESETS.skydiver, detail: 'low', outfit: { type: 'jumpsuit', color: [0xff6a2b, 0xffd23f, 0x2f6fd6, 0xff3f7f, 0x4cd07a][i % 5] }, pants: { type: 'long', color: [0xff6a2b, 0xffd23f, 0x2f6fd6, 0xff3f7f, 0x4cd07a][i % 5] } }); c.pose({ aLs: 1.4, aRs: 1.4, aLf: 0.2, aRf: 0.2, lean: 1.45, lLs: 0.4, lRs: 0.4, hx: -1.2 }); c.root.position.set(x, 0, z); g.add(c.root); return c; });
  return { group: g, update: (t) => divers.forEach((d, i) => { d.root.position.y = Math.sin(t * 2 + i) * 0.08; }) };
}
