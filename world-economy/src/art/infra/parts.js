// Detailed infrastructure parts (Annex A 6.2 infra.*): the world layout describes bridges, towers, piers, docks, quays and the
// breakwater as boxes/cylinders (world/layout/infra.js); here each part is drawn with the material its role implies, extra
// detail (rivets/flanges on steel, planks on decks, rope-wrapped piles, armour rock on the breakwater) and correct UVs.
import { h01 } from '../kit/geo.js';

const COL = { steel: 0x3b5a82, concrete: 0x8c8c86, dark: 0x2a2d31, wood: 0x6b5238, woodDark: 0x4a3a2c, rail: 0x5a5f66, stone: 0x6d6f6c, black: 0x111214, cable: 0x9aa0a8 };

/** g: art GB in world space; part: {s, x,y,z, sx,sy,sz, yaw, pitch, color}; lod 0..2 */
export function addPartDetailed(g, part, lod = 0) {
  if (part.invisible) return;
  const c = part.color;
  if (part.s === 'cyl') {
    const r = part.sx / 2, y0 = part.y - part.sy / 2;
    if (c === COL.woodDark || c === COL.wood) {
      g.mat('tex.wood_weathered_dark', 0xb0a898);
      g.cyl(part.x, y0, part.z, r, r * 0.92, part.sy, lod ? 5 : 8);
      if (lod === 0) { g.mat('tex.moss', 0x8a9a7a); g.cyl(part.x, y0, part.z, r * 1.03, r * 1.03, Math.min(part.sy, 1.2), 8, { noTop: true, noBottom: true }); }
    } else {
      g.mat('tex.concrete_cast', 0xd0ccc4); g.cyl(part.x, y0, part.z, r, r, part.sy, lod ? 6 : 10);
    }
    return;
  }
  g.push().translate(part.x, part.y, part.z).rotY(part.yaw || 0).rotX(part.pitch || 0);
  const sx = part.sx, sy = part.sy, sz = part.sz;
  switch (c) {
    case COL.steel: case COL.cable: {
      g.mat('tex.metal_painted', c === COL.cable ? 0x8a9098 : 0x5a7aa0);
      const slim = Math.min(sx, sy) < 0.7;
      g.box(0, 0, 0, sx, sy, sz, { noBottom: slim });
      if (!slim && lod === 0 && sx > 1.5 && sy > 1.5) {
        // flanges / stiffener ribs along the member every 3 m
        g.mat('tex.metal_painted', 0x4a6a90);
        const n = Math.min(14, Math.floor(sz / 3));
        for (let i = 1; i < n; i++) { const z = -sz / 2 + (i * sz) / n; g.box(0, 0, z, sx + 0.12, sy + 0.12, 0.12); }
      }
      break;
    }
    case COL.rail: {
      g.mat('tex.metal_galvanized', 0xffffff);
      if (lod === 0 && sy < 1.4 && sz > 2) {
        // railing: top rail, mid rail, posts every 1.5 m
        g.box(0, sy / 2 - 0.04, 0, Math.min(sx, 0.08), 0.08, sz); g.box(0, 0, 0, Math.min(sx, 0.05), 0.05, sz);
        const n = Math.max(1, Math.floor(sz / 1.5));
        for (let i = 0; i <= n; i++) g.box(0, 0, -sz / 2 + (i * sz) / n, 0.07, sy, 0.07);
        if (sx > 0.3) { g.mat('tex.concrete_cast', 0xc8c4bc); g.box(0, -sy / 2 + 0.25, 0, sx, 0.5, sz); }
      } else g.box(0, 0, 0, sx, sy, sz);
      break;
    }
    case COL.wood: case COL.woodDark: {
      const dark = c === COL.woodDark;
      g.mat(dark ? 'tex.wood_weathered_dark' : 'tex.wood_planks', dark ? 0xffffff : 0xc8bca8);
      if (sy <= 0.45 && lod === 0 && sx > 1.2) {
        // deck: planks across the length with gaps, stringers below
        g.box(0, 0, 0, sx, sy * 0.5, sz, { noBottom: false });
        g.mat('tex.wood_weathered_dark', 0xffffff);
        for (const xx of [-sx / 2 + 0.2, 0, sx / 2 - 0.2]) g.box(xx, -sy * 0.5, 0, 0.18, sy * 0.6, sz, { noTop: true });
      } else g.box(0, 0, 0, sx, sy, sz);
      break;
    }
    case COL.stone: {
      g.mat('tex.rock_dark', 0xffffff);
      g.box(0, 0, 0, sx, sy, sz, { noBottom: true });
      if (lod === 0 && sy > 4) {
        // armour rock along both flanks at the waterline
        const n = Math.max(2, Math.floor(sz / 3));
        for (let i = 0; i < n; i++) for (const sd of [-1, 1]) {
          const r = 1.0 + h01(i, sd + 7) * 0.9, z = -sz / 2 + (i + 0.5) * (sz / n), y = sy / 2 - 2.3 - 0.4 + h01(i, sd) * 0.6;
          g.push().translate(sd * (sx / 2 + r * 0.5), y, z).rotY(h01(i, 3) * 3).rotX((h01(i, 5) - 0.5) * 0.6);
          g.box(0, 0, 0, r * 1.6, r * 1.1, r * 1.4); g.pop();
        }
      }
      break;
    }
    case COL.black: g.mat('tex.flat', 0x0a0a0c); g.box(0, 0, 0, sx, sy, sz); break;
    case COL.dark: g.mat('tex.metal_painted', 0x2a2d31); g.box(0, 0, 0, sx, sy, sz); break;
    default: {
      g.mat('tex.concrete_cast', 0xd2cec6);
      g.box(0, 0, 0, sx, sy, sz, { noBottom: true });
      if (lod === 0 && sy > 6 && sx > 2 && sz > 2) { g.mat('tex.concrete_cast', 0xbab6ae); g.box(0, sy / 2 - 0.4, 0, sx + 0.5, 0.8, sz + 0.5); }
    }
  }
  g.pop();
}
