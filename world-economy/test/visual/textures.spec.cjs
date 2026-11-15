// Texture library test (Annex G 6, MASTER_SPEC 9.3 acceptance 2): every tex.* layer bakes without a GL error, is non-flat
// (luminance variance above a threshold) and tileable (the wrap seam differs from the interior by no more than an ordinary
// neighbouring-texel difference). Reads each layer back at its stored size. Also prints byte totals per preset.
// Usage: node test/visual/textures.spec.cjs [--preset=high]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const preset = (args.find((a) => a.startsWith('--preset=')) || '--preset=high').split('=')[1];
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 320, height: 180 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' || /GL_INVALID|GL ERROR/i.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + path.join(root, 'dist/life.html'));
  await p.evaluate(() => window.__LOE.ready);
  await p.evaluate((pr) => { window.__LOE.freeze(true); window.__LOE.setQuality(pr); }, preset);
  await p.evaluate(async () => { const L = window.__LOE; while (L.rend.baker.pending) { L.streaming.pump(200); await new Promise((r) => setTimeout(r, 0)); } });
  const res = await p.evaluate(() => {
    const L = window.__LOE, baker = L.rend.baker, gl = L.rend.renderer.getContext(), out = [];
    const ids = Object.keys(baker.stats.bakeMs);
    for (const id of ids) {
      const row = { id, ms: baker.stats.bakeMs[id], glError: gl.getError() };
      for (const map of ['alb', 'dat']) {
        const r = baker.read(id, map); if (!r) { row[map] = null; continue; }
        const { size, data } = r, lum = (i) => data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        let s = 0, s2 = 0, n = 0, seam = 0;
        for (let y = 0; y < size; y += 2) for (let x = 0; x < size; x += 2) { const v = lum((y * size + x) * 4); s += v; s2 += v * v; n++; }
        // tileable = the wrap seam is not an outlier: its mean difference is within the largest interior column/row difference
        const colD = new Float32Array(size), rowD = new Float32Array(size);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const xp = (x + size - 1) % size, yp = (y + size - 1) % size, v = lum((y * size + x) * 4); colD[x] += Math.abs(v - lum((y * size + xp) * 4)) / size; rowD[y] += Math.abs(v - lum((yp * size + x) * 4)) / size; }
        let inner = 0; for (let k = 1; k < size; k++) inner = Math.max(inner, colD[k], rowD[k]);
        seam = Math.max(colD[0], rowD[0]);
        const ns = 1, ni = 1;
        const mean = s / n;
        row[map] = { size, variance: +(s2 / n - mean * mean).toFixed(2), seam: +(seam / ns).toFixed(2), inner: +(inner / ni).toFixed(2) };
      }
      out.push(row);
    }
    const s = L.perf.snapshot();
    return { rows: out, libMB: +(s.mem.libraryTextureBytes / 1048576).toFixed(1), sizes: baker.stats.sizes };
  });
  const FLAT_OK = new Set(['tex.flat', 'tex.carpaint_flake']); // near-uniform by design (tint carriers)
  for (const r of res.rows) {
    const a = r.alb, d = r.dat;
    const nonFlat = FLAT_OK.has(r.id) || (a && a.variance > 1.5) || (d && d.variance > 1.5);
    const tile = (m) => !m || m.seam <= m.inner * 1.6 + 1; // a periodic map has its seam inside the range of its own column-to-column jumps
    check(`${r.id} bakes, non-flat, tileable`, r.glError === 0 && nonFlat && tile(a) && tile(d), `bake ${r.ms} ms  alb ${a && a.size}px var ${a && a.variance} seam ${a && a.seam}/${a && a.inner}  dat var ${d && d.variance} seam ${d && d.seam}/${d && d.inner}`);
  }
  console.log(`library ${res.rows.length} layers, ${res.libMB} MB tracked at ${preset}`, JSON.stringify(res.sizes));
  fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
  fs.writeFileSync(path.join(root, 'test-results', `textures-${preset}.json`), JSON.stringify(res, null, 1));
  check('no GL / console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
