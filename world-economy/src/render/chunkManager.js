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
  // decoration placements (world/layout/decor.js): street furniture etc., merged into the chunk batches (O1); not in the mid ring
  const dctx = { lod: 0, seed: 0 };
  api.decor = function* (cx, cz, lod, gbFor) {
    const D = World.data.decor; if (!D || lod >= 2) return;
    let n = 0; dctx.lod = lod;
    for (const it of D.byChunk[cz * NC + cx]) {
      const b = Builders.get(it.archetype); if (!b) continue;
      dctx.seed = it.seed;
      for (const batch of b(it, dctx).batches) appendBatch(gbFor(batch.geometry.art && MatLib.has(batch.materialId) ? batch.materialId : 'mat.world', batch.geometry.art ? batch.geometry.position.length / 3 : 0), batch.geometry, it.x, it.y, it.z, it.rotY);
      if (++n % 16 === 0) yield;
    }
  };

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
    // one writer per material; a writer is split at 24k vertices so each mesh finalises inside one slice and uploads < 1 MB
    let split = 0;
    // nv: vertices about to be appended; a writer never grows past 24k vertices because of one big batch (the 'final' step of a 47k writer cost 18 ms)
    const gbFor = (id, nv = 0) => { let g = gbs.get(id); if (g && g.vn > 0 && (g.vn > 24000 || g.vn + nv > 24000)) { gbs.set(id + '#' + (++split), g); g = null; } if (!g) { g = takeG(); gbs.set(id, g); } return g; };
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
    let n = 0; Streaming.phase = 'placements';
    const ctx = { lod, seed: 0 };
    for (const pl of cont.placements) {
      const b = Builders.get(pl.archetype);
      if (b) {
        ctx.seed = pl.seed;
        const r = b.gen ? yield* b.gen(pl, ctx) : b(pl, ctx);
        if (b.gen) yield;
        for (const batch of r.batches) {
          const mid = batch.geometry.art && MatLib.has(batch.materialId) ? batch.materialId : 'mat.world';
          const nv = batch.geometry.art ? batch.geometry.position.length / 3 : 0;
          if (r.worldSpace) appendBatch(gbFor(mid, nv), batch.geometry, 0, 0, 0, 0);
          else appendBatch(gbFor(mid, nv), batch.geometry, pl.x, pl.y, pl.z, pl.rotY);
        }
      }
      if (lod === 0 || ++n % 4 === 0) yield;
    }
    yield;
    // shadow proxy for the detail ring (O7): LOD1 building shells + infrastructure cast instead of LOD0 detail (layer 1 is seen
    // only by the shadow cameras); small props, decor and interiors never cast
    if (lod === 0) {
      Streaming.phase = 'shadowProxy'; const gs = gbFor('#shadow');
      for (const pl of cont.placements) {
        const b = Builders.get(pl.archetype); if (!b || pl.archetype.startsWith('veg.')) continue;
        ctx.lod = 1; ctx.seed = pl.seed;
        const r = b(pl, ctx);
        for (const batch of r.batches) if (batch.geometry.art) { if (r.worldSpace) appendBatch(gs, batch.geometry, 0, 0, 0, 0); else appendBatch(gs, batch.geometry, pl.x, pl.y, pl.z, pl.rotY); }
        if (++n % 8 === 0) yield;
      }
      ctx.lod = 0;
      for (const e of cont.parts) addPartDetailed(gs, e.part, 1);
      yield;
    }
    Streaming.phase = 'parts'; for (const e of cont.parts) addPartDetailed(gw, e.part, lod);
    yield;
    Streaming.phase = 'decor'; if (api.decor) { yield* api.decor(cx, cz, lod, gbFor); }
    const meshes = [], geoms = [];
    let tris = 0;
    Streaming.phase = 'terrainArrays'; const ta = tw.toArrays();
    yield;
    const tg = artGeometry(ta); geoms.push(tg); tris += ta.triangles;
    const tm = new THREE.Mesh(tg, MatLib.get('mat.terrain'));
    tm.name = `terrain.${cx}.${cz}`; tm.receiveShadow = true; tm.castShadow = lod === 0; meshes.push(tm);
    for (const [id, g] of gbs) {
      if (g.empty) continue;
      Streaming.phase = 'final:' + id + ':' + g.vn; const a = g.toArrays(); tris += a.triangles;
      const geo = artGeometry(a); geoms.push(geo);
      const mid = id.split('#')[0] || id;
      if (id.startsWith('#shadow')) { const m = new THREE.Mesh(geo, MatLib.get('mat.world')); m.name = `chunk.${cx}.${cz}.shadow`; m.layers.set(1); m.castShadow = true; m.receiveShadow = false; meshes.push(m); yield; continue; }
      const m = new THREE.Mesh(geo, MatLib.get(mid));
      m.name = `chunk.${cx}.${cz}.L${lod}.${id}`; m.receiveShadow = true; m.castShadow = lod === 1 && mid !== 'mat.glass';
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
