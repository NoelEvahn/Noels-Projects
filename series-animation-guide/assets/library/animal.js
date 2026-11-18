// Quadruped rig: cat (Gerald), dog, rabbit, rat. Faces +Z, paws at y=0.
//   const g = makeAnimal('cat', ANIMALS.gerald); g.pose(APOSES.loaf(t)); g.face({lid:0.45});
import * as THREE from 'three';
import { mat, add, sph, cyl, cap, cone, tor, canvasTex, C } from './util.js';
import { buildCat } from './cat.js';

const SPEC = {
  cat:    { bodyR: 0.27, bodyLen: 0.2, headR: 0.27, legH: 0.2, legR: 0.07, tail: { n: 6, len: 0.13, r: 0.05 }, ear: 'tri' },
  dog:    { bodyR: 0.27, bodyLen: 0.44, headR: 0.26, legH: 0.26, legR: 0.08, tail: { n: 3, len: 0.1, r: 0.055 }, ear: 'floppy', snout: true },
  rabbit: { bodyR: 0.25, bodyLen: 0.2, headR: 0.22, legH: 0.12, legR: 0.07, tail: { n: 1, len: 0.05, r: 0.07 }, ear: 'long' },
  rat:    { bodyR: 0.15, bodyLen: 0.3, headR: 0.15, legH: 0.09, legR: 0.04, tail: { n: 8, len: 0.1, r: 0.02 }, ear: 'round', snout: true, pointy: true },
};

export const ANIMALS = {
  gerald: { kind: 'cat', fur: 0xf08a2e, stripe: 0xb8531a, belly: 0xfff0d8, iris: 0xc4e05a, stripes: true, socks: true, scale: 1, lid: 0.45 },
  dog:    { kind: 'dog', fur: 0xd8a060, stripe: 0x8a5a2a, belly: 0xfff0d8, iris: 0x3a2a1a, spots: true, scale: 1.0 },
  rabbit: { kind: 'rabbit', fur: 0xf6f2ec, belly: 0xffffff, inner: 0xffb6c8, iris: 0x2a2a30, scale: 0.8 },
  rat:    { kind: 'rat', fur: 0xb9b0a8, belly: 0xe8e0d8, inner: 0xf0a0a8, iris: 0x15151a, scale: 1 },
};

function furTexture(o) {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#' + o.fur.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h);
    if (o.stripes) { g.fillStyle = '#' + o.stripe.toString(16).padStart(6, '0'); for (let i = 0; i < 10; i++) { g.beginPath(); g.roundRect(i * (w / 10) + 3, 10, w / 22, h * 0.7, 6); g.fill(); } }
    if (o.spots) { g.fillStyle = '#' + o.stripe.toString(16).padStart(6, '0'); [[20, 30, 20], [80, 60, 24], [50, 100, 16]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }); }
  });
}

