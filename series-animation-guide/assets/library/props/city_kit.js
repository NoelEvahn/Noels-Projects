// City pack kit: shared helpers for the city_* props and sets.
// Everything is geometry + vertex colours (no textures; canvas only for readable signs). Deterministic: seeded rng, closed-form update(t).
//  * Batch      bakes hundreds of small parts into a few vertex-coloured meshes (cheap, detailed)
//  * makeWindows  instanced framed windows (frame, glass, mullions, sill, lit pane that flickers in a shader)
//  * anim(root) tiny updater registry: root.userData.update = (t) => ...
//  * signMesh   readable text sign (cached canvas), wheel, smoke, flag, halo, lamp helpers
import * as THREE from 'three';
import { mat, rng, shade, rbox, canvasTex, clamp, lerp, smooth } from '../util.js';

export { rng, shade, mat, clamp, lerp, smooth };
export const TAU = Math.PI * 2;
export const fract = (x) => x - Math.floor(x);
export const hash1 = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);

// toy-but-believable city palette
export const PAL = {
  brick: 0xb8573f, brickDark: 0x8d3f31, brownstone: 0x8a5040, cream: 0xefe2c4, sand: 0xddc8a0, white: 0xf3f0e8, grey: 0xa3a9b3,
  slate: 0x56627a, concrete: 0xbdbab2, dark: 0x2c3140, steel: 0xc3cad4, glass: 0x72aad2, glassDeep: 0x3d5f82, asphalt: 0x3a3d47,
  road: 0x44474f, kerb: 0xcfccc4, grass: 0x6bb04f, red: 0xd9392f, blue: 0x2f6fd6, yellow: 0xf6c235, green: 0x2fa66a, orange: 0xf08a2b,
  teal: 0x2bb7b0, purple: 0x8a52c9, pink: 0xf06a98, navy: 0x1d2b5c, warm: 0xffd68a, tv: 0xa6d2ff, black: 0x17181f,
};
export const BODY_COLORS = [0xd9392f, 0x2f6fd6, 0xf6c235, 0x2fa66a, 0xf2f0ea, 0x8a52c9, 0xf08a2b, 0x2bb7b0, 0x59626f, 0xe86a98];

// ---------------------------------------------------------------- materials
const _vc = new Map();
export function vcMat(rough = 0.7, metal = 0, extra = {}) {
  const key = `${rough}|${metal}|${JSON.stringify(extra)}`;
  if (!_vc.has(key)) _vc.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal, ...extra }));
  return _vc.get(key);
}
let _basicVC = null;
export const basicVC = () => (_basicVC ??= new THREE.MeshBasicMaterial({ vertexColors: true }));

// ---------------------------------------------------------------- cached primitive geometry
const _g = new Map();
const cache = (k, f) => { let g = _g.get(k); if (!g) { g = f(); _g.set(k, g); } return g; };
const q = (x) => Math.round(x * 1000) / 1000;
export const gBox = (w, h, d) => cache(`b${q(w)},${q(h)},${q(d)}`, () => new THREE.BoxGeometry(w, h, d));
export const gCyl = (rt, rb, h, s = 12) => cache(`c${q(rt)},${q(rb)},${q(h)},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const gCone = (r, h, s = 12) => cache(`n${q(r)},${q(h)},${s}`, () => new THREE.ConeGeometry(r, h, s));
export const gSph = (r, w = 12, h = 8) => cache(`s${q(r)},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
export const gRbox = (w, h, d, r = 0.05) => cache(`r${q(w)},${q(h)},${q(d)},${q(r)}`, () => rbox(w, h, d, r));
export const gPlane = (w, h) => cache(`p${q(w)},${q(h)}`, () => new THREE.PlaneGeometry(w, h));
export const gTor = (R, r, rs = 8, ts = 20, arc = TAU) => cache(`t${q(R)},${q(r)},${rs},${ts},${q(arc)}`, () => new THREE.TorusGeometry(R, r, rs, ts, arc));
// extrude a 2D profile [[x,y],...] (closed) along Z by depth (centred), optional bevel -> rounded toy edges
export function profileGeo(pts, depth, bevel = 0.06) {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -(depth - 2 * bevel) / 2);
  return g;
}

