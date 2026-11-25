// MOTION pack: constant-motion and dopamine effects. speedLines, windStreaks, motionTrail, impactStar, confettiBurst, fallingLeaves, birdsScatter, ambientMotes, coinShower, parallaxLayers.
// Looping: .update(t). One-shots: .set(age). Camera-aware ones take the camera: .set(t, camera).
import * as THREE from 'three';
import {
  rng, clamp, smooth, easeOutCubic, easeOutBack, TAU, ph, pulse, fract, hash, makeRamp, pool, glowPool, ballistic, finish, faceCamera,
  SPH, BOX, ROCK, spindleGeo, alignX, lambertWhite, basicWhite, glowBasic, mergeGeos,
} from './motion_core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ============================================================ speedLines
// speedLines({count=48, inner=0.5, outer=1.4, style:'flow'|'focus', color, seed}) .set(t, camera, k=1): camera-relative 3D streaks radiating from the view centre. inner = clear zone (fraction of the half-frame) so faces stay readable;
// k 0..1 ramps intensity. Add the group to the scene (parent at identity); it follows the camera every call. Drawn on top (no depth test).
export function speedLines({ count = 48, inner = 0.5, outer = 1.4, style = 'flow', color = 0xffffff, opacity = 0.9, depth = [2.5, 6], seed = 5, width = 1 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
  const pl = pool(spindleGeo(), m, count); pl.renderOrder = 999; g.add(pl);
  const P = Array.from({ length: count }, (_, i) => ({ th: (i + r.range(-0.4, 0.4)) / count * TAU, z: r.range(depth[0], depth[1]), ph: r(), sp: r.range(1.4, 2.6), len: r.range(0.25, 0.7), wd: r.range(0.6, 1.4), r0: r.range(0, 0.25) }));
  const set = (t, cam, k = 1) => {
    if (!cam) return; cam.updateMatrixWorld(true);
    cam.matrixWorld.decompose(g.position, g.quaternion, g.scale); g.scale.set(1, 1, 1);
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), asp = cam.aspect || 0.75, K = clamp(k);
    g.visible = K > 0.01;
    for (let i = 0; i < count; i++) {
      const p = P[i], halfH = p.z * tan, halfW = halfH * asp;
      const f = style === 'flow' ? fract(t * p.sp + p.ph) : (Math.floor(t * 12 + p.ph * 7) % 2 ? 0.2 : 0) + p.r0 * 0.6 + 0.35 + 0.15 * hash(Math.floor(t * 12) + i);
      const rho = inner + (outer - inner) * (style === 'flow' ? f : clamp(f)), c = Math.cos(p.th), s = Math.sin(p.th);
      const env = style === 'flow' ? Math.pow(Math.sin(f * Math.PI), 0.6) : 1, show = K * env;
      if (show < 0.03 || (style === 'focus' && f < 0.3)) { pl.hide(i); continue; }
      const len = (outer - inner) * p.len * (0.45 + 0.9 * K) * halfH * (style === 'focus' ? 1.2 : 1), th = Math.max(0.004, 0.02 * halfH * p.wd * width * show);
      pl.put(i, c * rho * halfW, s * rho * halfH, -p.z, len, 0, 0, Math.atan2(s * halfH, c * halfW), th, th);
    }
    pl.flush();
  };
  return finish(g, set, { loop: true, sizeM: 0 });
}

// ============================================================ windStreaks
// windStreaks({area:[16,5,6], dir:[1,0,0], count=24, speed=8, color, opacity}) .update(t): cartoon wind ribbons (wavy lines ending in a curl) sliding through the area, fading in/out. Seamless loop.
export function windStreaks({ area = [16, 5, 6], dir = [1, 0, 0], count = 24, speed = 8, color = 0xffffff, opacity = 0.75, seed = 7, thickness = 0.012 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  g.quaternion.setFromUnitVectors(V(1, 0, 0), V(...dir).normalize());
  const mkGeo = (pts) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(p[0], p[1], 0))), segs = 40, rs = 5, geo = new THREE.TubeGeometry(curve, segs, thickness, rs, false), pos = geo.attributes.position;
    for (let i = 0; i <= segs; i++) { const u = i / segs, tp = Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.98 + 0.01)), 0.7), c = curve.getPointAt(u); for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * tp, c.y + (pos.getY(k) - c.y) * tp, c.z + (pos.getZ(k) - c.z) * tp); } }
    return geo;
  };
  const wave = [[0, 0], [0.2, 0.03], [0.4, -0.03], [0.6, 0.03], [0.8, -0.02], [1, 0]];
  const curl = [[0, 0], [0.25, 0.02], [0.5, -0.01], [0.72, 0.03], [0.86, 0.1], [0.92, 0.19], [0.86, 0.26], [0.77, 0.2], [0.8, 0.12], [0.9, 0.1]];
  const curl2 = [[0, 0], [0.18, -0.02], [0.4, 0.03], [0.6, 0.0], [0.78, -0.07], [0.86, -0.15], [0.8, -0.22], [0.71, -0.16], [0.75, -0.09], [0.84, -0.08]];
  const geos = [mkGeo(wave), mkGeo(curl), mkGeo(curl2)], mt = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });
  const pools = geos.map((ge) => { const p = pool(ge, mt, count); g.add(p); return p; });
  const P = Array.from({ length: count }, (_, i) => ({ v: i % 3, x0: r(), y: r.range(0.05, 1) * area[1], z: (r() - 0.5) * area[2], len: r.range(2.2, 5), sp: r.range(0.8, 1.25), tilt: r.range(-0.12, 0.12) }));
  const set = (t) => {
    const cnt = [0, 0, 0];
    for (let i = 0; i < count; i++) {
      const p = P[i], u = fract(p.x0 + t * speed * p.sp / area[0]), x = (u - 0.5) * area[0], env = Math.pow(Math.sin(u * Math.PI), 0.7), s = p.len * (0.35 + 0.65 * env), pl = pools[p.v], k = cnt[p.v]++;
      pl.put(k, x - s * 0.5, p.y + Math.sin(t * 2 + i) * 0.1, p.z, s, 0, 0, p.tilt);
    }
    pools.forEach((pl, v) => { for (let k = cnt[v]; k < count; k++) pl.hide(k); pl.flush(); });
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: area[0] });
}

