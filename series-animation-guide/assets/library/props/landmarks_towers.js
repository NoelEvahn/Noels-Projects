// Landmarks pack: glass / stone skyscrapers (Empire State, Burj Khalifa, One WTC, Shanghai Tower, Taipei 101, Petronas Towers).
// 1 unit = 1 m. Each builder returns a Group with userData.realHeightM and userData.update(t).
import { THREE, rng, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade, clamp, lerp, smooth, TAU, COL, lmat, animator, finish, frac, ngon, rectPts, scalePts, lerpPts, rotPts, loft, frustum, lathe, merge, xf, ledgeBands, instances, beams, flagPole, FLAGS, blinker, makeWater, makeCrowd, makeTraffic, ringPath, linePath, trees, scatter, slab, ring, disc, patch, plazaBase, cityGrid, makeBoats } from './landmarks_kit.js';

const GLASS = (c, o = {}) => lmat(c, { metal: 0.45, rough: 0.22, ...o });

// window panes on a box tier (instanced planes): floorH, pitch metres
function winBox(g, cx, cz, w, d, y0, y1, { floorH = 4.2, pitch = 3.2, c = 0x35566f, inset = 0.12, skip = 0 } = {}) {
  const list = [];
  const floors = Math.floor((y1 - y0) / floorH);
  const faces = [[0, d / 2, w, 0], [0, -d / 2, w, Math.PI], [w / 2, 0, d, Math.PI / 2], [-w / 2, 0, d, -Math.PI / 2]];
  for (const [fx, fz, span, ry] of faces) {
    const cols = Math.floor(span / pitch);
    for (let f = skip; f < floors; f++) for (let k = 0; k < cols; k++) {
      const u = -span / 2 + (k + 0.5) * (span / cols);
      const x = ry === 0 || ry === Math.PI ? u : fx, z = ry === 0 || ry === Math.PI ? fz : u;
      list.push({ p: [cx + x + Math.sin(ry) * inset, y0 + (f + 0.55) * floorH, cz + z + Math.cos(ry) * inset], r: [0, ry, 0], s: [1.35, 2.3, 1], c: ((f * 7 + k * 3) % 11 === 0) ? 0xffe9a8 : c });
    }
  }
  if (!list.length) return;
  const pg = new THREE.PlaneGeometry(1, 1);
  instances(g, pg, lmat(0xffffff, { rough: 0.2, metal: 0.3, side: THREE.DoubleSide }), list);
}
function shaft(g, polyAt, y0, y1, { n = 24, bands = 0, glass = 0x6fa8cf, bandCol = 0xe4e9ee, smoothN = false, ex = 1.012, fr = 0.3, cap = true, mt = {}, shadow = true } = {}) {
  const rings = []; for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; rings.push({ y, pts: polyAt(y) }); }
  const m = add(g, loft(rings, { cap, smooth: smoothN }), GLASS(glass, mt)); m.castShadow = shadow;
  if (bands) { const b = add(g, ledgeBands(polyAt, y0, y1, bands, { ex, fr }), lmat(bandCol, { rough: 0.5, metal: 0.2 })); b.castShadow = false; }
  return m;
}
const spireMesh = (g, y0, y1, r0, r1, color = 0xc9d2dc, seg = 8) => add(g, cyl(r1, r0, y1 - y0, seg), lmat(color, { metal: 0.7, rough: 0.3 }), [0, (y0 + y1) / 2, 0]);

