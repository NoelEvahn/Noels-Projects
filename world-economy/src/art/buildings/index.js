// Detailed building builders (Annex A 6.2) for every bld.* archetype. Façade grammar from facade.js; seeded variation per
// placement (wall tint, awnings, fire escapes, AC units, water towers, balconies). Output: one batch per material
// ('mat.world' opaque layers, 'mat.world_ds' double-sided fabric/cards); the chunk manager merges them per chunk (O1).
// LOD0 = recessed windows and real detail, LOD1 = facade-module quads + cornice/roof clutter, LOD2 = facade box (far proxy).
import { GB, srng, h01, out } from '../kit/geo.js';
import { Builders } from '../../render/builders.js';
import { ARCHETYPES } from '../../world/archetypes.js';
import { rectFaces, enterFace, faceWindows, faceFlat, storefront, awning, cornice, parapet, flatRoof, plinth, roofClutter, fireEscape, windowBox } from './facade.js';

// pooled writers: a generator build may be interleaved with another chunk job, so every build takes its own GB pair
const POOL = [];
function take() { const g = POOL.pop() || new GB(1 << 14); g.reset(); g.ds = (g.ds || new GB(1024)).reset(); return g; }
function give(g) { POOL.push(g); }
function finish(g) { return out({ 'mat.world': g, 'mat.world_ds': g.ds }); }
/** register a generator builder (yields between faces so the chunk pump stays inside its slice) plus its plain form */
function regGen(id, gen) {
  const run = (pl, ctx) => { const it = genWrap(pl, ctx); let r; do r = it.next(); while (!r.done); return r.value; };
  function* genWrap(pl, ctx) { const g = take(); try { yield* gen(pl, ctx, g); return finish(g); } finally { give(g); } }
  run.gen = genWrap;
  Builders.register(id, run, { stage: 3 });
}
const pick = (R, arr) => arr[Math.floor(R() * arr.length) % arr.length];
function dims(pl) {
  const A = ARCHETYPES[pl.archetype], p = pl.params || {};
  const w = p.w || A.size[0], d = p.d || A.size[2], H = p.h || A.size[1], F = Math.max(1, p.floors || 1);
  return { w, d, H, F, st: H / F, variant: p.variant || '' };
}

// ---- generic multi-storey block --------------------------------------------------------------------------------------------
/** S: { wall:[tex, tints[]], facade, bay, win:[w,h,sill], recess, bars, sill, lintel, ground:'shop'|'lobby'|'plain', shopAll,
 *       awnings, striped, cornice:'corbel'|'slab'|null, parapet, roof, fireEscape, ac, waterTower, balconies, ribbon, pilasters } */
function* block(pl, ctx, S, g) {
  const { w, d, H, F, st } = dims(pl), R = srng(pl.seed), lod = ctx.lod;
  const wallTint = pick(R, S.wall[1]);
  const s = { wallTex: S.wall[0], wallTint, st, bay: S.bay, win: S.win, recess: S.recess || 0.18, bars: S.bars || 0, sill: S.sill !== false, lintel: !!S.lintel,
    emit: 1 + (pl.seed % 120), uOff: R() * 20, ribbon: !!S.ribbon, frameTint: S.frameTint, glassTint: S.glassTint, doorBay: S.ground === 'plain' ? Math.floor(Math.max(1, Math.round(w / S.bay)) / 2) : -1, doorTint: S.doorTint };
  const faces = rectFaces(w, d);
  const shopFace = (f) => S.ground === 'shop' && (f.front || (S.shopAll && R() < 0.7));
  plinth(g, w, d);
  if (lod === 0) {
    for (const f of faces) {
      enterFace(g, f);
      let y0 = 0, fl = F;
      if (S.ground === 'shop' || S.ground === 'lobby') {
        if (shopFace(f) || (S.ground === 'lobby' && f.front)) storefront(g, f, 0, st, s, pl.seed, { awnings: S.awnings || 0, awningTint: pick(R, S.awningTints || [0xb3272d, 0x2d5a3a, 0x24406a, 0x8a2a2a]), striped: S.striped, fascia: pick(R, [0x2c3a3a, 0x3a2a24, 0x1e2a3a, 0x5a1e1e]) });
        else faceWindows(g, f, 0, 1, { ...s, doorBay: -1 }, pl.seed);
        y0 = st; fl = F - 1;
      }
      const acP = S.ac || 0, R2 = srng(pl.seed + f.i * 7);
      if (fl > 0) for (let k = 0; k < fl; k++) { if (k && k % 2 === 0) yield; faceWindows(g, f, y0 + k * st, 1, s, pl.seed, (i, flr, cx, wy0, wy1, x0, x1) => {
        if (S.windowBoxes && flr < 3 && R2() < S.windowBoxes) windowBox(g, cx, wy0, x1 - x0, pl.seed + f.i * 5, i + flr * 17);
        if (acP && R2() < acP) { g.mat('tex.metal_galvanized', 0xd8d8d0); g.box(cx + (R2() - 0.5) * 0.4, wy0 - 0.35, -0.3, 0.75, 0.48, 0.55); g.mat(s.wallTex, s.wallTint); }
        if (S.balconies && !f.front === false && flr % 1 === 0 && h01(pl.seed + i, flr) < S.balconies) {
          g.mat('tex.concrete_cast', 0xc8c4bc); g.box(cx, wy0 - s.win[2] + 0.1, -0.7, x1 - x0 + 1.2, 0.18, 1.4);
          g.mat('tex.metal_galvanized', 0xe0e0e0); g.box(cx, wy0 - s.win[2] + 0.65, -1.38, x1 - x0 + 1.2, 0.9, 0.05); g.mat(s.wallTex, s.wallTint);
        }
      }); }
      if (S.pilasters) { g.mat(s.wallTex, s.wallTint); const n = Math.max(1, Math.round(f.L / s.bay)); for (let i = 0; i <= n; i += 2) g.box(Math.min(f.L - 0.3, Math.max(0.3, (i * f.L) / n)), (st + H) / 2, -0.1, 0.6, H - st, 0.2, { noBottom: true }); }
      if (S.fireEscape && !f.front && f.i !== 2 && h01(pl.seed, f.i + 3) < S.fireEscape && F >= 3) fireEscape(g, f.L * (0.3 + 0.4 * h01(pl.seed, 9)), st, F - 1, st);
      g.pop(); yield;
    }
  } else {
    for (const f of faces) {
      enterFace(g, f);
      if (S.ground === 'shop' || S.ground === 'lobby') { faceFlat(g, f, 0, st, 900, 901, s, (shopFace(f) || f.front) ? 'tex.facade_shop' : S.facade, (shopFace(f) || f.front) ? 0xffffff : wallTint, s.emit); faceFlat(g, f, st, H, 1, F, s, S.facade, wallTint, s.emit); }
      else faceFlat(g, f, 0, H, 0, F, s, S.facade, wallTint, s.emit);
      g.pop();
    }
  }
  yield;
  // crown
  if (S.cornice === 'corbel') { cornice(g, w, d, H - 0.9, 0.5, 0.25, s.wallTex, wallTint); cornice(g, w, d, H - 0.4, 0.55, 0.45, 'tex.concrete_cast', 0xc8c0b0); }
  else if (S.cornice === 'slab') cornice(g, w, d, H - 0.3, 0.4, 0.3, 'tex.concrete_cast', 0xbab6ae);
  if (S.parapet !== false && lod <= 1) parapet(g, w, d, H, 0.9, 0.3, s.wallTex, wallTint);
  flatRoof(g, w - 0.4, d - 0.4, H + 0.05, 'tex.gravel', 0x8a8682);
  if (lod <= 1) roofClutter(g, w, d, H, R, { waterTower: S.waterTower && R() < S.waterTower, wallTex: s.wallTex, wallTint, mast: F > 12 ? [w * 0.2, d * 0.2, 6 + F * 0.3] : null });
  if (S.after) S.after(g, { w, d, H, F, st, lod, R, s, pl });
}

