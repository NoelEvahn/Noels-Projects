// SPACE pack: rocky worlds. Earth (modelled continents, raised land, drifting 3D cloud puffs + hurricane, night-side city lights, atmosphere rim),
// Moon (real modelled craters + maria), Mars (Valles Marineris, Olympus Mons, polar caps, Phobos/Deimos), Mercury, Venus, Pluto (heart), Ceres.
// Detail is geometry + vertex colours. Every world records userData.realRadiusM and unitsPerM (render units per real metre) so size comparisons are exact.
import * as THREE from 'three';
import { rng, mat, setShadows } from '../util.js';
import { TAU, rgb, mix3, V3, noise3, fbm3, sstep, bodyGeo, lonLat, craterField, vcMat, sprites, atmosphere, glowDot, rockGeo } from '../fx/space_kit.js';

export const REAL = { sun: 6.957e8, mercury: 2.4397e6, venus: 6.0518e6, earth: 6.371e6, moon: 1.7374e6, mars: 3.3895e6, ceres: 4.73e5, jupiter: 6.9911e7, saturn: 5.8232e7, uranus: 2.5362e7, neptune: 2.4622e7, pluto: 1.1883e6 };
export const SUN_DIR = [0.45, 0.8, 0.6];   // direction towards the sun used by default (matches the library viewer's key light)
export function meta(g, name, R, realRadiusM, extra = {}) {
  Object.assign(g.userData, { name, realRadiusM, realDiameterM: realRadiusM * 2, realHeightM: realRadiusM * 2, realWidthM: realRadiusM * 2, radiusUnits: R, unitsPerM: R / realRadiusM,
    scaleNote: `radius ${R} units = ${(realRadiusM / 1000).toFixed(0)} km, so 1 unit = ${(realRadiusM / R / 1000).toFixed(realRadiusM / R > 1e5 ? 0 : 1)} km`, ...extra });
  return g;
}
const D2R = Math.PI / 180;

