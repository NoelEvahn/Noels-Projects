// Placeholder tree geometry (instanced cones). Pure arrays; render/chunkManager.js wraps them in InstancedMesh.
import { GeoBuilder } from './geo.js';
const cache = new Map();
/** kind: 'conifer'|'broadleaf'|'palm'; lod 0 = detailed placeholder, 1 = 4-sided pyramid. Base at y = 0, unit scale = archetype size. */
export function treeArrays(kind, lod = 0) {
  const key = kind + lod;
  if (cache.has(key)) return cache.get(key);
  const g = new GeoBuilder();
  if (lod === 1) {
    if (kind === 'broadleaf') g.cyl(0, 2.5, 0, 3.2, 0, 7, 0x4a7a3a, 4, { noBottom: true });
    else if (kind === 'palm') g.cyl(0, 6, 0, 2.6, 0, 3, 0x4f8a3e, 4, { noBottom: true });
    else g.cyl(0, 2, 0, 2.2, 0, 14, 0x24432e, 4, { noBottom: true });
  } else if (kind === 'conifer') {
    g.cyl(0, 0, 0, 0.35, 0.25, 3, 0x4a3a2a, 5, { noBottom: true });
    g.cyl(0, 2.2, 0, 2.3, 0.9, 6.4, 0x233f2b, 7, { noBottom: true });
    g.cyl(0, 7.2, 0, 1.6, 0, 7.8, 0x2a4a32, 7, { noBottom: true });
  } else if (kind === 'broadleaf') {
    g.cyl(0, 0, 0, 0.4, 0.3, 4, 0x5a4332, 5, { noBottom: true });
    g.cyl(0, 3, 0, 0.3, 3.8, 3.2, 0x4c7a3a, 7, { noBottom: true });
    g.cyl(0, 6.2, 0, 3.8, 0.2, 3.6, 0x5a8a42, 7, { noBottom: true });
  } else {
    g.cyl(0, 0, 0, 0.3, 0.22, 7.5, 0x8a7458, 5, { noBottom: true });
    g.cyl(0, 7.0, 0, 0.1, 2.6, 0.9, 0x4f8a3e, 6, { noBottom: true });
    g.cyl(0, 7.9, 0, 2.6, 0.1, 0.8, 0x438035, 6, { noBottom: true });
  }
  const a = g.toArrays();
  cache.set(key, a);
  return a;
}
/** map TREE_TYPES index to a geometry kind and a nominal size multiplier (palm 0..1 etc.) */
export const TREE_KIND = ['conifer', 'conifer', 'conifer', 'broadleaf', 'broadleaf', 'broadleaf', 'palm', 'palm'];
export const TREE_SCALE = [1.0, 1.25, 1.45, 1.0, 0.95, 0.85, 1.0, 1.15];
