// Landmarks pack: lattice / slender towers (Eiffel, Tokyo Tower, Skytree, CN Tower, Space Needle). 1 unit = 1 m.
import { THREE, rng, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade, clamp, lerp, smooth, TAU, COL, lmat, animator, finish, frac, ngon, rectPts, scalePts, loft, lathe, merge, xf, instances, beams, xBrace, flagPole, FLAGS, blinker, makeWater, makeCrowd, makeTraffic, ringPath, linePath, trees, scatter, slab, ring, disc, patch, plazaBase, cityGrid, makeBoats, boatMesh } from './landmarks_kit.js';

// piecewise log-linear interpolation through [y, v] control points
const interp = (pts) => (y) => { if (y <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const t = (y - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]); return Math.exp(lerp(Math.log(pts[i - 1][1]), Math.log(pts[i][1]), t)); } return pts[pts.length - 1][1]; };
const levels = (y0, y1, fn, lo, hi) => { const out = [y0]; let y = y0; while (y < y1 - 0.01) { y = Math.min(y1, y + clamp(fn(y), lo, hi)); out.push(y); } return out; };

// ============================================================ Eiffel Tower (330 m)
export function eiffelTower({ base = true, detail = 'high' } = {}) {
  const g = new THREE.Group(), A = animator();
  const hw = interp([[0, 62.5], [57, 34], [115, 21], [190, 11.5], [276, 6.2], [300, 3.4], [330, 0.8]]);
  const pw = (y) => Math.min(hw(y) * 0.92, interp([[0, 25], [57, 17], [115, 10], [190, 5], [276, 2.2], [300, 1.2], [330, 0.4]])(y));
  const iron = lmat(0x9a7152, { rough: 0.6, metal: 0.25 }), ironD = lmat(0x7a5638, { rough: 0.6, metal: 0.25 });
  const Ys = levels(0, 300, (y) => hw(y) * 0.42, 3.2, 10);
  const post = (y, sx, sz, a, b) => [sx * (hw(y) - a * pw(y)), y, sz * (hw(y) - b * pw(y))];
  const posts = [], braces = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) for (let i = 0; i < Ys.length - 1; i++) posts.push([...post(Ys[i], sx, sz, a, b), ...post(Ys[i + 1], sx, sz, a, b), clamp(hw(Ys[i]) * 0.045, 0.45, 2.2)]);
    // leg faces: outer-x, inner-x, outer-z, inner-z
    const faces = [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0], [1, 0]], [[0, 1], [1, 1]]];
    for (const [p, q] of faces) {
      const L = Ys.map((y) => post(y, sx, sz, p[0], p[1])), R = Ys.map((y) => post(y, sx, sz, q[0], q[1]));
      braces.push(...xBrace(L, R, clamp(hw(0) * 0.0, 0.3, 0.3) + 0.35, {}).map((b, k) => { const y = b[1]; b[6] = clamp(hw(y) * 0.022, 0.25, 0.9); return b; }));
    }
  }
  // panels between the four legs above the first floor (large X lattice), plus horizontal belts
  for (let side = 0; side < 4; side++) {
    const ry = side * Math.PI / 2, c = Math.cos(ry), s = Math.sin(ry);
    const Yp = levels(57, 276, (y) => hw(y) * 1.1, 8, 24);
    const pt = (y, u) => { const w = hw(y) - pw(y); return [c * u * w + s * hw(y) * 1 * 0 + s * (hw(y) - 0) , y, -s * u * w + c * (hw(y) - 0)]; };
    const L = Yp.map((y) => { const w = hw(y); return [c * (-(w - pw(y))) + s * w, y, -s * (-(w - pw(y))) + c * w]; });
    const R = Yp.map((y) => { const w = hw(y); return [c * ((w - pw(y))) + s * w, y, -s * ((w - pw(y))) + c * w]; });
    braces.push(...xBrace(L, R, 0.55, {}));
  }
  // the four great arches under the first floor
  const arches = [];
  for (let side = 0; side < 4; side++) {
    const ry = side * Math.PI / 2, c = Math.cos(ry), s = Math.sin(ry);
    const N = 22; let prev = null;
    for (let i = 0; i <= N; i++) {
      const a = Math.PI * i / N, wx = Math.cos(a) * (hw(8) - pw(8) * 0.9 - 2), wy = Math.sin(a) * 38 + 2;
      const w = hw(wy) * 0.0 + (hw(8) - 1);
      const cur = [c * wx + s * (hw(wy * 0.6) + 0.5), wy, -s * wx + c * (hw(wy * 0.6) + 0.5)];
      if (prev) { arches.push([...prev, ...cur, 3.0, 2.2]); }
      prev = cur;
    }
  }
  beams(g, iron, posts, { shadow: true }); beams(g, ironD, braces); beams(g, ironD, arches, { shadow: true });
  // platforms
  const plat = (y, w, h, k) => {
    add(g, box(w, h, w), lmat(0xd8c4a0, { rough: 0.7 }), [0, y, 0]);
    add(g, box(w - 4, k, w - 4), lmat(0x3a5a6c, { rough: 0.2, metal: 0.3 }), [0, y + h / 2 + k / 2, 0]);
    add(g, box(w + 2.5, 1.2, w + 2.5), lmat(0xc9b08a), [0, y + h / 2 + k + 0.6, 0]);
    add(g, box(w + 1.5, 1.6, w + 1.5), lmat(0x7a5638), [0, y - h / 2 - 0.8, 0]);
    // railing
    for (const s2 of [-1, 1]) { add(g, box(w + 2.6, 0.9, 0.25), lmat(0x5a3d28), [0, y + h / 2 + k + 1.7, s2 * (w + 2.5) / 2]); add(g, box(0.25, 0.9, w + 2.6), lmat(0x5a3d28), [s2 * (w + 2.5) / 2, y + h / 2 + k + 1.7, 0]); }
  };
  plat(57, 68, 5, 6); plat(115, 42, 4, 5); plat(276, 17, 5, 5);
  // the top: lantern, gallery, antenna
  add(g, cyl(3.6, 4.2, 9, 12), lmat(0xd8dfe6, { metal: 0.4, rough: 0.3 }), [0, 290.5 + 8, 0]);
  add(g, cyl(2.8, 3.4, 6, 12), lmat(0x4a6a80, { rough: 0.2 }), [0, 300, 0]);
  add(g, cone(3.0, 6, 12), lmat(0x9a7152), [0, 306, 0]);
  add(g, cyl(0.15, 0.7, 24, 6), lmat(0xc8cdd4, { metal: 0.7 }), [0, 318, 0]);
  // rotating beacon (twin beams) and blinking tip
  const beacon = new THREE.Group(); beacon.position.y = 309; g.add(beacon);
  for (const s of [-1, 1]) { const bm = add(beacon, cone(2.2, 38, 10), new THREE.MeshBasicMaterial({ color: 0xfff2b8, transparent: true, opacity: 0.28, depthWrite: false }), [s * 19, 0, 0], [0, 0, -s * Math.PI / 2]); bm.castShadow = false; }
  A.add((t) => { beacon.rotation.y = t * 1.2; });
  blinker(g, A, 0, 330.5, 0, 0xff3030, 0.7, { period: 1 });
  // sparkle bulbs (the hourly "champagne" twinkle) as instanced basic-material spheres
  const bulbs = []; const r = rng(5);
  for (const y of Ys.slice(2)) { for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const p = post(y, sx, sz, 0, 0); bulbs.push([p[0], p[1], p[2]]); } }
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), bulbs.length);
  const o = new THREE.Object3D(), cc = new THREE.Color(), ph = bulbs.map(() => r() * 10);
  bulbs.forEach((b, i) => { o.position.set(...b); o.scale.setScalar(1 + b[1] * 0.004); o.updateMatrix(); bm.setMatrixAt(i, o.matrix); });
  bm.frustumCulled = false; g.add(bm);
  A.add((t) => { bulbs.forEach((b, i) => { const k = Math.pow(Math.max(0, Math.sin(t * 5 + ph[i])), 8); bm.setColorAt(i, cc.setRGB(1, 0.9 - 0.2 * k, 0.5 + 0.5 * k).multiplyScalar(0.25 + 1.5 * k)); }); bm.instanceColor.needsUpdate = true; });
  // lifts creeping up the legs
  const lifts = [];
  for (const [sx, sz] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) { const c = add(g, rbox(3.2, 4, 3.2, 0.5), lmat(0xe53935, { rough: 0.4 }), [0, 0, 0]); lifts.push([c, sx, sz]); }
  A.add((t) => { lifts.forEach(([c, sx, sz], i) => { const u = (0.5 + 0.5 * Math.sin(t * 0.35 + i * 1.6)); const y = lerp(4, 112, u); const p = post(y, sx, sz, 0.5, 0.5); c.position.set(p[0] * 0.98, y, p[2] * 0.98); c.rotation.set(0, Math.atan2(sx, sz), 0); }); });
  // site: Champ de Mars, Seine, Pont d'Iena, Parisian blocks
  if (base) {
    const R = 650;
    slab(g, R, 0.8, 0xc9c0a8, { y: -0.01, layer: 1 });
    patch(g, 220, 700, 0x5cae4a, 0, 0.25, -380, { layer: 2 });            // Champ de Mars
    patch(g, 14, 700, 0xe0d2a8, 0, 0.35, -380, { layer: 3 }); patch(g, 220, 12, 0xe0d2a8, 0, 0.35, -380, { layer: 3 });
    patch(g, 170, 170, 0xe0d2a8, 0, 0.3, 0, { layer: 3 });
    const rr = rng(7), tp = [];
    for (let i = 0; i < 24; i++) for (const sx of [-1, 1]) { tp.push([sx * 104, -40 - i * 28]); tp.push([sx * 90, -40 - i * 28]); }
    trees(g, tp, { size: 1.8, seed: 7 });
    trees(g, scatter(40, (q) => [(q() - 0.5) * 190, -70 - q() * 600], 3), { size: 1.6, seed: 4 });
    // Seine
    const sn = makeWater(1300, 90, { seg: 40, amp: 0.3, color: 0x3a8cba, speed: 1.0, scale: 2 }); sn.position.set(0, 0.0, 215); g.add(sn);
    add(g, box(1300, 3, 14), lmat(0xd8d0b8), [0, 1, 150]); add(g, box(1300, 3, 14), lmat(0xd8d0b8), [0, 1, 282]);
    add(g, box(40, 3, 160), lmat(0xd2c6aa), [0, 2.0, 215], [0, Math.PI / 2, 0]);                   // Pont d'Iena deck
    for (const x of [-18, 18]) add(g, box(4, 14, 100), lmat(0xc9bd9e), [x * 0 + 0, 2, 215], [0, 0, 0]).position.set(x * 1.6, 1.5, 215);
    makeBoats(g, A, [
      { len: 32, color: 0xffffff, cabin: 0x3a6a9a, path: linePath(-520, 205, 520, 205, 0), length: 2080, u0: 0.1, speed: 6 },
      { len: 22, color: 0xe5483a, path: linePath(520, 230, -520, 230, 0), length: 2080, u0: 0.55, speed: 5 },
      { len: 16, color: 0xffffff, sail: true, path: linePath(-520, 195, 520, 195, 0), length: 2080, u0: 0.8, speed: 4 }], { y: 0.5 });
    // Haussmann blocks
    const bl = [], rf = [];
    for (let i = -6; i <= 6; i++) for (let j = 0; j < 4; j++) { const x = i * 85, z = 340 + j * 80; if (rr() < 0.15) continue; const h = 20 + rr() * 6; bl.push({ p: [x, h / 2, z], s: [72, h, 62], c: [0xe8dcc0, 0xdccfb2, 0xe2d6bc][Math.floor(rr() * 3)] }); rf.push({ p: [x, h + 4, z], s: [70, 8, 58], c: 0x5c6470 }); }
    for (let i = -3; i <= 3; i++) for (const sx of [-1, 1]) { const x = sx * (200 + Math.abs(i) * 0), z = -120 - Math.abs(i) * 90 - 20; const h = 22; bl.push({ p: [sx * 175, h / 2, i * 85 - 40], s: [50, h, 70], c: 0xe8dcc0 }); rf.push({ p: [sx * 175, h + 4, i * 85 - 40], s: [48, 8, 66], c: 0x5c6470 }); }
    instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.85 }), bl); instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.8 }), rf);
    ring(g, 300, 330, COL.road, 0.4, { layer: 4 });
    makeTraffic(g, A, 18, ringPath(0, 0, 315), TAU * 315, { speed: 14, scale: 1.8, y: 0.5, seed: 8 });
    makeCrowd(g, A, 90, { x: 0, z: 0, w: 150, d: 150 }, { seed: 4, scale: 1.8, y: 0.35, speed: 0.4 });
    makeCrowd(g, A, 50, { x: 0, z: -200, w: 130, d: 300 }, { seed: 14, scale: 1.8, y: 0.3, speed: 0.4 });
  }
  return finish(g, A, { name: 'Eiffel Tower', realHeightM: 330, realWidthM: 125, source: '330 m with antenna (324 m before 2022 antenna); platforms 57/115/276 m' });
}

