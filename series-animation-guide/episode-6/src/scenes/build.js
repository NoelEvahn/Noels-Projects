// BUILD (3-26 s): the world gets smaller. One location per shot; each shot straddles a counter tick (growth pop + pull-back).
// Units are metres. The hero's size follows the counter (TL.growK). Landmarks are placed relative to his hand / elbow / face
// so the gags land whatever the scale (cartoon scale, sized for the joke: the numbers are what the viewer reads).
import { THREE, makeHero, person, makeGerald, geraldSuit, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, hash, mat, glow, add, box, cyl, sph, cone, rbox, rng, makeStage, laPeace, talk, heroHeight, skyBG, helicopter, eiffel, mountain, cracks, ring, puffs } from '../common.js';
import { houseFront, fence, windowFrame, phone, tablet } from '../../../assets/library/props/home.js';
import { roundTree, bushClump, pineTree } from '../../../assets/library/props/nature.js';
import { skyline, landmark, makeEarth, drawHeroFace } from '../../../assets/library/props/world.js';
import { cloud, cloudFloor } from '../../../assets/library/props/sky.js';
import { curtains } from '../../../assets/library/sets/livingroom.js';
import { canvasTex } from '../../../assets/library/util.js';

const V = new THREE.Vector3();
const wp = (o) => o.getWorldPosition(new THREE.Vector3());
function setShadow(stage, ext) { const c = stage.key.shadow.camera; if (c.right !== ext) { Object.assign(c, { left: -ext, right: ext, top: ext, bottom: -ext, near: ext * 0.05, far: ext * 8 }); c.updateProjectionMatrix(); } }
// giant: scale, place, pose; returns the hero
function giant(h, k, pos, ry, pose, face) { h.root.visible = true; h.root.scale.setScalar(k); h.root.position.set(...pos); h.root.rotation.set(0, ry, 0); h.pose(pose); h.face(face); h.root.updateMatrixWorld(true); return h; }
function placeHead(h, target) { h.root.updateMatrixWorld(true); const hp = wp(h.head); h.root.position.add(new THREE.Vector3(...target).sub(hp)); h.root.updateMatrixWorld(true); }
const fwdOf = (ry) => [Math.sin(ry), 0, Math.cos(ry)], rightOf = (ry) => [Math.cos(ry), 0, -Math.sin(ry)];
const SQUAT = (t, k = 1) => ({ bob: -0.3 * k, lLf: 1.5 * k, lRf: 1.5 * k, lLk: 2.1 * k, lRk: 2.1 * k, lean: 0.55 * k, footFlat: 1, aLf: 0.6, aRf: 0.6, aLe: 0.5, aRe: 0.5, hx: 0.25 });

