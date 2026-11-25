// INTERIORS pack: wall dressing, soft furnishings, lighting and living details. Everything that would move in life moves in userData.update(t):
// curtains sway (vertex cloth), ceiling fans spin, clocks tick, steam rises off mugs, plants sway, lava lamp blobs rise, fish swim, globes turn, neon flickers, pendants swing, pets breathe.
import * as THREE from 'three';
import { P, bg, rg, cg, sg, grp, inst, setInst, tube, sign, WHITE, withUpdate, PAL, COL, castAll } from './interiors_core.js';
import { mat, glow, rng, shade, clamp, smooth } from '../util.js';
import { makeAnimal, APOSES, AFACES, ANIMALS } from '../animal.js';
import { CLOCK } from '../character.js';

const TAU = Math.PI * 2;

// ---------- cloth: curtains ----------
// One hanging panel from y=0 (top) down to y=-h, width w, vertical folds, swaying. Mesh with userData.update.
export function clothPanel(w = 0.6, h = 2, color = 0xd8604a, { folds = 6, amp = 0.045, sway = 0.05, phase = 0, seg = 36, gather = 0 } = {}) {
  const sy = 14, geo = new THREE.PlaneGeometry(w, h, seg, sy);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide }));
  m.castShadow = false; m.receiveShadow = true;
  const pos = geo.attributes.position, base = pos.array.slice();
  const upd = (t) => {
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], v = (-y) / h; // v 0 top -> 1 bottom
      const u = (x / w + 0.5);
      const fold = Math.sin(u * folds * TAU + 0.6) * amp * (0.55 + 0.45 * v);
      const sw = Math.sin(t * 0.9 + phase + v * 1.6) * sway * v * v + Math.sin(t * 1.7 + phase * 2 + u * 3) * sway * 0.25 * v;
      const hem = gather * (1 - v) * 0.0;
      pos.array[i * 3] = x * (1 - 0.0 * v) + hem;
      pos.array[i * 3 + 2] = fold + sw;
      pos.array[i * 3 + 1] = y + Math.cos(u * folds * TAU + 0.6) * 0.0;
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  upd(0.6); m.userData.update = upd; m.userData.noShadow = true; return m;
}
// Window curtain set: rod, rings, two gathered panels, tie-backs. Origin: centre of rod at the wall, panels hang from y = 0 down by h.
export function curtains(w = 1.4, h = 1.9, color = 0xd8604a, { phase = 0, sway = 0.05, tied = true } = {}) {
  const g = new THREE.Group(); const pw = Math.max(0.35, w * 0.34);
  P(g, cg(0.016, 0.016, w + 0.7, 8), mat(0x2a2a30, { metal: 0.6 }), [0, 0.06, 0.1], [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) P(g, sg(0.035, 10, 8), mat(0xd8b040, { metal: 0.8 }), [s * (w / 2 + 0.36), 0.06, 0.1]);
  for (const s of [-1, 1]) {
    const p = clothPanel(pw, h, color, { folds: 5, phase: phase + (s > 0 ? 1.7 : 0), sway }); p.position.set(s * (w / 2 + 0.12 - pw / 2 + (tied ? 0 : 0.15)), 0, 0.12); g.add(p);
    for (let i = 0; i < 6; i++) P(g, new THREE.TorusGeometry(0.03, 0.005, 5, 10), mat(0xd8b040, { metal: 0.8 }), [p.position.x - pw / 2 + 0.04 + i * (pw - 0.08) / 5, 0.04, 0.1], [0, Math.PI / 2, 0]);
    if (tied) P(g, new THREE.TorusGeometry(pw * 0.42, 0.02, 6, 16), mat(shade(color, 0.7), { rough: 0.8 }), [p.position.x, -h * 0.55, 0.12], [Math.PI / 2, 0, 0], [1, 0.4, 1]);
  }
  return g;
}
function childUpdates2(g) { const l = []; g.traverse((o) => { if (o !== g && o.userData.update) l.push(o.userData.update); }); return l; }

export function blinds(w = 1.3, h = 1.2, color = 0xf2ead8, { open = 0.5 } = {}) {
  const g = new THREE.Group(); const n = Math.floor(h / 0.045); const items = [];
  for (let i = 0; i < n; i++) items.push({ p: [0, -i * 0.045 - 0.02, 0], r: [open * 0.9, 0, 0], s: [w, 0.006, 0.05] });
  inst(g, bg(1, 1, 1), mat(color, { rough: 0.5 }), items);
  P(g, bg(w + 0.04, 0.05, 0.06), mat(shade(color, 0.85)), [0, 0.03, 0]); P(g, bg(w + 0.04, 0.03, 0.04), mat(shade(color, 0.85)), [0, -n * 0.045 - 0.02, 0]);
  tube(g, [[w / 2 - 0.05, 0, 0.02], [w / 2 - 0.05, -h * 0.7, 0.04], [w / 2 - 0.05, -h - 0.1, 0.03]], 0.004, 0xdddddd);
  return g;
}

// ---------- windows with a view ----------
function gradPlane(w, h, top, bottom) {
  const geo = new THREE.PlaneGeometry(w, h, 1, 8); const c = [], pos = geo.attributes.position; const a = new THREE.Color(top), b = new THREE.Color(bottom), t = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { t.copy(b).lerp(a, (pos.getY(i) / h + 0.5)); c.push(t.r, t.g, t.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
}
// Window (frame protrudes ~0.1 m into the room; view is layered scenery with drifting clouds / twinkling stars). Origin = centre of the window on the wall surface.
export function windowView(w = 1.3, h = 1.2, { view = 'day', frame = 0xffffff, seed = 1, panes = [2, 2], sill = true } = {}) {
  const g = new THREE.Group(), r = rng(seed + 11); const fm = mat(frame, { rough: 0.5 });
  const sc = new THREE.Group(); sc.position.z = 0.004; g.add(sc);
  const night = view === 'night' || view === 'city-night';
  const skyTop = { day: 0x6ab4f0, garden: 0x7cc4f4, city: 0x8cc0e8, night: 0x0a1030, 'city-night': 0x141a40, sunset: 0x5a4a9a, grey: 0x8a98a8 }[view] ?? 0x6ab4f0;
  const skyBot = { day: 0xdff2ff, garden: 0xe8f6ff, city: 0xe6f1fa, night: 0x2a3a78, 'city-night': 0x4a4a8a, sunset: 0xffb070, grey: 0xc8d0d8 }[view] ?? 0xdff2ff;
  sc.add(gradPlane(w, h, skyTop, skyBot));
  const lay = (zz) => zz;
  const clouds = [];
  if (!night) {
    for (let i = 0; i < 3; i++) { const c = new THREE.Group(); for (let k = 0; k < 4; k++) P(c, sg(0.07 + r() * 0.04, 10, 8), new THREE.MeshBasicMaterial({ color: view === 'grey' ? 0xe0e4e8 : 0xffffff, toneMapped: false }), [k * 0.09 - 0.14, (k % 2) * 0.03, 0], [0, 0, 0], [1.2, 0.7, 0.2]); c.position.set(0, h * (0.1 + r() * 0.3), 0.006); c.userData = { sp: 0.05 + r() * 0.05, x0: r() * 6.28, s: Math.min(0.55 + r() * 0.4, w * 0.6) }; c.scale.setScalar(c.userData.s); sc.add(c); clouds.push(c); }
  } else {
    for (let i = 0; i < 18; i++) { const s = P(sc, sg(0.008 + r() * 0.008, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), [(r() - 0.5) * w * 0.9, h * (0.0 + r() * 0.45), 0.006]); s.userData.ph = r() * 6; clouds.push(s); }
    P(sc, sg(0.09, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff3c4, toneMapped: false }), [w * 0.25, h * 0.28, 0.006], [0, 0, 0], [1, 1, 0.1]);
  }
  const mb = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  if (view === 'city' || view === 'city-night') {
    for (let i = 0; i < 9; i++) { const bw = Math.min(0.12 + r() * 0.16, w / 9 * 0.95), bh = 0.2 + r() * h * 0.45; const x = -w / 2 + (i + 0.5) * w / 9; P(sc, bg(bw, bh, 0.01), mb(shade(night ? 0x2a2e5a : 0x9fb0c8, 0.8 + r() * 0.4)), [x, -h / 2 + bh / 2, 0.01 + (i % 2) * 0.004]);
      for (let k = 0; k < 6; k++) { if (r() < (night ? 0.6 : 0.3)) P(sc, bg(0.02, 0.025, 0.002), mb(night ? 0xffe27a : 0xcfe6ff), [x + (r() - 0.5) * bw * 0.6, -h / 2 + 0.05 + r() * (bh - 0.08), 0.02]); } }
  } else {
    for (let i = 0; i < 3; i++) P(sc, new THREE.SphereGeometry(w * (0.2 + r() * 0.08), 14, 6, 0, TAU, 0, Math.PI / 2), mb(shade(0x6aa84a, 0.7 + i * 0.18)), [-w * 0.28 + i * w * 0.28, -h * 0.5, 0.008 + i * 0.004], [0, 0, 0], [1.0, 0.7, 0.02]);
    if (view === 'garden' || view === 'day') { const tx = (r() - 0.5) * w * 0.6; P(sc, bg(0.05, 0.5, 0.01), mb(0x6a4a2a), [tx, -h * 0.25, 0.03]); P(sc, sg(0.22, 12, 8), mb(0x2f8a3a), [tx, -h * 0.05, 0.034], [0, 0, 0], [1, 1, 0.05]); P(sc, sg(0.015, 6, 5), mb(0xe04a3a), [tx + 0.08, -h * 0.02, 0.04]); }
  }
  P(sc, bg(w, 0.01, 0.02), mb(0x4a8a3a), [0, -h / 2 + 0.03, 0.03]);
  // frame, mullions, sill
  const ft = 0.06, dep = 0.1;
  P(g, bg(w + 2 * ft, ft, dep), fm, [0, h / 2 + ft / 2, dep / 2]); P(g, bg(w + 2 * ft, ft, dep), fm, [0, -h / 2 - ft / 2, dep / 2]);
  for (const s of [-1, 1]) P(g, bg(ft, h, dep), fm, [s * (w / 2 + ft / 2), 0, dep / 2]);
  for (let i = 1; i < panes[0]; i++) P(g, bg(0.035, h, 0.05), fm, [-w / 2 + i * w / panes[0], 0, 0.03]);
  for (let i = 1; i < panes[1]; i++) P(g, bg(w, 0.035, 0.05), fm, [0, -h / 2 + i * h / panes[1], 0.03]);
  const glass = P(g, bg(w, h, 0.004), mat(0xdff3ff, { opacity: 0.12, rough: 0.05, depthWrite: false }), [0, 0, 0.045]); glass.castShadow = false;
  if (sill) { P(g, bg(w + 0.3, 0.04, 0.2), fm, [0, -h / 2 - ft - 0.02, 0.1]); }
  // sun patch: a soft bright quad on the sill
  g.userData.update = (t) => { for (const c of clouds) { if (night) { c.visible = Math.sin(t * 2 + c.userData.ph) > -0.6; } else { c.position.x = Math.sin(c.userData.x0 + t * c.userData.sp * 6) * (w / 2 - 0.22 * c.userData.s - 0.04); } } };
  g.userData.update(0.6); g.userData.realWidthM = w; g.userData.realHeightM = h; return g;
}

// ---------- clocks ----------
export function wallClock(r = 0.22, { color = 0xfaf6ee, frame = 0x15151c, h0 = 10, m0 = 8, digital = false } = {}) {
  const g = new THREE.Group();
  if (digital) {
    P(g, rg(r * 2.2, r * 0.9, 0.05, 0.02), mat(0x101012), [0, 0, 0.025]);
    const t0 = sign('00:00', r * 1.9, r * 0.7, { bg: '#100404', fg: '#ff4030', size: 0.7, family: 'ui-monospace, monospace', px: 128, emissive: true }); t0.position.z = 0.054; g.add(t0);
    g.userData.update = () => {}; return g;
  }
  P(g, cg(r, r, 0.05, 36), mat(frame, { rough: 0.4 }), [0, 0, 0.025], [Math.PI / 2, 0, 0]); P(g, cg(r * 0.92, r * 0.92, 0.01, 36), mat(color, { rough: 0.6 }), [0, 0, 0.052], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; P(g, bg(r * 0.05, i % 3 === 0 ? r * 0.2 : r * 0.1, 0.008), mat(0x15151c), [Math.sin(a) * r * 0.78, Math.cos(a) * r * 0.78, 0.06], [0, 0, -a]); }
  const mk = (len, wd, c, z) => { const p = new THREE.Group(); p.position.z = z; g.add(p); P(p, bg(wd, len, 0.008), mat(c), [0, len / 2 - len * 0.12, 0]); return p; };
  const hh = mk(r * 0.5, r * 0.07, 0x15151c, 0.064), mh = mk(r * 0.75, r * 0.05, 0x15151c, 0.068), sh = mk(r * 0.8, r * 0.02, 0xc8302b, 0.072);
  P(g, sg(r * 0.06, 8, 6), mat(0xc8302b), [0, 0, 0.076]);
  g.userData.update = (t) => { const tt = t + h0 * 3600 + m0 * 60; const s = Math.floor(tt); const fr = tt - s; const tick = s + (1 - Math.exp(-fr * 14)) * 1 + Math.sin(fr * 30) * Math.exp(-fr * 9) * 0.1; sh.rotation.z = -tick * TAU / 60; mh.rotation.z = -(tt / 60) * TAU / 60; hh.rotation.z = -(tt / 3600) * TAU / 12; };
  g.userData.update(0.6); return g;
}

// ---------- pictures & posters ----------
const ART = {
  rocket(g, w, h, r) { P(g, bg(w, h, 0.004), mat(0x16204a, { rough: 0.9 }), [0, 0, 0.004]); for (let i = 0; i < 14; i++) P(g, sg(0.007, 4, 3), glow(0xffffff, 1), [(r() - 0.5) * w * 0.9, (r() - 0.5) * h * 0.9, 0.008]); P(g, cg(w * 0.1, w * 0.1, h * 0.5, 14), mat(0xf2f2f6, { rough: 0.4 }), [0, 0, 0.02]); P(g, new THREE.ConeGeometry(w * 0.1, h * 0.18, 14), mat(0xe04a3a), [0, h * 0.34, 0.02]); P(g, sg(w * 0.045, 10, 8), mat(0x6ad0ff), [0, h * 0.08, 0.06], [0, 0, 0], [1, 1, 0.4]); for (const s of [-1, 1]) P(g, bg(w * 0.08, h * 0.15, 0.02), mat(0xe04a3a), [s * w * 0.12, -h * 0.2, 0.02]); P(g, new THREE.ConeGeometry(w * 0.07, h * 0.16, 10), glow(0xffa030, 1.5), [0, -h * 0.38, 0.02], [Math.PI, 0, 0]); },
  heart(g, w, h, r) { P(g, bg(w, h, 0.004), mat(0xffd0dc, { rough: 0.9 }), [0, 0, 0.004]); const hm = mat(0xe5173f, { rough: 0.5 }); P(g, sg(w * 0.2, 12, 10), hm, [-w * 0.13, h * 0.08, 0.02], [0, 0, 0], [1, 1, 0.3]); P(g, sg(w * 0.2, 12, 10), hm, [w * 0.13, h * 0.08, 0.02], [0, 0, 0], [1, 1, 0.3]); P(g, new THREE.ConeGeometry(w * 0.31, h * 0.34, 4), hm, [0, -h * 0.12, 0.02], [0, Math.PI / 4, Math.PI], [1, 1, 0.3]); },
  star(g, w, h, r) { P(g, bg(w, h, 0.004), mat(0x2a2a60, { rough: 0.9 }), [0, 0, 0.004]); for (let i = 0; i < 5; i++) { const a = i * TAU / 5; P(g, new THREE.ConeGeometry(w * 0.09, h * 0.32, 4), mat(0xffd23f), [Math.sin(a) * h * 0.14, Math.cos(a) * h * 0.14, 0.02], [0, 0, -a], [1, 1, 0.3]); } P(g, sg(w * 0.13, 10, 8), mat(0xffd23f), [0, 0, 0.02], [0, 0, 0], [1, 1, 0.3]); },
  band(g, w, h, r) { P(g, bg(w, h, 0.004), mat(0x15151c, { rough: 0.9 }), [0, 0, 0.004]); const cs = [0xe04a3a, 0x3a78d0, 0xffd23f]; for (let i = 0; i < 3; i++) { P(g, sg(w * 0.1, 10, 8), mat(0xf2b98f), [(i - 1) * w * 0.28, h * 0.12, 0.02], [0, 0, 0], [1, 1, 0.4]); P(g, bg(w * 0.2, h * 0.3, 0.02), mat(cs[i]), [(i - 1) * w * 0.28, -h * 0.14, 0.02]); } P(g, bg(w * 0.9, h * 0.04, 0.02), glow(0xff5c8a, 1), [0, -h * 0.38, 0.02]); },
  sunset(g, w, h, r) { P(g, bg(w, h, 0.004), mat(0xffa860, { rough: 0.9 }), [0, 0, 0.004]); P(g, bg(w, h * 0.45, 0.01), mat(0x2a3a7a), [0, h * 0.27, 0.01]); P(g, sg(w * 0.22, 14, 10), mat(0xfff0a0), [0, -h * 0.02, 0.02], [0, 0, 0], [1, 1, 0.2]); P(g, bg(w, h * 0.3, 0.02), mat(0x3a2a5a), [0, -h * 0.35, 0.03]); },
  cat(g, w, h, r) { P(g, bg(w, h, 0.004), mat(0xcfe8d8, { rough: 0.9 }), [0, 0, 0.004]); P(g, sg(w * 0.28, 14, 10), mat(0xf08a2e), [0, 0, 0.02], [0, 0, 0], [1, 0.9, 0.3]); for (const s of [-1, 1]) { P(g, new THREE.ConeGeometry(w * 0.09, h * 0.14, 3), mat(0xf08a2e), [s * w * 0.18, h * 0.22, 0.02], [0, 0, -s * 0.3], [1, 1, 0.3]); P(g, sg(w * 0.04, 8, 6), mat(0xc4e05a), [s * w * 0.1, h * 0.03, 0.05], [0, 0, 0], [1, 1, 0.3]); P(g, sg(w * 0.015, 6, 5), mat(0x111111), [s * w * 0.1, h * 0.03, 0.062], [0, 0, 0], [0.6, 1.2, 0.3]); } P(g, sg(w * 0.025, 6, 5), mat(0xff8aa0), [0, -h * 0.05, 0.06]); },
  map(g, w, h, r) { P(g, bg(w, h, 0.004), mat(0x8ac0e0, { rough: 0.9 }), [0, 0, 0.004]); for (let i = 0; i < 6; i++) P(g, sg(w * 0.14, 8, 6), mat(shade(0x6aa850, 0.8 + r() * 0.4)), [(r() - 0.5) * w * 0.7, (r() - 0.5) * h * 0.7, 0.01 + i * 0.002], [0, 0, 0], [1, 0.7, 0.05]); P(g, sg(w * 0.025, 6, 5), mat(0xe04a3a), [(r() - 0.5) * w * 0.5, (r() - 0.5) * h * 0.5, 0.03]); },
  robot(g, w, h, r) { P(g, bg(w, h, 0.004), mat(0xffe38a, { rough: 0.9 }), [0, 0, 0.004]); P(g, rg(w * 0.5, h * 0.3, 0.03, 0.02), mat(0x9aa4b8, { metal: 0.4 }), [0, h * 0.14, 0.03]); P(g, rg(w * 0.62, h * 0.34, 0.03, 0.02), mat(0xc8ccd6, { metal: 0.4 }), [0, -h * 0.16, 0.03]); for (const s of [-1, 1]) P(g, sg(w * 0.05, 8, 6), glow(0x6ad0ff, 1), [s * w * 0.12, h * 0.16, 0.06], [0, 0, 0], [1, 1, 0.3]); P(g, bg(w * 0.02, h * 0.12, 0.02), mat(0x555a66), [0, h * 0.35, 0.03]); },
  landscape(g, w, h, r) { P(g, bg(w, h, 0.004), mat(0x9cd2f0, { rough: 0.9 }), [0, 0, 0.004]); P(g, sg(w * 0.08, 10, 8), mat(0xffe060), [w * 0.25, h * 0.22, 0.01], [0, 0, 0], [1, 1, 0.1]); P(g, new THREE.ConeGeometry(w * 0.35, h * 0.5, 4), mat(0x5a8a6a), [-w * 0.15, -h * 0.05, 0.015], [0, Math.PI / 4, 0], [1, 1, 0.1]); P(g, new THREE.ConeGeometry(w * 0.3, h * 0.4, 4), mat(0x3a6a5a), [w * 0.2, -h * 0.1, 0.02], [0, Math.PI / 4, 0], [1, 1, 0.1]); P(g, bg(w, h * 0.22, 0.02), mat(0x4a8a3a), [0, -h * 0.39, 0.025]); },
  portrait(g, w, h, r) { P(g, bg(w, h, 0.004), mat(r.pick([0xe8d8b8, 0xc8d8e8, 0xe8c8c8]), { rough: 0.9 }), [0, 0, 0.004]); P(g, sg(w * 0.2, 12, 10), mat(0xf2b98f), [0, h * 0.1, 0.02], [0, 0, 0], [1, 1.1, 0.3]); P(g, sg(w * 0.22, 12, 10, 0, TAU, 0, 1.5), mat(0x4a3020), [0, h * 0.14, 0.03], [0, 0, 0], [1, 1, 0.3]); P(g, rg(w * 0.55, h * 0.3, 0.03, 0.03), mat(r.pick([0x3a78d0, 0xe04a3a, 0x3fa060])), [0, -h * 0.28, 0.03]); },
  abstract(g, w, h, r) { P(g, bg(w, h, 0.004), mat(0xf6f0e4, { rough: 0.9 }), [0, 0, 0.004]); for (let i = 0; i < 5; i++) { const c = r.pick(PAL); const s = r.range(0.15, 0.4); const ps = [(r() - 0.5) * w * 0.6, (r() - 0.5) * h * 0.6, 0.01 + i * 0.004]; if (i % 2) P(g, bg(w * s, w * s, 0.01), mat(c), ps, [0, 0, r()]); else P(g, cg(w * s * 0.5, w * s * 0.5, 0.01, 16), mat(c), ps, [Math.PI / 2, 0, 0]); } },
};
export function poster(w = 0.5, h = 0.7, { kind = 'rocket', seed = 1, frame = null, tilt = 0 } = {}) {
  const g = new THREE.Group(), r = rng(seed + 77); const art = new THREE.Group(); g.add(art); (ART[kind] ?? ART.abstract)(art, w, h, r);
  if (frame !== null) { const fm = mat(frame, { rough: 0.5 }), t = 0.035; P(g, bg(w + 2 * t, t, 0.04), fm, [0, h / 2 + t / 2, 0.012]); P(g, bg(w + 2 * t, t, 0.04), fm, [0, -h / 2 - t / 2, 0.012]); for (const s of [-1, 1]) P(g, bg(t, h, 0.04), fm, [s * (w / 2 + t / 2), 0, 0.012]); P(g, bg(w, h, 0.006), mat(0xffffff), [0, 0, 0.0]); }
  else { for (const [x, y] of [[-w / 2, h / 2], [w / 2, h / 2], [-w / 2, -h / 2], [w / 2, -h / 2]]) P(g, sg(0.012, 6, 5), mat(0xe04a3a), [x * 0.96, y * 0.96, 0.012]); }
  g.rotation.z = tilt; g.userData.realWidthM = w; return g;
}
export const POSTER_KINDS = Object.keys(ART);
// A salon-style cluster of frames/posters on a wall: returns group at wall surface origin (centre of cluster)
export function gallery(n = 5, { w = 1.6, h = 0.9, seed = 1, frames = [0x5a3a22, 0xffffff, 0x15151c, 0xc9a24a] } = {}) {
  const g = new THREE.Group(), r = rng(seed + 31); const kinds = ['landscape', 'portrait', 'abstract', 'sunset', 'cat', 'star'];
  const slots = []; const cols = Math.ceil(Math.sqrt(n * w / h)); const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) { const cx = ((i % cols) + 0.5) / cols - 0.5, cy = 0.5 - (Math.floor(i / cols) + 0.5) / rows; const pw = r.range(0.22, 0.4), ph = r.range(0.22, 0.4) * (r() < 0.5 ? 1.2 : 0.85); const f = poster(pw, ph, { kind: r.pick(kinds), seed: seed + i, frame: r.pick(frames), tilt: (r() - 0.5) * 0.05 }); f.position.set(cx * w + (r() - 0.5) * 0.05, cy * h + (r() - 0.5) * 0.05, 0); g.add(f); }
  return g;
}

// ---------- lighting ----------
const flickerMat = (c, k) => { const m = glow(c, k).clone(); return m; };
export function ceilingFan({ r = 0.62, blades = 4, color = 0xc9a062, light = true, speed = 5 } = {}) {
  const g = new THREE.Group(); P(g, cg(0.04, 0.04, 0.3, 8), mat(0xe8e4dc), [0, -0.15, 0]); P(g, cg(0.09, 0.11, 0.05, 16), mat(0xf4f1ea), [0, -0.02, 0]);
  const rot = new THREE.Group(); rot.position.y = -0.32; g.add(rot); P(rot, cg(0.13, 0.13, 0.1, 18), mat(0xf4f1ea, { rough: 0.4 }), [0, 0, 0], [0, 0, 0], 1, true);
  for (let i = 0; i < blades; i++) { const a = i * TAU / blades; const b = new THREE.Group(); b.rotation.y = a; rot.add(b); P(b, rg(r * 0.82, 0.016, 0.17, 0.02), mat(color, { rough: 0.6 }), [r * 0.55, 0.0, 0], [0.0, 0, 0.06], 1, true); P(b, bg(0.1, 0.02, 0.06), mat(0x30302c), [0.14, 0.0, 0]); }
  if (light) { P(g, sg(0.11, 14, 8, 0, 6.28, Math.PI / 2, Math.PI / 2), flickerMat(0xfff2c8, 1.1), [0, -0.4, 0], [0, 0, 0], [1, 0.8, 1]); }
  g.userData.update = (t) => { rot.rotation.y = -t * speed; };
  g.userData.update(0.6); g.userData.realWidthM = r * 2; return g;
}
export function panelLight(w = 0.6, d = 0.6, { color = 0xfffaf0, k = 1.1 } = {}) { const g = new THREE.Group(); P(g, bg(w + 0.05, 0.03, d + 0.05), mat(0xdcdcdc), [0, -0.015, 0]); P(g, bg(w, 0.01, d), flickerMat(color, k), [0, -0.034, 0]); return g; }
export function fluorescent(len = 1.2, { flicker = 0, color = 0xf4fff4, seed = 1 } = {}) {
  const g = new THREE.Group(); P(g, bg(len + 0.04, 0.05, 0.16), mat(0xe8e8e4), [0, -0.025, 0]); const m = flickerMat(color, 1.3); P(g, cg(0.025, 0.025, len, 10), m, [0, -0.06, 0], [0, 0, Math.PI / 2]);
  if (flicker) g.userData.update = (t) => { const f = Math.floor(t * 18 + seed * 5); const off = ((f * 2654435761) >>> 0) % 100 < flicker * 100; m.emissiveIntensity = off ? 0.15 : 1.3; };
  return g;
}
export function pendant(color = 0xffd23f, { drop = 0.7, r = 0.22, swing = 0.02, shape = 'dome' } = {}) {
  const g = new THREE.Group(); const sw = new THREE.Group(); g.add(sw);
  P(g, cg(0.05, 0.05, 0.03, 12), mat(0xe8e4dc), [0, -0.015, 0]);
  P(sw, cg(0.005, 0.005, drop, 6), mat(0x15151c), [0, -drop / 2, 0]);
  if (shape === 'dome') P(sw, new THREE.SphereGeometry(r, 20, 10, 0, TAU, 0, Math.PI / 2), mat(color, { rough: 0.4, side: THREE.DoubleSide }), [0, -drop - r * 0.4, 0], [0, 0, 0], [1, 0.85, 1], true);
  else if (shape === 'globe') P(sw, sg(r, 16, 12), flickerMat(0xfff4d0, 0.9), [0, -drop - r, 0]);
  else { P(sw, new THREE.CylinderGeometry(r * 0.6, r, r * 1.1, 20, 1, true), mat(color, { rough: 0.7, side: THREE.DoubleSide }), [0, -drop - r * 0.5, 0], [0, 0, 0], 1, true); }
  P(sw, sg(r * 0.35, 10, 8), glow(0xfff4d0, 1.6), [0, -drop - r * 0.5, 0]);
  g.userData.update = (t) => { sw.rotation.z = Math.sin(t * 0.9) * swing; sw.rotation.x = Math.cos(t * 0.7 + 1) * swing * 0.6; };
  return g;
}
export function floorLamp(color = 0xfff0d0, { h = 1.55, style = 'shade', base = 0x2a2a30 } = {}) {
  const g = new THREE.Group(); P(g, cg(0.16, 0.18, 0.035, 16), mat(base, { metal: 0.4 }), [0, 0.018, 0]); P(g, cg(0.014, 0.014, h, 8), mat(base, { metal: 0.6 }), [0, h / 2, 0], [0, 0, 0], 1, true);
  if (style === 'arc') { tube(g, [[0, h, 0], [0.2, h + 0.15, 0], [0.5, h, 0], [0.62, h - 0.2, 0]], 0.014, base); P(g, new THREE.SphereGeometry(0.17, 16, 8, 0, TAU, 0, Math.PI / 2), mat(0xdd5a3a, { side: THREE.DoubleSide }), [0.62, h - 0.2, 0], [Math.PI, 0, 0]); }
  else P(g, new THREE.CylinderGeometry(0.15, 0.25, 0.32, 20, 1, true), mat(color, { side: THREE.DoubleSide, emissive: 0xffd890, emissiveIntensity: 0.55, rough: 0.9 }), [0, h + 0.05, 0], [0, 0, 0], 1, true);
  return g;
}
export function tableLamp(color = 0xff7a8a, { h = 0.34 } = {}) {
  const g = new THREE.Group(); P(g, cg(0.07, 0.09, 0.03, 14), mat(0x2a2a30), [0, 0.015, 0]); P(g, cg(0.012, 0.012, h * 0.6, 8), mat(0x2a2a30, { metal: 0.5 }), [0, h * 0.33, 0]);
  P(g, new THREE.CylinderGeometry(0.09, 0.15, 0.17, 18, 1, true), mat(color, { side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.35, rough: 0.9 }), [0, h * 0.68, 0], [0, 0, 0], 1, true); P(g, sg(0.035, 8, 6), glow(0xfff0c8, 2), [0, h * 0.62, 0]);
  return g;
}
export function lavaLamp(color = 0xff4a8a, { seed = 1 } = {}) {
  const g = new THREE.Group(); const gm = mat(0x2a2a30, { metal: 0.5 }); P(g, cg(0.07, 0.1, 0.12, 14), gm, [0, 0.06, 0]); P(g, cg(0.03, 0.07, 0.34, 14), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, transparent: true, opacity: 0.55, roughness: 0.2 }), [0, 0.29, 0]); P(g, cg(0.02, 0.03, 0.06, 10), gm, [0, 0.49, 0]); P(g, sg(0.018, 8, 6), gm, [0, 0.53, 0]);
  const bl = []; for (let i = 0; i < 4; i++) bl.push(P(g, sg(0.025 + i * 0.004, 10, 8), glow(0xffd23f, 0.9), [0, 0.2, 0]));
  g.userData.update = (t) => bl.forEach((b, i) => { const ph = (t * 0.07 + i / 4) % 1; const y = 0.16 + (0.5 - 0.5 * Math.cos(ph * TAU)) * 0.26; b.position.set(Math.sin(i * 2 + t * 0.3) * 0.01, y, Math.cos(i) * 0.008); b.scale.set(1, 1 + 0.3 * Math.sin(ph * TAU * 2), 1); });
  g.userData.update(0.6); return g;
}
export function neonSign(text = 'OPEN', color = '#ff3a7a', w = 0.9, h = 0.35, { flicker = 0.1, seed = 1 } = {}) {
  const g = new THREE.Group(); P(g, bg(w + 0.06, h + 0.06, 0.03), mat(0x15151c), [0, 0, 0.015]);
  const s = sign(text, w, h, { bg: '#0a0a10', fg: color, size: 0.62, px: 256, emissive: true, border: color, family: 'Anton, Inter, sans-serif', font: '400' }); s.position.z = 0.032; g.add(s);
  g.userData.update = (t) => { const f = Math.floor(t * 20 + seed); const off = (((f * 2654435761) >>> 0) % 1000) / 1000 < flicker * 0.5; s.material.color.setScalar(off ? 0.3 : 1); };
  return g;
}

