# Data Model: Puzzle Generation & Correctness (Epic 4 / Spec 044)

This feature does not introduce new database tables or columns. It corrects the acceptance logic
around existing entities and adds new pure-function operators. Documented here per Constitution
Principle VIII (any entity/shape touched by a feature must be documented, even if unchanged).

## Existing entities touched (no schema change)

### Candidate board / Puzzle row (`candidates`, `puzzles` tables)
- Unchanged columns. The **shape** of `correctCols`/`correct_col` as computed by
  `checkPredicate` changes in *cardinality* for three categories only
  (`immediate_threat`, `forced_block`, `double_threat`): today always 0 or 1 entries; after this
  feature, 0 or N entries. `correct_col` (singular, DB column) continues to store the first/
  canonical entry for backward compatibility with anything that reads a single column. **Resolved**
  (see "Resolved: persistence (Q1) + client endpoint mechanism (Q2)" below): the full `correctCols`
  set is NOT persisted anywhere — it is recomputed at solve time via `evaluatePredicate` per
  submitted column, with no schema change and no new jsonb field. Do not add a schema change here.
- All other categories (`undercut`, `overcut`, `claimeven`, `z_threat`, `figure_7`, `j_shape`,
  `odd_even_threat`, `forced_win`, `forbidden_columns`) are unaffected — cardinality of their
  `correctCols` stays exactly as today.

