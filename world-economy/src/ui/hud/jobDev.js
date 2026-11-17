// Dev economy HUD (Stage 4 placeholder, F5): cash, bank, net worth, needs, clock and the live job HUD. Final UI is Stage 5; this only reads Sim.select.
export function createJobDevHud({ root, sim, game }) {
  const el = document.createElement('pre');
  el.id = 'jobdev';
  el.style.cssText = 'position:fixed;right:8px;top:8px;margin:0;padding:6px 8px;background:rgba(0,0,0,.55);color:#e8f1ff;font:11px/1.35 monospace;max-width:300px;white-space:pre-wrap;z-index:9;pointer-events:none';
  root.appendChild(el);
  let acc = 0, visible = true;
  const $ = (c) => '$' + (c / 100).toFixed(2);
  return {
    toggle() { visible = !visible; el.style.display = visible ? '' : 'none'; },
    update(dt) {
      acc += dt; if (acc < 0.25 || !visible) return; acc = 0;
      const s = sim.select('player.summary'), h = game.jobs && game.jobs.hud ? game.jobs.hud() : null;
      let t = `Day ${s.day} ${s.weekday} ${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}\ncash ${$(s.cash)}  bank ${$(s.checking)}  savings ${$(s.savings)}\nnet worth ${$(s.netWorth)}\nenergy ${s.energy}  hunger ${s.hunger}`;
      if (h) t += `\n--- ${h.title} ---\n${h.objective}\ntimer ${h.timerSec.toFixed(0)}s  tasks ${h.shift.tasks}  earned ${$(h.shift.earned)}`;
      el.textContent = t;
    },
  };
}
