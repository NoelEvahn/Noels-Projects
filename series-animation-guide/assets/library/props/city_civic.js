// City pack: civic + industrial buildings at real scale (1 unit = 1 m), facing +Z, origin = footprint centre at street level.
// hospital, school (working clock + swings), police station, parking garage (spiral ramp with moving cars), factory (smoke, conveyor), church (swinging bell, pigeons), stadium (hopping crowd).
import * as THREE from 'three';
import {
  Batch, PAL, anim, meta, signMesh, makeWindows, facadeWindows, ledges, parapet, acUnit, waterTank, antenna, roofKit, awning, treeParts, pavement, plume, flag, turbineVent, birdFlock, bobMaterial,
  rng, shade, lerp, TAU, fract, hash1, gBox, gCyl, gSph, gPlane, gCone, lampMesh, halo, inst, mat, smooth, clamp, profileGeo,
} from './city_kit.js';
import { newB, fin, curtainWindows } from './city_buildings.js';
import { fleet } from './city_vehicles.js';

const rotY = (a) => [0, a, 0];

// ---------------------------------------------------------------- hospital
export function hospital({ w = 46, d = 20, floors = 6, seed = 8, lod = 'high', sidewalk = true } = {}) {
  const S = newB(seed, lod), { b, g, rnd, hi } = S;
  const fh = 4.0, H = floors * fh, tw = 18, td = 18, TH = H + 3 * fh;
  if (sidewalk) pavement(b, { w: w + 2, z0: d / 2 + 3.0, d: 3.6 });
  b.box(w, H, d, 0xf1f3f5, [0, H / 2, 0]);
  for (let f = 0; f <= floors; f++) b.box(w + 0.3, 0.35, d + 0.3, f % 2 ? 0xf1f3f5 : 0x4a8fd0, [0, f * fh + 0.175, 0]);
  b.box(w + 0.5, 0.6, d + 0.5, 0x4a8fd0, [0, H + 0.3, 0]);
  // central tower, pushed forward
  b.box(tw, TH, td + 3, 0xf8f9fb, [0, TH / 2, 1.5]); for (let f = 0; f <= floors + 3; f++) b.box(tw + 0.3, 0.3, td + 3.3, f % 3 === 0 ? 0x4a8fd0 : 0xf8f9fb, [0, f * fh + 0.15, 1.5]);
  b.box(tw + 0.5, 0.6, td + 3.5, 0x4a8fd0, [0, TH + 0.3, 1.5]);
  const wl = [];
  const fw = d / 2;
  facadeWindows(wl, { cx: -(w / 2 + tw / 2) / 2 + 3.5, cz: 0, w: (w - tw) / 2 + 3, d, y0: 0, floors, fh, ww: 1.7, wh: 1.7, sill: 1.1, gapX: 3.2, faces: 'F', skip: 1, rnd, lit: 0.45, margin: 1.5 });
  facadeWindows(wl, { cx: (w / 2 + tw / 2) / 2 - 3.5, cz: 0, w: (w - tw) / 2 + 3, d, y0: 0, floors, fh, ww: 1.7, wh: 1.7, sill: 1.1, gapX: 3.2, faces: 'F', skip: 1, rnd, lit: 0.45, margin: 1.5 });
  facadeWindows(wl, { cx: 0, cz: 1.5, w: tw, d: td + 3, y0: 0, floors: floors + 3, fh, ww: 2.0, wh: 1.7, sill: 1.1, gapX: 3.4, faces: 'F', skip: 1, rnd, lit: 0.45, margin: 1.5 });
  facadeWindows(wl, { cx: 0, cz: 1.5, w: tw, d: td + 3, y0: 0, floors: floors + 3, fh, ww: 2.0, wh: 1.7, sill: 1.1, gapX: 3.4, faces: 'LR', skip: 1, rnd, lit: 0.45, margin: 1.5 });
  facadeWindows(wl, { w, d, y0: 0, floors, fh, ww: 1.7, wh: 1.7, sill: 1.1, gapX: 3.2, gapZ: 3.4, faces: 'BLR', skip: 0, rnd, lit: 0.45, margin: 1.5 });
  // ground-floor strips of windows left/right of the tower: only when not overlapped by the tower
  const keep = wl.filter((e) => !(e.ry === 0 && e.z < d / 2 + 0.2 && Math.abs(e.x) < tw / 2 + 1.2 && e.z < 5));
  S.extra.push(makeWindows(keep, { lod: hi ? 'high' : 'low' }));
  if (hi) for (const e of keep) if (e.ry === 0 && e.y > 5) b.box(e.w + 0.5, 0.12, 0.5, 0x4a8fd0, [e.x, e.y + e.h / 2 + 0.3, e.z + 0.2]);
  // main entrance portal in the tower + emergency bay on the left wing
  const zt = 1.5 + (td + 3) / 2;
  b.box(8.5, 4.6, 0.12, 0xffe3a6, [0, 2.3, zt + 0.05], { glow: true }); b.box(10.6, 0.35, 3.4, 0xf8f9fb, [0, 5.1, zt + 1.7]); b.box(10.6, 0.14, 3.4, 0x4a8fd0, [0, 4.85, zt + 1.7]);
  for (const s of [-1, 1]) b.cyl(0.18, 0.18, 5.0, 8, 0xc9ced6, [s * 4.9, 2.5, zt + 3.0], { metal: 0.5 });
  for (const s of [-1, 1]) b.box(0.15, 4.6, 2.6, 0x3d5f82, [s * 4.0, 2.3, zt + 1.4], { metal: 0.3, rough: 0.2 });
  const emx = -(w / 2) + 6;
  b.box(11, 0.4, 5, 0xe8edf2, [emx, 4.9, d / 2 + 2.5]); b.box(11, 0.16, 5, 0xd9392f, [emx, 4.65, d / 2 + 2.5]);
  for (const s of [-1, 1]) b.cyl(0.2, 0.2, 5, 8, 0xe8edf2, [emx + s * 5.0, 2.5, d / 2 + 4.6]);
  b.box(10.4, 0.04, 4.6, 0xffecc0, [emx, 4.4, d / 2 + 2.5], { glow: true });
  b.box(9.0, 0.03, 4.4, 0xd9d9de, [emx, 0.1, d / 2 + 2.5], { rough: 0.9 }); for (let i = 0; i < 5; i++) b.box(0.25, 0.02, 3.6, 0xd9392f, [emx - 3.2 + i * 1.6, 0.13, d / 2 + 2.7]);
  const em = signMesh('EMERGENCY', 8.4, 1.1, { bg: '#d9262c', fg: '#ffffff', border: '#ffffff' }); em.position.set(emx, 6.0, d / 2 + 0.1); g.add(em);
  b.box(8.8, 0.15, 0.2, 0x9aa1ab, [emx, 5.38, d / 2 + 0.12]);
  b.box(4.6, 3.6, 0.1, 0x2c3a44, [emx - 1.0, 1.9, d / 2 + 0.07], { metal: 0.3 }); b.box(4.2, 3.2, 0.05, 0xffe3a6, [emx - 1.0, 1.8, d / 2 + 0.13], { glow: true });
  // red cross on the tower, pulsing
  const cross = new THREE.Group(), cb = new Batch(); cb.box(1.1, 4.2, 0.3, 0xff2b2b, [0, 0, 0], { glow: true }); cb.box(4.2, 1.1, 0.3, 0xff2b2b, [0, 0, 0], { glow: true }); cb.build(cross);
  const ccb = new Batch(); ccb.box(1.4, 4.5, 0.2, 0xffffff, [0, 0, -0.06]); ccb.box(4.5, 1.4, 0.2, 0xffffff, [0, 0, -0.06]); ccb.build(cross);
  cross.position.set(0, TH - 5.2, zt + 0.25); g.add(cross);
  const cm = cross.children[0].material;
  S.A.on((t) => { cross.scale.setScalar(1 + 0.03 * Math.sin(t * 3)); });
  b.box(tw - 3, 3.6, 0.5, 0x3d5f82, [0, TH - 5.2, zt + 0.1], { metal: 0.2 }); b.box(tw - 3, 0.001, 0.001, 0x000000, [0, 0, 0]);
  const hsg = signMesh('CITY HOSPITAL', 13, 1.5, { bg: '#4a8fd0', fg: '#ffffff', border: '#ffffff' }); hsg.position.set(0, H + 1.0, zt + 0.1 + 0.0 - 0.0); hsg.position.y = TH - 9.6 + 0.0; g.add(hsg);
  // roof: helipad with chase lights + windsock, chillers, vents
  const hx = w / 2 - 8, hy = H + 0.6, hz = -1;
  parapet(b, { w, d, y: H + 0.6, h: 0.7, color: 0xf1f3f5, th: 0.3 }); b.cyl(6.2, 6.2, 0.5, 28, 0x6c7480, [hx, hy - 0.05, hz]); b.cyl(5.6, 5.6, 0.06, 28, 0x3a6a4a, [hx, hy + 0.23, hz]);
  b.add(new THREE.TorusGeometry(4.6, 0.12, 4, 32), 0xffffff, { p: [hx, hy + 0.28, hz], r: [Math.PI / 2, 0, 0] });
  for (const [x, z, bw, bd] of [[-0.55, 0, 0.3, 2.6], [0.55, 0, 0.3, 2.6], [0, 0, 1.4, 0.3]]) b.box(bw, 0.04, bd, 0xffffff, [hx + x, hy + 0.3, hz + z]);
  const hl = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, m = lampMesh(gSph(0.16, 6, 5), 0xffb020); m.position.set(hx + Math.cos(a) * 5.8, hy + 0.35, hz + Math.sin(a) * 5.8); g.add(m); hl.push(m); }
  S.A.on((t) => { const p = Math.floor(t * 8) % 16; hl.forEach((m, i) => m.material.userData.set(((i - p + 16) % 16) < 3 ? 1.6 : 0.3)); });
  b.cyl(0.05, 0.05, 3.0, 6, 0xc8ccd4, [hx - 7.3, hy + 1.5, hz + 4]); const ws = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0xf08a2b, side: THREE.DoubleSide })); ws.rotation.z = -Math.PI / 2; const wp = new THREE.Group(); wp.position.set(hx - 7.3, hy + 3.0, hz + 4); ws.position.x = 0.9; wp.add(ws); g.add(wp);
  S.A.on((t) => { wp.rotation.y = Math.sin(t * 0.7) * 0.5; ws.rotation.y = 0; ws.rotation.x = Math.sin(t * 2.2) * 0.12; });
  roofKit(b, rnd, { cx: -8, cz: -1, w: 20, d, y: H + 0.6, acs: 4, tank: false, antenna: true, bulkhead: true, vents: 3 });
  for (let i = 0; i < 3; i++) { const tv = turbineVent(); tv.position.set(-18 + i * 2.3, H + 0.6, 5); g.add(tv); S.A.on(tv.userData.update); }
  b.cyl(0.06, 0.06, 6, 6, 0xc8ccd4, [tw / 2 - 1.5, TH + 3.6, 0.5]); S.A.on(flagUpdate(g, [tw / 2 - 1.5, TH + 6.0, 0.5], [0xffffff, 0xd9262c, 0xffffff], 1.8, 1.1));
  return fin(S, { h: TH + 7.0, w, d: d + 6.6, name: 'hospital', fp: { w, d } });
}
function flagUpdate(g, pos, colors, w = 1.6, h = 1.0) { const f = flag(w, h, colors); f.position.set(pos[0] + 0.0, pos[1], pos[2]); g.add(f); f.position.x = pos[0]; return f.userData.update; }

