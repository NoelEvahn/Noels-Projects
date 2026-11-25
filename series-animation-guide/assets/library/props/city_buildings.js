// City pack: everyday building archetypes at real scale (1 unit = 1 m), facing +Z, origin = centre of the footprint at street level.
// Detail is geometry: instanced framed windows (some lit, some flicker), ledges, cornices, balconies, AC units, water tanks, antennas,
// awnings, readable signs. Each returns a Group with userData.update(t), userData.realHeightM/realWidthM/realDepthM and userData.footprint.
// Options common to all: { seed, lod: 'high' | 'low', sidewalk: true }.
import * as THREE from 'three';
import {
  Batch, PAL, anim, meta, signMesh, makeWindows, facadeWindows, ledges, parapet, acUnit, waterTank, antenna, roofKit, awning, fireEscape, treeParts, pavement,
  rng, shade, lerp, TAU, fract, gBox, gCyl, gSph, gPlane, lampMesh, halo, flag, turbineVent, inst, mat, smooth, clamp,
} from './city_kit.js';

export function newB(seed, lod) { const g = new THREE.Group(); return { g, b: new Batch(), A: anim(g), rnd: rng(seed), wins: [], extra: [], lod, hi: lod === 'high' }; }
export function fin(S, { h, w, d, name, win = {}, fp }) {
  S.b.build(S.g);
  if (S.wins.length) S.A.add(makeWindows(S.wins, { lod: S.lod, ...win }));
  for (const e of S.extra) S.A.add(e);
  meta(S.g, { h, w, d, name }); S.g.userData.footprint = fp ?? { w, d };
  return S.g;
}
// curtain-wall panes (glass quads between spandrel bands) on all four faces. out: window list
export function curtainWindows(out, { cx = 0, cz = 0, w, d, y0 = 0, floors, fh = 3.9, colW = 2.4, band = 1.0, rnd, lit = 0.2, faces = 'FBLR', lo = 0x5a93c0, hi = 0xa6d6f0, from = 0 }) {
  const H = floors * fh;
  for (const f of faces) {
    const span = f === 'F' || f === 'B' ? w : d, cols = Math.max(1, Math.round(span / colW)), pw = span / cols;
    for (let fl = from; fl < floors; fl++) for (let c = 0; c < cols; c++) {
      const u = -span / 2 + pw * (c + 0.5), y = y0 + fl * fh + band + (fh - band) / 2;
      const e = { y, w: pw - 0.2, h: fh - band - 0.08, lit: rnd() < lit ? (rnd() < 0.15 ? 2 : 1) : 0, c: new THREE.Color(lo).lerp(new THREE.Color(hi), clamp((fl / floors) * 0.8 + rnd() * 0.25)).getHex() };
      if (f === 'F') Object.assign(e, { x: cx + u, z: cz + d / 2, ry: 0 });
      else if (f === 'B') Object.assign(e, { x: cx - u, z: cz - d / 2, ry: Math.PI });
      else if (f === 'R') Object.assign(e, { x: cx + w / 2, z: cz - u, ry: Math.PI / 2 });
      else Object.assign(e, { x: cx - w / 2, z: cz + u, ry: -Math.PI / 2 });
      out.push(e);
    }
  }
}
function curtainFrame(b, { cx = 0, cz = 0, w, d, y0, floors, fh, colW = 2.4, band = 1.0, bandC = 0xcfd6df, mullC = 0xaab3bf }) {
  const H = floors * fh;
  for (let f = 0; f < floors; f++) b.box(w + 0.16, band, d + 0.16, bandC, [cx, y0 + f * fh + band / 2, cz], { metal: 0.3, rough: 0.5 });
  for (const f of 'FBLR') {
    const span = f === 'F' || f === 'B' ? w : d, cols = Math.max(1, Math.round(span / colW));
    for (let k = 0; k <= cols; k++) {
      const u = -span / 2 + (span / cols) * k;
      const p = f === 'F' ? [cx + u, cz + d / 2 + 0.04] : f === 'B' ? [cx + u, cz - d / 2 - 0.04] : f === 'R' ? [cx + w / 2 + 0.04, cz + u] : [cx - w / 2 - 0.04, cz + u];
      b.box(0.16, H, 0.16, mullC, [p[0], y0 + H / 2, p[1]], { metal: 0.3, rough: 0.5 });
    }
  }
}
// entrance portal: canopy on slim columns, lit lobby back wall, revolving door (spins in update). returns nothing; pushes animated group
function lobbyPortal(S, { x = 0, z, w = 5, h = 4.2, glassC = 0x3d5f82 }) {
  const { b } = S;
  b.box(w + 0.8, 0.3, 2.4, 0xf2f0ea, [x, h + 0.35, z + 1.2]);
  b.box(w + 0.8, 0.12, 2.4, 0x2c3140, [x, h + 0.14, z + 1.2]);
  for (const s of [-1, 1]) b.cyl(0.12, 0.12, h + 0.1, 8, 0xc9ced6, [x + s * (w / 2 + 0.2), (h + 0.1) / 2, z + 2.1], { metal: 0.5, rough: 0.3 });
  b.box(w, h, 0.1, 0xffe3a6, [x, h / 2, z + 0.06], { glow: true });
  for (const s of [-1, 1]) b.box(0.12, h, 1.9, glassC, [x + s * (w / 2), h / 2, z + 0.98], { metal: 0.3, rough: 0.2 });
  b.box(w, 0.1, 0.1, 0x6a7380, [x, 0.05, z + 1.9]);
  const rev = new THREE.Group(); rev.position.set(x, 0, z + 1.1);
  const rb = new Batch();
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; rb.box(0.06, h * 0.55, 1.0, 0xd8e8f4, [Math.cos(a) * 0.5, h * 0.27 + 0.1, Math.sin(a) * 0.5], { r: [0, -a + Math.PI / 2, 0], metal: 0.4, rough: 0.15 }); }
  rb.cyl(0.07, 0.07, h * 0.55, 8, 0x6a7380, [0, h * 0.27 + 0.1, 0]);
  rb.build(rev);
  b.cyl(1.1, 1.1, 0.08, 20, 0x6a7380, [x, h * 0.55 + 0.4, z + 1.1], { metal: 0.4 });
  S.A.on((t) => { rev.rotation.y = t * 0.7; });
  S.g.add(rev);
}

