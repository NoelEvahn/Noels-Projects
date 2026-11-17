// Visual capture (Annex G 7, MASTER_SPEC 9.3 acceptance 8): 16 standard viewpoints x {08:00 clear, 18:30 golden hour,
// 22:00 night} + weather shots (rain V01/V13, mist V08/V16, overcast V15, storm V10) at High, 960x540. Each shot is checked
// non-blank (pixel variance and colour count) and its counters recorded. Software GL takes 30-180 s per shot; pages run in
// parallel (--pages=3). Output: test/screenshots/<id>_<hhmm|weather>.png + shots.json.
// Usage: node test/visual/shots.cjs [--set=matrix|day|night|golden|weather|assets] [V01 V05 ...] [--pages=3] [--preset=high] [--out=test/screenshots] [--size=960x540] [--html=dist/life.html]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const ids = args.filter((a) => /^V\d\d$/.test(a));
const VIEWS = ids.length ? ids : Array.from({ length: 16 }, (_, i) => 'V' + String(i + 1).padStart(2, '0'));
const set = opt('set', 'matrix'), preset = opt('preset', 'high'), pages = Number(opt('pages', 3));
const [SW, SH] = opt('size', '960x540').split('x').map(Number), htmlPath = path.resolve(root, opt('html', 'dist/life.html')); // --size=WxH, --html=<built page> (a private copy keeps another agent's rebuild from changing a run)
const outDir = path.resolve(root, opt('out', 'test/screenshots'));
const jobs = [];
const hours = { day: [8], golden: [18.5], night: [22], matrix: [8, 18.5, 22], weather: [] }[set] || [8];
const hhmm = (h) => String(Math.floor(h)).padStart(2, '0') + String(Math.round((h % 1) * 60)).padStart(2, '0');
for (const h of hours) for (const v of VIEWS) jobs.push({ v, hour: h, weather: 'clear', name: `${v}_${hhmm(h)}` });
// H1, H2 asset views (Annex G 7.2): cafe racer on Old Forest Road at golden hour; the moored red trawler at the Port Calder quay
if ((set === 'matrix' || set === 'assets') && !ids.length) jobs.push({ custom: 'H1', hour: 18.5, weather: 'clear', name: 'H1_moto_cafe' }, { custom: 'H2', hour: 10, weather: 'clear', name: 'H2_trawler' });
if (set === 'matrix' || set === 'weather') for (const [v, w, h] of [['V01', 'rain', 10], ['V13', 'rain', 10], ['V08', 'mist', 7], ['V16', 'mist', 7], ['V15', 'overcast', 12], ['V10', 'storm', 16]]) if (!ids.length || ids.includes(v)) jobs.push({ v, hour: h, weather: w, name: `${v}_${w}` });
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const rows = [], errs = [];
  let bad = 0, next = 0;
  async function worker(k) {
    const p = await b.newPage({ viewport: { width: SW, height: SH }, deviceScaleFactor: 1 });
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + htmlPath);
    await p.evaluate(() => window.__LOE.ready);
    await p.evaluate((pr) => { window.__LOE.freeze(true); document.getElementById('overlay').style.display = 'none'; window.__LOE.setQuality(pr); for (const id of ['dbg', 'hint']) { const d = document.getElementById(id); if (d) d.style.display = 'none'; } }, preset);
    while (next < jobs.length) {
      const j = jobs[next++], t = Date.now();
      await p.evaluate(([w]) => window.__LOE.setWeather(w, 1), [j.weather]);
      if (j.custom) await p.evaluate(async ([c, hour]) => {
        const L = window.__LOE, W = L.world; L.setTime(hour);
        if (c === 'H1') { const x = -196, z = -1146, y = W.heightAt(x, z); if (!W.data.decor.qaH1) { W.addPlacement({ id: 'qa.h1', archetype: 'veh.moto_cafe', x, y, z, rotY: 0.9, seed: 7, params: {} }); W.data.decor.qaH1 = true; } L.game.teleport([x + 6, y, z + 6], 0); L.rend.chunks.invalidate(); L.camera.set({ pos: [x + 1.9, y + 1.15, z - 1.6], target: [x, y + 0.6, z], fov: 45 }); }
        else { const x = -934, z = 1143; L.game.teleport([-905, 3, 1140], 0); L.camera.set({ pos: [x + 12, 6.5, z - 14], target: [x, 2.5, z], fov: 50 }); }
        return L.settle(240000, 2);
      }, [j.custom, j.hour]);
      else await p.evaluate(([v, hour]) => window.__LOE.viewpoint(v, { hour }), [j.v, j.hour]);
      // let lerped state (weather 20 s, region grade 3 s, exposure 1.5 s) settle: render simulated seconds
      // (ground cover, vegetation blocks and ambient geometry are queued by the first frames: drain them, then frame again)
      await p.evaluate(async () => { const L = window.__LOE; for (let i = 0; i < 12; i++) L.rend.frame(L.game, 1, 1); await L.settle(240000, 2); for (let i = 0; i < 12; i++) L.rend.frame(L.game, 1, 1); await L.settle(240000, 2); });
      const st = await p.evaluate(() => window.__LOE.pixelStats());
      const s = await p.evaluate(() => window.__LOE.perf.snapshot());
      await p.screenshot({ path: path.join(outDir, j.name + '.png') });
      const ok = st.variance > 60 && st.colors > 40;
      if (!ok) bad++;
      const row = { name: j.name, ok, ms: Date.now() - t, mean: +st.mean.toFixed(1), variance: +st.variance.toFixed(1), colors: st.colors, calls: s.draw.calls, tris: s.draw.triangles, shadowCalls: s.draw.shadowCalls, programs: s.counts.programs };
      rows.push(row);
      console.log(`${j.name.padEnd(12)} ${ok ? 'ok   ' : 'BLANK'} ${row.ms} ms  mean ${row.mean} var ${row.variance} colours ${row.colors}  draws ${row.calls} tris ${(row.tris / 1e3).toFixed(0)}k  [page ${k}]`);
    }
    await p.close();
  }
  await Promise.all(Array.from({ length: Math.max(1, pages) }, (_, k) => worker(k)));
  fs.writeFileSync(path.join(outDir, 'shots.json'), JSON.stringify({ preset, rows, errors: errs }, null, 1));
  console.log(`${rows.length} shots, blank ${bad}, console errors ${errs.length}`);
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
