// Water (Annex A 10): one patched MeshStandardMaterial, three profiles. Ocean + river share a camera-centred radial grid
// (<= 20k tris) with the same 4 Gerstner waves as boat physics (vertical, calm zones, rivers flat); lake, ponds and creeks are
// fitted flat meshes. Two scrolling baked normal maps, depth colour from a half-float copy of the world height grid
// (shallow -> deep), soft shore alpha, shore foam band and crest foam, environment reflection + sun glitter from PBR.
import * as THREE from 'three';
import { World } from '../world/query.js';
import { waterBodyAt, LAKE, PONDS, CREEKS, GERSTNER } from '../world/layout/water.js';
import { MatLib } from './materials/matlib.js';
import { patchMaterial, G } from './materials/patches.js';
import { MemTracker } from './perf.js';
import { LAYERS } from '../art/kit/layers.js';
import { SKY_FUNCS } from './sky.js';

function heightTexture() {
  const D = World.data, grid = D.grid, N = grid.N;
  const src = grid.data;
  const half = new Uint16Array(N * N);
  for (let i = 0; i < N * N; i++) half[i] = THREE.DataUtils.toHalfFloat(src[i]);
  const t = new THREE.DataTexture(half, N, N, THREE.RedFormat, THREE.HalfFloatType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  MemTracker.addTexture(t, N, N, 2, false, false);
  return t;
}
const WAVES = GERSTNER.dirsDeg.map((d, i) => new THREE.Vector4(Math.cos(d * Math.PI / 180), Math.sin(d * Math.PI / 180), (2 * Math.PI) / GERSTNER.wavelengths[i], GERSTNER.amplitudes[i]));

function waterMaterial(profile, hTex, skyU) {
  const P = {
    ocean: { sh: 0x4fe0cc, mid: 0x0f7f9a, deep: 0x082f55, waves: 1 },
    lake: { sh: 0x4f7a5c, mid: 0x1c4a4a, deep: 0x082630, waves: 0 },
  }[profile];
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  const U = {
    tHeight: { value: hTex }, uShallow: { value: lin(P.sh) }, uMid: { value: lin(P.mid) }, uDeep: { value: lin(P.deep) }, uRiver: { value: lin(0x3d6672) },
    uWaves: { value: WAVES }, uWaveF: { value: P.waves }, uLevel: { value: profile === 'lake' ? LAKE.level : 0 },
    uNA: { value: LAYERS['tex.water_normal_a'].index - 64 }, uNB: { value: LAYERS['tex.water_normal_b'].index - 64 }, uFoamL: { value: LAYERS['tex.foam'].index - 128 },
    uSun: skyU.uSun, uMoon: skyU.uMoon, uFog: skyU.uFog, uZenith: skyU.uZenith, uSunCol: skyU.uSunCol, uCover: skyU.uCover, uStorm: skyU.uStorm, uDayAmt: skyU.uDayAmt, uEnv: skyU.uEnv, uCloudL: skyU.uCloudL,
  };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0.0, transparent: true, depthWrite: false, envMapIntensity: 0.0 });
  patchMaterial(m, {
    key: ':water' + profile,
    extra(vs, fs, shader) {
      Object.assign(shader.uniforms, U);
      vs = vs.replace('#include <common>', `#include <common>
uniform vec4 uWaves[4]; uniform float uWaveF, uTime; varying vec3 vWave;
float calmF(vec2 p){ float h = smoothstep(-1140.0, -1100.0, p.x) * smoothstep(-660.0, -700.0, p.x) * smoothstep(1130.0, 1160.0, p.y);
  float m = smoothstep(-1400.0, -1370.0, p.x) * smoothstep(-1120.0, -1150.0, p.x) * smoothstep(1120.0, 1150.0, p.y) * smoothstep(1480.0, 1440.0, p.y);
  float river = smoothstep(1110.0, 1060.0, p.y) * step(-1900.0, p.x) * step(p.x, -150.0);
  return (1.0 - 0.8 * max(h, m)) * (1.0 - river); }`)
        .replace('#include <beginnormal_vertex>', `
  vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz; float f = uWaveF * calmF(wp0.xz) * (1.0 - smoothstep(150.0, 420.0, length(wp0.xz - cameraPosition.xz)));
  vec2 sl = vec2(0.0); float hh = 0.0;
  for (int i = 0; i < 4; i++){ vec4 w = uWaves[i]; float om = sqrt(9.81 * w.z); float ph = w.z * dot(w.xy, wp0.xz) - om * uTime; hh += w.w * f * sin(ph); sl += w.w * f * w.z * cos(ph) * w.xy; }
  vWave = vec3(sl, hh);
  vec3 objectNormal = normalize(vec3(-sl.x, 1.0, -sl.y));`)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed.y += hh;');
      fs = fs.replace('#include <common>', `#include <common>
uniform sampler2D tHeight; uniform vec3 uShallow, uMid, uDeep, uRiver; uniform float uLevel, uNA, uNB, uFoamL, uTime, uWet, uNight, uWaveF;
uniform vec3 uSun, uMoon, uFog, uZenith, uSunCol; uniform float uCover, uStorm, uDayAmt, uEnv, uCloudL;
uniform sampler2DArray tSA, tSD, tDA; varying vec3 vWave;
${SKY_FUNCS}
float depthAt(vec2 p){ vec2 uv = (p + 2000.0) / 4000.0; if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 40.0; return uLevel - texture2D(tHeight, uv).r; }`)
        .replace('#include <map_fragment>', `
  float dep = max(depthAt(vWPos.xz), 0.0);
  float river = smoothstep(1110.0, 1060.0, vWPos.z) * step(-1900.0, vWPos.x) * step(vWPos.x, -150.0) * uWaveF;
  vec3 wc = mix(uShallow, uMid, smoothstep(0.0, 3.5, dep)); wc = mix(wc, uDeep, smoothstep(3.0, 20.0, dep));
  wc = mix(wc, uRiver, river);
  vec2 sp = vWPos.xz; float t = uTime;
  float camD = length(vWPos.xz - cameraPosition.xz);
  // four scrolling normal octaves (wind from the west-south-west), fading to calm with distance so the horizon does not shimmer
  vec4 nA = texture(tSD, vec3(sp / 7.0 + vec2(t * 0.040, t * 0.016), uNA));
  vec4 nB = texture(tSD, vec3(sp / 21.0 + vec2(t * 0.020, -t * 0.012), uNB));
  vec4 nC = texture(tSD, vec3(sp / 2.3 + vec2(t * 0.075, t * 0.030), uNA));
  vec4 nD = texture(tSD, vec3(sp / 0.9 + vec2(-t * 0.05, t * 0.09), uNB));
  float nf = 1.0 - smoothstep(120.0, 700.0, camD);
  vec2 dn = ((nA.xy * 2.0 - 1.0) * 0.9 + (nB.xy * 2.0 - 1.0) * 1.2 + (nC.xy * 2.0 - 1.0) * 0.7 * nf + (nD.xy * 2.0 - 1.0) * 0.45 * nf) * (0.55 + 0.35 * uStorm + 0.3 * uWaveF);
  float foamN = texture(tDA, vec3(sp / 4.0 + vec2(t * 0.02, 0.0), uFoamL)).r;
  float foamN2 = texture(tDA, vec3(sp / 1.6 + vec2(0.0, -t * 0.03), uFoamL)).r;
  float shoreW = smoothstep(1.5, 0.0, dep);
  float lines = smoothstep(0.55, 0.95, 0.5 + 0.5 * sin(t * 0.9 - dep * 5.5 + foamN * 2.0)) * smoothstep(0.0, 0.25, dep) * smoothstep(3.2, 0.6, dep);
  float shore = shoreW * (0.45 + 0.55 * sin(t * 1.3 - dep * 9.0 + foamN * 3.0)) * foamN * 1.4 + lines * 0.55 * (0.4 + foamN2);
  float crest = smoothstep(0.22, 0.42, vWave.z + 0.1 * (foamN - 0.5)) * uWaveF * (1.0 - river) * foamN * 1.3;
  float foam = clamp(shore * (1.0 - river * 0.8) + crest, 0.0, 1.0);
  float alphaBody = smoothstep(0.0, 0.45, dep) * mix(0.55, 0.97, smoothstep(0.4, 6.0, dep));
  diffuseColor.rgb = wc; diffuseColor.a = alphaBody;`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = 0.05;')
        .replace('#include <normal_fragment_maps>', 'normal = normalize(normal + mat3(viewMatrix) * vec3(dn.x, 0.0, dn.y) * 0.2);')
        .replace('#include <opaque_fragment>', `
  vec3 Vw = normalize(cameraPosition - vWPos);
  vec3 Nw = normalize(inverseTransformDirection(normal, viewMatrix));
  float nv = clamp(dot(Nw, Vw), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  F = clamp(F * (1.0 - 0.25 * smoothstep(0.0, 0.5, dep) * 0.0), 0.0, 1.0);
  // mirror of the sky (gradient + clouds), blended into the haze at the horizon exactly like the dome
  vec3 Rv = reflect(-Vw, Nw); Rv.y = max(Rv.y, 0.012);
  vec3 refl = skyCloud(Rv, skyDay(Rv) * uDayAmt);
  refl += vec3(0.010, 0.016, 0.034) * uNight;
  float hzr = 1.0 - smoothstep(-0.02, 0.1 + 0.18 * uCover, Rv.y);
  refl = mix(refl, uFog, clamp(hzr * 0.95 + uStorm * 0.3, 0.0, 1.0));
  // body colour: lit by sky haze + sun, darker when the sun is low or it is night
  float sunUp = clamp(uSun.y * 1.6, 0.0, 1.0);
  vec3 body = wc * (uFog * 0.62 + uSunCol * (0.30 + 0.5 * sunUp) + vec3(0.018, 0.026, 0.05) * uNight);
  // sun / moon glitter on the fine normals
  float sp1 = texture(tDA, vec3(vWPos.xz / 1.3 + vec2(uTime * 0.08, uTime * 0.03), uFoamL)).r;
  vec3 Hs = normalize(uSun + Vw); float nh = max(dot(Nw, Hs), 0.0);
  float glit = (pow(nh, 1400.0) * 90.0 * (0.25 + 1.4 * sp1) + pow(nh, 120.0) * 0.9 + pow(nh, 14.0) * 0.12) * (1.0 - 0.85 * uCover) * (1.0 - 0.6 * uStorm);
  vec3 spec = uSunCol * glit * smoothstep(0.0, 0.08, uSun.y);
  vec3 Hm = normalize(uMoon + Vw); float nm = max(dot(Nw, Hm), 0.0);
  spec += vec3(0.55, 0.7, 1.0) * (pow(nm, 600.0) * 14.0 * (0.3 + sp1) + pow(nm, 60.0) * 0.1) * uNight * (1.0 - 0.7 * uCover);
  vec3 foamCol = vec3(0.93, 0.96, 0.98) * (uSunCol * 0.85 + uFog * 0.55 + vec3(0.02, 0.03, 0.05) * uNight);
  vec3 wcol = mix(body, refl, F) + spec;
  wcol = mix(wcol, foamCol, foam);
  float aOut = mix(max(diffuseColor.a, F * 0.96), 1.0, foam);
  gl_FragColor = vec4(wcol, aOut);`);
      return [vs, fs];
    },
  });
  m.name = 'mat.water.' + profile;
  return m;
}

