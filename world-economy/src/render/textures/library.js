// Texture library (Annex A 5.3): one GLSL recipe per tex.* set. A recipe writes albedo (linear), height (0..1), roughness and
// metalness for uv in [0,1); the baker derives the normal map and AO from the height. C(rrggbb) is an sRGB colour literal.
// `depth` = relief depth in metres (normal strength), `ao` = cavity AO strength.
import { LAYERS, LAYER_LIST } from '../../art/kit/layers.js';

const R = {};
const def = (id, depth, ao, body) => { R[id] = { depth, ao, body }; };

// ---- masonry --------------------------------------------------------------------------------------------------------------
const brick = (base, var1, soot, paint) => /* glsl */`
  vec4 b = bricks(uv, 10.0, 32.0, 0.16);
  float n = fbm(uv, 16.0, 4), fine = vnoise(uv * 256.0, vec2(256.0));
  vec3 col = mix(${base}, ${var1}, b.y) * (0.82 + 0.3 * n) * (0.92 + 0.12 * fine);
  float chip = smoothstep(0.62, 0.8, worley(uv, 40.0).x) * step(0.5, b.y);
  float mortar = 1.0 - b.x;
  vec3 mcol = C(9a958a) * (0.8 + 0.3 * n);
  a = mix(col, mcol, mortar);
  float st = streaks(uv, 24.0);
  a *= 1.0 - ${soot} * smoothstep(0.35, 0.9, fbm(uv, 3.0, 3)) * 0.55;
  a = mix(a, C(d8d2c4), 0.25 * smoothstep(0.55, 0.85, st) * (1.0 - mortar));
  ${paint ? `float pm = smoothstep(0.42, 0.5, fbm(uv, 6.0, 5)); a = mix(a, C(e6e2d8) * (0.9 + 0.1 * n), pm * (1.0 - mortar * 0.6)); r = mix(0.86, 0.6, pm); h = b.x * 0.7 + 0.15 * n - chip * 0.2 + pm * 0.05;` :
  `r = 0.82 + 0.12 * mortar - 0.1 * n; h = b.x * 0.75 + 0.18 * n - chip * 0.25 + fine * 0.05;`}
  m = 0.0;`;
def('tex.brick_red', 0.018, 1.2, brick('C(8e4636)', 'C(a35c44)', '0.6', false));
def('tex.brick_brown', 0.018, 1.2, brick('C(5e3a2c)', 'C(7a4a36)', '0.9', false));
def('tex.brick_painted_white', 0.016, 1.0, brick('C(8a5040)', 'C(9a5a48)', '0.3', true));
def('tex.concrete_cast', 0.006, 0.8, /* glsl */`
  float n = fbm(uv, 6.0, 5), p = smoothstep(0.75, 0.9, worley(uv, 90.0).x);
  vec2 pf = fract(uv * vec2(2.0, 4.0)); float joint = smoothstep(0.0, 0.006, min(pf.x, 1.0 - pf.x)) * smoothstep(0.0, 0.012, min(pf.y, 1.0 - pf.y));
  float tie = 1.0 - smoothstep(0.012, 0.02, length(fract(uv * vec2(4.0, 8.0)) - 0.5) * 0.25);
  float st = streaks(uv, 30.0);
  a = C(a6a39a) * (0.86 + 0.24 * n) * (1.0 - 0.18 * st) * (0.97 + 0.03 * p);
  a *= mix(0.75, 1.0, joint) * (1.0 - 0.25 * tie);
  h = 0.5 + 0.2 * n - 0.3 * (1.0 - joint) - 0.2 * p - 0.3 * tie; r = 0.86 + 0.08 * n; m = 0.0;`);
def('tex.concrete_panel', 0.008, 0.8, /* glsl */`
  float n = fbm(uv, 8.0, 4); vec2 pf = fract(uv * vec2(1.0, 1.0));
  float joint = smoothstep(0.0, 0.01, min(pf.x, 1.0 - pf.x)) * smoothstep(0.0, 0.01, min(pf.y, 1.0 - pf.y));
  float st = streaks(uv, 20.0);
  a = C(c8c4ba) * (0.9 + 0.14 * n) * (1.0 - 0.22 * st) * mix(0.6, 1.0, joint);
  h = 0.6 + 0.1 * n - 0.5 * (1.0 - joint); r = 0.8 + 0.1 * n; m = 0.0;`);
def('tex.stucco', 0.004, 0.6, /* glsl */`
  float n = fbm(uv, 24.0, 5), big = fbm(uv, 3.0, 3), st = streaks(uv, 18.0);
  a = C(dccfb4) * (0.9 + 0.12 * big) * (1.0 - 0.25 * st * smoothstep(0.3, 0.8, big)) * (0.96 + 0.06 * n);
  h = n; r = 0.9; m = 0.0;`);
