// INTERIORS pack: furniture kit at real scale (metres, origin on the floor, front = +Z). Beds, seating, tables, desks, storage, filled shelves.
// Each builder returns a Group; userData.seatY / topY give the seat / surface height; realHeightM on big pieces.
import * as THREE from 'three';
import { P, bg, rg, cg, sg, grp, inst, tube, withUpdate, PAL, COL, castAll } from './interiors_core.js';
import { mat, glow, rng, shade } from '../util.js';

const TAU = Math.PI * 2;
const wood = (c = COL.wood) => mat(c, { rough: 0.6 });

// ---------- beds ----------
export function bed({ size = 'single', color = 0x3a78d0, frame = COL.wood, seed = 1, pillows = 2, messy = 0.6, headboard = 'panel' } = {}) {
  const g = new THREE.Group(), r = rng(seed + 5); const W = size === 'double' ? 1.55 : size === 'kid' ? 0.8 : 0.98, L = size === 'kid' ? 1.6 : 2.0;
  P(g, rg(W + 0.08, 0.26, L + 0.06, 0.04), wood(frame), [0, 0.2, 0], [0, 0, 0], 1, true);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(g, bg(0.07, 0.14, 0.07), wood(shade(frame, 0.8)), [sx * (W / 2 - 0.0), 0.07, sz * (L / 2 - 0.02)]);
  P(g, rg(W, 0.2, L, 0.07), mat(0xf6f1e6, { rough: 0.9 }), [0, 0.43, 0], [0, 0, 0], 1, true);                         // mattress
  // headboard + footboard
  const hbH = headboard === 'tall' ? 1.2 : 0.85;
  P(g, rg(W + 0.08, hbH, 0.06, 0.03), wood(shade(frame, 0.9)), [0, hbH / 2 + 0.05, -L / 2 - 0.03], [0, 0, 0], 1, true);
  if (headboard === 'tall') for (let i = 0; i < 5; i++) P(g, bg(0.02, 0.5, 0.02), wood(shade(frame, 0.75)), [-W / 2 + 0.1 + i * (W - 0.2) / 4, 0.95, -L / 2 - 0.0]);
  P(g, rg(W + 0.08, 0.38, 0.06, 0.03), wood(shade(frame, 0.9)), [0, 0.29, L / 2 + 0.03], [0, 0, 0], 1, true);
  // duvet: slab with a turned-down fold + side drape
  const dm = mat(color, { rough: 0.95 }), dm2 = mat(shade(color, 0.82), { rough: 0.95 });
  P(g, rg(W + 0.06, 0.1, L * 0.7, 0.045), dm, [0, 0.58, L * 0.12], [messy * 0.03, 0, messy * 0.02], 1, true);
  P(g, rg(W + 0.08, 0.13, 0.3, 0.06), dm2, [0, 0.59, -L * 0.2 + 0.0], [0, 0, 0]);                                        // turned-down top fold
  for (const s of [-1, 1]) P(g, rg(0.08, 0.3, L * 0.66, 0.035), dm, [s * (W / 2 + 0.03), 0.44, L * 0.13], [0, 0, s * 0.1]);   // drape over the sides
  P(g, rg(W * 0.7, 0.05, L * 0.35, 0.025), dm2, [(r() - 0.5) * 0.1, 0.65, L * 0.3], [messy * 0.05, (r() - 0.5) * 0.3, 0]);   // rumpled ridge
  // pillows
  const pc = [0xffffff, 0xfff3c4, 0xffd0dc, shade(color, 1.25)];
  for (let i = 0; i < pillows; i++) { const px = pillows === 1 ? 0 : (i / (pillows - 1) - 0.5) * (W - 0.4); P(g, rg(Math.min(0.55, W / pillows - 0.05), 0.12, 0.38, 0.06), mat(pc[(i + seed) % 4], { rough: 0.9 }), [px, 0.58 + 0.04 * i * 0, -L / 2 + 0.26], [-0.18, (r() - 0.5) * 0.25, (r() - 0.5) * 0.08], 1, true); }
  g.userData.seatY = 0.55; g.userData.topY = 0.6; g.userData.realWidthM = W; g.userData.realHeightM = hbH + 0.05; g.userData.size = [W, L];
  return g;
}
export function bunkBed({ color = 0xe04a3a, color2 = 0x3a78d0, frame = 0xc99a62, seed = 2 } = {}) {
  const g = new THREE.Group(); const W = 0.98, L = 2.0, H = 1.75;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(g, bg(0.07, H + 0.2, 0.07), wood(frame), [sx * (W / 2 + 0.03), (H + 0.2) / 2, sz * (L / 2 + 0.03)], [0, 0, 0], 1, true);
  for (const y of [0.3, H - 0.1]) { P(g, rg(W + 0.04, 0.07, L + 0.04, 0.02), wood(frame), [0, y, 0], [0, 0, 0], 1, true); P(g, rg(W - 0.02, 0.17, L - 0.04, 0.06), mat(0xf6f1e6, { rough: 0.9 }), [0, y + 0.12, 0]); }
  P(g, rg(W + 0.02, 0.1, L * 0.7, 0.04), mat(color, { rough: 0.95 }), [0, 0.48, 0.2], [0, 0, 0.02], 1, true); P(g, rg(W + 0.02, 0.1, L * 0.7, 0.04), mat(color2, { rough: 0.95 }), [0, H + 0.08, 0.2], [0, 0, -0.02], 1, true);
  P(g, rg(0.5, 0.12, 0.34, 0.06), mat(0xffffff), [0, 0.5, -L / 2 + 0.25], [-0.15, 0.1, 0]); P(g, rg(0.5, 0.12, 0.34, 0.06), mat(0xfff3c4), [0.1, H + 0.1, -L / 2 + 0.25], [-0.15, -0.1, 0]);
  for (let i = 0; i < 4; i++) P(g, bg(W * 0.9, 0.04, 0.03), wood(frame), [0, H + 0.12 + (i % 2) * 0.12, L / 2 + 0.03], [0, 0, 0]);
  P(g, bg(0.04, 0.32, L * 0.5), wood(frame), [W / 2 + 0.03, H + 0.18, 0.4]);
  // ladder
  for (let i = 0; i < 6; i++) P(g, bg(0.52, 0.035, 0.04), wood(frame), [0.0, 0.2 + i * 0.3, L / 2 + 0.13], [0.0, 0, 0]);
  for (const s of [-1, 1]) P(g, bg(0.04, H, 0.04), wood(frame), [s * 0.27, H / 2 + 0.1, L / 2 + 0.13], [0.0, 0, 0]);
  g.userData.realHeightM = H + 0.3; g.userData.seatY = 0.55; return castAll(g);
}
export function cot({ color = 0xffd0dc } = {}) { const g = new THREE.Group(); P(g, rg(0.7, 0.05, 1.25, 0.02), wood(0xf2ead8), [0, 0.35, 0], [0, 0, 0], 1, true); P(g, rg(0.64, 0.1, 1.18, 0.04), mat(color, { rough: 0.95 }), [0, 0.43, 0]); for (let i = 0; i < 14; i++) for (const s of [-1, 1]) P(g, cg(0.008, 0.008, 0.5, 5), wood(0xf2ead8), [s * 0.34, 0.62, -0.58 + i * 0.09]); for (const s of [-1, 1]) P(g, bg(0.03, 0.03, 1.25), wood(0xf2ead8), [s * 0.34, 0.88, 0]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(g, bg(0.04, 0.35, 0.04), wood(0xf2ead8), [sx * 0.33, 0.17, sz * 0.6]); return g; }

// ---------- seating ----------
export function sofa({ seats = 3, color = 0x3f6fb5, cushions = true, throwColor = 0xffd23f, seed = 1 } = {}) {
  const g = new THREE.Group(), r = rng(seed); const W = seats === 2 ? 1.7 : seats === 3 ? 2.2 : 2.9, m = mat(color, { rough: 0.9 }), d = mat(shade(color, 0.78), { rough: 0.9 });
  P(g, rg(W, 0.4, 0.95, 0.1), d, [0, 0.22, 0], [0, 0, 0], 1, true);
  const sw = (W - 0.5) / seats; for (let i = 0; i < seats; i++) P(g, rg(sw - 0.012, 0.17, 0.78, 0.07), m, [(i - (seats - 1) / 2) * sw, 0.48, 0.08], [0, 0, 0], 1, true);
  P(g, rg(W, 0.66, 0.26, 0.1), d, [0, 0.7, -0.36], [0, 0, 0], 1, true);
  for (let i = 0; i < seats; i++) P(g, rg(sw - 0.02, 0.46, 0.17, 0.08), m, [(i - (seats - 1) / 2) * sw, 0.78, -0.23], [-0.14, 0, 0], 1, true);
  for (const s of [-1, 1]) P(g, rg(0.25, 0.62, 0.95, 0.1), d, [s * (W / 2 - 0.125), 0.42, 0], [0, 0, 0], 1, true);
  for (const s of [-1, 1]) for (const z of [-0.38, 0.38]) P(g, cg(0.035, 0.028, 0.09, 8), mat(0x3a2a1a), [s * (W / 2 - 0.1), 0.045, z]);
  if (cushions) { const cs = [0xffd23f, 0xff7a8a, 0xf6ecd5, 0x3fa060]; P(g, rg(0.42, 0.4, 0.13, 0.06), mat(cs[seed % 4], { rough: 0.9 }), [-W / 2 + 0.52, 0.76, -0.1], [-0.2, 0.25, 0.08], 1, true); P(g, rg(0.4, 0.38, 0.13, 0.06), mat(cs[(seed + 1) % 4], { rough: 0.9 }), [W / 2 - 0.5, 0.75, -0.1], [-0.2, -0.3, -0.1], 1, true); P(g, rg(0.36, 0.3, 0.12, 0.06), mat(cs[(seed + 2) % 4], { rough: 0.9 }), [-W / 2 + 0.82, 0.69, -0.03], [-0.3, 0.1, 0.5]); }
  P(g, rg(0.7, 0.05, 0.5, 0.025), mat(throwColor, { rough: 1 }), [W * 0.2, 0.585, 0.12], [0.0, 0.2, 0.0]); P(g, rg(0.2, 0.32, 0.45, 0.07), mat(throwColor, { rough: 1 }), [W / 2 - 0.13, 0.78, 0.1], [0, 0, -0.1]);
  g.userData.seatY = 0.52; g.userData.realWidthM = W; g.userData.realHeightM = 0.98; return g;
}
export function armchair({ color = 0x6aa86a, seed = 1 } = {}) {
  const g = new THREE.Group(), m = mat(color, { rough: 0.9 }), d = mat(shade(color, 0.82), { rough: 0.9 });
  P(g, rg(0.95, 0.4, 0.9, 0.1), d, [0, 0.21, 0], [0, 0, 0], 1, true); P(g, rg(0.66, 0.16, 0.72, 0.07), m, [0, 0.47, 0.06], [0, 0, 0], 1, true); P(g, rg(0.95, 0.7, 0.22, 0.1), d, [0, 0.68, -0.34], [0, 0, 0], 1, true); P(g, rg(0.64, 0.46, 0.15, 0.08), m, [0, 0.74, -0.22], [-0.14, 0, 0]);
  for (const s of [-1, 1]) { P(g, rg(0.18, 0.55, 0.9, 0.08), d, [s * 0.42, 0.4, 0], [0, 0, 0], 1, true); P(g, cg(0.03, 0.025, 0.1, 8), mat(0x3a2a1a), [s * 0.38, 0.05, 0.34]); P(g, cg(0.03, 0.025, 0.1, 8), mat(0x3a2a1a), [s * 0.38, 0.05, -0.34]); }
  g.userData.seatY = 0.5; g.userData.realHeightM = 0.95; return g;
}
export function beanBag(color = 0xff7a3a) { const g = new THREE.Group(); P(g, sg(0.5, 20, 14), mat(color, { rough: 0.95 }), [0, 0.3, 0], [0, 0, 0], [1, 0.62, 1], true); P(g, sg(0.32, 14, 10), mat(shade(color, 0.85), { rough: 0.95 }), [0, 0.42, -0.25], [0.5, 0, 0], [1, 0.8, 1], true); P(g, bg(0.12, 0.012, 0.05), mat(shade(color, 0.7)), [0.3, 0.52, 0.2]); g.userData.seatY = 0.32; return g; }
export function ottoman(color = 0xc8504a, r = 0.32) { const g = new THREE.Group(); P(g, cg(r, r, 0.38, 20), mat(color, { rough: 0.9 }), [0, 0.19, 0], [0, 0, 0], 1, true); P(g, sg(r, 16, 8, 0, TAU, 0, 1.2), mat(shade(color, 1.1), { rough: 0.9 }), [0, 0.37, 0], [0, 0, 0], [1, 0.25, 1]); g.userData.seatY = 0.42; return g; }
export function stool(h = 0.45, { color = COL.wood, seat = 0.2, top = 0xe04a3a } = {}) { const g = new THREE.Group(); P(g, cg(seat, seat, 0.06, 18), mat(top, { rough: 0.5 }), [0, h, 0], [0, 0, 0], 1, true); for (const a of [0, 1, 2]) { const t = a * TAU / 3; P(g, cg(0.016, 0.02, h, 6), mat(color, { metal: 0.3, rough: 0.5 }), [Math.cos(t) * seat * 0.7, h / 2, Math.sin(t) * seat * 0.7], [Math.sin(t) * 0.12, 0, -Math.cos(t) * 0.12]); } P(g, tor0(seat * 0.7), mat(color, { metal: 0.3 }), [0, h * 0.35, 0], [Math.PI / 2, 0, 0]); g.userData.seatY = h + 0.03; return g; }
const tor0 = (R) => new THREE.TorusGeometry(R, 0.01, 5, 18);
export function chair({ kind = 'dining', color = COL.wood, seat = 0xe0a040, seed = 1 } = {}) {
  const g = new THREE.Group(); const wm = mat(color, { rough: 0.6 });
  if (kind === 'office') {
    const sw = new THREE.Group(); g.add(sw); P(sw, rg(0.5, 0.09, 0.48, 0.045), mat(seat, { rough: 0.8 }), [0, 0.5, 0], [0, 0, 0], 1, true); P(sw, rg(0.46, 0.5, 0.09, 0.05), mat(seat, { rough: 0.8 }), [0, 0.82, -0.23], [-0.1, 0, 0], 1, true); P(sw, rg(0.3, 0.09, 0.06, 0.03), mat(0x2a2a30), [0, 1.12, -0.26], [-0.1, 0, 0]);
    for (const s of [-1, 1]) { P(sw, bg(0.03, 0.2, 0.03), mat(0x2a2a30), [s * 0.25, 0.62, 0]); P(sw, rg(0.06, 0.03, 0.28, 0.012), mat(0x2a2a30), [s * 0.25, 0.73, 0.02]); }
    P(g, cg(0.03, 0.03, 0.4, 8), mat(0x555a66, { metal: 0.6 }), [0, 0.28, 0], [0, 0, 0], 1, true); for (let i = 0; i < 5; i++) { const a = i * TAU / 5; P(g, bg(0.3, 0.025, 0.045), mat(0x2a2a30), [Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15], [0, -a, 0]); P(g, sg(0.03, 8, 6), mat(0x15151c), [Math.cos(a) * 0.3, 0.035, Math.sin(a) * 0.3]); }
    g.userData.swivel = sw; g.userData.seatY = 0.52;
  } else if (kind === 'school') {
    P(g, rg(0.42, 0.04, 0.4, 0.02), mat(0xe0a040, { rough: 0.5 }), [0, 0.44, 0.02], [0, 0, 0], 1, true); P(g, rg(0.4, 0.2, 0.03, 0.015), mat(0xe0a040, { rough: 0.5 }), [0, 0.7, -0.19], [-0.08, 0, 0], 1, true);
    for (const sx of [-1, 1]) { P(g, cg(0.012, 0.012, 0.44, 6), mat(0x555a66, { metal: 0.6 }), [sx * 0.19, 0.22, 0.18]); P(g, cg(0.012, 0.012, 0.7, 6), mat(0x555a66, { metal: 0.6 }), [sx * 0.19, 0.35, -0.18], [0, 0, 0]); } P(g, bg(0.4, 0.02, 0.02), mat(0x555a66, { metal: 0.6 }), [0, 0.2, 0.18]); P(g, bg(0.4, 0.02, 0.02), mat(0x555a66, { metal: 0.6 }), [0, 0.2, -0.18]);
    g.userData.seatY = 0.46;
  } else if (kind === 'folding') {
    P(g, rg(0.42, 0.025, 0.4, 0.01), mat(0x8a8e98, { metal: 0.3 }), [0, 0.45, 0], [0, 0, 0], 1, true); P(g, rg(0.4, 0.2, 0.02, 0.01), mat(0x8a8e98, { metal: 0.3 }), [0, 0.7, -0.2], [-0.08, 0, 0]); for (const s of [-1, 1]) { P(g, cg(0.01, 0.01, 0.6, 5), mat(0x333840, { metal: 0.6 }), [s * 0.19, 0.22, 0.12], [0.2, 0, 0]); P(g, cg(0.01, 0.01, 0.6, 5), mat(0x333840, { metal: 0.6 }), [s * 0.19, 0.22, -0.12], [-0.2, 0, 0]); } g.userData.seatY = 0.46;
  } else if (kind === 'bar') {
    P(g, cg(0.19, 0.19, 0.06, 20), mat(seat, { rough: 0.4 }), [0, 0.72, 0], [0, 0, 0], 1, true); P(g, cg(0.025, 0.025, 0.7, 8), mat(0xc8ccd6, { metal: 0.8, rough: 0.2 }), [0, 0.36, 0]); P(g, cg(0.2, 0.22, 0.03, 18), mat(0xc8ccd6, { metal: 0.8, rough: 0.2 }), [0, 0.015, 0]); P(g, new THREE.TorusGeometry(0.17, 0.012, 6, 20), mat(0xc8ccd6, { metal: 0.8 }), [0, 0.3, 0], [Math.PI / 2, 0, 0]);
    g.userData.seatY = 0.75;
  } else { // dining
    P(g, rg(0.46, 0.05, 0.44, 0.02), mat(seat, { rough: 0.7 }), [0, 0.45, 0], [0, 0, 0], 1, true);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(g, bg(0.04, sz < 0 ? 0.9 : 0.45, 0.04), wm, [sx * 0.2, sz < 0 ? 0.45 : 0.225, sz * 0.19], [0, 0, 0], 1, true);
    for (let i = 0; i < 3; i++) P(g, bg(0.36, 0.045, 0.02), wm, [0, 0.62 + i * 0.1, -0.19]); P(g, rg(0.44, 0.08, 0.025, 0.012), wm, [0, 0.9, -0.19]);
    P(g, rg(0.46, 0.04, 0.04, 0.015), wm, [0, 0.25, 0.19]);
    g.userData.seatY = 0.47;
  }
  if (g.userData.swivel) g.userData.update = (t) => { g.userData.swivel.rotation.y = Math.sin(t * 0.7 + seed) * 0.35; };
  return g;
}

// ---------- tables, desks ----------
export function table({ kind = 'dining', w = 1.6, d = 0.9, h = 0.75, color = COL.wood, top = null, cloth = null } = {}) {
  const g = new THREE.Group(), wm = mat(color, { rough: 0.55 }); const tm = top ? mat(top, { rough: 0.35 }) : wm;
  if (kind === 'round') {
    P(g, cg(w / 2, w / 2, 0.05, 32), tm, [0, h - 0.025, 0], [0, 0, 0], 1, true); P(g, cg(0.06, 0.08, h - 0.05, 12), wm, [0, (h - 0.05) / 2, 0], [0, 0, 0], 1, true); P(g, cg(0.28, 0.3, 0.04, 20), wm, [0, 0.02, 0]);
    if (cloth) P(g, new THREE.CylinderGeometry(w / 2 + 0.03, w / 2 + 0.1, 0.3, 32, 1, true), mat(cloth, { rough: 1, side: THREE.DoubleSide }), [0, h - 0.17, 0]);
  } else {
    P(g, rg(w, 0.05, d, 0.02), tm, [0, h - 0.025, 0], [0, 0, 0], 1, true); P(g, rg(w - 0.2, 0.08, d - 0.2, 0.015), wm, [0, h - 0.09, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(g, cg(0.035, 0.028, h - 0.05, 8), wm, [sx * (w / 2 - 0.08), (h - 0.05) / 2, sz * (d / 2 - 0.08)], [0, 0, 0], 1, true);
    if (cloth) { P(g, rg(w + 0.04, 0.012, d + 0.04, 0.005), mat(cloth, { rough: 1 }), [0, h + 0.006, 0]); for (const s of [-1, 1]) P(g, rg(0.012, 0.24, d + 0.04, 0.005), mat(cloth, { rough: 1 }), [s * (w / 2 + 0.02), h - 0.12, 0]); P(g, rg(w + 0.04, 0.24, 0.012, 0.005), mat(cloth, { rough: 1 }), [0, h - 0.12, d / 2 + 0.02]); P(g, rg(w + 0.04, 0.24, 0.012, 0.005), mat(cloth, { rough: 1 }), [0, h - 0.12, -d / 2 - 0.02]); }
  }
  g.userData.topY = h + (cloth ? 0.012 : 0); g.userData.realWidthM = w; return g;
}
export function coffeeTable(color = COL.wood) { const g = table({ kind: 'rect', w: 1.1, d: 0.6, h: 0.42, color }); P(g, rg(1.0, 0.03, 0.5, 0.01), mat(shade(color, 0.8)), [0, 0.12, 0]); return g; }
export function desk({ w = 1.4, d = 0.7, h = 0.75, color = 0xf0e4cc, accent = 0x3a78d0, drawers = 3, hutch = false, side = 1 } = {}) {
  const g = new THREE.Group(), dm = mat(color, { rough: 0.6 }), am = mat(accent, { rough: 0.5 });
  P(g, rg(w, 0.04, d, 0.015), dm, [0, h - 0.02, 0], [0, 0, 0], 1, true);
  P(g, rg(0.04, h - 0.04, d - 0.06, 0.01), dm, [-side * (w / 2 - 0.03), (h - 0.04) / 2, 0], [0, 0, 0], 1, true);   // panel leg on the open side
  const px = side * (w / 2 - 0.22); P(g, rg(0.4, h - 0.04, d - 0.06, 0.015), dm, [px, (h - 0.04) / 2, 0], [0, 0, 0], 1, true);
  for (let i = 0; i < drawers; i++) { const dh = (h - 0.14) / drawers; P(g, rg(0.36, dh - 0.02, 0.02, 0.01), am, [px, 0.06 + dh / 2 + i * dh, d / 2 - 0.03], [0, 0, 0]); P(g, bg(0.12, 0.018, 0.02), mat(0xdddddd, { metal: 0.7 }), [px, 0.06 + dh / 2 + i * dh, d / 2 - 0.01]); }
  P(g, bg(w - 0.08, 0.35, 0.02), dm, [0, h - 0.25, -d / 2 + 0.04]);
  if (hutch) { P(g, rg(w - 0.1, 0.03, 0.3, 0.01), dm, [0, h + 0.5, -d / 2 + 0.17]); P(g, rg(0.03, 0.55, 0.3, 0.01), dm, [-w / 2 + 0.08, h + 0.27, -d / 2 + 0.17]); P(g, rg(0.03, 0.55, 0.3, 0.01), dm, [w / 2 - 0.08, h + 0.27, -d / 2 + 0.17]); P(g, rg(w - 0.1, 0.03, 0.3, 0.01), dm, [0, h + 0.22, -d / 2 + 0.17]); }
  g.userData.topY = h; g.userData.realWidthM = w; return g;
}
export function schoolDesk({ color = 0xe0c898 } = {}) { const g = new THREE.Group(); P(g, rg(0.7, 0.03, 0.5, 0.012), mat(color, { rough: 0.5 }), [0, 0.74, 0], [0.05, 0, 0], 1, true); P(g, rg(0.66, 0.1, 0.44, 0.02), mat(0x7a8090, { metal: 0.4 }), [0, 0.6, 0]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(g, cg(0.013, 0.013, 0.74, 6), mat(0x555a66, { metal: 0.6 }), [sx * 0.32, 0.37, sz * 0.2]); g.userData.topY = 0.75; return g; }
export function wardrobe({ w = 1.2, h = 2.0, d = 0.55, color = 0xf2ead8, open = 0.3, seed = 1 } = {}) {
  const g = new THREE.Group(), r = rng(seed), wm = mat(color, { rough: 0.55 }), inner = mat(0x8a6a4a, { rough: 0.9 });
  P(g, bg(w, h, 0.02), wm, [0, h / 2, -d / 2 + 0.01], [0, 0, 0], 1, true);                       // back
  for (const s of [-1, 1]) P(g, bg(0.03, h, d), wm, [s * (w / 2 - 0.015), h / 2, 0], [0, 0, 0], 1, true);
  P(g, bg(w, 0.04, d), wm, [0, h - 0.02, 0], [0, 0, 0], 1, true); P(g, bg(w, 0.06, d), mat(shade(color, 0.7)), [0, 0.03, 0]);
  P(g, bg(w + 0.06, 0.04, d + 0.04), wm, [0, h + 0.02, 0.0]); P(g, bg(w - 0.06, h - 0.1, 0.01), inner, [0, h / 2, -d / 2 + 0.025]);
  P(g, bg(w - 0.06, 0.02, d - 0.04), wm, [0, h * 0.78, 0]);
  const cm = [0xe04a3a, 0x3a78d0, 0xffd23f, 0x3fa060, 0xf6ecd5, 0x8a5ad0, 0x15151c, 0xff7aa0];
  P(g, cg(0.012, 0.012, w - 0.1, 6), mat(0xc8ccd6, { metal: 0.8 }), [0, h * 0.74, 0.0], [0, 0, Math.PI / 2]);
  for (let i = 0; i < 10; i++) { const L = 0.75 - r() * 0.25; P(g, rg(0.05, L, 0.32, 0.02), mat(r.pick(cm), { rough: 0.95 }), [-w / 2 + 0.1 + i * (w - 0.2) / 9, h * 0.74 - L / 2 - 0.03, (r() - 0.5) * 0.04], [0, (r() - 0.5) * 0.15, (r() - 0.5) * 0.05]); }
  for (let i = 0; i < 4; i++) P(g, rg(w * 0.4, 0.07, 0.34, 0.03), mat(r.pick(cm), { rough: 1 }), [(i % 2 ? 1 : -1) * w * 0.22, 0.1 + 0.09 * Math.floor(i / 2) + 0.03, 0.0]);
  for (const s of [-1, 1]) { const dr = new THREE.Group(); dr.position.set(s * (w / 2 - 0.005), 0, d / 2 + 0.01); dr.rotation.y = s * open * 1.7; g.add(dr); P(dr, rg(w / 2 - 0.01, h - 0.08, 0.025, 0.012), mat(shade(color, 0.97), { rough: 0.55 }), [-s * (w / 4), h / 2, 0.0], [0, 0, 0], 1, true); P(dr, rg(w / 2 - 0.12, h - 0.24, 0.012, 0.01), wm, [-s * (w / 4), h / 2, 0.018]); P(dr, sg(0.022, 8, 6), mat(0xd8b040, { metal: 0.8 }), [-s * 0.05, h * 0.5, 0.04]); }
  g.userData.realHeightM = h; g.userData.realWidthM = w; return g;
}
export function dresser({ w = 1.1, h = 0.95, d = 0.5, drawers = 4, color = 0xc89a62, seed = 1, top = true } = {}) {
  const g = new THREE.Group(), r = rng(seed + 9), wm = mat(color, { rough: 0.55 });
  P(g, bg(w, h - 0.06, d), wm, [0, (h - 0.06) / 2 + 0.06, 0], [0, 0, 0], 1, true); P(g, rg(w + 0.04, 0.04, d + 0.04, 0.015), mat(shade(color, 1.1), { rough: 0.5 }), [0, h - 0.02, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(g, bg(0.05, 0.07, 0.05), wm, [sx * (w / 2 - 0.05), 0.035, sz * (d / 2 - 0.05)]);
  const dh = (h - 0.14) / drawers; for (let i = 0; i < drawers; i++) { P(g, rg(w - 0.06, dh - 0.02, 0.02, 0.01), mat(shade(color, 0.92 + (i % 2) * 0.05)), [0, 0.1 + dh / 2 + i * dh, d / 2 + 0.005]); P(g, bg(0.1, 0.02, 0.025), mat(0xd8b040, { metal: 0.7 }), [0, 0.1 + dh / 2 + i * dh, d / 2 + 0.025]); if (r() < 0.4) P(g, rg(0.2, 0.08, 0.03, 0.02), mat(r.pick(PAL), { rough: 0.95 }), [(r() - 0.5) * 0.5, 0.1 + dh * (i + 1) + 0.0, d / 2 + 0.0], [0, 0, (r() - 0.5) * 0.4]); }
  g.userData.topY = h; g.userData.realHeightM = h; return g;
}
export function nightstand({ color = 0xc89a62, h = 0.55 } = {}) { const g = new THREE.Group(); P(g, rg(0.45, h, 0.4, 0.02), mat(color, { rough: 0.55 }), [0, h / 2, 0], [0, 0, 0], 1, true); P(g, rg(0.4, 0.2, 0.02, 0.01), mat(shade(color, 0.9)), [0, h * 0.7, 0.2]); P(g, rg(0.4, 0.2, 0.02, 0.01), mat(shade(color, 0.9)), [0, h * 0.35, 0.2]); for (const y of [0.7, 0.35]) P(g, sg(0.02, 6, 5), mat(0xd8b040, { metal: 0.7 }), [0, h * y, 0.22]); g.userData.topY = h; return g; }
export function tvStand({ w = 1.6, color = 0xf2ead8 } = {}) { const g = new THREE.Group(), wm = mat(color, { rough: 0.5 }); P(g, rg(w, 0.45, 0.45, 0.03), wm, [0, 0.27, 0], [0, 0, 0], 1, true); for (const s of [-1, 1]) for (const z of [-1, 1]) P(g, cg(0.02, 0.015, 0.05, 6), mat(0x3a2a1a), [s * (w / 2 - 0.08), 0.025, z * 0.17]); for (const x of [-w / 4, w / 4]) P(g, rg(w / 2 - 0.1, 0.3, 0.02, 0.01), mat(shade(color, 0.9)), [x, 0.27, 0.23]); P(g, bg(w - 0.06, 0.02, 0.4), mat(shade(color, 0.7)), [0, 0.42, 0]); g.userData.topY = 0.5; return g; }
export function sideboard({ w = 1.6, h = 0.85, color = 0x7a5232, seed = 1 } = {}) { const g = new THREE.Group(), wm = mat(color, { rough: 0.55 }); P(g, rg(w, h, 0.48, 0.03), wm, [0, h / 2 + 0.05, 0], [0, 0, 0], 1, true); for (const s of [-1, 1]) for (const z of [-1, 1]) P(g, cg(0.025, 0.018, 0.1, 6), wm, [s * (w / 2 - 0.1), 0.05, z * 0.18]); for (let i = 0; i < 3; i++) { P(g, rg(w / 3 - 0.06, h - 0.2, 0.02, 0.01), mat(shade(color, 1.1)), [(i - 1) * w / 3, h / 2 + 0.05, 0.245]); P(g, sg(0.02, 6, 5), mat(0xd8b040, { metal: 0.7 }), [(i - 1) * w / 3 + 0.15, h / 2 + 0.05, 0.265]); } g.userData.topY = h + 0.05; return g; }
export function bench({ w = 1.4, h = 0.45, d = 0.35, color = COL.wood } = {}) { const g = new THREE.Group(); P(g, rg(w, 0.05, d, 0.015), mat(color, { rough: 0.6 }), [0, h, 0], [0, 0, 0], 1, true); for (const s of [-1, 1]) P(g, rg(0.05, h, d - 0.04, 0.01), mat(shade(color, 0.8)), [s * (w / 2 - 0.1), h / 2, 0]); g.userData.seatY = h + 0.03; return g; }
export function locker({ n = 6, color = 0x4a78b0, seed = 1, h = 1.8 } = {}) { const g = new THREE.Group(), r = rng(seed); const lw = 0.32; for (let i = 0; i < n; i++) { const c = shade(color, 0.9 + (i % 3) * 0.08); const x = (i - (n - 1) / 2) * lw; P(g, bg(lw - 0.005, h, 0.42), mat(c, { rough: 0.4, metal: 0.4 }), [x, h / 2, 0], [0, 0, 0], 1, true); for (let k = 0; k < 4; k++) P(g, bg(0.2, 0.008, 0.004), mat(0x15151c), [x, h - 0.12 - k * 0.018, 0.212]); P(g, bg(0.03, 0.12, 0.03), mat(0xc8ccd6, { metal: 0.8 }), [x + 0.08, h * 0.55, 0.23]); if (r() < 0.5) P(g, bg(0.15, 0.12, 0.003), mat(r.pick(PAL)), [x, h * 0.72, 0.213]); } g.userData.realWidthM = n * lw; return g; }
export function filingCabinet({ color = 0x8a96a8, drawers = 3 } = {}) { const g = new THREE.Group(); const h = drawers * 0.36 + 0.05; P(g, rg(0.46, h, 0.62, 0.015), mat(color, { rough: 0.4, metal: 0.4 }), [0, h / 2, 0], [0, 0, 0], 1, true); for (let i = 0; i < drawers; i++) { P(g, rg(0.4, 0.3, 0.012, 0.008), mat(shade(color, 1.1), { metal: 0.4, rough: 0.4 }), [0, 0.2 + i * 0.36, 0.312]); P(g, bg(0.14, 0.02, 0.03), mat(0x2a2a30), [0, 0.3 + i * 0.36, 0.33]); P(g, bg(0.08, 0.05, 0.003), mat(0xffffff), [0, 0.22 + i * 0.36, 0.32]); } g.userData.topY = h; return g; }

// ---------- shelves with stuff ----------
export function shelfFilled({ w = 1.1, h = 1.9, d = 0.32, rows = 5, kind = 'books', seed = 1, color = 0x7a5232 } = {}) {
  const g = new THREE.Group(), r = rng(seed + 17), wm = mat(color, { rough: 0.6 });
  P(g, bg(w, h, 0.02), mat(shade(color, 0.7), { rough: 0.8 }), [0, h / 2, -d / 2 + 0.01]);
  for (const s of [-1, 1]) P(g, bg(0.03, h, d), wm, [s * (w / 2 - 0.015), h / 2, 0], [0, 0, 0], 1, true);
  const step = (h - 0.06) / rows;
  for (let i = 0; i <= rows; i++) P(g, bg(w, 0.03, d), wm, [0, 0.015 + i * step, 0], [0, 0, 0], i === 0 || i === rows);
  const cols = PAL.concat([0xf2ead8, 0x15151c, 0x8a4a2a]);
  const toyItems = ['block', 'ball', 'car', 'bear', 'rocket', 'robot'];
  for (let i = 0; i < rows; i++) {
    const y0 = 0.03 + i * step; let x = -w / 2 + 0.05; const end = w / 2 - 0.05;
    const rowKind = kind === 'mixed' ? ['books', 'toys', 'books', 'deco', 'books'][i % 5] : kind;
    if (rowKind === 'books') { while (x < end - 0.04) { const k = r(); if (k < 0.08) { x += r.range(0.08, 0.2); continue; } const bw = r.range(0.025, 0.06), bh = r.range(0.17, Math.min(0.33, step - 0.04)); const lean = r() < 0.07 ? 0.25 : 0; P(g, bg(bw, bh, d * 0.72), mat(r.pick(cols), { rough: 0.8 }), [x + bw / 2, y0 + bh / 2, 0.02], [0, 0, lean]); if (r() < 0.3) P(g, bg(bw + 0.001, 0.012, d * 0.72 + 0.002), mat(0xf6ecd5), [x + bw / 2, y0 + bh * 0.7, 0.02]); x += bw + 0.004; } }
    else if (rowKind === 'toys') { while (x < end - 0.1) { const c = r.pick(cols), k = r.pick(toyItems), s = r.range(0.06, 0.1); if (k === 'block') P(g, bg(s, s, s), mat(c, { rough: 0.6 }), [x + s / 2, y0 + s / 2, 0.02], [0, r(), 0]); else if (k === 'ball') P(g, sg(s * 0.6, 12, 8), mat(c, { rough: 0.4 }), [x + s / 2, y0 + s * 0.6, 0.02]); else if (k === 'car') { P(g, rg(s * 1.6, s * 0.45, s * 0.8, 0.02), mat(c), [x + s, y0 + s * 0.35, 0.02]); P(g, rg(s * 0.8, s * 0.35, s * 0.7, 0.02), mat(0xcfe8ff), [x + s, y0 + s * 0.7, 0.02]); for (const sx of [-1, 1]) P(g, cg(s * 0.2, s * 0.2, s * 0.9, 8), mat(0x222222), [x + s + sx * s * 0.5, y0 + s * 0.2, 0.02], [Math.PI / 2, 0, 0]); x += s * 0.8; } else if (k === 'bear') { P(g, sg(s * 0.6, 10, 8), mat(0xc89a62, { rough: 1 }), [x + s / 2, y0 + s * 0.5, 0.02]); P(g, sg(s * 0.4, 10, 8), mat(0xc89a62, { rough: 1 }), [x + s / 2, y0 + s * 1.1, 0.02]); for (const sx of [-1, 1]) P(g, sg(s * 0.15, 6, 5), mat(0xc89a62), [x + s / 2 + sx * s * 0.28, y0 + s * 1.4, 0.02]); } else if (k === 'rocket') { P(g, cg(s * 0.22, s * 0.22, s * 1.4, 10), mat(0xf2f2f6), [x + s / 2, y0 + s * 0.7, 0.02]); P(g, new THREE.ConeGeometry(s * 0.22, s * 0.4, 10), mat(c), [x + s / 2, y0 + s * 1.6, 0.02]); } else { P(g, rg(s * 0.8, s * 0.9, s * 0.6, 0.02), mat(0xc8ccd6, { metal: 0.5 }), [x + s / 2, y0 + s * 0.45, 0.02]); P(g, rg(s * 0.55, s * 0.4, s * 0.55, 0.02), mat(c), [x + s / 2, y0 + s * 1.1, 0.02]); } x += s + 0.05; } }
    else if (rowKind === 'pantry') { while (x < end - 0.08) { const k = r(), c = r.pick(cols); if (k < 0.4) { const s = 0.07; P(g, cg(s, s, 0.13, 12), mat(c, { rough: 0.4 }), [x + s, y0 + 0.065, 0.0]); P(g, cg(s + 0.002, s + 0.002, 0.07, 12), mat(0xf6ecd5), [x + s, y0 + 0.065, 0.0]); x += s * 2 + 0.01; } else if (k < 0.7) { P(g, rg(0.09, 0.2, 0.06, 0.012), mat(c, { rough: 0.7 }), [x + 0.05, y0 + 0.1, 0]); x += 0.11; } else { P(g, cg(0.05, 0.05, 0.2, 12), mat(0x9ad8c8, { rough: 0.2, opacity: 0.8 }), [x + 0.05, y0 + 0.1, 0]); P(g, cg(0.052, 0.052, 0.05, 12), mat(c), [x + 0.05, y0 + 0.21, 0]); x += 0.12; } } }
    else if (rowKind === 'records') { while (x < end - 0.02) { const bw = 0.012; P(g, bg(bw, 0.31, 0.31), mat(r.pick(cols), { rough: 0.7 }), [x + bw / 2, y0 + 0.155, 0.0], [0, 0, r() < 0.05 ? 0.2 : 0]); x += bw + 0.002; } }
    else { // deco: frame, plant, trophy, vase
      const k = r(); const cx = (r() - 0.5) * (w - 0.4); const pl = plantSmall(r); pl.position.set(cx, y0, 0.0); g.add(pl); P(g, rg(0.2, 0.26, 0.015, 0.008), mat(0x5a3a22), [-cx * 0.8, y0 + 0.14, -d / 2 + 0.05], [-0.15, 0, 0]); P(g, bg(0.16, 0.22, 0.004), mat(r.pick(PAL)), [-cx * 0.8, y0 + 0.14, -d / 2 + 0.06], [-0.15, 0, 0]); }
  }
  g.userData.realHeightM = h; g.userData.realWidthM = w; return g;
}
function plantSmall(r) { const g = new THREE.Group(); P(g, new THREE.CylinderGeometry(0.06, 0.045, 0.1, 10), mat(0xd8805a, { rough: 0.6 }), [0, 0.05, 0]); for (let i = 0; i < 5; i++) P(g, sg(0.05, 8, 6), mat(r.pick([0x3fa050, 0x2f8a3a]), { rough: 0.8 }), [Math.cos(i * 1.3) * 0.03, 0.14 + (i % 2) * 0.04, Math.sin(i * 1.3) * 0.03], [0, 0, 0], [1, 1.5, 0.6]); return g; }
export function trolley({ color = 0xc8ccd6, shelves = 3, w = 0.7, d = 0.45, seed = 1 } = {}) { const g = new THREE.Group(); const sm = mat(color, { metal: 0.6, rough: 0.3 }); for (let i = 0; i < shelves; i++) P(g, rg(w, 0.03, d, 0.01), sm, [0, 0.15 + i * 0.35, 0], [0, 0, 0], 1, true); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { P(g, cg(0.014, 0.014, 0.35 * shelves + 0.1, 6), sm, [sx * (w / 2 - 0.02), (0.35 * shelves + 0.1) / 2 + 0.05, sz * (d / 2 - 0.02)]); P(g, sg(0.04, 8, 6), mat(0x15151c), [sx * (w / 2 - 0.03), 0.04, sz * (d / 2 - 0.03)]); } P(g, bg(0.03, 0.03, d), sm, [-w / 2 - 0.02, 0.35 * shelves, 0]); g.userData.topY = 0.15 + (shelves - 1) * 0.35; return g; }
