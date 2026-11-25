// Landmarks pack: monuments B (Sydney Opera House + Harbour Bridge, Golden Gate, Tower Bridge, Arc de Triomphe, St Basil's, Kremlin tower, Washington Monument, Gateway Arch). 1 unit = 1 m.
import { THREE, rng, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade, clamp, lerp, smooth, TAU, COL, lmat, animator, finish, frac, ngon, rectPts, scalePts, rotPts, loft, frustum, lathe, merge, xf, ledgeBands, instances, beams, xBrace, flagPole, FLAGS, blinker, makeWater, makeCrowd, makeTraffic, ringPath, linePath, trees, scatter, slab, ring, disc, patch, makeBoats, boatMesh, ringLoft, stripedDome, stripedMat, fbm, makeFlag } from './landmarks_kit.js';

export const birds = (parent, A, n, cx, cy, cz, R, seed, size = 1, speed = 0.5) => {
  const r = rng(seed), P = []; for (let i = 0; i < n; i++) P.push({ a: r() * TAU, rr: R * (0.6 + r() * 0.5), y: (r() - 0.5) * R * 0.3, sp: speed * (0.7 + r() * 0.6), ph: r() * 6 });
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.5 * size, -1.5 * size, 0.35 * size, -0.1 * size, 0, 0, -0.5 * size, 0, 0, 0.5 * size, 1.5 * size, 0.35 * size, -0.1 * size, 0, 0, -0.5 * size], 3)); bg.computeVertexNormals();
  const m = new THREE.InstancedMesh(bg, lmat(0x3a3f4c, { rough: 0.8, side: THREE.DoubleSide }), n), o = new THREE.Object3D(); m.frustumCulled = false; m.castShadow = false; parent.add(m);
  A.add((t) => { P.forEach((p, i) => { const a = p.a + t * p.sp; o.position.set(cx + Math.cos(a) * p.rr, cy + p.y + Math.sin(t * 3 + p.ph) * 0.8 * size, cz + Math.sin(a) * p.rr); o.rotation.set(0, -a, 0); o.scale.set(1, 0.3 + 1.6 * Math.abs(Math.sin(t * 7 + p.ph)), 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.instanceMatrix.needsUpdate = true; });
};
export const drift = (parent, A, n, area, y, seed, speed = 6, size = 30, color = 0xffffff, ei = 0.25) => {
  const r = rng(seed), flat = [];
  for (let i = 0; i < n; i++) { const x = (r() - 0.5) * area, z = (r() - 0.5) * area, yy = y + r() * y * 0.15; for (let k = 0; k < 5; k++) flat.push({ x: x + (k - 2) * size * 0.45 + r() * 6, y: yy + r() * size * 0.15, z: z + (r() - 0.5) * size * 0.4, s: size * (0.35 + r() * 0.3) }); }
  const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lmat(color, { rough: 1, emissive: 0x9aa8b8, ei }), flat.length), o = new THREE.Object3D(); m.frustumCulled = false; m.castShadow = false; parent.add(m);
  A.add((t) => { flat.forEach((p, i) => { const x = ((p.x + t * speed + area / 2) % area + area) % area - area / 2; o.position.set(x, p.y, p.z); o.scale.set(p.s * 1.4, p.s * 0.7, p.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.instanceMatrix.needsUpdate = true; });
};
// hand-clock face on a +Z facing wall
function clockFace(parent, A, x, y, z, r, ry, { face = 0xfff6dc, rim = 0xe0b040, hand = 0x2a2a34, speed = 1 } = {}) {
  const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = ry; parent.add(f);
  add(f, cyl(r, r, 0.4, 32), lmat(rim, { metal: 0.6, rough: 0.35 }), [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(f, cyl(r * 0.92, r * 0.92, 0.5, 32), lmat(face, { rough: 0.3, emissive: 0xffe9a0, ei: 0.5 }), [0, 0, 0.05], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; add(f, box(r * 0.07, r * (i % 3 === 0 ? 0.2 : 0.12), 0.2), lmat(hand), [Math.sin(a) * r * 0.78, Math.cos(a) * r * 0.78, 0.35], [0, 0, -a]); }
  const hh = new THREE.Group(); hh.position.z = 0.45; f.add(hh); const mh = new THREE.Group(); mh.position.z = 0.1; hh.add(mh);
  add(hh, box(r * 0.09, r * 0.5, 0.12), lmat(hand), [0, r * 0.25, 0]); add(mh, box(r * 0.06, r * 0.78, 0.12), lmat(hand), [0, r * 0.39, 0]); add(hh, sph(r * 0.07, 8, 6), lmat(rim, { metal: 0.6 }), [0, 0, 0.1]);
  A.add((t) => { mh.rotation.z = -t * TAU / 12 * speed; hh.rotation.z = -t * TAU / 144 * speed; });
}
export const crenel = (parent, len, y, z, color, { step = 5, w = 2.6, h = 2.4, d = 1.6, swallow = false } = {}) => { const l = []; for (let x = -len / 2; x <= len / 2; x += step) l.push({ p: [x, y + h / 2, z], s: [w, h, d], c: color }); instances(parent, box(1, 1, 1), lmat(0xffffff, { rough: 0.85 }), l); };

// ============================================================ Sydney Opera House (65 m) + Harbour Bridge (134 m)
export function sydneyOperaHouse({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const shellMat = lmat(0xf6f1e4, { rough: 0.28, metal: 0.05, side: THREE.DoubleSide });
  // each shell is an octant of a sphere (triangular curved sail, like the real roof which is cut from one sphere)
  const octant = new THREE.SphereGeometry(1, 22, 14, 0, Math.PI / 2, 0, Math.PI / 2);
  const group = (x, z, sizes, scale, ry) => {
    const G = new THREE.Group(); G.position.set(x, 7, z); G.rotation.y = ry; g.add(G);
    sizes.forEach((H, i) => {
      const k = scale * (1 - i * 0.07), zz = i * 22 * scale;
      const a = add(G, octant, shellMat, [0, 0, zz], [0, 0, -0.32], [H * 0.62 * k / 0.9 * 0.9, H * scale, 24 * k]); a.castShadow = true;
      a.rotation.set(0, Math.PI * 0.5, -0.0); a.rotation.order = 'YXZ'; a.rotation.x = -0.0;
      const b = add(G, octant, shellMat, [-3 * scale, 0, zz + 2], [0, 0, 0], [H * 0.5 * k, H * 0.74 * scale, 20 * k]); b.rotation.set(0, -Math.PI * 0.5, 0); b.castShadow = true;
      b.position.x = 9 * scale;
    });
    add(G, box(10 * scale, 6 * scale, sizes.length * 22 * scale), lmat(0xd8d0bc, { rough: 0.6 }), [-6 * scale, 3 * scale, (sizes.length - 1) * 11 * scale]);
    return G;
  };
  group(-34, -34, [64, 55, 45, 34], 1.0, 0.0); group(-34, 56, [42, 36, 28], 0.95, 0.0);
  // podium: broad granite steps, forecourt, then the harbour-side promenade
  add(g, box(190, 7, 130), lmat(0xd8c9a8, { rough: 0.9 }), [0, 3.5, 20]);
  for (let i = 0; i < 6; i++) add(g, box(110 - i * 0, 1.2, 8), lmat(i % 2 ? 0xe2d4b4 : 0xd2c3a2), [-10, 0.6 + i * 1.2, 94 + (5 - i) * 8 * 0 + (5 - i) * 6]);
  // moving: ferries, yachts, little crowd on the steps, gulls
  if (base) {
    slab(g, 1100, 1, 0xc9bc9a, { y: -2.2, layer: 1 });
    const wat = makeWater(1900, 1500, { seg: 52, amp: 0.7, color: 0x2f8fc4, speed: 1.1, scale: 3 }); wat.position.set(0, -1.6, 300); g.add(wat);
    patch(g, 190, 130, 0xe0d4b8, 0, 7.2, 20, { layer: 2 });
    const bl = rng(4);
    makeBoats(g, A, [
      { len: 42, color: 0x1f9a5a, cabin: 0xffd23f, path: linePath(-700, 250, 700, 250, 0), length: 2800, u0: 0.1, speed: 9 },
      { len: 38, color: 0xffd23f, cabin: 0x1f9a5a, path: linePath(700, 330, -700, 330, 0), length: 2800, u0: 0.5, speed: 8 },
      { len: 20, color: 0xffffff, sail: true, path: linePath(-700, 420, 700, 420, 0), length: 2800, u0: 0.2, speed: 5 },
      { len: 16, color: 0xe5483a, sail: true, path: linePath(700, 520, -700, 520, 0), length: 2800, u0: 0.7, speed: 4 },
      { len: 12, color: 0xffffff, sail: true, path: linePath(-700, 600, 700, 600, 0), length: 2800, u0: 0.9, speed: 3 },
      { len: 60, color: 0x2f6fd6, cabin: 0xffffff, path: linePath(700, 140, -700, 140, 0), length: 2800, u0: 0.35, speed: 6 }], { y: -1.2 });
    makeCrowd(g, A, 60, { x: 0, z: 70, w: 150, d: 50 }, { seed: 4, scale: 1.7, y: 7.2, speed: 0.4 });
    birds(g, A, 18, 0, 60, 60, 80, 6, 1.2);
    // Royal Botanic Garden and city skyline behind
    patch(g, 600, 160, 0x5aa84a, 40, -2.0, -200, { layer: 2 });
    trees(g, scatter(70, (q) => [-250 + q() * 600, -270 + q() * 130], 5).map(([x, z]) => [x, z, 1.8, -2]), { size: 1.4, seed: 5 });
    const sk = rng(8), b = []; for (let i = 0; i < 40; i++) { const h = 40 + sk() * sk() * 200; b.push({ p: [-500 + i * 26, h / 2 - 2, -420 - sk() * 40], s: [20 + sk() * 14, h, 20 + sk() * 10], c: [0x9aa7b8, 0x8f9db0, 0xb8c4d0, 0xc7b8a0][Math.floor(sk() * 4)] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { metal: 0.2, rough: 0.5 }), b);
    // Harbour Bridge: steel through-arch (134 m) a few hundred metres away
    const B = new THREE.Group(); B.position.set(-80, -2, -760); g.add(B);
    const span = 251.5, T = (x) => 134 - 108 * Math.pow(x / span, 2), D = (x) => 16 - 6 * (1 - Math.pow(x / span, 2)) * 1.0, Bt = (x) => T(x) - D(x);
    const top = [], bot = [], lat = [], hang = [];
    const N = 40; for (let i = 0; i <= N; i++) { const x = -span + (2 * span * i) / N; top.push([x, T(x), 0]); bot.push([x, Bt(x), 0]); }
    for (const z of [-14, 14]) {
      for (let i = 0; i < N; i++) { lat.push([top[i][0], top[i][1], z, top[i + 1][0], top[i + 1][1], z, 3.2, 3.2]); lat.push([bot[i][0], bot[i][1], z, bot[i + 1][0], bot[i + 1][1], z, 2.6, 2.6]); lat.push([top[i][0], top[i][1], z, bot[i][0], bot[i][1], z, 1.4, 1.4]); lat.push([top[i][0], top[i][1], z, bot[i + 1][0], bot[i + 1][1], z, 1.2, 1.2]); }
      lat.push([top[N][0], top[N][1], z, bot[N][0], bot[N][1], z, 1.4, 1.4]);
    }
    for (let i = 0; i <= N; i++) lat.push([top[i][0], top[i][1], -14, top[i][0], top[i][1], 14, 1.4, 1.4]);
    for (let x = -span; x <= span; x += 14) { const yb = Bt(x); if (yb > 49) for (const z of [-14, 14]) hang.push([x, 49, z, x, yb, z, 0.9, 0.9]); }
    const steel = lmat(0x8a96a2, { rough: 0.55, metal: 0.4 });
    beams(B, steel, lat, { shadow: true }); beams(B, steel, hang);
    add(B, box(1100, 3.4, 49), lmat(0x6a7078, { rough: 0.6 }), [0, 48, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(B, box(14, 89, 14), lmat(0xb8a68a, { rough: 0.9 }), [sx * (span + 5), 44, sz * 16]); add(B, cyl(5, 7, 14, 10), lmat(0xb8a68a), [sx * (span + 5), 96, sz * 16]); }
    const tr = []; for (let i = 0; i < 8; i++) tr.push(add(B, rbox(18, 4.4, 4, 1), lmat(i === 0 ? 0xd32f2f : 0xf4f0e8, { rough: 0.4 }), [0, 52.4, -8]));
    A.add((t) => { tr.forEach((c, i) => { c.position.x = ((frac(t * 0.03 - i * 0.0075) * 1100) - 550); }); });
    makeTraffic(B, A, 24, linePath(-540, 0, 540, 0, 10), 2160, { speed: 14, scale: 1.8, y: 50.1, seed: 12 });
    const wat2 = makeWater(1400, 200, { seg: 30, amp: 0.4, color: 0x2f8fc4, speed: 1.1, scale: 3 }); wat2.position.set(0, 1.2, 0); B.add(wat2);
    blinker(B, A, 0, 136, 0, 0xff2a2a, 1.2, { period: 1.4 });
    B.userData.heightM = 134; g.userData.bridgeHeightM = 134;
  }
  return finish(g, A, { name: 'Sydney Opera House + Harbour Bridge', realHeightM: 65, bridgeHeightM: 134, realWidthM: 183, source: 'Opera House 65 m (tallest shell), 183 m long; Harbour Bridge arch 134 m, deck 49 m, span 503 m' });
}

// ============================================================ Golden Gate Bridge (227 m towers)
export function goldenGate({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const orange = lmat(0xd8472b, { rough: 0.45, metal: 0.15 }), orangeD = lmat(0xb53a22, { rough: 0.5 });
  const TX = 640, TOP = 227, DECK = 67;
  for (const sx of [-1, 1]) {
    const T = new THREE.Group(); T.position.x = sx * TX; g.add(T);
    for (const sz of [-1, 1]) {
      add(T, loft([{ y: 0, pts: rectPts(10, 8) }, { y: TOP, pts: rectPts(6.4, 5.2) }]), orange, [0, 0, sz * 14]).castShadow = true;
      for (let k = 0; k < 9; k++) { const y = 20 + k * 22; add(T, box(7 - k * 0.07, 1.1, 5.6 - k * 0.05), orangeD, [0, y, sz * 14]); }
    }
    for (let k = 0; k < 8; k++) { const y = 28 + k * 24 + (k > 5 ? 8 : 0); if (k === 7) continue; add(T, box(5.4, 9 - k * 0.2, 28), orange, [0, y + 4, 0]); }
    add(T, box(7.2, 7, 31), orange, [0, TOP - 3, 0]); add(T, box(8, 1.4, 32), orangeD, [0, TOP + 1, 0]);
    for (const sz of [-1, 1]) add(T, cyl(0.8, 1.2, 6, 8), orangeD, [0, TOP + 4, sz * 14]);
    blinker(T, A, 0, TOP + 8, -14, 0xff2a2a, 0.9, { period: 1.5, phase: sx > 0 ? 0.5 : 0 }); blinker(T, A, 0, TOP + 8, 14, 0xff2a2a, 0.9, { period: 1.5, phase: sx > 0 ? 0 : 0.5 });
  }
  const L = 1000 + 343 + 640;
  add(g, box(2 * (TX + 343) + 60, 6, 26), lmat(0x8a8a90, { rough: 0.6 }), [0, DECK, 0]);
  add(g, box(2 * (TX + 343) + 60, 1.4, 27), orange, [0, DECK + 3.5, 0]);
  // main cables (parabolas) + suspenders; side spans
  const cab = [], sus = [];
  const cableY = (x) => { const ax = Math.abs(x); if (ax <= TX) return 76 + (TOP - 76) * Math.pow(ax / TX, 2); const s = (ax - TX) / 343; return TOP - (TOP - 90) * Math.pow(s, 1.5) * 1.0; };
  for (const sz of [-1, 1]) { let px = -TX - 343, py = cableY(px); for (let i = 1; i <= 120; i++) { const x = -TX - 343 + (2 * (TX + 343) * i) / 120, y = cableY(x); cab.push([px, py, sz * 14, x, y, sz * 14, 1.9, 1.9]); px = x; py = y; } for (let x = -TX - 330; x <= TX + 330; x += 15) { const yy = cableY(x); if (yy > DECK + 6) sus.push([x, DECK + 4, sz * 14, x, yy, sz * 14, 0.45, 0.45]); } }
  beams(g, orange, cab, { shadow: true }); beams(g, lmat(0xe8856a, { rough: 0.5 }), sus);
  // deck truss
  const tr = []; for (let x = -TX - 340; x < TX + 340; x += 10) for (const sz of [-1, 1]) { tr.push([x, DECK - 1, sz * 12.5, x + 5, DECK - 7, sz * 12.5, 0.8, 0.8]); tr.push([x + 5, DECK - 7, sz * 12.5, x + 10, DECK - 1, sz * 12.5, 0.8, 0.8]); }
  beams(g, orangeD, tr);
  add(g, box(2 * (TX + 343) + 60, 1.2, 4), orangeD, [0, DECK - 7.5, 0]); for (const sz of [-1, 1]) add(g, box(2 * (TX + 343) + 60, 1, 1.4), orangeD, [0, DECK - 7.2, sz * 12.5]);
  // landscape: Marin Headlands (north), San Francisco (south), water, fog banks, ships
  if (base) {
    slab(g, 1900, 1, 0x4f9a46, { y: -9, layer: 1 });
    const bay = makeWater(1700, 1500, { seg: 56, amp: 1.0, color: 0x2a7fb6, speed: 0.9, scale: 4 }); bay.position.set(0, -1, 0); g.add(bay);
    const hills = []; const hr = rng(11);
    for (const [sx, n] of [[-1, 18], [1, 22]]) for (let i = 0; i < n; i++) hills.push({ p: [sx * (TX + 360 + hr() * 700) + 0, -20, -500 + hr() * 1000], s: [220 + hr() * 260, 90 + hr() * 190, 180 + hr() * 220], c: [0x6a9a4a, 0x5a8a42, 0x8a9a52, 0x4f8a46][Math.floor(hr() * 4)] });
    instances(g, new THREE.SphereGeometry(1, 20, 12), lmat(0xffffff, { rough: 1 }), hills);
    // far-away hills closing the strait
    const far = []; for (let i = 0; i < 12; i++) far.push({ p: [(-5 + i) * 220, -30, -1150 - hr() * 200], s: [260, 120 + hr() * 120, 200], c: 0x7aa66a });
    instances(g, new THREE.SphereGeometry(1, 16, 10), lmat(0xffffff, { rough: 1 }), far);
    // cars on the deck and traffic on both approach roads
    makeTraffic(g, A, 30, linePath(-980, 0, 980, 0, 6), 3920, { speed: 16, scale: 1.8, y: DECK + 2.9, seed: 3 });
    // fog banks rolling through the gap
    const fg = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lmat(0xffffff, { rough: 1, emissive: 0xc8d4e0, ei: 0.35, opacity: 0.92 }), 26), o = new THREE.Object3D(), fr = rng(5), P = []; fg.frustumCulled = false; fg.castShadow = false; g.add(fg);
    for (let i = 0; i < 26; i++) P.push({ x: fr() * 2400, z: -700 + fr() * 300 + (i % 3) * 20, y: 20 + fr() * 40, s: 40 + fr() * 70, h: 12 + fr() * 18 });
    A.add((t) => { P.forEach((p, i) => { const x = ((p.x + t * 9) % 2400) - 1200; o.position.set(x, p.y * 0.4 + 20, p.z); o.scale.set(p.s * 1.7, p.h, p.s * 0.8); o.updateMatrix(); fg.setMatrixAt(i, o.matrix); }); fg.instanceMatrix.needsUpdate = true; });
    // container ship passing underneath, sailing boats
    const ship = new THREE.Group(); g.add(ship); add(ship, rbox(34, 14, 220, 3), lmat(0x2a4a6a), [0, 2, 0]); add(ship, box(22, 30, 14), lmat(0xf4f0e8), [0, 18, -90]);
    const cs = []; const cr = rng(2); for (let i = 0; i < 30; i++) for (let j = 0; j < 3; j++) cs.push({ p: [(j - 1) * 9, 12 + (i % 2) * 7, -70 + i * 5], s: [8, 6.4, 4.6], c: [0xe5483a, 0x2f6fd6, 0xffd23f, 0x2fa66a, 0xff8a2b][Math.floor(cr() * 5)] });
    instances(ship, box(1, 1, 1), lmat(0xffffff, { rough: 0.6 }), cs);
    A.add((t) => { ship.position.set(lerp(-700, 700, frac(t * 0.02 + 0.3)), -0.8 + Math.sin(t) * 0.3, -60); ship.rotation.y = Math.PI / 2; });
    makeBoats(g, A, [{ len: 24, color: 0xffffff, sail: true, path: linePath(-600, 260, 600, 260, 0), length: 2400, u0: 0.2, speed: 6 }, { len: 18, color: 0xe5483a, sail: true, path: linePath(600, 330, -600, 330, 0), length: 2400, u0: 0.6, speed: 5 }, { len: 14, color: 0xffd23f, sail: true, path: linePath(-600, 150, 600, 150, 0), length: 2400, u0: 0.4, speed: 5 }, { len: 40, color: 0xe5483a, cabin: 0xffffff, path: linePath(600, 120, -600, 120, 0), length: 2400, u0: 0.9, speed: 7 }], { y: -0.4 });
    birds(g, A, 20, 0, 150, 100, 160, 7, 3);
  }
  return finish(g, A, { name: 'Golden Gate Bridge', realHeightM: 227, realWidthM: 27, realLengthM: 2737, source: 'towers 227 m above water, main span 1,280 m, deck 67 m above water, total 2,737 m' });
}

// ============================================================ Tower Bridge (65 m towers, 244 m long)
export function towerBridge({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const stone = lmat(0xcfc7b4, { rough: 0.85 }), stoneD = lmat(0xb4ab98, { rough: 0.9 }), blue = lmat(0x3a6ab0, { rough: 0.45, metal: 0.2 }), roofM = lmat(0x4a5864, { rough: 0.55 }), white = lmat(0xf4f1ea, { rough: 0.5 });
  const TX = 41;
  for (const sx of [-1, 1]) {
    const T = new THREE.Group(); T.position.x = sx * TX; g.add(T);
    add(T, box(16, 45, 26), stone, [0, 22.5, 0]);
    add(T, box(17, 3, 27), stoneD, [0, 46.5, 0]);
    add(T, box(15, 14, 25), stone, [0, 53, 0]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) { add(T, box(3.6, 20, 3.6), stoneD, [a * 6.2, 55, b * 10.2]); add(T, cone(3.3, 9, 4), roofM, [a * 6.2, 69, b * 10.2], [0, Math.PI / 4, 0]); add(T, cone(0.3, 3, 4), lmat(0xe0b040, { metal: 0.6 }), [a * 6.2, 74.5, b * 10.2]); }
    add(T, cone(11, 10, 4), roofM, [0, 65, 0], [0, Math.PI / 4, 0]).scale.set(1, 1, 1.2);
    const w = []; for (let y = 8; y < 44; y += 8) for (const u of [-6, -2, 2, 6]) { w.push({ p: [u * 0.9, y + 3, 13.1], s: [1.1, 4.4, 0.3], c: 0x2a3340 }); w.push({ p: [u * 0.9, y + 3, -13.1], s: [1.1, 4.4, 0.3], c: 0x2a3340 }); }
    for (let y = 8; y < 44; y += 8) for (const u of [-9, -3, 3, 9]) for (const s2 of [-1, 1]) w.push({ p: [s2 * 8.1, y + 3, u], s: [0.3, 4.4, 1.1], c: 0x2a3340 });
    instances(T, box(1, 1, 1), lmat(0xffffff, { rough: 0.3 }), w);
    add(T, box(15, 3.2, 12), stoneD, [0, 14, 0]).visible = false;
  }
  // blue high-level walkways with lattice and low-level road deck
  const hw = []; for (let x = -TX + 8; x < TX - 8; x += 3.4) { hw.push([x, 41.5, -3, x + 1.7, 45.4, -3, 0.5, 0.5], [x + 1.7, 45.4, -3, x + 3.4, 41.5, -3, 0.5, 0.5], [x, 41.5, 3, x + 1.7, 45.4, 3, 0.5, 0.5], [x + 1.7, 45.4, 3, x + 3.4, 41.5, 3, 0.5, 0.5]); }
  beams(g, blue, hw);
  add(g, box(2 * TX - 14, 1.2, 8), blue, [0, 41, 0]); add(g, box(2 * TX - 14, 1.0, 8), blue, [0, 46.3, 0]);
  add(g, box(2 * TX - 14, 4, 0.4), lmat(0x7ec8f0, { rough: 0.1, metal: 0.3 }), [0, 43.8, -4]);
  add(g, box(2 * TX - 14, 4, 0.4), lmat(0x7ec8f0, { rough: 0.1, metal: 0.3 }), [0, 43.8, 4]);
  // side spans: suspension chains and hangers to the abutment towers; fixed road deck
  const ch = [], hg = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x0 = sx * TX, x1 = sx * (TX + 85); let px = x0, py = 54; for (let i = 1; i <= 20; i++) { const x = lerp(x0, x1, i / 20), s = i / 20, y = 54 - (54 - 14) * Math.pow(s, 1.8); ch.push([px, py, sz * 10, x, y, sz * 10, 1.1, 1.1]); if (i % 2 === 0 && y > 16) hg.push([x, 13, sz * 10, x, y, sz * 10, 0.35, 0.35]); px = x; py = y; } add(g, box(8, 20, 14), stone, [x1, 10, sz * 0]).visible = false; }
  beams(g, blue, ch); beams(g, blue, hg);
  for (const sx of [-1, 1]) { add(g, box(10, 20, 26), stone, [sx * (TX + 87), 10, 0]); add(g, cone(5, 8, 4), roofM, [sx * (TX + 87), 24, 0], [0, Math.PI / 4, 0]); add(g, box(90, 2.4, 22), lmat(0x555a66, { rough: 0.6 }), [sx * (TX + 45), 12.5, 0]); for (const sz of [-1, 1]) add(g, box(90, 1.0, 0.5), blue, [sx * (TX + 45), 14, sz * 10.8]); }
  // bascule leaves that rise and fall: two leaves, hinge at the tower inner faces
  const leaves = [];
  for (const sx of [-1, 1]) { const hinge = new THREE.Group(); hinge.position.set(sx * (TX - 8), 12.5, 0); g.add(hinge); add(hinge, box(31, 2.4, 22), lmat(0x555a66, { rough: 0.6 }), [-sx * 15.5, 0, 0]); for (const sz of [-1, 1]) add(hinge, box(31, 1.0, 0.5), blue, [-sx * 15.5, 1.7, sz * 10.8]); add(hinge, box(31, 0.1, 3), lmat(0xffd23f), [-sx * 15.5, 1.25, 0]); leaves.push([hinge, sx]); }
  const lift = (t) => { const c = (t % 22) / 22; return Math.sin(clamp((c - 0.15) / 0.12) * Math.PI / 2) * (1 - smooth(clamp((c - 0.55) / 0.12))); };
  A.add((t) => { const k = lift(t) * 1.25; leaves.forEach(([h, sx]) => { h.rotation.z = sx * -1 * k * -1; h.rotation.z = (sx > 0 ? 1 : -1) * k; }); });
  blinker(g, A, -TX, 77, 0, 0xff2a2a, 0.5, { period: 2 }); blinker(g, A, TX, 77, 0, 0xff2a2a, 0.5, { period: 2, phase: 0.5 });
  if (base) {
    slab(g, 480, 1, 0xb8b4a8, { y: -3, layer: 1 });
    const th = makeWater(900, 130, { seg: 40, amp: 0.3, color: 0x5a8aa0, speed: 1.0, scale: 1 }); th.rotation.y = Math.PI / 2; th.position.set(0, -2.2, 0); g.add(th);
    add(g, box(500, 6, 30), lmat(0xb8b4a8), [0, -0.5, 80]).visible = false;
    makeTraffic(g, A, 10, linePath(-300, 0, 300, 0, 5), 1200, { speed: 8, scale: 1.4, y: 13.8, seed: 5, colors: [0xd32f2f, 0xd32f2f, 0x15151c, 0xffffff] });
    makeBoats(g, A, [{ len: 34, color: 0xffffff, cabin: 0x3a6ab0, path: linePath(0, -400, 0, 400, 10), length: 1600, u0: 0.1, speed: 6 }, { len: 22, color: 0xe5483a, path: linePath(0, 400, 0, -400, 10), length: 1600, u0: 0.55, speed: 5 }, { len: 14, color: 0xffd23f, sail: false, path: linePath(0, -400, 0, 400, -12), length: 1600, u0: 0.8, speed: 4 }], { y: -1.6 });
    // embankments with promenades, plus Tower of London, the Shard, the Gherkin in the skyline
    for (const sz of [-1, 1]) { patch(g, 460, 70, 0xe0d8c4, 0, -0.1, sz * 100, { layer: 2 }); add(g, box(460, 4, 4), stoneD, [0, -1, sz * 66]); }
    const TL = new THREE.Group(); TL.position.set(-120, 0, -140); g.add(TL); add(TL, box(36, 28, 36), lmat(0xefe9d8), [0, 14, 0]); for (const a of [-1, 1]) for (const b of [-1, 1]) { add(TL, cyl(4, 4, 34, 8), lmat(0xefe9d8), [a * 18, 17, b * 18]); add(TL, sph(4.3, 10, 8), lmat(0x6a7a82), [a * 18, 34, b * 18], [0, 0, 0], [1, 0.7, 1]); }
    add(TL, box(130, 8, 100), lmat(0xcfc3a8), [0, 4, 0]).visible = false; flagPole(TL, A, 0, 28, 0, 14, 8, FLAGS.uk, { phase: 1 });
    const sh = new THREE.Group(); sh.position.set(200, 0, 150); g.add(sh); add(sh, loft([{ y: 0, pts: ngon(4, 28, Math.PI / 4) }, { y: 310, pts: ngon(4, 1, Math.PI / 4) }]), lmat(0xbfd8ea, { rough: 0.1, metal: 0.5 }));
    const gk = new THREE.Group(); gk.position.set(-330, 0, -430); g.add(gk); add(gk, lathe([[0.01, 0], [13, 4], [24, 60], [26, 110], [22, 150], [14, 190], [5, 220], [0.01, 232]], 24), lmat(0x8ab8c8, { rough: 0.15, metal: 0.5 }));
    const bl = rng(2), bb = []; for (let i = 0; i < 40; i++) { const x = -420 + i * 22, z = (i % 2 ? 1 : -1) * (180 + bl() * 120), h = 25 + bl() * 40; bb.push({ p: [x, h / 2, z], s: [24, h, 26], c: [0xd8c4a4, 0xb8553a, 0xb0b8c0, 0xe0d4b8][Math.floor(bl() * 4)] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.85 }), bb);
    makeCrowd(g, A, 50, { x: 0, z: 0, w: 220, d: 12 }, { seed: 4, scale: 1.7, y: 14, speed: 0.4 });
    makeCrowd(g, A, 40, { x: 0, z: 100, w: 300, d: 40 }, { seed: 5, scale: 1.7, y: 0.1, speed: 0.4 });
    trees(g, scatter(30, (q) => [(q() - 0.5) * 400, (q() < 0.5 ? -1 : 1) * (115 + q() * 25)], 2), { size: 1.6, seed: 2 });
    birds(g, A, 14, 0, 50, 0, 60, 4, 1.0);
  }
  return finish(g, A, { name: 'Tower Bridge', realHeightM: 65, realWidthM: 244, source: 'towers 65 m, 244 m long, bascules ~30 m each, high walkway 43 m' });
}

// ============================================================ Arc de Triomphe (50 m) + Place Charles de Gaulle
export function arcDeTriomphe({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const stone = lmat(0xe2d6b8, { rough: 0.8 }), stoneD = lmat(0xc9bb98, { rough: 0.85 });
  const W = 45, Dp = 22, Hh = 50;
  // big arch passes through the depth; face panel = rectangle with arch hole (extruded)
  const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, Hh); s.lineTo(-W / 2, Hh); s.lineTo(-W / 2, 0);
  const ah = new THREE.Path(), aw = 7.3, ar = 29.2 - aw; ah.moveTo(-aw, 0); ah.lineTo(aw, 0); ah.lineTo(aw, ar); ah.absarc(0, ar, aw, 0, Math.PI, false); ah.lineTo(-aw, 0); s.holes.push(ah);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: Dp, bevelEnabled: false, curveSegments: 14 }), stone); body.position.z = -Dp / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  // small arches on the narrow faces (dark, recessed)
  for (const sx of [-1, 1]) { add(g, rbox(0.8, 18.7, 8.4, 3.5), lmat(0x2a2630), [sx * (W / 2 + 0.05), 9.4, 0]); }
  // cornice, attic band with shields, base plinth, friezes
  add(g, box(W + 1.4, 1.6, Dp + 1.4), stoneD, [0, 38.5, 0]); add(g, box(W + 1.8, 2.2, Dp + 1.8), stoneD, [0, Hh + 1.1, 0]); add(g, box(W + 3, 1.0, Dp + 3), stoneD, [0, 0.5, 0]);
  const sh = []; for (let i = 0; i < 15; i++) for (const sz of [-1, 1]) sh.push({ p: [-W / 2 + 2 + i * (W - 4) / 14, 44.4, sz * (Dp / 2 + 0.1)], s: [2.2, 2.2, 0.5], c: 0xd9a63a });
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) sh.push({ p: [sx * (W / 2 + 0.1), 44.4, -Dp / 2 + 2 + i * (Dp - 4) / 5], s: [0.5, 2.2, 2.2], c: 0xd9a63a });
  instances(g, new THREE.CylinderGeometry(0.5, 0.5, 1, 14), lmat(0xffffff, { metal: 0.5, rough: 0.4 }), sh.map((q) => ({ ...q, r: q.s[2] === 0.5 ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2] })));
  // relief groups on the four piers (big carved panels)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, rbox(11, 20, 1.2, 2.5), stoneD, [sx * 15, 24, sz * (Dp / 2 + 0.2)]);
  add(g, box(W - 4, 4.6, Dp + 0.7), lmat(0xd6c8a4, { rough: 0.9 }), [0, 36, 0]);
  // eternal flame, tomb slab, waving French flag under the arch
  add(g, box(2.4, 0.3, 3.4), lmat(0x555a60), [0, 0.2, 0]); add(g, tor(0.9, 0.12, 6, 14), lmat(0x8a6a2a, { metal: 0.7 }), [0, 0.55, 0], [Math.PI / 2, 0, 0]);
  const fl = new THREE.MeshStandardMaterial({ color: 0xffb21f, emissive: 0xff8a10, emissiveIntensity: 2.2 }); const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 8), fl); flame.position.set(0, 1.2, 0); g.add(flame);
  A.add((t) => { flame.scale.set(1, 1 + 0.2 * Math.sin(t * 14) + 0.1 * Math.sin(t * 27), 1); fl.emissiveIntensity = 1.8 + 0.6 * Math.sin(t * 17); });
  const flag = makeFlag(8, 12, FLAGS.france, { nx: 9, ny: 10, amp: 0.1, speed: 2.5 }); flag.rotation.z = Math.PI / 2; flag.position.set(-4, 28.5, 0); flag.rotation.set(0, Math.PI / 2, -Math.PI / 2); g.add(flag); A.add((t) => flag.userData.wave(t));
  if (base) {
    slab(g, 520, 1, 0xd4c8aa, { y: -0.04, layer: 1 });
    // the roundabout (Etoile) with its twelve avenues, traffic circling
    ring(g, 66, 110, 0x474a55, 0.12, { layer: 3 }); disc(g, 66, 0xd8d0b8, 0.1, { layer: 2 });
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, len = 440; const px = Math.cos(a) * (110 + len / 2), pz = Math.sin(a) * (110 + len / 2); patch(g, k === 0 ? 70 : 28, len, 0x474a55, px, 0.14, pz, { layer: 3, ry: Math.PI / 2 - a }); for (const sd of [-1, 1]) trees(g, Array.from({ length: 10 }, (_, i) => [Math.cos(a) * (125 + i * 38) + -Math.sin(a) * sd * (k === 0 ? 40 : 18), Math.sin(a) * (125 + i * 38) + Math.cos(a) * sd * (k === 0 ? 40 : 18)]), { size: 1.7, seed: k + sd * 3 }); }
    makeTraffic(g, A, 22, ringPath(0, 0, 100), TAU * 100, { speed: 9, scale: 1.7, y: 0.25, seed: 4 }); makeTraffic(g, A, 18, ringPath(0, 0, 80), -TAU * 80 * -1, { speed: 7, scale: 1.7, y: 0.25, seed: 6 });
    // Haussmann blocks in the wedges between avenues
    const hb = rng(4), bl = [], rf = []; for (let k = 0; k < 12; k++) for (let j = 0; j < 4; j++) { const a = (k + 0.5) / 12 * TAU, d = 190 + j * 62; const h = 20 + hb() * 6, x = Math.cos(a) * d, z = Math.sin(a) * d; bl.push({ p: [x, h / 2, z], s: [46, h, 46], c: [0xe8dcc0, 0xdccfb2, 0xe2d6bc][Math.floor(hb() * 3)], r: [0, -a, 0] }); rf.push({ p: [x, h + 3.5, z], s: [44, 7, 44], c: 0x5c6470, r: [0, -a, 0] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.85 }), bl); instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.8 }), rf);
    makeCrowd(g, A, 70, { x: 0, z: 0, r: 60 }, { seed: 4, scale: 1.7, y: 0.2, speed: 0.4 });
    birds(g, A, 16, 0, 70, 0, 50, 8, 1.1);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; flagPole(g, A, Math.cos(a) * 60, 0.2, Math.sin(a) * 60, 14, 6, FLAGS.france, { phase: i, rotY: -a }); }
  }
  return finish(g, A, { name: 'Arc de Triomphe', realHeightM: 50, realWidthM: 45, source: '50 m high, 45 m wide, 22 m deep' });
}

