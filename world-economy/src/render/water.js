// Water bodies (Annex A 10, blockout): global sea/river plane, lake raster, ponds and creek ribbons. One draw call each.
import * as THREE from 'three';
import { World } from '../world/query.js';
import { waterBodyAt, LAKE, PONDS, CREEKS } from '../world/layout/water.js';
import { MatLib } from './materials/matlib.js';
import { MemTracker } from './perf.js';

function toMesh(pos, idx, mat, name) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  MemTracker.addGeometry(g);
  const m = new THREE.Mesh(g, mat);
  m.name = name; m.renderOrder = 2; m.matrixAutoUpdate = false;
  return m;
}
export function buildWater(scene) {
  const group = new THREE.Group(); group.name = 'water';
  // sea (also the river: both sit at y = 0)
  const S = 7000;
  const sea = toMesh(new Float32Array([-S, 0, -S, S, 0, -S, S, 0, S, -S, 0, S]), new Uint16Array([0, 2, 1, 0, 3, 2]), MatLib.get('mat.blockout_water'), 'water.ocean');
  // normals from computeVertexNormals may point down depending on winding: force up
  const nrm = sea.geometry.attributes.normal; for (let i = 0; i < 4; i++) { nrm.array[i * 3] = 0; nrm.array[i * 3 + 1] = 1; nrm.array[i * 3 + 2] = 0; }
  group.add(sea);
  // lake: 8 m raster over the lake bounding box, cells with any water corner
  {
    const x0 = LAKE.cx - LAKE.a * 1.15, x1 = LAKE.cx + LAKE.a * 1.15, z0 = LAKE.cz - LAKE.b * 1.15, z1 = LAKE.cz + LAKE.b * 1.15;
    const step = 8, nx = Math.ceil((x1 - x0) / step), nz = Math.ceil((z1 - z0) / step);
    const pos = [], idx = [];
    const water = new Uint8Array((nx + 1) * (nz + 1));
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const wb = waterBodyAt(x0 + i * step, z0 + j * step); water[j * (nx + 1) + i] = wb && wb.body === 'lake' ? 1 : 0; }
    const vid = new Int32Array((nx + 1) * (nz + 1)).fill(-1);
    const getV = (i, j) => { const k = j * (nx + 1) + i; if (vid[k] < 0) { vid[k] = pos.length / 3; pos.push(x0 + i * step, LAKE.level, z0 + j * step); } return vid[k]; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * (nx + 1) + i;
      if (water[k] || water[k + 1] || water[k + nx + 1] || water[k + nx + 2]) { const a = getV(i, j), b = getV(i + 1, j), c = getV(i, j + 1), d = getV(i + 1, j + 1); idx.push(a, c, b, b, c, d); }
    }
    const m = toMesh(new Float32Array(pos), new Uint32Array(idx), MatLib.get('mat.blockout_lake'), 'water.lake');
    const nn = m.geometry.attributes.normal; for (let i = 0; i < nn.count; i++) { nn.array[i * 3] = 0; nn.array[i * 3 + 1] = 1; nn.array[i * 3 + 2] = 0; }
    group.add(m);
  }
  // ponds
  for (const id in PONDS) {
    const p = PONDS[id];
    const pos = [p.cx, p.level, p.cz], idx = [];
    const n = 28;
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; pos.push(p.cx + Math.cos(a) * (p.r + 2), p.level, p.cz + Math.sin(a) * (p.r + 2)); }
    for (let i = 1; i <= n; i++) idx.push(0, i + 1, i);
    const m = toMesh(new Float32Array(pos), new Uint16Array(idx), MatLib.get('mat.blockout_lake'), id);
    const nn = m.geometry.attributes.normal; for (let i = 0; i < nn.count; i++) { nn.array[i * 3] = 0; nn.array[i * 3 + 1] = 1; nn.array[i * 3 + 2] = 0; }
    group.add(m);
  }
  // creeks (decorative ribbons that follow the terrain)
  for (const id in CREEKS) {
    const c = CREEKS[id];
    const pts = [];
    for (let k = 0; k < c.pts.length - 1; k++) {
      const [ax, az] = c.pts[k], [bx, bz] = c.pts[k + 1];
      const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 12));
      for (let q = 0; q < n; q++) pts.push([ax + (bx - ax) * q / n, az + (bz - az) * q / n]);
    }
    pts.push(c.pts[c.pts.length - 1]);
    const pos = [], idx = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l * c.width / 2, nz = dx / l * c.width / 2;
      const y = World.heightAt(pts[k][0], pts[k][1]) + 0.12;
      pos.push(pts[k][0] + nx, y, pts[k][1] + nz, pts[k][0] - nx, y, pts[k][1] - nz);
      if (k > 0) { const i = (k - 1) * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
    }
    const m = toMesh(new Float32Array(pos), new Uint16Array(idx), MatLib.get('mat.blockout_lake'), id);
    const nn = m.geometry.attributes.normal; for (let i = 0; i < nn.count; i++) { nn.array[i * 3] = 0; nn.array[i * 3 + 1] = 1; nn.array[i * 3 + 2] = 0; }
    group.add(m);
  }
  scene.add(group);
  return group;
}
