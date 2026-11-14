// Lighting, time of day, atmosphere and weather visuals (Annex A 3 grade table, 4.1-4.5).
// Key light = sun by day, moon by night (one directional light set, so CSM sees one light). Cascaded shadows via three's CSM
// addon (stabilised, practical split, fade). Region grade and fog lerp over 3 s on `player:region`; weather lerps over 20 s.
import * as THREE from 'three';
import { CSM } from 'three/addons/csm/CSM.js';
import { G } from './materials/patches.js';
import { MatLib } from './materials/matlib.js';
import { MemTracker } from './perf.js';

const C = (hex) => new THREE.Color(hex);
/** Annex A 3 per-region grade (temperature %, saturation, contrast, fog tint by day, fog density base) */
export const REGION_GRADE = {
  city: { temp: 0.06, sat: 0.95, con: 1.05, fog: C(0xcfc6b4), dens: 0.0016 },
  lake: { temp: 0.0, sat: 0.92, con: 1.02, fog: C(0xb9c8cf), dens: 0.0022 },
  ocean: { temp: 0.03, sat: 1.05, con: 1.0, fog: C(0xd6e3e8), dens: 0.0012 },
  forest: { temp: -0.04, sat: 0.88, con: 1.06, fog: C(0xaebcb2), dens: 0.004 },
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
const DENS_SCALE = 0.42;

export function createLighting({ scene, camera, renderer }) {
  const hemi = new THREE.HemisphereLight(0xcfe0f2, 0x6a6458, 0.35); hemi.name = 'hemi'; scene.add(hemi);
  const plain = new THREE.DirectionalLight(0xffffff, 3); plain.name = 'key'; scene.add(plain); scene.add(plain.target);
  scene.fog = new THREE.FogExp2(0xcfc6b4, 0.0007);
  let csm = null, shadowCfg = null;
  const sunCol = new THREE.Color(), keyDir = new THREE.Vector3(), tmpC = new THREE.Color(), fogTarget = new THREE.Color();
  const st = { region: 'city', grade: { temp: 0.06, sat: 0.95, con: 1.05 }, fogCol: new THREE.Color(0xcfc6b4), fogDens: 0.0016, weather: { ...WEATHER.clear }, wType: 'clear', exposure: 1, interior: 0, lightning: 0, night: 0, day: 1, sunElev: 0.5 };
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
      for (const l of csm.lights) { l.shadow.normalBias = 0.04; l.shadow.radius = cfg.pcf >= 16 ? 3 : 2; MemTracker.addRenderTarget(l.shadow, cfg.mapSize, cfg.mapSize, 4); }
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
      // key light: sun (warm near the horizon) or moon (cool, 0.08 of the sun)
      const moon = elev < -0.04;
      if (!moon) {
        const warm = 1 - THREE.MathUtils.smoothstep(elev, 0.02, 0.45);
        sunCol.setRGB(1.0, 0.92 - 0.3 * warm, 0.82 - 0.5 * warm);
        keyDir.set(-sunDir[0], -sunDir[1], -sunDir[2]);
      } else {
        sunCol.setRGB(0.55, 0.65, 0.9);
        keyDir.set(sunDir[0], Math.min(-0.35, sunDir[1]), sunDir[2]).normalize();
      }
      const cover = st.weather.cover, storm = st.weather.storm;
      let keyI = moon ? 0.26 : 3.4 * THREE.MathUtils.smoothstep(elev, -0.04, 0.12) * (1 - 0.65 * Math.max(0, cover - 0.5) * 2) * (1 - 0.5 * storm);
      keyI = Math.max(keyI, 0);
      if (st.lightning > 0) { keyI += st.lightning * 8; st.lightning = Math.max(0, st.lightning - dt * 6); }
      if (csm) { csm.lightDirection.copy(keyDir); for (const l of csm.lights) { l.intensity = keyI; l.color.copy(sunCol); l.castShadow = keyI > 0.05; } csm.update(); }
      plain.intensity = keyI; plain.color.copy(sunCol);
      plain.position.set(camPos.x - keyDir.x * 400, camPos.y - keyDir.y * 400, camPos.z - keyDir.z * 400); plain.target.position.copy(camPos); plain.target.updateMatrixWorld();
      // ambient fill (env map does most of it); night keeps a dim blue fill so scenes never go black
      hemi.intensity = 0.15 + 0.35 * day + 0.25 * st.night;
      hemi.color.setRGB(0.55 + 0.25 * day, 0.62 + 0.25 * day, 0.85);
      hemi.groundColor.setRGB(0.25 * day + 0.05, 0.22 * day + 0.05, 0.2 * day + 0.06);
      // fog colour: region tint by day, warm at golden hour, deep blue at night, greyer with cover
      fogTarget.copy(target.fogCol);
      const golden = Math.max(0, 1 - Math.abs(elev - 0.08) / 0.16) * (1 - cover * 0.6);
      fogTarget.lerp(tmpC.setRGB(0.92, 0.66, 0.44), golden * 0.55);
      fogTarget.lerp(tmpC.setRGB(0.62, 0.65, 0.68), Math.max(0, cover - 0.4) * 0.8);
      fogTarget.multiplyScalar(0.06 + 0.94 * day);
      fogTarget.lerp(tmpC.setRGB(0.018, 0.024, 0.04), st.night * 0.9);
      st.fogCol.lerp(fogTarget, Math.min(1, k3 * 3));
      scene.fog.color.copy(st.fogCol);
      scene.fog.density = st.fogDens * DENS_SCALE * st.weather.fog * (st.interior ? 0.2 : 1);
      G.uFogFall.value = 0.0045 / Math.max(1, st.weather.fog * 0.6);
      G.uSunDir.value.set(sunDir[0], sunDir[1], sunDir[2]);
      G.uSunFog.value.copy(sunCol).multiplyScalar(day * (1 - cover * 0.7));
      // global surface uniforms
      G.uTime.value = time; G.uWet.value = st.weather.wet; G.uWind.value.set(1, 0, 0.35); G.uWindStr.value = st.weather.wind;
      G.uNight.value = st.night; G.uLampGain.value = 7 * st.night;
      const h = ((hour % 24) + 24) % 24;
      G.uWinLit.value = h >= 19 && h < 23 ? 0.62 : h >= 23 || h < 1 ? 0.4 : h < 5 ? 0.1 : h < 7 ? 0.3 : h < 17 ? 0.08 : 0.3 + (h - 17) * 0.15;
      G.uWinGain.value = 0.3 + 2.4 * st.night;
      // sky
      if (sky) {
        const u = sky.uniforms;
        u.uSun.value.set(sunDir[0], sunDir[1], sunDir[2]); u.uMoon.value.set(-sunDir[0], Math.abs(sunDir[1]) * 0.8 + 0.25, -sunDir[2]).normalize();
        u.uFog.value.copy(st.fogCol); u.uSunCol.value.copy(sunCol).multiplyScalar(day); u.uCover.value = cover; u.uStorm.value = storm;
        u.uNight.value = st.night; u.uDayAmt.value = day * (1 - 0.55 * storm); u.uTime.value = time;
        u.uTurb.value = 4 + 6 * cover + 4 * golden; u.uRay.value = 1.2 + 1.0 * day;
        u.uZenith.value.setRGB(0.35, 0.45, 0.6).multiplyScalar(0.2 + 0.8 * day);
      }
      // exposure (approximation of 1.5 s auto exposure: driven by the key light and interior state)
      const expT = st.interior ? 1.9 : 0.95 + 0.9 * st.night * 0 + (1 - day) * 0.6 + cover * 0.2;
      st.exposure += (expT - st.exposure) * (1 - Math.exp(-dt / 1.5));
    },
    flash() { st.lightning = 1; },
    get shadowKey() { return shadowCfg; },
  };
  return api;
}
