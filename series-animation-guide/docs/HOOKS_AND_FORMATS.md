# HOOKS AND FORMATS — the first seconds, retention, and the hook formats

Part of the master prompt (`../MASTER_PROMPT.md`). Every episode picks one hook format from the catalogue below, and every episode page in `episode-N/analytics.html` is read against these rules (see `ANALYTICS.md`).

## The hook, ep1–3 default (first 2–3 s decide if people keep watching)
- Open on the hero, already close: a short white flash, a snap zoom onto him (ease-out), a topic-matched burst (ep3: heart confetti at 0.1 s and again on the first doubling) and small rising decorations behind him (never in front of his face). The counter and the premise line are on screen from frame 1.
- No SFX in the first 2.4 s; the music eases in over 2 s. The first sound the viewer hears is the narrator's premise. (DOUBLING only. REEL: see "Retention and hooks": the music starts at full volume on frame 1.)

## Retention and hooks (learned from real TikTok analytics, episode 4)
Episode 4 v3 ("Mama I'm a criminal", 24.5 s REEL) posted with: **average watched 30%, most viewers left at 0:01 (80% left after 1 s), about half gone by 6 s.** The gag itself was fine; the opening lost them. What killed it, and the rule that replaces it:

| What died | Why | Do this instead |
|---|---|---|
| Calm wide establishing shot at 0:00, small faces, nothing moving | The feed decides in under 1 s; a still-looking frame reads as "boring" | **Frame 1 already has action and a face close to the lens.** Best: a **flash-forward** of the payoff (ep4 v4: the baby dropping into the hole with sand exploding, 0–1.3 s), then a quick **rewind** (0.4 s, story runs backwards, scanlines + ◀◀ badge, reversed whoosh) into the start of the story |
| Music faded in over 1.5 s | The first second was nearly silent; silence = swipe | **Music at full volume from frame 1**, starting on a loud, recognisable part of the track and on a beat (ep4: song from 10.43 s). Only a 30 ms de-click fade |
| Title caption faded in late, small, against the trees | Viewers read the premise in frame 1 or never | **Caption on screen from frame 1, no fade-in**, big (≈86 px bold, thick black outline), in the top band, never over a face; move the camera target so faces sit below it |
| The payoff came at 15 s of 24.5 s | Too long to wait for one gag | **REEL length 15–17 s; the payoff by ~60% of the runtime;** cut every middle beat to 1.8 s (4 beats) |
| A 2 s silent "send this" end card | People swipe the moment a card appears, and it breaks the loop | **No end card.** The share line is **spoken** (Piper narrator) over the final action shot, captions word by word |
| The ending did not lead anywhere | No loop = no rewatches | **End on a moment that loops** into the hook (ep4: the cat copying the hands-up, then the video restarts on the fall) |

Checklist before render (REEL, and the first 3 s of every format):
1. Pause on frame 0: is something happening, is a face big, is the caption readable? If not, fix it.
2. Is the music loud at 0:00? (measure the first second: it must not be quieter than the rest)
3. Can a viewer tell what the video is about in 1 s without sound? (caption + action)
4. Does the payoff arrive before ~60% of the runtime, and is it teased in the first second?
5. Is every shot under ~2 s in a REEL, and does each one change something?
6. Is the share line voiced, with no end card, and does the last frame loop into the first?
7. Build the edit as an **edit decision list** (film time → story time, see `episode-4/src/main.js` `EDL`): the story stays a pure function of story time, so re-ordering, flash-forwards and rewinds are one-line changes.


## Evidence: what the first three Instagram posts showed
Source: the user's Instagram insights (see `episode-N/analytics.html`; numbers filled in by hand on 2026-11-20, later by the sync script).

| | Ep1 hussed | Ep2 money | Ep3 love |
|---|---|---|---|
| Skip rate | **59.6 %** | **18.0 %** | 23.9 % |
| Average watch time (of 90 / 90 / 100 s) | 15 s (17 %) | 49 s (54 %) | 24 s (24 %) |
| Share of views from Reels | 33.9 % (40.8 % Stories) | 93.7 % | 93.0 % |
| Views per hour | ~9 | ~600 | ~890 (2 h old) |

- The skip rate is the gate: ep2 passed it, was pushed to cold Reels viewers and blew up. Ep1 failed it and stayed with the user's own followers (Stories).
- Ep1's opening frame was a still, giant face and a number with no object. Ep2's was a phone showing `$0.01 ▲ ×2 every 2 s`: the premise in one glance.
- Ep3's skip rate was fine but its average watch time was only 24 %: the viewers got past the hook and then drifted. The causes are probably the 100 s length, the extra reading (Gerald chip + roasts) and a counter that did not get funnier.
- Rules of thumb from these three posts only (treat them as hypotheses, not laws): **skip rate ≤ 25 % is healthy, over 40 % is a failed hook; average watch ≥ 45 % of the length is healthy, under 25 % means the middle drifts.** The analytics page colours these.

## Hook formats (pick one per episode and write it in the brief)
Every format: caption and premise readable in frame 1, no fade-in, nothing slow in the first second, the hero or the premise object close to the lens.

| # | Format | What happens in the first 1–3 s | Used in | Use when |
|---|---|---|---|---|
| **H1** | **Flash-forward + rewind** | 0–1.2 s: the payoff plays at full volume with its own sound; 0.4 s rewind (scanlines, ◀◀ badge, reversed whoosh); the story starts at film 1.6 s. The film clock = story clock + 1.6 s (exactly one bar at 150 BPM, so every counter tick stays on the beat grid); build it as an edit decision list (EDL) like `episode-4/src/main.js`. | ep4, proposed for ep5 | The payoff is a big visual (a dunk, a crash, a reveal) and the setup is slow. Preferred after the ep1 skip rate of 59.6 %. |
| **H2** | **Premise object** | Frame 1 holds a concrete object that states the premise on its own (ep2: the phone with `$0.01` and `▲ ×2 every 2 s`), then a snap zoom to the hero holding it. | ep2 | The topic has an everyday object (money, a phone, a scale, a clock). |
| **H3** | **Snap-zoom burst** | Short white flash, snap zoom on the hero, a topic-matched burst (ep3: heart confetti), small decorations rising behind him. | ep1, ep3 | Only together with H2 or an action in frame 1; ep1 used it alone (static face + number) and was skipped by 59.6 %. |
| **H4** | **Loop** | The last frame leads into frame 1 (ep4: the cat copies the hands-up, then the fall restarts). Combine with any of H1–H3. | ep4 | Always; it earns replays. |

### Which hook for which format
| Format | Default hook | Audio in the first second |
|---|---|---|
| DOUBLING | H2 (or H1 when the ending is a big visual) + H4 | Old rule (ep1–3): no SFX in the first 2.4 s, music eases in, the narrator's premise is the first sound. **Experiment (ep5): H1 with the payoff sound at frame 0 and the music at full volume from 1.6 s.** Compare skip rates on the analytics pages before making it the default. |
| REEL | H1 + H4 | Music at full volume on frame 1 (rules above). |
| WORLD | chapter title card over action + H4 | Music from frame 1. |

### Hook checklist (frame 0 and the first 3 s)
1. Pause on frame 0: something is happening, a face or the premise object is big, the caption is readable.
2. The premise can be understood in 1 s without sound.
3. The payoff or a clear promise of it is visible within 1.6 s (H1) or the premise object is on screen (H2).
4. Nothing slow, still or establishing in the first second.
5. The last frame loops into the first (H4).
6. After posting, check the analytics page: skip rate against the rules of thumb above, and write the result into the episode's `notes`.
