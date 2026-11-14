// TexBaker (Annex A 5.4): GPU-bakes the texture library into three texture arrays per tier (H, S, D). Each layer has two maps:
//   albedo array (sRGB RGBA8: rgb albedo, a metalness) and data array (linear RGBA8: normal.xy, roughness, AO).
// A bake is three passes: recipe -> MRT temp (albedo/metal + height/rough, half float), pack albedo -> array layer, normal/AO
// from the height -> data array layer. Mipmaps are generated once per array after its layers are done. One layer per pump
// step during play; unlimited behind the loading screen. Recipe programs are disposed after baking (program count stays flat).
import * as THREE from 'three';
import { NOISE } from './glsl/noise.js';
import { recipeFor, expandColours } from './library.js';
import { LAYER_LIST, TIER_COUNT } from '../../art/kit/layers.js';
import { MemTracker } from '../perf.js';

const VS = /* glsl */`out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const quadGeo = new THREE.PlaneGeometry(2, 2);

function recipeMaterial(id) {
  const r = recipeFor(id);
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: expandColours(/* glsl */`precision highp float; in vec2 vUv;
layout(location = 0) out vec4 oAlb; layout(location = 1) out vec4 oDat;
${NOISE}
void recipe(vec2 uv, out vec3 a, out float h, out float r, out float m){ ${r.body} }
void main(){ vec3 a; float h, r, m; recipe(fract(vUv), a, h, r, m); oAlb = vec4(max(a, vec3(0.0)), sat(m)); oDat = vec4(sat(h), sat(r), 0.0, 1.0); }`),
  });
}
const packMat = new THREE.ShaderMaterial({
  glslVersion: THREE.GLSL3, vertexShader: VS, depthTest: false, depthWrite: false, uniforms: { tA: { value: null } },
  fragmentShader: `precision highp float; in vec2 vUv; uniform sampler2D tA; layout(location = 0) out vec4 o; void main(){ o = texture(tA, vUv); }`,
});
const normalMat = new THREE.ShaderMaterial({
  glslVersion: THREE.GLSL3, vertexShader: VS, depthTest: false, depthWrite: false,
  uniforms: { tD: { value: null }, uTexel: { value: new THREE.Vector2() }, uStrength: { value: 1 }, uAO: { value: 1 } },
  fragmentShader: /* glsl */`precision highp float; in vec2 vUv; uniform sampler2D tD; uniform vec2 uTexel; uniform float uStrength, uAO; layout(location = 0) out vec4 o;
