// MatLib (Annex A 5.1): every world material is created here, cached by id + variant, patched by the shared chain
// (patches.js) and registered for CSM setup. Builders and chunk code only ever name material ids.
import * as THREE from 'three';
import { patchMaterial, G, makeLayerProps } from './patches.js';
import { MemTracker } from '../perf.js';

const cache = new Map();
const lit = new Set();
let csm = null;
let leafAtlas = null, particleAtlas = null, decalAtlas = null;

const std = (o) => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, ...o });
function world(flags, o = {}) { const m = std(o); patchMaterial(m, { arr: true, ...flags }); lit.add(m); return m; }

const MAKERS = {
  // static world geometry (chunks, infra, props merged per chunk): texture-array layers, tint, AO, window/lamp emissive
  'mat.world': () => world({ emit: true }),
  'mat.world_inst': () => world({ emit: true, key: ':i' }),
  'mat.world_ds': () => world({ emit: true, key: ':ds' }, { side: THREE.DoubleSide }),
  // terrain (8-layer splat) and far proxy terrain
  'mat.terrain': () => world({ splat: true }),
  // vehicles: clearcoat paint (MeshPhysical, <= 6 such materials)
  'mat.carpaint': () => { const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 }); patchMaterial(m, { arr: true, emit: true, key: ':cc' }); lit.add(m); return m; },
  'mat.glass': () => { const m = std({ color: 0x9fb4c4, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35, depthWrite: false, envMapIntensity: 1.4 }); patchMaterial(m, {}); lit.add(m); return m; },
  // vegetation: bark (array layers + wind, instanced) and leaf cards (atlas, alpha test, wind, instanced)
  'mat.veg_bark': () => world({ wind: true, key: ':vb' }),
  'mat.veg_leaf': () => { const m = std({ map: leafAtlas, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.82 }); patchMaterial(m, { wind: true, key: ':vl' }); lit.add(m); return m; },
  'mat.groundcover': () => { const m = std({ map: leafAtlas, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 }); patchMaterial(m, { wind: true, key: ':gc' }); lit.add(m); return m; },
  // characters (instanced segments, tinted by instance colour)
  'mat.character': () => { const m = std({ roughness: 0.8 }); patchMaterial(m, { key: ':ch' }); lit.add(m); return m; },
  // emissive and additive helpers (lamp glows, light pools, beams)
  'mat.glow': () => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true, fog: true }); patchMaterial(m, { key: ':glow' }); return m; },
  'mat.lightpool': () => { const m = new THREE.MeshBasicMaterial({ map: decalAtlas, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); patchMaterial(m, { key: ':pool' }); return m; },
  'mat.decal': () => { const m = std({ map: decalAtlas, transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); patchMaterial(m, { key: ':decal' }); lit.add(m); return m; },
  'mat.particle': () => { const m = new THREE.MeshBasicMaterial({ map: particleAtlas, transparent: true, depthWrite: false, fog: true, vertexColors: true }); patchMaterial(m, { key: ':pt' }); return m; },
  // Stage 2 materials (kept for the blockout fallback path)
  'mat.blockout': () => { const m = std({ vertexColors: true, roughness: 0.92 }); patchMaterial(m, { key: ':bo' }); lit.add(m); return m; },
  'mat.blockout_tree': () => { const m = std({ vertexColors: true, roughness: 0.95 }); patchMaterial(m, { key: ':bo' }); lit.add(m); return m; },
  'mat.blockout_far': () => { const m = std({ vertexColors: true, roughness: 1 }); patchMaterial(m, { key: ':bo' }); lit.add(m); return m; },
};

function applyCsm(m) {
  m.onBeforeCompile = THREE.Material.prototype.onBeforeCompile;
  if (m.defines) { delete m.defines.USE_CSM; delete m.defines.CSM_CASCADES; delete m.defines.CSM_FADE; }
  if (csm) csm.setupMaterial(m);
  patchMaterial(m, m.userData.patchFlags);
  m.needsUpdate = true;
}

export const MatLib = {
  G,
  /** called once by the renderer before any material is created */
  init({ leaf, particles, decals } = {}) {
    if (!G.tProps.value) { makeLayerProps(); MemTracker.addTexture(G.tProps.value, 256, 1, 4, false, false); }
    if (leaf) leafAtlas = leaf;
    if (particles) particleAtlas = particles;
    if (decals) decalAtlas = decals;
  },
  get(matId, variant) {
    const key = variant ? matId + JSON.stringify(variant) : matId;
    let m = cache.get(key);
    if (!m) {
      const mk = MAKERS[matId];
      if (!mk) throw new Error('MatLib: unknown material ' + matId);
      m = mk(variant || {});
      if (variant && variant.doubleSided) m.side = THREE.DoubleSide;
      m.name = matId;
      if (lit.has(m) && csm) applyCsm(m);
      if (MatLib.shaderTier === 'low' && m.userData.patchFlags && m.userData.patchFlags.arr) { m.defines = m.defines || {}; m.defines.LOE_LOW = ''; }
      cache.set(key, m);
    }
    return m;
  },
  has(matId) { return !!MAKERS[matId]; },
  /** CSM instance changed (cascade count, on/off): re-run the patch chain on every lit material (recompile behind "Applying...") */
  setCsm(next) { csm = next; for (const m of lit) applyCsm(m); },
  textureSet() { return null; },
  ensure() { return Promise.resolve(); },
  release() {},
  /** shader tier: 'low' compiles the cheap variant (2-layer splat, albedo-only taps, no normal maps) for the Low texture tier */
  setShaderTier(tier) {
    const low = tier === 'low';
    if (MatLib.shaderTier === tier) return false;
    MatLib.shaderTier = tier;
    for (const m of lit) {
      if (!m.userData.patchFlags || !m.userData.patchFlags.arr) continue;
      m.defines = m.defines || {};
      if (low) m.defines.LOE_LOW = ''; else delete m.defines.LOE_LOW;
      m.needsUpdate = true;
    }
    return true;
  },
  shaderTier: 'full',
  forEach(fn) { for (const m of cache.values()) fn(m); },
  stats() { return { materials: cache.size, programs: 0, textureBytes: MemTracker.libraryTextureBytes }; },
};