// ============================================================ motionTrail
// motionTrail({path:(t)=>[x,y,z], radius=0.12, seconds=0.5, segments=28, head=0xffd23f, tail=0xff4a1f}) .set(t): tapered glowing ribbon (tube) following wherever path(t) was during the last `seconds`. Fast fists, thrown balls, flying heroes.
export function motionTrail({ path, radius = 0.12, seconds = 0.5, segments = 28, head = 0xffe08a, tail = 0xff4a1f, glow = true, sides = 8 } = {}) {
  const g = new THREE.Group(), n = segments + 1, sd = sides + 1;
  const mkMesh = (rk, mat) => {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * sd * 3), col = new Float32Array(n * sd * 3), idx = [];
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) { const a = i * sd + j, b = a + 1, c = (i + 1) * sd + j, d = c + 1; idx.push(a, c, b, b, c, d); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; g.add(m); m.userData.rk = rk; return m;
  };
  const core = mkMesh(1, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }));
  const halo = glow ? mkMesh(2.3, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })) : null;
  const cH = new THREE.Color(head), cT = new THREE.Color(tail), c = new THREE.Color(), pts = Array.from({ length: n }, () => new THREE.Vector3()), tg = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), up = V(0, 1, 0);
  const at = (t, out) => { const p = path(t); if (Array.isArray(p)) out.set(p[0], p[1], p[2]); else out.copy(p); return out; };
  const set = (t) => {
    for (let i = 0; i < n; i++) at(t - (i / segments) * seconds, pts[i]);
    for (const m of [core, halo]) {
      if (!m) continue; const pos = m.geometry.attributes.position, col = m.geometry.attributes.color, rk = m.userData.rk;
      for (let i = 0; i < n; i++) {
        const s = i / segments; tg.copy(pts[Math.max(0, i - 1)]).sub(pts[Math.min(n - 1, i + 1)]); if (tg.lengthSq() < 1e-10) tg.set(1, 0, 0); tg.normalize();
        u.copy(Math.abs(tg.y) > 0.95 ? V(1, 0, 0) : up).cross(tg).normalize(); v.copy(tg).cross(u).normalize();
        const rad = radius * rk * Math.pow(1 - s, 1.15) * (t - s * seconds >= 0 ? 1 : 0), k = 1 - s; c.copy(cT).lerp(cH, Math.pow(k, 1.5)).multiplyScalar(0.25 + 0.75 * Math.pow(k, 0.6) * 1.6);
        for (let j = 0; j < sd; j++) { const a = j / sides * TAU, o = (i * sd + j) * 3; pos.array[o] = pts[i].x + (u.x * Math.cos(a) + v.x * Math.sin(a)) * rad; pos.array[o + 1] = pts[i].y + (u.y * Math.cos(a) + v.y * Math.sin(a)) * rad; pos.array[o + 2] = pts[i].z + (u.z * Math.cos(a) + v.z * Math.sin(a)) * rad; col.array[o] = c.r; col.array[o + 1] = c.g; col.array[o + 2] = c.b; }
      }
      pos.needsUpdate = true; col.needsUpdate = true;
    }
  };
  return finish(g, set, { loop: true, sizeM: 1 });
}

