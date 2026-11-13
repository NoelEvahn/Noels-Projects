# PRODUCTION BRIEF — "What if you hussed 2× faster every 2 seconds?"

You are building a finished ~90 s vertical 3D comedy short, end to end, in this workspace.
Deliverable: `out/hussed_final.mp4` — 1080×1920, 30 fps, H.264 (yuv420p) + AAC stereo, 90.0 s (2700 frames).

## 0. Hard rules
- Work ONLY inside this workspace directory (the folder holding this file). Never write to `/home/user/Noels-Projects`, never run git, never commit/push anything. Do not name any file/folder/variable after that repository.
- No subagents. Do the work yourself.
- Everything already probed below WORKS in this container — do not re-litigate the stack.
- Always keep a working end-to-end build. Order of work: (1) audio analysis + timeline, (2) full-length *blockout* video with final audio at preview res, (3) polish scene by scene, (4) full-res render, (5) QA review + fixes. If you run short on budget, a complete, coherent 90 s video beats a half-polished one.
- You cannot hear audio or watch video. Substitute measurement: print envelopes/onsets/LUFS, and LOOK at rendered frames with the Read tool (contact sheets). Review every shot visually at least once and fix what looks broken (clipping limbs, empty frames, unreadable text, characters facing away, off-screen action).

## 1. What exists already (verified)
| Path | What |
|---|---|
| `assets_src/bomboclat_src.mp3` | User's "bomboclat" SFX. 3.82 s, 48 kHz stereo; ~1.63 s leading silence, voice ≈ 1.63–3.8 s |
| `assets_src/music_src.mp3` | User-supplied music bed (Charlie's Inferno), 121.3 s, 44.1 kHz. ~1.58 s lead-in silence. Tempo ≈ 143–146 BPM (librosa's 143.55 is bin-quantised; first 12 beats regress to ≈145.8). Loudness is flat across the track (no quiet intro). |
| `assets_src/voices/en_US-ryan-high.onnx(.json)` | Piper TTS voice for the narrator. `echo "text" \| ./venv/bin/python -m piper -m <onnx> -f out.wav` works. More voices: `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/<en_US\|en_GB>/<name>/<quality>/<file>` (reachable; `en_GB-alan-medium` = deadpan documentary option — pick whichever narrator is funnier/clearer, one narrator for the whole video). |
| `venv/` | Python 3.13 venv with numpy, scipy, soundfile, librosa, piper-tts. `pip install` works. |
| `node_modules/three` | three@0.170.0. npm works. |
| `starter/character.js` | Starter rounded character rig + 9 presets + `poseRun/poseIdle/poseShock/setFace`. Start from this; improve it. |
| `starter/probe.html`, `starter/probe.mjs` | Working deterministic capture harness (local static server → Playwright Chromium → `window.renderFrame(i)` → `page.screenshot`). Run: `NODE_PATH=$(npm root -g) node starter/probe.mjs . probe/out default`. Sample output frame: `probe/out_default/f004.jpg` (look at it). |
| ffmpeg | Has libx264, aac, `rubberband`, `atempo`, `asetrate`, `loudnorm`, `sidechaincompress`, `drawtext`, `ass`. |
| Fonts | Inter (incl. Black/ExtraBold) installed system-wide. You may `npm i @fontsource/anton` / `@fontsource/bangers` etc. and serve the woff2 locally for a meme font. No CDN at render time. |

Measured render cost: WebGL runs on SwiftShader (software) at ≈0.35–0.40 s per 1080×1920 frame incl. HUD screenshot for a 9-character shadowed scene. 2700 frames ≈ 18 min single process; machine has 4 cores / 15 GB → run 3–4 parallel workers over frame ranges. Keep per-frame cost in check (shadow map ≤2048, limited lights, instancing for crowds).
Playwright: `require('playwright')` resolves via `NODE_PATH=$(npm root -g)`; do NOT run `playwright install`.