// ---------------------------------------------------------------- 1. brownstone row house
export function brownstone({ w = 6.6, d = 13, floors = 3, seed = 1, color = 0x8f5242, lod = 'high', sidewalk = true } = {}) {
  const S = newB(seed, lod), { b, rnd, wins, g, hi } = S;
  const baseH = 2.8, fh = 3.5, H = baseH + floors * fh, trim = PAL.cream, stone = shade(color, 0.78);
  if (sidewalk) pavement(b, { cx: 0, z0: d / 2 + 2.6, w: w + 1, d: 3.2 });
  b.box(w, baseH, d, stone, [0, baseH / 2, 0]); b.box(w, floors * fh, d, color, [0, baseH + floors * fh / 2, 0]);
  b.box(w + 0.24, 0.24, d + 0.24, trim, [0, baseH, 0]);
  if (hi) {
    for (let y = 0.35; y < baseH; y += 0.38) b.box(w + 0.02, 0.05, 0.03, shade(stone, 0.55), [0, y, d / 2]);
    for (let y = baseH + 0.5; y < H - 0.3; y += 0.5) { b.box(w + 0.01, 0.035, 0.025, shade(color, 0.86), [0, y, d / 2]); b.box(0.025, 0.035, d + 0.01, shade(color, 0.86), [w / 2, y, 0]); b.box(0.025, 0.035, d + 0.01, shade(color, 0.86), [-w / 2, y, 0]); }
  }
  // stoop with rails (door on the left, up the 2.8 m basement)
  const dx = -w * 0.25, steps = 8, rise = baseH / (steps + 1), tread = 0.34;
  b.box(2.3, 0.2, 1.2, stone, [dx, baseH - 0.1, d / 2 + 0.6]);
  for (let i = 0; i < steps; i++) { const top = baseH - (i + 1) * rise; b.box(2.3, top, tread, i % 2 ? stone : shade(stone, 1.08), [dx, top / 2, d / 2 + 1.2 + i * tread + tread / 2]); }
  const zEnd = d / 2 + 1.2 + steps * tread;
  for (const s of [-1, 1]) {
    const xx = dx + s * 1.05;
    b.bar([xx, 0.9, zEnd], [xx, baseH + 0.95, d / 2 + 1.2], 0.06, 0x20262e, { metal: 0.4 });
    b.bar([xx, 0.45, zEnd], [xx, baseH + 0.5, d / 2 + 1.2], 0.04, 0x20262e, { metal: 0.4 });
    for (let i = 0; i <= 7; i++) { const u = i / 7, y0 = lerp(0.45, baseH + 0.5, u), y1 = lerp(0.9, baseH + 0.95, u); b.box(0.03, y1 - y0, 0.03, 0x20262e, [xx, (y0 + y1) / 2, lerp(zEnd, d / 2 + 1.2, u)]); }
    b.sph(0.07, 0x20262e, [xx, 1.0, zEnd]); b.sph(0.07, 0x20262e, [xx, baseH + 1.05, d / 2 + 1.1]);
  }
  // front door, frame, transom lamp
  b.box(1.9, 3.2, 0.3, trim, [dx, baseH + 1.6, d / 2 + 0.1]);
  b.box(1.35, 2.55, 0.2, rnd() < 0.5 ? 0x7a2a2a : 0x1f5f5a, [dx, baseH + 1.28, d / 2 + 0.15]);
  b.box(1.1, 0.5, 0.05, 0xffe2a0, [dx, baseH + 2.85, d / 2 + 0.27], { glow: true });
  b.sph(0.05, 0xf0c64a, [dx + 0.45, baseH + 1.2, d / 2 + 0.29], { metal: 0.7, rough: 0.3 });
  b.box(2.3, 0.2, 0.5, trim, [dx, baseH + 3.3, d / 2 + 0.2]);
  b.sph(0.13, 0xfff0b0, [dx + 1.2, baseH + 2.5, d / 2 + 0.3], { glow: true });
  // basement door + barred windows
  b.box(1.0, 1.9, 0.12, 0x2a3038, [dx, 0.95, d / 2 + 0.05]);
  wins.push({ x: w * 0.25, y: 1.6, z: d / 2, ry: 0, w: 1.0, h: 1.1, lit: rnd() < 0.5 ? 1 : 0 });
  for (let i = -2; i <= 2; i++) b.box(0.03, 1.2, 0.04, 0x20262e, [w * 0.25 + i * 0.2, 1.6, d / 2 + 0.12]);
  // front windows per floor
  for (let f = 0; f < floors; f++) {
    const y = baseH + f * fh + (f === 0 ? 1.45 : 1.6), hh = f === 0 ? 2.5 : 2.2;
    for (const x of f === 0 ? [w * 0.27] : [-w * 0.25, w * 0.25]) {
      wins.push({ x, y, z: d / 2, ry: 0, w: 1.2, h: hh, lit: rnd() < 0.35 ? (rnd() < 0.25 ? 2 : 1) : 0 });
      b.box(1.8, 0.26, 0.38, trim, [x, y + hh / 2 + 0.28, d / 2 + 0.1]);
      if (f > 0) b.profile([[-0.75, 0], [0.75, 0], [0, 0.42]], 0.3, 0.02, trim, [x, y + hh / 2 + 0.42, d / 2 + 0.05]);
    }
  }
  // window boxes + A/C unit + fire escape
  if (hi) {
    for (const x of [-w * 0.25, w * 0.25]) {
      const y = baseH + fh + 0.65; b.box(1.5, 0.28, 0.4, 0x2f6f4a, [x, y, d / 2 + 0.3]);
      for (let i = 0; i < 6; i++) b.sph(0.13, [0xff5c8a, 0xffd23f, 0xffffff, 0xb07aff][i % 4], [x - 0.6 + i * 0.24, y + 0.24, d / 2 + 0.3 + (i % 2 ? 0.06 : -0.06)], { w: 7, h: 5 });
    }
    acUnit(b, -w * 0.25, baseH + 2 * fh + 0.85, d / 2 + 0.3, 0, 1.0);
    fireEscape(b, { x: w * 0.25, z: d / 2 + 0.25, y0: baseH + 2 * fh + 0.4, levels: Math.max(1, floors - 2), fh });
  }
  // sides + back
  facadeWindows(wins, { cx: 0, cz: 0, w, d, y0: baseH, floors, fh, ww: 1.1, wh: 1.7, sill: 0.9, gapX: 3.2, gapZ: 3.4, faces: 'BLR', rnd, lit: 0.3, margin: 1.5 });
  // cornice with corbels, parapet, roof kit
  b.box(w + 0.9, 0.5, d + 0.9, trim, [0, H + 0.25, 0]); b.box(w + 1.1, 0.12, d + 1.1, shade(trim, 0.85), [0, H + 0.56, 0]);
  for (let i = 0; i < Math.floor(w / 0.55); i++) b.box(0.26, 0.45, 0.38, shade(trim, 0.92), [-w / 2 + 0.4 + i * 0.55, H - 0.2, d / 2 + 0.2]);
  parapet(b, { w: w + 0.5, d: d + 0.5, y: H + 0.62, h: 0.5, color: color, th: 0.25 });
  roofKit(b, rnd, { cx: 0, cz: 0, w, d, y: H + 0.62, acs: 2, tank: true, antenna: true, vents: 2 });
  for (const x of [-w * 0.32, w * 0.32]) { b.box(0.7, 1.3, 0.7, PAL.brickDark, [x, H + 1.3, -d * 0.3]); b.box(0.85, 0.12, 0.85, 0x6b6660, [x, H + 2.0, -d * 0.3]); }
  // hanging street banner on a bracket (waves)
  b.bar([w / 2 - 0.05, baseH + 2 * fh + 1.8, d / 2 + 0.05], [w / 2 - 0.05, baseH + 2 * fh + 1.8, d / 2 + 1.7], 0.07, 0x20262e, { metal: 0.4 });
  const fl = flag(1.3, 0.8, [0xd9392f, 0xf6c235, 0x2f6fd6]); fl.rotation.y = -Math.PI / 2; fl.position.set(w / 2 - 0.05, baseH + 2 * fh + 1.35, d / 2 + 0.3); S.g.add(fl); S.A.on(fl.userData.update);
  return fin(S, { h: H + 0.6, w, d: d + 2.6 + 3.2, name: 'brownstone', fp: { w, d } });
}