def('tex.plaster_interior', 0.002, 0.3, /* glsl */`
  float n = fbm(uv, 6.0, 4); a = C(e2ddd2) * (0.94 + 0.08 * n); h = n * 0.5; r = 0.88; m = 0.0;`);
def('tex.stone_fieldstone', 0.06, 1.6, /* glsl */`
  vec3 w = worley(uv, 7.0); float edge = smoothstep(0.02, 0.16, w.y - w.x); float n = fbm(uv, 12.0, 5);
  vec3 sc = mix(C(8a8478), C(6a6258), w.z) * (0.8 + 0.35 * n); sc = mix(sc, C(9a8a6a), smoothstep(0.7, 0.9, w.z) * 0.5);
  a = mix(C(4a463e), sc, edge); h = edge * (0.7 + 0.3 * (1.0 - w.x)) + 0.1 * n; r = mix(0.95, 0.8, edge); m = 0.0;`);
def('tex.curb_stone', 0.004, 0.5, /* glsl */`
  float n = vnoise(uv * 128.0, vec2(128.0)), g = fbm(uv, 4.0, 3);
  a = mix(C(9e9c96), C(6e6c68), n * n) * (0.92 + 0.12 * g); h = n * 0.4 + g * 0.3; r = 0.75 + 0.1 * n; m = 0.0;`);

// ---- roads and ground -------------------------------------------------------------------------------------------------------
const asphalt = (worn) => /* glsl */`
  vec3 w = worley(uv, 180.0); float agg = smoothstep(0.1, 0.45, w.x); float n = fbm(uv, 8.0, 5);
  float crack = smoothstep(${worn ? '0.9' : '0.95'}, 0.99, ridged(uv, 5.0, 4)) * smoothstep(0.4, 0.6, fbm(uv, 3.0, 2));
  float patchm = smoothstep(0.62, 0.66, fbm(uv + 0.37, 2.0, 3));
  float oil = smoothstep(0.7, 0.85, fbm(uv + 0.11, 4.0, 3));
  a = mix(C(5c5d60), C(36383a), agg) * (0.85 + 0.3 * n) * ${worn ? '1.12' : '1.0'};
  a = mix(a, C(2a2b2d), patchm * 0.7); a *= 1.0 - oil * 0.25; a *= 1.0 - crack * 0.6;
  h = 0.6 - 0.25 * agg + 0.1 * n - crack * 0.6 - patchm * 0.05;
  r = 0.92 - 0.08 * agg - 0.25 * oil + 0.05 * crack; m = 0.0;`;
def('tex.asphalt', 0.004, 0.9, asphalt(false));
def('tex.asphalt_worn', 0.005, 1.0, asphalt(true));
def('tex.cobble', 0.03, 1.8, /* glsl */`
  vec3 w = worleyS(uv, vec2(9.0, 14.0)); float top = smoothstep(0.02, 0.22, w.y - w.x); float n = fbm(uv, 16.0, 4);
  vec3 sc = mix(C(7a7068), C(5a524c), w.z) * (0.8 + 0.3 * n); sc = mix(sc, C(8e8478), smoothstep(0.75, 1.0, w.z) * 0.6);
  a = mix(C(3a342c), sc, top); float dome = 1.0 - w.x * 1.4;
  h = top * (0.55 + 0.45 * dome) + 0.06 * n; r = mix(0.95, 0.62 + 0.15 * n, top); m = 0.0;`);
def('tex.paver', 0.012, 1.0, /* glsl */`
  vec2 p = uv * 8.0; vec2 c = floor(p), f = fract(p);
  float hb = mod(c.x + c.y, 2.0); vec2 q = hb > 0.5 ? vec2(f.y, f.x) : f; float half_ = step(0.5, q.x);
  float e = min(min(q.y, 1.0 - q.y), min(abs(q.x - 0.5), min(q.x, 1.0 - q.x)) * 1.0);
  float j = smoothstep(0.02, 0.05, e); float hsh = hash12(mod(c, vec2(8.0)) + half_ * 3.0); float n = fbm(uv, 16.0, 3);
  a = mix(C(4e4a44), mix(C(a0948a), C(8c8076), hsh) * (0.88 + 0.2 * n), j); h = j * 0.8 + 0.1 * n; r = 0.85; m = 0.0;`);
