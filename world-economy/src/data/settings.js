// Settings schema and defaults (Annex G 3.1). Stage 2 uses graphics + debug; the rest is stored for later stages.
export function defaultSettings() {
  return {
    graphics: {
      preset: 'auto', adaptive: true, targetFps: 60, resolutionScale: 1.0, maxPixelRatio: 1.5, shadows: 'high',
      shadowDistance: 220, ao: 'high', bloom: true, reflections: 'env', antialiasing: 'smaa', godRays: true, fogCards: 'on',
      postGrade: true, interiorMapping: true, textureSize: 'high', anisotropy: 8, drawDistance: 1.0, lodBias: 1.0,
      vegetationDensity: 1.0, groundCoverRadius: 60, crowdDensity: 1.0, trafficDensity: 1.0, particles: 'high', lightPool: 8,
      cameraShake: 1.0, motionReduce: false, fov: 60,
    },
    audio: { master: 0.8, music: 0.6, ambience: 0.8, sfx: 0.9, vehicles: 0.8, ui: 0.7, voiceLimit: 32, hrtf: true, reverb: true, muteOnBlur: true },
    controls: { bindings: {}, mouseSensitivity: 1.0, invertY: false, toggleSprint: false, holdToReel: true, vibration: true },
    gameplay: { cameraDefault: 'third', units: 'metric', timingLeniency: 'standard', autosave: true, tutorial: true, northUpMinimap: false },
    accessibility: { uiScale: 1.0, cueIcons: true, colourBlindSafe: false, reducedMotion: false },
    debug: { blockout: false, perfHud: false },
  };
}
// Chunk ring radii per drawDistance (Annex G 3.3): [near, mid]
export function ringRadii(drawDistance = 1.0) {
  if (drawDistance <= 0.7) return [2, 5];
  if (drawDistance <= 0.85) return [3, 6];
  if (drawDistance <= 1.0) return [3, 8];
  return [4, 10];
}
