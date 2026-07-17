# Phase 0 Research: Puzzle Generation & Correctness (Epic 4 / Spec 044)

## R1 — Dual-seam correctness: exact code locations (confirmed by direct read, 2026-07-10)

**Generation-time** — `connect-four/server/candidate-generator.js`:
- `checkPredicate(category, moveString, scores, solver)` (line 429) dispatches per category.
- For `immediate_threat` / `forced_block` / `double_threat` (the fallthrough branch, lines 442–456):
  computes `legalCols`, filters to `correctCols` where `evaluatePredicate(...).result === 'correct'`,
  then returns `{ passes: correctCols.length === 1, correctCols, correct_col: correctCols[0] ?? null }`.
  **This is the exact FR-010 bug**: a board with 2 legal winning/forking columns is rejected
  (`passes: false`) instead of accepted with both columns recorded.
- `checkUndercutPredicate` (line 331): computes `correctCols` as every legal column except the
  killing column (`c !== killingCol`), `passes: correctCols.length >= 1`. Already correct — avoid-
  the-pattern semantics. **Do not touch this function's core logic.**
- `checkZThreatPredicate` (306), `checkOvercutPredicate` (350), `checkClaimevenPredicate` (319),
  `checkFigure7Predicate` (363), `checkJShapePredicate` (390), `checkOddEvenThreatPredicate` (415):
  each returns a single `correctCols: [x]` — unique-answer semantics, unaffected by this feature.

**Solve-time** — `connect-four/server/predicates.js`:
- `evaluatePredicate(puzzle, candidateCol, scores)` (line 32) dispatches per category.
- `evalImmediateThreat` (53): if the played column is a winning column AND other winning columns
  exist, returns `{ result: 'tied', tiedWith: others, correctCol: winningCols[0] }` — **not** `'correct'`.
- `evalForcedBlock` (89) and `evalDoubleThreat` (122): same `'tied'` pattern (lines ~115, ~169, ~178).
- **Confirmed bug**: nothing in `candidate-generator.js`'s `checkPredicate` or anywhere in the
  generation path treats `'tied'` as an acceptable outcome — the multi-column filter only checks
  `r.result === 'correct'`, so a column that would legitimately score `'tied'` at solve-time is
  invisible to the generator's multi-column filter today. Fixing FR-010/FR-012 requires updating
  the acceptance predicate (`r.result === 'correct' || r.result === 'tied'`) in `checkPredicate`,
  and updating whatever downstream serving path renders `'tied'` to the learner as correct/accepted.

## R2 — Client-side routing trace (the FR-015a prerequisite; empirically confirmed, not assumed)

This directly resolves the spec's flagged unknown ("this spec does not trace which puzzle
categories are actually rendered through the client-side Socratic vs. Challenge screens").

**Finding — the spec's original premise about `ChallengeScreen.jsx` was WRONG in a specific way.**
Read directly (`src/screens/ChallengeScreen.jsx` handleColumnClick, ~line 192–277):
- ChallengeScreen does **not** do a bare `col === correctCol` comparison for scoring, in either of
  its two data paths (`lessonMode` embedded `confirmationChallenges` or the "legacy random draw"
  from `/api/puzzles/draw`). Line 138's `correct_col: ch.correctCol` is only object construction —
  it stores the value but nothing in this file compares against it for scoring.
- Scoring instead always goes through a network call to **`POST /api/evaluate-move`**
  (`server/index.js` line 1543), and the client trusts `data.quality` from that response.
