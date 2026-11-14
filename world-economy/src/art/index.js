// Stage 3 detailed builders (Annex A 6-9): importing this module registers a detailed builder for every archetype id it
// covers, replacing the Stage 2 blockout builder under the same id (render/builders.js keeps the later registration).
import './buildings/index.js';
import './props/index.js';
import './vehicles/index.js';
import './boats/index.js';
import './characters/index.js';
import './vegetation/index.js';
import './infra/index.js';
import './interiors/index.js';
