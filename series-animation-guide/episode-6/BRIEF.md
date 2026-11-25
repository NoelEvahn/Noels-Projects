# Episode 6 — WHAT IF YOU GOT 2× TALLER EVERY 2 SECONDS? (V4, Mom Twist)

**Format:** DOUBLING, 70 s, new five-act structure (`docs/LOOK_AND_VIDEO.md` → Story shape).
**Hook:** H1-style chaos at frame 0 (Mom already furious, house wrecked) + H4 loop (last frame cuts back to frame 1).
**Status:** pre-production. Script and audio locked; meme clips still to be supplied (see §5).

## 1. Structure

| Time | Act | Content |
|---|---|---|
| 0–3 s | Hook | Mom already angry, boy's head through the roof, `HEIGHT: 14.4m` |
| 3–20 s | Build | Landmark montage up to space, Gerald control-room pop-up at 14–16 s |
| 20–45 s | Chaos | Earth-scale, Moon spin, counter breaks, Earth as a marble, the walk toward Earth (`WAIT FOR IT`) |
| 45–65 s | Twist | Foot descends, **Mom holds it up on the beat drop (48.4 s)**, two cat memes, Mom throws him, space fight, bedroom landing |
| 65–70 s | Exit | "La peace…" / "Eat your dinner.", freeze frame, title card, voiced share line, loop |

Full shot-by-shot script from the user: §8 (verbatim).

## 2. Production rules (user)
- Keep the height counter and essential story text only. No extra captions or overlays.
- **No Gerald UI:** no "impressed" text, no status chip. Gerald is a background character who pops up; reactions by animation and facial expression only. His two script lines ("I'm not even impressed anymore." at 14–16 s, "Finally." at 52–55 s) are **acted, not spoken or captioned**: slow head shake → presses the button; disbelief → genuine respect (slow nod / slow clap).
- Gerald in the control room wears the black suit (`geraldSuit(cat)` from episode 5) and holds a tiny tablet.

## 3. Music and the beat drop (the main payoff)

| Track | File | Use |
|---|---|---|
| Charlie's Inferno | `assets/charlies_inferno.mp3` | 0 → ~45 s (growth and chaos), crossfades out under the phonk |
| X-COOL phonk (slowed), main section | `assets/x_cool_phonk_slowed.mp3` | Fades in 20 s before the Mom reveal; the drop is the reveal |

**Phonk asset:** cut from the user's upload (`Xcool_phonk.mp3`, 66.7 s). The upload was: silence 0–4.5 s, a short intro section 4.5–10.6 s, a gap, then the main section from 10.64 s. Per the user, the intro section is removed; the asset is the main section only (10.64 → 64.80 of the upload, 54.2 s, 256 kbps).
- **Beat drop in the asset: 22.78 s** (measured: RMS jumps from about −23 dB to −14 dB at 22.780 s, 5 ms windows, verified after the encode).

**Placement (user):** start the phonk 20 s before the Mom reveal and fade it in slowly, so the drop lands on the reveal.
- Mom reveal frame (Mom holding the foot): **film 48.4 s** (on the 0.4 s grid, inside the script's 48–52 s window).
- Phonk enters at **film 28.4 s**, playing from **asset 2.78 s** (= 22.78 − 20). Drop: 2.78 + 20 = 22.78 → film 48.4 s.
- Gain: phonk rises slowly from silent at 28.4 s to full by the drop (ease-in curve, most of the rise in the last 8 s); Charlie's Inferno crossfades out underneath and is gone by ~45 s (the `WAIT FOR IT` / descending-foot section is phonk only).
- This supersedes the script's "music begins transitioning at 40–45 s": the transition now starts at 28.4 s and completes by 45 s.
- Superhero power-up SFX layered on the drop (from `assets/sfx/reveal/`, under the music).
- Meme clips at 52–55 s: duck the phonk ~9 dB while a clip with its own sound plays (AUDIO_AND_CAST rule), cuts on phonk beats.
- Verify after the mix: the drop transient sits within ±1 frame (33 ms) of the reveal frame.

## 4. Mom design
Reference: `reference/mom_physique_reference.jpg` (user-supplied "chad" physique photo, grey-scale). Use it for **the power-up form only**, translated into the series' cartoon style, in colour, and as a mom: same proportions and attitude (huge shoulders, defined arms with veins, confident smile, chin up), on Mom's existing family character (her hair, clothes, apron/cardigan stretched by the muscles). No textures (series rule): muscles and veins are modelled geometry. Normal-sized Mom everywhere else; the power-up (glowing eyes, muscles expanding, veins) plays on the drop at 48.4 s and holds through the throw and the space fight.

## 5. Cat meme clips (still needed)
The user named: Happy Happy Happy cat, German cat, the OIIA spinning cat ("O-E-E-A / U-U-U-I-I-A-A-O-O-O") and Maxwell the cat. The script uses **two**: one under Gerald's reaction (52–54 s) and one as Mom prepares to throw the foot (54–55 s).
- Green-screen versions were found on YouTube, but YouTube blocks downloads from the cloud session ("sign in to confirm you're not a bot"), so the files could not be fetched here. Candidates found:
  - Happy Happy Happy cat: "Green Screen Happy Happy Happy Cat Meme" (YouTube id `NSU2hJ5wT08`, 8 s)
  - German cat: "German Cat GreenScreen" (`ASPhC1KeN-w`, 6 s)
  - OIIA cat: "OIIAOIIA CAT | Green Screen HD" (`NoQ8Tj73WrY`, 13 s)
  - Maxwell: "Maxwell the Cat green screen (spin+dance)" (`rXh8Hvo7gfs`, 15 s)
- Once the files are in `episode-6/media/`: key with ffmpeg `chromakey` + `despill` into 30 fps PNG frames (`audio/make_clip.py` pattern from ep3/ep5) and play them on camera-facing cards (`fx/clip.js` `clipCard()`).

## 6. Open points to confirm before the build
1. Which two memes, in which order (default plan: Happy Happy Happy cat under Gerald's respect reaction, OIIA spin as Mom winds up the throw).
2. Counter maths: the script doubles every ~1 s from 3 s (28.8 m at 3 s, 57.6 m at 4 s…), then every 1–2 s, while the title says every 2 s. Default: keep the script's heights and times as written (it is the comedy timing) and keep the title.
3. Catchphrase: "La peace" lines (lady, pilot, NASA, Moon, the boy at the end) use `assets/la_peace.mp3` with the OK hand + mewing face per AUDIO_AND_CAST. Mom and the boy's other lines ("GET DOWN HERE RIGHT NOW!", "What?", "Oops.", "You good?", "I SAID DINNER'S READY!"…) need real speech, which breaks the catchphrase-only rule of earlier episodes; plan: TTS voices distinct from the narrator.

## 7. Deliverables
`episode-6.mp4` (1080×1920, 30 fps, 70 s) + `episode-6_720p.mp4`, analytics page (`analytics.html` / `analytics.data.js`, added to `analytics/index.html`), `HANDOFF.md`.

## 8. Script (user, verbatim)

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