// ============================================================ Empire State Building (381 m roof, 443 m with mast)
export function empireState({ base = true, detail = 'high' } = {}) {
  const g = new THREE.Group(), A = animator();
  const lime = 0xd6cdb4, T = [[0, 22, 120, 66], [22, 80, 78, 52], [80, 200, 56, 40], [200, 245, 44, 32], [245, 300, 34, 25], [300, 345, 24, 18], [345, 381, 14, 11]];
  for (const [y0, y1, w, d] of T) {
    add(g, box(w, y1 - y0, d), lmat(lime, { rough: 0.8 }), [0, (y0 + y1) / 2, 0]);
    add(g, box(w + 1.6, 1.6, d + 1.6), lmat(0xbdb298), [0, y1 + 0.8, 0]);               // parapet / setback roof
    if (detail === 'high') { winBox(g, 0, 0, w, d, y0 + 1.5, y1 - 1.5, { floorH: 4.2, pitch: 3.4 }); }
  }
  // stainless piers (vertical fins) up the main shaft: the building's signature stripes
  const fins = []; for (const [y0, y1, w, d] of T.slice(1)) for (let k = -w / 2 + 3; k <= w / 2 - 2; k += 3.4) for (const s of [-1, 1]) fins.push({ p: [k, (y0 + y1) / 2, s * (d / 2 + 0.08)], s: [0.55, y1 - y0 - 3, 0.3], c: 0xe8e4d6 });
  if (detail === 'high') instances(g, box(1, 1, 1), lmat(0xffffff, { metal: 0.4, rough: 0.4 }), fins);
  // art-deco crown: 86th-floor deck, observation dome, mooring mast
  add(g, cyl(5.5, 6.5, 12, 16), lmat(0xe8e2d2), [0, 387, 0]);
  add(g, cyl(3.7, 5.6, 14, 16), lmat(0xe8e2d2), [0, 400, 0]);
  add(g, cyl(2.0, 3.6, 16, 12), lmat(0xd8d2c2, { metal: 0.3 }), [0, 415, 0]);
  const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe9a0, emissiveIntensity: 2.2, roughness: 0.4 });
  add(g, cyl(2.3, 2.6, 7, 12), lampM, [0, 423.5, 0]);
  add(g, cone(1.9, 12, 10), lmat(0xd0d4da, { metal: 0.7, rough: 0.3 }), [0, 431, 0]);
  add(g, cyl(0.12, 0.35, 12, 6), lmat(0xd0d4da, { metal: 0.7 }), [0, 437, 0]);
  const lamps = [0xff3a3a, 0xffffff, 0x3a6aff, 0xffe9a0, 0x4ad06a]; const lc = new THREE.Color();
  A.add((t) => { lc.set(lamps[Math.floor(t / 2.5) % lamps.length]); lampM.emissive.copy(lc); lampM.emissiveIntensity = 1.8 + 0.6 * Math.sin(t * 3); });
  blinker(g, A, 0, 443.3, 0, 0xff2a2a, 1.2, { period: 1.2 });
  // Manhattan around it
  if (base) { cityGrid(g, A, { R: 520, pitch: 100, street: 18, seed: 11, hmin: 18, hmax: 90, clear: [[0, 0, 70, 50]], skew: 0.5 }); }
  makeCrowd(g, A, 40, { x: 0, z: 0, w: 140, d: 100 }, { seed: 4, scale: 1.1, y: 0.1, speed: 0.4 });
  return finish(g, A, { name: 'Empire State Building', realHeightM: 443, roofHeightM: 381, realWidthM: 129, source: '381 m roof, 443 m with mast' });
}

