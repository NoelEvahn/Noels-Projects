// Shared helpers for episode 6: cameras, cast, Mom's power-up kit, the giant sneaker, landmarks the library lacks, FX.
import * as THREE from 'three';
import { makeCharacter, PRESETS, POSES, FACES } from '../../assets/library/character.js';
import { makeAnimal, APOSES, AFACES, ANIMALS } from '../../assets/library/animal.js';
import { rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, easeInOut, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade } from '../../assets/library/util.js';
import { makeStage } from '../../assets/library/stage.js';
import { glowPoints } from '../../assets/library/fx/dunk.js';
export { THREE, makeCharacter, PRESETS, POSES, FACES, makeAnimal, APOSES, AFACES, ANIMALS, rng, clamp, smooth, lerp, easeOutBack, easeOutCubic, easeInOut, mat, glow, add, sph, box, cyl, cone, tor, rbox, shade, makeStage, glowPoints };

export const D2R = Math.PI / 180;
export const cam = (pos, target, fov = 40, roll = 0) => ({ pos, target, fov, roll });
export const mixCam = (a, b, k) => ({ pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)), target: a.target.map((v, i) => lerp(v, b.target[i], k)), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k) });
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const hash = (n, s = 1) => { const x = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
export const shake = (t, amp, f = 40) => [(hash(Math.floor(t * f), 1) - 0.5) * amp, (hash(Math.floor(t * f), 2) - 0.5) * amp];
export const show = (objs, on) => { for (const o of objs) (o.root ?? o).visible = on; };

// ---- characters (feet at y=0, facing +Z). HERO_H = the rig's standing height (measured once).
export function person(scene, preset) { const c = makeCharacter(typeof preset === 'string' ? (CAST[preset] ?? PRESETS[preset]) : preset); scene.add(c.root); c.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return c; }
export const CAST = {
  lady: { skin: 0xe8b48a, lashes: true, hair: { style: 'bun', color: 0xc8c0b8 }, outfit: { type: 'cardigan', color: 0x7ab0d8 }, pants: { type: 'long', color: 0x5a5a7a }, shoes: 0x6a4a3a, acc: ['glasses'], seed: 31 },
  pilot: { skin: 0xd9a078, hair: { style: 'short', color: 0x2a1a10 }, outfit: { type: 'jumpsuit', color: 0x3a5a3a }, pants: { type: 'long', color: 0x3a5a3a }, shoes: 0x111111, acc: ['sunglasses', 'mustache:0x2a1a10'], seed: 32 },
  reporter: { skin: 0xc88a66, hair: { style: 'parting', color: 0x1a120c }, outfit: { type: 'suit', color: 0x2a3a6a }, pants: { type: 'long', color: 0x2a3a6a }, shoes: 0x111111, acc: ['tie:0xd9262c'], seed: 33 },
  cameraman: { skin: 0xf0c0a0, hair: { style: 'short', color: 0x6a4a2a }, outfit: { type: 'tee', color: 0x3a3a44 }, pants: { type: 'long', color: 0x4a4a3a }, shoes: 0x222222, acc: ['cap:0x222222'], seed: 34 },
  climber: { skin: 0xe8b48a, hair: { style: 'short', color: 0x4a3322 }, outfit: { type: 'jumpsuit', color: 0xff7a1a }, pants: { type: 'long', color: 0xff7a1a }, shoes: 0x3a2a1a, acc: ['goggles:0x3a6ea5', 'backpack:0x2f6fd6'], seed: 35 },
  nasaA: { skin: 0xd9a078, hair: { style: 'short', color: 0x2a1a10 }, outfit: { type: 'tee', color: 0xffffff }, pants: { type: 'long', color: 0x3a3f66 }, shoes: 0x222222, acc: ['glasses', 'tie:0x2f6fd6'], seed: 36 },
  nasaB: { skin: 0x8a5a3a, lashes: true, hair: { style: 'bun', color: 0x15100c }, outfit: { type: 'cardigan', color: 0x6a8ab0 }, pants: { type: 'long', color: 0x3a3a44 }, shoes: 0x222222, seed: 37 },
  nasaC: { skin: 0xf2c3a0, hair: { style: 'parting', color: 0xc89a5a }, outfit: { type: 'tee', color: 0xe8e8e8 }, pants: { type: 'long', color: 0x4a4a5a }, shoes: 0x222222, acc: ['tie:0x8a1a1a'], seed: 38 },
};
export function makeHero(scene) { const h = person(scene, PRESETS.hero); return h; }
export function heroHeight() { const h = makeCharacter(PRESETS.hero); h.pose(POSES.idle(0)); h.root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(h.root); return b.max.y - b.min.y; }
export function makeGerald(scene) { const c = makeAnimal('cat', ANIMALS.gerald); scene.add(c.root); c.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return c; }
export function geraldSuit(cat) {
  const g = new THREE.Group(); cat.root.add(g);
  add(g, cyl(0.105, 0.12, 0.3, 18, 1, true), mat(0x23232e, { rough: 0.6, side: THREE.DoubleSide }), [0, 0.3, 0.02], [Math.PI / 2, 0, 0]);
  add(g, cone(0.04, 0.05, 3), mat(0xffffff), [0, 0.33, 0.2], [Math.PI, 0, 0]);
  add(g, box(0.03, 0.11, 0.012), mat(0xd9262c), [0, 0.27, 0.205], [0.3, 0, 0]);
  return g;
}
export function laPeace(ch, t, id, ctx, extra = {}) { ch.pose({ ...POSES.laPeace(t), ...extra }); ch.face({ ...FACES.mew, open: ctx.mouth(id, t) }); }
export const talk = (ctx, id, t, face = {}) => ({ ...face, open: Math.max(face.open ?? 0, ctx.mouth(id, t)) });

// ---- Mom's power-up (the drop at 48.4): bigger shoulders/arms/chest, veins, glowing eyes, aura. set(k 0..1, t)
export function momPower(ch) {
  const R = ch.R, skin = ch.opts.skin, mS = mat(skin, { rough: 0.5 }), mVein = mat(shade(skin, 0.62), { rough: 0.45 }), parts = [];
  const bulge = (parent, r, pos, sc) => { const m = add(parent, sph(r, 20, 14), mS, pos, [0, 0, 0], sc); parts.push([m, sc]); return m; };
  for (const A of [ch.aL, ch.aR]) {
    bulge(A.sh, 0.11, [0, -0.02, 0], [1.25, 1.0, 1.15]);            // deltoid
    bulge(A.sh, 0.1, [0, -0.11, 0.03], [1.0, 1.35, 1.05]);           // biceps
    bulge(A.sh, 0.085, [0, -0.12, -0.04], [0.9, 1.3, 0.9]);          // triceps
    bulge(A.el, 0.08, [0, -0.07, 0.01], [1.05, 1.35, 1.0]);          // forearm
    for (let i = 0; i < 3; i++) {   // veins on the forearm and biceps
      const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(new THREE.Vector3(Math.sin(u * 5 + i * 2) * 0.012 + (i - 1) * 0.025, -0.02 - u * 0.16, 0.075 + 0.01 * Math.sin(u * 3))); }
      const v = add(A.el, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.006, 6), mVein); parts.push([v, [1, 1, 1], 'vein']);
      const p2 = pts.map((p) => new THREE.Vector3(p.x * 1.2, p.y * 0.8 - 0.04, p.z + 0.03)); const v2 = add(A.sh, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p2), 24, 0.006, 6), mVein); parts.push([v2, [1, 1, 1], 'vein']);
    }
  }
  const traps = add(ch.torsoG, sph(0.2, 20, 14), mat(ch.opts.outfit.color, { rough: 0.8 }), [0, 0.5, -0.06], [0, 0, 0], [1.25, 0.32, 0.7]); parts.push([traps, [1.25, 0.32, 0.7]]);
  const eyes = []; const eyeM = new THREE.MeshBasicMaterial({ color: 0xfff6a0, toneMapped: false });
  for (const s of [-1, 1]) { const e = add(ch.head, sph(R * 0.2, 16, 12), eyeM, [s * R * 0.31, R * 0.1, R * 0.95]); e.castShadow = false; eyes.push(e);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 0.45, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.position.copy(e.position); ch.head.add(halo); eyes.push(halo); }
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    uniforms: { k: { value: 0 }, c: { value: new THREE.Color(0xffd23f) } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix*normal); vec4 p = modelViewMatrix*vec4(position,1.0); v = normalize(-p.xyz); gl_Position = projectionMatrix*p; }',
    fragmentShader: 'uniform float k; uniform vec3 c; varying vec3 n; varying vec3 v; void main(){ float f = pow(1.0-abs(dot(n,v)), 2.0); gl_FragColor = vec4(c*f*k*1.6, f*k); }' }));
  aura.scale.set(0.75, 1.25, 0.6); aura.position.y = 1.0; ch.root.add(aura);
  const set = (k, t = 0) => {
    for (const [m, sc, kind] of parts) { const s = kind === 'vein' ? 1 : Math.max(0.001, k); m.visible = k > 0.02; if (kind !== 'vein') m.scale.set(sc[0] * s, sc[1] * s, sc[2] * s); else m.scale.setScalar(clamp((k - 0.4) / 0.4)); }
    const w = 1 + 0.35 * k; ch.torsoMesh.scale.set(w, 1 + 0.05 * k, 0.9 * (1 + 0.25 * k));
    for (const A of [ch.aL, ch.aR]) { A.sh.scale.set(1 + 0.25 * k, 1, 1 + 0.25 * k); A.el.scale.set(1 + 0.2 * k, 1, 1 + 0.2 * k); }
    for (const e of eyes) e.visible = k > 0.15;
    aura.material.uniforms.k.value = k * (0.75 + 0.25 * Math.sin(t * 9)); aura.visible = k > 0.02;
  };
  set(0); return { set };
}

