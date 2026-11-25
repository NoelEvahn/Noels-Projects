// City pack: vehicles at real scale (metres), facing +Z, origin at ground level between the axles.
// Every vehicle: userData.update(t) (wheels spin at userData.speed m/s, lights blink/flash), userData.setOdometer(d) (wheels as if rolled d metres:
// use it when a path system moves the car), userData.realHeightM / realLengthM / realWidthM.
// Also exports the low-detail instanced `fleet` used by parking garages, cityBlock and trafficFlow.
import * as THREE from 'three';
import {
  Batch, PAL, BODY_COLORS, anim, meta, signMesh, wheel, lampMesh, halo, gBox, gSph, gCyl, gPlane, gRbox, inst, profileGeo, rng, shade, lerp, TAU, fract, clamp, smooth, mat, vcMat,
} from './city_kit.js';

const GLASS = 0x2b3b52, DARK = 0x1c1e26, CHROME = 0xcfd6e0;
const KINDS = {
  sedan: { L: 4.5, belt: 0.98, roofY: 1.43, rc: -1.28, rt: -0.88, ft: 0.78, fc: 1.32, wr: 0.33, wb: 1.38, W: 1.8 },
  hatch: { L: 3.9, belt: 0.95, roofY: 1.5, rc: -1.75, rt: -1.35, ft: 0.6, fc: 1.1, wr: 0.31, wb: 1.2, W: 1.72 },
  wagon: { L: 4.8, belt: 0.98, roofY: 1.5, rc: -2.15, rt: -1.9, ft: 0.8, fc: 1.34, wr: 0.34, wb: 1.45, W: 1.82 },
  suv: { L: 4.7, belt: 1.12, roofY: 1.8, rc: -2.1, rt: -1.95, ft: 0.95, fc: 1.35, wr: 0.4, wb: 1.5, W: 1.95 },
};
function lowerPts(k) {
  const hl = k.L / 2, { belt, rc, fc, wr, wb } = k, R = wr + 0.09, pts = [];
  pts.push([-hl, 0.42], [-hl - 0.02, 0.64], [-hl + 0.03, belt - 0.1], [rc - 0.35, belt - 0.01], [rc, belt], [fc, belt], [fc + 0.45, belt - 0.05], [hl - 0.22, belt - 0.17], [hl, belt - 0.34], [hl + 0.02, 0.5], [hl - 0.04, wr + 0.04], [hl - 0.12, wr]);
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; pts.push([wb + R * Math.cos(a), wr + R * Math.sin(a)]); }
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; pts.push([-wb + R * Math.cos(a), wr + R * Math.sin(a)]); }
  pts.push([-hl + 0.12, wr]);
  return pts;
}
// adds one car's bodywork. bb = body-coloured parts, bd = details (can be the same batch). returns {wheels:[[x,z]], wr, k}
export function carBody(bb, bd, { color = PAL.red, kind = 'sedan', lod = 'high' } = {}) {
  const k = KINDS[kind] ?? KINDS.sedan, hl = k.L / 2, W = k.W, { belt, roofY, rc, rt, ft, fc, wr, wb } = k, rot = [0, -Math.PI / 2, 0];
  bb.profile(lowerPts(k), W, 0.13, color, [0, 0, 0], { r: rot, rough: 0.28, metal: 0.25 });
  bd.profile([[rc, belt - 0.02], [rt, roofY], [ft, roofY], [fc, belt - 0.02]], W - 0.2, 0.04, GLASS, [0, 0, 0], { r: rot, rough: 0.08, metal: 0.4 });
  bb.rbox(ft - rt + 0.1, 0.1, W - 0.16, 0.04, color, [0, roofY + 0.03, (rt + ft) / 2], { r: [0, Math.PI / 2, 0], rough: 0.28, metal: 0.25 });
  for (const s of [-1, 1]) {
    const x = s * (W - 0.2) / 2;
    bb.bar([x, belt, fc + 0.02], [x, roofY, ft], 0.09, color, { rough: 0.3 }); bb.bar([x, belt, rc - 0.02], [x, roofY, rt], 0.12, color, { rough: 0.3 });
    bb.bar([x, belt, (rt + ft) / 2 - 0.05], [x, roofY, (rt + ft) / 2 - 0.05], 0.07, shade(color, 0.7), { rough: 0.3 });
  }
  const wheels = [[wb, 1], [wb, -1], [-wb, 1], [-wb, -1]].map(([z, sx]) => [sx * (W / 2 - 0.12), z]);
  for (const z of [wb, -wb]) bd.cyl(wr + 0.075, wr + 0.075, W - 0.3, 12, 0x14151b, [0, wr, z], { r: [0, 0, Math.PI / 2] });
  bd.rbox(W - 0.06, 0.2, 0.14, 0.06, 0x2a2d36, [0, 0.48, hl - 0.02], { rough: 0.5 }); bd.rbox(W - 0.06, 0.2, 0.14, 0.06, 0x2a2d36, [0, 0.48, -hl + 0.02], { rough: 0.5 });
  for (const s of [-1, 1]) { bd.rbox(0.34, 0.15, 0.1, 0.05, 0xfff3c4, [s * 0.62, belt - 0.24, hl - 0.01], { glow: true }); bd.rbox(0.42, 0.14, 0.1, 0.05, 0xd9262c, [s * 0.66, belt - 0.12, -hl + 0.01], { glow: true }); }
  bd.rbox(0.78, 0.17, 0.08, 0.04, 0x15161c, [0, belt - 0.3, hl - 0.005], { rough: 0.5 });
  if (lod === 'high') {
    bd.box(0.5, 0.13, 0.03, 0xf4f4ee, [0, 0.52, hl + 0.06]); bd.box(0.5, 0.13, 0.03, 0xf4f4ee, [0, 0.52, -hl - 0.06]);
    for (const s of [-1, 1]) {
      bd.box(0.1, 0.09, 0.2, 0x20232b, [s * (W / 2 + 0.06), belt + 0.1, fc - 0.18]); bd.box(0.06, 0.06, 0.08, 0x20232b, [s * (W / 2 + 0.02), belt + 0.04, fc - 0.12]);
      for (const z of [(rt + ft) / 2 - 0.05, rc + 0.1, ft + 0.2]) bd.box(0.02, 0.5, 0.02, 0x14151b, [s * (W / 2 + 0.003), belt - 0.32, z]);
      for (const z of [0.3, -0.7]) bd.box(0.02, 0.04, 0.2, CHROME, [s * (W / 2 + 0.01), belt - 0.12, z], { metal: 0.7 });
    }
  }
  return { wheels, wr, k, wb, W, L: k.L, hl };
}
// vehicle scaffold: group + animation + wheels registry
function veh(name, { speed = 0 } = {}) {
  const g = new THREE.Group(), A = anim(g), wheels = [];
  g.userData.speed = speed;
  g.userData.setOdometer = (d) => { for (const w of wheels) w.m.rotation.x = d / w.r; };
  A.on((t) => { if (g.userData.speed) g.userData.setOdometer(g.userData.speed * t); });
  const addWheel = (x, y, z, r, w = 0.24, o = {}) => { const m = wheel(r, w, o); m.position.set(x, y ?? r, z); g.add(m); wheels.push({ m, r }); return m; };
  return { g, A, wheels, addWheel, name };
}
function wheelsFor(V, c) { for (const [x, z] of c.wheels) V.addWheel(x, c.wr, z, c.wr, 0.24); }