const BRICK_TINTS = [0xffffff, 0xf0e0d8, 0xd8c8c0, 0xffe8dc, 0xc8b0a8];
const STYLES = {
  'bld.brick_loft': { windowBoxes: 0.14, wall: ['tex.brick_red', BRICK_TINTS], facade: 'tex.facade_brick', bay: 3.4, win: [1.35, 2.3, 0.9], recess: 0.24, bars: 1, lintel: true, ground: 'shop', awnings: 0.7, cornice: 'corbel', fireEscape: 0.45, ac: 0.12, waterTower: 0.25, pilasters: true },
  'bld.brick_walkup': { windowBoxes: 0.3, wall: ['tex.brick_brown', [0xffffff, 0xf0d8cc, 0xe0d0c8]], facade: 'tex.facade_brick', bay: 3.0, win: [1.1, 1.7, 0.85], recess: 0.2, bars: 1, lintel: true, ground: 'plain', cornice: 'corbel', fireEscape: 0.35, ac: 0.1, waterTower: 0.1 },
  'bld.mixed_use': { windowBoxes: 0.16, wall: ['tex.brick_painted_white', [0xffffff, 0xe8dcc8, 0xd8e0e4, 0xf0e4d0]], facade: 'tex.facade_stucco', bay: 3.2, win: [1.2, 1.6, 0.9], recess: 0.16, bars: 2, ground: 'shop', shopAll: true, awnings: 0.5, striped: true, cornice: 'slab', ac: 0.15 },
  'bld.panel_midrise': { wall: ['tex.concrete_panel', [0xffffff, 0xe8e8e0, 0xdcd8d0, 0xe4e0d4]], facade: 'tex.facade_panel', bay: 3.0, win: [1.6, 1.4, 0.9], recess: 0.12, bars: 1, ground: 'lobby', cornice: null, balconies: 0.35, ac: 0.05 },
  'bld.office_midrise': { wall: ['tex.concrete_cast', [0xffffff, 0xe0dcd4, 0xd0d4d8]], facade: 'tex.facade_office', bay: 3.6, win: [3.4, 2.0, 0.9], recess: 0.15, ribbon: true, ground: 'lobby', cornice: 'slab', frameTint: 0x30363c },
  'bld.apartment_block': { windowBoxes: 0.12, wall: ['tex.brick_brown', [0xffffff, 0xe8d8c8]], facade: 'tex.facade_brick', bay: 3.2, win: [1.4, 1.5, 0.9], recess: 0.16, bars: 1, ground: 'lobby', cornice: 'slab', balconies: 0.45, ac: 0.08 },
  'bld.diner': { wall: ['tex.brick_red', [0xffffff]], facade: 'tex.facade_brick', bay: 3.4, win: [1.2, 1.7, 0.9], recess: 0.2, bars: 1, ground: 'shop', shopAll: true, awnings: 1.0, awningTints: [0xb3272d], cornice: 'corbel' },
  'bld.bank': { wall: ['tex.concrete_cast', [0xf4ece0, 0xe8e0d0]], facade: 'tex.facade_concrete', bay: 4.2, win: [1.6, 2.6, 1.0], recess: 0.3, bars: 1, ground: 'plain', cornice: 'slab', after: bankPortico },
  'bld.port_town_house': { windowBoxes: 0.34, wall: ['tex.stucco', [0xfff4e0, 0xf8e0c8, 0xe0ecf0, 0xf0d8d0, 0xe8f0d8]], facade: 'tex.facade_stucco', bay: 3.0, win: [1.0, 1.5, 0.9], recess: 0.15, bars: 2, ground: 'plain', parapet: false, cornice: null, after: tileRoofHouse },
};
for (const id in STYLES) regGen(id, (pl, ctx, g) => block(pl, ctx, STYLES[id], g));

function bankPortico(g, { w, d, H, F, st, lod, pl }) {
  // columns, steps and pediment on the front face
  const n = 6, cw = Math.min(w * 0.7, 26);
  g.mat('tex.concrete_cast', 0xf0e8dc);
  for (let k = 0; k < 4; k++) g.box(0, 0.15 + k * 0.3, -d / 2 - 3.6 + k * 0.6, cw + 2, 0.3, 1.2 + (3 - k) * 0.0);
  g.box(0, st * 2 + 0.5, -d / 2 - 2.2, cw + 1, 1.0, 4.6);
  if (lod === 0) for (let k = 0; k < n; k++) { const x = -cw / 2 + (k * cw) / (n - 1); g.cyl(x, 1.2, -d / 2 - 2.6, 0.5, 0.42, st * 2 - 0.7, 12); g.box(x, 1.25, -d / 2 - 2.6, 1.2, 0.3, 1.2); }
  else for (let k = 0; k < n; k++) { const x = -cw / 2 + (k * cw) / (n - 1); g.box(x, st, -d / 2 - 2.6, 0.9, st * 2, 0.9); }
  g.push().translate(0, st * 2 + 1.0, -d / 2 - 2.2); g.gable(cw + 1, 4.6, 0, 2.4, { alongX: false, over: 0.2, wall: 'tex.concrete_cast', wallTint: 0xf0e8dc }); g.pop();
  if ((pl.params || {}).variant === 'cityhall') { // clock cupola
    g.mat('tex.concrete_cast', 0xf0e8dc); g.box(0, H + 3, 0, 7, 6, 7);
    g.mat('tex.roof_metal_red', 0x5a8a7a); g.cyl(0, H + 6, 0, 4.4, 0.4, 6, 12);
    g.mat('tex.glass_window', 0xfff0c0); g.emit(140); for (const [x, z, yaw] of [[0, -3.52, 0], [3.52, 0, 1.57], [0, 3.52, 3.14], [-3.52, 0, -1.57]]) { g.push().translate(x, H + 4, z).rotY(yaw); g.cyl(0, 0, 0, 1.3, 1.3, 0.05, 16, { phase: 0 }); g.pop(); } g.emit(0);
  }
  void F;
}
function tileRoofHouse(g, { w, d, H, lod, R }) {
  g.mat('tex.roof_tile', 0xffffff); g.push().translate(0, H, 0); g.gable(w, d, 0, Math.min(w, d) * 0.28, { alongX: w > d, over: 0.5, wall: 'tex.stucco', wallTint: 0xf0e4d0 }); g.pop();
  if (lod === 0) { // shutters and a balcony
    g.mat('tex.wood_painted', pick(R, [0x3a6a5a, 0x2e4a7a, 0x7a3a2a, 0x5a7a3a]));
    const n = Math.max(1, Math.round(w / 3.0)), bw = w / n;
    for (let f = 0; f < Math.round(H / 3.2); f++) for (let i = 0; i < n; i++) { const cx = -w / 2 + (i + 0.5) * bw, y = f * (H / Math.max(1, Math.round(H / 3.2))) + 0.9 + 0.75; for (const sx of [-1, 1]) g.box(cx + sx * 0.8, y, -d / 2 - 0.05, 0.55, 1.5, 0.05); }
    if (R() < 0.6) { g.mat('tex.concrete_cast', 0xe8e0d0); g.box(0, H * 0.5 + 0.1, -d / 2 - 0.6, w * 0.4, 0.15, 1.2); g.mat('tex.metal_painted', 0x2a2a2a); g.box(0, H * 0.5 + 0.6, -d / 2 - 1.17, w * 0.4, 0.9, 0.04); }
  }
}

// ---- glass tower and podium -----------------------------------------------------------------------------------------------------------------
function* glassTower(pl, ctx, g) {
  const { w, d, H, F } = dims(pl), R = srng(pl.seed), lod = ctx.lod;
  const pod = 9, tw = w * (0.78 + R() * 0.12), td = d * (0.78 + R() * 0.12), emit = 1 + (pl.seed % 120);
  plinth(g, w, d);
  // podium: lobby glazing + stone
  const s = { wallTex: 'tex.concrete_cast', wallTint: 0x9a9a9a, st: 4.5, bay: 4, emit, uOff: 0 };
  for (const f of rectFaces(w, d)) { enterFace(g, f); if (lod === 0) storefront(g, f, 0, 4.5, s, pl.seed, { pierTex: 'tex.concrete_cast', pierTint: 0x6a6a6a, fascia: 0x1a1e24 }); else faceFlat(g, f, 0, 4.5, 900, 901, s, 'tex.facade_shop', 0xffffff, emit); g.mat('tex.concrete_cast', 0x8a8a8a); g.wall(0, 4.5, f.L, pod); g.pop(); }
  flatRoof(g, w, d, pod, 'tex.paver', 0xb0aca4);
  // tower curtain wall
  const curtain = R() < 0.5 ? 0xffffff : 0xb8c8d8;
  for (const f of rectFaces(tw, td)) {
    enterFace(g, f); g.mat('tex.glass_curtain', curtain); g.emit(emit); g.wall(0, pod, f.L, H, 0, f.i * 50); g.emit(0);
    if (lod === 0) { g.mat('tex.metal_painted', 0x3a4048); const n = Math.round(f.L / 3.6); for (let i = 0; i <= n; i++) g.box(Math.min(f.L - 0.08, Math.max(0.08, (i * f.L) / n)), (pod + H) / 2, -0.15, 0.16, H - pod, 0.3, { noBottom: true, noTop: true }); }
    g.pop();
  }
  // crown setback + mast
  g.mat('tex.metal_painted', 0x2e3640); g.box(0, H + 1.5, 0, tw * 0.6, 3, td * 0.6);
  flatRoof(g, tw, td, H, 'tex.gravel', 0x6a6864); parapet(g, tw, td, H, 1.2, 0.3, 'tex.metal_painted', 0x2e3640);
  if (lod <= 1) { g.mat('tex.metal_galvanized', 0xd0d0d0); g.cyl(tw * 0.15, H + 3, 0, 0.5, 0.1, 8 + F * 0.4, 6); g.mat('tex.flat', 0xff2010); g.emit(200); g.box(tw * 0.15, H + 11 + F * 0.4, 0, 0.4, 0.4, 0.4); g.emit(0); }
}
regGen('bld.glass_tower', glassTower);
function* podiumMall(pl, ctx, g) {
  const { w, d, H } = dims(pl), lod = ctx.lod, emit = 1 + (pl.seed % 120);
  plinth(g, w, d);
  const s = { wallTex: 'tex.concrete_cast', wallTint: 0x8a8a8a, st: 4.5, bay: 4.5, emit, uOff: 0 };
  for (const f of rectFaces(w, d)) {
    enterFace(g, f);
    if (lod === 0 && (f.front || f.i === 1)) storefront(g, f, 0, 4.5, s, pl.seed, { pierTex: 'tex.concrete_cast', pierTint: 0x5a5a5a, fascia: 0x1a2028 }); else faceFlat(g, f, 0, 4.5, 900, 901, s, 'tex.facade_shop', 0xffffff, emit);
    g.mat('tex.glass_curtain', 0x9ab0c8); g.emit(emit); g.wall(0, 4.5, f.L, H - 1.2, 0, f.i * 20); g.emit(0);
    g.mat('tex.concrete_cast', 0xc8c4bc); g.wall(0, H - 1.2, f.L, H);
    g.pop();
  }
  flatRoof(g, w, d, H, 'tex.paver', 0xa8a49c); parapet(g, w, d, H, 1.1, 0.25, 'tex.glass_curtain', 0x9ab0c8);
  if (lod <= 1) { g.mat('tex.concrete_cast', 0x8a8478); for (let k = 0; k < 6; k++) g.box(-w * 0.3 + (k % 3) * w * 0.3, H + 0.4, (k < 3 ? -1 : 1) * d * 0.2, 3, 0.8, 1.4); g.mat('tex.metal_painted', 0xe0e0e0); g.box(0, 5.2, -d / 2 - 2.5, w * 0.4, 0.3, 5); }
}
regGen('bld.podium_mall', podiumMall);

