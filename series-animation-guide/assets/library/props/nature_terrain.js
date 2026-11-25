// Terrain: mountain range, Everest-style famous peak, sea cliffs, canyon, dunes (+camels), volcano (smoke, lava, embers),
// glacier + icebergs, rolling hills (windmill, sheep), tropical island. Heightfields in metres, vertex colours only.
// Real-scale landmarks need camera.far >= ~60000 (or wrap with scaled(obj, k) from nature_common.js); userData keeps real sizes.
import * as THREE from 'three';
import { rng } from '../util.js';
import { uni, TAU, fbm, noise2, ridge, sstep, mix, mergeGeos, mtx, instanced, sway, terrainGeo, waterMaterial, waveHeight, waveSlope, discGeo } from './nature_common.js';
import { cloudMaterials, puffMeshes, cloudField, softMaterial } from './nature_clouds.js';
import { forest, taperedTube } from './nature_forest.js';
import { ribbonGeo, riverMat, OCEAN_WAVES, sailboat, floatOn } from './nature_water.js';
import { birdFlock, glowShell } from './nature_sky.js';

const C = (h) => new THREE.Color(h);
const part = (g, color, m) => ({ g, color, m });
const SNOW = C(0xf6f9ff), ROCK_A = C(0x8d837c), ROCK_B = C(0x6b6672), GRASS = C(0x5aa844), FOREST = C(0x2f7a3a);
const std = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, flatShading: !!o.flat, side: o.side ?? THREE.FrontSide });

// shared mountain colouring: forest -> alpine meadow -> strata rock -> snow, with steep faces showing rock even under the snow line
function alpineColor(c, h, ny, x, z, H, snowLine, seed) {
  const n = fbm(x * 0.0009, z * 0.0009, seed + 3, 3), grain = 0.9 + 0.2 * fbm(x * 0.01, z * 0.01, seed, 2);
  const steep = 1 - sstep(0.55, 0.8, ny);
  c.copy(GRASS).lerp(FOREST, sstep(0.02 * H, 0.18 * H, h) * (0.7 + 0.3 * n));
  c.lerp(C(0x9a9a58), sstep(0.2 * H, 0.38 * H, h) * 0.55);
  const strata = 0.82 + 0.18 * Math.sin(h * 0.02 + n * 6);
  c.lerp(ROCK_A.clone().lerp(ROCK_B, 0.5 + 0.5 * Math.sin(h * 0.012 + x * 0.0004)).multiplyScalar(strata), Math.max(steep * sstep(0.08 * H, 0.2 * H, h), sstep(0.38 * H, 0.52 * H, h) * 0.85));
  const sl = snowLine * H + 0.05 * H * (n - 0.5);
  c.lerp(SNOW, sstep(sl, sl + 0.06 * H, h) * (1 - steep * 0.85 * sstep(0.45, 0.8, h / H)));
  c.multiplyScalar(grain);
}
const maxOf = (fn, w, d, cx = 0, cz = 0, n = 60) => { let m = 0; for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) m = Math.max(m, fn(cx + (i / n - 0.5) * w, cz + (j / n - 0.5) * d)); return m; };
const lake = (g, level, w, d, color = 0x2a9ac8, U) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), waterMaterial(U, { color, waves: [[1, 0.3, 0.5, 120, 3]], foamAmt: 0, rough: 0.1, vertexColors: false, opacity: 0.92 })); m.position.y = level; g.add(m); return m; };

// ---------- mountain range: ridged heightfield, rock strata, snow caps, forested foothills, lake, drifting clouds ----------
export function mountainRange({ length = 16000, depth = 7000, height = 3800, seed = 3, snowLine = 0.55, nx = 520, nz = 230, clouds = true, lakeLevel = 60 } = {}) {
  const g = new THREE.Group(), U = uni(0), z0 = -depth * 0.12;
  const env = (z) => Math.exp(-(((z - z0) / (depth * 0.2)) ** 2));
  const raw = (x, z) => { const e = env(z), rg = ridge(x / 3200 + 3, z / 2600, seed, 5), peaks = Math.pow(ridge(x / 5000 + 9, z / 3500, seed + 7, 3), 2); return height * e * (0.12 + 0.8 * rg + 0.55 * peaks) + 220 * fbm(x / 1800, z / 1800, seed, 4) * (0.35 + e) - 110 * sstep(0.55, 0.2, e); };
  const m0 = maxOf(raw, length, depth), k = height / m0, hf = (x, z) => Math.max(0, raw(x, z) * k);
  const geo = terrainGeo({ w: length, d: depth, nx, nz, fn: hf, color: (x, z, h, ny, c) => alpineColor(c, h, ny, x, z, height, snowLine, seed) });
  const t = new THREE.Mesh(geo, std()); t.receiveShadow = true; t.castShadow = true; g.add(t);
  lake(g, lakeLevel, length, depth, 0x2a9ac8, U);
  let cf = null; if (clouds) { cf = cloudField({ count: 7, area: [-length * 0.45, -depth * 0.4, length * 0.45, depth * 0.1], altitude: [height * 0.35, height * 0.8], width: [1200, 2400], seed: seed + 1, drift: 7 }); g.add(cf); }
  g.userData = { realWidthM: length, realHeightM: height, heightAt: hf, update: (t2) => { U.value = t2; cf?.userData.update(t2); } };
  return g;
}