// ============================================================ St Basil's Cathedral (47 m)
export function stBasils({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const brick = lmat(0xb5483a, { rough: 0.8 }), white = lmat(0xf4efe4, { rough: 0.6 }), gold = lmat(0xe0b040, { metal: 0.7, rough: 0.3 });
  add(g, box(70, 5, 70), lmat(0xcfc0a4, { rough: 0.9 }), [0, 2.5, 0]);
  add(g, box(56, 7, 56), brick, [0, 8.5, 0]);   // podium plinth
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; add(g, box(2.4, 5, 1), white, [Math.cos(a) * 28.1, 8.6, Math.sin(a) * 28.1], [0, -a + Math.PI / 2, 0]).visible = false; }
  // arcade windows on the plinth
  const pw = []; for (let i = 0; i < 12; i++) for (const sd of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const u = -24 + i * 4.4; pw.push({ p: sd[0] === 0 ? [u, 8, sd[1] * 28.1] : [sd[0] * 28.1, 8, u], s: sd[0] === 0 ? [1.6, 4.2, 0.4] : [0.4, 4.2, 1.6], c: 0x2a2630 }); }
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.4 }), pw);
  // central tent tower (47 m): octagonal drum + tall tiled octagonal pyramid with gold tip
  add(g, loft([{ y: 12, pts: ngon(8, 10.5, Math.PI / 8) }, { y: 26, pts: ngon(8, 8.6, Math.PI / 8) }]), brick);
  add(g, loft([{ y: 26, pts: ngon(8, 9.2, Math.PI / 8) }, { y: 27.2, pts: ngon(8, 9.2, Math.PI / 8) }]), white);
  add(g, loft([{ y: 27.2, pts: ngon(8, 6.8, Math.PI / 8) }, { y: 36, pts: ngon(8, 6.8, Math.PI / 8) }]), white);
  const tent = loft(Array.from({ length: 9 }, (_, i) => { const t = i / 8; return { y: 36 + t * 10, pts: ngon(8, 8.2 * (1 - Math.pow(t, 0.8)) + 0.8 * (1 - t), Math.PI / 8) }; }).concat([{ y: 46.5, pts: ngon(8, 0.5, Math.PI / 8) }]), {});
  add(g, tent, lmat(0xc2402e, { rough: 0.5 }));
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; add(g, box(0.5, 10.5, 0.4), white, [Math.cos(a) * 4.3, 41.2, Math.sin(a) * 4.3], [0, -a, Math.cos(0) * 0.0 + Math.atan(0)]).rotation.set(0.0, -a + 0, 0); }
  add(g, sph(1.7, 12, 10), gold, [0, 48, 0]); add(g, cyl(0.12, 0.2, 5, 6), gold, [0, 51, 0]);
  // eight chapels with differently patterned onion domes
  const pats = [{ mode: 'spiral', cols: [0x2fa66a, 0xf0e8d0], n: 8 }, { mode: 'spiral', cols: [0xd33a3a, 0xf4efe4], n: 10 }, { mode: 'check', cols: [0x2f6fd6, 0xf4efe4], n: 10 }, { mode: 'ribs', cols: [0xe0b040, 0x2fa66a], n: 14 }, { mode: 'spiral', cols: [0x8a52c9, 0xe0b040], n: 8 }, { mode: 'check', cols: [0x2fa66a, 0xe0b040], n: 12 }, { mode: 'spiral', cols: [0xe5483a, 0x2fa66a], n: 12 }, { mode: 'ribs', cols: [0x2f6fd6, 0xe0b040], n: 16 }];
  const onion = [[0.01, 0], [2.2, 0.6], [4.4, 3.2], [4.9, 5.6], [3.8, 8.2], [1.8, 10.6], [0.5, 12.4], [0.01, 13.6]];
  const doms = [];
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU, big = k % 2 === 0, R = big ? 22.5 : 20, x = Math.cos(a) * R, z = Math.sin(a) * R, dh = big ? 22 : 16, rr = big ? 5.6 : 4.4;
    const c = new THREE.Group(); c.position.set(x, 12, z); g.add(c);
    add(c, cyl(rr + 0.5, rr + 1.4, 3, 16), white, [0, 1.5, 0]); add(c, cyl(rr, rr + 0.2, dh, 16), brick, [0, 3 + dh / 2, 0]);
    for (let i = 0; i < 8; i++) { const b = i / 8 * TAU; add(c, box(0.9, dh * 0.7, 0.6), white, [Math.cos(b) * (rr + 0.1), 3 + dh * 0.5, Math.sin(b) * (rr + 0.1)], [0, -b, 0]); add(c, rbox(1.1, 3.6, 0.5, 0.5), lmat(0x2a2630), [Math.cos(b + 0.2) * (rr + 0.05), 3 + dh * 0.7, Math.sin(b + 0.2) * (rr + 0.05)], [0, -(b + 0.2) + Math.PI / 2, 0]); }
    add(c, cyl(rr + 0.6, rr + 0.6, 1, 16), white, [0, 3 + dh + 0.5, 0]);
    const p = pats[k], dg = stripedDome(onion.map(([r2, y]) => [r2 * rr / 4.4, y * rr / 4.4]), 40, p.cols, { mode: p.mode, n: p.n, twist: 1.4 });
    const dm = add(c, dg, stripedMat(), [0, 3 + dh + 1, 0]); doms.push(dm);
    add(c, cyl(0.12, 0.2, 3, 6), gold, [0, 3 + dh + 1 + 13.6 * rr / 4.4 + 1, 0]); add(c, sph(0.5, 8, 6), gold, [0, 3 + dh + 1 + 13.6 * rr / 4.4 + 0.2, 0]);
  }
  // main drum windows
  const tw = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; tw.push({ p: [Math.cos(a) * 8.7, 31.5, Math.sin(a) * 8.7], r: [0, -a + Math.PI / 2, 0], s: [1.2, 4, 0.4], c: 0x2a2630 }); }
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.4 }), tw);
  // glinting gold crosses blink softly
  const gl = new THREE.MeshStandardMaterial({ color: 0xffd86a, emissive: 0xffc030, emissiveIntensity: 0.0, metalness: 0.7 }); const gs = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), gl); gs.position.set(0, 48, 0); g.add(gs); A.add((t) => { gl.emissiveIntensity = 0.5 + 0.6 * Math.sin(t * 2.2); });
  if (base) {
    slab(g, 420, 1, 0xb4b2ac, { y: -0.04, layer: 1 });
    // cobbled Red Square with paving bands; the Kremlin wall + GUM along two sides
    for (let i = -6; i <= 6; i++) patch(g, 3, 380, 0xa8a49c, i * 18, 0.06, 0, { layer: 2 });
    patch(g, 140, 140, 0xc4c0b6, 0, 0.1, 0, { layer: 2 });
    add(g, box(300, 14, 4), lmat(0xb5483a, { rough: 0.85 }), [0, 7, -150]); crenel(g, 300, 14, -150, 0xb5483a, { step: 4.4, w: 2.8, h: 3.0, d: 4.4 });
    for (const x of [-100, 40, 150]) { add(g, box(12, 28, 12), lmat(0xb5483a), [x, 14, -150]); add(g, cone(8, 14, 4), lmat(0x2f8f5a), [x, 35, -150], [0, Math.PI / 4, 0]); }
    add(g, box(260, 24, 40), lmat(0xe6cfa8, { rough: 0.8 }), [0, 12, 180]);
    const gw = []; for (let i = 0; i < 40; i++) for (let j = 0; j < 3; j++) gw.push({ p: [-124 + i * 6.4, 5 + j * 7, 20.1 + 180 - 0.0 - 20 + 0], s: [2.4, 4, 0.4], c: 0x3a4a5a });
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.3 }), gw);
    trees(g, scatter(30, (q) => [-200 + q() * 400, 100 + q() * 40], 4), { size: 1.5, seed: 4 });
    makeCrowd(g, A, 130, { x: 0, z: 70, w: 300, d: 120 }, { seed: 4, scale: 1.7, y: 0.15, speed: 0.4 });
    for (let i = 0; i < 6; i++) flagPole(g, A, -60 + i * 24, 0.2, 90, 16, 7, FLAGS.russia, { phase: i * 0.7 });
    birds(g, A, 30, 0, 45, 0, 40, 5, 1.0, 0.3);
    makeTraffic(g, A, 8, linePath(-200, 190 - 40 + 130, 200, 190 - 40 + 130, 3), 800, { speed: 8, scale: 1.7, y: 0.1, seed: 2 }); patch(g, 420, 16, 0x474a55, 0, 0.08, 280, { layer: 2 });
  }
  return finish(g, A, { name: "St Basil's Cathedral", realHeightM: 47, realWidthM: 55, source: '47.5 m (central tent church); nine chapels' });
}