def('tex.grass_ground', 0.01, 0.8, /* glsl */`
  float n = fbm(uv, 6.0, 5), fine = vnoise(uv * vec2(420.0, 140.0), vec2(420.0, 140.0)), blades = vnoise(uv * vec2(160.0, 640.0), vec2(160.0, 640.0));
  float clover = smoothstep(0.55, 0.75, fbm(uv + 0.3, 12.0, 3)); float dirt = smoothstep(0.6, 0.8, fbm(uv + 0.71, 4.0, 4));
  vec3 g = mix(C(4a6a2c), C(6e8a3a), n) * (0.75 + 0.45 * blades); g = mix(g, C(3e6a32), clover * 0.5); g = mix(g, C(8a8a4a), smoothstep(0.6, 0.9, fine) * 0.3);
  a = mix(g, C(6a5a40) * (0.8 + 0.3 * fine), dirt * 0.8); h = 0.5 * blades + 0.3 * n - 0.2 * dirt; r = 0.95 - 0.05 * clover; m = 0.0;`);
def('tex.forest_floor', 0.02, 1.2, /* glsl */`
  float n = fbm(uv, 5.0, 5); vec3 w = worley(uv, 50.0);
  float needles = vnoise(uv * vec2(600.0, 90.0), vec2(600.0, 90.0)) * vnoise(uv.yx * vec2(500.0, 80.0), vec2(500.0, 80.0));
  float moss = smoothstep(0.5, 0.7, fbm(uv + 0.5, 6.0, 4)); float stones = smoothstep(0.25, 0.1, w.x) * step(0.8, w.z);
  vec3 c = mix(C(4a3a28), C(6a5236), needles * 1.6) * (0.75 + 0.4 * n); c = mix(c, C(4e6a2a) * (0.8 + 0.4 * n), moss * 0.85); c = mix(c, C(7a7468), stones);
  a = c; h = 0.4 * n + 0.3 * needles + 0.2 * moss + 0.5 * stones; r = mix(0.95, 0.85, moss); m = 0.0;`);
def('tex.moss', 0.01, 0.8, /* glsl */`
  float n = fbm(uv, 8.0, 5), c = vnoise(uv * 120.0, vec2(120.0)); a = mix(C(3e5a22), C(7a9a3a), n) * (0.8 + 0.3 * c); h = n * 0.7 + c * 0.3; r = 0.95; m = 0.0;`);
def('tex.dirt_track', 0.02, 1.0, /* glsl */`
  float n = fbm(uv, 6.0, 5); vec3 w = worley(uv, 70.0); float peb = smoothstep(0.22, 0.08, w.x);
  float rut = smoothstep(0.08, 0.0, abs(fract(uv.x * 2.0) - 0.28)) + smoothstep(0.08, 0.0, abs(fract(uv.x * 2.0) - 0.72));
  a = mix(C(8a7656), C(6a5840), n) * (1.0 - 0.15 * rut); a = mix(a, C(9a948a) * (0.8 + 0.3 * w.z), peb * 0.7);
  h = 0.5 + 0.2 * n - 0.3 * rut + 0.4 * peb; r = 0.92; m = 0.0;`);
def('tex.mud', 0.02, 1.0, /* glsl */`
  float n = fbm(uv, 5.0, 5), puddle = smoothstep(0.55, 0.62, fbm(uv + 0.2, 3.0, 4));
  float tyre = smoothstep(0.85, 1.0, sin(uv.y * 6.2832 * 40.0) * 0.5 + 0.5) * smoothstep(0.1, 0.0, abs(fract(uv.x * 2.0) - 0.3));
  a = mix(C(5a4a36), C(3e3226), n) * (1.0 - 0.3 * puddle); h = 0.5 + 0.3 * n - 0.4 * puddle - 0.1 * tyre; r = mix(0.85, 0.15, puddle); m = 0.0;`);
def('tex.gravel', 0.02, 1.4, /* glsl */`
  vec3 w = worley(uv, 60.0), w2 = worley(uv + 0.5, 110.0); float s1 = smoothstep(0.45, 0.1, w.x), s2 = smoothstep(0.4, 0.1, w2.x);
  a = mix(C(5a564e), mix(C(9a958a), C(7a7064), w.z), max(s1, s2 * 0.8)) * (0.85 + 0.25 * w2.z); h = max(s1 * (1.0 - w.x), s2 * 0.6); r = 0.9; m = 0.0;`);
