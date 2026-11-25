// Volumetric-looking clouds built from geometry: clusters of shaded puffs (lit tops, shadowed flat bottoms, silver lining) plus a soft
// translucent halo shell around every puff so edges feather out. No textures: one small shader shades instanced spheres.
// All units metres. Drift/billow = pure functions of t (userData.update(t)).
import * as THREE from 'three';
import { rng } from '../util.js';
import { uni, TAU, fbm, noise2, sstep, mix } from './nature_common.js';

const SPHERE = new THREE.SphereGeometry(1, 14, 10);
const SPHERE_LO = new THREE.SphereGeometry(1, 9, 6);

const VERT = `
uniform float uTime; uniform float uBill; uniform float uScale;
varying vec3 vN; varying vec3 vWP; varying vec3 vI;
#include <fog_pars_vertex>
void main(){
  mat4 im = mat4(1.0); vec3 ic = vec3(1.0, -1.0e5, 1.0);
  #ifdef USE_INSTANCING
    im = instanceMatrix;
  #endif
  #ifdef USE_INSTANCING_COLOR
    ic = instanceColor;
  #endif
  float ph = fract(sin(dot(im[3].xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453) * 6.2832;
  float bill = 1.0 + uBill * sin(uTime * 0.55 + ph) + uBill * 0.5 * sin(uTime * 1.3 + ph * 2.0);
  vec4 lp = im * vec4(position * bill * uScale, 1.0);
  float under = max(0.0, ic.g - lp.y);
  lp.y = max(lp.y, ic.g);
  vec4 wp = modelMatrix * lp;
  vWP = wp.xyz; vI = ic;
  vec3 n = normalize(mat3(modelMatrix) * normal);
  n = normalize(mix(n, vec3(0.0, -1.0, 0.0), step(0.0005, under) * 0.9));
  vN = n;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FRAG = `
uniform vec3 uSun; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uRim; uniform float uAlpha; uniform float uAoMin; uniform float uFlash; uniform vec3 uFlashCol;
varying vec3 vN; varying vec3 vWP; varying vec3 vI;
#include <fog_pars_fragment>
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vWP);
  float ndv = abs(dot(n, v));
  float lit = smoothstep(0.0, 0.8, dot(n, uSun));
  vec3 col = mix(uShade, uLit, lit);
  col *= mix(uAoMin, 1.0, clamp(vI.x, 0.0, 1.0));
  float toSun = clamp(-dot(v, uSun), 0.0, 1.0);
  col += uRim * pow(1.0 - ndv, 3.0) * (0.25 + 0.9 * toSun) * (0.4 + 0.6 * vI.x);
  col = mix(col, uFlashCol, uFlash * (0.45 + 0.4 * (1.0 - vI.x)));
  float a = uAlpha * vI.z;
  #ifdef HALO
    a *= pow(ndv, 2.6) * 0.7;
  #endif
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

// theme: 'day' | 'storm' | 'sunset' | 'dusk' | 'smoke' | 'ash' | 'steam'
const THEMES = {
  day: { lit: 0xfffaf0, shade: 0x4a62a2, rim: 0xfff0d0, aoMin: 0.38, litK: 1.12 },
  storm: { lit: 0x9aa0b2, shade: 0x3a3f56, rim: 0xcfd6ee, aoMin: 0.5 },
  sunset: { lit: 0xffe0c2, shade: 0x8a5a8c, rim: 0xffa860, aoMin: 0.6 },
  dusk: { lit: 0xd9a6c8, shade: 0x4a3f7a, rim: 0xff8a70, aoMin: 0.55 },
  smoke: { lit: 0x8a8486, shade: 0x2c2a30, rim: 0xffb27a, aoMin: 0.55 },
  ash: { lit: 0x6a6366, shade: 0x1e1c22, rim: 0xff7a3a, aoMin: 0.6 },
  steam: { lit: 0xffffff, shade: 0xc7d3e6, rim: 0xffffff, aoMin: 0.8 },
  mist: { lit: 0xf4f8ff, shade: 0xb7c8e0, rim: 0xffffff, aoMin: 0.85 },
};
export const SUN_DIR = new THREE.Vector3(0.45, 0.8, 0.6).normalize();

