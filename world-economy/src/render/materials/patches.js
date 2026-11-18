// Shared shader patch chain (Annex A 5.2), applied in fixed order through one onBeforeCompile per material:
//   1 CSM (three addon, set up by lighting.js)  2 height fog + aerial perspective + sun in-scatter  3 macro variation
//   4 wetness and puddles (flagged layers)  5 wind (vegetation flag)  6 per-vertex tint / AO / emissive code  7 texture-array layers
// Flags form the program cache key, so identical flag sets share one program. Allowed combinations are listed in FLAG_SETS.
import * as THREE from 'three';
import { TERRAIN_SLOTS, LAYERS, LAYER_LIST } from '../../art/kit/layers.js';

/** global uniforms shared by every patched material (values are updated by lighting/weather, textures by the baker) */
export const G = {
  uTime: { value: 0 }, uWet: { value: 0 }, uNight: { value: 0 }, uWinLit: { value: 0.1 }, uLampGain: { value: 0 }, uWinGain: { value: 0 },
  uDay: { value: 1 }, uWind: { value: new THREE.Vector3(1, 0, 0.3) }, uWindStr: { value: 0.4 },
  uFogBase: { value: 0 }, uFogFall: { value: 0.006 }, uFogStart: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunFog: { value: new THREE.Color(1, 0.9, 0.7) },
  uMacro: { value: 1 }, uSplatL: { value: TERRAIN_SLOTS.map((id) => LAYERS[id].index) },
  tHA: { value: null }, tHD: { value: null }, tSA: { value: null }, tSD: { value: null }, tDA: { value: null }, tDD: { value: null }, tProps: { value: null },
  uNoiseL: { value: LAYERS['tex.noise_shared'].index - 128 },
};
/** per-layer properties texture: R wettable, G normal scale (x/128), B macro-variation strength, A specular glass flag */
export function makeLayerProps() {
  const d = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) { d[i * 4 + 1] = 128; d[i * 4 + 2] = 255; }
  const wet = ['tex.asphalt', 'tex.asphalt_worn', 'tex.cobble', 'tex.concrete_cast', 'tex.paver', 'tex.curb_stone', 'tex.metal_painted', 'tex.roof_metal_red', 'tex.roof_shingle', 'tex.roof_tile', 'tex.wood_planks', 'tex.wood_weathered_dark', 'tex.stone_fieldstone', 'tex.rock_granite', 'tex.rock_dark', 'tex.mud', 'tex.dirt_track', 'tex.carpaint_flake'];
  for (const id of wet) d[LAYERS[id].index * 4] = 255;
  for (const id of ['tex.glass_window', 'tex.glass_curtain', 'tex.carpaint_flake', 'tex.metal_aluminium', 'tex.facade_office', 'tex.facade_shop']) { d[LAYERS[id].index * 4 + 2] = 40; d[LAYERS[id].index * 4 + 3] = 255; }
  for (const id of ['tex.flat', 'tex.fabric_cloth', 'tex.plastic']) d[LAYERS[id].index * 4 + 2] = 90;
  const t = new THREE.DataTexture(d, 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.needsUpdate = true; t.minFilter = t.magFilter = THREE.NearestFilter;
  G.tProps.value = t;
  void LAYER_LIST;
  return t;
}


// ---- scene detail (Detail Batch 1): facade grime, kerb dirt, worn markings, road cracks and patches, paver variance, window states ----
const LI = (id) => LAYERS[id].index.toFixed(1);
const WALL_IDS = ['tex.brick_red', 'tex.brick_brown', 'tex.brick_painted_white', 'tex.concrete_panel', 'tex.stucco', 'tex.planks_wall', 'tex.facade_brick', 'tex.facade_concrete', 'tex.facade_panel', 'tex.facade_stucco', 'tex.concrete_cast', 'tex.wood_painted'];
const FACADE_IDS = ['tex.facade_brick', 'tex.facade_concrete', 'tex.facade_panel', 'tex.facade_stucco', 'tex.facade_office', 'tex.facade_shop'];
const DETAIL_PRE = /* glsl */`
  float wSt = 0.0, wBlind = 0.0, wCurt = 0.0, wG0 = sA.a; vec2 wUv = vec2(0.5); vec3 wCurtCol = vec3(0.8, 0.7, 0.55); float wHash = 0.0; float wLit = 0.0;`;