// ---------- Earth ----------
const poly = (a) => { const p = []; for (let i = 0; i < a.length; i += 2) p.push([a[i], a[i + 1]]); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { p, x0, x1, y0, y1 }; };
const LAND = [
  // North America (with Central America)
  [-168, 66, -162, 70, -156, 71.5, -141, 70, -128, 70, -115, 68, -100, 68, -95, 72, -85, 69, -82, 66, -90, 62, -93, 58, -85, 55, -80, 52, -79, 58, -77, 62, -70, 60, -65, 60, -62, 57, -56, 52, -60, 47, -66, 45, -70, 43, -70, 41.5, -74, 40, -76, 37, -76, 35, -81, 31, -80, 26, -81, 25.5, -83, 29, -85, 30, -89, 30, -94, 29.5, -97, 27, -97.5, 22, -95, 18.5, -91, 18.5, -90.5, 21, -87, 21.5, -88, 16, -84, 15.5, -83, 11, -80, 9, -77.5, 8.5, -79, 7.5, -83, 8.3, -86, 11, -87.5, 13, -92, 14.5, -96, 15.8, -101, 17.5, -105.5, 20, -105.5, 23, -109, 26, -112.5, 29.5, -114.7, 31.5, -112.5, 27, -110, 23.5, -110, 23, -112, 25, -114.5, 28.5, -117, 32.5, -120.6, 34.5, -122.5, 37.5, -124, 40.5, -124, 46, -124.5, 48.3, -128, 51, -131, 54.5, -135, 58, -140, 60, -147, 61, -152, 59, -158, 56.5, -163, 54.8, -158, 58, -162, 60, -165, 62, -161, 64, -168, 65.5],
  // South America
  [-77, 8.5, -72, 12, -68, 10.7, -62, 10.7, -60, 8.5, -55, 5.8, -51, 4.5, -50, 0, -45, -1.5, -40, -3, -35, -5.5, -35, -9, -38.5, -13, -39, -17, -41, -22, -45, -23.5, -48.5, -26, -48.7, -28.5, -53, -33.5, -57, -35, -57.5, -38, -62, -39, -65, -41, -64, -43, -67.5, -46, -66, -48, -69, -51, -68.5, -53, -72, -54, -74.5, -52, -75.5, -47, -73.5, -43, -73.5, -38, -71.5, -30, -70.5, -23, -70.2, -18.3, -75, -15, -77.5, -12, -81, -6, -80, -3, -80.2, -1, -78.8, 1.5, -77.5, 4, -77.4, 7],
  // Africa
  [-17, 21, -16, 24, -13, 27.5, -9.7, 30, -9.8, 31.5, -6, 35.8, -2, 35.2, 3, 36.8, 10, 37.2, 11, 35, 10.3, 33.8, 15, 32.3, 20, 32.5, 20, 31, 25, 31.7, 32.5, 31.2, 32.5, 30, 33, 28, 35, 24, 37, 21, 38.5, 18, 40, 15.5, 43.2, 12.5, 43, 11.6, 51, 12, 51.2, 10.5, 48, 5, 45, 2, 41, -1.5, 39.5, -5, 39, -7, 40.5, -11, 40.5, -15, 36, -19, 35, -24, 32.8, -26, 32.5, -28.5, 30, -31.5, 27, -33.7, 22, -34.2, 18.4, -34, 17.5, -30, 15, -26, 14.4, -22, 11.8, -17.5, 13.8, -12, 13, -9, 12, -5, 9, -1, 9.5, 3, 7, 4.3, 4.5, 6.2, 1, 6, -3, 5, -7.5, 4.4, -11, 6.8, -13.2, 9, -15.5, 11.5, -17.5, 14.7, -16.5, 19],
  // Eurasia
  [-9, 37, -9.5, 39, -9, 43, -2, 43.5, -1.5, 46, -4.5, 48.3, -1.5, 48.7, 1.5, 50.5, 4, 51.5, 8, 53.5, 8.5, 56.5, 10.5, 57.7, 10.5, 55, 12, 54.3, 14, 54, 19, 54.5, 21, 57, 24, 57.5, 24, 59.4, 29, 60, 22, 60.5, 21.5, 63, 25, 65.2, 21.5, 65.8, 17.5, 62, 18.5, 60, 16.5, 56.5, 13, 55.5, 11, 59, 7, 58, 5, 60.5, 6, 62.5, 12, 66, 16, 69, 22, 70.5, 30, 70.2, 33, 69.3, 41, 67, 35, 66, 40, 64.5, 44, 66.5, 44, 68.5, 54, 68.5, 60, 69.5, 68, 69, 69, 73, 80, 73, 87, 74.5, 100, 77, 107, 77, 113, 74, 128, 73, 140, 72.5, 152, 71, 160, 69.5, 170, 70, 180, 68.5, 180, 65, 177, 62.5, 170, 60, 163, 60, 162, 57.5, 156, 51, 156.5, 57, 152, 59, 143, 59, 137, 54, 141, 53, 140, 48, 135, 43.5, 131, 42.5, 129.7, 41, 128, 39, 129.4, 36, 126.5, 34.7, 126.5, 37.5, 125, 39.5, 121.5, 39, 121, 41, 118, 39, 119, 37, 122.5, 37, 119.5, 35, 121.5, 32, 122, 30, 120, 26, 117, 23.5, 113, 22, 108.5, 21.5, 106.5, 19, 108.5, 15, 109, 11.5, 105, 8.7, 104.5, 10.5, 100.5, 13.5, 100, 9.5, 102, 6, 103.5, 1.4, 101.5, 2.5, 98.5, 8, 98.3, 13, 97.5, 16.5, 94.5, 16, 94, 19, 91.5, 22.5, 88, 21.5, 86.5, 20, 80.5, 15.5, 80, 10, 77.5, 8, 76, 10.5, 73, 17, 72.8, 21, 69, 22.5, 67, 24.5, 62, 25, 57, 25.7, 56.5, 27, 52, 27.5, 50, 30, 48, 30, 50, 26.5, 51.5, 24.5, 54, 24, 56, 26, 56.8, 24.3, 59.5, 22.5, 57, 19, 52.5, 16.5, 45, 13, 43, 13, 42.5, 16.5, 39, 21.5, 36.5, 27, 34.8, 29.5, 34.2, 31.5, 35.5, 34.5, 36, 36.5, 32, 36.2, 28, 36.7, 26.5, 38.5, 26.2, 40.2, 29, 41, 31.5, 41.2, 35, 42, 38.5, 41, 41.5, 41.5, 40, 43.5, 37.5, 44.8, 35, 45.2, 33.5, 44.5, 30.5, 46.5, 29, 45, 28.5, 43.5, 28, 42, 26.5, 40.8, 24, 40.5, 23.5, 38, 22, 36.5, 21, 39, 19.5, 41.8, 16, 43.5, 13.5, 45.5, 12.5, 44.5, 16, 41.5, 18.5, 40.2, 16.5, 38.5, 15.7, 38, 16, 40, 12.5, 41.5, 10.5, 43.5, 8.5, 44.3, 6, 43, 3.2, 43.2, 3, 42, 0.5, 40.5, -0.5, 38.5, -2, 36.8, -5.5, 36],
  // Australia
  [114, -22, 113.5, -26, 115, -34, 118, -35, 123, -34, 129, -31.5, 132, -32, 135.5, -34.8, 138, -35.5, 140, -38, 144, -38.5, 147, -38, 150, -37, 151, -33, 153, -28.5, 153, -25, 149, -21, 146, -18.5, 145.5, -15, 143.5, -14, 142.5, -10.7, 141.5, -13, 141.5, -17, 139, -17.5, 136, -15, 137, -12, 132.5, -11.5, 130, -13, 127, -14, 124, -16.5, 122, -18, 119, -20],
  [-73, 78, -60, 82, -30, 83.5, -20, 81, -18, 76, -22, 70, -30, 68, -40, 65, -43, 60, -48, 61, -52, 65, -54, 69.5, -58, 75],   // Greenland
  [-5.5, 50, 1.5, 51, 1.8, 52.8, -0.5, 54, -1.8, 57.5, -3.5, 58.6, -5.5, 58.5, -6, 56.5, -5, 55, -3, 54.5, -3, 53.3, -4.7, 52.5, -5.2, 51.7, -3.5, 51.2],   // Britain
  [-10, 52, -6, 52.2, -6, 54.5, -8, 55.2, -10, 54],   // Ireland
  [-24, 64.5, -22, 66.3, -15, 66.3, -13.5, 65, -18, 63.4],   // Iceland
  [130.8, 33.8, 133, 35.5, 136, 36.5, 139, 38, 140, 41, 141.5, 41, 142, 39, 141, 36, 139.8, 35, 136.8, 34.5, 135, 33.7, 133, 34],   // Honshu
  [140, 42, 141, 45.4, 145, 43.5, 143, 42], [130, 31.5, 131.8, 33.5, 129.8, 33.6],   // Hokkaido, Kyushu
  [44, -25, 47, -25, 50, -15.5, 49, -12, 47, -15, 44, -17, 43.5, -22],   // Madagascar
  [95.3, 5.5, 98, 4, 103, -1, 106, -5.8, 104, -5.7, 100, -1.5, 96, 3],   // Sumatra
  [105.5, -6.8, 114.5, -7.8, 114, -8.7, 106, -7.5],   // Java
  [109, 1.5, 111, 1.8, 117, 7, 119, 5, 118, 1, 116, -4, 111, -3, 110, -1],   // Borneo
  [119, -1, 121, 1, 125, 1.5, 123, -1, 122, -4, 120, -5.5],   // Sulawesi
  [131, -1, 135, -3.3, 141, -2.6, 147, -6, 150, -10.5, 143, -9, 138, -8, 134, -4],   // New Guinea
  [172.7, -34.5, 178.5, -37.7, 175, -41.5, 173, -39.5], [172.7, -40.5, 174.5, -41.7, 171, -45.5, 167, -46, 168, -44],   // New Zealand
  [-85, 22, -80, 23, -74, 20, -77.5, 19.8, -82, 22], [-74.4, 19.8, -68.4, 18.5, -71, 17.7],   // Cuba, Hispaniola
  [-80, 73, -68, 70.5, -62, 66.5, -66, 62.5, -73, 64.5, -77, 68], [-90, 76, -80, 82, -62, 82.5, -75, 78.5, -85, 74],   // Baffin, Ellesmere
  [52, 71, 56, 75, 68, 77, 58, 72.5], [142, 46, 143.5, 49, 143, 54, 142, 52],   // Novaya Zemlya, Sakhalin
  [120.5, 18.5, 122, 18, 124, 12.5, 126, 7, 125.5, 6, 123, 8.5, 121, 13.5], [79.8, 9.5, 81.8, 7.5, 80.2, 6, 79.8, 8], [120.2, 25, 121.8, 25, 121, 22],   // Philippines, Sri Lanka, Taiwan
  [-56, 51.5, -53, 47, -59, 47.6, -59.5, 50], [-62, 67, -56, 62, -64, 60, -68, 64],
].map(poly);
function pip(lon, lat, P) {
  if (lon < P.x0 || lon > P.x1 || lat < P.y0 || lat > P.y1) return false; let ins = false; const p = P.p;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) ins = !ins; }
  return ins;
}
export function isLand(lon, lat) {
  if (lat < -71 - 3.5 * noise3(lon * 0.05, 0, 3)) return true;
  for (const P of LAND) if (pip(lon, lat, P)) return true;
  return false;
}
const RW = 720, RH = 360; let RASTER = null;
function raster() { if (RASTER) return RASTER; RASTER = new Float32Array(RW * RH); for (let j = 0; j < RH; j++) for (let i = 0; i < RW; i++) RASTER[j * RW + i] = isLand(-180 + (i + 0.5) * 360 / RW, 90 - (j + 0.5) * 180 / RH) ? 1 : 0; return RASTER; }
// anti-aliased land fraction (bilinear on a 0.5 degree raster): smooth coasts at any mesh resolution
export function landFrac(lon, lat) {
  const R = raster(); lon = ((lon + 180) % 360 + 360) % 360; let x = lon / 360 * RW - 0.5, y = (90 - lat) / 180 * RH - 0.5; if (y < 0) y = 0; if (y > RH - 1) y = RH - 1;
  const i0 = Math.floor(x), j0 = Math.floor(y), fx = x - i0, fy = y - j0, i1 = (i0 + 1) % RW, ia = ((i0 % RW) + RW) % RW, j1 = Math.min(RH - 1, j0 + 1);
  return (R[j0 * RW + ia] * (1 - fx) + R[j0 * RW + i1] * fx) * (1 - fy) + (R[j1 * RW + ia] * (1 - fx) + R[j1 * RW + i1] * fx) * fy;
}
const CITIES = [[-74, 40.7, 3], [-118, 34, 2.5], [-87.6, 41.9, 2], [-99, 19.4, 2.4], [-46.6, -23.5, 2.6], [-58.4, -34.6, 2], [-77, -12, 1.4], [-74, 4.7, 1.2], [-0.1, 51.5, 2.6], [2.3, 48.9, 2.2], [13.4, 52.5, 1.6], [-3.7, 40.4, 1.4], [12.5, 41.9, 1.4], [37.6, 55.8, 2.4], [29, 41, 2], [31.2, 30, 2.4], [3.4, 6.5, 2.2], [28, -26, 1.6], [36.8, -1.3, 1], [55.3, 25.2, 1.2], [51.4, 35.7, 1.6], [72.9, 19.1, 2.6], [77.2, 28.6, 3], [88.4, 22.6, 2.2], [90.4, 23.8, 2.2], [100.5, 13.8, 1.8], [106.8, -6.2, 2.6], [103.8, 1.35, 1.2], [121, 14.6, 1.8], [114.2, 22.3, 2.2], [121.5, 31.2, 3], [116.4, 39.9, 2.6], [127, 37.6, 2.2], [139.7, 35.7, 3.4], [135.5, 34.7, 1.8], [151.2, -33.9, 1.4], [145, -37.8, 1.1], [-79.4, 43.7, 1.2], [-122.3, 47.6, 1], [-80.2, 25.8, 1.2], [18.4, -33.9, 0.8], [30.5, 50.4, 1], [67, 24.9, 1.6], [104, 30.6, 1.8], [113, 23.1, 2.4]];