// one shared uniform block per cloud object so core + halo + every puff react to the same time / sun / flash
export function cloudMaterials(U, { theme = 'day', sun = SUN_DIR, bill = 0.035, alpha = 1, halo = true, haloScale = 1.3 } = {}) {
  const T = THEMES[theme] ?? THEMES.day;
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: U, uBill: { value: bill }, uScale: { value: 1 }, uSun: { value: sun.clone().normalize() },
    uLit: { value: new THREE.Color(T.lit).multiplyScalar(T.litK ?? 1.15) }, uShade: { value: new THREE.Color(T.shade) }, uRim: { value: new THREE.Color(T.rim) },
    uAlpha: { value: alpha }, uAoMin: { value: T.aoMin }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(0xe4ecff) },
  }]);
  const mk = (isHalo) => {
    const u = { ...uniforms, uScale: { value: isHalo ? haloScale : 1 } };
    return new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, fog: true, defines: isHalo ? { HALO: 1 } : {}, transparent: isHalo || alpha < 1, depthWrite: !isHalo && alpha >= 1, side: THREE.FrontSide });
  };
  return { core: mk(false), halo: halo ? mk(true) : null, uniforms };
}

// puff list for one cumulus: [{x,y,z,r,sy,ao}] with the flat base at y=0 (clamp plane stored per instance).
// Built as jittered columns over a dome envelope so the body is solid and the skyline is bumpy (cauliflower), never loose balls.
export function cumulusPuffs(r, { width = 100, height = 0.5, density = 1, anvil = 0 } = {}) {
  const W = width, D = width * 0.6, H = width * height, out = [];
  const s = W * 0.085 / Math.sqrt(density);
  const dome = (x, z) => Math.pow(Math.max(0, 1 - (2 * x / W) ** 2 - (2 * z / D) ** 2), 0.5);
  const hump = (x, z) => 0.62 + 0.55 * noise2(x / W * 3.1 + 7, z / W * 3.1, 11);   // a couple of taller towers inside the dome
  for (let gx = -W / 2; gx <= W / 2; gx += s) for (let gz = -D / 2; gz <= D / 2; gz += s) {
    const x = gx + r.range(-0.4, 0.4) * s, z = gz + r.range(-0.4, 0.4) * s, e = dome(x, z); if (e < 0.12) continue;
    const top = Math.min(H * 1.05, H * e * hump(x, z) * r.range(0.85, 1.1)), k = top / H;
    const rr = s * r.range(0.95, 1.5) * (0.55 + 0.6 * Math.min(1, e * 1.3));
    out.push({ x, y: Math.max(rr * 0.35, top - rr * 0.62), z, r: rr, sy: 0.92, ao: 0.52 + 0.48 * Math.pow(Math.min(1, k), 0.85) });      // crown
    if (top > rr * 1.6) out.push({ x: x + r.range(-0.3, 0.3) * s, y: top * 0.45, z: z + r.range(-0.3, 0.3) * s, r: rr * 1.15, sy: 0.9, ao: 0.4 + 0.3 * k });   // belly
    if (e < 0.75 || r() < 0.5) out.push({ x, y: rr * 0.2, z, r: rr * 1.1, sy: 0.7, ao: 0.28 + 0.22 * r() });                                       // flat-bottomed skirt
  }
  if (anvil) for (let i = 0; i < 34; i++) { const a = r() * TAU, d = Math.sqrt(r()) * W * 0.5 * anvil; out.push({ x: Math.cos(a) * d, y: H * (0.78 + 0.12 * (1 - d / (W * 0.5 * anvil))) + r.range(-0.02, 0.02) * H, z: Math.sin(a) * d * 0.75, r: W * r.range(0.07, 0.12), sy: 0.55, ao: 0.8 + 0.2 * r() }); }
  return out;
}

// fill instanced meshes (core + halo) from a puff list. baseY: flat-bottom plane (cluster-local) or null for full spheres
export function puffMeshes(puffs, mats, { baseY = 0, lo = false, alphaFor, ox = 0, oy = 0, oz = 0, halo: wantHalo = true } = {}) {
  const g = new THREE.Group(), geo = lo ? SPHERE_LO : SPHERE, o = new THREE.Object3D();
  const mk = (m, order) => {
    const im = new THREE.InstancedMesh(geo, m, puffs.length); im.frustumCulled = false; im.renderOrder = order; im.castShadow = false; im.receiveShadow = false;
    const col = new Float32Array(puffs.length * 3);
    puffs.forEach((p, i) => { o.position.set(p.x + ox, p.y + oy, p.z + oz); o.rotation.set(0, 0, 0); o.scale.set(p.r, p.r * (p.sy ?? 1), p.r); o.updateMatrix(); im.setMatrixAt(i, o.matrix); col[i * 3] = p.ao ?? 1; col[i * 3 + 1] = baseY === null ? -1e5 : (p.base ?? baseY) + oy + ((i * 37) % 13) * 0.004 * p.r; col[i * 3 + 2] = alphaFor ? alphaFor(p, i) : 1; });
    im.instanceColor = new THREE.InstancedBufferAttribute(col, 3); im.instanceMatrix.needsUpdate = true; return im;
  };
  const core = mk(mats.core, 1); g.add(core);
  let halo = null; if (mats.halo && wantHalo) { halo = mk(mats.halo, 2); g.add(halo); }
  g.userData.core = core; g.userData.halo = halo; return g;
}

