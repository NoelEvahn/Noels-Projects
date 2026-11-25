// SPACE pack sets: spaceBackdrop({style}) fills any space shot with layered starfields, nebulae, galaxies, planets, satellites and drifting dust;
// solarSystemTour() (true ordering, documented size law, fly-through camera path); earthOrbitScene(); moonSurface(); launchPad().
// Everything animates in closed form: update(t).
import * as THREE from 'three';
import { rng } from '../util.js';
import { TAU, V3, vcMat, MB, glowDot, flowSprites, sprites, fbm3, mix3, rgb, sstep, rockGeo } from '../fx/space_kit.js';
import { skyDome, starLayers, nebula, spiralGalaxy, distantGalaxies, starCluster, shootingStars, spaceDust, orbitRings, BACK } from '../fx/space_sky.js';
import { earth, moonBody, mars, mercury, venus } from '../props/space_rocky.js';
import { jupiter, saturn, uranus, neptune, sun, blackHole } from '../props/space_giants.js';
import { comet, asteroidField } from '../props/space_small.js';
import { commSat, gpsSat, spaceStation } from '../props/space_craft.js';
import { rocket, apolloLander } from '../props/space_craft2.js';
import { moonFlag } from '../props/space.js';

export const SPACE_STAGE = { sky: ['#01020a', '#03061a'], ground: null, hemiI: 0.42, hemiSky: 0xb8c4ff, hemiGround: 0x2a2040, keyI: 3.4, key: 0xfff4e0, fillI: 0.12, rimI: 0.6, env: 0.22 };
export const BACKDROP_STYLES = ['deep', 'nebula', 'earthOrbit', 'moon', 'solar', 'galaxy', 'asteroids', 'blackhole', 'toon'];

const place = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const lookTo = (o, tx, ty, tz) => { o.lookAt(tx, ty, tz); return o; };