def('tex.sand_pale', 0.006, 0.4, /* glsl */`
  float n = fbm(uv, 6.0, 5), g = vnoise(uv * 500.0, vec2(500.0));
  float rip = sin((uv.y + 0.08 * fbm(uv, 4.0, 3)) * 6.2832 * 22.0) * 0.5 + 0.5;
  a = C(e4d4b0) * (0.9 + 0.12 * n) * (0.94 + 0.1 * g); a = mix(a, C(c8b48c), smoothstep(0.6, 0.85, fbm(uv + 0.4, 3.0, 3)) * 0.4);
  h = rip * 0.5 + n * 0.3 + g * 0.2; r = 0.92; m = 0.0;`);
def('tex.sand_lake', 0.008, 0.6, /* glsl */`
  float n = fbm(uv, 6.0, 5), g = vnoise(uv * 300.0, vec2(300.0)); vec3 w = worley(uv, 40.0); float peb = smoothstep(0.2, 0.08, w.x);
  a = mix(C(9a8a6a), C(7a6a4e), n) * (0.88 + 0.2 * g); a = mix(a, C(8a8478), peb); h = n * 0.4 + g * 0.2 + peb * 0.5; r = 0.9; m = 0.0;`);
def('tex.rock_granite', 0.08, 1.4, /* glsl */`
  float rg = ridged(uv, 3.0, 5), n = fbm(uv, 8.0, 5), sp = vnoise(uv * 400.0, vec2(400.0));
  float strata = sin((uv.y + 0.15 * n) * 6.2832 * 7.0) * 0.5 + 0.5;
  float lichen = smoothstep(0.62, 0.7, fbm(uv + 0.9, 10.0, 4));
  a = mix(C(8e8c84), C(6a6862), rg) * (0.8 + 0.3 * n) * (0.9 + 0.2 * sp); a *= 0.9 + 0.1 * strata;
  a = mix(a, C(a8a87a), lichen * 0.5); a = mix(a, C(5a6a3a), smoothstep(0.7, 0.78, fbm(uv + 0.3, 6.0, 4)) * 0.5);
  h = rg * 0.7 + n * 0.25 + sp * 0.05; r = 0.88 - 0.1 * sp; m = 0.0;`);
def('tex.rock_dark', 0.06, 1.4, /* glsl */`
  float rg = ridged(uv, 4.0, 5), n = fbm(uv, 10.0, 4); vec3 w = worley(uv, 30.0); float pit = smoothstep(0.15, 0.05, w.x);
  a = mix(C(46423e), C(2a2826), rg) * (0.85 + 0.3 * n); h = rg * 0.8 + n * 0.2 - pit * 0.4; r = 0.7 - 0.25 * smoothstep(0.4, 0.8, n); m = 0.0;`);
def('tex.snow_rock', 0.05, 1.0, /* glsl */`
  float rg = ridged(uv, 3.0, 5), n = fbm(uv, 6.0, 5); float snow = smoothstep(0.42, 0.55, n + rg * 0.3);
  a = mix(C(6a6864) * (0.8 + 0.3 * rg), C(eef0f4), snow); h = rg * 0.6 + snow * 0.4; r = mix(0.85, 0.6, snow); m = 0.0;`);

// ---- glass and metals ---------------------------------------------------------------------------------------------------------
def('tex.glass_curtain', 0.01, 0.6, /* glsl */`
  vec2 g = fract(uv * vec2(2.0, 1.0)); float mx = min(g.x, 1.0 - g.x), my = min(g.y, 1.0 - g.y);
  float frame = 1.0 - smoothstep(0.012, 0.02, min(mx * 0.5, my)); float sp = step(0.82, g.y) * (1.0 - frame) * (1.0 - step(0.9, g.y));
  float dirt = fbm(uv, 8.0, 3) * smoothstep(0.25, 0.0, my);
  a = mix(C(2e3e52), C(3a3e44), frame); a = mix(a, C(26323e), sp);
  h = frame * 0.8 + hash12(floor(uv * vec2(2.0, 1.0))) * 0.05; r = mix(0.05 + 0.25 * dirt, 0.45, frame); m = mix(0.9, 0.85, frame);`);
def('tex.glass_window', 0.002, 0.2, /* glsl */`
  float n = fbm(uv, 4.0, 4), s = fbm(uv * vec2(1.0, 3.0), 8.0, 3);
  a = C(2a3440) * (0.9 + 0.2 * n); h = 0.5; r = 0.04 + 0.22 * smoothstep(0.45, 0.8, s) + 0.1 * n; m = 0.9;`);
