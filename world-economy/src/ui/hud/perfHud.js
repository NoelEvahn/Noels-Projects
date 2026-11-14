// Perf HUD (F3, Annex G 5, MASTER_SPEC 9.3 acceptance 6): fps, frame ms avg/p95/p99/max, CPU breakdown, draw calls, triangles,
// texture/geometry/GPU MB, programs, heap, entity counts, resolution scale, governor level, 120-frame graph with budget colours,
// "Copy report" (snapshot JSON in a text area), and a minimal graphics panel (preset + adaptive) as the Settings hook point.
// DOM updates are throttled to 4 per second and only while visible.
import { BUDGETS, budgetState } from '../../render/perf.js';

const CSS = `
#perfhud{position:absolute;right:12px;top:12px;width:min(340px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;background:rgba(8,12,18,.82);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:8px 10px;pointer-events:auto;font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#d6e2ee;z-index:3}
#perfhud .ph-t{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font:600 12px system-ui,sans-serif}
#perfhud table{width:100%;border-collapse:collapse}#perfhud td{padding:0 2px;white-space:nowrap}#perfhud td:nth-child(2n){text-align:right}
#perfhud .ok{color:#7ee787}#perfhud .warn{color:#e3b341}#perfhud .over{color:#ff7b72}
#perfhud canvas{width:100%;height:48px;display:block;margin:4px 0;background:rgba(255,255,255,.04);border-radius:4px}
#perfhud .ph-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center}
#perfhud select,#perfhud button{font:11px system-ui,sans-serif;color:#e6edf3;background:#1b2430;border:1px solid #33425a;border-radius:5px;padding:3px 6px}
#perfhud textarea{width:100%;box-sizing:border-box;height:90px;margin-top:6px;font:10px ui-monospace,monospace;background:#0d1117;color:#c9d1d9;border:1px solid #33425a;border-radius:4px}
`;

/** Minimal graphics panel (Stage 5 replaces it with the full Settings screen). Returns {el, refresh}. */
export function mountGraphicsPanel(container, quality) {
  const row = document.createElement('div'); row.className = 'ph-row';
  row.innerHTML = '<label>Preset <select data-k="preset" aria-label="Graphics preset"><option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="ultra">Ultra</option><option value="custom" disabled>Custom</option></select></label>' +
    '<label><input type="checkbox" data-k="adaptive"> Adaptive</label>';
  container.appendChild(row);
  const sel = row.querySelector('select'), chk = row.querySelector('input');
  sel.addEventListener('change', () => { quality.applyPreset(sel.value); sel.blur(); });
  chk.addEventListener('change', () => { quality.set('graphics.adaptive', chk.checked); });
  const refresh = () => { sel.value = quality.get('graphics.preset'); chk.checked = !!quality.get('graphics.adaptive'); };
  quality.subscribe((ev) => { if (ev.source !== 'governor') refresh(); });
  refresh();
  return { el: row, refresh };
}

