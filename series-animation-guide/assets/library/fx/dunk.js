// Episode 5 dunk kit: the universe-ball, the floating hoop (gold rim, light-thread net, pre-fractured glass backboard), the shockwave ring,
// floor contact rings, the glossy void floor with a travelling ripple, the silhouette material patch and a cosmic-web point cloud.
// Geometry, colour and light only (no textures). Everything is driven by explicit time arguments: deterministic.
import * as THREE from 'three';
import { rng, add, sph, tor, cyl, mat, clamp, smooth } from '../util.js';

// Soft round points (procedural disc in the shader, no image): additive glow dots.
export function glowPoints(positions, colors, { size = 0.02, opacity = 1, attenuate = true } = {}) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions, 3)); g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { size: { value: size }, opacity: { value: opacity }, scale: { value: 800 } },
    vertexShader: `uniform float size; uniform float scale; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = ${attenuate ? 'size * scale / max(0.05, -mv.z)' : 'size'}; gl_PointSize = clamp(gl_PointSize, 1.0, 64.0); }`,
    fragmentShader: `uniform float opacity; varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d,d)*4.0; if (r > 1.0) discard; float a = exp(-r*3.0); gl_FragColor = vec4(vC * a * opacity, 1.0); }`,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}

// Cosmic-web filaments: seeded random walks between nodes inside a sphere of radius R
export function cosmicWeb(R = 1, n = 3000, seed = 31, palette = [[1, 0.75, 0.45], [0.7, 0.55, 1], [0.5, 0.8, 1], [1, 0.95, 0.85]]) {
  const r = rng(seed), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const nodes = Array.from({ length: 26 }, () => { const v = new THREE.Vector3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)); if (v.length() > 1) v.setLength(r.range(0.2, 0.95)); return v.multiplyScalar(R * 0.92); });
  const edges = []; nodes.forEach((a, i) => { const d = nodes.map((b, j) => [a.distanceTo(b), j]).sort((x, y) => x[0] - y[0]); for (let k = 1; k <= 3; k++) edges.push([i, d[k][1]]); });
  for (let i = 0; i < n; i++) {
    const node = i % 5 === 0; let v;
    if (node) { const c = nodes[Math.floor(r() * nodes.length)]; v = c.clone().add(new THREE.Vector3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(R * 0.05)); }
    else { const [a, b] = edges[Math.floor(r() * edges.length)]; const u = r(); v = nodes[a].clone().lerp(nodes[b], u).add(new THREE.Vector3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).multiplyScalar(R * 0.025 * (1 + Math.sin(u * 3.14) * 0.8))); }
    if (v.length() > R * 0.97) v.setLength(R * 0.97);
    pos.set([v.x, v.y, v.z], i * 3); const c = palette[Math.floor(r() * palette.length)], k = node ? 1.0 : r.range(0.45, 0.85); col.set([c[0] * k, c[1] * k, c[2] * k], i * 3);
  }
  return glowPoints(pos, col, { size: R * 0.05 });
}

