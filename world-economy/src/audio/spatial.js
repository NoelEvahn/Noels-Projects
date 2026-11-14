// Spatialisation helpers (Annex E 4.1, 4.3). Pure math (Node-testable) plus PannerNode setup.
export const SPEED_OF_SOUND = 343;
/** WebAudio 'inverse' distance model gain */
export function distanceGain(d, ref, max, rolloff = 1) { const dd = Math.min(Math.max(d, ref), max); return ref / (ref + rolloff * (dd - ref)); }
/** Doppler detune in cents: 1200 log2((c + vListener) / (c - vSource)), clamped to +-300. Velocities are components toward the other party. */
export function dopplerCents(vListenerToward, vSourceToward) {
  const c = SPEED_OF_SOUND;
  const ratio = (c + vListenerToward) / Math.max(1, c - vSourceToward);
  return Math.max(-300, Math.min(300, 1200 * Math.log2(ratio)));
}
/** occlusion: listener inside / source outside (or reverse) -> -9 dB and 900 Hz lowpass */
export function occlusion(listenerInterior, sourceInterior) { return (listenerInterior || null) !== (sourceInterior || null) ? { gainDb: -9, lowpass: 900 } : { gainDb: 0, lowpass: 20000 }; }
export function createPanner(ctx, rec, pos, hrtf) {
  const p = ctx.createPanner();
  p.panningModel = hrtf ? 'HRTF' : 'equalpower';
  p.distanceModel = 'inverse'; p.refDistance = rec.refDistance || 1; p.maxDistance = rec.maxDistance || 100; p.rolloffFactor = 1;
  if (pos) setPos(p, pos);
  return p;
}
export function setPos(p, pos, at) {
  if (p.positionX) { const t = at || p.context.currentTime; p.positionX.setValueAtTime(pos[0], t); p.positionY.setValueAtTime(pos[1], t); p.positionZ.setValueAtTime(pos[2], t); }
  else p.setPosition(pos[0], pos[1], pos[2]);
}
