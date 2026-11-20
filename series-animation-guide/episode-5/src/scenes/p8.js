// P8 · HOME (story 82.8-95.2): he falls through the roof hole (colour floods back), the ball bounces to rest on the coffee table,
// mum (83.6) + the whole family (84.4); he dusts his shoulder, the kid looks at the ball (faint swirl), Gerald on the table;
// close, one beat of silence, "la peace." at 88.0; a wide on the family (no Gerald push: user note #18); freeze + title card; the ball falls out of frame (loop).
import { THREE, makeHero, makePerson, makeGerald, P, F, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, laPeace, puffs } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { buildLivingRoom, HOLE } from '../../../assets/library/sets/livingroom.js';
import { universeBall, silhouette } from '../../../assets/library/fx/dunk.js';

const TABLE = [1.45, 0, 0.55];
export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#6fbfff', '#d8f0ff'], ground: null, hemiI: 1.0, keyI: 2.2, keyPos: [3, 9, 6], fillI: 0.75, shadow: { extent: 7 } });
    const scene = stage.scene;
    const room = buildLivingRoom({ h: 3.2 }); scene.add(room.group); room.anchors.table.position.set(...TABLE); room.setHole(1);
    // a shaft of sunlight through the hole
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 3.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); shaft.position.set(HOLE.x, 1.6, HOLE.z); scene.add(shaft);
    const hero = makeHero(scene); const sil = silhouette(hero.root);
    const mum = makePerson(scene, 'mum'), dad = makePerson(scene, 'dad'), kid = makePerson(scene, 'kid'), grandma = makePerson(scene, 'grandma');
    const cat = makeGerald(scene);
    const ball = universeBall(0.12, { light: 1.2 }); scene.add(ball);
    const dust = puffs(scene, { n: 30, color: 0xf2ece0, seed: 15, size: 0.07, spread: 1.4, up: 0.5, grav: 2.0 });
    return { stage, scene, room, hero, sil, mum, dad, kid, grandma, cat, ball, dust, shaft };
  },
  frame(t, S, ctx) {
    const { hero, ball, cat, room } = S, out = { voiceY: {}, roastY: 1580 };
    const seatY = room.anchors.seatY, topY = room.anchors.tableY;
    const T = t >= 91.6 ? 89.4 : t;   // freeze on the la peace pose for the title card
    // ---- hero: falls through the hole (82.8-83.3), superhero landing, stands, dusts his shoulder, la peace 88.0
    let hy = 0, pose = POSES.idle(T), face = FACES.deadpan, silK = 0;
    if (T < 83.3) { const a = T - 82.8; hy = Math.max(0, 6.7 - 0.5 * 37 * (a + 0.1) * (a + 0.1)); pose = { ...P.launch(0.6), lLk: 0.3, lRk: 0.2, aLs: 2.0, aRs: 2.0 }; silK = 1 - smooth(seg(T, 82.8, 83.6)) ; }
    else if (T < 84.2) { const land = 1 - smooth(seg(T, 83.7, 84.2)); pose = { ...P.crouch(land), lLf: 1.5 * land, lLk: 2.0 * land, lRf: -0.2 * land, lRk: 1.9 * land, aRf: 1.3 * land, aRs: 0.1, hR: 'fist', bob: -0.42 * land, lean: 0.45 * land, hx: -0.2 * land }; silK = 1 - smooth(seg(T, 82.8, 83.6)); face = FACES.smug; }
    else if (T < 85.2) { pose = POSES.idle(T); face = FACES.smug; }
    else if (T < 87.6) { const d = Math.sin(seg(T, 85.6, 87.2) * Math.PI * 3) * (T > 85.6 && T < 87.2 ? 1 : 0); pose = { ...POSES.dust(T), aRf: 1.0 + 0.15 * d, aRe: 2.1 - 0.1 * d, hz: 0.12 }; face = { ...FACES.smug, lid: 0.35 }; }
    else { pose = T >= 87.85 ? POSES.laPeace(T) : POSES.idle(T); face = T >= 87.85 ? { ...FACES.mew, open: ctx.mouth('hero_final', T) } : FACES.deadpan; }
    hero.root.position.set(HOLE.x, hy, HOLE.z); hero.root.rotation.y = 0.12; hero.pose(pose); hero.face(face);
    // ---- the ball: falls after him (83.3), bounces 83.7 / 84.0, hops onto the table (84.6); kid lifts it 86.0-87.0; Gerald nudges it off at 90.4
    let bp;
    const tableP = new THREE.Vector3(TABLE[0] - 0.2, topY + 0.12, TABLE[2]);
    if (T < 83.3) bp = new THREE.Vector3(HOLE.x + 0.3, 6.5, HOLE.z);
    else if (T < 83.7) { const a = (T - 83.3) / 0.4; bp = new THREE.Vector3(HOLE.x + 0.3, lerp(4.2, 0.12, a * a), HOLE.z + 0.1); }
    else if (T < 84.0) { const a = (T - 83.7) / 0.3; bp = new THREE.Vector3(lerp(HOLE.x + 0.3, 0.9, a), 0.12 + 0.9 * 4 * a * (1 - a), lerp(HOLE.z + 0.1, 0.5, a)); }
    else if (T < 84.6) { const a = (T - 84.0) / 0.6; bp = new THREE.Vector3(lerp(0.9, tableP.x, a), lerp(0.12, tableP.y, a) + 0.7 * 4 * a * (1 - a), lerp(0.5, tableP.z, a)); }
    else if (T < 86.0 || T >= 87.0) bp = tableP.clone();
    else if (T < 87.0) { const kp = new THREE.Vector3(); S.kid.holdR.getWorldPosition(kp); bp = kp.add(new THREE.Vector3(0, 0.1, 0.05)); const a = smooth(seg(T, 86.0, 86.3)) * (1 - smooth(seg(T, 86.7, 87.0))); bp = tableP.clone().lerp(bp, a); }
    ball.position.copy(bp); ball.rotation.set(0.3, T * 1.5, 0); ball.setGlow(T < 84.6 ? 1 : 0.55);
    // ---- family: mum stands up angry (83.6); unison (84.4); then they watch
    const sit = (ch, x, k) => { ch.root.position.set(x, 0, -1.75); ch.root.rotation.y = 0; ch.pose({ ...POSES.sitOn(T + k, seatY - 0.05) }); };
    const fp = (ch, x) => { ch.root.position.set(x, 0, -1.2); ch.root.rotation.y = 0.1 * Math.sign(-x || 1); };
    if (T >= 83.45 && T < 85.2) { fp(S.mum, -0.95); if (T < 84.35) laPeace(S.mum, T, 'mum', ctx, { lean: 0.1, hx: 0.05, brow: -0.6 }); else laPeace(S.mum, T, 'family', ctx); S.mum.face({ ...FACES.mew, brow: -0.7, browTilt: -0.8, open: ctx.mouth(T < 84.35 ? 'mum' : 'family', T) }); }
    else if (T < 83.45) { sit(S.mum, -0.75, 1); S.mum.face({ ...FACES.shock, open: 0.6 }); } else { fp(S.mum, -0.95); S.mum.pose({ ...POSES.arms_crossed(T) }); S.mum.face(FACES.angry); }
    const uni = T >= 84.3 && T < 85.4;
    sit(S.dad, 0.7, 3); if (uni) laPeace(S.dad, T, 'family', ctx, { ...POSES.sitOn(T, seatY - 0.05), ...POSES.laPeace(T), bob: POSES.sitOn(T, seatY - 0.05).bob }); else S.dad.face({ ...FACES.shock, open: 0.4 });
    if (T < 85.6) { sit(S.kid, -0.1, 2); if (uni) laPeace(S.kid, T, 'family', ctx, { ...POSES.sitOn(T, seatY - 0.05), ...POSES.laPeace(T), bob: POSES.sitOn(T, seatY - 0.05).bob }); else S.kid.face({ ...FACES.excited, open: 0.5 }); }
    else if (T < 86.0) {   // v3 (note #17): he gets up off the sofa and walks to the table instead of popping in
      const a = smooth(seg(T, 85.6, 86.0)); S.kid.root.position.set(lerp(-0.1, 1.15, a), 0, lerp(-1.35, 1.25, a)); S.kid.root.rotation.y = lerp(0.6, -2.6, smooth(seg(T, 85.75, 86.0)));
      S.kid.pose({ ...POSES.walk(T, 7), hx: 0.1 }); S.kid.face(FACES.excited);
    }
    else { S.kid.root.position.set(1.15, 0, 1.25); S.kid.root.rotation.y = -2.6; const hold = T > 86.0 && T < 87.0; S.kid.pose(hold ? { ...POSES.holdR(T), aRf: 1.3, hx: 0.2 } : POSES.idle(T)); S.kid.face(hold ? { ...FACES.shock, open: 0.5, eye: 1.3 } : FACES.happy); }
    S.grandma.root.position.set(2.05, 0, -0.85); S.grandma.root.rotation.y = -0.7; if (uni) laPeace(S.grandma, T, 'family', ctx, { ...POSES.sitOn(T, 0.5), ...POSES.laPeace(T), bob: POSES.sitOn(T, 0.5).bob }); else { S.grandma.pose(POSES.sitOn(T, 0.5)); S.grandma.face({ ...FACES.shock, open: 0.4 }); }
    // ---- Gerald on the coffee table (arrives 85.2), nudges the ball off at 90.4
    cat.root.visible = T >= 85.2; cat.root.position.set(TABLE[0] + 0.3, topY + 0.01, TABLE[2] - 0.05); cat.root.rotation.y = -1.6;
    cat.pose(APOSES.sit(T)); cat.face(T > 89.6 ? AFACES.bored : AFACES.deadpan);   // just sits (no push, note #18)
    S.dust.set(T - 83.3, [HOLE.x, 0.05, HOLE.z], 1.4);
    // ---- cameras
    let c;
    if (t < 85.2) { const k = smooth(seg(t, 83.2, 83.9)); c = mixCam(cam([1.7, 0.45, 3.1], [0.05, 2.7, 0.4], 58), cam([0.6, 1.6, 6.4], [0.1, 1.5, -0.6], 46), k); out.voiceY.mum = 1580; out.voiceY.family = 1580; }
    else if (t < 87.6) c = mixCam(cam([0.2, 1.55, 6.0], [0.6, 1.4, 0.0], 44), cam([0.25, 1.5, 5.6], [0.65, 1.4, 0.0], 44), smooth(seg(t, 85.2, 87.6)));
    else if (t < 89.2) c = mixCam(cam([0.1, 1.45, 3.5], [0.0, 1.25, 0.6], 40), cam([0.08, 1.42, 3.2], [0.0, 1.25, 0.6], 40), smooth(seg(t, 87.6, 89.2)));
    else if (t < 91.6) c = mixCam(cam([1.6, 1.7, 6.6], [0.3, 1.2, -0.4], 46), cam([1.3, 1.6, 5.8], [0.3, 1.2, -0.4], 44), smooth(seg(t, 89.2, 91.6)));   // wide: hero, family, the glowing ball on the table
    else { c = cam([0.1, 1.42, 3.2], [0.0, 1.25, 0.6], 40);
      // loop: the ball falls past the lens, out of the bottom of the frame (93.4 -> 95.2)
      const a = seg(t, 93.4, 95.2); ball.position.set(0.25, lerp(2.4, 0.2, a * a), 2.1); ball.setGlow(1); }
    out.voiceY.hero_final = 1600;
    out.cam = c; out.keyFocus = [0.4, 1.0, 0];
    out.after = (camera) => S.sil.set(silK, ball.position, camera);
    return out;
  },
};
