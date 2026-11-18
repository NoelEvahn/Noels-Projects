// Tiny static server for the library viewer. three + fonts are resolved from LIB_DEPS (a dir containing node_modules).
import http from 'http'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const LIB = path.resolve(here, '..');
export function startServer(deps = process.env.LIB_DEPS, port = 0, extraRoots = {}) {
  const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };
  const srv = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    let f;
    if (u.startsWith('/three/')) f = path.join(deps, 'node_modules/three', u.slice(7));
    else if (u.startsWith('/fonts/')) f = path.join(deps, 'node_modules/@fontsource/anton/files', u.slice(7));
    else {
      const hit = Object.keys(extraRoots).find((k) => u.startsWith(k));
      f = hit ? path.join(extraRoots[hit], u.slice(hit.length)) : path.join(LIB, u === '/' ? 'viewer.html' : u);
    }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end('nf ' + u); } else { res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); } });
  });
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r({ srv, port: srv.address().port })));
}
