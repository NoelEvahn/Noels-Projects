// Landmarks pack: shared toolkit (lofted towers, lattice beams, instancing, flags, water, boats, crowds, traffic, bases).
// Everything is deterministic (seeded rng) and every animation is a closed-form function of t.
// 1 unit = 1 m. Geometry + vertex colours only (no image maps); canvas text only for height boards.
import * as THREE from 'three';
import { rng, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade, canvasTex, textBoard, clamp, lerp, smooth } from '../util.js';
export { THREE, rng, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade, canvasTex, textBoard, clamp, lerp, smooth };

export const TAU = Math.PI * 2;
const _Y = new THREE.Vector3(0, 1, 0);

// ---------- materials ----------
const _lm = new Map();
// layered material (polygonOffset) so ground decals never z-fight at skyscraper distances. layer 1..6
export function lmat(color, o = {}) {
  const k = JSON.stringify([color, o]);
  if (_lm.has(k)) return _lm.get(k);
  const m = new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, emissive: o.emissive ?? 0, emissiveIntensity: o.ei ?? 1,
    transparent: o.opacity !== undefined && o.opacity < 1, opacity: o.opacity ?? 1, flatShading: !!o.flat,
    side: o.side ?? THREE.FrontSide, vertexColors: !!o.vc,
  });
  if (o.layer) { m.polygonOffset = true; m.polygonOffsetFactor = -o.layer; m.polygonOffsetUnits = -o.layer * 2; }
  if (o.depthWrite === false) m.depthWrite = false;
  _lm.set(k, m);
  return m;
}
export const vcMat = (o = {}) => lmat(0xffffff, { vc: true, rough: 0.8, ...o });

export const COL = {
  glass: 0x7fb4d8, glassDark: 0x3f6f95, steel: 0xb9c3cf, concrete: 0xd9d4c7, stone: 0xe3d7b8, sand: 0xe6cf8e, grass: 0x6dbb55, grassDark: 0x4f9a46,
  paving: 0xd8d0be, road: 0x474a55, water: 0x2f8fc4, waterDeep: 0x1f6aa5, white: 0xf7f4ee, red: 0xe5483a, orange: 0xe8742a, brick: 0xb8553a,
  trunk: 0x6a4a2e, leaf: 0x58b04a, leaf2: 0x3f9a52, gold: 0xf5b82e, rock: 0x9c9486, copper: 0x6ab59a,
};

// ---------- animation registry ----------
export function animator() {
  const fns = [];
  return { add: (f) => { fns.push(f); return f; }, update: (t) => { for (let i = 0; i < fns.length; i++) fns[i](t); }, fns };
}
// set up a landmark Group with real size metadata and an update(t)
export function finish(g, A, meta) {
  Object.assign(g.userData, meta);
  g.userData.update = (t) => A.update(t);
  g.update = g.userData.update;
  g.name = meta.name || g.name;
  return g;
}
export const frac = (x) => x - Math.floor(x);

// ---------- geometry helpers ----------
// ring polygon helpers (points are [x,z], counter-clockwise seen from +Y)
export const ngon = (n, r, rot = 0, sx = 1, sz = 1) => Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * TAU; return [Math.cos(a) * r * sx, Math.sin(a) * r * sz]; });
export const rectPts = (w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
export const scalePts = (p, s) => p.map(([x, z]) => [x * s, z * s]);
export const lerpPts = (a, b, t) => a.map((p, i) => [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)]);
export const rotPts = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return p.map(([x, z]) => [x * c - z * s, x * s + z * c]); };

// Build a geometry from an array of {y, pts, col?} rings with the same point count (closed). smooth=false => flat facets.
export function loft(rings, { cap = true, smooth = false, capBottom = false } = {}) {
  const n = rings[0].pts.length, pos = [], col = [], idx = [];
  const hasCol = rings.some((r) => r.col !== undefined);
  const c = new THREE.Color();
  rings.forEach((r) => { c.set(r.col ?? 0xffffff); r.pts.forEach(([x, z]) => { pos.push(x, r.y, z); col.push(c.r, c.g, c.b); }); });
  for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < n; i++) {
    const a = k * n + i, b = k * n + (i + 1) % n, d = (k + 1) * n + i, e = (k + 1) * n + (i + 1) % n;
    idx.push(a, d, b, b, d, e);
  }
  if (cap) { const base = pos.length / 3; const top = rings[rings.length - 1]; let cx = 0, cz = 0; top.pts.forEach(([x, z]) => { cx += x; cz += z; }); cx /= n; cz /= n; pos.push(cx, top.y, cz); c.set(top.col ?? 0xffffff); col.push(c.r, c.g, c.b); const ci = base; const o = (rings.length - 1) * n; for (let i = 0; i < n; i++) idx.push(ci, o + (i + 1) % n, o + i); }
  if (capBottom) { const base = pos.length / 3; const b0 = rings[0]; let cx = 0, cz = 0; b0.pts.forEach(([x, z]) => { cx += x; cz += z; }); cx /= n; cz /= n; pos.push(cx, b0.y, cz); c.set(b0.col ?? 0xffffff); col.push(c.r, c.g, c.b); for (let i = 0; i < n; i++) idx.push(base, i, (i + 1) % n); }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (hasCol) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  if (!smooth) { g = g.toNonIndexed(); }
  g.computeVertexNormals();
  return g;
}
// quick prism / frustum between two polygons
export function frustum(p0, p1, h, y0 = 0, o = {}) { return loft([{ y: y0, pts: p0 }, { y: y0 + h, pts: p1 }], o); }

