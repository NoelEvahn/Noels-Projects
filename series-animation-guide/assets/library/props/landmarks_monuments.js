// Landmarks pack: monuments A (Statue of Liberty, Big Ben + Parliament, Pisa, Colosseum, Giza, Taj Mahal, Christ the Redeemer). 1 unit = 1 m.
import { THREE, rng, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade, clamp, lerp, smooth, TAU, COL, lmat, animator, finish, frac, ngon, rectPts, scalePts, rotPts, loft, frustum, lathe, merge, xf, ledgeBands, instances, beams, flagPole, FLAGS, blinker, makeWater, makeCrowd, makeTraffic, ringPath, linePath, trees, scatter, slab, ring, disc, patch, plazaBase, makeBoats, boatMesh } from './landmarks_kit.js';

const cloudCluster = (parent, A, n, area, y, seed, speed = 6, size = 30) => {
  const r = rng(seed), list = [], wrap = area;
  for (let i = 0; i < n; i++) { const g = []; const x = (r() - 0.5) * wrap, z = (r() - 0.5) * wrap; for (let k = 0; k < 5; k++) g.push({ dx: (k - 2) * size * 0.45 + r() * 6, dy: r() * size * 0.15, dz: (r() - 0.5) * size * 0.4, s: size * (0.35 + r() * 0.3) }); list.push({ x, z, y: y + r() * y * 0.15, g }); }
  const flat = []; list.forEach((c, i) => c.g.forEach((p) => flat.push({ c, p })));
  const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lmat(0xffffff, { rough: 1, emissive: 0x9aa8b8, ei: 0.25 }), flat.length), o = new THREE.Object3D();
  m.frustumCulled = false; m.castShadow = false; parent.add(m);
  A.add((t) => { flat.forEach(({ c, p }, i) => { const x = ((c.x + p.dx + t * speed + wrap / 2) % wrap + wrap) % wrap - wrap / 2; o.position.set(x, c.y + p.dy, c.z + p.dz); o.scale.set(p.s * 1.4, p.s * 0.7, p.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.instanceMatrix.needsUpdate = true; });
};
const birdFlock = (parent, A, n, cx, cy, cz, R, seed, size = 1, speed = 0.5) => {
  const r = rng(seed), P = []; for (let i = 0; i < n; i++) P.push({ a: r() * TAU, rr: R * (0.6 + r() * 0.5), y: (r() - 0.5) * R * 0.3, sp: speed * (0.7 + r() * 0.6), ph: r() * 6 });
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.5 * size, -1.5 * size, 0.35 * size, -0.1 * size, 0, 0, -0.5 * size, 0, 0, 0.5 * size, 1.5 * size, 0.35 * size, -0.1 * size, 0, 0, -0.5 * size], 3)); bg.computeVertexNormals();
  const m = new THREE.InstancedMesh(bg, lmat(0x3a3f4c, { rough: 0.8, side: THREE.DoubleSide }), n), o = new THREE.Object3D();
  m.frustumCulled = false; m.castShadow = false; parent.add(m);
  A.add((t) => { P.forEach((p, i) => { const a = p.a + t * p.sp; o.position.set(cx + Math.cos(a) * p.rr, cy + p.y + Math.sin(t * 3 + p.ph) * 0.8 * size, cz + Math.sin(a) * p.rr); o.rotation.set(0, -a, 0); o.scale.set(1, 0.3 + 1.6 * Math.abs(Math.sin(t * 7 + p.ph)), 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.instanceMatrix.needsUpdate = true; });
};

// ============================================================ Statue of Liberty (93 m ground to torch)
export function statueOfLiberty({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const cu = lmat(0x6ab59a, { rough: 0.55, metal: 0.15 }), cuD = lmat(0x4f9a82, { rough: 0.6 }), stone = lmat(0xd9ccb0, { rough: 0.85 }), granite = lmat(0xbfb6a2, { rough: 0.9 });
  // Fort Wood: 11-pointed star
  const star = []; for (let i = 0; i < 22; i++) { const a = i / 22 * TAU, r = i % 2 ? 36 : 52; star.push([Math.cos(a) * r, Math.sin(a) * r]); }
  add(g, loft([{ y: 0, pts: scalePts(star, 1.12) }, { y: 6, pts: scalePts(star, 1.0) }, { y: 11, pts: scalePts(star, 0.97) }]), lmat(0xc9bba0, { rough: 0.9 }));
  add(g, loft([{ y: 11, pts: scalePts(star, 0.95) }, { y: 12, pts: scalePts(star, 0.95) }]), lmat(0x6dbb55, { rough: 1 }));
  // pedestal
  add(g, box(34, 8, 34), granite, [0, 16, 0]);
  add(g, frustum(rectPts(26, 26), rectPts(20.5, 20.5), 22, 20, { cap: true }), stone);
  const cols = []; for (let i = 0; i < 12; i++) for (const s of [0, 1]) { const u = -9 + i * 1.64; cols.push({ p: s ? [u, 38.5, 11.3] : [u, 38.5, -11.3], s: [0.55, 6.2, 0.55], c: 0xe8dcc4 }); cols.push({ p: s ? [11.3, 38.5, u] : [-11.3, 38.5, u], s: [0.55, 6.2, 0.55], c: 0xe8dcc4 }); }
  instances(g, new THREE.CylinderGeometry(0.5, 0.5, 1, 8), lmat(0xffffff, { rough: 0.7 }), cols);
  add(g, box(25, 1.4, 25), granite, [0, 35.2, 0]); add(g, box(24.4, 1.8, 24.4), granite, [0, 42.2, 0]);
  add(g, frustum(rectPts(18.5, 18.5), rectPts(17.2, 17.2), 4, 42, {}), stone);
  add(g, box(19.5, 1.2, 19.5), granite, [0, 46.4, 0]);
  // statue body (robe) as a lathe, then drapery folds
  const body = lathe([[0.01, 47], [7.6, 47], [7.0, 52], [5.8, 60], [4.6, 66], [4.0, 71], [2.7, 74.5], [1.5, 76], [1.35, 77.5], [0.01, 77.5]], 28);
  add(g, body, cu).castShadow = true;
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; add(g, cone(0.55, 13 + (i % 3) * 2, 5), cuD, [Math.cos(a) * 5.6, 54 + (i % 3), Math.sin(a) * 5.6], [0.12 * Math.sin(a), 0, -0.1 * Math.cos(a)]); }
  add(g, tor(4.6, 0.9, 6, 20, Math.PI * 1.3), cuD, [0, 62, 0], [Math.PI / 2, 0, 0.9]);
  // head, face, nose, crown with seven rays, diadem
  add(g, sph(2.5, 18, 14), cu, [0, 80.2, 0.15]);
  add(g, sph(0.55, 8, 6), cuD, [0, 79.6, 2.45]); add(g, box(2.4, 0.35, 0.3), cuD, [0, 80.7, 2.35]);
  for (const s of [-1, 1]) add(g, sph(0.3, 6, 5), lmat(0x2a3a3a), [s * 0.85, 80.4, 2.3]);
  add(g, tor(2.55, 0.35, 6, 24), cu, [0, 82.2, 0.1], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.95 + i / 6 * Math.PI * 0.9 + Math.PI / 2 - 0.5; const dx = Math.sin((i / 6 - 0.5) * 2.6), dz = Math.cos((i / 6 - 0.5) * 2.6); const ray = add(g, cone(0.4, 5.2, 5), cu, [dx * 3.8, 84.4 + (1 - Math.abs(i / 3 - 1)) * 0.6, -dz * 3.8 * 0 + dz * 1.5 - 1.2], [0.4 * dz, 0, -dx * 1.1]); ray.rotation.set(-0.15, 0, -dx * 1.15); }
  // raised right arm to the torch, left arm to the tablet
  add(g, cyl(1.25, 1.6, 15, 10), cu, [4.6, 78.5, 0.3], [0, 0, -0.22]);
  add(g, sph(1.3, 10, 8), cu, [5.9, 86.2, 0.3]);
  add(g, cyl(0.6, 0.8, 7, 8), lmat(0xd9a63a, { metal: 0.6, rough: 0.35 }), [6.1, 89.5, 0.3]);
  add(g, lathe([[0.01, 92.8], [3.4, 93], [3.9, 94.5], [2.8, 95], [0.01, 95]], 18), lmat(0xd9a63a, { metal: 0.6, rough: 0.35 }));
  add(g, cyl(2.7, 2.9, 0.8, 16), lmat(0xd9a63a, { metal: 0.6 }), [6.1, 93, 0.3]);
  const torch = new THREE.Group(); torch.position.set(6.1, 93.4, 0.3); g.add(torch);
  const flameM = new THREE.MeshStandardMaterial({ color: 0xffb21f, emissive: 0xffa010, emissiveIntensity: 2.4, roughness: 0.4 });
  const flame = new THREE.Mesh(lathe([[0.01, 0], [1.9, 0.5], [2.1, 2], [1.1, 4.2], [0.01, 6.4]], 14), flameM); torch.add(flame);
  const inner = new THREE.Mesh(lathe([[0.01, 0.3], [1.0, 1], [0.6, 3], [0.01, 4.4]], 12), new THREE.MeshBasicMaterial({ color: 0xfff2a0, toneMapped: false })); torch.add(inner);
  A.add((t) => { const f = 1 + 0.12 * Math.sin(t * 13) + 0.07 * Math.sin(t * 23 + 1); flame.scale.set(1 + 0.08 * Math.sin(t * 17), f, 1 + 0.08 * Math.cos(t * 15)); flame.rotation.z = 0.12 * Math.sin(t * 5); inner.scale.copy(flame.scale); flameM.emissiveIntensity = 2.0 + 0.8 * Math.sin(t * 19); });
  add(g, cyl(1.0, 1.9, 17, 10), cu, [-3.8, 68, 1.2], [0.35, 0, 0.45]);
  const tab = add(g, rbox(5.2, 7.4, 1.0, 0.25), cu, [-4.2, 73, 3.4], [-0.35, 0.35, 0.1]);
  for (let i = 0; i < 5; i++) add(g, box(3.4, 0.3, 0.2), cuD, [-4.2, 71.6 + i * 1.1, 3.3], [-0.35, 0.35, 0.1]).translateZ(0.55);
  // broken chain + sandalled foot peeking out
  add(g, rbox(3, 1.1, 5.6, 0.4), cu, [2.2, 47.9, 3.6]);
  if (base) {
    // island on water
    const wat = makeWater(1100, 1100, { seg: 32, amp: 0.5, color: 0x2f86bb, speed: 1.0, scale: 3 }); wat.position.set(0, -4, 0); g.add(wat);
    slab(g, 150, 8, 0x5aa84a, { y: 0.02, seg: 48 }); disc(g, 150.5, 0x6dbb55, 0.03, { layer: 2 });
    patch(g, 12, 200, 0xe6dcc0, 0, 0.18, 100, { layer: 3 }); patch(g, 200, 10, 0xe6dcc0, 0, 0.18, 100, { layer: 3 });
    patch(g, 200, 12, 0xe6dcc0, 0, 0.18, 0, { layer: 3 });
    trees(g, scatter(60, (q) => { const a = q() * TAU, d = 65 + q() * 75; return [Math.cos(a) * d, Math.sin(a) * d]; }, 3), { size: 1.7, seed: 3 });
    makeCrowd(g, A, 70, { x: 0, z: 80, w: 150, d: 100 }, { seed: 4, scale: 1.7, y: 0.3, speed: 0.4 });
    // ferries and tour boats circling the island
    const C = (R, off) => (u) => { const a = u * TAU + off; return [Math.cos(a) * R, Math.sin(a) * R, -a]; };
    makeBoats(g, A, [
      { len: 36, color: 0xffffff, cabin: 0xe5483a, path: C(240, 0), length: TAU * 240, u0: 0.0, speed: 9 },
      { len: 26, color: 0xff8a2b, cabin: 0xffffff, path: C(300, 2), length: TAU * 300, u0: 0.3, speed: 7 },
      { len: 14, color: 0xffffff, sail: true, path: C(360, 1), length: TAU * 360, u0: 0.6, speed: 5 },
      { len: 18, color: 0xffd23f, path: C(200, 4), length: TAU * 200, u0: 0.8, speed: 6 }], { y: -3.2 });
    add(g, box(30, 3, 10), lmat(0xa08a6a), [0, 0.6, 156]);   // ferry dock
    birdFlock(g, A, 12, 0, 75, 0, 45, 4, 1.0);
    // Manhattan skyline on the horizon
    const sk = rng(5), b = []; for (let i = 0; i < 30; i++) { const x = -420 + i * 28, h = 40 + sk() * sk() * 200, w = 22 + sk() * 14; b.push({ p: [x, h / 2, -560 - sk() * 30], s: [w, h, w], c: [0x9aa7b8, 0x8f9db0, 0xb8c4d0, 0xc7b8a0][Math.floor(sk() * 4)] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.7 }), b); slab(g, 800, 4, 0x8a8c92, { y: -2, layer: 1, square: true, d: 120 }).position.set(0, -4, -600);
  }
  return finish(g, A, { name: 'Statue of Liberty', realHeightM: 93, realWidthM: 30, source: '93 m ground to torch tip (statue 46 m, pedestal 47 m)' });
}

// ============================================================ Big Ben (Elizabeth Tower 96 m) + Palace of Westminster
export function bigBen({ base = true, detail = 'high' } = {}) {
  const g = new THREE.Group(), A = animator();
  const stone = lmat(0xd6c394, { rough: 0.8 }), stoneD = lmat(0xb8a674, { rough: 0.85 }), gold = lmat(0xe0b040, { metal: 0.6, rough: 0.35 }), roof = lmat(0x4a5a58, { rough: 0.6 }), dark = lmat(0x3a3a46, { rough: 0.6 });
  const T = new THREE.Group(); T.position.set(-130, 0, 0); g.add(T);
  // shaft with buttresses, gothic windows, string courses
  add(T, box(12.4, 55, 12.4), stone, [0, 27.5, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(T, box(2.3, 58, 2.3), stoneD, [sx * 6.5, 29, sz * 6.5]);
  const win = []; for (let y = 8; y < 52; y += 6.5) for (const s of [-1, 1]) { for (const u of [-1.7, 1.7]) { win.push({ p: [u, y, s * 6.25], s: [1.1, 3.6, 0.3], c: 0x3a4a5a }); win.push({ p: [s * 6.25, y, u], s: [0.3, 3.6, 1.1], c: 0x3a4a5a }); } }
  instances(T, box(1, 1, 1), lmat(0xffffff, { rough: 0.3 }), win);
  for (let y = 12; y < 55; y += 8) add(T, box(13.4, 0.8, 13.4), stoneD, [0, y, 0]);
  // clock stage 55..68
  add(T, box(15.4, 13, 15.4), stoneD, [0, 61.5, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(T, box(3, 14, 3), stone, [sx * 7.5, 62, sz * 7.5]);
  const faces = [];
  for (let k = 0; k < 4; k++) {
    const f = new THREE.Group(); f.rotation.y = k * Math.PI / 2; T.add(f); const z = 7.78;
    add(f, cyl(4.1, 4.1, 0.4, 36), gold, [0, 62, z], [Math.PI / 2, 0, 0]);
    add(f, cyl(3.75, 3.75, 0.5, 36), lmat(0xfff6dc, { rough: 0.3, emissive: 0xffe9a0, ei: 0.55 }), [0, 62, z + 0.05], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; add(f, box(i % 3 === 0 ? 0.35 : 0.2, i % 3 === 0 ? 0.9 : 0.6, 0.2), dark, [Math.sin(a) * 3.2, 62 + Math.cos(a) * 3.2, z + 0.35], [0, 0, -a]); }
    const hh = new THREE.Group(); hh.position.set(0, 62, z + 0.5); f.add(hh); const mh = new THREE.Group(); mh.position.set(0, 0, 0.12); hh.add(mh);
    const hourH = add(hh, box(0.45, 2.0, 0.15), dark, [0, 1.0, 0]); const minH = add(mh, box(0.3, 3.1, 0.15), dark, [0, 1.55, 0]);
    add(hh, sph(0.35, 8, 6), gold, [0, 0, 0.1]);
    faces.push({ hh, mh });
    add(f, cone(3.3, 4.2, 4), stone, [0, 69.2, z - 0.5], [0, Math.PI / 4, 0]).scale.set(1, 0.6, 0.35);
  }
  // hands: minute hand 1 rev / 12 s, hour hand 1 rev / 144 s (a time-lapse; the tower always shows a believable time)
  A.add((t) => { faces.forEach(({ hh, mh }) => { mh.rotation.z = -t * TAU / 12 + 0.4; hh.rotation.z = -t * TAU / 144 + 2.2; }); });
  // belfry 68..78: arched louvres in all four faces
  add(T, box(13, 10, 13), stone, [0, 73, 0]);
  for (let k = 0; k < 4; k++) { const f = new THREE.Group(); f.rotation.y = k * Math.PI / 2; T.add(f); for (const u of [-3.3, 0, 3.3]) { add(f, rbox(2.2, 7, 0.5, 0.5), lmat(0x2a2a34), [u, 73, 6.55]); for (let j = 0; j < 4; j++) add(f, box(1.9, 0.2, 0.15), stoneD, [u, 71 + j * 1.5, 6.85]); } }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(T, box(2.4, 13, 2.4), stoneD, [sx * 6.3, 73, sz * 6.3]); add(T, cone(1.7, 6, 4), roof, [sx * 6.3, 82, sz * 6.3], [0, Math.PI / 4, 0]); add(T, cone(0.2, 2, 4), gold, [sx * 6.3, 86, sz * 6.3]); }
  add(T, box(14.4, 1.2, 14.4), stoneD, [0, 78.6, 0]);
  // iron-framed spire up to 96 m
  add(T, cone(8.5, 11, 4), roof, [0, 85, 0], [0, Math.PI / 4, 0]);
  add(T, cyl(1.6, 2.4, 7, 8), roof, [0, 92.5, 0]); add(T, cone(1.6, 4, 8), roof, [0, 96, 0]);
  add(T, cyl(0.12, 0.4, 5, 6), gold, [0, 99.5, 0]);
  const lanternM = new THREE.MeshStandardMaterial({ color: 0xfff4c0, emissive: 0xffe08a, emissiveIntensity: 2, roughness: 0.4 });
  add(T, sph(0.9, 10, 8), lanternM, [0, 94.8, 0]); A.add((t) => { lanternM.emissiveIntensity = 1.6 + 1.2 * Math.sin(t * 1.2); });
  // Palace of Westminster
  const P = new THREE.Group(); g.add(P);
  add(P, box(270, 22, 40), stone, [0, 11, -4]); add(P, box(272, 2, 42), stoneD, [0, 22.6, -4]); add(P, box(270, 1.4, 42), stoneD, [0, 9, -4]);
  add(P, box(250, 5, 16), roof, [0, 26.5, -12]);
  const wl = [], pin = [], cn = [];
  for (let i = 0; i < 90; i++) { const x = -131 + i * 2.95; for (const [y, h] of [[5, 6.2], [14.5, 6.6]]) wl.push({ p: [x, y + 3, 16.1], s: [1.2, h, 0.35], c: 0x2a3340 }); pin.push({ p: [x + 1.4, 25.8, 16.0], s: [0.9, 6, 0.9], c: 0xcdb980 }); }
  instances(P, box(1, 1, 1), lmat(0xffffff, { rough: 0.3 }), wl); instances(P, new THREE.ConeGeometry(0.7, 1, 4), lmat(0xc9b57c, { rough: 0.8 }), pin.map((p) => ({ p: [p.p[0], 27, p.p[2]], s: [1, 5, 1] })));
  instances(P, box(1, 1, 1), lmat(0xffffff, { rough: 0.8 }), pin);
  for (let i = 0; i < 9; i++) add(P, box(5, 26, 5), stoneD, [-110 + i * 27.5, 13, 16.5]);
  // Victoria Tower (98.5 m) with flag, central spire, Elizabeth-side wing
  const V = new THREE.Group(); V.position.set(133, 0, 6); P.add(V);
  add(V, box(24, 62, 24), stone, [0, 31, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(V, box(5, 82, 5), stoneD, [sx * 10.5, 41, sz * 10.5]); add(V, cone(3.6, 12, 4), roof, [sx * 10.5, 88, sz * 10.5], [0, Math.PI / 4, 0]); }
  add(V, box(22, 20, 22), stone, [0, 72, 0]); add(V, box(25, 1.5, 25), stoneD, [0, 83, 0]); add(V, cone(12, 12, 4), roof, [0, 89, 0], [0, Math.PI / 4, 0]);
  const vw = []; for (let y = 8; y < 58; y += 7) for (const s of [-1, 1]) for (const u of [-6, 0, 6]) { vw.push({ p: [u, y, s * 12.1], s: [2.6, 4.4, 0.4], c: 0x2a3340 }); vw.push({ p: [s * 12.1, y, u], s: [0.4, 4.4, 2.6], c: 0x2a3340 }); }
  instances(V, box(1, 1, 1), lmat(0xffffff, { rough: 0.3 }), vw);
  add(V, cyl(0.2, 0.3, 14, 6), lmat(0xd8dde4, { metal: 0.6 }), [0, 102, 0]);
  const vf = flagPole(V, A, 0, 98, 0, 8, 12, FLAGS.uk, { amp: 0.14, speed: 3.2 }); vf.children[2] && (vf.position.y = 0);
  add(P, cyl(5.5, 7.5, 40, 8), stone, [0, 42, -4]); add(P, cone(6.5, 40, 8), roof, [0, 84, -4]);
  if (base) {
    slab(g, 650, 1.2, 0xb8b4a8, { y: -0.02, layer: 1 });
    // Thames to the south with Westminster Bridge and moving buses, boats, and the London Eye
    const th = makeWater(1300, 150, { seg: 60, amp: 0.4, color: 0x5a8aa0, speed: 1.0, scale: 2 }); th.position.set(0, 0.15, 120); g.add(th);
    add(g, box(1300, 4, 6), stoneD, [0, 1.8, 43]);
    patch(g, 1300, 22, 0x474a55, 0, 0.12, 20, { layer: 2 });
    add(g, box(24, 2.4, 150), lmat(0x6fae7a, { rough: 0.6 }), [-165, 3.2, 120]);
    for (const z of [70, 120, 170]) add(g, box(22, 5, 5), stoneD, [-165, 1, z]);
    const bus = []; for (let i = 0; i < 6; i++) bus.push(add(g, rbox(2.5, 4.4, 10, 0.5), lmat(0xd32f2f, { rough: 0.4 }), [-165, 6, 120]));
    A.add((t) => { bus.forEach((b, i) => { const u = frac(t * 0.06 + i / 6), s = u < 0.5 ? u * 2 : 2 - u * 2; b.position.set(-165 + (u < 0.5 ? 4 : -4), 5.8, lerp(50, 190, s)); b.rotation.y = u < 0.5 ? 0 : Math.PI; }); });
    makeTraffic(g, A, 14, linePath(-420, 22, 420, 22, 4), 1680, { speed: 10, scale: 1.4, y: 0.2, seed: 5, colors: [0xd32f2f, 0x15151c, 0xffffff, 0xd32f2f, 0x2f6fd6] });
    makeBoats(g, A, [
      { len: 28, color: 0xffffff, cabin: 0x2f6fd6, path: linePath(-600, 105, 600, 105, 0), length: 2400, u0: 0.1, speed: 6 },
      { len: 18, color: 0xe5483a, path: linePath(600, 135, -600, 135, 0), length: 2400, u0: 0.5, speed: 5 }], { y: 0.5 });
    // London Eye across the river: rotating rim with 32 capsules that stay upright
    const eye = new THREE.Group(); eye.position.set(150, 68, 330); g.add(eye); const rim = new THREE.Group(); eye.add(rim);
    add(rim, tor(60, 1.4, 6, 64), lmat(0xf4f4f4, { rough: 0.4 })); add(rim, tor(57, 0.7, 6, 64), lmat(0xf4f4f4));
    for (let i = 0; i < 16; i++) add(rim, box(0.5, 114, 0.5), lmat(0xe8e8e8, { metal: 0.5 }), [0, 0, 0], [0, 0, i / 16 * Math.PI]);
    const pods = []; for (let i = 0; i < 32; i++) { const p = add(eye, sph(2.1, 10, 8), lmat(0x9ad8ff, { rough: 0.1, metal: 0.3, emissive: 0x2a6a9a, ei: 0.3 }), [0, 0, 0], [0, 0, 0], [1, 1.2, 1]); p.position.z = 3.4; pods.push(p); }
    A.add((t) => { rim.rotation.z = -t * 0.04 * 2; pods.forEach((p, i) => { const a = i / 32 * TAU - t * 0.08; p.position.set(Math.cos(a) * 60, Math.sin(a) * 60, 3.4); }); });
    add(eye, box(3, 70, 3), lmat(0xeeeeee), [-14, -35, 0], [0, 0, 0.35]); add(eye, box(3, 70, 3), lmat(0xeeeeee), [14, -35, 0], [0, 0, -0.35]);
    // plaza: Parliament Square trees, lawn, crowd, red phone boxes
    patch(g, 140, 70, 0x6dbb55, 40, 0.2, -90, { layer: 2 }); patch(g, 270, 80, 0x6dbb55, 0, 0.2, -80, { layer: 2 });
    trees(g, scatter(60, (q) => [(q() - 0.5) * 400, -60 - q() * 200], 6), { size: 1.7, seed: 6 });
    const pb = []; for (let i = 0; i < 8; i++) pb.push({ p: [-120 + i * 6, 1.4, 44], s: [1.1, 2.8, 1.1], c: 0xd32f2f });
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.4 }), pb);
    makeCrowd(g, A, 70, { x: -50, z: 32, w: 260, d: 20 }, { seed: 4, scale: 1.7, y: 0.3, speed: 0.4 });
    const bl = [], br = rng(3); for (let i = 0; i < 18; i++) { const x = -330 + i * 40, h = 24 + br() * 14; bl.push({ p: [x, h / 2, -180 - br() * 40], s: [34, h, 40], c: [0xe0d4b8, 0xb8553a, 0xd8c4a4][Math.floor(br() * 3)] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.85 }), bl);
    birdFlock(g, A, 16, -130, 80, 0, 22, 3, 1.5);
  }
  return finish(g, A, { name: 'Big Ben / Elizabeth Tower + Parliament', realHeightM: 96, realWidthM: 270, source: 'Elizabeth Tower 96 m (clock dials 7 m), Victoria Tower 98.5 m, palace ~265 m long' });
}

// ============================================================ Leaning Tower of Pisa (56 m) + Piazza dei Miracoli
export function leaningTowerPisa({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const marble = lmat(0xf1ecde, { rough: 0.6 }), shade2 = lmat(0xcfc9b6, { rough: 0.7 }), dark = lmat(0x3a3a40, { rough: 0.5 });
  const T = new THREE.Group(); g.add(T);
  const lean = 3.97 * Math.PI / 180;
  const floors = [[0, 7.2, 7.7], [7.2, 15.0, 7.6], [15.0, 22.8, 7.5], [22.8, 30.6, 7.4], [30.6, 38.4, 7.3], [38.4, 46.2, 7.2], [46.2, 55, 5.2]];
  floors.forEach(([y0, y1, r], i) => {
    add(T, cyl(r - 0.9 * (i > 0 && i < 6 ? 1 : 0), r, y1 - y0, 36), i === 0 || i === 6 ? marble : shade2, [0, (y0 + y1) / 2, 0]);
    add(T, cyl(r + 0.7, r + 0.7, 0.7, 36), marble, [0, y1, 0]);
    const n = i === 0 ? 15 : i === 6 ? 12 : 24, rr = i === 6 ? r + 0.05 : r + 0.1, col = [], arch = [];
    for (let k = 0; k < n; k++) { const a = k / n * TAU; if (i > 0 && i < 6) { col.push({ p: [Math.cos(a) * (r + 0.2), (y0 + y1) / 2 - 0.4, Math.sin(a) * (r + 0.2)], s: [0.55, (y1 - y0) - 1.9, 0.55], c: 0xfffaf0 }); arch.push({ p: [Math.cos(a + TAU / n / 2) * (r + 0.05), (y0 + y1) / 2 - 0.5, Math.sin(a + TAU / n / 2) * (r + 0.05)], r: [0, -(a + TAU / n / 2) + Math.PI / 2, 0], s: [(TAU * r / n) * 0.55, y1 - y0 - 2.8, 0.35], c: 0x8a847a }); } else { arch.push({ p: [Math.cos(a + 0.1) * (rr + 0.05), (y0 + y1) / 2, Math.sin(a + 0.1) * (rr + 0.05)], r: [0, -(a + 0.1) + Math.PI / 2, 0], s: [i === 0 ? 2.2 : 1.8, i === 0 ? 3.6 : 2.8, 0.4], c: 0x6a645c }); } }
    if (col.length) instances(T, new THREE.CylinderGeometry(0.5, 0.5, 1, 8), lmat(0xffffff, { rough: 0.5 }), col);
    instances(T, box(1, 1, 1), lmat(0xffffff, { rough: 0.9 }), arch);
  });
  // belfry roof + bells
  add(T, cyl(3.2, 3.6, 3.4, 20), marble, [0, 56.7, 0]); add(T, cyl(3.7, 3.7, 0.5, 20), shade2, [0, 58.5, 0]);
  const bells = []; for (let k = 0; k < 3; k++) { const b = new THREE.Group(); b.position.set((k - 1) * 2.4, 55, 0); add(b, lathe([[0.01, 0.9], [0.5, 0.8], [0.8, 0], [0.01, 0]], 10), lmat(0xd9a63a, { metal: 0.7, rough: 0.35 }), [0, -0.9, 0]); T.add(b); bells.push(b); }
  A.add((t) => { bells.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.8 + i) * 0.35; }); });
  // lean: pivot around the base's south edge so the footing sits on the ground
  T.rotation.z = -lean; T.position.set(7.7 * Math.cos(lean) * 0.5, 0, 0); T.position.y = -Math.sin(lean) * 7.7 * 0.5 * -1 * 0;
  const lift = Math.sin(lean) * 7.7; T.position.set(0, lift * 0.0, 0); T.rotation.z = -lean; T.position.x = -7.7 * 0 ; T.position.y = lift;
  // shadow-free footing disc to hide the lifted edge
  add(g, cyl(8.4, 9.6, 2.2, 36), lmat(0xd9d2c0, { rough: 0.9 }), [0, 0.4, 0]);
  // piazza: Cathedral, Baptistery, lawns, walls, tourists holding up the tower
  if (base) {
    slab(g, 260, 1, 0x6dbb55, { y: -0.04, layer: 1 });
    patch(g, 400, 22, 0xe8e0c8, 0, 0.18, 62, { layer: 2 }); patch(g, 18, 300, 0xe8e0c8, 0, 0.18, 0, { layer: 2 });
    const cath = new THREE.Group(); cath.position.set(-24, 0, -62); g.add(cath);
    add(cath, box(96, 22, 32), marble, [0, 11, 0]); add(cath, box(34, 38, 32), marble, [0, 19, 0]);
    for (let k = 0; k < 8; k++) add(cath, box(96.4, 0.6, 32.4), lmat(0xcfc7b4), [0, 2 + k * 2.6, 0]);
    add(cath, loft([{ y: 22, pts: ngon(8, 13, Math.PI / 8) }, { y: 34, pts: ngon(8, 13, Math.PI / 8) }, { y: 44, pts: ngon(8, 9, Math.PI / 8) }, { y: 54, pts: ngon(8, 1, Math.PI / 8) }]), lmat(0xb5a79a, { rough: 0.6 }));
    const ca = []; for (let k = 0; k < 36; k++) for (let j = 0; j < 4; j++) ca.push({ p: [-45 + k * 2.5, 3 + j * 4.6, 16.2], s: [1.2, 2.8, 0.3], c: 0x8a847a });
    instances(cath, box(1, 1, 1), lmat(0xffffff, { rough: 0.9 }), ca);
    const bap = new THREE.Group(); bap.position.set(-76, 0, 20); g.add(bap);
    add(bap, cyl(17, 17, 20, 36), marble, [0, 10, 0]); add(bap, lathe([[17, 20], [16, 28], [11, 38], [5, 46], [0.01, 54]], 32), lmat(0xd8c0a8, { rough: 0.6 }));
    add(bap, sph(2, 8, 6), lmat(0xd9a63a, { metal: 0.6 }), [0, 55, 0]);
    trees(g, scatter(40, (q) => { const a = q() * TAU, d = 120 + q() * 100; return [Math.cos(a) * d, Math.sin(a) * d]; }, 5), { size: 1.4, seed: 5 });
    // city wall: crenellated box with merlons
    add(g, box(260, 9, 2.4), lmat(0xd5c4a4), [0, 4.5, -130]); const mer = []; for (let x = -128; x <= 128; x += 4) mer.push({ p: [x, 9.8, -130], s: [2, 1.6, 2.6], c: 0xcdbb98 });
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.9 }), mer);
    makeCrowd(g, A, 90, { x: 0, z: 25, w: 160, d: 50 }, { seed: 4, scale: 1.7, y: 0.3, speed: 0.4 });
    birdFlock(g, A, 22, 0, 52, 0, 16, 9, 0.8);
    makeTraffic(g, A, 8, linePath(-250, 100, 250, 100, 3), 1000, { speed: 8, scale: 1.4, y: 0.1, seed: 2 }); patch(g, 520, 14, 0x474a55, 0, 0.14, 100, { layer: 2 });
  }
  return finish(g, A, { name: 'Leaning Tower of Pisa', realHeightM: 56, realWidthM: 15.5, source: '55.9 m low side, ~3.97 degree lean' });
}