function llToDir(lon, lat, out = V3()) { const a = lon * D2R, b = lat * D2R, c = Math.cos(b); return out.set(Math.sin(a) * c, Math.sin(b), Math.cos(a) * c); }
// tangent-plane puff placement helper
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _p = V3(), _s = V3(), _up = V3(0, 1, 0);
function cloudShell(R, { seed = 5, count = 1500, lod = 'high', hurricane = true } = {}) {
  const r = rng(seed), shell = new THREE.Group(); const off = r() * 50;
  const geo = new THREE.IcosahedronGeometry(1, 1); geo.deleteAttribute('uv');
  const puffs = [];
  const cluster = (lon, lat, k, spread, size) => {
    const ang = r() * TAU + (Math.abs(lat) > 28 ? 0 : 1.2), ca = Math.cos(ang), sa = Math.sin(ang), curve = r.range(-0.5, 0.5);
    for (let i = 0; i < k; i++) { const u = (i / k - 0.5) * spread * 2.2, w = (r() - 0.5) * spread * 0.5 + curve * u * u * 0.15; puffs.push([lon + (u * ca - w * sa) / Math.max(0.4, Math.cos(lat * D2R)), lat + (u * sa + w * ca), size * r.range(0.55, 1.5), r.range(0.9, 1.25), r()]); }
  };
  let tries = 0, made = 0; const target = lod === 'low' ? Math.round(count * 0.4) : count;
  while (made < target && tries++ < target * 40) {
    const lon = r.range(-180, 180), lat = Math.asin(r.range(-0.97, 0.97)) / D2R, al = Math.abs(lat);
    const band = 0.35 + 0.65 * Math.exp(-Math.pow(lat / 9, 2)) + 0.7 * Math.exp(-Math.pow((al - 50) / 13, 2)) - 0.45 * Math.exp(-Math.pow((al - 24) / 8, 2));
    const d = llToDir(lon, lat), n = fbm3(d.x * 3.3 + off, d.y * 3.3, d.z * 3.3, 4, seed);
    if (n * band < 0.36 + r() * 0.1) continue;
    const k = 6 + Math.floor(r() * 8); cluster(lon, lat, k, 3.2, 1); made += k;
  }
  if (hurricane) { const hl = -62, ha = 21, arms = 3, k = lod === 'low' ? 18 : 54; for (let i = 0; i < k; i++) { const t = i / k, a = (i % arms) * TAU / arms + t * 5.5, rad = 1.2 + t * 8.5; puffs.push([hl + Math.cos(a) * rad / Math.cos(ha * D2R), ha + Math.sin(a) * rad, 1.15 - t * 0.35, 1.5, r()]); } }
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, emissive: 0x8aaee0, emissiveIntensity: 0.16 }), puffs.length);
  const pc = new THREE.Color();
  puffs.forEach((q, i) => {
    llToDir(q[0], q[1], _p); const nrm = _p.clone(), h = R * (1.014 + 0.012 * q[4]); const up = Math.abs(nrm.y) > 0.99 ? V3(1, 0, 0) : _up;
    _q.setFromUnitVectors(_up, nrm); const rot = new THREE.Quaternion().setFromAxisAngle(nrm, q[4] * 6.28); _q.premultiply(rot);
    const s = R * 0.03 * q[2]; _s.set(s * 1.15 * q[3], s * 0.62, s * 1.0); _m.compose(nrm.multiplyScalar(h), _q, _s); inst.setMatrixAt(i, _m);
    inst.setColorAt(i, pc.setRGB(0.94 + 0.06 * q[4], 0.96 + 0.04 * q[4], 1.0));
  });
  inst.castShadow = false; inst.receiveShadow = false; shell.add(inst); shell.userData.count = puffs.length; return shell;
}