// ---------------------------------------------------------------- sedan family
export function sedan({ color = PAL.red, kind = 'sedan', speed = 0, seed = 1, blinkers = true } = {}) {
  const V = veh('sedan', { speed }), b = new Batch(), c = carBody(b, b, { color, kind });
  b.build(V.g); wheelsFor(V, c);
  // turn signals (amber, blink in update) front + rear
  const amber = []; for (const sz of [1, -1]) for (const s of [-1, 1]) { const m = lampMesh(gBox(0.16, 0.1, 0.06), 0xffa020, 0.2); m.position.set(s * 0.8, c.k.belt - 0.28, sz * (c.hl + (sz > 0 ? 0.0 : 0.0))); if (sz < 0) m.position.y = c.k.belt - 0.12 + 0.0; m.position.z = sz * (c.hl + 0.005); V.g.add(m); amber.push({ m, s }); }
  V.A.on((t) => { const on = blinkers && fract(t * 1.2) < 0.5, side = fract(Math.floor(t / 4) * 0.5) < 0.25 ? -1 : 1; amber.forEach((a) => a.m.material.userData.set(on && a.s === side ? 1.4 : 0.15)); });
  return meta(V.g, { h: c.k.roofY + 0.05, w: c.W, name: 'sedan' }), Object.assign(V.g.userData, { realLengthM: c.k.L }), V.g;
}
export function taxi({ speed = 0, color = 0xf6c235 } = {}) {
  const V = veh('taxi', { speed }), b = new Batch(), c = carBody(b, b, { color, kind: 'sedan' }), W = c.W;
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) if (i % 2 === 0) b.box(0.02, 0.1, 0.22, 0x15161c, [s * (W / 2 + 0.008), 0.9, -1.5 + i * 0.3 + 0.1]);
  for (let i = 0; i < 9; i++) for (const s of [-1, 1]) if (i % 2) b.box(0.02, 0.1, 0.22, 0x15161c, [s * (W / 2 + 0.008), 0.8, -1.5 + i * 0.3 + 0.1]);
  b.box(W - 0.2, 0.04, 0.06, 0x15161c, [0, 0.4, c.hl + 0.03]);
  b.rbox(0.7, 0.2, 0.34, 0.06, 0xf4f4ee, [0, 1.62 + 0.0, -0.05], { rough: 0.5 });
  const lit = lampMesh(gBox(0.72, 0.2, 0.36), 0xfff0b0, 1); lit.position.set(0, 1.64, -0.05); V.g.add(lit); lit.scale.set(0.96, 0.85, 1.01);
  for (const [ry, z] of [[0, 0.135], [Math.PI, -0.235]]) { const s = signMesh('TAXI', 0.62, 0.17, { bg: null, fg: '#1a1a1a', weight: 400, fit: 0.9 }); s.position.set(0, 1.64, -0.05 + (ry ? -0.19 : 0.19)); s.rotation.y = ry; V.g.add(s); }
  b.build(V.g); wheelsFor(V, c);
  V.A.on((t) => { lit.material.userData.set(1 + 0.25 * Math.sin(t * 3)); });
  return meta(V.g, { h: 1.78, w: W, name: 'taxi' }), Object.assign(V.g.userData, { realLengthM: c.k.L }), V.g;
}
export function policeCar({ speed = 0 } = {}) {
  const V = veh('police', { speed }), b = new Batch(), c = carBody(b, b, { color: 0xf4f6f8, kind: 'sedan' }), W = c.W, k = c.k;
  for (const s of [-1, 1]) { b.box(0.02, 0.55, 1.75, 0x1b2438, [s * (W / 2 + 0.004), 0.7, -0.05]); b.box(0.02, 0.1, 1.5, 0x2f6fd6, [s * (W / 2 + 0.006), 0.95, -0.05]); }
  b.box(W - 0.1, 0.3, 0.02, 0x1b2438, [0, 0.72, c.hl + 0.03]);
  b.box(1.1, 0.12, 0.2, 0x15161c, [0, 1.52, -0.9]); b.box(1.1, 0.16, 0.2, 0x15161c, [0, 1.48, 0.25]);
  b.box(1.3, 0.08, 0.34, 0x15161c, [0, 1.49, -0.05]);
  const red = lampMesh(gBox(0.5, 0.15, 0.3), 0xff2b2b, 0.2), blue = lampMesh(gBox(0.5, 0.15, 0.3), 0x2b6bff, 0.2);
  red.position.set(-0.32, 1.58, -0.05); blue.position.set(0.32, 1.58, -0.05); V.g.add(red, blue);
  const hr = halo(0xff2b2b, 0.9, 0), hb = halo(0x2b6bff, 0.9, 0); hr.position.copy(red.position); hr.position.y += 0.1; hb.position.copy(blue.position); hb.position.y += 0.1; V.g.add(hr, hb);
  for (const [s, ry] of [[1, Math.PI / 2], [-1, -Math.PI / 2]]) { const sg = signMesh('POLICE', 1.5, 0.34, { bg: null, fg: '#1b2438', weight: 400 }); sg.position.set(s * (W / 2 + 0.012), 0.72, -0.05); sg.rotation.y = ry; V.g.add(sg); }
  const hs = signMesh('POLICE', 1.3, 0.3, { bg: null, fg: '#1b2438', weight: 400 }); hs.rotation.x = -Math.PI / 2; hs.position.set(0, k.belt + 0.002 - 0.0, 1.6); hs.rotation.z = Math.PI; hs.visible = false;
  b.box(W - 0.2, 0.28, 0.1, 0x15161c, [0, 0.62, c.hl + 0.1]);   // push bar
  b.build(V.g); wheelsFor(V, c);
  V.A.on((t) => { const p = fract(t * 2.2), a = (p < 0.12 || (p > 0.2 && p < 0.32)) ? 1 : 0, bl = (p > 0.5 && p < 0.62) || (p > 0.7 && p < 0.82) ? 1 : 0; red.material.userData.set(0.15 + 1.6 * a); blue.material.userData.set(0.15 + 1.6 * bl); hr.material.opacity = 0.55 * a; hb.material.opacity = 0.55 * bl; hr.visible = a > 0; hb.visible = bl > 0; });
  return meta(V.g, { h: 1.7, w: W, name: 'policeCar' }), Object.assign(V.g.userData, { realLengthM: k.L }), V.g;
}