// ============================================================ Burj Khalifa (828 m)
export function burjKhalifa({ base = true, detail = 'high' } = {}) {
  const g = new THREE.Group(), A = animator();
  const glass = 0x8fbce0, bandC = 0xdfe8f2;
  // central hexagonal core 0..585
  const core = (y) => ngon(6, lerp(15, 5.5, Math.pow(y / 585, 0.8)), Math.PI / 6);
  shaft(g, core, 0, 585, { n: 30, bands: 60, glass, bandCol: bandC, fr: 0.18, ex: 1.03, cap: true, mt: { metal: 0.55, rough: 0.18 } });
  // three wings with spiral setbacks (each wing steps in at different heights)
  const steps = [0, 70, 135, 200, 262, 322, 380, 435, 485, 530];
  const wing = (k, ry) => {
    const wg = new THREE.Group(); wg.rotation.y = ry; g.add(wg);
    const off = k * 18;
    for (let i = 0; i < steps.length; i++) {
      const y0 = i === 0 ? 0 : steps[i] + off - 18, y1 = (i + 1 < steps.length ? steps[i + 1] + off - 18 : 555 + off * 0.2), len = 44 - i * 4.0, wid = 17 - i * 1.0;
      if (len < 9 || y1 > 590) continue;
      const yy1 = Math.min(y1, 590 - k * 6);
      add(wg, box(len, yy1 - y0, wid), GLASS(glass, { rough: 0.2 }), [len / 2, (y0 + yy1) / 2, 0]);
      add(wg, cyl(wid / 2, wid / 2, yy1 - y0, 14), GLASS(0x7aa8cc), [len, (y0 + yy1) / 2, 0]);
      add(wg, box(len + 0.5, 0.9, wid + 0.5), lmat(bandC, { rough: 0.5 }), [len / 2, yy1 + 0.45, 0]);
      for (let b = 1; b < 4; b++) add(wg, box(len + 0.3, 0.55, wid + 0.3), lmat(bandC, { rough: 0.5 }), [len / 2, y0 + (yy1 - y0) * b / 4, 0]);
    }
  };
  [0, 1, 2].forEach((k) => wing(k, k * TAU / 3 + Math.PI / 6));
  // mechanical crown, top floors, then the long spire
  add(g, cyl(5.0, 5.8, 20, 12), GLASS(glass), [0, 595, 0]);
  add(g, cyl(3.4, 4.6, 40, 12), lmat(0xd8dee6, { metal: 0.6, rough: 0.3 }), [0, 625, 0]);
  add(g, cyl(2.4, 3.4, 60, 10), lmat(0xd8dee6, { metal: 0.7, rough: 0.28 }), [0, 675, 0]);
  for (let i = 0; i < 6; i++) add(g, cyl(1.8 - i * 0.2, 2.4 - i * 0.2, 28, 8), lmat(0xe8edf2, { metal: 0.7, rough: 0.25 }), [0, 718 + i * 28, 0]);
  add(g, cyl(0.12, 0.7, 40, 6), lmat(0xe8edf2, { metal: 0.8 }), [0, 808, 0]);
  blinker(g, A, 0, 828, 0, 0xff2a2a, 1.2, { period: 1.5 });
  blinker(g, A, 0, 700, 0, 0xff2a2a, 1.0, { period: 1.5, phase: 0.5 });
  // podium + Dubai Fountain lake with animated jets
  if (base) {
    slab(g, 700, 1, 0xe3cf9a, { y: -0.02, layer: 1 });
    for (const k of [0, 1, 2]) { const a = k * TAU / 3 + Math.PI / 6 + Math.PI; const m = add(g, box(140, 28, 36), lmat(0xd9d2c2, { rough: 0.7 }), [Math.cos(a) * 70, 14, -Math.sin(a) * 70], [0, a, 0]); m.rotation.y = a; }
    const lake = makeWater(520, 360, { seg: 30, amp: 0.25, color: 0x3aa0c8, speed: 1.1 }); lake.position.set(-20, 0.1, 330); g.add(lake);
    const jets = [], r = rng(8);
    for (let i = 0; i < 22; i++) jets.push({ p: [-180 + (i / 21) * 320, 0.5, 300 + Math.sin(i * 0.7) * 40], s: [3, 1, 3], c: 0xdff4ff });
    const jm = instances(g, new THREE.CylinderGeometry(0.4, 0.6, 1, 8), lmat(0xffffff, { rough: 0.2, opacity: 0.85, depthWrite: false }), jets);
    const o = new THREE.Object3D(), caps = instances(g, new THREE.SphereGeometry(0.9, 8, 6), lmat(0xeafaff, { rough: 0.2 }), jets.map((j) => ({ p: j.p, s: 2.2 })));
    A.add((t) => { jets.forEach((j, i) => { const h = 18 + 55 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 0.6)) * (0.6 + 0.4 * Math.sin(i * 1.7)); o.position.set(j.p[0], 0.5 + h / 2, j.p[2]); o.scale.set(3, h, 3); o.rotation.set(0, 0, 0); o.updateMatrix(); jm.setMatrixAt(i, o.matrix); o.position.y = 0.5 + h; o.scale.setScalar(2.4); o.updateMatrix(); caps.setMatrixAt(i, o.matrix); }); jm.instanceMatrix.needsUpdate = caps.instanceMatrix.needsUpdate = true; });
    // desert-city towers around
    const rr = rng(21), pts = [];
    for (let i = 0; i < 40; i++) { const a = rr() * TAU, d = 180 + rr() * 420; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (z > 120 && Math.abs(x) < 300) continue; const h = 40 + rr() * rr() * 230, w = 28 + rr() * 30; pts.push({ p: [x, h / 2, z], s: [w, h, w * (0.7 + rr() * 0.4)], c: [0xb9cbd8, 0xd9d2c0, 0x9bb4c8, 0xc8d8e4][Math.floor(rr() * 4)] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { metal: 0.3, rough: 0.35 }), pts);
    // roads with traffic
    ring(g, 520, 560, COL.road, 0.25, { layer: 3 });
    makeTraffic(g, A, 16, ringPath(0, 0, 540), TAU * 540, { speed: 24, scale: 2.2, y: 0.3, seed: 3 });
    trees(g, scatter(60, (q) => { const a = q() * TAU, d = 90 + q() * 250; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (z > 100) return null; return [x, z]; }, 5), { size: 3, seed: 5 });
    makeCrowd(g, A, 50, { x: 0, z: 150, w: 200, d: 80 }, { seed: 6, scale: 2, y: 0.3, speed: 0.4 });
  }
  return finish(g, A, { name: 'Burj Khalifa', realHeightM: 828, realWidthM: 100, source: '828 m (2,717 ft)' });
}