export function earth({ R = 3, lod = 'high', spin = 0.12, sun = SUN_DIR, seed = 5, tilt = 23.44, clouds = true, lights = true } = {}) {
  const g = new THREE.Group(), axis = new THREE.Group(), body = new THREE.Group(); axis.rotation.z = -tilt * D2R; g.add(axis); axis.add(body);
  const off = new THREE.Vector3(seed * 3.1, seed * 1.7, seed * 0.9);
  const detail = lod === 'low' ? 24 : 64;
  const geo = bodyGeo(R, detail, (d, c) => {
    let [lon, lat] = lonLat(d); const nj = fbm3(d.x * 7 + off.x, d.y * 7, d.z * 7, 3, 2) - 0.5; lon += nj * 2.4; lat += nj * 1.8;
    const bl = lod === 'low' ? 2.0 : 1.25; let f = landFrac(lon, lat); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; f += landFrac(lon + Math.cos(a) * bl, lat + Math.sin(a) * bl) + 0.0; } f /= 9; let f2 = 0; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.4; f2 += landFrac(lon + Math.cos(a) * bl * 2.1, lat + Math.sin(a) * bl * 2.1); } f = f * 0.65 + f2 / 8 * 0.35; const lw = sstep(0.3, 0.7, f), e = 3.2;
    let near = 0; for (let k = 0; k < 10; k++) { const a = k * TAU / 10, rr = k % 2 ? e * 1.6 : e * 0.9; near += landFrac(lon + Math.cos(a) * rr, lat + Math.sin(a) * rr); } near /= 10;
    const n1 = fbm3(d.x * 4 + off.x, d.y * 4 + off.y, d.z * 4 + off.z, 4, 1), n2 = fbm3(d.x * 11, d.y * 11, d.z * 11, 3, 6), al = Math.abs(lat);
    // ocean: deep blue, lighter blue in the shallows around coasts, sea ice at the poles
    const base = mix3(rgb(0x1a46a0), rgb(0x2672cf), sstep(0.3, 0.7, n1)), sea0 = mix3(base, rgb(0x4cc2e0), Math.min(1, near * 2.4)), sea = mix3(sea0, rgb(0xe8f4ff), al > 66 ? sstep(66, 78, al + n2 * 5) : 0);
    // land: biome by latitude and noise, deserts in the subtropics, ice on the poles, mountain ranges as height + colour
    let col = rgb(0x4f9a3c); const dz = n1 + (n2 - 0.5) * 0.5;
    if (al < 14) col = mix3(rgb(0x2a8a3a), rgb(0x1f6f33), sstep(0.4, 0.65, n2)); else if (al < 30) col = dz > 0.52 ? mix3(rgb(0xd9b46c), rgb(0xe8c880), n2) : mix3(rgb(0x6aa840), rgb(0x8ab848), n2); else if (al < 48) col = mix3(rgb(0x5fa044), rgb(0x86b24e), n2); else if (al < 62) col = mix3(rgb(0x2f7040), rgb(0x4a8a48), n2); else col = mix3(rgb(0xa8b898), rgb(0xd8e4d0), sstep(62, 72, al));
    if (lon > 84 && lon < 118 && lat > 36 && lat < 49) col = mix3(col, rgb(0xd8bd80), 0.8 * sstep(0.35, 0.6, n2));   // Gobi
    if (lon > 36 && lon < 58 && lat > 17 && lat < 32) col = mix3(col, rgb(0xe2bd78), 0.9);   // Arabia
    if (lon > 118 && lon < 146 && lat > -30 && lat < -20) col = mix3(col, rgb(0xd0804a), 0.85);   // outback
    if (lon > -76 && lon < -58 && lat > -12 && lat < 3) col = mix3(col, rgb(0x1a6a30), 0.7);   // Amazon
    let h = 0.011 + 0.007 * n1; const mt = (lo, la, rx, ry, k) => { const dx = (lon - lo) / rx, dy = (lat - la) / ry; return k * Math.exp(-(dx * dx + dy * dy)); };
    const mtn = mt(87, 31, 14, 5, 1) + mt(-112, 42, 7, 14, 0.8) + mt(-70, -22, 4, 24, 0.9) + mt(10, 46.5, 7, 2.2, 0.6) + mt(-148, 62, 8, 4, 0.7) + mt(72, 38, 8, 5, 0.8) + mt(40, 8, 5, 5, 0.4) + mt(-4, 32, 6, 2, 0.4);
    h += mtn * 0.016 * (0.7 + 0.5 * n2); col = mix3(col, rgb(0x8a7258), Math.min(0.7, mtn * 1.0)); col = mix3(col, rgb(0xf2f4f8), sstep(0.7, 1.0, mtn + n2 * 0.2 - 0.1));
    if (lw < 0.99) col = mix3(col, rgb(0xd8c88a), 0.5);   // beaches along the shore
    if (al > 74 || lat < -66) col = mix3(col, rgb(0xf4f8ff), sstep(74, 82, al) * 0.95 + (lat < -66 ? 0.85 : 0));
    if (lon < -28 && lon > -60 && lat > 62) col = mix3(col, rgb(0xf4f8ff), 0.9);   // Greenland ice
    const w = mix3(sea, col, lw); c[0] = w[0]; c[1] = w[1]; c[2] = w[2]; return lw * h - 0.0015 * (1 - lw);
  });
  const planet = new THREE.Mesh(geo, vcMat({ rough: 0.62, metal: 0 })); body.add(planet);
  // night-side city lights: point glows that fade out where the sun shines
  let cityPts = null;
  if (lights) {
    const r = rng(seed + 40), P = [], C = [], S = [];
    for (const [lo, la, w] of CITIES) { const k = Math.round(w * (lod === 'low' ? 8 : 16)); for (let i = 0; i < k; i++) { const a = r() * TAU, d = Math.abs(r() + r() - 1) * 1.9 * (0.6 + 0.3 * w), lon = lo + Math.cos(a) * d / Math.cos(la * D2R), lat = la + Math.sin(a) * d; if (!isLand(lon, lat)) continue; const v = llToDir(lon, lat).multiplyScalar(R * 1.004); P.push(v.x, v.y, v.z); const b = r.range(0.55, 1); C.push(1.0 * b, 0.82 * b, 0.45 * b); S.push(R * r.range(0.006, i < 3 ? 0.014 : 0.009)); } }
    for (let i = 0; i < (lod === 'low' ? 120 : 420); i++) { const lat = r.range(-45, 62), lon = r.range(-170, 150); if (!isLand(lon, lat)) continue; const v = llToDir(lon, lat).multiplyScalar(R * 1.004); P.push(v.x, v.y, v.z); const b = r.range(0.3, 0.7); C.push(1 * b, 0.8 * b, 0.45 * b); S.push(R * r.range(0.004, 0.007)); }
    const sunU = { value: V3(...sun).normalize() };
    cityPts = sprites(new Float32Array(P), new Float32Array(C), new Float32Array(S), { atten: true, soft: 2.2, tw: 0.25, max: 24, uniforms: { uSun: sunU }, unis: 'uniform vec3 uSun;', pos: 'vec3 nw = normalize(mat3(modelMatrix) * position); fade = 1.0 - smoothstep(-0.03, 0.14, dot(nw, uSun));', seed: seed + 41 }); body.add(cityPts); cityPts.userData.sunU = sunU;
  }
  const cl = clouds ? cloudShell(R, { seed: seed + 3, lod }) : null; if (cl) axis.add(cl);
  const atmo = atmosphere(R, 0x62b4ff, { thick: 0.12, sun, k: 1.0 }); g.add(atmo);
  setShadows(g, false, false);
  g.setSun = (v) => { atmo.setSun(v); if (cityPts) cityPts.userData.sunU.value.set(...v).normalize(); };
  g.update = g.userData.update = (t) => { body.rotation.y = t * spin; if (cl) cl.rotation.y = t * spin * 1.18 + 0.4; cityPts?.setTime(t); };
  g.userData.planet = planet; g.userData.clouds = cl; g.userData.atmo = atmo; g.userData.body = body;
  meta(g, 'Earth', R, REAL.earth, { axialTiltDeg: tilt, note: 'spin is sped up (default 0.12 rad/s); clouds turn 18% faster than the ground' });
  g.update(0); return g;
}

