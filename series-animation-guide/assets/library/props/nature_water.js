// Water: ocean (Gerstner-ish vertex waves + foam crests), beach shoreline with swash foam, river (flowing ripples + streaks),
// lake (mirrored mountains, ripple rings, ducks, lilies), waterfall (falling streak geometry, plunge-pool rings, mist), sailboat.
// All displacement is in vertex shaders driven by one time uniform; floating things use the same sine sum in JS. Metres.
import * as THREE from 'three';
import { rng } from '../util.js';
import { uni, discGeo, TAU, fbm, noise2, ridge, sstep, mix, mergeGeos, paint, mtx, instanced, sway, vcMat, terrainGeo, waterMaterial, waveHeight, waveSlope } from './nature_common.js';
import { softMaterial, cloudMaterials, puffMeshes } from './nature_clouds.js';
import { forest, taperedTube } from './nature_forest.js';
import { birdFlock } from './nature_sky.js';

const part = (g, color, m) => ({ g, color, m });

// ---------- sailboat (toy, 9 m) ----------
export function sailboat({ hull = 0xe8e2d4, sail = 0xffffff, accent = 0xe53935, length = 9 } = {}) {
  const g = new THREE.Group(), k = length / 9;
  const hg = new THREE.SphereGeometry(1, 14, 10, 0, TAU, Math.PI / 2, Math.PI / 2); hg.scale(1.35, 0.9, 4.5);
  const hp = hg.attributes.position; for (let i = 0; i < hp.count; i++) { const z = hp.getZ(i); if (z > 2) hp.setX(i, hp.getX(i) * (1 - (z - 2) / 3.2)); }
  hg.computeVertexNormals();
  const h = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ color: hull, roughness: 0.4, side: THREE.DoubleSide })); h.castShadow = true; g.add(h);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 5, 20, Math.PI), new THREE.MeshStandardMaterial({ color: accent })); stripe.scale.set(1.36, 0.0001, 4.5); stripe.rotation.x = Math.PI / 2; stripe.position.y = -0.18; g.add(stripe);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.34, 0.05, 14), new THREE.MeshStandardMaterial({ color: 0xb98a54 })); deck.scale.set(1, 1, 3.3); deck.position.y = 0.0; g.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: 0xf4efe4 })); cabin.position.set(0, 0.27, -0.6); g.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 9.5, 6), new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.5, roughness: 0.4 })); mast.position.set(0, 4.7, 0.3); g.add(mast);
  const sailG = new THREE.Group(); sailG.position.set(0, 1.0, 0.3);
  const ms = new THREE.Shape(); ms.moveTo(0, 0); ms.lineTo(0, 7.8); ms.quadraticCurveTo(-0.15, 3.6, -3.7, 0.4); ms.lineTo(0, 0);
  const main = new THREE.Mesh(new THREE.ShapeGeometry(ms, 8), new THREE.MeshStandardMaterial({ color: sail, side: THREE.DoubleSide, roughness: 0.7 })); main.rotation.y = Math.PI / 2; main.rotation.y = Math.PI / 2; sailG.add(main);
  const js = new THREE.Shape(); js.moveTo(0, 0); js.lineTo(0, 7.2); js.lineTo(2.9, 0.2); js.lineTo(0, 0);
  const jib = new THREE.Mesh(new THREE.ShapeGeometry(js, 4), new THREE.MeshStandardMaterial({ color: accent, side: THREE.DoubleSide, roughness: 0.7 })); jib.rotation.y = -Math.PI / 2; jib.position.set(0, 0.2, 0.9); g.add(jib);
  g.add(sailG); g.scale.setScalar(k);
  g.userData = { realLengthM: length, realHeightM: 10.2 * k, sail: sailG, jib, update: () => {} };
  return g;
}
// put a floating object on the wave field (sync with waterMaterial waves). base = water mesh offset in world
export function floatOn(obj, waves, x, z, t, { len = 6, yaw = 0, lift = 0 } = {}) {
  const h = waveHeight(waves, x, z, t), [gx, gz] = waveSlope(waves, x, z, t);
  obj.position.set(x, h + lift, z); obj.rotation.set(Math.atan(gz) * 0.9, yaw, -Math.atan(gx) * 0.9, 'YXZ');
}

// ---------- ocean ----------
export const OCEAN_WAVES = (h = 1) => [[1, 0.35, 0.5 * h, 46, 5.2], [0.55, 1, 0.32 * h, 29, 4.2], [-0.4, 1, 0.2 * h, 17, 3.2], [1, -0.7, 0.12 * h, 9.5, 2.4], [0.2, 1, 0.07 * h, 5.5, 1.9]];
export function ocean({ size = 1600, seg = 320, waveH = 1.4, color = 0x1f95cc, deep = 0x0f5fa8, boat = true, boats = 2, seed = 2, foamAt = 0.72 } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed), waves = OCEAN_WAVES(waveH);
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, c = new THREE.Color(), cs = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z) / (size / 2), n = fbm(x * 0.01, z * 0.01, seed, 3); c.set(color).lerp(new THREE.Color(deep), Math.min(1, d * 0.6 + n * 0.5)); cs[i * 3] = c.r; cs[i * 3 + 1] = c.g; cs[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(cs, 3));
  const sea = new THREE.Mesh(geo, waterMaterial(U, { color: 0xffffff, waves, foamAt, foamAmt: 0.8, rough: 0.16, emissive: 0x0a4f80, emissiveIntensity: 0.35 })); sea.receiveShadow = true; g.add(sea);
  const bs = [];
  if (boat) for (let i = 0; i < boats; i++) { const b = sailboat({ accent: [0xe53935, 0x2f6fd6, 0xffd23f][i % 3] }); b.userData.x = i === 0 ? 14 : -40 + r() * 20; b.userData.z = i === 0 ? -34 : -90 - i * 30; b.userData.yaw = 0.5 + i * 1.1; g.add(b); bs.push(b); }
  g.userData = { realWidthM: size, waves, update: (t) => { U.value = t; for (const b of bs) { floatOn(b, waves, b.userData.x + t * 0.8 * Math.sin(b.userData.yaw), b.userData.z, t, { yaw: b.userData.yaw }); b.userData.sail.rotation.y = 0.12 * Math.sin(t * 0.7 + b.userData.yaw); } } };
  return g;
}