// ---------- cumulus: one cloud ----------
// width = cloud width in m (any scale works: 4 m prop cloud ... 3 km real cumulus). Drifts + billows in update(t).
export function cumulus({ width = 1200, height = 0.5, seed = 1, density = 1, theme = 'day', drift = 4, lod = 'high', altitude = 0, anvil = 0, sun = SUN_DIR } = {}) {
  const r = rng(seed), U = uni(0), g = new THREE.Group(), mats = cloudMaterials(U, { theme, sun, halo: lod !== 'low' });
  const puffs = cumulusPuffs(r, { width, height, density: lod === 'low' ? 0.5 : density, anvil });
  g.add(puffMeshes(puffs, mats, { baseY: 0, lo: lod === 'low' }));
  g.position.y = altitude; const x0 = 0;
  g.userData = { realWidthM: width, realHeightM: width * height, uniforms: mats.uniforms, mats, puffs, update: (t) => { U.value = t; g.position.x = x0 + drift * t; } };
  return g;
}

// ---------- cloud field: many cumulus at several altitudes, each drifting (wraps with a size fade at the edges) ----------
export function cloudField({ count = 14, area = [-3000, -3000, 3000, 3000], altitude = [1500, 2200], width = [700, 1800], seed = 3, theme = 'day', drift = 6, lod = 'high', sun = SUN_DIR, speedVar = 0.4 } = {}) {
  const r = rng(seed), U = uni(0), g = new THREE.Group(), mats = cloudMaterials(U, { theme, sun, halo: lod !== 'low' }), items = [];
  const [x0, z0, x1, z1] = area, W = x1 - x0;
  for (let i = 0; i < count; i++) {
    const w = r.range(width[0], width[1]), cl = new THREE.Group();
    const puffs = cumulusPuffs(r, { width: w, height: r.range(0.36, 0.6), density: lod === 'low' ? 0.5 : r.range(0.7, 1.1) });
    cl.add(puffMeshes(puffs, mats, { baseY: 0, lo: lod === 'low' }));
    const px = r.range(x0, x1), pz = r.range(z0, z1), alt = r.range(altitude[0], altitude[1]), sp = drift * (1 + speedVar * r.range(-1, 1));
    cl.position.set(px, alt, pz); cl.rotation.y = r.range(-0.4, 0.4); g.add(cl); items.push({ cl, px, sp, w });
  }
  g.userData = { uniforms: mats.uniforms, update: (t) => { U.value = t; for (const it of items) { let x = it.px + it.sp * t; x = ((x - x0) % W + W) % W + x0; it.cl.position.x = x; const e = Math.min(sstep(x0, x0 + W * 0.08, x), 1 - sstep(x1 - W * 0.08, x1, x)); it.cl.scale.setScalar(Math.max(0.001, e)); } } };
  return g;
}