// ---------------------------------------------------------------- city bus
export function bus({ color = 0xd9392f, speed = 0, route = '42', dest = 'DOWNTOWN' } = {}) {
  const V = veh('bus', { speed }), b = new Batch(), L = 11.6, W = 2.55, H = 3.15, hl = L / 2;
  const wb = 3.9, rb = -3.2, wr = 0.5;
  b.rbox(W, 2.4, L, 0.3, color, [0, 0.55 + 1.2, 0], { rough: 0.35, metal: 0.15 });
  b.box(W - 0.1, 0.45, L - 0.6, 0xf4f1e8, [0, 0.55 + 0.3, 0.0], { rough: 0.5 });        // skirt band
  b.rbox(W - 0.1, 0.18, L - 0.2, 0.08, 0xf4f1e8, [0, H - 0.1, 0]); b.rbox(1.3, 0.35, 2.4, 0.15, 0xe3e6ea, [0, H + 0.08, -2.4], { metal: 0.3 }); b.rbox(1.0, 0.3, 1.6, 0.12, 0xe3e6ea, [0, H + 0.06, 1.0], { metal: 0.3 });
  b.box(W - 0.05, 0.07, L - 0.1, 0x20232b, [0, 0.55 + 0.04, 0]);                          // chassis shadow strip
  // window band + pillars + passengers
  for (const s of [-1, 1]) {
    b.box(0.03, 0.95, L - 2.4, GLASS, [s * (W / 2 + 0.003), 2.05, -0.5], { rough: 0.08, metal: 0.4 });
    for (let i = 0; i <= 8; i++) b.box(0.05, 1.0, 0.14, color, [s * (W / 2 + 0.01), 2.05, -hl + 1.3 + i * ((L - 3.4) / 8)]);
    b.box(0.05, 0.08, L - 2.4, 0xf4f1e8, [s * (W / 2 + 0.012), 2.55, -0.5]); b.box(0.05, 0.08, L - 2.4, 0xf4f1e8, [s * (W / 2 + 0.012), 1.57, -0.5]);
  }
  b.box(W - 0.1, 0.95, 0.04, GLASS, [0, 2.0, hl + 0.01], { rough: 0.08, metal: 0.4 }); b.box(W - 0.1, 0.6, 0.04, GLASS, [0, 2.0, -hl - 0.01], { rough: 0.08 });
  b.box(0.06, 0.95, 0.06, 0x20232b, [0, 2.0, hl + 0.03]);
  // interior glow + seat backs seen through the windows
  b.box(W - 0.35, 0.05, L - 2.6, 0xffe9b0, [0, 2.55, -0.5], { glow: true });
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) b.rbox(0.45, 0.6, 0.12, 0.05, i % 2 ? 0x2f6fd6 : 0x1f4fb0, [s * 0.75, 1.7, -hl + 1.8 + i * 1.05]);
  // doors (front + middle), on the right side (x = +W/2)
  for (const z of [hl - 1.0, -0.2]) { b.box(0.05, 2.0, 1.05, 0x20232b, [W / 2 + 0.012, 1.55, z]); b.box(0.06, 1.7, 0.45, GLASS, [W / 2 + 0.02, 1.75, z - 0.26], { rough: 0.1 }); b.box(0.06, 1.7, 0.45, GLASS, [W / 2 + 0.02, 1.75, z + 0.26], { rough: 0.1 }); b.box(0.06, 0.1, 1.0, 0xf6c235, [W / 2 + 0.03, 0.62, z]); }
  // lights, mirrors, grille, bumpers, plate, AC pod
  for (const s of [-1, 1]) { b.rbox(0.4, 0.2, 0.1, 0.05, 0xfff3c4, [s * 0.85, 0.9, hl + 0.02], { glow: true }); b.rbox(0.28, 0.5, 0.1, 0.05, 0xd9262c, [s * 1.05, 1.0, -hl + 0.02], { glow: true }); b.box(0.06, 0.95, 0.06, 0x20232b, [s * 1.45, 2.2, hl - 0.3]); b.rbox(0.2, 0.55, 0.12, 0.05, 0x20232b, [s * 1.55, 2.3, hl - 0.28]); }
  b.rbox(W - 0.1, 0.3, 0.16, 0.08, 0x2a2d36, [0, 0.62, hl]); b.rbox(W - 0.1, 0.3, 0.16, 0.08, 0x2a2d36, [0, 0.62, -hl]);
  b.box(0.7, 0.2, 0.03, 0xf4f4ee, [0, 0.62, hl + 0.09]);
  for (const s of [-1, 1]) b.cyl(0.06, 0.06, 0.55, 6, 0x15161c, [s * 0.45, 2.5, hl + 0.02], { r: [0, 0, 0.5 * s] });
  // wheel arches (dark) so the tyres sit in real cut-outs
  for (const z of [wb, rb]) for (const s of [-1, 1]) b.cyl(wr + 0.09, wr + 0.09, 0.2, 14, 0x14151b, [s * (W / 2 - 0.12), wr, z], { r: [0, 0, Math.PI / 2] });
  b.build(V.g);
  for (const z of [wb, rb]) for (const s of [-1, 1]) V.addWheel(s * (W / 2 - 0.1), wr, z, wr, 0.3);
  // destination display + route number (glowing amber)
  const ds = signMesh(`${route}  ${dest}`, 2.2, 0.38, { bg: '#0a0a0a', fg: '#ffb020', weight: 400, radius: 0.1 }); ds.position.set(0, 2.78, hl + 0.035); V.g.add(ds);
  for (const [s, ry] of [[1, Math.PI / 2], [-1, -Math.PI / 2]]) { const rs = signMesh(route, 0.5, 0.34, { bg: '#0a0a0a', fg: '#ffb020', radius: 0.1 }); rs.position.set(s * (W / 2 + 0.03), 2.78, hl - 1.0); rs.rotation.y = ry; V.g.add(rs); const sd = signMesh('CITY BUS', 1.8, 0.4, { bg: null, fg: '#ffffff', weight: 400 }); sd.position.set(s * (W / 2 + 0.03), 1.0, 0.0); sd.rotation.y = ry; V.g.add(sd); }
  const stop = lampMesh(gBox(0.6, 0.14, 0.04), 0xff2020, 0.2); stop.position.set(0, 2.6, hl - 0.05); stop.position.y = 2.62; V.g.add(stop); stop.visible = false;
  // passengers: heads bob in the windows
  const heads = new THREE.InstancedMesh(gSph(0.17, 8, 6), mat(0xffffff, { rough: 0.7 }), 14), hp = [], rnd = rng(11); const cols = [0xf2b98f, 0xd99a6c, 0x9b6338, 0xf8d5b8, 0x6b4226];
  for (let i = 0; i < 14; i++) { const s = i % 2 ? 1 : -1, z = -hl + 1.8 + Math.floor(i / 2) * 1.2 + rnd() * 0.3; hp.push({ x: s * 0.72, z, ph: rnd() * TAU }); heads.setColorAt(i, new THREE.Color(cols[Math.floor(rnd() * cols.length)])); }
  heads.castShadow = false; V.g.add(heads); const o = new THREE.Object3D();
  V.A.on((t) => { hp.forEach((h, i) => { o.position.set(h.x, 2.2 + Math.sin(t * 2.4 + h.ph) * 0.03, h.z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); heads.setMatrixAt(i, o.matrix); }); heads.instanceMatrix.needsUpdate = true; });
  return meta(V.g, { h: H + 0.25, w: W, name: 'bus' }), Object.assign(V.g.userData, { realLengthM: L }), V.g;
}

// ---------------------------------------------------------------- delivery truck / van, with amber hazards
export function deliveryTruck({ color = 0xf4f1e8, accent = 0x2f6fd6, speed = 0, name = 'SWIFT' } = {}) {
  const V = veh('truck', { speed }), b = new Batch(), W = 2.3, wr = 0.45;
  b.rbox(W, 2.45, 4.6, 0.18, color, [0, 0.62 + 1.225, -0.9], { rough: 0.5 });                                  // cargo box
  b.rbox(W, 1.5, 1.7, 0.2, accent, [0, 0.55 + 0.9, 2.15], { rough: 0.35, metal: 0.15 });                          // cab
  b.rbox(W - 0.1, 0.55, 0.6, 0.15, accent, [0, 0.55 + 0.3, 2.95], { rough: 0.35 });                                // bonnet
  b.profile([[-0.85, 0], [-0.85, 0.05], [0.0, 1.05], [0.85, 1.05], [0.85, 0]], W - 0.2, 0.05, GLASS, [0, 1.55, 2.5], { r: [0, -Math.PI / 2, 0], rough: 0.08, metal: 0.4 });
  b.box(W - 0.15, 0.6, 0.03, GLASS, [0, 1.95, 2.99], { rough: 0.08, metal: 0.4 });
  b.box(W + 0.02, 0.12, 4.6, accent, [0, 0.8, -0.9]); b.box(W + 0.02, 0.1, 4.6, accent, [0, 2.6, -0.9]);
  b.box(W - 0.1, 0.1, 0.1, 0x20232b, [0, 1.7, -3.22]);
  for (let i = 0; i < 5; i++) b.box(W - 0.2, 0.025, 0.02, 0xcfd3d8, [0, 1.0 + i * 0.35, -3.205]);                       // roller door ribs
  b.rbox(W - 0.1, 0.25, 0.3, 0.08, 0x2a2d36, [0, 0.68, -3.25]); b.rbox(W - 0.1, 0.3, 0.2, 0.08, 0x2a2d36, [0, 0.62, 3.3]);
  b.box(0.1, 0.9, 0.04, 0x20232b, [W / 2 + 0.01, 1.5, 1.35]); b.box(0.04, 0.12, 0.3, CHROME, [W / 2 + 0.015, 1.5, 1.7], { metal: 0.7 }); b.box(0.04, 0.12, 0.3, CHROME, [-W / 2 - 0.015, 1.5, 1.7], { metal: 0.7 });
  for (const s of [-1, 1]) { b.rbox(0.3, 0.16, 0.1, 0.05, 0xfff3c4, [s * 0.8, 0.95, 3.31], { glow: true }); b.rbox(0.18, 0.4, 0.1, 0.05, 0xd9262c, [s * 0.95, 0.95, -3.25], { glow: true }); b.box(0.08, 0.5, 0.08, 0x20232b, [s * (W / 2 + 0.2), 1.9, 2.4]); b.rbox(0.14, 0.5, 0.18, 0.05, 0x20232b, [s * (W / 2 + 0.3), 2.0, 2.4]); }
  for (const z of [2.2, -2.0, -2.9]) for (const s of [-1, 1]) b.cyl(wr + 0.09, wr + 0.09, 0.2, 14, 0x14151b, [s * (W / 2 - 0.12), wr, z], { r: [0, 0, Math.PI / 2] });
  b.rbox(0.9, 0.3, 0.06, 0.06, 0xe8c030, [0, 2.55, 3.05], { rough: 0.5 });
  b.build(V.g);
  for (const z of [2.2, -2.0]) for (const s of [-1, 1]) V.addWheel(s * (W / 2 - 0.1), wr, z, wr, 0.3);
  const lg = signMesh(name, 3.4, 1.15, { bg: '#' + new THREE.Color(accent).getHexString(), fg: '#ffffff', border: '#ffd23f' });
  for (const [s, ry] of [[1, Math.PI / 2], [-1, -Math.PI / 2]]) { const m = lg.clone(); m.position.set(s * (W / 2 + 0.02), 1.75, -0.9); m.rotation.y = ry; V.g.add(m); }
  const lg2 = signMesh(name, 1.6, 0.55, { bg: '#' + new THREE.Color(accent).getHexString(), fg: '#ffffff' }); lg2.rotation.y = Math.PI; lg2.position.set(0, 2.15, -3.23); V.g.add(lg2);
  const hz = [], hh = []; for (const sz of [1, -1]) for (const s of [-1, 1]) { const m = lampMesh(gBox(0.2, 0.12, 0.06), 0xffa020, 0.2); m.position.set(s * 0.95, sz > 0 ? 1.15 : 1.15, sz > 0 ? 3.33 : -3.27); V.g.add(m); hz.push(m); const h = halo(0xffa020, 0.35, 0); h.position.copy(m.position); V.g.add(h); hh.push(h); }
  V.A.on((t) => { const on = fract(t * 1.5) < 0.5 ? 1 : 0; hz.forEach((m, i) => { m.material.userData.set(0.15 + 1.5 * on); hh[i].material.opacity = 0.5 * on; hh[i].visible = !!on; }); });
  return meta(V.g, { h: 3.1, w: W, name: 'deliveryTruck' }), Object.assign(V.g.userData, { realLengthM: 6.6 }), V.g;
}

