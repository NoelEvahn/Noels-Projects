// Perf regression (Annex G 2.3 / 6, MASTER_SPEC 9.3 acceptance 3-5): counters at the 16 standard viewpoints for Low, Medium,
// High and Ultra against the per-preset budgets, plus baseline x 1.10 (baseline.json, written on the first run or with
// --rebase), and the scripted 30 m/s ring fly-through (slice overruns = 0, program count constant).
// Counters do not depend on resolution, so pages render at 320x180 to keep software GL fast. Frame rate is never asserted.
// Usage: node test/perf/perf.spec.cjs [--presets=low,high] [--views=V01,V03] [--rebase] [--out=test-results/perf.json]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const basePath = path.join(__dirname, 'baseline.json');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const PRESETS = opt('presets', 'low,medium,high,ultra').split(',');
const VIEWS = opt('views', Array.from({ length: 16 }, (_, i) => 'V' + String(i + 1).padStart(2, '0')).join(',')).split(',');
const MB = 1048576;
/** Annex G 2.3 */
const BUDGET = {
  low: { calls: 220, shadowCalls: 60, tris: 350e3, shadowTris: 80e3, libMB: 64, gpuMB: 200, geoMB: 60, programs: 40, lights: 2 },
  medium: { calls: 320, shadowCalls: 140, tris: 700e3, shadowTris: 300e3, libMB: 120, gpuMB: 330, geoMB: 100, programs: 50, lights: 4 },
  high: { calls: 450, shadowCalls: 280, tris: 1.2e6, shadowTris: 700e3, libMB: 240, gpuMB: 520, geoMB: 160, programs: 60, lights: 8 },
  ultra: { calls: 600, shadowCalls: 420, tris: 2.0e6, shadowTris: 1.2e6, libMB: 400, gpuMB: 820, geoMB: 220, programs: 60, lights: 8 },
};
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
(async () => {
  const b = await chromium.launch({ args: ['--js-flags=--expose-gc'] });
  const p = await b.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.join(root, 'dist/life.html'));
  const boot = await p.evaluate(() => window.__LOE.ready);
  console.log('boot marks (ms):', JSON.stringify(boot.marks));
  await p.evaluate(() => { window.__LOE.freeze(true); document.getElementById('overlay').style.display = 'none'; });
  const base = fs.existsSync(basePath) && !args.includes('--rebase') ? JSON.parse(fs.readFileSync(basePath, 'utf8')) : null;
  const useBase = base && base.stage === 3;
  const out = { stage: 3, presets: {} };
  for (const preset of PRESETS) {
    const B = BUDGET[preset];
    await p.evaluate((pr) => window.__LOE.setQuality(pr), preset);
    out.presets[preset] = {};
    for (const id of VIEWS) {
      const t = Date.now();
      await p.evaluate((id) => window.__LOE.viewpoint(id, { hour: 8 }), id);
      const s = await p.evaluate(() => { window.__LOE.renderNow(); window.__LOE.renderNow(); return window.__LOE.perf.snapshot(); });
      const row = { calls: s.draw.calls, tris: s.draw.triangles, shadowCalls: s.draw.shadowCalls, shadowTris: s.draw.shadowTriangles, libMB: +(s.mem.libraryTextureBytes / MB).toFixed(1), gpuMB: +(s.mem.gpuEstimateBytes / MB).toFixed(1), geoMB: +(s.mem.geometryBytes / MB).toFixed(1), programs: s.counts.programs, lights: s.counts.lights, chunksNear: s.counts.chunksNear, chunksMid: s.counts.chunksMid, ms: Date.now() - t };
      out.presets[preset][id] = row;
      const over = Object.keys(B).filter((k) => row[k] > B[k]);
      let baseNote = '';
      if (useBase && base.presets[preset] && base.presets[preset][id]) {
        const r0 = base.presets[preset][id];
        for (const k of ['calls', 'tris', 'shadowCalls', 'shadowTris', 'geoMB']) if (row[k] > r0[k] * 1.1 + (k.endsWith('MB') ? 0.2 : 4)) over.push(k + '>base');
        baseNote = ' and baseline x1.10';
      }
      check(`${preset} ${id} within budgets${baseNote}`, over.length === 0, `draws ${row.calls}/${B.calls} shadow ${row.shadowCalls}/${B.shadowCalls} tris ${(row.tris / 1e3).toFixed(0)}k/${B.tris / 1e3}k shTris ${(row.shadowTris / 1e3).toFixed(0)}k/${B.shadowTris / 1e3}k tex ${row.libMB}/${B.libMB} gpu ${row.gpuMB}/${B.gpuMB} geo ${row.geoMB}/${B.geoMB} prog ${row.programs}/${B.programs} lights ${row.lights}${over.length ? '  OVER: ' + over.join(',') : ''}`);
    }
  }
  const outPath = path.resolve(root, opt('out', 'test-results/perf.json'));
  fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
  if (!useBase && PRESETS.length === 4 && VIEWS.length === 16) { fs.writeFileSync(basePath, JSON.stringify(out, null, 1)); console.log('baseline.json written'); }
  // fly-through (High preset, cpuOnly): streaming slices and program count
  await p.evaluate(() => window.__LOE.setQuality('high'));
  const nat = await p.evaluate(() => window.__LOE.flythrough({ speed: 30, cpuOnly: true }));
  console.log('fly-through (natural GC):', JSON.stringify(nat));
  check('fly-through (natural GC): overruns bounded', nat.overruns <= 3, `overruns ${nat.overruns}, max pump ${nat.maxPump.toFixed(2)} ms, max single step ${nat.maxStep.toFixed(2)} ms`);
  const fly = await p.evaluate(() => window.__LOE.flythrough({ speed: 30, cpuOnly: true, gcEvery: 60 }));
  console.log('fly-through (GC between frames):', JSON.stringify(fly));
  check('fly-through completes the ring route', fly.distance > 4500 && fly.queueEnd === 0);
  check('fly-through: Streaming.pump never exceeds its budget by more than 2 ms (overruns = 0)', fly.overruns === 0, `max pump ${fly.maxPump.toFixed(2)} ms, max single step ${fly.maxStep.toFixed(2)} ms at ${fly.maxStepAt}`);
  check('fly-through: program count constant', fly.programsStart === fly.programsEnd, `${fly.programsStart} -> ${fly.programsEnd}`);
  const alloc = await p.evaluate(() => window.__LOE.perf.allocPerFrame(300));
  console.log('allocation per frame:', JSON.stringify(alloc));
  if (alloc.supported) check('steady-state allocation <= 50 KB per frame', alloc.bytesPerFrame <= 50 * 1024, `${(alloc.bytesPerFrame / 1024).toFixed(1)} KB`);
  check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