// ---- the hero's giant sneaker (sole at y=0, toe toward +Z, length 1 = heel->toe), with sock and shin rising out of frame
export function giantShoe({ shin = 3.0 } = {}) {
  const g = new THREE.Group(), W = 0.42, white = mat(0xffffff, { rough: 0.5 }), sole = mat(0xe6e6e6, { rough: 0.7 }), tread = mat(0xb8b8be, { rough: 0.9 });
  add(g, rbox(W, 0.09, 1.0, 0.04), sole, [0, 0.045, 0]);
  for (let i = 0; i < 9; i++) add(g, box(W * 0.86, 0.02, 0.05), tread, [0, -0.004, -0.42 + i * 0.105]);
  for (const x of [-1, 1]) for (let i = 0; i < 4; i++) add(g, box(0.03, 0.02, 0.18), tread, [x * W * 0.32, -0.004, -0.36 + i * 0.24]);
  add(g, sph(0.5, 32, 20), white, [0, 0.19, 0.06], [0, 0, 0], [W * 0.98, 0.24, 0.98]);          // upper
  add(g, sph(0.2, 20, 14), white, [0, 0.16, 0.33], [0, 0, 0], [0.98, 0.7, 1.0]);                 // toe box
  add(g, rbox(0.2, 0.03, 0.3, 0.01), mat(0xf2f2f2), [0, 0.38, 0.12], [-0.45, 0, 0]);             // laces
  for (let i = 0; i < 4; i++) add(g, box(0.17, 0.012, 0.02), mat(0xd0d0d4), [0, 0.39 - i * 0.03, 0.04 + i * 0.07], [-0.45, 0, 0]);
  add(g, box(0.012, 0.12, 0.42), mat(0xe53935), [W * 0.49, 0.15, 0.0]);                         // red stripe (hero's colours)
  add(g, box(0.012, 0.12, 0.42), mat(0xe53935), [-W * 0.49, 0.15, 0.0]);
  add(g, cyl(0.17, 0.18, 0.22, 24), mat(0xffffff, { rough: 0.9 }), [0, 0.42, -0.14]);             // sock
  add(g, cyl(0.15, 0.16, shin, 24), mat(PRESETS.hero.skin ?? 0xf2c3a0, { rough: 0.6 }), [0, 0.5 + shin / 2, -0.14]);   // shin
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
// ---- props the library lacks
export function eiffel() {
  const g = new THREE.Group(), m = mat(0x6a5a4a, { rough: 0.7, metal: 0.3 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = add(g, box(0.9, 9, 0.9), m, [sx * 2.6, 4.2, sz * 2.6], [sz * 0.32, 0, -sx * 0.32]); }
  add(g, box(6.4, 0.5, 6.4), m, [0, 7.4, 0]); for (let i = 0; i < 4; i++) add(g, tor(2.2, 0.18, 6, 20, Math.PI), m, [0, 0.2, (i < 2 ? 1 : -1) * 3.0], [0, i % 2 ? Math.PI / 2 : 0, 0]).position.set(i === 2 ? 3 : i === 3 ? -3 : 0, 0.2, i < 2 ? (i ? -3 : 3) : 0);
  add(g, cyl(1.2, 2.6, 8, 4), m, [0, 11.6, 0], [0, Math.PI / 4, 0]); add(g, box(3.2, 0.4, 3.2), m, [0, 15.6, 0]);
  add(g, cyl(0.35, 1.2, 9, 4), m, [0, 20.2, 0], [0, Math.PI / 4, 0]); add(g, cyl(0.08, 0.3, 3, 6), m, [0, 26, 0]);
  for (let y = 1; y < 24; y += 1.6) { const w = y < 7.4 ? 6.2 - y * 0.45 : y < 15.6 ? 3.2 - (y - 7.4) * 0.16 : 1.5 - (y - 15.6) * 0.12; if (w > 0.3) for (const r of [0, Math.PI / 2]) add(g, box(w * 2, 0.08, 0.08), m, [0, y, 0], [0, r + Math.PI / 4, 0]); }
  return g;   // ~27 units tall
}
export function helicopter() {
  const g = new THREE.Group(), body = mat(0xe53935, { rough: 0.35, metal: 0.2 }), dk = mat(0x22252c, { rough: 0.5 });
  add(g, sph(1, 32, 20, Math.PI, Math.PI), mat(0xe53935, { rough: 0.35, metal: 0.2, side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [0.9, 0.85, 1.5]);
  add(g, new THREE.CircleGeometry(0.88, 24), dk, [0, -0.5, 0.3], [-Math.PI / 2, 0, 0], [1, 1.4, 1]);   // cabin floor
  add(g, box(0.5, 0.35, 0.5), mat(0x3a3a44), [0, -0.38, 0.05]);   // seat
  const glass = add(g, sph(1, 32, 20, 0, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [0.9, 0.85, 1.5]);
  add(g, tor(1, 0.03, 6, 40, Math.PI), dk, [0, 0, 0], [Math.PI / 2, 0, 0], [0.9, 1.5, 1]);
  add(g, cyl(0.16, 0.08, 3.2, 12), body, [0, 0.2, -2.6], [Math.PI / 2 - 0.08, 0, 0]);
  add(g, box(0.08, 0.9, 0.5), body, [0, 0.55, -4.1]);
  const tail = new THREE.Group(); tail.position.set(0.12, 0.6, -4.1); g.add(tail); for (const r of [0, Math.PI / 2]) add(tail, box(0.04, 1.4, 0.12), dk, [0, 0, 0], [r, 0, 0]);
  const rotor = new THREE.Group(); rotor.position.set(0, 1.0, 0); g.add(rotor); add(rotor, cyl(0.12, 0.12, 0.3, 10), dk, [0, -0.1, 0]);
  for (let i = 0; i < 4; i++) add(rotor, box(6.4, 0.04, 0.22), dk, [0, 0.05, 0], [0, i * Math.PI / 4, 0]);
  const disc = add(rotor, new THREE.CircleGeometry(3.3, 40), new THREE.MeshBasicMaterial({ color: 0x334, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), [0, 0.06, 0], [-Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) { add(g, box(0.08, 0.08, 2.4), dk, [s * 0.7, -1.05, 0.1]); add(g, box(0.06, 0.4, 0.06), dk, [s * 0.6, -0.85, 0.6]); add(g, box(0.06, 0.4, 0.06), dk, [s * 0.6, -0.85, -0.4]); }
  add(g, box(1.4, 0.3, 0.05), mat(0xffffff), [0, -0.2, -1.2]).visible = false;
  g.userData = { rotor, tail, seat: new THREE.Vector3(0, -0.5, 0.1) };
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}
// cone mountain with snow cap and rock ridges
export function mountain(h = 10, r = 8, seed = 1, snow = 0.32) {
  const g = new THREE.Group(), rr = rng(seed), geo = new THREE.ConeGeometry(r, h, 9, 6); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < h / 2 - 0.01) { const k = 1 + (rr() - 0.5) * 0.28; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } }
  geo.computeVertexNormals();
  add(g, geo, mat(0x7a7068, { rough: 0.95, flat: true }), [0, h / 2, 0]);
  const cap = new THREE.ConeGeometry(r * snow, h * snow, 9, 2); add(g, cap, mat(0xf4f6fa, { rough: 0.8 }), [0, h - h * snow / 2 + 0.02, 0], [0, 0.2, 0], [1.04, 1, 1.04]);
  return g;
}
// thin crack lines on a surface (local XY plane, z = 0.005)
export function cracks(seed = 1, n = 6, len = 1.4, color = 0x2a2420) {
  const g = new THREE.Group(), r = rng(seed), m = mat(color, { rough: 1 });
  for (let i = 0; i < n; i++) { let x = r.range(-1, 1), y = r.range(-1, 1), a = r() * 6.28; for (let k = 0; k < 6; k++) { const L = len * r.range(0.1, 0.25); const nx = x + Math.cos(a) * L, ny = y + Math.sin(a) * L; const s = add(g, box(L, 0.025, 0.01), m, [(x + nx) / 2, (y + ny) / 2, 0.005], [0, 0, a]); a += r.range(-0.7, 0.7); x = nx; y = ny; } }
  return g;
}
// deterministic particle burst: set(age, origin, life)
export function puffs(scene, { n = 40, color = 0xe8e0d0, seed = 3, size = 0.12, spread = 1.2, up = 1, grav = 2.5, emissive = 0 } = {}) {
  const r = rng(seed), M = emissive ? glow(color, emissive) : mat(color, { rough: 1 });
  const list = Array.from({ length: n }, () => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(size * r.range(0.5, 1.4), 1), M); m.castShadow = false; scene.add(m); return { m, v: [r.range(-1, 1) * spread, r.range(0.2, 1) * up * 3, r.range(-1, 1) * spread], s: [r.range(-6, 6), r.range(-6, 6)] }; });
  return { list, set(age, o, life = 1.6, k = 1) { for (const p of list) { const vis = age >= 0 && age < life; p.m.visible = vis; if (!vis) continue; p.m.position.set(o[0] + p.v[0] * age * k, o[1] + (p.v[1] * age - grav * age * age) * k, o[2] + p.v[2] * age * k); p.m.rotation.set(p.s[0] * age, p.s[1] * age, 0); p.m.scale.setScalar(Math.max(0.01, (1 + age / life * 1.2) * k)); } } };
}
// soft dust cloud: big translucent spheres expanding (no textures)
export function dustCloud(parent, { n = 26, seed = 7, color = 0xd8cdb8 } = {}) {
  const r = rng(seed), g = new THREE.Group(); parent.add(g);
  const list = Array.from({ length: n }, () => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 0.6, depthWrite: false })); g.add(m); const a = r() * 6.283; return { m, d: [Math.cos(a), r.range(0.05, 0.6), Math.sin(a)], s: r.range(0.6, 1.3), sp: r.range(0.6, 1.3) }; });
  g.set = (age, R = 1, life = 2.5) => { g.visible = age >= 0 && age < life; if (!g.visible) return; const u = age / life, e = 1 - Math.pow(1 - Math.min(1, age / 0.6), 3);
    for (const p of list) { p.m.position.set(p.d[0] * R * e * p.sp, p.d[1] * R * e * 0.6, p.d[2] * R * e * p.sp); p.m.scale.setScalar(R * 0.35 * p.s * (0.4 + e)); p.m.material.opacity = 0.6 * (1 - smooth(clamp((u - 0.35) / 0.65))); } };
  return g;
}
export function starBackground(scene, { n = 2400, R = 900, seed = 4 } = {}) {
  const r = rng(seed), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, b = Math.acos(r.range(-1, 1)); pos.set([Math.sin(b) * Math.cos(a) * R, Math.cos(b) * R, Math.sin(b) * Math.sin(a) * R], i * 3); const k = r.range(0.35, 1) ** 2; col.set([k, k * 0.95, k], i * 3); }
  const p = glowPoints(pos, col, { size: 3.2, attenuate: false }); p.frustumCulled = false; scene.add(p); return p;
}
// shockwave ring (impact): set(age, pos, R)
export function ring(scene, color = 0xfff2c0) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); scene.add(m);
  m.set = (age, pos, R = 1, life = 0.6, quat = null) => { m.visible = age >= 0 && age < life; if (!m.visible) return; const u = age / life; m.position.set(...pos); if (quat) m.quaternion.copy(quat); m.scale.setScalar(R * (0.2 + 1.8 * easeOutCubic(u))); m.material.opacity = 1 - u; };
  return m;
}
// simple shot table -> camera
export function shotCam(shots, t) { let s = shots[0]; for (const x of shots) if (t >= x.t0 - 1e-6) s = x; const u = clamp((t - s.t0) / (s.t1 - s.t0)); const k = s.ease === 'lin' ? u : s.ease === 'out' ? 1 - (1 - u) * (1 - u) : smooth(u); return { cam: s.b ? mixCam(s.a, s.b, k) : s.a, u, shot: s }; }
// sky gradient as a scene background colour pair -> CanvasTexture (cached per pair)
const _bg = new Map();
export function skyBG(top, bottom) { const k = top + bottom; if (_bg.has(k)) return _bg.get(k); const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; _bg.set(k, t); return t; }
