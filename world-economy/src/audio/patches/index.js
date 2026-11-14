// Patch registry: sound id -> patch function. Ids without an entry are registered stubs (P1/P2, completed by Stage 6).
import { UI } from './ui.js';
import { FOLEY } from './foley.js';
import { VEHICLES } from './vehicles.js';
import { WATER } from './water.js';
import { WORK } from './work.js';
import { AMBIENCE } from './ambience.js';

export const PATCHES = Object.freeze({ ...UI, ...FOLEY, ...VEHICLES, ...WATER, ...WORK, ...AMBIENCE });
export function hasPatch(id) { return id.startsWith('mus.') || typeof PATCHES[id] === 'function'; }