// ---------- famous peak: Everest-style pyramid (8849 m) with three ridges, black summit rock, glacier valleys, wind banner cloud ----------
export function famousPeak({ height = 8849, base = 5300, size = 36000, seed = 8, nx = 340 } = {}) {
  const g = new THREE.Group(), U = uni(0), rr = rng(seed), A0 = 0.5;
  const ridgeD = [A0, A0 + 2.1, A0 + 4.2];
  const shape = (x, z) => { let m = 0; const r = Math.hypot(x, z), a = Math.atan2(z, x); for (const ra of ridgeD) { const along = x * Math.cos(ra) + z * Math.sin(ra), perp = Math.abs(-x * Math.sin(ra) + z * Math.cos(ra)); if (along < 0) continue; const f = Math.max(0, 1 - along / 9500); m = Math.max(m, Math.pow(f, 0.9) * Math.exp(-((perp / (1500 * (0.25 + 0.9 * f))) ** 2))); } return Math.max(m, Math.max(0, 1 - r / 3200) ** 1.4); };
  const raw = (x, z) => { const s = shape(x, z), nl = ridge(x / 2400 + 4, z / 2400, seed, 5), n2 = ridge((x + 9000) / 6000, z / 6000, seed + 2, 4), valley = 120 * fbm(x / 900, z / 900, seed, 3); return base - 700 + valley + (height - base) * (Math.pow(s, 1.15) * (0.9 + 0.1 * nl)) + 1500 * n2 * sstep(1500, 9000, Math.hypot(x, z)) * (0.3 + 0.7 * nl) + 500 * nl * (1 - s); };
  const m0 = raw(0, 0), kk = (height) / Math.max(m0, maxOf(raw, size, size, 0, 0, 80));
  const hf = (x, z) => raw(x, z) * kk;
  const geo = terrainGeo({ w: size, d: size, nx, nz: nx, fn: hf, color: (x, z, h, ny, c) => {
    const n = fbm(x * 0.001, z * 0.001, seed, 3), steep = 1 - sstep(0.5, 0.78, ny), top = sstep(8000, 8800, h);
    c.copy(C(0xa09078)).lerp(C(0x7a6e62), n);                                      // high valley scree
    c.lerp(C(0x9ecbe0), sstep(5000, 5700, h) * 0.8 * (1 - steep));                  // glaciers
    c.lerp(SNOW, sstep(6100, 7000, h) * (1 - steep * 0.95));
    c.lerp(C(0x4a4650), steep * sstep(5600, 6800, h) * 0.95);                        // black rock faces
    if (h < 5500) c.lerp(C(0xb8a888), sstep(5500, 4800, h) * 0.6);                  // brown moraine
    c.multiplyScalar(0.92 + 0.16 * fbm(x * 0.01, z * 0.01, seed, 2));
  } });
  const t = new THREE.Mesh(geo, std({ flat: true })); t.receiveShadow = true; t.castShadow = true; g.add(t);
  // find summit
  let sx = 0, sz = 0, sy = 0; for (let i = -40; i <= 40; i++) for (let j = -40; j <= 40; j++) { const y = hf(i * 60, j * 60); if (y > sy) { sy = y; sx = i * 60; sz = j * 60; } }
  // banner cloud streaming downwind from the summit: stretched puffs born at the top and drifting away (closed-form)
  const mm = cloudMaterials(U, { theme: 'steam', bill: 0.05, alpha: 0.999, halo: true, haloScale: 1.3 }), NB = 36, bp = Array.from({ length: NB }, () => ({ x: 0, y: 0, z: 0, r: 1, ao: 1 }));
  const ban = puffMeshes(bp, mm, { baseY: null, lo: true }), core = ban.userData.core, halo = ban.userData.halo; g.add(ban);
  const BP = Array.from({ length: NB }, () => ({ ph: rr(), dy: rr.range(-1, 1), dz: rr.range(-1, 1), s: rr.range(0.7, 1.3) })), o = new THREE.Object3D();
  const cf = cloudField({ count: 7, area: [-size * 0.45, -size * 0.45, size * 0.45, -size * 0.12], altitude: [5600, 7600], width: [1800, 3600], seed: seed + 1, drift: 8 }); g.add(cf);
  g.userData = { realHeightM: height, realWidthM: size, summit: [sx, sy, sz], heightAt: hf, update: (t) => {
    U.value = t; cf.userData.update(t);
    BP.forEach((p, i) => { const s = ((t * 0.045 + p.ph) % 1), L = 5200; o.position.set(sx + s * L, sy - 120 + p.dy * 160 * s + s * 80, sz + p.dz * 260 * s); const r0 = (260 + s * 520) * p.s; o.scale.set(r0 * (1 + s * 1.6), r0 * 0.55, r0 * 0.9); o.rotation.set(0, 0, 0); o.updateMatrix(); const al = Math.sin(Math.PI * Math.min(1, s * 1.03)) * 0.85; for (const m of [core, halo]) { m.setMatrixAt(i, o.matrix); m.instanceColor.array[i * 3] = 1; m.instanceColor.array[i * 3 + 2] = al; } });
    for (const m of [core, halo]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  } };
  return g;
}

// ---------- sea cliffs: stratified wall with erosion cracks, grassy top, surf + foam at the base, circling seabirds ----------
export function cliffs({ width = 520, height = 120, seed = 4 } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed), waves = OCEAN_WAVES(0.9).slice(0, 4).map((w) => [w[0], w[1], w[2] * 0.8, w[3], w[4]]);
  const pal = [0xe8d8b0, 0xc8a878, 0xb46a48, 0xd8c498, 0x8a7a70, 0xc0a070, 0xa65a3c];
  const wall = new THREE.PlaneGeometry(width, height * 1.04, 300, 140), p = wall.attributes.position, cols = [], c = new THREE.Color();
  const face = (x, y) => { const n = fbm(x * 0.025, y * 0.03, seed, 4), step = Math.floor(y / 7 + n * 0.8), cr = Math.pow(ridge(x * 0.035, 3, seed, 3), 3), over = 14 * sstep(height * 0.55, height, y) * (0.5 + n); return -(3 + 12 * n + (hashStep(step, seed) * 5) + cr * 7 + over * 0.5); };
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i) + height * 0.5; const z = face(x, y); p.setXYZ(i, x, Math.max(0, y) - (y < 0 ? 0 : 0), z); const step = Math.floor(y / 7 + fbm(x * 0.025, y * 0.03, seed, 4) * 0.8), cr = Math.pow(ridge(x * 0.035, 3, seed, 3), 3); c.set(pal[((step % pal.length) + pal.length) % pal.length]).multiplyScalar(0.78 + 0.35 * (1 - cr)).lerp(C(0x4f9a44), sstep(height * 0.9, height * 1.0, y) * 0.9); cols.push(c.r, c.g, c.b); }
  wall.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); wall.computeVertexNormals();
  g.add(Object.assign(new THREE.Mesh(wall, std({ flat: true })), { castShadow: true, receiveShadow: true }));
  // grassy cap sloping back + trees
  const topH = (x, z) => height + 2 + 5 * fbm(x * 0.02, z * 0.02, seed, 3) + Math.max(0, -z - 30) * 0.03;
  const top = terrainGeo({ w: width * 1.4, d: 300, nx: 120, nz: 60, cx: 0, cz: -170, fn: topH, color: (x, z, h, ny, cc) => { cc.set(0x5aa844).lerp(C(0x7fc050), fbm(x * 0.03, z * 0.03, seed, 2)); } });
  g.add(Object.assign(new THREE.Mesh(top, std()), { receiveShadow: true }));
  const trees = forest({ area: [-width * 0.5, -280, width * 0.5, -30], count: 60, kinds: { round: 0.5, pine: 0.5 }, heightFn: topH, lod: 'high', clump: 0.2, seed: seed + 2, scale: [1, 1.7] }); g.add(trees);
  // sea
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 700, 240, 120).rotateX(-Math.PI / 2), waterMaterial(U, { color: 0x2aa8d0, waves, foamAt: 0.5, foamAmt: 0.8, rough: 0.2, vertexColors: false, emissive: 0x0a5a80, emissiveIntensity: 0.3 })); sea.position.set(0, 0, 330); g.add(sea);
  // fallen boulders + surf foam blobs on the talus
  const rocks = []; for (let i = 0; i < 70; i++) { const x = r.range(-width / 2, width / 2); rocks.push({ x, y: 0.5, z: r.range(-2, 22), s: r.range(1, 5), sy: r.range(0.5, 1), ry: r() * 6, col: r.pick([0x8a7a70, 0x6a625c, 0xa09080]) }); }
  g.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), rocks, { cast: true }));
  const NF = 120, foam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), NF); foam.frustumCulled = false; g.add(foam);
  const FP = Array.from({ length: NF }, () => ({ x: r.range(-width / 2, width / 2), z: r.range(18, 40), ph: r(), s: r.range(1, 3) }));
  const birds = birdFlock({ count: 14, pattern: 'swarm', radius: 140, altitude: 70, span: 1.4, seed: 5, speed: 9 }); birds.position.set(0, 0, 80); g.add(birds);
  const soar = birdFlock({ count: 5, pattern: 'soar', radius: 90, altitude: 40, span: 1.8, seed: 6 }); soar.position.set(0, 0, 40); g.add(soar);
  const o = new THREE.Object3D();
  g.userData = { realHeightM: height, realWidthM: width, update: (t) => {
    U.value = t; trees.userData.update(t); birds.userData.update(t); soar.userData.update(t);
    FP.forEach((q, i) => { const s = (t * 0.22 + q.ph) % 1, run = Math.sin(s * Math.PI), k2 = run * (0.5 + 0.5 * Math.sin(q.x * 0.1)); o.position.set(q.x, 0.5 + waveHeight(waves, q.x, q.z + 330 - 330, t) * 0.3 + 0.6 * run, q.z - 10 * (1 - run)); o.scale.set(q.s * (0.4 + k2), q.s * 0.35 * (0.5 + run), q.s * (0.5 + k2)); o.rotation.set(0, 0, 0); o.updateMatrix(); foam.setMatrixAt(i, o.matrix); }); foam.instanceMatrix.needsUpdate = true;
  } };
  return g;
}
const hashStep = (n, seed) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- canyon: stratified red walls, terraced benches, mesas, winding river with flowing ripples ----------
const stairs = (t) => { let v = 0; for (let i = 0; i < 6; i++) v += sstep(i / 6, i / 6 + 0.08, t) / 6; return v; };
export function canyon({ length = 4200, width = 3000, depth = 620, seed = 12, nx = 230, nz = 260 } = {}) {
  const g = new THREE.Group(), U = uni(0), Cx = (s) => ({ x: 260 * Math.sin(s * 0.0017 + seed) + 120 * Math.sin(s * 0.0049 + 2), z: -s });
  const hf = (x, z) => { const c = Cx(-z), d = Math.abs(x - c.x), w0 = 70 + 40 * Math.sin(-z * 0.003), t = sstep(w0, w0 + 700 + 200 * noise2(z * 0.003, seed, 2), d), terr = 0.82 * stairs(t) + 0.18 * t; const plateau = depth + 40 * fbm(x * 0.004, z * 0.004, seed, 3) + 80 * Math.pow(ridge(x * 0.004, z * 0.004, seed + 1, 3), 3) * sstep(900, 1400, d); return 8 + (plateau - 8) * Math.min(1, terr * 1.05) + 3 * fbm(x * 0.02, z * 0.02, seed, 3) * (1 - t); };
  const pal = [0xe8cfa0, 0xd88a58, 0xb8502f, 0xc97a4a, 0x8a3a2a, 0xe0b078, 0xa04a30, 0xf0d8b0];
  const geo = terrainGeo({ facet: true, w: width, d: length, nx, nz, cx: 0, cz: -length / 2, fn: hf, color: (x, z, h, ny, c) => { const n = fbm(x * 0.003, z * 0.003, seed, 2); const k = Math.floor(h / 38 + n * 1.4); c.set(pal[((k % pal.length) + pal.length) % pal.length]); if (ny > 0.8 && h > depth * 0.9) c.lerp(C(0xc88a58), 0.5).lerp(C(0x9a8a48), sstep(0.85, 1, fbm(x * 0.01, z * 0.01, seed, 2)) * 0.5); if (h < 26) c.set(0xd8b878).lerp(C(0x5a9a4a), sstep(0.2, 0.9, fbm(x * 0.01, z * 0.01, seed, 2)) * 0.8); c.multiplyScalar(0.8 + 0.3 * ny); } });
  g.add(Object.assign(new THREE.Mesh(geo, std({ flat: true })), { receiveShadow: true, castShadow: true }));
  const rm = new THREE.Mesh(ribbonGeo(Cx, length, 62, 17, 240, 8), riverMat(U, 0xffffff, 6)); rm.frustumCulled = false; g.add(rm);
  const cf = cloudField({ count: 6, area: [-1800, -length, 1800, 0], altitude: [1500, 2300], width: [600, 1300], seed: seed + 1, drift: 4 }); g.add(cf);
  const birds = birdFlock({ count: 6, pattern: 'soar', radius: 300, altitude: 420, span: 2.4, seed: 3 }); birds.position.set(0, 0, -length * 0.4); g.add(birds);
  g.userData = { realHeightM: depth, realWidthM: width, heightAt: hf, update: (t) => { U.value = t; cf.userData.update(t); birds.userData.update(t); } };
  return g;
}