// ============================================================ impactStar
// impactStar({color, color2, size=1, spikes=11, seed}) .set(age, camera): cartoon "POW" burst built from jagged extruded stars (outline, orange, yellow, white core) + flying speed rays + ring. Pops with overshoot, shakes, shrinks away. Faces the camera. No text.
export function impactStar({ color = 0xffc928, color2 = 0xff5a1e, size = 1, spikes = 11, seed = 3, rays = 10 } = {}) {
  const g = new THREE.Group(), r = rng(seed), S = size, inner = new THREE.Group(); g.add(inner);
  const starShape = (seedK, n, depthK = 0.52) => { const rr = rng(seed * 13 + seedK), sh = new THREE.Shape(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, out = i % 2 === 0, R = out ? rr.range(0.82, 1.18) : rr.range(depthK * 0.85, depthK * 1.15); const x = Math.cos(a) * R, y = Math.sin(a) * R; if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y); } sh.closePath(); return sh; };
  const layer = (sh, col, z, sc, rot) => { const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 2 }); geo.translate(0, 0, -0.025); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, toneMapped: false })); m.position.z = z; m.scale.setScalar(sc); m.rotation.z = rot; inner.add(m); return m; };
  const ls = [layer(starShape(1, spikes), 0x7a1208, 0, 1.12, 0), layer(starShape(1, spikes), color2, 0.03, 1.0, 0), layer(starShape(2, spikes, 0.6), color, 0.06, 0.74, TAU / (spikes * 4)), layer(starShape(3, spikes - 2, 0.62), 0xfff6d8, 0.09, 0.4, TAU / 9)];
  const rayM = new THREE.MeshBasicMaterial({ color: 0xffe9a0, toneMapped: false, transparent: true }), rp = pool(spindleGeo(), rayM, rays); g.add(rp);
  const RA = Array.from({ length: rays }, (_, i) => ({ a: (i + r.range(-0.3, 0.3)) / rays * TAU, len: r.range(0.35, 0.7), d: r.range(1.15, 1.5) }));
  const ringM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false, depthWrite: false }), ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 48), ringM); g.add(ring);
  const set = (age, cam) => {
    g.visible = age >= 0 && age < 0.85; if (!g.visible) return;
    if (cam) faceCamera(g, cam);
    const pop = easeOutBack(clamp(age / 0.14), 2.4), out = 1 - smooth((age - 0.55) / 0.28), s = S * pop * out * (1 + 0.04 * Math.sin(age * 55) * (age < 0.5 ? 1 : 0));
    inner.scale.setScalar(Math.max(1e-4, s)); inner.rotation.z = (age < 0.5 ? 0.07 : 0.02) * Math.sin(age * 38) + age * 0.25;
    const k = clamp((age - 0.02) / 0.5);
    for (let i = 0; i < rays; i++) { const p = RA[i], d = S * (p.d + 1.3 * easeOutCubic(k)), len = S * p.len * (1 - k * 0.7), a = age < 0.02 ? 0 : 1; rp.put(i, Math.cos(p.a) * d, Math.sin(p.a) * d, 0.05, len * a * (1 - smooth((age - 0.4) / 0.3)), 0, 0, p.a, S * 0.06, S * 0.06); }
    rp.flush();
    ring.scale.setScalar(S * (0.6 + 2.0 * easeOutCubic(k))); ringM.opacity = (1 - k) * (age > 0.01 ? 1 : 0); ring.visible = k < 1;
  };
  return finish(g, set, { duration: 0.85, sizeM: S * 2 });
}

// ============================================================ confettiBurst
// confettiBurst({origin, count=220, power=9, floor=0, colors, streamers=true, waves=1, seed}) .set(age): cannon burst of paper rectangles, discs and streamers with drag, flutter and tumbling; pieces land and lie flat on `floor`.
export function confettiBurst({ origin = [0, 0.2, 0], count = 220, power = 9, floor = 0, colors = [0xff3f7f, 0xffd23f, 0x4aa0e0, 0x4cd07a, 0xffffff, 0xff8a2b, 0xa66bff], streamers = true, waves = 1, spread = 0.7, seed = 17, size = 0.13 } = {}) {
  const g = new THREE.Group(), r = rng(seed), nS = streamers ? Math.floor(count * 0.18) : 0, nP = count - nS;
  const rectM = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), discG = new THREE.CircleGeometry(0.5, 10);
  const rects = pool(new THREE.PlaneGeometry(1, 0.6), rectM, Math.ceil(nP * 0.65)), discs = pool(discG, rectM, Math.floor(nP * 0.35)), strm = pool(new THREE.PlaneGeometry(0.06, 1), rectM, Math.max(1, nS));
  g.add(rects, discs, strm);
  const pieces = [];
  const mk = (pl, i, kind) => {
    const th = r() * TAU, el = Math.acos(1 - r() * (1 - Math.cos(spread))), sp = power * r.range(0.45, 1.1), c = new THREE.Color(r.pick(colors));
    pl.tint(i, c);
    pieces.push({ pl, i, kind, v: [Math.sin(el) * Math.cos(th) * sp, Math.cos(el) * sp, Math.sin(el) * Math.sin(th) * sp], w: [r.range(-9, 9), r.range(-9, 9), r.range(-9, 9)], ph: r() * TAU, s: size * r.range(0.7, 1.4) * (kind === 'strm' ? 2.2 : 1), vt: r.range(0.9, 1.7), k: r.range(1.6, 2.8), delay: Math.floor(r() * waves) * 0.3 + r() * 0.05, fl: r.range(0.1, 0.32) });
  };
  for (let i = 0; i < rects.count_; i++) mk(rects, i, 'rect'); for (let i = 0; i < discs.count_; i++) mk(discs, i, 'disc'); for (let i = 0; i < nS; i++) mk(strm, i, 'strm');
  rects.flush(); discs.flush(); strm.flush();
  const pos = (p, a) => { const e = 1 - Math.exp(-p.k * a), fl = Math.sin(a * 5 + p.ph) * p.fl * (1 - Math.exp(-a)); return [origin[0] + p.v[0] * e / p.k + fl, origin[1] + (p.v[1] + p.vt) * e / p.k - p.vt * a, origin[2] + p.v[2] * e / p.k + Math.cos(a * 4.3 + p.ph) * p.fl * (1 - Math.exp(-a))]; };
  const set = (age) => {
    for (const p of pieces) {
      const a0 = age - p.delay; if (a0 < 0) { p.pl.hide(p.i); continue; }
      let a = a0, flat = 0, q = pos(p, a);
      if (q[1] <= floor + 0.01) { let lo = 0.05, hi = a0; for (let it = 0; it < 18; it++) { const mid = (lo + hi) / 2; if (pos(p, mid)[1] > floor + 0.01 && mid < hi) lo = mid; else hi = mid; } a = hi; q = pos(p, a); q[1] = floor + 0.012; flat = smooth((a0 - a) / 0.25 + 0.0001); a = Math.min(a, hi); }
      const rx = p.w[0] * a, ry = p.w[1] * a, rz = p.w[2] * a, s = p.s, fall = flat > 0 ? 1 : 0;
      if (flat > 0) p.pl.put(p.i, q[0], q[1], q[2], s * (p.kind === 'strm' ? 1 : 1), -Math.PI / 2 * flat + rx * (1 - flat), ry * (1 - flat), rz, s * (p.kind === 'strm' ? 3.2 : 1), s);
      else p.pl.put(p.i, q[0], q[1], q[2], s * (0.35 + 0.65 * Math.abs(Math.cos(a * 3 + p.ph))), rx, ry, rz, s * (p.kind === 'strm' ? 3.2 : 1), s);
    }
    rects.flush(); discs.flush(); strm.flush();
  };
  set(-1);
  return finish(g, set, { duration: 5, sizeM: power });
}

