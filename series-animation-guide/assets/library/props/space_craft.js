// SPACE pack: spacecraft I. ISS-style station (rotating solar array joints, Canadarm2, radiators, docked capsule, blinking lights), communications /
// GPS / weather satellites, Sputnik, a Starlink-style train, Hubble (door, arrays, dishes) and the James Webb telescope (mirror segments aligning).
// 1 unit = 1 m everywhere; realHeightM / realWidthM / realLengthM recorded. Merged geometry + vertex colours: no textures.
import * as THREE from 'three';
import { rng } from '../util.js';
import { TAU, rgb, V3, MB, vcMat, lathe, glowDot, flowSprites } from '../fx/space_kit.js';

export const PAL = { white: 0xf2f2f4, grey: 0xc8ccd4, dgrey: 0x7c808a, gold: 0xd6a640, panel: 0x1c3470, cell: 0x9fb2d8, truss: 0xb4b8c0, black: 0x20222a, red: 0xd23a2a, blue: 0x2f6fd6, orange: 0xf08a2a, silver: 0xdfe3ea };
const M = () => ({ std: vcMat({ rough: 0.5, metal: 0.25 }), foil: vcMat({ rough: 0.28, metal: 0.85 }), panel: vcMat({ rough: 0.22, metal: 0.6 }), matte: vcMat({ rough: 0.8 }) });
const dims = (g, o) => { Object.assign(g.userData, o); return g; };
const blinkMat = (hex) => new THREE.MeshBasicMaterial({ color: hex, toneMapped: false });

// a solar wing in the XZ plane (width w along x, length l along z): panel + cell grid lines + frame; returns a Group
export function solarWing(w, l, { cols = 6, rows = 12, panel = PAL.panel, line = PAL.cell, frame = PAL.silver, mast = true, thick = 0.06 } = {}) {
  const g = new THREE.Group(), mp = M(), a = new MB(), b = new MB();
  a.box(w, thick, l, panel);
  for (let i = 0; i <= cols; i++) b.box(Math.max(0.012, w * 0.006), thick * 0.5, l * 0.99, line, [-w / 2 + i * w / cols, thick * 0.55, 0]);
  for (let j = 0; j <= rows; j++) b.box(w * 0.99, thick * 0.5, Math.max(0.012, l * 0.004), line, [0, thick * 0.55, -l / 2 + j * l / rows]);
  b.box(w + 0.1, thick * 1.2, 0.08, frame, [0, 0, -l / 2]); b.box(w + 0.1, thick * 1.2, 0.08, frame, [0, 0, l / 2]); b.box(0.08, thick * 1.2, l, frame, [-w / 2, 0, 0]); b.box(0.08, thick * 1.2, l, frame, [w / 2, 0, 0]);
  if (mast) b.box(0.1, 0.16, l, frame, [0, -0.04, 0]);
  g.add(a.mesh(mp.panel, false), b.mesh(mp.std, false)); return g;
}
const nozzle = (m, p, rot, s = 0.2) => { m.cone(s * 0.55, s * 1.3, 8, PAL.dgrey, p, rot); m.cyl(s * 0.25, s * 0.25, s * 0.5, 8, PAL.black, p, rot); };

