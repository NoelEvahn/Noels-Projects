// Love-research lab. Back wall at z=-6; scientists stand in front (z≈0..2). Returns {group, update(t,{level,snapK}), anchors}.
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, rng, canvasTex, C } from '../util.js';
import { lovometer, labBench, flask, bubbles, testTubeRack, ratCage, wallMonitor, heartOGram, pinkTank, wallChart } from '../props/lab.js';
import { windowFrame } from '../props/home.js';
import { makeAnimal, APOSES, AFACES, ANIMALS } from '../animal.js';

export function buildLab({ seed = 2 } = {}) {
  const g = new THREE.Group();
  const tile = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#e9f3f6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c4d6dd'; c.lineWidth = 3; c.strokeRect(0, 0, w, h); }, { repeat: [10, 5] });
  add(g, box(22, 7, 0.3), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.45 }), [0, 3.5, -6]);
  for (const s of [-1, 1]) add(g, box(0.3, 7, 16), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.45 }), [s * 11, 3.5, 2]);
  const floorT = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#9fb4c0'; c.fillRect(0, 0, w, h); c.fillStyle = '#b9ccd6'; c.fillRect(0, 0, w / 2, h / 2); c.fillRect(w / 2, h / 2, w / 2, h / 2); }, { repeat: [14, 10] });
  add(g, box(24, 0.2, 20), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.3 }), [0, -0.1, 2]);
  add(g, box(24, 0.3, 20), mat(0xdfe9ee), [0, 7.1, 2]);
  for (let i = 0; i < 4; i++) add(g, box(2.4, 0.08, 0.6), glow(0xfff6e0, 1.2), [(i - 1.5) * 5, 6.9, 0]);
  // windows with a pink city glow outside
  for (const x of [-7.5, 7.5]) { const w = windowFrame(2.6, 2.4, { glass: 0xffb3d1 }); w.position.set(x, 4.2, -5.8); g.add(w); }
  // central Lovometer on the wall + wall monitor + chart
  const lm = lovometer(1.5); lm.position.set(0, 3.6, -5.7); g.add(lm);
  const mon = wallMonitor(2.6, 1.5); mon.position.set(-5.5, 4.0, -5.8); g.add(mon);
  const chart = wallChart('LOVE × 2', ['EVERY 2 SECONDS', '1 · 2 · 4 · 8 · ???']); chart.position.set(5.4, 4.0, -5.8); g.add(chart);
  // benches with glassware
  const b1 = labBench(3.6); b1.position.set(-5.2, 0, -4.6); g.add(b1); const b2 = labBench(3.6); b2.position.set(5.2, 0, -4.6); g.add(b2);
  const b3 = labBench(5); b3.position.set(0, 0, -2.2); b3.scale.set(1, 1, 0.85); g.add(b3);
  const flasks = [[-6, -4.6, 0xff5c9a], [-5.2, -4.6, 0x7bff9a], [-4.4, -4.6, 0xffd23f], [4.6, -4.6, 0xb07aff], [5.4, -4.6, 0x4aa0e0]].map(([x, z, c]) => { const f = flask(c); f.position.set(x, 0.96, z); g.add(f); return f; });
  const bub = bubbles(16); bub.position.set(-5.2, 1.2, -4.6); g.add(bub);
  const rack = testTubeRack(6); rack.position.set(0, 0.96, -2.2); g.add(rack);
  const cage = ratCage(); cage.position.set(5.4, 0.96, -4.4); g.add(cage);
  const hg = heartOGram(); hg.position.set(-1.5, 0.96, -2.2); g.add(hg);
  const tank = pinkTank(2.6, 0.5); tank.position.set(-9.4, 0, -3); g.add(tank); const tank2 = pinkTank(2.2, 0.45); tank2.position.set(9.4, 0, -3); g.add(tank2);
  const rat = makeAnimal('rat', ANIMALS.rat); rat.pose(APOSES.stand(0)); rat.face({}); rat.root.position.set(5.65, 0.99, -4.4); rat.root.rotation.y = -0.8; rat.root.scale.setScalar(0.7); g.add(rat.root);
  // cabinet
  add(g, box(2.4, 2.2, 0.7), mat(0xc4ccd6), [-9.4, 1.1, -5.4]); add(g, box(2.4, 2.2, 0.7), mat(0xc4ccd6), [9.4, 1.1, -5.4]);
  const update = (t, { level = 0, snapK = 0 } = {}) => {
    lm.setLevel(Math.min(level, 1.12), level > 1 ? Math.sin(t * 40) * 0.03 : Math.sin(t * 6) * 0.01);
    if (level > 1.1) lm.snap(snapK); else lm.snap(0);
    bub.update(t); hg.update(t); cage.wheel.rotation.z = t * 8;
  };
  update(0);
  return { group: g, update, anchors: { lovometer: lm, rat, benchFront: b3.position.clone() } };
}
