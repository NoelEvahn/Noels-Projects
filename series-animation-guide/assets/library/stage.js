// Renderer + light rig + gradient backdrop. Same look in every episode:
// hemisphere + warm key (soft PCF shadows) + cool fill + ACES tone mapping + sRGB.
import * as THREE from 'three';

export function makeRenderer(canvas, w, h) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  _renderer = r;
  return r;
}
let _renderer = null;

// Soft image-based light from the stage's own sky colours (no files): gives plastic/fabric a gentle sheen and colour bounce,
// the biggest single step away from the flat "default material" look. Built once per stage from a tiny gradient room.
function envFrom(top, bottom, groundHex) {
  if (!_renderer) return null;
  const room = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, top); grd.addColorStop(0.48, bottom); grd.addColorStop(0.52, '#' + new THREE.Color(groundHex).getHexString()); grd.addColorStop(1, '#202020');
  g.fillStyle = grd; g.fillRect(0, 0, 4, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  room.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
  // two soft "softbox" panels: key (warm, upper front-right) and rim (cool, behind)
  const panel = (col, pos, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0, 0); room.add(m); };
  panel(0xfff1dc, [5, 6, 6], 3.2); panel(0xcfe2ff, [-4, 4, -7], 2.2);
  const pm = new THREE.PMREMGenerator(_renderer);
  const rt = pm.fromScene(room, 0.04); pm.dispose(); geo.dispose(); tex.dispose();
  return rt.texture;
}

export function gradientTexture(top = '#9ed8ff', bottom = '#fff3d6', mid = null) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top);
  if (mid) grd.addColorStop(0.5, mid);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// opts: {sky:[top,bottom,mid?], fog:[color, near, far], key:0xfff0d0, keyI, hemiI, ground:0xcfd8a8|null, groundR, shadow:{size,extent}, keyPos}
export function makeStage(o = {}) {
  const scene = new THREE.Scene();
  const sky = o.sky ?? ['#9ed8ff', '#fff3d6'];
  scene.background = gradientTexture(sky[0], sky[1], sky[2]);
  if (o.fog) scene.fog = new THREE.Fog(o.fog[0], o.fog[1], o.fog[2]);
  const hemi = new THREE.HemisphereLight(o.hemiSky ?? 0xdfeeff, o.hemiGround ?? 0xb8a37a, o.hemiI ?? 1.05);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(o.key ?? 0xfff0d6, o.keyI ?? 2.3);
  const kp = o.keyPos ?? [4, 8, 6];
  key.position.set(...kp);
  key.castShadow = true;
  const ext = o.shadow?.extent ?? 7;
  key.shadow.mapSize.set(o.shadow?.size ?? 2048, o.shadow?.size ?? 2048);
  Object.assign(key.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 0.5, far: 40 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight(o.fillC ?? 0xbcd6ff, o.fillI ?? 0.7);
  fill.position.set(-kp[0], 3, kp[2] * 0.8);
  scene.add(fill);
  // rim light from behind: a bright edge on heads and shoulders separates characters from busy sets
  const rim = new THREE.DirectionalLight(o.rimC ?? 0xdfeaff, o.rimI ?? 0.8);
  rim.position.set(-kp[0] * 0.6, kp[1] * 0.9, -Math.abs(kp[2]) * 1.4);
  scene.add(rim);
  // image-based light (o.env = 0 turns it off): soft reflections and colour bounce on every standard material
  // bright sets (white lab, cloud sky) already have lots of fill: scale the soft light down by the sky's brightness so they never wash out
  const lum = (new THREE.Color(sky[0]).getHSL({}).l + new THREE.Color(sky[1]).getHSL({}).l) / 2;
  const envK = o.env ?? 0.4 * Math.max(0.15, 1 - 1.1 * Math.max(0, lum - 0.35));
  const env = envK > 0 ? envFrom(sky[0], sky[1], o.ground ?? 0x8a7a60) : null;
  if (env) { scene.environment = env; scene.environmentIntensity = envK; }
  let ground = null;
  if (o.ground !== null && o.ground !== undefined) {
    ground = new THREE.Mesh(new THREE.CircleGeometry(o.groundR ?? 40, 64), new THREE.MeshStandardMaterial({ color: o.ground, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    scene.add(ground);
  }
  return { scene, hemi, key, fill, rim, ground };
}

// Move the shadow-casting key light so it follows a focus point (keeps shadow map tight).
export function aimKey(stage, target, dist = 8) {
  const d = new THREE.Vector3(...(stage.keyDir ?? [0.45, 0.8, 0.6])).normalize();
  stage.key.target.position.copy(target);
  stage.key.position.copy(target).addScaledVector(d, dist);
}

export function makeCamera(w, h, fov = 40) {
  return new THREE.PerspectiveCamera(fov, w / h, 0.05, 2000);
}

export function lookFrom(cam, pos, target, fov, roll = 0) {
  cam.position.set(...pos);
  cam.lookAt(new THREE.Vector3(...target));
  if (roll) cam.rotateZ(roll);
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
}