// ============================================================ Kremlin tower (Spasskaya, 71 m) + wall
export function kremlinTower({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const brick = lmat(0xb5483a, { rough: 0.8 }), brickD = lmat(0x9a3a2e, { rough: 0.85 }), white = lmat(0xf4efe4, { rough: 0.6 }), gold = lmat(0xe0b040, { metal: 0.7, rough: 0.3 }), dark = lmat(0x2a2630);
  const sq = (w) => rectPts(w, w);
  // body: gate base 0..28, clock storeys 28..46 (white stone bands), octagonal arcade 46..56, green spire 56..71 + star
  add(g, loft([{ y: 0, pts: sq(17) }, { y: 28, pts: sq(15.5) }]), brick);
  add(g, rbox(6, 9, 2, 2.5), dark, [0, 4.5, 8.4]);
  for (const y of [8, 14, 20, 26]) add(g, box(16.5 - y * 0.04, 0.7, 16.5 - y * 0.04), lmat(0xe8dcc0), [0, y, 0]);
  add(g, box(16.4, 2.2, 16.4), white, [0, 29, 0]);
  add(g, loft([{ y: 30, pts: sq(14) }, { y: 46, pts: sq(12.4) }]), brickD);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(g, box(2.2, 12, 2.2), white, [sx * 7, 36, sz * 7]); add(g, cone(1.8, 5, 4), lmat(0x2f8f5a), [sx * 7, 44.5, sz * 7], [0, Math.PI / 4, 0]); }
  const wd = []; for (let k = 0; k < 4; k++) { const f = new THREE.Group(); f.rotation.y = k * Math.PI / 2; g.add(f); for (const u of [-4, 4]) add(f, rbox(1.6, 4, 0.5, 0.8), dark, [u, 25, 7.9]); clockFace(f, A, 0, 38, 7.45, 3.4, 0, { rim: 0xe0b040, face: 0x1f3a6a, hand: 0xf0d070, speed: 1 }); }
  add(g, box(16.8, 1.6, 16.8), white, [0, 46.8, 0]);
  add(g, loft([{ y: 47.6, pts: ngon(8, 6.6, Math.PI / 8) }, { y: 56, pts: ngon(8, 6.2, Math.PI / 8) }]), brick);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; add(g, rbox(1.6, 4.6, 0.5, 0.8), dark, [Math.cos(a) * 6.3, 52, Math.sin(a) * 6.3], [0, -a + Math.PI / 2, 0]); }
  add(g, box(1, 1, 1), white).visible = false;
  add(g, loft([{ y: 56, pts: ngon(8, 7.4, Math.PI / 8) }, { y: 57.2, pts: ngon(8, 7.4, Math.PI / 8) }]), white);
  add(g, loft([{ y: 57.2, pts: ngon(8, 6.8, Math.PI / 8) }, { y: 64, pts: ngon(8, 3.6, Math.PI / 8) }, { y: 71, pts: ngon(8, 0.6, Math.PI / 8) }]), lmat(0x2f8f5a, { rough: 0.5 }));
  // ruby star at the very top, rotating slowly and pulsing
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = i % 2 ? 1.5 : 3.6; i ? star.lineTo(Math.sin(a) * r, Math.cos(a) * r) : star.moveTo(0, r); }
  const sm = new THREE.MeshStandardMaterial({ color: 0xd42a3a, emissive: 0xe0202e, emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.2 });
  const sg = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 1.2, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2 }), sm); sg.position.set(0, 76, -0.6); sg.castShadow = true; const sp = new THREE.Group(); sp.position.set(0, 0, 0); sp.add(sg); g.add(sp);
  add(g, cyl(0.2, 0.3, 4, 6), gold, [0, 71.5, 0]); A.add((t) => { sm.emissiveIntensity = 1.0 + 0.8 * Math.sin(t * 2.2); sp.rotation.y = Math.sin(t * 0.5) * 0.5; });
  // wall (red brick, swallow-tail merlons), flanking towers and Senate dome behind
  for (const sx of [-1, 1]) { add(g, box(180, 14, 6), brick, [sx * 98, 7, 0]); crenel(g, 180, 14, 0, 0xb5483a, { step: 4.6, w: 2.6, h: 3.4, d: 3 }); }
  for (const x of [-190, -120, 120, 190]) { add(g, box(11, 26, 11), brick, [x, 13, 0]); add(g, cone(7.5, 12, 4), lmat(0x2f8f5a), [x, 32, 0], [0, Math.PI / 4, 0]); }
  add(g, box(1, 1, 1), white).visible = false;
  const dm = new THREE.Group(); dm.position.set(-30, 0, -60); g.add(dm); add(dm, box(60, 28, 50), lmat(0xe6d29a), [0, 14, 0]); add(dm, lathe([[0.01, 28], [12, 28], [13, 34], [10, 42], [0.01, 46]], 28), lmat(0x2f8f5a, { rough: 0.5 }), [0, 0, 0]); flagPole(dm, A, 0, 46, 0, 12, 9, FLAGS.russia, { phase: 1 });
  if (base) {
    slab(g, 400, 1, 0xa8a49c, { y: -0.04, layer: 1 });
    patch(g, 400, 120, 0xc0bcb2, 0, 0.1, 80, { layer: 2 });
    for (let i = -5; i <= 5; i++) patch(g, 3, 120, 0xa0a096, i * 14, 0.14, 80, { layer: 3 });
    add(g, rbox(24, 6, 24, 1), lmat(0x4a3a40), [100, 3, 40]); add(g, rbox(16, 5, 16, 1), lmat(0x5a4a50), [100, 8, 40]);   // Lenin's mausoleum steps
    makeCrowd(g, A, 110, { x: 0, z: 80, w: 340, d: 100 }, { seed: 4, scale: 1.7, y: 0.15, speed: 0.4 });
    trees(g, scatter(30, (q) => [-180 + q() * 360, -30 - q() * 30], 5), { size: 1.4, seed: 5 });
    for (let i = 0; i < 5; i++) flagPole(g, A, -40 + i * 20, 0.2, 40, 12, 6, FLAGS.russia, { phase: i * 0.7 });
    makeTraffic(g, A, 8, linePath(-200, 150, 200, 150, 3), 800, { speed: 8, scale: 1.7, y: 0.1, seed: 2 });
    birds(g, A, 24, 0, 60, 20, 34, 5, 0.9, 0.35);
  }
  return finish(g, A, { name: 'Kremlin (Spasskaya Tower)', realHeightM: 71, realWidthM: 17, source: 'Spasskaya Tower 71 m (with star); Kremlin wall 5-19 m' });
}

