// S5 — CLOUD NINE (44.8–57.6): fans release heart balloons, he floats up through the clouds; airliner passengers, balloonist, skydivers; golden cloud at 54.0.
import { THREE, makeCharacter, PRESETS, POSES, FACES, randomPerson, rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, orbit, cam, shot, pick, regroup, pops, place, V, D2R } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { buildSkyScene, skydiverHeart, SKY_STAGE } from '../../../assets/library/sets/sky.js';
import { cloud, airliner, hotAirBalloon } from '../../../assets/library/props/sky.js';
import { makeAnimal, APOSES, ANIMALS } from '../../../assets/library/animal.js';
import { makeHeartField, makeConfetti, makeSparkles } from '../../../assets/library/fx/hearts.js';
import { balloonBunch, heartBalloon, tray } from '../../../assets/library/props/holdables.js';
import { starfield } from '../../../assets/library/props/world.js';
import { mat, add, cyl, sph, box, canvasTex } from '../../../assets/library/util.js';

const GROUND_Y = -60;                                       // launch field sits far below the cloud layer
const B = 7;                                                  // hero hover height above the cloud tops
const alt = (t) => { if (t < 46.0) return GROUND_Y; if (t < 47.8) { const k = clamp((t - 46.0) / 1.8); return GROUND_Y + (B - GROUND_Y) * k * k * (3 - 2 * k); } if (t < 56.4) return B + Math.sin(t * 0.6) * 0.35; const s = t - 56.4; return B + s * s * 5; };
const faceTex = (skin, heart) => canvasTex(128, 160, (c, w, h) => { c.fillStyle = '#9fd0f0'; c.fillRect(0, 0, w, h); c.fillStyle = skin; c.beginPath(); c.ellipse(64, 86, 44, 52, 0, 0, 7); c.fill(); c.fillStyle = '#3a2a1a'; c.beginPath(); c.ellipse(64, 50, 46, 26, 0, Math.PI, 0); c.fill(); for (const sd of [-1, 1]) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(64 + sd * 20, 84, 15, 17, 0, 0, 7); c.fill(); if (heart) { c.fillStyle = '#ff3f7f'; c.font = '26px sans-serif'; c.textAlign = 'center'; c.fillText('♥', 64 + sd * 20, 94); } else { c.fillStyle = '#111'; c.beginPath(); c.arc(64 + sd * 20, 86, 6, 0, 7); c.fill(); } } c.fillStyle = '#4a1218'; c.beginPath(); c.ellipse(64, 118, 12, 14, 0, 0, 7); c.fill(); });