// ---------- cloud sea seen from above: bumpy deck of puffs with lit tops, dark valleys, a lower deck and cloud shadows ----------
export function cloudSea({ size = 6000, seed = 5, topY = 0, theme = 'day', drift = 3, sun = new THREE.Vector3(0.75, 0.42, 0.5).normalize(), sea = true } = {}) {
  const r = rng(seed), U = uni(0), g = new THREE.Group(), mats = cloudMaterials(U, { theme, sun, bill: 0.03, haloScale: 1.25 });
  const puffs = [], lower = [], bumps = [], hf = (x, z) => fbm(x / size * 2.6, z / size * 2.6, seed, 4);
  const sp = size / 36;
  for (let gx = -size / 2; gx <= size / 2; gx += sp) for (let gz = -size / 2; gz <= size / 2; gz += sp) {
    const x = gx + r.range(-0.45, 0.45) * sp, z = gz + r.range(-0.45, 0.45) * sp, h = hf(x, z);
    if (h < 0.3 && r() < 0.8) continue;     // gaps: dark valleys and glimpses of the lower deck / sea
    puffs.push({ x, y: topY + (h - 0.5) * size * 0.14 + r.range(-0.4, 0.4) * sp, z, r: sp * r.range(0.9, 1.5) * (0.8 + h * 0.5), sy: 0.8, ao: 0.2 + 0.8 * sstep(0.32, 0.7, h) * r.range(0.7, 1) });
  }
  for (let i = 0; i < 90; i++) { const x = (r() * 2 - 1) * size * 0.5, z = (r() * 2 - 1) * size * 0.5; lower.push({ x, y: topY - size * 0.07 + r.range(-0.01, 0.01) * size, z, r: r.range(0.05, 0.1) * size, sy: 0.4, ao: 0.22 }); }
  // cauliflower towers rising from the deck
  const towers = new THREE.Group();
  for (let k = 0; k < 16; k++) {
    const x = (r() * 2 - 1) * size * 0.42, z = (r() * 2 - 1) * size * 0.42, h = hf(x, z), w = size * r.range(0.09, 0.17);
    towers.add(puffMeshes(cumulusPuffs(r, { width: w, height: r.range(0.25, 0.45), density: 0.55 }), mats, { baseY: -w * 0.1, ox: x, oy: topY + (h - 0.5) * size * 0.08 - 10, oz: z }));
  }
  const deck = new THREE.Group(); deck.add(puffMeshes(puffs, mats, { baseY: null, lo: true, halo: false })); deck.add(towers);
  g.add(puffMeshes(lower, mats, { baseY: null, lo: true, halo: false }));
  g.add(deck);
  // soft cloud shadows on the lower deck: dark translucent discs offset away from the sun
  const sm = new THREE.MeshBasicMaterial({ color: 0x1b2a55, transparent: true, opacity: 0.2, depthWrite: false, fog: true });
  const sim = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20), sm, 60), o = new THREE.Object3D();
  for (let i = 0; i < 60; i++) { const x = (r() * 2 - 1) * size * 0.45, z = (r() * 2 - 1) * size * 0.45; o.position.set(x - sun.x * size * 0.08, topY - size * 0.065, z - sun.z * size * 0.08); o.rotation.set(-Math.PI / 2, 0, 0); o.scale.set(size * r.range(0.04, 0.09), size * r.range(0.03, 0.07), 1); o.updateMatrix(); sim.setMatrixAt(i, o.matrix); }
  sim.frustumCulled = false; g.add(sim);
  if (sea) { const s = new THREE.Mesh(new THREE.CircleGeometry(size * 2.4, 40), new THREE.MeshBasicMaterial({ color: 0x2a78b8, fog: true })); s.rotation.x = -Math.PI / 2; s.position.y = topY - size * 0.12; g.add(s); }
  g.userData = { realWidthM: size, uniforms: mats.uniforms, update: (t) => { U.value = t; deck.position.x = Math.sin(t * 0.05) * drift * 20 + t * drift * 0.2; } };
  return g;
}