// ---------- space station (ISS-style) ----------
export function spaceStation({ lod = 'high', spin = 0.25, seed = 4 } = {}) {
  const g = new THREE.Group(), mp = M(), r = rng(seed), A = new MB(), F = new MB(), W = new MB(), ticks = [];
  const mod = (cx, cy, cz, len, rad, col = PAL.white, rings = true) => { A.cyl(rad, rad, len, 24, col, [cx, cy, cz], [Math.PI / 2, 0, 0]); if (rings) for (const s of [-1, 1]) A.cyl(rad * 1.06, rad * 1.06, 0.18, 24, PAL.dgrey, [cx, cy, cz + s * (len / 2 - 0.1)], [Math.PI / 2, 0, 0]); for (let k = 0; k < Math.floor(len / 1.6); k++) { const z = cz - len / 2 + 0.8 + k * 1.6, a = k * 2.3; A.box(0.14, 0.14, 0.5, PAL.grey, [cx + Math.cos(a) * rad * 1.02, cy + Math.sin(a) * rad * 1.02, z]); } };
  // --- pressurised modules along +z (forward) and -z (aft) ---
  mod(0, 0, -21, 13, 2.1, PAL.white); F.cyl(2.2, 2.2, 5, 24, PAL.gold, [0, 0, -21], [Math.PI / 2, 0, 0]);         // Zarya (gold foil band)
  mod(0, 0, -34, 13.5, 2.3, PAL.white); mod(0, 0, -41.8, 2.6, 1.3, PAL.grey);                                         // Zvezda service module + aft port
  mod(0, 0, -9, 5.4, 2.25, PAL.grey); mod(0, 0, 0, 8.5, 2.15, PAL.white); mod(0, 0, 8.4, 7.2, 2.3, PAL.grey); mod(0, 0, 15.2, 6.4, 2.25, PAL.white);   // Unity, Destiny, Harmony
  mod(5.2, 0, 15.2, 6.9, 1.9, PAL.white); mod(-6, -0.6, 14.4, 10, 2.1, PAL.white); A.box(1.2, 0.8, 3.6, PAL.grey, [-6, 2.6, 14.4]);   // Columbus, Kibo + exposed pallet
  for (const s of [-1, 1]) A.cyl(0.6, 0.6, 5.1, 12, PAL.grey, [s * 3.7, 0, 15.2], [0, 0, Math.PI / 2]);
  A.cyl(1.0, 1.0, 1.4, 16, PAL.grey, [0, 0, 19.6], [Math.PI / 2, 0, 0]);   // docking adapter
  // Zvezda radiator tiles
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; F.box(0.1, 1.2, 2.6, PAL.silver, [Math.cos(a) * 2.38, Math.sin(a) * 2.38, -30.8], [0, 0, a]); }
  // --- truss (z = 9.7, y = 3.4) ---
  const Y = 3.4, Z = 9.7;
  for (const [yy, zz] of [[1.35, 1.35], [1.35, -1.35], [-1.35, 1.35], [-1.35, -1.35]]) A.box(108, 0.26, 0.26, PAL.truss, [0, Y + yy, Z + zz]);
  const step = lod === 'low' ? 6.8 : 3.4;
  for (let x = -53.5; x <= 53.5; x += step) { A.box(0.2, 2.7, 0.2, PAL.truss, [x, Y, Z + 1.35]); A.box(0.2, 2.7, 0.2, PAL.truss, [x, Y, Z - 1.35]); A.box(0.2, 0.2, 2.7, PAL.truss, [x, Y + 1.35, Z]); A.box(0.2, 0.2, 2.7, PAL.truss, [x, Y - 1.35, Z]); if (lod !== 'low') A.bar([x, Y + 1.35, Z + 1.35], [x + step, Y - 1.35, Z + 1.35], 0.1, PAL.truss); }
  A.box(5.5, 4.6, 4.6, PAL.grey, [0, Y, Z]); A.cyl(0.9, 0.9, 2.4, 14, PAL.dgrey, [0, Y - 3, Z], [0, 0, 0]);        // S0 + support to Destiny
  // ammonia tanks, ELC pallets, antennas, thermal radiators
  for (const s of [-1, 1]) { F.cyl(0.9, 0.9, 3.4, 14, PAL.white, [s * 7.5, Y + 3.2, Z + 1], [0, 0, Math.PI / 2]); A.box(2.6, 1.4, 1.8, PAL.grey, [s * 18, Y + 2.4, Z]); A.box(1.2, 1.0, 1.0, PAL.gold, [s * 18, Y + 3.5, Z]); A.box(2.6, 1.4, 1.8, PAL.grey, [s * 40, Y + 2.4, Z]); A.cyl(0.04, 0.04, 3.4, 5, PAL.grey, [s * 3, Y + 5, Z - 1]); for (const rx of [s * 12.6, s * 37]) A.box(3.4, 0.14, 11.5, PAL.white, [rx, Y - 8.2, Z]); for (const rx of [s * 12.6, s * 37]) A.box(3.5, 0.5, 0.5, PAL.dgrey, [rx, Y - 2.2, Z]); }
  // --- docked vehicles: crew capsule on the forward port, cargo ship aft ---
  A.cyl(1.9, 2.1, 2.9, 20, PAL.white, [0, 0, 22.6], [Math.PI / 2, 0, 0]); F.cyl(1.2, 1.9, 1.4, 20, PAL.white, [0, 0, 24.7], [Math.PI / 2, 0, 0]); A.cyl(0.9, 1.2, 1.2, 20, PAL.black, [0, 0, 25.9], [Math.PI / 2, 0, 0]);
  A.cyl(2.15, 2.15, 4.2, 20, PAL.grey, [0, 0, 19.6 + 5.0 + 0.0 * 0], [Math.PI / 2, 0, 0]); F.cyl(2.2, 2.2, 0.5, 20, PAL.gold, [0, 0, 28.2], [Math.PI / 2, 0, 0]);
  A.cyl(1.3, 1.3, 7, 16, PAL.white, [0, 0, -46.6], [Math.PI / 2, 0, 0]); A.cyl(1.0, 1.0, 1.4, 16, PAL.grey, [0, 0, -51.0], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) { const w = solarWing(3.6, 1.2, { cols: 2, rows: 1 }); w.position.set(s * 2.6, 0, -46.6); w.rotation.y = 0; g.add(w); }
  // cupola
  F.cyl(1.4, 1.5, 1.1, 7, PAL.grey, [0, -2.7, 8.4]); A.cyl(1.0, 1.4, 0.9, 7, PAL.white, [0, -3.5, 8.4]);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 0.7, 7), new THREE.MeshStandardMaterial({ color: 0xaad8ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.6, depthWrite: false })); glass.position.set(0, -4.2, 8.4); g.add(glass);
  const cup = new THREE.Group(); cup.position.set(0, -3.6, 8.4); g.add(cup); g.userData.cupola = cup;
  g.add(A.mesh(mp.std, false), F.mesh(mp.foil, false));
  // --- rotating solar array joints (BGAs), each with a pair of wings ---
  const bga = [];
  for (const x of [-48, -27, 27, 48]) { const j = new THREE.Group(); j.position.set(x, Y, Z); g.add(j); for (const s of [-1, 1]) { const w = solarWing(11.7, 33, { cols: 8, rows: 22 }); w.position.set(0, 0, s * (3.6 + 16.5)); j.add(w); } const hub = new MB(); hub.cyl(1.1, 1.1, 2.2, 14, PAL.grey, [0, 0, 0], [0, 0, Math.PI / 2]); hub.box(0.4, 0.4, 7.2, PAL.dgrey, [0, 0, 0]); j.add(hub.mesh(mp.std, false)); bga.push({ j, ph: (x > 0 ? 0 : 0.6) + Math.abs(x) * 0.01 }); }
  // --- Canadarm2 (two booms, wrist + latching end effector), gently working ---
  const arm = new THREE.Group(); arm.position.set(-12, Y + 3.2, Z + 1.6); g.add(arm); const a1 = new THREE.Group(), a2 = new THREE.Group(), wr = new THREE.Group();
  { const m = new MB(); m.cyl(0.42, 0.42, 1.0, 14, PAL.white, [0, 0, 0]); arm.add(m.mesh(mp.std, false)); const b1 = new MB(); b1.cyl(0.18, 0.18, 8, 12, PAL.white, [0, 4, 0]); b1.sph(0.34, PAL.grey, [0, 0, 0]); b1.sph(0.34, PAL.grey, [0, 8, 0]); a1.add(b1.mesh(mp.std, false)); a1.position.y = 0.5; arm.add(a1);
    const b2 = new MB(); b2.cyl(0.18, 0.18, 8, 12, PAL.white, [0, 4, 0]); b2.sph(0.3, PAL.grey, [0, 8, 0]); a2.add(b2.mesh(mp.std, false)); a2.position.y = 8; a1.add(a2); const b3 = new MB(); b3.cyl(0.26, 0.26, 0.9, 12, PAL.grey, [0, 0.4, 0]); b3.cyl(0.16, 0.16, 0.8, 10, PAL.black, [0, 1.2, 0]); wr.add(b3.mesh(mp.std, false)); wr.position.y = 8; a2.add(wr); }
  ticks.push((t) => { a1.rotation.z = -0.9 + 0.35 * Math.sin(t * 0.4); a2.rotation.z = 1.6 + 0.4 * Math.sin(t * 0.33 + 1); wr.rotation.x = 0.4 * Math.sin(t * 0.6); arm.rotation.y = 0.5 * Math.sin(t * 0.17); });
  // Ku-band dish + blinking nav lights
  const dish = new THREE.Group(); dish.position.set(0, Y + 3.3, Z - 1.5); g.add(dish); { const m = new MB(); m.cyl(0.05, 0.05, 1.6, 6, PAL.grey, [0, 0.8, 0]); const d = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 10, 0, TAU, 0, 1.0), vcMat({ rough: 0.4 })); d.material = new THREE.MeshStandardMaterial({ color: 0xf0f0f4, roughness: 0.4, side: THREE.DoubleSide }); d.scale.y = 0.4; d.position.y = 1.7; dish.add(m.mesh(mp.std, false), d); }
  ticks.push((t) => { dish.rotation.y = t * 0.6; dish.rotation.x = 0.4 * Math.sin(t * 0.8); });
  const lights = []; for (const [p, c] of [[[-53, Y, Z], 0xff2020], [[53, Y, Z], 0x20ff60], [[0, 2.6, -41], 0xffffff], [[0, 0, 28.8], 0xffffff]]) { const mat = blinkMat(c), m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), mat); m.position.set(...p); g.add(m); const gl = glowDot(c, 3, { k: 0.8 }); gl.position.set(...p); g.add(gl); lights.push({ mat, gl, c }); }
  ticks.push((t) => lights.forEach((l, i) => { const on = ((t * 0.9 + i * 0.37) % 1.6) < 0.35; l.mat.color.setHex(on ? l.c : 0x201010); l.gl.visible = on; }));
  g.update = g.userData.update = (t) => { for (const b of bga) b.j.rotation.x = b.ph + t * spin; for (const f of ticks) f(t); };
  dims(g, { realWidthM: 109, realLengthM: 73, realHeightM: 27.4, note: 'solar array joints turn once per orbit (sped up); arm, dish and lights move' }); g.update(0); return g;
}

