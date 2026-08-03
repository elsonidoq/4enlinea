# Implementation Plan: Legacy `correct_col` Scalar Retirement

**Branch**: `worktree-epic-9-correct-col-retirement` | **Date**: 2026-08-03 | **Spec**: `specs/056-correct-col-retirement/spec.md`
**Input**: Feature specification from `specs/056-correct-col-retirement/spec.md` (Epic 9,
`docs/epics/open-issues-epics.md:1807-2094`, closing OI-81)

## Summary

Retire the legacy scalar `puzzles.correct_col` / `candidates.correct_col` (added by
`connect-four/server/migrations/016_correct_col.sql:5-9`) now that `correct_cols integer[]`
(spec 051, `061_correct_cols.sql`) is the computed-once, solver-gated source of truth. Concretely:

1. **Re-derive the consumer inventory fresh** (User Story 1) — the epic's 105-refs/22-files count
   and this feature's own background section are explicitly stale snapshots (Settled decision 7).
   A live `/usr/bin/grep -rln "correct_col\b"` over `server/src/scripts/tests` in this worktree
   returns **33 files**; a live `/usr/bin/grep -rln "correctCol\b"` returns **49 files** (raw union,
   not yet triaged — see Research D5). US1's per-file triage table, not either raw list, is what
   User Story 2 consumes.
2. **Migrate every consumer as one deploy-atomic unit** (User Story 2), in four ordered commits:
   **Commit 1 — server core + wire contract + frontend, MERGED into a single commit** (this plan's
   former "Groups A/C/D" — see the "Why Commit 1 cannot be split" note below for why this merge is a
   hard requirement, not a suggestion), then **Commit 2 — sync-writers**, **Commit 3 — non-test
   scripts**, **Commit 4 — the FR-018 test deletion**. Every other test file moves in the same commit
   as the production file it covers (FR-017), not as a trailing group. `npm run test:fast` must be
   green after every commit.
