// Perf instrumentation (Annex G 4.3, 5): frame timing (mean/p95/p99/max over 120 frames), CPU scopes, per-pass draw counters,
// MemTracker byte accounting, allocation-per-frame meter, budgets per preset for the perf HUD. No allocation per frame.

/** Byte accounting (Annex G 4.3). Every texture / render target / geometry registers its size; disposal unregisters. */
export const MemTracker = {
  geometryBytes: 0, textureBytes: 0, libraryTextureBytes: 0, renderTargetBytes: 0, audioBufferBytes: 0, geometryUploadFrame: 0,
  addGeometry(g) { let b = 0; for (const k in g.attributes) b += g.attributes[k].array.byteLength; if (g.index) b += g.index.array.byteLength; g.userData.bytes = b; this.geometryBytes += b; this.geometryUploadFrame += b; },
  removeGeometry(g) { this.geometryBytes -= g.userData.bytes || 0; g.userData.bytes = 0; },
  /** w x h x bytesPerPixel x 1.333 (mips). library = part of the texture library budget. */
  addTexture(t, w, h, bpp = 4, library = true, mips = true) { const b = Math.round(w * h * bpp * (mips ? 1.333 : 1)); if (t && t.userData) t.userData.bytes = b, t.userData.library = library; this.textureBytes += b; if (library) this.libraryTextureBytes += b; return b; },
  removeTexture(t) { const b = (t && t.userData && t.userData.bytes) || 0; this.textureBytes -= b; if (t.userData.library) this.libraryTextureBytes -= b; t.userData.bytes = 0; },
  addRenderTarget(rt, w, h, bpp = 4, count = 1) { const b = w * h * bpp * count; if (rt && rt.userData) rt.userData.bytes = b; else if (rt) rt._bytes = b; this.renderTargetBytes += b; return b; },
  removeRenderTarget(rt) { const b = (rt && ((rt.userData && rt.userData.bytes) || rt._bytes)) || 0; this.renderTargetBytes -= b; if (rt.userData) rt.userData.bytes = 0; rt._bytes = 0; },
  gpuEstimate() { return this.textureBytes + this.renderTargetBytes + this.geometryBytes; },
};

/** Counter budgets per preset (Annex G 2.3); used for HUD colouring and perf tests. Bytes in MB. */
export const BUDGETS = {
  low: { calls: 220, shadowCalls: 60, triangles: 350e3, shadowTriangles: 80e3, libTexMB: 64, gpuMB: 200, geoMB: 60, programs: 40, lights: 2, heapMB: 350, frameMs: 33.3 },
  medium: { calls: 320, shadowCalls: 140, triangles: 700e3, shadowTriangles: 300e3, libTexMB: 120, gpuMB: 330, geoMB: 100, programs: 50, lights: 4, heapMB: 450, frameMs: 16.7 },
  high: { calls: 450, shadowCalls: 280, triangles: 1.2e6, shadowTriangles: 700e3, libTexMB: 240, gpuMB: 520, geoMB: 160, programs: 60, lights: 8, heapMB: 600, frameMs: 16.7 },
  ultra: { calls: 600, shadowCalls: 420, triangles: 2.0e6, shadowTriangles: 1.2e6, libTexMB: 400, gpuMB: 820, geoMB: 220, programs: 60, lights: 8, heapMB: 800, frameMs: 16.7 },
};
/** 'ok' within budget, 'warn' within 10 % over, 'over' beyond */
export function budgetState(value, budget) { if (!budget) return 'ok'; return value <= budget ? 'ok' : value <= budget * 1.1 ? 'warn' : 'over'; }

/** Allocation meter: mean positive usedJSHeapSize delta per frame (GC drops are skipped). Chromium only. */
export function createAllocMeter() {
  let last = 0, sum = 0, frames = 0, gcs = 0;
  const has = () => typeof performance !== 'undefined' && performance.memory && performance.memory.usedJSHeapSize > 0;
  return {
    get supported() { return has(); },
    reset() { last = has() ? performance.memory.usedJSHeapSize : 0; sum = 0; frames = 0; gcs = 0; },
    sample() {
      if (!has()) return;
      const now = performance.memory.usedJSHeapSize;
      const d = now - last; last = now; frames++;
      if (d >= 0) sum += d; else gcs++;
    },
    /** bytes per frame (mean over non-GC frames) */
    result() { const n = frames - gcs; return { bytesPerFrame: n > 0 ? sum / n : 0, frames, gcs }; },
  };
}

