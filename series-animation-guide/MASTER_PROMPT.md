# VIDEO SERIES MASTER PROMPT v5 — "What if every X, Y doubled?"

Fill in the slots, attach the files, and send.

**This prompt is split into files. Read them all before planning (they are short):**

| File | What it holds |
|---|---|
| `MASTER_PROMPT.md` (this file) | Slots, workflow, episode formats |
| `docs/LOOK_AND_VIDEO.md` | How the videos look: video format, story shape, pacing, layout and text, detail level, the counter, series look and camera, defect checklist, delivery checks |
| `docs/HOOKS_AND_FORMATS.md` | The first seconds: hook rules, retention lessons, the analytics evidence, the hook formats H1–H4 and which to use |
| `docs/AUDIO_AND_CAST.md` | Catchphrase rule (bomboclat / la peace), Gerald, narrator, music and edit, mix levels |
| `docs/ANALYTICS.md` | The per-episode analytics page, the Instagram sync script, how to read the numbers |
| `assets/library/INDEX.md`, `assets/library/cat/CAT_BIBLE.md` | Asset library and Gerald's log |


```
SLOTS (fill these in)
0. FORMAT:       DOUBLING (default, ~90 s) / REEL (funny short, 10–20 s) / WORLD (in this world…, ~2 min).
                 See "Episode formats" below. If not named, pick the format that fits the topic and say which.
1. TOPIC:        DOUBLING: What if every [INTERVAL], [THING] doubled / you [ACTION] 2x [MORE]?
                 e.g. "What if every 2 seconds, your money doubled?"
                 REEL / WORLD: the premise in one line,
                 e.g. "Somebody digs a hole under someone and he falls through." /
                 "What if in this world, everyone has a bodyguard?"
2. COUNTER:      DOUBLING only: what the on-screen number measures + START VALUE + unit + INTERVAL
                 e.g. "bank balance, starts at $0.01, doubles every 2 s, always show cents"
                 REEL / WORLD: no counter unless the user asks; use the format's own on-screen device.
2b. MULTIPLIER:  DOUBLING only, default x2. Any factor works (ep5: x5, a jump height that multiplies by 5 every 2 s).
                 The counter formula is START x MULTIPLIER^floor(t / INTERVAL); the milestone table in the brief must be computed, not guessed.
3. ENDING:       the one big final act in scene 7 (DOUBLING), or the punchline beat (REEL), or the twist (WORLD)
                 e.g. "he presses BUY: EVERYONE"
4. CATCHPHRASE:  DOUBLING only (skip for REEL and WORLD unless the user names one). The only word(s) characters may say (attach the sample)
                 + PITCH (default: two registers, 1.10x and 1.15x the sample)
                 Library samples: "bomboclat" / "bombo" (assets/bomboclat.mp3) or "la peace" (assets/la_peace.mp3).
                 Not every episode is bomboclat: use the one the user names.
5. MUSIC:        attached track name
6. CAT GAG:     Gerald's bit for this episode (new location + new unbothered action in every scene,
                 his own stat for the HUD chip, and the final callback). See `docs/AUDIO_AND_CAST.md`.
7. EXTRA GAGS:   optional
8. HOOK:         one hook format from docs/HOOKS_AND_FORMATS.md (H1 flash-forward + rewind, H2 premise object, H3 snap-zoom burst; H4 loop is always on).
                 If not named, pick it and say why.

ATTACHED: (a) catchphrase sound effect, (b) music track, (c) optional look reference image
          (a contact sheet of a previous episode).
The audio and look reference live in `series-animation-guide/assets/` (bomboclat.mp3, la_peace.mp3, charlies_inferno.mp3, look_reference.jpg);
use them unless new files are attached.
SFX library: `series-animation-guide/assets/sfx/` (popup, reveal, suspense, transition, zoom; 20 files from the "Viewcci Sound Effects" Drive folder, see `assets/sfx/INDEX.md`).
Every format uses this library for its sound effects.
```

## Instructions to Claude

