# Implementation Plan: Pattern Acceptance — Multi-Column Answers + Solver-Safety Invariant

**Branch**: `worktree-epic-1-pattern-acceptance` | **Date**: 2026-07-29 | **Spec**: `specs/051-pattern-acceptance/spec.md`
**Input**: Feature specification from `specs/051-pattern-acceptance/spec.md` (Epic 1,
`docs/epics/open-issues-epics.md:108-215`, closing OI-75 and OI-61 item 1)

## Summary

"Does this move demonstrate the taught pattern?" becomes a set-valued, solver-safe question,
computed once at generation time and stored, for all twelve puzzle categories. Concretely:

1. A single relative solver-safety floor (`C ∈ optimalCols(scores)`) is added to
   `answerSetInvariant.js` as an importable helper and applied per-column everywhere a category's
   answer set is built — closing OI-61 item 1 (`evalUndercut`/`checkUndercutPredicate` today accept
   every non-killing column with no score check at all).
2. Seven evaluators in `predicates.js` (`evalZThreat`, `evalClaimeven`, `evalUndercut`,
   `evalOvercut`, `evalFigure7`, `evalJShape`, `evalOddEvenThreat`) are widened from single-scalar
   equality to a tri-state, set-membership contract (`evalDoubleThreat`'s shape, reused as a
   contract reference only — never copy-pasted, since each evaluator reads a different input shape).
3. `odd_even_threat` is added to `SINGLE_ANSWER_CATEGORIES` (both `server/categories.js` and
   `src/lib/categories.js`) and `scores` is threaded into its evaluator dispatch — closing OI-75.
4. `detectZThreat`/`detectOvercut` gain an additive `correctCols` field (their existing `matched`
   semantics are preserved exactly, so classifyPattern's live-move tagging is untouched); the
   already-full-sweep `checkFigure7Predicate`/`checkJShapePredicate` are converted from
   first-match-return to full accumulation; `claimeven`'s answer set is enumerated once at
   generation time via the already-solver-threaded `checkClaimevenPredicate(ms, scores, solver)`.
5. A new `correct_cols integer[]` column is added to `puzzles` and `candidates`
   (migration `061_correct_cols.sql`, following the `016_correct_col.sql` precedent), populated at
   generation time and by a new backfill script, always in ascending column-index order (FR-016a),
   with the legacy `correct_col` scalar kept in sync as `correct_cols[0]` (FR-017/FR-019 — **not**
   dropped in this feature; full retirement is `docs/open_issues.md` OI-81 / a future epic).
6. `POST /api/evaluate-move` gains a stored-set grading branch (looked up by a new `puzzleId`
   request field) alongside the existing row-less computed-live branch — resolved as **exactly two
   branches, selected solely by the presence/absence of `puzzleId`** (Decision D2 below; this is
   also the resolution to Clarification Q2/FR-028). **Owner decision, stronger than the original
   design (Decision D2a, closes the seam a prior review flagged as unaddressed)**: the stored-set
   branch grades a puzzle row **directly** against its stored `correct_cols` —
   `correct_cols.includes(playedCol)` — with the seven pattern evaluators from point 2 above
   **bypassed entirely** on that branch, not merely discouraged from re-deriving. If the row's
   `correct_cols` is `NULL` (not yet backfilled), the handler falls through to the computed-live
   branch instead of grading every column wrong (FR-024a); an empty-but-non-null `correct_cols` is a
   data defect the backfill prevents by deactivating the row rather than storing it (FR-016b). FR-024
   ships **after** the backfill in task order regardless of the NULL fallback (Task Sequencing Notes
   item 6, below).
7. Per FR-021–FR-023, the backfill reports per-category before/after pool counts, and any board the
   new invariant rejects is replaced (not merely retired) via `audit_answer_ambiguity.mjs --repair
   --yes` — the tool that already implements this replace-not-exempt behavior
   (`audit_answer_ambiguity.mjs:212-267`). This same before/after + replace-not-exempt discipline is
   extended explicitly to **`overcut`** (FR-021a/FR-022a) for the Finding-F1 uniqueness fix (point 8
   below) — not just `undercut`. `audit_answer_ambiguity.mjs` is also updated (FR-023a) to select
   `correct_cols` and cross-check it against its own live re-derivation, since it is the single
   measurement path for all of the above (Decision #2) and must land before any FR-022/FR-022a
   dry-run measurement is taken.
8. `checkOvercutPredicate`'s undocumented uniqueness gap (Finding F1, Decision D3) — it stores only
   the first matching column with no check that the board has just one — is fixed in this feature,
   under the same guard rails as point 7.

**Sizing**: per the spec's own sizing note, this already exceeds the project's 3–5-story bar (4
stories, 33 FRs). Confirmed here rather than compressed: this plan's task count (estimated in
Task Sequencing Notes below) is in the 30–45 range across US1–US4, comfortably justifying the full
speckit pipeline per `docs/best_practices_spec_driven_development.md`'s sweet-spot criteria (8+
tasks, an unresolved design decision — the Tier B detector design and Q2 — and multiple subsystems:
DB schema + server + frontend).

