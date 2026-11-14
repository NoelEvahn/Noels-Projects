// Perf instrumentation (Annex G 5), Stage 2 subset: frame timing, renderer.info counters, geometry byte tracking, stream stats.
export const MemTracker = {
  geometryBytes: 0, textureBytes: 0, renderTargetBytes: 0,
  addGeometry(g) { let b = 0; for (const k in g.attributes) b += g.attributes[k].array.byteLength; if (g.index) b += g.index.array.byteLength; g.userData.bytes = b; this.geometryBytes += b; },
  removeGeometry(g) { this.geometryBytes -= g.userData.bytes || 0; g.userData.bytes = 0; },
};

export function createPerf() {
  const N = 120;
  const frames = new Float32Array(N);
  let n = 0, head = 0;
  const p = {
    fps: 0, frameMs: { mean: 0, p95: 0, p99: 0, max: 0 }, hitches: { over33: 0, over100: 0 },
    cpu: { sim: 0, physics: 0, ai: 0, anim: 0, cull: 0, stream: 0, render: 0, ui: 0, audio: 0 },
    draw: { calls: 0, shadowCalls: 0, triangles: 0, shadowTriangles: 0, points: 0, lines: 0 },
    mem: { textureBytes: 0, libraryTextureBytes: 0, renderTargetBytes: 0, geometryBytes: 0, jsHeap: 0, audioBufferBytes: 0 },
    counts: { programs: 0, materials: 0, geometries: 0, textures: 0, chunksNear: 0, chunksMid: 0, entities: 0, characters: 0, vehicles: 0, particles: 0, lights: 0, voices: 0 },
    stream: { queue: 0, sliceOverruns: 0, bakesPending: 0, maxPumpMs: 0 },
    blockoutFallbacks: 0, renderer: '', quality: { preset: 'auto', resolutionScale: 1, governorLevel: 0 }, cpuOnly: false,
    _last: 0,
  };
  const scopes = {};
  p.beginFrame = (now) => { p._t0 = now; };
  p.mark = (name, ms) => { const o = p.cpu; o[name] = o[name] * 0.9 + ms * 0.1; };
  p.endFrame = (now, rendererInfo) => {
    const dt = p._last ? now - p._last : 16.7;
    p._last = now;
    frames[head] = dt; head = (head + 1) % N; if (n < N) n++;
    if (dt > 33) p.hitches.over33++; if (dt > 100) p.hitches.over100++;
    if (n >= 8 && (head & 7) === 0) {
      const arr = Array.from(frames.slice(0, n)).sort((a, b) => a - b);
      let s = 0; for (const v of arr) s += v;
      p.frameMs.mean = s / n; p.frameMs.p95 = arr[Math.floor(n * 0.95)]; p.frameMs.p99 = arr[Math.min(n - 1, Math.floor(n * 0.99))]; p.frameMs.max = arr[n - 1];
      p.fps = 1000 / p.frameMs.mean;
    }
    if (rendererInfo) {
      p.draw.calls = rendererInfo.render.calls; p.draw.triangles = rendererInfo.render.triangles; p.draw.points = rendererInfo.render.points; p.draw.lines = rendererInfo.render.lines;
      p.counts.geometries = rendererInfo.memory.geometries; p.counts.textures = rendererInfo.memory.textures; p.counts.programs = rendererInfo.programs ? rendererInfo.programs.length : 0;
    }
    p.mem.geometryBytes = MemTracker.geometryBytes;
    if (typeof performance !== 'undefined' && performance.memory) p.mem.jsHeap = performance.memory.usedJSHeapSize;
  };
  p.snapshot = () => JSON.parse(JSON.stringify(p, (k, v) => (k.startsWith('_') ? undefined : v)));
  void scopes;
  return p;
}
