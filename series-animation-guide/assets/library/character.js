// Rounded toy-like character rig (the series look): big head, huge eyes, thick brows, tapered limbs, fingered hands.
// Character faces +Z, feet at y=0. Usage:
//   const hero = makeCharacter(PRESETS.hero);  scene.add(hero.root);
//   hero.pose(POSES.run(t)); hero.face({open:0.8, brow:1, eye:1.3}); hero.hand('R','fist');
//   hero.hold(spatulaMesh, 'R');   // attaches to the palm, sets the grip. Items are authored upright (y axis) with the grip point at the
//                                  // origin and userData.grip = {upright:true, hand:'grip'}; with POSES.holdR the item then stands vertical in the fist.
//   hero.carry(boxMesh);           // two-handed carry in front of the chest (use with POSES.carry)
//   hero.pose({...POSES.sit(0, 0.45)}); hero.plant();   // plant() drops the body so the lowest foot touches y=0
import * as THREE from 'three';
import { mat, add, sph, box, cyl, cap, cone, tor, rbox, shade, C } from './util.js';
import { buildHair } from './hair.js';

const HEAD_R = 0.33;
const HIPS_Y = 0.6;
export const SKIN = { peach: C.skinPeach, tan: C.skinTan, brown: C.skinBrown, dark: C.skinDark, pale: C.skinPale, pink: C.skinPink };

