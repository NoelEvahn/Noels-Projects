// Vegetation: instanced forests (pine / round / birch / palm / jungle giants) with LOD + travelling wind gusts, flower meadow,
// jungle (layered canopy, ferns, vines, light shafts), butterflies, single palm. Metres. Geometry + vertex colours only.
import * as THREE from 'three';
import { rng } from '../util.js';
import { uni, TAU, fbm, noise2, sstep, mix, mergeGeos, paint, mtx, instanced, sway, vcMat } from './nature_common.js';
import { softMaterial } from './nature_clouds.js';

const col = (hex) => new THREE.Color(hex);
const shade = (hex, f) => col(hex).multiplyScalar(f);
// vertical gradient on a merged geometry: dark inside/low, light on top
function grade(g, lowHex, highHex, y0, y1, snow = 0) {
  const lo = col(lowHex), hi = col(highHex), nrm = g.attributes.normal;
  return paint(g, (x, y, z, c, i) => { c.copy(lo).lerp(hi, Math.min(1, Math.max(0, (y - y0) / (y1 - y0)))); if (snow) { const k = sstep(0.25, 0.75, nrm.getY(i)) * snow; c.lerp(new THREE.Color(0xf4f8ff), k); } });
}
export function taperedTube(pts, r0, r1, radial = 6, caps = false) {
  const pos = [], idx = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), p = pts[i], tan = (pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)])).normalize();
    const a = Math.abs(tan.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), u = new THREE.Vector3().crossVectors(tan, a).normalize(), v = new THREE.Vector3().crossVectors(tan, u).normalize(), rr = mix(r0, r1, t);
    for (let j = 0; j < radial; j++) { const th = j / radial * TAU; pos.push(p.x + (Math.cos(th) * u.x + Math.sin(th) * v.x) * rr, p.y + (Math.cos(th) * u.y + Math.sin(th) * v.y) * rr, p.z + (Math.cos(th) * u.z + Math.sin(th) * v.z) * rr); }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) { const a = i * radial + j, b = i * radial + (j + 1) % radial, c = (i + 1) * radial + j, d = (i + 1) * radial + (j + 1) % radial; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const blob = (r, x, y, z, detail = 1, sy = 1) => { const g = new THREE.IcosahedronGeometry(r, detail); g.scale(1, sy, 1); g.translate(x, y, z); return g; };
const part = (g, color, m) => ({ g, color, m });

// ---------- tree prototypes (nominal heights in m) ----------
export const TREE_H = { pine: 12, round: 9, birch: 10, palm: 9, giant: 34, cypress: 11 };
export function treeGeo(kind, lod = 'high', { leaf, snow = 0, seed = 1 } = {}) {
  const r = rng(seed + (kind.length * 31));
  const hi = lod === 'high';
  if (kind === 'pine') {
    const H = 12, trunk = taperedTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, H * 0.55, 0)], 0.38, 0.12, hi ? 7 : 5), tiers = [];
    const nT = hi ? 5 : 3, base = leaf ?? 0x2f7d4a;
    for (let i = 0; i < nT; i++) { const k = i / nT, rad = 3.3 * (1 - k * 0.72) * (hi ? 1 : 1.1), h = H * (hi ? 0.34 : 0.42) , c = new THREE.ConeGeometry(rad, h, hi ? 9 : 6, 1, true); const p = c.attributes.position; for (let j = 0; j < p.count; j++) if (p.getY(j) < 0) p.setY(j, p.getY(j) - 0.25 * Math.sin(j * 7.3) * (hi ? 1 : 0)); c.translate(0, H * (0.22 + k * 0.62 / (1) * (hi ? 0.95 : 1)) + h / 2 - 0.2, 0); c.rotateY(r() * 3); tiers.push(part(c)); }
    const can = grade(mergeGeos(tiers), shade(base, 0.5).getHex(), shade(base, 1.3).getHex(), 1.5, H, snow);
    return mergeGeos([part(hi ? trunk : taperedTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2, 0)], 0.35, 0.2, 4), 0x6a4428), part(can)]);
  }
  if (kind === 'cypress') {
    const H = 11, can = new THREE.SphereGeometry(1, hi ? 10 : 6, hi ? 8 : 5); can.scale(1.5, H * 0.52, 1.5); can.translate(0, H * 0.5, 0);
    return mergeGeos([part(taperedTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.5, 0)], 0.3, 0.2, 5), 0x6a4428), part(grade(can, shade(leaf ?? 0x2f6a3a, 0.5).getHex(), shade(leaf ?? 0x2f6a3a, 1.25).getHex(), 0, H))]);
  }
  if (kind === 'round' || kind === 'birch') {
    const b = kind === 'birch', H = b ? 10 : 9, base = leaf ?? (b ? 0x9ccc50 : 0x4caf50), tr = b ? 0xeeeae0 : 0x7a5232;
    const trunk = taperedTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(r.range(-0.2, 0.2), H * 0.35, r.range(-0.2, 0.2)), new THREE.Vector3(0, H * 0.62, 0)], b ? 0.22 : 0.42, b ? 0.1 : 0.2, hi ? 7 : 5);
    const parts = [], blobs = b ? [[0, 0.78, 0, 0.26], [-0.2, 0.7, 0.1, 0.2], [0.22, 0.72, -0.05, 0.2], [0.05, 0.92, 0.0, 0.2], [0, 0.6, -0.2, 0.16]] : [[0, 0.74, 0, 0.36], [-0.28, 0.62, 0.08, 0.26], [0.3, 0.64, -0.04, 0.28], [0.04, 0.9, -0.08, 0.28], [-0.1, 0.66, -0.3, 0.24], [0.14, 0.68, 0.28, 0.25]];
    (hi ? blobs : blobs.slice(0, 3)).forEach(([x, y, z, s]) => parts.push(part(blob(s * H, x * H * 0.5, y * H, z * H * 0.5, hi ? 1 : 0))));
    const can = grade(mergeGeos(parts), shade(base, 0.55).getHex(), shade(base, 1.22).getHex(), H * 0.35, H * 1.05);
    const out = [part(trunk, tr), part(can)];
    if (b && hi) for (let i = 0; i < 5; i++) out.push(part(new THREE.CylinderGeometry(0.16 - i * 0.008, 0.16 - i * 0.008, 0.18, 6), 0x2f2b28, mtx(0, 0.9 + i * 1.3, 0)));
    return mergeGeos(out);
  }
  if (kind === 'giant') {  // rainforest emergent: buttressed trunk + wide umbrella crown
    const H = 34, trunk = taperedTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.4, H * 0.3, 0.2), new THREE.Vector3(0, H * 0.62, 0)], 1.35, 0.55, hi ? 8 : 5), parts = [], base = leaf ?? 0x2f8f48;
    for (let i = 0; i < 6; i++) { const a = i * 1.05, rr = 6 + 2 * Math.sin(i * 3), h = 0.3 * H + 2 * Math.sin(i * 5); parts.push(part(blob(rr, Math.cos(a) * 7, H * 0.76 + Math.sin(i * 2) * 1.6, Math.sin(a) * 7, hi ? 1 : 0, 0.45))); }
    parts.push(part(blob(8.5, 0, H * 0.82, 0, hi ? 1 : 0, 0.5)));
    const out = [part(trunk, 0x6a4a30), part(grade(mergeGeos(parts), shade(base, 0.5).getHex(), shade(base, 1.3).getHex(), H * 0.55, H * 0.98))];
    if (hi) for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4; out.push(part(taperedTube([new THREE.Vector3(Math.cos(a) * 3.4, 0.2, Math.sin(a) * 3.4), new THREE.Vector3(Math.cos(a) * 1.7, 4, Math.sin(a) * 1.7), new THREE.Vector3(Math.cos(a) * 0.8, 9, Math.sin(a) * 0.8)], 0.3, 0.08, 4), 0x6a4a30)); }
    return mergeGeos(out);
  }
  if (kind === 'palm') return palmGeo(hi, r, leaf);
  throw new Error('unknown tree kind ' + kind);
}
function frondGeo(L, w, droop, segs, rot, tilt) {
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const s = i / segs, x = s * L, y = Math.sin(s * 1.4) * L * 0.38 - s * s * L * droop, ww = w * Math.sin(Math.PI * Math.min(1, s * 0.92 + 0.08) ** 0.8);
    pos.push(x, y + 0.12 * ww, 0, x - 0.1 * ww, y - 0.18 * ww, ww, x - 0.1 * ww, y - 0.18 * ww, -ww);
    if (i < segs) { const b = i * 3; idx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4, b, b + 2, b + 3, b + 2, b + 5, b + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.rotateZ(tilt); g.rotateY(rot); return g;
}
function palmGeo(hi, r, leaf) {
  const H = 9, lean = r.range(0.8, 1.6), pts = Array.from({ length: hi ? 9 : 5 }, (_, i) => { const t = i / (hi ? 8 : 4); return new THREE.Vector3(lean * t * t * 1.6, t * H, 0); });
  const trunk = taperedTube(pts, 0.34, 0.2, hi ? 7 : 5), top = pts[pts.length - 1], out = [part(trunk, 0x9a7a52)];
  if (hi) for (let i = 1; i < 8; i++) out.push(part(new THREE.TorusGeometry(0.31 - i * 0.012, 0.04, 4, 8), 0x6a5236, mtx(pts[i].x, pts[i].y, pts[i].z, 0, 1, 1, 1, Math.PI / 2)));
  const fr = [], n = hi ? 11 : 7;
  for (let i = 0; i < n; i++) fr.push(part(frondGeo(4.6, 0.75, 0.85, hi ? 7 : 4, i / n * TAU + r() * 0.3, r.range(-0.12, 0.35)), undefined, mtx(top.x, top.y, top.z)));
  const fg = grade(mergeGeos(fr.map((f) => ({ ...f, color: 0xffffff }))), shade(leaf ?? 0x2f8f3a, 0.7).getHex(), shade(leaf ?? 0x2f8f3a, 1.35).getHex(), H - 2.5, H + 2.5);
  out.push(part(fg));
  if (hi) for (let i = 0; i < 4; i++) out.push(part(new THREE.SphereGeometry(0.2, 6, 5), 0x6a4a22, mtx(top.x + Math.cos(i * 1.6) * 0.3, top.y - 0.3, top.z + Math.sin(i * 1.6) * 0.3)));
  return mergeGeos(out);
}

// ---------- forest ----------
// kinds: {pine: w, round: w, birch: w, palm: w, giant: w, cypress: w}. lod: 'high' | 'low' | 'auto' (near ring high, far low).
export function forest({ area = [-200, -200, 200, 200], count = 1500, kinds = { pine: 0.5, round: 0.3, birch: 0.2 }, heightFn = null, clear = [], lod = 'auto', nearR = 90, center = [0, 0], seed = 1, scale = [0.8, 1.35], clump = 0.45, snow = 0, leaf = null, amp = 0.045, mask = null } = {}) {
  const r = rng(seed), g = new THREE.Group(), U = uni(0), [x0, z0, x1, z1] = area;
  const keys = Object.keys(kinds), tot = keys.reduce((s, k) => s + kinds[k], 0), lists = {};
  for (const k of keys) lists[k] = { high: [], low: [] };
  let placed = 0, tries = 0;
  while (placed < count && tries < count * 12) {
    tries++;
    const x = r.range(x0, x1), z = r.range(z0, z1);
    if (clear.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r)) continue;
    if (clump > 0 && fbm(x * 0.012, z * 0.012, seed + 5, 3) < clump * 0.9) continue;
    if (mask && !mask(x, z)) continue;
    let pick = r() * tot, kind = keys[0]; for (const k of keys) { pick -= kinds[k]; if (pick <= 0) { kind = k; break; } }
    const y = heightFn ? heightFn(x, z) : 0, s = r.range(scale[0], scale[1]), near = lod === 'high' || (lod === 'auto' && (x - center[0]) ** 2 + (z - center[1]) ** 2 < nearR * nearR);
    const tint = leaf ?? null, v = 0.82 + 0.36 * r();
    (near ? lists[kind].high : lists[kind].low).push({ x, y: y - 0.1, z, s, ry: r() * TAU, rx: r.range(-0.03, 0.03), rz: r.range(-0.03, 0.03), col: new THREE.Color(0xffffff).multiplyScalar(v).getHex() });
    placed++;
  }
  let tris = 0;
  for (const k of keys) for (const q of ['high', 'low']) {
    if (!lists[k][q].length) continue;
    const geo = treeGeo(k, q, { leaf, snow, seed: seed + 1 }), m = sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, flatShading: true, side: k === 'palm' ? THREE.DoubleSide : THREE.FrontSide }), U, { amp: k === 'palm' ? amp * 1.8 : amp, h: TREE_H[k], k: 0.02, speed: 1.3, flutter: k === 'palm' ? 0.05 : 0 });
    const im = instanced(geo, m, lists[k][q], { cast: q === 'high', receive: true }); g.add(im); tris += (geo.attributes.position.count / 3) * lists[k][q].length;
  }
  g.userData = { treeCount: placed, triangles: Math.round(tris), realHeightM: Math.max(...keys.map((k) => TREE_H[k])) * scale[1], update: (t) => { U.value = t; } };
  return g;
}