// ---------- camels (toy) ----------
function camel() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xc89858, roughness: 0.9 }), dk = new THREE.MeshStandardMaterial({ color: 0x8a6030, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), m); body.scale.set(0.55, 0.65, 1.3); body.position.y = 1.7; body.castShadow = true; g.add(body);
  for (const z of [-0.45, 0.4]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.4, 9, 7), m); h.scale.set(1, 1.1, 1); h.position.set(0, 2.45, z); g.add(h); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.3, 8), m); neck.position.set(0, 2.2, 1.3); neck.rotation.x = 0.7; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 7), m); head.scale.set(0.8, 0.8, 1.4); head.position.set(0, 2.85, 1.85); g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), dk); hair.position.set(0, 2.5, 1.5); g.add(hair);
  const legs = []; for (const [x, z] of [[-0.35, 0.8], [0.35, 0.8], [-0.35, -0.8], [0.35, -0.8]]) { const l = new THREE.Group(); const up = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 1.5, 6), m); up.position.y = -0.7; l.add(up); l.position.set(x, 1.55, z); g.add(l); legs.push(l); }
  g.userData.legs = legs; g.userData.realHeightM = 3.4; return g;
}

// ---------- dunes: sinuous crests, lee faces in shadow, wind-blown sand streaming off the crests, camel caravan ----------
export function dunes({ size = 1400, seed = 6, nx = 240, camels = 4, wind = [1, 0.35] } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed), ang = 0.5, ca = Math.cos(ang), sa = Math.sin(ang);
  const sun = new THREE.Vector3(0.45, 0.8, 0.6).normalize();
  const hf = (x, z) => { const warp = 70 * fbm(x * 0.004, z * 0.004, seed, 3), u = ((x * ca + z * sa) + warp) / 210, f = u - Math.floor(u), w = f < 0.72 ? f / 0.72 : (1 - f) / 0.28, sm = w * w * (3 - 2 * w), amp = 20 + 22 * fbm(x * 0.002, z * 0.002, seed + 1, 3); const u2 = ((-x * sa + z * ca) + 35 * fbm(x * 0.006, z * 0.006, seed + 4, 2)) / 70, rip = 1.2 * Math.sin(u2 * TAU) * sm; return amp * sm + 2.2 * Math.sin((x * ca + z * sa) / 6 + warp * 0.1) * sm * 0.5 + rip * 0.0; };
  const geo = terrainGeo({ w: size, d: size, nx, nz: nx, fn: hf, color: (x, z, h, ny, c, nxx, nzz) => { const l = Math.max(0, nxx * sun.x + ny * sun.y + nzz * sun.z); c.set(0xf0b860).lerp(C(0xffe29a), sstep(0.5, 1, l)).lerp(C(0xb4583a), sstep(0.55, 0.15, l) * 0.85); c.multiplyScalar(0.92 + 0.12 * fbm(x * 0.05, z * 0.05, seed, 2)); } });
  g.add(Object.assign(new THREE.Mesh(geo, std()), { receiveShadow: true, castShadow: true }));
  // blown sand: thin streaks sliding along the wind and lifting off crests
  const NS = 520, sg = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), sm2 = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }), NS); sm2.frustumCulled = false; sm2.renderOrder = 4; g.add(sm2);
  const SP = Array.from({ length: NS }, () => ({ x0: r.range(-size / 2, size / 2), z0: r.range(-size / 2, size / 2), sp: r.range(10, 22), len: r.range(5, 24), w: r.range(0.3, 1.0), up: r.range(0.2, 2.5) }));
  const wl = Math.hypot(...wind), wx = wind[0] / wl, wz = wind[1] / wl;
  // caravan along a line crossing the dunes
  const cm = [], line = (s) => [-300 + s * 0.8, 60 - s * 0.25];
  for (let i = 0; i < camels; i++) { const c = camel(); g.add(c); cm.push(c); }
  const o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
  g.userData = { realHeightM: 45, realWidthM: size, heightAt: hf, update: (t) => {
    U.value = t;
    SP.forEach((p, i) => { const L = size, d = ((p.sp * t + p.x0 * 0.5 + p.z0 * 0.3) % L + L) % L - L / 2; const x = ((p.x0 + wx * p.sp * t + size / 2) % size + size) % size - size / 2, z = ((p.z0 + wz * p.sp * t + size / 2) % size + size) % size - size / 2; o.position.set(x, hf(x, z) + 0.5 + p.up * (0.5 + 0.5 * Math.sin(t * 2 + i)), z); o.rotation.set(0, Math.atan2(-wz, wx), 0); o.scale.set(p.len, 1, p.w); o.updateMatrix(); sm2.setMatrixAt(i, o.matrix); }); sm2.instanceMatrix.needsUpdate = true;
    cm.forEach((c, i) => { const s = 250 + t * 1.3 - i * 9, [x, z] = line(s), [x2, z2] = line(s + 1.5), y = hf(x, z); c.position.set(x, y, z); const dir = new THREE.Vector3(x2 - x, hf(x2, z2) - y, z2 - z).normalize(); c.rotation.set(-Math.asin(dir.y) * 0.8, Math.atan2(dir.x, dir.z), 0, 'YXZ'); c.userData.legs.forEach((l, k) => { l.rotation.x = 0.5 * Math.sin(t * 3.2 + (k % 2 ? 0 : Math.PI) + (k > 1 ? 1.6 : 0) + i); }); c.children[0].position.y = 1.7 + 0.04 * Math.sin(t * 6.4 + i); });
  } };
  return g;
}