// ---------------------------------------------------------------- 2. glass office tower
export function officeTower({ w = 22, d = 22, floors = 24, fh = 3.9, seed = 3, lod = 'low', sidewalk = true, name = 'NOVA', tint = 0x5a93c0 } = {}) {
  const S = newB(seed, lod), { b, rnd, g } = S;
  const podH = 12.6, podW = w + 10, podD = d + 6, towerH = floors * fh, hi = lod === 'high';
  if (sidewalk) pavement(b, { w: podW + 2, z0: podD / 2 + 2.4, d: 3.4 });
  b.box(podW, podH, podD, 0xd9d4ca, [0, podH / 2, 0]);
  b.box(podW + 0.5, 0.45, podD + 0.5, 0xb7b2a6, [0, podH + 0.22, 0]);
  for (let i = 1; i <= 3; i++) b.box(podW + 0.2, 0.16, podD + 0.2, 0xbab5aa, [0, i * 4.2 - 0.08, 0]);
  const pod = []; // podium windows (always high detail)
  facadeWindows(pod, { w: podW, d: podD, y0: 0, floors: 1, fh: 4.2, ww: 3.4, wh: 3.4, sill: 0.4, gapX: 4.6, faces: 'FBLR', rnd, lit: 0.9, margin: 2.5, gapZ: 4.6 });
  facadeWindows(pod, { w: podW, d: podD, y0: 0, floors: 3, fh: 4.2, ww: 2.6, wh: 2.2, sill: 1.3, gapX: 3.7, faces: 'FBLR', skip: 1, rnd, lit: 0.45, margin: 2.5, gapZ: 3.7 });
  const keep = pod.filter((e) => !(e.ry === 0 && e.y < 4 && Math.abs(e.x) < 3.6));
  S.extra.push(makeWindows(keep, { lod: 'high' }));
  lobbyPortal(S, { z: podD / 2, w: 5.2, h: 4.2 });
  b.box(podW * 0.62, 1.1, 0.12, 0x2c3140, [0, 6.3, podD / 2 + 0.07]);
  // tower
  const y0 = podH + 0.45;
  b.box(w, towerH, d, 0x34506e, [0, y0 + towerH / 2, 0], { rough: 0.3, metal: 0.3 });
  curtainFrame(b, { w, d, y0, floors, fh, colW: 2.4 });
  const tw = []; curtainWindows(tw, { w, d, y0, floors, fh, colW: 2.4, rnd, lit: 0.22, lo: tint, hi: 0xaedcf4 });
  S.extra.push(makeWindows(tw, { lod: 'low' }));
  // mechanical crown + louvres + sign
  const topY = y0 + towerH;
  b.box(w * 0.74, 5, d * 0.74, 0xaeb7c3, [0, topY + 2.5, 0], { metal: 0.3, rough: 0.5 });
  for (let i = 0; i < 14; i++) for (const s of [-1, 1]) { b.box(0.12, 4, 0.2, 0x4a5563, [(-6.5 + i) * w * 0.74 / 14 * 1.0, topY + 2.5, s * (d * 0.37 + 0.1)]); }
  b.box(w * 0.5, 2.6, d * 0.5, 0x8b94a2, [0, topY + 6.3, 0]); b.box(w * 0.54, 0.3, d * 0.54, 0xdfe3ea, [0, topY + 7.7, 0]);
  const sgn = signMesh(name, w * 0.62, 3, { bg: '#0c1a33', fg: '#79e6ff', border: '#79e6ff', weight: 400 });
  sgn.position.set(0, topY + 2.6, d * 0.37 + 0.18); g.add(sgn);
  const sgn2 = signMesh(name, w * 0.62, 3, { bg: '#0c1a33', fg: '#79e6ff', border: '#79e6ff' }); sgn2.rotation.y = Math.PI; sgn2.position.set(0, topY + 2.6, -d * 0.37 - 0.18); g.add(sgn2);
  const sgn3 = signMesh(name, d * 0.62, 3, { bg: '#0c1a33', fg: '#79e6ff', border: '#79e6ff' }); sgn3.rotation.y = Math.PI / 2; sgn3.position.set(w * 0.37 + 0.18, topY + 2.6, 0); g.add(sgn3);
  const sgn4 = signMesh(name, d * 0.62, 3, { bg: '#0c1a33', fg: '#79e6ff', border: '#79e6ff' }); sgn4.rotation.y = -Math.PI / 2; sgn4.position.set(-w * 0.37 - 0.18, topY + 2.6, 0); g.add(sgn4);
  roofKit(b, rnd, { cx: 0, cz: 0, w: w * 0.5, d: d * 0.5, y: topY + 7.85, acs: 2, bulkhead: false, vents: 1 });
  const mastH = 16; b.cyl(0.12, 0.35, mastH, 8, 0xdfe3ea, [0, topY + 7.85 + mastH / 2, 0], { metal: 0.5, rough: 0.3 });
  for (let i = 1; i < 4; i++) b.box(2.2 - i * 0.4, 0.1, 0.1, 0xdfe3ea, [0, topY + 7.85 + i * 3.2, 0]);
  const beacon = lampMesh(gSph(0.4, 10, 8), 0xff3030); beacon.position.set(0, topY + 7.85 + mastH + 0.3, 0); g.add(beacon);
  const bh = halo(0xff3030, 1.3, 0.3); bh.position.copy(beacon.position); g.add(bh);
  S.A.on((t) => { const k = fract(t / 1.8) < 0.22 ? 1 : 0.12; beacon.material.userData.set(k * 1.2); bh.material.opacity = 0.32 * k; bh.visible = k > 0.5; });
  // window-washer gondola that crawls up and down the front
  const gon = new THREE.Group(), gb = new Batch();
  gb.box(6.4, 0.25, 1.3, 0xe8e2d0, [0, 0, 0.65]); gb.box(6.4, 1.0, 0.06, 0xf6c235, [0, 0.55, 1.28]); gb.box(0.06, 1.0, 1.3, 0xf6c235, [-3.17, 0.55, 0.65]); gb.box(0.06, 1.0, 1.3, 0xf6c235, [3.17, 0.55, 0.65]);
  for (const x of [-2.2, 1.4]) { gb.cyl(0.17, 0.17, 0.9, 8, x < 0 ? 0xd9392f : 0x2f6fd6, [x, 0.7, 0.65]); gb.sph(0.2, 0xf2b98f, [x, 1.35, 0.65]); gb.sph(0.22, 0xf6c235, [x, 1.5, 0.65], { h: 5 }); gb.box(0.7, 0.05, 0.3, 0x9aa1ab, [x + 0.5, 0.95, 0.9]); }
  gb.build(gon); gon.position.set(w * 0.2, 0, d / 2 + 0.2); g.add(gon);
  const cab = []; for (const x of [-2.9, 2.9]) { const c = new THREE.Mesh(gBox(0.05, 1, 0.05), mat(0x2c3140)); c.position.set(w * 0.2 + x, 0, d / 2 + 0.85); g.add(c); cab.push(c); }
  S.A.on((t) => { const k = 0.5 + 0.5 * Math.sin(t * 0.35 - 1.2), y = y0 + 6 + k * (towerH - 12); gon.position.y = y; for (const c of cab) { c.scale.y = topY - y; c.position.y = (topY + y) / 2; } });
  return fin(S, { h: topY + 7.85 + mastH + 0.6, w: podW, d: podD, name: 'officeTower', fp: { w: podW, d: podD } });
}