### Workflow
1. **Check the asset library first.** Read `series-animation-guide/assets/library/INDEX.md` (characters, animals, props, sets, FX, hand/hold/sit APIs, screenshots) and `assets/library/cat/CAT_BIBLE.md` (Gerald the recurring cat and his episode log). Import what exists instead of rebuilding it. Anything new you build (character, prop, set, FX) goes into the library with code **and** a screenshot (add it to `registry.js`, regenerate screenshots, update `INDEX.md`). The hero and family never change.
2. Read this prompt and any attached files. Check the toolchain in the session scratchpad (node deps and Python venv live outside the repo). The repo may only receive content for `series-animation-guide/` (the library, episode folders, this prompt, the README); work directly on `main`, per the repository's `CLAUDE.md`. Never add anything else, and never name anything after the repository.
3. Plan the episode yourself, then write a detailed brief (`episode-N/BRIEF.md`): the chosen hook format (HOOKS_AND_FORMATS), beat grid, exact counter maths, a shot list of about 30–45 shots (2–3 s each, see Pacing in LOOK_AND_VIDEO), the voice table, the narration, the Gerald plan, a defect checklist, and the report format. Put every spoken event (story narration, Gerald roasts, catchphrase moments) on one timeline table on the 0.4 s grid first and check that nothing overlaps.
4. **The model running this session builds the whole episode itself.** Do not spawn subagents or advisors, and do not hand work to another model. Build the scene code, the audio and the render yourself. Provide partial re-render tools (frame ranges, preview scale) so fixes stay cheap.
5. **Create the episode's analytics page** (`docs/ANALYTICS.md`): copy `assets/analytics/template.data.js` to `episode-N/analytics.data.js`, fill in title, format and length, and copy `assets/analytics/episode.template.html` to `episode-N/analytics.html`. Add the episode to `analytics/index.html`'s list (one script tag). Do this for every new episode, in every format.
6. **Plan the dopamine spikes and the set dressing** (`docs/LOOK_AND_VIDEO.md` → "Engagement and set craft"): a spike every 4–6 s (POV with wind, the hero changing state, smashing through things, drone orbits/swoops, one-take camera moves, slow-motion close-ups with trails), furnished sets, real holes with thickness, no clipping, the hero staying where he was across angle changes.
7. When the build finishes, check the format, the counter and the contact sheets yourself.
8. Then review your own work in a separate pass: go through the shot list and the Defect checklist item by item, and fix what fails. No second model reviews it.
9. Send the user v1 and your review notes straight away. Then do one fix round yourself, check it again and send v2. Keep v1 as a backup.
10. Start immediately. Ask questions only if a slot is missing.

### Episode formats
Not every episode is a doubling. The format sets the length, the structure and the on-screen device. The **characters, the hero, Gerald, the fonts (Anton for the big text, the caption style), the narrator and the SFX library stay the same in every format.** Only the video format changes.

| Format | Length | Structure | On-screen device |
|---|---|---|---|
| **DOUBLING** (default) | ~90 s (up to 100 s with payoff and outro) | The seven-step escalation + payoff + share outro (below) | Counter with ×2 badges (HUD rules below) |
| **REEL** (funny short) | 15–17 s, one gag | Flash-forward hook (the payoff in the first second) + rewind, setup, one escalating gag, the punchline, then the **voiced** share line over the last shot (no end card). No seven-step scale. No Gerald. See `docs/HOOKS_AND_FORMATS.md`. | Caption or sign only; no counter |
| **WORLD** ("in this world…") | ~120 s (2 min) | A world premise (e.g. everyone has a bodyguard): 3–4 chapters, each a different angle of the same world, the hero in every chapter, then a closing twist and share outro. Use the 0.4 s grid, the same caption rules, and no counter. No Gerald. | Chapter title card (Anton, yellow) per chapter, optional chyron |

Rules for every format:
- Same hero, same family, same narrator voice and caption style.
- **Catchphrases (bomboclat, la peace) are DOUBLING only,** unless the user names one for a REEL or WORLD episode. REEL and WORLD have no catchphrase lines, no OK-hand or mewing gag.
- **Gerald is DOUBLING only.** REEL and WORLD episodes have no Gerald, no Gerald roasts, no HUD chip and no Gerald callback.
- Same SFX library (`assets/sfx/`). Pick by category, not by habit.
- Keep the mix, defect checklist and quality checks. The shot-length rule (2–3 s per shot) applies to DOUBLING and WORLD. A REEL can have shorter shots (min 1 s), but each shot still shows one clear thing.
- Set the length in `timeline.js` (`DUR`, `FRAMES`) and in `.videohub/project.json` (`render.env.DUR`, `live.dur`) for each episode. Put the chosen format at the top of `episode-N/BRIEF.md`.