// spaceBackdrop({style, seed, radius, lod, facing}) -> Group with update(t). Content sits in the -z half (what a camera looking down -z sees);
// `facing` (radians) turns the whole dressing about y. All layers move: sky layers turn at different rates (parallax), stars twinkle, shooting
// stars cross, dust drifts through the shot, planets spin, satellites orbit, nebulae billow.
export function spaceBackdrop({ style = 'deep', seed = 1, radius = 850, lod = 'high', facing = 0, dust = true } = {}) {
  const g = new THREE.Group(), ticks = [], r = rng(seed * 13 + 5), low = lod === 'low';
  const add = (o, f) => { g.add(o); ticks.push(f ?? ((t) => o.update?.(t))); return o; };
  const palettes = {
    deep: [0x01020a, 0x060a1e, 0x02030a, [0x3a1a6a, 0x0a3a6a]], nebula: [0x02030c, 0x120a2a, 0x03020a, [0x6a1a4a, 0x1a2a6a]], earthOrbit: [0x01020a, 0x050a1c, 0x02030a, [0x1a2a5a, 0x0a1a3a]], moon: [0x000104, 0x03050e, 0x01020a, [0x1a1a3a, 0x0a1a2a]],
    solar: [0x02030a, 0x0a0e24, 0x03030a, [0x3a2a1a, 0x1a1a4a]], galaxy: [0x01020a, 0x0a0a26, 0x02030a, [0x2a1a5a, 0x1a2a6a]], asteroids: [0x02030a, 0x0c1024, 0x02030a, [0x3a2a3a, 0x1a2a4a]], blackhole: [0x000104, 0x04061a, 0x010208, [0x2a1a1a, 0x101a3a]], toon: [0x120a3a, 0x3a1a6a, 0x0a1a4a, [0xa02a8a, 0x1a8aaa]],
  }[style] ?? [0x01020a, 0x060a1e, 0x02030a, [0x3a1a6a, 0x0a3a6a]];
  g.add(skyDome({ top: palettes[0], mid: palettes[1], bottom: palettes[2], patches: palettes[3], radius: radius * 1.9, seed, k: style === 'toon' ? 0.45 : 0.25 }));
  const stars = add(starLayers({ seed, radius, density: low ? 0.6 : 1, colorful: style === 'toon' ? 1.4 : 1, mwTilt: [0.5 + r() * 0.3, 0.1, 0.3] }));
  add(shootingStars({ count: 8, radius: radius * 0.55, seed: seed + 7, rate: 1.6 }));
  if (dust) add(spaceDust({ n: 380, box: [70, 44, 90], vel: [0.55, 0.06, -0.9], seed: seed + 3, lod }));
  const far = add(distantGalaxies({ n: style === 'galaxy' ? 12 : 28, radius: radius * 1.2, seed: seed + 4 }));
  const P = new THREE.Group(); g.add(P);   // feature group, rotated by `facing`
  const feat = (o, x, y, z, f) => { P.add(place(o, x, y, z)); ticks.push(f ?? ((t) => o.update?.(t))); return o; };
  const neb = (pal, R, x, y, z, n = 700, extra = {}) => feat(nebula({ palette: pal, R, n, seed: seed * 7 + R, lod, ...extra }), x, y, z);
  const sats = [];
  switch (style) {
    case 'nebula': neb('eagle', 240, 0, 30, -520, 900); neb('violet', 150, -300, -70, -430); neb('carina', 110, 280, 90, -480, 500); feat(starCluster({ kind: 'open', R: 30, lod }), 120, -120, -380); break;
    case 'earthOrbit': {
      const e = feat(earth({ R: 330, lod: 'high', spin: 0.004 }), 0, -470, -560); e.rotation.x = 0.35; feat(moonBody({ R: 20, lod: 'low' }), -330, 190, -640);
      for (let i = 0; i < 3; i++) { const s = i % 2 ? gpsSat({ s: 3 }) : commSat({ s: 2 }); s.userData.i = i; P.add(s); sats.push(s); }
      feat(glowDot(0xfff2d0, 120, { k: 0.8, soft: 2.4, max: 700 }), 380, 260, -300, () => {});
      neb('icy', 120, 360, 110, -640, 260, { dark: false, bright: 0.6 }); break; }
    case 'moon': { const e = feat(earth({ R: 26, lod: 'high', spin: 0.02 }), -150, 110, -520); feat(glowDot(0xfff6e0, 90, { k: 0.7, soft: 2.4 }), 330, 220, -340, () => {}); neb('icy', 140, 260, 40, -700, 420, { bright: 0.8 }); break; }
    case 'solar': {
      feat(sun({ R: 55, lod: 'low' }), 330, 120, -680); feat(jupiter({ R: 75, lod: 'low' }), -230, 30, -560); feat(saturn({ R: 46, lod: 'low' }), 40, -85, -400).rotation.x = 0.5;
      feat(mars({ R: 14, lod: 'low' }), -90, 90, -300); feat(comet({ R: 3, tailLen: 30, lod: 'low' }), 160, 150, -450);
      { const O = new Float32Array(2400 * 4), C = new Float32Array(2400 * 3), S = new Float32Array(2400), Pp = new Float32Array(2400 * 3); for (let i = 0; i < 2400; i++) { const rad = 520 + (r() + r() - 1) * 120, b = r.range(0.3, 0.7); O.set([r() * TAU, 0.01 / Math.pow(rad / 520, 1.5), rad, (r() + r() - 1) * 18], i * 4); C.set([b, b * 0.88, b * 0.74], i * 3); S[i] = r.range(1.5, 4); }
        const belt = sprites(Pp, C, S, { orbit: O, atten: true, soft: 2, max: 8 }); belt.position.set(0, -60, -250); belt.rotation.x = 0.28; add(belt, (t) => belt.setTime(t)); }
      break; }
    case 'galaxy': feat(spiralGalaxy({ R: 330, n: low ? 9000 : 16000, arms: 3, seed: seed + 1, tilt: 0 }), 0, 60, -620).rotation.x = 1.15; neb('crimson', 100, -300, -120, -500, 400); neb('icy', 90, 310, 130, -450, 400); feat(starCluster({ kind: 'globular', R: 26, lod }), -190, 170, -400); break;
    case 'asteroids': {
      const f = asteroidField({ count: low ? 160 : 300, area: [360, 120, 330], size: [2, 14], seed, lod, drift: [1.4, 0, -1.0], dust: false }); feat(f, 0, 0, -190);
      feat(saturn({ R: 120, lod: 'low' }), -240, 80, -640).rotation.x = 0.4; neb('sunset', 140, 260, -60, -700, 400); break; }
    case 'blackhole': feat(blackHole({ R: 46, lod: 'low', tilt: 0.32 }), 0, 24, -620); neb('crimson', 130, -320, -110, -520, 380, { bright: 0.7 }); break;
    case 'toon': { neb('sunset', 170, -150, 60, -480, 800); neb('icy', 120, 250, -80, -520, 500); neb('violet', 150, 40, 170, -600, 500);
      const p = saturn({ R: 60, lod: 'low' }); p.rotation.x = 0.6; p.rotation.z = -0.35; feat(p, 170, -30, -380); feat(mars({ R: 18, lod: 'low' }), -230, -90, -300); feat(venus({ R: 12, lod: 'low' }), -60, 140, -330); break; }
    default: neb('orion', 130, -170, 70, -430, 800); neb('carina', 100, 210, -30, -520, 600); feat(spiralGalaxy({ R: 150, n: low ? 7000 : 12000, arms: 2, seed: seed + 2 }), 90, 150, -760).rotation.x = 1.0; feat(starCluster({ kind: 'globular', R: 22, lod }), -70, -95, -330); feat(starCluster({ kind: 'open', R: 16, lod }), 40, 70, -250);
  }
  P.rotation.y = facing;
  ticks.push((t) => { sats.forEach((s, i) => { const a = 0.9 + i * 2.1 + t * (0.05 + i * 0.01); s.position.set(Math.cos(a) * 260, 50 + i * 30 + Math.sin(a * 2) * 10, -240 + Math.sin(a) * 200); s.rotation.y = -a; s.update(t); }); });
  g.update = g.userData.update = (t) => { for (const f of ticks) f(t); };
  g.userData = { ...g.userData, style, note: 'put it in the scene before the action; content sits toward -z; camera far plane must be >= 2000' };
  g.update(0); return g;
}