export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#7fc0ff', '#eaf6ff'], ground: null, hemiI: 1.05, keyI: 2.4, keyPos: [4, 9, 6], fillI: 0.7, shadow: { extent: 40, size: 2048 } });
    const scene = stage.scene, HH = heroHeight(), hero = makeHero(scene), L = {};
    const grp = (name) => { const g = new THREE.Group(); scene.add(g); L[name] = g; return g; };
    const ground = (g, color, R = 4000) => { const m = add(g, new THREE.CircleGeometry(R, 64), mat(color, { rough: 1 }), [0, 0, 0], [-Math.PI / 2, 0, 0]); m.receiveShadow = true; return m; };
    // ---- lady: suburb street, her house facade with an upstairs window she stands at
    { const g = grp('lady'); ground(g, 0x6fbf4a); add(g, box(600, 0.05, 9), mat(0x5a5f68, { rough: 0.9 }), [0, 0.02, 14]);
      const r = rng(4); for (let i = -8; i <= 8; i++) { if (i === 0) continue; const h = houseFront({ w: 8, floors: 2, seed: 10 + i, wall: [0xe8d0f0, 0xd0e8f0, 0xf0e0c0, 0xe0f0d0, 0xf0d0c8][(i + 8) % 5] }); h.position.set(i * 10, 0, 0); g.add(h); const t = roundTree({ seed: 20 + i, h: 4 + r() * 2 }); t.position.set(i * 10 + 5, 0, 6); g.add(t); }
      for (let i = -8; i <= 8; i++) { const h = houseFront({ w: 8, floors: 2, seed: 40 + i }); h.position.set(i * 10, 0, 28); h.rotation.y = Math.PI; g.add(h); }
      // her facade: wall with a window opening at 4 m, a little room behind it, curtains that close
      const wall = mat(0xf3dfba, { rough: 0.9 }), fx = 0, fz = 0.2, ww = 1.4, wh = 1.3, wy = 4.6;
      add(g, box(8, wy - wh / 2, 0.25), wall, [fx, (wy - wh / 2) / 2, fz]); add(g, box(8, 7.5 - (wy + wh / 2), 0.25), wall, [fx, (7.5 + wy + wh / 2) / 2, fz]);
      add(g, box((8 - ww) / 2, wh, 0.25), wall, [fx - (8 + ww) / 4, wy, fz]); add(g, box((8 - ww) / 2, wh, 0.25), wall, [fx + (8 + ww) / 4, wy, fz]);
      add(g, rbox(8.6, 0.3, 0.6, 0.05), mat(0xb4503a), [fx, 7.6, fz]); add(g, box(7.6, 4, 4), mat(0xe8d8c0, { side: THREE.BackSide }), [fx, wy + 0.6, fz - 2.1]);
      const wf = windowFrame(ww, wh, { shutter: 0x3a6ad0, flowers: true }); wf.position.set(fx, wy, fz + 0.13); g.add(wf); wf.traverse((m) => { if (m.isMesh && m.material?.color?.getHex() === 0x9fd6ff) m.visible = false; });
      for (const s of [-1, 1]) { const c = curtains(0.8, 1.4, 0xe8604a); c.position.set(fx + s * 0.9, wy - 0.7, fz - 0.05); g.add(c); L['curt' + s] = c; }
      add(g, box(40, 1.0, 0.2), mat(0xfdfaf0), [0, 0.5, 9]); }
    const lady = person(scene, 'lady'); L.lady.add(lady.root);
    // ---- liberty: harbour, island, statue (placed at his finger)
    { const g = grp('liberty'); add(g, new THREE.CircleGeometry(6000, 64), mat(0x2f6fb5, { rough: 0.25, metal: 0.1 }), [0, 0, 0], [-Math.PI / 2, 0, 0]).receiveShadow = true;
      const isl = new THREE.Group(); g.add(isl); L.isl = isl; add(isl, cyl(9, 11, 2, 24), mat(0x6fa84a, { rough: 1 }), [0, 0.6, 0]); add(isl, cyl(4, 4.4, 1, 8), mat(0xc8b890), [0, 1.8, 0]);
      const st = landmark('liberty'); st.position.y = 2.3; isl.add(st); L.flame = add(isl, sph(0.5, 12, 10), glow(0xffb020, 2.5), [1.9, 2.3 + 13.6, 0]);
      const sk = skyline({ n: 30, spread: 2400, hmin: 60, hmax: 260, seed: 9 }); sk.position.set(0, 0, -2600); g.add(sk); }
    // ---- eiffel: Paris lawns, the tower, his phone
    { const g = grp('eiffel'); ground(g, 0x8cc05a); add(g, box(30, 0.05, 2000), mat(0xd8c8a0), [0, 0.03, 0]);
      const ef = eiffel(); g.add(ef); L.eif = ef; const sk = skyline({ n: 50, spread: 3000, hmin: 25, hmax: 60, seed: 5, palette: [0xe8dcc8, 0xd8ccb8, 0xc8bca8] }); sk.position.set(0, 0, -1800); g.add(sk);
      const ph = phone(0x9fd6ff); L.phone = ph; scene.add(ph); const cr = cracks(11, 7, 0.09, 0xffffff); cr.position.z = 0.009; cr.scale.setScalar(0.5); ph.add(cr); L.phoneCrack = cr; }
    // ---- big ben: Westminster, river
    { const g = grp('bigben'); ground(g, 0x9aa088); add(g, box(4000, 0.1, 160), mat(0x5a7a8a, { rough: 0.3 }), [0, 0.05, 120]);
      const bb = landmark('bigben'); g.add(bb); L.bb = bb; const pal = new THREE.Group(); g.add(pal); for (let i = 0; i < 10; i++) add(pal, box(14, 18, 16), mat(0xd8c9a0, { rough: 0.8 }), [20 + i * 15, 9, 0]); L.pal = pal;
      L.bbRing = [ring(g, 0xfff2c0), ring(g, 0xfff2c0), ring(g, 0xfff2c0)]; }
    // ---- empire: Manhattan, the helicopter + pilot (la peace)
    { const g = grp('empire'); ground(g, 0x6a7a6a); const sk = skyline({ n: 160, spread: 1200, hmin: 40, hmax: 220, seed: 21, palette: [0x9aa0aa, 0xb8b0a0, 0x8a96a8, 0xc8c0b0] }); g.add(sk);
      const es = landmark('empire'); es.scale.setScalar(16); es.position.set(-60, 0, 120); g.add(es); L.es = es;
      const heli = helicopter(); g.add(heli); L.heli = heli; }
    const pilot = person(scene, 'pilot'); L.heli.add(pilot.root);
    // ---- burj: Dubai desert city, reporters
    { const g = grp('burj'); ground(g, 0xe8c890); const sk = skyline({ n: 90, spread: 3000, hmin: 60, hmax: 300, seed: 13, palette: [0xb8d0e8, 0xd8e4f0, 0xa8c0d8] }); sk.position.set(0, 0, -900); g.add(sk);
      const bj = landmark('burj'); bj.scale.setScalar(30); bj.position.set(260, 0, -500); g.add(bj); L.bj = bj;
      const van = new THREE.Group(); g.add(van); add(van, rbox(5, 2.2, 2.2, 0.2), mat(0xffffff), [0, 1.4, 0]); add(van, cyl(0.05, 0.05, 3, 6), mat(0x888888), [0.5, 3.8, 0]); add(van, cyl(0.7, 0.7, 0.1, 16), mat(0xdddddd), [0.5, 5.3, 0], [0.6, 0, 0]); for (const x of [-1.6, 1.6]) for (const z of [-1.1, 1.1]) add(van, cyl(0.4, 0.4, 0.3, 14), mat(0x222222), [x, 0.4, z], [Math.PI / 2, 0, 0]); van.position.set(-4, 0, -6); L.van = van;
      const cl = cloud(rng(3), 1); scene.add(cl); L.headCloud = cl; }
    const rep = person(scene, 'reporter'), camo = person(scene, 'cameraman'); L.burj.add(rep.root, camo.root);
    { const mic = new THREE.Group(); add(mic, cyl(0.02, 0.025, 0.22, 8), mat(0x222222), [0, 0.11, 0]); add(mic, sph(0.045, 12, 10), mat(0x333333), [0, 0.24, 0]); add(mic, box(0.07, 0.05, 0.07), mat(0xd9262c), [0, 0.17, 0]); mic.userData.grip = { upright: true, hand: 'grip' }; rep.hold(mic, 'R'); }
    { const cm = new THREE.Group(); add(cm, rbox(0.25, 0.3, 0.55, 0.04), mat(0x222226), [0, 0.15, 0]); add(cm, cyl(0.08, 0.1, 0.25, 14), mat(0x111111), [0, 0.18, 0.38], [Math.PI / 2, 0, 0]); add(cm, box(0.06, 0.04, 0.06), glow(0xff2020, 2), [0.08, 0.32, 0.15]); L.camRig = cm; camo.head.add(cm); cm.position.set(0.25, 0.0, 0.1); }
    // ---- mountains: range, clouds at ankles, the climber on a peak
    { const g = grp('mountains'); ground(g, 0x7a8a6a, 40000); const r = rng(8);
      for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = r.range(800, 9000); const m = mountain(r.range(1400, 3200), r.range(1500, 3200), i, 0.35); m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.add(m); }
      const pk = mountain(2600, 2000, 99, 0.35); g.add(pk); L.peak = pk; add(g, cyl(2.2, 3.5, 2.2, 10), mat(0x8a8078, { rough: 1, flat: true }), [0, 2598.6, 0]); add(g, cyl(2.3, 2.3, 0.3, 10), mat(0xf4f6fa), [0, 2599.75, 0]);
      const cf = cloudFloor(240, 7000, 6); cf.scale.set(120, 60, 120); cf.position.y = 900; g.add(cf); }
    const climber = person(scene, 'climber'); L.mountains.add(climber.root);
    // ---- clouds: above the cloud floor, the Earth curving away
    { const g = grp('clouds'); const cf = cloudFloor(400, 60000, 9); cf.scale.set(500, 200, 500); g.add(cf);
      const curve = add(g, sph(1, 64, 32), mat(0x4a7ac8, { rough: 0.9 }), [0, -800000, 0]); curve.scale.setScalar(800000 - 300); }
    // ---- gerald control room (screens show the boy + the counter)
    { const g = grp('gerald'); g.position.set(0, 0, 50000);
      add(g, box(14, 0.1, 10), mat(0x1a1d26, { rough: 0.6 }), [0, 0, 0]); add(g, box(14, 6, 0.2), mat(0x20242e), [0, 3, -5]); add(g, box(0.2, 6, 10), mat(0x20242e), [-7, 3, 0]); add(g, box(0.2, 6, 10), mat(0x20242e), [7, 3, 0]); add(g, box(14, 0.2, 10), mat(0x15171e), [0, 6, 0]);
      for (let i = 0; i < 6; i++) add(g, box(0.1, 0.06, 9.6), glow(0x2fe0ff, 1.5), [-6 + i * 2.4, 5.9, 0]);
      const scr = canvasTex(1024, 576, () => {}); const can = scr.image; L.scrCtx = can.getContext('2d'); L.scrTex = scr;
      add(g, box(8.2, 4.6, 0.1), mat(0x0a0c12), [0, 3.2, -4.85]); L.screen = add(g, new THREE.PlaneGeometry(8, 4.5), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false }), [0, 3.2, -4.79]);
      for (const s of [-1, 1]) { add(g, box(3, 2, 0.1), mat(0x0a0c12), [s * 5.4, 3.6, -4.85]); add(g, new THREE.PlaneGeometry(2.8, 1.8), glow(s < 0 ? 0x1a6aff : 0x1aff8a, 0.9), [s * 5.4, 3.6, -4.79]); }
      add(g, rbox(9, 0.9, 1.6, 0.08), mat(0x2a2e3a, { metal: 0.4, rough: 0.4 }), [0, 0.45, -1.6]); for (let i = 0; i < 14; i++) add(g, box(0.18, 0.04, 0.12), glow([0xff3a3a, 0x3aff8a, 0xffd23f, 0x3aa0ff][i % 4], 1.6), [-3.6 + i * 0.55, 0.92, -1.3]);
      add(g, cyl(0.5, 0.55, 0.55, 18), mat(0x111318), [0, 0.28, 0.4]); }
    const ger = makeGerald(scene); geraldSuit(ger); L.gerald.add(ger.root); const tab = tablet(); tab.scale.setScalar(0.5); ger.root.add(tab); tab.position.set(0, 0.16, 0.24); tab.rotation.x = -0.9;
    // ---- everest
    { const g = grp('everest'); ground(g, 0xe8eef4, 200000); const r = rng(12);
      for (let i = 0; i < 30; i++) { const a = r() * 6.28, d = r.range(8000, 60000); const m = mountain(r.range(4000, 7500), r.range(5000, 8000), 50 + i, 0.4); m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.add(m); }
      const ev = mountain(8849, 7000, 7, 0.4); g.add(ev); L.ev = ev; }
    // ---- atmosphere: Earth below (unit: km in this group's scale), sky -> black
    { const g = grp('atmos'); const e = makeEarth(1); e.scale.setScalar(6371000); e.position.set(0, -6371000, 0); g.add(e); L.earth = e; }
    const flame = puffs(scene, { n: 1, size: 0.1 });
    return { stage, scene, hero, L, lady, pilot, rep, camo, climber, ger, HH };
  },
  frame(t, S, ctx) {
    const { hero, L, HH, stage } = S, TL = ctx.TL, out = { capY: {} }, shot = TL.shotAt(t);
    for (const k of ['lady', 'liberty', 'eiffel', 'bigben', 'empire', 'burj', 'mountains', 'clouds', 'gerald', 'everest', 'atmos']) L[k].visible = false;
    L.phone.visible = false; L.headCloud.visible = false;
    const Hm = TL.H0 * TL.growK(t), k = Hm / HH, u = seg(t, shot.t0, shot.t1), tick = (TL.nAt(t) * 2), pop = smooth(seg(t, tick, tick + 0.35));
    stage.key.castShadow = true; S.scene.fog = null; S.scene.background = skyBG('#6fb6ff', '#e6f4ff');
    let c;
    switch (shot.id) {
      case 'lady': {   // 3.0-7.1: he leans down beside her upstairs window; doubles at 4 and 6 (pull-back); la peace 5.95; curtains close 6.6
        L.lady.visible = true; setShadow(stage, Hm * 1.2);
        giant(hero, k, [-0.15 * Hm - 2, 0, -0.2 * Hm], 0.55, { ...SQUAT(t, 0.85), hx: 0.35, hy: 0.2 }, { ...FACES.happy, brow: 0.5, eye: 1.15 });
        const ld = S.lady; ld.root.position.set(0, 3.3, -0.35); ld.root.rotation.y = 0.05;
        if (t >= 5.6 && t < 6.9) laPeace(ld, t, 'lady', ctx, { hx: -0.25 }); else { ld.pose({ ...POSES.idle(t), hx: -0.3, hy: -0.3 }); ld.face(FACES.deadpan); }
        const close = smooth(seg(t, 6.55, 6.95)); for (const s of [-1, 1]) L['curt' + s].position.x = s * lerp(1.15, 0.38, close);
        const head = wp(hero.head), win = new THREE.Vector3(0, 4.6, 0.2);
        const d = lerp(10, 26, smooth(seg(t, 4.0, 4.6))) * (t > 6.0 ? lerp(1, 1.5, smooth(seg(t, 6.0, 6.4))) : 1);
        c = cam([win.x + d * 0.55, win.y + 1.2 + (head.y - win.y) * 0.15, win.z + d], [lerp(win.x, head.x, 0.35), lerp(win.y, head.y, 0.42), lerp(win.z, head.z, 0.3)], 48);
        if (t > 5.4) { const kk = smooth(seg(t, 5.4, 5.9)); c = mixCam(c, cam([1.0, 5.0, 4.6], [0, 4.75, -0.2], 40), kk * (1 - smooth(seg(t, 6.75, 7.1)))); }
        out.capY.lady = 1520; out.narrY = 1560; out.keyFocus = [0, 4, 0]; out.keyDist = Hm * 1.5; break; }
      case 'liberty': {   // 7.1-8.4 (57.6 -> 115.2 at 8.0): stands in the harbour, pokes the crown; the torch flickers; "Oops." 7.6
        L.liberty.visible = true; setShadow(stage, Hm * 1.2); S.scene.fog = new THREE.Fog(0xcfe6f8, 1500, 9000);
        const reach = smooth(seg(t, 7.1, 7.5));
        giant(hero, k, [0, -0.08 * Hm, 0], -0.5, { ...POSES.point(t), aRf: 1.05 + 0.25 * reach, aRs: 0.25, lean: 0.15, hx: 0.35, hR: 'point' }, t > 7.55 ? talk(ctx, 'oops', t, { ...FACES.shock, open: 0.3, brow: 0.9 }) : { ...FACES.happy, smile: 0.5 });
        const tip = wp(hero.handR); const sS = (57.6 * 1.05) / 13.6;   // statue ~ his chest height at 57.6 m
        L.isl.scale.setScalar(sS); L.isl.position.set(tip.x + 1.2 * sS, 0, tip.z + 1.2 * sS); L.isl.position.y = Math.min(0, tip.y - (2.3 + 11.6) * sS);
        L.flame.scale.setScalar(0.6 + 0.8 * Math.abs(Math.sin(t * 37)) * (t > 7.45 ? 1 : 0.4)); L.flame.visible = !(t > 7.5 && t < 7.9 && Math.sin(t * 61) > 0.2);
        const s0 = wp(L.isl); c = cam([s0.x + 30 * sS, 9 * sS, s0.z + 42 * sS], [lerp(s0.x, tip.x, 0.5), (tip.y + wp(hero.head).y) * 0.45, lerp(s0.z, tip.z, 0.5)], 50);
        if (t >= 8.0) { c.pos = c.pos.map((v, i) => (i === 1 ? v * lerp(1, 1.7, pop) : v * lerp(1, 1.5, pop))); }
        out.capY.oops = 1540; out.keyFocus = [s0.x, 10, s0.z]; out.keyDist = Hm * 2; out.far = 12000; break; }
      case 'eiffel': {   // 8.4-10.0 (230.4): crouches for a selfie with the tower; the phone screen cracks at 9.2
        L.eiffel.visible = true; setShadow(stage, Hm * 1.2); S.scene.fog = new THREE.Fog(0xdce8f4, 2000, 12000);
        giant(hero, k, [0, 0, 0], 0.5, { ...SQUAT(t, 0.75), aRf: 2.4, aRs: 0.35, aRe: 0.35, aLs: 0.5, aLf: 0.2, hx: -0.1, hy: 0.35, hR: 'grip', lean: 0.2 }, { ...FACES.happy, smile: 1, wide: 1.3, brow: 0.5, eye: 1.1 });
        const hp = wp(hero.handR); L.phone.visible = true; L.phone.scale.setScalar(k * 1.6); L.phone.position.copy(hp); L.phone.lookAt(wp(hero.head)); L.phone.rotateY(0.9);
        if (t > 9.2) { L.phone.position.x += Math.sin(t * 80) * k * 0.01; }
        L.phoneCrack.visible = t >= 9.2;
        const head = wp(hero.head), F = fwdOf(0.5), R = rightOf(0.5); L.eif.scale.setScalar((Hm * 0.5) / 27); L.eif.position.set(head.x - R[0] * Hm * 0.3 - F[0] * Hm * 0.12, 0, head.z - R[2] * Hm * 0.3 - F[2] * Hm * 0.12);
        const D = Hm * lerp(0.95, 1.05, u); c = cam([head.x + F[0] * D + R[0] * Hm * 0.1, head.y * 0.62, head.z + F[2] * D + R[2] * Hm * 0.1], [head.x - R[0] * Hm * 0.12, head.y * 0.6, head.z - R[2] * Hm * 0.12], 50);
        if (t > 9.15) { const sh = (1 - seg(t, 9.15, 9.6)) * Hm * 0.004; c.pos[0] += Math.sin(t * 90) * sh; c.pos[1] += Math.cos(t * 77) * sh; }
        out.keyFocus = [head.x, head.y * 0.5, head.z]; out.keyDist = Hm * 2; out.far = 15000; break; }
      case 'bigben': {   // 10.0-11.8 (460.8): kneels with his ear by the clock; it rings 10.3; flinches "AH!" 10.6
        L.bigben.visible = true; setShadow(stage, Hm); S.scene.fog = new THREE.Fog(0xd0dce8, 2000, 14000);
        const fl = smooth(seg(t, 10.55, 10.75));
        giant(hero, k, [0, 0, 0], -0.9, { ...SQUAT(t, 0.9), lean: lerp(0.75, 0.25, fl), hx: lerp(0.3, -0.25, fl), hz: lerp(0.35, -0.2, fl), aLs: lerp(0.4, 1.3, fl), aLe: lerp(0.4, 2.2, fl), aRs: lerp(0.4, 1.3, fl), aRe: lerp(0.4, 2.2, fl), aLf: lerp(0.6, 0.9, fl), aRf: lerp(0.6, 0.9, fl), hL: 'open', hR: 'open' },
          t > 10.55 ? talk(ctx, 'ah', t, { ...FACES.scream, open: 0.6, lid: 0.3 }) : { ...FACES.question, open: 0.1 });
        const head = wp(hero.head), sB = (Hm * 0.24) / 17; L.bb.scale.setScalar(sB);
        if (t < 10.6) L.bb.position.set(head.x + Hm * 0.06, 0, head.z + Hm * 0.07); L.pal.scale.setScalar(sB); L.pal.position.copy(L.bb.position);
        const clock = new THREE.Vector3(L.bb.position.x, 11 * sB, L.bb.position.z + 1.6 * sB);
        L.bbRing.forEach((r, i) => r.set(t - 10.3 - i * 0.12, [clock.x, clock.y, clock.z], 6 * sB, 0.7));
        c = cam([clock.x + 24 * sB, clock.y + 1.0 * sB, clock.z + 32 * sB], [lerp(clock.x, head.x, 0.5), lerp(clock.y, head.y, 0.55), lerp(clock.z, head.z, 0.5)], 52);
        if (t > 10.3 && t < 10.8) { const a = (1 - seg(t, 10.3, 10.8)) * sB * 0.4; c.pos[0] += Math.sin(t * 95) * a; c.pos[1] += Math.cos(t * 83) * a; }
        out.capY.ah = 1540; out.keyFocus = [clock.x, clock.y, clock.z]; out.keyDist = Hm * 2; out.far = 20000; break; }
      case 'empire': {   // 11.8-13.6 (460.8 -> 921.6 at 12): the news helicopter passes his face, the pilot says la peace 12.3, turns and flees 13.0
        L.empire.visible = true; setShadow(stage, Hm); S.scene.fog = new THREE.Fog(0xc8d8e8, 3000, 20000);
        giant(hero, k, [0, 0, 0], 0.2, { ...POSES.idle(t), hx: 0.1, hy: -0.35 }, { ...FACES.question, open: 0.15, eye: 1.2 });
        const head = wp(hero.head); L.es.scale.setScalar(Hm * 0.25 / 27); L.es.position.set(head.x - Hm * 0.2, 0, head.z + Hm * 0.2);
        const hv = L.heli, HR = hero.R * k, F = new THREE.Vector3(...fwdOf(0.2 - 0.35)), Rt = new THREE.Vector3(...rightOf(0.2 - 0.35));
        // the helicopter hovers in front of his face (2 head-radii out), drifting across; turns and flees from 13.0
        const fr = smooth(seg(t, 13.0, 13.55)), drift = (t - 12.3) * HR * 0.08;
        const hp0 = new THREE.Vector3().copy(head).addScaledVector(F, HR * 2.1).addScaledVector(Rt, drift - fr * HR * 0.9).add(new THREE.Vector3(0, -HR * 0.15 + fr * HR * 0.2, 0));
        hv.position.copy(hp0); hv.scale.setScalar(2.2);
        const toFace = Math.atan2(head.x - hp0.x, head.z - hp0.z); hv.rotation.set(0.05, (t < 12.15 ? toFace : toFace + Math.PI - 0.25) + fr * 1.6, -0.05 + fr * 0.4);
        hv.userData.rotor.rotation.y = t * 40; hv.userData.tail.rotation.x = t * 60;
        const pl = S.pilot; pl.root.position.copy(hv.userData.seat); pl.root.scale.setScalar(0.62); pl.root.rotation.y = 0;
        if (t >= 12.15 && t < 13.2) laPeace(pl, t, 'pilot', ctx, { ...POSES.sitOn(t, 0.0), ...POSES.laPeace(t), hy: 0.1 }); else { pl.pose({ ...POSES.sitOn(t, 0.0), hy: 0.3 }); pl.face(FACES.shock); }
        hv.updateMatrixWorld(true); const pp = wp(pl.head), dir = new THREE.Vector3().subVectors(head, pp).normalize(), side = new THREE.Vector3(dir.z, 0, -dir.x);
        if (t < 12.15) {   // wide: the helicopter tiny in front of the huge face
          c = cam([pp.x - dir.x * HR * 1.2 + side.x * HR * 0.5, pp.y + HR * 0.15, pp.z - dir.z * HR * 1.2 + side.z * HR * 0.5], [lerp(pp.x, head.x, 0.45), lerp(pp.y, head.y, 0.45), lerp(pp.z, head.z, 0.45)], 50);
        } else {           // close: the pilot in the bubble (la peace), his giant face behind
          c = cam([pp.x - dir.x * 8 + side.x * 1.2, pp.y + 0.3, pp.z - dir.z * 8 + side.z * 1.2], [pp.x + dir.x * 30, pp.y + 4.2, pp.z + dir.z * 30], 44);
        }
        out.capY.pilot = 760; out.keyFocus = [pp.x, pp.y, pp.z]; out.keyDist = 30; stage.key.castShadow = false; out.far = 30000; break; }
      case 'burj': {   // 13.6-16.4 (921.6 -> 1.8 km at 14 -> 3.7 km at 16): reporters in front, he scratches his head, a cloud moves with his hand
        L.burj.visible = true; setShadow(stage, 30); S.scene.fog = new THREE.Fog(0xf0e4cc, 4000, 40000); S.scene.background = skyBG('#78b8f0', '#f4e8d0');
        const scr = smooth(seg(t, 15.0, 15.4)) * (1 - smooth(seg(t, 16.0, 16.4)));
        giant(hero, k, [-120, 0, -1050], 0.15, { ...POSES.idle(t), aRf: lerp(0.1, 0.4, scr), aRs: lerp(0.12, 2.2, scr), aRe: lerp(0.14, 2.3, scr) + Math.sin(t * 14) * 0.15 * scr, hR: 'open', hx: 0.12, hz: -0.1 * scr }, { ...FACES.question, open: 0.1 });
        const bj = L.bj; bj.scale.setScalar(828 / 30); bj.position.set(380, 0, -1150);
        if (scr > 0.05) { L.headCloud.visible = true; const hp = wp(hero.handR); L.headCloud.scale.set(Hm * 0.06, Hm * 0.04, Hm * 0.06); L.headCloud.position.set(hp.x + Hm * 0.02, hp.y + Hm * 0.02, hp.z); }
        const rp = S.rep; rp.root.position.set(0, 0, 0); rp.root.rotation.y = 0.35; rp.pose({ ...POSES.holdR(t), aRf: 1.3, hy: 0.25, hx: -0.15 }); rp.face(talk(ctx, 'reporter', t, { smile: 0.1, brow: 0.6 }));
        const cm = S.camo; cm.root.position.set(1.6, 0, 1.9); cm.root.rotation.y = Math.PI + 0.5; cm.pose({ ...POSES.idle(t), aRf: 1.2, aRe: 1.6, aRs: 0.4, hx: -0.15 }); cm.face(FACES.shock);
        // low, behind the camera operator: reporter in front, the giant towering behind
        c = cam([2.4, 0.55, 4.8], [0.1, 3.3 + 0.4 * smooth(u), 0], 68);
        out.capYAll = 1560; out.capY.reporter = 1560; out.keyFocus = [0, 1, 0]; out.keyDist = 12; out.far = 60000; break; }
      case 'mountains': {   // 16.4-18.4 (3.7 km): a climber on a peak, his face leans down: "You good?" 17.0; thumbs-up 17.6
        L.mountains.visible = true; stage.key.castShadow = false; S.scene.fog = new THREE.Fog(0xd8e8f8, 8000, 60000); S.scene.background = skyBG('#5aa0f0', '#e0f0ff');
        const peakTop = new THREE.Vector3(0, 2600, 0);
        const clb = S.climber; clb.root.position.copy(peakTop).add(new THREE.Vector3(0, -0.1, 0)); clb.root.rotation.y = 0.6;
        const up = smooth(seg(t, 17.55, 17.8)); clb.pose({ ...POSES.idle(t), aRf: lerp(0.3, 1.2, up), aRs: lerp(0.15, 0.3, up), aRe: lerp(0.2, 1.8, up), hR: up > 0.5 ? [0, 1, 1, 1, 1] : 'fist', hx: -0.6, hy: 0.4 }); clb.face(up > 0.5 ? { ...FACES.shock, smile: 0.2, open: 0.2 } : FACES.shock);
        giant(hero, k, [0, 0, 0], 0.67, { ...SQUAT(t, 0.6), lean: 1.0, hx: 0.6, aLf: 0.9, aRf: 0.9 }, talk(ctx, 'yougood', t, { ...FACES.happy, smile: 0.4, brow: 0.6 }));
        placeHead(hero, [peakTop.x - 990, peakTop.y + 1320, peakTop.z - 1210]);
        const head = wp(hero.head), cp = clb.root.position;
        const cpos = new THREE.Vector3(cp.x + 2.4, cp.y + 0.7, cp.z + 3.6), ch = new THREE.Vector3(cp.x, cp.y + 1.3, cp.z);
        const td = new THREE.Vector3().subVectors(head, cpos).normalize().multiplyScalar(0.5).add(new THREE.Vector3().subVectors(ch, cpos).normalize().multiplyScalar(0.5)).normalize();
        c = cam(cpos.toArray(), cpos.clone().add(td).toArray(), 72);
        out.capY.yougood = 1560; out.keyFocus = false; out.near = 0.3; out.far = 90000; break; }
      case 'clouds': {   // 18.4-20.8 (7.4 km -> 14.7 at 20): above the clouds, the Earth curves, his head nearly in space; narrator n2
        L.clouds.visible = true; stage.key.castShadow = false; S.scene.background = skyBG(t < 20 ? '#2a5aa8' : '#16305a', '#b8dcff');
        giant(hero, k, [0, -Hm * 0.25, 0], -0.3, { ...POSES.idle(t), hx: -0.2, aLs: 0.3, aRs: 0.3 }, { ...FACES.happy, smile: 0.6, eye: 1.15, brow: 0.4 });
        const head = wp(hero.head), d = Hm * lerp(0.9, 1.25, smooth(u));
        c = cam([head.x + d * 0.7, head.y * 0.55, head.z + d], [head.x, head.y * 0.62, head.z], 50);
        out.near = Hm * 0.01; out.far = Hm * 400; out.keyFocus = false; break; }
      case 'gerald1': {   // 20.8-22.4: Gerald in his suit in a control room, doing nothing. The counter ticks at 22 on his screen.
        L.gerald.visible = true; stage.key.castShadow = true; setShadow(stage, 8); S.scene.background = skyBG('#0a0c14', '#0a0c14'); hero.root.visible = false;
        const g = S.ger; g.root.position.set(0, 0.55, 0.4); g.root.rotation.y = 0.15; g.pose({ ...APOSES.sit(t), legFL: -0.6, legFR: 0.1 }); g.face(t > 21.6 && t < 21.75 ? AFACES.sleepy : AFACES.deadpan);
        const sc = L.scrCtx, W = 1024, Hh = 576; sc.fillStyle = '#081428'; sc.fillRect(0, 0, W, Hh); sc.strokeStyle = 'rgba(80,200,255,0.25)'; for (let x = 0; x < W; x += 64) { sc.beginPath(); sc.moveTo(x, 0); sc.lineTo(x, Hh); sc.stroke(); }
        drawHeroFace(sc, 300, 300, 2.0, { mouth: 0.5 }); const s = TL.shown(t); sc.fillStyle = '#ffd21f'; sc.font = '120px Anton'; sc.textAlign = 'center'; sc.fillText(`${s.value} ${s.unit}`, 720, 330); sc.font = '50px Anton'; sc.fillStyle = '#9be7ff'; sc.fillText('SUBJECT HEIGHT', 720, 200); L.scrTex.needsUpdate = true;
        const gp = wp(g.root); c = cam([gp.x + 1.4, gp.y + 0.55, gp.z + 2.6 - 0.3 * smooth(u)], [gp.x - 0.3, gp.y + 0.55, gp.z - 1.0], 44);
        out.keyFocus = [gp.x, gp.y, gp.z]; out.keyDist = 6; out.near = 0.05; out.far = 200; break; }
      case 'everest': {   // 22.4-24.2 (29.5 km): kneels and rests his elbow on the summit
        L.everest.visible = true; stage.key.castShadow = false; S.scene.background = skyBG('#1a3a78', '#a8ccf0'); S.scene.fog = new THREE.Fog(0xc8dcf0, 30000, 300000);
        giant(hero, k, [0, -Hm * 0.12, 0], 0.4, { bob: -0.35, lLf: 1.6, lRf: 0.1, lLk: 1.7, lRk: 2.4, footFlat: 1, lean: 0.4, aLf: 1.2, aLe: 1.9, aLs: 0.15, aRf: 0.3, aRs: 0.3, hx: 0.15, hy: -0.4, hz: 0.25, hL: 'fist' }, { ...FACES.smug, smile: 0.5 });
        const el = wp(hero.aL.el); L.ev.position.set(el.x, el.y - 8849 * 1.0, el.z); L.ev.scale.set(1.6, 1, 1.6);
        const head = wp(hero.head); c = cam([el.x + Hm * 0.55, el.y + Hm * 0.08, el.z + Hm * 0.7], [lerp(el.x, head.x, 0.4), lerp(el.y, head.y, 0.45), lerp(el.z, head.z, 0.4)], 46);
        out.near = Hm * 0.005; out.far = Hm * 40; out.keyFocus = false; break; }
      case 'atmos': {   // 24.2-26.0 (59 km -> 118 at 26): he rises out of the atmosphere, the sky turns black
        L.atmos.visible = true; stage.key.castShadow = false; const dk = smooth(seg(t, 24.4, 25.6));
        S.scene.background = skyBG(dk > 0.5 ? '#000000' : '#081830', dk > 0.5 ? '#0a1a3a' : '#5a9ae0');
        giant(hero, k, [0, Hm * lerp(0.0, 0.25, smooth(u)), 0], -0.4, { ...POSES.float(t), aLs: 1.0, aRs: 1.0, hx: 0.1 }, { ...FACES.shock, open: 0.35, smile: 0.3, eye: 1.25 });
        const head = wp(hero.head); c = cam([head.x + Hm * 0.9, head.y * 1.05, head.z + Hm * 1.4], [head.x, head.y * 0.35, head.z], 55);
        out.near = Hm * 0.01; out.far = 3e7; out.keyFocus = false; break; }
      default: c = cam([0, 2, 10], [0, 1, 0]);
    }
    hero.root.visible = shot.id !== 'gerald1';
    out.cam = c; return out;
  },
};
