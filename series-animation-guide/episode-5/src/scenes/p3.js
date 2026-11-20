// P3 · MOON AND SUN (story 21.2-39.2): the satellite ring (technician 22.4), the Moon ahead, he clips the Moon (astronaut 26.4, Gerald stays on it r4),
// travel with Earth + Moon small below, the Sun puts on sunglasses, Jupiter, Saturn's rings (Gerald loafing on a ring, r5).
import { THREE, makeHero, makePerson, makeGerald, helmet, P, F, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, rng, mat, add, laPeace, speedLines, starBackground } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { makeEarth, makeMoon } from '../../../assets/library/props/world.js';
import { satellite, sunFace, bandedPlanet, saturn, moonFlag } from '../../../assets/library/props/space.js';

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
    const s15 = G(); const jup = bandedPlanet(22); jup.position.set(-10, -6, -50); jup.rotation.set(0.15, 0, 0.1); s15.add(jup);
    // shot 16: Saturn (Gerald loafing on the A ring)
    const s16 = G(); const sat = saturn(14); sat.position.set(0, -2, -14); sat.rotation.set(0.32, 0, 0.12); s16.add(sat);
    const lines = speedLines(scene, { n: 70, len: 2.4, R: 3.2 });
    return { stage, scene, hero, cat, s10, s11, s13, s14, s15, s16, earth, sats, tech, moon, astro, flag, earthS, e13, m13, sun, jup, sat, lines };
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
      hp = [0, 0, 0]; c = cam([1.8, -2.2, 4.6], [-0.4, 3.0, -4], 52);
    } else if (sh === 12) {
      // the clip: he grazes the limb at 26.2 and the Moon tumbles away; astronaut 26.4; Gerald stays on it
      const a = Math.max(0, t - 26.2), u = seg(t, 26.0, 29.2);
      S.moon.position.set(0, -a * a * 0.6, -a * 2.0); S.moon.rotation.set(0, 0.4, a * 0.35 + a * a * 0.06);
      S.astro.root.position.set(1.0, 9, 0.6); S.astro.root.rotation.y = 0.5;
      if (t >= 26.2 && t < 27.6) laPeace(S.astro, t, 'moon', ctx, { hx: -0.25, bob: Math.sin(t * 3) * 0.01 }); else { S.astro.pose({ ...POSES.shock(t), hx: -0.3 }); S.astro.face({ ...FACES.shock, open: 0.5 }); }
      cat.root.visible = true; S.moon.add(cat.root); cat.root.position.set(-1.2, 8.86, 1.0); cat.root.rotation.set(0.1, 0.6, 0.13); cat.root.scale.setScalar(1.2); cat.pose(APOSES.loaf(t)); cat.face(AFACES.bored);
      hp = [lerp(2.2, 1.8, u), lerp(9.6, 18, Math.pow(u, 1.3)), -1.8];
      S.moon.updateMatrixWorld(true); const cw = cat.root.getWorldPosition(new THREE.Vector3()), aw = S.astro.root.getWorldPosition(new THREE.Vector3());
      const ca = cam([aw.x + 1.4, aw.y + 1.6, aw.z + 6.0], [aw.x, aw.y + 1.0, aw.z], 44), cg = cam([cw.x + 1.2, cw.y + 1.0, cw.z + 3.2], [cw.x, cw.y + 0.5, cw.z], 44);
      c = t < 27.5 ? ca : mixCam(ca, cg, smooth(seg(t, 27.5, 28.1)));
      out.voiceY.moon = 1560;
    } else if (sh === 13) {
      S.e13.update(t); S.e13.rotation.y = t * 0.05; hp = [0, 0, 0];
      c = mixCam(cam([1.1, 3.3, 2.0], [0, -2.2, -1.6], 50), cam([1.0, 3.0, 1.8], [0, -2.4, -1.6], 50), smooth(seg(t, 29.2, 32.0)));
      hero.pose(P.streak(t)); hero.face({ ...F.fly, brow: 0.6, smile: 0.6 });
    } else if (sh === 14) {
      const u = seg(t, 32.0, 34.4), k = smooth(seg(t, 32.6, 33.3)); S.sun.setShades(k); S.sun.setMouth(t > 33.4 ? smooth(seg(t, 33.4, 33.8)) * 0.8 : 0);
      S.stage.key.position.set(-4, 4, -60); hp = [0.4, lerp(-2.4, 1.0, u), 2.0];
      c = cam([1.4, 0.6, 8.5], [-1.5, 2.6, -20], 48);
    } else if (sh === 15) {
      const u = seg(t, 34.4, 36.0); hp = [0.3, lerp(-1.4, 0.6, u), 2.4]; S.jup.rotation.y = t * 0.06;
      c = cam([1.1, 0.5, 7.6], [-1.4, 0.8, -18], 48);
    } else {
      // Saturn: Gerald on the ring (r5 36.8)
      const u = seg(t, 36.0, 39.2); S.sat.updateMatrixWorld(true);
      const onRing = S.sat.localToWorld(new THREE.Vector3(Math.cos(1.2) * 14 * 1.8, 0.05, Math.sin(1.2) * 14 * 1.8));
      cat.root.visible = true; S.scene.add(cat.root); cat.root.position.copy(onRing); cat.root.rotation.set(0.32, -0.6, 0.12); cat.root.scale.setScalar(1.4); cat.pose(APOSES.loaf(t)); cat.face(AFACES.sleepy);
      hp = [onRing.x + 1.3, onRing.y + lerp(-1.2, 2.2, u), onRing.z - 0.8];
      c = mixCam(cam([onRing.x + 4.4, onRing.y + 1.6, onRing.z + 6.2], [onRing.x + 0.8, onRing.y + 0.6, onRing.z], 44), cam([onRing.x + 4.0, onRing.y + 1.5, onRing.z + 5.6], [onRing.x + 0.8, onRing.y + 0.8, onRing.z], 44), smooth(u));
    }
    if (sh !== 12 && cat.root.parent !== S.scene) S.scene.add(cat.root);
    hero.root.position.set(...hp); if (sh !== 13) { hero.pose(P.rise(t)); hero.face(F.fly); }
    S.lines.set(t, hp, 1.2, 'y', sh === 13 ? 0.45 : 0.18);
    out.cam = c; out.keyFocus = hp; out.keyDist = 14;
    return out;
  },
};