// ---------- volcano: stratovolcano, glowing crater, lava streams with flowing blobs, rising smoke column, embers ----------
export function volcano({ height = 2800, radius = 6500, size = 22000, seed = 5, nx = 260, erupting = 1 } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed), rim = 0.05;
  const hf = (x, z) => { const d = Math.hypot(x, z) / radius, a = Math.atan2(z, x), gul = 1 + 0.14 * Math.sin(a * 17 + seed + d * 6) * sstep(0.06, 0.4, d) + 0.1 * noise2(a * 9, d * 6, seed); const cone = Math.pow(Math.max(0, 1 - d), 1.55) * gul; const crater = -0.09 * (1 - sstep(0, rim * 1.4, d)); const base = 90 * fbm(x / 1500, z / 1500, seed, 4) + 600 * Math.pow(ridge(x / 7000 + 3, z / 7000, seed + 2, 3), 2) * sstep(0.9, 2.2, d); return Math.max(0, height * (cone + crater) + base * (0.6 + 0.4 * sstep(0.6, 1.5, d))); };
  const geo = terrainGeo({ facet: true, w: size, d: size, nx, nz: nx, fn: hf, color: (x, z, h, ny, c) => { const d = Math.hypot(x, z) / radius, n = fbm(x * 0.002, z * 0.002, seed, 3); c.copy(GRASS).lerp(FOREST, sstep(20, 300, h) * 0.8); c.lerp(C(0x6a5448), sstep(0.18 * height, 0.4 * height, h) * (0.7 + 0.3 * n)).lerp(C(0x3a3236), sstep(0.45 * height, 0.8 * height, h) * (0.6 + 0.4 * n)).lerp(C(0x8a6a58), (1 - ny) * 1.3 * sstep(0.1 * height, 0.4 * height, h)); if (h > height * 0.88) c.lerp(C(0x2a2428), 0.7); if (n > 0.62) c.lerp(C(0x241e22), 0.5 * sstep(0.3 * height, 0.6 * height, h)); c.multiplyScalar(0.9 + 0.2 * n); } });
  g.add(Object.assign(new THREE.Mesh(geo, std({ flat: true })), { receiveShadow: true, castShadow: true }));
  const craterY = hf(radius * rim * 0.7, 0);
  // lava streams: walk downhill from the rim
  const streams = [], lavaMat = new THREE.MeshStandardMaterial({ color: 0xff5a1a, emissive: 0xff4a10, emissiveIntensity: 1.6, roughness: 0.6 }); let sIdx = 0;
  for (let k = 0; k < 6; k++) {
    const a0 = k / 6 * TAU + r.range(-0.3, 0.3); let x = Math.cos(a0) * radius * rim * 1.2, z = Math.sin(a0) * radius * rim * 1.2; const pts = [];
    for (let i = 0; i < 70; i++) { pts.push(new THREE.Vector3(x, hf(x, z) + 6, z)); const e = 25, gx = (hf(x + e, z) - hf(x - e, z)) / (2 * e), gz = (hf(x, z + e) - hf(x, z - e)) / (2 * e), l = Math.hypot(gx, gz) || 1, wob = 0.4 * Math.sin(i * 0.5 + k); x += (-gx / l + wob * gz / l * 0.5) * 70; z += (-gz / l - wob * gx / l * 0.5) * 70; if (Math.hypot(x, z) > radius * 0.8) break; }
    if (pts.length < 5) continue; const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(taperedTube(curve.getPoints(pts.length * 3), 55, 26, 6), lavaMat); g.add(tube); streams.push(curve);
  }
  const NB = streams.length * 14, blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffd060, toneMapped: false }), NB); blobs.frustumCulled = false; g.add(blobs);
  // crater lake of lava + glow
  const lava = new THREE.Mesh(new THREE.CircleGeometry(radius * rim * 0.95, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7a20, toneMapped: false })); lava.position.set(0, craterY - 30, 0); g.add(lava);
  const glow = glowShell(radius * 0.14, 0xff7a30, 0.9, 2.2); glow.position.set(0, craterY + 80, 0); glow.scale.y = 1.3; g.add(glow);
  // smoke column
  const mm = cloudMaterials(U, { theme: 'smoke', bill: 0.04, alpha: 0.999, halo: true, haloScale: 1.25 }), NSM = 90, sp = Array.from({ length: NSM }, () => ({ x: 0, y: 0, z: 0, r: 1, ao: 1 }));
  const smoke = puffMeshes(sp, mm, { baseY: null, lo: true }), sc = smoke.userData.core, sh = smoke.userData.halo; g.add(smoke);
  const SP = Array.from({ length: NSM }, () => ({ ph: r(), dx: r.range(-1, 1), dz: r.range(-1, 1), s: r.range(0.8, 1.3) }));
  // embers
  const NE = 90, emb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false }), NE); emb.frustumCulled = false; g.add(emb);
  const EP = Array.from({ length: NE }, () => ({ a: r() * TAU, vh: r.range(60, 190), vy: r.range(180, 420), T: r.range(5, 9), ph: r(), s: r.range(5, 14) }));
  const cf = cloudField({ count: 5, area: [-9000, -9000, 9000, 9000], altitude: [2800, 3800], width: [1500, 2800], seed: seed + 1, drift: 5, theme: 'day' }); g.add(cf);
  const o = new THREE.Object3D(), T = 2600;
  g.userData = { realHeightM: height, realWidthM: size, heightAt: hf, update: (t) => {
    U.value = t; cf.userData.update(t);
    lavaMat.emissiveIntensity = 1.3 + 0.5 * Math.sin(t * 2.1) + 0.2 * Math.sin(t * 5.3); lava.material.color.setHSL(0.06 + 0.012 * Math.sin(t * 3), 1, 0.52 + 0.06 * Math.sin(t * 2.2)); glow.material.uniforms.uK.value = 0.8 + 0.2 * Math.sin(t * 1.9); glow.scale.set(1 + 0.05 * Math.sin(t * 2.7), 1.3 + 0.1 * Math.sin(t * 1.9), 1);
    let bi = 0; streams.forEach((cv, k) => { for (let j = 0; j < 14; j++) { const s = ((t * 0.035 + j / 14 + k * 0.13) % 1), p = cv.getPoint(s); o.position.set(p.x, p.y + 12, p.z); o.scale.setScalar(26 * Math.sin(Math.PI * s) + 8); o.rotation.set(0, 0, 0); o.updateMatrix(); blobs.setMatrixAt(bi++, o.matrix); } }); blobs.instanceMatrix.needsUpdate = true;
    SP.forEach((p, i) => { const s = ((t * 0.03 + p.ph) % 1), y = craterY + 100 + s * 3800 * erupting, rr = (170 + s * 760) * p.s; o.position.set(p.dx * 120 * s + s * s * 1400, y, p.dz * 120 * s); o.scale.set(rr, rr * 0.8, rr); o.rotation.set(0, 0, 0); o.updateMatrix(); const al = Math.sin(Math.PI * Math.min(1, s * 1.02)) ** 0.5 * 0.97; for (const m of [sc, sh]) { m.setMatrixAt(i, o.matrix); m.instanceColor.array[i * 3] = 0.25 + 0.75 * s; m.instanceColor.array[i * 3 + 2] = al; } });
    for (const m of [sc, sh]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
    EP.forEach((p, i) => { const s = (t / p.T + p.ph) % 1, tt = s * p.T; o.position.set(Math.cos(p.a) * p.vh * tt, craterY + p.vy * tt - 0.5 * 55 * tt * tt, Math.sin(p.a) * p.vh * tt); o.scale.setScalar(p.s * (1 - s * 0.6) * (o.position.y > craterY - 100 ? 1 : 0.01)); o.rotation.set(0, 0, 0); o.updateMatrix(); emb.setMatrixAt(i, o.matrix); }); emb.instanceMatrix.needsUpdate = true;
  } };
  return g;
}

