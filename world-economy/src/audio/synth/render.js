// renderToBuffer (Annex E 3): renders a one-shot patch once in an OfflineAudioContext (mono) and caches the samples; a
// time-sliced queue renders at most one pending one-shot per update. Byte accounting for the 24 MB cap.
export function createRenderCache({ sampleRate = 44100, maxBytes = 24 * 1048576 } = {}) {
  const data = new Map(); const pending = new Map(); const queue = [];
  let bytes = 0;
  const C = {
    get bytes() { return bytes; }, get size() { return data.size; }, maxBytes,
    has(key) { return data.has(key); },
    get(key) { return data.get(key) || null; },
    /** fn(ctx, out, t) -> end time. Resolves Float32Array (mono). */
    render(key, fn, seconds) {
      if (data.has(key)) return Promise.resolve(data.get(key));
      if (pending.has(key)) return pending.get(key);
      const n = Math.max(1, Math.round(seconds * sampleRate));
      if (typeof OfflineAudioContext === 'undefined' || bytes + n * 4 > maxBytes) return Promise.resolve(null);
      const off = new OfflineAudioContext(1, n, sampleRate);
      fn(off, off.destination, 0);
      const p = off.startRendering().then((buf) => { const ch = buf.getChannelData(0); let end = ch.length; while (end > 1 && Math.abs(ch[end - 1]) < 1e-4) end--; const a = ch.slice(0, Math.min(ch.length, end + 64)); data.set(key, a); bytes += a.byteLength; pending.delete(key); return a; });
      pending.set(key, p);
      return p;
    },
    enqueue(key, fn, seconds) { if (!data.has(key) && !pending.has(key) && !queue.some((q) => q[0] === key)) queue.push([key, fn, seconds]); },
    /** time-sliced: start at most one offline render per call */
    pump() { const q = queue.shift(); if (q) return C.render(q[0], q[1], q[2]); return null; },
    get queued() { return queue.length; },
  };
  return C;
}
