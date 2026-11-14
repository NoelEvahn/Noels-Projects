// Quality settings system (Annex G 3, MASTER_SPEC 5.11). Pure logic (no three, no DOM): schema validation, presets, derived
// renderer parameters, persistence with a storage-throws fallback, change events. Renderer integration goes through an
// adapter (see docs/DECISIONS.md "Quality adapter interface"): `Quality.setAdapter({ apply(derived, effective, changedKeys) })`.
import { defaultSettings } from '../data/settings.js';

export const STORAGE_KEY = 'loe.settings';
export const PRESET_NAMES = ['low', 'medium', 'high', 'ultra'];

/** Allowed values per graphics field (Annex G 3.1). Numbers: [min, max, step?]. */
export const SCHEMA = {
  preset: ['auto', 'low', 'medium', 'high', 'ultra', 'custom'],
  adaptive: 'bool',
  targetFps: [30, 60, 0],
  resolutionScale: { min: 0.5, max: 1.0, step: 0.05 },
  maxPixelRatio: [1, 1.25, 1.5, 2],
  shadows: ['off', 'low', 'medium', 'high', 'ultra'],
  shadowDistance: { min: 40, max: 400 },
  ao: ['off', 'low', 'high'],
  bloom: 'bool',
  reflections: ['off', 'env', 'planar', 'planar+ssr'],
  antialiasing: ['off', 'fxaa', 'smaa', 'msaa4'],
  godRays: 'bool',
  fogCards: ['off', 'low', 'on'],
  postGrade: 'bool',
  interiorMapping: 'bool',
  textureSize: ['low', 'medium', 'high', 'ultra'],
  anisotropy: [1, 2, 4, 8, 16],
  drawDistance: { min: 0.6, max: 1.4 },
  lodBias: { min: 0.6, max: 1.5 },
  vegetationDensity: { min: 0, max: 1.25 },
  groundCoverRadius: { min: 0, max: 80 },
  crowdDensity: { min: 0, max: 1.25 },
  trafficDensity: { min: 0, max: 1.25 },
  particles: ['low', 'medium', 'high', 'ultra'],
  lightPool: { min: 0, max: 8, int: true },
  cameraShake: { min: 0, max: 1 },
  motionReduce: 'bool',
  fov: { min: 50, max: 90, int: true },
};

/** Preset table (Annex G 3.3). Graphics fields written by applyPreset; `audio` written into settings.audio. */
export const PRESETS = {
  low: {
    graphics: { resolutionScale: 0.7, maxPixelRatio: 1, shadows: 'low', shadowDistance: 60, ao: 'off', bloom: false, reflections: 'off', antialiasing: 'off', godRays: false, fogCards: 'off', postGrade: true, interiorMapping: false, textureSize: 'low', anisotropy: 2, drawDistance: 0.7, lodBias: 0.7, vegetationDensity: 0.4, groundCoverRadius: 0, crowdDensity: 0.3, trafficDensity: 0.3, particles: 'low', lightPool: 2 },
    audio: { voiceLimit: 16, hrtf: false },
  },
  medium: {
    graphics: { resolutionScale: 0.85, maxPixelRatio: 1.25, shadows: 'medium', shadowDistance: 120, ao: 'low', bloom: true, reflections: 'env', antialiasing: 'fxaa', godRays: false, fogCards: 'low', postGrade: true, interiorMapping: false, textureSize: 'medium', anisotropy: 4, drawDistance: 0.85, lodBias: 0.85, vegetationDensity: 0.7, groundCoverRadius: 40, crowdDensity: 0.6, trafficDensity: 0.6, particles: 'medium', lightPool: 4 },
    audio: { voiceLimit: 24, hrtf: true },
  },
  high: {
    graphics: { resolutionScale: 1.0, maxPixelRatio: 1.5, shadows: 'high', shadowDistance: 220, ao: 'high', bloom: true, reflections: 'env', antialiasing: 'smaa', godRays: true, fogCards: 'on', postGrade: true, interiorMapping: true, textureSize: 'high', anisotropy: 8, drawDistance: 1.0, lodBias: 1.0, vegetationDensity: 1.0, groundCoverRadius: 60, crowdDensity: 1.0, trafficDensity: 1.0, particles: 'high', lightPool: 8 },
    audio: { voiceLimit: 32, hrtf: true },
  },
  ultra: {
    graphics: { resolutionScale: 1.0, maxPixelRatio: 2, shadows: 'ultra', shadowDistance: 350, ao: 'high', bloom: true, reflections: 'planar+ssr', antialiasing: 'msaa4', godRays: true, fogCards: 'on', postGrade: true, interiorMapping: true, textureSize: 'ultra', anisotropy: 16, drawDistance: 1.25, lodBias: 1.3, vegetationDensity: 1.25, groundCoverRadius: 80, crowdDensity: 1.25, trafficDensity: 1.25, particles: 'ultra', lightPool: 8 },
    audio: { voiceLimit: 48, hrtf: true },
  },
};

