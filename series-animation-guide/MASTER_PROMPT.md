# VIDEO SERIES MASTER PROMPT v3 — "What if every X, Y doubled?"

Fill in the slots, attach the files, and send.

```
SLOTS (fill these in)
1. TOPIC:        What if every [INTERVAL], [THING] doubled / you [ACTION] 2x [MORE]?
                 e.g. "What if every 2 seconds, your money doubled?"
2. COUNTER:      what the on-screen number measures + START VALUE + unit + INTERVAL
                 e.g. "bank balance, starts at $0.01, doubles every 2 s, always show cents"
3. ENDING:       the one big final act in scene 7
                 e.g. "he presses BUY: EVERYONE"
4. CATCHPHRASE:  the only word(s) characters may say (attach the sample)
                 + PITCH (default: two registers, 1.10x and 1.15x the sample)
                 Library samples: "bomboclat" / "bombo" (assets/bomboclat.mp3) or "la peace" (assets/la_peace.mp3).
                 Not every episode is bomboclat: use the one the user names.
5. MUSIC:        attached track name
6. CAT GAG:     Gerald's bit for this episode (new location + new unbothered action in every scene,
                 his own stat for the HUD chip, and the final callback). See "Gerald" below.
7. EXTRA GAGS:   optional

ATTACHED: (a) catchphrase sound effect, (b) music track, (c) optional look reference image
          (a contact sheet of a previous episode).
The audio and look reference live in `series-animation-guide/assets/` (bomboclat.mp3, la_peace.mp3, charlies_inferno.mp3, look_reference.jpg);
use them unless new files are attached.
```

## Instructions to Claude

### Workflow
1. **Check the asset library first.** Read `series-animation-guide/assets/library/INDEX.md` (characters, animals, props, sets, FX, hand/hold/sit APIs, screenshots) and `assets/library/cat/CAT_BIBLE.md` (Gerald the recurring cat and his episode log). Import what exists instead of rebuilding it. Anything new you build (character, prop, set, FX) goes into the library with code **and** a screenshot (add it to `registry.js`, regenerate screenshots, update `INDEX.md`). The hero and family never change.
2. Read this prompt and any attached files. Check the toolchain in the session scratchpad (node deps and Python venv live outside the repo). The repo may only receive content for `series-animation-guide/` (the library, episode folders, this prompt, the README); work directly on `main`, per the repository's `CLAUDE.md`. Never add anything else, and never name anything after the repository.
3. Plan the episode yourself, then write a detailed brief (`episode-N/BRIEF.md`): beat grid, exact counter maths, a shot list of about 30–45 shots (2–3 s each, see Pacing), the voice table, the narration, the Gerald plan, a defect checklist, and the report format. Put every spoken event (story narration, Gerald roasts, catchphrase moments) on one timeline table on the 0.4 s grid first and check that nothing overlaps.
4. A **Sonnet 5.5 high-effort executor** subagent builds the whole thing (when the user says "just two people", the orchestrator builds it itself and the Opus advisor only reviews). It must provide partial re-render tools (frame ranges, preview scale) so fixes stay cheap.
5. When it finishes, check the format, the counter and the contact sheets yourself.
6. Then run an **Opus 5.5 medium-effort advisor** subagent. It only reviews and advises and never writes code.
7. Send the user v1 and the review straight away. Then do one fix round with the executor, check it again and send v2. Keep v1 as a backup.
8. Start immediately. Ask questions only if a slot is missing.

