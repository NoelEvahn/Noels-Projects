// MOTION pack: blasts and impacts. explosion, shockwave (ground / air), dustBurst, rubbleBurst, glassShatter, sparks, groundCracks, crater,
// meteor, laserBeam. All one-shots: fx.set(age) is a pure function of seconds-since-start (age < 0 = not started).
import * as THREE from 'three';
import {
  rng, clamp, smooth, easeOutCubic, easeOutBack, TAU, ph, pulse, fract, hash, makeRamp, pool, glowPool, ballistic, finish,
  SPH, BOX, ROCK, spindleGeo, alignX, lambertWhite, basicWhite, glowBasic, decalMat, fresnelMat, bandMat,
} from './motion_core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const unitDir = (r, ymin = -1) => { const y = r.range(ymin, 1), th = r() * TAU, q = Math.sqrt(1 - y * y); return [Math.cos(th) * q, y, Math.sin(th) * q]; };
const rockMat = () => new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

// ============================================================ explosion
// explosion({radius=3, seed, light=true, smoke=true, debris=true}) -> group; .set(age). radius = final fireball radius in metres.
// Layers: white flash, rising fireball (white-yellow -> orange -> red -> char), mushroom smoke, bouncing debris, ground shock ring, dust ring, scorch mark, point light.
export function explosion({ radius = 3, seed = 1, light = true, smoke = true, debris = true, scorch = true } = {}) {
  const g = new THREE.Group(), r = rng(seed), R = radius;
  const NF = 22, NS = 34, ND = 36, NU = 16;
  const F = [], S = [], D = [], U = [];
  for (let i = 0; i < NF; i++) { const d = unitDir(r, -0.1); F.push({ d, f: r.range(0.3, 1), s: r.range(0.33, 0.6), delay: r() * 0.1, life: r.range(0.75, 1.25) }); }
  for (let i = 0; i < NS; i++) { const d = unitDir(r, -0.05); S.push({ d, f: r.range(0.3, 1), s: r.range(0.2, 0.5), delay: 0.25 + r() * 0.5, life: r.range(1.9, 2.8), h: r() }); }
  for (let i = 0; i < ND; i++) { const az = r() * TAU, el = r.range(0.45, 1.35), sp = r.range(0.45, 1.1); D.push({ az, el, sp, sc: [r.range(0.6, 1.4), r.range(0.5, 1.1), r.range(0.6, 1.4)], size: r.range(0.04, 0.1), w: [r.range(-9, 9), r.range(-9, 9), r.range(-9, 9)], col: r.pick([0x3a3028, 0x56452f, 0x2c2c30, 0x6b5a45, 0x2c2c30]), hot: r() < 0.3 }); }
  for (let i = 0; i < NU; i++) U.push({ a: (i + r()) / NU * TAU, s: r.range(0.55, 1), v: r.range(0.8, 1.15) });
  const fire = pool(SPH(), basicWhite(), NF), fireIn = pool(SPH(), basicWhite(), NF), smk = pool(SPH(), lambertWhite(), NS), deb = pool(ROCK(), rockMat(), ND), dust = pool(SPH(), lambertWhite(), NU);
  const glow = glowPool(2, 'soft');
  g.add(smk, dust, deb, fire, fireIn, glow);
  const ringM = glowBasic({ color: 0xffe0a8 }), ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 72), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.04; g.add(ring);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 72, 1, true), bandMat(0xffc880, { k: 1.4 })); g.add(lip);
  const sc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), decalMat(0x16110e, 0.4)); sc.rotation.x = -Math.PI / 2; sc.position.y = 0.012; g.add(sc); sc.visible = scorch;
  let pl = null; if (light) { pl = new THREE.PointLight(0xff9a45, 0, 0, 2); pl.position.y = R * 0.8; g.add(pl); }
  const heat = makeRamp([[0, [3.2, 3.0, 2.2]], [0.18, [3, 1.9, 0.5]], [0.45, [2.2, 0.85, 0.12]], [0.75, [0.9, 0.22, 0.05]], [1, [0.16, 0.07, 0.05]]]);
  const smokeC = makeRamp([[0, 0x8a5a40], [0.25, 0x76707e], [0.7, 0xa0a0ac], [1, 0xc8c8d2]]);
  const heatIn = makeRamp([[0, [3.4, 3.2, 2.6]], [0.3, [3.2, 2.4, 0.9]], [0.6, [2.4, 1.2, 0.25]], [1, [0.5, 0.18, 0.06]]]);
  const c = new THREE.Color(), hot = new THREE.Color();
  function set(age) {
    g.visible = true;
    // fireball
    for (let i = 0; i < NF; i++) {
      const p = F[i], a = age - p.delay, k = a / p.life;
      if (a < 0 || k > 1) { fire.hide(i); fireIn.hide(i); continue; }
      const spread = R * 0.95 * easeOutCubic(clamp(a / 0.5)) * p.f, cy = R * 0.5 + R * 0.75 * smooth(a / 1.6);
      const sz = R * p.s * (0.45 + 0.55 * easeOutCubic(clamp(a / 0.3))) * (1 - smooth((k - 0.5) / 0.5));
      const py = Math.max(p.d[1] * spread + cy, sz * 0.4); fire.put(i, p.d[0] * spread, py, p.d[2] * spread, sz); heat(k, c); fire.tint(i, c);
      fireIn.put(i, p.d[0] * spread * 0.92, py + sz * 0.12, p.d[2] * spread * 0.92 + sz * 0.1, sz * 0.66); heatIn(clamp(k * 1.1), c); fireIn.tint(i, c);
    }
    // smoke
    for (let i = 0; i < NS; i++) {
      const p = S[i], a = age - p.delay, k = a / p.life;
      if (!smoke || a < 0 || k > 1) { smk.hide(i); continue; }
      const e = easeOutCubic(clamp(a / 1.4)), spread = R * (0.35 + 0.75 * e) * p.f, lift = R * (0.55 + (0.3 + 1.6 * p.h) * easeOutCubic(clamp(a / 2.4)));
      const sz = R * p.s * (0.35 + 0.85 * easeOutCubic(clamp(a / 1.0))) * (1 - smooth((k - 0.72) / 0.28));
      smk.put(i, p.d[0] * spread, Math.max(lift + p.d[1] * spread * 0.55, sz * 0.5), p.d[2] * spread, sz); smokeC(k, c); smk.tint(i, c);
    }
    // debris
    for (let i = 0; i < ND; i++) {
      const p = D[i], a = age - 0.02;
      if (!debris || a < 0 || a > 4.6) { deb.hide(i); continue; }
      const sp = 12 * Math.sqrt(R / 3) * p.sp, ce = Math.cos(p.el);
      const b = ballistic(0, R * 0.25, 0, Math.cos(p.az) * ce * sp, Math.sin(p.el) * sp, Math.sin(p.az) * ce * sp, a, { g: 9.8, floor: p.size * R * 0.5, e: 0.38, fric: 0.5 });
      const spin = b.rest ? b.tRest : a, s = R * p.size * (1 - smooth((a - 3.8) / 0.8));
      deb.put(i, b.x, b.y, b.z, s * p.sc[0], p.w[0] * spin, p.w[1] * spin, p.w[2] * spin, s * p.sc[1], s * p.sc[2]);
      if (p.hot && a < 1.6) { hot.setRGB(2.2 * (1 - a / 1.6) + 0.25, 0.7 * (1 - a / 1.6) + 0.2, 0.1); deb.tint(i, hot); } else deb.tint(i, c.set(p.col));
    }
    // ground dust ring
    for (let i = 0; i < NU; i++) {
      const p = U[i], a = age - 0.05, k = a / 1.8;
      if (!smoke || a < 0 || k > 1) { dust.hide(i); continue; }
      const rad = R * (0.5 + 2.3 * easeOutCubic(clamp(a / 1.1))) * p.v, sz = R * 0.2 * p.s * (0.4 + 0.8 * easeOutCubic(clamp(a / 0.6))) * (1 - smooth((k - 0.55) / 0.45));
      dust.put(i, Math.cos(p.a) * rad, sz * 0.7 + R * 0.12 * easeOutCubic(clamp(a / 1.2)), Math.sin(p.a) * rad, sz); dust.tint(i, c.set(0xb89c78).multiplyScalar(0.8 + 0.3 * hash(i)));
    }
    // flash + halo
    const fl = pulse(age, 0.035, 0.28), halo = pulse(age, 0.1, 0.9);
    glow.dot(0, 0, R * 0.6, 0, R * 2.1 * (0.5 + fl), 2.0 * fl, 1.5 * fl, 0.8 * fl);
    glow.dot(1, 0, R * 0.7 + R * 0.6 * smooth(age / 1.4), 0, R * 2.0, 0.6 * halo, 0.24 * halo, 0.04 * halo);
    // shock ring / lip
    const rk = easeOutCubic(clamp(age / 0.85)), rr = R * (0.8 + 2.8 * rk), fade = (1 - clamp(age / 0.85));
    ring.visible = lip.visible = age > 0 && age < 0.9; ring.scale.set(rr, rr, rr * 1); ringM.opacity = fade * fade;
    lip.scale.set(rr, R * 0.5 * (1 - 0.7 * rk), rr); lip.position.y = lip.scale.y / 2; lip.material.uniforms.uA.value = 0.9 * fade;
    sc.scale.setScalar(R * 1.25 * easeOutCubic(clamp(age / 0.4))); sc.visible = scorch && age > 0;
    if (pl) { pl.intensity = 140 * R * (fl * 0.8 + halo * 0.45); pl.position.y = R * (0.6 + 0.5 * smooth(age / 1.4)); }
    if (age < 0) { g.visible = false; return; }
    fire.flush(); fireIn.flush(); smk.flush(); deb.flush(); dust.flush(); glow.flush();
  }
  return finish(g, set, { duration: 3.6, sizeM: R * 2, extra: {} });
}