/** Concrete numbers behind the enum options (Annex G 3.3). */
export const TABLES = {
  shadows: { off: { cascades: 0, mapSize: 0, pcf: 0 }, low: { cascades: 1, mapSize: 1024, pcf: 1 }, medium: { cascades: 2, mapSize: 1024, pcf: 5 }, high: { cascades: 3, mapSize: 2048, pcf: 9 }, ultra: { cascades: 4, mapSize: 2048, pcf: 16 } },
  // tier H [albedo, normal/ORM], S, D, atlas
  textureSize: { low: { H: [512, 256], S: 256, D: 128, atlas: 1024 }, medium: { H: [512, 512], S: 512, D: 256, atlas: 1024 }, high: { H: [1024, 512], S: 512, D: 256, atlas: 2048 }, ultra: { H: [1024, 1024], S: 512, D: 512, atlas: 2048 } },
  particles: { low: 500, medium: 1500, high: 4000, ultra: 8000 },
  treeCaps: { low: [80, 800], medium: [160, 1500], high: [300, 2500], ultra: [450, 4000] },
  ao: { off: { enabled: false, samples: 0 }, low: { enabled: true, samples: 8, halfRes: true }, high: { enabled: true, samples: 16, halfRes: true } },
  // shadow-casting batches per cascade (Annex G 2.3)
  shadowBatches: { off: 0, low: 60, medium: 80, high: 110, ultra: 140 },
};

const ORDER = {
  shadows: ['off', 'low', 'medium', 'high', 'ultra'], ao: ['off', 'low', 'high'], reflections: ['off', 'env', 'planar', 'planar+ssr'],
  antialiasing: ['off', 'fxaa', 'smaa', 'msaa4'], fogCards: ['off', 'low', 'on'], particles: ['low', 'medium', 'high', 'ultra'], textureSize: ['low', 'medium', 'high', 'ultra'],
};
export const rank = (field, v) => ORDER[field].indexOf(v);
/** the lower of two enum values (used so the governor never raises a value the user set lower) */
export const lowerOf = (field, a, b) => (rank(field, a) <= rank(field, b) ? a : b);

/** Chunk ring radii per drawDistance (Annex G 3.3) */
export function chunkRadii(drawDistance) {
  if (drawDistance <= 0.7) return [2, 5];
  if (drawDistance <= 0.85) return [3, 6];
  if (drawDistance <= 1.0) return [3, 8];
  return [4, 10];
}
const presetOfTier = (field, v) => (ORDER[field].indexOf(v) >= 0 ? v : 'high');

/** Validates one field; returns the coerced value or undefined when invalid. */
export function coerce(key, value) {
  const s = SCHEMA[key];
  if (!s) return undefined;
  if (s === 'bool') return typeof value === 'boolean' ? value : undefined;
  if (Array.isArray(s)) return s.includes(value) ? value : undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  let v = Math.min(s.max, Math.max(s.min, value));
  if (s.step) v = Math.round(v / s.step) * s.step;
  if (s.int) v = Math.round(v);
  return Math.round(v * 1000) / 1000;
}

/**
 * Concrete renderer parameters from (effective) graphics settings. `gov` carries governor-only deltas
 * ({cascadesDelta, midRadiusDelta}). Pure; this is what a renderer adapter consumes.
 */