// ---------- beach shoreline: sloping sand + sea with waves rolling in + swash foam bands + palms/rocks/driftwood ----------
export function beachShore({ length = 260, depth = 200, seed = 6, palms = 14 } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed), waves = [[0.05, 1, 0.55, 22, 5.5], [-0.08, 1, 0.3, 13, 4.2], [0.12, 1, 0.14, 7, 3.1]];
  // profile: z>0 land (dune, grass), z<0 sea. shoreline at z=0
  const prof = (x, z) => { const s = z > 0 ? Math.min(z * 0.045, 1.4) + 0.5 * sstep(30, 60, z) + 3 * sstep(60, 110, z) + 1.5 * fbm(x * 0.02, z * 0.02, seed, 3) * sstep(35, 100, z) : Math.max(z * 0.055, -8) * (1 + 0.0); return s - 0.12 + 0.12 * Math.sin(x * 0.2 + z * 0.4) * (z > 0 ? 0.6 : 0.3); };
  const sand = terrainGeo({ w: length, d: depth * 1.5, nx: 180, nz: 150, cx: 0, cz: depth * 0.1, fn: prof, color: (x, z, h, ny, c) => { const wet = 1 - sstep(0, 4.5, z); c.set(0xf0dca4).lerp(new THREE.Color(0xc2a46a), wet * 0.8).lerp(new THREE.Color(0xe6d08c), sstep(2, 20, z) * 0.4); if (z > 30) c.lerp(new THREE.Color(0x6fae4a), sstep(30, 62, z)); if (z < 0) c.lerp(new THREE.Color(0x4fc4c8), sstep(0, -9, z) * 0.9); } });
  g.add(new THREE.Mesh(sand, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })));
  // water
  const wgeo = new THREE.PlaneGeometry(length, depth, 200, 100); wgeo.rotateX(-Math.PI / 2); wgeo.translate(0, 0, -depth / 2 + 6);
  const wp = wgeo.attributes.position, wc = new Float32Array(wp.count * 3), cc = new THREE.Color();
  for (let i = 0; i < wp.count; i++) { const z = wp.getZ(i); cc.set(0x4fe0d0).lerp(new THREE.Color(0x1f8fd0), sstep(0, -28, z)).lerp(new THREE.Color(0x1260a8), sstep(-30, -120, z)); wc.set([cc.r, cc.g, cc.b], i * 3); }
  wgeo.setAttribute('color', new THREE.BufferAttribute(wc, 3));
  const wm = waterMaterial(U, { color: 0xffffff, waves, foamAt: 0.45, foamAmt: 0.9, rough: 0.2, opacity: 0.9 });
  const water = new THREE.Mesh(wgeo, wm); water.position.y = 0.0; g.add(water);
  // swash foam: soft white ribbons (geometry alpha) that rush up the sand and slide back, three phases
  const U2 = U, bands = [];
  for (let b = 0; b < 4; b++) {
    const SEG = 120, pos = [], aA = [], aC = [], idx = [];
    for (let i = 0; i <= SEG; i++) { const x = (i / SEG - 0.5) * length; for (const v of [-1, -0.33, 0.33, 1]) { pos.push(x, 0, v * (3.2 + b * 0.3)); aA.push((Math.abs(v) > 0.9 ? 0.0 : 1.0) * (0.55 + 0.45 * noise2(x * 0.25, b * 9, 3)) * (Math.abs(v) < 0.5 ? 1 : 0.6)); aC.push(1, 1, 1); } if (i < SEG) { const q = i * 4; for (let j = 0; j < 3; j++) idx.push(q + j, q + j + 4, q + j + 1, q + j + 1, q + j + 4, q + j + 5); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 1)); geo.setAttribute('aCol', new THREE.Float32BufferAttribute(aC, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, softMaterial(U2, { color: 0xffffff, opacity: 0.92 })); m.renderOrder = 6; g.add(m); bands.push({ m, ph: b / 4, geo });
  }
  // shoreline detail: rocks, driftwood, shells, grass tufts at the dune edge, palms on the dune
  const rocks = []; for (let i = 0; i < 26; i++) { const x = r.range(-length / 2, length / 2), z = r() < 0.5 ? r.range(-6, 2) : r.range(8, 50); rocks.push({ x, y: Math.max(prof(x, z), -0.3) + 0.1, z, s: r.range(0.3, 1.2), sx: r.range(0.8, 1.6), ry: r() * 6, col: r.pick([0x8a8a90, 0x6a6a74, 0xa09a92]) }); }
  const rg = new THREE.IcosahedronGeometry(1, 1); rg.scale(1, 0.62, 1); g.add(instanced(rg, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), rocks, { cast: true }));
  const shells = []; for (let i = 0; i < 90; i++) { const x = r.range(-length / 2, length / 2), z = r.range(0.5, 14); shells.push({ x, y: prof(x, z) + 0.02, z, s: r.range(0.1, 0.2), ry: r() * 6, col: r.pick([0xfff0e0, 0xffb8a8, 0xf4d8c0, 0xffffff]) }); }
  g.add(instanced(new THREE.SphereGeometry(1, 6, 4, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.5 }), shells));
  for (let i = 0; i < 5; i++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, r.range(2.5, 5), 7), new THREE.MeshStandardMaterial({ color: 0xb09878, roughness: 1 })); const x = r.range(-length / 2.5, length / 2.5), z = r.range(6, 22); lg.position.set(x, prof(x, z) + 0.25, z); lg.rotation.set(0, r() * 3, Math.PI / 2); lg.castShadow = true; g.add(lg); }
  const dunePalms = forest({ area: [-length / 2.2, 40, length / 2.2, 110], count: palms, kinds: { palm: 1 }, lod: 'high', clump: 0, heightFn: (x, z) => prof(x, z), seed: seed + 3, scale: [0.9, 1.4] }); g.add(dunePalms);
  const tufts = []; for (let i = 0; i < 1400; i++) { const x = r.range(-length / 2, length / 2), z = r.range(14, 110); if (r() > sstep(14, 36, z) + 0.2) continue; tufts.push({ x, y: prof(x, z) - 0.05, z, s: r.range(0.6, 1.6), sy: r.range(0.8, 2), ry: r() * 6, col: new THREE.Color().setHSL(0.2 + 0.08 * r(), 0.5, 0.4 + 0.2 * r()).getHex() }); }
  const tg = mergeGeos([0, 1, 2, 3, 4].map((i) => { const b = new THREE.ConeGeometry(0.07, 1, 3); b.translate(0, 0.5, 0); b.rotateZ(Math.sin(i * 2.4) * 0.35); b.rotateY(i * 1.3); return part(b, 0xffffff); })); g.add(instanced(tg, new THREE.MeshStandardMaterial({ roughness: 0.9, vertexColors: true, side: THREE.DoubleSide }), tufts.concat(tufts.map((q) => ({ ...q, x: q.x + 0.3, z: q.z + 0.2, ry: q.ry + 1 })))));
  const gulls = birdFlock({ count: 7, pattern: 'soar', radius: 70, altitude: 22, span: 1.3, seed: 4 }); gulls.position.set(0, 0, -30); g.add(gulls);
  const upd = (t) => {
    U.value = t;
    for (const b of bands) { const s = ((t / 7 + b.ph) % 1), run = s < 0.28 ? Math.sin(s / 0.28 * Math.PI / 2) : 1 - Math.pow((s - 0.28) / 0.72, 1.4), z = -4 + run * (9 + 3 * b.ph), fade = s < 0.9 ? 1 : (1 - s) / 0.1; b.m.position.set(0, 0.06 + 0.02 * b.ph, z); b.m.material.uniforms.uOp.value = 0.9 * Math.min(1, fade) * (0.55 + 0.45 * Math.sin(Math.min(1, s * 3) * Math.PI / 2)); }
    gulls.userData.update(t); dunePalms.userData.update(t);
  };
  g.userData = { realWidthM: length, waves, update: upd, heightAt: prof };
  upd(0); return g;
}

