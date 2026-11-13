# VIDEO SERIES MASTER PROMPT v2 — "What if every X, Y doubled?"

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
5. MUSIC:        attached track name
6. EXTRA GAGS:   optional

ATTACHED: (a) catchphrase sound effect, (b) music track, (c) optional look reference image
          (a contact sheet of a previous episode).
Attach the audio again in every new session; files from older sessions can't be reached.
```

## Instructions to Claude

### Workflow
1. Read this prompt and any attached files. Check the toolchain in the session scratchpad. Never add anything to the repository.
2. Plan the episode yourself, then write a detailed brief: beat grid, exact counter maths, a shot list of at least 110 shots, the voice table, the narration, a defect checklist, and the report format. Give the builder starter character code (the episode-1/2 rig: hero, mum, dad, kid, grandma and the other presets) and the look reference.
3. An **Opus 5.5 high-effort subagent** builds the whole thing. It must provide partial re-render tools (frame ranges, preview scale) so fixes stay cheap.
4. When it finishes, check the format, the counter and the contact sheets yourself.
5. Then run a **Sonnet 5.5 high-effort review subagent**. It only reviews and never writes code.
6. Send the user v1 and the review straight away. Then do one fix round with the builder, check it again and send v2. Keep v1 as a backup.
7. Start immediately. Ask questions only if a slot is missing.

### Format
- Vertical 9:16, 1080×1920, 30 fps, H.264 High + AAC-LC stereo 48 kHz.
- Exactly 90.0 s (2700 frames), finished MP4.

### Story shape — keep the escalation, VARY THE CONTENT EVERY EPISODE
The seven-step scale is fixed. What happens inside each step must be new for every topic.

1. **Home** (0–9.6 s): the premise discovered in front of the family. The family may stay, but find a new room or situation each time (kitchen dinner, bathroom, garage, garden BBQ, car ride, bedroom…).
2. **The home or street can't contain it** (9.6–20.8 s): he leaves.
3. **A public place he gatecrashes** (20.8–32 s): a different place every episode. Used so far: stadium race (ep1), auction (ep2). Other options: wedding, school assembly, talent show, museum, supermarket, airport, cinema, zoo.
4. **City or state scale, and the authorities react** (32–44.8 s). The "who reacts" must change every episode. Used so far: TV reporter plus government room (ep1), reporter plus bank room (ep2). Other options: firefighters, scientists in a lab, a weather presenter, the army, an influencer livestream, a sports commentator, a museum curator, a police chase.
5. **A natural extreme** (44.8–57.6 s): ocean was used in ep1 and ep2. Next time pick another: desert, volcano, jungle, arctic, sky and clouds, underground caves.
6. **Planet scale** (57.6–75.2 s): space and Earth, plus a world montage. Change the montage device each time. Used so far: news-anchor grid. Other options: phone video calls, billboards, a global group chat, a stadium jumbotron, social-media feed tiles.
7. **Silence, then the ENDING slot, then a cosmic pull-back** (75.2–90 s): everyone reacts, he comes home, delivers the catchphrase deadpan, then a freeze-frame title card with the final value.

Rules:
- Max **2 recurring tropes** per episode (reporter, government/bank room, fisherman, astronaut, house exterior, a crowd field of the cast). Any trope that does return must look and play differently: a new angle, a new gag, a new set.
- Every location must be recognisable within 0.3 s and must suit the TOPIC. The topic's props drive the gags; episode 2 went pennies → avalanche → bills → briefcases → SOLD tags.

### Shot density — 1.5× episode 2
- **At least 110–125 shots in 90 s**, averaging about 0.75 s, every cut on the 0.4 s grid (0.2 s in montages).
- Cover the same scene from several angles: wide establishing shot → medium → close-up → insert → reaction → over-the-shoulder → top-down.
- No shot over 2.0 s unless the camera is moving and a new gag is landing.
- **An insert that must be read stays on screen at least 0.6 s.** In ep2 the "SOLD $163.84" board flashed for only 5 frames.
- Key props must first appear in a **wide or establishing shot** before their close-ups. In v1 of ep2 the auction duck was never shown.

### Detail level — keep episode-2 quality (the user said the detail was really good)
- Fully dressed sets: no plain boxes or walls.
- Characters with big eyes, brows, mouths and exaggerated reactions.
- Instanced props in large numbers (coins, bills, debris, crowds).
- Per-location palettes, soft shadows, a warm key light and ACES tone mapping.
- The hero is identical everywhere: red hoodie, blue shorts, white sneakers, messy brown hair, yellow headband.
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

### Narrator
- Five short deadpan lines, in scenes 1, 2, 4, 5 and 6: the premise first, then dry understatements.
- Piper TTS (en_US-ryan-high), mixed quietly inside the music.
- Captions word by word in white, with key words in yellow. Check with ASR that the audio matches the captions.

### Music and edit
- Measure the tempo by beat regression or comb search, not librosa's single number.
- Time-stretch the track, pitch kept, so every counter change lands on a beat. Charlie's Inferno: 146.0 → 150 BPM, ×1.0274.
- If the downbeat is ambiguous, say what was chosen.
- Every cut, caption, line and impact sits on the grid.
- Scene 7: the music filters down, about 2 s of true silence (the music stem at digital zero), then slams back on the big moment. Record scratch at the freeze-frame.

### Mix (approved levels)
| Item | Level |
|---|---|
| Master | −14 LUFS integrated, true peak ≤ −1 dBTP after AAC (limiter ceiling about −3.2 dB, gain reduction ≤ 6 dB), no clipping |
| Catchphrase lines | about −20 LUFS each before the master; the final crowd 3 dB louder, the loudest moment of the video |
| Narration | about −16.5 LUFS |
| Music ducking | about 5 dB under narration, about 2.5 dB under lines |
| Sub-bass | none in the voices |

Sound effects must never bury speech.

### Defect checklist (from episodes 1–2 — the builder AND the reviewer check every item)
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
- Format, duration and frame count.
- Read the counter off frames at about 14 checkpoints and compare with the maths.
- Contact sheets of the whole video (one frame per 0.4 s) and full-res stills of every key gag, all looked at, with the checklist applied.
- Loudness, true peak after AAC, line onsets within ±40 ms, digital silence in the scene-7 window, beat-grid fit, the pitch table, narration ASR.
- Report honestly what is rough, what was not checked, and that nobody can listen to the audio.
- Tell the user the files live in the session scratchpad and must be downloaded.