// ---------- communications satellite (box bus in gold foil, two big tracking arrays, dishes) ----------
export function commSat({ seed = 1, s = 1, tint = PAL.gold } = {}) {
  const g = new THREE.Group(), mp = M(), a = new MB(), f = new MB(), r = rng(seed); const u = s;
  f.box(2.4 * u, 2.2 * u, 3.4 * u, tint); a.box(2.46 * u, 0.2 * u, 3.46 * u, PAL.white, [0, 1.05 * u, 0]); a.box(2.46 * u, 0.2 * u, 3.46 * u, PAL.white, [0, -1.05 * u, 0]);
  for (let i = 0; i < 4; i++) a.box(0.5 * u, 0.5 * u, 0.04 * u, PAL.black, [-0.7 * u + (i % 2) * 1.4 * u, 0.5 * u * (i < 2 ? 1 : -1), 1.72 * u]);
  for (let k = 0; k < 4; k++) nozzle(a, [(k % 2 ? 1 : -1) * 0.9 * u, (k < 2 ? 1 : -1) * 0.85 * u, -1.8 * u], [-Math.PI / 2, 0, 0], 0.35 * u);
  a.cyl(0.1 * u, 0.1 * u, 1.2 * u, 8, PAL.grey, [0, 1.8 * u, 0.6 * u]); a.cone(0.28 * u, 0.7 * u, 10, PAL.white, [0, 2.6 * u, 0.6 * u]);
  g.add(a.mesh(mp.std, false), f.mesh(mp.foil, false));
  const dishes = [];
  for (const [x, z, rad] of [[-1.7, 1.0, 1.1], [1.7, 1.0, 1.1]]) { const d = new THREE.Mesh(new THREE.SphereGeometry(rad * u, 24, 12, 0, TAU, 0, 1.05), new THREE.MeshStandardMaterial({ color: 0xf4f4f6, roughness: 0.4, side: THREE.DoubleSide })); d.scale.y = 0.35; d.rotation.x = -Math.PI / 2; d.position.set(x * u, 0, (z + 0.8) * u); g.add(d); const b = new MB(); b.cyl(0.04 * u, 0.04 * u, 1.0 * u, 6, PAL.grey, [0, 0, 0.5 * u], [Math.PI / 2, 0, 0]); const bb = b.mesh(mp.std, false); d.add(bb); bb.rotation.x = Math.PI / 2; dishes.push(d); }
  const wings = []; for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sd * 1.2 * u, 0, 0); g.add(piv); const bm = new MB(); bm.box(2.8 * u, 0.12 * u, 0.12 * u, PAL.grey, [sd * 1.4 * u, 0, 0]); piv.add(bm.mesh(mp.std, false)); for (let k = 0; k < 4; k++) { const w = solarWing(2.5 * u, 6.4 * u, { cols: 3, rows: 8, mast: false }); w.rotation.y = Math.PI / 2; w.position.set(sd * (3.6 + k * 2.55) * u, 0, 0); piv.add(w); } wings.push({ piv, sd }); }
  g.update = g.userData.update = (t) => { for (const w of wings) w.piv.rotation.x = t * 0.25 + (w.sd > 0 ? 0.1 : 0); dishes.forEach((d, i) => { d.rotation.z = 0.15 * Math.sin(t * 0.7 + i); }); };
  dims(g, { realWidthM: 26 * u, realHeightM: 5 * u, realLengthM: 3.4 * u, note: 'arrays track the sun, dishes sway' }); g.update(0); return g;
}