// ============================================================ fallingLeaves
// fallingLeaves({area:[10,6,6], count=40, wind:[0.8,0,0.2], palette, seed}) .update(t): leaves swing, tumble and flutter down through the box, rest on the ground a moment, shrink away and re-enter at the top. Seamless.
export function fallingLeaves({ area = [10, 6, 6], count = 40, wind = [0.9, 0, 0.2], palette = [0xe8742a, 0xd9a21b, 0xc4452a, 0x8fb339, 0xb5651d], seed = 19, size = 0.2, floor = 0.02, period = 7 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const sh = new THREE.Shape(); sh.moveTo(0, -0.5); sh.bezierCurveTo(0.42, -0.3, 0.45, 0.2, 0, 0.5); sh.bezierCurveTo(-0.45, 0.2, -0.42, -0.3, 0, -0.5);
  const geo = new THREE.ShapeGeometry(sh, 8), pl = pool(geo, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), count); g.add(pl);
  const P = Array.from({ length: count }, (_, i) => ({ off: (i + r() * 0.8) / count, x0: (r() - 0.5) * area[0], z0: (r() - 0.5) * area[2], T: period * r.range(0.8, 1.3), sw: Math.floor(r.range(2, 5)), ph: r() * TAU, s: size * r.range(0.7, 1.3), spin: r.range(-4, 4), amp: r.range(0.3, 0.8) }));
  P.forEach((p, i) => pl.tint(i, new THREE.Color(r.pick(palette)).multiplyScalar(r.range(0.85, 1.1)))); pl.flush();
  const set = (t) => {
    for (let i = 0; i < count; i++) {
      const p = P[i], u = fract(t / p.T + p.off), fall = clamp(u / 0.88), y = floor + (1 - fall) * area[1], ang = fall * p.sw * TAU + p.ph;
      const x = p.x0 + wind[0] * fall * p.T * 0.6 + Math.sin(ang) * p.amp, z = p.z0 + wind[2] * fall * p.T * 0.6 + Math.cos(ang * 0.7) * p.amp * 0.4;
      const resting = u > 0.88, sc = p.s * (1 - smooth((u - 0.95) / 0.05)) * smooth(u / 0.03);
      if (resting) pl.put(i, x, floor + 0.01, z, sc, -Math.PI / 2, p.ph, 0, sc, sc);
      else pl.put(i, x, y, z, sc, -Math.PI / 2 + Math.sin(ang + 1.57) * 0.9, p.ph + fall * p.spin, Math.sin(ang) * 0.7, sc * 1, sc);
    }
    pl.flush();
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: area[1] });
}

