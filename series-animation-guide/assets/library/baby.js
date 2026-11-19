// Baby: the people rig at toddler proportions (big bald head, short body, bare feet) + a crying face with modelled tears.
//   const baby = makeBaby(); scene.add(baby.root);          // feet/bottom at y=0, faces +Z
//   baby.pose(BABY_POSES.sit(t));                            // sitting on the ground, legs splayed forward (sand-pit pose)
//   baby.cry(k, t);                                          // 0..1: scrunched eyes, wide wailing mouth, tears running down
// First used in episode 4 (the sand-pit reel). Same series look: dot eyes, bulb nose, ball hands.
import * as THREE from 'three';
import { makeCharacter, SKIN } from './character.js';
import { mat, add, sph, cap } from './util.js';

export const BABY_PRESET = {
  skin: SKIN.peach, seed: 11, hair: { style: 'bald', color: 0 }, brow: 0xc8a07a,
  outfit: { type: 'stripes', color: 0xf6f6f2, color2: 0x1c1c22 }, pants: { type: 'long', color: 0x6c6f7a },
  height: 0.46, head: 1.62, width: 1.12, eyeSize: 1.12, nose: 0.75, blush: 1,
};

export function makeBaby(opts = {}) {
  const o = { ...BABY_PRESET, ...opts };
  const ch = makeCharacter({ ...o, shoes: o.skin, shoeSole: o.skin, socks: o.skin });
  // bare feet: every foot part (toe cap, laces, tongue) in skin, plus little toes
  const skinM = mat(o.skin, { rough: 0.6 });
  for (const f of ch.feet) {
    f.traverse((m) => { if (m.isMesh) m.material = skinM; });
    for (let i = 0; i < 4; i++) add(f, sph(0.026, 8, 6), skinM, [(i - 1.5) * 0.04, 0.0, 0.205 - Math.abs(i - 1.5) * 0.012]);
  }
  // soft baby hair fuzz on top (a few tiny tufts, not a hairstyle)
  const R = ch.R, fuzz = mat(0xb08a62, { rough: 0.9 });
  for (let i = 0; i < 5; i++) { const a = -0.5 + i * 0.25; add(ch.head, cap(R * 0.03, R * 0.12, 3, 6), fuzz, [Math.sin(a) * R * 0.25, R * 0.98, Math.cos(a) * R * 0.1], [0.3, 0, a]); }
  // tears: two streams of drops on the cheeks, hidden until cry()
  const tearM = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.85, emissive: 0x4aa8ff, emissiveIntensity: 0.25 });
  const tears = [], spray = [];
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) { const d = add(ch.head, sph(R * 0.075, 10, 8), tearM, [0, 0, 0], [0, 0, 0], [0.8, 1.3, 0.6]); d.castShadow = false; d.visible = false; tears.push({ d, s, k }); }
  // big cartoon tear jets: drops squirting sideways out of the eyes in arcs (cry k > 0.6)
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const d = add(ch.head, sph(R * 0.07, 10, 8), tearM, [0, 0, 0]); d.castShadow = false; d.visible = false; spray.push({ d, s, k }); }
  const face = ch.face;
  ch.cry = (k, t = 0) => {
    const w = Math.sin(t * 9) * 0.1;   // wailing rhythm
    face({ open: k * (0.95 + w), wide: 1 + 0.9 * k, teeth: k > 0.5, lid: 0.92 * k, eye: 1 - 0.15 * k, brow: 0.9 * k, browTilt: 1.2 * k, smile: k > 0.05 ? 0 : 0.3, blink: k < 0.05 });
    for (const { d, s, k: i } of tears) {
      d.visible = k > 0.2;
      const u = ((t * 2.2 + i / 6) % 1);                            // each drop streams down the cheek and restarts
      d.position.set(s * R * (0.36 + u * 0.14), R * (-0.02 - u * 0.75), R * (0.9 - u * 0.15));
      d.scale.setScalar(k * (1.1 - u * 0.4));
    }
    for (const { d, s, k: i } of spray) {
      d.visible = k > 0.6;
      const u = ((t * 2.6 + i / 5) % 1);                            // ballistic arc out from the eye
      d.position.set(s * R * (0.4 + u * 1.3), R * (0.15 + u * 0.5 - u * u * 1.6), R * (0.85 + u * 0.2));
      d.scale.setScalar(k * (1 - u * 0.5));
    }
  };
  ch.face = (f) => { for (const x of tears) x.d.visible = false; for (const x of spray) x.d.visible = false; face(f); };
  return ch;
}

