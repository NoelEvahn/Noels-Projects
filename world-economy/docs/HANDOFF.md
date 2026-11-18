# HANDOFF — PROJECT: LIFE (OPEN ECONOMY)

Written 2026-11-18 at the end of the first orchestration session. All work is committed and pushed to `main` (no branches, no worktrees: repo rule in `/CLAUDE.md`). No agents are running.

## 1. How to start the new session (user)

1. Open a new Claude Code session on this repo (branch `main`).
2. Set the main session to **Sonnet 5.5, effort High** (this is the orchestrator/reviewer role; it delegates, it does not write the big code).
3. Paste this as the first message:
   > Read `world-economy/docs/HANDOFF.md` and `/CLAUDE.md`, then continue the project from section 4. Start with step 4.1 and 4.2 in parallel. Show me screenshots whenever you review renders.
4. Do not stop tool calls while agents run (an interruption kills the running background agent). If a 5-hour usage limit hits, agents stop; the orchestrator resumes them after the reset.

## 2. Project in one paragraph

A single-file playable open-world economic life sim ("start with $100, grow to a business empire"), three.js 0.180 / WebGL2, 100% procedural geometry, textures and audio (no downloaded assets, no GLB), esbuild bundle, 4 regions (City, Lake District, Ocean, Forest), 17 jobs, 12 business types, one ledger. Deliverables: `dist/life.html` (single file) and `dist/artifact/` (multi-file) published as a Claude Artifact. `dist/` is git-ignored: rebuild with `cd world-economy && npm install && npm run build`. The Artifact has NOT been published yet.

## 3. Status

| Stage | Model | State |
|---|---|---|
| S1 Master spec (`docs/MASTER_SPEC.md`, `docs/spec/A-G`) | Fable 5.2 High | Done, approved |
| S2 World blockout, harness, tests | Sonnet | Done (`a1e8d26`) |
| S3A Audio + quality presets + governor + perf HUD | Opus | Done (`f470631`) |
| S3B Visual production (210 archetypes, textures, lighting, water, vegetation) | Opus | Done (`3ad1dff`) |
| Visual fix round 1 (light, water, terrain, trees, ambient cars/people/birds) | Sonnet | Done |
| Detail Batch 1 and 2 (about 70 of the 200 items in `docs/DETAIL_CATALOG.md`) | Sonnet | Done, pushed |
| Terrain relief + ground shading depth | Sonnet | Done (`f9cc94c`) |
| S4 Gameplay and economy (ledger, bank, market, 17 jobs, 12 businesses, property, vehicles, save/load, bots) | Sonnet | Done |
| S4b Balance, customer AI, staffAssist, deliver/tow, tutorial data, midnight spread | Sonnet | Done |
| **S5 UI (HUD, phone, menus, shops, tutorial UI)** | Opus | **NOT STARTED** |
| S6 Polish | Sonnet | Not started |
| S7 QA (Sonnet reviews, Opus fixes, max 2 rounds) | Sonnet + Opus | Not started |
| Real-GPU perf check, final build, publish Artifact | user + orchestrator | Not started |

Verified at handoff: `npm test` 184 pass / 0 fail; `npm run build` ok (`dist/life.html` about 1.4 MB). Economy milestones (bots, seed 7) are inside the Annex D targets (see `docs/PROJECT_RECORD.md`, Stage 4b table).

## 4. What to do next (in order)

### 4.1 Stage 5 — UI (the game is not playable by a person without it)
- **Agent:** Opus 5.5, effort High. Fresh agent, background.
- **Task:** build all DOM/CSS UI per `docs/spec/F-ui.md` and MASTER_SPEC sections 5, 9.5: HUD (money, needs, time/weather, minimap/map, interaction prompts), phone (bank, jobs, market, businesses, property, vehicles, stats, settings), job and business screens, shop/property/construction/vehicle purchase flows, tutorial coach marks (the selectors and phone app ids are named in `src/data/tutorial.js`), pause/settings (quality presets, audio buses), save/load/export-code UI, tablet layout and basic touch. Read only through `Sim.select` and the EventBus; never write money outside `Sim.cmd`. Files: `src/ui/**` plus minimal hooks in `src/main.js`. Dev HUD (F5, `#jobdev`) and perf HUD (F3) exist already.
- **Done when:** a person can play from $100 to a first business with mouse/keyboard only, `npm test` and e2e smoke green, screenshots of every screen reviewed.

