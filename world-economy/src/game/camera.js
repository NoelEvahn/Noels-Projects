// Third-person / vehicle follow camera (CameraState, MASTER_SPEC 5.6). Pure.
import { World } from '../world/query.js';

export function createCamera() {
  return { pos: [0, 10, 0], target: [0, 1, 0], fov: 60, mode: 'third', yaw: 0, pitch: 0.28, dist: 5.5, fixed: false, shake: 0 };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** rig: look deltas (radians), subject {x,y,z,yaw,speed}, kind 'foot'|'vehicle'|'boat' */
export function updateCamera(cam, dt, look, subj, kind, firstPerson) {
  if (cam.fixed) return;
  cam.yaw += look.x; cam.pitch = clamp(cam.pitch + look.y, -0.35, 1.35);
  const idleLook = Math.abs(look.x) < 1e-4 && Math.abs(look.y) < 1e-4;
  if (kind !== 'foot' && idleLook && Math.abs(subj.speed) > 1.2) {
    // auto-follow behind the vehicle (shortest-angle blend toward the vehicle heading)
    const target = subj.yaw;
    let d = target - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    cam.yaw += d * Math.min(1, dt * (kind === 'vehicle' ? 2.6 : 1.8));
    cam.pitch += (0.2 - cam.pitch) * Math.min(1, dt * 1.5);
  }
  const eye = kind === 'foot' ? 1.65 : kind === 'vehicle' ? 1.35 : 1.6;
  const dist = kind === 'foot' ? 5.0 : kind === 'vehicle' ? 8.5 : 12;
  cam.dist += (dist - cam.dist) * Math.min(1, dt * 4);
  const tx = subj.x, ty = subj.y + eye * (kind === 'foot' ? 0.95 : 0.9), tz = subj.z;
  if (firstPerson && kind === 'foot') {
    cam.mode = 'first';
    cam.pos = [tx, subj.y + eye, tz];
    const cp = Math.cos(cam.pitch * 0.0 - (cam.pitch - 0.28) * 0.9), sp = Math.sin(-(cam.pitch - 0.28) * 0.9);
    cam.target = [tx + Math.sin(cam.yaw) * cp * 5, subj.y + eye + sp * 5, tz - Math.cos(cam.yaw) * cp * 5];
    return;
  }
  cam.mode = kind === 'foot' ? 'third' : 'vehicle';
  // orbit position: behind the subject along -forward(yaw), raised by pitch
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  let px = tx - Math.sin(cam.yaw) * cp * cam.dist, pz = tz + Math.cos(cam.yaw) * cp * cam.dist, py = ty + sp * cam.dist;
  // keep above terrain / decks and push in when a collider blocks the view
  const hit = World.raycast([tx, ty, tz], [px - tx, py - ty, pz - tz], cam.dist + 0.3, { terrain: false });
  if (hit && hit.dist < cam.dist) { const k = Math.max(0.15, (hit.dist - 0.35) / cam.dist); px = tx + (px - tx) * k; py = ty + (py - ty) * k; pz = tz + (pz - tz) * k; }
  const g = World.groundAt(px, py + 2, pz).y;
  const wa = World.waterAt(px, pz, 0);
  const floor = Math.max(g, wa ? wa.height : -1e9) + 0.5;
  if (py < floor) py = floor;
  cam.pos = [px, py, pz]; cam.target = [tx, ty, tz];
}