// ---------- Moon: modelled craters (bowls + raised rims), dark maria, bright young craters ----------
export function moonBody({ R = 1, lod = 'high', seed = 9, spin = 0.03 } = {}) {
  const g = new THREE.Group(), big = craterField(seed, 18, { amin: 0.1, amax: 0.3, depth: 0.5, pow: 1.2 }), mid = craterField(seed + 1, 220, { amin: 0.035, amax: 0.14, depth: 0.55, pow: 1.6 }), small = craterField(seed + 2, lod === 'low' ? 90 : 700, { amin: 0.02, amax: 0.05, depth: 0.5 });
  const young = craterField(seed + 3, 6, { amin: 0.05, amax: 0.1, depth: 0.5 }), off = seed * 1.3;
  const geo = bodyGeo(R, lod === 'low' ? 28 : 76, (d, c) => {
    const mare = sstep(0.48, 0.64, fbm3(d.x * 1.8 + off, d.y * 1.8, d.z * 1.8, 3, 1) + (d.z * 0.12)), cb = big(d), cm = mid(d), cs = small(d), cy = young(d);
    let h = cb * (1 - mare * 0.75) + cm * (1 - mare * 0.7) + cs + (fbm3(d.x * 8, d.y * 8, d.z * 8, 3, 4) - 0.5) * 0.003 - mare * 0.008;
    const hi = mix3(rgb(0xaaa69f), rgb(0x8e8b87), fbm3(d.x * 5, d.y * 5, d.z * 5, 3, 7)), ma = mix3(rgb(0x55535a), rgb(0x66646a), fbm3(d.x * 9, d.y * 9, d.z * 9, 2, 9));
    let col = mix3(hi, ma, mare); const ch = Math.min(1, -(cb + cm + cs) * 9); col = mix3(col, [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7], Math.max(0, Math.min(1, ch)) * 0.8);
    if (cy < -0.002) col = mix3(col, rgb(0xf2efe6), 0.55); c[0] = col[0]; c[1] = col[1]; c[2] = col[2]; return h + cy;
  });
  const m = new THREE.Mesh(geo, vcMat({ rough: 0.95 })); g.add(m); setShadows(g, false, false);
  g.update = g.userData.update = (t) => { m.rotation.y = t * spin; };
  meta(g, 'Moon', R, REAL.moon, { note: 'tidally locked: spin = orbit rate' }); return g;
}

