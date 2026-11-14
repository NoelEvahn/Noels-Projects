// Art GeoBuilder (Annex A 6.1): append-only typed-array mesh writer with UVs in tile units, texture layer, tint + baked AO,
// emissive code and a transform stack. Pure (no three). Output arrays are wrapped by render/ into BufferGeometry.
// Vertex layout: position f32x3, normal i8x3 (+pad), uv f32x2, tint u8x4 (rgb linear tint, a = AO), aux u8x4 (layer, layer, blend, emissive).
import { LAYERS } from './layers.js';

const lin = (c) => Math.pow(c / 255, 2.2);
export const toLin = (hex) => [lin((hex >> 16) & 255), lin((hex >> 8) & 255), lin(hex & 255)];
const B = (v) => (v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255));
/** hex sRGB -> linear tint bytes, with multiplier */
export function tintBytes(hex, m = 1) { const c = toLin(hex); return [B(c[0] * m), B(c[1] * m), B(c[2] * m)]; }
/** deterministic hash -> [0,1) */
export function h01(a, b = 0) { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
/** small seeded rng for builders */
export function srng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class GB {
  constructor(cap = 1024) {
    this.vcap = cap; this.icap = cap * 2;
    this.pos = new Float32Array(cap * 3); this.nrm = new Int8Array(cap * 4); this.uv = new Float32Array(cap * 2);
    this.tint = new Uint8Array(cap * 4); this.aux = new Uint8Array(cap * 4); this.idx = new Uint32Array(this.icap);
    this.vn = 0; this.in = 0;
    this.M = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]); this.stack = [];
    this.resetState();
  }
  resetState() { this.L = LAYERS['tex.flat'].index; this.tile = 1; this.T = [255, 255, 255]; this.ao = 1; this.E = 0; this.groundAO = true; this.uvOff = [0, 0]; return this; }
  reset() { this.vn = 0; this.in = 0; this.M.set([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]); this.stack.length = 0; return this.resetState(); }
  get empty() { return this.in === 0; }
  _grow(v, i) {
    if (this.vn + v > this.vcap) {
      const n = Math.max(this.vcap * 2, this.vn + v);
      const g = (A, k) => { const a = new A.constructor(n * k); a.set(A); return a; };
      this.pos = g(this.pos, 3); this.nrm = g(this.nrm, 4); this.uv = g(this.uv, 2); this.tint = g(this.tint, 4); this.aux = g(this.aux, 4); this.vcap = n;
    }
    if (this.in + i > this.icap) { const n = Math.max(this.icap * 2, this.in + i); const a = new Uint32Array(n); a.set(this.idx); this.idx = a; this.icap = n; }
  }
  // ---- material state ---------------------------------------------------------------------------------------------
  /** texture layer + tint (sRGB hex, 0xffffff = untinted) */
  mat(texId, tint = 0xffffff, m = 1) { const e = LAYERS[texId]; if (!e) throw new Error('layer ' + texId); this.L = e.index; this.tile = e.tile; this.T = tintBytes(tint, m); return this; }
  color(tint, m = 1) { this.T = tintBytes(tint, m); return this; }
  emit(code) { this.E = code | 0; return this; }
  // ---- transform stack ------------------------------------------------------------------------------------------------
  push() { this.stack.push(this.M.slice()); return this; }
  pop() { this.M.set(this.stack.pop()); return this; }
  _mul(a) { // M = M * a (a: 3x4 row-major [r00 r01 r02 r10 r11 r12 r20 r21 r22 tx ty tz])
    const m = this.M, r = new Float64Array(12);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = m[i * 3] * a[j] + m[i * 3 + 1] * a[3 + j] + m[i * 3 + 2] * a[6 + j];
    for (let i = 0; i < 3; i++) r[9 + i] = m[i * 3] * a[9] + m[i * 3 + 1] * a[10] + m[i * 3 + 2] * a[11] + m[9 + i];
    this.M.set(r); return this;
  }
  translate(x, y, z) { return this._mul([1, 0, 0, 0, 1, 0, 0, 0, 1, x, y, z]); }
  /** project yaw convention: rotate about +Y so that local -Z (forward) turns toward +X for positive yaw */
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return this._mul([c, 0, -s, 0, 1, 0, s, 0, c, 0, 0, 0]); }
  /** pitch: positive tilts local forward (-Z) upward */
  rotX(a) { const c = Math.cos(a), s = Math.sin(a); return this._mul([1, 0, 0, 0, c, -s, 0, s, c, 0, 0, 0]); }
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return this._mul([c, s, 0, -s, c, 0, 0, 0, 1, 0, 0, 0]); }
  scale(x, y = x, z = x) { return this._mul([x, 0, 0, 0, y, 0, 0, 0, z, 0, 0, 0]); }
  // ---- raw vertex -----------------------------------------------------------------------------------------------------
  vert(x, y, z, nx, ny, nz, u, v) {
    const m = this.M, k = this.vn;
    const X = m[0] * x + m[1] * y + m[2] * z + m[9], Y = m[3] * x + m[4] * y + m[5] * z + m[10], Z = m[6] * x + m[7] * y + m[8] * z + m[11];
    let NX = m[0] * nx + m[1] * ny + m[2] * nz, NY = m[3] * nx + m[4] * ny + m[5] * nz, NZ = m[6] * nx + m[7] * ny + m[8] * nz;
    const l = Math.hypot(NX, NY, NZ) || 1; NX /= l; NY /= l; NZ /= l;
    this.pos[k * 3] = X; this.pos[k * 3 + 1] = Y; this.pos[k * 3 + 2] = Z;
    this.nrm[k * 4] = Math.round(NX * 127); this.nrm[k * 4 + 1] = Math.round(NY * 127); this.nrm[k * 4 + 2] = Math.round(NZ * 127);
    this.uv[k * 2] = u + this.uvOff[0]; this.uv[k * 2 + 1] = v + this.uvOff[1];
    let ao = this.ao;
    if (this.groundAO) ao *= 0.55 + 0.45 * Math.min(1, Math.max(0, Y / 1.8));
    this.tint[k * 4] = this.T[0]; this.tint[k * 4 + 1] = this.T[1]; this.tint[k * 4 + 2] = this.T[2]; this.tint[k * 4 + 3] = B(ao);
    this.aux[k * 4] = this.L; this.aux[k * 4 + 1] = this.L; this.aux[k * 4 + 2] = 0; this.aux[k * 4 + 3] = this.E;
    return this.vn++;
  }
  tri(a, b, c) { this.idx[this.in++] = a; this.idx[this.in++] = b; this.idx[this.in++] = c; }
  // ---- primitives (sizes in metres; UVs in tiles of the current layer) -------------------------------------------------------
  /** planar quad p0..p3 (CCW from the front). u runs p0->p1, v runs p0->p3, in metres / tile. */
  quad(p0, p1, p2, p3, uvScale = 1) {
    this._grow(4, 6);
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const t = uvScale / this.tile, U = Math.hypot(ux, uy, uz) * t, V = Math.hypot(vx, vy, vz) * t;
    const a = this.vert(p0[0], p0[1], p0[2], nx, ny, nz, 0, 0), b = this.vert(p1[0], p1[1], p1[2], nx, ny, nz, U, 0);
    const c = this.vert(p2[0], p2[1], p2[2], nx, ny, nz, U, V), d = this.vert(p3[0], p3[1], p3[2], nx, ny, nz, 0, V);
    this.tri(a, b, c); this.tri(a, c, d);
  }
  /** axis-aligned (in the current transform) rectangle in a plane: face 'x+','x-','y+','y-','z+','z-' centred at c with size (a,b) */
  face(dir, cx, cy, cz, a, b, uo = 0, vo = 0) {
    const ha = a / 2, hb = b / 2; let P;
    switch (dir) {
      case 'z+': P = [[cx - ha, cy - hb, cz], [cx + ha, cy - hb, cz], [cx + ha, cy + hb, cz], [cx - ha, cy + hb, cz]]; break;
      case 'z-': P = [[cx + ha, cy - hb, cz], [cx - ha, cy - hb, cz], [cx - ha, cy + hb, cz], [cx + ha, cy + hb, cz]]; break;
      case 'x+': P = [[cx, cy - hb, cz + ha], [cx, cy - hb, cz - ha], [cx, cy + hb, cz - ha], [cx, cy + hb, cz + ha]]; break;
      case 'x-': P = [[cx, cy - hb, cz - ha], [cx, cy - hb, cz + ha], [cx, cy + hb, cz + ha], [cx, cy + hb, cz - ha]]; break;
      case 'y+': P = [[cx - ha, cy, cz + hb], [cx + ha, cy, cz + hb], [cx + ha, cy, cz - hb], [cx - ha, cy, cz - hb]]; break;
      default: P = [[cx - ha, cy, cz - hb], [cx + ha, cy, cz - hb], [cx + ha, cy, cz + hb], [cx - ha, cy, cz + hb]];
    }
    const o = this.uvOff; const s0 = o[0], s1 = o[1]; o[0] = s0 + uo; o[1] = s1 + vo;
    this.quad(P[0], P[1], P[2], P[3]);
    o[0] = s0; o[1] = s1;
  }
  /** box centred at (cx,cy,cz), size sx,sy,sz in the current transform. o: {noBottom, noTop, faces:'xyz...' skip set, world:true uses positional uv offsets} */
  box(cx, cy, cz, sx, sy, sz, o = {}) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, sk = o.skip || '';
    const t = 1 / this.tile;
    // uv offsets from the position so neighbouring boxes do not repeat the same texel pattern
    const ou = (cx + cz) * t, ov = (cy - hy) * t;
    if (!sk.includes('z+')) this.face('z+', cx, cy, cz + hz, sx, sy, ou - hx * t, ov);
    if (!sk.includes('z-')) this.face('z-', cx, cy, cz - hz, sx, sy, ou - hx * t, ov);
    if (!sk.includes('x+')) this.face('x+', cx + hx, cy, cz, sz, sy, ou - hz * t, ov);
    if (!sk.includes('x-')) this.face('x-', cx - hx, cy, cz, sz, sy, ou - hz * t, ov);
    if (!o.noTop && !sk.includes('y+')) this.face('y+', cx, cy + hy, cz, sx, sz, cx * t, cz * t);
    if (!o.noBottom && !sk.includes('y-')) this.face('y-', cx, cy - hy, cz, sx, sz, cx * t, cz * t);
  }
  /** box between two points (beam/strut) with square section t */
  beam(a, b, t, tb = t) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
    if (L < 1e-5) return;
    this.push().translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    const yaw = Math.atan2(dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
    this.rotY(yaw).rotX(pitch);
    this.box(0, 0, 0, t, tb, L, { noTop: false });
    this.pop();
  }
  /** vertical cylinder / cone frustum with smooth normals. base centre (cx,y0,cz), radii rb rt, height h, n sides */
  cyl(cx, y0, cz, rb, rt, h, n = 8, o = {}) {
    this._grow((n + 1) * 2 + 2 * (n + 1), n * 12);
    const t = 1 / this.tile, base = this.vn, slope = (rb - rt) / (h || 1), circ = 2 * Math.PI * Math.max(rb, rt) * t * (o.uScale || 1);
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 + (o.phase || 0), c = Math.cos(a), s = Math.sin(a);
      const nl = Math.hypot(1, slope);
      this.vert(cx + c * rb, y0, cz + s * rb, c / nl, slope / nl, s / nl, (i / n) * circ, 0);
      this.vert(cx + c * rt, y0 + h, cz + s * rt, c / nl, slope / nl, s / nl, (i / n) * circ, h * t);
    }
    for (let i = 0; i < n; i++) { const a = base + i * 2; this.tri(a, a + 1, a + 3); this.tri(a, a + 3, a + 2); }
    if (!o.noTop && rt > 0.001) this._cap(cx, y0 + h, cz, rt, n, 1, o.phase || 0);
    if (!o.noBottom && rb > 0.001) this._cap(cx, y0, cz, rb, n, -1, o.phase || 0);
  }
  _cap(cx, y, cz, r, n, up, ph) {
    this._grow(n + 1, n * 3);
    const t = 1 / this.tile, c0 = this.vert(cx, y, cz, 0, up, 0, cx * t, cz * t), b = this.vn;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + ph; this.vert(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r, 0, up, 0, (cx + Math.cos(a) * r) * t, (cz + Math.sin(a) * r) * t); }
    for (let i = 0; i < n; i++) { const a = b + i, bb = b + ((i + 1) % n); if (up > 0) this.tri(c0, bb, a); else this.tri(c0, a, bb); }
  }
  /** cylinder along an arbitrary segment a->b (pipes, cables, rails, logs) */
  tube(a, b, r0, r1 = r0, n = 6, o = {}) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
    if (L < 1e-5) return;
    this.push().translate(a[0], a[1], a[2]);
    // rotate +Y onto the segment direction
    const yaw = Math.atan2(dx, -dz), pitch = Math.atan2(Math.hypot(dx, dz), dy);
    this.rotY(yaw).rotX(-pitch);
    this.cyl(0, 0, 0, r0, r1, L, n, o);
    this.pop();
  }
  /** surface of revolution: profile [[r,y],...] around Y */
  lathe(profile, n = 12, o = {}) {
    const t = 1 / this.tile, base = this.vn, m = profile.length;
    this._grow((n + 1) * m, n * (m - 1) * 6);
    let acc = [0];
    for (let j = 1; j < m; j++) acc.push(acc[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]));
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      for (let j = 0; j < m; j++) {
        const p = profile[Math.max(0, j - 1)], q = profile[Math.min(m - 1, j + 1)];
        const dr = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dr, dy) || 1;
        const nr = dy / l, ny = -dr / l;
        this.vert(c * profile[j][0], profile[j][1], s * profile[j][0], c * nr, ny, s * nr, (i / n) * 2 * Math.PI * (o.r || 0.5) * t, acc[j] * t);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < m - 1; j++) { const a = base + i * m + j, b = a + m; this.tri(a, a + 1, b + 1); this.tri(a, b + 1, b); }
  }
  /** loft through cross sections: secs = [{z, pts:[[x,y],...]}] (same point count, ordered around), closes ring when o.closed */
  loft(secs, o = {}) {
    const m = secs[0].pts.length, ns = secs.length, t = 1 / this.tile, base = this.vn;
    const ring = o.closed !== false;
    this._grow(ns * (m + 1), ns * m * 6);
    for (let k = 0; k < ns; k++) {
      const S = secs[k], pk = secs[Math.max(0, k - 1)], nk = secs[Math.min(ns - 1, k + 1)];
      let acc = 0;
      for (let j = 0; j <= m; j++) {
        const jj = j % m, P = S.pts[jj], A = S.pts[(jj - 1 + m) % m], C = S.pts[(jj + 1) % m];
        if (j > 0) acc += Math.hypot(P[0] - S.pts[j - 1][0], P[1] - S.pts[j - 1][1]);
        // normal: cross of around-tangent and along-tangent
        const tx = C[0] - A[0], ty = C[1] - A[1];
        const az = nk.z - pk.z || 1, ax = nk.pts[jj][0] - pk.pts[jj][0], ay = nk.pts[jj][1] - pk.pts[jj][1];
        let nx = ty * az, ny = -tx * az, nz = tx * ay - ty * ax;
        if (o.flip) { nx = -nx; ny = -ny; nz = -nz; }
        this.vert(P[0], P[1], S.z, nx, ny, nz, acc * t, S.z * t);
      }
    }
    const segs = ring ? m : m - 1;
    for (let k = 0; k < ns - 1; k++) for (let j = 0; j < segs; j++) {
      const a = base + k * (m + 1) + j, b = a + (m + 1);
      if (o.flip) { this.tri(a, b, a + 1); this.tri(a + 1, b, b + 1); } else { this.tri(a, a + 1, b); this.tri(a + 1, b + 1, b); }
    }
    if (o.caps) { this._loftCap(secs[0], -1); this._loftCap(secs[ns - 1], 1); }
  }
  _loftCap(S, dir) {
    const m = S.pts.length, t = 1 / this.tile; let cx = 0, cy = 0;
    for (const p of S.pts) { cx += p[0] / m; cy += p[1] / m; }
    this._grow(m + 1, m * 3);
    const c = this.vert(cx, cy, S.z, 0, 0, dir, cx * t, cy * t), b = this.vn;
    for (const p of S.pts) this.vert(p[0], p[1], S.z, 0, 0, dir, p[0] * t, p[1] * t);
    for (let i = 0; i < m; i++) { const a = b + i, bb = b + ((i + 1) % m); if (dir > 0) this.tri(c, a, bb); else this.tri(c, bb, a); }
  }
  /** extruded polygon (XZ outline, CCW from above) from y0 to y1 with top cap */
  prism(pts, y0, y1, o = {}) {
    let A = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; A += a[0] * b[1] - b[0] * a[1]; }
    if (A > 0) pts = pts.slice().reverse();
    const n = pts.length;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; this.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]); }
    if (o.noTop) return;
    const t = 1 / this.tile, base = this.vn; this._grow(n, n * 3);
    for (const p of pts) this.vert(p[0], y1, p[1], 0, 1, 0, p[0] * t, p[1] * t);
    for (let i = 1; i < n - 1; i++) this.tri(base, base + i, base + i + 1);
  }
  /** gable roof: footprint w x d centred, eave height y, rise, ridge along z (or x), overhang */
  gable(w, d, y, rise, o = {}) {
    const ov = o.over || 0.4, hw = w / 2 + ov, hd = d / 2 + ov, alongX = !!o.alongX;
    if (!alongX) {
      this.quad([-hw, y, -hd], [-hw, y, hd], [0, y + rise, hd], [0, y + rise, -hd]);
      this.quad([hw, y, hd], [hw, y, -hd], [0, y + rise, -hd], [0, y + rise, hd]);
    } else {
      this.quad([hw, y, -hd], [-hw, y, -hd], [-hw, y + rise, 0], [hw, y + rise, 0]);
      this.quad([-hw, y, hd], [hw, y, hd], [hw, y + rise, 0], [-hw, y + rise, 0]);
    }
    if (o.gables !== false) { // gable ends (in the wall layer set by o.wall)
      const keep = [this.L, this.tile, this.T];
      if (o.wall) this.mat(o.wall, o.wallTint || 0xffffff);
      const iw = w / 2, id = d / 2;
      if (!alongX) { this._tri3([-iw, y, id], [iw, y, id], [0, y + rise, id]); this._tri3([iw, y, -id], [-iw, y, -id], [0, y + rise, -id]); }
      else { this._tri3([-iw, y, -id], [-iw, y, id], [-iw, y + rise, 0]); this._tri3([iw, y, id], [iw, y, -id], [iw, y + rise, 0]); }
      [this.L, this.tile, this.T] = keep;
    }
  }
  _tri3(a, b, c) {
    this._grow(3, 3);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, t = 1 / this.tile;
    const L = Math.hypot(ux, uy, uz) || 1, ex = ux / L, ey = uy / L, ez = uz / L;
    const uv = (p) => [((p[0] - a[0]) * ex + (p[1] - a[1]) * ey + (p[2] - a[2]) * ez) * t, (p[1] - a[1]) * t];
    const A = uv(a), Bv = uv(b), C = uv(c);
    this.tri(this.vert(a[0], a[1], a[2], nx, ny, nz, A[0], A[1]), this.vert(b[0], b[1], b[2], nx, ny, nz, Bv[0], Bv[1]), this.vert(c[0], c[1], c[2], nx, ny, nz, C[0], C[1]));
  }
  /** flat double-sided card (alpha-cut materials): centre, width, height, facing yaw */
  card(cx, cy, cz, w, h, yaw = 0, u0 = 0, v0 = 0, u1 = 1, v1 = 1) {
    this._grow(4, 6);
    const c = Math.cos(yaw), s = Math.sin(yaw), hw = w / 2, hh = h / 2;
    const ax = -c * hw, az = -s * hw, nx = -s, nz = c;
    const b = this.vn;
    this.vert(cx + ax, cy - hh, cz + az, nx, 0, nz, u0, v0); this.vert(cx - ax, cy - hh, cz - az, nx, 0, nz, u1, v0);
    this.vert(cx - ax, cy + hh, cz - az, nx, 0, nz, u1, v1); this.vert(cx + ax, cy + hh, cz + az, nx, 0, nz, u0, v1);
    this.tri(b, b + 1, b + 2); this.tri(b, b + 2, b + 3);
  }
  /** append raw arrays from another GB.toArrays() with a yaw and offset (merging into chunks) */
  append(a, x = 0, y = 0, z = 0, yaw = 0, sc = 1) {
    const nv = a.position.length / 3, ni = a.index.length;
    this._grow(nv, ni);
    const c = Math.cos(yaw), s = Math.sin(yaw), base = this.vn;
    const P = a.position, N = a.normal, k0 = this.vn;
    for (let i = 0; i < nv; i++) {
      const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2], k = k0 + i;
      this.pos[k * 3] = x + (px * c - pz * s) * sc; this.pos[k * 3 + 1] = y + py * sc; this.pos[k * 3 + 2] = z + (px * s + pz * c) * sc;
      const nx = N[i * 4], nz = N[i * 4 + 2];
      this.nrm[k * 4] = Math.round(nx * c - nz * s); this.nrm[k * 4 + 1] = N[i * 4 + 1]; this.nrm[k * 4 + 2] = Math.round(nx * s + nz * c);
    }
    this.uv.set(a.uv, k0 * 2); this.tint.set(a.tint, k0 * 4); this.aux.set(a.aux, k0 * 4);
    this.vn += nv;
    const I = a.index; for (let i = 0; i < ni; i++) this.idx[this.in++] = I[i] + base;
  }
  toArrays() {
    const n = this.vn, a = { position: this.pos.slice(0, n * 3), normal: this.nrm.slice(0, n * 4), uv: this.uv.slice(0, n * 2), tint: this.tint.slice(0, n * 4), aux: this.aux.slice(0, n * 4), triangles: this.in / 3 };
    if (n <= 65535) { const ix = new Uint16Array(this.in); for (let i = 0; i < this.in; i++) ix[i] = this.idx[i]; a.index = ix; } else a.index = this.idx.slice(0, this.in);
    a.art = true;
    return a;
  }
}
/** builder output helper: one batch per material id from a map {materialId: GB} */
export function out(map, extra = {}) {
  const batches = [];
  for (const id in map) if (map[id] && !map[id].empty) batches.push({ geometry: map[id].toArrays(), materialId: id });
  return { batches, ...extra };
}