// ============================================================ shockwave
// shockwave({mode:'ground'|'air', radius=8, color, height, axis, dust}) .set(age). ground: standing bright lip + floor ring + dust ring. air: fresnel bubble + 3 staggered rings (axis = ring normal).
export function shockwave({ mode = 'ground', radius = 8, color = 0xfff4dc, height = 1.2, axis = [0, 1, 0], dust = true, dur = 1.1, seed = 4 } = {}) {
  const g = new THREE.Group(), R = radius, r = rng(seed);
  const col = new THREE.Color(color);
  if (mode === 'ground') {
    const lipM = bandMat(color, { k: 1.2, additive: false }), lip = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96, 1, true), lipM); g.add(lip);
    const ringM = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }), ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.04; g.add(ring);
    const diskM = new THREE.MeshBasicMaterial({ color: 0xb9a583, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), disk = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 96), diskM); disk.rotation.x = -Math.PI / 2; disk.position.y = 0.025; g.add(disk);
    const ND = 44, P = Array.from({ length: ND }, (_, i) => ({ a: (i + r() * 0.9) / ND * TAU, s: r.range(0.5, 1.7), v: r.range(0.82, 1.02), up: r() }));
    const dp = pool(SPH(), lambertWhite(), ND); g.add(dp);
    const c = new THREE.Color();
    const set = (age) => {
      const k = clamp(age / dur), e = 1 - Math.pow(1 - k, 3), rr = Math.max(0.01, R * e), fade = 1 - k * k;
      g.visible = age >= 0 && age < dur + 0.8;
      lip.scale.set(rr, height * (0.3 + 0.7 * Math.sin(Math.min(1, k * 2.2) * Math.PI / 2)) * (1 - 0.55 * k), rr); lip.position.y = lip.scale.y / 2; lipM.uniforms.uA.value = fade * 0.95;
      ring.scale.set(rr, rr, rr); ringM.opacity = fade; disk.scale.setScalar(rr); diskM.opacity = 0.45 * fade;
      for (let i = 0; i < ND; i++) {
        const p = P[i], a = age - 0.03;
        if (!dust || a < 0 || a > dur + 0.7) { dp.hide(i); continue; }
        const kk = a / (dur + 0.5), rad = rr * p.v * 0.98, sz = R * 0.05 * p.s * (0.5 + easeOutCubic(clamp(a / 0.4))) * (1 - smooth((kk - 0.6) / 0.4));
        dp.put(i, Math.cos(p.a) * rad, sz * 0.8 + p.up * 0.5 * easeOutCubic(clamp(a / 0.8)), Math.sin(p.a) * rad, sz); dp.tint(i, c.set(0xc9b08a).multiplyScalar(0.85 + 0.25 * hash(i + 3)));
      }
      dp.flush();
    };
    return finish(g, set, { duration: dur + 0.8, sizeM: R * 2 });
  }
  // air
  const a3 = new THREE.Vector3(...axis).normalize(), qa = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), a3); g.quaternion.copy(qa);
  const shellM = fresnelMat(color, { power: 2.6, base: 0.0 }), shell = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), shellM); g.add(shell);
  const rings = [0, 0.07, 0.15].map((d, i) => { const m = glowBasic({ color }), t = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03 - i * 0.005, 8, 96), m); t.rotation.x = Math.PI / 2; g.add(t); return { t, m, d, w: 1 - i * 0.18 }; });
  const set = (age) => {
    g.visible = age >= 0 && age < dur + 0.4;
    for (const rg of rings) {
      const a = age - rg.d, k = clamp(a / dur), e = 1 - Math.pow(1 - k, 3), rr = Math.max(0.01, R * e * rg.w);
      rg.t.visible = a > 0 && k < 1; rg.t.scale.set(rr, rr, rr * 0.9); rg.t.scale.z = rr; rg.m.opacity = (1 - k) * (1 - k);
      rg.t.scale.set(rr, rr, rr * 1);
    }
    const k = clamp(age / dur), e = 1 - Math.pow(1 - k, 3);
    shell.scale.set(R * e * 0.9, R * e * 0.45, R * e * 0.9); shell.visible = age > 0 && k < 1; shellM.uniforms.uA.value = (1 - k) * 0.8;
  };
  return finish(g, set, { duration: dur + 0.4, sizeM: R * 2 });
}

