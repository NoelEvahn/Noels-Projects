// S7 — THE FINAL HUG (75.2–90): hilltop, silence, ONE HUG at 80.0, love-wave, cosmic pull-back, cast crowd, back to the wrecked BBQ, "Bombo.", freeze + title card.
import { THREE, makeCharacter, PRESETS, POSES, FACES, randomPerson, rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, orbit, cam, shot, pick, pops, place, V, D2R, makeLovers } from '../common.js';
import { makeStage, gradientTexture } from '/lib/stage.js';
import { buildHilltop, HILL_STAGE, hillH } from '/lib/sets/hilltop.js';
import { buildGarden } from '/lib/sets/garden.js';
import { buildSpace, buildCosmos, SPACE_STAGE } from '/lib/sets/space.js';
import { makeLoveWave, makeHeartField, makeHeart, makeGlowSprite } from '/lib/fx/hearts.js';
import { ghostify } from '/lib/character.js';
import { makeAnimal, APOSES, ANIMALS } from '/lib/animal.js';
import { makeMoon } from '/lib/props/world.js';
import { mat, add } from '/lib/util.js';

const HILL_BG = gradientTexture(HILL_STAGE.sky[0], HILL_STAGE.sky[2], HILL_STAGE.sky[1]);
const SPACE_BG = gradientTexture('#02030a', '#0a1230');
const GBG = gradientTexture('#8fd3ff', '#fff6dc');
const OFFG = [0, 0, 600];   // garden group offset
const FREEZE = 88.8;

