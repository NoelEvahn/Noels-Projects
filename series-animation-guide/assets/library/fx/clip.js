// Video clip on a camera-facing card (keyed meme clips like clips/clap_cat.webm). Deterministic: one PNG frame per video frame.
// Frames come from tools/clip_frames.py (dir with f000.png... + count.json). Unlit (MeshBasic), so it keeps the video's own colours.
//   const cat = await clipCard(new URL('../build/clip/', import.meta.url), { height: 1.65, feet: 0.184 }); scene.add(cat.group);
//   per frame: cat.show(t - T0, camera.position)   (hides itself outside 0..duration)
import * as THREE from 'three';
export async function clipCard(dir, { height = 1.6, feet = 0, fps = 30 } = {}) {
  const u = (f) => new URL(f, dir);
  const n = (await (await fetch(u('count.json'))).json()).n;
  const frames = await Promise.all(Array.from({ length: n }, async (_, i) => createImageBitmap(await (await fetch(u(`f${String(i).padStart(3, '0')}.png`))).blob(), { imageOrientation: 'flipY', premultiplyAlpha: 'none' })));
  const tex = new THREE.Texture(frames[0]); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.needsUpdate = true;
  const w = height * frames[0].width / frames[0].height;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(w, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.08, toneMapped: false, side: THREE.DoubleSide }));
  card.position.y = height / 2 - feet * height;   // feet = how far the subject's feet sit above the clip's bottom edge (fraction of height)
  const group = new THREE.Group(); group.add(card); let cur = -1;
  const show = (age, camPos) => {
    group.visible = age >= 0 && age < n / fps; if (!group.visible) return;
    const i = Math.min(n - 1, Math.floor(age * fps + 1e-6)); if (i !== cur) { tex.image = frames[i]; tex.needsUpdate = true; cur = i; }
    if (camPos) { const p = new THREE.Vector3(); group.getWorldPosition(p); group.rotation.y = Math.atan2(camPos.x - p.x, camPos.z - p.z); }
  };
  return { group, show, duration: n / fps, frames: n };
}
