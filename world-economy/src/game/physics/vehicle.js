// Basic arcade car dynamics (Stage 2 "VS0"): bicycle steering, grip-limited lateral slip, grade, 4-point ground following,
// 3-circle collision against static colliders. Pure. Stage 4 replaces/extends with the raycast suspension model (Annex A 7.3).
import { World } from '../../world/query.js';
import { VEHICLES } from '../../data/vehicles.js';
import { ARCHETYPES } from '../../world/archetypes.js';
import { resolveCircle, clampToWorld } from './collide.js';

const G = 9.81;
const out = { x: 0, z: 0, nx: 0, nz: 0, maxPen: 0 };
const MU = { 'surf.asphalt': 1.0, 'surf.cobble': 0.85, 'surf.concrete': 0.95, 'surf.paver': 0.9, 'surf.gravel': 0.75, 'surf.dirt': 0.7, 'surf.grass': 0.6, 'surf.mud': 0.5, 'surf.sand': 0.5, 'surf.forestfloor': 0.65, 'surf.rock': 0.8, 'surf.wood': 0.8, 'surf.water_shallow': 0.5 };

export function createVehicle(archetype, x, z, yaw = 0) {
  const spec = VEHICLES[archetype];
  const A = ARCHETYPES[archetype];
  const y = World.groundAt(x, 100, z).y;
  return {
    archetype, spec, size: A.size, x, y, z, yaw, pitch: 0, roll: 0, speed: 0, vlat: 0, vy: 0, steer: 0, steerAngle: 0,
    rpm: 0, gear: 1, surface: 'surf.asphalt', mu: 1, onGround: true, wheelSpin: 0, brake: 0, collided: 0, wheelBase: spec.wheelbase || 2.7, odo: 0, muTimer: 0, reverse: false,
  };
}

