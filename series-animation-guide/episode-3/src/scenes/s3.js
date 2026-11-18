// S3 — TALENT SHOW (20.8–32.0): the hero wanders onto a magician's act; the audience pivots; golden buzzer; result board. Count 2,048 -> 32,768.
import { THREE, makeCharacter, PRESETS, POSES, FACES, rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, orbit, cam, shot, pick, pops, place, V, D2R } from '../common.js';
import { makeStage } from '/lib/stage.js';
import { buildTheatre } from '/lib/sets/theatre.js';
import { makeAnimal, APOSES, ANIMALS } from '/lib/animal.js';
import { goldenBuzzerButton, microphone } from '/lib/props/holdables.js';
import { makeConfetti, makeHeartField } from '/lib/fx/hearts.js';
import { textBoard, mat, add } from '/lib/util.js';
import { confettiCannon } from '/lib/props/stage.js';

const STAGE = { sky: ['#1a0a10', '#3a1420'], ground: null, hemiI: 0.95, key: 0xfff0d6, keyI: 2.0, keyPos: [2, 14, 12], shadow: { extent: 18, size: 2048 } };
const STG = [0, 0.52, -9];

export default {
  async build(ctx) {
    const stage = makeStage(STAGE), scene = stage.scene;
    const th = buildTheatre({ rows: 8, cols: 15, withJudges: true }); scene.add(th.group);
    const S = { stage, scene, th };
    const mk = (preset) => { const c = makeCharacter(PRESETS[preset]); scene.add(c.root); return c; };
    S.hero = mk('hero'); S.magician = mk('magician'); S.host = mk('host');
    S.rabbit = makeAnimal('rabbit', { scale: 0.8 }); scene.add(S.rabbit.root);
    S.mic = microphone(); S.host.hold(S.mic, 'R');
    // table + hat on stage, golden buzzer on judges' table
    const table = new THREE.Group(); add(table, new THREE.CylinderGeometry(0.5, 0.45, 0.9, 16), mat(0x6a3a8a), [0, 0.45, 0]); add(table, new THREE.CylinderGeometry(0.22, 0.22, 0.3, 16), mat(0x15151c), [0, 1.05, 0]); table.position.set(-2.4, 0.52, -9.5); scene.add(table); S.table = table;
    S.buzzer = goldenBuzzerButton(); S.buzzer.scale.setScalar(1.6); S.buzzer.position.set(2.0, 0.92, 0.55); scene.add(S.buzzer);
    // boards (head-on): NOW PERFORMING (two states) + result
    const mkBoard = (lines) => textBoard(4.2, 2.1, lines, { bg: '#10163a', border: '#ffd23f' });
    S.bA = mkBoard([{ text: 'NOW PERFORMING', size: 0.075, color: '#ffd23f', y: 0.25, font: 'Anton, Inter', weight: 400 }, { text: 'BRIAN THE MAGICIAN', size: 0.085, color: '#ffffff', y: 0.55, font: 'Anton, Inter', weight: 400 }, { text: '& HIS RABBIT', size: 0.06, color: '#9be7ff', y: 0.8 }]);
    S.bB = mkBoard([{ text: 'NOW PERFORMING', size: 0.075, color: '#ffd23f', y: 0.25, font: 'Anton, Inter', weight: 400 }, { text: 'THAT GUY', size: 0.14, color: '#ff5c9a', y: 0.58, font: 'Anton, Inter', weight: 400 }, { text: '(NOBODY ASKED)', size: 0.06, color: '#9be7ff', y: 0.84 }]);
    S.bR = textBoard(4.4, 2.6, [{ text: 'ACT 12 · RESULT', size: 0.07, color: '#ffd23f', y: 0.12, font: 'Anton, Inter', weight: 400 }, { text: 'JUST WAVED', size: 0.1, color: '#ffffff', y: 0.3, font: 'Anton, Inter', weight: 400 }, { text: '10 / 10', size: 0.2, color: '#4cd07a', y: 0.52, font: 'Anton, Inter', weight: 400 }, { text: 'AUDIENCE VOTES: 32,768', size: 0.06, color: '#ffffff', y: 0.74, weight: 800 }, { text: '2nd place: still performing…', size: 0.05, color: '#9be7ff', y: 0.88 }], { bg: '#10163a', border: '#ffd23f' });
    for (const [b, x, y, z] of [[S.bA, -6.6, 2.6, -8.6], [S.bB, -6.6, 2.6, -8.55], [S.bR, 0, 3.1, -8.4]]) { b.position.set(x, y, z); scene.add(b); }
    S.cannons = [-1, 1].map((sd) => { const c = confettiCannon(); c.position.set(sd * 6.2, 0.52, -8); c.rotation.z = sd * 0.5; c.rotation.y = 0; scene.add(c); return c; });
    S.confL = makeConfetti(320, { origin: [-6.0, 1.4, -8], spread: [3.2, 7, 2.5], size: 0.3, seed: 4 }); S.confR = makeConfetti(320, { origin: [6.0, 1.4, -8], spread: [-3.2, 7, 2.5], size: 0.3, seed: 5 }); scene.add(S.confL, S.confR);
    S.confR2 = makeConfetti(260, { origin: [0, 6.5, -5], spread: [6, 2, 6], gravity: 6, size: 0.18, seed: 6 }); scene.add(S.confR2);
    // Gerald in the front row centre seat
    S.cat = makeAnimal('cat', ANIMALS.gerald); scene.add(S.cat.root);
    const sp = th.anchors.seats.seatPos; const seat0 = sp[7]; S.catSeat = [seat0[0] + th.anchors.seats.position.x, seat0[1] + 0.58, seat0[2] + th.anchors.seats.position.z];
    S.cat.root.position.set(...S.catSeat); S.cat.root.rotation.y = Math.PI;
    // hearts rising from the audience
    S.hf = makeHeartField(90, { color: 0xff3f7f, emissive: 0.5 }); scene.add(S.hf);
    const r = rng(8); S.hearts = Array.from({ length: 90 }, (_, i) => { const si = Math.floor(r() * sp.length); return { si, born: 23.6 + (i / 90) * 7.4, ph: r() * 6 }; });
    const seatW = (i) => [sp[i][0] + th.anchors.seats.position.x, sp[i][1] + th.anchors.seats.position.y, sp[i][2] + th.anchors.seats.position.z]; S.seatW = seatW;
    // shots (28 units from 20.8)
    const J = th.anchors.judges.map((j) => j.root.position);
    S.shots = [
      shot(20.8, 21.6, cam([0, 3.0, 4.0], [0, 2.6, -9], 46), cam([0, 2.8, 1.5], [0, 2.4, -9], 46)),                               // wide from the audience: magician's act
      shot(21.6, 22.0, orbit([-2.0, 1.9, -9.0], -10, 3.4, 0.0, 36)),                                                           // magician close
      shot(22.0, 22.4, cam([2.4, 1.9, -4.2], [1.6, 1.5, -9], 44), cam([1.6, 1.9, -4.2], [0.8, 1.5, -9], 44)),                 // hero wanders on
      shot(22.4, 23.2, cam([-1.4, 1.7, -3.2], [-0.8, 1.55, 1.1], 40), cam([1.4, 1.7, -3.2], [0.8, 1.55, 1.1], 40)),              // judges' faces from the stage
      shot(23.2, 23.6, orbit([-1.4, 1.1, -9.0], 15, 2.8, 0.2, 38)),                                                            // rabbit to hero
      shot(23.6, 24.0, cam([0, 1.9, -6.2], [0, 1.9, 6], 56)),                                                                   // audience from stage (faces!)
      shot(24.0, 24.8, cam([-6.6, 2.7, 0.6], [-6.6, 2.7, -8.6], 50)),                                                          // board: NOW PERFORMING -> THAT GUY (head-on)
      shot(24.8, 25.6, orbit([S.catSeat[0], S.catSeat[1] + 0.45, S.catSeat[2]], 180, 3.0, 0.2, 34)),                            // Gerald in the front row (roast)
      shot(25.6, 26.0, orbit([0.3, 1.7, -9], 8, 3.6, 0.2, 38)),                                                                // hero waving
      shot(26.0, 26.8, cam([2.4, 1.8, -3.4], [-1.2, 1.5, 1.1], 46), cam([1.6, 1.8, -3.4], [-0.4, 1.5, 1.1], 46)),               // judges applauding
      shot(26.8, 27.2, cam([0, 11.5, -2], [0, 0, -7], 56)),                                                                    // top-down spotlights
      shot(27.2, 27.6, cam([5, 3.6, -1.0], [-0.5, 1.6, -9.5], 48), cam([3, 3.4, -1.0], [-0.5, 1.6, -9.5], 48)),                      // wide: magician faints, hero bows
      shot(27.6, 28.0, orbit([2.0, 1.25, 0.6], -55, 2.4, 0.4, 36)),                                                              // judgeD over the golden buzzer
      shot(28.0, 28.8, cam([0, 4.6, -1.0], [0, 3.0, -8.5], 56), cam([0, 4.2, -2.5], [0, 3.2, -8.5], 56)),                              // BUZZER + confetti wide
      shot(28.8, 29.2, cam([-2.4, 1.8, -2.6], [-2.4, 2.1, 1.15], 36), cam([-2.4, 1.7, -1.5], [-2.4, 2.0, 1.15], 28), { ease: 'in' }), // punch-zoom judgeA
      shot(29.2, 29.6, cam([-2.4, 1.6, -1.0], [-2.4, 1.9, 1.15], 26)),                                                         // judge voice close
      shot(29.6, 30.0, cam([0, 1.9, -6.2], [0, 2.6, 6], 56)),                                                                  // audience on its feet
      shot(30.0, 30.8, cam([0, 3.6, 3.0], [0, 3.1, -8.4], 52)),                                                                // result board (head-on, >=0.6 s)
      shot(30.8, 31.2, cam([0, 1.6, -5.8], [0, 2.8, 5], 52)),                                                                  // crowd voice from stage
      shot(31.2, 31.6, cam([0, 6.5, 12], [0, 2.8, -4], 52), cam([0, 6.0, 10], [0, 2.8, -4], 52)),                              // standing ovation wide
      shot(31.6, 32.0, orbit([0.3, 1.5, -9], 10, 3.4, 0.2, 40)),                                                                // hero bows in confetti
    ];
    return S;
  },
  frame(t, S, ctx) {
    const P = pick(S.shots, t), c = P.cam, mo = ctx.mouth; const { th } = S;
    const cheer = clamp((t - 23.4) / 4.6) * (t > 29.6 ? 1.15 : 1);
    th.update(t, { cheer: Math.min(1, cheer) });
    // hero: enters from the wings, wanders to centre, waves, bows
    const hx = t < 23.0 ? lerp(5.2, 0.0, easeOutCubic(clamp((t - 21.4) / 1.6))) : 0.0 + Math.sin(t * 0.8) * 0.15;
    const walking = t >= 21.4 && t < 23.0;
    place(S.hero, hx, 0.52, -9.0 + (t > 23 ? Math.sin(t) * 0.2 : 0), t < 23.0 ? -Math.PI / 2 * 0.9 : 0.15);
    let hp = walking ? POSES.walk(t, 6) : t < 21.4 ? { ...POSES.idle(t) } : t < 26.8 ? { ...POSES.wave(t), hR: 'open' } : t < 31.0 ? { ...POSES.cheer(t), aLs: 1.3 } : POSES.hugOpen(t, 0.6);
    if (t > 31.5) hp = { ...POSES.deadpan(t), lean: 0.5, hx: 0.5, aLs: 0.2, aRs: 0.2 };
    S.hero.pose(hp); S.hero.face(t < 22.4 ? FACES.shock : t < 26.8 ? { ...FACES.happy, wide: 1.3 } : FACES.smug);
    S.hero.root.visible = t >= 21.2;
    // magician performs, rabbit appears, then faints
    place(S.magician, -2.4, 0.52, -10.6, 0.0); const faint = clamp((t - 27.2) / 0.5);
    S.magician.pose(faint > 0 ? { ...POSES.shock(), lean: -faint * 1.1, bob: -faint * 0.3, squash: 1 - faint * 0.1, aRs: 1.2 } : { ...POSES.wave(t * 0.6), aRs: 1.6 + Math.sin(t * 5) * 0.2, aRe: 0.4, hR: 'open' }); S.magician.face(faint > 0 ? { ...FACES.shock, open: 0.8 } : t < 22.4 ? FACES.smug : { ...FACES.shock, open: 0.5 });
    const rt = clamp((t - 23.2) / 0.8), rx = lerp(-2.4, hx - 0.6, easeOutCubic(rt)), rz = -9.5;
    S.rabbit.root.visible = t >= 21.0; S.rabbit.root.position.set(t < 23.2 ? -2.4 : rx, 0.52 + (t < 23.2 ? 1.2 : Math.abs(Math.sin(rt * 9)) * 0.25 * (1 - rt)), rz + (t < 23.2 ? 0 : 0.5 * rt)); S.rabbit.root.rotation.y = t < 23.2 ? 0 : Math.PI / 2 * 0.2;
    S.rabbit.pose(APOSES.stand(t)); S.rabbit.face({});
    // host with mic stage right
    place(S.host, 5.0, 0.52, -8.6, -0.5); S.host.pose({ ...POSES.holdR(), aLs: 0.2 }); S.host.face(t > 24 ? FACES.excited : FACES.happy); S.host.root.visible = true;
    // judges: react (smug -> confused -> applause -> shock)
    th.anchors.judges.forEach((j, i) => { const ph = i * 0.4; let f = t < 22.4 ? FACES.smug : t < 26.0 ? FACES.question : t < 28.0 ? FACES.happy : { ...FACES.shock, open: 0.7 }; if (i === 0 && t >= 29.2 && t < 30.4) f = { ...FACES.scream, open: mo('judge_disbelief', t) }; j.face(f); const arm = t >= 26.0 && t < 28.0 ? POSES.clap(t + ph) : POSES.idle(t); const pressing = i === 3 && t >= 27.6 ? { aRf: 1.4 + (t >= 28.0 ? -0.5 : 0), aRe: 0.3, hR: 'fist' } : {}; j.pose({ ...POSES.sitOn(t, 0.5 / 1 - 0.16), hy: Math.sin(t + ph) * 0.1, ...arm, ...pressing, aLf: 0.6, plant: true }); });
    // golden buzzer press at 28.0
    S.buzzer.children[1].position.y = t >= 28.0 && t < 28.3 ? 0.09 : 0.12;
    // boards
    S.bA.visible = t < 24.0; S.bB.visible = t >= 24.0; S.bR.visible = t >= 29.6 && t < 31.6;
    S.bB.scale.setScalar(t >= 24.0 ? 1 + Math.max(0, 0.15 - (t - 24.0)) * 1.2 : 1);
    // confetti
    S.confL.update(t - 28.0); S.confR.update(t - 28.0); S.confR2.update(t - 31.0);
    // Gerald
    S.cat.pose(APOSES.sit(t)); S.cat.face({ lid: 0.5 }); S.cat.root.rotation.y = Math.PI; S.cat.root.position.set(S.catSeat[0], S.catSeat[1] - 0.2, S.catSeat[2]);
    // hearts from audience
    S.hf.update((i) => { const h = S.hearts[i]; const a = t - h.born; if (a < 0) return null; const w = S.seatW(h.si); const k = easeOutBack(clamp(a / 0.5)); return { x: w[0], y: w[1] + 2.15 + (a % 2) * 0.25, z: w[2], s: 0.32 * k, ry: Math.PI + Math.sin(t + h.ph) * 0.3 }; });
    return { cam: c, keyFocus: [0, 1.5, -4], keyDist: 14 };
  },
};
