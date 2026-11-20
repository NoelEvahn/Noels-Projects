#!/usr/bin/env node
// Pulls Instagram insights for the episodes into episode-N/analytics.data.js (adds one snapshot per run).
//
//   node assets/analytics/sync_instagram.mjs --list-media          list recent posts (to find each episode's media id)
//   node assets/analytics/sync_instagram.mjs --episode 2           sync one episode
//   node assets/analytics/sync_instagram.mjs --all                 sync every episode that has instagram.mediaId set
//   add --dry-run to print the snapshot without writing a file
//
// Environment (or a file assets/analytics/.env with KEY=value lines; it is git-ignored):
//   IG_ACCESS_TOKEN   required. A long-lived token with the instagram_basic and instagram_manage_insights permissions.
//   IG_USER_ID        only for --list-media (the Instagram professional account id).
//   IG_API_BASE       default https://graph.facebook.com  (use https://graph.instagram.com for Instagram Login tokens)
//   IG_API_VERSION    default v23.0  (check the current version in Meta's docs)
// The token is read only from the environment and is never written to any file or printed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

// --- config -----------------------------------------------------------------
const envFile = path.join(here, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const args = process.argv.slice(2);
const flag = n => args.includes("--" + n);
const opt = n => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : undefined; };
const BASE = (opt("base") || process.env.IG_API_BASE || "https://graph.facebook.com").replace(/\/$/, "");
const VER = process.env.IG_API_VERSION || "v23.0";
const TOKEN = process.env.IG_ACCESS_TOKEN;

// Insight metric -> snapshot field. Requested one by one, so a metric the API rejects (wrong media type, not available
// yet, renamed) is skipped with a warning instead of failing the whole sync. Check names against Meta's
// "Instagram Media Insights" reference; skip rate, traffic source and the retention curve are NOT in the API.
const METRICS = {
  views: "views", reach: "reach", likes: "likes", comments: "comments", shares: "shares", saved: "saves",
  reposts: "reposts", total_interactions: "totalInteractions", follows: "follows", profile_visits: "profileVisits",
  ig_reels_avg_watch_time: "avgWatchSec", ig_reels_video_view_total_time: "totalWatchSec"
};
const MS_TO_SEC = new Set(["avgWatchSec", "totalWatchSec"]); // watch-time metrics: verify the unit on a live response (milliseconds expected)

// --- helpers ----------------------------------------------------------------
async function api(p, params = {}) {
  const url = new URL(`${BASE}/${VER}/${p}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", TOKEN);
  const res = await fetch(url);
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  if (!res.ok || (body && body.error)) {
    const msg = body && body.error ? `${body.error.message} (code ${body.error.code})` : `HTTP ${res.status}`;
    throw new Error(msg.replace(TOKEN, "[token]"));
  }
  return body;
}
const insightValue = body => {
  const d = body && body.data && body.data[0];
  if (!d) return null;
  if (d.total_value && d.total_value.value != null) return d.total_value.value;
  if (d.values && d.values[0] && d.values[0].value != null) return d.values[0].value;
  return null;
};
function loadEpisode(n) {
  const file = path.join(root, `episode-${n}`, "analytics.data.js");
  if (!fs.existsSync(file)) throw new Error(`missing ${path.relative(root, file)}`);
  const text = fs.readFileSync(file, "utf8");
  const m = /^([\s\S]*?window\.EPISODES\[\d+\]\s*=\s*)([\s\S]*?);\s*$/.exec(text);
  if (!m) throw new Error(`cannot parse ${file}`);
  return { file, prefix: m[1], data: JSON.parse(m[2]) };
}
function saveEpisode({ file, prefix, data }) { fs.writeFileSync(file, `${prefix}${JSON.stringify(data, null, 2)};\n`); }

async function syncEpisode(n) {
  const ep = loadEpisode(n);
  const id = ep.data.instagram && ep.data.instagram.mediaId;
  if (!id) { console.log(`ep${n}: no instagram.mediaId set, skipped`); return; }
  const snap = { at: new Date().toISOString(), source: "instagram-api", ageHours: null };
  const warnings = [];
  try {
    const info = await api(id, { fields: "timestamp,permalink,like_count,comments_count" });
    if (info.timestamp && !ep.data.postedAt) ep.data.postedAt = new Date(info.timestamp).toISOString();
    if (info.permalink) ep.data.instagram.permalink = info.permalink;
    if (info.like_count != null) snap.likes = info.like_count;
    if (info.comments_count != null) snap.comments = info.comments_count;
  } catch (e) { warnings.push(`media info: ${e.message}`); }
  for (const [metric, field] of Object.entries(METRICS)) {
    try {
      const v = insightValue(await api(`${id}/insights`, { metric }));
      if (v != null) snap[field] = MS_TO_SEC.has(field) ? Math.round(v / 10) / 100 : v;
    } catch (e) { warnings.push(`${metric}: ${e.message}`); }
  }
  if (ep.data.postedAt) snap.ageHours = Math.round((Date.parse(snap.at) - Date.parse(ep.data.postedAt)) / 36e3) / 100;
  console.log(`ep${n}:`, JSON.stringify(snap));
  warnings.forEach(w => console.warn(`  warning: ${w}`));
  const got = Object.values(METRICS).filter(f => snap[f] != null).length;
  if (!got) { console.error(`ep${n}: no metric came back, nothing saved (check the token, its permissions and the media id)`); process.exitCode = 1; return; }
  if (!flag("dry-run")) { ep.data.snapshots.push(snap); saveEpisode(ep); console.log(`  saved episode-${n}/analytics.data.js`); }
}

// --- main -------------------------------------------------------------------
if (!TOKEN) { console.error("Set IG_ACCESS_TOKEN (environment or assets/analytics/.env). See docs/ANALYTICS.md."); process.exit(1); }
try {
  if (flag("list-media")) {
    const uid = process.env.IG_USER_ID;
    if (!uid) throw new Error("--list-media needs IG_USER_ID");
    const r = await api(`${uid}/media`, { fields: "id,timestamp,media_product_type,permalink,caption", limit: "50" });
    for (const m of r.data) console.log(`${m.id}\t${(m.timestamp || "").slice(0, 10)}\t${m.media_product_type || ""}\t${(m.caption || "").replace(/\s+/g, " ").slice(0, 60)}\t${m.permalink}`);
  } else if (flag("all")) {
    const nums = fs.readdirSync(root).map(d => /^episode-(\d+)$/.exec(d)).filter(Boolean).map(m => +m[1]).sort((a, b) => a - b);
    for (const n of nums) await syncEpisode(n).catch(e => console.error(`ep${n}: ${e.message}`));
  } else if (opt("episode")) {
    await syncEpisode(+opt("episode"));
  } else {
    console.log("Usage: --list-media | --episode N | --all   [--dry-run] [--base URL]");
  }
} catch (e) { console.error("error:", e.message); process.exit(1); }
