// Entity views: one mesh per visible entity, interpolated between fixed steps (MASTER_SPEC 5.6). Blockout builders supply the geometry.
import * as THREE from 'three';
import { Builders } from './builders.js';
import { MatLib } from './materials/matlib.js';
import { MemTracker } from './perf.js';
import { ENTITY_FLAGS } from '../data/ids.js';

export function createEntityViews(scene) {
  const group = new THREE.Group(); group.name = 'entities';
  scene.add(group);
  const geoms = new Map();
  const views = new Map();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  function geometryFor(arch) {
    let g = geoms.get(arch);
    if (!g) {
      const r = Builders.get(arch)({ archetype: arch, seed: 5, params: undefined }, { lod: 0 });
      const b = r.batches[0].geometry;
      g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(b.position, 3)); g.setAttribute('normal', new THREE.BufferAttribute(b.normal, 3)); g.setAttribute('color', new THREE.BufferAttribute(b.color, 3, true));
      g.setIndex(new THREE.BufferAttribute(Uint16Array.from(b.index), 1));
      g.computeBoundingSphere(); MemTracker.addGeometry(g);
      geoms.set(arch, g);
    }
    return g;
  }
  return {
    group,
    update(entities, alpha) {
      const seen = new Set();
      for (const e of entities) {
        seen.add(e.id);
        let m = views.get(e.id);
        if (!m) { m = new THREE.Mesh(geometryFor(e.archetype), MatLib.get('mat.blockout')); m.matrixAutoUpdate = true; m.name = 'ent.' + e.archetype; group.add(m); views.set(e.id, m); }
        m.visible = !!(e.flags & ENTITY_FLAGS.VISIBLE);
        if (!m.visible) continue;
        m.position.set(e.prevPos[0] + (e.pos[0] - e.prevPos[0]) * alpha, e.prevPos[1] + (e.pos[1] - e.prevPos[1]) * alpha, e.prevPos[2] + (e.pos[2] - e.prevPos[2]) * alpha);
        qa.set(e.prevQuat[0], e.prevQuat[1], e.prevQuat[2], e.prevQuat[3]); qb.set(e.quat[0], e.quat[1], e.quat[2], e.quat[3]);
        m.quaternion.copy(qa).slerp(qb, alpha);
      }
      for (const [id, m] of views) if (!seen.has(id)) { group.remove(m); views.delete(id); }
    },
    get count() { return views.size; },
  };
}
