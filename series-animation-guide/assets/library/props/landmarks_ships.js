// Landmarks pack: ships and sea life (aircraft carrier, cruise ship, Titanic, blue whale, leaning lighthouse). 1 unit = 1 m.
import { THREE, rng, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade, clamp, lerp, smooth, TAU, COL, lmat, animator, finish, frac, ngon, rectPts, loft, lathe, instances, beams, flagPole, FLAGS, blinker, makeWater, makeCrowd, makeBoats, boatMesh, ringLoft, fbm, hullGeo, smoke, foam, textBoard } from './landmarks_kit.js';
import { birds, drift } from './landmarks_monuments_b.js';

const SEA = (len, A, { amp = 0.5, color = 0x2f86bb, y = 0, scale = 3, opacity } = {}) => { const w = makeWater(len * 3.2, len * 3.2, { seg: 60, amp, color, speed: 1.0, scale, opacity }); w.position.y = y; return w; };
const DS = (c, o = {}) => lmat(c, { side: THREE.DoubleSide, rough: 0.55, ...o });

// ============================================================ Aircraft carrier (Nimitz class, 333 m long)
export function aircraftCarrier({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const L = 333, hull = DS(0x6c7684, { rough: 0.6 }), deckM = lmat(0x585d66, { rough: 0.85 }), grey = lmat(0xa7b0ba, { rough: 0.6 });
  g.add(new THREE.Mesh(hullGeo(L, 40.8, 16, 12, { bowStart: 0.78, sternStart: 0.1, sheer: 0.1 }), hull));
  add(g, loft([{ y: -1.2, pts: [[-42, -150], [-8, -148], [0, -168]] }, { y: -1, pts: [[-42, -150], [-8, -148], [0, -168]] }]), hull).visible = false;
  // flight deck with the angled landing area, 76.8 m across at its widest
  const outline = [[-16, -166], [24, -166], [38.4, -118], [38.4, 52], [26, 150], [0, 166], [-26, 148], [-31, 100], [-40, 20], [-43, -40], [-36, -120]];
  const deck = add(g, loft([{ y: 17.5, pts: outline }, { y: 19.6, pts: outline }]), deckM); deck.castShadow = true;
  add(g, loft([{ y: 15.2, pts: outline.map(([x, z]) => [x * 0.9, z * 0.97]) }, { y: 17.6, pts: outline }]), hull);
  // deck markings: centreline, landing-area lines, catapult tracks, elevators
  const mk = []; for (let z = -150; z < 140; z += 14) mk.push({ p: [0, 19.7, z], s: [0.7, 0.05, 7], c: 0xf4f0e4 });
  for (let z = -150; z < -10; z += 10) mk.push({ p: [-23 + (z + 150) * 0.12, 19.7, z], r: [0, -0.1, 0], s: [0.8, 0.05, 6], c: 0xf4f0e4 });
  for (const x of [10, 18]) mk.push({ p: [x, 19.7, 80], s: [0.7, 0.05, 140], c: 0xffd23f });
  for (const [x, z] of [[-30, -10], [32, -20], [30, 40]]) mk.push({ p: [x, 19.72, z], s: [14, 0.05, 20], c: 0x6a707a });
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.7 }), mk);
  // island superstructure on the starboard side, with rotating radars and masts
  const IS = new THREE.Group(); IS.position.set(30, 19.6, -18); g.add(IS);
  add(IS, box(12, 14, 36), grey, [0, 7, 0]); add(IS, box(10, 12, 24), grey, [-0.5, 20, 0.5]); add(IS, box(7, 8, 14), grey, [0, 30, 2]);
  add(IS, box(14, 1.2, 38), lmat(0x8a929c), [0, 14.3, 0]);
  const wn = []; for (let i = 0; i < 6; i++) wn.push({ p: [-4.2, 20 + (i % 2) * 3, -9 + i * 3.4], s: [0.3, 1.6, 2], c: 0x2a3a4a }); instances(IS, box(1, 1, 1), lmat(0xffffff, { rough: 0.2 }), wn);
  add(IS, cyl(0.5, 0.8, 16, 8), grey, [0, 42, 3]); for (let i = 0; i < 3; i++) add(IS, box(7 - i * 1.4, 0.5, 0.5), grey, [0, 36 + i * 4, 3]);
  const radarA = new THREE.Group(); radarA.position.set(-2, 51, 3); IS.add(radarA); add(radarA, box(9, 3.2, 0.5), lmat(0x9aa2ac), [0, 0, 0]); add(radarA, cyl(0.5, 0.5, 2, 6), grey, [0, -1.8, 0]);
  const radarB = new THREE.Group(); radarB.position.set(1.5, 36, -9); IS.add(radarB); add(radarB, box(5, 2, 0.4), lmat(0x9aa2ac)); const dome = add(IS, sph(2.6, 12, 8), lmat(0xf4f0e4), [1.5, 35.4, 10]);
  A.add((t) => { radarA.rotation.y = t * 2.2; radarB.rotation.y = -t * 3.1; });
  blinker(IS, A, 0, 59, 3, 0xff2a2a, 0.6, { period: 1.3 });
  // parked aircraft: fuselage + wings + twin fins
  const jets = [], r = rng(4);
  const place = (x, z, ry) => jets.push({ x, z, ry });
  for (let i = 0; i < 8; i++) place(-30 + (i % 2) * 5, -150 + i * 9, 0.2); for (let i = 0; i < 6; i++) place(33, 70 + i * 13 * 0.8, -0.3 + (i % 2) * 0.2); for (let i = 0; i < 6; i++) place(-34, 70 - i * 5, 0.5 - i * 0.05);
  for (let i = 0; i < 6; i++) place(17 + (i % 3) * 7, -120 - Math.floor(i / 3) * 12 + 0, 3.0 + i * 0.06);
  const jf = new THREE.InstancedMesh(new THREE.CapsuleGeometry(1.1, 14, 4, 8), lmat(0x8a929c, { rough: 0.5 }), jets.length), jw = new THREE.InstancedMesh(new THREE.BoxGeometry(12, 0.3, 3.4), lmat(0x7a828c, { rough: 0.6 }), jets.length), jt = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 0.3, 2), lmat(0x7a828c), jets.length), jv = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 3.2, 2.4), lmat(0x6a727c), jets.length * 2);
  const o = new THREE.Object3D(); jets.forEach((j, i) => { o.position.set(j.x, 21, j.z); o.rotation.set(Math.PI / 2, j.ry, 0, 'YXZ'); o.rotation.set(Math.PI / 2, 0, 0); o.rotation.order = 'YXZ'; o.rotation.y = j.ry; o.rotation.x = Math.PI / 2; o.updateMatrix(); jf.setMatrixAt(i, o.matrix); o.rotation.set(0, j.ry, 0); o.rotation.order = 'XYZ'; o.position.set(j.x, 20.6, j.z - Math.cos(j.ry) * 0.5); o.updateMatrix(); jw.setMatrixAt(i, o.matrix); o.position.set(j.x - Math.sin(j.ry) * 7, 20.6, j.z - Math.cos(j.ry) * 7); o.updateMatrix(); jt.setMatrixAt(i, o.matrix); for (const s of [-1, 1]) { o.position.set(j.x + Math.cos(j.ry) * s * 1.6 - Math.sin(j.ry) * 6.5, 22.4, j.z - Math.sin(j.ry) * s * 1.6 - Math.cos(j.ry) * 6.5); o.rotation.set(0, j.ry, s * 0.25); o.updateMatrix(); jv.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), o.matrix); } });
  for (const m of [jf, jw, jt, jv]) { m.castShadow = true; g.add(m); }
  // a jet cycling through catapult launch, and one coming in to land
  const mkJet = (c) => { const J = new THREE.Group(); add(J, cyl(1.0, 0.6, 14, 8), lmat(c, { rough: 0.4 }), [0, 0, 0], [Math.PI / 2, 0, 0]); add(J, box(12, 0.3, 3.4), lmat(c), [0, 0, -0.5]); add(J, box(5, 0.3, 2), lmat(c), [0, 0, -6.5]); for (const s of [-1, 1]) add(J, box(0.3, 3, 2.2), lmat(c), [s * 1.5, 1.4, -6]); g.add(J); return J; };
  const launcher = mkJet(0x7a828c), lander = mkJet(0x8a929c);
  A.add((t) => { const c = frac(t / 18);
    if (c < 0.18) { const u = c / 0.18, e = u * u; launcher.visible = true; launcher.position.set(14, 21 + 0.0, lerp(-110, 150, e)); launcher.rotation.set(0, 0, 0); }
    else if (c < 0.5) { const u = (c - 0.18) / 0.32; launcher.visible = true; launcher.position.set(14 + u * 40, 21 + u * u * 300, 150 + u * 500); launcher.rotation.set(-Math.min(0.7, u * 1.6), 0, 0); } else launcher.visible = false;
    if (c > 0.55 && c < 0.95) { const u = (c - 0.55) / 0.4, e = u; lander.visible = true; lander.position.set(lerp(-60, -6, e), lerp(120, 21, Math.pow(e, 1.5)), lerp(-700, -60, e)); lander.rotation.set(0.14 * (1 - u), 0.1, 0); if (u > 0.96) lander.visible = false; } else lander.visible = false; });
  // deck crew (instanced little people moving about) and tow tractors
  makeCrowd(g, A, 40, { x: 0, z: -20, w: 50, d: 300 }, { seed: 4, scale: 1.7, y: 19.7, speed: 0.4, colors: [0xffd23f, 0xe53935, 0x2f6fd6, 0x2fa66a, 0xffffff, 0x8a52c9] });
  // helicopter hovering near the island
  const heli = new THREE.Group(); g.add(heli); add(heli, rbox(3.2, 2.6, 9, 1.1), lmat(0x4a525c), [0, 0, 0]); add(heli, box(0.5, 0.5, 7), lmat(0x4a525c), [0, 0.3, -7]); const rot = new THREE.Group(); rot.position.y = 1.9; heli.add(rot); add(rot, box(16, 0.1, 0.5), lmat(0x222630)); add(rot, box(0.5, 0.1, 16), lmat(0x222630));
  A.add((t) => { heli.position.set(-50 + Math.sin(t * 0.4) * 10, 48 + Math.sin(t * 1.1) * 1.2, -25 + Math.cos(t * 0.3) * 20); heli.rotation.y = 1.6; rot.rotation.y = t * 26; });
  // bow and stern details: catapult shields, side elevators, anchors, flags
  for (const s of [-1, 1]) add(g, box(0.6, 1.4, 20), lmat(0x4a4f58), [s * 20, 20.4, 118]);
  flagPole(IS, A, 0, 59, -14, 6, 4, FLAGS.usa, { phase: 1 });
  porthole(g, lmat(0x1a2230), -150, 130, 11, 20.4, 7, 1.0, 1); porthole(g, lmat(0x1a2230), -150, 130, 11, 20.4, 7, 1.0, -1);
  if (base) {
    const sea = SEA(L, A, { amp: 0.7, y: 0, color: 0x1f78b0 }); g.add(sea); foam(g, A, L, 40.8, { seed: 3 });
    const esc = boatMesh(150, 0x8a929c, { cabinColor: 0xa7b0ba }); esc.position.set(-190, 0, 80); g.add(esc);
    const esc2 = boatMesh(150, 0x8a929c, { cabinColor: 0xa7b0ba }); esc2.position.set(210, 0, -140); g.add(esc2);
    A.add((t) => { esc.position.y = Math.sin(t * 1.3) * 0.5; esc2.position.y = Math.sin(t * 1.1 + 1) * 0.5; esc.rotation.z = Math.sin(t) * 0.02; });
    birds(g, A, 20, 0, 60, 0, 220, 4, 3, 0.25);
    drift(g, A, 8, 2500, 420, 7, 5, 90);
  }
  return finish(g, A, { name: 'Aircraft carrier (Nimitz class)', realHeightM: 60, realLengthM: 333, realWidthM: 77, ladderUseLength: true, source: 'Nimitz class: 333 m long, flight deck 77 m wide; height above waterline ~60 m is UNCERTAIN (keel-to-mast ~76 m)' });
}

