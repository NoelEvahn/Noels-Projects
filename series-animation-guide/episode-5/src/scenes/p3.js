// P3 · MOON AND SUN (story 21.2-39.2): the satellite ring (technician 22.4), the Moon ahead, he clips the Moon (astronaut 26.4, Gerald stays on it r4),
// travel with Earth + Moon small below, the Sun puts on sunglasses, Jupiter, Saturn's rings (Gerald loafing on a ring, r5).
import { THREE, makeHero, makePerson, makeGerald, helmet, P, F, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, rng, mat, add, laPeace, speedLines, starBackground } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { makeEarth, makeMoon } from '../../../assets/library/props/world.js';
import { satellite, sunFace, bandedPlanet, saturn, moonFlag } from '../../../assets/library/props/space.js';
import { fireShell, shatterPlanet } from '../../../assets/library/fx/flight.js';

export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#000003', '#02030a'], ground: null, hemiI: 0.55, hemiSky: 0xcfe0ff, hemiGround: 0x303040, keyI: 2.8, keyPos: [8, 4, 9], fillI: 0.75, rimI: 0.6, env: 0, shadow: { extent: 12 } });
    const scene = stage.scene; starBackground(scene, { n: 2600, R: 1500 });
    const hero = makeHero(scene), cat = makeGerald(scene);
    const G = (n) => { const g = new THREE.Group(); scene.add(g); return g; };
    // shot 10: the satellite ring around the Earth + the technician on one
    const s10 = G(); const earth = makeEarth(40); earth.position.set(0, -60, -40); s10.add(earth);
    const sats = []; for (let i = 0; i < 9; i++) { const s = satellite(i + 1, 1); const a = -0.9 + i * 0.22; s.position.set(Math.sin(a) * 14, -2 + Math.cos(a * 2) * 1.0, -Math.cos(a) * 14 + 8); s.rotation.set(0.2, a, 0.1); s10.add(s); sats.push(s); }
    const tech = makePerson(scene, 'astronaut2'); helmet(tech); s10.add(tech.root);
    // shots 11-12: the Moon (radius 9), flag + astronaut on top; Gerald sits on it
    const s11 = G(); const moon = new THREE.Group(); s11.add(moon); const mm = makeMoon(9); moon.add(mm);
    const flag = moonFlag(); flag.position.set(-1.2, 9, 0.4); moon.add(flag);
    const astro = makePerson(scene, 'astronaut'); helmet(astro); moon.add(astro.root); astro.root.position.set(1.0, 9, 0.6);
    const earthS = makeEarth(3); earthS.position.set(-30, 6, -80); s11.add(earthS);
    // shot 13: travel: Earth and Moon small below
    const s13 = G(); const e13 = makeEarth(2.2); e13.position.set(-3, -26, -20); s13.add(e13); const m13 = makeMoon(0.6); m13.position.set(3.0, -22, -14); s13.add(m13);
    // shot 14: the Sun with sunglasses
    const s14 = G(); const sun = sunFace(16); sun.position.set(-4, 4, -60); s14.add(sun); const sunL = new THREE.PointLight(0xffd890, 3000, 0, 1.4); sunL.position.copy(sun.position); s14.add(sunL);
    // shot 15: Jupiter
    const s15 = G(); const jup = shatterPlanet(13, { hit: [0, 1, 0] }); jup.position.set(0, 19, 0); jup.rotation.set(0, 0, 0.12); s15.add(jup);   // v3 spike: he punches straight through Jupiter
    const fire = fireShell(); scene.add(fire);
    // shot 16: Saturn (Gerald loafing on the A ring)
    const s16 = G(); const sat = saturn(14); sat.position.set(0, -2, -14); sat.rotation.set(0.32, 0, 0.12); s16.add(sat);
    const lines = speedLines(scene, { n: 70, len: 2.4, R: 3.2 });
    return { fire, stage, scene, hero, cat, s10, s11, s13, s14, s15, s16, earth, sats, tech, moon, astro, flag, earthS, e13, m13, sun, jup, sat, lines };
  },
  frame(t, S, ctx) {
    const { hero, cat } = S, out = { voiceY: {}, roastY: 1580 };
    const sh = t < 23.6 ? 10 : t < 26.0 ? 11 : t < 29.2 ? 12 : t < 32.0 ? 13 : t < 34.4 ? 14 : t < 36.0 ? 15 : 16;
    S.s10.visible = sh === 10; S.s11.visible = sh === 11 || sh === 12; S.s13.visible = sh === 13; S.s14.visible = sh === 14; S.s15.visible = sh === 15; S.s16.visible = sh === 16;
    cat.root.visible = false; cat.root.scale.setScalar(1); hero.root.scale.setScalar(1); hero.root.rotation.set(0, 0.4, 0);
    S.stage.key.position.set(8, 4, 9); let c, hp;
    if (sh === 10) {
      S.earth.update(t);
      const y = lerp(-3.0, 6.0, seg(t, 21.2, 23.6)); hp = [2.4, y, 4.2];
      const s = S.sats[4]; S.tech.root.position.set(s.position.x + 0.2, s.position.y + 0.6, s.position.z + 0.3); S.tech.root.rotation.y = 0.6;
      if (t >= 22.1 && t < 23.4) laPeace(S.tech, t, 'tech', ctx, { hx: -0.3, lLf: 0.2, lRf: -0.1 }); else { S.tech.pose({ ...POSES.float(t), hx: -0.3 }); S.tech.face({ ...FACES.shock, open: 0.4 }); }
      const f = S.tech.root.position; c = mixCam(cam([f.x + 4.2, f.y + 0.8, f.z + 6.0], [f.x + 0.9, f.y + 0.9, f.z], 42), cam([f.x + 3.8, f.y + 0.7, f.z + 5.4], [f.x + 0.9, f.y + 0.9, f.z], 42), smooth(seg(t, 21.2, 23.6)));
      hp = [f.x + 1.2, f.y + y * 0.4, f.z - 2.0]; out.voiceY.tech = 1560;
    } else if (sh === 11) {
      // the Moon grows ahead (above him)
      const u = seg(t, 23.6, 26.0); S.moon.position.set(-1, lerp(34, 18, smooth(u)), -26); S.moon.rotation.set(0, t * 0.05, 0);
      hp = [0, 0, 0]; { const az = lerp(40, 130, smooth(u)) * Math.PI / 180; c = cam([Math.sin(az) * 3.4, -1.6, Math.cos(az) * 3.4], [-0.15, 1.9, -1.0], 66); }   // v3 (notes #15, #19): under him, circling, he stays in frame
    } else if (sh === 12) {
      // the clip: he grazes the limb at 26.2 and the Moon tumbles away; astronaut 26.4; Gerald stays on it
      const a = Math.max(0, t - 26.2), u = seg(t, 26.0, 29.2);
      S.moon.position.set(0, -a * a * 0.6, -a * 2.0); S.moon.rotation.set(0, 0.4, a * 0.35 + a * a * 0.06);
      S.astro.root.position.set(1.0, 9, 0.6); S.astro.root.rotation.y = 0.5;
      if (t >= 26.2 && t < 27.6) laPeace(S.astro, t, 'moon', ctx, { hx: -0.25, bob: Math.sin(t * 3) * 0.01 }); else { S.astro.pose({ ...POSES.shock(t), hx: -0.3 }); S.astro.face({ ...FACES.shock, open: 0.5 }); }
      cat.root.visible = true; if (cat.root.parent !== S.scene) S.scene.add(cat.root); S.moon.updateMatrixWorld(true);   // v3 (note #14): world-space placement; parenting him to the tumbling Moon broke the rig (he floated and jumped)
      { const mc = S.moon.getWorldPosition(new THREE.Vector3()); cat.root.position.set(mc.x - 0.3, mc.y + 9.0, mc.z + 0.6); cat.root.rotation.set(0, 0.6, 0); cat.root.scale.setScalar(1.2); }   // always sits on the Moon's current top while it tumbles (upright: the rig breaks when tilted) cat.pose(APOSES.loaf(t)); cat.face(AFACES.bored);
      hp = [lerp(2.2, 1.8, u), lerp(9.6, 18, Math.pow(u, 1.3)), -1.8];
      S.moon.updateMatrixWorld(true); const cw = cat.root.getWorldPosition(new THREE.Vector3()), aw = S.astro.root.getWorldPosition(new THREE.Vector3());
      const ca = cam([aw.x + 1.4, aw.y + 1.6, aw.z + 6.0], [aw.x, aw.y + 1.0, aw.z], 44), nrm = cw.clone().sub(S.moon.getWorldPosition(new THREE.Vector3())).normalize(), sd = new THREE.Vector3(0.5, 0, 1).addScaledVector(nrm, -new THREE.Vector3(0.5, 0, 1).dot(nrm)).normalize(), cp = cw.clone().addScaledVector(nrm, 0.9).addScaledVector(sd, 3.0), cg = cam(cp.toArray(), cw.clone().addScaledVector(nrm, 0.3).toArray(), 44);   // v3 (note #14): camera rides the Moon's surface normal so the tumble never hides him   // v3 (note #14): low, so the ground he sits on is in frame
      c = t < 27.5 ? ca : mixCam(ca, cg, smooth(seg(t, 27.5, 28.1)));
      out.voiceY.moon = 1560; if (t >= 27.4) out.shakeK = 0;   // no counter-tick shake on the Gerald close-up (read as him jumping)
    } else if (sh === 13) {
      S.e13.update(t); S.e13.rotation.y = t * 0.05; hp = [0, 0, 0];
      // v3 spike: a fast drone orbit, 360 degrees round him, dipping under his feet and back up (Earth + Moon below)
      const u = seg(t, 29.2, 32.0), az = (20 + 360 * (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2)) * Math.PI / 180, d = lerp(3.0, 3.8, Math.sin(Math.PI * u));
      c = cam([Math.sin(az) * d, 1.0 + lerp(2.4, -1.6, Math.sin(Math.PI * u)) + 1.2 * u, Math.cos(az) * d], [0, 1.0, 0], 50);
      hero.pose(P.streak(t)); hero.face({ ...F.fly, brow: 0.6, smile: 0.6 });
    } else if (sh === 14) {
      const u = seg(t, 32.0, 34.4), k = smooth(seg(t, 32.6, 33.3)); S.sun.setShades(k); S.sun.setMouth(t > 33.4 ? smooth(seg(t, 33.4, 33.8)) * 0.8 : 0);
      S.stage.key.position.set(-4, 4, -60); hp = [0.4, lerp(-2.4, 1.0, u), 2.0];
      hero.root.rotation.y = Math.PI + 0.2; c = cam([1.5, hp[1] + 1.6, 4.9], [-0.7, hp[1] + 0.9, -8], 50);   // v3 (note #15): over his shoulder, he faces the Sun
    } else if (sh === 15) {
      // he rises into Jupiter's south pole at 35.0 and bursts out of the top; chunks fly past the lens
      const u = seg(t, 34.4, 36.0), hit = 35.0; hp = [0, t < hit ? lerp(-9, 4.6, seg(t, 34.4, hit)) : 4.6 + 75 * (t - hit), 0]; S.jup.rotation.y = 0.3 + t * 0.04; S.jup.set(t - hit);
      const a = t - hit; c = cam([lerp(14, 20, u), lerp(-16, -10, u), lerp(30, 40, u)], [0, t < hit ? lerp(4, 10, seg(t, 34.4, hit)) : 10 + a * 24, 0], 58);   // stays outside: Jupiter big at the top, he rises in from below
      hero.root.scale.setScalar(2.2);
      if (t > 35.35) { const w = smooth(seg(t, 35.35, 36.0)); c = mixCam(c, cam([60, 10, 120], [0, 22, 0], 55), w); out.far = 4000; }   // v4: pull way back on the debris field
      if (a >= 0 && a < 0.4) out.flash = Math.max(0, 1 - a / 0.25) * 0.8; out.flashColor = '255,190,120';
    } else {
      // Saturn: Gerald on the ring (r5 36.8)
      const u = seg(t, 36.0, 39.2); S.sat.updateMatrixWorld(true);
      const onRing = S.sat.localToWorld(new THREE.Vector3(Math.cos(1.2) * 14 * 1.8, 0.05, Math.sin(1.2) * 14 * 1.8));
      cat.root.visible = true; S.scene.add(cat.root); cat.root.position.copy(onRing); cat.root.rotation.set(0.32, -0.6, 0.12); cat.root.scale.setScalar(1.4); cat.pose(APOSES.loaf(t)); cat.face(AFACES.sleepy);
      hp = [onRing.x + 1.3, onRing.y + lerp(-1.2, 2.2, u), onRing.z - 0.8];
      c = mixCam(cam([onRing.x + 2.2, onRing.y + 7.5, onRing.z + 3.2], [onRing.x + 0.6, onRing.y, onRing.z], 46), cam([onRing.x + 3.4, onRing.y + 4.2, onRing.z + 4.6], [onRing.x + 0.7, onRing.y + 0.6, onRing.z], 46), smooth(u));   // v3 (note #15): high top-down onto the ring, settling
    }
    if (sh !== 12 && cat.root.parent !== S.scene) S.scene.add(cat.root);
    if (sh !== 15) hero.root.scale.setScalar(1);
    hero.root.position.set(...hp); if (sh !== 13) { hero.pose(P.rise(t)); hero.face(F.fly); }
    S.lines.set(t, hp, 1.2, 'y', sh === 13 ? 0.45 : 0.18);
    S.fire.set(sh === 15 ? 0.85 : 0, t, hp, 1.75); S.fire.scale.setScalar(hero.root.scale.y);
    out.cam = c; out.keyFocus = hp; out.keyDist = 14;
    return out;
  },
};