// ---------------------------------------------------------------- Batch: bake many coloured parts into few meshes
const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _e = new THREE.Euler(), _vp = new THREE.Vector3(), _vs = new THREE.Vector3(), _c = new THREE.Color(), _n3 = new THREE.Matrix3(), _v = new THREE.Vector3();
export class Batch {
  constructor() { this.g = new Map(); this.tris = 0; }
  add(geo, color, o = {}) {
    const lay = o.layer ?? this.layer ?? 0, key = o.glow ? 'glow' : `${o.rough ?? 0.72}|${o.metal ?? 0}|${lay}`;
    let G = this.g.get(key); if (!G) { G = { pos: [], nor: [], col: [] }; this.g.set(key, G); }
    const p = o.p ?? [0, 0, 0], r = o.r ?? [0, 0, 0], s = o.s ?? 1;
    _e.set(r[0], r[1], r[2]); _q4.setFromEuler(_e);
    if (Array.isArray(s)) _vs.set(s[0], s[1], s[2]); else _vs.set(s, s, s);
    _m4.compose(_vp.set(p[0], p[1], p[2]), _q4, _vs); _n3.getNormalMatrix(_m4);
    const g = geo.index ? geo.toNonIndexed() : geo;
    const P = g.attributes.position, N = g.attributes.normal; _c.set(color);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(_m4); G.pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize(); G.nor.push(_v.x, _v.y, _v.z);
      G.col.push(_c.r, _c.g, _c.b);
    }
    this.tris += P.count / 3;
    if (g !== geo) g.dispose();
    return this;
  }
  box(w, h, d, color, p, o = {}) { return this.add(gBox(w, h, d), color, { ...o, p }); }
  rbox(w, h, d, r, color, p, o = {}) { return this.flat ? this.box(w, h, d, color, p, o) : this.add(gRbox(w, h, d, r), color, { ...o, p }); }
  cyl(rt, rb, h, s, color, p, o = {}) { return this.add(gCyl(rt, rb, h, s), color, { ...o, p }); }
  cone(r, h, s, color, p, o = {}) { return this.add(gCone(r, h, s), color, { ...o, p }); }
  sph(r, color, p, o = {}) { return this.add(gSph(r, o.w ?? 12, o.h ?? 8), color, { ...o, p }); }
  tor(R, r, color, p, o = {}) { return this.add(gTor(R, r, 8, o.seg ?? 20, o.arc ?? TAU), color, { ...o, p }); }
  plane(w, h, color, p, o = {}) { return this.add(gPlane(w, h), color, { ...o, p }); }
  profile(pts, depth, bevel, color, p, o = {}) { const g = profileGeo(pts, depth, bevel); this.add(g, color, { ...o, p }); g.dispose(); return this; }
  // a straight bar between two points (rails, pipes, cables)
  bar(a, b, th, color, o = {}) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-6;
    const dir = new THREE.Vector3(dx, dy, dz).normalize(), qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), eu = new THREE.Euler().setFromQuaternion(qq);
    return this.add(o.round ? gCyl(th / 2, th / 2, L, 6) : gBox(th, L, th), color, { ...o, p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], r: [eu.x, eu.y, eu.z] });
  }
  // all parts merged into ONE BufferGeometry (position, normal, colour) for instancing
  toGeometry() {
    const pos = [], nor = [], col = [];
    for (const G of this.g.values()) { for (const v of G.pos) pos.push(v); for (const v of G.nor) nor.push(v); for (const v of G.col) col.push(v); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    return geo;
  }
  build(parent = new THREE.Group(), { shadow = true } = {}) {
    for (const [k, G] of this.g) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(G.pos), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(G.nor), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(G.col), 3));
      let m;
      if (k === 'glow') m = new THREE.Mesh(geo, basicVC());
      else { const [r, me, ly] = k.split('|').map(Number); m = new THREE.Mesh(geo, ly ? vcMat(r, me, { polygonOffset: true, polygonOffsetFactor: -ly, polygonOffsetUnits: -ly * 4 }) : vcMat(r, me)); }
      m.castShadow = shadow && k !== 'glow'; m.receiveShadow = true;
      parent.add(m);
    }
    return parent;
  }
}

