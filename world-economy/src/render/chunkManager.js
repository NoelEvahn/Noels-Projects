// Chunk streaming (Annex B 7): 100 m chunks, LOD0 near ring, LOD1 mid ring, far proxy elsewhere. Chunk builds are generators run by Streaming.pump.
import * as THREE from 'three';
import { World } from '../world/query.js';
import { GeoBuilder } from '../blockout/geo.js';
import { Builders } from './builders.js';
import { Streaming } from './streaming.js';
import { MatLib } from './materials/matlib.js';
import { MemTracker } from './perf.js';
import { addTerrainChunk, sampleTerrainChunk } from './terrainMesh.js';
import { addRoadPiece, addIntersections } from './roadGeo.js';
import { addPart } from '../blockout/index.js';
import { treeArrays, TREE_KIND, TREE_SCALE } from '../blockout/trees.js';
import { ringRadii } from '../data/settings.js';

const NC = 40;
const KINDS = ['conifer', 'broadleaf', 'palm'];

function bufferGeometry(arr) {
  if (!(arr.index instanceof Uint16Array) && arr.position.length / 3 <= 65535) arr = { ...arr, index: Uint16Array.from(arr.index) };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(arr.normal, 3));
  g.setAttribute('color', new THREE.BufferAttribute(arr.color, 3, true));
  g.setIndex(new THREE.BufferAttribute(arr.index, 1));
  g.computeBoundingSphere();
  MemTracker.addGeometry(g);
  return g;
}