// ---------- Mars ----------
export function mars({ R = 2, lod = 'high', seed = 4, spin = 0.1, moons = true } = {}) {
  const g = new THREE.Group(), axis = new THREE.Group(); axis.rotation.z = -25.2 * D2R; g.add(axis); const body = new THREE.Group(); axis.add(body);
  const cr = craterField(seed, 26, { amin: 0.03, amax: 0.12, depth: 0.45 }), cs = craterField(seed + 1, lod === 'low' ? 30 : 160, { amin: 0.014, amax: 0.04, depth: 0.5 }), olymp = llToDir(-134, 18.5), tharsis = llToDir(-105, 5);
  const geo = bodyGeo(R, lod === 'low' ? 24 : 56, (d, c) => {
    const [lon, lat] = lonLat(d), n1 = fbm3(d.x * 3 + seed, d.y * 3, d.z * 3, 4, 3), n2 = fbm3(d.x * 9, d.y * 9 + seed, d.z * 9, 3, 5), al = Math.abs(lat);
    let h = cr(d) + cs(d) + (n2 - 0.5) * 0.008 + 0.006 * sstep(0.1, 0.9, d.dot(tharsis) * 0.5 + 0.5);
    const ang = Math.acos(Math.min(1, d.dot(olymp))); h += 0.034 * Math.exp(-Math.pow(ang / 0.075, 2)) * (1 - 0.35 * Math.exp(-Math.pow(ang / 0.018, 2)));   // Olympus Mons + caldera
    const vm = Math.exp(-Math.pow((lat + 8 + Math.sin(lon * 0.2) * 1.5) / 2.3, 2)) * sstep(-100, -88, lon) * (1 - sstep(-48, -36, lon)); h -= 0.022 * vm;   // Valles Marineris
    let col = mix3(mix3(rgb(0xc6623a), rgb(0xe08a50), sstep(0.35, 0.7, n1)), rgb(0x8a3f26), sstep(0.5, 0.68, fbm3(d.x * 2.2 + 9, d.y * 2.2, d.z * 2.2, 3, 8)) * 1.0);
    col = mix3(col, rgb(0x5a2a22), vm * 0.9); col = mix3(col, rgb(0xa8502e), Math.min(1, Math.abs(h) * 14) * 0.25);
    const cap = al + (n2 - 0.5) * 7; if (cap > 80) col = mix3(col, rgb(0xf6f4ee), sstep(80, 83, cap)); if (ang < 0.07) col = mix3(col, rgb(0x9a5a40), 0.5);
    c[0] = col[0]; c[1] = col[1]; c[2] = col[2]; return h;
  });
  body.add(new THREE.Mesh(geo, vcMat({ rough: 0.9 })));
  g.add(atmosphere(R, 0xff9a60, { thick: 0.05, k: 0.55, rim: 0.6 }));
  const mn = []; if (moons) { const ph = new THREE.Mesh(rockGeo(3, 2, { stretch: [1.2, 0.9, 1], lump: 0.3, craters: 1 }), vcMat({ flat: true, rough: 0.95 })), de = new THREE.Mesh(rockGeo(4, 1, { stretch: [1, 0.8, 0.9], craters: 0 }), vcMat({ flat: true, rough: 0.95 })); ph.scale.setScalar(R * 0.045); de.scale.setScalar(R * 0.028); g.add(ph, de); mn.push([ph, R * 1.7, 0.55, 0.3], [de, R * 2.5, 0.28, 2.0]); }
  setShadows(g, false, false);
  g.update = g.userData.update = (t) => { body.rotation.y = t * spin; for (const [m, rr, w, a0] of mn) { const a = a0 + t * w; m.position.set(Math.cos(a) * rr, Math.sin(a) * rr * 0.12, Math.sin(a) * rr); m.rotation.y = -a; } };
  meta(g, 'Mars', R, REAL.mars, { moons: { phobos: 11267, deimos: 6200 }, note: 'Phobos/Deimos shown with exaggerated size and speed' }); g.update(0); return g;
}

