// Effects (Annex A 4.4, 4.5, 11): light pool (fixed number of real point lights, assigned every 0.25 s to the lamps nearest the
// camera, faded in), instanced additive light-pool decals under lamps at night, GPU-animated rain streaks in a camera-following
// volume (one draw), splash ripples, flickering fire lights/particles for fireplaces and campfires, lightning flashes.
// Nothing here allocates per frame; counts are capped by the quality preset (particles, lightPool).
import * as THREE from 'three';
import { World } from '../world/query.js';
import { MatLib } from './materials/matlib.js';
import { decalCell, particleCell } from './textures/canvasTex.js';

const RAIN_VS = /* glsl */`
attribute vec3 aOff; uniform float uTime, uSpeed; uniform vec3 uCam, uBox, uWind; varying float vA; varying vec2 vUv; varying vec3 vWPos;
void main(){
  vec3 p = aOff * uBox; p.y -= uTime * uSpeed; p.xz += uWind.xz * uTime * 3.0;
  p = mod(p - uCam + uBox * 0.5, uBox) + uCam - uBox * 0.5;
  vec3 toCam = normalize(uCam - p); vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 wp = p + right * position.x * 0.02 + vec3(0.0, position.y * 0.7, 0.0) + uWind * position.y * 0.15;
  vA = 1.0 - smoothstep(0.35, 0.5, length((p - uCam) / uBox));
  vUv = uv; vWPos = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const RAIN_FS = /* glsl */`uniform float uAlpha; uniform vec3 uCol; varying float vA; varying vec2 vUv; void main(){ float a = (1.0 - abs(vUv.x * 2.0 - 1.0)) * (1.0 - abs(vUv.y * 2.0 - 1.0)); gl_FragColor = vec4(uCol, a * vA * uAlpha); }`;

// pooled billboard puffs: smoke columns and flames over fires/fireplaces, and soft fog cards (Annex A 4.2, 11). Life and motion
// are computed in the vertex shader from time and a per-instance seed; the CPU only rewrites emitters every 0.25 s.
const PUFF_VS = /* glsl */`
attribute vec4 aEm; attribute float aSeed; uniform float uTime; uniform vec4 uCell; uniform vec3 uWind; varying vec2 vUv; varying float vA; varying vec3 vWPos; varying float vKind;
void main(){
  float kind = aEm.w; vKind = kind; vec3 p = aEm.xyz; float size; float a;
  if (kind < 0.5){ // smoke: 6 s life, rises 7 m, grows, drifts with the wind
    float t = fract(uTime / 6.0 + aSeed); p += vec3(0.0, t * 7.0, 0.0) + uWind * t * t * 5.0 + vec3(sin(aSeed * 40.0), 0.0, cos(aSeed * 31.0)) * 0.3;
    size = 0.5 + t * 2.6; a = smoothstep(0.0, 0.12, t) * (1.0 - t) * 0.55;
  } else if (kind < 1.5){ // flame: 0.7 s life
    float t = fract(uTime / 0.7 + aSeed); p += vec3(sin(aSeed * 60.0) * 0.12, t * 0.7, cos(aSeed * 47.0) * 0.12);
    size = 0.45 * (1.0 - t * 0.6); a = (1.0 - t) * 0.9;
  } else { // fog card: slow drift, large
    p += vec3(sin(uTime * 0.05 + aSeed * 9.0), 0.0, cos(uTime * 0.04 + aSeed * 7.0)) * 3.0;
    size = 9.0 + aSeed * 7.0; a = 0.22;
    float d = distance(p, cameraPosition); a *= smoothstep(4.0, 16.0, d) * (1.0 - smoothstep(60.0, 90.0, d));
  }
  vec3 toCam = normalize(cameraPosition - p); vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam)); vec3 up = kind > 1.5 ? vec3(0.0, 0.45, 0.0) : cross(toCam, right);
  vec3 wp = p + (right * position.x + up * position.y) * size;
  vUv = mix(uCell.xy, uCell.zw, uv); vA = a; vWPos = wp;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const PUFF_FS = /* glsl */`
uniform sampler2D tMap; uniform vec3 uSmoke, uFog; varying vec2 vUv; varying float vA; varying vec3 vWPos; varying float vKind;
void main(){
  vec4 c = texture2D(tMap, vUv); float a = c.a * vA; if (a < 0.01) discard;
  vec3 col = vKind < 0.5 ? uSmoke * c.rgb : vKind < 1.5 ? vec3(1.6, 0.75, 0.25) * 2.2 : uFog;
  gl_FragColor = vec4(col, a);
}`;

