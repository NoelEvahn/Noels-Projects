// Infrastructure archetype builders (Annex A 6.2 infra.*): bridges, footbridges, quays, breakwater, piers, docks, tunnel portal,
// retaining walls and the weir are world-space part lists (world/layout/infra.js, params.parts). Each part is drawn with the
// material its role implies plus extra detail (parts.js): ribbed steel, railings with posts, plank decks with stringers, moss
// rings on piles, armour rock on the breakwater. Output is world-space (flagged), merged per chunk by the chunk manager.
import { GB, out } from '../kit/geo.js';
import { Builders } from '../../render/builders.js';
import { INFRA_IDS } from '../../world/archetypes.js';
import { addPartDetailed } from './parts.js';

const G0 = new GB(8192);
for (const id of INFRA_IDS) Builders.register(id, (pl, ctx) => {
  const g = G0.reset();
  for (const part of (pl.params && pl.params.parts) || []) addPartDetailed(g, part, ctx.lod || 0);
  const r = out({ 'mat.world': g }); r.worldSpace = true; return r;
}, { stage: 3 });