export default {
  async build(ctx) {
    const stage = makeStage({ ...SKY_STAGE, shadow: { extent: 20, size: 2048 } }), scene = stage.scene;
    const S = { stage, scene };
    const sky = buildSkyScene({ seed: 3, clouds: 26, withBalloons: 2, withLiner: false }); scene.add(sky.group); S.sky = sky;
    // launch field (far below)
    const field = new THREE.Group(); field.position.y = GROUND_Y; scene.add(field); S.field = field;
    add(field, new THREE.CylinderGeometry(60, 60, 0.3, 48), mat(0x6fbf52), [0, -0.15, 0]); for (let i = 0; i < 7; i++) { const t = new THREE.Group(); add(t, new THREE.CylinderGeometry(0.2, 0.3, 2.5, 8), mat(0x7a5232), [0, 1.2, 0]); add(t, new THREE.SphereGeometry(1.6, 14, 10), mat(0x49b04e), [0, 3.4, 0]); t.position.set(-22 + i * 7.5, 0, -16); field.add(t); }
    S.hero = makeCharacter(PRESETS.hero); scene.add(S.hero.root); S.bunch = balloonBunch(26, 1.6); S.hero.holdUpright(S.bunch, 'R');
    S.fans = Array.from({ length: 30 }, (_, i) => { const c = randomPerson(rng(60 + i)); field.add(c.root); const a = i / 30 * 6.283, d = 4 + (i % 5) * 1.5; c.root.position.set(Math.sin(a) * d, 0, Math.cos(a) * d - 3); c.root.rotation.y = Math.atan2(-Math.sin(a), -Math.cos(a)) + 3.14; const b = heartBalloon([0xff3f7f, 0xff8fb8, 0xffd23f, 0x4aa0e0, 0xb07aff][i % 5], 1.3); c.hold = null; c.root.add(b); b.position.set(0.3, 0.9, 0.2); c.bal = b; c.rel = 45.2 + (i / 30) * 1.1; return c; });
    S.catG = makeAnimal('cat', ANIMALS.gerald); field.add(S.catG.root); S.catG.root.position.set(3.4, 0, 3.0); S.catG.root.rotation.y = 2.6;
    // swarm of balloons rising past the camera during the ascent
    S.swarm = makeHeartField(260, { colors: [0xff3f7f, 0xff8fb8, 0xffd23f, 0x4aa0e0, 0xb07aff, 0xffffff], emissive: 0.4 }); scene.add(S.swarm); const r = rng(5); S.swP = Array.from({ length: 260 }, () => ({ x: r.range(-26, 26), z: r.range(-26, 16), sp: r.range(2.5, 6), y0: r.range(-80, 40), s: r.range(0.5, 1.1), ph: r() * 6 }));
    // airliner with faces in the windows
    S.liner = airliner(2.2); S.liner.position.set(10, 14, -18); S.liner.rotation.y = -1.45; scene.add(S.liner);
    for (let i = 0; i < 12; i++) for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34 * 2.2 * 0.7, 0.36 * 2.2 * 0.7), new THREE.MeshBasicMaterial({ map: faceTex(['#f2b98f', '#d99a6c', '#9b6338', '#6b4226'][(i + (sd > 0 ? 2 : 0)) % 4], i % 2 === 0), toneMapped: false })); m.position.set(sd * 0.575 * 2.2, 0.16 * 2.2, (i - 5.5) * 0.26 * 2.2 + 0.2 * 2.2); m.rotation.y = sd * Math.PI / 2; S.liner.add(m); }
    // hot-air balloon with the deadpan balloonist
    S.hab = hotAirBalloon({ colors: [0x2f6fd6, 0xffd23f, 0xffffff], s: 2.0 }); S.hab.position.set(-14, 10, -12); scene.add(S.hab); S.ball = makeCharacter(PRESETS.balloonist); S.hab.add(S.ball.root); S.ball.root.position.set(0, -0.35, 0); S.ball.root.rotation.y = 0.3;
    // skydiver heart formation (above the clouds, seen top-down)
    S.dive = skydiverHeart(28); S.dive.group.position.set(0, 28, -10); S.dive.group.scale.setScalar(1.8); scene.add(S.dive.group);
    // golden cloud + fireworks
    S.gold = cloud(rng(2), 1.5, 0xffe27a); S.gold.position.set(0, B - 1.4, 0); scene.add(S.gold); S.gold.children.forEach((c) => (c.material = mat(0xffd54a, { emissive: 0xffb020, emissiveIntensity: 0.55, rough: 0.8 })));
    S.fire = [0, 1, 2, 3].map((i) => { const f = makeConfetti(160, { colors: [0xffd23f, 0xffffff, 0xff3f7f, 0x9be7ff], origin: [-6 + i * 4, 16 + (i % 2) * 3, -8], spread: [5, 5, 5], gravity: 4, size: 0.26, seed: 20 + i }); scene.add(f); return f; });
    S.sp = makeSparkles(120, { area: [10, 6, 10] }); scene.add(S.sp);
    // night dome that fades in at the end (towards space)
    S.dome = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 16), new THREE.MeshBasicMaterial({ color: 0x050816, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false })); scene.add(S.dome); S.stars = starfield(1000, 170, 4); S.stars.material.transparent = true; S.stars.material.opacity = 0; scene.add(S.stars);
    // shots (32 units from 44.8)
    const F = (x, y, z) => [x, GROUND_Y + y, z];
    const hy = (t) => alt(t);
    S.shots = [
      shot(44.8, 45.6, cam(F(0, 5, 17), F(0, 2.4, -2), 52), cam(F(0, 4.5, 14), F(0, 2.4, -2), 52)),                                             // wide field: fans hold hearts
      shot(45.6, 46.0, orbit(F(0, 1.7, 0), 12, 3.4, 0.2, 38)),                                                                                 // hero grabs the bunch
      shot(46.0, 46.8, cam(F(2, 0.3, 4.2), [0.5, hy(46.0) + 3, 0], 54), cam(F(2, 0.3, 4.2), [0, hy(46.8) + 3, 0], 54)),                        // low: feet leave the ground
      shot(46.8, 47.6, cam(F(3.0, 0.45, 5.6), [0, hy(47.2) + 3, 0], 50), cam(F(3.0, 0.45, 5.6), [0, hy(47.6) + 3, 0], 50)),                  // Gerald in the grass; hero rising (roast)
      shot(47.6, 48.0, cam([4, B + 5, 9], [0, B, 0], 48)),                                                                                     // pops out above the clouds
      shot(48.0, 48.8, cam([-5, B + 2.5, 8], [0, B + 0.8, 0], 52), cam([-3, B + 2.3, 7], [0, B + 0.8, 0], 52)),                                // above the clouds
      shot(48.8, 49.6, cam([-6, 14, -6], [8, 14, -18], 36), cam([-2, 14, -6], [8, 14, -18], 36)),                                              // airliner windows full of faces
      shot(49.6, 50.4, cam([-8.5, 9.4, -3], [-14, 10.2, -12], 42), cam([-9.5, 9.4, -4], [-14, 10.2, -12], 42)),                                // hero drifts past the balloon basket
      shot(50.4, 51.2, orbit([-14, 10.6, -12], 25, 6.0, 0.6, 40, 0, 0.12)),                                                                     // balloonist deadpan
      shot(51.2, 52.0, orbit([-14, 10.9, -12], 20, 4.6, 0.5, 36, 0, 0.12)),                                                                     // balloonist voice
      shot(52.0, 52.8, cam([0, 68, -9], [0, 28, -10], 50), cam([0, 62, -9], [0, 28, -10], 50)),                                                 // skydivers form a heart (top-down)
      shot(52.8, 53.2, cam([6, B + 3, 8], [0, B + 1, 0], 50)),                                                                                  // hero wide
      shot(53.2, 54.0, cam([-4, B + 2, 11], [0, B + 6, 0], 54), cam([-2, B + 2, 9], [0, B + 7, 0], 54)),                                        // balloons stream up (narration)
      shot(54.0, 54.8, cam([0, B + 1.5, 9], [0, B + 1.2, 0], 52), cam([0, B + 1.8, 7.5], [0, B + 1.4, 0], 52)),                                // CLOUD NINE: golden cloud + fireworks
      shot(54.8, 55.6, cam([-3, B + 3, 13], [4, B + 5, -10], 56), cam([-1, B + 3, 12], [4, B + 5, -10], 56)),                                  // rainbow + hearts
      shot(55.6, 56.4, orbit([0, B + 1.2, 0], 20, 4.2, 0.2, 38)),                                                                              // hero close, sun
      shot(56.4, 57.6, cam([0, B + 2, 12], [0, B + 3, 0], 56), cam([0, B + 20, 14], [0, B + 22, 0], 56)),                                      // rising towards space
    ];
    // slower edit: ~2 s shots, each holding the camera of the gag / voiced line it covers
    S.shots = regroup(S.shots, [[44.8, 46.4, 44.8], [46.4, 48.4, 46.8], [48.4, 50.4, 48.8], [50.4, 52.4, 51.2], [52.4, 54.8, 53.2], [54.8, 57.6, 54.0]]);
    S.shots[1].a = cam(F(4.9, 0.6, 0.9), F(3.4, 0.45, 3.0), 54); S.shots[1].b = cam(F(4.7, 0.55, 1.2), F(3.4, 0.4, 3.0), 50);   // held on Gerald in the grass; the hero lifts out of the top of frame during the roast
    return S;
  },
  frame(t, S, ctx) {
    const P = pick(S.shots, t), c = P.cam; const A = alt(t);
    // hero
    const grabbed = t >= 45.6; const hx = 0, hz = 0;
    place(S.hero, hx, A + (t < 46 ? 0 : 0), hz, 0.2 + Math.sin(t * 0.5) * 0.2);
    S.hero.pose(t < 45.6 ? { ...POSES.idle(t), aRf: 0.3, aRs: 1.0 } : { ...POSES.cheer(t * 0.4), bob: 0, lLk: 0.5, lRk: 0.5, lLf: 0.3, lRf: -0.1, aLs: 1.3, aLf: 0.2, aRs: 1.8, aRf: 0.3, aRe: 0.3 });
    S.hero.pose({ ...(t < 45.6 ? { ...POSES.idle(t), aRf: 0.3, aRs: 1.0 } : { bob: 0.05, lLk: 0.5, lRk: 0.5, lLf: 0.3, lRf: -0.1, aLs: 1.3, aLf: 0.2, aRs: 1.8, aRf: 0.3, aRe: 0.3, hx: -0.1, hL: 'open', hR: 'grip' }) });
    S.hero.face(t < 45.6 ? FACES.happy : { ...FACES.excited, open: 0.3 }); S.hero.refreshHeld();
    S.bunch.visible = t >= 45.0;
    
    // fans + their balloons
    S.fans.forEach((f, i) => { f.pose(POSES.cheer(t + i * 0.3)); f.face(FACES.happy); const rel = clamp((t - f.rel) / 1.2); if (f.bal) { f.bal.position.set(0.3, 0.9 + rel * rel * 60, 0.2); f.bal.visible = rel < 1; } });
    // swarm streaming up around the hero's altitude
    S.swarm.update((i) => { const p = S.swP[i]; if (t < 45.8) return null; const y = ((p.y0 + (t - 45.8) * p.sp * 6) % 120) + A - 60; return { x: p.x + Math.sin(t + p.ph) * 0.6, y, z: p.z, s: p.s * 0.8, ry: Math.sin(t * 0.7 + p.ph) * 0.4 }; });
    // Gerald watches from the grass
    S.catG.pose(APOSES.loaf(t)); S.catG.face({ lid: 0.55 }); S.catG.root.visible = t < 48.5;
    // balloonist
    S.ball.pose({ ...POSES.deadpan(t), aRf: 0.3 }); S.ball.face(t >= 51.2 && t < 52.2 ? { ...FACES.deadpan, open: ctx.mouth('balloonist_flat', t) * 0.6, lid: 0.25 } : { ...FACES.deadpan, lid: 0.3 }); S.hab.position.y = 10 + Math.sin(t * 0.8) * 0.3;
    S.liner.position.x = 10 - (t - 48.0) * 1.5; S.dive.update(t);
    // gold cloud + fireworks
    S.gold.visible = t >= 53.9 && t < 56.4; S.fire.forEach((f, i) => f.update(t - 54.0 - i * 0.18)); S.sp.position.set(0, 2, 0); S.sp.update(t);
    // dome fade to space
    const dk = clamp((t - 55.9) / 1.7); S.dome.material.opacity = dk * 0.95; S.stars.material.opacity = dk; S.dome.position.set(0, A, 0); S.stars.position.set(0, A, 0);
    const r = { cam: c, keyFocus: [0, A, 0], keyDist: 10 };
    if (t >= 54.0 && t < 54.4) r.flash = 0.7 * (1 - (t - 54.0) / 0.4);
    if (t >= 54.0 && t < 55.4) r.banner = { text: 'CLOUD NINE', y: 1170, t0: 54.0, size: 140, fill: '#ffe27a' };
    return r;
  },
};
