// P2 · TOWER AND SKY (story 10-21.2): past the Burj spire (tourist 10.4, Gerald on the tip r2), the airliner pilot (13.6),
// the sky turns black over the curve of the Earth (n2), the ISS (astronaut 18.4, Gerald in the cupola r3).
import { THREE, makeHero, makePerson, makeGerald, helmet, P, F, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, rng, mat, glow, add, box, cyl, cone, sph, tor, laPeace, speedLines, starBackground } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { makeEarth } from '../../../assets/library/props/world.js';
import { cloudFloor, cloud } from '../../../assets/library/props/sky.js';
import { issStation, cockpitNose } from '../../../assets/library/props/space.js';

function spire() {
  const g = new THREE.Group(), glass = mat(0x9ec4e8, { metal: 0.6, rough: 0.2 }), steel = mat(0xc8d4e0, { metal: 0.7, rough: 0.3 });
  for (let i = 0; i < 6; i++) { const r = 3.2 - i * 0.42; add(g, cyl(r * 0.92, r, 3.4, 6), glass, [0, -12 + i * 3.4, 0]); add(g, cyl(r + 0.05, r + 0.05, 0.12, 6), steel, [0, -10.3 + i * 3.4, 0]); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; add(g, box(0.08, 3.4, 0.08), steel, [Math.cos(a) * r * 0.96, -12 + i * 3.4, Math.sin(a) * r * 0.96]); } }
  // observation deck: glass ring with a floor (y 0), people inside
  add(g, cyl(2.6, 2.6, 0.18, 32), mat(0xe8e8ee), [0, -0.1, 0]); add(g, cyl(2.6, 2.6, 2.4, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }), [0, 1.2, 0]);
  add(g, cyl(2.65, 2.65, 0.2, 32), mat(0xe8e8ee), [0, 2.45, 0]); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; add(g, box(0.06, 2.4, 0.06), steel, [Math.cos(a) * 2.6, 1.2, Math.sin(a) * 2.6]); }
  add(g, cyl(0.8, 0.8, 2.4, 16), mat(0xd8d8e0), [0, 1.2, 0]);   // core
  for (let i = 0; i < 4; i++) add(g, cyl(1.9 - i * 0.4, 2.2 - i * 0.4, 2.4, 6), glass, [0, 3.7 + i * 2.4, 0]);
  add(g, cyl(0.12, 0.55, 9, 12), steel, [0, 17.0, 0]); add(g, cyl(0.03, 0.12, 2.6, 8), steel, [0, 22.7, 0]);
  add(g, sph(0.09, 10, 8), glow(0xff3a3a, 2), [0, 24.05, 0]);
  g.userData.tip = new THREE.Vector3(0, 24.0, 0); return g;
}

