---
name: project_lesson_audio_generation_traps
description: "generate-audio without a locator re-synthesizes EVERY clip in the lesson (binary churn), back-to-back en/es calls silently lose one write, and generate-tts.js is outright broken"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7db608a0-3785-4c8f-94aa-9d6fe6577d1e
  modified: 2026-07-31T19:37:00.932Z
---

**Trigger: before scripting or bulk-running `POST /api/admin/lessons/:id/generate-audio` (or reaching
for `scripts/generate-tts.js`).** Measured 2026-07-30/31 while voicing `confirmationChallenges[].goalPrompt`.

**1. Omitting `locator` regenerates the whole lesson, not just what's missing.** The endpoint
re-synthesizes *every* message with text (15–17 clips per lesson). Same text → same hash → same
filename, so it overwrites in place and looks harmless — but TTS is **not byte-deterministic**, so
every previously-committed mp3 comes back different. Ten lessons produced **142 modified binaries** in
`git status` against 30 genuinely-new clips. Always pass
`{"lang":"es","locator":"confirmationChallenges[0].goalPrompt"}` for targeted work. If you already
churned them, `git checkout --` the modified (`M`) mp3s; the committed clips are equally valid.

**2. Back-to-back calls on the same lesson silently lose a write.** Running `en` then `es` for the
same lesson without a gap produced `{"generated":[...],"failed":[]}` — a success response — while
`goalPromptAudio_es` was **never persisted to the JSON**. `saveLessonFile` is read-modify-write with no
locking, so the second call can read a pre-first-write copy and clobber. It reproduced on one lesson of
ten. **Do not parallelise per-lesson generate calls, and do not trust the response** — re-read the
lesson JSON (or re-run `lessonAudioCoverage`) to confirm the field landed. Same family as
[[project_lesson_disk_edit_cache_clobber]].

**3. `scripts/generate-tts.js --key` / `--all-new` is BROKEN and throws.** `synthesizeAndWrite` calls
`synthesize(value)` without the required `lang` arg → `synthesize: invalid lang 'undefined'`. Verified
by running it. Its registry/manifest/sync subcommands still work. **Coach audio is currently only
generatable through `/admin/audio`.** Tracked as an open issue; don't rediscover it.

**4. Adding a field to `collectMessages` is all-or-nothing.** `tests/lessons/lessonAudioCoverage.test.js`
walks the same function, so the moment a field is yielded the suite demands an on-disk clip for **every
instance of it, in both languages** — there is no "just this one lesson" version that stays green.
Budget for the full sweep (24 challenges × 2 langs = 48 clips) before starting.

**5. Editing voiced text orphans its clip.** Lesson audio is text-hashed, so changing the text changes
the filename; the old clip stays on disk, unreferenced, and the coverage suite's **prune-parity half**
goes red (it is a separate assertion from the missing-clip half — a run can pass one and fail the
other). Fix with `POST /api/admin/lessons/prune-audio`; it deletes and reports them.

Related: [[project_tts_audio_cached_by_text]], [[project_lesson_progression_audio_traps]].
