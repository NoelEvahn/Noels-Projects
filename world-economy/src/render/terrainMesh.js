// Terrain chunks (Annex A 6.3): heightfield meshes with an 8-layer splat (grass, forest floor, rock, sand, dirt, mud, gravel,
// snow) chosen by region, height, slope and noise; per-vertex tint (biome colour variation) and AO; skirts hide LOD cracks.
// Pure JS arrays (no three); wrapped into BufferGeometry by the chunk manager. Also used by the far proxy.
import { World } from '../world/query.js';
import { regionAt } from '../world/layout/regions.js';
import { valueNoise, fbm } from '../core/math.js';
import { LAKE, waterBodyAt } from '../world/layout/water.js';

const CHUNK = 100;
const lin = (c) => Math.pow(c / 255, 2.2);
const T = (hex) => [lin((hex >> 16) & 255), lin((hex >> 8) & 255), lin(hex & 255)].map((v) => v / lin(0xc8));
const TINT = { base: T(0xc8c8c8), dryCity: T(0xd0c8b4), lush: T(0xb8ccb0), sea: T(0x7a9a90), lakebed: T(0x6a6a58), autumn: T(0xd4c4a4), coastal: T(0xd8d0b8) };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const TIMBER = [1150, -1300];

/** terrain weights for slots [grass, forest, rock, sand, dirt, mud, gravel, snow] into w (Float32Array(8)); returns a tint key */
export function terrainWeights(x, z, h, slope, w, inWorld = true) {
  w.fill(0);
  const n1 = fbm(x / 60, z / 60, 3, 11), n2 = valueNoise(x / 17, z / 17, 23);
  let tint = TINT.base;
  if (!inWorld) {
    if (h > 720 + 60 * n1) { w[7] = 1; }
    else if (h > 420) { w[2] = 0.7; w[1] = 0.3; }
    else if (h > 150) { w[1] = 0.7; w[0] = 0.3; tint = TINT.lush; }
    else { w[0] = 0.8; w[1] = 0.2; }
    if (h < 3) { w.fill(0); w[3] = 1; }
    const r = sm(0.5, 0.9, slope); for (let i = 0; i < 8; i++) w[i] *= 1 - r; w[2] += r;
    return tint;
  }
  const reg = regionAt(x, z);
  if (h < -0.2) {
    const river = x > -1900 && x < -250 && z < 1150 && h > -9 && Math.abs(x + 350) < 150;
    w[3] = 0.6; w[4] = river ? 0.4 : 0.1; w[2] = river ? 0 : 0.3 * sm(0.4, 0.8, n1);
    return TINT.sea;
  }
  if (h < LAKE.level + 0.1 && h > LAKE.level - 20 && x < -700 && x > -1700 && z < -700 && z > -1500 && waterBodyAt(x, z)) { w[4] = 0.6; w[5] = 0.4; return TINT.lakebed; }
  if (reg === 'forest') {
    if (h > 170) { w[0] = 0.55 + 0.3 * n1; w[2] = 0.45 - 0.3 * n1; }
    else { w[1] = 0.7 + 0.3 * n1; w[0] = 0.3 * (1 - n1) * sm(0.3, 0.7, n2); }
    const dy = Math.hypot(x - TIMBER[0], z - TIMBER[1]);
    if (dy < 75) { const k = sm(75, 40, dy); w[5] += 0.7 * k * (0.6 + 0.4 * n2); w[4] += 0.4 * k; w[1] *= 1 - k; }
    tint = TINT.lush;
  } else if (reg === 'lake') {
    if (h < 41.2 && h > 38.5) { w[3] = 0.5; w[4] = 0.5; tint = TINT.autumn; }
    else if (z < -900) { w[1] = 0.55 + 0.35 * n1; w[0] = 0.45 - 0.35 * n1; tint = TINT.lush; }
    else { w[0] = 0.8; w[1] = 0.2 * n1; }
  } else if (reg === 'ocean') {
    if (h < 3.4) { w[3] = 1; tint = TINT.coastal; }
    else if (x < -1400 && z > 900) { w[0] = 0.6; w[3] = 0.4 * (0.5 + n2); tint = TINT.coastal; }
    else { w[0] = 0.85; w[4] = 0.15 * n2; }
  } else {
    if (h < 3.4) { w[3] = 0.7; w[6] = 0.3; tint = TINT.coastal; }
    else if (x > -170 && x < 1110 && z > -260 && z < 960) { w[6] = 0.45 + 0.3 * n1; w[0] = 0.55 - 0.3 * n1; w[4] = 0.15 * n2; tint = TINT.dryCity; }
    else { w[0] = 0.85; w[4] = 0.15 * n2; }
  }
  const r = sm(0.55, 0.95, slope);
  if (r > 0) { for (let i = 0; i < 8; i++) w[i] *= 1 - r; w[2] += r; }
  return tint;
}

