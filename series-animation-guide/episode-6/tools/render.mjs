// Parallel deterministic renderer (cloud sessions). Serves the series folder, opens episode-6/index.html in headless Chromium (SwiftShader).
//   node tools/render.mjs --from 0 --to 2903 --scale 0.5 --workers 4 --out <dir> [--step 1] [--frames 0,30,61]   (film frame indices)
// Frames are written as <out>/f00000.jpg (already rendered frames are skipped unless FORCE=1).
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import http from 'http'; import { fileURLToPath } from 'url';
const req = createRequire(import.meta.url); const { chromium } = req('playwright');
const here = path.dirname(fileURLToPath(import.meta.url)), EP = path.resolve(here, '..'), ROOT = path.resolve(EP, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const from = +arg('from', 0), to = +arg('to', 2099), step = +arg('step', 1), scale = +arg('scale', 1), workers = +arg('workers', 4), out = path.resolve(arg('out', 'frames')), quality = arg('q', '0.92');
const list = arg('frames', null), parts = arg('parts', null);
fs.mkdirSync(out, { recursive: true });
const T = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); } fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(d); }); });
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const port = srv.address().port;
let frames = list ? list.split(',').map(Number) : []; if (!list) for (let i = from; i <= to; i += step) frames.push(i);
frames = frames.filter((i) => process.env.FORCE || !fs.existsSync(path.join(out, `f${String(i).padStart(5, '0')}.jpg`)));
console.log('frames to render', frames.length, 'scale', scale, 'workers', workers);
let next = 0, done = 0; const t0 = Date.now();
async function worker(id) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: Math.round(1080 * scale), height: Math.round(1920 * scale) } });
  page.on('pageerror', (e) => console.log(`[w${id} pageerror]`, e.message.slice(0, 400)));
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GPU stall')) console.log(`[w${id}]`, m.text().slice(0, 300)); });
  await page.goto(`http://127.0.0.1:${port}/episode-6/index.html?scale=${scale}&q=${quality}${parts ? '&parts=' + parts : ''}`, { waitUntil: 'load' });
  await page.waitForFunction('window.READY === true', null, { timeout: 300000 });
  while (true) {
    const k = next++; if (k >= frames.length) break; const i = frames[k];
    try { const url = await page.evaluate((i) => window.renderFrame(i), i); fs.writeFileSync(path.join(out, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64')); }
    catch (e) { console.log('FAIL frame', i, e.message.slice(0, 300)); }
    done++; if (done % 100 === 0) console.log(`${done}/${frames.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
}
await Promise.all(Array.from({ length: Math.min(workers, frames.length || 1) }, (_, i) => worker(i)));
console.log('done', done, 'frames in', ((Date.now() - t0) / 1000).toFixed(0), 's'); srv.close();