// ---------- river ----------
const riverPath = (s, seed = 1) => ({ x: 22 * Math.sin(s * 0.018 + seed) + 9 * Math.sin(s * 0.047 + 2 + seed), z: -s });
function riverMat(U, color, speed) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.3, vertexColors: true, transparent: true, opacity: 0.95, side: THREE.DoubleSide, emissive: 0x1a78a0, emissiveIntensity: 0.55 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = U;
    sh.vertexShader = 'uniform float uT; attribute float aS; attribute float aV; attribute vec2 aTan; varying float vC;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `float ph1 = aS * 0.7 - uT * ${(speed * 0.7).toFixed(2)} + aV * 2.0, ph2 = aS * 1.9 - uT * ${(speed * 1.9).toFixed(2)} - aV * 3.1;
        float wH = 0.07 * sin(ph1) + 0.045 * sin(ph2); float dS = 0.07 * 0.7 * cos(ph1) + 0.045 * 1.9 * cos(ph2); float dV = 0.07 * 2.0 * cos(ph1) - 0.045 * 3.1 * cos(ph2);
        vec3 objectNormal = normalize(vec3(-(dS * aTan.x) + dV * aTan.y * 0.3, 1.0, -(dS * aTan.y) - dV * aTan.x * 0.3));`)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position); transformed.y += wH; vC = wH;');
    sh.fragmentShader = 'varying float vC;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb += vec3(0.5, 0.6, 0.62) * smoothstep(0.07, 0.11, vC);');
  };
  m.customProgramCacheKey = () => 'river' + speed; return m;
}
export function river({ length = 340, width = 16, seed = 3, speed = 2.2, trees = 120, y = 0, w = 300 } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed), C = (s) => riverPath(s, seed);
  const bankD = (x, z) => { const c = C(-z); return Math.abs(x - c.x); };
  const hf = (x, z) => { const d = bankD(x, z), bank = sstep(width * 0.55, width * 0.55 + 6, d), far = sstep(width, 100, d); return -1.6 * (1 - sstep(0, width * 0.5, d)) + 1.4 * bank + 12 * far * (0.5 + 0.8 * fbm(x * 0.01, z * 0.01, seed, 4)) + 0.4 * fbm(x * 0.1, z * 0.1, seed, 3) * bank; };
  const col = (x, z, h, ny, c) => { const d = bankD(x, z); c.set(0x5aa844).lerp(new THREE.Color(0x3f8a3a), sstep(10, 60, d) * 0.8).lerp(new THREE.Color(0xc2b080), (1 - sstep(width * 0.5, width * 0.5 + 2.5, d)) * 0.9).lerp(new THREE.Color(0x7a8a6a), (1 - ny) * 3); c.multiplyScalar(0.9 + 0.2 * fbm(x * 0.2, z * 0.2, seed, 2)); };
  const terr = terrainGeo({ w, d: length + 120, nx: 150, nz: 240, cx: 0, cz: -length / 2 + 60, fn: hf, color: col });
  const tm = new THREE.Mesh(terr, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); tm.receiveShadow = true; g.add(tm);
  // water ribbon
  const N = 190, M = 8, pos = [], aS = [], aV = [], aT = [], cs = [], idx = [];
  for (let i = 0; i <= N; i++) { const s = i / N * length, a = C(s), b = C(s + 1), tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz), nx = -tz / tl, nz = tx / tl;
    for (let j = 0; j <= M; j++) { const v = j / M * 2 - 1, wd = width * 0.52 * (1 + 0.12 * Math.sin(s * 0.05)); pos.push(a.x + nx * v * wd, y - 0.12, a.z + nz * v * wd); aS.push(s); aV.push(v); aT.push(tx / tl, tz / tl); const c = new THREE.Color(0x3fb0d8).lerp(new THREE.Color(0x1a7ab0), 1 - v * v).lerp(new THREE.Color(0x9ee8e8), Math.pow(Math.abs(v), 4) * 0.7); cs.push(c.r, c.g, c.b); }
    if (i < N) for (let j = 0; j < M; j++) { const q = i * (M + 1) + j; idx.push(q, q + M + 1, q + 1, q + 1, q + M + 1, q + M + 2); } }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1)); rg.setAttribute('aV', new THREE.Float32BufferAttribute(aV, 1)); rg.setAttribute('aTan', new THREE.Float32BufferAttribute(aT, 2)); rg.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3)); rg.setIndex(idx);
  const rm = new THREE.Mesh(rg, riverMat(U, 0xffffff, speed)); rm.frustumCulled = false; g.add(rm);
  // foam streaks gliding downstream on the surface
  const SN = 150, sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
  const stm = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), SN); stm.frustumCulled = false; stm.renderOrder = 6; g.add(stm);
  const SP = Array.from({ length: SN }, () => ({ s0: r() * length, v: r.range(-0.85, 0.85), len: r.range(0.8, 3.2), sp: r.range(0.8, 1.2), w: r.range(0.08, 0.22) }));
  // rocks in the stream with expanding white rings
  const rocks = []; for (let i = 0; i < 16; i++) { const s = r.range(8, length - 8), v = r.range(-0.7, 0.7), a = C(s), b = C(s + 1), tl = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / tl, nz = (b.x - a.x) / tl; rocks.push({ x: a.x + nx * v * width * 0.5, z: a.z + nz * v * width * 0.5, s: r.range(0.5, 1.4) }); }
  g.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x8a8a8e, roughness: 0.95, flatShading: true }), rocks.map((q) => ({ x: q.x, y: -0.1 + q.s * 0.18, z: q.z, s: q.s, sy: q.s * 0.7, ry: q.x })), { cast: true }));
  const RING = 16, ringG = new THREE.RingGeometry(0.9, 1.0, 20); ringG.rotateX(-Math.PI / 2);
  const rings = new THREE.InstancedMesh(ringG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }), RING * 2); rings.frustumCulled = false; rings.renderOrder = 6; g.add(rings);
  // trees along the banks, reeds at the water's edge
  const f = forest({ area: [-w / 2, -length, w / 2, 0], count: trees, kinds: { round: 0.4, pine: 0.35, birch: 0.25 }, heightFn: hf, clear: Array.from({ length: 40 }, (_, i) => { const c = C(i * length / 39); return { x: c.x, z: c.z, r: width * 0.75 }; }), nearR: 80, center: [0, -60], seed: seed + 2, clump: 0.3 }); g.add(f);
  const reeds = []; for (let i = 0; i < 260; i++) { const s = r.range(0, length), a = C(s), b = C(s + 1), tl = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / tl, nz = (b.x - a.x) / tl, sd = r.sign(), off = width * (0.5 + r.range(0.0, 0.1)); reeds.push({ x: a.x + nx * sd * off, y: -0.3, z: a.z + nz * sd * off, s: r.range(0.7, 1.4), sy: r.range(1.0, 2.2), ry: r() * 6, col: new THREE.Color().setHSL(0.17 + 0.06 * r(), 0.45, 0.35 + 0.15 * r()).getHex() }); }
  const rgeo = new THREE.ConeGeometry(0.08, 1.4, 3); rgeo.translate(0, 0.7, 0);
  g.add(instanced(rgeo, sway(new THREE.MeshStandardMaterial({ roughness: 0.9 }), U, { amp: 0.25, h: 1.4, k: 0.4, speed: 2 }), reeds));
  const o = new THREE.Object3D(), c0 = new THREE.Color();
  g.userData = { realWidthM: width, realLengthM: length, heightAt: hf, centre: C, update: (t) => {
    U.value = t; f.userData.update(t);
    SP.forEach((p, i) => { const s = ((p.s0 + speed * p.sp * t) % length + length) % length, a = C(s), b = C(s + 1), tx = b.x - a.x, tz = b.z - a.z, tl = Math.hypot(tx, tz), nx = -tz / tl, nz = tx / tl, wd = width * 0.5 * (1 + 0.12 * Math.sin(s * 0.05)); o.position.set(a.x + nx * p.v * wd, 0.0, a.z + nz * p.v * wd); o.rotation.set(0, Math.atan2(-tz, tx), 0); o.scale.set(p.len, 1, p.w * (1 + Math.abs(p.v))); o.updateMatrix(); stm.setMatrixAt(i, o.matrix); }); stm.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < RING; i++) for (let k = 0; k < 2; k++) { const q = rocks[i], ph = ((t * 0.6 + i * 0.37 + k * 0.5) % 1); o.position.set(q.x, 0.02, q.z); o.rotation.set(0, 0, 0); const sc = q.s * (1.2 + ph * 2.4); o.scale.set(sc * 1.3, 1, sc * 0.9 + ph); o.updateMatrix(); rings.setMatrixAt(i * 2 + k, o.matrix); }
    rings.instanceMatrix.needsUpdate = true;
  } };
  return g;
}

// ---------- lake: bowl of hills, mirrored reflection under semi-transparent water, ripple rings, ducks, lilies, reeds, dock + rowboat ----------
export function lake({ radius = 130, seed = 4, hillsH = 70 } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed), R = radius;
  const hf = (x, z) => { const d = Math.hypot(x, z), a = Math.atan2(z, x), shore = sstep(R * 0.92, R * 1.1, d), mt = sstep(R * 1.1, R * 2.6, d); const far = hillsH * (0.25 + 1.2 * ridge(x * 0.004, z * 0.004, seed, 4)) * (z < 0 ? 1.8 : 0.9); return -6 + 6.4 * shore + far * mt + 5 * fbm(x * 0.02, z * 0.02, seed, 3) * shore; };
  const col = (x, z, h, ny, c) => { const d = Math.hypot(x, z); c.set(0xd8c890).lerp(new THREE.Color(0x5aa844), sstep(R * 0.97, R * 1.15, d)).lerp(new THREE.Color(0x2f7a3a), sstep(R * 1.4, R * 2.2, d) * (1 - sstep(30, 70, h))).lerp(new THREE.Color(0x8c8480), Math.min(1, sstep(30, 62, h) + (1 - ny) * 2.2)); c.lerp(new THREE.Color(0xf4f8ff), sstep(70, 92, h) * (0.5 + 0.5 * ny)); c.multiplyScalar(0.92 + 0.16 * fbm(x * 0.1, z * 0.1, seed, 2)); };
  let geo = terrainGeo({ w: 1400, d: 1400, nx: 280, nz: 280, fn: hf, color: col });
  // drop everything below the water so only the mirrored copy shows through it (clean reflection)
  const ix = geo.index.array, p = geo.attributes.position, keep = []; for (let i = 0; i < ix.length; i += 3) if (Math.max(p.getY(ix[i]), p.getY(ix[i + 1]), p.getY(ix[i + 2])) > -0.4) keep.push(ix[i], ix[i + 1], ix[i + 2]); geo.setIndex(keep);
  const tm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false })); tm.receiveShadow = true; g.add(tm);
  const mir = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, color: 0xb8c8d8 })); mir.scale.y = -1; g.add(mir);
  const waves = [[1, 0.4, 0.05, 11, 1.4], [0.3, 1, 0.04, 7, 1.1], [-0.6, 1, 0.025, 4, 0.9]];
  const wg = discGeo(R * 1.12, 40, 96);
  const wm = waterMaterial(U, { color: 0x2a8ab8, waves, foamAmt: 0, rough: 0.08, opacity: 0.66, vertexColors: false, metal: 0.1 }); wm.depthWrite = false;
  const water = new THREE.Mesh(wg, wm); water.renderOrder = 3; g.add(water);
  // ripple rings
  const ringG = new THREE.RingGeometry(0.93, 1.0, 36); ringG.rotateX(-Math.PI / 2); const NR = 7;
  const rings = new THREE.InstancedMesh(ringG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }), NR * 3); rings.frustumCulled = false; rings.renderOrder = 5; g.add(rings);
  const RP = Array.from({ length: NR }, () => { const a = r() * TAU, d = r.range(0.2, 0.85) * R; return { x: Math.cos(a) * d, z: Math.sin(a) * d, ph: r(), T: r.range(3.5, 6) }; });
  // lily pads + flowers
  const pads = []; for (let i = 0; i < 70; i++) { const a = r() * TAU, d = R * (0.55 + 0.4 * Math.sqrt(r())); pads.push({ x: Math.cos(a) * d, y: 0.03, z: Math.sin(a) * d, s: r.range(0.5, 1.1), ry: r() * 6, col: new THREE.Color().setHSL(0.3 + 0.04 * r(), 0.55, 0.3 + 0.1 * r()).getHex() }); }
  const padG = new THREE.CircleGeometry(1, 14, 0.5, TAU - 0.6); padG.rotateX(-Math.PI / 2); g.add(instanced(padG, new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }), pads));
  const lilies = pads.filter((_, i) => i % 4 === 0).map((p, i) => ({ x: p.x + 0.1, y: 0.12, z: p.z, s: 0.3, col: [0xffffff, 0xff9acb, 0xffe070][i % 3] })); g.add(instanced(new THREE.SphereGeometry(1, 6, 4, 0, TAU, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ roughness: 0.6 }), lilies));
  // reeds ringing the shore
  const reeds = []; for (let i = 0; i < 420; i++) { const a = r() * TAU, d = R * (0.95 + 0.1 * r()); reeds.push({ x: Math.cos(a) * d, y: -0.2, z: Math.sin(a) * d, s: r.range(0.8, 1.5), sy: r.range(1.2, 2.6), ry: r() * 6, col: new THREE.Color().setHSL(0.16 + 0.07 * r(), 0.5, 0.33 + 0.15 * r()).getHex() }); }
  const reedG = new THREE.ConeGeometry(0.09, 1.6, 3); reedG.translate(0, 0.8, 0); g.add(instanced(reedG, sway(new THREE.MeshStandardMaterial({ roughness: 0.9 }), U, { amp: 0.22, h: 1.6, k: 0.4, speed: 2 }), reeds));
  // ducks (toy): body + head + beak, paddling in loops with a little bob
  const duckG = mergeGeos([part(new THREE.SphereGeometry(0.28, 8, 6), 0xf4f0e6, mtx(0, 0.22, 0, 0, 1, 0.8, 1.5)), part(new THREE.SphereGeometry(0.17, 8, 6), 0x2f8a4a, mtx(0, 0.5, 0.28)), part(new THREE.ConeGeometry(0.06, 0.18, 5), 0xffa030, mtx(0, 0.5, 0.48, 0, 1, 1, 1, Math.PI / 2)), part(new THREE.ConeGeometry(0.14, 0.25, 4), 0xe8e0d0, mtx(0, 0.32, -0.42, 0, 1, 0.6, 1, -Math.PI / 2))]);
  const ND = 9, ducks = new THREE.InstancedMesh(duckG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), ND); ducks.castShadow = true; ducks.frustumCulled = false; g.add(ducks);
  const DP = Array.from({ length: ND }, (_, i) => ({ cx: r.range(-0.3, 0.3) * R, cz: r.range(0.0, 0.5) * R, rad: r.range(6, 22), w: r.range(0.08, 0.16) * (r() < 0.5 ? 1 : -1), ph: r() * TAU }));
  // dock + rowboat at the near shore
  const dock = new THREE.Group(); const plankM = new THREE.MeshStandardMaterial({ color: 0xa8825a, roughness: 0.9 });
  for (let i = 0; i < 14; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.34), plankM); pl.position.set(0, 0.55, i * 0.4); pl.castShadow = true; dock.add(pl); }
  for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 6), plankM); po.position.set(sx * 1.2, -0.3, i * 1.3); dock.add(po); }
  dock.position.set(-14, 0, R * 0.86); dock.rotation.y = Math.PI + 0.3; g.add(dock);
  const boat = new THREE.Group(); const bh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, TAU, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5, side: THREE.DoubleSide })); bh.scale.set(0.8, 0.6, 2.2); boat.add(bh); const bin = new THREE.Mesh(new THREE.SphereGeometry(0.92, 10, 6, 0, TAU, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd8b078, side: THREE.BackSide })); bin.scale.set(0.8, 0.6, 2.2); bin.position.y = 0.02; boat.add(bin);
  for (const sz of [-1, 1]) { const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5), plankM); oar.rotation.z = Math.PI / 2 * 0.85 * sz; oar.position.set(sz * 0.9, 0.3, 0.1); boat.add(oar); }
  boat.position.set(-18, 0, R * 0.78); g.add(boat);
  // a few trees on the near hills
  const trees = forest({ area: [-300, -300, 300, 300], count: 320, kinds: { pine: 0.6, round: 0.2, birch: 0.2 }, heightFn: hf, mask: (x, z) => hf(x, z) > 0.5 && hf(x, z) < 55 && Math.hypot(x, z) > R * 1.12, nearR: 110, center: [0, 80], seed: seed + 2, clump: 0.4, scale: [1, 2] }); g.add(trees);
  const o = new THREE.Object3D();
  g.userData = { realWidthM: R * 2, heightAt: hf, update: (t) => {
    U.value = t; trees.userData.update(t);
    for (let i = 0; i < NR; i++) for (let k = 0; k < 3; k++) { const q = RP[i], ph = ((t / q.T + q.ph + k * 0.12) % 1), sc = 0.4 + ph * 7; o.position.set(q.x, 0.04, q.z); o.scale.set(sc, 1, sc); o.rotation.set(0, 0, 0); o.updateMatrix(); rings.setMatrixAt(i * 3 + k, o.matrix); }
    rings.instanceMatrix.needsUpdate = true;
    const _o = new THREE.Object3D();
    DP.forEach((p, i) => { const a = p.w * t + p.ph, x = p.cx + Math.cos(a) * p.rad, z = p.cz + Math.sin(a) * p.rad; _o.position.set(x, 0.0 + 0.04 * Math.sin(t * 2 + i), z); _o.rotation.set(0.04 * Math.sin(t * 1.7 + i), -a + (p.w > 0 ? 0 : Math.PI) + (p.w > 0 ? Math.PI : 0), 0); _o.scale.setScalar(1.2); _o.updateMatrix(); ducks.setMatrixAt(i, _o.matrix); }); ducks.instanceMatrix.needsUpdate = true;
    boat.position.y = 0.03 * Math.sin(t * 1.1); boat.rotation.set(0.03 * Math.sin(t * 0.9), 0.4 + 0.05 * Math.sin(t * 0.3), 0.04 * Math.sin(t * 1.3 + 1));
  } };
  return g;
}

// ---------- waterfall: falling streaks (geometry), spray, plunge pool rings, foam, rising mist ----------
export function waterfall({ height = 60, width = 16, seed = 5, trees = true } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed), H = height, W = width;
  // rock cliff: terraced displaced wall with a notch where the water leaves
  const rockCol = (y, n) => { const c = new THREE.Color(); const k = Math.floor(y / 5 + n * 2) % 4; c.set([0x8a7a6e, 0x76706c, 0x9a8a78, 0x6a665e][(k + 4) % 4]); return c; };
  const cols = [], cliffGeo = new THREE.PlaneGeometry(130, H * 1.15, 160, 140), cp = cliffGeo.attributes.position, cc = new THREE.Color();
  for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i) + H * 0.575, n = fbm(x * 0.06, y * 0.05, seed, 3), step = Math.floor(y / 6) * 0.9, crack = Math.pow(ridge(x * 0.08, y * 0.02, seed, 3), 3); const z = -(4 + 6 * n + 3 * Math.sin(y * 0.5 + x * 0.1) * 0 + (step % 3) + crack * 4) + (Math.abs(x) < W * 0.5 + 1 ? 2.2 * (1 - Math.abs(x) / (W * 0.6)) * sstep(H * 0.5, H, y) * 0 : 0); cp.setXYZ(i, x, y, z); cc.copy(rockCol(y, n)).multiplyScalar(0.75 + 0.5 * crack).lerp(new THREE.Color(0x4f9a44), sstep(H * 0.78, H * 0.98, y) * 0.8 * (0.5 + n)); cols.push(cc.r, cc.g, cc.b); }
  cliffGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); cliffGeo.computeVertexNormals();
  g.add(Object.assign(new THREE.Mesh(cliffGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true })), { receiveShadow: true, castShadow: true }));
  // side buttresses
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: [0x8a7a6e, 0x76706c, 0x9a8a78][i % 3], roughness: 0.95, flatShading: true })); b.scale.set(r.range(5, 9), r.range(6, 11), r.range(5, 8)); b.position.set(sx * (W * 0.6 + 5 + i * 4.5), b.scale.y * 0.5 + i * 2, -5 + r.range(-2, 3)); b.castShadow = true; g.add(b); }
  // top plateau
  const top = new THREE.Mesh(new THREE.BoxGeometry(120, 4, 90), new THREE.MeshStandardMaterial({ color: 0x5aa844, roughness: 0.95 })); top.position.set(0, H - 1, -50); top.receiveShadow = true; g.add(top);
  // pool basin
  const pool = new THREE.Mesh(discGeo(30, 22, 64), waterMaterial(U, { color: 0x3fb8d8, waves: [[1, 0.3, 0.1, 6, 1.6], [0.3, 1, 0.07, 3.5, 1.3]], foamAmt: 0.4, foamAt: 0.5, rough: 0.12, opacity: 0.9, vertexColors: false })); pool.position.set(0, 0.25, 16); g.add(pool);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 40), new THREE.MeshStandardMaterial({ color: 0x78a858, roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0.05, 28); ground.receiveShadow = true; g.add(ground);
  const boulders = []; for (let i = 0; i < 26; i++) { const a = r() * TAU, d = r.range(28, 40); boulders.push({ x: Math.cos(a) * d * 1.2, y: 0.3, z: 16 + Math.sin(a) * d, s: r.range(0.8, 3), sy: r.range(0.5, 1.2), ry: r() * 6, col: r.pick([0x8a8a90, 0x76706c, 0xa09a92]) }); }
  g.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), boulders, { cast: true }));
  // falling water: translucent sheet + hundreds of white streaks that fall, wrap and speed up
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 1, 1), new THREE.MeshStandardMaterial({ color: 0x8fd8f0, transparent: true, opacity: 0.55, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false })); sheet.position.set(0, H / 2, -3.2); g.add(sheet);
  const NS = 520, sg = new THREE.BoxGeometry(1, 1, 1), sm = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, depthWrite: false }), NS); sm.frustumCulled = false; g.add(sm);
  const SP = Array.from({ length: NS }, () => ({ x: r.range(-0.5, 0.5) * W, z: -3.0 + r.range(-0.15, 1.4), len: r.range(2, 8), sp: r.range(0.8, 1.3), ph: r(), w: r.range(0.12, 0.4) }));
  // spray droplets at the lip and foam at the base
  const ND = 90, drop = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }), ND); drop.frustumCulled = false; g.add(drop);
  const DP = Array.from({ length: ND }, () => ({ x: r.range(-0.5, 0.5) * W, vz: r.range(2, 6), vy: r.range(0.5, 3), T: r.range(0.8, 1.6), ph: r(), s: r.range(0.12, 0.3) }));
  const NF = 36, foam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), NF); foam.frustumCulled = false; g.add(foam);
  const FP = Array.from({ length: NF }, () => ({ x: r.range(-0.7, 0.7) * W, z: r.range(-1, 5), ph: r(), s: r.range(0.8, 2.2) }));
  const ringG = new THREE.RingGeometry(0.9, 1.0, 40); ringG.rotateX(-Math.PI / 2); const NR = 5;
  const rings = new THREE.InstancedMesh(ringG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }), NR); rings.frustumCulled = false; rings.renderOrder = 6; g.add(rings);
  // mist: soft steam puffs rising from the plunge zone
  const U2 = U, mm = cloudMaterials(U2, { theme: 'steam', bill: 0.06, alpha: 0.999, halo: true, haloScale: 1.25 }), NM = 26, mp = Array.from({ length: NM }, () => ({ x: 0, y: 0, z: 0, r: 1, ao: 1 }));
  const mist = puffMeshes(mp, mm, { baseY: null, lo: true, alphaFor: () => 0.5 }); g.add(mist); const mcore = mist.userData.core, mhalo = mist.userData.halo;
  const MP = Array.from({ length: NM }, () => ({ x: r.range(-0.6, 0.6) * W, z: r.range(-1, 8), ph: r(), s: r.range(0.8, 1.5), dx: r.range(-1, 1) }));
  if (trees) g.add(forest({ area: [-60, -90, 60, -12], count: 50, kinds: { pine: 0.6, round: 0.4 }, heightFn: () => H + 1, clear: [{ x: 0, z: -3, r: W * 0.9 }], lod: 'high', clump: 0, seed: seed + 2, scale: [0.9, 1.5] }));
  const o = new THREE.Object3D(), o2 = new THREE.Object3D(), pk = new THREE.Color();
  const treesG = g.children[g.children.length - 1];
  g.userData = { realHeightM: H, realWidthM: W, update: (t) => {
    U.value = t; if (trees) treesG.userData.update?.(t);
    SP.forEach((p, i) => { const s = ((t * 0.55 * p.sp + p.ph) % 1), fall = s * s * 0.5 + s * 0.5, y = H - fall * (H + p.len), len = p.len * (0.7 + 0.8 * fall); o.position.set(p.x, y - len / 2 + 0.0, p.z - fall * 0.0); o.rotation.set(0, 0, 0); o.scale.set(p.w, Math.max(0.1, Math.min(len, y + len / 2 > 0 ? len : 0.1)), 0.12); o.updateMatrix(); sm.setMatrixAt(i, o.matrix); }); sm.instanceMatrix.needsUpdate = true;
    DP.forEach((p, i) => { const s = ((t / p.T + p.ph) % 1), tt = s * p.T; o.position.set(p.x, H + 0.4 + p.vy * tt - 4.9 * tt * tt * 0.5, -3 + p.vz * tt * 0.5); o.scale.setScalar(p.s * (1 - s * 0.4)); o.rotation.set(0, 0, 0); o.updateMatrix(); drop.setMatrixAt(i, o.matrix); }); drop.instanceMatrix.needsUpdate = true;
    FP.forEach((p, i) => { const s = ((t * 0.9 + p.ph) % 1), b = Math.abs(Math.sin(s * Math.PI * 2 + i)); o.position.set(p.x, 0.35 + b * 1.1 * p.s * 0.5, p.z); o.scale.set(p.s * (0.8 + 0.4 * b), p.s * 0.65, p.s * (0.8 + 0.3 * b)); o.updateMatrix(); foam.setMatrixAt(i, o.matrix); }); foam.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NR; i++) { const ph = ((t / 3.2 + i / NR) % 1), sc = 2 + ph * 22; o.position.set(0, 0.45, 4); o.scale.set(sc * 1.1, 1, sc * 0.9); o.rotation.set(0, 0, 0); o.updateMatrix(); rings.setMatrixAt(i, o.matrix); (rings.material.opacity = 0.6); }
    rings.instanceMatrix.needsUpdate = true;
    MP.forEach((p, i) => { const s = ((t * 0.12 * p.s + p.ph) % 1), rr = (3 + s * 9) * p.s; o.position.set(p.x + p.dx * s * 6, 1 + s * 26, p.z + s * 8); o.scale.set(rr, rr * 0.9, rr); o.rotation.set(0, 0, 0); o.updateMatrix(); const al = Math.sin(Math.PI * Math.min(1, s * 1.05)) * 0.3; for (const m of [mcore, mhalo]) { m.setMatrixAt(i, o.matrix); m.instanceColor.array[i * 3] = 0.95; m.instanceColor.array[i * 3 + 2] = al; } });
    for (const m of [mcore, mhalo]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  } };
  return g;
}