### Format
- Vertical 9:16, 1080×1920, 30 fps, H.264 High + AAC-LC stereo 48 kHz.
- The story runs about 90 s; the ending payoff and the **share outro** may take it to about 100 s (episode 3 is 100.0 s). Set the length in `timeline.js` (`DUR`, `FRAMES`) and in `.videohub/project.json` (`render.env.DUR`, `live.dur`).
- Deliver two files: the 1080p render from VideoHub and a 720p copy (under 30 MB, so it can be sent to the user's phone).

### Story shape — keep the escalation, VARY THE CONTENT EVERY EPISODE
The seven-step scale is fixed. What happens inside each step must be new for every topic.

1. **Home** (0–9.6 s): the premise discovered in front of the family. The family may stay, but find a new room or situation each time (kitchen dinner, bathroom, garage, garden BBQ, car ride, bedroom…).
2. **The home or street can't contain it** (9.6–20.8 s): he leaves.
3. **A public place he gatecrashes** (20.8–32 s): a different place every episode. Used so far: stadium race (ep1), auction (ep2). Other options: wedding, school assembly, talent show, museum, supermarket, airport, cinema, zoo.
4. **City or state scale, and the authorities react** (32–44.8 s). The "who reacts" must change every episode. Used so far: TV reporter plus government room (ep1), reporter plus bank room (ep2). Other options: firefighters, scientists in a lab, a weather presenter, the army, an influencer livestream, a sports commentator, a museum curator, a police chase.
5. **A natural extreme** (44.8–57.6 s): ocean was used in ep1 and ep2. Next time pick another: desert, volcano, jungle, arctic, sky and clouds, underground caves.
6. **Planet scale** (57.6–75.2 s): space and Earth, plus a world montage. Change the montage device each time. Used so far: news-anchor grid. Other options: phone video calls, billboards, a global group chat, a stadium jumbotron, social-media feed tiles.
7. **Silence, then the ENDING slot, then a cosmic pull-back** (75.2–90 s): everyone reacts, he comes home, delivers the catchphrase deadpan.
8. **Payoff and title** (about 88–97 s): the last holdout turns (ep3: Gerald finally loves him), then the title card with the final value.
9. **Share outro (EVERY new episode, last 3–4 s):** the narrator says **"Share this with someone who ____"**, with the blank tied to this episode's topic (e.g. money: "…someone who spends it all in two seconds"; love: "…someone who needs twice as many people to love them"). Same Piper narrator and caption style (blank words in yellow), over the title card or a final shot of the hero looking into the camera. Music stays under it; no SFX. Put it on the speech timeline table like any other line.

Rules:
- Max **2 recurring tropes** per episode (reporter, government/bank room, fisherman, astronaut, house exterior, a crowd field of the cast; Gerald does not count). Any trope that does return must look and play differently: a new angle, a new gag, a new set.
- Every location must be recognisable within 0.3 s and must suit the TOPIC. The topic's props drive the gags; episode 2 went pennies → avalanche → bills → briefcases → SOLD tags.

### The hook (first 2–3 s decide if people keep watching)
- Open on the hero, already close: a short white flash, a snap zoom onto him (ease-out), a topic-matched burst (ep3: heart confetti at 0.1 s and again on the first doubling) and small rising decorations behind him (never in front of his face). The counter and the premise line are on screen from frame 1.
- No SFX in the first 2.4 s; the music eases in over 2 s. The first sound the viewer hears is the narrator's premise.

### Show the effect on people (user feedback on episode 3: "it looks like nothing's happening")
- Every doubling must be visible on people: they change the moment they see him (ep3: their eyes become hearts, `face({ hearts })`), then they **go to him**: follow him, chase him, rush him when his act ends. Bystanders who just stand and cheer read as "nothing happening".
- Followers walk in slots behind the hero (rows and lanes); nobody stands on his path, and nobody walks through him, a prop or each other. Move props and named characters off the hero's path.

### Keep the premise on screen (user feedback on episode 3: "it drifts off, no meaning, too crowded")
- **Every shot must show the hero, or something that is clearly about him** (his face on a billboard, a meter measuring him, a crowd turned toward him). The viewer must always see *why the number doubled*.
- Cut random gag shots that don't involve him (traffic, marching bands, school buses, strangers' close-ups). A gag earns its place only by showing more people loving *him*.
- Crowds frame the hero; they never replace him. No close-ups of random crowd faces. Gerald's shots are the only exception, and he stays near the hero's location.
- Each scene's escalation reads in one wide shot: hero in frame, the new, bigger group of lovers around him, the counter above.

