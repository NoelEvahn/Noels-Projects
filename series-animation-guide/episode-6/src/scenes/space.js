// CHAOS (26.0-45.6): NASA goes silent, he becomes a global problem, the Moon, the counter breaks ("rules"), Earth as a marble,
// tossing Earth, a satellite in the nose, then the walk: the foot over the Earth (WAIT FOR IT; the phonk is building).
// Space units are arbitrary: the hero's size is set per shot against the Earth (R = 1) for the gag.
import { THREE, makeHero, person, POSES, FACES, clamp, smooth, lerp, cam, mixCam, seg, hash, mat, glow, add, box, cyl, sph, rbox, tor, rng, makeStage, laPeace, talk, heroHeight, skyBG, starBackground, giantShoe, ring } from '../common.js';
import { makeEarth, makeMoon, drawHeroFace } from '../../../assets/library/props/world.js';
import { satellite } from '../../../assets/library/props/space.js';
import { canvasTex } from '../../../assets/library/util.js';

const wp = (o) => o.getWorldPosition(new THREE.Vector3());
function giant(h, k, pos, ry, pose, face, rx = 0, rz = 0) { h.root.visible = true; h.root.scale.setScalar(k); h.root.position.set(...pos); h.root.rotation.set(rx, ry, rz); h.pose(pose); h.face(face); h.root.updateMatrixWorld(true); return h; }

