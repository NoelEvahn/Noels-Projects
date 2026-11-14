// Renderer facade (Stage 3): WebGL2 renderer, texture library bake, MatLib, lighting/CSM, sky + environment, water, far proxy,
// chunk streaming, vegetation, entity views, particles/decals and the post pipeline. Quality changes arrive through the
// adapter (quality.setAdapter): expensive work (texture re-bake, shadow-map resize, chunk rebuild) is queued and time-sliced.
import * as THREE from 'three';
import '../blockout/index.js';
import '../art/index.js';
import { World } from '../world/query.js';
import { MatLib } from './materials/matlib.js';
import { createTexBaker } from './textures/texbaker.js';
import { makeLeafAtlas, makeParticleAtlas, makeDecalAtlas } from './textures/canvasTex.js';
import { buildWater } from './water.js';
import { buildFar } from './far.js';
import { createSky } from './sky.js';
import { createLighting } from './lighting.js';
import { createPipeline } from './pipeline.js';
import { createChunkManager } from './chunkManager.js';
import { createVegetation } from './vegetation.js';
import { createEntityViews } from './entityViews.js';
import { createEffects } from './effects.js';
import { Streaming } from './streaming.js';
import { MemTracker } from './perf.js';
import { regionAt } from '../world/layout/regions.js';
import { ARCHETYPES } from '../world/archetypes.js';

