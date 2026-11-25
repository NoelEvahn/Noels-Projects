// HOOK (0-3 s): the bedroom is wrecked and shaking, Mom in the doorway, arms crossed, furious: "GET DOWN HERE RIGHT NOW!" (0.05).
// Tilt up his giant legs through the ceiling hole to his face looking down: "What?" (1.45). Cut (2.0) to his view down through the roof:
// tiny Mom, a ceiling tile bonks her head (2.25), she doesn't blink. He doubles to 28.8 m at 2.0 (the view rises).
// Exported builders (bedroom, roof) are reused by the landing scene.
import { THREE, makeHero, person, makeGerald, POSES, FACES, APOSES, AFACES, clamp, smooth, lerp, cam, mixCam, seg, hash, mat, add, box, cyl, sph, rbox, rng, makeStage, cracks, puffs, shake, talk, heroHeight, skyBG } from '../common.js';
import { houseFront, fence, windowFrame } from '../../../assets/library/props/home.js';
import { roundTree, bushClump, groundCover } from '../../../assets/library/props/nature.js';
import { curtains, framedPicture, bookshelf, pottedPlant } from '../../../assets/library/sets/livingroom.js';

export const CROSSED = { aLf: 0.95, aRf: 0.88, aLe: 1.85, aRe: 1.85, aLs: -0.5, aRs: -0.58, hL: 'loose', hR: 'loose' };
export const MAD = { brow: -0.75, browTilt: -0.95, lid: 0.22, smile: -0.5, teeth: true, pupilSize: 0.8 };
export const ROOM = { w: 5.2, d: 5.2, h: 2.6, door: [-1.3, -2.6], hole: [-1.9, 2.8, -2.25, 2.1] };   // hole: x0,x1,z0,z1
export function bed(color = 0x2f6fd6) {
  const g = new THREE.Group(), wood = mat(0x9a6a42, { rough: 0.6 });
  add(g, rbox(1.1, 0.3, 2.1, 0.04), wood, [0, 0.25, 0]); add(g, rbox(1.12, 0.8, 0.08, 0.03), wood, [0, 0.5, -1.04]);
  add(g, rbox(1.02, 0.2, 2.0, 0.08), mat(0xf4f0e8), [0, 0.48, 0.02]); add(g, rbox(1.06, 0.12, 1.4, 0.06), mat(color, { rough: 0.9 }), [0, 0.6, 0.32]);
  add(g, rbox(0.6, 0.12, 0.34, 0.06), mat(0xffffff, { rough: 0.9 }), [0, 0.63, -0.75]);
  for (const x of [-0.5, 0.5]) for (const z of [-0.98, 0.98]) add(g, box(0.07, 0.12, 0.07), wood, [x, 0.06, z]);
  return g;
}
export function wardrobe() { const g = new THREE.Group(), w = mat(0xc8a070, { rough: 0.6 }); add(g, rbox(1.2, 2.0, 0.6, 0.03), w, [0, 1.0, 0]); add(g, box(0.01, 1.9, 0.02), mat(0x6a4a2a), [0, 1.0, 0.305]); for (const s of [-1, 1]) add(g, cyl(0.015, 0.015, 0.18, 6), mat(0xd8b040, { metal: 0.8 }), [s * 0.06, 1.05, 0.32]); add(g, rbox(1.26, 0.06, 0.66, 0.02), mat(0xa88050), [0, 2.02, 0]); return g; }
export function buildBedroom(scene, { wrecked = 1 } = {}) {
  const g = new THREE.Group(); scene.add(g); const { w, d, h } = ROOM, [hx0, hx1, hz0, hz1] = ROOM.hole;
  const wall = mat(0xbfe0d8, { rough: 0.9 }), trim = mat(0xffffff, { rough: 0.6 }), floorM = mat(0xb88a5a, { rough: 0.7 });
  add(g, box(w, 0.05, d), floorM, [0, -0.025, 0]).receiveShadow = true;
  for (let i = 0; i < 12; i++) add(g, box(0.012, 0.052, d), mat(0x9a7048), [-w / 2 + (i + 0.5) * w / 12, -0.02, 0]);
  add(g, rbox(2.4, 0.02, 1.8, 0.05), mat(0xe8604a, { rough: 1 }), [-0.9, 0.01, 0.9]);
  // walls: back (z=-d/2) with doorway, left, right (window), front open for cameras
  const dx = ROOM.door[0], dw = 1.0, dh = 2.1;
  add(g, box((dx - dw / 2) + w / 2, h, 0.12), wall, [(-w / 2 + dx - dw / 2) / 2, h / 2, -d / 2]);
  add(g, box(w / 2 - (dx + dw / 2), h, 0.12), wall, [(w / 2 + dx + dw / 2) / 2, h / 2, -d / 2]);
  add(g, box(dw, h - dh, 0.12), wall, [dx, (h + dh) / 2, -d / 2]);
  for (const s of [-1, 1]) add(g, box(0.08, dh, 0.16), trim, [dx + s * (dw / 2 + 0.04), dh / 2, -d / 2]); add(g, box(dw + 0.16, 0.08, 0.16), trim, [dx, dh + 0.04, -d / 2]);
  add(g, box(dw, dh, 0.1), mat(0x8a6a4a), [dx - 0.45, dh / 2, -d / 2 - 0.45], [0, 1.1, 0]);   // open door
  add(g, box(0.12, h, d), wall, [-w / 2, h / 2, 0]); add(g, box(0.12, h, d), wall, [w / 2, h / 2, 0]);
  const win = windowFrame(1.2, 1.2); win.position.set(w / 2 - 0.07, 1.5, 0.6); win.rotation.y = -Math.PI / 2; g.add(win);
  const cu = curtains(1.5, 1.6, 0x3a6ad0); cu.position.set(w / 2 - 0.1, 0.65, 0.6); cu.rotation.y = -Math.PI / 2; g.add(cu);
  for (const [x, y, z, ry, c, a] of [[-w / 2 + 0.07, 1.6, -0.6, Math.PI / 2, 0xff3a3a, 0xffd23f], [-w / 2 + 0.07, 1.5, 1.2, Math.PI / 2, 0x2f6fd6, 0xffffff], [1.2, 1.7, -d / 2 + 0.07, 0, 0x22aa66, 0xffd23f]]) { const p = framedPicture(0.6, 0.8, c, a); p.position.set(x, y, z); p.rotation.y = ry; g.add(p); }
  // ceiling with the hole (4 slabs around it), broken edge chunks, cracks
  const ceil = mat(0xf2efe8, { rough: 0.95 }), T = 0.14;
  add(g, box(hx0 + w / 2, T, d), ceil, [(-w / 2 + hx0) / 2, h + T / 2, 0]); add(g, box(w / 2 - hx1, T, d), ceil, [(w / 2 + hx1) / 2, h + T / 2, 0]);
  add(g, box(hx1 - hx0, T, hz0 + d / 2), ceil, [(hx0 + hx1) / 2, h + T / 2, (-d / 2 + hz0) / 2]); add(g, box(hx1 - hx0, T, d / 2 - hz1), ceil, [(hx0 + hx1) / 2, h + T / 2, (d / 2 + hz1) / 2]);
  const r = rng(5); for (let i = 0; i < 30; i++) { const side = i % 4, u = r(); const x = side < 2 ? lerp(hx0, hx1, u) : side === 2 ? hx0 : hx1, z = side >= 2 ? lerp(hz0, hz1, u) : side === 0 ? hz0 : hz1; add(g, box(r.range(0.15, 0.45), T * 1.2, r.range(0.15, 0.45)), ceil, [x, h + T / 2 - r.range(0, 0.1), z], [r.range(-0.4, 0.4), r() * 3, r.range(-0.4, 0.4)]); }
  const ck2 = cracks(4, 6, 2.0); ck2.position.set(1.0, 1.3, -d / 2 + 0.065); ck2.scale.setScalar(0.45); g.add(ck2);
  const ck3 = cracks(6, 5, 2.0); ck3.position.set(-w / 2 + 0.065, 1.2, 0.4); ck3.rotation.y = Math.PI / 2; ck3.scale.setScalar(0.45); g.add(ck3);
  // furniture: bed (left), fallen wardrobe, desk + chair, bookshelf, plant, toys
  const b = bed(); b.position.set(-1.85, 0, 1.0); g.add(b);
  const wd = wardrobe(); wd.position.set(1.6, 0.3, -1.7); wd.rotation.set(-Math.PI / 2 + 0.05 * wrecked, 0.4, 0); g.add(wd); g.wardrobe = wd;
  const bs = bookshelf(0.9, 1.6, 4); bs.position.set(-2.1, 0, -1.9); bs.rotation.y = Math.PI / 2; g.add(bs);
  const pl = pottedPlant(0.9, 3); pl.position.set(2.2, 0, 2.0); g.add(pl);
  add(g, rbox(1.0, 0.05, 0.55, 0.02), mat(0xffffff), [2.25, 0.75, 1.75], [0, Math.PI / 2, 0]); for (const [x, z] of [[2.0, 1.5], [2.0, 2.0], [2.5, 1.5], [2.5, 2.0]]) add(g, box(0.04, 0.75, 0.04), mat(0xffffff), [x, 0.375, z]);
  for (let i = 0; i < 9; i++) add(g, box(r.range(0.1, 0.3), r.range(0.03, 0.08), r.range(0.1, 0.3)), ceil, [r.range(-1.5, 1.8), 0.03, r.range(-1.8, 1.8)], [0, r() * 3, 0]);   // plaster chunks on the floor
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
// pitched tiled roof with a hole above the room hole (tiles skipped), walls outside, the street around. y up from the room floor.
export function buildExterior(scene, seed = 2) {
  const g = new THREE.Group(); scene.add(g); const { w, d, h } = ROOM, [hx0, hx1, hz0, hz1] = ROOM.hole, r = rng(seed);
  const ext = mat(0xf0d8b0, { rough: 0.9 }); add(g, box(w + 0.3, h + 0.2, 0.15), ext, [0, (h + 0.2) / 2, d / 2 + 0.08]); add(g, box(w + 0.3, h + 0.2, 0.15), ext, [0, (h + 0.2) / 2, -d / 2 - 0.08]); add(g, box(0.15, h + 0.2, d), ext, [-w / 2 - 0.08, (h + 0.2) / 2, 0]); add(g, box(0.15, h + 0.2, d), ext, [w / 2 + 0.08, (h + 0.2) / 2, 0]);
  const tile = mat(0xb4503a, { rough: 0.8 }), tile2 = mat(0x9a4030, { rough: 0.8 }), ridge = 1.7;
  for (const sz of [-1, 1]) for (let i = 0; i < 9; i++) for (let j = 0; j < 14; j++) {
    const u = (i + 0.5) / 9, z = sz * (d / 2 + 0.3) * (1 - u), y = h + 0.15 + ridge * u, x = -w / 2 - 0.3 + (j + 0.5) * (w + 0.6) / 14;
    if (x > hx0 - 0.1 && x < hx1 + 0.1 && z > hz0 - 0.1 && z < hz1 + 0.1) continue;
    add(g, rbox((w + 0.6) / 14 * 0.96, 0.07, (d / 2 + 0.3) / 9 * 1.25, 0.02), (i + j) % 3 ? tile : tile2, [x, y, z], [sz * Math.atan2(ridge, d / 2 + 0.3), 0, 0]);
  }
  const lawn = add(g, new THREE.CircleGeometry(80, 48), mat(0x6fbf4a, { rough: 1 }), [0, -0.03, 0], [-Math.PI / 2, 0, 0]); lawn.receiveShadow = true;
  add(g, box(80, 0.02, 5), mat(0x5a5f68, { rough: 0.9 }), [0, -0.01, 9]);
  for (const [x, z, s] of [[-11, -1, 3], [11, -1, 4], [-11, 16, 5], [11, 16, 6], [0, 17, 7]]) { const hf = houseFront({ w: 7, floors: 2, seed: s, wall: [0xe8d0f0, 0xd0e8f0, 0xf0e0c0, 0xe0f0d0, 0xf0d0c8][s - 3] }); hf.position.set(x, 0, z); if (z > 10) hf.rotation.y = Math.PI; g.add(hf); }
  for (const [x, z, s] of [[-5, 4, 1.1], [5.5, 4.5, 1.3], [-6, -5, 1.2], [6, -5.5, 1.4], [-16, 6, 1.5], [16, 6, 1.3]]) { const t = roundTree({ seed: Math.floor(r() * 99), h: 3.4 * s }); t.position.set(x, 0, z); g.add(t); }
  for (const x of [-4.5, 4.5]) { const f = fence(5.5); f.position.set(x, 0, 6.2); g.add(f); }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#7fc0ff', '#e8f4ff'], ground: null, hemiI: 1.0, keyI: 2.4, keyPos: [3, 9, 5], fillI: 0.7, shadow: { extent: 9 } });
    const scene = stage.scene, HH = heroHeight();
    const house = new THREE.Group(); scene.add(house);   // the whole house leans a little and shakes
    const room = buildBedroom(house), ext = buildExterior(house);
    const hero = makeHero(house), mom = person(house, 'mum'), cat = makeGerald(house);
    const tileM = add(house, rbox(0.34, 0.05, 0.34, 0.01), mat(0xf2efe8, { rough: 0.9 }), [0, 0, 0]); tileM.castShadow = true;
    const plaster = puffs(house, { n: 36, color: 0xf2ece0, seed: 9, size: 0.05, spread: 0.8, up: -0.2, grav: 4 });
    const bits = puffs(house, { n: 18, color: 0xf2ece0, seed: 12, size: 0.07, spread: 0.5, up: 0.4, grav: 6 });
    return { stage, scene, house, room, ext, hero, mom, cat, tileM, plaster, bits, HH };
  },
  frame(t, S, ctx) {
    const { hero, mom, cat, house, HH } = S, out = { capY: {} };
    const H = 14.4 * (t < 2.0 ? 1 : Math.pow(2, smooth(seg(t, 2.0, 2.3))));     // 14.4 -> 28.8 m
    const k = H / HH;
    const [sx, sy] = shake(t, 0.012, 24); house.rotation.set(sy * 0.4, 0, 0.035 + sx * 0.4); house.position.set(sx * 2, 0, 0);
    // the boy: feet on the bedroom floor (right half), facing the door, head bent down to look at Mom
    hero.root.position.set(1.55, 0, 0.6); hero.root.rotation.y = Math.PI + 0.45; hero.root.scale.setScalar(k);
    const lookDown = 0.55 + 0.1 * smooth(seg(t, 1.3, 1.6));
    hero.pose({ ...POSES.idle(t), hx: lookDown, lean: 0.12, aLs: 0.2, aRs: 0.2, aLe: 0.3, aRe: 0.3 });
    hero.face(t < 1.4 ? { ...FACES.neutral, brow: 0.2 } : talk(ctx, 'what', t, { ...FACES.question ?? FACES.neutral, brow: 0.7, browTilt: 0.3 }));
    // Mom in the doorway: arms crossed, looking up, furious
    mom.root.position.set(ROOM.door[0], 0, -ROOM.d / 2 + 0.55); mom.root.rotation.y = 0.12;
    mom.pose({ ...CROSSED, hx: -0.42 + (t < 1.3 ? Math.sin(t * 9) * 0.03 : 0), lean: -0.04, bob: t < 1.3 ? Math.abs(Math.sin(t * 7)) * 0.01 : 0 });
    mom.face(talk(ctx, 'mom1', t, MAD));
    // Gerald on the fallen wardrobe, loafing, back half-turned (background pop-up)
    cat.root.position.set(1.95, 0.92, -1.55); cat.root.rotation.y = -0.6; cat.pose(APOSES.loaf(t)); cat.face(t > 1.0 && t < 1.15 ? AFACES.sleepy : AFACES.deadpan);
    // the falling ceiling tile (2.0 from the hole edge -> Mom's head 2.25 -> bounces off)
    { const t0 = 1.98, a = t - t0, top = 2.6, head = 1.9; const mp = mom.root.position; let y, x = mp.x + 0.05, z = mp.z + 0.05, rx = 0;
      if (a < 0) { y = top - 0.02; x = mp.x + 0.3; z = mp.z + 0.6; } else if (a < 0.27) { const u = a / 0.27; y = lerp(top, head, u * u); x = lerp(mp.x + 0.3, mp.x + 0.05, u); z = lerp(mp.z + 0.6, mp.z + 0.05, u); rx = u * 1.5; }
      else { const b = a - 0.27; y = Math.max(0.03, head + 1.4 * b - 6 * b * b); x = mp.x + 0.05 + b * 0.9; z = mp.z + 0.05 + b * 0.5; rx = 1.5 + b * 9; }
      S.tileM.visible = a >= 0; S.tileM.position.set(x, y, z); S.tileM.rotation.set(rx, 0.3, 0.2); S.bits.set(a - 0.27, [mp.x, head + 0.05, mp.z], 0.9); }
    S.plaster.set(t % 1.5, [0.9, 2.55, 0.6], 1.5);
    const momHead = [ROOM.door[0], 1.62, -ROOM.d / 2 + 0.6];
    let c;
    if (t < 2.0) {
      // A: Mom (giant sneaker toe in the right foreground) -> tilt up his legs to his face through the hole
      const u = smooth(seg(t, 1.15, 1.75));
      const camA = cam([-0.55, 1.15, 2.2], [momHead[0] + 0.25, momHead[1] - 0.05, momHead[2]], 44);
      const head = new THREE.Vector3(); hero.head.getWorldPosition(head);
      const camB = cam([-0.95, 1.35, -1.55], [head.x, head.y - 0.2, head.z], 52);
      c = mixCam(camA, camB, u); out.capY.mom1 = 640; out.capY.what = 1500; out.keyFocus = [0, 1.5, 0];
    } else {
      // B: his view, straight down through the roof hole: tiny Mom, the tile, she doesn't blink. He doubles at 2.0: the view rises.
      const eyeH = H * 0.9, u = seg(t, 2.0, 3.0);
      c = cam([ROOM.door[0] + 0.9, eyeH, -ROOM.d / 2 + 2.6 + 0.3 * u], [ROOM.door[0], 1.0, -ROOM.d / 2 + 0.6], lerp(24, 21, u)); hero.root.visible = false;
      out.keyFocus = [0, 2, 0]; out.narrY = 1560;
    }
    hero.root.visible = t < 2.0;
    out.cam = c; out.near = 0.05; out.far = 400;
    return out;
  },
};
