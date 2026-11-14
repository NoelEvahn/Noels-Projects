// Builds dist/life.html (everything inline, runs from file://) and dist/artifact/ (multi-file, code-split). MASTER_SPEC 3.4.
// Usage: node build.mjs [--dev]
import * as esbuild from 'esbuild';
import { mkdirSync, rmSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSources, sizeTable, walk } from './tools/size-report.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');
const dist = join(root, 'dist');
const MB = 1048576;
const t0 = Date.now();

const problems = scanSources(join(root, 'src'));
if (problems.length) { console.error('Forbidden API scan failed:\n' + problems.join('\n')); process.exit(1); }

const common = {
  entryPoints: [join(root, 'src/main.js')], bundle: true, platform: 'browser', target: 'es2022', format: 'esm',
  legalComments: 'none', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning',
};

const CSS = `
html,body{margin:0;height:100%;background:#0d1117;color:#e6edf3;font:13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden}
#c{position:fixed;inset:0;width:100%;height:100%;display:block;outline:none}
#ui{position:fixed;inset:0;pointer-events:none}
#dbg{position:absolute;left:12px;top:12px;max-width:min(430px,calc(100vw - 24px));background:rgba(10,14,20,.62);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;pointer-events:auto}
#dbg pre{margin:0 0 6px;font:11.5px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;color:#d6e2ee}
#dbg-tools{display:flex;gap:6px;flex-wrap:wrap}
#dbg select,#dbg button{font:12px system-ui,sans-serif;color:#e6edf3;background:#1b2430;border:1px solid #33425a;border-radius:6px;padding:4px 6px;max-width:100%}
#dbg select{flex:1 1 220px;min-width:0}
#hint{position:absolute;left:12px;right:12px;bottom:10px;text-align:center;color:#cdd9e5;text-shadow:0 1px 3px #000;font-size:12px}
#overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,#1b2a3c 0%,#0b0f15 70%);z-index:5}
#card{width:min(480px,calc(100vw - 32px));padding:28px 28px 22px;background:rgba(18,24,33,.9);border:1px solid #2b3a4e;border-radius:14px;text-align:center}
#card h1{margin:0 0 4px;font-size:22px;letter-spacing:.08em;font-weight:650}
#card p{margin:2px 0 14px;color:#9fb1c4}
#boot-track{height:6px;border-radius:3px;background:#243142;overflow:hidden;margin:10px 0}
#boot-bar{height:100%;width:2%;background:#4aa3ff;transition:width .25s}
#boot-status{min-height:1.4em;color:#bcd0e4}
#start{margin-top:12px;font:600 15px system-ui,sans-serif;padding:10px 22px;border-radius:9px;border:0;background:#4aa3ff;color:#06121f;cursor:pointer}
#start:disabled{background:#33465c;color:#7d8fa3;cursor:wait}
#lockhint{position:absolute;right:12px;top:12px;max-width:260px;background:rgba(10,14,20,.7);border:1px solid #33425a;border-radius:8px;padding:6px 9px;color:#cdd9e5;display:none;pointer-events:none}
`;
const BODY = `<canvas id="c" tabindex="0"></canvas><div id="ui"><div id="lockhint">Pointer lock off: hold the mouse button and drag to look, or click the view to capture the mouse.</div></div>
<div id="overlay"><div id="card"><h1>LIFE</h1><p>Open Economy &middot; Stage 2 world blockout</p><div id="boot-track"><div id="boot-bar"></div></div><div id="boot-status">Starting...</div><button id="start" type="button" disabled>Loading...</button></div></div>`;
const page = (script) => `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LIFE - Open Economy</title><style>${CSS}</style></head><body>${BODY}\n${script}\n</body></html>\n`;

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
const rows = [];

if (dev) {
  const out = join(dist, 'dev');
  await esbuild.build({ ...common, outfile: join(out, 'app.js'), sourcemap: true, minify: false });
  writeFileSync(join(out, 'index.html'), page('<script type="module" src="app.js"></script>'));
  console.log('dev build written to dist/dev (serve with: npx http-server dist/dev)');
  process.exit(0);
}

// ---- single file ---------------------------------------------------------------------------------------------------------------
const single = await esbuild.build({ ...common, write: false, minify: true, outfile: join(dist, 'life.js') });
const js = single.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
writeFileSync(join(dist, 'life.html'), page(`<script type="module">${js}</script>`));
rows.push(['dist/life.html', statSync(join(dist, 'life.html')).size, 8 * MB]);

// ---- multi-file artifact ------------------------------------------------------------------------------------------------------------
const art = join(dist, 'artifact');
await esbuild.build({ ...common, outdir: art, entryNames: 'app', chunkNames: 'chunks/[name]-[hash]', splitting: true, minify: true });
writeFileSync(join(art, 'index.html'), page('<script type="module" src="app.js"></script>'));
for (const f of walk(art)) {
  const rel = f.slice(art.length + 1);
  rows.push([`dist/artifact/${rel}`, statSync(f).size, rel === 'index.html' ? 0.5 * MB : rel.endsWith('.js') ? 4 * MB : 0]);
}
console.log(sizeTable(rows));
const over = rows.filter((r) => r[2] && r[1] > r[2]);
if (over.length) { console.error('size budget exceeded: ' + over.map((r) => r[0]).join(', ')); process.exit(1); }
console.log(`build ok in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
void readFileSync;