3. **Build (not "preserve") the `undercut`/`overcut` suppression check** — today it is an emergent
   side effect of `correct_col` being NULL for those categories (`candidate-generator.js:361,384`);
   once the scalar is gone this must become an explicit, category-based check reading one shared
   list mirrored (per the project's existing duplicate-and-sync convention, `server/categories.js:1-2`)
   into `server/categories.js` and `src/lib/categories.js`, consumed at all five sites (Research D2) —
   four display sites plus the puzzle→lesson adapter that feeds `PuzzlePickerRow.jsx` — with one
   explicit exemption (`server/index.js:2602`, a grading input, not a display/response field).
4. **Drop the column** (User Story 3) strictly last, gated on a fresh zero-reference grep, with the
   drop migration numbered from the actual latest file on disk at write time (currently `063`, with
   `061` already ambiguous between two files).

**Why Commit 1 (server core + wire contract + frontend) MUST be a single commit — hard requirement,
not a suggestion.** An earlier draft of this plan split these into three sequential commit groups
(server core → wire contract → frontend). Plan review found two un-caught breaks at the group
boundaries: (a) `buildPredicatePuzzle`'s parameter rename (server core) strands two of its four
callers — `evaluateMoveHandler.js:250` and `index.js:1908` — on the far side of the boundary; for the
lifetime of that intermediate commit they still pass the old scalar parameter name, so the evaluator
sees an empty accepted-answer set and grades every correct answer as wrong; (b) retiring the singular
`correctCol` wire field (wire contract) while the only code that sends and reads it,
`ChallengeScreen.jsx`, still lives in the next commit (frontend) leaves a commit where the app cannot
grade a lesson-sourced inline challenge at all. **Neither break is caught by `npm run test:fast`**:
`tests/integration/evaluateMoveMultiSolution.test.js`'s live-Express tests post bodies that never
contain the field being renamed, and the only thing tying the two sides of the wire change together
is a source-text regular expression that fires solely against `ChallengeScreen.jsx`. So the suite
would certify a half-migrated, non-functional app as green — exactly the failure mode FR-025 and
SC-005 exist to forbid ("no commit boundary at which the application is expected to run in a
half-migrated state"). Merging server core, wire contract, and frontend into one commit removes both
breaks structurally, because there is no longer an intermediate state for either to expose. This
commit will touch roughly ten files — that size is the accepted cost of correctness here; if it is
ever resisted, the correct move is to say so and keep the merge, not to re-split it. (Discussed and
rejected as unnecessary given the merge: letting `buildPredicatePuzzle` accept both the scalar and the
array internally for the migration's duration — this would have been legal even under Settled decision
8, since it is a function parameter, not a wire field, but is moot once the commit is merged.) Commits
2–4 (sync-writers, non-test scripts, the FR-018 deletion) are low-coupling and may remain separate,
per plan review.

**Sizing**: 5 user-story-level task groups (US1 inventory, US2's ordered atomic-commit groups, US3
drop) with 8+ tasks per the project's speckit sweet-spot bar
(`docs/best_practices_spec_driven_development.md`), one real (if deliberately unnamed-in-advance)
design decision — where the shared suppression list lives and how the curation query-string
parameter carries a set (Research D2/D3) — and three subsystems (Postgres schema, Express server,
React frontend). Full pipeline is warranted.

## Technical Context

**Language/Version**: JavaScript (Node.js ESM server in `connect-four/server/`, React 19 JSX
frontend in `connect-four/src/`) — existing stack, no change.
**Primary Dependencies**: Express 5, `@supabase/supabase-js` (Postgres via Supabase). No new
dependencies.
**Storage**: Postgres via Supabase. `puzzles.correct_col` / `candidates.correct_col` (`integer`,
`016_correct_col.sql`) is dropped in User Story 3. `correct_cols integer[]` (`061_correct_cols.sql`)
becomes the sole storage contract.
**Testing**: `node:test` via `cd connect-four && npm run test:fast` (never bare `npm test` — it runs
`tests/integration/candidate-generator.test.js`, which calls the real c4solver up to 400×/test and
routinely hangs 10+ minutes, per CLAUDE.md and `docs/architecture/testing-conventions.md`). New or
renamed test files must be added to **both** the `test` and `test:fast` arrays in
`connect-four/package.json:16-17` (explicit file lists, no auto-discovery — a file left off either
array is silently skipped with exit 0).
**Baseline — measured fresh in this worktree, 2026-08-03 10:26:28 -03, command
`cd connect-four && npm run test:fast`**: **1690 tests, 257 suites, 1685 pass, 5 fail, 0 cancelled/
skipped/todo, duration 35609.35 ms**. The 5 failures, identified by re-running just now (not copied
from the handoff):
  - `server/tests/branchInvariance.test.mjs` — `'test failed'` (pre-existing, blunder-`reason`
    engine, OI-82).
  - `server/tests/causalLinksComposers.test.mjs` — `'test failed'` (same cluster).
  - `server/tests/reasonRenderFixes.test.mjs` — `'test failed'` (same cluster).
  - `server/tests/renderCoverageCorpus.test.mjs` ("every corpus record renders with zero uncovered
    fields and a classified link") — `ENOENT` on
    `server/scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl` (missing frozen
    corpus file, not touched by this feature).
  - `server/tests/renderCoverageUniverse.test.mjs` ("the committed P4 coverage set exercises every
    REQUIRED render predicate") — `ENOENT` on
    `server/scripts/reason_evidence_boards_coverage_2026-07-03T17-14-51Z.jsonl` (same cause).
  All 5 are in the blunder-`reason` evidence engine (OI-82), none in a file this feature touches.
  **Regression gate for this feature (FR-006/FR-025/SC-005): exactly these same 5 tests, and only
  these 5, may fail after any atomic commit or at feature completion — not "all tests pass."** This
  is the first task's recorded output, per FR-006.
**Target Platform**: Existing web app (Express API + Vite/React SPA), no platform change.
**Project Type**: Existing monorepo web application — no new project structure.
**Performance Goals**: No new latency budget; this is a like-for-like column swap on already-hot
paths (`/api/evaluate-move`, `/api/puzzles/:id`, `/api/puzzles/draw`, `/api/admin/scores`).
**Constraints**:
- No deprecated wire alias (Settled decision 8) — the legacy singular `correctCol` HTTP field is
  removed outright in the same change that adds `correctCols`, never kept alongside it.
- The lesson-JSON `correctCol` field (sense 2) and the computed result-shape `correctCol` field
  returned by every `predicates.js` evaluator (sense 3, Settled decision 10) are never touched —
  verified below (Research D5/D6) at every ambiguous call site.
- The column-drop migration cannot be numbered in advance (Settled decision 4); `061` is already
  ambiguous on disk between `061_correct_cols.sql` and `061_security_lints.sql` — re-verify
  immediately before writing the drop migration (Research D1).
- `SINGLE_ANSWER_CATEGORIES` (`server/categories.js:33-35`, mirrored `src/lib/categories.js`) MUST
  NOT be the suppression discriminator — `undercut` and `overcut` are both members of that set
  despite structurally admitting multiple accepted columns (verified: `server/categories.js:33`
  literally lists `'z_threat', 'overcut', 'claimeven', 'undercut', 'figure_7', 'j_shape',
  'odd_even_threat'`).
**Scale/Scope**: Touches `connect-four/server/{index,candidate-generator,predicates,
answerSetInvariant,evaluateMoveHandler,promotePuzzleRow,shapeDescriptor,classifier,categories}.js`,
`server/scripts/{backfill-correct-cols,audit_answer_ambiguity,t018_single_answer_search}.mjs`,
`server/kb/README.md`, `server/scripts/repair-overcut-highlight-metadata.js` (two non-code edits,
Decision A), one new column-drop migration, `connect-four/src/{screens/ChallengeScreen,
screens/AdminLessonEditorScreen, components/CurationWorkspace,components/admin/PuzzlePickerModal,
lib/{categories,devFixtures}}.{js,jsx}`,
`connect-four/scripts/{backfill-confirmation-challenges,verify-undercut-puzzles}.mjs`, ~13 test
files (one deleted), `docs/deployment_steps.md` and `specs/index.md` (US3, tasks_critique), and
three `docs/architecture/*.md` files. Raw (untriaged) grep hit counts: 33 files for `correct_col\b`,
49 files for `correctCol\b` (union, before removing senses 2/3 and smoke-check-only files — see
Research D5) — a tasks_critique re-run found four sites this original count under-inventoried; see
D5's amendment.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — no changes.*

- **I. Explanation Engine as SSOT** — N/A directly: this feature changes storage/wire plumbing for
  an already-computed answer set, not the solver→classifier→LLM pipeline. `predicates.js`'s
  computed result-shape `correctCol` field (sense 3) that classifier/shapeDescriptor consume is
  explicitly out of scope (Settled decision 10) and unchanged.
- **II. Code Quality & Simplicity** — Satisfied by design: the suppression check (Research D2) is
  one new shared list read from five call sites (one explicit exemption at `server/index.js:2602`),
  not five independent re-derivations; the
  puzzle↔lesson boundary gets two thin, one-directional adapters (Research D4), not a shared type or
  speculative abstraction. No half-finished migration: FR-025 forbids any commit boundary where the
  app is expected to run half-migrated.
- **III. Testing Standards** — Satisfied by design: FR-014–FR-016 require a **real, locally
  generated and promoted** `undercut` puzzle and `overcut` puzzle (never "no such puzzle exists
  locally" as an excuse to skip), a manual pass, and a new DOM test — converting today's zero
  automated coverage on this exact regression risk into a permanent guard. FR-017 requires every
  migrated test to change in the **same commit** as its production file.
- **IV. UX Consistency & Progressive Disclosure** — Satisfied: the "nothing to show" behavior for
  `undercut`/`overcut` (Settled decision 9, SC-004) is preserved observably identical; no UI surface
  changes shape, only its backing field.
- **V. Performance** — Satisfied: no new latency budget; array-column reads replace scalar-column
  reads on the same existing queries.
- **VI. Implementation & Debugging Methodology** — Satisfied: every code claim below was verified by
  reading the actual current file in this worktree just now (`predicates.js`, `server/index.js`,
  `evaluateMoveHandler.js`, `candidate-generator.js`, `promotePuzzleRow.js`,
  `backfill-correct-cols.mjs`, `answerSetInvariant.js`, `ChallengeScreen.jsx`,
  `CurationWorkspace.jsx`, `PuzzlePickerModal.jsx`, `PuzzlePickerRow.jsx`,
  `AdminLessonEditorScreen.jsx`, `devFixtures.js`, `tests/integration/evaluateMoveMultiSolution.test.js`,
  `061_correct_cols.sql`, `016_correct_col.sql`, `package.json`) — not recalled from the epic or the
  handoff. The measured baseline (Technical Context) was re-run in this session, not copied.
- **VII. Software Design Philosophy** — "One obvious way to do it": one shared suppression list
  (Research D2), not five ad hoc checks; "special cases aren't special enough to break the rules" —
  `undercut`/`overcut`'s "no single answer" special case still composes through the same
  `correct_cols`-reading code path as every other category, gated only by membership in the new list.
- **VIII. Documentation** — Gate requires:
  - [x] Existing architecture docs read before drafting: `docs/architecture/data-model.md`
    ("Correct Column Storage" §§349-393), `db-schema.md` (puzzles/candidates column tables,
    lines 57-58/93-94), `api-conventions.md` (evaluate-move request/response contract §§540-690,
    the `/draw` casing-mismatch note §766), `docs/open_issues.md` OI-81, `specs/051-pattern-acceptance/spec.md`,
    `016_correct_col.sql`, `061_correct_cols.sql`, the constitution.
  - [x] Undocumented conventions discovered during review: **`PuzzlePickerRow.jsx`'s `correctCol`
    reference (line 40) is NOT itself a DB-scalar consumer** — it renders an in-memory
    `lesson.confirmationChallenges` entry that was already converted to a lesson-shaped scalar by
    `AdminLessonEditorScreen.jsx:216`'s adapter (`correctCol: puzzleData.correct_col`) before being
    staged into that array. This was previously undetermined (handoff, flagged explicitly) — resolved
    here (Research D6) rather than left for a triage-table guess. **Correction from plan review**: not
    reading the DB column directly does not make this file out of scope — the adapter feeding it must
    become suppression-aware (write `null` for `undercut`/`overcut`, matching today's behavior exactly,
    instead of falling back to `correct_cols[0]`), and `PuzzlePickerRow.jsx` is now a fifth suppression
    site and an explicit FR-016 DOM-test target (see Research D2/D6, revised).
  - [x] `tasks.md` (generated by `/speckit-tasks`) MUST include documentation tasks for:
    `data-model.md`/`db-schema.md` (remove "kept in sync" language, FR-023), `api-conventions.md`
    (remove `correctCol` wire field, document `correctCols`, FR-023), and `docs/open_issues.md`
    (close OI-81, FR-024). **Added by tasks_critique (blocking issue 3):** `tasks.md` MUST also
    include a `docs/deployment_steps.md` entry (this feature ships an irreversible column drop plus
    a breaking wire rename requiring server/frontend to deploy together — the repo's own per-spec
    deploy-prerequisite file has no entry for this yet) and a `specs/index.md` registry row. Both are
    local-only writes by the implementing agent — the drop migration itself is applied against the
    local database only (Decision B); staging/production application is the owner's job, described in
    the deploy-steps entry, never executed by an automated task.

No Constitution Check violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/056-correct-col-retirement/
├── plan.md              # This file
├── checklists/
│   └── requirements.md  # Already present, all items checked
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by this plan)
```

No `research.md`/`data-model.md`/`contracts/`/`quickstart.md` are generated as separate files for
this feature: it is a pure plumbing retirement with no new entities, no new API surface (only an
existing field's shape changing), and no new external contract to document beyond what
`api-conventions.md`/`data-model.md` already describe and this plan's Research section resolves
inline. This mirrors the project's practice of skipping unneeded Phase-1 artifacts for
internal-plumbing epics (see `docs/best_practices_spec_driven_development.md`'s epic-sizing
guidance) rather than manufacturing empty files.

### Source Code (repository root)

Existing monorepo layout — no new directories. Below: the union of the two raw greps
(`/usr/bin/grep -rln "correct_col\b"` and `/usr/bin/grep -rln "correctCol\b"`, run 2026-08-03 in
this worktree), annotated with this plan's best current disposition. **This annotation is a
starting hypothesis, not the triage table** — User Story 1's own fresh re-derivation, done at
pickup time against whatever the worktree looks like then, is the actual task list per FR-002 and
Settled decision 7. Files are grouped by the atomic-commit ordering Task Sequencing Notes below
requires.

```text
connect-four/
├── server/
│   ├── migrations/
│   │   ├── 016_correct_col.sql          # HISTORICAL — origin of the scalar; excluded from the
│   │   │                                  #   FR-020/SC-001 zero-reference grep by name
│   │   ├── 061_correct_cols.sql         # HISTORICAL — mentions correct_col in COMMENTS only
│   │   │                                  #   (lines 5-6); excluded by name alongside 016
│   │   └── 0NN_drop_correct_col.sql     # NEW (US3) — number re-verified at write time (Research D1);
│   │                                      #   drops correct_col from BOTH puzzles and candidates
│   │
│   │   # --- Commit 1 of 4 [MERGED — server core, part 1 of 3; see "Why Commit 1 cannot be
│   │   #     split" in Summary]: server core (predicate evaluation + the safety-net invariant) ---
│   ├── predicates.js                     # MIGRATE: buildPredicatePuzzle's correctCol param
│   │                                      #   (line 79/86, no-substring call site, FR-003) and
│   │                                      #   evalOddEvenThreat's fallback expression
│   │                                      #   `puzzle.correctCols ?? (puzzle.correctCol != null
│   │                                      #   ? [puzzle.correctCol] : [])` (line 330, FR-003's
│   │                                      #   4th no-substring site — verified: the fallback
│   │                                      #   literally exists today, reads the scalar when the
│   │                                      #   array is absent). The bare `correctCol` field
│   │                                      #   returned by every evaluator (lines 130-384, e.g.
│   │                                      #   `{ result: 'correct', correctCol: candidateCol }`)
│   │                                      #   is SENSE 3 (computed result-shape) and stays —
│   │                                      #   do not rename it while touching this file.
│   ├── answerSetInvariant.js             # MIGRATE: acceptedCols's `correctCol` destructure
│   │                                      #   (line 42, no-substring call site, FR-003) — thread
│   │                                      #   through to buildPredicatePuzzle unchanged in name
│   │                                      #   (it forwards to predicates.js's own param).
│   │
│   │   # --- Commit 2 of 4 [own commit, may stay separate]: sync-writers (Non-obvious facts / FR-004/FR-009) ---
│   ├── candidate-generator.js            # MIGRATE: checkPredicate's central sync point — every
│   │                                      #   check*Predicate returns BOTH `correctCols` and a
│   │                                      #   `correct_col` scalar (verified lines 214, 243-244,
│   │                                      #   317, 338, 361, 384 — undercut/overcut hard-code
│   │                                      #   `correct_col: null`, the exact NULL this feature's
│   │                                      #   suppression check must replace). REMOVE the
│   │                                      #   `correct_col` computation entirely, keep
│   │                                      #   `correctCols` only.
│   ├── server/scripts/backfill-correct-cols.mjs   # MIGRATE: writes `correct_col: result.correct_col
│   │                                      #   ?? null` alongside `correct_cols` (verified lines
│   │                                      #   146-147, 173). REMOVE the correct_col write; keep
│   │                                      #   only correct_cols.
│   ├── promotePuzzleRow.js               # MIGRATE: copies `correct_col: candidate.correct_col ??
│   │                                      #   null` alongside `correct_cols` (verified lines
│   │                                      #   43-44). REMOVE the correct_col copy.
│   ├── server/scripts/t018_single_answer_search.mjs   # MIGRATE (added by tasks_critique — missed
│   │                                      #   by this plan's original file map): line 33 reads
│   │                                      #   `result.correct_col` off candidate-generator's result
│   │                                      #   object, which the entry above stops producing. This is
│   │                                      #   a live consumer, not a smoke-check-only script, and
│   │                                      #   MUST land in the SAME commit as candidate-generator.js
│   │                                      #   above or it breaks silently with no failing test.
│   │
│   │   # --- Commit 1 of 4 [MERGED — wire contract, part 2 of 3, HARD REQUIREMENT to land in the
│   │   #     SAME commit as server core and frontend, not its own commit — see "Why Commit 1
│   │   #     cannot be split" in Summary]: wire contract (HTTP-crossing fields, FR-008) ---
│   ├── evaluateMoveHandler.js            # MIGRATE: destructures `correctCol: bodyCorrectCol` from
│   │                                      #   req.body (line 135, no-substring call site, FR-003)
│   │                                      #   and reads `puzzle.correct_col ?? null` as the
│   │                                      #   NULL-correct_cols fallback (line 211). Both become
│   │                                      #   the array form; request body field becomes
│   │                                      #   `correctCols`. ALSO its own `.select('… correct_col,
│   │                                      #   correct_cols')` query string (line 154, added by
│   │                                      #   tasks_critique — this plan's original file map didn't
│   │                                      #   call it out separately from the two sites above,
│   │                                      #   though it lives in the same file) — swap to
│   │                                      #   `correct_cols` in this same commit or it survives
│   │                                      #   Commit 1 undetected until Phase 5's zero-reference
│   │                                      #   check.
│   ├── index.js                          # MIGRATE at MULTIPLE sites (re-derived fresh from
│   │                                      #   `/usr/bin/grep -n "correct_col" server/index.js` at
│   │                                      #   plan-review time, per Decision 3/blocking-issue-3 —
│   │                                      #   the site list below is re-derived from that grep, not
│   │                                      #   from the spec's prose):
│   │                                      #   (1) puzzle-detail HTTP response `correctCol: puzzle.
│   │                                      #   correct_col ?? null` (line 2550) — becomes
│   │                                      #   `correctCols: puzzle.correct_cols ?? []` and MUST
│   │                                      #   apply the suppression check (Research D2) for
│   │                                      #   undercut/overcut — before this feature, this was free
│   │                                      #   via NULL; this is the ONE `server/index.js` response
│   │                                      #   site FR-011 covers. (2) **EXEMPTION**:
│   │                                      #   `/api/puzzles/:id/check`'s internal
│   │                                      #   `puzzleForPredicate.correctCol: puzzle.correct_col
│   │                                      #   ?? null` (line 2602) is NOT a response field — it is
│   │                                      #   the accepted-answer set fed to the grading evaluator.
│   │                                      #   It MUST migrate to the array form (still reads the
│   │                                      #   scalar today) but MUST NOT apply the suppression
│   │                                      #   check: suppressing there would empty the accepted set
│   │                                      #   and grade every correct undercut/overcut answer as
│   │                                      #   wrong. FR-011's literal "both...API response sites"
│   │                                      #   wording has been corrected in spec.md to name this
│   │                                      #   exemption explicitly — do not re-read the old wording
│   │                                      #   as requiring suppression here. (3) eleven
│   │                                      #   `.select(...correct_col...)` query strings — verified
│   │                                      #   count via `/usr/bin/grep -n "correct_col" server/
│   │                                      #   index.js`, lines 1038, 1693, 1728, 1744, 1769, 2530,
│   │                                      #   2571, 3167, 3242, 3366, 3418 (the plan's prior "six"
│   │                                      #   count was a counting slip; eleven is the verified
│   │                                      #   figure) — swap all to `correct_cols`. Two of these
│   │                                      #   (line 1038, feeding `/api/admin/puzzles`, and lines
│   │                                      #   1693/1728/1744/1769, feeding `/api/puzzles/draw`) are
│   │                                      #   RAW snake_case response endpoints not named in the
│   │                                      #   spec's original site enumeration — their consumers use
│   │                                      #   the value for grading as well as display, so these two
│   │                                      #   endpoints MUST NOT suppress server-side; suppression
│   │                                      #   happens only at the display sites that read their
│   │                                      #   output (`PuzzlePickerModal.jsx` reads
│   │                                      #   `/api/admin/puzzles`). (4) `/api/admin/scores`'s
│   │                                      #   query-string param `req.query.correct_col` (line
│   │                                      #   3334-3339, the "curation query-string parameter"
│   │                                      #   FR-008 names) — becomes `correct_cols` per Research
│   │                                      #   D3's comma-separated-list contract, INCLUDING the
│   │                                      #   absent/empty/malformed handling D3 now specifies;
│   │                                      #   (5) candidate promotion's `correct_col: c.correct_col
│   │                                      #   ?? null` (line 3087) alongside `correct_cols:
│   │                                      #   c.correctCols ?? null` — remove the correct_col half;
│   │                                      #   (6) candidate-approval validation `candidate.
│   │                                      #   correct_col !== null && !isValidCol0(...)` (lines
│   │                                      #   3376-3377, 3435-3436) — re-derive the equivalent
│   │                                      #   validation over correct_cols (every element in
│   │                                      #   range). Line 1927's `correctCol: predicateResult.
│   │                                      #   correctCol ?? null` on the admin debug
│   │                                      #   `/api/predicates/evaluate`-style route is SENSE 3
│   │                                      #   passthrough of predicates.js's own result field —
│   │                                      #   confirm at triage time whether this is a
│   │                                      #   smoke-check-only response field or needs re-labeling,
│   │                                      #   but do NOT treat it as a DB-scalar site.
│   ├── server/shapeDescriptor.js         # MIGRATE, RESOLVED SENSE 1 (REVISED per tasks_critique —
│   │                                      #   moved out of Commit 3, was originally scheduled there
│   │                                      #   as "TRIAGE AT PICKUP"). Reads `puzzle.correct_col` in
│   │                                      #   four places (verified lines 327, 338, 352, 356) off
│   │                                      #   the row fetched by the line-3167 query above. This is
│   │                                      #   unambiguously the DB-scalar sense, not the sense-3
│   │                                      #   result-shape field Settled decision 10 excludes (that
│   │                                      #   is `predicates.js`'s own per-evaluator return value, a
│   │                                      #   different object). MUST land in THIS commit — leaving
│   │                                      #   it in Commit 3 means the admin puzzle-reindex route
│   │                                      #   silently computes wrong shape keys from `undefined`
│   │                                      #   between Commit 1 and Commit 3, with `test:fast` still
│   │                                      #   green (the same failure class the "Why Commit 1 cannot
│   │                                      #   be split" note exists to prevent).
│   ├── server/classifier.js              # MIGRATE, RESOLVED SENSE 1 (REVISED per tasks_critique,
│   │                                      #   same reasoning as shapeDescriptor.js above). Writes
│   │                                      #   `correct_col:` in two places (verified lines 1718,
│   │                                      #   1736). MUST land in this same commit.
│   │
│   │   # --- Commit 1 of 4 [MERGED — frontend, part 3 of 3, HARD REQUIREMENT to land in the SAME
│   │   #     commit as server core and wire contract — see "Why Commit 1 cannot be split" in
│   │   #     Summary]: frontend ---
│   ├── ../src/screens/ChallengeScreen.jsx    # MIGRATE at TWO distinct sites (verified lines
│   │                                          #   185-186, 302-303): (a) line 185-186 is the
│   │                                          #   LESSON→PUZZLE adapter (Settled decision 11) —
│   │                                          #   `correct_col: ch.correctCol` becomes
│   │                                          #   `correct_cols: [ch.correctCol]` (wrap as
│   │                                          #   one-element array; ch.correctCol itself, the
│   │                                          #   lesson-JSON scalar, is untouched, FR-013); (b)
│   │                                          #   line 302-303 is the WIRE-CROSSING remap —
│   │                                          #   `correctCol: current.correct_col,
│   │                                          #   highlightMetadata: current.highlight_metadata`
│   │                                          #   becomes `correctCols: current.correct_cols`
│   │                                          #   (drop highlightMetadata only if FR-003's
│   │                                          #   fallback removal makes it truly dead — verify
│   │                                          #   at task time, do not assume).
│   ├── ../src/screens/AdminLessonEditorScreen.jsx   # MIGRATE, SUPPRESSION-AWARE (revised per
│   │                                          #   blocking issue 2): line 216's adapter `correctCol:
│   │                                          #   puzzleData.correct_col` becomes `correctCol:
│   │                                          #   puzzleData.category is in
│   │                                          #   SUPPRESSED_SINGLE_COLUMN_CATEGORIES (Research D2)
│   │                                          #   ? null : puzzleData.correct_cols[0]` (Settled
│   │                                          #   decision 11's puzzle→lesson direction) — the field
│   │                                          #   NAME stays `correctCol` because it is writing INTO
│   │                                          #   lesson-JSON shape (sense 2), only the SOURCE read
│   │                                          #   changes. A bare `puzzleData.correct_cols[0]` with
│   │                                          #   no category check would persist a meaningless `0`
│   │                                          #   into authored lesson JSON for undercut/overcut —
│   │                                          #   the exact first-element fallback Settled decision
│   │                                          #   9 / FR-010 / FR-011 exist to forbid. This adapter
│   │                                          #   is now a FIFTH suppression site (Research D2/D6,
│   │                                          #   revised) and writes `null` here matches today's
│   │                                          #   observable behavior exactly (today's source
│   │                                          #   `correct_col` is already NULL for these
│   │                                          #   categories). This does NOT widen the lesson
│   │                                          #   `correctCol` field's shape — it still writes a
│   │                                          #   scalar (`null` or a number) — so it does not
│   │                                          #   violate the "no lesson-JSON widening" NOT-included
│   │                                          #   item.
│   ├── ../src/components/CurationWorkspace.jsx   # MIGRATE: line 158 query-string builder
│   │                                          #   (`correctColParam`) and lines 262-263's
│   │                                          #   suppression-via-NULL board hint marker
│   │                                          #   (`if (candidate.correct_col != null && ...)`)
│   │                                          #   — becomes an explicit suppression check
│   │                                          #   (Research D2) plus `correct_cols[0]` for the
│   │                                          #   hint position on non-suppressed categories.
│   ├── ../src/components/admin/PuzzlePickerModal.jsx   # MIGRATE: line 111 `col {puzzle.
│   │                                          #   correct_col}` — this component reads RAW
│   │                                          #   snake_case rows from `/api/admin/puzzles`
│   │                                          #   (verified: sibling fields `puzzle.goal_prompt`,
│   │                                          #   `puzzle.move_string` on the same object,
│   │                                          #   lines 106-111) — becomes an explicit
│   │                                          #   suppression check (Research D2) + `correct_cols
│   │                                          #   .join(', ')` or first-element display.
│   ├── ../src/components/admin/PuzzlePickerRow.jsx   # REVISED disposition (blocking issue 2):
│   │                                          #   NO CODE CHANGE to this file itself — verified it
│   │                                          #   reads `puzzle.correctCol` (line 40) off
│   │                                          #   `lesson.confirmationChallenges` entries that
│   │                                          #   AdminLessonEditorScreen.jsx already converted to
│   │                                          #   lesson-shaped scalars via its own adapter before
│   │                                          #   staging (Constitution Check / Research D6) — so
│   │                                          #   the RENDER itself needs no edit once the adapter
│   │                                          #   is suppression-aware. BUT this file is NOT out of
│   │                                          #   scope: it is (a) the FIFTH suppression site in
│   │                                          #   substance (its correctness now depends on
│   │                                          #   `AdminLessonEditorScreen.jsx:216`'s adapter writing
│   │                                          #   `null` for undercut/overcut, see that entry above)
│   │                                          #   and (b) an explicit FR-016 DOM-test target — add a
│   │                                          #   test asserting this row renders nothing for an
│   │                                          #   undercut/overcut-sourced confirmation-challenge
│   │                                          #   entry, alongside the CurationWorkspace.jsx and
│   │                                          #   PuzzlePickerModal.jsx DOM-test coverage.
│   ├── ../src/lib/categories.js              # MIGRATE (additive): add the new suppression list
│   │                                          #   (Research D2) mirrored from server/categories.js,
│   │                                          #   per the existing duplicate-and-sync convention
│   │                                          #   documented in server/categories.js's own header
│   │                                          #   comment ("never cross-imported").
│   ├── ../src/lib/devFixtures.js             # MIGRATE: `buildDevPuzzle`'s `correct_col:
│   │                                          #   Number.isInteger(correctCol) ? correctCol :
│   │                                          #   null` (line 29) — becomes `correct_cols:
│   │                                          #   Number.isInteger(correctCol) ? [correctCol] :
│   │                                          #   null`. Fixture literals at lines 60, 77, 85
│   │                                          #   keep the param name `correctCol` (it is the dev
│   │                                          #   fixture's own scalar authoring convenience, not
│   │                                          #   a DB read) — re-verify at task time whether the
│   │                                          #   param itself should widen to an array or stay
│   │                                          #   scalar-in/array-out.
│   │
│   │   # --- Commit 3 of 4 [own commit, may stay separate]: non-test scripts ---
│   ├── ../scripts/backfill-confirmation-challenges.mjs   # TRIAGE AT PICKUP — epic-listed as a
│   │                                          #   consumer; re-verify current content fresh (not
│   │                                          #   re-read in this plan) before assigning
│   │                                          #   migrate/smoke-check-only.
│   ├── ../scripts/verify-undercut-puzzles.mjs           # TRIAGE AT PICKUP — same.
│   ├── server/scripts/audit_answer_ambiguity.mjs        # TRIAGE AT PICKUP — spec 051 already
│   │                                          #   widened this to select/cross-check
│   │                                          #   correct_cols; re-verify whether any correct_col
│   │                                          #   read remains once Commit 1 (server core, wire
│   │                                          #   contract, frontend) has landed.
│   ├── server/kb/README.md                   # EDIT (Decision A, added by tasks_critique — this
│   │                                          #   plan's original file map missed it): line 7's
│   │                                          #   prose mention of `correct_col` is not a consumer,
│   │                                          #   but SC-001's grep can't tell prose from code —
│   │                                          #   reword to "playing the correct column" rather than
│   │                                          #   widening SC-001's exclusion list.
│   ├── server/scripts/repair-overcut-highlight-metadata.js   # EDIT (Decision A, added by
│   │                                          #   tasks_critique): line 13's code comment mentions
│   │                                          #   `correct_col` — reword to "overcut rows carry no
│   │                                          #   single correct column."
│   │   (`server/shapeDescriptor.js` and `server/classifier.js` moved to Commit 1 above — see that
│   │    section; they are NOT triaged here, their sense-1 disposition is already settled.)
│   ├── server/gameSampling.js                # SMOKE-CHECK-ONLY (Non-obvious facts) — produces a
│   │                                          #   correctCol value upstream of any DB write; never
│   │                                          #   itself reads/writes the column. Verify it still
│   │                                          #   works post-migration; do not migrate.
│   ├── server/debug-claimeven.js             # SMOKE-CHECK-ONLY — same.
│   │
│   │   # --- Tests: each lands in the SAME commit as the production file it covers, per FR-017
│   │   #     (see the per-file notes below for which commit that is — mostly Commit 1). "Commit 4"
│   │   #     denotes only the FR-018 deletion below, which has no production-file counterpart to
│   │   #     piggyback on and is this plan's one dedicated test-only commit. ---
│   ├── tests/unit/checkPredicateSortAndScalarSync.test.js   # Commit 4 (the dedicated test-only
│   │                                          #   commit). DELETE, do not migrate (FR-004,
│   │                                          #   FR-018) — exists only to assert correct_col
│   │                                          #   stays in sync; nothing left to assert once the
│   │                                          #   scalar is gone. Remove from BOTH `test` and
│   │                                          #   `test:fast` arrays in package.json:16-17 in the
│   │                                          #   SAME commit as the file deletion.
│   ├── tests/integration/evaluateMoveMultiSolution.test.js   # MUST change in the SAME commit as
│   │                                          #   ChallengeScreen.jsx (verified line ~75:
│   │                                          #   `assert.match(block, /correctCol:\s*current\.
│   │                                          #   correct_col/, ...)` reads ChallengeScreen.jsx's
│   │                                          #   SOURCE TEXT — this is the concrete case FR-017's
│   │                                          #   parenthetical describes).
│   ├── tests/integration/{claimeven,figure7_jshape,undercut_overcut}.test.js   # TRIAGE AT PICKUP
│   │                                          #   — epic-listed as `correct_col`-carrying;
│   │                                          #   re-verify fresh against current fixture shape.
│   ├── tests/integration/{promoteCorrectCols,evaluateMoveStoredSet}.test.js    # TRIAGE AT PICKUP
│   │                                          #   — newly discovered by this plan's live grep
│   │                                          #   (not in the epic's 2026-07-29 list); spec 051
│   │                                          #   created these.
│   ├── tests/unit/{backfillCorrectColsIdempotency,backfillCorrectColsDeactivation}.test.js
│   │                                          # TRIAGE AT PICKUP — same, newly discovered.
│   ├── tests/unit/{devFixtures,multiSolutionAcceptance,shapeDescriptor}.test.js  # TRIAGE AT
│   │                                          #   PICKUP — epic-listed. `shapeDescriptor.test.js`
│   │                                          #   lands in Commit 1, alongside its now-resolved
│   │                                          #   sense-1 production file (see Commit 1 above,
│   │                                          #   REVISED per tasks_critique) — not Commit 3.
│   ├── tests/classifier/classifier.test.js   # TRIAGE AT PICKUP — epic-listed. Lands in Commit 1
│   │                                          #   alongside `classifier.js` (REVISED, same reasoning
│   │                                          #   as shapeDescriptor.test.js above).
│   └── tests/dom/challengeScreenOutcome.dom.test.jsx   # TRIAGE AT PICKUP — newly discovered by
│                                                #   this plan's live grep (contains `correct_col`
│                                                #   per the raw file list); also the natural home
│                                                #   for FR-016's new undercut/overcut DOM test if
│                                                #   not placed in a new file.
│
├── docs/architecture/
│   ├── data-model.md      # UPDATE (US3): remove "kept in sync" language (§§349-393), document
│   │                        #   correct_cols as sole contract
│   ├── db-schema.md        # UPDATE (US3): remove correct_col rows from both column tables
│   │                        #   (lines 57-58, 93-94)
│   └── api-conventions.md  # UPDATE (US3): remove correctCol wire-field documentation
│                            #   (§§550-616, 656-690, 766), document correctCols
├── docs/open_issues.md      # UPDATE (US3): close OI-81 per the Issue Closeout Convention
│                              #   (docs/epics/open-issues-epics.md:17-31)
├── docs/deployment_steps.md # UPDATE (US3, added by tasks_critique blocking issue 3): add a
│                              #   `## Spec 056` section per the file's own "Template for new
│                              #   entries" — what to run (the drop migration, staging then
│                              #   production), how to verify (re-run the SC-001 zero-reference
│                              #   grep against the target environment), "not reversible; back up
│                              #   first," and the breaking-wire-rename deploy-together warning.
│                              #   Local-only write; the migration itself never runs against a
│                              #   remote database from this feature's own tasks (Decision B).
└── specs/index.md            # UPDATE (US3, added by tasks_critique blocking issue 3): add a row
                                #   for 056-correct-col-retirement, matching the existing 053/055
                                #   row format.
```

**Structure Decision**: Existing web-application monorepo. No new services/directories. This
feature is a horizontal sweep across already-existing files; the four-commit grouping above (Commit
1, MERGED server core + wire contract + frontend; Commit 2, sync-writers; Commit 3, non-test
scripts; Commit 4, the FR-018 test deletion) is this plan's answer to "how is deploy-atomic User
Story 2 internally sequenced" without hard-coding a final file list (Settled decision 7 forbids
that) — the actual per-file disposition is US1's fresh triage-table output, produced at pickup time.
The merge of the former Groups A/C/D into Commit 1 is a hard requirement (see "Why Commit 1 cannot
be split" in Summary), not an artifact of this grouping scheme.

## Research & Design Decisions (Phase 0)

- **D1 — Migration numbering re-verification, not a fixed number.** `061_correct_cols.sql` and
  `061_security_lints.sql` already collide on disk (verified: both files exist, `ls
  connect-four/server/migrations | sort -V | tail -20`), and the latest file present as of this
  writing is `063_puzzle_attempts_outcome_narrow.sql`. Per Settled decision 4 and FR-021, the drop
  migration's number is **not** reserved by this plan (it would be stale the moment another branch
  lands a migration first) — `tasks.md` must include a task that re-runs `ls
  connect-four/server/migrations | sort -V | tail -5` (or equivalent) immediately before authoring
  the drop migration file, and uses whatever the actual next integer is at that moment.
- **D2 — Suppression-list location and shape (REVISED per blocking issues 2 and 3).** FR-011
  requires "one shared, explicitly-named list" that is NOT `SINGLE_ANSWER_CATEGORIES`, consumed at
  **five** sites, re-derived from a fresh `/usr/bin/grep -n "correct_col" server/index.js` rather
  than from the spec's original four-site prose:
  1. `server/index.js`'s puzzle-detail HTTP response (line 2550) — the ONLY `server/index.js`
     **response** site; suppression applies here.
  2. `CurationWorkspace.jsx`'s board hint marker.
  3. `PuzzlePickerModal.jsx`'s column label.
  4. `PuzzlePickerRow.jsx` — inherits suppression via its data source (`lesson.
     confirmationChallenges` entries), so it needs no suppression check of its own, but it IS a real
     display surface for the suppressed behavior and an explicit FR-016 DOM-test target (D6).
  5. `AdminLessonEditorScreen.jsx:216`'s puzzle→lesson adapter — the FIFTH site, and the one that
     actually implements the check site #4 depends on: this adapter feeds `PuzzlePickerRow.jsx`,
     which has no suppression-check opportunity of its own, so the adapter must write `null` for
     suppressed categories instead of `correct_cols[0]` (see D6, revised, and the
     `AdminLessonEditorScreen.jsx` Source Code entry). (Tasks_critique note: an earlier draft of this
     list numbered only four items while calling the last one "a fifth," a labelling drift against
     `tasks.md`'s own T020, which correctly calls `AdminLessonEditorScreen.jsx` "the FIFTH suppression
     site" counting `PuzzlePickerRow.jsx` as the fourth. This enumeration now matches that count
     exactly — the substance was always right, only the numbering was inconsistent.)

  **Explicit exemption (blocking issue 3):** `server/index.js:2602` also reads
  `correct_col ?? null` today, but it is the internal predicate-builder input for
  `/api/puzzles/:id/check` — the accepted-answer set the grading evaluator reads, not a response or
  display field. It MUST migrate to the array form but MUST NOT apply the suppression check:
  suppressing there would empty the accepted-answer set and grade every correct undercut/overcut
  answer as wrong. FR-011's original wording ("both `server/index.js` API response sites") could not
  be satisfied as written because one of those two lines is not a response site at all; spec.md has
  been reworded to name this exemption explicitly rather than leave the contradiction. The two raw
  snake_case endpoints `/api/puzzles/draw` and `/api/admin/puzzles` (which feed
  `PuzzlePickerModal.jsx`) are **not** suppression sites either and must not suppress server-side,
  for the same reason as :2602 — their consumers use the value for grading as well as display;
  suppression happens only at the display sites that read their output.

  This codebase's existing, load-bearing convention for a category-membership constant needed on
  both sides of the wire is **duplicate-and-sync, never cross-imported**
  (`server/categories.js`'s own header comment: "Mirrored (duplicate-and-sync, NOT cross-imported) in
  src/lib/categories.js per research.md R3 — keep both literals identical by hand", verified verbatim
  on `MULTI_SOLUTION_CATEGORIES` and `SINGLE_ANSWER_CATEGORIES`). This plan follows that same
  convention rather than inventing a new cross-runtime import mechanism: add
  `SUPPRESSED_SINGLE_COLUMN_CATEGORIES = new Set(['undercut', 'overcut'])` to **both**
  `server/categories.js` and `src/lib/categories.js`, with a comment citing FR-010/FR-011 and
  explicitly noting it is disjoint in *purpose* from (though a subset in *membership* of)
  `SINGLE_ANSWER_CATEGORIES`. All non-exempt sites import this one constant from their runtime's
  copy — not five independent `category === 'undercut' || category === 'overcut'` checks.
- **D3 — Curation query-string contract for a set (REVISED — absent/empty/malformed handling
  added per Decision A).** `server/index.js`'s `/api/admin/scores` endpoint (verified lines
  3300-3341) reads a single-valued `req.query.correct_col` (`parseInt(..., 10)`) and passes it as
  `buildPredicatePuzzle`'s scalar `correctCol` param; `CurationWorkspace.jsx:158` builds this query
  string from `candidate.correct_col`. A bare query string has no native array convention in this
  codebase yet for this endpoint (verified: every one of ~30 `req.query.*` reads in
  `server/index.js` is scalar). This plan specifies a **comma-separated integer list**
  (`&correct_cols=1,3`), parsed server-side and validated as follows — spelled out explicitly so
  `tasks.md` does not invent an inconsistent format or silently regress the absent-parameter case:
  - **Absent** (`req.query.correct_cols === undefined`): the param MUST remain a legitimate `null`,
    exactly as today's absent `correct_col` behaves. Do NOT let `''.split(',')` run in this branch.
  - **Present and non-empty** (`req.query.correct_cols === '1,3'`): parse via
    `req.query.correct_cols.split(',').map(s => parseInt(s, 10))`, then validate every element with
    the existing `isValidCol0` (same per-element validation the scalar path uses today); any
    non-numeric or out-of-range element MUST 400, matching the existing scalar error shape/message
    convention.
  - **Present but empty** (`req.query.correct_cols === ''`): treat identically to absent (`null`) —
    do NOT let this fall through to `''.split(',').map(Number)`, which naively yields `[NaN]` and
    would incorrectly 400 where an absent parameter is valid today.
  The parsed array is passed as `buildPredicatePuzzle`'s `correctCols` array param (already
  accepted — `predicates.js:86`'s fallback expression already reads `puzzle.correctCols`).
- **D4 — Puzzle↔lesson boundary, thin one-directional adapters (Settled decision 11), confirmed
  at both concrete sites, REVISED for suppression-awareness per blocking issue 2.**
  `AdminLessonEditorScreen.jsx:216` (`correctCol: puzzleData.correct_col`) is the puzzle→lesson
  direction: becomes `correctCol: puzzleData.category is in SUPPRESSED_SINGLE_COLUMN_CATEGORIES ?
  null : puzzleData.correct_cols[0]` — the adapter reads the array's first element (or `null` for a
  suppressed category, matching today's behavior exactly) but writes the SAME lesson-JSON field
  name, because the destination shape (lesson content) is untouched (FR-013, Settled decision 3).
  Without the category check, this adapter would persist a meaningless `0` into authored lesson JSON
  for undercut/overcut — the exact first-element fallback Settled decision 9 and FR-010/FR-011 exist
  to prevent. `ChallengeScreen.jsx:185-186` (`correct_col: ch.correctCol`) is the lesson→puzzle
  direction inside a synthetic puzzle-shaped object built from a lesson node for grading: becomes
  `correct_cols: [ch.correctCol]` — wraps the lesson scalar as a one-element array; `ch.correctCol`
  itself (the lesson-JSON read) is untouched. This lesson→puzzle direction needs no suppression
  check of its own — it is grading, analogous to the `:2602` exemption, not display.
- **D5 — Fresh raw grep, US1's actual starting material.** Run 2026-08-03 in this worktree:
  `/usr/bin/grep -rln "correct_col\b" server src scripts tests` → 33 files (listed in the Source
  Code tree above, Commit 1/2/4 entries plus historical migrations). `/usr/bin/grep -rln
  "correctCol\b" server src scripts tests` → 49 files — a strict superset that additionally includes
  every lesson-JSON (sense 2: `lessonLoader.js`, `verify_lesson_content.mjs`, `SocraticScreen.jsx`,
  `SocraticEditor.jsx`, lesson test fixtures/tests) and computed-result-shape (sense 3:
  `predicates.js`'s own evaluators, `classifier.js`, `shapeDescriptor.js`) file. **US1's actual task
  is to re-run both greps at pickup time** (this worktree will have moved on) **and produce the
  per-file, per-call-site triage table** — this plan's Source Code tree is a best-effort starting
  hypothesis verified against today's worktree, not a substitute for that re-derivation (FR-001,
  Settled decision 7). **This plan's own file map is demonstrably incomplete, not just stale**: a
  tasks_critique pass on this same date ran the same grep independently and found four sites this
  map never listed at all — `server/scripts/t018_single_answer_search.mjs` (a live consumer of the
  candidate-generator's result field), `server/evaluateMoveHandler.js:154` (a `.select()` string in a
  file this map does cover, just not this line), and two non-code mentions
  (`server/kb/README.md:7`, `server/scripts/repair-overcut-highlight-metadata.js:13`). All four are
  now reflected in the Source Code tree above. Treat this as the standing lesson, not a one-time fix:
  the fresh triage table (T005 in tasks.md) is the actual contract per Settled decision 7 — this map
  is a hypothesis to reconcile against it, never a substitute for re-deriving it.
- **D6 — `PuzzlePickerRow.jsx` reads a value the adapter must now suppress; the file itself needs
  no code change but is IN scope (REVISED per blocking issue 2 — this corrects the plan's original
  "out of scope" conclusion, which was a real defect, not a documentation nitpick).** Traced the
  data flow end-to-end: `AdminLessonEditorScreen.jsx:326` renders `PuzzlePickerRow` from
  `lesson.confirmationChallenges` array entries; those entries are populated via the handler at
  `AdminLessonEditorScreen.jsx:216`, which is exactly D4's puzzle→lesson adapter — by the time an
  entry reaches `PuzzlePickerRow.jsx:40`'s `puzzle.correctCol` read, it has already been converted to
  a lesson-shaped scalar. The data-flow tracing was correct; the ORIGINAL CONCLUSION drawn from it
  was not: dispositioning `PuzzlePickerRow.jsx` "out of scope" and changing the adapter to a bare
  `puzzleData.correct_cols[0]` (with no category check) would make the row render "col 0" and
  persist a meaningless `0` into authored lesson JSON for undercut/overcut, where today it renders
  "col " (nothing) and persists `null` — the exact first-element fallback Settled decision 9 and
  FR-010/FR-011 exist to forbid. Revised disposition: `PuzzlePickerRow.jsx` itself needs **no source
  edit** (D4's adapter fix is sufficient to preserve its behavior), but it is now (a) a FIFTH
  suppression site in substance, via the adapter, and (b) an explicit FR-016 DOM-test target — not
  "lesson-JSON-adjacent, out of scope" as originally concluded.
- **D7 — `undercut`/`overcut` verification needs real local puzzles (FR-014/015).** No repo fixture
  or memory entry proves an `undercut`/`overcut` puzzle currently exists in the local database; per
  memory `feedback_generate_puzzles_for_local_qa`, generation + promotion is locally reachable and
  must actually be run (never skipped for "no such puzzle exists locally"). `tasks.md` must include
  an explicit generate-and-promote task before the FR-015 manual pass and the FR-016 DOM test can be
  written against real data.

## Task Sequencing Notes (mandatory for tasks.md)

1. **User Story 1 first, in full, before any US2 code changes.** Its output (the triage table) is
   the literal task list for US2 — `tasks.md` cannot enumerate US2's tasks correctly without it.
   US1 also gates on confirming spec 051's backfill has actually populated `correct_cols` on the
   target DB (FR-005) — this is a blocking check, not a formality.
2. **US1's own first recorded output is the test baseline** (FR-006) — already measured in this
   plan's Technical Context (1685/5, 2026-08-03); `tasks.md`'s first US1 task should record this
   (or re-measure it fresh if time has passed since this plan was written — do not silently copy a
   stale number).
3. **US2 proceeds through four commits, in this order — Commit 1 is internally staged
   server-core → wire-contract → frontend but MUST be a single commit, not three (see "Why Commit 1
   cannot be split" in Summary; this is the largest change from plan review and supersedes the
   earlier six-group split entirely — there is no longer a Group A/C/D boundary to land separately)**:
   - **Commit 1 — server core + wire contract + frontend, MERGED (`predicates.js`,
     `answerSetInvariant.js`, `evaluateMoveHandler.js`, `server/index.js`, `ChallengeScreen.jsx`,
     `AdminLessonEditorScreen.jsx`, `CurationWorkspace.jsx`, `PuzzlePickerModal.jsx`,
     `src/lib/categories.js`, `src/lib/devFixtures.js`, plus `tests/integration/
     evaluateMoveMultiSolution.test.js` and any other test covering these files, per FR-017).**
     Internally, work through server core first (every other server file either calls into
     `buildPredicatePuzzle`/`evaluatePredicate` or is graded by them), then the wire contract (retires
     the HTTP field), then frontend (includes the D2 suppression-check implementation at
     `CurationWorkspace.jsx`/`PuzzlePickerModal.jsx`/the `AdminLessonEditorScreen.jsx` adapter, and the
     D4 adapters) — but stage/commit them together. Never merge a commit to a deploy-reachable branch
     that lands only part of this set.
   - **Commit 2 — sync-writers** (`candidate-generator.js`, `backfill-correct-cols.mjs`,
     `promotePuzzleRow.js`) — once Commit 1 no longer needs the scalar as an input, the writers can
     stop producing it without anything downstream breaking. May land separately from Commit 1.
   - **Commit 3 — non-test scripts** — lower risk, can land after Commit 1/2 since nothing in them
     depends on scripts. May land separately.
   - **Commit 4 — the FR-018 test deletion** (`checkPredicateSortAndScalarSync.test.js`, plus its
     package.json array removal) — its own explicit commit, since it has no production-file
     counterpart to piggyback on. Every OTHER test file moves with its production file's commit
     (mostly Commit 1), per FR-017 — this is not a general "tests" commit.
4. **FR-014's real undercut/overcut puzzle generation+promotion must happen before FR-015's manual
   pass and FR-016's DOM test are written** (Research D7) — sequence this as an early US2 task, not
   deferred to the end, so the manual pass and DOM test have real fixtures to target throughout the
   story rather than only at the very end.
5. **`npm run test:fast` runs after every atomic commit within US2, not only at story end** (FR-025)
   — a new failure beyond the 5-test baseline blocks the next commit until fixed. `tasks.md` should
   make this an explicit sub-task of every commit's task, not a single trailing verification task.
6. **User Story 3 (the drop) does not start until every US2 commit is confirmed migrated and a fresh
   FR-020 two-part zero-reference check passes**: (a) mechanical —
   `/usr/bin/grep -rn "correct_col\b" server src scripts tests` returns matches in exactly three
   files (`016_correct_col.sql`, `061_correct_cols.sql`, the new drop migration); (b)
   human-adjudicated — every remaining `correctCol` occurrence maps to a triage-table row
   dispositioned lesson-JSON or computed-result-shape, with `server/predicates.js`'s legacy fallback
   expression (Commit 1, now removed) explicitly confirmed gone rather than merely assumed.
7. **Migration number re-verified immediately before US3's migration-writing task** (Research D1) —
   this must be its own task, not folded into "write the migration," so `tasks.md` cannot silently
   hard-code a number that goes stale.
8. **Documentation + OI-81 closeout are US3's last tasks**, in the same change that ships the drop
   migration (FR-023/FR-024) — not a follow-up commit. **Added by tasks_critique:** the
   `docs/deployment_steps.md` entry and the `specs/index.md` registry row are also US3 tasks, written
   by the implementing agent but never executed against a remote database (Decision B) — the drop
   migration itself is applied locally only; the deploy-steps entry is what the owner runs elsewhere.
9. **Every new/changed/deleted test file is added to or removed from BOTH `test` and `test:fast` in
   `connect-four/package.json:16-17`** in the SAME task/commit that creates/changes/deletes it — per
   the "stale registration fails nothing" trap (`testing-conventions.md`), reused verbatim from the
   spec 051 plan's identical rule.

**Estimated task count**: ~5 (US1: re-grep, triage table, backfill-completion check, baseline
measurement, story-ready gate) + ~28 (US2: 4 commits — Commit 1 is the largest, covering what was
three groups plus `shapeDescriptor.js`/`classifier.js` moved in by tasks_critique, so its task count
is proportionally larger than the other three — including the D2 suppression list (five sites plus
one exemption), D3 query-string contract (with the absent/empty/malformed handling), D7 puzzle
generation, FR-015 manual pass, FR-016 DOM test (now covering `PuzzlePickerModal.jsx`,
`PuzzlePickerRow.jsx`, and `CurationWorkspace.jsx`), Commit 2's added `t018_single_answer_search.mjs`
migration, and per-commit `test:fast` sub-tasks) + ~9 (US3: zero-reference check, migration-number
re-check, write + apply migration locally, update 3 architecture docs, close OI-81, the
`deployment_steps.md` entry, the `specs/index.md` row, final SC gate) ≈ **~42 tasks** (actual
`tasks.md` as revised by tasks_critique: 58, including the doc-read/setup task and every per-commit
gate — still inside the 15-60/epic sizing rule). Merging what were three groups into Commit 1 does
not change the total task count materially — it
changes commit boundaries, not the number of file-level edits `tasks.md` must enumerate.

## Complexity Tracking

*No violations — table intentionally empty.*