// ---------------------------------------------------------------- school with a working clock, flag and swing set
export function school({ w = 38, d = 15, seed = 9, lod = 'high', sidewalk = true } = {}) {
  const S = newB(seed, lod), { b, g, rnd, hi } = S;
  const fh = 4.2, gh = 4.6, H = gh + fh, brick = 0xb5573f, stone = 0xe8dcc0;
  if (sidewalk) pavement(b, { w: w + 4, z0: d / 2 + 9, d: 3.2, color: 0xc9c5ba });
  b.box(w, H, d, brick, [0, H / 2, 0]); b.box(w + 0.3, 1.2, d + 0.3, 0x8d8a82, [0, 0.6, 0]);
  b.box(w + 0.4, 0.4, d + 0.4, stone, [0, gh, 0]); b.box(w + 0.6, 0.55, d + 0.6, stone, [0, H + 0.2, 0]);
  if (hi) for (let y = 1.6; y < H - 0.3; y += 0.55) { b.box(w + 0.01, 0.035, 0.025, shade(brick, 0.82), [0, y, d / 2]); }
  const wl = [];
  facadeWindows(wl, { w, d, y0: 1.0, floors: 1, fh: gh - 1.0, ww: 1.5, wh: 2.2, sill: 0.4, gapX: 3.6, faces: 'FB', rnd, lit: 0.6, margin: 2.0 });
  facadeWindows(wl, { w, d, y0: gh, floors: 1, fh, ww: 1.5, wh: 2.2, sill: 0.8, gapX: 3.6, faces: 'FB', rnd, lit: 0.6, margin: 2.0 });
  facadeWindows(wl, { w, d, y0: 1.0, floors: 2, fh: 3.6, ww: 1.5, wh: 2.0, sill: 0.8, gapX: 3.6, gapZ: 3.6, faces: 'LR', rnd, lit: 0.6, margin: 2.0 });
  const keep = wl.filter((e) => !(e.ry === 0 && e.z > 0 && Math.abs(e.x) < 5.2));
  S.extra.push(makeWindows(keep, { lod: hi ? 'high' : 'low' }));
  for (const e of keep) if (e.ry === 0 && e.z > 0) { b.box(e.w + 0.6, 0.22, 0.3, stone, [e.x, e.y + e.h / 2 + 0.3, e.z + 0.1]); }
  // central entrance block + clock tower
  const ex = 0, eW = 9, eD = 3, tH = 20;
  b.box(eW, tH, 8, shade(brick, 1.06), [0, tH / 2, d / 2 - 4 + eD * 0]); b.box(eW + 0.6, 0.5, 8.6, stone, [0, gh, d / 2 - 4]); b.box(eW + 0.6, 0.6, 8.6, stone, [0, tH, d / 2 - 4]);
  b.box(eW - 1.0, 0.5, 0.4, stone, [0, 1.0, d / 2 + 0.2]);
  b.box(4.4, 3.4, 0.2, 0x3d2a1e, [0, 1.7, d / 2 + 0.09]); b.box(0.12, 3.4, 0.24, 0xc9a24a, [0, 1.7, d / 2 + 0.1]);
  b.profile([[-2.5, 0], [2.5, 0], [2.5, 0.4], [1.9, 1.2], [0, 1.9], [-1.9, 1.2], [-2.5, 0.4]], 0.5, 0.03, stone, [0, 3.5, d / 2 + 0.3]);
  for (const s of [-1, 1]) { b.cyl(0.22, 0.22, 3.4, 10, stone, [s * 2.5, 1.7 + 0.0, d / 2 + 1.4]); b.box(0.7, 0.2, 0.7, stone, [s * 2.5, 3.5, d / 2 + 1.4]); }
  b.box(6.4, 0.3, 1.8, stone, [0, 3.72, d / 2 + 1.0]);
  for (let i = 0; i < 4; i++) b.box(7.0 - i * 0.3, 0.3, 2.4 + i * 0.5, 0xc9c5ba, [0, 0.15 + (3 - i) * 0.0, d / 2 + 1.6 + i * 0.5 + 1.0 * 0], {});
  const ts = signMesh('OAKWOOD ELEMENTARY', 7.6, 0.9, { bg: '#2a3a5a', fg: '#ffeab0', border: '#ffeab0' }); ts.position.set(0, 6.2, d / 2 + 0.01 + 0.0 + 0.0 - 0.0); ts.position.z = d / 2 + 0.06; g.add(ts);
  b.box(4.6, 2.6, 0.2, 0xffe3a6, [0, 8.4, d / 2 + 0.04], { glow: true }); b.box(0.12, 2.6, 0.26, 0x6a4a2a, [0, 8.4, d / 2 + 0.06]);
  // clock faces on three sides (hands move in update: fast-forward clock, one minute-hand turn per 60 s)
  const hands = [];
  for (const [rx, rz, ry] of [[0, d / 2 - 4 + 4.2, 0], [eW / 2 + 0.2, d / 2 - 4, Math.PI / 2], [-eW / 2 - 0.2, d / 2 - 4, -Math.PI / 2]]) {
    const cg = new THREE.Group(); cg.position.set(rx, 16.0, rz); cg.rotation.y = ry; g.add(cg);
    const cb = new Batch(); cb.cyl(1.9, 1.9, 0.3, 28, 0xf8f4ea, [0, 0, 0], { r: [Math.PI / 2, 0, 0], rough: 0.4 }); cb.add(new THREE.TorusGeometry(1.9, 0.14, 6, 28), 0x2a2a30, { p: [0, 0, 0.1], rough: 0.4 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; cb.box(i % 3 ? 0.1 : 0.16, i % 3 ? 0.3 : 0.45, 0.06, 0x20232b, [Math.sin(a) * 1.55, Math.cos(a) * 1.55, 0.17], { r: [0, 0, -a] }); }
    cb.sph(0.15, 0x20232b, [0, 0, 0.24]); cb.build(cg);
    const mh = new THREE.Group(), hh = new THREE.Group(); const hb = new Batch(); hb.box(0.1, 1.5, 0.06, 0x20232b, [0, 0.75, 0]); hb.build(mh); const hb2 = new Batch(); hb2.box(0.16, 1.0, 0.06, 0x20232b, [0, 0.5, 0]); hb2.build(hh); mh.position.z = 0.2; hh.position.z = 0.22; cg.add(mh, hh); hands.push([mh, hh]);
  }
  S.A.on((t) => { for (const [mh, hh] of hands) { mh.rotation.z = -t * TAU / 60 + 1.0; hh.rotation.z = -t * TAU / 720 - 0.4; } });
  // belfry + pyramid roof + weather vane + bell
  b.box(eW - 2.4, 4.5, 6.2, stone, [0, tH + 2.5, d / 2 - 4]); for (const s of [-1, 1]) for (const sz of [-1, 1]) b.box(0.7, 4.6, 0.7, shade(stone, 0.92), [s * 3.0, tH + 2.5, d / 2 - 4 + sz * 2.8]);
  for (const f of [-1, 1]) { b.box(2.6, 3.0, 0.1, 0x20232b, [0, tH + 2.4, d / 2 - 4 + f * 3.14]); b.box(0.1, 3.0, 2.6, 0x20232b, [f * 3.0 + f * 0.1, tH + 2.4, d / 2 - 4]); }
  b.cone(5.6, 6.5, 4, 0x4a7a6a, [0, tH + 8.0, d / 2 - 4], { r: [0, Math.PI / 4, 0], rough: 0.7 }); b.cyl(0.05, 0.05, 2.4, 6, 0xc9a24a, [0, tH + 12.0, d / 2 - 4]); b.cone(0.28, 0.9, 4, 0xc9a24a, [0, tH + 13.3, d / 2 - 4], { r: [0, 0, -Math.PI / 2] });
  const bell = new THREE.Group(); bell.position.set(0, tH + 3.6, d / 2 - 4); const bb = new Batch(); bb.cone(0.7, 1.0, 12, 0xc9a24a, [0, -0.5, 0], { metal: 0.6, rough: 0.35 }); bb.sph(0.15, 0x3a3a40, [0, -1.0, 0]); bb.box(0.12, 0.4, 0.12, 0x3a3a40, [0, 0.1, 0]); bb.build(bell); g.add(bell);
  S.A.on((t) => { bell.rotation.x = Math.sin(t * 1.9) * 0.45; });
  parapet(b, { w, d, y: H + 0.5, h: 0.55, color: stone, th: 0.3 });
  for (const x of [-12, 12]) { b.box(1.4, 2.8, 1.4, brick, [x, H + 1.9, -3]); b.box(1.6, 0.2, 1.6, stone, [x, H + 3.4, -3]); }
  roofKit(b, rnd, { cx: 0, cz: -2, w: w * 0.7, d: d * 0.5, y: H + 0.5, acs: 3, bulkhead: false, vents: 3 });
  // flagpole + flag, playground: slide, swings (animated), hopscotch, fence, trees
  b.cyl(0.08, 0.1, 9.5, 8, 0xe3e6ea, [-13, 4.75, d / 2 + 4.5], { metal: 0.4 }); b.sph(0.18, 0xf6c235, [-13, 9.6, d / 2 + 4.5]);
  const fl = flag(2.4, 1.5, [0x2f6fd6, 0xffffff, 0xd9392f]); fl.position.set(-13, 8.7, d / 2 + 4.5); g.add(fl); S.A.on(fl.userData.update);
  const px = 14, pz = d / 2 + 5.5;
  b.box(8.2, 0.08, 6, 0x8d6a3e, [px, 0.04, pz], { rough: 1 });
  for (const s of [-1, 1]) { b.bar([px + s * 1.5, 3.0, pz - 1.0], [px + s * 1.1, 0.05, pz - 1.0 + 0.0], 0.1, 0xd9392f); b.bar([px + s * 1.5, 3.0, pz - 1.0], [px + s * 1.1, 0.05, pz - 1.0 - 0.0], 0.1, 0xd9392f); }
  const sw1 = (x) => { const gp = new THREE.Group(); gp.position.set(x, 3.0, pz - 1.0); const sb = new Batch(); sb.bar([-0.3, 0, 0], [-0.3, -2.4, 0], 0.03, 0x8a909a); sb.bar([0.3, 0, 0], [0.3, -2.4, 0], 0.03, 0x8a909a); sb.rbox(0.7, 0.07, 0.3, 0.03, [0x2f6fd6, 0xf6c235][Math.abs(x - px) > 1 ? 0 : 1], [0, -2.45, 0]); sb.build(gp); g.add(gp); return gp; };
  b.bar([px - 1.5, 3.0, pz - 1.0], [px + 1.5, 3.0, pz - 1.0], 0.12, 0xd9392f); for (const s of [-1, 1]) { b.bar([px + s * 1.5, 3.0, pz - 1.0], [px + s * 1.5, 0.05, pz - 2.0], 0.1, 0xd9392f); }
  const swA = sw1(px - 0.7), swB = sw1(px + 0.7); S.A.on((t) => { swA.rotation.x = Math.sin(t * 2.2) * 0.5; swB.rotation.x = Math.sin(t * 2.2 + 1.6) * 0.4; });
  b.box(1.0, 0.1, 2.6, 0xf6c235, [px - 3.4, 1.6, pz + 0.5], { r: [0.5, 0, 0] }); b.box(1.3, 0.1, 0.8, 0xd9392f, [px - 3.4, 2.6, pz - 0.7]); b.box(0.1, 2.6, 0.1, 0x8a909a, [px - 3.9, 1.3, pz - 0.7]); b.box(0.1, 2.6, 0.1, 0x8a909a, [px - 2.9, 1.3, pz - 0.7]);
  for (let i = 0; i < 6; i++) b.box(0.6, 0.02, 0.6, i % 2 ? 0xffffff : 0xd9392f, [-4 + (i % 2) * 0.0 + 2.0, 0.02, d / 2 + 5.0 + i * 0.6 - 1.0], { });
  for (const x of [-18, -8, 18]) treeParts(b, x, d / 2 + 7.5, 6.5, 0x4aa84e);
  for (let i = 0; i < 38; i++) { const x = -19 + i * 1.0; if (x > 8 && x < 20.5) continue; b.box(0.08, 1.2, 0.08, 0x2a3038, [x, 0.6, d / 2 + 9.2]); }
  b.box(w + 2, 0.06, 0.06, 0x2a3038, [0, 1.0, d / 2 + 9.2]);
  return fin(S, { h: tH + 14.2, w, d: d + 12, name: 'school', fp: { w, d } });
}

// ---------------------------------------------------------------- police station
export function policeStation({ w = 22, d = 14, floors = 3, seed = 10, lod = 'high', sidewalk = true } = {}) {
  const S = newB(seed, lod), { b, g, rnd, hi } = S;
  const fh = 4.0, gh = 4.8, H = gh + (floors - 1) * fh, stone = 0x6a7b96, trim = 0xf0ece0;
  if (sidewalk) pavement(b, { w: w + 3, z0: d / 2 + 5.4, d: 3.4 });
  b.box(w, H, d, stone, [0, H / 2, 0]); b.box(w + 0.3, 1.0, d + 0.3, 0x4a586e, [0, 0.5, 0]);
  for (let f = 1; f < floors; f++) b.box(w + 0.35, 0.3, d + 0.35, trim, [0, gh + (f - 1) * fh - 0.15 + (f === 1 ? 0 : 0.0), 0]);
  b.box(w + 0.8, 0.8, d + 0.8, trim, [0, H + 0.4, 0]); b.box(w + 1.0, 0.2, d + 1.0, shade(trim, 0.85), [0, H + 0.9, 0]);
  const wl = [];
  facadeWindows(wl, { w, d, y0: 1.4, floors: 1, fh: gh - 1.4, ww: 1.4, wh: 2.0, sill: 0.8, gapX: 3.6, faces: 'FB', rnd, lit: 0.5, margin: 1.8 });
  facadeWindows(wl, { w, d, y0: gh, floors: floors - 1, fh, ww: 1.4, wh: 2.0, sill: 0.9, gapX: 3.6, faces: 'FB', rnd, lit: 0.5, margin: 1.8 });
  facadeWindows(wl, { w, d, y0: 1.4, floors: 1, fh: gh - 1.4, ww: 1.4, wh: 2.0, sill: 0.8, gapX: 3.6, gapZ: 3.6, faces: 'LR', rnd, lit: 0.5, margin: 1.8 });
  facadeWindows(wl, { w, d, y0: gh, floors: floors - 1, fh, ww: 1.4, wh: 2.0, sill: 0.9, gapX: 3.6, gapZ: 3.6, faces: 'LR', rnd, lit: 0.5, margin: 1.8 });
  const keep = wl.filter((e) => !(e.ry === 0 && Math.abs(e.x) < 4.2 && e.z > 0));
  S.extra.push(makeWindows(keep, { lod: hi ? 'high' : 'low' }));
  if (hi) for (const e of keep) if (e.ry === 0 && e.z > 0) for (let i = -2; i <= 2; i++) b.box(0.03, e.h * 0.9, 0.04, 0x20262e, [e.x + i * e.w / 5, e.y, e.z + 0.14]);
  // portico: four columns + pediment + steps
  const pz = d / 2;
  for (let i = 0; i < 4; i++) { const x = -3.9 + i * 2.6; b.cyl(0.42, 0.46, 7.6, 12, trim, [x, 4.6, pz + 3.2]); b.box(1.1, 0.4, 1.1, trim, [x, 0.9, pz + 3.2]); b.box(1.1, 0.4, 1.1, trim, [x, 8.5, pz + 3.2]); }
  b.box(10.8, 0.9, 4.6, trim, [0, 9.0, pz + 2.5]); b.profile([[-5.6, 0], [5.6, 0], [0, 2.1]], 4.6, 0.05, trim, [0, 9.45, pz + 2.5]);
  b.profile([[-4.6, 0], [4.6, 0], [0, 1.5]], 0.1, 0.02, 0x4a586e, [0, 9.5, pz + 4.8]);
  for (let i = 0; i < 5; i++) b.box(11.2 - i * 0.3, 0.28, 3.6 + i * 0.5, 0xc9c5ba, [0, 0.14 + (4 - i) * 0.0 + 0.0 * i, pz + 1.8 + i * 0.5 + 1.0]);
  b.box(4.4, 4.0, 0.2, 0x2a2018, [0, 2.4, pz + 0.1]); b.box(0.1, 4.0, 0.24, 0xc9a24a, [0, 2.4, pz + 0.12]);
  const ps = signMesh('POLICE', 7.4, 1.0, { bg: '#1a2a52', fg: '#ffffff', border: '#79b6ff' }); ps.position.set(0, 7.0, pz + 0.12); g.add(ps);
  // badge star (geometry, glows)
  const star = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = i % 2 ? 0.55 : 1.3; star.push([Math.sin(a) * r, Math.cos(a) * r]); }
  const sgeo = profileGeo(star, 0.2, 0.04); b.add(sgeo, 0xf6c235, { p: [0, 6.2, pz + 4.9], metal: 0.5, rough: 0.35 });
  // blue lamps by the door that pulse
  const lamps = []; for (const s of [-1, 1]) { b.cyl(0.07, 0.07, 3.0, 8, 0x2a3038, [s * 3.6, 1.5 + 0.0, pz + 4.8], {}); const m = lampMesh(gSph(0.38, 12, 8), 0x3a8bff, 1); m.position.set(s * 3.6, 3.2, pz + 4.8); g.add(m); const h = halo(0x3a8bff, 0.8, 0.3); h.position.copy(m.position); g.add(h); lamps.push([m, h]); }
  S.A.on((t) => { const k = 0.8 + 0.5 * Math.sin(t * 2.4); lamps.forEach(([m, h]) => { m.material.userData.set(k); h.material.opacity = 0.18 + 0.15 * k; }); });
  // roof: cornice, mast with beacons, flagpoles (wave)
  parapet(b, { w, d, y: H + 1.0, h: 0.5, color: trim, th: 0.3 });
  roofKit(b, rnd, { cx: 0, cz: -2, w: w * 0.6, d: d * 0.5, y: H + 1.0, acs: 3, bulkhead: true, vents: 1 });
  b.cyl(0.08, 0.16, 9, 8, 0xc8ccd4, [w / 2 - 3, H + 5.4, -3], { metal: 0.5 }); for (let i = 1; i < 4; i++) b.box(2.0 - i * 0.35, 0.08, 0.08, 0xc8ccd4, [w / 2 - 3, H + 1.5 + i * 2.0, -3]);
  const bm = lampMesh(gSph(0.28, 8, 6), 0xff3030); bm.position.set(w / 2 - 3, H + 10.1, -3); g.add(bm); const bh = halo(0xff3030, 1.0, 0.3); bh.position.copy(bm.position); g.add(bh);
  const rot = new THREE.Group(); rot.position.set(-w / 2 + 2.5, H + 1.0, -3); const rb = new Batch(); rb.cyl(0.4, 0.5, 0.6, 12, 0x20232b, [0, 0.3, 0]); rb.build(rot); g.add(rot);
  const r1 = lampMesh(gBox(0.35, 0.3, 0.3), 0xff2b2b), r2 = lampMesh(gBox(0.35, 0.3, 0.3), 0x2b6bff); r1.position.set(0.3, 0.75, 0); r2.position.set(-0.3, 0.75, 0); rot.add(r1, r2);
  S.A.on((t) => { const k = fract(t / 1.6) < 0.2 ? 1 : 0.12; bm.material.userData.set(k * 1.3); bh.material.opacity = 0.3 * k; rot.rotation.y = t * 5; const f = Math.sin(t * 5) > 0; r1.material.userData.set(f ? 1.6 : 0.2); r2.material.userData.set(f ? 0.2 : 1.6); });
  for (const s of [-1, 1]) { b.cyl(0.07, 0.09, 7, 8, 0xe3e6ea, [s * (w / 2 - 1.2), 3.5 + 0.0, pz + 5.2], { metal: 0.4 }); const f = flag(1.7, 1.1, s < 0 ? [0x2f6fd6, 0xffffff, 0xd9392f] : [0x1a2a52, 0x1a2a52, 0x1a2a52]); f.position.set(s * (w / 2 - 1.2), 6.0, pz + 5.2); g.add(f); S.A.on(f.userData.update); }
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.cyl(0.35, 0.35, 0.9, 10, 0xf6c235, [s * 8.0 + (i - 1) * 0.0, 0.5, pz + 5.0 + i * 0.0 + (s * i * 0.0)], { });
  return fin(S, { h: H + 10.4, w, d: d + 9, name: 'policeStation', fp: { w, d } });
}

