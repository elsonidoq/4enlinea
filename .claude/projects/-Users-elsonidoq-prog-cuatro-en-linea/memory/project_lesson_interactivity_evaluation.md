---
name: project_lesson_interactivity_evaluation
description: "How lesson interactivity is evaluated — Socratic is a client-side scalar with no solver; inline confirmationChallenges DO work (via /api/evaluate-move, not /check)"
metadata: 
  node_type: memory
  type: project
  originSessionId: d7194ddb-70f6-4602-a846-18bfc9014c46
  modified: 2026-07-30T13:43:38.585Z
---

Two different evaluation paths for lesson interactivity.

- **Socratic** (`SocraticScreen.jsx`): evaluated **purely client-side** — `col === lesson.socratic.correctCol`.
  No server call, no solver, no predicate. Its soundness rests entirely on a **content**
  invariant: the authored column must be the *unique* solver optimum, or a learner who plays an
  equally-winning column is told "Not quite". That invariant is now enforced by
  `tests/lessons/lessonAnswerSets.test.js`.
- **Confirmation-challenge drills** (`ChallengeScreen` `lessonMode`): evaluated **server-side** via
  `POST /api/evaluate-move`, which takes `{movestring, col, category, correctCol, highlightMetadata}`
  and needs **no DB puzzle row**. Correctness is `data.accepted === true` for any category in
  `MULTI_SOLUTION_CATEGORIES ∪ SINGLE_ANSWER_CATEGORIES`, else `data.quality === 'optimal'`.

**CORRECTED 2026-07-28 — the old note here said inline `confirmationChallenges` "do NOT work"
because `POST /api/puzzles/:id/check` 404s on an `inline-…` id. That is stale.** `/check` is
reached **only** from `handleForbiddenSubmit` (the `forbidden_columns` path). Every `single_move`
challenge — which is all lesson challenges — goes through `/api/evaluate-move`. Lessons are
therefore **self-contained**: they carry `moveString` / `correctCol` / `highlightMetadata` inline,
and as of 2026-07-28 not one of the 24 lesson `puzzleId`s resolved to a row in the local `puzzles`
table. Consequences:

- Deleting or retiring `puzzles` rows cannot break a lesson.
- But the admin lesson editor's puzzle **picker** reads real rows, so re-picking a challenge finds
  nothing if that category's pool is empty. A lesson's stored `puzzleId` is close to decorative.
- `recordPuzzleAttempt` still posts that dangling `puzzle_id`, which has an FK to `puzzles`.

**A lesson's `puzzleId` MUST NOT reach `/api/evaluate-move`** (owner rule, 2026-07-30: *"lessons
should not use the puzzle id at any place, since the whole puzzle is inside the lesson"*). It is
**authoring provenance**, read only by `AdminLessonEditorScreen.jsx` (stamps it on curation),
`PuzzlePickerModal.jsx` (dedupes already-added puzzles) and `PuzzlePickerRow.jsx` (displays it) —
never a runtime reference. `ChallengeScreen.jsx`'s lesson branch therefore mints
``id: `inline-${ch.moveString}` `` **unconditionally**, ignoring any authored `ch.puzzleId`, and
`src/lib/syntheticPuzzleId.js` strips `inline-`/`dev-` ids from the request body so these requests
take the row-less computed-live branch.

**Why this bites:** spec 051 briefly sent `puzzleId` for every board while the server 404'd on a
lookup miss — silently killing grading feedback on *every* lesson confirmation challenge, because
`ChallengeScreen` commits its phase change **before** the response lands and swallows the rejection
in a `.catch`. Nothing appeared on screen; the move just committed with no verdict. If lesson
challenges ever send an id again, that is the failure mode, and it is invisible in the UI.

Also: `evaluatePredicate` (`predicates.js`) is **category-keyed** with **no generic best/winning-move
predicate** — an unknown `goalPredicateType` falls through to `{ result: 'wrong' }`.

**How to apply:** for a lesson "pick the column" interaction, the Socratic is cheapest and needs no
DB anything — just make sure the answer is the unique optimum. Inline confirmation challenges are
fully functional; do not "fix" them by seeding puzzle rows. Convert KB movestrings to `boardSpec`
with `boardToSpec(parseMovestring(ms))` (`src/lib/movestring.js`).

Related: [[project_lesson_answer_set_invariant]], [[project_lesson_json_fields_not_rendered]].
