// SPACE pack: spacecraft II. Rockets (Saturn V / Falcon 9 style, animated exhaust), Apollo lunar module, floating astronaut, space shuttle
// (orbiter or full launch stack), flying saucer with chasing lights + tractor beam, Mars rover with rolling wheels. 1 unit = 1 m.
import * as THREE from 'three';
import { rng } from '../util.js';
import { TAU, V3, MB, vcMat, lathe, glowDot, flowSprites, sprites } from '../fx/space_kit.js';
import { PAL, solarWing } from './space_craft.js';

const M = () => ({ std: vcMat({ rough: 0.5, metal: 0.2 }), foil: vcMat({ rough: 0.28, metal: 0.85 }), matte: vcMat({ rough: 0.85 }) });
const dims = (g, o) => { Object.assign(g.userData, o); return g; };
const arcBand = (m, r, h, y, a0, a1, col) => m.g(new THREE.CylinderGeometry(r * 1.004, r * 1.004, h, 24, 1, true, a0, a1 - a0), col, [0, y, 0]);

// ---------- rocket: kind 'saturnV' (110.6 m) or 'falcon' (70 m). Points up (+y), base at y = 0. setThrust(k) scales the exhaust ----------
export function rocket({ kind = 'saturnV', thrust = 1, legs = true } = {}) {
  const g = new THREE.Group(), mp = M(), a = new MB(), f = new MB(), blk = new MB(), ticks = [];
  let H, Rr, flameR, flameL, engineY = 0;
  if (kind === 'falcon') {
    Rr = 1.83; H = 70; flameR = 4; flameL = 55;
    a.cyl(Rr, Rr, 41.2, 32, PAL.white, [0, 25.6 - 0.0, 0]); a.cyl(Rr, Rr, 0.8, 32, PAL.black, [0, 46.6, 0]); blk.cyl(Rr * 1.01, Rr * 1.01, 4.2, 32, PAL.black, [0, 49.1, 0]);
    a.cyl(Rr, Rr, 11.8, 32, PAL.white, [0, 56.6, 0]); a.cyl(Rr * 0.99, Rr * 0.99, 0.3, 32, PAL.black, [0, 4.2, 0]);
    a.g(new THREE.CylinderGeometry(Rr * 1.0, Rr, 6, 32), PAL.white, [0, 63.9, 0]); f.g(new THREE.SphereGeometry(Rr, 32, 12, 0, TAU, 0, Math.PI / 2), PAL.silver, [0, 66.9, 0], [0, 0, 0], [1, 1.6, 1]);
    for (let k = 0; k < 9; k++) { const an = k === 0 ? 0 : (k - 1) / 8 * TAU, rad = k === 0 ? 0 : 1.0; blk.cyl(0.22, 0.38, 0.8, 12, PAL.dgrey, [Math.cos(an) * rad, -0.1, Math.sin(an) * rad]); }
    for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + 0.78; blk.box(0.2, 1.8, 1.7, PAL.black, [Math.cos(an) * (Rr + 0.1), 54, Math.sin(an) * (Rr + 0.1)], [0, -an + Math.PI / 2, 0]); }
    if (legs) for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + 0.78, c = Math.cos(an), s = Math.sin(an); blk.bar([c * Rr, 8, s * Rr], [c * 5.2, -0.1, s * 5.2], 0.28, PAL.black); blk.bar([c * Rr, 3, s * Rr], [c * 4.6, 0.0, s * 4.6], 0.18, PAL.dgrey); blk.box(0.9, 0.12, 0.9, PAL.dgrey, [c * 5.3, -0.1, s * 5.3]); }
    for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + 0.78; blk.box(1.3, 0.12, 1.6, PAL.black, [Math.cos(an) * (Rr + 0.5), 47.6, Math.sin(an) * (Rr + 0.5)], [0, -an, 0]); }
    dims(g, { realHeightM: 70, realWidthM: 3.7, note: 'Falcon-9-style two-stage, grid fins, landing legs' });
  } else {
    Rr = 5.05; H = 110.6; flameR = 14; flameL = 95;
    a.cyl(Rr, Rr, 42, 40, PAL.white, [0, 21 + 2.0, 0]); a.cyl(Rr * 0.7, Rr, 3.6, 40, PAL.dgrey, [0, 1.6, 0]);   // S-IC (engine skirt at the base)
    for (let q = 0; q < 4; q++) { const a0 = q * Math.PI / 2 + 0.3; arcBand(blk, Rr, 20, 28, a0, a0 + 0.9, PAL.black); arcBand(blk, Rr, 20, 28, a0 + Math.PI / 4 + 0.3, a0 + Math.PI / 2 + 0.1, PAL.black); }
    blk.cyl(Rr * 1.004, Rr * 1.004, 4, 40, PAL.black, [0, 42, 0]);
    a.cyl(Rr * 0.97, Rr * 0.97, 5.2, 40, PAL.white, [0, 47.6, 0]); a.cyl(Rr, Rr, 25, 40, PAL.white, [0, 62.7, 0]); blk.cyl(Rr * 1.004, Rr * 1.004, 2.4, 40, PAL.black, [0, 52, 0]);
    a.cyl(Rr * 0.8, Rr, 3.8, 40, PAL.white, [0, 77.1, 0]); a.cyl(3.3, 3.3, 17.8, 40, PAL.white, [0, 87.9, 0]); blk.cyl(3.32, 3.32, 1.2, 40, PAL.black, [0, 96.6, 0]);
    a.cyl(3.3, 3.3, 0.9, 40, PAL.black, [0, 97.3, 0]); a.cyl(1.95, 3.3, 1.2, 32, PAL.grey, [0, 98.2, 0]); f.cyl(1.95, 1.95, 7.4, 32, PAL.gold, [0, 102.5, 0]); a.g(new THREE.ConeGeometry(1.95, 3.2, 32), PAL.silver, [0, 107.9 - 0.2, 0]);
    a.cyl(0.25, 0.25, 6, 8, PAL.grey, [0, 111.0, 0]); a.cyl(0.6, 0.6, 3.4, 12, PAL.red, [0, 108.2, 0]); a.cyl(0.05, 0.05, 6, 6, PAL.grey, [1.0, 110, 0]); a.cone(0.28, 0.9, 8, PAL.white, [0, 114.8, 0]);
    for (let k = 0; k < 5; k++) { const an = k === 0 ? 0 : (k - 1) / 4 * TAU + 0.78, rad = k === 0 ? 0 : 2.6; blk.cyl(0.9, 1.9, 5.2, 18, 0x3a2a1e, [Math.cos(an) * rad, -0.1, Math.sin(an) * rad]); blk.cyl(1.2, 1.2, 1.4, 14, PAL.dgrey, [Math.cos(an) * rad, 2.8, Math.sin(an) * rad]); }
    for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + Math.PI / 4, c = Math.cos(an), s = Math.sin(an); const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(4.2, 0); fin.lineTo(1.6, 11); fin.lineTo(0, 11); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.6, bevelEnabled: false }), mp.std); m.rotation.set(0, -an + Math.PI / 2, 0); m.position.set(c * Rr, 1.0, s * Rr); m.translateZ(-0.3); m.rotateY(-Math.PI / 2); m.rotateY(Math.PI / 2); g.add(m); m.castShadow = false; }
    dims(g, { realHeightM: 110.6, realWidthM: 10.1, note: 'Saturn-V-style 3-stage stack with launch escape tower' });
  }
  g.add(a.mesh(mp.std, false), f.mesh(mp.foil, false), blk.mesh(mp.matte, false));
  // exhaust: bright core cone + streaming flame particles + hot glow
  const core = new THREE.Mesh(new THREE.ConeGeometry(flameR * 0.38, flameL * 0.28, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); core.rotation.x = Math.PI; core.position.y = -flameL * 0.14; g.add(core);
  const fl = flowSprites({ n: 520, dir: [0, -1, 0], length: flameL, spread: flameR * 0.45, speed: 1.6, size: [flameR * 0.3, flameR * 0.75], colors: [0xffffff, 0xffb040, 0xff4a10], pow: 1.0, seed: 3, spread0: 0.5, op: 0.55 }); g.add(fl);
  const gl = glowDot(0xffb050, flameR * 4, { k: 0.5, soft: 2.2 }); gl.position.y = -flameR * 0.5; g.add(gl);
  const setThrust = (k) => { fl.setLevel(k); core.visible = gl.visible = k > 0.02; core.scale.set(1, 0.4 + 0.6 * k, 1); core.position.y = -flameL * 0.14 * (0.4 + 0.6 * k); gl.scale.setScalar(0.4 + 0.6 * k); };
  g.userData.setThrust = setThrust; setThrust(thrust);
  g.update = g.userData.update = (t) => { fl.setTime(t); const fk = 0.9 + 0.1 * Math.sin(t * 40) * Math.sin(t * 17); core.scale.x = core.scale.z = fk; };
  g.update(0); return g;
}