/** typed-array writer for terrain vertices (position, normal i8x4, uv, tint u8x4, w0 u8x4, w1 u8x4) */
export class TerrainWriter {
  constructor(cap = 2048) { this.vn = 0; this.in = 0; this._alloc(cap); this.idx = new Uint32Array(cap * 6); }
  _alloc(n) {
    const old = this.vcap ? { p: this.pos, n: this.nrm, u: this.uv, t: this.tint, a: this.w0, b: this.w1 } : null;
    this.pos = new Float32Array(n * 3); this.nrm = new Int8Array(n * 4); this.uv = new Float32Array(n * 2); this.tint = new Uint8Array(n * 4); this.w0 = new Uint8Array(n * 4); this.w1 = new Uint8Array(n * 4);
    if (old) { this.pos.set(old.p); this.nrm.set(old.n); this.uv.set(old.u); this.tint.set(old.t); this.w0.set(old.a); this.w1.set(old.b); }
    this.vcap = n;
  }
  reset() { this.vn = 0; this.in = 0; return this; }
  grow(v, i) {
    if (this.vn + v > this.vcap) this._alloc(Math.max(this.vcap * 2, this.vn + v));
    if (this.in + i > this.idx.length) { const a = new Uint32Array(Math.max(this.idx.length * 2, this.in + i)); a.set(this.idx); this.idx = a; }
  }
  vert(x, y, z, nx, ny, nz, w, tint, ao) {
    const k = this.vn;
    this.pos[k * 3] = x; this.pos[k * 3 + 1] = y; this.pos[k * 3 + 2] = z;
    this.nrm[k * 4] = Math.round(nx * 127); this.nrm[k * 4 + 1] = Math.round(ny * 127); this.nrm[k * 4 + 2] = Math.round(nz * 127);
    this.uv[k * 2] = x / 4; this.uv[k * 2 + 1] = z / 4;
    let s = 0; for (let i = 0; i < 8; i++) s += w[i]; s = s || 1;
    for (let i = 0; i < 4; i++) { this.w0[k * 4 + i] = Math.round(w[i] / s * 255); this.w1[k * 4 + i] = Math.round(w[i + 4] / s * 255); }
    const B = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
    this.tint[k * 4] = B(tint[0] * 0.78); this.tint[k * 4 + 1] = B(tint[1] * 0.78); this.tint[k * 4 + 2] = B(tint[2] * 0.78); this.tint[k * 4 + 3] = B(ao);
    return this.vn++;
  }
  copyVert(src, dy) {
    const k = this.vn;
    this.pos[k * 3] = this.pos[src * 3]; this.pos[k * 3 + 1] = this.pos[src * 3 + 1] + dy; this.pos[k * 3 + 2] = this.pos[src * 3 + 2];
    for (let i = 0; i < 4; i++) { this.nrm[k * 4 + i] = this.nrm[src * 4 + i]; this.tint[k * 4 + i] = this.tint[src * 4 + i]; this.w0[k * 4 + i] = this.w0[src * 4 + i]; this.w1[k * 4 + i] = this.w1[src * 4 + i]; }
    this.uv[k * 2] = this.uv[src * 2]; this.uv[k * 2 + 1] = this.uv[src * 2 + 1] + dy / 4;
    return this.vn++;
  }
  tri(a, b, c) { this.idx[this.in++] = a; this.idx[this.in++] = b; this.idx[this.in++] = c; }
  toArrays() {
    const n = this.vn, a = { position: this.pos.slice(0, n * 3), normal: this.nrm.slice(0, n * 4), uv: this.uv.slice(0, n * 2), tint: this.tint.slice(0, n * 4), w0: this.w0.slice(0, n * 4), w1: this.w1.slice(0, n * 4), triangles: this.in / 3 };
    a.index = n <= 65535 ? Uint16Array.from(this.idx.subarray(0, this.in)) : this.idx.slice(0, this.in);
    return a;
  }
}