// ---------- glacier: crevassed ice field running down to a bay with bobbing icebergs, seracs, moraine, twinkling glints ----------
export function glacier({ width = 2400, length = 3600, seed = 9, nx = 330, nz = 400 } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed), bayZ = -length * 0.4;
  const slope = (z) => 260 * sstep(-length * 0.4, length * 0.35, z);
  const hf = (x, z) => { const side = Math.abs(x) / (width * 0.5), valley = sstep(0.5, 1, side), cr = Math.pow(ridge(x * 0.006 + 5, z * 0.011, seed, 3), 3.5) * (1 - side) * sstep(-length * 0.3, length * 0.2, z); const ice = z < bayZ ? -18 : slope(z) + 8 * fbm(x * 0.01, z * 0.01, seed, 3) - 40 * cr; return ice + 260 * valley * valley + 120 * ridge(x * 0.003, z * 0.003, seed + 1, 4) * valley; };
  const geo = terrainGeo({ facet: true, w: width * 1.4, d: length, nx, nz, cz: 0, fn: hf, color: (x, z, h, ny, c) => { const side = Math.abs(x) / (width * 0.5), cr = Math.pow(ridge(x * 0.006 + 5, z * 0.011, seed, 3), 3.5) * (1 - side); c.set(0xeaf4ff).lerp(C(0xa8dcf0), 0.5 * fbm(x * 0.01, z * 0.01, seed, 2)).lerp(C(0x4aa8e0), Math.min(1, cr * 7)); c.lerp(C(0x7e7a78), sstep(0.62, 0.9, side) * (1 - ny * 0.2)).lerp(SNOW, sstep(0.55, 0.9, side) * sstep(150, 300, h) * 0.9); if (z < bayZ) c.set(0x6a8a98); } });
  g.add(Object.assign(new THREE.Mesh(geo, std()), { receiveShadow: true }));
  const waves = [[1, 0.3, 0.35, 60, 2], [0.2, 1, 0.25, 34, 1.7]];
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.6, 2400, 80, 80).rotateX(-Math.PI / 2), waterMaterial(U, { color: 0x1a6a9a, waves, foamAmt: 0.2, rough: 0.12, vertexColors: false, opacity: 0.96, emissive: 0x0a3a5a, emissiveIntensity: 0.3 })); bay.position.set(0, 0, bayZ - 1100); g.add(bay);
  // ice cliff terminus wall
  const wallG = new THREE.BoxGeometry(width * 0.52, 36, 40, 40, 6, 4), wp = wallG.attributes.position; for (let i = 0; i < wp.count; i++) wp.setXYZ(i, wp.getX(i) + 12 * noise2(wp.getY(i) * 0.3, wp.getX(i) * 0.1, 3), wp.getY(i) + 3 * noise2(wp.getX(i) * 0.2, 4, 4), wp.getZ(i) + 6 * noise2(wp.getX(i) * 0.1, wp.getY(i) * 0.3, 6)); wallG.computeVertexNormals();
  const term = new THREE.Mesh(wallG, new THREE.MeshStandardMaterial({ color: 0xcfeaf8, roughness: 0.35, flatShading: true })); term.position.set(0, 14, bayZ + 20); term.castShadow = true; g.add(term);
  // seracs (jagged ice blocks) + moraine boulders
  const sera = []; for (let i = 0; i < 140; i++) { const x = r.range(-width * 0.38, width * 0.38), z = r.range(bayZ + 80, length * 0.2); if (Math.pow(ridge(x * 0.006 + 5, z * 0.011, seed, 3), 3.5) > 0.3 && r() < 0.7) continue; sera.push({ x, y: hf(x, z) + 2, z, sx: r.range(3, 12), sy: r.range(5, 22), sz: r.range(3, 12), ry: r() * 3, rz: r.range(-0.2, 0.2), col: r.pick([0xe8f6ff, 0xc4e8f8, 0xa8d8f0]) }); }
  g.add(instanced(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.3, flatShading: true }), sera, { cast: true }));
  const bold = []; for (let i = 0; i < 160; i++) { const sd = r.sign(), x = sd * width * r.range(0.3, 0.52), z = r.range(bayZ + 100, length * 0.2); bold.push({ x, y: hf(x, z) + 1, z, s: r.range(1.5, 7), sy: r.range(0.6, 1), ry: r() * 6, col: r.pick([0x7a7672, 0x5a5654, 0x948c84]) }); }
  g.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), bold, { cast: true }));
  // icebergs bobbing in the bay
  const bergs = [], bg = new THREE.OctahedronGeometry(1, 1), bp = bg.attributes.position; for (let i = 0; i < bp.count; i++) bp.setXYZ(i, bp.getX(i) * (1 + 0.25 * Math.sin(i * 3.1)), bp.getY(i) * (1 + 0.2 * Math.cos(i * 1.7)), bp.getZ(i)); bg.computeVertexNormals();
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ color: r.pick([0xf4fbff, 0xd8f0fa, 0xbfe6f4]), roughness: 0.3, flatShading: true })); const s = r.range(20, 70); m.scale.set(s, s * r.range(0.35, 0.7), s * r.range(0.8, 1.4)); m.castShadow = true; g.add(m); bergs.push({ m, x: r.range(-width * 0.6, width * 0.6), z: bayZ - r.range(60, 1000), s, ph: r() * TAU }); }
  // glints
  const NG = 160, gl = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), NG); gl.frustumCulled = false; g.add(gl);
  const GP = Array.from({ length: NG }, () => { const x = r.range(-width * 0.4, width * 0.4), z = r.range(bayZ + 80, length * 0.2); return { x, y: hf(x, z) + 1.5, z, ph: r() * TAU, f: r.range(1, 3) }; });
  const o = new THREE.Object3D();
  g.userData = { realWidthM: width, realLengthM: length, heightAt: hf, update: (t) => {
    U.value = t;
    for (const b of bergs) { b.m.position.set(b.x + 2 * Math.sin(t * 0.1 + b.ph), bay.position.y + b.s * 0.08 + waveHeight(waves, b.x, b.z - bay.position.z, t) + 0.4 * Math.sin(t * 0.8 + b.ph), b.z); b.m.rotation.set(0.05 * Math.sin(t * 0.5 + b.ph), b.ph + 0.02 * t, 0.06 * Math.sin(t * 0.43 + b.ph * 2)); }
    GP.forEach((p, i) => { const k = Math.max(0, Math.sin(t * p.f + p.ph)) ** 8; o.position.set(p.x, p.y, p.z); o.scale.setScalar(0.01 + 2.2 * k); o.rotation.set(0, t, 0); o.updateMatrix(); gl.setMatrixAt(i, o.matrix); }); gl.instanceMatrix.needsUpdate = true;
  } };
  return g;
}