// ============================================================ Cruise ship (Oasis class, ~360 m)
export function cruiseShip({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const L = 362, white = lmat(0xf7f5f0, { rough: 0.45 }), navy = DS(0x1f3a6a, { rough: 0.5 });
  g.add(new THREE.Mesh(hullGeo(L, 47, 12, 9.3, { bowStart: 0.8, sternStart: 0.1, sheer: 0.08 }), navy));
  add(g, new THREE.Mesh(hullGeo(L * 0.998, 47.2, 11.5, 0.1, { bowStart: 0.8, sternStart: 0.1, sheer: 0.08 }), white).geometry, DS(0xf7f5f0), [0, 3.5, 0]);
  // decks: nine tiers of cabins (instanced balcony windows), narrowing at the ends; sunny upper decks
  const decks = [[12, 17, 290, 41], [17, 22, 280, 41], [22, 27, 270, 41], [27, 32, 262, 40], [32, 37, 245, 38], [37, 41.5, 214, 36], [41.5, 45, 150, 32], [45, 48.5, 100, 28]];
  const wl = [], bl = [];
  decks.forEach(([y0, y1, len, w], i) => {
    add(g, box(w, y1 - y0, len), white, [0, (y0 + y1) / 2, -L * 0.04 - (i > 5 ? 20 : 0)]);
    add(g, box(w + 0.8, 0.5, len + 0.8), lmat(0xe1dfd8), [0, y1, -L * 0.04 - (i > 5 ? 20 : 0)]);
    for (let z = -len / 2 + 4; z < len / 2 - 4; z += 3.0) for (const s of [-1, 1]) { wl.push({ p: [s * (w / 2 + 0.05), (y0 + y1) / 2 + 0.3, z - L * 0.04 - (i > 5 ? 20 : 0)], s: [0.1, 1.9, 1.7], c: (z * 7 | 0) % 5 === 0 ? 0xffe9a8 : 0x3a5a7a }); if (i > 0 && i < 5) bl.push({ p: [s * (w / 2 + 0.9), (y0 + y1) / 2 - 1.1, z - L * 0.04], s: [1.7, 0.3, 2.9], c: 0xe8e4da }); }
  });
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.2, metal: 0.2 }), wl); instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.6 }), bl);
  // bridge wings, forward bridge, mast, lifeboats, funnels, pool and slides
  add(g, box(52, 3, 4), white, [0, 36, 118]); add(g, box(30, 6, 7), white, [0, 38, 128]); add(g, box(26, 3, 5), lmat(0x1a2a3a, { rough: 0.2 }), [0, 38.5, 131.6]);
  add(g, cyl(0.5, 0.8, 30, 8), white, [0, 58, 118]); blinker(g, A, 0, 73, 118, 0xff2a2a, 0.7, { period: 1.3 });
  const lb = []; for (let z = -80; z < 90; z += 14) for (const s of [-1, 1]) lb.push({ p: [s * 21.5, 29, z], s: [4.5, 2.2, 10], c: 0xff7a1a }); instances(g, new THREE.CapsuleGeometry(0.5, 1, 3, 8), lmat(0xffffff, { rough: 0.5 }), lb.map((q) => ({ p: q.p, r: [Math.PI / 2, 0, 0], s: [3.2, 4.2, 1.6], c: q.c })));
  for (const z of [-60, -105]) { add(g, cyl(8, 8.6, 24, 18), lmat(0xf7f5f0, { rough: 0.5 }), [0, 60, z]); add(g, cyl(8.6, 8.6, 6, 18), lmat(0x1f3a6a), [0, 74, z]); smoke(g, A, 0, 78, z, { n: 12, rise: 70, spread: 12, size: 5, wind: [0, 0, -14], period: 9, color: 0xc8ccd2, seed: z }); }
  add(g, box(28, 0.5, 60), lmat(0xd8b87a), [0, 48.8, -10]); add(g, box(14, 0.4, 24), lmat(0x4ac0e8), [-4, 49.1, -6]);
  const slide = (x, z, c) => { for (let i = 0; i < 14; i++) { const a = i / 14 * TAU * 1.5; add(g, tor(1.2, 0.6, 6, 8, Math.PI / 5), lmat(c, { rough: 0.3 }), [x + Math.cos(a) * 3.4, 49.5 + i * 1.1, z + Math.sin(a) * 3.4], [0, -a, Math.PI / 2]); } };
  slide(12, 30, 0xe53935); slide(-12, -30, 0x2fa66a);
  const dc = []; for (let i = 0; i < 40; i++) dc.push({ p: [-12 + (i % 8) * 3, 49.6, -26 + Math.floor(i / 8) * 4], s: [1, 0.5, 2], c: [0xffffff, 0xffd23f, 0x2f6fd6][i % 3] }); instances(g, box(1, 1, 1), lmat(0xffffff), dc);
  makeCrowd(g, A, 60, { x: 0, z: -10, w: 30, d: 90 }, { seed: 4, scale: 1.7, y: 48.9, speed: 0.4 });
  flagPole(g, A, 0, 22, -L / 2 + 14, 22, 8, FLAGS.italy, { phase: 2 });
  if (base) {
    const sea = SEA(L, A, { amp: 0.7, y: 0 }); g.add(sea); foam(g, A, L, 47, { seed: 5 });
    makeBoats(g, A, [{ len: 26, color: 0xffffff, cabin: 0xe53935, path: (u) => { const a = u * TAU; return [Math.cos(a) * 260, Math.sin(a) * 200 + 60, -a]; }, length: 1500, u0: 0.1, speed: 12 }, { len: 14, color: 0xffd23f, sail: true, path: (u) => { const a = u * TAU + 2; return [Math.cos(a) * 340, Math.sin(a) * 280, -a]; }, length: 1900, u0: 0.5, speed: 6 }], { y: 0 });
    birds(g, A, 22, 0, 70, 0, 200, 4, 3, 0.25); drift(g, A, 8, 2500, 420, 7, 5, 90);
  }
  return finish(g, A, { name: 'Cruise ship (Oasis class)', realHeightM: 72, realLengthM: 362, realWidthM: 66, ladderUseLength: true, source: 'Oasis-class: ~362 m long, ~66 m wide; air draft (waterline to top) ~72 m is APPROXIMATE' });
}