// ---------- Apollo lunar module ----------
export function apolloLander({ engine = false } = {}) {
  const g = new THREE.Group(), mp = M(), a = new MB(), f = new MB(), ticks = [];
  const Y0 = 2.3;   // descent stage mid height
  f.cyl(2.15, 2.15, 1.7, 8, PAL.gold, [0, Y0, 0]); a.cyl(2.2, 2.2, 0.12, 8, PAL.dgrey, [0, Y0 + 0.9, 0]); a.cyl(2.2, 2.2, 0.12, 8, PAL.dgrey, [0, Y0 - 0.9, 0]);
  for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + Math.PI / 4, c = Math.cos(an), s = Math.sin(an);
    a.bar([c * 1.7, Y0 + 0.4, s * 1.7], [c * 4.3, 0.15, s * 4.3], 0.22, PAL.grey); a.bar([c * 1.7, Y0 - 0.3, s * 1.7], [c * 3.6, 0.5, s * 3.6], 0.12, PAL.grey);
    for (const o of [-0.8, 0.8]) a.bar([c * 1.6 - s * o, Y0 + 0.5, s * 1.6 + c * o], [c * 3.9, 1.45, s * 3.9], 0.1, PAL.grey);
    a.cyl(0.46, 0.46, 0.1, 18, PAL.gold, [c * 4.4, 0.1, s * 4.4]); f.cyl(0.4, 0.4, 0.14, 18, PAL.silver, [c * 4.4, 0.12, s * 4.4]); a.cyl(0.03, 0.03, 1.6, 5, PAL.grey, [c * 4.4, -0.5, s * 4.4]); }
  a.cyl(0.25, 0.25, 0.1, 10, PAL.grey, [4.3 * 0.707, 0.4, 4.3 * 0.707]);
  for (let i = 0; i < 6; i++) a.box(0.9, 0.08, 0.3, PAL.dgrey, [0, 0.4 + i * 0.35, 3.2 + (i % 2) * 0.0 + i * 0.1 + 0.4]);   // ladder
  a.cyl(0.6, 1.1, 1.0, 16, PAL.black, [0, Y0 - 1.4, 0]);   // descent engine bell
  // ascent stage
  const Y1 = Y0 + 2.2; f.cyl(1.55, 1.8, 2.4, 8, PAL.silver, [0, Y1, 0]); a.cyl(1.5, 1.5, 0.3, 8, PAL.grey, [0, Y1 + 1.35, 0]); a.cyl(0.55, 0.55, 0.6, 12, PAL.dgrey, [0, Y1 + 1.8, 0]);
  for (const s of [-1, 1]) { a.g(new THREE.BoxGeometry(0.1, 0.9, 0.7), 0x1a2540, [s * 0.5, Y1 + 0.35, 1.6], [0.3, s * 0.45, 0]); a.box(0.95, 0.1, 0.1, PAL.grey, [s * 0.5, Y1 + 0.84, 1.62], [0, s * 0.45, 0]); }
  a.box(1.1, 0.9, 0.12, PAL.white, [0, Y1 - 0.4, 1.7]);
  for (let k = 0; k < 4; k++) { const an = k / 4 * TAU + Math.PI / 4, c = Math.cos(an), s = Math.sin(an); a.box(0.5, 0.6, 0.5, PAL.grey, [c * 1.9, Y1 - 0.5, s * 1.9]); for (let j = 0; j < 4; j++) { const q = j * Math.PI / 2; a.cone(0.07, 0.22, 6, PAL.black, [c * 1.9 + Math.cos(an + q) * 0.3, Y1 - 0.5 + (j % 2 ? 0.18 : -0.18), s * 1.9 + Math.sin(an + q) * 0.3], [Math.sin(an + q) * 1.4, 0, -Math.cos(an + q) * 1.4]); } }
  a.cyl(0.02, 0.02, 2.4, 5, PAL.grey, [-1.3, Y1 + 2.0, 0.5]); a.cyl(0.02, 0.02, 2.0, 5, PAL.grey, [1.3, Y1 + 1.8, -0.5]);
  g.add(a.mesh(mp.std, true), f.mesh(mp.foil, true));
  const dish = new THREE.Group(); dish.position.set(-1.0, Y1 + 1.6, -0.8); g.add(dish); { const d = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 8, 0, TAU, 0, 1.1), new THREE.MeshStandardMaterial({ color: 0xf0f0f2, roughness: 0.4, side: THREE.DoubleSide })); d.scale.y = 0.4; d.position.y = 0.3; dish.add(d); const m = new MB(); m.cyl(0.04, 0.04, 0.4, 6, PAL.grey, [0, 0.15, 0]); dish.add(m.mesh(mp.std, false)); }
  const radar = new THREE.Group(); radar.position.set(0.5, Y1 + 1.8, 0.6); g.add(radar); { const m = new MB(); m.cyl(0.28, 0.28, 0.1, 12, PAL.white, [0, 0.3, 0]); m.cyl(0.04, 0.04, 0.3, 6, PAL.grey, [0, 0.1, 0]); radar.add(m.mesh(mp.std, false)); }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false })); beacon.position.set(0, Y1 + 2.3, 0); g.add(beacon);
  const pl = flowSprites({ n: 160, dir: [0, -1, 0], length: 7, spread: 0.9, speed: 1.4, size: [0.35, 1.0], colors: [0xffffff, 0xffd080, 0xff7030], pow: 1.2, seed: 9, op: 0.6 }); pl.position.y = Y0 - 1.9; g.add(pl); pl.setLevel(engine ? 1 : 0); g.userData.setEngine = (k) => pl.setLevel(k);
  g.update = g.userData.update = (t) => { dish.rotation.y = 1.0 * Math.sin(t * 0.7); dish.rotation.x = 0.25 * Math.sin(t * 1.1); radar.rotation.y = t * 1.2; beacon.material.color.setHex((t % 1.2) < 0.3 ? 0xff3030 : 0x300a0a); pl.setTime(t); };
  dims(g, { realHeightM: 7.0, realWidthM: 9.4, note: 'gold-foil descent stage, four legs, steering dish and radar move; descent engine optional' }); g.update(0); return g;
}

