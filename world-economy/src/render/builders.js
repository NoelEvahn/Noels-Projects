// Builder registry (MASTER_SPEC 5.5). Builders return raw geometry + material ids and never touch the scene.
// A later registration replaces an earlier one (Stage 3 `art/` replaces the Stage 2 `blockout/` builders under the same ids).
const registry = new Map();
export const Builders = {
  register(archetypeId, builder, { stage = 2 } = {}) { registry.set(archetypeId, { builder, stage }); },
  get(archetypeId) { const e = registry.get(archetypeId); return e ? e.builder : null; },
  stageOf(archetypeId) { const e = registry.get(archetypeId); return e ? e.stage : null; },
  has(archetypeId) { return registry.has(archetypeId); },
  ids() { return Array.from(registry.keys()); },
  /** ids whose active builder is still the Stage 2 blockout (Stage 3 target: 0) */
  blockoutIds() { return Array.from(registry.entries()).filter(([, e]) => e.stage <= 2).map(([id]) => id); },
};
