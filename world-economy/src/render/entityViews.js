// Entity views (MASTER_SPEC 5.6, Annex A 7/9): pooled view objects per entity, interpolated between fixed steps, built from
// the Stage 3 art builders. LOD by camera distance (archetype lod distances x lodBias). Vehicles at LOD0 have separate wheel
// meshes that spin (parts.wheelSpin) and steer (parts.steer); characters are 16 rigid segments posed by the procedural gait
// (art/characters). Geometry is cached per archetype + LOD and shared; no allocation per frame in update().
import * as THREE from 'three';
import { Builders } from './builders.js';
import { MatLib } from './materials/matlib.js';
import { artGeometry } from './geom.js';
import { ENTITY_FLAGS } from '../data/ids.js';
import { ARCHETYPES } from '../world/archetypes.js';
import { GB } from '../art/kit/geo.js';
import { wheel, wheelSpec } from '../art/vehicles/index.js';
import { segmentGeometry, SEGMENTS, gait } from '../art/characters/index.js';

export function createEntityViews(scene) {
  const group = new THREE.Group(); group.name = 'entities';
  scene.add(group);
  const geoCache = new Map(), views = new Map();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), e3 = new THREE.Euler(), tmpQ = new THREE.Quaternion();
  const pose = new Float32Array(16 * 3);
  let lodBias = 1, castNear = true;
  function batchesFor(arch, lod, noWheels) {
    const key = arch + ':' + lod + (noWheels ? ':nw' : '');
    let b = geoCache.get(key);
    if (!b) {
      const r = Builders.get(arch)({ archetype: arch, seed: 5, x: 0, y: 0, z: 0, rotY: 0, params: noWheels ? { noWheels: true } : undefined }, { lod });
      b = r.batches.filter((x) => x.geometry.art).map((x) => ({ geo: artGeometry(x.geometry), mat: MatLib.has(x.materialId) ? x.materialId : 'mat.world' }));
      geoCache.set(key, b);
    }
    return b;
  }
  const wheelGeos = new Map();
  function wheelGeo(r, w) { const k = r + ':' + w; let g = wheelGeos.get(k); if (!g) { const gb = new GB(1024); wheel(gb, r, w, 0); g = artGeometry(gb.toArrays()); wheelGeos.set(k, g); } return g; }
  function makeLodGroup(arch, lod, kind) {
    const gr = new THREE.Group(); gr.matrixAutoUpdate = true;
    const vehicle = kind === 'vehicle' && lod === 0;
    for (const b of batchesFor(arch, lod, vehicle)) { const m = new THREE.Mesh(b.geo, MatLib.get(b.mat)); m.castShadow = lod <= 1; m.receiveShadow = true; gr.add(m); }
    if (vehicle) {
      gr.userData.wheels = [];
      for (const [x, y, z, r, w] of wheelSpec(arch)) { const m = new THREE.Mesh(wheelGeo(r, w), MatLib.get('mat.world')); m.position.set(x, y, z); m.castShadow = true; m.userData.front = z < 0; gr.add(m); gr.userData.wheels.push(m); }
    }
    return gr;
  }
  function makeCharacter(arch, seed) {
    const gr = new THREE.Group(), segs = segmentGeometry(arch, seed, 0), nodes = [];
    for (let i = 0; i < SEGMENTS.length; i++) {
      const [, par, off] = SEGMENTS[i];
      const n = new THREE.Mesh(artGeometry(segs[i], false), MatLib.get('mat.world')); n.castShadow = true; n.position.set(off[0], off[1], off[2]);
      (par < 0 ? gr : nodes[par]).add(n); nodes.push(n);
    }
    gr.userData.nodes = nodes; gr.userData.phase = 0;
    return gr;
  }
  function makeView(e) {
    const A = ARCHETYPES[e.archetype] || { lod: [40, 120, 400], category: 'prop' };
    const root = new THREE.Group(); root.name = 'ent.' + e.archetype;
    const v = { root, lods: [], cur: -1, kind: e.kind, A, character: A.category === 'character' };
    if (v.character) { v.lods = [makeCharacter(e.archetype, e.id)]; root.add(v.lods[0]); v.cur = 0; }
    else for (let l = 0; l < 3; l++) { const gr = makeLodGroup(e.archetype, l, e.kind); gr.visible = false; root.add(gr); v.lods.push(gr); }
    group.add(root);
    return v;
  }
  return {
    group,
    configure({ lodBias: lb = 1, shadows = true }) { lodBias = lb; castNear = shadows; },
    update(entities, alpha, time = 0, camera) {
      for (const v of views.values()) v.seen = false;
      for (const e of entities) {
        let v = views.get(e.id);
        if (!v) { v = makeView(e); views.set(e.id, v); }
        v.seen = true;
        const vis = !!(e.flags & ENTITY_FLAGS.VISIBLE);
        v.root.visible = vis;
        if (!vis) continue;
        const r = v.root;
        r.position.set(e.prevPos[0] + (e.pos[0] - e.prevPos[0]) * alpha, e.prevPos[1] + (e.pos[1] - e.prevPos[1]) * alpha, e.prevPos[2] + (e.pos[2] - e.prevPos[2]) * alpha);
        qa.set(e.prevQuat[0], e.prevQuat[1], e.prevQuat[2], e.prevQuat[3]); qb.set(e.quat[0], e.quat[1], e.quat[2], e.quat[3]);
        r.quaternion.copy(qa).slerp(qb, alpha);
        if (v.character) {
          const gr = v.lods[0], nodes = gr.userData.nodes, an = e.anim || { state: 'idle', speed: 0 };
          const sp = Math.max(0.2, an.speed || 0); gr.userData.phase += (an.state === 'idle' ? 1.2 : sp * 2.2) * (1 / 60);
          const bob = gait(an.state, gr.userData.phase, sp, pose);
          for (let i = 0; i < nodes.length; i++) { e3.set(pose[i * 3], pose[i * 3 + 1], pose[i * 3 + 2]); nodes[i].quaternion.setFromEuler(e3); }
          nodes[0].position.y = SEGMENTS[0][2][1] + bob;
          continue;
        }
        const d = camera ? camera.position.distanceTo(r.position) : 0, L = v.A.lod || [40, 120, 400];
        const lod = d < L[0] * lodBias ? 0 : d < L[1] * lodBias ? 1 : 2;
        if (lod !== v.cur) { if (v.cur >= 0) v.lods[v.cur].visible = false; v.lods[lod].visible = true; v.cur = lod; for (const m of v.lods[lod].children) m.castShadow = castNear && lod <= 1; }
        const wh = v.lods[lod].userData.wheels;
        if (wh && e.parts) {
          const spin = Array.isArray(e.parts.wheelSpin) ? e.parts.wheelSpin[0] : e.parts.wheelSpin || 0, steer = e.parts.steer || 0;
          for (const m of wh) { tmpQ.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, m.userData.front ? -steer : 0); m.quaternion.setFromAxisAngle(_X, -spin); m.quaternion.premultiply(tmpQ); }
        }
      }
      for (const [id, v] of views) if (!v.seen) { group.remove(v.root); views.delete(id); }
      void time;
    },
    get count() { return views.size; },
  };
}
const _X = new THREE.Vector3(1, 0, 0);