const DETAIL_MAIN = () => /* glsl */`
  {
    float dFlag = vAux.z;
    vec3 dgn = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
    float vert = 1.0 - smoothstep(0.25, 0.5, abs(dgn.y));
    // painted markings: worn paint breaks up and fades (discard shows the asphalt below)
    if (dFlag > 0.5 && dFlag < 1.5) {
      vec2 wuv = vec2(vTUv.x * 0.1, vTUv.y * 0.05);
      float wn = nzr(wuv) * 0.55 + nzg(wuv * 2.7 + 0.31) * 0.2 + nzr(wuv * 7.3 + 0.7) * 0.25;
      float tr = smoothstep(0.38, 0.62, nzg(vec2(vTUv.y * 0.012, vTUv.x * 0.01) + 0.2)); // heavily trafficked stretches
      if (wn + tr * 0.12 > 0.69) discard;
      albedo *= 0.84 + 0.16 * smoothstep(0.35, 0.62, wn);
    }
    // gutter strip beside the kerb: a ~20 cm grime band with grit and leaf-litter speckle
    else if (dFlag > 1.5 && dFlag < 2.5) {
      float gv = clamp((1.0 - vTint.a) * 4.0, 0.0, 1.0); gv *= gv;
      float gn1 = nzr(vec2(vTUv.y * 0.09, vTUv.x * 0.5)), sp = step(0.9, nzg(vTUv * 0.38 + 0.5));
      albedo *= 1.0 - 0.45 * gv * (0.55 + 0.9 * gn1);
      albedo = mix(albedo, albedo * vec3(1.18, 0.95, 0.65), gv * 0.55 + sp * 0.4 * gv);
      rough = mix(rough, 0.97, gv);
    }
    // sidewalk: gum, stains and ground-in dirt
    else if (dFlag > 2.5 && dFlag < 3.5) {
      vec2 sp2 = vWPos.xz * 1.15; vec2 sc = floor(sp2); float sh = dh(sc);
      float spot = (1.0 - smoothstep(0.05, 0.12, length(fract(sp2) - vec2(dh(sc + 3.1), dh(sc + 7.7))))) * step(0.9, sh);
      float stain = smoothstep(0.62, 0.8, nzg(vWPos.xz * 0.035 + 0.15));
      albedo *= 1.0 - 0.38 * spot - 0.14 * stain;
      float edge = clamp((1.0 - vTint.a) * 6.0, 0.0, 1.0); albedo *= 1.0 - 0.1 * edge;
    }
    // asphalt carriageway: cracks, repair patches, tar seams, large-scale ageing
    if (dFlag > 3.5 && dFlag < 4.5 && (inL(Lmain, ${LI('tex.asphalt')}) + inL(Lmain, ${LI('tex.asphalt_worn')})) > 0.5) {
      vec2 rp = vTUv * 6.0; // (lateral m, along m)
      vec2 cell = floor(rp / vec2(3.6, 8.5)); float ch = dh(cell + 1.3);
      float pat = 0.0, pedge = 0.0;
      if (ch < 0.14) {
        vec2 lc = fract(rp / vec2(3.6, 8.5)); vec2 o0 = vec2(0.08 + 0.3 * dh(cell + 5.1), 0.1 + 0.35 * dh(cell + 9.4)); vec2 sz = vec2(0.3 + 0.35 * dh(cell + 2.2), 0.12 + 0.22 * dh(cell + 4.7));
        vec2 dd = abs(lc - (o0 + sz * 0.5)) - sz * 0.5; float inside = 1.0 - step(0.0, max(dd.x * 3.6, dd.y * 8.5));
        pat = inside; pedge = inside * (1.0 - step(0.09, -max(dd.x * 3.6, dd.y * 8.5)));
      }
      float cm = smoothstep(0.58, 0.7, nzr(rp * 0.0042 + 0.21));
      vec2 jit = (vec2(nzr(rp * 0.11 + 0.3), nzg(rp * 0.13 + 0.8)) - 0.5) * 0.9 + (vec2(nzr(rp * 0.37), nzg(rp * 0.41 + 0.2)) - 0.5) * 0.25; // wobble: cracks are jagged, not smooth contours
      float cn = nzr((rp + jit) * vec2(0.011, 0.02) + 0.05); float ridge = abs(cn - 0.5);
      float crack = (1.0 - smoothstep(0.0, 0.0055 + fwidth(cn) * 1.2, ridge)) * cm;
      float cn2 = nzg((rp + jit * 0.5) * 0.05 + 0.4); float crack2 = (1.0 - smoothstep(0.0, 0.008 + fwidth(cn2), abs(cn2 - 0.5))) * smoothstep(0.66, 0.8, nzr(rp * 0.009 + 0.6)) * 0.8;
      float seam = (1.0 - smoothstep(0.0, 0.03, abs(fract(rp.x / 3.6 + 0.5) - 0.5) * 3.6)) * 0.35; // longitudinal tar seams between paving lanes
      float age = nzg(rp * 0.021 + 0.7) * 0.5 + nzr(rp * 0.008 + 0.2) * 0.5;
      albedo *= (0.86 + 0.3 * age) * (1.0 - 0.72 * max(crack, crack2)) * (1.0 - 0.4 * seam);
      albedo = mix(albedo, albedo * 0.72, pat); albedo *= 1.0 - 0.35 * pedge;
      rough = mix(rough, 0.55, pat * 0.4);
    }
    // facade and wall grime: ground-up soot, rain streaks under ledges, mottling
    if (vert > 0.01 && ${WALL_IDS.map((id) => `inL(Lmain, ${LI(id)})`).join(' + ')} > 0.5) {
      float along = vWPos.x * dgn.z - vWPos.z * dgn.x;
      float st1 = nzr(vec2(along * 0.075, vWPos.y * 0.0045)); float st2 = nzg(vec2(along * 0.21 + 0.3, vWPos.y * 0.012));
      float streak = smoothstep(0.5, 0.78, st1 * 0.6 + st2 * 0.5);
      float mott = nzr(vec2(along, vWPos.y) * 0.011 + 0.13);
      float lowSoot = (1.0 - vTint.a) * 0.9;
      albedo *= vert * (1.0 - 0.3 * streak - lowSoot * (0.6 + 0.8 * st2)) + (1.0 - vert);
      albedo *= 1.0 + vert * (mott - 0.5) * 0.22;
      rough = min(1.0, rough + 0.05 * streak);
    }
    // kerb stone: dirty bottom, tyre rub and grit
    if (inL(Lmain, ${LI('tex.curb_stone')}) > 0.5) {
      float kn = nzr(vTUv * vec2(0.13, 0.5) + 0.2);
      float lowK = mix(0.6, 1.0, smoothstep(0.0, 0.14, vTUv.y)) * mix(1.0, 0.88 + 0.2 * kn, vert);
      albedo *= mix(0.9 + 0.12 * kn, lowK, vert);
      albedo = mix(albedo, albedo * vec3(1.1, 0.95, 0.8), 0.35 * vert);
    }
    // pavers and cobbles: per-stone tone, the odd missing paver
    if (inL(Lmain, ${LI('tex.paver')}) > 0.5) {
      vec2 pc = floor(vTUv * 8.0); float ph = dh(pc + 11.0);
      albedo *= (0.82 + 0.34 * ph) * (1.0 - 0.45 * step(0.985, dh(pc + 2.0)));
    }
    if (inL(Lmain, ${LI('tex.cobble')}) > 0.5) {
      vec2 pc = floor(vTUv * vec2(9.0, 14.0)); float ph = dh(pc + 5.0);
      albedo *= 0.8 + 0.4 * ph;
    }
    // facade-module glass (LOD1): per-window tone
    if (vAux.w > 0.5 && vAux.w < 127.5 && ${FACADE_IDS.map((id) => `inL(Lmain, ${LI(id)})`).join(' + ')} > 0.5) {
      float fh = dh(floor(tuv + 0.002) * 1.37 + vAux.w); float gm = smoothstep(0.86, 0.89, sA.a);
      albedo = mix(albedo, albedo * (0.55 + 0.9 * fh) + vec3(0.02, 0.03, 0.05) * step(0.8, fh) , gm);
    }
    // window states (LOD0 panes): clear, curtains (open / drawn), blinds half / closed
    if (vAux.w > 0.5 && vAux.w < 127.5 && inL(Lmain, ${LI('tex.glass_window')}) > 0.5) {
      vec2 wc = floor(tuv + 0.002); wHash = dh(wc * vec2(1.7, 2.3) + vAux.w * 0.31); float ks = fract(wHash * 7.31);
      wUv = clamp((fract(tuv) - 0.08) / 0.84, 0.0, 1.0);
      float cov = 0.0;
      if (ks < 0.38) { wSt = 0.0; }
      else if (ks < 0.58) { wSt = 1.0; float side = step(wUv.x, 0.2 + 0.1 * fract(wHash * 3.1)) + step(1.0 - (0.2 + 0.1 * fract(wHash * 5.7)), wUv.x); cov = clamp(side, 0.0, 1.0); wCurt = cov; }
      else if (ks < 0.74) { wSt = 2.0; float lim = 0.45 + 0.35 * fract(wHash * 3.7); cov = step(lim, wUv.y); wBlind = cov * (0.8 + 0.2 * step(0.5, fract(wUv.y * 13.0))); }
      else if (ks < 0.86) { wSt = 3.0; cov = 1.0; wBlind = 0.8 + 0.2 * step(0.5, fract(wUv.y * 13.0)); }
      else { wSt = 4.0; cov = smoothstep(0.55, 0.7, wUv.y) * step(0.5, fract(wHash * 11.0)) * 0.0 + step(wUv.x, 0.07) + step(0.93, wUv.x); cov = clamp(cov, 0.0, 1.0); wCurt = cov; }
      float pk = fract(wHash * 19.3);
      wCurtCol = pk < 0.3 ? vec3(0.78, 0.66, 0.5) : pk < 0.55 ? vec3(0.62, 0.34, 0.3) : pk < 0.8 ? vec3(0.8, 0.78, 0.72) : vec3(0.34, 0.45, 0.58);
      vec3 cc = wCurt > 0.0 ? wCurtCol * (0.45 + 0.25 * nzr(wUv * 4.0)) : vec3(0.7, 0.66, 0.58) * wBlind * 0.42;
      albedo = mix(albedo, cc, cov);
      // interior glimpse behind clear glass: darker floor, brighter ceiling band
      #ifdef LOE_LOW
      float ig = 0.0;
#else
      float ig = (1.0 - cov) * 0.5;
#endif
      albedo += vec3(0.05, 0.045, 0.04) * ig * smoothstep(0.55, 1.0, wUv.y) + vec3(0.02, 0.018, 0.016) * ig;
      sA.a *= 1.0 - cov; // paint covers are not mirror-like
      rough = mix(rough, 0.85, cov);
    }
  }
`;

