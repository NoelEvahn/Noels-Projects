// Shared helpers for the 'nature' pack: seeded noise, heightfield meshes, instancing, wind sway, animated water material.
// Everything is geometry + vertex colours + tiny shaders (no textures). Deterministic: animation = pure function of a time uniform.
import * as THREE from 'three';
import { rng } from '../util.js';

// ---------- noise (integer-hash value noise, no tables, no Math.random) ----------
export const hash2 = (x, y, s = 1) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
export function noise2(x, y, s = 1) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
export function fbm(x, y, s = 1, oct = 5, gain = 0.5, lac = 2.03) { let a = 0.5, f = 1, sum = 0, n = 0; for (let i = 0; i < oct; i++) { sum += a * noise2(x * f + i * 17.3, y * f - i * 9.1, s + i); n += a; a *= gain; f *= lac; } return sum / n; }
export function ridge(x, y, s = 1, oct = 5) { let a = 0.5, f = 1, sum = 0, n = 0, w = 1; for (let i = 0; i < oct; i++) { let v = 1 - Math.abs(2 * noise2(x * f + i * 31.7, y * f + i * 5.3, s + i) - 1); v *= v; v *= w; w = Math.min(1, Math.max(0, v * 1.6)); sum += v * a; n += a; a *= 0.5; f *= 2.05; } return sum / n; }
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;

// ---------- geometry helpers ----------
// merge several geometries (any indexed/non-indexed) into one non-indexed geometry with position, normal, color. part = {g, color?, m?: Matrix4}
export function mergeGeos(parts) {
  const geos = parts.map(({ g, color, m }) => {
    const n = g.index ? g.toNonIndexed() : g.clone(); if (m) n.applyMatrix4(m);
    if (!n.attributes.normal) n.computeVertexNormals();
    const cnt = n.attributes.position.count, a = new Float32Array(cnt * 3);
    if (color !== undefined) { const c = new THREE.Color(color); for (let i = 0; i < cnt; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } }
    else if (n.attributes.color) a.set(n.attributes.color.array); else a.fill(1);
    n.setAttribute('color', new THREE.BufferAttribute(a, 3)); return n;
  });
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'color']) {
    const total = geos.reduce((s, g) => s + g.attributes[k].array.length, 0), arr = new Float32Array(total); let o = 0;
    for (const g of geos) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
    out.setAttribute(k, new THREE.BufferAttribute(arr, 3));
  }
  return out;
}
// recolour a geometry's vertices: fn(x, y, z, colorOut, i)
export function paint(g, fn) {
  const p = g.attributes.position, a = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), c, i); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
export const mtx = (x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) => {
  const o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); o.updateMatrix(); return o.matrix.clone();
};
// heightfield: w x d metres centred on (cx, cz), nx x nz cells. fn(x,z)->height. color(x,z,h,ny,c) sets vertex colour (ny = normal.y, 1 = flat).
export function terrainGeo({ w, d, nx, nz, fn, color, cx = 0, cz = 0 }) {
  const g = new THREE.PlaneGeometry(w, d, nx, nz); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, fn(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  if (color) {
    const n = g.attributes.normal, a = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { c.setRGB(1, 1, 1); color(p.getX(i), p.getZ(i), p.getY(i), n.getY(i), c, n.getX(i), n.getZ(i)); a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  }
  return g;
}
export const vcMat = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.92, metalness: 0, flatShading: !!o.flat, side: o.side ?? THREE.FrontSide, transparent: o.opacity !== undefined && o.opacity < 1, opacity: o.opacity ?? 1, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1 });
export function mesh(geo, material, { cast = false, receive = true, pos, ry } = {}) { const m = new THREE.Mesh(geo, material); m.castShadow = cast; m.receiveShadow = receive; if (pos) m.position.set(...pos); if (ry) m.rotation.y = ry; return m; }
// instanced mesh from [{x,y,z,s,sx,sy,sz,ry,rx,rz,col}]
export function instanced(geo, material, list, { cast = false, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, list.length)), c = new THREE.Color(), o = new THREE.Object3D();
  im.count = list.length;
  list.forEach((p, i) => {
    o.position.set(p.x, p.y, p.z); o.rotation.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
    const s = p.s ?? 1; o.scale.set(p.sx ?? s, p.sy ?? s, p.sz ?? s); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    if (p.col !== undefined) im.setColorAt(i, c.set(p.col));
  });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = cast; im.receiveShadow = receive; im.frustumCulled = false; return im;
}
// preview helper: wrap a real-scale asset in a scaled group (the viewer camera far plane is 2000, real mountains are 10+ km). userData stays real.
export function scaled(obj, k) { const g = new THREE.Group(); g.add(obj); g.scale.setScalar(k); g.userData = { ...obj.userData, scale: k }; return g; }
export const uni = (v = 0) => ({ value: v });