- **The real gap**: `/api/evaluate-move` (server/index.js:1543–1599) computes `quality` via
  `scoreMove(scores, colInt)` (`server/moveQualityScorer.js`) — a **pure solver-score comparison**
  (is the played column's score equal to the best available score) — and **never calls
  `evaluatePredicate`/`predicates.js` at all**. So the category-specific correctness model
  (including the `'tied'`-as-correct fix from R1) is **not consulted** by the endpoint ChallengeScreen
  actually uses for the puzzle-draw flow. There is a *second*, richer endpoint —
  `POST /api/evaluate-move/inline` (server/index.js:1601–1671) — that **does** call
  `evaluatePredicate` and returns `correctCol`/`threatCells`, but nothing in `ChallengeScreen.jsx`
  currently calls this `/inline` endpoint; it's unused by this screen today.
- **Consequence for sizing FR-015a/FR-015b**: the client-side fix is not "swap a `===` comparison for
  a Set.has() check" in ChallengeScreen — for the puzzle-draw path it requires either (a) switching
  ChallengeScreen's fetch target to `/api/evaluate-move/inline` (which already calls
  `evaluatePredicate` and would inherit the R1 `'tied'`-as-correct fix for free) with a puzzle object
  parameter, or (b) adding the same `evaluatePredicate`-based accepted-answer check to
  `/api/evaluate-move` itself. Whether `scoreMove`'s pure-score comparison already happens to agree
  with `evaluatePredicate` for `immediate_threat`/`forced_block` (both are strictly win/lose, so a
  winning column is likely also the max-score column) but may **disagree for `double_threat`** (a
  fork-creating column need not be the single highest-scoring column, and a highest-scoring column
  need not create a fork) is an open empirical question the plan's implementation phase MUST verify
  with concrete boards before choosing (a) or (b) — do not assume score-tie implies fork-tie.

**Finding — `SocraticScreen.jsx`'s bypass is real, but it is out of the multi-solution categories'
scope entirely, not a variant of the same bug.**
Read directly (`src/screens/SocraticScreen.jsx` line 78): `const correct = col ===
lesson.socratic.correctCol;` — a genuine bare client-side comparison, no server call at all for
scoring.
- However, `lesson.socratic` is **hand-authored lesson content** (`server/lessonLoader.js`,
  `src/components/admin/SocraticEditor.jsx`), not a `puzzles`/`candidates` table row, and it has
  **no `category` field** anywhere in its schema (`grep` for `socratic.*category` in
  `server/index.js` returns nothing). It is authored by a human curator picking exactly one
  teaching move — the data shape (`socratic.correctCol`, singular) has no concept of an
  accepted-answer *set* to source from.
- **Conclusion for the plan**: FR-015a's inclusion of `SocraticScreen.jsx` in scope should be
  narrowed. Since Socratic lessons are not generated via `candidate-generator.js`/`checkPredicate`
  and carry no `category`, there is no `correctCols`/`'tied'` server answer set for this screen to
  consult — the fix belongs entirely to `ChallengeScreen.jsx` (both its data paths), where puzzle
  `category` and the generator/evaluator pipeline actually apply. A task in Phase 1 must confirm
  this (grep for any `category` field on lesson.socratic records in the DB/lesson JSON) before
  writing off SocraticScreen; if confirmed, tasks.md should scope FR-015a's implementation task to
  ChallengeScreen only, and note the Socratic finding as a documented non-applicability rather than
  silently dropping an FR-015a acceptance scenario.

## R3 — FR-009 forced-block gravity-top exemption (grounded, not reinvented)

- `getImmediateThreats(board, colHeights, player)` (`classifier.js:416`) only inspects
  `colHeights[col]` — i.e., it only reports threats that are immediately playable (gravity-top) —
  confirming the spec's Assumptions section: "a forced-block that is not gravity-top... does not
  trigger rejection under this rule" is already the natural behavior of the existing detector, not
  a new carve-out to build. US4.2/FR-006-009's generator-side check should reuse
  `getImmediateThreats`/`detectForcedBlock` (classifier.js:1380) directly rather than re-deriving
  gravity-top logic.

## R4 — KB backfill status (FR-020a), confirmed by direct read of each KB file

| Rule | KB `worked_examples` movestring | Status |
|---|---|---|
| allen-t1..t7 | all have concrete movestrings, `solver_verified: <date or true>` | **Already verified in KB** — no backfill needed for T1–T7. |
| allen-v1 | `movestring: PENDING` | Needs backfill from memory (`44452556366`). |
| allen-v2 | `movestring: PENDING` | Needs backfill from memory (`727364`). |
| allen-v3 | already has a real movestring (`77273746`), `solver_verified` present | Check — appears already populated; confirm during backfill task, do not skip verification. |
| allen-v4 | `movestring: PENDING` | Needs backfill from memory (`2134124321317273`). |
| allen-v5 | `movestring: PENDING` | Needs backfill from memory (`42354643256425346355663`). |
| allen-t4 (Case A) | `movestring: "0004111444466662552525506"`, `solver_verified: 2026-05-17` | Already verified in KB. |
| allen-t4 (Case B) | `movestring: "33104201250010221152"`, `solver_verified: 2026-05-17` | **KB already shows verified.** Memory (`reference_verified_tactical_movestrings.md`) says Case B is "still PENDING" — **memory is the stale source**, not the KB. The FR-020a reconciliation step must re-run `optimal_line.mjs`/`playGame` against `33104201250010221152` to confirm the KB's claim, then correct the memory file (not the KB) once confirmed.