// ---------- storm cloud: dark anvil cumulonimbus, rain shafts, closed-form lightning flashes ----------
function bolt(r, from, to, segs = 12, jag = 0.09) {
  const pts = [from.clone()]; const d = to.clone().sub(from), len = d.length();
  for (let i = 1; i < segs; i++) { const p = from.clone().addScaledVector(d, i / segs); p.x += r.range(-1, 1) * len * jag; p.z += r.range(-1, 1) * len * jag * 0.7; pts.push(p); }
  pts.push(to.clone()); return pts;
}
export function stormCloud({ width = 2400, seed = 7, period = 5.2, rain = true, lightning = true } = {}) {
  const r = rng(seed), U = uni(0), g = new THREE.Group(), mats = cloudMaterials(U, { theme: 'storm', bill: 0.03 });
  const H = width * 0.55;
  const puffs = cumulusPuffs(r, { width, height: 0.7, density: 1.3, anvil: 1.1 });
  // dark layered base ledge + tower
  for (let i = 0; i < 12; i++) { const a = r() * TAU, d = r.range(0, 0.4) * width; puffs.push({ x: Math.cos(a) * d, y: width * 0.03 + r() * width * 0.02, z: Math.sin(a) * d * 0.7, r: width * r.range(0.1, 0.17), sy: 0.55, ao: 0.1 }); }
  const cl = puffMeshes(puffs, mats, { baseY: 0 }); g.add(cl);
  g.position.y = 0;
  let rainMesh = null, rainUpd = null;
  if (rain) {
    const n = 220, geo = new THREE.BoxGeometry(1, 1, 1), rm = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xb8c8e8, transparent: true, opacity: 0.35, depthWrite: false, fog: true }), n);
    rm.frustumCulled = false; g.add(rm); rainMesh = rm;
    const o = new THREE.Object3D(), rr = rng(seed + 1), ps = [];
    for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(rr()) * width * 0.42; ps.push({ x: Math.cos(a) * d, z: Math.sin(a) * d * 0.7, ph: rr(), len: rr.range(0.1, 0.22) * width * 0.4 }); }
    rainUpd = (t) => { ps.forEach((p, i) => { const k = (t * 0.55 + p.ph) % 1, y = width * 0.04 - k * width * 0.5; o.position.set(p.x + k * width * 0.03, y, p.z); o.rotation.set(0, 0, -0.07); o.scale.set(width * 0.0035, p.len, width * 0.0035); o.updateMatrix(); rm.setMatrixAt(i, o.matrix); }); rm.instanceMatrix.needsUpdate = true; };
  }
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xfff6d0, toneMapped: false, fog: false }), boltG = new THREE.Group(); g.add(boltG);
  const glow = new THREE.PointLight(0xcfe0ff, 0, width * 2, 1.5); glow.position.set(0, width * 0.1, 0); g.add(glow);
  let lastK = -1;
  g.userData = {
    realWidthM: width, realHeightM: H * 1.15, uniforms: mats.uniforms,
    update: (t) => {
      U.value = t; rainUpd?.(t);
      if (!lightning) return;
      const k = Math.floor(t / period), ph = t - k * period;
      // two quick flickers at the start of every period
      const f1 = ph > 0.5 && ph < 0.62 ? 1 : 0, f2 = ph > 0.7 && ph < 0.86 ? 1 - (ph - 0.7) / 0.16 : 0, fl = Math.max(f1, f2 * 0.9);
      mats.uniforms.uFlash.value = fl * 0.3; glow.intensity = fl * 2e6 * 0;
      if (fl > 0) {
        if (k !== lastK) { // rebuild the bolt for this strike (seeded by k, so any frame reproduces it)
          lastK = k; boltG.clear(); const rb = rng(seed * 100 + k * 7 + 3);
          const sx = rb.range(-0.3, 0.3) * width, sz = rb.range(-0.2, 0.2) * width, top = new THREE.Vector3(sx, width * 0.06, sz), bot = new THREE.Vector3(sx + rb.range(-0.08, 0.08) * width, -width * 0.62, sz);
          const main = bolt(rb, top, bot, 14, 0.07), curve = new THREE.CatmullRomCurve3(main);
          boltG.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, width * 0.0055, 5, false), boltMat));
          for (let b = 0; b < 3; b++) { const i = 3 + Math.floor(rb() * 8), a = main[i], e = a.clone().add(new THREE.Vector3(rb.range(-0.18, 0.18) * width, -rb.range(0.1, 0.22) * width, rb.range(-0.1, 0.1) * width)); boltG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bolt(rb, a, e, 6, 0.08)), 20, width * 0.003, 4, false), boltMat)); }
        }
        boltG.visible = f1 > 0 || f2 > 0.35;
      } else boltG.visible = false;
    },
  };
  return g;
}