// single palm for hero use (sways; fronds flutter)
export function palmTree({ seed = 3, scale = 1, leaf } = {}) {
  const U = uni(0), g = new THREE.Group();
  const m = sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }), U, { amp: 0.07, h: 9, speed: 1.2, flutter: 0.07 });
  const mesh = new THREE.Mesh(treeGeo('palm', 'high', { leaf, seed }), m); mesh.castShadow = true; g.add(mesh); g.scale.setScalar(scale);
  g.userData = { realHeightM: 10 * scale, update: (t) => { U.value = t; } }; return g;
}

// ---------- butterflies ----------
export function butterflies({ count = 18, area = [-12, -12, 12, 12], height = [0.6, 2.2], seed = 5, colors = [0xff8a2b, 0xffd23f, 0x6ac0ff, 0xff5c8a, 0xffffff, 0xb07aff], size = 0.07, heightFn = null } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const wing = new THREE.BufferGeometry(); wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, 1, 0, 0.9, 0.95, 0, -0.1, 0, 0, -0.1, 0.35, 0, 0, 0.9, 0, -0.75, 0.25, 0, -0.55], 3));
  wing.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 5, 3, 5, 4].slice(0, 12)); wing.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 5, 3, 5, 6].map((v) => v)); wing.computeVertexNormals();
  const wm = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide, emissive: 0x222222 });
  const wL = new THREE.InstancedMesh(wing, wm, count), wR = new THREE.InstancedMesh(wing, wm, count), body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.1, 0.5, 3, 5), new THREE.MeshStandardMaterial({ color: 0x2a2220 }), count);
  const c = new THREE.Color(); const P = [];
  for (let i = 0; i < count; i++) { c.set(r.pick(colors)); wL.setColorAt(i, c); wR.setColorAt(i, c); P.push({ cx: r.range(area[0], area[2]), cz: r.range(area[1], area[3]), ax: r.range(2, 6), az: r.range(2, 6), fx: r.range(0.1, 0.25), fz: r.range(0.12, 0.3), ph: r() * TAU, h: r.range(height[0], height[1]), ff: r.range(7, 11) }); }
  [wL, wR, body].forEach((m) => { m.frustumCulled = false; m.castShadow = false; g.add(m); });
  const _a = new THREE.Matrix4(), _b = new THREE.Matrix4(), _c = new THREE.Matrix4(), V = new THREE.Vector3(), F = new THREE.Vector3(), Rr = new THREE.Vector3(), Up = new THREE.Vector3();
  const pos = (p, t) => [p.cx + Math.sin(t * p.fx * TAU + p.ph) * p.ax, 0, p.cz + Math.sin(t * p.fz * TAU * 1.3 + p.ph * 2) * p.az];
  const update = (t) => {
    P.forEach((p, i) => {
      const a = pos(p, t - 0.1), b = pos(p, t + 0.1), x = (a[0] + b[0]) / 2, z = (a[2] + b[2]) / 2, y = (heightFn ? heightFn(x, z) : 0) + p.h + 0.35 * Math.sin(t * 2.1 + p.ph * 3) + 0.15 * Math.sin(t * p.ff);
      F.set(b[0] - a[0], 0, b[2] - a[2]).normalize(); Rr.set(F.z, 0, -F.x); Up.crossVectors(F, Rr);
      _a.makeBasis(Rr, Up, F); _a.setPosition(x, y, z); _c.makeScale(size, size, size); _a.multiply(_c); body.setMatrixAt(i, _a);
      const th = 0.15 + 0.95 * Math.abs(Math.sin(t * p.ff * 0.5 + p.ph));
      _b.makeRotationZ(th); _b.premultiply(_c.makeScale(1, 1, 1)); _b.premultiply(_a); wR.setMatrixAt(i, _b);
      _b.makeScale(-1, 1, 1); _c.makeRotationZ(th); _b.multiply(_c); _b.premultiply(_a); wL.setMatrixAt(i, _b);
    });
    wL.instanceMatrix.needsUpdate = wR.instanceMatrix.needsUpdate = body.instanceMatrix.needsUpdate = true;
  };
  update(0); g.userData = { update }; return g;
}

