# Episode 3 handoff (session moved to a local Opus 5.5 high session)

Everything is on `main` of the GitHub repository. Work directly on `main` (repo `CLAUDE.md`): only content for `series-animation-guide/` may be added; never name anything after the repository.

## State
* **Asset library** done and committed: `../assets/library/` (read `INDEX.md` first, then `cat/CAT_BIBLE.md`). Characters with fingered hands, 3D hair, Gerald the cat, props, sets, FX, screenshots in `screenshots/` (contact sheets in `screenshots/sheets/`).
* **Master prompt v3** updated (library-first step, Gerald rules, CAT GAG slot, and a new **Pacing** section after the user rejected v1).
* **Episode 3 v1** (`episode-3.mp4`) was delivered and **rejected by the user**: "way too fast, confusing, text overlapped, glitching backgrounds, the theatre seats had no proper seating". Cause: I followed the old "110+ shots, 0.75 s average" rule. The target is **2–3 s per shot, ~30–45 shots** (episodes 1–2 pace).
* A v2 render was started (HUD stacking fix, caption band, hearts clear of the counter, pitch calibration) and **stopped by the user's request**; it is not finished and not committed as a video. `episode-3.mp4` in the repo is v1b (audio silence window fixed).

## What to keep
* `src/timeline.js` (counter maths, tags, narration, roasts, voiced moments), `src/hud.js` (HUD, captions), `src/main.js`, `src/common.js`, `tools/` (parallel deterministic renderer, quick sheets, encode, QA), `audio/` (voice variants at 1.10/1.15 with pyin check, Piper narration with ASR word timings, procedural SFX, music edit, ducked mix; measured −14.1 LUFS, −2.0 dBTP after AAC, silence window −50.9 dB, beat grid p95 10 ms).
* Audio facts: music 145.995 BPM → ×1.02743 → 150 BPM, first downbeat 3.030 s of the stretched track (ambiguous; chosen by low-band accent), excerpt 3.030–93.030 s.
* Narration + roast lines and the 14 voiced moments are in `src/timeline.js`; the speech timeline was checked for overlaps.

## What to redo (the real work)
1. **Re-plan the shot lists at 2–3 s per shot** in `src/scenes/s1..s7.js` (each has a `S.shots = [shot(t0,t1,camA,camB), …]` list; `pick()` chooses the active shot). Merge neighbouring shots, hold each gag, slow the camera moves. Keep cuts on the 0.4 s grid and keep the timeline.js narration/voice times (or shift them with the audio scripts).
2. **Rebuild the theatre set** (`../assets/library/sets/theatre.js` + `props/stage.js audience()`): the seats and audience read badly (rows rise away, people not clearly seated, faceless heads from the stage side). Needs real tiered seating with visible people sitting on seats, facing the stage, aisles and a coherent stage. The user specifically called this out.
3. **Look for glitches** at full res: flickering/z-fighting (houses' roofs, boards over walls), clipped props, pop-in, bare instanced crowds. Check every shot start/end still.
4. **Text overlaps**: captions are now in the bottom band (y 1500 story/voice, 1575 roasts); verify no two captions or caption+board overlap, and faces clear the HUD band.
5. Re-run audio only if the timeline changes: `audio/make_voices.py`, `make_narration.py`, `make_audio.py` (needs `build/music_stretch.json` + `build/audio/music_stretched.wav` from the stretch step in `audio/music_stretch.py`; Piper voice `en_US-ryan-high` is downloaded from Hugging Face; faster-whisper tiny.en for word timings).

## Environment (not in the repo)
`npm i three@0.170.0 @fontsource/anton` in a workspace dir → `LIB_DEPS=<that dir>`; global Playwright Chromium; Python venv with `numpy scipy soundfile librosa pyloudnorm piper-tts faster-whisper pillow`; `EP_BUILD=<build dir>`; `NODE_PATH=$(npm root -g)`. Render: `node tools/render.mjs --from 0 --to 2699 --scale 0.5 --workers 4 --out $EP_BUILD/f05` (≈12 min at 0.5 scale, ≈22 min at full res on 4 cores), contact sheets with `tools/sheet.py`, encode with `tools/encode.sh`, QA with `tools/qa.py`.

## Roles in this session
The user asked for "two people only": the orchestrator built everything and an Opus 5.5 advisor reviewed (no subagents). The master prompt still describes a Sonnet executor + Opus advisor subagent for a normal run.

## Open questions / unverified
Tag figures (≈8.3B population, ≈117B people ever lived) were not web-checked. Nobody could listen to the audio. The bakery, office facade, marching band and `makeLovers` were built inside the scene files, not in the library.

## Update (local session, VideoHub)
* **VideoHub:** the whole `series-animation-guide/` folder is one VideoHub project (VideoHub refuses files outside a project, so the library must be inside it). Page `episode-3/index.html` (three.js + Anton copied into `episode-3/vendor/`, gitignored; imports are relative), `window.renderOut(t)` draws synchronously, `render.js` at the series root renders 2 s chunks (`PAGE=episode-N/index.html` for later episodes). Review in VideoHub's live preview, render through its queue.
* **Pacing:** `regroup()` in `src/common.js` merges the old 133 cuts into 47 (about 2 s each); each held shot reuses the camera of the gag or voiced line it covers. Cut lists sit right after each scene's `S.shots`.
* **Theatre rebuilt** (raked rows, aisles, seated audience facing the stage). Skyline and plazas remodelled with geometry. **Rule: never add textures.**
* Audio not rebuilt yet: the preview plays v1's soundtrack (timeline unchanged, so it still lines up).