// Tapered limb: origin at the joint (y=0), hangs to y=-len; round caps of radius r0 (top) and r1 (bottom).
export function limbGeo(r0, r1, len, rs = 20) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const b = (1 - i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(r1 * Math.cos(b), -len - r1 * Math.sin(b))); }   // bottom pole -> bottom edge
  for (let i = 1; i <= 4; i++) { const t = i / 5; pts.push(new THREE.Vector2(r1 + (r0 - r1) * t, -len + len * t)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(r0 * Math.cos(a), r0 * Math.sin(a))); }          // top edge -> top pole
  return new THREE.LatheGeometry(pts, rs);
}
// Smooth lathe from [[r,y],...] bottom->top (Catmull-Rom smoothed).
export function latheProfile(pairs, rs = 36, smooth = 3) {
  const c = new THREE.SplineCurve(pairs.map(([r, y]) => new THREE.Vector2(r, y)));
  const pts = c.getPoints(pairs.length * smooth).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  return new THREE.LatheGeometry(pts, rs);
}
// ---------- accessories (hats, glasses, facial hair…) ----------
const ACC = {
  headband(ch, a = C.yellow) {
    const R = ch.R;
    const b = add(ch.head, tor(R * 0.97, R * 0.075, 10, 40), mat(a), [0, R * 0.34, 0], [Math.PI / 2 - 0.12, 0, 0]);
    b.scale.set(1, 1, 1.0);
    add(ch.head, sph(R * 0.12, 12, 8), mat(a), [R * 0.55, R * 0.42, -R * 0.78], [0, 0, 0], [1, 1, 0.6]);
    add(ch.head, sph(R * 0.12, 12, 8), mat(a), [R * 0.72, R * 0.30, -R * 0.62], [0, 0, 0], [1, 1, 0.6]);
  },
  glasses(ch, a = 0x222222) {
    const R = ch.R;
    for (const s of [-1, 1]) {
      add(ch.head, tor(R * 0.27, R * 0.035, 8, 28), mat(a), [s * R * 0.38, R * 0.1, R * 0.92]);
    }
    add(ch.head, cyl(R * 0.02, R * 0.02, R * 0.2, 8), mat(a), [0, R * 0.12, R * 0.94], [0, 0, Math.PI / 2]);
  },
  sunglasses(ch) {
    const R = ch.R;
    for (const s of [-1, 1]) add(ch.head, sph(R * 0.3, 20, 12), mat(0x0a0a10, { rough: 0.25, metal: 0.3 }), [s * R * 0.38, R * 0.1, R * 0.9], [0, 0, 0], [1, 0.8, 0.45]);
    add(ch.head, cyl(R * 0.03, R * 0.03, R * 0.2, 8), mat(0x0a0a10), [0, R * 0.14, R * 0.93], [0, 0, Math.PI / 2]);
  },
  goggles(ch, a = 0x3a6ea5) {
    const R = ch.R;
    add(ch.head, tor(R * 1.0, R * 0.07, 8, 40), mat(0x2a2a33), [0, R * 0.12, 0], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) add(ch.head, sph(R * 0.28, 20, 12), mat(a, { rough: 0.2, opacity: 0.55 }), [s * R * 0.38, R * 0.1, R * 0.94], [0, 0, 0], [1, 1, 0.4]);
  },
  beard(ch, a = 0x4a3426) { // one continuous jaw/chin shell; the mouth is moved out so it sits on the beard
    const R = ch.R, m = mat(a, { rough: 0.9 });
    add(ch.head, sph(R * 1.045, 48, 28, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), m, [0, -R * 0.02, R * 0.03], [0, 0, 0], [1.0, 1, 1.02]);
    add(ch.head, sph(R * 0.42, 20, 14), m, [0, -R * 0.78, R * 0.66], [0, 0, 0], [1.25, 0.75, 0.8]);                   // chin tuft
    ch.F.mouth.g.position.z = R * 1.075; ch.F.mouth.g.position.y = -R * 0.43;
    ch.F.mouth.smile.material = new THREE.MeshStandardMaterial({ color: 0xe8848a, roughness: 0.5 });
  },
  stubble(ch) { ACC.beard(ch, 0x4a3a30); },
  mustache(ch, a = 0x2d2118) {
    const R = ch.R;
    for (const s of [-1, 1]) add(ch.head, cap(R * 0.08, R * 0.3, 4, 10), mat(a), [s * R * 0.2, -R * 0.36, R * 0.93], [0, 0, Math.PI / 2 + s * 0.22]);
  },
  bigmustache(ch, a = 0x8a8a90) {
    const R = ch.R;
    for (const s of [-1, 1]) add(ch.head, cap(R * 0.085, R * 0.34, 4, 10), mat(a, { rough: 0.9 }), [s * R * 0.24, -R * 0.3, R * 0.93], [0, 0, Math.PI / 2 + s * 0.3]);
  },

  topHat(ch, a = 0x17171d, band = C.red) {
    const R = ch.R;
    add(ch.head, cyl(R * 0.95, R * 0.95, R * 0.06, 32), mat(a), [0, R * 0.78, 0]);
    add(ch.head, cyl(R * 0.62, R * 0.62, R * 0.8, 28), mat(a), [0, R * 1.2, 0]);
    add(ch.head, cyl(R * 0.635, R * 0.635, R * 0.14, 28), mat(band), [0, R * 0.9, 0]);
  },
  cap(ch, a = C.blue, rev = false) {
    const R = ch.R;
    add(ch.head, sph(R * 1.03, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.46), mat(a), [0, R * 0.12, 0]);
    add(ch.head, cyl(R * 0.62, R * 0.62, R * 0.05, 24, 1, false, 0, Math.PI), mat(a), [0, R * 0.55, R * 0.92 * (rev ? -1 : 1)], [0.2, rev ? Math.PI : 0, 0], [1, 1, 0.85]);
  },
  flatCap(ch, a = 0x6a5a48) {
    const R = ch.R;
    add(ch.head, sph(R * 1.06, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(a), [0, R * 0.2, 0], [0.12, 0, 0], [1, 0.8, 1.05]);
    add(ch.head, cyl(R * 0.55, R * 0.55, R * 0.05, 24), mat(a), [0, R * 0.52, R * 0.85], [0.35, 0, 0], [1, 1, 0.7]);
  },
  paperHat(ch, a = C.white) {
    const R = ch.R;
    add(ch.head, cyl(R * 0.82, R * 0.9, R * 0.5, 24), mat(a), [0, R * 0.92, 0]);
    add(ch.head, tor(R * 0.86, R * 0.06, 8, 32), mat(C.red), [0, R * 0.7, 0], [Math.PI / 2, 0, 0]);
  },
  helmet(ch, a = C.orange, horns = false) {
    const R = ch.R;
    add(ch.head, sph(R * 1.08, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(a, { rough: 0.35, metal: horns ? 0.5 : 0 }), [0, R * 0.1, 0]);
    if (horns) for (const s of [-1, 1]) add(ch.head, cone(R * 0.17, R * 0.65, 12), mat(0xf3ead0), [s * R * 1.05, R * 0.55, 0], [0, 0, -s * 0.8]);
  },
  hardHat(ch, a = C.yellow) {
    const R = ch.R;
    add(ch.head, sph(R * 1.04, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(a, { rough: 0.3 }), [0, R * 0.1, 0]);
    add(ch.head, cyl(R * 1.25, R * 1.25, R * 0.06, 32), mat(a), [0, R * 0.12, 0]);
  },
  crown(ch, a = C.gold) {
    const R = ch.R;
    add(ch.head, cyl(R * 0.55, R * 0.62, R * 0.3, 20), mat(a, { metal: 0.6, rough: 0.3 }), [0, R * 0.95, 0]);
    for (let i = 0; i < 5; i++) { const t = (i / 5) * Math.PI * 2; add(ch.head, cone(R * 0.12, R * 0.3, 8), mat(a, { metal: 0.6, rough: 0.3 }), [Math.cos(t) * R * 0.52, R * 1.2, Math.sin(t) * R * 0.52]); }
  },
  nemes(ch) { // pharaoh headdress
    const R = ch.R;
    add(ch.head, sph(R * 1.12, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(C.gold, { metal: 0.4 }), [0, R * 0.08, 0]);
    for (const s of [-1, 1]) {
      add(ch.head, box(R * 0.42, R * 1.5, R * 0.3), mat(C.gold, { metal: 0.4 }), [s * R * 1.0, -R * 0.35, R * 0.2]);
      for (let k = 0; k < 4; k++) add(ch.head, box(R * 0.44, R * 0.07, R * 0.32), mat(0x2b4aa0), [s * R * 1.0, -R * 0.1 - k * R * 0.28, R * 0.21]);
    }
    add(ch.head, sph(R * 0.15, 10, 8), mat(0x2b4aa0), [0, R * 0.75, R * 0.95]);
  },
  knightHelm(ch) {
    const R = ch.R;
    add(ch.head, sph(R * 1.1, 28, 16), mat(0xaab4c4, { metal: 0.7, rough: 0.3 }), [0, R * 0.05, 0]);
    add(ch.head, box(R * 1.3, R * 0.14, R * 0.2), mat(0x20242c), [0, R * 0.12, R * 1.0]);
    add(ch.head, box(R * 0.14, R * 0.7, R * 0.2), mat(0x20242c), [0, -R * 0.25, R * 1.02]);
    add(ch.head, cone(R * 0.15, R * 0.5, 8), mat(C.red), [0, R * 1.25, 0], [0.2, 0, 0]);
  },
  scarf(ch, a = C.red) {
    add(ch.torso, tor(0.2, 0.075, 10, 24), mat(a), [0, 0.38, 0], [Math.PI / 2, 0, 0]);
    add(ch.torso, cap(0.06, 0.2, 4, 10), mat(a), [0.15, 0.2, 0.2], [0.15, 0, 0.1]);
  },
  tie(ch, a = C.red) {
    add(ch.torso, cone(0.06, 0.28, 4), mat(a), [0, 0.1, 0.235], [Math.PI, 0, 0.0], [1, 1, 0.3]);
    add(ch.torso, sph(0.05, 8, 6), mat(a), [0, 0.27, 0.225], [0, 0, 0], [1, 0.8, 0.5]);
  },
  bowtie(ch, a = C.red) {
    for (const s of [-1, 1]) add(ch.torso, cone(0.07, 0.1, 3), mat(a), [s * 0.06, 0.29, 0.23], [0, 0, s * Math.PI / 2], [1, 1, 0.4]);
    add(ch.torso, sph(0.03, 8, 6), mat(a), [0, 0.29, 0.235]);
  },
  badge(ch, a = C.gold) { add(ch.torso, tor(0.045, 0.012, 6, 16), mat(a, { metal: 0.6 }), [0.14, 0.18, 0.243], [0, 0, 0]); add(ch.torso, cyl(0.045, 0.045, 0.012, 16), mat(a, { metal: 0.6 }), [0.14, 0.18, 0.243], [Math.PI / 2, 0, 0]); },
  backpack(ch, a = C.green) { add(ch.torso, rbox(0.4, 0.5, 0.2, 0.08), mat(a), [0, 0.12, -0.3]); },
  parachute(ch, a = C.orange) { add(ch.torso, rbox(0.42, 0.55, 0.22, 0.08), mat(a), [0, 0.12, -0.31]); add(ch.torso, tor(0.2, 0.025, 6, 20, Math.PI), mat(0x222222), [0, 0.3, 0.02], [Math.PI / 2, 0, 0]); },
  mailbag(ch, a = 0x7a5a3a) { add(ch.torso, rbox(0.2, 0.28, 0.36, 0.07), mat(a, { rough: 0.8 }), [-0.31, -0.2, 0.04], [0, 0, 0.12]); add(ch.torso, rbox(0.2, 0.06, 0.37, 0.02), mat(0x5a4028), [-0.31, -0.08, 0.04], [0, 0, 0.12]); add(ch.torso, box(0.045, 0.82, 0.014), mat(0x5a4028), [-0.02, 0.1, 0.236], [0, 0, 0.62]); },
  apron(ch, a = C.white) { add(ch.torso, rbox(0.36, 0.52, 0.04, 0.05), mat(a), [0, -0.0, 0.247]); },
  cape(ch, a = C.purple, lining = C.red) { add(ch.torso, rbox(0.62, 0.95, 0.05, 0.05), mat(a, { side: THREE.DoubleSide }), [0, -0.12, -0.285], [-0.1, 0, 0]); add(ch.torso, tor(0.2, 0.05, 8, 24), mat(a), [0, 0.38, -0.04], [Math.PI / 2, 0, 0]); add(ch.torso, rbox(0.5, 0.8, 0.02, 0.03), mat(lining), [0, -0.12, -0.255], [-0.1, 0, 0]); },
  wand(ch) { add(ch.handR, cyl(0.014, 0.014, 0.4, 8), mat(0x151515), [0, -0.02, 0.15], [Math.PI / 2, 0, 0]); add(ch.handR, cyl(0.016, 0.016, 0.07, 8), mat(C.white), [0, -0.02, 0.35], [Math.PI / 2, 0, 0]); },
  club(ch) { add(ch.handR, cap(0.055, 0.5, 4, 10), mat(0x7a5a3a), [0, -0.1, 0.1], [0.5, 0, 0]); },
  harness(ch, a = C.yellow) { for (const s of [-1, 1]) add(ch.torso, box(0.05, 0.6, 0.02), mat(a), [s * 0.1, 0.05, 0.248], [0, 0, 0.08 * s]); add(ch.torso, box(0.5, 0.05, 0.02), mat(a), [0, -0.2, 0.248]); },
  earmuffs(ch, a = C.pink) { for (const s of [-1, 1]) add(ch.head, sph(R_(ch) * 0.28, 12, 10), mat(a), [s * R_(ch) * 1.0, 0, 0]); },
  flower(ch, a = C.pink) { const R = ch.R; for (let i = 0; i < 5; i++) { const t = i / 5 * 6.283; add(ch.head, sph(R * 0.09, 8, 6), mat(a), [R * 0.6 + Math.cos(t) * R * 0.1, R * 0.82 + Math.sin(t) * R * 0.1, R * 0.4]); } add(ch.head, sph(R * 0.07, 8, 6), mat(C.yellow), [R * 0.6, R * 0.82, R * 0.42]); },
  bandage(ch) { const R = ch.R; add(ch.head, box(R * 0.35, R * 0.12, R * 0.05), mat(0xf3e0c0), [R * 0.35, -R * 0.1, R * 0.97], [0, 0, 0.5]); },
  labCoat(ch) { /* handled by outfit 'coat' */ },
};
function R_(ch) { return ch.R; }

// ---------- hands ----------
export const HANDS = {
  relaxed: [0.25, 0.3, 0.35, 0.4, 0.45], open: [0.0, 0, 0, 0, 0], flat: [0.0, 0, 0, 0, 0], fist: [0.8, 1, 1, 1, 1],
  point: [0.7, 0, 1, 1, 1], grip: [0.6, 0.7, 0.75, 0.75, 0.75], loose: [0.35, 0.5, 0.55, 0.55, 0.55], pinch: [0.45, 0.5, 0.15, 0.2, 0.25],
  peace: [0.8, 0, 0, 1, 1], spread: [0.0, -0.1, -0.05, -0.05, -0.1], cup: [0.2, 0.45, 0.45, 0.45, 0.45],
};
function makeHand(ch, s, skinM, detail) {
  const hand = new THREE.Group();
  const H = { root: hand, fingers: [], thumb: null, s };
  add(hand, sph(0.062, 18, 14), skinM, [0, -0.068, 0], [0, 0, 0], [0.82, 1.05, 0.95]);   // palm
  if (detail === 'low') { add(hand, sph(0.075, 12, 10), skinM, [0, -0.1, 0.0]); H.fingers = []; return H; }
  const L = [0.05, 0.06, 0.054, 0.042], Z = [0.034, 0.012, -0.011, -0.031], R = 0.0185;
  for (let i = 0; i < 4; i++) {
    const k1 = new THREE.Group(); k1.position.set(0, -0.112, Z[i]); hand.add(k1);
    add(k1, cap(R, L[i] * 0.55, 3, 8), skinM, [0, -L[i] * 0.3 - 0.0, 0]);
    const k2 = new THREE.Group(); k2.position.y = -L[i] * 0.62; k1.add(k2);
    add(k2, cap(R * 0.95, L[i] * 0.45, 3, 8), skinM, [0, -L[i] * 0.25, 0]);
    H.fingers.push([k1, k2]);
  }
  const t1 = new THREE.Group(); t1.position.set(0, -0.06, 0.05); hand.add(t1);
  add(t1, cap(0.0215, 0.026, 3, 8), skinM, [0, -0.025, 0]);
  const t2 = new THREE.Group(); t2.position.y = -0.04; t1.add(t2);
  add(t2, cap(0.02, 0.022, 3, 8), skinM, [0, -0.02, 0]);
  H.thumb = [t1, t2];
  return H;
}
function setHand(H, g) {
  const a = typeof g === 'string' ? HANDS[g] : g, s = H.s;
  if (!H.thumb) return;
  const th = a[0];
  H.thumb[0].rotation.set(0.5 - th * 0.35, -s * (0.45 - th * 0.55), -s * (0.35 + th * 0.55)); H.thumb[1].rotation.z = -s * th * 0.9;
  for (let i = 0; i < 4; i++) { const c = a[i + 1]; H.fingers[i][0].rotation.z = -s * c * 1.45; H.fingers[i][1].rotation.z = -s * c * 1.35; H.fingers[i][0].rotation.x = (i - 1.5) * -(a[i + 1] < 0 ? a[i + 1] : 0) * 0.3; }
}

// ---------- outfits ----------
function buildOutfit(ch, o, skinM) {
  const t = ch.torso, hips = ch.hips;
  const col = o.color, c2 = o.color2 ?? C.white, dk = shade(col, 0.72);
  const mTop = mat(col, { rough: 0.8 }), mDk = mat(dk, { rough: 0.85 });
  ch.torsoMesh.material = mTop; ch.sleeveMat = mTop; ch.sleeveFull = true; ch.sleeveLen = 1;
  const tt = (x, y, z) => [x, y, z];
  switch (o.type) {
    case 'hoodie':
      add(t, tor(0.165, 0.07, 12, 32), mTop, [0, 0.35, -0.015], [Math.PI / 2 + 0.25, 0, 0], [1, 0.95, 1]);                   // hood collar
      add(t, sph(0.15, 16, 12), mTop, [0, 0.31, -0.17], [0, 0, 0], [1.1, 0.8, 0.7]);                                       // hood pile
      add(hips, cyl(0.262, 0.255, 0.07, 36), mDk, [0, -0.025, 0]);                                                         // hem rib
      add(t, rbox(0.24, 0.13, 0.05, 0.04), mat(o.pocket ?? col, { rough: 0.85 }), [0, -0.085, 0.218], [-0.12, 0, 0]);          // kangaroo pocket
      for (const s of [-1, 1]) { add(t, cap(0.011, 0.14, 3, 6), mat(C.white), [s * 0.055, 0.17, 0.246], [0, 0, 0.05 * s]); add(t, sph(0.016, 6, 5), mat(0xdddddd), [s * 0.058, 0.09, 0.247]); }
      break;
    case 'tee':
      add(t, tor(0.1, 0.022, 8, 24), mDk, [0, 0.36, 0.06], [Math.PI / 2 - 0.5, 0, 0]);
      ch.sleeveFull = false; ch.sleeveLen = 0.55; break;
    case 'jersey':
      add(t, tor(0.1, 0.025, 8, 24), mat(c2), [0, 0.36, 0.06], [Math.PI / 2 - 0.5, 0, 0]);
      add(t, rbox(0.22, 0.2, 0.02, 0.05), mat(c2), [0, 0.1, 0.25], [-0.05, 0, 0]); ch.sleeveFull = false; ch.sleeveLen = 0.5; break;
    case 'stripes': for (let i = 0; i < 5; i++) add(t, cyl(0.258, 0.258, 0.05, 36), mat(c2), [0, -0.2 + i * 0.12, 0]); ch.sleeveFull = false; ch.sleeveLen = 0.6; break;
    case 'coat': // lab coat: flared knee-length with lapels, buttons, pockets
      add(hips, latheProfile([[0.2, -0.46], [0.29, -0.4], [0.3, -0.2], [0.27, -0.02], [0.22, 0.04]], 36), mTop, [0, 0, 0]);
      for (const s of [-1, 1]) { add(t, cone(0.075, 0.26, 3), mat(c2), [s * 0.075, 0.3, 0.205], [0, 0, s * 0.35], [1, 1, 0.25]); add(t, rbox(0.12, 0.1, 0.03, 0.02), mat(0xe8edf5), [s * 0.14, -0.14, 0.235], [0, 0, 0]); }
      add(t, box(0.012, 0.9, 0.01), mat(0xb8c0d0), [0, -0.1, 0.262]);
      for (let i = 0; i < 3; i++) add(t, sph(0.014, 6, 5), mat(0xa0a8b8), [0.03, 0.1 - i * 0.13, 0.262]);
      break;
    case 'suit': {
      add(t, latheProfile([[0.18, -0.2], [0.26, -0.1], [0.26, 0.1]], 24), mTop, [0, -0.02, 0]).scale.set(1, 0.5, 1);
      add(t, rbox(0.13, 0.5, 0.03, 0.02), mat(C.white), [0, 0.17, 0.246]);                                              // shirt
      for (const s of [-1, 1]) { add(t, rbox(0.1, 0.52, 0.035, 0.015), mTop, [s * 0.105, 0.14, 0.25], [0, 0, s * 0.1]); add(t, cone(0.06, 0.18, 3), mDk, [s * 0.075, 0.32, 0.262], [0, 0, s * 0.5], [1, 1, 0.2]); }
      for (let i = 0; i < 2; i++) add(t, sph(0.015, 6, 5), mat(0x222222), [0.0, 0.05 - i * 0.12, 0.268]);
      add(hips, cyl(0.262, 0.262, 0.1, 30), mTop, [0, -0.02, 0]);
      break; }
    case 'dress':
      add(hips, latheProfile([[0.0, -0.52], [0.43, -0.5], [0.4, -0.3], [0.3, -0.12], [0.23, -0.02]], 40), mTop, [0, 0, 0]);
      add(hips, tor(0.43, 0.022, 8, 40), mat(c2), [0, -0.49, 0], [Math.PI / 2, 0, 0]);
      add(hips, tor(0.245, 0.025, 8, 32), mat(c2), [0, 0.01, 0], [Math.PI / 2, 0, 0]);
      ch.sleeveFull = false; ch.sleeveLen = 0.45; ch.dress = true; break;
    case 'cardigan':
      for (let i = 0; i < 4; i++) add(t, sph(0.02, 8, 6), mat(c2), [0, 0.22 - i * 0.12, 0.259]);
      add(t, box(0.01, 0.62, 0.01), mDk, [0, -0.02, 0.263]);
      for (const s of [-1, 1]) add(t, rbox(0.12, 0.11, 0.03, 0.03), mDk, [s * 0.14, -0.12, 0.24]);
      add(hips, cyl(0.258, 0.252, 0.06, 32), mDk, [0, -0.02, 0]);
      break;
    case 'jumpsuit': ch.pantsFull = true;
      add(t, box(0.014, 0.8, 0.01), mat(0x222222), [0, 0.0, 0.263]); add(t, rbox(0.1, 0.08, 0.02, 0.02), mat(C.white), [0.12, 0.2, 0.255]); add(hips, tor(0.25, 0.022, 8, 36), mat(0x222222), [0, 0.0, 0], [Math.PI / 2, 0, 0]); break;
    case 'toga':
      add(t, cone(0.34, 0.5, 5), mat(c2), [0.16, 0.18, 0.04], [0.0, 0, -0.55], [1, 1, 0.45]); add(hips, latheProfile([[0.0, -0.45], [0.33, -0.44], [0.28, -0.1], [0.22, 0.0]], 32), mat(c2), [0, 0, 0]);
      ch.sleeveFull = false; ch.sleeveLen = 0.3; break;
    case 'fur': // caveman pelt
      add(hips, latheProfile([[0.2, -0.3], [0.33, -0.22], [0.3, -0.08], [0.24, 0.0]], 24), mTop, [0, 0, 0]);
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; add(hips, cone(0.055, 0.14, 4), mTop, [Math.cos(a) * 0.32, -0.3, Math.sin(a) * 0.32], [Math.PI, 0, 0]); }
      add(t, cone(0.34, 0.3, 4), mDk, [0.18, 0.28, 0.05], [0, 0, -0.5], [1, 1, 0.4]);
      ch.sleeveFull = false; ch.sleeveLen = 0.0; break;
    case 'armor':
      add(t, sph(0.275, 28, 18), mat(0xaab4c4, { metal: 0.7, rough: 0.3 }), [0, 0.04, 0], [0, 0, 0], [1, 1.1, 0.95]);
      add(hips, latheProfile([[0.22, -0.2], [0.3, -0.12], [0.26, 0.04]], 28), mat(0xaab4c4, { metal: 0.7, rough: 0.3 }), [0, 0, 0]);
      for (const s of [-1, 1]) add(t, sph(0.115, 14, 10), mat(0xaab4c4, { metal: 0.7, rough: 0.3 }), [s * 0.3, 0.26, 0]);
      add(t, tor(0.14, 0.02, 6, 20), mat(0x6a4a2a), [0, 0.2, 0], [Math.PI / 2, 0, 0]); break;
  }
}

// ---------- the builder ----------
export const DEFAULTS = {
  skin: C.skinPeach, hair: { style: 'short', color: 0x4a3322 }, brow: 0x2b1d14, seed: 1,
  outfit: { type: 'tee', color: C.blue }, pants: { type: 'long', color: 0x3a3f66 }, shoes: C.white, shoeSole: 0xeeeeee, socks: 0xffffff, belt: null,
  height: 1, head: 1.12, width: 1, eyeColor: 0xffffff, iris: 0x1a1a22, eyeSize: 1.2, acc: [], hands: null, nose: 1, lashes: false, blush: 0.5, freckles: false, detail: 'high',
};

export function makeCharacter(opts = {}) {
  const o = { ...DEFAULTS, ...opts, outfit: { ...DEFAULTS.outfit, ...(opts.outfit || {}) }, pants: { ...DEFAULTS.pants, ...(opts.pants || {}) }, hair: { ...DEFAULTS.hair, ...(opts.hair || {}) } };
  const R = HEAD_R * o.head, W = o.width, low = o.detail === 'low';
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const skin = mat(o.skin, { rough: 0.6 });
  const hips = new THREE.Group(); hips.position.y = HIPS_Y; body.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  // torso: smooth egg profile
  const tgeo = latheProfile([[0.0, -0.1], [0.17, -0.09], [0.225, -0.04], [0.245, 0.06], [0.255, 0.22], [0.255, 0.36], [0.235, 0.5], [0.185, 0.6], [0.11, 0.66], [0.0, 0.69]], 40, 3);
  const torsoMesh = add(torso, tgeo, mat(o.outfit.color), [0, 0, 0], [0, 0, 0], [W, 1, W * 0.9]);
  const t = new THREE.Group(); t.position.y = 0.28; torso.add(t);           // anchor: centre of torso
  const neck = new THREE.Group(); neck.position.y = 0.62; torso.add(neck);
  add(neck, cyl(0.085, 0.1, 0.12, 14), skin, [0, 0.0, 0]);
  const head = new THREE.Group(); head.position.y = R * 0.92 + 0.03; neck.add(head);
  add(head, sph(R, 48, 32), skin, [0, 0, 0], [0, 0, 0], [1, 0.98, 1]);
  for (const s of [-1, 1]) { add(head, sph(R * 0.2, 14, 10), skin, [s * R * 0.97, -R * 0.02, -R * 0.05], [0, 0, 0], [0.5, 1, 0.8]); add(head, sph(R * 0.11, 10, 8), mat(shade(o.skin, 0.82)), [s * R * 1.01, -R * 0.02, -R * 0.02], [0, 0, 0], [0.4, 1, 0.7]); }

  const ch = { root, body, hips, torso: t, torsoMesh, head, neck, R, skin, opts: o, headScale: o.head };

  buildOutfit(ch, o.outfit, skin);
  // ---- arms ----
  const mkArm = (s) => {
    const sh = new THREE.Group(); sh.position.set(s * 0.275 * W, 0.47, 0); torso.add(sh);
    const sl = ch.sleeveFull ? 1 : ch.sleeveLen;
    const mSl = ch.sleeveMat;
    add(sh, limbGeo(0.082, 0.07, 0.21), skin, [0, 0, 0]);                                               // upper arm (skin)
    const upLen = ch.sleeveFull ? 0.215 : Math.max(0.0, 0.215 * ch.sleeveLen);
    add(sh, sph(0.088, 16, 12), mSl, [0, -0.005, 0]);                                                   // shoulder cap
    if (upLen > 0.01) add(sh, limbGeo(0.087, 0.078, upLen), mSl, [0, 0, 0]);                              // sleeve
    if (upLen > 0.01 && !ch.sleeveFull) add(sh, tor(0.079, 0.014, 6, 20), mat(shade(o.outfit.color, 0.78)), [0, -upLen, 0], [Math.PI / 2, 0, 0]);
    const el = new THREE.Group(); el.position.y = -0.215; sh.add(el);
    add(el, sph(0.07, 14, 10), ch.sleeveFull ? mSl : skin, [0, 0, 0]);
    add(el, limbGeo(0.069, 0.058, 0.19), ch.sleeveFull ? mSl : skin, [0, 0, 0]);                         // forearm
    if (ch.sleeveFull) add(el, tor(0.06, 0.017, 8, 20), mat(shade(o.outfit.color, 0.78)), [0, -0.19, 0], [Math.PI / 2, 0, 0]); // rib cuff
    const hand = makeHand(ch, s, mat(o.hands ?? o.skin, { rough: 0.55 }), o.detail); hand.root.position.y = -0.205; el.add(hand.root);
    const hold = new THREE.Group(); hold.position.set(0, -0.085, 0.0); hand.root.add(hold);
    setHand(hand, 'relaxed');
    return { sh, el, hand, hold };
  };
  const aL = mkArm(1), aR = mkArm(-1);
  ch.aL = aL; ch.aR = aR; ch.handL = aL.hand.root; ch.handR = aR.hand.root; ch.holdL = aL.hold; ch.holdR = aR.hold;

  // ---- legs ----
  const pc = o.pants.color, mP = mat(pc, { rough: 0.8 }), pdk = mat(shade(pc, 0.78), { rough: 0.85 });
  const longPants = o.pants.type === 'long' || ch.pantsFull, shorts = o.pants.type === 'shorts', skirtish = ch.dress || o.pants.type === 'skirt';
  // pelvis blending torso into legs
  if (!skirtish) add(hips, sph(0.24, 24, 16), mP, [0, -0.05, 0], [0, 0, 0], [W * 1.02, 0.62, 0.9]);
  else if (o.pants.type === 'skirt' && !ch.dress) add(hips, latheProfile([[0.0, -0.4], [0.38, -0.38], [0.34, -0.2], [0.27, -0.06], [0.235, 0.0]], 36), mP, [0, 0, 0]);
  const footBits = [];
  const mkLeg = (s) => {
    const hip = new THREE.Group(); hip.position.set(s * 0.115 * W, -0.03, 0); hips.add(hip);
    add(hip, limbGeo(0.104, 0.088, 0.255), skin, [0, 0, 0]);                                              // thigh (skin)
    if (!skirtish) {
      if (longPants) add(hip, limbGeo(0.116, 0.1, 0.255), mP, [0, 0, 0]);
      else if (shorts) { add(hip, limbGeo(0.118, 0.116, 0.15), mP, [0, 0, 0]); add(hip, tor(0.117, 0.014, 6, 24), pdk, [0, -0.15, 0], [Math.PI / 2, 0, 0]); }
    }
    const kn = new THREE.Group(); kn.position.y = -0.255; hip.add(kn);
    add(kn, sph(0.085, 14, 10), longPants && !skirtish ? mP : skin, [0, 0, 0]);
    add(kn, limbGeo(0.087, 0.07, 0.235), skin, [0, 0, 0]);                                              // shin (skin)
    if (longPants && !skirtish) add(kn, limbGeo(0.098, 0.086, 0.215), mP, [0, 0, 0]);
    if (!low) add(kn, cyl(0.071, 0.067, 0.1, 14), mat(o.socks, { rough: 0.9 }), [0, -0.205, 0]);              // sock cuff
    if (longPants && !skirtish && !low) add(kn, tor(0.083, 0.013, 6, 20), pdk, [0, -0.2, 0], [Math.PI / 2, 0, 0]);
    const foot = new THREE.Group(); foot.position.y = -0.24; kn.add(foot);
    add(foot, sph(0.108, 22, 14), mat(o.shoes, { rough: 0.5 }), [0, 0.005, 0.06], [0, 0, 0], [0.93, 0.66, 1.5]);      // upper
    add(foot, sph(0.108, 22, 12), mat(o.shoeSole, { rough: 0.7 }), [0, -0.036, 0.062], [0, 0, 0], [0.95, 0.34, 1.5]);   // sole
    if (!low) {
      add(foot, sph(0.075, 14, 10), mat(0xffffff, { rough: 0.5 }), [0, -0.012, 0.15], [0, 0, 0], [1.0, 0.6, 0.75]);   // toe cap
      add(foot, rbox(0.085, 0.012, 0.09, 0.005), mat(0xf2f2f2), [0, 0.054, 0.065], [-0.35, 0, 0]);                     // laces
      add(foot, sph(0.05, 10, 8), mat(o.shoes), [0, 0.06, -0.01], [0, 0, 0], [1, 0.6, 0.9]);                          // tongue/ankle
    }
    footBits.push(foot);
    return { hip, kn, foot };
  };
  const lL = mkLeg(1), lR = mkLeg(-1);
  ch.lL = lL; ch.lR = lR; ch.feet = footBits;
  if (o.belt) add(hips, tor(0.25, 0.02, 6, 36), mat(o.belt), [0, 0.02, 0], [Math.PI / 2, 0, 0]);

  // hair
  if (low) { const hm = mat(o.hair.color, { rough: 0.7 }); if (o.hair.style !== 'bald') { const c = add(head, sph(R * 1.04, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), hm, [0, R * 0.06, -R * 0.05]); c.rotation.x = -0.5; if (o.hair.style === 'long' || o.hair.style === 'curly') add(head, sph(R * 1.0, 16, 12), hm, [0, -R * 0.2, -R * 0.4], [0, 0, 0], [1, 1.2, 0.8]); if (o.hair.style === 'bun') add(head, sph(R * 0.35, 10, 8), hm, [0, R * 1.15, -R * 0.35]); } }
  else { const HATS = ['topHat', 'cap', 'flatCap', 'paperHat', 'helmet', 'hardHat', 'nemes', 'knightHelm']; const hatted = o.acc.some((a) => HATS.includes(typeof a === 'string' ? a.split(':')[0] : a[0])); buildHair(head, R, hatted && o.hair.style !== 'bald' ? 'hatHair' : o.hair.style, o.hair.color, o.seed); }

  buildFace(ch, o);
  for (const a of o.acc) {
    const [name, ...args] = typeof a === 'string' ? a.split(':') : a;
    const fn = ACC[name]; if (!fn) { console.warn('unknown acc', name); continue; }
    fn(ch, ...args.map((x) => (x?.startsWith?.('0x') ? parseInt(x) : x)));
  }
  root.scale.setScalar(o.height);

  // ---- API ----
  ch.pose = (p) => { applyPose(ch, p); ch.refreshHeld(); };
  ch.face = (f) => applyFace(ch, f);
  ch.hand = (side, g) => setHand(side === 'L' ? aL.hand : aR.hand, g);
  ch.hold = (obj, side = 'R', opt = {}) => {
    const A = side === 'L' ? aL : aR; A.hold.add(obj);
    const gr = obj.userData.grip ?? {}; obj.position.set(...(opt.pos ?? gr.pos ?? [0, 0, 0])); obj.rotation.set(...(opt.rot ?? gr.rot ?? (gr.upright ? [Math.PI / 2, 0, 0] : [0, 0, 0])));
    setHand(A.hand, opt.grip ?? gr.hand ?? 'grip'); return obj;
  };
  ch.upright = [];
  ch.holdUpright = (obj, side = 'R', opt = {}) => { const A = side === 'L' ? aL : aR; A.hold.add(obj); obj.position.set(...(opt.pos ?? [0, 0, 0])); setHand(A.hand, opt.grip ?? obj.userData.grip?.hand ?? 'grip'); ch.upright.push(obj); ch.refreshHeld(); return obj; };
  ch.refreshHeld = () => { if (!ch.upright.length) return; ch.root.updateMatrixWorld(true); const q = new THREE.Quaternion(); for (const o of ch.upright) { o.parent.getWorldQuaternion(q); o.quaternion.copy(q.invert()); } };
  ch.carry = (obj, off = [0, 0.02, 0.42]) => { ch.torso.add(obj); obj.position.set(...off); setHand(aL.hand, 'flat'); setHand(aR.hand, 'flat'); return obj; };
  ch.plant = () => plant(ch);
  ch.pose(POSES.idle(0));
  ch.face({});
  return ch;
}

// Drop the body so the lowest sole touches y=0 (root-local), for sits/crouches/kneels.
function plant(ch) {
  ch.body.position.y = 0; ch.root.updateMatrixWorld(true);
  let minY = Infinity; const inv = new THREE.Matrix4().copy(ch.root.matrixWorld).invert(); const v = new THREE.Vector3();
  for (const f of ch.feet) { f.updateWorldMatrix(true, false); for (const dx of [-1, 1]) for (const dz of [-0.1, 0.2]) { v.set(dx * 0.1, -0.085, dz).applyMatrix4(f.matrixWorld).applyMatrix4(inv); minY = Math.min(minY, v.y); } }
  ch.body.position.y = -minY;
}

// ---------- face ----------
const IRIS = [0x6b3f1f, 0x3d7fc4, 0x4f8a3c, 0x8a5a2b, 0x2f6a8a, 0x5a3a20];   // brown, blue, green, hazel, teal, dark brown
function buildFace(ch, o) {
  const R = ch.R, h = ch.head, es = o.eyeSize;
  const F = { eyes: [], brows: [], lids: [] };
  const sclera = mat(o.eyeColor, { rough: 0.3 }), pupilM = mat(o.iris, { rough: 0.25 }), skinM = ch.skin;
  const lashM = mat(0x1a1210);
  for (const s of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(s * R * 0.335, R * 0.12, R * 0.8); eg.rotation.y = s * 0.22; h.add(eg);
    add(eg, sph(R * 0.3 * es, 32, 22), sclera, [0, 0, 0], [0, 0, 0], [1, 1.12, 0.6]);
    const pg = new THREE.Group(); pg.position.z = R * 0.3 * es * 0.6 * 0.88; eg.add(pg);
    // coloured iris ring (darker rim, lighter centre) + pupil + two catchlights: eyes read as eyes, not black buttons
    const irisC = o.irisColor ?? IRIS[(o.seed ?? 1) % IRIS.length];
    add(pg, sph(R * 0.17 * es, 28, 16), mat(shade(irisC, 0.55), { rough: 0.3 }), [0, 0, -R * 0.012 * es], [0, 0, 0], [1, 1, 0.4]);
    add(pg, sph(R * 0.15 * es, 28, 16), mat(irisC, { rough: 0.25 }), [0, 0, -R * 0.004 * es], [0, 0, 0], [1, 1, 0.42]);
    const pupil = add(pg, sph(R * 0.095 * es, 24, 16), pupilM, [0, 0, R * 0.006 * es], [0, 0, 0], [1, 1, 0.45]);
    const glint = mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 });
    add(pg, sph(R * 0.05 * es, 10, 8), glint, [R * 0.055 * es, R * 0.06 * es, R * 0.06 * es], [0, 0, 0], [1, 1, 0.5]);
    add(pg, sph(R * 0.022 * es, 8, 6), glint, [-R * 0.06 * es, -R * 0.05 * es, R * 0.058 * es], [0, 0, 0], [1, 1, 0.5]);
    const lidPivot = new THREE.Group(); eg.add(lidPivot);
    const lid = add(lidPivot, sph(R * 0.312 * es, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skinM, [0, 0, 0], [0, 0, 0], [1, 1.12, 0.62]); lid.castShadow = false;
    if (o.lashes) for (let k = 0; k < 3; k++) { const ang = (0.55 + k * 0.28); add(lidPivot, cap(R * 0.014, R * 0.07, 3, 5), lashM, [s * Math.sin(ang) * R * 0.3 * es, Math.cos(ang) * R * 0.3 * es * 1.12 * 0.95, R * 0.07], [0, 0, -s * (0.4 + k * 0.5) + (s > 0 ? 0 : 0)]); }
    const brow = new THREE.Group(); brow.position.set(s * R * 0.335, R * 0.5, R * 0.87); brow.rotation.y = s * 0.3; h.add(brow);
    add(brow, cap(R * 0.085, R * 0.28, 5, 12), mat(o.brow, { rough: 0.8 }), [0, 0, 0], [0, 0, Math.PI / 2]);
    F.eyes.push({ eg, pupil, pg, s, es }); F.lids.push(lidPivot); F.brows.push({ g: brow, s, baseY: R * 0.52 });
    // cheeks
    if (o.blush > 0) add(h, sph(R * 0.14, 12, 8), mat(new THREE.Color(o.skin).lerp(new THREE.Color(0xff6a7a), 0.28 * o.blush).getHex(), { rough: 0.7 }), [s * R * 0.58, -R * 0.2, R * 0.74], [0, s * 0.5, 0], [1, 0.7, 0.35]);
    if (o.freckles) for (let k = 0; k < 4; k++) add(h, sph(R * 0.022, 6, 5), mat(0x9a5a3a), [s * R * (0.45 + (k % 2) * 0.1), -R * (0.05 + (k >> 1) * 0.07), R * 0.9], [0, 0, 0], [1, 1, 0.3]);
  }
  add(h, sph(R * 0.12 * o.nose, 16, 12), mat(o.skin, { rough: 0.5 }), [0, -R * 0.12, R * 0.97], [0, 0, 0], [1, 0.9, 0.9]);
  const mouth = new THREE.Group(); mouth.position.set(0, -R * 0.45, R * 0.9); h.add(mouth);
  const darkM = new THREE.MeshStandardMaterial({ color: 0x4a1218, roughness: 0.4 });
  const mm = new THREE.Mesh(sph(1, 24, 16), darkM); mouth.add(mm);
  const tongue = new THREE.Mesh(sph(1, 14, 10), new THREE.MeshStandardMaterial({ color: 0xd9505d, roughness: 0.5 })); mouth.add(tongue);
  const teeth = new THREE.Mesh(box(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); mouth.add(teeth);
  const smile = new THREE.Mesh(tor(1, 0.1, 8, 24, Math.PI), darkM); smile.position.z = R * 0.04; mouth.add(smile);
  F.mouth = { g: mouth, mm, tongue, teeth, smile };
  ch.F = F;
}
// Film clock for automatic secondary motion (blinks, breathing). The page sets CLOCK.t once per frame before drawing,
// so every character stays a pure function of time. Faces may pass blink:false to hold the eyes (e.g. a stare).
export const CLOCK = { t: 0 };
const FACE_DEFAULT = { open: 0, smile: 0.25, brow: 0, browTilt: 0, pupil: [0, 0], pupilSize: 1, eye: 1, lid: 0, wide: 1, teeth: false };
function applyFace(ch, f) {
  const o = { ...FACE_DEFAULT, ...f }, R = ch.R, F = ch.F;
  if (f.blink !== false) { const bp = (CLOCK.t + (ch.opts.seed ?? 1) * 1.37) % 3.3; if (bp < 0.14) o.lid = Math.max(o.lid, 1 - Math.abs(bp - 0.07) / 0.07 * 0.15); }
  for (let i = 0; i < 2; i++) {
    const e = F.eyes[i], s = e.s;
    e.eg.scale.setScalar(o.eye);
    e.pg.position.x = o.pupil[0] * R * 0.12; e.pg.position.y = o.pupil[1] * R * 0.12;
    e.pupil.scale.set(o.pupilSize, o.pupilSize, 0.45);
    F.lids[i].rotation.x = -Math.PI / 2 + o.lid * Math.PI * 1.02;
    const b = F.brows[i];
    b.g.position.y = b.baseY + o.brow * R * 0.18 + (o.eye - 1) * R * 0.12;
    b.g.rotation.z = s * o.browTilt * 0.7;
  }
  const m = F.mouth, open = o.open;
  if (open > 0.04) {
    m.mm.visible = true; m.smile.visible = false;
    m.mm.scale.set(R * (0.12 + 0.1 * Math.min(1, open) + 0.06 * o.wide), R * (0.02 + 0.2 * open), R * 0.08);
    m.tongue.visible = open > 0.35; m.tongue.position.set(0, -R * 0.1 * open, R * 0.02); m.tongue.scale.set(R * 0.12, R * 0.045 * open, R * 0.05);
    m.teeth.visible = !!o.teeth || open > 0.6; m.teeth.scale.set(R * 0.2, R * 0.04, R * 0.04); m.teeth.position.set(0, R * 0.16 * open, R * 0.05);
  } else {
    m.mm.visible = false; m.tongue.visible = false; m.teeth.visible = false;
    m.smile.visible = Math.abs(o.smile) > 0.02;
    const k = Math.abs(o.smile);
    m.smile.scale.set(R * 0.22 * (0.5 + 0.5 * k) * o.wide, R * 0.22 * k * (o.smile > 0 ? 1 : 0.7), R * 0.3);
    m.smile.rotation.z = o.smile > 0 ? Math.PI : 0;
    m.smile.position.y = o.smile > 0 ? R * 0.06 * k : -R * 0.02;
  }
}

// ---------- poses ----------
// joints: arms/legs "f" = forward swing, "s" = sideways raise, "e"/"k" = elbow/knee bend; hL/hR = hand preset name or [thumb,index,mid,ring,pinky]
const J0 = { bob: 0, lean: 0, twist: 0, roll: 0, hx: 0, hy: 0, hz: 0, squash: 1, rotY: 0, aLf: 0, aLs: 0.1, aLe: 0.12, aRf: 0, aRs: 0.1, aRe: 0.12, lLf: 0, lLk: 0, lRf: 0, lRk: 0, lLs: 0.03, lRs: 0.03, hL: 'relaxed', hR: 'relaxed', plant: false, footFlat: 0 };
function applyPose(ch, p) {
  const j = { ...J0, ...p };
  ch.hips.position.y = HIPS_Y + j.bob;
  ch.torso.rotation.set(j.lean, j.twist, j.roll);
  ch.head.rotation.set(j.hx, j.hy, j.hz);
  const breath = 1 + Math.sin(CLOCK.t * 2.2 + (ch.opts.seed ?? 1)) * 0.008;   // gentle breathing on everyone
  ch.body.scale.set(1 / Math.sqrt(j.squash), j.squash * breath, 1 / Math.sqrt(j.squash));
  ch.body.position.y = 0; ch.hips.rotation.y = j.rotY;
  ch.aL.sh.rotation.set(-j.aLf, 0, j.aLs); ch.aL.el.rotation.x = -j.aLe;
  ch.aR.sh.rotation.set(-j.aRf, 0, -j.aRs); ch.aR.el.rotation.x = -j.aRe;
  ch.lL.hip.rotation.set(-j.lLf, 0, -j.lLs); ch.lL.kn.rotation.x = j.lLk; ch.lL.foot.rotation.x = (j.lLf * 0.3 - j.lLk * 0.25) * (1 - j.footFlat) + (j.lLf - j.lLk) * j.footFlat;
  ch.lR.hip.rotation.set(-j.lRf, 0, j.lRs); ch.lR.kn.rotation.x = j.lRk; ch.lR.foot.rotation.x = (j.lRf * 0.3 - j.lRk * 0.25) * (1 - j.footFlat) + (j.lRf - j.lRk) * j.footFlat;
  if (!ch.heldL) setHand(ch.aL.hand, j.hL); if (!ch.heldR) setHand(ch.aR.hand, j.hR);
  if (j.plant) plant(ch);
}
const sin = Math.sin, PI = Math.PI;
export const POSES = {
  idle: (t = 0) => ({ bob: sin(t * 3) * 0.006, lean: sin(t * 1.5) * 0.01, aLs: 0.12, aRs: 0.12, aLe: 0.14, aRe: 0.14, hy: sin(t * 0.8) * 0.05, lLs: 0.03, lRs: 0.03 }),
  run: (t = 0, k = 9) => { const a = sin(t * k), b = sin(t * k + PI); return { bob: Math.abs(sin(t * k)) * 0.07, lean: 0.25, aLf: a * 1.1, aRf: b * 1.1, aLe: 1.1 + Math.max(0, a) * 0.5, aRe: 1.1 + Math.max(0, b) * 0.5, aLs: 0.1, aRs: 0.1, lLf: b * 0.9, lRf: a * 0.9, lLk: Math.max(0, a) * 1.3, lRk: Math.max(0, b) * 1.3, twist: a * 0.18, hL: 'fist', hR: 'fist' }; },
  walk: (t = 0, k = 5) => { const a = sin(t * k), b = sin(t * k + PI); return { bob: Math.abs(a) * 0.03, aLf: a * 0.5, aRf: b * 0.5, aLe: 0.25, aRe: 0.25, lLf: b * 0.45, lRf: a * 0.45, lLk: Math.max(0, a) * 0.5, lRk: Math.max(0, b) * 0.5, twist: a * 0.08 }; },
  shock: (t = 0) => ({ bob: 0.04, lean: -0.15, hx: -0.12, squash: 1.04, aLf: 0.35, aLs: 1.1, aLe: 0.55, aRf: 0.35, aRs: 1.1, aRe: 0.55, lLs: 0.12, lRs: 0.12, lLk: 0.1, lRk: 0.1, hL: 'spread', hR: 'spread' }),
  cheer: (t = 0) => ({ bob: Math.abs(sin(t * 8)) * 0.1, aLf: 0.15, aLs: 2.7 + sin(t * 8) * 0.2, aLe: 0.35, aRf: 0.15, aRs: 2.7 - sin(t * 8) * 0.2, aRe: 0.35, lLk: 0.3, lRk: 0.3, hx: -0.15, hL: 'fist', hR: 'fist' }),
  wave: (t = 0) => ({ aRs: 2.2, aRf: 0, aRe: 0.5 + sin(t * 9) * 0.5, aLs: 0.12, hz: 0.08, bob: sin(t * 3) * 0.01, hR: 'open' }),
  deadpan: (t = 0) => ({ aLs: 0.1, aRs: 0.1, aLe: 0.08, aRe: 0.08, hz: 0.04, hx: 0.04 }),
  point: (t = 0) => ({ aRf: 1.5, aRs: 0.12, aRe: 0.05, lean: 0.05, hy: -0.2, hR: 'point' }),
  hugOpen: (t = 0, k = 1) => ({ aLf: 0.25, aLs: 1.35 * k + 0.1, aLe: 0.3, aRf: 0.25, aRs: 1.35 * k + 0.1, aRe: 0.3, hx: -0.05, lean: -0.05, bob: 0.01, hL: 'open', hR: 'open' }),
  hugClosed: (t = 0) => ({ aLf: 1.25, aLs: 0.25, aLe: 1.6, aRf: 1.25, aRs: 0.25, aRe: 1.6, lean: 0.12, hx: 0.15, squash: 0.97, hL: 'open', hR: 'open' }),
  hugLerp: (k = 0) => { const a = POSES.hugOpen(0, 1), b = POSES.hugClosed(0), o = { hL: 'open', hR: 'open' }; for (const key of Object.keys({ ...a, ...b })) { if (key === 'hL' || key === 'hR') continue; o[key] = (a[key] ?? J0[key] ?? 0) * (1 - k) + (b[key] ?? J0[key] ?? 0) * k; } return o; },
  // sitting: pass the seat height (hips rest on it); plant() afterwards puts the feet on the floor
  sit: (t = 0, seat = 0.45) => ({ bob: seat - HIPS_Y + 0.02, aLf: 0.55, aLe: 0.9, aRf: 0.55, aRe: 0.9, lLf: 1.4, lRf: 1.4, lLk: 1.4, lRk: 1.4, lean: 0.03 }),
  // Seat-aware sitting: pelvis rests on a seat whose top is at height `seat` (cushion >= 0.14 thick hides the pelvis), thighs ~70deg forward,
  // knee solved so the soles land exactly on y=0, feet flat. Natural seat heights for this rig: 0.30-0.38 (chairs, benches, stools).
  sitOn: (t = 0, seat = 0.34, o = {}) => {
    const hipJoint = seat + 0.06, a = o.thigh ?? 1.2, T = 0.255, S = 0.24, F = 0.08;
    const need = (hipJoint - F - T * Math.cos(a)) / S, k = a - Math.acos(Math.max(-1, Math.min(1, need)));
    return { bob: hipJoint + 0.03 - HIPS_Y, lLf: a, lRf: a, lLk: k, lRk: k, footFlat: 1, aLf: 0.55, aRf: 0.55, aLe: 0.9, aRe: 0.9, lean: 0.03, lLs: 0.06, lRs: 0.06, ...o.extra };
  },
  clap: (t = 0) => { const a = (sin(t * 12) + 1) / 2; return { aLf: 1.2, aRf: 1.2, aLs: 0.08 + a * 0.4, aRs: 0.08 + a * 0.4, aLe: 1.25, aRe: 1.25, hx: -0.05, hL: 'open', hR: 'open' }; },
  cower: (t = 0) => ({ lean: 0.2, hx: 0.2, squash: 0.92, aLf: 1.1, aLs: 0.2, aLe: 1.8, aRf: 1.1, aRs: 0.2, aRe: 1.8, lLk: 0.5, lRk: 0.5, bob: -0.05, hL: 'fist', hR: 'fist' }),
  float: (t = 0) => ({ bob: 0.15 + sin(t * 2) * 0.05, aLf: 0.3, aRf: 0.3, aLs: 0.6, aRs: 0.6, aLe: 0.6, aRe: 0.6, lLk: 0.2, lRk: 0.2, lLf: 0.3, lRf: -0.1 }),
  // one-hand hold in front (stick/tool/cone/mic/phone): palm faces inward, item sits in the fist
  holdR: (t = 0) => ({ aRf: 1.05, aRs: 0.16, aRe: 1.2, lean: 0.02, hR: 'grip' }),
  holdL: (t = 0) => ({ aLf: 1.05, aLs: 0.16, aLe: 1.2, lean: 0.02, hL: 'grip' }),
  holdBoth: (t = 0) => ({ aLf: 1.0, aRf: 1.0, aLe: 1.1, aRe: 1.1, aLs: 0.25, aRs: 0.25, hL: 'grip', hR: 'grip' }),
  carry: (t = 0) => ({ aLf: 0.95, aRf: 0.95, aLe: 0.9, aRe: 0.9, aLs: 0.42, aRs: 0.42, lean: -0.06, hL: 'flat', hR: 'flat' }),
  tray: (t = 0) => ({ aRf: 1.2, aRe: 1.9, aRs: 0.3, hR: 'flat', lean: -0.04 }),
  think: (t = 0) => ({ aRf: 1.9, aRe: 2.4, aRs: 0.1, hR: 'point', hx: 0.1, hz: 0.1 }),
  slump: (t = 0) => ({ lean: 0.18, hx: 0.25, aLs: 0.05, aRs: 0.05, bob: -0.02, squash: 0.98 }),
  flex: (t = 0) => ({ aLs: 1.5, aLe: 2.0, aRs: 1.5, aRe: 2.0, lean: -0.05, hL: 'fist', hR: 'fist' }),
  arms_crossed: (t = 0) => ({ aLf: 0.9, aRf: 0.9, aLe: 2.0, aRe: 2.0, aLs: -0.25, aRs: -0.25, hL: 'loose', hR: 'loose' }),
  stretchUp: (t = 0) => ({ aLs: 2.9, aRs: 2.9, aLe: 0.1, aRe: 0.1, hL: 'open', hR: 'open', lean: -0.08, hx: -0.15 }),
  dust: (t = 0) => ({ aRf: 1.0, aRe: 2.1, aRs: 0.5, hR: 'flat', hz: 0.12, lean: 0.04 }),   // brushing the shoulder off
};


// Faces for common emotions (spread into ch.face())
export const FACES = {
  neutral: { smile: 0.2 },
  happy: { smile: 0.8, brow: 0.4, wide: 1.2 },
  shock: { open: 0.9, brow: 1, eye: 1.35, pupilSize: 0.55, smile: 0 },
  scream: { open: 1, brow: 1, eye: 1.45, pupilSize: 0.5, wide: 1.3, teeth: true },
  question: { open: 0.35, brow: 0.8, browTilt: 0.5, pupil: [0, 0.3], smile: 0 },
  deadpan: { smile: 0, lid: 0.3, brow: -0.2 },
  smug: { smile: 0.5, lid: 0.35, brow: 0.2, browTilt: -0.3 },
  angry: { open: 0.4, brow: -0.6, browTilt: -0.8, teeth: true, smile: 0, lid: 0.15 },
  sad: { smile: -0.6, brow: 0.3, browTilt: 0.6 },
  love: { smile: 0.9, brow: 0.5, eye: 1.25, pupilSize: 1.5, wide: 1.3 },
  excited: { open: 0.65, brow: 0.8, eye: 1.2, teeth: true, wide: 1.2 },
  sleepy: { smile: 0.1, lid: 0.7 },
};

// ---------- presets (all complete; no implicit merge with hero) ----------
export const PRESETS = {
  hero: { skin: SKIN.peach, seed: 3, hair: { style: 'messy', color: 0x4a2f1c }, outfit: { type: 'hoodie', color: 0xe53935 }, pants: { type: 'shorts', color: 0x2f6fd6 }, shoes: C.white, acc: ['headband:' + '0xffd23f'] },
  mum: { skin: SKIN.tan, lashes: true, seed: 5, hair: { style: 'bun', color: 0x2d1b14 }, outfit: { type: 'tee', color: 0x8a52c9 }, pants: { type: 'long', color: 0x3a3f66 }, shoes: 0xb84a6a, acc: [] },
  dad: { skin: SKIN.peach, hair: { style: 'short', color: 0x22170f }, outfit: { type: 'hoodie', color: 0x2fa66a }, pants: { type: 'long', color: 0x4a4a52 }, shoes: 0x333333, width: 1.12, acc: ['beard:0x4a3426'] },
  kid: { skin: SKIN.peach, freckles: true, hair: { style: 'spiky', color: 0x7a4a22 }, outfit: { type: 'tee', color: 0xffb300 }, pants: { type: 'shorts', color: 0x4aa0e0 }, shoes: 0xee4444, height: 0.62, head: 1.18 },
  grandma: { skin: SKIN.pale, hair: { style: 'white-fluffy', color: 0xdcdcdc }, outfit: { type: 'cardigan', color: 0x6aa86a, color2: 0xf2e6c8 }, pants: { type: 'skirt', color: 0x7a5a8a }, shoes: 0x6a4a3a, height: 0.92, acc: ['glasses:0x6a4a3a'] },
  // ---- ep3 cast ----
  neighbourMan: { skin: SKIN.tan, hair: { style: 'bald', color: 0 }, outfit: { type: 'tee', color: 0x4a90a4 }, pants: { type: 'shorts', color: 0xc8b88a }, shoes: 0x7a5a3a, width: 1.15, acc: ['bigmustache:0x7a7a82'] },
  neighbourWoman: { skin: SKIN.brown, lashes: true, seed: 8, hair: { style: 'curly', color: 0x1e1410 }, outfit: { type: 'dress', color: 0xff7aa0 }, pants: { type: 'shorts', color: 0xff7aa0 }, shoes: 0xffffff, acc: [] },
  neighbourTeen: { skin: SKIN.dark, hair: { style: 'spiky', color: 0x120c08 }, outfit: { type: 'jersey', color: 0x2f6fd6, color2: C.white }, pants: { type: 'shorts', color: 0x222222 }, shoes: 0xffd23f, height: 0.9, acc: ['cap:0xffd23f:rev'] },
  neighbourGranny: { skin: SKIN.pale, hair: { style: 'bun', color: 0xcfcfd6 }, outfit: { type: 'cardigan', color: 0xe77a9a }, pants: { type: 'skirt', color: 0x3a5a8a }, shoes: 0x4a3a30, height: 0.9, acc: ['glasses:0x7a3a5a'] },
  postman: { skin: SKIN.tan, hair: { style: 'short', color: 0x2a1a10 }, outfit: { type: 'tee', color: 0x2850a0 }, pants: { type: 'shorts', color: 0x2850a0 }, shoes: 0x222222, acc: ['cap:0xc8302b', 'mailbag'] },
  iceCreamMan: { skin: SKIN.peach, hair: { style: 'parting', color: 0x6a4a28 }, outfit: { type: 'tee', color: 0xffffff }, pants: { type: 'long', color: 0x5a8ad6 }, shoes: 0xffffff, width: 1.1, acc: ['paperHat:0xffffff', 'mustache:0x6a4a28'] },
  magician: { skin: SKIN.pale, hair: { style: 'parting', color: 0x120d0a }, outfit: { type: 'suit', color: 0x2a1a4a }, pants: { type: 'long', color: 0x2a1a4a }, shoes: 0x111111, acc: ['topHat', 'bowtie:0xe53935', 'cape:0x6a2aa0', 'mustache:0x120d0a', 'wand'] },
  judgeA: { skin: SKIN.peach, hair: { style: 'parting', color: 0x6a4a28 }, outfit: { type: 'suit', color: 0x1f2a44 }, pants: { type: 'long', color: 0x1f2a44 }, shoes: 0x111111, acc: ['tie:0xe53935'] },
  judgeB: { skin: SKIN.brown, hair: { style: 'curly', color: 0x15100c }, outfit: { type: 'suit', color: 0x7a1f3a }, pants: { type: 'long', color: 0x7a1f3a }, shoes: 0x111111, acc: ['tie:0xffd23f', 'glasses:0x111111'] },
  judgeC: { skin: SKIN.pale, lashes: true, hair: { style: 'long', color: 0xc9a24a }, outfit: { type: 'dress', color: 0x2a9d8f }, pants: { type: 'long', color: 0x2a9d8f }, shoes: 0xffd23f, acc: [] },
  judgeD: { skin: SKIN.dark, hair: { style: 'bald', color: 0 }, outfit: { type: 'suit', color: 0xd9d9e0 }, pants: { type: 'long', color: 0xd9d9e0 }, shoes: 0x111111, width: 1.1, acc: ['sunglasses', 'tie:0x2f6fd6'] },
  host: { skin: SKIN.tan, hair: { style: 'spiky', color: 0x1a120c }, outfit: { type: 'suit', color: 0xff3d8a }, pants: { type: 'long', color: 0x2a1a4a }, shoes: 0xffd23f, acc: ['bowtie:0xffd23f', 'badge'] },
  scientistA: { skin: SKIN.peach, hair: { style: 'messy', color: 0xd8a83a }, outfit: { type: 'coat', color: 0xffffff }, pants: { type: 'long', color: 0x3a3f66 }, shoes: 0x333333, acc: ['goggles:0x3a9a6a'] },
  scientistB: { skin: SKIN.brown, hair: { style: 'bun', color: 0x15100c }, outfit: { type: 'coat', color: 0xffffff }, pants: { type: 'long', color: 0x4a4a52 }, shoes: 0x333333, acc: ['glasses:0xe53935'] },
  chiefScientist: { skin: SKIN.pale, hair: { style: 'white-fluffy', color: 0xf0f0f0 }, outfit: { type: 'coat', color: 0xffffff }, pants: { type: 'long', color: 0x3a3f66 }, shoes: 0x333333, width: 1.05, acc: ['glasses:0x222222', 'bigmustache:0xf0f0f0'] },
  balloonist: { skin: SKIN.tan, hair: { style: 'short', color: 0x6a4a28 }, outfit: { type: 'tee', color: 0x8a5a3a }, pants: { type: 'long', color: 0x5a4a38 }, shoes: 0x4a3a2a, width: 1.1, acc: ['flatCap:0x8a6a48', 'goggles:0x6a9aa5', 'scarf:0xe0b030', 'stubble'] },
  skydiver: { skin: SKIN.brown, hair: { style: 'short', color: 0x120c08 }, outfit: { type: 'jumpsuit', color: 0xff6a2b }, pants: { type: 'long', color: 0xff6a2b }, shoes: 0x222222, acc: ['helmet:0x2f6fd6', 'goggles:0x3a6ea5', 'parachute:0x2f6fd6'] },
  passenger: { skin: SKIN.peach, hair: { style: 'short', color: 0x3a2a1a }, outfit: { type: 'tee', color: 0x7ab0d9 }, pants: { type: 'long', color: 0x3a3f66 }, shoes: 0xeeeeee, acc: [] },
  flightAttendant: { skin: SKIN.tan, lashes: true, hair: { style: 'bun', color: 0x1a120c }, outfit: { type: 'suit', color: 0x1f3a7a }, pants: { type: 'skirt', color: 0x1f3a7a }, shoes: 0x111111, acc: ['scarf:0xe53935'] },
  windowWasher: { skin: SKIN.peach, hair: { style: 'short', color: 0x5a3a1a }, outfit: { type: 'jumpsuit', color: 0x2bb7b0 }, pants: { type: 'long', color: 0x2bb7b0 }, shoes: 0x333333, acc: ['hardHat:0xffd23f', 'harness:0xffd23f', 'mustache:0x5a3a1a'] },
  plazaA: { skin: SKIN.tan, hair: { style: 'short', color: 0x15100c }, outfit: { type: 'tee', color: 0xe76f51 }, pants: { type: 'long', color: 0x264653 }, shoes: 0xeeeeee, acc: [] },
  ghostCaveman: { skin: 0xcfe8ff, hair: { style: 'cavemanMop', color: 0x8fa3c0 }, outfit: { type: 'fur', color: 0xb0c4de }, pants: { type: 'shorts', color: 0xb0c4de }, shoes: 0xb0c4de, width: 1.2, acc: ['club'] },
  ghostPharaoh: { skin: 0xcfe8ff, hair: { style: 'bald', color: 0 }, outfit: { type: 'toga', color: 0xe8f0ff, color2: 0xe8f0ff }, pants: { type: 'skirt', color: 0xe8f0ff }, shoes: 0xb0c4de, acc: ['nemes'] },
  ghostKnight: { skin: 0xcfe8ff, hair: { style: 'bald', color: 0 }, outfit: { type: 'armor', color: 0xaab4c4 }, pants: { type: 'long', color: 0xaab4c4 }, shoes: 0xaab4c4, width: 1.1, acc: ['knightHelm'] },
  ghostViking: { skin: 0xcfe8ff, hair: { style: 'long', color: 0xe0d8a0 }, outfit: { type: 'fur', color: 0xb0a090 }, pants: { type: 'long', color: 0x8090a0 }, shoes: 0x8090a0, width: 1.2, acc: ['helmet:0x9aa4b4:horns', 'beard:0xe0d8a0'] },
  ghostVictorian: { skin: 0xcfe8ff, hair: { style: 'parting', color: 0xc0c8d8 }, outfit: { type: 'suit', color: 0xb8c0d4 }, pants: { type: 'long', color: 0xb8c0d4 }, shoes: 0xb8c0d4, acc: ['topHat:0xb8c0d4:0xdde4f0', 'bigmustache:0xe8e8f0', 'bowtie:0xdde4f0'] },
};

// Turn any character translucent / glowing (ghosts).
export function ghostify(ch, color = 0xbfe0ff, opacity = 0.7) {
  ch.root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material.clone();
    const base = new THREE.Color(m.color).lerp(new THREE.Color(color), 0.75);
    m.color.copy(base); m.emissive = new THREE.Color(color); m.emissiveIntensity = 0.45; m.metalness = 0; m.roughness = 0.6;
    m.transparent = true; m.opacity = opacity; m.depthWrite = true;
    o.material = m; o.castShadow = false;
  });
  return ch;
}

// Random background person from a seed (crowds).
export function randomPerson(r, outfitColors = [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x264653, 0xf4a261, 0x7b2cbf, 0x3a86ff, 0xff006e]) {
  const skins = Object.values(SKIN), hairs = ['short', 'messy', 'bun', 'curly', 'long', 'spiky', 'bald', 'parting', 'pigtails'];
  const accs = [[], [], [], ['glasses'], ['cap:' + '0x' + r.pick(outfitColors).toString(16)], ['mustache'], ['headband:0x' + r.pick(outfitColors).toString(16)]];
  return makeCharacter({
    skin: r.pick(skins), hair: { style: r.pick(hairs), color: r.pick([0x15100c, 0x3a2a1a, 0x6a4a28, 0xc9a24a, 0x8a8a92]) },
    outfit: { type: r.pick(['tee', 'hoodie', 'tee', 'dress', 'jersey']), color: r.pick(outfitColors), color2: C.white }, pants: { type: r.pick(['long', 'shorts', 'long']), color: r.pick([0x3a3f66, 0x4a4a52, 0x2f6fd6, 0x7a5a3a]) },
    shoes: r.pick([0xffffff, 0x222222, 0xee4444]), detail: 'low', seed: Math.floor(r() * 999), height: r.range(0.85, 1.08), head: r.range(0.95, 1.1), width: r.range(0.92, 1.12), acc: r.pick(accs),
  });
}