export function makeAnimal(kind = 'cat', o = {}) {
  const sp = SPEC[kind]; o = { ...ANIMALS[kind === 'cat' ? 'gerald' : kind], ...o };
  if (kind === 'cat') return buildCat(o);   // Gerald v2 (cat.js)
  const S = sp, root = new THREE.Group(), pivot = new THREE.Group(); root.add(pivot);
  const fur = mat(o.fur, { rough: 0.85 }), furMap = mat(0xffffff, { rough: 0.85, map: furTexture(o) }), belly = mat(o.belly ?? o.fur, { rough: 0.85 });
  const body = new THREE.Group(); body.position.y = S.legH + S.bodyR * 0.8; pivot.add(body);
  const torso = add(body, cap(S.bodyR, S.bodyLen, 8, 20), furMap, [0, 0, 0], [Math.PI / 2, 0, 0], [1, 0.92, 1]);
  add(body, sph(S.bodyR * 0.9, 16, 12), belly, [0, -S.bodyR * 0.25, S.bodyLen * 0.45], [0, 0, 0], [0.85, 0.9, 0.9]);        // chest patch
  for (const s of [-1, 1]) add(body, sph(S.bodyR * 0.82, 20, 14), furMap, [s * S.bodyR * 0.55, -S.bodyR * 0.12, -S.bodyLen * 0.5], [0, 0, 0], [0.8, 0.95, 1.0]);   // haunches
  // neck + head
  const neck = new THREE.Group(); neck.position.set(0, S.bodyR * 0.35, S.bodyLen / 2 + S.bodyR * 0.55); body.add(neck);
  const head = new THREE.Group(); head.position.set(0, S.headR * 0.35, S.headR * 0.2); neck.add(head);
  const R = S.headR;
  add(head, sph(R, 32, 22), fur, [0, 0, 0], [0, 0, 0], [kind === 'rat' ? 0.9 : 1.14, 0.96, 1]);
  const lights = [];
  // cheeks/muzzle
  if (S.snout) {
    add(head, sph(R * 0.55, 18, 12), belly, [0, -R * 0.3, R * 0.7], [0, 0, 0], [0.9, 0.8, S.pointy ? 1.5 : 1.15]);
    add(head, sph(R * 0.13, 10, 8), mat(0x1a1a1f, { rough: 0.3 }), [0, -R * 0.12, R * (S.pointy ? 1.5 : 1.22)]);
  } else {
    add(head, sph(R * 0.3, 16, 12), belly, [0, -R * 0.4, R * 0.76], [0, 0, 0], [1.1, 0.55, 0.7]);
    add(head, sph(R * 0.1, 10, 8), mat(0xf08a9a, { rough: 0.4 }), [0, -R * 0.14, R * 0.93], [0, 0, 0], [1.25, 0.85, 0.8]);   // nose
    // w-mouth
    for (const s of [-1, 1]) add(head, tor(R * 0.09, R * 0.015, 5, 12, Math.PI), mat(0x5a2a22), [s * R * 0.09, -R * 0.36, R * 0.93], [0, 0, Math.PI]);
    // whiskers
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) add(head, cyl(R * 0.008, R * 0.008, R * 0.75, 4), mat(0xfff8ee), [s * R * 0.6, -R * 0.3 - (k - 1) * R * 0.06, R * 0.78], [0.0, 0, Math.PI / 2 + s * (k - 1) * 0.12 * -1 + 0.0], 1);
  }
  // eyes (big, with lids)
  const eyes = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(s * R * 0.45, R * 0.18, R * 0.78); eg.rotation.y = s * 0.35; head.add(eg);
    const er = R * 0.27;
    add(eg, sph(er, 22, 16), mat(o.iris, { rough: 0.25, emissive: o.iris, emissiveIntensity: 0.15 }), [0, 0, 0], [0, 0, 0], [1, 1.1, 0.6]);
    const pg = new THREE.Group(); pg.position.z = er * 0.5; eg.add(pg);
    const pupil = add(pg, sph(er * 0.5, 14, 10), mat(0x0a0a0e, { rough: 0.2 }), [0, 0, 0], [0, 0, 0], [kind === 'cat' ? 0.55 : 1, kind === 'cat' ? 1.15 : 1, 0.4]);
    add(pg, sph(er * 0.16, 8, 6), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.5 }), [er * 0.15, er * 0.2, er * 0.15], [0, 0, 0], [1, 1, 0.4]);
    const lp = new THREE.Group(); eg.add(lp);
    add(lp, sph(er * 1.04, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), fur, [0, 0, 0], [0, 0, 0], [1, 1.1, 0.63]).castShadow = false;
    eyes.push({ eg, pg, pupil, lp, s });
  }
  // ears
  const ears = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * R * 0.62, R * 0.68, -R * 0.05); head.add(e); ears.push(e);
    if (S.ear === 'tri') { add(e, cone(R * 0.34, R * 0.6, 4), fur, [0, R * 0.2, 0], [0, Math.PI / 4, -s * 0.2]); add(e, cone(R * 0.2, R * 0.4, 4), mat(0xf5a0a8), [0, R * 0.16, R * 0.06], [0, Math.PI / 4, -s * 0.2]); }
    else if (S.ear === 'floppy') add(e, sph(R * 0.38, 14, 10), mat(o.stripe ?? o.fur), [s * R * 0.12, -R * 0.35, 0], [0, 0, s * 0.3], [0.5, 1.3, 0.8]);
    else if (S.ear === 'long') { add(e, cap(R * 0.2, R * 1.0, 6, 12), fur, [s * R * 0.12, R * 0.65, 0], [0, 0, -s * 0.18], [1, 1, 0.5]); add(e, cap(R * 0.12, R * 0.8, 6, 12), mat(o.inner), [s * R * 0.12, R * 0.65, R * 0.07], [0, 0, -s * 0.18], [1, 1, 0.4]); }
    else add(e, sph(R * 0.55, 16, 12), mat(o.inner ?? o.fur), [s * R * 0.2, R * 0.2, 0], [0, 0, 0], [1, 1, 0.3]);
  }
  if (o.stripes) for (let i = -1; i <= 1; i++) add(head, cap(R * 0.04, R * 0.2, 4, 8), mat(o.stripe), [i * R * 0.18, R * 0.82, R * 0.52], [0.9, 0, i * 0.2]);  // forehead stripes
  if (o.stripes) for (const s of [-1, 1]) for (let k = 0; k < 2; k++) add(head, cap(R * 0.03, R * 0.18, 4, 8), mat(o.stripe), [s * R * 0.9, -R * 0.1 - k * R * 0.14, R * 0.38], [0, 0, Math.PI / 2 + s * 0.1]);
  if (kind === 'dog') { const tongue = add(head, sph(R * 0.14, 10, 8), mat(0xf06a7a), [0, -R * 0.62, R * 1.0], [0, 0, 0], [1, 1.7, 0.5]); tongue.visible = false; head.userData.tongue = tongue; }

  // legs
  const legs = [];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const hip = new THREE.Group(); hip.position.set(x * S.bodyR * 0.55, -S.bodyR * 0.45, z * S.bodyLen * 0.5); body.add(hip);
    add(hip, cap(S.legR, S.legH * 0.6, 5, 10), fur, [0, -S.legH * 0.45, 0]);
    add(hip, sph(S.legR * 1.35, 12, 8), o.socks ? mat(0xfff6ea) : fur, [0, -S.legH * 0.98, S.legR * 0.5], [0, 0, 0], [1, 0.7, 1.35]);
    legs.push(hip);
  }
  // tail chain
  const tail = []; let parent = body; let ty = 0;
  const base = new THREE.Group(); base.position.set(0, S.bodyR * 0.15, -S.bodyLen / 2 - S.bodyR * 0.72); body.add(base);
  parent = base;
  for (let i = 0; i < S.tail.n; i++) {
    const seg = new THREE.Group(); seg.position.z = i === 0 ? 0 : -S.tail.len * 0.85; parent.add(seg);
    const r = S.tail.r * (kind === 'rat' ? 1 : 1 - i * 0.04);
    add(seg, cap(r, S.tail.len * 0.9, 4, 8), kind === 'rat' ? mat(o.inner) : (o.stripes && i % 2 ? mat(o.stripe) : fur), [0, 0, -S.tail.len * 0.5], [Math.PI / 2, 0, 0]);
    tail.push(seg); parent = seg;
  }
  if (kind === 'rabbit') add(tail[0], sph(S.tail.r * 1.2, 10, 8), mat(0xffffff), [0, 0, -0.04]);

  const a = { root, pivot, body, neck, head, legs, tail, eyes, S, kind, opts: o };
  root.scale.setScalar(o.scale ?? 1);
  a.ears = ears;
  a.pose = (p) => { applyAPose(a, p); if (!p.air) plantA(a); };   // always grounded on whatever it stands/sits on (p.air: jumping)
  a.face = (f) => applyAFace(a, f);
  a.pose(APOSES.stand(0)); a.face({});
  return a;
}

