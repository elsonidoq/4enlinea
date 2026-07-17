---
name: project_tts_audio_cached_by_text
description: Changing TTS model/voice/prompt does NOT regenerate existing coach/deep-reveal audio (keyed by text hash); lessons are the exception since db28caf — they always re-synthesize
metadata: 
  node_type: memory
  type: project
  originSessionId: b103bb0b-f9c9-4850-9e8f-c46d73e5ecda
---

All TTS audio in the app is cached/named by a **hash of the spoken TEXT, not the model/voice/prompt** — coach clips (`sha256(en/es text)` slug), lesson clips (`hashMessageText` = `sha256(text)[:16]`), and deep-reveal audio (`tts/deep-reveal/<sha256(cleanText)>.mp3` in the `coach-tts` bucket).

**Trap:** changing the TTS model (e.g. the 2026-07 `tts-1` → `gpt-4o-mini-tts` switch), the voice, or the `tts-prompt.<lang>.json` instructions does **NOT** invalidate or regenerate any existing coach or deep-reveal audio. The old audio keeps playing until the underlying *text* changes or you manually regenerate. So "I changed the model but it sounds the same" is expected, not a bug. **To audition a prompt/voice change without regenerating anything, use the sandbox in `/admin/audio`** (`POST /api/admin/audio/preview`, added 2026-07-16) — it synthesizes arbitrary text with experimental params, is uncached, and writes nothing.

**Lessons are the exception since 2026-07-16 (db28caf).** `generateLessonAudio` used to `continue` on `currentBasename === expectedBasename`, which made the `/admin/lessons` "Generate audios" button a **guaranteed no-op that reported success** after any voice/prompt change. Worse, the skip never checked the filesystem: a lesson whose mp3 went missing was permanently silent and no button could fix it — and deleting the mp3, the intuitive fix, *caused* that state. The skip is gone; lesson audio now **always** re-synthesizes every message that has text (same text → same hash → same path, so it overwrites in place and orphans nothing). Empty/whitespace text is still skipped — that's "nothing to say", not a cache hit.

**How to apply:** after any model/voice/prompt change, regenerate deliberately — coach: `/admin/audio` (pick lang) → Generate → Approve, or `scripts/generate-tts.js --key <k>` (prompts before overwriting an approved clip); deep-reveal: bust `explanation_cache.audio_path` (or the row) per locale; lessons: just click Generate audios again. **But check the lesson editor's lang selector — it resets to `en` on every load**, so a click without switching re-voices English and leaves Spanish untouched, looking like nothing happened. The `[lessons/audio]` server log prints `lang=`/`field=`/`voice=`/bytes per run precisely to make that diagnosable. Existing `tts-1`-era English coach clips are stale-model until regenerated (harmless mix — each still plays). See OI-32.

**Why:** the text-hash keying is intentional (a regenerated *explanation* gets its own audio; identical text reuses a clip), but it makes model/voice changes silent no-ops for cached content. TTS model behavior itself (why `tts-1` gave English-accented Spanish, `gpt-4o-mini-tts` default, per-language `buildTtsInstructions`) is documented in `docs/architecture/api-conventions.md` (TTS config section) — read the doc, not memory, for that. Related: [[project_lesson_progression_audio_traps]], [[project_spanish_output_silent_fallback]].