// ---- GLSL ---------------------------------------------------------------------------------------------------------------------
const FOG_PARS_V = `varying vec3 vWPos;`;
const FOG_V = `#include <fog_vertex>
vWPos = cameraPosition + transpose(mat3(viewMatrix)) * mvPosition.xyz;`;
const FOG_PARS_F = `#include <fog_pars_fragment>
varying vec3 vWPos; uniform float uFogBase, uFogFall, uFogStart; uniform vec3 uSunDir, uSunFog;
vec3 applyFog(vec3 col){
#ifdef USE_FOG
  vec3 fv = vWPos - cameraPosition; float fd = length(fv); vec3 fdir = fv / max(fd, 1e-3);
  float y0 = max(cameraPosition.y - uFogBase, -40.0);
  float kd = clamp(uFogFall * fv.y, -30.0, 30.0);
  float t = abs(kd) > 1e-3 ? (1.0 - exp(-kd)) / kd : 1.0;
  float amt = 1.0 - exp(-fogDensity * exp(-uFogFall * y0) * t * max(fd - uFogStart, 0.0));
  // in-scatter: warm toward the sun (broad lobe + tight core), cool blue haze away from it
  float cs = max(dot(fdir, uSunDir), 0.0); float sun = pow(cs, 3.0) * 0.55 + pow(cs, 18.0) * 0.55;
  vec3 fc = mix(fogColor, uSunFog, clamp(sun, 0.0, 0.85));
  return mix(col, fc, clamp(amt, 0.0, 1.0));
#else
  return col;
#endif
}`;
const FOG_F = `gl_FragColor.rgb = applyFog(gl_FragColor.rgb);
  if (any(isnan(gl_FragColor.rgb)) || any(isinf(gl_FragColor.rgb))) gl_FragColor.rgb = vec3(0.0); // one bad texel would otherwise smear through the bloom chain`;