// ============================================================ Colosseum (48 m)
export function colosseum({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const A0 = 94, B0 = 78; // semi axes of the outer ellipse (188 x 156 m)
  const ell = (k, a = A0, b = B0) => (ang) => [Math.cos(ang) * a * k, Math.sin(ang) * b * k];
  const trav = lmat(0xdcc9a0, { rough: 0.9 }), travD = lmat(0xc8b088, { rough: 0.9 });
  // inner structure: stepped seating (cavea)
  const elp = (k, n = 64) => Array.from({ length: n }, (_, i) => ell(k)(i / n * TAU));
  const stepsN = 8; for (let i = 0; i < stepsN; i++) { const k0 = 0.42 + i * 0.045, k1 = k0 + 0.05; add(g, loft([{ y: 2 + i * 4.2, pts: elp(k1) }, { y: 2 + (i + 1) * 4.2, pts: elp(k1) }, { y: 2 + (i + 1) * 4.2, pts: elp(k0) }], { cap: false }), lmat(i % 2 ? 0xb8613e : 0xc8704a, { rough: 0.85 }));
    add(g, loft([{ y: 2 + (i + 1) * 4.2, pts: elp(k1) }, { y: 2 + (i + 1) * 4.2, pts: elp(k0) }], { cap: false }), lmat(0xe0d4b8, { rough: 0.9, side: THREE.DoubleSide })); }
  // arena floor with hypogeum walls
  add(g, loft([{ y: 0.3, pts: elp(0.44) }, { y: 0.4, pts: elp(0.44) }]), lmat(0xe8d6a0, { rough: 1 }));
  const hyp = []; for (let i = -3; i <= 3; i++) { hyp.push({ p: [i * 6, 0.7, 0], s: [1.2, 1.2, 36], c: 0x9a8662 }); } for (let j = -2; j <= 2; j++) hyp.push({ p: [0, 0.7, j * 6], s: [64, 1.2, 1.2], c: 0x9a8662 });
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.9 }), hyp);
  // outer wall: 80 bays, 4 storeys; part of the outer ring (north-east) collapsed like the real ruin
  const bays = 80, arches = [], piers = [], caps = [], cornices = [], attic = [];
  const inner = [];
  for (let i = 0; i < bays; i++) {
    const a0 = i / bays * TAU, a1 = (i + 1) / bays * TAU, am = (a0 + a1) / 2;
    const [x, z] = ell(1)(am), tx = Math.cos(am) * 0, nx = Math.cos(am) / A0, nz = Math.sin(am) / B0, nl = Math.hypot(nx, nz), ry = Math.atan2(nx / nl, nz / nl);
    const [xa, za] = ell(1)(a0), [xb, zb] = ell(1)(a1), len = Math.hypot(xb - xa, zb - za);
    const broken = am > 1.05 * Math.PI && am < 1.62 * Math.PI;
    const hTop = broken ? 24 : 48;
    // bay block (stone) full height, then arch recesses per storey
    caps.push({ p: [x, hTop / 2, z], r: [0, ry, 0], s: [len * 1.01, hTop, 3.2], c: broken ? 0xcdb88e : 0xdcc9a0 });
    for (let s = 0; s < 3; s++) { const y0 = s * 12; if (y0 + 12 > hTop + 0.1) continue; arches.push({ p: [x + Math.sin(ry) * 1.7, y0 + 6.0, z + Math.cos(ry) * 1.7], r: [0, ry, 0], s: [len * 0.52, 7.4, 0.5], c: 0x2a2630 });
      cornices.push({ p: [x, y0 + 12, z], r: [0, ry, 0], s: [len * 1.04, 0.9, 4.2], c: 0xc4ad82 });
      piers.push({ p: [xa + Math.sin(ry) * 1.8, y0 + 6, za + Math.cos(ry) * 1.8], s: [0.9, 11, 0.9], c: 0xe8dcc0 }); }
    if (!broken) { attic.push({ p: [x + Math.sin(ry) * 1.7, 42.5, z + Math.cos(ry) * 1.7], r: [0, ry, 0], s: [len * 0.2, 2.6, 0.4], c: 0x2a2630 }); cornices.push({ p: [x, 48.3, z], r: [0, ry, 0], s: [len * 1.04, 1.4, 4.4], c: 0xc4ad82 }); }
    // inner ring (the surviving wall) taller on the broken side
    const [ix, iz] = ell(0.86)(am), ilen = len * 0.86; inner.push({ p: [ix, (broken ? 36 : 22) / 2, iz], r: [0, ry, 0], s: [ilen * 1.02, broken ? 36 : 22, 5], c: 0xd0bb90 });
    for (let s = 0; s < 3; s++) { const y0 = s * 12; if (y0 + 12 > (broken ? 36 : 22) + 0.1) continue; arches.push({ p: [ix - Math.sin(ry) * 2.55, y0 + 5.5, iz - Math.cos(ry) * 2.55], r: [0, ry + Math.PI, 0], s: [ilen * 0.5, 6.2, 0.5], c: 0x2a2630 }); }
  }
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.9 }), caps); instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.9 }), inner);
  instances(g, new THREE.CylinderGeometry(0.5, 0.5, 1, 8), lmat(0xffffff, { rough: 0.8 }), piers);
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.95 }), cornices); instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.9 }), arches.concat(attic));
  // site: Roman forum plaza, Arch of Constantine, Via dei Fori, trees and bustling tourists
  if (base) {
    slab(g, 420, 1.2, 0xc9bc9a, { y: -0.02, layer: 1 });
    ring(g, 130, 190, 0xe0d4b8, 0.2, { layer: 2 }); ring(g, 192, 222, COL.road, 0.25, { layer: 3 });
    makeTraffic(g, A, 14, ringPath(0, 0, 207), TAU * 207, { speed: 13, scale: 1.6, y: 0.3, seed: 6 });
    const ac = new THREE.Group(); ac.position.set(140, 0, 138); ac.rotation.y = -0.5; g.add(ac);
    add(ac, box(25, 21, 11), lmat(0xe6dcc0, { rough: 0.8 }), [0, 10.5, 0]); add(ac, box(26, 3, 12), lmat(0xd8caa4), [0, 22.5, 0]);
    for (const x of [-7.2, 0, 7.2]) add(ac, box(x === 0 ? 7 : 4, x === 0 ? 11 : 8, 11.4), lmat(0x2a2630), [x, x === 0 ? 5.5 : 4, 0]);
    trees(g, scatter(80, (q) => { const a = q() * TAU, d = 235 + q() * 150; return [Math.cos(a) * d, Math.sin(a) * d]; }, 4), { size: 2.0, seed: 4, kinds: 'mix' });
    // modern Rome blocks beyond
    const rb = rng(2), bl = []; for (let i = 0; i < 36; i++) { const a = rb() * TAU, d = 260 + rb() * 120; const h = 20 + rb() * 14; bl.push({ p: [Math.cos(a) * d, h / 2, Math.sin(a) * d], s: [32 + rb() * 16, h, 32 + rb() * 16], c: [0xd8a878, 0xc88858, 0xe0c090, 0xb8553a][Math.floor(rb() * 4)] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.85 }), bl);
    makeCrowd(g, A, 110, { x: 0, z: 0, r: 175 }, { seed: 4, scale: 1.7, y: 0.3, speed: 0.4 });
    makeCrowd(g, A, 40, { x: 0, z: 0, r: 30 }, { seed: 5, scale: 1.7, y: 0.45, speed: 0.4 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; flagPole(g, A, Math.cos(a) * 104, 48.8, Math.sin(a) * 82, 9, 6, FLAGS.red, { phase: i }); }
    flagPole(g, A, 150, 0.3, 100, 26, 9, FLAGS.italy, { phase: 2 });
  }
  return finish(g, A, { name: 'Colosseum', realHeightM: 48, realWidthM: 188, source: '48 m high, 188 x 156 m ellipse' });
}

