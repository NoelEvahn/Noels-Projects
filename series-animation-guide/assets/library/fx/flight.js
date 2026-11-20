// Flight FX (ep5 v3, user: "dopamine hits"): the hero heating into a fireball, planets that shatter when he punches through,
// a fire trail for a moving object, and cloud puffs that rush past a POV camera. Geometry + colour only, all deterministic.
import * as THREE from 'three';
import { rng, clamp, mat, add, sph } from '../util.js';
import { glowPoints } from './dunk.js';

const additive = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });

// Fireball shell round a body moving along +Y: a hot cap over the leading fist and flame tongues trailing behind.
// set(k 0..1, t, pos [x,y,z] of the feet, height of the body, dir 1 = moving up)
export function fireShell({ n = 26, seed = 11 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const halo = glowPoints(new Float32Array([0, 0, 0]), new Float32Array([1, 0.5, 0.12]), { size: 2.6 }); g.add(halo);   // soft heat glow round the body
  const halo2 = glowPoints(new Float32Array([0, 0, 0]), new Float32Array([1, 0.85, 0.5]), { size: 1.1 }); g.add(halo2);
  const tongues = Array.from({ length: n }, (_, i) => {
    const col = i % 3 === 0 ? 0xfff0a0 : i % 3 === 1 ? 0xff8a2a : 0xe8301a;
    const m = add(g, new THREE.ConeGeometry(1, 1, 10, 1, true), additive(col, i % 3 === 0 ? 0.5 : 0.42)); m.rotation.x = Math.PI;   // tip down
    return { m, a: (i / n) * Math.PI * 2 + r() * 0.3, rr: r.range(0.42, 0.72), len: r.range(1.4, 3.2), w: r.range(0.07, 0.15), ph: r() * 10 };
  });
  const embers = (() => { const N = 160, p = new Float32Array(N * 3), c = new Float32Array(N * 3), s = []; for (let i = 0; i < N; i++) { s.push([r() * Math.PI * 2, r.range(0.2, 0.9), r(), r.range(0.6, 1.4)]); c.set([1, r.range(0.4, 0.8), r.range(0.1, 0.3)], i * 3); } const pts = glowPoints(p, c, { size: 0.09 }); g.add(pts); return { pts, p, s }; })();
  g.set = (k, t, pos, height = 1.75) => {
    g.visible = k > 0.01; if (!g.visible) return;
    g.position.set(pos[0], pos[1], pos[2]);
    const top = height + 0.55;
    halo.position.y = height * 0.6; halo.material.uniforms.opacity.value = 0.55 * k; halo2.position.y = height * 0.85; halo2.material.uniforms.opacity.value = 0.5 * k;
    for (const q of tongues) {
      const fl = 0.75 + 0.25 * Math.sin(t * 31 + q.ph) + 0.12 * Math.sin(t * 57 + q.ph * 2), L = q.len * fl * k;
      q.m.scale.set(q.w * (0.6 + 0.4 * k), L, q.w * (0.6 + 0.4 * k));
      q.m.position.set(Math.cos(q.a) * q.rr, top * 0.55 - L / 2, Math.sin(q.a) * q.rr);
      q.m.material.opacity = 0.26 * k;
    }
    embers.s.forEach(([a, rr, ph, sp], i) => { const u = (t * sp * 1.6 + ph) % 1; embers.p.set([Math.cos(a + u * 2) * rr * (1 + u), top * 0.4 - u * 4.5 * (0.5 + k), Math.sin(a + u * 2) * rr * (1 + u)], i * 3); });
    embers.pts.geometry.attributes.position.needsUpdate = true; embers.pts.material.uniforms.opacity.value = k;
  };
  g.set(0, 0, [0, 0, 0]);
  return g;
}

// A planet built from shell chunks that burst outward when something punches through it.
// bands: colours by latitude (top -> bottom). set(age): age < 0 whole, age >= 0 bursting (chunks fly out, a hot core flashes and fades).
const shade3 = (c) => new THREE.Color(c).multiplyScalar(0.55).getHex();
export function shatterPlanet(R = 10, { bands = [0xd8b48a, 0xb07a52, 0xf0dcb8, 0xc08a5a, 0xe8c8a0, 0x9a6a48], lon = 12, lat = 8, seed = 21, core = 0xffa040, hit = [0, -1, 0] } = {}) {
  const g = new THREE.Group(), r = rng(seed), chunks = [];
  const hitN = new THREE.Vector3(...hit).normalize();
  for (let j = 0; j < lat; j++) for (let i = 0; i < lon; i++) {
    const ps = (i / lon) * Math.PI * 2, pl = Math.PI * 2 / lon, ts = (j / lat) * Math.PI, tl = Math.PI / lat;
    const geo = new THREE.SphereGeometry(R, 6, 4, ps, pl, ts, tl);
    const col = bands[Math.floor((j / lat) * bands.length * 2) % bands.length];
    const m = add(g, geo, mat(col, { rough: 0.85, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.32 }));   // self-lit a little: reads from any side
    const pc = (ps + pl / 2), tc = (ts + tl / 2), dir = new THREE.Vector3(-Math.cos(pc) * Math.sin(tc), Math.cos(tc), Math.sin(pc) * Math.sin(tc));
    const near = Math.max(0, dir.dot(hitN));   // chunks near the exit point fly fastest
    const rock = add(m, new THREE.DodecahedronGeometry(R * 0.11, 0), mat(shade3(col), { rough: 1, flat: true }), dir.clone().multiplyScalar(R * 0.93), [r() * 3, r() * 3, 0], [1.4, 0.8, 1.2]);   // v3: solid inner rock so chunks have volume
    chunks.push({ m, dir, sp: R * (0.25 + 0.9 * near * near + r() * 0.25), spin: [r.range(-2, 2), r.range(-2, 2), r.range(-2, 2)] });
  }
  // v4 (user): solid 3D rock chunks that make up the planet and blast off (the banded shell shows only before the hit)
  const rocks = [], NR = 110;
  for (let i = 0; i < NR; i++) {
    const y = 1 - (i + 0.5) / NR * 2, rr = Math.sqrt(1 - y * y), ph = i * 2.39996, dir = new THREE.Vector3(Math.cos(ph) * rr, y, Math.sin(ph) * rr);
    const col = bands[Math.floor(((1 - y) / 2) * bands.length * 2) % bands.length], deep = r() < 0.35;
    const m = add(g, new THREE.IcosahedronGeometry(R * r.range(0.26, 0.4), 0), mat(deep ? shade3(col) : col, { rough: 0.9, flat: true, emissive: col, emissiveIntensity: 0.18 }), [0, 0, 0], [0, 0, 0], [r.range(0.8, 1.3), r.range(0.6, 1.0), r.range(0.8, 1.3)]);
    m.visible = false; const near = Math.max(0, dir.dot(hitN));
    rocks.push({ m, home: dir.clone().multiplyScalar(R * r.range(0.62, 0.78)), dir, sp: R * (0.9 + 2.0 * near * near + r() * 0.8), spin: [r.range(-3, 3), r.range(-3, 3), r.range(-3, 3)], q0: [r() * 6, r() * 6, r() * 6] });
  }
  const inner = add(g, sph(R * 0.97, 32, 20), mat(0x6a2a10, { rough: 1, emissive: 0xff5a10, emissiveIntensity: 0.6 }));   // molten inside, seen through the cracks
  const hot = add(g, sph(R * 0.9, 32, 20), additive(core, 0.0));
  // v3 (note #6): a volumetric fireball (thousands of glowing embers in a ball) + a point light so the chunks are lit from inside
  const NF = 2200, fp = new Float32Array(NF * 3), fc = new Float32Array(NF * 3), fs = [];
  for (let i = 0; i < NF; i++) { const d = new THREE.Vector3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize(), k = Math.cbrt(r()); fs.push([d, k, r.range(0.6, 1.4)]); const h = r(); fc.set([1, 0.35 + 0.5 * h, 0.08 + 0.25 * h * h], i * 3); }
  const fire = glowPoints(fp, fc, { size: R * 0.09 }); g.add(fire);
  const light = new THREE.PointLight(0xffa050, 0, R * 8, 1.2); g.add(light);
  g.set = (age) => {
    const a = Math.max(0, age), live = age >= 0;
    for (const k of rocks) { k.m.visible = live; if (!live) continue; k.m.position.copy(k.home).addScaledVector(k.dir, k.sp * a * (1 + a * 0.25)); k.m.rotation.set(k.q0[0] + k.spin[0] * a, k.q0[1] + k.spin[1] * a, k.q0[2] + k.spin[2] * a); }
    for (const c of chunks) c.m.visible = !live;
    for (const c of chunks) { c.m.position.copy(c.dir).multiplyScalar(live ? c.sp * a * (1 + a * 0.3) : 0); c.m.rotation.set(c.spin[0] * a, c.spin[1] * a, c.spin[2] * a); }
    inner.visible = !live || a < 0.35; inner.scale.setScalar(live ? Math.max(0.01, 1 - a * 2.4) : 1);
    fire.visible = live && a < 2.2; if (fire.visible) { fs.forEach(([d, k, sp], i) => { const rr = R * k * (0.3 + 1.6 * (1 - Math.exp(-a * 2.2 * sp))); fp.set([d.x * rr, d.y * rr, d.z * rr], i * 3); }); fire.geometry.attributes.position.needsUpdate = true; fire.material.uniforms.opacity.value = Math.exp(-a * 1.6); }
    light.intensity = live ? 4000 * Math.exp(-a * 2.5) : 0;
    hot.visible = live && a < 0.8; hot.scale.setScalar(0.6 + a * 0.9); hot.material.opacity = live ? 0.85 * Math.exp(-a * 5) : 0;
  };
  g.set(-1); g.userData.R = R;
  return g;
}

// Fire trail behind a moving object. set(samples [[x,y,z] newest first]) – the caller samples the object's own path at t, t-dt, ...
export function fireTrail(n = 36, { size = 0.16 } = {}) {
  const p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = i / (n - 1); c.set([1, Math.max(0.15, 0.95 - u * 0.9), Math.max(0, 0.55 - u * 1.4)], i * 3); }
  const pts = glowPoints(p, c, { size }); pts.renderOrder = 5;
  const outer = glowPoints(new Float32Array(n * 3), new Float32Array(n * 3).map((_, i) => (i % 3 === 0 ? 0.9 : i % 3 === 1 ? 0.25 : 0.05)), { size: size * 2.2 });
  const g = new THREE.Group(); g.add(outer, pts);
  g.set = (samples, k = 1) => {
    g.visible = k > 0.01; for (let i = 0; i < n; i++) { const s = samples[Math.min(i, samples.length - 1)]; p.set(s, i * 3); outer.geometry.attributes.position.array.set(s, i * 3); }
    pts.geometry.attributes.position.needsUpdate = outer.geometry.attributes.position.needsUpdate = true; pts.material.uniforms.opacity.value = k; outer.material.uniforms.opacity.value = 0.5 * k;
  };
  return g;
}