def('tex.metal_painted', 0.004, 0.6, /* glsl */`
  float n = fbm(uv, 8.0, 4); float wear = smoothstep(0.66, 0.72, fbm(uv + 0.2, 10.0, 5));
  float rv = 1.0 - smoothstep(0.02, 0.04, length(fract(uv * vec2(16.0, 2.0)) - 0.5) * 0.4);
  a = mix(C(cdcdcd) * (0.92 + 0.1 * n), C(6a5a4e), wear); h = 0.5 + 0.1 * n - 0.2 * wear + 0.4 * rv * step(0.9, fract(uv.y * 2.0)); r = mix(0.45 + 0.15 * n, 0.7, wear); m = 0.0;`);
def('tex.metal_galvanized', 0.002, 0.4, /* glsl */`
  vec3 w = worley(uv, 24.0); float n = fbm(uv, 6.0, 4);
  a = mix(C(a8acb0), C(8a8e92), w.z) * (0.9 + 0.15 * n); a = mix(a, C(6a6a62), smoothstep(0.6, 0.85, fbm(uv, 3.0, 3)) * 0.3); h = w.z * 0.3; r = 0.45 + 0.2 * w.z; m = 0.85;`);
def('tex.metal_corrugated', 0.035, 1.0, /* glsl */`
  float prof = sin(uv.x * 6.2832 * 26.0) * 0.5 + 0.5; float n = fbm(uv, 6.0, 4);
  float rust = smoothstep(0.55, 0.75, streaks(vec2(floor(uv.x * 26.0) / 26.0 + uv.x * 0.1, uv.y), 12.0) + 0.25 * smoothstep(0.85, 1.0, fract(uv.y * 4.0) ));
  a = mix(C(a2a6a8) * (0.85 + 0.2 * n), C(7a4a2a), rust * 0.8); h = prof; r = mix(0.5, 0.85, rust); m = mix(0.75, 0.1, rust);`);
def('tex.metal_checker', 0.004, 0.6, /* glsl */`
  vec2 p = uv * 10.0; vec2 c = floor(p), f = fract(p) - 0.5; float odd = mod(c.x + c.y, 2.0);
  vec2 q = odd > 0.5 ? vec2(f.x + f.y, f.x - f.y) : vec2(f.x - f.y, f.x + f.y);
  float bump = smoothstep(0.12, 0.06, abs(q.y) * 0.9) * smoothstep(0.45, 0.3, abs(q.x)); float n = fbm(uv, 8.0, 3);
  a = C(8a8c8e) * (0.85 + 0.2 * n); h = bump; r = 0.45 + 0.2 * n; m = 0.9;`);
def('tex.metal_aluminium', 0.003, 0.4, /* glsl */`
  float br = vnoise(uv * vec2(4.0, 600.0), vec2(4.0, 600.0)); float dent = fbm(uv, 4.0, 3);
  a = C(bcc0c4) * (0.92 + 0.1 * br); h = dent * 0.6 + br * 0.1; r = 0.3 + 0.15 * br; m = 0.95;`);
def('tex.rust', 0.01, 1.0, /* glsl */`
  float n = fbm(uv, 6.0, 6), p = smoothstep(0.75, 0.9, worley(uv, 60.0).x);
  a = mix(C(8a4a22), C(5a3018), n) * (0.85 + 0.3 * vnoise(uv * 200.0, vec2(200.0))); a = mix(a, C(b06a30), smoothstep(0.6, 0.8, n) * 0.4); h = n - p * 0.3; r = 0.9; m = 0.2;`);
def('tex.paint_chipped', 0.006, 0.8, /* glsl */`
  float n = fbm(uv, 6.0, 5), chip = smoothstep(0.62, 0.66, fbm(uv + 0.4, 8.0, 6)), deep = smoothstep(0.72, 0.76, fbm(uv + 0.4, 8.0, 6));
  float st = streaks(uv, 16.0);
  a = C(d2d2d2) * (0.9 + 0.1 * n) * (1.0 - 0.25 * st); a = mix(a, C(8a8a80), chip); a = mix(a, C(7a3a1a), deep);
  h = 0.6 - 0.25 * chip - 0.2 * deep; r = mix(0.5, 0.85, chip); m = 0.0;`);
def('tex.carpaint_flake', 0.0008, 0.0, /* glsl */`
  float f = vnoise(uv * 512.0, vec2(512.0)); a = C(d4d4d4); h = f; r = 0.3; m = 0.0;`);
def('tex.plastic', 0.001, 0.2, /* glsl */`
  float f = vnoise(uv * 200.0, vec2(200.0)); a = C(d0d0d0) * (0.97 + 0.04 * f); h = f; r = 0.5; m = 0.0;`);
