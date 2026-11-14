// Stage 2 blockout builders: one registered builder for every archetype id (Annex A 6-9).
// Flat-shaded masses with the correct footprint and height; Stage 3 registers detailed builders under the same ids (render/builders.js).
import { GeoBuilder } from './geo.js';
import { Builders } from '../render/builders.js';
import { ARCHETYPES } from '../world/archetypes.js';

const MAT = 'mat.blockout';
const shade = (hex, m) => { const r = Math.min(255, ((hex >> 16) & 255) * m), g = Math.min(255, ((hex >> 8) & 255) * m), b = Math.min(255, (hex & 255) * m); return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b); };
const vary = (hex, seed) => shade(hex, 0.92 + (((seed >>> 0) % 997) / 997) * 0.16);
const result = (g) => ({ batches: g.empty ? [] : [{ geometry: g.toArrays(), materialId: MAT }] });

// ---- buildings ------------------------------------------------------------------------------------------------------------
function building(p, ctx) {
  const A = ARCHETYPES[p.archetype];
  const w = p.params ? p.params.w : A.size[0], d = p.params ? p.params.d : A.size[2], h = p.params ? p.params.h : A.size[1];
  const seed = p.seed || 0;
  const g = new GeoBuilder();
  const col = vary(A.color, seed), roof = shade(col, 0.68);
  const lod = ctx && ctx.lod || 0;
  const id = p.archetype;
  if (lod >= 1) { g.box(0, h / 2, 0, w, h, d, 0, col); return result(g); }
  const body = (hh = h, c = col) => g.box(0, hh / 2, 0, w, hh, d, 0, c);
  switch (id) {
    case 'bld.glass_tower': {
      const pod = 10; g.box(0, pod / 2, 0, w, pod, d, 0, shade(col, 1.25));
      g.box(0, pod + (h - pod) / 2, 0, w * 0.78, h - pod, d * 0.78, 0, col);
      g.box(0, h + 1.2, 0, w * 0.55, 2.4, d * 0.55, 0, shade(col, 0.8)); g.cyl(0, h + 2.4, 0, 0.35, 0.12, 9, 0x888a8c, 5);
      break;
    }
    case 'bld.podium_mall': body(); g.box(0, h + 0.5, 0, w * 0.6, 1, d * 0.6, 0, roof); break;
    case 'bld.house_suburban': {
      const wallH = Math.max(3.2, h); g.box(0, wallH / 2, 0, w, wallH, d, 0, col);
      g.gable(0, wallH, 0, w + 0.6, d + 0.6, Math.min(w, d) * 0.28, 0, 0x6b4a3a, false);
      break;
    }
    case 'bld.cabin_log': case 'bld.cabin_plank': case 'bld.beach_bar': case 'bld.general_store': case 'bld.ranger_station': case 'bld.fishing_hut': {
      const wallH = Math.max(2.8, h); g.box(0, wallH / 2, 0, w, wallH, d, 0, col);
      g.gable(0, wallH, 0, w + 0.8, d + 0.8, Math.min(w, d) * 0.3, 0, id === 'bld.cabin_plank' ? 0xa8452f : id === 'bld.beach_bar' ? 0xcbb47a : 0x5a4636, false);
      if (id === 'bld.cabin_log') g.box(w * 0.28, wallH + 1.6, d * 0.2, 0.9, 3.4, 0.9, 0, 0x777470);
      break;
    }
    case 'bld.warehouse': case 'bld.shed_corrugated': case 'bld.harbor_shed': case 'bld.garage_workshop': case 'bld.sawmill': case 'bld.showroom': case 'bld.market_hall': {
      const wallH = id === 'bld.warehouse' ? 7.5 : Math.max(3.2, h * (id === 'bld.sawmill' ? 0.72 : 0.78));
      g.box(0, wallH / 2, 0, w, wallH, d, 0, col);
      if (id !== 'bld.showroom') g.gable(0, wallH, 0, w + 0.4, d + 0.4, Math.min(h - wallH, 2.4) > 0.4 ? Math.min(h - wallH, 2.4) : 1.6, 0, roof, true);
      else g.box(0, wallH + 0.25, 0, w + 0.4, 0.5, d + 0.4, 0, roof);
      if (id === 'bld.sawmill') g.cyl(w * 0.3, wallH, -d * 0.2, 0.9, 0.7, 7, 0x6a5a50, 6);
      break;
    }
    case 'bld.factory': {
      body(h); g.box(0, h + 0.4, 0, w + 0.4, 0.8, d + 0.4, 0, roof); g.cyl(w * 0.32, h, d * 0.2, 1.6, 1.2, 14, 0x7a4a3c, 8);
      for (let i = 0; i < 3; i++) g.gable(-w / 3 + (i * w) / 3 + w / 6, h + 0.8, 0, w / 3, d, 2.2, 0, roof, false);
      break;
    }
    case 'bld.gas_station': {
      g.box(w * 0.28, 2.2, d * 0.3, w * 0.35, 4.4, d * 0.38, 0, col);
      g.box(0, 5, -d * 0.12, w * 0.9, 0.5, d * 0.55, 0, 0xd8d2c2);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * w * 0.38, 2.5, -d * 0.12 + sz * d * 0.2, 0.35, 5, 0.35, 0, 0x777777);
      break;
    }
    case 'bld.bus_station': {
      g.box(0, 6.2, 0, w, 0.5, d, 0, 0x7c8a96, { top: 1.2 });
      for (let i = 0; i < 5; i++) g.box(-w / 2 + 2 + (i * (w - 4)) / 4, 3.1, d / 2 - 2, 0.5, 6.2, 0.5, 0, 0x606a74);
      g.box(0, 2, -d * 0.28, w * 0.6, 4, d * 0.28, 0, col);
      break;
    }
    case 'bld.supermarket': {
      body(h); g.box(0, h + 0.4, 0, w + 0.4, 0.8, d + 0.4, 0, roof); g.box(-w * 0.28, 2.2, -d / 2 - 0.2, w * 0.4, 4.4, 0.4, 0, 0x6d8aa0);
      break;
    }
    case 'bld.construction_site': {
      g.box(0, 6, 0, w * 0.55, 12, d * 0.55, 0, col);
      g.box(w * 0.3, 18, d * 0.3, 1.2, 36, 1.2, 0, 0xd8a52a); g.box(w * 0.05, 36, d * 0.3, w * 0.6, 1, 1, 0, 0xd8a52a); g.box(w * 0.34, 34, d * 0.3, 2, 2, 2, 0, 0x555555);
      g.box(0, 1, d / 2 - 0.5, w, 2, 0.3, 0, 0xa8a090);
      break;
    }
    case 'bld.boathouse': {
      g.box(0, 0.5, 0, w + 2, 1, d + 2, 0, 0x5a4a38); g.box(0, 3, 0, w, 4, d, 0, col); g.gable(0, 5, 0, w + 1, d + 1, 3, 0, 0x4a3a30, true);
      break;
    }
    case 'bld.lodge_restaurant': {
      const hh = Math.max(3.6, h); g.box(0, hh / 2, 0, w, hh, d, 0, col); g.gable(0, hh, 0, w + 1, d + 1, 3.6, 0, 0x4a3a2c, true); g.box(0, 0.4, -d / 2 - 3, w * 0.6, 0.4, 6, 0, 0x6d5a40);
      break;
    }
    case 'bld.lighthouse': {
      g.cyl(0, 0, 0, 4.2, 2.8, 20, 0xeeeae0, 12); g.cyl(0, 6, 0, 3.6, 3.3, 3, 0xb83a2e, 12); g.cyl(0, 13, 0, 3.3, 3.0, 3, 0xb83a2e, 12);
      g.cyl(0, 20, 0, 3.6, 3.6, 0.8, 0x444444, 12); g.cyl(0, 20.8, 0, 2.0, 2.0, 2.6, 0xe8d890, 8); g.cyl(0, 23.4, 0, 2.6, 0, 2.2, 0xb83a2e, 8);
      break;
    }
    case 'bld.fire_tower': {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(sx * 2.2, 11, sz * 2.2, 0.35, 22, 0.35, 0, col);
      g.box(0, 22.5, 0, 6, 0.4, 6, 0, 0x777066); g.box(0, 24.3, 0, 4.4, 3.2, 4.4, 0, 0x8a6a48); g.gable(0, 25.9, 0, 5.4, 5.4, 1.8, 0, 0x4a3a30, true);
      for (let k = 0; k < 4; k++) g.box(0, 4 + k * 5, 0, 4.6 + 0.0, 0.3, 4.6, 0, 0x6a5a48);
      break;
    }
    case 'bld.container_terminal': {
      g.box(0, 0.3, 0, w, 0.6, d, 0, 0x6a6a68);
      const cols = [0xb23a2e, 0x2e5ea6, 0x3a8a4a, 0xc9a23a, 0x8a4a2e];
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const n = 1 + ((i * 3 + j * 5 + (p.seed >>> 3)) % 4); for (let k = 0; k < n; k++) g.box(-w / 2 + 8 + i * 9, 1.6 + k * 2.6, -d / 2 + 8 + j * 12, 2.4, 2.6, 6.1, 0, cols[(i + j + k) % 5]); }
      g.box(0, 14, d / 2 - 6, w * 0.7, 1.2, 1.4, 0, 0xd8a52a); g.box(-w * 0.35, 7, d / 2 - 6, 1.2, 14, 1.4, 0, 0xd8a52a); g.box(w * 0.35, 7, d / 2 - 6, 1.2, 14, 1.4, 0, 0xd8a52a);
      break;
    }
    case 'bld.market_stall': {
      g.box(0, 0.5, 0.4, w * 0.9, 1, d * 0.5, 0, 0x8a6a48);
      for (let i = 0; i < 4; i++) g.box(-w * 0.375 + i * w * 0.25, 2.8, -0.2, w * 0.25, 0.14, d + 0.6, 0, i % 2 ? 0xf0ead8 : 0xc23a30, { pitch: 0.12 });
      for (const sx of [-1, 1]) g.box(sx * w * 0.45, 1.4, -d * 0.45, 0.12, 2.8, 0.12, 0, 0x5a4636);
      break;
    }
    case 'bld.parking_deck': {
      const floors = p.params ? p.params.floors : 3;
      for (let f = 0; f < floors; f++) g.box(0, f * 3.2 + 0.2, 0, w, 0.4, d, 0, col, { top: 1.0 });
      for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) g.box(sx * (w / 2 - 0.4), (floors * 3.2) / 2, sz * (d / 2 - 0.4), 0.8, floors * 3.2, 0.8, 0, shade(col, 0.85));
      g.box(0, floors * 3.2 + 0.2, d / 2 - 0.2, w, 1.0, 0.4, 0, shade(col, 0.9));
      break;
    }
    default: {
      body();
      if (h > 6 && id !== 'bld.player_built') g.box(0, h + 0.35, 0, w + 0.3, 0.7, d + 0.3, 0, roof);
      if (h > 14 && id !== 'bld.glass_tower') g.box(w * 0.15, h + 1.4, -d * 0.1, w * 0.3, 1.6, d * 0.3, 0, shade(col, 0.6));
      if (id === 'bld.brick_loft' && (seed & 7) < 2) g.cyl(w * 0.3, h + 0.7, d * 0.2, 1.6, 1.6, 3.4, 0x6b5a4a, 8);
    }
  }
  return result(g);
}

