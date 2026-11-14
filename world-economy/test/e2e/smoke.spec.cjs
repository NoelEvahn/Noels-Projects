// Smoke (Annex G 6): both builds load with zero console errors; __LOE.ready resolves; new game cash = $100.00;
// walk, enter a car, drive, exit, enter a boat, teleport, all through real keyboard events.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); if (!ok) failures++; };

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    const f = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+$/, '/index.html'));
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv)));
}
async function load(browser, url, label) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  const t = Date.now();
  await page.goto(url);
  const ready = await Promise.race([page.evaluate(() => window.__LOE.ready), new Promise((r) => setTimeout(() => r('timeout'), 60000))]);
  check(`${label}: __LOE.ready resolves`, ready !== 'timeout', `${Date.now() - t} ms`);
  const loe = await page.evaluate(() => window.__LOE.errors.length);
  check(`${label}: __LOE.errors.length === 0`, loe === 0, loe ? JSON.stringify(await page.evaluate(() => window.__LOE.errors)) : '');
  check(`${label}: no console errors / page errors`, errors.length === 0, errors.join(' | '));
  return page;
}
const pos = (page) => page.evaluate(() => window.__LOE.game.playerPos());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Annex G: frame rate is never a pass/fail measure here. Keys are held for an amount of *simulated* time (software GL renders
// at 2-4 fps with the Stage 3 renderer), capped at 60 s of wall time.
const simT = (page) => page.evaluate(() => { const s = window.__LOE.clock.state; return (s.total + s.frac) / (s.scale || 1); });
async function hold(page, key, simSeconds) {
  const t0 = await simT(page), w0 = Date.now();
  await page.keyboard.down(key);
  while ((await simT(page)) - t0 < simSeconds && Date.now() - w0 < 60000) await wait(100);
  await page.keyboard.up(key);
}

(async () => {
  const browser = await chromium.launch();
  // ---- single file from file:// -------------------------------------------------------------------------------------------------
  const page = await load(browser, 'file://' + path.join(root, 'dist/life.html'), 'dist/life.html (file://)');
  const cash = await page.evaluate(() => window.__LOE.sim.select('cash'));
  check('new game cash === $100.00 (10000 cents)', cash === 10000);
  const tx = await page.evaluate(() => window.__LOE.sim.select('ledger.recent', { limit: 5 }));
  check('exactly one genesis transaction', tx.length === 1 && tx[0].type === 'genesis');
  check('ledger invariant', (await page.evaluate(() => window.__LOE.sim.select('ledger.invariant'))).ok);
  await page.evaluate(() => { document.getElementById('overlay').style.display = 'none'; });
  const rend = await page.evaluate(() => window.__LOE.perf.snapshot().renderer);
  console.log('      renderer:', rend);
  // walk with real key events
  await page.bringToFront();
  await page.evaluate(() => window.__LOE.teleport('poi.city.spawn', 0));
  const p0 = await pos(page);
  await hold(page, 'KeyW', 2.5);
  const p1 = await pos(page);
  const moved = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
  check('player walks forward with W', moved > 3, `moved ${moved.toFixed(1)} m, dz ${(p1[2] - p0[2]).toFixed(1)}`);
  await page.keyboard.down('Space'); await wait(250); await page.keyboard.up('Space');
  // enter the starter car
  await page.evaluate(() => window.__LOE.teleport([-152.5, 8.1, 389.5], 0));
  await page.keyboard.press('KeyE'); await wait(600);
  let mode = await page.evaluate(() => window.__LOE.game.player.mode);
  check('E enters the starter car', mode === 'vehicle', 'mode ' + mode);
  const c0 = await pos(page);
  await hold(page, 'KeyW', 3.5);
  const c1 = await pos(page);
  const sp = await page.evaluate(() => window.__LOE.game.activeVehicle().sim.speed);
  check('car drives with W', Math.hypot(c1[0] - c0[0], c1[2] - c0[2]) > 8 && sp > 3, `moved ${Math.hypot(c1[0] - c0[0], c1[2] - c0[2]).toFixed(1)} m, speed ${sp.toFixed(1)}`);
  await hold(page, 'KeyS', 2.5);
  await page.keyboard.press('KeyE'); await wait(600);
  mode = await page.evaluate(() => window.__LOE.game.player.mode);
  check('E exits the car', mode === 'foot', 'mode ' + mode);
  // boat
  await page.evaluate(() => window.__LOE.teleport([-288, 0.6, 598.2], 0));
  await page.keyboard.press('KeyE'); await wait(600);
  mode = await page.evaluate(() => window.__LOE.game.player.mode);
  check('E enters the river skiff', mode === 'boat', 'mode ' + mode);
  const b0 = await pos(page);
  await hold(page, 'KeyW', 4);
  const b1 = await pos(page);
  check('boat moves with W', Math.hypot(b1[0] - b0[0], b1[2] - b0[2]) > 2, `moved ${Math.hypot(b1[0] - b0[0], b1[2] - b0[2]).toFixed(1)} m, y ${b1[1].toFixed(2)}`);
  await page.keyboard.press('KeyE'); await wait(600);
  // teleport menu reaches every POI region
  const options = await page.evaluate(() => document.querySelectorAll('#dbg-tp option[value^="poi."]').length);
  check('teleport menu lists every POI', options === 160, 'options ' + options);
  await page.selectOption('#dbg-tp', 'poi.forest.timberline'); await wait(1500);
  const tp = await pos(page);
  check('teleport menu moves the player', Math.hypot(tp[0] - 1150, tp[2] + 1300) < 30, JSON.stringify(tp.map((v) => +v.toFixed(0))));
  const reg = await page.evaluate(() => window.__LOE.game.regionNow());
  check('region events follow the player', reg === 'forest');
  check('no errors after interaction', (await page.evaluate(() => window.__LOE.errors.length)) === 0, JSON.stringify(await page.evaluate(() => window.__LOE.errors)));
  await page.close();

  // ---- multi-file artifact over http --------------------------------------------------------------------------------------------------
  const srv = await serve(path.join(root, 'dist/artifact'));
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const page2 = await load(browser, url, 'dist/artifact (http)');
  check('artifact: new game cash === 10000', (await page2.evaluate(() => window.__LOE.sim.select('cash'))) === 10000);
  await page2.close(); srv.close();
  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nall smoke checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