// ---------------------------------------------------------------- fire truck with raising ladder
export function fireTruck({ speed = 0 } = {}) {
  const V = veh('fire', { speed }), b = new Batch(), W = 2.5, wr = 0.55, red = 0xd9262c;
  b.rbox(W, 1.5, 6.4, 0.2, red, [0, 0.65 + 0.75, -1.5], { rough: 0.3, metal: 0.15 });                           // body
  b.rbox(W, 1.9, 2.3, 0.22, red, [0, 0.65 + 0.95, 3.05], { rough: 0.3, metal: 0.15 });                           // cab
  b.profile([[-0.9, 0], [-0.88, 0.1], [-0.05, 0.9], [0.9, 0.9], [0.9, 0]], W - 0.2, 0.05, GLASS, [0, 1.75, 3.55], { r: [0, -Math.PI / 2, 0], rough: 0.08, metal: 0.4 });
  b.box(W - 0.15, 0.7, 0.03, GLASS, [0, 2.1, 4.22], { rough: 0.08, metal: 0.4 });
  b.box(W + 0.02, 0.08, 6.4, 0xf4f1e8, [0, 1.15, -1.5]); b.box(W + 0.02, 0.08, 2.3, 0xf4f1e8, [0, 1.15, 3.05]); b.box(W + 0.02, 0.06, 8.7, 0xf6c235, [0, 1.05, 0.2]);
  b.box(W + 0.02, 0.4, 1.0, 0x20232b, [0, 0.9, 4.2]); b.rbox(W - 0.1, 0.35, 0.25, 0.1, CHROME, [0, 0.68, 4.3], { metal: 0.8, rough: 0.2 }); b.rbox(W - 0.1, 0.3, 0.2, 0.08, 0x2a2d36, [0, 0.62, -4.75]);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { b.box(0.03, 0.85, 1.55, 0x9aa1ab, [s * (W / 2 + 0.01), 1.45, -3.3 + i * 1.7], { metal: 0.4, rough: 0.45 }); for (let k = 0; k < 4; k++) b.box(0.04, 0.02, 1.5, 0x6a7380, [s * (W / 2 + 0.02), 1.15 + k * 0.2, -3.3 + i * 1.7]); }
  for (const s of [-1, 1]) { b.rbox(0.36, 0.18, 0.12, 0.05, 0xfff3c4, [s * 0.9, 1.05, 4.34], { glow: true }); b.rbox(0.22, 0.5, 0.1, 0.05, 0xff2020, [s * 1.0, 1.1, -4.7], { glow: true }); b.box(0.08, 0.7, 0.08, 0x20232b, [s * (W / 2 + 0.25), 2.2, 3.3]); b.rbox(0.14, 0.65, 0.2, 0.05, 0x20232b, [s * (W / 2 + 0.35), 2.3, 3.3]); }
  for (const z of [3.0, -1.2, -2.7]) for (const s of [-1, 1]) b.cyl(wr + 0.09, wr + 0.09, 0.22, 14, 0x14151b, [s * (W / 2 - 0.12), wr, z], { r: [0, 0, Math.PI / 2] });
  // ladder cradle, hose reels, rear steps, turntable
  b.rbox(1.1, 0.28, 1.6, 0.1, 0x9aa1ab, [0, 2.3, -3.6], { metal: 0.5 }); b.cyl(0.55, 0.6, 0.3, 14, 0x20232b, [0, 2.4, -3.6]);
  for (const s of [-1, 1]) { b.bar([s * 0.45, 2.3, 0.6], [s * 0.45, 2.3, -4.2], 0.08, 0x9aa1ab, { metal: 0.6 }); b.bar([s * 0.45, 2.3, 0.6], [s * 0.45, 2.7, 0.6], 0.08, 0x9aa1ab); }
  b.cyl(0.38, 0.38, 0.5, 12, 0xf6c235, [0.0, 2.55, 1.3], { r: [0, 0, Math.PI / 2] }); b.box(W, 0.15, 0.6, 0xf4f1e8, [0, 0.82, -4.85]);
  for (const sx of [-1, 1]) b.box(0.15, 0.2, 1.4, 0x20232b, [sx * 1.6, 0.55, -3.9], { rough: 0.5 });
  b.build(V.g);
  for (const z of [3.0, -1.2, -2.7]) for (const s of [-1, 1]) V.addWheel(s * (W / 2 - 0.1), wr, z, wr, 0.34);
  // ladder: pivot on the turntable, raises and swings in update(t)
  const pivot = new THREE.Group(); pivot.position.set(0, 2.55, -3.6); V.g.add(pivot);
  const lb = new Batch(), LL = 9.0;
  for (const s of [-1, 1]) { lb.box(0.1, 0.18, LL, 0xe8e8ea, [s * 0.38, 0, LL / 2 - 0.5], { rough: 0.4, metal: 0.4 }); lb.box(0.06, 0.1, LL * 0.7, 0xcfd3d8, [s * 0.38, 0.14, LL * 0.4]); }
  for (let i = 0; i < 18; i++) lb.box(0.76, 0.06, 0.06, 0xf6c235, [0, 0.0, -0.3 + i * (LL - 0.8) / 17]);
  lb.rbox(0.9, 0.5, 0.5, 0.08, 0xd9262c, [0, 0.0, LL - 0.4]);
  lb.build(pivot);
  V.A.on((t) => { pivot.rotation.x = -(0.08 + 0.55 * smooth(0.5 + 0.5 * Math.sin(t * 0.5))); pivot.rotation.y = Math.sin(t * 0.25) * 0.5 * smooth(0.5 + 0.5 * Math.sin(t * 0.5)); });
  // light bar (red/white alternating) + front flashers
  const L1 = lampMesh(gBox(0.55, 0.16, 0.3), 0xff2020, 0.2), L2 = lampMesh(gBox(0.55, 0.16, 0.3), 0xffffff, 0.2), L3 = lampMesh(gBox(0.55, 0.16, 0.3), 0xff2020, 0.2), L4 = lampMesh(gBox(0.55, 0.16, 0.3), 0xffffff, 0.2);
  const lbs = [L1, L2, L3, L4]; lbs.forEach((m, i) => { m.position.set(-0.9 + i * 0.6, 2.77, 3.05); V.g.add(m); }); b2(V.g, 0x15161c, [0, 2.6, 3.05], [2.5, 0.1, 0.4]);
  const hr = halo(0xff2020, 1.0, 0), hw = halo(0xffffff, 1.0, 0); hr.position.set(-0.6, 2.85, 3.05); hw.position.set(0.6, 2.85, 3.05); V.g.add(hr, hw);
  V.A.on((t) => { const p = fract(t * 2.0), a = p < 0.5 ? 1 : 0; L1.material.userData.set(0.2 + 1.6 * a); L3.material.userData.set(0.2 + 1.6 * a); L2.material.userData.set(0.2 + 1.6 * (1 - a)); L4.material.userData.set(0.2 + 1.6 * (1 - a)); hr.material.opacity = 0.5 * a; hw.material.opacity = 0.5 * (1 - a); hr.visible = !!a; hw.visible = !a; });
  const fd = signMesh('FIRE DEPT', 1.9, 0.4, { bg: null, fg: '#ffffff', weight: 400 }); for (const [s, ry] of [[1, Math.PI / 2], [-1, -Math.PI / 2]]) { const m = fd.clone(); m.position.set(s * (W / 2 + 0.02), 1.55, 3.1); m.rotation.y = ry; V.g.add(m); }
  const n12 = signMesh('ENGINE 7', 1.5, 0.3, { bg: null, fg: '#f6c235', weight: 400 }); for (const [s, ry] of [[1, Math.PI / 2], [-1, -Math.PI / 2]]) { const m = n12.clone(); m.position.set(s * (W / 2 + 0.02), 1.35, -1.5); m.rotation.y = ry; V.g.add(m); }
  return meta(V.g, { h: 3.2, w: W, name: 'fireTruck' }), Object.assign(V.g.userData, { realLengthM: 10.5 }), V.g;
}
function b2(parent, color, p, s) { const m = new THREE.Mesh(gBox(1, 1, 1), mat(color)); m.position.set(...p); m.scale.set(...s); parent.add(m); return m; }