// ---------- GPS-style navigation satellite ----------
export function gpsSat({ s = 1 } = {}) {
  const g = new THREE.Group(), mp = M(), a = new MB(), f = new MB(); const u = s;
  f.cyl(0.9 * u, 0.9 * u, 2.4 * u, 6, PAL.gold, [0, 0, 0], [Math.PI / 2, 0, 0]); a.cyl(0.95 * u, 0.95 * u, 0.15 * u, 6, PAL.silver, [0, 0, 1.25 * u], [Math.PI / 2, 0, 0]); a.cyl(0.95 * u, 0.95 * u, 0.15 * u, 6, PAL.silver, [0, 0, -1.25 * u], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 12; k++) { const ang = k / 12 * TAU, rad = k < 6 ? 0.28 * u : 0.62 * u; a.cone(0.13 * u, 0.5 * u, 8, PAL.white, [Math.cos(ang) * rad * (k < 6 ? 0.9 : 1), Math.sin(ang) * rad * (k < 6 ? 0.9 : 1), 1.5 * u], [Math.PI / 2, 0, 0]); }
  a.box(0.4 * u, 0.4 * u, 0.15 * u, PAL.black, [0.6 * u, 0.5 * u, 1.35 * u]); a.cyl(0.06 * u, 0.06 * u, 0.9 * u, 6, PAL.grey, [0, 0.9 * u, -0.6 * u]); a.sph(0.14 * u, PAL.red, [0, 1.4 * u, -0.6 * u]);
  g.add(a.mesh(mp.std, false), f.mesh(mp.foil, false)); const wings = [];
  for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sd * 0.9 * u, 0, 0); g.add(piv); const bm = new MB(); bm.box(0.9 * u, 0.08 * u, 0.08 * u, PAL.grey, [sd * 0.45 * u, 0, 0]); piv.add(bm.mesh(mp.std, false)); for (let k = 0; k < 2; k++) { const w = solarWing(1.7 * u, 1.9 * u, { cols: 3, rows: 4, mast: false }); w.rotation.y = Math.PI / 2; w.position.set(sd * (1.4 + k * 1.75) * u, 0, 0); piv.add(w); } wings.push({ piv, sd }); }
  g.update = g.userData.update = (t) => { for (const w of wings) w.piv.rotation.x = t * 0.3; };
  dims(g, { realWidthM: 9 * u, realHeightM: 2.4 * u, realLengthM: 2.4 * u, note: 'navigation array faces Earth; wings track the sun' }); g.update(0); return g;
}

