// Quality system, governor and perf HUD in the real build (Annex G 3-5; MASTER_SPEC 9.3 acceptance 6, 7, O12):
// auto -> Low under software GL, every preset applies at runtime, persistence across a reload, storage-blocked path,
// governor driven by synthetic frame times shows its level in the snapshot and HUD, F3 HUD renders all fields, Copy report.
const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const url = 'file://' + path.join(root, 'dist/life.html');
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); if (!ok) failures++; };

async function open(ctx, label) {
  const page = await ctx.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto(url);
  const ready = await Promise.race([page.evaluate(() => window.__LOE.ready.then(() => 'ok')), new Promise((r) => setTimeout(() => r('timeout'), 90000))]);
  check(`${label}: ready`, ready === 'ok');
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const { page, errors } = await open(ctx, 'quality');
  await page.evaluate(() => { window.__LOE.freeze(true); document.getElementById('overlay').style.display = 'none'; });

  const q0 = await page.evaluate(() => ({ g: window.__LOE.quality.get().graphics, r: window.__LOE.perf.snapshot().renderer, s: window.__LOE.quality.storageAvailable }));
  const software = /SwiftShader|llvmpipe|Software/i.test(q0.r);
  check('auto preset resolves (software GL -> low, adaptive on)', q0.g.preset === 'auto' && (!software || (q0.g.autoResolved === 'low' && q0.g.shadows === 'low' && q0.g.adaptive === true)), `autoResolved ${q0.g.autoResolved}, renderer ${q0.r.slice(0, 50)}`);
  check('storage available on file:// (normal path)', q0.s === true);

  const presets = await page.evaluate(() => {
    const out = {};
    for (const p of ['low', 'medium', 'high', 'ultra']) {
      const g = window.__LOE.setQuality(p);
      const d = window.__LOE.quality.derived();
      out[p] = { preset: g.preset, rs: g.resolutionScale, sh: g.shadows, casc: d.shadows.cascades, radii: d.chunkRadii, vl: window.__LOE.settings.audio.voiceLimit, pr: window.__LOE.rend.renderer.getPixelRatio(), snapPreset: window.__LOE.perf.snapshot().quality.preset };
    }
    return out;
  });
  const exp = { low: [0.7, 'low', 1, 16], medium: [0.85, 'medium', 2, 24], high: [1, 'high', 3, 32], ultra: [1, 'ultra', 4, 48] };
  for (const [p, e] of Object.entries(exp)) {
    const r = presets[p];
    check(`setQuality('${p}') applies at runtime`, r.preset === p && r.rs === e[0] && r.sh === e[1] && r.casc === e[2] && r.vl === e[3] && r.snapPreset === p, JSON.stringify(r));
  }
  check('resolution scale reaches the renderer pixel ratio', Math.abs(presets.low.pr - 0.7) < 0.01 && Math.abs(presets.high.pr - 1) < 0.01, `low ${presets.low.pr}, high ${presets.high.pr}`);
  const custom = await page.evaluate(() => { window.__LOE.setQuality({ bloom: false }); return window.__LOE.quality.get('graphics.preset'); });
  check('editing a field switches to custom', custom === 'custom');

  // governor with synthetic frame times (the real loop feeds dtReal; here we feed it directly)
  const gov = await page.evaluate(() => {
    const L = window.__LOE; L.setQuality('ultra'); L.quality.set('graphics.adaptive', true);
    const evs = []; const off = L.bus.on('quality:changed', (p) => evs.push(p.governorLevel));
    for (let i = 0; i < 400; i++) L.governor.sample(40);
    const s = L.perf.snapshot();
    const r = { level: L.governor.level, snapLevel: s.quality.governorLevel, effRs: s.quality.resolutionScale, userRs: L.quality.get('graphics.resolutionScale'), evs: evs.slice(0, 5) };
    for (let i = 0; i < 6000 && L.governor.level > 0; i++) L.governor.sample(8);
    r.back = L.governor.level; off();
    return r;
  });
  check('governor steps down under slow frames; level in snapshot; saved settings untouched', gov.level >= 2 && gov.snapLevel === gov.level && gov.effRs < 1 && gov.userRs === 1 && gov.evs[0] === 1, JSON.stringify(gov));
  check('governor restores to level 0 under fast frames', gov.back === 0);

  // perf HUD via F3
  await page.evaluate(() => window.__LOE.freeze(false));
  await page.keyboard.press('F3');
  await page.waitForTimeout(1500);
  const hud = await page.evaluate(() => {
    const el = document.getElementById('perfhud');
    return { shown: el && el.style.display !== 'none', text: el ? el.innerText : '' };
  });
  const need = ['fps', 'avg ms', 'p95', 'p99', 'max', 'cpu sim', 'render', 'draws', 'tris', 'tex MB', 'geo MB', 'programs', 'heap MB', 'entities', 'res scale', 'gov level'];
  const missing = need.filter((k) => !hud.text.includes(k));
  check('F3 shows the perf HUD with every required field', hud.shown && missing.length === 0, missing.length ? 'missing ' + missing.join(',') : '');
  await page.click('#ph-copy');
  const rep = await page.evaluate(() => { try { const j = JSON.parse(document.getElementById('ph-report').value); return { ok: true, keys: Object.keys(j), gl: j.quality && j.quality.governorLevel }; } catch (e) { return { ok: false, e: String(e) }; } });
  check('Copy report puts the snapshot JSON in a text area', rep.ok && ['fps', 'frameMs', 'cpu', 'draw', 'mem', 'counts', 'quality'].every((k) => rep.keys.includes(k)), JSON.stringify(rep).slice(0, 160));
  await page.selectOption('#perfhud select[data-k="preset"]', 'medium');
  check('HUD preset selector applies a preset', (await page.evaluate(() => window.__LOE.quality.get('graphics.preset'))) === 'medium');
  await page.evaluate(() => document.activeElement && document.activeElement.blur()); // keys typed into the report text area are not game input
  await page.keyboard.press('F3');
  await page.waitForTimeout(1500);
  check('F3 hides the HUD again', await page.evaluate(() => document.getElementById('perfhud').style.display === 'none'));
  const alloc = await page.evaluate(() => window.__LOE.perf.allocPerFrame(60));
  check('allocPerFrame helper runs', typeof alloc.bytesPerFrame === 'number' && alloc.frames === 60, JSON.stringify(alloc) + (alloc.bytesPerFrame === 0 ? ' (performance.memory is quantised without --enable-precise-memory-info: 0 means below resolution)' : ''));
  check('no errors (quality page)', errors.length === 0 && (await page.evaluate(() => window.__LOE.errors.length)) === 0, errors.join(' | ') + JSON.stringify(await page.evaluate(() => window.__LOE.errors)));
  await page.close();

  // persistence across a reload (same browser context = same localStorage)
  const r2 = await open(ctx, 'reload');
  const persisted = await r2.page.evaluate(() => window.__LOE.quality.get().graphics);
  check('preset persists across reload', persisted.preset === 'medium' && persisted.shadows === 'medium', persisted.preset);
  await r2.page.close();
  await ctx.close();

  // storage blocked: localStorage access throws
  const ctx2 = await browser.newContext();
  await ctx2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }); });
  const r3 = await open(ctx2, 'storage blocked');
  const blocked = await r3.page.evaluate(() => { const L = window.__LOE; L.setQuality('high'); return { avail: L.quality.storageAvailable, preset: L.quality.get('graphics.preset'), persist: L.quality.persist(), errs: L.errors.length }; });
  check('storage blocked: boots, quality works in memory, no errors', blocked.avail === false && blocked.preset === 'high' && blocked.persist === false && blocked.errs === 0 && r3.errors.length === 0, JSON.stringify(blocked) + r3.errors.join('|'));
  await ctx2.close();
  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nall quality checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