// ============================================================ One World Trade Center (541 m)
export function oneWTC({ base = true, detail = 'high' } = {}) {
  const g = new THREE.Group(), A = animator();
  const a = 30.5, kC = a * Math.SQRT2;
  const planAt = (y) => { const t = clamp((y - 57) / (417 - 57)); const rc = lerp(kC, a, t), rm = lerp(a, kC, t), pts = []; for (let k = 0; k < 8; k++) { const ang = k * Math.PI / 4 - Math.PI / 8 * 0; const isC = k % 2 === 1; const r = isC ? rc : rm; pts.push([Math.cos(ang) * r, Math.sin(ang) * r]); } return pts; };
  // 8 points: even k -> midpoints (angle 0,90..), odd k -> corners (45..) : replicate square at t=0
  // solid podium (first 57 m)
  add(g, loft([{ y: 0, pts: planAt(0) }, { y: 57, pts: planAt(0) }]), lmat(0xcfd3d8, { rough: 0.6, metal: 0.2 }), [0, 0, 0]);
  const m = shaft(g, planAt, 57, 417, { n: 36, bands: 69, glass: 0x9ec3de, bandCol: 0xd6dee8, fr: 0.12, ex: 1.012, mt: { metal: 0.7, rough: 0.12 } });
  // vertical fins at the 8 corners (silver prism edges)
  const fins = []; for (let k = 0; k < 8; k++) { const p0 = planAt(57)[k], p1 = planAt(417)[k]; fins.push([p0[0], 57, p0[1], p1[0], 417, p1[1], 0.7, 0.7]); }
  beams(g, lmat(0xeef2f6, { metal: 0.8, rough: 0.2 }), fins);
  // parapet + spire (124 m): base ring, mast, beacon
  add(g, cyl(14, 17, 5, 16), lmat(0xdfe5ec, { metal: 0.5, rough: 0.3 }), [0, 419.5, 0]);
  add(g, cyl(5, 9, 40, 12), lmat(0xe3e8ee, { metal: 0.7, rough: 0.25 }), [0, 442, 0]);
  add(g, cyl(1.6, 4, 60, 10), lmat(0xe8edf2, { metal: 0.8, rough: 0.25 }), [0, 492, 0]);
  add(g, cyl(0.15, 1.2, 40, 6), lmat(0xeef2f6, { metal: 0.8 }), [0, 522, 0]);
  const beaconM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 3, roughness: 0.4 });
  const bc = new THREE.Mesh(new THREE.SphereGeometry(3.2, 14, 10), beaconM); bc.position.y = 524; g.add(bc);
  A.add((t) => { beaconM.emissiveIntensity = 1.5 + 2.2 * (0.5 + 0.5 * Math.sin(t * 2.4)); });
  blinker(g, A, 0, 541, 0, 0xff2a2a, 1, { period: 1.4 });
  if (base) {
    cityGrid(g, A, { R: 600, pitch: 100, street: 18, seed: 31, hmin: 22, hmax: 110, clear: [[0, 0, 80, 80]], skew: 0.55, palette: [0x9aa7b8, 0x8f9db0, 0xb8c4d0, 0x7a8aa0, 0xc7b8a0, 0xa8826a] });
    // Memorial pools: two black squares with water falling in (animated ripple) beside the tower
    for (const [px, pz] of [[-70, 78], [88, 78]].map(([x, z]) => [x * 0.8 - 5, z * 0.4 - 52])) {
      patch(g, 62, 62, 0x2d2f36, px, 0.3, pz, { layer: 3 }); const w = makeWater(52, 52, { seg: 10, amp: 0.12, color: 0x203a55, speed: 1.6 }); w.position.set(px, 0.35, pz); g.add(w);
    }
    patch(g, 90, 90, 0xd8d0be, 0, 0.2, 0, { layer: 2 });
    const q = rng(9); trees(g, scatter(70, (r) => { const x = (r() - 0.5) * 220, z = (r() - 0.5) * 220; if (Math.abs(x) < 45 && Math.abs(z) < 45) return null; return [x, z]; }, 9), { size: 1.6, seed: 9 });
    makeCrowd(g, A, 40, { x: 0, z: 0, w: 100, d: 100 }, { seed: 4, scale: 1.2, y: 0.3, speed: 0.4 });
    // Hudson river + boats on the west side
    const riv = makeWater(240, 1300, { seg: 14, amp: 0.4, color: 0x2f7fb5, speed: 1.0, scale: 3 }); riv.position.set(-720, 0.25, 0); g.add(riv);
    makeBoats(g, A, [
      { len: 22, color: 0xffffff, cabin: 0xe53935, path: linePath(-700, -500, -700, 500, 20), length: 2000, u0: 0.1, speed: 9 },
      { len: 14, color: 0xe5483a, sail: true, path: linePath(-760, 500, -760, -500, 20), length: 2000, u0: 0.4, speed: 6 }], { y: 0.3 });
  }
  return finish(g, A, { name: 'One World Trade Center', realHeightM: 541, roofHeightM: 417, realWidthM: 61, source: '1,776 ft = 541 m' });
}

