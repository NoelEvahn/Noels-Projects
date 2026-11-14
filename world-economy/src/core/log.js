// Tiny logger. Pure.
const buf = [];
export const log = {
  buffer: buf,
  info(...a) { push('info', a); },
  warn(...a) { push('warn', a); if (typeof console !== 'undefined') console.warn(...a); },
  error(...a) { push('error', a); if (typeof console !== 'undefined') console.error(...a); },
};
function push(level, a) { buf.push({ level, msg: a.map(String).join(' ') }); if (buf.length > 200) buf.shift(); }
