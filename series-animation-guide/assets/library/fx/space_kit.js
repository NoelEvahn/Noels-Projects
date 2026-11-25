// SPACE pack kit: deterministic noise, soft sprite points (twinkle / orbit / flow variants, closed-form in time), atmosphere shells,
// vertex-coloured spheres, a merge builder for chunky detailed craft, lumpy rocks. Geometry, vertex colours and light only (no textures).
// Every animated thing is a pure function of the time uniform / update(t): nothing accumulates between frames.
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../util.js';

export const TAU = Math.PI * 2;
export const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
export const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ---------- noise ----------
function hash(ix, iy, iz, s) {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x165667b1) ^ Math.imul(iz | 0, 0x9e3779b1) ^ Math.imul((s | 0) + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
export function noise3(x, y, z, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash(ix, iy, iz, s), hash(ix + 1, iy, iz, s), u), l(hash(ix, iy + 1, iz, s), hash(ix + 1, iy + 1, iz, s), u), v),
    l(l(hash(ix, iy, iz + 1, s), hash(ix + 1, iy, iz + 1, s), u), l(hash(ix, iy + 1, iz + 1, s), hash(ix + 1, iy + 1, iz + 1, s), u), v), w);
}
export function fbm3(x, y, z, oct = 4, s = 0) {
  let a = 0.5, f = 1, sum = 0, tot = 0;
  for (let i = 0; i < oct; i++) { sum += a * noise3(x * f, y * f, z * f, s + i * 7); tot += a; f *= 2.03; a *= 0.5; }
  return sum / tot;
}
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- sprite points ----------
const VERT = (unis, attrs, pos) => `
uniform float uTime; uniform float uH; uniform float uMax; uniform float uTw; uniform float uAtten; uniform float uSpd; ${unis}
attribute vec3 aCol; attribute float aSize; attribute float aPh; ${attrs}
varying vec3 vC; varying float vF;
void main(){
  vec3 P = position; vec3 col = aCol; float fade = 1.0; float sz = aSize;
  ${pos}
  vec4 mv = modelViewMatrix * vec4(P, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 1.0 - uTw * (0.5 + 0.5 * sin(uTime * (1.2 + fract(aPh * 7.31) * 3.8) + aPh * 40.0));
  float px = uAtten > 0.5 ? sz * projectionMatrix[1][1] * uH * 0.5 / max(0.05, -mv.z) : sz * uH / 1080.0;
  gl_PointSize = clamp(px, 1.0, uMax);
  vC = col * tw; vF = fade * min(1.0, px);
}`;
const FRAG = `
uniform float uOp; uniform float uSoft;
varying vec3 vC; varying float vF;
void main(){
  vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard;
  float a = (exp(-r * uSoft) - exp(-uSoft)) / (1.0 - exp(-uSoft));
  #ifdef SPIKES
  float s = exp(-abs(d.x) * 38.0) * exp(-abs(d.y) * 3.2) + exp(-abs(d.y) * 38.0) * exp(-abs(d.x) * 3.2);
  a = max(a, s * (1.0 - r) * 0.9);
  #endif
  #ifdef NORMALBLEND
  gl_FragColor = vec4(vC, a * vF * uOp);
  #else
  gl_FragColor = vec4(vC * uOp, a * vF);
  #endif
}`;
const _v2 = new THREE.Vector2();
export function spriteMat(o = {}) {
  const { atten = false, additive = true, soft = 3, op = 1, tw = 0, max = 256, uniforms = {}, attrs = '', unis = '', pos = '', defines = {}, depthTest = true } = o;
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, defines: additive ? defines : { ...defines, NORMALBLEND: '' },
    uniforms: { uTime: { value: 0 }, uH: { value: 1080 }, uMax: { value: max }, uTw: { value: tw }, uAtten: { value: atten ? 1 : 0 }, uSoft: { value: soft }, uOp: { value: op }, uSpd: { value: 1 }, ...uniforms },
    vertexShader: VERT(unis, attrs, pos), fragmentShader: FRAG,
  });
}
// Points from flat arrays: P (xyz), C (rgb, display values), S (size: px at 1080 high, or world units when atten). extra: {aOrb:[arr,4]}
export function sprites(P, C, S, o = {}) {
  const n = S.length, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(C, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(S, 1));
  let ph = o.ph; if (!ph) { ph = new Float32Array(n); const r = rng(o.seed ?? 5); for (let i = 0; i < n; i++) ph[i] = r(); }
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  let attrs = o.attrs ?? '';
  if (o.orbit) { g.setAttribute('aOrb', new THREE.BufferAttribute(o.orbit, 4)); attrs += 'attribute vec4 aOrb;'; }
  if (o.flow) { g.setAttribute('aFlow', new THREE.BufferAttribute(o.flow, 4)); attrs += 'attribute vec4 aFlow;'; }
  for (const k in (o.extra ?? {})) { g.setAttribute(k, new THREE.BufferAttribute(o.extra[k].arr, o.extra[k].n)); }
  const mat = o.material ?? spriteMat({ ...o, attrs, pos: o.orbit ? 'float ang = aOrb.x + uTime * aOrb.y * uSpd; P = vec3(cos(ang) * aOrb.z, aOrb.w, sin(ang) * aOrb.z);' + (o.pos ?? '') : (o.pos ?? '') });
  const p = new THREE.Points(g, mat); p.frustumCulled = false;
  p.onBeforeRender = (r) => { r.getDrawingBufferSize(_v2); mat.uniforms.uH.value = _v2.y; };
  p.setTime = (t) => { mat.uniforms.uTime.value = t; };
  p.userData.mat = mat; p.userData.update = p.setTime;
  return p;
}
// single big soft glow (sun halo, star glare, engine glow). size in world units (atten) or px.
export function glowDot(color = 0xffcc88, size = 1, o = {}) {
  const c = rgb(color), s = o.k ?? 1;
  return sprites(new Float32Array([0, 0, 0]), new Float32Array([c[0] * s, c[1] * s, c[2] * s]), new Float32Array([size]), { atten: o.atten ?? true, soft: o.soft ?? 2.2, max: o.max ?? 512, ...o });
}
// pure helper: build arrays from a generator callback(i) -> {p:[x,y,z], c:[r,g,b], s}
export function spriteCloud(n, gen, o = {}) {
  const P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n);
  for (let i = 0; i < n; i++) { const q = gen(i); P[i * 3] = q.p[0]; P[i * 3 + 1] = q.p[1]; P[i * 3 + 2] = q.p[2]; C[i * 3] = q.c[0]; C[i * 3 + 1] = q.c[1]; C[i * 3 + 2] = q.c[2]; S[i] = q.s; }
  return sprites(P, C, S, o);
}
// Flowing particles (rocket exhaust, comet tails, smoke, beams): particle age = fract(a0 + t*speed), position along +dir.
// o: n, dir, length, spread, speed, size [s0,s1], colors [c0,c1,c2] hex, curve [x,y,z], pow, seed, soft, op
export function flowSprites(o = {}) {
  const n = o.n ?? 300, r = rng(o.seed ?? 3), dir = new THREE.Vector3(...(o.dir ?? [0, -1, 0])).normalize();
  const up = Math.abs(dir.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0), p1 = V3().crossVectors(dir, up).normalize(), p2 = V3().crossVectors(dir, p1).normalize();
  const P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n), F = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r());
    F[i * 4] = r(); F[i * 4 + 1] = (o.speed ?? 0.8) * r.range(0.8, 1.25); F[i * 4 + 2] = Math.cos(a) * d; F[i * 4 + 3] = Math.sin(a) * d;
    C[i * 3] = C[i * 3 + 1] = C[i * 3 + 2] = 1; S[i] = r.range(0.6, 1.3);
  }
  const cs = (o.colors ?? [0xffffff, 0xffc060, 0xff5a20]).map((h) => rgb(h));
  const U = (v) => ({ value: v });
  const mat = spriteMat({
    atten: true, soft: o.soft ?? 2.0, op: o.op ?? 1, max: 300, additive: o.additive ?? true,
    uniforms: { uDir: U(dir), uP1: U(p1), uP2: U(p2), uLen: U(o.length ?? 5), uSpread: U(o.spread ?? 0.5), uS: U(new THREE.Vector2(...(o.size ?? [0.3, 0.9]))), uPow: U(o.pow ?? 1.2), uLevel: U(1), uSp0: U(o.spread0 ?? 0.15),
      uCurve: U(V3(...(o.curve ?? [0, 0, 0]))), uC0: U(new THREE.Vector3(...cs[0])), uC1: U(new THREE.Vector3(...cs[1])), uC2: U(new THREE.Vector3(...cs[2])) },
    unis: 'uniform vec3 uDir; uniform vec3 uP1; uniform vec3 uP2; uniform float uLen; uniform float uSpread; uniform vec2 uS; uniform float uPow; uniform float uLevel; uniform float uSp0; uniform vec3 uCurve; uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2;',
    attrs: 'attribute vec4 aFlow;',
    pos: `float age = fract(aFlow.x + uTime * aFlow.y);
      P = uDir * (age * uLen) + (uP1 * aFlow.z + uP2 * aFlow.w) * uSpread * (uSp0 + age) + uCurve * age * age;
      fade = pow(1.0 - age, uPow) * smoothstep(0.0, 0.05, age) * uLevel;
      col = age < 0.35 ? mix(uC0, uC1, age / 0.35) : mix(uC1, uC2, (age - 0.35) / 0.65);
      sz = mix(uS.x, uS.y, age) * aSize;`,
  });
  const p = sprites(P, C, S, { flow: F, material: mat });
  p.setLevel = (k) => { mat.uniforms.uLevel.value = k; p.visible = k > 0.002; };
  p.userData.dir = dir;
  return p;
}
// keep an object facing the camera (billboard) whatever the parent does: runs just before it is drawn
export function faceCam(obj) {
  const prev = obj.onBeforeRender, q = new THREE.Quaternion();
  obj.onBeforeRender = (r, s, cam, ...rest) => {
    prev && prev(r, s, cam, ...rest);
    if (obj.parent) { obj.parent.getWorldQuaternion(q).invert().multiply(cam.quaternion); obj.quaternion.copy(q); obj.updateMatrix(); obj.matrixWorld.multiplyMatrices(obj.parent.matrixWorld, obj.matrix); }
  };
  return obj;
}

