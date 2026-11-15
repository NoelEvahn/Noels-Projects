// Renders the measured counters (test-results/perf.json from test/perf/perf.spec.cjs) as the PERF_REPORT tables (Annex G 8 §3-§4).
// Usage: node tools/perf-report.mjs [test-results/perf.json] > /tmp/tables.md
import fs from 'fs';
const file = process.argv[2] || 'test-results/perf.json';
const J = JSON.parse(fs.readFileSync(file, 'utf8'));
const B = {
  low: { calls: 220, shadowCalls: 60, tris: 350e3, shadowTris: 80e3, libMB: 64, gpuMB: 200, geoMB: 60, programs: 40, lights: 2 },
  medium: { calls: 320, shadowCalls: 140, tris: 700e3, shadowTris: 300e3, libMB: 120, gpuMB: 330, geoMB: 100, programs: 50, lights: 4 },
  high: { calls: 450, shadowCalls: 280, tris: 1.2e6, shadowTris: 700e3, libMB: 240, gpuMB: 520, geoMB: 160, programs: 60, lights: 8 },
  ultra: { calls: 600, shadowCalls: 420, tris: 2.0e6, shadowTris: 1.2e6, libMB: 400, gpuMB: 820, geoMB: 220, programs: 60, lights: 8 },
};
const REG = { V01: 'city', V02: 'city', V03: 'city', V04: 'city', V05: 'city', V06: 'city', V07: 'lake', V08: 'lake', V09: 'lake', V10: 'ocean', V11: 'ocean', V12: 'ocean', V13: 'forest', V14: 'forest', V15: 'forest', V16: 'forest' };
const REGB = { city: [450, 1.2e6], lake: [380, 1.0e6], ocean: [400, 1.0e6], forest: [350, 1.2e6] };
const k = (v) => (v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : String(v));
let o = '| Viewpoint | Preset | Draw calls | Shadow calls | Tris | Shadow tris | Lib tex MB | GPU est MB | Geo MB | Programs | Lights | Budget OK |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n';
for (const pr of Object.keys(J.presets)) for (const [id, r] of Object.entries(J.presets[pr])) {
  const over = Object.keys(B[pr]).filter((f) => r[f] > B[pr][f]);
  o += `| ${id} | ${pr} | ${r.calls} | ${r.shadowCalls} | ${k(r.tris)} | ${k(r.shadowTris)} | ${r.libMB} | ${r.gpuMB} | ${r.geoMB} | ${r.programs} | ${r.lights} | ${over.length ? 'no: ' + over.join(', ') : 'yes'} |\n`;
}
o += '\n| Region | Worst draw calls (viewpoint) | Region budget | Worst tris (viewpoint) | Region budget | Tex MB | Geo MB |\n|---|---|---|---|---|---|---|\n';
const H = J.presets.high || {};
for (const reg of ['city', 'lake', 'ocean', 'forest']) {
  const rows = Object.entries(H).filter(([id]) => REG[id] === reg); if (!rows.length) continue;
  const c = rows.reduce((a, b) => (b[1].calls > a[1].calls ? b : a)), t = rows.reduce((a, b) => (b[1].tris > a[1].tris ? b : a)), g = rows.reduce((a, b) => (b[1].geoMB > a[1].geoMB ? b : a));
  o += `| ${reg} | ${c[1].calls} (${c[0]}) | ${REGB[reg][0]} | ${k(t[1].tris)} (${t[0]}) | ${k(REGB[reg][1])} | ${c[1].libMB} | ${g[1].geoMB} (${g[0]}) |\n`;
}
process.stdout.write(o);
