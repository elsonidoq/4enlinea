---
name: project_lesson_disk_edit_cache_clobber
description: An admin lesson write reports 200 but your file is unchanged — either it saved the stale boot-time cache over your disk edit, or (filename slug != id) it forked the lesson into a different file entirely
metadata: 
  node_type: memory
  type: project
  originSessionId: ad93c596-0ef4-4b37-984d-dacf404370a9
  modified: 2026-07-29T14:04:41.004Z
---

**Nothing watches `connect-four/lessons/`.** `server/lessonLoader.js` reads every lesson file **once at boot** into a module-level `_lessons` array. `reloadLessons()` exists but is only ever called from *inside* the admin create/update/delete/generate-audio handlers — never by a file watcher, never on a timer, never on a plain read.

**The trap:** edit a lesson JSON on disk (a migration script, a hand edit, `git checkout` of a branch, a rebase) while a server process is running, then hit any admin lesson write endpoint. The handler reads the **stale boot-time cache**, mutates *that*, and calls `saveLessonFile(LESSONS_DIR, updatedLesson)` — writing the pre-edit object **back over your edited file**. Your disk edits are gone, and `reloadLessons()` then runs *afterwards*, so the cache and disk agree on the wrong content. The clearest case is `POST /api/admin/lessons/:id/generate-audio`:

```js
const lesson = getLessonsAll().find(l => l.id === req.params.id) ?? null;  // boot-time cache
const { lesson: updatedLesson, ... } = await generateLessonAudio(lesson, { lang });
saveLessonFile(LESSONS_DIR, updatedLesson);   // <-- writes the STALE object over the file
reloadLessons();
```

**Why it's invisible:** the endpoint returns `200` with a normal-looking `{generated: [...]}` body listing the slide messages it did synthesize. Nothing errors. If your edit added new content, `generated` simply omits it — which reads as legitimate content-addressing dedup ("same text → same hash → nothing to do"), not as data loss. `200` + a plausible `generated` array is **not** evidence the server saw your file.

**How to apply:** after any out-of-band edit to `lessons/*.json`, **restart the server before touching any admin lesson endpoint**. The Node server does not hot-reload anyway ([[project_app_qa_setup_gotchas]]). Probe the **admin** endpoint to confirm — it reads raw via `getLessonsAll()`, the same path the writers use, so it is the only honest check (`/api/lessons/:id` runs `localizeLesson`, which strips every `_es` field and reports on a path the generator never takes):

```
curl -s localhost:3001/api/admin/lessons/<id> | grep -c '<your new field>'   # 0 => STALE, restart
```

`requireAdmin` is a no-op outside `NODE_ENV=production` and `requireLocalhost` passes from the dev box, so this needs no auth setup locally ([[project_admin_localhost_directive]]).

**The inverse is safe, and worth knowing: writes made THROUGH the admin API need no restart.** Every
admin create/update/delete handler calls `reloadLessons()` after `saveLessonFile`, so disk and cache
stay in sync. Verified 2026-07-28: saved a `windowHighlights` window from the admin editor, then read
it back from `/api/admin/lessons/:id` **without restarting** — present and correct. Do not restart
`$API_PORT` "to be safe" after a UI save; in the main checkout that means killing half the owner's
running `npm run dev`.

**Using a real lesson as a throwaway browser fixture** (the only honest way to test a lesson-editor
change end to end): back the file up first (`cp lessons/lesson-NN-*.json <scratchpad>/`), do the UI
save, verify, then restore in **two** steps — `PUT /api/admin/lessons/:id` with the original JSON
(this refreshes the cache), then `cp` the backup back over the file (this guarantees byte-identical
formatting, since the server re-serializes). `git status --short lessons/` should come back clean.
Restoring only the file leaves the cache holding your test data.

**Why:** the boot-once cache is deliberate (no filesystem reads on request), and the admin handlers are the only sanctioned writers — so within the app's own model, cache *is* truth. The trap only exists because a human/script can write the same files behind its back. Related: [[project_lesson_progression_audio_traps]].

## Second mechanism, identical symptom: the write can land in a DIFFERENT FILE (2026-07-29, OI-80)

Everything above assumes the handler at least writes to *your* file. It may not. `saveLessonFile`
writes to `lessonFilePath(dir, lesson)`, which **constructs** the path —
`` `lesson-${String(lesson.order).padStart(2,'0')}-${lesson.id}.json` `` — instead of locating the
file it came from. So **if a lesson's on-disk filename slug is not byte-identical to its `id`, every
admin write forks it into a brand-new file** and leaves the original untouched. `findLessonFile`
shares the flaw (regex `^lesson-\d+-${id}\.json$`), so the delete and rename paths miss it too.

Worked example: `lessons/lesson-13-figure-7-trap.json` carried `id: "figure-7"`.
`POST /api/admin/lessons/figure-7/generate-audio` created `lessons/lesson-13-figure-7.json`; the
tracked file kept zero audio. Then it compounded — `reloadLessons()` picked up **both**, so the next
call's `getLessonsAll().find(l => l.id === 'figure-7')` matched the `-trap` entry (readdir order puts
it first: `-` 0x2D < `.` 0x2E), started from the audio-less copy, and **overwrote the freshly-written
file**, replacing English clips with Spanish-only ones. Net: 16 files, a duplicate id, one lesson
silently unvoiced in English. Both calls returned `200 { generated: [13 locators], failed: [] }`.

**The tell is that the diagnostic above passes.** `curl /api/admin/lessons/<id> | grep <new field>`
returns your content — it is reading the *fork*. So is the app. Only the filesystem disagrees. So
when a lesson write "worked" but the file you are watching is unchanged, add one check that the
per-file cache probe cannot make:

```
git status --short lessons/   # an untracked lesson-NN-<id>.json is the fork
ls lessons/ | wc -l           # 15; 16 means you have a duplicate id
```

As of 2026-07-29 all 15 lessons have slug == id, so the trap is **dormant, not fixed** — the next
lesson added with a mismatched slug re-arms it. Rename the file (keep `id` and the numeric prefix:
`id` keys `lesson_progress`, the prefix keys curriculum order) rather than editing `id`. Full
write-up and the recommended fix — identify by reading each file's `id`, plus a `lessonContent.test.js`
gate asserting slug == `id` and prefix == `order` — are in `docs/open_issues.md` **OI-80**.