// ---------- rolling hills: patchwork fields, hedgerows, winding track, windmill (spins), grazing sheep, tree clumps ----------
export function windmill({ scale = 1 } = {}) {
  const g = new THREE.Group(), wm = new THREE.MeshStandardMaterial({ color: 0xf0e4cc, roughness: 0.85 }), body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 11, 12), wm); body.position.y = 5.5; body.castShadow = true; g.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3, 12), new THREE.MeshStandardMaterial({ color: 0x9a4a30, roughness: 0.8 })); cap.position.y = 12.5; cap.castShadow = true; g.add(cap);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2, 0.3), new THREE.MeshStandardMaterial({ color: 0x6a4a2a })); door.position.set(0, 1, 3.1); g.add(door);
  const rot = new THREE.Group(); rot.position.set(0, 11.2, 3.2); g.add(rot);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshStandardMaterial({ color: 0x6a4a2a })); rot.add(hub);
  for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; const spar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 11, 0.3), new THREE.MeshStandardMaterial({ color: 0x6a4a2a })); spar.position.y = 5.7; arm.add(spar); const sail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 7.5, 0.12), new THREE.MeshStandardMaterial({ color: 0xfff8ea, roughness: 0.8 })); sail.position.set(1.15, 6.4, 0.08); arm.add(sail); for (let k = 0; k < 6; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.16), new THREE.MeshStandardMaterial({ color: 0x6a4a2a })); bar.position.set(1.15, 3.2 + k * 1.2, 0.1); arm.add(bar); } rot.add(arm); }
  g.scale.setScalar(scale); g.userData = { realHeightM: 14 * scale, update: (t) => { rot.rotation.z = -t * 0.9; } }; return g;
}
export function rollingHills({ size = 700, seed = 7, nx = 200, sheep = 36, trees = 130 } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed);
  const hf = (x, z) => 18 * fbm(x * 0.0045, z * 0.0045, seed, 4) + 10 * Math.sin(x * 0.012 + 1) * Math.cos(z * 0.01) + 22 * sstep(150, 400, Math.hypot(x, z - 120)) * (0.5 + 0.7 * fbm(x * 0.003, z * 0.003, seed + 2, 3));
  const fieldCols = [0x6fb84a, 0xe0c850, 0x58a040, 0xb8c85a, 0x7ac060, 0xd8a840, 0x4f9a48, 0x9ac850];
  const pathX = (z) => 18 * Math.sin(z * 0.03) + 6 * Math.sin(z * 0.08);
  const geo = terrainGeo({ w: size, d: size, nx, nz: nx, fn: hf, color: (x, z, h, ny, c) => { const cell = fbm(x * 0.012 + 3, z * 0.012, seed + 5, 2), k = Math.floor(cell * 9.5 + 0.3 * noise2(x * 0.05, z * 0.05, 1)); c.set(fieldCols[((k % 8) + 8) % 8]); const stripe = 0.93 + 0.07 * Math.sin((x * 0.7 + z * 0.4) * (0.6 + (k % 3) * 0.2)); c.multiplyScalar(stripe * (0.9 + 0.2 * ny)); const hedge = Math.abs((cell * 9.5) % 1 - 0.5); if (hedge > 0.47) c.set(0x2f6a30); c.lerp(C(0xcdb88a), 1 - sstep(1.5, 4, Math.abs(x - pathX(z)))); if (h > 38) c.lerp(C(0x7a8a5a), sstep(38, 60, h)); } });
  g.add(Object.assign(new THREE.Mesh(geo, std()), { receiveShadow: true, castShadow: true }));
  const f = forest({ area: [-size / 2, -size / 2, size / 2, size / 2], count: trees, kinds: { round: 0.55, pine: 0.2, birch: 0.25 }, heightFn: hf, clear: [{ x: 0, z: 0, r: 22 }], nearR: 130, center: [0, 0], seed: seed + 1, clump: 0.5, scale: [1, 1.7], mask: (x, z) => Math.abs(x - pathX(z)) > 6 }); g.add(f);
  const wmill = windmill(); wmill.position.set(40, hf(40, -30), -30); g.add(wmill);
  // sheep: wool blob + dark face + legs, bobbing as they graze
  const sg = mergeGeos([part(new THREE.SphereGeometry(0.55, 8, 6), 0xf6f2e8, mtx(0, 0.75, 0, 0, 1, 0.9, 1.35)), part(new THREE.SphereGeometry(0.22, 6, 5), 0x3a3030, mtx(0, 0.85, 0.75)), ...[[-0.2, 0.3], [0.2, 0.3], [-0.2, -0.3], [0.2, -0.3]].map(([x, z]) => part(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 5), 0x3a3030, mtx(x, 0.25, z)))]);
  const sp = Array.from({ length: sheep }, () => { const cx = r.range(-1, 1) * 120 + 40, cz = r.range(-1, 1) * 120 + 60; return { cx, cz, ph: r() * TAU, ry: r() * 6, s: r.range(0.9, 1.2) }; });
  const sm = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), sheep); sm.castShadow = true; sm.frustumCulled = false; g.add(sm);
  const flowers = []; for (let i = 0; i < 900; i++) { const x = r.range(-size / 2, size / 2) * 0.5, z = r.range(-size / 2, size / 2) * 0.5; flowers.push({ x, y: hf(x, z) + 0.1, z, s: r.range(0.3, 0.7), col: r.pick([0xffffff, 0xffd23f, 0xff7aa8, 0xb07aff]) }); }
  g.add(instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.6 }), flowers));
  const cf = cloudField({ count: 7, area: [-1500, -1500, 1500, 400], altitude: [260, 480], width: [160, 340], seed: seed + 1, drift: 3 }); g.add(cf);
  const birds = birdFlock({ count: 9, pattern: 'v', radius: 150, altitude: 70, span: 1.3, seed: 2 }); g.add(birds);
  const o = new THREE.Object3D();
  g.userData = { realWidthM: size, heightAt: hf, update: (t) => {
    U.value = t; f.userData.update(t); wmill.userData.update(t); cf.userData.update(t); birds.userData.update(t);
    sp.forEach((p, i) => { const x = p.cx + 6 * Math.sin(t * 0.05 + p.ph), z = p.cz + 5 * Math.cos(t * 0.04 + p.ph), graze = Math.max(0, Math.sin(t * 0.8 + p.ph * 3)); o.position.set(x, hf(x, z), z); o.rotation.set(0.12 * graze, p.ry + 0.3 * Math.sin(t * 0.1 + p.ph), 0); o.scale.setScalar(p.s * 1.1); o.updateMatrix(); sm.setMatrixAt(i, o.matrix); }); sm.instanceMatrix.needsUpdate = true;
  } };
  return g;
}