// ---- houses, cabins, small timber buildings ---------------------------------------------------------------------------------------------
function* smallBuilding(pl, ctx, o, g) {
  const { w, d, H, F } = dims(pl), R = srng(pl.seed), lod = ctx.lod;
  const wallH = Math.max(2.8, o.wallH ? o.wallH(H, F) : Math.min(H, F * 3.0));
  const st = wallH / Math.max(1, F), emit = 1 + (pl.seed % 120);
  const wallTint = pick(R, o.tints);
  const s = { wallTex: o.wall, wallTint, st, bay: o.bay || 3.2, win: o.win || [1.1, 1.3, 0.95], recess: 0.1, bars: o.bars == null ? 2 : o.bars, sill: true, emit, uOff: R() * 10, doorBay: Math.floor(Math.max(1, Math.round(w / (o.bay || 3.2))) / 2), doorTex: o.doorTex, doorTint: o.doorTint, frameTint: o.frameTint || 0xf0ece4, sillTex: o.sillTex || 'tex.wood_painted', sillTint: o.frameTint || 0xf0ece4 };
  g.mat(o.base || 'tex.stone_fieldstone', 0xb0aaa0); g.box(0, -0.5, 0, w + 0.2, 1.4, d + 0.2, { noBottom: true });
  for (const f of rectFaces(w, d)) {
    enterFace(g, f);
    if (lod === 0) faceWindows(g, f, 0.2, F, s, pl.seed); else faceFlat(g, f, 0.2, wallH + 0.2, 0, F, s, o.flat || 'tex.facade_stucco', o.flatTint || wallTint, emit);
    g.pop();
  }
  const rise = Math.min(w, d) * (o.pitch || 0.32);
  g.mat(o.roof, pick(R, o.roofTints || [0xffffff]));
  g.push().translate(0, wallH + 0.2, 0); g.gable(w, d, 0, rise, { alongX: w >= d, over: o.over || 0.5, wall: o.wall, wallTint }); g.pop();
  if (o.extra) o.extra(g, { w, d, H, F, wallH: wallH + 0.2, rise, lod, R, s, pl });
}
function porch(g, w, d, y, R, o = {}) {
  const pw = Math.min(w * 0.7, 6), pd = 2.0;
  g.mat('tex.wood_planks', 0xd0c0a8); g.box(0, 0.25, -d / 2 - pd / 2, pw, 0.3, pd);
  g.mat(o.post || 'tex.wood_painted', o.postTint || 0xf0ece4);
  for (const sx of [-1, 1]) g.box(sx * (pw / 2 - 0.12), (y + 0.4) / 2, -d / 2 - pd + 0.15, 0.16, y - 0.2, 0.16, { noBottom: true });
  g.mat(o.roof || 'tex.roof_shingle', o.roofTint || 0xffffff);
  g.quad([pw / 2 + 0.2, y - 0.2, -d / 2 - pd - 0.3], [-pw / 2 - 0.2, y - 0.2, -d / 2 - pd - 0.3], [-pw / 2 - 0.2, y + 0.35, -d / 2], [pw / 2 + 0.2, y + 0.35, -d / 2]);
  if (o.rail) { g.mat('tex.wood_painted', 0xf0ece4); g.box(-pw / 4 - 0.6, 0.85, -d / 2 - pd + 0.15, pw / 2 - 1.2, 0.07, 0.07); g.box(pw / 4 + 0.6, 0.85, -d / 2 - pd + 0.15, pw / 2 - 1.2, 0.07, 0.07); }
  void R;
}
function chimney(g, x, z, top, tex = 'tex.brick_red', tint = 0xffffff, sz = 0.9) {
  g.mat(tex, tint); g.box(x, top / 2, z, sz, top, sz, { noBottom: true }); g.mat('tex.concrete_cast', 0x6a6864); g.box(x, top + 0.1, z, sz + 0.15, 0.2, sz + 0.15);
}
const SMALL = {
  'bld.house_suburban': { wall: 'tex.wood_painted', tints: [0xffffff, 0xe8e0c8, 0xc8d8e0, 0xd8e4d0, 0xf0d8c8, 0xb0bcc8], roof: 'tex.roof_shingle', roofTints: [0xffffff, 0xc8b8a8, 0x9aa0a8], flat: 'tex.facade_stucco', win: [1.2, 1.4, 0.9],
    extra: (g, { w, d, wallH, rise, lod, R }) => { porch(g, w, d, Math.min(wallH, 3.0), R, { rail: lod === 0 }); chimney(g, w * 0.3, d * 0.15, wallH + rise + 0.6); if (R() < 0.4) { g.mat('tex.wood_painted', 0xe8e8e4); g.box(w / 2 - 1.8, 1.2, -d / 2 - 0.05, 2.8, 2.3, 0.1); } } },
  'bld.cabin_log': { wall: 'tex.log_round', tints: [0xffffff, 0xe0d0b8], roof: 'tex.roof_shingle', roofTints: [0xffffff, 0xb0a090], flat: 'tex.log_round', bay: 3.6, win: [0.9, 1.0, 1.0], bars: 2, frameTint: 0x5a4a3a, doorTex: 'tex.wood_planks', doorTint: 0x8a6a48, base: 'tex.stone_fieldstone', wallH: () => 3.0,
    extra: (g, { w, d, wallH, rise, lod, R }) => { porch(g, w, d, wallH - 0.2, R, { post: 'tex.log_round', postTint: 0xffffff, roof: 'tex.roof_shingle' }); chimney(g, w / 2 + 0.6, 0, wallH + rise + 1.0, 'tex.stone_fieldstone', 0xffffff, 1.4);
      if (lod === 0) { g.mat('tex.log_round', 0xe8d8c0); for (let k = 0; k < 9; k++) for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.cyl(sx * (w / 2 + 0.05), 0.2 + k * 0.33, sz * (d / 2 + 0.05), 0.17, 0.17, 0.3, 6); } } },
  'bld.cabin_plank': { wall: 'tex.planks_wall', tints: [0xffffff, 0xd8c8b0, 0xc0a890], roof: 'tex.roof_metal_red', flat: 'tex.planks_wall', bay: 3.2, win: [0.9, 1.1, 0.95], frameTint: 0xe8e4dc, pitch: 0.35, wallH: () => 2.9,
    extra: (g, { w, d, wallH, lod }) => { chimney(g, -w * 0.3, d * 0.2, wallH + 2.2, 'tex.metal_galvanized', 0x9a9a9a, 0.35); if (lod === 0) { g.mat('tex.wood_painted', 0x3a5a3a); for (const sx of [-1, 1]) g.box(sx * 1.9, 1.55, -d / 2 - 0.06, 0.5, 1.1, 0.05); } } },
  'bld.general_store': { wall: 'tex.planks_wall', tints: [0xffffff, 0xe8d8c0], roof: 'tex.roof_metal_red', roofTints: [0xc8c8c8], bay: 3.0, win: [1.4, 1.6, 0.8], wallH: (H) => Math.max(3.4, H * 0.8),
    extra: (g, { w, d, wallH, rise, R }) => { g.mat('tex.planks_wall', 0xf0e0c8); g.box(0, wallH + rise * 0.6, -d / 2 - 0.1, w, rise * 1.3 + 1.2, 0.2); g.mat('tex.wood_painted', 0x8a2a20); g.box(0, wallH + rise * 0.6, -d / 2 - 0.25, w * 0.7, 0.9, 0.08); porch(g, w * 1.4, d, wallH - 0.3, R, { rail: false }); } },
  'bld.ranger_station': { wall: 'tex.planks_wall', tints: [0xc8a880], roof: 'tex.roof_metal_red', roofTints: [0x6a8a5a], bay: 3.0, win: [1.2, 1.2, 0.9], wallH: () => 3.0,
    extra: (g, { w, d, wallH, R }) => { porch(g, w, d, wallH - 0.2, R, { roof: 'tex.roof_metal_red', roofTint: 0x6a8a5a }); g.mat('tex.metal_galvanized', 0xe0e0e0); g.cyl(-w / 2 - 3, 0, -d / 2 - 2, 0.07, 0.05, 9, 6); g.mat('tex.fabric_canvas', 0x2a6a3a); g.ds.mat('tex.fabric_canvas', 0x2a6a3a); g.ds.quad([-w / 2 - 3, 8.9, -d / 2 - 2], [-w / 2 - 4.6, 8.9, -d / 2 - 2], [-w / 2 - 4.6, 7.9, -d / 2 - 2], [-w / 2 - 3, 7.9, -d / 2 - 2]); } },
  'bld.harbor_shed': { wall: 'tex.wood_painted', tints: [0x7a9ab0, 0x9a5040, 0x6a8a6a, 0xd0c8b0, 0x4a6a8a], roof: 'tex.metal_corrugated', roofTints: [0xffffff, 0xc8a890], bay: 3.4, win: [1.0, 1.0, 1.2], pitch: 0.22, wallH: (H) => Math.max(3.2, H * 0.75),
    extra: (g, { w, d, lod }) => { g.mat('tex.wood_weathered_dark', 0xffffff); g.box(w * 0.2, 1.6, -d / 2 - 0.08, 3.2, 3.0, 0.12); if (lod === 0) { g.mat('tex.metal_painted', 0x3a3a3a); g.box(w * 0.2, 3.2, -d / 2 - 0.15, 3.6, 0.1, 0.1); } } },
  'bld.fishing_hut': { wall: 'tex.wood_weathered_dark', tints: [0xffffff], roof: 'tex.roof_metal_red', roofTints: [0xd0c0b0], bay: 2.8, win: [1.4, 0.9, 1.1], wallH: () => 2.6,
    extra: (g, { w, d }) => { g.mat('tex.wood_weathered_dark', 0xffffff); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.cyl(sx * (w / 2 - 0.2), -2.5, sz * (d / 2 - 0.2), 0.16, 0.16, 2.6, 6); g.mat('tex.wood_planks', 0xc8b8a0); g.box(0, 1.0, -d / 2 - 0.35, 2.0, 0.08, 0.6); g.mat('tex.wood_weathered_dark', 0xffffff); g.box(w / 2 + 0.8, 1.0, 0, 0.08, 2.0, 2.2); for (let k = 0; k < 3; k++) g.box(w / 2 + 0.8, 0.6 + k * 0.6, 0, 0.5, 0.05, 2.2); } },
};
for (const id in SMALL) regGen(id, (pl, ctx, g) => smallBuilding(pl, ctx, SMALL[id], g));

