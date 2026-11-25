// City pack: street furniture at real scale (metres). Every builder returns a Group with userData.update(t) (closed form), userData.realHeightM.
// trafficLight (cycling, shared signalPhase), streetLamp, bench (+pigeons), hydrant (opens: spray), busStop (arrival board), mailbox, trashBins,
// newsBox, billboard (rotating ads), crosswalk (flashing studs), manholeSteam, roadworks (jackhammer, flasher), scaffolding (hoist), crane (rotating jib), powerLines (swaying wires), hotdogCart.
import * as THREE from 'three';
import {
  Batch, PAL, anim, meta, signMesh, lampMesh, lampMat, halo, plume, flag, birdFlock, inst, wheel, rng, shade, lerp, TAU, fract, hash1, clamp, smooth,
  gBox, gCyl, gSph, gPlane, gCone, gTor, mat, treeParts,
} from './city_kit.js';

const _o = new THREE.Object3D();
const grp = (name) => { const g = new THREE.Group(); g.name = name; return { g, A: anim(g), b: new Batch() }; };
const done = (S, h, w, name) => { S.b.build(S.g); return meta(S.g, { h, w, name }); };

// shared traffic-signal timing: T = 26 s, direction 0 green 0-10 s, yellow 10-13 s, red 13-26 s; direction 1 is offset by half a cycle (no conflicts).
// returns 0 green, 1 yellow, 2 red
export const SIGNAL_T = 26;
export function signalPhase(t, dir = 0) { const u = (((t + dir * 13) % SIGNAL_T) + SIGNAL_T) % SIGNAL_T; return u < 10 ? 0 : u < 13 ? 1 : 2; }

// ---------------------------------------------------------------- traffic light (mast arm + pedestrian signal), cycles red/green/yellow
export function trafficLight({ dir = 0, phaseOffset = 0, arm = 5.5, side = 1 } = {}) {
  const S = grp('trafficLight'), { g, A, b } = S;
  const H = 6.2, pole = 0x3a4452;
  b.cyl(0.14, 0.2, H, 10, pole, [0, H / 2, 0], { metal: 0.4 }); b.cyl(0.3, 0.3, 0.3, 10, pole, [0, 0.15, 0]); b.box(0.4, 0.5, 0.25, 0x2a323d, [0, 1.6, 0.18]);
  b.bar([0, H - 0.6, 0], [side * arm * 0.5, H - 0.2, 0], 0.18, pole, { round: true, metal: 0.4 }); b.bar([side * arm * 0.5, H - 0.2, 0], [side * arm, H - 0.3, 0], 0.14, pole, { round: true, metal: 0.4 });
  b.bar([0, H - 2.4, 0], [side * arm * 0.35, H - 0.35, 0], 0.07, pole, { round: true });
  const heads = [];
  const head = (x, y, z, ry) => {
    const hg = new THREE.Group(); hg.position.set(x, y, z); hg.rotation.y = ry; g.add(hg);
    const hb = new Batch(); hb.box(0.46, 1.32, 0.38, 0x20242b, [0, 0, 0], { rough: 0.5 }); hb.box(0.58, 0.08, 0.5, 0x20242b, [0, 0.7, 0.04]); hb.build(hg);
    const L = [[0xff2b2b, 0.42], [0xffc21a, 0], [0x2bff6a, -0.42]].map(([c, yy]) => { const m = lampMesh(gCyl(0.15, 0.15, 0.1, 14), c, 0.1); m.rotation.x = Math.PI / 2; m.position.set(0, yy, 0.2); hg.add(m); const vz = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12, 1, true, -Math.PI / 2, Math.PI), mat(0x20242b, { side: THREE.DoubleSide })); vz.rotation.z = 0; vz.rotation.x = 0; vz.position.set(0, yy + 0.07, 0.3); vz.rotation.y = Math.PI / 2 * 0; hg.add(vz); vz.scale.set(1, 1, 1); vz.rotation.set(0, Math.PI, 0); vz.rotation.x = Math.PI / 2; vz.visible = false; const h = halo(c, 0.42, 0); h.position.set(0, yy, 0.32); hg.add(h); return { m, h }; });
    heads.push(L);
  };
  head(side * arm * 0.55, H - 0.95, 0.0, 0); head(side * arm * 0.95, H - 1.0, 0.0, 0); head(0, H - 1.3, 0.3, 0);
  // pedestrian signal (red hand / white walker) on the pole + push button
  const pg = new THREE.Group(); pg.position.set(0.0, 2.9, 0.3); g.add(pg); const pb = new Batch(); pb.box(0.62, 0.9, 0.3, 0x20242b, [0, 0, 0]); pb.build(pg);
  const hand = new THREE.Group(), man = new THREE.Group(); hand.position.set(0, 0.22, 0.17); man.position.set(0, -0.22, 0.17); pg.add(hand, man);
  const hm = lampMat(0xff3b2b, 0.1), mm = lampMat(0xf4f8ff, 0.1);
  const hand1 = new THREE.Mesh(gBox(0.24, 0.16, 0.03), hm), fin = []; hand.add(hand1); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(gBox(0.04, 0.14, 0.03), hm); f.position.set(-0.09 + i * 0.06, 0.13, 0); hand.add(f); }
  const th = new THREE.Mesh(gBox(0.06, 0.16, 0.03), hm); th.position.set(-0.15, 0.04, 0); th.rotation.z = 0.5; hand.add(th);
  const mh = new THREE.Mesh(gSph(0.05, 8, 6), mm), mb = new THREE.Mesh(gBox(0.08, 0.16, 0.03), mm); mh.position.set(0, 0.17, 0); mb.position.set(0, 0.04, 0); man.add(mh, mb);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(gBox(0.04, 0.17, 0.03), mm); l.position.set(s * 0.04, -0.1, 0); l.rotation.z = s * 0.3; man.add(l); }
  b.box(0.16, 0.26, 0.1, 0xc9ced6, [0.18, 1.35, 0.22]); b.cyl(0.04, 0.04, 0.03, 8, 0xd9392f, [0.18, 1.37, 0.28], { r: [Math.PI / 2, 0, 0] });
  // street-name blades on the arm
  const sn = signMesh('MAIN ST', 1.8, 0.42, { bg: '#1d6a3a', fg: '#ffffff', double: true }); sn.position.set(side * arm * 0.78, H + 0.2, 0.0); g.add(sn);
  const sn2 = signMesh('5TH AVE', 1.8, 0.42, { bg: '#1d6a3a', fg: '#ffffff', double: true }); sn2.rotation.y = Math.PI / 2; sn2.position.set(0, H + 0.6, 0.0); g.add(sn2); b.cyl(0.03, 0.03, 0.5, 6, pole, [0, H + 0.25, 0]);
  A.on((t) => {
    const ph = signalPhase(t + phaseOffset, dir);
    heads.forEach((L) => L.forEach((l, i) => { const on = (ph === 2 && i === 0) || (ph === 1 && i === 1) || (ph === 0 && i === 2); l.m.material.userData.set(on ? 1.5 : 0.1); l.h.material.opacity = on ? 0.35 : 0; l.h.visible = on; }));
    const u = (((t + phaseOffset + dir * 13) % SIGNAL_T) + SIGNAL_T) % SIGNAL_T;               // ped. light is the cross direction: walk while this direction is red
    const walk = u >= 14 && u < 22, flashing = u >= 22 && u < 26;
    mm.userData.set(walk ? 1.4 : 0.08); hm.userData.set(walk ? 0.08 : (flashing ? (fract(t * 2) < 0.5 ? 1.4 : 0.08) : 1.4)); if (!flashing && !walk) hm.userData.set(1.4);
  });
  return done(S, H + 1.0, arm, 'trafficLight');
}

