# Episode 5 handoff — build the whole episode (for a fresh Opus 5.5 session)

You are starting cold. This file tells you what is decided, what to read and in which order, how to set up, how to build, and how to check your work. **Everything creative is already decided in `BRIEF.md`; your job is to build it, verify it, and report honestly.** Do not re-plan the idea.

## 0. Ground rules (read first, they override your defaults)
1. **Repository rules** (`../../CLAUDE.md`): work **directly on `main`**, commit there, `git push origin main`. Never create branches or worktrees. Only add content for `series-animation-guide/` (the library, episode folders, docs, analytics). **Never name anything after the repository** (files, folders, variables, packages, sessions). Pull first: `git pull origin main`.
2. **One model does everything:** build, render and review it yourself. **No subagents, no advisors, no second model** (master prompt v5 step 4; it replaces the old "planner/reviewer" setups, so ignore any default model-orchestration habit here). Review your own work in a separate pass.
3. **Never add textures** (user rule). Detail comes from modelled geometry, colour and light. Canvas only for readable text on signs/boards/screens.
4. **You cannot listen to audio or watch video.** Substitute measurements (envelopes, onsets, LUFS, pyin f0, ASR) and look at rendered frames (contact sheets and full-resolution stills) with the image-reading tool. Say plainly in the report that nobody listened.
5. Keep a working end-to-end build at all times. A complete, coherent film beats a half-polished one.
6. Make reasonable technical decisions yourself. Ask the user only if something important is missing. Do not re-litigate decisions already made (§2).
7. Big files: `episode-5.mp4` must be under GitHub's 100 MB (re-encode if needed, as ep3 did: 83 MB). Also deliver a 720p copy under 30 MB for the phone.

## 1. Read, in this order
| # | File | Why |
|---|---|---|
| 1 | `../MASTER_PROMPT.md` (v5) | Slots, workflow, formats, the doc map |
| 2 | **`BRIEF.md` (this folder)** | The full episode: slots, clocks, counter table, script, 40-shot list, the dunk in frame-level detail, build list, risks. **This is the spec.** |
| 3 | `../docs/LOOK_AND_VIDEO.md` | Look, pacing (2–3 s shots), layout/text rules, counter rules, **defect checklist**, delivery checks |
| 4 | `../docs/HOOKS_AND_FORMATS.md` | The hook (H1 + H4), retention lessons, hook checklist |
| 5 | `../docs/AUDIO_AND_CAST.md` | "La peace" rules (OK hand + mewing face), Gerald rules, narrator, music, mix levels |
| 6 | `../assets/library/INDEX.md` then `../assets/library/cat/CAT_BIBLE.md` | What already exists (characters, Gerald, sets, props, FX, APIs). **Import before you build.** |
| 7 | `../docs/ANALYTICS.md` | You only update `analytics.data.js` header fields; the page already exists |
| 8 | `../episode-3/HANDOFF.md`, `../episode-3/src/*`, `../episode-3/audio/*`, `../episode-3/tools/*` | The proven 90–100 s pipeline to copy (deterministic renderer, HUD, timeline, audio build, QA) |
| 9 | `../episode-4/src/main.js` | The **EDL pattern** (film time → story time) for the hook, flash-forward and rewind |
| 10 | `../episode-1/BRIEF.md`, `../episode-2/BRIEF.md`, the three `episode-N.mp4` | Look and pacing targets (ep1–2 look) |

