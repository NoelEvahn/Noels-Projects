// S2 — THE STREET (9.6–20.8): neighbours spill out of every door, fan mail, chalk hearts, ice-cream truck, conga line. Count 16 -> 1,024.
import { THREE, makeCharacter, PRESETS, POSES, FACES, randomPerson, makeLoveAura, rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, orbit, cam, shot, pick, regroup, pops, place, V, D2R } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { buildStreet, mailSack } from '../../../assets/library/sets/street.js';
import { makeAnimal, APOSES, ANIMALS } from '../../../assets/library/animal.js';
import { makeHeartField, makeConfetti, HEART_GEO, makeHeart } from '../../../assets/library/fx/hearts.js';
import { heartBalloon } from '../../../assets/library/props/holdables.js';
import { iceCreamTruck } from '../../../assets/library/props/world.js';
import * as HOLD from '../../../assets/library/props/holdables.js';
import { heartGeo } from '../../../assets/library/util.js';

const STAGE = { sky: ['#7fd0ff', '#fff6dc'], ground: null, fog: ['#e8f4ff', 40, 120], shadow: { extent: 16 }, keyPos: [6, 10, 6] };
const ROAD_Z = 1.2;
// hero path along the street (pure function of time)
export const heroPath = (t) => { if (t < 18.4) { const k = (t - 9.6) / (18.4 - 9.6); return [lerp(-9, 8.5, k), 0, ROAD_Z]; } const s = (t - 18.4); return [8.5 + s * s * 1.2 + s * 6, 0, ROAD_Z]; };