// ============================================================ Pyramids of Giza + Sphinx
export function pyramidsGiza({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const sand = lmat(0xe6c98a, { rough: 0.95 }), stone = 0xe0bb72, capc = 0xf0dfae;
  const pyr = (x, z, w, h, courses, ry = 0, tip = 0) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
    const rect = (s) => rectPts(w * s, w * s);
    const rings = [];
    const body = new THREE.Mesh(loft([{ y: 0, pts: rect(1), col: 0xe3bf78 }, { y: h * (1 - tip), pts: rect(tip ? tip : 0.0) }].slice(0, 2).map((r, i) => i === 1 ? { y: h, pts: rect(0.0001), col: 0xe8c984 } : r), { cap: false, smooth: false, capBottom: false }), lmat(0xe3bf78, { rough: 0.9, vc: false })); body.castShadow = body.receiveShadow = true; p.add(body);
    const polyAt = (y) => rect(1 - y / h);
    const b = add(p, ledgeBands(polyAt, 0, h * 0.97, courses, { frac: 0.35, ex: 1.012 }), lmat(0xc9a35e, { rough: 0.95 })); b.castShadow = false;
    if (tip) add(p, loft([{ y: h * (1 - tip), pts: rect(tip) }, { y: h, pts: rect(0.0001) }]), lmat(capc, { rough: 0.6 }));
    return p;
  };
  pyr(0, 0, 230, 138.8, 70, 0);
  pyr(-310, -250, 215, 136.4, 66, 0.0, 0.17);
  pyr(-560, -480, 103, 65, 34, 0);
  for (let i = 0; i < 3; i++) pyr(120 + i * 52, 205 - i * 5, 45, 30, 16, 0);
  // Sphinx: 73 m long, 20 m tall
  const S = new THREE.Group(); S.position.set(200, 0, 330); S.rotation.y = 0.8; g.add(S);
  const sm = lmat(0xd6b676, { rough: 0.9 }), sd = lmat(0xb89654, { rough: 0.9 });
  add(S, rbox(18, 10, 44, 4), sm, [0, 6.5, -2]); add(S, sph(9.5, 14, 10), sm, [0, 7, -22], [0, 0, 0], [1, 0.8, 1.1]);
  for (const s of [-1, 1]) { add(S, rbox(5.2, 4.4, 30, 2), sm, [s * 5.4, 2.6, 28]); add(S, box(5, 1, 3), sd, [s * 5.4, 0.7, 43.5]); }
  add(S, rbox(11, 14, 10, 4), sm, [0, 12.5, 13]);                              // chest/shoulders
  add(S, sph(5.2, 18, 14), lmat(0xdcbf84, { rough: 0.85 }), [0, 20.5, 17.5], [0, 0, 0], [1, 1.12, 1]);  // head
  add(S, box(13, 8, 5), lmat(0x2f6fd6, { rough: 0.85 }), [0, 19.5, 14]);       // nemes headdress (blue/gold stripes below)
  for (let k = 0; k < 4; k++) add(S, box(13.4, 0.8, 5.2), lmat(0xe8c15a), [0, 17 + k * 1.8, 14]);
  add(S, box(2, 3.4, 1.4), lmat(0xc8a064), [0, 19.6, 23.1]); for (const s of [-1, 1]) add(S, sph(0.55, 6, 5), lmat(0x2a2220), [s * 1.8, 21.2, 22.7]);
  add(S, cyl(0.5, 0.8, 10, 6), sd, [0, 11, -26.5], [0.9, 0, 0]);
  // camel caravan + dunes + guides: all moving
  const dunes = []; const dr = rng(9); for (let i = 0; i < 60; i++) { const a = dr() * TAU, d = 800 + dr() * 900; dunes.push({ p: [Math.cos(a) * d, 0, Math.sin(a) * d], s: [60 + dr() * 90, 5 + dr() * 12, 40 + dr() * 60], r: [0, dr() * 3, 0] }); }
  instances(g, new THREE.SphereGeometry(1, 14, 8), lmat(0xe0c07e, { rough: 1 }), dunes);
  const camel = (x) => { const c = new THREE.Group(); add(c, rbox(1.2, 1.6, 3.2, 0.5), lmat(0xc8985a), [0, 2.4, 0]); add(c, cyl(0.35, 0.5, 2.2, 6), lmat(0xc8985a), [0, 3.6, 1.8], [0.5, 0, 0]); add(c, sph(0.45, 8, 6), lmat(0xc8985a), [0, 4.6, 2.5], [0, 0, 0], [0.8, 0.8, 1.3]); add(c, sph(0.6, 8, 6), lmat(0xb88a4a), [0, 3.5, -0.4]); add(c, sph(0.6, 8, 6), lmat(0xb88a4a), [0, 3.5, 0.7]); const legs = []; for (const [lx, lz] of [[-0.4, -1.1], [0.4, -1.1], [-0.4, 1.1], [0.4, 1.1]]) { const l = add(c, cyl(0.15, 0.12, 2.3, 6), lmat(0xb88a4a), [lx, 1.15, lz]); legs.push(l); } const rider = add(c, rbox(0.7, 1.4, 0.7, 0.3), lmat([0xe53935, 0x2f6fd6, 0xffd23f][Math.abs(x) % 3]), [0, 4.2, -0.2]); add(c, sph(0.28, 8, 6), lmat(0xf2b98f), [0, 5.1, -0.2]); c.userData.legs = legs; return c; };
  const cams = []; for (let i = 0; i < 7; i++) { const c = camel(i); g.add(c); cams.push(c); }
  A.add((t) => { cams.forEach((c, i) => { const u = frac(t * 0.012 - i * 0.012), x = lerp(-420, 420, u); c.position.set(x, 0, 330 + Math.sin(x * 0.01) * 12); c.rotation.y = Math.PI / 2 - Math.cos(x * 0.01) * 0.06; c.position.y = Math.abs(Math.sin(t * 5 + i)) * 0.08; c.userData.legs.forEach((l, k) => { l.rotation.x = Math.sin(t * 5 + i + (k % 2 ? 0 : Math.PI)) * 0.4; }); }); });
  if (base) {
    slab(g, 1500, 2, 0xe6c98a, { y: -0.02, layer: 1 });
    makeCrowd(g, A, 70, { x: 150, z: 160, w: 500, d: 240 }, { seed: 4, scale: 1.7, y: 0.3, speed: 0.4, colors: [0xffffff, 0xe53935, 0x2f6fd6, 0xffd23f, 0xe8dcc0] });
    // tents/stalls, jeeps, a road with moving buses and a patch of green city edge
    const tn = []; for (let i = 0; i < 10; i++) tn.push({ p: [-120 + i * 24, 3, 300], s: [8, 6, 8], c: [0xe53935, 0xffffff, 0x2f6fd6, 0xffd23f][i % 4] });
    instances(g, new THREE.ConeGeometry(0.7, 1, 4), lmat(0xffffff, { rough: 0.8 }), tn);
    patch(g, 1500, 24, 0x474a55, 0, 0.3, 430, { layer: 3 });
    makeTraffic(g, A, 8, linePath(-700, 430, 700, 430, 4), 2800, { speed: 16, scale: 2.2, y: 0.4, seed: 8, colors: [0xffffff, 0xffd23f, 0xe53935] });
    patch(g, 1500, 200, 0x5aa84a, 0, 0.25, 700, { layer: 2 });
    trees(g, scatter(90, (q) => [(q() - 0.5) * 1400, 620 + q() * 200], 3), { size: 2.6, seed: 3, kinds: 'round', colors: [0x58b04a, 0x3f9a52] });
    birdFlock(g, A, 20, 0, 160, 0, 120, 4, 3);
  }
  return finish(g, A, { name: 'Pyramids of Giza + Sphinx', realHeightM: 138.8, realWidthM: 230, source: 'Great Pyramid 138.8 m today (146.6 m original), base 230 m; Khafre 136.4 m; Menkaure 65 m; Sphinx 20 m x 73 m' });
}