// ---------- floating astronaut (EMU-style suit, gold visor, backpack, tether that streams) ----------
export function astronaut({ tether = true, seed = 3 } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(), mp = M(); g.add(body);
  const suit = new THREE.MeshStandardMaterial({ color: 0xf6f6f8, roughness: 0.55 }), grey = new THREE.MeshStandardMaterial({ color: 0xc4c8d0, roughness: 0.5 }), dark = new THREE.MeshStandardMaterial({ color: 0x2a2c34, roughness: 0.6 });
  const visor = new THREE.MeshStandardMaterial({ color: 0xc8962a, metalness: 0.9, roughness: 0.08, emissive: 0x3a2808, emissiveIntensity: 0.5 });
  const mesh = (geo, m, p, par, s) => { const o = new THREE.Mesh(geo, m); o.position.set(...p); if (s) o.scale.set(...s); o.castShadow = true; par.add(o); return o; };
  const torso = new THREE.Group(); torso.position.y = 1.15; body.add(torso);
  mesh(new THREE.CapsuleGeometry(0.27, 0.34, 8, 20), suit, [0, 0, 0], torso, [1.1, 1, 0.85]); mesh(new THREE.BoxGeometry(0.34, 0.26, 0.06), grey, [0, 0.05, 0.25], torso); mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0x40ff80 }), [0.08, 0.08, 0.29], torso);
  mesh(new THREE.BoxGeometry(0.5, 0.62, 0.26), suit, [0, 0.05, -0.3], torso); mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), grey, [0, -0.32, -0.3], torso); mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), grey, [0.2, 0.1, -0.2], torso, null).rotation.x = 0;
  mesh(new THREE.CylinderGeometry(0.31, 0.3, 0.1, 20), grey, [0, -0.38, 0], torso);
  const head = new THREE.Group(); head.position.set(0, 0.52, 0.02); torso.add(head); mesh(new THREE.SphereGeometry(0.24, 28, 20), suit, [0, 0.0, 0], head); const vz = mesh(new THREE.SphereGeometry(0.205, 28, 20, -1.1, 2.2, 0.4, 1.9), visor, [0, 0, 0.07], head); vz.rotation.y = Math.PI / 2 * 0; mesh(new THREE.TorusGeometry(0.215, 0.025, 8, 28), grey, [0, -0.2, 0.0], head).rotation.x = Math.PI / 2;
  const limb = (len, r, mat) => { const gg = new THREE.Group(); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat); m.position.y = -len / 2; m.castShadow = true; gg.add(m); return gg; };
  const mk = (side) => { const sh = new THREE.Group(); sh.position.set(side * 0.34, 0.28, 0); torso.add(sh); const up = limb(0.22, 0.095, suit); sh.add(up); const el = new THREE.Group(); el.position.y = -0.34; up.add(el); const lo = limb(0.2, 0.085, suit); el.add(lo); const hand = new THREE.Group(); hand.position.y = -0.34; lo.add(hand); mesh(new THREE.SphereGeometry(0.1, 14, 10), grey, [0, 0, 0], hand); mesh(new THREE.SphereGeometry(0.08, 12, 8), dark, [0, -0.1, 0], hand, [1, 1.1, 0.9]); return { sh, el }; };
  const mk2 = (side) => { const hp = new THREE.Group(); hp.position.set(side * 0.14, -0.38, 0); torso.add(hp); const up = limb(0.28, 0.12, suit); hp.add(up); const kn = new THREE.Group(); kn.position.y = -0.4; up.add(kn); const lo = limb(0.26, 0.105, suit); kn.add(lo); const ft = new THREE.Group(); ft.position.y = -0.4; lo.add(ft); mesh(new THREE.BoxGeometry(0.16, 0.12, 0.3), grey, [0, -0.05, 0.06], ft); mesh(new THREE.BoxGeometry(0.17, 0.03, 0.32), dark, [0, -0.12, 0.06], ft); return { hp, kn }; };
  const A = [mk(-1), mk(1)], L = [mk2(-1), mk2(1)];
  mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0xd23a2a }), [0.2, 0.2, 0.26], torso); mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x2f6fd6 }), [-0.2, 0.2, 0.26], torso);
  let tet = null; const N = 16; if (tether) { tet = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe8c040, roughness: 0.6 }), N); tet.frustumCulled = false; g.add(tet); }
  const _m = new THREE.Matrix4();
  g.update = g.userData.update = (t) => {
    body.rotation.set(0.25 * Math.sin(t * 0.35), t * 0.18, 0.18 * Math.sin(t * 0.27)); body.position.y = 0.12 * Math.sin(t * 0.6);
    A[0].sh.rotation.set(0.5 * Math.sin(t * 0.8), 0, 0.9 + 0.3 * Math.sin(t * 0.7)); A[1].sh.rotation.set(0.5 * Math.sin(t * 0.8 + 2), 0, -0.9 - 0.3 * Math.sin(t * 0.7 + 1)); A[0].el.rotation.x = -0.5 + 0.3 * Math.sin(t * 0.9); A[1].el.rotation.x = -0.5 + 0.3 * Math.sin(t * 0.9 + 1.5);
    L[0].hp.rotation.set(0.3 + 0.25 * Math.sin(t * 0.6), 0, 0.18); L[1].hp.rotation.set(0.2 + 0.25 * Math.sin(t * 0.6 + 2), 0, -0.18); L[0].kn.rotation.x = 0.35 + 0.2 * Math.sin(t * 0.7); L[1].kn.rotation.x = 0.35 + 0.2 * Math.sin(t * 0.7 + 1.3);
    if (tet) for (let i = 0; i < N; i++) { const u = i / (N - 1), y = 1.0 - u * 0.2; _m.makeTranslation(-0.2 - u * 3.2 + 0.2 * Math.sin(t * 1.3 + u * 6) * u, y + 0.5 * Math.sin(t * 0.9 + u * 5) * u + u * 0.5, -0.3 + 0.35 * Math.sin(t * 1.1 + u * 4) * u); tet.setMatrixAt(i, _m); } if (tet) tet.instanceMatrix.needsUpdate = true;
  };
  dims(g, { realHeightM: 1.8, note: 'drifts and tumbles; arms/legs sway, tether streams' }); g.update(0); return g;
}

