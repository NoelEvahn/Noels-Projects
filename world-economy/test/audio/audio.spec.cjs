// Audio verification (Annex E 8, MASTER_SPEC 9.3 acceptance 9) in headless Chromium with OfflineAudioContext.
// Every amb.*, mus.* and P0 sfx.*/eng.* id (plus every implemented P1/P2 patch) is rendered and checked: validity, peak, level,
// spectral centroid, duration, loop seam, DC; engines track rpm; music onsets and scale; full mix; buffer budget.
// Then the live engine in dist/life.html: initialises inside the Start click with no console errors, beds start, voices play.
// Usage: node test/audio/audio.spec.cjs [--only=<id prefix>] [--skip-live]. Sound quality by ear is NOT verified here.
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const arg = (k) => { const a = process.argv.find((x) => x.startsWith('--' + k)); return a ? (a.split('=')[1] || true) : null; };
const only = arg('only'), skipLive = arg('skip-live');
let failures = 0;
const fails = [];
const check = (name, ok, detail = '') => { if (!ok) { failures++; fails.push(name + '  ' + detail); } return ok; };

(async () => {
  const dir = path.join(root, 'tmp/audio-test'); fs.mkdirSync(dir, { recursive: true });
  const r = await esbuild.build({ entryPoints: [path.join(__dirname, 'entry.mjs')], bundle: true, format: 'esm', write: false, logLevel: 'warning', target: 'es2022' });
  fs.writeFileSync(path.join(dir, 'index.html'), `<!DOCTYPE html><html><head><meta charset="utf-8"><title>audio test</title></head><body><script type="module">${r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script></body></html>`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(dir, 'index.html'));
  await page.waitForFunction(() => window.T && window.T.ready);
  const meta = await page.evaluate(() => ({ sounds: window.T.SOUNDS.map((s) => ({ ...s })), required: window.T.REQUIRED_IDS, patches: Object.keys(window.T.PATCHES) }));
  const patchSet = new Set(meta.patches);
  const hasPatch = (id) => id.startsWith('mus.') || patchSet.has(id);
  // coverage
  const missing = meta.required.filter((id) => !hasPatch(id));
  check('every amb.*, mus.*, P0 sfx.*/eng.* id has a patch', missing.length === 0, missing.join(', '));
  const stubs = meta.sounds.filter((s) => !hasPatch(s.id));
  const badStubs = stubs.filter((s) => s.prio === 'P0' || s.id.startsWith('amb.') || s.id.startsWith('mus.'));
  check('stubs are only P1/P2 ids', badStubs.length === 0, badStubs.map((s) => s.id).join(','));
  const unknownPatches = meta.patches.filter((id) => !meta.sounds.some((s) => s.id === id));
  check('every patch id is in data/sounds.js', unknownPatches.length === 0, unknownPatches.join(','));

  const ids = meta.sounds.filter((s) => hasPatch(s.id) && (!only || s.id.startsWith(only)));
  const rows = [];
  const t0 = Date.now();
  for (const rec of ids) {
    const music = rec.kind === 'music' || rec.kind === 'sting';
    const seconds = music ? (rec.kind === 'sting' ? rec.seconds + 1.5 : 40) : rec.kind === 'oneshot' ? rec.seconds * 1.5 + 0.3 : rec.seconds;
    let m;
    try { m = await page.evaluate(([id, s]) => window.T.measure(id, s), [rec.id, seconds]); }
    catch (e) { check(rec.id + ' renders', false, String(e.message || e).slice(0, 200)); continue; }
    const p = [];
    const ok = (cond, what) => { if (!cond) p.push(what); };
    ok(m.bad === 0 && !m.allZero, 'invalid (NaN/Inf/zero)');
    ok(m.peak <= 0.98, `peak ${m.peak.toFixed(3)} > 0.98`);
    ok(Math.abs(m.dc) <= 0.005, `DC ${m.dc.toFixed(4)}`);
    const level = rec.kind === 'oneshot' ? m.activeRms : m.rms;
    ok(level >= rec.rms[0] && level <= rec.rms[1], `rms ${level.toFixed(4)} not in [${rec.rms}]`);
    ok(m.centroid >= rec.centroid[0] && m.centroid <= rec.centroid[1], `centroid ${Math.round(m.centroid)} Hz not in [${rec.centroid}]`);
    if (rec.kind === 'oneshot') { ok(m.peak >= 0.2, `one-shot peak ${m.peak.toFixed(3)} < 0.2`); ok(m.tailEnd <= rec.seconds * 1.2 + 0.011, `tail ${m.tailEnd.toFixed(2)} s > ${(rec.seconds * 1.2).toFixed(2)} s`); }
    if ((rec.kind === 'loop' || rec.kind === 'engine') && m.seamDb !== null) ok(Math.abs(m.seamDb) <= 3, `seam ${m.seamDb.toFixed(2)} dB (window ${m.seamWin} s)`);
    if (music) { ok(m.onsets >= (rec.kind === 'sting' ? 3 : 20), `onsets ${m.onsets}`); ok(m.inScale >= 0.9, `in-scale ${(m.inScale * 100).toFixed(0)} %`); }
    const pass = p.length === 0;
    check(rec.id, pass, p.join('; '));
    rows.push({ id: rec.id, prio: rec.prio, kind: rec.kind, pass, level: +level.toFixed(4), rmsRange: rec.rms, peak: +m.peak.toFixed(3), centroid: Math.round(m.centroid), centroidRange: rec.centroid, tail: rec.kind === 'oneshot' ? +m.tailEnd.toFixed(2) : null, seamDb: m.seamDb != null ? +m.seamDb.toFixed(2) : null, onsets: m.onsets, inScale: m.inScale, renderMs: m.ms, problems: p });
    process.stdout.write(`${pass ? 'PASS' : 'FAIL'}  ${rec.id.padEnd(30)} ${rec.kind.padEnd(7)} lvl ${level.toFixed(3)} [${rec.rms}] pk ${m.peak.toFixed(2)} c ${String(Math.round(m.centroid)).padStart(5)} [${rec.centroid}]${m.seamDb != null ? ' seam ' + m.seamDb.toFixed(1) : ''}${m.onsets != null ? ' on ' + m.onsets + ' sc ' + (m.inScale * 100).toFixed(0) + '%' : ''}${rec.kind === 'oneshot' ? ' tail ' + m.tailEnd.toFixed(2) : ''}${pass ? '' : '  <- ' + p.join('; ')}\n`);
  }
  // engines: fundamental tracks rpm monotonically and matches rpm/60 x cyl/2 (two-stroke: x cyl) within 8 %
  const engRows = [];
  if (!only || only.startsWith('eng')) {
    for (const id of Object.keys(await page.evaluate(() => window.T.ENGINES)).filter((k) => k !== 'eng.generator')) {
      const e = await page.evaluate((id) => window.T.engineSweep(id), id);
      const mono = e.pts[0].detected < e.pts[1].detected && e.pts[1].detected < e.pts[2].detected;
      const within = e.pts.every((q) => Math.abs(q.detected / q.expected - 1) <= 0.08);
      check(`${id} pitch tracks rpm`, mono && within, e.pts.map((q) => `${q.label} ${q.expected.toFixed(1)}->${q.detected.toFixed(1)} Hz`).join(', '));
      engRows.push({ id, pass: mono && within, pts: e.pts.map((q) => ({ label: q.label, rpm: Math.round(q.rpm), expectedHz: +q.expected.toFixed(1), detectedHz: +q.detected.toFixed(1) })) });
      console.log(`${mono && within ? 'PASS' : 'FAIL'}  ${id} pitch: ` + e.pts.map((q) => `${q.label} ${Math.round(q.rpm)} rpm ${q.expected.toFixed(1)}->${q.detected.toFixed(1)} Hz`).join(' | '));
    }
  }
  let extra = {};
  if (!only) {
    const lb = await page.evaluate(() => window.T.loopBuffers());
    for (const [name, s] of lb) check(`buffer loop seam ${name}`, s.excess < 0.02, JSON.stringify(s));
    console.log('buffer loop seams (excess over a typical sample step):', lb.map(([n, s]) => `${n} ${s.excess.toFixed(4)}`).join(', '));
    const sc = await page.evaluate(() => window.T.scene());
    check('mix: full city-day scene peak <= 0.98 after the limiter', sc.peak <= 0.98 && sc.bad === 0, `peak ${sc.peak.toFixed(3)}`);
    check('mix: RMS -24..-14 dBFS', sc.rmsDb >= -24 && sc.rmsDb <= -14, `${sc.rmsDb.toFixed(1)} dBFS`);
    check('budget: node count for the full scene <= 400', sc.nodes <= 400, `${sc.nodes} nodes`);
    console.log(`mix scene: peak ${sc.peak.toFixed(3)}, RMS ${sc.rmsDb.toFixed(1)} dBFS, ${sc.nodes} nodes in a 2 s worst-case window (${sc.nodesTotal14s} created over the 14 s render)`);
    const pr = await page.evaluate(() => window.T.Audio.prerenderAll());
    check('budget: all one-shots pre-rendered and cached buffers <= 24 MB', pr.count === pr.total && pr.bytes <= 24 * 1048576, `${(pr.bytes / 1048576).toFixed(2)} MB for ${pr.count}/${pr.total} one-shots`);
    console.log(`pre-rendered ${pr.count} one-shots: ${(pr.bytes / 1048576).toFixed(2)} MB`);
    extra = { loopBuffers: lb, scene: sc, prerender: pr };
  }
  check('test page: no console errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  await page.close();

  // live engine in the real build
  let live = null;
  if (!skipLive && !only) {
    const lp = await browser.newPage({ viewport: { width: 960, height: 540 } });
    const lerr = []; lp.on('pageerror', (e) => lerr.push(e.message)); lp.on('console', (m) => { if (m.type() === 'error') lerr.push(m.text()); });
    await lp.goto('file://' + path.join(root, 'dist/life.html'));
    await lp.evaluate(() => window.__LOE.ready);
    const before = await lp.evaluate(() => ({ s: window.__LOE.audio.stats(), h: window.__LOE.audio.play('sfx.ui.click') }));
    check('live: play() before init is a no-op returning null', before.h === null && before.s.ready === false);
    await lp.click('#start'); // user gesture -> Audio.init()
    await lp.waitForTimeout(3000);
    live = await lp.evaluate(async () => {
      const A = window.__LOE.audio; await A.init();
      const v = A.play('sfx.ui.click'), v2 = A.play('sfx.money.coins');
      const l = A.loop('eng.car_i4', { pos: window.__LOE.game.playerPos(), params: { rpm: 2000 } }); l.set('rpm', 3000); l.stop(0.2);
      const unknown = A.play('sfx.does_not_exist'), stub = A.play('sfx.office.printer');
      A.setVoiceLimit(16);
      for (let i = 0; i < 40; i++) A.play('sfx.step.asphalt', { pos: window.__LOE.game.playerPos() });
      const s = A.stats();
      A.music.sting('mus.sting.levelup');
      window.__LOE.setWeather('rain', 0.4);
      return { s, played: !!v && !!v2, unknown, stub, voicesAfterFlood: s.voices, limit: s.voiceLimit };
    });
    await lp.waitForTimeout(2500);
    const after = await lp.evaluate(() => window.__LOE.audio.stats());
    check('live: AudioContext running after the Start click', live.s.state === 'running', live.s.state);
    check('live: ambience beds started (city day)', live.s.beds >= 2, 'beds ' + live.s.beds);
    check('live: music suite selected', /mus\.city\.day/.test(live.s.music), live.s.music);
    check('live: play returns handles; unknown and stub ids return null', live.played && live.unknown === null && live.stub === null);
    check('live: voice limit holds under a flood of 40 one-shots', live.voicesAfterFlood <= live.limit, `${live.voicesAfterFlood}/${live.limit}`);
    check('live: weather change starts the rain bed', after.beds > live.s.beds || after.beds >= 3, `beds ${live.s.beds} -> ${after.beds}`);
    const le = await lp.evaluate(() => window.__LOE.errors);
    check('live: no console errors / __LOE.errors', lerr.length === 0 && le.length === 0, lerr.concat(le.map((e) => e.message)).slice(0, 5).join(' | '));
    console.log('live engine:', JSON.stringify({ ...live.s, after }));
    await lp.close();
  }
  await browser.close();
  fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
  if (!only) fs.writeFileSync(path.join(root, 'test-results/audio.json'), JSON.stringify({ when: new Date().toISOString(), rows, engines: engRows, stubs: stubs.map((s) => s.id), ...extra, live }, null, 1));
  const passed = rows.filter((r) => r.pass).length;
  console.log(`\nrendered ${rows.length} ids in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${passed} pass, ${rows.length - passed} fail; stubs (P1/P2, Stage 6): ${stubs.length}`);
  if (fails.length) console.log('\nFAILURES:\n' + fails.join('\n'));
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nall audio checks passed (signal analysis only: listening by ear is NOT verified)');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
