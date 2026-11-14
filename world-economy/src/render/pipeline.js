// Render pipeline (Annex A 3): forward HDR scene pass (half float + depth texture, MSAA x4 on 'msaa4') -> half-res GTAO-style
// AO from depth (normals reconstructed, no normal pre-pass) -> half-res god rays (radial scatter from the sun, occluded by
// depth) -> bloom (threshold + 5-mip dual filter chain) -> one composite (AO, bloom, rays, exposure, ACES filmic, per-region
// grade, vignette, grain, dithering, sRGB) -> FXAA or SMAA. Built once per quality change; no allocation per frame.
import * as THREE from 'three';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { MemTracker } from './perf.js';

const VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const DEPTH_FN = /* glsl */`
uniform sampler2D tDepth; uniform mat4 uProjInv; uniform float uNear, uFar;
vec3 viewPos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 c = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); vec4 v = uProjInv * c; return v.xyz / v.w; }
`;
const AO_FS = /* glsl */`
varying vec2 vUv; ${DEPTH_FN}
uniform vec2 uTexel; uniform float uRadius, uSamples, uIntensity; uniform float uFrame;
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  float d0 = texture2D(tDepth, vUv).x;
  if (d0 >= 0.99999){ gl_FragColor = vec4(1.0); return; }
  vec3 P = viewPos(vUv);
  vec3 Px = viewPos(vUv + vec2(uTexel.x, 0.0)), Py = viewPos(vUv + vec2(0.0, uTexel.y));
  vec3 N = normalize(cross(Px - P, Py - P));
  float r = uRadius * clamp(-P.z / 30.0, 0.35, 3.0);
  float occ = 0.0; float rot = ign(gl_FragCoord.xy) * 6.2832;
  for (int i = 0; i < 16; i++){
    if (float(i) >= uSamples) break;
    float fi = (float(i) + 0.5) / uSamples;
    float a = rot + fi * 6.2832 * 2.618;
    vec3 dir = vec3(cos(a), sin(a), 0.0) * sqrt(fi);
    // hemisphere sample around N in view space
    vec3 t = normalize(cross(N, abs(N.y) < 0.99 ? vec3(0, 1, 0) : vec3(1, 0, 0))), b = cross(N, t);
    vec3 S = P + (t * dir.x + b * dir.y + N * (0.25 + 0.75 * (1.0 - fi))) * r;
    vec4 c = projectionMatrixAO * vec4(S, 1.0); vec2 suv = c.xy / c.w * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.y < 0.0 || suv.x > 1.0 || suv.y > 1.0) continue;
    float sz = viewPos(suv).z;
    float range = smoothstep(0.0, 1.0, r / abs(P.z - sz));
    occ += (sz >= S.z + 0.05 ? 1.0 : 0.0) * range;
  }
  float ao = 1.0 - occ / uSamples * uIntensity;
  gl_FragColor = vec4(clamp(ao, 0.0, 1.0), -P.z, 0.0, 1.0);
}`;
const RAYS_FS = /* glsl */`
varying vec2 vUv; uniform sampler2D tDepth, tColor; uniform vec2 uSunUv; uniform float uSamples, uStrength, uDecay; uniform vec3 uSunCol;
void main(){
  vec2 delta = (vUv - uSunUv) / uSamples * 0.95; vec2 uv = vUv; float w = 1.0; vec3 acc = vec3(0.0);
  for (int i = 0; i < 48; i++){
    if (float(i) >= uSamples) break;
    uv -= delta; float sky = step(0.99999, texture2D(tDepth, uv).x);
    vec3 c = texture2D(tColor, uv).rgb; float l = max(dot(c, vec3(0.3, 0.59, 0.11)) - 0.6, 0.0);
    acc += sky * (0.25 + l) * w; w *= uDecay;
  }
  gl_FragColor = vec4(acc / uSamples * uStrength * uSunCol, 1.0);
}`;
const PREFILTER_FS = /* glsl */`
varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold;
vec3 q(vec2 uv){ vec3 c = texture2D(tSrc, uv).rgb; float l = max(c.r, max(c.g, c.b)); return c * max(l - uThreshold, 0.0) / max(l, 1e-4) / (1.0 + l * 0.05); }
void main(){ vec3 c = q(vUv + uTexel * vec2(-1, -1)) + q(vUv + uTexel * vec2(1, -1)) + q(vUv + uTexel * vec2(-1, 1)) + q(vUv + uTexel * vec2(1, 1)); gl_FragColor = vec4(c * 0.25, 1.0); }`;
const DOWN_FS = /* glsl */`
varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 4.0; c += texture2D(tSrc, vUv - uTexel).rgb + texture2D(tSrc, vUv + uTexel).rgb + texture2D(tSrc, vUv + vec2(uTexel.x, -uTexel.y)).rgb + texture2D(tSrc, vUv - vec2(uTexel.x, -uTexel.y)).rgb; gl_FragColor = vec4(c / 8.0, 1.0); }`;
const UP_FS = /* glsl */`
varying vec2 vUv; uniform sampler2D tSrc, tPrev; uniform vec2 uTexel;
void main(){ vec3 c = vec3(0.0); vec2 o = uTexel;
  c += texture2D(tSrc, vUv + vec2(-o.x * 2.0, 0.0)).rgb + texture2D(tSrc, vUv + vec2(o.x * 2.0, 0.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, o.y * 2.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, -o.y * 2.0)).rgb;
  c += (texture2D(tSrc, vUv + o).rgb + texture2D(tSrc, vUv - o).rgb + texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb + texture2D(tSrc, vUv + vec2(-o.x, o.y)).rgb) * 2.0;
  gl_FragColor = vec4(c / 12.0 + texture2D(tPrev, vUv).rgb, 1.0); }`;