// ---------- solar system tour: planets in true order from the Sun, true relative size ordering ----------
// size law: radius = 0.55 * (R / R_earth)^0.7 (Sun fixed at 8); distance = 6 + 22 * sqrt(AU). Every body keeps realRadiusM; userData.table lists the numbers.
export const SOLAR_TABLE = [['mercury', 0.387, 2439.7], ['venus', 0.723, 6051.8], ['earth', 1.0, 6371], ['mars', 1.524, 3389.5], ['jupiter', 5.204, 69911], ['saturn', 9.582, 58232], ['uranus', 19.2, 25362], ['neptune', 30.05, 24622]];
export function solarSystemTour({ layout = 'lineup', lod = 'low', orbitSpeed = 0.5, rings = true } = {}) {
  const g = new THREE.Group(), bodies = [], ticks = [];
  const Rk = (km) => 0.55 * Math.pow(km / 6371, 0.7), Dk = (au) => 6 + 22 * Math.sqrt(au);
  const sn = sun({ R: 8, lod }); g.add(sn); ticks.push((t) => sn.update(t));
  const mk = { mercury: (R) => mercury({ R, lod }), venus: (R) => venus({ R, lod }), earth: (R) => earth({ R, lod, spin: 0.5 }), mars: (R) => mars({ R, lod }), jupiter: (R) => jupiter({ R, lod }), saturn: (R) => saturn({ R, lod }), uranus: (R) => uranus({ R, lod }), neptune: (R) => neptune({ R, lod }) };
  const table = [];
  SOLAR_TABLE.forEach(([name, au, km], i) => {
    const R = Rk(km), d = Dk(au), p = mk[name](R); p.userData.orbitAU = au; p.userData.orbitRadiusUnits = d; g.add(p);
    const a0 = i * 0.9 + 0.3, w = orbitSpeed / Math.pow(au, 1.5) * 0.35;
    if (layout === 'lineup') p.position.set(d, 0, 0); bodies.push({ p, d, a0, w, name });
    table.push({ name, orbitAU: au, realRadiusM: p.userData.realRadiusM, radiusUnits: R, orbitUnits: d });
    if (name === 'earth') { const m = moonBody({ R: R * 0.27, lod }); m.userData.mo = true; g.add(m); bodies.push({ m, host: p, d: R * 2.2, w: 1.4, a0: 1 }); }
  });
  if (layout === 'orbits') g.add((() => { const o = orbitRings({ radii: SOLAR_TABLE.map(([, au]) => Dk(au)), colors: [0x6a8aff, 0x6a8aff], beads: false, dashed: true, tube: 0.05 }); return o; })());
  ticks.push((t) => { for (const b of bodies) { if (b.m) { const a = b.a0 + t * b.w, h = b.host.position; b.m.position.set(h.x + Math.cos(a) * b.d, h.y, h.z + Math.sin(a) * b.d); b.m.update(t); continue; } if (layout === 'orbits') { const a = b.a0 + t * b.w; b.p.position.set(Math.cos(a) * b.d, 0, Math.sin(a) * b.d); } b.p.update(t); } });
  // belt between Mars and Jupiter
  { const r = rng(5), n = 2600, O = new Float32Array(n * 4), C = new Float32Array(n * 3), S = new Float32Array(n), Pp = new Float32Array(n * 3); const rm = Dk(2.8); for (let i = 0; i < n; i++) { const rad = rm + (r() + r() - 1) * 3.2, b = r.range(0.4, 0.8); O.set([r() * TAU, 0.14 / Math.pow(rad / rm, 1.5), rad, (r() + r() - 1) * 0.4], i * 4); C.set([b, b * 0.85, b * 0.7], i * 3); S[i] = r.range(0.06, 0.16); } const belt = sprites(Pp, C, S, { orbit: O, atten: true, soft: 2, max: 7 }); g.add(belt); ticks.push((t) => belt.setTime(t)); }
  g.userData = { ...g.userData, table, layout, sizeLaw: 'radius = 0.55 * (R/R_earth)^0.7 units (Sun fixed at 8); distance = 6 + 22*sqrt(AU) units', note: 'order from the Sun: Mercury, Venus, Earth, Mars, [belt], Jupiter, Saturn, Uranus, Neptune' };
  // fly-through: u 0..1 sweeps the camera from the Sun outward, watching the planets slide past (lineup layout)
  g.userData.cameraPath = (u) => { const k = Math.min(1, Math.max(0, u)), x = 14 + k * 128, ph = Math.sin(k * 20) * 0.0; return { pos: [x - 16, 6 + 4 * Math.sin(k * 3.1), 20 - 4 * k], target: [x + 8, 0, 0], fov: 46 }; };
  g.update = g.userData.update = (t) => { for (const f of ticks) f(t); };
  g.update(0); return g;
}

