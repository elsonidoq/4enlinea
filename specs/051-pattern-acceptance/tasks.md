# Tasks: Pattern Acceptance — Multi-Column Answers + Solver-Safety Invariant

**Input**: Design documents from `specs/051-pattern-acceptance/` (`spec.md`, `plan.md`, `research.md`,
`data-model.md`, `contracts/api-evaluate-move.md`, `quickstart.md`)
**Prerequisites**: all of the above read in full. `docs/epics/open-issues-epics.md`'s Epic 1 section
(closing OI-75, OI-61 item 1) is the source-of-record for scope; `docs/open_issues.md` OI-81 is the
deferred `correct_col` retirement — **out of scope**, do not create tasks for it.

**Tests**: Explicitly requested by the spec (FR-030, Constitution III, and every user story's
"Independent Test"). Included throughout, not optional here.

**Baseline (verified 2026-07-29, this worktree, `cd connect-four && npm run test:fast`)**: **1479
pass / 5 fail** out of 1484, 201 suites. The 5 pre-existing failures — `server/tests/
branchInvariance.test.mjs`, `server/tests/causalLinksComposers.test.mjs`, `server/tests/
reasonRenderFixes.test.mjs`, `server/tests/renderCoverageCorpus.test.mjs` (ENOENT), `server/tests/
renderCoverageUniverse.test.mjs` (ENOENT) — are in the unrelated blunder-`reason` evidence engine.
**Every verification task below is phrased against this baseline: "these 5 and only these 5 may
fail," never "all tests pass."** If a 6th test fails, or one of the 5 fails for a *different* reason
than today, that is a regression this feature introduced.

**Never run `npm test`** for this feature's regular loop — `tests/integration/
candidate-generator.test.js` calls the real solver up to 400×/run and routinely hangs. Only run it
if explicitly verifying candidate generation.

**Movestring discipline (every task below that needs a concrete board)**: harvest it via
`gameSampling.js#playGame` or an existing per-category integration test board — never hand-construct
one — and confirm it with `./visualize_board.sh <movestring>` before writing any assertion about it.
**`docs/knowledge-base/allis-claimeven.md` and `allen-j-configuration.md` both carry the literal
placeholder string `"PENDING"` in their `false_positives` field — do not treat either as a source of
usable fixtures for claimeven/j_shape counterexamples; harvest fresh.** The repo's existing
`connect-four/tests/integration/claimeven.test.js` fixture `'3233333556'` is **not** a reliable
2-column claimeven harvest either — verified at source (2026-07-29): running `detectClaimeven`
against it today returns `matched: false` (the simulation doesn't confirm), so it cannot be reused
as-is for T021's 2-column fixture; harvest a fresh board via `playGame`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel with sibling tasks in the same phase (different files, no ordering
  constraint against each other)
- **[Story]**: `FOUND` (Foundational), `US1`–`US4` per spec.md's four user stories
- Every file path below was verified to exist in this worktree before being cited; symbols are
  named, not line-numbered (line numbers drift in a concurrently-edited repo — locate by symbol)

---

## Correction note (2026-07-29, plan-review pass — read before starting)

An earlier draft of this task list contained two source-level defects and one unsatisfiable
dependency cycle, all fixed in this version:

1. **claimeven was never actually made multi-valued.** `detectClaimeven`
   (`connect-four/server/classifier.js`) picks exactly ONE candidate column — `oddCols[0]` for
   subtype A (`oddCols.length === 1`), `oddCols.find(c => c !== lastCol)` for subtype B
   (`oddCols.length === 2`) — and rejects outright (`matched: false`) for 0 or 3+ odd-height columns.
   It runs one `runClaimevenSimulation` on that single column; `checkClaimevenPredicate`
   (`connect-four/server/candidate-generator.js`) wraps the result as `correctCols:
   [result.correctCol]`, a one-element array. An earlier draft's "wiring" task claimed this was
   already multi-valued and needed no detector change — verified false at source. **New T018/T019
   below do the real work**, generalizing to every odd-height column per Allis's base Claimeven rule
   (`docs/knowledge-base/allis-claimeven.md`: standard Claimeven applies independently, per column, to
   any odd/even vertically-adjacent pair — the code's 2-column "subtype B" is Allis's documented
   **extended, cross-pairing special case** for a single left-over unpaired odd column, not a cap on
   how many columns may be evaluated; the current 0-or-3+ rejection is an implementation gap, not a
   domain constraint).
2. **The promotion site was wrong, and there turned out to be a third one.** Promotion (copying a
   column onto a served `puzzles` row) is not in `candidate-generator.js` at all. Verified at source:
   `generateCandidates` only builds an in-memory array (no DB write); the actual
   `candidates`-table insert is in `connect-four/server/index.js`'s `POST /api/admin/generate`
   handler; promotion to `puzzles` happens in **three** places, not the two an earlier pass named —
   `server/index.js`'s two admin-approval routes (`POST /api/admin/candidates/:id/approve`,
   `POST /api/admin/candidates/approve-batch`) **and** `connect-four/server/scripts/
   audit_answer_ambiguity.mjs#repairPuzzles`'s `--repair` remediation path, which inserts directly
   into `puzzles` with its own separate hand-enumerated column list. All three currently omit
   `correct_cols`. New T039–T042 below cover all three plus the in-memory field they read from.
3. **A circular dependency.** An earlier draft silently converted the plan's *dry-run* "after" pool
   measurement into "after the real backfill has run," manufacturing an unsatisfiable cycle
   (threshold-setting waits on the real backfill; the real backfill waits on the threshold). Per
   `plan.md`/`research.md` FR-023a (quoted verbatim): *"The backfill's own `--dry-run` mode... prints
   what it would write; it is explicitly NOT a... competing source of the FR-022 pool numbers"* — the
   **audit script** (`audit_answer_ambiguity.mjs`, updated by T004 to cross-check `correct_cols`) is
   the single measurement path, both before and after the code fix, and needs no backfill script or
   real backfill run at all: re-running it after US2's code fix lands (with `correct_cols` still
   `NULL` everywhere — no DB write has happened) already measures what the eventual backfill will
   produce. This is what let the migration and audit-script update hoist into **Foundational**, and
   what lets US2's whole before/after/threshold block (T024–T035) stay self-contained inside Phase 4
   with **no forward reference to US3 at all**.

The task list below is renumbered top-to-bottom with no forward references. **65 tasks, T001–T065**
(see Task count at the end for the accounting).

---

## ⚠️ Cross-story ordering constraints (read before starting any story)

Two hard orderings still cut across the US1–US4 boundaries (a third, present in an earlier draft, is
gone now that the migration and audit-script update are Foundational and the pool measurements are
audit-script-based — see the Correction note above):

1. **T001 (the relative solver-safety floor, `isSolverSafe`) blocks every widening task in US1 and
   US2.** Nothing in US1/US2 that checks per-column safety has anything to import until T001 lands.
