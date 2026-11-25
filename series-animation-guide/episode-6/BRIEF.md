# Episode 6 — WHAT IF YOU GOT 2× TALLER EVERY 2 SECONDS? (V4, Mom Twist)

**Format:** DOUBLING, 70 s, new five-act structure (`docs/LOOK_AND_VIDEO.md` → Story shape).
**Hook:** H1-style chaos at frame 0 (Mom already furious, house wrecked) + H4 loop (last frame cuts back to frame 1).
**Status:** built (v1/v2, see §10 As built).

## 1. Structure

| Time | Act | Content |
|---|---|---|
| 0–3 s | Hook | Mom already angry, boy's head through the roof, `HEIGHT: 14.4m` |
| 3–20 s | Build | Landmark montage up to space (one landmark per 2 s doubling), Gerald pop-up in the control room |
| 20–45 s | Chaos | Earth-scale, Moon spin, counter breaks, Earth as a marble, the walk toward Earth (`WAIT FOR IT`) |
| 45–65 s | Twist | Foot descends, **Mom holds it up on the beat drop (48.4 s)**, Mom throws him, space fight watched by three meme cats, bedroom landing |
| 65–70 s | Exit | "La peace…" / "Eat your dinner.", freeze frame, title card, voiced share line, loop |

Full shot-by-shot script from the user: §8 (verbatim).