// ---------------------------------------------------------------- 3. apartment block with balconies
export function apartmentBlock({ w = 30, d = 13, floors = 8, seed = 2, color = 0xe9b77c, accent = 0x2f8f8f, lod = 'high', sidewalk = true } = {}) {
  const S = newB(seed, lod), { b, rnd, wins, hi } = S;
  const fh = 3.2, gh = 5.0, H = gh + floors * fh, bayW = 3.75, bays = Math.floor((w - 4.2) / bayW);
  if (sidewalk) pavement(b, { w: w + 1, z0: d / 2 + 0.8, d: 3.4 });
  b.box(w, H, d, color, [0, H / 2, 0]);
  b.box(w, gh, d + 0.02, 0xcdbb98, [0, gh / 2, 0]);
  b.box(4.2, H + 0.6, d + 0.5, accent, [w / 2 - 1.9, (H + 0.6) / 2, 0]);               // stair core
  for (let y = gh; y < H; y += fh) b.box(0.9, 1.5, 0.06, 0xd8f0f0, [w / 2 - 1.9, y + 1.6, d / 2 + 0.28], { glow: true });
  for (let f = 0; f <= floors; f++) b.box(w + 0.3, 0.2, d + 0.3, 0xf6f1e6, [0, gh + f * fh - 0.1, 0]);
  const lm = (sx) => -w / 2 + 2.2 + (bayW) * (sx + 0.5);          // bay centres leave the core free on the right
  // ground floor: lobby entrance + shop windows
  const gw = [];
  for (let i = 0; i < bays; i++) { const x = lm(i); if (Math.abs(x - 0) < 2.0) continue; gw.push({ x, y: 2.4, z: d / 2, ry: 0, w: 2.6, h: 2.8, lit: rnd() < 0.8 ? 1 : 0 }); }
  S.extra.push(makeWindows(gw, { lod: hi ? 'high' : 'low' }));
  b.box(4.2, 3.4, 0.2, 0x2c3a44, [0, 1.7, d / 2 + 0.06], { metal: 0.3 }); b.box(3.6, 3.0, 0.05, 0xffe6ab, [0, 1.6, d / 2 + 0.18], { glow: true });
  b.box(6.0, 0.3, 2.2, 0xf6f1e6, [0, 3.75, d / 2 + 1.1]); for (const s of [-1, 1]) b.cyl(0.1, 0.1, 3.6, 8, 0xc9ced6, [s * 2.8, 1.8, d / 2 + 2.0], { metal: 0.5 });
  const sg = signMesh('SUNRISE APARTMENTS', 6.4, 0.8, { bg: '#1d4f4f', fg: '#ffe9a8', weight: 400 }); sg.position.set(0, 4.45, d / 2 + 0.06); S.g.add(sg);
  // upper floors: balcony bays alternate with window pairs
  for (let f = 0; f < floors; f++) {
    const yb = gh + f * fh;
    for (let i = 0; i < bays; i++) {
      const x = lm(i);
      if (i % 2 === 0) {
        wins.push({ x, y: yb + 1.15, z: d / 2, ry: 0, w: 2.2, h: 2.15, lit: rnd() < 0.3 ? (rnd() < 0.3 ? 2 : 1) : 0 });
        b.box(2.9, 0.2, 1.5, 0xf6f1e6, [x, yb + 0.1, d / 2 + 0.75]);
        b.box(2.9, 0.06, 0.06, 0x3a4452, [x, yb + 1.12, d / 2 + 1.46], { metal: 0.4 });
        for (let k = 0; k < 11; k++) b.box(0.03, 0.9, 0.03, 0x3a4452, [x - 1.4 + k * 0.28, yb + 0.65, d / 2 + 1.46]);
        for (const s of [-1, 1]) { b.box(0.06, 0.06, 1.5, 0x3a4452, [x + s * 1.44, yb + 1.12, d / 2 + 0.75]); b.box(0.03, 0.9, 0.03, 0x3a4452, [x + s * 1.44, yb + 0.65, d / 2 + 0.75]); }
        if (hi) {
          if (rnd() < 0.45) { b.cyl(0.14, 0.11, 0.3, 8, 0xc2623a, [x + 0.9, yb + 0.35, d / 2 + 1.2]); b.sph(0.26, 0x3fa04a, [x + 0.9, yb + 0.7, d / 2 + 1.2], { w: 8, h: 6 }); }
          if (rnd() < 0.3) { b.bar([x - 1.35, yb + 1.9, d / 2 + 0.3], [x + 1.35, yb + 1.9, d / 2 + 0.3], 0.02, 0xcccccc); for (let k = 0; k < 4; k++) b.box(0.32, 0.5, 0.03, [0xd9392f, 0x2f6fd6, 0xffffff, 0xf6c235][k], [x - 1.0 + k * 0.68, yb + 1.6, d / 2 + 0.3]); }
          if (rnd() < 0.25) acUnit(b, x + 0.6, yb + 0.35, d / 2 + 1.1, 0, 0.9);
        }
      } else {
        for (const s of [-1, 1]) wins.push({ x: x + s * 0.85, y: yb + 1.55, z: d / 2, ry: 0, w: 1.15, h: 1.3, lit: rnd() < 0.3 ? 1 : 0 });
      }
    }
  }
  facadeWindows(wins, { cx: -2, cz: 0, w: w - 4, d, y0: gh, floors, fh, ww: 1.3, wh: 1.4, sill: 0.9, gapX: 3.5, faces: 'B', rnd, lit: 0.3, margin: 1.2 });
  facadeWindows(wins, { cx: 0, cz: 0, w, d, y0: gh, floors, fh, ww: 1.3, wh: 1.4, sill: 0.9, gapX: 3.5, gapZ: 3.5, faces: 'LR', rnd, lit: 0.3, margin: 1.2, skipFn: (f) => f === 'R' });
  // roof
  parapet(b, { w, d, y: H, h: 0.9, color: 0xf6f1e6, th: 0.3 }); b.box(4.2, 3.3, d + 0.5, shade(accent, 0.9), [w / 2 - 1.9, H + 1.65, 0]); b.box(4.5, 0.2, d + 0.8, 0xf6f1e6, [w / 2 - 1.9, H + 3.4, 0]);
  roofKit(b, rnd, { cx: -3, cz: 0, w: w - 8, d, y: H, acs: 4, tank: true, antenna: true, bulkhead: false, vents: 1 });
  for (let i = 0; i < 6; i++) b.box(1.6, 0.06, 1.0, 0x1d3a6a, [-9 + (i % 3) * 1.9, H + 0.8 + (i < 3 ? 0 : 0), 3.2 - Math.floor(i / 3) * 1.4 - 1], { r: [-0.5, 0, 0], metal: 0.4, rough: 0.2 });
  for (let i = 0; i < 2; i++) { const tv = turbineVent(); tv.position.set(-2 + i * 2.4, H, -3.5); S.g.add(tv); S.A.on(tv.userData.update); }
  return fin(S, { h: H + 3.6, w, d: d + 1.5, name: 'apartmentBlock', fp: { w, d } });
}