// ============================================================ Taj Mahal (73 m)
export function tajMahal({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const marble = lmat(0xf6f1e6, { rough: 0.35, metal: 0.05 }), red = lmat(0xb5533c, { rough: 0.8 }), gold = lmat(0xe0b040, { metal: 0.7, rough: 0.3 }), arch = lmat(0x3a3a4a, { rough: 0.4 });
  add(g, box(96, 7, 96), lmat(0xe9e2d0, { rough: 0.7 }), [0, 3.5, 0]);          // plinth platform
  const M = new THREE.Group(); M.position.y = 7; g.add(M);
  add(M, box(5, 0.01, 5), marble);
  const oct = (r, ch) => { const p = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; const d = i % 2 ? r : r * 1.0; p.push([Math.cos(a) * d * (i % 2 ? 1 : 1) , Math.sin(a) * d]); } return p; };
  // main block: square with chamfered corners 57 m, 33 m high
  const s = 28.5, c = 8;
  const plan = [[-s + c, -s], [s - c, -s], [s, -s + c], [s, s - c], [s - c, s], [-s + c, s], [-s, s - c], [-s, -s + c]];
  add(M, loft([{ y: 0, pts: plan }, { y: 33, pts: plan }]), marble);
  add(M, box(60, 1.2, 60), marble, [0, 33.4, 0]).scale.set(0.97, 1, 0.97);
  // four great iwans (pointed arch portals) with deep dark recess and framed pishtaq
  for (let k = 0; k < 4; k++) { const f = new THREE.Group(); f.rotation.y = k * Math.PI / 2; M.add(f); add(f, box(20, 29, 3), marble, [0, 15, s + 0.5]); add(f, rbox(11, 22, 1.2, 4), arch, [0, 12.5, s + 2.1]); add(f, cone(5.6, 6, 3), arch, [0, 26.5, s + 2.1], [0, 0, 0]).scale.set(1, 1, 0.1); for (const u of [-1, 1]) { add(f, rbox(5, 8, 0.7, 2), arch, [u * 15, 9, s - 0.1 + 0.1]); add(f, rbox(5, 7, 0.7, 2), arch, [u * 15, 21, s - 0.1 + 0.1]); } for (const u of [-1, 1]) add(f, cyl(1.4, 1.4, 31, 8), marble, [u * 11.6, 15.5, s + 1.5]); }
  // central double dome, drum, four chhatris, golden finial
  add(M, cyl(10.5, 11, 8, 28), marble, [0, 36.5, 0]);
  add(M, lathe([[0.01, 40], [9.5, 40.5], [12, 46], [12.8, 52], [11.2, 58], [7.5, 64], [3.2, 68], [1.2, 70.5], [0.01, 71.5]], 40), marble, [0, 0, 0]);
  add(M, tor(10, 0.6, 6, 30), marble, [0, 40.3, 0], [Math.PI / 2, 0, 0]);
  add(M, lathe([[0.01, 0], [1.2, 0.3], [0.6, 3], [0.9, 5], [0.4, 8], [0.01, 9.5]], 12), gold, [0, 70.8, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = sx * 19, z = sz * 19; add(M, cyl(2.6, 2.6, 5, 12), marble, [x, 37, z]); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; add(M, cyl(0.28, 0.28, 5, 6), marble, [x + Math.cos(a) * 2.2, 40.5, z + Math.sin(a) * 2.2]); } add(M, lathe([[0.01, 0], [2.4, 0], [2.6, 2], [1.6, 4.4], [0.01, 6]], 14), marble, [x, 43, z]); add(M, cone(0.2, 2.5, 6), gold, [x, 51, z]); }
  // four minarets (40 m) at the corners of the platform, each three storeys with a top chhatri; slightly lit
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const m = new THREE.Group(); m.position.set(sx * 45, 7, sz * 45); g.add(m);
    add(m, cyl(5.4, 6.2, 3.5, 8), marble, [0, 1.7, 0]);
    for (let i = 0; i < 3; i++) { add(m, cyl(2.7 - i * 0.2, 3.0 - i * 0.2, 8.6, 18), marble, [0, 5.5 + i * 8.9, 0]); add(m, tor(3.1 - i * 0.2, 0.55, 6, 18), marble, [0, 9.9 + i * 8.9, 0], [Math.PI / 2, 0, 0]); add(m, tor(2.9 - i * 0.2, 0.18, 4, 16), lmat(0x8a7a6a), [0, 5.5 + i * 8.9, 0], [Math.PI / 2, 0, 0]); }
    add(m, cyl(2.4, 2.4, 3.2, 12), marble, [0, 33.3, 0]); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; add(m, cyl(0.2, 0.2, 3.2, 6), marble, [Math.cos(a) * 2.2, 36.5, Math.sin(a) * 2.2]); }
    add(m, lathe([[0.01, 0], [2.4, 0.2], [2.5, 2], [1.4, 4.2], [0.01, 5.4]], 14), marble, [0, 38.3, 0]); add(m, cone(0.2, 2.2, 6), gold, [0, 44, 0]);
  }
  // red sandstone mosque and jawab (flanking buildings with white domes)
  for (const s2 of [-1, 1]) { const w = new THREE.Group(); w.position.set(s2 * 92, 0, 0); g.add(w); add(w, box(34, 16, 62), red, [0, 8, 0]); add(w, box(36, 1.2, 64), lmat(0xd9b9a0), [0, 16.6, 0]); for (let i = 0; i < 3; i++) add(w, lathe([[0.01, 0], [5.2, 0], [6.4, 4], [4.5, 8.5], [0.01, 11]], 18), marble, [0, 17, -20 + i * 20]); for (let i = 0; i < 9; i++) add(w, rbox(2.4, 8, 0.5, 1), arch, [-12 * 0 + (s2 > 0 ? -17.1 : 17.1), 6, -24 + i * 6]).rotation.y = Math.PI / 2; }
  // charbagh: reflecting pool + cross-axis channels with fountains, cypress rows, red gateway
  const pool = makeWater(8, 260, { seg: 6, amp: 0.05, color: 0x4aa0c8, speed: 1.2 }); pool.position.set(0, 0.35, 190); g.add(pool);
  const cross = makeWater(250, 7, { seg: 20, amp: 0.05, color: 0x4aa0c8, speed: 1.2 }); cross.position.set(0, 0.35, 190); g.add(cross);
  patch(g, 30, 260, 0xe8dcc0, 0, 0.2, 190, { layer: 2 }); patch(g, 250, 6, 0xe8dcc0, 0, 0.2, 190, { layer: 2 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) patch(g, 110, 110, 0x4fa04a, sx * 70, 0.18, 190 + sz * 70, { layer: 2 });
  const cy = []; for (let i = 0; i < 20; i++) for (const sx of [-1, 1]) cy.push({ p: [sx * 10, 4, 100 + i * 12], s: [3, 8, 3], c: 0x2f7a3a });
  instances(g, new THREE.ConeGeometry(0.5, 1, 8), lmat(0xffffff, { rough: 0.9 }), cy);
  const jets = [], jm = []; for (let i = 0; i < 20; i++) jets.push({ p: [0, 0.4, 100 + i * 12] });
  const jmesh = instances(g, new THREE.CylinderGeometry(0.1, 0.18, 1, 6), lmat(0xe8f8ff, { rough: 0.2 }), jets), o = new THREE.Object3D();
  A.add((t) => { jets.forEach((j, i) => { const h = 1.8 + 1.6 * (0.5 + 0.5 * Math.sin(t * 2.5 + i)); o.position.set(0, 0.4 + h / 2, j.p[2]); o.scale.set(1, h, 1); o.updateMatrix(); jmesh.setMatrixAt(i, o.matrix); }); jmesh.instanceMatrix.needsUpdate = true; });
  const gate = new THREE.Group(); gate.position.set(0, 0, 330); g.add(gate); add(gate, box(60, 26, 12), red, [0, 13, 0]); add(gate, rbox(12, 20, 3, 5), arch, [0, 10, 5.5]); for (const u of [-1, 0, 1]) add(gate, lathe([[0.01, 0], [3.2, 0], [3.6, 2.4], [0.01, 4.6]], 12), marble, [u * 14, 26, 0]); for (let i = 0; i < 11; i++) add(gate, box(1.6, 1.4, 1.4), marble, [-25 + i * 5, 27.7, 0]);
  if (base) {
    slab(g, 520, 1.2, 0xd8c79a, { y: -0.02, layer: 1 });
    const rv = makeWater(560, 90, { seg: 20, amp: 0.3, color: 0x5a9a8a, speed: 0.8, scale: 2 }); rv.position.set(0, 0.2, -150); g.add(rv);
    trees(g, scatter(70, (q) => { const x = (q() - 0.5) * 460, z = 50 + q() * 400; return Math.abs(x) < 150 && z > 100 && z < 330 ? null : [x, z]; }, 3), { size: 2.0, seed: 3, kinds: 'mix' });
    makeCrowd(g, A, 110, { x: 0, z: 200, w: 40, d: 240 }, { seed: 4, scale: 1.7, y: 0.4, speed: 0.4 });
    makeCrowd(g, A, 50, { x: 0, z: 62, w: 80, d: 24 }, { seed: 6, scale: 1.7, y: 7.4, speed: 0.4 });
    makeBoats(g, A, [{ len: 12, color: 0xd9a63a, path: linePath(-250, -150, 250, -150, 0), length: 1000, u0: 0.2, speed: 4 }, { len: 9, color: 0xe5483a, path: linePath(250, -138, -250, -138, 0), length: 1000, u0: 0.7, speed: 3 }], { y: 0.5 });
    birdFlock(g, A, 30, 0, 80, 0, 50, 7, 1.4);
    flagPole(g, A, 60, 26, 330, 8, 5, FLAGS.india, { phase: 1 });
  }
  return finish(g, A, { name: 'Taj Mahal', realHeightM: 73, realWidthM: 95, source: '73 m to the finial; minarets 40 m; platform 95 m' });
}