// ---------- wind sway (vertex shader; pure function of the time uniform U) ----------
// amp: tip displacement as a fraction of height h (metres). A gust wave travels across the field along `dir` so a whole forest visibly ripples.
export function sway(m, U, { amp = 0.05, h = 1, dir = [1, 0.3], k = 0.06, speed = 1.5, flutter = 0 } = {}) {
  const dl = Math.hypot(dir[0], dir[1]) || 1, dx = dir[0] / dl, dz = dir[1] / dl;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = U;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 ip = vec3(0.0);
      #endif
      float hk = clamp(position.y / ${h.toFixed(3)}, 0.0, 1.5); hk *= hk;
      float gw = sin(uT * ${speed.toFixed(3)} + (ip.x * ${dx.toFixed(3)} + ip.z * ${dz.toFixed(3)}) * ${k.toFixed(4)}) + 0.45 * sin(uT * ${(speed * 2.7).toFixed(3)} + ip.x * 0.31 + ip.z * 0.47);
      transformed.x += (${dx.toFixed(3)} * gw + ${dz.toFixed(3)} * 0.3 * cos(uT * ${(speed * 1.3).toFixed(3)} + ip.z * 0.2)) * ${(amp * h).toFixed(4)} * hk;
      transformed.z += (${dz.toFixed(3)} * gw - ${dx.toFixed(3)} * 0.3 * cos(uT * ${(speed * 1.3).toFixed(3)} + ip.x * 0.2)) * ${(amp * h).toFixed(4)} * hk;
      ${flutter ? `transformed.y += sin(uT * 6.0 + position.x * 9.0 + position.z * 7.0 + ip.x) * ${flutter.toFixed(4)} * hk;` : ''}`);
  };
  m.customProgramCacheKey = () => `sway${amp}${h}${dx}${dz}${k}${speed}${flutter}`;
  return m;
}

// ---------- animated water (vertex displacement + analytic normals + crest foam tint; vertex colours give depth/shore tint) ----------
// waves: [[dirX, dirZ, amplitude m, wavelength m, speed m/s], ...]. Time uniform U.
export function waterMaterial(U, { color = 0x35b6e6, foam = 0xffffff, waves = [[1, 0.3, 0.4, 14, 3], [0.4, 1, 0.25, 8, 2.4]], foamAt = 0.55, foamAmt = 0.75, rough = 0.18, opacity = 1, vertexColors = true, metal = 0.0, emissive = 0x000000, emissiveIntensity = 0 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, vertexColors, transparent: opacity < 1, opacity, side: THREE.DoubleSide, emissive, emissiveIntensity });
  const amax = waves.reduce((s, w) => s + w[2], 0) || 1;
  const code = waves.map(([dx, dz, a, L, sp]) => { const l = Math.hypot(dx, dz) || 1, k = TAU / L; return `{ float ph = ${(k * dx / l).toFixed(5)} * position.x + ${(k * dz / l).toFixed(5)} * position.z - ${(sp * k).toFixed(5)} * uT; wH += ${a.toFixed(4)} * sin(ph); wG += ${(a * k).toFixed(5)} * cos(ph) * vec2(${(dx / l).toFixed(4)}, ${(dz / l).toFixed(4)}); }`; }).join('\n');
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = U; sh.uniforms.uFoam = { value: new THREE.Color(foam) };
    sh.vertexShader = 'uniform float uT; varying float vCrest;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `float wH = 0.0; vec2 wG = vec2(0.0);\n${code}\nvec3 objectNormal = normalize(vec3(-wG.x, 1.0, -wG.y));\n#ifdef USE_TANGENT\n vec3 objectTangent = vec3(tangent.xyz);\n#endif`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position); transformed.y += wH; vCrest = wH / ${amax.toFixed(4)};`);
    sh.fragmentShader = 'uniform vec3 uFoam; varying float vCrest;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= 0.88 + 0.22 * vCrest;
      diffuseColor.rgb = mix(diffuseColor.rgb, uFoam, smoothstep(${foamAt.toFixed(3)}, ${(foamAt + 0.25).toFixed(3)}, vCrest) * ${foamAmt.toFixed(3)});`);
  };
  m.customProgramCacheKey = () => 'water' + code + foamAt + foamAmt;
  return m;
}
// water height function in JS (same sines) so floating things (boats, ducks, icebergs) can bob in sync with the shader
export function waveHeight(waves, x, z, t) { let h = 0; for (const [dx, dz, a, L, sp] of waves) { const l = Math.hypot(dx, dz) || 1, k = TAU / L; h += a * Math.sin(k * (dx / l * x + dz / l * z) - sp * k * t); } return h; }
export function waveSlope(waves, x, z, t) { let gx = 0, gz = 0; for (const [dx, dz, a, L, sp] of waves) { const l = Math.hypot(dx, dz) || 1, k = TAU / L, c = a * k * Math.cos(k * (dx / l * x + dz / l * z) - sp * k * t); gx += c * dx / l; gz += c * dz / l; } return [gx, gz]; }

export { rng };

// polar grid disc (no long fan triangles, so vertex-displaced water stays smooth): rings x segs, lying in XZ
export function discGeo(R, rings = 24, segs = 72) {
  const pos = [0, 0, 0], idx = [];
  for (let i = 1; i <= rings; i++) { const rr = R * i / rings; for (let j = 0; j < segs; j++) { const a = j / segs * TAU; pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr); } }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + (j + 1) % segs, 1 + j);
  for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) { const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + (j + 1) % segs, c = 1 + i * segs + j, d = 1 + i * segs + (j + 1) % segs; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
