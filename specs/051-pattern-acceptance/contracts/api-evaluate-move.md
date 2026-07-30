# Contract Delta: `POST /api/evaluate-move`

This documents the change to be made in `docs/architecture/api-conventions.md`'s "Move Evaluation
Endpoint" section (FR-029). Current documented contract quoted for reference in `research.md`; this
file specifies the delta only.

## New request field

| Field | Direction | Convention |
|---|---|---|
| `puzzleId` | client → server | Optional. Puzzle row UUID. When present, selects the **stored-set grading branch** (FR-024). |

`correctCol`/`highlightMetadata` remain in the request body, sent unconditionally by
`ChallengeScreen.jsx` as they are today (FR-017/FR-027 — not removed in this feature). When
`puzzleId` is present, the stored-set branch ignores them and grades from the puzzle row's stored
`correct_cols` instead.

## Branch selection (exactly two branches — FR-024/FR-024a/FR-025/FR-026)

**Owner decision, 2026-07-29 (Blocking #1, stronger than this contract's original design)**: the
stored-set branch grades **directly** against `correct_cols` — `correct_cols.includes(playedCol)` —
and never calls `evaluatePredicate`/`buildPredicatePuzzle`/any of the seven pattern evaluators. The
end-to-end trace of how `correct_cols` gets from generation to this read is in `research.md`
Decision D2a; do not re-derive it, read it.

```
if (req.body.puzzleId) {
  // Stored-set branch (NEW)
  // 1. Look up the puzzle row by id (is_active = true), same query shape as
  //    POST /api/puzzles/:id/check (server/index.js:2463-2469), extended with correct_cols:
  //      .select('id, category, move_string, highlight_metadata, correct_col, correct_cols')
  //      .eq('id', puzzleId).eq('is_active', true).single()
  // 2. 404 if not found (same as /check).
  // 3. If puzzle.correct_cols === null (not yet backfilled — FR-024a):
  //      fall through to the Computed-live branch below, using the ROW's
  //      category/move_string/correct_col/highlight_metadata as the request-shape inputs.
  //      This is fail-open, not an error — a live drill must never grade every column wrong
  //      just because a row hasn't been backfilled yet.
  //    Else:
  //      accepted = puzzle.correct_cols.includes(colInt)
  //      — computed DIRECTLY. evaluatePredicate/buildPredicatePuzzle and the seven pattern
  //      evaluators (evalZThreat, evalClaimeven, evalUndercut, evalOvercut, evalFigure7,
  //      evalJShape, evalOddEvenThreat) are NOT called on this path at all (Decision D2a).
  //      req.body's category/correctCol/highlightMetadata are ignored once puzzleId resolves
  //      to a row with a non-null correct_cols.
} else {
  // Computed-live branch (UNCHANGED — existing behavior, byte-for-byte)
  // Exactly what evaluateMoveHandler.js does today: build the predicate object from
  // req.body's movestring/category/correctCol/highlightMetadata, grade via evaluatePredicate
  // (whose seven evaluators are widened per FR-003 — set membership, not scalar equality).
  // Serves lesson inline challenges, any request that omits puzzleId (Clarification Q2,
  // research.md D2), AND the FR-024a NULL-correct_cols fallback above — there is no third,
  // "malformed" branch.
}
```

**Safety floor (FR-026)**: both branches are safe under the same `isSolverSafe`/`optimalCols`
definition in `answerSetInvariant.js`, but the mechanism differs — the computed-live branch calls it
directly, at grading time (exactly as `evaluatePredicate`/`acceptedCols` do today); the stored-set
branch does **not** call it at grading time at all. It is safe by construction because the value it
reads (`correct_cols`) was produced by a writer (generation or backfill) that already called
`isSolverSafe` when building the set. Neither branch, and neither writer, restates the rule
independently — see `research.md` Decision D2a for why this is stronger than routing the stored-set
branch through the evaluators with a handed-in set.

## Response shape

Unchanged shape (`{ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag,
accepted }`) — no new response fields. `accepted`'s existing semantics (`true`/`false`/`null`
gated by `MULTI_SOLUTION_CATEGORIES ∪ SINGLE_ANSWER_CATEGORIES`) are unchanged; only *how* `accepted`
is computed differs between the two branches (direct `correct_cols.includes(...)` on the stored-set
branch vs. `evaluatePredicate` on the computed-live branch). **`correct_cols` itself is never added to
the response** — client-side grading was considered and explicitly rejected (owner decision,
`research.md` Decision D2b); the response also carries `quality` alongside `accepted`, and
`ChallengeScreen.jsx`'s promoted/demoted reconciliation needs both together, so shipping the set to
the client would only add a second place correctness is computed, not remove the API call.

## Errors

- `404 { error: 'puzzle not found' }` — new, stored-set branch only, when `puzzleId` does not
  resolve to an active row (mirrors `POST /api/puzzles/:id/check`'s existing 404 shape).
- Existing `400`/`500` shapes for invalid `movestring`/`col`/solver failure are unchanged and apply
  to both branches identically.

## Non-goals (explicitly out of scope, per spec Assumptions / NOT included)

- No change to `POST /api/puzzles/:id/check` itself (a separate, pre-existing endpoint with its own
  puzzle-id lookup) — this feature does not touch it, though its query shape is the direct
  precedent this contract follows.
- No change to `/api/evaluate-move/inline`.
- No new response field for either branch — in particular, `correct_cols` is NOT added to the
  response for client-side grading or as a UI hint (owner clarification #2, 2026-07-29; explicitly
  named an early optimization, addable later with no rework — see `research.md` D2b).