export function createEffects({ scene, camera }) {
  const group = new THREE.Group(); group.name = 'effects'; scene.add(group);
  const st = { lights: [], poolN: 8, maxParticles: 4000, rainN: 0, lastAssign: 0, lastPools: new THREE.Vector3(1e9, 0, 0), fireT: 0 };
  // ---- light pool ------------------------------------------------------------------------------------------------------------------
  function setPool(n) {
    for (const l of st.lights) group.remove(l);
    st.lights = [];
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffc888, 0, 26, 2); l.name = 'pool' + i; l.userData.target = 0; group.add(l); st.lights.push(l); }
    st.poolN = n;
  }
  // lamp sources: decoration lamps (world decor) + interior/fire lights registered by builders
  const lampList = () => (World.data.decor && World.data.decor.lamps) || [];
  const fires = () => (World.data.decor && World.data.decor.fires) || [];
  const cand = new Float32Array(64 * 2), candIdx = new Int32Array(64);
  function assign(night) {
    const L = lampList(), F = fires(), p = camera.position;
    let n = 0;
    // insertion of the nearest sources (fires first: they matter at any hour indoors)
    const consider = (x, y, z, kind, i) => {
      const d = (x - p.x) ** 2 + (z - p.z) ** 2 + (y - p.y) ** 2;
      if (n < st.poolN) { cand[n * 2] = d; cand[n * 2 + 1] = kind * 100000 + i; n++; return; }
      let worst = 0; for (let k = 1; k < n; k++) if (cand[k * 2] > cand[worst * 2]) worst = k;
      if (d < cand[worst * 2]) { cand[worst * 2] = d; cand[worst * 2 + 1] = kind * 100000 + i; }
    };
    for (let i = 0; i < F.length; i++) consider(F[i][0], F[i][1], F[i][2], 1, i);
    if (night > 0.05) for (let i = 0; i < L.length; i += 1) { const q = L[i]; if (Math.abs(q[0] - p.x) < 140 && Math.abs(q[2] - p.z) < 140) consider(q[0], q[1], q[2], 0, i); }
    for (let k = 0; k < st.lights.length; k++) {
      const l = st.lights[k];
      if (k >= n || cand[k * 2] > 160 * 160) { l.userData.target = 0; continue; }
      const id = cand[k * 2 + 1], kind = Math.floor(id / 100000), i = id % 100000;
      const src = kind === 1 ? F[i] : L[i];
      l.position.set(src[0], src[1] - (kind ? 0 : 0.4), src[2]);
      l.userData.kind = kind; l.userData.target = kind ? 1 : night;
      l.color.setHex(kind ? 0xff9a50 : 0xffcf90); l.distance = kind ? 9 : 24;
      candIdx[k] = id;
    }
  }
  // ---- light-pool decals (instanced additive quads) ---------------------------------------------------------------------------------------
  const poolGeo = new THREE.PlaneGeometry(1, 1); poolGeo.rotateX(-Math.PI / 2);
  { const c = decalCell('pool'), uv = poolGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, c[0] + uv.getX(i) * (c[2] - c[0]), c[1] + uv.getY(i) * (c[3] - c[1])); }
  const POOLS = 700;
  const pools = new THREE.InstancedMesh(poolGeo, MatLib.get('mat.lightpool'), POOLS); pools.count = 0; pools.frustumCulled = false; pools.renderOrder = 3; pools.name = 'fx.lightpools'; group.add(pools);
  function rebuildPools(night) {
    const L = lampList(), p = camera.position; let n = 0;
    const m = pools.instanceMatrix.array;
    if (night > 0.05) for (let i = 0; i < L.length && n < POOLS; i++) {
      const q = L[i]; const dx = q[0] - p.x, dz = q[2] - p.z; if (dx * dx + dz * dz > 380 * 380) continue;
      const s = q[3] || 9, o = n * 16; m.fill(0, o, o + 16);
      m[o] = s; m[o + 5] = 1; m[o + 10] = s; m[o + 12] = q[0]; m[o + 13] = q[4] != null ? q[4] + 0.14 : q[1] - 5.6; m[o + 14] = q[2]; m[o + 15] = 1; n++;
    }
    pools.count = n; pools.instanceMatrix.needsUpdate = true;
  }
  // ---- rain ------------------------------------------------------------------------------------------------------------------------------------------
  const RAIN = 6000;
  const rg = new THREE.InstancedBufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0]), 3));
  rg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  rg.setIndex([0, 1, 2, 0, 2, 3]);
  { const off = new Float32Array(RAIN * 3); let s = 12345; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; for (let i = 0; i < RAIN * 3; i++) off[i] = r(); rg.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); }
  rg.instanceCount = 0;
  const rainMat = new THREE.ShaderMaterial({ vertexShader: RAIN_VS, fragmentShader: RAIN_FS, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uSpeed: { value: 9 }, uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(36, 22, 36) }, uWind: { value: new THREE.Vector3(0.3, 0, 0.1) }, uAlpha: { value: 0.35 }, uCol: { value: new THREE.Color(0.7, 0.74, 0.8) } } });
  rainMat.name = 'mat.rain';
  const rain = new THREE.Mesh(rg, rainMat); rain.frustumCulled = false; rain.renderOrder = 5; rain.name = 'fx.rain'; group.add(rain);
  // ---- puffs (smoke, flames, fog cards) -------------------------------------------------------------------------------------------------------------
  const PUFFS = 1200;
  const pg = new THREE.InstancedBufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  pg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  pg.setIndex([0, 1, 2, 0, 2, 3]);
  const emA = new THREE.InstancedBufferAttribute(new Float32Array(PUFFS * 4), 4); emA.setUsage(THREE.DynamicDrawUsage);
  const seedA = new THREE.InstancedBufferAttribute(new Float32Array(PUFFS), 1);
  for (let i = 0; i < PUFFS; i++) seedA.array[i] = ((i * 0.6180339887) % 1);
  pg.setAttribute('aEm', emA); pg.setAttribute('aSeed', seedA); pg.instanceCount = 0;
  const sc = particleCell('smoke');
  const puffMat = new THREE.ShaderMaterial({ vertexShader: PUFF_VS, fragmentShader: PUFF_FS, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uCell: { value: new THREE.Vector4(sc[0], sc[1], sc[2], sc[3]) }, uWind: { value: new THREE.Vector3(0.6, 0, 0.2) }, tMap: { value: MatLib.get('mat.particle').map }, uSmoke: { value: new THREE.Color(0.55, 0.55, 0.56) }, uFog: { value: new THREE.Color(0.8, 0.82, 0.84) } } });
  puffMat.name = 'mat.puff';
  const puffs = new THREE.Mesh(pg, puffMat); puffs.frustumCulled = false; puffs.renderOrder = 4; puffs.name = 'fx.puffs'; group.add(puffs);
  st.fogCards = 'on'; st.puffN = 0; st.fogCardN = 0;
  function rebuildPuffs(L) {
    const F = fires(), p = camera.position, a = emA.array; let n = 0;
    const cap = Math.min(PUFFS, Math.max(0, st.maxParticles));
    for (let i = 0; i < F.length && n < cap - 30; i++) {
      const f = F[i]; if ((f[0] - p.x) ** 2 + (f[2] - p.z) ** 2 > 160 * 160) continue;
      for (let k = 0; k < 10 && n < cap; k++, n++) { a[n * 4] = f[0]; a[n * 4 + 1] = f[1] - 0.35; a[n * 4 + 2] = f[2]; a[n * 4 + 3] = 1; }
      for (let k = 0; k < 14 && n < cap; k++, n++) { a[n * 4] = f[0]; a[n * 4 + 1] = f[1] + 0.4; a[n * 4 + 2] = f[2]; a[n * 4 + 3] = 0; }
    }
    st.puffN = n;
    // fog cards: forest valleys and the lake at dawn, or mist weather (<= 40, 'low' = 16)
    const want = st.fogCards === 'off' ? 0 : (L.wType === 'mist' || L.region === 'forest' || (L.region === 'lake' && L.sunElev < 0.35 && L.day > 0.2)) ? (st.fogCards === 'low' ? 16 : 40) : 0;
    let fc = 0;
    if (want) {
      const gx = Math.round(p.x / 30) * 30, gz = Math.round(p.z / 30) * 30;
      for (let j = -3; j <= 3 && fc < want; j++) for (let i = -3; i <= 3 && fc < want; i++) {
        const x = gx + i * 30, z = gz + j * 30, h = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
        if (h > 0.85 || n >= cap) continue;
        const px = x + (h - 0.5) * 20, pz = z + ((h * 7) % 1 - 0.5) * 20;
        a[n * 4] = px; a[n * 4 + 1] = World.heightAt(px, pz) + 1.2 + h * 2; a[n * 4 + 2] = pz; a[n * 4 + 3] = 2; n++; fc++;
      }
    }
    st.fogCardN = fc;
    pg.instanceCount = n; emA.needsUpdate = true;
  }
  const api = {
    group, get activeLights() { let n = 0; for (const l of st.lights) if (l.intensity > 0.01) n++; return n; }, get particlesAlive() { return st.rainN + st.puffN; }, get fogCards() { return st.fogCardN; },
    configure({ particles, lightPool, fogCards }) { st.maxParticles = particles; if (fogCards) st.fogCards = fogCards; if (lightPool !== st.poolN || !st.lights.length) setPool(lightPool); },
    update(dt, cam, L, game) {
      const t = (st.fireT += dt);
      if (t - st.lastAssign > 0.25) { st.lastAssign = t; assign(L.night); rebuildPuffs(L); }
      puffMat.uniforms.uTime.value = t; puffMat.uniforms.uFog.value.copy(scene.fog.color).multiplyScalar(1.05); puffMat.uniforms.uSmoke.value.setRGB(0.5, 0.5, 0.52).multiplyScalar(0.25 + 0.75 * L.day);
      for (const l of st.lights) {
        const target = l.userData.target * (l.userData.kind ? 6 : 14);
        l.intensity += (target - l.intensity) * Math.min(1, dt * 3);
        if (l.userData.kind) l.intensity *= 0.85 + 0.15 * Math.sin(t * 23 + l.position.x) * Math.sin(t * 7.3);
      }
      if (st.lastPools.distanceToSquared(cam.position) > 400 || (L.night > 0.05) !== (pools.count > 0)) { st.lastPools.copy(cam.position); rebuildPools(L.night); }
      pools.material.opacity = Math.min(1, L.night * 1.3);
      // rain: intensity from wetness target; count capped by the particle budget
      const wet = L.weather.wet, want = L.wType === 'rain' || L.wType === 'storm' ? Math.min(RAIN, st.maxParticles, L.wType === 'storm' ? 6000 : 3500) : 0;
      st.rainN = Math.round(want * Math.min(1, wet));
      rg.instanceCount = st.rainN; rain.visible = st.rainN > 0;
      rainMat.uniforms.uTime.value = t; rainMat.uniforms.uCam.value.copy(cam.position);
      rainMat.uniforms.uCol.value.setRGB(0.55, 0.6, 0.66).multiplyScalar(0.3 + 0.7 * L.day);
      if (L.wType === 'storm' && Math.sin(t * 0.37) > 0.995 && L.lightning <= 0) L.lightning = 1;
      void game;
    },
  };
  return api;
}
