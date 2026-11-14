// Visual capture (Annex G 7): screenshots at the 16 standard viewpoints, 960x540, plus counter snapshots and a non-blank (pixel variance) check.
// Usage: node test/visual/shots.cjs [V01 V05 ...] [--hour=8] [--out=test/screenshots] [--prefix=name]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const ids = args.filter((a) => /^V\d\d$/.test(a));
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const hour = Number(opt('hour', 8));
const outDir = path.resolve(root, opt('out', 'test/screenshots'));
const prefix = opt('prefix', '');
const list = ids.length ? ids : Array.from({ length: 16 }, (_, i) => 'V' + String(i + 1).padStart(2, '0'));
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.join(root, 'dist/life.html'));
  await p.evaluate(() => window.__LOE.ready);
  await p.evaluate(() => { window.__LOE.freeze(true); document.getElementById('overlay').style.display = 'none'; });
  const rows = [];
  let bad = 0;
  for (const id of list) {
    const t = Date.now();
    await p.evaluate(([id, hour]) => window.__LOE.viewpoint(id, { hour }), [id, hour]);
    const st = await p.evaluate(() => window.__LOE.pixelStats());
    const s = await p.evaluate(() => window.__LOE.perf.snapshot());
    await p.screenshot({ path: path.join(outDir, `${prefix}${id}.png`) });
    const row = { id, ms: Date.now() - t, calls: s.draw.calls, tris: s.draw.triangles, geoMB: +(s.mem.geometryBytes / 1048576).toFixed(1), programs: s.counts.programs, chunksNear: s.counts.chunksNear, chunksMid: s.counts.chunksMid, variance: +st.variance.toFixed(1), colors: st.colors };
    rows.push(row);
    const ok = st.variance > 100 && st.colors > 40;
    if (!ok) bad++;
    console.log(`${id} ${ok ? 'ok ' : 'BLANK'} ${row.ms} ms  draws ${row.calls}  tris ${(row.tris / 1000).toFixed(0)}k  geo ${row.geoMB} MB  programs ${row.programs}  variance ${row.variance}  colours ${st.colors}`);
  }
  fs.writeFileSync(path.join(outDir, `${prefix}counters.json`), JSON.stringify({ hour, rows, errors: errs }, null, 1));
  const maxCalls = Math.max(...rows.map((r) => r.calls)), maxTris = Math.max(...rows.map((r) => r.tris));
  console.log(`max draw calls ${maxCalls} (S2 budget 300), max triangles ${maxTris} (S2 budget 300000), blank shots ${bad}, console errors ${errs.length}`);
  await b.close();
  process.exit(bad || errs.length || maxCalls > 300 || maxTris > 300000 ? 1 : 0);
})();
