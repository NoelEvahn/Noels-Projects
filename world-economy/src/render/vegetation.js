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
import { leafCell, decalCell } from './textures/canvasTex.js';
import { valueNoise } from '../core/math.js';
import { LAKE } from '../world/layout/water.js';
import { regionAt } from '../world/layout/regions.js';
import { GB } from '../art/kit/geo.js';

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
  float cs = max(dot(fdir, uSunDir), 0.0); float sun = pow(cs, 3.0) * 0.55 + pow(cs, 18.0) * 0.55;
  col = mix(col, mix(fogColor, uSunFog, clamp(sun, 0.0, 0.85)), clamp(amt, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

export function createVegetation({ scene, renderer }) {
  const D = World.data, T = D.trees;
  const group = new THREE.Group(); group.name = 'vegetation'; scene.add(group);
  const cfg = { density: 1, cap0: 300, cap1: 2500, gcRadius: 60, lodBias: 1, mid: 8, shadows: true, detail: 1 };
  const st = { R0: 110, R1: 320, count0: 0, count1: 0, impostors: 0, gc: 0, lastPos: new THREE.Vector3(1e9, 0, 0), lastYaw: 9, dirty: true };
  // ---- species instanced meshes (LOD0, LOD1; bark + leaf) ----------------------------------------------------------------------------------
  const barkMat = MatLib.get('mat.veg_bark'), leafMat = MatLib.get('mat.veg_leaf');
  const sets = [[], []]; // [lod][species] = {bark, leaf, count, cap}
  function makeSet(lod, cap) {
    for (let s = 0; s < NS; s++) {
      const old = sets[lod][s];
      if (old) { group.remove(old.bark, old.leaf); old.bark.dispose(); old.leaf.dispose(); if (old.pb) { group.remove(old.pb, old.pl); old.pb.dispose(); old.pl.dispose(); } }
      const g = treeGeometry(TREE_TYPES[s], lod);
      const bg = old ? old.bg : artGeometry(g.bark), lg = old ? old.lg : artGeometry(g.leaf);
      const bark = new THREE.InstancedMesh(bg, barkMat, cap), leaf = new THREE.InstancedMesh(lg, leafMat, cap);
      leaf.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      for (const m of [bark, leaf]) { m.count = 0; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false; m.name = `veg.${TREE_TYPES[s]}.L${lod}`; group.add(m); }
      sets[lod][s] = { bark, leaf, bg, lg, cap, count: 0, height: g.height, pb: null, pl: null };
      if (lod === 0) {
        // O7: LOD0 trees cast through their ~200-triangle LOD1 shape on layer 1 (seen by the shadow cameras only), sharing the instance matrices
        const g1 = treeGeometry(TREE_TYPES[s], 1), pg = old && old.pg ? old.pg : [artGeometry(g1.bark), artGeometry(g1.leaf)];
        const pb = new THREE.InstancedMesh(pg[0], barkMat, cap), pl = new THREE.InstancedMesh(pg[1], leafMat, cap);
        pb.instanceMatrix = bark.instanceMatrix; pl.instanceMatrix = leaf.instanceMatrix; pl.instanceColor = leaf.instanceColor;
        for (const m of [pb, pl]) { m.count = 0; m.frustumCulled = false; m.castShadow = cfg.shadows; m.receiveShadow = false; m.matrixAutoUpdate = false; m.layers.set(1); m.name = `veg.${TREE_TYPES[s]}.shadow`; group.add(m); }
        Object.assign(sets[lod][s], { pb, pl, pg });
      }
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
  const SPH = TREE_TYPES.map((id) => treeGeometry(id, 0).height);
  function* buildBlock(bx, bz) {
    Streaming.phase = 'vegBlock';
    const ids = [];
    for (let cz = bz * 4; cz < bz * 4 + 4; cz++) for (let cx = bx * 4; cx < bx * 4 + 4; cx++) {
      const k = cz * NC + cx;
      for (let q = T.chunkStart[k]; q < T.chunkStart[k + 1]; q++) { const i = T.order[q]; if (keepHash(i) < cfg.density) ids.push(i); }
      yield;
    }
    if (!ids.length) return { mesh: null, bx, bz };
    const geo = quad.clone(); geo.boundingSphere = null;
    const sp = new Float32Array(ids.length);
    const mesh = new THREE.InstancedMesh(geo, impMat, ids.length);
    const m = mesh.instanceMatrix.array;
    for (let k = 0; k < ids.length; k++) {
      const i = ids[k], s = T.type[i], H = SPH[s] * T.scale[i], c = Math.cos(T.rot[i]), sn = Math.sin(T.rot[i]), o = k * 16;
      m[o] = c * H; m[o + 1] = 0; m[o + 2] = -sn * H; m[o + 3] = 0; m[o + 4] = 0; m[o + 5] = H; m[o + 6] = 0; m[o + 7] = 0; m[o + 8] = sn * H; m[o + 9] = 0; m[o + 10] = c * H; m[o + 11] = 0;
      m[o + 12] = T.x[i]; m[o + 13] = T.y[i] - 0.2; m[o + 14] = T.z[i]; m[o + 15] = 1;
      sp[k] = s;
      if ((k & 255) === 255) yield;
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

  // ---- contact shadows: one instanced quad mesh of soft dark blobs under the near trees (ground AO; no shadow-pass cost) ------------------------
  const CROWN = [2.4, 2.2, 2.1, 4.6, 3.9, 2.8, 1.5, 1.5]; // blob radius per species at scale 1
  const BLOB_CAP = 3200, blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  { const c = decalCell('blob'), uv = blobGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, c[0] + uv.getX(i) * (c[2] - c[0]), c[1] + uv.getY(i) * (c[3] - c[1])); }
  const blobs = new THREE.InstancedMesh(blobGeo, MatLib.get('mat.blob'), BLOB_CAP);
  blobs.count = 0; blobs.frustumCulled = false; blobs.castShadow = false; blobs.receiveShadow = false; blobs.matrixAutoUpdate = false; blobs.renderOrder = 3; blobs.name = 'veg.blobs'; group.add(blobs);
  const blobSlope = new Float32Array(T.count).fill(-1);
  let nBlob = 0;
  function addBlob(i, s) {
    if (nBlob >= BLOB_CAP) return;
    let sl = blobSlope[i];
    if (sl < 0) { const x = T.x[i], z = T.z[i], r = 2; sl = blobSlope[i] = Math.hypot(World.heightAt(x + r, z) - World.heightAt(x - r, z), World.heightAt(x, z + r) - World.heightAt(x, z - r)) / (2 * r); }
    const r = CROWN[s] * T.scale[i] / (1 + 3.5 * sl), a = blobs.instanceMatrix.array, o = nBlob * 16;
    a[o] = r; a[o + 1] = 0; a[o + 2] = 0; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = 1; a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = r; a[o + 11] = 0; a[o + 12] = T.x[i]; a[o + 13] = T.y[i] + 0.1 + r * sl * 0.5; a[o + 14] = T.z[i]; a[o + 15] = 1;
    nBlob++;
  }

  // ---- near LOD lists -------------------------------------------------------------------------------------------------------------------------------
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), sph = new THREE.Sphere(), tmpC = new THREE.Color();
  function rebuildNear(camera) {
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
    const cx = camera.position.x, cz = camera.position.z;
    const R0 = st.R0 * cfg.lodBias, R1 = st.R1 * cfg.lodBias;
    const rc = Math.ceil(R1 / 100) + 1, ccx = Math.floor((cx + 2000) / 100), ccz = Math.floor((cz + 2000) / 100);
    for (let l = 0; l < 2; l++) for (let s = 0; s < NS; s++) sets[l][s].count = 0;
    let n0 = 0, n1 = 0, over0 = 0, over1 = 0; nBlob = 0;
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
        if (d < 170) addBlob(i, s);
        set.count++; if (lod === 0) n0++; else n1++;
      }
    }
    for (let l = 0; l < 2; l++) for (let s = 0; s < NS; s++) {
      const set = sets[l][s];
      set.bark.count = set.leaf.count = set.count; if (set.pb) set.pb.count = set.pl.count = set.count;
      if (set.count) { set.bark.instanceMatrix.needsUpdate = true; set.leaf.instanceMatrix.needsUpdate = true; set.leaf.instanceColor.needsUpdate = true; }
    }
    blobs.count = nBlob; blobs.visible = nBlob > 0; blobs.instanceMatrix.needsUpdate = true;
    // adapt radii toward the caps (Annex G 3.3 tree caps)
    if (over0 || n0 > cfg.cap0 * 0.98) st.R0 = Math.max(40, st.R0 * 0.9); else if (n0 < cfg.cap0 * 0.6) st.R0 = Math.min(160, st.R0 * 1.06);
    if (over1 || n1 > cfg.cap1 * 0.98) st.R1 = Math.max(st.R0 + 30, st.R1 * 0.92); else if (n1 < cfg.cap1 * 0.6) st.R1 = Math.min(480, st.R1 * 1.05);
    st.count0 = n0; st.count1 = n1;
    impMat.uniforms.uNear.value = R1 * 0.97;
  }

  // ---- ground cover -------------------------------------------------------------------------------------------------------------------------------------
  // Alpha-tested card tufts, one InstancedMesh per type (no shadows, wind in the vertex shader), scattered per 100 m chunk from the terrain
  // splat weights on a dense jittered grid and cached as compact typed arrays. Every candidate carries a rank byte: the ring keeps a
  // point when rank < density(d) * quality detail, so the lawn is dense within ~20 m and thins to the ring edge (no popping: the rank
  // is hash-stable). Types 6 and 7 are small solid meshes (pebbles, sticks).
  const GCD = [
    { name: 'grass', geo: 'veg.grass_tuft', cap: 5000 }, { name: 'fern', geo: 'veg.fern', cap: 2500 }, { name: 'reeds', geo: 'veg.reeds', cap: 2000 },
    { name: 'flowers', geo: 'veg.flowers', cap: 2200 }, { name: 'litter', geo: 'veg.litter', cap: 4500 }, { name: 'clover', geo: 'veg.clover', cap: 1200 },
    { name: 'rock', small: 'rock', cap: 2500 }, { name: 'stick', small: 'stick', cap: 2500 },
    { name: 'lawn', geo: 'veg.lawn', cap: 9000 }, { name: 'marram', geo: 'veg.marram', cap: 3500 }, { name: 'cattail', geo: 'veg.cattail', cap: 1600 }, { name: 'daisy', geo: 'veg.daisy', cap: 2600 },
  ];
  const NGC = GCD.length, T_GRASS = 0, T_FERN = 1, T_REED = 2, T_FLOWER = 3, T_LITTER = 4, T_CLOVER = 5, T_ROCK = 6, T_STICK = 7, T_LAWN = 8, T_MARRAM = 9, T_CATTAIL = 10, T_DAISY = 11;
  const gcMat = MatLib.get('mat.groundcover');
  function smallGeo(kind) {
    const g = new GB(256); g.groundAO = false;
    if (kind === 'rock') { g.mat('tex.rock_granite', 0xb8b2a8); g.push().scale(1, 0.62, 0.82); g.lathe([[0.001, -0.12], [0.12, -0.07], [0.16, 0.03], [0.11, 0.11], [0.001, 0.14]], 6); g.pop(); g.push().translate(0.2, 0, 0.1).scale(0.6, 0.5, 0.6); g.lathe([[0.001, -0.1], [0.11, -0.05], [0.12, 0.05], [0.001, 0.1]], 5); g.pop(); }
    else { g.mat('tex.bark_pine', 0xb0a090); g.beam([-0.45, 0.03, 0.0], [0.4, 0.05, 0.08], 0.022, 0.016); g.beam([0.0, 0.04, 0.0], [0.18, 0.05, -0.32], 0.014, 0.01); }
    return artGeometry(g.toArrays());
  }
  const gcMeshes = [];
  for (let t = 0; t < NGC; t++) {
    const d = GCD[t], card = !d.small;
    const geo = card ? artGeometry(plantGeometry(d.geo).leaf) : smallGeo(d.small);
    const m = new THREE.InstancedMesh(geo, card ? gcMat : MatLib.get('mat.world'), d.cap);
    if (card) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(d.cap * 3), 3);
    m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false; m.name = 'veg.gc.' + d.name; group.add(m); gcMeshes.push(m);
  }
  // per-instance tint palette (multiplies the card albedo; linear): lush, fresh, yellow-green, dry straw, dark, sun-bleached, lush-2, lush-3
  const TINTS = [[0.82, 1.0, 0.72], [0.95, 1.1, 0.8], [1.12, 1.12, 0.74], [1.45, 1.22, 0.78], [0.66, 0.84, 0.62], [1.6, 1.35, 0.95], [0.74, 0.9, 0.66], [1.0, 0.98, 0.7]];
  const gcCache = new Map(); // chunk key -> {n, x: Uint16 (1/655 m), z, y: Float32, m: Uint8 [type, scale, rot, tint, rank] * n}
  const gcPending = new Set();
  const wts = new Float32Array(8);
  const GB3 = 44, GN = GB3 * 3, GSTEP = 100 / GN; // 44 x 44 blocks of 3 x 3 jittered candidates (0.76 m cells, ~1.7 candidates / m2)
  const BROAD_CROWN = { 3: 5.0, 4: 4.2, 5: 3.0 }; // oak, maple, street tree: leaf litter under the crown
  function* buildGc(cx, cz) {
    const X = [], Z = [], Y = [], M = [];
    const grid = D.grid, x0 = -2000 + cx * 100, z0 = -2000 + cz * 100;
    const push = (x, y, z, type, sc, rot, tint, rank) => { X.push(Math.round((x - x0) * 655)); Z.push(Math.round((z - z0) * 655)); Y.push(y); M.push(type, Math.max(0, Math.min(255, Math.round(sc * 255))), Math.round(rot / 6.2832 * 255) & 255, tint, Math.max(0, Math.min(255, Math.round(rank * 255)))); };
    const isFlat = (x, z) => { const gi = Math.round((x + 2000) / 4), gj = Math.round((z + 2000) / 4); return grid.flat[gj * grid.N + gi] > 170; }; // weight 1 inside the road row and building pads, 8 m shoulders fade out: keep tufts on the shoulders
    for (let bj = 0; bj < GB3; bj++) {
      for (let bi = 0; bi < GB3; bi++) {
        const bx = x0 + (bi * 3 + 1.5) * GSTEP, bz = z0 + (bj * 3 + 1.5) * GSTEP, by = World.heightAt(bx, bz);
        if (by < 0.4) continue;
        terrainWeights(bx, bz, by, 0, wts);
        const reg = regionAt(bx, bz);
        const lakeEdge = by > LAKE.level - 0.2 && by < LAKE.level + 1.6 && bx < -650 && bz < -650;
        const clump = valueNoise(bx / 9, bz / 9, 5), patch = valueNoise(bx / 7, bz / 7, 17), flowerP = valueNoise(bx / 11, bz / 11, 29), clumpM = valueNoise(bx / 5, bz / 5, 31), dryN = valueNoise(bx / 40, bz / 40, 43);
        for (let q = 0; q < 9; q++) {
          const i = bi * 3 + (q % 3), j = bj * 3 + ((q / 3) | 0);
          const gi = cx * GN + i, gj = cz * GN + j;
          const h1 = keepHash(gi * 7919 + gj * 104729), h2 = keepHash(gi * 31 + gj * 17 + 99), h3 = keepHash(gi * 577 + gj * 1291 + 7), h4 = keepHash(gi * 211 + gj * 977 + 13);
          const x = x0 + i * GSTEP + h1 * GSTEP, z = z0 + j * GSTEP + h2 * GSTEP;
          if (isFlat(x, z)) continue; // roads and building pads
          const y = (i % 3 === 1 && j % 3 === 1) ? by : World.heightAt(x, z);
          if (y < 0.4) continue;
          let type = -1, tint = 0;
          if (lakeEdge && h1 < 0.55) { type = h3 < 0.38 ? T_CATTAIL : T_REED; tint = 0; }
          else if (wts[1] > 0.4) { // forest floor: ferns, litter, the odd tuft, rocks and sticks
            if (h3 < 0.16 * wts[1] * (0.3 + clump)) type = T_FERN; else if (h3 < 0.42) type = T_LITTER; else if (h3 < 0.5 && clump > 0.5) type = T_GRASS; else if (h3 > 0.965) type = T_ROCK; else if (h3 > 0.9) type = T_STICK;
            if (h2 > 0.7 && type === T_LITTER) type = -1;
            tint = (h4 * 255 | 0) % 3;
          } else if (wts[0] > 0.28) { // meadow and lawn
            const lawn = reg === 'city' || reg === 'lake' || reg === 'ocean';
            const dry = reg === 'ocean' ? 0.55 : (wts[6] > 0.2 ? 0.45 : 0.06 + 0.18 * dryN);
            if (patch > 0.72) { if (h3 > 0.985) type = T_ROCK; }
            else if (flowerP > 0.6 && h3 < 0.32) type = lawn ? T_DAISY : T_FLOWER;
            else if (h3 < 0.96 * Math.min(1, wts[0] * 1.15) * (0.55 + 0.8 * clump)) { type = h2 < 0.05 ? T_CLOVER : (lawn ? T_LAWN : T_GRASS); tint = h4 < dry ? 3 + ((h2 * 40 | 0) & 1) * 2 : ((h4 * 255 | 0) % 3); if (h4 > 0.93) tint = 2; }
            else if (h3 > 0.993) type = T_ROCK;
            else if (h3 < 0.012 + 0.012 * flowerP) type = lawn ? T_DAISY : T_FLOWER;
          } else if (wts[3] > 0.45 && (reg === 'ocean' || reg === 'city' || reg === 'lake')) { // sand: marram clumps on the dune side, sparse straw tufts and shells
            if (y > 2.0 && clumpM > 0.46 && h3 < 0.85 * (clumpM - 0.3) * 2.2) { type = T_MARRAM; tint = h4 < 0.5 ? 6 : 4; }
            else if (y > 1.8 && h3 > 0.9 && h3 < 0.935) { type = T_LAWN; tint = 5; }
            else if (h3 > 0.985) type = T_ROCK;
          } else if (wts[6] > 0.25 && h3 < 0.14 * wts[6]) { type = T_LAWN; tint = h4 < 0.6 ? 5 : 3; } // gravel and dry ground: straw tufts
          else if (wts[3] > 0.6 && h2 < 0.012) { type = T_LAWN; tint = 5; }
          else if (wts[2] > 0.4 && h3 > 0.93) type = T_ROCK; // rocky ground: pebbles
          if (type < 0) continue;
          push(x, y, z, type, h1, h2 * 6.28, tint, h4);
        }
      }
      if ((bj & 3) === 3) yield;
    }
    // leaf litter under broadleaf crowns (deterministic per tree)
    const k = cz * NC + cx;
    for (let q = T.chunkStart[k]; q < T.chunkStart[k + 1]; q++) {
      const i = T.order[q], ty = T.type[i], R0 = BROAD_CROWN[ty];
      if (!R0 || keepHash(i) >= cfg.density) continue;
      const rr = R0 * T.scale[i] * 1.1, n = 12 + Math.round(rr * 2);
      for (let m = 0; m < n; m++) {
        const a = keepHash(i * 131 + m * 7) * 6.2832, r = rr * Math.sqrt(keepHash(i * 17 + m * 37 + 5)) , x = T.x[i] + Math.cos(a) * r, z = T.z[i] + Math.sin(a) * r;
        if (isFlat(x, z)) continue;
        push(x, World.heightAt(x, z), z, T_LITTER, 0.3 + 0.35 * keepHash(i + m), a * 3, 0, keepHash(i * 3 + m * 11));
      }
    }
    yield;
    const n = X.length, out = { n, x: Uint16Array.from(X), z: Uint16Array.from(Z), y: Float32Array.from(Y), m: Uint8Array.from(M) };
    return out;
  }
  const gcCounts = new Int32Array(NGC);
  let gcLast = new THREE.Vector3(1e9, 0, 0);
  const tc = new THREE.Color();
  function updateGc(cam, force) {
    const R = cfg.gcRadius;
    if (R <= 0) { for (const m of gcMeshes) { m.count = 0; m.visible = false; } return; }
    const rc = Math.ceil(R / 100), ccx = Math.floor((cam.x + 2000) / 100), ccz = Math.floor((cam.z + 2000) / 100);
    let missing = false;
    for (let z = ccz - rc; z <= ccz + rc; z++) for (let x = ccx - rc; x <= ccx + rc; x++) {
      if (x < 0 || z < 0 || x >= NC || z >= NC) continue;
      const nx = Math.max(-2000 + x * 100 - cam.x, 0, cam.x - (-2000 + x * 100 + 100)), nz = Math.max(-2000 + z * 100 - cam.z, 0, cam.z - (-2000 + z * 100 + 100));
      if (nx * nx + nz * nz > R * R) continue; // chunk outside the ring
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
    const counts = gcCounts; counts.fill(0); const R2 = R * R, dens = cfg.detail, inv = 1 / 655, inv255 = 1 / 255;
    const near2 = R2 * 0.09, span = Math.sqrt(R2) * 0.7;
    for (let z = ccz - rc; z <= ccz + rc; z++) for (let x = ccx - rc; x <= ccx + rc; x++) {
      const rec = gcCache.get(z * NC + x); if (!rec) continue;
      const ox = -2000 + x * 100, oz = -2000 + z * 100, RX = rec.x, RZ = rec.z, RY = rec.y, RM = rec.m;
      for (let q = 0; q < rec.n; q++) {
        const px = ox + RX[q] * inv, pz = oz + RZ[q] * inv, dx = px - cam.x, dz = pz - cam.z, d2 = dx * dx + dz * dz;
        if (d2 > R2) continue;
        const o5 = q * 5, t = RM[o5], rank = RM[o5 + 4] * inv255;
        // density falls from 1 inside 30% of the radius to 0.1 at the edge, scaled by the quality detail factor
        const f = d2 < near2 ? 1 : 1 - 0.9 * Math.pow((Math.sqrt(d2) - R * 0.3) / span, 0.8);
        const keepScale = t === T_ROCK || t === T_STICK ? 1 : dens;
        if (rank >= f * keepScale) continue;
        if (counts[t] >= GCD[t].cap) continue;
        const fr = RM[o5 + 1] * inv255, mesh = gcMeshes[t], sc = t === T_ROCK ? 0.5 + fr * 1.1 : t === T_MARRAM ? 0.8 + fr * 0.8 : 0.5 + fr * 0.9, ang = RM[o5 + 2] * inv255 * 6.2832, c = Math.cos(ang), sn = Math.sin(ang);
        const m = mesh.instanceMatrix.array, o = counts[t] * 16;
        m[o] = c * sc; m[o + 1] = 0; m[o + 2] = -sn * sc; m[o + 3] = 0; m[o + 4] = 0; m[o + 5] = sc; m[o + 6] = 0; m[o + 7] = 0; m[o + 8] = sn * sc; m[o + 9] = 0; m[o + 10] = c * sc; m[o + 11] = 0; m[o + 12] = px; m[o + 13] = RY[q]; m[o + 14] = pz; m[o + 15] = 1;
        if (mesh.instanceColor) { const tt = TINTS[RM[o5 + 3] & 7], v = 0.9 + 0.2 * (RM[o5 + 4] * inv255), ci = counts[t] * 3, ca = mesh.instanceColor.array; ca[ci] = tt[0] * v; ca[ci + 1] = tt[1] * v; ca[ci + 2] = tt[2] * v; }
        counts[t]++;
      }
    }
    let total = 0;
    for (let t = 0; t < gcMeshes.length; t++) { const m = gcMeshes[t]; m.count = counts[t]; m.visible = counts[t] > 0; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; total += counts[t]; }
    st.gc = total;
    if (gcCache.size > 56) { for (const k of gcCache.keys()) { const x = k % NC, z = Math.floor(k / NC); if (Math.abs(x - ccx) > rc + 2 || Math.abs(z - ccz) > rc + 2) gcCache.delete(k); if (gcCache.size <= 40) break; } }
  }
  void tc;

  const api = {
    group, state: st, impostorMaterial: impMat,
    /** quality: {density, treeCaps:[c0,c1], groundCoverRadius, lodBias, mid, shadows, atlasSize} */
    configure(q) {
      const capsChanged = q.treeCaps[0] !== cfg.cap0 || q.treeCaps[1] !== cfg.cap1 || !sets[0].length;
      const densChanged = q.density !== cfg.density, midChanged = q.mid !== cfg.mid;
      cfg.density = Math.min(1, q.density); cfg.gcRadius = q.groundCoverRadius; cfg.lodBias = q.lodBias; cfg.mid = q.mid; cfg.detail = q.detail == null ? 1 : q.detail;
      const shadowsChanged = cfg.shadows !== q.shadows; cfg.shadows = q.shadows;
      cfg.cap0 = q.treeCaps[0]; cfg.cap1 = q.treeCaps[1];
      if (capsChanged || shadowsChanged) { makeSet(0, Math.ceil(cfg.cap0 * 0.6) + 40); makeSet(1, Math.ceil(cfg.cap1 * 0.6) + 80); }
      if (!atlasRT || atlasRT.width !== q.atlasSize) bakeImpostors(q.atlasSize);
      if (densChanged || midChanged) resetBlocks();
      if (densChanged) gcCache.clear();
      st.dirty = true; gcLast.set(1e9, 0, 0);
    },
    update(camera, light, fog, L) {
      const p = camera.position;
      const yaw = Math.atan2(camera.matrixWorld.elements[8], camera.matrixWorld.elements[10]);
      let dy = Math.abs(yaw - st.lastYaw); if (dy > Math.PI) dy = 2 * Math.PI - dy;
      if (st.dirty || st.lastPos.distanceToSquared(p) > 36 || dy > 0.2) { st.dirty = false; st.lastPos.copy(p); st.lastYaw = yaw; rebuildNear(camera); }
      updateBlocks(p);
      updateGc(p, false);
      if (L) { // match the world's sun + sky fill (the bake used a neutral light)
        const k = L.keyI / 7 * 1.45, f = 0.16 + 0.1 * L.day + 0.08 * L.night;
        impMat.uniforms.uLight.value.setRGB(L.sunColor.r * k + f * 0.8, L.sunColor.g * k + f * 0.95, L.sunColor.b * k + f * 1.2);
      } else impMat.uniforms.uLight.value.setRGB(light, light, light * 1.02);
      impMat.uniforms.fogColor.value.copy(fog.color); impMat.uniforms.fogDensity.value = fog.density;
      let n = 0; for (const b of blocks.values()) if (b.mesh) n += b.mesh.count; st.impostors = n;
    },
    forceRebuild() { st.dirty = true; gcLast.set(1e9, 0, 0); },
  };
  void leafCell;
  return api;
}