// ---------------------------------------------------------------- 4. setback skyscraper (Art Deco)
export function skyscraper({ seed = 4, floors = 52, lod = 'low', sidewalk = true, stone = 0xd8cdb0, lit = 0.25 } = {}) {
  const S = newB(seed, lod), { b, rnd, g } = S;
  const fh = 4, tiers = [[38, 32, 15], [31, 26, 14], [24, 20, 12], [17, 14, 7], [10, 9, 4]];
  const total = tiers.reduce((s, t) => s + t[2], 0);
  if (sidewalk) pavement(b, { w: 42, z0: 16 + 2.2, d: 3.6 });
  let y = 0, wins = [];
  const piersTop = [];
  tiers.forEach(([tw, td, nf], i) => {
    const th = nf * fh, col = shade(stone, 1 - i * 0.03);
    b.box(tw, th, td, col, [0, y + th / 2, 0]);
    b.box(tw + 0.5, 0.5, td + 0.5, shade(col, 0.82), [0, y + 0.25, 0]); b.box(tw + 0.7, 0.5, td + 0.7, shade(col, 0.9), [0, y + th + 0.25, 0]);
    const tmp = []; curtainWindows(tmp, { w: tw, d: td, y0: y, floors: nf, fh, colW: 2.6, band: 1.3, rnd, lit, lo: 0x31465f, hi: 0x4f6f94 });
    wins.push(...tmp.map((e) => ({ ...e, h: e.h * 0.85, y: e.y - 0.15 })));
    // piers: vertical ribs that run the whole tier (Art Deco), plus corner towers
    for (const f of 'FBLR') {
      const span = f === 'F' || f === 'B' ? tw : td, cols = Math.max(1, Math.round(span / 2.6));
      for (let k = 0; k <= cols; k++) {
        const u = -span / 2 + (span / cols) * k, off = (f === 'F' || f === 'B' ? td : tw) / 2 + 0.08;
        const p = f === 'F' ? [u, off] : f === 'B' ? [u, -off] : f === 'R' ? [off, u] : [-off, u];
        b.box(f === 'F' || f === 'B' ? 0.5 : 0.6, th - 0.3, f === 'F' || f === 'B' ? 0.6 : 0.5, col, [p[0], y + th / 2, p[1]]);
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(1.2, th + 1.4, 1.2, shade(col, 1.06), [sx * (tw / 2 - 0.2), y + (th + 1.4) / 2, sz * (td / 2 - 0.2)]);
    y += th;
  });
  // shopfront / lobby at street level
  const gl = []; facadeWindows(gl, { w: 38, d: 32, y0: 0, floors: 1, fh: 4.5, ww: 3.8, wh: 3.6, sill: 0.4, gapX: 5.2, faces: 'F', rnd, lit: 0.95, margin: 3.5 });
  S.extra.push(makeWindows(gl.filter((e) => Math.abs(e.x) > 3.2), { lod: 'high' }));
  lobbyPortal(S, { z: 16, w: 5.5, h: 4.6 });
  // crown: glowing stepped spire
  const crown = []; const cm = new THREE.Mesh(new THREE.ConeGeometry(2.4, 14, 4), new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffc860, emissiveIntensity: 0.9, roughness: 0.4 })); cm.rotation.y = Math.PI / 4; cm.position.y = y + 7; g.add(cm);
  for (let i = 0; i < 5; i++) b.box(7 - i * 1.2, 1.4, 6 - i * 1.0, i % 2 ? 0xe8dcc0 : 0xcdbf9f, [0, y + 0.7 + i * 1.4, 0]);
  const spireH = 20; b.cyl(0.08, 0.3, spireH, 6, 0xdfe3ea, [0, y + 14 + spireH / 2, 0], { metal: 0.6, rough: 0.3 });
  const beacon = lampMesh(gSph(0.5, 10, 8), 0xff3030); beacon.position.set(0, y + 14 + spireH + 0.2, 0); g.add(beacon);
  const bh = halo(0xff3030, 1.6, 0.3); bh.position.copy(beacon.position); g.add(bh);
  S.A.on((t) => { const k = fract(t / 2.0) < 0.2 ? 1 : 0.1; beacon.material.userData.set(k * 1.2); bh.material.opacity = 0.3 * k; cm.material.emissiveIntensity = 0.75 + 0.2 * Math.sin(t * 0.8); });
  S.extra.push(makeWindows(wins, { lod: 'low', depthK: 1.5 }));
  S.wins = [];
  return fin(S, { h: y + 14 + spireH + 0.8, w: 38, d: 32, name: 'skyscraper' });
}

