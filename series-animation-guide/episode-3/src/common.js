// Shared helpers for the episode scenes: camera rigs, shot picking, easing, hearts above heads, small utilities.
import * as THREE from 'three';
import { makeCharacter, PRESETS, POSES, FACES, randomPerson } from '../../assets/library/character.js';
import { makeHeartTag, makeLoveAura } from '../../assets/library/fx/hearts.js';
import { rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, easeInOut } from '../../assets/library/util.js';
export { THREE, makeCharacter, PRESETS, POSES, FACES, randomPerson, makeHeartTag, makeLoveAura, rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, easeInOut };

export const D2R = Math.PI / 180;
export const V = (a) => new THREE.Vector3(...a);
// Camera from a focus point: az (deg, 0 = from +Z, +90 = from +X), dist, elevation above focus.y (m), fov
// `low` shifts the target up (fraction of the visible height) so faces sit below the counter/tag/chip band (top ~28% of the frame).
export const orbit = (f, az, dist, elev = 0.3, fov = 42, roll = 0, low = 0.2) => ({ pos: [f[0] + Math.sin(az * D2R) * dist, f[1] + elev, f[2] + Math.cos(az * D2R) * dist], target: [f[0], f[1] + low * 2 * dist * Math.tan(fov * D2R / 2), f[2]], fov, roll });
export const cam = (pos, target, fov = 42, roll = 0) => ({ pos, target, fov, roll });
export const mix = (a, b, k) => ({ pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k), target: a.target.map((v, i) => v + (b.target[i] - v) * k), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k) });
// A shot: [t0, t1, camA, camB?, opts]. Camera eases from A to B across the shot (linear if B omitted -> static).
export const shot = (t0, t1, a, b = null, o = {}) => ({ t0, t1, a, b: b ?? a, ...o });
// Slower edit (user feedback: "way too fast"): cuts = [[t0, t1, keyTime], ...]. Each new shot reuses the camera (and location key g)
// of the original shot playing at keyTime, held for the whole t0..t1, so its A->B move is stretched (slower). Keep cuts on the 0.4 s grid.
export function regroup(shots, cuts) {
  return cuts.map(([t0, t1, k]) => { let s = shots[0]; for (const x of shots) if (k >= x.t0 - 1e-6) s = x; return { ...s, t0, t1 }; });
}
export function pick(shots, t) { let s = shots[0], idx = 0; for (let i = 0; i < shots.length; i++) if (t >= shots[i].t0 - 1e-6) { s = shots[i]; idx = i; } const u = clamp((t - s.t0) / Math.max(1e-6, s.t1 - s.t0)); return { shot: s, idx, u, cam: mix(s.a, s.b, o_ease(u, s.ease)) }; }
const o_ease = (u, e) => (e === 'in' ? u * u : e === 'out' ? 1 - (1 - u) * (1 - u) : e === 'smooth' ? smooth(u) : u);
export const fl = (n) => Math.floor(n);
export const pops = (t, birth, dur = 0.35) => (t < birth ? 0 : easeOutBack(clamp((t - birth) / dur)));

// Heart-above-head manager: lovers = [{ch, born, size?}]; call update(t, camPos, scene)
export function makeLovers(scene) {
  const list = [], pc = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.05, 2000);
  return {
    add(ch, born, size = 0.36, dy = 0.62) { const tag = makeHeartTag(); scene.add(tag); list.push({ ch, born, tag, size, dy }); return tag; },
    // cam = {pos,target,fov}: hearts whose screen position falls in the counter/tag/chip band (top ~30%) are hidden so they never sit on the HUD
    update(t, camPos, cam = null) {
      const v = new THREE.Vector3(), c = { position: new THREE.Vector3(...camPos) };
      if (cam) { pc.fov = cam.fov ?? 45; pc.updateProjectionMatrix(); pc.position.set(...cam.pos); pc.lookAt(new THREE.Vector3(...cam.target)); pc.updateMatrixWorld(true); }
      for (const l of list) {
        l.ch.head.getWorldPosition(v); const sc = l.ch.root.scale.y; v.y += l.dy * sc + l.ch.R * sc * 0.8;
        let hide = l.ch.root.visible === false;
        if (cam && !hide) { const p = v.clone().project(pc); if (p.z < 1 && p.y > 0.36) hide = true; }
        l.tag.position.copy(v); if (l.tag.parent) l.tag.parent.worldToLocal(l.tag.position);
        l.tag.set(t - l.born, c, hide ? 0.0001 : l.size); if (hide) l.tag.visible = false;
      }
    },
    count: (t) => list.filter((l) => t >= l.born && l.ch.root.visible !== false).length, list,
  };
}
// Place a character: pos, yaw (rad), uniform extra scale is preserved from preset height
export function place(ch, x, y, z, ry = 0) { ch.root.position.set(x, y, z); ch.root.rotation.y = ry; return ch; }
export const face = (ch, f, open = 0) => ch.face({ ...f, open: Math.max(open, f.open ?? 0) });
export const yawTo = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]);
// Hearts-in-world color helpers
export const PINK = 0xff3f7f;