// ---------------------------------------------------------------- ambulance
export function ambulance({ speed = 0 } = {}) {
  const V = veh('amb', { speed }), b = new Batch(), W = 2.2, wr = 0.42;
  b.rbox(W, 1.9, 3.7, 0.2, 0xf6f7fa, [0, 0.6 + 0.95, -0.9], { rough: 0.35 });
  b.rbox(W, 1.35, 1.7, 0.22, 0xf6f7fa, [0, 0.55 + 0.7, 1.9], { rough: 0.35 }); b.rbox(W - 0.1, 0.5, 0.7, 0.15, 0xf6f7fa, [0, 0.55 + 0.28, 2.75]);
  b.profile([[-0.8, 0], [-0.8, 0.05], [0.0, 0.95], [0.85, 0.95], [0.85, 0]], W - 0.2, 0.05, GLASS, [0, 1.45, 2.25], { r: [0, -Math.PI / 2, 0], rough: 0.08, metal: 0.4 });
  b.box(W - 0.15, 0.55, 0.03, GLASS, [0, 1.8, 2.99], { rough: 0.08 });
  b.box(W + 0.02, 0.35, 5.5, 0xd9262c, [0, 1.05, -0.2]); b.box(W + 0.02, 0.1, 5.5, 0xf6c235, [0, 1.3, -0.2]);
  b.rbox(W - 0.1, 0.3, 0.3, 0.08, 0x2a2d36, [0, 0.6, -2.85]); b.rbox(W - 0.1, 0.3, 0.2, 0.08, 0x2a2d36, [0, 0.6, 3.1]);
  b.box(0.04, 1.6, 0.04, 0x9aa1ab, [0, 1.55, -2.75]); b.box(0.06, 0.1, 0.4, CHROME, [0.5, 1.4, -2.78], { metal: 0.7 }); b.box(0.06, 0.1, 0.4, CHROME, [-0.5, 1.4, -2.78], { metal: 0.7 });
  for (const s of [-1, 1]) { b.rbox(0.3, 0.15, 0.1, 0.05, 0xfff3c4, [s * 0.75, 0.95, 3.1], { glow: true }); b.rbox(0.18, 0.4, 0.1, 0.05, 0xd9262c, [s * 0.9, 1.1, -2.82], { glow: true }); b.box(0.08, 0.5, 0.08, 0x20232b, [s * (W / 2 + 0.2), 1.7, 2.2]); b.rbox(0.14, 0.45, 0.18, 0.05, 0x20232b, [s * (W / 2 + 0.3), 1.8, 2.2]); }
  for (const z of [2.1, -1.5]) for (const s of [-1, 1]) b.cyl(wr + 0.09, wr + 0.09, 0.2, 14, 0x14151b, [s * (W / 2 - 0.12), wr, z], { r: [0, 0, Math.PI / 2] });
  // red cross on the side + rear (geometry, glows softly)
  for (const s of [-1, 1]) { b.box(0.03, 0.9, 0.3, 0xd9262c, [s * (W / 2 + 0.012), 1.85, -0.9], { glow: true }); b.box(0.03, 0.3, 0.9, 0xd9262c, [s * (W / 2 + 0.012), 1.85, -0.9], { glow: true }); }
  b.build(V.g);
  for (const z of [2.1, -1.5]) for (const s of [-1, 1]) V.addWheel(s * (W / 2 - 0.1), wr, z, wr, 0.28);
  const bar = new THREE.Group(); const bb = new Batch(); bb.box(1.7, 0.12, 0.4, 0x15161c, [0, 0, 0]); bb.build(bar); bar.position.set(0, 1.98, 1.6); V.g.add(bar);
  const mk = (c, x) => { const m = lampMesh(gBox(0.5, 0.16, 0.34), c, 0.2); m.position.set(x, 2.08, 1.6); V.g.add(m); const h = halo(c, 0.9, 0); h.position.set(x, 2.18, 1.6); V.g.add(h); return [m, h]; };
  const [r1, h1] = mk(0xff2020, -0.6), [w1, h2] = mk(0xffffff, 0), [b1, h3] = mk(0x2b6bff, 0.6);
  V.A.on((t) => { const p = fract(t * 1.8); const a = p < 0.33 ? 1 : 0, c = p >= 0.33 && p < 0.66 ? 1 : 0, d = p >= 0.66 ? 1 : 0; r1.material.userData.set(0.2 + 1.6 * a); w1.material.userData.set(0.2 + 1.6 * c); b1.material.userData.set(0.2 + 1.6 * d); h1.material.opacity = 0.5 * a; h2.material.opacity = 0.5 * c; h3.material.opacity = 0.5 * d; h1.visible = !!a; h2.visible = !!c; h3.visible = !!d; });
  const sg = signMesh('AMBULANCE', 1.7, 0.34, { bg: null, fg: '#d9262c', weight: 400 }); for (const [s, ry] of [[1, Math.PI / 2], [-1, -Math.PI / 2]]) { const m = sg.clone(); m.position.set(s * (W / 2 + 0.02), 1.2, 0.2); m.rotation.y = ry; V.g.add(m); }
  return meta(V.g, { h: 2.4, w: W, name: 'ambulance' }), Object.assign(V.g.userData, { realLengthM: 5.8 }), V.g;
}

