---

description: "Task list for Legacy `correct_col` Scalar Retirement (Epic 9, closes OI-81)"

---

# Tasks: Legacy `correct_col` Scalar Retirement

**Input**: `specs/056-correct-col-retirement/spec.md`, `specs/056-correct-col-retirement/plan.md`
**Prerequisites**: plan.md (required, read), spec.md (required, read). No separate `research.md`/
`data-model.md`/`contracts/` exist for this feature — plan.md documents inline (per its "Documentation
(this feature)" section) that this pure-plumbing retirement doesn't warrant them; this tasks.md draws
research facts (D1–D7) directly from plan.md's Research & Design Decisions section.

**Tests**: Not separately requested as a TDD exercise, but FR-017 makes test-file migration mandatory,
in the same commit as the production file it covers — every such task is listed inline within the
commit group it belongs to, not deferred to a trailing "tests" phase.

**Organization**: Three user stories, STRICTLY SEQUENTIAL, not independently startable in parallel —
this is a deliberate deviation from the template's default "stories may proceed in parallel" note. US1's
triage table is US2's literal task list (Settled decision 7); US2 must fully land (all 4 commits) before
US3's zero-reference check can pass. Do not schedule US2 or US3 work before the prior story's gate task
is checked off.

---

## ⚠️ Governing constraint before you read further

**Commit 1 (below, inside User Story 2) is a HARD REQUIREMENT to land as a single atomic commit.** Tasks
T009–T032 all belong to that one commit. Nothing in their ordering, their `[P]` markers (deliberately
omitted throughout Commit 1 — see note at T009), or their per-task file scoping may be read as permission
to merge any subset of them to a shared/deploy-reachable branch before the rest. Plan review found two
concrete regressions that a partial landing produces with `npm run test:fast` still green (see plan.md
"Why Commit 1 cannot be split"): (a) `buildPredicatePuzzle`'s renamed parameter strands
`evaluateMoveHandler.js:250` and `index.js:1908` on the far side of a server-core/wire-contract boundary,
silently grading every correct answer as wrong; (b) retiring the `correctCol` wire field before
`ChallengeScreen.jsx` migrates breaks all lesson-sourced inline-challenge grading. Plan review found a
**third** such regression during tasks_critique: `server/shapeDescriptor.js`/`server/classifier.js` read
the query T014 rewrites, so they must land in Commit 1 too (T018 below) — a database-scalar consumer
scheduled after the query that feeds it stops working silently is the exact same failure shape, and this
is now believed to be a general hazard at every Commit-1/Commit-2/3 boundary, not just this one instance
(see the note at T005). Treat T009–T032 as one unit of work with one commit at the end (T032).

---

## Phase 1: Setup

- [x] T001 Read the mandatory prerequisite docs before any other task: `docs/architecture/data-model.md`
  ("Correct Column Storage" section), `docs/architecture/db-schema.md` (puzzles/candidates column
  tables), `docs/architecture/api-conventions.md` (evaluate-move + `/api/puzzles/:id` + `/draw`
  sections), `docs/open_issues.md` OI-81 (`docs/open_issues.md:2772`), `docs/epics/open-issues-epics.md`
  Epic 9 section, and this feature's own `spec.md` + `plan.md` in full. No file changes; this is a gate,
  not a parallelizable task.

## Phase 2: Foundational

*None.* Unlike a typical feature, this retirement has no shared infrastructure to stand up before user
stories can begin — User Story 1 itself **is** the foundational/blocking phase for User Story 2 (its
triage table is US2's task list), and User Story 2 is in turn blocking for User Story 3 (the drop cannot
happen until every consumer is migrated). That sequencing is expressed as inter-story dependencies below,
not as a separate Phase 2.

---

## Phase 3: User Story 1 — Fresh consumer inventory and migration plan (Priority: P1)

**Goal**: Produce a trustworthy, current, per-file/per-call-site triage table of every DB-scalar-sense
`correct_col`/`correctCol` reference, superseding the stale 2026-07-29 inventory (OI-81, epic), and confirm
the feature's two hard preconditions (spec 051's backfill has run; the fast-suite baseline is recorded)
before any migration code is touched.

**Independent Test**: Re-run the derivation greps against the current worktree and confirm the resulting
triage table accounts for every hit with an explicit disposition (migrate / lesson-JSON / computed-result-
shape / smoke-check-only) — this delivers a verified work breakdown with no code change required.

- [x] T002 [US1] Confirm spec 051's backfill has actually populated `correct_cols` on every existing
  `puzzles`/`candidates` row in the target database (FR-005, Settled decision 5, spec Edge Case 2). This
  is a blocking gate, not a formality — per the handoff, this fact is "still unverified by anyone" and
  cannot be checked by reading files alone; query the actual target DB (see memory
  `reference_supabase_connection.md` before writing any inline DB script) and record the confirmation
  (row counts checked, any NULL `correct_cols` found) in the triage-table artifact from T005. If any row
  is unbackfilled, STOP — do not proceed to Phase 4 until it is resolved.