// ---------- atmosphere: rim shell (front) + soft outer glow (back faces). sun = world direction (lit side brighter) ----------
export function atmosphere(R, color = 0x6fb8ff, { thick = 0.1, power = 2.4, k = 1.0, rim = 1.0, sun = [0.45, 0.8, 0.6] } = {}) {
  const g = new THREE.Group(), c = new THREE.Color(color), sd = new THREE.Vector3(...sun).normalize();
  const vs = 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vW = normalize(mat3(modelMatrix) * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
  const mk = (rad, side, fs) => new THREE.Mesh(new THREE.SphereGeometry(rad, 64, 40), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side, uniforms: { c: { value: c }, k: { value: k }, sun: { value: sd }, p: { value: power } }, vertexShader: vs, fragmentShader: fs }));
  const day = 'float d = smoothstep(-0.45, 0.55, dot(normalize(vW), sun)); d = 0.18 + 0.82 * d;';
  const outer = mk(R * (1 + thick), THREE.BackSide, `uniform vec3 c; uniform float k; uniform vec3 sun; uniform float p; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f = pow(abs(dot(vN, vV)), p); ${day} gl_FragColor = vec4(c * f * k * 1.3 * d, 1.0); }`);
  const inner = mk(R * (1 + thick * 0.18), THREE.FrontSide, `uniform vec3 c; uniform float k; uniform vec3 sun; uniform float p; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f = pow(1.0 - max(0.0, dot(vN, vV)), 3.2); ${day} gl_FragColor = vec4(c * f * k * ${(0.9 * rim).toFixed(2)} * d, 1.0); }`);
  g.add(outer, inner); g.setSun = (v) => { sd.set(...v).normalize(); }; g.userData.sun = sd;
  return g;
}

