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
  for (const id of ['tex.glass_window', 'tex.glass_curtain', 'tex.carpaint_flake', 'tex.metal_aluminium']) { d[LAYERS[id].index * 4 + 2] = 40; d[LAYERS[id].index * 4 + 3] = 255; }
  for (const id of ['tex.flat', 'tex.fabric_cloth', 'tex.plastic']) d[LAYERS[id].index * 4 + 2] = 90;
  const t = new THREE.DataTexture(d, 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.needsUpdate = true; t.minFilter = t.magFilter = THREE.NearestFilter;
  G.tProps.value = t;
  void LAYER_LIST;
  return t;
}

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
  float sun = pow(max(dot(fdir, uSunDir), 0.0), 8.0);
  return mix(col, mix(fogColor, uSunFog, sun * 0.6), clamp(amt, 0.0, 1.0));
#else
  return col;
#endif
}`;
const FOG_F = `gl_FragColor.rgb = applyFog(gl_FragColor.rgb);`;

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
`;
// fragment main: sample layers (or terrain splat), then tint, macro variation, wetness
const ARR_MAIN = (splat) => `
  vec2 tuv = vTUv; vec2 gx = dFdx(tuv), gy = dFdy(tuv);
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
  vec3 albedo = sA.rgb * vTint.rgb * ${splat ? '1.28' : '1.0'} * (1.0 + 0.16 * macro);
  float rough = clamp(sD.z * (1.0 + 0.2 * macro), 0.02, 1.0);
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
    if (vAux.w < 127.5){ float hw = hashW(vAux.w); if (hw < uWinLit) totalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * (0.55 + 0.9 * fract(hw * 13.7)) * uWinGain; }
    else totalEmissiveRadiance += vec3(1.0, 0.84, 0.6) * ((vAux.w - 128.0) / 127.0) * uLampGain;
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