export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#000000', '#05060c'], ground: null, hemiI: 0.35, hemiSky: 0x9ab0ff, hemiGround: 0x101018, keyI: 3.0, key: 0xfff4e0, keyPos: [6, 3, 5], fillI: 0.35, rimI: 1.2, env: 0.15, shadow: { extent: 30 } });
    const scene = stage.scene, HH = heroHeight(); stage.key.castShadow = false;
    const hero = makeHero(scene); const stars = starBackground(scene, { n: 3000, R: 3000 });
    const earth = makeEarth(1); scene.add(earth);
    const moon = makeMoon(1); scene.add(moon);
    { // a face on the Moon: eyes (white + pupils), brows, a mouth that opens with the voice
      const f = new THREE.Group(); moon.add(f); moon.userData.face = f; const wM = mat(0xffffff, { rough: 0.4 }), kM = mat(0x15151c);
      for (const s of [-1, 1]) { add(f, sph(0.2, 20, 14), wM, [s * 0.3, 0.2, 0.9], [0, 0, 0], [1, 1.1, 0.5]); add(f, sph(0.08, 14, 10), kM, [s * 0.28, 0.17, 1.0]); add(f, box(0.28, 0.05, 0.05), mat(0x6a6660), [s * 0.3, 0.46, 0.93], [0, 0, -s * 0.35]); }
      const m = add(f, sph(0.16, 18, 12), mat(0x5a2030), [0, -0.3, 0.93], [0, 0, 0], [1.4, 0.3, 0.4]); moon.userData.mouth = m; }
    const sat = satellite(3, 0.04); scene.add(sat); const sat2 = satellite(5, 0.04); scene.add(sat2);
    const shoe = giantShoe({ shin: 3.0 }); scene.add(shoe);
    const bonk = ring(scene, 0xffffff);
    // NASA mission control (its own corner of the world, far away)
    const nasa = new THREE.Group(); nasa.position.set(0, 0, 90000); scene.add(nasa);
    const nasaLight = new THREE.PointLight(0xcfe0ff, 60, 30, 1.5); nasaLight.position.set(0, 5, 2); nasa.add(nasaLight); const nasaKey = new THREE.DirectionalLight(0xffffff, 1.6); nasaKey.position.set(3, 8, 6); nasa.add(nasaKey); nasa.add(nasaKey.target);
    { add(nasa, box(18, 0.1, 14), mat(0x2a2e3a, { rough: 0.7 }), [0, 0, 0]); add(nasa, box(18, 7, 0.2), mat(0x1c2030), [0, 3.5, -6]); add(nasa, box(0.2, 7, 14), mat(0x1c2030), [-9, 3.5, 0]); add(nasa, box(0.2, 7, 14), mat(0x1c2030), [9, 3.5, 0]);
      const scr = canvasTex(1024, 512, () => {}); nasa.userData.ctx = scr.image.getContext('2d'); nasa.userData.tex = scr;
      add(nasa, box(10.3, 5.3, 0.1), mat(0x0a0c12), [0, 3.8, -5.85]); add(nasa, new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false }), [0, 3.8, -5.79]);
      for (const s of [-1, 1]) { add(nasa, box(3.4, 2.2, 0.1), mat(0x0a0c12), [s * 6.8, 4.2, -5.85]); add(nasa, new THREE.PlaneGeometry(3.2, 2.0), glow(s < 0 ? 0x2a8aff : 0x20d080, 0.8), [s * 6.8, 4.2, -5.79]); }
      for (const row of [0, 1]) { const z = -2 + row * 2.6; add(nasa, rbox(12, 0.9, 1.0, 0.06), mat(0x3a4052, { metal: 0.3, rough: 0.4 }), [0, 0.45 + row * 0.25, z]); for (let i = 0; i < 6; i++) { add(nasa, box(1.3, 0.8, 0.06), mat(0x0a0c12), [-5 + i * 2, 1.3 + row * 0.25, z - 0.35], [-0.25, 0, 0]); add(nasa, box(1.2, 0.7, 0.01), glow([0x2a8aff, 0x20d080, 0xffd23f][(i + row) % 3], 0.7), [-5 + i * 2, 1.3 + row * 0.25, z - 0.31], [-0.25, 0, 0]); } } }
    const crew = ['nasaA', 'nasaB', 'nasaC'].map((p) => { const c = person(scene, p); nasa.add(c.root); return c; });
    { const hs = new THREE.Group(); add(hs, tor(0.36, 0.025, 6, 20, Math.PI), mat(0x222222), [0, 0.2, 0], [0, 0, 0]); add(hs, cyl(0.012, 0.012, 0.25, 6), mat(0x222222), [0.3, -0.05, 0.12], [0.5, 0, 1.1]); crew[0].head.add(hs); }
    return { stage, scene, HH, hero, stars, earth, moon, sat, sat2, shoe, bonk, nasa, crew };
  },
  frame(t, S, ctx) {
    const { hero, earth, moon, HH } = S, TL = ctx.TL, shot = TL.shotAt(t), u = seg(t, shot.t0, shot.t1), out = { capY: {}, near: 0.01, far: 20000 };
    earth.visible = moon.visible = S.sat.visible = S.sat2.visible = S.shoe.visible = false; S.nasa.visible = false; hero.root.visible = true; S.stars.visible = true;
    earth.position.set(0, 0, 0); earth.scale.setScalar(1); earth.rotation.set(0.4, t * 0.05, 0); earth.update?.(t); moon.scale.setScalar(0.27); moon.userData.face.visible = false; S.bonk.set(-1, [0, 0, 0]);
    S.scene.background = skyBG('#02030a', '#0a0c1c'); S.stage.key.position.set(6, 3, 5); S.stage.key.target.position.set(0, 0, 0);
    let c;
    switch (shot.id) {
      case 'nasa': {   // 26.0-28.0: the big screen glitches 59 km -> 118 km -> ERROR... one flight controller: la peace 26.6, then dead silence
        S.nasa.visible = true; S.stars.visible = false; hero.root.visible = false; S.scene.background = skyBG('#0a0c14', '#0a0c14');
        const [a, b, cc] = S.crew; a.root.position.set(-0.6, 0, 1.2); a.root.rotation.y = Math.PI - 0.5; b.root.position.set(1.6, 0, 0.9); b.root.rotation.y = Math.PI + 0.2; cc.root.position.set(3.4, 0, 1.6); cc.root.rotation.y = Math.PI + 0.4;
        if (t >= 26.3 && t < 27.6) laPeace(a, t, 'nasa', ctx, { hy: -0.9 }); else { a.pose({ ...POSES.idle(t), hx: -0.3 }); a.face(FACES.shock); }
        b.pose({ ...POSES.shock(t), hx: -0.35 }); b.face(FACES.shock); cc.pose({ ...POSES.idle(t), aLf: 1.6, aLe: 2.3, hL: 'open', hx: -0.2 }); cc.face({ ...FACES.shock, open: 1 });
        const g = S.nasa.userData.ctx, n = Math.floor(t * 30), W = 1024, H = 512; g.fillStyle = '#061226'; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(80,200,255,0.12)'; for (let y = 0; y < H; y += 32) g.fillRect(0, y, W, 2);
        drawHeroFace(g, 230, 260, 1.6, { mouth: 0.7 }); const sh = TL.shown(t); g.textAlign = 'center'; g.font = '64px Anton'; g.fillStyle = '#9be7ff'; g.fillText('SUBJECT HEIGHT', 690, 150);
        g.font = '150px Anton'; const txt = (hash(n, 3) < 0.25 ? 'ERR' : '') + `${sh.value} ${sh.unit}`; g.fillStyle = hash(n, 5) < 0.5 ? '#ff4040' : '#ffd21f'; g.fillText(txt, 690 + (hash(n, 7) - 0.5) * 30, 320); for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,60,60,0.4)'; g.fillRect(0, hash(n, 11 + i) * H, W, 6 + hash(n, 17 + i) * 20); } S.nasa.userData.tex.needsUpdate = true;
        const base = wp(S.nasa); c = cam([base.x + 0.4, 1.75, base.z + 6.2 - 0.6 * u], [base.x + 0.6, 2.2, base.z - 2], 52); out.capY.nasa = 1520; out.keyFocus = false; out.far = 200; break; }
      case 'global': {   // 28.0-30.4: absurdly enormous, the Earth a small ball beneath him; narrator n3; he smiles
        earth.visible = true; const k = 6 / HH;
        giant(hero, k, [0, 1.6, -1.0], 0.3, { ...POSES.float(t), hx: 0.55, aLs: 0.7, aRs: 0.7 }, { ...FACES.happy, smile: lerp(0.2, 0.9, smooth(seg(t, 29.2, 29.8))), eye: 1.1 });
        c = cam([2.6 + 1.5 * u, 2.6, 7.4 - 0.5 * u], [0.2, 3.0, -0.6], 58); out.narrY = 1580; break; }
      case 'seeall': {   // 30.4-32.4: close on his delighted face, arms open, the little Earth below
        earth.visible = true; const k = 6 / HH;
        giant(hero, k, [0, 1.6, -1.0], 0.3, { ...POSES.hugOpen(t, 1), hx: 0.35 }, talk(ctx, 'seeall', t, { ...FACES.excited, open: 0.2 }));
        const hd = wp(hero.head); c = cam([hd.x + 1.4, hd.y - 1.0, hd.z + 5.6], [hd.x, hd.y + 0.15, hd.z], 52); out.capY.seeall = 1560; break; }
      case 'moon': {   // 32.4-35.4: grabs the Moon like a basketball; the Moon has a face: "La peace... please stop." 33.3; spins it on one finger
        earth.visible = moon.visible = true; moon.userData.face.visible = true; const k = 6 / HH;
        const spin = t > 34.2; const reach = smooth(seg(t, 32.4, 33.0));
        giant(hero, k, [0, 1.6, -1.0], 0.5, spin ? { ...POSES.idle(t), aRf: 0.2, aRs: 2.6, aRe: 0.2, hR: 'point', hx: -0.2, hy: -0.3 } : { ...POSES.idle(t), aRf: lerp(0.8, 1.3, reach), aRs: 0.4, aRe: 0.3, hR: 'cup', hx: 0.1, hy: -0.2 }, { ...FACES.happy, smile: 0.8, wide: 1.2, brow: 0.5 });
        const hp = wp(hero.handR); const mr = 0.42; moon.scale.setScalar(mr);
        if (!spin) { moon.position.set(hp.x + 0.15, hp.y + 0.05, hp.z + mr * 0.9); moon.rotation.set(0, -0.6 + Math.sin(t * 3) * 0.05, 0); }
        else { moon.position.set(hp.x, hp.y + mr + 0.1, hp.z); moon.rotation.set(0.15 * Math.sin(t * 7), (t - 34.2) * 9, 0.15 * Math.cos(t * 7)); }
        moon.userData.mouth.scale.set(1.4, 0.3 + 2.4 * ctx.mouth('moon', t), 0.4);
        const mp = moon.position; if (!spin) moon.rotation.y = Math.atan2(1.4, 2.8); else moon.userData.face.rotation.y = 0; c = cam([mp.x + 1.4, mp.y + 0.2, mp.z + 2.8], [lerp(mp.x, wp(hero.head).x, 0.4), lerp(mp.y, wp(hero.head).y, 0.45), lerp(mp.z, wp(hero.head).z, 0.4)], 50);
        out.capY.moon = 1600; break; }
      case 'marble': {   // 35.4-38.2: "Then he stopped following the rules." (ERROR at 35.6); his body expands past the frame; Earth between two fingers like a marble
        earth.visible = true; const grow = smooth(seg(t, 35.6, 36.6)), k = lerp(6, 30, grow) / HH;
        giant(hero, k, [0, lerp(1.6, 4, grow), lerp(-1.0, -8, grow)], 0.2, { ...POSES.idle(t), aRf: 1.4, aRs: 0.2, aRe: 0.9, hR: 'pinch', hx: 0.3 }, { ...FACES.smug, smile: 0.7 });
        const hp = wp(hero.handR), sc = lerp(1, 0.25, smooth(seg(t, 36.4, 37.2))); earth.scale.setScalar(sc);
        if (t > 36.6) earth.position.set(hp.x, hp.y - 0.02 * k, hp.z + 0.09 * k); else earth.position.set(0, 0, 0);
        const ep = earth.position; c = t < 36.6 ? cam([2.6, 1.2 + 3 * grow, 6 + 10 * grow], [0, 2 + 6 * grow, -2], 55) : cam([ep.x + 1.5, ep.y + 0.35, ep.z + 2.6], [lerp(ep.x, wp(hero.head).x, 0.3), lerp(ep.y, wp(hero.head).y, 0.35), lerp(ep.z, wp(hero.head).z, 0.3)], 52);
        out.narrY = 1600; out.shakeT = t; break; }
      case 'toss': {   // 38.2-40.6: bigger than the planet, tosses Earth hand to hand: "This is actually pretty cool." 38.6
        earth.visible = true; const k = 12 / HH;
        const ph = ((t - 38.2) / 0.9) % 1, side = Math.floor((t - 38.2) / 0.9) % 2;   // one toss every 0.9 s
        giant(hero, k, [0, 0, 0], 0.0, { ...POSES.idle(t), aLf: 1.2, aRf: 1.2, aLs: 0.5, aRs: 0.5, aLe: 0.9, aRe: 0.9, hL: 'cup', hR: 'cup', hx: 0.25 + 0.15 * Math.sin(ph * Math.PI) * (side ? 1 : -1), hy: (side ? 1 : -1) * (ph - 0.5) * 0.6 }, talk(ctx, 'cool', t, { ...FACES.happy, smile: 0.7 }));
        const a = wp(hero.handL), b = wp(hero.handR), [p0, p1] = side ? [b, a] : [a, b]; earth.scale.setScalar(0.35);
        earth.scale.setScalar(0.5); earth.position.set(lerp(p0.x, p1.x, ph), lerp(p0.y, p1.y, ph) + Math.sin(ph * Math.PI) * 1.3 + 0.5, lerp(p0.z, p1.z, ph) + 0.6);
        const hd = wp(hero.head); c = cam([hd.x + 2.8, hd.y - 2.4, hd.z + 12.5], [hd.x, hd.y - 2.0, hd.z], 55); out.capY.cool = 1580; break; }
      case 'ow': {   // 40.6-42.4: a tiny satellite flashes past and bonks his nose 41.1: "Ow." 41.3
        earth.visible = true; S.sat.visible = true; const k = 12 / HH;
        const hit = t > 41.1, rec = smooth(seg(t, 41.1, 41.35)) * (1 - smooth(seg(t, 41.8, 42.3)));
        giant(hero, k, [0, 0, 0], 0.0, { ...POSES.idle(t), hx: 0.1 - 0.35 * rec, hz: 0.1 * rec, lean: -0.1 * rec, aRf: 1.6 * rec, aRe: 2.3 * rec, hR: 'open' }, hit ? talk(ctx, 'ow', t, { ...FACES.shock, lid: 0.5, open: 0.3 }) : { ...FACES.question, eye: 1.2, pupil: [0.4, 0] });
        const hd = wp(hero.head), nose = new THREE.Vector3(hd.x, hd.y - 0.02 * k, hd.z + hero.R * k * 1.15);
        const st = S.sat; st.scale.setScalar(k * 0.6);
        if (!hit) { const a = seg(t, 40.6, 41.1); st.position.set(nose.x + lerp(5, 0, a), nose.y + lerp(1.2, 0, a), nose.z + lerp(1.5, 0.05, a)); st.rotation.set(t * 3, t * 2, 0); }
        else { const a = t - 41.1; st.position.set(nose.x - a * 1.5, nose.y + a * 2.2 - a * a, nose.z + a * 3); st.rotation.set(t * 9, t * 7, 0); }
        S.bonk.set(t - 41.1, nose.toArray(), 0.4, 0.4);
        c = cam([hd.x + 4.5, hd.y - 0.6, hd.z + 8.5], [hd.x + 0.6, hd.y - 0.3, hd.z + 1.0], 48); if (t > 41.1 && t < 41.4) { c.pos[0] += Math.sin(t * 90) * 0.06; c.pos[1] += Math.cos(t * 70) * 0.06; }
        out.capY.ow = 1560; break; }
      case 'walk': {   // 42.4-45.6: he walks through space; tracks the foot; Earth right beneath it; WAIT FOR IT
        earth.visible = true;
        if (t < 43.6) {   // wide: giant striding over the little planet
          const k = 10 / HH; giant(hero, k, [lerp(-3, -1.2, u * 2.6), 1.6, -1.5], 1.25, { ...POSES.walk(t * 0.55), lLf: 0.6 * Math.sin(t * 2.6) }, { ...FACES.happy, smile: 0.5 });
          c = cam([0.6, 0.6, 9.0], [-0.6, 4.0, -1.5], 55);
        } else {          // the giant sneaker over the Earth, descending in slow motion
          hero.root.visible = false; S.shoe.visible = true; const d = smooth(seg(t, 43.6, 45.6));
          S.shoe.scale.setScalar(2.2); S.shoe.position.set(lerp(-1.2, 0.0, d), lerp(2.9, 1.55, d), 0.0); S.shoe.rotation.set(0.25 - 0.2 * d, 0.6, 0.1);
          c = cam([2.8, lerp(0.6, 0.3, d), 5.6], [S.shoe.position.x * 0.5, S.shoe.position.y * 0.55, 0], 60);
          S.stage.key.position.set(2, 8, 3); S.stage.key.target.position.set(0, 0, 0);
        }
        out.keyFocus = false; break; }
      default: c = cam([0, 0, 8], [0, 0, 0]);
    }
    out.cam = c; out.keyFocus = out.keyFocus ?? false; return out;
  },
};