// ============================================================ Washington Monument (169.3 m) + National Mall
export function washingtonMonument({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const marble = lmat(0xefece2, { rough: 0.5 });
  const sq = (w) => rectPts(w, w);
  add(g, loft([{ y: 0, pts: sq(16.8) }, { y: 152.6, pts: sq(10.5) }]), marble).castShadow = true;
  add(g, loft([{ y: 152.6, pts: sq(10.5) }, { y: 169.3, pts: sq(0.8) }]), lmat(0xf6f3ea, { rough: 0.45 }));
  add(g, cone(0.5, 1.4, 4), lmat(0xc8ced6, { metal: 0.9, rough: 0.2 }), [0, 168.9, 0], [0, Math.PI / 4, 0]);
  // block courses (instanced thin ledges) and tiny windows near the top
  const ld = []; for (let y = 8; y < 150; y += 4.6) { const w = lerp(16.8, 10.5, y / 152.6); ld.push({ p: [0, y, 0], s: [w + 0.5, 0.35, w + 0.5], c: 0xd8d4c8 }); }
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.7 }), ld);
  for (let k = 0; k < 4; k++) { const f = new THREE.Group(); f.rotation.y = k * Math.PI / 2; g.add(f); add(f, rbox(0.8, 1.1, 0.3, 0.3), lmat(0x2a3340), [0, 156, 4.2 + (169.3 - 156) * -0.0 - 0.0]); f.children[f.children.length - 1].position.z = lerp(8.4, 5.25, 0.72) + 0.02; }
  for (let k = 0; k < 4; k++) blinker(g, A, Math.cos(k * Math.PI / 2) * 2.2, 164, Math.sin(k * Math.PI / 2) * 2.2, 0xff2a2a, 0.45, { period: 2, phase: k % 2 ? 0.5 : 0 });
  add(g, box(26, 1.4, 26), lmat(0xd8d4c8), [0, 0.7, 0]);
  // 50 state flags circling the base
  for (let i = 0; i < 50; i++) { const a = i / 50 * TAU, cols = [FLAGS.usa, FLAGS.red, FLAGS.blue, FLAGS.white, FLAGS.usa]; flagPole(g, A, Math.cos(a) * 24, 0, Math.sin(a) * 24, 7, 2.6, i % 5 === 0 ? FLAGS.usa : (u, v) => (i % 3 ? (v < 0.5 ? 0x2a3a8a : 0xffffff) : (u < 0.5 ? 0xd32f2f : 0x2a3a8a)), { phase: i * 0.6, rotY: -a + Math.PI / 2, nx: 5, ny: 4 }); }
  if (base) {
    slab(g, 1600, 1, 0x5aa84a, { y: -0.04, layer: 1 });
    // the Mall: grass, gravel paths, reflecting pool, Lincoln Memorial and the Capitol far away
    patch(g, 140, 1800, 0xe6dcc0, 0, 0.12, 0, { layer: 2, ry: 0 }); patch(g, 100, 1800, 0x5cb04e, 0, 0.14, 0, { layer: 2 });
    patch(g, 12, 1800, 0xe0d4b4, 0, 0.18, 0, { layer: 3 }); patch(g, 220, 10, 0xe0d4b4, 0, 0.18, 0, { layer: 3 });
    const rp = makeWater(36, 620, { seg: 6, amp: 0.1, color: 0x3a9ac8, speed: 1.4 }); rp.position.set(0, 0.3, 560); g.add(rp);
    for (const sx of [-1, 1]) for (let i = 0; i < 24; i++) { trees(g, [[sx * 36, 260 + i * 26]], { size: 1.8, seed: i }); }
    const LM = new THREE.Group(); LM.position.set(0, 0, 930); g.add(LM); add(LM, box(80, 5, 60), marble, [0, 2.5, 0]); for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, x = Math.cos(a) * 36, z = Math.sin(a) * 26; if (Math.abs(a - Math.PI * 1.5) < 0.35) continue; add(LM, cyl(1.1, 1.2, 14, 10), marble, [x * 0.9, 12, z * 0.9]); } add(LM, box(76, 3, 56), marble, [0, 20, 0]); add(LM, box(62, 6, 44), marble, [0, 24, 0]);
    const CP = new THREE.Group(); CP.position.set(0, 0, -1280); g.add(CP); add(CP, box(220, 22, 60), marble, [0, 11, 0]); add(CP, cyl(20, 22, 22, 24), marble, [0, 33, 0]); add(CP, lathe([[0.01, 44], [18, 44], [17, 52], [11, 64], [4, 76], [0.01, 80]], 28), lmat(0xf4f1e8, { rough: 0.4 }), [0, 0, 0]); add(CP, sph(1.5, 8, 6), gold0(), [0, 82, 0]);
    function gold0() { return lmat(0xe0b040, { metal: 0.7 }); }
    // cherry-blossom grove (pink canopies) and roads with traffic
    const pk = []; const pr = rng(5); for (let i = 0; i < 90; i++) { const a = pr() * TAU, d = 120 + pr() * 90; const x = 190 + Math.cos(a) * d * 0.9, z = 150 + Math.sin(a) * d; pk.push({ p: [x, 4, z], s: [3.4, 2.8, 3.4], c: [0xffb8cf, 0xffa0c0, 0xffd0e0][Math.floor(pr() * 3)] }); }
    instances(g, new THREE.IcosahedronGeometry(1, 1), lmat(0xffffff, { rough: 0.9 }), pk); instances(g, new THREE.CylinderGeometry(0.4, 0.6, 1, 6), lmat(0x6a4a2e), pk.map((q) => ({ p: [q.p[0], 1.3, q.p[2]], s: [0.7, 2.6, 0.7] })));
    patch(g, 14, 1800, 0x474a55, 90, 0.2, 0, { layer: 3 }); patch(g, 14, 1800, 0x474a55, -90, 0.2, 0, { layer: 3 });
    makeTraffic(g, A, 16, linePath(90, -800, 90, 800, 3), 3200, { speed: 12, scale: 1.8, y: 0.3, seed: 3 }); makeTraffic(g, A, 16, linePath(-90, -800, -90, 800, 3), 3200, { speed: 12, scale: 1.8, y: 0.3, seed: 4 });
    makeCrowd(g, A, 120, { x: 0, z: 40, w: 100, d: 380 }, { seed: 4, scale: 1.8, y: 0.3, speed: 0.4 });
    const bb = rng(8), bl = []; for (let i = 0; i < 24; i++) { const sx = i % 2 ? 1 : -1, z = -600 + (i >> 1) * 90 + bb() * 20, h = 18 + bb() * 20; bl.push({ p: [sx * 200, h / 2, z], s: [70, h, 62], c: [0xefe8d8, 0xd8d0c0, 0xe8dcc0][Math.floor(bb() * 3)] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.8 }), bl);
    birds(g, A, 20, 0, 120, 40, 60, 3, 2, 0.3);
        // helicopter on patrol around the monument
    const heli = new THREE.Group(); g.add(heli); add(heli, rbox(3.2, 2.4, 8, 1), lmat(0x1f3a6a), [0, 0, 0]); add(heli, box(0.5, 0.5, 6), lmat(0x1f3a6a), [0, 0.3, -6]); const rot = new THREE.Group(); rot.position.y = 1.7; heli.add(rot); add(rot, box(16, 0.1, 0.5), lmat(0x333640)); add(rot, box(0.5, 0.1, 16), lmat(0x333640));
    A.add((t) => { const a = t * 0.18; heli.position.set(Math.cos(a) * 190, 120 + Math.sin(t * 0.7) * 4, Math.sin(a) * 190); heli.rotation.y = -a + Math.PI; rot.rotation.y = t * 25; });
  }
  return finish(g, A, { name: 'Washington Monument', realHeightM: 169, realWidthM: 16.8, source: '169.3 m (555 ft 5 in), base 16.8 m, top 10.5 m' });
}

