// INTERIORS pack: shared helpers. Cached geometry, mesh/instancing shortcuts, the room shell (floor + 3 walls + ceiling, open to +Z for the camera),
// damage kit (wrecked 0..1: cracks, hole through the back wall, rubble, toppled furniture, sparking wires), dust motes, cable tubes, text signs.
// Geometry + colour only (canvas only for readable text). Deterministic: seeded rng, animation = pure function of t.
import * as THREE from 'three';
import { mat, glow, box, cyl, sph, cone, tor, rbox, rng, shade, canvasTex, clamp, lerp, smooth } from '../util.js';

export const INT_STAGE = { sky: ['#1d1f2b', '#2e3140'], ground: null, hemiI: 1.15, hemiSky: 0xfff4e4, hemiGround: 0xd8cfc4, keyI: 2.0, keyPos: [3, 9, 8], fillI: 0.55, rimI: 0.25, shadow: { extent: 9, size: 2048 }, env: 0.3 };

// ---------- cached geometry ----------
const GC = new Map();
const cached = (k, f) => { let g = GC.get(k); if (!g) { g = f(); GC.set(k, g); } return g; };
export const bg = (w, h, d) => cached(`b${w},${h},${d}`, () => box(w, h, d));
export const rg = (w, h, d, r = 0.03) => cached(`r${w},${h},${d},${r}`, () => rbox(w, h, d, r));
export const cg = (rt, rb, h, s = 16) => cached(`c${rt},${rb},${h},${s}`, () => cyl(rt, rb, h, s));
export const sg = (r, w = 14, h = 10) => cached(`s${r},${w},${h}`, () => sph(r, w, h));

// P(parent, geo, material, pos, rot, scale, cast): mesh shortcut (no shadow casting unless cast)
export function P(parent, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, cast = false) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(pos[0], pos[1], pos[2]); o.rotation.set(rot[0], rot[1], rot[2]);
  if (Array.isArray(scale)) o.scale.set(scale[0], scale[1], scale[2]); else o.scale.setScalar(scale);
  o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o;
}
export function castAll(obj, v = true) { obj.traverse((o) => { if (o.isMesh && !o.userData.noShadow) o.castShadow = v; }); return obj; }
export function grp(parent, pos = [0, 0, 0], rotY = 0) { const g = new THREE.Group(); g.position.set(pos[0], pos[1], pos[2]); g.rotation.y = rotY; if (parent) parent.add(g); return g; }
// merge update functions of children / extras into g.userData.update
export function withUpdate(g, ...fns) { const f = fns.filter(Boolean); const prev = g.userData.update; g.userData.update = (t) => { if (prev) prev(t); for (const x of f) x(t); }; return g; }
export function childUpdates(g) { const l = []; g.traverse((o) => { if (o !== g && o.userData.update && o.userData.update !== g.userData.update) l.push(o.userData.update); }); return l; }

// InstancedMesh from items [{p, r, s, c}] (position, euler, scale number|[x,y,z], colour hex). material should be white-ish for colours to show.
const _d = new THREE.Object3D(); const _c = new THREE.Color();
export function inst(parent, geo, m, items, { cast = false } = {}) {
  const im = new THREE.InstancedMesh(geo, m, Math.max(1, items.length));
  items.forEach((it, i) => { setInst(im, i, it); });
  im.count = items.length; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = cast; im.receiveShadow = true; im.frustumCulled = false; if (parent) parent.add(im); return im;
}
export function setInst(im, i, it) {
  _d.position.set(...(it.p ?? [0, 0, 0])); _d.rotation.set(...(it.r ?? [0, 0, 0]));
  if (Array.isArray(it.s)) _d.scale.set(...it.s); else _d.scale.setScalar(it.s ?? 1);
  _d.updateMatrix(); im.setMatrixAt(i, _d.matrix);
  if (it.c !== undefined) { _c.set(it.c); im.setColorAt(i, _c); }
}
export const WHITE = (rough = 0.8, o = {}) => mat(0xffffff, { rough, ...o });

