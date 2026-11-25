// Landmarks pack: monuments C (Great Wall, Mount Rushmore, Stonehenge, Hoover Dam, Angkor Wat, Machu Picchu, Hollywood sign). 1 unit = 1 m.
import { THREE, rng, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade, clamp, lerp, smooth, TAU, COL, lmat, animator, finish, frac, ngon, rectPts, scalePts, rotPts, loft, frustum, lathe, merge, xf, instances, beams, flagPole, FLAGS, blinker, makeWater, makeCrowd, makeTraffic, ringPath, linePath, trees, scatter, slab, ring, disc, patch, makeBoats, boatMesh, ringLoft, terrain, fbm, vnoise } from './landmarks_kit.js';
import { birds, drift, crenel } from './landmarks_monuments_b.js';

// people walking along a 3D polyline (back and forth), closed-form
function walkers(parent, A, pts, n, { seed = 1, speed = 0.01, scale = 1.7 / 1.7, colors, lift = 0 } = {}) {
  const r = rng(seed); colors = colors ?? [0xe53935, 0x2f6fd6, 0xffd23f, 0x2fa66a, 0xff8a2b, 0x8a52c9, 0xffffff];
  const lens = [0]; for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
  const total = lens[lens.length - 1];
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.75, 3, 8), lmat(0xffffff), n), head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 8, 6), lmat(0xf2b98f), n);
  const P = []; for (let i = 0; i < n; i++) { P.push({ u: r(), sp: speed * (0.6 + r() * 0.8), ph: r() * 6 }); body.setColorAt(i, new THREE.Color(colors[Math.floor(r() * colors.length)])); }
  const o = new THREE.Object3D(), at = (s) => { let k = 1; while (k < lens.length - 1 && lens[k] < s) k++; const t = (s - lens[k - 1]) / (lens[k] - lens[k - 1] || 1); const a = pts[k - 1], b = pts[k]; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), Math.atan2(b[0] - a[0], b[2] - a[2])]; };
  const set = (t) => P.forEach((p, i) => { const q = frac(p.u + t * p.sp), s = (q < 0.5 ? q * 2 : 2 - q * 2) * total, [x, y, z, h] = at(Math.min(total - 0.01, Math.max(0.01, s))), bob = Math.abs(Math.sin(t * 6 + p.ph)) * 0.06 * scale; o.position.set(x, y + lift + 0.57 * scale + bob, z); o.rotation.set(0, q < 0.5 ? h : h + Math.PI, 0); o.scale.setScalar(scale); o.updateMatrix(); body.setMatrixAt(i, o.matrix); o.position.y = y + lift + 1.36 * scale + bob; o.updateMatrix(); head.setMatrixAt(i, o.matrix); });
  set(0); for (const m of [body, head]) { m.frustumCulled = false; m.castShadow = false; parent.add(m); } A.add((t) => { set(t); body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true; });
}
// oriented boxes between 3D points (width, height cross-section kept level)
function segBoxes(parent, material, pts, w, h, { extra = 0 } = {}) {
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, pts.length - 1), o = new THREE.Object3D(), A = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i < pts.length - 1; i++) { A.set(...pts[i]); B.set(...pts[i + 1]); o.position.copy(A).add(B).multiplyScalar(0.5); o.position.y += h / 2 - 0.5; o.lookAt(B.x, B.y + h / 2 - 0.5, B.z); o.scale.set(w, h, A.distanceTo(B) + extra); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
  m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; parent.add(m); return m;
}