// ---------- weather satellite (GOES-like): one long array on a boom, instrument cone, magnetometer boom, beacon ----------
export function weatherSat({ s = 1 } = {}) {
  const g = new THREE.Group(), mp = M(), a = new MB(), f = new MB(); const u = s;
  f.box(2.0 * u, 2.0 * u, 2.9 * u, PAL.gold); a.box(2.06 * u, 0.12 * u, 2.96 * u, PAL.white, [0, 1.0 * u, 0]); a.cyl(0.7 * u, 0.9 * u, 1.3 * u, 16, PAL.white, [0, 0, 2.1 * u], [Math.PI / 2, 0, 0]); a.cyl(0.55 * u, 0.55 * u, 0.15 * u, 16, PAL.black, [0, 0, 2.78 * u], [Math.PI / 2, 0, 0]);
  a.box(1.3 * u, 0.7 * u, 0.1 * u, PAL.silver, [0, -0.9 * u, 1.5 * u]); a.cyl(0.04 * u, 0.04 * u, 4 * u, 6, PAL.grey, [-3.1 * u, 0, -0.6 * u], [0, 0, Math.PI / 2]); a.sph(0.18 * u, PAL.black, [-5.2 * u, 0, -0.6 * u]);
  a.box(0.14 * u, 0.14 * u, 1.9 * u, PAL.grey, [1.05 * u, -0.4 * u, 0]); a.cyl(0.3 * u, 0.3 * u, 0.5 * u, 10, PAL.dgrey, [0, 0, -1.7 * u], [Math.PI / 2, 0, 0]);
  g.add(a.mesh(mp.std, false), f.mesh(mp.foil, false));
  const piv = new THREE.Group(); piv.position.set(1.0 * u, 0, 0); g.add(piv); const bm = new MB(); bm.box(5.2 * u, 0.12 * u, 0.12 * u, PAL.grey, [2.6 * u, 0, 0]); piv.add(bm.mesh(mp.std, false));
  for (let k = 0; k < 3; k++) { const w = solarWing(1.8 * u, 4.4 * u, { cols: 3, rows: 10, mast: false }); w.rotation.y = Math.PI / 2; w.position.set((1.9 + k * 1.75 + 0.5) * u, 0, 0); w.scale.set(1, 1, 1); piv.add(w); }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12 * u, 8, 6), blinkMat(0xff3030)); beacon.position.set(0, 1.25 * u, 0); g.add(beacon);
  g.update = g.userData.update = (t) => { piv.rotation.x = t * 0.22; beacon.material.color.setHex(((t * 1.1) % 1.5) < 0.3 ? 0xff3030 : 0x300a0a); g.rotation.z = 0.04 * Math.sin(t * 0.5); };
  dims(g, { realWidthM: 11 * u, realHeightM: 2.9 * u, realLengthM: 6 * u, note: 'array turns with the sun, beacon blinks' }); g.update(0); return g;
}

// ---------- Sputnik: polished sphere, four swept whip antennas, beeping light, slow tumble ----------
export function sputnik({ s = 1 } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); const u = s;
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.29 * u, 36, 24), new THREE.MeshStandardMaterial({ color: 0xd8dce4, metalness: 0.95, roughness: 0.12 })); body.add(sh);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.2905 * u, 0.006 * u, 6, 48), new THREE.MeshStandardMaterial({ color: 0x8a909a, metalness: 0.8, roughness: 0.3 })); seam.rotation.x = Math.PI / 2; body.add(seam);
  const mp = M(), a = new MB(); for (let k = 0; k < 4; k++) { const ang = k / 4 * TAU + 0.4, len = (k % 2 ? 2.4 : 2.9) * u; a.cyl(0.006 * u, 0.006 * u, len, 5, 0xb8bcc4, [Math.cos(ang) * (0.28 * u + len * 0.15), -len * 0.46 + 0.1 * u, Math.sin(ang) * (0.28 * u + len * 0.15)], [Math.sin(ang) * 1.2, 0, -Math.cos(ang) * 1.2]); a.sph(0.02 * u, 0x8a909a, [Math.cos(ang) * 0.28 * u, 0.04 * u, Math.sin(ang) * 0.28 * u]); }
  for (let k = 0; k < 4; k++) { const ang = k / 4 * TAU + 0.4; a.cyl(0.02 * u, 0.02 * u, 0.06 * u, 8, 0x8a909a, [Math.cos(ang) * 0.27 * u, 0.0, Math.sin(ang) * 0.27 * u], [Math.sin(ang) * 1.5, 0, -Math.cos(ang) * 1.5]); }
  body.add(a.mesh(mp.foil, true));
  const beep = new THREE.Mesh(new THREE.SphereGeometry(0.03 * u, 10, 8), blinkMat(0xff8030)); beep.position.set(0, 0.29 * u, 0); body.add(beep); const glow = glowDot(0xff8030, 0.5 * u, { k: 1 }); glow.position.copy(beep.position); body.add(glow);
  g.update = g.userData.update = (t) => { body.rotation.set(t * 0.31, t * 0.47, t * 0.13); const on = (t % 0.9) < 0.35; beep.material.color.setHex(on ? 0xffa050 : 0x301808); glow.visible = on; };
  dims(g, { realWidthM: 0.58 * u, realHeightM: 0.58 * u, note: 'Sputnik 1 (58 cm sphere); the beacon beeps, the antennas are 2.4 m and 2.9 m' }); g.update(0); return g;
}

// ---------- Starlink-style train: a string of flat-panel satellites, each with one big array, slowly fanning ----------
export function starlinkTrain({ count = 22, s = 1 } = {}) {
  const g = new THREE.Group(), mp = M(), u = s, a = new MB(), pa = new MB();
  a.box(3.2 * u, 0.2 * u, 1.6 * u, PAL.white); a.box(2.8 * u, 0.04 * u, 1.3 * u, PAL.black, [0, -0.12 * u, 0]); a.box(0.5 * u, 0.12 * u, 0.5 * u, PAL.grey, [1.1 * u, 0.15 * u, 0.3 * u]);
  const bus = a.mesh(mp.std, false).geometry; const arr = new MB(); arr.box(2.8 * u, 0.05 * u, 8 * u, PAL.panel); for (let i = 0; i < 6; i++) arr.box(0.02 * u, 0.03 * u, 8 * u, PAL.cell, [-1.2 * u + i * 0.48 * u, 0.04 * u, 0]);
  const arrG = arr.mesh(mp.panel, false).geometry;
  const bi = new THREE.InstancedMesh(bus, mp.std, count), ai = new THREE.InstancedMesh(arrG, mp.panel, count); bi.frustumCulled = ai.frustumCulled = false; g.add(bi, ai);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = V3(), _s = V3(1, 1, 1), _qa = new THREE.Quaternion();
  g.update = g.userData.update = (t) => { for (let i = 0; i < count; i++) { const sp = 0.52 * u * (1 + 0.5 * Math.sin(t * 0.3 + i * 0.4)) + 0.12 * u; _p.set(0, (i - count / 2) * 0.62 * u * 1.0 + 0.0 * sp, 0); _q.setFromEuler(new THREE.Euler(0, 0, 0.5 * Math.sin(t * 0.25 + i * 0.3) * 0.2)); _m.compose(_p, _q, _s); bi.setMatrixAt(i, _m); _p.set(0, (i - count / 2) * 0.62 * u + 0.15 * u, 4.9 * u + 0.8 * u); _qa.setFromEuler(new THREE.Euler(0.1 * Math.sin(t * 0.4 + i * 0.5), 0, 0.5 * Math.sin(t * 0.25 + i * 0.3) * 0.2)); _m.compose(_p, _qa, _s); ai.setMatrixAt(i, _m); } bi.instanceMatrix.needsUpdate = ai.instanceMatrix.needsUpdate = true; };
  dims(g, { count, realWidthM: 3.2 * u, realLengthM: 8 * u * 1.0, realHeightM: count * 0.62 * u, note: 'train of flat-panel sats, panels wobble' }); g.update(0); return g;
}

