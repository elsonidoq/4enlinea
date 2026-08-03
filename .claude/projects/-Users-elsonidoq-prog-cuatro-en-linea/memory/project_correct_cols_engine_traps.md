---
name: project_correct_cols_engine_traps
description: "correct_cols answer-set engine: checkPredicate vs checkPredicateRaw, a load-bearing circular import, and how to tell whose fault a backfill's rejections are"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5a9b4604-3aa6-404b-b156-9daf756db036
  modified: 2026-08-03T14:16:52.540Z
---

**Trigger: you are touching `candidate-generator.js`, `predicates.js`, `answerSetInvariant.js`, or the `correct_cols` backfill.** Four traps, none visible from reading any one file.

**0. The `undercut`/`overcut` "show nothing" behavior is EMERGENT FROM A NULL — nobody implemented it.** `candidate-generator.js` forces `correct_col = null` for these two categories while `correct_cols` stays **fully populated**; every display consumer (curation hint marker, puzzle-picker label, the `server/index.js` response site, the puzzle→lesson adapter) merely null-tests the scalar. So the moment you migrate any of them to `correct_cols[0]`, they start rendering **column 0** as "the answer" — the meaningless value spec 051's FR-019 exists to prevent — and no test catches it, since these admin screens have no coverage. The word "preserve" in any spec is misleading: retiring the scalar *deletes* the mechanism, so suppression must be **built**. Traps within the trap: `undercut` and `overcut` are both members of `SINGLE_ANSWER_CATEGORIES`, so that set is **not** a usable discriminator; and `server/index.js`'s second `correct_col ?? null` site is the **grading input** to the predicate evaluator, not a response field — suppressing there grades correct answers as wrong. Written up in full in spec 056.

**1. `checkPredicate` and `checkPredicateRaw` are two different functions one letter apart.** `checkPredicate` is the exported wrapper; `checkPredicateRaw` is the inner per-category dispatch. The ascending sort of `correctCols` and the `correct_col = correctCols[0]` scalar sync (with its `undercut`/`overcut` NULL carve-out) live **only** in the wrapper, immediately before its final `return result;`. Add a category or a new write path that calls the *Raw* function and you silently get unsorted columns and a stale scalar — with no test failing, because every existing caller goes through the wrapper. `tests/unit/checkPredicateSortAndScalarSync.test.js` asserts this for all twelve categories; keep it that way.

**2. `predicates.js` ↔ `answerSetInvariant.js` is a mutually circular ESM import, and it only works by accident of shape.** `answerSetInvariant.js` imports `evaluatePredicate`/`buildPredicatePuzzle`; `predicates.js` imports `isSolverSafe`. This is safe *only* because both sides are function declarations referenced inside other function bodies — nothing dereferences the other module at module-evaluation time. **Move any cross-module call to module-top-level scope and the app dies at import time**, not at call time, so the failure looks like a startup crash unrelated to your edit.

**3. A backfill rejecting hundreds of rows is usually not your bug.** The `candidates` table accumulates rows generated under older, looser predicate logic; they fail `checkPredicate` today and would have failed it yesterday. Spec 051's backfill deactivated 156 rows (`double_threat` candidates 30→3) which looked alarming and was entirely pre-existing.
- **How to attribute it, before you "fix" anything:** take one rejected board, `git stash push` **only** the predicate/detector files, re-run `checkPredicate` on it, and compare. Same rejection on both sides ⇒ stale data, not a regression. **Do this in a scratch checkout, never in a tree a subagent is working in** — and never chain the restore behind a solver call (`stash && node solver-script && stash pop`): the solver hangs on shutdown often enough that the command gets killed mid-chain and the stash is never popped. See [[feedback_concurrent_agents_clobber]].

Contrast the puzzles table, where a mass rejection *is* worth investigating: those rows were curated and should mostly survive.

Cross-ref [[project_puzzle_row_write_sites]] (there are 5 hand-written insert sites, none shared), [[feedback_generate_puzzles_for_local_qa]], `docs/architecture/data-model.md` §"Where puzzle/candidate answer columns are written".