// ---------------------------------------------------------------- parking garage with spiral ramp, parked cars and two cars driving the ramp
export function parkingGarage({ w = 30, d = 20, levels = 5, seed = 11, lod = 'high', sidewalk = true } = {}) {
  const S = newB(seed, lod), { b, g, rnd } = S;
  const lh = 3.0, H = levels * lh, rr = 6.8, rx = w / 2 + rr + 0.3;     // spiral ramp tower to the right
  if (sidewalk) pavement(b, { w: w + 2 * rr + 2, z0: d / 2 + 0.3, d: 3.6, cx: rr });
  // slabs, columns, edge walls, ceiling lights
  for (let l = 0; l <= levels; l++) b.box(w, 0.3, d, 0xb9b7b0, [0, l * lh + 0.15, 0], { rough: 0.95 });
  for (let l = 0; l < levels; l++) {
    const y = l * lh;
    for (let i = 0; i <= 4; i++) for (const z of [-d / 2 + 0.4, 0, d / 2 - 0.4]) b.box(0.6, lh - 0.3, 0.6, 0xa7a59e, [-w / 2 + 0.4 + i * (w - 0.8) / 4, y + 0.3 + (lh - 0.3) / 2, z]);
    for (const z of [-d / 2 + 0.08, d / 2 - 0.08]) { b.box(w, 0.9, 0.16, 0xcfccc2, [0, y + 0.75, z]); for (let i = 0; i < 12; i++) b.box(0.5 * 1, 0.4, 0.08, shade(0xcfccc2, 0.8), [-w / 2 + 1.2 + i * (w - 2.4) / 11, y + 1.4, z]); }
    b.box(0.16, 0.9, d, 0xcfccc2, [-w / 2 + 0.08, y + 0.75, 0]);
    for (let i = 0; i < 5; i++) b.box(0.25, 0.05, d - 2, 0xfff1c8, [-w / 2 + 3 + i * 6, y + lh - 0.04, 0], { glow: true });
    // painted bays
    for (let i = 0; i < 10; i++) for (const z of [-d / 2 + 3.6, d / 2 - 3.6]) b.box(0.1, 0.02, 4.4, 0xf4f4ee, [-w / 2 + 2.0 + i * 3.0, y + 0.32, z]);
    b.box(w, 0.02, 0.16, 0xf6c235, [0, y + 0.32, 0], {});
  }
  // front facade: vertical louvres on levels 2..N + big P sign
  for (let l = 1; l < levels; l++) for (let i = 0; i < 30; i++) b.box(0.08, 1.7, 0.25, 0x59616d, [-w / 2 + 0.5 + i * (w - 1) / 29, l * lh + 1.8, d / 2 + 0.2]);
  b.box(w, 2.2, 0.3, 0x3d4a5e, [0, 1.6, d / 2 + 0.06]); b.box(w + 0.4, 0.5, d + 0.4, 0x2f6fd6, [0, H + 0.45, 0]); b.box(w - 0.4, 0.14, d - 0.4, 0x6a7380, [0, H + 0.3, 0]);
  for (let i = 0; i < 6; i++) { const x = -w / 2 + 3 + i * 4.6; b.cyl(0.07, 0.07, 3.6, 6, 0x59616d, [x, H + 2.0, -d * 0.2]); b.box(1.3, 0.14, 0.6, 0xfff1c8, [x, H + 3.8, -d * 0.2], { glow: true }); }
  const ps = signMesh('P', 3.6, 3.6, { bg: '#2f6fd6', fg: '#ffffff', border: '#ffffff', radius: 0.2 }); ps.position.set(-w / 2 + 2.4, H + 2.4, d / 2 + 0.3); g.add(ps); b.box(0.3, 0.9, 0.3, 0x3d4a5e, [-w / 2 + 2.4, H + 0.6 + 0.0, d / 2 + 0.2]);
  const pk = signMesh('PUBLIC PARKING', 9.5, 1.4, { bg: '#1d2b5c', fg: '#ffffff', border: '#79b6ff' }); pk.position.set(w / 2 - 6.0, 6.0 + 4.0, d / 2 + 0.3 + 0.0); pk.position.y = 1.6 + 0.0; pk.position.z = d / 2 + 0.24; g.add(pk);
  // spiral ramp tower
  const turns = levels, seg = 28, tot = Math.floor(turns * seg);
  b.cyl(rr + 0.05, rr + 0.05, 0.3, 36, 0xb9b7b0, [rx, 0.15, 0]); b.cyl(1.2, 1.2, H + 1.0, 14, 0xa7a59e, [rx, (H + 1.0) / 2, 0]);
  S.g.userData.ramp = { rx, rr, lh, levels };
  // parked cars (static fleet), skipping the ramp lane
  const items = []; const colors = [0xd9392f, 0x2f6fd6, 0xf2f0ea, 0x59626f, 0x2fa66a, 0xf6c235, 0x8a52c9, 0x151515];
  for (let l = 0; l < levels; l++) for (let i = 0; i < 10; i++) for (const z of [-d / 2 + 3.6, d / 2 - 3.6]) { if (rnd() < 0.42) continue; items.push({ type: rnd() < 0.2 ? 'suv' : rnd() < 0.3 ? 'hatch' : 'sedan', color: colors[Math.floor(rnd() * colors.length)], x: -w / 2 + 3.5 + i * 3.0 - 1.5 + 1.5, y: l * lh + 0.3, z: z + (z < 0 ? 1.2 : -1.2) * 0, ry: z < 0 ? 0 : Math.PI }); }
  const fl = fleet(items); g.add(fl);
  // two cars driving the spiral (one up, one down) + barrier gate
  const drv = fleet([{ type: 'sedan', color: 0xf08a2b }, { type: 'hatch', color: 0x2bb7b0 }, { type: 'taxi' }]); g.add(drv);
  const period = 30, turnsN = levels;
  S.A.on((t) => {
    const u1 = fract(t / period), u2 = 1 - fract(t / period + 0.37), u3 = fract(t / period + 0.7);
    const ang = (u) => Math.PI + u * turnsN * TAU;
    const mv = (i, u, up) => { const aa = ang(u), y = 0.3 + u * turnsN * lh, rm = up ? 5.3 : 3.4, tx = -Math.sin(aa) * (up ? 1 : -1), tz = Math.cos(aa) * (up ? 1 : -1); drv.move(i, rx + Math.cos(aa) * rm, y + 0.02, Math.sin(aa) * rm, Math.atan2(tx, tz)); };
    mv(0, u1, true); mv(1, u2, false); mv(2, u3, true); drv.commit();
  });
  // barrier gate + ticket booth + FREE sign
  const gx = -w / 2 + 6, gz = d / 2 + 2.6;
  b.box(1.4, 2.4, 1.4, 0xf6c235, [gx - 1.0, 1.3, gz], {}); b.box(1.6, 0.2, 1.6, 0x20232b, [gx - 1.0, 2.6, gz]); b.box(0.5, 0.8, 0.05, 0xffe3a6, [gx - 1.0 + 0.0, 1.6, gz + 0.72], { glow: true });
  const arm = new THREE.Group(); arm.position.set(gx - 0.4, 1.0, gz); const ab = new Batch(); for (let i = 0; i < 6; i++) ab.box(0.5, 0.12, 0.12, i % 2 ? 0xffffff : 0xd9392f, [0.25 + i * 0.5, 0, 0]); ab.build(arm); g.add(arm);
  const fs = signMesh('FREE  47', 1.8, 0.5, { bg: '#0a0a0a', fg: '#7dff9a', radius: 0.1 }); fs.position.set(gx + 1.5, 3.0, gz + 0.1); g.add(fs); b.cyl(0.06, 0.06, 3.0, 6, 0x59616d, [gx + 1.5, 1.5, gz]);
  S.A.on((t) => { const p = fract(t / 9); const up = p < 0.3 ? smooth(p / 0.1) : p < 0.45 ? 1 : smooth(1 - (p - 0.35) / 0.1); arm.rotation.z = Math.min(1.35, up * 1.35); });
  // ramp, drawn as tilted slabs (second pass so we can orient them)
  const rampB = new Batch();
  for (let i = 0; i < tot; i++) {
    const a0 = Math.PI + (i / seg) * TAU, a1 = Math.PI + ((i + 1) / seg) * TAU, am = (a0 + a1) / 2, y0 = 0.3 + (i / seg) * lh, y1 = 0.3 + ((i + 1) / seg) * lh, rm2 = (1.4 + rr) / 2;
    const L = Math.hypot((a1 - a0) * rm2, y1 - y0) + 0.12, sl = Math.atan2(y1 - y0, (a1 - a0) * rm2);
    const o = new THREE.Object3D(); o.position.set(rx + Math.cos(am) * rm2, (y0 + y1) / 2 - 0.12, Math.sin(am) * rm2); o.rotation.set(0, -am, 0); o.rotateX(-sl); o.updateMatrix();
    const e = new THREE.Euler().setFromRotationMatrix(o.matrix, 'XYZ');
    rampB.box(rr - 1.4, 0.26, L, 0x8d8b84, [o.position.x, o.position.y, o.position.z], { r: [e.x, e.y, e.z], rough: 0.95 });
    const outer = new THREE.Object3D(); outer.position.set(rx + Math.cos(am) * (rr - 0.08), (y0 + y1) / 2 + 0.45, Math.sin(am) * (rr - 0.08)); outer.rotation.set(0, -am, 0); outer.rotateX(-sl); outer.updateMatrix();
    const e2 = new THREE.Euler().setFromRotationMatrix(outer.matrix, 'XYZ');
    rampB.box(0.16, 0.9, L, 0xcfccc2, [outer.position.x, outer.position.y, outer.position.z], { r: [e2.x, e2.y, e2.z] });
    if (i % 4 === 0) rampB.box(0.2, 0.2, 0.2, 0xffd23f, [outer.position.x, outer.position.y + 0.55, outer.position.z], { glow: true });
  }
  for (let l = 0; l <= levels; l++) rampB.box(0.7, 0.3, 5.4, 0xb9b7b0, [w / 2 + 0.15, l * lh + 0.15, 0], { rough: 0.95 });
  rampB.build(S.g);
  b.box(w + 2 * rr + 0.6, 0.3, 0.3, 0xc9c5ba, [rr, 0.15, d / 2 + 3.7]);
  return fin(S, { h: H + 4.0, w: w + 2 * rr, d: d + 3.6, name: 'parkingGarage', fp: { w: w + 2 * rr, d } });
}