def('tex.rubber_tire', 0.01, 0.8, /* glsl */`
  float tread = step(0.5, fract(uv.y * 16.0 + step(0.5, uv.x) * 0.5)) * step(0.2, abs(uv.x - 0.5)) + step(0.06, abs(fract(uv.x * 4.0) - 0.5)) * 0.0;
  a = C(1e1e20) * (0.9 + 0.2 * fbm(uv, 8.0, 3)); h = tread; r = 0.88; m = 0.0;`);
def('tex.leather', 0.002, 0.4, /* glsl */`
  vec3 w = worley(uv, 60.0); a = C(4a3426) * (0.85 + 0.25 * fbm(uv, 4.0, 3)); h = smoothstep(0.0, 0.5, w.x); r = 0.6; m = 0.0;`);

// ---- wood ---------------------------------------------------------------------------------------------------------------------
const wood = (c1, c2, gap, grey, n) => /* glsl */`
  vec4 p = planks(uv, ${n}, 2.0); float grain = vnoise(vec2(p.z * 6.0, p.w * 40.0 + p.y * 9.0) , vec2(6.0, 999.0));
  float rings = sin((p.w * 8.0 + fbm(vec2(p.z, p.w + p.y), 6.0, 3) * 3.0) * 6.2832 * 2.0) * 0.5 + 0.5;
  float knot = smoothstep(0.06, 0.0, length((vec2(p.z, p.w) - vec2(hash12(vec2(p.y, 1.0)), 0.5)) * vec2(3.0, 1.0))) * step(0.6, p.y);
  float nail = smoothstep(0.03, 0.015, length((vec2(fract(p.z * 4.0), p.w) - vec2(0.5)) * vec2(0.6, 1.0)));
  vec3 col = mix(${c1}, ${c2}, p.y) * (0.8 + 0.25 * rings) * (0.9 + 0.15 * grain);
  col = mix(col, col * 0.55, knot);
  ${grey ? 'col = mix(col, vec3(dot(col, vec3(0.33))) * 1.05, 0.45);' : ''}
  float split = smoothstep(0.985, 1.0, vnoise(vec2(p.z * 30.0, p.w * 4.0 + p.y * 17.0), vec2(30.0, 999.0)));
  a = mix(C(16120e), col * (1.0 - 0.5 * split), p.x);
  a = mix(a, C(3a3a3a), nail * 0.8);
  h = p.x * (0.6 + 0.2 * rings + 0.1 * grain) - split * 0.3; r = 0.82 + 0.1 * grain; m = nail * 0.6;`;
def('tex.wood_planks', 0.01, 1.2, wood('C(8a6a46)', 'C(6e5236)', 1, false, '8.0'));
def('tex.wood_weathered_dark', 0.014, 1.4, wood('C(5a4c3e)', 'C(3e342a)', 1, true, '7.0'));
def('tex.planks_wall', 0.01, 1.2, wood('C(a07a52)', 'C(8a6440)', 1, false, '10.0'));
def('tex.wood_painted', 0.008, 1.0, /* glsl */`
  vec4 p = planks(uv, 8.0, 1.0); float chip = smoothstep(0.62, 0.68, fbm(uv + 0.3, 10.0, 5)); float n = fbm(uv, 6.0, 4);
  vec3 wcol = C(6a5236) * (0.8 + 0.3 * vnoise(vec2(p.z * 6.0, p.w * 30.0 + p.y * 9.0), vec2(6.0, 999.0)));
  a = mix(C(dcdcd8) * (0.9 + 0.1 * n), wcol, chip); a = mix(C(2a241e), a, p.x); h = p.x * 0.7 - chip * 0.2 + 0.1 * n; r = mix(0.55, 0.85, chip); m = 0.0;`);
def('tex.log_round', 0.06, 1.4, /* glsl */`
  float v = fract(uv.y * 3.0); float prof = sqrt(max(0.0, 1.0 - pow(v * 2.0 - 1.0, 2.0)));
  float grain = vnoise(vec2(uv.x * 4.0, uv.y * 120.0), vec2(4.0, 120.0)); float chk = smoothstep(0.97, 1.0, vnoise(vec2(uv.x * 40.0, uv.y * 3.0 * 6.0), vec2(40.0, 18.0)));
  a = mix(C(6e5034), C(9a7448), prof) * (0.85 + 0.2 * grain) * (1.0 - 0.4 * chk); a = mix(C(2a2018), a, smoothstep(0.0, 0.25, prof));
  h = prof * 0.9 + grain * 0.1 - chk * 0.2; r = 0.85; m = 0.0;`);
