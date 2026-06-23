---
name: project_spec039_audio_interactive_coach
description: Spec 039 audio & interactive coach — gotchas and traps
metadata: 
  node_type: memory
  type: project
  originSessionId: 004ff890-e312-4c4b-aa66-badaabb3dafb
---

## Gotchas and traps

- **Deploy requirement**: `DELETE FROM explanation_cache;` in Supabase SQL editor before deploy — old cached rows lack `terms` in `deep_reveal_json` and will cause errors.
- **`musicEnabled` defaults to `false`**: `bg_music.mp3` is a placeholder (identical to disc-drop sound). Do not flip to `true` until real music assets replace placeholders.
- **`useCoachSpeech.js` slug derivation**: dots and underscores in pattern keys are converted to `--` when deriving the audio slug. Empty manifest = all speech no-ops (no 404s).
- **Known UX issue**: SFX and Speech toggles share the same `speaker`/`speakerOff` icon — two identical icons appear side-by-side in toolbar.
- **Pre-existing test failures**: 2 tests fail before any changes — `insertGameBlunder` and `classifier forbidden_columns`. Do not treat these as regressions.