// Poses at baby proportions (rig units, before the 0.46 height scale)
const sin = Math.sin;
export const BABY_POSES = {
  // sitting on the ground, legs splayed forward in a V, hands resting near the knees
  sit: (t = 0, o = {}) => ({ bob: -0.43, lean: 0.06 + sin(t * 1.7) * 0.02, hy: sin(t * 0.9) * 0.12, lLf: 1.5, lRf: 1.5, lLs: 0.38, lRs: 0.38, lLk: 0.15, lRk: 0.15, footFlat: 0, aLf: 0.7, aRf: 0.7, aLs: 0.35, aRs: 0.35, aLe: 0.5, aRe: 0.5, hL: 'relaxed', hR: 'relaxed', ...o }),
  // tipping back (k 0..1): arms fly up, legs kick
  tip: (t = 0, k = 1) => ({ bob: -0.43, lean: -0.5 * k, hx: -0.35 * k, lLf: 1.5 + 0.4 * k, lRf: 1.5 + 0.4 * k, lLs: 0.45, lRs: 0.45, lLk: 0.2, lRk: 0.2, aLf: 0.7 + 0.8 * k, aRf: 0.7 + 0.8 * k, aLs: 0.35 + 1.0 * k, aRs: 0.35 + 1.0 * k, aLe: 0.3, aRe: 0.3, hL: 'spread', hR: 'spread' }),
  // crying while sitting: fists by the eyes, shoulders up
  cry: (t = 0) => ({ bob: -0.43, lean: 0.12, hx: -0.12 + sin(t * 7) * 0.04, lLf: 1.5, lRf: 1.5, lLs: 0.4, lRs: 0.4, lLk: 0.15, lRk: 0.15, aLf: 1.25, aRf: 1.25, aLs: 0.5, aRs: 0.5, aLe: 1.6 + sin(t * 7) * 0.15, aRe: 1.6 - sin(t * 7) * 0.15, hL: 'fist', hR: 'fist' }),
  // full tantrum (k 0..1): head thrown back wailing, fists pumping up and down out of step, legs kicking, whole body shaking
  wail: (t = 0, k = 1) => { const a = sin(t * 11), b = sin(t * 11 + 2.2), c = sin(t * 13 + 1); return { bob: -0.43 + Math.abs(sin(t * 9)) * 0.03 * k, lean: (-0.22 + sin(t * 4.5) * 0.08) * k, roll: sin(t * 17) * 0.05 * k, hx: (-0.38 + sin(t * 9) * 0.1) * k, hz: sin(t * 6) * 0.12 * k,
    lLf: 1.5 + c * 0.45 * k, lRf: 1.5 - c * 0.45 * k, lLs: 0.45, lRs: 0.45, lLk: 0.2 + Math.max(0, c) * 0.6 * k, lRk: 0.2 + Math.max(0, -c) * 0.6 * k,
    aLf: 0.9 + a * 0.55 * k, aRf: 0.9 + b * 0.55 * k, aLs: 0.9 + a * 0.4 * k, aRs: 0.9 + b * 0.4 * k, aLe: 0.9 + a * 0.4, aRe: 0.9 + b * 0.4, hL: 'fist', hR: 'fist', squash: 1 + sin(t * 9) * 0.03 * k }; },
};
