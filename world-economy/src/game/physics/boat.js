// Basic boat movement (Stage 2): sticky throttle, rudder, quadratic drag, strong lateral resistance, Gerstner heave, land blocking. Pure.
import { World } from '../../world/query.js';
import { VEHICLES } from '../../data/vehicles.js';
import { ARCHETYPES } from '../../world/archetypes.js';
import { resolveCircle, clampToWorld } from './collide.js';

const out = { x: 0, z: 0, nx: 0, nz: 0, maxPen: 0 };
export function createBoat(archetype, x, z, yaw = 0) {
  const spec = VEHICLES[archetype], A = ARCHETYPES[archetype];
  const wa = World.waterAt(x, z, 0);
  return { archetype, spec, size: A.size, x, y: wa ? wa.height : 0, z, yaw, pitch: 0, roll: 0, speed: 0, vlat: 0, throttle: 0, rudder: 0, propSpin: 0, heel: 0, trim: 0, collided: 0, t: 0, aground: false };
}
/** input: {throttleDelta -1..1 (W/S, sticky), rudder -1..1, brake bool} */
export function stepBoat(b, input, dt) {
  b.t += dt;
  const sp = b.spec, [w, h, len] = b.size;
  b.throttle = Math.max(-0.4, Math.min(1, b.throttle + input.throttleDelta * dt * 0.6));
  if (input.brake) b.throttle *= Math.exp(-3 * dt);
  const target = b.throttle > 0 ? sp.topSpeed * b.throttle : sp.topSpeed * 0.35 * b.throttle;
  const accel = sp.accel;
  b.speed += Math.max(-accel * dt * 2, Math.min(accel * dt, target - b.speed)) * 1;
  b.speed *= Math.exp(-0.06 * dt * (input.brake ? 6 : 1));
  const rud = input.rudder;
  b.rudder += (rud - b.rudder) * Math.min(1, dt * 5);
  const yawRate = b.rudder * Math.min(1.1, 0.25 + Math.abs(b.speed) * 0.12) * Math.sign(b.speed || 1);
  b.yaw += yawRate * dt * 0.9;
  b.yaw = Math.atan2(Math.sin(b.yaw), Math.cos(b.yaw));
  b.vlat += b.speed * yawRate * dt * 0.15;
  b.vlat *= Math.exp(-3.5 * dt);
  const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw);
  const vx = sy * b.speed + cy * b.vlat, vz = -cy * b.speed + sy * b.vlat;
  let x = b.x + vx * dt, z = b.z + vz * dt;
  // land: shallow water or ground above the waterline stops the boat
  const hl = len / 2 - 0.4;
  let blocked = false;
  for (const off of [hl, 0, -hl]) {
    const px = x + sy * off, pz = z - cy * off;
    const wa = World.waterAt(px, pz, b.t);
    if (!wa || wa.depth < 0.45) { blocked = true; break; }
  }
  if (blocked) { x = b.x; z = b.z; b.speed *= -0.25; b.vlat = 0; b.throttle = 0; b.collided = 2; b.aground = true; } else b.aground = false;
  // piles, breakwater and other solid structures
  for (const off of [hl, 0, -hl]) {
    const px = x + sy * off, pz = z - cy * off;
    if (resolveCircle(px, pz, w / 2, b.y - 0.2, b.y + 1.0, out)) { x += out.x - px; z += out.z - pz; b.speed *= 0.5; b.collided = 1.5; }
  }
  b.x = clampToWorld(x); b.z = clampToWorld(z);
  b.collided *= 0.9;
  // heave / trim / heel from the water surface under four hull points
  const hw = w / 2, hl2 = len / 2 - 0.3;
  const pt = (lx, lz) => { const px = b.x + lx * cy - lz * sy, pz = b.z + lx * sy + lz * cy; const wa = World.waterAt(px, pz, b.t); return wa ? wa.height : b.y; };
  const fL = pt(-hw, -hl2), fR = pt(hw, -hl2), bL = pt(-hw, hl2), bR = pt(hw, hl2);
  const avg = (fL + fR + bL + bR) / 4;
  b.y += (avg - b.y) * Math.min(1, dt * 6);
  const planing = Math.min(1, Math.max(0, (Math.abs(b.speed) / sp.topSpeed - 0.5) * 2));
  const tp = Math.atan2((fL + fR) / 2 - (bL + bR) / 2, hl2 * 2) + planing * 0.06;
  const tr = Math.atan2((fR + bR) / 2 - (fL + bL) / 2, hw * 2) + b.rudder * b.speed * 0.01;
  b.pitch += (tp - b.pitch) * Math.min(1, dt * 5); b.roll += (tr - b.roll) * Math.min(1, dt * 5);
  b.trim = b.pitch; b.heel = b.roll;
  b.propSpin += Math.abs(b.throttle) * 40 * dt;
  return b;
}