// ---------------------------------------------------------------- street lamps
export function streetLamp({ kind = 'cobra', seed = 1, on = true } = {}) {
  const S = grp('streetLamp'), { g, A, b } = S, rnd = rng(seed);
  let H, lampPos, glowC = 0xfff0c0;
  if (kind === 'classic') {
    H = 4.4; const iron = 0x20262e;
    b.cyl(0.32, 0.42, 0.9, 10, iron, [0, 0.45, 0], { metal: 0.5 }); b.cyl(0.16, 0.22, 1.2, 10, iron, [0, 1.5, 0], { metal: 0.5 }); b.cyl(0.1, 0.14, 2.0, 10, iron, [0, 3.0, 0], { metal: 0.5 });
    b.tor(0.2, 0.04, iron, [0, 2.2, 0], { r: [Math.PI / 2, 0, 0] }); b.tor(0.16, 0.04, iron, [0, 3.9, 0], { r: [Math.PI / 2, 0, 0] });
    for (const s of [-1, 1]) { b.bar([0, 3.2, 0], [s * 0.7, 3.8, 0], 0.05, iron, { round: true }); b.sph(0.12, iron, [s * 0.7, 3.88, 0]); b.bar([s * 0.7, 3.2, 0], [0, 2.7, 0], 0.03, iron); }
    b.box(0.5, 0.06, 0.5, iron, [0, 4.1, 0], {}); b.cone(0.38, 0.4, 4, iron, [0, 4.6, 0], { r: [0, Math.PI / 4, 0] }); b.sph(0.08, iron, [0, 4.9, 0]);
    // flower basket
    b.cyl(0.3, 0.2, 0.25, 10, 0x6a4a2a, [-0.0, 2.6, 0.3 * 0 + 0.0], { }); for (let i = 0; i < 6; i++) b.sph(0.11, [0xff5c8a, 0xffd23f, 0xb07aff][i % 3], [Math.cos(i) * 0.2, 2.78, Math.sin(i) * 0.2], { w: 7, h: 5 });
    b.cyl(0.0001, 0.0001, 0.001, 3, iron, [0, 0, 0]);
    lampPos = [0, 4.05, 0];
    const gl = lampMesh(gCyl(0.24, 0.17, 0.62, 12), glowC, 1); gl.position.set(0, 4.35, 0); g.add(gl); g.userData.lamps = [gl];
  } else {
    H = 9.2; const pole = 0xaab2bd;
    b.cyl(0.32, 0.4, 0.5, 10, 0x59616d, [0, 0.25, 0]); b.cyl(0.1, 0.18, H, 10, pole, [0, H / 2, 0], { metal: 0.5, rough: 0.35 });
    b.bar([0, H - 0.6, 0], [0.3, H + 0.3, 0], 0.14, pole, { round: true, metal: 0.5 }); b.bar([0.3, H + 0.3, 0], [2.2, H + 0.15, 0], 0.1, pole, { round: true, metal: 0.5 }); b.bar([0, H - 1.6, 0], [1.0, H + 0.1, 0], 0.05, pole, { round: true });
    b.rbox(1.3, 0.22, 0.5, 0.1, 0x59616d, [2.3, H + 0.05, 0], { metal: 0.4 });
    const gl = lampMesh(gBox(1.05, 0.06, 0.38), glowC, 1); gl.position.set(2.3, H - 0.1, 0); g.add(gl); g.userData.lamps = [gl];
    lampPos = [2.3, 0, 0];
    b.box(0.3, 0.5, 0.2, 0x59616d, [0, 1.8, 0.14]);
  }
  // pool of light on the ground (additive disc) + halo
  const pool = new THREE.Mesh(new THREE.CircleGeometry(kind === 'classic' ? 2.2 : 4.0, 28), new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); pool.rotation.x = -Math.PI / 2; pool.position.set(lampPos[0], 0.035, lampPos[2]); g.add(pool);
  const hl = halo(0xffe9a8, kind === 'classic' ? 0.7 : 0.9, 0.3); hl.position.set(lampPos[0], kind === 'classic' ? 4.35 : H - 0.1, lampPos[2]); g.add(hl);
  const ph = rnd() * 6;
  A.on((t) => { const k = on ? 1 + 0.05 * Math.sin(t * 9 + ph) * (fract(t * 0.13 + ph) > 0.93 ? 4 : 1) : 0.1; for (const m of g.userData.lamps) m.material.userData.set(k * 1.3); pool.material.opacity = on ? 0.2 * k : 0.0; hl.material.opacity = on ? 0.3 * k : 0.0; });
  return done(S, H + 0.5, 2.5, 'streetLamp');
}

// ---------------------------------------------------------------- park bench with pecking pigeons
export function bench({ seed = 2, color = 0x9b6338, pigeons = true } = {}) {
  const S = grp('bench'), { g, A, b } = S, iron = 0x20262e, rnd = rng(seed);
  for (let i = 0; i < 5; i++) b.rbox(1.9, 0.08, 0.1, 0.03, i % 2 ? color : shade(color, 1.08), [0, 0.5, -0.2 + i * 0.13], { rough: 0.8 });
  for (let i = 0; i < 3; i++) b.rbox(1.9, 0.09, 0.05, 0.02, i % 2 ? color : shade(color, 1.08), [0, 0.8 + i * 0.16, -0.32 - i * 0.04], { r: [-0.12, 0, 0] });
  for (const s of [-1, 1]) {
    const x = s * 0.9; b.box(0.07, 0.5, 0.07, iron, [x, 0.25, 0.28], { metal: 0.4 }); b.box(0.07, 0.5, 0.07, iron, [x, 0.25, -0.2], { metal: 0.4 }); b.bar([x, 0.5, -0.24], [x, 1.1, -0.36], 0.06, iron, { metal: 0.4 }); b.bar([x, 0.62, 0.28], [x, 0.62, -0.28], 0.05, iron, {});
    b.bar([x, 0.62, 0.28], [x, 0.7, 0.3], 0.07, iron); b.rbox(0.07, 0.07, 0.55, 0.02, iron, [x, 0.7, 0.0]);
  }
  b.box(1.9, 0.04, 0.04, iron, [0, 0.3, 0.1]);
  // sitting newspaper + coffee cup
  b.box(0.35, 0.02, 0.28, 0xf4f1e6, [0.4, 0.55, 0.0], { r: [0, 0.4, 0] }); b.cyl(0.05, 0.04, 0.12, 8, 0xf4f4ee, [-0.5, 0.6, 0.05]); b.cyl(0.052, 0.052, 0.04, 8, 0xd9392f, [-0.5, 0.64, 0.05]);
  const birds = [];
  if (pigeons) for (let i = 0; i < 3; i++) {
    const p = new THREE.Group(), pb = new Batch(); const c = [0x8a909a, 0xa5abb5, 0x6a7380][i];
    pb.sph(0.09, c, [0, 0.14, 0], { w: 8, h: 6 }); b.sph(0.0001, c, [0, -9, 0]); pb.sph(0.055, shade(c, 0.8), [0, 0.22, 0.09], { w: 7, h: 5 }); pb.cone(0.018, 0.05, 5, 0xf0b040, [0, 0.21, 0.17], { r: [Math.PI / 2, 0, 0] }); pb.box(0.1, 0.03, 0.14, shade(c, 0.9), [0, 0.15, -0.1], { r: [-0.3, 0, 0] });
    pb.cyl(0.005, 0.005, 0.08, 4, 0xe08a8a, [-0.03, 0.04, 0]); pb.cyl(0.005, 0.005, 0.08, 4, 0xe08a8a, [0.03, 0.04, 0]);
    pb.build(p); p.position.set(-1.1 + i * 0.9 * (i > 1 ? 1.4 : 1), 0, 0.9 + i * 0.45); p.rotation.y = rnd() * TAU; g.add(p); birds.push({ p, ph: rnd() * TAU, r: p.rotation.y });
  }
  A.on((t) => { birds.forEach((b2, i) => { const k = fract(t * 0.6 + b2.ph); const peck = Math.max(0, Math.sin(k * TAU * 2)) * (k < 0.5 ? 1 : 0); b2.p.rotation.x = peck * 0.5; b2.p.position.y = 0; const hop = Math.max(0, Math.sin((t * 0.35 + b2.ph) * TAU)) ** 8; b2.p.position.y = hop * 0.18; b2.p.rotation.y = b2.r + Math.sin(t * 0.7 + b2.ph) * 0.4; }); });
  return done(S, 1.25, 2.0, 'bench');
}

// ---------------------------------------------------------------- fire hydrant (spray = true: water arcs out of the side nozzle)
export function hydrant({ color = 0xd9392f, spray = false } = {}) {
  const S = grp('hydrant'), { g, A, b } = S;
  b.cyl(0.2, 0.22, 0.12, 12, 0x59616d, [0, 0.06, 0], { metal: 0.4 }); b.cyl(0.16, 0.18, 0.55, 12, color, [0, 0.4, 0], { rough: 0.4, metal: 0.2 }); b.cyl(0.18, 0.18, 0.06, 12, shade(color, 0.8), [0, 0.7, 0]);
  b.sph(0.17, color, [0, 0.76, 0], { h: 5, w: 12, rough: 0.4 }); b.sph(0.06, 0xe8e8ea, [0, 0.95, 0], { w: 8, h: 6, metal: 0.6 }); b.cyl(0.07, 0.07, 0.05, 8, 0x8a909a, [0, 0.93, 0]);
  for (const s of [-1, 1]) { b.cyl(0.08, 0.08, 0.2, 10, color, [s * 0.2, 0.46, 0], { r: [0, 0, Math.PI / 2] }); b.cyl(0.095, 0.095, 0.06, 10, 0xc9a24a, [s * 0.32, 0.46, 0], { r: [0, 0, Math.PI / 2], metal: 0.6 }); }
  b.cyl(0.1, 0.1, 0.18, 10, color, [0, 0.46, 0.2], { r: [Math.PI / 2, 0, 0] }); b.cyl(0.125, 0.125, 0.07, 10, 0xc9a24a, [0, 0.46, 0.32], { r: [Math.PI / 2, 0, 0], metal: 0.6 });
  b.bar([0.3, 0.44, 0.0], [0.17, 0.62, 0.1], 0.015, 0x8a909a);
  const N = 40; let spr = null, sp2 = null;
  if (spray) {
    spr = new THREE.InstancedMesh(gSph(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.2, transparent: true, opacity: 0.8 }), N); spr.frustumCulled = false; spr.castShadow = false; g.add(spr);
    const pud = new THREE.Mesh(gCyl(1.6, 1.6, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0x78b8e8, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.75 })); pud.position.set(0, 0.03, 2.4); pud.scale.set(1, 1, 1.5); g.add(pud);
  }
  A.on((t) => { if (!spr) return; for (let i = 0; i < N; i++) { const p = fract(t * 0.9 + i / N), v = 4.2, a = 0.9, tt = p * 0.95; const z = 0.36 + v * Math.cos(0.5) * tt * 1.3, y = 0.46 + v * Math.sin(0.5) * tt * 1.3 - 4.9 * tt * tt * 0.95 * 1.1; _o.position.set(Math.sin(i * 12.9) * 0.05 * tt, Math.max(0.03, y), z); _o.scale.setScalar(0.05 + 0.03 * Math.sin(i * 4.3)); _o.rotation.set(0, 0, 0); _o.updateMatrix(); spr.setMatrixAt(i, _o.matrix); } spr.instanceMatrix.needsUpdate = true; });
  return done(S, 0.95, 0.75, 'hydrant');
}

