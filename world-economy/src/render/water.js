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

function waterMaterial(profile, hTex) {
  const P = {
    ocean: { sh: 0x3fd0c0, mid: 0x0f6a8a, deep: 0x0a3350, waves: 1 },
    lake: { sh: 0x5a6a46, mid: 0x2a3a2e, deep: 0x11201c, waves: 0 },
  }[profile];
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  const U = {
    tHeight: { value: hTex }, uShallow: { value: lin(P.sh) }, uMid: { value: lin(P.mid) }, uDeep: { value: lin(P.deep) }, uRiver: { value: lin(0x445548) },
    uWaves: { value: WAVES }, uWaveF: { value: P.waves }, uLevel: { value: profile === 'lake' ? LAKE.level : 0 },
    uNA: { value: LAYERS['tex.water_normal_a'].index - 64 }, uNB: { value: LAYERS['tex.water_normal_b'].index - 64 }, uFoamL: { value: LAYERS['tex.foam'].index - 128 },
  };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0.0, transparent: true, depthWrite: false, envMapIntensity: 1.0 });
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
uniform sampler2DArray tSA, tSD, tDA; varying vec3 vWave;
float depthAt(vec2 p){ vec2 uv = (p + 2000.0) / 4000.0; if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 40.0; return uLevel - texture2D(tHeight, uv).r; }`)
        .replace('#include <map_fragment>', `
  float dep = max(depthAt(vWPos.xz), 0.0);
  float river = smoothstep(1110.0, 1060.0, vWPos.z) * step(-1900.0, vWPos.x) * step(vWPos.x, -150.0) * uWaveF;
  vec3 wc = mix(uShallow, uMid, smoothstep(0.0, 3.0, dep)); wc = mix(wc, uDeep, smoothstep(3.0, 18.0, dep));
  wc = mix(wc, uRiver, river);
  vec2 sp = vWPos.xz; float t = uTime;
  vec4 nA = texture(tSD, vec3(sp / 8.0 + vec2(t * 0.021, t * 0.013), uNA)); vec4 nB = texture(tSD, vec3(sp / 23.0 + vec2(-t * 0.011, t * 0.017), uNB));
  vec2 dn = (nA.xy * 2.0 - 1.0) * 0.6 + (nB.xy * 2.0 - 1.0) * 0.9;
  float foamN = texture(tDA, vec3(sp / 4.0 + vec2(t * 0.02, 0.0), uFoamL)).r;
  float shore = smoothstep(0.7, 0.0, dep) * (0.55 + 0.45 * sin(t * 1.3 - dep * 9.0 + foamN * 3.0));
  float crest = smoothstep(0.25, 0.45, vWave.z) * uWaveF * (1.0 - river);
  float foam = clamp((shore + crest) * foamN * 1.6, 0.0, 1.0);
  diffuseColor.rgb = mix(wc, vec3(0.92, 0.95, 0.96), foam);
  diffuseColor.a = mix(smoothstep(0.0, 0.5, dep) * mix(0.62, 0.96, smoothstep(0.5, 8.0, dep)), 1.0, foam);`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.035 + 0.04 * uWet, 0.5, foam);')
        .replace('#include <normal_fragment_maps>', 'normal = normalize(normal + mat3(viewMatrix) * vec3(dn.x, 0.0, dn.y) * 0.16);');
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

export function buildWater(scene) {
  const group = new THREE.Group(); group.name = 'water';
  const hTex = heightTexture();
  const ocean = waterMaterial('ocean', hTex), lake = waterMaterial('lake', hTex);
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