// ============================================================ Christ the Redeemer (38 m on a 710 m peak)
export function christRedeemer({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const soap = lmat(0xe9ebe4, { rough: 0.5 }), soapD = lmat(0xcfd2c8, { rough: 0.6 });
  // summit
  const r = rng(6);
  const wob = (a, t) => 1 + 0.12 * Math.sin(a * 3 + 1) + 0.08 * Math.sin(a * 5 + 2) * (1 - t), radT = (t) => lerp(420, 22, Math.pow(t, 0.7)), yT = (t) => -250 + 250 * Math.pow(t, 0.55);
  const hillAt = (x, z) => { const a = Math.atan2(z, x), d = Math.hypot(x, z); let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (radT(m) * wob(a, m) > d) lo = m; else hi = m; } return yT((lo + hi) / 2); };
  const rings = []; for (let i = 0; i <= 18; i++) { const t = i / 18, y = -250 + 250 * Math.pow(t, 0.55), rad = lerp(420, 22, Math.pow(t, 0.7)); rings.push({ y, pts: Array.from({ length: 36 }, (_, k) => { const a = k / 36 * TAU, w = wob(a, t); return [Math.cos(a) * rad * w, Math.sin(a) * rad * w]; }), col: lerp(0, 1, 0) }); }
  const hill = new THREE.Mesh(loft(rings, { smooth: true }), lmat(0x5a9a4a, { rough: 1 })); hill.receiveShadow = true; g.add(hill);
  // rocky granite shoulders + forest patches (instanced trees on the slopes)
  const rk = []; for (let i = 0; i < 40; i++) { const a = r() * TAU, d = 40 + r() * 200; rk.push({ p: [Math.cos(a) * d, hillAt(Math.cos(a) * d, Math.sin(a) * d) + 1, Math.sin(a) * d], s: [4 + r() * 9, 3 + r() * 5, 4 + r() * 9], r: [r(), r() * 3, r()], c: 0x9a9488 }); }
  instances(g, new THREE.DodecahedronGeometry(1, 0), lmat(0xffffff, { rough: 0.95 }), rk);
  add(g, cyl(30, 34, 1.5, 24), lmat(0xd8d0be, { rough: 0.9 }), [0, -0.5, 0]);          // summit terrace
  // chapel pedestal 8 m
  add(g, frustum(rectPts(14, 14), rectPts(10, 10), 8, 0), lmat(0xd6d0c0, { rough: 0.8 }));
  add(g, rbox(3, 3.6, 0.6, 1), lmat(0x2a2a36), [0, 2.4, 5.2]);
  // statue: robe (lathe), arms span 28 m, head
  const S = new THREE.Group(); S.position.y = 8; g.add(S);
  add(S, lathe([[0.01, 0], [3.0, 0], [3.2, 2], [2.8, 10], [2.5, 16], [2.9, 19.5], [0.01, 21]], 20), soap).castShadow = true;
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; add(S, cone(0.35, 9, 4), soapD, [Math.cos(a) * 2.9, 5.2, Math.sin(a) * 2.9], [0.03, 0, 0]); }
  add(S, rbox(28, 3.2, 3.0, 1.2), soap, [0, 19.6, 0]);                                                                    // arms (horizontal bar)
  for (const s of [-1, 1]) { add(S, rbox(8, 3.2, 2.8, 1.1), soapD, [s * 8.5, 19.6, 0]); add(S, rbox(3.2, 1.2, 0.8, 0.4), soap, [s * 13.6, 19.6, 0.1]); }
  add(S, cyl(0.9, 1.1, 2.4, 10), soap, [0, 22.3, 0]);
  add(S, sph(2.2, 16, 12), soap, [0, 24.8, 0], [0, 0, 0], [0.9, 1.15, 1]);
  add(S, box(0.6, 0.6, 0.4), soapD, [0, 24.2, 1.6]); for (const s of [-1, 1]) add(S, sph(0.22, 6, 5), lmat(0x333a3a), [s * 0.6, 25.0, 1.48]);
  // sunrise glow halo (a faint pulsing ring)
  const haloM = new THREE.MeshBasicMaterial({ color: 0xfff2b8, transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.RingGeometry(14, 22, 48), haloM); halo.position.set(0, 24, -3); S.add(halo); halo.visible = false;
  if (base) {
    // forested slopes
    trees(g, scatter(260, (q) => { const a = q() * TAU, d = 45 + q() * 360; return [Math.cos(a) * d, Math.sin(a) * d]; }, 4).map(([x, z]) => [x, z, 3.2, hillAt(x, z)]), { size: 1.0, seed: 4 });
    makeCrowd(g, A, 50, { x: 0, z: 12, r: 24 }, { seed: 4, scale: 1.7, y: 0.3, speed: 0.4 });
    // cog railway (red tram on the slope) and tour minibuses
    const tram = add(g, rbox(14, 5, 5, 1.2), lmat(0xe53935, { rough: 0.4 }), [0, 0, 0]);
    A.add((t) => { const u = 0.5 + 0.5 * Math.sin(t * 0.25), d = lerp(300, 70, u), ang = 0.8; const x = Math.cos(ang) * d, z = Math.sin(ang) * d; tram.position.set(x, hillAt(x, z) + 3, z); tram.rotation.set(0, -ang, 0); });
    cloudCluster(g, A, 7, 900, 120, 11, 7, 70);
    birdFlock(g, A, 10, 0, 50, 0, 70, 9, 0.7);
    // distant Sugarloaf and the bay
    add(g, sph(1, 24, 14, 0, TAU, 0, Math.PI / 2), lmat(0x8f8a80, { rough: 0.95 }), [-520, -200, -800], [0, 0, 0], [160, 280, 130]);
    const bay = makeWater(2400, 1200, { seg: 24, amp: 1.0, color: 0x2f86bb, speed: 0.8, scale: 6 }); bay.position.set(0, -260, -1400); g.add(bay);
    makeBoats(g, A, [{ len: 90, color: 0xffffff, cabin: 0xe5483a, path: linePath(-900, -1500, 900, -1500, 0), length: 3600, u0: 0.2, speed: 12 }, { len: 40, color: 0xffd23f, sail: true, path: linePath(900, -1250, -900, -1250, 0), length: 3600, u0: 0.5, speed: 8 }], { y: -258 });
  }
  return finish(g, A, { name: 'Christ the Redeemer', realHeightM: 38, realWidthM: 28, source: '30 m statue + 8 m pedestal = 38 m; arm span 28 m; Corcovado peak 710 m' });
}
