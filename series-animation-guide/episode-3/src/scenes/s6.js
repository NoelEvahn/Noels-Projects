// S6 — AROUND THE WORLD (57.6–75.2): Earth's night lights turn pink; billboard tour of six cities; EVERYONE ON EARTH at 66.0; plaza montage; ghosts of everyone who ever lived.
import { THREE, makeCharacter, PRESETS, POSES, FACES, randomPerson, rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, orbit, cam, shot, pick, pops, place, V, D2R } from '../common.js';
import { makeStage, gradientTexture } from '/lib/stage.js';
import { buildSpace, SPACE_STAGE } from '/lib/sets/space.js';
import { buildPlaza, plazaStage, PLAZA_CITIES } from '/lib/sets/plaza.js';
import { ghostify } from '/lib/character.js';
import { makeAnimal, APOSES, ANIMALS } from '/lib/animal.js';
import { makeHeartField, makeLoveAura } from '/lib/fx/hearts.js';
import { mat, add, cyl, tor } from '/lib/util.js';
import { counterText, tickAge } from '../timeline.js';
import { bubbles } from '/lib/props/lab.js';

const SPACE_BG = gradientTexture('#02030a', '#0a1230');
const OFF = (i) => [400 * (i + 1), 0, 0];

export default {
  async build(ctx) {
    const stage = makeStage({ ...SPACE_STAGE, shadow: { extent: 22 } }), scene = stage.scene;
    const S = { stage, scene };
    // space
    const sp = buildSpace({ R: 3 }); scene.add(sp.group); S.space = sp;
    S.hearts = makeHeartField(90, { colors: [0xff3f7f, 0xff8fb8, 0xffd23f, 0xffffff], emissive: 0.7 }); scene.add(S.hearts);
    S.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: 0xff7ab8, transparent: true, opacity: 0.9, toneMapped: false })); S.ring.rotation.x = Math.PI / 2.4; scene.add(S.ring);
    // ghosts hover around Earth
    S.ghosts = ['ghostCaveman', 'ghostPharaoh', 'ghostKnight', 'ghostViking', 'ghostVictorian'].map((n, i) => { const g = ghostify(makeCharacter(PRESETS[n])); scene.add(g.root); g.root.scale.multiplyScalar(1.1); return g; });
    S.ghostExtra = Array.from({ length: 10 }, (_, i) => { const g = ghostify(makeCharacter(PRESETS[['ghostCaveman', 'ghostPharaoh', 'ghostKnight', 'ghostViking', 'ghostVictorian'][i % 5]])); scene.add(g.root); g.root.scale.multiplyScalar(0.9); return g; });
    // plazas (each in its own group, background swapped per shot)
    S.plazas = {}; PLAZA_CITIES.forEach((city, i) => { const p = buildPlaza(city, { seed: i + 1 }); const g = new THREE.Group(); g.position.set(...OFF(i)); g.add(p.group); scene.add(g); S.plazas[city] = { p, g, st: plazaStage(city) }; g.visible = false; });
    S.bgs = {}; for (const c of PLAZA_CITIES) { const st = S.plazas[c].st; S.bgs[c] = gradientTexture(st.sky[0], st.sky[1]); }
    // window washer on the Tokyo billboard; Gerald on top of the Rio billboard
    S.washer = makeCharacter(PRESETS.windowWasher); S.plazas.tokyo.g.add(S.washer.root); S.washerRope = add(S.plazas.tokyo.g, cyl(0.02, 0.02, 10, 4), mat(0x333333), [0, 12, -9.8]);
    S.catTop = makeAnimal('cat', ANIMALS.gerald); S.plazas.rio.g.add(S.catTop.root); S.catTop.root.position.set(1.2, 9.78, -10); S.catTop.root.rotation.y = Math.PI; // back to the camera
    // shots (44 units from 57.6)
    const pcam = (city, pos, tgt, fov = 52) => { const o = OFF(PLAZA_CITIES.indexOf(city)); return cam([pos[0] + o[0], pos[1], pos[2]], [tgt[0] + o[0], tgt[1], tgt[2]], fov); };
    const E = (az, el, d, fov = 38, ty = 0) => !d ? null : ({ pos: [Math.sin(az * D2R) * d, el, Math.cos(az * D2R) * d], target: [0, ty, 0], fov, roll: 0 });
    S.shots = [
      { ...shot(57.6, 58.4, E(-30, 1.5, 19, 40), E(-12, 1.0, 16.5, 40)), g: 'space' },                                    // Earth, lights start to turn pink
      { ...shot(58.4, 59.2, E(20, 2.0, 15, 40), E(35, 1.5, 13, 40)), g: 'space' },
      { ...shot(59.2, 60.4, pcam('tokyo', [0, 2.0, 7], [0, 8.2, -10], 62), pcam('tokyo', [0, 2.0, 6], [0, 8.0, -10], 62)), g: 'tokyo' },   // Tokyo: window washer on the billboard (voice 59.6)
      { ...shot(60.4, 61.2, pcam('nyc', [-2, 2.0, 7.5], [0, 7.4, -10], 62), pcam('nyc', [2, 2.2, 7.5], [0, 7.4, -10], 62)), g: 'nyc' },
      { ...shot(61.2, 62.0, pcam('london', [3, 2.2, 7.5], [0, 7.4, -10], 62), pcam('london', [-1, 2.2, 7.5], [0, 7.4, -10], 62)), g: 'london' },
      { ...shot(62.0, 62.4, E(-60, 3.0, 15, 38), E(-55, 2.5, 14, 38)), g: 'space' },
      { ...shot(62.4, 63.2, pcam('rio', [0, 1.5, 7.5], [0, 8.0, -10], 60), pcam('rio', [0, 1.8, 6.5], [0, 8.8, -10], 60)), g: 'rio' },    // Rio: Gerald sits on the billboard, back turned (roast)
      { ...shot(63.2, 64.0, pcam('rio', [1.5, 4.0, 2.5], [1.2, 10.9, -10], 30), pcam('rio', [1.5, 4.6, 1.0], [1.2, 10.9, -10], 28)), g: 'rio' },
      { ...shot(64.0, 64.8, pcam('dubai', [0, 2.0, 7], [0, 7.6, -10], 62), pcam('dubai', [2, 2.4, 7], [0, 7.6, -10], 62)), g: 'dubai' },
      { ...shot(64.8, 65.6, pcam('sydney', [-2, 2.0, 7.5], [0, 7.4, -10], 62), pcam('sydney', [2, 2.4, 7.5], [0, 7.4, -10], 62)), g: 'sydney' },
      { ...shot(65.6, 66.0, E(10, 1.2, 16, 40), E(15, 1.2, 15, 40)), g: 'space' },                                      // the last lights are about to turn
      { ...shot(66.0, 66.8, E(0, 0.8, 17, 44), E(0, 0.6, 15.5, 44)), g: 'space' },                                       // EVERYONE ON EARTH: ring
      { ...shot(66.8, 67.6, E(55, 2.5, 14, 40), E(70, 2, 12.5, 40)), g: 'space' },
      { ...shot(67.6, 68.4, E(-40, 4.0, 18, 40), E(-25, 3.0, 16, 40)), g: 'space' },
      { ...shot(68.4, 68.8, pcam('tokyo', [3, 2.4, 7.5], [0, 6.5, -10], 62)), g: 'tokyo' },                              // montage: staggered silent reactions
      { ...shot(68.8, 69.2, pcam('nyc', [-3, 2.4, 7.5], [0, 6.5, -10], 62)), g: 'nyc' },
      { ...shot(69.2, 69.6, pcam('london', [0, 2.2, 5.5], [0, 6.5, -10], 62)), g: 'london' },
      { ...shot(69.6, 70.0, pcam('dubai', [-3, 2.4, 7.5], [0, 6.5, -10], 62)), g: 'dubai' },
      { ...shot(70.0, 70.2, pcam('rio', [3, 2.4, 7.5], [0, 6.5, -10], 62)), g: 'rio' },                                  // unison BOMBO!! (4 x 0.2 s cuts)
      { ...shot(70.2, 70.4, pcam('sydney', [-3, 2.4, 6.5], [0, 6.5, -10], 62)), g: 'sydney' },
      { ...shot(70.4, 70.6, pcam('tokyo', [0, 2.6, 6.0], [0, 6.0, -10], 62)), g: 'tokyo' },
      { ...shot(70.6, 70.8, pcam('nyc', [0, 2.6, 5.5], [0, 6.0, -10], 62)), g: 'nyc' },
      { ...shot(70.8, 71.6, E(-20, 2.5, 19, 42), E(-10, 2.0, 17, 42)), g: 'space' },
      { ...shot(71.6, 72.4, E(25, 1.5, 19, 46, 0.5), E(10, 1.5, 17, 46, 0.5)), g: 'space' },                           // ghosts arrive (narration)
      { ...shot(72.4, 73.2, orbit([-5.5, 1.5, 3.0], 15, 4.2, 0.2, 40), orbit([-5.5, 1.5, 3.0], 5, 3.6, 0.2, 40)), g: 'space' },
      { ...shot(73.2, 74.0, orbit([5.5, 1.5, 3.5], -20, 4.2, 0.2, 40), orbit([5.5, 1.5, 3.5], -8, 3.6, 0.2, 40)), g: 'space' },
      { ...shot(74.0, 74.4, E(0, 3.0, 20, 50, 0.5), E(0, 3.0, 18, 50, 0.5)), g: 'space' },
      { ...shot(74.4, 75.2, orbit([0, 1.4, 7.2], 0, 4.2, 0.2, 36), orbit([0, 1.4, 7.2], 0, 3.2, 0.2, 34), { ease: 'in' }), g: 'space' },   // caveman ghost "bombo..."
    ];
    return S;
  },
  frame(t, S, ctx) {
    const P = pick(S.shots, t), c = P.cam, key = P.shot.g; const mo = ctx.mouth;
    S.space.group.visible = key === 'space'; S.ghosts.forEach((g) => (g.root.visible = key === 'space')); S.ghostExtra.forEach((g) => (g.root.visible = key === 'space')); S.hearts.visible = key === 'space'; S.ring.visible = key === 'space';
    for (const city of PLAZA_CITIES) S.plazas[city].g.visible = key === city;
    if (key === 'space') { S.scene.background = SPACE_BG; S.scene.fog = null; } else { S.scene.background = S.bgs[key]; S.scene.fog = new THREE.Fog(new THREE.Color(S.plazas[key].st.sky[1]), 50, 180); }
    const pink = clamp((t - 57.6) / 8.4);
    S.space.update(t, { pink, spin: 0.12 });
    const cnt = '♥ ' + counterText(t);
    for (const city of PLAZA_CITIES) { const pz = S.plazas[city]; if (pz.g.visible) { pz.p.billboard.redraw(cnt); pz.p.update(t, clamp((t - 58) / 8) * 0.9); } }
    // window washer (voiced at 59.6) dangling in front of the Tokyo billboard
    S.washer.root.position.set(1.0, 5.5 + Math.sin(t * 1.5) * 0.3, -9.5); S.washer.root.rotation.y = 0;
    S.washer.pose({ ...POSES.idle(t), aRs: 1.0 + Math.sin(t * 9) * 0.35, aRf: 0.9, aRe: 0.6, hR: 'open', aLs: 0.4 }); S.washer.face(t >= 59.6 && t < 60.6 ? { ...FACES.scream, open: mo('washer_shout', t) } : t < 59.6 ? FACES.happy : FACES.shock);
    // Gerald on the Rio billboard
    S.catTop.pose({ ...APOSES.sit(t), hy: 0.2 }); S.catTop.face({ lid: 0.5 }); S.catTop.root.rotation.y = Math.PI + 0.1 * Math.sin(t);
    // Earth ring + hearts
    const rt = t - 66.0; S.ring.visible = key === 'space' && rt >= 0 && rt < 1.6; if (S.ring.visible) { const k = easeOutCubic(rt / 1.6); S.ring.scale.setScalar(3.2 + k * 9); S.ring.material.opacity = 0.9 * (1 - k); }
    S.hearts.update((i) => { if (t < 66.0) return null; const a = (i / 90) * 6.283 * 3 + t * 0.4 * (1 + (i % 3) * 0.3), rr = 3.9 + (i % 9) * 0.5, age = t - 66.0 - (i / 90) * 1.0; if (age < 0) return null; return { x: Math.cos(a) * rr, y: Math.sin(a * 1.7 + i) * 1.8, z: Math.sin(a) * rr, s: 0.35 * easeOutBack(clamp(age / 0.5)), ry: t + i }; });
    // ghosts: swarm in from the edges to hover around Earth; extras fly through
    const arrive = clamp((t - 71.0) / 3.2);
    S.ghosts.forEach((g, i) => { const a = i * 1.257 + 0.5 + t * 0.05; const rr = lerp(24, [6.2, 5.8, 6.6, 6.0, 5.6][i], easeOutCubic(arrive)); g.root.position.set(Math.cos(a + 0.7) * rr * (i === 0 ? 0.9 : 1) - (i === 0 ? 0 : 0), 1.2 + Math.sin(t * 1.4 + i) * 0.35, Math.sin(a + 0.7) * rr * 0.6 + 1.0); g.root.rotation.y = Math.atan2(-g.root.position.x, 6 - g.root.position.z); g.pose({ ...POSES.float(t + i), hL: 'open', hR: 'open' }); g.face(i === 0 && t >= 74.4 ? { ...FACES.scream, open: mo('ghost_echo', t) * 0.8, eye: 1.1 } : FACES.shock); });
    // the caveman ghost steps up to the camera for the last line
    const g0 = S.ghosts[0]; if (t >= 73.9) { const k = easeOutCubic(clamp((t - 73.9) / 0.5)); g0.root.position.set(lerp(g0.root.position.x, 0, k), lerp(g0.root.position.y, 1.4, k), lerp(g0.root.position.z, 2.2, k)); g0.root.rotation.y = lerp(g0.root.rotation.y, 0, k); }
    S.ghostExtra.forEach((g, i) => { const a = clamp((t - 71.4 - i * 0.18) / 3.0); g.root.position.set(lerp(-26 + i * 5.2, 12 - i * 2.4, a), 2 + Math.sin(i) * 3, lerp(-6, 1 - (i % 3) * 3, a)); g.root.rotation.y = Math.PI / 2 * (i % 2 ? 1 : -1) * 0.7; g.pose(POSES.float(t + i * 0.5)); g.face(FACES.shock); g.root.visible = key === 'space' && t > 71.2; });
    const r = { cam: c, keyFocus: key === 'space' ? [0, 0, 0] : [OFF(PLAZA_CITIES.indexOf(key))[0], 3, 0], keyDist: key === 'space' ? 14 : 12 };
    if (t >= 66.0 && t < 66.35) r.flash = 0.45 * (1 - (t - 66.0) / 0.35);
    if (t >= 66.0 && t < 67.4) r.banner = { text: 'EVERYONE ON EARTH', y: 1180, t0: 66.0, size: 124, fill: '#ffd1e6' };
    if (t >= 74.0 && t < 74.8) r.banner = { text: 'EVERYONE WHO EVER LIVED', y: 1100, t0: 74.0, size: 90, fill: '#cfe8ff' };
    return r;
  },
};
