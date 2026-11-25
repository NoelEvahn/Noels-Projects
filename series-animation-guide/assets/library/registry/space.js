// Registry entries for the 'space' pack (same item shape as ../registry.js). Owned by one builder; do not import other packs' registry files.
import * as THREE from 'three';
import { earth, moonBody, mars, mercury, venus, pluto, ceres } from '../props/space_rocky.js';
import { jupiter, saturn, uranus, neptune, sun, blackHole } from '../props/space_giants.js';
import { starLayers, skyDome, nebula, spiralGalaxy, distantGalaxies } from '../fx/space_sky.js';
export const ITEMS = [];
export const SPACE_PACK_STAGE = { sky: ['#01020a', '#03061a'], ground: null, hemiI: 0.42, hemiSky: 0xb8c4ff, hemiGround: 0x2a2040, keyI: 3.4, key: 0xfff4e0, fillI: 0.12, rimI: 0.6, env: 0.22 };
const reg = (id, title, note, build, extra = {}) => ITEMS.push({ id, cat: 'space', title, note, stage: SPACE_PACK_STAGE, build, ...extra });
// wrap: group + optional time offset so the still shows a mid-animation pose
const shot = (obj, cam, upd, dt = 0) => ({ obj, cam, update: (t) => upd(t + dt) });
function withSky(obj, seed = 1) { const g = new THREE.Group(); const s = starLayers({ seed }); g.add(skyDome(), s, obj); return { g, upd: (t) => { s.update(t); obj.update?.(t); } }; }

reg('space_earth', 'Earth: modelled continents, drifting cloud puffs + hurricane, city lights, atmosphere', 'earth({R, lod, spin}) update(t); setSun(v); userData.realRadiusM', () => {
  const e = earth({ R: 3, spin: 0.15 }); e.rotation.y = 0; const { g, upd } = withSky(e); return shot(g, { pos: [-9, 3, 10.5], target: [0, 0, 0], fov: 38 }, upd, 1.2); });
reg('space_moon', 'Moon with modelled craters and maria', 'moonBody({R, lod})', () => { const m = moonBody({ R: 3 }); const { g, upd } = withSky(m, 2); return shot(g, { pos: [4, 2, 11], target: [0, 0, 0], fov: 38 }, upd); });
reg('space_mars', 'Mars: Olympus Mons, Valles Marineris, polar cap, Phobos + Deimos', 'mars({R, moons})', () => { const m = mars({ R: 3 }); m.rotation.y = 0.4; const { g, upd } = withSky(m, 3); return shot(g, { pos: [4, 1.5, 11], target: [0, 0, 0], fov: 38 }, upd, 3); });
reg('space_inner', 'Mercury, Venus, Pluto, Ceres', 'mercury venus pluto ceres', () => {
  const g = new THREE.Group(); const items = [[mercury({ R: 1.2 }), -2.4, 2.8], [venus({ R: 1.8 }), 2.2, 2.6], [pluto({ R: 1.2 }), -2.4, -2.4], [ceres({ R: 1.0 }), 2.4, -2.6]]; for (const [o, x, y] of items) { o.position.set(x, y, 0); g.add(o); }
  const s = starLayers({ seed: 4 }); g.add(skyDome(), s); return shot(g, { pos: [0, 0, 14.5], target: [0, 0, 0], fov: 40 }, (t) => { s.update(t); items.forEach(([o]) => o.update(t)); }, 2); });

reg('space_jupiter', 'Jupiter: counter-rotating belts, Great Red Spot, Galilean moons', 'jupiter({R, moons}) each band turns at its own rate', () => { const j = jupiter({ R: 4 }); const { g, upd } = withSky(j, 5); return shot(g, { pos: [2, 1.5, 24], target: [0, 0, 0], fov: 40 }, upd, 3); });
reg('space_saturn', 'Saturn: 240-row ringlets, orbiting ring particles, planet shadow on the rings', 'saturn({R}) setSun(v)', () => { const s = saturn({ R: 3.2 }); s.rotation.x = 0.42; const { g, upd } = withSky(s, 6); return shot(g, { pos: [2, 4, 25], target: [0, 0, 0], fov: 40 }, upd, 2); });
reg('space_ice_giants', 'Uranus (on its side, thin rings) and Neptune (dark spot, cirrus, Triton)', 'uranus() neptune()', () => { const g = new THREE.Group(); const u = uranus({ R: 2.4 }), n = neptune({ R: 2.4 }); u.position.set(-2.6, 2.7, 0); n.position.set(2.8, -2.6, 0); g.add(skyDome(), u, n); const s = starLayers({ seed: 7 }); g.add(s); return shot(g, { pos: [0, 0, 20], target: [0, 0, 0], fov: 40 }, (t) => { s.update(t); u.update(t); n.update(t); }, 2); });
reg('space_sun', 'The Sun: granulation, sunspots, pulsing corona rays, prominences, solar wind', 'sun({R, light})', () => { const s = sun({ R: 4 }); const { g, upd } = withSky(s, 8); return shot(g, { pos: [0, 0, 30], target: [0, 0, 0], fov: 40 }, upd, 1); });
reg('space_blackhole', 'Black hole: horizon, lensed halo, orbiting accretion disk, polar jets', 'blackHole({R, tilt})', () => { const b = blackHole({ R: 2.4 }); const { g, upd } = withSky(b, 9); return shot(g, { pos: [0, 1.5, 36], target: [0, 0, 0], fov: 40 }, upd, 1); });