// ---------- flower meadow: tall grass + 3 flower kinds + butterflies + drifting seeds. area x/z, density per m2 ----------
function flowerGeo(kind) {
  const stem = mergeGeos([part(taperedTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, 0.2, 0), new THREE.Vector3(0, 0.42, 0)], 0.012, 0.008, 4), 0x3f8a2e), part(new THREE.ConeGeometry(0.05, 0.12, 4), 0x3f8a2e, mtx(0.05, 0.12, 0, 0, 1, 1, 0.4, 0, -1.1))]);
  const P = [];
  if (kind === 'daisy') { for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, pg = new THREE.SphereGeometry(0.035, 5, 4); pg.scale(1.8, 0.35, 0.7); P.push(part(pg, 0xffffff, mtx(Math.cos(a) * 0.065, 0.44, Math.sin(a) * 0.065, -a, 1, 1, 1, 0, 0.12))); } P.push(part(new THREE.SphereGeometry(0.035, 6, 5), 0xffc23a, mtx(0, 0.455, 0, 0, 1, 0.7))); }
  else if (kind === 'tulip') { const cup = new THREE.SphereGeometry(0.06, 7, 6); cup.scale(0.85, 1.35, 0.85); P.push(part(cup, 0xffffff, mtx(0, 0.47, 0))); for (let i = 0; i < 3; i++) P.push(part(new THREE.ConeGeometry(0.03, 0.08, 4), 0xffffff, mtx(Math.cos(i * 2.1) * 0.035, 0.55, Math.sin(i * 2.1) * 0.035))); }
  else { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, pg = new THREE.SphereGeometry(0.045, 6, 5); pg.scale(1.1, 0.3, 1); P.push(part(pg, 0xffffff, mtx(Math.cos(a) * 0.05, 0.43, Math.sin(a) * 0.05, -a, 1, 1, 1, 0, 0.2))); } P.push(part(new THREE.SphereGeometry(0.03, 6, 5), 0x2a2020, mtx(0, 0.44, 0, 0, 1, 0.6))); }
  return { stem, head: mergeGeos(P) };
}
export function meadow({ area = [-20, -20, 20, 20], density = 16, flowerK = 0.22, height = 0.7, seed = 7, heightFn = null, clear = [], butterfliesN = 16, palette = null } = {}) {
  const r = rng(seed), g = new THREE.Group(), U = uni(0), [x0, z0, x1, z1] = area;
  const n = Math.round((x1 - x0) * (z1 - z0) * density), grass = [], fl = { daisy: [], tulip: [], poppy: [] };
  const cols = palette ?? { daisy: [0xffffff, 0xfff2a0, 0xffd6f0], tulip: [0xff4a6a, 0xffa030, 0xb07aff, 0xff7ac0], poppy: [0xff3b2f, 0xffffff, 0xffe14a] };
  for (let i = 0; i < n; i++) {
    const x = r.range(x0, x1), z = r.range(z0, z1); if (clear.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r)) continue;
    const y = heightFn ? heightFn(x, z) : 0, v = fbm(x * 0.2, z * 0.2, seed, 2);
    if (r() < flowerK * (0.4 + 1.2 * v)) { const k = r.pick(['daisy', 'tulip', 'poppy']); fl[k].push({ x, y, z, s: r.range(0.8, 1.7) * height / 0.7, ry: r() * TAU, rx: r.range(-0.12, 0.12), rz: r.range(-0.12, 0.12) }); }
    else grass.push({ x, y, z, s: r.range(0.7, 1.4), sy: r.range(0.7, 1.35) * height / 0.7, ry: r() * TAU, col: new THREE.Color().setHSL(0.26 + 0.05 * v - 0.02 * r(), 0.55, 0.78 + 0.35 * r() * 0.3).getHex() });
  }
  // grass tuft: 5 tapered blades graded dark->light
  const blades = []; for (let i = 0; i < 5; i++) { const h = 0.55 + 0.35 * r(), b = new THREE.ConeGeometry(0.03, h, 3, 1); b.translate(0, h / 2, 0); b.rotateZ(r.range(-0.4, 0.4)); b.rotateX(r.range(-0.4, 0.4)); b.rotateY(r() * 6); b.translate(r.range(-0.07, 0.07), 0, r.range(-0.07, 0.07)); blades.push(part(b, 0xffffff)); }
  const gg = grade(mergeGeos(blades), 0x1f5a1a, 0x9be05a, 0, 0.9);
  g.add(instanced(gg, sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), U, { amp: 0.3, h: 0.8, k: 0.5, speed: 1.9 }), grass, { receive: true }));
  for (const k of Object.keys(fl)) { if (!fl[k].length) continue; fl[k].forEach((p, i) => { p.col = cols[k][i % cols[k].length]; });
    const fg = flowerGeo(k), sm = { amp: 0.28, h: 0.5, k: 0.5, speed: 2.1 };
    g.add(instanced(fg.stem, sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), U, sm), fl[k].map((p) => ({ ...p, col: undefined }))));
    g.add(instanced(fg.head, sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), U, sm), fl[k])); }
  const bf = butterflies({ count: butterfliesN, area: [x0 + 2, z0 + 2, x1 - 2, z1 - 2], height: [height * 0.8, height * 2.4], seed: seed + 3, size: 0.09, heightFn }); g.add(bf);
  g.userData = { realHeightM: height, update: (t) => { U.value = t; bf.userData.update(t); } };
  return g;
}
// flowers are tinted per instance: keep stems green by storing vertex colour (white = petals take instance colour, green stays green)
function paintFlower(geo) { return geo;
  /* unused */  const c = geo.attributes.color; for (let i = 0; i < c.count; i++) { if (c.getG(i) > c.getR(i) * 1.1 && c.getG(i) > c.getB(i) * 1.1) { /* stem: keep */ } else if (c.getR(i) > 0.9 && c.getG(i) > 0.9 && c.getB(i) > 0.9) { /* white petals keep (tinted by instance) */ } else { c.setXYZ(i, 1, 1, 1); } } }

