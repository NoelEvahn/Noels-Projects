// Adaptive quality governor (Annex G 4.1). Pure logic driven by frame-time samples; no three, no DOM, no allocation per sample.
// Level 0 = the user's settings; each level adds one step of the ladder. Every step only lowers values (lowerOf / min), so a
// setting the user already set lower is never raised. Saved settings are never changed: the result is an override layer.
import { lowerOf, rank } from './quality.js';

export const LADDER = [
  null,
  'resolutionScale -0.1', 'resolutionScale -0.1', 'resolutionScale -0.1',
  'god rays off; fog cards low',
  'AO high->low; SSR off',
  'planar reflection -> env',
  'shadow distance x0.7; cascades -1 (min 1)',
  'ground cover radius x0.5; vegetation density x0.75',
  'crowd and traffic x0.7; particles one step down',
  'AO off; bloom off; AA -> fxaa',
  'lodBias x0.8; mid chunk radius -2',
];
export const MAX_LEVEL = LADDER.length - 1;
const PARTICLES = ['low', 'medium', 'high', 'ultra'];

/**
 * Effective graphics for a governor level. Returns { graphics, gov:{cascadesDelta, midRadiusDelta} }. Pure.
 * `user` is the user's graphics settings (level 0).
 */
export function applyLevel(user, level) {
  const g = { ...user };
  const gov = { cascadesDelta: 0, midRadiusDelta: 0 };
  const L = Math.max(0, Math.min(MAX_LEVEL, level | 0));
  if (L >= 1) {
    const steps = Math.min(3, L);
    const floor = Math.max(0.5, user.resolutionScale - 0.3);
    g.resolutionScale = Math.round(Math.max(floor, Math.min(user.resolutionScale, user.resolutionScale - 0.1 * steps)) * 1000) / 1000;
  }
  if (L >= 4) { g.godRays = false; g.fogCards = lowerOf('fogCards', g.fogCards, 'low'); }
  if (L >= 5) { g.ao = lowerOf('ao', g.ao, 'low'); if (g.reflections === 'planar+ssr') g.reflections = 'planar'; }
  if (L >= 6) g.reflections = lowerOf('reflections', g.reflections, 'env');
  if (L >= 7) { g.shadowDistance = Math.round(g.shadowDistance * 0.7); if (g.shadows !== 'off') gov.cascadesDelta = -1; }
  if (L >= 8) { g.groundCoverRadius = Math.round(g.groundCoverRadius * 0.5); g.vegetationDensity = Math.round(g.vegetationDensity * 0.75 * 1000) / 1000; }
  if (L >= 9) {
    g.crowdDensity = Math.round(g.crowdDensity * 0.7 * 1000) / 1000; g.trafficDensity = Math.round(g.trafficDensity * 0.7 * 1000) / 1000;
    g.particles = PARTICLES[Math.max(0, PARTICLES.indexOf(g.particles) - 1)];
  }
  if (L >= 10) { g.ao = 'off'; g.bloom = false; if (rank('antialiasing', g.antialiasing) > rank('antialiasing', 'fxaa')) g.antialiasing = 'fxaa'; }
  if (L >= 11) { g.lodBias = Math.round(g.lodBias * 0.8 * 1000) / 1000; gov.midRadiusDelta = -2; }
  return { graphics: g, gov };
}

/**
 * createGovernor({ targetFps, adaptive, onChange, window, ... }) -> governor
 *   sample(frameMs)      call once per frame; returns +1/-1 when the level changed this frame, else 0
 *   level, stats         current level and window stats {mean, p95}
 *   setUser(graphics)    the user's graphics (target fps / adaptive / level-0 values)
 *   reset()
 * Rules (Annex G 4.1): T = 1000/targetFps (60 when 0). p95 > 1.08T for 45 consecutive frames: step down one level.
 * mean < 0.72T for 300 consecutive frames: step up one level (never above level 0). After any step: 90-frame cooldown.
 */
export function createGovernor({ targetFps = 60, adaptive = true, onChange = null, windowSize = 120, downFrames = 45, upFrames = 300, cooldown = 90, downRatio = 1.08, upRatio = 0.72 } = {}) {
  const win = new Float32Array(windowSize), sorted = new Float32Array(windowSize);
  let n = 0, head = 0, sum = 0, overCount = 0, underCount = 0, cool = 0, level = 0, user = null, enabled = adaptive;
  let T = 1000 / (targetFps || 60);
  const stats = { mean: 0, p95: 0, frames: 0 };
  const G = {
    get level() { return level; },
    get enabled() { return enabled; },
    stats,
    setTarget(fps) { T = 1000 / (fps || 60); },
    setEnabled(on) { enabled = !!on; if (!enabled && level !== 0) { level = 0; emit(-1); } overCount = underCount = 0; },
    setUser(g) { user = g; if (g) { G.setTarget(g.targetFps); if (enabled !== !!g.adaptive) G.setEnabled(g.adaptive); } if (level) emit(0); },
    reset() { n = head = 0; sum = 0; overCount = underCount = cool = 0; if (level) { level = 0; emit(-1); } },
    /** feeds one frame time in ms */
    sample(ms) {
      if (!(ms >= 0) || ms > 1000) return 0; // ignore paused / hidden-tab frames
      if (n === windowSize) sum -= win[head]; else n++;
      win[head] = ms; sum += ms; head = (head + 1) % windowSize;
      stats.frames++;
      stats.mean = sum / n;
      sorted.set(win); const s = n < windowSize ? sorted.subarray(0, n) : sorted; s.sort();
      stats.p95 = s[Math.min(n - 1, Math.floor(n * 0.95))];
      if (!enabled) return 0;
      if (cool > 0) { cool--; return 0; }
      if (n < Math.min(windowSize, downFrames)) return 0;
      overCount = stats.p95 > downRatio * T ? overCount + 1 : 0;
      underCount = stats.mean < upRatio * T ? underCount + 1 : 0;
      if (overCount >= downFrames && level < MAX_LEVEL) { level++; overCount = underCount = 0; cool = cooldown; emit(-1); return -1; }
      if (underCount >= upFrames && level > 0) { level--; overCount = underCount = 0; cool = cooldown; emit(1); return 1; }
      return 0;
    },
    /** effective graphics for the current level */
    effective() { return user ? applyLevel(user, level) : null; },
  };
  function emit(dir) { if (onChange) onChange(level, dir); }
  return G;
}

/**
 * Wires a governor to a Quality instance: user changes reset the override base; level changes push overrides.
 * Returns the governor. Call governor.sample(frameMs) once per frame (main loop: Governor.update()).
 */
export function attachGovernor(quality, opts = {}) {
  const push = (lvl) => {
    const user = quality.get().graphics;
    if (lvl === 0) quality.setGovernorOverrides(null, null, 0);
    else { const r = applyLevel(user, lvl); quality.setGovernorOverrides(r.graphics, r.gov, lvl); }
  };
  const gov = createGovernor({ ...opts, targetFps: quality.get('graphics.targetFps'), adaptive: quality.get('graphics.adaptive'), onChange: (lvl) => push(lvl) });
  quality.subscribe((ev) => {
    if (ev.source === 'governor') return;
    const g = quality.get().graphics;
    gov.setTarget(g.targetFps);
    if (gov.enabled !== !!g.adaptive) gov.setEnabled(g.adaptive);
    else if (gov.level) push(gov.level); // re-derive overrides from the new user values
  });
  return gov;
}