// ---------------------------------------------------------------- instancing helper
// items: [{p:[x,y,z], r:[rx,ry,rz], s:number|[sx,sy,sz], c:hex}]
const _o = new THREE.Object3D();
export function inst(geo, material, items, { shadow = false } = {}) {
  const m = new THREE.InstancedMesh(geo, material, Math.max(1, items.length));
  m.count = items.length;
  items.forEach((it, i) => {
    _o.position.set(...(it.p ?? [0, 0, 0])); _o.rotation.set(...(it.r ?? [0, 0, 0]));
    const s = it.s ?? 1; Array.isArray(s) ? _o.scale.set(s[0], s[1], s[2]) : _o.scale.setScalar(s);
    _o.updateMatrix(); m.setMatrixAt(i, _o.matrix);
    if (it.c !== undefined) m.setColorAt(i, _c.set(it.c));
  });
  m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- animation registry
// const A = anim(root); A.on((t) => ...); A.add(child) adds child and forwards update(t)
export function anim(root) {
  const fns = [];
  root.userData.update = (t) => { for (let i = 0; i < fns.length; i++) fns[i](t); };
  return {
    on: (f) => { fns.push(f); return f; },
    add: (child, parent = root) => { parent.add(child); if (child.userData?.update) fns.push(child.userData.update); return child; },
    fns,
  };
}
export function runUpdates(obj, t) { obj.userData?.update?.(t); }
export function meta(obj, { h, w, d, name } = {}) {
  obj.userData.realHeightM = h; if (w) obj.userData.realWidthM = w; if (d) obj.userData.realDepthM = d; if (name) obj.name = name;
  return obj;
}

// ---------------------------------------------------------------- signs (readable text only)
const _sign = new Map();
export function signMesh(text, w, h, { bg = '#1b2a5c', fg = '#ffffff', font = 'Anton, Impact, sans-serif', border = null, weight = 400, double = false, lines = null, fit = 0.88, radius = 0.18, basic = true } = {}) {
  const key = JSON.stringify([text, lines, w, h, bg, fg, font, border, weight, radius]);
  let tex = _sign.get(key);
  if (!tex) {
    const px = 512, ph = Math.max(32, Math.round(px * h / w));
    tex = canvasTex(px, ph, (g, cw, ch) => {
      if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, cw, ch, Math.min(cw, ch) * radius); g.fill(); }
      if (border) { g.strokeStyle = border; g.lineWidth = Math.max(4, ch * 0.06); g.beginPath(); g.roundRect(ch * 0.05, ch * 0.05, cw - ch * 0.1, ch - ch * 0.1, Math.min(cw, ch) * radius * 0.7); g.stroke(); }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg;
      const L = lines ?? [{ text, y: 0.5, size: 1 }];
      for (const l of L) {
        let fs = ch * (l.size ?? 1) * 0.62;
        g.font = `${weight} ${fs}px ${font}`;
        const wdt = g.measureText(l.text).width; if (wdt > cw * fit) fs *= (cw * fit) / wdt;
        g.font = `${weight} ${fs}px ${font}`;
        if (l.color) g.fillStyle = l.color;
        g.fillText(l.text, cw / 2, (l.y ?? 0.5) * ch + fs * 0.04);
        g.fillStyle = fg;
      }
    });
    _sign.set(key, tex);
  }
  const mt = basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: !bg }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  const g = new THREE.Group();
  const f = new THREE.Mesh(gPlane(w, h), mt); g.add(f);
  if (double) { const b = new THREE.Mesh(gPlane(w, h), mt); b.rotation.y = Math.PI; b.position.z = -0.012; g.add(b); }
  return g;
}

