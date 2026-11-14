// Game clock (MASTER_SPEC 4.3). 1 real second = 1 game minute at scale 1. Pure.
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export function createClock(bus, { total = 480, scale = 1 } = {}) {
  const state = { total, scale, frac: 0 };
  function gameTime() {
    const t = Math.floor(state.total);
    return { day: Math.floor(t / 1440) + 1, minute: t % 1440, total: t };
  }
  function advance(dtRealSeconds) {
    if (state.scale <= 0) return;
    state.frac += dtRealSeconds * state.scale;
    while (state.frac >= 1) {
      state.frac -= 1;
      state.total += 1;
      const gt = gameTime();
      bus.emit('time:minute', gt);
      if (gt.minute % 60 === 0) bus.emit('time:hour', { day: gt.day, hour: gt.minute / 60 });
      if (gt.minute === 0) {
        bus.emit('time:day', { day: gt.day, weekday: WEEKDAYS[(gt.day - 1) % 7] });
        if ((gt.day - 1) % 7 === 0) bus.emit('time:week', { week: Math.floor((gt.day - 1) / 7) + 1 });
      }
    }
  }
  return {
    advance, gameTime,
    get hourFloat() { return (state.total % 1440) / 60 + state.frac / 60; },
    setHour(h) { state.total = Math.floor(state.total / 1440) * 1440 + Math.round(h * 60); },
    setScale(s) { state.scale = s; bus.emit('time:scale', { scale: s }); },
    get scale() { return state.scale; },
    state,
  };
}
