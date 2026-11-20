// P6 · THE BREAK (story 60.4-68.4): he crouches on nothing above the Milky Way (n5; the counter breaks at 62.0, music cut),
// the launch (62.8: shock ring across the galaxy, speed lines, the camera drops away), the montage (0.8 s each):
// Milky Way -> Local Group -> cosmic web -> the observable universe as a glowing ball. His streak crosses every step.
import { THREE, makeHero, P, F, POSES, FACES, clamp, smooth, lerp, cam, mixCam, seg, rng, mat, speedLines, starBackground, glowPoints, hash } from '../common.js';
import { makeStage } from '../../../assets/library/stage.js';
import { makeGalaxy } from '../../../assets/library/props/world.js';
import { shockwave, cosmicWeb, universeBall } from '../../../assets/library/fx/dunk.js';

function streak(scene) {   // the hero as a bright comet: head + fading trail
  const g = new THREE.Group(); scene.add(g);
  const head = glowPoints(new Float32Array([0, 0, 0]), new Float32Array([1, 0.95, 0.8]), { size: 60, attenuate: false }); g.add(head);
  const n = 40, pos = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const k = 1 - i / n; pos.set([0, -i * 0.05, 0], i * 3); col.set([1 * k, 0.4 * k, 0.25 * k], i * 3); }
  const tail = glowPoints(pos, col, { size: 26, attenuate: false }); g.add(tail); g.userData = { tail, pos, n };
  g.set = (len) => { for (let i = 0; i < n; i++) pos[i * 3 + 1] = -i / n * len; tail.geometry.attributes.position.needsUpdate = true; };
  return g;
}
export default {
  async build(ctx) {
    const stage = makeStage({ sky: ['#000003', '#03020a'], ground: null, hemiI: 0.6, hemiSky: 0xd0d8ff, hemiGround: 0x302840, keyI: 2.4, keyPos: [6, 5, 9], fillI: 0.8, rimI: 0.9, rimC: 0xffc89a, env: 0, shadow: { extent: 8 } });
    const scene = stage.scene; const stars = starBackground(scene, { n: 2600, R: 1500, seed: 12 });
    const hero = makeHero(scene);
    const gal = makeGalaxy(3, 12000, 60, 12); gal.position.set(0, -14, -10); scene.add(gal);
    const wave = shockwave({ maxR: 80, dur: 1.0, color: 0xffe0b0, sparks: 900 }); wave.position.set(0, -13.8, -10); scene.add(wave);
    const lines = speedLines(scene, { n: 140, len: 4, R: 3.6, color: 0xfff0d0 });
    // montage scenes (each its own group; black void)
    const M = new THREE.Scene(); M.background = new THREE.Color(0x000000); starBackground(M, { n: 1600, R: 1500, seed: 13 });
    const m1 = new THREE.Group(); M.add(m1); const mw = makeGalaxy(3, 12000, 40, 12); mw.rotation.x = 1.1; m1.add(mw);
    const m2 = new THREE.Group(); M.add(m2); const r = rng(5); for (let i = 0; i < 9; i++) { const gx = makeGalaxy(2 + (i % 2), 2200, i === 0 ? 14 : i === 1 ? 10 : r.range(2, 5), 20 + i); gx.position.set(i === 0 ? -16 : i === 1 ? 14 : r.range(-30, 30), i < 2 ? (i ? -8 : 10) : r.range(-40, 40), r.range(-20, 0)); gx.rotation.set(r.range(0, 3), r.range(0, 3), 0); m2.add(gx); }
    const m3 = new THREE.Group(); M.add(m3); const web = cosmicWeb(45, 12000, 61); web.material.uniforms.size.value = 0.35; web.material.uniforms.opacity.value = 0.55; m3.add(web);
    const m4 = new THREE.Group(); M.add(m4); const ub = universeBall(10, { light: 0, points: 6000, seed: 31 }); ub.userData.web.material.uniforms.size.value = 0.12; ub.userData.web.material.uniforms.opacity.value = 0.6; ub.userData.coreGlow.material.uniforms.size.value = 6; m4.add(ub);
    const st = streak(M);
    return { stage, scene, stars, hero, gal, wave, lines, M, m1, m2, m3, m4, mw, web, ub, st };
  },
  frame(t, S, ctx) {
    const { hero } = S, out = { voiceY: {}, roastY: 1580 };
    S.gal.rotation.y = t * 0.03;
    if (t < 65.2) {
      let c, hp = [0, 0, 0], pose, face;
      if (t < 62.8) {
        // crouch on nothing; the counter breaks at 62.0 (HUD); a glitch shake on 62.0
        const k = smooth(seg(t, 60.6, 61.6)); pose = { ...P.crouch(0.6 + 0.4 * k), aLf: -0.9 * k, aRf: -0.9 * k }; face = { smile: 0.2, brow: -0.4, browTilt: -0.5, lid: 0.25 + 0.15 * k };
        hp = [0, -0.2 * k, 0];
        c = mixCam(cam([1.3, 1.5, 5.2], [0, 1.05, 0], 42), cam([1.0, 1.3, 4.0], [0, 1.0, 0], 40), smooth(seg(t, 60.4, 62.8)));
        if (t >= 62.0) { const a = t - 62.0, n = Math.floor(t * 30); c.pos = [c.pos[0] + (hash(n, 4) - 0.5) * 0.08 * Math.exp(-a * 3), c.pos[1] + (hash(n, 5) - 0.5) * 0.06 * Math.exp(-a * 3), c.pos[2]]; }
        S.wave.set(-1); S.lines.visible = false;
      } else {
        // the launch: shock ring across the galaxy, speed lines, camera drops away
        const a = t - 62.8, u = seg(t, 62.8, 65.2); pose = P.launch(1); face = { ...F.fly, open: 0.3, brow: 0.8 };
        hp = [0, 0.3 + 3.2 * Math.pow(a, 1.6), 0];
        S.wave.set(a * 0.9);
        c = cam([1.6, lerp(1.3, -9, smooth(u)), lerp(4.4, 14, smooth(u))], [0, hp[1] + 0.2, 0], lerp(42, 50, smooth(u)));
        S.lines.visible = true; S.lines.set(t, hp, 4, 'y', 0.35 * (1 - u * 0.5));
        if (a < 0.2) out.flash = 0.9 * (1 - a / 0.2);
      }
      hero.root.position.set(...hp); hero.root.rotation.y = 0.35; hero.pose(pose); hero.face(face);
      out.cam = c; out.keyFocus = [0, hp[1] + 0.8, 0]; out.keyDist = 10; out.shakeK = 0;
      return out;
    }
    // the montage: four 0.8 s steps
    const k = Math.min(3, Math.floor((t - 65.2) / 0.8 + 1e-9)), u = ((t - 65.2) - k * 0.8) / 0.8;
    [S.m1, S.m2, S.m3, S.m4].forEach((g, i) => (g.visible = i === k));
    out.scene = S.M; out.keyFocus = false;
    const d = [70, 140, 120, 34][k] * (1.15 - 0.15 * u), az = [0.2, 0.5, 0.8, 0.3][k] + u * 0.1;
    out.cam = cam([Math.sin(az) * d, d * 0.15, Math.cos(az) * d], [0, 0, 0], 46);
    S.mw.rotation.z = t * 0.1; S.web.rotation.y = t * 0.12; S.ub.rotation.y = t * 0.3;
    // his streak shoots up through each step
    S.st.position.set(lerp(-d * 0.08, d * 0.06, u), lerp(-d * 0.35, d * 0.45, u), 0); S.st.set(d * 0.25);
    if (u < 0.08) out.flash = 0.15 * (1 - u / 0.08);
    return out;
  },
};
