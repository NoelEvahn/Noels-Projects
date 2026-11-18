// Talent-show theatre. Stage at z≈-8 facing +Z (audience seats in front, rising toward +Z... camera usually at z>0 looking -Z at stage).
// buildTheatre() -> {group, update(t,{cheer}), anchors}
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, rng, textBoard, C } from '../util.js';
import { curtain, velvetStage, marquee, seatRows, audience, judgesTable, spotlightBeam, scoreboard, confettiCannon } from '../props/stage.js';
import { makeCharacter, PRESETS, POSES, FACES } from '../character.js';

export function buildTheatre({ rows = 7, cols = 15, seed = 3, withJudges = true, freeSeats = [7] } = {}) {
  const g = new THREE.Group();
  const floor = add(g, box(60, 0.2, 60), mat(0x3a1420, { rough: 0.9 }), [0, -0.1, 0]);
  // hall walls with warm panels + balcony hint
  add(g, box(40, 14, 0.4), mat(0x5a1626, { rough: 0.8 }), [0, 7, -14]);
  for (const s of [-1, 1]) { add(g, box(0.4, 14, 40), mat(0x4a1020, { rough: 0.85 }), [s * 16, 7, 6]); for (let i = 0; i < 5; i++) { add(g, box(0.15, 5, 1.4), mat(C.gold, { metal: 0.6, rough: 0.4 }), [s * 15.7, 5, -6 + i * 5]); } }
  add(g, box(40, 0.4, 40), mat(0x2a0e16, { rough: 0.9 }), [0, 14, 5]);                                                 // ceiling
  for (let i = 0; i < 3; i++) { const ch = new THREE.Group(); add(ch, cyl(0.04, 0.04, 2.2, 6), mat(0x888888), [0, 1.1, 0]); add(ch, sph(0.55, 16, 12), glow(0xffe9a8, 0.9), [0, -0.1, 0]); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; add(ch, sph(0.12, 8, 6), glow(0xfff0c0, 1.2), [Math.cos(a) * 0.8, -0.35, Math.sin(a) * 0.8]); } ch.position.set((i - 1) * 6, 12, -1); g.add(ch); }
  // stage
  const stage = velvetStage(13, 6); stage.position.set(0, 0, -9); g.add(stage);
  const back = add(g, box(13.5, 8, 0.3), mat(0x2a1038, { rough: 0.8 }), [0, 4.5, -11.9]);
  for (let i = 0; i < 40; i++) { const r = rng(i + seed); add(g, sph(0.08, 6, 5), glow(0xfff0b0, 1.5), [r.range(-6, 6), r.range(2, 8), -11.7]); }
  for (const s of [-1, 1]) { const c = curtain(3.2, 8.5, 0xa3162b, 8); c.position.set(s * 5.4, 0.5, -11.2); g.add(c); const c2 = curtain(1.6, 8.5, 0x7a1020, 5); c2.position.set(s * 3.6, 0.5, -11.5); g.add(c2); }
  const topC = add(g, box(14, 1.2, 0.8), mat(0xa3162b, { rough: 0.7 }), [0, 8.6, -11]); const mq = marquee(8, 16); mq.position.set(0, 7.6, -10.6); g.add(mq);
  const bannerTex = textBoard(7, 1.3, [{ text: 'BIG BREAK SHOW', size: 0.14, color: '#ffd23f', y: 0.52, font: 'Anton, Inter, sans-serif', weight: 400 }], { bg: '#4a0e1c', border: '#ffd23f' }); bannerTex.position.set(0, 8.6, -10.55); g.add(bannerTex);
  // raked house: front row just behind the judges, rows climbing away from the stage (+Z), three blocks split by two aisles,
  // everyone seated facing the stage. seats.seatPos is seat-local; anchors.seatWorld(i) gives world points.
  const seats = seatRows(rows, cols, { gap: 0.82, rowGap: 1.05, rise: 0.34 }); seats.position.set(0, 0, 3.0); g.add(seats);
  const aud = audience(seats.seatPos, { seed, fill: 0.93, skip: freeSeats }); aud.position.copy(seats.position); g.add(aud);   // freeSeats stay empty (Gerald's front-row seat)
  // back wall of the house with the control booth window, so wide shots from the stage end on a finished wall
  const backZ = 3.0 + rows * 1.05 + 0.6, backY = rows * 0.34;
  add(g, box(32, 14, 0.4), mat(0x4a1020, { rough: 0.85 }), [0, 7, backZ]);
  add(g, box(4, 1.2, 0.1), mat(0x1a2a3a, { rough: 0.15, metal: 0.3 }), [0, backY + 3.0, backZ - 0.22]);
  add(g, box(32, backY + 0.01, 1.2), mat(0x2a0e16, { rough: 0.9 }), [0, backY / 2, backZ - 0.8]);
  // judges' table front-left of stage, in front of the audience
  const jt = judgesTable(6.5); jt.position.set(0, 0, 0.5); g.add(jt);
  const judges = [];
  if (withJudges) ['judgeA', 'judgeB', 'judgeC', 'judgeD'].forEach((n, i) => { const j = makeCharacter(PRESETS[n]); j.pose(POSES.sit(0, 0.5)); j.face(FACES.smug); j.plant(); j.root.position.set(-2.4 + i * 1.6, 0.0, 1.15); j.root.rotation.y = Math.PI; judges.push(j); g.add(j.root); });
  // gold proscenium arch framing the stage
  const gold = mat(C.gold, { metal: 0.75, rough: 0.35 });
  for (const sx of [-1, 1]) { add(g, box(0.9, 10.2, 0.9), mat(0x6a1a28, { rough: 0.7 }), [sx * 7.3, 5.1, -10.6]); add(g, box(1.05, 10.2, 0.12), gold, [sx * 7.3, 5.1, -10.1]); add(g, box(1.3, 0.5, 1.1), gold, [sx * 7.3, 0.25, -10.6]); }
  add(g, box(15.6, 1.1, 0.9), mat(0x6a1a28, { rough: 0.7 }), [0, 10.0, -10.6]); add(g, box(15.6, 0.14, 0.12), gold, [0, 9.45, -10.1]); add(g, box(15.6, 0.14, 0.12), gold, [0, 10.55, -10.1]);
  // stage-lip footlights
  for (let i = 0; i < 13; i++) add(g, sph(0.09, 8, 6), glow(0xffe0a0, 1.6), [-6 + i, 0.6, -6.05]);
  // side balcony boxes with gold rails, wall sconces, exit signs
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 2; k++) { const z = -3 + k * 5.5; add(g, box(2.2, 0.9, 3.6), mat(0x6a1a28, { rough: 0.7 }), [sx * 14.7, 5.2, z]); add(g, box(0.1, 0.1, 3.6), gold, [sx * 13.6, 5.7, z]); add(g, box(2.2, 0.2, 3.6), gold, [sx * 14.7, 4.7, z]); }
    for (let k = 0; k < 4; k++) { const z = -6 + k * 5; add(g, box(0.1, 0.5, 0.3), gold, [sx * 15.75, 3.2, z]); add(g, sph(0.16, 10, 8), glow(0xffd88a, 1.5), [sx * 15.55, 3.55, z]); }
    const ex = textBoard(1.0, 0.36, [{ text: 'EXIT', size: 0.42, color: '#ffffff', y: 0.55, weight: 900 }], { bg: '#1f9e4a', border: null, radius: 6 }); ex.position.set(sx * 15.75, 3.0, 9); ex.rotation.y = -sx * Math.PI / 2; g.add(ex);
  }
  // spotlights
  const sp = []; for (const x of [-3, 0, 3]) { const b = spotlightBeam(0xfff0c8, 11, 1.7); b.position.set(x, 0.5, -9); b.rotation.set(0.0, 0, 0); g.add(b); sp.push(b); }
  const update = (t, { cheer = 0 } = {}) => { aud.update(t, cheer); sp.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.8 + i) * 0.12; b.rotation.x = Math.cos(t * 0.6 + i * 2) * 0.08; }); judges.forEach((j, i) => j.pose({ ...POSES.sit(t, 0.5), hy: Math.sin(t * 0.7 + i) * 0.1, plant: true })); };
  update(0);
  return { group: g, update, anchors: { stageCentre: new THREE.Vector3(0, 0.52, -9), judges, audience: aud, seats, seatWorld: (i) => { const p = seats.seatPos[i]; return [p[0] + seats.position.x, p[1] + seats.position.y, p[2] + seats.position.z]; } }, aud };
}