const N = 120;
export function createPerf() {
  const frames = new Float32Array(N), sorted = new Float32Array(N);
  let n = 0, head = 0;
  const passAcc = { calls: 0, triangles: 0, shadowCalls: 0, shadowTriangles: 0, points: 0, lines: 0, used: false };
  const starts = { sim: 0, physics: 0, ai: 0, anim: 0, cull: 0, stream: 0, render: 0, ui: 0, audio: 0 };
  const alloc = createAllocMeter();
  const p = {
    fps: 0, frameMs: { mean: 0, p95: 0, p99: 0, max: 0 }, hitches: { over33: 0, over100: 0 },
    cpu: { sim: 0, physics: 0, ai: 0, anim: 0, cull: 0, stream: 0, render: 0, ui: 0, audio: 0 },
    cpuMax: { sim: 0, physics: 0, ai: 0, anim: 0, cull: 0, stream: 0, render: 0, ui: 0, audio: 0 },
    draw: { calls: 0, shadowCalls: 0, triangles: 0, shadowTriangles: 0, points: 0, lines: 0 },
    mem: { textureBytes: 0, libraryTextureBytes: 0, renderTargetBytes: 0, geometryBytes: 0, gpuEstimateBytes: 0, jsHeap: 0, audioBufferBytes: 0 },
    counts: { programs: 0, materials: 0, geometries: 0, textures: 0, chunksNear: 0, chunksMid: 0, entities: 0, characters: 0, vehicles: 0, particles: 0, lights: 0, voices: 0 },
    stream: { queue: 0, sliceOverruns: 0, bakesPending: 0, maxPumpMs: 0, geometryUploadMax: 0 },
    allocPerFrame: 0, foliageFillEstimate: 0,
    blockoutFallbacks: 0, renderer: '', quality: { preset: 'auto', resolutionScale: 1, governorLevel: 0 }, cpuOnly: false,
    _last: 0,
  };
  p.beginFrame = (now) => { p._t0 = now; passAcc.used = false; passAcc.calls = passAcc.triangles = passAcc.shadowCalls = passAcc.shadowTriangles = passAcc.points = passAcc.lines = 0; };
  /** rolling mean (and max) of a CPU slice in ms */
  p.mark = (name, ms) => { const o = p.cpu; o[name] = o[name] * 0.9 + ms * 0.1; if (ms > p.cpuMax[name]) p.cpuMax[name] = ms; };
  p.begin = (name) => { starts[name] = performance.now(); };
  p.end = (name) => { p.mark(name, performance.now() - starts[name]); };
  /** renderers with several passes call this after each pass (label 'main'|'shadow'|'reflection'|'post') with renderer.info.render */
  p.recordPass = (label, calls, triangles, points = 0, lines = 0) => {
    passAcc.used = true;
    if (label === 'shadow') { passAcc.shadowCalls += calls; passAcc.shadowTriangles += triangles; }
    else { passAcc.calls += calls; passAcc.triangles += triangles; passAcc.points += points; passAcc.lines += lines; }
  };
  p.endFrame = (now, rendererInfo) => {
    const dt = p._last ? now - p._last : 16.7;
    p._last = now;
    frames[head] = dt; head = (head + 1) % N; if (n < N) n++;
    if (dt > 33) p.hitches.over33++; if (dt > 100) p.hitches.over100++;
    if (n >= 8 && (head & 7) === 0) {
      sorted.set(frames); const s = n < N ? sorted.subarray(0, n) : sorted; s.sort();
      let sum = 0; for (let i = 0; i < n; i++) sum += s[i];
      p.frameMs.mean = sum / n; p.frameMs.p95 = s[Math.floor(n * 0.95)]; p.frameMs.p99 = s[Math.min(n - 1, Math.floor(n * 0.99))]; p.frameMs.max = s[n - 1];
      p.fps = 1000 / p.frameMs.mean;
    }
    if (passAcc.used) {
      p.draw.calls = passAcc.calls; p.draw.triangles = passAcc.triangles; p.draw.shadowCalls = passAcc.shadowCalls; p.draw.shadowTriangles = passAcc.shadowTriangles; p.draw.points = passAcc.points; p.draw.lines = passAcc.lines;
    } else if (rendererInfo) {
      p.draw.calls = rendererInfo.render.calls; p.draw.triangles = rendererInfo.render.triangles; p.draw.points = rendererInfo.render.points; p.draw.lines = rendererInfo.render.lines;
    }
    if (rendererInfo) { p.counts.geometries = rendererInfo.memory.geometries; p.counts.textures = rendererInfo.memory.textures; p.counts.programs = rendererInfo.programs ? rendererInfo.programs.length : 0; }
    const M = MemTracker;
    p.mem.geometryBytes = M.geometryBytes; p.mem.textureBytes = M.textureBytes; p.mem.libraryTextureBytes = M.libraryTextureBytes; p.mem.renderTargetBytes = M.renderTargetBytes; p.mem.audioBufferBytes = M.audioBufferBytes; p.mem.gpuEstimateBytes = M.gpuEstimate();
    if (M.geometryUploadFrame > p.stream.geometryUploadMax) p.stream.geometryUploadMax = M.geometryUploadFrame;
    M.geometryUploadFrame = 0;
    if (typeof performance !== 'undefined' && performance.memory) p.mem.jsHeap = performance.memory.usedJSHeapSize;
    alloc.sample();
  };
  /** last 120 frame times, oldest first, into `out` (HUD graph) */
  p.history = (out) => { for (let i = 0; i < N; i++) out[i] = i < N - n ? 0 : frames[(head + i) % N]; return out; };
  p.alloc = alloc;
  p.snapshot = () => JSON.parse(JSON.stringify(p, (k, v) => (k.startsWith('_') || k === 'alloc' || typeof v === 'function' ? undefined : v)));
  return p;
}
