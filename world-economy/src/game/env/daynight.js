// Day/night: sun direction from time of day (Annex A 4.1). Sunrise 06:00, sunset 20:00, max elevation 62 deg. Pure.
const DEG = Math.PI / 180;
/** direction TOWARD the sun. +X east, +Z south. */
export function sunDirection(hour, out = [0, 1, 0]) {
  const h = ((hour % 24) + 24) % 24;
  const f = (h >= 6 ? h - 6 : h + 18) / 14; // 0 at sunrise, 1 at sunset, 1.71 at the next sunrise
  let elev;
  if (f <= 1) elev = Math.sin(f * Math.PI) * 62 * DEG;
  else elev = -Math.sin(((f - 1) / 0.714) * Math.PI) * 38 * DEG;
  const th = f * Math.PI;
  const ce = Math.cos(elev);
  out[0] = Math.cos(th) * ce; out[1] = Math.sin(elev); out[2] = Math.sin(th) * ce;
  return out;
}
export function phaseAt(hour) { return hour >= 5.5 && hour < 7.5 ? 'dawn' : hour >= 7.5 && hour < 18.5 ? 'day' : hour >= 18.5 && hour < 20.5 ? 'dusk' : 'night'; }
export function createEnv() {
  return { timeOfDay: 8, sunDir: sunDirection(8), weather: { type: 'clear', intensity: 0, wetness: 0, wind: [1, 0, 0.3], fog: 1 } };
}
