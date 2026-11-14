// On-foot capsule controller (Annex B 1: capsule 0.3 x 1.8, step 0.35, jump 0.9, walk 1.6 / run 4.5 / sprint 6.5). Pure.
import { World } from '../../world/query.js';
import { SCALE } from '../../data/ids.js';
import { resolveCircle, clampToWorld } from './collide.js';

const G = 20;
const JUMP_V = Math.sqrt(2 * G * SCALE.jump);
const out = { x: 0, z: 0, nx: 0, nz: 0, maxPen: 0 };

export function createCharacter(x = 0, y = 0, z = 0) {
  return { x, y, z, vx: 0, vz: 0, vy: 0, yaw: 0, onGround: true, surface: 'surf.grass', speed: 0, swimBlocked: false, platformId: undefined, airTime: 0 };
}

/**
 * input: {dirX, dirZ (world-space unit-ish vector), mode: 'walk'|'run'|'sprint', jump: bool}
 */
export function stepCharacter(c, input, dt) {
  const target = input.mode === 'sprint' ? SCALE.sprint : input.mode === 'walk' ? SCALE.walk : SCALE.run;
  const mag = Math.min(1, Math.hypot(input.dirX, input.dirZ));
  const tvx = mag > 0.001 ? (input.dirX / Math.max(mag, 1e-6)) * target * mag : 0, tvz = mag > 0.001 ? (input.dirZ / Math.max(mag, 1e-6)) * target * mag : 0;
  const accel = c.onGround ? 40 : 8;
  const dvx = tvx - c.vx, dvz = tvz - c.vz, dl = Math.hypot(dvx, dvz);
  const maxd = accel * dt;
  if (dl > maxd) { c.vx += (dvx / dl) * maxd; c.vz += (dvz / dl) * maxd; } else { c.vx = tvx; c.vz = tvz; }
  if (c.onGround && input.jump) { c.vy = JUMP_V; c.onGround = false; }
  // gravity
  if (!c.onGround) c.vy -= G * dt;

  // horizontal move in sub-steps so thin walls cannot be skipped
  const dist = Math.hypot(c.vx, c.vz) * dt;
  const n = Math.max(1, Math.ceil(dist / 0.2));
  const sx = (c.vx * dt) / n, sz = (c.vz * dt) / n;
  let x = c.x, z = c.z;
  for (let i = 0; i < n; i++) {
    let nx = x + sx, nz = z + sz;
    // wading limit: water deeper than 1.3 m is a barrier (no swimming in Stage 2)
    const w = World.waterAt(nx, nz, 0);
    if (w && w.depth > 1.3 && c.y < w.height + 0.2) { c.vx *= 0.5; c.vz *= 0.5; c.swimBlocked = true; continue; }
    c.swimBlocked = false;
    const hit = resolveCircle(nx, nz, SCALE.capsuleRadius, c.y + SCALE.stepHeight + 0.02, c.y + SCALE.capsuleHeight, out);
    if (hit) { nx = out.x; nz = out.z; const vn = c.vx * out.nx + c.vz * out.nz; if (vn < 0) { c.vx -= vn * out.nx; c.vz -= vn * out.nz; } }
    x = clampToWorld(nx); z = clampToWorld(nz);
  }
  c.x = x; c.z = z;
  c.speed = Math.hypot(c.vx, c.vz);

  // vertical: ground snapping with step-up and step-down
  const g = World.groundAt(c.x, c.y + SCALE.stepHeight, c.z);
  c.y += c.vy * dt;
  if (c.vy <= 0 && c.y <= g.y + 0.02) {
    if (g.y - c.y <= SCALE.stepHeight + 0.2) { c.y = g.y; c.vy = 0; if (!c.onGround) c.airTime = 0; c.onGround = true; }
  } else if (c.onGround && c.y - g.y <= 0.6 && c.vy <= 0) { c.y = g.y; c.vy = 0; }
  else if (c.onGround && c.y - g.y > 0.6) { c.onGround = false; }
  if (!c.onGround) c.airTime += dt; else c.airTime = 0;
  c.surface = g.surface; c.platformId = g.platformId;
  // face the direction of travel
  if (c.speed > 0.3) c.yaw = Math.atan2(c.vx, -c.vz);
  return c;
}
