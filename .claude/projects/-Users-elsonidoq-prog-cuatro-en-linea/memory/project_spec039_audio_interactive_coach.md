---
name: project_spec039_audio_interactive_coach
description: Spec 039 audio & interactive coach — IMPLEMENTED 2026-06-19; 37/37 tasks; post-implementation anchors
metadata: 
  node_type: memory
  type: project
  originSessionId: 004ff890-e312-4c4b-aa66-badaabb3dafb
---

Spec/plan/tasks done; all 37 tasks implemented 2026-06-19 across 5 batches.

**Why:** Audio SFX, background music, coach TTS, 1200ms pacing gap, KB term popups in deep reveal.

**How to apply:** Use these anchors when fixing bugs or extending this feature.

## Post-implementation state

- **`useAudio.js`** is the canonical audio hook. `musicEnabled` defaults to `false` (placeholder bg_music.mp3 is identical to disc-drop sound — flip to `true` when real music assets replace placeholders).
- **`useCoachSpeech.js`** fetches `coach-audio-manifest.json` once on mount. Empty manifest = all speech no-ops. No blind-fetch 404s. Slug derivation: dots/underscores → `--`.
- **`constants.js`** exports `COACH_PACING_MS = 1200` and `delay(ms)`. Used by `useGameBoard.js` (sparring) and `ChallengeScreen.jsx` (forced_win continue branch).
- **GameScreen.jsx**: `disc_fall` + landing sound both fire from `useEffect` on `lastDrop` (covers user + AI disc drops). Landing classification uses `lastDrop.r === 0` → `disc_land_bottom`, else `disc_land_disc`. `preClickHeightRef` was removed. Win sound uses `winSoundPlayedRef` guard.
- **ChallengeScreen.jsx**: SFX wired in all 3 evaluation paths (single-move `.then()`, forbidden_columns submit, sequence click). Speech uses `lastCoachKeyRef`. Pacing delay only in forced_win `continue` branch.
- **KB term pipeline**: `PATTERN_KB[patternKey].id` → kbId slug. `parseAnnotatedText` returns `{ cleanText, zones, terms }`. Term spans = dashed amber underline (vs zone dotted blue). `KbTermPopup` uses `kbTermLesson.js` for CTA mapping.
- **Admin audio**: 6 endpoints under `/api/admin/audio/*` (all `requireLocalhost`). `tts-registry.json` has 220 `needs_audio` + 3 ineligible keys. No MP3s generated yet — run `node scripts/generate-tts.js --all-new` with `--env-file=server/.env`.
- **Deploy requirement**: `DELETE FROM explanation_cache;` in Supabase SQL editor before deploy (old cached rows lack `terms` in `deep_reveal_json`).
- **Known UX issue**: SFX and Speech toggles share the same `speaker`/`speakerOff` icon — two identical icons side-by-side in toolbar.
- **Test baseline**: 479 pass, 2 fail (pre-existing: insertGameBlunder + classifier forbidden_columns).