// ============================================================ birdsScatter
// birdsScatter({count=14, area:[6,5], scareFrom:[0,0], seed}) .set(age): a flock pecking on the ground (age<0: head-bobs and hops) bursts into the air at age 0 with flapping wings, fanning away from `scareFrom`, banking and climbing out of frame.
export function birdsScatter({ count = 14, area = [6, 5], scareFrom = [0, 1.5], seed = 23, scale = 1, floor = 0, palette = [0x8a6a4a, 0x7c8794, 0x4a78b8, 0xb06a4a, 0x6a6a72] } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const body = mergeGeos([{ geo: new THREE.SphereGeometry(1, 14, 10).scale(0.13, 0.115, 0.2), color: 0xffffff }, { geo: new THREE.SphereGeometry(1, 12, 8).scale(0.085, 0.085, 0.085).translate(0, 0.075, 0.15), color: 0xffffff }, { geo: new THREE.ConeGeometry(0.06, 0.2, 6).rotateX(-Math.PI / 2).translate(0, -0.01, -0.28), color: 0xe0e0e0 }]);
  const fine = mergeGeos([{ geo: new THREE.ConeGeometry(0.022, 0.07, 6).rotateX(Math.PI / 2).translate(0, 0.07, 0.24), color: 0xffa21f }, { geo: new THREE.SphereGeometry(1, 6, 5).scale(0.016, 0.016, 0.016).translate(0.045, 0.1, 0.18), color: 0x101018 }, { geo: new THREE.SphereGeometry(1, 6, 5).scale(0.016, 0.016, 0.016).translate(-0.045, 0.1, 0.18), color: 0x101018 }, { geo: new THREE.CylinderGeometry(0.008, 0.008, 0.1, 5).translate(0.04, -0.14, 0.02), color: 0xe08a2a }, { geo: new THREE.CylinderGeometry(0.008, 0.008, 0.1, 5).translate(-0.04, -0.14, 0.02), color: 0xe08a2a }]);
  const wing = (sx) => new THREE.SphereGeometry(1, 10, 6).scale(0.2, 0.012, 0.11).translate(0.11 * sx, 0, -0.01);
  const mBody = new THREE.MeshLambertMaterial({ vertexColors: true }), mFine = new THREE.MeshLambertMaterial({ vertexColors: true }), mWing = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const bp = pool(body, mBody, count, { cast: true }), fp = pool(fine, mFine, count), wl = pool(wing(-1), mWing, count, { cast: true }), wr = pool(wing(1), mWing, count, { cast: true }); g.add(bp, fp, wl, wr);
  const B = Array.from({ length: count }, (_, i) => { const a = (i + r()) / count * TAU, d = Math.sqrt(r()) * 0.5; return { x: Math.cos(a) * d * area[0], z: Math.sin(a) * d * area[1], yaw0: r() * TAU, delay: r() * 0.28, v: r.range(7, 11), climb: r.range(5, 8), fp: r() * TAU, s: scale * r.range(0.85, 1.2), pk: r.range(4, 7), pk0: r() * TAU, wob: r.range(0.5, 1.2) }; });
  B.forEach((b, i) => { const c = new THREE.Color(r.pick(palette)); bp.tint(i, c); wl.tint(i, c.clone().multiplyScalar(0.8)); wr.tint(i, c.clone().multiplyScalar(0.8)); }); [bp, wl, wr].forEach((p) => p.flush());
  const M = new THREE.Matrix4(), W = new THREE.Matrix4(), Tm = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), P = new THREE.Vector3(), S = new THREE.Vector3(), tmp = new THREE.Quaternion();
  const put = (pl, i, mtx) => pl.setMatrixAt(i, mtx);
  const set = (age) => {
    for (let i = 0; i < count; i++) {
      const b = B[i], a = age - b.delay; let yaw = b.yaw0, pitch = 0, roll = 0, flap = 0.12, x = b.x, y = floor + 0.14 * b.s, z = b.z;
      if (a < 0) { const pk = Math.max(0, Math.sin(age * b.pk + b.pk0)); pitch = 0.5 * pk; y += -0.02 * pk; const hop = Math.max(0, Math.sin(age * 2.2 + b.pk0 * 3)); if (hop > 0.97) y += 0.12 * (hop - 0.97) / 0.03; }
      else {
        const away = Math.atan2(b.x - scareFrom[0], b.z - scareFrom[1]) + Math.sin(i * 7.1) * 0.5, e = 1 - Math.exp(-2.6 * a), dist = b.v * (a - (1 - Math.exp(-2.6 * a)) / 2.6);
        yaw = away + Math.sin(a * 1.2 + i) * 0.12 * smooth(a); x = b.x + Math.sin(away) * dist; z = b.z + Math.cos(away) * dist;
        y = floor + 0.14 * b.s + b.climb * (1 - Math.exp(-1.2 * a)) * 0.9 + 0.4 * Math.sin(a * 6 + b.fp) * b.wob * 0.2 * smooth(a);
        const vy = b.climb * 1.08 * Math.exp(-1.2 * a), vh = b.v * e; pitch = -Math.atan2(vy, Math.max(0.2, vh)); roll = Math.cos(a * 1.2 + i) * 0.25 * smooth(a) * -1;
        flap = a < 0.12 ? 0.8 : Math.sin(a * 2 * Math.PI * 7.5 + b.fp) * 0.95 + 0.1;
      }
      P.set(x, y, z); E.set(pitch * (a < 0 ? 1 : 1), yaw, roll); Q.setFromEuler(E); S.setScalar(b.s); M.compose(P, Q, S);
      put(bp, i, M); put(fp, i, M);
      for (const [pl, sg] of [[wl, -1], [wr, 1]]) { tmp.setFromEuler(new THREE.Euler(0, 0, sg * flap)); Tm.compose(V(0.09 * sg, 0.03, 0), tmp, V(1, 1, 1)); W.multiplyMatrices(M, Tm); put(pl, i, W); }
    }
    [bp, fp, wl, wr].forEach((p) => { p.instanceMatrix.needsUpdate = true; });
  };
  set(-1);
  return finish(g, set, { duration: 4, sizeM: 0.3 * scale, extra: { realHeightM: 0.3 } });
}

