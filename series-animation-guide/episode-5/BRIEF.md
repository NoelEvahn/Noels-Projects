# Episode 5 — "What if every 2 seconds, you jumped 5× higher?" (DRAFT BRIEF v1, not built)

Format: **DOUBLING with a ×5 multiplier** (master prompt v5 slots 0–8). Film length 96.8 s (story clock 95.2 s + a 1.6 s hook). 1080×1920, 30 fps. Analytics page: `analytics.html` (+ `analytics.data.js`), hook under test: H1 (see `../docs/HOOKS_AND_FORMATS.md`).

## 1. Slots
| Slot | Value |
|---|---|
| TOPIC | What if every 2 seconds, you jumped 5× higher? |
| COUNTER | Jump height, starts at **1 m**, `1 m × 5^floor(t/2)`, exact (BigInt metres), never goes down. Shown with the unit that fits (m, km, million/billion/trillion km, light-years), one comparison tag under the number (table in §3). |
| MULTIPLIER | ×5 every 2 s. The badge reads `×5`. |
| ENDING | The hero leaves the universe, spins it on his finger like a basketball, dribbles, **dunks it**, and drops back into the living room (§6). |
| CATCHPHRASE | **"la peace"** (`assets/la_peace.mp3`), with the OK-hand sign and the mewing face on every speaker that has hands and a face (rules in `../docs/AUDIO_AND_CAST.md`). No bomboclat. |
| MUSIC | Charlie's Inferno, 146 → 150 BPM, ×1.0274, excerpt from 3.030 s (stretched) for 96.8 s. Re-verify the downbeat. |
| CAT GAG | Gerald is **already there** at every stop, unbothered. Chip `GERALD · IMPRESSED: NO` never changes. Final callback: he pushes the universe off the table (§4). |
| HOOK | **H1 flash-forward + rewind** (the dunk), **H4 loop**. Experiment against ep2's H2. |

## 2. Clock and hook edit
- **Story clock** `T` runs 0 → 95.2 s. All times in this brief are story time unless marked *film*.
- **Film clock = story clock + 1.6 s** (one bar at 150 BPM), so every counter tick stays on the beat. Film length 96.8 s. Build it as an EDL (`episode-4/src/main.js` pattern).

| Film | Story | What |
|---|---|---|
| 0.0–1.2 | 79.8–81.0 | **Flash-forward:** the silhouette at the top of his jump, the ball over the hoop, the slam, the flash, the shockwave ring and flying glass. Slam sound on the first frames. Premise caption on frame 1. Counter reads `HEIGHT: NOT FOUND`. |
| 1.2–1.6 | 81.0 → 0 | **Rewind** (scanlines, ◀◀ badge, reversed whoosh). |
| 1.6– | 0.0– | The story from the 1 m hop. |
- Loop: the last shot has the ball falling out of the bottom of the frame; frame 0 of the film has the ball at the top of the frame in the hoop.
- The timer `⏱` is hidden during the hook and starts at `00:00` on film 1.6.

## 3. Counter maths and tags
`height(n) = 5^n` m at story time `2n` s (n = 0…30). At **62 s (n = 31)** the counter breaks: the value would be 4.66 × 10²¹ m (492,000 light-years); instead the badge shows `×5`, then `×∞`, then `ERROR`, and from 68.4 s the counter reads `HEIGHT: NOT FOUND`. Nothing is shown after 62 s that could be a number.
Comparison tags are true; the Voyager 1 distance (about 170 AU in 2026) and the other landmarks must be re-checked before the build.