// lathe from [r,y] profile
export function lathe(profile, seg = 32, smooth = true) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  if (!smooth) { const f = g.toNonIndexed(); f.computeVertexNormals(); return f; }
  return g;
}

// merge many geometries (non-indexed or indexed, same attribute set) into one
export function merge(geos) {
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; list.forEach((g) => { n += g.attributes.position.count; });
  const hasC = list.some((g) => g.attributes.color);
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Cc = hasC ? new Float32Array(n * 3).fill(1) : null;
  let o = 0;
  list.forEach((g) => { P.set(g.attributes.position.array, o * 3); if (g.attributes.normal) N.set(g.attributes.normal.array, o * 3); if (hasC && g.attributes.color) Cc.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(P, 3)); r.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  if (hasC) r.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
  return r;
}
// bake position/rotation/scale into a geometry (colour optional -> vertex colour)
export function xf(g, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, color) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), Array.isArray(scale) ? new THREE.Vector3(...scale) : new THREE.Vector3(scale, scale, scale));
  const r = g.clone(); r.applyMatrix4(m);
  if (color !== undefined) { const c = new THREE.Color(color), n = r.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } r.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
  return r;
}

// Thin ledge bands wrapped around a lofted shape. polyAt(y)->pts. Each band: lip below, wall, lip above.
export function ledgeBands(polyAt, y0, y1, count, { frac: fr = 0.28, ex = 1.012, color = 0xffffff } = {}) {
  const pos = [], idx = [];
  const addRing = (y, s) => { const p = polyAt(y), b = pos.length / 3; p.forEach(([x, z]) => pos.push(x * s, y, z * s)); return b; };
  const n = polyAt(y0).length;
  const strip = (a, b) => { for (let i = 0; i < n; i++) { const i2 = (i + 1) % n; idx.push(a + i, b + i, a + i2, a + i2, b + i, b + i2); } };
  const step = (y1 - y0) / count;
  for (let k = 0; k < count; k++) {
    const ya = y0 + k * step, yb = ya + step * fr, e = Math.max(0.15, (ex - 1));
    const a1 = addRing(ya, 1), a2 = addRing(ya, ex), b2 = addRing(yb, ex), b1 = addRing(yb, 1);
    strip(a2, a1); strip(a2, b2); strip(b1, b2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const f = g.toNonIndexed(); f.computeVertexNormals(); return f;
}

// An InstancedMesh from a list of {p, r, s, c}
export function instances(parent, geo, material, list, { shadow = false } = {}) {
  const m = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  const o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((it, i) => {
    o.position.set(...(it.p ?? [0, 0, 0])); o.rotation.set(...(it.r ?? [0, 0, 0]));
    if (Array.isArray(it.s)) o.scale.set(...it.s); else o.scale.setScalar(it.s ?? 1);
    o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    if (it.c !== undefined) m.setColorAt(i, c.set(it.c));
  });
  m.count = list.length; m.instanceMatrix.needsUpdate = true;
  m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false;
  parent.add(m); return m;
}

// Beams: list of [ax,ay,az, bx,by,bz, thickness, (depth)] rendered as one InstancedMesh of boxes (lattice girders, cables, rails)
export function beams(parent, material, list, { shadow = false, round = false } = {}) {
  const geo = round ? new THREE.CylinderGeometry(0.5, 0.5, 1, 6) : new THREE.BoxGeometry(1, 1, 1);
  const m = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  const o = new THREE.Object3D(), A = new THREE.Vector3(), B = new THREE.Vector3(), d = new THREE.Vector3();
  list.forEach((b, i) => {
    A.set(b[0], b[1], b[2]); B.set(b[3], b[4], b[5]); d.subVectors(B, A); const len = d.length() || 0.001;
    o.position.copy(A).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(_Y, d.multiplyScalar(1 / len));
    o.scale.set(b[6], len, b[7] ?? b[6]); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
  });
  m.count = list.length; m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; parent.add(m); return m;
}
// X-braced lattice between two polylines of equal length (left/right post positions at heights). Returns beam list.
export function xBrace(L, R, t, { horizontals = true, diag = true } = {}) {
  const out = [];
  for (let i = 0; i < L.length - 1; i++) {
    if (diag) { out.push([...L[i], ...R[i + 1], t]); out.push([...R[i], ...L[i + 1], t]); }
    if (horizontals) out.push([...L[i], ...R[i], t]);
  }
  if (horizontals) out.push([...L[L.length - 1], ...R[R.length - 1], t]);
  return out;
}

// ---------- flags ----------
// waving flag (geometry only, quad colours). colorFn(u,v)->hex. pole side on -x. update(t) displaces vertices.
export function makeFlag(w, h, colorFn, { nx = 10, ny = 6, amp = 0.12, speed = 3, phase = 0, double = true } = {}) {
  const pos = [], col = [], base = [];
  const c = new THREE.Color();
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / ny, v1 = (j + 1) / ny;
    c.set(colorFn((u0 + u1) / 2, (v0 + v1) / 2));
    const P = (u, v) => [u * w, (0.5 - v) * h];
    const a = P(u0, v0), b = P(u1, v0), d = P(u0, v1), e = P(u1, v1);
    for (const q of [a, d, b, b, d, e]) { pos.push(q[0], q[1], 0); col.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const arr = g.attributes.position.array; const orig = Float32Array.from(arr);
  const mesh = new THREE.Mesh(g, lmat(0xffffff, { vc: true, side: double ? THREE.DoubleSide : THREE.FrontSide, rough: 0.9 }));
  mesh.castShadow = false; mesh.frustumCulled = false;
  mesh.userData.wave = (t) => {
    for (let i = 0; i < arr.length; i += 3) {
      const u = orig[i] / w; const k = u * (0.2 + 0.8 * u);
      arr[i + 2] = Math.sin(t * speed - orig[i] * (5 / w) + phase) * amp * w * k + Math.sin(t * speed * 1.7 - orig[i + 1] * 2 + phase) * amp * 0.3 * w * k;
      arr[i] = orig[i] * (1 - 0.04 * Math.sin(t * speed - u * 4 + phase) * u);
    }
    g.attributes.position.needsUpdate = true;
  };
  mesh.userData.wave(0);
  return mesh;
}
export const FLAGS = {
  usa: (u, v) => (u < 0.4 && v < 0.54 ? 0x2a3a8a : (Math.floor(v * 13) % 2 === 0 ? 0xd32f2f : 0xffffff)),
  uk: (u, v) => { const dx = Math.abs(u - 0.5), dy = Math.abs(v - 0.5); if (dx < 0.07 || dy < 0.1) return 0xd32f2f; if (dx < 0.12 || dy < 0.17) return 0xffffff; return 0x273a8a; },
  france: (u) => (u < 0.333 ? 0x2a3a8a : u < 0.666 ? 0xffffff : 0xd32f2f),
  russia: (u, v) => (v < 0.333 ? 0xffffff : v < 0.666 ? 0x2a4aa0 : 0xd32f2f),
  china: (u, v) => (u < 0.3 && v < 0.5 ? 0xffd23f : 0xd32f2f),
  japan: (u, v) => (Math.hypot((u - 0.5) * 1.5, v - 0.5) < 0.22 ? 0xd32f2f : 0xffffff),
  taiwan: (u, v) => (u < 0.5 && v < 0.5 ? (Math.hypot((u - 0.25) * 1.5, v - 0.25) < 0.13 ? 0xffffff : 0x2a3a8a) : 0xd32f2f),
  uae: (u, v) => (u < 0.25 ? 0xd32f2f : v < 0.333 ? 0x1f9a4a : v < 0.666 ? 0xffffff : 0x151515),
  aus: (u, v) => (u < 0.5 && v < 0.5 ? (Math.abs(u - 0.25) < 0.035 || Math.abs(v - 0.25) < 0.05 ? 0xffffff : 0x2a3a8a) : 0x2a3a8a),
  italy: (u) => (u < 0.333 ? 0x1f9a4a : u < 0.666 ? 0xffffff : 0xd32f2f),
  peru: (u) => (u < 0.333 || u > 0.666 ? 0xd32f2f : 0xffffff),
  egypt: (u, v) => (v < 0.333 ? 0xd32f2f : v < 0.666 ? 0xffffff : 0x151515),
  india: (u, v) => (v < 0.333 ? 0xff9933 : v < 0.666 ? 0xffffff : 0x138808),
  brazil: (u, v) => (Math.hypot((u - 0.5) * 1.3, v - 0.5) < 0.2 ? 0x2a3a8a : (Math.abs(u - 0.5) * 1.6 + Math.abs(v - 0.5) < 0.5 ? 0xffd23f : 0x1f9a4a)),
  khmer: (u, v) => (v < 0.25 || v > 0.75 ? 0x2a3a8a : 0xd32f2f),
  red: () => 0xd32f2f, white: () => 0xffffff, blue: () => 0x2a5ac8, yellow: () => 0xffd23f,
};
export function flagPole(parent, A, x, y, z, h, w, colorFn, o = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const pr = Math.max(0.04, h * 0.012);
  add(g, cyl(pr, pr * 1.3, h, 8), lmat(0xd8dde4, { metal: 0.6, rough: 0.35 }), [0, h / 2, 0]);
  add(g, sph(pr * 2, 8, 6), lmat(COL.gold, { metal: 0.5, rough: 0.4 }), [0, h + pr * 1.5, 0]);
  const f = makeFlag(w, w * (o.aspect ?? 0.62), colorFn, { phase: o.phase ?? x, amp: o.amp ?? 0.1, ...o });
  f.position.set(pr, h - w * (o.aspect ?? 0.62) * 0.5 - pr * 2, 0); g.add(f);
  if (o.rotY) g.rotation.y = o.rotY;
  A.add(f.userData.wave ? ((t) => f.userData.wave(t)) : () => {});
  parent.add(g); return g;
}

// ---------- blinking lights ----------
export function blinker(parent, A, x, y, z, color, size, { period = 2, phase = 0, duty = 0.5, base = 0.25, peak = 3 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: peak, roughness: 0.5 });
  const s = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), m); s.position.set(x, y, z); s.castShadow = false; parent.add(s);
  A.add((t) => { const k = frac(t / period + phase); m.emissiveIntensity = k < duty ? peak : base; });
  return s;
}

