// Family garden BBQ. House back wall at z=-6 (faces +Z); lawn toward +Z; side fences at x=±7.5.
// buildGarden({wrecked:0..1}) -> {group, update(t), anchors}
import * as THREE from 'three';
import { mat, add, sph, box, cyl, cap, rng, canvasTex, heartGeo, C } from '../util.js';
import { makeHeart } from '../fx/hearts.js';
import { tree, bush, flowerPatch, fence, grill, burger, picnicTable, lawnChair, pool, bunting, gazebo, houseBack, trashCan } from '../props/home.js';

export function buildGarden({ wrecked = 0, seed = 4 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#79c85a' : '#6fbf52'; c.fillRect(0, i * h / 8, w, h / 8); } }, { repeat: [3, 3] }), roughness: 0.95 }));
  lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; g.add(lawn);
  const house = houseBack(12, 4.6); house.position.set(0, 0, -6); g.add(house);
  // patio slabs
  add(g, box(10, 0.05, 2.4), mat(0xd9d2c4, { rough: 0.9 }), [0, 0.025, -4.6]);
  // side fences + beyond-fence neighbour roofs
  const fl = fence(14, { h: 1.15 }); fl.rotation.y = Math.PI / 2; fl.position.set(-7.5, 0, 0); g.add(fl);
  const fr = fence(14, { h: 1.15 }); fr.rotation.y = -Math.PI / 2; fr.position.set(7.5, 0, 0); g.add(fr);
  // hedge along far back sides
  for (let i = 0; i < 9; i++) { const b = bush(0x3f9f46, 1.8); b.position.set(-9 + i * 2.25, 0, -9.6 + (i % 2) * 0.2); g.add(b); }
  // trees
  [[-8.8, -4], [9, -3], [-9.5, 5], [9.5, 6]].forEach(([x, z], i) => { const t = tree(r, { h: 3.4 + i * 0.2, s: 1.6 }); t.position.set(x, 0, z); g.add(t); });
  // flowers + beds
  const fp = flowerPatch(rng(2), 22, 3.2); fp.position.set(-3.5, 0, -4.4); g.add(fp); const fp2 = flowerPatch(rng(3), 22, 3.2); fp2.position.set(3.8, 0, -4.4); g.add(fp2);
  // grill + burgers
  const gr = grill(); gr.position.set(-3.2, 0, -1.8); gr.rotation.y = 0.5; g.add(gr);
  const burgers = []; for (let i = 0; i < 4; i++) { const b = burger(); b.position.set(-3.2 + (i % 2 - 0.5) * 0.25, 0.93, -1.8 + (i > 1 ? 0.2 : -0.1)); b.scale.setScalar(1.1); g.add(b); burgers.push(b); }
  // picnic table + chairs
  const tb = picnicTable(); tb.position.set(3.0, 0, -1.2); tb.rotation.y = -0.2; g.add(tb);
  const ch = [[-1.0, 1.0, 0.8], [-0.2, 1.9, 3.0], [-4.8, 1.6, 0.4]].map(([x, z, ry], i) => { const c = lawnChair([0x2bb7b0, 0xff8a2b, 0xff5c8a][i]); c.position.set(x + 0.5, 0, z - 1.2); c.rotation.y = ry; g.add(c); return c; });
  // pool, gazebo, bunting, bin
  const pl = pool(1.0); pl.position.set(-4.6, 0, 2.2); g.add(pl);
  const gz = gazebo(3.2, 2.5); gz.position.set(5.2, 0, -4.2); g.add(gz);
  const b1 = bunting([-6, 3.6, -5.6], [6, 3.6, -5.6], 18); g.add(b1);
  const b2 = bunting([-7.3, 2.2, 2], [-7.3, 2.2, -5.4], 14); b2.rotation.y = 0; g.add(b2);
  const tc = trashCan(); tc.position.set(6.4, 0, 1.2); g.add(tc);
  // wreck layer (wrecked>0): hearts everywhere, toppled fence + table, popped pool, stuck balloons
  const wreck = new THREE.Group(); g.add(wreck);
  if (wrecked > 0) {
    const rr = rng(9), hg = new THREE.InstancedMesh(heartGeo(0.25, 0.06), new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: 0xff3f7f, emissiveIntensity: 0.35 }), 220), d = new THREE.Object3D(), cc = new THREE.Color();
    for (let i = 0; i < 220; i++) { d.position.set(rr.range(-6.5, 6.5), 0.05 + (i % 5) * 0.04, rr.range(-4.5, 6)); d.rotation.set(-Math.PI / 2 + rr.range(-0.4, 0.4), 0, rr() * 6.28); d.scale.setScalar(rr.range(0.18, 0.42)); d.updateMatrix(); hg.setMatrixAt(i, d.matrix); cc.set(rr.pick([0xff3f7f, 0xff8fb8, 0xffc2d6, 0xffffff, 0xff5c5c])); hg.setColorAt(i, cc); }
    wreck.add(hg);
    tb.rotation.z = 0.35; tb.position.y = 0.35; fl.rotation.z = 0.5; fl.position.y = 0.2; gz.rotation.z = -0.12; pl.scale.set(1.4, 0.6, 1.4);
    for (let i = 0; i < 9; i++) { const b = new THREE.Group(); const hh = makeHeart([0xff3f7f, 0xff8fb8, 0xffd23f][i % 3], 0.6, 0.3); hh.position.y = 0.0; b.add(hh); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.6, 4), mat(0xf0f0f0)); st.position.y = -0.85; b.add(st); b.position.set(rr.range(-7, 7), rr.range(4.8, 6.5), rr.range(-8, 2)); wreck.add(b); }
  }
  const smoke = []; const sm = new THREE.Group(); sm.position.copy(gr.position); g.add(sm);
  for (let i = 0; i < 14; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: wrecked ? 0x333333 : 0xdddddd, transparent: true, opacity: 0.5, roughness: 1, depthWrite: false })); p.castShadow = false; sm.add(p); smoke.push(p); }
  const update = (t) => {
    smoke.forEach((p, i) => { const k = ((t * 0.5 + i / smoke.length) % 1); p.position.set(Math.sin(i * 2 + t) * 0.15 * k * 3, 1.0 + k * (wrecked ? 3 : 2.4), Math.cos(i * 3) * 0.1); p.scale.setScalar(0.5 + k * (wrecked ? 3 : 2)); p.material.opacity = (1 - k) * (wrecked ? 0.65 : 0.4); });
  };
  update(0);
  const anchors = { grill: gr.position.clone(), table: tb.position.clone(), pool: pl.position.clone(), gazebo: gz.position.clone(), fenceTopL: new THREE.Vector3(-7.5, 1.2, 1.5), fenceTopR: new THREE.Vector3(7.5, 1.2, -1.5), door: new THREE.Vector3(0, 0, -5.6), burgers, chairs: ch };
  return { group: g, update, anchors, house };
}
