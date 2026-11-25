// SPACE pack: small bodies. Comet (nucleus with vents, coma, blue ion tail + curved dust tail of streaming particles), tumbling asteroid field
// (instanced rocks that drift through a wrapping box and shrink out at its edges), asteroid belt (instanced rocks + orbiting dust + Ceres),
// debris field (satellite shards, tank pieces, bolts; metal glints).
import * as THREE from 'three';
import { rng } from '../util.js';
import { TAU, rgb, mix3, V3, fbm3, bodyGeo, vcMat, rockGeo, MB, sprites, glowDot, flowSprites, spriteMat } from '../fx/space_kit.js';
import { spaceDust } from '../fx/space_sky.js';
import { ceres } from './space_rocky.js';

// ---------- comet ----------
export function comet({ R = 1, tailLen = 26, seed = 33, sunDir = [1, -0.12, 0.25], lod = 'high' } = {}) {
  const g = new THREE.Group(), ticks = [], sd = V3(...sunDir).normalize(), tail = sd.clone().negate();   // tails point AWAY from the sun
  // sunDir = direction the tail points (away from sun) is -sunDir; pass sunDir as the direction TOWARD the sun
  const geo = rockGeo(seed, lod === 'low' ? 2 : 3, { stretch: [1.25, 0.9, 1.0], lump: 0.36, craters: 6 });
  const nuc = new THREE.Mesh(geo, vcMat({ flat: false, rough: 0.95 })); nuc.scale.setScalar(R); nuc.castShadow = true; g.add(nuc);
  // frost patches (bright ice) on the nucleus: vertex-colour already dark; add a few pale ice domes
  const r = rng(seed + 3), ice = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.5, emissive: 0x6aa0d0, emissiveIntensity: 0.2 });
  for (let i = 0; i < 7; i++) { const d = V3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize(), m = new THREE.Mesh(new THREE.SphereGeometry(r.range(0.12, 0.2), 14, 10), ice); m.scale.set(1, 1, 0.4); m.position.set(d.x * 1.25 * 0.93, d.y * 0.9 * 0.93, d.z * 0.93); m.quaternion.setFromUnitVectors(V3(0, 0, 1), d); nuc.add(m); }
  g.add(glowDot(0xbfeaff, R * 5, { k: 0.4, soft: 2.2 }), glowDot(0xffffff, R * 2.6, { k: 0.5, soft: 3 }));
  const ion = flowSprites({ n: lod === 'low' ? 260 : 700, dir: tail.toArray(), length: R * tailLen * 1.1, spread: R * 0.9, speed: 0.22, size: [R * 0.5, R * 1.7], colors: [0xe8f8ff, 0x6ac8ff, 0x2a60e0], pow: 1.2, soft: 2, seed: seed + 1, spread0: 0.5, op: 0.9 });
  const side = V3().crossVectors(tail, V3(0, 1, 0)).normalize(); const dust = flowSprites({ n: lod === 'low' ? 260 : 700, dir: tail.toArray(), length: R * tailLen * 0.8, spread: R * 1.7, speed: 0.15, size: [R * 0.7, R * 2.6], colors: [0xfff4d8, 0xf0c890, 0xb08060], curve: side.multiplyScalar(R * tailLen * 0.28).toArray(), pow: 1.3, soft: 1.8, seed: seed + 2, spread0: 0.5, op: 0.75 });
  g.add(ion, dust); ticks.push((t) => { ion.setTime(t); dust.setTime(t); });
  // vents: little jets spurting from the nucleus toward the sun
  const jets = flowSprites({ n: 90, dir: sd.toArray(), length: R * 3.2, spread: R * 0.35, speed: 0.6, size: [R * 0.12, R * 0.3], colors: [0xffffff, 0xcfeaff, 0x7ab0ff], pow: 1.0, seed: seed + 4, spread0: 0.1 }); jets.position.set(R * 0.5 * sd.x, R * 0.4, R * 0.1); g.add(jets); ticks.push((t) => jets.setTime(t));
  g.update = g.userData.update = (t) => { nuc.rotation.set(t * 0.15, t * 0.22, t * 0.08); for (const f of ticks) f(t); };
  g.userData = { ...g.userData, nucleus: nuc, realRadiusM: 2000 * R, realHeightM: 4000 * R, realLengthM: 1e10, scaleNote: `nucleus radius ${R} units = 2 km (1 unit = 2 km); the real tail is ~10 million km so it is drawn ${tailLen}x the nucleus radius` };
  g.update(0); return g;
}