// ============================================================ dustBurst
// dustBurst({radius=2.5, count=26, color, rise=1, life=1.6, seed}) .set(age). Opaque lit puffs that grow, drift and shrink away; capped size so it never fills the frame.
export function dustBurst({ radius = 2.5, count = 26, color = 0xcdb08a, rise = 1, life = 1.6, seed = 2 } = {}) {
  const g = new THREE.Group(), r = rng(seed), R = radius;
  const P = Array.from({ length: count }, (_, i) => ({ a: (i + r()) / count * TAU, d: r.range(0.45, 1), s: r.range(0.14, 0.3), rise: r.range(0.1, 0.55), delay: r() * 0.12, tone: r.range(0.78, 1.15), up: r() < 0.3 }));
  const pl = pool(SPH(), lambertWhite(), count); g.add(pl); const c = new THREE.Color(), base = new THREE.Color(color);
  const set = (age) => {
    for (let i = 0; i < count; i++) {
      const p = P[i], a = age - p.delay, k = a / life;
      if (a < 0 || k > 1) { pl.hide(i); continue; }
      const dd = R * p.d * (p.up ? 0.25 : 1) * easeOutCubic(clamp(a / (life * 0.75)));
      const sz = R * p.s * (0.3 + 0.95 * easeOutCubic(clamp(a / (life * 0.45)))) * (1 - smooth((k - 0.5) / 0.5));
      pl.put(i, Math.cos(p.a) * dd, sz * 0.55 + R * p.rise * rise * 0.5 * (p.up ? 2.2 : 1) * easeOutCubic(clamp(a / life)), Math.sin(p.a) * dd, sz);
      pl.tint(i, c.copy(base).multiplyScalar(p.tone * (1 - 0.18 * k)));
    }
    pl.flush();
  };
  return finish(g, set, { duration: life + 0.2, sizeM: R * 2 });
}