// ============================================================ Great Wall of China (section, wall 7.8 m high, towers 12 m)
export function greatWall({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const zr = (x) => 70 * Math.sin(x * 0.0065) + 25 * Math.sin(x * 0.018 + 1);
  const ridge = (x) => 120 + 75 * Math.sin(x * 0.0072) + 35 * Math.sin(x * 0.02 + 1.3);
  const hFn = (x, z) => { const d = z - zr(x); const rg = ridge(x) * Math.exp(-(d * d) / (2 * 85 * 85)); const far = 170 * fbm(x * 0.004 + 3, z * 0.004, 4) * smooth((Math.abs(z) - 140) / 200); return 4 + rg * (0.92 + 0.16 * fbm(x * 0.03, z * 0.03, 3)) + far; };
  const cFn = (x, z, h) => { const s = Math.abs(hFn(x + 4, z) - h) + Math.abs(hFn(x, z + 4) - h); return s > 7 ? (fbm(x * 0.05, z * 0.05) > 0.5 ? 0x9a9284 : 0x867e70) : (h > 250 ? 0x7aa456 : fbm(x * 0.02, z * 0.02) > 0.55 ? 0x5a9a48 : 0x6aae52); };
  const T = terrain(1800, 900, 120, hFn, cFn); g.add(T);
  // wall path along the ridge, 6 m wide, 7.8 m high, with merlons on both sides and watchtowers
  const N = 100, pts = []; for (let i = 0; i <= N; i++) { const x = -800 + 1600 * i / N, z = zr(x); pts.push([x, hFn(x, z) + 0.2, z]); }
  const stone = lmat(0xb6a68c, { rough: 0.9 });
  segBoxes(g, stone, pts, 6.4, 7.8, { extra: 0.6 });
  const mer = []; for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) { const t = (k + 0.5) / 4, x = lerp(pts[i][0], pts[i + 1][0], t), y = lerp(pts[i][1], pts[i + 1][1], t), z = lerp(pts[i][2], pts[i + 1][2], t), h = Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][2] - pts[i][2]); for (const sd of [-1, 1]) mer.push({ p: [x + Math.cos(h) * sd * 3.0, y + 8.5, z - Math.sin(h) * sd * 3.0], r: [0, h, 0], s: [1.0, 1.6, 2.2], c: 0xa89878 }); }
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.9 }), mer);
  const tw = [], twd = [], roofs = []; for (let i = 6; i < N; i += 10) {
    const [x, y, z] = pts[i]; const T2 = new THREE.Group(); T2.position.set(x, y, z); g.add(T2);
    add(T2, box(13, 12.5, 13), lmat(0xc4b49a, { rough: 0.9 }), [0, 6.2, 0]); add(T2, box(14.4, 1.2, 14.4), lmat(0x9a8a70), [0, 12.8, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(T2, box(1.6, 2.2, 1.6), lmat(0xa89878), [sx * 6.4, 14.4, sz * 6.4]);
    for (let k = 0; k < 4; k++) { const f = new THREE.Group(); f.rotation.y = k * Math.PI / 2; T2.add(f); add(f, rbox(2.4, 4, 0.4, 1.0), lmat(0x2a2630), [0, 6.2, 6.55]); }
    add(T2, cone(7.2, 3.6, 4), lmat(0x8a4a3a, { rough: 0.7 }), [0, 14.4 + 1.8, 0], [0, Math.PI / 4, 0]).scale.set(1, 0.7, 1);
    flagPole(T2, A, 4, 17, 4, 8, 4.5, FLAGS.china, { phase: i, aspect: 0.66 });
  }
  if (base) {
    walkers(g, A, pts.slice(10, 70).map((p) => [p[0], p[1] + 7.9, p[2]]), 60, { seed: 4, speed: 0.012, scale: 1.7 });
    // cable car climbing to a tower
    const ca = [-430, hFn(-430, zr(-430) + 150) + 3, zr(-430) + 160], cb = [pts[18][0] + 2, pts[18][1] + 14, pts[18][2] + 10];
    const cab = [[...ca, ...cb, 0.35, 0.35]]; beams(g, lmat(0x333640), cab);
    const gond = [0, 1].map((i) => add(g, rbox(3, 2.4, 3, 0.6), lmat(i ? 0xe53935 : 0xffd23f, { rough: 0.4 }), [0, 0, 0]));
    A.add((t) => { gond.forEach((gd, i) => { const u = 0.5 + 0.5 * Math.sin(t * 0.3 + i * Math.PI); gd.position.set(lerp(ca[0], cb[0], u), lerp(ca[1], cb[1], u) - 2.6, lerp(ca[2], cb[2], u)); }); });
    for (let i = 0; i < 5; i++) { const u = (i + 0.5) / 5; add(g, box(0.8, 12, 0.8), lmat(0x333640), [lerp(ca[0], cb[0], u), lerp(ca[1], cb[1], u) - 6 * 0.0 - 0, lerp(ca[2], cb[2], u)]).visible = false; }
    // forest of round and pine trees on slopes
    trees(g, scatter(420, (q) => { const x = -850 + q() * 1700, z = -420 + q() * 840; const d = Math.abs(z - zr(x)); if (d < 14) return null; const s = Math.abs(hFn(x + 4, z) - hFn(x, z)) + Math.abs(hFn(x, z + 4) - hFn(x, z)); if (s > 6) return null; return [x, z, 1.2, hFn(x, z)]; }, 5), { size: 2.4, seed: 5, kinds: 'mix', colors: [0x58b04a, 0x3f9a52, 0x6cc04a, 0xd88a2a] });
    drift(g, A, 8, 1800, 150, 7, 7, 90);
    birds(g, A, 16, 0, 220, 0, 220, 5, 3, 0.15);
  }
  return finish(g, A, { name: 'Great Wall of China (section)', realHeightM: 8, towerHeightM: 12, realWidthM: 6, source: 'typical Badaling/Mutianyu section: wall ~7.8 m high, ~5-6 m wide, watchtowers ~12 m; UNCERTAIN: varies by section' });
}

// ============================================================ Mount Rushmore (heads 18 m tall)
export function mountRushmore({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const hFn = (x, z) => { const face = 1 / (1 + Math.exp((z + 6 * fbm(x * 0.05, 3)) / 9)); const around = Math.exp(-Math.pow(Math.max(0, Math.abs(x) - 120) / 150, 2)); const noise = 14 * fbm(x * 0.04, z * 0.04, 4); const back = z < 0 ? 18 * fbm(x * 0.02, z * 0.02) : 0; return 2 + (222 + back) * face * (0.45 + 0.55 * around) + noise * face + (z > 0 ? 60 * Math.exp(-z / 60) * (0.6 + noise / 30) * (1 - face) * 0.8 : 0); };
  const cFn = (x, z, h) => { const s = Math.abs(hFn(x + 3, z) - h) + Math.abs(hFn(x, z + 3) - h); if (h > 40 && s > 7) return fbm(x * 0.1, z * 0.1) > 0.5 ? 0xb8b0a0 : 0xa8a090; return h > 150 ? 0xb0a898 : (h > 40 ? (fbm(x * 0.05, z * 0.05) > 0.6 ? 0x5a8a4a : 0x6a9a52) : 0x6aae52); };
  g.add(terrain(900, 800, 150, hFn, cFn, { cz: -150 }));
  const granite = lmat(0xc4bba8, { rough: 0.85 }), dark = lmat(0x4a463e, { rough: 0.9 }), hair = lmat(0xb0a692, { rough: 0.9 });
  const head = (kind, x, y, tilt = 0) => {
    const G = new THREE.Group(); G.position.set(x, y, -2); G.rotation.y = tilt; g.add(G);
    const R = 8;
    add(G, sph(R, 18, 14), granite, [0, 0, 2], [0, 0, 0], [0.85, 1.12, 0.92]);                              // skull
    add(G, sph(5.8, 14, 10), granite, [0, -6.2, 5.2], [0, 0, 0], [0.95, 0.9, 0.8]);                          // jaw / chin
    add(G, box(1.8, 5.4, 2.8), granite, [0, -0.8, 9.0], [0.3, 0, 0]);                                         // nose
    add(G, box(3.2, 1.4, 2.4), granite, [0, -3.6, 8.2]);
    for (const s of [-1, 1]) { add(G, box(3.6, 1.1, 2.2), hair, [s * 3.1, 2.6, 7.7], [0, 0, s * -0.12]); add(G, sph(1.0, 8, 6), dark, [s * 3.1, 1.2, 7.4], [0, 0, 0], [1.2, 0.7, 0.6]); add(G, sph(1.2, 8, 6), granite, [s * 5.2, -3.2, 5.8]); }
    add(G, box(4.2, 0.45, 0.6), dark, [0, -5.6, 8.0]);                                                          // mouth line
    if (kind === 'w') { for (const s of [-1, 1]) add(G, sph(3.2, 10, 8), hair, [s * 7.3, 1.5, 1], [0, 0, 0], [0.6, 1.5, 1.1]); add(G, sph(R * 0.9, 14, 10, 0, TAU, 0, 1.2), hair, [0, 2.2, 2], [0, 0, 0], [0.9, 1.1, 1]); }
    if (kind === 'j') { for (const s of [-1, 1]) add(G, sph(3.2, 10, 8), hair, [s * 7.3, 0.5, 1], [0, 0, 0], [0.7, 1.7, 1.2]); add(G, sph(R * 0.9, 14, 10, 0, TAU, 0, 1.15), hair, [0, 2.4, 2], [0, 0, 0], [0.9, 1.1, 1]); }
    if (kind === 'r') { for (const s of [-1, 1]) add(G, tor(1.7, 0.22, 6, 14), dark, [s * 3.1, 1.3, 8.1]); add(G, box(2, 0.25, 0.3), dark, [0, 1.6, 8.3]); add(G, box(5.8, 1.5, 1.6), hair, [0, -3.3, 9.0]); add(G, sph(R * 0.85, 14, 10, 0, TAU, 0, 1.0), hair, [0, 3.2, 1.2], [0, 0, 0], [0.85, 1, 1]); }
    if (kind === 'l') { add(G, cone(5, 14, 6), granite, [0, -13, 4.5], [Math.PI, 0, 0]); add(G, box(8, 3.6, 1.6), hair, [0, -4.6, 8.0]); for (const s of [-1, 1]) add(G, sph(3.4, 10, 8), hair, [s * 7, 4.5, 1.5], [0, 0, 0], [0.6, 1.1, 1]); add(G, sph(R * 0.9, 14, 10, 0, TAU, 0, 1.1), hair, [0, 3.0, 1.0], [0, 0, 0], [0.9, 1.0, 1]); }
    return G;
  };
  const HY = 205; head('w', -29, HY, 0.1); head('j', -3, HY - 3, 0.05); head('r', 24, HY - 1, -0.06); head('l', 52, HY - 2, -0.12);
  // unfinished shoulders: rough stone blocks under the heads
  for (const [x, w] of [[-29, 22], [-3, 20], [24, 22], [52, 24]]) add(g, sph(1, 8, 6), lmat(0xa89e8c, { rough: 0.95 }), [x, HY - 17, -4], [0, 0, 0], [w * 0.6, 8, 8]);
  if (base) {
    // talus rock pile (instanced boulders) at the foot, Avenue of Flags, viewing terrace
    const rk = []; const rr = rng(4); for (let i = 0; i < 120; i++) { const x = (rr() - 0.5) * 340, z = 6 + rr() * 60, s = 2 + rr() * 6; rk.push({ p: [x, hFn(x, z) + s * 0.2, z], s: [s, s * 0.7, s], r: [rr(), rr() * 3, rr()], c: [0xa89e8c, 0x9a9082, 0xb8ae9c][Math.floor(rr() * 3)] }); }
    instances(g, new THREE.DodecahedronGeometry(1, 0), lmat(0xffffff, { rough: 0.95 }), rk);
    patch(g, 140, 36, 0xd8d0be, 0, 1, 420, { layer: 2 }); patch(g, 10, 420, 0xd8d0be, 0, 1, 230, { layer: 2 });
    for (let i = 0; i < 22; i++) for (const sx of [-1, 1]) flagPole(g, A, sx * 16, 1, 60 + i * 15, 9, 4.2, FLAGS.usa, { phase: i + sx, rotY: Math.PI / 2 });
    makeCrowd(g, A, 90, { x: 0, z: 410, w: 130, d: 28 }, { seed: 4, scale: 1.7, y: 1.2, speed: 0.4 });
    trees(g, scatter(500, (q) => { const x = -400 + q() * 800, z = -300 + q() * 780; const h = hFn(x, z); const s = Math.abs(hFn(x + 3, z) - h) + Math.abs(hFn(x, z + 3) - h); if (s > 5 || (z > 8 && z < 60 && Math.abs(x) < 120)) return null; if (Math.abs(x) < 10 && z > 60) return null; return [x, z, 1.4, h]; }, 6), { size: 2.0, seed: 6, kinds: 'pine', colors: [0x2f7a3a, 0x3f8a46] });
    makeTraffic(g, A, 8, linePath(-300, 500, 300, 500, 3), 1200, { speed: 8, scale: 1.8, y: 1.1, seed: 2 }); patch(g, 700, 14, 0x474a55, 0, 1.0, 500, { layer: 2 });
    birds(g, A, 9, 0, HY + 60, 40, 120, 8, 4, 0.12);
    drift(g, A, 6, 1200, 340, 4, 6, 60);
  }
  return finish(g, A, { name: 'Mount Rushmore', realHeightM: 18, realWidthM: 120, source: 'each head ~18 m (60 ft) tall; sculpture ~ 1,745 m above sea level; face ~120 m wide' });
}

// ============================================================ Stonehenge (tallest trilithon 7.3 m)
export function stonehenge({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const sarsen = lmat(0xa8a398, { rough: 0.95 }), blue = lmat(0x8a9a9a, { rough: 0.9 });
  const r = rng(12), up = [], lint = [];
  const stone = (x, z, w, h, d, ry, tiltZ = 0, c = 0xa8a398) => { const m = add(g, rbox(w, h, d, 0.25), lmat(c, { rough: 0.95 }), [x, h / 2 - 0.1, z], [0, ry, tiltZ]); m.scale.set(1 + r() * 0.08, 1, 1); return m; };
  const missing = new Set([3, 11, 17, 24]), fallen = new Set([7, 19]);
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * TAU, x = Math.cos(a) * 16.5, z = Math.sin(a) * 16.5, ry = -a + Math.PI / 2;
    if (missing.has(i)) continue;
    if (fallen.has(i)) { add(g, rbox(2.1, 1.1, 4.1, 0.25), sarsen, [x, 0.5, z], [0, ry + 0.4, 0]); continue; }
    stone(x, z, 2.1, 4.1, 1.1, ry, (r() - 0.5) * 0.04);
    if (!missing.has((i + 1) % 30) && !fallen.has((i + 1) % 30) && ![2, 10, 16, 23].includes(i)) { const a2 = (i + 0.5) / 30 * TAU, lx = Math.cos(a2) * 16.5, lz = Math.sin(a2) * 16.5; add(g, rbox(3.2, 0.9, 1.1, 0.2), sarsen, [lx, 4.55, lz], [0, -a2 + Math.PI / 2, 0]); }
  }
  // five central trilithons in a horseshoe
  const tri = [[-8.6, -4.5, 0.9, 6.0], [-5.5, -8.6, 0.5, 6.6], [0, -10.6, 0, 7.3], [5.5, -8.6, -0.5, 6.6], [8.6, -4.5, -0.9, 6.0]];
  tri.forEach(([x, z, ry, h], i) => { const a = Math.atan2(x, z); for (const s of [-1, 1]) { const px = x + Math.cos(-ry) * s * 1.3, pz = z + Math.sin(-ry) * s * 1.3; add(g, rbox(1.7, h, 1.1, 0.25), sarsen, [px, h / 2 - 0.1, pz], [0, ry + Math.PI * 0, 0]); } add(g, rbox(4.6, 1.0, 1.2, 0.2), sarsen, [x, h + 0.35, z], [0, ry, 0]); });
  // bluestone horseshoe
  for (let i = 0; i < 19; i++) { const a = Math.PI * 0.15 + i / 18 * Math.PI * 1.7, x = Math.cos(a) * 5.8, z = Math.sin(a) * 5.8 - 0.5; if (i % 5 === 4) continue; add(g, rbox(0.9, 2.0 + (i % 3) * 0.3, 0.7, 0.2), blue, [x, 1.0, z], [0, -a, (r() - 0.5) * 0.15]); }
  add(g, rbox(4.8, 0.7, 1.0, 0.2), lmat(0x7a8a82), [0, 0.35, -6.4], [0, 0.1, 0]);          // altar stone (lying)
  add(g, rbox(2.4, 4.9, 1.8, 0.4), sarsen, [64, 2.4, -50], [0, 0.6, 0.12]);                 // Heel Stone
  add(g, rbox(1.6, 0.6, 4, 0.2), sarsen, [30, 0.3, -14], [0, 0.4, 0]);                      // Slaughter Stone (lying)
  // henge bank and ditch rings, an Avenue path, visitor path loop
  if (base) {
    slab(g, 420, 1, 0x7fb054, { y: -0.14, layer: 1 });
    ring(g, 48, 56, 0xb8a888, 0.08, { layer: 3 }); ring(g, 42, 47.5, 0x6a9a48, 0.1, { layer: 3 }); ring(g, 56, 70, 0x86b45c, 0.1, { layer: 2 });
    for (const rr2 of [38, 39]) ring(g, rr2, rr2 + 0.5, 0xe8e0c8, 0.14, { layer: 4 });
    patch(g, 8, 220, 0xd8cfb0, 90, 0.1, -80, { layer: 3, ry: -0.9 });
    // road with moving cars and coaches, car park
    patch(g, 700, 12, 0x474a55, 0, 0.12, 200, { layer: 3 });
    makeTraffic(g, A, 10, linePath(-320, 200, 320, 200, 3), 1280, { speed: 14, scale: 1.8, y: 0.3, seed: 6 });
    // grass scatter: clumps (instanced), distant tumuli, hedgerows
    const gr = []; const gq = rng(2); for (let i = 0; i < 260; i++) { const a = gq() * TAU, d = 20 + gq() * 360; gr.push({ p: [Math.cos(a) * d, 0.15, Math.sin(a) * d], s: [0.9, 0.5 + gq() * 0.5, 0.9], c: [0x6aa84a, 0x5a9a42, 0x8ab85a][Math.floor(gq() * 3)] }); }
    instances(g, new THREE.ConeGeometry(0.5, 1, 5), lmat(0xffffff, { rough: 1 }), gr);
    const tm = []; for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, d = 180 + (i % 3) * 60; tm.push({ p: [Math.cos(a) * d, 0, Math.sin(a) * d], s: [18 + i * 2, 4, 18 + i * 2], c: 0x74a84e }); }
    instances(g, new THREE.SphereGeometry(1, 16, 8), lmat(0xffffff, { rough: 1 }), tm);
    trees(g, scatter(30, (q) => { const a = q() * TAU, d = 300 + q() * 80; return [Math.cos(a) * d, Math.sin(a) * d]; }, 2), { size: 2.2, seed: 2 });
    // sheep wandering; visitors; crows; passing clouds
    const sh = []; for (let i = 0; i < 26; i++) sh.push({ x: -180 + (i * 37) % 360, z: 80 + (i * 53) % 200, ph: i });
    const body = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 6), lmat(0xf4f0e6, { rough: 1 }), sh.length), hd = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 5), lmat(0x2a2630), sh.length), o = new THREE.Object3D();
    for (const m of [body, hd]) { m.frustumCulled = false; m.castShadow = false; g.add(m); }
    A.add((t) => { sh.forEach((s, i) => { const x = s.x + Math.sin(t * 0.08 + s.ph) * 14, z = s.z + Math.cos(t * 0.06 + s.ph * 1.3) * 10, h = Math.cos(t * 0.08 + s.ph); o.position.set(x, 0.65 + Math.abs(Math.sin(t * 3 + s.ph)) * 0.04, z); o.rotation.set(0, h > 0 ? 1.57 : -1.57, 0); o.scale.set(1.2, 1, 0.9); o.updateMatrix(); body.setMatrixAt(i, o.matrix); o.position.set(x + (h > 0 ? 0.65 : -0.65), 0.8, z); o.scale.setScalar(1); o.updateMatrix(); hd.setMatrixAt(i, o.matrix); }); body.instanceMatrix.needsUpdate = hd.instanceMatrix.needsUpdate = true; });
    const loop = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; loop.push([Math.cos(a) * 38.5, 0.1, Math.sin(a) * 38.5]); }
    walkers(g, A, loop, 40, { seed: 4, speed: 0.01, scale: 1.7 });
    birds(g, A, 10, 0, 22, 0, 30, 4, 0.7, 0.4);
    drift(g, A, 10, 900, 70, 8, 5, 30);
  }
  return finish(g, A, { name: 'Stonehenge', realHeightM: 7.3, realWidthM: 33, source: 'tallest trilithon 7.3 m, outer sarsen circle ~33 m across, uprights ~4.1 m, Heel Stone ~4.9 m' });
}