## Technical Context

**Language/Version**: JavaScript (Node.js ESM server in `connect-four/server/`, React 19 JSX
frontend in `connect-four/src/`) — existing stack, no change.
**Primary Dependencies**: Express 5, `@supabase/supabase-js` (Postgres via Supabase), the
persistent `c4solver` child process (`c4solver-wrapper.js`). No new dependencies.
**Storage**: Postgres via Supabase. New column `correct_cols integer[]` on `puzzles` and
`candidates` (migration `061_correct_cols.sql`). Legacy `correct_col integer` (migration
`016_correct_col.sql`) is kept, not dropped.
**Testing**: `node:test` + `node:assert/strict`, run via `cd connect-four && npm run test:fast`
(never `npm test` — see CLAUDE.md and `docs/architecture/testing-conventions.md`; `npm test` runs
`tests/integration/candidate-generator.test.js`, which calls the real solver up to 400×/test and
routinely hangs). New/changed test files must be added to **both** the `test` and `test:fast`
script arrays in `connect-four/package.json` (`package.json:16-17` — explicit file lists, no
auto-discovery; a file left off either list is silently skipped with exit 0, per
`testing-conventions.md`'s "stale registration fails nothing" trap).
**Baseline (verified 2026-07-29, this worktree)**: `npm run test:fast` → **1479 pass / 5 fail** out
of 1484 tests, 201 suites. The 5 failures are pre-existing and unrelated to this feature's surface
(`server/tests/branchInvariance.test.mjs`, `server/tests/causalLinksComposers.test.mjs`,
`server/tests/reasonRenderFixes.test.mjs`, and two `ENOENT`s on missing
`reason_evidence_boards_coverage_*.jsonl` corpus files in `renderCoverageCorpus.test.mjs` /
`renderCoverageUniverse.test.mjs`) — all in the blunder-`reason` evidence engine, none touching
`evaluateMoveHandler.js`, `categories.js`, `predicates.js`, `classifier.js`,
`candidate-generator.js`, or `ChallengeScreen.jsx`. **Regression gate for this feature: these
same 5 tests, and only these 5, may fail after implementation — not "all tests pass."**
**Target Platform**: Existing web app (Express API + Vite/React SPA), no platform change.
**Project Type**: Existing monorepo web application — no new project structure.
**Performance Goals**: No new latency budget. The new stored-set grading branch adds one
`supabase.from('puzzles').select(...).eq('id', puzzleId).eq('is_active', true).single()` query to
`/api/evaluate-move` — the same query shape already used by `POST /api/puzzles/:id/check`
(`server/index.js:2463-2469`) for the same table, so it is a known-cheap precedent, not a new
performance risk. **`claimeven` generation-time cost, stated explicitly (2026-07-29 review fix —
this was the single largest un-costed item in the plan)**: `detectClaimeven` is extended (tasks.md
T018/T019) to enumerate every odd-height candidate column instead of picking one, so each candidate
needs its own `runClaimevenSimulation` — a ~20-solver-query rollout (`MAX_PAIRS = 60`, one
`solver.query` per pair, early-exiting on a win/draw/full board). Subtype-A boards (1 odd-height
column) cost one simulation (~20 queries, unchanged from today's single-answer behavior). Subtype-B
boards (2 odd-height columns) now cost **two** simulations (~40 queries) since both odd columns are
evaluated instead of only the non-last-move one. This cost lands entirely offline, at
generation/backfill time — never at serving time (FR-011) — which is the entire point of "computed
once."
**Constraints**: No drop migration (FR-017's legacy-scalar retirement is out of scope — OI-81);
`z_threat`/`overcut` keep their generation-time uniqueness guard (FR-010, Decision A — narrowed,
not relaxed); `claimeven` gains no uniqueness constraint (FR-012); `correct_cols` always stored in
ascending column-index order (FR-016a); the relative floor lives in exactly one place
(`answerSetInvariant.js`, FR-001) — no per-evaluator or per-check-function restatement.
**Scale/Scope**: Touches `connect-four/server/{answerSetInvariant,predicates,classifier,
candidate-generator,categories,evaluateMoveHandler}.js`, `connect-four/server/scripts/
audit_answer_ambiguity.mjs` (extended to select and cross-check `correct_cols`, FR-023a), one new
migration, one new backfill script, `connect-four/src/{screens/ChallengeScreen.jsx,lib/categories.js}`,
and four `docs/architecture/*.md` files. ~12 existing test files touched/extended, ~4-6 new test
files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Explanation Engine as SSOT** — N/A directly: this feature changes correctness grading
  (`predicates.js`/`evaluatePredicate`), not the solver-score → classifier → LLM explanation
  pipeline. `classifyPattern`'s live-move tagging is explicitly preserved unchanged (Decision
  D-TierB below keeps `detectZThreat`/`detectOvercut`'s existing `matched`/`cells` semantics
  byte-for-byte; only an additive `correctCols` field is introduced) — no explanation-engine
  regression risk.
- **II. Code Quality & Simplicity** — Satisfied by design: FR-003 explicitly forbids copy-pasting
  `evalDoubleThreat`'s sweep into the other six evaluators (each reads a different input shape);
  the relative floor is added to `answerSetInvariant.js` once (FR-001), not restated per-evaluator
  — the exact anti-pattern that "retired 7 perfectly good undercut puzzles" per that file's own
  header comment. No speculative abstraction: the Tier B detector change (Decision D-TierB) adds
  exactly one new field to two existing return shapes, nothing more.
- **III. Testing Standards** — Satisfied by design: every widened evaluator needs a real
  solver-verified 2+-column fixture (US1's Independent Test) and a real solver-verified
  floor-violating fixture (US2's Independent Test) — fixtures must be harvested via
  `gameSampling.js#playGame`/existing per-category integration test boards, never hand-constructed
  (CLAUDE.md/I12). `tests/predicates/predicates.test.js`'s current fixture counts (2 per category
  for `z_threat`/`undercut`/`overcut`/`j_shape`/`figure_7`/`claimeven`, **0 for
  `odd_even_threat`**) are thin — new fixtures are required work, not optional polish.
- **IV. UX Consistency & Progressive Disclosure** — Satisfied: `ChallengeScreen.jsx`'s existing
  `acceptedPromoted`/`acceptedDemoted` display-reconciliation logic (lines 294, 303) already
  handles "accepted gate disagrees with raw quality" for the existing nine gated categories; adding
  `odd_even_threat` as a tenth is the same mechanism, not a new one.
- **V. Performance** — Satisfied: see Technical Context above. `claimeven`'s solver simulation is
  explicitly moved OFF the serving path (FR-011) — this is a performance *improvement* over what
  would happen if it were graded live.
- **VI. Implementation & Debugging Methodology** — Satisfied: every code claim in this plan was
  verified by reading the actual current file (not recalled) — `answerSetInvariant.js`,
  `predicates.js`, `classifier.js`, `candidate-generator.js`, `evaluateMoveHandler.js`,
  `ChallengeScreen.jsx`, `categories.js`, `docs/open_issues.md` OI-61/OI-75/OI-81 — all quoted
  verbatim with exact current line numbers in Research/Design Decisions below. FR-022's
  minimum-viable-pool threshold is explicitly **not** invented here — see Design Decision D4.
- **VII. Software Design Philosophy** — "One obvious way to do it": the relative floor is
  imported, never restated (FR-001); the backfill reuses the exact same generation-time
  `check*Predicate`/`checkPredicate` functions rather than a parallel re-derivation (FR-015).
  "Special cases aren't special enough to break the rules" — `undercut`'s avoid-the-column
  semantics and `claimeven`'s no-uniqueness rule are still real special cases, but they compose
  with the *same* floor function, not a bespoke one each.
- **VIII. Documentation** — Gate requires:
  - [x] Existing architecture docs read before drafting: `server-conventions.md` (Predicate
    Evaluator, Category Registry, Answer-set-invariant, "Undercut has two sides", Multi-solution
    acceptance, Single-answer-categories sections), `api-conventions.md` (Move Evaluation
    Endpoint), `data-model.md`/`db-schema.md` (puzzles/candidates schema, Migration Naming,
    Correct Column Storage), `index-conventions.md`, `testing-conventions.md`,
    `frontend-conventions.md` (Challenge Session State Machine, evaluation state shape),
    `docs/open_issues.md` (OI-61, OI-75, OI-81), `docs/knowledge-base/` entries for the touched
    categories, the constitution.
  - [x] Undocumented conventions discovered during review: (a) `data-model.md:338` documents an
    overcut generation-time uniqueness requirement that `checkOvercutPredicate`'s current code
    (candidate-generator.js:351-362) does not actually enforce — see Design Decision D-TierB,
    Finding F1; this plan's tasks close that doc/code gap rather than leaving it undocumented.
    (b) The current `016_correct_col.sql` migration lacks the "HUMAN REVIEW REQUIRED" comment line
    that `data-model.md`'s own "Migration Naming" convention mandates, and `060_...sql` (the most
    recent migration) also omits it — the convention is aspirational/inconsistently followed in
    practice; this plan's new migration follows the *documented* convention literally regardless.
  - [x] `tasks.md` (generated by `/speckit-tasks`, not this plan) MUST include documentation tasks
    for: `data-model.md`/`db-schema.md` (new `correct_cols` column, FR-018), `server-conventions.md`
    (FR-020's five call-outs — the fifth added post-review: the stale `checkPredicate`
    `forbidden_columns` comment, Owner clarification #5), `api-conventions.md` (FR-029, the
    `puzzleId`/two-branch contract), and `docs/open_issues.md` (FR-033, closing OI-75/OI-61 item 1).

No Constitution Check violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/051-pattern-acceptance/
├── plan.md              # This file
├── research.md          # Phase 0 output — design decisions D1–D6 (incl. D2a/D2b)
├── data-model.md        # Phase 1 output — correct_cols column + migration
├── quickstart.md         # Phase 1 output — manual + automated verification steps
├── contracts/
│   └── api-evaluate-move.md   # Phase 1 output — puzzleId / two-branch contract delta
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created by this plan)
```

### Source Code (repository root)

Existing monorepo layout — no new top-level directories.

```text
connect-four/
├── server/
│   ├── answerSetInvariant.js     # ADD: isSolverSafe(col, scores) — the single shared floor (FR-001)
│   ├── predicates.js             # WIDEN: evalZThreat, evalClaimeven, evalUndercut, evalOvercut,
│   │                              #   evalFigure7, evalJShape, evalOddEvenThreat → tri-state set
│   │                              #   membership (FR-003); evaluatePredicate's odd_even_threat
│   │                              #   dispatch passes scores (FR-006)
│   ├── classifier.js             # WIDEN: detectZThreat, detectOvercut gain additive `correctCols`
│   │                              #   field, matched/cells semantics UNCHANGED (Decision D-TierB)
│   ├── candidate-generator.js    # WIDEN: checkZThreatPredicate, checkOvercutPredicate (+
│   │                              #   uniqueness guard, Finding F1/Decision #1), checkUndercutPredicate
│   │                              #   (+ relative floor, FR-005), checkFigure7Predicate/
│   │                              #   checkJShapePredicate (accumulate, FR-009), checkClaimevenPredicate
│   │                              #   (enumerate, FR-011); checkPredicate wrapper sorts correctCols
│   │                              #   ascending AND syncs correct_col (FR-016a/FR-019, D6 — with the
│   │                              #   undercut/overcut carve-out to correct_col=NULL, Blocking #2a);
│   │                              #   fix the stale forbidden_columns "columns to AVOID" comment
│   │                              #   (candidate-generator.js:476-477, Owner clarification #5)
│   ├── categories.js             # ADD odd_even_threat to SINGLE_ANSWER_CATEGORIES; reword
│   │                              #   MULTI_SOLUTION_CATEGORIES/SINGLE_ANSWER_CATEGORIES comments
│   │                              #   (FR-007/FR-008)
│   ├── evaluateMoveHandler.js    # ADD: stored-set branch gated on req.body.puzzleId, grading
│   │                              #   DIRECTLY via correct_cols.includes(playedCol) with the seven
│   │                              #   evaluators bypassed entirely (FR-024, Decision D2a); NULL
│   │                              #   correct_cols falls through to the computed-live branch
│   │                              #   (FR-024a); needs a `supabase` factory param (new DI seam,
│   │                              #   mirroring the /check endpoint's query shape); ships AFTER the
│   │                              #   backfill in task order (Task Sequencing Notes item 6)
│   ├── migrations/
│   │   └── 061_correct_cols.sql  # NEW — adds correct_cols integer[] to puzzles + candidates
│   ├── index.js                  # WIDEN (2026-07-29 review fix — was missing from this list):
│   │                              #   promotion is NOT in candidate-generator.js — it lives here, in
│   │                              #   THREE places: (1) `/api/admin/generate`'s row-map into the
│   │                              #   `candidates` insert (add correct_cols alongside correct_col);
│   │                              #   (2) `POST /api/admin/candidates/:id/approve` and (3) `POST
│   │                              #   /api/admin/candidates/approve-batch` — both hand-enumerate the
│   │                              #   `puzzles` insert's column list and both need correct_cols added
│   │                              #   to their `.select`/`.insert`; also thread the new `supabase`
│   │                              #   param into the `/api/evaluate-move` registration (FR-024)
│   └── scripts/
│       ├── audit_answer_ambiguity.mjs  # WIDEN: select correct_cols in addition to the current
│       │                                #   column list; cross-check the stored set against its own
│       │                                #   live acceptedCols(...) re-derivation, flagging mismatches
│       │                                #   (FR-023a) — lands BEFORE any FR-022/022a measurement
│       │                                #   (Decision #2). ALSO (2026-07-29 review fix — a third
│       │                                #   promotion site the original review missed): its
│       │                                #   `repairPuzzles`'s own direct `puzzles` insert (used by
│       │                                #   --repair --yes) needs correct_cols added too, or every
│       │                                #   replacement puzzle it creates ships with correct_cols=NULL
│       └── backfill-correct-cols.mjs   # NEW — backfill for existing rows (FR-015/016/016a/019),
│                                        #   deactivates (not stores empty-active) any row whose
│                                        #   recomputed correctCols is empty (FR-016b), per-category
│                                        #   before/after report (FR-021/FR-021a), invokes
│                                        #   audit_answer_ambiguity.mjs --repair --yes (or equivalent)
│                                        #   for replace-not-exempt (FR-023)
├── src/
│   ├── screens/ChallengeScreen.jsx   # ADD puzzleId to the /api/evaluate-move request body
│   │                                  #   (FR-027); correctCol/highlightMetadata still sent
│   │                                  #   unconditionally (FR-017 — not removed here)
│   └── lib/categories.js             # mirror: add odd_even_threat to SINGLE_ANSWER_CATEGORIES,
│                                       #   reword comments (FR-007/FR-008)
├── tests/
│   ├── predicates/predicates.test.js         # extend fixtures per widened evaluator + new
│   │                                            odd_even_threat fixtures (currently 0)
│   ├── integration/{z_threat,undercut_overcut,claimeven,figure7_jshape}.test.js  # extend for
│   │                                            multi-column + floor-violation cases
│   ├── integration/evaluateMoveMultiSolution.test.js       # MUST keep passing unchanged — its
│   │                                            no-puzzleId request bodies are the concrete proof
│   │                                            that Decision D2's fallback branch is correct
│   ├── integration/singleAnswerCategoriesAccepted.test.js  # extend: odd_even_threat block (new);
│   │                                            do not rename MULTI_SOLUTION_CATEGORIES/
│   │                                            SINGLE_ANSWER_CATEGORIES (handoff warning)
│   ├── lessons/lessonAnswerSets.test.js       # MUST still pass unchanged (FR-030, US4)
│   ├── integration/evaluateMoveStoredSet.test.js   # NEW — FR-024/024a/026 stored-set branch, real
│   │                                          createEvaluateMoveHandler + a stub supabase client;
│   │                                          MUST assert evaluatePredicate/buildPredicatePuzzle are
│   │                                          NEVER invoked when correct_cols is non-null (Decision
│   │                                          D2a), and that a NULL correct_cols row falls through
│   │                                          to the computed-live branch (FR-024a)
│   └── (extend) server/tests/ or scripts tests covering audit_answer_ambiguity.mjs's new
│       correct_cols cross-check (FR-023a) — flags a deliberately-seeded mismatch
└── package.json                    # add every new/changed test file to BOTH `test` AND
                                       #   `test:fast` arrays (package.json:16-17)
```

**Structure Decision**: Existing web-application monorepo. No new services or directories — this
feature extends five existing server modules, adds one migration + one backfill script, and makes
two small, additive frontend edits.

## Research & Design Decisions (Phase 0)

See `research.md` for the full write-up. Index:

- **D1 — Relative solver-safety floor.** One function, `isSolverSafe(col, scores)`, added to
  `answerSetInvariant.js`, used everywhere a per-column safety check is needed.
- **D2 — Resolution of Clarification Q2 (malformed-request fallback).** Absence of `puzzleId`
  ALWAYS routes to the existing computed-live path, unconditionally — this is not a new "malformed
  request" branch, it is the pre-existing, already-tested second branch (FR-025). See research.md
  for the evidence this rests on.
- **D2a — Stored-set grading bypasses evaluators entirely (resolves Blocking #1).** A puzzle row's
  correctness is `correct_cols.includes(playedCol)`, computed directly — the seven pattern
  evaluators are never called on this branch. Traces the value end-to-end from `checkPredicate`
  (generation/backfill write) to the grading read, and settles FR-003's scope (computed-live branch
  only) and FR-026's mechanism (floor applied once, at write time, not re-invoked at stored-set
  grading time).
- **D2b — Client-side grading considered and rejected.** The server keeps grading on both branches;
  `correct_cols` is not added to the response, even as a UI hint — an owner-deferred early
  optimization, not a technical blocker.
- **D3 — Tier B detector design (`detectZThreat`/`detectOvercut`).** Additive `correctCols` field;
  `matched`/`cells`/`highlightMetadata` semantics for existing callers (classifyPattern, generation)
  are preserved byte-for-byte. Includes Finding F1 (an undocumented `checkOvercutPredicate`
  uniqueness gap this feature must close) **with Decision #1's guard rails**: the same before/after
  pool-count and replace-not-exempt discipline FR-021/022/023 require for `undercut` is extended
  explicitly to `overcut` (FR-021a/022a) before the F1 fix ships.
- **D4 — FR-022 minimum-viable-pool threshold methodology.** Not invented here; the plan specifies
  the *procedure* (a dry-run measurement task that must run before the threshold is set), now also
  covering `overcut` (Decision #1), with `audit_answer_ambiguity.mjs`'s `correct_cols` cross-check
  (FR-023a) required to land first as the single measurement path (Decision #2).
- **D5 — Backfill script design.** Follows `backfill-lesson-progress.mjs`'s conventions
  (`.mjs`, manual `.env` parsing, `--dry-run`, typed confirmation, `--help` before validation) but
  calls the same `checkPredicate`/`checkPredicateRaw` functions generation uses — never a parallel
  re-derivation.
- **D6 — Ascending-order enforcement point AND legacy scalar sync, centralized together.** Sorted
  and synced once, centrally, inside `checkPredicate` (the exported wrapper), not per-category — so
  both generation and backfill get both automatically by calling the same function. Fixes a bug in
  an earlier draft of this decision that sorted but never wrote `correct_col` (Blocking #2b), and
  carves out `undercut`/`overcut` to keep `correct_col = NULL` unconditionally (Blocking #2a/FR-019).

## Task Sequencing Notes (mandatory for tasks.md)

1. **D1 (the floor) must land before D-TierB/undercut fixes.** `checkUndercutPredicate`,
   `evalUndercut`, and every widened evaluator's per-column safety check import `isSolverSafe` from
   `answerSetInvariant.js` — this must exist first, or six later tasks have nothing to import.
2. **FR-006 (`odd_even_threat` scores wiring) is nearly free and should land early**, independent of
   the harder Tier B work: `detectOddEvenThreat`/`checkOddEvenThreatPredicate` already produce a
   `correctCols` array (`classifier.js:1198-1341`, `candidate-generator.js:416-426`) — only
   `evaluatePredicate`'s dispatch (`predicates.js:110`, currently `evalOddEvenThreat(candidateCol,
   puzzle)` with `scores` dropped) and `evalOddEvenThreat` itself need to change, plus the
   categories.js/`src/lib/categories.js` set membership (FR-007) and comment reword (FR-008).
   Landing this first gives an early, low-risk win and closes OI-75 independently of the harder
   undercut/Tier-B work.
3. **The Tier B detector widening (D3) is the highest-risk task — schedule it with the most test
   coverage.** `detectOvercut`'s conversion from early-return to full accumulation
   (`classifier.js:1015-1052`) is genuinely new control flow, unlike `checkFigure7Predicate`/
   `checkJShapePredicate` (FR-009), which only need their existing loop's `return` replaced with
   `push`. `detectZThreat` needs the least work (its `candidates` array already exists —
   `classifier.js:870-888` — only `correctCols: candidates.map(c => c.col)` needs adding to both
   the matched and multi-candidate-rejected return paths).
4. **`checkOvercutPredicate`'s undocumented uniqueness gap (D3 Finding F1) must be fixed as part of
   this feature, not left for later** — today it stores only the *first* matching column as
   `correctCols`, so a board with 2+ structurally valid overcut columns silently enters the pool as
   if single-answer, and the `answerSetHolds` check never sees the second column to catch the
   discrepancy. This is the overcut-side sibling of the OI-61 undercut defect and belongs in the
   same feature (FR-010 already requires exposing the full match count; enforcing uniqueness from
   it is one `if (correctCols.length !== 1) return { passes: false, correctCols: [] };` line, but
   it changes the accept/reject outcome for any live overcut board currently relying on the gap —
   test before assuming zero blast radius). **Guard rails (Decision #1, owner 2026-07-29) — this
   MUST NOT ship as a silent addition to the FR-010 task**: measure the live `overcut` pool with
   `audit_answer_ambiguity.mjs --puzzles overcut --env local` *before* this fix lands, record the
   after-count once it does (FR-021a), and require FR-023 replacements if the after-count drops
   below the FR-022a threshold — the identical discipline FR-021/022/023 already apply to `undercut`,
   named explicitly for `overcut` too. This task therefore has its own before/after-measurement
   sub-task, sequenced per item 5a below.
4a. **FR-023a (`audit_answer_ambiguity.mjs` correct_cols cross-check) must land before ANY FR-022 or
   FR-022a dry-run measurement is taken** (Decision #2) — the script is the single measurement path
   for both `undercut` and `overcut`; if it still recomputes `acceptedCols` live without reading
   `correct_cols`, the pre-fix and post-fix measurements it produces describe the computed-live
   branch's future behavior, not what the stored-set branch will actually grade, which is exactly the
   gap Blocking #1 flagged as unaddressed. Sequencing: FR-023a → item 4's overcut pre-fix measurement
   → the FR-010/F1 fix → item 4's post-fix measurement → FR-022a threshold. The same ordering applies
   to `undercut`'s FR-021/022 measurements (item 5 below).
5. **Schema (FR-013) before any generation/backfill code that writes to it, but the backfill
   (FR-015) cannot run until every `check*Predicate` function is widened (US1/US2 first).**
   Sequencing: migration → widen evaluators/detectors/check-functions (US1+US2 fully, including D6's
   centralized sort+sync with the undercut/overcut carve-out, FR-016a/FR-019) → wire generation-time
   writes (FR-014) → write the backfill script (FR-015/D5, including the FR-016b empty-set
   deactivation rule) → FR-023a audit-script update (if not already landed per item 4a) → run the
   FR-022 dry-run measurement (D4) for `undercut` and the FR-022a measurement for `overcut` → set both
   thresholds → run the real backfill → FR-021/FR-021a reports → FR-023 replace-not-exempt
   remediation → FR-031 zero-failure audit (including its `correct_cols` cross-check, FR-023a).
6. **FR-024 (stored-set grading branch) ships AFTER the backfill, by decision, not merely by
   dependency** (Blocking #3, resolved in this plan rather than left to tasks.md). Two distinct
   states must not be conflated:
   - `correct_cols IS NULL` (a row the backfill has not yet reached) → the handler falls through to
     the row-less, computed-live branch (FR-025) — fail-open, so a live drill is never broken by an
     unbackfilled row (FR-024a).
   - `correct_cols = {}` (empty, non-null — the invariant now rejects every column for that row) →
     this MUST NOT be servable at all; the backfill deactivates such rows instead of writing the
     empty array to an active one (FR-016b), so the grading handler should never observe this state
     for an `is_active = true` row it looked up.
   Because the NULL case degrades gracefully, FR-024 is *technically* safe to implement before the
   backfill completes — but it still MUST ship after the backfill in task/story order (Blocking #3c):
   landing it earlier would mean every stored-set request falls through to computed-live during the
   gap, silently defeating US3's "computed once, not recomputed at serving time" goal for the entire
   rollout window, with no test able to catch that regression (both branches would produce the same
   `accepted` value by construction). tasks.md MUST enforce this ordering as a hard dependency, not an
   optional recommendation.
7. **`evaluateMoveMultiSolution.test.js`/`singleAnswerCategoriesAccepted.test.js` must NOT be
   renamed or have `MULTI_SOLUTION_CATEGORIES`/`SINGLE_ANSWER_CATEGORIES` renamed** — per the
   handoff, `tests/integration/evaluateMoveMultiSolution.test.js` asserts on the code expression
   `MULTI_SOLUTION_CATEGORIES.has(effectiveCategory)` as source text; comment-only edits are safe,
   symbol renames are not.
8. **Every new/changed test file must be added to BOTH `test` and `test:fast` in
   `connect-four/package.json`** (lines 16–17) in the SAME task that creates it, not a follow-up —
   per the "stale registration fails nothing" trap (`testing-conventions.md`).
9. **FR-033 (closeout)** is the final task of each of US1–US4, per the epic's Issue Closeout
   Convention (`docs/epics/open-issues-epics.md:17-31`) — not a single end-of-feature pass.
10. **A regression test MUST assert `checkPredicate`'s ascending-sort AND `correct_col` sync/carve-out
   rule for every category, not a sampled few** (Blocking #2, D6) — otherwise a future category
   bypassing the centralized wrapper breaks FR-016a/FR-019 silently, with nothing catching it.

**Estimated task count**: ~10 (US1, floor + z_threat/overcut/undercut widening) + ~10 (US2, safety
gate + undercut fix + overcut Finding-F1 fix with its own before/after measurement + before/after
counts) + ~9 (US3, schema + backfill incl. FR-016b + audit-script FR-023a update + stored-set branch
ordered after backfill) + ~6 (US4, regression proof + documentation) ≈ **~35 tasks** (up from the
original 33 — the two added tasks are the audit-script cross-check, FR-023a, and the explicit
overcut before/after measurement, FR-021a/022a), comfortably inside the 15–60/epic sizing rule
(`docs/epics/open-issues-epics.md:12-15`) once split across 4 user stories.

## Complexity Tracking

Not applicable — no Constitution Check violations.