def('tex.bark_pine', 0.05, 1.6, /* glsl */`
  vec3 w = worleyS(uv, vec2(5.0, 10.0)); float plate = smoothstep(0.0, 0.25, w.y - w.x); float n = fbm(uv, 8.0, 4);
  a = mix(C(2a1e16), mix(C(6a4a34), C(8a6448), w.z) * (0.8 + 0.3 * n), plate); h = plate * (0.7 + 0.3 * n); r = 0.92; m = 0.0;`);
def('tex.bark_oak', 0.06, 1.8, /* glsl */`
  float f = ridged(vec2(uv.x, uv.y * 0.25), 8.0, 4); float n = fbm(uv, 10.0, 4); float moss = smoothstep(0.55, 0.75, fbm(uv + 0.2, 4.0, 3));
  a = mix(C(2e2820), C(645a4a), f) * (0.8 + 0.3 * n); a = mix(a, C(4e6a2a), moss * 0.6); h = f * 0.8 + n * 0.2; r = 0.93; m = 0.0;`);
def('tex.bark_palm', 0.03, 1.2, /* glsl */`
  float ring = fract(uv.y * 6.0 + 0.1 * fbm(uv, 4.0, 2)); float sc = smoothstep(0.0, 0.15, ring) * smoothstep(1.0, 0.7, ring); float n = fbm(uv, 8.0, 4);
  a = mix(C(5a4a3a), C(9a8468), sc) * (0.85 + 0.25 * n); h = sc; r = 0.9; m = 0.0;`);

// ---- roofs -------------------------------------------------------------------------------------------------------------------
def('tex.roof_shingle', 0.02, 1.2, /* glsl */`
  float row = floor(uv.y * 12.0); float fy = fract(uv.y * 12.0); float x = uv.x * 8.0 + mod(row, 2.0) * 0.5; float fx = fract(x);
  float hsh = hash12(vec2(mod(floor(x), 8.0), row)); float n = fbm(uv, 16.0, 4);
  float edge = smoothstep(0.0, 0.05, fx) * smoothstep(1.0, 0.95, fx);
  a = mix(C(3e3836), C(5a5250), hsh) * (0.85 + 0.3 * n) * mix(0.5, 1.0, edge); a = mix(a, C(4e6a2a), smoothstep(0.65, 0.8, fbm(uv, 4.0, 4)) * 0.4);
  h = fy * 0.8 * edge + 0.1 * n; r = 0.9; m = 0.0;`);
def('tex.roof_metal_red', 0.02, 1.0, /* glsl */`
  float s = fract(uv.x * 5.0); float seam = smoothstep(0.04, 0.0, abs(s - 0.5) - 0.0) ; float n = fbm(uv, 6.0, 4);
  float rust = smoothstep(0.6, 0.85, streaks(uv, 10.0) + seam * 0.4) ;
  a = mix(C(9a3a2a) * (0.85 + 0.25 * n), C(6a3a20), rust * 0.7); a = mix(a, a * 1.25, smoothstep(0.4, 0.8, fbm(uv + 0.5, 3.0, 3)) * 0.4);
  h = 0.4 + seam * 0.6; r = mix(0.6, 0.85, rust); m = mix(0.5, 0.1, rust);`);
def('tex.roof_tile', 0.04, 1.4, /* glsl */`
  float x = uv.x * 10.0; float fy = fract(uv.y * 8.0); float row = floor(uv.y * 8.0); float barrel = sin(fract(x) * 3.1416);
  float hsh = hash12(vec2(mod(floor(x), 10.0), row)); float n = fbm(uv, 8.0, 4);
  a = mix(C(a85434), C(c06a44), hsh) * (0.8 + 0.3 * n) * (0.7 + 0.3 * barrel) * mix(0.7, 1.0, smoothstep(0.0, 0.2, fy));
  h = barrel * 0.7 + fy * 0.3; r = 0.85; m = 0.0;`);

// ---- fabrics, interiors -----------------------------------------------------------------------------------------------------------
def('tex.fabric_canvas', 0.002, 0.4, /* glsl */`
  float wv = vnoise(uv * vec2(256.0, 256.0), vec2(256.0)) * 0.5 + 0.5 * (sin(uv.x * 6.2832 * 128.0) * sin(uv.y * 6.2832 * 128.0));
  float n = fbm(uv, 4.0, 3); a = C(ece8de) * (0.9 + 0.1 * wv) * (0.9 + 0.1 * n); h = wv; r = 0.9; m = 0.0;`);
def('tex.fabric_cloth', 0.001, 0.3, /* glsl */`
  float wv = 0.5 + 0.5 * sin(uv.x * 6.2832 * 200.0) * sin(uv.y * 6.2832 * 200.0); a = C(dadada) * (0.9 + 0.1 * wv); h = wv; r = 0.92; m = 0.0;`);