| n | Story t (film t) | Height (exact, m) | Shown as | Tag under the number |
|---|---|---|---|---|
| 0 | 0 s (1.6 s) | 1 | 1 m | A HOP |
| 1 | 2 s (3.6 s) | 5 | 5 m | THROUGH THE CEILING |
| 2 | 4 s (5.6 s) | 25 | 25 m | THROUGH THE ROOF |
| 3 | 6 s (7.6 s) | 125 | 125 m | ABOVE THE TREES |
| 4 | 8 s (9.6 s) | 625 | 625 m | ALMOST THE BURJ KHALIFA |
| 5 | 10 s (11.6 s) | 3,125 | 3,125 m | 3.8× THE BURJ KHALIFA |
| 6 | 12 s (13.6 s) | 15,625 | 15.6 km | ABOVE MOUNT EVEREST |
| 7 | 14 s (15.6 s) | 78,125 | 78.1 km | ALMOST SPACE |
| 8 | 16 s (17.6 s) | 390,625 | 390.6 km | IN SPACE |
| 9 | 18 s (19.6 s) | 1,953,125 | 1,953 km | PAST THE ISS |
| 10 | 20 s (21.6 s) | 9,765,625 | 9,766 km | ¾ OF EARTH’S WIDTH |
| 11 | 22 s (23.6 s) | 48,828,125 | 48,828 km | PAST THE SATELLITES |
| 12 | 24 s (25.6 s) | 244,140,625 | 244,141 km | ALMOST THE MOON |
| 13 | 26 s (27.6 s) | 1,220,703,125 | 1.22 million km | PAST THE MOON |
| 14 | 28 s (29.6 s) | 6,103,515,625 | 6.10 million km | 16× EARTH TO MOON |
| 15 | 30 s (31.6 s) | 30,517,578,125 | 30.52 million km | 20% OF THE WAY TO THE SUN |
| 16 | 32 s (33.6 s) | 152,587,890,625 | 152.6 million km | 1 AU = EARTH TO SUN |
| 17 | 34 s (35.6 s) | 762,939,453,125 | 762.9 million km | ALMOST JUPITER |
| 18 | 36 s (37.6 s) | 3,814,697,265,625 | 3.81 billion km | PAST SATURN AND URANUS |
| 19 | 38 s (39.6 s) | 19,073,486,328,125 | 19.07 billion km | PAST NEPTUNE AND PLUTO |
| 20 | 40 s (41.6 s) | 95,367,431,640,625 | 95.37 billion km | PAST VOYAGER 1 |
| 21 | 42 s (43.6 s) | 476,837,158,203,125 | 477 billion km | IN THE OORT CLOUD |
| 22 | 44 s (45.6 s) | 2,384,185,791,015,625 | 2.38 trillion km | 0.25 LIGHT-YEARS |
| 23 | 46 s (47.6 s) | 11,920,928,955,078,125 | 1.26 light-years | OUT OF THE SOLAR SYSTEM |
| 24 | 48 s (49.6 s) | 59,604,644,775,390,625 | 6.30 light-years | PAST PROXIMA CENTAURI |
| 25 | 50 s (51.6 s) | 298,023,223,876,953,125 | 31.5 light-years | 31.5 LIGHT-YEARS |
| 26 | 52 s (53.6 s) | 1,490,116,119,384,765,625 | 157.5 light-years | 157.5 LIGHT-YEARS |
| 27 | 54 s (55.6 s) | 7,450,580,596,923,828,125 | 787.5 light-years | 787.5 LIGHT-YEARS |
| 28 | 56 s (57.6 s) | 37,252,902,984,619,140,625 | 3,938 light-years | PAST THE ORION NEBULA |
| 29 | 58 s (59.6 s) | 186,264,514,923,095,703,125 | 19,688 light-years | THE MILKY WAY BELOW |
| 30 | 60 s (61.6 s) | 931,322,574,615,478,515,625 | 98,441 light-years | ACROSS THE MILKY WAY |


Checkpoints to read off frames: 0 s 1 m · 10 s 3,125 m · 20 s 9,766 km · 30 s 30.52 million km · 40 s 95.37 billion km · 50 s 31.5 light-years · 60 s 98,441 light-years.

## 4. Script

### Narrator (Piper `en_US-ryan-high`, one voice, captions word by word, key words yellow)
| # | Story | Film | Line |
|---|---|---|---|
| n1 | 0.1–3.0 | 1.7–4.6 | "What if every two seconds, you jumped five times higher?" |
| n2 | 15.6–18.0 | 17.2–19.6 | "At this point, he was technically in space." |
| n3 | 41.6–46.0 | 43.2–47.6 | "Voyager 1 took almost fifty years to get here. He took forty seconds." |
| n4 | 53.2–55.4 | 54.8–57.0 | "Nobody had told physics about this." |
| n5 | 60.4–62.7 | 62.0–64.3 | "Then, he stopped following the rules." — time the word "rules" to land on **62.0**, the counter break. |
| outro | 91.6–95.0 | 93.2–96.6 | "Share this with someone who always aims too high." (blank words yellow) |