- [x] T003 [US1] Measure and record the pre-change regression-suite baseline (FR-006, Assumptions). Run
  `cd connect-four && npm run test:fast` (never bare `npm test`) and record: the exact command, the date
  run, and the full pass/fail/suite counts. Re-verify each failing test's identity by name — do not copy
  the plan's 2026-08-03 baseline (**1690 tests, 257 suites, 1685 pass, 5 fail**: `server/tests/
  branchInvariance.test.mjs`, `server/tests/causalLinksComposers.test.mjs`, `server/tests/
  reasonRenderFixes.test.mjs`, `server/tests/renderCoverageCorpus.test.mjs` [ENOENT on a missing frozen
  corpus file], `server/tests/renderCoverageUniverse.test.mjs` [same ENOENT cause] — all OI-82, none in a
  file this feature touches) verbatim if time has passed; re-measure fresh and note any drift. This
  recorded baseline is the artifact every later "no failures beyond baseline" requirement (FR-025, SC-005)
  points to.
- [x] T004 [US1] Re-run the two derivation greps fresh against the current worktree from `connect-four/`:
  `/usr/bin/grep -rn "correct_col\b" server src scripts tests` and `/usr/bin/grep -rn "correctCol\b" server
  src scripts tests` (never the bare `grep` alias — it is `ugrep` here and can silently return zero
  matches on files it treats as binary). Do not reuse the plan's 2026-08-03 counts (33 files / 49 files)
  without re-running — this is a concurrently-edited repo (Settled decision 7) and the plan's own file
  list is explicitly "a best-effort starting hypothesis... not a substitute for this re-derivation." Note
  that a tasks_critique pass on this same date already found four sites the plan's Source Code map missed
  entirely (`server/scripts/t018_single_answer_search.mjs`, `server/evaluateMoveHandler.js:154`,
  `server/kb/README.md`, `server/scripts/repair-overcut-highlight-metadata.js`) — treat the plan's file
  map as under-inventoried, not authoritative, and expect this fresh re-run to surface further drift.
- [x] T005 [US1] Produce the per-file, per-call-site triage table from T004's raw hits (FR-002). Classify
  every discovered reference into exactly one of: **migrate** (DB scalar, in scope), **lesson-JSON field**
  (out of scope, Settled decision 3), **computed result-shape field** (out of scope, Settled decision 10),
  or **smoke-check-only** (upstream of the DB write, e.g. `server/gameSampling.js`, `server/
  debug-claimeven.js`). Save this table as a checked-in artifact (e.g.
  `specs/056-correct-col-retirement/triage-table.md`) — it is the literal task list Phase 4 (US2) consumes,
  not the plan's Source Code tree annotations, not the epic's per-file lists, and not OI-81's counts.
  **For every entry, also check whether anything scheduled in an earlier commit reads/writes the exact
  query or field that entry depends on** — flag any such entry as a cross-commit read-after-write hazard
  (the pattern found in `shapeDescriptor.js`/`classifier.js` during tasks_critique: T014 rewrites the
  query at `server/index.js:3167` in Commit 1, but the two files reading that row were originally left in
  Commit 3) and move the hazardous entry into the same commit as what it depends on, rather than leaving
  it split across commits.
- [x] T006 [US1] Within the triage table, explicitly resolve the four known no-substring camelCase call
  sites by name, one row each, never folded into an aggregate count (FR-003, Acceptance Scenario 2):
  (a) `server/evaluateMoveHandler.js`'s request-body `correctCol` destructure (verify by symbol —
  re-check the current line, previously seen at line 135); (b) `server/predicates.js`'s
  `buildPredicatePuzzle`'s `correctCol` parameter (currently `server/predicates.js:79`:
  `export function buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata, puzzle } =
  {}) {`); (c) `server/answerSetInvariant.js`'s `acceptedCols` `correctCol` destructure (previously seen at
  line 42); (d) `server/predicates.js`'s own legacy fallback expressions that read the scalar when the
  array is absent — verified today in `evalFigure7`/`evalJShape`:
  `const correctCols = puzzle.correctCols ?? (puzzle.correctCol != null ? [puzzle.correctCol] : []);` — and
  confirm whether `evalOddEvenThreat` (or any other evaluator) has an equivalent fallback expression.
- [x] T007 [US1] Within the triage table, explicitly resolve the three sync-writer files plus the one
  sync-assertion test by name (FR-004, Acceptance Scenario 2): `server/candidate-generator.js`'s
  `checkPredicate` central sync point → disposition "remove the `correct_col` scalar computation, keep
  `correctCols` only"; `server/scripts/backfill-correct-cols.mjs` → disposition "remove the `correct_col`
  write, keep `correct_cols`"; `server/promotePuzzleRow.js` → disposition "remove the `correct_col` copy";
  `tests/unit/checkPredicateSortAndScalarSync.test.js` → disposition "delete, do not migrate" (FR-018).
- [x] T008 [US1] **Story gate**: confirm the triage table (T005–T007) is complete — every hit from T004's
  raw greps has exactly one disposition, the backfill confirmation (T002) is recorded, and the baseline
  (T003) is recorded — before starting Phase 4. Record this gate as satisfied in the triage-table
  artifact's header.

**Checkpoint**: Triage table complete and checked in; backfill confirmed; baseline recorded. Phase 4 may
begin, using the triage table (not this document's Phase 4 file list, which is a starting hypothesis like
the plan's) as authoritative.

---

## Phase 4: User Story 2 — Migrate every consumer and retire the wire contract, as one deploy-atomic unit (Priority: P2)

**Goal**: Move every triage-table "migrate" entry across server, frontend, scripts, and tests off the
`correct_col` scalar onto `correct_cols`/`correctCols`, retiring the wire contract's singular field
outright (no deprecated alias) and building the `undercut`/`overcut` suppression check that used to be
free via NULL. Internally staged as four commits (Commit 1 merged/hard-required; Commits 2–4 may land
separately), with `npm run test:fast` green against the T003 baseline after every commit.

**Independent Test**: After each atomic commit, run the regression suite and inspect HTTP request/response
shapes directly (evaluate-move, puzzle-detail) to confirm only `correctCols` is present past the commit
that touches the wire contract; exercise the curation workspace, puzzle picker, challenge screen, and
admin lesson editor for a real `undercut`/`overcut` puzzle to confirm "nothing to show" is unchanged.

**Depends on**: Phase 3 (US1) complete — every task below consumes T005's triage table as its authoritative
file list; the specific files named below are this plan's best-effort hypothesis (per plan.md's Source
Code tree) and MUST be reconciled against the actual triage table before starting.

### Commit 1 of 4 — server core + wire contract + frontend, MERGED (HARD REQUIREMENT, single commit)

> **No `[P]` markers appear in this commit group, deliberately.** Marking these tasks parallelizable could
> be read as "these can also be committed independently." They can be *worked on* in any order or
> concurrently by different files, but T009–T031 must all be staged and land in the ONE commit created by
> T032 — see the governing constraint at the top of this document.

- [x] T009 [US2] Migrate `server/predicates.js`: rename/rewire `buildPredicatePuzzle`'s `correctCol`
  parameter (currently line 79) to accept the array form; update the legacy fallback expressions found in
  T006(d) (`evalFigure7`/`evalJShape`, and any other evaluator with the same pattern) to read only
  `correctCols`. Do **not** rename the bare `correctCol` field returned by every evaluator's result object
  (e.g. `{ result: 'correct', correctCol: candidateCol }`, sense 3, Settled decision 10) — that stays.
- [x] T010 [US2] Migrate `server/answerSetInvariant.js`: convert the `acceptedCols` `correctCol` destructure
  (T006(c)) to the array form, threading through to `buildPredicatePuzzle` using its now-array parameter
  from T009.
- [x] T011 [US2] Migrate `server/evaluateMoveHandler.js`: replace the request-body `correctCol` destructure
  (T006(a)) with a `correctCols` array destructure, and update the `puzzle.correct_col ?? null` fallback
  read to `puzzle.correct_cols ?? []`. Also swap this file's own `.select(...)` query string — a
  tasks_critique finding, previously omitted from T006's enumeration: `server/evaluateMoveHandler.js:154`
  reads `.select('… correct_col, correct_cols')` — this is a plain substring match, not a no-substring
  camelCase site, but it lives in the same file as this task's other changes and must land in this same
  commit or it survives Commit 1 undetected by SC-001 until Phase 5. Verify by symbol (not by line number,
  which drifts) that the call site to `buildPredicatePuzzle` — confirmed present today at
  `evaluateMoveHandler.js:250`: `const predicatePuzzle = buildPredicatePuzzle(category, movestring, {
  correctCol, highlightMetadata });` — is updated to pass the array param from T009.
- [x] T012 [US2] Migrate `server/index.js`'s puzzle-detail HTTP response site — confirmed today at line
  2550: `correctCol: puzzle.correct_col ?? null,` — to `correctCols: puzzle.correct_cols ?? [],` **and**
  apply the D2 suppression check (built in T017) for `undercut`/`overcut`: this is the ONE
  `server/index.js` response site FR-011 covers.
- [x] T013 [US2] Migrate `server/index.js`'s `/api/puzzles/:id/check` internal predicate-builder input —
  confirmed today at line 2602: `correctCol: puzzle.correct_col ?? null,` — to the array form
  `correctCols: puzzle.correct_cols ?? []`. **Do NOT apply the suppression check here** — this is the
  explicit FR-011 exemption; it is the accepted-answer set fed to the grading evaluator, not a response
  field, and suppressing it would grade every correct `undercut`/`overcut` answer as wrong. Verify by
  symbol (not line number) that the call site `buildPredicatePuzzle(category, movestring, { puzzle })` —
  confirmed today at `server/index.js:1908` — receives the updated array shape via `puzzle.correct_cols`
  once T009's parameter change lands (this call passes the whole `puzzle` object, not a destructured
  scalar, so verify what `buildPredicatePuzzle` reads off `puzzle` post-T009).
- [x] T014 [US2] Swap all eleven `server/index.js` `.select(...)` query strings containing `correct_col` to
  `correct_cols` — re-verify the count and line numbers fresh via `/usr/bin/grep -n "correct_col"
  server/index.js` (verified 2026-08-03 at lines 1038, 1693, 1728, 1744, 1769, 2530, 2571, 3167, 3242,
  3366, 3418; treat these as a starting list to re-confirm, not a final one). Two of these feed the raw
  snake_case endpoints `/api/admin/puzzles` (line 1038) and `/api/puzzles/draw` (lines 1693/1728/1744/1769)
  — their consumers use the value for grading as well as display, so these two endpoints must **not**
  suppress server-side; suppression happens only at the display sites that read their output. **The row
  fetched by the line-3167 query is read by `server/shapeDescriptor.js` (T018, this same commit) — do not
  land this task without T018, or the admin puzzle-reindex route silently computes wrong shape keys from
  an `undefined` value with no crash and no failing test.**
- [x] T015 [US2] Add the shared suppression constant to both category files (D2), following the project's
  existing duplicate-and-sync convention (never cross-imported, per `server/categories.js`'s own header
  comment): add `SUPPRESSED_SINGLE_COLUMN_CATEGORIES = new Set(['undercut', 'overcut'])` to
  `server/categories.js` and, with an identical literal, to `src/lib/categories.js`. Comment both citing
  FR-010/FR-011 and noting it is disjoint in *purpose* from (though a membership subset of)
  `SINGLE_ANSWER_CATEGORIES` (`server/categories.js:33`, which must NOT be the discriminator — verified it
  lists `'z_threat', 'overcut', 'claimeven', 'undercut', 'figure_7', 'j_shape', 'odd_even_threat'`).
- [x] T016 [US2] Migrate `/api/admin/scores`'s query-string parameter (D3, FR-008's "curation query-string
  parameter") from the single-valued `req.query.correct_col` to a comma-separated `req.query.correct_cols`
  list. The existing scalar check, confirmed today at `server/index.js:3334-3336`:
  ```js
  const correctColRaw = req.query.correct_col !== undefined ? parseInt(req.query.correct_col, 10) : null;
  if (correctColRaw !== null && !isValidCol0(correctColRaw)) {
    return res.status(400).json({ error: 'correct_col must be integer 0-6' });
  }
  ```
  becomes an array-aware version implementing exactly D3's three cases: **absent**
  (`req.query.correct_cols === undefined`) → remains `null`, do not run `.split(',')`; **present and
  non-empty** (`'1,3'`) → `req.query.correct_cols.split(',').map(s => parseInt(s, 10))`, validate every
  element with the same `isValidCol0`, 400 on any invalid element using the equivalent adapted message
  (e.g. `'correct_cols must be a comma-separated list of integers 0-6'` — adapt the verbatim string above
  to the array contract, do not invent an unrelated shape/error format); **present but empty**
  (`req.query.correct_cols === ''`) → treat identically to absent (`null`), do not let it fall through to
  `''.split(',').map(Number)` (which yields `[NaN]` and would wrongly 400). Pass the parsed array as
  `buildPredicatePuzzle`'s `correctCols` param (already accepted per `predicates.js:86`'s existing
  fallback expression).
- [x] T017 [US2] Migrate `server/index.js`'s candidate-promotion write (confirmed today at line 3087:
  `correct_col: c.correct_col ?? null,` alongside `correct_cols: c.correctCols ?? null,`) — remove the
  `correct_col` half — and the candidate-approval validations (confirmed today at lines 3376-3377 and
  3435-3436: `candidate.correct_col !== null && !isValidCol0(candidate.correct_col)`) — re-derive the
  equivalent validation over `correct_cols` (every element in range via `isValidCol0`). Implement the D2
  suppression-check helper used by T012 as part of this task (a single exported predicate reading
  `SUPPRESSED_SINGLE_COLUMN_CATEGORIES` from T015), since `server/index.js` is where it is first consumed.
- [x] T018 [US2] **Migrate `server/shapeDescriptor.js` and `server/classifier.js` — resolved sense 1
  (database scalar), settled by tasks_critique, NOT a triage-time open question.** `shapeDescriptor.js`
  reads `puzzle.correct_col` in four places (verified today: lines 327, 338, 352, 356) off the row T014
  re-fetches via the line-3167 query; `classifier.js` writes `correct_col:` in two places (verified today:
  lines 1718, 1736). Both are unambiguously the DB-scalar sense, not the lesson-JSON or computed-result-
  shape senses this feature excludes (Settled decision 10 covers `predicates.js`'s own per-evaluator result
  field, a different object entirely). Migrate both files to read/write `correct_cols` only. **This task
  MUST land in this same commit, alongside T014** — landing it in a later commit (as originally scheduled)
  reproduces the exact half-migrated-app failure Commit 1's atomicity exists to prevent: `test:fast` stays
  green while the admin puzzle-reindex route silently computes wrong shape keys. `tests/unit/
  shapeDescriptor.test.js` and `tests/classifier/classifier.test.js` (T029) already migrate in this same
  commit — this task makes their production counterparts consistent with that, satisfying FR-017.
- [x] T019 [US2] Migrate `src/screens/ChallengeScreen.jsx` at its two distinct sites. (a) Lines ~185-186,
  the LESSON→PUZZLE adapter (Settled decision 11): `correct_col: ch.correctCol` becomes `correct_cols:
  [ch.correctCol]` — `ch.correctCol` itself (the lesson-JSON scalar) is untouched (FR-013). (b) Lines
  ~302-303, the WIRE-CROSSING remap: `correctCol: current.correct_col, highlightMetadata: current.
  highlight_metadata` becomes `correctCols: current.correct_cols, highlightMetadata: current.
  highlight_metadata` — **`highlightMetadata` is a separate, independent request field from `correctCol`/
  `correctCols`** (verified: `buildPredicatePuzzle`'s signature is `{ correctCol, highlightMetadata,
  puzzle }` — two distinct named parameters, not one derived from the other, and `evaluateMoveHandler.js`
  destructures them separately too); nothing in T009's fallback-expression removal touches
  `highlightMetadata`, so do not drop it here — it remains load-bearing for `z_threat` grading (verified:
  `DevBoardInjector.jsx`'s own UI copy warns "Single-answer categories need correctCol or
  highlightMetadata, else the verdict reads 'wrong'"). Confirm this conclusion holds at task time by
  re-checking `server/predicates.js`'s z_threat evaluator reads `highlightMetadata` directly (not derived
  from `correctCol`/`correctCols`) before finalizing this task — do not resolve by fiat.
- [x] T020 [US2] Migrate `src/screens/AdminLessonEditorScreen.jsx`'s puzzle→lesson adapter — confirmed
  today at line 216: `correctCol: puzzleData.correct_col` — to suppression-aware form: `correctCol:
  SUPPRESSED_SINGLE_COLUMN_CATEGORIES.has(puzzleData.category) ? null : puzzleData.correct_cols[0]`
  (import the mirrored constant from `src/lib/categories.js`, T015). The field NAME stays `correctCol`
  because it writes INTO lesson-JSON shape (sense 2); only the SOURCE read changes. This is the FIFTH
  suppression site: it implements the suppression logic that `PuzzlePickerRow.jsx` (no task of its own —
  see T026's DOM test) depends on and has no code of its own to express — see plan.md D2/D6 for the full
  five-site enumeration (site 4 is `PuzzlePickerRow.jsx` inheriting the check, site 5 is this adapter).
- [x] T021 [US2] Migrate `src/components/CurationWorkspace.jsx`: the query-string builder (`correctColParam`,
  confirmed around line 158) becomes a `correct_cols`-comma-list builder matching T016's server contract;
  the board hint marker's NULL-based suppression (confirmed around lines 262-263: `if (candidate.
  correct_col != null && ...)`) becomes an explicit `!SUPPRESSED_SINGLE_COLUMN_CATEGORIES.has(candidate.
  category)` check plus `correct_cols[0]` for the hint position on non-suppressed categories.
- [x] T022 [US2] Migrate `src/components/admin/PuzzlePickerModal.jsx`'s column label (confirmed around
  line 111: `col {puzzle.correct_col}`) to an explicit suppression check (`!SUPPRESSED_SINGLE_COLUMN_
  CATEGORIES.has(puzzle.category)`) plus `correct_cols.join(', ')` (or first-element display, per the
  actual UI convention already used elsewhere) for non-suppressed categories. This component reads raw
  snake_case rows from `/api/admin/puzzles` (verified: sibling fields `puzzle.goal_prompt`, `puzzle.
  move_string` on the same object) — do not suppress at the endpoint (T014), only here.
- [x] T023 [US2] Migrate `src/lib/devFixtures.js`'s `buildDevPuzzle` (confirmed around line 29:
  `correct_col: Number.isInteger(correctCol) ? correctCol : null`) to `correct_cols: Number.isInteger
  (correctCol) ? [correctCol] : null`. Re-verify at task time whether the function's own `correctCol`
  parameter should widen to accept an array too, or stay scalar-in/array-out (the fixture literals at
  lines ~60/77/85 keep the param name as their own authoring convenience, not a DB read — do not assume
  either way without checking current callers). **Also check `src/components/DevBoardInjector.jsx` and
  `src/lib/devBoardParam.js`** (a tasks_critique finding — neither is named by any other task): both carry
  camelCase `correctCol` and feed `buildDevPuzzle` via the `?devBoard=` query-parameter flow. Determine
  whether either constructs or parses a `correctCol` value that needs to become `correctCols` for the
  round trip to keep working, and migrate if so; if the current worktree shows no live reference, record
  that finding in the triage table (T005) rather than silently skipping the check.
- [x] T024 [US2] **FR-014 gate, must land before T025–T026 can be written against real data**: generate and
  locally promote at least one real `undercut` puzzle and one real `overcut` puzzle in the local database
  (per memory `feedback_generate_puzzles_for_local_qa` — this is locally reachable; "no such puzzle exists
  locally" is never an acceptable reason to defer T025/T026).
- [x] T025 [US2] **FR-015 manual verification pass**, using T024's puzzles: manually exercise the curation
  workspace (T021) and the puzzle picker (T022) for both the `undercut` and `overcut` puzzle, confirming
  "nothing to show" renders identically to today's pre-migration behavior on both screens.
- [x] T026 [US2] **FR-016 DOM test**, converting T025's manual check into a permanent automated guard: add
  a DOM test asserting that `PuzzlePickerModal.jsx`'s column label, `PuzzlePickerRow.jsx`'s row (rendered
  from a staged lesson `confirmationChallenges` entry sourced via T020's adapter), and `CurationWorkspace
  .jsx`'s hint marker all render nothing for `undercut` and `overcut` fixtures/puzzles. Add the new/changed
  test file to **both** the `test` and `test:fast` arrays in `connect-four/package.json` (currently lines
  16-17) in this same task.
- [x] T027 [US2] Update `tests/integration/evaluateMoveMultiSolution.test.js` in this same commit as
  `ChallengeScreen.jsx` (T019) — it currently asserts the file's PRE-MIGRATION SOURCE TEXT via regex
  (confirmed around line 75: `assert.match(block, /correctCol:\s*current\.correct_col/, ...)`); update the
  regex to match the new `correctCols: current.correct_cols` text this task's T019 introduces.
- [x] T028 [US2] Per the triage table (T005), migrate/verify `tests/integration/{claimeven,figure7_jshape,
  undercut_overcut}.test.js` against the Commit-1 production changes (T009–T023) — these were epic-listed
  as `correct_col`-carrying; re-verify fresh against current fixture shape rather than assuming the epic's
  2026-07-29 description still holds.
- [x] T029 [US2] Per the triage table (T005), migrate/verify `tests/integration/{promoteCorrectCols,
  evaluateMoveStoredSet}.test.js`, `tests/unit/{devFixtures,multiSolutionAcceptance,shapeDescriptor}.
  test.js`, and `tests/classifier/classifier.test.js` against the Commit-1 changes. **The last two
  (`shapeDescriptor.test.js`, `classifier.test.js`) now migrate alongside their production files (T018),
  both in this same commit — no cross-commit gap.**
- [x] T030 [US2] Per the triage table (T005), migrate/verify `tests/dom/challengeScreenOutcome.dom.test.jsx`
  (newly discovered by the plan's live grep as containing `correct_col`) against T019's `ChallengeScreen
  .jsx` changes — if T026's new DOM test is more naturally placed here instead of a new file, do that.
- [x] T031 [US2] Run `cd connect-four && npm run test:fast`. Compare against T003's baseline: only the same
  documented pre-existing OI-82 failures may appear — any new failure blocks T032 until fixed (FR-025).
- [x] T032 [US2] **Commit checkpoint (hard requirement)**: stage every file touched in T009–T031 together
  and create exactly ONE commit. Do not split this into multiple commits under any circumstance — see the
  governing constraint at the top of this document and plan.md's "Why Commit 1 cannot be split."

**Checkpoint**: Commit 1 landed; wire contract retired; suppression check live at all five sites plus the
one exemption; `test:fast` green against baseline.

### Commit 2 of 4 — sync-writers (may land separately)

- [ ] T033 [P] [US2] Remove the `correct_col` scalar computation from `server/candidate-generator.js`'s
  `checkPredicate` central sync point (verified today: every `check*Predicate` returns both `correctCols`
  and a `correct_col` scalar at lines 214, 243-244, 317, 338, 361, 384 — `undercut`/`overcut` hard-code
  `correct_col: null` there, the exact NULL Commit 1's suppression check replaces). Keep `correctCols` only.
- [ ] T034 [P] [US2] Remove the `correct_col` write from `server/scripts/backfill-correct-cols.mjs`
  (verified today: writes `correct_col: result.correct_col ?? null` alongside `correct_cols` around lines
  146-147, 173). Keep only the `correct_cols` write.
- [ ] T035 [P] [US2] Remove the `correct_col` copy from `server/promotePuzzleRow.js` (verified today: copies
  `correct_col: candidate.correct_col ?? null` alongside `correct_cols` around lines 43-44).
- [ ] T036 [P] [US2] **Migrate `server/scripts/t018_single_answer_search.mjs`** (a tasks_critique finding —
  no task previously named this file): line 33 reads `result.correct_col` off the candidate-generator
  result object that T033 stops producing. This script is a live consumer, not a smoke-check — it must
  land in this SAME commit as T033, or it breaks silently the moment Commit 2 ships, with no crash and no
  failing test (the same cross-commit hazard class as blocking issue 1 / T018). Update it to read
  `result.correctCols` (or the equivalent array shape T033 leaves in place).
- [ ] T037 [US2] Migrate/verify any triage-flagged test files covering T033–T036 (e.g. `tests/unit/
  backfillCorrectColsIdempotency.test.js`, `tests/unit/backfillCorrectColsDeactivation.test.js`) in the
  SAME commit as their production file, per FR-017.
- [ ] T038 [US2] Run `cd connect-four && npm run test:fast`, confirm no new failures beyond T003's
  baseline, then commit Commit 2 (`candidate-generator.js`, `backfill-correct-cols.mjs`,
  `promotePuzzleRow.js`, `t018_single_answer_search.mjs`, plus T037's tests).

**Checkpoint**: Sync-writers no longer produce the scalar; nothing downstream broke (Commit 1 already made
the scalar unnecessary as an input; T036 confirms the one live script consumer was updated in step).

### Commit 3 of 4 — non-test scripts (may land separately)

- [ ] T039 [US2] Per the triage table (T005), triage and (if needed) migrate `scripts/
  backfill-confirmation-challenges.mjs` — re-verify its current content fresh; it was epic-listed as a
  consumer but not independently re-read by the plan.
- [ ] T040 [US2] Per the triage table (T005), triage and (if needed) migrate `scripts/
  verify-undercut-puzzles.mjs` — same caution as T039.
- [ ] T041 [US2] Per the triage table (T005), triage and (if needed) migrate `server/scripts/
  audit_answer_ambiguity.mjs` — spec 051 already widened this to select/cross-check `correct_cols`;
  re-verify whether any `correct_col` read remains now that Commit 1 has landed.
- [ ] T042 [US2] **Edit the two non-code `correct_col` mentions (Decision A)** — a tasks_critique finding:
  `server/kb/README.md:7`'s prose sentence and `server/scripts/repair-overcut-highlight-metadata.js:13`'s
  code comment both mention `correct_col` but are neither of them consumers. Per the owner's Decision A,
  edit both rather than widening SC-001's exclusion list: reword the README sentence to "playing the
  correct column," and the code comment to "overcut rows carry no single correct column." This keeps
  SC-001's zero-reference grep mechanically strict at exactly three excluded files (the two historical
  migrations plus the eventual drop migration) with no growing exception list to remember.
- [ ] T043 [US2] Smoke-check `server/gameSampling.js` and `server/debug-claimeven.js` still work correctly
  post-Commit-1/2 (they produce a `correctCol` value upstream of any DB write and are never migrated,
  per Non-obvious facts) — do not migrate, only verify.
- [ ] T044 [US2] Run `cd connect-four && npm run test:fast`, confirm no new failures beyond T003's
  baseline, then commit Commit 3 (whichever of T039–T042 required an actual code change, plus any tests
  they cover per FR-017).

**Checkpoint**: All non-test scripts confirmed either migrated or correctly smoke-checked as
upstream-only; the two non-code prose/comment mentions reworded so SC-001's grep stays exact.

### Commit 4 of 4 — the FR-018 test deletion (dedicated test-only commit)

- [ ] T045 [US2] Delete `tests/unit/checkPredicateSortAndScalarSync.test.js` outright (FR-018,
  Acceptance Scenario 12) — do not convert it to assert some other property; nothing is left for it to
  guard once the scalar is gone. Remove it from **both** the `test` and `test:fast` arrays in
  `connect-four/package.json` in this same task.
- [ ] T046 [US2] Run `cd connect-four && npm run test:fast`, confirm no new failures beyond T003's
  baseline, then commit Commit 4 (the deletion plus the `package.json` array edits).

**Checkpoint**: All four commits landed. User Story 2 acceptance scenarios 1–13 (spec.md) should now all
hold.

- [ ] T047 [US2] **Story gate**: walk spec.md's User Story 2 Acceptance Scenarios 1–13 one by one and
  confirm each is satisfied by Commits 1–4 (wire contract retired with no alias; all five suppression
  sites plus the one exemption behave correctly; sync-writers stopped; every migrated test changed in the
  same commit as its production file; the sync-assertion test is deleted, not converted; the suite was
  green after every commit, not just at the end).

---

## Phase 5: User Story 3 — Drop the legacy column (Priority: P3)

**Goal**: Remove `correct_col` from both `puzzles` and `candidates`, update the project's own schema/API
documentation, and close out OI-81 with evidence — strictly after every consumer from Phase 4 is confirmed
migrated.

**Independent Test**: A repo-wide search for the DB-scalar sense returns zero hits before the migration is
written; the migration applies cleanly; the app continues to function with no references to the dropped
column anywhere.

**Depends on**: Phase 4 (US2) complete in full — all four commits landed and T047's story gate passed.

- [ ] T048 [US3] **Mechanical zero-reference check** (FR-020.1, SC-001): run `/usr/bin/grep -rn
  "correct_col\b" server src scripts tests` (from `connect-four/`) and confirm it returns matches in
  EXACTLY three files: `016_correct_col.sql`, `061_correct_cols.sql`, and (once it exists) the new drop
  migration from T050. Any other file matching is a real, unmigrated reference — if found, it must be
  fixed in a Phase 4 commit before proceeding, not patched around here. (T042's Decision-A edits should
  already have removed the two non-code mentions that would otherwise inflate this count to five.)
- [ ] T049 [US3] **Human-adjudicated zero-reference check** (FR-020.2, SC-002): confirm every remaining
  camelCase `correctCol` occurrence in the repository maps to a triage-table (T005) row dispositioned
  lesson-JSON or computed-result-shape — there is no mechanical way to separate senses by filename alone
  (`server/predicates.js` legitimately still contains sense-3 usage). This explicitly includes confirming
  `server/predicates.js`'s legacy fallback expression identified in T006(d) is now actually gone (removed
  in T009), not merely assumed gone.
- [ ] T050 [US3] Re-verify the actual highest-numbered migration file present on disk **immediately before**
  authoring the drop migration (D1, FR-021) — run `ls connect-four/server/migrations | sort -V | tail -5`
  fresh; do not trust the number `064` or any other number written in this spec, plan, or the epic (`061`
  is already ambiguous on disk between `061_correct_cols.sql` and `061_security_lints.sql`; the latest
  confirmed file as of plan-writing was `063_puzzle_attempts_outcome_narrow.sql`, but this will have moved
  on by task time in a concurrently-edited repo).
- [ ] T051 [US3] Write and apply the column-drop migration (FR-022) using the number from T050, dropping
  `correct_col` from **both** `puzzles` and `candidates` in a single migration file. **Apply it against the
  LOCAL database only** (Decision B) — this feature stops at "merged and green locally"; do not run this
  migration against staging or production. T056 below writes the deploy runbook entry for the owner to run
  it there.
- [ ] T052 [US3] [P] Update `docs/architecture/data-model.md` — remove the "kept in sync" language
  describing `correct_col` (currently in the "Correct Column Storage" section) and document `correct_cols`
  as the sole storage contract for a puzzle's/candidate's accepted answer (FR-023).
- [ ] T053 [US3] [P] Update `docs/architecture/db-schema.md` — remove the `correct_col` column rows from
  both the `puzzles` and `candidates` column tables (FR-023).
- [ ] T054 [US3] [P] Update `docs/architecture/api-conventions.md` — remove the `correctCol` wire-field
  documentation (the `/api/puzzles/:id` camelCase-rename note, the `/api/puzzles/draw` snake_case-vs-
  camelCase mismatch note, and the evaluate-move select-list mention) and document `correctCols` as the
  sole wire contract for every site named in FR-008 (FR-023).
- [ ] T055 [US3] Close out **OI-81** in `docs/open_issues.md` in the SAME change that ships T051's
  migration (FR-024, SC-007), using the exact **Issue closeout convention** format from the top of
  `docs/epics/open-issues-epics.md` (not an invented format): since this is a full fix, prepend `**Status**:
  ✅ RESOLVED <YYYY-MM-DD>` and replace the "why deferred"/"if picked up" body text with what actually
  shipped and where (the migration file from T051, and T048's zero-reference grep result as evidence) —
  matching the style of the file's own worked examples (OI-74, OI-59).
- [ ] T056 [US3] **Deployment prerequisite** (a tasks_critique finding — this feature ships an irreversible
  column drop plus a breaking HTTP field rename, and no task previously recorded that): add a `## Spec 056`
  section to `docs/deployment_steps.md`, following the file's own "Template for new entries" and the
  Spec 054/055 precedents. Cover: what to run (the drop migration from T051, against staging then
  production, in that order), how to verify (the same zero-reference grep from T048, re-run against the
  target environment's checked-out code), and an explicit "not reversible; back up first" warning. Also
  record that this is a **breaking wire rename** — server and frontend MUST deploy together, because a
  server-only or frontend-only deploy breaks lesson-sourced inline-challenge grading (the same hazard
  T019/T027 guard against locally). Do not run the migration against a remote database yourself (Decision
  B) — this task only writes the runbook entry for the owner to execute.
- [ ] T057 [US3] **Spec registry** (a tasks_critique finding): add a row for `056-correct-col-retirement` to
  `specs/index.md`'s table, following its existing column convention (Spec folder / Feature name / Status /
  Key decision-summary), matching the style of the 053/055 rows already present.
- [ ] T058 [US3] **Story gate / final SC verification**: walk spec.md's Success Criteria SC-001 through
  SC-008 one by one and confirm each holds: SC-001 (T048), SC-002 (T049), SC-003 (Commit 1's wire retirement,
  Phase 4), SC-004 (T025's manual pass + T026's DOM test), SC-005 (T031/T038/T044/T046's per-commit
  `test:fast` runs plus a final run here), SC-006 (T051), SC-007 (T055), SC-008 (confirm no task in this
  entire feature touched the lesson-JSON or computed-result-shape senses — re-check `server/lessonLoader.js`,
  `server/scripts/verify_lesson_content.mjs`, `SocraticScreen.jsx`, and `predicates.js`'s per-evaluator
  result-shape field are byte-for-byte unchanged in name/shape/behavior). Also confirm T056/T057 landed
  (deployment runbook entry and spec-registry row) even though neither maps to a numbered SC.

**Checkpoint**: Column dropped (locally); documentation reflects the new sole contract; deployment runbook
entry written for the owner; spec registered; OI-81 closed with dated evidence; all 8 success criteria
verified.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — read the docs, then proceed.
- **Foundational (Phase 2)**: N/A — see note in that phase.
- **User Story 1 (Phase 3)**: Depends on Phase 1. Produces the triage table that gates Phase 4.
- **User Story 2 (Phase 4)**: Depends on Phase 3's story gate (T008) passing. Internally four commits, in
  strict order (Commit 1 must land before 2/3/4 begin, since Commits 2–4 assume Commit 1's wire-contract
  and suppression-check groundwork is already in place — though Commits 2, 3, and 4 may land in any
  relative order once Commit 1 is in).
- **User Story 3 (Phase 5)**: Depends on Phase 4's story gate (T047) passing AND its own fresh
  zero-reference checks (T048/T049).

### User Story Dependencies (deviates from the template default)

- **User Story 1 (P1)**: No dependency on other stories. Must complete first — everything else consumes
  its output.
- **User Story 2 (P2)**: Hard-depends on User Story 1's triage table as its literal task list. NOT
  independently startable in parallel with US1.
- **User Story 3 (P3)**: Hard-depends on User Story 2 being fully landed (all four commits) and verified.
  NOT independently startable in parallel with US2. This is the epic's own framing (Priority order here is
  also a strict dependency chain, not just a suggested sequencing).