// ---------------------------------------------------------------- bus stop shelter with arrival board
export function busStop({ route = '42', seed = 3 } = {}) {
  const S = grp('busStop'), { g, A, b } = S, rnd = rng(seed), W = 3.6, D = 1.5, Hh = 2.7, frame = 0x2f3744;
  b.box(W + 0.6, 0.12, D + 0.5, 0xc9c5ba, [0, 0.06, 0], { rough: 0.9 });
  for (const x of [-W / 2, W / 2]) { b.box(0.1, Hh, 0.1, frame, [x, Hh / 2 + 0.1, D / 2], { metal: 0.4 }); b.box(0.1, Hh, 0.1, frame, [x, Hh / 2 + 0.1, -D / 2], { metal: 0.4 }); }
  b.box(W + 0.5, 0.1, D + 0.5, frame, [0, Hh + 0.15, 0], { metal: 0.3 }); b.box(W + 0.5, 0.18, 0.1, 0xd9392f, [0, Hh + 0.3, D / 2 + 0.25]);
  const gm = new THREE.MeshStandardMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.2, depthWrite: false });
  for (const [w, h, p, r] of [[W, Hh - 0.4, [0, Hh / 2 + 0.3, -D / 2], 0], [D, Hh - 0.4, [-W / 2, Hh / 2 + 0.3, 0], Math.PI / 2], [D - 0.6, Hh - 0.4, [W / 2, Hh / 2 + 0.3, 0.3], Math.PI / 2]]) { const gp = new THREE.Mesh(gPlane(w, h), gm); gp.position.set(...p); gp.rotation.y = r; g.add(gp); }
  b.box(W, 0.06, 0.1, frame, [0, 0.45, -D / 2]); b.box(W - 0.1, 0.05, 0.06, frame, [0, 1.0, -D / 2 + 0.0]);
  // bench inside + route pole + ad light-box + arrival board
  for (let i = 0; i < 3; i++) b.rbox(2.2, 0.05, 0.12, 0.02, 0x7a8696, [0, 0.55, -D / 2 + 0.2 + i * 0.14], {}); b.box(0.06, 0.45, 0.3, frame, [-1.0, 0.33, -D / 2 + 0.3]); b.box(0.06, 0.45, 0.3, frame, [1.0, 0.33, -D / 2 + 0.3]);
  b.box(1.1, 1.8, 0.14, 0x20232b, [W / 2 + 0.2 + 0.0, 1.2, -0.2 + 0.0], { }); b.box(0.04, 0.04, 0.04, 0, [0, -9, 0]);
  const ad = signMesh('FRESH PIZZA\n', 0.98, 1.65, { bg: '#f6c235', fg: '#d9392f', lines: [{ text: 'PIZZA', y: 0.3, size: 0.3, color: '#d9392f' }, { text: 'SLICE', y: 0.5, size: 0.3, color: '#2a2a2a' }, { text: '$2', y: 0.74, size: 0.55, color: '#d9392f' }], radius: 0.06, double: true }); ad.position.set(W / 2 + 0.2, 1.2, -0.2 + 0.08); g.add(ad); const adb = signMesh('x', 0.98, 1.65, { bg: '#2f6fd6', lines: [{ text: 'RIDE', y: 0.3, size: 0.32, color: '#ffffff' }, { text: 'GREEN', y: 0.55, size: 0.3, color: '#7dff9a' }, { text: 'BIKE', y: 0.78, size: 0.3, color: '#ffffff' }], radius: 0.06 }); adb.position.set(W / 2 + 0.2, 1.2, -0.2 - 0.075); adb.rotation.y = Math.PI; g.add(adb);
  const board = [3, 2, 1, 0].map((m, i) => { const bs = signMesh('', 1.5, 0.42, { bg: '#0a0a0a', lines: [{ text: route + '  DOWNTOWN   ' + (m ? m + ' MIN' : 'DUE'), y: 0.52, size: 0.55, color: '#ffb020' }], radius: 0.1 }); bs.position.set(0, Hh - 0.05, -D / 2 + 0.07); g.add(bs); bs.visible = i === 0; return bs; });
  b.box(1.6, 0.52, 0.08, 0x20232b, [0, Hh - 0.05, -D / 2 + 0.03]);
  // route pole with flag sign
  b.cyl(0.05, 0.05, 3.2, 8, 0x8a909a, [-W / 2 - 1.2, 1.6, 0.6], { metal: 0.5 }); const rs = signMesh(route, 0.55, 0.55, { bg: '#2f6fd6', fg: '#ffffff', border: '#ffffff', double: true }); rs.position.set(-W / 2 - 1.2, 3.0, 0.6); g.add(rs); const bsg = signMesh('BUS STOP', 0.8, 0.28, { bg: '#ffffff', fg: '#1d2b5c', double: true }); bsg.position.set(-W / 2 - 1.2, 2.55, 0.6); g.add(bsg);
  // two waiting commuters (low poly) that shift their weight
  const ppl = [];
  [[-0.5, 0xd9392f, 0xf2b98f, 0x2b3a6a], [0.6, 0x2fa66a, 0x9b6338, 0x3a3f4a]].forEach(([x, sh, sk, pa], i) => { const pg = new THREE.Group(), pbb = new Batch(); pbb.cyl(0.22, 0.2, 0.62, 10, sh, [0, 1.25, 0]); pbb.sph(0.2, sk, [0, 1.7, 0], { w: 10, h: 8 }); pbb.cyl(0.1, 0.1, 0.78, 8, pa, [-0.1, 0.5, 0]); pbb.cyl(0.1, 0.1, 0.78, 8, pa, [0.1, 0.5, 0]); pbb.box(0.1, 0.06, 0.22, 0x20232b, [-0.1, 0.07, 0.05]); pbb.box(0.1, 0.06, 0.22, 0x20232b, [0.1, 0.07, 0.05]); pbb.cyl(0.05, 0.05, 0.55, 6, sh, [-0.26, 1.2, 0]); pbb.cyl(0.05, 0.05, 0.55, 6, sh, [0.26, 1.2, 0]); if (i) pbb.box(0.3, 0.3, 0.1, 0x2a2d36, [0.0, 1.25, 0.22]); pbb.build(pg); pg.position.set(x, 0.12, 0.2); pg.rotation.y = i ? -0.3 : 0.4; g.add(pg); ppl.push(pg); });
  A.on((t) => { const k = Math.floor(t / 3) % 4; board.forEach((s, i) => (s.visible = i === k)); ppl.forEach((p, i) => { p.rotation.z = Math.sin(t * 1.1 + i * 2) * 0.03; p.position.y = 0.12 + Math.abs(Math.sin(t * 2.2 + i)) * 0.01; p.children.forEach((m) => { }); }); const f = 0.92 + 0.08 * Math.sin(t * 12); ad.children[0].material.color.setScalar(f); });
  return done(S, 3.55, W + 3, 'busStop');
}

// ---------------------------------------------------------------- US-style mailbox, flag pops up and down
export function mailbox({ color = 0x2f6fd6 } = {}) {
  const S = grp('mailbox'), { g, A, b } = S;
  b.box(0.7, 0.14, 0.55, 0x3a3f4a, [0, 0.07, 0], { metal: 0.3 }); b.rbox(0.62, 0.82, 0.5, 0.1, color, [0, 0.55, 0], { rough: 0.35, metal: 0.3 });
  b.cyl(0.31, 0.31, 0.5, 14, color, [0, 0.96, 0], { r: [Math.PI / 2, 0, 0], rough: 0.35, metal: 0.3 });
  b.box(0.5, 0.16, 0.04, 0x15161c, [0, 0.82, 0.255]); b.box(0.4, 0.05, 0.08, 0x15161c, [0, 0.71, 0.27]); b.box(0.42, 0.12, 0.02, 0xdfe3ea, [0, 0.45, 0.255], { metal: 0.5 });
  b.cyl(0.2, 0.2, 0.05, 12, 0xd9392f, [0, 1.22, 0], { r: [0, 0, 0] });
  const sg = signMesh('US MAIL', 0.46, 0.12, { bg: null, fg: '#ffffff', weight: 400 }); sg.position.set(0, 0.99, 0.31); sg.rotation.x = -0.52; g.add(sg);
  const fl = new THREE.Group(); fl.position.set(0.34, 0.95, 0); const fb = new Batch(); fb.box(0.03, 0.34, 0.03, 0xd9392f, [0, 0.17, 0]); fb.box(0.03, 0.12, 0.2, 0xd9392f, [0, 0.28, 0.1]); fb.build(fl); g.add(fl);
  // a letter flying in
  const letter = new THREE.Mesh(gBox(0.2, 0.01, 0.14), mat(0xffffff)); g.add(letter);
  A.on((t) => { const u = fract(t / 10); fl.rotation.z = -(u > 0.3 && u < 0.8 ? 1.4 : 0) * 1.0; const l = u < 0.3 ? u / 0.3 : 0; letter.visible = u < 0.3; letter.position.set(0.05 - l * 0.05, 1.5 - l * 0.55 + Math.sin(l * 9) * 0.05, 0.9 - l * 0.6); letter.rotation.set(0.6 * l, l * 4, 0.3); });
  return done(S, 1.45, 0.75, 'mailbox');
}