// ---- industrial and commercial sheds ---------------------------------------------------------------------------------------------------------------
function* shed(pl, ctx, o, g) {
  const { w, d, H, variant } = dims(pl), R = srng(pl.seed), lod = ctx.lod;
  const wallH = o.wallH ? o.wallH(H) : H * 0.8, emit = 1 + (pl.seed % 120);
  const wallTint = pick(R, o.tints);
  plinth(g, w, d);
  for (const f of rectFaces(w, d)) {
    enterFace(g, f);
    g.mat(o.wall, wallTint); g.wall(0, 0, f.L, wallH, 0);
    if (o.bandWin && lod <= 1) { g.mat('tex.glass_window', 0xd0d8e0); g.emit(emit); const n = Math.max(1, Math.floor(f.L / 6)); for (let i = 0; i < n; i++) { const x0 = (i + 0.2) * (f.L / n), x1 = (i + 0.8) * (f.L / n); g.quadUV([x1, wallH - 2.2, -0.03], [x0, wallH - 2.2, -0.03], [x0, wallH - 0.8, -0.03], [x1, wallH - 0.8, -0.03], f.i * 100 + i + 0.1, 3.1, f.i * 100 + i + 0.9, 3.9); } g.emit(0); }
    if (f.front && o.doors) { // roller doors with frames
      const n = o.doors, dw = Math.min(4.2, f.L / (n + 1) - 0.8), dh = Math.min(wallH - 1.2, 4.6);
      for (let k = 0; k < n; k++) {
        const cx = (f.L * (k + 1)) / (n + 1);
        g.mat('tex.metal_corrugated', o.doorTint || 0xd8dcd8); g.push().translate(cx, dh / 2, -0.06).rotZ(Math.PI / 2); g.box(0, 0, 0, dh, dw, 0.1); g.pop();
        g.mat('tex.metal_painted', 0xd8b030); g.box(cx - dw / 2 - 0.12, dh / 2, -0.12, 0.2, dh, 0.2); g.box(cx + dw / 2 + 0.12, dh / 2, -0.12, 0.2, dh, 0.2);
        if (o.dock && lod === 0) { g.mat('tex.concrete_cast', 0xb8b4ac); g.box(cx, 0.6, -2.2, dw + 1.2, 1.2, 4.2); g.mat('tex.rubber_tire', 0xffffff); g.box(cx - dw / 2, 0.9, -4.35, 0.3, 0.5, 0.15); g.box(cx + dw / 2, 0.9, -4.35, 0.3, 0.5, 0.15); }
      }
      if (o.office) { g.mat('tex.glass_window', 0xffffff); g.emit(emit); g.quadUV([f.L - 1, 0.6, -0.04], [f.L - 5, 0.6, -0.04], [f.L - 5, 2.6, -0.04], [f.L - 1, 2.6, -0.04], 0.1, 5.1, 0.9, 5.9); g.emit(0); }
    }
    g.pop();
  }
  yield;
  // roof
  if (o.roofType === 'sawtooth') {
    const n = Math.max(2, Math.round(w / 9)), tw = w / n;
    for (let k = 0; k < n; k++) {
      const x0 = -w / 2 + k * tw, x1 = x0 + tw;
      g.mat(o.roof, 0xffffff); g.quad([x1, wallH, -d / 2], [x1, wallH, d / 2], [x0, wallH + 3, d / 2], [x0, wallH + 3, -d / 2]);
      g.mat('tex.glass_window', 0xc8d0d0); g.emit(emit); g.quadUV([x0, wallH, -d / 2], [x0, wallH, d / 2], [x0, wallH + 3, d / 2], [x0, wallH + 3, -d / 2], k + 0.1, 7.1, k + 0.9, 7.9); g.emit(0);
      g.mat(o.wall, wallTint); g._tri3([x0, wallH, -d / 2], [x1, wallH, -d / 2], [x0, wallH + 3, -d / 2]); g._tri3([x1, wallH, d / 2], [x0, wallH, d / 2], [x0, wallH + 3, d / 2]);
    }
  } else if (o.roofType === 'arch') {
    const n = lod ? 4 : 10, rise = Math.min(w, d) * 0.25;
    g.mat(o.roof, 0xffffff);
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI, a1 = ((k + 1) / n) * Math.PI;
      const x0 = -Math.cos(a0) * w / 2, y0 = wallH + Math.sin(a0) * rise, x1 = -Math.cos(a1) * w / 2, y1 = wallH + Math.sin(a1) * rise;
      g.quad([x0, y0, d / 2 + 0.3], [x1, y1, d / 2 + 0.3], [x1, y1, -d / 2 - 0.3], [x0, y0, -d / 2 - 0.3]);
      g.mat(o.wall, wallTint); g._tri3([0, wallH, -d / 2], [x0, y0, -d / 2], [x1, y1, -d / 2]); g._tri3([0, wallH, d / 2], [x1, y1, d / 2], [x0, y0, d / 2]); g.mat(o.roof, 0xffffff);
    }
  } else if (o.roofType === 'flat') {
    flatRoof(g, w, d, wallH, 'tex.gravel', 0x8a8682); parapet(g, w, d, wallH, 0.8, 0.25, o.wall, wallTint);
  } else {
    g.mat(o.roof, pick(R, o.roofTints || [0xffffff])); g.push().translate(0, wallH, 0); g.gable(w, d, 0, Math.max(1.2, Math.min(H - wallH, 3)), { alongX: w >= d, over: 0.3, wall: o.wall, wallTint }); g.pop();
  }
  if (lod <= 1 && o.vents) { g.mat('tex.metal_galvanized', 0xd0d0d0); for (let k = 0; k < o.vents; k++) g.cyl(-w * 0.35 + (k * w * 0.7) / Math.max(1, o.vents - 1), wallH + 1.5, 0, 0.45, 0.45, 1.0, 8); }
  if (o.extra) o.extra(g, { w, d, H, wallH, lod, R, variant, emit, pl });
}
function signBoard(g, x, y, z, w, h, tint, emit = 160) { g.mat('tex.metal_painted', tint); g.box(x, y, z, w, h, 0.2); g.mat('tex.flat', 0xf0f0e8); g.emit(emit); g.box(x, y, z - 0.11, w * 0.8, h * 0.45, 0.02); g.emit(0); }
const SHEDS = {
  'bld.warehouse': { wall: 'tex.metal_corrugated', tints: [0xffffff, 0xc8d0d8, 0xd8d0c0, 0xa8b8c8], roof: 'tex.metal_corrugated', doors: 3, dock: true, office: true, vents: 4, wallH: () => 7.5, bandWin: true,
    extra: (g, { w, d, wallH, variant }) => { if (variant === 'taxi') signBoard(g, 0, wallH + 1.2, -d / 2 + 0.2, 10, 1.6, 0xe8c020); if (variant === 'hardware') signBoard(g, 0, wallH + 1.2, -d / 2 + 0.2, 14, 2, 0xd85a20); void w; } },
  'bld.factory': { wall: 'tex.brick_brown', tints: [0xffffff, 0xe0c8b8], roof: 'tex.metal_corrugated', doors: 1, roofType: 'sawtooth', bandWin: true, wallH: (H) => H,
    extra: (g, { w, d, wallH, lod }) => { g.mat('tex.brick_brown', 0xffffff); g.cyl(w * 0.36, 0, d * 0.25, 1.6, 1.1, wallH + 16, lod ? 8 : 14); g.mat('tex.concrete_cast', 0x5a5a5a); g.cyl(w * 0.36, wallH + 16, d * 0.25, 1.25, 1.25, 0.6, lod ? 8 : 14); } },
  'bld.garage_workshop': { wall: 'tex.concrete_panel', tints: [0xffffff, 0xe0d8c8], roof: 'tex.metal_corrugated', doors: 3, roofType: 'flat', wallH: (H) => H, office: true, extra: (g, { d, wallH }) => signBoard(g, 0, wallH - 0.6, -d / 2 - 0.12, 9, 1.0, 0x2a4a8a) },
  'bld.shed_corrugated': { wall: 'tex.metal_corrugated', tints: [0xb8c0b0, 0xa0a8a0, 0xc8a080], roof: 'tex.metal_corrugated', doors: 1, wallH: (H) => H * 0.85 },
  'bld.showroom': { wall: 'tex.concrete_panel', tints: [0xffffff], roof: 'tex.metal_corrugated', roofType: 'flat', wallH: (H) => H,
    extra: (g, { w, d, wallH, emit, variant }) => { g.mat('tex.glass_window', 0xffffff); g.emit(emit); g.quadUV([w / 2 - 1, 0.3, -d / 2 - 0.05], [-w / 2 + 1, 0.3, -d / 2 - 0.05], [-w / 2 + 1, wallH - 1, -d / 2 - 0.05], [w / 2 - 1, wallH - 1, -d / 2 - 0.05], 0.1, 0.1, 6.9, 0.9); g.emit(0); signBoard(g, 0, wallH - 0.5, -d / 2 - 0.2, w * 0.5, 0.9, variant === 'marine' ? 0x2a5a9a : variant === 'used' ? 0xc8a020 : 0xb02020); g.mat('tex.metal_painted', 0xe8e8e8); g.box(0, wallH + 0.1, -d / 2 - 3, w * 0.6, 0.25, 6); } },
  'bld.market_hall': { wall: 'tex.brick_red', tints: [0xffffff], roof: 'tex.metal_corrugated', roofType: 'arch', doors: 2, bandWin: true, wallH: (H) => H * 0.7, extra: (g, { d, wallH }) => signBoard(g, 0, wallH - 0.8, -d / 2 - 0.15, 16, 1.4, 0x2a5a3a) },
  'bld.supermarket': { wall: 'tex.concrete_panel', tints: [0xffffff, 0xe8e4dc], roof: 'tex.metal_corrugated', roofType: 'flat', wallH: (H) => H, vents: 5,
    extra: (g, { w, d, wallH, emit }) => { g.mat('tex.glass_window', 0xffffff); g.emit(emit); g.quadUV([w * 0.1, 0.2, -d / 2 - 0.05], [-w * 0.45, 0.2, -d / 2 - 0.05], [-w * 0.45, 3.6, -d / 2 - 0.05], [w * 0.1, 3.6, -d / 2 - 0.05], 0.1, 0.1, 8.9, 0.9); g.emit(0); g.mat('tex.metal_painted', 0xc82020); g.box(-w * 0.18, 4.2, -d / 2 - 1.6, w * 0.6, 0.4, 3.2); signBoard(g, w * 0.25, wallH - 1.2, -d / 2 - 0.15, 12, 1.8, 0xc82020); for (let k = 0; k < 4; k++) { g.mat('tex.metal_galvanized', 0xd0d0d0); g.box(w * 0.3 + k * 2.4, 1.0, -d / 2 - 6, 0.06, 1.0, 4); } } },
};
for (const id in SHEDS) regGen(id, (pl, ctx, g) => shed(pl, ctx, SHEDS[id], g));

