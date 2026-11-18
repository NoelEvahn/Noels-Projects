// Heart / love FX: heart mesh, instanced heart fields, love aura, love-wave shock ring, confetti, sparkles.
import * as THREE from 'three';
import { mat, glow, heartGeo, canvasTex, rng, clamp, smooth, add, cyl, sph } from '../util.js';

let _hg;
export const HEART_GEO = () => (_hg ??= heartGeo(0.28, 0.07));

// Single glossy heart (width ~1.2 incl. bevel). color default pink-red.
export function makeHeart(color = 0xff3f7f, size = 1, emissive = 0.35) {
  const m = new THREE.Mesh(HEART_GEO(), new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.0, emissive: color, emissiveIntensity: emissive }));
  m.scale.setScalar(size); m.castShadow = true;
  return m;
}

// Instanced heart field. fn(i) -> {x,y,z,s,ry,rz} or null to hide. Call hf.update(fn) every frame.
export function makeHeartField(count, { color = 0xff3f7f, emissive = 0.5, colors = null } = {}) {
  const im = new THREE.InstancedMesh(HEART_GEO(), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, emissive: color, emissiveIntensity: emissive }), count);
  im.castShadow = false; im.frustumCulled = false;
  const d = new THREE.Object3D(), c = new THREE.Color();
  const pal = colors ?? [color];
  for (let i = 0; i < count; i++) { c.set(pal[i % pal.length]); im.setColorAt(i, c); }
  im.instanceColor.needsUpdate = true;
  im.update = (fn) => {
    for (let i = 0; i < count; i++) {
      const v = fn(i);
      if (!v || v.s <= 0.0001) { d.position.set(0, -999, 0); d.scale.setScalar(0.0001); }
      else { d.position.set(v.x, v.y, v.z); d.rotation.set(v.rx ?? 0, v.ry ?? 0, v.rz ?? 0); d.scale.setScalar(v.s); }
      d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  };
  return im;
}

// Heart above someone's head: pops in with overshoot, bobs. Returns group; call tag.set(tSinceBorn, camera).
export function makeHeartTag(color = 0xff3f7f) {
  const g = new THREE.Group(); const h = makeHeart(color, 1); g.add(h);
  g.set = (age, cam, size = 0.34) => {
    if (age < 0) { g.visible = false; return; }
    g.visible = true;
    const k = age < 0.35 ? (Math.sin(Math.min(1, age / 0.35) * Math.PI * 0.9) * 0.3 + Math.min(1, age / 0.35)) : 1;
    g.scale.setScalar(size * k);
    g.position.y = Math.sin(age * 4) * 0.04;
    if (cam) { const p = new THREE.Vector3(); g.getWorldPosition(p); g.rotation.y = Math.atan2(cam.position.x - p.x, cam.position.z - p.z) - (g.parent ? g.parent.rotation.y : 0); }
    h.rotation.z = Math.sin(age * 3) * 0.12;
  };
  return g;
}

