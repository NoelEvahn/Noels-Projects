// Audio stub (Stage 3 owns). No-op API with the exact signatures of MASTER_SPEC 5.8 so callers can be written now.
const dummyLoop = { set() {}, stop() {} };
export const Audio = {
  init() { return Promise.resolve(); },
  play() { return null; },
  loop() { return dummyLoop; },
  setListener() {}, setEnvironment() {},
  music: { setContext() {} },
  setBusGain() {}, setVoiceLimit() {},
  renderOffline() { return Promise.resolve([]); },
};