// ---------- Hubble Space Telescope ----------
export function hubble({ door = 1 } = {}) {
  const g = new THREE.Group(), mp = M(), a = new MB(), f = new MB(), b = new MB();
  const Z0 = -6.6;   // aft end; length 13.2 along +z (aperture at +z)
  a.cyl(2.15, 2.15, 4.5, 28, PAL.silver, [0, 0, Z0 + 11], [Math.PI / 2, 0, 0]);   // light shield
  f.cyl(2.12, 2.12, 5.6, 28, PAL.silver, [0, 0, Z0 + 5.2], [Math.PI / 2, 0, 0]);   // forward shell (silver MLI)
  a.cyl(2.2, 2.2, 3.0, 28, PAL.dgrey, [0, 0, Z0 + 1.7], [Math.PI / 2, 0, 0]);   // aft shroud
  f.cyl(2.3, 2.3, 0.4, 28, PAL.gold, [0, 0, Z0 + 0.1], [Math.PI / 2, 0, 0]);
  a.cyl(2.28, 2.28, 0.35, 28, PAL.blue, [0, 0, Z0 + 3.3], [Math.PI / 2, 0, 0]); a.cyl(2.18, 2.18, 0.25, 28, PAL.black, [0, 0, Z0 + 8.1], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 8; k++) { const an = k / 8 * TAU; b.box(0.16, 0.16, 3.2, PAL.gold, [Math.cos(an) * 2.34, Math.sin(an) * 2.34, Z0 + 5.4]); }   // handrails
  for (let k = 0; k < 6; k++) { const an = k / 6 * TAU + 0.3; a.box(0.5, 0.24, 0.8, PAL.grey, [Math.cos(an) * 2.3, Math.sin(an) * 2.3, Z0 + 2.2], [0, 0, an]); }
  for (let k = 0; k < 4; k++) a.cyl(0.26, 0.26, 0.7, 8, PAL.dgrey, [Math.cos(k * 1.57 + 0.78) * 2.35, Math.sin(k * 1.57 + 0.78) * 2.35, Z0 + 4.2], [Math.PI / 2, 0, k * 1.57]);
  a.cyl(0.1, 0.1, 1.4, 8, PAL.grey, [0, 2.8, Z0 + 5.2]); a.box(0.5, 0.5, 0.2, PAL.black, [0.55, 2.4, Z0 + 3]);
  g.add(a.mesh(mp.std, false), f.mesh(mp.foil, false), b.mesh(mp.foil, false));
  const dr = new THREE.Group(); dr.position.set(0, 2.15, Z0 + 13.25); g.add(dr); const dm = new MB(); dm.box(4.3, 0.12, 2.2, PAL.white, [0, 0, -1.1]); dm.box(4.3, 0.14, 0.18, PAL.grey, [0, 0, -2.2]); const doorM = dm.mesh(mp.std, false); dr.add(doorM);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(2.0, 28), new THREE.MeshBasicMaterial({ color: 0x050608 })); hole.position.set(0, 0, Z0 + 13.22); g.add(hole);
  const arrays = [], dishes = []; for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 2.3, 0, Z0 + 4.5); g.add(piv); const bm = new MB(); bm.cyl(0.14, 0.14, 7.4, 8, PAL.silver, [s * 0, 0, 0], [Math.PI / 2, 0, 0]); piv.add(bm.mesh(mp.std, false)); const w = solarWing(2.6, 7.1, { cols: 3, rows: 10, mast: false }); w.position.set(s * 1.5, 0, 0); piv.add(w); arrays.push({ piv, s });
    const dp = new THREE.Group(); dp.position.set(s * 1.2, 2.2, Z0 + 6.8); g.add(dp); const dd = new MB(); dd.cyl(0.05, 0.05, 2.2, 6, PAL.grey, [0, 1.1, 0]); dp.add(dd.mesh(mp.std, false)); const d = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 8, 0, TAU, 0, 1.1), new THREE.MeshStandardMaterial({ color: 0xf2f2f4, roughness: 0.4, side: THREE.DoubleSide })); d.scale.y = 0.4; d.position.y = 2.3; dp.add(d); dishes.push({ dp, s }); }
  const setDoor = (k) => { dr.rotation.x = -k * 1.9; };
  g.update = g.userData.update = (t) => { for (const w of arrays) w.piv.rotation.z = w.s * 0.35 * Math.sin(t * 0.25); for (const d of dishes) d.dp.rotation.y = 0.5 * d.s * Math.sin(t * 0.5 + d.s); setDoor(door * (0.97 + 0.03 * Math.sin(t * 0.8))); g.rotation.z = 0.05 * Math.sin(t * 0.2); };
  g.userData.setDoor = setDoor;
  dims(g, { realLengthM: 13.2, realWidthM: 4.2, realHeightM: 4.2, note: 'arrays + dishes track, aperture door open' }); g.update(0); return g;
}