// ============================================================ Hoover Dam (221 m)
export function hooverDam({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const Rc = 300, thm = 0.64, H = 221;
  const arc = (R, th, y) => [Math.sin(th) * R, y, Rc - Math.cos(th) * R];
  const rings = [];
  for (let i = 0; i <= 24; i++) { const y = H * i / 24, t = 14 + 190 * Math.pow((H - y) / H, 1.6), pts = []; for (let k = 0; k <= 16; k++) pts.push(arc(Rc, -thm + 2 * thm * k / 16, y)); for (let k = 16; k >= 0; k--) pts.push(arc(Rc - t, -thm + 2 * thm * k / 16, y)); rings.push(pts); }
  const dam = new THREE.Mesh(ringLoft(rings, { cap: true }), lmat(0xe6e1d4, { rough: 0.85, side: THREE.DoubleSide })); dam.castShadow = dam.receiveShadow = true; g.add(dam);
  // canyon (terrain): narrow at the dam, wider upstream; walls rise 2.4:1, bathtub ring band, red-brown rock
  const halfW = (z) => (z < 0 ? lerp(190, 420, clamp(-z / 900)) : lerp(190, 240, clamp(z / 500)));
  const hFn = (x, z) => { const d = Math.max(0, Math.abs(x) - halfW(z)); const wall = Math.min(340, d * 2.3 + 6) + 22 * fbm(x * 0.03, z * 0.03, 4); const bed = z > 0 ? 3 + 0.01 * z : -55 * clamp(-z / 400); const inside = Math.abs(x) < halfW(z) ? bed : 0; return Math.abs(x) < halfW(z) ? bed + d * 0 : bed + wall; };
  const cFn = (x, z, h) => { if (h > 190 && h < 214 && z < 20) return 0xeee4d4; if (h > 214) return fbm(x * 0.05, z * 0.05) > 0.5 ? 0xb4714a : 0x9c5e3c; if (h > 5) return 0xa86a46; return 0x8a5a3c; };
  const ter = terrain(1500, 1900, 140, hFn, cFn, { cz: 150 }); g.add(ter);
  // lake behind: water plane at 190 m
  const lake = makeWater(1000, 1100, { seg: 30, amp: 0.6, color: 0x2a9ac8, speed: 0.9, scale: 4 }); lake.position.set(0, 190, -560); g.add(lake);
  // intake towers, crest road and parapet, powerhouse U wings
  const rt = (th, R) => [Math.sin(th) * R, Rc - Math.cos(th) * R];
  for (const th of [-0.5, -0.17, 0.17, 0.5]) { const [x, z] = rt(th, Rc + 12); add(g, cyl(9, 10, 70, 14), lmat(0xe6e1d4, { rough: 0.8 }), [x, 190, z - 0]); add(g, cyl(10.5, 10.5, 4, 14), lmat(0xcfc8b6), [x, 227, z]); add(g, cone(9.5, 9, 14), lmat(0xb8b0a0), [x, 233, z]); }
  const crest = []; for (let k = 0; k <= 24; k++) crest.push(arc(Rc - 7, -thm + 2 * thm * k / 24, H + 0.6));
  const cm = new THREE.Mesh(ringLoft([[...crest.map((c) => [c[0], c[1] - 0.3, c[2]])], [...crest.map((c) => [c[0], c[1] + 0.8, c[2]])]].map((r) => r), { cap: false }), lmat(0x474a55)); cm.visible = false; g.add(cm);
  makeTraffic(g, A, 8, (u) => { const o = u < 0.5, s = o ? u * 2 : 2 - u * 2, th = -thm * 0.97 + 2 * thm * 0.97 * s, R = Rc - (o ? 5 : 9), nx = Math.cos(th), nz = Math.sin(th); return [Math.sin(th) * R, Rc - Math.cos(th) * R, Math.atan2(Math.cos(th), Math.sin(th)) * (o ? 1 : 1) + (o ? 0 : Math.PI) + 0]; }, 1900, { speed: 7, scale: 1.8, y: H + 1.2, seed: 3 });
  for (let k = 0; k <= 60; k++) { const th = -thm + 2 * thm * k / 60, R = Rc + 0.3; const [x, z] = rt(th, R); add(g, box(0.5, 1.4, 0.5), lmat(0xcfc8b6), [x, H + 1.5, z]); }
  const pw = new THREE.Group(); g.add(pw); const pwm = lmat(0xd8d2c0, { rough: 0.8 }); for (const sx of [-1, 1]) { add(pw, box(60, 32, 200), pwm, [sx * 120, 16, 240]); add(pw, box(62, 2, 202), lmat(0x8a8478), [sx * 120, 33, 240]); }
  add(pw, box(240, 20, 40), pwm, [0, 10, 330]);
  // downstream river (flowing) and spillway mist
  const riv = makeWater(150, 1000, { seg: 12, amp: 0.5, color: 0x3a8abc, speed: 2.2, scale: 1.5 }); riv.position.set(0, 3, 680); g.add(riv);
  const mist = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), lmat(0xffffff, { rough: 1, emissive: 0xffffff, ei: 0.3, opacity: 0.7 }), 30), mo = new THREE.Object3D(), mr = rng(3); mist.frustumCulled = false; mist.castShadow = false; g.add(mist); const MP = []; for (let i = 0; i < 30; i++) MP.push({ x: (mr() - 0.5) * 90, z: 120 + mr() * 60, ph: mr() });
  A.add((t) => { MP.forEach((p, i) => { const u = frac(p.ph + t * 0.18); mo.position.set(p.x, 10 + u * 40, p.z + u * 12); mo.scale.setScalar(5 + u * 14); mo.updateMatrix(); mist.setMatrixAt(i, mo.matrix); }); mist.instanceMatrix.needsUpdate = true; });
  // high arch road bridge downstream (the Bypass Bridge)
  const bz = 900, lat = [], N = 26;
  const ay = (x) => 252 - 140 * Math.pow(x / 300, 2);
  for (let i = 0; i < N; i++) { const x0 = -300 + 600 * i / N, x1 = x0 + 600 / N; lat.push([x0, ay(x0), bz, x1, ay(x1), bz, 6, 6], [x0, ay(x0) - 10 + 0.0, bz, x1, ay(x1) - 10, bz, 6, 6]); lat.push([x0, 252, bz, x0, ay(x0), bz, 2.6, 2.6]); }
  beams(g, lmat(0xe8e2d4, { rough: 0.5 }), lat); add(g, box(620, 5, 20), lmat(0xe8e2d4), [0, 252.5, bz]);
  makeTraffic(g, A, 8, linePath(-290, bz, 290, bz, 3), 1160, { speed: 14, scale: 2.2, y: 255.3, seed: 4 });
  if (base) {
    // transmission pylons marching downstream + visitor centre + tourists on the crest
    const py = []; for (let i = 0; i < 8; i++) { const x = i % 2 ? 330 : -330; py.push({ p: [x, hFn(x, 120 + i * 40) + 24, 120 + i * 40], s: [8, 48, 8], c: 0x8a8a92 }); }
    instances(g, new THREE.ConeGeometry(0.5, 1, 4), lmat(0xffffff, { metal: 0.3 }), py);
    const walk = []; for (let k = 0; k <= 16; k++) walk.push(arc(Rc - 11, -thm * 0.95 + 2 * thm * 0.95 * k / 16, H + 1.2));
    walkers(g, A, walk, 30, { seed: 4, speed: 0.008, scale: 1.8 });
    trees(g, scatter(40, (q) => { const x = -700 + q() * 1400, z = 200 + q() * 700; const hh = hFn(x, z); if (hh < 200 || hh > 330) return null; return [x, z, 1.5, hh]; }, 5), { size: 3, seed: 5, kinds: 'round', colors: [0x7a8a42, 0x8a9a52] });
    makeBoats(g, A, [{ len: 24, color: 0xffffff, cabin: 0x2f6fd6, path: linePath(-300, -500, 300, -300, 0), length: 1400, u0: 0.3, speed: 8 }, { len: 14, color: 0xe5483a, sail: true, path: linePath(250, -800, -250, -500, 0), length: 1200, u0: 0.1, speed: 6 }], { y: 190.4 });
    birds(g, A, 12, 0, 280, 100, 200, 3, 4, 0.12);
    drift(g, A, 6, 1500, 420, 4, 6, 70);
  }
  return finish(g, A, { name: 'Hoover Dam', realHeightM: 221, realWidthM: 379, source: '221 m (726 ft) high, 379 m crest length, 14 m crest width, 201 m base thickness' });
}