// ============================================================ Titanic (269 m)
export function titanic({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const L = 269, blk = DS(0x1c1f27, { rough: 0.55 });
  g.add(new THREE.Mesh(hullGeo(L, 28, 17.6, 10.5, { bowStart: 0.8, sternStart: 0.1, sheer: 0.1 }), blk));
  add(g, new THREE.Mesh(hullGeo(L * 0.997, 28.2, 0.8, 0.1, {}), lmat(0xd32f2f)).geometry, DS(0xb8302a), [0, 2, 0]).visible = false;
  add(g, box(27.4, 0.6, 258), lmat(0xcfa670), [0, 17.4, 0]).visible = false;
  // white superstructure: boat deck, promenade deck, bridge, officers' quarters
  const white = lmat(0xf6f1e6, { rough: 0.55 });
  add(g, box(25, 5.2, 175), white, [0, 20.2, -12]); add(g, box(24, 4.6, 150), white, [0, 24.8, -14]); add(g, box(23, 0.5, 152), lmat(0xb98a55, { rough: 0.8 }), [0, 27.3, -14]);
  add(g, box(25, 5.2, 36), white, [0, 20.2, 62]); add(g, box(20, 5, 12), white, [0, 24.8, 78]); add(g, box(20.6, 0.5, 12.6), lmat(0x1c1f27), [0, 27.5, 78]); add(g, box(22, 4, 3), white, [0, 27, 83]);
  add(g, box(25.4, 1.2, 258 * 0.78), lmat(0xefe8d6), [0, 17.8, -14]);
  const wl = []; for (let z = -100; z < 70; z += 3) for (const s of [-1, 1]) { wl.push({ p: [s * 12.55, 20.2, z], s: [0.1, 1.5, 1.2], c: 0xffe3a0 }); wl.push({ p: [s * 11.9, 24.8, z - 3], s: [0.1, 1.4, 1.1], c: 0xffe3a0 }); }
  instances(g, box(1, 1, 1), lmat(0xffffff, { rough: 0.2, emissive: 0x3a2a10, ei: 0.2 }), wl);
  const ph = []; for (let z = -L * 0.45; z < L * 0.4; z += 4.5) for (const s of [-1, 1]) { ph.push({ p: [s * 14.05, 14.6, z], s: [0.9, 0.2, 0.9], c: 0xf8e8b0 }); ph.push({ p: [s * 14.0, 11.5, z], s: [0.9, 0.2, 0.9], c: 0xf8e8b0 }); }
  instances(g, new THREE.CylinderGeometry(0.5, 0.5, 1, 8), lmat(0xffffff), ph.map((q) => ({ p: q.p, r: [0, 0, Math.PI / 2], s: q.s, c: q.c })));
  // four funnels (buff with black tops); the fourth is a dummy; three smoke
  const fz = [48, 17, -14, -46];
  fz.forEach((z, i) => { add(g, cyl(5.2, 5.8, 22, 20), lmat(0xe3a45e, { rough: 0.6 }), [0, 38.5, z]); add(g, cyl(5.35, 5.35, 3.8, 20), lmat(0x15151c), [0, 49.9, z]); add(g, tor(5.5, 0.25, 6, 20), lmat(0x15151c), [0, 44, z], [Math.PI / 2, 0, 0]); for (const s of [-1, 1]) add(g, cyl(0.12, 0.12, 12, 4), lmat(0x333640), [s * 3.6, 40, z + 0.0], [0, 0, 0]).visible = false; if (i < 3) smoke(g, A, 0, 52, z, { n: 12, rise: 55, spread: 7, size: 4, wind: [0, 0, -16], period: 8, color: 0x25252c, seed: i + 2 }); });
  // two masts, bridge wings, crow's nest, cranes, lifeboats, ensign
  for (const [z, h] of [[100, 58], [-100, 50]]) { add(g, cyl(0.45, 0.7, h, 8), lmat(0xd2b078), [0, 12 + h / 2, z]); add(g, cyl(1.4, 1.4, 1.4, 8), lmat(0x8a6a40), [0, 12 + h * 0.8, z]); }
  const lb = []; for (let i = 0; i < 10; i++) for (const s of [-1, 1]) lb.push({ p: [s * 10.5, 28.8, 20 + i * 3.2 * 0 - i * 9 + 30 - 10], r: [Math.PI / 2, 0, 0], s: [1.8, 3.4, 1.0], c: 0xefe6d0 });
  instances(g, new THREE.CapsuleGeometry(0.5, 1, 3, 8), lmat(0xffffff, { rough: 0.5 }), lb.map((q) => ({ ...q, p: [q.p[0], q.p[1], q.p[2] - 20] })));
  flagPole(g, A, 0, 14, -L / 2 + 4, 18, 8, FLAGS.uk, { phase: 2, amp: 0.16 });
  // name board on the bow and the number of the ship
  const nb = textBoard(18, 2.6, [{ text: 'TITANIC', size: 0.22, y: 0.5, color: '#f6f1e6', font: 'Anton, Impact, sans-serif', weight: 400 }], { bg: '#1c1f27', border: null, px: 512, radius: 4 }); nb.position.set(14.08, 10, 104); nb.rotation.y = Math.PI / 2; g.add(nb); const nb2 = nb.clone(); nb2.position.x = -14.08; nb2.rotation.y = -Math.PI / 2; g.add(nb2);
  if (base) {
    const sea = SEA(L, A, { amp: 0.6, y: 0, color: 0x2a6a9a, scale: 3 }); g.add(sea); foam(g, A, L, 28, { seed: 7 });
    // an iceberg ahead (the reason for the history lesson), slowly bobbing
    const ice = new THREE.Group(); ice.position.set(-90, 0, 420); g.add(ice); const ir = rng(3);
    for (let i = 0; i < 6; i++) add(ice, new THREE.IcosahedronGeometry(1, 1), lmat([0xeaf6ff, 0xd4ecf8, 0xc4e2f2][i % 3], { rough: 0.4, flat: true }), [(ir() - 0.5) * 40, 10 + ir() * 12, (ir() - 0.5) * 30], [ir() * 3, ir() * 3, 0], [18 + ir() * 16, 14 + ir() * 20, 16 + ir() * 12]);
    A.add((t) => { ice.position.y = Math.sin(t * 0.6) * 0.8; ice.rotation.z = Math.sin(t * 0.4) * 0.01; });
    birds(g, A, 16, 0, 60, 0, 180, 4, 3, 0.25); drift(g, A, 8, 2500, 380, 7, 4, 80);
    makeBoats(g, A, [{ len: 14, color: 0xefe6d0, path: (u) => { const a = u * TAU; return [Math.cos(a) * 110, Math.sin(a) * 160, -a]; }, length: 800, u0: 0.1, speed: 4 }], { y: 0 });
  }
  return finish(g, A, { name: 'Titanic', realHeightM: 43, realLengthM: 269, realWidthM: 28, ladderUseLength: true, source: '269 m long, 28 m beam; funnel tops ~53 m above the keel = ~43 m above the waterline (draft 10.5 m)' });
}

// ============================================================ Blue whale (30 m)
export function blueWhale({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const Ln = 30, seg = 44, ring = 28;
  const prof = (s) => { const x = s; if (x < 0.02) return 0.18 + x * 25; const head = Math.sqrt(Math.max(0, 1 - Math.pow((0.2 - x) / 0.2, 2))); if (x < 0.2) return 0.18 + 2.3 * Math.pow(head, 0.8); if (x < 0.5) return 2.5 - 0.15 * (x - 0.2) / 0.3; const t = (x - 0.5) / 0.5; return Math.max(0.26, 2.35 * Math.pow(1 - t, 0.95) + 0.3 * (1 - t)); };
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array((seg + 1) * ring * 3), col = new Float32Array((seg + 1) * ring * 3), idx = [];
  const base0 = [], cc = new THREE.Color();
  for (let i = 0; i <= seg; i++) for (let j = 0; j < ring; j++) { const s = i / seg, a = j / ring * TAU, r = prof(s); const flat = 1 - 0.18 * Math.max(0, -Math.sin(a)); base0.push([s * Ln - Ln * 0.5, Math.sin(a) * r * 0.85, Math.cos(a) * r * flat]); const belly = Math.max(0, -Math.sin(a)) > 0.45 || (i < 12 && Math.sin(a) < -0.2); const mott = fbm(s * 14 + j * 0.2, Math.sin(a) * 3 + 2, 3); const pleat = belly && j % 2 === 0 && s > 0.12 && s < 0.5 ? 0.88 : 1; cc.set(belly ? 0xc8d6de : 0x5a86a8).lerp(cc.clone().set(0x7ea6c0), belly ? 0 : mott * 0.7).multiplyScalar(pleat); col.set([cc.r, cc.g, cc.b], (i * ring + j) * 3); }
  for (let i = 0; i < seg; i++) for (let j = 0; j < ring; j++) { const a = i * ring + j, b = i * ring + (j + 1) % ring, c = (i + 1) * ring + j, d = (i + 1) * ring + (j + 1) % ring; idx.push(a, b, c, b, d, c); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  const body = new THREE.Mesh(geo, lmat(0xffffff, { vc: true, rough: 0.55, side: THREE.DoubleSide })); body.castShadow = true; g.add(body);
  const wave = (t) => { for (let i = 0; i <= seg; i++) { const s = i / seg, w = Math.pow(Math.max(0, s - 0.3) / 0.7, 1.6); const dy = Math.sin(t * 1.6 - s * 5) * 1.6 * w, dx = Math.sin(t * 0.8 - s * 3) * 0.5 * w; for (let j = 0; j < ring; j++) { const b = base0[i * ring + j], k = (i * ring + j) * 3; pos[k] = b[0]; pos[k + 1] = b[1] + dy; pos[k + 2] = b[2] + dx; } } geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); };
  wave(0); A.add(wave);
  // eyes, blowhole splash, flippers, dorsal fin, tail flukes (follow the tail's motion)
  for (const s of [-1, 1]) { add(g, sph(0.22, 8, 6), lmat(0x1a1a22), [-Ln * 0.5 + 6.4, 0.2, s * 1.7]); const fl = add(g, cone(0.8, 5.2, 6), lmat(0x4a7898, { rough: 0.6 }), [-Ln * 0.5 + 8.8, -1.3, s * 2.3], [s * 1.2, 0, Math.PI / 2 + s * 0.3], [1, 1, 0.3]); A.add((t) => { fl.rotation.x = s * (1.1 + 0.2 * Math.sin(t * 1.1 + s)); }); }
  const fin = add(g, cone(0.5, 1.2, 6), lmat(0x4a7898), [Ln * 0.5 - 8.2, 1.9, 0], [0, 0, -1.2]);
  const flukes = new THREE.Group(); g.add(flukes); for (const s of [-1, 1]) add(flukes, sph(1, 10, 6), lmat(0x4a7898, { rough: 0.6 }), [0, 0, s * 2.1], [0, s * 0.3, 0], [0.7, 0.22, 2.5]); add(flukes, sph(0.4, 6, 5), lmat(0x4a7898), [0.2, 0, 0], [0, 0, 0], [1.4, 0.5, 0.6]);
  A.add((t) => { const s = 1, w = 0.7; const dy = Math.sin(t * 1.6 - s * 5) * 1.6 * w; flukes.position.set(Ln * 0.5 + 0.4, dy, 0); flukes.rotation.z = Math.cos(t * 1.6 - 5) * 0.4; });
  // blow: periodic spout of droplets above the blowhole
  const dr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 6, 5), lmat(0xe8f6ff, { rough: 0.3, opacity: 0.85 }), 40), dro = new THREE.Object3D(), dq = rng(2), DP = []; for (let i = 0; i < 40; i++) DP.push({ a: dq() * TAU, sp: 0.5 + dq(), h: 0.6 + dq() * 0.6 }); dr.frustumCulled = false; g.add(dr);
  A.add((t) => { const c = frac(t / 7), on = c < 0.32, u = c / 0.32; DP.forEach((p, i) => { if (!on) { dro.scale.setScalar(0.0001); } else { const k = u; dro.position.set(-Ln * 0.5 + 8.8 + Math.cos(p.a) * p.sp * 1.4 * k, 1.8 + p.h * 7 * Math.sin(k * Math.PI * 0.9) + k * 2, Math.sin(p.a) * p.sp * 1.4 * k); dro.scale.setScalar(1.2 - k * 0.5); } dro.updateMatrix(); dr.setMatrixAt(i, dro.matrix); }); dr.instanceMatrix.needsUpdate = true; });
  g.position.y = -1.4;
  if (base) {
    const holder = new THREE.Group(); g.parent;
    g.userData.sea = true;
  }
  const root = new THREE.Group(); root.add(g);
  const A2 = animator(); A2.add((t) => A.update(t));
  if (base) {
    const sea = makeWater(500, 400, { seg: 56, amp: 0.45, color: 0x2f86bb, speed: 1.0, scale: 1.5, opacity: 0.6 }); sea.position.set(0, 0, 0); root.add(sea);
    const deep = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), lmat(0x0f3f6a, { rough: 1, layer: 1 })); deep.rotation.x = -Math.PI / 2; deep.position.y = -45; root.add(deep);
    const wb = boatMesh(18, 0xffffff, { cabinColor: 0x2f6fd6 }); root.add(wb);
    A2.add((t) => { const a = t * 0.12; wb.position.set(Math.cos(a) * 52, 0.2 + Math.sin(t * 1.4) * 0.3, Math.sin(a) * 40 + 22); wb.rotation.y = -a + Math.PI; });
    // school of fish and leaping dolphins
    const fr = rng(5), fish = []; for (let i = 0; i < 90; i++) fish.push({ a: fr() * TAU, r: 14 + fr() * 12, y: -8 - fr() * 14, sp: 0.4 + fr() * 0.5, ph: fr() * 6 });
    const fm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.22, 0.9, 5), lmat(0xd8e4ee, { metal: 0.5, rough: 0.3 }), fish.length), fo = new THREE.Object3D(); fm.frustumCulled = false; fm.castShadow = false; root.add(fm);
    A2.add((t) => { fish.forEach((f, i) => { const a = f.a + t * f.sp; fo.position.set(Math.cos(a) * f.r - 30, f.y + Math.sin(t + f.ph) * 0.8, Math.sin(a) * f.r - 20); fo.rotation.set(0, -a, Math.PI / 2); fo.updateMatrix(); fm.setMatrixAt(i, fo.matrix); }); fm.instanceMatrix.needsUpdate = true; });
    const dol = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.28, 1.5, 3, 8), lmat(0x7d8fa0, { rough: 0.4 }), 5), dpo = new THREE.Object3D(); dol.frustumCulled = false; dol.castShadow = true; root.add(dol);
    A2.add((t) => { for (let i = 0; i < 5; i++) { const c = frac(t * 0.22 + i * 0.2), u = c * 2 - 1, x = -60 + c * 120 + (i % 2) * 8, y = 4 * (1 - u * u) - 1.2, z = 34 + i * 6; dpo.position.set(x, y, z); dpo.rotation.set(0, 0, Math.PI / 2 - u * 0.9 * -1); dpo.updateMatrix(); dol.setMatrixAt(i, dpo.matrix); } dol.instanceMatrix.needsUpdate = true; });
    // reference diver (2 m scale) hovering near the head
    const dv = new THREE.Group(); add(dv, new THREE.CapsuleGeometry(0.22, 1.0, 3, 8), lmat(0xffd23f), [0, 0, 0], [Math.PI / 2, 0, 0]); add(dv, sph(0.2, 8, 6), lmat(0xf2b98f), [1.0, 0, 0]); add(dv, box(0.7, 0.05, 0.3), lmat(0x15151c), [-0.9, 0, 0.15]); add(dv, box(0.7, 0.05, 0.3), lmat(0x15151c), [-0.9, 0, -0.15]); dv.position.set(-12, -4, 6); root.add(dv);
    A2.add((t) => { dv.position.y = -4 + Math.sin(t * 0.8) * 0.4; dv.rotation.z = Math.sin(t * 0.6) * 0.1; });
    birds(root, A2, 12, 0, 28, 0, 60, 3, 1.4, 0.3);
  }
  root.userData.update = (t) => A2.update(t); root.update = root.userData.update;
  Object.assign(root.userData, { name: 'Blue whale', realHeightM: 30, realLengthM: 30, realWidthM: 5, ladderUseLength: true, source: 'adult blue whale up to ~30 m long (typical 24-27 m), up to ~190 t' });
  return root;
}