// ---------- steam, mugs ----------
export function steam(n = 6, { h = 0.35, r = 0.03, color = 0xffffff, op = 0.35, speed = 0.5 } = {}) {
  const g = new THREE.Group(); const puffs = [];
  for (let i = 0; i < n; i++) puffs.push(P(g, sg(r, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }), [0, 0, 0]));
  g.userData.update = (t) => puffs.forEach((p, i) => { const ph = (t * speed + i / n) % 1; p.position.set(Math.sin(ph * 7 + i * 2) * r * 1.4 * ph, ph * h, Math.cos(ph * 5 + i) * r * ph); p.scale.setScalar(0.5 + ph * 1.8); p.material.opacity = op * Math.sin(ph * Math.PI); });
  g.userData.update(0.6); return g;
}
export function mug(color = 0xe04a3a, { steamOn = true, fill = 0x4a2a14 } = {}) {
  const g = new THREE.Group(); P(g, new THREE.CylinderGeometry(0.04, 0.035, 0.09, 16, 1, true), mat(color, { rough: 0.35, side: THREE.DoubleSide }), [0, 0.045, 0], [0, 0, 0], 1, true); P(g, cg(0.035, 0.035, 0.008, 16), mat(color), [0, 0.004, 0]); P(g, cg(0.037, 0.037, 0.004, 16), mat(fill, { rough: 0.2 }), [0, 0.078, 0]);
  P(g, new THREE.TorusGeometry(0.026, 0.006, 6, 12, Math.PI), mat(color, { rough: 0.35 }), [0.04, 0.047, 0], [0, 0, -Math.PI / 2]);
  if (steamOn) { const s = steam(5, { h: 0.22, r: 0.016, op: 0.4 }); s.position.y = 0.09; g.add(s); g.userData.update = s.userData.update; }
  return g;
}