// ---------- water ----------
// rippling water plane (vertex displacement, flat-shaded facets). update via returned .wave(t)
export function makeWater(w, d, { seg = 40, amp = 0.4, color = COL.water, speed = 1, scale = 1, opacity } = {}) {
  const g = new THREE.PlaneGeometry(w, d, seg, Math.max(2, Math.round(seg * d / w))); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, orig = Float32Array.from(p.array);
  const m = new THREE.Mesh(g, lmat(color, { rough: 0.25, metal: 0.15, flat: true, layer: 1, ...(opacity !== undefined ? { opacity, depthWrite: false } : {}) }));
  m.receiveShadow = true;
  m.userData.wave = (t) => {
    for (let i = 0; i < p.count; i++) { const x = orig[i * 3], z = orig[i * 3 + 2]; p.setY(i, (Math.sin(x * 0.11 / scale + t * speed * 1.3) * Math.cos(z * 0.09 / scale + t * speed) + 0.5 * Math.sin((x + z) * 0.2 / scale + t * speed * 1.9)) * amp + amp * 1.6); }
    p.needsUpdate = true; g.computeVertexNormals();
  };
  m.userData.wave(0); return m;
}

// ---------- crowds / tourists ----------
// instanced tiny people (capsule body + sphere head) strolling back and forth. area: {x,z,w,d} rectangle or {x,z,r}. scale 1 = 1.7 m
export function makeCrowd(parent, A, n, area, { seed = 1, scale = 1, speed = 0.6, colors, y = 0, ring = false } = {}) {
  const r = rng(seed);
  colors = colors ?? [0xe53935, 0x2f6fd6, 0xffd23f, 0x2fa66a, 0xff8a2b, 0x8a52c9, 0xffffff, 0x2bb7b0, 0xff5c8a];
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.75, 3, 8), lmat(0xffffff, { rough: 0.8 }), n);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 8, 6), lmat(0xf2b98f, { rough: 0.7 }), n);
  const P = [];
  const skins = [0xf2b98f, 0xd99a6c, 0x9b6338, 0xf8d5b8];
  for (let i = 0; i < n; i++) {
    let x, z;
    if (area.r !== undefined) { const a = r() * TAU, rr = Math.sqrt(r()) * area.r; x = area.x + Math.cos(a) * rr; z = area.z + Math.sin(a) * rr; }
    else { x = area.x + (r() - 0.5) * area.w; z = area.z + (r() - 0.5) * area.d; }
    const dir = r() * TAU, span = (0.4 + r() * 1.2) * scale * 3, ph = r() * TAU, sp = speed * (0.6 + r() * 0.8);
    P.push({ x, z, dx: Math.cos(dir), dz: Math.sin(dir), span, ph, sp, s: scale * (0.8 + r() * 0.35) });
    body.setColorAt(i, new THREE.Color(colors[Math.floor(r() * colors.length)]));
    head.setColorAt(i, new THREE.Color(skins[Math.floor(r() * skins.length)]));
  }
  const o = new THREE.Object3D();
  const set = (t) => {
    for (let i = 0; i < n; i++) {
      const p = P[i], k = Math.sin(t * p.sp + p.ph) * p.span, bob = Math.abs(Math.sin(t * p.sp * 6 + p.ph)) * 0.07 * p.s;
      const px = p.x + p.dx * k, pz = p.z + p.dz * k, yaw = Math.atan2(p.dx, p.dz) + (Math.cos(t * p.sp + p.ph) < 0 ? Math.PI : 0);
      o.position.set(px, y + 0.57 * p.s + bob, pz); o.rotation.set(0, yaw, 0); o.scale.setScalar(p.s); o.updateMatrix(); body.setMatrixAt(i, o.matrix);
      o.position.set(px, y + 1.36 * p.s + bob, pz); o.updateMatrix(); head.setMatrixAt(i, o.matrix);
    }
    body.instanceMatrix.needsUpdate = true; head.instanceMatrix.needsUpdate = true;
  };
  set(0);
  for (const m of [body, head]) { m.frustumCulled = false; m.castShadow = false; parent.add(m); }
  A.add(set); return { body, head };
}

