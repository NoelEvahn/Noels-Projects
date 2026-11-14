// Shared 2.5D collision helpers: circle (vertical capsule slice) vs the static collider set. Pure.
import { World } from '../../world/query.js';

const list = [];
const pen = { nx: 0, nz: 0, pen: 0 };

/**
 * Pushes the circle (x,z,r) out of every blocking collider overlapping the height band [y0,y1].
 * Writes the final position into out.x/out.z, accumulates the strongest contact normal in out.nx/out.nz, returns penetration count.
 */
export function resolveCircle(x, z, r, y0, y1, out) {
  const cs = World.data.colliders;
  let hits = 0;
  out.nx = 0; out.nz = 0; out.maxPen = 0;
  for (let iter = 0; iter < 3; iter++) {
    cs.near(x, z, r + 1, list);
    let any = false;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.dead) continue;
      if (cs.penetration(c, x, z, r, y0, y1, pen)) {
        x += pen.nx * pen.pen; z += pen.nz * pen.pen;
        if (pen.pen > out.maxPen) { out.maxPen = pen.pen; out.nx = pen.nx; out.nz = pen.nz; }
        hits++; any = true;
      }
    }
    if (!any) break;
  }
  out.x = x; out.z = z;
  return hits;
}
export const WORLD_LIMIT = 1990;
export function clampToWorld(v) { return v < -WORLD_LIMIT ? -WORLD_LIMIT : v > WORLD_LIMIT ? WORLD_LIMIT : v; }