// ============================================================ rubbleBurst
// rubbleBurst({count=48, power=7, size=0.18, origin, colors, spread, floor=0, life=Infinity, seed}) .set(age). Chunky flat-shaded rocks, closed-form gravity and bounce, they tumble then come to rest.
export function rubbleBurst({ count = 48, power = 7, size = 0.18, origin = [0, 0.3, 0], colors = [0x7a7068, 0x5d554e, 0x9a8c7a, 0x6b4f3a, 0x4a4540], spread = 1, floor = 0, life = Infinity, seed = 5, up = 0.9 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const P = Array.from({ length: count }, () => ({ az: r() * TAU, el: r.range(0.5, 1.4) * up + 0.1, sp: r.range(0.4, 1.15), s: size * r.range(0.45, 1.3), sc: [r.range(0.7, 1.4), r.range(0.55, 1.05), r.range(0.7, 1.3)], w: [r.range(-8, 8), r.range(-8, 8), r.range(-8, 8)], col: new THREE.Color(r.pick(colors)).multiplyScalar(r.range(0.85, 1.15)), jx: r.range(-1, 1) * 0.3 * spread, jz: r.range(-1, 1) * 0.3 * spread }));
  const pl = pool(ROCK(), rockMat(), count, { cast: true }); g.add(pl);
  P.forEach((p, i) => pl.tint(i, p.col));
  const set = (age) => {
    for (let i = 0; i < count; i++) {
      const p = P[i];
      if (age < 0) { pl.hide(i); continue; }
      const ce = Math.cos(p.el) * spread, sp = power * p.sp;
      const b = ballistic(origin[0] + p.jx, origin[1], origin[2] + p.jz, Math.cos(p.az) * ce * sp, Math.sin(p.el) * sp, Math.sin(p.az) * ce * sp, age, { floor: floor + p.s * 0.45, e: 0.36, fric: 0.5 });
      const spin = b.rest ? b.tRest : age, s = p.s * (isFinite(life) ? 1 - smooth((age - life) / 0.6) : 1);
      pl.put(i, b.x, b.y, b.z, s * p.sc[0], p.w[0] * spin, p.w[1] * spin, p.w[2] * spin, s * p.sc[1], s * p.sc[2]);
    }
    pl.flush();
  };
  return finish(g, set, { duration: 3, sizeM: power * 0.8 });
}

// ============================================================ glassShatter
// glassShatter({width=2, height=2.6, impact:[x,y], push=[0,0,1], floor, shards, seed}) .set(age). age < 0: intact pane (hairline gaps show the crack pattern); age >= 0: shards fly, spin, glint, fall.
export function glassShatter({ width = 2, height = 2.6, impact = [0.15, 0.1], push = 1, floor = null, rays = 11, rings = 3, seed = 6, color = 0xbfe6ff, thickness = 0.03 } = {}) {
  const g = new THREE.Group(), r = rng(seed), W = width, H = height, ix = impact[0], iy = impact[1];
  const exit = (th) => { const c = Math.cos(th), s = Math.sin(th); const tx = c > 1e-6 ? (W / 2 - ix) / c : c < -1e-6 ? (-W / 2 - ix) / c : 1e9, ty = s > 1e-6 ? (H / 2 - iy) / s : s < -1e-6 ? (-H / 2 - iy) / s : 1e9; return Math.min(tx, ty); };
  const angs = [Math.atan2(H / 2 - iy, W / 2 - ix), Math.atan2(H / 2 - iy, -W / 2 - ix), Math.atan2(-H / 2 - iy, -W / 2 - ix), Math.atan2(-H / 2 - iy, W / 2 - ix)].map((a) => (a + TAU) % TAU);
  for (let i = 0; i < rays; i++) angs.push((i + r.range(0.1, 0.9)) / rays * TAU);
  angs.sort((a, b) => a - b); angs.push(angs[0] + TAU);
  const fr = [0, 0.1 + r() * 0.04]; for (let j = 1; j <= rings; j++) fr.push(0.2 + 0.8 * Math.pow(j / rings, 1.5) * (j === rings ? 1 : r.range(0.85, 1.05))); fr[fr.length - 1] = 1;
  const pt = (k, j) => { const th = angs[k], e = exit(th) * fr[j]; return [ix + Math.cos(th) * e, iy + Math.sin(th) * e]; };
  const gm = new THREE.MeshStandardMaterial({ color, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, envMapIntensity: 1.6 });
  const gm2 = new THREE.MeshStandardMaterial({ color: 0xe8f8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.7, side: THREE.DoubleSide, envMapIntensity: 1.6 });
  const shards = [];
  for (let k = 0; k < angs.length - 1; k++) for (let j = 0; j < fr.length - 1; j++) {
    const pts = j === 0 ? [[ix, iy], pt(k, 1), pt(k + 1, 1)] : [pt(k, j), pt(k, j + 1), pt(k + 1, j + 1), pt(k + 1, j)];
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2((p[0] - cx) * 0.985, (p[1] - cy) * 0.985)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: thickness, bevelEnabled: false }); geo.translate(0, 0, -thickness / 2);
    const m = new THREE.Mesh(geo, (k + j) % 3 === 0 ? gm2 : gm); m.position.set(cx, cy, 0); g.add(m);
    const dx = cx - ix, dy = cy - iy, dist = Math.hypot(dx, dy) + 0.05;
    shards.push({ m, cx, cy, dx: dx / dist, dy: dy / dist, dist, v: (2.2 / (0.55 + dist)) * r.range(0.7, 1.2), vz: push * r.range(1.5, 4.5) * (1 - 0.3 * Math.min(1, dist / 1.5)), w: [r.range(-7, 7), r.range(-7, 7), r.range(-5, 5)], ph: r() * 6, delay: dist * 0.012 });
  }
  const glints = glowPool(18, 'star'); g.add(glints);
  const set = (age) => {
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i], m = s.m;
      if (age < 0) { m.position.set(s.cx, s.cy, 0); m.rotation.set(0, 0, 0); m.scale.setScalar(1); continue; }
      const a = Math.max(0, age - s.delay);
      let y = s.cy + s.dy * s.v * a - 0.5 * 9.8 * a * a * 0.6, x = s.cx + s.dx * s.v * a, z = s.vz * a * (1 - 0.15 * a);
      let sc = 1;
      if (floor !== null && y < floor) { sc = 1 - smooth((floor - y) / 0.25); y = Math.max(y, floor - 0.25); }
      m.position.set(x, y, z); m.rotation.set(s.w[0] * a, s.w[1] * a, s.w[2] * a); m.scale.setScalar(Math.max(1e-4, sc) * (1 - smooth((a - 2.6) / 0.6)));
    }
    for (let i = 0; i < 18; i++) {
      const s = shards[(i * 3) % shards.length], gl = age < 0 ? 0 : Math.pow(Math.max(0, Math.sin(age * 9 + s.ph * 2)), 6) * (1 - smooth((age - 0.8) / 1.2));
      if (gl < 0.02) glints.hide(i); else glints.dot(i, s.m.position.x, s.m.position.y, s.m.position.z + 0.02, 0.1 + 0.22 * gl, 2 * gl, 2 * gl, 2 * gl);
    }
    glints.flush();
  };
  return finish(g, set, { duration: 3, sizeM: Math.max(W, H) });
}