// The universe-ball: radius r (basketball 0.12 m). Dark translucent shell with a fresnel rim, cosmic web inside, eight seam lines, warm point light.
export function universeBall(r = 0.12, { light = 6, seed = 31, points = 3000 } = {}) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { c: { value: new THREE.Color(0xff9a4a) }, k: { value: 1 } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); v = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; uniform float k; varying vec3 n; varying vec3 v; void main(){ float f = pow(1.0 - abs(dot(n, v)), 2.2); gl_FragColor = vec4(c * (0.10 + f * 1.6) * k, 1.0); }',
  }));
  g.add(shell);
  const core = new THREE.Mesh(new THREE.SphereGeometry(r * 0.96, 32, 24), new THREE.MeshBasicMaterial({ color: 0x07040e, transparent: true, opacity: 0.55, depthWrite: false })); g.add(core);
  const web = cosmicWeb(r, points, seed); g.add(web);
  // a bright galactic core glow
  const cg = new Float32Array([0, 0, 0]), cc = new Float32Array([1, 0.85, 0.6]); const coreGlow = glowPoints(cg, cc, { size: r * 2.4 }); g.add(coreGlow);
  // seams: two great circles + two curved side seams (basketball pattern), emissive
  const seamM = new THREE.MeshBasicMaterial({ color: 0xffc27a, toneMapped: false });
  const ring = (R, tube, rot, pos = [0, 0, 0]) => { const m = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 6, 96), seamM); m.rotation.set(...rot); m.position.set(...pos); g.add(m); return m; };
  ring(r * 1.003, r * 0.018, [Math.PI / 2, 0, 0]); ring(r * 1.003, r * 0.018, [0, 0, 0]);
  for (const s of [-1, 1]) ring(r * 0.72, r * 0.016, [0, Math.PI / 2, 0], [s * r * 0.69, 0, 0]);
  const pl = new THREE.PointLight(0xffa860, light, r * 160, 1.6); g.add(pl);
  g.userData = { shell, web, light: pl, coreGlow, r };
  g.setGlow = (k) => { shell.material.uniforms.k.value = k; web.material.uniforms.opacity.value = k; pl.intensity = light * k; };
  return g;
}