// ============================================================ Angkor Wat (central tower 65 m)
export function angkorWat({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const sand = lmat(0xcdb48a, { rough: 0.9 }), sandD = lmat(0xb89a6c, { rough: 0.95 }), moss = lmat(0x7a9a5a, { rough: 1 });
  const lotus = (x, y, z, w, h) => {
    const G = new THREE.Group(); G.position.set(x, y, z); g.add(G);
    const tiers = 5; let cy = 0, cw = w;
    for (let i = 0; i < tiers; i++) { const th = h * 0.1 * (1.2 - i * 0.1); add(G, frustum(rectPts(cw, cw), rectPts(cw * 0.78, cw * 0.78), th * 1.8, cy), i % 2 ? sandD : sand); add(G, box(cw * 0.5, th * 0.8, 0.5), lmat(0x2a2630), [0, cy + th * 0.9, cw * 0.39 + 0.1]); cy += th * 1.8; cw *= 0.78; }
    add(G, lathe([[0.01, cy], [cw * 0.5, cy], [cw * 0.46, cy + h * 0.1], [cw * 0.3, cy + h * 0.22], [cw * 0.1, cy + h * 0.32], [0.01, cy + h * 0.38]], 14), sand);
    add(G, cyl(0.18, 0.3, h * 0.12, 5), lmat(0xe0b040, { metal: 0.6 }), [0, cy + h * 0.42, 0]);
    return G;
  };
  const gallery = (cx, cz, w, d, y, h) => { for (const [sx, sz, ww, dd] of [[0, 1, w, 3], [0, -1, w, 3], [1, 0, 3, d], [-1, 0, 3, d]]) { add(g, box(ww, h, dd), sand, [cx + sx * (w / 2 - 1.5), y + h / 2, cz + sz * (d / 2 - 1.5)]); add(g, box(ww + 0.8, 1.2, dd + 0.8), sandD, [cx + sx * (w / 2 - 1.5), y + h + 0.6, cz + sz * (d / 2 - 1.5)]); } const pl = []; for (let k = 0; k < Math.floor(w / 3.5); k++) for (const sz of [-1, 1]) pl.push({ p: [cx - w / 2 + 2 + k * 3.5, y + h / 2 + 0.2, cz + sz * (d / 2 - 0.1)], s: [1.1, h - 1.4, 0.5], c: 0x8a7a5a }); instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.9 }), pl); };
  // three tiers on stepped platforms
  const P1 = 6, P2 = 17, P3 = 32;
  add(g, box(215, P1, 187), sandD, [0, P1 / 2, 0]); add(g, box(120, P2 - P1, 105), sand, [0, (P1 + P2) / 2, 0]); add(g, box(66, P3 - P2, 62), sand, [0, (P2 + P3) / 2, 0]);
  gallery(0, 0, 215, 187, P1, 9); gallery(0, 0, 120, 105, P2, 8); gallery(0, 0, 66, 62, P3, 6);
  // corner towers of tier 1 and 2, then the great central tower and four satellites on tier 3
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { lotus(sx * 100, P1 + 9, sz * 85, 12, 22); lotus(sx * 55, P2 + 8, sz * 47, 10, 22); lotus(sx * 26, P3 + 6, sz * 24, 11, 28); }
  lotus(0, P3 + 6, 0, 22, 65 - P3 - 6 + 4);
  // stairs on four sides
  for (let k = 0; k < 8; k++) for (const [sx, sz, ry] of [[1, 0, 0], [-1, 0, 0], [0, 1, 1], [0, -1, 1]]) { const w = k === 0 ? 30 : 30; add(g, box(sz ? 30 : 4 + (7 - k) * 0.5, 0.9, sx ? 30 : 4 + (7 - k) * 0.5), sandD, [sx * (118 + (7 - k) * 1.0 + 0 ), P1 + 0.45 + k * 1.0 * 0 + (k * 0.0), sz * (100 + (7 - k) * 1.0)]).visible = false; }
  if (base) {
    slab(g, 1100, 1, 0x4f9a46, { y: -0.04, layer: 1 });
    // enclosure wall, moat and western causeway with naga balustrades
    const mw = makeWater(1000, 900, { seg: 30, amp: 0.2, color: 0x4a9a8a, speed: 0.9, scale: 3 }); mw.position.set(0, -0.1, 0); g.add(mw);
    slab(g, 440, 1, 0x6aae52, { y: 0.5, layer: 2, square: true, d: 390 }).position.y = 0.0;
    for (const [w, d, x, z] of [[860, 6, 0, 395], [860, 6, 0, -395], [6, 790, 430, 0], [6, 790, -430, 0]]) add(g, box(w, 8, d), sandD, [x, 4, z]);
    const trim = []; for (let x = -430; x <= 430; x += 8) { trim.push({ p: [x, 8.6, 395], s: [4, 1.2, 6.4], c: 0xa88a5c }); trim.push({ p: [x, 8.6, -395], s: [4, 1.2, 6.4], c: 0xa88a5c }); } instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.9 }), trim);
    patch(g, 500, 14, 0xd8c8a0, -0, 0.2, 0, { layer: 3, ry: 0 }); patch(g, 16, 360, 0xd8c8a0, 0, 0.2, 0, { layer: 3 });
    patch(g, 12, 240, 0xd0c09a, -330 * 0 - 0, 0.25, 0, { layer: 3 });
    // causeway along +z side leading to the west gopura
    patch(g, 14, 330, 0xcdb48a, 0, 0.3, -280, { layer: 3, ry: 0 });
    const naga = []; for (let k = 0; k < 40; k++) for (const sx of [-1, 1]) naga.push({ p: [sx * 6.5, 1.2, -120 - k * 8], s: [1.4, 2.0 + (k % 2) * 0.6, 1.4], c: 0xb89a6c });
    instances(g, new THREE.SphereGeometry(0.7, 8, 6), lmat(0xffffff, { rough: 0.9 }), naga);
    for (const sx of [-1, 1]) add(g, box(1.2, 1.6, 320), sandD, [sx * 7.3, 0.8, -283]);
    const gop = new THREE.Group(); gop.position.set(0, 0, -400); g.add(gop); add(gop, box(110, 14, 18), sand, [0, 7, 0]); for (const x of [-34, 0, 34]) lotus(x, 14, 0, x === 0 ? 14 : 10, x === 0 ? 28 : 20);
    // jungle, palms, monks and tourist boats, egrets, tethered balloon
    trees(g, scatter(480, (q) => { const a = q() * TAU, d = 470 + q() * 500; const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.9; return [x, z]; }, 7).concat(scatter(120, (q) => { const x = (q() - 0.5) * 1000, z = (q() - 0.5) * 900; if (Math.abs(x) < 480 && Math.abs(z) < 440) return null; return [x, z]; }, 3)), { size: 3.6, seed: 7, kinds: 'round', colors: [0x3f9a52, 0x58b04a, 0x2f7a3a, 0x6cc04a] });
    const pm = []; const prr = rng(5); for (let i = 0; i < 50; i++) { const a = prr() * TAU, d = 500 + prr() * 300; pm.push([Math.cos(a) * d, Math.sin(a) * d * 0.9]); }
    instances(g, new THREE.CylinderGeometry(0.4, 0.7, 1, 6), lmat(0x8a6a3e), pm.map(([x, z]) => ({ p: [x, 9, z], s: [1, 18, 1] }))); instances(g, new THREE.IcosahedronGeometry(1, 1), lmat(0x4f9a46), pm.map(([x, z]) => ({ p: [x, 19, z], s: [5, 2, 5] })));
    makeCrowd(g, A, 70, { x: 0, z: -280, w: 10, d: 280 }, { seed: 4, scale: 1.7, y: 0.4, speed: 0.4, colors: [0xff8a2b, 0xff8a2b, 0xff8a2b, 0xffffff, 0xe53935, 0x2f6fd6] });
    makeCrowd(g, A, 50, { x: 0, z: 0, w: 190, d: 160 }, { seed: 6, scale: 1.7, y: P1 + 0.1, speed: 0.4, colors: [0xff8a2b, 0xff8a2b, 0xffffff, 0xe53935, 0x2f6fd6, 0xffd23f] });
    makeBoats(g, A, [{ len: 14, color: 0xe5483a, cabin: 0xffd23f, path: linePath(-420, 410, 420, 410, 0), length: 1700, u0: 0.2, speed: 4 }, { len: 12, color: 0x2f6fd6, cabin: 0xffffff, path: linePath(420, 420, -420, 420, 0), length: 1700, u0: 0.7, speed: 3.5 }], { y: 0.2 });
    birds(g, A, 30, 0, 90, 0, 160, 4, 2.0, 0.18);
    const bal = new THREE.Group(); bal.position.set(160, 0, -160); g.add(bal); add(bal, sph(14, 18, 12), lmat(0xe5483a, { rough: 0.6 }), [0, 0, 0], [0, 0, 0], [1, 1.1, 1]); add(bal, box(4, 2.4, 4), lmat(0x8a5a3a), [0, -17, 0]); add(bal, cyl(0.15, 0.15, 120, 4), lmat(0x333640), [0, -75, 0]);
    A.add((t) => { bal.position.y = 120 + Math.sin(t * 0.5) * 20 + 0; });
  }
  return finish(g, A, { name: 'Angkor Wat', realHeightM: 65, realWidthM: 215, source: 'central tower ~65 m above ground; third tier ~42 m; outer enclosure 1.5 x 1.3 km (model enclosure is scaled to ~860 x 790 m)' });
}