## 2. Decisions that are FROZEN (the user approved them)
- Premise: *"What if every 2 seconds, you jumped 5× higher?"* DOUBLING format, ×5 multiplier, counter = jump height from 1 m, exact BigInt metres, tags per `BRIEF.md` §3.
- Catchphrase **"la peace"** (not bomboclat), 14 lines per the brief's table, OK hand + mewing face, one radio exception (Voyager 1).
- Hook **H1** (flash-forward of the dunk + 0.4 s rewind) + **H4** loop. Film clock = story clock + 1.6 s. Film 96.8 s = **2904 frames**, story 95.2 s.
- Gerald is already there at every stop; 7 roasts; chip `GERALD · IMPRESSED: NO`; the last gag is him pushing the universe off the table.
- The ending: leaving the universe, silhouette hero, universe-ball spun on his finger, dribble and steps, **the dunk (BRIEF §6)**, dive back home through the roof hole, "la peace." at 88.0, title card, outro, loop.
- The **silhouette** (pure black body, dim glowing yellow headband, rim light from the ball) in shots 29–34 is a deliberate, user-requested exception to the "never backlit into a silhouette" rule.
- Music: Charlie's Inferno 146.0 → 150 BPM, ×1.02743, first downbeat 3.030 s in the stretched track (ambiguous, chosen by low-band accent in ep3; re-verify), excerpt 3.030 s for 96.8 s. Narrator: Piper `en_US-ryan-high`, natural speed.
- Pacing: 2–3 s per shot, 40 shots, cuts on the 0.4 s grid (the brief's list already respects this; the montage in shot 28 and the hook are the only short ones).
If something in the brief turns out to be impossible, make the smallest change that keeps the idea, and list it as a deviation in the report.

## 3. Environment
- Deps live **outside the repo**: in a workspace dir run `npm i three@0.170.0 @fontsource/anton`; set `LIB_DEPS=<that dir>`. Python venv outside the repo: `numpy scipy soundfile librosa pyloudnorm piper-tts faster-whisper pillow`. Global Playwright Chromium (`NODE_PATH=$(npm root -g)`); in the cloud image do not run `playwright install`. ffmpeg with rubberband, loudnorm, sidechain, ass.
- Piper voice `en_US-ryan-high` downloads from Hugging Face (see `episode-3/audio/make_narration.py`). faster-whisper `tiny.en` gives the word timings and the caption ASR check.
- **VideoHub** (local sessions): the whole `series-animation-guide/` folder is one VideoHub project. Page `episode-5/index.html`; `window.renderOut(t)` draws synchronously; `../render.js` renders 2 s chunks (`PAGE=episode-5/index.html`); review in the live preview, render through `hub_render`. Set `render.env.CHROME` to the Chrome path if headless Edge fails. Set `DUR` (96.8) and `FRAMES` (2904) in `src/timeline.js` **and** `.videohub/project.json` (`render.env.DUR`, `live.dur`).
- Cloud/other sessions: use `episode-3/tools/render.mjs` (parallel deterministic chunks, `--from/--to/--scale/--workers`), `tools/sheet.py` (contact sheets), `tools/encode.sh`, `tools/qa.py`. SwiftShader costs about 0.4 s per 1080×1920 frame (~20–25 min for 2904 frames on 4 cores).
- `episode-5/.gitignore`: copy `../episode-4/.gitignore` (vendor/, build/, render/, snaps/, node_modules/, audio/mix.wav).

## 4. Architecture to copy
Start by copying `../episode-3/` (index.html, src/, audio/, tools/) into `episode-5/` and adapting. Expected shape:
```
episode-5/
  index.html                 canvas 1080x1920, import map for three (vendor/ gitignored), Anton font
  src/timeline.js            single source of truth: FPS=30, FILM_DUR=96.8, FRAMES=2904, STORY_DUR=95.2, HOOK=1.6, EDL,
                             exp5(t), heightBig(t) BigInt metres, shown(t) {value, unit}, TAGS, NARRATION, ROASTS, VOICES, BEATS
  src/main.js                window.renderOut(t); EDL maps film t -> story t (hook, rewind, story); pure function of the frame index
  src/hud.js                 timer, counter + unit, tag, x5 badge, Gerald chip, captions (one at a time), TRAVELLING? flag, +2 pop, title card
  src/common.js              cameras, shots, pick(), follow(), regroup() (copy from ep3)
  src/scenes/p1..p8.js       one file per part of the brief (home, tower+sky, moon+sun, voyager+beyond, stars+galaxy, the break, outside, home)
  audio/*.py                 music_stretch, make_voices (la peace), make_narration (+ASR), make_sfx, make_audio (mix); timings read from timeline
  tools/                     render.mjs, sheet.py, encode.sh, qa.py
  analytics.data.js          update the header (hook, lengthSec 96.8) after the build; add snapshots after posting
```
**Determinism is mandatory:** every frame is a pure function of its frame index (seeded `rng`, no `Math.random`, no clocks, no state carried between frames unless re-simulated from the shot start). Dribble, shards, spring-damped rim and net are closed-form or re-simulated from the shot start.

## 5. Build order (each step ends in a working end-to-end film)
1. **Timeline first.** `timeline.js` with the exact counter (BigInt, thousands separators, unit rules from `BRIEF.md` §3, break at 62 s then `HEIGHT: NOT FOUND` from 68.4), the EDL, narration/roast/voice tables, music silence windows. Print the speech timeline and **check for overlaps** (the brief's table is a draft; fix conflicts here). Print the counter at the 7 checkpoints and compare with the brief.
2. **De-risk the dunk first** (shots 29–34, the hook). Build the universe-ball, silhouette material, hoop/net/backboard shatter, shockwave ring and flash, the floor rings, and render shot 33 as stills at frames 79.2, 79.4, 79.8, 80.0, +4, +12, +24 plus the hook frame 0. If it does not read, fix it before anything else. Add each new item to `registry.js` with a screenshot and to the INDEX tables.
3. **Blockout of the whole film**: all 40 shots at low res (`scale 0.5`) with placeholder props where needed, the HUD, captions, the final audio timeline. Get the full 96.8 s playing end to end.
4. **Polish part by part** (the build list in `BRIEF.md` §6): Burj skyline, airliner, ISS, satellites, Moon, Sun with sunglasses, Jupiter, Saturn, Voyager 1, Oort rocks, Proxima, Orion pillar, Milky Way, the cosmic ladder, aliens, tourist, pilot, astronauts, Gerald's cameos (suit and briefcase). Use the library first (`world.js` makeEarth/makeMoon/makeGalaxy/solarSystem/landmark burj/skyline, `sky.js` airliner, `home.js`). Keep the hero in every shot, large in frame; keep faces below the HUD band.
5. **Audio build** (episode-3's scripts): `la_peace.mp3` variants (1.10×/1.15× registers, plus the deliveries in the brief: radio, helmet, low-gravity echo, unison, very deep slow with long reverb, dry close), pyin f0 table, Piper narration + ASR word timings (time "rules" to land on 62.0), procedural SFX and the dribble thumps, the dunk slam (sub 45 Hz + crack + glass + tail, about 3 dB above everything else), true silence 77.6–80.0, 0.8 s music cut at 62.0, ducked mix at the approved levels (−14 LUFS, TP ≤ −1 dBTP after AAC).
6. **Full render, QA, fix round, v2.** Then deliver (§7).

## 6. Where to look when checking
- **Spec compliance:** `BRIEF.md` §3 (counter), §4 (speech), §5 (shots), §6 (dunk), §7 (risks).
- **Frame 0 and the first 3 s:** `../docs/HOOKS_AND_FORMATS.md` hook checklist (the hero big, the ball, the caption readable, not a white frame; premise understood in 1 s without sound; the slam sound on the first frames).
- **Every shot:** one still at the start and one at the end at full resolution, plus a 0.8 s-per-frame contact sheet of the whole film and a 0.4 s sheet for the dunk part. Apply `../docs/LOOK_AND_VIDEO.md` defect checklist item by item (cameras in walls/characters, text on faces or boards, overlapping text, clipped props, z-fighting, pop-in, black frames, a shockwave that is a flat disc instead of a tall glowing ring with debris and a ≥ 10-frame flash).
- **Counter:** read it off frames at 14 checkpoints (0, 10, 20, 30, 40, 50, 60 s and in between) and compare with the table; it never goes down; the tag is true; the `×5` badge stays inside the 60 px margins.
- **Audio:** LUFS and true peak after AAC; each "la peace" onset within ±40 ms of its timeline time; the 77.6–80.0 window silent (< −50 dBFS music); the slam and the music return aligned with story frame 2400 (film frame 2448); beat-grid residuals; ASR of narration against captions; the variant table (duration, peak, median f0).
- **Hook and loop:** EDL boundaries (film 1.2 → rewind → 1.6 → story 0), last frame falling ball ↔ frame 0.

## 7. Delivery
- `episode-5.mp4` (1080×1920, 30 fps, H.264 High yuv420p + AAC-LC 48 kHz stereo, **96.8 s, 2904 frames**, under 100 MB) and `episode-5_720p.mp4` (under 30 MB).
- Send the user **v1 immediately with your own review notes**, then do one fix round, check again, send v2. Keep v1 as a backup. Honest list of what is rough and what was not checked.
- Commit and push to `main` (code, briefs, library additions with screenshots, mp4s). Then update:
  - `../assets/library/INDEX.md` (new items) and `../assets/library/cat/CAT_BIBLE.md` (episode log: every roast and cameo, stat chip, the final gag).
  - `../README.md` (episode 5 status).
  - `analytics.data.js` header (`hook`, `lengthSec`, `title`); add `instagram.mediaId` after posting (`../docs/ANALYTICS.md`).
  - `BRIEF.md`: mark deviations.
- Final report format: path and ffprobe summary; measured BPM and stretch; the speech timeline; QA results per item; every deviation and why; known weaknesses ranked by how much they hurt; how to rebuild and the render time.

## 8. Lessons from the earlier episodes (user feedback, do not repeat)
- **Ep3 v1 was rejected:** too fast, confusing, text overlapping, glitchy backgrounds, a set without proper seating. Target 2–3 s per shot, one idea per shot, hold each gag ≥ 0.6 s, slow camera moves, no whip pans.
- "It looks like nothing's happening": every jump must visibly act on the world (tiles, dust, debris, things knocked aside), and people react.
- "It drifts off, too crowded": every shot shows the hero or something clearly about him; few people on screen; no random crowd close-ups.
- SFX were too loud: keep SFX well under speech and music; no whoosh on every cut.
- Narrator is perfect as is: Piper `en_US-ryan-high`, natural speed, de-essed; never time-stretch (use `--length-scale`).
- Frame people up front: medium and close shots, slow push-ins. The vertical frame is narrow (a head at 3 m fills two thirds of the width; hide anything within about 1.1 m of the lens).
- Moving hero: tracking shots locked to his position (`follow()`), never a linear camera move.
- Ep1 lost viewers with a static giant face and a number in frame 1 (59.6 % skipped): frame 0 must show action and the premise.
- Ep3 lost the middle: avoid extra reading load (Gerald chip + roasts must never crowd the counter or captions) and keep the escalation visually different every 2 s.

## 9. Unverified or risky (check these)
- **Landmark facts** in the tags (Voyager 1 about 170 AU in 2026, the Burj Khalifa 828 m, Everest 8,849 m, ISS about 408 km, geostationary orbit 35,786 km, the Moon 384,400 km, Orion Nebula about 1,344 light-years, Oort cloud inner edge about 2,000 AU, Proxima 4.24 light-years, Milky Way about 100,000 light-years across): re-check with a quick search before locking the tags, and change a tag rather than state something false.
- Music downbeat is ambiguous (chosen by accent in ep3); re-verify the beat grid.
- The Instagram sync script is untested against the live API (not part of this build).
- The silhouette readability on a phone screen, the cosmic-web universe-ball look and the glass shatter are new and unproven: prototype them early (§5 step 2).

## 10. As built (2026-11-20, v2)
- **Deliverables:** `episode-5.mp4` (1080x1920, 30 fps, 96.8 s, 2904 frames) and `episode-5_720p.mp4`. Deviations are listed at the end of `BRIEF.md`.
- **Music:** Charlie's Inferno (from 3.228 s of the x1.02743 stretch: the kick phase, re-verified) until the 60.4 cut, then **Tiki Tiki phonk** (`assets/tiki_tiki_phonk.mp3`, 168.00 BPM stretched to 150): drop A on the launch (62.8), drop B on the slam (80.0) and in the hook. `audio/music.py` documents the edit.
- **No Gerald HUD chip** (user): removed from the HUD and the title card.
- **Rebuild:** deps outside the repo (`npm i three@0.170.0 @fontsource/anton`, copy `three.module.js` + `anton-latin-400-normal.woff2` into `episode-5/vendor/`); Python venv (numpy scipy soundfile librosa pyloudnorm piper-tts faster-whisper pillow).
  `python audio/music.py && python audio/make_voices.py && PIPER_VOICE=<en_US-ryan-high.onnx> python audio/make_narration.py && python audio/make_audio.py` (writes `build/audio/*` and `audio/mix.wav`),
  then `NODE_PATH=$(npm root -g) node tools/render.mjs --from 0 --to 2903 --scale 1 --workers 4 --out <frames>` (~29 min on 4 cores, SwiftShader) and `tools/encode.sh <frames> episode-5.mp4 audio/mix.wav 20`.
  QA: `python tools/qa.py episode-5.mp4`, counter maths: `node tools/check_timeline.mjs`. Preview single parts with `index.html?parts=p7&scale=0.5`.
- **Code:** `src/timeline.js` (single source of truth), `src/main.js` (EDL), `src/hud.js`, `src/common.js`, `src/scenes/p1..p8.js`. New library items: `fx/dunk.js`, `props/space.js`, `sets/livingroom.js` (registry + screenshots).
- **Not checked / rough:** nobody listened to the audio (measurements only); the slam is ~+1.8 dB over the loudest other moment, not +3 dB; `.videohub/project.json` does not exist in this repo, so VideoHub settings were not updated.