export function createPerfHud({ root, perf, quality = null, getSnapshot = null, visible = false }) {
  if (!document.getElementById('perfhud-css')) { const st = document.createElement('style'); st.id = 'perfhud-css'; st.textContent = CSS; document.head.appendChild(st); }
  const el = document.createElement('div');
  el.id = 'perfhud'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Performance');
  el.innerHTML = '<div class="ph-t"><span>Perf (F3)</span><span id="ph-gov"></span></div><canvas id="ph-graph" width="320" height="48"></canvas><table id="ph-tab"></table>' +
    '<div class="ph-row"><button type="button" id="ph-copy">Copy report</button></div><textarea id="ph-report" readonly hidden aria-label="Perf report JSON"></textarea>';
  root.appendChild(el);
  const tab = el.querySelector('#ph-tab'), gov = el.querySelector('#ph-gov'), cv = el.querySelector('#ph-graph'), ta = el.querySelector('#ph-report');
  const g2 = cv.getContext('2d');
  let panel = null;
  if (quality) panel = mountGraphicsPanel(el, quality);
  const hist = new Float32Array(120);
  let acc = 1, shown = !!visible;
  el.style.display = shown ? '' : 'none';
  const snap = () => (getSnapshot ? getSnapshot() : perf.snapshot());
  el.querySelector('#ph-copy').addEventListener('click', () => {
    const text = JSON.stringify(snap(), null, 1);
    ta.hidden = false; ta.value = text; ta.focus(); ta.select();
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {}); } catch (e) { /* select-all fallback stays */ }
  });

  const MB = 1048576;
  const cell = (label, value, state) => `<td>${label}</td><td class="${state || ''}">${value}</td>`;
  function render() {
    const b = BUDGETS[(quality && (quality.get('graphics.autoResolved') && quality.get('graphics.preset') === 'auto' ? quality.get('graphics.autoResolved') : quality.get('graphics.preset'))) || 'high'] || BUDGETS.high;
    const f = perf.frameMs, c = perf.cpu, d = perf.draw, m = perf.mem, k = perf.counts, q = perf.quality;
    const cpuTot = c.sim + c.physics + c.ai + c.anim + c.cull + c.stream + c.render + c.ui + c.audio;
    const rows = [
      [cell('fps', perf.fps.toFixed(1), budgetState(1000 / Math.max(1, perf.fps), b.frameMs)), cell('avg ms', f.mean.toFixed(2), budgetState(f.mean, 14))],
      [cell('p95', f.p95.toFixed(2), budgetState(f.p95, 16.7)), cell('p99', f.p99.toFixed(2), budgetState(f.p99, 22))],
      [cell('max', f.max.toFixed(1), budgetState(f.max, 33)), cell('hitch>33', perf.hitches.over33, '')],
      [cell('cpu sim', (c.sim + c.physics + c.ai).toFixed(2), budgetState(c.sim + c.physics + c.ai, 2.5)), cell('anim+cull', (c.anim + c.cull).toFixed(2), budgetState(c.anim + c.cull, 2))],
      [cell('stream', c.stream.toFixed(2), budgetState(c.stream, 3)), cell('render', c.render.toFixed(2), budgetState(c.render, 3))],
      [cell('ui+audio', (c.ui + c.audio).toFixed(2), budgetState(c.ui + c.audio, 1)), cell('cpu total', cpuTot.toFixed(2), '')],
      [cell('draws', d.calls, budgetState(d.calls, b.calls)), cell('shadow', d.shadowCalls, budgetState(d.shadowCalls, b.shadowCalls))],
      [cell('tris', (d.triangles / 1000).toFixed(0) + 'k', budgetState(d.triangles, b.triangles)), cell('sh tris', (d.shadowTriangles / 1000).toFixed(0) + 'k', budgetState(d.shadowTriangles, b.shadowTriangles))],
      [cell('tex MB', (m.libraryTextureBytes / MB).toFixed(1), budgetState(m.libraryTextureBytes / MB, b.libTexMB)), cell('geo MB', (m.geometryBytes / MB).toFixed(1), budgetState(m.geometryBytes / MB, b.geoMB))],
      [cell('gpu MB', (m.gpuEstimateBytes / MB).toFixed(1), budgetState(m.gpuEstimateBytes / MB, b.gpuMB)), cell('programs', k.programs, budgetState(k.programs, b.programs))],
      [cell('heap MB', (m.jsHeap / MB).toFixed(0), budgetState(m.jsHeap / MB, b.heapMB)), cell('alloc/f KB', (perf.allocPerFrame / 1024).toFixed(1), budgetState(perf.allocPerFrame / 1024, 50))],
      [cell('entities', k.entities, ''), cell('chars/veh', k.characters + '/' + k.vehicles, '')],
      [cell('chunks', k.chunksNear + '/' + k.chunksMid, ''), cell('voices', k.voices, '')],
      [cell('res scale', (+q.resolutionScale).toFixed(2), ''), cell('gov level', q.governorLevel, q.governorLevel ? 'warn' : 'ok')],
      [cell('stream q', perf.stream.queue, ''), cell('overruns', perf.stream.sliceOverruns, perf.stream.sliceOverruns ? 'over' : 'ok')],
    ];
    tab.innerHTML = rows.map((r) => '<tr>' + r.join('') + '</tr>').join('');
    gov.textContent = `${q.preset}${quality && quality.get('graphics.adaptive') ? ' · adaptive' : ''} · L${q.governorLevel}`;
    // graph: frame times against 16.7 / 33 ms lines
    perf.history(hist);
    const W = cv.width, H = cv.height, sc = H / 50;
    g2.clearRect(0, 0, W, H);
    g2.fillStyle = 'rgba(255,255,255,.18)'; g2.fillRect(0, H - 16.7 * sc, W, 1); g2.fillRect(0, H - 33.3 * sc, W, 1);
    const bw = W / hist.length;
    for (let i = 0; i < hist.length; i++) {
      const v = hist[i]; if (!v) continue;
      g2.fillStyle = v <= 16.7 ? '#7ee787' : v <= 18.4 ? '#e3b341' : '#ff7b72';
      const h = Math.min(H, v * sc); g2.fillRect(i * bw, H - h, Math.max(1, bw - 0.5), h);
    }
  }
  return {
    el, panel,
    get visible() { return shown; },
    toggle(on) { shown = on === undefined ? !shown : !!on; el.style.display = shown ? '' : 'none'; acc = 1; if (shown) render(); },
    update(dt) { if (!shown) return; acc += dt; if (acc < 0.25) return; acc = 0; render(); },
    render,
  };
}