// ---------- low Earth orbit: the station at true size (109 m) above a huge Earth ----------
export function earthOrbitScene({ lod = 'high' } = {}) {
  const g = new THREE.Group(), bd = spaceBackdrop({ style: 'earthOrbit', seed: 3, lod }), st = spaceStation({ lod: lod === 'low' ? 'low' : 'high' });
  st.rotation.set(0.1, -0.6, 0); g.add(bd, st);
  const sats = [gpsSat({ s: 1.5 }), commSat({ s: 1 })]; sats.forEach((s, i) => { g.add(s); });
  g.update = g.userData.update = (t) => { bd.update(t); st.update(t); sats.forEach((s, i) => { const a = 1.2 + i * 2.4 + t * 0.03; s.position.set(Math.cos(a) * 160, 30 + i * 20, -60 + Math.sin(a) * 120); s.rotation.y = -a; s.update(t); }); };
  g.userData.station = st; g.update(0); return g;
}

// ---------- Moon surface: cratered height field, boulders, footprints, lander + flag, Earth in the black sky ----------
const MOON_CRATERS = (() => { const r = rng(77), a = []; for (let i = 0; i < 46; i++) a.push({ x: r.range(-200, 200), z: r.range(-200, 200), r: Math.pow(r(), 2.2) * 26 + 3 }); a.push({ x: 28, z: -34, r: 22 }, { x: -38, z: 12, r: 15 }); return a; })();
export function moonHeight(x, z) {
  let h = (fbm3(x * 0.012 + 3, 0, z * 0.012, 4, 2) - 0.5) * 6 + (fbm3(x * 0.07, 1, z * 0.07, 3, 4) - 0.5) * 0.7;
  for (const c of MOON_CRATERS) { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), u = d / c.r; if (u > 1.9) continue; h -= c.r * 0.2 * (1 - sstep(0.55, 1.0, u)); h += c.r * 0.045 * Math.exp(-Math.pow((u - 1.08) / 0.16, 2)); }
  return h;
}
export function moonSurface({ lod = 'high', seed = 5 } = {}) {
  const g = new THREE.Group(), r = rng(seed), ticks = [], N = lod === 'low' ? 70 : 150, S = 520;
  const geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = moonHeight(x, z); p.setY(i, h); const n = fbm3(x * 0.05, 0, z * 0.05, 3, 7), c = mix3(rgb(0x4e4a44), rgb(0x6a645a), n), sh = 1 + Math.max(-0.35, Math.min(0.25, (h - (fbm3(x * 0.012 + 3, 0, z * 0.012, 4, 2) - 0.5) * 6) * 0.08)); const l = new THREE.Color().setRGB(c[0] * sh, c[1] * sh, c[2] * sh, THREE.SRGBColorSpace); col.set([l.r, l.g, l.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, vcMat({ rough: 1 })); ground.receiveShadow = true; g.add(ground);
  // boulders (instanced) + pebbles
  const rg = rockGeo(4, 1, { stretch: [1.2, 0.8, 1], craters: 0 }), im = new THREE.InstancedMesh(rg, vcMat({ flat: true, rough: 0.95 }), 320), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3(), _p = V3(); im.castShadow = true; im.receiveShadow = true;
  for (let i = 0; i < 320; i++) { const x = r.range(-230, 230), z = r.range(-230, 230), s = 0.15 + Math.pow(r(), 3) * 2.2; _p.set(x, moonHeight(x, z) + s * 0.2, z); _q.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)); _s.set(s * r.range(0.8, 1.3), s * 0.8, s * r.range(0.8, 1.3)); _m.compose(_p, _q, _s); im.setMatrixAt(i, _m); im.setColorAt(i, new THREE.Color(0xb8b0a4).multiplyScalar(r.range(0.6, 1.2))); } g.add(im);
  // footprints trail from the lander to the flag
  const fp = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 8), new THREE.MeshStandardMaterial({ color: 0x4a463f, roughness: 1 }), 36); for (let i = 0; i < 36; i++) { const u = i / 35, x = -6 + u * 14 + (i % 2 ? 0.18 : -0.18), z = -6 + u * 22 + Math.sin(u * 4) * 1.4; _p.set(x, moonHeight(x, z) + 0.02, z); _q.setFromEuler(new THREE.Euler(0, u * 0.5, 0)); _s.set(1, 1, 2.2); _m.compose(_p, _q, _s); fp.setMatrixAt(i, _m); } g.add(fp);
  const lm = apolloLander(); lm.position.set(-6, moonHeight(-6, -6) - 0.1, -6); lm.rotation.y = 0.4; g.add(lm); ticks.push((t) => lm.update(t));
  const fl = moonFlag(); fl.scale.setScalar(1.6); fl.position.set(10, moonHeight(10, 14), 14); g.add(fl);
  // horizon ridges + Earth in the sky + dense stars
  const rb = new MB(); for (let i = 0; i < 70; i++) { const a = i / 70 * TAU, rad = r.range(300, 360), h = r.range(10, 48) * (0.5 + r() * 0.8); rb.g(new THREE.ConeGeometry(r.range(30, 70), h, 6), r() < 0.5 ? 0x5a564f : 0x6c675e, [Math.cos(a) * rad, h / 2 - 6, Math.sin(a) * rad], [0, r() * 3, 0]); } g.add(rb.mesh(vcMat({ flat: true, rough: 1 }), false));
  const bd = spaceBackdrop({ style: 'moon', seed: seed + 2, lod, dust: false }); g.add(bd); ticks.push((t) => bd.update(t));
  g.userData.heightAt = moonHeight; g.userData.lander = lm; g.userData.realWidthM = S; g.userData.note = '1 unit = 1 m; flag 2.6 m; lander 9.4 m legs span';
  g.update = g.userData.update = (t) => { for (const f of ticks) f(t); }; g.update(0); return g;
}

