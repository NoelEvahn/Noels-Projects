# PRODUCTION BRIEF — "What if your money doubled every 2 seconds?"

You are building a finished 90 s vertical 3D comedy short, end to end, in this workspace.
Deliverable: `out/money_final.mp4` — 1080×1920, 30 fps, H.264 High (yuv420p) + AAC-LC stereo 48 kHz, exactly 90.0 s (2700 frames).

This is **episode 2 of a series**. Episode 1 ("What if you hussed 2× faster every 2 seconds?") was approved by the user; its look is shown in `assets_src/look_reference.jpg` (contact sheet of 30 frames from episode 1). **LOOK AT IT FIRST** and match it: same rounded toy-like 3D characters, same hero, same family, same HUD (small clock-icon timer `⏱ 00:00` above a huge yellow Anton number with thick black outline, small unit, small tag line under it), same yellow/white outlined captions, same palette approach per location. The user loved the visual style, text placement, sound design and direction — keep all of that; change the topic.

## 0. Hard rules
- Work ONLY inside this workspace directory (the folder holding this file). Never write to `/home/user/Noels-Projects`, never run git, never commit/push. Don't name anything after that repository.
- No subagents. Do the work yourself.
- Everything listed in §1 is verified working in this container — don't re-litigate the stack.
- Always keep a working end-to-end build. Order: (1) audio analysis + timeline, (2) full-length blockout video with final audio at preview res, (3) polish scene by scene, (4) full-res render, (5) QA + fixes. A complete coherent 90 s video beats a half-polished one.
- You cannot hear or watch. Substitute measurement (envelopes, onsets, LUFS, pyin f0, ASR) and LOOK at rendered frames with the Read tool (contact sheets + full-res stills). Review every shot visually at least once.

## 1. What exists (verified)
| Path | What |
|---|---|
| `assets_src/bomboclat_src.mp3` | User's "bomboclat" SFX. 3.82 s, 48 kHz stereo. Leading silence ≈1.63 s; voice ≈1.63–2.90 s. Episode-1 measurements: median f0 ≈ 472.6 Hz; syllable dips bom|bo ≈1.990 s, bo|clat ≈2.245 s, "cl" burst ≈2.255 s. "Bombo" = cut ≈2.224 s with 15–30 ms fade (verify the cut excludes the "cl" burst). |
| `assets_src/music_src.mp3` | Charlie's Inferno (user-supplied). 121.3 s, 44.1 kHz. Episode-1 analysis: true tempo 145.995 BPM (librosa's 143.55/147.8 are wrong — use beat-time regression), rubberband tempo ×1.027433 → 150.000 BPM; first downbeat in the stretched track at 3.024 s (source 3.107 s); excerpt stretched 3.024–93.024 s gave a downbeat at video 0.000 and a 97 % on-grid fit. Re-verify, don't blindly trust. |
| `assets_src/look_reference.jpg` | Episode-1 contact sheet — the target look. |
| `assets_src/voices/en_US-ryan-high.onnx(.json)` | Piper narrator voice used in episode 1 (use this one). `en_GB-alan-medium` also present. `echo "text" \| ./venv/bin/python -m piper -m <onnx> -f out.wav` |
| `venv/` | Python 3.13: numpy, scipy, soundfile, librosa, piper-tts, pyloudnorm, pillow, faster-whisper (for ASR caption checks; if `av` complains about `metadata_errors`, load audio yourself with soundfile and pass the numpy array). |
| `node_modules/three` (0.170.0), `node_modules/@fontsource/anton` | Serve Anton woff2 locally (`node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2`). Inter is installed system-wide. No CDN at render time. |
| `starter/character.js` | Episode-1 starter rig: 9 presets (hero, mum, dad, kid, grandma, runner, judge, reporter, fisherman), `makeCharacter`, `poseRun/poseIdle/poseShock/setFace`. Presets are complete (no implicit merge with hero). Start from this; improve it; add presets you need (auctioneer, bidders, banker/agent in suit + sunglasses, news anchor, astronaut, pizza guy, farmer, etc.). |
| `starter/probe.html`, `starter/probe.mjs` | Working deterministic capture harness (static server → Playwright Chromium → `window.renderFrame(i)` → `page.screenshot`). `NODE_PATH=$(npm root -g) node starter/probe.mjs . probe/out default`. Output sample: `probe/out_default/f000.jpg`. |
| ffmpeg | libx264, aac, rubberband, atempo, asetrate, loudnorm, ebur128, sidechaincompress, drawtext. |