// ---------------------------------------------------------------- windows
// list: [{x,y,z, ry, w, h, lit}] lit: 0 dark glass, 1 warm lit, 2 tv blue, 3 bright white. returns Group with userData.update(t)
export function facadeWindows(out, o) {
  const { cx = 0, cz = 0, w, d, y0 = 0, floors, fh = 3.2, ww = 1.1, wh = 1.5, sill = 0.85, gapX = 2.4, faces = 'FBLR', skip = 0, rnd = rng(1), lit = 0.3, margin = 1.2, skipFn = null, gapZ = null } = o;
  for (const f of faces) {
    const span = f === 'F' || f === 'B' ? w : d;
    const gap = (f === 'L' || f === 'R') && gapZ ? gapZ : gapX;
    const cols = Math.max(1, Math.floor((span - 2 * margin) / gap) + 1), step = cols > 1 ? Math.min(gap, (span - 2 * margin) / (cols - 1)) : 0;
    for (let fl = skip; fl < floors; fl++) for (let c = 0; c < cols; c++) {
      if (skipFn && skipFn(f, fl, c, cols)) continue;
      const u = (c - (cols - 1) / 2) * step, y = y0 + fl * fh + sill + wh / 2;
      const L = rnd() < lit ? (rnd() < 0.18 ? 2 : (rnd() < 0.1 ? 3 : 1)) : 0;
      const e = { y, w: ww, h: wh, lit: L };
      if (f === 'F') Object.assign(e, { x: cx + u, z: cz + d / 2, ry: 0 });
      else if (f === 'B') Object.assign(e, { x: cx - u, z: cz - d / 2, ry: Math.PI });
      else if (f === 'R') Object.assign(e, { x: cx + w / 2, z: cz - u, ry: Math.PI / 2 });
      else Object.assign(e, { x: cx - w / 2, z: cz + u, ry: -Math.PI / 2 });
      out.push(e);
    }
  }
  return out;
}
const LITC = [0x000000, 0xffd27a, 0x9ccdff, 0xfff4d8];
function flickerMat(base = 1) {
  const uT = { value: 0 };
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <color_vertex>', `#include <color_vertex>
      float hh = fract(sin(float(gl_InstanceID) * 12.9898 + 4.1) * 43758.5453);
      float kk = 1.0;
      if (hh > 0.86) kk = 0.55 + 0.45 * (0.5 + 0.5 * sin(uT * (4.0 + hh * 9.0) + hh * 60.0));
      else if (hh > 0.70 && hh < 0.74) kk = step(0.18, fract(uT * 0.045 + hh * 31.0));
      #ifdef USE_COLOR
      vColor.rgb *= kk * ${base.toFixed(2)};
      #endif`);
  };
  m.customProgramCacheKey = () => 'flick' + base;
  m.userData.uT = uT;
  return m;
}
export function makeWindows(list, { lod = 'high', frame = 0xf2eee4, unlit = [0x78b0d8, 0x6aa2cc, 0x83b8dc], glassDark = 0x3a526c, mull = true, sillOn = true, flicker = true, depthK = 1 } = {}) {
  const g = new THREE.Group(), n = list.length;
  if (!n) return g;
  const hi = lod === 'high';
  const mk = (geo, material, extra) => { const m = new THREE.InstancedMesh(geo, material, n); m.castShadow = false; m.receiveShadow = hi; m.frustumCulled = true; g.add(m); return m; };
  const glass = mk(hi ? gBox(1, 1, 0.12) : gPlane(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18, metalness: 0.25 }));
  const litIdx = []; list.forEach((w, i) => { if (w.lit) litIdx.push(i); });
  const frameM = hi ? mk(gBox(1, 1, 0.1), mat(frame, { rough: 0.6 })) : null;
  const mv = hi && mull ? mk(gBox(0.06, 1, 0.15), mat(frame, { rough: 0.6 })) : null;
  const mh = hi && mull ? mk(gBox(1, 0.06, 0.15), mat(frame, { rough: 0.6 })) : null;
  const sl = hi && sillOn ? mk(gBox(1, 0.08, 0.3), mat(shade(frame, 0.85), { rough: 0.7 })) : null;
  const litM = litIdx.length ? new THREE.InstancedMesh(gPlane(1, 1), flicker ? flickerMat() : new THREE.MeshBasicMaterial({ color: 0xffffff }), litIdx.length) : null;
  if (litM) { litM.castShadow = false; litM.receiveShadow = false; g.add(litM); }
  const put = (mesh, i, w, lx, ly, lz, sx, sy, sz) => {
    _o.position.set(w.x, w.y, w.z); _o.rotation.set(0, w.ry, 0); _o.scale.set(1, 1, 1); _o.updateMatrix();
    _o.translateX(lx); _o.translateY(ly); _o.translateZ(lz); _o.scale.set(sx, sy, sz); _o.updateMatrix(); mesh.setMatrixAt(i, _o.matrix);
  };
  const col = new THREE.Color(); let li = 0;
  list.forEach((w, i) => {
    const gz = hi ? 0.0 : 0.06 * depthK;
    put(glass, i, w, 0, 0, gz, w.w, w.h, 1);
    glass.setColorAt(i, w.lit ? col.setHex(glassDark) : col.setHex(w.c ?? unlit[i % unlit.length]));
    if (hi) {
      put(frameM, i, w, 0, 0, 0, w.w + 0.18, w.h + 0.18, 1);
      if (mv) { put(mv, i, w, 0, 0, 0, 1, w.h, 1); put(mh, i, w, 0, w.h * 0.18, 0, w.w, 1, 1); }
      if (sl) put(sl, i, w, 0, -w.h / 2 - 0.12, 0.1, w.w + 0.3, 1, 1);
    }
    if (w.lit && litM) {
      put(litM, li, w, 0, 0, hi ? 0.063 : 0.12 * depthK, w.w * 0.97, w.h * 0.97, 1);
      litM.setColorAt(li, col.setHex(LITC[w.lit])); li++;
    }
  });
  for (const m of g.children) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  if (litM && flicker) g.userData.update = (t) => { litM.material.userData.uT.value = t; };
  return g;
}

