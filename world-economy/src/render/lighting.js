// Lighting, time of day, atmosphere and weather visuals (Annex A 3 grade table, 4.1-4.5).
// Key light = sun by day, moon by night (one directional light set, so CSM sees one light). Cascaded shadows via three's CSM
// addon (stabilised, practical split, fade). Region grade and fog lerp over 3 s on `player:region`; weather lerps over 20 s.
import * as THREE from 'three';
import { CSM } from 'three/addons/csm/CSM.js';
import { G } from './materials/patches.js';
import { MatLib } from './materials/matlib.js';
import { MemTracker } from './perf.js';

/** Annex A 3 per-region grade (temperature %, saturation, contrast, fog tint by day, fog density base) */
// V1 visual fix: fog tints are linear HDR haze colours (blue-white base, tinted per region) so distance goes blue, not grey.
const L = (r, g, b) => new THREE.Color().setRGB(r, g, b);
export const REGION_GRADE = {
  city: { temp: 0.09, sat: 1.06, con: 1.10, fog: L(0.74, 0.76, 0.86), dens: 0.0013 },
  lake: { temp: 0.0, sat: 1.0, con: 1.08, fog: L(0.62, 0.76, 0.92), dens: 0.0020 },
  ocean: { temp: 0.04, sat: 1.16, con: 1.08, fog: L(0.60, 0.80, 0.98), dens: 0.0009 },
  forest: { temp: -0.05, sat: 0.98, con: 1.10, fog: L(0.56, 0.72, 0.80), dens: 0.0036 },
};
/** Annex A 4.5 weather visuals */
export const WEATHER = {
  clear: { cover: 0.2, fog: 1.0, wet: 0, wind: 0.35, storm: 0 },
  cloudy: { cover: 0.6, fog: 1.2, wet: 0, wind: 0.6, storm: 0 },
  overcast: { cover: 0.95, fog: 1.6, wet: 0.1, wind: 0.6, storm: 0.25 },
  mist: { cover: 0.6, fog: 3.5, wet: 0.3, wind: 0.2, storm: 0.1 },
  rain: { cover: 1.0, fog: 2.0, wet: 1.0, wind: 0.6, storm: 0.45 },
  storm: { cover: 1.0, fog: 2.4, wet: 1.0, wind: 1.0, storm: 0.8 },
};
// fog density in the spec table is the visual target at the base; scaled down for our metric (exp height model)
const DENS_SCALE = 0.46;

