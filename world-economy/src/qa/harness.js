// QA harness (MASTER_SPEC 5.12): window.__LOE. Installed first so console errors and rejections are collected from the very start.
export function installHarness() {
  const errors = [];
  let resolveReady, rejectReady;
  const ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
  const H = { version: '0.2.0-stage2', errors, ready, _resolve: resolveReady, _reject: rejectReady };
  window.addEventListener('error', (e) => { errors.push({ type: 'error', message: String(e.message), source: e.filename, line: e.lineno }); });
  window.addEventListener('unhandledrejection', (e) => { errors.push({ type: 'unhandledrejection', message: String(e.reason && e.reason.message || e.reason) }); });
  const ce = console.error.bind(console);
  console.error = (...a) => { errors.push({ type: 'console.error', message: a.map(String).join(' ') }); ce(...a); };
  ready.catch(() => {}); // a rejected boot is reported through errors[]; never as an unhandled rejection
  window.__LOE = H;
  return H;
}
