# Episode 4 — "Mama I'm a criminal" (format: REEL, 17.0 s, v4 retention cut)

The hero digs a hole under a baby who is eating sand; the black clapping cat watches. Song: `media/mama_im_a_criminal.mp3` (from 10.43 s, full volume at frame 1). Title caption "mama i'm a criminal" from frame 1; voiced share line at the end.

The story runs on its own 24.5 s clock (`T` in `src/main.js`); the film re-orders it with an edit decision list (`EDL`, film time -> story time), cuts on the song's beat (0.4412 s):

| Film (s) | Story | Shot |
|---|---|---|
| 0–1.32 | 14.95–16.27 | HOOK flash-forward: the ledge collapses, baby drops in, sand explodes |
| 1.32–1.76 | 16.27 -> 1.0 | Rewind (scanlines, ◀◀, reversed whoosh) |
| 1.76–4.41 | 1.0–3.65 | Close: hero grinning, digging under the baby (baby eats sand) |
| 4.41–6.18 | cat claps | Side: cat claps (its clip sound), hero giggles behind his hand |
| 6.18–7.94 | shush | Close: finger on the lips at the cat |
| 7.94–9.71 | sorry | Palms together over the mouth, bowing on the beat |
| 9.71–11.91 | 13.4–15.6 | Digs on -> the fall for real |
| 11.91–13.68 | 15.75–17.52 | Tantrum in the hole (tears, cry sound) |
| 13.68–17.0 | 18.9–22.22 | Hands up, the cat copies; narrator: "Send this to someone who would do this" (15.0) |

Audio `audio/mix.wav` (ffmpeg): music −10%, ducked under the cat claps, the cry and the voice; quiet SFX from `assets/sfx`; `audio/baby_cry.wav` is synthesised (numpy formant synth); `audio/vo.wav` is Piper `en_US-ryan-high`. Analytics that drove this cut: see `docs/HOOKS_AND_FORMATS.md` "Retention and hooks".