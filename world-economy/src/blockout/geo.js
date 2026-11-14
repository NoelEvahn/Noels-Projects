// GeoBuilder: append-only typed-array mesh writer (Annex A 6.1). Pure (no three). Positions, normals, vertex colours, indices.
const lin = (c) => Math.pow(c / 255, 2.2);
/** sRGB hex -> linear [r,g,b] floats */
export function hexToLinear(hex) { return [lin((hex >> 16) & 255), lin((hex >> 8) & 255), lin(hex & 255)]; }
const toByte = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));

export class GeoBuilder {
  constructor(cap = 256) {
    this.vcap = cap; this.icap = cap * 3;
    this.pos = new Float32Array(this.vcap * 3); this.nrm = new Float32Array(this.vcap * 3); this.col = new Uint8Array(this.vcap * 3);
    this.idx = new Uint32Array(this.icap);
    this.vn = 0; this.in = 0;
  }
  _grow(v, i) {
    if (this.vn + v > this.vcap) {
      const nc = Math.max(this.vcap * 2, this.vn + v);
      const p = new Float32Array(nc * 3); p.set(this.pos); this.pos = p;
      const n = new Float32Array(nc * 3); n.set(this.nrm); this.nrm = n;
      const c = new Uint8Array(nc * 3); c.set(this.col); this.col = c; this.vcap = nc;
    }
    if (this.in + i > this.icap) { const ni = Math.max(this.icap * 2, this.in + i); const a = new Uint32Array(ni); a.set(this.idx); this.idx = a; this.icap = ni; }
  }
  vert(x, y, z, nx, ny, nz, r, g, b) {
    const k = this.vn * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; this.nrm[k] = nx; this.nrm[k + 1] = ny; this.nrm[k + 2] = nz;
    this.col[k] = r; this.col[k + 1] = g; this.col[k + 2] = b;
    return this.vn++;
  }
  /** colour as sRGB hex (converted to linear bytes) with a brightness multiplier */
  static rgb(hex, m = 1) { const c = hexToLinear(hex); return [toByte(c[0] * m), toByte(c[1] * m), toByte(c[2] * m)]; }
  tri(a, b, c) { this.idx[this.in++] = a; this.idx[this.in++] = b; this.idx[this.in++] = c; }
  /** flat-shaded quad (CCW seen from the normal side); v = 4 points [x,y,z] */
  quad(p0, p1, p2, p3, rgb, shade = 1) {
    this._grow(4, 6);
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const r = Math.min(255, rgb[0] * shade), g = Math.min(255, rgb[1] * shade), b = Math.min(255, rgb[2] * shade);
    const a = this.vert(p0[0], p0[1], p0[2], nx, ny, nz, r, g, b), b1 = this.vert(p1[0], p1[1], p1[2], nx, ny, nz, r, g, b);
    const c = this.vert(p2[0], p2[1], p2[2], nx, ny, nz, r, g, b), d = this.vert(p3[0], p3[1], p3[2], nx, ny, nz, r, g, b);
    this.tri(a, b1, c); this.tri(a, c, d);
  }
  triFlat(p0, p1, p2, rgb, shade = 1) {
    this._grow(3, 3);
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const r = Math.min(255, rgb[0] * shade), g = Math.min(255, rgb[1] * shade), b = Math.min(255, rgb[2] * shade);
    this.tri(this.vert(p0[0], p0[1], p0[2], nx, ny, nz, r, g, b), this.vert(p1[0], p1[1], p1[2], nx, ny, nz, r, g, b), this.vert(p2[0], p2[1], p2[2], nx, ny, nz, r, g, b));
  }
  /**
   * Oriented box. Local axes: x = width (right), y up, z = length (forward is -z). yaw: project convention (about +Y, clockwise from above).
   * pitch tilts the forward axis up. Faces are shaded per direction for readable massing.
   */
  box(cx, cy, cz, sx, sy, sz, yaw, hex, o = {}) {
    this._grow(24, 36);
    const rgb = GeoBuilder.rgb(hex, 1);
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const c = Math.cos(yaw), s = Math.sin(yaw), pc = Math.cos(o.pitch || 0), ps = Math.sin(o.pitch || 0);
    const T = (x, y, z) => { // local -> world: pitch about local X, then yaw
      const y1 = y * pc - z * ps, z1 = y * ps + z * pc; // pitch: forward (-z) rises when pitch > 0
      return [cx + x * c - z1 * s, cy + y1, cz + x * s + z1 * c];
    };
    const P = [T(-hx, -hy, -hz), T(hx, -hy, -hz), T(hx, hy, -hz), T(-hx, hy, -hz), T(-hx, -hy, hz), T(hx, -hy, hz), T(hx, hy, hz), T(-hx, hy, hz)];
    const top = o.top === undefined ? 1.12 : o.top;
    this.quad(P[3], P[7], P[6], P[2], rgb, top);          // top (+y)
    if (!o.noBottom) this.quad(P[0], P[1], P[5], P[4], rgb, 0.5); // bottom
    this.quad(P[0], P[3], P[2], P[1], rgb, 0.92);          // front (-z)
    this.quad(P[4], P[5], P[6], P[7], rgb, 0.78);          // back (+z)
    this.quad(P[0], P[4], P[7], P[3], rgb, 0.7);           // left (-x)
    this.quad(P[1], P[2], P[6], P[5], rgb, 0.85);          // right (+x)
  }
  /** vertical (optionally tapered) cylinder or cone: base centre (cx,cy0,cz), height h, radii rb/rt, n sides */
  cyl(cx, cy0, cz, rb, rt, h, hex, n = 8, o = {}) {
    this._grow(n * 4 + 2, n * 12);
    const rgb = GeoBuilder.rgb(hex, 1);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const sh = 0.75 + 0.25 * Math.cos((a0 + a1) / 2 - 0.9);
      this.quad([cx + c1 * rb, cy0, cz + s1 * rb], [cx + c0 * rb, cy0, cz + s0 * rb], [cx + c0 * rt, cy0 + h, cz + s0 * rt], [cx + c1 * rt, cy0 + h, cz + s1 * rt], rgb, sh);
      if (rt > 0.001) this.triFlat([cx, cy0 + h, cz], [cx + c1 * rt, cy0 + h, cz + s1 * rt], [cx + c0 * rt, cy0 + h, cz + s0 * rt], rgb, 1.1);
      if (!o.noBottom && rb > 0.001) this.triFlat([cx, cy0, cz], [cx + c0 * rb, cy0, cz + s0 * rb], [cx + c1 * rb, cy0, cz + s1 * rb], rgb, 0.5);
    }
  }
  /** gable roof prism over a w x d footprint (ridge along local z), eaves at cy, rise height */
  gable(cx, cy, cz, w, d, rise, yaw, hex, ridgeAlongX = false) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const T = (x, y, z) => [cx + x * c - z * s, cy + y, cz + x * s + z * c];
    const hw = w / 2, hd = d / 2;
    const rgb = GeoBuilder.rgb(hex, 1);
    if (!ridgeAlongX) {
      const A = T(-hw, 0, -hd), B = T(hw, 0, -hd), C = T(hw, 0, hd), Dd = T(-hw, 0, hd), R0 = T(0, rise, -hd), R1 = T(0, rise, hd);
      this.quad(A, Dd, R1, R0, rgb, 0.85); this.quad(B, R0, R1, C, rgb, 1.05);
      this.triFlat(B, A, R0, rgb, 0.9); this.triFlat(Dd, C, R1, rgb, 0.8);
    } else {
      const A = T(-hw, 0, -hd), B = T(hw, 0, -hd), C = T(hw, 0, hd), Dd = T(-hw, 0, hd), R0 = T(-hw, rise, 0), R1 = T(hw, rise, 0);
      this.quad(A, R0, R1, B, rgb, 0.95); this.quad(C, R1, R0, Dd, rgb, 0.8);
      this.triFlat(A, Dd, R0, rgb, 0.85); this.triFlat(C, B, R1, rgb, 0.85);
    }
  }
  /** append another builder's output transformed by (x,y,z,yaw) */
  appendArrays(a, x, y, z, yaw = 0, sc = 1) {
    const nv = a.position.length / 3;
    this._grow(nv, a.index.length);
    const c = Math.cos(yaw), s = Math.sin(yaw), base = this.vn;
    for (let i = 0; i < nv; i++) {
      const px = a.position[i * 3], py = a.position[i * 3 + 1], pz = a.position[i * 3 + 2], nx = a.normal[i * 3], ny = a.normal[i * 3 + 1], nz = a.normal[i * 3 + 2];
      const k = this.vn * 3;
      this.pos[k] = x + (px * c - pz * s) * sc; this.pos[k + 1] = y + py * sc; this.pos[k + 2] = z + (px * s + pz * c) * sc;
      this.nrm[k] = nx * c - nz * s; this.nrm[k + 1] = ny; this.nrm[k + 2] = nx * s + nz * c;
      this.col[k] = a.color[i * 3]; this.col[k + 1] = a.color[i * 3 + 1]; this.col[k + 2] = a.color[i * 3 + 2];
      this.vn++;
    }
    for (let i = 0; i < a.index.length; i++) this.idx[this.in++] = a.index[i] + base;
  }
  get empty() { return this.vn === 0; }
  toArrays() {
    return { position: this.pos.slice(0, this.vn * 3), normal: this.nrm.slice(0, this.vn * 3), color: this.col.slice(0, this.vn * 3), index: this.idx.slice(0, this.in), triangles: this.in / 3 };
  }
}
