# AUDIO AND CAST — catchphrase, Gerald, narrator, music and mix

Part of the master prompt (`../MASTER_PROMPT.md`). Read this before writing the speech timeline and the audio build.

## The catchphrase rule
- Characters only ever say the CATCHPHRASE or its short form. The narrator is the only normal speech.
- All lines are built from the attached sample, at the PITCH slot (default 1.10× and 1.15× registers, measured within ±3% against the same syllables of the source).
- About 1.2× faster than the sample. Nothing slow except one slow-motion scream layered under the final crowd.
- Give each speaker a different delivery: excited, disbelief, confused, deadpan, broadcast or radio, small group, big crowd, whole-world crowd.
- **About 14 voiced lines.** Every other reaction is silent open-mouth shock with no caption.
- Each voiced line gets a punch-zoom, mouth movement synced to the audio, and a big yellow caption.
- **"La peace" episodes:** every character who says it does the OK hand sign beside the face (back of the hand to camera, three fingers up, index and thumb making a round circle) and a **mewing face**: clean and chiselled, never fat or ugly (sharp V jawline, firm chin pushed forward, lips pressed together, chin up, half-lidded smug eyes): `ch.pose(POSES.laPeace(t))` + `ch.face({ ...FACES.mew, open: mo(id, t) })`. **The mouth must move on every line**: the pressed lips part with `open`, so always pass the line's mouth curve. Gerald mews too when the episode calls for it: `gerald.face(AFACES.mew)` (firm cheeks, chin, small pursed pink lips). Keep the mouth closed except a small open on the syllables. Captions read "LA PEACE" / "LA PEACE!". The sample is 1.1 s (the first "la peace" of the source).

## Gerald — the recurring cat (cast, not a trope)
- Gerald (`ANIMALS.gerald`, orange tabby, half-lidded eyes) is a **background character who pops up at random**: in the corner of a shot, behind the action, somewhere unexpected, doing something unbothered that suits the location. He is never counted, never speaks or meows (no audio from him). **His reactions are shown only through animation and facial expression** (slow blink, head shake, looking away, a respectful nod): no spoken lines, no captions for him.
- **Narrator roasts: off by default from ep6** (user, 2026-11-25: Gerald is a silent background pop-up, no extra text). Only if the user asks for them again: 4–7 extra deadpan lines of 2 s or less ("Gerald remained unconvinced."), one per appearance, mixed like the narration, captions in pink-orange with the key word yellow. Never repeat a roast from an earlier episode; log every line and gag in `cat/CAT_BIBLE.md`. If they will not fit the speech timeline, cut roasts (to 4–5), never the story lines. Keep roasts out of the scene-7 silence window.
- **No Gerald UI (user, 2026-11-25):** no HUD chip, no status/stat chip, no "GERALD · IMPRESSED" (or any Gerald) text on the HUD or the title card, no Gerald captions. The old chip from ep3 (`GERALD · LOVES YOU`) is retired.
- **Final callback (optional):** Gerald may show up in the closing shot; his reaction is acted, never written on screen. Ep3 had him as the holdout until the payoff (ep3: he finally loves the hero, claps, fist-bumps him and they walk off paw in hand). Build callbacks to earlier episodes. Family-safe: he is never harmed, he is always the calm one.

## Narrator
- Five short deadpan lines, in scenes 1, 2, 4, 5 and 6: the premise first, then dry understatements.
- Piper TTS (`en_US-ryan-high`, the episode 1-2 voice), natural pace via `--length-scale`, de-essed, mixed quietly inside the music.
- Captions word by word in white, with key words in yellow. Check with ASR that the audio matches the captions.

## Music and edit
- Measure the tempo by beat regression or comb search, not librosa's single number.
- Time-stretch the track, pitch kept, so every counter change lands on a beat. Charlie's Inferno: 146.0 → 150 BPM, ×1.0274.
- If the downbeat is ambiguous, say what was chosen.
- Every cut, caption, line and impact sits on the grid.
- Scene 7: the music filters down, about 2 s of true silence (the music stem at digital zero), then slams back on the big moment. A soft chord on the title card (the record scratch was dropped in ep3).
- **Library clips:** `assets/library/clips/` (e.g. `clap_cat.webm`, the keyed clapping black cat from episode 3, with its sound). Extract with `tools/clip_frames.py` and place with `fx/clip.js` `clipCard()`.
- **User-supplied clips** (e.g. a green-screen meme): store the source in `episode-N/media/`, key it with ffmpeg `chromakey` + `despill` into 30 fps PNG frames (`audio/make_clip.py`), and play it on a camera-facing card in the 3D set, one frame per video frame (deterministic). While it plays: only the clip's own sound and the music (ducked about 9 dB while the clip has sound), no narration, no SFX.

## Mix (approved levels)
- **SFX stay well under everything** (user: "SFX way too loud"). Pick from `assets/sfx/`: `popup/` for pops and captions, `reveal/` for hits and reveals, `suspense/` for risers before a big moment, `transition/` for cuts and camera flashes, `zoom/` for whooshes on snap zooms. No whoosh on every cut; at most a barely audible air on a cut. The SFX bus sits about 8 dB below the old episode-3 mix.
- **Narrator voice = Piper `en_US-ryan-high`, as in episodes 1-2** (user: "perfect"). Natural speed; fit long lines with Piper's `--length-scale`, never time-stretch (that made episode 3 v1 sound robotic). De-ess the S sounds.

| Item | Level |
|---|---|
| Master | −14 LUFS integrated, true peak ≤ −1 dBTP after AAC (limiter ceiling about −3.2 dB, gain reduction ≤ 6 dB), no clipping |
| Catchphrase lines | about −20 LUFS each before the master; the final crowd 3 dB louder, the loudest moment of the video |
| Narration | about −16.5 LUFS |
| Music ducking | about 5 dB under narration, about 2.5 dB under lines |
| Sub-bass | none in the voices |

Sound effects must never bury speech.

