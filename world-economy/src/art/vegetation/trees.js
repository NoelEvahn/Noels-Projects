// Tree, bush and ground-cover generators (Annex A 8). Unit size: base at y = 0, nominal archetype height; the vegetation
// system scales instances. Bark goes to `mat.veg_bark` (texture arrays + wind), foliage cards to `mat.veg_leaf` (leaf atlas,
// alpha test, wind). LOD0 = full branch tiers / leaf clusters, LOD1 = a few crossed cards, LOD2 = runtime-baked impostor.
import { GB, srng } from '../kit/geo.js';
import { leafCell } from '../../render/textures/canvasTex.js';

const cache = new Map();
/** foliage card: quad from base point along (yaw, pitch) with length L, width W; uv cell rect; optional twist (roll) */
function frond(g, bx, by, bz, yaw, pitch, L, W, cell, roll = 0, droop = 0) {
  const [u0, v0, u1, v1] = cell;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const dir = [sy * cp, sp, -cy * cp];               // along the branch
  const side = [cy * Math.cos(roll), Math.sin(roll), sy * Math.cos(roll)]; // across
  const tip = [bx + dir[0] * L, by + dir[1] * L - droop, bz + dir[2] * L];
  const hw = W / 2, mid = [bx + dir[0] * L * 0.5, by + dir[1] * L * 0.5 - droop * 0.3, bz + dir[2] * L * 0.5];
  const nx = side[1] * dir[2] - side[2] * dir[1], ny = side[2] * dir[0] - side[0] * dir[2], nz = side[0] * dir[1] - side[1] * dir[0];
  const n = ny < 0 ? [-nx, -ny, -nz] : [nx, ny, nz];
  g._grow(6, 12);
  const b = g.vn;
  // two segments (base -> mid -> tip) so droop bends the card
  g.vert(bx - side[0] * hw * 0.6, by - side[1] * hw * 0.6, bz - side[2] * hw * 0.6, n[0], n[1], n[2], u0, (v0 + v1) / 2 - (v1 - v0) * 0.3);
  g.vert(bx + side[0] * hw * 0.6, by + side[1] * hw * 0.6, bz + side[2] * hw * 0.6, n[0], n[1], n[2], u0, (v0 + v1) / 2 + (v1 - v0) * 0.3);
  g.vert(mid[0] - side[0] * hw, mid[1] - side[1] * hw, mid[2] - side[2] * hw, n[0], n[1], n[2], (u0 + u1) / 2, v0);
  g.vert(mid[0] + side[0] * hw, mid[1] + side[1] * hw, mid[2] + side[2] * hw, n[0], n[1], n[2], (u0 + u1) / 2, v1);
  g.vert(tip[0] - side[0] * hw * 0.8, tip[1] - side[1] * hw * 0.8, tip[2] - side[2] * hw * 0.8, n[0], n[1], n[2], u1, v0);
  g.vert(tip[0] + side[0] * hw * 0.8, tip[1] + side[1] * hw * 0.8, tip[2] + side[2] * hw * 0.8, n[0], n[1], n[2], u1, v1);
  g.tri(b, b + 2, b + 3); g.tri(b, b + 3, b + 1); g.tri(b + 2, b + 4, b + 5); g.tri(b + 2, b + 5, b + 3);
}
/** camera-independent leaf cluster card centred at c, facing a random direction */
function cluster(g, x, y, z, s, cell, R) {
  const yaw = R() * Math.PI * 2, tilt = (R() - 0.5) * 1.2;
  const [u0, v0, u1, v1] = cell, c = Math.cos(yaw), sn = Math.sin(yaw);
  const ax = c * s / 2, az = sn * s / 2, up = [Math.sin(tilt) * sn * s / 2, Math.cos(tilt) * s / 2, -Math.sin(tilt) * c * s / 2];
  const nx = -sn, nz = c;
  g._grow(4, 6);
  const b = g.vn;
  // normals bent outward from the crown centre for soft volume shading
  const on = [x, y, z];
  const l = Math.hypot(on[0], on[1] - s, on[2]) || 1;
  const bn = [on[0] / l * 0.7 + nx * 0.3, (on[1] - s) / l * 0.7 + 0.3, on[2] / l * 0.7 + nz * 0.3];
  g.vert(x - ax - up[0], y - up[1], z - az - up[2], bn[0], bn[1], bn[2], u0, v0);
  g.vert(x + ax - up[0], y - up[1], z + az - up[2], bn[0], bn[1], bn[2], u1, v0);
  g.vert(x + ax + up[0], y + up[1], z + az + up[2], bn[0], bn[1], bn[2], u1, v1);
  g.vert(x - ax + up[0], y + up[1], z - az + up[2], bn[0], bn[1], bn[2], u0, v1);
  g.tri(b, b + 1, b + 2); g.tri(b, b + 2, b + 3);
}