// ============================================================ ambientMotes
// ambientMotes({area:[12,6,8], kind, count, seed}) .update(t): constant gentle motion that fills any shot. kind: 'dust' | 'pollen' | 'fireflies' | 'snow' | 'rain' | 'embers' | 'bubbles' | 'sparkle'. Seamless loop; area is centred on x/z, y from 0 up.
export function ambientMotes({ area = [12, 6, 8], kind = 'dust', count = 120, seed = 27, wind = [0.2, 0, 0] } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const cfg = {
    dust: { type: 'glow', size: [0.04, 0.09], v: [0.05, 0.05, 0.02], col: [0.9, 0.82, 0.6], wob: 0.35, shape: 'soft' },
    pollen: { type: 'glow', size: [0.06, 0.12], v: [0.2, 0.08, 0.1], col: [1.0, 0.9, 0.3], wob: 0.5, shape: 'soft' },
    fireflies: { type: 'glow', size: [0.12, 0.22], v: [0.05, 0.02, 0.05], col: [0.6, 1.4, 0.2], wob: 1.2, shape: 'soft', blink: true },
    embers: { type: 'glow', size: [0.05, 0.11], v: [0.15, 1.1, 0.1], col: [2.0, 0.8, 0.12], wob: 0.4, shape: 'soft', flick: true },
    sparkle: { type: 'glow', size: [0.12, 0.3], v: [0.0, 0.1, 0.0], col: [1.0, 0.95, 0.7], wob: 0.3, shape: 'star', blink: true },
    snow: { type: 'ball', size: [0.04, 0.1], v: [0.2, -0.9, 0.1], col: [1, 1, 1], wob: 0.6 },
    bubbles: { type: 'bubble', size: [0.08, 0.3], v: [0.0, 0.7, 0.0], col: [1, 1, 1], wob: 0.4 },
    rain: { type: 'streak', size: [0.012, 0.02], v: [-1.2, -14, 0.2], col: [0.85, 0.93, 1], wob: 0 },
  }[kind] ?? null;
  const P = Array.from({ length: count }, () => ({ x: r(), y: r(), z: r(), s: r.range(cfg.size[0], cfg.size[1]), ph: r() * TAU, sp: r.range(0.6, 1.4), f: r.range(0.7, 1.6) }));
  let pl;
  if (cfg.type === 'glow') pl = glowPool(count, cfg.shape);
  else if (cfg.type === 'ball') pl = pool(SPH(), lambertWhite(), count);
  else if (cfg.type === 'bubble') pl = pool(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: 0xcfeeff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, emissive: 0x6ab0e0, emissiveIntensity: 0.25, depthWrite: false }), count);
  else pl = pool(spindleGeo(), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.55, depthWrite: false }), count);
  g.add(pl); const c = new THREE.Color();
  const wrap = (u, size) => ((u % 1) + 1) % 1 * size - size / 2;
  const set = (t) => {
    for (let i = 0; i < count; i++) {
      const p = P[i], vx = (cfg.v[0] + wind[0]) * p.sp, vy = cfg.v[1] * p.f, vz = (cfg.v[2] + wind[2]) * p.sp;
      const x = wrap(p.x + vx * t / area[0], area[0]) + Math.sin(t * 0.7 * p.sp + p.ph) * cfg.wob, y = (((p.y + vy * t / area[1]) % 1) + 1) % 1 * area[1] + (cfg.type === 'glow' && cfg.wob > 1 ? Math.sin(t * 0.9 + p.ph) * 0.5 : Math.sin(t * 0.8 + p.ph) * cfg.wob * 0.3), z = wrap(p.z + vz * t / area[2], area[2]) + Math.cos(t * 0.6 * p.sp + p.ph) * cfg.wob;
      const edge = Math.sin(clamp(y / area[1]) * Math.PI);   // fade at the top/bottom of the box so wrapping never pops
      if (cfg.type === 'glow') {
        let k = 0.55 + 0.45 * Math.sin(t * 2.2 * p.sp + p.ph); if (cfg.blink) k = Math.pow(Math.max(0, Math.sin(t * 1.5 * p.sp + p.ph)), 3); if (cfg.flick) k = 0.6 + 0.4 * Math.sin(t * 17 + p.ph * 3);
        const e = Math.min(1, edge * 2.5) * k; pl.dot(i, x, y, z, p.s * 2 * (0.7 + 0.5 * e), cfg.col[0] * e, cfg.col[1] * e, cfg.col[2] * e);
      } else if (cfg.type === 'ball') pl.put(i, x + Math.sin(t * 1.1 * p.sp + p.ph) * 0.3, y, z, p.s * Math.min(1, edge * 4));
      else if (cfg.type === 'bubble') pl.put(i, x, y, z, p.s * (1 + 0.06 * Math.sin(t * 5 + p.ph)) * Math.min(1, edge * 4), 0, 0, 0, p.s * (1 - 0.06 * Math.sin(t * 5 + p.ph)) * Math.min(1, edge * 4), p.s * Math.min(1, edge * 4));
      else { const L = 0.5 + 0.7 * p.f, q = new THREE.Quaternion(); const d = V(cfg.v[0], cfg.v[1], cfg.v[2]).normalize(); alignX(q, d); pl.putQ(i, x, y, z, q, L * Math.min(1, edge * 6), p.s, p.s); }
    }
    pl.flush();
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: area[1] });
}