// ---- special structures ---------------------------------------------------------------------------------------------------------------------------
function reg(id, fn) { regGen(id, function* (pl, ctx, g) { fn(g, dims(pl), ctx.lod, srng(pl.seed), pl); }); }

reg('bld.gas_station', (g, { w, d }, lod, R, pl) => {
  const emit = 1 + (pl.seed % 120);
  g.mat('tex.concrete_cast', 0xb8b4ac); g.box(0, -0.4, 0, w + 2, 0.9, d + 2, { noBottom: true });
  // kiosk
  g.mat('tex.concrete_panel', 0xf0ece4); g.box(w * 0.28, 2.0, d * 0.3, w * 0.35, 4.0, d * 0.32);
  g.mat('tex.glass_window', 0xffffff); g.emit(emit); g.quadUV([w * 0.28 + w * 0.15, 0.4, d * 0.3 - d * 0.16 - 0.03], [w * 0.28 - w * 0.15, 0.4, d * 0.3 - d * 0.16 - 0.03], [w * 0.28 - w * 0.15, 2.8, d * 0.3 - d * 0.16 - 0.03], [w * 0.28 + w * 0.15, 2.8, d * 0.3 - d * 0.16 - 0.03], 0.1, 0.1, 3.9, 0.9); g.emit(0);
  flatRoof(g, w * 0.35, d * 0.32, 4.01, 'tex.gravel');
  // canopy on columns with a red fascia and lit soffit
  const cz = -d * 0.12, cw = w * 0.9, cd = d * 0.55;
  g.mat('tex.metal_painted', 0xf0f0f0); g.box(0, 5.3, cz, cw, 0.5, cd);
  g.mat('tex.metal_painted', 0xc02020); g.box(0, 5.3, cz - cd / 2 - 0.05, cw + 0.1, 0.7, 0.1); g.box(0, 5.3, cz + cd / 2 + 0.05, cw + 0.1, 0.7, 0.1);
  g.mat('tex.flat', 0xfff8f0); g.emit(220); g.box(0, 5.04, cz, cw * 0.8, 0.02, cd * 0.7); g.emit(0);
  g.mat('tex.metal_painted', 0xe8e8e8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * cw * 0.3, 2.6, cz + sz * cd * 0.22, 0.4, 5.2, 0.4, { noBottom: true });
  // pump islands
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * cw * 0.3, z = cz + sz * cd * 0.22;
    g.mat('tex.concrete_cast', 0xd8d4cc); g.box(x, 0.12, z, 1.2, 0.24, 3.6);
    g.mat('tex.metal_painted', 0xd8d8d8); g.box(x, 0.95, z + 1.0, 0.7, 1.5, 0.5); g.mat('tex.metal_painted', 0xc02020); g.box(x, 1.5, z + 1.0, 0.72, 0.3, 0.52);
    if (lod === 0) { g.mat('tex.flat', 0x101010); g.box(x, 1.25, z + 0.74, 0.4, 0.25, 0.02); }
  }
  // price pylon
  g.mat('tex.metal_painted', 0x303030); g.box(-w / 2 + 1, 3, -d / 2 + 1, 0.4, 6, 0.4); signBoard(g, -w / 2 + 1, 5.6, -d / 2 + 1, 2.2, 2.4, 0xc02020, 180);
});
reg('bld.bus_station', (g, { w, d }, lod) => {
  g.mat('tex.concrete_cast', 0xc0bcb4); g.box(0, -0.4, 0, w, 0.9, d, { noBottom: true });
  g.mat('tex.metal_painted', 0x6a7a8a); g.box(0, 6.4, d * 0.1, w, 0.5, d * 0.7);
  g.mat('tex.glass_window', 0xc8d8e0); g.box(0, 6.75, d * 0.1, w * 0.9, 0.2, d * 0.5);
  g.mat('tex.metal_painted', 0x4a5a6a); const n = lod ? 4 : 8;
  for (let k = 0; k <= n; k++) for (const sz of [-1, 1]) g.box(-w / 2 + 1 + (k * (w - 2)) / n, 3.2, d * 0.1 + sz * d * 0.3, 0.4, 6.4, 0.4, { noBottom: true });
  g.mat('tex.brick_brown', 0xffffff); g.box(0, 2.2, -d * 0.36, w * 0.5, 4.4, d * 0.24);
  g.mat('tex.glass_window', 0xffffff); g.emit(30); g.quadUV([w * 0.25, 0.5, -d * 0.24 + 0.02], [-w * 0.25, 0.5, -d * 0.24 + 0.02], [-w * 0.25, 3.3, -d * 0.24 + 0.02], [w * 0.25, 3.3, -d * 0.24 + 0.02], 0.1, 0.1, 5.9, 0.9); g.emit(0);
  g.mat('tex.concrete_cast', 0xd0ccc4); for (let k = 0; k < 5; k++) g.box(-w * 0.4 + k * w * 0.2, 0.1, d * 0.15, 3, 0.2, 14);
});
reg('bld.parking_deck', (g, { w, d, F }, lod) => {
  const st = 3.2;
  for (let f = 0; f <= F; f++) {
    g.mat('tex.concrete_cast', 0xb8b4ac); g.box(0, f * st + 0.15, 0, w, 0.3, d, { noBottom: f === 0 });
    if (f > 0) { g.mat('tex.concrete_cast', 0xa8a49c); for (const sz of [-1, 1]) g.box(0, f * st + 0.75, sz * (d / 2 - 0.12), w, 0.9, 0.24); for (const sx of [-1, 1]) g.box(sx * (w / 2 - 0.12), f * st + 0.75, 0, 0.24, 0.9, d - 0.5); }
    if (f > 0 && f < F + 1 && lod === 0) { g.mat('tex.flat', 0xfff4e0); g.emit(150); for (let k = 0; k < 4; k++) g.box(-w * 0.3 + k * w * 0.2, f * st - 0.02, 0, 1.2, 0.05, 0.2); g.emit(0); }
  }
  g.mat('tex.concrete_cast', 0x9a968e); const nx = Math.max(2, Math.round(w / 8)), nz = Math.max(2, Math.round(d / 8));
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j += (lod ? nz : 1)) g.box(-w / 2 + 0.3 + (i * (w - 0.6)) / nx, (F * st) / 2, -d / 2 + 0.3 + (j * (d - 0.6)) / nz, 0.6, F * st, 0.6, { noBottom: true, noTop: true });
  g.mat('tex.asphalt_worn', 0xffffff); g.beam([w / 2 - 4, 0.3, -d / 2 + 4], [w / 2 - 4, st + 0.3, d / 2 - 6], 3.4, 0.3);
  g.mat('tex.metal_painted', 0x2a5a9a); g.box(-w / 2 + 2, F * st + 2, -d / 2 + 0.5, 3, 2, 0.2);
});
reg('bld.construction_site', (g, { w, d }, lod, R) => {
  const stage = 3, fl = 3.6, tw = w * 0.55, td = d * 0.55, nf = 2 + stage * 2;
  g.mat('tex.mud', 0xffffff); g.box(0, -0.3, 0, w, 0.7, d, { noBottom: true });
  for (let f = 0; f <= nf; f++) { g.mat('tex.concrete_cast', 0xc8c4bc); g.box(0, f * fl + 0.15, 0, tw, 0.3, td); }
  g.mat('tex.concrete_cast', 0xb0aca4);
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 3; j++) g.box(-tw / 2 + 0.3 + (i * (tw - 0.6)) / 4, (nf * fl) / 2, -td / 2 + 0.3 + (j * (td - 0.6)) / 3, 0.5, nf * fl, 0.5, { noBottom: true, noTop: true });
  // tower crane: lattice mast, jib, counter-jib, cab
  const cx = tw / 2 + 4, cz = td / 2 + 2, mh = nf * fl + 14;
  g.mat('tex.metal_painted', 0xe0b020);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.box(cx + sx * 0.9, mh / 2, cz + sz * 0.9, 0.18, mh, 0.18, { noBottom: true });
  if (lod === 0) for (let y = 0; y < mh; y += 2.4) { g.beam([cx - 0.9, y, cz - 0.9], [cx + 0.9, y + 2.4, cz - 0.9], 0.08); g.beam([cx + 0.9, y, cz + 0.9], [cx - 0.9, y + 2.4, cz + 0.9], 0.08); g.beam([cx - 0.9, y, cz + 0.9], [cx - 0.9, y + 2.4, cz - 0.9], 0.08); g.beam([cx + 0.9, y, cz - 0.9], [cx + 0.9, y + 2.4, cz + 0.9], 0.08); }
  g.box(cx - 18, mh + 0.6, cz, 44, 1.2, 1.2); g.box(cx + 10, mh + 0.4, cz, 12, 0.8, 1.6); g.mat('tex.concrete_cast', 0x8a8a8a); g.box(cx + 14, mh - 0.4, cz, 3, 2, 2);
  g.mat('tex.metal_painted', 0xd8d8d0); g.box(cx + 1.6, mh - 1.2, cz, 1.8, 2, 1.8); g.mat('tex.metal_galvanized', 0x888888); g.cyl(cx - 28, mh - 8, cz, 0.03, 0.03, 8.6, 3);
  // hoarding
  g.mat('tex.wood_painted', 0x5a7a5a); for (const sz of [-1, 1]) g.box(0, 1.1, sz * (d / 2 - 0.1), w, 2.2, 0.08); for (const sx of [-1, 1]) g.box(sx * (w / 2 - 0.1), 1.1, 0, 0.08, 2.2, d);
  void R;
});
reg('bld.boathouse', (g, { w, d }, lod) => {
  // open timber frame over water: plank deck around a slip, three walls, open lake side (local +Z), gable roof
  const H = 4.6;
  g.mat('tex.wood_weathered_dark', 0xffffff);
  for (let i = 0; i <= 4; i++) for (const sx of [-1, 1]) { const z = -d / 2 + (i * d) / 4; g.cyl(sx * (w / 2 + 0.6), -2.6, z, 0.18, 0.18, 2.9 + H, 8); }
  for (let i = 0; i <= 4; i++) g.cyl(0, -2.6, -d / 2 + (i * d) / 4, 0.15, 0.15, 2.9, 6);
  g.mat('tex.wood_planks', 0xb0a090);
  const slipW = w * 0.45;
  g.box(-(w / 2 + 1.2 + slipW / 2) / 2 - 0.0, 0.2, 0, (w + 1.2 - slipW) / 2 + 0.6, 0.15, d + 1.2);
  g.box((w / 2 + 1.2 + slipW / 2) / 2, 0.2, 0, (w + 1.2 - slipW) / 2 + 0.6, 0.15, d + 1.2);
  g.box(0, 0.2, -d / 2 - 0.1, slipW, 0.15, 1.4);
  g.mat('tex.wood_weathered_dark', 0xd8d0c8);
  g.box(0, H / 2 + 0.25, -d / 2 - 0.6, w + 1.2, H, 0.12);
  for (const sx of [-1, 1]) { g.box(sx * (w / 2 + 0.6), H / 2 + 0.25, -d * 0.1, 0.12, H, d * 0.8); }
  g.mat('tex.glass_window', 0xd0d0c0); g.emit(12); g.quadUV([w * 0.3, 1.5, -d / 2 - 0.68], [w * 0.1, 1.5, -d / 2 - 0.68], [w * 0.1, 2.6, -d / 2 - 0.68], [w * 0.3, 2.6, -d / 2 - 0.68], 0.1, 0.1, 0.9, 0.9); g.emit(0);
  g.mat('tex.wood_weathered_dark', 0xffffff); for (let i = 0; i <= 4; i++) g.box(0, H + 0.2, -d / 2 + (i * d) / 4, w + 1.4, 0.25, 0.2);
  g.mat('tex.roof_shingle', 0xa0a0a0); g.push().translate(0, H + 0.3, 0); g.gable(w + 1.2, d + 1.2, 0, 2.6, { alongX: false, over: 0.5, wall: 'tex.wood_weathered_dark', wallTint: 0xd0c8c0 }); g.pop();
  if (lod === 0) { // hoist beam with chain over the slip
    g.mat('tex.metal_painted', 0x3a3a3a); g.box(0, H - 0.2, 0, 0.18, 0.3, d * 0.9); g.cyl(0, H - 2.4, d * 0.1, 0.03, 0.03, 2.2, 4); g.box(0, H - 2.5, d * 0.1, 0.12, 0.18, 0.06);
  }
});
reg('bld.lodge_restaurant', (g, { w, d, F }, lod, R, pl) => {
  const H = 3.8 * F, emit = 1 + (pl.seed % 120), s = { wallTex: 'tex.log_round', wallTint: 0xe0c8a8, st: 3.8, bay: 3.2, win: [2.2, 2.4, 0.6], recess: 0.12, bars: 1, emit, uOff: 0, frameTint: 0x4a3a2a, sillTex: 'tex.wood_planks', sillTint: 0xffffff, doorBay: 3, doorTex: 'tex.wood_planks', doorTint: 0x8a6a48 };
  g.mat('tex.stone_fieldstone', 0xffffff); g.box(0, -0.5, 0, w + 0.3, 1.4, d + 0.3, { noBottom: true });
  for (const f of rectFaces(w, d)) { enterFace(g, f); if (lod === 0) faceWindows(g, f, 0.2, F, s, pl.seed); else faceFlat(g, f, 0.2, H + 0.2, 0, F, s, 'tex.log_round', 0xe0c8a8, emit); g.pop(); }
  g.mat('tex.roof_shingle', 0xb0a8a0); g.push().translate(0, H + 0.2, 0); g.gable(w, d, 0, 4.2, { alongX: true, over: 1.0, wall: 'tex.planks_wall', wallTint: 0xd0b890 }); g.pop();
  chimney(g, w * 0.32, 0, H + 5.5, 'tex.stone_fieldstone', 0xffffff, 1.6);
  // terrace deck facing the lake (local -Z) with railing and parasols
  g.mat('tex.wood_planks', 0xc8b098); g.box(0, 0.3, -d / 2 - 3.2, w * 0.85, 0.2, 6.2);
  g.mat('tex.wood_planks', 0xa08060); g.box(0, 0.95, -d / 2 - 6.25, w * 0.85, 0.08, 0.1); g.box(0, 0.6, -d / 2 - 6.25, w * 0.85, 0.06, 0.06);
  if (lod === 0) for (let k = 0; k < 3; k++) { const x = -w * 0.28 + k * w * 0.28; g.mat('tex.wood_planks', 0x8a6a48); g.cyl(x, 0.4, -d / 2 - 3.4, 0.5, 0.5, 0.75, 10); g.cyl(x, 0.4, -d / 2 - 3.4, 0.03, 0.03, 2.4, 4); g.ds.mat('tex.fabric_canvas', 0xe8e0d0); g.ds.push().translate(x, 2.8, -d / 2 - 3.4); g.ds.cyl(0, 0, 0, 1.4, 0.05, 0.5, 8, { noBottom: true }); g.ds.pop(); }
  void R;
});
reg('bld.market_stall', (g, { w, d }, lod, R) => {
  g.mat('tex.wood_weathered_dark', 0xffffff);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * (w / 2 - 0.1), 1.35, sz * (d / 2 - 0.1), 0.12, 2.7, 0.12, { noBottom: true });
  g.mat('tex.wood_planks', 0xc0a080); g.box(0, 0.9, -d / 2 + 0.6, w - 0.2, 0.1, 1.0); g.mat('tex.wood_weathered_dark', 0xffffff); g.box(0, 0.45, -d / 2 + 0.6, w - 0.3, 0.9, 0.06);
  // striped awning (double-sided canvas)
  const tint = pick(R, [0xc0302a, 0x2a5a9a, 0x2a7a4a]);
  g.push().translate(0, 0, -d / 2); g.rotY(Math.PI); g.pop();
  const n = 8, a = g.ds;
  for (let k = 0; k < n; k++) { const x0 = -w / 2 - 0.2 + (k * (w + 0.4)) / n, x1 = x0 + (w + 0.4) / n; a.mat('tex.fabric_canvas', k % 2 ? 0xf0ead8 : tint); a.quad([x0, 2.75, d / 2], [x1, 2.75, d / 2], [x1, 2.3, -d / 2 - 0.9], [x0, 2.3, -d / 2 - 0.9]); a.quad([x0, 2.3, -d / 2 - 0.9], [x1, 2.3, -d / 2 - 0.9], [x1, 1.95, -d / 2 - 0.92], [x0, 1.95, -d / 2 - 0.92]); }
  if (lod === 0) { // produce crates and ice tray
    for (let k = 0; k < 4; k++) { g.mat('tex.wood_planks', 0xd0b890); g.box(-w / 2 + 0.7 + k * (w - 1.4) / 3, 1.05, -d / 2 + 0.6, 0.7, 0.2, 0.6); g.mat('tex.flat', pick(R, [0xd8d8e0, 0xc8a080, 0xe06040, 0x80a060])); g.box(-w / 2 + 0.7 + k * (w - 1.4) / 3, 1.17, -d / 2 + 0.6, 0.6, 0.06, 0.5); }
  }
});
reg('bld.lighthouse', (g, D, lod) => {
  const segs = lod ? 10 : 18;
  g.mat('tex.stucco', 0xf4f0e8);
  g.lathe([[4.3, -1], [4.3, 0], [3.9, 6], [3.5, 12], [3.1, 18], [2.9, 20.2], [0, 20.2]], segs);
  g.mat('tex.paint_chipped', 0xc03028); g.push().translate(0, 0, 0); g.lathe([[4.07, 5.0], [3.88, 7.4]], segs); g.lathe([[3.5, 13.0], [3.34, 15.4]], segs); g.pop();
  g.mat('tex.metal_painted', 0x2a2a2a); g.cyl(0, 20.2, 0, 3.7, 3.7, 0.35, segs);
  if (lod === 0) for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; g.box(Math.cos(a) * 3.55, 21.0, Math.sin(a) * 3.55, 0.05, 1.0, 0.05); }
  g.cyl(0, 21.45, 0, 3.6, 3.6, 0.04, segs, { noBottom: true });
  g.mat('tex.glass_window', 0xfff4d0); g.emit(255); g.cyl(0, 20.55, 0, 2.0, 2.0, 2.6, 10); g.emit(0);
  g.mat('tex.metal_painted', 0xc03028); g.cyl(0, 23.15, 0, 2.4, 0.2, 2.0, 10); g.cyl(0, 25.1, 0, 0.12, 0.05, 1.2, 4);
  g.mat('tex.wood_painted', 0x3a3a3a); g.box(0, 1.2, -4.0, 1.1, 2.3, 0.3);
});
reg('bld.beach_bar', (g, { w, d }, lod) => {
  g.mat('tex.wood_planks', 0xd8c0a0); g.box(0, 0.2, 0, w + 2, 0.3, d + 2);
  g.mat('tex.bark_palm', 0xffffff); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.cyl(sx * w / 2, 0.3, sz * d / 2, 0.14, 0.12, 3.0, 6);
  g.mat('tex.wood_planks', 0xb08860); g.box(0, 0.9, -d * 0.15, w * 0.8, 1.1, 0.6); g.box(0, 1.5, -d * 0.15, w * 0.85, 0.08, 0.8);
  g.mat('tex.wood_weathered_dark', 0xe0c8a0); g.box(0, 1.6, d * 0.3, w * 0.7, 0.06, 0.4);
  // thatched hip roof (fibrous texture: palm bark stretched + straw tint), shaggy lower edge
  g.mat('tex.bark_palm', 0xd8b878);
  const hw = w / 2 + 1.2, hd = d / 2 + 1.2, y0 = 3.1, top = 5.4;
  g.quad([hw, y0, -hd], [-hw, y0, -hd], [-0.5, top, 0], [0.5, top, 0]); g.quad([-hw, y0, hd], [hw, y0, hd], [0.5, top, 0], [-0.5, top, 0]);
  g._tri3([-hw, y0, -hd], [-hw, y0, hd], [-0.5, top, 0]); g._tri3([hw, y0, hd], [hw, y0, -hd], [0.5, top, 0]);
  if (lod === 0) { g.mat('tex.flat', 0xe8c060); g.emit(170); g.cyl(0, 2.6, 0, 0.12, 0.12, 0.25, 6); g.emit(0); for (let k = 0; k < 4; k++) { g.mat('tex.wood_planks', 0x8a6a48); g.cyl(-w * 0.3 + k * w * 0.2, 0.35, -d * 0.15 - 1.0, 0.18, 0.18, 0.75, 8); } }
});
reg('bld.container_terminal', (g, { w, d }, lod, R) => {
  g.mat('tex.asphalt_worn', 0xffffff); g.box(0, -0.4, 0, w, 0.9, d, { noBottom: true });
  const cols = [0xb23a2e, 0x2e5ea6, 0x3a8a4a, 0xc9a23a, 0x8a4a2e, 0xd8d8d0];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const n = 1 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) {
      const x = -w / 2 + 8 + i * 9, y = 0.05 + k * 2.6, z = -d / 2 + 8 + j * 12;
      g.mat('tex.metal_corrugated', cols[Math.floor(R() * cols.length)]);
      g.push().translate(x, y + 1.3, z).rotZ(Math.PI / 2); g.box(0, 0, 0, 2.6, 2.44, 6.06, {}); g.pop();
      if (lod === 0) { g.mat('tex.metal_painted', 0x3a3a3a); g.box(x, y + 1.3, z - 3.04, 2.3, 2.4, 0.04); }
    }
  }
  // gantry crane
  g.mat('tex.metal_painted', 0xe0b020);
  for (const sx of [-1, 1]) { g.box(sx * w * 0.38, 9, d / 2 - 6, 1.2, 18, 1.2, { noBottom: true }); g.box(sx * w * 0.38, 9, d / 2 - 16, 1.2, 18, 1.2, { noBottom: true }); g.box(sx * w * 0.38, 0.6, d / 2 - 11, 1.4, 1.2, 12); }
  g.box(0, 18.6, d / 2 - 6, w * 0.8, 1.4, 1.6); g.box(0, 18.6, d / 2 - 16, w * 0.8, 1.4, 1.6);
  g.box(0, 18.0, d / 2 - 11, 4, 2, 10); g.box(0, 19.6, d / 2 + 4, 3, 1.2, 30);
});
reg('bld.sawmill', (g, { w, d }, lod) => {
  g.mat('tex.mud', 0xffffff); g.box(0, -0.3, 0, w + 10, 0.7, d + 10, { noBottom: true });
  g.mat('tex.wood_weathered_dark', 0xffffff);
  for (let i = 0; i <= 5; i++) for (const sz of [-1, 1]) g.box(-w / 2 + (i * w) / 5, 3.5, sz * d / 2, 0.35, 7, 0.35, { noBottom: true });
  g.box(0, 3.5, d / 2, w, 7, 0.15); g.box(-w / 2, 3.5, 0, 0.15, 7, d);
  g.mat('tex.metal_corrugated', 0xc8b098); g.push().translate(0, 7, 0); g.gable(w, d, 0, 2.6, { alongX: true, over: 0.8, wall: 'tex.wood_weathered_dark' }); g.pop();
  // saw line: conveyor, saw housing, log deck, sawdust cone
  g.mat('tex.metal_painted', 0x5a6a5a); g.box(0, 1.0, 0, w * 0.9, 0.3, 1.4); for (let k = 0; k < 10; k++) g.box(-w * 0.43 + k * w * 0.095, 0.5, 0, 0.12, 1.0, 1.2, { noBottom: true });
  g.mat('tex.metal_painted', 0xc89a20); g.box(w * 0.1, 1.8, 0, 2.4, 2.2, 2.2);
  g.mat('tex.log_round', 0xd8c8a8); for (let k = 0; k < (lod ? 4 : 10); k++) g.tube([-w / 2 - 6, 0.4 + (k % 3) * 0.55, -d * 0.3 + k * 0.6], [-w / 2 - 6, 0.4 + (k % 3) * 0.55, -d * 0.3 + k * 0.6 + 0.01].map((v, i) => (i === 0 ? v + 7 : v)), 0.28, 0.28, 8);
  g.mat('tex.sand_lake', 0xd8b880); g.cyl(w / 2 + 4, 0, d * 0.3, 3.6, 0.3, 3.0, 12, { noBottom: true });
  g.mat('tex.metal_galvanized', 0xd0d0d0); g.cyl(w * 0.35, 7, -d * 0.2, 0.5, 0.5, 4.5, 8);
});
reg('bld.fire_tower', (g, D, lod) => {
  const top = 22, b = 2.4, t = 1.6;
  g.mat('tex.metal_galvanized', 0xc8ccd0);
  const leg = (sx, sz) => g.beam([sx * b, 0, sz * b], [sx * t, top, sz * t], 0.22);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) leg(sx, sz);
  g.mat('tex.metal_galvanized', 0xb0b4b8);
  for (let k = 0; k < 5; k++) {
    const y0 = (k * top) / 5, y1 = ((k + 1) * top) / 5, r0 = b + (t - b) * (y0 / top), r1 = b + (t - b) * (y1 / top);
    if (lod === 0) for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) { g.beam([ax * r0, y0, az * r0], [bx * r1, y1, bz * r1], 0.08); g.beam([bx * r0, y0, bz * r0], [ax * r1, y1, az * r1], 0.08); }
    g.box(0, y1, -r1, r1 * 2, 0.1, 0.1); g.box(0, y1, r1, r1 * 2, 0.1, 0.1); g.box(-r1, y1, 0, 0.1, 0.1, r1 * 2); g.box(r1, y1, 0, 0.1, 0.1, r1 * 2);
  }
  // stairs zig-zag inside
  g.mat('tex.metal_checker', 0xffffff); for (let k = 0; k < 7; k++) { const y = (k * top) / 7; g.beam([k % 2 ? 1.0 : -1.0, y, -0.5], [k % 2 ? -1.0 : 1.0, y + top / 7, -0.5], 0.7, 0.08); }
  // cab
  g.mat('tex.wood_planks', 0xc0a888); g.box(0, top + 0.1, 0, 4.6, 0.25, 4.6);
  g.mat('tex.planks_wall', 0xd8c0a0); for (const f of rectFaces(4.2, 4.2)) { enterFace(g, f); g.wall(0, top + 0.2, f.L, top + 1.2); g.mat('tex.glass_window', 0xffffff); g.emit(20); g.quadUV([f.L, top + 1.2, 0.02], [0, top + 1.2, 0.02], [0, top + 2.6, 0.02], [f.L, top + 2.6, 0.02], 0.1, 0.1, 0.9, 0.9); g.emit(0); g.mat('tex.planks_wall', 0xd8c0a0); g.wall(0, top + 2.6, f.L, top + 3.0); g.pop(); }
  g.mat('tex.roof_metal_red', 0xffffff); g.cyl(0, top + 3.0, 0, 3.4, 0.1, 1.6, 4, { phase: Math.PI / 4 });
  g.mat('tex.metal_galvanized', 0xd0d0d0); g.cyl(1.2, top + 3.5, 1.2, 0.04, 0.03, 3.5, 4);
});
reg('bld.player_built', (g, { w, d }) => {
  // empty plot frame until Stage 4 assembles piece.* (foundation slab, corner stakes, string line)
  g.mat('tex.concrete_cast', 0xc0bcb4); g.box(0, 0.1, 0, w, 0.3, d, { noBottom: true });
  g.mat('tex.wood_planks', 0xc8a878); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.box(sx * (w / 2 - 0.1), 0.6, sz * (d / 2 - 0.1), 0.1, 1.0, 0.1);
  g.mat('tex.flat', 0xe8d040); g.box(0, 0.9, -d / 2 + 0.1, w, 0.02, 0.02); g.box(0, 0.9, d / 2 - 0.1, w, 0.02, 0.02);
});