export default {
  async build(ctx) {
    const stage = makeStage(STAGE), scene = stage.scene;
    const st = buildStreet(); scene.add(st.group);
    const S = { stage, scene, st };
    const mkc = (preset) => { const c = makeCharacter(PRESETS[preset]); scene.add(c.root); return c; };
    S.hero = mkc('hero'); S.grandma = mkc('grandma'); S.postman = mkc('postman'); S.iceman = mkc('iceCreamMan'); S.mum = mkc('mum'); S.dad = mkc('dad'); S.kid = mkc('kid');
    // truck + sacks + cones
    S.truck = iceCreamTruck(); S.truck.position.set(9.0, 0, 4.9); S.truck.rotation.y = Math.PI; scene.add(S.truck);
    S.sacks = Array.from({ length: 6 }, (_, i) => { const m = mailSack(1); scene.add(m); return m; });
    S.cones = Array.from({ length: 6 }, (_, i) => { const c = HOLD.iceCream(1 + (i % 3), [0xff8fb8, 0xfff1c0, 0x9be0c0]); scene.add(c); return c; });
    S.iceman.hold(HOLD.iceCream(3), 'R');
    S.postmanSack = mailSack(1); S.postman.hold(S.postmanSack, 'R', { pos: [0, 0, 0], rot: [0, 0, 0] });
    // Gerald sits on the white line
    S.cat = makeAnimal('cat', ANIMALS.gerald); scene.add(S.cat.root); S.cat.root.position.set(-10.4, 0.07, 0.3); S.cat.root.rotation.y = 1.3;
    // crowd: 20 low-detail people spawn from doors then fill the street
    const r = rng(23), doors = st.anchors.doors; S.crowd = [];
    const rowsZ = [-1.0, -0.3, -0.1, 3.0, 3.2, -0.6, 3.5];
    for (let i = 0; i < 20; i++) {
      const c = randomPerson(r); scene.add(c.root); const side = i % 2; const dpos = doors[(i * 3 + side) % doors.length].clone(); if (side) { dpos.z = 7.4 - 0.1; }
      let tx = lerp(-12, 12, ((i * 0.618) % 1)); const tz = rowsZ[i % rowsZ.length] + r.range(-0.15, 0.15); if (Math.abs(tx - 2.0) < 1.8 && tz > 0.2 && tz < 3.4) tx += tx < 2 ? -2.2 : 2.2;
      S.crowd.push({ c, born: 9.8 + (i / 20) * 7.6, from: [dpos.x, 0, side ? 7.3 : -3.3], to: [tx, 0, tz], ph: r() * 6 });
    }
    // named neighbours near the camera lanes (presets)
    S.named = ['neighbourMan', 'neighbourWoman', 'neighbourTeen', 'neighbourGranny'].map((p, i) => ({ c: mkc(p), born: 10.0 + i * 0.3, to: [[-3.5, 0, -0.6], [-1.2, 0, 3.2], [5.0, 0, -0.8], [6.8, 0, 3.2]][i], ph: i }));
    S.hearts = makeHeartField(60 + 8, { color: 0xff3f7f, emissive: 0.5 }); scene.add(S.hearts);
    // balloons rising from windows
    S.balloons = Array.from({ length: 12 }, (_, i) => { const b = heartBalloon([0xff3f7f, 0xff8fb8, 0xffd23f, 0x4aa0e0][i % 4], 1.0); scene.add(b); return { b, x: -11 + i * 2, z: -3.2 + (i % 2) * 10.4, t0: 11.0 + i * 0.5 }; });
    // chalk hearts on the road
    const chalk = new THREE.InstancedMesh(heartGeo(0.06, 0.01), new THREE.MeshStandardMaterial({ roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.2 }), 40); const d = new THREE.Object3D(), cc = new THREE.Color(), r2 = rng(3);
    S.chalkPos = Array.from({ length: 40 }, (_, i) => ({ x: r2.range(-10, 10), z: r2.range(-0.8, 4.8), s: r2.range(0.35, 0.7), a: r2() * 6, t: 11 + (i / 40) * 6 })); S.chalk = chalk; S.chalkD = d; S.chalkC = cc;
    chalk.instanceColor = null; for (let i = 0; i < 40; i++) { cc.set([0xff3f7f, 0xffffff, 0xffd23f, 0x7ad0ff][i % 4]); chalk.setColorAt(i, cc); } scene.add(chalk);
    S.confetti = makeConfetti(220, { origin: [0, 1.0, 0], spread: [2.4, 5.5, 2.4], size: 0.16 }); scene.add(S.confetti);
    S.aura = makeLoveAura(1.5); scene.add(S.aura); S.hb = heartBalloon(0xff3f7f, 1.4); S.hb.scale.setScalar(1.6); scene.add(S.hb);
    const hp = heroPath;
    // ---- shots: the camera stays on the hero; fans see him, get heart eyes and fall in behind him, then chase him ----
    // follow(t, hp) -> camera; cuts stay in regroup() form so the audio script finds them
    const F = (dp, dt, fov) => (t, hp) => ({ pos: [hp[0] + dp[0], dp[1], hp[2] + dp[2]], target: [hp[0] + dt[0], dt[1], hp[2] + dt[2]], fov, roll: 0 });
    const Fm = (a, b, t0, t1) => (t, hp) => { const k = smooth(clamp((t - t0) / (t1 - t0))), A = a(t, hp), B = b(t, hp); return { pos: A.pos.map((v, i) => v + (B.pos[i] - v) * k), target: A.target.map((v, i) => v + (B.target[i] - v) * k), fov: A.fov + (B.fov - A.fov) * k, roll: 0 }; };
    S.shots = [
      { ...shot(9.6, 11.6, cam([0, 0, 0], [0, 0, 1])), follow: Fm(F([3.0, 1.6, 3.2], [-0.5, 1.15, 0], 40), F([2.4, 1.55, 2.7], [-0.6, 1.15, 0], 38), 9.6, 11.6) },   // hero walks up the street, doors open behind him
      { ...shot(11.6, 13.2, cam([0, 0, 0], [0, 0, 1])), follow: Fm(F([3.8, 1.55, 0.2], [-1.2, 1.2, 0], 40), F([3.3, 1.5, 0.15], [-1.2, 1.2, 0], 38), 11.6, 13.2) },                             // a neighbour sees him: heart eyes
      { ...shot(13.2, 14.2, cam([0.2, 1.6, 3.3], [-0.5, 1.2, 0.0], 34), cam([0.1, 1.58, 3.1], [-0.5, 1.2, 0.0], 32)), close: 1 },
      { ...shot(14.2, 15.2, cam([0, 0, 0], [0, 0, 1])), follow: Fm(F([2.2, 1.5, 2.2], [-0.4, 1.2, 0], 40), F([2.0, 1.45, 2.0], [-0.5, 1.2, 0], 38), 14.2, 15.2) },   // fist pump, fans behind                                     // grandma, jealous, as he passes with fans behind
      { ...shot(15.2, 16.8, cam([0, 0, 0], [0, 0, 1])), follow: Fm(F([0.6, 1.6, 4.8], [-1.6, 1.0, 0], 44), F([0.2, 1.7, 4.4], [-1.8, 1.0, 0], 44), 15.2, 16.8) }, // side track: the fan club grows
      { ...shot(16.8, 18.8, cam([0, 0, 0], [0, 0, 1])), follow: Fm(F([3.2, 1.4, 0.9], [-1.5, 1.2, 0], 40), F([2.8, 1.35, 0.7], [-1.5, 1.2, 0], 40), 16.8, 18.8) },  // in front: he looks back, they are coming
      { ...shot(18.8, 20.8, cam([0, 0, 0], [0, 0, 1])), follow: Fm(F([4.6, 1.7, 3.0], [-2.2, 1.0, 0], 48), F([4.2, 1.9, 3.6], [-2.6, 1.0, 0], 50), 18.8, 20.8) },  // the chase
    ];
    S.shots = regroup(S.shots, [[9.6, 11.6, 9.6], [11.6, 13.2, 11.6], [13.2, 14.2, 13.2], [14.2, 15.2, 14.2], [15.2, 16.8, 15.2], [16.8, 18.8, 16.8], [18.8, 20.8, 18.8]]);
    // fans: when the hero walks past they see him (heart eyes pop), then fall into a slot behind him (6 rows x 4 lanes)
    const tPass = (x) => 9.6 + (x + 9) * 8.8 / 17.5;
    S.fans = [...S.crowd.map((q) => ({ q, stand: q.to, born: q.born, from: q.from })), ...S.named.map((q) => ({ q, stand: q.to, born: q.born, from: [q.to[0], 0, q.to[2] < 1 ? -3.3 : 7.3], named: true }))];
    S.fans.forEach((f) => { f.seen = Math.max(f.born + 0.9, tPass(f.stand[0]) - 1.6); f.follow = Math.max(f.seen + 0.7, tPass(f.stand[0]) + 0.5); });
    S.fans[S.crowd.length].seen = 12.2; S.fans[S.crowd.length].follow = Math.max(13.0, S.fans[S.crowd.length].follow);   // the close-up neighbour turns on camera
    [...S.fans].sort((a, b) => a.follow - b.follow).forEach((f, i) => { f.row = Math.floor(i / 4); f.lane = i % 4; });
    return S;
  },
  frame(t, S, ctx) {
    const P = pick(S.shots, t); const mo = ctx.mouth;
    let tt = t; if (P.shot.slow) tt = P.shot.t0 + (t - P.shot.t0) * 0.35;   // slow-mo shot samples the world at 35% speed
    const hp = heroPath(tt), moving = tt < 18.4, running = tt >= 18.4;
    const c = P.shot.follow ? P.shot.follow(t, hp) : P.cam;
    // hero
    place(S.hero, hp[0], 0, hp[2], Math.PI / 2 * (running ? 1.0 : 0.88));
    S.hero.pose(running ? { ...POSES.run(tt, 11), hy: t > 19.6 && t < 20.2 ? -0.9 : 0 } : { ...POSES.walk(tt, 6), hy: t > 17.6 ? -1.1 * smooth(clamp((t - 17.6) / 0.3)) : 0.25 * Math.sin(t * 0.9) });
    if (t >= 14.2 && t < 15.0) S.hero.pose({ ...POSES.cheer(t), lLk: 0.3, lRk: 0.3 }); 
    S.hero.face(t >= 19.2 && t < 20.2 ? { ...FACES.excited, open: mo('hero_excited', t) } : t >= 14.0 && t < 14.8 ? FACES.happy : { ...FACES.shock, open: 0.15 + 0.1 * Math.sin(t * 5) });
    // grandma on the pavement, hands on hips, jealous
    place(S.grandma, -0.5, 0, 0.0, 0.2); S.grandma.pose({ ...POSES.idle(t), aLs: 0.5, aRs: 0.5, aLe: 1.8, aRe: 1.8, aLf: 0.5, aRf: 0.5, hL: 'fist', hR: 'fist' }); S.grandma.face(t >= 13.6 && t < 14.6 ? { ...FACES.question, open: mo('grandma_confused', t) } : { ...FACES.angry, open: 0, lid: 0.1, smile: -0.2 });
    // family joins the crowd
    place(S.mum, 6.0, 0, 3.9, -0.9); S.mum.pose(POSES.cheer(t)); S.mum.face(FACES.lovestruck); S.mum.root.visible = t > 12; 
    place(S.dad, 7.4, 0, -0.7, -1.2); S.dad.pose(POSES.cheer(t + 1)); S.dad.face(FACES.lovestruck); S.dad.root.visible = t > 12.4;
    place(S.kid, 4.6, 0, 3.9, 0.4); S.kid.pose(POSES.cheer(t + 2)); S.kid.face(FACES.lovestruck); S.kid.root.visible = t > 12.8;
    // crowd
    const v = new THREE.Vector3(); let hi = 0;
    const heartPos = [];
    const gap = Math.max(0, t - 18.5) ** 2 * 0.7;   // during the sprint the fans slowly fall behind (but keep running)
    S.fans.forEach((f, i) => {
      const q = f.q, c0 = q.c; c0.root.visible = t > f.born;
      const k = easeOutCubic(clamp((t - f.born) / 1.0)), sx = lerp(f.from[0], f.stand[0], k), sz = lerp(f.from[2], f.stand[2], k);
      const slot = [hp[0] - 1.7 - f.row * 1.0 - (f.lane % 2) * 0.35 - gap, 0, 0.7 + f.lane * 0.6];
      const fk = smooth(clamp((t - f.follow) / 1.3)), x = lerp(sx, slot[0], fk), z = lerp(sz, slot[2], fk);
      const yaw = fk > 0.5 ? Math.PI / 2 : Math.atan2(hp[0] - x, hp[2] - z);
      place(c0, x, 0, z, yaw); if (Math.hypot(x - c.pos[0], z - c.pos[2]) < 1.1) c0.root.visible = false;   // never let a fan fill the lens
      const love = easeOutBack(clamp((t - f.seen) / 0.35)), walking = k < 1 || (fk > 0 && fk < 1) || (fk >= 1 && t < 18.4), runningF = fk >= 1 && t >= 18.4;
      if (runningF) c0.pose({ ...POSES.run(t + f.row * 0.3 + f.lane * 0.2, 10), aLf: 1.5, aRf: 1.4 + Math.sin(t * 9 + i) * 0.2, aLe: 0.2, aRe: 0.2, hL: 'open', hR: 'open', lean: 0.2 });
      else if (walking) c0.pose({ ...POSES.walk(t + i * 0.37, 6.5), ...(fk > 0 && love > 0.5 ? { aLf: 1.1, aRf: 1.0, aLe: 0.3, aRe: 0.3, hL: 'open', hR: 'open' } : {}) });
      else c0.pose(t < f.seen ? POSES.idle(t + i) : { ...POSES.hugOpen(0, 0.8), bob: Math.abs(Math.sin(t * 6 + i)) * 0.04 });
      c0.face(t < f.seen ? { smile: 0.2, pupil: [-0.5, 0] } : { ...FACES.lovestruck, hearts: love, open: runningF ? 0.6 : 0.35 + 0.15 * Math.sin(t * 4 + i) });
      if (c0.root.visible && t > f.seen) { c0.head.getWorldPosition(v); heartPos.push([v.x, v.y + 0.6, v.z, f.seen + 0.1]); }
    });
    S.hearts.update((i) => { const p = heartPos[i]; if (!p) return null; const s = easeOutBack(clamp((t - p[3]) / 0.4)) * 0.34; return { x: p[0], y: p[1] + Math.sin(t * 4 + i) * 0.04, z: p[2], s, ry: Math.atan2(c.pos[0] - p[0], c.pos[2] - p[2]) }; });
    // postman + fan mail, ice-cream man + free cones
    place(S.postman, -1.4, 0, -1.3, 0.4); const sw = t > 15.9 && t < 16.4; S.postman.pose({ ...POSES.holdR(), aRf: sw ? 0.6 + (t - 15.9) * 4 : 1.0, aRe: 1.0 }); S.postman.face(FACES.happy); S.postmanSack.visible = t < 16.1;
    S.sacks.forEach((s, i) => { const bt = clamp((t - 16.0 - i * 0.06) / 0.5); s.visible = t >= 16.0; s.position.set(-1.4 + i * 0.5 - 0.3, Math.sin(bt * Math.PI) * 1.2 * (1 - bt * 0.3), -0.9 - (i % 2) * 0.4 - bt * 0.2); s.rotation.y = i; });
    place(S.iceman, 8.4, 0, 3.8, Math.PI); S.iceman.pose({ ...POSES.holdR(), aRf: 1.0 + Math.sin(t * 5) * 0.2 }); S.iceman.face(FACES.happy);
    S.cones.forEach((cn, i) => { const bt = clamp((t - 16.6 - i * 0.15) / 0.8); cn.visible = t >= 16.6; cn.position.set(8.0 - bt * 2.0 + i * 0.1, 1.2 + Math.sin(bt * Math.PI) * 1.4 - bt * 0.4, 3.4 - bt * 1.6 + (i % 2) * 0.3); cn.rotation.z = bt * 3; });
    // Gerald: sits on the white line, looks away, yawns
    S.cat.pose({ ...APOSES.sit(t), hy: Math.sin(t * 0.8) * 0.3 }); S.cat.face({ lid: 0.5 + (Math.sin(t * 2.2) > 0.95 ? 0.4 : 0) });
    // balloons
    S.balloons.forEach((b) => { const a = t - b.t0; b.b.visible = a > 0; b.b.position.set(b.x + Math.sin(a) * 0.3, 2.2 + a * 1.4, b.z); b.b.rotation.z = Math.sin(a * 2) * 0.1; });
    // chalk hearts
    S.chalkPos.forEach((p, i) => { const k = clamp((t - p.t) / 0.4); S.chalkD.position.set(p.x, 0.075, p.z); S.chalkD.rotation.set(-Math.PI / 2, 0, p.a); S.chalkD.scale.setScalar(p.s * k + 0.0001); S.chalkD.updateMatrix(); S.chalk.setMatrixAt(i, S.chalkD.matrix); }); S.chalk.instanceMatrix.needsUpdate = true;
    // confetti burst at 14.0 around the hero
    S.confetti.position.set(heroPath(14.0)[0], 0, heroPath(14.0)[2]); S.confetti.update(t - 14.0); S.confetti.visible = !(t >= 13.2 && t < 15.2);
    { const bt = Math.max(0, tt - 12.0); S.hb.visible = tt >= 12.0 && t < 14.0; S.hb.position.set(-3.5, 0.9 + bt * 0.9, 1.8); S.hb.rotation.z = Math.sin(bt * 2) * 0.12; }
    S.aura.position.set(hp[0], 0.02, hp[2]); S.aura.setR(2.4 + 0.5 * Math.log2(1 + Math.max(0, t - 9.6)), 0.8);
    return { cam: c, keyFocus: c.target };
  },
};