// ---------------------------------------------------------------- trash cans (steel litter bin, wheelie bin, dumpster) + a plastic bag blowing about
export function trashBins({ seed = 4 } = {}) {
  const S = grp('trashBins'), { g, A, b } = S, rnd = rng(seed);
  // steel litter bin
  b.cyl(0.3, 0.26, 0.86, 14, 0x3a4452, [-1.4, 0.5, 0], { metal: 0.5, rough: 0.4 }); b.cyl(0.33, 0.33, 0.07, 14, 0x20262e, [-1.4, 0.96, 0]); b.cyl(0.18, 0.18, 0.08, 10, 0x151515, [-1.4, 1.0, 0.0]);
  for (let i = 0; i < 6; i++) b.box(0.025, 0.5, 0.01, 0x20262e, [-1.4 + Math.cos(i * 1.05) * 0.3, 0.5, Math.sin(i * 1.05) * 0.3], { r: [0, -i * 1.05 + Math.PI / 2, 0] });
  b.cyl(0.04, 0.04, 0.12, 6, 0xf4f1e8, [-1.4, 1.1, 0.0]); b.cyl(0.3, 0.3, 0.05, 14, 0x2f8f6a, [-1.4, 0.82, 0]);
  const sgn = signMesh('KEEP CITY CLEAN', 0.5, 0.16, { bg: '#f4f1e8', fg: '#1d6a3a', radius: 0.1 }); sgn.position.set(-1.4, 0.55, 0.31); g.add(sgn);
  // wheelie bins
  for (const [x, c] of [[-0.3, 0x2f8f6a], [0.45, 0x2f6fd6]]) { b.rbox(0.62, 0.95, 0.72, 0.1, c, [x, 0.6, 0.0], { rough: 0.5 }); b.rbox(0.66, 0.12, 0.78, 0.05, shade(c, 0.75), [x, 1.1, -0.0]); b.box(0.5, 0.06, 0.1, shade(c, 0.6), [x, 1.12, 0.38]); for (const s of [-1, 1]) b.cyl(0.11, 0.11, 0.05, 10, 0x15161c, [x + s * 0.31, 0.14, -0.3], { r: [0, 0, Math.PI / 2] }); }
  // dumpster
  const dx = 2.4;
  b.rbox(2.0, 1.2, 1.1, 0.06, 0x2f7a4a, [dx, 0.8, 0], { rough: 0.5 }); b.box(2.04, 0.1, 1.14, 0x1f5a34, [dx, 1.38, 0]); for (let i = 0; i < 5; i++) b.box(0.06, 0.9, 0.04, 0x1f5a34, [dx - 0.8 + i * 0.4, 0.75, 0.56]);
  for (const s of [-1, 1]) { b.cyl(0.08, 0.08, 0.08, 8, 0x15161c, [dx + s * 0.85, 0.12, 0.45], { r: [0, 0, Math.PI / 2] }); b.cyl(0.08, 0.08, 0.08, 8, 0x15161c, [dx + s * 0.85, 0.12, -0.45], { r: [0, 0, Math.PI / 2] }); }
  const lid = new THREE.Group(); lid.position.set(dx, 1.43, -0.52); const lb = new Batch(); lb.rbox(2.0, 0.07, 0.5, 0.03, 0x2f7a4a, [0, 0.03, 0.26]); lb.build(lid); g.add(lid);
  const junk = []; for (let i = 0; i < 6; i++) { b.sph(0.18 + (i % 3) * 0.05, [0xd9392f, 0xf4f1e8, 0x59626f, 0xf6c235][i % 4], [dx - 0.6 + (i % 4) * 0.4, 1.35, 0.15 * (i % 2 ? 1 : -1)], { w: 6, h: 5 }); }
  // bag + can rolling along the pavement
  const bag = new THREE.Mesh(gSph(0.14, 8, 6), mat(0xf4f1e6, { rough: 0.9 })); bag.scale.set(1, 0.8, 1.3); g.add(bag);
  const can = new THREE.Mesh(gCyl(0.03, 0.03, 0.12, 8), mat(0xd9392f, { metal: 0.5 })); can.rotation.z = Math.PI / 2; g.add(can);
  A.on((t) => { lid.rotation.x = -(0.05 + 0.04 * Math.max(0, Math.sin(t * 0.5)) ** 6 * 6); const u = fract(t / 12); bag.position.set(-3 + u * 8.5, 0.14 + Math.abs(Math.sin(u * 40)) * 0.2, 1.4 + Math.sin(u * 9) * 0.3); bag.rotation.set(u * 14, u * 20, 0); bag.scale.set(1 + 0.2 * Math.sin(u * 60), 0.8, 1.3); const v = fract(t / 16 + 0.5); can.position.set(-3 + v * 8.5, 0.05, 2.0); can.rotation.x = v * 60; });
  return done(S, 1.5, 5.8, 'trashBins');
}

// ---------------------------------------------------------------- newspaper vending boxes with a loose page tumbling
export function newsBox({ seed = 5 } = {}) {
  const S = grp('newsBox'), { g, A, b } = S;
  const defs = [[0xd9392f, 'DAILY NEWS', '#d9392f'], [0x2f6fd6, 'THE TIMES', '#2f6fd6'], [0xf6c235, 'FREE PRESS', '#f6c235']];
  defs.forEach(([c, name, hex], i) => {
    const x = (i - 1) * 0.85;
    b.rbox(0.6, 0.12, 0.55, 0.04, 0x3a3f4a, [x, 0.06, 0], { metal: 0.3 }); b.cyl(0.04, 0.04, 0.6, 8, 0x3a3f4a, [x, 0.4, -0.2]); b.cyl(0.04, 0.04, 0.6, 8, 0x3a3f4a, [x, 0.4, 0.2]);
    b.rbox(0.56, 0.62, 0.5, 0.05, c, [x, 0.95, 0], { rough: 0.4, metal: 0.2 }); b.rbox(0.6, 0.1, 0.54, 0.04, shade(c, 0.7), [x, 1.3, 0]);
    b.box(0.42, 0.22, 0.04, 0x15161c, [x, 1.05, 0.26]); b.box(0.38, 0.18, 0.02, 0xf4f1e6, [x, 1.05, 0.285]); b.box(0.5, 0.2, 0.03, 0x8a909a, [x, 0.7, 0.27], { metal: 0.6 }); b.box(0.16, 0.05, 0.04, 0x2a2d36, [x, 0.7, 0.3]); b.sph(0.03, 0xf6c235, [x + 0.15, 0.62, 0.3], { metal: 0.5 });
    const s = signMesh(name, 0.46, 0.14, { bg: null, fg: '#ffffff', weight: 400, fit: 0.9 }); s.position.set(x, 1.24, 0.275); g.add(s);
    const hl = signMesh('', 0.36, 0.16, { bg: '#f4f1e6', lines: [{ text: 'BIG STORM', y: 0.35, size: 0.42, color: '#1a1a1a' }, { text: 'HITS TOWN', y: 0.75, size: 0.36, color: '#555' }], radius: 0.02, basic: true }); hl.position.set(x, 1.05, 0.296); g.add(hl);
  });
  const page = flag(0.5, 0.36, [0xf4f1e6, 0xe8e4d8, 0xf4f1e6], { seg: 6 }); g.add(page);
  A.on((t) => { const u = fract(t / 9); page.position.set(-2.2 + u * 5.0, 0.1 + Math.abs(Math.sin(u * 22)) * 0.55, 1.0 + Math.sin(u * 5) * 0.4); page.rotation.set(-0.6 + Math.sin(u * 18) * 0.5, u * 9, Math.sin(u * 11) * 0.8); page.userData.update(t * 3); });
  return done(S, 1.4, 3.0, 'newsBox');
}