### Pacing — READ THIS FIRST (user feedback on episode 3: "way too fast, confusing")
Episode 3 v1 cut every ~0.7 s and the user rejected it: confusing, text overlapping, glitchy backgrounds, unreadable sets. **Episodes 1 and 2 held each shot about 2–3 seconds, and that is the target.**
- **Average shot length 2.0–3.0 s; about 30–45 shots in 90 s.** Every cut on the 0.4 s grid. **No shot shorter than 1.6 s**, except at most one 3–4 shot montage per episode (min 0.8 s each). No more than 3 shots per scene beat unless the shots are long.
- **One idea per shot.** A shot shows one gag landing clearly: establish (wide, ≥ 2 s), then one medium or close-up, then the reaction. Let each gag play out before cutting. A reader must be able to say what happened in each shot.
- An insert that must be read (board, sign, result) stays on screen at least 1.5 s. Key props first appear in a wide shot.
- Cameras move slowly (push-ins, slow pans), never whip around. No fast zooms except the single punch-zoom before a voiced line.
- Voiced lines: the speaker is on screen for the whole line plus 0.4 s before and after.

### Layout and text (no overlaps, no glitches)
- Never let two pieces of text overlap, and never let text sit on a face, a board, a chyron or the counter. One caption at a time. Narration captions, voice captions and Gerald roasts must never be on screen together (check on the timeline table).
- Faces stay below the counter / tag / chip band (top ~30 % of the frame). Heart tags, banners and effects must also stay out of that band.
- Test every shot at full resolution (still frames) for: flickering or z-fighting surfaces, objects clipping through walls or characters, floating or half-built props, pop-in, black gaps, instanced crowds showing blank faces from the front.
- **Sets must be complete and logical.** A theatre or stadium needs real seats that people sit in, aisles, a visible stage/pitch, and people facing the right way; check the establishing shot as a viewer would. If a set cannot be made believable, choose a simpler location.

### Detail level — keep episode-2 quality (the user said the detail was really good)
- **Never add textures** (user rule). Detail comes from modelled geometry, shapes, colour and light, not image, bump or normal maps or surface patterns. Canvas only for readable text on signs, boards and screens.
- Fully dressed sets: no plain boxes or walls. Use the library's sets and characters; held items sit in the palm (`hold()`), seated characters sit on a seat (`POSES.sitOn`), nothing clips.
- Characters in the episode 1-2 look (see "Series look" below) with big brows, mouths and exaggerated reactions.
- Instanced props in large numbers (coins, bills, debris, crowds).
- Per-location palettes, soft shadows, a warm key light and ACES tone mapping.
- The hero is identical everywhere: red hoodie, blue shorts, white sneakers, short curly brown hair, yellow headband.
- The look matches the attached reference.

### The counter
- `value(t) = START × 2^floor(t / INTERVAL)`, exact (BigInt), with thousands separators and the right decimals or units.
- It changes on schedule for the full 90 s and never goes down.
- **HUD:**
  - `⏱ 00:00` timer above a huge yellow Anton number with a thick black outline.
  - A small tag line under it, with true comparison tags at real-world thresholds.
  - The final value appears on the title card.
- **Each change:** a punch, a ×2 badge and a light shake, plus a short topic-matched sound (a cha-ching for money) and a soft hit. It should never get tiring.
- Bigger hits on tier changes (thousand, million, billion…).
- The ×2 badge and the punch-scale must stay inside the 60 px side margins.

