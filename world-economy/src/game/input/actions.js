// Input (MASTER_SPEC 5.7). The only game/ module that touches the DOM. Keyboard + pointer with pointer-lock and drag-look fallback.
const DEFAULT_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA'], right: ['KeyD'], sprint: ['ShiftLeft', 'ShiftRight'], walk: ['ControlLeft', 'ControlRight'],
  jump: ['Space'], interact: ['KeyE', 'KeyF'], camera: ['KeyV'], phone: ['Tab', 'KeyP'], map: ['KeyM'], inventory: ['KeyI'], pause: ['Escape'],
  handbrake: ['Space'], horn: ['KeyH'], lights: ['KeyL'], reset: ['KeyR'], turnLeft: ['ArrowLeft', 'KeyQ'], turnRight: ['ArrowRight'], perfHud: ['F3'], debugHud: ['F4'], cleanHud: ['F2'], teleport: ['KeyT'],
};

export const Input = (() => {
  const state = { down: new Set(), pressed: new Set(), released: new Set(), context: 'foot', dom: null, bus: null, ready: false };
  const bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
  const codeToActions = new Map();
  const injected = new Set(); // programmatic holds (QA bots)
  const axisOverride = {};
  const pointer = { x: 0, y: 0, dx: 0, dy: 0, locked: false, mode: 'drag', lookX: 0, lookY: 0, dragging: false, buttons: 0 };
  function rebuild() {
    codeToActions.clear();
    for (const [action, codes] of Object.entries(bindings)) for (const c of codes) { let a = codeToActions.get(c); if (!a) { a = []; codeToActions.set(c, a); } a.push(action); }
  }
  rebuild();
  const typing = (e) => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };
  function setDown(action, on) {
    if (on) { if (!state.down.has(action)) { state.down.add(action); state.pressed.add(action); } }
    else if (state.down.has(action)) { state.down.delete(action); state.released.add(action); }
  }
  const held = new Map(); // code -> true
  function onKey(e, on) {
    if (typing(e)) return;
    const acts = codeToActions.get(e.code);
    if (!acts) return;
    if (e.code === 'Tab' || e.code.startsWith('F') || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (on) held.set(e.code, true); else held.delete(e.code);
    for (const a of acts) { if (on) setDown(a, true); else { // only release when no other bound code is still held
      const still = bindings[a].some((c) => held.get(c));
      if (!still) setDown(a, false); } }
  }
  const api = {
    bindings,
    pointer,
    init(domElement, bus) {
      state.dom = domElement; state.bus = bus || null;
      if (state.ready) return;
      state.ready = true;
      window.addEventListener('keydown', (e) => onKey(e, true));
      window.addEventListener('keyup', (e) => onKey(e, false));
      window.addEventListener('blur', () => { for (const a of Array.from(state.down)) setDown(a, false); held.clear(); pointer.dragging = false; });
      document.addEventListener('pointerlockchange', () => {
        pointer.locked = document.pointerLockElement === state.dom;
        pointer.mode = pointer.locked ? 'locked' : 'drag';
        if (state.bus) state.bus.emit('input:pointerLock', { locked: pointer.locked, mode: pointer.mode });
      });
      document.addEventListener('pointerlockerror', () => { pointer.locked = false; pointer.mode = 'drag'; if (state.bus) state.bus.emit('input:pointerLock', { locked: false, mode: 'drag' }); });
      domElement.addEventListener('contextmenu', (e) => e.preventDefault());
      domElement.addEventListener('mousedown', (e) => { pointer.buttons = e.buttons; if (e.button === 0 || e.button === 2) pointer.dragging = true; });
      window.addEventListener('mouseup', (e) => { pointer.buttons = e.buttons; if (!e.buttons) pointer.dragging = false; });
      window.addEventListener('mousemove', (e) => {
        pointer.x = e.clientX; pointer.y = e.clientY;
        if (pointer.locked || pointer.dragging) { pointer.lookX += e.movementX; pointer.lookY += e.movementY; }
        pointer.dx = e.movementX; pointer.dy = e.movementY;
      });
    },
    setContext(ctx) { if (state.context !== ctx) { state.context = ctx; if (state.bus) state.bus.emit('input:context', { context: ctx }); } },
    get context() { return state.context; },
    /** end-of-frame: clear edge sets and look deltas. Call once per rendered frame after Game.update. */
    endFrame() { state.pressed.clear(); state.released.clear(); pointer.lookX = 0; pointer.lookY = 0; pointer.dx = 0; pointer.dy = 0; },
    poll() { /* edges are accumulated by event handlers; kept for API symmetry with gamepad in Stage 6 */ },
    down(a) { return state.down.has(a) || injected.has(a); },
    pressed(a) { return state.pressed.has(a); },
    released(a) { return state.released.has(a); },
    axis(name) {
      if (axisOverride[name] !== undefined) return axisOverride[name];
      const d = (a) => (api.down(a) ? 1 : 0);
      switch (name) {
        case 'moveX': case 'steer': return d('right') - d('left');
        case 'moveY': case 'throttle': return d('forward') - d('back');
        case 'lookX': return pointer.lookX + (d('turnRight') - d('turnLeft')) * 14;
        case 'lookY': return pointer.lookY;
        default: return 0;
      }
    },
    /** programmatic input for QA bots and tests */
    inject(action, on = true) { if (on) injected.add(action); else injected.delete(action); if (on) state.pressed.add(action); },
    setAxis(name, v) { if (v === undefined) delete axisOverride[name]; else axisOverride[name] = v; },
    rebind(action, code) { if (!bindings[action]) bindings[action] = []; bindings[action] = [code]; rebuild(); },
    requestPointerLock() {
      return new Promise((resolve) => {
        const el = state.dom;
        if (!el || !el.requestPointerLock) { pointer.mode = 'drag'; resolve({ locked: false }); return; }
        const done = () => { cleanup(); resolve({ locked: pointer.locked }); };
        const cleanup = () => { document.removeEventListener('pointerlockchange', done); document.removeEventListener('pointerlockerror', done); };
        document.addEventListener('pointerlockchange', done); document.addEventListener('pointerlockerror', done);
        try { const r = el.requestPointerLock(); if (r && r.catch) r.catch(() => { done(); }); } catch (e) { done(); }
        setTimeout(done, 800);
      });
    },
    exitPointerLock() { if (typeof document !== 'undefined' && document.exitPointerLock) document.exitPointerLock(); },
  };
  return api;
})();