// ============================================================ Machu Picchu (Huayna Picchu ~290 m above the site; UNCERTAIN)
export function machuPicchu({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const plateau = (x, z) => Math.exp(-(z * z) / (2 * 110 * 110)) * Math.exp(-Math.pow(x / 330, 4));
  const hFn = (x, z) => {
    let h = -240 + 300 * Math.exp(-(z * z) / (2 * 250 * 250)) * (0.7 + 0.5 * Math.exp(-Math.pow(x / 520, 2)));
    h += 300 * Math.exp(-(Math.pow(x - 40, 2) + Math.pow(z + 280, 2)) / (2 * 62 * 62));                 // Huayna Picchu
    h += 190 * Math.exp(-(Math.pow(x + 420, 2) + Math.pow(z - 60, 2)) / (2 * 150 * 150));            // Machu Picchu mountain
    h += 40 * Math.exp(-(Math.pow(x - 480, 2) + Math.pow(z + 40, 2)) / (2 * 120 * 120));
    h += 22 * (fbm(x * 0.02, z * 0.02, 4) - 0.5);
    const zone = Math.abs(x) < 240 && z > 20 && z < 230; if (zone) h = Math.floor(h / 5.5) * 5.5;      // agricultural terraces
    const city = Math.abs(x) < 200 && Math.abs(z) < 50; if (city) h = 60 + 4 * Math.sin(x * 0.03);
    return h;
  };
  const cFn = (x, z, h) => { const s = Math.abs(hFn(x + 3, z) - h) + Math.abs(hFn(x, z + 3) - h); if (Math.abs(x) < 240 && z > 20 && z < 230 && s > 3) return 0xb8ae98; if (s > 9 && h > 120) return fbm(x * 0.08, z * 0.08) > 0.5 ? 0x9a9484 : 0x868072; return h > 330 ? 0x9aa88a : (fbm(x * 0.03, z * 0.03) > 0.5 ? 0x4f8f48 : 0x62a350); };
  g.add(terrain(1500, 1100, 170, hFn, cFn));
  // the citadel: ~80 stone houses with thatched roofs, main plaza, Sun Temple, Temple of the Three Windows
  const r = rng(9), wall = [], roof = [];
  for (let i = 0; i < 90; i++) { const x = -170 + r() * 330, z = -42 + r() * 84; if (Math.abs(z) < 12 && Math.abs(x - 10) < 60) continue; const w = 5 + r() * 7, d = 4 + r() * 6, h = 3.2 + r() * 1.6, y = hFn(x, z), ry = (Math.round(r() * 2) * Math.PI) / 2 + (r() - 0.5) * 0.1; wall.push({ p: [x, y + h / 2, z], r: [0, ry, 0], s: [w, h, d], c: [0xb8ac96, 0xa89c86, 0xc4b8a0][Math.floor(r() * 3)] }); roof.push({ p: [x, y + h + 1.6, z], r: [0, ry + Math.PI / 4, 0], s: [w * 0.78, 3.6, d * 0.78 * (w / d) * 0.0 + w * 0.78], c: [0xc4a850, 0xb8983c, 0xd4b860][Math.floor(r() * 3)] }); }
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.95 }), wall); instances(g, new THREE.ConeGeometry(0.72, 1, 4), lmat(0xffffff, { rough: 1 }), roof);
  patch(g, 120, 36, 0x6ab852, 10, 60.3, 0, { layer: 2 });                                // central plaza lawn
  const sun = new THREE.Group(); sun.position.set(100, 60, -34); g.add(sun); add(sun, cyl(9, 10, 8, 20, 1, false, 0, 4.6), lmat(0xc4b8a0, { rough: 0.95, side: THREE.DoubleSide }), [0, 4, 0]); add(sun, cone(8, 4, 10), lmat(0xb8983c), [0, 10, 0]);
  add(g, box(10, 5, 4), lmat(0xc4b8a0), [-30, 64, -40]);
  // trails and a few terraces' stone retaining lines on the hillside (already stepped terrain); llamas wander the lawn
  const ll = []; for (let i = 0; i < 9; i++) ll.push({ x: -20 + i * 9, z: -8 + (i % 3) * 8, ph: i * 1.3 });
  const lb = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.4, 1.0, 3, 8), lmat(0xffffff, { rough: 1 }), ll.length), ln = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1, 6), lmat(0xf0e8d8, { rough: 1 }), ll.length), lh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), lmat(0xf0e8d8, { rough: 1 }), ll.length), lo = new THREE.Object3D();
  ll.forEach((l, i) => lb.setColorAt(i, new THREE.Color([0xf0e8d8, 0xb08a60, 0x6a4a30, 0xffffff][i % 4])));
  for (const m of [lb, ln, lh]) { m.frustumCulled = false; m.castShadow = false; g.add(m); }
  A.add((t) => { ll.forEach((l, i) => { const x = l.x + Math.sin(t * 0.15 + l.ph) * 6, z = l.z + Math.cos(t * 0.11 + l.ph) * 4, hd = Math.cos(t * 0.15 + l.ph) > 0 ? 1 : -1, y = 60.4, by = Math.abs(Math.sin(t * 2 + l.ph)) * 0.05; lo.rotation.set(0, hd > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI / 2); lo.position.set(x, y + 1.2 + by, z); lo.scale.setScalar(1.2); lo.updateMatrix(); lb.setMatrixAt(i, lo.matrix); lo.rotation.set(0, 0, hd * -0.4); lo.position.set(x + hd * 1.0, y + 2.1, z); lo.scale.set(1, 1.5, 1); lo.updateMatrix(); ln.setMatrixAt(i, lo.matrix); lo.rotation.set(0, 0, 0); lo.position.set(x + hd * 1.3, y + 2.9, z); lo.scale.setScalar(1); lo.updateMatrix(); lh.setMatrixAt(i, lo.matrix); }); lb.instanceMatrix.needsUpdate = ln.instanceMatrix.needsUpdate = lh.instanceMatrix.needsUpdate = true; });
  if (base) {
    makeCrowd(g, A, 70, { x: 10, z: 0, w: 220, d: 50 }, { seed: 4, scale: 1.7, y: 60.5, speed: 0.4 });
    const trail = []; for (let i = 0; i <= 30; i++) { const x = -150 + i * 10, z = 28 + 0; trail.push([x, hFn(x, z) + 0.2, z]); }
    walkers(g, A, [[-190, 60.5, 20], [-100, 60.8, 14], [0, 60.5, 10], [100, 61, 16], [190, 60.5, 24]], 30, { seed: 3, speed: 0.01, scale: 1.7 });
    trees(g, scatter(500, (q) => { const x = -700 + q() * 1400, z = -520 + q() * 1040; const h = hFn(x, z); const s = Math.abs(hFn(x + 3, z) - h) + Math.abs(hFn(x, z + 3) - h); if (h < -150 || h > 260 || (Math.abs(x) < 250 && Math.abs(z) < 240 && h > 40)) return null; if (s > 10) return null; return [x, z, 1.8, h]; }, 8), { size: 3.2, seed: 8, kinds: 'round', colors: [0x2f7a3a, 0x3f9a52, 0x58b04a] });
    const rv = makeWater(1500, 70, { seg: 40, amp: 0.8, color: 0x7a9a8a, speed: 2.0, scale: 2 }); rv.position.set(0, -228, 480); g.add(rv);
    drift(g, A, 4, 1700, 330, 9, 3, 50);
    birds(g, A, 8, 0, 240, -60, 250, 4, 5, 0.1);
  }
  return finish(g, A, { name: 'Machu Picchu', realHeightM: 290, realWidthM: 530, source: 'UNCERTAIN: Huayna Picchu rises ~290 m above the citadel (citadel ~2,430 m, peak ~2,720 m); citadel ~530 m x 200 m' });
}