// ---------- plants ----------
export function plant({ kind = 'monstera', h = 1.0, seed = 1, pot = 0xd8805a, sway = 0.04 } = {}) {
  const g = new THREE.Group(), r = rng(seed + 3); const leaves = [];
  const ph = Math.min(0.32, h * 0.3); P(g, new THREE.CylinderGeometry(ph * 0.62, ph * 0.46, ph, 16), mat(pot, { rough: 0.6 }), [0, ph / 2, 0], [0, 0, 0], 1, true); P(g, cg(ph * 0.6, ph * 0.6, 0.02, 16), mat(0x3a2414), [0, ph - 0.01, 0]); P(g, cg(ph * 0.66, ph * 0.66, 0.025, 16), mat(shade(pot, 0.8)), [0, ph - 0.01, 0]);
  const gm = [0x2f8a3a, 0x3fa050, 0x2a7a46, 0x57b05a];
  if (kind === 'cactus') { P(g, cg(0.09, 0.1, h * 0.7, 12), mat(0x3a9a5a, { rough: 0.7 }), [0, ph + h * 0.35, 0], [0, 0, 0], 1, true); P(g, sg(0.09, 12, 8), mat(0x3a9a5a), [0, ph + h * 0.7, 0]); for (const s of [-1, 1]) { P(g, cg(0.045, 0.05, h * 0.25, 10), mat(0x3a9a5a), [s * 0.13, ph + h * 0.3 + (s > 0 ? 0.1 : 0), 0], [0, 0, 0]); P(g, sg(0.045, 8, 6), mat(0x3a9a5a), [s * 0.13, ph + h * 0.3 + h * 0.125 + (s > 0 ? 0.1 : 0), 0]); } P(g, sg(0.03, 6, 5), mat(0xff6a9a), [0, ph + h * 0.78, 0]); }
  else if (kind === 'succulent') { for (let i = 0; i < 12; i++) { const a = i * 2.4, rr2 = 0.05 + (i % 4) * 0.02; P(g, sg(0.06, 8, 6), mat(shade(0x6ab08a, 0.85 + (i % 3) * 0.1)), [Math.cos(a) * rr2, ph + 0.05 + (i % 4) * 0.02, Math.sin(a) * rr2], [0.5, -a, 0], [0.7, 1.4, 0.4]); } }
  else if (kind === 'tree') { P(g, cg(0.03, 0.045, h * 0.55, 8), mat(0x6a4a2a), [0, ph + h * 0.27, 0], [0, 0, 0], 1, true); for (let i = 0; i < 14; i++) { const l = P(g, sg(0.17, 10, 8), mat(r.pick(gm), { rough: 0.8 }), [(r() - 0.5) * 0.5, ph + h * (0.5 + r() * 0.45), (r() - 0.5) * 0.5], [0, 0, 0], r.range(0.7, 1.2), true); leaves.push([l, r() * 6]); } }
  else { const n = kind === 'fern' ? 14 : 9; for (let i = 0; i < n; i++) { const a = i * 2.39996 + r() * 0.3, L = h * r.range(0.5, 0.85); const st = new THREE.Group(); st.rotation.y = a; st.position.y = ph; g.add(st); const tilt = 0.35 + r() * 0.5; const arm = new THREE.Group(); arm.rotation.z = -tilt; st.add(arm); P(arm, cg(0.008, 0.01, L * 0.8, 5), mat(0x3a7a2a), [0, L * 0.4, 0]); const leaf = P(arm, sg(kind === 'fern' ? 0.07 : 0.12, 12, 8), mat(r.pick(gm), { rough: 0.7, side: THREE.DoubleSide }), [kind === 'fern' ? 0 : 0.05, L * 0.85, 0], [0, 0, kind === 'fern' ? 0 : -0.3], kind === 'fern' ? [0.5, 3.3, 0.4] : [1, 1.2, 0.18], true); leaves.push([arm, r() * 6, tilt]); } }
  g.userData.update = (t) => leaves.forEach(([o, p, tilt]) => { if (tilt === undefined) { o.rotation.z = Math.sin(t * 1.1 + p) * sway; } else { o.rotation.z = -tilt + Math.sin(t * 1.2 + p) * sway; } });
  g.userData.update(0.6); g.userData.realHeightM = ph + h; return g;
}
export function hangingPlant({ drop = 0.8, seed = 1 } = {}) {
  const g = new THREE.Group(), r = rng(seed); const sw = new THREE.Group(); g.add(sw); const vines = [];
  for (const a of [0, 2.1, 4.2]) tube(sw, [[0, 0, 0], [Math.cos(a) * 0.1, -drop * 0.5, Math.sin(a) * 0.1], [Math.cos(a) * 0.17, -drop, Math.sin(a) * 0.17]], 0.004, 0xc8b890, { seg: 6, sides: 3 });
  P(sw, new THREE.CylinderGeometry(0.2, 0.13, 0.16, 16), mat(0xe8e0d0, { rough: 0.6 }), [0, -drop - 0.06, 0]);
  for (let i = 0; i < 10; i++) { const a = i * 0.63, L = 0.25 + r() * 0.5; const v = new THREE.Group(); v.position.set(Math.cos(a) * 0.15, -drop, Math.sin(a) * 0.15); sw.add(v); P(v, cg(0.006, 0.006, L, 4), mat(0x3a7a2a), [0, -L / 2, 0]); for (let k = 0; k < 4; k++) P(v, sg(0.04, 8, 6), mat(0x3fa050), [0, -k * L / 4 - 0.04, 0], [0, a, 0], [1, 0.4, 1.4]); vines.push([v, r() * 6]); }
  g.userData.update = (t) => { sw.rotation.z = Math.sin(t * 0.8) * 0.012; vines.forEach(([v, p]) => { v.rotation.z = Math.sin(t * 1.4 + p) * 0.08; v.rotation.x = Math.cos(t * 1.1 + p) * 0.06; }); }; return g;
}
export function flowerVase(color = 0xff5c8a, { seed = 1 } = {}) {
  const g = new THREE.Group(), r = rng(seed); P(g, cg(0.05, 0.065, 0.2, 14), mat(0x6ab0d8, { rough: 0.2, opacity: 0.85 }), [0, 0.1, 0], [0, 0, 0], 1, true);
  for (let i = 0; i < 7; i++) { const a = i * 0.9, t = 0.15 + r() * 0.2, L = 0.25 + r() * 0.18; const s = new THREE.Group(); s.rotation.set(Math.sin(a) * t, 0, Math.cos(a) * t); s.position.y = 0.16; g.add(s); P(s, cg(0.005, 0.005, L, 4), mat(0x3a7a2a), [0, L / 2, 0]); P(s, sg(0.04, 10, 8), mat(i % 3 ? color : 0xffd23f, { rough: 0.6 }), [0, L, 0], [0, 0, 0], [1, 0.7, 1]); P(s, sg(0.015, 6, 5), mat(0xffd23f), [0, L + 0.02, 0]); }
  return g;
}

