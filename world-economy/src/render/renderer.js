// Renderer facade (minimal Stage 2 version; Stage 3 owns render/): scene graph, camera, sky, water, far proxy, chunk streaming, entity views.
import * as THREE from 'three';
import { World } from '../world/query.js';
import { buildWater } from './water.js';
import { buildFar } from './far.js';
import { createSky } from './sky.js';
import { createChunkManager } from './chunkManager.js';
import { createEntityViews } from './entityViews.js';
import { Streaming } from './streaming.js';

export function createRenderer({ canvas, settings, perf }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  perf.renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  perf.software = /SwiftShader|llvmpipe|Software/i.test(perf.renderer);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(settings.graphics.fov, 16 / 9, 0.3, 9000);
  const sky = createSky(scene);
  const water = buildWater(scene);
  const far = buildFar(scene);
  const chunks = createChunkManager({ scene, far, settings });
  const views = createEntityViews(scene);
  let w = 0, h = 0;
  const api = { renderer, scene, camera, sky, water, far, chunks, views, info: renderer.info, cpuOnly: false, frozenCamera: false };
  renderer.info.autoReset = true;
  api.resize = function (cssW, cssH) {
    const g = settings.graphics;
    const pr = Math.min(window.devicePixelRatio || 1, g.maxPixelRatio) * g.resolutionScale;
    renderer.setPixelRatio(pr);
    renderer.setSize(cssW, cssH, false);
    camera.aspect = cssW / cssH; camera.updateProjectionMatrix();
    w = cssW; h = cssH;
  };
  /** push the game camera / environment into three and draw */
  api.frame = function (game, alpha) {
    const cs = game.camera;
    camera.position.set(cs.pos[0], cs.pos[1], cs.pos[2]);
    camera.lookAt(cs.target[0], cs.target[1], cs.target[2]);
    if (camera.fov !== cs.fov) { camera.fov = cs.fov; camera.updateProjectionMatrix(); }
    views.update(game.entities.all(), alpha);
    sky.update(game.env.sunDir, camera.position);
    if (!api.cpuOnly) renderer.render(scene, camera);
  };
  api.size = () => [w, h];
  void Streaming; void World;
  return api;
}