// ---------- shared: tumbling instanced rocks that wrap inside a box ----------
function rockSet(count, { seed = 1, lod = 'high', size = [1, 5], area = [140, 60, 140], drift = [1.2, 0, -0.8], tumble = 0.5, palette = [0x8a7a6a, 0x6a625c, 0x9a8a78, 0x7a6e66], kinds = 4 } = {}) {
  const r = rng(seed), g = new THREE.Group(), meshes = [], per = Math.ceil(count / kinds), data = [];
  const mt = vcMat({ flat: true, rough: 0.95 });
  for (let k = 0; k < kinds; k++) {
    const im = new THREE.InstancedMesh(rockGeo(seed * 7 + k * 3, lod === 'low' ? 1 : 2, { stretch: [r.range(0.8, 1.5), r.range(0.65, 1), r.range(0.8, 1.2)], lump: r.range(0.25, 0.4), craters: 3 + (k % 3) }), mt, per);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; g.add(im); meshes.push(im);
    for (let i = 0; i < per; i++) {
      const s = size[0] + (size[1] - size[0]) * Math.pow(r(), 2.4);
      data.push({ k, i, p: V3(r.range(0, area[0]), r.range(0, area[1]), r.range(0, area[2])), ax: V3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize(), a0: r() * TAU, w: tumble * r.range(0.25, 1.6) * (r() < 0.5 ? -1 : 1), s, st: [r.range(0.8, 1.2), r.range(0.7, 1.1), r.range(0.8, 1.2)] });
      im.setColorAt(i, new THREE.Color(r.pick(palette)).multiplyScalar(r.range(0.7, 1.3)));
    }
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = V3(), _s = V3();
  const upd = (t, f) => { for (const d of data) { f(d, t, _p, _s); _q.setFromAxisAngle(d.ax, d.a0 + d.w * t); _m.compose(_p, _q, _s); meshes[d.k].setMatrixAt(d.i, _m); } for (const m of meshes) m.instanceMatrix.needsUpdate = true; };
  return { g, upd, data, area };
}
const mod = (a, b) => ((a % b) + b) % b;

// ---------- asteroid field: rocks drift through a box and tumble; edges shrink so nothing pops ----------
export function asteroidField({ count = 360, size = [1, 6], area = [140, 60, 140], seed = 2, lod = 'high', drift = [1.2, 0, -0.8], tumble = 0.5, dust = true } = {}) {
  if (lod === 'low') count = Math.round(count * 0.5);
  const { g, upd } = rockSet(count, { seed, lod, size, area, drift, tumble });
  const f = (d, t, p, s) => { const x = mod(d.p.x + drift[0] * t, area[0]), y = mod(d.p.y + drift[1] * t, area[1]), z = mod(d.p.z + drift[2] * t, area[2]); p.set(x - area[0] / 2, y - area[1] / 2, z - area[2] / 2); const e = Math.min(1, Math.min(x / (area[0] * 0.1), (area[0] - x) / (area[0] * 0.1), z / (area[2] * 0.1), (area[2] - z) / (area[2] * 0.1), y / (area[1] * 0.15), (area[1] - y) / (area[1] * 0.15))); const k = d.s * e * e * (3 - 2 * e); s.set(k * d.st[0], k * d.st[1], k * d.st[2]); };
  let dust_ = null; if (dust) { dust_ = spaceDust({ n: 500, box: [area[0], area[1], area[2]], vel: [drift[0], drift[1], drift[2]], seed: seed + 5, size: [0.1, 0.4], color: 0xd8c8b0, lod }); g.add(dust_); }
  g.update = g.userData.update = (t) => { upd(t, f); dust_?.setTime(t); };
  g.userData = { ...g.userData, count, realWidthM: area[0], realHeightM: area[1], realDepthM: area[2], scaleNote: '1 unit = 1 m; rocks are 1-6 m boulders (use the scale for bigger ones)' };
  g.update(0); return g;
}

// ---------- asteroid belt: a ring of instanced rocks + orbiting dust, optionally with Ceres ----------
export function asteroidBelt({ R = 300, width = 90, thick = 14, count = 700, size = [2, 12], seed = 6, lod = 'high', withCeres = true, speed = 0.03 } = {}) {
  if (lod === 'low') count = Math.round(count * 0.45);
  const r = rng(seed), g = new THREE.Group();
  const { g: rocks, upd, data } = rockSet(count, { seed, lod, size, tumble: 0.35 });
  for (const d of data) { d.rad = R + (r() + r() - 1) * width * 0.5; d.th = r() * TAU; d.y = (r() + r() - 1) * thick * 0.5; d.w = speed / Math.pow(d.rad / R, 1.5); }
  const f = (d, t, p, s) => { const a = d.th + d.w * t; p.set(Math.cos(a) * d.rad, d.y, Math.sin(a) * d.rad); s.set(d.s * d.st[0], d.s * d.st[1], d.s * d.st[2]); };
  g.add(rocks);
  { const n = lod === 'low' ? 2500 : 9000, O = new Float32Array(n * 4), C = new Float32Array(n * 3), S = new Float32Array(n), P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const rad = R + (r() + r() - 1) * width * 0.62, b = r.range(0.35, 0.8); O.set([r() * TAU, speed / Math.pow(rad / R, 1.5), rad, (r() + r() - 1) * thick * 0.6], i * 4); C.set([b * 0.95, b * 0.85, b * 0.72], i * 3); S[i] = r.range(0.5, 1.8); }
    const d = sprites(P, C, S, { orbit: O, atten: true, soft: 2, max: 8, seed: seed + 1 }); g.add(d); g.userData.dust = d; }
  let ce = null; if (withCeres) { ce = ceres({ R: width * 0.12 }); ce.userData.th = 1.0; g.add(ce); }
  g.update = g.userData.update = (t) => { upd(t, f); g.userData.dust.setTime(t); if (ce) { const a = 1.0 + speed * t; ce.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); ce.update(t); } };
  g.userData = { ...g.userData, orbitRadiusUnits: R, realRadiusM: 4.2e11, unitsPerM: R / 4.2e11, scaleNote: `belt radius ${R} units = 2.8 AU (4.2e11 m); rocks are enlarged so you can see them` };
  g.update(0); return g;
}

