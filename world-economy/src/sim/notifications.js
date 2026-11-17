// Notifications (note:new). Ring of 100.
import { ok, fail, ERR } from './util.js';
export function createNotes(ctx) {
  const S = () => ctx.state.notes;
  function add(kind, title, body = '') {
    const n = { id: ctx.state.flags.nextNote = (ctx.state.flags.nextNote || 0) + 1, kind, title, body, t: ctx.now(), read: false };
    S().push(n); if (S().length > 100) S().shift();
    ctx.emit('note:new', { id: n.id, kind, title, body, t: n.t });
    return n;
  }
  const cmds = {
    'note.read': ({ id }) => { const n = S().find((x) => x.id === id); if (!n) return fail(ERR.NOT_FOUND); n.read = true; return ok(); },
    'note.clear': ({ id } = {}) => { if (id === undefined) ctx.state.notes.length = 0; else { const i = S().findIndex((x) => x.id === id); if (i < 0) return fail(ERR.NOT_FOUND); S().splice(i, 1); } return ok(); },
  };
  return { add, cmds, selects: { 'notes.list': () => S().slice().reverse() } };
}