/** phase 1: sample heights (with a 1-cell border for normals) */
export function sampleTerrainChunk(cx, cz, lod) {
  const x0 = -2000 + cx * CHUNK, z0 = -2000 + cz * CHUNK;
  const n = lod === 0 ? 25 : 8;
  const step = CHUNK / n;
  const hh = new Float32Array((n + 3) * (n + 3));
  const W2 = n + 3;
  for (let j = -1; j <= n + 1; j++) for (let i = -1; i <= n + 1; i++) hh[(j + 1) * W2 + (i + 1)] = World.heightAt(x0 + i * step, z0 + j * step);
  return hh;
}
const wTmp = new Float32Array(8);
/** appends the terrain of chunk (cx,cz) to writer t; lod 0 = 4 m cells, lod 1 = 12.5 m cells */
export function addTerrainChunk(t, cx, cz, lod, hh) {
  const x0 = -2000 + cx * CHUNK, z0 = -2000 + cz * CHUNK;
  const n = lod === 0 ? 25 : 8;
  const step = CHUNK / n, W2 = n + 3;
  if (!hh) hh = sampleTerrainChunk(cx, cz, lod);
  t.grow((n + 1) * (n + 1) + 4 * (n + 1), n * n * 6 + 4 * n * 6);
  const base = t.vn;
  const skirt = lod === 0 ? 6 : 14;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const h = hh[(j + 1) * W2 + (i + 1)];
    const dx = (hh[(j + 1) * W2 + (i + 2)] - hh[(j + 1) * W2 + i]) / (2 * step), dz = (hh[(j + 2) * W2 + (i + 1)] - hh[j * W2 + (i + 1)]) / (2 * step);
    const l = Math.sqrt(dx * dx + 1 + dz * dz);
    const x = x0 + i * step, z = z0 + j * step;
    // concavity AO: lower than the neighbour average -> darker
    const avg = (hh[(j + 1) * W2 + (i + 2)] + hh[(j + 1) * W2 + i] + hh[(j + 2) * W2 + (i + 1)] + hh[j * W2 + (i + 1)]) / 4;
    const ao = Math.max(0.55, Math.min(1, 1 - (avg - h) * 0.12));
    const tint = terrainWeights(x, z, h, Math.hypot(dx, dz), wTmp);
    t.vert(x, h, z, -dx / l, 1 / l, -dz / l, wTmp, tint, ao);
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = base + j * (n + 1) + i, b = a + 1, c = a + (n + 1), d = c + 1;
    t.tri(a, c, b); t.tri(b, c, d);
  }
  const edge = (iFn, jFn) => {
    const sk = [];
    for (let k = 0; k <= n; k++) { const vi = base + jFn(k) * (n + 1) + iFn(k); sk.push([vi, t.copyVert(vi, -skirt)]); }
    for (let k = 0; k < n; k++) { t.tri(sk[k][0], sk[k][1], sk[k + 1][0]); t.tri(sk[k + 1][0], sk[k][1], sk[k + 1][1]); t.tri(sk[k][0], sk[k + 1][0], sk[k][1]); t.tri(sk[k + 1][0], sk[k + 1][1], sk[k][1]); }
  };
  edge((k) => k, () => 0); edge((k) => k, () => n); edge(() => 0, (k) => k); edge(() => n, (k) => k);
}