// ============================================================ Gateway Arch (192 m)
export function gatewayArch({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const ft = 0.3048, cy = (x) => (693.8597 - 68.7672 * Math.cosh(0.0100333 * x)) * ft;
  const N = 60, rings = [], X0 = 299.2239;
  for (let i = 0; i <= N; i++) {
    const x = -X0 + 2 * X0 * i / N, y = cy(x), dx = 1, dy = (cy(x + 0.01) - cy(x - 0.01)) / 0.02 * 1, tl = Math.hypot(0.3048, dy * 0.3048), tx = 0.3048 / tl, ty = dy * 0.3048 / tl;
    const t = Math.abs(x) / X0, side = lerp(5.2, 16.5, Math.pow(t, 1.6)) * 0.55;
    const nx = -ty, ny = tx; // normal in XY plane
    const px = x * ft, pts = [];
    for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + k / 3 * TAU; const u = Math.cos(a) * side, v = Math.sin(a) * side; pts.push([px + nx * u, y + ny * u, v]); }
    rings.push(pts);
  }
  const steel = lmat(0xe4e9ee, { rough: 0.2, metal: 0.8 });
  const arch = new THREE.Mesh(ringLoft(rings, { cap: true }), steel); arch.castShadow = true; arch.receiveShadow = true; g.add(arch);
  // pole of dark seam lines (the arch's stainless panels): thin dark ribs
  const ribs = []; for (let i = 3; i < N; i += 4) { const x = -X0 + 2 * X0 * i / N; ribs.push({ p: [x * ft, cy(x), 0], s: [0.3, 0.3, 0.3] }); }
  // tram pods: two trains, one per leg, shuttling along the arch curve
  const pods = [];
  for (let k = 0; k < 2; k++) { const grp = new THREE.Group(); for (let i = 0; i < 5; i++) add(grp, rbox(2.2, 2.2, 2.2, 0.6), lmat(0xfdfdfd, { rough: 0.3, emissive: 0x2a4a6a, ei: 0.3 }), [0, 0, i * 2.4]); g.add(grp); pods.push(grp); }
  A.add((t) => { pods.forEach((grp, k) => { const u = 0.5 + 0.5 * Math.sin(t * 0.3 + k * 1.4), x = (k ? 1 : -1) * lerp(X0 - 8, 40, u), px = x * ft, y = cy(x), ang = Math.atan2((cy(x + 0.5) - cy(x - 0.5)), 0.6096); grp.position.set(px, y, 0); grp.rotation.set(0, Math.PI / 2, 0); grp.rotation.z = ang * (k ? 1 : 1); grp.children.forEach((c, i) => { c.position.set(0, 0, 0); c.position.z = i * 2.4 - 4.8; }); }); });
  // top viewing windows glow
  const sg = new THREE.Mesh(new THREE.BoxGeometry(26, 1.2, 3.6), new THREE.MeshStandardMaterial({ color: 0x7ec8f0, emissive: 0x4aa0d8, emissiveIntensity: 1.2 })); sg.position.set(0, 189, 0); g.add(sg);
  blinker(g, A, 0, 193, 0, 0xff2a2a, 0.8, { period: 1.6 });
  for (const sx of [-1, 1]) add(g, box(36, 1.0, 36), lmat(0xd8d4c8), [sx * 91, 0.5, 0]).visible = false;
  if (base) {
    slab(g, 1100, 1, 0x5aa84a, { y: -0.04, layer: 1 });
    // park, pond, paths, Mississippi River with paddle steamers, skyline of St Louis
    patch(g, 240, 600, 0x5cb04e, 0, 0.1, 0, { layer: 2 }); patch(g, 12, 600, 0xe0d4b4, 0, 0.14, 0, { layer: 3 }); patch(g, 340, 10, 0xe0d4b4, 0, 0.14, 0, { layer: 3 });
    for (const sz of [-1, 1]) { const pond = makeWater(80, 36, { seg: 8, amp: 0.05, color: 0x4aa0c8, speed: 1.2 }); pond.position.set(0, 0.2, sz * 70); g.add(pond); }
    trees(g, scatter(110, (q) => [(q() - 0.5) * 460, (q() - 0.5) * 560], 6).filter(([x, z]) => Math.abs(x) > 14 || Math.abs(z) > 90), { size: 2, seed: 6 });
    const rv = makeWater(1400, 330, { seg: 44, amp: 0.5, color: 0x6a7a68, speed: 0.9, scale: 3 }); rv.position.set(0, -0.4, 480); g.add(rv);
    const ps = (len, c) => { const b = new THREE.Group(); add(b, rbox(len * 0.16, len * 0.08, len, 2), lmat(0xffffff, { rough: 0.5 }), [0, 1.5, 0]); add(b, rbox(len * 0.13, len * 0.06, len * 0.7, 1), lmat(c, { rough: 0.5 }), [0, 5, 0]); add(b, rbox(len * 0.1, len * 0.05, len * 0.5, 1), lmat(0xffffff), [0, 8.4, 0]); for (const s of [-1, 1]) add(b, cyl(1.2, 1.4, 9, 8), lmat(0x2a2630), [s * 0, 13, len * 0.2 * s]); add(b, cyl(len * 0.16, len * 0.16, 1.2, 14), lmat(0xe53935), [len * 0.14, 3, -len * 0.35], [0, 0, Math.PI / 2]).userData.wheel = true; return b; };
    const st = ps(60, 0x2f6fd6); g.add(st); const st2 = ps(46, 0xd8472b); g.add(st2);
    A.add((t) => { st.position.set(lerp(-600, 600, frac(t * 0.012)), 0.6 + Math.sin(t * 1.6) * 0.2, 440); st.rotation.y = Math.PI / 2; st2.position.set(lerp(600, -600, frac(t * 0.01 + 0.4)), 0.6 + Math.sin(t * 1.3) * 0.2, 520); st2.rotation.y = -Math.PI / 2; });
    makeBoats(g, A, [{ len: 120, color: 0x333a44, cabin: 0xe53935, path: linePath(-600, 400, 600, 400, 0), length: 2400, u0: 0.1, speed: 5 }, { len: 20, color: 0xffffff, sail: true, path: linePath(600, 560, -600, 560, 0), length: 2400, u0: 0.5, speed: 4 }], { y: -0.2 });
    const sk = rng(3), bb = []; for (let i = 0; i < 30; i++) { const h = 35 + sk() * sk() * 110; bb.push({ p: [-380 + i * 28, h / 2, -360 - sk() * 60], s: [22 + sk() * 14, h, 22 + sk() * 10], c: [0x9aa7b8, 0x8f9db0, 0xb8c4d0, 0xc7b8a0][Math.floor(sk() * 4)] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { metal: 0.2, rough: 0.5 }), bb);
    patch(g, 1400, 18, 0x474a55, 0, 0.2, 330, { layer: 3 }); makeTraffic(g, A, 18, linePath(-600, 330, 600, 330, 3), 2400, { speed: 14, scale: 1.8, y: 0.3, seed: 8 });
    makeCrowd(g, A, 100, { x: 0, z: 0, w: 300, d: 420 }, { seed: 4, scale: 1.8, y: 0.2, speed: 0.4 });
    birds(g, A, 16, 0, 110, 0, 110, 4, 2.0, 0.3);
  }
  return finish(g, A, { name: 'Gateway Arch', realHeightM: 192, realWidthM: 192, source: '192 m (630 ft) tall and 192 m wide at the base' });
}