// ============================================================ Leaning lighthouse (stylised, ~40 m; generic, not a specific real lighthouse)
export function leaningLighthouse({ base = true } = {}) {
  const g = new THREE.Group(), A = animator();
  const T = new THREE.Group(); g.add(T);
  const sections = 8, H = 34, R0 = 4.2, R1 = 2.9;
  for (let i = 0; i < sections; i++) { const y0 = 5 + i * H / sections, y1 = y0 + H / sections, r0 = lerp(R0, R1, i / sections), r1 = lerp(R0, R1, (i + 1) / sections); add(T, cyl(r1, r0, y1 - y0, 20), lmat(i % 2 ? 0xf6f2ea : 0xe5483a, { rough: 0.5 }), [0, (y0 + y1) / 2, 0]); }
  add(T, cyl(4.8, 4.9, 5, 20), lmat(0xd8d4c8), [0, 2.5, 0]);
  for (let i = 0; i < 6; i++) add(T, rbox(0.9, 1.7, 0.4, 0.3), lmat(0x2a3340), [Math.cos(i * 1.05) * (R0 - 0.2 - i * 0.12), 8 + i * 4.2, Math.sin(i * 1.05) * (R0 - 0.2 - i * 0.12)], [0, -i * 1.05 + Math.PI / 2, 0]);
  add(T, cyl(4.2, 3.6, 1.0, 20), lmat(0x3a3f4a), [0, 39.3, 0]); add(T, tor(4.0, 0.15, 6, 24), lmat(0x3a3f4a), [0, 40.6, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; add(T, cyl(0.07, 0.07, 1.2, 4), lmat(0x3a3f4a), [Math.cos(a) * 3.9, 40, Math.sin(a) * 3.9]); }
  add(T, cyl(2.5, 2.5, 3.8, 16), lmat(0x9ad8ff, { rough: 0.05, opacity: 0.55, depthWrite: false, metal: 0.1 }), [0, 42, 0]);
  add(T, cone(3.0, 2.6, 16), lmat(0x3a3f4a), [0, 45.2, 0]); add(T, sph(0.4, 8, 6), lmat(0xe0b040, { metal: 0.6 }), [0, 46.8, 0]);
  const lamp = new THREE.MeshStandardMaterial({ color: 0xfff4c0, emissive: 0xffe08a, emissiveIntensity: 3 }); add(T, sph(1.1, 10, 8), lamp, [0, 42, 0]);
  const beam = new THREE.Group(); beam.position.y = 42; T.add(beam); for (const s of [-1, 1]) { const bm = new THREE.Mesh(new THREE.ConeGeometry(4, 120, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })); bm.position.x = s * 60; bm.rotation.z = -s * Math.PI / 2; beam.add(bm); }
  A.add((t) => { beam.rotation.y = t * 1.0; lamp.emissiveIntensity = 2.4 + 0.8 * Math.sin(t * 6); });
  T.rotation.z = -0.1; T.position.set(0, 0, 0);
  // rocky islet with crashing waves
  const rr = rng(4), rk = []; for (let i = 0; i < 40; i++) { const a = rr() * TAU, d = rr() * 20; rk.push({ p: [Math.cos(a) * d, rr() * 2.2, Math.sin(a) * d], s: [3 + rr() * 5, 2 + rr() * 4, 3 + rr() * 5], r: [rr() * 3, rr() * 3, 0], c: [0x7a7468, 0x8a8478, 0x6a645a][Math.floor(rr() * 3)] }); }
  instances(g, new THREE.DodecahedronGeometry(1, 0), lmat(0xffffff, { rough: 0.95 }), rk);
  add(g, cyl(14, 17, 3.2, 16), lmat(0x6a645a, { rough: 0.95 }), [0, 0.8, 0]);
  const hs = new THREE.Group(); hs.position.set(10, 2, 4); g.add(hs); add(hs, box(7, 3.6, 5), lmat(0xf6f2ea), [0, 1.8, 0]); add(hs, cone(5.4, 2.6, 4), lmat(0xb8553a), [0, 4.9, 0], [0, Math.PI / 4, 0]).scale.set(1, 1, 0.8); add(hs, rbox(1.2, 2.2, 0.3, 0.4), lmat(0x5a3a2a), [0, 1.2, 2.55]);
  flagPole(g, A, 12, 3, -4, 10, 4, FLAGS.red, { phase: 1 });
  if (base) {
    const sea = makeWater(700, 700, { seg: 56, amp: 1.0, color: 0x2a80b8, speed: 1.2, scale: 1.4 }); sea.position.y = 0.4; g.add(sea);
    const foamL = []; const fq = rng(7); for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; foamL.push({ a, r: 18 + fq() * 6, ph: fq() * 6 }); }
    const fm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5), lmat(0xffffff, { rough: 1, layer: 3 }), foamL.length), fo = new THREE.Object3D(); fm.frustumCulled = false; fm.castShadow = false; g.add(fm);
    A.add((t) => { foamL.forEach((f, i) => { const k = 0.5 + 0.5 * Math.sin(t * 1.8 + f.ph); fo.position.set(Math.cos(f.a) * (f.r + k * 4), 1.5, Math.sin(f.a) * (f.r + k * 4)); fo.scale.set(3.5 * (1 - k * 0.4), 0.6, 3.5 * (1 - k * 0.4)); fo.updateMatrix(); fm.setMatrixAt(i, fo.matrix); }); fm.instanceMatrix.needsUpdate = true; });
    makeBoats(g, A, [{ len: 12, color: 0xffd23f, sail: true, path: (u) => { const a = u * TAU; return [Math.cos(a) * 80, Math.sin(a) * 80, -a]; }, length: 500, u0: 0.1, speed: 3 }, { len: 9, color: 0xe5483a, path: (u) => { const a = -u * TAU + 1; return [Math.cos(a) * 55, Math.sin(a) * 60, a + Math.PI]; }, length: 360, u0: 0.4, speed: 2 }], { y: 0.5 });
    birds(g, A, 24, 0, 34, 0, 26, 3, 1.1, 0.5); drift(g, A, 6, 800, 90, 6, 4, 30);
  }
  return finish(g, A, { name: 'Leaning lighthouse', realHeightM: 40, realWidthM: 9, source: 'STYLISED / UNCERTAIN: a generic candy-striped leaning lighthouse (~40 m, ~6 degree lean), not modelled on one specific real lighthouse' });
}
