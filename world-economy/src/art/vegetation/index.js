// Vegetation archetype builders (Annex A 8): the vegetation system (render/vegetation.js) draws scattered trees instanced with
// LOD0/LOD1 meshes and impostors; these builders expose the same species geometry for placements, previews and impostor bakes.
// Bark -> 'mat.veg_bark', foliage cards -> 'mat.veg_leaf' (alpha-tested, wind). LOD2 = crossed cards.
import { treeGeometry, plantGeometry, TREE_SPECIES } from './trees.js';
import { Builders } from '../../render/builders.js';

for (const id of TREE_SPECIES) Builders.register(id, (pl, ctx) => {
  const t = treeGeometry(id, Math.min(1, ctx.lod || 0));
  return { batches: [{ geometry: t.bark, materialId: 'mat.veg_bark' }, { geometry: t.leaf, materialId: 'mat.veg_leaf' }] };
}, { stage: 3 });
for (const id of ['veg.bush_a', 'veg.bush_b', 'veg.hedge', 'veg.fern', 'veg.grass_tuft', 'veg.reeds', 'veg.groundcover', 'veg.flowers', 'veg.ivy']) Builders.register(id, (pl, ctx) => {
  if ((ctx.lod || 0) >= 2 && id !== 'veg.hedge') return { batches: [] };
  return { batches: [{ geometry: plantGeometry(id).leaf, materialId: 'mat.groundcover' }] };
}, { stage: 3 });