// ---------- traffic ----------
// cars driving round a closed path. pathFn(u in 0..1) -> [x,z,heading]; length in metres for speed
export function makeTraffic(parent, A, n, pathFn, length, { seed = 1, speed = 8, scale = 1, y = 0.02, colors, type = 'car' } = {}) {
  const r = rng(seed);
  colors = colors ?? [0xe53935, 0x2f6fd6, 0xffd23f, 0xffffff, 0x2fa66a, 0x8a52c9, 0xff8a2b, 0x2bb7b0];
  const geo = merge([xf(rbox(1.9, 0.62, 4.2, 0.2), [0, 0.6, 0], [0, 0, 0], 1), xf(rbox(1.6, 0.55, 2.2, 0.2), [0, 1.1, -0.1], [0, 0, 0], 1, 0xbfe3ff)]);
  // body colours via instance colour; cabin colour is baked light
  const body = new THREE.InstancedMesh(rbox(1.9, 0.62, 4.2, 0.2), lmat(0xffffff, { rough: 0.4, metal: 0.2 }), n);
  const cab = new THREE.InstancedMesh(rbox(1.6, 0.55, 2.2, 0.2), lmat(0xbfe3ff, { rough: 0.15, metal: 0.3 }), n);
  const items = [];
  for (let i = 0; i < n; i++) { items.push({ u0: i / n + r() * 0.5 / n, v: 0.85 + r() * 0.3 }); body.setColorAt(i, new THREE.Color(colors[Math.floor(r() * colors.length)])); }
  const o = new THREE.Object3D();
  const set = (t) => {
    for (let i = 0; i < n; i++) {
      const it = items[i], u = frac(it.u0 + t * speed * it.v / length), [x, z, h] = pathFn(u);
      o.position.set(x, y + 0.45 * scale, z); o.rotation.set(0, h, 0); o.scale.setScalar(scale); o.updateMatrix(); body.setMatrixAt(i, o.matrix);
      o.position.set(x, y + 0.45 * scale, z); o.translateY(0.55 * scale); o.translateZ(-0.1 * scale); o.updateMatrix(); cab.setMatrixAt(i, o.matrix);
    }
    body.instanceMatrix.needsUpdate = true; cab.instanceMatrix.needsUpdate = true;
  };
  set(0);
  for (const m of [body, cab]) { m.frustumCulled = false; m.castShadow = false; parent.add(m); }
  A.add(set); return body;
}
export const ringPath = (cx, cz, R) => (u) => { const a = u * TAU; return [cx + Math.cos(a) * R, cz + Math.sin(a) * R, -a]; };
export const linePath = (x0, z0, x1, z1, lane = 2.5) => { const hd = Math.atan2(x1 - x0, z1 - z0), px = Math.cos(hd), pz = -Math.sin(hd); return (u) => { // out and back, right-hand lanes
  const out = u < 0.5, s = out ? u * 2 : 2 - u * 2, side = out ? 1 : -1; return [lerp(x0, x1, s) + px * side * lane, lerp(z0, z1, s) + pz * side * lane, out ? hd : hd + Math.PI]; }; };