function flatMesh(pos, idx, mat, name) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(pos.length).map((v, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere(); MemTracker.addGeometry(g);
  const m = new THREE.Mesh(g, mat); m.name = name; m.renderOrder = 2; m.matrixAutoUpdate = false; m.receiveShadow = true;
  return m;
}

export function buildWater(scene, skyU) {
  const group = new THREE.Group(); group.name = 'water';
  const hTex = heightTexture();
  const ocean = waterMaterial('ocean', hTex, skyU), lake = waterMaterial('lake', hTex, skyU);
  // ocean radial grid: 72 spokes x 52 rings, ring radius grows geometrically from 1.5 m to 7000 m
  {
    const S = 72, R = 52, pos = [], idx = [];
    pos.push(0, 0, 0);
    for (let r = 1; r <= R; r++) { const rad = 1.5 * Math.pow(7000 / 1.5, (r - 1) / (R - 1)); for (let s = 0; s < S; s++) { const a = (s / S) * Math.PI * 2; pos.push(Math.cos(a) * rad, 0, Math.sin(a) * rad); } }
    for (let s = 0; s < S; s++) idx.push(0, 1 + ((s + 1) % S), 1 + s);
    for (let r = 1; r < R; r++) for (let s = 0; s < S; s++) { const a = 1 + (r - 1) * S + s, b = 1 + (r - 1) * S + ((s + 1) % S), c = a + S, d = b + S; idx.push(a, b, d, a, d, c); }
    const m = flatMesh(new Float32Array(pos), new Uint32Array(idx), ocean, 'water.ocean');
    m.frustumCulled = false; m.matrixAutoUpdate = true;
    group.add(m); group.userData.ocean = m;
  }
  // lake: 8 m raster, ponds: discs, creeks: ribbons (flat, lake profile)
  {
    const pos = [], idx = [];
    const x0 = LAKE.cx - LAKE.a * 1.15, x1 = LAKE.cx + LAKE.a * 1.15, z0 = LAKE.cz - LAKE.b * 1.15, z1 = LAKE.cz + LAKE.b * 1.15;
    const step = 8, nx = Math.ceil((x1 - x0) / step), nz = Math.ceil((z1 - z0) / step);
    const water = new Uint8Array((nx + 1) * (nz + 1));
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const wb = waterBodyAt(x0 + i * step, z0 + j * step); water[j * (nx + 1) + i] = wb && wb.body === 'lake' ? 1 : 0; }
    const vid = new Int32Array((nx + 1) * (nz + 1)).fill(-1);
    const getV = (i, j) => { const k = j * (nx + 1) + i; if (vid[k] < 0) { vid[k] = pos.length / 3; pos.push(x0 + i * step, LAKE.level, z0 + j * step); } return vid[k]; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * (nx + 1) + i;
      if (water[k] || water[k + 1] || water[k + nx + 1] || water[k + nx + 2]) { const a = getV(i, j), b = getV(i + 1, j), c = getV(i, j + 1), d = getV(i + 1, j + 1); idx.push(a, c, b, b, c, d); }
    }
    for (const id in PONDS) {
      const p = PONDS[id], c0 = pos.length / 3, n = 28;
      pos.push(p.cx, p.level, p.cz);
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pos.push(p.cx + Math.cos(a) * (p.r + 2), p.level, p.cz + Math.sin(a) * (p.r + 2)); }
      for (let i = 0; i < n; i++) idx.push(c0, c0 + 1 + ((i + 1) % n), c0 + 1 + i);
    }
    for (const id in CREEKS) {
      const c = CREEKS[id], pts = [];
      for (let k = 0; k < c.pts.length - 1; k++) { const [ax, az] = c.pts[k], [bx, bz] = c.pts[k + 1]; const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 12)); for (let q = 0; q < n; q++) pts.push([ax + (bx - ax) * q / n, az + (bz - az) * q / n]); }
      pts.push(c.pts[c.pts.length - 1]);
      const b0 = pos.length / 3;
      for (let k = 0; k < pts.length; k++) {
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
        const nx2 = -dz / l * c.width / 2, nz2 = dx / l * c.width / 2, y = World.heightAt(pts[k][0], pts[k][1]) + 0.12;
        pos.push(pts[k][0] + nx2, y, pts[k][1] + nz2, pts[k][0] - nx2, y, pts[k][1] - nz2);
        if (k > 0) { const i = b0 + (k - 1) * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
      }
    }
    group.add(flatMesh(new Float32Array(pos), new Uint32Array(idx), lake, 'water.lake'));
  }
  scene.add(group);
  return {
    group, materials: [ocean, lake],
    update(cam, waveF) {
      const o = group.userData.ocean; o.position.set(Math.round(cam.x / 4) * 4, 0, Math.round(cam.z / 4) * 4);
      ocean.userData.waveF = waveF;
    },
  };
}
export { MatLib, G };