export function derive(g, gov = { cascadesDelta: 0, midRadiusDelta: 0 }, devicePixelRatio = 1) {
  const sh = TABLES.shadows[g.shadows] || TABLES.shadows.high;
  const cascades = sh.cascades ? Math.max(1, sh.cascades + (gov.cascadesDelta || 0)) : 0;
  const [near, mid] = chunkRadii(g.drawDistance);
  const tierName = g.drawDistance <= 0.7 ? 'low' : g.drawDistance <= 0.85 ? 'medium' : g.drawDistance <= 1.0 ? 'high' : 'ultra';
  const tex = TABLES.textureSize[presetOfTier('textureSize', g.textureSize)];
  const fps = g.targetFps || 60;
  return {
    pixelRatio: Math.min(devicePixelRatio || 1, g.maxPixelRatio) * g.resolutionScale,
    resolutionScale: g.resolutionScale,
    shadows: { enabled: cascades > 0, cascades, mapSize: sh.mapSize, pcf: sh.pcf, maxFar: g.shadowDistance, blobShadows: cascades === 0, casterBatchesPerCascade: TABLES.shadowBatches[g.shadows] || 0, lastCascadeEvery: rank('shadows', g.shadows) <= 2 ? 2 : 1 },
    ao: { ...(TABLES.ao[g.ao] || TABLES.ao.off) },
    bloom: !!g.bloom, godRays: !!g.godRays, postGrade: !!g.postGrade, grain: !!g.postGrade && g.textureSize !== 'low',
    reflections: { mode: g.reflections, planar: g.reflections === 'planar' || g.reflections === 'planar+ssr', ssr: g.reflections === 'planar+ssr', planarScale: 0.5 },
    antialiasing: g.antialiasing, msaaSamples: g.antialiasing === 'msaa4' ? 4 : 0,
    fogCards: g.fogCards, interiorMapping: !!g.interiorMapping,
    textures: { tier: g.textureSize, H: tex.H.slice(), S: tex.S, D: tex.D, atlas: tex.atlas, anisotropy: g.anisotropy },
    drawDistance: g.drawDistance, chunkRadii: [near, Math.max(near, mid + (gov.midRadiusDelta || 0))], farClip: 9000 * Math.min(1, g.drawDistance), fogStartScale: g.drawDistance,
    lodBias: g.lodBias,
    vegetation: { density: g.vegetationDensity, groundCoverRadius: g.groundCoverRadius, treeCaps: TABLES.treeCaps[tierName].slice() },
    crowdDensity: g.crowdDensity, trafficDensity: g.trafficDensity,
    particles: { tier: g.particles, maxAlive: TABLES.particles[g.particles] || 4000 },
    lightPool: g.lightPool,
    uiBackdropBlur: g.textureSize !== 'low' || g.resolutionScale > 0.7,
    targetFrameMs: 1000 / fps, targetFps: g.targetFps,
    camera: { fov: g.fov, shake: g.cameraShake, motionReduce: !!g.motionReduce },
  };
}

/** Auto preset (Annex G 3.4): median benchmark frame time -> preset; software GL forces low. Pure. */
export function resolveAuto({ rendererString = '', medianFrameMs = null } = {}) {
  if (/SwiftShader|llvmpipe|Software/i.test(rendererString)) return 'low';
  if (medianFrameMs == null) return 'high';
  if (medianFrameMs <= 7) return 'ultra';
  if (medianFrameMs <= 12) return 'high';
  if (medianFrameMs <= 20) return 'medium';
  return 'low';
}

/** Median of benchmark frames, discarding the first 30 of 90 (Annex G 3.4). */
export function benchmarkMedian(frameTimes) {
  const a = Array.from(frameTimes.slice(30)).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : null;
}

function safeStorage(storage) {
  let store = storage === undefined ? null : storage, ok = false;
  try {
    if (store === null && typeof localStorage !== 'undefined') store = localStorage;
    if (store) { store.setItem('loe.probe', '1'); store.removeItem('loe.probe'); ok = true; }
  } catch (e) { ok = false; }
  return {
    get available() { return ok; },
    read() { if (!ok) return null; try { return store.getItem(STORAGE_KEY); } catch (e) { return null; } },
    write(text) { if (!ok) return false; try { store.setItem(STORAGE_KEY, text); return true; } catch (e) { return false; } },
  };
}