export function createLighting({ scene, camera, renderer }) {
  const hemi = new THREE.HemisphereLight(0x8fb4ee, 0x7a6448, 0.45); hemi.name = 'hemi'; scene.add(hemi);
  const plain = new THREE.DirectionalLight(0xffffff, 3); plain.name = 'key'; plain.shadow.camera.layers.enable(1); scene.add(plain); scene.add(plain.target);
  scene.fog = new THREE.FogExp2(0x9fc2ee, 0.0007);
  let csm = null, shadowCfg = null;
  const sunCol = new THREE.Color(), horCol = new THREE.Color(), keyDir = new THREE.Vector3(), tmpC = new THREE.Color(), fogTarget = new THREE.Color();
  const st = { region: 'city', grade: { temp: 0.06, sat: 0.95, con: 1.05 }, fogCol: new THREE.Color(0x9fc2ee), fogDens: 0.0016, weather: { ...WEATHER.clear }, wType: 'clear', exposure: 1, sunColor: new THREE.Color(1, 0.9, 0.8), tintHi: new THREE.Color(1, 1, 1), tintLo: new THREE.Color(1, 1, 1), golden: 0, keyI: 0, interior: 0, lightning: 0, night: 0, day: 1, sunElev: 0.5 };
  const target = { grade: { ...st.grade }, fogCol: st.fogCol.clone(), fogDens: st.fogDens, weather: { ...WEATHER.clear } };

  function setShadows(cfg) {
    // cfg = derived.shadows: {enabled, cascades, mapSize, pcf, maxFar}
    const key = cfg.enabled ? `${cfg.cascades}:${cfg.mapSize}:${cfg.maxFar}:${cfg.pcf}` : 'off';
    if (shadowCfg === key) return false;
    shadowCfg = key;
    if (csm) { for (const l of csm.lights) MemTracker.removeRenderTarget(l.shadow); csm.remove(); csm.dispose(); csm = null; }
    renderer.shadowMap.enabled = cfg.enabled;
    renderer.shadowMap.type = cfg.pcf <= 1 ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    if (cfg.enabled) {
      csm = new CSM({ maxFar: cfg.maxFar, cascades: cfg.cascades, mode: 'practical', parent: scene, shadowMapSize: cfg.mapSize, lightDirection: new THREE.Vector3(-1, -1, -1).normalize(), camera, lightIntensity: 3, lightMargin: 120, shadowBias: -0.0004 });
      csm.fade = true;
      for (const l of csm.lights) { l.shadow.camera.layers.enable(1); l.shadow.normalBias = 0.04; l.shadow.radius = cfg.pcf >= 16 ? 3 : 2; MemTracker.addRenderTarget(l.shadow, cfg.mapSize, cfg.mapSize, 4); }
      plain.visible = false;
    } else plain.visible = true;
    MatLib.setCsm(csm);
    return true;
  }

  const api = {
    hemi, get csm() { return csm; }, state: st, setShadows,
    setRegion(r) { const g = REGION_GRADE[r]; if (!g) return; st.region = r; target.grade = { temp: g.temp, sat: g.sat, con: g.con }; target.fogCol.copy(g.fog); target.fogDens = g.dens; },
    setWeather(type) { const w = WEATHER[type] || WEATHER.clear; st.wType = WEATHER[type] ? type : 'clear'; target.weather = { ...w }; },
    setInterior(on) { st.interior = on ? 1 : 0; },
    /** sunDir: toward the sun; dt real seconds; hour 0..24 */
    update(sunDir, dt, hour, sky, camPos, time) {
      const k3 = 1 - Math.exp(-dt / 1.0), k20 = 1 - Math.exp(-dt / 6.0);
      for (const f of ['temp', 'sat', 'con']) st.grade[f] += (target.grade[f] - st.grade[f]) * k3;
      st.fogDens += (target.fogDens - st.fogDens) * k3;
      for (const f of ['cover', 'fog', 'wet', 'wind', 'storm']) st.weather[f] += (target.weather[f] - st.weather[f]) * k20;
      const elev = sunDir[1]; st.sunElev = elev;
      const day = THREE.MathUtils.smoothstep(elev, -0.08, 0.2); st.day = day; st.night = 1 - THREE.MathUtils.smoothstep(elev, -0.16, 0.02);
      const cover = st.weather.cover, storm = st.weather.storm;
      const golden = Math.max(0, 1 - Math.abs(elev - 0.1) / 0.42) * (1 - cover * 0.6);
      // key light: sun (colour temperature falls with elevation: ~5500 K high, ~4300 K at 08:00, ~2500 K near the horizon) or moon (cool)
      const moon = elev < -0.04;
      if (!moon) {
        const e = Math.max(elev, 0);
        sunCol.setRGB(1.0, 0.44, 0.17);
        sunCol.lerp(tmpC.setRGB(1.0, 0.64, 0.34), THREE.MathUtils.smoothstep(e, 0.0, 0.16));
        sunCol.lerp(tmpC.setRGB(1.0, 0.82, 0.60), THREE.MathUtils.smoothstep(e, 0.14, 0.45));
        sunCol.lerp(tmpC.setRGB(1.0, 0.92, 0.80), THREE.MathUtils.smoothstep(e, 0.42, 0.8));
        keyDir.set(-sunDir[0], -sunDir[1], -sunDir[2]);
      } else {
        sunCol.setRGB(0.50, 0.64, 1.0);
        keyDir.set(sunDir[0], Math.min(-0.35, sunDir[1]), sunDir[2]).normalize();
      }
      // sun strength: 7.0 against a sky fill of ~0.3 radiance, so shadow:sun is roughly 1:5 (clear day); thin air near the horizon absorbs some
      const ext = 0.5 + 0.5 * THREE.MathUtils.smoothstep(elev, 0.0, 0.3);
      let keyI = moon ? 0.30 : 7.0 * ext * THREE.MathUtils.smoothstep(elev, -0.04, 0.1) * (1 - 0.8 * Math.max(0, cover - 0.4) * 1.4) * (1 - 0.5 * storm);
      keyI = Math.max(keyI, 0);
      if (st.lightning > 0) { keyI += st.lightning * 16; st.lightning = Math.max(0, st.lightning - dt * 6); }
      if (csm) { csm.lightDirection.copy(keyDir); for (const l of csm.lights) { l.intensity = keyI; l.color.copy(sunCol); l.castShadow = keyI > 0.05; } csm.update(); }
      plain.intensity = keyI; plain.color.copy(sunCol);
      plain.position.set(camPos.x - keyDir.x * 400, camPos.y - keyDir.y * 400, camPos.z - keyDir.z * 400); plain.target.position.copy(camPos); plain.target.updateMatrixWorld();
      // ambient fill: blue sky from above, warm earth bounce from below (the env cube carries the rest); night keeps a cool blue fill
      hemi.intensity = 0.5 + 0.9 * st.night * (1 - 0.5 * st.day);
      hemi.color.setRGB(0.30 + 0.25 * golden + 0.1 * st.night, 0.48 + 0.1 * (1 - golden) + 0.1 * st.night, 0.95).multiplyScalar(0.25 + 0.75 * day + 0.3 * st.night);
      hemi.groundColor.setRGB(0.42 * day + 0.04, 0.30 * day + 0.045, 0.18 * day + 0.07);
      // haze colour doubles as the sky horizon: blue-white by day (region tinted), warm toward dusk, grey with cover, deep blue at night
      fogTarget.copy(target.fogCol);
      fogTarget.lerp(tmpC.setRGB(0.95, 0.62, 0.42), golden * 0.45);
      fogTarget.lerp(tmpC.setRGB(0.50, 0.54, 0.60), Math.max(0, cover - 0.4) * 0.8);
      fogTarget.multiplyScalar(0.05 + 0.95 * day);
      fogTarget.lerp(tmpC.setRGB(0.018, 0.026, 0.05), st.night * 0.9);
      st.fogCol.lerp(fogTarget, Math.min(1, k3 * 3));
      scene.fog.color.copy(st.fogCol);
      scene.fog.density = st.fogDens * DENS_SCALE * st.weather.fog * (st.interior ? 0.2 : 1);
      G.uFogFall.value = 0.0032 / Math.max(1, st.weather.fog * 0.6);
      G.uSunDir.value.set(sunDir[0], sunDir[1], sunDir[2]);
      G.uSunFog.value.copy(sunCol).multiplyScalar(1.25 * day * (1 - cover * 0.7));
      // global surface uniforms
      G.uTime.value = time; G.uWet.value = st.weather.wet; G.uWind.value.set(1, 0, 0.35); G.uWindStr.value = st.weather.wind;
      G.uNight.value = st.night; G.uLampGain.value = 7 * st.night;
      const h = ((hour % 24) + 24) % 24;
      G.uWinLit.value = h >= 19 && h < 23 ? 0.62 : h >= 23 || h < 1 ? 0.4 : h < 5 ? 0.1 : h < 7 ? 0.3 : h < 17 ? 0.08 : 0.3 + (h - 17) * 0.15;
      G.uWinGain.value = 0.03 + 2.6 * st.night;
      st.sunColor.copy(sunCol); st.golden = golden; st.keyI = keyI;
      // sky: horizon = haze colour, zenith deepens with clear air
      if (sky) {
        const u = sky.uniforms;
        u.uSun.value.set(sunDir[0], sunDir[1], sunDir[2]); u.uMoon.value.set(-sunDir[0], Math.abs(sunDir[1]) * 0.8 + 0.25, -sunDir[2]).normalize();
        u.uFog.value.copy(st.fogCol); u.uSunCol.value.copy(sunCol).multiplyScalar(day); u.uCover.value = cover; u.uStorm.value = storm;
        u.uNight.value = st.night; u.uDayAmt.value = day * (1 - 0.55 * storm); u.uTime.value = time;
        // zenith: deep blue by day, indigo toward dusk, greyed by cloud and storm
        horCol.setRGB(0.10, 0.27, 0.88); horCol.lerp(tmpC.setRGB(0.13, 0.17, 0.52), golden * 0.7);
        horCol.lerp(tmpC.setRGB(0.36, 0.40, 0.46), Math.min(1, Math.max(0, cover - 0.3) * 1.1));
        u.uZenith.value.copy(horCol).multiplyScalar(day);
        // what the world below the horizon looks like to reflections and ambient bounce: sunlit warm ground, never black glass
        u.uGround.value.copy(st.fogCol).multiplyScalar(0.6).lerp(tmpC.setRGB(0.75, 0.62, 0.46).multiplyScalar(day * (0.4 + 0.6 * (1 - cover * 0.6))), 0.6 * day);
      }
      // grading helpers: warm highlights, cool shadows by day; moonlit cool at night
      st.tintHi.setRGB(1.04 + 0.05 * golden, 1.0, 0.95 - 0.07 * golden).lerp(tmpC.setRGB(0.92, 1.0, 1.15), st.night);
      st.tintLo.setRGB(0.90, 0.98, 1.16).lerp(tmpC.setRGB(0.82, 0.95, 1.22), st.night);
      // exposure (approximation of 1.5 s auto exposure: driven by the key light and interior state)
      const expT = st.interior ? 1.15 : 0.52 + (1 - day) * 0.85 + cover * 0.22;
      st.exposure += (expT - st.exposure) * (1 - Math.exp(-dt / 1.5));
    },
    flash() { st.lightning = 1; },
    get shadowKey() { return shadowCfg; },
  };
  return api;
}
