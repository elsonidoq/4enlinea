---
name: project_lesson_progress_unlock_is_pairwise
description: "lesson_progress unlock check is pairwise (immediate predecessor only), not a furthest-lesson pointer — manually editing one row doesn't unblock earlier lessons"
metadata: 
  node_type: memory
  type: project
  originSessionId: 22a23c27-5cdc-42bd-a3b8-7566bba3de2d
  modified: 2026-07-27T19:01:55.186Z
---

Manually setting a `lesson_progress` row's `lesson_id` to some later lesson (e.g. `'j-shape'`) to
"unblock everything up to it" for QA does **not** work — the lessons before it stay locked.

**Why:** `deriveLockReason` in `src/screens/sagaLock.js` (documented in
`docs/architecture/frontend-conventions.md` §"Saga Lock Reasons") computes `orderLocked` purely
pairwise: lesson `L` is locked unless its **immediate predecessor** (by numeric `lesson-NN-`
filename prefix / `order`) has a `lesson_progress` row with `completed_at` non-null. There is no
"furthest lesson reached" pointer anywhere in the schema — `lesson_progress(user_id, lesson_id,
completed_at)` has one row per lesson (`UNIQUE(user_id, lesson_id)`), and every predecessor needs
its own completed row.

**How to apply:** To unblock lessons up to `X` for QA, mark **every predecessor lesson** complete
individually, not just one row. Use
`connect-four/server/scripts/backfill-lesson-progress.mjs --user <uuid> --up-to <lessonId> --env local|staging|production`
(or `--all` for the whole curriculum) — it reads lesson order from `connect-four/lessons/*.json`
(same source as `lessonLoader.js`), upserts `completed_at` for every predecessor, refuses to run
unless the target user already has a `public.users` row, and requires a typed "Yes" confirmation
(has `--dry-run` and `--help`).