// ---------------------------------------------------------------- people on two wheels
function setBar(m, a, c, th) { const dir = new THREE.Vector3().subVectors(c, a), L = dir.length(); m.position.copy(a).addScaledVector(dir, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); m.scale.set(th, L, th); }
// two-bone IK in the YZ plane: hip, foot -> knee (bends forward +z)
function knee(hip, foot, l1, l2) {
  const dx = foot.y - hip.y, dz = foot.z - hip.z, d = Math.min(Math.hypot(dx, dz), l1 + l2 - 0.001), a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), base = Math.atan2(dz, dx);
  const ang = base - a; return new THREE.Vector3(hip.x, hip.y + Math.cos(ang) * l1, hip.z + Math.sin(ang) * l1);
}
export function bicycle({ color = 0x2f6fd6, rider = true, speed = 0, seed = 2, shirt = 0xf6c235, basket = false } = {}) {
  const V = veh('bicycle', { speed }), b = new Batch(), wr = 0.34, fz = 0.55, rz = -0.55, steel = shade(color, 0.9);
  const bp = (a, c, th = 0.04, col = color) => b.bar(a, c, th, col, { round: true, rough: 0.3, metal: 0.4 });
  const bb = [0, 0.3, 0.0], seat = [0, 0.86, -0.28], head = [0, 0.86, 0.42], hb = [0, 0.98, 0.45];
  bp(bb, seat); bp(bb, head); bp(seat, head); bp([0, 0.3, 0], [0, wr, rz]); bp(seat, [0, wr, rz], 0.03); bp(head, [0, wr, fz], 0.035, 0xc3cad4); bp(hb, head, 0.035, 0xc3cad4);
  b.bar([-0.28, hb[1], hb[2]], [0.28, hb[1], hb[2]], 0.03, 0x20232b, { round: true }); for (const s of [-1, 1]) b.cyl(0.02, 0.02, 0.14, 6, 0x20232b, [s * 0.28, hb[1] - 0.02, hb[2] - 0.02], { r: [Math.PI / 2, 0, 0] });
  b.rbox(0.14, 0.05, 0.3, 0.02, 0x20232b, [0, 0.9, -0.3]); b.cyl(0.02, 0.02, 0.12, 6, 0xc3cad4, [0, 0.82, -0.28]);
  b.cyl(0.11, 0.11, 0.015, 14, 0xc3cad4, [0.05, 0.3, 0], { r: [0, 0, Math.PI / 2], metal: 0.6 });
  b.sph(0.07, 0xffefb0, [0, 0.96, 0.52], { glow: true, w: 8, h: 6 }); b.box(0.1, 0.06, 0.03, 0xd9262c, [0, 0.62, rz - 0.05], { glow: true });
  for (const s of [-1, 1]) { b.bar([s * 0.04, wr, fz], [s * 0.05, 0.62, fz - 0.02], 0.02, 0xc3cad4, { round: true }); b.bar([s * 0.05, 0.3, rz + 0.0], [s * 0.05, wr, rz], 0.02, steel, { round: true }); b.box(0.02, 0.06, 0.5, color, [s * 0.1, 0.62, rz - 0.05 - 0.05]); }
  if (basket) { b.box(0.34, 0.2, 0.3, 0x8a5a2e, [0, 1.12, 0.5], { rough: 0.9 }); for (let i = 0; i < 4; i++) b.sph(0.07, [0xd9392f, 0xf6c235, 0x6bb04f, 0xf08a2b][i], [-0.1 + (i % 2) * 0.2, 1.25, 0.46 + Math.floor(i / 2) * 0.1], { w: 6, h: 5 }); }
  b.build(V.g);
  // wheels with spokes
  for (const z of [fz, rz]) { const w = new THREE.Group(), wb = new Batch(); wb.add(new THREE.TorusGeometry(wr, 0.03, 6, 22), 0x1c1d24, { r: [0, Math.PI / 2, 0], rough: 0.9 }); wb.add(new THREE.TorusGeometry(wr - 0.025, 0.012, 4, 22), 0xcfd3d8, { r: [0, Math.PI / 2, 0], metal: 0.6 }); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI; wb.bar([0, Math.cos(a) * (wr - 0.02), Math.sin(a) * (wr - 0.02)], [0, -Math.cos(a) * (wr - 0.02), -Math.sin(a) * (wr - 0.02)], 0.008, 0xcfd3d8, { metal: 0.6 }); } wb.cyl(0.03, 0.03, 0.1, 8, 0x8a909a, [0, 0, 0], { r: [0, 0, Math.PI / 2] }); wb.build(w); w.position.set(0, wr, z); V.g.add(w); V.wheels.push({ m: w, r: wr }); }
  // crank + pedals + (cyclist legs by IK)
  const crank = new THREE.Group(); crank.position.set(0, 0.3, 0); V.g.add(crank);
  const cb = new Batch(); cb.cyl(0.12, 0.12, 0.02, 16, 0xc3cad4, [0.05, 0, 0], { r: [0, 0, Math.PI / 2], metal: 0.6 }); for (let i = 0; i < 5; i++) { const a2 = i / 5 * TAU; cb.box(0.025, 0.1, 0.02, 0x8a909a, [0.05, Math.cos(a2) * 0.05, Math.sin(a2) * 0.05], { r: [a2, 0, 0] }); } cb.build(crank);
  const pedalPos = (t, s) => { const a = t * 2.6 * (1) + (s > 0 ? Math.PI : 0); return new THREE.Vector3(s * 0.17, 0.3 + Math.cos(a) * 0.16, Math.sin(a) * 0.16); };
  const cr = []; for (const s of [-1, 1]) { const m = new THREE.Mesh(gBox(1, 1, 1), mat(0x20232b)); V.g.add(m); cr.push(m); const p = new THREE.Mesh(gBox(0.1, 0.03, 0.12), mat(0x20232b)); V.g.add(p); cr.push(p); }
  const parts = [];
  let torso, headM, helm, arms = [], legs = [];
  if (rider) {
    const skin = [0xf2b98f, 0xd99a6c, 0x9b6338][seed % 3];
    torso = new THREE.Mesh(gSph(1, 10, 8), mat(shirt)); torso.scale.set(0.2, 0.34, 0.16); V.g.add(torso);
    headM = new THREE.Mesh(gSph(0.12, 10, 8), mat(skin)); V.g.add(headM);
    helm = new THREE.Mesh(gSph(0.14, 10, 6, 0, TAU, 0, Math.PI * 0.55), mat(0xd9392f, { rough: 0.4 })); V.g.add(helm);
    for (let i = 0; i < 2; i++) { const a = new THREE.Mesh(gCyl(0.5, 0.5, 1, 6), mat(shirt)); V.g.add(a); arms.push(a); }
    for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(gCyl(0.5, 0.5, 1, 6), mat(i < 2 ? 0x2b3a6a : 0x2b3a6a)); V.g.add(l); legs.push(l); }
    const shoes = []; for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(gBox(0.1, 0.07, 0.2), mat(0xf4f4ee)); V.g.add(s); shoes.push(s); legs.push(s); }
  }
  V.A.on((t) => {
    const a = t * 2.6; crank.rotation.x = a + Math.PI * 0 + 0;
    for (const s of [-1, 1]) {
      const p = pedalPos(t, s), idx = s < 0 ? 0 : 2; cr[idx + 1].position.copy(p); setBar(cr[idx], new THREE.Vector3(s * 0.12, 0.3, 0), new THREE.Vector3(s * 0.12, p.y, p.z), 0.025);
      if (rider) {
        const hip = new THREE.Vector3(s * 0.1, 0.9, -0.3), foot = p.clone().add(new THREE.Vector3(0, 0.03, 0.04)), kn = knee(hip, foot, 0.42, 0.42), li = s < 0 ? 0 : 1;
        setBar(legs[li * 2], hip, kn, 0.1); setBar(legs[li * 2 + 1], kn, foot, 0.08); legs[4 + li].position.copy(foot).add(new THREE.Vector3(0, 0.0, 0.05)); legs[4 + li].position.x = s * 0.1;
        legs[li * 2].scale.set(0.1, legs[li * 2].scale.y, 0.1); legs[li * 2 + 1].scale.set(0.08, legs[li * 2 + 1].scale.y, 0.08);
      }
    }
    if (rider) {
      const sway = Math.sin(a) * 0.015;
      torso.position.set(sway, 1.18, -0.1); torso.rotation.x = 0.6; headM.position.set(sway, 1.5, 0.05); helm.position.set(sway, 1.53, 0.05); helm.rotation.x = 0.4;
      const sh = (s) => new THREE.Vector3(s * 0.2 + sway, 1.34, -0.0), hand = (s) => new THREE.Vector3(s * 0.26, 1.0, 0.44);
      arms.forEach((m, i) => setBar(m, sh(i ? 1 : -1), hand(i ? 1 : -1), 0.07));
    }
  });
  return meta(V.g, { h: rider ? 1.7 : 1.05, w: 0.6, name: 'bicycle' }), Object.assign(V.g.userData, { realLengthM: 1.75 }), V.g;
}

