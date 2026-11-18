// Render library items to PNG. Usage: LIB_DEPS=<dir with node_modules> NODE_PATH=$(npm root -g) node tools/shoot.mjs [outDir] [idFilterRegex] [w] [h]
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
import { startServer, LIB } from './server.mjs';
const out = path.resolve(process.argv[2] || path.join(LIB, 'screenshots'));
const filt = new RegExp(process.argv[3] || '.');
const W = +process.argv[4] || 640, H = +process.argv[5] || 800;
fs.mkdirSync(out, { recursive: true });
const { srv, port } = await startServer();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[page]', m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 400)));
await page.goto(`http://127.0.0.1:${port}/viewer.html?w=${W}&h=${H}`);
await page.waitForFunction('window.READY === true', null, { timeout: 60000 });
const ids = (await page.evaluate('window.ITEM_IDS')).filter((i) => filt.test(i));
for (const id of ids) {
  const t0 = Date.now();
  try {
    await page.evaluate((id) => window.showItem(id), id);
    await page.screenshot({ path: path.join(out, id + '.jpg'), type: 'jpeg', quality: 90 });
    console.log('shot', id, Date.now() - t0, 'ms');
  } catch (e) { console.log('FAIL', id, e.message.slice(0, 300)); }
}
await browser.close(); srv.close();