// ============================================================ Tokyo Tower (333 m)
export function tokyoTower({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const hw = interp([[0, 40], [150, 14.5], [250, 6.5], [255, 2.8], [333, 1.2]]);
  const hwLin = (y) => (y <= 150 ? lerp(40, 14.5, y / 150) : y <= 250 ? lerp(14.5, 6.5, (y - 150) / 100) : lerp(2.2, 1.0, (y - 250) / 83));
  const bandOf = (y) => (y < 25 ? 0 : y < 50 ? 1 : y < 75 ? 0 : y < 100 ? 1 : y < 125 ? 0 : y < 150 ? 1 : y < 190 ? 0 : y < 230 ? 1 : y < 262 ? 0 : y < 285 ? 1 : y < 310 ? 0 : 1);
  const org = lmat(0xff5a1c, { rough: 0.5 }), wht = lmat(0xfdfaf2, { rough: 0.5 });
  const lists = [[], []];
  const Y = levels(0, 150, (y) => 14 + y * 0.03, 12, 20).concat(levels(150, 250, () => 14, 10, 16).slice(1), levels(250, 333, () => 18, 12, 20).slice(1));
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    for (let i = 0; i < Y.length - 1; i++) { const a = Y[i], b = Y[i + 1]; if (a < 250 && b > 250) continue; const w0 = (a < 250 ? hwLin(a) : hwLin(a)), w1 = hwLin(b > 250 && a < 250 ? 250 : b); const k = bandOf((a + b) / 2); lists[k].push([sx * w0, a, sz * w0, sx * w1, b, sz * w1, a < 250 ? 1.5 : 0.7]); }
  }
  for (let side = 0; side < 4; side++) {
    const ry = side * Math.PI / 2, c = Math.cos(ry), s = Math.sin(ry);
    const P = (y, u) => { const w = hwLin(y); return [c * u * w + s * w, y, -s * u * w + c * w]; };
    for (let i = 0; i < Y.length - 1; i++) {
      const a = Y[i], b = Y[i + 1]; if (a >= 250 - 1 && a < 255) continue; if (a < 250 && b > 250) continue; const k = bandOf((a + b) / 2), t = a < 250 ? 0.55 : 0.3;
      lists[k].push([...P(a, -1), ...P(b, 1), t], [...P(a, 1), ...P(b, -1), t], [...P(a, -1), ...P(a, 1), t]);
      if (a < 250) { const m = (u) => P((a + b) / 2, u); lists[k].push([...m(-1), ...m(1), t * 0.8]); }
    }
  }
  beams(g, org, lists[0], { shadow: true }); beams(g, wht, lists[1], { shadow: true });
  // decks
  const deck = (y, w, h, c) => { add(g, box(w, h, w), lmat(c, { rough: 0.5 }), [0, y, 0]); add(g, box(w - 3, h * 0.55, w - 3 + 0.4), lmat(0x4a6a80, { rough: 0.15, metal: 0.3 }), [0, y + 0.5, 0]); add(g, box(w + 1.5, 1.2, w + 1.5), lmat(0xfdfaf2), [0, y + h / 2 + 0.6, 0]); };
  deck(145, 37, 10, 0xff5a1c); deck(155, 33, 9, 0xfdfaf2); deck(250, 19, 10, 0xff5a1c);
  add(g, box(80, 34, 30), lmat(0xe6e2d6, { rough: 0.7 }), [0, 17, 0]);   // "FootTown" base
  add(g, box(82, 1.5, 32), lmat(0xff5a1c), [0, 34.7, 0]);
  // antenna: red/white banded mast
  for (let i = 0; i < 7; i++) add(g, cyl(1.0 - i * 0.1, 1.2 - i * 0.1, 12, 10), i % 2 ? wht : org, [0, 262 + i * 12 - 0.1 + 4, 0]);
  add(g, cyl(0.15, 0.7, 22, 6), lmat(0xffffff, { rough: 0.4 }), [0, 322, 0]);
  blinker(g, A, 0, 333, 0, 0xff2a2a, 0.9, { period: 1.2 });
  blinker(g, A, 0, 262, 0, 0xff2a2a, 0.9, { period: 1.2, phase: 0.3 });
  // koi-nobori style fish banners animating on the antenna mast? small flags
  for (let i = 0; i < 6; i++) flagPole(g, A, 40 + i * 3.8, 36.2, 14, 7, 3, FLAGS.japan, { phase: i * 0.9 });
  if (base) {
    cityGrid(g, A, { R: 520, pitch: 85, street: 16, seed: 41, hmin: 10, hmax: 45, clear: [[0, 0, 60, 45]], skew: 0.4, palette: [0xd8d0c0, 0xb8b8c0, 0xc8b8a8, 0x9aa7b8, 0xe0d8c8] });
    patch(g, 110, 80, 0x6dbb55, 0, 0.2, 0, { layer: 2 });
    trees(g, scatter(40, (q) => { const x = (q() - 0.5) * 220, z = (q() - 0.5) * 160; return Math.abs(x) < 52 && Math.abs(z) < 28 ? null : [x, z]; }, 2), { size: 1.4, seed: 2 });
    makeCrowd(g, A, 60, { x: 0, z: 30, w: 110, d: 40 }, { seed: 4, scale: 1.7, y: 0.3, speed: 0.4 });
  }
  return finish(g, A, { name: 'Tokyo Tower', realHeightM: 333, realWidthM: 80, source: '333 m; main deck 150 m, special deck 250 m' });
}

