// Minimal debug HUD (Stage 2): position, region/district, fps, draw calls, triangles, chunk counts, plus a teleport menu to every POI.
export function createDebugHud({ root, game, perf, world, onTeleport, getCounts, onSpawn }) {
  const el = document.createElement('div');
  el.id = 'dbg';
  el.innerHTML = '<pre id="dbg-text"></pre><div id="dbg-tools"><select id="dbg-tp" aria-label="Teleport to a point of interest"></select><button id="dbg-spawn" type="button">Spawn</button><select id="dbg-time" aria-label="Time of day"></select></div>';
  root.appendChild(el);
  const text = el.querySelector('#dbg-text'), sel = el.querySelector('#dbg-tp'), timeSel = el.querySelector('#dbg-time');
  const pois = world.pois().slice().sort((a, b) => (a.region + a.district + a.id).localeCompare(b.region + b.district + b.id));
  let cur = '';
  const o0 = document.createElement('option'); o0.value = ''; o0.textContent = `Teleport (${pois.length} POIs)...`; sel.appendChild(o0);
  let grp = null;
  for (const p of pois) {
    if (p.region !== cur) { cur = p.region; grp = document.createElement('optgroup'); grp.label = p.region.toUpperCase(); sel.appendChild(grp); }
    const o = document.createElement('option'); o.value = p.id; o.textContent = `${p.id.replace('poi.', '')}  ${p.name}`; grp.appendChild(o);
  }
  sel.addEventListener('change', () => { if (sel.value) { onTeleport(sel.value); sel.blur(); sel.value = ''; } });
  el.querySelector('#dbg-spawn').addEventListener('click', () => onSpawn());
  for (const [h, label] of [[8, '08:00'], [12, '12:00'], [18.5, '18:30'], [22, '22:00']]) { const o = document.createElement('option'); o.value = h; o.textContent = label; timeSel.appendChild(o); }
  timeSel.addEventListener('change', () => { window.__LOE && window.__LOE.setTime(Number(timeSel.value)); timeSel.blur(); });
  let acc = 0, visible = true;
  const hint = document.createElement('div'); hint.id = 'hint';
  hint.textContent = 'WASD move · Shift sprint · Ctrl walk · Space jump · E enter/exit vehicle · V camera · R (hold) reset car · F4 HUD · mouse look (click to capture)';
  root.appendChild(hint);
  return {
    toggle() { visible = !visible; el.style.display = visible ? '' : 'none'; hint.style.display = visible ? '' : 'none'; },
    update(dt) {
      acc += dt; if (acc < 0.25 || !visible) return; acc = 0;
      const pp = game.playerPos();
      const reg = game.regionNow(), dis = game.districtNow();
      const near = world.nearestPoi(pp[0], pp[2]);
      const nd = near ? Math.hypot(near.pos[0] - pp[0], near.pos[2] - pp[2]) : 0;
      const v = game.activeVehicle();
      const speed = v ? v.sim.speed : game.char().speed;
      const c = getCounts();
      const f = (n, d = 1) => n.toFixed(d);
      const surf = game.char().surface || '';
      text.textContent =
        `LIFE · OPEN ECONOMY · Stage 2 blockout\n` +
        `pos ${f(pp[0])}, ${f(pp[1])}, ${f(pp[2])}   mode ${game.player.mode}${v ? ' (' + v.sim.archetype + ')' : ''}\n` +
        `region ${reg} · ${dis}   ${surf}\n` +
        `speed ${f(Math.abs(speed) * 3.6, 0)} km/h   time ${f(game.env.timeOfDay % 24, 1)} h  ${game.phase()}\n` +
        `nearest ${near ? near.id.replace('poi.', '') : '-'} (${f(nd, 0)} m)\n` +
        `fps ${f(perf.fps, 1)}  frame ${f(perf.frameMs.mean, 1)} ms (p95 ${f(perf.frameMs.p95, 1)}, max ${f(perf.frameMs.max, 0)})\n` +
        `draw ${perf.draw.calls}  tris ${(perf.draw.triangles / 1000).toFixed(0)}k  geo ${(perf.mem.geometryBytes / 1048576).toFixed(1)} MB  progs ${perf.counts.programs}\n` +
        `chunks near ${c.near} mid ${c.mid} queue ${c.pending}  entities ${game.entities.count}\n` +
        `${perf.renderer ? perf.renderer.slice(0, 64) : ''}`;
    },
  };
}