const ARR_PARS = `
uniform sampler2DArray tHA, tHD, tSA, tSD, tDA, tDD; uniform sampler2D tProps;
uniform float uWet, uNight, uWinLit, uLampGain, uWinGain, uDay, uMacro, uNoiseL, uTime;
void sampleLayer(float L, vec2 uv, vec2 gx, vec2 gy, out vec4 a, out vec4 d){
#ifdef LOE_LOW
  // Low tier: albedo only (no normal/roughness/AO fetch); constant data texel
  d = vec4(0.5, 0.5, 0.86, 1.0);
  if (L < 63.5) a = textureGrad(tHA, vec3(uv, L), gx, gy);
  else if (L < 127.5) a = textureGrad(tSA, vec3(uv, L - 64.0), gx, gy);
  else a = textureGrad(tDA, vec3(uv, L - 128.0), gx, gy);
#else
  if (L < 63.5){ a = textureGrad(tHA, vec3(uv, L), gx, gy); d = textureGrad(tHD, vec3(uv, L), gx, gy); }
  else if (L < 127.5){ a = textureGrad(tSA, vec3(uv, L - 64.0), gx, gy); d = textureGrad(tSD, vec3(uv, L - 64.0), gx, gy); }
  else { a = textureGrad(tDA, vec3(uv, L - 128.0), gx, gy); d = textureGrad(tDD, vec3(uv, L - 128.0), gx, gy); }
#endif
}
float hashW(float n){ return fract(sin(n * 12.9898 + uDay * 78.233) * 43758.5453); }
float dh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nzr(vec2 uv){ return texture(tDA, vec3(uv, uNoiseL)).r; }
float nzg(vec2 uv){ return texture(tDA, vec3(uv, uNoiseL)).g; }
float inL(float L, float a){ return step(abs(L - a), 0.5); }
`;
// fragment main: sample layers (or terrain splat), then tint, macro variation, wetness
const ARR_MAIN = (splat) => `
  vec2 tuv = vTUv;
${splat ? `
  { // terrain: planar projection on steep faces (no stretched stripes on cliffs and the mountain ring)
    vec3 gn = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
    if (abs(gn.y) < 0.62) tuv = (abs(gn.x) > abs(gn.z) ? vWPos.zy : vWPos.xy) / 4.0;
  }` : ''}
  vec2 gx = dFdx(tuv), gy = dFdy(tuv);
  vec4 sA, sD; float Lmain;
${splat ? `
#ifdef LOE_LOW
  // Low tier: blend the two strongest layers only
  float wa = -1.0, wb = -1.0, Lb = uSplatL[0]; Lmain = uSplatL[0];
  for (int i = 0; i < 8; i++){
    float w = i < 4 ? vW0[i] : vW1[i - 4];
    if (w > wa){ wb = wa; Lb = Lmain; wa = w; Lmain = uSplatL[i]; } else if (w > wb){ wb = w; Lb = uSplatL[i]; }
  }
  vec4 a2, d2; sampleLayer(Lmain, tuv, gx, gy, sA, sD);
  if (wb > 0.04){ sampleLayer(Lb, tuv, gx, gy, a2, d2); float f = wb / (wa + wb); sA = mix(sA, a2, f); }
