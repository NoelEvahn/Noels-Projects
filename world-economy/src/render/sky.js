// Sky dome (Annex A 4.1): analytic Rayleigh/Mie scattering (after three's Sky addon), sun disk, two-octave cloud layer from
// the baked cloud noise, stars and moon at night, horizon blended into the fog colour (no hard horizon). The same dome is
// rendered into a 64^2 cube and PMREM-filtered as scene.environment, refreshed when the sun moves > 3 deg or weather changes,
// amortised: cube faces on one frame, PMREM on the next (Annex G 2.2: one heavy GPU job per frame).
import * as THREE from 'three';
import { G } from './materials/patches.js';
import { LAYERS } from '../art/kit/layers.js';

export const SKY_FUNCS = /* glsl */`
// V1 visual fix: controlled gradient sky. Horizon = haze colour (uFog, so far terrain meets the sky), zenith = deep blue (uZenith),
// warm sun-side glow whose colour follows the sun's elevation, sun disc in HDR (drives bloom).
vec3 skyDay(vec3 dir){
  float up = clamp(dir.y, 0.0, 1.0);
  float cs = max(dot(dir, uSun), 0.0);
  float low = 1.0 - smoothstep(0.0, 0.5, uSun.y);
  vec3 col = mix(uFog, uZenith, pow(up, 0.42));
  // away from the sun the dome stays cool and a little darker; toward the sun it warms
  col *= 1.0 - 0.18 * (1.0 - cs) * (1.0 - low * 0.6);
  vec3 warm = mix(vec3(1.0, 0.80, 0.55), vec3(1.0, 0.45, 0.16), low);
  col += warm * (pow(cs, 4.0) * (0.12 + 0.55 * low) + pow(cs, 24.0) * (0.35 + 0.5 * low) + pow(cs, 400.0) * 1.5) * (1.0 - 0.5 * up) * (1.0 - 0.7 * uCover);
  col += warm * 60.0 * smoothstep(0.99975, 0.99987, cs) * (1.0 - uCover) * (1.0 - uEnv);
  return col;
}
vec3 skyCloud(vec3 dir, vec3 col){
  if (dir.y > 0.0){
    vec2 cp = (cameraPosition.xz + dir.xz * (1800.0 - cameraPosition.y) / max(dir.y, 0.03)) / 9000.0;
    vec2 w = vec2(uTime * 0.0009, uTime * 0.0004);
    vec4 n1 = texture(tSA, vec3(cp + w, uCloudL));
    vec4 n2 = texture(tSA, vec3(cp * 3.1 - w * 1.7 + 0.31, uCloudL));
    float cov = mix(0.34, 0.94, uCover);
    float dens = smoothstep(1.0 - cov, 1.0 - cov + 0.32, n1.r * 0.72 + n2.g * 0.38);
    dens *= smoothstep(0.0, 0.12, dir.y);
    float lightSide = pow(max(dot(dir, uSun), 0.0), 5.0);
    vec3 cLit = mix(vec3(0.50, 0.58, 0.74), vec3(1.15), clamp(n2.b * 0.7 + 0.3, 0.0, 1.0)) * (uSunCol * 0.85 + uFog * 0.35) + uSunCol * lightSide * 0.9 * (1.0 - dens * 0.6);
    cLit *= mix(1.0, 0.45, uStorm);
    vec3 cNight = vec3(0.02, 0.025, 0.035) * (1.0 + uCover);
    vec3 cc = mix(cNight, cLit, uDayAmt);
    col = mix(col, cc, dens * mix(0.85, 1.0, uCover));
  }
  return col;
}
`;
const VS = /* glsl */`varying vec3 vDir; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vDir = wp.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * wp; gl_Position.z = gl_Position.w * 0.99999; }`;
const FS = /* glsl */`
precision highp float; precision highp sampler2DArray;
const float pi = 3.141592653589793;
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
varying vec3 vDir;
uniform vec3 uSun, uMoon, uFog, uZenith, uSunCol, uGround; uniform float uTurb, uRay, uMie, uMieG, uCover, uNight, uTime, uCloudL, uStorm, uExposure, uDayAmt, uEnv;
uniform sampler2DArray tSA;
${SKY_FUNCS}
void main(){
  vec3 dir = normalize(vDir);
  vec3 d = dir; d.y = max(d.y, 0.002);
  vec3 col = skyDay(d) * uDayAmt;
  // night sky: deep blue gradient + stars + moon
  vec3 night = mix(vec3(0.010, 0.014, 0.028), vec3(0.002, 0.004, 0.012), sqrt(max(dir.y, 0.0)));
  vec3 sp = floor(dir * 420.0); float st = hash13(sp); float star = step(0.9975, st) * smoothstep(0.0, 0.2, dir.y) * (0.4 + 2.5 * hash13(sp + 3.1));
  float tw = 0.75 + 0.25 * sin(uTime * 3.0 + st * 100.0);
  night += vec3(0.85, 0.9, 1.0) * star * tw * (1.0 - uCover) * 0.6;
  float md = dot(dir, uMoon); float moon = smoothstep(0.99955, 0.9997, md); float halo = pow(max(md, 0.0), 300.0) * 0.08 + pow(max(md, 0.0), 12.0) * 0.015;
  night += vec3(0.9, 0.92, 1.0) * (moon * 1.8 + halo) * (1.0 - uCover * 0.7);
  col += night * uNight;
  col = skyCloud(dir, col);
  // horizon haze: blend into the fog colour so far terrain and sky meet without a line
  float hz = 1.0 - smoothstep(-0.02, 0.1 + 0.18 * uCover, dir.y);
  col = mix(col, uFog, clamp(hz * 0.95 + uStorm * 0.3, 0.0, 1.0));
  if (dir.y < 0.0) col = mix(uFog, uGround, uEnv * smoothstep(0.0, -0.25, dir.y));
  // environment capture only: the visible dome is bright, but the light it casts on the world is scaled so sun:sky stays ~5:1
  col *= mix(1.0, mix(1.0, 0.62, uEnv), uDayAmt);
  gl_FragColor = vec4(col, 1.0);
}`;