// ---------------------------------------------------------------- 5. corner shop
export function cornerShop({ w = 9, d = 8.5, seed = 5, color = 0xf0c38a, lod = 'high', sidewalk = true, name = 'CORNER SHOP' } = {}) {
  const S = newB(seed, lod), { b, rnd, wins, g, hi } = S;
  const gh = 3.9, H = gh + 3.2 + 0.6;
  if (sidewalk) pavement(b, { w: w + 1.6, z0: d / 2 + 0.2, d: 3.2 });
  b.box(w, H, d, color, [0, H / 2, 0]); b.box(w + 0.2, 0.35, d + 0.2, shade(color, 0.9), [0, gh, 0]);
  b.box(w, gh, 0.02, shade(color, 0.7), [0, gh / 2, d / 2 + 0.01]);
  // shop window + door
  const fw = [{ x: -2.4, y: 1.9, z: d / 2, ry: 0, w: 3.2, h: 2.0, lit: 1 }, { x: 2.6, y: 1.9, z: d / 2, ry: 0, w: 2.4, h: 2.0, lit: 1 }];
  S.extra.push(makeWindows(fw, { lod: hi ? 'high' : 'low', frame: 0x3a5a3a, flicker: false }));
  b.box(1.3, 2.6, 0.14, 0x3a5a3a, [0.1, 1.4, d / 2 + 0.07]); b.box(1.0, 2.1, 0.05, 0xffe9b0, [0.1, 1.35, d / 2 + 0.15], { glow: true }); b.sph(0.05, 0xf0c64a, [0.55, 1.2, d / 2 + 0.2], { metal: 0.7, rough: 0.3 });
  awning(b, { x: 0, y: 3.45, z: d / 2 + 0.05, w: w - 0.4, out: 1.6, drop: 0.85, c1: PAL.green, c2: PAL.white, n: 12 });
  const sg = signMesh(name, w - 1.2, 0.85, { bg: '#2a5a3a', fg: '#fff6d8', border: '#fff6d8' }); sg.position.set(0, 3.95, d / 2 + 0.085); g.add(sg);
  b.box(w - 1.0, 0.95, 0.12, 0x1f3f2a, [0, 3.95, d / 2 + 0.0], { rough: 0.6 });
  // OPEN neon (blinks), fruit crates, newspaper stand, A-frame board
  const neon = lampMesh(gBox(0.9, 0.34, 0.04), 0xff5a5a); neon.position.set(-2.4, 1.3, d / 2 + 0.09); g.add(neon);
  const nsg = signMesh('OPEN', 0.9, 0.34, { bg: null, fg: '#fff', weight: 400, fit: 0.9 }); nsg.position.set(-2.4, 1.3, d / 2 + 0.12); g.add(nsg);
  S.A.on((t) => { const k = fract(t * 0.5) < 0.88 ? 1 : 0.3; neon.material.userData.set(k * 1.2); });
  const fx = 2.5, fz = d / 2 + 0.9;
  for (let i = 0; i < 3; i++) {
    const cx = fx - 1.2 + i * 1.15; b.box(1.0, 0.45, 0.7, 0xa56b3a, [cx, 0.15 + 0.225, fz]); b.box(1.04, 0.06, 0.74, 0x8a5a2e, [cx, 0.62, fz]);
    const fc = [[0xd9392f, 0xf6c235][i % 2], 0xf08a2b, 0x6bb04f][i];
    for (let k = 0; k < 9; k++) b.sph(0.11, k % 3 ? fc : shade(fc, 0.85), [cx - 0.3 + (k % 3) * 0.3, 0.72 + (k > 5 ? 0.14 : 0), fz - 0.18 + Math.floor(k / 3) * 0.2], { w: 7, h: 5 });
  }
  b.box(0.7, 1.2, 0.5, 0x5a6a7a, [-w / 2 + 0.2, 0.75, d / 2 + 0.7]); b.box(0.6, 0.3, 0.04, 0xf6f2e8, [-w / 2 + 0.2, 1.15, d / 2 + 0.96]);
  // upstairs flat: windows with flower boxes, AC, satellite dish, projecting blade sign (swings)
  for (const x of [-2.6, 0, 2.6]) { wins.push({ x, y: gh + 1.65, z: d / 2, ry: 0, w: 1.4, h: 1.9, lit: rnd() < 0.5 ? 1 : 0 }); b.box(1.7, 0.2, 0.3, shade(color, 0.7), [x, gh + 2.9, d / 2 + 0.08]); if (hi) { b.box(1.6, 0.26, 0.36, 0x8a4a2a, [x, gh + 0.65, d / 2 + 0.25]); for (let k = 0; k < 5; k++) b.sph(0.13, [0xff5c8a, 0xffd23f, 0xffffff, 0xb07aff, 0xff8a2b][k], [x - 0.55 + k * 0.28, gh + 0.9, d / 2 + 0.25], { w: 7, h: 5 }); } }
  facadeWindows(wins, { w, d, y0: gh, floors: 1, fh: 3.2, ww: 1.2, wh: 1.6, sill: 0.8, gapX: 3.2, gapZ: 3.2, faces: 'BLR', rnd, lit: 0.4, margin: 1.4 });
  facadeWindows(wins, { w, d, y0: 0, floors: 1, fh: gh, ww: 1.4, wh: 1.4, sill: 1.0, gapX: 3.4, gapZ: 3.4, faces: 'BLR', rnd, lit: 0.8, margin: 1.4 });
  parapet(b, { w, d, y: H, h: 0.5, color: shade(color, 0.85), th: 0.28 });
  if (hi) { acUnit(b, w / 2 + 0.2, gh + 1.0, 1.5, Math.PI / 2, 0.9); }
  b.cyl(0.03, 0.03, 1.2, 5, 0x555d68, [-3.3, H + 0.6 + 0.5, -1]); b.sph(0.45, 0xe8ecf2, [-3.3, H + 1.6, -0.8], { r: [0, 0, 0], w: 12, h: 4 });
  roofKit(b, rnd, { cx: 1, cz: -1, w, d, y: H + 0.5, acs: 1, tank: false, antenna: true, bulkhead: true, vents: 2 });
  const blade = new THREE.Group(); blade.position.set(w / 2 - 0.25, gh + 0.4, d / 2 + 0.15);
  b.bar([w / 2 - 0.25, gh + 0.3, d / 2 + 0.1], [w / 2 - 0.25 + 0.0, gh + 0.3, d / 2 + 1.0], 0.06, 0x20262e);
  const bs = signMesh('GROCERY', 1.2, 0.8, { bg: '#f6c235', fg: '#2a2a2a', double: true }); bs.position.set(0, -0.6, 0.55); bs.rotation.y = Math.PI / 2; blade.add(bs); g.add(blade);
  S.A.on((t) => { blade.rotation.z = Math.sin(t * 1.6) * 0.06; });
  return fin(S, { h: H + 1.8, w: w + 1.6, d: d + 3.4, name: 'cornerShop', fp: { w, d } });
}

