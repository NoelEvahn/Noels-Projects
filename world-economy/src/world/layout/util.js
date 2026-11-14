// small shared helpers for layout modules
export { yawOf } from '../../core/math.js';
import { hash2 } from '../../core/rng.js';
export function hash2Seeded(ix, iz, seed) { return hash2(ix, iz, seed); }