// Tube along points (cables, hoses, wires)
export function tube(parent, pts, r = 0.01, color = 0x222222, { seg = 24, sides = 5 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, sides, false), mat(color, { rough: 0.6 }));
  m.receiveShadow = true; parent.add(m); return m;
}

// Readable sign / label (canvas = text only)
export function sign(text, w, h, { bg: bgc = '#1b2a5c', fg = '#ffffff', px = 256, size = 0.55, font = '800', family = 'Inter, sans-serif', border = null, lines = null, emissive = false } = {}) {
  const tex = canvasTex(px, Math.max(16, Math.round(px * h / w)), (g, cw, ch) => {
    if (bgc) { g.fillStyle = bgc; g.fillRect(0, 0, cw, ch); }
    if (border) { g.strokeStyle = border; g.lineWidth = Math.max(2, cw * 0.02); g.strokeRect(cw * 0.02, cw * 0.02, cw - cw * 0.04, ch - cw * 0.04); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const L = lines ?? [text];
    L.forEach((t, i) => { const fs = ch * size / (L.length > 1 ? L.length * 0.85 : 1); g.font = `${font} ${fs}px ${family}`; g.fillText(t, cw / 2, ch * (i + 0.5) / L.length, cw * 0.94); });
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: !emissive }));
  return m;
}

// ---------- floors ----------
export function floorSlab(parent, w, d, color, { y = -0.06, th = 0.12, rough = 0.8 } = {}) { return P(parent, bg(w, th, d), mat(color, { rough }), [0, y, 0]); }

export function floorPlanks(parent, w, d, { colors = [0xb07a48, 0xa86f40, 0xb8824e, 0xa0683c], pw = 0.16, seed = 1 } = {}) {
  const r = rng(seed + 50); floorSlab(parent, w, d, 0x4a3020);
  const items = [];
  for (let k = 0; k * pw < d; k++) {
    const z = -d / 2 + (k + 0.5) * pw; if (z > d / 2) break;
    let x = -w / 2; const first = r.range(0.5, 1.8);
    let len = first;
    while (x < w / 2 - 0.01) {
      const L = Math.min(len, w / 2 - x);
      items.push({ p: [x + L / 2, 0.0, z], s: [L - 0.012, 0.02, pw - 0.012], c: r.pick(colors) });
      x += L; len = r.range(1.0, 2.2);
    }
  }
  const im = inst(parent, bg(1, 1, 1), WHITE(0.7), items);
  im.position.y = -0.0; // planks span y -0.01..0.01 (scale y 0.02), top at +0.01
  return im;
}
export function floorTiles(parent, w, d, { size = 0.4, c1 = 0xeeeeee, c2 = 0x8aa0b0, seed = 1, grout = 0x6a6e74, checker = true, vary = 0.04 } = {}) {
  const r = rng(seed + 60); floorSlab(parent, w, d, grout);
  const items = [];
  const nx = Math.ceil(w / size), nz = Math.ceil(d / size);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = -w / 2 + (i + 0.5) * size, z = -d / 2 + (j + 0.5) * size; if (x > w / 2 + 0.01 || z > d / 2 + 0.01) continue;
    const base = checker ? ((i + j) % 2 ? c2 : c1) : c1; items.push({ p: [x, 0, z], s: [size - 0.016, 0.02, size - 0.016], c: shade(base, 1 + r.range(-vary, vary)) });
  }
  return inst(parent, bg(1, 1, 1), WHITE(0.35), items);
}
export function floorConcrete(parent, w, d, { color = 0x8d8d92, seed = 1, stains = 0 } = {}) {
  const r = rng(seed + 70); floorSlab(parent, w, d, color, { rough: 0.95 });
  const jm = mat(shade(color, 0.6), { rough: 1 });
  for (let x = -w / 2 + 1.5; x < w / 2; x += 1.5) P(parent, bg(0.02, 0.004, d), jm, [x, 0.003, 0]);
  for (let z = -d / 2 + 1.5; z < d / 2; z += 1.5) P(parent, bg(w, 0.004, 0.02), jm, [0, 0.003, z]);
  for (let i = 0; i < stains; i++) P(parent, cg(r.range(0.15, 0.45), r.range(0.15, 0.45), 0.004, 20), mat(shade(color, r.range(0.45, 0.7)), { rough: 0.4 }), [r.range(-w / 2 + 0.5, w / 2 - 0.5), 0.004, r.range(-d / 2 + 0.5, d / 2 - 0.5)], [0, r() * 3, 0], [1, 1, r.range(0.5, 1)]);
}
export function floorCarpet(parent, w, d, { color = 0x6d7a96, size = 0.5, seed = 1 } = {}) { return floorTiles(parent, w, d, { size, c1: color, c2: shade(color, 0.94), seed, grout: shade(color, 0.6), vary: 0.03 }); }
export function floorLino(parent, w, d, { color = 0xcfd8d0, color2 = 0xb9c6bd, seed = 1 } = {}) {
  floorSlab(parent, w, d, shade(color2, 0.7)); const items = [];
  const sw = 0.5; for (let k = 0; k * sw < d; k++) items.push({ p: [0, 0, -d / 2 + (k + 0.5) * sw], s: [w, 0.02, sw - 0.01], c: k % 2 ? color : color2 });
  return inst(parent, bg(1, 1, 1), WHITE(0.4), items);
}

