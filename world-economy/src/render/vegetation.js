// Vegetation system (Annex A 8, Annex G 2.3/3.3): instanced trees in three LODs with per-preset caps, impostors beyond, and a
// ground-cover ring. LOD0/LOD1 lists are rebuilt when the camera moves > 6 m or turns > 12 deg (CPU frustum + distance, no
// allocation); the LOD0/LOD1 radii adapt so the counts stay under the caps. Impostors are runtime-baked (8 yaw angles per
// species, one atlas) and drawn per 400 m block (frustum-culled InstancedMeshes, built by Streaming jobs). Trees keep a
// deterministic hash < vegetationDensity. Ground cover (grass, ferns, reeds) is scattered per chunk from the terrain splat
// weights, cached, and drawn within groundCoverRadius. Wind is a vertex-shader sway (patches.js), never CPU work.
import * as THREE from 'three';
import { World } from '../world/query.js';
import { MatLib } from './materials/matlib.js';
import { Streaming } from './streaming.js';
import { MemTracker } from './perf.js';
import { treeGeometry, plantGeometry } from '../art/vegetation/trees.js';
import { TREE_TYPES } from '../world/layout/vegetation.js';
import { artGeometry } from './geom.js';
import { terrainWeights } from './terrainMesh.js';
import { leafCell } from './textures/canvasTex.js';
import { valueNoise } from '../core/math.js';
import { LAKE } from '../world/layout/water.js';