// Clouds rushing at a camera that looks along +Y (POV going up). set(t, camPos, speed, k): puffs stream down past the lens.
export function cloudRush({ n = 18, seed = 7, span = 80, R = 16 } = {}) {
  const g = new THREE.Group(), r = rng(seed), puffs = [];
  for (let i = 0; i < n; i++) {
    const c = new THREE.Group(); g.add(c); const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xdfeeff, emissiveIntensity: 0.35, transparent: true, opacity: 0.95 });   // own material (mat() caches)
    for (let k = 0; k < 5; k++) add(c, sph(r.range(0.8, 1.6), 12, 8), m, [r.range(-1.6, 1.6), r.range(-0.4, 0.4), r.range(-1.6, 1.6)]);
    puffs.push({ c, m, a: r() * Math.PI * 2, rr: r.range(5, R), ph: r() * span, s: r.range(0.8, 1.6) });
  }
  g.set = (t, o, speed = 20, k = 1) => {
    g.visible = k > 0.01; if (!g.visible) return;
    for (const q of puffs) { const y = span - ((t * speed + q.ph) % span); q.c.position.set(o[0] + Math.cos(q.a) * q.rr, o[1] + y - 4, o[2] + Math.sin(q.a) * q.rr); q.c.scale.set(q.s, q.s * (1 + speed * 0.03), q.s); q.m.opacity = 0.95 * k * clamp(y / 6); }
  };
  return g;
}
