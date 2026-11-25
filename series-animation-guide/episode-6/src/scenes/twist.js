// TWIST (45.6-62.6): Mom is the real final boss.
// 45.6 Mom in the front yard, arms crossed, the giant sole descending, the sky darkening: "You are NOT breaking another thing in this house."
// 47.8 impact from space (dust ring round the planet, flash). 48.4 = THE PHONK DROP: the dust clears, Mom holds the whole foot up with one hand,
// eyes glowing, muscles + veins. 52.0 Gerald does nothing. 53.0 she pushes, the foot launches. 55.0 he flies backwards "WHAT?!",
// 56.1 Mom shouts up "I SAID DINNER'S READY!". 57.8 she jumps into space, punch 58.8. 59.4 the three meme cats watch.
// 60.2 hammer throw (release 60.75) back to Earth, she dusts her hands: "And don't forget your vegetables!" 60.9.
import { THREE, makeHero, person, makeGerald, geraldSuit, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, hash, mat, glow, add, box, cyl, sph, rbox, rng, makeStage, talk, heroHeight, skyBG, starBackground, giantShoe, ring, momPower, dustCloud, puffs, shake } from '../common.js';
import { buildExterior, CROSSED, MAD } from './hook.js';
import { makeEarth } from '../../../assets/library/props/world.js';
import { icyRock } from '../../../assets/library/props/space.js';
import { clipCard } from '../../../assets/library/fx/clip.js';