/** input: {throttle -1..1, steer -1..1, handbrake bool} */
export function stepVehicle(v, input, dt) {
  const sp = v.spec;
  const top = sp.topSpeed;
  const [w, h, len] = v.size;
  const sinY = Math.sin(v.yaw), cosY = Math.cos(v.yaw);
  const fx = sinY, fz = -cosY; // forward
  const rx = cosY, rz = sinY;  // right

  // surface grip refreshed at 10 Hz
  v.muTimer -= dt;
  if (v.muTimer <= 0) { v.muTimer = 0.1; v.surface = World.surfaceAt(v.x, v.z); v.mu = MU[v.surface] || 0.7; }

  // longitudinal
  const slope = (v.pitch); // nose-up positive
  let a = 0;
  const th = input.throttle;
  if (th > 0.01) {
    if (v.speed < -0.5) a = 11 * th; // braking while rolling backwards
    else a = sp.accel * th * Math.max(0, 1 - Math.pow(Math.max(0, v.speed) / top, 2.2));
  } else if (th < -0.01) {
    if (v.speed > 0.5) a = -8.0 * -th * v.mu; // brake (20 m/s -> ~25 m, Annex A 7.3 target 22-30 m)
    else a = -sp.accel * 0.6 * -th * Math.max(0, 1 - Math.pow(Math.max(0, -v.speed) / 9, 2));
  }
  const drag = 0.012 * v.speed * Math.abs(v.speed) / 4 + 0.25 * Math.sign(v.speed) * (Math.abs(v.speed) > 0.05 ? 1 : 0);
  let hb = 0;
  if (input.handbrake) hb = 9 * v.mu;
  a -= drag + G * Math.sin(slope) * 0.9;
  v.brake = th < -0.01 && v.speed > 0.5 || input.handbrake ? 1 : 0;
  let vs = v.speed + a * dt;
  if (hb > 0) { const d = hb * dt; vs = Math.abs(vs) <= d ? 0 : vs - Math.sign(vs) * d; }
  if (th === 0 && !input.handbrake && Math.abs(vs) < 0.12) vs = 0;
  v.speed = vs;

  // steering: speed-sensitive angle (35 deg at rest to 8 deg at 30 m/s)
  const aVel = Math.abs(v.speed);
  const maxSteer = (35 - 27 * Math.min(1, aVel / 30)) * Math.PI / 180;
  const targetSteer = input.steer * maxSteer;
  v.steerAngle += (targetSteer - v.steerAngle) * Math.min(1, dt * 8);
  const yawRate = (v.speed / v.wheelBase) * Math.tan(v.steerAngle);
  const maxYaw = 2.2 * v.mu + (input.handbrake ? 0.8 : 0);
  const yr = Math.max(-maxYaw, Math.min(maxYaw, yawRate));
  v.yaw += yr * dt;
  v.yaw = Math.atan2(Math.sin(v.yaw), Math.cos(v.yaw));

  // lateral slip: centripetal demand pushes sideways, grip pulls it back
  const centripetal = v.speed * yr;
  v.vlat += -centripetal * dt * 0.35;
  const grip = (input.handbrake ? 1.5 : 7) * v.mu;
  v.vlat *= Math.exp(-grip * dt);

  // integrate horizontal position
  const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw);
  const fxn = sy, fzn = -cy, rxn = cy, rzn = sy;
  const vx = sy * v.speed + cy * v.vlat, vz = -cy * v.speed + sy * v.vlat;
  const dist = Math.hypot(vx, vz) * dt;
  const n = Math.max(1, Math.ceil(dist / 0.5));
  let x = v.x, z = v.z;
  const hl = len / 2 - w / 2, rad = w / 2 * 0.95;
  for (let i = 0; i < n; i++) {
    x += (vx * dt) / n; z += (vz * dt) / n;
    for (const off of [hl * 0.9, 0, -hl * 0.9]) {
      const px = x + Math.sin(v.yaw) * off, pz = z - Math.cos(v.yaw) * off;
      const hit = resolveCircle(px, pz, rad, v.y + 0.35, v.y + h, out);
      if (hit) {
        x += out.x - px; z += out.z - pz;
        // remove the velocity component into the wall (restitution 0.15) and re-project onto the car axes
        let Vx = fxn * v.speed + rxn * v.vlat, Vz = fzn * v.speed + rzn * v.vlat;
        const Vn = Vx * out.nx + Vz * out.nz;
        if (Vn < 0) {
          Vx -= 1.15 * Vn * out.nx; Vz -= 1.15 * Vn * out.nz;
          v.speed = Vx * fxn + Vz * fzn; v.vlat = (Vx * rxn + Vz * rzn) * 0.6;
          v.collided = Math.max(v.collided, -Vn);
        }
      }
    }
    // deep water is a wall for cars
    const wa = World.waterAt(x + fxn * hl, z + fzn * hl, 0);
    if (wa && wa.depth > 0.9 && v.y < wa.height + 0.8 && v.onGround) { x -= (vx * dt) / n; z -= (vz * dt) / n; v.speed *= 0.3; v.collided = Math.max(v.collided, 2); }
  }
  x = clampToWorld(x); z = clampToWorld(z);
  v.odo += Math.hypot(x - v.x, z - v.z);
  v.x = x; v.z = z;
  v.collided *= 0.9;

  // ground following: 4 wheel contact points
  const hw = w / 2 - 0.15, hl2 = len / 2 - 0.5;
  const sinp = Math.sin(v.yaw), cosp = Math.cos(v.yaw);
  const pt = (lx, lz) => World.groundAt(v.x + lx * cosp - lz * sinp, v.y + 0.7, v.z + lx * sinp + lz * cosp).y;
  const gFL = pt(-hw, -hl2), gFR = pt(hw, -hl2), gBL = pt(-hw, hl2), gBR = pt(hw, hl2);
  const gAvg = (gFL + gFR + gBL + gBR) / 4;
  const ride = Math.max(0.3, h * 0.16);
  const targetY = gAvg;
  if (v.onGround || v.y <= targetY + 0.02) {
    if (v.y - targetY > 0.5) { v.onGround = false; }
    else { v.y += (targetY - v.y) * Math.min(1, dt * 30); v.vy = 0; v.onGround = true; }
  }
  if (!v.onGround) { v.vy -= G * dt; v.y += v.vy * dt; if (v.y <= targetY) { v.y = targetY; v.vy = 0; v.onGround = true; } }
  const frontAvg = (gFL + gFR) / 2, backAvg = (gBL + gBR) / 2;
  const tp = Math.atan2(frontAvg - backAvg, hl2 * 2);
  const tr = Math.atan2(((gFR + gBR) / 2) - ((gFL + gBL) / 2), hw * 2);
  v.pitch += (tp - v.pitch) * Math.min(1, dt * 12);
  v.roll += (tr - v.roll) * Math.min(1, dt * 12);
  void ride;
  v.wheelSpin += (v.speed / 0.35) * dt;
  v.rpm = Math.min(1, aVel / top) * 0.8 + Math.max(0, input.throttle) * 0.2;
  v.gear = Math.min(5, 1 + Math.floor(aVel / (top / 5)));
  return v;
}