// The floating hoop: rim (inner diameter 0.45 m) at height h, 24-thread light net, 1.8 x 1.05 m glass backboard pre-fractured into 14 shards.
export function hoop({ h = 3.05, seed = 5 } = {}) {
  const g = new THREE.Group(), r = rng(seed), R = 0.225 + 0.012;
  const rimG = new THREE.Group(); rimG.position.set(0, h, 0.15 + R); g.add(rimG);
  const rimM = new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffc860, emissiveIntensity: 1.4, metalness: 0.6, roughness: 0.25 });
  add(rimG, tor(R, 0.02, 10, 64), rimM, [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(rimG, cyl(0.012, 0.012, 0.15, 8), rimM, [0, 0, -R - 0.075], [Math.PI / 2, 0, 0]);
  // net: 24 threads, top ring R -> bottom ring 0.6 R, 0.42 m long, crossing (each thread goes to the next-but-one slot) -> LineSegments
  const NT = 24, NS = 8, netPos = new Float32Array(NT * NS * 2 * 3 * 2);
  const netG = new THREE.BufferGeometry(); netG.setAttribute('position', new THREE.BufferAttribute(netPos, 3));
  const net = new THREE.LineSegments(netG, new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, toneMapped: false })); net.frustumCulled = false; rimG.add(net);
  // backboard: shards from a jittered 7x2 grid of quads (each a thin extruded convex quad)
  const BW = 1.8, BH = 1.05, bbG = new THREE.Group(); bbG.position.set(0, h + 0.3, 0); g.add(bbG);
  const cols = 7, rows = 2, P = []; for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const edge = i === 0 || i === cols || j === 0 || j === rows; P.push([-BW / 2 + BW * i / cols + (edge ? 0 : r.range(-0.07, 0.07)), -BH / 2 + BH * j / rows + (edge ? 0 : r.range(-0.12, 0.12))]); }
  const glassM = new THREE.MeshStandardMaterial({ color: 0x9fdcff, emissive: 0x2a6a9a, emissiveIntensity: 0.5, transparent: true, opacity: 0.35, metalness: 0.1, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  const edgeM = new THREE.LineBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.9, toneMapped: false });
  const starM = new THREE.MeshBasicMaterial({ color: 0xfff2d0, toneMapped: false });
  const shards = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const q = [P[j * (cols + 1) + i], P[j * (cols + 1) + i + 1], P[(j + 1) * (cols + 1) + i + 1], P[(j + 1) * (cols + 1) + i]];
    const cx = q.reduce((a, p) => a + p[0], 0) / 4, cy = q.reduce((a, p) => a + p[1], 0) / 4;
    const sh = new THREE.Shape(q.map((p) => new THREE.Vector2(p[0] - cx, p[1] - cy)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: false }); geo.translate(0, 0, -0.0125);
    const s = new THREE.Group(); s.position.set(cx, cy, 0); bbG.add(s);
    const m = new THREE.Mesh(geo, glassM); s.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeM); s.add(e);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), starM); star.visible = false; s.add(star);
    const trail = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.6, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); trail.visible = false; g.add(trail);
    const d = new THREE.Vector3(cx * 1.6 + r.range(-0.4, 0.4), cy * 1.4 + r.range(0.2, 1.4), r.range(0.8, 2.2)).normalize();
    shards.push({ s, m, e, star, trail, home: new THREE.Vector3(cx, cy, 0), dir: d, sp: r.range(5, 11), spin: new THREE.Vector3(r.range(-9, 9), r.range(-9, 9), r.range(-9, 9)), delay: Math.hypot(cx, cy + 0.3) * 0.06 });
  }
  // backboard frame (white-gold) + the square
  const frameM = new THREE.MeshBasicMaterial({ color: 0xfff0c8, toneMapped: false });
  const frame = new THREE.Group(); bbG.add(frame);
  for (const [w, hh, x, y] of [[BW + 0.04, 0.03, 0, BH / 2], [BW + 0.04, 0.03, 0, -BH / 2], [0.03, BH, -BW / 2, 0], [0.03, BH, BW / 2, 0], [0.59, 0.025, 0, -0.17], [0.59, 0.025, 0, 0.28], [0.025, 0.45, -0.295, 0.055], [0.025, 0.45, 0.295, 0.055]]) add(frame, new THREE.BoxGeometry(w, hh, 0.03), frameM, [x, y, 0.02]);
  g.userData = { rimG, net, netPos, shards, bbG, frame, R, h, rimWorld: new THREE.Vector3(0, h, 0.15 + R) };
  // state(a): a = seconds after the slam (negative before). bend: rim spring (8 cm, 14 Hz, 0.6 s), net whip, shard burst (0-4 frames), hang offset
  g.update = (a, { hang = 0 } = {}) => {
    const k = a < 0 ? 0 : Math.exp(-a / 0.15) * Math.cos(2 * Math.PI * 14 * a) * (1 - smooth(a / 0.6));
    const bend = -0.08 * (a < 0 ? 0 : k) - hang * 0.05;
    rimG.rotation.x = bend / (R * 2);   // tip down at the front
    rimG.position.y = h + bend * 0.5;
    // net: per thread, 8 segments; whip = up-flick after slam, then damped sway
    const whip = a < 0 ? 0 : Math.exp(-a / 0.25) * Math.sin(a * 18);
    let o = 0;
    for (let i = 0; i < NT; i++) {
      const a0 = (i / NT) * Math.PI * 2, a1 = ((i + 2) / NT) * Math.PI * 2, b1 = ((i - 2) / NT) * Math.PI * 2;
      for (const aEnd of [a1, b1]) {
        for (let s = 0; s < NS; s++) {
          for (const u of [s / NS, (s + 1) / NS]) {
            const ang = a0 + (aEnd - a0) * u, rr = R * (1 - 0.4 * u), y = -0.42 * u * (1 - 0.5 * Math.max(0, whip) * u) + Math.min(0, whip) * 0.08 * u;
            netPos[o++] = Math.cos(ang) * rr * (1 + 0.15 * whip * u); netPos[o++] = y; netPos[o++] = Math.sin(ang) * rr * (1 + 0.15 * whip * u);
          }
        }
      }
    }
    net.geometry.attributes.position.needsUpdate = true;
    // shards
    const wp = new THREE.Vector3();
    for (const s of shards) {
      const b = a - s.delay;
      if (b <= 0) { s.s.position.copy(s.home); s.s.rotation.set(0, 0, 0); s.m.visible = s.e.visible = true; s.star.visible = false; s.trail.visible = false; continue; }
      const d = s.sp * (1 - Math.exp(-b * 1.2)) / 1.2;
      s.s.position.copy(s.home).addScaledVector(s.dir, d); s.s.position.y -= 0.6 * b * b;
      s.s.rotation.set(s.spin.x * b, s.spin.y * b, s.spin.z * b);
      const glowK = smooth(b / 0.13);
      s.m.visible = s.e.visible = glowK < 0.7; s.star.visible = glowK > 0.3; s.star.scale.setScalar(0.6 + glowK * 1.2 + Math.sin(b * 30 + s.delay * 50) * 0.2);
      s.star.getWorldPosition(wp); s.trail.visible = b < 1.5; s.trail.position.copy(g.worldToLocal(wp.clone())).addScaledVector(s.dir, -0.3);
      s.trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.dir.clone().negate()); s.trail.material.opacity = 0.6 * (1 - clamp(b / 1.5));
    }
    frame.visible = a < 0.03;
  };
  g.update(-1);
  return g;
}