#else
  sA = vec4(0.0); sD = vec4(0.0); float wsum = 0.0; Lmain = uSplatL[0]; float wbest = 0.0;
  for (int i = 0; i < 8; i++){
    float w = i < 4 ? vW0[i] : vW1[i - 4];
    if (w > 0.02){ vec4 a, d; sampleLayer(uSplatL[i], tuv, gx, gy, a, d); sA += a * w; sD += d * w; wsum += w; if (w > wbest){ wbest = w; Lmain = uSplatL[i]; } }
  }
  sA /= max(wsum, 1e-3); sD /= max(wsum, 1e-3);
#endif` : `
  Lmain = vAux.x; sampleLayer(vAux.x, tuv, gx, gy, sA, sD);`}
  vec4 lp = texelFetch(tProps, ivec2(int(Lmain + 0.5), 0), 0);
  vec2 mvUv = vWPos.xz * 0.013;
  vec4 mn = texture(tDA, vec3(mvUv, uNoiseL));
#ifdef LOE_LOW
  vec4 mn2 = mn.gbar;
#else
  vec4 mn2 = texture(tDA, vec3(vWPos.xz * 0.0021 + 0.37, uNoiseL));
#endif
  float macro = (mn.r * 0.6 + mn2.r * 0.4 - 0.5) * lp.b * uMacro;
  vec3 albedo = sA.rgb * vTint.rgb * ${splat ? '1.06' : '1.0'} * (1.0 + ${splat ? '0.55' : '0.16'} * macro);
${splat ? '  albedo *= vec3(1.0 + 0.16 * macro, 1.0, 1.0 - 0.2 * macro);' : ''}
  float rough = clamp(sD.z * (1.0 + 0.2 * macro), 0.02, 1.0);
${splat ? '' : DETAIL_PRE + DETAIL_MAIN()}
  float wetAmt = uWet * lp.r;
  float puddle = wetAmt * smoothstep(0.55, 0.62, mn2.a * 0.5 + mn.a * 0.5);
  albedo *= 1.0 - 0.25 * wetAmt - 0.2 * puddle;
  rough = mix(rough, 0.25, wetAmt * 0.75); rough = mix(rough, 0.04, puddle);
  diffuseColor.rgb *= albedo;
`;
const NORMAL_MAIN = `
#ifndef LOE_LOW
  {
    vec3 mapN = vec3(sD.xy * 2.0 - 1.0, 0.0);
    float puddleFlat = 1.0 - puddle;
    mapN.xy *= texelFetch(tProps, ivec2(int(Lmain + 0.5), 0), 0).g * 2.0 * puddleFlat;
    mapN.z = sqrt(max(0.0, 1.0 - dot(mapN.xy, mapN.xy)));
    vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition); vec3 N = normal;
    vec3 q1p = cross(q1, N), q0p = cross(N, q0);
    vec3 T = q1p * gx.x + q0p * gy.x, B = q1p * gx.y + q0p * gy.y;
    float det = max(dot(T, T), dot(B, B)); float sc = det == 0.0 ? 0.0 : inversesqrt(det);
    normal = normalize(T * sc * mapN.x + B * sc * mapN.y + N * mapN.z);
  }
#endif
`;
const AO_MAIN = `
  {
    float ambientOcclusion = sD.w * vTint.a;
    reflectedLight.indirectDiffuse *= ambientOcclusion;
    float dotNV = saturate(dot(geometryNormal, geometryViewDir));
    reflectedLight.indirectSpecular *= computeSpecularOcclusion(dotNV, ambientOcclusion, material.roughness);
  }
`;
const EMIT_MAIN = `
  if (vAux.w > 0.5){
    // windows: one random lit state per uv cell (window / facade module), masked by the glass channel (metal 0.9)
    if (vAux.w < 127.5){ float hw = hashW(vAux.w + dot(floor(tuv + 0.002), vec2(7.13, 3.71))); float gm = smoothstep(0.86, 0.89, wG0); if (hw < uWinLit){ float wk = fract(hw * 29.3); vec3 wcol = wk < 0.62 ? vec3(1.0, 0.68, 0.36) : wk < 0.82 ? vec3(1.0, 0.88, 0.66) : wk < 0.94 ? vec3(0.5, 0.74, 1.0) : vec3(0.85, 0.5, 1.0);
      // fake room behind the pane: ceiling shade, a lamp glow, furniture silhouette, curtain and blind cover
      float room = 1.0;
      if (wSt > -0.5 && inL(Lmain, ${LI('tex.glass_window')}) > 0.5){
        float lx = 0.2 + 0.6 * fract(hw * 17.0);
        room = (0.55 + 0.45 * smoothstep(0.0, 1.0, wUv.y)) * (0.6 + 0.4 * smoothstep(1.0, 0.6, wUv.y));
        room += 0.7 * smoothstep(0.42, 0.0, length((wUv - vec2(lx, 0.78)) * vec2(1.0, 1.4)));
        room *= 1.0 - 0.55 * step(wUv.y, 0.2 + 0.12 * fract(hw * 91.0)) * step(abs(wUv.x - fract(hw * 53.0)), 0.2);
        wcol = mix(wcol, wcol * wCurtCol * 1.4, wCurt * 0.8);
        room *= 1.0 - wCurt * 0.35;
        room *= 1.0 - 0.45 * wBlind;
      }
      totalEmissiveRadiance += wcol * room * (0.55 + 0.9 * fract(hw * 13.7)) * uWinGain * gm; } }
    else { vec3 lc = vTint.rgb / max(max(vTint.r, vTint.g), max(vTint.b, 1e-3)); totalEmissiveRadiance += lc * vec3(1.0, 0.84, 0.6) * ((vAux.w - 128.0) / 127.0) * max(uLampGain, 0.35 * step(250.5, vAux.w)); }
  }
`;
const WIND_V = `
  {
    float ww = clamp(aWind, 0.0, 1.0);
    vec3 ip = vec3(0.0);
    #ifdef USE_INSTANCING
      ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    #endif
    float ph = dot(ip.xz, vec2(0.13, 0.17));
    float sw = sin(uTime * 1.3 + ph) * 0.6 + sin(uTime * 2.1 + ph * 1.7) * 0.3;
    float fl = sin(uTime * 6.0 + position.x * 3.0 + position.z * 2.0 + ph) * 0.15;
    transformed.xz += uWind.xz * uWindStr * ww * ww * (sw + 0.6) * 0.35 * max(1.0, position.y * 0.08);
    transformed += normal * fl * uWindStr * ww * 0.12;
  }
`;

