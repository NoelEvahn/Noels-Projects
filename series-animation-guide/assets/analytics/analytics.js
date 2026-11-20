// Shared renderer for the per-episode analytics pages and the hub page. No dependencies, works from file://.
// Data comes from episode-N/analytics.data.js (window.EPISODES[N]), which sync_instagram.mjs keeps up to date.
(function () {
  const FIELDS = ["views","reach","likes","comments","reposts","shares","saves","follows","profileVisits","avgWatchSec","skipRatePct","totalInteractions","totalWatchSec","topSource"];
  // Rules of thumb from the first three Instagram posts only (see docs/HOOKS_AND_FORMATS.md). Hypotheses, not laws.
  const T = { skipGood: 25, skipBad: 40, completionGood: 0.45, completionBad: 0.25, reelsGood: 80, reelsBad: 50 };

  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  const nf = (n, d = 0) => n == null || isNaN(n) ? "–" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
  const pct = (n, d = 1) => n == null || !isFinite(n) ? "–" : nf(n * 100, d) + "%";
  const div = (a, b) => a == null || b == null || !b ? null : a / b;

  function ageOf(ep, s) {
    if (ep.postedAt && s.at) return (new Date(s.at) - new Date(ep.postedAt)) / 36e5;
    return s.ageHours;
  }
  // Newest value of each metric, carried forward from older snapshots when the newest one lacks it.
  function latest(ep) {
    const snaps = (ep.snapshots || []).slice().sort((a, b) => new Date(a.at) - new Date(b.at));
    const out = { snapshots: snaps, at: null, ageHours: null, sources: {} };
    for (const s of snaps) {
      out.at = s.at; out.ageHours = ageOf(ep, s);
      for (const f of FIELDS) if (s[f] != null) { out[f] = s[f]; out.sources[f] = s.source; }
    }
    const L = ep.lengthSec;
    out.viewsPerHour = div(out.views, out.ageHours);
    out.likeRate = div(out.likes, out.views);
    out.shareRate = div(out.shares, out.views);
    out.saveRate = div(out.saves, out.views);
    out.commentRate = div(out.comments, out.views);
    out.followsPer1k = out.follows != null && out.views ? out.follows / out.views * 1000 : null;
    out.completion = div(out.avgWatchSec, L);
    out.replayFactor = div(out.views, out.reach);
    out.reelsPct = (() => { const m = /Reels\s+([\d.]+)\s*%/i.exec(out.topSource || ""); return m ? parseFloat(m[1]) : null; })();
    out.verdict = {
      hook: out.skipRatePct == null ? "na" : out.skipRatePct <= T.skipGood ? "good" : out.skipRatePct <= T.skipBad ? "ok" : "bad",
      hold: out.completion == null ? "na" : out.completion >= T.completionGood ? "good" : out.completion >= T.completionBad ? "ok" : "bad",
      reach: out.reelsPct == null ? "na" : out.reelsPct >= T.reelsGood ? "good" : out.reelsPct >= T.reelsBad ? "ok" : "bad"
    };
    return out;
  }
  const pill = v => `<span class="pill ${v}">${{ good: "healthy", ok: "so-so", bad: "weak", na: "no data" }[v]}</span>`;

  function kpi(label, value, sub, cls) { return `<div class="kpi"><div class="l">${esc(label)}</div><div class="v ${cls || ""}">${value}</div><div class="s">${sub || "&nbsp;"}</div></div>`; }

  function chart(ep, L) {
    const pts = L.snapshots.map(s => ({ x: ageOf(ep, s), y: s.views })).filter(p => p.x != null && p.y != null);
    if (pts.length < 2) return `<p class="empty">One snapshot so far. Run the sync script on a schedule (or add snapshots by hand) to see how the views grow with the post's age.</p>`;
    const W = 640, H = 220, pad = 40, mx = Math.max(...pts.map(p => p.x)) || 1, my = Math.max(...pts.map(p => p.y)) || 1;
    const X = x => pad + (x / mx) * (W - pad - 10), Y = y => H - 28 - (y / my) * (H - 50);
    const path = pts.map((p, i) => (i ? "L" : "M") + X(p.x).toFixed(1) + " " + Y(p.y).toFixed(1)).join(" ");
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Views over time">
      <line x1="${pad}" y1="${H - 28}" x2="${W - 10}" y2="${H - 28}" stroke="currentColor" opacity=".2"/><line x1="${pad}" y1="12" x2="${pad}" y2="${H - 28}" stroke="currentColor" opacity=".2"/>
      <path d="${path}" fill="none" stroke="var(--bar)" stroke-width="2.5"/>
      ${pts.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.5" fill="var(--bar)"/>`).join("")}
      <text x="${pad}" y="${H - 8}">0 h</text><text x="${W - 40}" y="${H - 8}">${nf(mx, 0)} h</text><text x="4" y="22">${nf(my)}</text></svg>`;
  }

  function episodeHtml(ep, links) {
    const L = latest(ep), n = ep.episode;
    const hasApi = L.snapshots.some(s => s.source === "instagram-api");
    const mediaId = ep.instagram && ep.instagram.mediaId;
    const skipCls = L.verdict.hook === "na" ? "" : L.verdict.hook;
    const holdCls = L.verdict.hold === "na" ? "" : L.verdict.hold;
    const kpis = [
      kpi("Views", nf(L.views), L.viewsPerHour != null ? nf(L.viewsPerHour, 1) + " per hour (avg)" : "age unknown"),
      kpi("Viewers (reach)", nf(L.reach), L.replayFactor != null ? nf(L.replayFactor, 2) + " views per viewer" : ""),
      kpi("Skip rate", L.skipRatePct == null ? "–" : nf(L.skipRatePct, 1) + "%", "left in the first seconds", skipCls),
      kpi("Avg watch time", L.avgWatchSec == null ? "–" : nf(L.avgWatchSec, 1) + " s", L.completion != null ? pct(L.completion, 0) + " of " + ep.lengthSec + " s" : "", holdCls),
      kpi("Likes", nf(L.likes), L.likeRate != null ? pct(L.likeRate) + " of views" : ""),
      kpi("Shares", nf(L.shares), L.shareRate != null ? pct(L.shareRate) + " of views" : ""),
      kpi("Saves", nf(L.saves), L.saveRate != null ? pct(L.saveRate, 2) + " of views" : ""),
      kpi("Reposts", nf(L.reposts), ""),
      kpi("Comments", nf(L.comments), L.commentRate != null ? pct(L.commentRate, 2) + " of views" : ""),
      kpi("Follows", nf(L.follows), L.followsPer1k != null ? nf(L.followsPer1k, 2) + " per 1,000 views" : ""),
      kpi("Profile visits", nf(L.profileVisits), ""),
      kpi("Top source", esc(L.topSource || "–"), L.reelsPct != null ? "Reels " + nf(L.reelsPct, 1) + "%" : "")
    ].join("");
    const rows = L.snapshots.map(s => `<tr><td>${esc((s.at || "").slice(0, 16).replace("T", " "))}</td><td>${nf(ageOf(ep, s), 1)} h</td><td>${nf(s.views)}</td><td>${nf(s.reach)}</td><td>${nf(s.likes)}</td><td>${nf(s.shares)}</td><td>${nf(s.saves)}</td><td>${nf(s.avgWatchSec, 1)}</td><td>${s.skipRatePct == null ? "–" : nf(s.skipRatePct, 1) + "%"}</td><td>${esc(s.source)}</td></tr>`).join("");
    return `<main>
      <div class="nav">${links}</div>
      <h1>Episode ${n} · analytics</h1>
      <p class="sub">${esc(ep.title)}</p>
      <p><span class="badge">${esc(ep.format)} · ${ep.lengthSec} s</span>${hasApi ? '<span class="badge api">Instagram API</span>' : L.snapshots.length ? '<span class="badge manual">manual numbers</span>' : '<span class="badge">no data yet</span>'}${L.at ? '<span class="badge">last snapshot ' + esc(L.at.slice(0, 10)) + '</span>' : ""}${ep.instagram && ep.instagram.permalink ? ' <a href="' + esc(ep.instagram.permalink) + '">open post</a>' : ""}</p>
      <p><b>Hook format:</b> ${esc(ep.hook || "not set")}</p>
      <h2>Numbers</h2><div class="grid">${kpis}</div>
      <h2>Diagnosis (rules of thumb, see docs/HOOKS_AND_FORMATS.md)</h2>
      <div class="diag">
        <div class="card d"><b>Hook ${pill(L.verdict.hook)}</b>Skip rate ≤ ${T.skipGood}% healthy, over ${T.skipBad}% means the first seconds failed.</div>
        <div class="card d"><b>Hold ${pill(L.verdict.hold)}</b>Average watch time ≥ ${T.completionGood * 100}% of the length healthy, under ${T.completionBad * 100}% means the middle drifts.</div>
        <div class="card d"><b>Distribution ${pill(L.verdict.reach)}</b>Share of views from Reels ≥ ${T.reelsGood}% means the algorithm is pushing it to cold viewers; low means mostly your own followers.</div>
      </div>
      <h2>Views over time</h2><div class="card">${chart(ep, L)}</div>
      <h2>Snapshots</h2><div class="scroll"><table><thead><tr><th>Taken</th><th>Age</th><th>Views</th><th>Reach</th><th>Likes</th><th>Shares</th><th>Saves</th><th>Avg watch s</th><th>Skip</th><th>Source</th></tr></thead><tbody>${rows || '<tr><td colspan="10" class="empty">No snapshots yet.</td></tr>'}</tbody></table></div>
      <h2>Notes and lessons</h2><div class="card">${(ep.notes || []).length ? '<ul class="notes">' + ep.notes.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" : '<p class="empty">No notes yet.</p>'}</div>
      <h2>Connect Instagram</h2><div class="card">
        <p>Run from the series-animation-guide folder. Media id: <code>${esc(mediaId || "not set")}</code>. ${mediaId ? "" : "Set <code>instagram.mediaId</code> in <code>episode-" + n + "/analytics.data.js</code> (find it with <code>--list-media</code>)."}</p>
        <pre>node assets/analytics/sync_instagram.mjs --episode ${n}</pre>
        <p>The script reads the token from the environment (<code>IG_ACCESS_TOKEN</code>), never from this page, adds a snapshot here and keeps your hand-entered numbers. Skip rate, traffic source and the retention curve are not in the API: type them in from the Instagram app. Full setup: <code>docs/ANALYTICS.md</code>.</p></div>
    </main>`;
  }

  window.renderEpisodePage = function (n) {
    const ids = Object.keys(window.EPISODES || {});
    const ep = window.EPISODES[n != null ? n : ids[0]];
    document.title = "Episode " + ep.episode + " analytics";
    document.body.innerHTML = episodeHtml(ep, '<a href="../analytics/index.html">All episodes</a><a href="BRIEF.md">Brief</a>');
  };

  window.renderIndexPage = function () {
    const eps = Object.keys(window.EPISODES || {}).map(Number).sort((a, b) => a - b).map(k => window.EPISODES[k]);
    const rows = eps.map(ep => {
      const L = latest(ep);
      return `<tr><td><a href="../episode-${ep.episode}/analytics.html">Ep ${ep.episode}</a></td><td>${nf(L.views)}</td><td>${nf(L.viewsPerHour, 0)}</td><td>${L.skipRatePct == null ? "–" : nf(L.skipRatePct, 1) + "%"}</td><td>${L.avgWatchSec == null ? "–" : nf(L.avgWatchSec, 0) + " s"}</td><td>${pct(L.completion, 0)}</td><td>${pct(L.likeRate)}</td><td>${pct(L.shareRate)}</td><td>${nf(L.saves)}</td><td>${nf(L.follows)}</td><td>${pill(L.verdict.hook)}</td><td>${pill(L.verdict.hold)}</td><td>${pill(L.verdict.reach)}</td></tr>`;
    }).join("");
    const bar = (label, get, fmt) => {
      const vals = eps.map(ep => get(latest(ep))), mx = Math.max(...vals.filter(v => v != null), 0) || 1;
      return `<div class="card"><b>${label}</b>${eps.map((ep, i) => `<div style="display:flex;align-items:center;gap:8px;margin-top:6px"><span style="width:38px;font-size:12px;color:var(--mute)">Ep ${ep.episode}</span><div style="flex:1;background:var(--line);border-radius:4px;height:12px"><div style="width:${vals[i] == null ? 0 : vals[i] / mx * 100}%;height:12px;border-radius:4px;background:var(--bar)"></div></div><span style="width:70px;text-align:right;font-size:12px">${vals[i] == null ? "–" : fmt(vals[i])}</span></div>`).join("")}</div>`;
    };
    document.title = "Series analytics";
    document.body.innerHTML = `<main><div class="nav"><a href="../README.md">Series guide</a><a href="../docs/ANALYTICS.md">How this works</a></div>
      <h1>Series analytics</h1><p class="sub">Every episode on one page. Open an episode for its full numbers, snapshots and notes.</p>
      <div class="scroll"><table><thead><tr><th>Episode</th><th>Views</th><th>Views/hr</th><th>Skip</th><th>Avg watch</th><th>Watched</th><th>Likes</th><th>Shares</th><th>Saves</th><th>Follows</th><th>Hook</th><th>Hold</th><th>Reach</th></tr></thead><tbody>${rows}</tbody></table></div>
      <h2>Compare</h2><div class="diag">${bar("Skip rate (lower is better)", L => L.skipRatePct, v => nf(v, 1) + "%")}${bar("Watched (avg watch / length)", L => L.completion, v => pct(v, 0))}${bar("Views per hour", L => L.viewsPerHour, v => nf(v, 0))}${bar("Share rate", L => L.shareRate, v => pct(v))}</div>
      <h2>Hooks used</h2><div class="card"><ul class="notes">${eps.map(ep => `<li><b>Ep ${ep.episode}</b>: ${esc(ep.hook || "not set")}</li>`).join("")}</ul></div></main>`;
  };
  window.ANALYTICS_LATEST = latest;
})();
