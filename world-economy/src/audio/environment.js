// Environment -> ambience (Annex E 4.2, 5). Pure rule functions (Node-testable) and the live bed/emitter/scheduler manager.
// env = { region, district, interior, timeOfDay, weather:{type,intensity}|type, wetness, underwater, speed,
//         optional: wind 0..1, crowd (pedestrians nearby), inVehicle, onBoat, altitude, waterDist:{lake, river, ocean} }

const CITY_CORE = ['city.oldtown', 'city.downtown', 'city.midtown'];
const CONIFER = ['lake.pinehaven', 'lake.westbank', 'forest.gate', 'forest.timberline', 'forest.highridge', 'forest.sawmill'];
const weatherOf = (env) => (typeof env.weather === 'string' ? { type: env.weather, intensity: env.intensity || 0.5 } : env.weather || { type: 'clear', intensity: 0 });
export const isNight = (h) => h >= 20 || h < 5;
/** traffic hour multiplier (Annex B 8 shape: night trough, morning and evening peaks) */
export function trafficHour(h) { const x = ((h % 24) + 24) % 24; if (x < 5) return 0.3; if (x < 7) return 0.3 + 0.35 * (x - 5); if (x < 9) return 1.0; if (x < 16) return 0.8; if (x < 19) return 1.0; if (x < 23) return 1.0 - 0.15 * (x - 19); return 0.35; }

/** bed id -> target level 0..1 */
export function ambienceTargets(env) {
  const T = {}, h = env.timeOfDay == null ? 12 : env.timeOfDay, w = weatherOf(env), region = env.region || 'city', dist = env.district || '';
  const night = isNight(h), day = h >= 6 && h < 19.5, raining = w.type === 'rain' || w.type === 'storm';
  const wind = env.wind != null ? env.wind : (w.type === 'storm' ? 0.9 : raining ? 0.6 : 0.35);
  const wd = env.waterDist || {};
  const outdoor = env.interior ? 0.3 : 1; // interior: outdoor beds heard through walls (plus the 1.2 kHz bus lowpass)
  if (region === 'city') {
    T['amb.city.traffic_hum'] = trafficHour(h) * (dist === 'city.industrial' || dist === 'city.docks' ? 0.7 : 1);
    const crowd = env.crowd != null ? env.crowd : (CITY_CORE.includes(dist) || dist === 'city.market') && h >= 8 && h < 21 ? 6 : 0;
    if (crowd > 4) T['amb.city.crowd'] = Math.min(1, 0.4 + (crowd - 4) / 10);
    if (dist === 'city.downtown' || dist === 'city.industrial') T['amb.city.hvac'] = night ? 0.8 : 0.5;
  }
  T['amb.wind.open'] = Math.min(1, 0.25 + wind * 0.6 + Math.max(0, (env.altitude || 0) - 30) / 200);
  if (region === 'forest' || region === 'lake' || dist === 'city.oldtown') T['amb.wind.trees'] = (region === 'city' ? 0.25 : 0.55) * (0.5 + wind);
  if (CONIFER.includes(dist)) T['amb.wind.pines'] = 0.6 * (0.6 + wind * 0.6);
  if (wd.lake != null ? wd.lake < 40 : region === 'lake' && dist !== 'lake.westbank') T['amb.water.lake_lap'] = wd.lake != null ? 1 - wd.lake / 40 : 0.7;
  if (wd.river != null && wd.river < 60) T['amb.water.river'] = 1 - wd.river / 60;
  if (region === 'ocean') T['amb.water.ocean_waves'] = wd.ocean != null ? Math.max(0, 1 - wd.ocean / 150) : ['ocean.palmcove', 'ocean.seagrass', 'ocean.sea'].includes(dist) ? 1 : 0.35;
  if (dist === 'ocean.marina' || dist === 'ocean.portcalder' || dist === 'city.docks') T['amb.water.harbor'] = 0.8;
  if (raining) { if (w.type === 'storm' || w.intensity >= 0.6) T['amb.rain.heavy'] = Math.min(1, 0.5 + w.intensity * 0.5); else T['amb.rain.light'] = 0.4 + w.intensity; }
  if (night && !CITY_CORE.includes(dist) && !raining && region !== 'ocean') T['amb.night.crickets'] = 0.8;
  if (night && region === 'lake') T['amb.night.frogs'] = 0.7;
  if (region === 'forest' && day) T['amb.forest.day'] = 0.8;
  for (const k of Object.keys(T)) T[k] *= outdoor;
  if (env.interior) { T['amb.interior.room'] = 1; if (/diner|restaurant|cafe/.test(env.interior)) T['amb.interior.diner'] = 0.9; }
  if (env.inVehicle) T['amb.interior.vehicle'] = 1;
  if (env.onBoat) T['amb.boat.hull'] = 1;
  return T;
}
export function reverbFor(env) {
  if (env.interior) return /boathouse|warehouse|hall|garage|depot/.test(env.interior) ? 'ir.room_large' : /cabin/.test(env.interior) ? 'ir.cabin' : 'ir.room_small';
  if (env.region === 'city') return 'ir.city';
  if (env.region === 'forest') return 'ir.forest';
  return 'ir.open';
}
/** bus lowpass targets (Hz) and ambience/world-sfx trim dB */
export function busFilters(env) {
  if (env.underwater) return { ambience: 400, sfx: 400, vehicles: 400, music: 400, trimDb: 0 };
  if (env.inVehicle && env.closedVehicle !== false) return { ambience: 1800, sfx: 1800, vehicles: 20000, music: 20000, trimDb: -4 };
  if (env.interior) return { ambience: 1200, sfx: 20000, vehicles: 20000, music: 20000, trimDb: 0 };
  return { ambience: 20000, sfx: 20000, vehicles: 20000, music: 20000, trimDb: 0 };
}
/** scheduler one-shot rates per minute (Annex E 5 table, peak values) */
export function schedulerRates(env) {
  const R = {}, h = env.timeOfDay == null ? 12 : env.timeOfDay, region = env.region || 'city', dist = env.district || '', w = weatherOf(env);
  const night = isNight(h), dawn = h >= 5 && h < 8, dusk = h >= 18.5 && h < 21, day = h >= 6 && h < 19.5, raining = w.type === 'rain' || w.type === 'storm';
  if (!env.interior && !env.underwater) {
    const birds = (region === 'forest' ? 10 : region === 'lake' ? 7 : dist === 'city.oldtown' ? 4 : 0) * (dawn ? 2 : day ? 1 : 0) * (raining ? 0.2 : 1);
    if (birds) for (const k of ['a', 'b', 'c']) R['amb.once.bird_song_' + k] = birds / 3;
    if (region === 'ocean') R['amb.once.gull'] = 6; else if (dist === 'city.docks') R['amb.once.gull'] = 2;
    if (dist === 'forest.timberline' || dist === 'forest.sawmill') R['amb.once.crow'] = 3; else if (region === 'city' && day) R['amb.once.crow'] = 0.3;
    if (region === 'lake' && (dusk || night)) R['amb.once.loon'] = 0.5;
    if (region === 'forest' && night) R['amb.once.owl'] = 0.4;
    if (region === 'forest' && day) { R['amb.once.woodpecker'] = 0.6; R['amb.once.chainsaw_far'] = 0.3; }
    if (dist === 'city.northgate' || dist === 'city.eastside' || dist === 'lake.pinehaven') R['amb.once.dog_bark'] = 0.4;
    if (region === 'city') { R['amb.once.car_horn'] = 1.5 * trafficHour(h); R['amb.once.siren'] = 0.15; if (night) R['amb.once.train_far'] = 0.05; }
    if (dist === 'ocean.portcalder' || dist === 'city.docks') R['amb.once.boat_horn'] = 0.2;
    if (region === 'lake' && (dawn || dusk)) R['amb.once.fish_jump'] = 1;
  }
  if (w.type === 'storm') R['amb.once.thunder'] = 1.2;
  return R;
}