// ---------- small living details ----------
export function bookStack(n = 4, { seed = 1, w = 0.2 } = {}) { const g = new THREE.Group(), r = rng(seed); let y = 0; for (let i = 0; i < n; i++) { const th = r.range(0.025, 0.05); P(g, bg(w * r.range(0.85, 1.1), th, w * 1.35 * r.range(0.85, 1.05)), mat(r.pick(PAL), { rough: 0.8 }), [(r() - 0.5) * 0.02, y + th / 2, 0], [0, (r() - 0.5) * 0.5, 0]); y += th; } g.userData.topY = y; return g; }
export function globe(r = 0.14) {
  const g = new THREE.Group(); P(g, cg(r * 0.8, r * 0.9, 0.025, 14), mat(0x3a2a1a), [0, 0.012, 0]); P(g, cg(0.008, 0.008, r * 1.7, 6), mat(0x3a2a1a), [0, r * 0.9, 0]);
  const sp = new THREE.Group(); sp.position.y = r * 1.1; sp.rotation.z = 0.41; g.add(sp); const gm = new THREE.Group(); sp.add(gm);
  P(gm, sg(r, 24, 16), mat(0x3a8ad0, { rough: 0.4 }), [0, 0, 0], [0, 0, 0], 1, true); const rr = rng(4); for (let i = 0; i < 8; i++) { const th = rr() * TAU, ph2 = (rr() - 0.5) * 2.2; P(gm, sg(r * rr.range(0.18, 0.34), 8, 6), mat(0x4aa860), [Math.cos(th) * Math.cos(ph2) * r * 0.9, Math.sin(ph2) * r * 0.9, Math.sin(th) * Math.cos(ph2) * r * 0.9], [0, 0, 0], [1, 1, 0.3]).lookAt(0, 0, 0); }
  g.userData.update = (t) => { gm.rotation.y = t * 0.6; }; g.userData.update(0.6); return g;
}
export function fishTank(w = 0.8, h = 0.45, d = 0.35, { fish = 5, seed = 1, water = 0x7ac8f0 } = {}) {
  const g = new THREE.Group(), r = rng(seed); P(g, rg(w + 0.04, 0.04, d + 0.04, 0.01), mat(0x20262e), [0, 0.02, 0]); P(g, rg(w + 0.04, 0.03, d + 0.04, 0.01), mat(0x20262e), [0, h + 0.05, 0]);
  P(g, bg(w, h, d), new THREE.MeshStandardMaterial({ color: water, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }), [0, 0.04 + h / 2, 0]); P(g, bg(w - 0.02, 0.04, d - 0.02), mat(0xe8d49a, { rough: 1 }), [0, 0.06, 0]);
  for (let i = 0; i < 5; i++) { const s = P(g, new THREE.ConeGeometry(0.025, 0.1 + r() * 0.12, 5), mat(r.pick([0x3fa060, 0x2a8a4a]), { rough: 0.7 }), [(r() - 0.5) * w * 0.8, 0.1 + 0.06, (r() - 0.5) * d * 0.6]); }
  P(g, sg(0.05, 10, 8), mat(0x8a8a90), [w * 0.25, 0.1, 0.02], [0, 0, 0], [1.4, 0.8, 1]);
  const fs = []; const cols = [0xff8a2b, 0xffd23f, 0xff5c8a, 0x6ad0ff];
  for (let i = 0; i < fish; i++) { const f = new THREE.Group(); P(f, sg(0.035, 10, 8), mat(cols[i % 4], { rough: 0.4 }), [0, 0, 0], [0, 0, 0], [1.5, 1, 0.6]); const tl = P(f, new THREE.ConeGeometry(0.03, 0.05, 4), mat(cols[i % 4]), [-0.06, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.3]); P(f, sg(0.007, 5, 4), mat(0x111111), [0.04, 0.01, 0.02]); g.add(f); fs.push([f, tl, r() * 6, r.range(0.12, 0.26), 0.08 + r() * (h - 0.14)]); }
  const bub = []; for (let i = 0; i < 6; i++) bub.push(P(g, sg(0.008, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }), [0, 0, 0]));
  g.userData.update = (t) => { fs.forEach(([f, tl, p, sp, y0]) => { const ph = t * sp + p; const x = Math.sin(ph) * (w * 0.4), z = Math.sin(ph * 0.7 + p) * d * 0.3; f.position.set(x, 0.08 + y0 + Math.sin(ph * 2) * 0.02, z); f.rotation.y = Math.cos(ph) > 0 ? 0 : Math.PI; f.rotation.z = Math.sin(ph * 2) * 0.05; tl.rotation.y = Math.sin(t * 9 + p) * 0.5; });
    bub.forEach((b, i) => { const ph = (t * 0.25 + i / 6) % 1; b.position.set(w * 0.3 + Math.sin(ph * 9 + i) * 0.01, 0.1 + ph * h * 0.9, 0.03); }); };
  g.userData.update(0.6); g.userData.realWidthM = w; return g;
}
export function fishBowl(r = 0.14) { const g = new THREE.Group(); P(g, sg(r, 18, 14), new THREE.MeshStandardMaterial({ color: 0x9adcff, transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }), [0, r, 0]); P(g, sg(r * 0.92, 18, 10, 0, TAU, Math.PI * 0.35, Math.PI * 0.65), new THREE.MeshStandardMaterial({ color: 0x7ac8f0, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }), [0, r, 0]); const f = new THREE.Group(); P(f, sg(0.03, 10, 8), mat(0xff8a2b), [0, 0, 0], [0, 0, 0], [1.5, 1, 0.6]); const tl = P(f, new THREE.ConeGeometry(0.025, 0.04, 4), mat(0xff8a2b), [-0.05, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.3]); g.add(f);
  g.userData.update = (t) => { const a = t * 0.9; f.position.set(Math.cos(a) * r * 0.5, r * 0.95 + Math.sin(t * 1.7) * 0.02, Math.sin(a) * r * 0.5); f.rotation.y = -a + Math.PI; tl.rotation.y = Math.sin(t * 9) * 0.5; }; g.userData.update(0.6); return g; }
