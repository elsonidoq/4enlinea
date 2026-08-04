---
name: project_new_category_wiring_checklist
description: "Pointer — before adding/removing a puzzle category, read docs/architecture/server-conventions.md §Category Registry; the trap is that omitting candidate-generator.js fails SILENTLY (no error, just no candidates)"
metadata:
  node_type: memory
  type: project
---

**Trigger: adding, renaming, or removing a puzzle category slug.**

The full wiring checklist now lives in **`docs/architecture/server-conventions.md` §Category Registry** ("Wiring a new puzzle category", plus "Retired category slugs" and the generation-quality guards). Read it there — this file is only the trigger + the reason you cannot skip it.

**Why this needs a trigger at all:** the failure is **silent**. `candidate-generator.js` dispatches on the category slug through an if/else chain; a slug that isn't wired in falls through with **no error** — generation just yields zero candidates for it, which reads as "the pipeline is broken" or "this category is rare" rather than "I forgot a file". Every other file in the checklist fails loudly; this one doesn't. `PAID_CATEGORIES` has the same shape of trap (defined in **two** files — `server/categories.js` and `src/lib/categories.js` — which must stay in sync).

Also non-obvious: **never reuse a retired slug** (`fork_setup`, `parity_control`, `zugzwang`, `claimodd`). Old rows, attempts, and stats keyed to the old slug silently resurface under the new meaning. The retired list + rationale is in the doc.

Related: [[project_generate_candidates_fetch_failed_flake]] — many categories at 0 can also be an env flake, not a wiring bug; check that before re-wiring anything.

## A per-category predicate can silently diverge from the shared one (2026-08-04, spec 057)

`candidate-generator.js` holds **two** places that decide whether a board is accepted for generation,
and they drifted apart for a long time without any error:

- the generic `checkPredicate` ends `return { passes: correctCols.length >= 1, correctCols };`
- `checkForcedWinPredicate` ended `return { passes: correctCols.length === 1, correctCols };`

The generic one carries a comment explaining exactly why `>= 1` is required (`evaluatePredicate`
returns `'correct'` only for a SOLE satisfying column and `'tied'` when 2+ satisfy, so a
multi-solution board otherwise "collects zero correctCols … and is wrongly rejected"). The
per-category one never received that fix, sitting **fifteen lines away**.

**The symptom was not an error — it was a low generation match rate**, i.e. it looked like the
category was simply rare. That is what makes this class expensive: filling `forced_win` to the N=20
floor cost many brute-force rounds, and the real cause was a one-character cardinality rule.

**Before touching any per-category `check<Category>Predicate`:**
1. Diff it against the generic `checkPredicate`'s accept rule. Divergence needs a stated reason.
2. `'tied'` is an **acceptance**, not a rejection, at every consumer — `answerSetInvariant.js`,
   `evaluateMoveHandler.js`, `index.js` (both the puzzle-check and inline-eval sites),
   `outcomeVocabulary.js`. A predicate that rejects ties is out of step with the whole stack.
3. Check what actually reads `passes` vs `correctCols`. For `forced_win` the only live caller read
   `correctCols` and tested `.includes(candidateCol)`, never `passes` — so the strict flag was
   costing generation yield while protecting nothing.

Related: OI-83 (the `forced_win` detection-completeness gap, still open — the cardinality fix did NOT
close it), OI-142 (the same class: a hardcoded per-category constant in `fill-candidate-pools.mjs`
with no cross-check against `server/categories.js`).