// ---------------------------------------------------------------- misc building blocks
export function lampMat(color, k = 1) { const m = new THREE.MeshBasicMaterial({ color }); m.userData.base = new THREE.Color(color); m.userData.set = (v) => { m.color.copy(m.userData.base).multiplyScalar(v); }; m.userData.set(k); return m; }
export function lampMesh(geo, color, k = 1) { const m = new THREE.Mesh(geo, lampMat(color, k)); m.userData.mat = m.material; return m; }
export function halo(color, r = 0.6, op = 0.35) {
  return new THREE.Mesh(gSph(r, 12, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
}
// wheel: tyre + hub + lugs; spin by wheel.rotation.x. axis along X, radius r, width w
export function wheel(r = 0.33, w = 0.22, { hub = 0xcfd5de, tire = 0x1c1d24 } = {}) {
  const g = new THREE.Group(), b = new Batch();
  b.add(gCyl(r, r, w, 18), tire, { r: [0, 0, Math.PI / 2], rough: 0.9 });
  b.add(gTor(r * 0.86, r * 0.17, 6, 18), tire, { p: [w / 2 - 0.02, 0, 0], r: [0, Math.PI / 2, 0], s: 1, rough: 0.9 });
  b.add(gTor(r * 0.86, r * 0.17, 6, 18), tire, { p: [-w / 2 + 0.02, 0, 0], r: [0, Math.PI / 2, 0], rough: 0.9 });
  b.add(gCyl(r * 0.62, r * 0.62, w + 0.02, 14), hub, { r: [0, 0, Math.PI / 2], rough: 0.3, metal: 0.6 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; b.add(gBox(w + 0.04, r * 0.22, r * 0.22), 0x6e7683, { p: [0, Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36], r: [a, 0, 0], rough: 0.4, metal: 0.5 }); }
  b.build(g); return g;
}
// smoke / steam plume made of rising, swelling then shrinking puffs. closed form of t. returns Mesh with .update(t)
export function plume({ n = 14, rise = 6, r0 = 0.3, r1 = 1.2, period = 6, drift = [1.2, 0, 0.3], color = 0xe9e9ee, seed = 1, spread = 0.2, opacity = 1 } = {}) {
  const rnd = rng(seed), ph = [], jx = [], jz = [];
  for (let i = 0; i < n; i++) { ph.push(i / n + rnd() * 0.02); jx.push(rnd.range(-1, 1)); jz.push(rnd.range(-1, 1)); }
  const m = new THREE.InstancedMesh(gSph(1, 10, 7), new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: opacity < 1, opacity, flatShading: false }), n);
  m.castShadow = false; m.frustumCulled = false;
  const o = new THREE.Object3D();
  m.userData.update = (t) => {
    for (let i = 0; i < n; i++) {
      const p = fract(t / period + ph[i]);
      const sc = lerp(r0, r1, Math.sin(p * Math.PI * 0.5)) * (1 - smooth((p - 0.7) / 0.3));
      o.position.set(drift[0] * p * p * rise * 0.4 + jx[i] * spread * p * rise * 0.3, p * rise, drift[2] * p * p * rise * 0.4 + jz[i] * spread * p * rise * 0.3);
      o.scale.setScalar(Math.max(0.001, sc)); o.rotation.set(0, 0, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  m.userData.update(0);
  return m;
}
// flag with waving cloth (vertex displacement per frame). pole along Y at x=0; cloth extends +X. stripes: array of colours (horizontal bands)
export function flag(w = 1.6, h = 1.0, colors = [0xd9392f, 0xffffff, 0x2f6fd6], { seg = 14 } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, seg, 6), p = geo.attributes.position, base = new Float32Array(p.array), col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const v = p.getY(i) / h + 0.5; c.set(colors[Math.min(colors.length - 1, Math.floor((1 - v) * colors.length * 0.9999))]); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }));
  m.castShadow = false;
  m.userData.update = (t) => {
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3] + w / 2, k = x / w;
      p.setXYZ(i, base[i * 3] + w / 2, base[i * 3 + 1], Math.sin(x * 3.2 - t * 5.5 + base[i * 3 + 1] * 1.2) * 0.12 * k * (w / 1.6));
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  m.userData.update(0);
  return m;
}