// ---------------------------------------------------------------- billboard on twin posts: three ads wipe in and out; catwalk lights
export function billboard({ w = 12, h = 4.5, seed = 6 } = {}) {
  const S = grp('billboard'), { g, A, b } = S, postH = 9, ph = postH;
  for (const s of [-1, 1]) { b.cyl(0.28, 0.34, postH, 10, 0x59616d, [s * w * 0.3, postH / 2, 0], { metal: 0.4 }); b.box(0.8, 0.3, 0.8, 0x3a4452, [s * w * 0.3, 0.15, 0]); }
  b.box(w + 0.6, h + 0.6, 0.5, 0x2a2d36, [0, ph + h / 2 + 0.2, 0]); b.box(w + 0.9, 0.2, 0.7, 0x59616d, [0, ph + h + 0.6, 0]);
  b.box(w + 0.6, 0.12, 1.4, 0x8a909a, [0, ph - 0.1, 0.8], { metal: 0.4 }); for (let i = 0; i <= 8; i++) b.box(0.05, 1.0, 0.05, 0x8a909a, [-w / 2 - 0.2 + i * (w + 0.4) / 8, ph + 0.4, 1.45]); b.box(w + 0.6, 0.05, 0.05, 0x8a909a, [0, ph + 0.9, 1.45]);
  for (let i = 0; i < 5; i++) { const x = -w / 2 + 1.2 + i * (w - 2.4) / 4; b.bar([x, ph + h + 0.6, 0.2], [x, ph + h + 0.7, 1.2], 0.04, 0x59616d); b.box(0.3, 0.2, 0.3, 0xfff6d8, [x, ph + h + 0.8, 1.35], { glow: true }); }
  b.bar([w * 0.3 + 0.0, 0.5, 0.35], [w * 0.3, ph - 0.1, 0.35], 0.05, 0x8a909a); for (let i = 0; i < 12; i++) b.box(0.4, 0.04, 0.04, 0x8a909a, [w * 0.3 - 0.0, 0.8 + i * 0.7, 0.35]);
  const ads = [
    ['', '#f6c235', [{ text: 'SUNNY SODA', y: 0.4, size: 0.34, color: '#d9392f' }, { text: 'TASTES LIKE SUMMER', y: 0.75, size: 0.17, color: '#2a2a2a' }]],
    ['', '#1d2b5c', [{ text: 'FLY CLOUD AIR', y: 0.4, size: 0.3, color: '#ffffff' }, { text: 'NOW TO 90 CITIES', y: 0.75, size: 0.16, color: '#79e6ff' }]],
    ['', '#d9392f', [{ text: 'PIZZA PLANET', y: 0.4, size: 0.32, color: '#ffffff' }, { text: '2 FOR 1 TONIGHT', y: 0.75, size: 0.17, color: '#ffd23f' }]],
  ].map(([t, bg, lines]) => { const s = signMesh(t, w, h, { bg, lines, radius: 0.02, border: '#ffffff' }); s.position.set(0, ph + h / 2 + 0.2, 0.28); g.add(s); return s; });
  A.on((t) => { const T = 7, k = Math.floor(t / T) % 3, u = (t % T) / T, wipe = u < 0.12 ? smooth(u / 0.12) : u > 0.88 ? 1 - smooth((u - 0.88) / 0.12) : 1; ads.forEach((s, i) => { s.visible = i === k && wipe > 0.02; s.scale.x = Math.max(0.01, wipe); }); });
  return done(S, ph + h + 1.2, w + 1, 'billboard');
}

// ---------------------------------------------------------------- crosswalk: zebra, stop lines, flashing in-road studs
export function crosswalk({ length = 12, stripes = 9, studs = true } = {}) {
  const S = grp('crosswalk'), { g, A, b } = S;
  b.box(length + 6, 0.06, 8, 0x3a3d47, [0, 0.03, 0], { rough: 0.95 });
  for (let i = 0; i < stripes; i++) b.box(length / stripes * 0.55, 0.012, 3.4, 0xf4f4ee, [-length / 2 + (i + 0.5) * length / stripes, 0.07, 0]);
  b.box(length + 4, 0.012, 0.4, 0xf4f4ee, [0, 0.07, 3.2]); b.box(length + 4, 0.012, 0.4, 0xf4f4ee, [0, 0.07, -3.2]);
  for (let i = 0; i < 9; i++) { b.box(1.4, 0.012, 0.14, 0xf6c235, [-length / 2 - 2.6 + i * 3.2, 0.07, 3.9 * (i % 2 ? -1 : 1) * 0]); }
  b.box(length + 6, 0.14, 1.2, 0xc9c5ba, [0, 0.07, 4.6], { rough: 0.9 }); b.box(length + 6, 0.14, 1.2, 0xc9c5ba, [0, 0.07, -4.6], { rough: 0.9 });
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) b.box(0.7, 0.04, 0.7, 0xf6c235, [-length / 2 - 1 + i * 0.9 * 0 + (i % 3) * 0.75 + 0.0, 0.16, s * 4.2]);
  b.cyl(0.05, 0.05, 2.6, 8, 0x8a909a, [-length / 2 - 0.8, 1.3, 3.8]); const ps = signMesh('', 0.6, 0.6, { bg: '#d9e84a', lines: [{ text: 'WALK', y: 0.5, size: 0.28, color: '#1a1a1a' }], border: '#1a1a1a', radius: 0.06, double: true }); ps.position.set(-length / 2 - 0.8, 2.5, 3.8); g.add(ps);
  const st = []; if (studs) for (let i = 0; i < 12; i++) for (const z of [-3.4, 3.4]) { const m = lampMesh(gCyl(0.1, 0.1, 0.04, 10), 0xffa020, 0.2); m.position.set(-length / 2 + 0.3 + i * (length - 0.6) / 11, 0.09, z); g.add(m); st.push({ m, i }); }
  A.on((t) => { const ph = Math.floor(t * 8) % 12; st.forEach(({ m, i }) => m.material.userData.set(((i - ph + 12) % 12) < 3 ? 1.6 : 0.2)); });
  return done(S, 2.8, length + 6, 'crosswalk');
}

