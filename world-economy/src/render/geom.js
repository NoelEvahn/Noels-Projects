// Raw builder arrays -> three BufferGeometry (art layout: position, normal i8x4, uv, aTint u8x4 normalized, aAux u8x4 raw;
// terrain layout: aW0/aW1 splat weights instead of aAux). Every geometry is registered with MemTracker.
import * as THREE from 'three';
import { MemTracker } from './perf.js';
import { GB } from '../art/kit/geo.js';
import { LAYERS } from '../art/kit/layers.js';

export function artGeometry(a, track = true) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(a.normal, 4, true));
  g.setAttribute('uv', new THREE.BufferAttribute(a.uv, 2));
  g.setAttribute('aTint', new THREE.BufferAttribute(a.tint, 4, true));
  if (a.aux) g.setAttribute('aAux', new THREE.BufferAttribute(a.aux, 4, false));
  if (a.w0) { g.setAttribute('aW0', new THREE.BufferAttribute(a.w0, 4, true)); g.setAttribute('aW1', new THREE.BufferAttribute(a.w1, 4, true)); }
  if (a.wind) g.setAttribute('aWind', new THREE.BufferAttribute(a.wind, 1, true));
  g.setIndex(new THREE.BufferAttribute(a.index, 1));
  g.computeBoundingSphere();
  if (track) MemTracker.addGeometry(g);
  return g;
}
export function disposeGeometry(g) { MemTracker.removeGeometry(g); g.dispose(); }

const FLAT = () => LAYERS['tex.flat'].index;
/** append Stage 2 blockout arrays (position, normal f32x3, color u8x3 linear) into an art GB with a flat tinted layer */
export function appendLegacy(gb, a, x, y, z, yaw) {
  const nv = a.position.length / 3;
  gb._grow(nv, a.index.length);
  const c = Math.cos(yaw), s = Math.sin(yaw), base = gb.vn, L = FLAT();
  for (let i = 0; i < nv; i++) {
    const px = a.position[i * 3], py = a.position[i * 3 + 1], pz = a.position[i * 3 + 2], nx = a.normal[i * 3], ny = a.normal[i * 3 + 1], nz = a.normal[i * 3 + 2];
    const k = gb.vn++;
    gb.pos[k * 3] = x + px * c - pz * s; gb.pos[k * 3 + 1] = y + py; gb.pos[k * 3 + 2] = z + px * s + pz * c;
    gb.nrm[k * 4] = Math.round((nx * c - nz * s) * 127); gb.nrm[k * 4 + 1] = Math.round(ny * 127); gb.nrm[k * 4 + 2] = Math.round((nx * s + nz * c) * 127);
    gb.uv[k * 2] = (px + pz) * 0.5; gb.uv[k * 2 + 1] = py * 0.5;
    gb.tint[k * 4] = Math.min(255, a.color[i * 3] * 1.25); gb.tint[k * 4 + 1] = Math.min(255, a.color[i * 3 + 1] * 1.25); gb.tint[k * 4 + 2] = Math.min(255, a.color[i * 3 + 2] * 1.25); gb.tint[k * 4 + 3] = 255;
    gb.aux[k * 4] = L; gb.aux[k * 4 + 1] = L; gb.aux[k * 4 + 2] = 0; gb.aux[k * 4 + 3] = 0;
  }
  for (let i = 0; i < a.index.length; i++) gb.idx[gb.in++] = a.index[i] + base;
}
/** append any builder batch (art or legacy) */
export function appendBatch(gb, geo, x, y, z, yaw) {
  if (geo.art) gb.append(geo, x, y, z, yaw); else appendLegacy(gb, geo, x, y, z, yaw);
}
export { GB };
