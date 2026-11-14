// Object pool helper. Pure.
export function createPool(factory, reset) {
  const free = [];
  return {
    get() { return free.length ? free.pop() : factory(); },
    release(o) { if (reset) reset(o); free.push(o); },
    get size() { return free.length; },
  };
}
