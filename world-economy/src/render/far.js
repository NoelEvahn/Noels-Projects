// Far proxy (Annex B 7): whole-world terrain at 25 m with the same 8-layer splat as near chunks, LOD2 building masses (baked
// facade colour + night window pattern) and far road strips, plus an outer ring to +-6000 m that makes the world edge
// intentional: a forested mountain ring with ridges and snow to the north and east (Mt. Sable), open sea to the south and
// west fading into the horizon haze. Chunks covered by loaded meshes are masked out of the index buffers (drawn once).
import * as THREE from 'three';
import { World } from '../world/query.js';
import { terrainPre } from '../world/layout/terrain.js';
import { MatLib } from './materials/matlib.js';
import { TerrainWriter, terrainWeights } from './terrainMesh.js';
import { artGeometry, GB, appendBatch } from './geom.js';
import { Builders } from './builders.js';
import { addPartDetailed } from '../art/infra/parts.js';
import { valueNoise, fbm } from '../core/math.js';

const NC = 40;

class MaskedMesh {
  constructor(arrays, ranges, name, matId) {
    this.ranges = ranges;
    this.master = arrays.index instanceof Uint32Array ? arrays.index : Uint32Array.from(arrays.index);
    const a = { ...arrays, index: this.master.slice() };
    this.geometry = artGeometry(a);
    this.mesh = new THREE.Mesh(this.geometry, MatLib.get(matId));
    this.mesh.name = name; this.mesh.matrixAutoUpdate = false; this.mesh.frustumCulled = false; this.mesh.receiveShadow = true;
    this.visibleTris = 0;
  }
  apply(covered) {
    const out = this.geometry.index.array;
    let n = 0;
    for (let k = 0; k < NC * NC; k++) {
      if (covered[k]) continue;
      const r = this.ranges[k]; if (!r || !r[1]) continue;
      out.set(this.master.subarray(r[0], r[0] + r[1]), n); n += r[1];
    }
    this.geometry.setDrawRange(0, n);
    this.geometry.index.needsUpdate = true;
    this.visibleTris = n / 3;
  }
}

const ridged = (x, z, seed) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { const v = 1 - Math.abs(valueNoise(x * f, z * f, seed + i) * 2 - 1); s += a * v * v; a *= 0.5; f *= 2.1; } return s; };
/** outer ring height: continues the world edge, rises into a mountain ring on land, sinks into the sea elsewhere */
export function skirtHeight(x, z) {
  const cx = Math.max(-2000, Math.min(2000, x)), cz = Math.max(-2000, Math.min(2000, z));
  const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
  const base = terrainPre(cx, cz);
  let h;
  if (base > 0) {
    const ring = Math.min(1, d / 1400);
    const mount = (180 + 520 * ridged(x / 1300, z / 1300, 41)) * ring * ring * (3 - 2 * ring);
    h = base + 0.12 * d + mount + 25 * fbm(x / 300, z / 300, 3, 7) * Math.min(1, d / 200);
  } else h = base - 0.004 * d - 6 * Math.min(1, d / 300);
  const sx = x - 300, sz = z + 3600, ds = Math.hypot(sx, sz);
  const sable = 1150 * Math.pow(Math.max(0, 1 - ds / 2500), 1.6) * (0.9 + 0.2 * ridged(x / 700, z / 700, 5));
  if (sable > h) h = sable;
  return h;
}

