---
name: project_tts_audio_cached_by_text
description: Changing TTS model/voice/prompt does NOT regenerate existing coach/deep-reveal audio; lesson/deep-reveal clips are text-hashed but COACH clips are keyed by i18n key, not text
metadata: 
  node_type: memory
  type: project
  originSessionId: b103bb0b-f9c9-4850-9e8f-c46d73e5ecda
  modified: 2026-07-31T19:36:19.535Z
---

TTS audio is never keyed by the model/voice/prompt — so changing any of those regenerates nothing. But the naming scheme is **not uniform**, and the difference matters:

- **Lesson clips** — `hashMessageText` = `sha256(text)[:16]`. Text-derived.
- **Deep-reveal** — `tts/deep-reveal/<sha256(cleanText)>.mp3` in the `coach-tts` bucket. Text-derived.
- **Coach clips — keyed by the i18n KEY, not the text.** `slug = key.replace(/[._]/g, '--')`, verified 2026-07-30 in `scripts/generate-tts.js` (`keyToSlug`), `src/lib/useCoachSpeech.js` (`keyToSlug`), and `server/index.js` (`keyToAudioSlug` — different name, same function). *(An earlier version of this memory claimed coach clips were `sha256(text)` slugs. That was wrong.)*

**Consequence of the coach path being key-bound:** `speakCoachMessage(key)` can only ever play a pre-registered, approved key — it cannot narrate arbitrary or dynamically-sourced text, and it **silently no-ops** on an unapproved slug rather than erroring. So any feature that makes coach-voiced text dynamic (per-lesson overrides, LLM-generated prose, interpolated `{{…}}` keys — which `generate-tts.js` marks `ineligible` outright) ships **silent**, or worse, narrates the stale generic clip while the screen shows the new text. Decide explicitly which one you want.

**Worked resolution of exactly that case (2026-07-30/31, `confirmationChallenges[].goalPrompt`).** Per-lesson override text has no i18n key, so `speakCoachMessage` can never voice it. The fix was **not** a third scheme but moving that field onto the **lesson (text-hash) scheme**: `collectMessages` yields it with its own `textKey`/`audioKey` — the same indirection `infoProse` uses — and `ChallengeScreen` keeps two mutually-exclusive refs, `lastCoachKeyRef` for a pooled key and `lastLessonAudioRef` for an override path. **Trap when repeating this on another screen:** `speakLessonAudio(path)` does **NOT** check `speechEnabled` (its doc comment says the caller owns that), while `speakCoachMessage` checks internally — so a screen that has only ever used the coach path will narrate to a muted learner unless it adds the gate itself. Generalise: narratable text with no stable key belongs on the lesson scheme; don't mint a fake key for it.

Read `docs/architecture/coach-audio-conventions.md` — it is accurate and complete on the slug derivation, the registry/manifest split, and why the three copies must stay in lockstep.

**Trap:** changing the TTS model (e.g. the 2026-07 `tts-1` → `gpt-4o-mini-tts` switch), the voice, or the `tts-prompt.<lang>.json` instructions does **NOT** invalidate or regenerate any existing coach or deep-reveal audio. The old audio keeps playing until you manually regenerate — and for **coach** clips not even a text edit changes the path, since the filename comes from the key; staleness there is tracked by the registry's `status`, not the filename. So "I changed the model but it sounds the same" is expected, not a bug. **To audition a prompt/voice change without regenerating anything, use the sandbox in `/admin/audio`** (`POST /api/admin/audio/preview`, added 2026-07-16) — it synthesizes arbitrary text with experimental params, is uncached, and writes nothing.

**Lessons are the exception since 2026-07-16 (db28caf).** `generateLessonAudio` used to `continue` on `currentBasename === expectedBasename`, which made the `/admin/lessons` "Generate audios" button a **guaranteed no-op that reported success** after any voice/prompt change. Worse, the skip never checked the filesystem: a lesson whose mp3 went missing was permanently silent and no button could fix it — and deleting the mp3, the intuitive fix, *caused* that state. The skip is gone; lesson audio now **always** re-synthesizes every message that has text (same text → same hash → same path, so it overwrites in place and orphans nothing). Empty/whitespace text is still skipped — that's "nothing to say", not a cache hit.

**How to apply:** after any model/voice/prompt change, regenerate deliberately — coach: `/admin/audio` (pick lang) → Generate → Approve, or `scripts/generate-tts.js --key <k>` (prompts before overwriting an approved clip); deep-reveal: bust `explanation_cache.audio_path` (or the row) per locale; lessons: just click Generate audios again. **But check the lesson editor's lang selector — it resets to `en` on every load**, so a click without switching re-voices English and leaves Spanish untouched, looking like nothing happened. The `[lessons/audio]` server log prints `lang=`/`field=`/`voice=`/bytes per run precisely to make that diagnosable. Existing `tts-1`-era English coach clips are stale-model until regenerated (harmless mix — each still plays). See OI-32.

**Why:** the text-hash keying on lesson/deep-reveal clips is intentional (a regenerated *explanation* gets its own audio; identical text reuses a clip), but it makes model/voice changes silent no-ops for cached content. Coach clips use key-derived slugs instead so that filename ⇄ key stays 1:1 and a human's approval decision stays attached to the key. TTS model behavior itself (why `tts-1` gave English-accented Spanish, `gpt-4o-mini-tts` default, per-language `buildTtsInstructions`) is documented in `docs/architecture/api-conventions.md` (TTS config section) — read the doc, not memory, for that. Related: [[project_lesson_progression_audio_traps]], [[project_spanish_output_silent_fallback]].
