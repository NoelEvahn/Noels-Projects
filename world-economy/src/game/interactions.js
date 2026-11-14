// Interaction focus (Annex F interact prompts, Stage 2 minimal): nearest interactable in reach of the player. Pure.
import { World } from '../world/query.js';

export function createInteractions(bus) {
  let focus = null;
  return {
    get focus() { return focus; },
    update(x, y, z, facingYaw) {
      const list = World.interactablesNear(x, y, z, 4);
      let best = null, bd = Infinity;
      for (const i of list) {
        const r = i.radius || 2;
        const d = Math.hypot(i.pos[0] - x, i.pos[2] - z) - r * 0.5;
        if (Math.hypot(i.pos[0] - x, i.pos[2] - z) > r + 0.6) continue;
        // prefer vehicles/doors in front of the player
        const dx = i.pos[0] - x, dz = i.pos[2] - z;
        const front = Math.sin(facingYaw) * dx - Math.cos(facingYaw) * dz;
        const score = d - (front > 0 ? 0.5 : 0);
        if (score < bd) { bd = score; best = i; }
      }
      if (best !== focus) { focus = best; bus.emit('interact:focus', { interactable: best }); }
      return focus;
    },
  };
}