// ============================================================ Shanghai Tower (632 m) with Jin Mao + SWFC context
export function shanghaiTower({ base = true, detail = 'high', context = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const H = 632;
  const plan = (y) => { const t = y / 580, s = lerp(1, 0.38, Math.pow(t, 1.25)), tw = t * 2.1; return rotPts(Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * TAU; const r = 1 + 0.17 * Math.cos(3 * a); return [Math.cos(a) * r * 33 * s, Math.sin(a) * r * 33 * s]; }), tw); };
  shaft(g, plan, 0, 580, { n: 40, glass: 0x8db8d6, smoothN: true, bands: 9 * 4, bandCol: 0xdfe6ec, fr: 0.1, ex: 1.015, mt: { metal: 0.55, rough: 0.16 } });
  // zone-boundary mechanical belts (the nine "sky lobby" zones)
  for (let z = 1; z <= 8; z++) { const y = z * 64.4; add(g, loft([{ y: y - 3, pts: scalePts(plan(y), 1.025) }, { y: y + 3, pts: scalePts(plan(y), 1.025) }], { cap: false, smooth: true }), lmat(0xcfd6de, { metal: 0.6, rough: 0.3 })); }
  // crown: narrowing glass lantern + offset spire
  const crown = (y) => rotPts(Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * TAU, r = 1 + 0.17 * Math.cos(3 * a); const s = lerp(0.42, 0.18, (y - 580) / 52); return [Math.cos(a) * r * 33 * s, Math.sin(a) * r * 33 * s]; }), 2.1 * 580 / 580 + (y - 580) * 0.01);
  shaft(g, crown, 580, 632, { n: 8, glass: 0xbfd6e8, smoothN: true, mt: { metal: 0.6, rough: 0.15 } });
  add(g, cyl(0.5, 1.4, 20, 8), lmat(0xe8edf2, { metal: 0.8 }), [0, 626, 0]);
  blinker(g, A, 0, 637, 0, 0xff2a2a, 1.1, { period: 1.5 });
  // podium
  add(g, box(150, 18, 110), lmat(0xd8d4c8, { rough: 0.6 }), [10, 9, 40]);
  add(g, loft([{ y: 18, pts: ngon(4, 80, Math.PI / 4, 1, 0.7) }, { y: 22, pts: ngon(4, 78, Math.PI / 4, 1, 0.7) }]), lmat(0xbfd6c8, { metal: 0.3 }), [10, 0, 40]);
  if (context) {
    // Jin Mao (420 m, stepped pagoda) and SWFC "bottle opener" (492 m)
    const jm = new THREE.Group(); jm.position.set(-240, 0, -60); g.add(jm);
    for (let i = 0; i < 13; i++) { const w = 54 - i * 3.4; const y0 = i * 29, y1 = i === 12 ? 380 : y0 + 29; add(jm, box(w, y1 - y0, w), GLASS(0xb8c8d0), [0, (y0 + y1) / 2, 0]); add(jm, box(w + 3, 2.2, w + 3), lmat(0xd6d2c4), [0, y1, 0]); }
    add(jm, cone(8, 40, 8), lmat(0xd0d6dc, { metal: 0.6 }), [0, 400, 0]); add(jm, cyl(0.3, 0.9, 20, 6), lmat(0xd0d6dc), [0, 420, 0]);
    const sw = new THREE.Group(); sw.position.set(-170, 0, 190); g.add(sw);
    const swp = (y) => { const t = y / 450, s = lerp(1, 0.62, t); return [[-29 * s, -29 * s], [29 * s, -29 * s], [29 * s, 29 * s], [-29 * s, 29 * s]]; };
    add(sw, loft([{ y: 0, pts: swp(0) }, { y: 450, pts: swp(450) }]), GLASS(0x9db4c4), [0, 0, 0]);
    add(sw, box(58 * 0.66, 42, 58 * 0.66), GLASS(0x9db4c4), [0, 471, 0]);
    // the trapezoid opening at the top: dark sky-coloured hole box
    const hole = add(sw, box(24, 38, 5), lmat(0x1c2a3a, { rough: 0.5 }), [0, 468, 20]);
    for (const [x, z, s] of [[-20, 190, 0.6], [150, 200, 0.5], [-310, 140, 0.8], [240, 40, 0.65]]) { const t2 = new THREE.Group(); t2.position.set(x, 0, z); g.add(t2); add(t2, box(34, 260 * s, 34), GLASS(0xb0c4d2), [0, 130 * s, 0]); add(t2, box(36, 3, 36), lmat(0xdce2e8), [0, 260 * s, 0]); }
  }
  if (base) {
    cityGrid(g, A, { R: 640, pitch: 110, street: 20, seed: 55, hmin: 20, hmax: 140, clear: [[10, 40, 90, 70], [-240, -60, 60, 60], [-170, 190, 60, 60]], skew: 0.5, palette: [0xa8b8c8, 0x8f9db0, 0xc0ccd8, 0xb0a090] });
    const riv = makeWater(260, 1400, { seg: 14, amp: 0.4, color: 0x3a85b8, speed: 1.0, scale: 3 }); riv.position.set(720, 0.25, 0); g.add(riv);
    makeBoats(g, A, [
      { len: 40, color: 0xe5483a, cabin: 0xffffff, path: linePath(690, -600, 690, 600, 25), length: 2400, u0: 0.1, speed: 8 },
      { len: 25, color: 0xffffff, cabin: 0x2f6fd6, path: linePath(760, 600, 760, -600, 25), length: 2400, u0: 0.6, speed: 6 }], { y: 0.3 });
    const q = rng(2); trees(g, scatter(60, (r) => { const x = (r() - 0.5) * 300, z = 40 + (r() - 0.5) * 200; if (Math.abs(x) < 80 && z < 90) return null; return [x, z]; }, 2), { size: 2.2, seed: 2 });
    makeCrowd(g, A, 40, { x: 10, z: 40, w: 140, d: 90 }, { seed: 4, scale: 1.4, y: 0.3, speed: 0.4 });
  }
  return finish(g, A, { name: 'Shanghai Tower', realHeightM: 632, realWidthM: 66, source: '632 m' });
}