### Parallel Opportunities

- Within Phase 3 (US1): T002 (backfill check) and T003 (baseline measurement) can run in parallel with each
  other and with T004 (the greps) — none depend on the others' output.
- Within Commit 1 of Phase 4: deliberately no `[P]` markers (see the note at T009) — work on different
  files may proceed concurrently, but nothing may be committed until T032 lands them all together.
- Within Commit 2 of Phase 4: T033, T034, T035, T036 are marked `[P]` — four different files, no
  interdependency, though all still land in Commit 2's single checkpoint commit (T038).
- Within Phase 5 (US3): T052, T053, T054 (the three doc updates) are marked `[P]` — different files, no
  interdependency, though FR-024/T055 requires them to ship in the same overall change as T051.

---

## Implementation Strategy

### Sequential delivery (this feature has no meaningful "MVP-only" subset)

Unlike a typical multi-story feature, User Story 1 alone delivers no end-user value — it is pure planning
output. The only sensible delivery path is: complete Phase 3 in full → complete Phase 4 in full (four
commits, in order) → complete Phase 5 in full. Do not attempt to demo or ship after Phase 3; do not attempt
to ship after Commit 1 of Phase 4 alone treats that as "done" — Commits 2–4 and Phase 5 must still land for
OI-81 to close.

### Verification discipline (mandatory, this repo's CLAUDE.md)

- Quote, don't paraphrase — every task above that cites a line number also pastes the verbatim current
  source line; treat the line number as approximate (it will drift) and the symbol/verbatim text as the
  real anchor.
- Bare `grep` in this environment is `ugrep` and can silently return zero matches on files it treats as
  binary — every grep task above specifies `/usr/bin/grep`.
- The regression gate is `cd connect-four && npm run test:fast` — never bare `npm test` (it invokes the
  real c4solver up to 400×/test via `tests/integration/candidate-generator.test.js` and routinely hangs).
