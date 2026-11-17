// Scene detail (Detail Batch 1): instanced shrubs along building fronts, water-lily pads and flowers on lake shallows, kerbside parked cars with
// colour/dirt variety, and soft contact-shadow blobs under all of them. Placement data is generated deterministically by world/layout/decor.js
// (per 100 m chunk, flat typed arrays); this module only draws what is inside the quality-scaled radius around the camera. Every type is one
// InstancedMesh (one draw call per type per LOD, no shadow cost except the nearest parked cars' bodies), lists are rebuilt when the camera moves
// > 5 m or turns > 12 degrees (CPU frustum + distance, no allocation per frame) and thinned with a per-instance hash so nothing pops. Wind sway and
// the lily bob/ripple run in the vertex shader (patches.js wind / matlib mat.waterplant); nothing here runs per-frame work beyond a distance check.
import * as THREE from 'three';
import { World } from '../world/query.js';
import { MatLib } from './materials/matlib.js';
import { Builders } from './builders.js';
import { artGeometry } from './geom.js';
import { plantGeometry } from '../art/vegetation/trees.js';
import { decalCell } from './textures/canvasTex.js';

const NC = 40;
const hash = (i) => { let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const lin = (hex) => { const f = (c) => Math.pow(c / 255, 2.2); return [f((hex >> 16) & 255), f((hex >> 8) & 255), f(hex & 255)]; };
// shrub leaf tints (multiply the broadleaf atlas colour)
const SHRUB_TINTS = [[1, 1, 1], [0.85, 1.05, 0.8], [1.2, 1.1, 0.75], [0.8, 0.92, 0.88], [1.35, 0.92, 0.8], [0.72, 0.86, 0.72], [1, 0.95, 0.9], [1.1, 1.18, 0.9]];
const PAD_TINTS = [[1, 1, 1], [0.85, 1.05, 0.85], [1.15, 1.1, 0.8], [0.75, 0.95, 0.8]];
// parked-car paint (sRGB -> linear; the carpaint layer albedo is ~0.6 so the multiplier is lifted)
const CAR_COLOURS = [0xe8e8e4, 0x1a1a1c, 0x9ea4a8, 0x5a5e62, 0xa02020, 0x2a4a8a, 0x1a2a4a, 0x2a5a3a, 0xc8b894, 0xd8b030, 0xc86a20, 0x6a1c24].map((h) => lin(h).map((v) => v * 1.55));
const CAR_KINDS = ['veh.sedan', 'veh.hatch_used', 'veh.pickup', 'veh.van'];
const TIERS = { low: { shrub: 55, pad: 70, car0: 0, car1: 70, cap0: 0 }, medium: { shrub: 80, pad: 100, car0: 20, car1: 100, cap0: 8 }, high: { shrub: 110, pad: 130, car0: 28, car1: 120, cap0: 12 }, ultra: { shrub: 150, pad: 160, car0: 36, car1: 150, cap0: 16 } };

function quadGeo(cell, vertical = false) {
  const g = new THREE.PlaneGeometry(1, 1); if (!vertical) g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, cell[0] + uv.getX(i) * (cell[2] - cell[0]), cell[1] + uv.getY(i) * (cell[3] - cell[1]));
  return g;
}
/** the decal geometry holds uvs in the atlas; the flower card gets a crossed second quad (3D from the side) */
function flowerGeo(cell) {
  const a = quadGeo(cell), b = quadGeo(cell, true); b.translate(0, 0.5, 0);
  const merged = new THREE.BufferGeometry();
  const pos = [], nrm = [], uvs = [], idx = [];
  for (const g of [a, b]) { const o = pos.length / 3; pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array); uvs.push(...g.attributes.uv.array); idx.push(...Array.from(g.index.array, (v) => v + o)); }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); merged.setIndex(idx);
  return merged;
}