// ============================================================ Taipei 101 (508 m)
export function taipei101({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const W = 56;
  const sq = (w) => rectPts(w, w);
  // podium (the mall), 0..60
  add(g, loft([{ y: 0, pts: sq(86) }, { y: 56, pts: sq(66) }]), lmat(0xb8d4cc, { metal: 0.3, rough: 0.3 }), [0, 0, 0]);
  add(g, box(70, 5, 70), lmat(0xe0e6e2), [0, 58.5, 0]);
  // eight pagoda segments, each flaring outward ("ruyi" bell)
  const y0 = 61, segH = 48.5;
  for (let i = 0; i < 8; i++) {
    const ya = y0 + i * segH, yb = ya + segH;
    const bottom = i === 0 ? 50 : 44, top = 56 - i * 0.3;
    add(g, loft([{ y: ya, pts: sq(bottom) }, { y: yb, pts: sq(top) }]), GLASS(0x4fb4a6, { rough: 0.15 }), [0, 0, 0]);
    // floor bands and corner ruyi ornaments in gold
    const bandN = 8; for (let b = 1; b < bandN; b++) { const t = b / bandN, w = lerp(bottom, top, t); add(g, box(w + 0.5, 0.7, w + 0.5), lmat(0xbfe6dc, { metal: 0.3, rough: 0.4 }), [0, ya + segH * t, 0]); }
    add(g, box(top + 2.6, 2.4, top + 2.6), lmat(0xd9b24a, { metal: 0.7, rough: 0.3 }), [0, yb + 0.2, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, sph(2.2, 10, 8), lmat(0xe8c15a, { metal: 0.8, rough: 0.25 }), [sx * (top / 2 + 1.1), yb + 1.2, sz * (top / 2 + 1.1)], [0, 0, 0], [1, 0.7, 1]);
  }
  const topY = y0 + 8 * segH;            // ~449
  // crown: stepped taper then pinnacle to 508
  add(g, loft([{ y: topY, pts: sq(46) }, { y: topY + 14, pts: sq(34) }, { y: topY + 22, pts: sq(22) }]), GLASS(0x5fc0b2), [0, 0, 0]);
  add(g, cyl(5, 8, 20, 8), lmat(0xe8c15a, { metal: 0.7, rough: 0.3 }), [0, topY + 32, 0]);
  add(g, cyl(0.5, 4, 26, 8), lmat(0xd0d6dc, { metal: 0.8 }), [0, topY + 55, 0]);
  add(g, cyl(0.15, 0.5, 20, 6), lmat(0xd0d6dc, { metal: 0.8 }), [0, 498, 0]);
  blinker(g, A, 0, 509, 0, 0xff2a2a, 0.9, { period: 1.3 });
  // the sunrise light ring: a glowing band that climbs the pagoda
  const bandM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe9a0, emissiveIntensity: 0, roughness: 0.4 });
  const gl = []; for (let i = 0; i < 8; i++) { const mm = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bandM.clone()); mm.scale.set(top0(i) + 2.6, 1.0, top0(i) + 2.6); mm.position.y = y0 + (i + 1) * segH + 1.5; g.add(mm); gl.push(mm); }
  function top0(i) { return 56 - i * 0.3 + 0.2; }
  A.add((t) => { gl.forEach((mm, i) => { mm.material.emissiveIntensity = Math.max(0, Math.sin(t * 1.6 - i * 0.7)) * 3.2; }); });
  if (base) {
    cityGrid(g, A, { R: 520, pitch: 100, street: 18, seed: 77, hmin: 15, hmax: 80, clear: [[0, 0, 80, 80]], skew: 0.7, palette: [0xd8c4a4, 0xb0b8c0, 0xc9a98a, 0x9aa7b8] });
    patch(g, 130, 130, 0xe0d8c6, 0, 0.2, 0, { layer: 2 });
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; flagPole(g, A, Math.cos(a) * 95, 0.3, Math.sin(a) * 95, 22, 7, i % 2 ? FLAGS.taiwan : FLAGS.red, { phase: i, rotY: -a }); }
    trees(g, scatter(60, (r) => { const x = (r() - 0.5) * 260, z = (r() - 0.5) * 260; if (Math.abs(x) < 70 && Math.abs(z) < 70) return null; return [x, z]; }, 7), { size: 1.8, seed: 7 });
    makeCrowd(g, A, 50, { x: 0, z: 0, w: 120, d: 120 }, { seed: 4, scale: 1.3, y: 0.3, speed: 0.4 });
  }
  return finish(g, A, { name: 'Taipei 101', realHeightM: 508, realWidthM: 62, source: '508 m (1,667 ft)' });
}