Render cost: SwiftShader software WebGL ≈ 0.40–0.45 s per 1080×1920 frame incl. HUD screenshot. 2700 frames ≈ 20 min single process; 4 cores / 15 GB → 3–4 parallel workers over frame ranges. Shadow map ≤ 2048, few lights, instancing for crowds/coins/bills. Playwright: `require('playwright')` via `NODE_PATH=$(npm root -g)`; never `playwright install`.

## 2. Architecture (required shape, details yours)
```
timeline.js (+ build/timeline.json dump)  single source of truth: scenes, shots, cues, captions, VO, balance milestones, voice events
src/     index.html, main.js (window.renderFrame(i) — pure function of frame index), hud.js, fx.js, character.js, props.js, sets/*.js, scenes/s1..s7.js
tools/   render.mjs (parallel chunked capture, --scale, --from/--to, --list), encode.sh, sheet.py (contact sheets), qa_audio.py, asr.py
audio/   analyze_music.py, make_bombo.py, make_narration.py, make_sfx.py, mix.py → build/audio/final_mix.wav
build.sh one command: audio → render → mux → out/money_final.mp4
```
- **Determinism is mandatory**: every frame a pure function of its index (seeded PRNG; no unseeded Math.random, no Date.now; simulations re-run from shot start).
- Preview flags: `--scale 0.5` (540×960) and frame ranges, so one shot iterates in seconds.
- HUD/captions = DOM/2D canvas over the WebGL canvas, captured by `page.screenshot` (crisp text). JPEG q≥92 or PNG; x264 `-crf 16..18 -preset medium -pix_fmt yuv420p -r 30`.
- Audio and video read the same timeline → sync by construction.

## 3. Music + beat grid (identical to episode 1)
- Stretch to exactly 150.000 BPM (beat 0.4 s, bar 1.6 s); every 2 s doubling lands on a beat. Downbeat at video 0.000. Verify residuals (±30 ms) over all 90 s.
- Scene 7: music low-passed 76.0→77.6, **true digital silence 77.6–80.0** (faint wind/room tone allowed in SFX), **slam back at 80.0**, hard cut ≈87.6 for the room silence, record scratch + one slam bar + reverb tail at the 88.8 freeze.
- Music stays recognisable; dipped only slightly under speech (≈5 dB under narration, ≈2.5 dB under bomboclat lines; 20 ms attack / 250 ms release, deterministic envelope from the cue list).
- Final mix 48 kHz stereo, integrated ≈ −14 LUFS, true peak ≤ −1 dBTP after AAC encode (episode 1 needed limiter ceiling ≈ −3.2 dB to keep the AAC true peak under −1). No clipping.

Scene cuts (bar lines):
| Scene | Time (s) |
|---|---|
| 1 Discovery (living room) | 0.0 – 9.6 |
| 2 The house | 9.6 – 20.8 |
| 3 The auction | 20.8 – 32.0 |
| 4 The entire state (road-trip shopping spree) | 32.0 – 44.8 |
| 5 The ocean | 44.8 – 57.6 |
| 6 Around the world | 57.6 – 75.2 |
| 7 The final purchase | 75.2 – 90.0 |
Every cut, caption pop, voice line, impact and counter update on the 0.4 s grid (0.2 s off-beats allowed in fast montage). No shot longer than ~2.4 s without a new gag/camera move.