2. **US3's stored-set grading branch (T051, implementing `correct_cols.includes(playedCol)` in
   `evaluateMoveHandler.js`) MUST ship strictly after US3's own real backfill run (T048) completes —
   by decision, not merely by dependency** (Blocking #3c). The NULL-fallback (FR-024a) makes it
   *technically* safe to land earlier; that is exactly the trap: landing it early means every
   stored-set request silently falls through to the computed-live branch for the entire rollout
   window, defeating US3's "computed once" goal with no test able to catch it (both paths produce
   the same `accepted` by construction). Enforced below as an explicit task dependency, not a
   suggestion.

---

## Phase 1: Setup

No new project structure, dependencies, or tooling — this feature extends five existing server
modules, adds one migration and one backfill script inside the existing `connect-four/server/`
tree, and makes two additive frontend edits. **No Setup-phase tasks are required.**

---

## Phase 2: Foundational (blocks US1, US2, and US3)

**Purpose**: the one piece of code every widening task imports, plus the two shared prerequisites
(schema + audit-script cross-check) that both US2's pool measurements and US3's backfill ultimately
depend on. Hoisting these two here (owner Decision #2, 2026-07-29) is what makes the rest of the list
executable top-to-bottom with no forward references.

- [x] **T001** `[FOUND]` Add `isSolverSafe(col, scores)` to `connect-four/server/answerSetInvariant.js`
  as a one-line wrapper around the existing `optimalCols` export (`return optimalCols(scores)
  .includes(col);`), per FR-001. Do **not** modify `classifyAnswerSet`'s `LOST-POSITION` branch — it
  already encodes the relative floor for lost positions (FR-002) and must survive unchanged.
- [x] **T002** `[P] [FOUND]` Unit test `isSolverSafe` in a new or extended test alongside
  `answerSetInvariant.js`'s existing tests: (a) a won board — the absolute case reduces correctly
  (only `scores[C] > 0`-and-best columns pass); (b) a fully-lost board (`LOST-POSITION`, every legal
  column negative) — at least the slowest-loss column(s) pass, proving the relative floor, not an
  absolute one. Harvest both boards via `playGame`/an existing integration fixture; do not
  hand-construct. Register the test file in both `test` and `test:fast` in
  `connect-four/package.json` in this same task if it is new.
- [x] **T003** `[FOUND]` Immediately before writing the migration, re-verify the next migration
  number is still `061` (`ls connect-four/server/migrations/ | sort -V | tail -5` — this is a
  concurrently-edited repo; re-check fresh, don't trust this doc's snapshot; confirmed 2026-07-29:
  latest is `060_paddle_rename_and_payment_events.sql`). Create
  `connect-four/server/migrations/061_correct_cols.sql` adding `correct_cols integer[] DEFAULT NULL`
  to both `puzzles` and `candidates`, following the `016_correct_col.sql` precedent, including the
  "HUMAN REVIEW REQUIRED before applying to production" comment line per `data-model.md`'s
  documented Migration Naming convention (FR-013). No new `GRANT` statements needed —
  `016_correct_col.sql`'s existing table-level grants already cover new columns (re-verify against
  the live schema before applying, per data-model.md's own caveat).
- [x] **T004** `[FOUND]` Update `connect-four/server/scripts/audit_answer_ambiguity.mjs` to also
  `SELECT correct_cols` (in addition to its current `id, category, move_string, correct_col,
  highlight_metadata` list — verified: none of the script's `.select(...)` calls include
  `correct_cols` today) and cross-check the stored value against its own live `acceptedCols(...)`
  re-derivation, flagging any mismatch (FR-023a). **This is the single measurement path for both
  `undercut` and `overcut`'s before/after pool counts in US2**, per Decision #2 — no other tool
  competes with it (see the Correction note's point 3: the backfill's own `--dry-run` mode is
  explicitly NOT a second source of these numbers). Depends on T003 (the column must exist for the
  `SELECT` to succeed). Since this runs before any backfill, `correct_cols` will legitimately be
  `NULL` for every row — the cross-check should treat that as "not yet comparable," not a failure.

**Checkpoint**: `isSolverSafe` exists and is tested; the migration is applied locally; the audit
script can read and cross-check `correct_cols`. US1 and US2 can now begin.

---

## Phase 3: User Story 1 — A learner's genuinely-correct move is never marked wrong (P1)

**Goal**: every pattern-category evaluator (`evalZThreat`, `evalClaimeven`, `evalFigure7`,
`evalJShape`, `evalOddEvenThreat`, and — set-membership-wise — `evalOvercut`) grades by set
membership, not single-scalar equality, on the row-less/computed-live branch (FR-003, scope note);
`odd_even_threat` becomes graded at all (closes OI-75); `claimeven`'s answer set is genuinely
enumerated to more than one column where the board supports it (FR-011/FR-012).

**Independent Test** (spec.md): for a solver-verified board with 2+ independently pattern-satisfying,
solver-safe columns, `evaluatePredicate` returns `correct`/`tied` for every qualifying column and
`wrong` for a non-qualifying one — testable directly, no server/DB required.

### odd_even_threat wiring (OI-75) — land first, nearly free (plan.md Sequencing Note 2)

- [x] **T005** `[US1]` In `connect-four/server/predicates.js`, change the `evaluatePredicate` dispatch
  line for `odd_even_threat` (currently `case 'odd_even_threat': return
  evalOddEvenThreat(candidateCol, puzzle);`) to pass `scores` through:
  `evalOddEvenThreat(candidateCol, puzzle, scores)` (FR-006 — today `scores` is dropped even though it
  is already in scope at the call site). Widen `evalOddEvenThreat` itself to accept membership in the
  already-computed `correctCols` array (`checkOddEvenThreatPredicate`
  (`connect-four/server/candidate-generator.js`) already returns a `correctCols` array — verified at
  source, no detector change needed) rather than equality against `puzzle.correctCol` alone,
  returning the FR-003 tri-state shape (`{ result, correctCol?, tiedWith? }`).
- [x] **T006** `[P] [US1]` Add `'odd_even_threat'` to `SINGLE_ANSWER_CATEGORIES` in
  `connect-four/server/categories.js` (FR-007).
- [x] **T007** `[P] [US1]` Add `'odd_even_threat'` to `SINGLE_ANSWER_CATEGORIES` in
  `connect-four/src/lib/categories.js` (the hand-mirrored frontend copy — never cross-imported; keep
  the literal identical to T006 by hand, FR-007).
- [x] **T008** `[US1]` Reword the in-code comments above `MULTI_SOLUTION_CATEGORIES` and
  `SINGLE_ANSWER_CATEGORIES` in **both** `connect-four/server/categories.js` and
  `connect-four/src/lib/categories.js` to describe gating the `accepted` response field, not answer
  cardinality (FR-008) — every category is graded against a stored set after this feature, so the
  old "single answer column" framing is no longer accurate. Depends on T006/T007 (edit the same
  blocks).
- [x] **T009** `[US1]` Regression test: confirm lesson 07's two `odd_even_threat` boards
  (`3553515566110063` correct col 3, `3411022114433433` correct col 2 — cited in the epic's
  Non-obvious facts) still pass `connect-four/tests/lessons/lessonAnswerSets.test.js` after T005.
  Run the full file, not a targeted subset.
- [x] **T010** `[US1]` Harvest (via `playGame`, never hand-constructed) a solver-verified
  `odd_even_threat` board with 2+ independently qualifying, solver-safe columns; add fixtures to
  `connect-four/tests/predicates/fixtures/fixtures.json` asserting `evaluatePredicate` returns
  `correct`/`tied` for each qualifying column and `wrong` for a non-qualifying one. Also harvest a
  board where the odd-threat column concedes a fork worse than the board's optimum, and assert it is
  excluded (rejected as an invalid puzzle candidate) under T001's floor. `tests/predicates/
  predicates.test.js` currently has **0** `odd_even_threat` fixtures (per plan.md's Constitution
  Check) — this is required new coverage, not polish.

### Tier A — cheap, already-sweeping detectors (FR-009)

- [x] **T011** `[P] [US1]` Convert `checkFigure7Predicate` and `checkJShapePredicate`
  (`connect-four/server/candidate-generator.js`) from "return on first matching column" to
  "accumulate every matching column" — verified at source: both already loop `for (let col = 0; col <
  7; col++)` and `return` immediately on the first match; change the loop body's `return` to a `push`
  into an array, keep looping, return the full array as `correctCols`.
- [x] **T012** `[US1]` Widen `evalFigure7`/`evalJShape` (`connect-four/server/predicates.js`)
  correspondingly to set membership against the stored `correctCols`, per the FR-003 tri-state
  contract. Depends on T011 (consumes its output shape).
- [x] **T013** `[US1]` Harvest a solver-verified `figure_7` board and a `j_shape` board, each with 2+
  independently qualifying, solver-safe columns; add fixtures asserting every qualifying column
  grades `correct`/`tied` and a non-qualifying column grades `wrong`. Also harvest one
  floor-violating fixture per category (a matching column that concedes worse than the board's
  optimum) and assert generation-time rejection under T001. Depends on T011, T012.

### Tier B — detectors need a set-returning mode (FR-010, narrowed per Decision A — no cardinality relaxation)

- [x] **T014** `[P] [US1]` Extend `detectZThreat` (`connect-four/server/classifier.js`) to add an
  additive `correctCols: candidates.map(c => c.col)` field to **both** existing return branches
  (matched and rejected-multi-candidate) — verified at source: it already builds a full `candidates`
  array via its per-column sweep and already rejects unless `candidates.length === 1`; it only needs
  the extra field. `matched`/`cells`/`highlightMetadata` semantics are byte-identical to today for
  every existing caller (`classifyPattern`'s live tagging is untouched).
- [x] **T015** `[P] [US1]` Extend `detectOvercut` (`connect-four/server/classifier.js`) from
  early-`return` to full accumulation — verified at source: today it is a genuine nested-loop early
  return (`for (col) { for (R of colRows) { ... return {...} } }`, no `matches` array exists) — keep
  the *first* match's exact existing return shape (`matched`/`reason`/`cells`/`highlightMetadata`,
  byte-for-byte, so `classifyPattern` is unaffected) but continue the scan and add
  `correctCols: matches.map(m => m.col)`. Per research.md Decision D3, preserve "first qualifying row
  per column wins" inside the inner loop — only the outer loop's early-`return` becomes
  accumulation. This is genuinely new control flow (unlike T011's Tier A conversion) — schedule with
  the most test coverage (plan.md Sequencing Note 3).
- [x] **T016** `[US1]` Widen `checkZThreatPredicate`/`checkOvercutPredicate`
  (`connect-four/server/candidate-generator.js`) to consume the new `correctCols` field from T014/
  T015, and widen `evalZThreat`/`evalOvercut` (`connect-four/server/predicates.js`) to grade against
  it. **Do NOT add a uniqueness guard to `checkOvercutPredicate` in this task** — that is Finding F1's
  fix, deliberately deferred to US2 (T032 below) with its own before/after pool-count discipline;
  this task only widens the *consume/grade* shape. `detectZThreat`'s existing `candidates.length !==
  1` rejection (inside the detector itself) is untouched (it already enforces the singleton per
  FR-010). Depends on T014, T015.
- [x] **T017** `[US1]` Harvest a solver-verified `z_threat` fixture confirming the singleton
  cardinality still holds (a 2-candidate board is still rejected at generation time, unchanged
  behavior) and a floor-violating `z_threat`/`overcut` fixture (matching column concedes worse than
  optimum) asserting rejection. Depends on T016.

### Tier B — claimeven full enumeration (FR-011/FR-012 — real work, corrects an earlier draft's no-op)

> **Why this section exists**: an earlier draft's claimeven "wiring" task claimed the detector
> already produced a set and needed only a wiring confirmation. Verified false at source
> (2026-07-29): `detectClaimeven` (`connect-four/server/classifier.js`) picks exactly one
> `correctCol` per subtype and runs exactly one `runClaimevenSimulation` on it, and rejects any board
> with 0 or 3+ odd-height columns outright — there is no enumeration to "wire up." T018–T020 build
> it. This closes Epic 1's acceptance criterion ("every category's stored answer is a solver-gated
> **set**") and Settled Decision 6 for `claimeven`.
>
> **Domain check** (`docs/knowledge-base/allis-claimeven.md`, read in full — not its `PENDING`
> `false_positives`): Allis's base Claimeven rule applies **independently, per column**, to any
> vertically-adjacent odd/even empty-square pair — there is no cap on how many columns may
> simultaneously admit it. The code's `oddCols.length === 2` "subtype B" implements Allis's
> documented **Extended Claimeven** (a cross-column pairing special case for exactly one left-over
> unpaired odd column, per the KB's "Extended Claimeven (two-odd-columns variant)" section) — it is
> a *different, additional* rule, not evidence that claimeven is capped at 1–2 columns. The current
> code's outright rejection of boards with 0 or 3+ odd columns is a genuine implementation gap, not a
> domain constraint, and T018 must not preserve it as if it were one.

- [x] **T018** `[US1]` Extend `detectClaimeven` (`connect-four/server/classifier.js`) to evaluate
  **every** odd-height column as an independent standard-Claimeven candidate — not only `oddCols[0]`
  (subtype A) or the single non-last-played column of an odd-column pair (subtype B) — running a
  **separate** `runClaimevenSimulation` for each odd-height column found (any count ≥ 1, not capped
  at 2) and collecting every column whose simulation confirms `yellowWins` into a `correctCols`
  array. Preserve Allis's Extended Claimeven cross-pairing check (today's subtype-B logic) as an
  *additional* candidate-producing path alongside the per-column standard check, not a replacement
  for it — a board with exactly two odd columns may have the cross-pair response, the standalone
  per-column response(s), both, or neither pass simulation; include whichever pass. Preserve
  `matched`/`correctCol`/`categoryEvidence` byte-for-byte for the existing `classifyPattern` live-tagging
  caller (additive-field discipline, Decision D-TierB, same as T014/T015). If `oddCols.length === 0`,
  no claimeven candidate exists — unchanged (`matched: false`).
- [x] **T019** `[US1]` Widen `checkClaimevenPredicate` (`connect-four/server/candidate-generator.js`)
  to return the **full** `correctCols` array from T018's `detectClaimeven` output rather than the
  current `correctCols: [result.correctCol]` one-element list — verified at source, this is the exact
  line that makes claimeven single-valued today. **State the per-column solver cost explicitly**
  (FR-011, previously the largest un-costed item in the plan): each `runClaimevenSimulation` call
  (`classifier.js`) simulates up to `MAX_PAIRS = 60` red/yellow move-pairs, issuing one
  `solver.query(...)` per pair — a rollout of roughly 20 solver queries in typical practice (it
  returns as soon as a win/loss is decided; 60 is only the hard ceiling). Full enumeration now costs
  one such rollout **per odd-height column tested**, up to `(number of odd-height columns) × ~20`
  solver queries per accepted claimeven candidate, versus one rollout today. This lands entirely at
  generation/backfill time (never per learner request, per FR-011) — state this cost explicitly in
  any generation-time budget discussion rather than absorbing it silently.
- [x] **T020** `[P] [US1]` Widen `evalClaimeven` (`connect-four/server/predicates.js`) to tri-state set
  membership against the now-genuinely-multi-valued `correctCols` from T019, per FR-003. Do not add a
  uniqueness constraint (FR-012 — explicitly forbidden; claimeven legitimately has no uniqueness
  rule). Depends on T019 (consumes its output shape).
- [x] **T021** `[US1]` Harvest a solver-verified `claimeven` board with 2+ independently valid
  response columns (per the spec's Edge Case: "claimeven boards with multiple independently-valid
  columns... no uniqueness constraint") — this fixture is now genuinely harvestable via
  `playGame`/`visualize_board.sh` once T018–T020 land. Do **not** reuse
  `connect-four/tests/integration/claimeven.test.js`'s existing `'3233333556'` fixture — verified at
  source (2026-07-29) that `detectClaimeven` returns `matched: false` against it today — and never
  reach for `docs/knowledge-base/allis-claimeven.md`, whose `false_positives` fixtures are the literal
  placeholder string `"PENDING"`. Assert both grade `correct`/`tied`; also harvest one
  floor-violating claimeven fixture and assert rejection. Depends on T018, T019, T020.

### Documentation (FR-020, US1-owned bullets) and closeout

- [x] **T022** `[US1]` Update `docs/architecture/server-conventions.md`'s §Predicate Evaluator
  paragraph (currently: *"For the six `SINGLE_ANSWER_CATEGORIES` the detectors are instance
  detectors — they return their first match and a single column, so there is no cheap way to
  enumerate a set. Those evaluators legitimately compare against the stored scalar…"*) to describe
  the new set-returning contract; also fix `server-conventions.md`'s stale line *"Categories that
  store their answer as a scalar (claimeven, figure_7, j_shape) read `puzzle.correctCol`."* (verified
  still present at source) to describe reading `puzzle.correctCols` post-FR-024; update the §Category
  Registry section's wording to match T008's reword (gating `accepted`, not cardinality); document
  the `{ result, correctCol, tiedWith, … }` tri-state contract, citing `evalDoubleThreat` as the
  reference implementation for the *contract shape only* (per Settled Decision 1 — never its sweep).
  Depends on T005–T021 (describes the shipped shape, not a plan).
- [x] **T023** `[US1]` Update `docs/open_issues.md` OI-75 with a dated `UPDATE 2026-07-29` block
  (per the epic's Issue Closeout Convention) stating that `odd_even_threat` is now a graded category
  (evidence: T005's dispatch fix, T009's lesson-07 regression pass, T010's multi-column fixtures) —
  do **not** mark it fully `RESOLVED` yet; the final resolved-with-date entry lands in US4 (T065)
  once the post-backfill audit (US3) has also run, per FR-033's "closed out in the same change that
  ships the fix" read against this feature's full scope.

**Checkpoint**: `odd_even_threat`, `figure_7`, `j_shape`, `z_threat`, `overcut`, `claimeven` all grade
by set membership on the computed-live branch, and `claimeven`'s stored set is a genuine enumeration
(not a single scalar); OI-75 is functionally closed pending final audit sign-off.

---

## Phase 4: User Story 2 — A pattern-matching move that hands the opponent a worse position is rejected (P1)

**Goal**: `undercut` is never graded correct for a non-killing column that concedes strictly more than
the board's own optimum, on **both** the generation path and the grading path (closes OI-61 item 1);
the sibling `overcut` uniqueness gap (Finding F1) is fixed under the identical before/after
discipline (Decision #1). Both categories' full before/after/threshold pool-measurement blocks
complete **entirely within this story** — see the Correction note's point 3: the "after" measurement
is a dry run via re-running the (now cross-checked, T004) audit script after the code fix lands, not
a measurement taken after US3's real backfill, so nothing here waits on US3.

**Independent Test** (spec.md): a solver-verified `undercut` board where a non-killing column
concedes a fork/win worse than the board's own optimum is rejected by both `checkUndercutPredicate`
and `evalUndercut` — testable directly against the two functions plus a harvested solver score array,
no server required.

**Depends on**: T001 (the floor), T004 (the cross-checked audit script, Foundational).

### Undercut safety floor (FR-004/FR-005)

- [x] **T024** `[US2]` Add a per-column `isSolverSafe(col, scores)` check inside
  `checkUndercutPredicate` (`connect-four/server/candidate-generator.js`) when building its answer
  set at generation time — today it marks every non-killing column "correct" with no score check at
  all (FR-005, closes OI-61 item 1 on the generation path).
- [x] **T025** `[US2]` Apply the identical `isSolverSafe` check inside `evalUndercut`
  (`connect-four/server/predicates.js`) on the grading path (FR-004, closes OI-61 item 1 on the
  grading path). T024 and T025 are independent implementations of the same fix and both are required
  — fixing only one leaves the other's defect live.
- [x] **T026** `[P] [US2]` Harvest (via `playGame`) a solver-verified `undercut` board where a
  non-killing column concedes strictly more than the board's own optimum; add a red-first test
  asserting `checkUndercutPredicate` rejects the board as an invalid candidate AND `evalUndercut`
  returns `wrong` for that column. Depends on T024, T025.
- [x] **T027** `[P] [US2]` Harvest a genuine `LOST-POSITION` `undercut` board (every legal move
  loses) where the taught column is among the slowest losses; add a regression test asserting the
  board still passes (the relative floor, not an absolute one, per FR-002/Decision 5 — this is what
  keeps `undercut` alive as a category). Depends on T024, T025.

### Before/after pool counts — undercut (FR-021, FR-022)

- [x] **T028** `[US2]` Run `node server/scripts/audit_answer_ambiguity.mjs --puzzles undercut --env
  local` (T004's cross-checked script) to record the **before** count of active `undercut` rows,
  measuring current DB state prior to T024/T025 landing in code. Depends on T004 only.
- [x] **T029** `[US2]` **Dry-run "after" measurement**: after T024/T025 land in code — but strictly
  *before* any backfill runs and *before* `correct_cols` is written anywhere — re-run the identical
  audit command to record the **after** count for `undercut`. Per the Correction note's point 3, this
  is the single measurement path (the audit script re-run, not the backfill's `--dry-run`) and needs
  no backfill script or real backfill run to exist yet; `correct_cols` is still `NULL` for every row
  at this point. Report the before/after delta (FR-021) — this is not hypothetical:
  `checkUndercutPredicate` today marks every non-killing column correct with no score check, so
  tightening it is expected to invalidate an unknown fraction of the live pool (the file's own header
  comment records a milder prior tightening "retired 7 perfectly good undercut puzzles"). Depends on
  T024, T025, T028.
- [x] **T030** `[US2]` From T028/T029's data, set the FR-022 minimum-viable-pool threshold for
  `undercut` (a concrete number derived from the measured before/after delta, per research.md D4 — do
  not invent a number in advance). If the after-count falls below the threshold, this task also
  triggers replace-not-exempt remediation (`audit_answer_ambiguity.mjs --repair --yes --puzzles
  undercut`, FR-023 — the tool already implements this, `repairPuzzles`/`--repair --yes`) before the
  feature ships. Any replacement row this inserts will have its `correct_cols` populated later by the
  real backfill (US3, T048) regardless of whether the `repairPuzzles` insert-site fix (T042 below)
  has landed yet — the later full backfill recomputes every active row.

### Overcut Finding F1 (uniqueness gap) — Decision #1 guard rails (FR-010 sub-decision, FR-021a/FR-022a)

- [x] **T031** `[US2]` Run `node server/scripts/audit_answer_ambiguity.mjs --puzzles overcut --env
  local` (T004's cross-checked script) to record the **before** count for `overcut`, **strictly
  before** T032's uniqueness-guard fix lands — per Decision #1, this measurement must exist even
  though the code change "looks like a one-liner." Depends on T004.
- [x] **T032** `[US2]` Add the missing uniqueness guard to `checkOvercutPredicate`
  (`connect-four/server/candidate-generator.js`): `if (result.correctCols.length !== 1) return {
  passes: false, correctCols: [] };`, using the `correctCols` field US1's T015 added to
  `detectOvercut`. This is the overcut-side sibling of the OI-61 undercut defect (Finding F1) — today
  a board with 2+ structurally valid overcut columns silently enters the pool with only the
  first-found column recorded, and the aggregate `answerSetHolds` check never sees the second column
  to catch it. Depends on T015 (US1), T031 (measurement must precede this fix).
- [x] **T033** `[US2]` **Dry-run "after" measurement**: after T032 lands (still strictly pre-backfill,
  same discipline as T029), re-run the audit command for `overcut` to record the **after** count;
  report the before/after delta (FR-021a) — same discipline as undercut's T029, extended explicitly
  per Decision #1 (a milder tightening already retired 7 undercut puzzles; overcut gets no exemption
  for looking small). Depends on T031, T032.
- [x] **T034** `[US2]` From T031/T033's data, set the FR-022a minimum-viable-pool threshold for
  `overcut`; if the after-count falls below it, trigger FR-023 replace-not-exempt remediation
  (`--repair --yes --puzzles overcut`) before ship, identically to T030.

### Closeout

- [x] **T035** `[US2]` Update `docs/open_issues.md` OI-61 item 1 with a dated `UPDATE 2026-07-29`
  block: the safety floor is now enforced on both the generation path (T024) and the grading path
  (T025), with a red-first counterexample (T026) and the LOST-POSITION exemption verified to survive
  (T027) — do not mark fully `RESOLVED` yet; the final entry (with post-backfill pool-count evidence)
  lands in US4.

**Checkpoint**: `undercut` is safety-gated on both paths; `overcut`'s Finding F1 uniqueness gap is
closed with full before/after discipline entirely via dry-run pool measurements, with no dependency
on US3's backfill; OI-61 item 1 is functionally closed pending final audit sign-off.

---

## Phase 5: User Story 3 — The answer set is computed once, not independently re-derived at serving time (P2)

**Goal**: `correct_cols integer[]` (schema already landed in Foundational) is populated at generation
and by a backfill (never re-derived at serving time), and `/api/evaluate-move` gains a stored-set
grading branch that reads it **directly** — with the seven pattern evaluators bypassed entirely —
strictly after the real backfill has run.

**Independent Test** (spec.md): generate/re-verify a puzzle of any category; confirm `correct_cols`
is populated at generation/backfill time with no serving-time recomputation, and a grading request
against a real `puzzleId` reads the stored value rather than recomputing.

**Depends on**: US1 + US2 fully landed (the backfill and generation-time writes call the now-widened
`check*Predicate` functions from both stories); T003/T004 (Foundational — already landed).

### Centralized sort + scalar sync (D6) — FR-016a, FR-019, and the stale comment fix

- [x] **T036** `[US3]` Inside `checkPredicate` (the exported wrapper in
  `connect-four/server/candidate-generator.js`, **not** `checkPredicateRaw` — verified at source,
  these are two separate functions one letter apart), immediately before its final `return result;`,
  add: (a) `result.correctCols = [...result.correctCols].sort((a, b) => a - b);` (FR-016a, ascending
  order); (b) `result.correct_col = (category === 'undercut' || category === 'overcut') ? null :
  (result.correctCols[0] ?? null);` (FR-019, with the undercut/overcut carve-out — these two
  categories deliberately store no single correct column, verified at source in
  `checkUndercutPredicate`/`checkOvercutPredicate`'s own `correct_col: null` return lines and their
  explanatory comments). This centralizes both the sort and the scalar sync at the one point both
  generation and the backfill (T043 below) write from — do not add either rule inside any individual
  `check*Predicate` function.
- [x] **T037** `[US3]` In the same edit (same function, adjacent code), fix the stale comment at
  `checkPredicate`'s `forbidden_columns` exemption (verified at source, currently: *"forbidden_columns
  is exempt: its `correctCols` are the columns to AVOID, so the subset relation is inverted..."*) —
  this is factually wrong: `checkForbiddenColumnsPredicate` returns `correctCols: safeCols` (the
  **accepted/safe** columns, verified at source), not the columns to avoid. Correct the comment text
  in place (FR-020's fifth bullet). This was explicitly flagged in the handoff as a fix the plan-fix
  agent could not apply itself (no-implementation-code boundary) — do not skip it because it looks
  cosmetic.
- [x] **T038** `[US3]` Regression test asserting, **for every one of the twelve categories, not a
  sample**: `checkPredicate`'s output `correctCols` is ascending-sorted, and `correct_col` matches the
  FR-019 rule (`correctCols[0]`, or `NULL` for `undercut`/`overcut` regardless of what
  `correctCols[0]` would be). This is the handoff's explicitly-called-out requirement — a future
  category bypassing T036's centralized point, or a future edit to the undercut/overcut carve-out
  list, must be caught here; it will not "fall out" of any other test in this feature. Depends on
  T036, T037, and on every `check*Predicate` function from US1/US2 already producing a `correctCols`
  array (T011, T016, T019, T024, T032).

### Generation-time writes (FR-014) — three real insert sites, verified

`checkPredicateRaw`'s `claimeven` dispatch already threads through whatever `checkClaimevenPredicate`
returns with no changes needed (see T019) — there is no separate "wiring" task for that. What
actually needs `correct_cols` threaded through are three concrete insert sites, none of which is
`candidate-generator.js`'s `checkPredicateRaw`, plus the in-memory field they all read from:

- [x] **T039** `[US3]` In `generateCandidates` (`connect-four/server/candidate-generator.js`), add a
  `correctCols: correctCols` field to the object pushed into the in-memory `candidates` array
  (alongside the existing `correct_col: matchedCorrectCol` field) — verified at source, this array
  currently carries `correct_col` but no plural `correctCols` field at all, even though
  `predicateResult.correctCols` is already computed and in scope. This is the source value every
  downstream write site below reads from. Depends on T036 (the centralized sort/sync must have run
  inside `checkPredicate` before this value is captured).
- [x] **T040** `[US3]` In `connect-four/server/index.js`'s `POST /api/admin/generate` handler, add
  `correct_cols: c.correctCols ?? null` to the `rows = result.candidates.map(c => ({...}))` object
  that builds the actual `supabase.from('candidates').insert(rows)` payload (alongside the existing
  `correct_col: c.correct_col ?? null` line) — verified at source, `generateCandidates` itself never
  touches Supabase; this handler is where the real DB write happens. Depends on T039.
- [x] **T041** `[US3]` In `connect-four/server/index.js`'s **both** promotion routes (`POST
  /api/admin/candidates/:id/approve` and `POST /api/admin/candidates/approve-batch`, verified at
  source to be two independent, duplicated handlers, not a shared function): add `correct_cols` to
  each route's `.select(...)` fetch of the candidate row (alongside the existing `correct_col` field),
  and add `correct_cols: candidate.correct_cols ?? null` to each route's `puzzles` `.insert({...})`
  object (alongside the existing `correct_col: candidate.correct_col ?? null` line). Add a test
  asserting a promoted puzzle row has **non-null** `correct_cols` when the source candidate had one
  — the concrete assertion Blocking #3 requires. Depends on T040.
- [x] **T042** `[US3]` `connect-four/server/scripts/audit_answer_ambiguity.mjs#repairPuzzles` (the
  `--repair` remediation path) is a **third** promotion site not named in an earlier review pass —
  verified at source: it inserts directly into `puzzles` with its own separate hand-enumerated column
  list, bypassing both admin routes on purpose (its own header comment: "there is nothing for a human
  to curate here"). Add `correct_cols: c.correctCols ?? null` to its insert object literal (alongside
  the existing `correct_col: c.correct_col ?? null` line) before the final `sb.from('puzzles')
  .insert(rows)` call. Without this, every replacement puzzle `--repair --yes` inserts (used by
  US2's T030/T034 remediation) would ship with `correct_cols: NULL` until the next full backfill —
  functionally recoverable (T048 below recomputes every active row) but still a gap this task closes

  > **A FIFTH write site exists — verified at source 2026-07-29, missed by every review pass.**
  > `POST /api/admin/seed-puzzles` (`connect-four/server/index.js`, locate by route string) inserts
  > `server/data/placeholder_puzzles.json` **verbatim** (`supabase.from('puzzles').insert(p)` where
  > `p` is the parsed JSON object) — it has no field list to extend, so a new column appears only if
  > the JSON file itself carries it. It is `requireLocalhost` dev-seed data, so it cannot affect
  > served puzzles in staging or production and does NOT need its own task. Named here so the
  > "which sites write a puzzle row?" question has one complete answer; the authoritative table is
  > `docs/architecture/data-model.md` §"Where puzzle/candidate answer columns are written".
  > If placeholder seed data is ever used to populate a real pool, add `correct_cols` to that JSON
  > or route it through the backfill first.
  directly, matching T041's parity for the two admin routes. Depends on T039.

### Backfill (FR-015/FR-016/FR-016a/FR-016b/FR-019, D5)

- [x] **T043** `[US3]` Write `connect-four/server/scripts/backfill-correct-cols.mjs`, following
  `backfill-lesson-progress.mjs`'s conventions (`.mjs`, manual `.env`/`.env.staging`/`.env.production`
  parsing reading `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, `--help`/`-h` printed and
  `process.exit(0)` **before** any required-arg validation, `--dry-run` prints the plan with no
  writes, a typed `"Yes"` confirmation gate before any live write). **Critical**: for each active row,
  call the **same** `checkPredicate(category, move_string, scores, solver)` generation uses (never a
  simplified re-derivation, FR-015) — scores from a fresh `solver.query(move_string)` — and write its
  already-sorted-and-synced `correctCols`/`correct_col` (inherits T036's centralized logic for free).
  Batch writes (not sequential row-by-row awaits) for reasonable runtime over ~295+ rows. Note: this
  script's `--dry-run` mode is a preview of what the real backfill would write, not a competing
  source of US2's FR-022/FR-022a pool-threshold numbers (Correction note point 3) — those were
  already established via the audit script in Phase 4 (T029/T033).
- [x] **T044** `[US3]` In the same script, implement FR-016b: when `checkPredicate` returns `{
  passes: false, correctCols: [] }` for a previously-active row, **deactivate** the row (`is_active =
  false`) rather than writing the empty array to a row left active — this is a data defect, not a
  valid state for an active row, and must not be conflated with a row the backfill hasn't reached yet
  (`correct_cols IS NULL`, handled separately by T051's FR-024a grading-time fallback). Report which
  rows this affects as part of the backfill's own output.
- [x] **T045** `[US3]` Test: backfill idempotency — run the backfill's core recompute-and-write logic
  twice (against a stub/small sample, per the Pure Function Extraction pattern —
  `testing-conventions.md`) and assert the second run produces **byte-identical** `correct_cols`
  (same members, same order) and `correct_col`, proving FR-016's idempotency requirement. Depends on
  T043, T036.
- [x] **T046** `[US3]` Test: FR-016b's deactivation path — using a stub Supabase client (pure-function
  extraction, per `insertGameBlunder.test.js`'s pattern), seed a row whose recomputed `correctCols`
  comes back empty and assert the script issues an `is_active = false` update rather than writing
  `correct_cols: []` to an active row. Depends on T044.
- [x] **T047** `[US3]` Add both `backfill-correct-cols.mjs`'s new test file(s) from T045/T046 to
  **both** `test` and `test:fast` in `connect-four/package.json`, in this same task (not a follow-up
  — per the "stale registration fails nothing" trap).

### Real backfill run + remediation

- [x] **T048** `[US3]` Run the real backfill (`node server/scripts/backfill-correct-cols.mjs --env
  local`) against the local DB, after US2's FR-022/FR-022a thresholds (T030/T034 — already set in
  Phase 4, no dependency on this task) are set and remediation plans are in place. Report the
  per-category before/after active-row counts as the authoritative record for OI-61/OI-75's closeout
  (US4) — a separate, final piece of evidence from US2's earlier dry-run threshold-setting
  measurements (T029/T033).
- [x] **T049** `[US3]` Run US2's replace-not-exempt remediation for any category that fell below its
  threshold (`audit_answer_ambiguity.mjs --repair --yes --puzzles <category>`, using T042's fixed
  insert path) — this is FR-023, **verified already implemented** by the existing tool
  (`repairPuzzles`/`--repair --yes` retires failing rows and inserts a replacement); this task only
  invokes it as part of the backfill flow, it does not build new remediation logic.

### Stored-set grading branch — ⚠️ ships strictly after T048 (Blocking #3c)

- [x] **T050** `[US3]` **Do not start before T048 (the real backfill) has completed** — this is a
  hard task dependency per Blocking #3c, not merely a safe-to-defer ordering. Add a `supabase`
  parameter to `createEvaluateMoveHandler({ solver, i18nTranslations })` →
  `createEvaluateMoveHandler({ solver, i18nTranslations, supabase })`, mirroring how `solver` is
  already threaded (verified at source: `evaluateMoveHandler.js`'s factory signature and
  `server/index.js`'s `app.post('/api/evaluate-move', createEvaluateMoveHandler({ solver,
  i18nTranslations }))` registration); update the registration in `connect-four/server/index.js` to
  pass `supabase` too.
- [x] **T051** `[US3]` In `evaluateMoveHandler.js`, add the stored-set branch: when `req.body
  .puzzleId` is present, look up the row (`.select('id, category, move_string, highlight_metadata,
  correct_col, correct_cols').eq('id', puzzleId).eq('is_active', true).single()`, mirroring `POST
  /api/puzzles/:id/check`'s existing query shape in `server/index.js`); 404 if not found. If
  `puzzle.correct_cols` is non-null: `accepted = puzzle.correct_cols.includes(colInt)`, computed
  **directly** — do **not** call `buildPredicatePuzzle`/`evaluatePredicate` or any of the seven
  pattern evaluators for this request (FR-024, Decision D2a — this is stronger than "prefer the
  stored set but fall back to evaluators"). If `puzzle.correct_cols` is `NULL` (not yet backfilled),
  fall through to the existing computed-live branch using the row's own
  `category`/`move_string`/`correct_col`/`highlight_metadata` as inputs (FR-024a — fail-open, not an
  error). The absence of `puzzleId` continues to select the existing computed-live branch, unchanged,
  exactly as today (Decision D2 — this is not a new "malformed request" case; it is the pre-existing
  branch that already serves lesson inline challenges). Depends on T050.
- [x] **T052** `[US3]` New test `connect-four/tests/integration/evaluateMoveStoredSet.test.js`: using
  the real `createEvaluateMoveHandler` and a stub Supabase client (pure-function-extraction pattern),
  assert (a) a puzzle row with non-null `correct_cols` grades `accepted = correct_cols.includes
  (playedCol)` directly, and — critically — that `evaluatePredicate`/`buildPredicatePuzzle` are
  **never invoked** for that request (spy/stub them to fail the test if called — this is the
  concrete proof of Decision D2a's "bypassed entirely," not merely "not needed for this case"); (b) a
  puzzle row with `correct_cols === null` falls through to the computed-live branch and grades
  correctly (FR-024a); (c) a 404 for a `puzzleId` that does not resolve to an active row. Add this
  file to both `test` and `test:fast` in the same task. Depends on T051.
- [x] **T053** `[US3]` Verify `connect-four/tests/integration/evaluateMoveMultiSolution.test.js`
  still passes **unchanged** — its request bodies have no `puzzleId` (Decision D2's evidence: this
  file's existing behavior IS the proof that the no-`puzzleId` branch must remain the pre-existing
  computed-live path, not a new malformed-request rejection). This is a verification task, not a code
  change — if it fails, T051 has a regression.
- [x] **T054** `[US3]` `connect-four/src/screens/ChallengeScreen.jsx`: add `puzzleId: current.id` to
  the `/api/evaluate-move` request body (FR-027) — verified at source: `current.id` is already
  tracked locally for analytics (`track('puzzle_attempted', { puzzleId: current.id, category })`),
  and the current request body sends `movestring`, `col`, `category`, `correctCol`,
  `highlightMetadata` but not `puzzleId`. Do **not** remove `correctCol`/`highlightMetadata` from the
  same request body (FR-017 — kept in sync, not dropped, in this feature).

### Documentation (FR-018, FR-020's remaining bullets, FR-029, FR-028)

- [x] **T055** `[US3]` Update `docs/architecture/data-model.md` and `docs/architecture/db-schema.md`
  to document the new `correct_cols` column: type, nullability, population timing (generation +
  backfill), ascending-order guarantee (FR-016a), the `correct_col` sync-and-carve-out relationship
  (FR-017/FR-019), and the `NULL` (not-yet-backfilled) vs. `{}` (data-defect, deactivated)
  distinction (FR-016b) (FR-018).
- [x] **T056** `[US3]` Update the remaining stale `docs/architecture/server-conventions.md` passages
  not already covered by T022 (the §Category Registry section's `SINGLE_ANSWER_CATEGORIES`/
  `MULTI_SOLUTION_CATEGORIES` in-code comment descriptions, if any residue remains after T008/T022)
  per FR-020's remaining bullets.
- [x] **T057** `[US3]` Update `docs/architecture/api-conventions.md`'s "Move Evaluation Endpoint"
  section per `contracts/api-evaluate-move.md`'s delta: the new `puzzleId` request field, the
  exactly-two-branches contract, the 404 shape, and the explicit statement that `correct_cols` is
  never added to the response (FR-029, Decision D2b), and document the resolution of the
  neither-puzzleId-nor-lesson-shape open question (FR-028, Clarification Q2, resolved by Decision D2
  — absence of `puzzleId` always routes to the computed-live path).

### Closeout

- [x] **T058** `[US3]` Run `node server/scripts/audit_answer_ambiguity.mjs --puzzles --env local`
  (all categories) and confirm 0 failures and 0 `correct_cols` cross-check mismatches (FR-031),
  achieved via T049's replace-not-exempt remediation, satisfying every category's FR-022/FR-022a
  threshold from US2 — not via silent depletion. This is the DB-side half of FR-031; US4 (T060) runs
  the lesson-side half.

**Checkpoint**: `correct_cols` is stored, backfilled, and read directly by a new grading branch that
never re-derives; the legacy scalar stays in sync per FR-019's carve-out; US1/US2's tightened
predicates have been applied to the live pool without silent depletion; all three real insert sites
(`candidate-generator.js#generateCandidates`'s in-memory object, `server/index.js`'s `/api/admin
/generate` insert, both promotion routes, and `audit_answer_ambiguity.mjs#repairPuzzles`) write
`correct_cols`.

---

## Phase 6: User Story 4 — Lesson inline challenges (row-less boards) keep working exactly as before (P2)

**Goal**: prove the row-less, computed-live branch (FR-025) is unchanged in behavior, prove both
grading branches share exactly one safety definition (FR-026); close out OI-75/OI-61 item 1 fully;
run the full regression gate.

**Independent Test** (spec.md): `tests/lessons/lessonAnswerSets.test.js` (all 39 boards) passes
before and after; `audit_answer_ambiguity.mjs` reports 0 failures for lesson content.

**Depends on**: US1, US2, US3 all complete (this story is the final regression/closeout pass, not
independent greenfield work — per spec.md's own framing, "largely a non-regression guarantee").

- [x] **T059** `[US4]` Run `connect-four/tests/lessons/lessonAnswerSets.test.js` in full (all 39
  lesson boards, dynamically globbed — not a fixed count) and confirm it passes with zero change in
  accepted/reject outcomes versus the pre-feature baseline (SC-003).
- [x] **T060** `[US4]` Run `node server/scripts/audit_answer_ambiguity.mjs` with no `--puzzles` flag
  (defaults to `--lessons`) and confirm 0 failures — the lesson-content half of FR-031 (US3's T058
  covered the DB half).
- [x] **T061** `[US4]` Add a test asserting FR-026's "no branch restates the rule" invariant at the
  code level: both the computed-live branch (`evaluatePredicate`/`acceptedCols` calling
  `isSolverSafe`/`optimalCols`) and any per-column safety check added in US1/US2 import
  `isSolverSafe` from `answerSetInvariant.js` rather than each defining their own copy — e.g. assert
  via source inspection or by confirming a single shared function reference is used, not two
  independently-behaving implementations that happen to agree today.
- [x] **T062** `[US4]` `connect-four/tests/unit/` (new or extended file): assert `server/categories.js`
  and `src/lib/categories.js` remain in agreement for **both** `MULTI_SOLUTION_CATEGORIES` and
  `SINGLE_ANSWER_CATEGORIES` (FR-032) — closing the existing hand-sync risk the "duplicate, not
  cross-imported" convention carries. Register in both `test` and `test:fast` in the same task.
- [x] **T063** `[US4]` Run `cd connect-four && npm run test:fast` in full and confirm the result is
  **exactly** the 5 known-red baseline failures (`branchInvariance`, `causalLinksComposers`,
  `reasonRenderFixes`, `renderCoverageCorpus`, `renderCoverageUniverse`) and no others, with none of
  the 5 failing for a *different* reason than its current one (FR-030). This is the feature's
  regression gate — phrase the result as "these 5 and only these 5 fail," never "all tests pass."
- [x] **T064** `[US4]` Manual/browser verification, per `quickstart.md`'s "Frontend manual check":
  `eval "$(./worktree-ports.sh)"` from the repo root, start the dev server, play an `odd_even_threat`
  challenge whose taught column is not the sole solver optimum and confirm it grades against the
  taught pattern (not raw score); play an `undercut` challenge and confirm an unsafe non-killing
  column now grades wrong while a safe one grades correct/tied; confirm (DevTools Network tab) the
  `/api/evaluate-move` request includes `puzzleId` for a real puzzle drill and omits it for a lesson
  inline challenge; confirm the response body never includes a `correct_cols` field on either branch.
- [x] **T065** `[US4]` Final closeout: update `docs/open_issues.md` — mark **OI-75** and **OI-61 item
  1** `RESOLVED <2026-07-29 or ship date>`, replacing the "why deferred"/"if picked up" text with what
  actually shipped and where (citing T005 for OI-75; T024/T025/T032 for OI-61 item 1), per the epic's
  Issue Closeout Convention and FR-033/SC-005. This supersedes the interim `UPDATE` blocks T023 and
  T035 left in US1/US2.

**Checkpoint**: all four user stories complete; regression gate passes at exactly the known baseline;
both backlog issues carry dated, evidenced closeout entries.

---

## Dependencies & Execution Order

### Phase dependencies

- **Foundational (Phase 2)**: no dependencies — start immediately. **Blocks** every task in US1 and
  US2 that performs a per-column safety check (T001), and blocks US2's before/after pool measurements
  and US3's backfill/generation writes (T003 the migration, T004 the audit-script cross-check).
- **US1 (Phase 3)**: depends on Foundational (T001). Independently testable once its own checkpoint
  is reached.
- **US2 (Phase 4)**: depends on Foundational (T001, T004) only — fully self-contained, including both
  categories' complete before/after/threshold pool-measurement blocks (no dependency on US3). T032
  (overcut Finding F1 fix) additionally depends on US1's T015 (`detectOvercut`'s `correctCols` field).
- **US3 (Phase 5)**: schema (T003) and audit-script cross-check (T004) already landed in
  Foundational; US2's thresholds (T030/T034) already set in Phase 4. The rest depends on US1 + US2's
  code fixes being fully landed — the backfill (T043) and generation-time writes (T039–T042) call the
  now-widened `check*Predicate` functions from both stories; T038's every-category regression test
  depends on every widened check-function existing.
- **US4 (Phase 6)**: depends on US1 + US2 + US3 all complete — this is the final regression/closeout
  pass, not independent greenfield work.

### The two remaining hard cross-story/cross-phase orderings (see the callout box above the phases)

1. T001 → every safety-check task in US1/US2.
2. T048 (US3, real backfill) → T050/T051/T052 (US3, stored-set grading branch). **This is a
   same-story but still hard, decision-driven ordering (Blocking #3c) — do not implement T051 early
   just because its NULL-fallback makes it "safe."**

(An earlier draft's third cross-story ordering — the audit-script update gating US2's measurement
tasks — no longer exists as a *cross-story* constraint: T004 is now Foundational, so it is satisfied
by Phase ordering alone before US2 even starts. An earlier draft's circular dependency — US2's "after"
measurement waiting on US3's real backfill, which waited on US2's thresholds — is resolved by making
that measurement a pre-backfill dry run via the audit script; see the Correction note at the top of
this file.)

### Parallel opportunities

- Within Phase 3 (US1): T006/T007 in parallel; T014/T015 in parallel; T011/T020 in parallel with each
  other and with the Tier B track, since they touch different files/functions.
- Within Phase 4 (US2): T024/T025 can be written in parallel (different files) but their tests
  (T026/T027) depend on both.
- Documentation tasks (T022, T055, T056, T057) can each run in parallel with sibling doc tasks once
  their story's code is landed, but must follow (not precede) the code they document.

---

## Task count

**65 tasks** (T001–T065) across Foundational + 4 user stories. This exceeds `plan.md`'s own ~35
estimate. Per this feature's sizing note (already flagged twice in spec.md and once in plan.md) and
per the explicit instruction not to force-compress: the excess comes from (a) the handoff's required
per-category ascending-sort regression test (T038) and the `forbidden_columns` comment fix (T037),
(b) splitting FR-020's five documentation bullets across the stories where their code actually lands
rather than one end-of-epic doc pass, (c) hoisting the migration (T003) and the audit-script
cross-check (T004) into Foundational as their own explicit tasks, and — the two largest single
additions found in this plan-review pass — (d) **claimeven's actual multi-column enumeration**
(T018–T020: a real detector change generalizing to every odd-height column per Allis's base rule, a
predicate change, and a now-harvestable fixture, none of which existed as separable tasks in an
earlier draft that had mistaken the feature for already-wired) and (e) **the promotion-site
correction, three sites deep** (T039–T042: the in-memory field `generateCandidates` was missing, the
real `candidates`-table insert in `server/index.js`'s `/api/admin/generate` handler, both promotion
routes, and a third promotion site — `audit_answer_ambiguity.mjs#repairPuzzles`'s own direct `puzzles`
insert — found only during this review, in place of a single task that had pointed at the wrong
file). None of this is new scope — it is the same ~33–35 FRs decomposed at the granularity the
ordering constraints require, corrected against what the source code actually does rather than what
an earlier pass assumed it did.