**Implication for task sequencing**: FR-020a's backfill work is narrower than "all four V-rules
from scratch" — V1, V2, V4, V5 need real backfill from the memory table in
`reference_verified_tactical_movestrings.md`; V3 and both T4 cases need only a re-verification pass
(confirming existing KB content) plus, for T4 Case B specifically, fixing memory's stale PENDING
claim. This still must complete, and be independently re-verified via `optimal_line.mjs`/`playGame`
per FR-020a's explicit "not copied uncritically" requirement, before any V1/V2/V3/V4/V5/T4 operator
task begins.

## R5 — T1–T7 contract shape (confirmed against KB, not the Allen PDF)

Each `docs/knowledge-base/allen-t{1..7}.md` entry defines a `t*_applies`/`t*_winner`-shaped
predicate over a **threat set** (list of `{player, col, row}` tuples), not a board-mutation
operator — consistent with the spec's User Story 4 framing. `allen-t4.md`'s `formal_predicate`
(`t4_applies(threats, col) -> bool`) is the concrete template to follow for the other six —
implementation should read each KB entry's own `formal_predicate` block verbatim rather than
inferring a uniform shape from t4 alone (t1–t3, t5–t7 may return `(player, col)` rather than
`bool`; confirm each entry's own declared return shape during implementation, do not assume
uniformity).

## R6 — Existing test surfaces to extend (not create from scratch)

- `connect-four/tests/predicates/predicates.test.js` — extend for FR-010/FR-012/FR-013/FR-014
  regression coverage (server-side `evaluatePredicate`/`checkPredicate` acceptance logic).
- `connect-four/tests/integration/candidate-generator.test.js` — calls the real solver up to 400
  times per test; per `CLAUDE.md`/memory `project_integration_test_slowness`, do **not** run this
  via `npm run test:fast` loop during iteration — reserve for a final, explicitly-invoked
  `npm test` pass. All iterative validation of the generation-side fix should use small, targeted
  Node scripts against fixed movestrings (per `reference_inline_node_scripts`) or new unit tests
  that stub the solver, not this integration suite.
- No existing test file covers Allen T1–T7/V1–V5/T4 detectors — Phase 2 tasks must create a new
  test file (e.g. `tests/unit/allenRules.test.js`) sourcing every fixture from the (now-backfilled)
  KB `worked_examples`, per I12.

## R7 — T013 gating sweep result (Batch 2, closed 2026-07-10)

Full `rg 'evaluatePredicate'` sweep across `connect-four/` (server, tests, src). Classification
lives as a comment block atop `server/predicates.js` (source of truth); summary here:

- **fix-needed**: exactly one production caller — `server/candidate-generator.js:493` (the
  `checkPredicateRaw` fallthrough's `correctCols` filter for `immediate_threat`/`forced_block`/
  `double_threat`). This is the T016 change itself.
- **no-fix-needed**: `server/index.js:1646` (`/api/evaluate-move/inline` — category-agnostic
  passthrough, never gates on `'correct'` alone), `server/index.js:2317` (`/api/puzzles/:id/check`
  — already treats `'tied'` as success), `server/index.js:3101` (`/api/admin/scores` — already
  treats `'tied'` as pass), `server/debug-immediate-threat.js:9` (standalone debug script, not a
  production caller), and all `tests/**` hits (direct assertions on `evaluation.result`, not
  accept/reject business logic).

**Consequence for T017**: zero additional callers needed updating — T016 alone closes the fix. The
real remaining gap for FR-012/FR-015a is that `/api/evaluate-move` (the endpoint
`ChallengeScreen.jsx` actually calls, per R2 above) never calls `evaluatePredicate` at all — that
gap is closed by T020 (extend `/api/evaluate-move` in place), not by a `'tied'`-handling fix in an
existing caller.