// ============================================================ Hollywood sign (letters 13.7 m)
export function hollywoodSign({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const hFn = (x, z) => { const hill = 175 * Math.exp(-((x * x) / (2 * 260 * 260) + Math.pow(z + 60, 2) / (2 * 190 * 190))); const ridge = 20 * Math.exp(-Math.pow(z - 160, 2) / (2 * 60 * 60)); return 8 + hill + ridge + 14 * (fbm(x * 0.02, z * 0.02, 4) - 0.5) - Math.max(0, z - 260) * 0.0; };
  const cFn = (x, z, h) => { const n = fbm(x * 0.05, z * 0.05, 3); return n > 0.62 ? 0x7e9a4e : n > 0.4 ? 0xc0aa68 : 0xb09658; };
  g.add(terrain(1400, 1000, 140, hFn, cFn, { cz: 60 }));
  const white = lmat(0xfbfaf4, { rough: 0.5 }), dark = lmat(0x5a5a62, { rough: 0.8 });
  const Hh = 13.7, dp = 1.4, st = 2.4;
  const S = (w) => (p) => p;
  const extrude = (shape) => new THREE.ExtrudeGeometry(shape, { depth: dp, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15, bevelSegments: 1, curveSegments: 12 });
  const rectS = (x0, y0, x1, y1) => { const s = new THREE.Shape(); s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); return s; };
  const polyS = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); return s; };
  const ovalS = (w) => { const s = new THREE.Shape(); s.absellipse(w / 2, Hh / 2, w / 2, Hh / 2, 0, TAU, false); const h = new THREE.Path(); h.absellipse(w / 2, Hh / 2, w / 2 - st, Hh / 2 - st, 0, TAU, true); s.holes.push(h); return s; };
  const LET = {
    H: { w: 9, geos: [rectS(0, 0, st, Hh), rectS(9 - st, 0, 9, Hh), rectS(0, Hh / 2 - st / 2, 9, Hh / 2 + st / 2)] },
    O: { w: 10, geos: [ovalS(10)] },
    L: { w: 8, geos: [rectS(0, 0, st, Hh), rectS(0, 0, 8, st)] },
    Y: { w: 10, geos: [polyS([[0, Hh], [st * 1.1, Hh], [5 + st * 0.55, Hh * 0.55], [5 - st * 0.55, Hh * 0.55]]), polyS([[10, Hh], [10 - st * 1.1, Hh], [5 - st * 0.55, Hh * 0.55], [5 + st * 0.55, Hh * 0.55]]), rectS(5 - st / 2, 0, 5 + st / 2, Hh * 0.58)] },
    W: { w: 14, geos: [polyS([[0, Hh], [st * 1.1, Hh], [3.4 + st * 0.5, 0], [3.4 - st * 0.5, 0]]), polyS([[7, Hh * 0.7], [7 + st * 0.5, Hh * 0.7], [3.4 + st * 0.5, 0], [3.4 - st * 0.5 + 0.8, 0]]), polyS([[7, Hh * 0.7], [7 - st * 0.5, Hh * 0.7], [10.6 - st * 0.5, 0], [10.6 + st * 0.5 - 0.8, 0]]), polyS([[14, Hh], [14 - st * 1.1, Hh], [10.6 - st * 0.5, 0], [10.6 + st * 0.5, 0]])] },
    D: { w: 10, geos: (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(5, 0); s.absarc(5, Hh / 2, Hh / 2, -Math.PI / 2, Math.PI / 2, false); s.lineTo(0, Hh); s.lineTo(0, 0); s.holes.push((() => { const h = new THREE.Path(); h.moveTo(st, st); h.lineTo(5, st); h.absarc(5, Hh / 2, Hh / 2 - st, -Math.PI / 2, Math.PI / 2, false); h.lineTo(st, Hh - st); h.lineTo(st, st); return h; })()); return [s]; })() },
  };
  const word = 'HOLLYWOOD'.split(''), total = word.reduce((a, c) => a + LET[c].w, 0) + 2.7 * 8;
  let cx = -total / 2; const base0 = hFn(0, 0);
  word.forEach((c, i) => {
    const L = LET[c], x = cx + L.w / 2, y = hFn(x, 0) + 0.4, G = new THREE.Group(); G.position.set(cx, y, 0); g.add(G);
    L.geos.forEach((sh) => { const m = new THREE.Mesh(extrude(sh), white); m.castShadow = m.receiveShadow = true; G.add(m); });
    // scaffolding behind: two tilted struts and a footing plate
    for (const u of [0.25, 0.75]) add(G, box(0.5, Hh * 0.95, 0.5), dark, [L.w * u, Hh * 0.5, -3.4], [0.45, 0, 0]);
    add(G, box(L.w * 0.95, 0.5, 5.5), dark, [L.w / 2, 0.25, -1.6]);
    cx += L.w + 2.7;
  });
  if (base) {
    // chaparral bushes, trail with hikers, the road, LA below, helicopter and clouds
    const bsh = []; const br = rng(3); for (let i = 0; i < 260; i++) { const x = -600 + br() * 1200, z = -300 + br() * 700; const h = hFn(x, z); if (Math.abs(z) < 12 && Math.abs(x) < 70) continue; bsh.push({ p: [x, h + 0.6, z], s: [1.8 + br() * 1.6, 1.2 + br(), 1.8 + br() * 1.6], c: [0x4f7a3a, 0x6a8a3a, 0x7a7a3a][Math.floor(br() * 3)] }); }
    instances(g, new THREE.IcosahedronGeometry(1, 1), lmat(0xffffff, { rough: 1 }), bsh);
    const trail = []; for (let i = 0; i <= 14; i++) { const x = 260 - i * 28, z = 220 - i * 16; trail.push([x, hFn(x, z) + 0.35, z]); }
    for (let i = 0; i < trail.length - 1; i++) { const a = trail[i], b = trail[i + 1]; patch(g, 3.2, Math.hypot(b[0] - a[0], b[2] - a[2]) + 1, 0xd8c8a0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.2, (a[2] + b[2]) / 2, { layer: 3, ry: Math.atan2(b[0] - a[0], b[2] - a[2]) }).rotation.x = -Math.PI / 2 * 0; }
    walkers(g, A, trail, 26, { seed: 4, speed: 0.012, scale: 1.7 });
    // the basin below: grid of low buildings, freeway with cars
    const cb = []; const cr = rng(5); for (let i = -14; i <= 14; i++) for (let j = 0; j < 8; j++) { const h = 8 + cr() * 22; cb.push({ p: [i * 55 + cr() * 8, h / 2 - 2, 560 + j * 55 + cr() * 8], s: [34, h, 34], c: [0xe8dcc0, 0xd8c4a4, 0xb8c4d0, 0xe0b8a0][Math.floor(cr() * 4)] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.85 }), cb);
    patch(g, 1400, 18, 0x474a55, 0, 0.1, 520, { layer: 2 }); makeTraffic(g, A, 20, linePath(-600, 520, 600, 520, 4), 2400, { speed: 18, scale: 2.2, y: 0.3, seed: 8 });
    const heli = new THREE.Group(); g.add(heli); add(heli, rbox(3.4, 2.6, 8, 1.2), lmat(0xe5483a), [0, 0, 0]); add(heli, box(0.5, 0.5, 6), lmat(0xe5483a), [0, 0.3, -6]); const rot = new THREE.Group(); rot.position.y = 1.8; heli.add(rot); add(rot, box(18, 0.1, 0.5), lmat(0x333640)); add(rot, box(0.5, 0.1, 18), lmat(0x333640)); const tr = new THREE.Group(); tr.position.set(0, 0.3, -9.5); heli.add(tr); add(tr, box(0.1, 3, 0.3), lmat(0x333640));
    A.add((t) => { const a = t * 0.22; heli.position.set(Math.cos(a) * 130, 70 + hFn(0, 0) * 0.3 + Math.sin(t * 0.8) * 3, Math.sin(a) * 90 + 60); heli.rotation.y = -a + Math.PI; rot.rotation.y = t * 28; tr.rotation.x = t * 28; });
    birds(g, A, 12, 0, 60, 60, 120, 6, 2.5, 0.2);
    drift(g, A, 7, 1400, 190, 5, 6, 60);
    // spotlights flicker on at dusk: a few lamps along the trail head
    const lampM = new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffd070, emissiveIntensity: 1 }); for (let i = 0; i < 4; i++) { const x = 270 - i * 30, z = 224 - i * 17; add(g, cyl(0.2, 0.3, 5, 6), lmat(0x333640), [x, hFn(x, z) + 2.5, z]); const bm = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), lampM); bm.position.set(x, hFn(x, z) + 5.2, z); g.add(bm); } A.add((t) => { lampM.emissiveIntensity = 0.8 + 0.6 * Math.sin(t * 2); });
  }
  return finish(g, A, { name: 'Hollywood sign', realHeightM: 13.7, realWidthM: 106, source: 'letters 45 ft (13.7 m) tall, sign ~106 m (350 ft) wide on Mount Lee' });
}