### Gerald roasts (pink-orange captions, ≤ 2 s, none inside 77.6–80.0)
| # | Story | Gerald is | Line |
|---|---|---|---|
| r1 | 4.4–5.8 | already on the chimney as the hero comes through the roof | "Gerald was already on the roof." |
| r2 | 11.6–12.8 | on the very tip of the Burj Khalifa | "Gerald was higher." |
| r3 | 19.6–21.0 | inside the ISS cupola, nose on the glass | "Gerald stowed away." |
| r4 | 27.6–29.0 | sitting on the Moon, which tumbles away under him | "Gerald stayed on the Moon." |
| r5 | 36.8–38.2 | loafing on Saturn's ring | "Gerald had been to Saturn." |
| r6 | 58.4–59.9 | floating in open space in a suit and tie, a briefcase drifting beside him | "Gerald dressed for the occasion." |
| r7 | 89.6–91.4 | on the coffee table, nudging the toy ball (the universe) off the edge | "Gerald pushed the universe off the table." |
Silent Gerald cameos (no roast): on the sofa arm (0–2), on Voyager 1's dish (39.2–41.2), on a comet in the Oort cloud (43.6–45.6), on the picnic blanket at the Orion Nebula (55.6–58.0). Log all of them in `assets/library/cat/CAT_BIBLE.md` after the build.

### "La peace" lines (14, all different performances; only characters with a face and hands, plus one radio exception)
| Story | Speaker | Delivery |
|---|---|---|
| 3.2 | Dad, head tilted back at the hole in the ceiling | deep, short |
| 7.6 | Kid, pointing up from the garden | high, quick |
| 10.4 | Tourist on the Burj observation deck | excited |
| 13.6 | Airline pilot, cockpit window | flat, professional |
| 18.4 | ISS astronaut | radio band-pass + squelch |
| 22.4 | Satellite technician on a spacewalk | muffled helmet |
| 26.4 | Astronaut on the Moon next to the flag | slow, low-gravity echo |
| 40.4 | **Voyager 1 (googly eyes, no hands: the one exception)** | tinny deep-space radio, caption only |
| 48.4 | Alien with a telescope on a tiny planet at Proxima | rising, curious |
| 56.8 | Alien picnic family at the Orion Nebula | unison of three |
| 72.0 | **The hero, silhouette, OK hand in outline** | very deep, slow, long reverb tail |
| 83.6 | Mum, back home | angry |
| 84.4 | Mum, dad, kid, grandma in unison | big |
| 88.0 | **The hero, dry, close, deadpan** (the final line) | close mic, no reverb |
The sun puts on sunglasses and the Moon is knocked aside **silently** (open-mouth reactions, no caption).
Overlap check: n3 starts at 41.6, after Voyager's line ends (about 41.5). Roast r2 starts after the tourist (about 11.5). Nothing speaks in 77.6–80.0. Re-run the check on the full timeline table when it is built.

### Silence and music
- The music cuts for 0.8 s at 62.0 (the break), then slams back as he launches at 62.8.
- **True silence 77.6–80.0** (music stem at digital zero): only the dribble thumps and soft footsteps are heard. The dunk slam at 80.0 is the loudest event of the video; the music drops back in on the same frame.

