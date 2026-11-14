// EventBus (MASTER_SPEC 5.2). Pure, no imports.
export function createBus(onError) {
  const handlers = new Map();
  const deferred = [];
  const report = onError || ((type, e) => { if (typeof console !== 'undefined') console.error('[bus] handler for', type, 'threw', e); });
  function on(type, fn) {
    let set = handlers.get(type);
    if (!set) { set = new Set(); handlers.set(type, set); }
    set.add(fn);
    return () => { set.delete(fn); };
  }
  function once(type, fn) {
    const off = on(type, (p) => { off(); fn(p); });
    return off;
  }
  function emit(type, payload) {
    const set = handlers.get(type);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(payload); } catch (e) { report(type, e); }
    }
  }
  function defer(type, payload) { deferred.push([type, payload]); }
  function flush() {
    const n = deferred.length;
    for (let i = 0; i < n; i++) { const d = deferred[i]; emit(d[0], d[1]); }
    deferred.splice(0, n);
  }
  return { on, once, emit, defer, flush };
}
