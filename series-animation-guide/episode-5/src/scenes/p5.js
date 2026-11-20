// P5 · STARS AND GALAXY (story 53.2-60.4): through nebula colours (n4), the Orion pillar picnic (alien family 56.8, Gerald on the blanket),
// the Milky Way spiral below with Gerald floating past in a suit and tie, briefcase drifting (r6).
import { THREE, makeHero, makePerson, makeGerald, antennae, geraldSuit, briefcase, P, F, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, rng, laPeace, speedLines, starBackground, glowPoints } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { makeGalaxy } from '../../../assets/library/props/world.js';
import { nebulaPillar, picnicBlanket } from '../../../assets/library/props/space.js';

function nebulaCloud(n = 900, seed = 4, R = 30) {
  const r = rng(seed), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), pal = [[1, 0.3, 0.6], [0.4, 0.3, 1], [0.2, 0.8, 1], [1, 0.6, 0.3]];
  for (let i = 0; i < n; i++) { const c = pal[Math.floor(r() * pal.length)], a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * R; pos.set([Math.cos(a) * d, r.range(-1, 1) * R * 0.8, Math.sin(a) * d - 10], i * 3); const k = r.range(0.06, 0.18); col.set([c[0] * k, c[1] * k, c[2] * k], i * 3); }
  return glowPoints(pos, col, { size: 6 });
}
export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#05020c', '#0a0418'], ground: null, hemiI: 0.6, hemiSky: 0xe0d0ff, hemiGround: 0x402040, keyI: 2.6, keyPos: [6, 5, 9], fillI: 0.8, rimI: 0.8, rimC: 0xff9ad0, env: 0, shadow: { extent: 10 } });
    const scene = stage.scene; starBackground(scene, { n: 3000, R: 1500, seed: 6 });
    const hero = makeHero(scene), cat = makeGerald(scene);
    const G = () => { const g = new THREE.Group(); scene.add(g); return g; };
    const s23 = G(); const neb = nebulaCloud(1400, 4, 26); s23.add(neb); const neb2 = nebulaCloud(600, 8, 12); neb2.position.set(4, 2, -6); s23.add(neb2);
    const s24 = G(); const pillar = nebulaPillar(14, 3); pillar.position.set(0, -14.5, 0); s24.add(pillar); const nb3 = nebulaCloud(900, 11, 30); nb3.position.set(0, 0, -20); s24.add(nb3);
    const blanket = picnicBlanket(); blanket.position.set(0, pillar.userData.top - 14.5 + 0.03, 0); s24.add(blanket);
    { const ty = pillar.userData.top - 14.5, hc = ty - (14 + 0.5 - 14.5) + 0.2; const m = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 2.0, hc, 20), new THREE.MeshStandardMaterial({ color: 0x6a3a5a, roughness: 1, emissive: 0x401020, emissiveIntensity: 0.3 })); m.position.set(0, ty - hc / 2 + 0.01, 0); s24.add(m); }   // flat ledge under the blanket
    const fam = ['alien', 'alienB', 'alienKid'].map((p) => { const a = makePerson(scene, p); antennae(a, p === 'alienB' ? 0xff7ad0 : 0xffd23f); s24.add(a.root); return a; });
    const s25 = G(); const gal = makeGalaxy(3, 9000, 60, 12); gal.position.set(0, -40, -30); gal.rotation.x = 0.35; s25.add(gal);
    const suit = geraldSuit(cat); suit.visible = false; const bc = briefcase(); scene.add(bc);
    const lines = speedLines(scene, { n: 90, len: 2.8, R: 3.4 });
    return { stage, scene, hero, cat, s23, s24, s25, neb, pillar, blanket, fam, gal, suit, bc, lines };
  },
  frame(t, S, ctx) {
    const { hero, cat } = S, out = { voiceY: {}, roastY: 1580 };
    const sh = t < 55.6 ? 23 : t < 58.0 ? 24 : 25;
    S.s23.visible = sh === 23; S.s24.visible = sh === 24; S.s25.visible = sh === 25; S.bc.visible = sh === 25; S.suit.visible = sh === 25;
    cat.root.visible = false; cat.root.scale.setScalar(1); hero.root.scale.setScalar(1); hero.root.rotation.set(0, 0.4, 0);
    let c, hp, pose = P.rise(t), face = F.fly, lk = 0.2;
    if (sh === 23) {
      const u = seg(t, 53.2, 55.6); S.neb.rotation.y = t * 0.05; hp = [0, lerp(-0.4, 0.6, u), 0];
      pose = { ...P.rise(t), hy: Math.sin(t) * 0.2 }; face = { ...F.wow, smile: 0.5 };
      { const az = lerp(-70, 35, smooth(u)) * Math.PI / 180, d = lerp(9, 4.6, smooth(u)); c = cam([Math.sin(az) * d, hp[1] + lerp(-2.5, 1.4, smooth(u)), Math.cos(az) * d], [0, hp[1] + 1.2, 0], 46); }   // v3: drone swoop in through the nebula
    } else if (sh === 24) {
      // the picnic on top of the pillar: mum, dad and kid aliens on the blanket, Gerald on the blanket; unison la peace 56.8
      const u = seg(t, 55.6, 58.0), top = S.blanket.position.y;
      const seats = [[-0.55, 0.2, 0.5], [0.55, 0.15, -0.4], [0.05, -0.45, 0.1]];
      S.fam.forEach((a, i) => { const [x, z, ry] = seats[i]; a.root.position.set(x, top, z); a.root.rotation.y = ry; const base = { ...POSES.sit(t + i, 0.16), lLf: 1.5, lRf: 1.5, lLk: 0.12, lRk: 0.12, hx: -0.3 };   // v3 (note #16): sit ON the blanket, legs out in front (seat 0 sank the legs into the pillar)
        if (t >= 56.5 && t < 57.9) laPeace(a, t, 'picnic', ctx, { ...base, ...POSES.laPeace(t + i * 0.2), bob: base.bob, lLf: base.lLf, lRf: base.lRf, lLk: base.lLk, lRk: base.lRk, hx: -0.3 }); else { a.pose({ ...base, aRf: 1.2, aRe: 0.8 }); a.face({ ...FACES.shock, open: 0.5 }); } });
      cat.root.visible = true; cat.root.position.set(0.75, top + 0.02, 0.55); cat.root.rotation.y = 0.8; cat.root.scale.setScalar(1.0); cat.pose(APOSES.loaf(t)); cat.face(AFACES.deadpan);
      hp = [1.3, top + lerp(-2.6, 1.6, u), -1.4];
      c = mixCam(cam([1.0, top + 1.7, 7.2], [0.3, top + 1.1, 0], 44), cam([0.9, top + 1.65, 6.6], [0.3, top + 1.1, 0], 44), smooth(u)); out.voiceY.picnic = 1560;
    } else {
      // the Milky Way below; Gerald floats past in a suit, the briefcase drifting beside him (r6 58.4)
      const u = seg(t, 58.0, 60.4); S.gal.rotation.y = t * 0.03;
      cat.root.visible = true; cat.root.position.set(lerp(-1.6, 0.5, u), lerp(0.6, 0.9, u), -0.6); cat.root.rotation.set(0.2, 0.9 + u * 0.4, 0.15 * Math.sin(t)); cat.root.scale.setScalar(1.25); cat.pose({ ...APOSES.stare(t), legFL: 0.3, legBL: -0.2 }); cat.face(AFACES.bored);
      S.bc.position.set(lerp(-1.0, 1.0, u), lerp(0.4, 0.75, u), -0.3); S.bc.rotation.set(t * 0.6, t * 0.4, 0.3);
      hp = [1.1, lerp(-1.8, 0.4, u), -2.2];
      c = mixCam(cam([0.6, 2.2, 3.8], [0, 0.0, -2], 48), cam([0.6, 2.0, 3.5], [0, 0.0, -2], 48), smooth(u)); lk = 0.12;
    }
    hero.root.position.set(...hp); hero.pose(pose); hero.face(face); S.lines.set(t, hp, 1.4, 'y', lk);
    out.cam = c; out.keyFocus = hp; out.keyDist = 12;
    return out;
  },
};