export function scooter({ color = 0x2bb7b0, rider = true, speed = 0, shirt = 0xd9392f, box = false } = {}) {
  const V = veh('scooter', { speed }), b = new Batch(), wr = 0.2;
  b.rbox(0.42, 0.34, 1.0, 0.14, color, [0, 0.42, -0.35], { rough: 0.3, metal: 0.2 });                  // rear body
  b.rbox(0.36, 0.1, 0.9, 0.04, color, [0, 0.24, 0.1], { rough: 0.3, metal: 0.2 });                      // floorboard
  b.rbox(0.3, 0.7, 0.18, 0.08, color, [0, 0.62, 0.52], { r: [-0.25, 0, 0], rough: 0.3, metal: 0.2 }); // front shield
  b.rbox(0.36, 0.16, 0.7, 0.07, 0x2a2d36, [0, 0.66, -0.3], { rough: 0.6 });                           // seat
  b.box(0.04, 0.5, 0.04, 0xc3cad4, [0, 0.45, 0.6], { metal: 0.6 }); b.bar([-0.3, 1.0, 0.5], [0.3, 1.0, 0.5], 0.035, 0x20232b, { round: true }); b.rbox(0.2, 0.14, 0.14, 0.05, color, [0, 1.0, 0.52]);
  b.sph(0.08, 0xfff3c4, [0, 0.94, 0.7], { glow: true, w: 8, h: 6 }); b.box(0.12, 0.05, 0.03, 0xd9262c, [0, 0.48, -0.87], { glow: true });
  for (const s of [-1, 1]) { b.bar([s * 0.28, 1.02, 0.46], [s * 0.34, 1.28, 0.38], 0.02, 0x20232b, { round: true }); b.rbox(0.1, 0.07, 0.02, 0.02, 0xcfd6e0, [s * 0.34, 1.3, 0.38], { metal: 0.8 }); }
  b.cyl(0.04, 0.05, 0.4, 8, 0xc3cad4, [0.2, 0.25, -0.75], { r: [Math.PI / 2, 0, 0], metal: 0.7, rough: 0.3 });
  if (box) { b.rbox(0.5, 0.45, 0.5, 0.06, 0xf6c235, [0, 0.98, -0.78]); b.box(0.5, 0.05, 0.5, 0xd9a010, [0, 1.21, -0.78]); }
  b.build(V.g);
  V.addWheel(0, wr, 0.62, wr, 0.1, { hub: 0xe8e8ea }); V.addWheel(0, wr, -0.62, wr, 0.14, { hub: 0xe8e8ea });
  let rg;
  if (rider) {
    rg = new THREE.Group(); const rb = new Batch(); rb.sph(0.18, 0xf2b98f, [0, 1.58, 0.0], { w: 10, h: 8 }); rb.add(new THREE.SphereGeometry(0.2, 10, 6, 0, TAU, 0, Math.PI * 0.55), 0xf6c235, { p: [0, 1.6, 0], rough: 0.4 }); rb.rbox(0.36, 0.5, 0.26, 0.1, shirt, [0, 1.15, -0.05], { r: [0.1, 0, 0] });
    for (const s of [-1, 1]) { rb.bar([s * 0.18, 1.3, 0.0], [s * 0.28, 1.0, 0.45], 0.08, shirt); rb.bar([s * 0.14, 0.88, -0.2], [s * 0.2, 0.62, 0.35], 0.12, 0x2b3a6a); rb.bar([s * 0.2, 0.62, 0.35], [s * 0.22, 0.28, 0.3], 0.1, 0x2b3a6a); rb.box(0.1, 0.07, 0.22, 0xf4f4ee, [s * 0.22, 0.24, 0.36]); }
    rb.build(rg); V.g.add(rg);
  }
  V.A.on((t) => { if (rg) { rg.rotation.z = Math.sin(t * 1.3) * 0.02; rg.position.y = Math.sin(t * 7) * 0.004; } });
  return meta(V.g, { h: rider ? 1.8 : 1.3, w: 0.7, name: 'scooter' }), Object.assign(V.g.userData, { realLengthM: 1.9 }), V.g;
}