// ---------- space shuttle: orbiter (payload bay doors swing open, arm waves) or full launch stack ----------
export function spaceShuttle({ stack = false, bayOpen = 1, thrust = 1 } = {}) {
  const g = new THREE.Group(), mp = M(), ticks = [];
  const orb = new THREE.Group();   // nose +z, up +y
  const prof = [[0.0, 18.6], [0.9, 18.0], [1.7, 16.6], [2.3, 14.5], [2.55, 11], [2.7, 4], [2.7, -8], [2.6, -14], [1.4, -17.5], [0.0, -18.6]];
  const bodyGeo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)).reverse(), 40); bodyGeo.rotateX(Math.PI / 2); bodyGeo.scale(1, 0.9, 1);
  { const p = bodyGeo.attributes.position, n = bodyGeo.attributes.normal, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const belly = n.getY(i) < -0.15, nose = p.getZ(i) > 15.2; const col = new THREE.Color(belly || nose ? 0x24262e : 0xf4f4f6); c.set([col.r, col.g, col.b], i * 3); } bodyGeo.setAttribute('color', new THREE.BufferAttribute(c, 3)); bodyGeo.computeVertexNormals(); }
  const hull = new THREE.Mesh(bodyGeo, vcMat({ rough: 0.55 })); hull.castShadow = true; orb.add(hull);
  const a = new MB(), blk = new MB();
  const wing = new THREE.Shape(); wing.moveTo(0, 0); wing.lineTo(11.9, -17.2 + 5); wing.lineTo(11.9, -17.2); wing.lineTo(0, -17.2); wing.lineTo(0, 0);
  wing.setFromPoints([new THREE.Vector2(1.5, 5), new THREE.Vector2(11.9, -13), new THREE.Vector2(11.9, -16.5), new THREE.Vector2(2.2, -16.5), new THREE.Vector2(1.5, -6)]);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ExtrudeGeometry(wing, { depth: 0.45, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xf2f2f4, roughness: 0.5 })); w.rotation.x = Math.PI / 2; w.rotation.z = 0; w.scale.set(s, 1, 1); w.position.set(0, -1.2 + 0.2, 0); w.rotation.set(Math.PI / 2, 0, 0); orb.add(w); w.castShadow = true;
    const lead = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(1.5, 5), new THREE.Vector2(11.9, -13), new THREE.Vector2(11.9, -12.2), new THREE.Vector2(1.5, 5.8)]), { depth: 0.5, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0x24262e, roughness: 0.7 })); lead.rotation.x = Math.PI / 2; lead.scale.set(s, 1, 1); lead.position.set(0, -1.18, 0); orb.add(lead);
    blk.box(2.6, 0.5, 0.5, PAL.black, [s * 10.6, -1.0, -17]); }
  const fin = new THREE.Shape(); fin.setFromPoints([new THREE.Vector2(-2, 0), new THREE.Vector2(-15, 0), new THREE.Vector2(-19.2, 8), new THREE.Vector2(-13.8, 8.6)]);
  const finG = new THREE.ExtrudeGeometry(fin, { depth: 0.5, bevelEnabled: false }); finG.rotateY(-Math.PI / 2); const finM = new THREE.Mesh(finG, new THREE.MeshStandardMaterial({ color: 0xf2f2f4, roughness: 0.5 })); finM.position.set(0.25, 2.2, 0); finM.castShadow = true; orb.add(finM);
  a.cyl(0.75, 0.9, 1.4, 12, PAL.dgrey, [0, 0.8, -17.2], [Math.PI / 2, 0, 0], [1, 1, 1]);
  for (const [x, y] of [[0, 0.4], [-1.3, -1.3], [1.3, -1.3]]) blk.cyl(0.5, 0.95, 1.8, 14, 0x3a2a1e, [x, y, -19.1], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) { a.cyl(0.8, 0.8, 3.8, 14, PAL.white, [s * 1.5, 2.3, -15.2], [Math.PI / 2, 0, 0]); blk.cyl(0.5, 0.6, 0.9, 10, PAL.black, [s * 1.5, 2.3, -17.5], [Math.PI / 2, 0, 0]); }
  a.box(1.9, 0.1, 0.9, PAL.black, [0, 1.7, 12.9], [-0.45, 0, 0]); for (const s of [-1, 1]) a.box(0.5, 0.1, 0.8, PAL.black, [s * 0.8, 1.9, 12.6], [-0.45, s * 0.3, 0]);
  orb.add(a.mesh(mp.std, true), blk.mesh(mp.matte, false));
  // payload bay: two doors hinged on the sides + a little satellite and the robot arm
  const doors = []; for (const s of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(s * 2.2, 1.1, 0); orb.add(pv); const d = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 17, 14, 1, true, s > 0 ? 0 : Math.PI, 0.9), new THREE.MeshStandardMaterial({ color: 0xf2f2f4, roughness: 0.45, side: THREE.DoubleSide })); d.rotation.set(Math.PI / 2, 0, 0); d.position.set(-s * 2.2, 0, 0.0); d.rotateOnWorldAxis(V3(0, 0, 1), 0); const ang = s > 0 ? 0 : Math.PI; d.geometry = new THREE.CylinderGeometry(2.3, 2.3, 17, 14, 1, true, s > 0 ? Math.PI / 2 - 0.9 : -Math.PI / 2, 0.9); d.rotation.set(Math.PI / 2, 0, 0); d.position.set(-s * 2.2, -1.1, 0); pv.add(d); const rad = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 17), new THREE.MeshStandardMaterial({ color: 0xc8ccd4 })); doors.push({ pv, s }); }
  const bay = new MB(); bay.box(4.2, 0.3, 17, PAL.dgrey, [0, 0.45, 0.5]); bay.cyl(1.0, 1.0, 5, 16, PAL.gold, [0, 1.8, 2], [Math.PI / 2, 0, 0]); bay.box(0.2, 0.2, 14, PAL.grey, [1.7, 0.9, 0.5]); orb.add(bay.mesh(mp.foil, false));
  const arm = new THREE.Group(); arm.position.set(-1.8, 1.0, 5); orb.add(arm); const am = new MB(); am.cyl(0.1, 0.1, 4.6, 8, PAL.white, [0, 2.3, 0]); am.sph(0.18, PAL.grey, [0, 0, 0]); arm.add(am.mesh(mp.std, false)); const arm2 = new THREE.Group(); arm2.position.y = 4.6; arm.add(arm2); const am2 = new MB(); am2.cyl(0.1, 0.1, 4.2, 8, PAL.white, [0, 2.1, 0]); am2.sph(0.16, PAL.grey, [0, 0, 0]); arm2.add(am2.mesh(mp.std, false));
  g.add(orb); let plume = null;
  if (stack) {
    orb.rotation.x = -Math.PI / 2; orb.position.set(0, 24, 5.5); orb.rotation.z = Math.PI; orb.rotation.set(-Math.PI / 2, 0, Math.PI); orb.position.set(0, 31, 6);
    const e = new MB(); e.cyl(4.2, 4.2, 47, 32, 0xe0742a, [0, 23.5, 0]); e.g(new THREE.SphereGeometry(4.2, 32, 12, 0, TAU, 0, Math.PI / 2), 0xe0742a, [0, 47, 0], [0, 0, 0], [1, 1.8, 1]); g.add(e.mesh(vcMat({ rough: 0.9 }), false));
    const sb = new MB(); for (const s of [-1, 1]) { sb.cyl(1.85, 1.85, 38, 24, PAL.white, [s * 6.5, 19, 0]); sb.g(new THREE.SphereGeometry(1.85, 24, 10, 0, TAU, 0, Math.PI / 2), PAL.white, [s * 6.5, 38, 0], [0, 0, 0], [1, 1.7, 1]); sb.cyl(1.2, 2.0, 2.6, 16, PAL.dgrey, [s * 6.5, -0.9, 0]); sb.cyl(1.86, 1.86, 1.4, 24, PAL.black, [s * 6.5, 30, 0]); sb.bar([s * 4.6, 36, 0], [s * 2.2, 36, 0], 0.4, PAL.grey); } g.add(sb.mesh(mp.std, false));
    plume = flowSprites({ n: 420, dir: [0, -1, 0], length: 42, spread: 4.5, speed: 1.6, size: [3, 7], colors: [0xffffff, 0xffb040, 0xff5a20], pow: 1.0, seed: 4, spread0: 0.5, op: 0.5 }); plume.position.y = -1; g.add(plume); const pl2 = []; for (const s of [-1, 1]) { const p = flowSprites({ n: 280, dir: [0, -1, 0], length: 36, spread: 3.2, speed: 1.4, size: [2.4, 5.5], colors: [0xfff0c0, 0xffa040, 0xff5a20], pow: 1.0, seed: 5 + s, spread0: 0.5, op: 0.5 }); p.position.set(s * 6.5, -2, 0); g.add(p); pl2.push(p); } plume.userData.more = pl2;
    dims(g, { realHeightM: 56, realWidthM: 24, note: 'launch stack: orbiter, orange tank, two solid boosters' });
  } else dims(g, { realLengthM: 37.2, realWidthM: 23.8, realHeightM: 17.3, note: 'orbiter with payload bay doors that swing open and the robot arm working' });
  g.update = g.userData.update = (t) => { const k = bayOpen * (0.5 + 0.5 * Math.sin(t * 0.5 - 1.2)); for (const d of doors) d.pv.rotation.z = d.s * -(0.15 + 1.6 * k); arm.rotation.z = 0.5 * Math.sin(t * 0.4); arm2.rotation.z = -0.9 + 0.5 * Math.sin(t * 0.5 + 1); if (plume) { plume.setTime(t); plume.setLevel(thrust); plume.userData.more.forEach((p) => { p.setTime(t); p.setLevel(thrust); }); } };
  g.update(0); return g;
}