### The catchphrase rule
- Characters only ever say the CATCHPHRASE or its short form. The narrator is the only normal speech.
- All lines are built from the attached sample, at the PITCH slot (default 1.10× and 1.15× registers, measured within ±3% against the same syllables of the source).
- About 1.2× faster than the sample. Nothing slow except one slow-motion scream layered under the final crowd.
- Give each speaker a different delivery: excited, disbelief, confused, deadpan, broadcast or radio, small group, big crowd, whole-world crowd.
- **About 14 voiced lines.** Every other reaction is silent open-mouth shock with no caption.
- Each voiced line gets a punch-zoom, mouth movement synced to the audio, and a big yellow caption.
- **"La peace" episodes:** every character who says it does the OK hand sign beside the face and a mewing face (chin up, lips closed tight, low lids, sharp brows): `ch.pose(POSES.laPeace(t))` + `ch.face(FACES.mew)`. Keep the mouth closed except a small open on the syllables. Captions read "LA PEACE" / "LA PEACE!". The sample is 1.1 s (the first "la peace" of the source).

### Gerald — the recurring cat (cast, not a trope)
- Gerald (`ANIMALS.gerald`, orange tabby, half-lidded eyes) appears in **every scene** of every episode, shown in a wide/establishing shot first, doing something unbothered that suits the location. He is never counted, never impressed, never speaks or meows (no audio from him).
- **Narrator roasts:** 4–7 extra deadpan lines of 2 s or less ("Gerald remained unconvinced."), one per appearance, mixed like the narration, captions in pink-orange with the key word yellow. Never repeat a roast from an earlier episode; log every line and gag in `cat/CAT_BIBLE.md`. If they will not fit the speech timeline, cut roasts (to 4–5), never the story lines. Keep roasts out of the scene-7 silence window.
- **HUD chip:** a small chip near the counter shows Gerald's own stat for the topic (ep3: `GERALD · LOVES YOU: NOT YET`). It holds while the counter explodes and may flip once, at the payoff (ep3: `YES ♥`). It stays inside the 60 px side margins and out of the top 110 px / bottom 300 px.
- **Final callback:** Gerald is in the closing room and in the title card; he is the holdout until the payoff (ep3: he finally loves the hero, claps, fist-bumps him and they walk off paw in hand). Build callbacks to earlier episodes. Family-safe: he is never harmed, he is always the calm one.

### Narrator
- Five short deadpan lines, in scenes 1, 2, 4, 5 and 6: the premise first, then dry understatements.
- Piper TTS (`en_US-ryan-high`, the episode 1-2 voice), natural pace via `--length-scale`, de-essed, mixed quietly inside the music.
- Captions word by word in white, with key words in yellow. Check with ASR that the audio matches the captions.

### Music and edit
- Measure the tempo by beat regression or comb search, not librosa's single number.
- Time-stretch the track, pitch kept, so every counter change lands on a beat. Charlie's Inferno: 146.0 → 150 BPM, ×1.0274.
- If the downbeat is ambiguous, say what was chosen.
- Every cut, caption, line and impact sits on the grid.
- Scene 7: the music filters down, about 2 s of true silence (the music stem at digital zero), then slams back on the big moment. A soft chord on the title card (the record scratch was dropped in ep3).
- **Library clips:** `assets/library/clips/` (e.g. `clap_cat.webm`, the keyed clapping black cat from episode 3, with its sound). Extract with `tools/clip_frames.py` and place with `fx/clip.js` `clipCard()`.
- **User-supplied clips** (e.g. a green-screen meme): store the source in `episode-N/media/`, key it with ffmpeg `chromakey` + `despill` into 30 fps PNG frames (`audio/make_clip.py`), and play it on a camera-facing card in the 3D set, one frame per video frame (deterministic). While it plays: only the clip's own sound and the music (ducked about 9 dB while the clip has sound), no narration, no SFX.

### Mix (approved levels)
- **SFX stay well under everything** (user: "SFX way too loud"). No whoosh on every cut; at most a barely audible air on a cut. The SFX bus sits about 8 dB below the old episode-3 mix.
- **Narrator voice = Piper `en_US-ryan-high`, as in episodes 1-2** (user: "perfect"). Natural speed; fit long lines with Piper's `--length-scale`, never time-stretch (that made episode 3 v1 sound robotic). De-ess the S sounds.