// ---------------------------------------------------------------- tram on its track (articulated, pantograph, overhead wire). shuttles along the track in update(t).
export function tram({ color = 0xf6c235, track = true, shuttle = true, speed = 0, route = '7', dest = 'HARBOUR' } = {}) {
  const V = veh('tram', { speed }), g = V.g, W = 2.45, H = 3.3, CL = 12.5, wr = 0.34;
  const car = new THREE.Group(); g.add(car);
  const b = new Batch();
  const cars = [-CL / 2 - 0.5, CL / 2 + 0.5];
  cars.forEach((cz, ci) => {
    b.rbox(W, 2.3, CL, 0.35, color, [0, 0.55 + 1.15, cz], { rough: 0.3, metal: 0.15 });
    b.rbox(W - 0.1, 0.5, CL - 0.4, 0.1, 0x3a3f4a, [0, 0.5, cz]); b.rbox(W - 0.06, 0.18, CL - 0.2, 0.08, 0xf4f1e8, [0, H - 0.15, cz]);
    for (const s of [-1, 1]) { b.box(0.03, 0.95, CL - 1.4, GLASS, [s * (W / 2 + 0.003), 2.1, cz], { rough: 0.08, metal: 0.4 }); for (let i = 0; i <= 8; i++) b.box(0.05, 1.0, 0.1, color, [s * (W / 2 + 0.01), 2.1, cz - (CL - 1.8) / 2 + i * ((CL - 1.8) / 8)]); b.box(0.05, 0.08, CL - 1.4, 0xf4f1e8, [s * (W / 2 + 0.012), 2.62, cz]); }
    for (const dz of [-2.6, 2.6]) { b.box(0.05, 2.0, 1.2, 0x20232b, [W / 2 + 0.012, 1.6, cz + dz]); b.box(0.06, 1.7, 0.5, GLASS, [W / 2 + 0.02, 1.8, cz + dz - 0.3], { rough: 0.1 }); b.box(0.06, 1.7, 0.5, GLASS, [W / 2 + 0.02, 1.8, cz + dz + 0.3], { rough: 0.1 }); }
    b.box(W - 0.4, 0.05, CL - 1.6, 0xffe9b0, [0, 2.6, cz], { glow: true });
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) b.rbox(0.4, 0.5, 0.1, 0.04, 0x2f6fd6, [s * 0.75, 1.75, cz - 4.2 + i * 1.7]);
    for (const dz of [-3.9, 3.9]) for (const s of [-1, 1]) { b.rbox(0.12, 0.3, CL * 0.14, 0.04, 0x20232b, [s * (W / 2 - 0.2), 0.34, cz + dz]); b.cyl(0.07, 0.07, 1.0, 6, 0x6a7380, [s * 0.6, 0.34, cz + dz], { r: [0, 0, Math.PI / 2] }); }
    const endZ = cz + (ci ? CL / 2 : -CL / 2) * (ci ? 1 : 1);
  });
  // cab ends: windscreen + lamps (front car at -z end faces... we want the tram to face +Z: nose is at the +Z end of car 2)
  const nose = cars[1] + CL / 2;
  b.box(W - 0.2, 0.95, 0.06, GLASS, [0, 2.05, nose + 0.01], { rough: 0.08, metal: 0.4 });
  for (const s of [-1, 1]) { b.rbox(0.38, 0.22, 0.1, 0.05, 0xfff3c4, [s * 0.8, 0.95, nose + 0.01], { glow: true }); b.rbox(0.3, 0.2, 0.1, 0.05, 0xd9262c, [s * 0.9, 1.0, cars[0] - CL / 2 - 0.01], { glow: true }); }
  b.rbox(W - 0.2, 0.4, 0.14, 0.08, 0x20232b, [0, 0.5, nose + 0.02]);
  // bellows between cars
  for (let i = 0; i < 9; i++) { const z = -0.5 + (i / 8) * 1.0 + 0.0; b.rbox(W - 0.35 - (i % 2) * 0.12, 2.3 - (i % 2) * 0.1, 0.1, 0.04, 0x20232b, [0, 0.55 + 1.15, z + 0]); }
  // pantograph on roof of car 2
  const pg = new THREE.Group(); pg.position.set(0, H, cars[1] - 1.2); g.add(pg);
  const pb = new Batch(); pb.bar([0, 0, -0.6], [0, 0.55, 0.0], 0.06, 0x3a3f4a); pb.bar([0, 0.55, 0.0], [0, 0.0, 0.6], 0.06, 0x3a3f4a); pb.bar([0, 0.55, 0], [0, 1.15, 0.0], 0.05, 0x3a3f4a); pb.box(1.5, 0.05, 0.1, 0x20232b, [0, 1.18, 0], { metal: 0.4 }); pb.box(0.5, 0.18, 0.7, 0x6a7380, [0, 0.1, 0]); pb.build(pg);
  b.rbox(1.2, 0.35, 2.2, 0.12, 0xe3e6ea, [0, H + 0.1, cars[0]]); b.rbox(1.0, 0.3, 1.6, 0.12, 0xe3e6ea, [0, H + 0.08, cars[1] + 2.0]);
  b.build(car);
  // bogies with steel wheels visible under the skirts
  const bog = []; for (const [cz, dz] of [[cars[0], -3.9], [cars[0], 3.9], [cars[1], -3.9], [cars[1], 3.9]]) for (const s of [-1, 1]) for (const k of [-0.7, 0.7]) { const w = wheel(wr, 0.12, { hub: 0x8a909a, tire: 0x555d68 }); w.position.set(s * 0.72, wr, cz + dz + k); car.add(w); V.wheels.push({ m: w, r: wr }); }
  const ds = signMesh(`${route}  ${dest}`, 1.9, 0.34, { bg: '#0a0a0a', fg: '#ffb020', radius: 0.1 }); ds.position.set(0, 2.78, nose + 0.04); car.add(ds);
  const sg = signMesh('CITY TRAM', 2.2, 0.4, { bg: null, fg: '#1d2b5c', weight: 400 }); for (const [s, ry] of [[1, Math.PI / 2], [-1, -Math.PI / 2]]) { const m = sg.clone(); m.position.set(s * (W / 2 + 0.03), 1.0, cars[0]); m.rotation.y = ry; car.add(m); }
  // track + wire
  if (track) {
    const tb = new Batch(), TL = 60;
    tb.box(3.2, 0.1, TL, 0x8a8f99, [0, 0.05, 0], { rough: 0.95 });
    for (let i = 0; i < TL / 0.8; i++) tb.box(2.5, 0.1, 0.22, 0x5a4a3a, [0, 0.14, -TL / 2 + 0.4 + i * 0.8], { rough: 0.95 });
    for (const s of [-1, 1]) tb.box(0.08, 0.14, TL, 0xb7bdc8, [s * 0.72, 0.24, 0], { metal: 0.8, rough: 0.3 });
    for (const z of [-24, -8, 8, 24]) { tb.cyl(0.1, 0.12, 6.4, 8, 0x3a4452, [2.2, 3.2, z]); tb.bar([2.2, 6.2, z], [0, 6.2, z], 0.08, 0x3a4452); }
    tb.bar([0, 6.0, -TL / 2], [0, 6.0, TL / 2], 0.03, 0x20232b, { round: true });
    tb.build(g);
  }
  V.A.on((t) => { const z = shuttle ? Math.sin(t * 0.32) * 18 : 0; car.position.z = z; pg.position.z = z + cars[1] - 1.2; V.g.userData.setOdometer(z * 1.0); });
  return meta(g, { h: H + 0.5, w: W, name: 'tram' }), Object.assign(g.userData, { realLengthM: CL * 2 + 1 }), g;
}

// ---------------------------------------------------------------- low-detail instanced fleet (parking garages, city blocks, traffic)
const _kits = new Map();
function lowKit(type) {
  if (_kits.has(type)) return _kits.get(type);
  const bb = new Batch(), bd = new Batch();
  if (type === 'bus') {
    bb.rbox(2.5, 2.4, 11.2, 0.3, 0xffffff, [0, 1.75, 0]);
    bd.box(2.52, 0.9, 9.4, GLASS, [0, 2.05, -0.4]); bd.box(2.4, 0.9, 0.05, GLASS, [0, 2.05, 5.62]); bd.box(2.4, 0.1, 11.0, 0xf4f1e8, [0, 0.95, 0]);
    for (const s of [-1, 1]) for (const z of [3.8, -3.2]) bd.cyl(0.5, 0.5, 0.3, 10, 0x1c1d24, [s * 1.1, 0.5, z], { r: [0, 0, Math.PI / 2] });
    for (const s of [-1, 1]) bd.box(0.4, 0.2, 0.06, 0xfff3c4, [s * 0.85, 0.9, 5.62]);
  } else if (type === 'truck') {
    bb.rbox(2.3, 1.5, 1.8, 0.2, 0xffffff, [0, 1.35, 2.2]);
    bd.rbox(2.3, 2.45, 4.6, 0.18, 0xf2efe8, [0, 1.85, -0.9]); bd.box(2.1, 0.5, 0.05, GLASS, [0, 1.7, 3.1]);
    for (const s of [-1, 1]) for (const z of [2.2, -2.0]) bd.cyl(0.45, 0.45, 0.28, 10, 0x1c1d24, [s * 1.05, 0.45, z], { r: [0, 0, Math.PI / 2] });
  } else {
    const kind = type === 'taxi' ? 'sedan' : type === 'suv' ? 'suv' : type === 'hatch' ? 'hatch' : 'sedan';
    const c = carBody(bb, bd, { color: 0xffffff, kind, lod: 'low' });
    for (const [x, z] of c.wheels) bd.cyl(c.wr, c.wr, 0.24, 10, 0x1c1d24, [x, c.wr, z], { r: [0, 0, Math.PI / 2] });
    if (type === 'taxi') bd.rbox(0.7, 0.2, 0.34, 0.06, 0xfff0b0, [0, 1.6, -0.05]);
  }
  const k = { body: bb.toGeometry(), detail: bd.toGeometry() };
  _kits.set(type, k); return k;
}
export const FLEET_TYPES = ['sedan', 'hatch', 'suv', 'taxi', 'bus', 'truck'];
// items: [{type, color, x, y, z, ry}]. returns Group; g.move(i, x, y, z, ry) then g.commit()
export function fleet(items) {
  const g = new THREE.Group(), groups = new Map();
  items.forEach((it, i) => { const t = it.type ?? 'sedan'; if (!groups.has(t)) groups.set(t, []); groups.get(t).push(i); });
  const ref = new Array(items.length), meshes = [];
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.2 }), detMat = vcMat(0.55, 0.15);
  for (const [type, idx] of groups) {
    const k = lowKit(type), bm = new THREE.InstancedMesh(k.body, bodyMat, idx.length), dm = new THREE.InstancedMesh(k.detail, detMat, idx.length);
    for (const m of [bm, dm]) { m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; g.add(m); meshes.push(m); }
    idx.forEach((i, j) => { ref[i] = { bm, dm, j }; bm.setColorAt(j, new THREE.Color(type === 'taxi' ? 0xf6c235 : items[i].color ?? BODY_COLORS[i % BODY_COLORS.length])); });
  }
  const o = new THREE.Object3D();
  g.move = (i, x, y, z, ry, s = 1) => { const r = ref[i]; o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.scale.setScalar(s); o.updateMatrix(); r.bm.setMatrixAt(r.j, o.matrix); r.dm.setMatrixAt(r.j, o.matrix); };
  g.commit = () => { for (const m of meshes) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } };
  items.forEach((it, i) => g.move(i, it.x ?? 0, it.y ?? 0, it.z ?? 0, it.ry ?? 0, it.s ?? 1)); g.commit();
  g.count = items.length;
  return g;
}
