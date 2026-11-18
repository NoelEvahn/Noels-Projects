# PRODUCTION BRIEF — "What if every 2 seconds, twice as many people loved you?" (episode 3)

90.0 s vertical 3D comedy short: 1080×1920, 30 fps, H.264 High + AAC-LC stereo 48 kHz, 2700 frames. Built from the shared asset library (`../assets/library/`), with Gerald the cat as the recurring character.

## Slots (MASTER_PROMPT v3)
1. TOPIC: What if every 2 seconds, twice as many people loved you?
2. COUNTER: people who love you, starts at **1** (grandma), `1 × 2^floor(t/2)`, BigInt, thousands separators, never goes down. Unit "PERSON LOVES YOU" / "PEOPLE LOVE YOU". 8 s = 16 · 20 s = 1,024 · 40 s = 1,048,576 · 66 s = 8,589,934,592 (more than everyone on Earth) · 80 s = 1,099,511,627,776 · 88 s = **17,592,186,044,416**.
3. ENDING: **ONE HUG**. Silence 77.6 s, slow-mo arms open ("HE GAVE / ONE / HUG."), the hug closes exactly on the 80.0 doubling, pink love-wave shockwave, cosmic pull-back.
4. CATCHPHRASE: `assets/bomboclat.mp3`, two registers 1.10× and 1.15× (measured with pyin, ±3–4 %).
5. MUSIC: `assets/charlies_inferno.mp3`, 145.995 BPM (beat-regression) stretched ×1.02743 to 150.000 BPM (beat 0.4 s). First downbeat 3.030 s in the stretched track (low-band accent strongest at beat position 3 of 4 — ambiguous, that one was chosen); excerpt 3.030–93.030 s.
6. CAT GAG: Gerald is the holdout. HUD chip `GERALD · LOVES YOU: NO` (never changes), 7 narrator roasts, one cameo per scene, final callback (no heart over him).
7. Look: `assets/look_reference.jpg` (episodes 1–2).

## Scenes (new location every time)
| # | Time | Place | Count | Notes |
|---|---|---|---|---|
| 1 | 0–9.6 | Garden BBQ | 1→16 | hearts exact: 1 grandma, 2 kid, 4 +mum/dad, 8 +4 neighbours, 16 +8 |
| 2 | 9.6–20.8 | Terraced street | 16→1,024 | doors open, fan mail, chalk hearts, ice-cream truck, slow-mo heart balloon, crowd parts around him |
| 3 | 20.8–32 | Talent show | 1,024→65,536 | magician + rabbit, "NOW PERFORMING" board flips, golden buzzer at 28.0, result board 30.0–30.8 |
| 4 | 32–44.8 | Relief map (pink spreads), marching band heart, traffic, bakery, office sticky notes, school bus, lab | 65,536→4.19M | scientists + Lovometer; needle snaps at 40.0 (ONE MILLION) |
| 5 | 44.8–57.6 | Cloud Nine | 4.19M→268M | fans' heart balloons lift him; airliner full of faces, balloonist, skydiver heart; golden cloud 54.0 |
| 6 | 57.6–75.2 | Earth at night + billboard tour | 268M→137B | lights turn pink; Tokyo/NYC/London/Rio/Dubai/Sydney plazas; EVERYONE ON EARTH at 66.0; ghosts of everyone who ever lived |
| 7 | 75.2–90 | Hilltop → space → cast field → wrecked BBQ | 137B→17.6T | hug, pull-back, 25-person cast + ghosts, back home, "Bombo.", freeze + title card |

Recurring tropes used: only the cast crowd field (S7). Gerald is cast, not a trope.

## Speech timeline (0.4 s grid, nothing overlaps)
Narration (Piper ryan, tempo 1.12): n1 0.1–3.0 · n2 15.6–18.3 · n3 41.2–44.1 · n4 53.2–55.4 · n5 71.6–73.4. Roasts: r1 4.4 · r2 10.4 · r3 24.4 · r4 35.2 · r5 46.0 · r6 62.4 · r7 86.6 ("Gerald remained unconvinced." / "had seen better." / "gave it a four." / "did not register." / "was not up for it." / "had no comment." / "Still no."). None in 77.6–80.0.
Catchphrase moments (14, 15 files): dad 7.6 · kid 8.8 · grandma 13.6 · hero 19.2 · judge 29.2 · audience 30.8 · lab assistant 40.0 · chief 44.4 · balloonist 51.2 · window-washer 59.6 · plazas unison 70.0 · caveman ghost 74.4 · whole cast 84.4 (+slow-mo scream) · hero 88.0.

## Files
`src/timeline.js` (single source of truth: scenes, counter, tags, narration, roasts, voices) · `src/main.js` (renderer, `renderFrame(i)` pure function of the frame index) · `src/hud.js` · `src/common.js` · `src/scenes/s1..s7.js` (shot lists + animation) · `tools/render.mjs` (parallel, `--from --to --step --scale --workers`) · `tools/quick.sh`, `tools/sheet.py` (contact sheets) · `tools/encode.sh`, `tools/qa.py` · `audio/make_voices.py`, `make_narration.py`, `make_audio.py`.
Environment: `LIB_DEPS=<dir with node_modules (three, @fontsource/anton)>`, `EP_BUILD=<build dir>`, `NODE_PATH=$(npm root -g)`, Python venv with numpy scipy soundfile librosa pyloudnorm piper-tts faster-whisper.
Rebuild: `python audio/make_voices.py && python audio/make_narration.py && python audio/make_audio.py` (needs `music_stretch.json` + `music_stretched.wav` from the stretch step) → `node tools/render.mjs --out $EP_BUILD/frames` → `tools/encode.sh $EP_BUILD/frames out.mp4`. Partial re-render: `--from/--to/--scale 0.5`.

## Defect checklist (applied)
Cameras not in walls/characters; faces below the counter/tag/chip band (`orbit(..., low)` shifts the frame down); captions off faces and boards (voice captions at y≈1400, boards shown ≥ 0.6 s); no black gaps; held items in palms; seated characters on seats; shockwave is a tall glowing ring with flung hearts and bending trees; every frame deterministic (seeded PRNG, analytic particles).

## Honest limits
Nobody can listen to the audio here: loudness, true peak, onsets and speech-to-text were measured instead. See the final report in the session for known rough spots.
