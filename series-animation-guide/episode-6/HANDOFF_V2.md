# Episode 6 v2 handoff (fresh session)

**Task:** rebuild episode 6 visuals on the new asset packs. Story, timing, voices, music and the drop at 48.4 s are approved: do not change `src/timeline.js` timings or the audio.

**User verdict on v1:** storyline good, renders bad: empty backgrounds, glitches, clouds unreadable, fingertip under the spinning Moon invisible, too slow, nothing moving, no size comparison, needs dopamine hits.

## Read first
1. `../CLAUDE.md` (work on `main`, push to `main`, never name things after the repo).
2. `../docs/LOOK_AND_VIDEO.md` → "Episode 6 verdict — READ FIRST" (the 7 rules).
3. `BRIEF.md` §11 (v2 shot plan: hit / motion / size reference per shot) and §10 (as built, rebuild commands).
4. `../assets/library/INDEX.md` → "Asset packs" + `index/<pack>.md` (city, nature, landmarks, space, interiors, motion), contact sheets in `screenshots/sheets/pack_*.jpg`. Check an asset's screenshot before using it; some were not re-reviewed (see the pack notes).

## Plan
- Rewrite `src/scenes/{hook,build,space,twist,home}.js` shot by shot using the packs: landmarks at true scale (`landmarks_ladder.js scaleReference`), `city_gen.js cityBlock/cityGrid/trafficFlow/pedestrians`, `nature_clouds.js` clouds/cloud sea, `space_scenes.js spaceBackdrop`, `interiors_home.js` bedroom (wrecked), `motion_*` (shockwave, rubbleBurst, dustBurst, speedLines, growthBurst, cameraShake, punchZoom, sizeMarker).
- Every shot: ≥ 3 motions besides the hero, a size reference in frame, a hit every 2–3 s, camera always moving, no white-outs longer than 3 frames.
- Camera notes: near ≈ distance/1500 for 100 m+ subjects (`prepCamera`), far ≈ 60000 for km-scale nature.
- Test each part at `--scale 0.5` with `--parts <id>`, look at the stills, then full render (≈ 40 min on 4 workers; do not run other browsers at the same time, it OOMs), `tools/encode.sh`, `tools/qa.py`. Keep v1 as `episode-6_v1.mp4`.

## Environment (rebuild in a new container)
`npm i three@0.170.0 @fontsource/anton` in the scratchpad, copy `three.module.js` + `anton-latin-400-normal.woff2` into `vendor/`; Python venv with numpy scipy soundfile librosa pyloudnorm piper-tts faster-whisper kokoro-onnx pillow; clip frames: `python ../assets/library/tools/clip_frames.py ../assets/library/clips/<cat>.webm build/clip_<cat>` for happy_cat, oiia_cat, maxwell_cat. Audio: `audio/mix.wav` is gitignored, so rebuild it (`BRIEF.md` §10) or re-run make_voices + music + make_audio (needs the Kokoro and Piper model downloads listed there).