const COMPOSITE_FS = /* glsl */`
varying vec2 vUv; uniform sampler2D tColor, tAO, tBloom, tRays, tDepthC; uniform vec2 uAOTexel;
uniform float uExposure, uBloom, uAOOn, uRaysOn, uGradeOn, uGrain, uTime, uVignette, uSharpen; uniform vec3 uGrade; uniform vec2 uTexel; uniform float uNearC, uFarC;
vec3 aces(vec3 x){ const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNearC * uFarC / (uFarC + uNearC - z * (uFarC - uNearC)); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec3 col = texture2D(tColor, vUv).rgb;
  if (uSharpen > 0.0){ vec3 n = texture2D(tColor, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tColor, vUv - vec2(uTexel.x, 0.0)).rgb + texture2D(tColor, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tColor, vUv - vec2(0.0, uTexel.y)).rgb; col = max(col + (col * 4.0 - n) * 0.25 * uSharpen, 0.0); }
  if (uAOOn > 0.5){
    // depth-aware 4-tap upsample of the half-res AO
    float zc = lin(texture2D(tDepthC, vUv).x); float s = 0.0, wsum = 0.0;
    for (int i = 0; i < 4; i++){ vec2 o = vec2(float(i & 1) - 0.5, float(i >> 1) - 0.5) * uAOTexel; vec2 a = texture2D(tAO, vUv + o).rg; float w = 1.0 / (0.05 + abs(a.g - zc) / max(zc, 1.0) * 40.0); s += a.r * w; wsum += w; }
    float ao = s / max(wsum, 1e-4); col *= mix(1.0, ao, 0.85);
  }
  if (uRaysOn > 0.5) col += texture2D(tRays, vUv).rgb;
  col += texture2D(tBloom, vUv).rgb * uBloom;
  col *= uExposure;
  col = aces(col);
  if (uGradeOn > 0.5){
    // per-region grade: temperature, saturation, contrast (lerped on region change)
    col *= vec3(1.0 + uGrade.x, 1.0 + uGrade.x * 0.2, 1.0 - uGrade.x);
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l), col, uGrade.y);
    col = clamp((col - 0.5) * uGrade.z + 0.5, 0.0, 1.0);
    vec2 v = vUv - 0.5; col *= 1.0 - dot(v, v) * uVignette;
  }
  col = toSRGB(col);
  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * (1.0 / 255.0 + uGrain * 0.035);
  gl_FragColor = vec4(col, 1.0);
}`;

