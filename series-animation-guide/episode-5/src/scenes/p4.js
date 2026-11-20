// P4 · VOYAGER AND BEYOND (story 39.2-53.2): Voyager 1 with googly eyes (radio la peace 40.4, Gerald on the dish), Voyager small below (n3),
// the Oort cloud (icy rocks bounce off him, Gerald on a comet), the Sun one star among many, Proxima (alien with a telescope 48.4), star streaks.
import { THREE, makeHero, makePerson, makeGerald, antennae, P, F, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, rng, mat, glow, add, sph, laPeace, speedLines, starBackground, glowPoints, hash } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { voyager1, icyRock, comet, telescope, tinyPlanet } from '../../../assets/library/props/space.js';

export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#000003', '#02030a'], ground: null, hemiI: 0.55, hemiSky: 0xcfe0ff, hemiGround: 0x303040, keyI: 2.6, keyPos: [8, 4, 9], fillI: 0.75, rimI: 0.6, env: 0, shadow: { extent: 12 } });
    const scene = stage.scene; const stars = starBackground(scene, { n: 2800, R: 1500 });
    const hero = makeHero(scene), cat = makeGerald(scene);
    const G = () => { const g = new THREE.Group(); scene.add(g); return g; };
    const s17 = G(); const voy = voyager1(); s17.add(voy);
    const s18 = G(); const voySmall = voyager1(); voySmall.scale.setScalar(0.5); s18.add(voySmall);
    // Oort: icy rocks (seeded), a comet with Gerald on it
    const s19 = G(); const r = rng(19); const rocks = Array.from({ length: 28 }, (_, i) => { const m = icyRock(i + 3, r.range(0.25, 0.9)); m.castShadow = true; s19.add(m); return { m, p: [r.range(-7, 7), r.range(-6, 14), r.range(-14, 2)], sp: r.range(0.3, 1.2), rot: [r.range(-1, 1), r.range(-1, 1)] }; });
    const com = comet(1.0); s19.add(com);
    // the Sun as one star among many: a warm star + marker ring
    const s20 = G(); const sunStar = glowPoints(new Float32Array([0, 0, 0]), new Float32Array([1, 0.85, 0.4]), { size: 38, attenuate: false }); sunStar.position.set(-2.5, -9, -40); s20.add(sunStar);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.12, 48), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, toneMapped: false })); ring.position.copy(sunStar.position); s20.add(ring);
    const dense = starBackground(s20, { n: 1500, R: 60, seed: 9 });
    // Proxima: a red dwarf + a tiny planet with an alien at a telescope
    const s21 = G(); const prox = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 24), new THREE.MeshBasicMaterial({ color: 0xff5a2a, toneMapped: false })); prox.position.set(-8, 6, -40); s21.add(prox);
    const proxL = new THREE.PointLight(0xff7a4a, 1500, 0, 1.3); proxL.position.copy(prox.position); s21.add(proxL);
    const planet = tinyPlanet(2.4, 0x7a5ab8); s21.add(planet);
    const alien = makePerson(scene, 'alien'); antennae(alien); planet.add(alien.root);
    const scope = telescope(); planet.add(scope);
    const lines = speedLines(scene, { n: 120, len: 3.0, R: 3.4 });
    return { stage, scene, stars, hero, cat, s17, s18, s19, s20, s21, voy, voySmall, rocks, com, sunStar, ring, prox, planet, alien, scope, lines };
  },
  frame(t, S, ctx) {
    const { hero, cat } = S, out = { voiceY: {}, roastY: 1580 };
    const sh = t < 41.2 ? 17 : t < 43.6 ? 18 : t < 45.6 ? 19 : t < 48.0 ? 20 : t < 50.4 ? 21 : 22;
    for (const k of [17, 18, 19, 20, 21]) S['s' + k].visible = sh === k;
    cat.root.visible = false; hero.root.scale.setScalar(1); hero.root.rotation.set(0, 0.4, 0);
    let c, hp, pose = P.rise(t), face = F.fly, lineK = 0.18, lineSp = 1.2;
    if (sh === 17) {
      // Voyager passes below him; the googly eyes follow him; Gerald sits on the dish rim
      const u = seg(t, 39.2, 41.2); S.voy.position.set(-0.3, -1.6, -1.0); S.voy.rotation.set(1.15, 0.0 + u * 0.15, 0); S.voy.look(t, [0.3, 1]);
      S.voy.updateMatrixWorld(true); const rim = S.voy.userData.dish.localToWorld(new THREE.Vector3(-1.5, 0.45, -0.6));
      cat.root.visible = true; cat.root.position.copy(rim); cat.root.rotation.set(0, 0.5, 0); cat.root.scale.setScalar(1.25); cat.pose(APOSES.sit(t)); cat.face(AFACES.judging);
      hp = [1.2, lerp(0.2, 3.0, u), -1.4];
      c = mixCam(cam([1.6, 1.6, 8.6], [0.2, 0.3, 0], 46), cam([1.5, 1.7, 8.0], [0.3, 0.6, 0], 46), smooth(u));
    } else if (sh === 18) {
      // face close, Voyager small below (n3 starts 41.6)
      const u = seg(t, 41.2, 43.6); S.voySmall.position.set(-0.6, lerp(-7, -10, u), -3); S.voySmall.rotation.set(-1.0, t * 0.3, 0); S.voySmall.look(t, [0, 1]);
      hp = [0, 0, 0]; pose = P.streak(t); face = { ...F.fly, smile: 0.7, lid: 0.2 };
      c = mixCam(cam([1.0, 3.2, 1.9], [0, -2.4, -1.8], 50), cam([0.9, 3.0, 1.7], [0, -2.6, -1.8], 50), smooth(u)); lineK = 0.4;
    } else if (sh === 19) {
      // Oort cloud: rocks bounce off him (deterministic: each hits once at its own time), Gerald loafs on a comet
      const u = seg(t, 43.6, 45.6); hp = [0, lerp(-0.6, 0.6, u), 0];
      S.rocks.forEach((o, i) => { const tt = t - 43.6; let y = o.p[1] - tt * 5 * o.sp, x = o.p[0], z = o.p[2]; if (i < 5) { const hit = 0.3 + i * 0.32, a = tt - hit; const h0 = [0.4 * (i % 2 ? 1 : -1), 1.4 + 0.2 * i, 0.3]; if (a < 0) { x = h0[0] + 0.1; y = h0[1] + 3.0 * (-a) * 2; z = h0[2]; } else { x = h0[0] + (i % 2 ? 1 : -1) * a * 4; y = h0[1] + a * 1.5; z = h0[2] + a * 2.5; } } o.m.position.set(x, y + hp[1], z); o.m.rotation.set(o.rot[0] * t, o.rot[1] * t, 0); });
      S.com.position.set(-2.2, lerp(2.5, -1.0, u), -5.0); S.com.rotation.set(0, 0.5, -0.5);
      cat.root.visible = true; S.com.updateMatrixWorld(true); const top = S.com.localToWorld(new THREE.Vector3(0, 0.7, 0)); cat.root.position.copy(top); cat.root.rotation.set(0, 0.4, 0); cat.root.scale.setScalar(1.3); cat.pose(APOSES.loaf(t)); cat.face(AFACES.sleepy);
      pose = { ...P.rise(t), hx: -0.1 + Math.sin(t * 9) * 0.05 }; face = { ...F.fly, open: 0.2 };
      c = mixCam(cam([1.6, 2.2, 7.0], [-0.7, 0.9, -1.5], 46), cam([1.4, 2.0, 6.4], [-0.7, 0.9, -1.5], 46), smooth(u));
    } else if (sh === 20) {
      // the Sun is now one star among many (marked)
      const u = seg(t, 45.6, 48.0); hp = [-0.3, lerp(-0.6, 0.2, u), 0.6]; S.ring.lookAt(0, 0, 10); S.ring.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
      pose = { ...P.rise(t), hy: -0.8, twist: -0.3 }; face = { ...FACES.question, open: 0.3 };
      c = cam([0.9, 2.4, 4.8], [-0.6, -1.2, -6], 50);
      out.label = { text: 'THE SUN', pos: S.sunStar.position.clone().add(new THREE.Vector3(0, -2.2, 0)) };
    } else if (sh === 21) {
      // Proxima b-ish tiny planet: alien at a telescope, la peace 48.4
      const u = seg(t, 48.0, 50.4); S.planet.position.set(0, -2.4, -1); S.planet.rotation.set(0, 0.2, 0);
      S.alien.root.position.set(0.0, 2.38, 0.2); S.alien.root.rotation.set(0, 0.4, 0);
      if (t >= 48.1 && t < 49.6) laPeace(S.alien, t, 'alien', ctx, { hx: -0.35 }); else { S.alien.pose({ ...POSES.point(t), aRf: 2.2, hx: -0.35 }); S.alien.face({ ...FACES.shock, open: 0.6, eye: 1.3 }); }
      S.scope.position.set(-0.7, 2.38, 0.1); S.scope.rotation.set(0, 0.6, 0);
      hp = [1.3, lerp(-0.2, 3.4, u), -1.8];
      c = mixCam(cam([1.2, 1.4, 5.4], [0.2, 0.9, -1], 44), cam([1.1, 1.5, 5.0], [0.2, 1.0, -1], 44), smooth(u)); out.voiceY.alien = 1560;
    } else {
      // star streaks, face close
      hp = [0, 0, 0]; pose = P.streak(t); face = { ...F.fly, smile: 0.8, wide: 1.2, brow: 0.6 };
      c = mixCam(cam([0.9, 1.6, 3.9], [0, 1.55, 0], 44), cam([0.8, 1.55, 3.5], [0, 1.55, 0], 44), smooth(seg(t, 50.4, 53.2))); lineK = 0.85; lineSp = 3.5;
    }
    hero.root.position.set(...hp); hero.pose(pose); hero.face(face);
    S.lines.set(t, hp, lineSp, 'y', lineK);
    out.cam = c; out.keyFocus = hp; out.keyDist = 14;
    return out;
  },
};