// ---------- boats ----------
export function boatMesh(len, color = 0xffffff, { sail = false, cabinColor = 0xe53935 } = {}) {
  const g = new THREE.Group(), w = len * 0.3;
  const hull = lathe([[0.001, -len * 0.5], [w * 0.5, -len * 0.38], [w * 0.5, len * 0.2], [w * 0.2, len * 0.5]], 10); // lathe along y then rotate
  hull.rotateX(Math.PI / 2);
  add(g, rbox(w, len * 0.12, len, len * 0.05), lmat(color, { rough: 0.5 }), [0, len * 0.05, 0]);
  add(g, rbox(w * 0.9, len * 0.02, len * 0.96, len * 0.01), lmat(0xb98a55), [0, len * 0.11, 0]);
  if (sail) { add(g, cyl(len * 0.012, len * 0.012, len * 0.9, 6), lmat(0xd8d8d8), [0, len * 0.5, len * 0.03]); const s = new THREE.Mesh(new THREE.BufferGeometry(), lmat(0xffffff, { side: THREE.DoubleSide, rough: 0.9 })); const v = new Float32Array([0, len * 0.14, 0, 0, len * 0.9, 0, 0, len * 0.14, -len * 0.38]); s.geometry.setAttribute('position', new THREE.BufferAttribute(v, 3)); s.geometry.computeVertexNormals(); s.position.set(0, 0, len * 0.04); s.castShadow = true; g.add(s); }
  else add(g, rbox(w * 0.6, len * 0.14, len * 0.25, len * 0.03), lmat(cabinColor), [0, len * 0.2, -len * 0.1]);
  return g;
}
// boats circling / crossing; path(u)->[x,z,heading]
export function makeBoats(parent, A, list, { y = 0, bob = 0.25 } = {}) {
  list.forEach((b, i) => {
    const m = boatMesh(b.len, b.color, { sail: b.sail, cabinColor: b.cabin }); parent.add(m);
    A.add((t) => { const u = frac(b.u0 + t * b.speed / b.length); const [x, z, h] = b.path(u); m.position.set(x, y + Math.sin(t * 1.6 + i) * bob * (b.len / 10), z); m.rotation.set(Math.sin(t * 1.3 + i) * 0.03, h, Math.sin(t * 1.1 + i * 2) * 0.04); });
  });
}

// ---------- foliage ----------
export function trees(parent, pts, { seed = 3, size = 1, kinds = 'round', colors = [COL.leaf, COL.leaf2, 0x6cc04a] } = {}) {
  const r = rng(seed), trunk = [], crown = [], crown2 = [];
  pts.forEach(([x, z, s = 1, yy = 0]) => {
    const sc = size * s * (0.8 + r() * 0.5), kind = kinds === 'mix' ? (r() < 0.35 ? 'pine' : 'round') : kinds;
    trunk.push({ p: [x, yy + 1.4 * sc, z], s: [0.35 * sc, 2.8 * sc, 0.35 * sc], c: COL.trunk });
    if (kind === 'pine') { crown2.push({ p: [x, yy + 5.2 * sc, z], s: [2.0 * sc, 5.2 * sc, 2.0 * sc], c: colors[Math.floor(r() * 2)] }); }
    else crown.push({ p: [x, yy + 4.2 * sc, z], s: [2.1 * sc, 2.3 * sc, 2.1 * sc], c: colors[Math.floor(r() * colors.length)] });
  });
  if (trunk.length) { const m = instances(parent, new THREE.CylinderGeometry(0.5, 0.7, 1, 6), lmat(0xffffff, { rough: 0.9 }), trunk); }
  if (crown.length) instances(parent, new THREE.IcosahedronGeometry(1, 1), lmat(0xffffff, { rough: 0.85 }), crown);
  if (crown2.length) instances(parent, new THREE.ConeGeometry(1, 1, 7), lmat(0xffffff, { rough: 0.85 }), crown2);
}
// scatter points helper
export function scatter(n, fn, seed = 1) { const r = rng(seed), out = []; let guard = 0; while (out.length < n && guard++ < n * 40) { const p = fn(r); if (p) out.push(p); } return out; }