// ---------- flying saucer: hull, dome with a green alien, light ring that chases around, tractor beam with rising particles ----------
export function ufo({ beam = true, seed = 5 } = {}) {
  const g = new THREE.Group(), mp = M(), r = rng(seed), hull = new THREE.Group(); g.add(hull);
  const prof = [[0.0, -1.05], [1.4, -1.0], [3.0, -0.7], [5.0, -0.2], [6.2, 0.05], [6.4, 0.3], [5.6, 0.6], [3.4, 1.0], [1.8, 1.25], [0.0, 1.3]];
  hull.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 48), new THREE.MeshStandardMaterial({ color: 0xaab4c8, metalness: 0.75, roughness: 0.25 })));
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x9ff0d0, transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.1, clearcoat: 1, depthWrite: false });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 20, 0, TAU, 0, Math.PI / 2), glassM); dome.position.y = 1.25; dome.scale.y = 0.9; hull.add(dome);
  const al = new THREE.Group(); al.position.y = 1.3; hull.add(al); const gm = new THREE.MeshStandardMaterial({ color: 0x4cd860, roughness: 0.5 }); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), gm); hd.position.y = 1.2; hd.scale.set(0.9, 1.1, 0.9); al.add(hd); const bd = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.5, 6, 12), gm); bd.position.y = 0.4; al.add(bd);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: 0x101010 })); e.position.set(s * 0.3, 1.3, 0.55); e.scale.set(1.3, 0.7, 0.5); al.add(e); const an = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), gm); an.position.set(s * 0.35, 1.9, 0); an.rotation.z = -s * 0.3; al.add(an); const bl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffff60 })); bl.position.set(s * 0.45, 2.22, 0); al.add(bl); }
  const rim = new MB(); rim.tor(6.0, 0.18, PAL.dgrey, [0, 0.12, 0], [Math.PI / 2, 0, 0], 1, 10, 48); for (let k = 0; k < 3; k++) { const an = k / 3 * TAU; rim.cyl(0.18, 0.12, 1.3, 8, PAL.dgrey, [Math.cos(an) * 3.2, -1.6, Math.sin(an) * 3.2], [0, 0, 0]); rim.cyl(0.5, 0.5, 0.12, 14, PAL.dgrey, [Math.cos(an) * 3.2, -2.3, Math.sin(an) * 3.2]); } hull.add(rim.mesh(mp.std, true));
  const N = 24, lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), N); lights.frustumCulled = false; hull.add(lights);
  const cols = [0xff4a4a, 0xffd23a, 0x4aff7a, 0x4ac8ff, 0xc84aff], _m = new THREE.Matrix4(), _c = new THREE.Color(); const glows = glowDot(0xffe090, 16, { k: 0.18, soft: 2 }); glows.position.y = 0.2; g.add(glows);
  const under = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshBasicMaterial({ color: 0xaaffd0, toneMapped: false })); under.rotation.x = Math.PI / 2; under.position.y = -1.12; hull.add(under);
  let bm = null, parts = null;
  if (beam) { const bg = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 7, 22, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fffd0, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); bg.position.y = -12; g.add(bg); bm = bg;
    parts = flowSprites({ n: 200, dir: [0, 1, 0], length: 21, spread: 5.2, speed: 0.35, size: [0.3, 0.6], colors: [0xd0ffe8, 0x7affc0, 0x30c090], pow: 0.6, seed: seed, spread0: 1, op: 0.8 }); parts.position.y = -22.6; g.add(parts); }
  g.update = g.userData.update = (t) => {
    for (let i = 0; i < N; i++) { const a = i / N * TAU + t * 1.6; _m.makeTranslation(Math.cos(a) * 5.7, 0.3 - 0.05, Math.sin(a) * 5.7); lights.setMatrixAt(i, _m); const on = 0.5 + 0.5 * Math.sin(i * 0.9 - t * 7); lights.setColorAt(i, _c.setHex(cols[i % cols.length]).multiplyScalar(0.25 + 0.9 * on)); } lights.instanceMatrix.needsUpdate = true; lights.instanceColor.needsUpdate = true;
    hull.rotation.y = t * 0.5; g.rotation.z = 0.09 * Math.sin(t * 0.9); g.rotation.x = 0.07 * Math.sin(t * 0.7 + 1); hull.position.y = 0.35 * Math.sin(t * 1.3); al.rotation.y = -t * 0.5 + 0.4 * Math.sin(t); if (bm) { bm.material.opacity = 0.16 + 0.06 * Math.sin(t * 5); parts.setTime(t); }
  };
  dims(g, { realWidthM: 12.8, realHeightM: 3.7, note: 'fictional ~13 m saucer: ring of 24 chasing lights, bobbing, alien turns, tractor beam particles rise' }); g.update(0); return g;
}