// Pink love aura on the ground (radial additive glow) + optional expanding rings.
export function makeLoveAura(radius = 1.2, color = '255,80,140') {
  const tex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, `rgba(${color},0.9)`); gr.addColorStop(0.55, `rgba(${color},0.35)`); gr.addColorStop(1, `rgba(${color},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.scale.setScalar(radius);
  m.setR = (r, a = 1) => { m.scale.setScalar(r); m.material.opacity = a; };
  return m;
}

// Soft glow billboard sphere (halo) around a point (sprite).
export function makeGlowSprite(color = '255,90,150', size = 2) {
  const tex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(0.4, `rgba(${color},0.4)`); gr.addColorStop(1, `rgba(${color},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  s.scale.setScalar(size); return s;
}

// Love-wave: tall glowing pink ring (open cylinder, vertical gradient) + flung hearts/petals. update(k, t): k=0..1 progress.
export function makeLoveWave({ maxR = 60, height = 9, debris = 160, seed = 7 } = {}) {
  const g = new THREE.Group();
  const tex = canvasTex(8, 128, (c, w, h) => { const gr = c.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,120,180,0.95)'); gr.addColorStop(0.7, 'rgba(255,60,140,0.35)'); gr.addColorStop(1, 'rgba(255,60,140,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const ringM = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96, 1, true), ringM); ring.position.y = 0.5; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, toneMapped: false })); ring2.rotation.x = Math.PI / 2; g.add(ring2);
  const hf = makeHeartField(debris, { colors: [0xff3f7f, 0xff8fb8, 0xffffff, 0xffc2d6], emissive: 0.7 }); g.add(hf);
  const r = rng(seed); const P = []; for (let i = 0; i < debris; i++) P.push({ a: r() * 6.283, d: r.range(-0.12, 0.05), h0: r.range(0.2, 1.6), vy: r.range(0.5, 3.2), s: r.range(0.25, 0.7), sp: r.range(2, 7), ph: r() * 6 });
  g.update = (k, t = 0) => {
    const R = Math.max(0.01, k * maxR);
    ring.scale.set(R, height * (0.35 + 0.65 * Math.min(1, k * 4)), R); ring2.scale.set(R, R, R); ring.visible = ring2.visible = k > 0 && k < 1.2;
    ringM.opacity = 1 - smooth((k - 0.8) / 0.4);
    hf.update((i) => { if (k <= 0) return null; const p = P[i], rr = R * (1 + p.d * 2) + 0.3, tt = k * 3; return { x: Math.cos(p.a) * rr, y: p.h0 + p.vy * tt * 0.6 - tt * tt * 0.9 + 0.5, z: Math.sin(p.a) * rr, s: p.s * (1 - smooth((k - 0.7) / 0.5)), ry: p.a + t * p.sp, rz: Math.sin(t * p.sp + p.ph) * 0.8 }; });
  };
  g.update(0);
  return g;
}

// Deterministic confetti burst: confetti.update(age) positions every piece analytically.
export function makeConfetti(count = 300, { colors = [0xff3f7f, 0xffd23f, 0x4aa0e0, 0x4cd07a, 0xffffff, 0xff8a2b], origin = [0, 0, 0], spread = [3, 7, 3], gravity = 9, size = 0.12, seed = 3 } = {}) {
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.6), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), count);
  im.frustumCulled = false;
  const r = rng(seed), c = new THREE.Color(), d = new THREE.Object3D(), P = [];
  for (let i = 0; i < count; i++) { c.set(colors[i % colors.length]); im.setColorAt(i, c); P.push({ v: [r.range(-1, 1) * spread[0], r.range(0.4, 1) * spread[1], r.range(-1, 1) * spread[2]], w: [r.range(-8, 8), r.range(-8, 8), r.range(-8, 8)], delay: r() * 0.25, s: size * r.range(0.7, 1.4) }); }
  im.instanceColor.needsUpdate = true;
  im.update = (age) => {
    for (let i = 0; i < count; i++) {
      const p = P[i], a = age - p.delay;
      if (a < 0 || a > 4) { d.position.set(0, -999, 0); d.scale.setScalar(0.0001); }
      else { const drag = Math.exp(-a * 0.6); d.position.set(origin[0] + p.v[0] * a * drag, origin[1] + p.v[1] * a * drag - 0.5 * gravity * a * a * 0.35, origin[2] + p.v[2] * a * drag); d.rotation.set(p.w[0] * a, p.w[1] * a, p.w[2] * a); d.scale.setScalar(p.s * (1 - clamp((a - 3) / 1))); }
      d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  };
  im.update(-1);
  return im;
}

// Sparkle points (additive), twinkle driven by t.
export function makeSparkles(count = 120, { area = [6, 3, 6], color = 0xfff0b0, size = 0.12, seed = 11 } = {}) {
  const r = rng(seed); const pos = new Float32Array(count * 3), base = [];
  for (let i = 0; i < count; i++) { base.push([r.range(-1, 1) * area[0], r() * area[1], r.range(-1, 1) * area[2], r() * 6.28]); pos.set(base[i].slice(0, 3), i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,240,180,0.8)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, size, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  pts.frustumCulled = false;
  pts.update = (t) => { const p = geo.attributes.position; for (let i = 0; i < count; i++) p.setY(i, base[i][1] + Math.sin(t * 1.5 + base[i][3]) * 0.3); p.needsUpdate = true; pts.material.size = size * (0.9 + 0.2 * Math.sin(t * 6)); };
  return pts;
}
