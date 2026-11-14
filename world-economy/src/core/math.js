// Shared pure math helpers. No imports.
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
/** smoothstep from a to b (a may be > b for a falling edge) */
export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
export const TAU = Math.PI * 2;
export function wrapAngle(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
export function angleDiff(a, b) { return wrapAngle(a - b); }
export function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
/** closest point on segment ab to p; returns t in [0,1] and writes squared distance in out.d2 */
export function segClosest(px, pz, ax, az, bx, bz, out) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + dx * t, cz = az + dz * t;
  if (out) { out.x = cx; out.z = cz; out.t = t; out.d2 = (px - cx) * (px - cx) + (pz - cz) * (pz - cz); }
  return t;
}
/** yaw 0 faces -Z, positive toward +X. forward vector for a yaw. */
export const yawFwdX = (yaw) => Math.sin(yaw);
export const yawFwdZ = (yaw) => -Math.cos(yaw);
export const yawOf = (dx, dz) => Math.atan2(dx, -dz);
/** Catmull-Rom point (centripetal not needed; uniform) over 4 control values */
export function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
// Smooth periodic-free value noise (deterministic, seedable) - used by terrain and scatter.
function ihash(x, z, seed) {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(z, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function valueNoise(x, z, seed = 0) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = ihash(ix, iz, seed), b = ihash(ix + 1, iz, seed), c = ihash(ix, iz + 1, seed), d = ihash(ix + 1, iz + 1, seed);
  return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uz; // 0..1
}
/** fbm in [-1,1] */
export function fbm(x, z, octaves = 3, seed = 0) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * (valueNoise(x * f, z * f, seed + i * 101) * 2 - 1);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}