// ---------- jungle: emergent giants + mid canopy + palms, ferns, broadleaf plants, hanging vines, light shafts ----------
export function jungle({ area = [-80, -80, 80, 80], giants = 14, trees = 160, seed = 21, heightFn = null, clear = [{ x: 0, z: 0, r: 4 }], mist = true } = {}) {
  const r = rng(seed), g = new THREE.Group(), U = uni(0), [x0, z0, x1, z1] = area;
  const f1 = forest({ area, count: giants, kinds: { giant: 1 }, lod: 'high', clump: 0, seed, heightFn, clear, scale: [0.8, 1.3], amp: 0.02 }), f2 = forest({ area, count: trees, kinds: { round: 0.5, palm: 0.4, birch: 0.1 }, lod: 'auto', nearR: 50, clump: 0, seed: seed + 1, heightFn, clear, leaf: 0x2f9a3e, scale: [0.9, 1.5] });
  g.add(f1, f2);
  // ferns / broadleaf understory (instanced fans)
  const fern = []; for (let i = 0; i < 9; i++) fern.push(part(frondGeo(1.6, 0.16, 0.5, 5, i / 9 * TAU, 0.45), 0xffffff));
  const leafBig = []; for (let i = 0; i < 4; i++) leafBig.push(part(frondGeo(1.5, 0.55, 0.9, 5, i / 4 * TAU + 0.4, 0.2), 0xffffff, mtx(0, 0.5, 0)));
  const place = (n, big) => { const out = []; for (let i = 0; i < n; i++) { const x = r.range(x0, x1), z = r.range(z0, z1); if (clear.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.5) ** 2)) continue; out.push({ x, y: heightFn ? heightFn(x, z) : 0, z, s: big ? r.range(0.8, 1.6) : r.range(0.7, 1.4), ry: r() * TAU, col: new THREE.Color().setHSL(0.3 + 0.04 * r(), 0.6, 0.35 + 0.2 * r()).getHex() }); } return out; };
  const dens = ((x1 - x0) * (z1 - z0)) / 6400;
  g.add(instanced(grade(mergeGeos(fern), 0x14501c, 0x7ad04a, 0, 1.2), sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), U, { amp: 0.12, h: 1.2, k: 0.2, speed: 1.7, flutter: 0.03 }), place(Math.round(700 * dens), false), { receive: true }));
  g.add(instanced(grade(mergeGeos(leafBig), 0x14501c, 0x6ac040, 0.2, 1.4), sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), U, { amp: 0.1, h: 1.4, k: 0.2, speed: 1.5 }), place(Math.round(260 * dens), true), { receive: true }));
  // red heliconia / orchid dots among the ferns for colour
  const hel = place(Math.round(140 * dens), false).map((p, i) => ({ ...p, s: 0.8, col: [0xff3b3b, 0xffa030, 0xff5cba, 0xffe14a][i % 4] }));
  const hs = mergeGeos([part(taperedTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.5, 0), new THREE.Vector3(0.05, 0.9, 0)], 0.03, 0.02, 4), 0x3f8a2e)]), hh = mergeGeos([0, 1, 2, 3].map((i) => part(new THREE.ConeGeometry(0.09, 0.3, 5), 0xffffff, mtx(0.05 + i * 0.01, 0.78 + i * 0.12, 0, 0, 1, 1, 0.5, 0, -0.5 + i * 0.1))));
  const hsw = { amp: 0.15, h: 1, k: 0.2, speed: 1.6 };
  g.add(instanced(hs, sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }), U, hsw), hel.map((p) => ({ ...p, col: undefined }))), instanced(hh, sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), U, hsw), hel));
  // hanging vines from the giants' crowns (static geometry that sways in the shader)
  const vp = []; for (let i = 0; i < 40; i++) { const gx = r.range(x0, x1), gz = r.range(z0, z1), top = 22 + r() * 8, len = r.range(8, 20); const pts = Array.from({ length: 7 }, (_, j) => new THREE.Vector3(gx + Math.sin(j * 1.3 + i) * 0.5, top - j / 6 * len, gz + Math.cos(j * 1.1 + i) * 0.5)); vp.push(part(taperedTube(pts, 0.07, 0.03, 4), 0x2f6a2a)); }
  const vm = sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), U, { amp: 0.0, h: 1 }); const vines = new THREE.Mesh(mergeGeos(vp), vm); vines.castShadow = false; g.add(vines);
  // light shafts through the canopy
  const shaftM = softMaterial(U, { color: 0xfff2b0, opacity: 0.2, additive: true, shimmer: 0.25 }), shafts = new THREE.Group();
  for (let i = 0; i < 9; i++) { const geo = new THREE.CylinderGeometry(1.2, 4.5, 36, 10, 1, true); const al = [], n = geo.attributes.position.count; for (let j = 0; j < n; j++) al.push(geo.attributes.position.getY(j) > 0 ? 0.0 : 1.0); geo.setAttribute('aA', new THREE.Float32BufferAttribute(al.map((v) => v * 0.9), 1)); geo.setAttribute('aCol', new THREE.Float32BufferAttribute(new Array(n * 3).fill(1), 3));
    const m = new THREE.Mesh(geo, shaftM); m.position.set(r.range(x0, x1) * 0.6, 18, r.range(z0, z1) * 0.6); m.rotation.z = 0.28; m.rotation.x = 0.1; m.renderOrder = 5; shafts.add(m); }
  g.add(shafts);
  g.userData = { realHeightM: 45, update: (t) => { U.value = t; f1.userData.update(t); f2.userData.update(t); shafts.children.forEach((m, i) => { m.rotation.z = 0.28 + 0.03 * Math.sin(t * 0.4 + i); }); } };
  return g;
}