// Shockwave: a tall glowing torus ring (0.4 m thick) expanding to maxR in dur (ease-out), with debris sparks. set(a) with a = seconds since impact.
export function shockwave({ maxR = 40, dur = 0.8, color = 0xbfe6ff, sparks = 600, seed = 9 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const ringM = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 12, 128), ringM); ring.rotation.x = Math.PI / 2; g.add(ring);
  const wallM = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 128, 1, true), wallM); g.add(wall);
  const pos = new Float32Array(sparks * 3), col = new Float32Array(sparks * 3), seeds = [];
  for (let i = 0; i < sparks; i++) { seeds.push([r() * Math.PI * 2, r.range(0.9, 1.15), r.range(0.05, 1.8), r.range(0.5, 1)]); col.set([1, r.range(0.8, 1), r.range(0.6, 1)], i * 3); }
  const pts = glowPoints(pos, col, { size: 0.12 }); g.add(pts);
  g.set = (a) => {
    g.visible = a >= 0 && a < dur * 2.2; if (!g.visible) return;
    const u = clamp(a / dur), R = 0.3 + (maxR - 0.3) * (1 - Math.pow(1 - u, 3)), fade = 1 - smooth((a - dur * 0.6) / (dur * 1.4));
    ring.scale.set(R, R, 1 + R * 0.04); ringM.opacity = fade; ring.position.y = 0.25;
    wall.scale.set(R, 1.6 + 2.0 * (1 - u), R); wall.position.y = wall.scale.y / 2; wallM.opacity = 0.35 * fade;
    for (let i = 0; i < sparks; i++) { const [ang, rk, hy, sp] = seeds[i]; const rr = R * rk * (0.85 + 0.15 * sp); pos.set([Math.cos(ang) * rr, hy * (1 - u * 0.6) + 0.1, Math.sin(ang) * rr], i * 3); }
    pts.geometry.attributes.position.needsUpdate = true; pts.material.uniforms.opacity.value = fade;
  };
  g.set(-1); return g;
}

// Thin cyan contact rings on the floor (0.4 s life). events: [{t, x, z, s}] ; set(t)
export function floorRings(events, { color = 0x7fe8ff, max = 8 } = {}) {
  const g = new THREE.Group(), list = [];
  for (let i = 0; i < max; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.004; g.add(m); list.push(m); }
  g.set = (t) => { let k = 0; for (const e of events) { const a = t - e.t; if (a < 0 || a > (e.life ?? 0.4) || k >= max) continue; const m = list[k++], u = a / (e.life ?? 0.4); m.visible = true; m.position.set(e.x, 0.004, e.z); const s = (e.s ?? 1) * (0.15 + 1.1 * (1 - Math.pow(1 - u, 2))); m.scale.set(s, s, s); m.material.opacity = (1 - u) * 0.9; } for (; k < max; k++) list[k].visible = false; };
  g.set(-9); return g;
}