// ---------- vertex-coloured, displaced spheres ----------
// fn(dir:Vector3, col:[r,g,b] (mutable)) -> radial height as a fraction of R. Returns an indexed, smooth-normal geometry.
export function bodyGeo(R, detail, fn) {
  let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4);
  const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), d = new THREE.Vector3(), c = [0.5, 0.5, 0.5];
  for (let i = 0; i < n; i++) {
    d.fromBufferAttribute(p, i).normalize(); c[0] = c[1] = c[2] = 0.5;
    const h = fn(d, c, i) || 0; d.multiplyScalar(R * (1 + h)); p.setXYZ(i, d.x, d.y, d.z);
    const lin = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); col[i * 3] = lin.r; col[i * 3 + 1] = lin.g; col[i * 3 + 2] = lin.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
export const lonLat = (d) => [Math.atan2(d.x, d.z) * 180 / Math.PI, Math.asin(Math.max(-1, Math.min(1, d.y))) * 180 / Math.PI];
// craters: list of {c:Vector3 (unit), a: angular radius (rad), depth}; returns radial height fraction (bowl + raised rim)
export function craterField(seed, n, { amin = 0.03, amax = 0.28, depth = 0.55, pow = 2.2, avoid = null } = {}) {
  const r = rng(seed), list = [];
  for (let i = 0; i < n; i++) {
    const z = r.range(-1, 1), a = r() * TAU, s = Math.sqrt(1 - z * z), c = V3(s * Math.cos(a), z, s * Math.sin(a)), rad = amin + (amax - amin) * Math.pow(r(), pow);
    list.push({ c, a: rad, d: rad * depth * r.range(0.7, 1.1) * 0.45, cd: Math.cos(rad * 1.8) });
  }
  return (dir) => {
    let h = 0;
    for (const k of list) {
      const cs = dir.dot(k.c); if (cs < k.cd) continue; const ang = Math.acos(Math.min(1, cs)), u = ang / k.a;
      const wall = 1 - sstep(0.5, 1.0, u); h -= k.d * wall; // flat floor, steep wall
      h += k.d * 0.3 * Math.exp(-Math.pow((u - 1.06) / 0.13, 2)) + k.d * 0.06 * (1 - sstep(1.0, 1.7, u)) * (u > 1 ? 1 : 0); // raised rim + ejecta
    }
    return h;
  };
}

