// Shared helpers for the episode-5 parts: cameras and shots, the hero's jump poses, cast builders, Gerald, small FX.
import * as THREE from 'three';
import { makeCharacter, PRESETS, POSES, FACES } from '../../assets/library/character.js';
import { makeAnimal, APOSES, AFACES, ANIMALS } from '../../assets/library/animal.js';
import { rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, easeInOut, mat, glow, add, sph, box, cyl, cone, tor, rbox } from '../../assets/library/util.js';
import { makeStage } from '../../assets/library/stage.js';
import { glowPoints } from '../../assets/library/fx/dunk.js';
export { THREE, makeCharacter, PRESETS, POSES, FACES, makeAnimal, APOSES, AFACES, ANIMALS, rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, easeInOut, mat, glow, add, sph, box, cyl, cone, tor, rbox, makeStage, glowPoints };

export const D2R = Math.PI / 180;
export const cam = (pos, target, fov = 40, roll = 0) => ({ pos, target, fov, roll });
// camera on a focus point f: az (deg, 0 = from +Z), dist, elev (m above f.y), fov; lift raises the aim so faces sit below the HUD band
export const orbit = (f, az, dist, elev = 0.3, fov = 40, lift = 0.0, roll = 0) => ({ pos: [f[0] + Math.sin(az * D2R) * dist, f[1] + elev, f[2] + Math.cos(az * D2R) * dist], target: [f[0], f[1] + lift, f[2]], fov, roll });
export const mixCam = (a, b, k) => ({ pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)), target: a.target.map((v, i) => lerp(v, b.target[i], k)), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k) });
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const pops = (t, birth, dur = 0.35) => (t < birth ? 0 : easeOutBack(clamp((t - birth) / dur)));
export const hash = (n, s = 1) => { const x = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
export const place = (o, x, y, z, ry = 0) => { const r = o.root ?? o; r.position.set(x, y, z); r.rotation.y = ry; return o; };
export const yawTo = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]);

// ---- the hero
export function makeHero(scene) { const h = makeCharacter(PRESETS.hero); scene.add(h.root); h.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return h; }
// jump poses
export const P = {
  crouch: (k = 1) => ({ bob: -0.22 * k, lLf: 0.9 * k, lRf: 0.9 * k, lLk: 1.6 * k, lRk: 1.6 * k, lean: 0.25 * k, aLf: -0.6 * k, aRf: -0.6 * k, aLe: 0.3, aRe: 0.3, aLs: 0.25, aRs: 0.25, hx: -0.1 * k, footFlat: 1, hL: 'fist', hR: 'fist' }),
  launch: (k = 1) => ({ lLf: -0.15, lRf: -0.15, lLk: 0.1, lRk: 0.1, aLs: 2.6 * k + 0.2, aRs: 2.6 * k + 0.2, aLf: 0.3, aRf: 0.3, aLe: 0.15, aRe: 0.15, hx: -0.25, lean: -0.05, hL: 'fist', hR: 'fist' }),
  // superhero rise: right fist up, left arm back, legs trailing, slight knee bend; wobble with time
  rise: (t = 0) => ({ aRs: 2.9, aRf: 0.2, aRe: 0.05, aLs: 0.5, aLf: -0.5, aLe: 0.4, lLf: -0.1 + Math.sin(t * 4) * 0.05, lRf: 0.25 + Math.sin(t * 4 + 1) * 0.05, lLk: 0.15, lRk: 0.55, lean: -0.05, hx: -0.12, hR: 'fist', hL: 'open', bob: 0 }),
  // face-close travel: both arms tucked, looking up into the wind
  streak: (t = 0) => ({ aRs: 0.25, aLs: 0.25, aRf: -0.4, aLf: -0.4, aRe: 0.3, aLe: 0.3, lLf: -0.05, lRf: 0.2, lLk: 0.2, lRk: 0.45, hx: -0.18 + Math.sin(t * 3) * 0.03, hR: 'fist', hL: 'fist' }),
  hop: (u) => { const air = Math.sin(Math.PI * clamp(u)); return { ...P.launch(air), aLs: 1.5 * air + 0.2, aRs: 1.5 * air + 0.2, lLk: 0.4 * air, lRk: 0.4 * air, lLf: 0.3 * air, lRf: 0.3 * air }; },
  laPeace: (t, extra = {}) => ({ ...POSES.laPeace(t), ...extra }),
};
// hero face while flying: determined, little smile
export const F = { fly: { smile: 0.45, brow: 0.3, browTilt: -0.2, lid: 0.12 }, wow: { open: 0.45, brow: 0.8, eye: 1.2, smile: 0.2 }, grin: { smile: 0.9, wide: 1.2, brow: 0.4 } };