## 2. Architecture (required shape, details yours)
```
timeline.json / timeline.js   single source of truth: scenes, shots, cues, captions, VO, speed milestones (times in seconds on the beat grid)
src/        index.html, main.js (window.renderFrame(i), pure function of frame index), hud.js, fx.js, character.js, props.js, scenes/s1..s7.js
tools/      render.mjs (parallel chunked capture → jpg/png → ffmpeg segments → concat), sheet.sh (contact sheets)
audio/      analyze_music.py, make_bombo.py, make_narration.py, make_sfx.py, mix.py  → build/audio/final_mix.wav
build.sh    one command: audio → render → mux → out/hussed_final.mp4
```
- **Determinism is mandatory**: every frame must be a pure function of its frame index (seeded PRNG; no `Math.random()` unseeded, no `Date.now`, no accumulated state across frames unless re-simulated from shot start). Parallel chunks must match seamlessly.
- Renderer flag for preview res (540×960, e.g. `?scale=0.5` / `--scale 0.5`) and for frame ranges (`--from --to`), so you can iterate on one shot in seconds.
- HUD/captions are DOM/2D-canvas over the WebGL canvas in the same page, captured with `page.screenshot` (so text is crisp). Capture JPEG q≥92 or PNG; encode x264 `-crf 16..18 -preset medium -pix_fmt yuv420p -r 30`.
- Audio and video both read the same timeline, so sync is by construction.