function fsMat(fs, uniforms) {
  return new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: 'precision highp float;\n' + fs, uniforms, depthTest: false, depthWrite: false });
}

export function createPipeline(renderer, perf) {
  const scene = new THREE.Scene(), cam = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); quad.frustumCulled = false; scene.add(quad);
  const U = (v) => ({ value: v });
  const projInv = new THREE.Matrix4(), projAO = new THREE.Matrix4();
  const aoMat = fsMat(AO_FS.replace(/projectionMatrixAO/g, 'uProjAO'), { tDepth: U(null), uProjInv: U(projInv), uProjAO: U(projAO), uNear: U(0.4), uFar: U(9000), uTexel: U(new THREE.Vector2()), uRadius: U(1.2), uSamples: U(8), uIntensity: U(1.1), uFrame: U(0) });
  aoMat.fragmentShader = aoMat.fragmentShader.replace('uniform vec2 uTexel;', 'uniform vec2 uTexel; uniform mat4 uProjAO;');
  const raysMat = fsMat(RAYS_FS, { tDepth: U(null), tColor: U(null), uSunUv: U(new THREE.Vector2()), uSamples: U(32), uStrength: U(0.6), uDecay: U(0.965), uSunCol: U(new THREE.Color()) });
  const preMat = fsMat(PREFILTER_FS, { tSrc: U(null), uTexel: U(new THREE.Vector2()), uThreshold: U(1.0) });
  const downMat = fsMat(DOWN_FS, { tSrc: U(null), uTexel: U(new THREE.Vector2()) });
  const upMat = fsMat(UP_FS, { tSrc: U(null), tPrev: U(null), uTexel: U(new THREE.Vector2()) });
  const blackTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blackTex.needsUpdate = true;
  const whiteTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); whiteTex.needsUpdate = true;
  const compMat = fsMat(COMPOSITE_FS, {
    tColor: U(null), tAO: U(whiteTex), tBloom: U(blackTex), tRays: U(blackTex), tDepthC: U(null), uAOTexel: U(new THREE.Vector2()), uTexel: U(new THREE.Vector2()),
    uExposure: U(1), uBloom: U(0.06), uAOOn: U(0), uRaysOn: U(0), uGradeOn: U(1), uGrain: U(0), uTime: U(0), uVignette: U(0.55), uSharpen: U(0), uGrade: U(new THREE.Vector3(0, 1, 1)), uNearC: U(0.4), uFarC: U(9000),
  });
  const fxaaMat = new THREE.ShaderMaterial({ ...FXAAShader, uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms), depthTest: false, depthWrite: false });
  let smaa = null;
  let cfg = null, w = 0, h = 0;
  let rtScene = null, rtAO = null, rtRays = null, rtLDR = null; const bloomRTs = [], upRTs = [];
  const tmpV = new THREE.Vector3();

  function rt(wi, hi, o = {}) { const t = new THREE.WebGLRenderTarget(Math.max(1, wi), Math.max(1, hi), { depthBuffer: false, type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, ...o }); MemTracker.addRenderTarget(t, t.width, t.height, o.type === THREE.UnsignedByteType ? 4 : 8); return t; }
  function free(t) { if (t) { MemTracker.removeRenderTarget(t); t.dispose(); } }
  function rebuild() {
    for (const t of [rtScene, rtAO, rtRays, rtLDR, ...bloomRTs, ...upRTs]) free(t);
    bloomRTs.length = 0; upRTs.length = 0;
    const depthTexture = new THREE.DepthTexture(w, h); depthTexture.type = THREE.UnsignedIntType;
    rtScene = rt(w, h, { depthBuffer: true, depthTexture, samples: cfg.msaaSamples || 0 });
    MemTracker.removeRenderTarget(rtScene); MemTracker.addRenderTarget(rtScene, w, h, 8 + 4, Math.max(1, cfg.msaaSamples || 1));
    const hw = Math.ceil(w / 2), hh = Math.ceil(h / 2);
    if (cfg.ao.enabled) rtAO = rt(hw, hh); else rtAO = null;
    if (cfg.godRays) rtRays = rt(hw, hh); else rtRays = null;
    if (cfg.bloom) { let bw = hw, bh = hh; for (let i = 0; i < 5; i++) { bloomRTs.push(rt(bw, bh)); if (i < 4) upRTs.push(rt(bw, bh)); bw = Math.ceil(bw / 2); bh = Math.ceil(bh / 2); } }
    const needLDR = cfg.antialiasing === 'fxaa' || cfg.antialiasing === 'smaa';
    rtLDR = needLDR ? rt(w, h, { type: THREE.UnsignedByteType }) : null;
    if (cfg.antialiasing === 'smaa') { if (!smaa) smaa = new SMAAPass(); smaa.setSize(w, h); }
    compMat.uniforms.tColor.value = rtScene.texture; compMat.uniforms.tDepthC.value = depthTexture;
    compMat.uniforms.tAO.value = rtAO ? rtAO.texture : whiteTex; compMat.uniforms.uAOOn.value = rtAO ? 1 : 0;
    compMat.uniforms.tRays.value = rtRays ? rtRays.texture : blackTex;
    compMat.uniforms.tBloom.value = upRTs.length ? upRTs[0].texture : blackTex;
    compMat.uniforms.uAOTexel.value.set(1 / hw, 1 / hh); compMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    aoMat.uniforms.tDepth.value = depthTexture; aoMat.uniforms.uTexel.value.set(2 / w, 2 / h); aoMat.uniforms.uSamples.value = cfg.ao.samples || 8;
    raysMat.uniforms.tDepth.value = depthTexture; raysMat.uniforms.tColor.value = rtScene.texture; raysMat.uniforms.uSamples.value = cfg.godRaysSamples || 40;
    compMat.uniforms.uGradeOn.value = cfg.postGrade ? 1 : 0; compMat.uniforms.uGrain.value = cfg.grain ? 1 : 0;
    compMat.uniforms.uSharpen.value = cfg.resolutionScale < 0.95 ? 0.6 : 0;
    fxaaMat.uniforms.resolution.value.set(1 / w, 1 / h);
  }
  function pass(mat, target, label) {
    quad.material = mat; renderer.setRenderTarget(target); renderer.render(scene, cam);
    void label;
  }
  const info = renderer.info;
  const api = {
    get config() { return cfg; },
    /** derived quality -> pipeline config; size = drawing buffer pixels */
    configure(derived, width, height) {
      const next = { ao: derived.ao, bloom: derived.bloom, godRays: derived.godRays, postGrade: derived.postGrade, grain: derived.grain, antialiasing: derived.antialiasing, msaaSamples: derived.msaaSamples, resolutionScale: derived.resolutionScale, godRaysSamples: 40 };
      const changed = !cfg || JSON.stringify(next) !== JSON.stringify(cfg) || width !== w || height !== h;
      cfg = next; w = Math.max(1, Math.floor(width)); h = Math.max(1, Math.floor(height));
      if (changed) rebuild();
    },
    /** renders the scene through the pipeline. st = {exposure, grade:{temp,sat,con}, sunDir:[x,y,z], sunColor, time, sunVisible} */
    render(worldScene, camera, st, shadowCounter) {
      const c0 = info.render.calls, t0 = info.render.triangles, s0c = shadowCounter ? shadowCounter.calls : 0, s0t = shadowCounter ? shadowCounter.tris : 0;
      renderer.setRenderTarget(rtScene); renderer.clear(true, true, false);
      renderer.render(worldScene, camera);
      const sc = shadowCounter ? shadowCounter.calls - s0c : 0, stt = shadowCounter ? shadowCounter.tris - s0t : 0;
      const mainCalls = info.render.calls - c0 - sc, mainTris = info.render.triangles - t0 - stt;
      if (perf) perf.recordPass('main', mainCalls, mainTris);
      api.lastMain = [mainCalls, mainTris];
      const p0 = info.render.calls;
      const near = camera.near, far = camera.far;
      if (rtAO) {
        projInv.copy(camera.projectionMatrixInverse); projAO.copy(camera.projectionMatrix);
        aoMat.uniforms.uNear.value = near; aoMat.uniforms.uFar.value = far;
        pass(aoMat, rtAO, 'ao');
      }
      compMat.uniforms.uNearC.value = near; compMat.uniforms.uFarC.value = far;
      // god rays: only when the sun is low or fog is thick and the sun is near the screen
      let raysOn = 0;
      if (rtRays && st.sunDir[1] > -0.02) {
        tmpV.set(camera.position.x + st.sunDir[0] * 1000, camera.position.y + st.sunDir[1] * 1000, camera.position.z + st.sunDir[2] * 1000).project(camera);
        const inFront = tmpV.z < 1, dist = Math.hypot(tmpV.x, tmpV.y);
        if (inFront && dist < 2.6 && (st.sunDir[1] < 0.57 || st.fogHeavy)) {
          raysMat.uniforms.uSunUv.value.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5);
          raysMat.uniforms.uSunCol.value.copy(st.sunColor).multiplyScalar(Math.max(0, 1 - dist / 2.6) * (st.raysGain || 1));
          pass(raysMat, rtRays, 'rays'); raysOn = 1;
        }
      }
      compMat.uniforms.uRaysOn.value = raysOn;
      if (bloomRTs.length) {
        preMat.uniforms.tSrc.value = rtScene.texture; preMat.uniforms.uTexel.value.set(1 / w, 1 / h); preMat.uniforms.uThreshold.value = st.bloomThreshold || 1.0;
        pass(preMat, bloomRTs[0], 'bloom');
        for (let i = 1; i < bloomRTs.length; i++) { downMat.uniforms.tSrc.value = bloomRTs[i - 1].texture; downMat.uniforms.uTexel.value.set(1 / bloomRTs[i - 1].width, 1 / bloomRTs[i - 1].height); pass(downMat, bloomRTs[i], 'bloom'); }
        // upsample chain into separate targets (reading and writing one texture is a feedback loop)
        for (let i = bloomRTs.length - 1; i > 0; i--) { const src = i === bloomRTs.length - 1 ? bloomRTs[i] : upRTs[i]; upMat.uniforms.tSrc.value = src.texture; upMat.uniforms.tPrev.value = bloomRTs[i - 1].texture; upMat.uniforms.uTexel.value.set(1 / src.width, 1 / src.height); pass(upMat, upRTs[i - 1], 'bloom'); }
        compMat.uniforms.uBloom.value = st.bloom != null ? st.bloom : 0.08;
      }
      compMat.uniforms.uExposure.value = st.exposure; compMat.uniforms.uTime.value = st.time % 100;
      compMat.uniforms.uGrade.value.set(st.grade.temp, st.grade.sat, st.grade.con);
      if (rtLDR) {
        pass(compMat, rtLDR, 'composite');
        if (cfg.antialiasing === 'smaa') { smaa.renderToScreen = true; smaa.render(renderer, null, rtLDR); }
        else { fxaaMat.uniforms.tDiffuse.value = rtLDR.texture; pass(fxaaMat, null, 'aa'); }
      } else pass(compMat, null, 'composite');
      if (perf) perf.recordPass('post', 0, 0);
      api.postCalls = info.render.calls - p0;
    },
    dispose() { for (const t of [rtScene, rtAO, rtRays, rtLDR, ...bloomRTs, ...upRTs]) free(t); },
    get sceneTarget() { return rtScene; },
  };
  return api;
}