const NC = 40, NS = TREE_TYPES.length, ATL = 8; // atlas: 8 species rows x 8 yaw columns
const keepHash = (i) => { let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const IMP_VS = /* glsl */`
attribute float aSpecies; uniform float uNear, uCell; varying vec2 vUv; varying vec3 vWPos; varying float vFade;
void main(){
  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float sc = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
  float yaw = atan(instanceMatrix[0][2], instanceMatrix[0][0]);
  vec3 toCam = cameraPosition - ip; float d = length(toCam.xz);
  vFade = d - uNear;
  vec2 dir = toCam.xz / max(d, 1e-3);
  vec3 right = vec3(dir.y, 0.0, -dir.x);
  float H = position.y; // geometry: unit quad x in [-0.5,0.5], y in [0,1]; species height in uv.y-free attribute via scale
  vec3 wp = ip + right * position.x * sc * uCell + vec3(0.0, position.y * sc, 0.0);
  float ang = atan(dir.x, dir.y) + yaw; float col = mod(floor(ang / 6.2831853 * 8.0 + 0.5), 8.0);
  vUv = vec2((col + position.x + 0.5) / 8.0, (aSpecies + position.y) / 8.0);
  vWPos = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const IMP_FS = /* glsl */`
uniform sampler2D tAtlas; uniform vec3 uLight, fogColor, uSunDir, uSunFog; uniform float fogDensity, uFogBase, uFogFall, uFogStart;
varying vec2 vUv; varying vec3 vWPos; varying float vFade;
void main(){
  vec4 c = texture2D(tAtlas, vUv);
  float dith = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  if (c.a < 0.5 || vFade < dith * 20.0) discard;
  vec3 col = c.rgb * uLight;
  vec3 fv = vWPos - cameraPosition; float fd = length(fv); vec3 fdir = fv / max(fd, 1e-3);
  float y0 = max(cameraPosition.y - uFogBase, -40.0); float kd = clamp(uFogFall * fv.y, -30.0, 30.0); float t = abs(kd) > 1e-3 ? (1.0 - exp(-kd)) / kd : 1.0;
  float amt = 1.0 - exp(-fogDensity * exp(-uFogFall * y0) * t * max(fd - uFogStart, 0.0));
  col = mix(col, mix(fogColor, uSunFog, pow(max(dot(fdir, uSunDir), 0.0), 8.0) * 0.6), clamp(amt, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

export function createVegetation({ scene, renderer }) {
  const D = World.data, T = D.trees;
  const group = new THREE.Group(); group.name = 'vegetation'; scene.add(group);
  const cfg = { density: 1, cap0: 300, cap1: 2500, gcRadius: 60, lodBias: 1, mid: 8, shadows: true };
  const st = { R0: 110, R1: 320, count0: 0, count1: 0, impostors: 0, gc: 0, lastPos: new THREE.Vector3(1e9, 0, 0), lastYaw: 9, dirty: true };
  // ---- species instanced meshes (LOD0, LOD1; bark + leaf) ----------------------------------------------------------------------------------
  const barkMat = MatLib.get('mat.veg_bark'), leafMat = MatLib.get('mat.veg_leaf');
  const sets = [[], []]; // [lod][species] = {bark, leaf, count, cap}
  function makeSet(lod, cap) {
    for (let s = 0; s < NS; s++) {
      const old = sets[lod][s];
      if (old) { group.remove(old.bark, old.leaf); old.bark.dispose(); old.leaf.dispose(); }
      const g = treeGeometry(TREE_TYPES[s], lod);
      const bg = old ? old.bg : artGeometry(g.bark), lg = old ? old.lg : artGeometry(g.leaf);
      const bark = new THREE.InstancedMesh(bg, barkMat, cap), leaf = new THREE.InstancedMesh(lg, leafMat, cap);
      leaf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      for (const m of [bark, leaf]) { m.count = 0; m.frustumCulled = false; m.castShadow = cfg.shadows && lod === 0; m.receiveShadow = true; m.matrixAutoUpdate = false; m.name = `veg.${TREE_TYPES[s]}.L${lod}`; group.add(m); }
      sets[lod][s] = { bark, leaf, bg, lg, cap, count: 0, height: g.height };
    }
  }
  // ---- impostor atlas bake ---------------------------------------------------------------------------------------------------------------------
  let atlasRT = null;
  function bakeImpostors(size) {
    if (atlasRT) { MemTracker.removeRenderTarget(atlasRT); atlasRT.dispose(); }
    atlasRT = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
    atlasRT.texture.colorSpace = THREE.SRGBColorSpace;
    MemTracker.addRenderTarget(atlasRT, size, size, 4 * 1.33);
    const bs = new THREE.Scene();
    bs.add(new THREE.HemisphereLight(0xc8d8f0, 0x5a5040, 1.4));
    const dl = new THREE.DirectionalLight(0xfff4e0, 2.2); dl.position.set(0.4, 1, 0.6); bs.add(dl);
    const leafAtlas = leafMat.map;
    const bm = new THREE.MeshLambertMaterial({ color: 0x5a4636 }), lm = new THREE.MeshLambertMaterial({ map: leafAtlas, alphaTest: 0.45, side: THREE.DoubleSide });
    const cam = new THREE.OrthographicCamera(-1, 1, 1, 0, 0.1, 200);
    const prevRT = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
    renderer.setRenderTarget(atlasRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.autoClear = false;
    const cell = size / ATL;
    for (let s = 0; s < NS; s++) {
      const g = treeGeometry(TREE_TYPES[s], 0);
      const holder = new THREE.Group(); bs.add(holder);
      const bmesh = new THREE.Mesh(artGeometry(g.bark, false), bm), lmesh = new THREE.Mesh(artGeometry(g.leaf, false), lm);
      holder.add(bmesh, lmesh);
      const H = g.height, half = H * 0.5; // card width = H (uCell = 1 in units of height)
      cam.left = -half; cam.right = half; cam.top = H; cam.bottom = 0; cam.updateProjectionMatrix();
      for (let a = 0; a < ATL; a++) {
        const ang = (a / ATL) * Math.PI * 2;
        cam.position.set(Math.sin(ang) * 100, 0, Math.cos(ang) * 100); cam.lookAt(0, 0, 0);
        atlasRT.viewport.set(a * cell, s * cell, cell, cell); atlasRT.scissor.set(a * cell, s * cell, cell, cell); atlasRT.scissorTest = true;
        renderer.setRenderTarget(atlasRT); renderer.render(bs, cam);
      }
      bs.remove(holder); bmesh.geometry.dispose(); lmesh.geometry.dispose();
    }
    atlasRT.viewport.set(0, 0, size, size); atlasRT.scissor.set(0, 0, size, size); atlasRT.scissorTest = false;
    renderer.setRenderTarget(prevRT); renderer.setClearColor(prevClear, prevAlpha); renderer.autoClear = prevAuto;
    bm.dispose(); lm.dispose();
    impMat.uniforms.tAtlas.value = atlasRT.texture;
  }
  const impMat = new THREE.ShaderMaterial({
    vertexShader: IMP_VS, fragmentShader: IMP_FS, fog: false,
    uniforms: { tAtlas: { value: null }, uNear: { value: 300 }, uCell: { value: 1 }, uLight: { value: new THREE.Color(1, 1, 1) }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 }, uFogBase: MatLib.G.uFogBase, uFogFall: MatLib.G.uFogFall, uFogStart: MatLib.G.uFogStart, uSunDir: MatLib.G.uSunDir, uSunFog: MatLib.G.uSunFog },
  });
  impMat.name = 'mat.impostor';
  const quad = new THREE.BufferGeometry();
  quad.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]); quad.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  // ---- impostor blocks (4x4 chunks) ---------------------------------------------------------------------------------------------------------------
  const blocks = new Map(); // key -> {mesh, bx, bz}
  const pendingBlocks = new Set();
  function* buildBlock(bx, bz) {
    const ids = [];
    for (let cz = bz * 4; cz < bz * 4 + 4; cz++) for (let cx = bx * 4; cx < bx * 4 + 4; cx++) {
      const k = cz * NC + cx;
      for (let q = T.chunkStart[k]; q < T.chunkStart[k + 1]; q++) { const i = T.order[q]; if (keepHash(i) < cfg.density) ids.push(i); }
    }
    yield;
    if (!ids.length) return { mesh: null, bx, bz };
    const geo = quad.clone(); geo.boundingSphere = null;
    const sp = new Float32Array(ids.length);
    const mesh = new THREE.InstancedMesh(geo, impMat, ids.length);
    const m = mesh.instanceMatrix.array;
    for (let k = 0; k < ids.length; k++) {
      const i = ids[k], s = T.type[i], H = treeGeometry(TREE_TYPES[s], 0).height * T.scale[i], c = Math.cos(T.rot[i]), sn = Math.sin(T.rot[i]), o = k * 16;
      m[o] = c * H; m[o + 1] = 0; m[o + 2] = -sn * H; m[o + 3] = 0; m[o + 4] = 0; m[o + 5] = H; m[o + 6] = 0; m[o + 7] = 0; m[o + 8] = sn * H; m[o + 9] = 0; m[o + 10] = c * H; m[o + 11] = 0;
      m[o + 12] = T.x[i]; m[o + 13] = T.y[i] - 0.2; m[o + 14] = T.z[i]; m[o + 15] = 1;
      sp[k] = s;
      if ((k & 1023) === 1023) yield;
    }
    // geometry attribute for species; bounds for per-block frustum culling
    mesh.geometry.setAttribute('aSpecies', new THREE.InstancedBufferAttribute(sp, 1));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere(); mesh.boundingSphere.radius += 30;
    mesh.matrixAutoUpdate = false; mesh.name = `veg.impostors.${bx}.${bz}`; mesh.frustumCulled = true;
    MemTracker.addGeometry(mesh.geometry); mesh.geometry.userData.bytes += ids.length * 68; MemTracker.geometryBytes += ids.length * 68;
    return { mesh, bx, bz };
  }
  function dropBlock(key) { const b = blocks.get(key); if (b && b.mesh) { group.remove(b.mesh); MemTracker.removeGeometry(b.mesh.geometry); b.mesh.geometry.dispose(); b.mesh.dispose(); } blocks.delete(key); }
  let blockCenter = '';
  function updateBlocks(cam) {
    const ccx = Math.floor((cam.x + 2000) / 100), ccz = Math.floor((cam.z + 2000) / 100);
    const key = ccx + ':' + ccz + ':' + cfg.mid + ':' + cfg.density;
    if (key === blockCenter) return;
    blockCenter = key;
    const r = cfg.mid + 1, want = new Set();
    for (let bz = Math.floor((ccz - r) / 4); bz <= Math.floor((ccz + r) / 4); bz++) for (let bx = Math.floor((ccx - r) / 4); bx <= Math.floor((ccx + r) / 4); bx++) {
      if (bx < 0 || bz < 0 || bx >= NC / 4 || bz >= NC / 4) continue;
      const k = bx + ',' + bz; want.add(k);
      if (blocks.has(k) || pendingBlocks.has(k)) continue;
      pendingBlocks.add(k);
      Streaming.add('veg' + k, buildBlock(bx, bz), 300 + Math.hypot(bx * 400 + 200 - cam.x - 2000, bz * 400 + 200 - cam.z - 2000) * 0.5, (res) => {
        pendingBlocks.delete(k);
        if (!want.has(k) && blockCenter !== key) { if (res.mesh) { res.mesh.geometry.dispose(); res.mesh.dispose(); } return; }
        blocks.set(k, res); if (res.mesh) group.add(res.mesh);
      });
    }
    for (const k of Array.from(blocks.keys())) if (!want.has(k)) dropBlock(k);
  }
  function resetBlocks() { for (const k of Array.from(blocks.keys())) dropBlock(k); for (const k of pendingBlocks) Streaming.cancel('veg' + k); pendingBlocks.clear(); blockCenter = ''; }

  // ---- near LOD lists -------------------------------------------------------------------------------------------------------------------------------
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), sph = new THREE.Sphere(), tmpC = new THREE.Color();
  function rebuildNear(camera) {
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
    const cx = camera.position.x, cz = camera.position.z;
    const R0 = st.R0 * cfg.lodBias, R1 = st.R1 * cfg.lodBias;
    const rc = Math.ceil(R1 / 100) + 1, ccx = Math.floor((cx + 2000) / 100), ccz = Math.floor((cz + 2000) / 100);
    for (let l = 0; l < 2; l++) for (let s = 0; s < NS; s++) sets[l][s].count = 0;
    let n0 = 0, n1 = 0, over0 = 0, over1 = 0;
    for (let z = Math.max(0, ccz - rc); z <= Math.min(NC - 1, ccz + rc); z++) for (let x = Math.max(0, ccx - rc); x <= Math.min(NC - 1, ccx + rc); x++) {
      const k = z * NC + x;
      for (let q = T.chunkStart[k]; q < T.chunkStart[k + 1]; q++) {
        const i = T.order[q];
        if (keepHash(i) >= cfg.density) continue;
        const dx = T.x[i] - cx, dz = T.z[i] - cz, d = Math.sqrt(dx * dx + dz * dz);
        if (d > R1) continue;
        const s = T.type[i], H = sets[0][s].height * T.scale[i];
        sph.center.set(T.x[i], T.y[i] + H * 0.5, T.z[i]); sph.radius = H * 0.6;
        if (!frustum.intersectsSphere(sph)) continue;
        const lod = d < R0 ? 0 : 1;
        const set = sets[lod][s];
        if (set.count >= set.cap || (lod === 0 ? n0 >= cfg.cap0 : n1 >= cfg.cap1)) { if (lod === 0) over0++; else over1++; continue; }
        const o = set.count * 16, sc = T.scale[i], c = Math.cos(T.rot[i]), sn = Math.sin(T.rot[i]);
        for (const mesh of [set.bark, set.leaf]) {
          const m = mesh.instanceMatrix.array;
          m[o] = c * sc; m[o + 1] = 0; m[o + 2] = -sn * sc; m[o + 3] = 0; m[o + 4] = 0; m[o + 5] = sc; m[o + 6] = 0; m[o + 7] = 0; m[o + 8] = sn * sc; m[o + 9] = 0; m[o + 10] = c * sc; m[o + 11] = 0;
          m[o + 12] = T.x[i]; m[o + 13] = T.y[i]; m[o + 14] = T.z[i]; m[o + 15] = 1;
        }
        const v = 0.82 + 0.3 * keepHash(i + 7);
        tmpC.setRGB(v * (0.95 + 0.1 * keepHash(i + 3)), v, v * 0.92);
        set.leaf.instanceColor.array[set.count * 3] = tmpC.r; set.leaf.instanceColor.array[set.count * 3 + 1] = tmpC.g; set.leaf.instanceColor.array[set.count * 3 + 2] = tmpC.b;
        set.count++; if (lod === 0) n0++; else n1++;
      }
    }
    for (let l = 0; l < 2; l++) for (let s = 0; s < NS; s++) {
      const set = sets[l][s];
      set.bark.count = set.leaf.count = set.count;
      if (set.count) { set.bark.instanceMatrix.needsUpdate = true; set.leaf.instanceMatrix.needsUpdate = true; set.leaf.instanceColor.needsUpdate = true; }
    }
    // adapt radii toward the caps (Annex G 3.3 tree caps)
    if (over0 || n0 > cfg.cap0 * 0.98) st.R0 = Math.max(40, st.R0 * 0.9); else if (n0 < cfg.cap0 * 0.6) st.R0 = Math.min(160, st.R0 * 1.06);
    if (over1 || n1 > cfg.cap1 * 0.98) st.R1 = Math.max(st.R0 + 30, st.R1 * 0.92); else if (n1 < cfg.cap1 * 0.6) st.R1 = Math.min(480, st.R1 * 1.05);
    st.count0 = n0; st.count1 = n1;
    impMat.uniforms.uNear.value = R1 * 0.97;
  }

  // ---- ground cover -------------------------------------------------------------------------------------------------------------------------------------
  const GC_TYPES = ['veg.grass_tuft', 'veg.fern', 'veg.reeds', 'veg.flowers'];
  const gcMat = MatLib.get('mat.groundcover');
  const GC_CAP = 9000;
  const gcMeshes = GC_TYPES.map((id) => { const m = new THREE.InstancedMesh(artGeometry(plantGeometry(id).leaf), gcMat, GC_CAP); m.count = 0; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false; m.name = 'veg.gc.' + id; group.add(m); return m; });
  const gcCache = new Map(); // chunk key -> Float32Array [x,y,z,type,scale,rot]*
  const gcPending = new Set();
  const wts = new Float32Array(8);
  function* buildGc(cx, cz) {
    const out = [];
    const grid = D.grid, x0 = -2000 + cx * 100, z0 = -2000 + cz * 100;
    for (let j = 0; j < 40; j++) {
      for (let i = 0; i < 40; i++) {
        const h1 = keepHash((cx * 40 + i) * 7919 + (cz * 40 + j) * 104729), h2 = keepHash((cx * 40 + i) * 31 + (cz * 40 + j) * 17 + 99);
        const x = x0 + i * 2.5 + h1 * 2.5, z = z0 + j * 2.5 + h2 * 2.5;
        const gi = Math.round((x + 2000) / 4), gj = Math.round((z + 2000) / 4);
        if (grid.flat[gj * grid.N + gi]) continue; // roads and building pads
        const y = World.heightAt(x, z);
        if (y < 0.4) continue;
        const lakeEdge = y > LAKE.level - 0.2 && y < LAKE.level + 1.6 && x < -650 && z < -650;
        terrainWeights(x, z, y, 0, wts);
        const clump = valueNoise(x / 9, z / 9, 5);
        let type = -1;
        if (lakeEdge && h1 < 0.5) type = 2;
        else if (wts[1] > 0.4 && h2 < 0.45 * wts[1] * (0.4 + clump)) type = 1;
        else if (wts[0] > 0.3 && h2 < 0.7 * wts[0] * (0.3 + clump)) type = h1 < 0.06 ? 3 : 0;
        else if (wts[3] > 0.6 && h2 < 0.08) type = 0;
        if (type < 0) continue;
        out.push(x, y, z, type, 0.7 + 0.6 * h1, h2 * 6.28);
      }
      if ((j & 7) === 7) yield;
    }
    return Float32Array.from(out);
  }
  let gcLast = new THREE.Vector3(1e9, 0, 0);
  function updateGc(cam, force) {
    const R = cfg.gcRadius;
    if (R <= 0) { for (const m of gcMeshes) m.count = 0; return; }
    const rc = Math.ceil(R / 100), ccx = Math.floor((cam.x + 2000) / 100), ccz = Math.floor((cam.z + 2000) / 100);
    let missing = false;
    for (let z = ccz - rc; z <= ccz + rc; z++) for (let x = ccx - rc; x <= ccx + rc; x++) {
      if (x < 0 || z < 0 || x >= NC || z >= NC) continue;
      const k = z * NC + x;
      if (gcCache.has(k)) continue;
      missing = true;
      if (gcPending.has(k)) continue;
      gcPending.add(k);
      Streaming.add('gc' + k, buildGc(x, z), 50 + Math.hypot(x - ccx, z - ccz) * 100, (arr) => { gcPending.delete(k); gcCache.set(k, arr); gcLast.set(1e9, 0, 0); });
    }
    if (!force && !missing && gcLast.distanceToSquared(cam) < 25) return;
    if (!force && gcLast.distanceToSquared(cam) < 25) return;
    gcLast.copy(cam);
    const counts = [0, 0, 0, 0], R2 = R * R;
    for (let z = ccz - rc; z <= ccz + rc; z++) for (let x = ccx - rc; x <= ccx + rc; x++) {
      const arr = gcCache.get(z * NC + x); if (!arr) continue;
      for (let q = 0; q < arr.length; q += 6) {
        const dx = arr[q] - cam.x, dz = arr[q + 2] - cam.z, d2 = dx * dx + dz * dz;
        if (d2 > R2) continue;
        const t = arr[q + 3], mesh = gcMeshes[t];
        if (counts[t] >= GC_CAP) continue;
        // thin out with distance so the ring edge is soft
        if (d2 > R2 * 0.5 && keepHash(q + x * 997 + z) > 1.6 - 1.4 * d2 / R2) continue;
        const m = mesh.instanceMatrix.array, o = counts[t] * 16, sc = arr[q + 4], c = Math.cos(arr[q + 5]), sn = Math.sin(arr[q + 5]);
        m[o] = c * sc; m[o + 1] = 0; m[o + 2] = -sn * sc; m[o + 3] = 0; m[o + 4] = 0; m[o + 5] = sc; m[o + 6] = 0; m[o + 7] = 0; m[o + 8] = sn * sc; m[o + 9] = 0; m[o + 10] = c * sc; m[o + 11] = 0; m[o + 12] = arr[q]; m[o + 13] = arr[q + 1]; m[o + 14] = arr[q + 2]; m[o + 15] = 1;
        counts[t]++;
      }
    }
    let total = 0;
    for (let t = 0; t < gcMeshes.length; t++) { gcMeshes[t].count = counts[t]; gcMeshes[t].instanceMatrix.needsUpdate = true; total += counts[t]; }
    st.gc = total;
    if (gcCache.size > 80) { for (const k of gcCache.keys()) { const x = k % NC, z = Math.floor(k / NC); if (Math.abs(x - ccx) > rc + 2 || Math.abs(z - ccz) > rc + 2) gcCache.delete(k); if (gcCache.size <= 60) break; } }
  }

  const api = {
    group, state: st, impostorMaterial: impMat,
    /** quality: {density, treeCaps:[c0,c1], groundCoverRadius, lodBias, mid, shadows, atlasSize} */
    configure(q) {
      const capsChanged = q.treeCaps[0] !== cfg.cap0 || q.treeCaps[1] !== cfg.cap1 || !sets[0].length;
      const densChanged = q.density !== cfg.density, midChanged = q.mid !== cfg.mid;
      cfg.density = Math.min(1, q.density); cfg.gcRadius = q.groundCoverRadius; cfg.lodBias = q.lodBias; cfg.mid = q.mid;
      const shadowsChanged = cfg.shadows !== q.shadows; cfg.shadows = q.shadows;
      cfg.cap0 = q.treeCaps[0]; cfg.cap1 = q.treeCaps[1];
      if (capsChanged || shadowsChanged) { makeSet(0, Math.ceil(cfg.cap0 * 0.6) + 40); makeSet(1, Math.ceil(cfg.cap1 * 0.6) + 80); }
      if (!atlasRT || atlasRT.width !== q.atlasSize) bakeImpostors(q.atlasSize);
      if (densChanged || midChanged) resetBlocks();
      st.dirty = true; gcLast.set(1e9, 0, 0);
    },
    update(camera, light, fog) {
      const p = camera.position;
      const yaw = Math.atan2(camera.matrixWorld.elements[8], camera.matrixWorld.elements[10]);
      let dy = Math.abs(yaw - st.lastYaw); if (dy > Math.PI) dy = 2 * Math.PI - dy;
      if (st.dirty || st.lastPos.distanceToSquared(p) > 36 || dy > 0.2) { st.dirty = false; st.lastPos.copy(p); st.lastYaw = yaw; rebuildNear(camera); }
      updateBlocks(p);
      updateGc(p, false);
      impMat.uniforms.uLight.value.setRGB(light, light, light * 1.02);
      impMat.uniforms.fogColor.value.copy(fog.color); impMat.uniforms.fogDensity.value = fog.density;
      let n = 0; for (const b of blocks.values()) if (b.mesh) n += b.mesh.count; st.impostors = n;
    },
    forceRebuild() { st.dirty = true; gcLast.set(1e9, 0, 0); },
  };
  void leafCell;
  return api;
}