/** Merges stored settings JSON over defaults with per-field validation (unknown or invalid values are dropped). */
export function mergeStored(base, stored) {
  if (!stored || typeof stored !== 'object') return base;
  if (stored.graphics && typeof stored.graphics === 'object') {
    for (const k of Object.keys(stored.graphics)) { if (k === 'autoResolved') { if (PRESET_NAMES.includes(stored.graphics[k])) base.graphics.autoResolved = stored.graphics[k]; continue; } const v = coerce(k, stored.graphics[k]); if (v !== undefined) base.graphics[k] = v; }
  }
  for (const sec of ['audio', 'controls', 'gameplay', 'accessibility', 'debug']) {
    const src = stored[sec];
    if (!src || typeof src !== 'object') continue;
    for (const k of Object.keys(base[sec])) if (k in src && typeof src[k] === typeof base[sec][k]) base[sec][k] = src[k];
  }
  return base;
}

/**
 * createQuality({ settings?, bus?, storage?, devicePixelRatio? }) -> Quality
 *   get(path?)                   current user settings (or a field: 'graphics.shadows')
 *   set(pathOrPatch, value?)     edits graphics/audio fields; graphics edits switch preset to 'custom'
 *   applyPreset(name)            'low'|'medium'|'high'|'ultra'|'auto' (auto resolves through resolveAuto)
 *   apply(patch)                 MASTER_SPEC 5.11 Quality.apply(settings.graphics patch): idempotent
 *   subscribe(fn) -> unsubscribe fn({ settings, effective, derived, changed:[keys], source })
 *   setGovernorOverrides(effectiveGraphics, gov, level)   used by the governor; never persisted
 *   effective() / derived()      graphics after governor overrides / concrete renderer params
 *   setAdapter(adapter)          adapter.apply(derived, effective, changed) is called on every change (3B renderer)
 *   persist() / storageAvailable
 */