// Near-black glossy void floor with a travelling sine ripple (shockwave): uniforms {rippleR, rippleA}
export function voidFloor(size = 400) {
  const geo = new THREE.PlaneGeometry(size, size, 320, 320); geo.rotateX(-Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({ color: 0x08080e, roughness: 0.42, metalness: 0.55 });
  const U = { rippleR: { value: -10 }, rippleA: { value: 0 }, center: { value: new THREE.Vector2(0, 0) } };
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U); sh.vertexShader = 'uniform float rippleR; uniform float rippleA; uniform vec2 center;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float dd = distance(position.xz, center) - rippleR; transformed.y += rippleA * exp(-dd*dd*0.8) * cos(dd*3.0);'); };
  m.customProgramCacheKey = () => 'voidFloor';
  const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = false; mesh.userData.U = U; return mesh;
}

// Silhouette patch: clones every material of a character and adds a uniform blend (0 = normal, 1 = black silhouette with a warm rim facing
// the ball light and a faint cold rim from behind). The headband keeps a dim yellow glow. Shared uniform object -> call sil.set(k, ballWorldPos).
export function silhouette(root, { headbandColor = 0xffd23f } = {}) {
  const U = { uSil: { value: 0 }, uBallV: { value: new THREE.Vector3() }, uWarm: { value: new THREE.Color(0xff9a4a) }, uCold: { value: new THREE.Color(0x5a8cff) } };
  const hb = new THREE.Color(headbandColor);
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const src = o.material; const mm = Array.isArray(src) ? src.map((x) => x.clone()) : src.clone();
    for (const m of Array.isArray(mm) ? mm : [mm]) {
      const isHB = m.color && Math.abs(m.color.r - hb.r) + Math.abs(m.color.g - hb.g) + Math.abs(m.color.b - hb.b) < 0.08;
      if (!(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial || m.isMeshBasicMaterial || m.isMeshLambertMaterial)) continue;
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = 'varying vec3 vSilN; varying vec3 vSilP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vSilP = mvPosition.xyz; vSilN = normalize(normalMatrix * normal);');
        sh.fragmentShader = 'uniform float uSil; uniform vec3 uBallV; uniform vec3 uWarm; uniform vec3 uCold; varying vec3 vSilN; varying vec3 vSilP;\n' + sh.fragmentShader.replace(/}\s*$/, `
  vec3 Nn = normalize(vSilN); if (!gl_FrontFacing) Nn = -Nn; vec3 Vv = normalize(-vSilP); float fr = pow(1.0 - clamp(dot(Nn, Vv), 0.0, 1.0), 2.5);
  vec3 L = normalize(uBallV - vSilP); float facing = clamp(dot(Nn, L), 0.0, 1.0); float dist = length(uBallV - vSilP);
  vec3 silC = uWarm * fr * (0.35 + 2.4 * facing) * clamp(1.6 / (dist * dist + 0.4), 0.15, 1.6) + uCold * fr * 0.5 + uWarm * facing * 0.05 * clamp(1.0 / (dist * dist + 0.5), 0.0, 1.0);
  ${isHB ? 'silC = max(silC, vec3(0.55, 0.42, 0.06) * (0.6 + 0.4 * fr));' : ''}
  gl_FragColor.rgb = mix(gl_FragColor.rgb, silC, uSil);
}`);
      };
      m.customProgramCacheKey = () => 'sil' + (isHB ? 'hb' : '');
    }
    o.material = mm;
  });
  const tmp = new THREE.Vector3();
  return { U, set(k, ballWorld, camera) { U.uSil.value = k; if (ballWorld && camera) { tmp.copy(ballWorld).applyMatrix4(camera.matrixWorldInverse); U.uBallV.value.copy(tmp); } } };
}