// ============================================================ sparks
// sparks({count=60, power=6, dir=[0,1,0], spread=0.8, size=0.03, color:'orange'|'blue'|'white', loop=false, life=1, floor=null}) .set(age)/.update(t).
// Streaks stretch along their velocity, cool from white-yellow to red and shrink; optional floor bounce; loop=true = endless grinder / welding sparks.
export function sparks({ count = 60, power = 6, dir = [0, 1, 0], spread = 0.8, size = 0.03, color = 'orange', loop = false, life = 1, floor = null, gravity = 9.8, seed = 9, drag = 0.4 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const axis = new THREE.Vector3(...dir).normalize(), q0 = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), axis);
  const P = Array.from({ length: count }, (_, i) => { const th = r() * TAU, el = Math.acos(1 - r() * (1 - Math.cos(spread))); const v = V(Math.sin(el) * Math.cos(th), Math.cos(el), Math.sin(el) * Math.sin(th)).applyQuaternion(q0); return { v, sp: power * r.range(0.35, 1.1), delay: loop ? 0 : r() * 0.06, life: life * r.range(0.55, 1), ph: r() }; });
  const st = pool(spindleGeo(), basicWhite(), count), gl = glowPool(count, 'soft'); g.add(st, gl);
  const ramp = color === 'blue' ? makeRamp([[0, [2.6, 3, 3.4]], [0.4, [0.7, 1.5, 3]], [1, [0.05, 0.1, 0.5]]]) : color === 'white' ? makeRamp([[0, [3, 3, 3]], [0.5, [1.6, 1.6, 1.7]], [1, [0.3, 0.3, 0.35]]]) : makeRamp([[0, [3.2, 2.8, 1.6]], [0.3, [3, 1.6, 0.3]], [0.7, [1.6, 0.4, 0.05]], [1, [0.3, 0.05, 0.02]]]);
  const c = new THREE.Color(), v = new THREE.Vector3(), q = new THREE.Quaternion(), pa = new THREE.Vector3();
  const opts = { g: gravity, floor: floor ?? -1e4, e: 0.35, fric: 0.3, drag };
  const set = (age) => {
    for (let i = 0; i < count; i++) {
      const p = P[i]; let a = loop ? fract(age / p.life + p.ph) * p.life : age - p.delay;
      if (a < 0 || a > p.life) { st.hide(i); gl.hide(i); continue; }
      const b = ballistic(0, 0, 0, p.v.x * p.sp, p.v.y * p.sp, p.v.z * p.sp, a, opts); pa.set(b.x, b.y, b.z);
      const b2 = ballistic(0, 0, 0, p.v.x * p.sp, p.v.y * p.sp, p.v.z * p.sp, Math.max(0, a - 0.03), opts); v.set(pa.x - b2.x, pa.y - b2.y, pa.z - b2.z);
      const len = v.length(); if (len < 1e-5) v.set(1, 0, 0); else v.divideScalar(len);
      const k = a / p.life, sc = (1 - k * k), L = Math.min(1.2, Math.max(size * 4, len * 3.2)) * sc;
      alignX(q, v); st.putQ(i, pa.x - v.x * L * 0.5, pa.y - v.y * L * 0.5, pa.z - v.z * L * 0.5, q, L, size * sc * 1.2, size * sc * 1.2);
      ramp(k, c); st.tint(i, c); gl.dot(i, pa.x, pa.y, pa.z, size * 4 * sc, c.r * 0.35, c.g * 0.35, c.b * 0.35);
    }
    st.flush(); gl.flush();
  };
  return finish(g, set, { loop, duration: life + 0.1, sizeM: power * 0.6 });
}