export function createQuality({ settings = null, bus = null, storage, devicePixelRatio = 1, load = true } = {}) {
  const store = safeStorage(storage);
  const S = settings || defaultSettings();
  if (load) { try { const t = store.read(); if (t) mergeStored(S, JSON.parse(t)); } catch (e) { /* corrupt settings: keep defaults */ } }
  const subs = new Set();
  let adapter = null, govEffective = null, gov = { cascadesDelta: 0, midRadiusDelta: 0 }, govLevel = 0;
  let cacheEff = null, cacheDer = null;

  const effective = () => (cacheEff || (cacheEff = govEffective ? { ...govEffective } : { ...S.graphics }));
  const derived = () => (cacheDer || (cacheDer = derive(effective(), gov, devicePixelRatio)));
  function notify(changed, source) {
    cacheEff = null; cacheDer = null;
    const ev = { settings: S, effective: effective(), derived: derived(), changed, source, governorLevel: govLevel };
    if (adapter) { try { adapter.apply(ev.derived, ev.effective, changed); } catch (e) { if (typeof console !== 'undefined') console.error('[quality] adapter failed', e); } }
    for (const fn of Array.from(subs)) { try { fn(ev); } catch (e) { if (typeof console !== 'undefined') console.error('[quality] subscriber failed', e); } }
    if (bus) {
      for (const k of changed) if (source !== 'governor') bus.emit('settings:changed', { path: k, value: getPath(k) });
      bus.emit('quality:changed', { preset: S.graphics.preset, governorLevel: govLevel });
    }
  }
  function getPath(p) { let o = S; for (const k of p.split('.')) { if (o == null) return undefined; o = o[k]; } return o; }
  function persist() { return store.write(JSON.stringify(S)); }

  function writeGraphics(patch, markCustom) {
    const changed = [];
    for (const k of Object.keys(patch)) {
      if (k === 'preset') continue;
      const v = coerce(k, patch[k]);
      if (v === undefined || S.graphics[k] === v) continue;
      S.graphics[k] = v; changed.push('graphics.' + k);
    }
    if (markCustom && changed.some((c) => !['graphics.adaptive', 'graphics.targetFps', 'graphics.fov', 'graphics.cameraShake', 'graphics.motionReduce'].includes(c)) && S.graphics.preset !== 'custom') { S.graphics.preset = 'custom'; changed.push('graphics.preset'); }
    return changed;
  }
  function writeAudio(patch) {
    const changed = [];
    for (const k of Object.keys(patch)) {
      if (!(k in S.audio) || typeof patch[k] !== typeof S.audio[k]) continue;
      let v = patch[k];
      if (k === 'voiceLimit') v = [16, 24, 32, 48].includes(v) ? v : S.audio.voiceLimit;
      else if (typeof v === 'number') v = Math.min(1, Math.max(0, v));
      if (S.audio[k] !== v) { S.audio[k] = v; changed.push('audio.' + k); }
    }
    return changed;
  }

  const Q = {
    get(path) { return path ? getPath(path) : S; },
    get settings() { return S; },
    get storageAvailable() { return store.available; },
    get governorLevel() { return govLevel; },
    set(pathOrPatch, value) {
      let changed = [];
      if (typeof pathOrPatch === 'string') {
        const [sec, key] = pathOrPatch.split('.');
        if (sec === 'graphics') { if (key === 'preset') return Q.applyPreset(value); changed = writeGraphics({ [key]: value }, true); }
        else if (sec === 'audio') changed = writeAudio({ [key]: value });
        else if (S[sec] && key in S[sec] && typeof S[sec][key] === typeof value) { if (S[sec][key] !== value) { S[sec][key] = value; changed = [pathOrPatch]; } }
      } else if (pathOrPatch && typeof pathOrPatch === 'object') {
        if (pathOrPatch.graphics) { if (pathOrPatch.graphics.preset && pathOrPatch.graphics.preset !== 'custom') changed.push(...Q.applyPreset(pathOrPatch.graphics.preset, true)); changed.push(...writeGraphics(pathOrPatch.graphics, true)); }
        if (pathOrPatch.audio) changed.push(...writeAudio(pathOrPatch.audio));
      }
      if (changed.length) { persist(); notify(changed, 'user'); }
      return changed;
    },
    /** MASTER_SPEC 5.11: Quality.apply(graphicsPatch). Idempotent: applying the same values twice changes nothing. */
    apply(patch) { return patch && patch.preset && patch.preset !== 'custom' && Object.keys(patch).length === 1 ? Q.applyPreset(patch.preset) : Q.set({ graphics: patch || {} }); },
    applyPreset(name, silent = false, { rendererString = '', medianFrameMs = null } = {}) {
      let target = name;
      if (name === 'auto') target = resolveAuto({ rendererString, medianFrameMs });
      const P = PRESETS[target];
      if (!P) return [];
      const changed = writeGraphics(P.graphics, false);
      changed.push(...writeAudio(P.audio));
      if (S.graphics.preset !== name) { S.graphics.preset = name; changed.push('graphics.preset'); }
      if (name === 'auto') { if (S.graphics.autoResolved !== target) { S.graphics.autoResolved = target; changed.push('graphics.autoResolved'); } if (!S.graphics.adaptive) { S.graphics.adaptive = true; changed.push('graphics.adaptive'); } }
      if (!silent && changed.length) { persist(); notify(changed, 'preset'); }
      return changed;
    },
    /** First launch / "Re-run benchmark": resolves the auto preset from the renderer string and benchmark frame times. */
    resolveAutoPreset(info) { if (S.graphics.preset === 'auto') return Q.applyPreset('auto', false, info); return []; },
    setGovernorOverrides(eff, govDeltas, level) {
      govEffective = eff; gov = govDeltas || { cascadesDelta: 0, midRadiusDelta: 0 }; govLevel = level | 0;
      notify(['governor'], 'governor');
    },
    effective, derived,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    setAdapter(a) { adapter = a; if (a) { try { a.apply(derived(), effective(), ['*']); } catch (e) { if (typeof console !== 'undefined') console.error('[quality] adapter failed', e); } } },
    setDevicePixelRatio(r) { devicePixelRatio = r || 1; cacheDer = null; },
    persist,
  };
  return Q;
}