export function createDetail({ scene }) {
  const group = new THREE.Group(); group.name = 'detail'; scene.add(group);
  const cfg = { detail: 1, shadows: true, tier: 'high', lodBias: 1 };
  const st = { shrubs: 0, pads: 0, flowers: 0, cars0: 0, cars1: 0, blobs: 0, dirty: true, lastPos: new THREE.Vector3(1e9, 0, 0), lastYaw: 9 };
  const mk = (geo, mat, cap, name, color = false) => {
    const m = new THREE.InstancedMesh(geo, mat, cap);
    if (color) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false; m.name = name; group.add(m); return m;
  };
  // ---- shrubs --------------------------------------------------------------------------------------------------------------------------------------
  const leafMat = MatLib.get('mat.veg_leaf');
  const shrubs = [mk(artGeometry(plantGeometry('veg.bush_a').leaf), leafMat, 1400, 'detail.shrub.a', true), mk(artGeometry(plantGeometry('veg.bush_b').leaf), leafMat, 1400, 'detail.shrub.b', true)];
  const shrubBlob = mk(quadGeo(decalCell('bushblob')), MatLib.get('mat.blob'), 1800, 'detail.shrub.blob'); shrubBlob.renderOrder = 3;
  // ---- lily pads and flowers -----------------------------------------------------------------------------------------------------------------------
  const wpMat = MatLib.get('mat.waterplant');
  const pads = mk(quadGeo(decalCell('lilypad')), wpMat, 3200, 'detail.lilypads', true), flowers = mk(flowerGeo(decalCell('lily')), wpMat, 700, 'detail.lilies', true);
  // ---- parked cars (lazy per kind and LOD) ------------------------------------------------------------------------------------------------------------
  const carSets = new Map();
  const carBlob = mk(quadGeo(decalCell('blob')), MatLib.get('mat.blob'), 320, 'detail.car.blob'); carBlob.renderOrder = 3;
  function carSet(kind, lod) {
    const key = kind + ':' + lod; let s = carSets.get(key);
    if (!s) {
      const arch = CAR_KINDS[kind], b = Builders.get(arch);
      const r = b({ archetype: arch, seed: 31 + kind * 7, x: 0, y: 0, z: 0, rotY: 0, params: { paint: 0xffffff } }, { lod });
      const cap = lod === 0 ? 24 : 90;
      s = { n: 0, meshes: r.batches.filter((x) => x.geometry.art).map((x) => ({ mat: x.materialId, mesh: mk(artGeometry(x.geometry), MatLib.get(MatLib.has(x.materialId) ? x.materialId : 'mat.world'), cap, `detail.car.${arch}.L${lod}.${x.materialId}`, x.materialId === 'mat.carpaint')})) };
      for (const m of s.meshes) if (m.mat === 'mat.carpaint' && lod === 0) m.mesh.castShadow = cfg.shadows;
      carSets.set(key, s);
    }
    return s;
  }
  // ---- update ----------------------------------------------------------------------------------------------------------------------------------------
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), sph = new THREE.Sphere();
  function fillMatrix(a, o, x, y, z, yaw, sx, sy, sz) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    a[o] = c * sx; a[o + 1] = 0; a[o + 2] = s * sx; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = sy; a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = -s * sz; a[o + 9] = 0; a[o + 10] = c * sz; a[o + 11] = 0; a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
  }
  function rebuild(camera) {
    const D = World.data.decor; if (!D || !D.shrubs) return;
    const tier = TIERS[cfg.tier], cam = camera.position, detail = cfg.detail;
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
    const R = Math.max(tier.shrub, tier.pad, tier.car1), rc = Math.ceil(R / 100), ccx = Math.floor((cam.x + 2000) / 100), ccz = Math.floor((cam.z + 2000) / 100);
    let ns = [0, 0], nb = 0, npd = 0, nfl = 0, ncb = 0;
    const carN = new Map();
    for (const set of carSets.values()) set.n = 0;
    let n0 = 0;
    const camFwd = camera.getWorldDirection(new THREE.Vector3());
    for (let z = Math.max(0, ccz - rc); z <= Math.min(NC - 1, ccz + rc); z++) for (let x = Math.max(0, ccx - rc); x <= Math.min(NC - 1, ccx + rc); x++) {
      const k = z * NC + x;
      // ---- shrubs
      const sh = D.shrubs[k];
      for (let q = 0; q < sh.length; q += 7) {
        const dx = sh[q] - cam.x, dz = sh[q + 2] - cam.z, d2 = dx * dx + dz * dz, R2 = tier.shrub * tier.shrub;
        if (d2 > R2) continue;
        const dd = Math.sqrt(d2), keep = detail * (dd < tier.shrub * 0.5 ? 1 : 1 - 0.7 * (dd / tier.shrub - 0.5) * 2);
        if (hash(q + k * 7919) >= keep) continue;
        if (dd > 9 && dx * camFwd.x + dz * camFwd.z < -0.2 * dd) continue; // behind the camera
        const t = sh[q + 3] > 0.5 ? 1 : 0, mesh = shrubs[t], i = ns[t];
        if (i >= 1400) continue;
        const sc = sh[q + 4], a = mesh.instanceMatrix.array, c = Math.cos(sh[q + 5]), sn = Math.sin(sh[q + 5]), o = i * 16;
        a[o] = c * sc; a[o + 1] = 0; a[o + 2] = -sn * sc; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = sc; a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = sn * sc; a[o + 9] = 0; a[o + 10] = c * sc; a[o + 11] = 0; a[o + 12] = sh[q]; a[o + 13] = sh[q + 1]; a[o + 14] = sh[q + 2]; a[o + 15] = 1;
        const tt = SHRUB_TINTS[sh[q + 6] & 7], ca = mesh.instanceColor.array, v = 0.92 + 0.16 * hash(q + 5); ca[i * 3] = tt[0] * v; ca[i * 3 + 1] = tt[1] * v; ca[i * 3 + 2] = tt[2] * v;
        ns[t]++;
        if (nb < 1800) { fillMatrix(shrubBlob.instanceMatrix.array, nb * 16, sh[q], sh[q + 1] + 0.08, sh[q + 2], 0, 1.7 * sc, 1, 1.7 * sc); nb++; }
      }
      // ---- lily pads and flowers
      const lp = D.lilies[k];
      for (let q = 0; q < lp.length; q += 7) {
        const dx = lp[q] - cam.x, dz = lp[q + 2] - cam.z, d2 = dx * dx + dz * dz;
        if (d2 > tier.pad * tier.pad) continue;
        const dd = Math.sqrt(d2);
        if (hash(q * 3 + k) >= detail * (dd < tier.pad * 0.5 ? 1 : 1 - 0.7 * (dd / tier.pad - 0.5) * 2)) continue;
        const flower = lp[q + 3] > 0.5, mesh = flower ? flowers : pads, i = flower ? nfl : npd;
        if (i >= (flower ? 700 : 3200)) continue;
        const sc = lp[q + 4], tt = PAD_TINTS[lp[q + 6] & 3];
        fillMatrix(mesh.instanceMatrix.array, i * 16, lp[q], lp[q + 1], lp[q + 2], lp[q + 5], flower ? 0.45 * sc : 0.62 * sc, flower ? 0.4 * sc : 1, flower ? 0.45 * sc : 0.62 * sc);
        const ca = mesh.instanceColor.array; if (flower) { ca[i * 3] = 1; ca[i * 3 + 1] = 0.96 + 0.1 * hash(q); ca[i * 3 + 2] = 0.96; } else { ca[i * 3] = tt[0]; ca[i * 3 + 1] = tt[1]; ca[i * 3 + 2] = tt[2]; }
        if (flower) nfl++; else npd++;
      }
      // ---- parked cars
      const pk = D.parked[k];
      for (let q = 0; q < pk.length; q += 7) {
        const dx = pk[q] - cam.x, dz = pk[q + 2] - cam.z, d2 = dx * dx + dz * dz;
        if (d2 > tier.car1 * tier.car1) continue;
        sph.center.set(pk[q], pk[q + 1] + 0.8, pk[q + 2]); sph.radius = 3.2;
        if (!frustum.intersectsSphere(sph)) continue;
        const dd = Math.sqrt(d2), kind = pk[q + 4] | 0;
        const lod = dd < tier.car0 && n0 < tier.cap0 ? 0 : 1;
        if (hash(q * 5 + k) >= detail * (dd < tier.car1 * 0.6 ? 1 : 1 - 0.8 * (dd / tier.car1 - 0.6) / 0.4)) continue;
        const set = carSet(kind, lod); if (set.n >= (lod === 0 ? 24 : 90)) continue;
        const col = CAR_COLOURS[pk[q + 5] | 0], dirt = 1 - 0.32 * pk[q + 6];
        for (const m of set.meshes) {
          fillMatrix(m.mesh.instanceMatrix.array, set.n * 16, pk[q], pk[q + 1], pk[q + 2], pk[q + 3], 1, 1, 1);
          if (m.mat === 'mat.carpaint') { const ca = m.mesh.instanceColor.array, o = set.n * 3; ca[o] = col[0] * dirt; ca[o + 1] = col[1] * dirt; ca[o + 2] = col[2] * dirt; }
        }
        set.n++; if (lod === 0) n0++;
        if (ncb < 320) { fillMatrix(carBlob.instanceMatrix.array, ncb * 16, pk[q], pk[q + 1] + 0.03, pk[q + 2], pk[q + 3], 1.15, 1, 2.9); ncb++; }
        carN.set(lod, (carN.get(lod) || 0) + 1);
      }
    }
    const fin = (m, n) => { m.count = n; m.visible = n > 0; if (n) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } };
    fin(shrubs[0], ns[0]); fin(shrubs[1], ns[1]); fin(shrubBlob, nb); fin(pads, npd); fin(flowers, nfl); fin(carBlob, ncb);
    for (const set of carSets.values()) for (const m of set.meshes) fin(m.mesh, set.n);
    st.shrubs = ns[0] + ns[1]; st.pads = npd; st.flowers = nfl; st.cars0 = carN.get(0) || 0; st.cars1 = carN.get(1) || 0; st.blobs = nb + ncb;
  }
  let warmI = 0;
  return {
    group, state: st,
    /** quality: {detail, shadows, tier} */
    configure(q) {
      cfg.detail = q.detail == null ? 1 : q.detail; cfg.shadows = q.shadows !== false; cfg.lodBias = q.lodBias || 1;
      cfg.tier = cfg.detail < 0.55 ? 'low' : cfg.detail < 0.85 ? 'medium' : cfg.detail < 1.1 ? 'high' : 'ultra';
      for (const set of carSets.values()) for (const m of set.meshes) if (m.mat === 'mat.carpaint' && m.mesh.name.includes('.L0.')) m.mesh.castShadow = cfg.shadows && cfg.detail >= 0.85;
      st.dirty = true;
    },
    update(camera) {
      if (warmI < 8) { carSet(warmI >> 1, warmI & 1); warmI++; } // background warm-up: one car geometry per frame so none is built mid-play
      const p = camera.position, yaw = Math.atan2(camera.matrixWorld.elements[8], camera.matrixWorld.elements[10]);
      let dy = Math.abs(yaw - st.lastYaw); if (dy > Math.PI) dy = 2 * Math.PI - dy;
      if (!st.dirty && st.lastPos.distanceToSquared(p) < 25 && dy < 0.2) return;
      st.dirty = false; st.lastPos.copy(p); st.lastYaw = yaw;
      rebuild(camera);
    },
    /** makes one instance of every lazily created mesh drawable so shader programs compile before play (renderer.compile) */
    prewarm(on) {
      for (const k of [0, 1, 2, 3]) { carSet(k, 1); }
      carSet(0, 0);
      const all = [shrubs[0], shrubs[1], shrubBlob, pads, flowers, carBlob];
      for (const set of carSets.values()) for (const m of set.meshes) all.push(m.mesh);
      for (const m of all) { m.visible = on; m.count = on ? 1 : 0; }
      if (!on) st.dirty = true;
    },
    forceRebuild() { st.dirty = true; },
  };
}
