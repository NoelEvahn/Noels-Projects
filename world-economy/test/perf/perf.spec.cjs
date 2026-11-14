// Perf regression (Annex G 6, S2 blockout column of 2.3): counters at the 16 standard viewpoints and the scripted 30 m/s ring fly-through.
// First run writes test/perf/baseline.json; later runs fail if a counter exceeds baseline x 1.10 or the S2 budget. Frame rate is never asserted (software GL).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const basePath = path.join(__dirname, 'baseline.json');
const S2 = { calls: 300, tris: 300000, geoMB: 60, programs: 12, shadowCalls: 100, shadowTris: 150000, textureMB: 16, lights: 0 };
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
(async () => {
  const b = await chromium.launch({ args: ['--js-flags=--expose-gc'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.join(root, 'dist/life.html'));
  const boot = await p.evaluate(() => window.__LOE.ready);
  console.log('boot marks (ms):', JSON.stringify(boot.marks));
  await p.evaluate(() => { window.__LOE.freeze(true); document.getElementById('overlay').style.display = 'none'; });
  const base = fs.existsSync(basePath) ? JSON.parse(fs.readFileSync(basePath, 'utf8')) : null;
  const out = {};
  for (let i = 1; i <= 16; i++) {
    const id = 'V' + String(i).padStart(2, '0');
    await p.evaluate((id) => window.__LOE.viewpoint(id), id);
    const s = await p.evaluate(() => { window.__LOE.renderNow(); return window.__LOE.perf.snapshot(); });
    const row = { calls: s.draw.calls, tris: s.draw.triangles, geoMB: +(s.mem.geometryBytes / 1048576).toFixed(2), programs: s.counts.programs, shadowCalls: s.draw.shadowCalls, shadowTris: s.draw.shadowTriangles, farTris: s.farTris, chunkTris: s.chunkTris };
    out[id] = row;
    const okB = row.calls <= S2.calls && row.tris <= S2.tris && row.geoMB <= S2.geoMB && row.programs <= S2.programs && row.shadowCalls <= S2.shadowCalls;
    let okBase = true;
    if (base && base[id]) okBase = row.calls <= base[id].calls * 1.1 + 2 && row.tris <= base[id].tris * 1.1 + 500 && row.geoMB <= base[id].geoMB * 1.1 + 0.1;
    check(`${id} within S2 budgets${base ? ' and baseline x1.10' : ''}`, okB && okBase, `draws ${row.calls}/${S2.calls}  tris ${row.tris}/${S2.tris}  geo ${row.geoMB} MB  programs ${row.programs}`);
  }
  if (!base) { fs.writeFileSync(basePath, JSON.stringify(out, null, 1)); console.log('baseline.json written'); }
  // natural run: V8 scavenges (about 4 ms, at allocation-deterministic points) may land inside a slice; informational, bounded
  const nat = await p.evaluate(() => window.__LOE.flythrough({ speed: 30, cpuOnly: true }));
  console.log('fly-through (natural GC):', JSON.stringify(nat));
  check('fly-through (natural GC): overruns bounded', nat.overruns <= 3, `overruns ${nat.overruns}, max pump ${nat.maxPump.toFixed(2)} ms, max single step ${nat.maxStep.toFixed(2)} ms`);
  // measurement run: forced collections between frames so a GC pause is not charged to a pump slice
  const fly = await p.evaluate(() => window.__LOE.flythrough({ speed: 30, cpuOnly: true, gcEvery: 60 }));
  console.log('fly-through (GC between frames):', JSON.stringify(fly));
  check('fly-through completes the ring route', fly.distance > 4500 && fly.queueEnd === 0);
  check('fly-through: Streaming.pump never exceeds its budget by more than 2 ms (overruns = 0)', fly.overruns === 0, `max pump ${fly.maxPump.toFixed(2)} ms, max single step ${fly.maxStep.toFixed(2)} ms`);
  check('fly-through: program count constant', fly.programsStart === fly.programsEnd, `${fly.programsStart} -> ${fly.programsEnd}`);
  check('no console errors', errs.length === 0, errs.join(' | '));
  await b.close();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