/**
 * patch(material, flags): flags = { arr, splat, wind, fog (default true), instanced, extra(shader) }.
 * Installs one onBeforeCompile; composes with an earlier hook (CSM) when present.
 */
export function patchMaterial(mat, flags) {
  const prev = mat.onBeforeCompile && mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile ? mat.onBeforeCompile : null;
  const key = 'loe:' + ['arr', 'splat', 'wind', 'nofog', 'emit'].filter((k) => k === 'nofog' ? flags.fog === false : flags[k]).join(',') + (flags.key || '');
  mat.userData.patchFlags = flags;
  mat.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    for (const k in G) shader.uniforms[k] = G[k];
    let vs = shader.vertexShader, fs = shader.fragmentShader;
    if (flags.fog !== false) {
      vs = vs.replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\n' + FOG_PARS_V).replace('#include <fog_vertex>', FOG_V);
      fs = fs.replace('#include <fog_pars_fragment>', FOG_PARS_F).replace('#include <fog_fragment>', FOG_F);
    }
    if (flags.arr) {
      vs = vs.replace('#include <common>', `#include <common>
attribute vec4 aTint; varying vec2 vTUv; varying vec4 vTint;
${flags.splat ? 'attribute vec4 aW0; attribute vec4 aW1; varying vec4 vW0; varying vec4 vW1;' : 'attribute vec4 aAux; flat varying vec4 vAux;'}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
vTUv = uv; vTint = aTint; ${flags.splat ? 'vW0 = aW0; vW1 = aW1;' : 'vAux = aAux;'}`);
      fs = fs.replace('#include <common>', `#include <common>
varying vec2 vTUv; varying vec4 vTint; ${flags.splat ? 'varying vec4 vW0; varying vec4 vW1; uniform float uSplatL[8];' : 'flat varying vec4 vAux;'}
${ARR_PARS}`)
        .replace('#include <map_fragment>', ARR_MAIN(flags.splat))
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = rough;')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = sA.a;')
        .replace('#include <normal_fragment_maps>', NORMAL_MAIN)
        .replace('#include <aomap_fragment>', AO_MAIN)
        .replace('#include <emissivemap_fragment>', flags.splat ? '' : EMIT_MAIN);
    }
    if (flags.wind) {
      vs = vs.replace('#include <common>', '#include <common>\nattribute float aWind; uniform float uTime, uWindStr; uniform vec3 uWind;').replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND_V);
    }
    if (flags.extra) { const r = flags.extra(vs, fs, shader); vs = r[0]; fs = r[1]; }
    shader.vertexShader = vs; shader.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => key + (mat.defines && mat.defines.USE_CSM ? ':csm' + mat.defines.CSM_CASCADES : '');
  return mat;
}