export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#3f86d8', '#bfe2ff'], ground: null, hemiI: 0.9, keyI: 2.4, keyPos: [6, 8, 7], fillI: 0.8, shadow: { extent: 10 } });
    const scene = stage.scene, bg = scene.background;
    const hero = makeHero(scene);
    // shot 6: the spire
    const sp = spire(); scene.add(sp);
    const tourist = makePerson(scene, 'tourist'); sp.add(tourist.root);
    const tourist2 = makePerson(scene, 'neighbourGranny'); sp.add(tourist2.root);
    const haze = add(scene, new THREE.CircleGeometry(3000, 48), mat(0xd8c8a8, { rough: 1 }), [0, -600, 0], [-Math.PI / 2, 0, 0]);
    // shot 7: the airliner nose above the clouds
    const plane = new THREE.Group(); scene.add(plane); const nose = cockpitNose(); plane.add(nose);
    const wingL = add(plane, box(14, 0.25, 3), mat(0xe8ecf2, { rough: 0.4 }), [0, -1.2, -7], [0, 0, 0.05]);
    const pilot = makePerson(scene, 'pilot'); nose.add(pilot.root);
    const clouds = cloudFloor(160, 120, 4); clouds.position.set(0, -14, -20); scene.add(clouds);
    // shot 8-9: space, the Earth, the ISS
    const space = new THREE.Group(); scene.add(space);
    const stars = starBackground(space, { n: 2400, R: 1500 });
    const earth = makeEarth(70); earth.position.set(0, -88, -30); space.add(earth);
    const iss = issStation(); space.add(iss);
    const astro = makePerson(scene, 'astronaut'); helmet(astro); iss.add(astro.root);
    const cat = makeGerald(scene);
    const lines = speedLines(scene, { n: 70, len: 2.2, R: 3.2 });
    return { stage, scene, bg, hero, sp, tourist, tourist2, haze, plane, nose, pilot, clouds, space, stars, earth, iss, astro, cat, lines };
  },
  frame(t, S, ctx) {
    const { hero, cat } = S, out = { voiceY: {}, roastY: 1580 };
    const sh6 = t < 12.8, sh7 = t >= 12.8 && t < 14.8, sh8 = t >= 14.8 && t < 18.0, sh9 = t >= 18.0;
    S.sp.visible = sh6; S.haze.visible = sh6; S.plane.visible = S.clouds.visible = sh7; S.space.visible = sh8 || sh9; S.iss.visible = sh9;
    S.scene.fog = null; S.lines.visible = true;
    let c;
    hero.root.scale.setScalar(1); hero.root.rotation.set(0, 0.35, 0);
    if (sh6) {
      // he rises beside the spire: deck (tourist, 10.4) -> tip (Gerald, r2 11.6)
      S.scene.background = S.bg;
      const y = lerp(-3.4, 27.5, Math.pow(seg(t, 10.0, 12.8), 1.35)); hero.root.position.set(3.4, y, 1.6); hero.pose(P.rise(t)); hero.face(F.fly);
      S.tourist.root.position.set(1.6, 0, 1.2); S.tourist.root.rotation.y = 1.0;
      if (t >= 10.1 && t < 11.6) laPeace(S.tourist, t, 'tourist', ctx, { hx: -0.3 }); else { S.tourist.pose({ ...POSES.shock(t), hx: -0.4 }); S.tourist.face({ ...FACES.shock, open: 0.6 }); }
      S.tourist2.root.position.set(-1.4, 0, 1.6); S.tourist2.root.rotation.y = 0.6; S.tourist2.pose({ ...POSES.point(t), aRf: 2.2, hx: -0.4 }); S.tourist2.face({ ...FACES.shock, open: 0.7 });
      cat.root.visible = true; S.sp.updateMatrixWorld(true); const tip = S.sp.localToWorld(S.sp.userData.tip.clone()); cat.root.position.set(tip.x, tip.y + 0.05, tip.z); cat.root.rotation.y = 0.9; cat.root.scale.setScalar(1.3); cat.pose(APOSES.sit(t)); cat.face(t > 11.6 ? AFACES.bored : AFACES.deadpan);
      const u = seg(t, 10.0, 12.8);
      c = t < 11.2 ? mixCam(cam([6.8, 1.6, 8.8], [1.6, 1.6, 0.6], 46), cam([6.8, 2.4, 8.6], [1.8, 2.4, 0.6], 46), smooth(seg(t, 10, 11.2)))
        : mixCam(cam([6.8, 2.4, 8.6], [1.8, 2.4, 0.6], 46), cam([5.6, 22.8, 6.6], [0.6, 24.4, 0], 44), smooth(seg(t, 11.2, 12.0)));
      out.voiceY.tourist = 1560; S.lines.set(t, [3.4, y, 1.6], 1.6, 'y', 0.3);
    } else if (sh7) {
      // the cockpit: the pilot looks up at him (13.6)
      S.scene.background = S.bg; S.scene.fog = new THREE.Fog(0xbfe2ff, 40, 260);
      S.plane.position.set(0, 0, 0); S.plane.rotation.set(0, 0, 0);
      const seat = S.nose.userData.seat; S.pilot.root.position.copy(seat); S.pilot.root.rotation.y = 0;
      const base = { ...POSES.sitOn(t, 0.42), hx: t > 13.3 ? -0.5 : 0, aRf: 0.9, aRe: 1.0, aLf: 0.9, aLe: 1.0 };
      if (t >= 13.4 && t < 14.6) laPeace(S.pilot, t, 'pilot', ctx, { ...base, ...POSES.laPeace(t), hx: -0.5, bob: base.bob, lLf: base.lLf, lRf: base.lRf, lLk: base.lLk, lRk: base.lRk, footFlat: 1 }); else { S.pilot.pose(base); S.pilot.face(t > 13.1 ? { ...FACES.shock, open: 0.5 } : FACES.neutral); }
      const y = lerp(-2.5, 9.5, Math.pow(seg(t, 12.8, 14.8), 1.1)); hero.root.position.set(-0.3, y * 0.55 - 1.0, 1.6); hero.root.rotation.y = 2.6; hero.pose(P.rise(t)); hero.face(F.fly);
      S.clouds.position.z = -20 + (t - 12.8) * 30;
      cat.root.visible = false;
      c = mixCam(cam([2.4, 1.5, 6.4], [0.0, 1.0, 0.4], 44), cam([2.1, 1.3, 5.6], [-0.1, 1.3, 0.4], 44), smooth(seg(t, 12.8, 14.8)));
      out.voiceY.pilot = 1600; S.lines.set(t, [-1.2, y, 4.2], 1.4, 'y', 0.25);
    } else {
      // space: blue fades to black over the curve of the Earth
      const k = smooth(seg(t, 14.8, 16.8));
      S.scene.background = new THREE.Color().setRGB(lerp(0.25, 0.0, k), lerp(0.52, 0.0, k), lerp(0.85, 0.02, k)); S.stars.material.uniforms.opacity.value = k;
      S.earth.update(t); S.earth.rotation.y = t * 0.01;
      if (sh8) {
        hero.root.position.set(0, (t - 14.8) * 0.6, 0); hero.root.rotation.y = 0.5; hero.pose(P.rise(t)); hero.face(F.fly); cat.root.visible = false;
        S.earth.position.set(0, -88 - (t - 14.8) * 3, -30);
        { const h = hero.root.position; c = mixCam(cam([h.x + 1.3, h.y + 3.4, h.z + 5.6], [h.x - 0.1, h.y + 0.1, h.z - 1.5], 50), cam([h.x + 1.4, h.y + 3.6, h.z + 6.4], [h.x - 0.1, h.y - 0.2, h.z - 1.5], 52), smooth(seg(t, 14.8, 18.0))); }
        S.lines.set(t, [0, hero.root.position.y, 0], 1.0, 'y', 0.2 * (1 - k));
      } else {
        // ISS: astronaut on the truss (18.4), Gerald nose to the cupola glass (r3)
        S.earth.position.set(0, -80, -30);
        S.iss.position.set(0, 0, 0); S.iss.rotation.set(0.15, -0.35, 0.05);
        S.astro.root.position.set(1.6, 0.14, 0.15); S.astro.root.rotation.y = 0.9;
        if (t >= 18.1 && t < 19.4) laPeace(S.astro, t, 'astro', ctx, { hx: -0.2 }); else { S.astro.pose({ ...POSES.shock(t), hx: -0.3 }); S.astro.face({ ...FACES.shock, open: 0.4 }); }
        S.iss.updateMatrixWorld(true); const cu = S.iss.userData.cupola.getWorldPosition(new THREE.Vector3());
        cat.root.visible = true; cat.root.scale.setScalar(1.15); cat.root.position.set(cu.x, cu.y - 0.85, cu.z); cat.root.rotation.y = 0.2; cat.pose({ ...APOSES.sit(t), hx: 0.5 }); cat.face(AFACES.deadpan);
        const y = lerp(-1.5, 4.5, seg(t, 18.0, 21.2)); hero.root.position.set(2.0, y, -1.6); hero.root.rotation.y = -0.4; hero.pose(P.rise(t)); hero.face(F.fly);
        c = t < 19.4 ? mixCam(cam([4.6, 1.2, 7.0], [1.4, 0.6, 0.6], 44), cam([4.4, 1.0, 6.4], [1.4, 0.6, 0.6], 44), smooth(seg(t, 18, 19.4)))
          : mixCam(cam([4.4, 1.0, 6.4], [1.4, 0.6, 0.6], 44), cam([cu.x + 1.0, cu.y - 1.9, cu.z + 2.6], [cu.x, cu.y - 0.65, cu.z], 42), smooth(seg(t, 19.4, 20.2)));
        out.voiceY.astro = 1560; S.lines.set(t, [3.4, y, 3], 0.8, 'y', 0.12);
      }
    }
    out.cam = c; out.keyFocus = hero.root.position.toArray(); out.keyDist = 14;
    return out;
  },
};
