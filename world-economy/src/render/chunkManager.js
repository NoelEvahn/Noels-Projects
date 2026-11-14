// Chunk streaming (Annex B 7, Annex G 4.2/4.4): 100 m chunks in three LOD levels (0 detail ring, 1 near ring, 2 mid ring),
// far proxy elsewhere. Each chunk is one terrain mesh (8-layer splat) plus one merged mesh per material for roads, buildings,
// infrastructure and decoration (O1). Builds are generators run by Streaming.pump. Radii come from quality.derived()
// (governor-adjusted chunkRadii, lodBias -> detail ring). Detail and near chunks cast shadows; mid chunks do not (O7).
import * as THREE from 'three';
import { World } from '../world/query.js';
import { Builders } from './builders.js';
import { Streaming } from './streaming.js';
import { MatLib } from './materials/matlib.js';
import { TerrainWriter, addTerrainChunk, sampleTerrainChunk } from './terrainMesh.js';
import { addRoadPiece, addIntersections } from './roadGeo.js';
import { addPartDetailed } from '../art/infra/parts.js';
import { artGeometry, disposeGeometry, appendBatch, GB } from './geom.js';

const NC = 40;

export function createChunkManager({ scene, far, getRadii }) {
  const group = new THREE.Group(); group.name = 'chunks';
  scene.add(group);
  const chunks = new Map(), pending = new Map();
  let center = [-999, -999], radiiKey = '';
  const coveredMask = new Uint8Array(NC * NC);
  let farDirty = false;
  const api = { chunks, group, counts: { near: 0, mid: 0, detail: 0, pending: 0, loadedTris: 0 }, onLoaded: null, decor: null };

  function disposeRec(rec) {
    group.remove(rec.group);
    coveredMask[rec.cz * NC + rec.cx] = 0; farDirty = true;
    for (const g of rec.geoms) disposeGeometry(g);
    api.counts.loadedTris -= rec.tris;
  }
  // pooled writers (O9): one terrain writer and one GB per material id
  const tPool = [], gPool = [];
  const takeT = () => (tPool.pop() || new TerrainWriter(4096)).reset();
  const takeG = () => (gPool.pop() || new GB(8192)).reset();

  function* buildChunk(cx, cz, lod) {
    const tw = takeT(); const gbs = new Map();
    const gbFor = (id) => { let g = gbs.get(id); if (!g) { g = takeG(); gbs.set(id, g); } return g; };
    try { return yield* buildInner(tw, gbFor, gbs, cx, cz, lod); }
    finally { tPool.push(tw); for (const g of gbs.values()) gPool.push(g); }
  }
  function* buildInner(tw, gbFor, gbs, cx, cz, lod) {
    const cont = World.chunkContents(cx, cz);
    const tlod = lod <= 1 ? 0 : 1;
    const hh = sampleTerrainChunk(cx, cz, tlod);
    yield;
    addTerrainChunk(tw, cx, cz, tlod, hh);
    yield;
    const gw = gbFor('mat.world');
    addIntersections(gw, cx, cz, lod);
    for (const piece of cont.roads) addRoadPiece(gw, piece, lod);
    yield;
    let n = 0;
    const ctx = { lod, seed: 0 };
    for (const pl of cont.placements) {
      const b = Builders.get(pl.archetype);
      if (b) {
        ctx.seed = pl.seed;
        const r = b(pl, ctx);
        for (const batch of r.batches) {
          const mid = MatLib.has(batch.materialId) ? batch.materialId : 'mat.world';
          if (r.worldSpace) appendBatch(gbFor(mid), batch.geometry, 0, 0, 0, 0);
          else appendBatch(gbFor(mid), batch.geometry, pl.x, pl.y, pl.z, pl.rotY);
        }
      }
      if (++n % 4 === 0) yield;
    }
    yield;
    for (const e of cont.parts) addPartDetailed(gw, e.part, lod);
    yield;
    if (api.decor) { yield* api.decor(cx, cz, lod, gbFor); }
    const meshes = [], geoms = [];
    let tris = 0;
    const ta = tw.toArrays();
    yield;
    const tg = artGeometry(ta); geoms.push(tg); tris += ta.triangles;
    const tm = new THREE.Mesh(tg, MatLib.get('mat.terrain'));
    tm.name = `terrain.${cx}.${cz}`; tm.receiveShadow = true; tm.castShadow = lod <= 1; meshes.push(tm);
    for (const [id, g] of gbs) {
      if (g.empty) continue;
      const a = g.toArrays(); tris += a.triangles;
      const geo = artGeometry(a); geoms.push(geo);
      const m = new THREE.Mesh(geo, MatLib.get(id));
      m.name = `chunk.${cx}.${cz}.L${lod}.${id}`; m.receiveShadow = true; m.castShadow = lod <= 1 && id !== 'mat.glass';
      meshes.push(m);
      yield;
    }
    const rg = new THREE.Group(); rg.name = `chunk.${cx}.${cz}.L${lod}`; rg.matrixAutoUpdate = false;
    for (const m of meshes) { m.matrixAutoUpdate = false; m.updateMatrixWorld(); rg.add(m); }
    return { cx, cz, lod, group: rg, geoms, meshes, tris };
  }

  function enqueue(cx, cz, lod, prio) {
    const key = cz * NC + cx;
    if (pending.get(key) === lod) { Streaming.setPriority('c' + key + 'L' + lod, prio); return; }
    if (pending.has(key)) Streaming.cancel('c' + key + 'L' + pending.get(key));
    pending.set(key, lod);
    Streaming.add('c' + key + 'L' + lod, buildChunk(cx, cz, lod), prio + lod * 40, (rec) => {
      if (pending.get(key) !== lod) { for (const g of rec.geoms) disposeGeometry(g); return; }
      pending.delete(key);
      const old = chunks.get(key);
      if (old) disposeRec(old);
      chunks.set(key, rec);
      coveredMask[key] = 1;
      group.add(rec.group);
      api.counts.loadedTris += rec.tris;
      farDirty = true;
      if (api.onLoaded) api.onLoaded(rec);
    });
  }

  /** call every frame with the camera position and velocity */
  api.update = function (cam, vx = 0, vz = 0, force = false) {
    const [detail, near, mid] = getRadii();
    const rk = detail + ':' + near + ':' + mid;
    const ccx = Math.min(NC - 1, Math.max(0, Math.floor((cam.x + 2000) / 100))), ccz = Math.min(NC - 1, Math.max(0, Math.floor((cam.z + 2000) / 100)));
    const aheadX = cam.x + vx * 1.5, aheadZ = cam.z + vz * 1.5;
    const changed = ccx !== center[0] || ccz !== center[1] || rk !== radiiKey;
    if (changed || force) {
      center = [ccx, ccz]; radiiKey = rk;
      for (const [key, lod] of pending) {
        const cx = key % NC, cz = Math.floor(key / NC);
        if (Math.max(Math.abs(cx - ccx), Math.abs(cz - ccz)) > mid + 1) { Streaming.cancel('c' + key + 'L' + lod); pending.delete(key); }
      }
      for (let dz = -mid; dz <= mid; dz++) for (let dx = -mid; dx <= mid; dx++) {
        const cx = ccx + dx, cz = ccz + dz;
        if (cx < 0 || cz < 0 || cx >= NC || cz >= NC) continue;
        const key = cz * NC + cx, d = Math.max(Math.abs(dx), Math.abs(dz));
        const rec = chunks.get(key);
        let want = d <= detail ? 0 : d <= near ? 1 : 2;
        if (rec) { // hysteresis: a finer chunk stays until one ring beyond its radius
          if (rec.lod === 0 && want === 1 && d <= detail + 1) want = 0;
          if (rec.lod === 1 && want === 2 && d <= near + 1) want = 1;
        }
        if (rec && rec.lod === want && !pending.has(key)) continue;
        if (rec && rec.lod === want && pending.has(key)) { Streaming.cancel('c' + key + 'L' + pending.get(key)); pending.delete(key); continue; }
        const px = -2000 + cx * 100 + 50, pz = -2000 + cz * 100 + 50;
        enqueue(cx, cz, want, Math.hypot(px - aheadX, pz - aheadZ));
      }
      for (const [key, rec] of chunks) {
        const d = Math.max(Math.abs(rec.cx - ccx), Math.abs(rec.cz - ccz));
        if (d > mid + 1) { disposeRec(rec); chunks.delete(key); }
      }
    }
    let nd = 0, nn = 0, mm = 0;
    for (const rec of chunks.values()) { if (rec.lod === 0) nd++; else if (rec.lod === 1) nn++; else mm++; }
    api.counts.detail = nd; api.counts.near = nd + nn; api.counts.mid = mm; api.counts.pending = Streaming.size;
    if (farDirty) { farDirty = false; far.setCovered(coveredMask); }
  };
  /** rebuild everything (quality change: lodBias, draw distance) */
  api.invalidate = function () { center = [-999, -999]; for (const rec of chunks.values()) rec.lod = -1; };
  api.centerChunk = () => center.slice();
  return api;
}
