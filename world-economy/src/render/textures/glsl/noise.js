// Shared GLSL building blocks for texture recipes (Annex A 5.4): periodic hash/value/Worley noise, fbm, ridged, patterns and
// weathering masks. Every function takes uv in [0,1) and integer frequencies, so baked maps tile seamlessly.
export const NOISE = /* glsl */`
float sat(float x){ return clamp(x, 0.0, 1.0); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p, vec2 per){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(mod(i, per)), b = hash12(mod(i + vec2(1.0, 0.0), per)), c = hash12(mod(i + vec2(0.0, 1.0), per)), d = hash12(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// fbm over uv in [0,1): base frequency f (integer), octaves n
float fbm(vec2 uv, float f, int n){
  float s = 0.0, a = 0.5, t = 0.0;
  for (int i = 0; i < 7; i++){ if (i >= n) break; s += a * vnoise(uv * f + float(i) * 17.31, vec2(f)); t += a; f *= 2.0; a *= 0.5; }
  return s / t;
}
float ridged(vec2 uv, float f, int n){
  float s = 0.0, a = 0.5, t = 0.0;
  for (int i = 0; i < 6; i++){ if (i >= n) break; float v = 1.0 - abs(vnoise(uv * f + float(i) * 9.7, vec2(f)) * 2.0 - 1.0); s += a * v * v; t += a; f *= 2.0; a *= 0.5; }
  return s / t;
}
// periodic Worley: returns (F1, F2, cell hash)
vec3 worley(vec2 uv, float f){
  vec2 p = uv * f, i = floor(p), fr = fract(p);
  float d1 = 9.0, d2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y)); vec2 c = mod(i + g, vec2(f));
    vec2 o = hash22(c); float d = length(g + o - fr);
    if (d < d1){ d2 = d1; d1 = d; id = hash12(c + 7.7); } else if (d < d2) d2 = d;
  }
  return vec3(d1, d2, id);
}
// stretched Worley (cells elongated along x by k)
vec3 worleyS(vec2 uv, vec2 f){
  vec2 p = uv * f, i = floor(p), fr = fract(p);
  float d1 = 9.0, d2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y)); vec2 c = mod(i + g, f);
    vec2 o = hash22(c) * 0.8 + 0.1; float d = length(g + o - fr);
    if (d < d1){ d2 = d1; d1 = d; id = hash12(c + 3.1); } else if (d < d2) d2 = d;
  }
  return vec3(d1, d2, id);
}
// running-bond bricks: cols x rows per tile, mortar width (fraction of a brick height). x = edge distance (0 at mortar), y = cell hash, zw = local
vec4 bricks(vec2 uv, float cols, float rows, float mortar){
  vec2 p = vec2(uv.x * cols, uv.y * rows);
  float r = floor(p.y); p.x += mod(r, 2.0) * 0.5;
  vec2 c = floor(p), f = fract(p);
  float ex = min(f.x, 1.0 - f.x) * (rows / cols) * 3.2, ey = min(f.y, 1.0 - f.y);
  float e = min(ex, ey);
  return vec4(smoothstep(mortar * 0.5, mortar * 0.5 + 0.06, e), hash12(mod(c, vec2(cols, rows))), f);
}
// planks: n boards across v, board length varies; returns (gap mask, board hash, along, across)
vec4 planks(vec2 uv, float n, float lenDiv){
  float b = floor(uv.y * n); float f = fract(uv.y * n);
  float off = hash12(vec2(b, 3.0)); float along = uv.x * lenDiv + off * lenDiv;
  float seg = floor(along); float fa = fract(along);
  float gap = smoothstep(0.0, 0.04, f) * smoothstep(1.0, 0.96, f) * smoothstep(0.0, 0.01, fa) * smoothstep(1.0, 0.99, fa);
  return vec4(gap, hash12(vec2(b, mod(seg, lenDiv)) + 1.3), fa, f);
}
// square tiles with grout (x = mask, y = hash)
vec2 tiles(vec2 uv, float n, float grout){
  vec2 p = uv * n, c = floor(p), f = fract(p); float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  return vec2(smoothstep(grout, grout + 0.02, e), hash12(mod(c, vec2(n))));
}
// weathering: vertical streaks (drips) and blotches
float streaks(vec2 uv, float f){ return fbm(vec2(uv.x, uv.y * 0.08), f, 3) * smoothstep(0.2, 0.9, fbm(uv * vec2(1.0, 0.25), 4.0, 2)); }
float blotch(vec2 uv, float f, float th){ return smoothstep(th, th + 0.15, fbm(uv, f, 4)); }
`;