## 5. Parts and shot list (story time; every cut on the 0.4 s grid; 40 shots)
| # | Story | Shot (one idea per shot) | Height tag |
|---|---|---|---|
| **Hook** | film 0–1.6 | Flash-forward dunk + rewind (§2) | |
| **Part 1 · home** | | | |
| 1 | 0.0–2.0 | Living room, medium: the hero hops 1 m, family on the sofa stares, Gerald on the arm with his back turned | A HOP |
| 2 | 2.0–4.0 | Low angle: 5 m jump, his head goes through the ceiling, plaster and dust; dad "la peace" 3.2 | THROUGH THE CEILING |
| 3 | 4.0–6.0 | House exterior: he bursts through the roof, tiles rain; Gerald on the chimney (r1) | THROUGH THE ROOF |
| 4 | 6.0–8.0 | Street from above: neighbours point; kid "la peace" 7.6 | ABOVE THE TREES |
| 5 | 8.0–10.0 | Skyline with the Burj Khalifa small below him | ALMOST THE BURJ KHALIFA |
| **Part 2 · tower and sky** | | | |
| 6 | 10.0–12.8 | Rising past the spire; Gerald on the tip (r2); tourist 10.4 | 3.8× THE BURJ KHALIFA |
| 7 | 12.8–14.8 | Airliner: the pilot looks up (13.6) | ABOVE MOUNT EVEREST |
| 8 | 14.8–18.0 | The sky turns black, the Earth curves, wide; n2 | IN SPACE |
| 9 | 18.0–21.2 | ISS flyby; astronaut 18.4; Gerald in the cupola (r3) | PAST THE ISS |
| **Part 3 · Moon and Sun** | | | |
| 10 | 21.2–23.6 | Ring of satellites; the technician 22.4 | PAST THE SATELLITES |
| 11 | 23.6–26.0 | The Moon grows ahead | ALMOST THE MOON |
| 12 | 26.0–29.2 | He clips the Moon, it tumbles; astronaut 26.4; Gerald stays on it (r4) | PAST THE MOON |
| 13 | 29.2–32.0 | Travel: Earth and Moon small below, face close, hair streaming | 20% OF THE WAY TO THE SUN |
| 14 | 32.0–34.4 | The Sun puts on sunglasses | 1 AU = EARTH TO SUN |
| 15 | 34.4–36.0 | Jupiter | ALMOST JUPITER |
| 16 | 36.0–39.2 | Saturn's rings; Gerald on a ring (r5) | PAST SATURN AND URANUS |
| **Part 4 · Voyager and beyond** | | | |
| 17 | 39.2–41.2 | Voyager 1 with googly eyes passes below; its radio "la peace" 40.4; Gerald on its dish | PAST VOYAGER 1 |
| 18 | 41.2–43.6 | Voyager small below him, face close; n3 starts 41.6 | IN THE OORT CLOUD |
| 19 | 43.6–45.6 | Oort cloud: icy rocks bounce off him; Gerald on a comet | 0.25 LIGHT-YEARS |
| 20 | 45.6–48.0 | The Sun is now one star among many | OUT OF THE SOLAR SYSTEM |
| 21 | 48.0–50.4 | Proxima: an alien with a telescope on a tiny planet (48.4) | PAST PROXIMA CENTAURI |
| 22 | 50.4–53.2 | Star streaks, his face close | 157.5 LIGHT-YEARS |
| **Part 5 · stars and galaxy** | | | |
| 23 | 53.2–55.6 | Nebula colours; n4 | 787.5 LIGHT-YEARS |
| 24 | 55.6–58.0 | Orion Nebula: an alien picnic on a pillar, Gerald on the blanket; 56.8 | PAST THE ORION NEBULA |
| 25 | 58.0–60.4 | The Milky Way spiral below; Gerald floats past in a suit (r6) | ACROSS THE MILKY WAY |
| **Part 6 · the break** | | | |
| 26 | 60.4–62.8 | He crouches on nothing; n5; at 62.0 the counter shows `×5 → ×∞ → ERROR`; music cut | ERROR |
| 27 | 62.8–65.2 | The launch: shock ring across the galaxy, speed lines, the camera drops away | |
| 28 | 65.2–68.4 | **The one montage (0.8 s per step):** Milky Way → Local Group → cosmic web → the observable universe as a glowing ball | |
| **Part 7 · outside the universe** | | | |
| 29 | 68.4–70.8 | Black void; the universe-ball hovers; a black silhouette steps into frame, rim-lit by the ball | HEIGHT: NOT FOUND |
| 30 | 70.8–73.6 | One finger up: the ball lands on the fingertip and spins up; the camera orbits; "la peace" 72.0 with the OK hand in outline | |
| 31 | 73.6–76.0 | Tricks: across the shoulders, behind the back, back to the finger | |
| 32 | 76.0–79.2 | **Dribble and steps** (§6) | |
| 33 | 79.2–81.2 | **The dunk** (§6) | |
| 34 | 81.2–82.8 | **Drop and dive** back into the universe, down to the house (§6) | |
| **Part 8 · home** | | | |
| 35 | 82.8–85.2 | The living room, looking up through the roof hole: he falls through, colour floods back; the ball drops after him and bounces to rest; mum 83.6, the family in unison 84.4 | |
| 36 | 85.2–87.6 | Medium: he dusts his shoulder, the kid picks up the ball (a faint swirl on it), Gerald on the table | |
| 37 | 87.6–89.2 | Close, one beat of silence, then **"la peace."** at 88.0 (mew face, OK hand) | |
| 38 | 89.2–91.6 | Gerald nudges the ball off the table (r7) | |
| 39 | 91.6–95.2 | Freeze on the hero's la peace pose, title card **WHAT IF YOU JUMPED 5× HIGHER EVERY 2 SECONDS?**, `FINAL HEIGHT: NOT FOUND`, the outro line, the ball falls out of the bottom of the frame (loop) | |

