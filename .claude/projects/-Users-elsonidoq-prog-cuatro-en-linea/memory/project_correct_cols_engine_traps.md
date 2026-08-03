---
name: project_correct_cols_engine_traps
description: "correct_cols answer-set engine: checkPredicate vs checkPredicateRaw, a load-bearing circular import, and how to tell whose fault a backfill's rejections are"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5a9b4604-3aa6-404b-b156-9daf756db036
  modified: 2026-08-03T17:14:12.936Z
---

**Trigger: you are touching `candidate-generator.js`, `predicates.js`, `answerSetInvariant.js`, or the `correct_cols` backfill.** Four traps, none visible from reading any one file.

**0. The `undercut`/`overcut` "show nothing" behavior is now EXPLICIT — spec 056 built it (RESOLVED 2026-08-03; this trap previously said the opposite).** It *used* to be emergent from `correct_col = null`; the scalar is gone, so the suppression is real code: `SUPPRESSED_SINGLE_COLUMN_CATEGORIES = new Set(['undercut','overcut'])`, duplicated by hand into `server/categories.js` **and** `src/lib/categories.js` (duplicate-and-sync, never cross-imported), plus `isSuppressedSingleColumnCategory()` in `server/index.js`. What still bites:
- **Suppression is DISPLAY-ONLY.** Apply it at the four display sites (puzzle-detail response, curation hint marker, `PuzzlePickerModal` label, the `AdminLessonEditorScreen` puzzle→lesson adapter that feeds `PuzzlePickerRow`). Apply it to a **grading input** — `/api/puzzles/:id/check`'s predicate object, `/api/puzzles/draw`, `/api/admin/puzzles` — and every correct undercut/overcut answer grades **wrong**, silently.
- **`SINGLE_ANSWER_CATEGORIES` is still not a usable discriminator** — `undercut` and `overcut` are both members of it.
- Never fall back to `correct_cols[0]` for these two: it renders a meaningless "col 0" and persists `0` into authored lesson JSON.
Full contract in `docs/architecture/data-model.md` §"Correct Column Storage".

**1. `checkPredicate` and `checkPredicateRaw` are two different functions one letter apart.** `checkPredicate` is the exported wrapper; `checkPredicateRaw` is the inner per-category dispatch. The ascending sort of `correctCols` lives **only** in the wrapper, immediately before its final `return result;`. Add a category or a new write path that calls the *Raw* function and you silently get unsorted columns — with no test failing, because every existing caller goes through the wrapper. (The scalar sync that used to live here, and `tests/unit/checkPredicateSortAndScalarSync.test.js` which guarded it, were both **deleted by spec 056** — `correct_cols` is now the only output. The sort is what remains unguarded.)

**2. `predicates.js` ↔ `answerSetInvariant.js` is a mutually circular ESM import, and it only works by accident of shape.** `answerSetInvariant.js` imports `evaluatePredicate`/`buildPredicatePuzzle`; `predicates.js` imports `isSolverSafe`. This is safe *only* because both sides are function declarations referenced inside other function bodies — nothing dereferences the other module at module-evaluation time. **Move any cross-module call to module-top-level scope and the app dies at import time**, not at call time, so the failure looks like a startup crash unrelated to your edit.

**3. A backfill rejecting hundreds of rows is usually not your bug.** The `candidates` table accumulates rows generated under older, looser predicate logic; they fail `checkPredicate` today and would have failed it yesterday. Spec 051's backfill deactivated 156 rows (`double_threat` candidates 30→3) which looked alarming and was entirely pre-existing.
- **How to attribute it, before you "fix" anything:** take one rejected board, `git stash push` **only** the predicate/detector files, re-run `checkPredicate` on it, and compare. Same rejection on both sides ⇒ stale data, not a regression. **Do this in a scratch checkout, never in a tree a subagent is working in** — and never chain the restore behind a solver call (`stash && node solver-script && stash pop`): the solver hangs on shutdown often enough that the command gets killed mid-chain and the stash is never popped. See [[feedback_concurrent_agents_clobber]].

Contrast the puzzles table, where a mass rejection *is* worth investigating: those rows were curated and should mostly survive.

Cross-ref [[project_puzzle_row_write_sites]] (there are 5 hand-written insert sites, none shared), [[feedback_generate_puzzles_for_local_qa]], `docs/architecture/data-model.md` §"Where puzzle/candidate answer columns are written".
