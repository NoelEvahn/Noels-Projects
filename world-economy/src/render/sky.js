// Sky, sun, hemisphere light and fog (Annex A 4.1-4.2, minimal). Uses three's Sky addon as the dome.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export function createSky(scene) {
  const sky = new Sky();
  sky.scale.setScalar(8000);
  sky.name = 'sky';
  const u = sky.material.uniforms;
  u.turbidity.value = 6; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.006; u.mieDirectionalG.value = 0.82;
  scene.add(sky);
  const sun = new THREE.DirectionalLight(0xfff0d6, 3.2);
  sun.castShadow = false; sun.name = 'sun';
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xcfe0f2, 0x8f8873, 1.4);
  scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xcfc6b4, 0.0004);
  scene.background = new THREE.Color(0xcfd8e0);
  const sv = new THREE.Vector3();
  const fogDay = new THREE.Color(0xcfc6b4), fogNight = new THREE.Color(0x10151f), fogDusk = new THREE.Color(0xd8a878), tmp = new THREE.Color();
  return {
    sky, sun, hemi,
    /** sunDir: direction toward the sun (+X east, +Z south); anchor: camera position */
    update(sunDir, anchor) {
      sv.set(sunDir[0], sunDir[1], sunDir[2]);
      u.sunPosition.value.copy(sv);
      const elev = sunDir[1];
      const day = Math.max(0, Math.min(1, (elev + 0.05) / 0.35));
      sun.position.set(anchor.x + sunDir[0] * 500, anchor.y + sunDir[1] * 500, anchor.z + sunDir[2] * 500);
      sun.target.position.set(anchor.x, anchor.y, anchor.z);
      sun.intensity = 0.05 + 2.6 * day;
      sun.color.setRGB(1.0, 0.78 + 0.2 * day, 0.55 + 0.4 * day);
      hemi.intensity = 0.14 + 1.45 * day;
      sky.position.set(anchor.x, 0, anchor.z);
      tmp.copy(fogNight).lerp(fogDay, day);
      if (elev > -0.05 && elev < 0.25) tmp.lerp(fogDusk, 0.45 * (1 - Math.abs(elev - 0.1) / 0.15));
      scene.fog.color.copy(tmp);
      scene.background.copy(tmp);
      u.rayleigh.value = 0.6 + 1.6 * day;
    },
  };
}