float H(vec2 uv){ return texture(tD, uv).r; }
void main(){
  vec2 uv = vUv; vec2 tx = vec2(uTexel.x, 0.0), ty = vec2(0.0, uTexel.y);
  float hl = H(uv - tx), hr = H(uv + tx), hd = H(uv - ty), hu = H(uv + ty);
  float hld = H(uv - tx - ty), hrd = H(uv + tx - ty), hlu = H(uv - tx + ty), hru = H(uv + tx + ty);
  float gx = (hr - hl) * 2.0 + (hru - hlu) + (hrd - hld), gy = (hu - hd) * 2.0 + (hru - hrd) + (hlu - hld);
  vec3 n = normalize(vec3(-gx * uStrength * 0.25, -gy * uStrength * 0.25, 1.0));
  float h = H(uv), avg = 0.0;
  for (int i = 0; i < 8; i++){ float a = float(i) * 0.7854; avg += H(uv + vec2(cos(a), sin(a)) * uTexel * 5.0); }
  avg /= 8.0;
  float ao = clamp(1.0 - max(0.0, avg - h) * uAO * 2.5, 0.25, 1.0);
  o = vec4(n.xy * 0.5 + 0.5, texture(tD, uv).g, ao);
}`,
});
const readMat = new THREE.ShaderMaterial({
  glslVersion: THREE.GLSL3, vertexShader: VS, depthTest: false, depthWrite: false, uniforms: { tArr: { value: null }, uLayer: { value: 0 } },
  fragmentShader: `precision highp float; precision highp sampler2DArray; in vec2 vUv; uniform sampler2DArray tArr; uniform float uLayer; layout(location = 0) out vec4 o; void main(){ o = texture(tArr, vec3(vUv, uLayer)); }`,
});

export function createTexBaker(renderer) {
  const gl = renderer.getContext();
  const scene = new THREE.Scene(), cam = new THREE.Camera();
  const quad = new THREE.Mesh(quadGeo, packMat); quad.frustumCulled = false; scene.add(quad);
  const halfOk = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  /** shared uniform holders: materials reference these objects, the baker swaps .value when a new set is complete */
  const uniforms = { tHA: { value: null }, tHD: { value: null }, tSA: { value: null }, tSD: { value: null }, tDA: { value: null }, tDD: { value: null } };
  let current = null, building = null;
  const queue = [];
  const temps = new Map();
  const stats = { baked: 0, bakeMs: {}, sizes: null, pending: 0, rebakes: 0 };

  function makeArray(size, n, srgb, aniso) {
    const rt = new THREE.WebGLArrayRenderTarget(size, size, Math.max(1, n), { depthBuffer: false, generateMipmaps: false });
    const t = rt.texture;
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    MemTracker.addTexture(t, size, size * n, 4, true, true);
    return rt;
  }
  function makeSet(sizes) {
    const a = sizes.anisotropy || 4;
    return {
      sizes,
      H: { alb: makeArray(sizes.H[0], TIER_COUNT.H, true, a), dat: makeArray(sizes.H[1], TIER_COUNT.H, false, a) },
      S: { alb: makeArray(sizes.S, TIER_COUNT.S, true, a), dat: makeArray(sizes.S, TIER_COUNT.S, false, a) },
      D: { alb: makeArray(sizes.D, TIER_COUNT.D, true, a), dat: makeArray(sizes.D, TIER_COUNT.D, false, a) },
      done: { H: 0, S: 0, D: 0 },
    };
  }
  function disposeSet(set) {
    for (const t of ['H', 'S', 'D']) for (const k of ['alb', 'dat']) { MemTracker.removeTexture(set[t][k].texture); set[t][k].dispose(); }
  }
  function temp(size) {
    let t = temps.get(size);
    if (!t) {
      t = new THREE.WebGLRenderTarget(size, size, { count: 2, depthBuffer: false, type: halfOk ? THREE.HalfFloatType : THREE.UnsignedByteType, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
      for (const tx of t.textures) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; }
      temps.set(size, t);
    }
    return t;
  }
  function genMips(rt) {
    const tex = renderer.properties.get(rt.texture).__webglTexture;
    if (!tex) return;
    renderer.state.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    renderer.state.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  }
  function draw(mat, target, layer = 0) {
    quad.material = mat;
    renderer.setRenderTarget(target, layer);
    renderer.render(scene, cam);
  }
  /** bake one layer entry {id, tier, slot} into `set` */
  function bakeLayer(set, e) {
    const t0 = performance.now();
    const tierSet = set[e.tier];
    const albSize = tierSet.alb.width, datSize = tierSet.dat.width;
    const prevRT = renderer.getRenderTarget(), prevAuto = renderer.autoClear, prevXR = renderer.xr.enabled;
    renderer.autoClear = false; renderer.xr.enabled = false;
    const big = Math.max(albSize, datSize);
    const tmp = temp(big);
    const rm = recipeMaterial(e.id);
    draw(rm, tmp);
    packMat.uniforms.tA.value = tmp.textures[0];
    draw(packMat, tierSet.alb, e.slot);
    const r = recipeFor(e.id), tile = e.tile;
    normalMat.uniforms.tD.value = tmp.textures[1];
    normalMat.uniforms.uTexel.value.set(1 / big, 1 / big);
    // gradient over 2 texels of the temp map (texel = tile / big metres): strength = depth / texel
    normalMat.uniforms.uStrength.value = r.depth * big / tile;
    normalMat.uniforms.uAO.value = r.ao;
    draw(normalMat, tierSet.dat, e.slot);
    renderer.setRenderTarget(prevRT); renderer.autoClear = prevAuto; renderer.xr.enabled = prevXR;
    rm.dispose();
    set.done[e.tier]++;
    if (set.done[e.tier] === TIER_COUNT[e.tier]) { genMips(tierSet.alb); genMips(tierSet.dat); }
    stats.bakeMs[e.id] = +(performance.now() - t0).toFixed(1);
    stats.baked++;
  }
  function publish(set) {
    uniforms.tHA.value = set.H.alb.texture; uniforms.tHD.value = set.H.dat.texture;
    uniforms.tSA.value = set.S.alb.texture; uniforms.tSD.value = set.S.dat.texture;
    uniforms.tDA.value = set.D.alb.texture; uniforms.tDD.value = set.D.dat.texture;
  }
  const api = {
    uniforms, stats,
    get ready() { return !!current; },
    get pending() { return queue.length; },
    /** start a (re)bake at new sizes {H:[a,n], S, D, anisotropy}; the old set stays live until the new one is complete */
    start(sizes) {
      if (building) disposeSet(building);
      building = makeSet(sizes);
      queue.length = 0;
      for (const e of LAYER_LIST) queue.push(e);
      stats.sizes = sizes; stats.pending = queue.length;
      if (current) stats.rebakes++;
    },
    /** bake one layer; returns true while more work remains */
    step() {
      if (!building) return false;
      const e = queue.shift();
      if (e) bakeLayer(building, e);
      stats.pending = queue.length;
      if (!queue.length) {
        const old = current; current = building; building = null; publish(current);
        if (old) disposeSet(old);
        if (api.onPublish) api.onPublish(current);
        return false;
      }
      return true;
    },
    bakeAll() { const t0 = performance.now(); while (api.step()); return performance.now() - t0; },
    /** time-sliced job for Streaming.pump: one layer per yield */
    *job() { while (api.step()) yield; },
    /** test/debug: read one layer back as RGBA8 (map 'alb' | 'dat') at its stored size */
    read(texId, map = 'alb') {
      const e = LAYER_LIST.find((l) => l.id === texId);
      if (!e || !current) return null;
      const arr = current[e.tier][map], size = arr.width;
      const rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false });
      readMat.uniforms.tArr.value = arr.texture; readMat.uniforms.uLayer.value = e.slot;
      const prevRT = renderer.getRenderTarget();
      draw(readMat, rt);
      const buf = new Uint8Array(size * size * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
      renderer.setRenderTarget(prevRT); rt.dispose();
      return { size, data: buf };
    },
    get current() { return current; },
  };
  return api;
}