// ---------- James Webb Space Telescope: 18 gold hex segments (each tilting as if aligning), tripod secondary, 5-layer kite sunshield ----------
export function jwst({ seed = 2 } = {}) {
  const g = new THREE.Group(), mp = M(), r = rng(seed);
  const hex = new THREE.CylinderGeometry(0.66, 0.66, 0.06, 6, 1), segs = [], mirror = new THREE.Group(); mirror.position.set(0, 2.0, 0); g.add(mirror); mirror.rotation.x = -Math.PI / 2 + 0.0;
  const centres = []; const d = 1.32; for (const [q, w] of [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]) { centres.push([q, w, 1]); }
  const pos = (q, w) => [(q + w * 0.5) * d * 1.0, w * d * 0.866];
  const ring1 = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]], ring2 = [[2, 0], [1, 1], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-1, -1], [0, -2], [1, -2], [2, -2], [2, -1]];
  const goldM = new THREE.MeshStandardMaterial({ color: 0xe6b640, metalness: 1, roughness: 0.12 }), back = new MB(); back.box(6.2, 0.5, 0.4, PAL.dgrey, [0, 0, -0.45]); back.box(0.5, 5.8, 0.4, PAL.dgrey, [0, 0, -0.45]); mirror.add(back.mesh(mp.std, false));
  ring1.concat(ring2).forEach(([q, w], i) => { const [x, y] = pos(q, w), seg = new THREE.Mesh(hex, goldM); seg.rotation.x = Math.PI / 2; seg.rotation.y = Math.PI / 6; const pv = new THREE.Group(); pv.position.set(x, y, 0); pv.add(seg); mirror.add(pv); segs.push({ pv, ph: r() * TAU }); });
  const sec = new MB(); sec.sph(0.38, PAL.dgrey, [0, 0, 7.2]); for (let k = 0; k < 3; k++) { const an = k / 3 * TAU + Math.PI / 2; sec.bar([Math.cos(an) * 3.2, Math.sin(an) * 3.2, 0.2], [0, 0, 7.2], 0.07, PAL.dgrey); } mirror.add(sec.mesh(mp.std, false));
  const gm = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 10), goldM); gm.position.set(0, 0, 7.25); mirror.add(gm);
  // sunshield: five thin kite-shaped layers
  const shield = new THREE.Group(); shield.position.set(0, -0.2, 0); g.add(shield); const sh = new THREE.Shape(); sh.moveTo(-10.5, 0); sh.lineTo(0, 7.2); sh.lineTo(10.5, 0); sh.lineTo(0, -7.2); sh.closePath();
  const layers = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: i === 0 ? 0xc9b8e0 : 0xdfe0ea, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = -0.1 - i * 0.38; shield.add(m); layers.push(m); }
  const rod = new MB(); for (const s of [-1, 1]) { rod.bar([s * 10.4, -0.1, 0], [s * 10.4, -2.1, 0], 0.1, PAL.grey); rod.bar([0, -0.1, 7.1], [0, -2.1, 7.1], 0.1, PAL.grey); rod.bar([0, -0.1, -7.1], [0, -2.1, -7.1], 0.1, PAL.grey); } shield.add(rod.mesh(mp.std, false));
  // bus + array below the shield
  const bus = new MB(); bus.box(3.2, 1.6, 2.4, PAL.gold, [0, -3.3, 0]); bus.box(3.6, 0.1, 2.8, PAL.white, [0, -2.45, 0]); bus.box(2.2, 0.06, 3.6, PAL.panel, [0, -3.3, 3.4]); bus.cyl(0.4, 0.4, 0.6, 12, PAL.dgrey, [0, -4.4, 0]); g.add(bus.mesh(mp.foil, false));
  g.rotation.set(0, 0.0, 0); const base = g.rotation.clone();
  g.update = g.userData.update = (t) => { for (const s of segs) { s.pv.rotation.x = 0.045 * Math.sin(t * 0.9 + s.ph); s.pv.rotation.y = 0.045 * Math.cos(t * 0.7 + s.ph * 1.7); } layers.forEach((l, i) => { l.position.y = -0.1 - i * 0.38 + 0.03 * Math.sin(t * 0.8 + i); }); mirror.rotation.z = 0.0; };
  dims(g, { realWidthM: 21.2, realHeightM: 14.2, realLengthM: 8, note: '18 mirror segments (6.5 m total) wiggle as if aligning; sunshield layers flutter' }); g.update(0); return g;
}