/**
 * Live manager. deps = { ctx, out(bus) -> AudioNode, startLoop(id, dest, params) -> handle, play(id, opts) }.
 * Beds crossfade over 3 s; scheduled beds get schedule() calls; schedulers fire Poisson one-shots 15-80 m around the listener.
 */
export function createAmbienceManager(deps) {
  const beds = new Map(); // id -> {h, g, target}
  let targets = {}, rates = {}, lastEnv = null;
  const listener = [0, 0, 0];
  const M = {
    beds,
    setEnvironment(env) { lastEnv = env; targets = ambienceTargets(env); rates = schedulerRates(env); M.apply(); },
    apply() {
      const ctx = deps.ctx, at = ctx.currentTime;
      for (const [id, lvl] of Object.entries(targets)) {
        if (lvl <= 0.01) continue;
        let b = beds.get(id);
        if (!b || b.dying) {
          if (b) { try { b.h.stop(at, 0.1); } catch (e) { /* gone */ } }
          const g = ctx.createGain(); g.gain.value = 0; g.connect(deps.out('ambience'));
          const h = deps.startLoop(id, g, {});
          if (!h) continue;
          b = { h, g, dying: false }; beds.set(id, b);
        }
        b.g.gain.setTargetAtTime(lvl, at, 1.0); // ~3 s to settle
      }
      for (const [id, b] of beds) if (!(targets[id] > 0.01) && !b.dying) { b.dying = true; b.dieAt = at + 3.5; b.g.gain.setTargetAtTime(0, at, 1.0); }
    },
    setParam(param, value) { for (const b of beds.values()) if (!b.dying) b.h.set(param, value); },
    setListener(p) { listener[0] = p[0]; listener[1] = p[1]; listener[2] = p[2]; },
    update(dt) {
      const ctx = deps.ctx, now = ctx.currentTime;
      for (const [id, b] of beds) {
        if (b.dying && now >= b.dieAt) { b.h.stop(now, 0.05); b.g.disconnect(); beds.delete(id); continue; }
        if (b.h.schedule) b.h.schedule(now, now + 0.3);
      }
      for (const id in rates) {
        if (Math.random() < (rates[id] / 60) * dt) {
          const a = Math.random() * Math.PI * 2, d = 15 + Math.random() * 65;
          deps.play(id, { pos: [listener[0] + Math.cos(a) * d, listener[1] + 2 + Math.random() * 8, listener[2] + Math.sin(a) * d] });
        }
      }
    },
    get env() { return lastEnv; }, get targets() { return targets; }, get rates() { return rates; },
    stopAll() { const at = deps.ctx.currentTime; for (const b of beds.values()) b.h.stop(at, 0.2); beds.clear(); },
  };
  return M;
}