// ---------- ground / bases ----------
// slab (thick cylinder) so edges read; returns the mesh. y is the TOP surface
export function slab(parent, r, h, color, { y = 0, seg = 48, layer = 1, square = false, rough = 0.9, d } = {}) {
  const g = square ? box(r * 2, h, (d ?? r) * 2) : cyl(r, r * 1.003, h, seg);
  const m = new THREE.Mesh(g, lmat(color, { layer, rough })); m.position.y = y - h / 2; m.receiveShadow = true; m.castShadow = false; parent.add(m); return m;
}
export function ring(parent, r0, r1, color, y, { seg = 64, layer = 2 } = {}) {
  const g = new THREE.RingGeometry(r0, r1, seg); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, lmat(color, { layer })); m.position.y = y; m.receiveShadow = true; parent.add(m); return m;
}
export function disc(parent, r, color, y, { seg = 64, layer = 1 } = {}) {
  const g = new THREE.CircleGeometry(r, seg); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, lmat(color, { layer })); m.position.y = y; m.receiveShadow = true; parent.add(m); return m;
}
export function patch(parent, w, d, color, x, y, z, { layer = 2, ry = 0 } = {}) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, lmat(color, { layer })); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; parent.add(m); return m;
}

// A standard tower-plaza base: lawn disc, paved ring plaza, ring road with traffic, trees, crowd. radius in metres.
export function plazaBase(g, A, R, { seed = 1, lawn = COL.grass, paving = COL.paving, traffic = true, crowd = 40, ringR = 0.8, treeN = 26, treeSize, paveR = 0.5 } = {}) {
  const ts = treeSize ?? Math.max(1, R / 55);
  slab(g, R * 1.05, Math.max(0.3, R * 0.006), lawn, { y: -0.01 * R * 0.01, layer: 1 });
  disc(g, R * paveR, paving, 0.02 + R * 0.0004, { layer: 2 });
  const rr = R * ringR;
  if (traffic) {
    ring(g, rr - R * 0.035, rr + R * 0.035, COL.road, 0.03 + R * 0.0006, { layer: 3 });
    ring(g, rr - R * 0.004, rr + R * 0.004, 0xffd23f, 0.04 + R * 0.0009, { layer: 4 });
    makeTraffic(g, A, Math.max(6, Math.round(R / 14)), ringPath(0, 0, rr), TAU * rr, { seed: seed + 5, speed: Math.max(9, R * 0.12), scale: Math.max(1, R / 90), y: 0.04 + R * 0.0009 });
  }
  const pts = scatter(treeN, (r) => { const a = r() * TAU, d = R * (traffic ? (0.55 + r() * 0.2) : (0.62 + r() * 0.35)); if (traffic && Math.abs(d - rr) < R * 0.06) return null; return [Math.cos(a) * d, Math.sin(a) * d]; }, seed);
  trees(g, pts, { seed, size: ts });
  if (crowd) makeCrowd(g, A, crowd, { x: 0, z: 0, r: R * paveR * 0.95 }, { seed: seed + 9, scale: Math.max(1, R / 95), y: 0.03 + R * 0.0006, speed: 0.5 });
}

// ---------- text boards ----------
export function heightBoard(title, sub, { w = 3, h = 1.4, bg = '#10244a', accent = '#ffd23f' } = {}) {
  return textBoard(w, h, [{ text: title, size: 0.2, y: 0.36, color: accent, font: 'Anton, Impact, sans-serif', weight: 400 }, { text: sub, size: 0.105, y: 0.74, color: '#ffffff', font: 'Anton, Impact, sans-serif', weight: 400 }], { bg, border: accent, px: 512 });
}

// ---------- camera prep (for big landmarks the default near plane z-fights) ----------
export function prepCamera(cam, distance) { cam.near = Math.max(0.05, distance / 1200); cam.far = Math.max(cam.far, distance * 30); cam.updateProjectionMatrix(); return cam; }
// For library screenshots/previews: widen shadow frustum, set camera near/far from distance to the scene, add haze
export function bigStage(ctx, R, camPos) {
  const st = ctx?.stage; if (!st) return;
  const k = st.key; const c = k.shadow.camera;
  Object.assign(c, { left: -R, right: R, top: R, bottom: -R, near: -R * 2.2, far: R * 2.2 }); c.updateProjectionMatrix();
  k.shadow.bias = -0.0003; k.shadow.normalBias = Math.max(0.03, R * 0.0015); k.shadow.radius = 2;
  k.shadow.mapSize.set(2048, 2048);
  if (st.ground) st.ground.scale.setScalar(Math.max(1, R / 40 * 3));
  const d = Math.hypot(...camPos);
  st.scene.onBeforeRender = (r, s, cam) => { const near = Math.max(0.05, d / 1500); if (cam.near !== near) { cam.near = near; cam.far = Math.max(2000, d * 30); cam.updateProjectionMatrix(); } };
}

