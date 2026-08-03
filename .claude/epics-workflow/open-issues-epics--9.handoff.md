## Handoff context (from tasks_create)

**tasks.md**: 54 tasks, 3 sequential user stories, 4 sub-commits inside US2.
- **Phase 1 (Setup)**: T001 — mandatory doc reads.
- **Phase 2 (Foundational)**: intentionally EMPTY, explained in prose rather than filled with filler — US1 functionally serves that role for US2, and US2 for US3.
- **Phase 3 (US1, T002–T008)**: backfill confirmation, baseline measurement, fresh greps, triage table, the four no-substring sites, the three sync-writers + sync-assertion test, story gate.
- **Phase 4 (US2, T009–T045)**: Commit 1 (T009–T031, 23 tasks, **no `[P]` markers by design**) covering server core, wire contract, all five suppression sites + the one exemption, frontend, FR-014/015/016 (real puzzle generation, manual QA, DOM test), same-commit tests, single-commit checkpoint; Commit 2 (T032–T036, sync-writers, `[P]`-marked); Commit 3 (T037–T042, non-test scripts); Commit 4 (T043–T044, the FR-018 deletion); story gate T045.
- **Phase 5 (US3, T046–T054)**: two-part zero-reference check, migration-number re-verification, the drop migration, three doc updates (`[P]`), OI-81 closeout, final SC-001–SC-008 verification.

**Key decisions**: Declared Phase 2 empty with an explanation rather than manufacturing filler. Made the story-dependency section explicitly OVERRIDE the template's default "stories may proceed in parallel" language — this feature is strictly sequential. Deliberately omitted all `[P]` markers inside Commit 1's block and added a governing-constraint note at the top plus a repeated inline reminder at T009, specifically to stop a future reader inferring "these can be split" from normal speckit parallelization conventions.

**Fragile-area findings (the three that were flagged):**
1. **D3 error message** — pasted the real code from `server/index.js:3334-3336`: `{ error: 'correct_col must be integer 0-6' }`. T016 quotes it verbatim and specifies an adapted array-form message.
2. **Caller sites re-verified BY SYMBOL** — both confirmed: `evaluateMoveHandler.js:250` is `buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata })`, and `index.js:1908` is `buildPredicatePuzzle(category, movestring, { puzzle })`. **Note the second passes the whole `puzzle` object, not a destructured scalar** — the plan's phrasing glossed over this. T013 calls it out explicitly as something to re-check after T009.
3. **`highlightMetadata` fate — resolved by tracing, not fiat.** `buildPredicatePuzzle`'s signature `{ correctCol, highlightMetadata, puzzle }` shows these are two INDEPENDENT parameters, not one derived from the other; `evaluateMoveHandler.js` and `ChallengeScreen.jsx` both pass/destructure them separately; `DevBoardInjector.jsx`'s own UI copy warns it is load-bearing for single-answer categories. Conclusion: `highlightMetadata` is NOT made dead by removing the `correctCol` fallback expression — it is orthogonal. T018 states this but still frames it as "confirm at task time," per instruction not to resolve by assertion.

**Trade-offs / deferred**: Did not invent line numbers beyond what was re-verified this session (`predicates.js:79`, `evaluateMoveHandler.js:250`, `index.js:1908`, `index.js:3334-3336`). For files not re-opened (`answerSetInvariant.js:42`, `ChallengeScreen.jsx:185-186/302-303`, `AdminLessonEditorScreen.jsx:216`, `CurationWorkspace.jsx:158/262-263`, `PuzzlePickerModal.jsx:111`), carried plan.md's verified-as-of-2026-08-03 numbers forward with drift-tolerant phrasing and an instruction to re-verify by symbol.

**Uncertainties for the next agent**: Frontend and `answerSetInvariant.js` line numbers not re-read this session. Whether `server/shapeDescriptor.js`/`classifier.js` are sense-1 or sense-3 remains genuinely untriaged — T040 is a real open question, not a formality. The DOM-test file location for T025 (new file vs. `challengeScreenOutcome.dom.test.jsx`) is left as an implementer's call per T029.

## Load-bearing facts still carried forward
- **The `undercut`/`overcut` "show nothing" behavior is EMERGENT FROM A NULL, not implemented** — retiring the scalar DELETES the mechanism; suppression must be BUILT. Five suppression sites; `server/index.js:2602` is an explicit EXEMPTION (grading input, not a response field — suppressing there grades correct answers as wrong).
- `undercut`/`overcut` are BOTH in `SINGLE_ANSWER_CATEGORIES` — NOT the discriminator. New constant `SUPPRESSED_SINGLE_COLUMN_CATEGORIES`, **mirrored by hand** into `server/categories.js` AND `src/lib/categories.js` (duplicate-and-sync, NOT cross-imported).
- `/api/puzzles/draw` and `/api/admin/puzzles` must **NOT** suppress server-side — their consumers grade as well as display.
- **Commit 1 is a HARD single-commit requirement.** Splitting it strands `buildPredicatePuzzle`'s callers (grading correct answers as WRONG) and separates the wire field from its only sender/reader — and `test:fast` catches NEITHER.
- **Migration numbering ambiguous on disk**: `061_correct_cols.sql` AND `061_security_lints.sql` both exist; latest is `063_puzzle_attempts_outcome_narrow.sql`. Re-verify immediately before writing the drop migration (Settled decision 4 forbids reserving in advance).
- `tests/integration/evaluateMoveMultiSolution.test.js:75` asserts pre-migration SOURCE TEXT of `ChallengeScreen.jsx` via regex — same commit as that screen.
- `tests/unit/checkPredicateSortAndScalarSync.test.js` must be DELETED, not migrated.
- **Gate**: `npm run test:fast` from `connect-four/`; never bare `npm test`. Baseline measured twice on 2026-08-03: **1685 pass / 5 fail** (pre-existing OI-82 failures, also red in main). Judge against 5, not 0.
- Bare `grep` here is `ugrep` — use `/usr/bin/grep`.
- **Still unverified by anyone**: whether spec 051's backfill has actually RUN against the target DB (Settled decision 5 / FR-005) — a blocking gate on all of US2, uncheckable by reading files.
- Settled decision 7: the fresh triage table is the contract, not any hard-coded file list. Settled decision 10: computed result-shape `correctCol` keeps its name, out of scope.