### 4.2 Cleanup pass (parallel with 4.1, disjoint files)
- **Agent:** Sonnet 5.5, effort High. Own paths: `src/render/**`, `src/art/**`, `test/perf`, `test/screenshots`. Do not touch `src/ui/**`.
- **Tasks:**
  1. Far-mountain horizontal banding (visible in `test/screenshots/terrain1/T6_0800.png` and earlier V08): find the cause (sky/fog/far proxy/mountain material), fix, re-shoot.
  2. Boat at harbor viewpoint V10 still reads as floating: fix hull height/waterline.
  3. Rebase `test/perf/baseline.json` (`perf.spec` baseline x1.10 currently fails after Detail Batch 2) and re-run `npm run test:perf` on an otherwise idle container; fix the 28 slice overruns (worst 11.7 ms in `terrainArrays`) and one High cpuMs reading (6.2 ms vs 5 ms).
  4. Forest floor too dark under canopy; parked cars boxy at close range.
  5. Re-run `npm run test:audio` (not re-run since Stage 3B) and e2e smoke.
- **Rule:** commit only your own paths (`git add <paths>`), never `git add -A`; push to `main`.

### 4.3 Detail Batch 3 (optional visual pass, Sonnet High)
Items not yet built from `docs/DETAIL_CATALOG.md`: mooring lines, satellite dishes, shutters, balconies, cats, pigeon flocks, anglers, wet-surface sheen, plus the Top-25 leftovers. User feedback so far: renders still read "stylized / low-poly"; wants a lived-in, detailed world. Always show new screenshots to the user.

### 4.4 Stage 6 polish (Sonnet High), then Stage 7 QA (Sonnet reviews, Opus 5.5 High fixes, max 2 rounds)
Polish list: remaining reduced job mechanics (list in PROJECT_RECORD, Stage 4b), customer queues/sitting and staff NPCs behind counters, tablet/touch pass, audio mix check, memory/load time. QA: use the acceptance lists in MASTER_SPEC 9.7 and Annex G.

### 4.5 Release
1. User runs one build on a real GPU (`dist/life.html`), reports fps and any visual problems (software GL in this container cannot measure fps).
2. Build `npm run build`; publish `dist/artifact/` (multi-file) as a Claude Artifact with the Artifact tool (the artifact tools were intermittently available in the last session; load the artifact guide first).

## 5. Rules the orchestrator must keep

- Orchestrator = Sonnet 5.5 High: delegates, reviews, reports honestly, never claims unverified work, asks before major direction changes.
- Git: work and push directly on `main`; never create branches or worktrees; do not name anything after the repository's name; only add project content in `world-economy/` (plus the series-animation-guide, which is unrelated). Tag pushes are blocked by the proxy (403), so checkpoints are commit hashes in `docs/PROJECT_RECORD.md`.
- When parallel agents share the checkout: disjoint folders, commit only own paths, `git fetch origin main && git merge --no-edit FETCH_HEAD` on a rejected push. Stop-hook commits of other agents' unsaved edits are interim snapshots.
- After any render/visual/animation work: review screenshots with a Sonnet 5.5 High agent (or yourself if you are Sonnet 5.5) and send the best screenshots to the user.
- Keep user-visible replies short and structured; tables over paragraphs.

## 6. Known limits and open items

- No fps measurement possible here (headless Chromium = software GL, 30-90 s per screenshot); budgets are counter-based (Annex G). Low preset has about 80 draw calls / 65k triangles of headroom; Ultra V16 is at 1.46M of 2M triangles.
- Visual quality is stylized-realistic, not Unreal-class: vehicles/boats/characters are 1-2.5k triangles; trees visibly low-poly up close; no planar reflections or SSR.
- Audio verified by signal analysis only (nobody has listened).
- Known Stage 2 issues: no swimming, boat-dock collision, tree colliders, aerial views over draw-call budget.
- 13 of 17 jobs use generic mechanics (honest list in PROJECT_RECORD).
- The remote branch `claude/blissful-sagan-uiqlcy` still exists on GitHub from the first session; ask the user whether to delete it (it was never used for work).
- A commit titled "Set master prompt roles: Opus 5.5 medium advisor, Sonnet 5.5 high executor" (series-animation-guide) came from a different session; unrelated, untouched.

## 7. Where things are

- Spec: `docs/MASTER_SPEC.md`, `docs/spec/A-art-rendering.md` ... `G-quality-perf-testing.md`
- Records: `docs/PROJECT_RECORD.md` (stage reports, balance), `docs/DECISIONS.md` (all decisions and contract notes), `docs/PERF_REPORT.md`, `docs/DETAIL_CATALOG.md`
- Code: `src/{core,data,sim,world,game}` pure JS and Node-testable; `src/{render,art,audio,ui}` presentation; `src/qa/harness.js` exposes `window.__LOE`
- Tests: `npm test` (unit/sim), `npm run test:e2e`, `npm run test:perf`, `npm run test:audio`, `npm run shots`
- Screenshots: `test/screenshots/{fix1,detail1,detail2,terrain1}` and the baseline V01-V16 sets