export function createRenderer({ canvas, settings, perf, quality, onRendererString }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, preserveDrawingBuffer: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.info.autoReset = false;
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  perf.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  perf.software = /SwiftShader|llvmpipe|Software/i.test(perf.renderer);
  if (onRendererString) onRendererString(perf.renderer);
  const derived0 = quality.derived();

  // ---- texture library (boot bake) and canvas atlases ----------------------------------------------------------------------------------
  const t0 = performance.now();
  const baker = createTexBaker(renderer);
  const texSizes = (d) => ({ H: d.textures.H.slice(), S: d.textures.S, D: d.textures.D, anisotropy: d.textures.anisotropy });
  baker.onPublish = () => { const u = baker.uniforms; for (const k of ['tHA', 'tHD', 'tSA', 'tSD', 'tDA', 'tDD']) MatLib.G[k].value = u[k].value; };
  baker.start(texSizes(derived0));
  const bakeMs = baker.bakeAll();
  const atlasN = derived0.textures.atlas;
  const leaf = makeLeafAtlas(Math.min(1024, atlasN)), particles = makeParticleAtlas(512), decals = makeDecalAtlas(512);
  MatLib.init({ leaf, particles, decals });
  const marks = { textureBakeMs: Math.round(bakeMs), atlasMs: Math.round(performance.now() - t0 - bakeMs) };

  // ---- scene ---------------------------------------------------------------------------------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.matrixWorldAutoUpdate = true;
  const camera = new THREE.PerspectiveCamera(settings.graphics.fov, 16 / 9, 0.4, 9000);
  const lighting = createLighting({ scene, camera, renderer });
  const sky = createSky(scene, renderer);
  let tf = performance.now();
  const water = buildWater(scene);
  const far = buildFar(scene);
  marks.farMs = Math.round(performance.now() - tf);
  let derived = derived0;
  const detailRadius = () => (derived.lodBias >= 1.2 ? 2 : 1);
  const chunks = createChunkManager({ scene, far, getRadii: () => [Math.min(detailRadius(), derived.chunkRadii[0]), derived.chunkRadii[0], derived.chunkRadii[1]] });
  const veg = createVegetation({ scene, renderer });
  const views = createEntityViews(scene);
  const fx = createEffects({ scene, camera });
  const pipeline = createPipeline(renderer, perf);

  // shadow-pass counters: wrap the shadow map renderer so its draws are reported separately (Annex G 5)
  const sm = renderer.shadowMap, smRender = sm.render;
  const shadowCounter = { calls: 0, tris: 0 };
  sm.render = function (lights, sc, cam) { const c0 = renderer.info.render.calls, tr0 = renderer.info.render.triangles; smRender.call(sm, lights, sc, cam); shadowCounter.calls += renderer.info.render.calls - c0; shadowCounter.tris += renderer.info.render.triangles - tr0; };

  let w = 0, h = 0, applying = 0;
  const api = { renderer, scene, camera, sky, water, far, chunks, views, veg, fx, lighting, pipeline, baker, info: renderer.info, cpuOnly: false, frozenCamera: false, marks, counters: { shadowCalls: 0, shadowTris: 0, mainCalls: 0, mainTris: 0, postCalls: 0 } };
  api.resize = function (cssW, cssH) {
    const pr = derived.pixelRatio;
    renderer.setPixelRatio(pr);
    renderer.setSize(cssW, cssH, false);
    camera.aspect = cssW / cssH; camera.updateProjectionMatrix();
    w = cssW; h = cssH;
    pipeline.configure(derived, Math.floor(cssW * pr), Math.floor(cssH * pr));
  };
  /** Quality adapter (docs/DECISIONS.md): derived -> renderer state. Expensive changes are queued behind "Applying...". */
  const adapter = {
    apply(d, effective, changed) {
      const prev = derived; derived = d;
      const all = changed.includes('*');
      if (w) api.resize(w, h);
      lighting.setShadows(d.shadows);
      sky.envMode = d.reflections.mode === 'off' ? 'off' : 'env';
      camera.fov = d.camera.fov; camera.far = Math.max(2500, d.farClip); camera.updateProjectionMatrix();
      veg.configure({ density: d.vegetation.density, treeCaps: d.vegetation.treeCaps, groundCoverRadius: d.vegetation.groundCoverRadius, lodBias: d.lodBias, mid: d.chunkRadii[1], shadows: d.shadows.enabled, atlasSize: Math.min(2048, d.textures.atlas) });
      fx.configure({ particles: d.particles.maxAlive, lightPool: d.lightPool, fogCards: d.fogCards });
      const texChanged = !all && prev && (JSON.stringify(prev.textures) !== JSON.stringify(d.textures));
      if (texChanged) { applying++; baker.start(texSizes(d)); Streaming.add('rebake', baker.job(), -1, () => { applying--; }); }
      if (!all && prev && (prev.lodBias !== d.lodBias || prev.chunkRadii.join() !== d.chunkRadii.join())) chunks.invalidate();
    },
  };
  quality.setAdapter(adapter);
  api.applying = () => applying > 0 || baker.pending > 0;

  // ---- per-frame -------------------------------------------------------------------------------------------------------------------------------------
  let lastRegion = '', lastWeather = '', time = 0;
  const camV = new THREE.Vector3();
  const pst = { exposure: 1, grade: null, sunDir: [0, 1, 0], sunColor: new THREE.Color(), time: 0, fogHeavy: false, bloom: 0.08, bloomThreshold: 1.0, raysGain: 1 };
  const interiorIds = new Set(['bld.cabin_log', 'bld.boathouse', 'bld.diner', 'bld.cabin_plank', 'bld.general_store', 'bld.fishing_hut', 'bld.lodge_restaurant']);
  function insideInterior(x, y, z) {
    const D = World.data, k = Math.min(39, Math.max(0, Math.floor((z + 2000) / 100))) * 40 + Math.min(39, Math.max(0, Math.floor((x + 2000) / 100)));
    for (const b of D.plByChunk[k]) {
      if (!interiorIds.has(b.archetype)) continue;
      const c = Math.cos(b.rotY), s = Math.sin(b.rotY), dx = x - b.x, dz = z - b.z;
      const lx = dx * c + dz * s, lz = -dx * s + dz * c;
      if (Math.abs(lx) < b.params.w / 2 - 0.2 && Math.abs(lz) < b.params.d / 2 - 0.2 && y - b.y < Math.max(3, b.params.h)) return true;
    }
    return false;
  }
  api.frame = function (game, alpha, dt = 1 / 60) {
    time += dt;
    renderer.info.reset(); shadowCounter.calls = 0; shadowCounter.tris = 0;
    const cs = game.camera;
    camera.position.set(cs.pos[0], cs.pos[1], cs.pos[2]);
    camera.lookAt(cs.target[0], cs.target[1], cs.target[2]);
    if (camera.fov !== cs.fov) { camera.fov = cs.fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    const reg = regionAt(camera.position.x, camera.position.z);
    if (reg !== lastRegion) { lastRegion = reg; lighting.setRegion(reg); }
    const wt = game.env.weather.type; if (wt !== lastWeather) { lastWeather = wt; lighting.setWeather(wt); }
    lighting.setInterior(insideInterior(camera.position.x, camera.position.y, camera.position.z));
    const sd = game.env.sunDir, hour = game.env.timeOfDay;
    lighting.update(sd, dt, hour, sky, camera.position, time);
    views.update(game.entities.all(), alpha, time, camera);
    sky.follow(camera.position);
    if (!api.cpuOnly) sky.updateEnv();
    camV.copy(camera.position);
    water.update(camV, 1);
    const L = lighting.state;
    veg.update(camera, 0.25 + 0.9 * L.day * (1 - 0.5 * L.weather.cover) + 0.06 * L.night, scene.fog);
    fx.update(dt, camera, L, game);
    pst.exposure = L.exposure; pst.grade = L.grade; pst.sunDir = sd; pst.time = time;
    pst.sunColor.setRGB(1, 0.85, 0.65).multiplyScalar(0.8 * L.day * (1 - L.weather.cover * 0.6));
    pst.fogHeavy = L.weather.fog > 2.5 || L.region === 'forest';
    pst.raysGain = L.region === 'forest' ? 1.6 : 1;
    if (!api.cpuOnly) pipeline.render(scene, camera, pst, shadowCounter);
    const c = api.counters;
    c.shadowCalls = shadowCounter.calls; c.shadowTris = shadowCounter.tris; c.postCalls = pipeline.postCalls || 0;
    if (pipeline.lastMain) { c.mainCalls = pipeline.lastMain[0]; c.mainTris = pipeline.lastMain[1]; }
    perf.recordPass('shadow', shadowCounter.calls, shadowCounter.tris);
    perf.counts.lights = fx.activeLights;
    perf.counts.particles = fx.particlesAlive;
    perf.foliageFillEstimate = veg.state.count0 * 0.002 + veg.state.count1 * 0.0002;
  };
  api.size = () => [w, h];
  api.matStats = () => MatLib.stats();
  api.memory = () => ({ texture: MemTracker.textureBytes, library: MemTracker.libraryTextureBytes, rt: MemTracker.renderTargetBytes, geometry: MemTracker.geometryBytes });
  void ARCHETYPES;
  return api;
}