// ---------------------------------------------------------------- factory with sawtooth roof, smoke stacks, conveyor, spinning roof vents
export function factory({ w = 42, d = 26, seed = 12, lod = 'high', sidewalk = true } = {}) {
  const S = newB(seed, lod), { b, g, rnd, hi } = S;
  const H = 9, brick = 0xa8553f;
  b.box(w + 6, 0.12, d + 10, 0x6a6e78, [0, 0.06, 4], { rough: 0.95 });
  b.box(w, 3.2, d, brick, [0, 1.6, 0]); b.box(w, H - 3.2, d, 0xc8ccd4, [0, 3.2 + (H - 3.2) / 2, 0], { rough: 0.5, metal: 0.25 });
  for (let i = 0; i < Math.floor(w / 0.6); i++) { b.box(0.08, H - 3.2, 0.1, 0xaab0ba, [-w / 2 + 0.3 + i * 0.6, 3.2 + (H - 3.2) / 2, d / 2 + 0.05], { metal: 0.3 }); }
  b.box(w + 0.3, 0.3, d + 0.3, 0x6a7380, [0, 3.2, 0]); b.box(w + 0.3, 0.5, d + 0.3, 0x6a7380, [0, H, 0]);
  // sawtooth roof: triangular profiles along X, glazing on the north faces
  const teeth = 6, tw = w / teeth;
  for (let i = 0; i < teeth; i++) {
    const x = -w / 2 + tw * (i + 0.5);
    b.profile([[0, 0], [tw, 0], [tw, 3.2]], d - 0.6, 0.04, 0x8a8f99, [x - tw / 2, H + 0.25, 0], { r: [0, 0, 0] });
    b.box(0.06, 2.8, d - 1.0, 0xbfe4ff, [x + tw / 2 - 0.05, H + 1.8, 0], { glow: true });
  }
  for (let i = 0; i < 4; i++) { const tv = turbineVent(0.5); tv.position.set(-w / 2 + 6 + i * 10, H + 3.6, -6 + (i % 2) * 12); g.add(tv); S.A.on(tv.userData.update); b.cyl(0.4, 0.5, 1.2, 8, 0x59616d, [-w / 2 + 6 + i * 10, H + 3.0, -6 + (i % 2) * 12]); }
  // windows: row of high clerestory panes
  const wl = []; facadeWindows(wl, { w, d, y0: H - 3.0, floors: 1, fh: 3, ww: 2.0, wh: 1.2, sill: 0.6, gapX: 3.5, gapZ: 3.5, faces: 'FBLR', rnd, lit: 0.5, margin: 2 });
  facadeWindows(wl, { w, d, y0: 0, floors: 1, fh: 3.2, ww: 1.6, wh: 1.2, sill: 1.0, gapX: 6, gapZ: 6, faces: 'BLR', rnd, lit: 0.4, margin: 2 });
  S.extra.push(makeWindows(wl, { lod: hi ? 'high' : 'low' }));
  // loading docks: three roll-up doors with dock levellers and lamps
  for (let i = 0; i < 3; i++) {
    const x = -10 + i * 10;
    b.box(4.4, 4.4, 0.2, 0x59616d, [x, 2.2, d / 2 + 0.08]); for (let k = 0; k < 14; k++) b.box(4.1, 0.05, 0.05, 0x8a909a, [x, 0.5 + k * 0.28, d / 2 + 0.2]);
    b.box(4.8, 1.1, 2.6, 0x8d8b84, [x, 0.55, d / 2 + 1.4]); b.box(4.8, 0.2, 2.6, 0xf6c235, [x, 1.12, d / 2 + 1.4]); b.box(0.2, 0.2, 0.4, 0x20232b, [x - 1.8, 1.4, d / 2 + 2.5], { });
    b.cyl(0.05, 0.05, 1.0, 6, 0x59616d, [x + 2.4, 5.1, d / 2 + 0.3]); b.box(0.5, 0.3, 0.4, 0xfff0c0, [x + 2.4, 4.6, d / 2 + 0.5], { glow: true });
  }
  b.box(w, 0.3, 0.4, 0xc9c5ba, [0, 0.15, d / 2 + 6.5]);
  const fs = signMesh('ACME WORKS', 8.5, 1.5, { bg: '#d9392f', fg: '#ffffff', border: '#f6c235' }); fs.position.set(0, 7.1, d / 2 + 0.08); g.add(fs);
  // smoke stacks (3) with banded brick, plus plumes
  const stacks = [[-w / 2 + 5, -d / 2 + 4, 24], [-w / 2 + 9.5, -d / 2 + 4, 30], [w / 2 - 5, -d / 2 + 5, 20]];
  stacks.forEach(([x, z, h], k) => {
    b.cyl(1.1, 2.0, h, 14, brick, [x, h / 2, z]); for (let i = 0; i < 4; i++) b.cyl(1.08 + (1 - i / 4) * 0.4 + 0.1, 1.08 + (1 - i / 4) * 0.4 + 0.1, 0.5, 14, i % 2 ? 0xf4f1e8 : 0xd9392f, [x, h - 1.6 - i * 1.8, z]);
    b.cyl(1.35, 1.1, 0.8, 14, 0x3a3f4a, [x, h + 0.2, z]); b.add(new THREE.TorusGeometry(1.3, 0.08, 4, 14), 0x6a7380, { p: [x, h + 0.65, z], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 8; i++) b.box(0.3, 0.05, 0.1, 0x6a7380, [x + 1.8, 2.2 + i * (h - 3) / 8, z + 0.0]);
    const sm = plume({ n: 12, rise: 26, r0: 0.9, r1: 3.2, period: 9 + k * 1.5, drift: [4.5, 0, 1.5], color: k === 2 ? 0xdedee2 : 0x9a9aa4, seed: k + 3, spread: 0.12 }); sm.position.set(x, h + 0.8, z); g.add(sm); S.A.on(sm.userData.update);
  });
  // tanks + silo + pipes + gantry
  for (const [x, z, r, h, c] of [[w / 2 + 5, 2, 3.2, 12, 0xd8dce2], [w / 2 + 5, -6, 2.6, 9, 0xd8dce2], [w / 2 + 11, -2, 2.2, 15, 0xf6c235]]) { b.cyl(r, r, h, 18, c, [x, h / 2, z], { metal: 0.3, rough: 0.5 }); b.sph(r, c, [x, h, z], { w: 14, h: 6, metal: 0.3 }); for (let i = 1; i < 4; i++) b.add(new THREE.TorusGeometry(r + 0.02, 0.06, 4, 18), 0x6a7380, { p: [x, i * h / 4, z], r: [Math.PI / 2, 0, 0] }); b.cyl(0.05, 0.05, h + 2, 6, 0x59616d, [x + r - 0.3, h / 2 + 1, z + r - 0.3], { }); }
  b.bar([w / 2, 6, 2], [w / 2 + 5, 6, 2], 0.5, 0x8a909a, { round: true, metal: 0.5 }); b.bar([w / 2, 5, -6], [w / 2 + 5, 5, -6], 0.4, 0xd9392f, { round: true }); b.bar([w / 2, 7, -2], [w / 2 + 11, 7, -2], 0.35, 0x2f6fd6, { round: true });
  for (let i = 0; i < 4; i++) { b.cyl(0.12, 0.12, 6, 6, 0x59616d, [w / 2 + 1 + i * 2.0, 3, 2.2]); }
  // conveyor belt along the front with crates riding on it
  const cy = 1.5, cz = d / 2 + 8.2, cl = 22;
  b.box(cl, 0.2, 1.2, 0x2a2d36, [0, cy, cz]); for (const s of [-1, 1]) b.box(cl, 0.3, 0.1, 0xf6c235, [0, cy + 0.1, cz + s * 0.65]); for (let i = 0; i <= 8; i++) b.box(0.15, cy, 0.15, 0x59616d, [-cl / 2 + i * cl / 8, cy / 2, cz + 0.5]), b.box(0.15, cy, 0.15, 0x59616d, [-cl / 2 + i * cl / 8, cy / 2, cz - 0.5]);
  for (let i = 0; i < 12; i++) b.cyl(0.16, 0.16, 1.15, 8, 0x555d68, [-cl / 2 + 0.9 + i * 1.8, cy + 0.15, cz], { r: [Math.PI / 2, 0, 0] });
  const crates = new THREE.InstancedMesh(gBox(0.9, 0.7, 0.8), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 9); crates.frustumCulled = false; g.add(crates);
  const cc = [0xa56b3a, 0xc9a24a, 0xd9392f, 0x2f6fd6, 0x2fa66a]; for (let i = 0; i < 9; i++) crates.setColorAt(i, new THREE.Color(cc[i % 5]));
  const o = new THREE.Object3D(); S.A.on((t) => { for (let i = 0; i < 9; i++) { const u = fract(t * 0.05 + i / 9); o.position.set(-cl / 2 + 0.6 + u * (cl - 1.2), cy + 0.5, cz); o.rotation.set(0, 0, 0); o.scale.set(1, 0.8 + (i % 3) * 0.2, 1); o.updateMatrix(); crates.setMatrixAt(i, o.matrix); } crates.instanceMatrix.needsUpdate = true; });
  // hanging crane hook swings above the belt
  b.box(0.4, 7, 0.4, 0x59616d, [-cl / 2 - 0.5, 3.5, cz - 2]); b.box(0.4, 7, 0.4, 0x59616d, [cl / 2 + 0.5, 3.5, cz - 2]); b.box(cl + 1.4, 0.5, 0.5, 0xf6c235, [0, 7.2, cz - 2]);
  const hook = new THREE.Group(); hook.position.set(0, 7.0, cz - 2); const hb = new Batch(); hb.bar([0, 0, 0], [0, -3.4, 0], 0.05, 0x2a2d36); hb.box(0.6, 0.5, 0.5, 0xf6c235, [0, -3.5, 0]); hb.box(0.9, 0.6, 0.8, 0xa56b3a, [0, -4.1, 0]); hb.build(hook); g.add(hook);
  S.A.on((t) => { hook.position.x = Math.sin(t * 0.3) * 8; hook.rotation.z = Math.cos(t * 0.3) * 0.1; });
  return fin(S, { h: 31, w: w + 20, d: d + 18, name: 'factory', fp: { w, d } });
}

// ---------------------------------------------------------------- church with rose window, swinging bell, pigeons
export function church({ seed = 13, lod = 'high', sidewalk = true } = {}) {
  const S = newB(seed, lod), { b, g, rnd, hi } = S;
  const nw = 11, nd = 24, nh = 9, tw = 6.4, th = 21, stone = 0xdad2bf, roof = 0x5a6e7e;
  if (sidewalk) pavement(b, { w: nw + 10, z0: nd / 2 + 4.0, d: 3.2 });
  b.box(nw, nh, nd, stone, [0, nh / 2, 0]); b.box(nw + 0.4, 0.8, nd + 0.4, 0xb2ab9a, [0, 0.4, 0]);
  // gabled roof (extruded triangle along Z) + ridge
  b.profile([[-nw / 2 - 0.5, 0], [nw / 2 + 0.5, 0], [0, 4.6]], nd + 0.8, 0.06, roof, [0, nh, 0], { rough: 0.7 });
  b.box(0.3, 0.2, nd + 0.9, shade(roof, 0.7), [0, nh + 4.6, 0]);
  for (let i = 0; i < 14; i++) { for (const s of [-1, 1]) b.box(7.4, 0.06, 0.14, shade(roof, 0.8), [s * 3.0, nh + 2.34, -nd / 2 + 1 + i * (nd - 2) / 13], { r: [0, 0, -s * 0.655] }); }
  // buttresses + pointed windows with stained glass
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { const z = -nd / 2 + 2.6 + i * (nd - 5.2) / 4; b.box(0.7, nh - 1.0, 0.9, shade(stone, 0.9), [s * (nw / 2 + 0.3), (nh - 1.0) / 2, z - 2.0 * 0]); }
  const glassG = new THREE.Group(); g.add(glassG);
  const arch = [[-0.9, 0], [0.9, 0], [0.9, 3.0], [0.7, 3.6], [0.3, 4.1], [0, 4.4], [-0.3, 4.1], [-0.7, 3.6], [-0.9, 3.0]];
  const stainedCols = [0xd9392f, 0x2f6fd6, 0xf6c235, 0x2fa66a, 0x8a52c9];
  const panes = [];
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const z = -nd / 2 + 4.2 + i * 5.2;
    b.profile(arch.map(([x, y]) => [x * 1.18, y * 1.08]), 0.3, 0.02, 0x8d8576, [s * (nw / 2 + 0.01), 2.0, z], { r: [0, s * Math.PI / 2, 0] });
    for (let k = 0; k < 7; k++) { const col = stainedCols[(i + k + (s > 0 ? 2 : 0)) % 5]; const y = 2.3 + k * 0.6; panes.push({ p: [s * (nw / 2 + 0.17), y, z + (k % 2 ? -0.3 : 0.3)], r: [0, s * Math.PI / 2, 0], c: col, w: 0.62, h: 0.52 }); }
    for (let k = 0; k < 4; k++) panes.push({ p: [s * (nw / 2 + 0.17), 2.3 + k * 1.0 + 0.3, z], r: [0, s * Math.PI / 2, 0], c: stainedCols[(i + k) % 5], w: 0.34, h: 0.9 });
  }
  const pm = new THREE.InstancedMesh(gPlane(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), panes.length); const o1 = new THREE.Object3D();
  panes.forEach((p, i) => { o1.position.set(...p.p); o1.rotation.set(...p.r); o1.scale.set(p.w, p.h, 1); o1.updateMatrix(); pm.setMatrixAt(i, o1.matrix); pm.setColorAt(i, new THREE.Color(p.c)); }); pm.instanceMatrix.needsUpdate = true; g.add(pm);
  // front tower
  const tz = nd / 2 + tw / 2 - 0.5;
  b.box(tw, th, tw, stone, [0, th / 2, tz]); b.box(tw + 0.5, 0.5, tw + 0.5, 0xb2ab9a, [0, 0.25, tz]); b.box(tw + 0.6, 0.6, tw + 0.6, 0xb2ab9a, [0, th, tz]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.8, th, 0.8, shade(stone, 0.9), [sx * (tw / 2), th / 2, tz + sz * (tw / 2)]);
  // doors, rose window, clock-less belfry with louvres
  const fz = tz + tw / 2;
  b.profile(arch.map(([x, y]) => [x * 1.4, y * 1.0]), 0.3, 0.02, 0x8d8576, [0, 0.0, fz + 0.05]); b.profile(arch.map(([x, y]) => [x * 1.15, y * 0.92]), 0.3, 0.02, 0x4a2e1a, [0, 0.0, fz + 0.14]); b.box(0.1, 3.4, 0.34, 0xc9a24a, [0, 1.7, fz + 0.16]);
  for (let i = 0; i < 4; i++) b.box(5.2 - i * 0.2, 0.26, 2.0 + i * 0.45, 0xc9c5ba, [0, 0.13, fz + 1.4 + i * 0.45]);
  const rose = new THREE.Group(); rose.position.set(0, 9.6, fz + 0.06); g.add(rose);
  const rb = new Batch(); rb.add(new THREE.TorusGeometry(1.8, 0.18, 6, 30), 0x8d8576, { p: [0, 0, 0.0] }); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; rb.cone(0.5, 1.5, 3, stainedCols[i % 5], [Math.sin(a) * 0.95, Math.cos(a) * 0.95, 0.06], { r: [Math.PI / 2, 0, -a], glow: true }); }
  rb.cyl(0.35, 0.35, 0.1, 12, 0xf6c235, [0, 0, 0.1], { r: [Math.PI / 2, 0, 0], glow: true }); rb.build(rose);
  b.box(2.0, 3.2, 0.2, 0x20232b, [0, th - 3.4, fz + 0.05]); for (let i = 0; i < 5; i++) b.box(1.9, 0.08, 0.3, 0x59616d, [0, th - 4.4 + i * 0.55, fz + 0.1]);
  for (const f of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const pxx = f[0] * (tw / 2 + 0.05), pzz = tz + f[1] * (tw / 2 + 0.05); b.box(f[0] ? 0.1 : 2.0, 3.2, f[0] ? 2.0 : 0.1, 0x20232b, [pxx, th - 3.4, pzz]); }
  // belfry (open arches) + bell
  b.box(tw - 1.0, 3.8, tw - 1.0, shade(stone, 0.95), [0, th + 2.4, tz]); for (const f of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { b.box(f[0] ? 0.1 : 2.2, 2.8, f[0] ? 2.2 : 0.1, 0x20232b, [f[0] * (tw / 2 - 0.45), th + 2.4, tz + f[1] * (tw / 2 - 0.45)]); }
  b.box(tw - 0.4, 0.4, tw - 0.4, 0xb2ab9a, [0, th + 4.4, tz]);
  b.cone(tw * 0.62, 11, 4, roof, [0, th + 10.1, tz], { r: [0, Math.PI / 4, 0], rough: 0.65 }); b.cyl(0.07, 0.07, 3, 6, 0xc9a24a, [0, th + 16.6, tz]); b.box(0.12, 1.6, 0.12, 0xc9a24a, [0, th + 17.2, tz]); b.box(0.9, 0.12, 0.12, 0xc9a24a, [0, th + 17.5, tz]);
  const bell = new THREE.Group(); bell.position.set(0, th + 3.8, tz); const bb = new Batch(); bb.cone(0.8, 1.2, 14, 0xc9a24a, [0, -0.6, 0], { metal: 0.6, rough: 0.35 }); bb.sph(0.18, 0x3a3a40, [0, -1.2, 0]); bb.box(1.9, 0.14, 0.14, 0x4a2e1a, [0, 0.1, 0]); bb.build(bell); g.add(bell);
  S.A.on((t) => { bell.rotation.z = Math.sin(t * 1.7) * 0.5 * (0.5 + 0.5 * Math.sin(t * 0.3)); });
  // gate, graves-free garden: low wall, trees, path
  b.box(nw + 8, 0.2, 5, 0xc9c5ba, [0, 0.1, nd / 2 + 6.3]); for (let i = 0; i < 4; i++) treeParts(b, -9 + (i % 2) * 18 + (i > 1 ? 0 : 0), nd / 2 + 1 + i * 0, 6.0, 0x4aa84e);
  for (let i = 0; i < 24; i++) { const x = -12 + i; if (Math.abs(x) < 2) continue; b.box(0.1, 1.2, 0.1, 0x2a3038, [x, 0.7, nd / 2 + 8.5]); }
  b.box(24.5, 0.06, 0.06, 0x2a3038, [0, 1.15, nd / 2 + 8.5]);
  // pigeons circling the steeple
  const birds = birdFlock({ n: 12, center: [0, th + 6, tz], radius: 9, spread: 4, speed: 0.55, seed: 4, size: 1.1 }); S.A.add(birds);
  return fin(S, { h: th + 18.2, w: nw + 8, d: nd + 14, name: 'church', fp: { w: nw, d: nd } });
}