// ============================================================ Petronas Towers (452 m) with Skybridge
export function petronasTowers({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const star = (s) => { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = (i % 2 ? 0.84 : 1.0) * 27 * s; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return pts; };
  const stage = [[0, 100, 1.0], [100, 170, 0.92], [170, 235, 0.82], [235, 295, 0.72], [295, 345, 0.6], [345, 375, 0.5], [375, 395, 0.42]];
  const one = (cx) => {
    const t = new THREE.Group(); t.position.x = cx; g.add(t);
    for (const [ya, yb, s] of stage) {
      shaft(t, () => star(s), ya, yb, { n: 1, glass: 0xaec0d0, bands: Math.round((yb - ya) / 4.5), bandCol: 0xe8ecf0, fr: 0.2, ex: 1.02, mt: { metal: 0.8, rough: 0.15 } });
      add(t, loft([{ y: yb - 1, pts: scalePts(star(s), 1.02) }, { y: yb + 0.6, pts: scalePts(star(s), 1.02) }], { cap: true }), lmat(0xdce2e8, { metal: 0.8, rough: 0.3 }));
    }
    // steel-sheathed pinnacle with ball and spike, up to 452
    add(t, cyl(9, 12, 14, 16), lmat(0xd8dee6, { metal: 0.8, rough: 0.2 }), [0, 402, 0]);
    add(t, cyl(5, 8, 24, 16), lmat(0xe0e6ec, { metal: 0.8, rough: 0.2 }), [0, 421, 0]);
    add(t, sph(4.2, 16, 12), lmat(0xf0f4f8, { metal: 0.9, rough: 0.15 }), [0, 432, 0]);
    add(t, cyl(0.2, 1.2, 22, 8), lmat(0xe8edf2, { metal: 0.8 }), [0, 443, 0]);
    blinker(t, A, 0, 453, 0, 0xff2a2a, 0.9, { period: 1.4, phase: cx > 0 ? 0.5 : 0 });
    return t;
  };
  one(-85); one(85);
  // double-decker Skybridge at 170 m with its two diagonal braces
  add(g, box(100, 8, 14), lmat(0xdfe5eb, { metal: 0.8, rough: 0.2 }), [0, 171, 0]);
  add(g, box(100.5, 2.5, 14.4), lmat(0x5a7a98, { metal: 0.5 }), [0, 171, 0]);
  for (const s of [-1, 1]) { beams(g, lmat(0xe8ecf0, { metal: 0.8, rough: 0.2 }), [[s * 24, 167, 0, s * 12, 168, 0, 6, 7]], {}); }
  const legs = []; for (const s of [-1, 1]) { legs.push([s * 28, 95, 0, s * 4, 168, 0, 3.4, 5]); legs.push([s * 28, 95, 0, s * 4, 168, 0, 3.4, 5]); }
  beams(g, lmat(0xe8ecf0, { metal: 0.8, rough: 0.2 }), legs);
  if (base) {
    slab(g, 600, 1, 0x86b86a, { y: -0.02 });
    add(g, box(260, 22, 130), lmat(0xd9d4c6, { rough: 0.7 }), [0, 11, 150]);   // Suria KLCC mall
    add(g, box(250, 2.2, 120), GLASS(0x78a8c8), [0, 23, 150]);
    // lake with animated fountain jets
    const lake = makeWater(260, 150, { seg: 20, amp: 0.2, color: 0x38a0cc, speed: 1.2 }); lake.position.set(0, 0.2, -190); g.add(lake);
    const jets = []; for (let i = 0; i < 12; i++) jets.push({ p: [-100 + i * 18, 0.3, -190 + Math.sin(i) * 20], s: [1, 1, 1] });
    const jm = instances(g, new THREE.CylinderGeometry(0.3, 0.5, 1, 8), lmat(0xe8f8ff, { rough: 0.2 }), jets), o = new THREE.Object3D();
    A.add((t) => { jets.forEach((j, i) => { const h = 6 + 9 * (0.5 + 0.5 * Math.sin(t * 1.8 + i)); o.position.set(j.p[0], 0.3 + h / 2, j.p[2]); o.scale.set(2, h, 2); o.updateMatrix(); jm.setMatrixAt(i, o.matrix); }); jm.instanceMatrix.needsUpdate = true; });
    const rr = rng(13), pts = []; for (let i = 0; i < 40; i++) { const a = rr() * TAU, d = 250 + rr() * 330; const h = 40 + rr() * rr() * 160, w = 28 + rr() * 22; pts.push({ p: [Math.cos(a) * d, h / 2, Math.sin(a) * d], s: [w, h, w], c: [0xb9cbd8, 0xd9d2c0, 0x9bb4c8, 0xc8d8e4][Math.floor(rr() * 4)] }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { metal: 0.25, rough: 0.4 }), pts);
    trees(g, scatter(90, (r) => { const a = r() * TAU, d = 130 + r() * 200; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.abs(x) < 120 && z > 60 && z < 230) return null; return [x, z]; }, 3), { size: 2.2, seed: 3, kinds: 'mix' });
    ring(g, 400, 430, COL.road, 0.3, { layer: 3 }); makeTraffic(g, A, 16, ringPath(0, 0, 415), TAU * 415, { speed: 16, scale: 1.8, y: 0.35, seed: 3 });
    makeCrowd(g, A, 60, { x: 0, z: 80, w: 260, d: 80 }, { seed: 6, scale: 1.7, y: 0.3, speed: 0.4 });
    for (let i = 0; i < 8; i++) flagPole(g, A, -90 + i * 26, 22.5, 90, 14, 5, i % 2 ? FLAGS.red : FLAGS.blue, { phase: i });
  }
  return finish(g, A, { name: 'Petronas Towers', realHeightM: 452, realWidthM: 175, source: '451.9 m; skybridge at 170 m' });
}