export default {
  async build(ctx) {
    const stage = makeStage({ ...HILL_STAGE, shadow: { extent: 22, size: 2048 } }), scene = stage.scene;
    const S = { stage, scene };
    // hilltop
    S.hill = buildHilltop({ trees: 80 }); scene.add(S.hill.group);
    S.hero = makeCharacter(PRESETS.hero); scene.add(S.hero.root); S.hero.root.position.set(0, hillH(0, 0), 0);
    S.wave = makeLoveWave({ maxR: 80, height: 10, debris: 200 }); S.wave.position.set(0, hillH(0, 0) + 0.2, 0); scene.add(S.wave);
    // tiny people on the hillside get a heart as the wave passes
    const r = rng(31); S.folks = Array.from({ length: 56 }, (_, i) => { const a = r() * 6.283, d = r.range(8, 46); const c = randomPerson(r); scene.add(c.root); c.root.position.set(Math.cos(a) * d, hillH(Math.cos(a) * d, Math.sin(a) * d), Math.sin(a) * d); c.root.rotation.y = a + Math.PI; c.d = d; return c; });
    S.folkHearts = makeHeartField(56, { color: 0xff3f7f, emissive: 0.6 }); scene.add(S.folkHearts);
    // cast crowd field (same hill, front slope)
    const names = ['dad', 'mum', 'kid', 'grandma', 'neighbourMan', 'neighbourWoman', 'neighbourTeen', 'neighbourGranny', 'postman', 'iceCreamMan', 'magician', 'judgeA', 'judgeB', 'judgeC', 'judgeD', 'host', 'scientistA', 'scientistB', 'chiefScientist', 'balloonist', 'skydiver', 'passenger', 'flightAttendant', 'windowWasher', 'plazaA'];
    S.cast = names.map((n, i) => { const c = makeCharacter(PRESETS[n]); scene.add(c.root); const row = Math.floor(i / 9), col = i % 9; const x = (col - 4) * 2.4 + (row % 2) * 1.1, z = 6 + row * 2.6; c.root.position.set(x, hillH(x, z) + 0.0, z); c.root.rotation.y = Math.PI + (x * 0.02); return c; });
    S.castHero = makeCharacter(PRESETS.hero); scene.add(S.castHero.root); S.castHero.root.position.set(0, hillH(0, 3.2), 3.2); S.castHero.root.rotation.y = Math.PI;
    S.crowdFill = Array.from({ length: 50 }, (_, i) => { const c = randomPerson(r); scene.add(c.root); const row = 3 + Math.floor(i / 14), col = i % 14; const x = (col - 6.5) * 2.5 + (row % 2) * 1.2, z = 6 + row * 2.6; c.root.position.set(x, hillH(x, z), z); c.root.rotation.y = Math.PI; return c; });
    S.ghostsC = ['ghostCaveman', 'ghostPharaoh', 'ghostKnight', 'ghostViking', 'ghostVictorian'].map((n, i) => { const g = ghostify(makeCharacter(PRESETS[n])); scene.add(g.root); g.root.position.set(-8 + i * 4, hillH(-8 + i * 4, 28) + 1.0, 28); g.root.rotation.y = Math.PI; return g; });
    S.castHearts = makeHeartField(130, { colors: [0xff3f7f, 0xff8fb8, 0xffd23f], emissive: 0.6 }); scene.add(S.castHearts);
    S.catHill = makeAnimal('cat', ANIMALS.gerald); scene.add(S.catHill.root); S.catHill.root.position.set(4.5, hillH(4.5, 7.5), 7.5); S.catHill.root.rotation.y = Math.PI + 0.3;
    // space + cosmos
    S.sp = buildSpace({ R: 3 }); S.sp.group.position.set(0, 0, 900); scene.add(S.sp.group);
    const heart = makeHeart(0xff3f7f, 9.5, 0.7); heart.material.transparent = true; heart.material.opacity = 0.35; heart.position.set(0, 0, 900); S.bigHeart = heart; scene.add(heart);
    S.moon = makeMoon(0.9); S.moon.position.set(14, 3, 900 - 6); scene.add(S.moon); S.moonHeart = makeHeart(0xff3f7f, 0.8, 0.8); S.moonHeart.position.set(14, 3.2, 900 - 4.8); scene.add(S.moonHeart);
    S.cosmos = buildCosmos(); S.cosmos.group.position.set(0, 0, 1300); scene.add(S.cosmos.group);
    S.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 128), new THREE.MeshBasicMaterial({ color: 0xff7ab8, transparent: true, opacity: 0.9, toneMapped: false })); scene.add(S.ring);
    // wrecked BBQ garden (final room)
    const gd = buildGarden({ wrecked: 1 }); S.gd = gd; const gg = new THREE.Group(); gg.position.set(...OFFG); gg.add(gd.group); scene.add(gg); S.gg = gg; gd.anchors.chairs.forEach((c) => (c.visible = false));
    const mk = (n) => { const c = makeCharacter(PRESETS[n]); gg.add(c.root); return c; };
    S.g = { hero: mk('hero'), mum: mk('mum'), dad: mk('dad'), kid: mk('kid'), grandma: mk('grandma') };
    S.gNb = ['neighbourMan', 'neighbourWoman', 'neighbourTeen', 'neighbourGranny'].map((n, i) => { const c = mk(n); const left = i < 2; c.root.position.set(left ? -8.5 : 8.5, 0.35, left ? -1.6 + i * 3.2 : 1.8 - (i - 2) * 3.4); c.root.rotation.y = left ? Math.PI / 2 : -Math.PI / 2; return c; });
    S.gCat = makeAnimal('cat', ANIMALS.gerald); gg.add(S.gCat.root); S.gCat.root.position.set(1.3, 0, 3.4); S.gCat.root.rotation.y = 0.0;
    S.gLovers = makeLovers(gg); for (const k of ['mum', 'dad', 'kid', 'grandma']) S.gLovers.add(S.g[k], 0, 0.42); S.gNb.forEach((c) => S.gLovers.add(c, 0, 0.42));
    // shots
    const HC = [0, hillH(0, 0), 0];
    const HP = (x, y, z) => [x, HC[1] + y, z];
    const hf = (az, d, h, fov = 40, lowS = 0.2, ty = 1.2) => orbit([0, HC[1] + ty, 0], az, d, h, fov, 0, lowS);
    const E = (az, el, d, fov = 38, ty = 0, z0 = 900) => ({ pos: [Math.sin(az * D2R) * d, el, z0 + Math.cos(az * D2R) * d], target: [0, ty, z0], fov, roll: 0 });
    const G = (pos, tgt, fov = 42) => cam([pos[0] + OFFG[0], pos[1], pos[2] + OFFG[2]], [tgt[0] + OFFG[0], tgt[1], tgt[2] + OFFG[2]], fov);
    S.shots = [
      { ...shot(75.2, 76.0, cam(HP(14, 5, 14), HP(0, 1.8, 0), 50), cam(HP(10, 4, 11), HP(0, 1.8, 0), 50)), g: 'hill' },                       // golden hour establishing
      { ...shot(76.0, 76.8, hf(15, 4.2, 0.2, 42, 0.18), hf(5, 3.6, 0.2, 42, 0.18)), g: 'hill' },                                           // hero deadpan
      { ...shot(76.8, 77.6, hf(0, 2.6, 0.2, 38, 0.2, 1.65), hf(0, 2.2, 0.2, 36, 0.2, 1.65)), g: 'hill' },                                   // face close, breathes
      { ...shot(77.6, 78.4, hf(10, 2.4, 0.2, 34, 0.2, 1.65), hf(5, 2.0, 0.2, 32, 0.2, 1.65)), g: 'hill' },                                  // SILENCE: eyes close (slow-mo)
      { ...shot(78.4, 79.2, hf(60, 3.2, 0.3, 40, 0.2, 1.2), hf(40, 3.0, 0.3, 40, 0.2, 1.2)), g: 'hill' },                                  // arms open wide
      { ...shot(79.2, 80.0, hf(0, 5.5, -0.8, 46, 0.2, 1.3), hf(0, 4.0, -0.6, 46, 0.2, 1.3), { ease: 'in' }), g: 'hill' },                  // low: arms about to close
      { ...shot(80.0, 80.4, hf(10, 3.0, 0.2, 40, 0.2, 1.3)), g: 'hill' },                                                                   // HUG + flash
      { ...shot(80.4, 80.8, cam(HP(-3, 3.2, 14), HP(3, 4, -20), 56), cam(HP(-2, 3.2, 10), HP(3, 4, -20), 56)), g: 'hill' },               // the wave rips across the hills
      { ...shot(80.8, 81.2, cam(HP(0, 60, 30), HP(0, 0, 0), 52)), g: 'hill' },                                                            // pull-back 1: hilltop from above
      { ...shot(81.2, 81.6, E(0, 1.0, 5.2, 50, 0), E(0, 1.0, 4.4, 50, 0)), g: 'earth' },                                                  // pull-back 2: Earth's surface
      { ...shot(81.6, 82.0, E(25, 1.5, 17, 42), E(25, 1.5, 15, 42)), g: 'earth' },                                                          // pull-back 3: Earth with the ring
      { ...shot(82.0, 82.4, E(-20, 2.0, 24, 44), E(-20, 2.0, 22, 44)), g: 'earth' },                                                        // pull-back 4: Earth hugged by a heart
      { ...shot(82.4, 82.8, { pos: [14 + 3, 3.5, 900 - 6 + 5], target: [14, 3, 900 - 6], fov: 40, roll: 0 }), g: 'earth' },                  // pull-back 5: Moon with a heart
      { ...shot(82.8, 83.2, { pos: [4, 11, 1300 + 24], target: [4, 0, 1300], fov: 50, roll: 0 }), g: 'cosmos' },                           // pull-back 6: solar system
      { ...shot(83.2, 83.6, { pos: [0, 40, 1300 - 120 + 30], target: [0, -2, 1300 - 120], fov: 52, roll: 0 }), g: 'cosmos' },               // pull-back 7: galaxy ripples
      { ...shot(83.6, 84.0, cam(HP(0, 5, 34), HP(0, 2.4, 10), 48), cam(HP(0, 4.6, 30), HP(0, 2.4, 10), 48)), g: 'hill' },                 // stunned cast field
      { ...shot(84.0, 84.4, cam(HP(0, 3.2, 20), HP(0, 2.2, 6), 44), cam(HP(0, 3.0, 18), HP(0, 2.2, 6), 44)), g: 'hill' },
      { ...shot(84.4, 85.2, cam(HP(0, 2.8, 14), HP(0, 2.6, 6.5), 36), cam(HP(0, 2.8, 12), HP(0, 2.6, 6.5), 34)), g: 'hill' },              // BOMBOCLAT!
      { ...shot(85.2, 86.0, cam(HP(-6, 7, 26), HP(0, 3, 8), 50), cam(HP(4, 6, 22), HP(0, 3, 8), 50)), g: 'hill' },
      { ...shot(86.0, 86.6, G([6, 3.4, 12], [0, 1.4, 0], 46), G([4, 3.0, 10], [0, 1.4, 0], 46)), g: 'garden' },                            // back in the wrecked BBQ garden
      { ...shot(86.6, 87.2, G([-6.0, 1.6, 4.2], [-7.4, 1.5, 1.6], 36)), g: 'garden' },                                                     // Gerald: still no (roast)
      { ...shot(87.2, 87.6, G([0, 2.6, 8], [0, 1.5, -1], 40), G([0, 2.4, 6.5], [0, 1.5, -1], 40)), g: 'garden' },                          // family stares
      { ...shot(87.6, 88.0, G([-0.6, 1.9, 5.6], [0.4, 1.7, 2.6], 36)), g: 'garden' },                                                      // silence: hero deadpan close
      { ...shot(88.0, 88.4, G([-0.6, 1.9, 5.2], [0.4, 1.7, 2.6], 30)), g: 'garden' },                                                      // "Bombo."
      { ...shot(88.4, 88.8, G([1.0, 0.9, 6.2], [1.3, 0.55, 3.4], 36)), g: 'garden' },                                                      // Gerald looks away
      { ...shot(88.8, 90.0, G([-0.6, 1.9, 5.2], [0.4, 1.7, 2.6], 30), G([-0.5, 1.9, 4.6], [0.4, 1.7, 2.6], 28)), g: 'garden' },            // FREEZE: title card
    ];
    S.HC = HC; return S;
  },
  frame(t, S, ctx) {
    const P = pick(S.shots, t); const c = P.cam; const key = P.shot.g; const mo = ctx.mouth;
    const tt = t > FREEZE ? FREEZE : t;                                   // freeze-frame: the world stops at 88.8
    S.hill.group.visible = key === 'hill'; S.hero.root.visible = key === 'hill' && tt < 83.6; S.folks.forEach((f) => (f.root.visible = key === 'hill' && tt < 83.6));
    S.wave.visible = key === 'hill' && tt >= 80.0 && tt < 83.6; S.folkHearts.visible = key === 'hill' && tt < 83.6;
    S.cast.forEach((c2) => (c2.root.visible = key === 'hill' && tt >= 83.6)); S.castHero.root.visible = key === 'hill' && tt >= 83.6; S.crowdFill.forEach((c2) => (c2.root.visible = key === 'hill' && tt >= 83.6)); S.ghostsC.forEach((g) => (g.root.visible = key === 'hill' && tt >= 83.6)); S.castHearts.visible = key === 'hill' && tt >= 83.6; S.catHill.root.visible = key === 'hill' && tt >= 83.6;
    S.sp.group.visible = key === 'earth'; S.bigHeart.visible = key === 'earth'; S.moon.visible = key === 'earth'; S.moonHeart.visible = key === 'earth'; S.cosmos.group.visible = key === 'cosmos'; S.ring.visible = false; S.gg.visible = key === 'garden';
    if (key === 'hill') { S.scene.background = HILL_BG; S.scene.fog = new THREE.Fog(0xffb27a, 40, 200); } else if (key === 'garden') { S.scene.background = GBG; S.scene.fog = new THREE.Fog(0xdff2ff, 30, 90); } else { S.scene.background = SPACE_BG; S.scene.fog = null; }
    const y0 = S.HC[1];
    if (key === 'hill') {
      // --- hero: arms open slowly in the silence, hug closes exactly at 80.0
      const hero = S.hero; hero.root.position.set(0, y0, 0); hero.root.rotation.y = 0.0;
      const open = clamp((tt - 77.6) / 1.6), close = clamp((tt - 79.2) / 0.8), closeE = close * close;
      let pose; if (tt < 77.6) pose = POSES.deadpan(tt); else pose = { ...POSES.hugLerp(closeE), ...(close === 0 ? POSES.hugOpen(0, open) : {}) };
      if (tt >= 80.0) pose = { ...POSES.hugClosed(tt), bob: 0.0 };
      hero.pose({ ...pose }); hero.face(tt < 77.6 ? { ...FACES.deadpan } : tt < 79.9 ? { smile: 0.15, lid: 0.15 + open * 0.55 } : { smile: 0.9, lid: 0.9 });
      // --- love wave
      const k = clamp((tt - 80.0) / 1.55); S.wave.update(k, tt); const waveR = k * 80;
      S.hill.update(tt >= 80.0 ? waveR : -999, tt);
      S.folks.forEach((f, i) => { f.pose(tt > 80 + f.d / 80 * 1.55 ? POSES.cheer(tt + i) : POSES.idle(tt + i)); f.face(FACES.shock); });
      S.folkHearts.update((i) => { const f = S.folks[i]; if (waveR < f.d) return null; const age = (waveR - f.d) / 80 * 1.55; const p = f.root.position; return { x: p.x, y: p.y + 2.6 + Math.sin(tt * 3 + i) * 0.08, z: p.z, s: 0.55 * easeOutBack(clamp(age / 0.4)), ry: Math.atan2(c.pos[0] - p.x, c.pos[2] - p.z) }; });
      // --- cast crowd field
      const hair = clamp((tt - 83.6) / 0.4), scream = tt >= 84.4 && tt < 86.0;
      const mouthO = mo('crowd_world', tt);
      S.cast.forEach((cc, i) => { cc.pose(scream ? { ...POSES.shock(), aLs: 1.2 + Math.sin(tt * 20 + i) * 0.15, hx: -0.3 } : { ...POSES.shock(), lean: -0.3 * hair, hx: -0.1 }); cc.face(scream ? { ...FACES.scream, open: Math.max(0.5, mouthO) } : { ...FACES.shock, open: 0.15 }); });
      S.crowdFill.forEach((cc, i) => { cc.pose(scream ? { ...POSES.cheer(tt + i), aLs: 2.5 } : POSES.shock()); cc.face(scream ? { ...FACES.scream, open: mouthO } : FACES.shock); });
      S.castHero.pose(scream ? { ...POSES.shock(), aLs: 1.2 } : POSES.shock()); S.castHero.face(scream ? { ...FACES.scream, open: mouthO } : FACES.shock);
      S.ghostsC.forEach((g, i) => { g.pose(POSES.float(tt + i)); g.face(scream ? { ...FACES.scream, open: mouthO } : FACES.shock); });
      S.catHill.pose(APOSES.sit(tt)); S.catHill.face({ lid: 0.5 }); S.catHill.root.rotation.y = Math.PI + 0.3 + (tt > 85.6 ? 0.5 : 0);
      const allCh = [...S.cast, S.castHero, ...S.crowdFill]; S.castHearts.update((i) => { const cc = allCh[i]; if (!cc || tt < 83.8) return null; const p = cc.root.position; const sc = cc.root.scale.y; const age = tt - 83.8 - (i % 9) * 0.02; return { x: p.x, y: p.y + (2.25 + (i < 26 ? 0 : 0)) * sc, z: p.z, s: 0.42 * easeOutBack(clamp(age / 0.4)), ry: Math.PI + Math.sin(tt * 3 + i) * 0.25 }; });
    }
    if (key === 'earth') { S.sp.update(tt, { pink: 1, spin: 0.1 }); const rt = tt - 81.6; const k = clamp(rt / 1.6); S.ring.visible = rt >= -0.4 && rt < 1.6; S.ring.position.set(0, 0, 900); S.ring.scale.setScalar(3.2 + clamp(rt / 1.6) * 10); S.ring.material.opacity = 0.9 * (1 - k); S.ring.rotation.x = Math.PI / 2.4; S.bigHeart.visible = tt >= 82.0; S.bigHeart.rotation.y = tt * 0.7; S.moonHeart.rotation.y = tt * 2; S.moon.rotation.y = tt * 0.2; }
    if (key === 'cosmos') { S.cosmos.galaxy.rotation.y = tt * 0.15; }
    if (key === 'garden') {
      const g = S.g; const age = (tt - 86.0);
      const hx = lerp(5.5, 0.4, easeOutCubic(clamp(age / 1.2))); const walking = age < 1.2;
      place(g.hero, hx, 0, 2.6, -0.4 + (walking ? 0 : 0.3)); g.hero.pose(walking ? POSES.walk(tt, 6) : tt < 87.6 ? { ...POSES.dust(tt), lean: 0.03 } : { ...POSES.deadpan(tt) }); g.hero.face(tt < 88.0 ? { smile: 0, lid: 0.35 } : { smile: 0, lid: 0.35, open: mo('hero_casual', tt) * 0.5 });
      place(g.mum, 3.0, 0, 0.0, 0.0); g.mum.pose({ ...POSES.sitOn(tt, 0.34), aRf: 0.5, aLf: 0.5 }); g.mum.face(FACES.shock);
      place(g.dad, -2.3, 0, -2.4, 0.2); g.dad.pose({ ...POSES.shock(tt), aRs: 0.4, aLs: 0.3 }); g.dad.face(FACES.shock);
      place(g.kid, 1.9, 0, 1.4, 0.3); g.kid.pose(POSES.shock()); g.kid.face(FACES.shock);
      place(g.grandma, -3.6, 0, 1.2, 0.9); g.grandma.pose({ ...POSES.sitOn(tt, 0.34 / 0.92), aRs: 1.6 + Math.sin(tt * 7) * 0.3, aRe: 0.6, hR: 'open' }); g.grandma.face(FACES.love);
      S.gNb.forEach((n, i) => { n.pose(POSES.cheer(tt + i)); n.face(FACES.happy); });
      S.gLovers.update(tt, c.pos, c);
      S.gCat.pose(tt >= 88.4 ? { ...APOSES.lookAway(tt), hy: 0.9 } : APOSES.stand(tt)); S.gCat.face({ lid: 0.5 }); place(S.gCat, -7.1, 1.15 + 0.0, 1.6, 1.25); S.gCat.root.position.y = 1.15; S.gCat.pose(tt >= 88.4 ? { ...APOSES.loaf(tt), hy: 0.9 } : APOSES.loaf(tt)); S.gCat.root.position.y = 1.15 + 0.115;
      S.gd.update(tt);
    }
    const r = { cam: c, keyFocus: key === 'earth' ? [0, 0, 900] : key === 'cosmos' ? [0, 0, 1300] : key === 'garden' ? [OFFG[0], 1.4, OFFG[2]] : [0, y0 + 2, 6], keyDist: key === 'garden' ? 10 : 14 };
    if (t >= 80.0 && t < 80.5) r.flash = Math.min(1, 1.2 * (1 - (t - 80.0) / 0.5));
    if (t >= FREEZE && t < FREEZE + 0.25) r.flash = 0.6 * (1 - (t - FREEZE) / 0.25);
    r.hideHud = false;
    return r;
  },
};