// ---------- launch pad: tower, flame trench, rocket that lifts off in closed form from launchTime ----------
export function launchPad({ kind = 'saturnV', launchTime = 3, lod = 'high' } = {}) {
  const g = new THREE.Group(), r = rng(9), ticks = [];
  const gm = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ color: 0x6fae4a, roughness: 1 })); gm.rotation.x = -Math.PI / 2; gm.position.y = -0.05; gm.receiveShadow = true; g.add(gm);
  const gc = new MB(); for (let i = 0; i < (lod === 'low' ? 500 : 1800); i++) { const a = r() * TAU, d = 60 + Math.sqrt(r()) * 700, s = r.range(0.5, 2.4); gc.cone(s * 0.5, s * 2.2, 5, [0x4a9a3a, 0x5aaa44, 0x3a8a34, 0x7ab84a][i & 3], [Math.cos(a) * d, s * 1.1, Math.sin(a) * d]); } g.add(gc.mesh(vcMat({ rough: 1 }), false));
  const bush = new MB(); for (let i = 0; i < 220; i++) { const a = r() * TAU, d = 90 + r() * 600, s = r.range(2, 6); bush.sph(s, [0x2a7a3a, 0x347f3a, 0x3a8a44][i % 3], [Math.cos(a) * d, s * 0.6, Math.sin(a) * d], [0, 0, 0], [1.4, 0.8, 1.2], 8, 6); } g.add(bush.mesh(vcMat({ rough: 1 }), false));
  const pad = new MB(); pad.cyl(48, 52, 3, 8, 0x9a9a9a, [0, 1.5, 0]); pad.box(26, 3.5, 90, 0x6a6a70, [0, 2.4, 0]); pad.box(12, 0.5, 90, 0x1a1a1e, [0, 4.15, 0]); pad.box(80, 0.3, 14, 0xb0a890, [0, 0.15, 150]); pad.cyl(52, 52, 0.4, 8, 0xc8c4b8, [0, 3.1, 0]);
  const TH = 125, tx = 26; for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) pad.box(0.9, TH, 0.9, 0xc84a2a, [tx + x, TH / 2, z]);
  for (let y = 5; y < TH; y += 9) { pad.box(6.9, 0.5, 0.5, 0xc84a2a, [tx, y, 3]); pad.box(6.9, 0.5, 0.5, 0xc84a2a, [tx, y, -3]); pad.box(0.5, 0.5, 6.9, 0xc84a2a, [tx + 3, y, 0]); pad.box(0.5, 0.5, 6.9, 0xc84a2a, [tx - 3, y, 0]); pad.bar([tx - 3, y, 3], [tx + 3, y + 9, 3], 0.3, 0xc84a2a); pad.bar([tx + 3, y, -3], [tx - 3, y + 9, -3], 0.3, 0xc84a2a); }
  for (const y of [40, 60, 80, 100]) pad.box(18, 1.4, 3.2, 0xd8d8dc, [tx - 11, y, 0]);
  for (const [x, z] of [[-80, 70], [80, 70], [-80, -70], [80, -70]]) { pad.cyl(0.8, 1.2, 90, 6, 0x9a9a9e, [x, 45, z]); pad.sph(1.6, 0xff3030, [x, 91, z]); }
  g.add(pad.mesh(vcMat({ rough: 0.7, metal: 0.2 }), true));
  const rk = rocket({ kind, thrust: 0 }); rk.position.y = 4.4; g.add(rk);
  const smoke = []; for (const s of [-1, 1]) { const f = flowSprites({ n: 360, dir: [s, 0.05, 0], length: 150, spread: 20, speed: 0.35, size: [14, 34], colors: [0xffffff, 0xe6e0d6, 0xc0bab2], pow: 0.9, seed: 20 + s, spread0: 0.6, op: 0.6, additive: false, soft: 1.6 }); f.position.set(0, 6, 0); g.add(f); smoke.push(f); }
  const up = flowSprites({ n: 260, dir: [0, 1, 0], length: 70, spread: 22, speed: 0.25, size: [14, 30], colors: [0xffffff, 0xece6dc, 0xc8c2ba], pow: 1, seed: 30, spread0: 0.8, op: 0.5, additive: false, soft: 1.6 }); up.position.set(0, 5, 0); g.add(up); smoke.push(up);
  const kind_ = kind;
  g.update = g.userData.update = (t) => { const dt = t - launchTime, ign = t > launchTime - 3; const rise = dt > 0 ? 0.5 * (kind_ === 'falcon' ? 14 : 5) * dt * dt * (1 + Math.min(1, dt / 12)) : 0; rk.position.y = 4.4 + rise; rk.update(t); rk.userData.setThrust(ign ? Math.min(1, (t - (launchTime - 3)) / 2) : 0);
    const k = ign ? Math.min(1, (t - (launchTime - 3)) / 3) * (1 - sstep(20, 40, dt > 0 ? dt : 0)) : 0; smoke.forEach((s) => { s.setTime(t); s.setLevel(k); }); };
  g.userData = { ...g.userData, rocket: rk, realHeightM: TH, note: 'tower 125 m; rocket lifts off at launchTime with closed-form acceleration; update(t) is stateless' };
  g.update(0); return g;
}