// ---------- city grid (toy blocks with water tanks, streets, taxis) ----------
// fills a disc of radius R with rounded boxy buildings on a street grid; `clear` = [[cx,cz,hw,hd],...] rectangles left empty (the landmark's own site)
export function cityGrid(parent, A, { R = 400, pitch = 90, street = 16, seed = 1, hmin = 12, hmax = 60, clear = [], palette = [0xc9a98a, 0xb8553a, 0xd8c4a4, 0x9aa7b8, 0xa8826a, 0xd9b99a, 0x8f9db0, 0xc7b8a0], taxis = 14, tanks = true, y = 0, ground = 0x8a8c92, skew = 0.6 } = {}) {
  const r = rng(seed), blds = [], tk = [], win = [];
  slab(parent, R * 1.02, 0.4, ground, { y: y - 0.01, layer: 1 });
  const n = Math.floor(R / pitch);
  const inClear = (x, z, m = 0) => clear.some(([cx, cz, hw, hd]) => Math.abs(x - cx) < hw + m && Math.abs(z - cz) < hd + m);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const cx = i * pitch, cz = j * pitch; if (Math.hypot(cx, cz) > R * 0.95) continue;
    const bw = pitch - street, parts = r() < 0.5 ? 1 : 2;
    for (let k = 0; k < parts; k++) {
      const w = parts === 1 ? bw * (0.8 + r() * 0.2) : bw * 0.46, d = bw * (0.78 + r() * 0.2);
      const x = cx + (parts === 1 ? 0 : (k - 0.5) * bw * 0.52), z = cz;
      if (inClear(x, z, bw * 0.5)) continue;
      const dist = Math.hypot(cx, cz) / R, h = hmin + (hmax - hmin) * Math.pow(r(), 1.3) * (1 - dist * skew) + r() * 6;
      blds.push({ p: [x, y + h / 2, z], s: [w, h, d], c: palette[Math.floor(r() * palette.length)] });
      blds.push({ p: [x, y + h + 0.5, z], s: [w * 1.02, 1, d * 1.02], c: 0x6a6a72 });
      if (tanks && r() < 0.45) tk.push({ p: [x + (r() - 0.5) * w * 0.4, y + h + 5, z + (r() - 0.5) * d * 0.4], s: [4, 8, 4], c: 0x8a6a48 });
    }
  }
  // street strips (lighter lane lines) + tiny taxis shuttling along every third street
  for (let i = -n; i <= n; i++) { const L = Math.sqrt(Math.max(0, (R * 0.95) ** 2 - (i * pitch) ** 2)) * 2; if (L > 0) { patch(parent, street, L, 0x3d4049, i * pitch - pitch / 2, y + 0.06, 0, { layer: 2 }); patch(parent, L, street, 0x3d4049, 0, y + 0.06, i * pitch - pitch / 2, { layer: 2 }); } }
  instances(parent, box(1, 1, 1), lmat(0xffffff, { rough: 0.85 }), blds);
  if (tk.length) { instances(parent, new THREE.CylinderGeometry(0.5, 0.5, 0.8, 10), lmat(0xffffff, { rough: 0.9 }), tk.map((t) => ({ ...t, p: [t.p[0], t.p[1] - 1.6, t.p[2]], s: [t.s[0], t.s[1] * 0.55, t.s[2]] }))); instances(parent, new THREE.ConeGeometry(0.58, 0.9, 10), lmat(0x5a4028, { rough: 0.9 }), tk.map((t) => ({ p: [t.p[0], t.p[1] + 1.2, t.p[2]], s: [t.s[0], 1.8, t.s[2]] }))); }
  const lanes = [];
  for (let i = -n; i <= n; i++) { if (i % 2 === 0) continue; const L = Math.sqrt(Math.max(0, (R * 0.9) ** 2 - (i * pitch - pitch / 2) ** 2)); if (L > 40) { lanes.push([-L, i * pitch - pitch / 2, L, i * pitch - pitch / 2]); lanes.push([i * pitch - pitch / 2, -L, i * pitch - pitch / 2, L]); } }
  lanes.slice(0, 8).forEach((l, i) => { const len = Math.hypot(l[2] - l[0], l[3] - l[1]); makeTraffic(parent, A, Math.max(3, Math.round(taxis / 4)), linePath(l[0], l[1], l[2], l[3], 3), len * 2, { seed: seed + i, speed: 11, colors: [0xffc20e, 0xffc20e, 0xffc20e, 0xe53935, 0xffffff, 0x2f6fd6], y: y + 0.08, scale: 1.1 }); });
  return { n, inClear };
}

// ---------- 3D ring loft (rings = arrays of [x,y,z] points, same count) ----------
export function ringLoft(rings, { cap = true, smooth = false } = {}) {
  const n = rings[0].length, pos = [], idx = [];
  rings.forEach((r) => r.forEach((p) => pos.push(p[0], p[1], p[2])));
  for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < n; i++) { const a = k * n + i, b = k * n + (i + 1) % n, d = (k + 1) * n + i, e = (k + 1) * n + (i + 1) % n; idx.push(a, b, d, b, e, d); }
  if (cap) for (const [ri, flip] of [[0, true], [rings.length - 1, false]]) { const base = pos.length / 3; let cx = 0, cy = 0, cz = 0; rings[ri].forEach((p) => { cx += p[0]; cy += p[1]; cz += p[2]; }); pos.push(cx / n, cy / n, cz / n); rings[ri].forEach((p) => pos.push(p[0], p[1], p[2])); for (let i = 0; i < n; i++) { const a = base + 1 + i, b = base + 1 + (i + 1) % n; if (flip) idx.push(base, b, a); else idx.push(base, a, b); } }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  if (!smooth) g = g.toNonIndexed(); g.computeVertexNormals(); return g;
}

// ---------- heightfield terrain with vertex colours ----------
export function terrain(w, d, seg, hFn, cFn, { cx = 0, cz = 0 } = {}) {
  const g = new THREE.PlaneGeometry(w, d, seg, Math.round(seg * d / w)); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, z = p.getZ(i) + cz, h = hFn(x, z); p.setY(i, h); c.set(cFn(x, z, h)); col.set([c.r, c.g, c.b], i * 3); p.setX(i, x); p.setZ(i, z); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, lmat(0xffffff, { vc: true, rough: 1, layer: 1 })); m.receiveShadow = true; m.castShadow = true; return m;
}
// cheap smooth value noise (deterministic, no state)
export const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v); };
export const fbm = (x, y, o = 4) => { let a = 0.5, s = 0, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s; };