Rules kept: shots ≥ 1.6 s except the hook and the one montage; one caption at a time; captions off faces; the counter band stays clear; the hero is in every shot or something clearly about him is.

## 6. The dunk, exactly (shots 32–34, story 76.0–82.8)

### What the viewer sees
A black silhouette in an empty black void, lit only by the glow of the universe in his hands. He dribbles the universe like a basketball, takes more steps than the rules allow, rises under a floating hoop and slams it through with so much force the backboard turns to stars and a shockwave rolls out through the void.

### The set (everything is geometry, no textures)
- **Floor:** a huge near-black glossy plane, no horizon. It shows only: a soft pool of ball light under him, and a thin ring that pulses outward from every foot or ball contact (cyan, 0.4 s life).
- **Hero silhouette:** the normal hero rig with every material overridden to pure black (unlit), plus a thin rim-light in the ball's warm orange on the side facing the ball and a faint cold blue rim from behind. The **yellow headband stays a dim emissive yellow** so he is still him, and the hair/hood outlines read. This is a deliberate, user-requested exception to the "never a silhouette" defect rule; it applies to shots 29–34 only. The OK-hand pose (shot 30) is large and clear in outline.
- **The universe-ball:** radius 0.12 m (basketball scale). A dark translucent shell with a fresnel rim; about 3,000 instanced glowing points in cosmic-web filaments (seeded random walks); eight emissive seam lines so it reads as a basketball even in outline; a point light inside it (warm, strong). It is the main light in shots 29–34.
- **The hoop:** a gold-white torus (inner diameter 0.45 m) at 3.05 m, a net of 24 light threads, a 1.8 × 1.05 m glass backboard. It floats, held by nothing. The backboard is pre-fractured into 14 seeded pieces.

### Shot 32 · dribble and steps (76.0–79.2, 3.2 s) — tracking shot
Camera: low, 5 m away at 30° off his front, tracking him left to right, a slow push-in from a wide (he is small, the hoop far away) to a medium by 79.2. It pans into him: that is the pan from the idea.
| Story | Action |
|---|---|
| 76.0 | The ball drops off his finger into his palm. Hold. |
| 76.4 | First dribble: the ball hits the floor (ring, soft low thump). Bounce period is 0.4 s (one beat) from here. |
| 76.8 | Step 1 (the ring under his foot). |
| 77.2 | Dribble 2. |
| **77.6** | **Music out.** Only thumps and soft taps. Step 2 (he is travelling). |
| 78.0 | Dribble 3. Text flag appears over the empty space on the left, away from his face: `TRAVELLING?` (yellow, 1.2 s, text only). |
| 78.4 | Step 3. |
| 78.8 | Dribble 4 (the last, hard). |
| 79.2 | Step 4: the plant. His knees bend, the ball goes up into both hands. |
The dribble is a deterministic parabola per bounce (seeded, no physics engine). Hand and ball contact: the ball is parented to the palm while held, free between.