export function buildFar(scene) {
  const group = new THREE.Group(); group.name = 'far';
  const wts = new Float32Array(8);
  // ---- terrain at 25 m, per-chunk index ranges ----------------------------------------------------------------------------
  const cells = 160, step = 25, N = cells + 1;
  const tw = new TerrainWriter(N * N + 16);
  const H = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = World.heightAt(-2000 + i * step, -2000 + j * step);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const h = H[j * N + i];
    const hl = H[j * N + Math.max(0, i - 1)], hr = H[j * N + Math.min(N - 1, i + 1)], hu = H[Math.max(0, j - 1) * N + i], hd = H[Math.min(N - 1, j + 1) * N + i];
    const dx = (hr - hl) / (2 * step), dz = (hd - hu) / (2 * step), l = Math.sqrt(dx * dx + 1 + dz * dz);
    const x = -2000 + i * step, z = -2000 + j * step;
    const tint = terrainWeights(x, z, h, Math.hypot(dx, dz), wts);
    tw.vert(x, h - 1.2, z, -dx / l, 1 / l, -dz / l, wts, tint, 1);
  }
  const ranges = [];
  const idx = [];
  for (let cz = 0; cz < NC; cz++) for (let cx = 0; cx < NC; cx++) {
    const start = idx.length;
    for (let j = cz * 4; j < cz * 4 + 4; j++) for (let i = cx * 4; i < cx * 4 + 4; i++) { const a = j * N + i, b = a + 1, c = a + N, d = c + 1; idx.push(a, c, b, b, c, d); }
    ranges[cz * NC + cx] = [start, idx.length - start];
  }
  const ta = tw.toArrays(); ta.index = Uint32Array.from(idx); ta.triangles = idx.length / 3;
  const terrain = new MaskedMesh(ta, ranges, 'far.terrain', 'mat.terrain');
  group.add(terrain.mesh);

  // ---- LOD2 masses (buildings via their LOD2 builders + infrastructure) and far road strips, grouped per chunk -----------------------------
  const D = World.data;
  const bg = new GB(1 << 16);
  const bRanges = Array.from({ length: NC * NC }, () => [0, 0]);
  const roadsBy = Array.from({ length: NC * NC }, () => []);
  for (const e of D.R.edges) {
    if (e.cls === 'path' || e.noRender) continue;
    const w = Math.max(9, e.carriage) / 2, dirt = e.surface === 'surf.dirt' || e.surface === 'surf.gravel';
    for (let i = 0; i < e.n - 1; i += 2) {
      const j = Math.min(e.n - 1, i + 2);
      const ax = e.pts[i * 3], az = e.pts[i * 3 + 2], bx = e.pts[j * 3], bz = e.pts[j * 3 + 2];
      const k = Math.min(NC - 1, Math.max(0, Math.floor(((az + bz) / 2 + 2000) / 100))) * NC + Math.min(NC - 1, Math.max(0, Math.floor(((ax + bx) / 2 + 2000) / 100)));
      roadsBy[k].push([ax, e.pts[i * 3 + 1], az, bx, e.pts[j * 3 + 1], bz, w, dirt]);
    }
  }
  const ctx = { lod: 2, seed: 0 };
  for (let k = 0; k < NC * NC; k++) {
    const start = bg.in;
    for (const r of roadsBy[k]) {
      const [ax, ay, az, bx, by, bz, w, dirt] = r;
      const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w, nz = dx / l * w;
      bg.mat(dirt ? 'tex.dirt_track' : 'tex.asphalt'); bg.groundAO = false;
      bg.quad([ax - nx, ay + 0.3, az - nz], [ax + nx, ay + 0.3, az + nz], [bx + nx, by + 0.3, bz + nz], [bx - nx, by + 0.3, bz - nz]);
      bg.groundAO = true;
    }
    for (const b of D.plByChunk[k]) {
      const fn = Builders.get(b.archetype); if (!fn) continue;
      ctx.seed = b.seed;
      const r = fn(b, ctx);
      for (const batch of r.batches) { if (r.worldSpace) appendBatch(bg, batch.geometry, 0, 0, 0, 0); else appendBatch(bg, batch.geometry, b.x, b.y, b.z, b.rotY); }
    }
    for (const e of D.partsByChunk[k]) addPartDetailed(bg, e.part, 2);
    bRanges[k] = [start, bg.in - start];
  }
  const ma = bg.toArrays(); if (!(ma.index instanceof Uint32Array)) ma.index = Uint32Array.from(ma.index);
  const masses = new MaskedMesh(ma, bRanges, 'far.masses', 'mat.world');
  group.add(masses.mesh);

  // ---- outer ring to +-6000 m (finer near the world edge) ---------------------------------------------------------------------------------------
  {
    const coords = [];
    for (let v = -6000; v < -3500; v += 250) coords.push(v);
    for (let v = -3500; v < -2600; v += 100) coords.push(v);
    for (let v = -2600; v <= 2600; v += 50) coords.push(v);
    for (let v = 2700; v <= 3500; v += 100) coords.push(v);
    for (let v = 3750; v <= 6000; v += 250) coords.push(v);
    const M = coords.length, vid = new Int32Array(M * M).fill(-1);
    const sw = new TerrainWriter(M * M);
    const getV = (i, j) => {
      const k = j * M + i;
      if (vid[k] >= 0) return vid[k];
      const x = coords[i], z = coords[j], h = skirtHeight(x, z), e = 30;
      const hx = skirtHeight(x + e, z) - skirtHeight(x - e, z), hz = skirtHeight(x, z + e) - skirtHeight(x, z - e);
      const gx = hx / (2 * e), gz = hz / (2 * e), l = Math.sqrt(gx * gx + 1 + gz * gz);
      const inside = Math.abs(x) <= 2000 && Math.abs(z) <= 2000;
      const tint = inside ? terrainWeights(x, z, h, Math.hypot(gx, gz), wts) : terrainWeights(x, z, h, Math.hypot(gx, gz), wts, false);
      vid[k] = sw.vert(x, h - 1.5, z, -gx / l, 1 / l, -gz / l, wts, tint, 1);
      return vid[k];
    };
    for (let j = 0; j < M - 1; j++) for (let i = 0; i < M - 1; i++) {
      const cxm = (coords[i] + coords[i + 1]) / 2, czm = (coords[j] + coords[j + 1]) / 2;
      if (cxm > -2000 && cxm < 2000 && czm > -2000 && czm < 2000) continue;
      const a = getV(i, j), b = getV(i + 1, j), c = getV(i, j + 1), d = getV(i + 1, j + 1);
      sw.grow(0, 6); sw.tri(a, c, b); sw.tri(b, c, d);
    }
    const sa = sw.toArrays();
    const m = new THREE.Mesh(artGeometry(sa), MatLib.get('mat.terrain')); m.name = 'far.skirt'; m.matrixAutoUpdate = false; m.frustumCulled = false; m.receiveShadow = true;
    group.add(m);
  }
  scene.add(group);
  const covered = new Uint8Array(NC * NC);
  function setCovered(mask) { covered.set(mask); terrain.apply(covered); masses.apply(covered); }
  terrain.apply(covered); masses.apply(covered);
  return { group, setCovered, terrain, masses };
}