// ---------------------------------------------------------------- manhole with a striped steam stack and rising steam
export function manholeSteam({ stack = true } = {}) {
  const S = grp('manholeSteam'), { g, A, b } = S;
  b.cyl(0.62, 0.62, 0.05, 28, 0x3a3f4a, [0, 0.025, 0], { metal: 0.4 }); for (let i = 0; i < 4; i++) b.add(new THREE.TorusGeometry(0.15 + i * 0.13, 0.012, 4, 24), 0x20232b, { p: [0, 0.055, 0], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 8; i++) b.box(0.04, 0.012, 0.5, 0x20232b, [0, 0.058, 0], { r: [0, i * Math.PI / 8, 0] });
  if (stack) { b.cyl(0.32, 0.42, 1.6, 14, 0xe8e8ea, [1.4, 0.8, 0.0]); for (let i = 0; i < 4; i++) b.cyl(0.355 - (i * 0.02), 0.355 - (i * 0.02), 0.26, 14, 0xf08a2b, [1.4, 0.2 + i * 0.4, 0]); b.cyl(0.28, 0.3, 0.1, 14, 0x3a3f4a, [1.4, 1.65, 0]); b.cyl(0.45, 0.45, 0.1, 14, 0x59616d, [1.4, 0.05, 0]); }
  const s1 = plume({ n: 12, rise: 3.5, r0: 0.18, r1: 0.9, period: 4, drift: [0.6, 0, 0.3], color: 0xf2f4f8, seed: 3, spread: 0.3, opacity: 0.72 }); s1.position.set(0, 0.1, 0); g.add(s1); A.on(s1.userData.update);
  if (stack) { const s2 = plume({ n: 14, rise: 7, r0: 0.3, r1: 1.4, period: 6, drift: [1.4, 0, 0.5], color: 0xf2f4f8, seed: 9, spread: 0.25, opacity: 0.72 }); s2.position.set(1.4, 1.7, 0); g.add(s2); A.on(s2.userData.update); }
  return done(S, stack ? 9.0 : 3.6, 3, 'manholeSteam');
}

// ---------------------------------------------------------------- roadworks: cones, barriers, flasher, warning sign, trench with a vibrating jackhammer
export function roadworks({ seed = 7 } = {}) {
  const S = grp('roadworks'), { g, A, b } = S, rnd = rng(seed);
  b.box(5.4, 0.05, 3.4, 0x2a2d36, [0, 0.025, 0], { rough: 1 }); b.box(3.2, 0.06, 1.2, 0x1a1c22, [0, 0.03, 0.1]); b.box(3.0, 0.02, 1.0, 0x5a4636, [0, 0.07, 0.1], { rough: 1 }); for (let i = 0; i < 5; i++) b.sph(0.3 + i * 0.02, 0x7a6244, [-1.9 + i * 0.5, 0.15, -1.0 + (i % 2) * 0.1], { w: 7, h: 5 });
  b.box(2.6, 0.05, 0.9, 0x8a909a, [1.7, 0.1, 1.5], { metal: 0.6 });
  // cones
  const cones = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const x = Math.cos(a) * 3.2, z = Math.sin(a) * 2.2; cones.push({ p: [x, 0.35, z], c: 0xf08a2b }); }
  for (const c of cones) { b.cone(0.17, 0.7, 12, 0xf2602a, c.p); b.box(0.42, 0.04, 0.42, 0x20232b, [c.p[0], 0.02, c.p[2]]); b.cyl(0.115, 0.13, 0.09, 12, 0xf4f4ee, [c.p[0], 0.4, c.p[2]], { glow: false }); b.cyl(0.07, 0.085, 0.06, 12, 0xf4f4ee, [c.p[0], 0.55, c.p[2]]); }
  // barriers (striped boards on legs)
  for (const [x, z, ry] of [[-2.2, 1.6, 0], [0.4, 1.9, 0], [3.0, 1.0, Math.PI / 2 * 0.3]]) { const bg = new THREE.Group(), bb = new Batch(); for (let i = 0; i < 6; i++) bb.box(0.34, 0.2, 0.04, i % 2 ? 0xf4f4ee : 0xd9392f, [-0.85 + i * 0.34, 0.95, 0], {}); for (let i = 0; i < 6; i++) bb.box(0.34, 0.2, 0.04, i % 2 ? 0xd9392f : 0xf4f4ee, [-0.85 + i * 0.34, 0.7, 0], {}); for (const s of [-1, 1]) { bb.bar([s * 0.8, 0.0, 0.0], [s * 0.8, 1.1, 0.0], 0.05, 0x8a909a); bb.bar([s * 0.8, 0.0, -0.25], [s * 0.8, 0.0, 0.25], 0.04, 0x8a909a); } bb.build(bg); bg.position.set(x, 0, z); bg.rotation.y = ry; g.add(bg); }
  // warning sign
  b.cyl(0.04, 0.04, 2.2, 8, 0x59616d, [-3.6, 1.1, -0.5]); const diamond = new THREE.Group(); const ds = signMesh('ROAD WORK', 1.0, 1.0, { bg: '#f08a2b', lines: [{ text: 'ROAD', y: 0.4, size: 0.26, color: '#1a1a1a' }, { text: 'WORK', y: 0.66, size: 0.26, color: '#1a1a1a' }], border: '#1a1a1a', radius: 0.05, double: true }); ds.rotation.z = Math.PI / 4; diamond.add(ds); diamond.position.set(-3.6, 2.4, -0.5); g.add(diamond);
  // flasher lamp on a barrier
  b.cyl(0.03, 0.03, 0.5, 6, 0x59616d, [2.3, 1.35, 1.0 * 0]); const fl = lampMesh(gSph(0.16, 10, 8), 0xffa020, 0.2); fl.position.set(2.3, 1.7, 0); g.add(fl); const fh = halo(0xffa020, 0.5, 0); fh.position.copy(fl.position); g.add(fh);
  b.box(0.5, 0.4, 0.3, 0x20232b, [2.3, 1.1, 0], {}); b.bar([2.3, 0.0, 0], [2.3, 1.0, 0], 0.05, 0x59616d);
  // worker + jackhammer
  const wk = new THREE.Group(), wb = new Batch(); wb.cyl(0.24, 0.22, 0.75, 10, 0xf6c235, [0, 1.15, 0]); wb.sph(0.22, 0xd99a6c, [0, 1.75, 0], { w: 10, h: 8 }); wb.add(new THREE.SphereGeometry(0.25, 10, 6, 0, TAU, 0, Math.PI * 0.55), 0xf6c235, { p: [0, 1.8, 0] }); wb.cyl(0.115, 0.1, 0.75, 8, 0x2b3a6a, [-0.12, 0.45, 0]); wb.cyl(0.115, 0.1, 0.75, 8, 0x2b3a6a, [0.12, 0.45, 0]); wb.box(0.13, 0.08, 0.26, 0x20232b, [-0.12, 0.04, 0.04]); wb.box(0.13, 0.08, 0.26, 0x20232b, [0.12, 0.04, 0.04]);
  wb.bar([-0.28, 1.35, 0.0], [-0.22, 0.95, 0.4], 0.09, 0xf6c235); wb.bar([0.28, 1.35, 0.0], [0.22, 0.95, 0.4], 0.09, 0xf6c235); wb.build(wk); wk.position.set(0.0, 0, -0.2); wk.rotation.y = 0; g.add(wk);
  const jh = new THREE.Group(), jb = new Batch(); jb.cyl(0.06, 0.06, 1.0, 8, 0x59616d, [0, 0.5, 0], { metal: 0.5 }); jb.rbox(0.2, 0.3, 0.2, 0.05, 0xf6c235, [0, 1.0, 0]); jb.box(0.4, 0.06, 0.06, 0x20232b, [0, 1.2, 0]); jb.cyl(0.02, 0.02, 0.3, 6, 0xc9ced6, [0, -0.1, 0], { metal: 0.6 }); jb.build(jh); jh.position.set(0.0, 0.07, 0.4); g.add(jh);
  const dust = plume({ n: 8, rise: 1.4, r0: 0.08, r1: 0.4, period: 1.6, drift: [0.2, 0, 0.1], color: 0xb09a7a, seed: 5, spread: 0.6, opacity: 0.8 }); dust.position.set(0, 0.2, 0.45); g.add(dust); A.on(dust.userData.update);
  A.on((t) => { jh.position.y = 0.07 + Math.abs(Math.sin(t * 38)) * 0.04; jh.rotation.z = Math.sin(t * 53) * 0.012; wk.position.y = Math.sin(t * 38) * 0.012; wk.rotation.z = Math.sin(t * 29) * 0.012; const k = fract(t * 1.4) < 0.5 ? 1 : 0; fl.material.userData.set(0.2 + 1.5 * k); fh.material.opacity = 0.5 * k; fh.visible = !!k; diamond.rotation.z = Math.sin(t * 0.8) * 0.02; });
  return done(S, 3.0, 8.5, 'roadworks');
}

// ---------------------------------------------------------------- tubular scaffolding on a facade, with netting, planks and a hoist bucket
export function scaffolding({ bays = 4, levels = 6, bay = 2.5, lift = 2.0, seed = 8 } = {}) {
  const S = grp('scaffolding'), { g, A, b } = S, rnd = rng(seed), steel = 0xb4bcc8, depth = 1.2, Wd = bays * bay, Hh = levels * lift;
  const tube = (a, c, th = 0.06) => b.bar(a, c, th, steel, { round: true, metal: 0.6, rough: 0.35 });
  for (let i = 0; i <= bays; i++) for (const z of [0, depth]) { tube([i * bay - Wd / 2, 0, z], [i * bay - Wd / 2, Hh + 1.0, z]); b.box(0.3, 0.05, 0.3, 0x6a7380, [i * bay - Wd / 2, 0.03, z]); }
  for (let l = 0; l <= levels; l++) {
    const y = l * lift + 0.2;
    for (const z of [0, depth]) tube([-Wd / 2, y, z], [Wd / 2, y, z]);
    for (let i = 0; i <= bays; i++) tube([i * bay - Wd / 2, y, 0], [i * bay - Wd / 2, y, depth]);
    if (l > 0) { for (let i = 0; i < bays; i++) { b.box(bay - 0.05, 0.05, depth, 0xa07a4a, [i * bay - Wd / 2 + bay / 2, y + 0.04, depth / 2], { rough: 0.9 }); } tube([-Wd / 2, y + 0.55, depth], [Wd / 2, y + 0.55, depth], 0.04); tube([-Wd / 2, y + 1.0, depth], [Wd / 2, y + 1.0, depth], 0.04); }
    if (l < levels) for (let i = 0; i < bays; i++) tube([i * bay - Wd / 2, y, depth], [(i + 1) * bay - Wd / 2, y + lift, depth], 0.04);
  }
  for (let l = 0; l < levels; l++) { const x = -Wd / 2 + bay * 0.5 + 0.3; tube([x, l * lift + 0.2, 0.3], [x + 0.2, (l + 1) * lift + 0.2, 0.3], 0.04); for (let k = 0; k < 6; k++) b.box(0.4, 0.03, 0.03, steel, [x + 0.1 * k / 6, l * lift + 0.5 + k * 0.3, 0.3]); }
  // green netting (translucent), a flapping banner, bricks stacked on level 2
  const net = new THREE.Mesh(gPlane(Wd, Hh - lift), new THREE.MeshStandardMaterial({ color: 0x3aa04a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, roughness: 1, depthWrite: false })); net.position.set(0, lift + (Hh - lift) / 2 + 0.2, depth + 0.05); g.add(net);
  for (let i = 0; i < 3; i++) b.box(0.8, 0.3, 0.5, 0xb5573f, [-Wd / 2 + 1.0 + i * 0.9, 2 * lift + 0.4 + 0.0, 0.6], {});
  const ban = flag(Wd * 0.5, 0.8, [0xf6c235, 0xf6c235], { seg: 10 }); ban.position.set(-Wd * 0.25 + 0.0, Hh * 0.5 + 0.0, depth + 0.1); g.add(ban);
  const bs = signMesh('BUILD IT RIGHT CO.', Wd * 0.5 - 0.1, 0.7, { bg: null, fg: '#1a1a1a', weight: 400 }); bs.position.set(0.0, Hh * 0.5, depth + 0.14); bs.position.x = 0; g.add(bs); ban.position.x = -Wd * 0.25;
  // hoist with a bucket that rides up and down + tiny worker on the top lift
  const hx = Wd / 2 - 0.2, hz = depth + 0.5; tube([hx, 0, hz], [hx, Hh + 1.2, hz], 0.08); tube([hx + 0.5, 0, hz], [hx + 0.5, Hh + 1.2, hz], 0.08); for (let i = 0; i < Hh / 0.5; i++) b.bar([hx, i * 0.5, hz], [hx + 0.5, i * 0.5 + 0.5, hz], 0.03, steel);
  b.box(0.9, 0.5, 0.5, 0x59616d, [hx + 0.25, Hh + 1.5, hz]);
  const bucket = new THREE.Group(), bk = new Batch(); bk.box(0.55, 0.35, 0.5, 0xf6c235, [0, 0, 0]); bk.box(0.5, 0.02, 0.45, 0x8a909a, [0, 0.18, 0]); for (let i = 0; i < 3; i++) bk.box(0.12, 0.12, 0.12, 0xb5573f, [-0.15 + i * 0.15, 0.25, 0]); bk.build(bucket); bucket.position.set(hx + 0.25, 1, hz); g.add(bucket);
  const rope = new THREE.Mesh(gBox(0.02, 1, 0.02), mat(0x20232b)); g.add(rope);
  b.cyl(0.3, 0.3, 0.6, 12, 0x8a909a, [hx + 0.25, Hh + 1.5, hz], { r: [0, 0, Math.PI / 2] });
  const wk = new THREE.Group(), wb = new Batch(); wb.cyl(0.2, 0.18, 0.6, 8, 0xf08a2b, [0, 1.15, 0]); wb.sph(0.17, 0xf2b98f, [0, 1.62, 0], { w: 8, h: 6 }); wb.add(new THREE.SphereGeometry(0.2, 8, 5, 0, TAU, 0, Math.PI * 0.55), 0xf6c235, { p: [0, 1.66, 0] }); wb.cyl(0.09, 0.08, 0.85, 7, 0x2b3a6a, [-0.09, 0.45, 0]); wb.cyl(0.09, 0.08, 0.85, 7, 0x2b3a6a, [0.09, 0.45, 0]); wb.build(wk); wk.position.set(-1.0, (levels - 1) * lift + 0.25, depth * 0.5); g.add(wk); const wA = new THREE.Group(); wA.position.set(-0.25, 1.3, 0); const wab = new Batch(); wab.bar([0, 0, 0], [0.1, -0.5, 0.35], 0.07, 0xf08a2b); wab.build(wA); wk.add(wA);
  A.on((t) => { const u = 0.5 - 0.5 * Math.cos(t * 0.35), y = 0.8 + u * (Hh - 0.4); bucket.position.y = y; rope.scale.y = Hh + 1.5 - y; rope.position.set(hx + 0.25, (Hh + 1.5 + y) / 2, hz); net.position.z = depth + 0.05 + Math.sin(t * 1.3) * 0.02; net.scale.y = 1 + Math.sin(t * 1.3) * 0.004; wk.position.x = -1.0 + Math.sin(t * 0.4) * 1.6; wk.rotation.y = Math.cos(t * 0.4) > 0 ? Math.PI / 2 * 0.0 + 0.9 : -0.9; wA.rotation.z = Math.sin(t * 5) * 0.4; ban.userData.update(t); });
  return done(S, Hh + 2.1, Wd, 'scaffolding');
}