// ---------- Mercury ----------
export function mercury({ R = 1, lod = 'high', seed = 15, spin = 0.04 } = {}) {
  const g = new THREE.Group(), cr = craterField(seed, 90, { amin: 0.02, amax: 0.14, depth: 0.55, pow: 1.8 }), cs = craterField(seed + 1, lod === 'low' ? 60 : 220, { amin: 0.012, amax: 0.04, depth: 0.5 }), cal = llToDir(160, 30);
  const geo = bodyGeo(R, lod === 'low' ? 26 : 56, (d, c) => {
    const n = fbm3(d.x * 5 + seed, d.y * 5, d.z * 5, 4, 2), ang = Math.acos(Math.min(1, d.dot(cal))); let h = cr(d) + cs(d) + (n - 0.5) * 0.008;
    h -= 0.03 * Math.exp(-Math.pow(ang / 0.22, 2)) * (ang < 0.24 ? 1 : 0); h += 0.012 * Math.exp(-Math.pow((ang - 0.25) / 0.03, 2));   // Caloris basin
    let col = mix3(rgb(0x8f8478), rgb(0xb2a698), sstep(0.35, 0.7, n)); if (ang < 0.23) col = mix3(col, rgb(0xd4b890), 0.55);
    const ch = Math.min(1, Math.max(0, -(cr(d) + cs(d)) * 9)); col = mix3(col, [col[0] * 0.75, col[1] * 0.72, col[2] * 0.7], ch * 0.7); c[0] = col[0]; c[1] = col[1]; c[2] = col[2]; return h;
  });
  const m = new THREE.Mesh(geo, vcMat({ rough: 0.95 })); g.add(m); setShadows(g, false, false);
  g.update = g.userData.update = (t) => { m.rotation.y = t * spin; };
  return meta(g, 'Mercury', R, REAL.mercury, { note: 'Caloris basin modelled' });
}

