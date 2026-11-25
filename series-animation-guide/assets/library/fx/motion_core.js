// MOTION pack core: shared building blocks for every motion_* effect.
// Everything is a pure function of the time you pass in (age / t). No Math.random, no clocks, no state carried between frames.
//   one-shot effects: fx.set(age)    age = seconds since the effect started (age < 0 = not started yet, effect is hidden or in its pre-state)
//   looping effects : fx.update(t)   t   = any time, loops seamlessly
// Both names exist on every effect (set === update) so a director can call either. Each effect also records userData.duration (one-shots)
// and userData.sizeM (real size of the effect in metres).
import * as THREE from 'three';
import { rng, clamp, lerp, smooth, easeOutBack, easeOutCubic } from '../util.js';
export { rng, clamp, lerp, smooth, easeOutBack, easeOutCubic };

export const TAU = Math.PI * 2;
export const ph = (age, t0, dur) => clamp((age - t0) / dur);                 // 0..1 progress of a phase starting at t0
export const easeIn = (t) => { t = clamp(t); return t * t; };
export const easeOut = (t) => { t = clamp(t); return 1 - (1 - t) * (1 - t); };
export const easeOutExpo = (t) => { t = clamp(t); return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); };
export const fract = (x) => x - Math.floor(x);
export const hash = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);   // tiny pure hash for per-index jitter
// bump that rises over `a` seconds and falls over `b` seconds
export const pulse = (age, a, b) => (age < 0 ? 0 : age < a ? smooth(age / a) : 1 - smooth((age - a) / b));

// ---------- colours ----------
const _c = new THREE.Color();
export function makeRamp(stops) {                        // stops: [[k, hex | [r,g,b]], ...]; returns fn(k, outColor) (values may exceed 1: HDR glow)
  const S = stops.map(([k, c]) => [k, Array.isArray(c) ? new THREE.Color().setRGB(c[0], c[1], c[2]) : new THREE.Color(c)]);
  return (k, out = _c) => {
    k = clamp(k);
    for (let i = 1; i < S.length; i++) if (k <= S[i][0]) { const a = S[i - 1], b = S[i]; const u = (k - a[0]) / Math.max(1e-6, b[0] - a[0]); return out.copy(a[1]).lerp(b[1], u); }
    return out.copy(S[S.length - 1][1]);
  };
}

// ---------- materials ----------
const _m = new Map();
const cached = (key, fn) => { if (!_m.has(key)) _m.set(key, fn()); return _m.get(key); };
export const lambertWhite = () => cached('lw', () => new THREE.MeshLambertMaterial({ color: 0xffffff }));
export const basicWhite = () => cached('bw', () => new THREE.MeshBasicMaterial({ color: 0xffffff }));
export const glowBasic = (o = {}) => new THREE.MeshBasicMaterial({ color: o.color ?? 0xffffff, transparent: true, opacity: o.opacity ?? 1, blending: THREE.AdditiveBlending, depthWrite: false, side: o.side ?? THREE.FrontSide, toneMapped: o.toneMapped ?? true });
export const decalMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });

