// Boot sequence and main loop (MASTER_SPEC 4). Wires core, sim, world, game, render, ui and the QA harness.
import { createBus } from './core/bus.js';
import { createClock } from './core/clock.js';
import { createSave } from './core/save.js';
import { createSim } from './sim/index.js';
import { World } from './world/query.js';
import { createGame } from './game/index.js';
import { Input } from './game/input/actions.js';
import { defaultSettings } from './data/settings.js';
import { createPerf, MemTracker } from './render/perf.js';
import { Streaming } from './render/streaming.js';
import { installHarness } from './qa/harness.js';
import { VIEWPOINTS } from './qa/viewpoints.js';
import { createDebugHud } from './ui/hud/debugHud.js';
import { Audio } from './audio/engine.js';

const H = installHarness();
const $ = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));

async function boot() {
  const status = $('boot-status'), bar = $('boot-bar');
  const setStatus = (s, p) => { if (status) status.textContent = s; if (bar && p !== undefined) bar.style.width = Math.round(p * 100) + '%'; };
  const t0 = performance.now();
  const marks = {};
  const bus = createBus((type, e) => { H.errors.push({ type: 'bus', message: type + ': ' + (e && e.message || e) }); });
  const settings = defaultSettings();
  try { const s = localStorage.getItem('loe.settings'); if (s) Object.assign(settings.graphics, JSON.parse(s).graphics || {}); } catch (e) { /* storage unavailable */ }
  const sim = createSim({ bus });
  sim.init({});
  const clock = createClock(bus, { total: 480 });
  bus.on('time:minute', (gt) => sim.tickMinute(gt));
  const save = createSave({
    collect: () => ({ v: 1, meta: { createdAt: 0, savedAt: 0, playTimeSec: 0, build: H.version, cheated: sim.cheated }, rng: {}, time: { total: clock.state.total, scale: clock.scale }, sim: sim.serialize(), player: { pos: game ? game.playerPos() : [0, 0, 0], yaw: 0, mode: 'foot', vehicleId: null, outfit: {} }, env: {}, settingsRef: false }),
    restore: (s) => sim.init({ state: s.sim }),
  });
  let game = null;

  // world generation, time-sliced behind the loading screen
  setStatus('Generating world...', 0.02);
  const steps = ['roads', 'index', 'buildings', 'pois', 'pads', 'grid', 'infra', 'trees', 'colliders', 'nav', 'chunks', 'ready'];
  const gen = World.initSteps({ seed: 1 });
  let last = '', n = 0;
  for (let r = gen.next(); !r.done; r = gen.next()) {
    if (r.value !== last) { last = r.value; marks[r.value] = Math.round(performance.now() - t0); setStatus('World: ' + r.value, 0.05 + 0.5 * (steps.indexOf(r.value) + 1) / steps.length); }
    if (++n % 3 === 0) await tick();
  }
  marks.worldMs = Math.round(performance.now() - t0);

  setStatus('Loading renderer...', 0.6);
  const [{ createRenderer }, { Builders }] = await Promise.all([import('./render/renderer.js'), import('./render/builders.js')]);
  const perf = createPerf();
  const canvas = $('c');
  let rend;
  try { rend = createRenderer({ canvas, settings, perf }); }
  catch (e) { H.errors.push({ type: 'webgl', message: String(e && e.message || e) }); setStatus('WebGL2 is required: ' + (e && e.message), 1); H._reject(e); return; }
  if (perf.software) { settings.graphics.preset = 'low'; settings.graphics.resolutionScale = 0.7; settings.graphics.maxPixelRatio = 1; }
  perf.quality.preset = settings.graphics.preset; perf.quality.resolutionScale = settings.graphics.resolutionScale;
  const resize = () => rend.resize(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', resize); resize();
  marks.rendererMs = Math.round(performance.now() - t0);

  game = createGame();
  Input.init(canvas, bus);
  game.init({ bus, input: Input, settings, clock });
  marks.gameMs = Math.round(performance.now() - t0);

  // initial near ring is built without a frame budget so the first frame is playable
  setStatus('Building the first chunks...', 0.8);
  const camXZ = () => ({ x: game.camera.pos[0], z: game.camera.pos[2] });
  rend.chunks.update(camXZ(), 0, 0, true);
  const [near] = [3];
  void near;
  // drain only the jobs for the near ring (they are sorted by distance); the rest streams under the frame budget
  let guard = 0;
  while (Streaming.size && guard++ < 60) { Streaming.pump(40); if (guard % 5 === 0) await tick(); }
  marks.firstChunksMs = Math.round(performance.now() - t0);

  let frozen = false, started = false;
  const hud = createDebugHud({
    root: $('ui'), game, perf, world: World,
    onTeleport: (id) => H.teleport(id), onSpawn: () => H.teleport('poi.city.spawn', 0),
    getCounts: () => rend.chunks.counts,
  });

  function renderNow(alpha = 1) {
    perf.draw.calls; // keep shape stable
    rend.frame(game, alpha);
    perf.counts.chunksNear = rend.chunks.counts.near; perf.counts.chunksMid = rend.chunks.counts.mid;
    perf.counts.entities = game.entities.count; perf.counts.materials = 0;
    perf.stream.queue = Streaming.size; perf.stream.sliceOverruns = Streaming.stats.sliceOverruns; perf.stream.maxPumpMs = Streaming.stats.maxPumpMs;
    perf.blockoutFallbacks = Builders.blockoutIds().length;
  }

  // ---- main loop (4.2) ------------------------------------------------------------------------------------------------------------------------------
  let lastT = performance.now(), acc = 0, prevFrameMs = 16;
  function frame(now) {
    requestAnimationFrame(frame);
    if (frozen) { lastT = now; return; }
    const dtReal = Math.min(0.1, Math.max(0, (now - lastT) / 1000)); lastT = now;
    perf.beginFrame(now);
    Input.poll();
    if (Input.pressed('debugHud')) hud.toggle();
    acc += dtReal;
    let steps2 = 0;
    const tSim = performance.now();
    while (acc >= 1 / 60 && steps2 < 4) { game.fixedUpdate(1 / 60); clock.advance(1 / 60); bus.flush(); acc -= 1 / 60; steps2++; }
    if (steps2 === 4) acc = 0;
    game.update(dtReal, acc * 60);
    perf.mark('physics', performance.now() - tSim);
    const pv = game.activeVehicle();
    const vx = pv ? Math.sin(pv.sim.yaw) * pv.sim.speed : game.char().vx, vz = pv ? -Math.cos(pv.sim.yaw) * pv.sim.speed : game.char().vz;
    const pp = game.playerPos();
    const tS = performance.now();
    rend.chunks.update({ x: pp[0], z: pp[2] }, vx, vz);
    Streaming.pump(perf.software ? 45 : prevFrameMs > 15 ? 1.5 : 3);
    perf.mark('stream', performance.now() - tS);
    const tR = performance.now();
    renderNow(acc * 60);
    perf.mark('render', performance.now() - tR);
    hud.update(dtReal);
    Input.endFrame();
    perf.endFrame(now, rend.renderer.info);
    prevFrameMs = perf.frameMs.mean || 16;
  }

  // ---- overlay ------------------------------------------------------------------------------------------------------------------------------------------
  const overlay = $('overlay');
  function start() {
    if (started) return;
    started = true; overlay.style.display = 'none';
    Audio.init();
    Input.requestPointerLock().then((r) => { $('lockhint').style.display = r.locked ? 'none' : ''; });
  }
  $('start').addEventListener('click', start);
  canvas.addEventListener('click', () => { if (started && !Input.pointer.locked && !frozen) Input.requestPointerLock(); });
  bus.on('input:pointerLock', (p) => { $('lockhint').style.display = p.locked ? 'none' : ''; });

  // ---- harness API -----------------------------------------------------------------------------------------------------------------------------------------
  const settle = async (maxMs = 120000, frames = 3) => {
    const t = performance.now();
    rend.chunks.update(camXZ(), 0, 0, true);
    while (Streaming.size && performance.now() - t < maxMs) { Streaming.pump(50); await tick(); }
    rend.chunks.update(camXZ(), 0, 0); // applies the far-proxy mask for the final chunk set
    for (let i = 0; i < frames; i++) { renderNow(1); await tick(); }
    return { ms: Math.round(performance.now() - t), queue: Streaming.size, frames };
  };
  H.sim = { cmd: sim.cmd, select: sim.select };
  H.world = World; H.game = game; H.bus = bus; H.settings = settings; H.streaming = Streaming; H.input = Input; H.clock = clock; H.save = save;
  H.teleport = async (target, yaw) => {
    let pos;
    if (typeof target === 'string') { const p = World.poi(target); if (!p) throw new Error('unknown poi ' + target); pos = [p.pos[0], p.pos[1], p.pos[2]]; }
    else pos = target;
    game.teleport(pos, yaw);
    game.camera.fixed = false;
    return settle(120000, 2);
  };
  H.setTime = (h) => { clock.setHour(h); game.env.timeOfDay = clock.hourFloat; };
  H.setWeather = (type, intensity) => { game.env.weather.type = type; game.env.weather.intensity = intensity; bus.emit('env:weather', { type, intensity }); };
  H.setQuality = (preset) => {
    const g = settings.graphics;
    if (typeof preset === 'string') { const t = { low: [0.7, 1], medium: [0.85, 1.25], high: [1, 1.5], ultra: [1, 2] }[preset]; if (t) { g.preset = preset; g.resolutionScale = t[0]; g.maxPixelRatio = t[1]; } }
    else Object.assign(g, preset);
    perf.quality.preset = g.preset; perf.quality.resolutionScale = g.resolutionScale; resize();
  };
  H.camera = {
    set({ pos, target, fov }) { const c = game.camera; c.fixed = true; c.mode = 'fixed'; c.pos = pos.slice(); c.target = target.slice(); if (fov) c.fov = fov; },
    release() { game.camera.fixed = false; },
    get state() { return game.camera; },
  };
  H.rend = rend;
  H.fog = (density) => { rend.scene.fog.density = density; };
  H.settle = settle;
  H.freeze = (on) => { frozen = !!on; };
  H.renderNow = () => { renderNow(1); };
  H.perf = {
    snapshot() {
      const s = perf.snapshot();
      s.counts.chunksNear = rend.chunks.counts.near; s.counts.chunksMid = rend.chunks.counts.mid; s.counts.entities = game.entities.count;
      s.stream.queue = Streaming.size; s.stream.sliceOverruns = Streaming.stats.sliceOverruns; s.stream.maxPumpMs = Streaming.stats.maxPumpMs;
      s.draw.calls = rend.renderer.info.render.calls; s.draw.triangles = rend.renderer.info.render.triangles; s.counts.programs = rend.renderer.info.programs ? rend.renderer.info.programs.length : 0;
      s.mem.geometryBytes = MemTracker.geometryBytes; s.blockoutFallbacks = Builders.blockoutIds().length; s.boot = marks; s.sun = game.env.sunDir.slice();
      s.farTris = rend.far.terrain.visibleTris + rend.far.masses.visibleTris; s.chunkTris = rend.chunks.counts.loadedTris;
      return s;
    },
    cpuOnly(on) { rend.cpuOnly = !!on; perf.cpuOnly = !!on; },
    reset() { Streaming.stats.sliceOverruns = 0; Streaming.stats.maxPumpMs = 0; },
  };
  /** renders now and measures the canvas (same task, so the drawing buffer is still valid): non-blank check for visual tests */
  H.pixelStats = () => {
    renderNow(1);
    const w = 160, h = 90, c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    const ctx = c2.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    let s = 0, s2 = 0, n = 0; const seen = new Set();
    for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; s += l; s2 += l * l; n++; seen.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3)); }
    const mean = s / n;
    return { mean, variance: s2 / n - mean * mean, colors: seen.size };
  };
  H.grant = (cents) => sim.cmd('debug.grant', { cents });
  H.bots = { run() { return Promise.reject(new Error('bots arrive in Stage 4')); } };
  H.viewpoints = VIEWPOINTS;
  H.viewpoint = async (id, { hour, settleMs = 120000 } = {}) => {
    const v = VIEWPOINTS[id];
    if (!v) throw new Error('unknown viewpoint ' + id);
    if (hour !== undefined) H.setTime(hour);
    const g = World.groundAt(v.x, 1000, v.z);
    const wa = World.waterAt(v.x, v.z, 0);
    const y = Math.max(g.y, wa ? wa.height : -1e9);
    const pos = [v.x, y + v.h, v.z];
    game.teleport([v.x, y, v.z], 0);
    const gt = World.groundAt(v.t[0], 1000, v.t[1]);
    const ty = v.t[2] > 100 ? v.t[2] : gt.y + v.t[2];
    H.camera.set({ pos, target: [v.t[0], ty, v.t[1]], fov: 60 });
    return settle(settleMs, 2);
  };
  /** scripted 30 m/s fly-through of the ring route with the camera on rails; cpuOnly skips GL draws. Returns streaming stats. */
  H.flythrough = async ({ speed = 30, cpuOnly = true, maxFrames = 40000, budget = 3, gcEvery = 0 } = {}) => {
    const N = (id) => World.data.R.nodes.get(id);
    const stops = [World.poi('poi.city.spawn').pos, N('g0_5'), N('g2_5'), N('n.bridge.touch'), N('n.harlan.west'), N('n.pinehaven'), N('n.forest.gate'), N('g5_0'), N('g5_7'), N('g0_7')];
    const pts = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      const r = World.route({ x: a.x !== undefined ? a.x : a[0], z: a.z !== undefined ? a.z : a[2] }, { x: b.x !== undefined ? b.x : b[0], z: b.z !== undefined ? b.z : b[2] }, { mode: 'drive' });
      for (const p of r.points) pts.push(p);
    }
    const prevCpu = rend.cpuOnly; rend.cpuOnly = cpuOnly;
    frozen = true;
    Streaming.stats.sliceOverruns = 0; Streaming.stats.maxPumpMs = 0; Streaming.stats.calls = 0; Streaming.stats.maxStepMs = 0;
    const stat = { frames: 0, overruns: 0, maxPump: 0, maxFrameMs: 0, completedStart: Streaming.stats.completed, programsStart: rend.renderer.info.programs ? rend.renderer.info.programs.length : 0, distance: 0 };
    let seg = 0, off = 0, x = pts[0][0], z = pts[0][2];
    const dt = 1 / 60, ds = speed * dt;
    let lastYield = performance.now();
    while (seg < pts.length - 1 && stat.frames < maxFrames) {
      let rem = ds;
      while (rem > 0 && seg < pts.length - 1) {
        const a = pts[seg], b = pts[seg + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]);
        const left = L - off;
        if (left > rem) { off += rem; rem = 0; } else { rem -= left; seg++; off = 0; }
      }
      if (seg >= pts.length - 1) break;
      const a = pts[seg], b = pts[seg + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
      x = a[0] + (b[0] - a[0]) * off / L; z = a[2] + (b[2] - a[2]) * off / L;
      const y = a[1] + (b[1] - a[1]) * off / L;
      const dx = (b[0] - a[0]) / L, dz = (b[2] - a[2]) / L;
      game.camera.fixed = true; game.camera.pos = [x - dx * 8, y + 4, z - dz * 8]; game.camera.target = [x + dx * 20, y + 1.5, z + dz * 20];
      if (gcEvery && stat.frames % gcEvery === 0 && window.gc) window.gc(); // measurement mode: collect between frames so GC pauses are not charged to a pump slice
      const t = performance.now();
      rend.chunks.update({ x, z }, dx * speed, dz * speed);
      Streaming.pump(budget);
      const dtms = performance.now() - t;
      if (dtms > stat.maxFrameMs) stat.maxFrameMs = dtms;
      if (!cpuOnly && stat.frames % 120 === 0) renderNow(1);
      stat.frames++; stat.distance += ds;
      if (performance.now() - lastYield > 30) { await tick(); lastYield = performance.now(); }
    }
    stat.overruns = Streaming.stats.sliceOverruns; stat.maxPump = Streaming.stats.maxPumpMs; stat.maxStep = Streaming.stats.maxStepMs; stat.maxStepAt = Streaming.stats.maxStepKey + '#' + Streaming.stats.maxStepIndex; stat.completed = Streaming.stats.completed - stat.completedStart;
    stat.programsEnd = rend.renderer.info.programs ? rend.renderer.info.programs.length : 0; stat.queueEnd = Streaming.size;
    rend.cpuOnly = prevCpu; game.camera.fixed = false; frozen = false;
    return stat;
  };

  marks.readyMs = Math.round(performance.now() - t0);
  setStatus('Ready', 1);
  $('start').disabled = false;
  $('start').textContent = 'Click to play';
  requestAnimationFrame(frame);
  H.version = H.version;
  H._resolve({ marks });
}
boot().catch((e) => { H.errors.push({ type: 'boot', message: String(e && e.stack || e) }); const s = $('boot-status'); if (s) s.textContent = 'Boot failed: ' + (e && e.message); H._reject(e); });