// ---- props, vehicles, boats, vegetation, characters, animals ---------------------------------------------------------------------
const PROP_COLOR = { streetlamp: 0x4a4e52, traffic_light: 0x3a3d40, bench: 0x7a5a3a, bin: 0x3a5a4a, rock: 0x7a7a74, log: 0x7a5a3a, tent: 0xc9a23a, container: 0x2e5ea6, crate: 0x8a6a48, default: 0x8d8a82 };
function prop(p) {
  const A = ARCHETYPES[p.archetype], [w, h, d] = A.size, name = p.archetype.slice(5);
  const g = new GeoBuilder();
  const key = Object.keys(PROP_COLOR).find((k) => name.includes(k)) || 'default';
  const c = PROP_COLOR[key];
  if (name.startsWith('streetlamp') || name === 'utility_pole' || name === 'traffic_light' || name === 'pile' || name === 'channel_marker') { g.cyl(0, 0, 0, w * 0.5, w * 0.35, h, c, 6); if (name.startsWith('streetlamp')) g.box(0, h, -0.5, 0.35, 0.25, 1.1, 0, 0xe8e0b0); }
  else if (name.startsWith('rock')) g.cyl(0, 0, 0, w * 0.55, w * 0.15, h, c, 6);
  else if (name === 'tent') g.gable(0, 0, 0, w, d, h, 0, c, true);
  else g.box(0, h / 2, 0, w, h, d, 0, c);
  return result(g);
}
const VCOL = { 'veh.sedan': 0x3a5a8a, 'veh.hatch_used': 0x9a8a6a, 'veh.taxi': 0xe0b020, 'veh.police': 0x2a3a5a, 'veh.pickup': 0xc9a23a, 'veh.coupe': 0xa83a2e, 'veh.van': 0xe8e4da, 'veh.boxtruck': 0xd8d4c8, 'veh.logtruck': 0x2e6a3a, 'veh.forklift': 0xd8a52a, 'veh.utv': 0x4a7a3a, 'veh.moto_125': 0x3a3a3a, 'veh.moto_cafe': 0xa83a2e };
function vehicle(p) {
  const A = ARCHETYPES[p.archetype], [w, h, d] = A.size;
  const g = new GeoBuilder();
  const c = VCOL[p.archetype] || 0x8a8a8a;
  const moto = p.archetype.includes('moto');
  const wheelR = moto ? 0.32 : Math.max(0.3, h * 0.2);
  const wheelW = moto ? 0.14 : 0.24;
  if (moto) { g.box(0, wheelR + 0.4, 0, 0.3, 0.5, d * 0.6, 0, c); g.box(0, wheelR + 0.8, -d * 0.1, 0.5, 0.2, 0.5, 0, 0x222222); }
  else if (p.archetype === 'veh.van' || p.archetype === 'veh.boxtruck' || p.archetype === 'veh.logtruck') {
    g.box(0, wheelR + (h - wheelR) / 2, d * 0.1, w, h - wheelR, d * 0.8, 0, c); g.box(0, wheelR + (h - wheelR) * 0.35, -d * 0.45, w * 0.96, (h - wheelR) * 0.7, d * 0.2, 0, shade(c, 0.8));
    if (p.archetype === 'veh.logtruck') { for (let i = 0; i < 6; i++) g.cyl(-0.7 + (i % 3) * 0.7, h + 0.1 + Math.floor(i / 3) * 0.7, d * 0.2, 0.34, 0.34, 4.5, 0x6a4a2a, 6); }
  } else {
    const bodyH = h * 0.5;
    g.box(0, wheelR + bodyH / 2, 0, w, bodyH, d, 0, c);
    g.box(0, wheelR + bodyH + (h - wheelR - bodyH) / 2, d * 0.04, w * 0.84, h - wheelR - bodyH, d * 0.5, 0, shade(c, 0.7));
  }
  const axles = moto ? [-0.38, 0.38] : [-0.34, 0.34];
  for (const az of axles) for (const sx of moto ? [0] : [-1, 1]) {
    // wheel as a short horizontal-axis cylinder approximated by a box ring: 8-sided prism standing on its side
    g.box(sx * (w / 2 - wheelW / 2), wheelR, az * d, wheelW, wheelR * 2, wheelR * 2, 0, 0x1a1a1a);
  }
  return result(g);
}
const BCOL = { 'boat.rowboat': 0x7a5a3a, 'boat.skiff': 0xb8bcc0, 'boat.console': 0xe8e4da, 'boat.trawler': 0x2e63a6, 'boat.workboat': 0x4a5a4a, 'boat.ferry': 0xe8e4da, 'boat.yacht': 0xf2f0ea, 'boat.sailboat': 0xf2f0ea, 'boat.cargo_ship': 0x8a2e2e };
function boat(p) {
  const A = ARCHETYPES[p.archetype], [w, h, d] = A.size;
  const g = new GeoBuilder();
  const c = BCOL[p.archetype] || 0xaaaaaa;
  const hullH = Math.max(0.7, h * 0.35);
  g.box(0, hullH / 2 - 0.2, d * 0.1, w, hullH, d * 0.78, 0, c);
  g.box(0, hullH / 2 - 0.2, -d * 0.4, w * 0.5, hullH, d * 0.22, 0, c, { pitch: 0 });
  g.box(0, hullH / 2 - 0.1, -d * 0.5, w * 0.16, hullH * 0.9, d * 0.1, 0, c);
  if (h > 1.4) { g.box(0, hullH + (h - hullH) * 0.35, d * 0.12, w * 0.6, (h - hullH) * 0.7, d * 0.28, 0, 0xe8e4da); g.box(0, hullH + (h - hullH) * 0.85, d * 0.12, w * 0.7, 0.2, d * 0.32, 0, 0x888888); }
  if (p.archetype === 'boat.sailboat') g.box(0, h * 0.6, -d * 0.05, 0.1, h * 0.8, 0.1, 0, 0xcccccc);
  return result(g);
}
const VEG_KIND = { 'veg.palm_a': 'palm', 'veg.palm_b': 'palm', 'veg.oak_a': 'broadleaf', 'veg.maple_a': 'broadleaf', 'veg.street_tree': 'broadleaf' };
import { treeArrays } from './trees.js';
function vegetation(p) {
  const A = ARCHETYPES[p.archetype];
  const g = new GeoBuilder();
  if (A.size[1] > 4) g.appendArrays(treeArrays(VEG_KIND[p.archetype] || 'conifer', 0), 0, 0, 0, 0, A.size[1] / (VEG_KIND[p.archetype] === 'palm' ? 9 : VEG_KIND[p.archetype] ? 10 : 15));
  else g.cyl(0, 0, 0, A.size[0] / 2, A.size[0] / 4, A.size[1], 0x4a7a3a, 6);
  return result(g);
}
function character(p) {
  const A = ARCHETYPES[p.archetype], h = A.size[1];
  const g = new GeoBuilder();
  const shirt = p.archetype === 'chr.worker' ? 0xe0902a : p.archetype === 'chr.player' ? 0x2a6a9a : 0x7a6a8a;
  g.box(0, h * 0.25, 0, 0.34, h * 0.5, 0.2, 0, 0x2a2e3a); g.box(0, h * 0.68, 0, 0.44, h * 0.38, 0.26, 0, shirt); g.box(0, h * 0.93, 0, 0.22, 0.24, 0.22, 0, 0xd8a888);
  return result(g);
}
function animal(p) {
  const A = ARCHETYPES[p.archetype]; const g = new GeoBuilder();
  g.box(0, A.size[1] * 0.5, 0, A.size[0], A.size[1] * 0.6, A.size[2], 0, p.archetype === 'ani.gull' ? 0xe8e8e8 : p.archetype === 'ani.crow' ? 0x222222 : 0x8a6a48);
  return result(g);
}
const empty = () => ({ batches: [] });