// ---------- geometry ----------
export const SPH = () => cached('sph', () => new THREE.SphereGeometry(1, 12, 8));
export const SPH_LO = () => cached('sphlo', () => new THREE.SphereGeometry(1, 8, 6));
export const BOX = () => cached('box', () => new THREE.BoxGeometry(1, 1, 1));
export const ROCK = () => cached('rock', () => { const g = new THREE.IcosahedronGeometry(1, 0); return g; });
export function mergeGeos(list) {                         // [{geo, color?}] -> one non-indexed geometry with vertex colours (no addon dependency)
  const pos = [], nor = [], col = [];
  for (const { geo, color } of list) {
    const g = geo.index ? geo.toNonIndexed() : geo; const p = g.attributes.position, n = g.attributes.normal;
    const c = new THREE.Color(color ?? 0xffffff);
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

// ---------- instanced pool ----------
// pool(geometry, material, n): InstancedMesh with a cheap per-instance API. put(i, x,y,z, s, rx,ry,rz, sy, sz), tint(i, r,g,b | Color), hide(i), flush().
export function pool(geo, material, n, o = {}) {
  const im = new THREE.InstancedMesh(geo, material, n);
  im.frustumCulled = false; im.castShadow = !!o.cast; im.receiveShadow = !!o.receive;
  const d = new THREE.Object3D(), white = new THREE.Color(1, 1, 1);
  d.scale.setScalar(1e-5); d.position.set(0, -999, 0); d.updateMatrix();
  for (let i = 0; i < n; i++) { im.setColorAt(i, white); im.setMatrixAt(i, d.matrix); }
  im.put = (i, x, y, z, s, rx = 0, ry = 0, rz = 0, sy = s, sz = s) => {
    if (!(s > 1e-5) && !(sy > 1e-5)) { im.hide(i); return; }
    d.position.set(x, y, z); d.rotation.set(rx, ry, rz); d.scale.set(s, sy, sz); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
  };
  im.putQ = (i, x, y, z, q, sx, sy = sx, sz = sx) => { d.position.set(x, y, z); d.quaternion.copy(q); d.scale.set(sx, sy, sz); d.updateMatrix(); im.setMatrixAt(i, d.matrix); d.rotation.set(0, 0, 0); };
  im.hide = (i) => { d.position.set(0, -999, 0); d.rotation.set(0, 0, 0); d.scale.setScalar(1e-5); d.updateMatrix(); im.setMatrixAt(i, d.matrix); };
  im.tint = (i, r, g, b) => { if (r.isColor) im.setColorAt(i, r); else { _c.setRGB(r, g, b); im.setColorAt(i, _c); } };
  im.flush = () => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; };
  im.count_ = n;
  return im;
}

// ---------- glow billboards (procedural, no image): additive soft dots / rings / 4-point sparkles, always facing the camera ----------
const GLOW_VS = `
varying vec2 vUv; varying vec3 vC;
void main(){
  vUv = uv; vC = instanceColor;
  mat4 mvi = modelViewMatrix * instanceMatrix;
  vec4 mv = mvi * vec4(0.0, 0.0, 0.0, 1.0);
  float sx = length(mvi[0].xyz), sy = length(mvi[1].xyz);
  mv.xy += position.xy * vec2(sx, sy);
  mv.z += max(sx, sy) * 0.9;   // act like a sphere: pushed toward the camera so floors / walls do not slice the glow
  gl_Position = projectionMatrix * mv;
}`;
const GLOW_FS = (shape) => `
varying vec2 vUv; varying vec3 vC;
void main(){
  vec2 d = (vUv - 0.5) * 2.0; float r = length(d); float a = 0.0;
  ${shape === 'ring' ? 'a = smoothstep(0.0, 0.12, r) * (1.0 - smoothstep(0.72, 1.0, r)); a *= smoothstep(0.55, 0.78, r);'
    : shape === 'star' ? 'float ax = abs(d.x), ay = abs(d.y); float cross = exp(-pow(ay * 9.0, 0.9)) * (1.0 - ax) + exp(-pow(ax * 9.0, 0.9)) * (1.0 - ay); a = clamp(cross, 0.0, 1.0) * (1.0 - smoothstep(0.7, 1.0, r)) + exp(-r * r * 14.0) * 0.9;'
    : shape === 'disc' ? 'a = 1.0 - smoothstep(0.82, 1.0, r);'
    : 'a = exp(-r * r * 3.6) * (1.0 - smoothstep(0.7, 1.0, r));'}
  if (a < 0.002) discard;
  gl_FragColor = vec4(vC * a, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const _glowM = {};
export function glowPool(n, shape = 'soft') {
  const mat_ = (_glowM[shape] ??= new THREE.ShaderMaterial({ vertexShader: GLOW_VS, fragmentShader: GLOW_FS(shape), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const im = pool(new THREE.PlaneGeometry(2, 2), mat_, n);
  im.renderOrder = 5;
  im.dot = (i, x, y, z, size, r, g, b) => { const h = size * 0.5; im.put(i, x, y, z, h, 0, 0, 0, h, h); im.tint(i, r, g, b); };   // size = diameter in metres
  return im;
}

// ---------- ballistic with bounce (closed form, deterministic) ----------
// Returns {x,y,z, rest, tRest, bounces} for a point thrown from (x0,y0,z0) with velocity (vx,vy,vz) at `age`. Floor at y=floor, restitution e,
// horizontal speed loses `fric` of its value on each bounce. No integration state: loops over the few bounces in closed form.
const _bo = { x: 0, y: 0, z: 0, rest: false, tRest: 0, bounces: 0 };
export function ballistic(x0, y0, z0, vx, vy, vz, age, { g = 9.8, floor = 0, e = 0.42, fric = 0.35, drag = 0, maxB = 5 } = {}) {
  if (age < 0) { _bo.x = x0; _bo.y = y0; _bo.z = z0; _bo.rest = false; _bo.tRest = 0; _bo.bounces = 0; return _bo; }
  let y = y0 - floor, vyy = vy, t = age, px = x0, pz = z0, hs = 1, tt = 0, b = 0;
  const kd = drag;
  const adv = (dt) => { const f = kd > 0 ? (1 - Math.exp(-kd * dt)) / kd : dt; px += vx * hs * f; pz += vz * hs * f; };
  _bo.rest = false;
  for (; b <= maxB; b++) {
    const disc = vyy * vyy + 2 * g * y;
    const tau = (vyy + Math.sqrt(Math.max(0, disc))) / g;
    if (t <= tau) { y = y + vyy * t - 0.5 * g * t * t; adv(t); t = 0; break; }
    adv(tau); t -= tau; tt += tau;
    const vImpact = -(vyy - g * tau);                  // downward speed at landing (positive)
    vyy = vImpact * e; y = 0; hs *= (1 - fric);
    if (vyy < 0.35) { _bo.rest = true; _bo.tRest = tt; adv(Math.min(t, 0.25)); y = 0; t = 0; break; }
  }
  if (b > maxB) { _bo.rest = true; _bo.tRest = tt; y = 0; }
  _bo.x = px; _bo.y = y + floor; _bo.z = pz; _bo.bounces = b;
  return _bo;
}

// ---------- puffs emitted from a moving point (closed form) ----------
// A puff j is born at te = t - life*phase_j and is then at path(te) + drift(t - te). Used for exhaust, comet, meteor and smoke trails.
export function emitPhase(t, j, n, life) { return fract(t / life + j / n); }

// ---------- camera-facing ----------
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
export function faceCamera(obj, cam) {
  if (!cam) return obj;
  cam.updateMatrixWorld(true);
  cam.getWorldQuaternion(_q);
  if (obj.parent) { obj.parent.updateMatrixWorld(true); obj.parent.getWorldQuaternion(_q2).invert(); _q.premultiply(_q2); }
  obj.quaternion.copy(_q); return obj;
}

// A dummy camera for demos / deterministic effects that need the viewpoint (fov in degrees, aspect w/h).
export function fakeCamera(pos, target, fov = 40, aspect = 0.75) {
  const c = new THREE.PerspectiveCamera(fov, aspect, 0.05, 2000);
  c.position.set(...pos); c.lookAt(new THREE.Vector3(...target)); c.updateMatrixWorld(true); return c;
}

// ---------- effect plumbing ----------
export function finish(g, fn, { loop = false, duration = 0, sizeM = 0, extra } = {}) {
  g.set = fn; g.update = fn;
  g.userData.loop = loop; g.userData.duration = duration; g.userData.sizeM = sizeM;
  if (extra) Object.assign(g, extra);
  return g;
}

// Thin additive "streak" geometry helper: unit bar along +X from 0..1 (origin at one end), tapered to a point at both ends.
export function spindleGeo(seg = 6) {
  return cached('spindle' + seg, () => {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, seg); g.rotateZ(Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); const k = Math.sin(clamp(x + 0.5) * Math.PI); const f = Math.max(0.02, Math.pow(k, 0.8)); p.setY(i, p.getY(i) * f); p.setZ(i, p.getZ(i) * f); }
    g.computeVertexNormals(); return g;
  });
}
// A streak orientation helper: quaternion that maps +X onto direction v
const _vx = new THREE.Vector3(1, 0, 0);
export function alignX(q, v) { return q.setFromUnitVectors(_vx, v); }

// ---------- procedural glow shells (no textures) ----------
// fresnelMat: additive rim-lit shell for spheres / capsules (aura, shockwave bubble). uniforms: uC colour, uA opacity, uP rim power.
export function fresnelMat(color = 0xffd060, { power = 2.2, base = 0.05 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: 1 }, uP: { value: power }, uB: { value: base } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uC; uniform float uA; uniform float uP; uniform float uB; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uP); gl_FragColor = vec4(uC * (uB + f * 1.5) * uA, 1.0); \n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }',
  });
}
// bandMat: for open cylinders: bright at the bottom (uv.y = 0) fading to nothing at the top. uniforms uC, uA, uK (fade sharpness).
export function bandMat(color = 0xffffff, { k = 1.6, flip = false, additive = true } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
    uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: 1 }, uK: { value: k } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uC; uniform float uA; uniform float uK; varying vec2 vUv; void main(){ float a = pow(clamp(${flip ? 'vUv.y' : '1.0 - vUv.y'}, 0.0, 1.0), uK) * uA; gl_FragColor = ${additive ? 'vec4(uC * a, 1.0)' : 'vec4(uC, a)'}; \n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }`,
  });
}

// radialMat: flat additive/alpha disc with a soft radial falloff (ground glows, aura pools). uniforms uC, uA, uIn (inner hole 0..1).
export function radialMat(color = 0xffd060, { inner = 0, power = 1.5, additive = true } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: 1 }, uIn: { value: inner }, uP: { value: power } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uC; uniform float uA; uniform float uIn; uniform float uP; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; if (r > 1.0) discard; float a = pow(1.0 - r, uP) * smoothstep(uIn, uIn + 0.08, r) * uA; gl_FragColor = ${additive ? 'vec4(uC * a, 1.0)' : 'vec4(uC, a)'}; \n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n }`,
  });
}