export function vcMat(o = {}) {
  const key = JSON.stringify(o); if (_vm.has(key)) return _vm.get(key);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.6, metalness: o.metal ?? 0, flatShading: !!o.flat, side: o.side ?? THREE.FrontSide, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: o.opacity !== undefined && o.opacity < 1, opacity: o.opacity ?? 1 });
  if (o.opacity !== undefined && o.opacity < 1) m.depthWrite = false;
  _vm.set(key, m); return m;
}
const _vm = new Map();

// ---------- merge builder: many coloured primitives -> one mesh (static detail without draw calls) ----------
export class MB {
  constructor() { this.parts = []; }
  g(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = 1) {
    let G = geo.index ? geo.toNonIndexed() : geo.clone(); for (const k of Object.keys(G.attributes)) if (k !== 'position' && k !== 'normal') G.deleteAttribute(k);
    const m = new THREE.Matrix4().compose(V3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), Array.isArray(scl) ? V3(...scl) : V3(scl, scl, scl));
    G.applyMatrix4(m);
    const c = new THREE.Color(color), n = G.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    G.setAttribute('color', new THREE.BufferAttribute(arr, 3)); this.parts.push(G); return this;
  }
  box(w, h, d, c, p, r, s) { return this.g(new THREE.BoxGeometry(w, h, d), c, p, r, s); }
  cyl(rt, rb, h, seg, c, p, r, s, open = false) { return this.g(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), c, p, r, s); }
  sph(r, c, p, rot, s, w = 16, h = 12) { return this.g(new THREE.SphereGeometry(r, w, h), c, p, rot, s); }
  cone(r, h, seg, c, p, rot, s) { return this.g(new THREE.ConeGeometry(r, h, seg), c, p, rot, s); }
  tor(R, r, c, p, rot, s, rs = 8, ts = 24) { return this.g(new THREE.TorusGeometry(R, r, rs, ts), c, p, rot, s); }
  // beam between two points (thin box), thickness t
  bar(a, b, t, c) {
    const A = V3(...a), B = V3(...b), d = B.clone().sub(A), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q); const mid = A.clone().add(B).multiplyScalar(0.5);
    return this.g(new THREE.BoxGeometry(t, L, t), c, [mid.x, mid.y, mid.z], [e.x, e.y, e.z]);
  }
  mesh(material = vcMat(), shadow = true) { const m = new THREE.Mesh(mergeGeometries(this.parts, false), material); m.castShadow = shadow; m.receiveShadow = shadow; return m; }
}
export function lathe(pts, seg = 32) { return new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); }

// ---------- lumpy rock (asteroid, boulder): displaced icosphere, flat shaded ----------
export function rockGeo(seed = 1, detail = 2, { stretch = [1, 0.8, 0.9], lump = 0.32, craters = 4 } = {}) {
  const r = rng(seed), ox = r() * 50, oy = r() * 50, oz = r() * 50, cf = craterField(seed + 11, craters, { amin: 0.25, amax: 0.6, depth: 0.5 });
  const g = bodyGeo(1, detail, (d, c) => {
    const n = fbm3(d.x * 1.6 + ox, d.y * 1.6 + oy, d.z * 1.6 + oz, 3, seed), cr = cf(d);
    const t = 0.6 + n * 0.5 + cr * 1.6; c[0] = 0.62 * t + 0.14; c[1] = 0.56 * t + 0.12; c[2] = 0.5 * t + 0.1;
    return (n - 0.5) * lump * 2 + cr * 0.6;
  });
  g.scale(stretch[0], stretch[1], stretch[2]); g.computeVertexNormals(); return g;
}
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
