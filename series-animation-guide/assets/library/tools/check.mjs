// Syntax-check every library module the way the browser will (as ES modules).
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); let bad = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (['node_modules', 'screenshots'].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
for (const f of walk(root)) { try { new vm.SourceTextModule(fs.readFileSync(f, 'utf8'), { identifier: f }); } catch (e) { bad++; console.log('SYNTAX', path.relative(root, f), e.message); } }
console.log(bad ? bad + ' file(s) with errors' : 'all modules parse');
