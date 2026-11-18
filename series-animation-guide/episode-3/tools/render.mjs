// Parallel deterministic renderer.  node tools/render.mjs --from 0 --to 2699 --scale 0.5 --workers 3 --out <dir> [--step 1]
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { startServer } from '../../assets/library/tools/server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url)), EP = path.resolve(here, '..'), LIBDIR = path.resolve(EP, '../assets/library');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const from = +arg('from', 0), to = +arg('to', 2699), step = +arg('step', 1), scale = +arg('scale', 1), workers = +arg('workers', 3), out = path.resolve(arg('out', 'frames')), quality = arg('q', '0.92');
const build = process.env.EP_BUILD || path.resolve(out, '..');
fs.mkdirSync(out, { recursive: true });
const { srv, port } = await startServer(process.env.LIB_DEPS, 0, { '/lib/': LIBDIR + '/', '/ep/': path.join(EP, 'src') + '/', '/build/': build + '/' });
const frames = []; for (let i = from; i <= to; i += step) if (!fs.existsSync(path.join(out, `f${String(i).padStart(5, '0')}.jpg`)) || process.env.FORCE) frames.push(i);
console.log('frames to render', frames.length, 'scale', scale, 'workers', workers);
let next = 0, done = 0, t0 = Date.now();
async function worker(id) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: Math.round(1080 * scale), height: Math.round(1920 * scale) } });
  page.on('pageerror', (e) => console.log(`[w${id} pageerror]`, e.message.slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[w${id}]`, m.text().slice(0, 200)); });
  await page.goto(`http://127.0.0.1:${port}/ep/index.html?scale=${scale}&q=${quality}`.replace('/ep/index.html', '/ep/index.html'), { waitUntil: 'load' });
  await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
  while (true) {
    const k = next++; if (k >= frames.length) break; const i = frames[k];
    try { const url = await page.evaluate((i) => window.renderFrame(i), i); fs.writeFileSync(path.join(out, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64')); }
    catch (e) { console.log('FAIL frame', i, e.message.slice(0, 200)); }
    done++; if (done % 50 === 0) console.log(`${done}/${frames.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
}
await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)));
console.log('done', done, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's'); srv.close();