const SPECIES = {
  'veg.pine_a': { kind: 'conifer', H: 16, bare: 0.42, whorls: 13, per: 6, len: 3.0, cell: 'pine', bark: 'tex.bark_pine', droop: 0.5, tint: 0xd8d0c4 },
  'veg.pine_b': { kind: 'conifer', H: 20, bare: 0.55, whorls: 12, per: 5, len: 2.6, cell: 'pine', bark: 'tex.bark_pine', droop: 0.35, tint: 0xd0c4b4 },
  'veg.spruce_a': { kind: 'conifer', H: 22, bare: 0.18, whorls: 18, per: 7, len: 3.4, cell: 'spruce', bark: 'tex.bark_pine', droop: 0.9, tint: 0xb8b0a8 },
  'veg.oak_a': { kind: 'broad', H: 11, crown: [5.2, 3.8], trunk: 0.42, clusters: 70, cell: 'broad', bark: 'tex.bark_oak' },
  'veg.maple_a': { kind: 'broad', H: 10, crown: [4.2, 3.6], trunk: 0.34, clusters: 60, cell: 'maple', bark: 'tex.bark_oak' },
  'veg.street_tree': { kind: 'broad', H: 8, crown: [3.0, 2.6], trunk: 0.22, clusters: 44, cell: 'broad', bark: 'tex.bark_oak' },
  'veg.palm_a': { kind: 'palm', H: 9, lean: 0.35, fronds: 16 },
  'veg.palm_b': { kind: 'palm', H: 11, lean: 0.55, fronds: 18 },
};
export const TREE_SPECIES = Object.keys(SPECIES);