// ============================================================ coinShower
// coinShower({count=60, mode:'rain'|'fountain', area:[4,4], height=8, origin, floor=0, seed}) .set(age): gold coins with a rim and embossed centre tumble, bounce, ring and settle flat with glints. rain = pour from above, fountain = burst up from origin.
export function coinShower({ count = 60, mode = 'rain', area = [4, 4], height = 8, origin = [0, 0.5, 0], floor = 0, seed = 33, size = 0.22, power = 7 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const coin = mergeGeos([{ geo: new THREE.CylinderGeometry(0.5, 0.5, 0.12, 20), color: 0xd9a21b }, { geo: new THREE.CylinderGeometry(0.38, 0.38, 0.145, 20), color: 0xffe07a }, { geo: new THREE.CylinderGeometry(0.2, 0.2, 0.16, 12), color: 0xd9a21b }]);
  const pl = pool(coin, new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.75, roughness: 0.28, emissive: 0x6a3a00, emissiveIntensity: 0.5 }), count, { cast: true }); g.add(pl);
  const gl = glowPool(count, 'star'); g.add(gl);
  const C = Array.from({ length: count }, () => ({ x: (r() - 0.5) * area[0], z: (r() - 0.5) * area[1], y: height + r() * 5, delay: r() * 1.6, w: r.range(-14, 14), tilt: r.range(-0.6, 0.6), ph: r() * TAU, s: size * r.range(0.9, 1.15), th: r() * TAU, el: Math.acos(1 - r() * 0.45), sp: power * r.range(0.55, 1.05), dly2: r() * 0.35 }));
  const set = (age) => {
    for (let i = 0; i < count; i++) {
      const c = C[i], a = age - (mode === 'rain' ? c.delay : c.dly2);
      if (a < 0) { pl.hide(i); gl.hide(i); continue; }
      const b = mode === 'rain' ? ballistic(c.x, c.y, c.z, 0, -1.5, 0, a, { floor: floor + c.s * 0.07, e: 0.5, fric: 0.5 }) : ballistic(origin[0], origin[1], origin[2], Math.sin(c.el) * Math.cos(c.th) * c.sp, Math.cos(c.el) * c.sp * 1.15, Math.sin(c.el) * Math.sin(c.th) * c.sp, a, { floor: floor + c.s * 0.07, e: 0.5, fric: 0.45 });
      const spinT = b.rest ? b.tRest : a, rest = b.rest ? smooth((a - b.tRest) / 0.3) : 0, rx = c.w * spinT, fin = Math.round(rx / Math.PI) * Math.PI;
      pl.put(b.rest ? b.x : b.x, b.y, b.z, c.s, rx * (1 - rest) + fin * rest + c.tilt * (1 - rest), c.ph, 0, c.s, c.s);
      const gl_ = Math.pow(Math.max(0, Math.sin(a * 8 + c.ph)), 12) * (a < 3 ? 1 : 0.6);
      if (gl_ < 0.05) gl.hide(i); else gl.dot(i, b.x, b.y + c.s * 0.3, b.z, c.s * 3.4 * gl_, 2.2 * gl_, 1.8 * gl_, 0.7 * gl_);
    }
    pl.flush(); gl.flush();
  };
  set(-1);
  return finish(g, set, { duration: 5, sizeM: height });
}

