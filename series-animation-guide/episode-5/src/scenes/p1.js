// P1 · HOME (story 0-10): the 1 m hop in the living room, through the ceiling (dad 3.2), through the roof (Gerald on the chimney, r1),
// the kid in the front garden (7.6), the city and the Burj Khalifa small below him (8-10).
import { THREE, makeHero, makePerson, makeGerald, P, F, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, hash, rng, mat, add, box, cyl, sph, laPeace, puffs, speedLines, shotCam } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { buildLivingRoom, houseExterior, HOLE } from '../../../assets/library/sets/livingroom.js';
import { roundTree, bushClump, treeLine } from '../../../assets/library/props/nature.js';
import { houseFront, fence } from '../../../assets/library/props/home.js';
import { skyline, landmark } from '../../../assets/library/props/world.js';

const HX = HOLE.x, HZ = HOLE.z;
// feet height of the hero after the launch at 2.0 (exponential, ~x5 every 2 s; the inside shots only see the first metres)
const yIn = (t) => (t < 2 ? 0 : 5 * Math.pow(5, (t - 2) / 2) - 5);
const hopY = (t) => (t > 0.25 && t < 1.15 ? 1.0 * Math.sin(Math.PI * (t - 0.25) / 0.9) : 0);

export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#7fc8ff', '#e9f6ff'], ground: null, hemiI: 1.0, keyI: 2.2, keyPos: [4, 9, 6], fillI: 0.7, shadow: { extent: 8 } });
    const scene = stage.scene;
    // ---- interior
    const room = buildLivingRoom({ h: 3.2 }); scene.add(room.group); room.anchors.table.position.set(1.45, 0, 0.55);   // v3: 3.2 m so the 1 m hop clears the ceiling (note #8)
    const hero = makeHero(scene);
    const dad = makePerson(scene, 'dad'), mum = makePerson(scene, 'mum'), kid = makePerson(scene, 'kid'), grandma = makePerson(scene, 'grandma');
    const cat = makeGerald(scene);
    const dust = puffs(scene, { n: 46, color: 0xf2ece0, seed: 5, size: 0.07, spread: 0.9, up: -0.3, grav: 3.2 });
    const tiles = puffs(scene, { n: 60, color: 0xb4503a, seed: 8, size: 0.17, spread: 3.0, up: 2.0, grav: 6 });   // v3: bigger burst (note #9)
    const roofDust = puffs(scene, { n: 40, color: 0xd8cfc0, seed: 18, size: 0.22, spread: 2.4, up: 0.9, grav: 1.2 });
    // tears streaming off his eyes in the top-down face shot (note #9)
    const tearM = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x6ab8ff, emissiveIntensity: 0.5, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.9 });
    const tears = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), tearM, 36); tearM.opacity = 0.7; tears.frustumCulled = false; scene.add(tears);
    // ---- exterior (front garden + street), sits on the same origin; the room is hidden outside
    const ext = new THREE.Group(); scene.add(ext);
    const house = houseExterior(); ext.add(house);
    const lawn = add(ext, new THREE.CircleGeometry(60, 64), mat(0x6fbf4a, { rough: 1 }), [0, 0.0, 0], [-Math.PI / 2, 0, 0]); lawn.receiveShadow = true;
    add(ext, box(60, 0.02, 4.0), mat(0x5a5f68, { rough: 0.9 }), [0, 0.012, 13]);   // road
    add(ext, box(60, 0.03, 1.2), mat(0xc8c2b8, { rough: 0.9 }), [0, 0.015, 10.4]);   // pavement
    add(ext, box(1.2, 0.025, 7), mat(0xd8cfc0, { rough: 0.9 }), [0, 0.014, 6.6]);   // garden path
    for (const [x, s] of [[-12, 3], [12, 4], [-21, 5], [21, 6]]) { const h = houseFront({ w: 6.5, floors: 2, seed: s, wall: [0xe8d0f0, 0xd0e8f0, 0xf0e0c0, 0xe0f0d0][s - 3] }); h.position.set(x, 0, 2.5); ext.add(h); }
    for (const x of [-6.5, 6.5]) { const f = fence(6.5); f.position.set(x, 0, 9.6); ext.add(f); }
    const tr = rng(3); for (const [x, z, s] of [[-5.5, 4.5, 1.2], [5.6, 5.5, 1.1], [-9, 8.5, 1.4], [9.5, 8, 1.3], [-16, 8.5, 1.5], [16, 8.8, 1.4]]) { const t = roundTree({ seed: Math.floor(tr() * 99), h: 3.4 * s }); t.position.set(x, 0, z); ext.add(t); }
    for (const [x, z] of [[-2.2, 3.7], [2.2, 3.7], [-3.4, 3.6], [3.4, 3.6]]) { const b = bushClump({ seed: Math.floor(x * 7 + 50) }); b.position.set(x, 0, z); ext.add(b); }
    const kidOut = makePerson(scene, 'kid'), nb1 = makePerson(scene, 'neighbourMan'), nb2 = makePerson(scene, 'neighbourWoman'); for (const c of [kidOut, nb1, nb2]) ext.add(c.root);
    // ---- the city far below (shot 5): skyline + the Burj Khalifa at real-ish scale (x30 model)
    // v3: the city sits at TRUE scale around the house (origin = the house), so from above he stays right over his own roof hole
    const city = new THREE.Group(); scene.add(city);
    const sky1 = skyline({ n: 40, spread: 900, hmin: 20, hmax: 160, seed: 7, palette: [0xd8c8a8, 0xc8b898, 0xb8c8d8, 0xe0d0b8, 0xa8b8c8] }); sky1.scale.set(1, 1.6, 1); sky1.position.set(-200, 0, -1900); city.add(sky1);
    const burj = landmark('burj'); burj.scale.setScalar(30); burj.position.set(380, 0, -1500); city.add(burj);
    add(city, new THREE.CircleGeometry(12000, 64), mat(0x8cbf62, { rough: 1 }), [0, -0.6, 0], [-Math.PI / 2, 0, 0]);   // fields
    add(city, new THREE.CircleGeometry(950, 64), mat(0x7cbf5a, { rough: 1 }), [0, -0.3, 0], [-Math.PI / 2, 0, 0]);   // the suburb's lawns
    {   // suburb: rows of houses (instanced bodies + roofs) on a street grid, a clear ring round our house
      const r = rng(41), body = new THREE.InstancedMesh(box(1, 1, 1), mat(0xf0e0c8, { rough: 0.9 }), 1600), roofI = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 1, 4), mat(0xb4503a, { rough: 0.8 }), 1600);
      const roofCols = [0xb4503a, 0x8a3a2a, 0x5a6a7a, 0xc86a3a], wallCols = [0xf0e0c8, 0xe8d0f0, 0xd0e8f0, 0xf0e0c0, 0xe0f0d0];
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0)), C = new THREE.Color(); let k = 0;
      for (let gx = -14; gx <= 14 && k < 1600; gx++) for (let gz = -14; gz <= 14 && k < 1600; gz++) for (const side of [-1, 1]) {
        const x = gx * 32 + r.range(-2, 2), z = gz * 32 + side * 8; if (Math.hypot(x, z) < 26 || Math.hypot(x, z) > 900 || r() < 0.12 || k >= 1600) continue;
        const w = r.range(6, 9), d = r.range(6, 8), h = r.range(2.8, 5.5);
        M.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)); body.setMatrixAt(k, M); body.setColorAt(k, C.set(wallCols[k % 5]));
        M.compose(new THREE.Vector3(x, h + 1.4, z), Q, new THREE.Vector3(w * 1.05, 2.8, d * 1.05)); roofI.setMatrixAt(k, M); roofI.setColorAt(k, C.set(roofCols[Math.floor(r() * 4)])); k++;
      }
      body.count = roofI.count = k; city.add(body, roofI);
      for (let i = -14; i <= 14; i++) { add(city, box(940, 0.1, 5), mat(0x5a5f68, { rough: 0.9 }), [0, -0.2, i * 32 + 13]); add(city, box(5, 0.1, 940), mat(0x5a5f68, { rough: 0.9 }), [i * 32 + 16, -0.2, 0]); }
      const tr = rng(43), trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat(0x3f9f46, { rough: 0.9 }), 900);
      for (let i = 0; i < 900; i++) { const a = tr() * Math.PI * 2, rr = tr.range(40, 900), s = tr.range(2.5, 4.5); M.compose(new THREE.Vector3(Math.cos(a) * rr, s, Math.sin(a) * rr), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); trees.setMatrixAt(i, M); }
      city.add(trees);
    }
    const lines = speedLines(scene, { n: 80, len: 2.5, R: 3 });
    // vapour trail from the roof hole up to his feet: ties him to the house in every angle (v3)
    const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1, 1, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, fog: false })); scene.add(trail);
    const S = { roofDust, tears, bg: scene.background, stage, scene, room, hero, dad, mum, kid, grandma, cat, dust, tiles, ext, house, kidOut, nb1, nb2, city, burj, sky1, lines, trail };
    return S;
  },
  frame(t, S, ctx) {
    const { hero, room, cat } = S; const mo = ctx.mouth; const out = { voiceY: {}, roastY: 1580 };
    const inside = t < 4.0, outside = t >= 4.0 && t < 8.0, high = t >= 8.0;
    room.group.visible = inside; S.ext.visible = outside || high; S.city.visible = outside || high; S.burj.visible = high; S.sky1.visible = high; S.lines.visible = false;
    for (const c of [S.dad, S.mum, S.kid, S.grandma]) c.root.visible = inside;
    room.setHole(t >= 2.3 ? 1 : 0); S.house.setHole(t >= 4.15 ? 1 : 0);
    S.scene.background = S.bg; S.scene.fog = null; S.house.updateMatrixWorld(true);
    // ---- family on the sofa (seated, facing +Z toward the hero), grandma in the armchair
    const seatY = room.anchors.seatY, sofaZ = -1.85;
    const look = smooth(seg(t, 0.4, 0.9)), up = smooth(seg(t, 2.3, 2.7));
    const sit = (ch, x, k = 0) => { ch.root.position.set(x, 0, sofaZ + 0.1); ch.root.rotation.y = 0; ch.pose({ ...POSES.sitOn(t + k, seatY - 0.05), hx: -0.55 * up }); };
    sit(S.mum, -0.75, 1); S.mum.face(up ? { ...FACES.shock, open: 0.6 } : { ...FACES.shock, open: 0.25 * look });
    sit(S.kid, -0.15, 2); S.kid.face(up ? { ...FACES.scream, open: 0.5 } : { ...FACES.excited, open: 0.3 * look });
    sit(S.dad, 0.7, 3); if (t >= 2.9 && t < 4.2) { laPeace(S.dad, t, 'dad', ctx, { ...POSES.sitOn(t, seatY - 0.05), ...POSES.laPeace(t), hx: -0.45, bob: POSES.sitOn(t, seatY - 0.05).bob }); } else S.dad.face(up ? FACES.shock : { ...FACES.shock, open: 0.2 * look });
    S.grandma.root.position.set(2.05, 0, -0.85); S.grandma.root.rotation.y = -0.7; S.grandma.pose({ ...POSES.sitOn(t, 0.5), hx: -0.4 * up }); S.grandma.face({ ...FACES.shock, open: 0.3 + 0.4 * up });
    // ---- Gerald: interior on the sofa arm, back turned; outside on the chimney
    if (inside) { cat.root.visible = true; cat.root.position.set(-1.2, 0.62, -1.85); cat.root.rotation.y = Math.PI; cat.pose(APOSES.loaf(t)); cat.face(AFACES.deadpan); }
    else if (outside && t < 6.0) { const ct = S.house.userData.chimneyTop; cat.root.visible = true; cat.root.position.set(ct.x, ct.y + 0.02, ct.z); cat.root.rotation.y = 0.4; cat.pose(t > 4.9 ? { ...APOSES.loaf(t), hy: 0.6 } : APOSES.loaf(t)); cat.face(AFACES.bored); }
    else cat.root.visible = false;
    // ---- the hero
    let hy = 0, pose = POSES.idle(t), face = F.grin;
    if (t < 2.0) {
      hy = hopY(t); const u = clamp((t - 0.25) / 0.9);
      pose = t < 0.25 ? P.crouch(smooth(t / 0.25) * 0.6) : t < 1.15 ? P.hop(u) : t < 1.4 ? P.crouch((1 - smooth((t - 1.15) / 0.25)) * 0.6) : P.crouch(smooth(seg(t, 1.6, 2.0)) * 0.9);
      face = t < 1.4 ? F.grin : F.wow;
    } else if (t < 4.0) { hy = yIn(t); pose = { ...P.launch(1), lLk: 0.1, lRk: 0.25 }; face = F.fly; }
    hero.root.visible = inside || outside || high;
    if (inside) { hero.root.position.set(HX, hy, HZ); hero.root.rotation.y = 0.15; }
    // ---- outside: he bursts through the roof at 4.15 (roof top ~4.4 m), Gerald on the chimney, tiles rain
    if (outside) {
      const hw = S.house.userData.holeWorld();
      if (t < 6.0) { const y = t < 4.15 ? hw.y - 1.8 : hw.y - 1.4 + 3.2 * Math.pow(t - 4.15, 1.45); hero.root.position.set(hw.x, y, hw.z); hero.root.rotation.y = 0.3; pose = P.rise(t); face = F.fly; }
      else { hero.root.position.set(hw.x, hw.y + 2.5 + 4.5 * Math.pow(t - 6, 1.3), hw.z); hero.root.rotation.y = 0.5; hero.root.scale.setScalar(1.5); pose = P.rise(t); face = F.fly; }   // v3: straight above his own roof hole
      S.tiles.set(t - 4.15, [hw.x, hw.y + 0.2, hw.z], 2.2); S.roofDust.set(t - 4.15, [hw.x, hw.y + 0.1, hw.z], 2.0);
      if (t >= 4.15 && t < 4.4) out.flash = 0.35 * (1 - (t - 4.15) / 0.25);
    } else { S.tiles.set(-1, [0, 0, 0]); S.roofDust.set(-1, [0, 0, 0]); }
    if (!outside) hero.root.scale.setScalar(1);
    // ---- plaster dust from the ceiling hole (2.18 = the frame his head meets the ceiling)
    S.dust.set(t - 2.3, [HX, 3.15, HZ], 1.7);
    // ---- the front garden: the kid points up, then la peace at 7.6; neighbours point
    const k = S.kidOut; k.root.position.set(3.75, 0, 11.0); k.root.rotation.y = 0.35;
    if (t >= 7.2) laPeace(k, t, 'kid', ctx, { hx: -0.5 }); else { k.pose({ ...POSES.point(t), aRf: 2.6, aRs: 0.3, hx: -0.55 }); k.face({ ...FACES.shock, open: 0.5 }); }
    for (const [n, x, z, ry] of [[S.nb1, -1.4, 9.4, 2.9], [S.nb2, -2.6, 8.8, 2.6]]) { n.root.position.set(x, 0, z); n.root.rotation.y = ry; n.pose({ ...POSES.point(t), aRf: 2.4, hx: -0.5 }); n.face({ ...FACES.shock, open: 0.7 }); }
    // ---- high: above the city, the Burj small below
    if (high) {
      const hw = S.house.userData.holeWorld(), H = 5 * Math.pow(5, (t - 2) / 2) - 5; hero.root.position.set(hw.x, H, hw.z); hero.root.rotation.y = 0.3; pose = P.rise(t); face = F.fly;
      S.scene.background = new THREE.Color().setHSL(0.57, 0.6, lerp(0.75, 0.62, seg(t, 8, 10))); S.scene.fog = new THREE.Fog(0xcfe4f2, 2500, 22000);
      S.lines.visible = true; S.lines.set(t, [hw.x, H, hw.z], 2.2, 'y', 0.25);
    }
    if (t >= 6.0 && t < 6.8) { pose = { ...pose, hx: -0.75 }; face = { ...F.fly, lid: 0.45, brow: 0.9, browTilt: 0.5, open: 0.35, smile: 0.1 }; }   // head back into the wind, eyes squeezed
    hero.pose(pose); hero.face(face);
    {   // tears: streams from both outer eye corners, swept down past him by the wind
      const on = t >= 5.95 && t < 6.85; S.tears.visible = on;
      if (on) { hero.root.updateMatrixWorld(true); const R = hero.R, M = new THREE.Matrix4(), q = new THREE.Quaternion(), hw = new THREE.Vector3(); hero.head.getWorldPosition(hw);
        for (let i = 0; i < 36; i++) { const side = i % 2 ? 1 : -1, ph = (i * 0.618) % 1, u = (t * 2.2 + ph) % 1;
          const c0 = hero.head.localToWorld(new THREE.Vector3(side * R * 0.55, R * 0.02, R * 0.72)); const out = c0.clone().sub(hw).setY(0).normalize();
          const jx = Math.sin(i * 12.9898) * 0.12, jz = Math.cos(i * 78.233) * 0.12; const p = c0.addScaledVector(out, u * 0.7 * hero.root.scale.y).add(new THREE.Vector3(jx * u, -u * 1.6 * hero.root.scale.y, jz * u)); const sz = 0.018 * (1 - u * 0.7) * hero.root.scale.y * (i % 3 ? 1 : 1.5);
          M.compose(p, q, new THREE.Vector3(sz, sz * 1.6, sz)); S.tears.setMatrixAt(i, M); }
        S.tears.instanceMatrix.needsUpdate = true; } }
    {   const hw = S.house.userData.holeWorld(), hp = hero.root.position, L = hp.y - hw.y - 0.2; S.trail.visible = (outside || high) && t >= 4.3 && L > 0.5;
      if (S.trail.visible) { const k = high ? 0.9 : 1; S.trail.position.set(hw.x, hw.y + L / 2, hw.z); S.trail.scale.set(0.55 * k, L, 0.55 * k); S.trail.material.opacity = high ? 0.35 : 0.4 * smooth(seg(t, 4.3, 5.0)); } }
    // ---- cameras (one idea per shot)
    let c;
    if (t < 2.0) c = mixCam(cam([0.5, 1.75, 7.8], [0.0, 1.75, -0.4], 42), cam([0.45, 1.7, 7.2], [0.0, 1.75, -0.4], 42), smooth(t / 2));
    else if (t < 4.0) { const u = seg(t, 2, 4); c = mixCam(cam([1.7, 0.45, 2.9], [0.15, 1.75, -0.5], 60), cam([1.55, 0.45, 2.7], [0.25, 1.65, -0.9], 58), smooth(u)); out.voiceY.dad = 1560; }
    else if (t < 6.0) { const u = seg(t, 4, 6), hw = S.house.userData.holeWorld(); c = mixCam(cam([-4.6, 4.2, 8.6], [-1.1, hw.y + 1.6, 0.6], 42), cam([-4.3, 4.6, 8.0], [-1.0, hw.y + 3.0, 0.6], 42), smooth(u)); }
    else if (t < 6.8) {   // v3 spike (note #9): top-down on his face as he rockets at the lens, the town and the roof hole far below, tears streaming off
      const hp = hero.root.position, sc = hero.root.scale.y, sh = Math.sin(t * 61) * 0.02 + Math.sin(t * 37) * 0.015;
      c = cam([hp.x + 0.35 * sc + sh, hp.y + 3.3 * sc, hp.z + 0.9 * sc], [hp.x, hp.y + 1.45 * sc, hp.z + 0.1], 48, sh);
    }
    else if (t < 8.0) { const u = seg(t, 6.8, 8), hw = S.house.userData.holeWorld(), hp = hero.root.position; c = cam([4.9, 1.0, 14.4], [lerp(1.2, 0.6, u), lerp(hw.y + 3.5, (hw.y + hp.y) * 0.55 + 1.5, smooth(u)), -1.0], 62); out.voiceY.kid = 1560; }
    else {   // v3 drone: above him looking straight down his line to the house he came from, orbiting as he rushes at the lens
      const h = hero.root.position, hw = S.house.userData.holeWorld(), u = seg(t, 8, 10), az = lerp(10, 70, smooth(u)) * Math.PI / 180;
      c = cam([h.x + Math.sin(az) * 2.6, h.y + 6.2, h.z + Math.cos(az) * 2.6], [h.x, h.y + 0.5, h.z], 50); out.far = 16000; out.near = 0.2; }
    out.cam = c; out.keyFocus = high ? [hero.root.position.x, hero.root.position.y + 0.8, hero.root.position.z] : inside ? [0, 1.0, 0] : outside && t < 6 ? [-1, 4, 0] : [1, 1, 7];
    if (t < 0.12) out.flash = 0;
    return out;
  },
};