// ============================================================ groundCracks
// groundCracks({radius=5, arms=9, glow=false, color, lava, seed}) .set(age): cracks spread outward along jagged branching paths (flat decals on y=0.012). glow=true adds pulsing lava cores.
export function groundCracks({ radius = 5, arms = 9, glow = false, color = 0x2a1f1a, lava = 0xff7a1a, seed = 8, dur = 0.7 } = {}) {
  const g = new THREE.Group(), r = rng(seed), R = radius;
  const segs = [];
  const walk = (x, z, ang, len, n, w0, d0, depth) => {
    let px = x, pz = z, d = d0; const step = len / n;
    for (let i = 0; i < n; i++) {
      ang += r.range(-0.38, 0.38); const nx = px + Math.cos(ang) * step, nz = pz + Math.sin(ang) * step, w = Math.max(0.018 * R / 5, w0 * (1 - i / n * 0.8));
      segs.push({ x1: px, z1: pz, x2: nx, z2: nz, w, d1: d, d2: d + step, len: step, ang });
      px = nx; pz = nz; d += step;
      if (depth < 2 && i > 1 && i < n - 1 && r() < 0.28) walk(px, pz, ang + r.sign() * r.range(0.5, 1.0), len * r.range(0.25, 0.4), Math.max(3, Math.floor(n * 0.4)), w * 0.6, d, depth + 1);
    }
  };
  for (let m = 0; m < arms; m++) walk(0, 0, (m + r.range(-0.3, 0.3)) / arms * TAU, R * r.range(0.65, 1), 12, 0.13 * R / 5, 0, 0);
  const N = segs.length, maxD = Math.max(...segs.map((s) => s.d2));
  const mkMat = (extraOffset) => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2 - extraOffset, polygonOffsetUnits: -2 - extraOffset, toneMapped: true }); return m; };
  const dark = pool(BOX(), mkMat(0), N), core = glow ? pool(BOX(), mkMat(2), N) : null; g.add(dark); if (core) g.add(core);
  const dc = new THREE.Color(color), lc = new THREE.Color(lava);
  for (let i = 0; i < N; i++) dark.tint(i, dc);
  const set = (age) => {
    const k = easeOutCubic(clamp(age / dur)) * maxD * 1.02, pulseK = 0.75 + 0.25 * Math.sin(age * 7);
    for (let i = 0; i < N; i++) {
      const s = segs[i], vis = clamp(k - s.d1, 0, s.len);
      if (age < 0 || vis <= 0) { dark.hide(i); core?.hide(i); continue; }
      const mx = s.x1 + Math.cos(s.ang) * vis / 2, mz = s.z1 + Math.sin(s.ang) * vis / 2;
      dark.put(i, mx, 0.012, mz, vis + s.w * 0.4, 0, -s.ang, 0, 0.004, s.w);
      if (core) { core.put(i, mx, 0.014, mz, vis + s.w * 0.1, 0, -s.ang, 0, 0.004, s.w * 0.45); core.tint(i, lc.r * 2.2 * pulseK, lc.g * 1.6 * pulseK, lc.b * 1.2 * pulseK); }
    }
    dark.flush(); core?.flush();
  };
  return finish(g, set, { duration: dur, sizeM: R * 2 });
}

// ============================================================ crater
// crater({radius=3, rimHeight=0.5, seed}) .set(age): thump-in with overshoot, glowing hot floor that cools, ejecta rocks, rising wisps. The crater is a raised rim + scorched
// floor sitting ON the ground plane (a flat ground can not be dug), so it reads as a bowl from any 3/4 camera.
export function crater({ radius = 3, rimHeight = 0.55, seed = 10, rocks = 16 } = {}) {
  const g = new THREE.Group(), r = rng(seed), R = radius;
  const prof = [[0, 0.05], [0.3, 0.05], [0.52, 0.16], [0.78, 0.6], [0.93, 0.97], [1.0, 1.0], [1.1, 0.88], [1.32, 0.42], [1.62, 0.14], [2.0, 0.012]];
  const sp = new THREE.SplineCurve(prof.map(([a, b]) => new THREE.Vector2(a, b))), pts = sp.getPoints(36).map((p) => new THREE.Vector2(Math.max(0, p.x), Math.max(0.006, p.y)));
  const geo = new THREE.LatheGeometry(pts, 64), pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const ph1 = r() * 6, ph2 = r() * 6, ph3 = r() * 6;
  const cFloor = new THREE.Color(0x24190f), cWall = new THREE.Color(0x5a3c24), cRim = new THREE.Color(0x8c6a42), cOut = new THREE.Color(0x9a7a4c), cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), th = Math.atan2(z, x), rr = Math.hypot(x, z);
    const n1 = Math.sin(3 * th + ph1) * 0.5 + Math.sin(5 * th + ph2) * 0.3 + Math.sin(9 * th + ph3) * 0.2;
    const sx = 1 + 0.07 * n1, sy = 1 + 0.25 * Math.sin(4 * th + ph2);
    pos.setXYZ(i, x * sx, y * (rr > 0.3 ? sy : 1), z * sx);
    const t = rr; if (t < 0.55) cc.copy(cFloor).lerp(cWall, t / 0.55); else if (t < 1.0) cc.copy(cWall).lerp(cRim, (t - 0.55) / 0.45); else cc.copy(cRim).lerp(cOut, clamp((t - 1) / 1.0));
    col.set([cc.r, cc.g, cc.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); mesh.receiveShadow = true; g.add(mesh);
  const glow = glowPool(1, 'soft'); glow.position.y = 0.08; g.add(glow);
  const heatM = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), glowBasic({ color: 0xff6a18, opacity: 0.8 })); heatM.rotation.x = -Math.PI / 2; heatM.position.y = 0.09; g.add(heatM);
  const RK = Array.from({ length: rocks }, (_, i) => ({ a: (i + r()) / rocks * TAU, d: r.range(0.95, 1.9), s: r.range(0.1, 0.28), sc: [r.range(0.7, 1.4), r.range(0.6, 1), r.range(0.7, 1.3)], w: [r.range(0, 6), r.range(0, 6), r.range(0, 6)] }));
  const rk = pool(ROCK(), rockMat(), rocks, { cast: true }); g.add(rk); const rc = new THREE.Color();
  RK.forEach((p, i) => rk.tint(i, rc.set(i % 3 === 0 ? 0x3a2a1c : 0x7a5a3a).multiplyScalar(0.9 + hash(i) * 0.3)));
  const wisps = pool(SPH(), lambertWhite(), 7); g.add(wisps);
  const set = (age) => {
    g.visible = age >= 0;
    const k = ph(age, 0, 0.32), s = easeOutBack(k, 2.2), grow = Math.max(0.001, s);
    mesh.scale.set(R * (0.4 + 0.6 * grow), rimHeight * grow, R * (0.4 + 0.6 * grow));
    const hot = Math.max(0, 1 - age / 4.5), flick = 0.85 + 0.15 * Math.sin(age * 11);
    heatM.material.opacity = 0.8 * hot * flick * smooth(age / 0.1); heatM.scale.setScalar(R * 0.9); heatM.visible = hot > 0.01;
    glow.dot(0, 0, 0.3, 0, R * 1.3 * (0.5 + 0.5 * hot), 0.8 * hot * flick * smooth(age / 0.1), 0.28 * hot * flick, 0.05 * hot); glow.flush();
    for (let i = 0; i < rocks; i++) { const p = RK[i], a = age - 0.04, e = easeOutCubic(clamp(a / 0.35)), jump = 4 * e * (1 - e) * R * 0.5; if (a < 0) { rk.hide(i); continue; } rk.put(i, Math.cos(p.a) * R * p.d * e, p.s * R * 0.12 + jump * p.d, Math.sin(p.a) * R * p.d * e, p.s * R * 0.5 * p.sc[0], p.w[0], p.w[1], p.w[2], p.s * R * 0.5 * p.sc[1], p.s * R * 0.5 * p.sc[2]); }
    rk.flush();
    for (let i = 0; i < 7; i++) {
      const a = age - 0.3 - i * 0.35, kk = a / 2.4; if (a < 0 || kk > 1) { wisps.hide(i); continue; }
      const sz = R * 0.12 * (0.5 + kk) * (1 - smooth((kk - 0.5) / 0.5));
      wisps.put(i, Math.sin(i * 2.1 + kk * 3) * R * 0.18, 0.1 + R * 1.4 * kk, Math.cos(i * 1.7 + kk * 2) * R * 0.18, sz); wisps.tint(i, 0.35 + 0.3 * kk, 0.33 + 0.3 * kk, 0.34 + 0.3 * kk);
    }
    wisps.flush();
  };
  return finish(g, set, { duration: 4.5, sizeM: R * 4 });
}

