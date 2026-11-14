// Facade grammar (Annex A 6.2): footprint + floors + style. Each face is split into bays; each bay x floor gets a module.
// LOD0: recessed windows (reveals, glass, sills, sash bars), storefronts, cornices, pilasters are real geometry.
// LOD1/LOD2: one quad per face per band with a facade-module texture layer (uv = bays x storeys), so the window grid and the
// night window pattern survive at distance for ~20 triangles per building. Pure (no three).
import { h01 } from '../kit/geo.js';

/** the 4 faces of a w x d footprint centred at the origin; face-local frame: x along the face, outward -Z, y up */
const CELL = [0, 0];
export function rectFaces(w, d) {
  return [
    { i: 0, ox: -w / 2, oz: -d / 2, yaw: 0, L: w, front: true },
    { i: 1, ox: w / 2, oz: -d / 2, yaw: Math.PI / 2, L: d },
    { i: 2, ox: w / 2, oz: d / 2, yaw: Math.PI, L: w },
    { i: 3, ox: -w / 2, oz: d / 2, yaw: -Math.PI / 2, L: d },
  ];
}
export const enterFace = (g, f) => g.push().translate(f.ox, 0, f.oz).rotY(f.yaw);

/** recessed window in face-local coords: opening x0..x1, y0..y1, recess r. cell = [u, v] window id for the night pattern */
export function windowRecess(g, x0, y0, x1, y1, r, o, cell) {
  const L = g.L, tile = g.tile, T = g.T;
  // reveals (wall layer)
  g.quadS(x0, y0, r, x0, y0, 0, x0, y1, 0, x0, y1, r);
  g.quadS(x1, y0, 0, x1, y0, r, x1, y1, r, x1, y1, 0);
  g.quadS(x0, y1, 0, x1, y1, 0, x1, y1, r, x0, y1, r);
  g.quadS(x0, y0, r, x1, y0, r, x1, y0, 0, x0, y0, 0);
  // glass
  g.mat('tex.glass_window', o.glassTint || 0xffffff); g.emit(o.emit || 0);
  g.quadUVS(x1, y0, r, x0, y0, r, x0, y1, r, x1, y1, r, cell[0] + 0.08, cell[1] + 0.08, cell[0] + 0.92, cell[1] + 0.92);
  g.emit(0);
  // frame / sash bars
  if (o.bars) {
    g.mat('tex.metal_painted', o.frameTint || 0xe8e4dc);
    const ym = y0 + (y1 - y0) * 0.55;
    g.box((x0 + x1) / 2, ym, r - 0.03, x1 - x0, 0.06, 0.05, { noBottom: true });
    if (o.bars > 1) g.box((x0 + x1) / 2, (ym + y1) / 2, r - 0.03, 0.05, y1 - ym, 0.05, { noBottom: true, noTop: true });
  }
  g.L = L; g.tile = tile; g.T = T;
  if (o.sill) {
    g.mat(o.sillTex || 'tex.concrete_cast', o.sillTint || 0xd8d2c6);
    g.box((x0 + x1) / 2, y0 - 0.05, -0.05, x1 - x0 + 0.18, 0.1, 0.16 + r);
    if (o.lintel) g.box((x0 + x1) / 2, y1 + 0.1, -0.02, x1 - x0 + 0.16, 0.2, 0.06);
    g.L = L; g.tile = tile; g.T = T;
  }
}

/**
 * LOD0 face: rows of windows over `floors` storeys from y = yStart, with piers and spandrels in the wall layer.
 * s = { wallTex, wallTint, st (storey m), bay, win:[w, h, sillH], recess, bars, sill, lintel, glassTint, emit, uOff, ribbon }
 */
