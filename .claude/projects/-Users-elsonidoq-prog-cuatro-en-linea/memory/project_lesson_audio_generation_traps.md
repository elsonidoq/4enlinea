---
name: project_lesson_audio_generation_traps
description: "generate-audio without a locator re-synthesizes EVERY lesson clip; back-to-back en/es loses a write; generate-tts.js is FIXED (not broken); approving one coach clip can drop others from the manifest"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7db608a0-3785-4c8f-94aa-9d6fe6577d1e
  modified: 2026-08-05T20:29:39.500Z
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

**3. ~~`scripts/generate-tts.js --key` / `--all-new` is BROKEN~~ — FIXED 2026-08-01. Do not believe
this entry.** It was real on 2026-07-31 (`synthesizeAndWrite` called `synthesize(value)` with no
`lang` → `invalid lang 'undefined'`). Commit **`608ae4c` "OI-91: pass lang through to synthesize()"**
fixed it: `generate-tts.js:371` now reads `await synthesize(value, lang)` with a comment naming OI-91,
and `--help` exits 0 with full usage. **Re-verified 2026-08-04.** The CLI is the normal path again;
`/admin/audio` is not the only way to generate coach audio.
*Why this entry is left standing rather than deleted:* it cost a later session real time by making a
working tool look broken. "X is broken" is a **measurement**, and measurements expire — run
`git log -- <file>` / `--grep` before trusting one. See [[feedback_measurement_expires]].

**3b. `generate-tts.js` specifics, verified 2026-08-04** (this is the coach CLI, NOT the lesson endpoint —
traps 1/2/4/5 above are the lesson pipeline and do not transfer):

- **`--lang all` is ONE process, so trap 2 does not apply to it.** `for (const lang of langs) await
  generateSingle(key, lang, …)` runs sequentially and each language reads/writes its **own** registry
  file. A single `--key <k> --lang all` invocation is the safe form; two back-to-back single-lang
  invocations are the risky shape.
- **Synthesizing without approving turns `test:fast` RED.** `tests/unit/coachSpokenNamespace.test.js`
  fails on any mp3 on disk that is absent from the manifest ("orphan"), and **only the `/admin/audio`
  approve flow adds a slug to the manifest**. So "generate now, approve later" is not a valid split.
  Registering with `--sync` alone (status `needs_audio`, no mp3, no manifest change) IS a safe
  intermediate: suite stays green and the key silently no-ops at the play site until approved.
- **Approving ONE clip can silently delete other clips from the manifest.** `server/index.js`'s
  `writeTtsManifest` **rebuilds** from `entries.filter(e => e.status === 'approved')` instead of
  remapping in place — contradicting `coach-audio-conventions.md`'s own written rule. Any slug in the
  manifest but not `approved` is dropped by the next approve of *anything*, orphaning its mp3 (red
  suite) and silencing a clip that plays today. Measured 2026-08-04: 5 such `en` slugs, including
  `coach--spoken--sparring--outcome--{loss,win}`. **List the at-risk set and approve it in the same
  pass.** Tracked as OI-149.

**4. Adding a field to `collectMessages` is all-or-nothing.** `tests/lessons/lessonAudioCoverage.test.js`
walks the same function, so the moment a field is yielded the suite demands an on-disk clip for **every
instance of it, in both languages** — there is no "just this one lesson" version that stays green.
Budget for the full sweep (24 challenges × 2 langs = 48 clips) before starting.

**5. Editing voiced text orphans its clip.** Lesson audio is text-hashed, so changing the text changes
the filename; the old clip stays on disk, unreferenced, and the coverage suite's **prune-parity half**
goes red (it is a separate assertion from the missing-clip half — a run can pass one and fail the
other). Fix with `POST /api/admin/lessons/prune-audio`; it deletes and reports them.

Related: [[project_tts_audio_cached_by_text]], [[project_lesson_progression_audio_traps]].