// ============================================================ meteor
// meteor({size=1.2, from, to, dur=1.6, seed}) .set(age): glowing rock falls along a slightly accelerating line with a fire-and-smoke trail that fans out behind it.
// age >= dur: impact point reached (head hidden, trail burns out). Chain an explosion + crater + shockwave at `to` at age = dur.
export function meteor({ size = 1.2, from = [-26, 34, -8], to = [0, 0, 0], dur = 1.6, seed = 12, trailT = 0.8 } = {}) {
  const g = new THREE.Group(), r = rng(seed), S = size;
  const A = V(...from), B = V(...to), dirv = B.clone().sub(A), len = dirv.length();
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(S, 1), new THREE.MeshStandardMaterial({ color: 0x2a211d, emissive: 0xff5a14, emissiveIntensity: 0.7, roughness: 0.8, flatShading: true }));
  const pgeo = head.geometry.attributes.position; for (let i = 0; i < pgeo.count; i++) { const k = 1 + 0.18 * Math.sin(pgeo.getX(i) * 3.1 + pgeo.getY(i) * 2.3) + 0.12 * Math.sin(pgeo.getZ(i) * 5 + 1); pgeo.setXYZ(i, pgeo.getX(i) * k, pgeo.getY(i) * k, pgeo.getZ(i) * k); } head.geometry.computeVertexNormals();
  g.add(head);
  const NF = 60, NS = 36, FP = Array.from({ length: NF }, () => ({ j: [r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)], s: r.range(0.7, 1.1) })), SP = Array.from({ length: NS }, () => ({ j: [r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)], s: r.range(0.7, 1.1) }));
  const fire = pool(SPH(), basicWhite(), NF), fireIn = pool(SPH(), basicWhite(), NF), smk = pool(SPH(), lambertWhite(), NS), glow = glowPool(3, 'soft'); g.add(smk, fire, glow);
  const heat = makeRamp([[0, [3, 2.6, 1.6]], [0.25, [3, 1.5, 0.3]], [0.6, [1.8, 0.45, 0.06]], [1, [0.3, 0.08, 0.04]]]);
  const c = new THREE.Color(), path = (t) => { const u = clamp(t / dur), e = Math.pow(u, 1.25); return A.clone().addScaledVector(dirv, e); };
  const dir = dirv.clone().normalize();
  const set = (age) => {
    const u = clamp(age / dur), tail = trailT;
    const pos = path(age); head.visible = age >= 0 && age < dur; head.position.copy(pos); head.rotation.set(age * 3, age * 2, age * 1.3);
    for (let i = 0; i < NF; i++) {
      const p = FP[i], phi = i / NF, te = age - phi * tail;
      if (age < 0 || te < 0 || te > dur + 0.01) { fire.hide(i); continue; }
      const q = path(te), grow = S * (1.1 - 0.75 * phi) * p.s * 1.05, sp = S * (0.12 + 0.8 * (1 - phi) * 0.3 + 0.5 * phi);
      fire.put(i, q.x + p.j[0] * sp, q.y + p.j[1] * sp, q.z + p.j[2] * sp, grow); heat(phi, c); fire.tint(i, c);
    }
    for (let i = 0; i < NS; i++) {
      const p = SP[i], phi = i / NS, te = age - 0.15 - phi * tail * 2.2;
      if (age < 0 || te < 0 || te > dur + 0.01) { smk.hide(i); continue; }
      const q = path(te), sz = S * (0.55 + 0.9 * phi) * p.s * (1 - smooth((phi - 0.7) / 0.3)), sp = S * (0.25 + 1.6 * phi);
      smk.put(i, q.x + p.j[0] * sp, q.y + p.j[1] * sp + phi * S * 1.2, q.z + p.j[2] * sp, sz); smk.tint(i, 0.34 + 0.35 * phi, 0.3 + 0.35 * phi, 0.3 + 0.37 * phi);
    }
    const on = age >= 0 && age < dur;
    if (on) { glow.dot(0, pos.x - dir.x * S * 1.4, pos.y - dir.y * S * 1.4, pos.z - dir.z * S * 1.4, S * 3.4, 0.7, 0.26, 0.04); glow.dot(1, pos.x - dir.x * S * 2.2, pos.y - dir.y * S * 2.2, pos.z - dir.z * S * 2.2, S * 1.8, 1.0, 0.55, 0.15); glow.hide(2); } else { glow.hide(0); glow.hide(1); glow.hide(2); }
    fire.flush(); smk.flush(); glow.flush();
  };
  return finish(g, set, { duration: dur + 1.2, sizeM: len, extra: { impact: B, impactAge: dur } });
}