export function mirror(w = 0.6, h = 1.6, { frame = 0xc9a062, round = false } = {}) { const g = new THREE.Group(); if (round) { P(g, new THREE.TorusGeometry(w / 2, 0.035, 8, 32), mat(frame, { metal: 0.3, rough: 0.5 }), [0, 0, 0.02]); P(g, new THREE.CircleGeometry(w / 2, 32), mat(0xdfeff8, { metal: 0.9, rough: 0.08 }), [0, 0, 0.012]); } else { const t = 0.04; P(g, bg(w + 2 * t, t, 0.05), mat(frame, { rough: 0.5 }), [0, h / 2 + t / 2, 0.02]); P(g, bg(w + 2 * t, t, 0.05), mat(frame, { rough: 0.5 }), [0, -h / 2 - t / 2, 0.02]); for (const s of [-1, 1]) P(g, bg(t, h, 0.05), mat(frame, { rough: 0.5 }), [s * (w / 2 + t / 2), 0, 0.02]); P(g, bg(w, h, 0.01), mat(0xdfeff8, { metal: 0.9, rough: 0.08 }), [0, 0, 0.008]); } return g; }
export function wallShelf(w = 0.9, { seed = 1, items = 'mixed' } = {}) { const g = new THREE.Group(), r = rng(seed); P(g, rg(w, 0.035, 0.22, 0.01), mat(COL.woodL, { rough: 0.6 }), [0, 0, 0.11], [0, 0, 0], 1, true); for (const s of [-1, 1]) P(g, bg(0.025, 0.1, 0.02), mat(0x2a2a30), [s * w * 0.4, -0.06, 0.02]);
  let x = -w / 2 + 0.08; while (x < w / 2 - 0.1) { const k = r(); if (k < 0.5) { const bw = r.range(0.03, 0.05), bh = r.range(0.15, 0.24); P(g, bg(bw, bh, 0.14), mat(r.pick(PAL), { rough: 0.8 }), [x + bw / 2, bh / 2 + 0.018, 0.11], [0, 0, r() < 0.1 ? 0.15 : 0]); x += bw + 0.003; } else if (k < 0.7) { P(g, sg(0.045, 10, 8), mat(r.pick(PAL), { rough: 0.4 }), [x + 0.05, 0.065, 0.11]); x += 0.12; } else if (k < 0.85) { const pl = plant({ kind: 'succulent', h: 0.2, seed: Math.floor(r() * 99) }); pl.scale.setScalar(0.55); pl.position.set(x + 0.08, 0.017, 0.11); g.add(pl); x += 0.2; } else { P(g, rg(0.1, 0.12, 0.1, 0.02), mat(r.pick(PAL), { rough: 0.5 }), [x + 0.06, 0.077, 0.11]); x += 0.16; } } return g; }