// ---------------------------------------------------------------- 6. chrome diner with neon sign
export function diner({ w = 15, d = 7.5, seed = 6, lod = 'high', sidewalk = true } = {}) {
  const S = newB(seed, lod), { b, g, rnd, hi } = S;
  const H = 3.6, fz = d / 2;
  if (sidewalk) { b.box(w + 8, 0.12, d + 10, 0x3a3d47, [0, 0.06, 2.4], { rough: 0.95 }); for (let i = 0; i < 6; i++) b.box(0.14, 0.02, 4.2, 0xf4f4ee, [-w / 2 - 1 + i * 3.1, 0.13, fz + 3.2]); b.box(w + 8, 0.2, 0.3, 0xc9c5ba, [0, 0.1, fz + 5.1]); }
  b.box(w, 0.5, d, 0xc8ccd4, [0, 0.37, 0], { metal: 0.7, rough: 0.2 });                                  // chrome skirt / platform
  // shell: back wall, end walls, front lower wall + red/chrome stripes, ceiling, roof edge
  b.box(w, 3.2, 0.25, 0xf0e6cf, [0, 1.9, -fz + 0.12]); b.box(0.25, 3.2, d, 0xe8e8ea, [-w / 2 + 0.12, 1.9, 0]); b.box(0.25, 3.2, d, 0xe8e8ea, [w / 2 - 0.12, 1.9, 0]);
  b.rbox(w, 1.3, 0.3, 0.1, 0xe8e8ea, [0, 1.1, fz - 0.15], { rough: 0.35, metal: 0.3 });
  b.box(w + 0.04, 0.3, 0.34, 0xd9392f, [0, 1.4, fz - 0.15]); b.box(w + 0.05, 0.1, 0.36, 0xdfe3ea, [0, 1.66, fz - 0.15], { metal: 0.8, rough: 0.2 });
  for (const s of [-1, 1]) { b.box(0.3, 0.3, d + 0.04, 0xd9392f, [s * (w / 2 - 0.12), 1.4, 0]); b.box(0.32, 0.1, d + 0.05, 0xdfe3ea, [s * (w / 2 - 0.12), 1.66, 0], { metal: 0.8, rough: 0.2 }); }
  b.box(w - 0.2, 0.15, d - 0.2, 0xfaf4e4, [0, 3.2, 0]);
  b.rbox(w + 0.5, 0.5, d + 0.5, 0.15, 0xdfe3ea, [0, H + 0.2, 0], { metal: 0.8, rough: 0.2 }); b.rbox(w + 0.2, 0.7, d + 0.2, 0.18, 0xd9392f, [0, H - 0.2, 0]);
  // interior: checker floor, glowing ceiling strips, counter with stools, booths with customers
  for (let i = 0; i < Math.floor((w - 0.6) / 0.6); i++) for (let j = 0; j < Math.floor((d - 0.6) / 0.6); j++) b.plane(0.6, 0.6, (i + j) % 2 ? 0x20232b : 0xf4f1e8, [-w / 2 + 0.6 + i * 0.6, 0.64, -d / 2 + 0.6 + j * 0.6], { r: [-Math.PI / 2, 0, 0] });
  for (let i = 0; i < 6; i++) b.box(0.4, 0.04, d - 1.0, 0xfff1c8, [-w / 2 + 1.6 + i * 2.4, 3.1, 0], { glow: true });
  b.box(w - 4, 0.95, 0.9, 0xe8e8ea, [-0.5, 1.15, -1.3], { metal: 0.2 }); b.box(w - 3.8, 0.1, 1.0, 0x2a2d36, [-0.5, 1.66, -1.3]);
  for (let i = 0; i < 7; i++) { b.cyl(0.04, 0.04, 0.55, 6, 0xc8ccd4, [-w / 2 + 3.2 + i * 1.5, 0.9, -0.35], { metal: 0.8 }); b.cyl(0.22, 0.22, 0.1, 10, 0xd9392f, [-w / 2 + 3.2 + i * 1.5, 1.2, -0.35]); }
  b.box(2.2, 1.0, 0.1, 0x2a2d36, [-0.5, 2.1, -fz + 0.3]); b.box(2.0, 0.8, 0.04, 0xffd23f, [-0.5, 2.1, -fz + 0.36], { glow: true });
  const cust = [0xf2b98f, 0xd99a6c, 0x9b6338, 0xf8d5b8];
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + 1.7 + i * 2.6, z = fz - 0.9;
    b.rbox(1.5, 0.45, 0.45, 0.1, 0xc02a2a, [x, 0.95, z + 0.35]); b.rbox(1.5, 0.8, 0.14, 0.06, 0xc02a2a, [x, 1.4, z + 0.62]);
    b.rbox(1.5, 0.45, 0.45, 0.1, 0xc02a2a, [x, 0.95, z - 1.05]); b.rbox(1.5, 0.8, 0.14, 0.06, 0xc02a2a, [x, 1.4, z - 1.3]);
    b.box(1.1, 0.07, 0.8, 0xf0ece0, [x, 1.35, z - 0.35], { metal: 0.2 }); b.cyl(0.07, 0.07, 0.65, 6, 0x8a909a, [x, 0.97, z - 0.35]);
    if (i !== 3) { b.rbox(0.42, 0.5, 0.28, 0.1, [0x2f6fd6, 0x2fa66a, 0xf6c235, 0xd9392f][i % 4], [x - 0.3, 1.5, z + 0.36]); b.sph(0.19, cust[i % 4], [x - 0.3, 1.92, z + 0.36], { w: 9, h: 7 }); b.sph(0.1, 0xd9a05a, [x + 0.15, 1.45, z - 0.35]); }
  }
  // front mullions + glass hint
  for (let i = 0; i <= 6; i++) b.box(0.14, 1.55, 0.18, 0xc8ccd4, [-w / 2 + 0.3 + i * ((w - 0.6) / 6), 2.43, fz - 0.05], { metal: 0.8, rough: 0.2 });
  b.box(w, 0.1, 0.2, 0xc8ccd4, [0, 3.2, fz - 0.05], { metal: 0.8 });
  const gl = new THREE.Mesh(gPlane(w - 0.6, 1.55), new THREE.MeshStandardMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.2, depthWrite: false })); gl.position.set(0, 2.43, fz - 0.02); g.add(gl);
  // door + side windows
  b.box(1.3, 2.4, 0.12, 0x2a3038, [w / 2 - 1.9, 1.7, fz + 0.0]); b.box(1.0, 1.9, 0.05, 0xffe9b0, [w / 2 - 1.9, 1.7, fz + 0.07], { glow: true });
  const sw = []; for (const s of [-1, 1]) sw.push({ x: s * (w / 2), y: 2.4, z: 0, ry: s * Math.PI / 2, w: 2.6, h: 1.3, lit: 1 });
  S.extra.push(makeWindows(sw, { lod: hi ? 'high' : 'low', flicker: false }));
  // roof: neon sign on a mast, chase arrow
  b.box(0.3, 1.6, 0.3, 0xc8ccd4, [-w / 2 + 2.4, H + 1.5, d * 0.1], { metal: 0.6 });
  const sgn = signMesh('DINER', 6.4, 2.0, { bg: '#10142a', fg: '#ff5a7a', border: '#79e6ff', double: true }); sgn.position.set(-w / 2 + 2.4, H + 3.5, d * 0.1); g.add(sgn);
  const arr = []; for (let i = 0; i < 7; i++) { const m = lampMesh(gBox(0.55, 0.22, 0.1), 0xffd23f); m.position.set(-w / 2 + 6.0 + i * 0.7, H + 3.5, d * 0.1); g.add(m); arr.push(m); }
  const tip = lampMesh(new THREE.ConeGeometry(0.34, 0.6, 3), 0xffd23f); tip.rotation.z = -Math.PI / 2; tip.position.set(-w / 2 + 6.0 + 7 * 0.7 + 0.1, H + 3.5, d * 0.1); g.add(tip); arr.push(tip);
  S.A.on((t) => { const ph = Math.floor(t * 6) % 9; arr.forEach((m, i) => m.material.userData.set(i === ph || i === (ph + 8) % 9 ? 1.4 : 0.25)); sgn.children[0].material.color.setScalar(1 - 0.2 * (fract(t * 0.8) < 0.1 ? 1 : 0)); });
  roofKit(b, rnd, { cx: 2, cz: -1, w: w * 0.5, d, y: H + 0.45, acs: 3, tank: false, antenna: false, bulkhead: false, vents: 2 });
  b.box(0.8, 1.6, 0.8, 0xc8ccd4, [w / 2 - 2, H + 1.2, -d * 0.2], { metal: 0.6 });
  for (let i = 0; i < 3; i++) { const x = -w / 2 + 3 + i * 2.4; b.cyl(0.35, 0.35, 0.05, 12, 0xd9392f, [x, 0.9, fz + 1.4]); b.cyl(0.04, 0.04, 0.75, 6, 0x555d68, [x, 0.5, fz + 1.4]); b.cyl(0.2, 0.2, 0.04, 8, 0x555d68, [x, 0.14, fz + 1.4]); for (const s of [-1, 1]) b.cyl(0.18, 0.18, 0.06, 8, 0xf6c235, [x + s * 0.7, 0.62, fz + 1.4]); }
  return fin(S, { h: H + 6.5, w: w + 8, d: d + 10, name: 'diner', fp: { w, d } });
}