// ============================================================ laserBeam
// laserBeam({from, to, width=0.25, color, charge=0.5, fire=1.2}) .set(age): charge orb with converging rings, beam (white core + coloured glow + travelling rings + flicker), impact flash with sparks, fade.
export function laserBeam({ from = [0, 1, 0], to = [0, 1, -12], width = 0.25, color = 0xff3a5a, charge = 0.5, fire = 1.2, fade = 0.3, seed = 13 } = {}) {
  const g = new THREE.Group(); g.position.set(...from); const T = V(...to), L = T.distanceTo(g.position); g.lookAt(T);
  const col = new THREE.Color(color), hotC = col.clone().lerp(new THREE.Color(1, 1, 1), 0.6);
  const beam = new THREE.Group(); beam.position.z = L / 2; g.add(beam);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); core.rotation.x = Math.PI / 2; beam.add(core);
  const gm = glowBasic({ color, opacity: 0.55 }), halo = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 20, 1, true), gm); halo.rotation.x = Math.PI / 2; beam.add(halo);
  const gm2 = glowBasic({ color, opacity: 0.22 }), halo2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 20, 1, true), gm2); halo2.rotation.x = Math.PI / 2; beam.add(halo2);
  const NR = 12, ringM = glowBasic({ color: hotC.getHex(), opacity: 0.8 }), rg = new THREE.InstancedMesh(new THREE.TorusGeometry(0.5, 0.045, 6, 24), ringM, NR); rg.frustumCulled = false; g.add(rg);
  const d = new THREE.Object3D();
  const orb = glowPool(2, 'soft'); g.add(orb);
  const imp = glowPool(2, 'soft'); imp.position.set(0, 0, L); g.add(imp);
  const spk = sparks({ count: 28, power: 5, dir: [0, 0, -1], spread: 1.2, size: 0.03, color: 'white', loop: true, life: 0.35, seed }); spk.position.copy(imp.position); g.add(spk);
  const set = (age) => {
    const fk = ph(age, charge, 0.06), on = age >= charge && age < charge + fire + fade, w = width * (age < charge + fire ? easeOutBack(fk, 3) : 1 - smooth((age - charge - fire) / fade));
    const flick = 1 + 0.12 * Math.sin(age * 83) + 0.08 * Math.sin(age * 47 + 1);
    beam.visible = on && w > 0.001; const ww = Math.max(1e-3, w * flick);
    core.scale.set(ww * 0.42, L, ww * 0.42); core.rotation.x = Math.PI / 2; halo.scale.set(ww * 1.0, L, ww * 1.0); halo2.scale.set(ww * 1.9, L, ww * 1.9);
    rg.visible = beam.visible; for (let i = 0; i < NR; i++) { const z = fract(age * 1.7 + i / NR) * L, s = ww * 1.5 * (0.7 + 0.3 * Math.sin(i + age * 20)); d.position.set(0, 0, z); d.rotation.set(0, 0, 0); d.scale.set(s, s, s * 1); d.updateMatrix(); rg.setMatrixAt(i, d.matrix); } rg.instanceMatrix.needsUpdate = true;
    const ch = age < 0 ? 0 : age < charge ? smooth(age / charge) : 1 - smooth((age - charge - fire) / fade);
    orb.dot(0, 0, 0, 0, width * (1.2 + 4 * ch) * (age < charge ? 1 : 1.2), 1.1 * ch * hotC.r, 1.1 * ch * hotC.g, 1.1 * ch * hotC.b);
    orb.dot(1, 0, 0, 0, width * 1.6 * ch, 2.2 * ch, 2.2 * ch, 2.2 * ch); orb.flush();
    const im = beam.visible ? w / width : 0; imp.dot(0, 0, 0, 0, width * 6 * im, col.r * 1.1 * im, col.g * 1.1 * im, col.b * 1.1 * im); imp.dot(1, 0, 0, 0, width * 2.4 * im, 2.2 * im, 2.2 * im, 2.2 * im); imp.flush();
    spk.visible = beam.visible; if (beam.visible) spk.set(age);
  };
  return finish(g, set, { duration: charge + fire + fade, sizeM: L });
}
