// Gerald v2: a properly built cartoon cat (no textures; tabby stripes are geometry). Used by makeAnimal('cat', ...).
// Same API as the other animals: root, pose(APOSES.*), face({lid, look, pupil}), head, tail, eyes. Faces +Z, auto-grounded.
// Rig: hips (pitch for sitting) -> torso along +Z -> chest (front legs, neck -> head); back legs at the hips; tail chain.
import * as THREE from 'three';
import { mat, add, sph, cyl, cap, cone, tor, heartGeo } from './util.js';
const HEART_EYE = heartGeo(0.3, 0.08), HEART_EYE_M = mat(0xff2d55, { rough: 0.35, emissive: 0xff2d55, emissiveIntensity: 0.25 });
import { AJ, APOSES, plantA, applyAFace } from './animal.js';

const tri = (w, h, d) => {
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.quadraticCurveTo(w * 0.12, h * 0.6, 0, h); sh.quadraticCurveTo(-w * 0.12, h * 0.6, -w / 2, 0);
  return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: d * 0.4, bevelSize: d * 0.4, bevelSegments: 2 });
};

export function buildCat(o) {
  const root = new THREE.Group(), pivot = new THREE.Group(); root.add(pivot);
  const fur = mat(o.fur, { rough: 0.8 }), stripe = mat(o.stripe, { rough: 0.8 }), cream = mat(o.belly, { rough: 0.8 }), sock = mat(0xfff8ee, { rough: 0.8 });
  const pink = mat(0xf29aa8, { rough: 0.6 }), dark = mat(0x3a1e14, { rough: 0.5 });
  const L = 0.42, LEG = 0.19, HIPY = LEG + 0.07;
  const hips = new THREE.Group(); hips.position.set(0, HIPY, -L / 2); pivot.add(hips);
  // torso: smooth lathe profile laid along +Z (round rump, waist, deep chest)
  const prof = [[0, -0.02], [0.1, 0.0], [0.135, 0.06], [0.13, 0.2], [0.125, 0.3], [0.13, 0.4], [0.1, 0.47], [0, 0.5]].map(([r, y]) => new THREE.Vector2(r, y));
  add(hips, new THREE.LatheGeometry(prof, 28), fur, [0, 0, -0.04], [Math.PI / 2, 0, 0], [1, 1, 0.92]);
  add(hips, sph(0.115, 18, 12), cream, [0, -0.045, 0.24], [0, 0, 0], [0.95, 0.75, 1.7]);                                // belly
  for (const s of [-1, 1]) add(hips, sph(0.105, 18, 14), fur, [s * 0.075, -0.01, 0.06], [0, 0, 0], [0.75, 1.0, 1.15]);  // haunches
  // tabby stripes: arcs over the back and down the flanks, and on the haunches
  for (let i = 0; i < 6; i++) add(hips, tor(0.131, 0.011, 6, 24, Math.PI * 0.82), stripe, [0, 0, 0.02 + i * 0.075], [0, 0, Math.PI * 0.09], [1, 0.97, 0.6]).castShadow = false;
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) add(hips, tor(0.1, 0.01, 6, 16, Math.PI * 0.5), stripe, [s * 0.04, 0.02, 0.03 + k * 0.06], [0, s * Math.PI / 2, -Math.PI * 0.05], [1, 1, 0.6]).castShadow = false;
  // chest with white bib
  const chest = new THREE.Group(); chest.position.set(0, 0, L); hips.add(chest);
  add(chest, sph(0.105, 18, 14), cream, [0, -0.02, 0.035], [0, 0, 0], [0.95, 1.05, 0.8]);
  // legs: fur leg, white sock, round paw with toe bumps
  const leg = (parent, x, z, len, front) => {
    const g = new THREE.Group(); g.position.set(x, front ? -0.05 : -0.02, z); parent.add(g);
    const inner = new THREE.Group(); g.add(inner);
    add(inner, cap(front ? 0.04 : 0.045, len * 0.8, 4, 10), fur, [0, -len * 0.5, 0]);
    add(inner, cap(front ? 0.041 : 0.046, len * 0.22, 4, 10), sock, [0, -len * 0.88, 0]);
    add(inner, sph(0.05, 14, 10), sock, [0, -len - 0.005, 0.02], [0, 0, 0], [1, 0.62, 1.3]);
    for (const s of [-1, 0, 1]) add(inner, sph(0.012, 6, 4), mat(0xe8d8c8), [s * 0.022, -len - 0.018, 0.075], [0, 0, 0], [1, 0.6, 0.6]);
    g.userData = { inner, len, front }; return g;
  };
  const legs = [leg(chest, 0.065, 0.02, LEG + 0.05, true), leg(chest, -0.065, 0.02, LEG + 0.05, true), leg(hips, 0.085, 0.06, LEG, false), leg(hips, -0.085, 0.06, LEG, false)];
  // head: wide, cheek puffs, muzzle pads, chin, pink triangle nose, w-mouth, whiskers, forehead "M"
  const neck = new THREE.Group(); neck.position.set(0, 0.07, 0.05); chest.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.12, 0.05); neck.add(head);
  const R = 0.17;
  add(head, sph(R, 32, 22), fur, [0, 0, 0], [0, 0, 0], [1.16, 0.96, 0.98]);
  for (const s of [-1, 1]) add(head, sph(R * 0.55, 16, 12), fur, [s * R * 0.62, -R * 0.38, R * 0.32], [0, 0, 0], [1, 0.8, 0.85]);
  for (const s of [-1, 1]) add(head, sph(R * 0.27, 14, 10), cream, [s * R * 0.2, -R * 0.38, R * 0.84], [0, 0, 0], [1.05, 0.85, 0.75]);
  add(head, sph(R * 0.22, 12, 8), cream, [0, -R * 0.58, R * 0.72], [0, 0, 0], [1.1, 0.7, 0.8]);
  add(head, cone(R * 0.11, R * 0.12, 3), pink, [0, -R * 0.2, R * 0.98], [Math.PI / 2 + 0.25, Math.PI, 0], [1.2, 1, 0.8]);
  add(head, cap(R * 0.012, R * 0.08, 3, 6), dark, [0, -R * 0.33, R * 0.98]);
  for (const s of [-1, 1]) add(head, tor(R * 0.1, R * 0.014, 5, 12, Math.PI), dark, [s * R * 0.1, -R * 0.4, R * 0.95], [0, 0, Math.PI]);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) add(head, cyl(0.0022, 0.0012, R * 1.1, 4), mat(0xfffaf0), [s * R * 0.62, -R * 0.36 + (k - 1) * R * 0.07, R * 0.86], [0, s * 0.35, Math.PI / 2 + s * (k - 1) * 0.12]);
  for (let i = -1; i <= 1; i++) add(head, cap(R * 0.035, R * 0.22, 4, 8), stripe, [i * R * 0.17, R * 0.62, R * 0.62], [0.95, 0, i * 0.25]);
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) add(head, cap(R * 0.03, R * 0.2, 4, 8), stripe, [s * R * 1.0, R * 0.05 - k * R * 0.17, R * 0.25], [0, s * 0.5, Math.PI / 2]);
  // MEWING Gerald (the mewing-cat meme, kept clean): firmer, slightly fuller cheeks, a defined jaw and chin, soft smile-line
  // creases from the nose, small pink lips pressed out. Hidden unless face({ mew: 0..1 }) / AFACES.mew.
  const mew = new THREE.Group(); mew.visible = false; head.add(mew);
  const creaseM = mat(0xc56a2a, { rough: 0.9 }), lipM = mat(0xe58a8f, { rough: 0.4 });
  const mseg = (a, b, r, m = creaseM) => { const A = new THREE.Vector3(...a).multiplyScalar(R), B = new THREE.Vector3(...b).multiplyScalar(R), d = B.clone().sub(A); const q = add(mew, cap(R * r, Math.max(0.001, d.length() - R * r), 4, 10), m, A.clone().add(B).multiplyScalar(0.5).toArray()); q.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); q.castShadow = false; };
  for (const s of [-1, 1]) {
    add(mew, sph(R * 0.36, 20, 14), fur, [s * R * 0.62, -R * 0.5, R * 0.48], [0, 0, 0], [0.95, 1.05, 0.85]);              // firm cheeks
    mseg([s * 0.2, -0.3, 0.97], [s * 0.34, -0.6, 0.9], 0.024);                                                              // soft smile-line crease
  }
  add(mew, sph(R * 0.24, 18, 14), cream, [0, -R * 0.66, R * 0.74], [0.3, 0, 0], [1.2, 0.8, 0.9]);                          // firm chin
  add(mew, sph(R * 0.1, 14, 10), lipM, [0, -R * 0.5, R * 0.97], [0, 0, 0], [1.3, 0.5, 0.75]);                              // pursed lips
  // eyes: series look (episodes 1-2): white ball, round black pupil, no iris colour or catchlight; heavy upper lid is his signature
  const eyes = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(s * R * 0.36, R * 0.14, R * 0.8); eg.rotation.set(0, s * 0.28, 0); head.add(eg);
    const er = R * 0.25;
    add(eg, sph(er, 24, 16), mat(0xffffff, { rough: 0.35 }), [0, 0, 0], [0, 0, 0], [1, 1.08, 0.62]);
    const pg = new THREE.Group(); pg.position.z = er * 0.5; eg.add(pg);
    const pupil = add(pg, sph(er * 0.46, 16, 12), mat(0x0a0a0e, { rough: 0.3 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.4]);
    const lp = new THREE.Group(); eg.add(lp);
    add(lp, sph(er * 1.06, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), fur, [0, 0, 0], [0, 0, 0], [1.02, 1.1, 0.66]).castShadow = false;
    const heart = add(eg, HEART_EYE, HEART_EYE_M, [0, 0, er * 0.42], [0, 0, 0], [er * 2.3, er * 2.3, er * 0.9]); heart.visible = false; heart.castShadow = false;
    eyes.push({ eg, pg, pupil, lp, s, bx: 1, by: 1, heart, hs: er * 2.3 });
  }
  // ears: flat rounded triangles with pink insides and a cream tuft
  const ears = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * R * 0.62, R * 0.62, -R * 0.05); e.rotation.set(-0.15, s * -0.35, s * -0.28); head.add(e); ears.push(e);
    add(e, tri(R * 0.75, R * 0.8, R * 0.06), fur);
    add(e, tri(R * 0.48, R * 0.56, R * 0.03), pink, [0, R * 0.06, R * 0.07]);
    add(e, cone(R * 0.05, R * 0.18, 5), cream, [s * -R * 0.05, R * 0.2, R * 0.1], [0.2, 0, s * 0.3]);
  }
  // tail: tapered chain with alternating stripe rings and a dark tip
  const tail = [], tbase = new THREE.Group(); tbase.position.set(0, 0.04, -0.03); hips.add(tbase);
  let parent = tbase;
  for (let i = 0; i < 9; i++) {
    const seg = new THREE.Group(); seg.position.z = i === 0 ? 0 : -0.058; parent.add(seg);
    add(seg, cap(0.036 - i * 0.0022, 0.05, 4, 10), i % 2 ? stripe : fur, [0, 0, -0.03], [Math.PI / 2, 0, 0]);
    tail.push(seg); parent = seg;
  }
  add(tail[8], sph(0.024, 10, 8), stripe, [0, 0, -0.06]);
  const a = { root, pivot, body: hips, hips, chest, neck, head, legs, tail, eyes, ears, mew, S: { headR: R }, kind: 'cat', opts: o, L, HIPY };
  root.scale.setScalar(o.scale ?? 1);
  a.pose = (p) => { applyCatPose(a, p); if (!p.air) plantA(a); };
  a.face = (f) => applyAFace(a, f);
  a.pose(APOSES.stand(0)); a.face({});
  return a;
}