export function createChunkManager({ scene, far, settings }) {
  const group = new THREE.Group(); group.name = 'chunks';
  scene.add(group);
  const chunks = new Map();     // key -> rec
  const pending = new Map();    // key -> lod being built
  const treeGeoms = new Map();  // shared instanced geometries
  let center = [-999, -999];
  let lastFarKey = '';
  let farDirty = false;
  const api = { chunks, group, counts: { near: 0, mid: 0, pending: 0, loadedTris: 0 }, onLoaded: null };

  function treeGeom(kind) {
    let g = treeGeoms.get(kind);
    if (!g) { g = bufferGeometry(treeArrays(kind, 0)); treeGeoms.set(kind, g); }
    return g;
  }
  function disposeRec(rec) {
    group.remove(rec.group);
    for (const g of rec.geoms) { MemTracker.removeGeometry(g); g.dispose(); }
    for (const im of rec.instanced) im.dispose();
    api.counts.loadedTris -= rec.tris;
  }

  const gpool = [];
  const acquire = () => (gpool.pop() || new GeoBuilder(16384)).reset();
  const release = (g) => { gpool.push(g); };
  function* buildChunk(cx, cz, lod) {
    const g = acquire();
    try { return yield* buildChunkInner(g, cx, cz, lod); } finally { release(g); }
  }
  function* buildChunkInner(g, cx, cz, lod) {
    const D = World.data;
    const cont = World.chunkContents(cx, cz);
    const hh = sampleTerrainChunk(cx, cz, lod);
    yield;
    addTerrainChunk(g, cx, cz, lod, hh);
    yield;
    addIntersections(g, cx, cz);
    for (const piece of cont.roads) addRoadPiece(g, piece, lod);
    yield;
    let n = 0;
    for (const pl of cont.placements) {
      const b = Builders.get(pl.archetype);
      if (b) {
        const r = b(pl, { lod, seed: pl.seed });
        for (const batch of r.batches) {
          if (r.worldSpace) g.appendArrays(batch.geometry, 0, 0, 0, 0);
          else g.appendArrays(batch.geometry, pl.x, pl.y, pl.z, pl.rotY);
        }
      }
      if (++n % 6 === 0) yield;
    }
    yield;
    for (const e of cont.parts) { addPart(g, e.part); }
    // LOD1 trees are merged pyramids; LOD0 trees are instanced below
    const tr = D.trees, s = cont.trees.start, e = cont.trees.end;
    if (lod === 1) {
      for (let k = s; k < e; k++) {
        const i = tr.order[k];
        const type = tr.type[i];
        g.appendArrays(treeArrays(TREE_KIND[type], 1), tr.x[i], tr.y[i], tr.z[i], 0, TREE_SCALE[type] * tr.scale[i]);
        if (((k - s) & 31) === 31) yield;
      }
    }
    yield;
    const arr = g.toArrays16();
    yield;
    const geom = bufferGeometry(arr);
    const mesh = new THREE.Mesh(geom, MatLib.get('mat.blockout'));
    mesh.name = `chunk.${cx}.${cz}.L${lod}`;
    mesh.matrixAutoUpdate = false;
    const rg = new THREE.Group(); rg.name = mesh.name; rg.matrixAutoUpdate = false;
    rg.add(mesh);
    const rec = { cx, cz, lod, group: rg, geoms: [geom], instanced: [], tris: arr.triangles };
    if (lod === 0 && e > s) {
      const lists = [[], [], []];
      for (let k = s; k < e; k++) { const i = tr.order[k]; lists[KINDS.indexOf(TREE_KIND[tr.type[i]])].push(i); }
      for (let q = 0; q < 3; q++) {
        const L = lists[q];
        if (!L.length) continue;
        const im = new THREE.InstancedMesh(treeGeom(KINDS[q]), MatLib.get('mat.blockout_tree'), L.length);
        const m = im.instanceMatrix.array;
        for (let k = 0; k < L.length; k++) {
          const i = L[k], sc = TREE_SCALE[tr.type[i]] * tr.scale[i], c = Math.cos(tr.rot[i]), sn = Math.sin(tr.rot[i]), o = k * 16;
          m[o] = c * sc; m[o + 1] = 0; m[o + 2] = -sn * sc; m[o + 3] = 0; m[o + 4] = 0; m[o + 5] = sc; m[o + 6] = 0; m[o + 7] = 0;
          m[o + 8] = sn * sc; m[o + 9] = 0; m[o + 10] = c * sc; m[o + 11] = 0; m[o + 12] = tr.x[i]; m[o + 13] = tr.y[i]; m[o + 14] = tr.z[i]; m[o + 15] = 1;
        }
        im.instanceMatrix.needsUpdate = true;
        im.matrixAutoUpdate = false; im.computeBoundingSphere();
        im.name = `trees.${cx}.${cz}.${KINDS[q]}`;
        rg.add(im); rec.instanced.push(im);
        rec.tris += L.length * (treeGeom(KINDS[q]).index.count / 3);
        yield;
      }
    }
    return rec;
  }

  function enqueue(cx, cz, lod, prio) {
    const key = cz * NC + cx;
    if (pending.get(key) === lod) { Streaming.setPriority('c' + key + 'L' + lod, prio); return; }
    pending.set(key, lod);
    Streaming.add('c' + key + 'L' + lod, buildChunk(cx, cz, lod), prio, (rec) => {
      if (pending.get(key) !== lod) { disposeRec(rec); return; }
      pending.delete(key);
      const old = chunks.get(key);
      if (old) disposeRec(old);
      chunks.set(key, rec);
      group.add(rec.group);
      api.counts.loadedTris += rec.tris;
      farDirty = true;
      if (api.onLoaded) api.onLoaded(rec);
    });
  }

  /** call every frame with the camera position and velocity */
  api.update = function (cam, vx = 0, vz = 0, force = false) {
    const [near, mid] = ringRadii(settings.graphics.drawDistance);
    const ccx = Math.min(NC - 1, Math.max(0, Math.floor((cam.x + 2000) / 100))), ccz = Math.min(NC - 1, Math.max(0, Math.floor((cam.z + 2000) / 100)));
    const aheadX = cam.x + vx * 1.5, aheadZ = cam.z + vz * 1.5;
    const changed = ccx !== center[0] || ccz !== center[1];
    if (changed || force) {
      center = [ccx, ccz];
      // cancel pending jobs that fell out of range
      for (const [key, lod] of pending) {
        const cx = key % NC, cz = Math.floor(key / NC);
        if (Math.max(Math.abs(cx - ccx), Math.abs(cz - ccz)) > mid + 1) { Streaming.cancel('c' + key + 'L' + lod); pending.delete(key); }
      }
      for (let dz = -mid; dz <= mid; dz++) for (let dx = -mid; dx <= mid; dx++) {
        const cx = ccx + dx, cz = ccz + dz;
        if (cx < 0 || cz < 0 || cx >= NC || cz >= NC) continue;
        const key = cz * NC + cx, d = Math.max(Math.abs(dx), Math.abs(dz));
        const rec = chunks.get(key);
        let want = d <= near ? 0 : 1;
        if (rec) { // hysteresis: LOD0 chunks stay until one ring beyond
          if (rec.lod === 0 && d <= near + 1) want = 0;
          if (rec.lod === 1 && d > near) want = 1;
        }
        if (rec && rec.lod === want) continue;
        const px = -2000 + cx * 100 + 50, pz = -2000 + cz * 100 + 50;
        enqueue(cx, cz, want, Math.hypot(px - aheadX, pz - aheadZ));
      }
      for (const [key, rec] of chunks) {
        const d = Math.max(Math.abs(rec.cx - ccx), Math.abs(rec.cz - ccz));
        if (d > mid + 1) { disposeRec(rec); chunks.delete(key); farDirty = true; }
      }
    }
    let nn = 0, mm = 0;
    for (const rec of chunks.values()) { if (rec.lod === 0) nn++; else mm++; }
    api.counts.near = nn; api.counts.mid = mm; api.counts.pending = Streaming.size;
    if (farDirty && !Streaming.size) { // refresh the far mask only when the queue is idle (coalesced)
      farDirty = false;
      const keys = []; for (const [k, rec] of chunks) keys.push(k);
      const key = keys.length + ':' + center.join(',');
      if (key !== lastFarKey) { lastFarKey = key; far.setCovered(keys); }
    }
  };
  api.flush = function () { Streaming.pump(Infinity); api.update({ x: center[0] * 100 - 1950, z: center[1] * 100 - 1950 }, 0, 0); };
  api.centerChunk = () => center.slice();
  return api;
}
