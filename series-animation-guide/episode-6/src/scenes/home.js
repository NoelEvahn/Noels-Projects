// LANDING + EXIT (62.6-70): he crashes through the bedroom roof (62.85), the bed is crushed, one enormous foot sticks out through the wall,
// dust settles, Mom lands on his chest (63.55), arms crossed, normal-sized. He opens his eyes (64.6). "La peace..." with a peace sign (65.2),
// Mom: "Eat your dinner." (66.25). Freeze on Mom standing on his chest (67.0) -> title card (HUD) -> the loop cuts back to frame 0.
import { THREE, makeHero, person, makeGerald, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, mat, add, box, rng, makeStage, talk, heroHeight, puffs, dustCloud, shake } from '../common.js';
import { buildBedroom, buildExterior, ROOM, CROSSED, MAD } from './hook.js';

const wp = (o) => o.getWorldPosition(new THREE.Vector3());
export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#7fc0ff', '#e8f4ff'], ground: null, hemiI: 1.0, keyI: 2.4, keyPos: [3, 9, 5], fillI: 0.75, shadow: { extent: 9 } });
    const scene = stage.scene, house = new THREE.Group(); scene.add(house);
    const room = buildBedroom(house); buildExterior(house, 9);
    const bedM = room.children.find((c) => c.isGroup && c.children.length > 8 && Math.abs(c.position.x + 1.85) < 0.01);
    const hero = makeHero(house), mom = person(house, 'mum'), cat = makeGerald(house);
    const dust = dustCloud(house, { n: 26, seed: 11, color: 0xe8e0d0 }); const bits = puffs(house, { n: 60, color: 0xf2ece0, seed: 14, size: 0.09, spread: 3, up: 1.2, grav: 7 }); const tiles = puffs(house, { n: 30, color: 0xb4503a, seed: 15, size: 0.14, spread: 2.5, up: 1.0, grav: 7 });
    // wall breach where his foot sticks out (right wall)
    const breach = new THREE.Group(); house.add(breach); const r = rng(4); for (let i = 0; i < 14; i++) add(breach, box(r.range(0.15, 0.4), r.range(0.1, 0.35), r.range(0.1, 0.3)), mat(0xbfe0d8), [ROOM.w / 2 + r.range(-0.1, 0.4), r.range(0.05, 0.3), 1.1 + r.range(-0.8, 0.8)], [r() * 3, r() * 3, 0]);
    return { stage, scene, house, room, bed: bedM, hero, mom, cat, dust, bits, tiles, breach, HH: heroHeight() };
  },
  frame(t, S, ctx) {
    const TL = ctx.TL, { hero, mom, cat, house } = S, out = { capY: {} }, C = TL.BEATS.crash;
    const [sx, sy] = t > C && t < C + 0.6 ? shake(t, 0.05 * (1 - (t - C) / 0.6), 30) : [0, 0]; house.rotation.set(sy * 0.3, 0, 0.035 + sx * 0.3); house.position.set(sx, 0, 0);
    // the boy: 4.4 m tall now, lying on his back diagonally, feet out through the right wall
    const k = 4.4 / S.HH, feet = new THREE.Vector3(3.05, 0.42, 1.15), ry = 1.07;
    hero.root.scale.setScalar(k); hero.root.rotation.set(-Math.PI / 2, ry, 0, 'YXZ');
    const fall = t < C ? Math.pow(seg(t, 62.6, C), 2) : 1; hero.root.position.set(feet.x, lerp(9, feet.y, fall), feet.z);
    const peace = t >= 65.0 && t < 66.1;
    hero.pose({ aLs: 0.5, aRs: peace ? 0.2 : 0.6, aRf: peace ? 2.2 : 0, aRe: peace ? 0.5 : 0.3, aLe: 0.3, lLs: 0.15, lRs: 0.1, hR: peace ? 'peace' : 'open', hL: 'open', hx: -0.2, hz: 0.15 });
    const eyes = t < TL.BEATS.eyeOpen ? 1 : lerp(1, 0.45, smooth(seg(t, TL.BEATS.eyeOpen, TL.BEATS.eyeOpen + 0.3)));
    hero.face(peace ? talk(ctx, 'peace', t, { ...FACES.mew, lid: 0.5, open: 0 }) : t < C ? { ...FACES.scream } : { ...FACES.deadpan, lid: eyes, smile: -0.2 });
    hero.root.updateMatrixWorld(true);
    if (S.bed) S.bed.scale.set(1, t > C ? 0.35 : 1, 1);
    S.breach.visible = t > C;
    // Mom: drops in onto his chest (63.55), arms crossed, normal size
    const chest = wp(hero.torso); const land = 63.55; const my = t < land ? chest.y + 0.18 + 3.2 * Math.pow(Math.max(0, land - t) / 0.45, 2) : chest.y + 0.18;
    mom.root.visible = t >= land - 0.45; mom.root.position.set(chest.x, my, chest.z); mom.root.rotation.y = 0.5;
    mom.pose({ ...CROSSED, hx: 0.38, bob: t > land && t < land + 0.2 ? -0.06 * (1 - (t - land) / 0.2) : 0 }); mom.face(talk(ctx, 'eat', t, { ...MAD, brow: -0.5, smile: -0.2, teeth: false }));
    // Gerald on the window sill, unbothered (background pop-up)
    cat.root.position.set(ROOM.w / 2 - 0.3, 0.9, -0.2); cat.root.rotation.y = -Math.PI / 2 + 0.3; cat.pose(APOSES.loaf(t)); cat.face(AFACES.bored);
    S.dust.position.set(0.4, 0, 0.0); S.dust.set(t - C, 3.2, 2.2); S.bits.set(t - C, [0.4, 2.6, 0.2], 1.4); S.tiles.set(t - C + 0.05, [0.4, 3.6, 0.2], 1.6);
    out.flash = t > C && t < C + 0.15 ? 0.6 * (1 - (t - C) / 0.15) : 0;
    let c; const hd = wp(hero.head), mh = wp(mom.head);
    if (t < 65.0) {   // wide, high, from the open front of the room
      c = mixCam(cam([-2.1, 2.35, 2.35], [0.9, 0.5, -0.3], 74), cam([-1.9, 2.2, 2.2], [0.8, 0.7, -0.2], 70), smooth(seg(t, 63.2, 65.0)));
    } else if (t < 66.1) {   // close on his face from above, peace sign
      const hr = wp(hero.handR), mid = hd.clone().lerp(hr, 0.45); c = cam([mid.x + 0.4, mid.y + 2.9, mid.z + 1.1], [mid.x, mid.y, mid.z], 58); out.capY.peace = 1560;
    } else {                 // low, up at Mom on his chest, arms crossed (the freeze frame)
      c = cam([mh.x - 1.3, mh.y - 1.35, mh.z + 1.8], [mh.x, mh.y - 0.15, mh.z], 54); out.capY.eat = 1560; out.vignette = 0.25;
    }
    out.cam = c; out.keyFocus = [0, 1, 0]; out.far = 400;
    return out;
  },
};
