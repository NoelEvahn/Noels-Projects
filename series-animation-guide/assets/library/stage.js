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
  return r;
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
  let ground = null;
  if (o.ground !== null && o.ground !== undefined) {
    ground = new THREE.Mesh(new THREE.CircleGeometry(o.groundR ?? 40, 64), new THREE.MeshStandardMaterial({ color: o.ground, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    scene.add(ground);
  }
  return { scene, hemi, key, fill, ground };
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