export function bulletinBoard(w = 1.2, h = 0.8, { seed = 1 } = {}) { const g = new THREE.Group(), r = rng(seed); P(g, rg(w + 0.06, h + 0.06, 0.04, 0.02), mat(0x8a5a2e), [0, 0, 0.02]); P(g, bg(w, h, 0.012), mat(0xc89a62, { rough: 1 }), [0, 0, 0.044]);
  for (let i = 0; i < 9; i++) { const pw = r.range(0.14, 0.26), ph = r.range(0.14, 0.24); const p = P(g, bg(pw, ph, 0.004), mat(r.pick([0xffffff, 0xfff3a0, 0xffc8d8, 0xc8e8ff]), { rough: 0.9 }), [(r() - 0.5) * (w - 0.3), (r() - 0.5) * (h - 0.25), 0.052 + i * 0.0006], [0, 0, (r() - 0.5) * 0.15]); for (let l = 0; l < 3; l++) P(p, bg(pw * 0.7, 0.008, 0.002), mat(0x556), [0, ph * (0.25 - l * 0.22), 0.003]); P(p, sg(0.012, 6, 5), mat(r.pick([0xe04a3a, 0x3a78d0])), [0, ph * 0.43, 0.006]); } return g; }
export function coatRack(seed = 1) { const g = new THREE.Group(), r = rng(seed); P(g, cg(0.17, 0.19, 0.03, 16), mat(0x2a2a30), [0, 0.015, 0]); P(g, cg(0.02, 0.02, 1.7, 8), mat(0x2a2a30, { metal: 0.5 }), [0, 0.85, 0], [0, 0, 0], 1, true); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; P(g, cg(0.012, 0.012, 0.18, 6), mat(0x2a2a30), [Math.cos(a) * 0.08, 1.68, Math.sin(a) * 0.08], [Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0]); } const c = r.pick(PAL); P(g, rg(0.34, 0.6, 0.13, 0.05), mat(c, { rough: 0.9 }), [0.1, 1.3, 0.04], [0, 0, 0.05], 1, true); P(g, cg(0.17, 0.17, 0.1, 14), mat(0x4a3a2a), [-0.1, 1.76, 0]); return g; }
// pets (animal rig): kind 'cat' | 'dog'; pose 'sleep' | 'loaf' | 'sit' | 'stand'
export function pet(kind = 'cat', { pose = 'sleep', fur = 0x8a8a92, stripe = 0x5a5a66, belly = 0xf0ece4, scale = 1, seed = 3 } = {}) {
  const a = makeAnimal(kind, kind === 'cat' ? { ...ANIMALS.gerald, fur, stripe, belly, scale, seed, socks: false } : { ...ANIMALS.dog, fur, stripe, scale, seed });
  const g = new THREE.Group(); g.add(a.root); const pf = APOSES[pose] ?? APOSES.sleep;
  g.userData.update = (t) => { CLOCK.t = t; a.pose(pf(t)); a.face(pose === 'sleep' ? AFACES.closed : AFACES.sleepy); };
  g.userData.update(0.6); g.userData.animal = a; return g;
}
export { castAll };