## 2. Production rules (user)
- Keep the height counter and essential story text only. No extra captions or overlays.
- **Gerald = his old character, in his suit, doing nothing** (user, 2026-11-25). Background pop-up only: no lines, no captions, no "impressed" text, no status chip, no button press, no reaction beat. The script's Gerald lines ("I'm not even impressed anymore.", "Finally.") are dropped. In the control-room shots he just stands there in the black suit (`geraldSuit(cat)` from episode 5) with the tiny tablet, half-lidded, unbothered. The counter doubles on its own.
- At 52–55 s (where the script had Gerald's reaction + memes) hold on Mom's power-up and the wind-up for the throw; at most a 1 s cut of Gerald standing in the control room, doing nothing.

## 3. Counter: doubles every 2 seconds (user confirmed)
`HEIGHT = 14.4 m × 2^floor(t / 2)`. The script's heights are exactly this series; only the times move so each value holds 2 s. One landmark per value:

| Film s | HEIGHT | Beat (script) |
|---|---|---|
| 0–2 | 14.4m | Hook: Mom in the doorway, head through the roof |
| 2–4 | 28.8m | Hook ends; lady at the window, "La peace!" (3–4 s) |
| 4–6 | 57.6m | Statue of Liberty, "Oops." |
| 6–8 | 115.2m | Eiffel Tower selfie, phone cracks |
| 8–10 | 230.4m | Big Ben rings, "AH!" |
| 10–12 | 460.8m | Empire State + helicopter, pilot "La peace!" |
| 12–14 | 921.6m | Burj Khalifa, news reporter line |
| 14–16 | 1.8km | Mountain range, climber, "You good?" |
| 16–18 | 3.7km | Above the clouds, narrator "serious problem"; short Gerald control-room pop-up |
| 18–20 | 7.4km | Rests his elbow on Everest |
| 20–22 | 14.7km | Beyond the atmosphere, sky turns black |
| 22–24 | 29.5km | Floats above Earth |
| 24–26 | 59km | Counter starts glitching; NASA "La peace!" |
| 26 → | 118km → ERROR | "He stopped following the rules": the counter glitches (118km → 500km → 1,000km → 10,000km → ERROR) and stays broken; title card: FINAL HEIGHT: NOT FOUND… |

The chaos act (Earth-scale, Moon spin, Earth as a marble, the walk) fits into 26–45 s by trimming the script's slack (35–40 s "distraction"). The title "every 2 seconds" now matches the counter.

## 4. Music and the beat drop (the main payoff)

| Track | File | Use |
|---|---|---|
| Charlie's Inferno | `assets/charlies_inferno.mp3` | 0 → ~45 s (growth and chaos), crossfades out under the phonk |
| X-COOL phonk (slowed), main section | `assets/x_cool_phonk_slowed.mp3` | Fades in 20 s before the Mom reveal; the drop is the reveal |

**Phonk asset:** cut from the user's upload (`Xcool_phonk.mp3`, 66.7 s). The upload was: silence 0–4.5 s, a short intro section 4.5–10.6 s, a gap, then the main section from 10.64 s. Per the user, the intro section is removed; the asset is the main section only (10.64 → 64.80 of the upload, 54.2 s, 256 kbps).
- **Beat drop in the asset: 22.78 s** (RMS jumps from about −23 dB to −14 dB at 22.780 s, 5 ms windows, measured after the encode).

**Placement (user):** start the phonk 20 s before the Mom reveal and fade it in slowly, so the drop lands on the reveal.
- Mom reveal frame (Mom holding the foot): **film 48.4 s** (0.4 s grid, inside the script's 48–52 s window).
- Phonk enters at **film 28.4 s**, playing from **asset 2.78 s** (= 22.78 − 20). Drop → film 48.4 s.
- Gain: phonk rises slowly from silent at 28.4 s to full by the drop (ease-in, most of the rise in the last 8 s); Charlie's Inferno crossfades out underneath and is gone by ~45 s (the `WAIT FOR IT` / descending-foot section is phonk only).
- This replaces the script's "music begins transitioning at 40–45 s".
- Superhero power-up SFX layered on the drop (`assets/sfx/reveal/`, under the music).
- Verify after the mix: the drop transient sits within ±1 frame (33 ms) of the reveal frame.

## 5. Voices
- Narrator: Piper `en_US-ryan-high` as in every episode.
- **Dialogue (Mom, the boy, the news reporter): Kokoro TTS** (user, 2026-11-25), one distinct Kokoro voice per character, different from the narrator. Mom: firm, loud female voice; the boy: young male voice. Kokoro (`kokoro` on PyPI, model `hexgrad/Kokoro-82M` on Hugging Face) is reachable from the cloud session.
- "La peace" lines (lady, pilot, NASA, Moon, the boy's last line) use the sample `assets/la_peace.mp3` with the OK hand + mewing face (AUDIO_AND_CAST).

## 6. Mom design
Reference: `reference/mom_physique_reference.jpg` (user-supplied "chad" physique photo, grey-scale). Use it for **the power-up form only**, translated into the series' cartoon style, in colour, and as a mom: same proportions and attitude (huge shoulders, defined arms with veins, confident smile, chin up), on Mom's existing family character (her hair, clothes stretched by the muscles). No textures (series rule): muscles and veins are modelled geometry. Normal-sized Mom everywhere else; the power-up (glowing eyes, muscles expanding, veins) plays on the drop at 48.4 s and holds through the throw and the space fight.

## 7. Cat memes: the space-fight audience (58–62 s)
- **Only used in the space fight** (user): three meme cats sit side by side like an audience watching Mom beat him up, like people eating popcorn at a show, but there is no popcorn: it's just the meme clips, keyed, on camera-facing cards (`fx/clip.js` `clipCard()`), floating in space at the edge of the frame. Brief cuts between the HIT 1 / HIT 2 beats, synced to the phonk. Clip sound ducked under the music or muted (the phonk is the payoff).
- The three cats (all in `assets/library/clips/`, background removed, VP9 + alpha + sound; German cat dropped by the user):
  - `oiia_cat.webm` — OIIA spinning cat, 16.9 s (Internet Archive item `video_20250118_211344`).
  - `happy_cat.webm` — Happy Happy Happy cat, 7.1 s (user's screen recording).
  - `maxwell_cat.webm` — Maxwell the cat, 13.4 s (user's screen recording, cut before the phone UI at 13.45 s).
- New clips: key with `assets/library/tools/key_clip.py`.

## 8. Deliverables
`episode-6.mp4` (1080×1920, 30 fps, 70 s) + `episode-6_720p.mp4`, analytics page (`analytics.html` / `analytics.data.js`, added to `analytics/index.html`), `HANDOFF.md`.

## 10. As built (2026-11-25)
Code: `src/timeline.js` (single source of truth: shots, counter, speech table, beats, music cues), `src/main.js`, `src/hud.js`, `src/common.js`, `src/scenes/{hook,build,space,twist,home}.js`; audio `audio/{make_voices,music,make_audio}.py`; tools `tools/{render.mjs,sheet.py,encode.sh}`.
Rebuild: deps outside the repo (`npm i three@0.170.0 @fontsource/anton`, copy `three.module.js` + `anton-latin-400-normal.woff2` into `vendor/`); Python venv (numpy scipy soundfile librosa pyloudnorm piper-tts faster-whisper kokoro-onnx pillow); Kokoro model files `kokoro-v1.0.onnx` + `voices-v1.0.bin` (github.com/thewh1teagle/kokoro-onnx releases) in `$KOKORO_DIR`; Piper `en_US-ryan-high.onnx` in `$PIPER_VOICE`.
`python ../assets/library/tools/clip_frames.py ../assets/library/clips/<cat>.webm build/clip_<cat>` for happy_cat, oiia_cat, maxwell_cat;
`KOKORO_DIR=… PIPER_VOICE=… python audio/make_voices.py && python audio/music.py && python audio/make_audio.py`;
`NODE_PATH=$(npm root -g) node tools/render.mjs --from 0 --to 2099 --scale 1 --workers 4 --out <frames>`; `tools/encode.sh <frames> episode-6.mp4 audio/mix.wav 20`. Preview one part: `index.html?parts=twist&scale=0.5`.

Deviations from the script (§9) and why:
- Times follow the user-confirmed 2 s doubling (§3), so the landmark beats are on the 2 s ticks; each build shot straddles a tick (growth pop + pull-back mid-shot).
- The lady's "la peace" is at 5.95 (after narrator line 1, which runs at natural pace to 5.61); the Statue shot starts at 7.1.
- Gerald has no lines (user): control room 20.8-22.4 and 52.0-53.0, sitting in his suit with a tablet, doing nothing; plus pop-ups on the wardrobe (hook) and the windowsill (landing).
- Cat memes only in the space fight (user): Happy Happy Happy cat, OIIA cat and Maxwell on a little asteroid, visible during the jump/punch/throw and in their own 0.8 s cut (59.4). Their own sound is muted so the phonk stays the payoff.
- Music: Charlie's Inferno from frame 0; X-COOL phonk enters at 28.4 from asset 2.78 s and fades in over 20 s (user); its drop lands at 48.400 (measured in the stem). A 0.35 s dip (-12 dB) right before the drop makes it hit; the drop is +5 dB over the moment before.
- Dialogue: Kokoro (Mom af_sarah, boy am_puck pitched x1.12, reporter am_michael, Moon bm_lewis after the la peace sample); "Ah!" and "Ow." are fed to Kokoro as phonemes. Mom's "I SAID DINNER'S READY!" has a long echo tail.
- The landing boy is 4.4 m (lying diagonally, bed crushed, feet through the right wall); the peace sign at 65.2 is the rig's 'peace' hand.
- SFX are only files from `assets/sfx/` (user).
## 11. v2 plan (user feedback on v1, 2026-11-25: "storyline good, renders suck")
Fixes the verdict in `docs/LOOK_AND_VIDEO.md` → Episode 6 verdict: dense backgrounds from the new asset packs, ≥ 3 motions per frame, a hit every 2–3 s, a size reference in every shot, readable gags, no glitches. Timing, voices and music stay (the story and the drop are approved).

| Film s | Shot | Hit (dopamine) | Motion (besides hero) | Size reference in frame |
|---|---|---|---|---|
| 0–2.0 | Wrecked bedroom, Mom in doorway, tilt up his legs | frame-0 shout, plaster rain, punch-zoom on Mom | ceiling dust falling, swinging lamp, shaking furniture, curtains | Mom (1.7 m), bed, wardrobe |
| 2.0–3.0 | His POV down through the roof | tile bonks Mom, growth pop (x2) | dust, neighbours running out, cars stopping | houses, cars, trees |
| 3.0–7.1 | Suburb: face at the lady's window | growth pop at 4 and 6 (shockwave rings, roof tiles fly), curtains slam | traffic, kids on bikes, birds scatter, flags | houses + cars, then the street from above |
| 7.1–8.4 | Harbour: pokes the Liberty crown | crown poke + torch flicker spark | ferries, gulls, waves, helicopters | Statue of Liberty (93 m) |
| 8.4–10.0 | Paris selfie | camera-flash + screen crack close-up insert | traffic, tourists, Seine boats | Eiffel Tower (330 m) |
| 10.0–11.8 | Big Ben rings | sound rings + flinch | buses, pigeons, river boats | Big Ben (96 m) + Parliament |
| 11.8–13.6 | Manhattan + helicopter | whip-pan to the cockpit, la peace | traffic grid, other helicopters, windows | Empire State (443 m) + skyline |
| 13.6–16.4 | Dubai reporters | growth pops at 14 and 16, cloud scratch | cars, palm trees, crowd filming with phones | Burj Khalifa (828 m) |
| 16.4–18.4 | Climber on the peak | "You good?" + thumbs-up | snow blowing, eagles, clouds drifting | mountain range, climber |
| 18.4–20.8 | Above volumetric clouds | growth pop, airliner passes at his shoulder | cloud sea drifting, jets with contrails | airliner (jet height 11 km) |
| 20.8–22.4 | Gerald control room | (calm beat) counter ticks on wall screens | blinking consoles, staff walking behind, scrolling screens | — |
| 22.4–24.2 | Elbow on Everest | summit snow burst under the elbow | climbers, wind snow, clouds | Everest (8,849 m) |
| 24.2–26.0 | Out of the atmosphere | sky snaps to black, speed lines | Earth limb haze, satellites, ISS passing | atmosphere layers, ISS |
| 26.0–28.0 | NASA | screens glitch, la peace | staff, scrolling consoles, alarms | — |
| 28.0–35.4 | Global problem, see-all, Moon | Moon grab with fingers visible, Moon spins ON the fingertip (close, readable) | asteroids, satellites, starfield parallax, Earth clouds | Earth, Moon, ISS |
| 35.4–42.4 | Rules break, marble, toss, satellite | ERROR glitch, Earth pinch, toss arcs, nose bonk | debris field, satellites, comet | Earth as a marble, planets |
| 42.4–48.4 | Walk, foot over Earth, Mom looks up | WAIT FOR IT, shadow over the city, impact from space | clouds swirling, city lights, birds fleeing | Earth, then the house/street |
| 48.4–52.0 | THE DROP: Mom holds the foot | flash + shockwave + debris + power-up | dust clearing, aura particles, neighbours' jaws drop | house, cars, street |
| 52–62.6 | Gerald, push, fly, shout, jump, cats, hammer | launch, punch, cats, throw | starfield parallax, debris, Earth rotating | Earth, the boy's size vs Mom |
| 62.6–70 | Landing, peace, freeze | crash through the roof, Mom lands, title | dust, plaster, curtains | bedroom |

## 9. Script (user, verbatim; the decisions above override it)

> Your 70s structure is perfect for this data:
> 0-3s hook: You lose 50% instantly. Need chaos immediately.
> 3-20s build: Gets you to space before the 30% drop-off at 10s.
> 20-45s chaos: This is where your old video flatlined and people stayed. Keep it.
> 45-65s twist: Your old video had NO twist after 45s, just "bigger and bigger." That's why avg watch stuck at 16s. Your mom twist gives people a reason to stay to 65s.
> 65-70s exit: Loop + share line.
>
> And the mom twist specifically fixes your 3 biggest weaknesses from the update:
> Save rate 0.0% -> Nobody saves "he gets bigger." Everybody saves "WAIT, HIS MOM JUST BEAT HIM UP."
> Skip rate 26.7% -> If the first 3 seconds teases "his mom is gonna kill him," strangers stay.
> Comment rate 0.3% Higher -> People will comment "mom diff" "moms are the final boss" — that's comment bait without asking for comments.

```
WHAT IF YOU GOT 2× TALLER EVERY 2 SECONDS?
V4 — 70 seconds — Mom Twist

Production instructions
* I will provide 2 cat meme videos. Use them in the designated moments during the mom reveal.
* I will provide the soundtrack.
* The first soundtrack is Charlie's Inferno. Use it throughout the growth and chaos sections.
* Before Mom is about to get crushed, transition into Xcool Phonk (slowed).
* Build the phonk through the descending foot sequence. At the peak of the phonk, when the beat drops after the buildup, reveal that Mom has survived and is holding up his foot.
* The beat drop must synchronize precisely with the reveal of Mom holding up the foot. This is the main musical payoff of the entire video.
* Do not add any Gerald impressed text, Gerald status chips, or other unnecessary on-screen UI. Gerald can appear as a character, but his reaction should be shown through animation and facial expression only.
* Keep the height counter and essential story text. Avoid unnecessary captions or overlays.

0–3s | HOOK — MOM IS ALREADY ANGRY
0.0s — HARD CUT
Interior, suburban bedroom.
The room is shaking. Cracks run across the ceiling. A wardrobe has fallen over. The entire house leans slightly to one side.
Mom stands in the doorway, arms crossed, furious.
MOM: "GET DOWN HERE RIGHT NOW!"
The camera slowly tilts upward.
The boy is already 14.4 metres tall. His head is sticking through the roof. One eye looks down at Mom.
BOY: "What?"
A ceiling tile falls onto Mom's head.
She doesn't even blink.
NARRATOR: "He gets twice as tall every two seconds. His mom is NOT having it."
ON-SCREEN TEXT: HEIGHT: 14.4m

3–20s | BUILD UP — THE WORLD GETS SMALLER
Fast-paced montage. Every height increase happens with a bass hit and a quick camera pullback.
3–4s — 28.8m
The boy leans down beside a residential window.
A random lady looks up from her house, completely unbothered.
LADY: "La peace!"
She closes the curtains.
4–5s — 57.6m
The boy stands beside the Statue of Liberty.
He gently pokes the statue's crown.
The statue's torch flickers.
BOY: "Oops."
5–6s — 115.2m
The Eiffel Tower is now barely reaching his waist.
He crouches and tries to pose for a selfie with it.
The phone screen cracks from the vibration.
6–7s — 230.4m
Big Ben stands beside his knee.
The clock starts ringing directly beside his face.
He flinches.
BOY: "AH!"
7–8s — 460.8m
The Empire State Building is now a tiny landmark beside him.
A news helicopter flies past his face.
PILOT: "La peace!"
The helicopter immediately turns around and flies away.
8–10s — 921.6m
The boy is taller than the Burj Khalifa.
News reporters stand in the foreground, staring upward.
NEWS REPORTER: "We can confirm that this man is still growing."
The boy scratches his head.
A huge chunk of cloud moves with his hand.
10–12s — 1.8km
He stands in the middle of a mountain range.
Clouds surround his ankles.
He looks down at a tiny mountain climber.
BOY: "You good?"
The climber slowly gives a thumbs-up.
12–14s — 3.6km
The camera rises above the clouds.
The boy's head is nearly touching the upper atmosphere.
The Earth curves slightly in the background.
NARRATOR: "At this point, he was becoming a serious problem."
14–16s — GERALD
Cut to Gerald standing in a futuristic control room.
He wears a black suit and holds a tiny tablet.
Gerald watches the footage of the boy growing.
He slowly shakes his head.
GERALD: "I'm not even impressed anymore."
He presses a button.
The height counter doubles again.
16–20s — RAPID MONTAGE
16s — 7.3km
The boy towers over Mount Everest.
He rests his elbow on the summit.
17s — 14.6km
He rises beyond the atmosphere.
The sky turns black around him.
18s — 29.5km
He floats above the Earth, looking down at the planet.
19s — 59km
The height counter begins glitching.
59km → 118km → 236km → ERROR
NASA: "La peace!"
The NASA control room goes silent.

20–45s | CHAOS — HE BREAKS THE RULES
20–22s — GLOBAL PROBLEM
The boy is now absurdly enormous.
The Earth looks like a small ball beneath him.
He looks down.
NARRATOR: "He had officially become a global problem."
The boy smiles.
BOY: "I can see everything!"
22–25s — THE MOON
He reaches toward the Moon.
His hand closes around it like a basketball.
The Moon's face appears on its surface.
MOON: "La peace… please stop."
The boy spins the Moon on one finger.
It wobbles.
25–30s — THE COUNTER BREAKS
The height counter glitches uncontrollably.
118km → 500km → 1,000km → 10,000km → ERROR
The boy's body expands beyond the camera frame.
The Earth becomes smaller and smaller.
NARRATOR: "Then he stopped following the rules."
The boy reaches down and picks up Earth.
He holds it between two fingers like a marble.
Tiny clouds swirl across its surface.
30–35s — BIGGER THAN EARTH
The camera pulls back.
The boy is now larger than the entire planet.
He casually tosses Earth from one hand to the other.
BOY: "This is actually pretty cool."
A tiny satellite bumps into his nose.
BOY: "Ow."
35–40s — DISTRACTION
He turns his head.
Something catches his attention in the distance.
A tiny satellite flashes past his eye.
He leans forward to inspect it.
40–45s — THE WALK
He starts walking through space.
One enormous foot slowly moves forward.
The camera tracks the foot.
The Earth is directly beneath it.
ON-SCREEN TEXT: WAIT FOR IT
The music begins transitioning from Charlie's Inferno into Xcool Phonk (slowed).
The phonk starts building as the foot moves toward Earth.

45–65s | MOM TWIST — THE REAL FINAL BOSS
45–48s — THE FOOT
Xcool Phonk (slowed) continues building.
Slow motion.
The boy's gigantic foot descends toward Earth.
The camera cuts to Mom standing on the ground.
She is still completely normal-sized.
Arms crossed.
Looking up.
MOM: "You are NOT breaking another thing in this house."
The shadow of the foot covers the entire planet.
The music reaches the final part of its buildup.
48–52s — THE REVEAL
The foot lands.
A massive dust cloud spreads across Earth.
The screen shakes violently.
The music reaches its peak.
At the exact phonk beat drop, reveal Mom holding up the entire foot with one hand.
The dust clears.
Mom is completely unharmed.
Her arm is extended upward, effortlessly holding the boy's enormous foot.
Her eyes glow.
Muscles expand.
Veins appear across her arm.
SFX: Superhero power-up layered into the beat.
This is the biggest visual and musical moment in the video.
52–55s — CAT MEMES
Cut to Gerald in his control room.
He stares at the screen.
His expression changes from disbelief to genuine respect.
GERALD: "Finally."
Use the first cat meme video I provide during this reaction.
Then cut to the second cat meme video as Mom prepares to throw the boy's foot.
Keep both memes brief and synchronized with the phonk.
55–58s — MOM THROWS HIM
Mom suddenly pushes upward.
The boy's foot launches into space.
The boy begins flying backwards, flailing his arms.
BOY: "WHAT?!"
Mom's voice echoes across the universe.
MOM: "I SAID DINNER'S READY!"
The boy spins uncontrollably.
58–62s — SPACE FIGHT
Mom jumps into space.
She catches up to the boy instantly.
HIT 1: She punches him across the face.
His head spins around.
HIT 2: She grabs his ankle, spins him like a hammer throw, and launches him toward Earth.
The camera follows him as he falls.
Mom casually dusts off her hands.
MOM: "And don't forget your vegetables!"
62–65s — BEDROOM LANDING
The boy crashes through the roof of his bedroom.
A huge dust cloud fills the room.
The tiny bed is crushed beneath him.
One enormous foot sticks out through the wall.
Dust settles.
Mom stands on his chest.
Completely normal-sized again.
Arms crossed.
The boy slowly opens one eye.

65–70s | EXIT — MOM ALWAYS WINS
65–67s
The boy looks up at Mom.
He raises two fingers in a peace sign.
BOY: "La peace…"
Mom stares at him.
MOM: "Eat your dinner."
67–70s — FREEZE FRAME
Freeze on Mom standing triumphantly on his chest.
TITLE CARD:
WHAT IF YOU GOT 2× TALLER EVERY 2 SECONDS?
FINAL HEIGHT: NOT FOUND…
MOM: UNDEFEATED
NARRATOR: "Share this with someone whose mom always wins."
LOOP
The final frame cuts directly back to the opening shot.
Mom is in the doorway, arms crossed.
MOM: "GET DOWN HERE RIGHT NOW!"
The loop restarts.
```