function conifer(S, lod, R) {
  const bark = new GB(256), leaf = new GB(1024);
  bark.mat(S.bark, S.tint); bark.groundAO = false;
  const H = S.H, r0 = H * 0.018 + 0.12;
  bark.cyl(0, -0.3, 0, r0 * 1.25, r0 * 0.12, H + 0.3, lod ? 5 : 8, { noBottom: true });
  const cell = leafCell(S.cell);
  const whorls = lod ? 4 : S.whorls, per = lod ? 4 : S.per;
  for (let w = 0; w < whorls; w++) {
    const t = w / (whorls - 1), y = H * (S.bare + (1 - S.bare) * t);
    const L = S.len * (1.15 - t * 0.95) * (lod ? 1.5 : 1) + 0.4, rot = R() * 6.28;
    for (let k = 0; k < per; k++) {
      const yaw = rot + (k / per) * Math.PI * 2 + (R() - 0.5) * 0.4, pitch = -0.15 - 0.25 * S.droop + R() * 0.15;
      frond(leaf, Math.sin(yaw) * r0 * 0.5, y, -Math.cos(yaw) * r0 * 0.5, yaw, pitch, L, L * (0.55 + 0.15 * R()), cell, 0, L * 0.25 * S.droop);
      if (!lod && R() < 0.6) frond(leaf, Math.sin(yaw) * r0 * 0.5, y + 0.15, -Math.cos(yaw) * r0 * 0.5, yaw + 0.2, pitch + 0.1, L * 0.8, L * 0.45, cell, 1.3, L * 0.2 * S.droop);
    }
  }
  // leader tip
  frond(leaf, 0, H * 0.96, 0, 0, 1.45, H * 0.07 + 0.6, 0.9, cell, 0, 0);
  frond(leaf, 0, H * 0.96, 0, 1.57, 1.45, H * 0.07 + 0.6, 0.9, cell, 0, 0);
  return { bark, leaf };
}
function broadleaf(S, lod, R) {
  const bark = new GB(256), leaf = new GB(1024);
  bark.mat(S.bark, 0xd0c8bc); bark.groundAO = false;
  const H = S.H, trunkH = H - S.crown[1] * 1.55, rt = S.trunk;
  bark.cyl(0, -0.3, 0, rt * 1.2, rt * 0.75, trunkH + 0.3, lod ? 5 : 8, { noBottom: true });
  const cy = trunkH + S.crown[1] * 0.9, cr = S.crown[0];
  const limbs = lod ? 2 : 5;
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * 6.28 + R(), up = 0.5 + R() * 0.5;
    const end = [Math.sin(a) * cr * 0.6, cy + up * S.crown[1] * 0.5, -Math.cos(a) * cr * 0.6];
    bark.tube([0, trunkH * 0.95, 0], end, rt * 0.55, rt * 0.2, 5, { noTop: true, noBottom: true });
  }
  const cell = leafCell(S.cell);
  const n = lod ? 10 : S.clusters;
  for (let k = 0; k < n; k++) {
    const a = R() * 6.28, el = Math.acos(1 - 2 * Math.pow(R(), 0.8)) - 0.2, rr = 0.55 + 0.45 * Math.sqrt(R());
    const x = Math.sin(el) * Math.cos(a) * cr * rr, y = cy + Math.cos(el) * S.crown[1] * rr, z = Math.sin(el) * Math.sin(a) * cr * rr;
    cluster(leaf, x, y, z, (lod ? 3.6 : 2.2) * (0.8 + 0.4 * R()) * (cr / 4.5 + 0.4), cell, R);
  }
  return { bark, leaf };
}
function palm(S, lod, R) {
  const bark = new GB(256), leaf = new GB(512);
  bark.mat('tex.bark_palm', 0xe0d4c0); bark.groundAO = false;
  const H = S.H, segs = lod ? 3 : 7, lean = S.lean;
  let prev = [0, -0.3, 0];
  const pt = (t) => [Math.sin(t * 1.4) * lean * H * 0.35 * t, t * H, 0];
  for (let i = 1; i <= segs; i++) { const p = pt(i / segs); bark.tube(prev, p, 0.24 - 0.06 * (i - 1) / segs, 0.24 - 0.06 * i / segs, lod ? 5 : 7, { noTop: i < segs, noBottom: true }); prev = p; }
  const top = pt(1), cell = leafCell('palm');
  const nf = lod ? 7 : S.fronds;
  for (let k = 0; k < nf; k++) {
    const yaw = (k / nf) * 6.28 + R() * 0.3, pitch = 0.5 - R() * 0.9, L = 4.2 + R() * 1.4;
    frond(leaf, top[0], top[1], top[2], yaw, pitch, L, 1.6, cell, 0.15, L * 0.55);
  }
  return { bark, leaf };
}
/** species geometry {bark, leaf} arrays for lod 0/1 (cached) */
export function treeGeometry(id, lod = 0) {
  const key = id + ':' + lod;
  let r = cache.get(key);
  if (r) return r;
  const S = SPECIES[id], R = srng(id.length * 131 + lod * 7 + 3);
  const g = S.kind === 'conifer' ? conifer(S, lod, R) : S.kind === 'palm' ? palm(S, lod, R) : broadleaf(S, lod, R);
  r = { bark: g.bark.toArrays(), leaf: g.leaf.toArrays(), height: S.H, kind: S.kind };
  windWeights(r.bark, S.H, 0.4); windWeights(r.leaf, S.H, 1);
  cache.set(key, r);
  return r;
}
function windWeights(a, H, k) {
  const n = a.position.length / 3, w = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const y = a.position[i * 3 + 1] / H, r = Math.hypot(a.position[i * 3], a.position[i * 3 + 2]) / (H * 0.3); w[i] = Math.min(255, Math.round(255 * k * Math.min(1, Math.max(0, y) ** 1.5 * 0.8 + r * 0.35))); }
  a.wind = w;
}
/** small plants: bush / fern / grass / reeds / flowers / groundcover / hedge / ivy as card clumps */
export function plantGeometry(id) {
  if (cache.has(id)) return cache.get(id);
  const R = srng(id.length * 17 + 5), leaf = new GB(256);
  const C = (n) => leafCell(n);
  const crossed = (cell, w, h, n = 3) => { for (let k = 0; k < n; k++) { const yaw = (k / n) * Math.PI + R() * 0.3; leaf.card(0, h / 2, 0, w, h, yaw, cell[0], cell[1], cell[2], cell[3]); } };
  switch (id) {
    case 'veg.bush_a': case 'veg.bush_b': for (let k = 0; k < (id === 'veg.bush_a' ? 12 : 9); k++) { const a = R() * 6.28, r = R() * 0.5; cluster(leaf, Math.cos(a) * r, 0.45 + R() * 0.5, Math.sin(a) * r, 1.0 + R() * 0.4, C('broad'), R); } break;
    case 'veg.hedge': for (let k = 0; k < 16; k++) cluster(leaf, (R() - 0.5) * 2.6, 0.3 + R() * 0.8, (R() - 0.5) * 0.6, 0.9, C('broad'), R); break;
    case 'veg.fern': for (let k = 0; k < 6; k++) { const yaw = (k / 6) * 6.28 + R() * 0.4; frond(leaf, 0, 0.05, 0, yaw, 0.55 + R() * 0.3, 0.75, 0.42, C('fern'), 0, 0.25); } break;
    case 'veg.grass_tuft': crossed(C('grass'), 0.6, 0.5); break;
    case 'veg.reeds': crossed(C('reeds'), 1.0, 1.6); break;
    case 'veg.flowers': crossed(C('reeds'), 0.6, 0.45, 2); break;
    case 'veg.groundcover': for (let k = 0; k < 4; k++) frond(leaf, 0, 0.02, 0, k * 1.57 + R(), 0.12, 0.5, 0.5, C('grass'), 0, 0.05); break;
    default: leaf.card(0, 1.5, 0, 1, 3, 0, ...C('broad')); // ivy
  }
  const a = leaf.toArrays(); windWeights(a, 1.2, 0.8);
  const r = { leaf: a };
  cache.set(id, r);
  return r;
}
