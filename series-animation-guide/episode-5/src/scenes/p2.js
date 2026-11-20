// P2 · TOWER AND SKY (story 10-21.2): past the Burj spire (tourist 10.4, Gerald on the tip r2), the airliner pilot (13.6),
// the sky turns black over the curve of the Earth (n2), the ISS (astronaut 18.4, Gerald in the cupola r3).
import { THREE, makeHero, makePerson, makeGerald, helmet, P, F, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, rng, mat, glow, add, box, cyl, cone, sph, tor, laPeace, speedLines, starBackground } from '../common.js';
import { rbox } from '../../../assets/library/util.js';
import { makeStage } from '../../../assets/library/stage.js';
import { makeEarth } from '../../../assets/library/props/world.js';
import { cloudFloor, cloud } from '../../../assets/library/props/sky.js';
import { issStation, cockpitNose } from '../../../assets/library/props/space.js';
import { skyline } from '../../../assets/library/props/world.js';
import { phone } from '../../../assets/library/props/home.js';
import { fireShell, cloudRush } from '../../../assets/library/fx/flight.js';

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
  // v3 detail (note #10): Y-plan setback wings with floor bands below the deck, tier rings + vertical fins above, beacon lights
  const band = mat(0xeef3f8, { metal: 0.4, rough: 0.35 }), dark = mat(0x5a7a9a, { metal: 0.6, rough: 0.25 });
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + Math.PI / 6; const w = new THREE.Group(); w.rotation.y = -a; g.add(w);
    for (let i = 0; i < 4; i++) { const L = 4.6 - i * 0.9, y0 = -12 + i * 2.6; add(w, box(L, 2.6, 1.5), glass, [3.0 + L / 2 - 1.6, y0 + 1.3, 0]);
      for (let f = 0; f < 6; f++) add(w, box(L + 0.04, 0.06, 1.54), band, [3.0 + L / 2 - 1.6, y0 + 0.2 + f * 0.43, 0]);
      add(w, box(0.12, 2.6, 1.56), dark, [3.0 + L - 1.6, y0 + 1.3, 0]); } }
  for (let i = 0; i < 4; i++) { const r0 = 1.9 - i * 0.4, y0 = 3.7 + i * 2.4;
    for (let f = 0; f < 4; f++) add(g, cyl(r0 + 0.04, r0 + 0.04, 0.05, 6), band, [0, y0 - 1.1 + f * 0.6, 0]);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; add(g, box(0.07, 2.4, 0.16), steel, [Math.cos(a) * (r0 + 0.04), y0, Math.sin(a) * (r0 + 0.04)], [0, -a, 0]); } }
  for (let i = 0; i < 6; i++) add(g, cyl(0.16 - i * 0.015, 0.16 - i * 0.015, 0.05, 10), band, [0, 13.5 + i * 1.3, 0]);
  for (const y of [12.6, 18.5, 21.5]) add(g, sph(0.07, 8, 6), glow(0xff3a3a, 1.6), [0, y, 0.2]);
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
    // v3 (note #10): more tourists on the deck, phones up, snapping photos (flash pops)
    const TP = [{ skin: 0xf2c3a0, hair: { style: 'bun', color: 0x2a1a10 }, outfit: { type: 'tee', color: 0x2fb7a0 }, pants: { type: 'long', color: 0x2a3a5a }, shoes: 0xffffff, acc: ['sunglasses'], seed: 41 },
      { skin: 0x8a5a3a, hair: { style: 'short', color: 0x15100c }, outfit: { type: 'hoodie', color: 0xffd23f }, pants: { type: 'shorts', color: 0x3a6ad0 }, shoes: 0x222222, acc: ['cap:0xd9262c'], seed: 42 },
      { skin: 0xe8b48a, hair: { style: 'long', color: 0xc89a5a }, outfit: { type: 'tee', color: 0xff6a9a }, pants: { type: 'long', color: 0xf2f2f2 }, shoes: 0xffffff, seed: 43 },
      { skin: 0xd9a078, hair: { style: 'short', color: 0x5a3a1a }, outfit: { type: 'tee', color: 0x7a4ad0 }, pants: { type: 'shorts', color: 0xc8b48a }, shoes: 0x3a2a1a, acc: ['backpack:0x3a8a6a'], seed: 44 }];
    const snappers = TP.map((pre) => { const ch = makePerson(scene, pre); sp.add(ch.root); const ph = phone(0x9fd6ff); ph.position.set(0, 0.02, 0.06); ph.rotation.set(-Math.PI / 2, 0, 0); ch.holdR.add(ph);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); fl.position.set(0, 0.1, 0); ph.add(fl); return { ch, fl }; });
    { const cityB = skyline({ n: 60, spread: 900, hmin: 20, hmax: 140, seed: 9, palette: [0xd8c8a8, 0xc8b898, 0xb8c8d8, 0xe0d0b8] }); cityB.scale.set(1, 1.6, 1); cityB.position.set(0, -600, 0); scene.add(cityB); scene.userData.cityB = cityB; }   // v3 (note #10): Dubai below the deck
    const haze = add(scene, new THREE.CircleGeometry(3000, 48), mat(0xd8c8a8, { rough: 1 }), [0, -600, 0], [-Math.PI / 2, 0, 0]);
    // shot 7: the airliner nose above the clouds
    const plane = new THREE.Group(); scene.add(plane); const nose = cockpitNose(); plane.add(nose);
    const wingL = add(plane, box(14, 0.25, 3), mat(0xe8ecf2, { rough: 0.4 }), [0, -1.2, -7], [0, 0, 0.05]);
    const pilot = makePerson(scene, 'pilot'); nose.add(pilot.root);
    // v3 (note #11): cockpit interior: two seats, a co-pilot, yokes, glowing screens, an overhead panel, the cabin door behind
    { const seatM = mat(0x2a2d36, { rough: 0.6 }), sx = [0, 0.75];
      for (const x of sx) { add(nose, rbox(0.55, 0.12, 0.55, 0.04), seatM, [x, -0.55, 0.5]); add(nose, rbox(0.55, 0.8, 0.12, 0.04), seatM, [x, -0.1, 0.2]); add(nose, cyl(0.015, 0.015, 0.35, 6), mat(0x15151c), [x, -0.05, 1.05], [0.6, 0, 0]); add(nose, box(0.28, 0.05, 0.05), mat(0x15151c), [x, 0.1, 1.15]); }
      for (const [x, c] of [[-0.35, 0x3a8ad6], [0.15, 0x4cd07a], [0.6, 0x3a8ad6], [1.0, 0xffb040]]) add(nose, box(0.22, 0.16, 0.02), glow(c, 0.9), [x, 0.28, 1.31]);
      add(nose, rbox(1.3, 0.08, 0.5, 0.03), mat(0x2a2d36), [0.35, 1.25, 0.6]); for (let i = 0; i < 10; i++) add(nose, box(0.04, 0.02, 0.04), glow(i % 3 ? 0xffffff : 0xff4a4a, 0.8), [-0.15 + i * 0.1, 1.2, 0.75]);
      add(nose, box(1.8, 2.0, 0.06), mat(0xe8e4dc, { rough: 0.7 }), [0.35, 0.3, -0.5]); add(nose, box(0.6, 1.6, 0.07), mat(0x8a96a8), [0.35, 0.1, -0.47]);
      const co = makePerson(scene, { skin: 0x8a5a3a, hair: { style: 'short', color: 0x15100c }, outfit: { type: 'suit', color: 0x1f2f5a }, pants: { type: 'long', color: 0x1f2f5a }, shoes: 0x111111, acc: ['cap:0x1f2f5a', 'tie:0xffd23f'], seed: 51 }); nose.add(co.root); co.root.position.set(0.75, -0.5, 0.55); co.root.userData.co = 1; nose.userData.co = co; }
    const clouds = cloudFloor(160, 120, 4); clouds.position.set(0, -14, -20); scene.add(clouds);
    // shot 8-9: space, the Earth, the ISS
    const space = new THREE.Group(); scene.add(space);
    const stars = starBackground(space, { n: 2400, R: 1500 });
    const earth = makeEarth(70); earth.position.set(0, -88, -30); space.add(earth);
    const iss = issStation(); space.add(iss);
    const astro = makePerson(scene, 'astronaut'); helmet(astro); iss.add(astro.root);
    const cat = makeGerald(scene);
    const lines = speedLines(scene, { n: 70, len: 2.2, R: 3.2 });
    const fire = fireShell(); scene.add(fire); const rush = cloudRush(); scene.add(rush);
    // v3 (note #13): breaking out of the atmosphere: a glowing sky skin he tears through, an expanding shock ring, a vapour cone round him
    const addM = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const skin = new THREE.Mesh(new THREE.RingGeometry(1, 60, 96, 1), addM(0x4aa8ff, 0.3)); skin.rotation.x = -Math.PI / 2; scene.add(skin);
    const tearRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 10, 96), addM(0xdff4ff, 1)); tearRing.rotation.x = Math.PI / 2; scene.add(tearRing);
    const tearRing2 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 96), addM(0x7fc8ff, 1)); tearRing2.rotation.x = Math.PI / 2; scene.add(tearRing2);
    const vapor = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.2, 32, 1, true), addM(0xffffff, 0.15)); scene.add(vapor);   // v3: he heats into a fireball; POV clouds
    return { skin, tearRing, tearRing2, vapor, snappers, fire, rush, stage, scene, bg, hero, sp, tourist, tourist2, haze, plane, nose, pilot, clouds, space, stars, earth, iss, astro, cat, lines };
  },
  frame(t, S, ctx) {
    const { hero, cat } = S, out = { voiceY: {}, roastY: 1580 };
    const sh6 = t < 12.8, sh7 = t >= 12.8 && t < 14.8, sh8 = t >= 14.8 && t < 18.0, sh9 = t >= 18.0;
    S.sp.visible = sh6; S.haze.visible = sh6; S.scene.userData.cityB.visible = sh6; S.plane.visible = S.clouds.visible = sh7; S.space.visible = sh8 || sh9; S.iss.visible = sh9;
    S.scene.fog = null; S.lines.visible = true;
    let c;
    hero.root.scale.setScalar(1); hero.root.rotation.set(0, 0.35, 0);
    if (sh6) {
      // he rises beside the spire: deck (tourist, 10.4) -> tip (Gerald, r2 11.6)
      S.scene.background = S.bg;
      const y = lerp(-3.4, 27.5, Math.pow(seg(t, 10.0, 12.8), 1.35)); hero.root.position.set(3.4, y, 1.6); hero.pose(P.rise(t)); hero.face(F.fly);
      S.tourist.root.position.set(1.6, 0, 1.2); S.tourist.root.rotation.y = 1.0;
      if (t >= 10.1 && t < 11.6) laPeace(S.tourist, t, 'tourist', ctx, { hx: -0.3 }); else { S.tourist.pose({ ...POSES.shock(t), hx: -0.4 }); S.tourist.face({ ...FACES.shock, open: 0.6 }); }
      S.snappers.forEach(({ ch, fl }, i) => { const P0 = [[0.9, 0, 2.15, 1.2], [2.0, 0, 0.3, 1.45], [-0.3, 0, 2.3, 0.9], [1.9, 0, -0.9, 1.7]][i]; ch.root.position.set(P0[0], 0, P0[2]); ch.root.rotation.y = P0[3];
        ch.pose({ aRs: 0.25, aRf: 1.9 + Math.sin(t * 2 + i) * 0.08, aRe: 0.35, hR: 'grip', aLf: 0.9, aLe: 1.1, hx: -0.35 - 0.1 * Math.sin(t + i), lean: -0.05 }); ch.face({ ...FACES.shock, open: 0.45 + 0.2 * Math.sin(t * 3 + i) });
        const ph = (t * 2.3 + i * 0.37) % 1; fl.visible = ph < 0.06; fl.scale.setScalar(1 + ph * 20); });
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
      const y = lerp(-2.5, 9.5, Math.pow(seg(t, 12.8, 14.8), 1.1)); hero.root.position.set(0.9, y * 0.55 - 1.0, 3.6); hero.root.rotation.y = 0.5;   // v3 (note #11): outside, in front of the nose (tip at z 2.66), not through the cabin hero.pose(P.rise(t)); hero.face(F.fly);
      S.clouds.position.z = -20 + (t - 12.8) * 30;
      cat.root.visible = false;
      { const co = S.nose.userData.co; co.pose({ ...POSES.sitOn(t, 0.42), hx: t > 13.3 ? -0.5 : 0, aRf: 0.9, aRe: 1.0, aLf: 0.9, aLe: 1.0 }); co.face({ ...FACES.shock, open: t > 13.3 ? 0.6 : 0.1 }); }
      if (t < 13.4) {   // v3 (note #11): top-down on his face rocketing up past the airliner's nose, clouds far below
        const hp2 = hero.root.position, sh = Math.sin(t * 59) * 0.02; c = cam([hp2.x + 0.3 + sh, hp2.y + 3.4, hp2.z + 0.9], [hp2.x, hp2.y + 1.45, hp2.z + 0.1], 50, sh);
      } else
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
        const h = hero.root.position;
        if (t < 16.4) {   // v3 spike: POV from just behind his head, looking up past his flaming fist; clouds rush at the lens, the sky darkens
          const sh = Math.sin(t * 47) * 0.012 + Math.sin(t * 83) * 0.008;
          c = cam([h.x + 0.18 + sh, h.y + 1.35, h.z - 0.75], [h.x + 0.25 * Math.sin(t * 1.3), h.y + 30, h.z + 6], lerp(70, 84, seg(t, 14.8, 16.4)), sh * 2);
          S.rush.set(t, [h.x, h.y + 2, h.z], 55, 1 - smooth(seg(t, 15.6, 16.3)));
          out.capY = 1560;
        } else {   // fireball, drone orbit round him as he leaves the atmosphere; flames die out by 18
          S.rush.visible = false; const u = seg(t, 16.4, 18.0), az = lerp(85, -45, smooth(u)) * Math.PI / 180, d = lerp(3.4, 5.6, smooth(u));
          c = cam([h.x + Math.sin(az) * d, h.y + lerp(0.4, 2.6, u), h.z + Math.cos(az) * d], [h.x, h.y + 1.1, h.z], 50);
        }
        S.lines.set(t, [0, hero.root.position.y, 0], 1.0, 'y', 0.2 * (1 - k));
      } else {
        // ISS: astronaut on the truss (18.4), Gerald nose to the cupola glass (r3)
        S.earth.position.set(0, -80, -30);
        S.iss.position.set(0, 0, 0); S.iss.rotation.set(0.15, -0.35, 0.05);
        S.astro.root.position.set(1.6, 0.14, 0.15); S.astro.root.rotation.y = 0.9;
        if (t >= 18.1 && t < 19.4) laPeace(S.astro, t, 'astro', ctx, { hx: -0.2 }); else { S.astro.pose({ ...POSES.shock(t), hx: -0.3 }); S.astro.face({ ...FACES.shock, open: 0.4 }); }
        S.iss.updateMatrixWorld(true); const cu = S.iss.userData.cupola.getWorldPosition(new THREE.Vector3());
        cat.root.visible = true; cat.root.scale.setScalar(0.8); cat.root.position.set(cu.x, cu.y - 0.84, cu.z);   // v3 (note #12): smaller, so he fits inside the dome without touching the struts
        cat.root.rotation.y = 0.2; cat.pose(APOSES.loaf(t)); cat.face(AFACES.sleepy);   // v3 (note #12): lying down, asleep on the window
        const y = lerp(-1.5, 4.5, seg(t, 18.0, 21.2)); hero.root.position.set(2.0, y, -1.6); hero.root.rotation.y = -0.4; hero.pose(P.rise(t)); hero.face(F.fly);
        c = t < 19.4 ? mixCam(cam([4.6, 1.2, 7.0], [1.4, 0.6, 0.6], 44), cam([4.4, 1.0, 6.4], [1.4, 0.6, 0.6], 44), smooth(seg(t, 18, 19.4)))
          : mixCam(cam([4.4, 1.0, 6.4], [1.4, 0.6, 0.6], 44), cam([cu.x + 1.0, cu.y - 1.9, cu.z + 2.6], [cu.x, cu.y - 0.65, cu.z], 42), smooth(seg(t, 19.4, 20.2)));
        out.voiceY.astro = 1560; S.lines.set(t, [3.4, y, 3], 0.8, 'y', 0.12);
      }
    }
    // fireball: starts glowing past the airliner, full in the POV, burns out as he leaves the air (v3)
    const fk = t < 13.4 ? 0 : t < 14.8 ? 0.35 * smooth(seg(t, 13.4, 14.8)) : t < 16.4 ? lerp(0.35, 0.6, smooth(seg(t, 14.8, 15.6))) + 0.4 * smooth(seg(t, 16.0, 16.4)) : 1 - smooth(seg(t, 16.8, 18.0));
    S.fire.set(fk, t, hero.root.position.toArray(), 1.75 * hero.root.scale.y);
    {   // the break-out at 16.4 (story): skin + tear ring + vapour cone + flash + shake
      const BRK = 16.4, a = t - BRK, h = hero.root.position, by = 1.0 + (BRK - 14.8) * 0.6;
      const on = sh8 && t > 15.9 && t < 17.6; S.skin.visible = S.tearRing.visible = S.tearRing2.visible = S.vapor.visible = on;
      if (on) { const u = clamp(a / 0.8), R = a < 0 ? 0.6 : 0.6 + 30 * (1 - Math.pow(1 - u, 3));
        S.skin.position.set(h.x, by + 1.0, h.z); S.skin.scale.setScalar(Math.max(0.6, a < 0 ? 0.6 : R * 0.9)); S.skin.material.opacity = (a < 0 ? 0.25 * smooth(seg(t, 15.9, 16.3)) : 0.3 * (1 - smooth(seg(a, 0.2, 1.1))));
        S.tearRing.position.copy(S.skin.position); S.tearRing.scale.set(R, R, 1 + R * 0.05); S.tearRing.material.opacity = a < 0 ? 0 : 1 - smooth(seg(a, 0.3, 1.1)); S.tearRing.visible = a >= 0;
        S.tearRing2.position.copy(S.skin.position); S.tearRing2.scale.set(R * 0.7, R * 0.7, 1); S.tearRing2.material.opacity = S.tearRing.material.opacity; S.tearRing2.visible = a >= 0;
        S.vapor.position.set(h.x, h.y + 1.1, h.z); S.vapor.material.opacity = 0.15 * smooth(seg(t, 16.0, 16.35)) * (1 - smooth(seg(a, 0.25, 0.9))); S.vapor.scale.set(1 + 0.4 * Math.max(0, a), 1, 1 + 0.4 * Math.max(0, a)); }
      if (a >= 0 && a < 0.35) { out.flash = 0.75 * (1 - a / 0.35); out.flashColor = '200,230,255'; }
      if (a >= 0 && a < 0.6 && c) { const k = 0.09 * (1 - a / 0.6), n = Math.floor(t * 30); c.pos = [c.pos[0] + (Math.sin(n * 12.9) * 0.5) * k * 2, c.pos[1] + (Math.sin(n * 7.3) * 0.5) * k * 2, c.pos[2]]; }
    } if (t < 14.8 || t >= 18.0) S.rush.visible = false;
    out.cam = c; out.keyFocus = hero.root.position.toArray(); out.keyDist = 14;
    return out;
  },
};