## 4. The BALANCE counter (mathematically exact)
- Story time == video time. `balance(t) = $0.01 × 2^floor(t/2)` → in cents: `2^floor(t/2)`. Changes at every even second for the full 90 s, including across cuts.
- Format: `$` + thousands separators + **always two decimals** (cents). Use BigInt cents. Auto-shrink to fit inside 60 px side margins.
- Checkpoints that MUST match: 0 s $0.01 · 2 s $0.02 · 4 s $0.04 · 8 s $0.16 · 14 s $1.28 · 20 s $10.24 · 28 s $163.84 · 30 s $327.68 · 34 s $1,310.72 · 40 s $10,485.76 · 44 s $41,943.04 · 48 s $167,772.16 · 54 s $1,342,177.28 · 60 s $10,737,418.24 · 66 s $85,899,345.92 · 74 s $1,374,389,534.72 · 80 s $10,995,116,277.76 · 88 s **$175,921,860,444.16**. (Fun fact you can rely on: the digits are exactly episode 1's km/h digits ÷ 1000.)
- HUD exactly like the reference: top area, `⏱ 00:00` small timer (mm:ss, ticking), big yellow Anton balance with thick black outline. On each doubling: punch-scale (overshoot ease, clamped so it never crosses the side margins), small "×2" badge pop, micro screen shake, a short **cash-register "cha-ching" / coin chime** + soft bass hit in audio. Bigger hit + longer shake on tier changes (first dollar, thousand, million, billion).
- Tag line under the number (small, like "FASTER THAN SOUND" in the reference); keep them TRUE-ish (≈):
  14 s "FIRST DOLLAR!" · 20 s "≈ A PIZZA" · 28 s "≈ A RUBBER DUCK (AT AUCTION)" · 34 s "FOUR FIGURES" · 36 s "≈ A COW" · 38 s "≈ A USED CAR" · 44 s "≈ A NEW CAR" · 48 s "≈ A SPEEDBOAT" · 54 s "MILLIONAIRE" · 62 s "≈ A PRIVATE ISLAND" · 66 s "≈ A PRIVATE JET" · 72 s "≈ A SKYSCRAPER" · 74 s "BILLIONAIRE" · 80 s "≈ $1.34 PER HUMAN" · 84 s on "STILL DOUBLING".
- The balance NEVER goes down when he buys things (the joke: the doubling doesn't care). 
- Safe areas: keep text out of the top 110 px and bottom 300 px; captions centred y≈1250–1500; side margins ≥ 60 px. **Captions must never sit on top of on-screen boards/chyrons/faces or under the counter** (episode-1 bug).

## 5. THE BOMBOCLAT RULE
- Characters may ONLY say "Bomboclat" / "Bombo". No other character speech. The narrator (TTS) is the only normal speech.
- All character lines are made from `assets_src/bomboclat_src.mp3`.
- **USER'S PITCH INSTRUCTION FOR THIS EPISODE: the bomboclat is 15 % and 10 % HIGHER than the original sample.** Implement as two registers: **1.10× (main register: hero base, most adults)** and **1.15× (high register: excited/kid/reporter/anchors)**. Static pitch ratios of every single-voice line are 1.10 or 1.15; emotion comes from contour (± ≤ 0.06 glide around the register, e.g. a question rising 1.10→1.16), tempo, gaps, EQ, drive, room — not from deep/low pitch. Nothing below 1.0× except the slow-mo scream. Crowds: layers spread 1.04–1.20. Measure and print f0/src for every variant to prove it (episode 1 lines built on "bombo" read ≈4 % above nominal — compensate so measured ratios land within ±3 % of 1.10 / 1.15).
- Delivery speed: ≈1.2× faster than the sample (tempo 1.1–1.5 per variant). Nothing slower than tempo 1.0 except `slowmo_scream`.
- Levels (user-approved in episode 1 v2): each line normalised to about −20 LUFS before the master (crowd_world −3 dB less attenuation so it is the loudest moment of the video). Narration ≈ −16.5 LUFS before the master. No sub-bass layers, no octave-down doubles.
- **Exactly these 14 voiced moments (15 files; crowd_world + slowmo_scream layered at 84.4).** Everyone else reacts with a SILENT open-mouth shock (no caption, no audio):

| t (s) | id | speaker | word / caption | register / delivery |
|---|---|---|---|---|
| 7.6 | dad_shout | dad | BOMBOCLAT! | 1.10, tempo 1.05, chest-y drive + low-mid warmth (no sub), big room |
| 8.8 | kid_high | kid | BOMBO! | 1.15→1.19, tempo 1.45, bright |
| 13.6 | grandma_confused | grandma | BOMBO? | 1.10 rising to 1.16 at end, tempo 1.0, vibrato 5.5 Hz, quiet |
| 19.2 | hero_excited | hero | BOMBO! | 1.15→1.19, tempo 1.5, drive, short room |
| 29.2 | auctioneer_disbelief | auctioneer | BOMBOCLAT?! | 1.10, "clat" rises to 1.17, 150 ms gap, tempo 1.0 |
| 30.8 | crowd_bidders | bidders | BOMBOCLAT! | ~34 layers 1.04–1.20, tempo 1.08–1.38, ±90 ms, wide, hall verb |
| 40.0 | reporter | reporter | BOMBOCLAT! | 1.15, tempo 1.26, broadcast band-pass 320–3.4k + wind |
| 44.0 | banker_mono | bank agent (suit, sunglasses) | Bombo. | 1.10 flattened contour, tempo 1.0, dry |
| 51.2 | fisherman_flat | fisherman | Bombo. | 1.10→1.06, tempo 1.0, tired, open air |
| 59.6 | montage_vendor | desert market vendor (camel sold) | BOMBOCLAT! | 1.10, tempo 1.14, canyon echoes on the beat |
| 71.2 | anchors_unison | all TVs | BOMBO!! | 8 voices 1.08–1.18, tempo 1.26–1.44, TV band-pass |
| 74.4 | astronaut | astronaut | bombo… | 1.10, tempo 1.0, radio band-pass + squelch |
| 84.4 | crowd_world | everyone | BOMBOCLAT! | 56 layers 1.04–1.20, tempo 1.02–1.38, huge verb (no sub) |
| 84.4 | slowmo_scream | everyone (layer) | (same caption) | glide 1.15→0.85, tempo 0.6, long tail |
| 88.0 | hero_casual | hero | Bombo. | 1.10→1.06, tempo 1.08, dry close, deadpan |

- Each voiced line: punch-zoom on the speaker's face ≈0.4 s before, mouth open/close driven by that line's amplitude envelope (export envelopes into the timeline), shock pose, big yellow outlined caption with shake. Caption punctuation matches delivery.

## 6. Narrator (Piper ryan, mixed quietly inside the music) — exact lines
1. S1 @≈0.1: "What if every two seconds, your money doubled?" (must end by ≈3.0 s; `--length-scale`/atempo ≤ 1.2 if needed)
2. S2 @≈15.6: "Unfortunately, the bank only paid him in pennies."
3. S4 @≈41.2: "At this point, the bank was starting to have questions."
4. S5 @≈53.2: "Money was apparently no longer a problem."
5. S6 @≈71.6: "He had officially become a global problem."
Captions: word-by-word (or 2–3-word chunks) synced to the TTS audio (±80 ms; per-word timing from alignment), big bold white, thick dark outline, key words yellow (EVERY TWO SECONDS, MONEY DOUBLED, PENNIES, THE BANK, QUESTIONS, NO LONGER A PROBLEM, GLOBAL PROBLEM). Verify with ASR that audio == captions.

## 7. Scene-by-scene shot plan (refine freely; keep the escalation and every listed gag)
Hero = `hero` preset (red hoodie, blue shorts, white sneakers, messy brown hair, yellow headband), identical everywhere. He carries a **phone showing a bank app** (big green balance on its screen — a nice insert-shot prop that mirrors the HUD). Money visuals escalate: **real pennies (exact count = cents, while countable) → coin avalanches → banknote rain → bundles/briefcases → gold bars → gold "SOLD" tags over everything.**

**S1 — THE DISCOVERY (0.0–9.6) · $0.01 → $0.16**
- 0.0 Living room as in the reference (sofa, rug, framed pictures incl. "HOME", lamp, TV, plant). Hero centre, punch-in, holding phone; family on the sofa (mum, dad, kid, grandma), bored. Narrator line 1 with caption pops.
- Each doubling, his phone spits out pennies: exactly 1, 2, 4, 8, 16 pennies onto the coffee table (instanced copper coins, they bounce and settle). Close insert of the phone app balance on 2.0.
- Family heads slowly turn from the TV to the coin pile. 7.2 punch-zoom dad → 7.6 `dad_shout`. 8.0 → 16 pennies; 8.8 `kid_high` (kid's piggy bank looks tiny next to the pile — the kid is outraged).

**S2 — THE HOUSE (9.6–20.8) · $0.32 → $10.24**
- 9.6 Kitchen: 32→64 pennies cascade out of the phone into the sink/fruit bowl. 11.2 Stairs: 128 pennies (12 s… keep exact count per even second: 64 at 12, 128 at 14) clatter down the stairs like a slinky; camera whip-pans and lags.
- 12.8 Slow-mo: a single penny flipping in mid-air, catching the light, hero's face reflected; grandma's eyes follow it. 13.6 `grandma_confused`.
- 14.0 → $1.28 "FIRST DOLLAR!" — hero fist-pumps; confetti burst; family silent shock.
- 15.2 Exterior of the house; pennies spraying out of the letterbox/windows and gutters (absurd, physics not required: counts no longer need to be exact once > 128). Narrator line 2 (15.6–18.4).
- 18.4 Hero bursts out of the front door pushing a wheelbarrow of pennies; 19.2 `hero_excited`; 20.0 → $10.24 "≈ A PIZZA": he slams the wheelbarrow down at a startled pizza delivery guy (silent reaction) and walks off with a pizza.
- Fix from episode 1: the house exterior must be a proper detailed house (porch, windows with frames, roof tiles, garden, mailbox, fence, path), not a plain box; the stairs shot must show the hero and the penny cascade, not a wall.

**S3 — THE AUCTION (20.8–32.0) · $20.48 → $327.68**
- 20.8 Smash cut: posh auction hall (red curtains, chandeliers, rows of bidders with paddles, auctioneer at a podium with a gavel, a pedestal with LOT 7: a yellow RUBBER DUCK under a spotlight). Hero slides into a seat holding pizza, casually.
- 22.0 Board: "LOT 7 · RUBBER DUCK · CURRENT BID $30". Bidders bid; hero raises a paddle at 24.0 ($40.96 — board updates to his bid) — bidders laugh silently; a rival outbids; 26.0 ($81.92) he raises again; 28.0 ($163.84) he raises — gavel SLAMS (on the beat): SOLD.
- 28.0 He pays by tipping a wheelbarrow: a penny avalanche buries the podium. 28.8 zoom auctioneer → 29.2 `auctioneer_disbelief`.
- 30.0 Results board (readable, caption kept OFF it): `LOT 7 — RUBBER DUCK · SOLD $163.84 · PAID IN 16,384 PENNIES · 2nd bidder: still counting…` (2^14 pennies = $163.84 ✓). 30.8 `crowd_bidders` (silent-shock bidders cut-in, then the voiced crowd).

**S4 — THE ENTIRE STATE (32.0–44.8) · $655.36 → $41,943.04**
- 32.0 Dramatic aerial 3D relief map of a stylised state ("THE ENTIRE STATE" label): his road-trip route draws as a glowing GOLD line between shop pins; each pin pops a "SOLD" stamp on the beat.
- 33.6–38.0 Rapid 0.8 s cuts: roadside diner (he buys every pie), farm (36 s ≈ A COW — he leaves with a cow on a leash; cow silent shock), used-car lot (38 s — he buys a beat-up car with a briefcase of cash; balloons and flags), small town (cash rain from his car window, laundry lines of banknotes), giant novelty roadside landmark (a huge piggy bank). Whoosh per cut.
- 38.0 Map again: the gold route now loops the whole border and glows solid; a counter "PURCHASES: …" spinning.
- 38.4 News van + `reporter` with mic, cameraman whipping the camera left-right losing him; chyron "BREAKING: LOCAL MAN'S BANK BALANCE WILL NOT STOP DOUBLING". 39.6 zoom → **40.0** `reporter` on the doubling ($10,485.76).
- 41.2–44.4 Narrator line 3 over a BANK situation room: suited bankers, big wall screen with his balance chart going vertical (exponential curve), alarms, one drops a coffee; a vault door in the background. 44.0 `banker_mono` ($41,943.04 "≈ A NEW CAR"; through the window he drives past in a shiny new car).

**S5 — THE OCEAN (44.8–57.6) · $83,886.08 → $2,684,354.56**
- 44.8 Marina/beach (umbrellas, sandcastle, boats): he buys a speedboat by throwing a briefcase at the dealer; 48 s "≈ A SPEEDBOAT". Rips across the turquoise sea, huge spray (make the wake read as water — white foam + spray particles, NOT tubes).
- 47.6 Cargo ship stacked with containers full of cash rocks in his wake; containers burst open, banknotes blizzard.
- 49.6 Fisherman in a tiny rowboat: hero pulls alongside, drops a briefcase into the boat (≈$335k at 50 s), takes the fisherman's fishing rod; fish rain down, fisherman's hat hovers then lands. Long deadpan look to camera. **51.2** `fisherman_flat`.
- 52.0 Aerial ocean map: gold route loops an ocean region; whirlpool of banknotes.
- 53.2–56.4 Narrator line 4. **54.0** → $1,342,177.28 "MILLIONAIRE" full-screen gold flash + money-gun confetti. 56.0 a seaside mansion with a giant SOLD sign slams down.

**S6 — AROUND THE WORLD (57.6–75.2) · $5,368,709.12 → $1,374,389,534.72**
- 57.6 Space: stylised Earth (continents, cloud layer, atmosphere rim), stars. His private shopping trail (gold) leaves the coast and starts wrapping the planet; gold SOLD pins pop up on the surface.
- 59.2–66.0 Rapid 0.8 s cuts with "SAT-CAM" frames (crosshair, readout of the balance): desert with pyramids and a market — 59.6 `montage_vendor` (he buys the vendor's camel) → tropical island (62 s "≈ A PRIVATE ISLAND", SOLD sign planted) → big city (ATMs exploding with cash) → snowy mountain (ski lift full of gold bars) → lighthouse coast → 66 s private jet ("≈ A PRIVATE JET") takes off. Silent reactions in each (no voice except 59.6).
- 66.0 Space: jet trail completes a lap — "LAP 1 ✔" — gold shock ring over the atmosphere. 67.6 Earth wrapped in gold trails, SOLD pins everywhere.
- 69.2 News montage: split-screen grid of TV anchors + living-room viewers worldwide (silent shocks staggered on beats 69.2/69.6/70.0/70.4) → **71.2** all in unison `anchors_unison`.
- 71.6–74.4 Narrator line 5 (over the montage/space). 72 s "≈ A SKYSCRAPER" (a skyscraper gets a SOLD crown). **74.0** → $1,374,389,534.72 "BILLIONAIRE". 74.4 astronaut at a space-station window, banknotes floating past outside: `astronaut`.

**S7 — THE FINAL PURCHASE (75.2–90.0) · $2.7B → $175,921,860,444.16**
- 75.2 Hilltop at golden hour (orange/purple sky, trees, distant town). Hero looks at his phone. Music filters down.
- 77.6 **SILENCE.** Extreme slow-mo close-up of his thumb hovering over a big phone button **"BUY: EVERYONE"** (price line under it: "8.2 BILLION PEOPLE"). Captions (text only, word by word): "HE MADE" … "ONE" … "PURCHASE."
- **80.0** Thumb taps exactly on the doubling → white flash, music slams back, boom. A colossal GOLD shockwave ring rips across the landscape (trees bend — make them proper rounded trees, not dark spikes; hills ripple, clouds part) and **a gold "SOLD" tag pops above every person** it passes.
- 80.8 Camera rockets backwards on beats: hilltop → continent covered in tiny gold tag sparkles → Earth with a giant "SOLD" tag tied to it → Moon (with a SOLD flag) → solar system.
- 83.6 Stunned crowd: EVERY character from the video (family, pizza guy, auctioneer, bidders, reporter, bankers, fisherman, vendor, anchors, astronaut…) in one field, each wearing a gold SOLD tag, hair blown back, a beat of frozen staring… **84.4** `crowd_world` + `slowmo_scream` "BOMBOCLAT!" — biggest caption of the video (keep it clear of heads and the counter).
- 86.0 The original living room (same set as S1, now knee-deep in pennies and cash). Hero strolls in, dusts his shoulder; the family on the sofa each wear a SOLD tag; they stare. 87.6 beat of room silence.
- **88.0** hero, deadpan: `hero_casual` "Bombo." (final doubling → $175,921,860,444.16).
- 88.8 Freeze-frame mid-expression: flash + zoom + record scratch; title card slams in: **WHAT IF YOUR MONEY DOUBLED EVERY 2 SECONDS?** · "FINAL BALANCE: $175,921,860,444.16" · "PURCHASED: EVERYONE". Hard end at 90.0.

## 8. Look & FX
- Match `assets_src/look_reference.jpg`: bright, polished, rounded stylised 3D; MeshStandard/Physical; hemisphere + warm key directional light with soft shadows; ACES tone mapping; sRGB; per-location palette and fog/sky gradient; rim light on characters where it helps. House (warm beige/teal/red rug), auction hall (deep red/gold), state map (tan/green relief), ocean (turquoise/deep blue), space (navy/black + blue marble), hilltop (golden hour orange/purple).
- Expressive faces: big eyes, brows, mouth; squash/stretch on reactions; eye-pop on shock.
- Money FX: instanced coins (copper pennies with a rim, metallic 0.6/roughness 0.35) that bounce and settle deterministically; banknote rain (thin green planes with a darker printed border texture drawn on a canvas, fluttering via seeded rotation); bundles, briefcases, gold bars, gold SOLD tags/stamps, sparkle particles, money-gun confetti, gold trails/rings. Escalate per scene.
- Physical comedy must read: objects visibly react and reactions are held ≥ 0.6 s.

## 9. SFX (synthesise procedurally; no downloads)
Cash-register cha-ching + soft bass hit on each doubling (subtle — it happens 45 times; vary it slightly, never fatiguing), bigger tier hits, penny clinks/cascades scaled to the pile size, coin avalanche, banknote flutter/whoosh, whooshes per cut, auction gavel slam, crowd murmur/gasps (noise-based, no words), cash-machine whirr, boat engine + splashes, ship horn, jet roar, radio squelch, phone tap + UI "ding", riser into the S7 silence, colossal shockwave boom (layered noise + mid thump + long tail, no rumbling sub buildup), record scratch. SFX must never bury narration or bomboclats. Keep the limiter from working hard (episode 1 had −11 dB of gain reduction peaks — aim for ≤ −6 dB).

## 10. QA checklist (do all, report results)
- ffprobe: 1080×1920, 30 fps, h264 yuv420p, aac stereo 48 kHz, duration 90.0 ± 0.05 s, 2700 frames.
- Contact sheets of all 90 s (one frame per 0.4 s) — LOOK at them; plus full-res stills of each scene's key moment. Specifically hunt episode-1 defects: cameras inside walls/characters, empty or blown-out frames, cropped heads under the counter, captions overlapping on-screen text/faces, effects hiding the action, flat/plain sets. Fix, re-render affected ranges, re-check.
- Balance HUD: crop frames at 1, 3, 9, 15, 21, 29, 31, 41, 45, 55, 61, 75, 81, 89 s and confirm the numbers equal §4.
- Penny counts in S1/S2 inserts equal 2^(t/2) where shown as exact.
- Audio: integrated LUFS, true peak (after AAC), no clipping; each voice cue has an onset within ±40 ms of its timeline time; S7 silence window music stem is digital silence; beat-grid residuals; f0/src table for every voice variant proving the 1.10 / 1.15 registers (±3 %).
- ASR on narration matches captions. No character says anything except bombo/bomboclat.

## 11. Final report (your last message — the orchestrator sees only this)
Path to mp4; ffprobe summary; BPM/stretch/excerpt offsets; voice event table (time, variant, speaker, measured f0 ratio); QA pass/fail per item; every deviation from this brief and why; known weaknesses ranked by severity; how to rebuild and partial re-render (so later revisions are cheap); render time.
