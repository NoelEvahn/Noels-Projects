// INTERIORS pack: clutter scatterer. clutter(area, {seed, density, kind, y, avoid}) -> Group of InstancedMeshes (one draw call per item type).
//   area = {x, z, w, d} (centre + size, metres) in the parent's frame; density = items per m2 (default 2.5); y = surface height (floor 0, table top 0.75...).
//   kind: 'toys' | 'books' | 'clothes' | 'dishes' | 'papers' | 'trash' | 'tools' | 'food' | 'office' | 'mixed' (or an array of kinds). avoid = [{x,z,w,d}] rectangles kept free.
// Deterministic (seeded rng). Everything lies on the surface, never floats, never overlaps the avoid boxes.
import * as THREE from 'three';
import { inst, bg, cg, sg, rg, PAL } from './interiors_core.js';
import { mat, rng, shade } from '../util.js';

const TAU = Math.PI * 2;
const G = {
  block: () => bg(1, 1, 1), ball: () => sg(0.5, 10, 8), disc: () => cg(0.5, 0.5, 1, 18), cylinder: () => cg(0.5, 0.5, 1, 10), cone: () => new THREE.ConeGeometry(0.5, 1, 10), torus: () => new THREE.TorusGeometry(0.4, 0.1, 6, 14),
  rbox: () => rg(1, 1, 1, 0.12), hemi: () => new THREE.SphereGeometry(0.5, 14, 6, 0, TAU, 0, Math.PI / 2), tri: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 3),
};
const geoCache = {};
const geo = (k) => geoCache[k] ?? (geoCache[k] = G[k]());
const BR = [0xe04a3a, 0x3a78d0, 0xffd23f, 0x3fa060, 0xf6ecd5, 0x8a5ad0, 0xff8a2b, 0x2bb7b0, 0xff7aa0];
// part: {g: geometry key, s: [min,max] size or sx/sy/sz ranges, c: colours, w: weight, flat: lies flat (y rest = sy/2), tilt: random tilt, rough, y: extra lift, yaw: random}
const KINDS = {
  toys: [
    { g: 'block', sx: [0.05, 0.09], sy: [0.05, 0.09], sz: [0.05, 0.09], c: BR, w: 5 }, { g: 'ball', sx: [0.07, 0.12], k: 1, c: BR, w: 3, rough: 0.35 }, { g: 'rbox', sx: [0.13, 0.17], sy: [0.05, 0.07], sz: [0.07, 0.09], c: [0xe04a3a, 0x3a78d0, 0xffd23f, 0x3fa060], w: 2 },
    { g: 'ball', sx: [0.07, 0.09], sy: [0.06, 0.08], sz: [0.07, 0.09], c: [0xffd23f], w: 1, rough: 0.4 }, { g: 'cylinder', sx: [0.07, 0.07], sy: [0.04, 0.05], sz: [0.07, 0.07], c: BR, w: 2 }, { g: 'torus', sx: [0.12, 0.2], sy: [0.12, 0.2], sz: [0.12, 0.2], c: BR, w: 2, lie: true }, { g: 'cone', sx: [0.06, 0.08], sy: [0.09, 0.12], sz: [0.06, 0.08], c: BR, w: 1 },
    { g: 'cylinder', sx: [0.012, 0.012], sy: [0.09, 0.09], sz: [0.012, 0.012], c: BR, w: 3, lie: true },
  ],
  books: [
    { g: 'block', sx: [0.16, 0.24], sy: [0.015, 0.04], sz: [0.22, 0.32], c: [0xe04a3a, 0x3a78d0, 0x2f8a5a, 0x8a5ad0, 0x15151c, 0xf6ecd5, 0xffd23f, 0x8a4a2a], w: 6 }, { g: 'block', sx: [0.2, 0.22], sy: [0.004, 0.008], sz: [0.27, 0.29], c: [0xf6ecd5, 0xffffff, 0xffd0dc], w: 2 }, { g: 'block', sx: [0.12, 0.15], sy: [0.012, 0.02], sz: [0.18, 0.2], c: BR, w: 2 },
  ],
  clothes: [
    { g: 'rbox', sx: [0.28, 0.4], sy: [0.03, 0.07], sz: [0.2, 0.32], c: [0xe04a3a, 0x3a78d0, 0xffd23f, 0x3fa060, 0xf6ecd5, 0x15151c, 0xff7aa0], w: 5, tilt: 0.06 }, { g: 'ball', sx: [0.1, 0.16], sy: [0.04, 0.07], sz: [0.1, 0.18], c: [0xf6ecd5, 0x8a5ad0, 0xe04a3a, 0x2bb7b0], w: 3, rough: 1 }, { g: 'rbox', sx: [0.1, 0.12], sy: [0.025, 0.04], sz: [0.2, 0.26], c: [0x3a5aa0, 0x3a5aa0, 0x1c2a50], w: 3 }, { g: 'cylinder', sx: [0.03, 0.04], sy: [0.12, 0.17], sz: [0.03, 0.04], c: [0xffffff, 0xff7aa0, 0x3a78d0, 0xffd23f], w: 4, lie: true, rough: 1 },
  ],
  dishes: [
    { g: 'disc', sx: [0.2, 0.24], sy: [0.015, 0.015], sz: [0.2, 0.24], c: [0xffffff, 0xf6ecd5, 0xdfeaf6], w: 4 }, { g: 'hemi', sx: [0.14, 0.16], sy: [0.12, 0.14], sz: [0.14, 0.16], c: [0xffffff, 0x6ab0d8, 0xff9a5a, 0xf6ecd5], w: 2, rough: 0.3 }, { g: 'cylinder', sx: [0.08, 0.08], sy: [0.09, 0.1], sz: [0.08, 0.08], c: [0xe04a3a, 0x3a78d0, 0xffffff, 0xffd23f], w: 3, rough: 0.3 }, { g: 'cylinder', sx: [0.065, 0.065], sy: [0.12, 0.12], sz: [0.065, 0.065], c: [0xc8ccd6, 0xe04a3a, 0x3fa060], w: 2, rough: 0.25 }, { g: 'block', sx: [0.3, 0.36], sy: [0.04, 0.045], sz: [0.3, 0.36], c: [0xc8a060], w: 1 }, { g: 'cylinder', sx: [0.016, 0.016], sy: [0.16, 0.18], sz: [0.016, 0.016], c: [0xc8ccd6], w: 2, lie: true },
  ],
  papers: [
    { g: 'block', sx: [0.21, 0.21], sy: [0.003, 0.003], sz: [0.297, 0.297], c: [0xffffff, 0xfdfdf0, 0xf2f6ff], w: 8, yawFree: true }, { g: 'ball', sx: [0.07, 0.1], sy: [0.06, 0.09], sz: [0.07, 0.1], c: [0xf0f0e8, 0xe8e8e0], w: 3, rough: 1 }, { g: 'block', sx: [0.1, 0.12], sy: [0.1, 0.12], sz: [0.003, 0.003], c: [0xfff3a0, 0xffc8d8, 0xc8f0d0], w: 2, lie: false },
  ],
  trash: [
    { g: 'cylinder', sx: [0.065, 0.065], sy: [0.12, 0.12], sz: [0.065, 0.065], c: [0xc8ccd6, 0xe04a3a, 0x3fa060, 0x3a78d0], w: 4, lie: true, rough: 0.3 }, { g: 'ball', sx: [0.06, 0.1], sy: [0.05, 0.09], sz: [0.06, 0.1], c: [0xf0f0e8, 0xdcdcd0, 0xc8b898], w: 4, rough: 1 }, { g: 'block', sx: [0.2, 0.3], sy: [0.05, 0.1], sz: [0.2, 0.3], c: [0xc8a060, 0xe0e0d8], w: 2 }, { g: 'cylinder', sx: [0.035, 0.04], sy: [0.2, 0.26], sz: [0.035, 0.04], c: [0x3fa060, 0xc8a060, 0xf6ecd5], w: 2, lie: true, rough: 0.25 },
  ],
  tools: [
    { g: 'block', sx: [0.02, 0.03], sy: [0.012, 0.016], sz: [0.2, 0.3], c: [0xc8ccd6, 0xe04a3a, 0xffd23f], w: 4, rough: 0.35 }, { g: 'cylinder', sx: [0.09, 0.11], sy: [0.12, 0.16], sz: [0.09, 0.11], c: [0xe04a3a, 0x3a78d0, 0xffd23f, 0x3fa060], w: 3, rough: 0.4 }, { g: 'block', sx: [0.3, 0.45], sy: [0.04, 0.06], sz: [0.06, 0.1], c: [0xc89a62, 0xa87a42], w: 3 }, { g: 'rbox', sx: [0.2, 0.3], sy: [0.08, 0.12], sz: [0.12, 0.16], c: [0xe04a3a, 0x3a78d0], w: 2, rough: 0.5 }, { g: 'torus', sx: [0.2, 0.28], sy: [0.2, 0.28], sz: [0.2, 0.28], c: [0x15151c], w: 1, lie: true, rough: 0.9 },
  ],
  food: [
    { g: 'ball', sx: [0.07, 0.09], k: 1, c: [0xe04a3a, 0xffd23f, 0x3fa060, 0xff8a2b], w: 4, rough: 0.35 }, { g: 'block', sx: [0.32, 0.36], sy: [0.04, 0.05], sz: [0.32, 0.36], c: [0xc8a060, 0xf0e0c0], w: 1 }, { g: 'disc', sx: [0.2, 0.22], sy: [0.012, 0.012], sz: [0.2, 0.22], c: [0xffffff], w: 2 }, { g: 'tri', sx: [0.2, 0.24], sy: [0.012, 0.02], sz: [0.2, 0.24], c: [0xffc040, 0xe8a830], w: 2 },
  ],
  office: [
    { g: 'cylinder', sx: [0.08, 0.08], sy: [0.1, 0.1], sz: [0.08, 0.08], c: [0xe04a3a, 0x3a78d0, 0x15151c], w: 2, rough: 0.4 }, { g: 'block', sx: [0.21, 0.21], sy: [0.003, 0.003], sz: [0.297, 0.297], c: [0xffffff, 0xf2f6ff], w: 6, yawFree: true }, { g: 'cylinder', sx: [0.008, 0.008], sy: [0.14, 0.14], sz: [0.008, 0.008], c: [0xe04a3a, 0x3a78d0, 0x15151c, 0x3fa060], w: 4, lie: true }, { g: 'rbox', sx: [0.08, 0.08], sy: [0.08, 0.08], sz: [0.08, 0.08], c: [0xfff3a0, 0xffc8d8, 0xc8f0d0], w: 2 }, { g: 'rbox', sx: [0.28, 0.32], sy: [0.03, 0.04], sz: [0.2, 0.24], c: [0x3a78d0, 0xe04a3a, 0x8a5ad0, 0x2f8a5a], w: 2 },
  ],
};
KINDS.mixed = [...KINDS.toys, ...KINDS.books, ...KINDS.clothes, ...KINDS.papers, ...KINDS.dishes.slice(0, 3)];
KINDS.kitchen = [...KINDS.dishes, ...KINDS.food];
KINDS.garage = [...KINDS.tools, ...KINDS.trash];
KINDS.bedroom = [...KINDS.clothes, ...KINDS.books, ...KINDS.toys.slice(0, 3), ...KINDS.papers.slice(0, 2)];

