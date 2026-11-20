// Prints the counter table (exact BigInt maths vs the brief's display strings), the checkpoints and the speech timeline overlaps.
import * as TL from '../src/timeline.js';
let bad = 0;
for (let n = 0; n <= 30; n++) { const h = 5n ** BigInt(n), s = TL.shownBig(h), str = s.value + ' ' + s.unit; const ok = str === TL.SHOWN[n]; if (!ok) bad++; console.log(String(n).padStart(2), String(2 * n).padStart(3) + 's', TL.fmt(h).padStart(34), str.padEnd(22), ok ? 'ok' : 'BRIEF: ' + TL.SHOWN[n], '|', TL.TAGS[n]); }
console.log('mismatches', bad);
for (const t of [0, 10, 20, 30, 40, 50, 60, 61.9, 62, 65, 68.4, 80]) { const s = TL.shown(t); console.log('checkpoint', t, s.value, s.unit, '|', TL.tagAt(t)); }
for (const f of [0, 0.6, 1.19, 1.2, 1.4, 1.59, 1.6, 50, 96.79]) console.log('edl film', f, '->', TL.edit(f));