// ============================================================ parallaxLayers
// parallaxLayers({width=100, speed=1, seed, fog:0xcfe6ff, layers?}) .update(t, camX=0): foreground / midground / background layers that drift past at different speeds (nearer = faster) so a shot is never static.
// Default layers back to front: pale hills (z -70), high clouds (-58), low clouds (-40), far trees (-30), mid trees (-16), foreground bushes + flowers (+5). Items wrap seamlessly. camX adds true parallax when the camera trucks.
export function parallaxLayers({ width = 100, speed = 1, seed = 37, fog = 0xd4e8f4, camZ = 10, layers = null, hillColor = 0x9fcfa0 } = {}) {
  const g = new THREE.Group(), r = rng(seed), fogC = new THREE.Color(fog), c = new THREE.Color();
  const defs = layers ?? [
    { kind: 'hills', z: -70, count: 7, h: [10, 20], w: [14, 26], color: hillColor },
    { kind: 'clouds', z: -58, count: 9, y: [26, 40], size: [4, 7] },
    { kind: 'clouds', z: -40, count: 8, y: [14, 24], size: [3, 5.5] },
    { kind: 'trees', z: -30, count: 28, h: [7, 11], color: 0x5faa6a },
    { kind: 'trees', z: -16, count: 20, h: [6, 10], color: 0x4a9a58 },
    { kind: 'bushes', z: 5, count: 16, h: [0.5, 1.1], color: 0x3f8f4a },
  ];
  const L = defs.map((d, li) => {
    const depth = Math.abs(d.z - camZ), vel = speed * 14 / depth * (d.kind === 'clouds' ? 1.8 : 1), W = width * Math.max(0.6, depth / 30), n = d.count, items = [];
    const mix = clamp((depth - 12) / 80) * 0.55, col = c.set(d.color ?? 0xffffff).clone().lerp(fogC, mix);
    const mkInst = (geo, mat) => { const p = pool(geo, mat, n * (d.kind === 'trees' ? 1 : d.kind === 'bushes' ? 3 : d.kind === 'clouds' ? 4 : 1)); g.add(p); return p; };
    const o = { d, depth, vel, W, items, mix };
    if (d.kind === 'hills') { o.p = mkInst(SPH(), lambertWhite()); for (let i = 0; i < n; i++) { const h = r.range(...d.h), w = r.range(...d.w); items.push({ x: (i + r.range(-0.3, 0.3)) / n, h, w, tone: r.range(0.9, 1.08) }); o.p.tint(i, col.clone().multiplyScalar(items[i].tone)); } }
    else if (d.kind === 'clouds') { o.p = mkInst(SPH(), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x808890, emissiveIntensity: 0.55 })); for (let i = 0; i < n; i++) { const s = r.range(...d.size); items.push({ x: (i + r.range(-0.3, 0.3)) / n, y: r.range(...d.y), s, ph: r() * 6, vs: r.range(0.8, 1.2) }); for (let k = 0; k < 4; k++) o.p.tint(i * 4 + k, 1, 1, 1); } }
    else if (d.kind === 'trees') { o.p = mkInst(SPH(), lambertWhite()); o.q = mkInst(new THREE.CylinderGeometry(0.5, 0.7, 1, 8), lambertWhite()); for (let i = 0; i < n; i++) { const h = r.range(...d.h); items.push({ x: (i + r.range(-0.4, 0.4)) / n, h, w: h * r.range(0.38, 0.52), tone: r.range(0.8, 1.15) }); o.p.tint(i, col.clone().multiplyScalar(items[i].tone)); o.q.tint(i, new THREE.Color(0x6a4a30).lerp(fogC, mix)); } }
    else { o.p = mkInst(SPH(), lambertWhite()); for (let i = 0; i < n; i++) { const h = r.range(...d.h); items.push({ x: (i + r.range(-0.4, 0.4)) / n, h, w: h * r.range(1.2, 1.8), tone: r.range(0.8, 1.2), z: r.range(-3, 3), fl: r() < 0.4 }); for (let k = 0; k < 3; k++) o.p.tint(i * 3 + k, (k === 2 && items[i].fl ? new THREE.Color([0xff7aa2, 0xffd23f, 0xffffff][i % 3]) : col.clone().multiplyScalar(items[i].tone * (1 + 0.1 * k)))); } }
    return o;
  });
  const set = (t, camX = 0) => {
    for (const o of L) {
      const { d, W, items, vel } = o, off = t * vel - camX * (1 - Math.min(1, o.depth / 80)) * 0.0;
      const xs = (it) => ((((it.x + (off + camX * 0.0) / W) % 1) + 1) % 1 - 0.5) * W - camX * (14 / o.depth) * 0 + (-camX * (1 - o.depth / (o.depth + 30)));
      if (d.kind === 'hills') items.forEach((it, i) => o.p.put(i, xs(it), -it.h * 0.34, d.z, it.w, 0, 0, 0, it.h, it.w * 0.8));
      else if (d.kind === 'clouds') items.forEach((it, i) => { const x = xs(it); for (let k = 0; k < 4; k++) { const sx = [-0.7, 0, 0.75, 0.15][k], sy = [-0.1, 0.15, -0.05, 0.5][k], ss = [0.7, 1.0, 0.75, 0.6][k]; o.p.put(i * 4 + k, x + sx * it.s, it.y + sy * it.s + Math.sin(t * 0.3 * it.vs + it.ph) * 0.3, d.z, it.s * ss * 0.8, 0, 0, 0, it.s * ss * 0.6, it.s * ss * 0.6); } });
      else if (d.kind === 'trees') items.forEach((it, i) => { const x = xs(it); o.q.put(i, x, it.h * 0.16, d.z, it.w * 0.16, 0, 0, 0, it.h * 0.32, it.w * 0.16); o.p.put(i, x + Math.sin(t * 0.8 + i) * it.w * 0.02, it.h * 0.62, d.z, it.w * 0.62, 0, 0, 0, it.h * 0.42, it.w * 0.62); });
      else items.forEach((it, i) => { const x = xs(it), z = d.z + it.z; for (let k = 0; k < 3; k++) { const sx = [-0.35, 0.3, 0.0][k] * it.w, sh = [0.9, 0.75, k === 2 && it.fl ? 0.28 : 0.6][k]; o.p.put(i * 3 + k, x + sx, it.h * 0.4 * sh, z + (k === 2 ? 0.3 : 0), (k === 2 && it.fl ? 0.12 : 0.34) * it.w * sh, 0, 0, 0, (k === 2 && it.fl ? 0.12 : 0.55) * it.h * sh * 1.1, (k === 2 && it.fl ? 0.12 : 0.34) * it.w * sh); } });
      o.p.flush(); o.q?.flush();
    }
  };
  set(0);
  return finish(g, set, { loop: true, sizeM: width, extra: { layers: L.map((o) => ({ kind: o.d.kind, z: o.d.z, speedMps: o.vel })) } });
}