// ---------------------------------------------------------------- building parts (all bake into a Batch)
// horizontal ledge band at every floor: ledges(b, cx, cz, w, d, y0, floors, fh, colour)
export function ledges(b, { cx = 0, cz = 0, w, d, y0 = 0, floors, fh = 3.2, color = PAL.cream, th = 0.14, out = 0.1, from = 1 }) {
  for (let f = from; f <= floors; f++) b.box(w + out * 2, th, d + out * 2, color, [cx, y0 + f * fh - th / 2, cz]);
}
// roof parapet + coping around a rectangle at height y
export function parapet(b, { cx = 0, cz = 0, w, d, y, h = 0.6, color = PAL.cream, th = 0.3, cap = true }) {
  b.box(w, h, th, color, [cx, y + h / 2, cz + d / 2 - th / 2]); b.box(w, h, th, color, [cx, y + h / 2, cz - d / 2 + th / 2]);
  b.box(th, h, d - 2 * th, color, [cx + w / 2 - th / 2, y + h / 2, cz]); b.box(th, h, d - 2 * th, color, [cx - w / 2 + th / 2, y + h / 2, cz]);
  if (cap) { const c = shade(color, 0.85), t2 = th + 0.12; b.box(w + 0.12, 0.1, t2, c, [cx, y + h + 0.05, cz + d / 2 - th / 2]); b.box(w + 0.12, 0.1, t2, c, [cx, y + h + 0.05, cz - d / 2 + th / 2]); b.box(t2, 0.1, d - 2 * th, c, [cx + w / 2 - th / 2, y + h + 0.05, cz]); b.box(t2, 0.1, d - 2 * th, c, [cx - w / 2 + th / 2, y + h + 0.05, cz]); }
}
export function acUnit(b, x, y, z, ry = 0, s = 1) {
  const p = (dx, dy, dz) => { const c = Math.cos(ry), sn = Math.sin(ry); return [x + dx * c + dz * sn, y + dy, z - dx * sn + dz * c]; };
  b.add(gBox(0.8 * s, 0.5 * s, 0.35 * s), 0xcfd3d8, { p: p(0, 0, 0), r: [0, ry, 0], rough: 0.5, metal: 0.2 });
  b.add(gBox(0.62 * s, 0.34 * s, 0.03 * s), 0x666d78, { p: p(0, 0, 0.19 * s), r: [0, ry, 0] });
  b.add(gBox(0.7 * s, 0.05 * s, 0.1 * s), 0x8a909a, { p: p(0, -0.28 * s, 0.05 * s), r: [0, ry, 0] });
}
export function waterTank(b, x, y, z, s = 1, color = 0x8a5f3c) {
  b.cyl(1.0 * s, 1.0 * s, 1.9 * s, 14, color, [x, y + 2.4 * s, z], { rough: 0.8 });
  b.cone(1.1 * s, 0.6 * s, 14, shade(color, 0.7), [x, y + 3.65 * s, z]);
  for (const a of [0.3, 0.9, 1.5, 2.1]) b.cyl(0.02 * s, 0.02 * s, 1.9 * s, 5, 0x333a44, [x + 0, y + 2.4 * s, z], { r: [0, 0, 0] });
  for (const [dx, dz] of [[-0.8, -0.5], [0.8, -0.5], [0, 0.9]]) { b.bar([x + dx * s, y, z + dz * s], [x + dx * s * 0.8, y + 1.5 * s, z + dz * s * 0.8], 0.1 * s, 0x2e353f); }
  b.cyl(1.04 * s, 1.04 * s, 0.07, 14, 0x2e353f, [x, y + 1.9 * s, z]); b.cyl(1.04 * s, 1.04 * s, 0.07, 14, 0x2e353f, [x, y + 2.8 * s, z]);
}
export function antenna(b, x, y, z, h = 4, color = 0xc8ccd4) {
  b.cyl(0.04, 0.07, h, 6, color, [x, y + h / 2, z], { metal: 0.5, rough: 0.35 });
  for (let i = 0; i < 3; i++) b.box(0.9 - i * 0.2, 0.04, 0.04, color, [x, y + h * (0.55 + i * 0.14), z], { metal: 0.5 });
}
export function roofKit(b, rnd, { cx, cz, w, d, y, acs = 3, tank = false, antenna: ant = false, bulkhead = true, vents = 2 }) {
  const inner = (u) => rnd.range(-u, u);
  if (bulkhead) { const bx = cx + w * 0.22, bz = cz - d * 0.15; b.box(2.4, 2.4, 2.2, 0xd4cfc4, [bx, y + 1.2, bz]); b.box(0.9, 1.8, 0.06, 0x4e5a68, [bx, y + 0.95, bz + 1.13]); b.box(2.6, 0.14, 2.4, 0x8d8a82, [bx, y + 2.47, bz]); }
  for (let i = 0; i < acs; i++) { const rx = cx + (i - (acs - 1) / 2) * 1.4 - w * 0.18, rz = cz + d * 0.18; b.rbox(1.1, 0.8, 0.9, 0.08, 0xc9ced6, [rx, y + 0.4, rz], { rough: 0.5, metal: 0.25 }); b.cyl(0.32, 0.32, 0.04, 14, 0x555d68, [rx, y + 0.82, rz]); }
  for (let i = 0; i < vents; i++) { const vx = cx + inner(w * 0.35), vz = cz + inner(d * 0.3); b.cyl(0.14, 0.14, 0.7, 8, 0x59616d, [vx, y + 0.35, vz], { metal: 0.4 }); b.cone(0.26, 0.2, 8, 0x59616d, [vx, y + 0.8, vz]); }
  if (tank) waterTank(b, cx - w * 0.22, y, cz - d * 0.1, 0.8);
  if (ant) antenna(b, cx + w * 0.3, y, cz + d * 0.28, 4.2);
}
// striped awning slanting out from a wall: front face +Z. width w, projects 'out', top at y, stripes alternate c1/c2
export function awning(b, { x, y, z, w, out = 1.3, drop = 0.8, c1 = PAL.red, c2 = PAL.white, n = 8 }) {
  const sw = w / n, ang = Math.atan2(drop, out), len = Math.hypot(out, drop);
  for (let i = 0; i < n; i++) b.box(sw, 0.05, len, i % 2 ? c2 : c1, [x - w / 2 + sw * (i + 0.5), y - drop / 2, z + out / 2], { r: [ang, 0, 0] });
  for (let i = 0; i < n; i++) b.box(sw, 0.2, 0.05, i % 2 ? c2 : c1, [x - w / 2 + sw * (i + 0.5), y - drop - 0.08, z + out - 0.02]);
}
// zig-zag fire escape on a +Z facing wall: levels (count), floor height fh. x centre, wall z
export function fireEscape(b, { x, z, y0 = 3, levels = 3, fh = 3.2, w = 2.2, color = 0x2b3038 }) {
  for (let l = 0; l < levels; l++) {
    const y = y0 + l * fh;
    b.box(w, 0.06, 0.9, color, [x, y, z + 0.45], { metal: 0.3 });
    for (let i = 0; i <= 6; i++) b.box(0.03, 0.9, 0.03, color, [x - w / 2 + 0.05 + i * (w - 0.1) / 6, y + 0.45, z + 0.88]);
    b.box(w, 0.05, 0.05, color, [x, y + 0.92, z + 0.88]);
    b.box(0.05, 0.9, 0.05, color, [x - w / 2 + 0.03, y + 0.45, z + 0.45]); b.box(0.05, 0.9, 0.05, color, [x + w / 2 - 0.03, y + 0.45, z + 0.45]);
    if (l < levels - 1) {
      const sgn = l % 2 ? -1 : 1, a = [x + sgn * (w / 2 - 0.25), y, z + 0.6], c = [x - sgn * (w / 2 - 0.25), y + fh, z + 0.6];
      b.bar([a[0], a[1], a[2] - 0.2], [c[0], c[1], c[2] - 0.2], 0.07, color); b.bar([a[0], a[1], a[2] + 0.2], [c[0], c[1], c[2] + 0.2], 0.07, color);
      for (let k = 1; k < 9; k++) { const u = k / 9; b.box(0.05, 0.04, 0.5, color, [lerp(a[0], c[0], u), lerp(a[1], c[1], u), z + 0.6]); }
    }
  }
}
// simple street tree (instanced-friendly batch part): trunk + 4 blobs
export function treeParts(b, x, z, h = 4.5, color = 0x4aa84e, y = 0) {
  b.cyl(0.1, 0.16, h * 0.55, 8, 0x7a5232, [x, y + h * 0.27, z]);
  for (const [dx, dy, dz, r] of [[0, 0.78, 0, 0.95], [0.5, 0.62, 0.15, 0.7], [-0.5, 0.65, -0.1, 0.72], [0.05, 0.66, 0.55, 0.65], [0, 1.0, 0, 0.62]]) b.sph(r * h * 0.26, shade(color, 0.9 + dz * 0.1), [x + dx * h * 0.26, y + dy * h, z + dz * h * 0.26], { rough: 0.9, w: 10, h: 7 });
}
// pavement slab with kerb in front of a building. width w, depth d (towards +Z from z0)
export function pavement(b, { cx = 0, z0 = 0, w, d = 3, y = 0.15, color = 0xc9c5ba }) {
  b.box(w, y, d, color, [cx, y / 2, z0 + d / 2], { rough: 0.9 });
  b.box(w, y + 0.06, 0.18, PAL.kerb, [cx, (y + 0.06) / 2, z0 + d - 0.09], { rough: 0.8 });
}