## 3. Music + the beat grid (the edit is cut to this)
1. Measure tempo precisely (linear regression over tracked beat times, not librosa's single quantised number) and find the downbeat phase (strongest periodic accent / low-band onset energy per beat position).
2. Time-stretch the track with pitch preserved (ffmpeg `rubberband=tempo=…`) to **exactly 150.000 BPM** → beat = 0.400 s, bar (4 beats) = 1.600 s, and **every 2.000 s speed-doubling lands on a beat (5 beats)**. Expected stretch ≈ +3…4.5 %. Trim so a downbeat sits at video t = 0.000 (skip the lead-in silence). Re-verify after stretching: detected beats must sit within ±30 ms of the 0.4 s grid across all 90 s (print the residuals; fix drift).
   - If the measured tempo would need more than ±7 % stretch, or the meter is not 4/4, adapt: keep 2 s doublings on-beat if at all possible, and say what you chose in the final report.
3. Choose the 90 s excerpt so it has energy; scene 7 needs: music filtered down → **true silence ≈1.6 s (77.6–79.2/80.0)** → slam back in on the shockwave at 80.0. End: hard stop/record-scratch + short reverb tail at the freeze-frame.
4. Music level: bed around −17 LUFS, ducked ~6–8 dB under narration and ~4–5 dB under bomboclat lines using a deterministic gain envelope computed from the cue list (20 ms attack, ~250 ms release). Music must stay recognisable throughout.
5. Final mix: 48 kHz stereo, integrated ≈ −14 LUFS, true peak ≤ −1 dBFS (limiter; no clipping).

Scene cuts (bar lines on the 150 BPM grid — use these unless analysis forces a change):
| Scene | Time (s) | Bars |
|---|---|---|
| 1 Discovery (house) | 0.0 – 9.6 | 6 |
| 2 House isn't enough | 9.6 – 20.8 | 7 |
| 3 Random race | 20.8 – 32.0 | 7 |
| 4 Entire state | 32.0 – 44.8 | 8 |
| 5 Across water | 44.8 – 57.6 | 8 |
| 6 Around the world | 57.6 – 75.2 | 11 |
| 7 Final milestone | 75.2 – 90.0 | 9¼ |
Every camera cut, caption pop, bomboclat, impact and counter update must sit on a 0.4 s beat (0.2 s off-beats allowed for fast montage). No shot longer than ~2.4 s without a new gag/camera move.

## 4. Speed + timer HUD (mathematically exact)
- Story time == video time. `speed(t) = 10 × 2^floor(t/2)` km/h. Updates at every even second for the whole 90 s, including across transitions/cuts.
- Checkpoints that MUST match: 0 s 10 · 2 s 20 · 4 s 40 · 6 s 80 · 8 s 160 · 10 s 320 · 20 s 10,240 · 30 s 327,680 · 40 s 10,485,760 · 60 s 10,737,418,240 · 80 s 10,995,116,277,760 · 88 s 175,921,860,444,160. Use BigInt/exact integers and thousands separators; auto-shrink font so the longest number fits inside safe margins.
- HUD: top area = timer `00:02` style (mm:ss, ticking) + big yellow speed number with dark outline. On each doubling: number punch-scales (overshoot ease), a "×2" badge pops, screen micro-shake, bass hit + whoosh in audio. Effects get stronger as numbers grow.
- Optional comedy tag under the number at thresholds (text only, tiny jokes, keep them true): 1,280 "FASTER THAN SOUND" (Mach 1 ≈ 1,235 km/h → first sonic boom happens INSIDE the house at 14 s), 40,960 "ESCAPE VELOCITY" (24 s), 1,342,177,280 "FASTER THAN LIGHT" (54 s; c ≈ 1.079 billion km/h), 60 s "10× LIGHT SPEED", 80 s "10,000× LIGHT SPEED".
- Safe areas for 9:16 social: keep text out of top 110 px and bottom 300 px; captions centred around y≈1250–1500; side margins ≥ 60 px.

## 5. THE BOMBOCLAT RULE (most important)
- Characters may ONLY ever say "Bomboclat" / "Bombo". No other character speech, no gibberish, no grunts-as-words. Narrator (TTS) is the only normal speech.
- **All character lines are made from `assets_src/bomboclat_src.mp3`** (trim the silence first). The user's explicit instruction: **tune its pitch to 60 % so it's deeper** → the base voice is pitch ratio 0.60 of the original (≈ −8.84 semitones), duration preserved (rubberband). This 0.60 "base" is the hero's voice and the centre of the whole cast; every variant stays deeper than the original (ratio < 1.0).
- Build "Bombo" by cutting the source after its 2nd syllable (find syllable boundaries from the amplitude envelope/onsets; print them; cut at the energy dip with a 15–30 ms fade). Verify by envelope that the cut doesn't include the "cl" burst.
- Emotional variants — user asked specifically for variations "for excitement, disbelief etc.". Make them genuinely different performances, not just gain changes. Toolbox: static pitch ratio, tempo, **pitch contour** (time-varying resample curve = glide up for questions/excitement, glide down for disappointment; then fix overall length with rubberband), inter-syllable gap stretch, vibrato, tanh drive, EQ (band-pass "TV/radio", low-shelf boost), reverb/room size, slapback, stereo pan, level.

| id | used by | word | pitch × orig | tempo | character of the delivery |
|---|---|---|---|---|---|
| `hero_base` | hero | bomboclat | 0.60 | 1.0 | the reference: plain deep |
| `hero_excited` | hero S2 door-burst | bombo! | 0.66→0.74 glide up | 1.25 | bright, shouted, short room verb |
| `hero_casual` | hero final line | bombo. | 0.60→0.54 glide down | 0.9 | dry, close, deadpan, no reverb |
| `dad_bass` | dad S1 | bomboclat! | 0.45 | 0.85 | deep bass + low shelf, big |
| `kid_high` | kid S1 | bombo! | 0.82 | 1.2 | highest of the cast (still < 1.0), quick |
| `grandma_confused` | grandma S2 | bombo? | 0.70→0.84 rising at end | 0.8 | quiet, vibrato 5–6 Hz, questioning |
| `mum_angry` | mum S2 | bomboclat! | 0.55 | 1.15 | tanh drive, hard attack, loud |
| `runner_confused` | runner S3 | bombo? | 0.63→0.75 rise | 0.9 | small, sideways glance |
| `judge_disbelief` | judge S3 | bomboclat?! | 0.58, last syllable rises to 0.78 | 0.72, extra gap before "clat" | slow incredulous question |
| `reporter` | reporter S4 | bomboclat! | 0.66 | 1.05 | band-passed broadcast mic (300–3.4k) + slight wind |
| `agent_mono` | government agent S4 | bombo. | 0.50 flat (flatten contour) | 0.8 | monotone, dry |
| `fisherman_flat` | fisherman S5 | bombo. | 0.52→0.48 | 0.7 | tired, deadpan, quiet-ish, open-air |
| `sailors` | ship crew S5 | bomboclat! | 6–8 voices 0.5–0.75 | 0.95–1.1 | small group, ±60 ms jitter, panned |
| `anchor_1..4` + viewers | S6 news montage | bomboclat! | spread 0.48–0.85 | varied | staggered on beats then unison; TV band-pass on anchors |
| `astronaut` | ISS S6 | bombo… | 0.57 | 0.75 | radio: band-pass + bit-crush/squelch beep |
| `crowd_stadium` | S3 result | bomboclat! | 25–40 layers 0.45–0.85 | 0.9–1.15 | ±90 ms jitter, wide stereo, large reverb |
| `crowd_world` | S7 "everyone" | BOMBOCLAT! | 50+ layers | — | biggest moment in the video: huge chorus + sub-bass hit |
| `slowmo_scream` | layered under `crowd_world` / S7 | bomboclaaat | 0.60→0.35 glide down | 0.35–0.4 | slow-motion scream, long tail |
Add more where a gag needs one (target ≥ 22 bomboclat/bombo events in 90 s, roughly one every 3–5 s, never two identical-sounding ones back to back). Print a table of every variant: duration, peak, median f0 (e.g. `librosa.pyin`) so you can confirm they actually differ and that `hero_base` f0 ≈ 0.60 × source f0.
- Every speaking character gets: a punch-zoom on their face ~0.4 s before the line, mouth open/close animation synced to the line's amplitude envelope (export per-line envelope → timeline), shock pose, and a caption ("BOMBOCLAT!" / "BOMBO?" — yellow, big, shake). Caption punctuation should match the delivery.
- Every doubling milestone, location change, collision, achievement and reveal should trigger either a voiced bombo/bomboclat or (when the mix is busy) a visible silent mouth-agape reaction — but lean voiced.

## 6. Narrator (TTS, the only normal speech) — exact lines
1. S1 @≈0.1 s: "What if every two seconds, you hussed two times faster?" (if the TTS mangles "hussed", feed it a phonetic spelling like "hust"; caption still shows **HUSSED**; must finish by ≈3.0 s — speed up with piper `--length-scale` / atempo ≤1.2 if needed)
2. S2 @≈15.6 s: "Unfortunately, his house was no longer big enough."
3. S4 @≈41.2 s: "At this point, the government was starting to have questions."
4. S5 @≈53.2 s: "Water resistance was apparently no longer a problem."
5. S6 @≈71.6 s: "He had officially become a global problem."
Captions: word-by-word (or 2–3-word chunk) pop-on synced to the narration audio (derive word timings from the TTS output — per-word synthesis and concatenation, or energy-based alignment — must be accurate to ~±80 ms), big bold white with thick dark outline, key words in yellow (HUSSED, 2 TIMES FASTER, HOUSE, GOVERNMENT, WATER RESISTANCE, GLOBAL PROBLEM). Captions must match the spoken audio exactly.

## 7. Scene-by-scene shot plan (times on the 0.4 s grid; refine freely but keep the escalation and every listed gag)
Protagonist = `hero` preset: red hoodie, blue shorts, white sneakers, messy brown hair, yellow headband. Identical model/colours/proportions in every scene (reuse the same factory; only pose/scale-in-frame changes). At extreme speeds he becomes a red+yellow streak/trail but his colours carry through, and he must be clearly visible as himself at least once per scene.

**S1 — THE DISCOVERY (0.0–9.6) · speeds 10 → 160**
- 0.0 Living room (sofa with cushions, rug, lamp, TV, plant, framed pictures, window light). Hero centre frame, quick punch-in. Family on the sofa: mum, dad, kid, grandma. Narrator line 1 with caption pops. Hero starts jogging laps at ~1.2.
- 2.0 "00:02" timer ding → 20 km/h, ×2 pop. 4.0 → 40: cushions get knocked flying. 6.0 → 80: lamp spins, papers/remote/vase airborne; family heads track him left-right like a tennis match, faster each lap.
- 7.2 punch-zoom Dad → 7.6 `dad_bass` "BOMBOCLAT!" 8.0 → 160: hero is now a red blur ring around the room, speed lines. 8.8 `kid_high` "BOMBO!".

**S2 — THE HOUSE ISN'T ENOUGH (9.6–20.8) · 320 → 10,240**
- 9.6 Kitchen/dining: laps the dining table, plates and cutlery spin on the table. 11.2 Stairs: up and down; the camera whip-pans and visibly LAGS behind/overshoots him (the "camera can't keep up" joke), slight shake.
- 12.8 Slow-mo hero shot: a glass of water knocked into the air — glass and a wobbling water blob hang suspended; hero streak passes behind it; grandma's eyes follow in slow motion. 13.6 `grandma_confused` "bombo?".
- 14.0 → 1,280 FASTER THAN SOUND: sonic boom indoors — windows blow outward, pictures drop, roof hops. 14.4 `mum_angry` "BOMBOCLAT!".
- 15.2 Exterior of the house: whole house shaking, red streak visible orbiting through the windows. Narrator line 2 (15.6–18.4).
- 18.4 He bursts through the front door (door flies off), 19.2 `hero_excited` "BOMBO!", streak down the street. 20.0 → 10,240.

**S3 — THE RANDOM RACE (20.8–32.0) · 20,480 → 327,680**
- 20.8 Smash cut: sunny stadium, red running track, lane numbers, crowd stands (instanced), runners in start crouch. Hero slides into an empty lane in a dust puff and casually stretches. 22.0 neighbouring `runner_confused` side-eye "bombo?".
- 23.2 Official raises starting pistol… **24.0 BANG exactly on the doubling** → hero is simply gone: dust silhouette + scorch marks; the other runners haven't moved a muscle.
- 24.4–27.2 Aerial stadium: glowing trail laps the track over and over, LAPS counter spinning up to 125, finish tape vaporised.
- 27.2 He's back at the start line leaning casually, checking an imaginary watch; one runner has only just lifted a foot.
- 28.0 Judges' table: smoking stopwatch close-up "0.0088 s". 28.8 zoom judge → 29.2 `judge_disbelief` "BOMBOCLAT?!".
- 30.0 Results board (absurd but consistent: at 40,960 km/h, 100 m takes 0.0088 s): `100 m — 0.0088 s · NEW WORLD RECORD · +125 BONUS LAPS · 2nd place: still loading…`. 30.8 `crowd_stadium` "BOMBOCLAT!".

**S4 — THE ENTIRE STATE (32.0–44.8) · 655,360 → 41,943,040**
- 32.0 Dramatic aerial 3D relief map of a whole state (stylised extruded outline with terrain bumps, tiny cities, highways; label "THE ENTIRE STATE"). A glowing route line races around the border.
- 33.6–38.0 Rapid 0.8 s cuts with ridiculous tracking shots: highway (cars spin like tops in his wake) → city skyline (traffic lights whip) → mountain pass → small town (laundry stripped off lines, a cow rotates) → roadside landmark (giant novelty object). Whoosh per cut; some bystanders do short bombo reactions.
- 38.0 Map again: the loop is now so fast the whole border glows solid; LAPS counter blurs.
- 38.4 News van + `reporter` with mic and a cameraman whipping the camera left-right, losing him; hair/tie blown sideways; chyron "BREAKING: LOCAL MAN WILL NOT STOP HUSSING" (on-screen text is fine; speech is not). 39.6 zoom → **40.0** `reporter` "BOMBOCLAT!" on the doubling (10,485,760).
- 41.2–44.4 Narrator line 3 over a government situation room: suited agents in sunglasses, big radar/map screen with a blip circling the state; one drops his coffee. 44.0 `agent_mono` "Bombo."

**S5 — RUNNING ACROSS WATER (44.8–57.6) · 83,886,080 → 2,684,354,560**
- 44.8 Coast: he tears across a beach (umbrellas, sandcastle, towel explode outward) straight into the sea without slowing.
- 46.0 Low tracking shot of his feet slapping the water: each contact throws an enormous splash crown; one 0.8 s slow-mo single-step insert.
- 47.6 Wide: V-wake with towering water walls; cargo ship + sailboat rock violently, containers slide. 48.8 `sailors` "BOMBOCLAT!".
- 49.6 Fisherman in a tiny rowboat; hero passes, the boat spins like a top, fish rain down, his hat stays hovering then lands. Long deadpan look to camera. **51.2** `fisherman_flat` "Bombo."
- 52.0 Aerial ocean map: glowing loop around an entire ocean region, whirlpool forming in the middle.
- 53.2–56.4 Narrator line 4. 54.0 → 1,342,177,280 "FASTER THAN LIGHT" flash. 56.4 extra reaction (e.g. a lighthouse keeper) "BOMBO!".

**S6 — AROUND THE WORLD (57.6–75.2) · 5,368,709,120 → 1,374,389,534,720**
- 57.6 Space: stylised Earth (painted-canvas continents + cloud layer + atmosphere rim glow), stars. His glowing trail leaves a coast and starts wrapping the planet.
- 59.2–66.0 Rapid 0.8 s cuts, each with a local bystander reaction: desert with pyramids (sand blasted away) → big city (windows shatter in a wave) → forest (trees bend, leaves stripped) → snowy mountains (avalanche) → coastline with lighthouse → savanna/great-wall/etc. Insert "SAT-CAM" satellite-view frames with crosshair + speed readout. Sonic-boom cones/rings on every pass. At least 3 voiced bomboclats here, all different.
- 66.0 Space: the trail completes a full lap — "LAP 1 ✔" — shock ring expands over the atmosphere. 67.6 more laps: Earth wrapped like a glowing ball of yarn, wobbling.
- 69.2 News montage: split-screen grid of TV anchors and living-room viewers around the world; bomboclats stagger in on beats (69.2, 69.6, 70.0, 70.4…) then all in unison at 71.2.
- 71.6–74.4 Narrator line 5. 74.4 Astronaut at a space-station window watching the trail: `astronaut` "bombo…".

**S7 — THE FINAL MILESTONE (75.2–90.0) · 2.7 trillion → 175,921,860,444,160**
- 75.2 He skids to a stop on an open hilltop landscape (golden hour). Giant timer on screen ticking toward the next even second. 76.0 doubling. Music filters down.
- 77.6 **SILENCE** (music out; faint wind only). Extreme slow-mo close-up: one sneaker lifts. Caption: "HE TOOK" … "ONE" … "STEP." (text only).
- **80.0** Foot lands exactly on the doubling → white flash, music slams back, sub-bass boom. Colossal shockwave ring rips across the landscape: trees flatten, hills ripple, clouds part.
- 80.8 Camera rockets backwards: landscape → continent → Earth (ring crossing the globe) → Moon knocked aside → solar system → galaxy ripple. Each scale jump on a beat.
- 83.6 Stunned crowd: EVERY character from the video (family, runners, judge, reporter, agents, fisherman, astronaut…) in one field, hair blown back, a beat of frozen staring… **84.4** all at once `crowd_world` + `slowmo_scream`: "BOMBOCLAT!" — biggest caption of the video.
- 86.0 The original living room (same set as S1, now wrecked). Hero strolls in casually, dusts his shoulder. Family stares. 87.6 beat of silence in the room.
- **88.0** hero, deadpan: `hero_casual` "Bombo." (final doubling).
- 88.8 Freeze-frame mid-expression: flash + zoom + record-scratch, title card slams in: **WHAT IF YOU HUSSED 2× FASTER EVERY 2 SECONDS?** with "FINAL SPEED: 175,921,860,444,160 km/h". Hard end at 90.0.

## 8. Look & FX
- Bright, polished, rounded stylised 3D: MeshStandard/Physical materials, hemisphere + warm key directional light with soft shadows (PCFSoft), ACES tone mapping, sRGB output, coloured fog/sky gradient per location, rim light on characters where it helps. Each location has its own palette and is recognisable within 0.3 s: house (warm beige/teal), stadium (red track/green infield), state map (tan/green relief), ocean (turquoise/deep blue), space (navy/black + blue marble), final hilltop (golden hour orange/purple).
- Expressive faces: big eyes, brows, mouth; exaggerate (squash/stretch on reactions, eye-pop on shock via `setFace({pupil, eye, brow, open})`). Improve the starter rig as needed (blink, fingers not needed).
- Speed FX escalate per scene: S1 dust puffs + speed lines → S2 ghost-trail copies, camera lag/shake → S3 additive ribbon trail, scorch marks → S4 glowing route lines, FOV punch → S5 splash crowns, water walls, wake → S6 planetary trail, shock rings, sonic-boom cones → S7 full-screen shockwave, flash, cosmic pull-back. Tools: stretched ghost meshes with additive transparent materials, ribbon/tube trails, screen-space speed lines (2D overlay), radial vignette, chromatic/zoom punch via CSS or a cheap post pass, camera shake (seeded noise), optional 2–3 sub-frame accumulation on hero shots only if render budget allows.
- Physical comedy must read: objects visibly react (fly, spin, hover, shatter), and reactions are held long enough (≥0.6 s) to register.
- Footsteps in audio accelerate with speed (discrete steps → buzz → continuous tone/whine as speed climbs).

## 9. SFX (synthesise procedurally in Python; no downloads needed)
Footsteps (accelerating), whooshes (filtered-noise sweeps, per cut/pass), sonic booms (low sine thump + noise crack), bass hits/808 drops on every doubling, timer ticks + ding at 00:02, cushion/impact thuds, glass shatter, door smash, starting pistol, crowd murmur/roar (noise + layered bomboclats), water splashes + wave rumble, ship horn, radio beep, record scratch, riser into the S7 silence, colossal shockwave boom (layered sub + noise + long tail). Place them from the timeline cue list. Keep the mix clean: SFX must not bury narration or bomboclats.

## 10. QA checklist (do all, report results)
- `ffprobe` final: 1080×1920, 30 fps, h264 yuv420p, aac stereo, duration 90.0 ± 0.05 s, 2700 frames.
- Contact sheets (e.g. 1 frame per 0.4 s, tiled) for all 90 s — LOOK at them; plus full-res stills of each scene's key moment. Fix defects, re-render affected ranges, re-check.
- Speed HUD: extract frames at 1, 3, 9, 21, 31, 41, 61, 81, 89 s and confirm the numbers equal the table.
- Audio: integrated LUFS, true peak, no clipping; for each bomboclat cue confirm an onset in the final mix within ±40 ms of its timeline time; confirm the S7 silence window is actually silent (< −50 dBFS music); confirm beat-grid residuals.
- Bomboclat variant table (duration / f0 / processing) showing distinct performances and base = 0.60.
- No character says anything except bombo/bomboclat; captions match audio.

## 11. Final report (your last message — it is all the orchestrator sees)
Path to the mp4; ffprobe summary; measured source BPM + stretch ratio + music excerpt offsets; list of bomboclat events (time, variant, speaker); QA results (pass/fail per item above); every deviation from this brief and why; known weaknesses ranked by how much they hurt the video; how to rebuild (`./build.sh`, preview flags) and render time.
