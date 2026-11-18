// Talent-show theatre. Stage at z≈-8 facing +Z (audience seats in front, rising toward +Z... camera usually at z>0 looking -Z at stage).
// buildTheatre() -> {group, update(t,{cheer}), anchors}
import * as THREE from 'three';
import { mat, glow, add, sph, box, cyl, rng, textBoard, C } from '../util.js';
import { curtain, velvetStage, marquee, seatRows, audience, judgesTable, spotlightBeam, scoreboard, confettiCannon } from '../props/stage.js';
import { makeCharacter, PRESETS, POSES, FACES } from '../character.js';

export function buildTheatre({ rows = 7, cols = 15, seed = 3, withJudges = true } = {}) {
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
  // seats + audience (tiered rising away from stage; front row near z=2, rising toward +z)
  const seats = seatRows(rows, cols, { gap: 0.95, rowGap: -1.15, rise: 0.3 }); seats.position.set(0, 0, 4); seats.rotation.y = 0; g.add(seats);
  const aud = audience(seats.seatPos, { seed }); aud.position.copy(seats.position); g.add(aud);
  // judges' table front-left of stage, in front of the audience
  const jt = judgesTable(6.5); jt.position.set(0, 0, 0.5); g.add(jt);
  const judges = [];
  if (withJudges) ['judgeA', 'judgeB', 'judgeC', 'judgeD'].forEach((n, i) => { const j = makeCharacter(PRESETS[n]); j.pose(POSES.sit(0, 0.5)); j.face(FACES.smug); j.plant(); j.root.position.set(-2.4 + i * 1.6, 0.0, 1.15); j.root.rotation.y = Math.PI; judges.push(j); g.add(j.root); });
  // spotlights
  const sp = []; for (const x of [-3, 0, 3]) { const b = spotlightBeam(0xfff0c8, 11, 1.7); b.position.set(x, 0.5, -9); b.rotation.set(0.0, 0, 0); g.add(b); sp.push(b); }
  const update = (t, { cheer = 0 } = {}) => { aud.update(t, cheer); sp.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.8 + i) * 0.12; b.rotation.x = Math.cos(t * 0.6 + i * 2) * 0.08; }); judges.forEach((j, i) => j.pose({ ...POSES.sit(t, 0.5), hy: Math.sin(t * 0.7 + i) * 0.1, plant: true })); };
  update(0);
  return { group: g, update, anchors: { stageCentre: new THREE.Vector3(0, 0.52, -9), judges, audience: aud, seats }, aud };
}