| Item | Level |
|---|---|
| Master | −14 LUFS integrated, true peak ≤ −1 dBTP after AAC (limiter ceiling about −3.2 dB, gain reduction ≤ 6 dB), no clipping |
| Catchphrase lines | about −20 LUFS each before the master; the final crowd 3 dB louder, the loudest moment of the video |
| Narration | about −16.5 LUFS |
| Music ducking | about 5 dB under narration, about 2.5 dB under lines |
| Sub-bass | none in the voices |

Sound effects must never bury speech.

### Defect checklist (from episodes 1–2 — the executor AND the advisor check every item)
- **Camera and framing:**
  - Cameras inside walls or characters.
  - Heads, faces or eyes under the counter or tag line.
  - Background heads too.
  - Faces cut off at frame edges.
- **Text:**
  - Captions on faces, boards, chyrons or fingers.
  - Chyrons and screen text cut off; they must auto-fit.
  - Boards shown at an angle or cropped. Boards must be head-on, centred, and must update on screen when the story says they do.
- **Grids and split screens** fill the frame evenly, with no black gaps or half-cut cells.
- **Props and characters:**
  - Phones and screens face the camera.
  - Tags and labels go above heads, not on faces.
  - The hero must never be backlit into a silhouette; add front fill light.
- **Effects:**
  - The big shockwave is a tall glowing ring with debris, bending trees and a flash of 10 or more frames, not a flat disc.
  - Water reads as water; no tube wakes.
  - Trees are rounded, not spikes.
- **Sets:** no plain box sets (houses, mansions, rooms); no shots of mostly wall (stairs); distant subjects (jets, ships) shot close.
- **Determinism:** every frame is a pure function of its frame index, so re-rendered frames match exactly.

### Quality checks before delivery
- Look at EVERY shot as a viewer: one still at the start and one at the end of each shot, full resolution. Review the contact sheet at one frame per 0.8 s as well, and fix anything confusing, overlapping or glitchy before sending.
- Format, duration and frame count.
- Read the counter off frames at about 14 checkpoints and compare with the maths.
- Contact sheets of the whole video (one frame per 0.4 s) and full-res stills of every key gag, all looked at, with the checklist applied.
- Loudness, true peak after AAC, line onsets within ±40 ms, digital silence in the scene-7 window, beat-grid fit, the pitch table, narration ASR.
- Report honestly what is rough, what was not checked, and that nobody can listen to the audio.
- Render through VideoHub (`hub_render`, full). If headless Edge fails, set `render.env.CHROME` to the Chrome path. Then make the 720p copy and send it to the user.


## Series look and camera (user feedback, 2026-11-19)
- Characters keep the episode 1-2 look: big round head, white ball eyes with plain black dot pupils (no iris colour, no catchlights), bulb nose, thick brows, ball hands. No anime eyes. The older detailed rig lives in `assets/library/archive/detailed-2026-11/`.
- Frame people up front: medium and close shots on the main character, every shot eases and slowly pushes in (`common.js` `pick` applies CLOSE/PUSH). Wide shots only for maps, planets and space (`wide: true`).
- Keep scenes simple: few people on screen, no crowded wides. Open the film on the hero, no SFX in the first seconds.

- **Vertical frame is narrow:** at 3 m a head fills about two thirds of the width. Faces: 3–4 m away or a medium shot; never a single face from 1–2 m.
- **Moving hero:** use tracking shots locked to his position (`follow(t, hp)` in `episode-3/src/scenes/s2.js`) so he never runs out of frame; a linear camera move cannot keep up with an accelerating hero.
- **Hide anything within about 1.1 m of the lens** (crowd members walking past the camera fill the frame or turn it black).
- Check a full contact sheet after every camera change; the global CLOSE factor can push a camera into a person (black frame) or crop a short character (the kid).