export function clutter(area = { x: 0, z: 0, w: 2, d: 2 }, { seed = 1, density = 2.5, kind = 'mixed', y = 0, avoid = [], scale = 1, maxTilt = 0.08 } = {}) {
  const r = rng(seed * 4099 + 17); const g = new THREE.Group(); g.name = 'clutter';
  const kinds = Array.isArray(kind) ? kind : [kind]; const parts = kinds.flatMap((k) => KINDS[k] ?? KINDS.mixed);
  const total = parts.reduce((a, p) => a + (p.w ?? 1), 0);
  const n = Math.max(0, Math.round(area.w * area.d * density)); const groups = new Map();
  const inside = (px, pz) => avoid.some((a) => Math.abs(px - a.x) < a.w / 2 && Math.abs(pz - a.z) < a.d / 2);
  for (let i = 0; i < n; i++) {
    let pick = r() * total, part = parts[0]; for (const p of parts) { pick -= p.w ?? 1; if (pick <= 0) { part = p; break; } }
    let px = 0, pz = 0, tries = 0; do { px = area.x + (r() - 0.5) * (area.w - 0.1); pz = area.z + (r() - 0.5) * (area.d - 0.1); tries++; } while (inside(px, pz) && tries < 12); if (inside(px, pz)) continue;
    const sx = r.range(...part.sx) * scale, k = part.k ? sx : null; const sy = k ? sx : r.range(...(part.sy ?? part.sx)) * scale, sz = k ? sx : r.range(...(part.sz ?? part.sx)) * scale;
    const col = r.pick(part.c); let rx = 0, rz = 0, ry = r() * TAU, py;
    if (part.lie) { rz = Math.PI / 2; py = Math.min(sx, sz) / 2 + 0.001; if (part.g === 'torus') { rz = 0; rx = Math.PI / 2; py = sy * 0.1 + 0.002; } ry = r() * TAU; const L = sy; py = Math.max(sx, sz) / 2 + 0.001; /* cylinders on their side */ }
    else { rx = (r() - 0.5) * maxTilt; rz = (r() - 0.5) * maxTilt; py = sy / 2 + 0.001; }
    if (part.g === 'hemi') py = 0.001; if (part.g === 'ball' && !part.k && sy < sx) py = sy / 2;
    const key = part.g + (part.rough ?? 0.7); if (!groups.has(key)) groups.set(key, { part, items: [] });
    let item;
    if (part.lie && part.g !== 'torus') item = { p: [px, y + py, pz], r: [0, ry, rz], s: [sx, sy, sz], c: col };      // rotated about z: x extent becomes vertical (sx = diameter)
    else item = { p: [px, y + py, pz], r: [rx, ry, rz], s: [sx, sy, sz], c: col };
    if (part.lie && part.g === 'torus') item.r = [Math.PI / 2, 0, ry];
    groups.get(key).items.push(item);
  }
  let count = 0;
  for (const [key, { part, items }] of groups) { inst(g, geo(part.g), mat(0xffffff, { rough: part.rough ?? 0.7 }), items); count += items.length; }
  g.userData.count = count; return g;
}
export const CLUTTER_KINDS = Object.keys(KINDS);
