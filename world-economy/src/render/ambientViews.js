// Ambient life views (Visual Fix Round 1): instanced render of game/ai/ambient.js agents. Cars: one InstancedMesh per
// (kind, paint variant, LOD) batch plus shared instanced wheels that spin (LOD0 within 50 m); pedestrians: 16 instanced
// segment meshes per outfit variant posed by the procedural gait (within 30 m) and one static instanced figure beyond;
// gulls and crows: three instanced wing poses (up / level / down) switched by the flap phase. Geometry and meshes are created
// lazily once per combination; nothing is allocated per frame (O9). Replaced/extended by the Stage 4 entity views.
import * as THREE from 'three';
import { Builders } from './builders.js';
import { MatLib } from './materials/matlib.js';
import { artGeometry } from './geom.js';
import { GB } from '../art/kit/geo.js';
import { wheel, wheelSpec } from '../art/vehicles/index.js';
import { segmentGeometry, SEGMENTS, gait } from '../art/characters/index.js';

const CAP_CAR = 20, CAP_PED_NEAR = 36;
function birdGeo(body, wing, span, lift, len) {
  const g = new GB(256); g.groundAO = false;
  g.mat('tex.fabric_cloth', body); g.push().scale(1, 0.8, len); g.lathe([[0.001, -0.18], [0.07, -0.1], [0.08, 0.08], [0.001, 0.2]], 8); g.pop();
  g.mat('tex.fabric_cloth', wing);
  for (const s of [-1, 1]) {
    g.quad([0, 0.04, -0.07], [0, 0.04, 0.09], [s * span * 0.5, 0.04 + lift * 0.5, 0.14], [s * span * 0.5, 0.04 + lift * 0.5, 0.02]);
    g.quad([s * span * 0.5, 0.04 + lift * 0.5, 0.02], [s * span * 0.5, 0.04 + lift * 0.5, 0.14], [s * span, 0.04 + lift, 0.16], [s * span, 0.04 + lift, 0.06]);
  }
  g.mat('tex.plastic', body === 0x18181c ? 0x303030 : 0xe8c040); g.box(0, 0.02, -0.22 * len, 0.02, 0.02, 0.06);
  return artGeometry(g.toArrays());
}

