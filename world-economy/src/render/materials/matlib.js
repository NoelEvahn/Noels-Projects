// MatLib (Annex A 5.1) minimal Stage 2 version: all world materials come from here; only blockout ids exist yet.
import * as THREE from 'three';

const cache = new Map();
const MAKERS = {
  'mat.blockout': () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.0 }),
  'mat.blockout_water': () => new THREE.MeshStandardMaterial({ color: 0x1f8296, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.8, depthWrite: false }),
  'mat.blockout_lake': () => new THREE.MeshStandardMaterial({ color: 0x2a6a66, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  'mat.blockout_tree': () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  'mat.blockout_far': () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0, metalness: 0.0 }),
};
export const MatLib = {
  get(matId, variant) {
    const key = matId + (variant ? JSON.stringify(variant) : '');
    let m = cache.get(key);
    if (!m) {
      const mk = MAKERS[matId];
      if (!mk) throw new Error('MatLib: unknown material ' + matId);
      m = mk();
      if (variant && variant.doubleSided) m.side = THREE.DoubleSide;
      m.name = matId;
      cache.set(key, m);
    }
    return m;
  },
  textureSet() { return null; },            // Stage 3
  ensure() { return Promise.resolve(); },    // Stage 3
  release() {},
  stats() { return { materials: cache.size, programs: 0, textureBytes: 0 }; },
};