### Shot 33 · the dunk (79.2–81.2, 2.0 s) — one continuous shot
Camera: very low (0.4 m above the floor), 6 m from the hoop, 24 mm look, looking up at the rim so the hoop, the glass and the black void fill the frame; a slow tilt up with him.
**Action clock** (video time → action seconds `A`, linear between keys). The jump itself takes 0.40 action seconds; the video stretches the apex:
| Video t | A | What |
|---|---|---|
| 79.2 | 0.00 | The plant; ring pulse; squash (legs 0.85); slow-motion starts ramping in |
| 79.4 | 0.16 | He leaves the floor, the ball swings behind his head |
| 79.8 | 0.24 | **The apex hang** (about 5× slow motion): back arched, ball in his right hand above the rim, the headband glints |
| **80.0** | **0.40** | **The slam: the ball goes through the net exactly on the beat** |
After 80.0 the action clock runs at 1×.
Impact, frame by frame (30 fps; 80.0 = story frame 2400):
| Frames after 80.0 | What |
|---|---|
| 0 | The rim bends 8 cm down (damped spring, 14 Hz, 0.6 s), the net whips up, the ball squashes. A white flash: full screen, 2 frames at full, then decay over 10 frames (12 frames total). The music slams back; the boom hits. |
| 0–4 | The backboard cracks from the contact point and bursts into 14 shards; each shard is an emissive star-like fragment with a short trail. |
| 2–20 | **The shockwave:** a tall glowing ring (a torus about 0.4 m thick) expands from the hoop to 40 m radius in 0.8 s (ease-out), with debris sparks; it ripples the floor (a travelling sine displacement) and passes the camera around 80.4. |
| 0–15 | Camera shake: seeded noise, 12 cm, decaying over 0.5 s, plus a 0.8 m push back. |
| 0–12 | A yellow `+2` pops above the hoop (basketball score, ×5-badge style) and stays to 81.0. It must not touch his body or the counter. |
| 12 (80.4) | He hangs from the rim with both hands, silhouette swinging, the rim light flickering from the ring. |
| 24 (80.8) | He drops and lands in a superhero crouch, one fist on the floor, a ring pulse. |
Sound: sub drop (45 Hz sine, 1.2 s), noise crack, glass shatter, a long tail; the biggest event of the whole video, about 3 dB above the loudest other sound. No voice.

### Shot 34 · drop and dive (81.2–82.8, 1.6 s) — the way back home
| Story | What |
|---|---|
| 81.2 | The ball falls out of the net. Camera follows it down. |
| 81.6 | It bounces once on the floor (ring), the camera low behind it. |
| 82.0 | The bounce brings the ball to the lens: the frame fills with its glow, then the camera passes through the shell into the filaments. |
| 82.0–82.8 | A fast push-in through the scale ladder, one landmark per beat: the cosmic filaments (82.0), a spiral galaxy and the Earth (82.4), the roof of the house, with the hole in it (82.8). Cut on the hole. |
Shot 35 starts looking up through the same hole from inside the living room, so the blue sky is continuous across the cut.

### The colour comes back
In shot 35 he falls through the hole; the black wash is a material blend (0 → 1 over the first 0.8 s of the shot, driven by his height in the hole) so he turns red-hoodied as he crosses the sunlight.

### Build list
Exists in the library (verify against `INDEX.md`): `world.js` `makeEarth`, `makeMoon`, `makeGalaxy`, `solarSystem`, `landmark('burj')`, `skyline`; `sky.js` airliner; `home.js` living-room props; the hero, family, Gerald and the OK-hand/mewing poses.
New, to add to the library with code and a screenshot: universe-ball (+ cosmic-web ladder), hoop/backboard/net and the shatter FX, silhouette material, Voyager 1, ISS, satellite ring, sunglasses Sun, Saturn rings, Oort rocks and comet, Orion nebula pillar, aliens (two), pilot, tourist, Gerald's suit and briefcase.

## 7. Risks and checks specific to this episode
- 30 jump shots can feel samey: every shot has its own landmark, gag and camera angle.
- Space shots: keep the hero large in frame (distance to landmarks is faked); the 60 px side margins and the counter band apply to all tags.
- The silhouette must still be readable as the hero on a phone screen: check the headband and the OK hand at full resolution.
- Hook: confirm the flash-forward frame 0 shows the hero big, the ball and the caption, and is not a white frame.
- The slam and music-return must be sample-aligned (±40 ms) with story frame 2400.
- Check against `../docs/LOOK_AND_VIDEO.md` defect checklist and `../docs/HOOKS_AND_FORMATS.md` hook checklist. After posting, fill in `analytics.data.js` and compare the skip rate with ep2.