## R8 — T014 finding: double_threat fork-tie vs score-tie (record-only, not a gate)

Ran `server/scripts/t014_score_tie_check.mjs` (playGame-sourced boards, mulberry32 seed 42) against
80 self-play games, found 8 `double_threat` positions with ≥2 fork-creating columns (per
`evaluatePredicate` returning `'correct'`/`'tied'`). **Counterexample found**: movestring
`34133344142063653445666225520` has fork columns `[1, 2]` but `scoreMove`'s max-score column set is
only `[2]` — column 1 creates a fork (is a legitimate `evaluatePredicate` answer) but is NOT a
solver-max-score column. This confirms plan.md's/data-model.md's guard note: `scoreMove`'s pure
solver-score comparison must NOT be treated as a stand-in for `evaluatePredicate`'s fork-set for any
purpose. Not a gate — nothing in T017/T020 consumes `scoreMove`'s output as an `evaluatePredicate`
substitute; both branch on `evaluatePredicate` directly.

## R9 — T015 finding: `/api/evaluate-move` request body shape (GATING, closed 2026-07-10)

Read `src/screens/ChallengeScreen.jsx`'s `handleColumnClick` (~line 192–225) and
`server/index.js`'s `POST /api/evaluate-move` handler (~line 1543–1544) directly.

**Finding: the request body ALREADY carries both `category` and `movestring`.**

- Client (`ChallengeScreen.jsx:221-225`):
  ```js
  fetch(`${API}/api/evaluate-move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movestring: current.move_string, col, category: effectiveCategory }),
  })
  ```
- Server (`server/index.js:1544`): `const { movestring, col, category } = req.body;` — already
  destructures all three fields.

**Consequence for T020/T021**: T021's "part 1" (edit the fetch body to send `category`+`movestring`)
is **already satisfied by existing code** — no client-side request-body edit is needed. T021 is
narrowed to only its "part 2": update `handleColumnClick` to read the new additive accepted-answer
field from the response for the three multi-solution categories. T020 can proceed directly to
adding the `evaluatePredicate`-gated check inside the existing handler, keyed off the `category`
value already being received.

## Decisions

- **Decision**: Fix FR-010/FR-012 by changing exactly two predicates: (1) `checkPredicate`'s
  multi-solution branch acceptance filter (`passes: correctCols.length >= 1`, record all matching
  cols) in `candidate-generator.js`, and (2) wherever `'tied'` results are currently discarded
  downstream (the puzzle-serving/scoring path identified in R2) so `'tied'` renders as correct.
  Rationale: matches the epic's "Settled decisions" verbatim — audit and correct, not redesign.
- **Decision**: FR-015a's implementation target is `ChallengeScreen.jsx` + its evaluate-move
  network call, not `SocraticScreen.jsx`. Rationale: R2's routing trace. Alternative considered:
  applying the fix uniformly to both screens regardless of data shape — rejected because
  `SocraticScreen`'s `lesson.socratic` data has no `category`/`correctCols` concept to source an
  accepted-answer set from; forcing one on would be inventing scope the spec's own Assumptions
  section didn't ask for once the routing fact is known.
  **This is a plan-level judgment call that narrows an FR — flag prominently for the spec owner/
  `/speckit-analyze` pass**, since it changes an acceptance scenario's applicability (Scenario 7 of
  US3) rather than just its implementation detail.
- **Decision**: Sequence tasks: KB backfill (FR-020a) → T1–T7 detectors (US4) → V1–V5/T4 operators
  (US5), gated per FR-021 (no V-rule operator implemented until its own backfill/reconciliation is
  done). T1–T7 do not depend on FR-020a since all seven are already KB-verified (R4).
- **Decision**: No board-mutation/candidate-pool-widening work of any kind is added anywhere in
  this plan (explicit `NOT included` item); T1–T7/V1–V5/T4 operators are implemented as pure
  functions over externally-supplied threat sets/movestrings, invoked from new unit tests and
  (optionally) exposed as importable utilities — not wired into `candidate-generator.js`'s sampling
  loop.