// ---------------------------------------------------------------- tower crane: lattice mast, rotating jib, trolley, swinging load, blinking lights
export function crane({ H = 58, jib = 50, seed = 9 } = {}) {
  const S = grp('crane'), { g, A, b } = S, yellow = 0xf6c235, steel = 0x8a909a, mw = 2.4;
  b.box(8, 1.4, 8, 0x8d8b84, [0, 0.7, 0]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(1.2, 1.4, 1.2, 0x6a7380, [sx * 3.4, 1.8, sz * 3.4]);
  const nseg = Math.floor(H / mw);
  for (let i = 0; i < nseg; i++) {
    const y0 = 1.4 + i * mw, y1 = y0 + mw, h = mw / 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.bar([sx * h, y0, sz * h], [sx * h, y1, sz * h], 0.14, yellow, {});
    for (const s of [-1, 1]) {
      b.bar([-h, y0, s * h], [h, y1, s * h], 0.07, yellow); b.bar([h, y0, s * h], [-h, y1, s * h], 0.07, yellow, {});
      b.bar([s * h, y0, -h], [s * h, y1, h], 0.07, yellow); b.bar([s * h, y0, h], [s * h, y1, -h], 0.07, yellow, {});
    }
  }
  const top = 1.4 + nseg * mw;
  b.box(3.4, 1.0, 3.4, 0x59616d, [0, top + 0.5, 0], { metal: 0.3 });
  const up = new THREE.Group(); up.position.y = top + 1.0; g.add(up); const ub = new Batch();
  // cab, slewing ring, jib (triangular lattice), counter-jib, counterweights, tower top
  ub.cyl(1.6, 1.6, 0.5, 18, 0x3a4452, [0, 0.25, 0]); ub.rbox(1.8, 1.9, 2.4, 0.15, yellow, [1.4, 1.5, 1.4], { rough: 0.4 }); ub.box(1.4, 0.7, 0.05, 0x2b3b52, [1.4, 1.7, 2.62], { rough: 0.1 }); ub.box(0.05, 0.7, 1.7, 0x2b3b52, [2.32, 1.7, 1.4], { rough: 0.1 });
  const apex = [0, 8.5, 0]; ub.bar([0, 0.5, 0], apex, 0.18, yellow); ub.bar([0, 0.5, 0], [0, 8.5, 0], 0.001, yellow);
  const JW = 1.4;
  ub.bar([0, 0.9, -JW / 2], [jib, 0.9, -JW / 2], 0.14, yellow); ub.bar([0, 0.9, JW / 2], [jib, 0.9, JW / 2], 0.14, yellow); ub.bar([0, 1.9, 0], [jib, 1.4, 0], 0.12, yellow);
  const nj = Math.floor(jib / 2.5);
  for (let i = 0; i < nj; i++) { const x0 = i * 2.5, x1 = x0 + 2.5, yh0 = 1.9 - 0.5 * x0 / jib, yh1 = 1.9 - 0.5 * x1 / jib; ub.bar([x0, 0.9, -JW / 2], [x1, yh1, 0], 0.06, yellow); ub.bar([x0, yh0, 0], [x1, 0.9, JW / 2], 0.06, yellow); ub.bar([x0, 0.9, JW / 2], [x0, yh0, 0], 0.06, yellow); ub.bar([x0, 0.9, -JW / 2], [x0, yh0, 0], 0.06, yellow); }
  const cj = 15; ub.bar([0, 0.9, -JW / 2], [-cj, 0.9, -JW / 2], 0.14, yellow); ub.bar([0, 0.9, JW / 2], [-cj, 0.9, JW / 2], 0.14, yellow); for (let i = 0; i < 6; i++) { const x0 = -i * 2.5, x1 = x0 - 2.5; ub.bar([x0, 0.9, -JW / 2], [x1, 0.9, JW / 2], 0.06, yellow); }
  for (let i = 0; i < 5; i++) ub.box(2.2, 1.6, 1.2, 0x7a7e86, [-cj + 1.8 + i * 0.4, 1.8, 0], {});
  ub.bar(apex, [jib * 0.55, 1.5, 0], 0.05, 0x2a2d36, { round: true }); ub.bar(apex, [jib * 0.97, 1.3, 0], 0.05, 0x2a2d36, { round: true }); ub.bar(apex, [-cj * 0.9, 1.0, 0], 0.05, 0x2a2d36, { round: true });
  ub.cyl(0.07, 0.07, 1.6, 6, 0xc8ccd4, [0, 9.3, 0]);
  ub.build(up);
  const beacon = lampMesh(gSph(0.3, 8, 6), 0xff3030); beacon.position.set(0, 10.2, 0); up.add(beacon); const bh = halo(0xff3030, 1.2, 0.3); bh.position.copy(beacon.position); up.add(bh);
  const tl = lampMesh(gSph(0.2, 8, 6), 0xffd23f); tl.position.set(jib + 0.2, 1.4, 0); up.add(tl); const tl2 = lampMesh(gSph(0.2, 8, 6), 0xff3030); tl2.position.set(-cj - 0.3, 1.0, 0); up.add(tl2);
  // trolley + hoist rope + hook + load
  const trolley = new THREE.Group(), tb = new Batch(); tb.box(1.4, 0.3, 1.6, 0x3a4452, [0, 0.55, 0]); tb.build(trolley); up.add(trolley);
  const rope = new THREE.Mesh(gBox(0.05, 1, 0.05), mat(0x20232b)); trolley.add(rope);
  const load = new THREE.Group(), lb = new Batch(); lb.box(0.7, 0.4, 0.5, 0xf6c235, [0, 0, 0]); lb.bar([0, 0, 0], [-0.9, -1.3, 0], 0.03, 0x2a2d36); lb.bar([0, 0, 0], [0.9, -1.3, 0], 0.03, 0x2a2d36); lb.box(3.4, 0.6, 1.1, 0x7a7e86, [0, -1.6, 0]); for (let i = 0; i < 6; i++) lb.box(0.4, 0.4, 0.4, 0xa56b3a, [-1.2 + i * 0.5, -1.2, 0]); lb.build(load); trolley.add(load);
  A.on((t) => {
    up.rotation.y = 0.9 + Math.sin(t * 0.18) * 1.3;
    const u = 0.5 - 0.5 * Math.cos(t * 0.23), tx = 12 + u * (jib - 18);
    trolley.position.set(tx, 0.0, 0); const drop = 9 + 14 * (0.5 - 0.5 * Math.cos(t * 0.31 + 1.0)); load.position.set(0, -drop, 0); load.rotation.z = Math.sin(t * 1.1) * 0.05; load.rotation.y = Math.sin(t * 0.4) * 0.2; rope.scale.y = drop; rope.position.y = -drop / 2 + 0.4;
    const k = fract(t / 1.8) < 0.2 ? 1 : 0.1; beacon.material.userData.set(k * 1.3); bh.material.opacity = 0.3 * k; tl.material.userData.set(fract(t / 1.8 + 0.5) < 0.2 ? 1.5 : 0.2); tl2.material.userData.set(fract(t / 1.8 + 0.25) < 0.2 ? 1.5 : 0.2);
  });
  return done(S, top + 10.8, jib + cj, 'crane');
}

// ---------------------------------------------------------------- utility poles with sagging, gently swaying wires and birds on them
export function powerLines({ spans = 3, span = 22, seed = 10 } = {}) {
  const S = grp('powerLines'), { g, A, b } = S, rnd = rng(seed), wood = 0x7a5a3a, ph = 11;
  const poles = []; for (let i = 0; i <= spans; i++) poles.push(i * span - (spans * span) / 2);
  poles.forEach((x, i) => {
    b.cyl(0.18, 0.28, ph, 10, wood, [x, ph / 2, 0], { rough: 0.9 }); b.box(0.2, 0.2, 3.0, wood, [x, ph - 0.7, 0]); b.box(0.16, 0.16, 2.2, wood, [x, ph - 2.2, 0]);
    for (const dz of [-1.3, 0, 1.3]) { b.cyl(0.04, 0.05, 0.26, 6, 0x8a909a, [x, ph - 0.45, dz]); b.sph(0.07, 0xd0d4da, [x, ph - 0.28, dz], { w: 6, h: 5 }); }
    b.bar([x - 0.2, ph - 1.0, 0], [x - 1.0, ph - 0.2, 1.3 * 0], 0.05, wood); b.bar([x + 0.2, ph - 1.0, 0], [x + 1.0, ph - 0.2, 0], 0.05, wood);
    for (let k = 0; k < 5; k++) b.box(0.18, 0.04, 0.04, 0x8a909a, [x + 0.19, 1.8 + k * 0.5, 0]);
    if (i % 2 === 1) { b.cyl(0.35, 0.35, 0.9, 12, 0x6a7380, [x + 0.7, ph - 2.8, 0], { metal: 0.4 }); b.cyl(0.38, 0.38, 0.06, 12, 0x3a4452, [x + 0.7, ph - 3.28, 0]); b.cyl(0.38, 0.38, 0.06, 12, 0x3a4452, [x + 0.7, ph - 2.32, 0]); }
    if (i === 0) { const rs = signMesh('DANGER HIGH VOLTAGE', 0.5, 0.36, { bg: '#f6c235', fg: '#1a1a1a', lines: [{ text: 'DANGER', y: 0.35, size: 0.28, color: '#d9262c' }, { text: 'HIGH VOLTAGE', y: 0.75, size: 0.2, color: '#1a1a1a' }], double: true, radius: 0.04 }); rs.position.set(x + 0.19, 3.5, 0); rs.rotation.y = Math.PI / 2; g.add(rs); }
  });
  // wires: instanced segments, positions recomputed from a closed-form sway
  const wires = [[-1.3, 0], [0, 0], [1.3, 0]], seg = 14, N = spans * wires.length * seg;
  const wm = new THREE.InstancedMesh(gBox(0.05, 0.05, 1), mat(0x15161c, { rough: 0.6 }), N); wm.castShadow = false; wm.frustumCulled = false; g.add(wm);
  const o = new THREE.Object3D(), sag = 1.1;
  const pt = (s, w, u, t) => { const x = poles[s] + (poles[s + 1] - poles[s]) * u, y = ph - 0.3 - sag * 4 * u * (1 - u) + Math.sin(t * 1.3 + w * 1.7 + s) * 0.04 * Math.sin(u * Math.PI), z = wires[w][0] + Math.sin(t * 0.9 + s * 2 + w) * 0.12 * Math.sin(u * Math.PI); return new THREE.Vector3(x, y, z); };
  const upd = (t) => { let i = 0; for (let s = 0; s < spans; s++) for (let w = 0; w < wires.length; w++) for (let k = 0; k < seg; k++) { const a = pt(s, w, k / seg, t), c = pt(s, w, (k + 1) / seg, t); o.position.copy(a).lerp(c, 0.5); o.lookAt(c); o.scale.set(1, 1, a.distanceTo(c) * 1.02); o.updateMatrix(); wm.setMatrixAt(i++, o.matrix); } wm.instanceMatrix.needsUpdate = true; };
  upd(0.0); A.on(upd);
  // sparrows sitting on the wires, hopping
  const sp = new THREE.InstancedMesh(gSph(0.1, 6, 5), mat(0x6a5a4a, { rough: 0.9 }), 10); sp.castShadow = false; sp.frustumCulled = false; g.add(sp); const spp = []; for (let i = 0; i < 10; i++) spp.push({ s: Math.floor(rnd() * spans), w: Math.floor(rnd() * 3), u: rnd.range(0.2, 0.8), ph: rnd() * TAU });
  A.on((t) => { spp.forEach((p, i) => { const a = pt(p.s, p.w, p.u, t); const hop = Math.max(0, Math.sin(t * 2.3 + p.ph)) ** 12 * 0.18; o.position.set(a.x, a.y + 0.12 + hop, a.z); o.scale.set(1, 1, 1.4); o.rotation.set(0, 0, 0); o.updateMatrix(); sp.setMatrixAt(i, o.matrix); }); sp.instanceMatrix.needsUpdate = true; });
  const bf = birdFlock({ n: 7, center: [0, ph + 9, -8], radius: 20, spread: 6, speed: 0.4, seed: 5, size: 1.3, color: 0x59626f }); A.add(bf);
  return done(S, ph + 0.5, spans * span, 'powerLines');
}

// ---------------------------------------------------------------- hot-dog cart with umbrella and steam
export function hotdogCart({ seed = 11, color = 0xd9392f } = {}) {
  const S = grp('hotdogCart'), { g, A, b } = S;
  b.rbox(1.6, 0.8, 0.9, 0.1, 0xe8e8ea, [0, 1.0, 0], { metal: 0.5, rough: 0.3 }); b.rbox(1.64, 0.14, 0.94, 0.05, color, [0, 0.6, 0]); b.rbox(1.64, 0.1, 0.94, 0.04, 0xcfd6e0, [0, 1.45, 0], { metal: 0.8, rough: 0.2 });
  for (const s of [-1, 1]) b.bar([s * 0.6, 0.6, 0.3], [s * 0.7, 0.3, 0.7], 0.05, 0x59616d); b.cyl(0.3, 0.3, 0.1, 14, 0x20232b, [-0.65, 0.3, 0.0], { r: [0, 0, Math.PI / 2] }); b.cyl(0.3, 0.3, 0.1, 14, 0x20232b, [0.65, 0.3, 0.0], { r: [0, 0, Math.PI / 2] });
  b.cyl(0.03, 0.03, 1.3, 6, 0x59616d, [0.6, 1.7, -0.3]); b.cyl(0.03, 0.03, 2.4, 6, 0x59616d, [0.0, 1.7, -0.2]);
  const umb = new THREE.Group(); umb.position.set(0, 2.9, -0.2); const ub = new Batch(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ub.add(new THREE.ConeGeometry(1.5, 0.7, 4, 1, true, 0, TAU / 8), i % 2 ? 0xffffff : color, { p: [0, 0, 0], r: [0, a, 0], rough: 0.8 }); } ub.cone(1.5, 0.7, 8, color, [0, 0.0, 0], { r: [0, 0.0, 0] }); ub.sph(0.07, 0xf6c235, [0, 0.38, 0]); ub.build(umb); g.add(umb);
  umb.children.forEach((m) => { if (m.material) m.material.side = THREE.DoubleSide; });
  // sausages, buns, steam
  for (let i = 0; i < 6; i++) b.cyl(0.05, 0.05, 0.34, 8, 0xc2623a, [-0.45 + i * 0.16, 1.52, 0.1], { r: [0, 0, Math.PI / 2] }); b.box(0.5, 0.06, 0.4, 0x8a909a, [0.4, 1.5, 0.1], { metal: 0.5 });
  for (const [x, c] of [[0.15, 0xf6c235], [0.4, 0xd9392f], [0.65, 0x6bb04f]]) b.cyl(0.04, 0.045, 0.14, 8, c, [x, 1.6, 0.1]);
  b.box(1.4, 0.34, 0.04, 0xf4f1e6, [0, 1.05, 0.46]); const sg = signMesh('HOT DOGS $3', 1.3, 0.3, { bg: '#d9392f', fg: '#ffffff', radius: 0.08 }); sg.position.set(0, 1.05, 0.49); g.add(sg);
  const st = plume({ n: 9, rise: 1.6, r0: 0.08, r1: 0.4, period: 2.6, drift: [0.2, 0, 0.1], color: 0xf4f6fa, seed: 4, spread: 0.3, opacity: 0.65 }); st.position.set(-0.4, 1.6, 0.1); g.add(st); A.on(st.userData.update);
  const bell = new THREE.Mesh(gSph(0.06, 6, 5), mat(0xc9a24a, { metal: 0.6 })); bell.position.set(0.85, 1.0, 0.0); g.add(bell);
  A.on((t) => { umb.rotation.z = Math.sin(t * 1.4) * 0.015; bell.position.y = 1.0 - Math.abs(Math.sin(t * 3)) * 0.02; });
  return done(S, 3.4, 3.0, 'hotdogCart');
}