// rooftop turbine vent (whirlybird): vanes spin in update(t)
export function turbineVent(r = 0.35, color = 0xb8bec8) {
  const g = new THREE.Group(), b = new Batch();
  b.cyl(r * 0.5, r * 0.5, 0.5, 8, 0x59616d, [0, 0.25, 0]);
  b.build(g);
  const spin = new THREE.Group(); spin.position.y = 0.5; g.add(spin);
  const v = new Batch(); v.sph(r, color, [0, r * 0.85, 0], { metal: 0.5, rough: 0.35, h: 6 });
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; v.box(0.03, r * 1.5, r * 0.55, shade(color, 0.85), [Math.cos(a) * r * 0.92, r * 0.8, Math.sin(a) * r * 0.92], { r: [0, -a, 0.15], metal: 0.5, rough: 0.35 }); }
  v.build(spin);
  g.userData.update = (t) => { spin.rotation.y = t * 5.5; };
  return g;
}

// ---------------------------------------------------------------- paths (traffic / pedestrians)
// polyline path with rounded corners, sampled every ~0.5 m. returns {pts:[{x,z,s}], L, at(s, lat) -> {x,z,h}}
export function makePath(points, { closed = false, radius = 4 } = {}) {
  const P = points.map(([x, z]) => new THREE.Vector2(x, z)), out = [];
  const n = P.length;
  const corner = (i) => {
    const a = P[(i + n - 1) % n], b = P[i], c = P[(i + 1) % n];
    const d1 = a.clone().sub(b), d2 = c.clone().sub(b), l1 = d1.length(), l2 = d2.length();
    const r = Math.min(radius, l1 * 0.45, l2 * 0.45);
    const p0 = b.clone().add(d1.normalize().multiplyScalar(r)), p2 = b.clone().add(d2.normalize().multiplyScalar(r));
    return [p0, b, p2];
  };
  const bez = (p0, p1, p2) => { for (let k = 0; k <= 8; k++) { const t = k / 8, u = 1 - t; out.push(new THREE.Vector2(u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y)); } };
  if (closed) for (let i = 0; i < n; i++) bez(...corner(i));
  else { out.push(P[0].clone()); for (let i = 1; i < n - 1; i++) bez(...corner(i)); out.push(P[n - 1].clone()); }
  if (closed) out.push(out[0].clone());
  const pts = []; let s = 0;
  out.forEach((p, i) => { if (i) s += p.distanceTo(out[i - 1]); pts.push({ x: p.x, z: p.y, s }); });
  const L = s;
  const at = (ss, lat = 0, o = {}) => {
    ss = closed ? ((ss % L) + L) % L : clamp(ss, 0, L);
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s <= ss) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], u = (ss - a.s) / Math.max(1e-6, b.s - a.s);
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    const x = lerp(a.x, b.x, u), z = lerp(a.z, b.z, u);
    return { x: x - (dz / l) * lat, z: z + (dx / l) * lat, h: Math.atan2(dx, dz) };   // lat > 0 = right-hand side of travel
  };
  return { pts, L, closed, at };
}