// ---------- crew capsule (Dragon-style or Apollo-style) with thruster puffs ----------
export function spaceCapsule({ kind = 'dragon' } = {}) {
  const g = new THREE.Group(), mp = M(), a = new MB(), f = new MB(), ticks = [];
  if (kind === 'apollo') {
    a.g(new THREE.ConeGeometry(1.95, 3.2, 32, 1, true), PAL.silver, [0, 4.4, 0], [Math.PI, 0, 0]); f.cyl(0.55, 0.55, 0.2, 14, PAL.dgrey, [0, 6.1, 0]); f.cyl(2.0, 2.0, 0.25, 32, 0x8a5a2a, [0, 2.6, 0]);   // command module + heat shield
    a.cyl(1.95, 1.95, 7.4, 32, PAL.white, [0, -1.2, 0]); f.cyl(1.97, 1.97, 0.5, 32, PAL.gold, [0, -3.5, 0]); a.cyl(1.0, 0.3, 1.4, 20, PAL.dgrey, [0, -5.6, 0]); a.cyl(1.2, 1.0, 0.5, 20, PAL.black, [0, -4.8, 0]);
    for (let k = 0; k < 4; k++) { const an = k / 4 * TAU; a.box(0.6, 1.3, 0.6, PAL.grey, [Math.cos(an) * 2.1, -1.0, Math.sin(an) * 2.1]); for (let j = 0; j < 4; j++) a.cyl(0.07, 0.07, 0.2, 6, PAL.black, [Math.cos(an) * 2.35 + (j - 1.5) * 0.0, -0.7 - (j % 2) * 0.5, Math.sin(an) * 2.35], [0, 0, Math.PI / 2]); }
    a.cyl(0.05, 0.05, 1.8, 6, PAL.grey, [0, 6.9, 0]); a.sph(0.14, PAL.red, [0, 7.8, 0]);
    g.add(a.mesh(mp.std, true), f.mesh(mp.foil, true)); dims(g, { realHeightM: 11.0, realWidthM: 3.9, note: 'Apollo command + service module' });
    const dish = new THREE.Group(); dish.position.set(2.15, -3.4, 0); g.add(dish); const d = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 8, 0, TAU, 0, 1.1), new THREE.MeshStandardMaterial({ color: 0xf2f2f4, side: THREE.DoubleSide })); d.rotation.z = -Math.PI / 2; d.scale.y = 0.4; dish.add(d); ticks.push((t) => { dish.rotation.y = 0.5 * Math.sin(t * 0.7); });
    const en = flowSprites({ n: 160, dir: [0, -1, 0], length: 6, spread: 0.9, speed: 1.2, size: [0.3, 0.9], colors: [0xffffff, 0xffc060, 0xff5020], pow: 1.2, seed: 5 }); en.position.set(0, -6.3, 0); g.add(en); ticks.push((t) => { en.setTime(t); en.setLevel(0.0); }); g.userData.engine = en;
  } else {
    a.cyl(1.0, 2.0, 3.6, 32, PAL.white, [0, 3.6, 0]); f.cyl(2.0, 2.02, 0.18, 32, PAL.black, [0, 1.75, 0]); a.cyl(0.9, 1.0, 0.3, 32, PAL.black, [0, 5.5, 0]);
    a.g(new THREE.SphereGeometry(0.95, 24, 12, 0, TAU, 0, Math.PI / 2), PAL.black, [0, 5.3, 0]);
    for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + Math.PI / 4; a.box(0.6, 0.9, 0.12, PAL.dgrey, [Math.cos(an) * 1.5, 3.4, Math.sin(an) * 1.5], [0, -an + Math.PI / 2, 0]); a.cyl(0.07, 0.07, 0.25, 6, PAL.black, [Math.cos(an) * 1.62, 4.2, Math.sin(an) * 1.62], [Math.sin(an) * 1.4, 0, -Math.cos(an) * 1.4]); }
    a.cyl(2.0, 2.0, 3.0, 32, PAL.white, [0, 0.1, 0]); f.cyl(2.04, 2.04, 0.25, 32, PAL.black, [0, -1.4, 0]); a.cyl(1.95, 1.95, 0.16, 32, PAL.grey, [0, 1.55, 0]);
    for (const s of [-1, 1]) { a.box(0.12, 3.0, 1.2, PAL.white, [s * 2.0, 0.1, 0]); const w = solarWing(1.2, 3.0, { cols: 2, rows: 6, mast: false }); w.rotation.z = Math.PI / 2; w.position.set(s * 2.15, 0.1, 0); g.add(w); }
    for (let k = 0; k < 8; k++) { const an = k / 8 * TAU; a.cyl(0.1, 0.1, 0.3, 6, PAL.dgrey, [Math.cos(an) * 1.95, 1.4, Math.sin(an) * 1.95], [Math.sin(an) * 1.3, 0, -Math.cos(an) * 1.3]); }
    g.add(a.mesh(mp.std, true), f.mesh(mp.foil, true)); dims(g, { realHeightM: 8.1, realWidthM: 4.0, note: 'crew capsule + trunk; Draco thrusters puff' });
    const puffs = []; for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + 0.4, p = flowSprites({ n: 40, dir: [Math.cos(an), 0.2, Math.sin(an)], length: 1.6, spread: 0.2, speed: 1.6, size: [0.1, 0.3], colors: [0xffffff, 0xaad0ff, 0x4a70ff], pow: 1.0, seed: 8 + k }); p.position.set(Math.cos(an) * 2.05, 1.4, Math.sin(an) * 2.05); g.add(p); puffs.push(p); }
    ticks.push((t) => puffs.forEach((p, i) => { p.setTime(t); const on = ((t * 0.8 + i * 0.27) % 1) < 0.35; p.setLevel(on ? 1 : 0); }));
  }
  g.update = g.userData.update = (t) => { for (const f of ticks) f(t); g.rotation.z = 0.04 * Math.sin(t * 0.4); };
  g.update(0); return g;
}