// ---------- Venus: one thick swirling cloud deck (ridged swirl geometry + banded colour) that super-rotates, sulphur haze ----------
export function venus({ R = 1.6, lod = 'high', seed = 21, spin = 0.03 } = {}) {
  const g = new THREE.Group(), axis = new THREE.Group(); axis.rotation.z = -3 * D2R; g.add(axis);
  const geo = bodyGeo(R, lod === 'low' ? 26 : 60, (d, c) => {
    const [lon, lat] = lonLat(d), al = Math.abs(lat), warp = fbm3(d.x * 2.6 + seed, d.y * 2.6, d.z * 2.6, 3, 2) * 6;
    const sw = Math.sin(lon * D2R * 2 + al * 0.14 + warp) * 0.5 + 0.5, bands = Math.sin(lat * D2R * 7 + warp * 0.6) * 0.5 + 0.5, n = fbm3(d.x * 7 + seed, d.y * 16, d.z * 7, 4, 3);
    let col = mix3(mix3(rgb(0xd9a85a), rgb(0xf6dc9c), sw), rgb(0xf8ecc4), bands * 0.5); col = mix3(col, rgb(0xb67c40), sstep(0.55, 0.8, n) * 0.55);
    const vortex = sstep(80, 88, al); col = mix3(col, rgb(0x9a6a38), vortex * 0.6);
    c[0] = col[0]; c[1] = col[1]; c[2] = col[2]; return (sw * 0.012 + bands * 0.008 + (n - 0.5) * 0.012);
  });
  const body = new THREE.Mesh(geo, vcMat({ rough: 0.7 })); axis.add(body);
  g.add(atmosphere(R, 0xffc860, { thick: 0.11, k: 1.0 })); setShadows(g, false, false);
  g.update = g.userData.update = (t) => { body.rotation.y = -t * spin * 5; };   // retrograde and fast (cloud-top super-rotation)
  return meta(g, 'Venus', R, REAL.venus, { note: 'retrograde: the cloud deck circles in about 4 days (sped up here)' });
}

// ---------- Pluto with its heart (Tombaugh Regio) and Charon ----------
export function pluto({ R = 0.9, lod = 'high', seed = 31, spin = 0.05, charon = true } = {}) {
  const g = new THREE.Group(), cr = craterField(seed, 18, { amin: 0.02, amax: 0.08, depth: 0.4 }); const heartC = llToDir(180 - 190 + 190, 20);
  const heart = (lon, lat) => { const x = (((lon - 175 + 540) % 360) - 180) / 26, y = (lat - 10) / 24 + 0.15; const v = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y; return 1 - sstep(-0.06, 0.18, v); };   // classic heart curve
  const geo = bodyGeo(R, lod === 'low' ? 22 : 48, (d, c) => {
    const [lon, lat] = lonLat(d), n = fbm3(d.x * 5 + seed, d.y * 5, d.z * 5, 4, 1); const hh = heart(lon, lat); let h = cr(d) + (n - 0.5) * 0.01 - hh * 0.012;
    let col = mix3(rgb(0xa8785a), rgb(0xc89a78), sstep(0.35, 0.7, n)); if (lat < -25 && lat > -48 && Math.abs(lon - 80) < 70) col = mix3(col, rgb(0x5a3a30), 0.8);   // dark "whale"
    col = mix3(col, rgb(0xf6ead2), hh * 0.95); if (lat > 70) col = mix3(col, rgb(0xe8d8c8), 0.5); c[0] = col[0]; c[1] = col[1]; c[2] = col[2]; return h;
  });
  const body = new THREE.Mesh(geo, vcMat({ rough: 0.85 })); g.add(body);
  let ch = null; if (charon) { ch = new THREE.Mesh(bodyGeo(R * 0.5, 22, (d, c) => { const n = fbm3(d.x * 5, d.y * 5, d.z * 5, 3, 8); const col = mix3(rgb(0x6a6a70), rgb(0x8a888c), n); if (d.y > 0.82) { c[0] = 0.62; c[1] = 0.28; c[2] = 0.2; } else { c[0] = col[0]; c[1] = col[1]; c[2] = col[2]; } return (n - 0.5) * 0.02; }), vcMat({ rough: 0.9 })); g.add(ch); }
  g.add(atmosphere(R, 0x8ab8ff, { thick: 0.07, k: 0.4, rim: 0.4 })); setShadows(g, false, false);
  g.update = g.userData.update = (t) => { body.rotation.y = -3.05 + t * spin; if (ch) { const a = t * 0.3; ch.position.set(Math.cos(a) * R * 2.9, 0.02, Math.sin(a) * R * 2.9); ch.rotation.y = -a; } };
  return meta(g, 'Pluto', R, REAL.pluto, { moons: { charon: 6.06e5 }, note: 'Charon (radius 606 km) shown close in, true spacing is 19,600 km' });
}

// ---------- Ceres: dwarf planet with bright Occator spots ----------
export function ceres({ R = 0.7, seed = 41, spin = 0.08 } = {}) {
  const g = new THREE.Group(), cr = craterField(seed, 60, { amin: 0.02, amax: 0.1, depth: 0.45 }), oc = llToDir(239 - 360, 20);
  const geo = bodyGeo(R, 36, (d, c) => { const n = fbm3(d.x * 5 + seed, d.y * 5, d.z * 5, 3, 1), a = Math.acos(Math.min(1, d.dot(oc))); const h = cr(d) + (n - 0.5) * 0.01; let col = mix3(rgb(0x6a6660), rgb(0x8a8680), n); const ch = Math.max(0, Math.min(1, -cr(d) * 5)); col = mix3(col, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8], ch); if (a < 0.05) col = mix3(col, rgb(0xfaf6ee), 0.95); c[0] = col[0]; c[1] = col[1]; c[2] = col[2]; return h; });
  const m = new THREE.Mesh(geo, vcMat({ rough: 0.95 })); g.add(m); setShadows(g, false, false); g.update = g.userData.update = (t) => { m.rotation.y = t * spin; };
  return meta(g, 'Ceres', R, REAL.ceres, { note: 'largest object in the asteroid belt' });
}