// ---- cast
export const CAST = {
  tourist: { skin: 0xe8b48a, hair: { style: 'short', color: 0x3a2618 }, outfit: { type: 'tee', color: 0xff7a3a }, pants: { type: 'shorts', color: 0xc8b48a }, shoes: 0xffffff, acc: ['sunglasses', 'cap:0x2f6fd6'], seed: 21 },
  pilot: { skin: 0xd9a078, hair: { style: 'short', color: 0x2a1a10 }, outfit: { type: 'suit', color: 0x1f2f5a }, pants: { type: 'long', color: 0x1f2f5a }, shoes: 0x111111, acc: ['cap:0x1f2f5a', 'tie:0xffd23f', 'mustache:0x2a1a10'], seed: 22 },
  astronaut: { skin: 0xf2c3a0, hair: { style: 'short', color: 0x5a3a1a }, outfit: { type: 'jumpsuit', color: 0xf2f2f2 }, pants: { type: 'long', color: 0xf2f2f2 }, shoes: 0xd8d8d8, acc: ['backpack:0xe8e8e8'], seed: 23 },
  astronaut2: { skin: 0x8a5a3a, hair: { style: 'short', color: 0x15100c }, outfit: { type: 'jumpsuit', color: 0xf2f2f2 }, pants: { type: 'long', color: 0xf2f2f2 }, shoes: 0xd8d8d8, acc: ['backpack:0xe8e8e8'], seed: 24 },
  alien: { skin: 0x7ad05a, hair: { style: 'bald', color: 0 }, outfit: { type: 'jumpsuit', color: 0x7a4ad0 }, pants: { type: 'long', color: 0x7a4ad0 }, shoes: 0x3a2a6a, head: 1.3, eyeSize: 1.35, seed: 25 },
  alienB: { skin: 0x5ac8c0, hair: { style: 'bald', color: 0 }, outfit: { type: 'jumpsuit', color: 0xff8a3a }, pants: { type: 'long', color: 0xff8a3a }, shoes: 0x3a2a6a, head: 1.3, eyeSize: 1.35, seed: 26, lashes: true },
  alienKid: { skin: 0x9ae06a, hair: { style: 'bald', color: 0 }, outfit: { type: 'tee', color: 0xffd23f }, pants: { type: 'shorts', color: 0x3a6ad0 }, shoes: 0x3a2a6a, head: 1.35, eyeSize: 1.4, height: 0.62, seed: 27 },
};
export function makePerson(scene, preset) { const c = makeCharacter(typeof preset === 'string' ? (CAST[preset] ?? PRESETS[preset]) : preset); scene.add(c.root); c.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return c; }
// space helmet: clear glass bubble + collar ring + gold visor rim (the face stays visible: needed for the mewing face)
export function helmet(ch) {
  const R = ch.R, g = new THREE.Group(); ch.head.add(g);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(R * 1.55, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.16, roughness: 0.02, metalness: 0.0, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.y = R * 0.05; g.add(glass);
  add(g, tor(R * 1.25, R * 0.14, 10, 32), mat(0xe8e8ea, { rough: 0.4 }), [0, -R * 1.15, 0], [Math.PI / 2, 0, 0]);
  add(g, tor(R * 1.5, R * 0.05, 8, 40, Math.PI), mat(0xd8a832, { metal: 0.8, rough: 0.3 }), [0, R * 0.1, 0], [0, 0, 0]);
  return g;
}
// alien antennae
export function antennae(ch, color = 0xffd23f) { const R = ch.R; for (const s of [-1, 1]) { add(ch.head, cyl(R * 0.04, R * 0.05, R * 0.9, 8), mat(0x5aa03a), [s * R * 0.4, R * 1.25, 0], [0, 0, -s * 0.35]); add(ch.head, sph(R * 0.15, 12, 10), glow(color, 1.2), [s * R * 0.7, R * 1.65, 0]); } }

// ---- Gerald
export function makeGerald(scene) { const c = makeAnimal('cat', ANIMALS.gerald); scene.add(c.root); c.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return c; }
// suit + tie + briefcase (r6)
export function geraldSuit(cat) {
  const g = new THREE.Group(); cat.root.add(g);
  add(g, cyl(0.105, 0.12, 0.3, 18, 1, true), mat(0x23232e, { rough: 0.6, side: THREE.DoubleSide }), [0, 0.3, 0.02], [Math.PI / 2, 0, 0]);
  add(g, cone(0.04, 0.05, 3), mat(0xffffff), [0, 0.33, 0.2], [Math.PI, 0, 0]);
  add(g, box(0.03, 0.11, 0.012), mat(0xd9262c), [0, 0.27, 0.205], [0.3, 0, 0]);
  return g;
}
export function briefcase() { const g = new THREE.Group(); add(g, rbox(0.34, 0.24, 0.09, 0.02), mat(0x5a3a22, { rough: 0.5 }), [0, 0, 0]); add(g, tor(0.04, 0.012, 6, 16, Math.PI), mat(0x2a1a10), [0, 0.13, 0]); for (const s of [-1, 1]) add(g, box(0.03, 0.02, 0.1), mat(0xd8b040, { metal: 0.8 }), [s * 0.1, 0.1, 0]); return g; }

// ---- background helpers
export function starBackground(scene, { n = 2200, R = 900, seed = 4, tint = [1, 1, 1] } = {}) {
  const r = rng(seed), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, b = Math.acos(r.range(-1, 1)); pos.set([Math.sin(b) * Math.cos(a) * R, Math.cos(b) * R, Math.sin(b) * Math.sin(a) * R], i * 3); const k = r.range(0.35, 1) ** 2; const w = r(); col.set([k * (w < 0.2 ? 1 : 0.85) * tint[0], k * 0.9 * tint[1], k * (w > 0.8 ? 1 : 0.95) * tint[2]], i * 3); }
  const p = glowPoints(pos, col, { size: 3.2, attenuate: false }); scene.add(p); return p;
}
// streaks: lines that fly past (camera-relative). Returns group with set(t, camPos, dir, speed)
export function speedLines(scene, { n = 90, seed = 5, color = 0xffffff, len = 3, R = 3.5 } = {}) {
  const r = rng(seed), pos = new Float32Array(n * 6), seeds = Array.from({ length: n }, () => [r() * Math.PI * 2, r.range(0.7, 1) * R, r(), r.range(0.6, 1.4)]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); l.frustumCulled = false; scene.add(l);
  l.set = (t, center, speed = 1, axis = 'y', opacity = 0.5) => {
    l.material.opacity = opacity; const span = 24;
    seeds.forEach(([a, rr, ph, sp], i) => { const y = span / 2 - ((t * speed * sp * 9 + ph * span) % span); const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const L = len * sp * Math.min(2.5, speed);
      if (axis === 'y') pos.set([center[0] + x, center[1] + y, center[2] + z, center[0] + x, center[1] + y - L, center[2] + z], i * 6);
      else pos.set([center[0] + x, center[1] + z, center[2] + y, center[0] + x, center[1] + z, center[2] + y - L], i * 6); });
    geo.attributes.position.needsUpdate = true;
  };
  return l;
}
// deterministic "puff" particle burst (dust, plaster): set(age, origin)
export function puffs(scene, { n = 40, color = 0xe8e0d0, seed = 3, size = 0.12, spread = 1.2, up = 1, grav = 2.5 } = {}) {
  const r = rng(seed), list = Array.from({ length: n }, () => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(size * r.range(0.5, 1.4), 0), mat(color, { rough: 1 })); m.castShadow = true; scene.add(m); return { m, v: [r.range(-1, 1) * spread, r.range(0.2, 1) * up * 3, r.range(-1, 1) * spread], s: [r.range(-6, 6), r.range(-6, 6)] }; });
  return { set(age, o, life = 1.6) { for (const p of list) { const vis = age >= 0 && age < life; p.m.visible = vis; if (!vis) continue; p.m.position.set(o[0] + p.v[0] * age, o[1] + p.v[1] * age - grav * age * age, o[2] + p.v[2] * age); p.m.rotation.set(p.s[0] * age, p.s[1] * age, 0); p.m.scale.setScalar(Math.max(0.01, 1 - age / life * 0.5)); } } };
}
// simple shot list: [{t0, t1, a, b, ease}] -> camera at t
export function shotCam(shots, t) { let s = shots[0]; for (const x of shots) if (t >= x.t0 - 1e-6) s = x; const u = clamp((t - s.t0) / (s.t1 - s.t0)); const k = s.ease === 'lin' ? u : s.ease === 'out' ? 1 - (1 - u) * (1 - u) : smooth(u); return { cam: s.b ? mixCam(s.a, s.b, k) : s.a, u, shot: s }; }
// la peace performer: pose + mewing face with the voice's mouth curve
export function laPeace(ch, t, id, ctx, extra = {}) { ch.pose({ ...POSES.laPeace(t), ...extra }); ch.face({ ...FACES.mew, open: ctx.mouth(id, t) }); }