// ---------- rugs ----------
export function rug(w = 2.4, d = 1.6, { shape = 'rect', colors = [0xc84a4a, 0xf2d27a, 0x3f7fb5], y = 0 } = {}) {
  const g = new THREE.Group();
  if (shape === 'round') {
    colors.forEach((c, i) => { const k = 1 - i * 0.22; P(g, cg(0.5, 0.5, 0.012 + i * 0.002, 40), mat(c, { rough: 1 }), [0, 0.006 + i * 0.002, 0], [0, 0, 0], [w * k, 1, d * k]); });
    // fringe ring of tassels
  } else {
    colors.forEach((c, i) => { const k = 1 - i * 0.14; P(g, rg(w * k, 0.014 + i * 0.002, d * k, 0.012), mat(c, { rough: 1 }), [0, 0.007 + i * 0.002, 0]); });
    for (let i = 0; i < Math.floor(d / 0.08); i++) for (const s of [-1, 1]) P(g, bg(0.07, 0.01, 0.018), mat(0xf2ead8, { rough: 1 }), [s * (w / 2 + 0.035), 0.005, -d / 2 + 0.05 + i * 0.08]);
  }
  g.position.y = y; return g;
}

// ---------- the room shell ----------
// room({w,d,h,wall,wall2,trim,floor:{type,...},ceiling,wainscot,hole:{x,y,r},wrecked,seed}) -> R
//   R.g = group (origin = floor centre, back wall at z=-d/2, side walls x=+-w/2, open towards +Z), R.place(obj, x,y,z, rotY), R.anim(fn), R.topple(obj, halfWidth, threshold),
//   R.finish(anchors, cam) -> { group, update, anchors, cam }
export function room(o = {}) {
  const { w = 5, d = 4.5, h = 2.8, seed = 1, wrecked = 0, wall = 0xf3e2c4, trim = 0xffffff, ceilColor = 0xf7f3ea, ceiling = true, floor = { type: 'planks' }, wainscot = null, hole = null, crown = true, baseH = 0.11, dust = 28, wallRough = 0.95, name = 'room' } = o;
  const wall2 = o.wall2 ?? wall;
  const g = new THREE.Group(); g.userData.realWidthM = w; g.userData.realHeightM = h; g.userData.realDepthM = d; g.name = name;
  const anims = []; const r = rng(seed * 7919 + 3);
  const T = 0.16;
  // floor
  const f = { ...floor, seed };
  if (f.type === 'planks') floorPlanks(g, w, d, f); else if (f.type === 'tiles') floorTiles(g, w, d, f); else if (f.type === 'carpet') floorCarpet(g, w, d, f); else if (f.type === 'concrete') floorConcrete(g, w, d, f); else if (f.type === 'lino') floorLino(g, w, d, f); else floorSlab(g, w, d, f.color ?? 0x888888);
  // walls
  const wm = mat(wall, { rough: wallRough }), wm2 = mat(wall2, { rough: wallRough }), tm = mat(trim, { rough: 0.55 });
  const holeOn = !!hole && wrecked > 0.3;
  if (holeOn) {
    const sh = new THREE.Shape([new THREE.Vector2(-w / 2 - T, 0), new THREE.Vector2(w / 2 + T, 0), new THREE.Vector2(w / 2 + T, h), new THREE.Vector2(-w / 2 - T, h)]);
    const pts = []; const hr = hole.r * (0.7 + 0.6 * clamp(wrecked)); const n = 20; const rr = rng(seed + 321);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, q = hr * (0.78 + rr() * 0.42); pts.push(new THREE.Vector2(hole.x + Math.cos(a) * q, hole.y + Math.sin(a) * q * 0.9)); }
    pts.reverse(); sh.holes.push(new THREE.Path(pts));
    const bw = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), wm); bw.position.set(0, 0, -d / 2 - T); bw.receiveShadow = true; bw.castShadow = false; g.add(bw);
    // ragged rim: brick / plaster chunks sticking out of the edge
    pts.forEach((p, i) => { const cc = i % 3 === 0 ? 0xb5553a : i % 3 === 1 ? 0xe6dccb : 0x8a8680; P(g, bg(0.12 + rr() * 0.1, 0.07 + rr() * 0.06, 0.06 + rr() * 0.06), mat(cc, { rough: 1 }), [p.x * 1.02, p.y, -d / 2 + 0.01 + rr() * 0.02], [rr() * 0.6, rr() * 0.6, rr() * 3]); });
    // outside: pale sky, far city blocks, smoke
    const out = new THREE.Group(); out.position.set(0, 0, -d / 2 - T - 2.5); g.add(out);
    P(out, new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ color: 0xbfe0f4, toneMapped: false }), [0, 6, -4]);
    for (let i = 0; i < 12; i++) P(out, bg(1 + rr() * 1.4, 2 + rr() * 5, 1 + rr()), mat(shade(0x9fb2c6, 0.8 + rr() * 0.4), { rough: 1 }), [-9 + i * 1.7 + rr(), (2 + rr() * 5) / 2 - 0.5, -1 - rr() * 3]);
    P(out, new THREE.PlaneGeometry(40, 3), mat(0x6a6a70, { rough: 1 }), [0, -0.45, -1], [-Math.PI / 2, 0, 0]);
  } else {
    P(g, bg(w + 2 * T, h, T), wm, [0, h / 2, -d / 2 - T / 2]);
  }
  P(g, bg(T, h, d + 0.001), wm2, [-w / 2 - T / 2, h / 2, 0]);
  P(g, bg(T, h, d + 0.001), wm2, [w / 2 + T / 2, h / 2, 0]);
  // skirting + crown + (optional) wainscot
  P(g, bg(w, baseH, 0.03), tm, [0, baseH / 2, -d / 2 + 0.015]);
  for (const s of [-1, 1]) P(g, bg(0.03, baseH, d), tm, [s * (w / 2 - 0.015), baseH / 2, 0]);
  if (crown) { P(g, bg(w, 0.09, 0.07), tm, [0, h - 0.045, -d / 2 + 0.035]); for (const s of [-1, 1]) P(g, bg(0.07, 0.09, d), tm, [s * (w / 2 - 0.035), h - 0.045, 0]); }
  if (wainscot) {
    const wh = 0.95, wmm = mat(wainscot, { rough: 0.7 });
    P(g, bg(w, wh, 0.03), wmm, [0, wh / 2, -d / 2 + 0.015]); P(g, bg(w, 0.05, 0.05), tm, [0, wh, -d / 2 + 0.025]);
    for (const s of [-1, 1]) { P(g, bg(0.03, wh, d), wmm, [s * (w / 2 - 0.015), wh / 2, 0]); P(g, bg(0.05, 0.05, d), tm, [s * (w / 2 - 0.025), wh, 0]); }
  }
  // wall plugs: light switch + socket on the back wall for realism
  P(g, bg(0.08, 0.12, 0.012), mat(0xf4f4f0, { rough: 0.4 }), [-w / 2 + 0.55, 1.25, -d / 2 + 0.006]); P(g, bg(0.03, 0.05, 0.008), mat(0xdddddd), [-w / 2 + 0.55, 1.27, -d / 2 + 0.014]);
  P(g, bg(0.085, 0.085, 0.012), mat(0xf4f4f0, { rough: 0.4 }), [w / 2 - 0.9, 0.3, -d / 2 + 0.006]); P(g, bg(0.03, 0.015, 0.006), mat(0x222222), [w / 2 - 0.9, 0.3, -d / 2 + 0.014]);
  // ceiling
  if (ceiling) {
    const c = P(g, bg(w + 2 * T, 0.14, d + 0.2), mat(ceilColor, { rough: 1, emissive: ceilColor, emissiveIntensity: 0.32 }), [0, h + 0.07, 0.1 - 0]); c.castShadow = false; c.receiveShadow = false;
  }
  const R = { g, w, d, h, T, anims, r, wrecked, seed, holeOn };
  R.anim = (fn) => { anims.push(fn); };
  R.place = (obj, x = 0, y = 0, z = 0, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; g.add(obj); R.reg(obj); return obj; };
  R.reg = (obj) => { obj.traverse((o) => { const f = o.userData.update; if (f && !anims.includes(f)) anims.push(f); }); return obj; };
  // topple furniture when wrecked: wraps obj in a pivot at its base edge (hw = half footprint along the fall axis). Use BEFORE R.place: R.place(R.topple(chair, 0.25, 0.5), x, 0, z, ry)
  R.topple = (obj, hw = 0.4, thr = 0.4, { sign } = {}) => {
    const s = sign ?? r.sign();
    if (wrecked < thr) return obj;
    const wrap = new THREE.Group(), inner = new THREE.Group(); wrap.add(inner); inner.position.x = s * hw; inner.add(obj); obj.position.x = -s * hw;
    inner.rotation.z = -s * (Math.PI / 2); inner.rotation.y = 0; wrap.rotation.y = 0;
    wrap.userData.update = obj.userData.update; return wrap;
  };
  R.finish = (anchors = {}, cam = null) => {
    // wreck kit + dust
    if (wrecked > 0) wreckFx(R, wrecked, { holeOn, hole });
    if (dust > 0) anims.push(dustMotes(g, w, d, h, dust, seed));
    // collect nested updates (children of placed groups register themselves in R.place)
    const update = (t) => { for (const a of anims) a(t); };
    g.userData.update = update; update(0.6);
    return { group: g, update, anchors, cam, size: { w, d, h } };
  };
  return R;
}