// ---------- Mars rover (Curiosity-style): six rolling wheels, rocker-bogie, turning mast head, waving arm. drive = m/s along +z ----------
export function marsRover({ drive = 0 } = {}) {
  const g = new THREE.Group(), mp = M(), a = new MB(), f = new MB(), wheels = [];
  a.box(2.7, 0.7, 3.0, PAL.silver, [0, 1.25, 0]); a.box(2.5, 0.3, 2.8, PAL.grey, [0, 1.7, 0]); f.box(2.0, 0.5, 1.4, PAL.gold, [0, 1.9, -0.3]);
  a.cyl(0.35, 0.35, 1.5, 10, PAL.dgrey, [0, 1.3, -2.1], [Math.PI / 2, 0, 0]); for (let k = 0; k < 6; k++) a.box(0.5, 0.04, 0.5, PAL.dgrey, [0, 1.5 + k * 0.0, -2.2 - 0.0]); 
  a.box(0.8, 0.5, 0.8, PAL.grey, [-0.8, 2.1, 1.0]); a.cyl(0.03, 0.03, 0.9, 6, PAL.grey, [0.6, 2.2, 1.0]); a.cyl(0.35, 0.35, 0.04, 6, PAL.silver, [0.6, 2.7, 1.0], [0.6, 0, 0]);
  for (const s of [-1, 1]) { a.bar([s * 1.3, 1.1, 1.2], [s * 1.7, 0.5, 1.8], 0.12, PAL.dgrey); a.bar([s * 1.3, 1.1, -0.4], [s * 1.7, 0.55, -1.0], 0.12, PAL.dgrey); a.bar([s * 1.7, 0.55, -1.0], [s * 1.7, 0.5, -2.0], 0.1, PAL.dgrey); a.bar([s * 1.7, 0.5, 1.8], [s * 1.7, 0.5, 0.2], 0.1, PAL.dgrey); a.bar([s * 1.7, 0.5, 0.2], [s * 1.3, 1.1, 0.2], 0.1, PAL.dgrey); }
  g.add(a.mesh(mp.std, true), f.mesh(mp.foil, true));
  const wg = new THREE.CylinderGeometry(0.255, 0.255, 0.4, 18); const wm = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.6, roughness: 0.4 }), gr = new MB(); for (let k = 0; k < 18; k++) { const an = k / 18 * TAU; gr.box(0.4, 0.06, 0.06, PAL.dgrey, [0, Math.cos(an) * 0.27, Math.sin(an) * 0.27], [an, 0, 0]); } const grG = gr.mesh(mp.std, true).geometry;
  for (const [x, z] of [[-1.7, 1.8], [1.7, 1.8], [-1.7, 0.2], [1.7, 0.2], [-1.7, -2.0], [1.7, -2.0]]) { const w = new THREE.Group(); w.position.set(x, 0.5, z); const m = new THREE.Mesh(wg, wm); m.rotation.z = Math.PI / 2; m.castShadow = true; w.add(m); const gm = new THREE.Mesh(grG, mp.std); w.add(gm); g.add(w); wheels.push(w); }
  const mast = new THREE.Group(); mast.position.set(0.6, 2.7, 1.0); g.add(mast); { const m = new MB(); m.box(0.5, 0.3, 0.3, PAL.dgrey, [0, 0.3, 0]); m.cyl(0.07, 0.07, 0.12, 8, PAL.black, [-0.12, 0.3, 0.17], [Math.PI / 2, 0, 0]); m.cyl(0.07, 0.07, 0.12, 8, PAL.black, [0.12, 0.3, 0.17], [Math.PI / 2, 0, 0]); m.cyl(0.1, 0.1, 0.25, 8, PAL.white, [0.0, 0.1, 0]); mast.add(m.mesh(mp.std, true)); }
  const arm = new THREE.Group(), el = new THREE.Group(); arm.position.set(-0.9, 1.1, 1.55); g.add(arm); { const m = new MB(); m.cyl(0.09, 0.09, 1.1, 8, PAL.grey, [0, 0, 0.55], [Math.PI / 2, 0, 0]); m.sph(0.14, PAL.dgrey, [0, 0, 0]); arm.add(m.mesh(mp.std, true)); el.position.z = 1.1; arm.add(el); const m2 = new MB(); m2.cyl(0.08, 0.08, 1.0, 8, PAL.grey, [0, 0, 0.5], [Math.PI / 2, 0, 0]); m2.box(0.4, 0.4, 0.3, PAL.dgrey, [0, 0, 1.15]); el.add(m2.mesh(mp.std, true)); }
  g.update = g.userData.update = (t) => { const sp = Math.max(drive, 0.25); for (const w of wheels) w.rotation.x = -t * sp / 0.255; mast.rotation.y = 1.3 * Math.sin(t * 0.7); arm.rotation.set(-0.5 + 0.3 * Math.sin(t * 0.5), 0.4 * Math.sin(t * 0.4), 0); el.rotation.x = 0.5 + 0.3 * Math.sin(t * 0.6); g.userData.driveZ = drive * t; };
  g.userData.drive = drive; dims(g, { realLengthM: 3.0, realWidthM: 2.7, realHeightM: 2.2, note: 'wheels roll, mast head scans, arm works; position.z = drive * t if you want it to travel' }); g.update(0); return g;
}