// ---------- debris field: shards of solar panel, tank, bolts, foil flakes. metal glints catch the light as they tumble ----------
export function debrisField({ count = 220, area = [60, 30, 60], seed = 14, lod = 'high', drift = [0.8, 0.1, -0.6], tumble = 0.9, scale = 1 } = {}) {
  if (lod === 'low') count = Math.round(count * 0.5);
  const r = rng(seed), g = new THREE.Group(), kinds = [];
  const mk = (build, mt) => { const mb = new MB(); build(mb); const geo = mb.mesh().geometry; return { geo, mt }; };
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.85, roughness: 0.28 }), plastic = vcMat({ rough: 0.6 });
  kinds.push(mk((m) => { m.box(2.2, 0.06, 1.3, 0x1c2f6a); m.box(2.2, 0.065, 0.05, 0xb8c0d0); m.box(0.05, 0.065, 1.3, 0xb8c0d0); m.box(1.1, 0.065, 0.04, 0x8a96b0); }, metal));         // solar panel shard
  kinds.push(mk((m) => { m.cyl(0.55, 0.55, 1.6, 14, 0xd6d8de); m.cyl(0.58, 0.58, 0.1, 14, 0x8a8a94, [0, 0.8, 0]); m.cyl(0.4, 0.4, 0.05, 10, 0x2a2a30, [0, -0.8, 0]); }, metal));           // tank
  kinds.push(mk((m) => { m.cyl(0.07, 0.07, 0.5, 6, 0xb0b0b8); m.cyl(0.14, 0.14, 0.08, 6, 0xb0b0b8, [0, 0.25, 0]); }, metal));                                                         // bolt
  kinds.push(mk((m) => { m.g(new THREE.TetrahedronGeometry(0.5), 0xd6a640); m.g(new THREE.TetrahedronGeometry(0.28), 0xf0f0f0, [0.4, 0.2, 0]); }, metal));                                // foil flake
  kinds.push(mk((m) => { m.cone(0.7, 1.9, 12, 0xeeeeee); m.cyl(0.7, 0.7, 1.4, 12, 0xe2e4e8, [0, -1.6, 0]); m.cyl(0.74, 0.74, 0.12, 12, 0xd23a2a, [0, -0.9, 0]); }, plastic));         // rocket nose
  kinds.push(mk((m) => { m.box(0.9, 0.5, 0.9, 0xd6a640); m.cyl(0.04, 0.04, 1.6, 5, 0xb0b0b8, [0.6, 0.5, 0], [0, 0, 1.0]); m.cyl(0.04, 0.04, 1.2, 5, 0xb0b0b8, [-0.4, 0.5, 0.2], [0.4, 0, -1.2]); }, metal)); // tiny sat bus
  const per = Math.ceil(count / kinds.length), meshes = [], data = [];
  kinds.forEach((k, ki) => { const im = new THREE.InstancedMesh(k.geo, k.mt, per); im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true; g.add(im); meshes.push(im); for (let i = 0; i < per; i++) data.push({ k: ki, i, p: V3(r.range(0, area[0]), r.range(0, area[1]), r.range(0, area[2])), ax: V3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize(), a0: r() * TAU, w: tumble * r.range(0.3, 1.6) * (r() < 0.5 ? -1 : 1), s: scale * r.range(0.5, 1.6) }); });
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = V3(), _s = V3();
  g.update = g.userData.update = (t) => {
    for (const d of data) { const x = mod(d.p.x + drift[0] * t, area[0]), y = mod(d.p.y + drift[1] * t, area[1]), z = mod(d.p.z + drift[2] * t, area[2]); _p.set(x - area[0] / 2, y - area[1] / 2, z - area[2] / 2); const e = Math.min(1, Math.min(x, area[0] - x, z, area[2] - z, y * 1.5, (area[1] - y) * 1.5) / (area[0] * 0.1)), k = d.s * e * e * (3 - 2 * e); _s.set(k, k, k); _q.setFromAxisAngle(d.ax, d.a0 + d.w * t); _m.compose(_p, _q, _s); meshes[d.k].setMatrixAt(d.i, _m); }
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  };
  g.userData = { ...g.userData, count: per * kinds.length, realWidthM: area[0], scaleNote: '1 unit = 1 m; panel shards ~2 m, tanks ~1.6 m (times `scale`)' };
  g.update(0); return g;
}
