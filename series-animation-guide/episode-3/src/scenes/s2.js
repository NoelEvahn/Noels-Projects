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
    S.cat = makeAnimal('cat', ANIMALS.gerald); scene.add(S.cat.root); S.cat.root.position.set(2.0, 0.07, ROAD_Z + 0.9); S.cat.root.rotation.y = 0.2;
    // crowd: 44 low-detail people spawn from doors then fill the street
    const r = rng(23), doors = st.anchors.doors; S.crowd = [];
    const rowsZ = [-1.0, -0.3, 0.4, 2.6, 3.1, -0.6, 3.5];
    for (let i = 0; i < 44; i++) {
      const c = randomPerson(r); scene.add(c.root); const side = i % 2; const dpos = doors[(i * 3 + side) % doors.length].clone(); if (side) { dpos.z = 7.4 - 0.1; }
      let tx = lerp(-12, 12, ((i * 0.618) % 1)); const tz = rowsZ[i % rowsZ.length] + r.range(-0.15, 0.15); if (Math.abs(tx - 2.0) < 1.8 && tz > 0.2 && tz < 3.4) tx += tx < 2 ? -2.2 : 2.2;
      S.crowd.push({ c, born: 9.8 + (i / 44) * 7.6, from: [dpos.x, 0, side ? 7.3 : -3.3], to: [tx, 0, tz], ph: r() * 6 });
    }
    // named neighbours near the camera lanes (presets)
    S.named = ['neighbourMan', 'neighbourWoman', 'neighbourTeen', 'neighbourGranny'].map((p, i) => ({ c: mkc(p), born: 10.0 + i * 0.3, to: [[-3.5, 0, -0.6], [-1.2, 0, 3.2], [5.0, 0, -0.8], [6.8, 0, 3.2]][i], ph: i }));
    S.hearts = makeHeartField(60 + 8, { color: 0xff3f7f, emissive: 0.5 }); scene.add(S.hearts);
    // balloons rising from windows
    S.balloons = Array.from({ length: 12 }, (_, i) => { const b = heartBalloon([0xff3f7f, 0xff8fb8, 0xffd23f, 0x4aa0e0][i % 4], 1.0); scene.add(b); return { b, x: -11 + i * 2, z: -3.2 + (i % 2) * 10.4, t0: 11.0 + i * 0.5 }; });
    // chalk hearts on the road
    const chalk = new THREE.InstancedMesh(heartGeo(0.06, 0.01), new THREE.MeshStandardMaterial({ roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.2 }), 90); const d = new THREE.Object3D(), cc = new THREE.Color(), r2 = rng(3);
    S.chalkPos = Array.from({ length: 90 }, (_, i) => ({ x: r2.range(-10, 10), z: r2.range(-0.8, 4.8), s: r2.range(0.35, 0.7), a: r2() * 6, t: 11 + (i / 90) * 6 })); S.chalk = chalk; S.chalkD = d; S.chalkC = cc;
    chalk.instanceColor = null; for (let i = 0; i < 90; i++) { cc.set([0xff3f7f, 0xffffff, 0xffd23f, 0x7ad0ff][i % 4]); chalk.setColorAt(i, cc); } scene.add(chalk);
    S.confetti = makeConfetti(220, { origin: [0, 1.0, 0], spread: [2.4, 5.5, 2.4], size: 0.16 }); scene.add(S.confetti);
    S.aura = makeLoveAura(1.5); scene.add(S.aura); S.hb = heartBalloon(0xff3f7f, 1.4); S.hb.scale.setScalar(1.6); scene.add(S.hb);
    const hp = heroPath;
    // ---- shots (28 units from 9.6) ----
    const hh = (t) => hp(t);
    const trk = (t0, t1, f, az, dist, elev, fov, o = {}) => shot(t0, t1, orbit(f(t0), az, dist, elev, fov), orbit(f(t1), az, dist, elev, fov), o);
    const HF = (dy = 1.2, dx = 0) => (t) => [hh(t)[0] + dx, dy, ROAD_Z];
    S.shots = [
      shot(9.6, 10.4, cam([-14, 3.8, 5.6], [1, 1.2, 1.2], 50), cam([-12, 3.4, 5.4], [1, 1.2, 1.2], 50)),                         // wide down the street
      shot(10.4, 11.2, orbit([2.0, 0.5, 2.1], 38, 3.8, 0.7, 36, 0, 0.12), orbit([2.0, 0.5, 2.1], 24, 3.2, 0.5, 36, 0, 0.12)),   // Gerald on the line (roast)
      shot(11.2, 11.6, cam([-3.2, 1.7, 5.6], [-3.5, 1.5, -0.6], 38)),                                                           // neighbourMan out of his door
      trk(11.6, 12.0, HF(1.1), 25, 4.2, 0.4, 42),                                                                              // hero walking
      shot(12.0, 12.8, cam([0, 12, 3.2], [0, 0, 2.2], 48), cam([0, 11, 3.0], [0, 0, 2.2], 48)),                                  // top-down chalk hearts
      shot(12.8, 13.6, cam([-2.4, 2.4, 4.8], [-3.5, 2.0, 1.8], 30), cam([-2.2, 2.9, 4.8], [-3.4, 2.7, 1.8], 30), { slow: true }), // slow-mo heart balloon
      shot(13.6, 14.0, orbit([-0.5, 1.15, 0.0], -4, 2.6, 0.2, 36)),                                                             // grandma voice
      trk(14.0, 14.8, HF(1.25), 55, 3.8, 0.4, 40),                                                                            // hero fist pump + confetti
      shot(14.8, 15.2, cam([-0.4, 1.9, 5.6], [-1.2, 1.5, 3.2], 36)),                                                           // silent shock neighbourWoman
      shot(15.2, 15.6, cam([hh(15.4)[0] - 4, 0.7, 4.8], [hh(15.4)[0] + 2, 1.2, 1.4], 54)),                                      // low conga angle
      shot(15.6, 16.4, cam([-1.0, 2.2, 5.8], [-3.0, 0.9, 1.2], 44), cam([-2.2, 2.0, 5.8], [-3.2, 0.9, 1.2], 44)),                // postman dumps fan mail
      shot(16.4, 17.2, cam([5.4, 2.2, 6.0], [8.4, 1.3, 3.6], 40), cam([5.8, 2.0, 6.0], [8.2, 1.3, 3.6], 40)),                    // ice-cream truck
      shot(17.2, 18.0, cam([-2, 14, 9.5], [1.5, 0.5, 1.5], 52), cam([2, 13, 9.5], [3, 0.5, 1.5], 52)),                            // aerial of the street
      trk(18.0, 18.4, HF(1.6), 70, 2.7, 0.2, 36),                                                                             // hero determined
      shot(18.4, 19.2, cam([hh(18.4)[0] + 3.5, 1.4, 5.2], [hh(18.4)[0] + 1, 1.0, ROAD_Z], 46), cam([hh(19.2)[0] + 3.5, 1.4, 5.0], [hh(19.2)[0] + 1, 1.0, ROAD_Z], 46)), // sprint, tracking from the front-side
      trk(19.2, 19.6, HF(1.5), 72, 2.6, 0.1, 36),                                                                             // voice close
      shot(19.6, 20.0, cam([hh(19.6)[0] - 4, 1.4, -2.2], [hh(19.6)[0] + 1.6, 1.1, ROAD_Z], 50), cam([hh(20.0)[0] - 4, 1.4, -2.2], [hh(20.0)[0] + 1.6, 1.1, ROAD_Z], 50)),
      shot(20.0, 20.8, cam([hh(20.0)[0] - 9, 5.2, 5.2], [hh(20.4)[0] - 1, 1.0, 1.0], 56), cam([hh(20.8)[0] - 9, 4.8, 5.0], [hh(20.8)[0] - 1, 1.0, 1.0], 56)), // crowd chases
    ];
    // slower edit: ~2 s shots, each holding the camera of the gag / voiced line it covers
    S.shots = regroup(S.shots, [[9.6, 11.6, 10.4], [11.6, 13.2, 11.4], [13.2, 15.2, 13.6], [15.2, 16.8, 17.2], [16.8, 18.8, 18.4], [18.8, 20.8, 20.0]]);
    return S;
  },
  frame(t, S, ctx) {
    const P = pick(S.shots, t); const c = P.cam; const mo = ctx.mouth;
    let tt = t; if (P.shot.slow) tt = P.shot.t0 + (t - P.shot.t0) * 0.35;   // slow-mo shot samples the world at 35% speed
    const hp = heroPath(tt), moving = tt < 18.4, running = tt >= 18.4;
    // hero
    place(S.hero, hp[0], 0, hp[2], Math.PI / 2 * (running ? 1.0 : 0.88));
    S.hero.pose(running ? POSES.run(tt, 11) : POSES.walk(tt, 6)); 
    if (t >= 14.0 && t < 14.8) S.hero.pose({ ...POSES.cheer(t), lLk: 0.3, lRk: 0.3 }); 
    S.hero.face(t >= 19.2 && t < 20.2 ? { ...FACES.excited, open: mo('hero_excited', t) } : t >= 14.0 && t < 14.8 ? FACES.happy : { ...FACES.shock, open: 0.15 + 0.1 * Math.sin(t * 5) });
    // grandma on the pavement, hands on hips, jealous
    place(S.grandma, -0.5, 0, 0.0, 0.2); S.grandma.pose({ ...POSES.idle(t), aLs: 0.5, aRs: 0.5, aLe: 1.8, aRe: 1.8, aLf: 0.5, aRf: 0.5, hL: 'fist', hR: 'fist' }); S.grandma.face(t >= 13.6 && t < 14.6 ? { ...FACES.question, open: mo('grandma_confused', t) } : { ...FACES.angry, open: 0, lid: 0.1, smile: -0.2 });
    // family joins the crowd
    place(S.mum, 6.0, 0, 3.0, -0.9); S.mum.pose(POSES.cheer(t)); S.mum.face(FACES.happy); S.mum.root.visible = t > 12; 
    place(S.dad, 7.4, 0, -0.7, -1.2); S.dad.pose(POSES.cheer(t + 1)); S.dad.face(FACES.excited); S.dad.root.visible = t > 12.4;
    place(S.kid, 4.6, 0, 3.2, 0.4); S.kid.pose(POSES.cheer(t + 2)); S.kid.face(FACES.excited); S.kid.root.visible = t > 12.8;
    // crowd
    const v = new THREE.Vector3(); let hi = 0;
    const heartPos = [];
    S.crowd.forEach((q, i) => { if (t > 18.6 && q.c.root.visible === false) { /* keep */ } const k = clamp((t - q.born) / 1.0); const e = easeOutCubic(k); q.c.root.visible = t > q.born; const x = lerp(q.from[0], q.to[0], e), z = lerp(q.from[2], q.to[2], e);
      let cx = x; if (t > 18.6) { const ch = clamp((t - 18.6) / 0.8); cx = lerp(x, hp[0] - 3.5 - (i % 9) * 1.2, ch); }
      for (const [zx, zz, zr] of [[hp[0], hp[2], 2.8], [-3.0, 1.2, 2.4], [2.0, 2.1, 2.2]]) { const dx = cx - zx, dz = z - zz; if (Math.hypot(dx, dz) < zr) cx = zx + (dx < 0 ? -1 : 1) * Math.sqrt(Math.max(0, zr * zr - dz * dz)); }
      place(q.c, cx, 0, z, Math.atan2(hp[0] - cx, hp[2] - z)); q.c.pose(k < 1 ? { ...POSES.run(t + q.ph, 8), lean: 0.1 } : (i % 3 === 0 ? POSES.cheer(t + q.ph) : i % 3 === 1 ? POSES.clap(t + q.ph) : { ...POSES.wave(t + q.ph), aLs: 2.2 })); q.c.face(FACES.excited); if (q.c.root.visible) { q.c.head.getWorldPosition(v); heartPos.push([v.x, v.y + 0.55, v.z, q.born + 0.1]); } });
    S.named.forEach((q, i) => { const k = clamp((t - q.born) / 0.9); q.c.root.visible = t > q.born; const e = easeOutCubic(k); const doorX = q.to[0], zFrom = q.to[2] < 1 ? -3.3 : 7.3; place(q.c, doorX, 0, lerp(zFrom, q.to[2], e), Math.atan2(hp[0] - doorX, hp[2] - q.to[2])); q.c.pose(k < 1 ? POSES.walk(t, 7) : POSES.cheer(t + i)); q.c.face(t >= 14.8 && t < 15.2 && i === 1 ? { ...FACES.shock, open: 0.8 } : FACES.excited); if (q.c.root.visible) { q.c.head.getWorldPosition(v); heartPos.push([v.x, v.y + 0.6, v.z, q.born + 0.1]); } });
    S.hearts.update((i) => { const p = heartPos[i]; if (!p) return null; const s = easeOutBack(clamp((t - p[3]) / 0.4)) * 0.34; return { x: p[0], y: p[1] + Math.sin(t * 4 + i) * 0.04, z: p[2], s, ry: Math.atan2(c.pos[0] - p[0], c.pos[2] - p[2]) }; });
    // postman + fan mail, ice-cream man + free cones
    place(S.postman, -3.0, 0, 1.2, 0.7); const sw = t > 15.9 && t < 16.4; S.postman.pose({ ...POSES.holdR(), aRf: sw ? 0.6 + (t - 15.9) * 4 : 1.0, aRe: 1.0 }); S.postman.face(FACES.happy); S.postmanSack.visible = t < 16.1;
    S.sacks.forEach((s, i) => { const bt = clamp((t - 16.0 - i * 0.06) / 0.5); s.visible = t >= 16.0; s.position.set(-3.0 + i * 0.5 - 0.3, Math.sin(bt * Math.PI) * 1.2 * (1 - bt * 0.3), 1.0 + (i % 2) * 0.6 + bt * 0.2); s.rotation.y = i; });
    place(S.iceman, 8.4, 0, 3.8, Math.PI); S.iceman.pose({ ...POSES.holdR(), aRf: 1.0 + Math.sin(t * 5) * 0.2 }); S.iceman.face(FACES.happy);
    S.cones.forEach((cn, i) => { const bt = clamp((t - 16.6 - i * 0.15) / 0.8); cn.visible = t >= 16.6; cn.position.set(8.0 - bt * 2.0 + i * 0.1, 1.2 + Math.sin(bt * Math.PI) * 1.4 - bt * 0.4, 3.4 - bt * 1.6 + (i % 2) * 0.3); cn.rotation.z = bt * 3; });
    // Gerald: sits on the white line, looks away, yawns
    S.cat.pose({ ...APOSES.sit(t), hy: Math.sin(t * 0.8) * 0.3 }); S.cat.face({ lid: 0.5 + (Math.sin(t * 2.2) > 0.95 ? 0.4 : 0) });
    // balloons
    S.balloons.forEach((b) => { const a = t - b.t0; b.b.visible = a > 0; b.b.position.set(b.x + Math.sin(a) * 0.3, 2.2 + a * 1.4, b.z); b.b.rotation.z = Math.sin(a * 2) * 0.1; });
    // chalk hearts
    S.chalkPos.forEach((p, i) => { const k = clamp((t - p.t) / 0.4); S.chalkD.position.set(p.x, 0.075, p.z); S.chalkD.rotation.set(-Math.PI / 2, 0, p.a); S.chalkD.scale.setScalar(p.s * k + 0.0001); S.chalkD.updateMatrix(); S.chalk.setMatrixAt(i, S.chalkD.matrix); }); S.chalk.instanceMatrix.needsUpdate = true;
    // confetti burst at 14.0 around the hero
    S.confetti.position.set(heroPath(14.0)[0], 0, heroPath(14.0)[2]); S.confetti.update(t - 14.0);
    { const bt = Math.max(0, tt - 12.0); S.hb.visible = tt >= 12.0 && t < 14.0; S.hb.position.set(-3.5, 0.9 + bt * 0.9, 1.8); S.hb.rotation.z = Math.sin(bt * 2) * 0.12; }
    S.aura.position.set(hp[0], 0.02, hp[2]); S.aura.setR(2.4 + 0.5 * Math.log2(1 + Math.max(0, t - 9.6)), 0.8);
    return { cam: c, keyFocus: c.target };
  },
};