// flock of circling birds (instanced body + two flapping wings); closed form of t. returns Group with userData.update
export function birdFlock({ n = 12, center = [0, 20, 0], radius = 12, spread = 5, speed = 0.5, seed = 1, color = 0xe8e6e0, size = 1 } = {}) {
  const rnd = rng(seed), g = new THREE.Group(), B = [];
  for (let i = 0; i < n; i++) B.push({ ph: rnd() * TAU, r: radius + rnd.range(-spread, spread), y: rnd.range(-spread * 0.4, spread * 0.4), sp: speed * rnd.range(0.8, 1.2), fl: rnd.range(9, 14), dir: rnd() < 0.8 ? 1 : -1 });
  const bodyM = new THREE.InstancedMesh(gSph(0.22 * size, 8, 6), mat(color, { rough: 0.8 }), n), wingM = new THREE.InstancedMesh(gBox(0.7 * size, 0.04 * size, 0.28 * size), mat(shade(color, 0.85), { rough: 0.8 }), n * 2);
  const head = new THREE.InstancedMesh(gSph(0.11 * size, 6, 5), mat(shade(color, 0.7), { rough: 0.8 }), n);
  for (const m of [bodyM, wingM, head]) { m.frustumCulled = false; m.castShadow = false; g.add(m); }
  const o = new THREE.Object3D(), M = new THREE.Matrix4();
  g.userData.update = (t) => {
    B.forEach((b, i) => {
      const a = b.ph + t * b.sp * b.dir, x = center[0] + Math.cos(a) * b.r, z = center[2] + Math.sin(a) * b.r, y = center[1] + b.y + Math.sin(a * 2 + b.ph) * 0.8;
      const yaw = Math.atan2(-Math.sin(a) * b.dir, Math.cos(a) * b.dir), bank = -0.3 * b.dir;
      const place = (mesh, idx, lx, sx, sy, sz, rz = 0) => {
        o.position.set(x, y, z); o.rotation.set(0, yaw, bank); o.scale.set(1, 1, 1); o.updateMatrix();
        o.rotateZ(rz); o.translateX(lx); o.scale.set(sx, sy, sz); o.updateMatrix(); mesh.setMatrixAt(idx, o.matrix);
      };
      place(bodyM, i, 0, 1, 1, 1.5);
      o.position.set(x, y, z); o.rotation.set(0, yaw, bank); o.scale.set(1, 1, 1); o.updateMatrix(); o.translateZ(0.3 * size); o.updateMatrix(); head.setMatrixAt(i, o.matrix);
      const fl = Math.sin(t * b.fl + b.ph) * 0.85;
      place(wingM, i * 2, -0.36 * size, 1, 1, 1, -fl); place(wingM, i * 2 + 1, 0.36 * size, 1, 1, 1, fl);
    });
    bodyM.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = wingM.instanceMatrix.needsUpdate = true;
  };
  g.userData.update(0);
  return g;
}
// instanced crowd material: boxes hop up and down in the vertex shader (no CPU cost). returns material with userData.uT
export function bobMaterial(base = 0xffffff, { amp = 0.35, rate = 3.2, share = 0.45 } = {}) {
  const uT = { value: 0 };
  const m = new THREE.MeshStandardMaterial({ color: base, roughness: 0.8 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float h1 = fract(sin(float(gl_InstanceID) * 12.9898 + 1.7) * 43758.5453);
      float h2 = fract(sin(float(gl_InstanceID) * 78.233 + 9.1) * 24634.6345);
      if (h2 < ${share.toFixed(2)}) transformed.y += abs(sin(uT * ${rate.toFixed(2)} + h1 * 6.2831)) * ${amp.toFixed(2)};`);
  };
  m.customProgramCacheKey = () => `bob${amp}${rate}${share}`;
  m.userData.uT = uT;
  return m;
}