// ---------- damage kit ----------
function crackPlane(parent, plane, pos, rot, o, rr, color = 0x3a2c24) {
  const pg = new THREE.Group(); pg.position.set(...pos); pg.rotation.set(...rot); parent.add(pg);
  const m = mat(color, { rough: 1 });
  let x = o.x0, y = o.y0, ang = o.ang;
  const segs = o.n;
  for (let i = 0; i < segs; i++) {
    const L = o.len * (0.6 + rr() * 0.8);
    ang += (rr() - 0.5) * 1.3;
    const cx = x + Math.cos(ang) * L / 2, cy = y + Math.sin(ang) * L / 2;
    const t = o.thick * (1.2 - i / segs);
    const s = P(pg, bg(L * 1.08, t, 0.012), m, [cx, cy, 0.006], [0, 0, ang]);
    s.receiveShadow = false;
    if (rr() < 0.15 && i > 1) { const a2 = ang + (rr() < 0.5 ? 1 : -1) * (0.6 + rr() * 0.5), L2 = L * 1.2; P(pg, bg(L2, t * 0.7, 0.012), m, [x + Math.cos(a2) * L2 / 2, y + Math.sin(a2) * L2 / 2, 0.006], [0, 0, a2]).receiveShadow = false; }
    x += Math.cos(ang) * L; y += Math.sin(ang) * L;
  }
}
export function wreckFx(R, k, { holeOn, hole }) {
  const { g, w, d, h, seed } = R; const rr = rng(seed * 31 + 7);
  const wk = new THREE.Group(); wk.name = 'wreck'; g.add(wk);
  // floor cracks (plane rotated so local z = world up)
  const nF = Math.ceil(k * 5);
  for (let i = 0; i < nF; i++) crackPlane(wk, 'floor', [0, 0.012, 0], [-Math.PI / 2, 0, 0], { x0: rr.range(-w / 2 + 0.5, w / 2 - 0.5), y0: rr.range(-d / 2 + 0.5, d / 2 - 0.3), ang: rr() * 6.28, n: 5 + Math.floor(rr() * 5), len: 0.3, thick: 0.02 }, rr);
  // back + side wall cracks
  const nW = Math.ceil(k * 4);
  for (let i = 0; i < nW; i++) crackPlane(wk, 'back', [0, 0, -d / 2 + 0.004], [0, 0, 0], { x0: rr.range(-w / 2 + 0.4, w / 2 - 0.4), y0: rr.range(h * 0.35, h - 0.2), ang: -Math.PI / 2 + (rr() - 0.5), n: 6 + Math.floor(rr() * 5), len: 0.24, thick: 0.016 }, rr);
  for (const s of [-1, 1]) for (let i = 0; i < Math.ceil(k * 2); i++) crackPlane(wk, 'side', [s * (w / 2) - s * 0.004, 0, 0], [0, -s * Math.PI / 2, 0], { x0: rr.range(-d / 2 + 0.5, d / 2 - 0.5), y0: rr.range(h * 0.5, h - 0.2), ang: -Math.PI / 2 + (rr() - 0.5), n: 6, len: 0.22, thick: 0.015 }, rr);
  // rubble: chunks round the hole and scattered
  const n = Math.floor(10 + k * 70); const items = [];
  const cx = holeOn ? hole.x : rr.range(-w / 3, w / 3);
  for (let i = 0; i < n; i++) {
    const near = rr() < 0.55, s = rr.range(0.04, 0.17);
    const x = near ? cx + (rr() - 0.5) * 2.2 : rr.range(-w / 2 + 0.3, w / 2 - 0.3), z = near ? -d / 2 + 0.3 + rr() * 1.2 : rr.range(-d / 2 + 0.3, d / 2 - 0.2);
    items.push({ p: [x, s * 0.4, z], r: [rr() * 3, rr() * 3, rr() * 3], s: [s * rr.range(0.8, 1.6), s, s * rr.range(0.7, 1.4)], c: rr.pick([0xd9d2c4, 0xb5553a, 0x8d8a86, 0xe9e2d4, 0x6a6660]) });
  }
  inst(wk, bg(1, 1, 1), WHITE(1), items, { cast: false });
  // cut cables dangling from the ceiling with sparks
  const cbl = new THREE.Group(); wk.add(cbl);
  const bx = holeOn ? hole.x + 0.5 : rr.range(-w / 3, w / 3);
  tube(cbl, [[bx, h, -d / 2 + 0.5], [bx + 0.05, h - 0.3, -d / 2 + 0.52], [bx - 0.1, h - 0.7, -d / 2 + 0.56], [bx + 0.05, h - 1.0, -d / 2 + 0.6]], 0.012, 0x222226);
  tube(cbl, [[bx + 0.06, h, -d / 2 + 0.5], [bx + 0.14, h - 0.35, -d / 2 + 0.5], [bx + 0.18, h - 0.9, -d / 2 + 0.54]], 0.01, 0xc8302b);
  const sparks = []; for (let i = 0; i < 8; i++) sparks.push(P(cbl, sg(0.018, 6, 4), glow(0xffd23f, 2), [bx, h - 1, -d / 2 + 0.6]));
  const tip = [bx + 0.05, h - 1.0, -d / 2 + 0.6];
  // falling ceiling dust + smoke wisps
  const smoke = []; for (let i = 0; i < 6; i++) smoke.push(P(wk, sg(0.3, 10, 8), mat(0xb8b4ac, { opacity: 0.22, rough: 1, depthWrite: false }), [cx, 1, -d / 2 + 0.6], [0, 0, 0], 1));
  R.anim((t) => {
    sparks.forEach((s, i) => { const ph = (t * 6 + i * 0.37) % 1; const on = ((Math.floor(t * 8 + i * 3) * 7919) % 5) < 2 ? 1 : 0.0; s.visible = on > 0; s.position.set(tip[0] + Math.sin(i * 4 + t * 3) * 0.12 * ph, tip[1] - ph * 0.6, tip[2] + Math.cos(i * 3) * 0.1 * ph); s.scale.setScalar(0.6 + (1 - ph)); });
    smoke.forEach((s, i) => { const ph = (t * 0.12 + i / 6) % 1; s.position.set(cx + Math.sin(i * 2 + t * 0.4) * 0.3, 0.8 + ph * 1.9, -d / 2 + 0.7 + Math.cos(i) * 0.2); s.scale.setScalar(0.5 + ph * 1.2); s.material.opacity = 0.22 * (1 - ph); });
  });
  if (k < 0.5) smoke.forEach((s) => { s.visible = false; });
}

