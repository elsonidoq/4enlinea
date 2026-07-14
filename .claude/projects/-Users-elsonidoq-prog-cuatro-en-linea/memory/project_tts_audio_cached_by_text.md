---
name: project_tts_audio_cached_by_text
description: Changing TTS model/voice/prompt does NOT regenerate existing audio — all clips keyed by text hash; regenerate manually
metadata: 
  node_type: memory
  type: project
  originSessionId: b103bb0b-f9c9-4850-9e8f-c46d73e5ecda
---

All TTS audio in the app is cached/named by a **hash of the spoken TEXT, not the model/voice/prompt** — coach clips (`sha256(en/es text)` slug), lesson clips (`hashMessageText` = `sha256(text)[:16]`), and deep-reveal audio (`tts/deep-reveal/<sha256(cleanText)>.mp3` in the `coach-tts` bucket).

**Trap:** changing the TTS model (e.g. the 2026-07 `tts-1` → `gpt-4o-mini-tts` switch), the voice, or the `tts-prompt.json` instructions does **NOT** invalidate or regenerate any existing audio. The old audio keeps playing until the underlying *text* changes or you manually regenerate. So "I changed the model but it sounds the same" is expected, not a bug.

**How to apply:** after any model/voice/prompt change, regenerate the affected clips deliberately — coach: `/admin/audio` (pick lang) → Regenerate/Generate-All → Approve, or `scripts/generate-tts.js`; deep-reveal: bust `explanation_cache.audio_path` (or the row) per locale; lessons: re-run `generateLessonAudio`. Existing `tts-1`-era English coach + lesson clips are stale-model until regenerated (harmless mix — each still plays). See OI-32.

**Why:** the text-hash keying is intentional (a regenerated *explanation* gets its own audio; identical text reuses a clip), but it makes model/voice changes silent no-ops for cached content. TTS model behavior itself (why `tts-1` gave English-accented Spanish, `gpt-4o-mini-tts` default, per-language `buildTtsInstructions`) is documented in `docs/architecture/api-conventions.md` (TTS config section) — read the doc, not memory, for that. Related: [[project_lesson_progression_audio_traps]], [[project_spanish_output_silent_fallback]].