// ============================================================ Tokyo Skytree (634 m)
export function tokyoSkytree({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const col = lmat(0xdfe8f2, { rough: 0.4, metal: 0.4 }), colD = lmat(0xb8c8da, { rough: 0.4, metal: 0.4 });
  const rad = interp([[0, 42], [60, 30], [150, 19], [300, 12.5], [350, 11]]);
  const Y = levels(0, 350, (y) => 14 + y * 0.03, 12, 24);
  const post = (y, k) => { const a = k * TAU / 3 + Math.PI / 6 + y * 0.0, r = rad(y); return [Math.cos(a) * r, y, Math.sin(a) * r]; };
  const posts = [], br = [];
  for (let k = 0; k < 3; k++) for (let i = 0; i < Y.length - 1; i++) { posts.push([...post(Y[i], k), ...post(Y[i + 1], k), clamp(rad(Y[i]) * 0.14, 1.6, 4.0)]); }
  for (let k = 0; k < 3; k++) { const L = Y.map((y) => post(y, k)), R = Y.map((y) => post(y, (k + 1) % 3)); br.push(...xBrace(L, R, 0.9, {})); }
  beams(g, col, posts, { shadow: true, round: true }); beams(g, colD, br);
  // central concrete-and-steel core, then the Gain-tower steel mast
  add(g, cyl(5.5, 8, 360, 20), lmat(0xe8eef4, { rough: 0.5, metal: 0.3 }), [0, 180, 0]);
  add(g, cyl(5.2, 5.5, 140, 20), lmat(0xe8eef4, { rough: 0.5, metal: 0.3 }), [0, 430, 0]);
  add(g, cyl(2.4, 4.8, 80, 14), lmat(0xdce4ec, { metal: 0.6, rough: 0.35 }), [0, 540, 0]);
  add(g, cyl(0.5, 2.4, 80, 10), lmat(0xdce4ec, { metal: 0.7 }), [0, 620, 0]);
  add(g, cyl(0.12, 0.5, 20, 6), lmat(0xffffff), [0, 624, 0]);
  // observation decks (two flying-saucer doughnuts) with a ring of glass
  const deckGeo = lathe([[0.01, -6], [20, -6], [27, -3], [31, 0], [28, 4], [24, 6], [0.01, 6]], 40);
  add(g, deckGeo, lmat(0xdfe8f2, { metal: 0.4, rough: 0.3 }), [0, 340, 0]);
  add(g, lathe([[26.5, -2], [29.5, 0.5], [26, 4]], 40), lmat(0x4a8ab8, { rough: 0.1, metal: 0.3, side: THREE.DoubleSide }), [0, 340, 0]);
  add(g, lathe([[0.01, -4], [14, -4], [19, 0], [16, 3], [0.01, 3.5]], 36), lmat(0xdfe8f2, { metal: 0.4, rough: 0.3 }), [0, 450, 0]);
  add(g, lathe([[16, -1.5], [18.8, 0], [16, 2.5]], 36), lmat(0x4a8ab8, { rough: 0.1, metal: 0.3, side: THREE.DoubleSide }), [0, 450, 0]);
  // a lit ring pulsing blue/white (the "Iki" light pattern)
  const lightM = new THREE.MeshStandardMaterial({ color: 0x9ad8ff, emissive: 0x57b8ff, emissiveIntensity: 0.6, roughness: 0.4 });
  const lr = new THREE.Mesh(new THREE.TorusGeometry(24.8, 0.8, 8, 48), lightM); lr.rotation.x = Math.PI / 2; lr.position.y = 340; g.add(lr);
  A.add((t) => { lightM.emissiveIntensity = 0.8 + 1.4 * (0.5 + 0.5 * Math.sin(t * 2)); });
  blinker(g, A, 0, 634, 0, 0xff2a2a, 1.2, { period: 1.4 }); blinker(g, A, 0, 560, 0, 0xff2a2a, 1.0, { period: 1.4, phase: 0.4 });
  // elevator cab sliding up the core
  const cab = add(g, rbox(5, 8, 5, 1), lmat(0xffd23f, { rough: 0.4 }), [7, 10, 0]);
  A.add((t) => { cab.position.y = lerp(10, 340, 0.5 + 0.5 * Math.sin(t * 0.25)); });
  if (base) {
    cityGrid(g, A, { R: 560, pitch: 85, street: 16, seed: 91, hmin: 10, hmax: 40, clear: [[0, 0, 90, 90]], skew: 0.3, palette: [0xd8d0c0, 0xb8b8c0, 0xc8b8a8, 0x9aa7b8, 0xe0d8c8] });
    patch(g, 200, 200, 0xd8d0be, 0, 0.2, 0, { layer: 2 });
    add(g, box(140, 20, 60), lmat(0xe8e8ec, { rough: 0.5 }), [0, 10, 100]);     // Solamachi mall
    add(g, box(142, 2, 62), lmat(0x3a6a8c, { metal: 0.3 }), [0, 21, 100]);
    trees(g, scatter(50, (q) => { const x = (q() - 0.5) * 300, z = (q() - 0.5) * 300; return Math.abs(x) < 100 && Math.abs(z) < 100 ? null : [x, z]; }, 4), { size: 1.5, seed: 4 });
    const rv = makeWater(80, 1100, { seg: 12, amp: 0.2, color: 0x3a85b8, speed: 1.0, scale: 2 }); rv.position.set(-300, 0.1, 0); g.add(rv);
    makeBoats(g, A, [{ len: 22, color: 0xffffff, cabin: 0x4aa0e0, path: linePath(-296, -500, -296, 500, 8), length: 2000, u0: 0.2, speed: 6 }], { y: 0.3 });
    makeCrowd(g, A, 70, { x: 0, z: 0, w: 180, d: 180 }, { seed: 4, scale: 1.8, y: 0.3, speed: 0.4 });
  }
  return finish(g, A, { name: 'Tokyo Skytree', realHeightM: 634, realWidthM: 68, source: '634 m; decks at 350 and 450 m' });
}

// ============================================================ CN Tower (553 m)
export function cnTower({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const concrete = lmat(0xd7d6cf, { rough: 0.75 });
  const plan = (y) => { const t = clamp(y / 447), s = lerp(1, 0.28, Math.pow(t, 0.8)); const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, k = 0.62 + 0.38 * Math.pow(Math.abs(Math.cos(1.5 * a)), 1.2); pts.push([Math.cos(a) * 13 * s * (0.55 + k * 0.9), Math.sin(a) * 13 * s * (0.55 + k * 0.9)]); } return pts; };
  const rings = []; for (let i = 0; i <= 30; i++) { const y = 447 * i / 30; rings.push({ y, pts: plan(y) }); }
  add(g, loft(rings, { smooth: true }), concrete);
  // three tapering buttress fins at the base
  for (let k = 0; k < 3; k++) { const a = k * TAU / 3; const f = add(g, box(2.2, 190, 20), lmat(0xcfcec6, { rough: 0.75 }), [Math.cos(a) * 11, 95, Math.sin(a) * 11], [0, -a, 0]); f.scale.set(1, 1, 1); }
  add(g, cyl(30, 34, 8, 6), lmat(0xbcbab0), [0, 4, 0]);
  // main pod with rotating restaurant ring at 351 m, and glass-floor level at 342 m
  const pod = lathe([[0.01, 330], [8, 331], [18, 336], [23, 342], [25.5, 348], [25.5, 352], [24, 358], [17, 360], [10, 362], [0.01, 366]], 40);
  add(g, pod, lmat(0xd2d0c8, { rough: 0.6 }));
  add(g, lathe([[0.01, 366], [7, 367], [12, 370], [9, 376], [0.01, 380]], 28), lmat(0xd2d0c8, { rough: 0.6 }));
  add(g, lathe([[9, 376], [8, 378], [4, 380], [0.01, 381]], 20), lmat(0x4a8ab8, { metal: 0.4 }));
  const spin = new THREE.Group(); spin.position.y = 353; g.add(spin);
  const wins = []; for (let i = 0; i < 40; i++) wins.push({ p: [Math.cos(i / 40 * TAU) * 25.6, 0, Math.sin(i / 40 * TAU) * 25.6], r: [0, -i / 40 * TAU + Math.PI / 2, 0], s: [4, 4.2, 0.5], c: 0x7ec8f0 });
  instances(spin, box(1, 1, 1), lmat(0xffffff, { rough: 0.1, metal: 0.4, emissive: 0x153a55, ei: 0.5 }), wins);
  for (let i = 0; i < 10; i++) add(spin, sph(0.7, 6, 4), glow(0xffd88a, 1.5), [Math.cos(i / 10 * TAU) * 26.4, -2.5, Math.sin(i / 10 * TAU) * 26.4]);
  A.add((t) => { spin.rotation.y = t * 0.3; });
  // SkyPod (447 m) and the long antenna with beacons
  add(g, lathe([[0.01, 440], [5, 441], [8.5, 445], [9, 448], [7, 450], [0.01, 452]], 28), lmat(0xd2d0c8, { rough: 0.6 }));
  add(g, cyl(2.4, 4.2, 60, 14), lmat(0xe8e8e4, { rough: 0.5 }), [0, 480, 0]);
  add(g, cyl(0.9, 2.4, 60, 12), lmat(0xe8e8e4, { rough: 0.5 }), [0, 540, 0]);
  add(g, cyl(0.15, 0.9, 20, 8), lmat(0xffffff), [0, 576 - 20, 0]).scale.y = 0.6;
  for (let i = 0; i < 5; i++) blinker(g, A, 0, 470 + i * 20, 2 + i * 0.1 - 2, 0xff2a2a, 1.2, { period: 1.5, phase: i * 0.2, duty: 0.3 });
  blinker(g, A, 0, 553, 0, 0xff2a2a, 1.0, { period: 1.0 });
  // glass elevator cabs gliding up the outer face
  const lifts = [0, 1].map((i) => add(g, rbox(3, 4, 3, 0.8), lmat(0x9ad8ff, { rough: 0.1, metal: 0.3, emissive: 0x2a6a9a, ei: 0.5 }), [0, 0, 0]));
  A.add((t) => { lifts.forEach((c, i) => { const y = lerp(20, 335, 0.5 + 0.5 * Math.sin(t * 0.4 + i * Math.PI)); const s = lerp(1, 0.45, Math.pow(y / 447, 0.8)); const a = 0.9 + i * Math.PI; c.position.set(Math.cos(a) * 13 * s * 1.14, y, Math.sin(a) * 13 * s * 1.14); c.rotation.y = -a; }); });
  if (base) {
    slab(g, 700, 1, 0x8a8c92, { y: -0.02 });
    // Rogers Centre dome, rail lines and the lake
    const dome = add(g, lathe([[90, 0], [88, 20], [76, 45], [52, 65], [26, 76], [0.01, 78]], 40), lmat(0xe6e8ee, { rough: 0.5, metal: 0.2 }), [-210, 0, 150]);
    add(g, cyl(92, 94, 22, 40), lmat(0xbcc0c8), [-210, 11, 150]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; add(g, box(1.2, 70, 1.2), lmat(0x9aa0aa, { metal: 0.4 }), [-210 + Math.cos(a) * 44, 36, 150 + Math.sin(a) * 44], [0, 0, 0]).rotation.z = 0; }
    add(g, ring0(), lmat(0x4a8ab8, { metal: 0.3, rough: 0.2 }), [-210, 70, 150]);
    function ring0() { return tor(18, 2, 8, 30); }
    const lake = makeWater(1400, 400, { seg: 36, amp: 0.4, color: 0x2f7fb5, speed: 1.0, scale: 3 }); lake.position.set(0, 0.0, 560); g.add(lake);
    makeBoats(g, A, [
      { len: 40, color: 0xffffff, cabin: 0xe5483a, path: linePath(-600, 480, 600, 480, 0), length: 2400, u0: 0.2, speed: 7 },
      { len: 14, color: 0xffd23f, sail: true, path: linePath(600, 520, -600, 520, 0), length: 2400, u0: 0.6, speed: 4 },
      { len: 18, color: 0xe5483a, sail: true, path: linePath(-600, 600, 600, 600, 0), length: 2400, u0: 0.4, speed: 3.5 }], { y: 0.4 });
    cityGrid(g, A, { R: 640, pitch: 95, street: 17, seed: 61, hmin: 25, hmax: 160, clear: [[0, 0, 80, 80], [-210, 150, 110, 110], [0, 560, 800, 230]], skew: 0.3, palette: [0x9aa7b8, 0x8f9db0, 0xb8c4d0, 0x7a8aa0, 0xc7b8a0] });
    // railway with a moving train
    patch(g, 1300, 22, 0x4a4a52, 0, 0.35, 300, { layer: 3 });
    const train = []; for (let i = 0; i < 8; i++) train.push(add(g, rbox(18, 4.6, 3.2, 0.8), lmat(i === 0 ? 0xe5483a : 0xf4f0e8, { rough: 0.4 }), [0, 2.8, 300]));
    A.add((t) => { train.forEach((c, i) => { c.position.x = ((frac(t * 0.035 - i * 0.0155) * 1500) - 750); }); });
    trees(g, scatter(50, (q) => { const x = (q() - 0.5) * 360, z = (q() - 0.5) * 360; return Math.abs(x) < 60 && Math.abs(z) < 60 ? null : [x, z]; }, 3), { size: 2.2, seed: 3 });
    makeCrowd(g, A, 60, { x: 0, z: 0, w: 130, d: 130 }, { seed: 4, scale: 1.8, y: 0.3, speed: 0.4 });
  }
  return finish(g, A, { name: 'CN Tower', realHeightM: 553, realWidthM: 60, source: '553.3 m; pod ~351 m, SkyPod 447 m' });
}

// ============================================================ Space Needle (184 m)
export function spaceNeedle({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const white = lmat(0xf6f4ee, { rough: 0.4 }), orange = lmat(0xe8742a, { rough: 0.4 });
  const r = interp([[0, 14], [60, 5.8], [88, 5.0], [118, 7.4], [150, 10.4]]);
  const legs = [], braces = [];
  const Y = levels(0, 150, () => 8, 6, 8);
  const pt = (k, y, dr = 0) => { const a = k * TAU / 3 + Math.PI / 2; return [Math.cos(a) * (r(y) + dr), y, Math.sin(a) * (r(y) + dr)]; };
  for (let k = 0; k < 3; k++) for (let i = 0; i < Y.length - 1; i++) { legs.push([...pt(k, Y[i]), ...pt(k, Y[i + 1]), 2.2, 4.0]); }
  for (let k = 0; k < 3; k++) { const a = Y.map((y) => pt(k, y)), b = Y.map((y) => pt((k + 1) % 3, y)); braces.push(...xBrace(a, b, 0.5, { diag: true }).filter((_, i) => i % 3 !== 2 || i % 2 === 0)); }
  beams(g, white, legs, { shadow: true }); beams(g, white, braces);
  add(g, cyl(3.2, 3.2, 150, 14), lmat(0xe8e8e4, { rough: 0.5 }), [0, 75, 0]);
  // halo + saucer top house
  add(g, lathe([[0.01, 138], [18, 140], [22, 143], [23, 147], [22, 150], [0.01, 150]], 40), orange);                        // halo disc underside
  add(g, lathe([[0.01, 150], [20.5, 150], [21.5, 153], [21, 160], [18, 166], [10, 170], [0.01, 171]], 40), lmat(0xe9e6dc, { rough: 0.35, metal: 0.2 }));
  add(g, lathe([[21.1, 152.5], [21.8, 156], [21.1, 160]], 40), lmat(0x4a7fa0, { rough: 0.1, metal: 0.4, side: THREE.DoubleSide }));
  add(g, tor(23.5, 0.9, 8, 48), orange, [0, 150.5, 0], [Math.PI / 2, 0, 0]);
  add(g, cone(10, 8, 24), lmat(0xe9e6dc), [0, 173, 0]);
  add(g, cyl(0.2, 1.6, 15, 8), white, [0, 184 - 7.5, 0]);
  add(g, cyl(0.1, 0.2, 4, 6), white, [0, 184, 0]);
  // rotating loupe ring + moving elevator + blinking beacon
  const loupe = new THREE.Group(); loupe.position.y = 146; g.add(loupe);
  for (let i = 0; i < 24; i++) add(loupe, box(2.6, 3.4, 0.5), lmat(0x7ec8f0, { rough: 0.1, emissive: 0x153a55, ei: 0.4 }), [Math.cos(i / 24 * TAU) * 22.6, 0, Math.sin(i / 24 * TAU) * 22.6], [0, -i / 24 * TAU + Math.PI / 2, 0]);
  A.add((t) => { loupe.rotation.y = t * 0.2; });
  const cab = add(g, rbox(3.2, 5, 3.2, 1), lmat(0x9ad8ff, { rough: 0.1, metal: 0.3 }), [4.6, 0, 0]);
  A.add((t) => { cab.position.y = lerp(4, 140, 0.5 + 0.5 * Math.sin(t * 0.5)); });
  blinker(g, A, 0, 185, 0, 0xff2a2a, 0.7, { period: 1.2 });
  if (base) {
    slab(g, 330, 0.6, 0x7fbf5f, { y: -0.01 });
    // Seattle Center: fountain with jets, monorail, Science Center arches, tree belt
    disc(g, 52, 0xd8d0be, 0.25, { layer: 2 }); disc(g, 26, 0x4a9ac8, 0.35, { layer: 3 });
    const jets = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; jets.push({ a, rr: 8 + (i % 2) * 10 }); }
    const jm = instances(g, new THREE.CylinderGeometry(0.2, 0.35, 1, 6), lmat(0xe8f8ff, { rough: 0.2 }), jets.map(() => ({ p: [0, 1, 0] }))); const o = new THREE.Object3D();
    const fc = [90, 0, 80];
    A.add((t) => { jets.forEach((j, i) => { const h = 3 + 6 * (0.5 + 0.5 * Math.sin(t * 2.2 + i)); o.position.set(Math.cos(j.a) * j.rr, 0.4 + h / 2, Math.sin(j.a) * j.rr); o.scale.set(1, h, 1); o.updateMatrix(); jm.setMatrixAt(i, o.matrix); }); jm.instanceMatrix.needsUpdate = true; });
    const rail = new THREE.Group(); g.add(rail);
    add(g, box(520, 1.2, 3.2), lmat(0xb8b8c0), [0, 9, -120]); for (let x = -250; x <= 250; x += 25) add(g, cyl(0.8, 1, 9, 6), lmat(0xb8b8c0), [x, 4.5, -120]);
    const mono = []; for (let i = 0; i < 4; i++) mono.push(add(g, rbox(9, 3.2, 3.2, 1), lmat(i === 0 ? 0xe53935 : 0xf4f0e8, { rough: 0.35 }), [0, 11, -120]));
    A.add((t) => { mono.forEach((c, i) => { c.position.x = Math.sin(t * 0.18) * 180 - i * 9.5 * Math.sign(Math.cos(t * 0.18)); }); });
    for (let i = 0; i < 5; i++) add(g, cyl(1.5, 2, 24, 6), lmat(0xf6f4ee), [140 + i * 12, 12, 70], [0, 0, (i - 2) * 0.12]);
    trees(g, scatter(80, (q) => { const a = q() * TAU, d = 70 + q() * 230; const x = Math.cos(a) * d, z = Math.sin(a) * d; return Math.abs(z + 120) < 14 ? null : [x, z]; }, 8), { size: 2.2, seed: 8, kinds: 'mix' });
    cityGrid(g, A, { R: 640, pitch: 90, street: 16, seed: 29, hmin: 14, hmax: 90, clear: [[0, 0, 330, 330]], skew: 0.2, palette: [0xc9a98a, 0xb0b8c0, 0xd8c4a4, 0x9aa7b8] });
    makeCrowd(g, A, 90, { x: 0, z: 0, r: 60 }, { seed: 4, scale: 1.8, y: 0.3, speed: 0.4 });
    makeTraffic(g, A, 12, ringPath(0, 0, 200), TAU * 200, { speed: 12, scale: 1.8, y: 0.2, seed: 5 }); ring(g, 190, 210, COL.road, 0.15, { layer: 3 });
  }
  return finish(g, A, { name: 'Space Needle', realHeightM: 184, realWidthM: 41, source: '184 m (605 ft)' });
}