// ambient dust motes drifting through the room
export function dustMotes(parent, w, d, h, n = 28, seed = 1) {
  const rr = rng(seed + 999); const items = []; const base = [];
  for (let i = 0; i < n; i++) base.push([rr.range(-w / 2, w / 2), rr.range(0.3, h - 0.2), rr.range(-d / 2, d / 2), rr() * 6.28, rr.range(0.2, 0.6)]);
  const im = inst(parent, sg(0.01, 5, 4), new THREE.MeshBasicMaterial({ color: 0xfff1d0, transparent: true, opacity: 0.4 }), base.map((b) => ({ p: [b[0], b[1], b[2]] })));
  return (t) => { base.forEach((b, i) => { setInst(im, i, { p: [b[0] + Math.sin(t * 0.3 + b[3]) * 0.25, ((b[1] + t * 0.03 * b[4] * 4) % (h - 0.4)) + 0.2, b[2] + Math.cos(t * 0.25 + b[3]) * 0.2] }); }); im.instanceMatrix.needsUpdate = true; };
}

// ---------- tiny shared things ----------
export const COL = { wood: 0x9a6a3e, woodD: 0x6a4428, woodL: 0xc99a62, white: 0xf4f1ea, black: 0x1c1c22, grey: 0xb4b8c0, steel: 0xc8ccd6, red: 0xe04a3a, blue: 0x3a78d0, yellow: 0xffd23f, green: 0x3fa060, pink: 0xff7aa0, purple: 0x8a5ad0, orange: 0xff8a2b, teal: 0x2bb7b0, cream: 0xf6ecd5, navy: 0x1f2a55 };
export const PAL = [0xe04a3a, 0x3a78d0, 0xffd23f, 0x3fa060, 0xf6ecd5, 0x8a5ad0, 0xff8a2b, 0x2bb7b0, 0xff7aa0];
export { THREE, mat, glow, rng, shade, clamp, lerp, smooth, canvasTex, box, cyl, sph, cone, tor, rbox };
