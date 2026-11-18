// Nature kit: grass, flowers, rocks, pebbles, trees, bushes, logs, and groundCover() to dress any outdoor floor.
// Geometry + vertex colours only (no textures, series rule). Deterministic: seeded rng; wind is a pure function of t
// (call kit.update(t) every frame; it only sets a shader uniform, so thousands of blades cost nothing on the CPU).
import * as THREE from 'three';
import { mat, add, sph, cyl, cone, rng, shade } from '../util.js';

// ---------- helpers ----------
// merge non-indexed copies of several geometries (positions, normals, optional per-vertex colour)
function merge(parts) {
  const geos = parts.map(({ g, color }) => { const n = g.index ? g.toNonIndexed() : g.clone(); if (color !== undefined) { const c = new THREE.Color(color), a = new Float32Array(n.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } n.setAttribute('color', new THREE.BufferAttribute(a, 3)); } return n; });
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'color']) {
    if (!geos.every((g) => g.attributes[k])) continue;
    const total = geos.reduce((s, g) => s + g.attributes[k].array.length, 0), arr = new Float32Array(total); let o = 0;
    for (const g of geos) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
    out.setAttribute(k, new THREE.BufferAttribute(arr, 3));
  }
  return out;
}
// shift a geometry's vertex colours from dark at the base (y=0) to light at the tip (y=h): grass and leaves read as 3D, no texture
function gradeY(g, base, tip, h) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3), a = new THREE.Color(base), b = new THREE.Color(tip), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) { t.copy(a).lerp(b, Math.min(1, Math.max(0, p.getY(i) / h))); c.set([t.r, t.g, t.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
// wind: bend vertices by height, phase by instance position. uniforms.uTime is shared by every kit material.
export const WIND = { uTime: { value: 0 }, strength: { value: 1 } };
function windy(m, amp = 0.08) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WIND.uTime; sh.uniforms.uWind = WIND.strength;
    sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 ip = vec3(0.0);
      #endif
      float hk = max(0.0, position.y); float ph = ip.x * 0.7 + ip.z * 0.9;
      transformed.x += sin(uTime * 1.7 + ph) * ${amp.toFixed(3)} * hk * hk * uWind;
      transformed.z += cos(uTime * 1.3 + ph * 1.3) * ${(amp * 0.6).toFixed(3)} * hk * hk * uWind;`);
  };
  m.customProgramCacheKey = () => 'windy' + amp;
  return m;
}
const place = (mesh, list, fn) => { const o = new THREE.Object3D(), c = new THREE.Color(); list.forEach((p, i) => { fn(o, p, c, i); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); if (p.col !== undefined) mesh.setColorAt(i, c.set(p.col)); }); mesh.instanceMatrix.needsUpdate = true; return mesh; };

// ---------- grass ----------
// one tuft = 7 tapered, leaning blades (dark base -> light tip)
function tuftGeo(r, h = 0.32) {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const hh = h * r.range(0.6, 1.15), b = new THREE.ConeGeometry(0.022, hh, 3, 2); b.translate(0, hh / 2, 0);
    b.rotateZ(r.range(-0.35, 0.35)); b.rotateX(r.range(-0.35, 0.35)); b.translate(r.range(-0.07, 0.07), 0, r.range(-0.07, 0.07)); parts.push({ g: b });
  }
  return gradeY(merge(parts), 0x24601c, 0x8fd14f, h);
}
export function grass(points, { seed = 1, scale = 1, tint = 0xffffff } = {}) {
  const r = rng(seed), m = windy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), 0.35);
  const mesh = new THREE.InstancedMesh(tuftGeo(r), m, points.length);
  place(mesh, points, (o, p, c) => { o.position.set(p[0], p[1] ?? 0, p[2]); o.rotation.set(0, r() * 6.28, 0); o.scale.setScalar(scale * r.range(0.7, 1.35)); c.set(tint).multiplyScalar(r.range(0.85, 1.1)); });
  for (let i = 0; i < points.length; i++) mesh.setColorAt(i, new THREE.Color(tint).multiplyScalar(0.85 + 0.25 * r()));
  mesh.receiveShadow = true; mesh.castShadow = false; return mesh;
}

// ---------- flowers (stem + 5 petals + centre) ----------
const FLOWER_COLS = [0xff5c8a, 0xffd23f, 0xffffff, 0x9b6bff, 0xff8a2b, 0x5ab4ff];
export function flowers(points, { seed = 2, scale = 1, colors = FLOWER_COLS } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const stemG = new THREE.CylinderGeometry(0.008, 0.012, 0.26, 4); stemG.translate(0, 0.13, 0);
  const headParts = []; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283, pg = new THREE.SphereGeometry(0.035, 6, 4); pg.scale(1, 0.35, 0.6); pg.translate(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04); headParts.push({ g: pg, color: 0xffffff }); }
  const cg = new THREE.SphereGeometry(0.025, 6, 4); cg.scale(1, 0.6, 1); headParts.push({ g: cg, color: 0xffc23a });
  const headG = merge(headParts); headG.translate(0, 0.27, 0);
  const stems = new THREE.InstancedMesh(stemG, windy(new THREE.MeshStandardMaterial({ color: 0x3f8a2e, roughness: 0.8 }), 0.4), points.length);
  const heads = new THREE.InstancedMesh(headG, windy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), 0.4), points.length);
  const o = new THREE.Object3D(), c = new THREE.Color();
  points.forEach((p, i) => { o.position.set(p[0], p[1] ?? 0, p[2]); o.rotation.set(r.range(-0.15, 0.15), r() * 6.28, r.range(-0.15, 0.15)); o.scale.setScalar(scale * r.range(0.8, 1.3)); o.updateMatrix(); stems.setMatrixAt(i, o.matrix); heads.setMatrixAt(i, o.matrix); heads.setColorAt(i, c.set(r.pick(colors))); });
  g.add(stems, heads); return g;
}

// ---------- rocks & pebbles (displaced icosahedra, flat-shaded) ----------
function rockGeo(r, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + 0.18 * Math.sin(v.x * 3.1 + r() * 0.2) * Math.cos(v.z * 2.7) + r.range(-0.06, 0.06); p.setXYZ(i, v.x * k, v.y * k * 0.62, v.z * k); }
  g.computeVertexNormals(); g.translate(0, 0.25, 0); return g;
}
export function rock({ seed = 3, size = 0.6, color = 0x8f8a84 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const m = add(g, rockGeo(r), new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true }), [0, 0, 0], [0, r() * 6.28, 0], size);
  if (size > 0.4) add(g, sph(size * 0.42, 10, 6, 0, 6.283, 0, 1.2), mat(0x5f9a3a, { rough: 1 }), [size * 0.15, size * 0.38, 0], [0, 0, 0.2], [1, 0.35, 1]);   // moss cap
  m.castShadow = true; return g;
}
export function pebbles(points, { seed = 4, scale = 1, colors = [0x9a948c, 0xb8b0a4, 0x7d7871, 0xc9c1b4] } = {}) {
  const r = rng(seed), mesh = new THREE.InstancedMesh(rockGeo(r, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), points.length);
  place(mesh, points.map((p) => ({ p, col: r.pick(colors) })), (o, q, c) => { o.position.set(q.p[0], (q.p[1] ?? 0) - 0.02, q.p[2]); o.rotation.set(0, r() * 6.28, 0); o.scale.setScalar(scale * r.range(0.05, 0.13)); c.set(q.col); });
  mesh.receiveShadow = true; return mesh;
}

// ---------- trees ----------
// round deciduous tree: tapered trunk with two branches, canopy of overlapping blobs graded dark (inside/bottom) to light (top)
export function roundTree({ seed = 5, h = 2.6, leaf = 0x4caf50, trunk = 0x7a5232 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const tg = new THREE.CylinderGeometry(0.09 * h / 2.6, 0.17 * h / 2.6, h * 0.62, 9); tg.translate(0, h * 0.31, 0);
  add(g, tg, mat(trunk, { rough: 0.9 }));
  for (const s of [-1, 1]) add(g, cyl(0.035, 0.06, h * 0.3, 6), mat(trunk, { rough: 0.9 }), [s * h * 0.08, h * 0.55, 0], [0, 0, -s * 0.7]);
  for (const s of [-1, 1]) add(g, sph(0.12, 8, 6), mat(shade(trunk, 0.8)), [s * 0.12, 0.04, 0.05 * s], [0, 0, 0], [1.4, 0.5, 1]);   // root flare
  const blobs = [[0, 0.78, 0, 0.62], [-0.38, 0.66, 0.1, 0.44], [0.4, 0.68, -0.05, 0.46], [0.05, 0.98, -0.1, 0.46], [-0.15, 0.7, -0.35, 0.4], [0.18, 0.72, 0.36, 0.42], [-0.3, 0.9, 0.25, 0.32]];
  const parts = blobs.map(([x, y, z, s]) => { const b = new THREE.IcosahedronGeometry(s * h * 0.5, 2); b.translate(x * h * 0.5, y * h, z * h * 0.5); return { g: b }; });
  const cg = gradeY(merge(parts), shade(leaf, 0.55), shade(leaf, 1.25), h * 1.3);
  const cm = add(g, cg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
  cm.rotation.y = r() * 6.28; return g;
}
// pine: trunk + four stacked, slightly drooping cone tiers
export function pineTree({ seed = 6, h = 3.2, leaf = 0x2f7d4a, trunk = 0x6a4428 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  add(g, cyl(0.08, 0.14, h * 0.35, 8), mat(trunk, { rough: 0.9 }), [0, h * 0.17, 0]);
  const parts = []; for (let i = 0; i < 4; i++) { const k = i / 4, c = new THREE.ConeGeometry(h * (0.34 - k * 0.07), h * 0.36, 9, 1); c.translate(0, h * (0.36 + k * 0.17), 0); parts.push({ g: c }); }
  add(g, gradeY(merge(parts), shade(leaf, 0.6), shade(leaf, 1.2), h), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), [0, 0, 0], [0, r() * 6.28, 0]);
  return g;
}
// birch: white trunk with dark bands (geometry rings), light airy canopy
export function birchTree({ seed = 7, h = 3.0, leaf = 0x9ccc50 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  add(g, cyl(0.06, 0.1, h * 0.75, 8), mat(0xeeeae0, { rough: 0.7 }), [0, h * 0.37, 0]);
  for (let i = 0; i < 7; i++) add(g, cyl(0.075 - i * 0.003, 0.075 - i * 0.003, 0.025, 8), mat(0x3a3530), [0, 0.2 + i * h * 0.09 + r.range(-0.05, 0.05), 0], [0, 0, r.range(-0.1, 0.1)], [1, 1, 0.98]);
  const parts = []; for (let i = 0; i < 6; i++) { const b = new THREE.IcosahedronGeometry(h * r.range(0.12, 0.18), 1); b.translate(r.range(-0.3, 0.3) * h * 0.4, h * r.range(0.68, 0.98), r.range(-0.3, 0.3) * h * 0.4); parts.push({ g: b }); }
  add(g, gradeY(merge(parts), shade(leaf, 0.6), shade(leaf, 1.2), h), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
  return g;
}
// bush clump: low blobs, optional berries/flowers dotted on top
export function bushClump({ seed = 8, s = 1, leaf = 0x3f9f46, dots = null } = {}) {
  const r = rng(seed), g = new THREE.Group(), parts = [];
  for (let i = 0; i < 5; i++) { const b = new THREE.IcosahedronGeometry(r.range(0.25, 0.4) * s, 1); b.translate(r.range(-0.35, 0.35) * s, r.range(0.2, 0.35) * s, r.range(-0.25, 0.25) * s); parts.push({ g: b }); }
  add(g, gradeY(merge(parts), shade(leaf, 0.55), shade(leaf, 1.2), 0.7 * s), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
  if (dots) for (let i = 0; i < 8; i++) { const a = r() * 6.28; add(g, sph(0.04 * s, 6, 4), mat(dots), [Math.cos(a) * 0.38 * s, r.range(0.45, 0.6) * s, Math.sin(a) * 0.3 * s]); }
  return g;
}
export function log({ len = 1.4, r0 = 0.16, seed = 9 } = {}) {
  const g = new THREE.Group();
  add(g, cyl(r0, r0 * 1.05, len, 10), mat(0x6a4428, { rough: 0.95 }), [0, r0, 0], [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) add(g, cyl(r0 * 0.92, r0 * 0.92, 0.02, 10), mat(0xc79a62), [s * len / 2, r0, 0], [0, 0, Math.PI / 2]);
  add(g, sph(0.06, 6, 4), mat(0xe8d8b8), [0.2, r0 * 2, 0.04]); add(g, cyl(0.012, 0.016, 0.06, 5), mat(0xe8e0d0), [0.2, r0 * 1.94, 0.04]);   // mushroom
  return g;
}
export function stump({ r0 = 0.22 } = {}) { const g = new THREE.Group(); add(g, cyl(r0, r0 * 1.2, 0.3, 10), mat(0x6a4428, { rough: 0.95 }), [0, 0.15, 0]); add(g, cyl(r0 * 0.92, r0 * 0.92, 0.02, 10), mat(0xc79a62), [0, 0.305, 0]); return g; }

// ---------- groundCover: fill a rectangle with grass + flowers + pebbles (+ optional rocks/logs), keeping clear zones ----------
// heightFn(x, z) puts each tuft on uneven ground (hills). Lawns where characters walk: scale ~0.45 so shoes stay visible.
// area: [x0, z0, x1, z1]; clear: [{x, z, r}] circles kept empty (paths, characters' marks, tables); density: tufts per m²
export function groundCover({ area = [-10, -10, 10, 10], y = 0, heightFn = null, clear = [], density = 6, flowerK = 0.08, pebbleK = 0.03, rocks = 0, logs = 0, seed = 11, tint = 0xffffff, scale = 1 } = {}) {
  const r = rng(seed), g = new THREE.Group(), [x0, z0, x1, z1] = area;
  const free = (x, z, pad = 0) => clear.every((c) => (x - c.x) ** 2 + (z - c.z) ** 2 > (c.r + pad) ** 2);
  const n = Math.round((x1 - x0) * (z1 - z0) * density), gp = [], fp = [], pp = [];
  for (let i = 0; i < n; i++) { const x = r.range(x0, x1), z = r.range(z0, z1); if (!free(x, z)) continue; const yy = heightFn ? heightFn(x, z) : y; gp.push([x, yy, z]); if (r() < flowerK) fp.push([x + r.range(-0.1, 0.1), yy, z + r.range(-0.1, 0.1)]); if (r() < pebbleK) pp.push([x + 0.1, yy, z - 0.1]); }
  if (gp.length) g.add(grass(gp, { seed, tint, scale }));
  if (fp.length) g.add(flowers(fp, { seed: seed + 1, scale }));
  if (pp.length) g.add(pebbles(pp, { seed: seed + 2, scale }));
  for (let i = 0; i < rocks; i++) { const x = r.range(x0, x1), z = r.range(z0, z1); if (!free(x, z, 0.6)) continue; const k = rock({ seed: seed + 10 + i, size: r.range(0.25, 0.7) }); k.position.set(x, heightFn ? heightFn(x, z) : y, z); g.add(k); }
  for (let i = 0; i < logs; i++) { const x = r.range(x0, x1), z = r.range(z0, z1); if (!free(x, z, 1)) continue; const k = log({ seed: seed + 30 + i }); k.position.set(x, heightFn ? heightFn(x, z) : y, z); k.rotation.y = r() * 3.14; g.add(k); }
  return g;
}
// a row/ring of mixed trees (backgrounds, field edges). points: [[x, z], ...]
export function treeLine(points, { seed = 12, y = 0, scale = 1, kinds = ['round', 'round', 'pine', 'birch'] } = {}) {
  const r = rng(seed), g = new THREE.Group();
  points.forEach(([x, z], i) => { const k = r.pick(kinds), s = scale * r.range(0.8, 1.25); const t = k === 'pine' ? pineTree({ seed: seed + i, h: 3.2 * s }) : k === 'birch' ? birchTree({ seed: seed + i, h: 3 * s }) : roundTree({ seed: seed + i, h: 2.6 * s, leaf: r.pick([0x4caf50, 0x5cb85c, 0x43a047, 0x7cb342]) }); t.position.set(x, y, z); g.add(t); });
  return g;
}
// advance the wind (call once per frame with the film time)
export const updateNature = (t) => { WIND.uTime.value = t; };