// ---------- soft ribbon material (alpha + colour from vertex attributes): cirrus, rainbow, light shafts ----------
export function softMaterial(U, { color = 0xffffff, opacity = 1, vc = false, additive = false, shimmer = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: U, uCol: { value: new THREE.Color(color) }, uOp: { value: opacity } }]), fog: true,
    vertexShader: `attribute float aA; attribute vec3 aCol; uniform float uT; varying float vA; varying vec3 vC; varying float vSh;
#include <fog_pars_vertex>
void main(){ vA = aA; vC = aCol; mat4 im = mat4(1.0);
#ifdef USE_INSTANCING
  im = instanceMatrix;
#endif
  vSh = sin(uT * 1.1 + position.x * 0.01 + im[3].x * 0.002);
  vec4 mvPosition = viewMatrix * modelMatrix * im * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform vec3 uCol; uniform float uOp; varying float vA; varying vec3 vC; varying float vSh;
#include <fog_pars_fragment>
void main(){ vec3 c = ${vc ? 'vC' : 'uCol'}; gl_FragColor = vec4(c, vA * uOp * (1.0 + ${shimmer.toFixed(3)} * vSh));
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}
// tapered feathery ribbon along +x (length) with alpha 0 at the edges and ends; hook bends the tail like a mare's-tail streak
export function streakGeo(len = 1, wid = 0.1, hook = 0.3, segs = 20) {
  const pos = [], aA = [], aC = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, x = u * len, z = hook * len * u * u * u, w = wid * (0.35 + Math.sin(Math.min(1, u * 1.15) * Math.PI) ** 0.8 * 0.65) * (1 - 0.5 * u);
    for (const s of [-1, 0, 1]) { pos.push(x, 0, z + s * w); aA.push(s === 0 ? Math.sin(Math.PI * Math.min(1, u * 0.96 + 0.02)) ** 0.7 : 0); aC.push(1, 1, 1); }
    if (i < segs) { const b = i * 3; idx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4, b + 1, b + 4, b + 2, b + 2, b + 4, b + 5); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 1)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(aC, 3)); g.setIndex(idx); return g;
}
// ---------- cirrus: layer of high wispy streaks and mare's tails ----------
export function cirrus({ size = 12000, count = 90, altitude = 8000, seed = 9, drift = 14, theme = 'day' } = {}) {
  const r = rng(seed), U = uni(0), g = new THREE.Group();
  const col = theme === 'sunset' ? 0xffc9a0 : 0xffffff;
  const geos = [streakGeo(1, 0.05, 0.35), streakGeo(1, 0.035, -0.25), streakGeo(1, 0.07, 0.12)];
  geos.forEach((geo, gi) => {
    const m = softMaterial(U, { color: col, opacity: 0.7 }), n = Math.round(count / 3), im = new THREE.InstancedMesh(geo, m, n), o = new THREE.Object3D();
    const dir = 0.35; // streaks roughly aligned (jet-stream direction) with scatter
    for (let i = 0; i < n; i++) { const L = r.range(0.06, 0.2) * size; o.position.set((r() * 2 - 1) * size / 2, r.range(-1, 1) * size * 0.01, (r() * 2 - 1) * size / 2); o.rotation.set(0, dir + r.range(-0.35, 0.35), 0); o.scale.set(L, 1, L); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
    im.frustumCulled = false; im.renderOrder = 3 + gi; g.add(im);
    g.userData['im' + gi] = im;
  });
  g.position.y = altitude;
  g.userData = { ...g.userData, realWidthM: size, update: (t) => { U.value = t; g.position.x = drift * t; } };
  return g;
}

// ---------- contrail puffs: expanding, fading trail behind a moving source. Source path p(t) -> [x,y,z]; returns {group, update(t)} ----------
export function contrail({ source, offsets = [[0, 0, 0]], count = 120, maxAge = 40, grow = 1.6, r0 = 5, seed = 2, spread = 0.5 } = {}) {
  const U = uni(0), mats = cloudMaterials(U, { theme: 'steam', bill: 0.0, alpha: 0.999, halo: true, haloScale: 1.3 });
  const n = count * offsets.length, puffs = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0, r: 1, ao: 1 }));
  const g = new THREE.Group(), pm = puffMeshes(puffs, mats, { baseY: null, lo: true }), o = new THREE.Object3D(), meshes = [pm.userData.core, pm.userData.halo]; g.add(pm);
  const rr = rng(seed), jit = Array.from({ length: count }, () => [rr.range(-1, 1), rr.range(-1, 1)]);
  const update = (t) => {
    U.value = t;
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count, a = u * u * maxAge, da = 2 * u * maxAge / count, p = source(t - a), rad = r0 + a * grow, sz = Math.max(rad, da * 0.85 * (p.speed ?? 1));
      const al = Math.pow(1 - u, 1.2) * 0.95 * Math.min(1, u * 40 + 0.25);
      for (let k = 0; k < offsets.length; k++) {
        const idx = k * count + i, off = offsets[k], sd = a * spread;
        o.position.set(p[0] + off[0] * (1 - u * 0.2) + jit[i][0] * sd * 0.5, p[1] + off[1] - u * 14 + jit[i][1] * sd * 0.3, p[2] + off[2] + 0); o.rotation.set(0, 0, 0); o.scale.set(rad, rad * 0.85, sz); o.updateMatrix();
        for (const m of meshes) { m.setMatrixAt(idx, o.matrix); const a3 = m.instanceColor.array; a3[idx * 3] = 0.95; a3[idx * 3 + 2] = al * (m === meshes[1] ? 0.9 : 0.85); }
      }
    }
    for (const m of meshes) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  };
  update(0); return { group: g, update };
}
export { THEMES as CLOUD_THEMES };
