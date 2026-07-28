---
name: project_lesson_disk_edit_cache_clobber
description: Editing lessons/*.json on disk while the server runs → the next admin lesson write silently saves the stale boot-time cache back over your edits
metadata: 
  node_type: memory
  type: project
  originSessionId: ad93c596-0ef4-4b37-984d-dacf404370a9
  modified: 2026-07-28T13:16:07.694Z
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
