# ANALYTICS — one page per episode, filled from Instagram

Part of the master prompt (`../MASTER_PROMPT.md`). Every episode, in every format, gets its own analytics page. The pages are plain HTML with no server and no libraries: open `episode-N/analytics.html` or the hub `analytics/index.html` in a browser (works from a file).

## What exists
| Path | What |
|---|---|
| `analytics/index.html` | Hub: all episodes in one table, bar comparisons, the hook used per episode |
| `episode-N/analytics.html` | The page for one episode: numbers, diagnosis (hook / hold / distribution), views over time, snapshots, notes, the connect panel |
| `episode-N/analytics.data.js` | The data for that episode (header fields, `snapshots`, `notes`). Hand-edited and rewritten by the sync script |
| `assets/analytics/analytics.js`, `analytics.css` | The shared renderer and style |
| `assets/analytics/sync_instagram.mjs` | The Instagram sync script (Node 18+, no dependencies) |
| `assets/analytics/template.data.js`, `episode.template.html` | Templates for a new episode |
| `assets/analytics/.env.example` | The settings the script reads (copy to `.env`, which is git-ignored) |

Episodes 1–3 already hold the numbers typed in on 2026-11-20 (`source: "manual"`). Episode 4 and 5 are empty until posted.

## New episode checklist
1. Copy `assets/analytics/template.data.js` to `episode-N/analytics.data.js`; set `episode` (in both places), `title`, `format`, `lengthSec`, `hook` (the hook format from `HOOKS_AND_FORMATS.md`) and leave `snapshots` empty.
2. Copy `assets/analytics/episode.template.html` to `episode-N/analytics.html`.
3. Add `<script src="../episode-N/analytics.data.js"></script>` to `analytics/index.html`.
4. After posting: set `instagram.mediaId` (see below), run the sync, and read the page.

## Connecting the Instagram API
The script talks to Meta's Instagram Graph API. Setup (do this once; check each step against Meta's current documentation, which changes often):
1. An Instagram **professional** account (Business or Creator).
2. A Meta developer app with the Instagram product and a token that has the insights permission (`instagram_manage_insights`, plus `instagram_basic`; the Instagram-Login variant names them `instagram_business_basic` and `instagram_business_manage_insights`). Use a long-lived token and refresh it before it expires (about 60 days).
3. Put the token in `assets/analytics/.env` as `IG_ACCESS_TOKEN=...` (never in the page or in git). Put the account id in `IG_USER_ID`. For Instagram-Login tokens also set `IG_API_BASE=https://graph.instagram.com`. Set `IG_API_VERSION` to the current version.
4. Find each post's media id: `node assets/analytics/sync_instagram.mjs --list-media` and copy the id into `instagram.mediaId` of the episode's data file.
5. Sync: `node assets/analytics/sync_instagram.mjs --episode 2`, or `--all`. Add `--dry-run` to print without saving.

What the script does: for each media id it requests the insight metrics one at a time (a metric the API rejects is skipped with a warning), converts the watch times from milliseconds to seconds, sets `postedAt` and the permalink, computes the age, and appends one snapshot with `source: "instagram-api"`. The token is read only from the environment and is never printed or saved. Tested against a local mock of the API; **not yet tested against the live API**, so the first real run may need the metric names or the version adjusted (see the list at the top of the script).

### What the API gives and what it does not
| Page field | From the API | Note |
|---|---|---|
| views, reach, likes, comments, shares, saves, total interactions, follows, profile visits | yes (metric names in the script) | Verify availability per media type; the script skips what is rejected |
| reposts | tried; may be unsupported | If it is rejected, type it in by hand |
| average watch time, total watch time | yes (`ig_reels_avg_watch_time`, `ig_reels_video_view_total_time`) | Verify the unit on a live response (milliseconds expected) |
| **skip rate**, **traffic source split** (Reels / Stories / profile…), retention curve | **not found in the media-insights reference** | Type them in from the Instagram app into the latest snapshot or a new manual snapshot. The page carries the newest value of each field forward from older snapshots |
Reference: Meta's "Instagram Media Insights" (developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights).

## Reading an episode page
The three diagnosis boxes use rules of thumb taken from episodes 1–3 only (hypotheses, see `HOOKS_AND_FORMATS.md`):
- **Hook:** skip rate ≤ 25 % healthy, over 40 % failed. A failed hook means fixing frame 0 and the first second.
- **Hold:** average watch time ≥ 45 % of the video length healthy, under 25 % means the middle drifts (length, reading load, flat escalation).
- **Distribution:** share of views from Reels ≥ 80 % means the algorithm is pushing it; a low share means mostly followers.
Snapshots to take after posting: 1 h, 6 h, 24 h, 48 h and 7 days, so the chart shows how the views grow. After the 24 h snapshot write two or three lines into `notes` (what the numbers say, what to change next episode) and, if a rule changes, update `HOOKS_AND_FORMATS.md`.