// ---------- tropical island: green volcanic hill, beach ring, palms, lagoon + reef foam, boat, seagulls ----------
export function island({ radius = 260, height = 95, seed = 3, seaSize = 1800 } = {}) {
  const g = new THREE.Group(), U = uni(0), r = rng(seed), waves = OCEAN_WAVES(0.5).slice(0, 4);
  const hf = (x, z) => { const d = Math.hypot(x, z) / radius, a = Math.atan2(z, x), edge = 1 + 0.12 * Math.sin(a * 3 + seed) + 0.07 * noise2(a * 5, 3, seed), dd = d / edge; const cone = Math.pow(Math.max(0, 1 - dd * 1.4), 1.3) * height * (0.55 + 0.9 * ridge(x * 0.006, z * 0.006, seed, 3)); return 3.2 * (1 - sstep(0.7, 1.0, dd)) - 0.8 - 10 * sstep(1.0, 1.8, dd) + 6.5 * Math.exp(-(((dd - 1.62) / 0.07) ** 2)) + cone; };
  const geo = terrainGeo({ w: radius * 4.4, d: radius * 4.4, nx: 220, nz: 220, fn: (x, z) => hf(x, z), color: (x, z, h, ny, c) => { c.set(0xf2dca0); if (h < -0.2) c.set(0xc8c090).lerp(C(0x7a9a88), sstep(-0.5, -9, h)); if (h > 2) c.lerp(C(0x4faa48), sstep(2, 4, h)); if (h > 14) c.lerp(C(0x2f7a3a), sstep(14, 40, h)); if (h > 52) c.lerp(C(0x7a7068), sstep(52, 66, h) * (1 - ny * 0.4)); c.multiplyScalar(0.92 + 0.14 * fbm(x * 0.05, z * 0.05, seed, 2)); } });
  g.add(Object.assign(new THREE.Mesh(geo, std()), { receiveShadow: true, castShadow: true }));
  // sea: vertex colour by depth from the island function (turquoise lagoon -> deep blue)
  const sgeo = new THREE.PlaneGeometry(seaSize, seaSize, 300, 300).rotateX(-Math.PI / 2), sp = sgeo.attributes.position, sc = new Float32Array(sp.count * 3), cc = new THREE.Color();
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), z = sp.getZ(i), h = hf(x, z), dpt = Math.min(1, Math.max(0, -h / 12)); cc.set(0x5ae8d0).lerp(C(0x1fa0d8), sstep(0, 0.5, dpt)).lerp(C(0x0f5ca8), sstep(0.5, 1, dpt) * sstep(radius * 1.3, radius * 2.8, Math.hypot(x, z))); const reef = Math.exp(-(((Math.hypot(x, z) - radius * 1.62) / 14) ** 2)); cc.lerp(C(0xdffaf4), reef * 0.5); sc.set([cc.r, cc.g, cc.b], i * 3); }
  sgeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const sea = new THREE.Mesh(sgeo, waterMaterial(U, { color: 0xffffff, waves, foamAt: 0.6, foamAmt: 0.5, rough: 0.16, opacity: 0.93, emissive: 0x0a6a90, emissiveIntensity: 0.3 })); sea.position.y = 0.0; g.add(sea);
  // surf foam ring (pulsing) at the shoreline + reef break
  const mkRing = (R0, w, op) => { const SEG = 160, pos = [], aA = [], aC = [], idx = []; for (let i = 0; i <= SEG; i++) { const a = i / SEG * TAU, e = 1 + 0.12 * Math.sin(a * 3 + seed) + 0.07 * noise2(a * 5, 3, seed); for (const v of [-1, 0, 1]) { const rr = R0 * e * 1.0 + v * w; pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr); aA.push(v === 0 ? 1 : 0); aC.push(1, 1, 1); } if (i < SEG) { const q = i * 3; idx.push(q, q + 3, q + 1, q + 1, q + 3, q + 4, q + 1, q + 4, q + 2, q + 2, q + 4, q + 5); } } const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gm.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 1)); gm.setAttribute('aCol', new THREE.Float32BufferAttribute(aC, 3)); gm.setIndex(idx); const m = new THREE.Mesh(gm, softMaterial(U, { color: 0xffffff, opacity: op })); m.renderOrder = 6; m.frustumCulled = false; return m; };
  // find shoreline radius along an angle ~ where hf crosses 0
  const ring1 = mkRing(radius * 0.925, 3.5, 0.85), ring2 = mkRing(radius * 1.62, 7, 0.7); ring1.position.y = 0.15; ring2.position.y = 0.2; g.add(ring1, ring2);
  const palms = forest({ area: [-radius * 1.1, -radius * 1.1, radius * 1.1, radius * 1.1], count: 170, kinds: { palm: 0.75, round: 0.25 }, heightFn: hf, mask: (x, z) => hf(x, z) > 2.2 && hf(x, z) < 38, lod: 'auto', nearR: 160, center: [0, 80], clump: 0.15, seed: seed + 2, scale: [0.9, 1.4], leaf: 0x2f9a3e }); g.add(palms);
  const hut = new THREE.Group(); const hb = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 2.4, 10), new THREE.MeshStandardMaterial({ color: 0xc89a5a })); hb.position.y = 1.2; hut.add(hb); const hr = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.6, 10), new THREE.MeshStandardMaterial({ color: 0xa8843a })); hr.position.y = 3.6; hut.add(hr); const hx = radius * 0.55 * Math.cos(1), hz = radius * 0.55 * Math.sin(1); hut.position.set(hx, Math.max(2.5, hf(hx, hz)), hz); hut.castShadow = true; g.add(hut);
  const boat = sailboat(); boat.userData.sx = radius * 1.9; boat.userData.sz = radius * 0.5; g.add(boat);
  const gulls = birdFlock({ count: 8, pattern: 'soar', radius: 120, altitude: 50, span: 1.3, seed: 8 }); g.add(gulls);
  const cf = cloudField({ count: 6, area: [-1200, -1200, 1200, 1200], altitude: [500, 900], width: [300, 700], seed: seed + 1, drift: 4 }); g.add(cf);
  g.userData = { realHeightM: height, realWidthM: radius * 2, heightAt: hf, update: (t) => { U.value = t; palms.userData.update(t); gulls.userData.update(t); cf.userData.update(t); floatOn(boat, waves, boat.userData.sx - t * 1.2, boat.userData.sz, t, { yaw: -Math.PI / 2 }); ring1.material.uniforms.uOp.value = 0.6 + 0.3 * Math.sin(t * 0.9); ring1.scale.setScalar(1 + 0.012 * Math.sin(t * 0.9)); ring2.material.uniforms.uOp.value = 0.55 + 0.2 * Math.sin(t * 0.7 + 1); } };
  return g;
}