// ---------------------------------------------------------------- stadium: bowl, hopping crowd, floodlights, scoreboard (pitch 105 x 68 m)
export function stadium({ seed = 14, crowd = 'full', home = '#d9392f', away = '#2f6fd6' } = {}) {
  const S = newB(seed, 'low'), { b, g } = S, rnd = rng(seed);
  const sx = 1.28, rows = 26, r0 = 60, tread = 1.0, rise = 0.95, hole = 0.3;
  // pitch + lines
  const px = 52.5, pz = 34;
  b.box(px * 2 + 8, 0.3, pz * 2 + 8, 0x2f7a3a, [0, 0.05, 0]);
  for (let i = 0; i < 14; i++) b.box(px * 2 / 14, 0.05, pz * 2, i % 2 ? 0x3a9248 : 0x2f8040, [-px + px * 2 / 14 * (i + 0.5), 0.22, 0], { rough: 1 });
  const L = (x, z, w, d) => b.box(w, 0.04, d, 0xf4f4ee, [x, 0.26, z]);
  L(0, -pz, px * 2, 0.2); L(0, pz, px * 2, 0.2); L(-px, 0, 0.2, pz * 2); L(px, 0, 0.2, pz * 2); L(0, 0, 0.2, pz * 2);
  for (const s of [-1, 1]) { L(s * (px - 8.25), 0, 0.2, 40); L(s * (px - 4), 0, 0.2, 18); L(s * (px - 16.5 / 2), -20, 16.5, 0.2); L(s * (px - 16.5 / 2), 20, 16.5, 0.2); b.add(new THREE.TorusGeometry(9.15, 0.1, 4, 36), 0xf4f4ee, { p: [0, 0.26, 0], r: [Math.PI / 2, 0, 0] }); }
  for (const s of [-1, 1]) { b.box(0.15, 2.44, 0.15, 0xffffff, [s * px, 1.3, -3.66]); b.box(0.15, 2.44, 0.15, 0xffffff, [s * px, 1.3, 3.66]); b.box(0.15, 0.15, 7.5, 0xffffff, [s * px, 2.5, 0]); b.box(2.0, 2.4, 7.2, 0xdddddd, [s * (px + 1.0), 1.3, 0], { }); }
  // running track + hoarding ring
  const track = new THREE.Mesh(new THREE.RingGeometry(1, 1.0001, 4), mat(0x888888)); track.visible = false;
  // bowl: stepped lathe scaled to an ellipse
  const pts = []; for (let i = 0; i <= rows; i++) { const r = r0 + i * tread, y = 1.0 + i * rise; if (i === 0) pts.push(new THREE.Vector2(r, 0.1)); pts.push(new THREE.Vector2(r, y)); pts.push(new THREE.Vector2(r + tread, y)); }
  pts.push(new THREE.Vector2(r0 + (rows + 1) * tread, 0.1));
  const bowl = new THREE.LatheGeometry(pts, 96), pos = bowl.attributes.position, nrm = bowl.attributes.normal, col = new Float32Array(pos.count * 3), cH = new THREE.Color(home), cA = new THREE.Color(away), cT = new THREE.Color(0xc8cbd2), cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x), blk = Math.floor(((a + Math.PI) / TAU) * 48), up = nrm.getY(i) > 0.5;
    const h = hash1(blk * 3.1);
    cc.copy(h < 0.5 ? cH : cA); if (!up) cc.multiplyScalar(0.78); if (blk % 12 === 0) cc.copy(cT);
    col.set([cc.r, cc.g, cc.b], i * 3);
  }
  bowl.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const bm = new THREE.Mesh(bowl, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide })); bm.scale.set(sx, 1, 1); bm.castShadow = true; bm.receiveShadow = true; g.add(bm);
  // outer wall with arches and ribs, concourse ring, roof canopy with truss spokes
  const ow = [new THREE.Vector2(r0 + (rows + 1) * tread, 0), new THREE.Vector2(r0 + (rows + 1) * tread, 1.0 + rows * rise + 1.5), new THREE.Vector2(r0 + (rows + 1) * tread - 1.2, 1.0 + rows * rise + 2.2)];
  const owm = new THREE.Mesh(new THREE.LatheGeometry(ow, 96), new THREE.MeshStandardMaterial({ color: 0xe6e3da, roughness: 0.7, side: THREE.DoubleSide })); owm.scale.set(sx, 1, 1); owm.castShadow = true; g.add(owm);
  const R = r0 + (rows + 1) * tread, topY = 1.0 + rows * rise + 1.5;
  const ribs = []; for (let i = 0; i < 64; i++) { const a = i / 64 * TAU; ribs.push({ p: [Math.cos(a) * (R + 0.4) * sx, topY / 2, Math.sin(a) * (R + 0.4)], r: [0, -a, 0], s: [1, topY, 1.4], c: 0xc9c5ba }); }
  const rm = inst(gBox(1, 1, 1), mat(0xc9c5ba, { rough: 0.8 }), ribs); g.add(rm);
  const arch = []; for (let i = 0; i < 32; i++) { const a = (i + 0.5) / 32 * TAU; arch.push({ p: [Math.cos(a) * (R + 0.15) * sx, 2.2, Math.sin(a) * (R + 0.15)], r: [0, -a + Math.PI / 2, 0], s: [4.2, 4.4, 0.4] }); }
  g.add(inst(gBox(1, 1, 1), mat(0x2a3038), arch));
  const roofPts = [new THREE.Vector2(r0 + 6 * tread, topY + 3.2), new THREE.Vector2(R + 3, topY + 4.4), new THREE.Vector2(R + 3, topY + 5.0), new THREE.Vector2(r0 + 6 * tread, topY + 3.8)];
  const roofM = new THREE.Mesh(new THREE.LatheGeometry(roofPts, 96), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.6, side: THREE.DoubleSide })); roofM.scale.set(sx, 1, 1); roofM.castShadow = true; g.add(roofM);
  const spokes = []; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, cx = Math.cos(a), sz = Math.sin(a); const x0 = (r0 + 6 * tread) * sx * cx, z0 = (r0 + 6 * tread) * sz, x1 = (R + 3) * sx * cx, z1 = (R + 3) * sz; spokes.push([[x0, topY + 3.2, z0], [x1, topY + 4.4, z1]]); }
  spokes.forEach(([a, c]) => b.bar(a, c, 0.18, 0x8a909a, { metal: 0.4 }));
  // crowd: instanced fans on the treads, hopping in a shader
  const fans = []; const palette = [home, away, '#f6c235', '#ffffff', '#2fa66a', '#222222'].map((c) => new THREE.Color(c)); const nseg = crowd === 'full' ? 120 : 60;
  for (let rI = 1; rI < rows; rI += 1) for (let k = 0; k < nseg; k++) {
    if (rnd() < 0.12) continue;
    const a = (k + rnd() * 0.6) / nseg * TAU, blk = Math.floor(((a % TAU) / TAU) * 48), isHome = hash1(((blk + 24) % 48) * 3.1 + 0) < 0.5; const r = r0 + rI * tread + tread * 0.5, y = 1.0 + rI * rise + 0.45;
    fans.push({ p: [Math.cos(a) * r * sx, y, Math.sin(a) * r], r: [0, -a + Math.PI / 2, 0], c: rnd() < 0.7 ? (isHome ? home : away) : palette[Math.floor(rnd() * palette.length)] });
  }
  const bobM = bobMaterial(0xffffff, { amp: 0.4, rate: 5.0, share: 0.5 });
  const fm = new THREE.InstancedMesh(gBox(0.55, 0.9, 0.4), bobM, fans.length); fm.frustumCulled = false; fm.castShadow = false; const oo = new THREE.Object3D();
  fans.forEach((f, i) => { oo.position.set(...f.p); oo.rotation.set(...f.r); oo.scale.set(1, 1, 1); oo.updateMatrix(); fm.setMatrixAt(i, oo.matrix); fm.setColorAt(i, new THREE.Color(f.c)); }); fm.instanceMatrix.needsUpdate = true; g.add(fm);
  const hm = new THREE.InstancedMesh(gSph(0.22, 7, 5), (() => { const m = bobMaterial(0xffffff, { amp: 0.4, rate: 5.0, share: 0.5 }); return m; })(), fans.length); hm.frustumCulled = false; hm.castShadow = false;
  const skin = [0xf2b98f, 0xd99a6c, 0x9b6338, 0xf8d5b8, 0x6b4226]; fans.forEach((f, i) => { oo.position.set(f.p[0], f.p[1] + 0.62, f.p[2]); oo.rotation.set(0, 0, 0); oo.scale.setScalar(1); oo.updateMatrix(); hm.setMatrixAt(i, oo.matrix); hm.setColorAt(i, new THREE.Color(skin[i % 5])); }); g.add(hm);
  // floodlight towers
  const lampPanels = [];
  for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = ax * 124, z = az * 98; b.cyl(0.7, 1.1, 52, 10, 0xc8ccd4, [x, 26, z], { metal: 0.4 }); b.box(11, 7.5, 1.0, 0x3a424e, [x, 54.5, z], { metal: 0.3 });
    const pm2 = new THREE.Mesh(gBox(10.2, 6.6, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff })); pm2.position.set(x, 54.5, z); pm2.lookAt(0, 20, 0); pm2.translateZ(0.6); g.add(pm2); lampPanels.push(pm2);
    const lampGrid = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) lampGrid.push({ p: [-4.2 + i * 1.7, -2.4 + j * 1.6, 0.12], s: [1.2, 1.2, 0.05], c: 0xfff6d8 });
    const lg = inst(gBox(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xfffbe8, toneMapped: false }), lampGrid); pm2.add(lg);
  }
  // scoreboards over both ends
  for (const s of [-1, 1]) { b.box(1.2, 7, 14, 0x20232b, [s * 80, 26, 0], { }); for (const z of [-5.5, 5.5]) b.bar([s * 80, 29.5, z], [s * 83, 31.6, z * 1.1], 0.12, 0x6a7380); }
  const sb = signMesh('', 12.6, 5.6, { bg: '#0a0f1e', lines: [{ text: 'HOME   2 - 1   AWAY', y: 0.3, size: 0.45, color: '#ffd23f' }, { text: "67'  CITY FC", y: 0.74, size: 0.34, color: '#7dff9a' }], double: true }); sb.rotation.y = -Math.PI / 2; sb.position.set(79.3, 26, 0); g.add(sb);
  const sb2 = signMesh('', 12.6, 5.6, { bg: '#0a0f1e', lines: [{ text: 'HOME   2 - 1   AWAY', y: 0.3, size: 0.45, color: '#ffd23f' }, { text: "67'  CITY FC", y: 0.74, size: 0.34, color: '#7dff9a' }] }); sb2.rotation.y = Math.PI / 2; sb2.position.set(-79.3, 26, 0); g.add(sb2);
  // hoardings round the pitch + corner flags + ground apron
  for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; b.box(4.2, 0.9, 0.2, [0xd9392f, 0x2f6fd6, 0xf6c235, 0xffffff][i % 4], [Math.cos(a) * 58 * sx * 0.98, 0.75, Math.sin(a) * 58 * 0.98], { r: [0, -a + Math.PI / 2, 0] }); }
  S.A.on((t) => { bobM.userData.uT.value = t; hm.material.userData.uT.value = t; lampPanels.forEach((p, i) => { p.material.color.setScalar(0.92 + 0.08 * Math.sin(t * 7 + i * 2.1)); }); });
  const ap = new THREE.Mesh(new THREE.CircleGeometry(1, 64), mat(0xb8b6ae, { rough: 0.95 })); ap.rotation.x = -Math.PI / 2; ap.scale.set(150, 150, 1); ap.position.y = -0.02; g.add(ap);
  b.build(g);
  meta(g, { h: 58.5, w: 2 * R * sx, d: 2 * R, name: 'stadium' }); g.userData.footprint = { w: 2 * R * sx, d: 2 * R }; g.userData.pitchM = [105, 68];
  return g;
}