export function faceWindows(g, f, yStart, floors, s, seed, extras) {
  const n = Math.max(1, Math.round(f.L / s.bay)), bw = f.L / n;
  const ww = Math.min(bw - 0.5, s.win[0]), wh = Math.min(s.st - 0.5, s.win[1]), sh = s.win[2];
  g.mat(s.wallTex, s.wallTint);
  const uO = s.uOff + f.i * 37.3;
  for (let fl = 0; fl < floors; fl++) {
    const yb = yStart + fl * s.st, yt = yb + s.st, wy0 = yb + sh, wy1 = wy0 + wh;
    g.mat(s.wallTex, s.wallTint);
    g.wall(0, yb, f.L, wy0, 0, uO); g.wall(0, wy1, f.L, yt, 0, uO);
    if (s.ribbon) { // continuous ribbon glazing with thin mullions
      g.mat('tex.glass_window', s.glassTint || 0xffffff); g.emit(s.emit);
      for (let i = 0; i < n; i++) { const x0 = i * bw, x1 = x0 + bw, ci = f.i * 100 + (n - 1 - i); g.quadUV([x1, wy0, s.recess], [x0, wy0, s.recess], [x0, wy1, s.recess], [x1, wy1, s.recess], ci + 0.05, fl + 0.05, ci + 0.95, fl + 0.95); }
      g.emit(0); g.mat('tex.metal_painted', s.frameTint || 0x3a3e44);
      for (let i = 0; i <= n; i++) g.box(Math.min(f.L - 0.04, Math.max(0.04, i * bw)), (wy0 + wy1) / 2, s.recess * 0.5, 0.08, wh, s.recess + 0.04, { noBottom: true, noTop: true });
      g.mat(s.wallTex, s.wallTint);
      g.quad([0, wy0, s.recess], [f.L, wy0, s.recess], [f.L, wy0, 0], [0, wy0, 0]);
      g.quad([0, wy1, 0], [f.L, wy1, 0], [f.L, wy1, s.recess], [0, wy1, s.recess]);
      continue;
    }
    let xPrev = 0;
    for (let i = 0; i < n; i++) {
      const cx = (i + 0.5) * bw, x0 = cx - ww / 2, x1 = cx + ww / 2;
      if (fl === 0 && yStart < 0.01 && f.front && s.doorBay === i) { // entrance instead of a window: wall continues, door panel in front
        g.mat(s.doorTex || 'tex.wood_painted', s.doorTint || 0x5a3a2a);
        g.box(cx, 1.12, -0.04, 1.1, 2.24, 0.1, { noBottom: true });
        g.mat(s.sillTex || 'tex.concrete_cast', 0xbcb6aa); g.box(cx, 0.08, -0.45, 1.8, 0.16, 0.9);
        g.mat('tex.metal_painted', 0xb0a080); g.box(cx + 0.38, 1.05, -0.1, 0.06, 0.06, 0.06);
        continue;
      }
      g.mat(s.wallTex, s.wallTint);
      g.wall(xPrev, wy0, x0, wy1, 0, uO);
      const ci = f.i * 100 + (n - 1 - i);
      CELL[0] = ci; CELL[1] = fl + Math.round(yStart / s.st); windowRecess(g, x0, wy0, x1, wy1, s.recess, s, CELL);
      xPrev = x1;
      if (extras) extras(i, fl, cx, wy0, wy1, x0, x1, n);
    }
    g.mat(s.wallTex, s.wallTint);
    g.wall(xPrev, wy0, f.L, wy1, 0, uO);
  }
  void seed;
  return { n, bw };
}

/** LOD1/2 face: facade layer quad over floors [f0, f1) (uv u = bays, v = storeys) */
export function faceFlat(g, f, y0, y1, f0, f1, s, tex, tint, emit) {
  const n = Math.max(1, Math.round(f.L / s.bay));
  g.mat(tex, tint); g.emit(emit || 0);
  const u0 = f.i * 100;
  g.quadUV([f.L, y0, 0], [0, y0, 0], [0, y1, 0], [f.L, y1, 0], u0, f0, u0 + n, f1);
  g.emit(0);
}