// Drop the animal so its lowest point rests on y=0 of its root (fixes hovering in sit/loaf/sleep on fences, seats, registers).
const _box = new THREE.Box3(), _v = new THREE.Vector3();
export function plantA(a) {
  a.pivot.position.y = 0; a.root.updateMatrixWorld(true);
  _box.makeEmpty(); const tailRoot = a.tail[0]?.parent; a.pivot.traverse((o) => { let q = o; while (q && q !== a.pivot) { if (q === tailRoot) return; q = q.parent; } if (o.isMesh && o.visible) { o.geometry.boundingBox ?? o.geometry.computeBoundingBox(); _box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); } });
  a.root.getWorldPosition(_v); const sc = a.root.getWorldScale(new THREE.Vector3()).y;
  a.pivot.position.y = -(_box.min.y - _v.y) / sc + (a.lift ?? 0);
}
// Secondary motion layered on every pose: breathing, slow head drift, tail sway, ear twitches, blinks. Pure functions of t.
const life = (t, k = 1) => ({ squash: 1 + Math.sin(t * 2.4) * 0.012 * k, hy: Math.sin(t * 0.37) * 0.12 * k + Math.sin(t * 0.91) * 0.04 * k, hz: Math.sin(t * 0.53) * 0.05 * k, tailWave: 0.22 * k, tailT: t, _t: t });
export const AJ = { bob: 0, pitch: 0, hx: 0, hy: 0, hz: 0, neckX: 0, legFL: 0, legFR: 0, legBL: 0, legBR: 0, tuck: 0, tailBase: 0.6, tailCurl: 0.15, tailWave: 0, tailT: 0, squash: 1, yaw: 0, roll: 0 };
function applyAPose(a, p) {
  const j = { ...AJ, ...p }, S = a.S;
  a.pivot.position.y = j.bob; a.pivot.rotation.y = j.yaw;
  a.body.rotation.set(j.pitch, 0, j.roll);
  a.pivot.scale.set(1 / Math.sqrt(j.squash), j.squash, 1 / Math.sqrt(j.squash));
  a.neck.rotation.x = j.neckX;
  a.head.rotation.set(j.hx, j.hy, j.hz);
  const L = a.legs; // FL, FR, BL, BR
  [j.legFL, j.legFR, j.legBL, j.legBR].forEach((v, i) => { L[i].rotation.x = v; L[i].scale.set(1, 1 - j.tuck * 0.85, 1); L[i].position.y = -S.bodyR * 0.45 + j.tuck * S.legH * 0.3; });
  if (a.ears) { const tw = Math.max(0, Math.sin((j._t ?? 0) * 0.83 + 1.3) - 0.93) * 12; a.ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * tw * 0.25; }); }
  a._t = j._t ?? 0;
  a.tail.forEach((s, i) => { s.rotation.x = (i === 0 ? -j.tailBase : 0) + (i > 0 ? j.tailCurl : 0); s.rotation.y = Math.sin(j.tailT * 3 - i * 0.7) * j.tailWave * (i === 0 ? 0.3 : 1); });
}
const as = Math.sin, API = Math.PI;
export const APOSES = {
  stand: (t = 0) => ({ bob: as(t * 2) * 0.004, tailBase: 0.5, tailCurl: 0.18, tailWave: 0.15, tailT: t }),
  walk: (t = 0, k = 7) => { const a = as(t * k), b = as(t * k + API); return { bob: Math.abs(a) * 0.02, legFL: a * 0.6, legBR: a * 0.6, legFR: b * 0.6, legBL: b * 0.6, tailBase: 0.9, tailCurl: 0.12, tailWave: 0.25, tailT: t, hx: a * 0.03 }; },
  trot: (t = 0, k = 12) => { const a = as(t * k), b = as(t * k + API); return { bob: Math.abs(a) * 0.04, legFL: a * 0.9, legBR: a * 0.9, legFR: b * 0.9, legBL: b * 0.9, tailBase: 0.9, tailCurl: 0.1, tailWave: 0.4, tailT: t * 2, pitch: -0.05 }; },
  sit: (t = 0) => ({ pitch: -0.75, bob: -0.02, legFL: 0.1, legFR: 0.1, legBL: -1.5, legBR: -1.5, neckX: 0.5, hx: -0.2, tailBase: 0.0, tailCurl: 0.15, tailWave: 0.1, tailT: t }),
  loaf: (t = 0) => ({ tuck: 1, bob: -0.12, neckX: 0.05, hx: 0.0, tailBase: -0.2, tailCurl: 0.5, tailWave: 0.05, tailT: t, squash: 0.97 }),
  sleep: (t = 0) => ({ tuck: 1, bob: -0.12, hx: 0.35, neckX: 0.35, tailBase: -0.3, tailCurl: 0.7, squash: 0.95 + as(t * 2) * 0.01 }),
  stare: (t = 0) => ({ pitch: -0.1, hx: 0.0, tailBase: 0.2, tailCurl: 0.05, tailWave: 0.5, tailT: t * 1.5, neckX: 0.1 }),
  pounce: (t = 0) => ({ pitch: 0.45, legFL: -1.0, legFR: -1.0, legBL: 0.8, legBR: 0.8, bob: 0.08, tailBase: 1.2, tailCurl: 0.1, tailWave: 0.3, tailT: t }),
  stretch: (t = 0) => ({ pitch: 0.35, legFL: -1.5, legFR: -1.5, tailBase: 1.1, tailCurl: 0.3, hx: 0.3, bob: -0.04 }),
  shock: (t = 0) => ({ squash: 1.08, bob: 0.1, tailBase: 1.4, tailCurl: 0.0, tailWave: 0.6, tailT: t * 6, hx: -0.2, legFL: 0.2, legFR: 0.2 }),
  lookAway: (t = 0) => ({ hy: 0.7, hx: -0.1, tailBase: 0.3, tailCurl: 0.3, tailWave: 0.3, tailT: t, neckX: 0.05 }),
};
// every pose gets the life layer (pose values win for keys they set, squash/hy multiply in)
for (const [k, f] of Object.entries(APOSES)) APOSES[k] = (t = 0, ...rest) => { const p = f(t, ...rest), l = life(t, k === 'sleep' ? 0.4 : 1); return { ...l, ...p, squash: (p.squash ?? 1) * l.squash, hy: (p.hy ?? 0) + l.hy, hz: (p.hz ?? 0) + l.hz, tailWave: Math.max(p.tailWave ?? 0, l.tailWave), tailT: p.tailT ?? t, _t: t }; };
const AFD = { lid: 0.0, look: [0, 0], pupil: 1, open: 0 };
export function applyAFace(a, f) {
  const o = { ...AFD, lid: a.opts.lid ?? 0, ...f }, R = a.S.headR;
  const bp = ((a._t ?? 0) + (a.opts.seed ?? 0) * 0.7) % 3.7; if (f.blink !== false && bp < 0.16) o.lid = Math.max(o.lid, 1 - Math.abs(bp - 0.08) / 0.08 * 0.6);   // slow, lazy blink
  for (const e of a.eyes) { e.lp.rotation.x = -Math.PI / 2 + o.lid * Math.PI * 1.02; e.pg.position.x = o.look[0] * R * 0.1; e.pg.position.y = o.look[1] * R * 0.1; e.pupil.scale.x = (a.kind === 'cat' ? 0.55 : 1) * o.pupil; e.pupil.scale.y = (a.kind === 'cat' ? 1.15 : 1) * o.pupil; }
  if (a.head.userData.tongue) a.head.userData.tongue.visible = o.open > 0.3;
}
export const AFACES = { deadpan: { lid: 0.45 }, bored: { lid: 0.55 }, annoyed: { lid: 0.35, look: [0.8, 0.3] }, shock: { lid: 0, pupil: 1.5 }, sleepy: { lid: 0.9 }, judging: { lid: 0.5, look: [-0.8, 0.2] }, happy: { lid: 0.1, open: 1 }, closed: { lid: 1 } };