// onion/dome lathe with spiral or checker colour stripes (vertex colours)
export function stripedDome(profile, seg, colors, { mode = 'spiral', n = 8, twist = 1.5 } = {}) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg).toNonIndexed(); g.computeVertexNormals();
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(); const ymax = Math.max(...profile.map((q) => q[1])) || 1;
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3, a = Math.atan2(cz, cx) / TAU + 0.5, h = cy / ymax;
    let k; if (mode === 'spiral') k = Math.floor(((a + h * twist) * n) % colors.length + colors.length * 10) % colors.length; else if (mode === 'check') k = (Math.floor(a * n) + Math.floor(h * n * 0.8)) % 2 ? 1 : 0; else if (mode === 'ribs') k = Math.floor(a * n) % 2; else k = 0;
    c.set(colors[k % colors.length]); for (let j = 0; j < 3; j++) col.set([c.r, c.g, c.b], (i + j) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
export const stripedMat = () => lmat(0xffffff, { vc: true, rough: 0.5, metal: 0.1 });

// hull: ship hull as a ring loft along Z (bow +Z). len, beam, top (above waterline), draft (below), bow taper start, stern taper
export function hullGeo(len, beam, top, draft, { bowStart = 0.72, sternStart = 0.1, sheer = 0.12, n = 36 } = {}) {
  const rings = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, z = (s - 0.5) * len;
    let b = beam / 2;
    if (s > bowStart) { const t = (s - bowStart) / (1 - bowStart); b *= Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.9))); }
    if (s < sternStart) { const t = 1 - s / sternStart; b *= 1 - 0.28 * t * t; }
    b = Math.max(b, 0.05);
    const tp = top * (1 + sheer * Math.pow(s, 4)) * (1 + 0.03 * Math.pow(1 - s, 3)), dr = draft * (1 - 0.7 * Math.pow(Math.max(0, (s - 0.8) / 0.2), 2));
    rings.push([[-b, tp, z], [-b * 1.0, 0, z], [-b * 0.9, -dr * 0.45, z], [-b * 0.45, -dr, z], [b * 0.45, -dr, z], [b * 0.9, -dr * 0.45, z], [b, 0, z], [b, tp, z]].reverse());
  }
  return ringLoft(rings, { cap: true });
}
// dotted row of windows / portholes along a hull side (instanced)
export function porthole(parent, material, z0, z1, y, x, step, size, side = 1) {
  const l = []; for (let z = z0; z <= z1; z += step) l.push({ p: [x * side, y, z], r: [0, side * Math.PI / 2, 0], s: [size, size, 0.1] });
  return instances(parent, new THREE.CylinderGeometry(0.5, 0.5, 1, 8), material, l.map((q) => ({ ...q, r: [0, 0, Math.PI / 2] })).map((q) => ({ p: q.p, r: [0, 0, Math.PI / 2], s: [size, 0.2, size] })));
}
// rising smoke puffs, closed-form cycle. returns nothing; positions relative to parent
export function smoke(parent, A, x, y, z, { n = 14, rise = 40, spread = 10, size = 3, wind = [8, 0, 0], period = 8, color = 0x4a4a52, seed = 1 } = {}) {
  const r = rng(seed), m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lmat(color, { rough: 1, opacity: 0.85 }), n), o = new THREE.Object3D(), P = [];
  for (let i = 0; i < n; i++) P.push({ ph: i / n, jx: (r() - 0.5) * 2, jz: (r() - 0.5) * 2 }); m.frustumCulled = false; m.castShadow = false; parent.add(m);
  A.add((t) => { P.forEach((p, i) => { const u = frac(p.ph + t / period); o.position.set(x + wind[0] * u * period * 0.3 + p.jx * spread * u, y + rise * u, z + wind[2] * u * period * 0.3 + p.jz * spread * u); o.scale.setScalar(size * (0.5 + 1.6 * u)); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.instanceMatrix.needsUpdate = true; });
  return m;
}
// foam blobs around a hull (bow wave + wake); positions static, size pulses
export function foam(parent, A, len, beam, { y = 0.3, seed = 1 } = {}) {
  const r = rng(seed), l = []; for (let i = 0; i < 60; i++) { const s = r(), z = (s - 0.5) * len; const side = r() < 0.5 ? -1 : 1; const wid = beam / 2 * (s > 0.75 ? Math.sqrt(Math.max(0.05, 1 - Math.pow((s - 0.75) / 0.25, 1.9))) : 1); l.push({ x: side * (wid + 0.5 + r() * 2), z, ph: r() * 6 }); }
  for (let i = 0; i < 40; i++) { const z = -len / 2 - r() * len * 0.5, side = r() < 0.5 ? -1 : 1; l.push({ x: side * (r() * beam * 0.35 + Math.abs(z + len / 2) * 0.08), z, ph: r() * 6 }); }
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5), lmat(0xffffff, { rough: 1, layer: 3 }), l.length), o = new THREE.Object3D(); m.frustumCulled = false; m.castShadow = false; parent.add(m);
  A.add((t) => { l.forEach((b, i) => { const k = 0.6 + 0.4 * Math.sin(t * 2.2 + b.ph); o.position.set(b.x, y, b.z); o.scale.set(beam * 0.07 * k, 0.3, beam * 0.09 * k); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.instanceMatrix.needsUpdate = true; });
}