const wp = (o) => o.getWorldPosition(new THREE.Vector3());
const SPACE = new THREE.Vector3(0, 0, -60000);   // the space set lives far from the yard
export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#7fb8f0', '#e8f2ff'], ground: null, hemiI: 1.0, keyI: 2.6, keyPos: [4, 12, 7], fillI: 0.6, shadow: { extent: 22 } });
    const scene = stage.scene, HH = heroHeight();
    const yard = new THREE.Group(); scene.add(yard); buildExterior(yard, 7);
    const mom = person(scene, 'mum'); const pow = momPower(mom);
    const shoe = giantShoe({ shin: 6 }); scene.add(shoe); const under = new THREE.PointLight(0xfff0d0, 0, 30, 1.2); scene.add(under);
    const dust = dustCloud(scene, { n: 30, seed: 4 }); const debris = puffs(scene, { n: 50, color: 0x8a7a64, seed: 6, size: 0.25, spread: 6, up: 2.2, grav: 7 });
    const shock = ring(scene, 0xfff0c0), shock2 = ring(scene, 0xffd23f);
    // space set
    const space = new THREE.Group(); space.position.copy(SPACE); scene.add(space);
    const stars = starBackground(space, { n: 3000, R: 3000 }); const earth = makeEarth(1); space.add(earth);
    const hero = makeHero(space); const spaceShoe = giantShoe({ shin: 3 }); space.add(spaceShoe);
    const sdust = puffs(space, { n: 60, color: 0xf0e8d8, seed: 8, size: 0.05, spread: 1.4, up: 0.15, grav: 0, emissive: 0.6 });
    const sRing = ring(space, 0xfff6d0); const punchRing = ring(space, 0xffffff); const punchRing2 = ring(space, 0xffd23f);
    const momS = person(scene, 'mum'); space.add(momS.root); const powS = momPower(momS);
    const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.4, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); space.add(trail);
    // the three meme cats on a little asteroid (the fight's audience; no popcorn, just the memes)
    const rock = icyRock(4, 1.6); space.add(rock);
    const dir = (n) => new URL(`../../build/clip_${n}/`, import.meta.url);
    const cats = []; for (const [n, h, feet] of [['happy_cat', 1.35, 0.04], ['oiia_cat', 2.5, 0.33], ['maxwell_cat', 1.05, 0.1]]) { try { const c = await clipCard(dir(n), { height: h, feet }); space.add(c.group); cats.push(c); } catch (e) { console.warn('clip missing', n); } }
    // Gerald's control room (tiny, far away)
    const room = new THREE.Group(); room.position.set(0, 0, 70000); scene.add(room);
    add(room, box(12, 0.1, 10), mat(0x1a1d26), [0, 0, 0]); add(room, box(12, 6, 0.2), mat(0x20242e), [0, 3, -5]); add(room, box(0.2, 6, 10), mat(0x20242e), [-6, 3, 0]);
    add(room, box(8, 4.5, 0.1), glow(0x2a6aff, 0.5), [0, 3.2, -4.85]); add(room, rbox(8, 0.9, 1.5, 0.08), mat(0x2a2e3a, { metal: 0.4, rough: 0.4 }), [0, 0.45, -1.6]); for (let i = 0; i < 12; i++) add(room, box(0.18, 0.04, 0.12), glow([0xff3a3a, 0x3aff8a, 0xffd23f, 0x3aa0ff][i % 4], 1.6), [-3 + i * 0.55, 0.92, -1.3]);
    add(room, cyl(0.5, 0.55, 0.55, 18), mat(0x111318), [0, 0.28, 0.4]); const roomL = new THREE.PointLight(0x9ab8ff, 30, 20, 1.5); roomL.position.set(1, 4, 3); room.add(roomL);
    const ger = makeGerald(scene); geraldSuit(ger); room.add(ger.root);
    return { stage, scene, HH, yard, mom, pow, shoe, under, dust, debris, shock, shock2, space, stars, earth, hero, spaceShoe, sdust, sRing, punchRing, punchRing2, momS, powS, trail, rock, cats, room, ger };
  },
  frame(t, S, ctx) {
    const TL = ctx.TL, shot = TL.shotAt(t), u = seg(t, shot.t0, shot.t1), out = { capY: {}, far: 3000 }, D = TL.BEATS.drop;
    const { mom, shoe, stage } = S;
    S.space.visible = false; S.room.visible = false; S.yard.visible = true; mom.root.visible = true; shoe.visible = true; S.dust.set(-1); S.debris.set(-1, [0, 0, 0]); S.shock.set(-1, [0, 0, 0]); S.shock2.set(-1, [0, 0, 0]);
    for (const c of S.cats) c.group.visible = false; for (const r of [S.sRing, S.punchRing, S.punchRing2]) r.set(-1, [0, 0, 0]); S.sdust.set(-1, [0, 0, 0]); S.trail.visible = false;
    S.scene.background = skyBG('#6aa8e8', '#e0eeff'); S.scene.fog = null; stage.key.intensity = 2.6; stage.hemi.intensity = 1.0; stage.key.castShadow = true;
    const MP = [0, 0, 4.6];   // Mom in the front yard
    mom.root.position.set(...MP); mom.root.rotation.y = 0.0;
    const pk = t < D ? 0 : smooth(seg(t, D, D + 0.8)); S.pow.set(pk, t);
    let c;
    const ground = shot.id === 'momlook' || shot.id === 'reveal' || shot.id === 'push' || (shot.id === 'fly' && t >= 56.1);
    if (ground) {
      // ---- Mom pose per beat
      let pose, face;
      if (t < D) { pose = { ...CROSSED, hx: -0.62, lean: -0.05 }; face = talk(ctx, 'mom2', t, MAD); }
      else if (t < 53.0) { const lift = smooth(seg(t, D, D + 0.25)); pose = { aRs: 0.42, aRf: lerp(1.2, 3.05, lift), aRe: 0.05, hR: 'spread', wR: 1.57, hz: 0.22, aLs: 0.9, aLf: 0.2, aLe: 0.7, hL: 'fist', lLs: 0.25, lRs: 0.25, lLk: 0.25, lRk: 0.25, bob: -0.04, hx: -0.12, hy: 0.25, lean: -0.06 }; face = { ...MAD, smile: 0.35, teeth: true, lid: 0.15 }; }
      else if (t < 55.0) { const crouch = smooth(seg(t, 53.0, 53.75)) * (1 - smooth(seg(t, 53.85, 54.0))); pose = { aRs: 0.25, aRf: 3.0, aRe: 0.1 + 0.9 * crouch, hR: 'flat', wR: 1.57, aLs: 1.0, aLe: 0.8, hL: 'fist', lLk: 0.25 + 1.0 * crouch, lRk: 0.25 + 1.0 * crouch, lLf: 0.6 * crouch, lRf: 0.6 * crouch, bob: -0.04 - 0.22 * crouch, hx: -0.5 }; face = { ...MAD, open: 0.3 + 0.5 * crouch, teeth: true }; }
      else { pose = { aLf: 1.4, aRf: 1.4, aLe: 2.4, aRe: 2.4, aLs: 0.5, aRs: 0.5, hL: 'cup', hR: 'cup', hx: -0.55, lean: -0.05 }; face = talk(ctx, 'dinner', t, { ...MAD, open: 0.5, teeth: true }); }
      mom.pose(pose); mom.face(face); mom.root.updateMatrixWorld(true);
      // ---- the shoe: descends (45.6-47.8), sits on her palm (48.4-53.9), launches (53.9 ->)
      const SS = 12, SR = 0.46 + Math.PI / 2; shoe.scale.setScalar(SS); shoe.rotation.set(0, SR, 0);
      const palm = wp(mom.handR), contact = (y) => shoe.position.set(palm.x - Math.sin(SR) * 0.12 * SS, y, palm.z - Math.cos(SR) * 0.12 * SS);
      if (t < TL.BEATS.land) { const d = smooth(seg(t, 45.6, 47.8)); contact(lerp(160, 9, d * d)); }
      else if (t < D) contact(palm.y + 0.45);
      else if (t < TL.BEATS.launch) contact(palm.y + 0.45);
      else { const a = t - TL.BEATS.launch; contact(palm.y + 0.3 + a * a * 120 + a * 30); shoe.visible = t < 56.1; }
      S.under.position.set(MP[0] + 2.0, 1.4, MP[2] + 4.5); S.under.intensity = t >= TL.BEATS.land && t < 56.1 ? 28 : 0;
      const shadowK = t < TL.BEATS.land ? smooth(seg(t, 45.6, 47.6)) : t < D ? 1 : 1 - smooth(seg(t, D, D + 1.2));
      stage.key.intensity = 2.6 * (1 - 0.75 * shadowK); stage.hemi.intensity = 1.0 * (1 - 0.6 * shadowK);
      S.scene.background = shadowK > 0.5 ? skyBG('#2a3448', '#6a7488') : skyBG('#6aa8e8', '#e0eeff');
      // dust: the landing cloud clears from the drop
      if (t >= TL.BEATS.land && t < D + 2.4) { S.dust.position.set(MP[0], 0, MP[2]); S.dust.set(t - TL.BEATS.land + 0.35, 4, 2.0); }
      S.debris.set(t - D, [MP[0], 0.5, MP[2]], 2.0); S.shock.set(t - D, [MP[0], 0.2, MP[2]], 9, 0.7, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))); S.shock2.set(t - D - 0.12, [MP[0], 0.2, MP[2]], 7, 0.7, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
      // cameras
      if (shot.id === 'momlook') { c = mixCam(cam([1.6, 1.0, 8.6], [0.0, 1.9, 4.6], 52), cam([3.4, 0.5, 12.2], [0.0, 5.4, 4.6], 64), smooth(u)); out.capY.mom2 = 1600; }
      else if (shot.id === 'reveal') { const a = t - D; if (t < 50.4) c = mixCam(cam([4.6, 0.6, 12.8], [0.3, 4.4, 4.4], 62), cam([3.9, 0.7, 11.6], [0.2, 4.0, 4.4], 60), smooth(seg(t, D + 0.3, 50.4)));
        else { const hd = wp(mom.head); c = mixCam(cam([hd.x + 1.4, hd.y + 0.02, hd.z + 2.8], [hd.x - 0.15, hd.y + 0.32, hd.z], 54), cam([hd.x + 1.1, hd.y + 0.05, hd.z + 2.3], [hd.x - 0.15, hd.y + 0.35, hd.z], 52), smooth(seg(t, 50.4, 52.0))); } if (a < 0.5) { const s = (1 - a / 0.5) * 0.12; c.pos[0] += Math.sin(t * 90) * s; c.pos[1] += Math.cos(t * 77) * s; } out.flash = a < 0.22 ? 0.45 * (1 - a / 0.22) : 0; out.flashColor = '255,248,220'; }
      else if (shot.id === 'push') { c = cam([5.0, 0.6, 14.4], [0.0, 3.6 + 4 * smooth(seg(t, 53.9, 55.0)), 4.6], 62); if (t > 53.9 && t < 54.3) { const s = (1 - seg(t, 53.9, 54.3)) * 0.1; c.pos[0] += Math.sin(t * 90) * s; } }
      else { c = cam([0.9, 1.0, 7.4], [0.0, 2.1, 4.4], 50); out.capY.dinner = 760; }
      out.keyFocus = [MP[0], 1, MP[2]]; out.keyDist = 14;
    } else if (shot.id === 'impact') {
      // ---- from space: the foot lands on the planet
      S.yard.visible = false; mom.root.visible = false; shoe.visible = false; S.space.visible = true; S.hero.root.visible = false; S.momS.root.visible = false; S.rock.visible = false; S.trail.visible = false;
      const e = S.earth; e.scale.setScalar(1); e.position.set(0, 0, 0); e.rotation.set(0.3, 1.2, 0); S.scene.background = skyBG('#02030a', '#0a0c1c');
      const ss = S.spaceShoe; ss.visible = true; ss.scale.setScalar(1.3); const a = seg(t, TL.BEATS.land - 0.2, TL.BEATS.land); ss.position.set(0, lerp(1.6, 0.92, a), 0.05); ss.rotation.set(0.15, 0.6, 0);
      S.sdust.set(t - TL.BEATS.land, [0, 0.95, 0], 1.2, 1); S.sRing.set(t - TL.BEATS.land, [0, 0.95, 0], 1.3, 0.6, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 - 0.15, 0, 0)));
      c = cam([2.2, 1.2, 3.4], [0, 0.9, 0], 50); const k = Math.max(0, 1 - (t - TL.BEATS.land) / 0.6) * 0.05; c.pos[0] += Math.sin(t * 95) * k; c.pos[1] += Math.cos(t * 81) * k;
      c.pos = c.pos.map((v, i) => v + SPACE.getComponent(i)); c.target = c.target.map((v, i) => v + SPACE.getComponent(i)); out.flash = t > TL.BEATS.land ? 0.5 * (1 - seg(t, TL.BEATS.land, 48.4)) : 0;
      out.keyFocus = false; out.far = 6000;
    } else if (shot.id === 'gerald2') {
      // ---- Gerald, in his suit, doing nothing
      S.yard.visible = false; mom.root.visible = false; shoe.visible = false; S.room.visible = true; S.scene.background = skyBG('#0a0c14', '#0a0c14');
      const g = S.ger; g.root.position.set(0, 0.55, 0.4); g.root.rotation.y = 0.15; g.pose({ ...APOSES.sit(t) }); g.face(t > 52.5 && t < 52.62 ? AFACES.sleepy : AFACES.deadpan);
      const gp = wp(g.root); c = cam([gp.x + 1.2, gp.y + 0.5, gp.z + 2.4], [gp.x - 0.2, gp.y + 0.45, gp.z - 0.6], 44); out.keyFocus = false; out.far = 100;
    } else {
      // ---- space: he flies backwards (55.0), she flies up and punches (57.8-59.4), the cats (59.4), the hammer throw (60.2)
      S.yard.visible = false; mom.root.visible = false; shoe.visible = false; S.space.visible = true; S.spaceShoe.visible = false; S.scene.background = skyBG('#02030a', '#0a0c1c');
      const h = S.hero, e = S.earth, k = 7 / S.HH; h.root.visible = true; h.root.scale.setScalar(k); e.scale.setScalar(1.0); e.rotation.set(0.3, t * 0.1, 0);
      const ms = S.momS; ms.root.visible = true; S.powS.set(1, t); S.rock.visible = true; S.rock.position.set(-7, -2.5, 6); S.rock.scale.setScalar(1);
      let tgt;
      if (shot.id === 'fly') {   // 55.0-56.1 (the ground part starts at 56.1): spinning backwards away from Earth, flailing
        ms.root.visible = false; e.position.set(0, -5, 0); const a = t - 55.0;
        h.root.position.set(1.5 + a * 2.0, 2.5 + a * 3.0, -4 - a * 2); h.root.rotation.set(-0.6 - a * 2.4, 0.4, 0.3);
        h.pose({ ...POSES.shock(t), aLs: 1.5 + Math.sin(t * 22) * 0.6, aRs: 1.5 + Math.cos(t * 19) * 0.6, aLf: Math.sin(t * 17) * 0.8, aRf: Math.cos(t * 15) * 0.8, lLf: Math.sin(t * 13), lRf: -Math.sin(t * 13) }); h.face(talk(ctx, 'whatt', t, { ...FACES.scream, open: 0.6 }));
        const hp = wp(h.head).sub(SPACE); c = cam([hp.x + 4.5, hp.y - 2.0, hp.z + 8.5], [hp.x - 0.5, hp.y - 2.4, hp.z], 55); out.capY.whatt = 1560;
      } else {
        // the boy floats at a fixed spot; Earth below-left; Mom flies up from Earth to his cheek
        e.position.set(-6, -9, -4); const H0 = new THREE.Vector3(2, 0, -6);
        let spinA = 0, rel = 0; if (t >= 60.2) { spinA = Math.pow(seg(t, 60.2, 60.75), 1.4) * Math.PI * 3.2; rel = t > 60.75 ? t - 60.75 : 0; }
        if (t < 60.2) { h.root.position.copy(H0); h.root.rotation.set(0, -0.5 + (t > TL.BEATS.punch ? smooth(seg(t, TL.BEATS.punch, TL.BEATS.punch + 0.3)) * 1.4 : 0), 0); h.pose({ ...POSES.float(t), hy: t > TL.BEATS.punch ? 1.0 * smooth(seg(t, TL.BEATS.punch, TL.BEATS.punch + 0.2)) : 0 }); h.face(t > TL.BEATS.punch ? { ...FACES.shock, lid: 0.6, open: 0.7 } : { ...FACES.question, eye: 1.2 }); }
        else { // hammer: his feet at her hand (pivot), body horizontal, swung round the vertical axis; released 60.75 toward Earth
          const piv = new THREE.Vector3(0.5, 1.6, -1.2), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spinA).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2 + 0.15));
          h.root.quaternion.copy(q); h.root.position.copy(piv); h.pose({ ...POSES.shock(t), aLs: 2.8, aRs: 2.8, lLs: 0.3, lRs: 0.3 }); h.face({ ...FACES.scream, open: 0.9 });
          if (rel > 0) { h.root.position.add(new THREE.Vector3(-rel * 16, -rel * 14, -rel * 10)); h.root.rotateZ(rel * 6); } }
        h.root.updateMatrixWorld(true); const cheek = wp(h.head).sub(SPACE).add(new THREE.Vector3(0.0, 0, h.R * k * 1.1));
        // Mom: 57.8 leaps from Earth (streak), reaches the cheek at 58.75, punch 58.8, floats; 60.2 swing; 60.9 dusts her hands
        let mp; const earthTop = new THREE.Vector3(-6, -8, -4);
        if (t < TL.BEATS.punch - 0.05) { const a = smooth(seg(t, 57.8, TL.BEATS.punch - 0.05)); mp = earthTop.clone().lerp(cheek.clone().add(new THREE.Vector3(0.6, -0.8, 1.4)), a); ms.pose({ aRf: 2.9, aRs: 0.2, hR: 'fist', aLs: 0.3, aLf: -0.4, lLf: -0.3, lRf: 0.3, lLk: 0.6, hx: -0.3 }); }
        else if (t < 60.2) { mp = cheek.clone().add(new THREE.Vector3(0.6, -0.9, 1.4)); const pu = smooth(seg(t, TL.BEATS.punch - 0.05, TL.BEATS.punch + 0.05)) * (1 - smooth(seg(t, 59.2, 59.6))); ms.pose({ aRf: lerp(0.3, 1.6, pu), aRs: lerp(0.3, 1.2, pu), aRe: lerp(1.8, 0.1, pu), hR: 'fist', aLs: 0.6, aLe: 1.2, hL: 'fist', twist: -0.5 * pu, lean: 0.2 * pu, lLk: 0.4, lRk: 0.2 }); }
        else { mp = new THREE.Vector3(0.5, 0.0, -1.2); if (t < 60.75) ms.pose({ aRs: 2.6, aLs: 2.6, aRe: 0.2, aLe: 0.2, hR: 'fist', hL: 'fist', lean: -0.2 }); else ms.pose({ ...POSES.dust(t), aLf: 0.9, aLe: 1.6, hL: 'flat', hR: 'flat', aRf: 1.1 + Math.sin(t * 18) * 0.15 }); }
        ms.root.position.copy(mp); ms.root.rotation.set(0, t < 60.2 ? Math.atan2(cheek.x - mp.x, cheek.z - mp.z) : t < 60.75 ? spinA + Math.PI / 2 : 0.4, 0); ms.face(talk(ctx, 'veg', t, { ...MAD, smile: 0.2 }));
        const flying = t < TL.BEATS.punch - 0.05; S.trail.visible = flying; if (flying) { const tail = earthTop, len = mp.distanceTo(tail); S.trail.position.copy(mp.clone().add(tail).multiplyScalar(0.5)); S.trail.scale.set(1, len, 1); S.trail.lookAt(new THREE.Vector3().copy(mp).add(SPACE)); S.trail.rotateX(Math.PI / 2); }
        S.punchRing.set(t - TL.BEATS.punch, cheek.toArray(), 2.4, 0.5); S.punchRing2.set(t - TL.BEATS.punch - 0.08, cheek.toArray(), 1.8, 0.5);
        // the cats on their asteroid (just the memes, watching)
        const rockTop = new THREE.Vector3(-7, -1.0, 6); S.rock.scale.setScalar(0.55); S.rock.position.set(rockTop.x, rockTop.y - 1.3, rockTop.z);
        S.cats.forEach((cc, i) => { cc.group.position.set(rockTop.x - 0.85 + i * 0.78, rockTop.y + 0.05, rockTop.z + (i === 1 ? -0.2 : 0)); });
        if (shot.id === 'jump') { tgt = mp.clone().lerp(cheek, 0.5); c = cam([tgt.x + 5, tgt.y - 0.5, tgt.z + 9], [tgt.x, tgt.y, tgt.z], 55); out.capY.dinner = 760; }
        else if (shot.id === 'cats') { const rt = rockTop; c = cam([rt.x + 0.2, rt.y + 0.75, rt.z + 4.4], [rt.x, rt.y + 0.55, rt.z], 52); }
        else { tgt = new THREE.Vector3(0.5, 1.0, -1.2); const wide = t < 60.95; c = wide ? cam([tgt.x + 2.5, tgt.y + 13, tgt.z + 6.5], [tgt.x, tgt.y + 0.4, tgt.z], 62) : cam([tgt.x + 2.4, tgt.y + 0.5, tgt.z + 5.8], [tgt.x - 0.2, tgt.y + 0.4, tgt.z], 50); out.capY.veg = 1600; if (t > 60.75 && t < 61.0) { const s = (1 - seg(t, 60.75, 61.0)) * 0.15; c.pos[0] += Math.sin(t * 90) * s; } }
        if (t > TL.BEATS.punch && t < TL.BEATS.punch + 0.25) { const s = (1 - seg(t, TL.BEATS.punch, TL.BEATS.punch + 0.25)) * 0.25; c.pos[0] += Math.sin(t * 95) * s; c.pos[1] += Math.cos(t * 80) * s; out.flash = 0.4 * (1 - seg(t, TL.BEATS.punch, TL.BEATS.punch + 0.2)); }
        const camW = new THREE.Vector3(...c.pos).add(SPACE); for (let i = 0; i < S.cats.length; i++) S.cats[i].show((t - 57.8) + [0.0, 3.4, 1.0][i], camW);
      }
      c.pos = c.pos.map((v, i) => v + SPACE.getComponent(i)); c.target = c.target.map((v, i) => v + SPACE.getComponent(i)); out.keyFocus = false; out.far = 6000;
      stage.key.position.set(SPACE.x + 6, SPACE.y + 4, SPACE.z + 6); stage.key.target.position.copy(SPACE);
    }
    out.cam = c; return out;
  },
};