/** infra builders draw the world-space parts attached to the placement (params.parts) */
export function addPart(g, part) {
  if (part.invisible) return;
  if (part.s === 'cyl') { g.cyl(part.x, part.y - part.sy / 2, part.z, part.sx / 2, part.sx / 2, part.sy, part.color, 6); return; }
  g.box(part.x, part.y, part.z, part.sx, part.sy, part.sz, part.yaw, part.color, { pitch: part.pitch });
}
function infra(p) {
  const g = new GeoBuilder();
  for (const part of (p.params && p.params.parts) || []) addPart(g, part);
  return result(g);
}
/** world-space output (positions are absolute); flagged so the chunk manager does not offset them again */
function infraWorld(p) { const r = infra(p); r.worldSpace = true; return r; }

for (const [id, A] of Object.entries(ARCHETYPES)) {
  let b;
  switch (A.category) {
    case 'building': b = building; break;
    case 'prop': b = prop; break;
    case 'vehicle': b = vehicle; break;
    case 'boat': b = boat; break;
    case 'vegetation': b = vegetation; break;
    case 'character': b = character; break;
    case 'animal': b = animal; break;
    case 'interior': b = empty; break;
    default: b = A.category2 === 'infra' ? infraWorld : prop;
  }
  Builders.register(id, b, { stage: 2 });
}
export { building, vehicle, boat, prop };