export function createSky(scene, renderer) {
  const uniforms = {
    uSun: { value: new THREE.Vector3(0, 1, 0) }, uMoon: { value: new THREE.Vector3(0, -1, 0) }, uFog: { value: new THREE.Color(0.8, 0.8, 0.8) }, uZenith: { value: new THREE.Color(0.4, 0.55, 0.8) }, uSunCol: { value: new THREE.Color(1, 1, 1) },
    uTurb: { value: 6 }, uRay: { value: 1.6 }, uMie: { value: 0.006 }, uMieG: { value: 0.82 }, uCover: { value: 0.2 }, uNight: { value: 0 }, uTime: { value: 0 },
    uCloudL: { value: LAYERS['tex.cloud_noise'].index - 64 }, uStorm: { value: 0 }, uExposure: { value: 1 }, uDayAmt: { value: 1 }, uGround: { value: new THREE.Color(0.2, 0.17, 0.12) }, uEnv: { value: 0 }, tSA: G.tSA,
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false });
  mat.name = 'mat.sky';
  const geo = new THREE.SphereGeometry(4000, 32, 16);
  const dome = new THREE.Mesh(geo, mat);
  dome.name = 'sky'; dome.renderOrder = 1000; dome.frustumCulled = false; dome.matrixAutoUpdate = false;
  scene.add(dome);
  // environment cube (sky only) -> PMREM
  const envScene = new THREE.Scene();
  const envDome = new THREE.Mesh(geo, mat); envDome.frustumCulled = false; envScene.add(envDome);
  const cubeRT = new THREE.WebGLCubeRenderTarget(64, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cubeCam = new THREE.CubeCamera(1, 6000, cubeRT);
  envScene.add(cubeCam);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, state = 0, lastSun = new THREE.Vector3(9, 9, 9), lastCover = -1, lastFogKey = '';
  const api = {
    dome, uniforms, envMode: 'env',
    get envTexture() { return envRT ? envRT.texture : null; },
    /** call once per frame; refresh: 0 idle, 1 = faces rendered (PMREM next frame) */
    updateEnv(force = false) {
      if (api.envMode === 'off') { if (scene.environment) scene.environment = null; return; }
      if (state === 1) {
        envRT = pmrem.fromCubemap(cubeRT.texture, envRT);
        scene.environment = envRT.texture; state = 0; api.envUpdates = (api.envUpdates || 0) + 1;
        return;
      }
      const s = uniforms.uSun.value;
      const fogKey = uniforms.uFog.value.getHexString();
      if (force || s.angleTo(lastSun) > 0.0524 || Math.abs(uniforms.uCover.value - lastCover) > 0.05 || fogKey !== lastFogKey || !envRT) {
        lastSun.copy(s); lastCover = uniforms.uCover.value; lastFogKey = fogKey;
        envDome.position.set(0, 0, 0); envDome.updateMatrixWorld();
        cubeCam.position.set(0, 30, 0);
        const prevFog = envScene.fog; void prevFog;
        uniforms.uEnv.value = 1; cubeCam.update(renderer, envScene); uniforms.uEnv.value = 0;
        state = 1;
      }
    },
    follow(pos) { dome.position.copy(pos); dome.updateMatrix(); dome.matrixWorld.copy(dome.matrix); },
  };
  return api;
}
