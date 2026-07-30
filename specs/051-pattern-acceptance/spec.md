# Feature Specification: Pattern Acceptance — Multi-Column Answers + Solver-Safety Invariant

**Feature Branch**: `051-pattern-acceptance`
**Created**: 2026-07-29
**Status**: Draft
**Input**: Epic 1 — Pattern Acceptance: multi-column answers + solver-safety invariant (`docs/epics/open-issues-epics.md`, lines 108–427), closing OI-75 and OI-61 item 1.

## Summary

"Does this move demonstrate the taught pattern?" must become a **set-valued, solver-safe** question
for every puzzle category, answered from a value **computed once at generation time and stored** —
never re-derived independently by the generator and the grader, and never re-swept at serving time.
A drill must accept every column that genuinely creates the taught pattern, and must reject a column
that creates the pattern while handing the opponent a win, or a fork, worse than the board's own
optimum already concedes. Grading has exactly two branches — read the stored set for a real puzzle
row, or compute it live for a row-less board (lesson inline challenges have no puzzle row).

**Resolved 2026-07-29 (owner decision, stronger than the original design)**: the stored-set branch
grades a puzzle row **directly** against its stored `correct_cols` — `correct_cols.includes(playedCol)`
— with the seven pattern evaluators (`evalZThreat`, `evalClaimeven`, `evalUndercut`, `evalOvercut`,
`evalFigure7`, `evalJShape`, `evalOddEvenThreat`) bypassed **entirely** on that branch, not merely
discouraged from re-deriving (see FR-024, FR-003's scope note, and `research.md` Decision D2a). The
evaluators remain exactly as widened by FR-003 for the row-less/computed-live branch only. Both
branches are still safe under one shared relative solver-safety definition
(`connect-four/server/answerSetInvariant.js`) — the computed-live branch calls it directly at grading
time; the stored-set branch is safe by construction because the value it reads was produced by a
writer (generation or backfill) that already called it when building `correct_cols` (FR-026).

This closes two production defects:
- **OI-75**: `odd_even_threat` is in neither `MULTI_SOLUTION_CATEGORIES` nor `SINGLE_ANSWER_CATEGORIES`
  (`connect-four/server/categories.js:26-39`), so `ChallengeScreen.jsx` grades it on solver score alone
  and the authored answer column is never consulted.
- **OI-61 item 1**: `evalUndercut` (`connect-four/server/predicates.js:323-330`) accepts any
  non-killing column including ones that lose outright, and `checkUndercutPredicate`
  (`connect-four/server/candidate-generator.js:332-349`) builds the same overly-broad set at
  generation time with no per-column score check — two independent implementations of the same
  defect, invisible to the existing aggregate `answerSetHolds` guard
  (`connect-four/server/candidate-generator.js:478`) because of the `LOST-POSITION` exemption
  (`connect-four/server/answerSetInvariant.js:63`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A learner's genuinely-correct move is never marked wrong (Priority: P1)

A learner solving a `odd_even_threat`, `figure_7`, `j_shape`, `z_threat`, `overcut`, or `claimeven`
drill plays a column that legitimately creates the taught pattern, but it happens not to be the one
column the board's stored answer names. Today five of these six categories' graders
(`evalZThreat`, `evalClaimeven`, `evalFigure7`, `evalJShape`, `evalOddEvenThreat` —
`connect-four/server/predicates.js:307-364`) compare the played column against a single stored scalar
(`puzzle.correctCol` or `highlightMetadata.column`), so a second column that independently satisfies
the same pattern is marked `wrong`. The learner must see their move accepted whenever it is a genuine,
solver-safe instance of the pattern — not only when it matches one hand-picked column.

**Why this priority**: This is the foundational correctness defect the whole epic exists to fix — every
other story builds on the set-valued contract this story establishes. Without it, `odd_even_threat`
(OI-75) stays silently ungraded and every other category stays vulnerable to the same "second correct
column marked wrong" failure mode `evalDoubleThreat` already hit and fixed for `double_threat`
(`connect-four/server/predicates.js:184-200`'s header comment, describing the shipped lesson-06 bug).

**Independent Test**: Take a solver-verified board with two or more columns that independently satisfy
a given category's pattern detector and are each solver-safe (see US1.1's floor). Submit each qualifying
column in turn against the grader; every one must return `accepted: true` / `result: 'correct'` or
`'tied'`. This is testable against `evaluatePredicate` directly, with no server or DB required.

**Acceptance Scenarios**:

1. **Given** a board with exactly one column satisfying the category's pattern detector and safe under
   the solver floor, **When** the learner plays that column, **Then** the grader returns `correct`.
2. **Given** a board with two or more columns that each independently satisfy the pattern and are each
   safe under the solver floor, **When** the learner plays any one of them, **Then** the grader returns
   `correct` or `tied` (never `wrong`) for that column.
3. **Given** the same multi-column board, **When** the learner plays a column that does not satisfy the
   pattern, **Then** the grader returns `wrong`.

---

### User Story 2 - A pattern-matching move that hands the opponent a worse position is rejected (Priority: P1)

A column can structurally match a category's pattern detector while still being a bad move — it
concedes a win, or a fork, worse than the position's own solver-optimal outcome already concedes. Today
this is graded `correct` for `undercut` unconditionally (`evalUndercut`,
`connect-four/server/predicates.js:323-330`, accepts every column except the one killing-threat column,
with **no score check at all**) — OI-61 item 1. The board must never teach a losing or fork-worse move
as the "correct" answer to a drill, on **either** the generation path or the grading path (both currently
share this gap independently — `checkUndercutPredicate`,
`connect-four/server/candidate-generator.js:332-349`, has no per-column score check either).

**Why this priority**: This is the safety half of the acceptance model — without it, "accept every
pattern-matching column" (User Story 1) would accept unsafe columns too, and OI-61 stays open. Equal
priority to US1 because neither alone is sufficient: US1 without this story reintroduces unsafe
acceptance; this story without US1 leaves the single-column-only defect (OI-75 and the general
undercounting bug) unresolved.

**Independent Test**: Take a solver-verified `undercut` board where a non-killing column concedes a
fork or win worse than the board's own optimum. Submit that column against both the generation-time
predicate (`checkUndercutPredicate` → `checkPredicate`) and the grading-time evaluator (`evalUndercut`);
both must reject it. This is testable without a server, directly against the two functions plus a
harvested solver score array.

**Acceptance Scenarios**:

1. **Given** a solver-verified board where playing a non-killing `undercut` column concedes strictly
   more than the board's own optimum, **When** that column is checked at generation time, **Then** the
   board is rejected as an invalid candidate for the category (fails `checkPredicate`).
2. **Given** the same board, **When** a learner plays that same unsafe column at grading time, **Then**
   `evaluatePredicate` returns `wrong`, not `correct`.
3. **Given** a board where every legal move loses (a `LOST-POSITION` verdict under
   `classifyAnswerSet`), **When** the taught column is among the columns that lose slowest (i.e. it is
   itself solver-optimal for the losing position), **Then** the board still passes — losing positions
   remain valid `undercut` content, reinterpreted under the relative floor rather than exempted from
   safety checking altogether.

---

### User Story 3 - The answer set is computed once, not independently re-derived at serving time (Priority: P2)

Today the "which columns count as correct" question is answered by **two independent
implementations** for every pattern category: `candidate-generator.js#checkPredicateRaw`'s seven
private `check*Predicate` functions at generation time, and `predicates.js#evaluatePredicate`'s seven
`eval*` functions at grading time — none of the seven `eval*` functions calls into the generation-time
detector logic, and none of the seven generation-time functions calls `evaluatePredicate`. A puzzle's
answer set must instead be computed once by the pattern detector at generation time, stored, and read
by the grader at serving time — eliminating the class of "detector says X, grader independently
recomputes something adjacent to X" drift this duplication invites (the OI-61 defect above is one
concrete instance of it, but the duplication itself is the underlying architectural gap).

**Why this priority**: This is the storage/architecture change the owner explicitly directed
("processing time is done at puzzle generation and not at serving time... it should be computed once").
It depends on User Stories 1–2 establishing what a correct, solver-safe set *is* for every category
before that set is persisted and read from a new column.

**Independent Test**: Generate (or re-verify) a puzzle of any of the twelve categories; confirm its
stored answer-set column is populated at generation/backfill time, and that a grading request against
that puzzle's id reads the stored value rather than recomputing the detector.

**Acceptance Scenarios**:

1. **Given** a newly generated candidate for any category, **When** generation completes, **Then** its
   solver-gated answer-set column is populated from the pattern detector — no `NULL` for any category
   that has a matching pattern.
2. **Given** an existing puzzle or candidate row created before this feature, **When** the backfill runs,
   **Then** its answer-set column is populated identically to what a fresh generation run would produce
   for the same board, and re-running the backfill a second time produces the same result (idempotent).
3. **Given** a puzzle row looked up by id at grading time, **When** a learner's move is evaluated,
   **Then** the server reads the stored answer set for that row rather than recomputing the detector or
   trusting a client-supplied answer.

---

### User Story 4 - Lesson inline challenges (row-less boards) keep working exactly as before (Priority: P2)

Lesson inline challenges call the same evaluation endpoint with **no puzzle row at all** — there is
nothing to look up by id and nothing to precompute. This computed-live path
(`evaluatePredicate`/`acceptedCols` in `connect-four/server/answerSetInvariant.js:33-39`) must continue
to serve the lesson gate and the content-audit script unchanged, sharing the same relative
solver-safety floor as the stored-set path rather than encoding its own separate rule.

**Why this priority**: Equal architectural importance to User Story 3 — grading must end up with
*exactly two* branches (stored-set and computed-live), not one. This is lower-numbered priority only
because it is largely a non-regression guarantee: the row-less path already exists and already passes
`tests/lessons/lessonAnswerSets.test.js`; the work here is making sure the widened evaluators keep it
passing and that no code path introduces a third, divergent derivation.

**Independent Test**: Run `tests/lessons/lessonAnswerSets.test.js` (all 39 lesson boards) before and
after the change and confirm it still passes; run `server/scripts/audit_answer_ambiguity.mjs` against
the local DB and confirm 0 failures.

**Acceptance Scenarios**:

1. **Given** a lesson inline-challenge request with a movestring and column but no puzzle id, **When**
   it is evaluated, **Then** the response is computed live via `evaluatePredicate`/`acceptedCols` exactly
   as before, with no change in accepted/rejected outcomes for any of the 39 existing lesson boards.
2. **Given** the same relative solver-safety floor, **When** it is invoked from the stored-set branch or
   the computed-live branch, **Then** both branches call the same function in
   `answerSetInvariant.js` — no branch defines its own copy of the safety rule.

### Edge Cases

- **A board where the pattern detector matches zero columns.** The candidate must be rejected at
  generation time (an empty answer set is not a valid puzzle for that category) and, for a hypothetical
  row-less request against such a board, the computed-live path must return `wrong` for every column —
  this is existing behavior (`server-conventions.md`'s "No fallback" rule) and must not regress.
- **A `LOST-POSITION` board** (every legal move loses for the mover). The relative floor still applies —
  "safe" means "among the slowest losses" (`optimalCols(scores)` under a negative-scored optimum), not
  "exempt from safety checking." This is the case that keeps `undercut` alive as a category (see US2,
  Acceptance Scenario 3).
- **A request for `/api/evaluate-move` that supplies neither a puzzle id nor a row-less (lesson-style)
  request shape.** Behavior for this case is an open question — see Clarifications.
- **The legacy scalar `correct_col` column on an existing row, once the new set column exists.**
  Resolved (2026-07-29, owner decision): it is **kept and maintained in sync**, as the first element of
  the new `correct_cols` set, for the duration of this feature — not dropped here. Full retirement
  (migrating every remaining consumer off the scalar and dropping the column) is split out into a
  separate, future epic; see `docs/open_issues.md` OI-81 for the deferred inventory and rationale
  (FR-017).
- **`claimeven` boards with multiple independently-valid columns.** These remain valid puzzles with no
  uniqueness constraint (Settled Decision, see below) — the answer set may legitimately contain more
  than one column, unlike `z_threat`/`overcut`, which structurally admit exactly one.
- **A category whose detector is async and solver-simulating (`claimeven`, via `detectClaimeven`,
  `connect-four/server/classifier.js:1353`).** Its answer set must never be swept live at serving time.
  **Cost, stated explicitly (2026-07-29 plan-review pass)**: full enumeration requires one independent
  `runClaimevenSimulation` per odd-height candidate column, each a rollout of up to `MAX_PAIRS = 60`
  solver queries (typically ~20 in practice, terminating early on a decided win/loss) — so
  `(number of odd-height columns) × ~20` solver queries per accepted candidate, not a fixed ~20. This
  is only enumerated once at generation/backfill time and stored, never at serving time (see
  `plan.md`'s Performance Goals and `tasks.md` T018–T020 for the full accounting).

> **Sizing note (2026-07-29, post-review; revised same day after the owner reversed Decision B):** this
> spec already carried 4 user stories against the project's 3–5 story bar (see the epic's own note that
> its 6-story scope collapsed to 4 here without losing coverage). The legacy `correct_col` scalar is now
> kept and synced rather than retired in this feature (the retirement inventory came back ~70% larger
> than estimated — 105 references across 22 files, not 62 across 11 — and has been split out to its own
> future epic; see `docs/open_issues.md` OI-81), so this spec adds only a single compatibility
> requirement (FR-019) on top of the schema migration and API contract change already in FR-001–FR-018,
> plus Blocking #3's live-pool-fallout requirement set (FR-021–FR-023) and the server-conventions.md
> documentation requirement (FR-020). Functional requirements grow from 28 to 33. Flagged here rather
> than force-compressed — the extra scope closes a real safety gap (Blocking #3) or documents a
> deliberate, temporary duplication (FR-019), not gold-plating.
>
> **Second sizing update (2026-07-29, plan-review pass, closing Blocking #1/#2/#3 and Decision #1/#2)**:
> five sub-numbered requirements were added while resolving the plan review — FR-016b (empty-set
> backfill deactivation), FR-021a/FR-022a (overcut pool-safety guard rails, Decision #1), FR-023a
> (audit-script `correct_cols` cross-check, Blocking #1/Decision #2), and FR-024a (NULL-`correct_cols`
> grading fallback, Blocking #3a) — plus one existing FR (FR-019) gained an explicit carve-out
> (Blocking #2a) and one (FR-024) was rewritten to a strictly stronger rule (Blocking #1, direct
> `correct_cols.includes(...)` grading with evaluators bypassed, not evaluator-mediated set lookup).
> None of this adds a new user story or changes the 4-story structure; it closes gaps a review found
> in the seam between US1–US2 (the evaluators/detectors) and US3 (the stored set), which is exactly
> the kind of gap this size of feature is expected to surface.

## Requirements *(mandatory)*

### Functional Requirements — set-valued acceptance & the relative solver-safety floor

- **FR-001**: The system MUST define a single, shared relative solver-safety floor — a column `C` is
  safe iff `C ∈ optimalCols(scores)` — living inside `connect-four/server/answerSetInvariant.js` (which
  already exports `optimalCols`, lines 24-29), per that file's own "import it; do not restate it"
  header instruction (`connect-four/server/answerSetInvariant.js:1-14`). This floor MUST be one uniform
  definition for both won boards (`scores[C] > 0`-and-best) and fully-lost boards (`C` among the slowest
  losses) — no per-category allowlist.
- **FR-002**: The `LOST-POSITION` passing verdict in `classifyAnswerSet`
  (`connect-four/server/answerSetInvariant.js:63`) MUST survive, reinterpreted as "the relative floor
  still applies, relative to a losing optimum" — not removed and not left as an unconditional exemption
  from safety checking.
- **FR-003**: Every pattern-category evaluator (`evalZThreat`, `evalClaimeven`, `evalUndercut`,
  `evalOvercut`, `evalFigure7`, `evalJShape`, `evalOddEvenThreat` — `connect-four/server/predicates.js:
  307-364`) MUST return a tri-state result (`{ result: 'correct'|'wrong'|'tied', correctCol?, tiedWith?,
  ... }`) reflecting **set membership**, not equality against a single stored scalar — following
  `evalDoubleThreat`'s return-contract shape (`connect-four/server/predicates.js:201-233`) as the
  reference for the *contract only*. Each evaluator's own set-enumeration logic is worked per-evaluator
  against its own input shape (`highlightMetadata` cells/roles for undercut/overcut, `highlightMetadata.
  column` for z_threat, `correctCol`/stored set for figure_7/j_shape/odd_even_threat/claimeven) — none
  may be copy-pasted from `evalDoubleThreat`'s sweep. For `z_threat`/`overcut` specifically the resulting
  set is always a singleton by construction (FR-010's uniqueness guard survives) — "set membership" there
  means grading against a solver-gated one-element set instead of a bare scalar equality check, not
  admitting multiple accepted columns for those two categories.
  **Scope note (added 2026-07-29, Blocking #1 resolution)**: this widening governs the **row-less,
  computed-live branch only** (FR-025) — the branch every lesson inline challenge and
  `audit_answer_ambiguity.mjs` use, which has no puzzle row and therefore no `correct_cols` to read. A
  puzzle row with a non-null `correct_cols` is graded by FR-024's direct set-membership check
  (`correct_cols.includes(playedCol)`) instead — these seven evaluators are never called for that
  request. FR-003's work remains necessary (lessons need it) but is narrower in blast radius on the
  serving path than originally framed.
- **FR-004**: `evalUndercut` (`connect-four/server/predicates.js:323-330`) MUST reject a non-killing
  column whose play is not itself safe under the relative floor (FR-001) — closing OI-61 item 1 on the
  grading path.
- **FR-005**: `checkUndercutPredicate` (`connect-four/server/candidate-generator.js:332-349`) MUST apply
  the same per-column relative-floor check when building its answer set at generation time — closing
  OI-61 item 1 on the generation path. Fixing only `evalUndercut` (FR-004) without this is insufficient:
  the two are independent implementations of the same defect.
- **FR-006**: `odd_even_threat` MUST become a graded category: `evaluatePredicate`
  (`connect-four/server/predicates.js:95-113`) MUST pass `scores` through to `evalOddEvenThreat` (today
  it is never handed `scores` — the dispatch at `predicates.js:110` calls
  `evalOddEvenThreat(candidateCol, puzzle)` with no third argument even though `scores` is already in
  scope at the call site), and `evalOddEvenThreat` MUST accept membership in the already-computed
  `correctCols` set rather than equality against `puzzle.correctCol` alone. No detector change is
  required — `detectOddEvenThreat`'s base-case return (`connect-four/server/classifier.js:1198`) and
  `checkOddEvenThreatPredicate` (`connect-four/server/candidate-generator.js:416-426`) already produce
  a `correctCols` array.
- **FR-007**: `odd_even_threat` MUST be added to `SINGLE_ANSWER_CATEGORIES` in **both**
  `connect-four/server/categories.js:37-39` and its frontend mirror `connect-four/src/lib/categories.js`
  (kept in sync by hand per the existing convention — never cross-imported, per both files' explicit
  "MUST NOT be derived by negation" comments), so it routes through the `accepted`-field gate in
  `evaluateMoveHandler.js:115` (`MULTI_SOLUTION_CATEGORIES.has(category) ||
  SINGLE_ANSWER_CATEGORIES.has(category)`). `MULTI_SOLUTION_CATEGORIES` is unchanged.
- **FR-008**: The in-code comments on `SINGLE_ANSWER_CATEGORIES`/`MULTI_SOLUTION_CATEGORIES` in both
  `server/categories.js` and `src/lib/categories.js` MUST be reworded to describe gating the `accepted`
  response field, not describing answer cardinality — since after this feature every category in either
  set is graded against a stored *set*, not necessarily a single column.
- **FR-009**: `checkFigure7Predicate` and `checkJShapePredicate`
  (`connect-four/server/candidate-generator.js:364-414`) MUST be converted from "return on first
  matching column" to "accumulate every matching column into the answer set," using their existing
  per-column loop (`for (let col = 0; col < 7; col++)`) — no detector logic is re-derived, only the
  loop's control flow changes. `evalFigure7`/`evalJShape` (`connect-four/server/predicates.js:343-356`)
  MUST be widened correspondingly to set membership.
- **FR-010** *(narrowed per Decision A, 2026-07-29 — see below)*: `detectZThreat` and `detectOvercut`
  (`connect-four/server/classifier.js:849`, `:1015`) MUST be extended (or given a set-returning mode) to
  report every matching column, not only one, since neither has an existing per-column sweep to convert
  (unlike FR-009's detectors). `checkZThreatPredicate`/`checkOvercutPredicate`
  (`connect-four/server/candidate-generator.js:307-318`, `:351-362`) and `evalZThreat`/`evalOvercut`
  (`connect-four/server/predicates.js:307-312`, `:333-340`) MUST be widened to consume and grade against
  the resulting set. **This FR does NOT relax cardinality**: `candidate-generator.js` MUST keep rejecting
  any candidate where the set-returning detector reports more than one winning z-threat/overcut column —
  the existing uniqueness guard at `docs/architecture/server-conventions.md:136` ("Exactly one Z-threat
  column should be winning, for puzzle uniqueness — filter out candidates with more than one during
  generation") is NOT removed, and neither is the corresponding statement in
  `docs/architecture/data-model.md:338` ("unlike `z_threat`/`overcut`, which require exactly one correct
  column"). The stored answer set for these two categories is therefore always a singleton; the set-mode
  conversion exists only so the same detector can serve both the uniqueness guard (which needs to see
  every match to reject multi-match boards) and the new stored-set architecture (FR-013), not to admit
  multi-column `z_threat`/`overcut` boards. This is a deliberate, separable scope boundary, not an
  oversight: the epic's Settled decisions only relax `claimeven` (FR-012); removing an existing guard for
  `z_threat`/`overcut` is scope the owner did not authorize here, and leaves that relaxation available as
  a later, independent feature with no rework.
  **`overcut` uniqueness gap (Decision #1, owner 2026-07-29)**: `checkOvercutPredicate`
  (`connect-four/server/candidate-generator.js:351-362`) today stores only the *first* matching column
  from `detectOvercut` with no check that the board has just one — the overcut-side sibling of the
  OI-61 undercut defect, unlike `z_threat`, which already guards via `detectZThreat`'s
  `candidates.length !== 1`. This gap MUST be fixed in this feature, not deferred (see FR-021a/FR-022a/
  FR-023a), with the same before/after pool-count and replace-not-exempt discipline Blocking #3 already
  requires for `undercut` extended explicitly to `overcut` — a milder tightening of the same kind
  already retired 7 perfectly good `undercut` puzzles, and `overcut` gets no exemption from that risk
  merely because its fix is a one-line guard (`if (result.correctCols.length !== 1) return { passes:
  false, correctCols: [] };`).
- **FR-011**: `claimeven`'s answer set MUST be enumerated fully at generation time (folded into the
  generation-time work of FR-013/US1.5), never swept live at serving time — `detectClaimeven`
  (`connect-four/server/classifier.js:1353`) is async and solver-simulating (per-column solver
  simulation), which is exactly the per-request cost this feature eliminates.
- **FR-012**: `claimeven` MUST NOT gain a uniqueness constraint — boards with multiple independently
  valid claimeven response columns remain valid puzzles, per the existing "no uniqueness enforcement"
  documented in `docs/architecture/data-model.md`'s "Correct Column Storage" section.

### Functional Requirements — storage: computed once, at generation time

- **FR-013**: The system MUST add a new column storing the full solver-gated answer **set** (e.g.
  `correct_cols integer[]`) to both the `puzzles` and `candidates` tables, via a new migration
  numbered sequentially after the current latest (`060_paddle_rename_and_payment_events.sql`, i.e.
  `061_<slug>.sql`), following the existing scalar precedent
  (`connect-four/server/migrations/016_correct_col.sql`, which added `correct_col integer DEFAULT NULL`
  to both tables with the rationale "where the correct column is computed at generation time and stored
  for play-time evaluation").
- **FR-014**: The new column MUST be populated at generation time, for every category, from the
  now-generalized detector/`check*Predicate` logic (FR-003–FR-012), gated by the relative solver-safety
  floor (FR-001) — this is the "computed once, offline" work the owner directive requires, including
  `claimeven`'s otherwise-per-request-expensive enumeration (FR-011).
- **FR-015**: A backfill process MUST recompute the new answer-set column for every existing active
  `puzzles` and `candidates` row, using the same generalized, solver-gated detection logic as fresh
  generation — not a simplified or partial re-derivation.
- **FR-016**: The backfill MUST be idempotent — re-running it against already-backfilled rows MUST
  produce the identical answer set both times, **identical in order as well as in membership** (see
  FR-016a: without a fixed order, two runs could yield the same members in a different sequence, which
  would silently change the value of `correct_cols[0]` and therefore of the synced legacy scalar).
- **FR-016a** *(added 2026-07-29 — closes an ordering gap found while reviewing FR-019)*: Every write of
  `correct_cols`, at both generation time (FR-014) and backfill time (FR-015), MUST store the columns in
  **ascending column-index order**. Rationale: FR-019 defines the retained legacy scalar `correct_col` as
  `correct_cols[0]`, which is only well-defined if the set has a deterministic order. Ascending index is
  chosen because it is stable, independent of detector iteration order and of solver-score ties, and
  carries no implied ranking — the set is a set of equally-accepted answers (FR-001, FR-002), so the
  first element MUST NOT be read as "the best" or "the taught" column. Any consumer that displays a
  single correct column is displaying *an* accepted answer, not a preferred one.
- **FR-016b** *(added 2026-07-29 — closes Blocking #3's empty-set edge case)*: An **empty-but-non-null**
  `correct_cols` (i.e. `checkPredicate` returns `{ passes: false, correctCols: [] }` for a row that was
  previously active, or the tightened floor now rejects every column) is a **data defect, not a valid
  state for an active row**. The backfill (FR-015) MUST **deactivate** (`is_active = false`) any row it
  would otherwise leave with an empty `correct_cols`, rather than writing the empty array to a row that
  remains active — an un-backfilled row (`correct_cols IS NULL`, handled by FR-024a) and a row the
  invariant now rejects (`correct_cols = {}`) are different states and MUST NOT be conflated: only the
  former is safe to serve via the FR-024a fallback; the latter must not be served at all until FR-023's
  replace-not-exempt remediation runs.
- **FR-017** *(resolved 2026-07-29 — was open Clarification Q1)*: The legacy scalar `correct_col` column
  MUST be **kept and maintained in sync** with `correct_cols` for this feature, not dropped — it MUST
  always equal the first element of the newly-stored `correct_cols` set for both `puzzles` and
  `candidates`, at both generation time and backfill time. This is a **deliberate, temporary duplicate
  source of truth**, not an oversight: retiring `correct_col` entirely (migrating its 105 references
  across 22 files, then dropping the column) is split out into a separate, future epic per owner decision
  2026-07-29, after the retirement inventory came back substantially larger than originally estimated —
  see `docs/open_issues.md` OI-81 for the full deferred inventory and the follow-up work.
- **FR-018**: `docs/architecture/data-model.md` and `docs/architecture/db-schema.md` MUST be updated to
  document the new `correct_cols` column, its population timing, and that `correct_col` is kept in sync
  alongside it as a temporary duplicate (FR-017) — not that it is removed — per this project's
  mandatory-reads convention for any schema change.

### Functional Requirements — legacy `correct_col` compatibility (kept in sync, retirement deferred)

- **FR-019**: For the duration of this feature, `correct_col` MUST be kept as a **deliberate, temporary
  duplicate** of the first element of `correct_cols` — every generation-time and backfill-time write that
  populates `correct_cols` (FR-014, FR-015) MUST also write `correct_col` to `correct_cols[0]` (or `NULL`
  when `correct_cols` is empty), so no existing reader of the scalar observes a stale or diverging value.
  `correct_cols[0]` is well-defined because FR-016a fixes the stored order as ascending column index; the
  scalar therefore names the lowest-indexed accepted column, which is *an* accepted answer and carries no
  claim to being the best or the taught one.
  **Carve-out (Blocking #2a, owner 2026-07-29): `undercut` and `overcut` keep `correct_col = NULL`.**
  These two categories deliberately store no single correct column today, with in-code comments saying
  so (`candidate-generator.js:345,358`). For `undercut` the accepted set is every legal column except the
  killing one (further narrowed by the new floor), so `correct_cols[0]` would typically be column 0 — a
  semantically meaningless value that live consumers already treat as "nothing drawn"/"no scalar,"
  including `src/components/CurationWorkspace.jsx:262-263` (the `'hint'` marker drawn at
  `candidate.correct_col`), `src/components/admin/PuzzlePickerModal.jsx:111` (`col {puzzle.correct_col}`),
  and `server/index.js:2445`/`:2497` (`correctCol: puzzle.correct_col` in API responses). FR-019's
  sync rule therefore does NOT apply to `undercut`/`overcut`: the write path (D6/FR-016a's central sync
  point) MUST leave `correct_col = NULL` for these two categories regardless of what `correct_cols[0]`
  would be, so the curation hint marker's existing behavior (drawing nothing) is not silently changed.
  This is explicitly NOT the retirement of the scalar — full retirement (migrating every remaining
  consumer off `correct_col` and dropping the column) is out of scope for this feature and is tracked as
  a separate, future epic; see `docs/open_issues.md` OI-81, which carries the full consumer inventory
  (105 references across 22 files) that motivated splitting it out.

### Functional Requirements — server-conventions.md documentation (Blocking #2, mirrors FR-018/FR-029)

- **FR-020**: `docs/architecture/server-conventions.md` MUST be updated in the same change, because this
  feature makes several of its paragraphs false:
  - The §Predicate Evaluator paragraph (verified at `server-conventions.md:195-197`): *"For the six
    `SINGLE_ANSWER_CATEGORIES` the detectors are *instance* detectors — they return their first match and
    a single column, so there is no cheap way to enumerate a set. Those evaluators legitimately compare
    against the stored scalar…"* — this is the exact justification FR-003/FR-009/FR-010 remove; it must
    be rewritten to describe the new set-returning contract.
  - `server-conventions.md:173`: *"Categories that store their answer as a scalar (claimeven, figure_7,
    j_shape) read `puzzle.correctCol`."* — goes stale once these categories read `puzzle.correctCols`
    (FR-024); must be rewritten.
  - The §Category Registry section (`server-conventions.md:87-107`) and its
    `SINGLE_ANSWER_CATEGORIES`/`MULTI_SOLUTION_CATEGORIES` in-code comment descriptions MUST be reworded
    to match FR-008's rewording (gating the `accepted` response field, not answer cardinality).
  - The `{ result, correctCol, tiedWith, … }` tri-state contract (FR-003) MUST be documented in
    `server-conventions.md` — this was epic task US1.1/1, dropped in the 6→4 story restructuring and
    restored here as a documentation obligation rather than a user story.
  - The stale comment above `checkPredicate`'s `forbidden_columns` exemption
    (`candidate-generator.js:476-477`: *"forbidden_columns is exempt: its `correctCols` are the columns
    to AVOID..."*) MUST be corrected in the same change — `checkForbiddenColumnsPredicate` actually
    returns `correctCols: safeCols` (the *accepted*/safe columns, `candidate-generator.js:243`), not the
    columns to avoid; the comment is the source of the identical factual error corrected in
    `data-model.md` by this feature (Owner clarification #5, 2026-07-29). Fix the comment and the doc
    together, not just the doc.

### Functional Requirements — live puzzle pool fallout (Blocking #3)

- **FR-021**: The backfill (FR-015) MUST report a **per-category, before/after count of active rows** —
  how many `puzzles` rows per category pass the new solver-safety-gated answer-set computation versus
  how many existed before, not merely compute the new column silently. This is not hypothetical:
  `checkUndercutPredicate` today marks *every* non-killing column correct with no score check at all
  (`connect-four/server/candidate-generator.js:332-349`), so tightening it (FR-005) will invalidate an
  unknown fraction of the live `undercut` pool — `answerSetInvariant.js`'s own header comment records
  that a previous, *milder* version of a similar change already "retired 7 perfectly good `undercut`
  puzzles."
- **FR-021a** *(added 2026-07-29 — Decision #1 guard rails)*: The **same** before/after reporting FR-021
  requires for `undercut` MUST also be produced for **`overcut`**, measured **before** the FR-010/Finding-F1
  uniqueness fix lands (`audit_answer_ambiguity.mjs --puzzles overcut --env local`, run pre-fix) and again
  after. This is not optional or foldable into FR-021's undercut-only wording — the overcut uniqueness fix
  is a live-pool-affecting change of the identical shape (a previously-silent gap starts rejecting boards
  it used to accept), so it gets the identical discipline, not an exemption because the code change is small.
- **FR-022**: The system MUST define a **minimum viable serving-pool size per category**. If no
  defensible number exists at spec time, this FR requires the FR-021 before/after counts to be produced
  **first**, during planning, and the threshold set from that data — this spec does not invent a number.
  Falling below the threshold for any category MUST block the change (require remediation before ship),
  not ship silently with a depleted category.
- **FR-022a** *(added 2026-07-29 — Decision #1 guard rails)*: FR-022's threshold discipline applies to
  **`overcut`** exactly as it does to every other category named in this feature — if the FR-010/Finding-F1
  fix drops the `overcut` after-count below its FR-022 threshold, FR-023's replace-not-exempt remediation
  MUST run for `overcut` before ship, identically to `undercut`.
- **FR-023**: Any row the new invariant rejects MUST be **replaced, not merely exempted or retired** —
  restoring the epic's dropped task ("record any board the new invariant rejects and replace rather than
  exempt it"). The existing remediation tool already does this:
  `server/scripts/audit_answer_ambiguity.mjs --repair --yes` retires failing rows (`is_active = false`)
  and inserts replacements (verified at `audit_answer_ambiguity.mjs:73,218-245,384-387`) — this feature
  MUST invoke it (or an equivalent replace-not-exempt path) as part of the backfill/remediation flow
  rather than leaving rows retired with no replacement. A literal reading of SC-004 ("zero rows fail the
  audit") is satisfiable by retiring every failing row with nothing replacing it; FR-022/FR-023 together
  close that loophole.
- **FR-023a** *(added 2026-07-29 — Blocking #1's "still required" fix + Decision #2 ordering)*:
  `server/scripts/audit_answer_ambiguity.mjs` currently selects
  `id, category, move_string, correct_col, highlight_metadata` and recomputes `acceptedCols(...)` live —
  it never reads `correct_cols`. This feature MUST update it to also select `correct_cols` and
  **cross-check the stored set against its own live re-derivation**, flagging any mismatch, because that
  cross-check is the only thing that actually proves the two agree. Without it, FR-031's green-audit
  acceptance gate would validate a live re-derivation rather than the stored data that actually grades
  players (FR-024). **Ordering (Decision #2)**: this update MUST land, and the audit script MUST be the
  single measurement path used, **before** the FR-022/FR-022a dry-run pool measurements are taken —
  otherwise the measurement (a live re-derivation) and the eventual write (`correct_cols`) could silently
  disagree about how many puzzles survive. The backfill's own `--dry-run` mode (FR-015) prints what it
  would *write*; it is explicitly NOT a second, competing source of the FR-022 pool numbers.

### Functional Requirements — grading contract: exactly two branches

- **FR-024** *(rewritten 2026-07-29 — owner decision, Blocking #1)*: `POST /api/evaluate-move` (handled
  by `createEvaluateMoveHandler` in `connect-four/server/evaluateMoveHandler.js`) MUST gain a
  **stored-set grading branch**: given a `puzzleId` that resolves to an active row with a **non-null**
  `correct_cols`, correctness is computed **directly** as `correct_cols.includes(playedCol)`. The seven
  pattern evaluators widened by FR-003 (`evalZThreat`, `evalClaimeven`, `evalUndercut`, `evalOvercut`,
  `evalFigure7`, `evalJShape`, `evalOddEvenThreat`) are **NOT consulted on this branch at all** — this is
  stronger than "prefer the stored set but fall back to the evaluators," and makes re-derivation
  structurally impossible rather than merely discouraged, which is the point of the "computed once"
  directive. The client-supplied `correctCol`/`highlightMetadata` fields are likewise not authoritative
  for this branch. Today the handler destructures `{ movestring, col, category, correctCol,
  highlightMetadata }` directly from `req.body` (`connect-four/server/evaluateMoveHandler.js:54`) with
  no puzzle-id lookup at all — this is the gap FR-024 closes. See `research.md` Decision D2a for the
  end-to-end trace of how `correct_cols` travels from `checkPredicate` (generation/backfill) to this
  read, which is the seam the original design left unaddressed.
- **FR-024a** *(added 2026-07-29 — Blocking #3a)*: If the looked-up row's `correct_cols` is **NULL**
  (not yet backfilled), the stored-set branch MUST **fall through to the row-less, computed-live branch**
  (FR-025) rather than grade every column wrong — fail-open, consistent with Decision D2's philosophy
  that a live drill must never be broken by a row not yet backfilled. This is distinct from an
  **empty-but-non-null** `correct_cols`, which FR-016b requires the backfill to prevent by deactivating
  the row instead of storing it.
  **Sequencing (Blocking #3c)**: notwithstanding this fail-open behavior, FR-024 MUST ship **after** the
  backfill (FR-015) in implementation/task order, not in the same story with no ordering guarantee —
  see `plan.md`'s Task Sequencing Notes for the enforced order.
- **FR-025**: The existing **row-less, computed-live branch** (`evaluatePredicate`/`acceptedCols` via
  `connect-four/server/answerSetInvariant.js:33-39`) MUST remain, unchanged in behavior, to continue
  serving lesson inline challenges (which call this endpoint with no puzzle row at all — lesson content
  has no corresponding DB row), `server/scripts/audit_answer_ambiguity.mjs`, and — per FR-024a — any
  stored-set request whose row has a NULL `correct_cols`.
- **FR-026** *(revised 2026-07-29 — reflects Blocking #1's resolution)*: The relative-floor safety
  function from `answerSetInvariant.js` (FR-001) MUST be the **only** definition of solver safety used
  anywhere in this feature, but it is invoked from different points depending on the branch: the
  computed-live branch (FR-025) calls it **directly, at grading time**, exactly as `evaluatePredicate`/
  `acceptedCols` do today; the stored-set branch (FR-024) does **not** call it at grading time at all —
  it is safe by construction because the value it reads (`correct_cols`) was produced by a writer
  (generation, FR-014, or backfill, FR-015) that already called it when building the set. No branch, and
  no writer, may restate or re-derive the floor independently — three call sites (generation, backfill,
  computed-live grading), one imported function.
- **FR-027**: The client (`connect-four/src/screens/ChallengeScreen.jsx`) MUST send the puzzle id
  (`puzzleId`) in the `/api/evaluate-move` request body so the stored-set branch (FR-024) can look the
  row up server-side. `ChallengeScreen.jsx` already tracks `current.id` locally for analytics (e.g.
  `track('puzzle_attempted', { puzzleId: current.id, category })`,
  `connect-four/src/screens/ChallengeScreen.jsx:249`), so this value is already available; today it is
  not sent to `/api/evaluate-move` (`ChallengeScreen.jsx:252-266` sends `movestring`, `col`, `category`,
  `correctCol`, `highlightMetadata`, but not `current.id`). This FR adds `puzzleId` to that request body
  alongside the existing fields — it does **not** require `ChallengeScreen.jsx` to stop sending
  `correctCol`/`highlightMetadata`: per FR-017, the legacy scalar is kept in sync (not dropped) in this
  feature, so removing the client's use of it is out of scope here and belongs to the deferred retirement
  epic (`docs/open_issues.md` OI-81). The stored-set branch (FR-024) simply ignores those fields once
  `puzzleId` is present and grades from the stored set instead.
- **FR-028**: The system MUST explicitly decide, and document, the behavior of `/api/evaluate-move` when
  a request supplies neither a `puzzleId` nor a row-less (lesson-style) request shape (see
  Clarifications — this is an open question the spec does not pre-decide).
- **FR-029**: `docs/architecture/api-conventions.md`'s "Move Evaluation Endpoint" section MUST be updated
  to document the `puzzleId` request field and the two-branch grading contract.

### Functional Requirements — verification & closeout

- **FR-030**: `npm run test:fast` (from `connect-four/`) MUST pass, including
  `tests/lessons/lessonAnswerSets.test.js` (the blocking answer-set-invariant gate over all 39 lesson
  boards) and `tests/predicates/predicates.test.js`.
- **FR-031**: `server/scripts/audit_answer_ambiguity.mjs` MUST report 0 failures for both lesson content
  and the local DB `puzzles`/`candidates` pool, re-run **after** the backfill (FR-015) completes, since
  the backfill changes what "current DB state" means for the audit. This MUST be achieved via FR-023's
  replace-not-exempt remediation and MUST satisfy FR-022's per-category minimum-pool threshold — 0
  failures achieved by retiring a category down to (or below) that threshold with no replacement does
  NOT satisfy this FR.
- **FR-032**: A test MUST assert that `server/categories.js` and `src/lib/categories.js` remain in
  agreement (both `MULTI_SOLUTION_CATEGORIES` and `SINGLE_ANSWER_CATEGORIES`) — closing the existing
  hand-sync risk the "duplicate, not cross-imported" convention already carries.
- **FR-033**: Every issue under this feature's scope (OI-75, OI-61 item 1) MUST be closed out in
  `docs/open_issues.md` in the same change that ships the fix, per the closeout convention defined in
  `docs/epics/open-issues-epics.md`'s header (lines 17-37): resolved-with-date and evidence, or a dated
  `UPDATE` naming exactly what remains open.

### Key Entities *(data involved)*

- **Puzzle answer set** (`puzzles.correct_cols`, `candidates.correct_cols` — new): the full set of
  0-indexed columns that satisfy a puzzle's taught pattern **and** the relative solver-safety floor, for
  a given category and board. Computed once by the pattern detector at generation time (or by the
  backfill for existing rows); read directly by the grading handler for stored-set requests.
  **Sits alongside** (per FR-017), not replaces, the legacy scalar `correct_col` for this feature —
  `correct_col` is kept in sync as `correct_cols[0]`; full retirement of the scalar is a separate, future
  epic (see `docs/open_issues.md` OI-81).
- **Relative solver-safety floor**: a per-column predicate, `C ∈ optimalCols(scores)`, defined once in
  `answerSetInvariant.js` and shared by both the generation-time candidate guard and both grading
  branches. Not a stored entity — a shared function/rule.
- **Grading branch**: one of exactly two — *stored-set* (a puzzle row exists, looked up by `puzzleId`,
  with a non-null `correct_cols`; graded **directly** as `correct_cols.includes(playedCol)`, with the
  seven pattern evaluators bypassed entirely — FR-024) or *computed-live* (no puzzle row — a lesson
  inline challenge or the audit script — or a stored-set request whose row has a NULL `correct_cols`
  (FR-024a); graded via `evaluatePredicate`/`acceptedCols` against a movestring/category/scores triple
  with no DB lookup).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every puzzle category where a multi-column answer is structurally possible —
  `odd_even_threat`, `figure_7`, `j_shape`, `claimeven`, `undercut`, `double_threat` — a solver-verified
  board with two or more independently pattern-satisfying, solver-safe columns grades **every** such
  column as accepted, not only a single hand-picked one. (Directly verifiable per-category via
  `evaluatePredicate` fixtures.) The remaining six categories are exempt from this criterion, each for a
  structural reason verified against the codebase, not asserted by convention:
  - `forbidden_columns` — internally `correctCols`/`correct_cols` here holds the *accepted/safe* columns
    (`checkForbiddenColumnsPredicate` returns `correctCols: safeCols`, `candidate-generator.js:243`), but
    the drill's taught *answer* is the forbidden set — the complement of what is stored. This asymmetry
    means SC-001's "grades every satisfying column as accepted" framing does not apply cleanly to this
    category regardless of which set is stored (already exempted by SC-002's wording). Whether the field
    should be renamed or split to remove this two-meanings ambiguity is a genuine open question but is
    explicitly out of scope for this feature (owner clarification, 2026-07-29) — noted here for the
    record, not acted on.
  - `forced_win` — `checkForcedWinPredicate`'s own header comment
    (`connect-four/server/candidate-generator.js:175`) states *"exactly one column initiates a valid
    forced-win sequence"*; a second column cannot independently satisfy the same forced-win trace.
  - `z_threat`, `overcut` — narrowed by FR-010/Decision A: the generator keeps rejecting any candidate
    with more than one winning column for these categories, so the stored set is always a singleton.
  - `immediate_threat`, `forced_block` — `isClean`'s per-category guard
    (`docs/architecture/server-conventions.md` §Generation-quality guards) requires `immediate_threat` to
    have "exactly one immediate winning column" and `forced_block` to have "the opponent [with] exactly
    one immediate winning column"; both are single-answer by the same generation-time guard, not merely
    by the evaluator's current implementation.
- **SC-002**: A solver-verified board where the taught column concedes a win or fork strictly worse than
  the board's own solver-optimal outcome is rejected as an invalid puzzle candidate at generation time,
  for every category the relative floor applies to (all except `forbidden_columns`, which is exempt by
  the existing inverted-subset-relation rule).
- **SC-003**: A learner attempting a lesson inline challenge (no puzzle row) sees identical
  accept/reject outcomes before and after this feature ships, across all 39 currently-authored lesson
  boards.
- **SC-004**: Zero puzzle or candidate rows in the local database fail the answer-set-ambiguity audit
  after the backfill completes.
- **SC-005**: The two backlog issues this feature exists to close (OI-75, OI-61 item 1) each carry a
  dated, evidenced closeout entry in `docs/open_issues.md` by the time this feature ships.

## Assumptions

- This feature does not add, remove, or rename any puzzle category — all twelve existing category
  slugs are unchanged (`connect-four/server/categories.js:3-8`).
- The `perspective`-parameter soundness of any detector (whether a detector correctly handles being
  asked about a player who is not currently to move) is explicitly out of scope — that is Epic 2's
  concern — **except** the narrow, in-scope conversion of `detectZThreat`/`detectOvercut` and the
  already-column-sweeping `checkFigure7Predicate`/`checkJShapePredicate` from first-match to
  all-matches returns (FR-009/FR-010). That is a return-shape change, not a perspective-correctness fix.
- The serving pool's `puzzle_attempts.outcome`-based filtering question (OI-49) is a separate epic's
  concern and is not addressed here.
- `highlight_metadata`'s shape (cells/roles for z_threat/undercut/overcut) is not redesigned by this
  feature — only which columns are considered members of the answer set changes, not how a member's
  cells are annotated for display.
- The row-less `evaluatePredicate`/`acceptedCols` computed-live path is a permanent second branch, not
  a compatibility shim to be removed later — lesson inline challenges have no puzzle row by design
  (memory `project_lesson_interactivity_evaluation`) and will continue to need it indefinitely.
- Reasonable default for migration numbering: the next migration file after
  `060_paddle_rename_and_payment_events.sql` is `061_<slug>.sql`, following
  `docs/architecture/data-model.md`'s "Migration Naming" convention (sequential 3-digit prefix, no
  gaps). This should be re-verified immediately before the migration is written, since this is a
  concurrently-edited repository.
- This feature ships **one** migration: `061_<slug>.sql` adds `correct_cols` (FR-013). `correct_col` is
  kept and synced in place (FR-017), not dropped, so no second migration is needed here — the drop
  migration belongs to the separate, future retirement epic (`docs/open_issues.md` OI-81).
- **Client-side grading was considered and rejected (owner discussion, 2026-07-29)**: the response
  format for `/api/evaluate-move` will **not** gain a `correctCols` field, even as a client-side hint for
  instant UI feedback — this was explicitly named an early optimization, addable later with no rework.
  The server continues to grade every request, on both branches; see `research.md` Decision D7 for the
  full rationale (the endpoint's response also carries `quality` alongside `accepted`, and
  `ChallengeScreen.jsx`'s promoted/demoted reconciliation needs both together, so client-side grading
  would add a second place correctness is computed rather than remove the API call).

## Clarifications

### Resolved 2026-07-29 (owner decision — legacy scalar retirement split out)

- **Q1 (FR-017)** — **RESOLVED, no longer open**: The legacy scalar `correct_col` is **kept and
  maintained in sync** as `correct_cols[0]` for the duration of this feature — it is not dropped here.
  Full retirement (migrating every remaining consumer off the scalar, then dropping the column) is
  **deferred to a separate, future epic**, per an owner decision made 2026-07-29 after the retirement
  consumer-inventory came back at 105 references across 22 files — substantially larger than the
  estimate the earlier drop-it decision had been made on. See `docs/open_issues.md` OI-81 for the
  deferred inventory and follow-up scope.

### Session 2026-07-29 (deferred to `/speckit-clarify`)

The following question is intentionally left open — the epic that scoped this feature
(`docs/epics/open-issues-epics.md`'s "Open questions" for Epic 1) explicitly requires it to be
**decided and stated explicitly** during the spec/plan process, not pre-decided by the epic author:

- **Q2 (FR-028)**: What should `/api/evaluate-move` do when a request supplies **neither** a `puzzleId`
  nor a row-less (lesson-style) shape — e.g. a stale client that still sends the old
  `correctCol`/`highlightMetadata` fields with no id? Hard-reject as a malformed request (400), or
  gracefully fall back to the computed-live path?

This must be resolved (via `/speckit-clarify` or an equivalent explicit decision) before `/speckit-plan`
proceeds to design the handler changes that depend on the answer.
