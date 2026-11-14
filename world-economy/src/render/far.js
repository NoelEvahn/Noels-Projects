// Far proxy (Annex B 7): whole-world terrain at 25 m, merged LOD2 building masses and infrastructure boxes, plus the +-6000 m skirt
// with Mt. Sable. Chunks covered by loaded near/mid meshes are masked out of the index buffers so nothing is drawn twice.
import * as THREE from 'three';
import { World } from '../world/query.js';
import { GeoBuilder } from '../blockout/geo.js';
import { terrainRgb } from './terrainMesh.js';
import { terrainPre } from '../world/layout/terrain.js';
import { addPart } from '../blockout/index.js';
import { MatLib } from './materials/matlib.js';
import { MemTracker } from './perf.js';
import { ARCHETYPES } from '../world/archetypes.js';
import { hash2 } from '../core/rng.js';

const NC = 40;

class MaskedMesh {
  constructor(geo, ranges, name) {
    this.ranges = ranges; // per chunk: [start,count] into the master index array
    this.master = geo.idx.slice(0, geo.in);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(geo.pos.slice(0, geo.vn * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(geo.nrm.slice(0, geo.vn * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(geo.col.slice(0, geo.vn * 3), 3, true));
    g.setIndex(new THREE.BufferAttribute(this.master.slice(), 1));
    g.computeBoundingSphere();
    MemTracker.addGeometry(g);
    this.geometry = g;
    this.mesh = new THREE.Mesh(g, MatLib.get('mat.blockout_far'));
    this.mesh.name = name; this.mesh.matrixAutoUpdate = false; this.mesh.frustumCulled = false;
    this.visibleTris = 0;
  }
  apply(covered) {
    const out = this.geometry.index.array;
    let n = 0;
    for (let k = 0; k < NC * NC; k++) {
      if (covered[k]) continue;
      const [s, c] = this.ranges[k];
      if (!c) continue;
      out.set(this.master.subarray(s, s + c), n); n += c;
    }
    this.geometry.setDrawRange(0, n);
    this.geometry.index.needsUpdate = true;
    this.visibleTris = n / 3;
  }
}

function skirtHeight(x, z) {
  const cx = Math.max(-2000, Math.min(2000, x)), cz = Math.max(-2000, Math.min(2000, z));
  const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
  const base = terrainPre(cx, cz);
  let h = base > 0 ? base + 0.16 * d + 0.00004 * d * d : base - 0.002 * d;
  const sx = x - 300, sz = z + 3600, ds = Math.hypot(sx, sz);
  const sable = 1150 * Math.pow(Math.max(0, 1 - ds / 2500), 1.6);
  if (sable > h) h = sable;
  return h;
}
const SNOW = GeoBuilder.rgb(0xf2f4f6, 1), ROCKC = GeoBuilder.rgb(0x6f6d68, 1), FOREST = GeoBuilder.rgb(0x2f4a33, 1), SEA = GeoBuilder.rgb(0x6f7f7f, 1), GRASS = GeoBuilder.rgb(0x5f7a48, 1);

export function buildFar(scene) {
  const group = new THREE.Group(); group.name = 'far';
  // ---- terrain at 25 m, per-chunk index ranges --------------------------------------------------------------------------------
  const cells = 160, step = 25, N = cells + 1;
  const g = new GeoBuilder(N * N + 16);
  const H = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = World.heightAt(-2000 + i * step, -2000 + j * step);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const h = H[j * N + i];
    const hl = H[j * N + Math.max(0, i - 1)], hr = H[j * N + Math.min(N - 1, i + 1)], hu = H[Math.max(0, j - 1) * N + i], hd = H[Math.min(N - 1, j + 1) * N + i];
    const dx = (hr - hl) / (2 * step), dz = (hd - hu) / (2 * step), l = Math.sqrt(dx * dx + 1 + dz * dz);
    const rgb = terrainRgb(-2000 + i * step, -2000 + j * step, h, Math.hypot(dx, dz));
    g.vert(-2000 + i * step, h - 1.2, -2000 + j * step, -dx / l, 1 / l, -dz / l, rgb[0], rgb[1], rgb[2]);
  }
  const ranges = [];
  const idxAll = [];
  for (let cz = 0; cz < NC; cz++) for (let cx = 0; cx < NC; cx++) {
    const start = idxAll.length;
    for (let j = cz * 4; j < cz * 4 + 4; j++) for (let i = cx * 4; i < cx * 4 + 4; i++) {
      const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
      idxAll.push(a, c, b, b, c, d);
    }
    ranges[cz * NC + cx] = [start, idxAll.length - start];
  }
  g.idx = Uint32Array.from(idxAll); g.in = idxAll.length;
  const terrain = new MaskedMesh(g, ranges, 'far.terrain');
  group.add(terrain.mesh);

  // ---- LOD2 masses (buildings + infrastructure boxes), grouped per chunk ---------------------------------------------------------
  const D = World.data;
  const bg = new GeoBuilder(1 << 15);
  const bRanges = Array.from({ length: NC * NC }, () => [0, 0]);
  const byChunk = Array.from({ length: NC * NC }, () => []);
  for (let k = 0; k < NC * NC; k++) { for (const b of D.plByChunk[k]) byChunk[k].push({ b }); for (const e of D.partsByChunk[k]) byChunk[k].push({ part: e.part }); }
  for (let k = 0; k < NC * NC; k++) {
    if (!byChunk[k].length) continue;
    const start = bg.in;
    for (const it of byChunk[k]) {
      if (it.b) {
        const b = it.b, A = ARCHETYPES[b.archetype];
        const col = (A.color || 0x888888);
        if (A.round) bg.cyl(b.x, b.y, b.z, b.params.w / 2, b.params.w / 3, b.params.h, col, 8);
        else bg.box(b.x, b.y + b.params.h / 2, b.z, b.params.w, b.params.h, b.params.d, b.rotY, col);
      } else addPart(bg, it.part);
    }
    bRanges[k] = [start, bg.in - start];
  }
  const masses = new MaskedMesh(bg, bRanges, 'far.masses');
  group.add(masses.mesh);

  // ---- skirt ring to +-6000 m ------------------------------------------------------------------------------------------------------------
  {
    const sc = 60, ss = 200, sg = new GeoBuilder(sc * sc);
    const SN = sc + 1, vid = new Int32Array(SN * SN).fill(-1);
    const getV = (i, j) => {
      const k = j * SN + i;
      if (vid[k] >= 0) return vid[k];
      const x = -6000 + i * ss, z = -6000 + j * ss, h = skirtHeight(x, z);
      const e = 40; const hx = skirtHeight(x + e, z) - skirtHeight(x - e, z), hz = skirtHeight(x, z + e) - skirtHeight(x, z - e);
      const l = Math.sqrt(hx * hx / (4 * e * e) + 1 + hz * hz / (4 * e * e));
      let rgb;
      if (h < 0) rgb = SEA; else if (h > 700) rgb = SNOW; else if (h > 420) rgb = ROCKC; else if (z < -2000 || x > 2000) rgb = h > 160 ? FOREST : GRASS; else rgb = GRASS;
      vid[k] = sg.vert(x, h - 1.5, z, -hx / (2 * e) / l, 1 / l, -hz / (2 * e) / l, rgb[0], rgb[1], rgb[2]);
      return vid[k];
    };
    for (let j = 0; j < sc; j++) for (let i = 0; i < sc; i++) {
      const cxm = -6000 + (i + 0.5) * ss, czm = -6000 + (j + 0.5) * ss;
      if (cxm > -2000 && cxm < 2000 && czm > -2000 && czm < 2000) continue;
      const a = getV(i, j), b = getV(i + 1, j), c = getV(i, j + 1), d = getV(i + 1, j + 1);
      sg._grow(0, 6); sg.tri(a, c, b); sg.tri(b, c, d);
    }
    const arr = sg.toArrays();
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(arr.position, 3)); geom.setAttribute('normal', new THREE.BufferAttribute(arr.normal, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(arr.color, 3, true)); geom.setIndex(new THREE.BufferAttribute(arr.index, 1));
    geom.computeBoundingSphere(); MemTracker.addGeometry(geom);
    const m = new THREE.Mesh(geom, MatLib.get('mat.blockout_far')); m.name = 'far.skirt'; m.matrixAutoUpdate = false; m.frustumCulled = false;
    group.add(m);
  }
  scene.add(group);
  const covered = new Uint8Array(NC * NC);
  function setCovered(keys) {
    covered.fill(0);
    for (const k of keys) covered[k] = 1;
    terrain.apply(covered); masses.apply(covered);
  }
  terrain.apply(covered); masses.apply(covered);
  void hash2;
  return { group, setCovered, terrain, masses };
}