export function createAmbientViews({ scene, ambient }) {
  const group = new THREE.Group(); group.name = 'ambient'; scene.add(group);
  const cfg = { lodBias: 1, shadows: true };
  const mk = (geo, mat, cap, cast, name) => { const m = new THREE.InstancedMesh(geo, mat, cap); m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = cast; m.receiveShadow = true; m.matrixAutoUpdate = false; m.name = name; group.add(m); return m; };
  const tmpA = new THREE.Matrix4(), tmpB = new THREE.Matrix4(), tmpC = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();
  const fwd = new THREE.Vector3(), cp = new THREE.Vector3();
  // ---- cars -----------------------------------------------------------------------------------------------------------------------------------
  const carSets = new Map(), wheelSets = new Map(), wheelGeos = new Map();
  function carSet(kind, variant, lod) {
    const key = kind + ':' + variant + ':' + lod;
    let s = carSets.get(key);
    if (!s) {
      const arch = ambient.CAR_KINDS[kind];
      const r = Builders.get(arch)({ archetype: arch, seed: 11 + variant * 5 + kind, x: 0, y: 0, z: 0, rotY: 0, params: lod === 0 ? { noWheels: true } : undefined }, { lod });
      s = { n: 0, meshes: r.batches.filter((b) => b.geometry.art).map((b) => mk(artGeometry(b.geometry), MatLib.get(MatLib.has(b.materialId) ? b.materialId : 'mat.world'), CAP_CAR, lod === 0 && cfg.shadows, `amb.car.${arch}.${variant}.L${lod}`)) };
      carSets.set(key, s);
    }
    return s;
  }
  function wheelSet(r, w) {
    const key = r + ':' + w;
    let s = wheelSets.get(key);
    if (!s) { const gb = new GB(1024); wheel(gb, r, w, 0); s = { n: 0, mesh: mk(artGeometry(gb.toArrays()), MatLib.get('mat.world'), CAP_CAR * 4 + 8, cfg.shadows, 'amb.wheel.' + key) }; wheelSets.set(key, s); }
    return s;
  }
  function carMatrix(arr, o, x, y, z, yaw, pitch) {
    const th = -yaw, c = Math.cos(th), s = Math.sin(th), cpp = Math.cos(pitch), sp = Math.sin(pitch);
    arr[o] = c; arr[o + 1] = 0; arr[o + 2] = -s; arr[o + 3] = 0;
    arr[o + 4] = s * sp; arr[o + 5] = cpp; arr[o + 6] = c * sp; arr[o + 7] = 0;
    arr[o + 8] = s * cpp; arr[o + 9] = -sp; arr[o + 10] = c * cpp; arr[o + 11] = 0;
    arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1;
  }
  // ---- pedestrians ---------------------------------------------------------------------------------------------------------------------------
  const pedVar = [];
  function pedSet(v) {
    let s = pedVar[v];
    if (!s) {
      const seed = 101 + v * 17, segs = segmentGeometry('chr.ped', seed, 0);
      s = { n: 0, nodes: SEGMENTS.map((sg, i) => mk(artGeometry(segs[i], false), MatLib.get('mat.world'), CAP_PED_NEAR, i === 3 ? false : cfg.shadows, `amb.ped.${v}.${sg[0]}`)), far: null, nFar: 0 };
      const r = Builders.get('chr.ped')({ archetype: 'chr.ped', seed, x: 0, y: 0, z: 0, rotY: 0 }, { lod: 1 });
      const b = r.batches.filter((x) => x.geometry.art)[0];
      s.far = mk(artGeometry(b.geometry), MatLib.get('mat.world'), 100, false, `amb.pedfar.${v}`);
      pedVar[v] = s;
    }
    return s;
  }
  const pose = new Float32Array(16 * 3), W = SEGMENTS.map(() => new THREE.Matrix4());
  // ---- birds -------------------------------------------------------------------------------------------------------------------------------------
  let gullPoses = null, crowPoses = null;
  function birdMeshes() {
    if (gullPoses) return;
    const mat = MatLib.get('mat.world_ds');
    gullPoses = [0.3, 0.02, -0.26].map((l, i) => ({ n: 0, mesh: mk(birdGeo(0xf2f2ee, 0xa4aab2, 0.62, l, 1), mat, 40, false, 'amb.gull.' + i) }));
    crowPoses = [0.22, 0.02, -0.2].map((l, i) => ({ n: 0, mesh: mk(birdGeo(0x18181c, 0x202026, 0.4, l, 0.9), mat, 20, false, 'amb.crow.' + i) }));
  }
  function updateBirds(set, poses, scale, cam, maxD) {
    for (const p of poses) p.n = 0;
    for (let i = 0; i < set.n; i++) {
      const dx = set.x[i] - cam.x, dz = set.z[i] - cam.z; if (dx * dx + dz * dz > maxD * maxD) continue;
      const f = set.flap[i], p = poses[f > 0.35 ? 0 : f < -0.35 ? 2 : 1];
      if (p.n >= p.mesh.instanceMatrix.count) continue;
      tmpA.makeRotationY(-set.yaw[i]); tmpB.makeRotationZ(set.bank[i] + f * 0.04); tmpA.multiply(tmpB);
      tmpS.set(scale, scale, scale); tmpA.scale(tmpS); tmpA.setPosition(set.x[i], set.y[i], set.z[i]);
      tmpA.toArray(p.mesh.instanceMatrix.array, p.n * 16); p.n++;
    }
    for (const p of poses) { p.mesh.count = p.n; p.mesh.visible = p.n > 0; if (p.n) p.mesh.instanceMatrix.needsUpdate = true; }
  }
  const stats = { cars: 0, peds: 0, pedsNear: 0, drawn: 0 };
  // background warm-up: one geometry combination per frame so nothing is built in the middle of play (one-time cost, O9/O10)
  const warm = [];
  for (let k = 0; k < ambient.CAR_KINDS.length; k++) for (let v = 0; v < 3; v++) for (let l = 0; l < 2; l++) if (!(k === 0 && v === 0)) warm.push(() => carSet(k, v, l));
  for (let v = 0; v < 4; v++) warm.push(() => pedSet(v));
  let warmI = 0;
  return {
    group, stats,
    /** makes every lazily created mesh drawable once so the shader programs compile before play (renderer.compile) */
    prewarm(on) {
      carSet(0, 0, 0); carSet(0, 0, 1); wheelSet(0.33, 0.22); pedSet(0); birdMeshes();
      for (const s of carSets.values()) for (const m of s.meshes) { m.visible = on; m.count = on ? 1 : 0; }
      for (const s of wheelSets.values()) { s.mesh.visible = on; s.mesh.count = on ? 1 : 0; }
      for (const s of pedVar) if (s) { for (const m of s.nodes) { m.visible = on; m.count = on ? 1 : 0; } s.far.visible = on; s.far.count = on ? 1 : 0; }
      for (const p of [...gullPoses, ...crowPoses]) { p.mesh.visible = on; p.mesh.count = on ? 1 : 0; }
    },
    configure({ lodBias = 1, shadows = true } = {}) { cfg.lodBias = lodBias; cfg.shadows = shadows; for (const s of carSets.values()) if (s.meshes[0].name.endsWith('L0')) for (const m of s.meshes) m.castShadow = shadows; },
    update(camera) {
      if (!ambient.ready) return;
      if (warmI < warm.length) warm[warmI++]();
      const cam = camera.position;
      camera.getWorldDirection(fwd);
      const cars = ambient.cars, peds = ambient.peds;
      for (const s of carSets.values()) s.n = 0;
      for (const s of wheelSets.values()) s.n = 0;
      let nc = 0;
      const L0 = 50 * cfg.lodBias, MAXD = 340;
      for (let i = 0; i < cars.edge.length; i++) {
        if (!cars.active[i]) continue;
        const dx = cars.x[i] - cam.x, dz = cars.z[i] - cam.z, d2 = dx * dx + dz * dz;
        if (d2 > MAXD * MAXD) continue;
        // cull behind the camera except close cars (their shadows still reach the view)
        if (d2 > 3600 && dx * fwd.x + dz * fwd.z < -0.15 * Math.sqrt(d2)) continue;
        const lod = d2 < L0 * L0 ? 0 : 1, set = carSet(cars.kind[i], cars.variant[i], lod);
        if (set.n >= CAP_CAR) continue;
        for (const m of set.meshes) carMatrix(m.instanceMatrix.array, set.n * 16, cars.x[i], cars.y[i], cars.z[i], cars.yaw[i], cars.pitch[i]);
        set.n++; nc++;
        if (lod === 0) {
          carMatrix(tmpC.elements, 0, cars.x[i], cars.y[i], cars.z[i], cars.yaw[i], cars.pitch[i]);
          for (const [wx, wy, wz, wr, ww] of wheelSpec(ambient.CAR_KINDS[cars.kind[i]])) {
            const ws = wheelSet(wr, ww); if (ws.n >= CAP_CAR * 4) continue;
            tmpB.makeRotationX(-cars.spin[i]); tmpB.setPosition(wx, wy, wz); tmpA.multiplyMatrices(tmpC, tmpB);
            tmpA.toArray(ws.mesh.instanceMatrix.array, ws.n * 16); ws.n++;
          }
        }
      }
      let draws = 0;
      for (const s of carSets.values()) for (const m of s.meshes) { m.count = s.n; m.visible = s.n > 0; if (s.n) { m.instanceMatrix.needsUpdate = true; draws++; } }
      for (const s of wheelSets.values()) { s.mesh.count = s.n; s.mesh.visible = s.n > 0; if (s.n) { s.mesh.instanceMatrix.needsUpdate = true; draws++; } }
      // pedestrians
      for (const s of pedVar) if (s) { s.n = 0; s.nFar = 0; }
      let np = 0, nn = 0;
      for (let i = 0; i < peds.edge.length; i++) {
        if (!peds.active[i]) continue;
        const dx = peds.x[i] - cam.x, dz = peds.z[i] - cam.z, d2 = dx * dx + dz * dz;
        if (d2 > 170 * 170) continue;
        if (d2 > 900 && dx * fwd.x + dz * fwd.z < -0.15 * Math.sqrt(d2)) continue;
        const s = pedSet(peds.variant[i]); np++;
        const th = -peds.yaw[i];
        if (d2 < 32 * 32 * cfg.lodBias * cfg.lodBias && s.n < CAP_PED_NEAR) {
          nn++;
          const bob = gait(peds.state[i] === 1 ? 'idle' : 'walk', peds.phase[i], peds.speed[i], pose);
          tmpA.makeRotationY(th); tmpA.setPosition(peds.x[i], peds.y[i], peds.z[i]);
          for (let k = 0; k < SEGMENTS.length; k++) {
            const [, par, off] = SEGMENTS[k];
            tmpE.set(pose[k * 3], pose[k * 3 + 1], pose[k * 3 + 2]); tmpQ.setFromEuler(tmpE);
            tmpV.set(off[0], off[1] + (k === 0 ? bob : 0), off[2]); tmpS.set(1, 1, 1);
            tmpB.compose(tmpV, tmpQ, tmpS);
            W[k].multiplyMatrices(par < 0 ? tmpA : W[par], tmpB);
            W[k].toArray(s.nodes[k].instanceMatrix.array, s.n * 16);
          }
          s.n++;
        } else if (s.nFar < 100) {
          carMatrix(s.far.instanceMatrix.array, s.nFar * 16, peds.x[i], peds.y[i] + 0.0, peds.z[i], peds.yaw[i], 0);
          s.nFar++;
        }
      }
      for (const s of pedVar) if (s) {
        for (const m of s.nodes) { m.count = s.n; m.visible = s.n > 0; if (s.n) { m.instanceMatrix.needsUpdate = true; draws++; } }
        s.far.count = s.nFar; s.far.visible = s.nFar > 0; if (s.nFar) { s.far.instanceMatrix.needsUpdate = true; draws++; }
      }
      // birds
      birdMeshes();
      cp.copy(cam);
      updateBirds(ambient.birds.gulls, gullPoses, 1.5, cp, 520);
      updateBirds(ambient.birds.crows, crowPoses, 1.4, cp, 380);
      stats.cars = nc; stats.peds = np; stats.pedsNear = nn; stats.drawn = draws;
    },
  };
}
