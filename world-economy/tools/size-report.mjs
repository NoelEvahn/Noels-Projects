// Build tooling: size table, budgets (MASTER_SPEC 3.5) and forbidden-API scan (Annex G 6 "Build").
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const MB = 1048576;
export function walk(dir, out = []) {
  for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); }
  return out;
}
const FORBIDDEN = [
  [/\b(?<![.\w])(alert|confirm|prompt)\s*\(/, 'alert/confirm/prompt are refused in the artifact frame'],
  [/\beval\s*\(/, 'eval'], [/new\s+Function\s*\(/, 'new Function'], [/\bAudioWorklet\b/, 'AudioWorklet fails from blob: on file://'],
  [/<a[^>]*\bdownload\b/, '<a download>'], [/\bfetch\s*\(\s*['"`]https?:/, 'remote fetch'],
];
const PURE = ['core', 'data', 'sim', 'world', 'game'];
export function scanSources(srcDir) {
  const problems = [];
  for (const f of walk(srcDir).filter((p) => p.endsWith('.js'))) {
    const rel = relative(srcDir, f);
    const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const [re, why] of FORBIDDEN) if (re.test(code)) problems.push(`${rel}: ${why}`);
    if (PURE.includes(rel.split('/')[0]) && /Math\.random/.test(code)) problems.push(`${rel}: Math.random in a pure layer`);
  }
  return problems;
}
export function sizeTable(rows) {
  const w = Math.max(...rows.map((r) => r[0].length));
  const lines = rows.map(([name, bytes, cap]) => `${name.padEnd(w)}  ${(bytes / MB).toFixed(3).padStart(8)} MB${cap ? `   cap ${(cap / MB).toFixed(1)} MB  ${bytes <= cap ? 'ok' : 'OVER BUDGET'}` : ''}`);
  return lines.join('\n');
}
