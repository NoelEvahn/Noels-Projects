// Scene detail Batch 2/3 (instanced, CPU-light): overhead wires between utility poles, perched birds (wires, bridge rails, bollards),
// swimming ducks and swans with wake rings, fish shadows, ripple rings around piles, foam collars and contact shadows around moored hulls.
// Placement data comes from world/layout/decorDetail.js (`World.data.decor.detail2`, flat typed lists). Every type is one draw call
// (or one dynamic mesh); lists are rebuilt when the camera moves > 12 m, animals are moved on the CPU every frame (a few dozen matrices).
// Quality: radii and counts scale with the detail tier; Low draws wires and perched birds nearby only and no fish.
import * as THREE from 'three';
import { World } from '../world/query.js';
import { MatLib } from './materials/matlib.js';
import { artGeometry } from './geom.js';
import { GB } from '../art/kit/geo.js';
import { decalCell } from './textures/canvasTex.js';
import { plantGeometry } from '../art/vegetation/trees.js';

const hash = (i) => { let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// radii (m) and caps per detail tier: wires, perched birds, waterfowl, fish, rings, hull collars
const TIERS = {
  low: { wire: 80, bird: 45, fowl: 55, fish: 0, ring: 40, hull: 70, weed: 14 },
  medium: { wire: 120, bird: 65, fowl: 80, fish: 45, ring: 60, hull: 110, weed: 26 },
  high: { wire: 170, bird: 90, fowl: 120, fish: 70, ring: 80, hull: 150, weed: 36 },
  ultra: { wire: 220, bird: 120, fowl: 160, fish: 90, ring: 100, hull: 200, weed: 44 },
};
const MAX_SPANS = 90, SEGS = 7;

function quadGeo(cell) {
  const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, cell[0] + uv.getX(i) * (cell[2] - cell[0]), cell[1] + uv.getY(i) * (cell[3] - cell[1]));
  return g;
}
const ell = (g, x, y, z, sx, sy, sz, n = 7) => { g.push().translate(x, y, z).scale(sx, sy, sz); g.lathe([[0.001, -1], [0.72, -0.7], [1, 0], [0.72, 0.7], [0.001, 1]], n); g.pop(); };
/** perched bird, feet at the origin, bow = -z. kind 0 songbird (body 12 cm), 1 pigeon, 2 gull */
function perchGeo(kind) {
  const g = new GB(512); g.groundAO = false;
  const S = [0.07, 0.15, 0.22][kind], body = [0x7a5a3c, 0x8e929a, 0xf2f2ee][kind], wing = [0x5a4630, 0x5e626c, 0x9aa2ac][kind], head = [0x6a4a30, 0x4a5a6a, 0xf2f2ee][kind], beak = [0x303030, 0x585858, 0xe8b020][kind];
  g.mat('tex.fabric_cloth', body); ell(g, 0, S * 1.05, 0.05 * S, S * 0.55, S * 0.6, S * 0.95);
  g.mat('tex.fabric_cloth', wing); ell(g, 0, S * 1.2, 0.35 * S, S * 0.5, S * 0.3, S * 0.75);
  g.mat('tex.fabric_cloth', head); ell(g, 0, S * 1.75, -0.6 * S, S * 0.3, S * 0.3, S * 0.32);
  g.mat('tex.plastic', beak); g.box(0, S * 1.72, -0.98 * S, S * 0.1, S * 0.09, S * 0.3);
  g.mat('tex.fabric_cloth', wing); g.beam([0, S * 0.95, S * 0.8], [0, S * 0.7, S * 1.9], S * 0.45, S * 0.3);
  g.mat('tex.plastic', 0x2a2a2a); for (const sx of [-1, 1]) g.beam([sx * S * 0.15, 0.0, 0], [sx * S * 0.15, S * 0.5, 0], S * 0.06);
  return artGeometry(g.toArrays());
}
function duckGeo() { // mallard drake floating (waterline at y = 0.03), bow = -z
  const g = new GB(1024); g.groundAO = false;
  g.mat('tex.fabric_cloth', 0xb0aea8); ell(g, 0, 0.07, 0.02, 0.11, 0.09, 0.24, 8);
  g.mat('tex.fabric_cloth', 0x3a3a3c); ell(g, 0, 0.09, 0.2, 0.08, 0.05, 0.1, 6);
  g.mat('tex.fabric_cloth', 0x6a4a36); ell(g, 0, 0.12, -0.1, 0.1, 0.07, 0.09, 6);
  g.mat('tex.fabric_cloth', 0x1a6a40); ell(g, 0, 0.2, -0.19, 0.055, 0.06, 0.075, 7);
  g.mat('tex.fabric_cloth', 0xf0f0ec); g.cyl(0, 0.155, -0.19, 0.058, 0.058, 0.014, 8);
  g.mat('tex.plastic', 0xe0c030); g.box(0, 0.19, -0.285, 0.05, 0.02, 0.09);
  g.mat('tex.fabric_cloth', 0x7a7a74); g.beam([0, 0.1, 0.2], [0, 0.12, 0.3], 0.07, 0.01);
  return artGeometry(g.toArrays());
}
function swanGeo() { // white swan, waterline at y = 0.06
  const g = new GB(2048); g.groundAO = false;
  g.mat('tex.fabric_cloth', 0xf4f4f0); ell(g, 0, 0.17, 0.04, 0.2, 0.17, 0.42, 9);
  g.push().translate(0, 0.28, 0.2).rotX(-0.5); g.lathe([[0.001, 0], [0.12, 0.05], [0.14, 0.35], [0.001, 0.4]], 6); g.pop();
  const neck = [[0, 0.3, -0.3], [0, 0.46, -0.42], [0, 0.66, -0.42], [0, 0.78, -0.36], [0, 0.82, -0.46]];
  for (let k = 0; k < neck.length - 1; k++) g.tube(neck[k], neck[k + 1], 0.04 - k * 0.004, 0.036 - k * 0.004, 5);
  ell(g, 0, 0.82, -0.5, 0.04, 0.04, 0.07, 6);
  g.mat('tex.plastic', 0xe86a1a); g.box(0, 0.81, -0.6, 0.035, 0.02, 0.1); g.mat('tex.plastic', 0x1a1a1a); g.box(0, 0.83, -0.54, 0.036, 0.015, 0.02);
  return artGeometry(g.toArrays());
}