def('tex.tile_floor', 0.004, 0.8, /* glsl */`
  vec2 t = tiles(uv, 4.0, 0.02); float n = fbm(uv, 8.0, 3); float chk = mod(floor(uv.x * 4.0) + floor(uv.y * 4.0), 2.0);
  a = mix(C(6a665e), mix(C(e0dcd2), C(2e2e30), chk * 0.0) * (0.92 + 0.1 * t.y + 0.05 * n), t.x); h = t.x * 0.6; r = mix(0.9, 0.25, t.x); m = 0.0;`);

// ---- water, effects, utility -------------------------------------------------------------------------------------------------------
def('tex.water_normal_a', 0.12, 0.0, /* glsl */`
  float hh = 0.0; for (int i = 0; i < 6; i++){ float fi = float(i); vec2 d = vec2(cos(fi * 2.1 + 0.3), sin(fi * 2.1 + 0.3)); vec2 k = floor(d * (3.0 + fi * 2.0) + 0.5);
    hh += sin(6.2832 * dot(uv, k) + fi * 1.7) / (1.0 + fi * 0.6); }
  hh = hh * 0.12 + 0.5 + 0.25 * (fbm(uv, 8.0, 4) - 0.5); a = vec3(0.5); h = hh; r = 0.05; m = 0.0;`);
def('tex.water_normal_b', 0.1, 0.0, /* glsl */`
  float hh = 0.0; for (int i = 0; i < 5; i++){ float fi = float(i); vec2 d = vec2(cos(fi * 1.37 + 1.1), sin(fi * 1.37 + 1.1)); vec2 k = floor(d * (2.0 + fi * 1.5) + 0.5);
    hh += sin(6.2832 * dot(uv, k) + fi * 2.3) / (1.0 + fi * 0.5); }
  hh = hh * 0.12 + 0.5 + 0.3 * (fbm(uv, 4.0, 5) - 0.5); a = vec3(0.5); h = hh; r = 0.05; m = 0.0;`);
def('tex.foam', 0.004, 0.0, /* glsl */`
  vec3 w = worley(uv, 16.0), w2 = worley(uv + 0.3, 40.0); float f = smoothstep(0.05, 0.0, w.y - w.x - 0.02) + 0.6 * smoothstep(0.06, 0.0, w2.y - w2.x - 0.02);
  f *= smoothstep(0.3, 0.6, fbm(uv, 4.0, 3)); a = vec3(sat(f) * 0.95 + 0.02); h = f; r = 0.6; m = 0.0;`);
def('tex.caustics', 0.0, 0.0, /* glsl */`
  vec3 w = worley(uv, 10.0); float c = pow(sat(1.0 - (w.y - w.x) * 3.0), 3.0); a = vec3(c); h = c; r = 0.5; m = 0.0;`);
def('tex.cloud_noise', 0.0, 0.0, /* glsl */`
  float f = fbm(uv, 4.0, 6); vec3 w = worley(uv, 6.0); float c = f * 0.7 + (1.0 - w.x) * 0.3;
  a = vec3(c, fbm(uv + 0.37, 8.0, 5), 1.0 - worley(uv, 12.0).x); h = c; r = 0.5; m = 0.0;`);
def('tex.noise_shared', 0.0, 0.0, /* glsl */`
  float v = vnoise(uv * 32.0, vec2(32.0)); float wo = worley(uv, 16.0).x; float bn = hash12(floor(uv * 256.0)); float fb = fbm(uv, 4.0, 6);
  a = vec3(v, wo, bn); h = fb; r = fb; m = 0.0;`);
def('tex.flat', 0.0, 0.0, /* glsl */`
  float n = vnoise(uv * 64.0, vec2(64.0)); a = vec3(0.8) * (0.97 + 0.04 * n); h = n * 0.2; r = 0.7; m = 0.0;`);

/** returns the full list of recipes in layer order (missing recipes fall back to tex.flat and fail the texture test) */
export const RECIPES = R;
export function recipeFor(id) { return R[id] || R['tex.flat']; }
export function missingRecipes() { return LAYER_LIST.filter((l) => !R[l.id]).map((l) => l.id); }
/** C(rrggbb) -> linear vec3 literal */
export function expandColours(src) {
  return src.replace(/C\(([0-9a-fA-F]{6})\)/g, (_, h) => {
    const v = parseInt(h, 16), f = (c) => Math.pow(c / 255, 2.2).toFixed(4);
    return `vec3(${f((v >> 16) & 255)}, ${f((v >> 8) & 255)}, ${f(v & 255)})`;
  });
}
export { LAYERS };