// ---------------------------------------------------------------- 7. gas station (canopy, pumps, pylon sign, mini market)
export function gasStation({ seed = 7, lod = 'high', brand = 'GASCO' } = {}) {
  const S = newB(seed, lod), { b, g, rnd, hi } = S;
  const W = 28, D = 22;
  b.box(W, 0.12, D, 0x4a4d57, [0, 0.06, 0], { rough: 0.95 });
  for (let i = 0; i < 8; i++) b.box(0.1, 0.02, 3.4, 0xf4f4ee, [-4 + i * 1.6, 0.13, D / 2 - 2.2]);
  b.box(W, 0.18, 0.4, 0xc9c5ba, [0, 0.12, D / 2 - 0.2]);
  // mini market
  const mw = 12, md = 7, mh = 4.4, mx = 5, mz = -D / 2 + md / 2 + 1;
  b.box(mw, mh, md, 0xf3efe6, [mx, mh / 2, mz]); b.box(mw + 0.4, 0.5, md + 0.4, 0xd9392f, [mx, mh + 0.25, mz]); b.box(mw + 0.5, 0.12, md + 0.5, 0xb02a22, [mx, mh + 0.56, mz]);
  b.box(mw, 0.5, 0.06, 0xd9392f, [mx, 0.45 + 0.7, mz + md / 2 + 0.04]);
  const mw2 = [{ x: mx - 3, y: 2.2, z: mz + md / 2, ry: 0, w: 3.8, h: 2.3, lit: 1 }, { x: mx + 3.2, y: 2.2, z: mz + md / 2, ry: 0, w: 2.8, h: 2.3, lit: 1 }, { x: mx + mw / 2, y: 2.4, z: mz, ry: Math.PI / 2, w: 2.2, h: 1.6, lit: 1 }, { x: mx - mw / 2, y: 2.4, z: mz, ry: -Math.PI / 2, w: 2.2, h: 1.6, lit: 1 }];
  S.extra.push(makeWindows(mw2, { lod: hi ? 'high' : 'low', flicker: false }));
  b.box(1.4, 2.8, 0.12, 0x2a3038, [mx - 0.1, 1.5, mz + md / 2 + 0.06]); b.box(1.1, 2.3, 0.05, 0xffe9b0, [mx - 0.1, 1.45, mz + md / 2 + 0.13], { glow: true });
  const ms = signMesh('MINI MART  24H', 7, 0.9, { bg: '#d9392f', fg: '#ffffff', border: '#ffffff' }); ms.position.set(mx, mh - 0.05 + 0.25, mz + md / 2 + 0.24); g.add(ms);
  roofKit(b, rnd, { cx: mx, cz: mz, w: mw, d: md, y: mh + 0.62, acs: 2, bulkhead: false, vents: 1 });
  // canopy over three pumps
  const cx = -5, cz = 4, cw = 14, cd = 8, ch = 5.4;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.cyl(0.3, 0.3, ch, 10, 0xf3efe6, [cx + sx * (cw / 2 - 1.2), ch / 2, cz + sz * (cd / 2 - 1.2)]); b.cyl(0.36, 0.36, 0.9, 10, 0xd9392f, [cx + sx * (cw / 2 - 1.2), 0.45 + 0.1, cz + sz * (cd / 2 - 1.2)]); }
  b.box(cw, 0.7, cd, 0xf3efe6, [cx, ch + 0.35, cz]); b.box(cw + 0.2, 0.3, cd + 0.2, 0xd9392f, [cx, ch + 0.7, cz]); b.box(cw + 0.2, 0.14, cd + 0.2, 0xf6c235, [cx, ch + 0.97, cz]);
  b.box(cw - 0.4, 0.06, cd - 0.4, 0xfff0c8, [cx, ch - 0.02, cz], { glow: true });
  for (let i = 0; i < 3; i++) {
    const px = cx - 3.6 + i * 3.6, pz = cz - 0.4;
    b.rbox(0.7, 1.45, 0.45, 0.1, 0xe8e8ea, [px, 0.1 + 0.72, pz]); b.box(0.74, 0.35, 0.49, 0xd9392f, [px, 1.2, pz]); b.box(0.5, 0.22, 0.04, 0x1b2a3a, [px, 1.38, pz + 0.24]); b.box(0.42, 0.1, 0.02, 0x7dff9a, [px, 1.38, pz + 0.26], { glow: true });
    for (const s of [-1, 1]) { b.box(0.16, 0.5, 0.1, 0x20262e, [px + s * 0.3, 0.95, pz + 0.25]); b.bar([px + s * 0.4, 1.15, pz + 0.2], [px + s * 0.55, 0.5, pz + 0.5], 0.05, 0x20262e); b.cyl(0.05, 0.05, 0.25, 6, 0x20262e, [px + s * 0.55, 0.9, pz + 0.55]); }
    b.box(1.2, 0.18, 1.2, 0xc9c5ba, [px, 0.2, pz], { rough: 0.9 });
  }
  const sg = signMesh(brand, 5.0, 0.8, { bg: '#d9392f', fg: '#fff', border: '#f6c235', double: false }); sg.position.set(cx, ch + 0.3, cz + cd / 2 + 0.07); g.add(sg);
  // pylon price sign with rotating logo disc on top
  const px = -W / 2 + 2.2, pz = D / 2 - 2;
  b.box(0.5, 6.6, 0.5, 0xd9d9de, [px, 3.3, pz], { metal: 0.4 }); b.box(2.4, 3.4, 0.35, 0x1b2a3a, [px, 6.8, pz]); b.box(2.5, 0.12, 0.4, 0xd9392f, [px, 8.55, pz]);
  const pr = signMesh('', 2.1, 3.0, { bg: '#10182a', lines: [{ text: brand, y: 0.17, size: 0.34, color: '#ffd23f' }, { text: 'REG 3.49', y: 0.45, size: 0.3, color: '#7dff9a' }, { text: 'SUP 3.89', y: 0.68, size: 0.3, color: '#7dff9a' }, { text: 'DSL 3.99', y: 0.9, size: 0.3, color: '#7dff9a' }], double: true });
  pr.position.set(px, 6.8, pz + 0.19); g.add(pr);
  const disc = new THREE.Group(); disc.position.set(px, 9.6, pz);
  const db = new Batch(); db.cyl(0.9, 0.9, 0.25, 24, 0xf6c235, [0, 0, 0], { r: [Math.PI / 2, 0, 0], rough: 0.4 }); db.cyl(0.7, 0.7, 0.28, 24, 0xd9392f, [0, 0, 0], { r: [Math.PI / 2, 0, 0], rough: 0.4 }); db.build(disc);
  const dl = signMesh('G', 1.1, 1.1, { bg: null, fg: '#ffd23f', weight: 400, double: true }); dl.position.z = 0.15; const dl2 = signMesh('G', 1.1, 1.1, { bg: null, fg: '#ffd23f', weight: 400 }); dl2.rotation.y = Math.PI; dl2.position.z = -0.15; disc.add(dl, dl2); g.add(disc);
  b.cyl(0.08, 0.08, 1.0, 6, 0x555d68, [px, 8.9, pz]);
  S.A.on((t) => { disc.rotation.y = t * 1.4; });
  // air pump, ice chest, trash can, brand flags
  b.rbox(0.5, 1.3, 0.4, 0.1, 0x2f6fd6, [mx + 5.2, 0.75, mz + md / 2 + 1.2]); b.box(0.9, 0.7, 0.6, 0xe8f2f8, [mx + 3.9, 0.45, mz + md / 2 + 0.55]); b.cyl(0.25, 0.22, 0.8, 10, 0x3a8a6a, [mx - 5.4, 0.5, mz + md / 2 + 0.6]);
  const f1 = flag(1.5, 0.9, [0xd9392f, 0xf6c235]); f1.position.set(-W / 2 + 4.0, 5.2, -2); g.add(f1); b.cyl(0.04, 0.04, 6.0, 6, 0xc8ccd4, [-W / 2 + 3.24, 3.0, -2]); S.A.on(f1.userData.update); f1.position.set(-W / 2 + 3.3, 5.2, -2);
  return fin(S, { h: 10.6, w: W, d: D, name: 'gasStation' });
}