export function createDetail2({ scene }) {
  const group = new THREE.Group(); group.name = 'detail2'; scene.add(group);
  const cfg = { detail: 1, tier: 'high', shadows: true };
  const st = { spans: 0, birds: 0, fowl: 0, fish: 0, rings: 0, hulls: 0, dirty: true, lastPos: new THREE.Vector3(1e9, 0, 0), lastYaw: 9 };
  const mk = (geo, mat, cap, name, color = false) => {
    const m = new THREE.InstancedMesh(geo, mat, cap);
    if (color) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.matrixAutoUpdate = false; m.name = name; group.add(m); return m;
  };
  const world = MatLib.get('mat.world');
  const birds = [mk(perchGeo(0), world, 520, 'd2.bird.song'), mk(perchGeo(1), world, 260, 'd2.bird.pigeon'), mk(perchGeo(2), world, 120, 'd2.bird.gull')];
  const ducks = mk(duckGeo(), world, 120, 'd2.duck'), swans = mk(swanGeo(), world, 24, 'd2.swan');
  const rippleMat = MatLib.get('mat.ripple'), blobMat = MatLib.get('mat.blob');
  const rings = mk(quadGeo(decalCell('ring')), rippleMat, 1500, 'd2.rings'); rings.renderOrder = 4;
  const fish = mk(quadGeo(decalCell('fish')), blobMat, 140, 'd2.fish'); fish.renderOrder = 3;
  const collar = mk(quadGeo(decalCell('foam')), blobMat, 160, 'd2.hullfoam'); collar.renderOrder = 4;
  const hullShade = mk(quadGeo(decalCell('blob')), blobMat, 160, 'd2.hullshade'); hullShade.renderOrder = 3;
  // kerb-joint weeds: lawn tufts (ground-cover material, wind in the shader)
  const weeds = mk(artGeometry(plantGeometry('veg.lawn').leaf), MatLib.get('mat.groundcover'), 900, 'd2.weeds', true);
  const WEED_T = [[0.62, 0.78, 0.5], [0.8, 0.86, 0.5], [0.95, 0.85, 0.52], [0.55, 0.7, 0.46]];
  // wires: one dynamic mesh (two crossed ribbons per segment), rebuilt with the lists
  const wireVerts = MAX_SPANS * 4 * SEGS * 8, wirePos = new Float32Array(wireVerts * 3), wireIdx = new Uint32Array(MAX_SPANS * 4 * SEGS * 24); // both windings: the blob program is single-sided
  for (let q = 0, v = 0, i = 0; q < MAX_SPANS * 4 * SEGS; q++, v += 8) for (const o of [0, 4]) { wireIdx[i++] = v + o; wireIdx[i++] = v + o + 1; wireIdx[i++] = v + o + 2; wireIdx[i++] = v + o; wireIdx[i++] = v + o + 2; wireIdx[i++] = v + o + 3; wireIdx[i++] = v + o; wireIdx[i++] = v + o + 2; wireIdx[i++] = v + o + 1; wireIdx[i++] = v + o; wireIdx[i++] = v + o + 3; wireIdx[i++] = v + o + 2; }
  const wireGeo = new THREE.BufferGeometry(); wireGeo.setAttribute('position', new THREE.BufferAttribute(wirePos, 3).setUsage(THREE.DynamicDrawUsage)); wireGeo.setIndex(new THREE.BufferAttribute(wireIdx, 1)); wireGeo.setDrawRange(0, 0);
  { const wc = decalCell('wire'), uv = new Float32Array(wireVerts * 2); for (let i = 0; i < wireVerts; i++) { uv[i * 2] = (wc[0] + wc[2]) / 2; uv[i * 2 + 1] = (wc[1] + wc[3]) / 2; } wireGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
  // one-instance InstancedMesh on the blob program (a plain Mesh would compile a second variant); the decal cell is solid dark grey
  const wire = new THREE.InstancedMesh(wireGeo, MatLib.get('mat.blob'), 1); wire.setMatrixAt(0, new THREE.Matrix4()); wire.count = 1; wire.frustumCulled = false; wire.matrixAutoUpdate = false; wire.name = 'd2.wires'; wire.visible = false; wire.renderOrder = 3; wire.castShadow = false; wire.receiveShadow = false; group.add(wire);

  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), sph = new THREE.Sphere();
  function fillM(a, o, x, y, z, yaw, sx, sy, sz) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    a[o] = c * sx; a[o + 1] = 0; a[o + 2] = s * sx; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = sy; a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = -s * sz; a[o + 9] = 0; a[o + 10] = c * sz; a[o + 11] = 0; a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
  }
  let nWireSpans = 0;
  // static lists (wires, perches, rings, hulls, fish anchors) are filtered by distance here; moving things are updated per frame below
  function rebuild(camera) {
    const D = World.data.decor && World.data.decor.detail2; if (!D) return;
    const T = TIERS[cfg.tier], cam = camera.position, detail = cfg.detail;
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
    const fwd = camera.getWorldDirection(new THREE.Vector3());
    // wires
    { const W = D.wires; let n = 0, q = 0;
      for (let i = 0; i < W.length && n < MAX_SPANS * 4; i += 6) {
        const mx = (W[i] + W[i + 3]) * 0.5, mz = (W[i + 2] + W[i + 5]) * 0.5, dx = mx - cam.x, dz = mz - cam.z, d2 = dx * dx + dz * dz;
        if (d2 > T.wire * T.wire) continue;
        sph.center.set(mx, (W[i + 1] + W[i + 4]) * 0.5, mz); sph.radius = 36; if (!frustum.intersectsSphere(sph)) continue;
        const ax = W[i], ay = W[i + 1], az = W[i + 2], bx = W[i + 3], by = W[i + 4], bz = W[i + 5], L = Math.hypot(bx - ax, bz - az), sag = 0.0125 * L, hw = 0.0065;
        const nx = -(bz - az) / L, nz = (bx - ax) / L; // horizontal normal of the span
        for (let k = 0; k < SEGS; k++) {
          const t0 = k / SEGS, t1 = (k + 1) / SEGS;
          const x0 = ax + (bx - ax) * t0, y0 = ay + (by - ay) * t0 - sag * 4 * t0 * (1 - t0), z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, y1 = ay + (by - ay) * t1 - sag * 4 * t1 * (1 - t1), z1 = az + (bz - az) * t1;
          const o = q * 24; // 8 verts
          // ribbon 1: vertical (offset along the horizontal normal), ribbon 2: horizontal (offset in y)
          wirePos[o] = x0 - nx * hw; wirePos[o + 1] = y0; wirePos[o + 2] = z0 - nz * hw; wirePos[o + 3] = x0 + nx * hw; wirePos[o + 4] = y0; wirePos[o + 5] = z0 + nz * hw;
          wirePos[o + 6] = x1 + nx * hw; wirePos[o + 7] = y1; wirePos[o + 8] = z1 + nz * hw; wirePos[o + 9] = x1 - nx * hw; wirePos[o + 10] = y1; wirePos[o + 11] = z1 - nz * hw;
          wirePos[o + 12] = x0; wirePos[o + 13] = y0 - hw; wirePos[o + 14] = z0; wirePos[o + 15] = x0; wirePos[o + 16] = y0 + hw; wirePos[o + 17] = z0;
          wirePos[o + 18] = x1; wirePos[o + 19] = y1 + hw; wirePos[o + 20] = z1; wirePos[o + 21] = x1; wirePos[o + 22] = y1 - hw; wirePos[o + 23] = z1;
          q++;
        }
        n++;
      }
      nWireSpans = n; wireGeo.setDrawRange(0, q * 24); wireGeo.attributes.position.needsUpdate = true; wire.visible = q > 0; st.spans = n / 4;
    }
    // perched birds
    { const P = D.perches; let nb = [0, 0, 0];
      for (let i = 0; i < P.length; i += 6) {
        const dx = P[i] - cam.x, dz = P[i + 2] - cam.z, d2 = dx * dx + dz * dz;
        if (d2 > T.bird * T.bird || d2 < 49) continue; // closer than 7 m they have flown off
        if (hash(i) >= detail * (d2 < T.bird * T.bird * 0.4 ? 1 : 0.5)) continue;
        if (d2 > 400 && dx * fwd.x + dz * fwd.z < -0.2 * Math.sqrt(d2)) continue;
        const k = P[i + 3] | 0, m = birds[k], c = nb[k]; if (c >= m.instanceMatrix.count) continue;
        fillM(m.instanceMatrix.array, c * 16, P[i], P[i + 1], P[i + 2], P[i + 4], 1, 1, 1);
        nb[k]++;
      }
      for (let k = 0; k < 3; k++) { const m = birds[k]; m.count = nb[k]; m.visible = nb[k] > 0; m.instanceMatrix.needsUpdate = true; }
      st.birds = nb[0] + nb[1] + nb[2];
    }
    // kerb weeds
    { const Wd = D.weeds; let n = 0;
      for (let i = 0; i < Wd.length && n < 880; i += 6) { const dx = Wd[i] - cam.x, dz = Wd[i + 2] - cam.z, d2 = dx * dx + dz * dz; if (d2 > T.weed * T.weed) continue; if (hash(i + 5) >= detail * (d2 < T.weed * T.weed * 0.35 ? 1 : 0.6)) continue;
        fillM(weeds.instanceMatrix.array, n * 16, Wd[i], Wd[i + 1], Wd[i + 2], Wd[i + 5], Wd[i + 3] * 0.6, Wd[i + 3] * 0.6, Wd[i + 3] * 0.6);
        const tt = WEED_T[Wd[i + 4] | 0], ca = weeds.instanceColor.array; ca[n * 3] = tt[0]; ca[n * 3 + 1] = tt[1]; ca[n * 3 + 2] = tt[2]; n++; }
      weeds.count = n; weeds.visible = n > 0; weeds.instanceMatrix.needsUpdate = true; weeds.instanceColor.needsUpdate = true; st.weeds = n;
    }
    // pile ripple rings
    { const R = D.rings; let n = 0;
      for (let i = 0; i < R.length && n < 1100; i += 4) { const dx = R[i] - cam.x, dz = R[i + 2] - cam.z; if (dx * dx + dz * dz > T.ring * T.ring) continue; fillM(rings.instanceMatrix.array, n * 16, R[i], R[i + 1], R[i + 2], hash(i) * 6.28, R[i + 3], 1, R[i + 3]); n++; }
      st.ringsStatic = n; st.ringsDirty = true;
    }
    // hull collars
    { const Hh = D.hullFoam; let n = 0;
      for (let i = 0; i < Hh.length && n < 160; i += 6) { const dx = Hh[i] - cam.x, dz = Hh[i + 1] - cam.z; if (dx * dx + dz * dz > T.hull * T.hull) continue;
        const W = Hh[i + 4], L = Hh[i + 3];
        fillM(collar.instanceMatrix.array, n * 16, Hh[i], Hh[i + 2] + 0.04, Hh[i + 1], Hh[i + 5], W * 1.35 + 0.8, 1, L * 1.12 + 0.8);
        fillM(hullShade.instanceMatrix.array, n * 16, Hh[i], Hh[i + 2] + 0.03, Hh[i + 1], Hh[i + 5], W * 1.9 + 1.0, 1, L * 1.3 + 1.0); n++; }
      collar.count = hullShade.count = n; collar.visible = hullShade.visible = n > 0; collar.instanceMatrix.needsUpdate = hullShade.instanceMatrix.needsUpdate = true; st.hulls = n;
    }
  }
  // waterfowl and fish move every frame: positions from the anchors, cheap trigonometry for the few that are close
  const tmpCam = new THREE.Vector3();
  function animate(camera, time) {
    const D = World.data.decor && World.data.decor.detail2; if (!D) return;
    const T = TIERS[cfg.tier], cam = camera.position, F = D.fowl;
    let nd = 0, ns = 0, nr = st.ringsStatic || 0;
    const rm = rings.instanceMatrix.array;
    for (let i = 0; i < F.length; i += 9) {
      const dx = F[i] - cam.x, dz = F[i + 1] - cam.z; if (dx * dx + dz * dz > T.fowl * T.fowl) continue;
      const swan = F[i + 3] > 0.5, n = F[i + 7] | 0, R = F[i + 4], w = F[i + 6] / Math.max(4, R), ph = F[i + 5];
      for (let k = 0; k < n; k++) {
        const th = ph + time * w + k * (swan ? 0.1 : 0.16), bx = Math.cos(th) * R, bz = Math.sin(th) * R * 0.7, tx = -Math.sin(th) * R, tz = Math.cos(th) * R * 0.7;
        const yaw = Math.atan2(-tx, -tz) + (w < 0 ? Math.PI : 0), x = F[i] + bx + Math.sin(time * 0.7 + k * 2.1) * 0.4, z = F[i + 1] + bz + Math.cos(time * 0.6 + k) * 0.4;
        const bob = Math.sin(time * 1.6 + k * 1.3 + ph) * 0.012;
        if (swan) { if (ns < 24) { fillM(swans.instanceMatrix.array, ns * 16, x, F[i + 2] - 0.02 + bob, z, yaw - Math.PI / 2 * 0 + Math.PI / 2 * 0, 1.2, 1.2, 1.2); ns++; } }
        else if (nd < 120) {
          fillM(ducks.instanceMatrix.array, nd * 16, x, F[i + 2] - 0.025 + bob, z, yaw, 1, 1, 1);
          nd++;
        }
        if (nr < 1450) { fillM(rm, nr * 16, x, F[i + 2] + 0.035, z, yaw, swan ? 0.9 : 0.5, 1, swan ? 0.9 : 0.5); nr++; }
      }
    }
    ducks.count = nd; ducks.visible = nd > 0; ducks.instanceMatrix.needsUpdate = true;
    swans.count = ns; swans.visible = ns > 0; swans.instanceMatrix.needsUpdate = true;
    rings.count = nr; rings.visible = nr > 0; rings.instanceMatrix.needsUpdate = true;
    st.fowl = nd + ns;
    // fish shadows
    let nf = 0;
    if (T.fish > 0) {
      const Fi = D.fish, fm = fish.instanceMatrix.array, lim = Math.round(T.fish * cfg.detail);
      for (let i = 0; i < Fi.length && nf < lim; i += 7) {
        const dx = Fi[i] - cam.x, dz = Fi[i + 1] - cam.z; if (dx * dx + dz * dz > 55 * 55) continue;
        const R = Fi[i + 3], th = Fi[i + 4] + time * Fi[i + 5] / Math.max(1.5, R), x = Fi[i] + Math.cos(th) * R, z = Fi[i + 1] + Math.sin(th) * R * 0.8, tx = -Math.sin(th), tz = Math.cos(th) * 0.8;
        fillM(fm, nf * 16, x, Fi[i + 2] + 0.045, z, Math.atan2(tz, -tx) + Math.PI, Fi[i + 6] * 0.5, 1, Fi[i + 6] * 0.5); nf++;
      }
    }
    fish.count = nf; fish.visible = nf > 0; fish.instanceMatrix.needsUpdate = true; st.fish = nf;
    void tmpCam;
  }
  return {
    group, state: st,
    configure(q) {
      cfg.detail = q.detail == null ? 1 : q.detail; cfg.shadows = q.shadows !== false;
      cfg.tier = cfg.detail < 0.55 ? 'low' : cfg.detail < 0.85 ? 'medium' : cfg.detail < 1.1 ? 'high' : 'ultra';
      st.dirty = true;
    },
    update(camera, time) {
      const p = camera.position, yaw = Math.atan2(camera.matrixWorld.elements[8], camera.matrixWorld.elements[10]);
      let dy = Math.abs(yaw - st.lastYaw); if (dy > Math.PI) dy = 2 * Math.PI - dy;
      if (st.dirty || st.lastPos.distanceToSquared(p) > 144 || dy > 0.25) { st.dirty = false; st.lastPos.copy(p); st.lastYaw = yaw; rebuild(camera); }
      animate(camera, time);
    },
    /** one instance of every mesh drawable so the programs compile before play (renderer.compile) */
    prewarm(on) {
      const all = [...birds, ducks, swans, rings, fish, collar, hullShade, weeds];
      for (const m of all) { m.visible = on; m.count = on ? 1 : 0; }
      wire.visible = on; wireGeo.setDrawRange(0, on ? 24 : 0);
      if (!on) st.dirty = true;
    },
    forceRebuild() { st.dirty = true; },
  };
}