### Answer column set (conceptual, not a DB table)
- **Fields**: `category` (string), `moveString` (string), `correctCols` (int[], 0-indexed columns),
  `tiedWith` (int[] — solve-time only, computed per submitted column by `evaluatePredicate`).
  **Terminology note**: `predicates.js` and most of `candidate-generator.js` name this field
  `moveString` (camelCase); the `/api/evaluate-move` wire contract (request body and
  `ChallengeScreen.jsx`'s fetch call) and one spot in `candidate-generator.js`
  (`afterBlock.movestring`) use lowercase `movestring`. This is a pre-existing naming drift in the
  codebase, not introduced by this feature and not in scope to rename — this doc uses `moveString`
  for the internal predicate-function parameter and `movestring` for the wire-level request/response
  field, matching each context's actual code.
- **Validation rule**: for `immediate_threat`/`forced_block`/`double_threat`, `correctCols.length
  >= 1` to pass generation (was `=== 1`); for `undercut`, unchanged (`>= 1`, avoid-the-pattern); for
  `z_threat`/`overcut`/`claimeven`/`figure_7`/`j_shape`/`odd_even_threat`, unchanged (`=== 1` in
  practice, though not all explicitly assert it — see per-category audit task).
- **State**: computed once at generation time (`candidate-generator.js`), re-derivable at solve
  time (`predicates.js:evaluatePredicate`) for any single submitted column against the same
  category logic — the two must never diverge (this is the FR-012/Edge-Case-5 invariant).

## Existing entities newly *read* by this feature (no change)

### Lesson `socratic` record (`server/lessonLoader.js`, hand-authored via `SocraticEditor.jsx`)
- Fields relevant to R2 finding: `movestring`, `correctCol` (singular, no `category` field).
- **Confirmed**: this record has no accepted-answer-set concept and is not produced by
  `candidate-generator.js`. Out of scope for the FR-015a fix (see research.md R2) — documented here
  so a future reader does not assume Socratic puzzles share the `candidates`/`puzzles` correctness
  model.

## New entities (pure functions, not persisted)

### T-rule detector (`t{1..7}_winner` / `t{1..7}_applies`)
- **Input**: a threat set — `{ player: 1|2, col: 0..6, row: 0..5 }[]` — extracted from a board
  (not the board itself).
- **Output**: per each KB entry's own declared shape (`(player, col) | None` for winner-shaped
  rules; `bool` for applicability-shaped rules like T4's `t4_applies`) — do not assume uniformity
  across T1–T7, confirm each entry's `formal_predicate` individually (research.md R5).
- **Source of truth**: `docs/knowledge-base/allen-t{1..7}.md` `formal_predicate` block, verbatim.
- **No board-reachability/gravity check applies** — a threat set with no corresponding coherent
  board is a valid input (spec Edge Case 3).

### V-rule / T4 operator (`v{1..5}_evaluator`, `t4_case_a_evaluator`, `t4_case_b_evaluator`)
- **Input**: a (possibly T1–T7-simplified) threat set plus enough context to determine
  parity/column-claim ownership (per each rule's own `formal_predicate`).
- **Output**: game-theoretic outcome consistent with the KB entry (`Red wins` / `Black wins` /
  `Draw`, mapped to P1/P2 per the CLAUDE.md color table — never "Red"/"Black" in code or
  user-facing text).
- **Source of truth**: `docs/knowledge-base/allen-v{1..5}.md` and `allen-t4.md` (Case A / Case B),
  each **after** the FR-020a backfill/reconciliation for V1, V2, V4, V5, and T4 Case B (V3 and T4
  Case A are already backfilled per research.md R4, but still require the same re-verification
  pass through `optimal_line.mjs` before an operator is implemented).

## Resolved: persistence (Q1) + client endpoint mechanism (Q2) as one coupled decision

Q1 (does the full `correctCols` array need to be persisted?) and Q2 (does `ChallengeScreen.jsx`
switch to `/api/evaluate-move/inline` or does `/api/evaluate-move` gain an `evaluatePredicate`
check?) are **one decision, not two independent ones**: whichever endpoint mechanism is chosen
determines what (if anything) needs to be persisted, and vice versa.

**Decision**: Extend `/api/evaluate-move` in place (do not switch `ChallengeScreen.jsx` to
`/inline`). Concretely:
- Pass `category` and `movestring` in the `/api/evaluate-move` request body (a **prerequisite fact
  that must be confirmed empirically before this decision is trusted** — verify the current request
  body already carries, or can trivially be extended to carry, both fields; if it cannot, this
  decision must be revisited).
- Add an `evaluatePredicate`-gated accepted-answer check inside `/api/evaluate-move`, applied only
  to the three multi-solution categories (`immediate_threat`, `forced_block`, `double_threat`).
- Expose the result as an **additive** response field (e.g. `accepted: bool` or `correctCols`) —
  never repurpose `quality`, `badge`, `coachPhraseKey`, `coachMood`, `summaryLineKey`, or
  `patternTag`, each of which has other callers (grep before touching).
- **No schema change, no persistence of the full `correctCols` array**: recompute at solve time via
  `evaluatePredicate` per submitted column, since the function already re-derives correctness/
  `'tied'` independently for any single column with no extra storage needed.
- The `/inline` endpoint alternative is **rejected**: it already calls `evaluatePredicate` but
  requires a `puzzle` object payload the current `ChallengeScreen.jsx` call site doesn't send,
  making the swap a larger client-side change than extending `/api/evaluate-move` in place for no
  additional correctness benefit.
- **Recorded guard note, not a gate**: a `double_threat` fork-creating column need not be the single
  max-score column (score-tie != fork-tie) — this is worth verifying with a concrete board and
  recording, but nothing in this decision's implementation (T020) actually consumes `scoreMove` as a
  stand-in for `evaluatePredicate`; both T017 and T020 branch on `evaluatePredicate` directly, so this
  check does not gate any task.

## Open question carried into tasks.md

1. **RESOLVED (T015, Batch 2, 2026-07-10)**: Confirmed by direct read of
   `src/screens/ChallengeScreen.jsx`'s `handleColumnClick` fetch call (~line 221-225) and
   `server/index.js`'s `POST /api/evaluate-move` handler (~line 1544): the request body **already
   carries both `category` and `movestring`**
   (`body: JSON.stringify({ movestring: current.move_string, col, category: effectiveCategory })`,
   destructured server-side as `const { movestring, col, category } = req.body;`). No client-side
   request-body edit is required — T021's client-side work is narrowed to reading the new additive
   accepted-answer field from the response only. See research.md R9 for the full finding.