function applyCatPose(a, p) {
  const j = { ...AJ, ...p };
  a.pivot.rotation.set(0, j.yaw, j.roll);
  a.pivot.scale.set(1 / Math.sqrt(j.squash), j.squash, 1 / Math.sqrt(j.squash));
  const sit = Math.min(1, Math.max(0, -j.pitch) / 0.75), tuck = j.tuck;
  const pitch = j.pitch * (j.pitch < 0 ? 0.72 : 1);       // a cat sits with its haunches on the floor: gentler tilt, hips dropped
  a.hips.rotation.x = pitch; a.hips.position.y = a.HIPY - sit * 0.12;
  a.neck.rotation.x = j.neckX - pitch * 0.6;              // keeps the head level-ish when sitting
  a.head.rotation.set(j.hx, j.hy, j.hz);
  a.legs.forEach((g, i) => {
    const { inner, len, front } = g.userData, swing = [j.legFL, j.legFR, j.legBL, j.legBR][i];
    if (front) {   // stay vertical while the body pitches up, stretch to reach the floor from the raised chest
      g.rotation.x = -pitch + swing * (1 - sit);
      inner.scale.set(1 + sit * 0.15, (1 + (Math.sin(-pitch) * a.L - sit * 0.12) / len) * (1 - tuck * 0.75), 1 + sit * 0.15);
    } else {       // fold forward under the haunches when sitting, tuck away when loafing
      g.rotation.x = swing * (1 - sit) - sit * 1.25; inner.scale.set(1, 1 - tuck * 0.75 - sit * 0.35, 1);
    }
  });
  a.tail.forEach((s, i) => { s.rotation.x = (i === 0 ? -j.tailBase : 0) + (i > 0 ? j.tailCurl * 0.7 : 0); s.rotation.y = Math.sin(j.tailT * 3 - i * 0.6) * j.tailWave * (i === 0 ? 0.3 : 0.8); });
  const tw = Math.max(0, Math.sin((j._t ?? 0) * 0.83 + 1.3) - 0.93) * 12;
  a.ears.forEach((e, i) => { e.rotation.z = (i ? -0.28 : 0.28) + (i ? -1 : 1) * tw * 0.2; });
  a._t = j._t ?? 0;
}