/** storefront band on a face: piers, display glass with transom bar, sign fascia, door in one bay; optional awnings */
export function storefront(g, f, y0, h, s, seed, o = {}) {
  const n = Math.max(1, Math.round(f.L / s.bay)), bw = f.L / n, door = Math.floor(h01(seed, f.i) * n);
  const pier = 0.45, gy0 = y0 + 0.45, gy1 = y0 + h - 0.95;
  g.mat(o.pierTex || s.wallTex, o.pierTint || s.wallTint);
  for (let i = 0; i <= n; i++) { const x = i * bw; g.box(Math.min(f.L - pier / 2, Math.max(pier / 2, x)), y0 + h / 2, -0.06, pier, h, 0.12, { noBottom: true, noTop: true }); }
  g.wall(0, y0, f.L, gy0, 0);
  // fascia (sign band)
  g.mat('tex.metal_painted', o.fascia || 0x2c3a3a); g.box(f.L / 2, y0 + h - 0.45, -0.12, f.L, 0.9, 0.18, { noBottom: false });
  for (let i = 0; i < n; i++) {
    const x0 = i * bw + pier / 2, x1 = (i + 1) * bw - pier / 2, r = 0.25, ci = f.i * 100 + (n - 1 - i);
    g.mat('tex.metal_painted', 0x2a2c30);
    g.quad([x0, gy0, r], [x0, gy0, 0], [x0, gy1, 0], [x0, gy1, r]); g.quad([x1, gy0, 0], [x1, gy0, r], [x1, gy1, r], [x1, gy1, 0]);
    g.quad([x0, gy0, r], [x1, gy0, r], [x1, gy0, 0], [x0, gy0, 0]);
    if (i === door) {
      g.mat('tex.wood_painted', o.doorTint || 0x3a2a22); const dw = Math.min(1.6, x1 - x0 - 0.4), dc = (x0 + x1) / 2;
      g.wall(dc - dw / 2, y0, dc + dw / 2, y0 + 2.3, r + 0.02);
      g.mat('tex.glass_window', 0xffffff); g.emit(s.emit || 0);
      g.quadUV([x1, gy0, r], [dc + dw / 2, gy0, r], [dc + dw / 2, gy1, r], [x1, gy1, r], ci + 0.1, 900.1, ci + 0.5, 900.9);
      g.quadUV([dc - dw / 2, gy0, r], [x0, gy0, r], [x0, gy1, r], [dc - dw / 2, gy1, r], ci + 0.5, 900.1, ci + 0.9, 900.9);
      g.emit(0);
    } else {
      g.mat('tex.glass_window', 0xffffff); g.emit(s.emit || 0);
      g.quadUV([x1, gy0, r], [x0, gy0, r], [x0, gy1, r], [x1, gy1, r], ci + 0.08, 900.08, ci + 0.92, 900.92);
      g.emit(0);
      g.mat('tex.metal_painted', 0x2a2c30); g.box((x0 + x1) / 2, gy1 - 0.5, r - 0.03, x1 - x0, 0.06, 0.05, { noBottom: true });
    }
    g.mat(o.pierTex || s.wallTex, o.pierTint || s.wallTint);
    g.wall(x0, gy1, x1, y0 + h - 0.9, 0);
    if (o.awnings && h01(seed + i, f.i + 11) < o.awnings) awning(g, x0 - 0.1, x1 + 0.1, y0 + h - 0.95, 1.3, o.awningTint || 0xb3272d, o.striped && h01(seed, 5) < 0.5);
  }
  return { n, bw };
}

/** slanted fabric awning with valance (double-sided material, separate GB) */
export function awning(g, x0, x1, y, depth, tint, striped) {
  const a = g.ds || g;
  const keep = [a.L, a.tile, a.T];
  const n = striped ? Math.max(2, Math.round((x1 - x0) / 0.45)) : 1;
  for (let k = 0; k < n; k++) {
    const xa = x0 + (k * (x1 - x0)) / n, xb = x0 + ((k + 1) * (x1 - x0)) / n;
    a.mat('tex.fabric_canvas', striped && k % 2 ? 0xf0ead8 : tint);
    a.quad([xb, y, -0.05], [xa, y, -0.05], [xa, y - 0.7, -depth], [xb, y - 0.7, -depth]);
    a.quad([xb, y - 0.7, -depth], [xa, y - 0.7, -depth], [xa, y - 0.95, -depth - 0.02], [xb, y - 0.95, -depth - 0.02]);
  }
  [a.L, a.tile, a.T] = keep;
}

