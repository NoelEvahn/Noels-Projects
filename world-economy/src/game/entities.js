// EntityStore (MASTER_SPEC 5.6). Typed-array state for render interpolation. Pure.
import { ENTITY_FLAGS } from '../data/ids.js';

/** project yaw (0 faces -Z, + toward +X), pitch (nose up +), roll (right side down +) -> three.js 'YXZ' quaternion (x,y,z,w) */
export function poseQuat(yaw, pitch, roll, out, o = 0) {
  const ry = -yaw, rx = pitch, rz = -roll;
  const c1 = Math.cos(rx / 2), s1 = Math.sin(rx / 2), c2 = Math.cos(ry / 2), s2 = Math.sin(ry / 2), c3 = Math.cos(rz / 2), s3 = Math.sin(rz / 2);
  out[o] = s1 * c2 * c3 + c1 * s2 * s3;
  out[o + 1] = c1 * s2 * c3 - s1 * c2 * s3;
  out[o + 2] = c1 * c2 * s3 - s1 * s2 * c3;
  out[o + 3] = c1 * c2 * c3 + s1 * s2 * s3;
}

export function createEntityStore() {
  let nextId = 1;
  const map = new Map();
  return {
    create(kind, archetype, init = {}) {
      const e = {
        id: nextId++, kind, archetype, pos: new Float32Array(3), quat: new Float32Array([0, 0, 0, 1]), vel: new Float32Array(3),
        prevPos: new Float32Array(3), prevQuat: new Float32Array([0, 0, 0, 1]), anim: { state: 'idle', t: 0, speed: 0 }, parts: undefined, flags: ENTITY_FLAGS.VISIBLE,
      };
      if (init.pos) { e.pos.set(init.pos); e.prevPos.set(init.pos); }
      if (init.parts) e.parts = init.parts;
      if (init.flags !== undefined) e.flags = init.flags;
      if (init.yaw !== undefined) { poseQuat(init.yaw, 0, 0, e.quat); e.prevQuat.set(e.quat); }
      map.set(e.id, e);
      return e;
    },
    destroy(id) { map.delete(id); },
    get(id) { return map.get(id); },
    query(kind, x, z, radius, out = []) {
      out.length = 0;
      const r2 = radius * radius;
      for (const e of map.values()) if ((!kind || e.kind === kind) && (e.pos[0] - x) ** 2 + (e.pos[2] - z) ** 2 <= r2) out.push(e);
      return out;
    },
    all() { return map.values(); },
    get count() { return map.size; },
  };
}
export function setPose(e, x, y, z, yaw, pitch = 0, roll = 0) {
  e.prevPos.set(e.pos); e.prevQuat.set(e.quat);
  e.pos[0] = x; e.pos[1] = y; e.pos[2] = z;
  poseQuat(yaw, pitch, roll, e.quat);
}
export function snapPose(e, x, y, z, yaw, pitch = 0, roll = 0) {
  e.pos[0] = x; e.pos[1] = y; e.pos[2] = z; poseQuat(yaw, pitch, roll, e.quat);
  e.prevPos.set(e.pos); e.prevQuat.set(e.quat);
}
