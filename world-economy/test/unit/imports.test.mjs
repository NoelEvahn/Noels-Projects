// Import-rule test (MASTER_SPEC 3.2): greps import statements per directory.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../../src/', import.meta.url).pathname;
const RULES = {
  core: { may: [], mustNot: ['three', 'data', 'world', 'sim', 'game', 'render', 'art', 'blockout', 'ui', 'audio', 'qa'] },
  data: { may: ['core', 'data'], mustNot: ['three', 'world', 'sim', 'game', 'render', 'ui'] },
  world: { may: ['core', 'data', 'world'], mustNot: ['three', 'sim', 'game', 'render', 'ui', 'blockout', 'art'] },
  sim: { may: ['core', 'data', 'sim'], mustNot: ['three', 'world', 'game', 'render', 'ui'] },
  game: { may: ['core', 'data', 'world', 'sim', 'game'], mustNot: ['three', 'render', 'ui', 'art', 'blockout'] },
  render: { may: ['core', 'data', 'world', 'game', 'render', 'blockout', 'art'], mustNot: ['sim', 'ui'] },
  blockout: { may: ['core', 'data', 'world', 'game', 'render', 'blockout'], mustNot: ['sim', 'ui'] },
  audio: { may: ['core', 'data', 'audio'], mustNot: ['three', 'sim'] },
};
function walk(dir, out = []) { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p); } return out; }
const DOM = /\b(document|window|navigator|localStorage|requestAnimationFrame|HTMLElement|addEventListener)\b/;

test('import rules and layering', () => {
  const problems = [];
  for (const [dir, rule] of Object.entries(RULES)) {
    let files = []; try { files = walk(join(SRC, dir)); } catch (e) { continue; }
    for (const f of files) {
      const txt = readFileSync(f, 'utf8');
      for (const m of txt.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm)) {
        const spec = m[1] || m[2];
        let target;
        if (spec === 'three' || spec.startsWith('three/')) target = 'three';
        else if (spec.startsWith('.')) { const rel = relative(SRC, join(f, '..', spec)); target = rel.split('/')[0]; if (rel.startsWith('..')) target = 'outside'; }
        else target = spec;
        if (target === dir && dir !== 'core') continue;
        if (rule.mustNot.includes(target) || (rule.may.length && !rule.may.includes(target) && target !== 'three' && target !== dir)) problems.push(`${relative(SRC, f)} imports ${spec}`);
        if (target === 'outside') problems.push(`${relative(SRC, f)} imports outside src: ${spec}`);
      }
      if (['core', 'data', 'world', 'sim'].includes(dir)) {
        const code = txt.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        if (DOM.test(code.replace(/typeof (localStorage|document|window)/g, ''))) {
          const hit = code.match(DOM)[0];
          if (!(dir === 'core' && f.endsWith('save.js') && hit === 'localStorage')) problems.push(`${relative(SRC, f)} uses DOM global ${hit}`);
        }
        if (/Math\.random/.test(code)) problems.push(`${relative(SRC, f)} uses Math.random`);
      }
      if (dir === 'game' && !f.includes('/input/')) {
        const code = txt.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        if (/\b(document|window)\b/.test(code)) problems.push(`${relative(SRC, f)} touches the DOM outside game/input`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