/** cornice / parapet ring around a w x d footprint at height y */
export function cornice(g, w, d, y, hgt, out, tex, tint) {
  g.mat(tex, tint);
  g.box(0, y + hgt / 2, -d / 2 - out / 2 + 0.01, w + 2 * out, hgt, out + 0.02, { noBottom: false });
  g.box(0, y + hgt / 2, d / 2 + out / 2 - 0.01, w + 2 * out, hgt, out + 0.02, { noBottom: false });
  g.box(-w / 2 - out / 2 + 0.01, y + hgt / 2, 0, out + 0.02, hgt, d, { noBottom: false });
  g.box(w / 2 + out / 2 - 0.01, y + hgt / 2, 0, out + 0.02, hgt, d, { noBottom: false });
}
export function parapet(g, w, d, y, hgt, t, tex, tint) {
  g.mat(tex, tint);
  g.box(0, y + hgt / 2, -d / 2 + t / 2, w, hgt, t); g.box(0, y + hgt / 2, d / 2 - t / 2, w, hgt, t);
  g.box(-w / 2 + t / 2, y + hgt / 2, 0, t, hgt, d - 2 * t); g.box(w / 2 - t / 2, y + hgt / 2, 0, t, hgt, d - 2 * t);
}
/** flat roof deck with membrane layer */
export function flatRoof(g, w, d, y, tex = 'tex.concrete_cast', tint = 0x7a7874) {
  g.mat(tex, tint); g.groundAO = false;
  const t = 1 / g.tile;
  g.quadUV([-w / 2, y, d / 2], [w / 2, y, d / 2], [w / 2, y, -d / 2], [-w / 2, y, -d / 2], 0, 0, w * t, d * t);
  g.groundAO = true;
}
/** plinth: hides terrain gaps under a building on slopes */
export function plinth(g, w, d, tex = 'tex.concrete_cast', tint = 0x9a968e) {
  g.mat(tex, tint); g.box(0, -0.75, 0, w + 0.3, 1.9, d + 0.3, { noBottom: true });
}
/** rooftop clutter: AC boxes, vents, bulkhead, optional water tower and mast */
export function roofClutter(g, w, d, y, R, o = {}) {
  g.groundAO = false;
  const n = Math.min(8, Math.floor((w * d) / 220) + 1);
  g.mat('tex.metal_galvanized', 0xd8dcdc);
  for (let k = 0; k < n; k++) {
    const x = (R() - 0.5) * (w - 4), z = (R() - 0.5) * (d - 4);
    if (R() < 0.6) { g.box(x, y + 0.6, z, 1.6, 1.2, 1.1); g.cyl(x, y + 1.2, z, 0.35, 0.35, 0.15, 8); }
    else g.cyl(x, y, z, 0.25, 0.25, 1.4, 6);
  }
  if (o.bulkhead !== false && w > 10) { g.mat(o.wallTex || 'tex.concrete_cast', o.wallTint || 0xb0aca4); const bx = (R() - 0.5) * w * 0.4; g.box(bx, y + 1.5, d * 0.15, 3.2, 3, 4); g.mat('tex.concrete_cast', 0x6a6864); g.box(bx, y + 3.08, d * 0.15, 3.4, 0.16, 4.2); }
  if (o.waterTower) {
    const x = w * 0.25, z = -d * 0.2;
    g.mat('tex.metal_painted', 0x3a3a3a);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(x + sx * 1.3, y + 1.8, z + sz * 1.3, 0.16, 3.6, 0.16, { noBottom: true });
    g.mat('tex.wood_weathered_dark', 0xc8b8a0); g.cyl(x, y + 3.6, z, 1.9, 1.8, 3.4, 12);
    g.mat('tex.roof_shingle', 0x8a8a8a); g.cyl(x, y + 7.0, z, 2.0, 0.1, 1.4, 12, { noBottom: true });
  }
  if (o.mast) { g.mat('tex.metal_galvanized', 0xc0c4c8); g.cyl(o.mast[0], y, o.mast[1], 0.35, 0.08, o.mast[2], 6); }
  g.groundAO = true;
}

/** fire escape on a face (face-local): platforms per floor, railings, sloped stair flights, drop ladder */
export function fireEscape(g, cx, y0, floors, st, width = 3.2) {
  g.mat('tex.metal_painted', 0x2a2a2c); g.groundAO = false;
  const dz = -0.75, hw = width / 2;
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * st;
    g.box(cx, y, dz, width, 0.06, 1.3);
    g.box(cx, y + 1.0, dz - 0.63, width, 0.05, 0.05); g.box(cx, y + 0.5, dz - 0.63, width, 0.03, 0.03);
    for (const sx of [-1, 1]) g.box(cx + sx * hw, y + 0.5, dz, 0.05, 1.0, 1.3, { noBottom: true });
    for (let k = 0; k <= 4; k++) g.box(cx - hw + (k * width) / 4, y + 0.5, dz - 0.63, 0.04, 1.0, 0.04, { noBottom: true, noTop: true });
    if (f < floors - 1) { // stair flight to the next platform
      const ax = cx - hw + 0.35, bx = cx + hw - 0.35;
      g.beam([f % 2 ? bx : ax, y + 0.05, dz - 0.25], [f % 2 ? ax : bx, y + st, dz - 0.25], 0.5, 0.06);
      g.beam([f % 2 ? bx : ax, y + 0.9, dz - 0.5], [f % 2 ? ax : bx, y + st + 0.9, dz - 0.5], 0.04, 0.04);
    }
  }
  // drop ladder
  for (const sx of [-0.25, 0.25]) g.box(cx + hw - 0.5 + sx, y0 - 1.3, dz - 0.4, 0.05, 2.6, 0.05, { noBottom: true });
  for (let k = 0; k < 6; k++) g.box(cx + hw - 0.5, y0 - 2.4 + k * 0.42, dz - 0.4, 0.5, 0.04, 0.04);
  g.groundAO = true;
}