// ---- interiors in their host buildings (Annex A 6.4): appended at LOD0 only ------------------------------------------------------------------------
import { addInterior } from '../interiors/index.js';
const HOSTS = {
  'bld.cabin_log': (D) => ['int.cabin_log', D.w, D.d, 3.0, 0.2], 'bld.cabin_plank': (D) => ['int.cabin_log', D.w, D.d, 2.9, 0.2],
  'bld.boathouse': (D) => ['int.boathouse', D.w, D.d, 4.6, 0.28], 'bld.diner': (D) => ['int.diner', D.w, D.d, D.st, 0.02],
  'bld.general_store': (D) => ['int.shop_small', D.w, D.d, 3.4, 0.2], 'bld.fishing_hut': (D) => ['int.shop_small', D.w, D.d, 2.6, 0.2],
  'bld.lodge_restaurant': (D) => ['int.lodge_restaurant', D.w, D.d, 3.8, 0.2], 'bld.bank': (D) => ['int.bank_lobby', D.w, D.d, D.st * 1.2, 0.02],
  'bld.supermarket': (D) => ['int.supermarket', D.w, D.d, D.H, 0.02], 'bld.garage_workshop': (D) => ['int.garage', D.w, D.d, D.H, 0.02],
  'bld.warehouse': (D) => ['int.warehouse', D.w, D.d, 7.5, 0.02], 'bld.sawmill': (D) => ['int.sawmill', D.w, D.d, 7, 0.02],
};
const IG = new GB(1 << 14);
for (const id in HOSTS) {
  const base = Builders.get(id);
  function* gen(pl, ctx) {
    const r = base.gen ? yield* base.gen(pl, ctx) : base(pl, ctx);
    if ((ctx.lod || 0) === 0) { yield; const D = dims(pl), [iid, w, d, h, y0] = HOSTS[id](D); const g = IG.reset(); addInterior(g, iid, w, d, h, y0, pl.seed); r.batches.push({ geometry: g.toArrays(), materialId: 'mat.world' }); }
    return r;
  }
  const run = (pl, ctx) => { const it = gen(pl, ctx); let r; do r = it.next(); while (!r.done); return r.value; };
  run.gen = gen;
  Builders.register(id, run, { stage: 3 });
}
