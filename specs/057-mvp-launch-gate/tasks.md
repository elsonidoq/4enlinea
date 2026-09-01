---

description: "Task list for Feature 057 — MVP Launch Gate"
---

# Tasks: MVP Launch Gate

**Input**: Design documents from `specs/057-mvp-launch-gate/` (`spec.md`, `plan.md`, `research.md`,
`data-model.md`, `quickstart.md`)
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md` (all present)
**Handoff**: `.claude/epics-workflow/pre-launch-mvp-epic--1.handoff.md` — binding directives folded in
below; do not re-open anything under its "Owner decisions already settled" section.
**Answers**: `.claude/epics-workflow/pre-launch-mvp-epic--1.tasks-answers.md` — B1/B2/B3 and D1/D-b are
folded in below (see "Renumbering note").

**Tests**: Requested by the spec itself — FR-006, FR-009, FR-020 all require regression tests against
real fixtures. Test tasks are included per story.

**Paths**: everything under `connect-four/` except `docs/`, `specs/`, `staging_checks.md`,
`visualize_board.sh`, `worktree-ports.sh` (repo root, per `CLAUDE.md`).

## Renumbering note

This file was renumbered after the owner's B1/B2/B3/D1/D-b answers. **D1 is now CLOSED (retire and
refill)** — the old `T008` (`[GATED:D1]` repair-in-place script) is **deleted entirely**, not
skip-marked; its duty (retiring stale `overcut`/`undercut`/`z_threat` rows) is absorbed into
`fill-candidate-pools.mjs` (T009 below), which this feature already builds. Three tasks were added:
**T005** (US1, the B1 grader fix — required for T004's regression test to ever pass), **T015** (US1, a
`staging_checks.md` sign-off item for Decision D-b), and **T042** (US3, the B2 doc-correction task).
Net: 53 → 55 tasks, IDs T001–T055, contiguous, no gaps and no stale cross-references — every task below
was renumbered and every internal reference (Dependencies section, "Gated tasks" list, Implementation
Strategy) updated to match.

**Amendment 2026-08-04 — FR-019a scope correction + source-verification pass.** `T035` was found to be
**under-scoped**: it covered two producers of the `'blunder'`/`'suboptimal'` label; a source grep found
six. `T035`/`T036`/`T037` were widened, and its structural-test requirement was **retracted and rewritten**
(the old wording keyed on "maps a `(bestScore, playedScore)` pair", which none of the newly-found
producers do, so the test would have passed with four criteria still in the tree). Per the owner's scope
ruling ("game moves only — but name the boundary"), **two tasks were appended: `T056`** (document
`ChallengeScreen`'s puzzle-answer grading as a deliberately separate domain) **and `T057`** (record the
spec-049 accepted-gate display override as a new `OI-N`, not a fix). **Both belong to the US4 /
`T032–T038` implementation batch.** Net: 55 → **57 tasks, IDs T001–T057** — appended, not renumbered
(the note above shows why renumbering is expensive, and several sections cross-reference IDs).

The same pass re-verified every task that names a specific file set, call-site count, or line number
against source. Corrections are folded into the task bodies under a bold **"Verified at source
2026-08-04"** heading, which also names each claim that turned out to be **wrong** and what it actually
says. Tasks touched: **T005, T017, T026, T028, T032, T035, T036, T037, T040, T041, T043, T044, T045,
T046**. Treat every line number in this file as approximate and locate by symbol name (`CLAUDE.md`
§"Writing implementation plans").

## Owner directive reminder (binding across every task below)

Staging and production databases are **disposable** pre-launch (`CLAUDE.md` §"Staging and production
databases are disposable"). No task in this file writes to staging or production — every live-data
action is a **documentation entry** (`docs/deployment_steps.md`) or an **owner-run script** the owner
executes personally. Prefer regenerate-from-scratch over surgical repair wherever both are on the
table. Detector/guard/grading correctness itself is not weakened by this — only the live-data
choreography collapses.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US5, mapped to spec.md's priorities (P1=US1, P2=US5, P3=US2, P4=US4, P5=US3 — the
  epic's recommended execution order, not the spec's story numbering order)
- **[GATED:D3]/[GATED:D4]**: implementation cannot start until the owner resolves that design decision
  (see `research.md` §Unresolved Design Decisions). The gate covers *implementation only* — read-only
  audits, trace tasks, and doc-sync tasks that inform the decision are NOT gated and run now. **D1 is
  RESOLVED (retire and refill, 2026-08-03) — no longer a gate; D2 is resolved (no gate).** D4 is
  exempted from the *pre-tasks* gate per the handoff: its trace task and OI-125's invariant guard are
  generated ungated below; only FR-019/FR-020's implementation is gated.

---

## Phase 1: Setup

**Purpose**: Confirm the environment every later measurement task depends on. No code changes.

- [x] T001 Run `eval "$(./worktree-ports.sh)"` from repo root and confirm `connect-four/server/.env`,
  `.env.staging`, `.env.production` are all present and readable (per
  `docs/architecture/worktree-conventions.md` and memory `reference_supabase_connection.md` — parse
  `.env` manually, `dotenv` is not reliably available in `node -e`, `cd connect-four` first).
- [x] T002 [P] Re-run `grep -rn "reason_evidence_boards_coverage_2026-07-0[23]" connect-four/server/tests/*.test.mjs`
  to confirm the exact set of files with the stale fixture-path literal is still the 5 named in
  `research.md` §"Re-measured baseline" (not 6, per the file's own "Verification note for tasks.md" —
  a concurrent session may have added a 6th file using the same broken pattern since that measurement).
- [x] T003 [P] Re-run `npm run test:fast` (from `connect-four/`) once, and record the current pass/fail
  count as this session's baseline before any story below changes code — compare against `research.md`'s
  "1677 tests, 1672 pass, 5 fail" and flag any drift in the US5 task that consumes it (T018).

---

## Phase 2: Foundational

*(None required — the five stories are independent per spec.md, and Phase 1's re-measurements are the
only shared prerequisite. Each story re-measures its own domain-specific counts at its own start, per
Settled Decision 7 / the "measurements expire" edge case.)*

---

## Phase 3: User Story 1 - Live puzzle answers grade correctly, and every served category has a pool (Priority: P1) 🎯

**Goal**: Every servable category has ≥20 active puzzles on staging and production; stale
`overcut`/`undercut`/`z_threat` rows are retired and their categories refilled; a correct answer is
never graded wrong because of stale stored metadata, regardless of whether the retire-and-refill has
run yet on any given row.

**Independent Test**: query staging/production `puzzles`/`candidates` active counts per category (all
≥20 or not served); re-derive `highlight_metadata` for every live `overcut`/`undercut`/`z_threat` row and
confirm match-or-retired; submit the mathematically correct column against a puzzle carrying stale
`highlight_metadata` and confirm it grades correct.

### Tests for User Story 1

- [x] T004 [P] [US1] Write a regression test in `connect-four/server/tests/` (new or extended file,
  colocated with existing `predicates`/`classifier` test placement per
  `docs/architecture/testing-conventions.md` §Test Suite Layout) asserting that a puzzle row with a
  deliberately stale `highlight_metadata` (constructed from a real board + the *pre-widening* metadata
  shape) is graded correct when the player submits the mathematically correct column — i.e. the grader
  must not silently trust stale stored evidence. This test MUST fail against current `evalOvercut`
  before T005's fix lands (FR-006, OI-92). **No data repair (T009) can make this test pass** — only a
  grader change can, since the test's whole point is that the row's stored metadata is never
  repaired/retired in this scenario.

### Implementation for User Story 1

- [x] T005 [US1] **(B1 — required for T004 to pass.)** Change `evalOvercut` (`connect-four/server/predicates.js:364-372`),
  `evalUndercut` (`:348-356`), and `evalZThreat` (`:308-314`) to cross-check the solver-gated
  `puzzle.correctCols` array before returning a `'wrong'` verdict derived only from
  `puzzle.highlightMetadata`, following the pattern already in `evalFigure7` (`:383-392`) and
  `evalJShape` (`:396-406`).
  **Verified at source 2026-08-04 — these three ARE the complete set of metadata-graded evaluators.**
  `/usr/bin/grep -n "highlightMetadata" connect-four/server/predicates.js` returns exactly six lines:
  `:69`, `:75`, `:85` (doc/plumbing in `buildPredicatePuzzle`) and **`:309` (`evalZThreat`), `:349`
  (`evalUndercut`), `:365` (`evalOvercut`)** — no fourth evaluator reads stored metadata. The others are
  either live-recomputed (`evalImmediateThreat:115`, `evalForcedBlock:151`, `evalDoubleThreat:200`,
  `evalForcedWin:238` — which rebuilds the board via `new Board(puzzle.moveString)`,
  `evalForbiddenColumns:281`, `evalOddEvenThreat:413` — which re-runs `detectOddEvenThreat`) or already
  read the solver-gated `correctCols` array directly (`evalClaimeven:328`, `evalFigure7:383`,
  `evalJShape:396`). Verbatim current state of the three targets: `evalOvercut` reads only
  `  const cells = puzzle.highlightMetadata?.cells;` (`:365`) and never touches `correctCols`;
  `evalUndercut` reads the same at `:349` plus live `scores` for the solver-safety floor (`:354`,
  verbatim `  if (Array.isArray(scores) && scores.length === COLS && !isSolverSafe(candidateCol, scores)) {`)
  and also never touches `correctCols`; `evalZThreat` reads only
  `  const correctCol = puzzle.highlightMetadata?.column;` (`:309`).
  **Correction to the "copy `evalFigure7`" instruction:** `evalFigure7` uses `correctCols` as its
  **SOLE** source and returns `'wrong'` when it is empty (`:384-385`, verbatim
  `  const correctCols = puzzle.correctCols ?? [];` / `  if (correctCols.length === 0) return { result: 'wrong' };`).
  Do **not** copy that shape wholesale — for these three, the `correctCols` check is an **additional
  acceptance path layered on top of** the existing metadata logic, and an absent/empty `correctCols` MUST
  fall through to the current metadata behavior rather than short-circuit to `'wrong'`. Concretely: if `puzzle.correctCols` is present and non-empty and
  contains `candidateCol`, the evaluator MUST return `{ result: 'correct', correctCol: candidateCol }`
  even when the `highlightMetadata`-derived computation would otherwise reject it — this is what makes a
  mathematically correct answer immune to stale stored evidence whether or not T009's retire-and-refill
  has run on that specific row. Do not weaken `evalUndercut`'s live solver-safety check in the process —
  the cross-check is an additional acceptance path, not a replacement for the existing rejection logic.
  (FR-006, OI-92, closes the B1 blocking issue)
- [x] T006 [US1] Re-measure active-puzzle counts per category on local, staging, and production RIGHT
  NOW (the `research.md` numbers are dated the moment this task runs — Settled Decision 7). Use the
  read-only query shape in `research.md` §"Pool counts per environment" via `node -e` per memory
  `reference_supabase_connection.md`. Record the fresh counts (and any drift from `research.md`) in
  `specs/057-mvp-launch-gate/research.md` under a new dated subsection — do not silently overwrite the
  prior dated numbers. (FR-001, OI-86)
- [x] T007 [US1] Fix `connect-four/scripts/verify-undercut-puzzles.mjs`'s `.eq('approved', true)` filter
  (`puzzles` has no `approved` column, only `is_active boolean`) to filter on `is_active` instead.
  Verify locally: `node scripts/verify-undercut-puzzles.mjs` must return the 25 known active local
  undercut rows, not zero. (FR-002, OI-130)
- [x] T008 [US1] Read-only audit (no writes): re-derive `highlight_metadata` for every live `overcut`,
  `undercut`, and `z_threat` row on staging and production against the current detectors
  (`evalOvercut`/`evalUndercut`/`evalZThreat` in `server/predicates.js`, as changed by T005), reusing
  `repair-overcut-highlight-metadata.js`'s dry-run/diff logic as the pattern (it already implements this
  for `overcut`; extend the read-only diff to `undercut`/`z_threat`, accounting for the shape
  differences noted in `data-model.md` — `z_threat` reads `.column`, `undercut`/`overcut` read
  `.cells[].role` with different role names, and `evalUndercut` additionally consults live solver
  `scores`). Record counts of match / stale / to-retire per category per environment — this is the input
  to T009's retire-and-refill pass. This task is read-only. (FR-005, OI-92, Decision 2 in spec.md
  widening the audit to all three metadata-graded categories)
- [x] T009 [US1] Author `connect-four/server/scripts/fill-candidate-pools.mjs` — the one new script this
  feature adds (does not exist yet). Required shape, mirroring
  `repair-overcut-highlight-metadata.js` exactly: Supabase **service-role** client; `--dry-run` is the
  DEFAULT posture (must pass `--apply` to write); a **required** `--env` flag with no default
  (`local`/`staging`/`production`); a guard that the target env's `.env` file's Supabase project ref
  matches the named environment (reuse `STAGING_REF`/`PRODUCTION_REF` constants from the existing
  script); a typed confirmation (`Yes`, exact) before any write, required **twice** for production (an
  `--i-understand-this-is-production` flag plus the typed prompt, per the existing script's pattern);
  a real `--help`/`-h` that prints usage and exits 0 **before** required-arg validation runs; a distinct
  exit code for "drift found" (mirror the existing script's `exit 2` for dry-run drift). Per (category,
  environment) below floor, it promotes queued `candidates` rows where they exist or inserts
  locally-generated rows otherwise — this is the ONLY way to reach staging/production for FR-003/FR-004,
  since `POST /api/admin/candidates/:id/approve`/`approve-batch` are `requireLocalhost`-gated
  (`server/adminAuth.js`) and `generate_all_candidates.mjs` needs the solver binary, absent on Railway.
  Per the owner directive, it may overwrite/replace a category's pool wholesale where that is simpler
  than merging with existing rows. **D1 is CLOSED (retire and refill, 2026-08-03) — this script is also
  D1's disposition mechanism**: rows T008's audit flags as stale in `overcut`/`undercut`/`z_threat` are
  retired (`is_active=false`) as part of that category's wholesale refill. No second repair script is
  written; `repair-overcut-highlight-metadata.js` is NOT extended to `undercut`/`z_threat`. Drift found
  by T008 that this script's wholesale-refill logic does not cover must be logged as a new `OI-N` per
  FR-005/FR-028, not silently absorbed. (FR-003, FR-004, FR-005, D1, the handoff's "single new script")
- [x] T010 [US1] Per FR-003/FR-004's per-(category, environment) split (not per-category-globally,
  per `research.md`'s explicit correction): for every category below the N=20 floor on **local**
  (agent-run is fine — `requireLocalhost` admin endpoints are reachable), promote existing queued
  candidates via `POST /api/admin/candidates/approve-batch` where `correct_cols` is already populated,
  or generate fresh via `node server/scripts/generate_all_candidates.mjs --category <cat> --count N`
  where the environment's pending-candidate count is insufficient (re-check T006's fresh counts, not
  the epic's dated ones) — watch the 120 req/min rate limiter on bulk promotion loops (plain-text 429,
  opaque as a JSON decode error). Re-verify the floor immediately before considering a category cleared,
  per spec.md's Edge Cases ("every measurement expires"). `forced_win` specifically needs fresh
  generation, not promotion (OI-83 — its only puzzle was retired as AMBIGUOUS). (FR-003, FR-004, OI-83)
- [x] T011 [US1] Dry-run `fill-candidate-pools.mjs --env staging` and `--env production` (dry-run only —
  no `--apply`, no agent write to live environments) to produce the exact per-category-per-environment
  remedy report (generate vs promote vs retire-and-refill), using T006's freshly re-measured counts and
  T008's audit output as the source of truth, not `research.md`'s dated snapshot. This report is the
  input to T014's `deployment_steps.md` entry. (FR-003, FR-004)
- [x] T012 [US1] Add `docs/architecture/db-schema.md` documentation for the `puzzles`/`candidates`
  sections stating: (a) `is_active` is the real serving gate, not `approved` (which never existed —
  OI-130's root cause); (b) D1's resolved disposition policy — stale `overcut`/`undercut`/`z_threat` rows
  are retired (`is_active=false`) and the category refilled by `fill-candidate-pools.mjs`, never repaired
  in place — as the named policy for future detector changes. (Plan's Documentation-as-First-Class-Deliverable
  checklist item, D1's resolved `tasks.md` requirement)
- [x] T013 [US1] `docs/deployment_steps.md` — add the collapsed, one-line-remedy entry for D1's retire-and-refill
  disposition (`overcut`/`undercut`/`z_threat`), following the "Spec 052 — overcut pool repair" entry's
  template verbatim but collapsed per the owner directive: data on staging/production is disposable, so
  the remedy is simply "retire the stale rows and refill via `fill-candidate-pools.mjs --apply`," not a
  multi-phase repair. This entry MUST still carry all six of `docs/deployment_steps.md`'s mandated
  template fields (Status / When / Blocks / Applies to / What's wrong / **Run it** / **Verify — command
  AND success condition** / **Roll back, or an explicit "not reversible"**) even though the body is
  short. (FR-005, FR-007, Deploy Prerequisites item 2)
- [x] T014 [US1] `docs/deployment_steps.md` — add the content-pools entry naming, per category per
  environment (from T011's dry-run report), whether the remedy is promote, generate, or retire-and-refill,
  and pointing at `fill-candidate-pools.mjs --env <env> --apply` as the owner-run command, run **after**
  the corresponding code deploy (re-deriving against the current detector requires the current detector
  to be live — same ordering logic as the existing Spec 052 entry). This entry MUST carry all six of the
  file's mandated template fields explicitly (Status / When / Blocks / Applies to / What's wrong / **Run
  it** / **Verify — command AND success condition** / **Roll back, or an explicit "not reversible"**).
  (FR-003, FR-004, Deploy Prerequisites item 3)
- [x] T015 [US1] **(Decision D-b — pool fill is a named launch gate.)** Add a `staging_checks.md` (repo
  root, NOT under `docs/`) sign-off item recording: the owner's `fill-candidate-pools.mjs --apply` run
  against staging AND production (referencing T014's remedy report), and the post-fill per-category
  active-puzzle counts for both environments, re-queried after the owner's run — not the pre-fill counts
  from T006/T011. Without this, the epic could close with a "launch-ready" statement while a category is
  still below floor on a live environment; SC-001's wording requires the counts to be measured directly
  against staging/production, not inferred from the mechanism shipping. This task only prepares the
  sign-off item — the agent does not and cannot run `--apply` against staging/production. (FR-003, FR-004, D-b)
- [x] T016 [US1] Close out OI-92, OI-86, OI-83, and OI-130 in `docs/open_issues.md`, in this same
  change, using the file's existing fully-fixed / partially-fixed / already-resolved /
  deliberately-not-fixed formats. OI-92 and OI-83 likely land as **partially-fixed** (code + read-only
  audit + owner-run script shipped; the actual staging/production retire-and-refill is owner-executed
  per T015, not agent-applied) — state that split explicitly rather than marking fully-fixed for
  work the owner still has to run. Any drift found in T008 that T009's wholesale refill doesn't cover
  gets a **new** `OI-N`, not folded into these four. (FR-027, FR-028)

**Checkpoint**: US1 is independently testable per `quickstart.md` §US1 — pool counts on record, audit
complete/retired-or-owner-queued, `verify-undercut-puzzles.mjs` returns real rows, T004's regression test
passes against T005's grader fix.

---

## Phase 4: User Story 5 - The release gate is trustworthy and the deploy prerequisites are settled (Priority: P2)

**Goal**: `npm run test:fast` is green (or every failure is enumerated/justified); OI-5/OI-31/OI-105 are
each closed by measurement.

**Independent Test**: run `npm run test:fast` from a clean checkout, diff the failure list against the
enumerated baseline.

### Implementation for User Story 5

- [x] T017 [US5] Fix the 5 stale fixture-path literals identified in T002 (add the missing `fv_suff/`
  directory segment). **Verified at source 2026-08-04 — file list, line numbers, variable names, and the
  on-disk existence of the repointed corpora all CONFIRMED.**
  `/usr/bin/grep -rn "reason_evidence_boards_coverage_2026-07-0" connect-four/server/tests/` returns
  exactly these 5, with these exact lines:
  - `connect-four/server/tests/branchInvariance.test.mjs:12` — `const CORPUS = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');`
  - `connect-four/server/tests/causalLinksComposers.test.mjs:11` — same literal, same `CORPUS` name
  - `connect-four/server/tests/reasonRenderFixes.test.mjs:10` — same literal, same `CORPUS` name
  - `connect-four/server/tests/renderCoverageCorpus.test.mjs:10` — same literal, same `CORPUS` name
  - `connect-four/server/tests/renderCoverageUniverse.test.mjs:14` — `const EVIDENCE_FILE = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-03T17-14-51Z.jsonl');`
    (`EVIDENCE_FILE`, not `CORPUS`, and a **different** timestamp — `07-03T17-14-51Z` — but the same
    missing segment.)
  The fix is **only** the `fv_suff/` segment — the `reason_evidence_` basename prefix is CORRECT and must
  be kept. Both repointed targets exist on disk (verified with `ls`):
  `connect-four/server/scripts/fv_suff/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl`
  (57081 bytes) and
  `connect-four/server/scripts/fv_suff/reason_evidence_boards_coverage_2026-07-03T17-14-51Z.jsonl`
  (63264 bytes). Beware the sibling `fv_suff/boards_coverage_*.jsonl` files, which have the same
  timestamps but **no `reason_evidence_` prefix and different content** — do not repoint to those.
  Fix all 5, not just the 2 the spec names as the FR-023 floor — identical root cause, identical one-line
  fix, no cost difference (`research.md`'s explicit decision). If T002 found a 6th file, fix that one too.
  (FR-022, FR-023, OI-82)
- [x] T018 [US5] Re-run `npm run test:fast` and confirm 0 failures (or, for any failure that remains and
  is NOT one of the 5 fixed above, add its own justified `OI-N` per FR-022's "zero, or each carries an
  OI-N" bar — do not silently accept new red). Confirm the two "test #1"/"test #2" files
  (`renderCoverageCorpus.test.mjs`, `renderCoverageUniverse.test.mjs`) actually execute their assertions
  against the real corpus and pass, not merely stop dying before their first assertion. **If
  T034's boundary-case test (US4 — the task ID here was previously mis-cited as T035, which is the *fix*,
  not the test) is still `skip`-marked when this task runs, its `skip` + accompanying `OI-N` counts as
  "justified," not as new red** — confirm that OI-N exists before treating the suite as clean; do not
  silently accept an un-annotated skip either. **Also confirm the file list itself is intact**: `test:fast`
  is a single space-separated list of ~180 files, so a file deleted from disk but left in the list (see
  T035 item 5, `tests/unit/reviewChipQuality.test.js`) makes `node --test` error out and run **zero**
  tests — check the reported test count against T003's baseline, not just the exit code. (FR-022, FR-023)
- [x] T019 [US5] Reconcile the migration ledger against disk and against what's actually applied on
  staging and production. Read-only: `ls connect-four/server/migrations/` plus
  `psql "$DATABASE_URL" -c "SELECT filename FROM schema_migrations WHERE filename LIKE '06%' ORDER BY filename;"`
  against both `.env.staging`/`.env.production`. Confirm/re-measure `research.md`'s finding: both `061`
  files coexist without conflict (filename-keyed, not numeric-prefix-keyed — `server/migrate.js:22,28-29`);
  the real gap is a 4-migration backlog (`061_correct_cols.sql`, `062_candidates_generation_run_unique.sql`,
  `063_puzzle_attempts_outcome_narrow.sql`, `064_drop_correct_col.sql`) never applied to either
  environment. Correct the "061_security_lints.sql absent from disk" premise in the OI-105 closeout text
  — that claim is false (it's on disk, git-committed `1fbcd4f`). (FR-026, OI-105)
- [x] T020 [US5] Close OI-31 as a documentation-sync task: `docs/architecture/server-conventions.md:1501`
  already corrects the "6543 forbidden for DDL" framing (2026-08-02) with staging's `DATABASE_URL`
  confirmed on 6543 with 5 migrations already applied successfully through it. Measure which URL
  (5432 vs 6543) the live Railway deploy config actually names for `migrate.js` on staging (read
  `.env.staging`/Railway env, do not assume). Update `docs/open_issues.md`'s OI-31 entry to match the
  already-corrected architecture doc rather than repeating the stale "6543 forbidden" rationale.
  **Extended scope**: also correct the two passages in `docs/deployment_steps.md` that still assert port
  6543 "cannot run DDL" — Standing Checklist item 1 (~`:56-57`) and the Spec 054 entry's "§0 CAUTION"
  (~`:315`) — to match the same corrected framing; this is the exact rationale FR-025/T020 exists to
  retire, and leaving those two passages unfixed would still tell a future deploy agent to swap ports on
  the strength of a rule this feature disproves. (FR-025, OI-31)
- [x] T021 [US5] `docs/deployment_steps.md` — add/extend the schema-migration entry (Standing Checklist
  item 1) recording that the pre-existing, already-authored `061_correct_cols.sql`/`062`/`063`/`064`
  backlog is being cleared as part of this feature's close, cross-referencing (not restating)
  `064_drop_correct_col.sql`'s existing documented ordering constraint under "Spec 056 — Legacy
  `correct_col` scalar retirement" and `063`'s existing ordering under the Spec 054 entry. This entry MUST
  carry all six of the file's mandated template fields explicitly (Status / When / Blocks / Applies to /
  What's wrong / **Run it** / **Verify — command AND success condition** / **Roll back, or an explicit
  "not reversible"**). No new migration file is authored by this feature. (FR-029, Deploy Prerequisites
  item 1)
- [x] T022 [US5] Add a `staging_checks.md` (repo root, NOT under `docs/`) sign-off item for OI-5: the
  owner runs `cd connect-four && node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>`
  against a real account, and records the result. State both outcomes' consequence explicitly: "rotation
  detected" → build the de-dup Map (new follow-on `OI-N`); "no rotation" → close OI-5 outright. This task
  only prepares the sign-off item — the agent does not and cannot run the probe (needs real credentials).
  (FR-024, OI-5)
- [x] T023 [US5] Close out OI-82, OI-31, and OI-105 in `docs/open_issues.md` (fully-fixed, since T017-T021
  are agent-completable with no owner action pending). OI-5 stays **open**, recorded as
  "deliberately deferred — owner-gated, sign-off item added to `staging_checks.md`" per T022, not marked
  fixed until the owner runs the probe and reports back. (FR-027, FR-028)

**Checkpoint**: `npm run test:fast` is 0 RED (or the only red is T034's justified, OI-N'd skip); OI-31/OI-105
closed by measurement; OI-5's sign-off item exists in `staging_checks.md`.

---

## Phase 5: User Story 2 - No internal token or unhighlightable claim reaches player-facing prose (Priority: P3)

**Goal**: `stripInternalTokens` strips bare/ranged/paired coordinate forms in both locales; D3's
annotation-gate question is resolved or deliberately deferred; OI-129's failure rate is measured and
dispositioned; `explanation_cache` handling is documented.

**Independent Test**: feed the real OI-126 explanation string through the response-seam sanitizer,
assert no token form survives, in both locales.

### Tests for User Story 2

- [x] T024 [US2] Harvest the real served explanation string reproducing OI-126 for board
  `455c5272-3143-43d4-aa3f-c10f9d061666` — per `docs/open_issues.md`'s OI-126 repro steps — and check it
  into a test fixture. Do NOT invent a string containing `c3-c6`; it must be the real served text
  (`CLAUDE.md` §"Harvest fixtures; never invent them"). (FR-009)
- [x] T025 [P] [US2] Write a regression test in `connect-four/server/tests/reasonRenderGuard.test.mjs`
  (new, or extended if the file already exists) asserting `stripInternalTokens` strips bare (`c3`),
  ranged (`c3-c6`), and paired (`c3r4`) forms from T024's harvested string, in both `locale='en'` and
  `locale='es'`, and does NOT corrupt legitimate prose containing a lone "c" followed by a digit outside
  a coordinate context. This test MUST fail against the current `CXRY_RE` (`server/reasonRenderGuard.mjs:25`,
  `/\bc(\d+)r\d+\b/gi` — paired form only) before T026 lands. (FR-008, FR-009, OI-126)

### Implementation for User Story 2

- [x] T026 [US2] Widen `stripInternalTokens`/`CXRY_RE` in `connect-four/server/reasonRenderGuard.mjs` to
  also match bare (`c3`) and ranged (`c3-c6`) internal-coordinate forms, reusing the existing
  `columnWord(col)` mapping for the replacement text and adding a locale-aware connector for the ranged
  form. Confirm the regex still does not eat legitimate prose (e.g. "column 3" or a sentence ending in
  "c." followed by a digit in an unrelated context) — add a negative-case assertion to T025's test.
  **Verified at source 2026-08-04 — four corrections/additions to what this task previously assumed:**
  (a) **The `es` path for the existing `column` word EXISTS** — `server/locale.mjs:58`
  `    column: (n) => \`column ${n}\`,` and `:62` `    column: (n) => \`columna ${n}\`,`. But a **ranged
  connector is a NEW string**: `STRINGS` (`locale.mjs:55-64`) has only two keys, `notABlunder` and
  `column`. Add the connector to **both** the `en` and `es` tables in the same edit, and note `serverT`
  (`:73-76`) silently falls back to English on a missing key (`  return table[key] ?? STRINGS.en[key];`),
  so an `es`-only omission ships English with no error (memory `project_spanish_output_silent_fallback`).
  (b) **`guardExplainMovePayload` does NOT pass a locale** — `reasonRenderGuard.mjs:82` verbatim
  `    oneLiner: stripInternalTokens(oneLiner),` and `:85` `      ? { ...deepReveal, fullText:
  stripInternalTokens(deepReveal.fullText) }` — both take `stripInternalTokens`'s
  `locale = 'en'` default (`:41`). Its sibling `guardExplainMoveLlmPayload` **does** thread locale
  (`:102` `    explanation: stripInternalTokens(explanation, locale),`). So the `/api/explain-move`
  payload is **English-only today** and a locale-aware widening will not reach it. Either thread `locale`
  through `guardExplainMovePayload` (its call site `server/index.js:1263` has `locale` in scope) or state
  explicitly why it is left English-only. Context for that call: `/api/explain-move` is the legacy
  `composeExplanation` path (`server/index.js:1233`) with no frontend caller found — `docs/architecture/server-conventions.md`
  §"Which function actually serves production deep-reveal" (merged from `project_prod_llm_call_graph`)
  records it as dead. Do not silently skip it; record which.
  (c) **The "single seam" claim in spec.md §Key Entities is CONFIRMED for LLM explanation text** —
  `/usr/bin/grep -rn "guardExplainMovePayload\|guardExplainMoveLlmPayload" connect-four/server` finds the
  import at `server/index.js:52` and exactly **four** `res.json(...)` call sites: `:1263`
  (`guardExplainMovePayload`), and `:1309` (cache hit), `:1341` (not-a-blunder early return), `:1414`
  (fresh generation) for `guardExplainMoveLlmPayload`. No other emitter of served explanation prose
  bypasses them. The seam claim holds; it just isn't uniformly locale-aware (see (b)).
  (d) **A second, DEAD test file exists for this module and must not be trusted or extended:**
  `connect-four/server/reasonRenderGuard.locale.test.mjs` (note: repo root of `server/`, not
  `server/tests/`) uses Vitest-style `expect(...).toBe(...)` and is listed in **neither** the `test` nor
  the `test:fast` script string in `connect-four/package.json:16,17` — it never runs. Only
  `server/tests/reasonRenderGuard.test.mjs` (which already exists, `node:test`/`assert` style, and IS in
  both lists) is the live test file; that is where T025's assertions belong. Either delete the dead file
  or wire it in — do not leave a never-executed test asserting the locale behavior this task changes.
  (FR-008)
- [x] T027 [US2] Sample at least 50 recent `explanation_cache` rows that name a board region (or the full
  set if fewer than 50 exist — state this explicitly in the OI-129 closeout if so) and check each for a
  corresponding `[zone:…]` annotation. Record the measured failure rate AND the sample size (a 0% result
  must carry a stated floor, per FR-011's explicit requirement — not an unfloored "0 failures found").
  This measurement is read-only against `explanation_cache` (local or staging read is fine; do not
  write). (FR-011, OI-129)
- [x] T028 [US2] **(D3 RESOLVED 2026-08-03 by the owner — WIRE THE GATE IN AND ENFORCE BY STRIPPING.
  No longer gated; this task is mandatory.)** Wire `annotationGate.js`'s `validateAnnotation`
  (`server/annotationGate.js:486`) into `guardExplainMovePayload`/`guardExplainMoveLlmPayload`
  (`server/reasonRenderGuard.mjs:80,99`). **Failure policy: STRIP the offending span and log** — the
  owner explicitly rejected *retry* because it would cost a second LLM call, and rejected serve-and-log
  as too weak. **Verified at source 2026-08-04 — the purity claim holds with one caveat, and three of
  this task's premises needed correcting:**
  - **Purity: CONFIRMED with a caveat.** `server/annotationGate.js:1-2` verbatim:
    `// Annotation gate — pure validation of Deep Reveal LLM output.` / `// No side effects, no DB, no
    I/O.` Its only imports are `parseZoneSpecs, expandSpec, isValidSpec` from `./zoneParser.js` — no
    solver, no network, no DB. It is a synchronous board scan, so enforcement costs no LLM call. **Caveat:
    the two `console.log` calls below ARE I/O and contradict that header — which is obligation (a).**
  - **`validateAnnotation` has ZERO production callers today.** `/usr/bin/grep -rn "validateAnnotation"
    connect-four/server connect-four/src connect-four/scripts connect-four/tests` finds it only in
    `server/scripts/run_eval.mjs:220,243`, `server/scripts/corpus_annotation_check.mjs:138`, and three
    test files. Confirms the gate is offline-only today (memory `project_annotation_gate_and_zones`);
    this task is genuinely new production wiring.
  (a) **Delete the two unconditional `console.log('[DEBUG validateAnnotation] …')` calls — LINE
  CORRECTION: they are at `server/annotationGate.js:488-489`, not `:487-488`** (`:486` is the function
  declaration `export function validateAnnotation(explanation, board, allowedSet = null) {`, `:487` is
  `  const zones = parseZoneSpecs(explanation);`). Verbatim `:488`:
  `  console.log('[DEBUG validateAnnotation] parsed zones:', JSON.stringify(zones.map(z => z.spec)));`
  and `:489`: `  console.log('[DEBUG validateAnnotation] allowedSet:', JSON.stringify(allowedSet));`.
  They are unconditional (no env/flag guard) and would print on every served explanation —
  `server/scripts/corpus_annotation_check.mjs:32` already carries the comment
  `// Silence validateAnnotation's debug console.log calls during the run.` as a workaround. Delete both,
  and update `spec.md`'s D3 row, which repeats the `:487-488` error.
  (b) **MEASURE** the added latency against the Explanation Engine's <2s budget (Constitution V) as part
  of this task's own acceptance and record the number — do not assume it is free.
  (c) **`allowedSet`: CONFIRMED ABSENT — `checkP5Strong` will NOT run.** `/usr/bin/grep -n "allowedSet"
  connect-four/server/index.js` returns **zero matches**, and `guardExplainMoveLlmPayload`'s signature
  (`server/reasonRenderGuard.mjs:99`) is
  `export function guardExplainMoveLlmPayload({ explanation, prompt, terms, locale = 'en', ...rest })` —
  no board, no allowedSet. So only P1/P2/P3/P5/P6 apply. **State this explicitly in the T029/T030
  write-ups** — do not imply P5Strong coverage that isn't there.
  (d) **NEW — the seam does not currently receive a `Board`, but one is in scope at every call site.**
  `validateAnnotation(explanation, board, allowedSet)` needs a `Board`; the guard functions take neither.
  Verified: `server/index.js:1286-1288` constructs `  let board;` / `    board = new Board(movestring);`
  before all three `guardExplainMoveLlmPayload` call sites (`:1309`, `:1341`, `:1414`), so threading it
  through is mechanical. **Note it is the PRE-move board** (`new Board(movestring)`, with the played `col`
  passed separately) — the offline callers pass the same shape, so keep that convention rather than
  inventing a post-move board.
  (e) **NEW — "strip the offending span" is UNDERSPECIFIED for a third of the predicates, and this task
  must resolve it, not leave it to the implementer.** `validateAnnotation` returns
  `{ valid: boolean, failures: string[] }` (`:502-505`) — **opaque strings, not spans**. Verified failure
  vocabulary: the zone-carrying ones embed the spec and ARE strippable —
  `` failures.push(`P1:invalid_spec:${spec}`) `` (`:102`), `` `P1:empty:${spec}` `` (`:109`),
  `` `P2:col_mismatch:${spec}` `` (`:157`), `` `P5:out_of_bounds:${spec}` `` (`:260`),
  `` `P5:blocked:${spec}` `` (`:277`), `` `P6:raw_coordinate:${spec}` `` (`:302`). **But every P3 failure
  carries NO span**: `failures.push('P3:disc_notation')` (`:181`), `'P3:player_name'` (`:186`),
  `'P3:engine_jargon'` (`:195`, `:212`) — they are whole-text prose judgments with nothing to strip.
  Decide and record the P3 policy in this task's output: the recommended disposition is **drop the
  offending `[zone:…]` annotations for span-carrying failures, and for the span-less P3 failures log and
  serve** (T026's widened regex is already the text-level floor for P3-style leakage) — but if a different
  policy is chosen, say so. Do not ship a "strip" implementation that silently no-ops on P3.
  T026's widened regex still ships as the floor regardless. (FR-010, D3)
- [x] T029 [US2] `docs/architecture/server-conventions.md` — update the existing Annotation Gate section
  (`:1166-1209`) to record D3's outcome (regex-only-for-now, or wired-in per T028), whichever actually
  shipped. (Plan's Documentation-as-First-Class-Deliverable checklist item, D3's `tasks.md` requirement)
- [x] T030 [US2] Close out OI-126 (fully-fixed — T026/T025 ship code + a real-fixture regression test),
  OI-124 (per T028/T029's actual outcome — either fully-fixed if the gate got wired, or
  deliberately-not-fixed with D3's regex-only rationale and a pointer to the latency-measurement
  follow-on if the owner later reverses the default), and OI-129 (per T027's measured rate — either
  extended detection if the rate warrants it, or deliberately-not-fixed with the measured rate AND
  sample size as the stated rationale) in `docs/open_issues.md`. (FR-027, FR-028)
- [x] T031 [US2] `docs/deployment_steps.md` — add the caches entry (Standing Checklist item 5) stating
  `explanation_cache` MUST be `TRUNCATE`d after the T026 regex-fix code deploy (repaired text must not
  be masked by stale rows written under the old regex) — a full truncate, not selective repair, per the
  owner directive. State the ordering explicitly: after this story's code deploy, following the same
  logic as the Spec 052 overcut entry's ordering. This entry MUST carry all six of the file's mandated
  template fields (Status / When / Blocks / Applies to / What's wrong / **Run it** / **Verify — command
  AND success condition** / **Roll back**), and its Roll back field MUST state explicitly **"not
  reversible — `explanation_cache` regenerates on next request"** rather than leaving rollback implicit.
  (FR-012, Deploy Prerequisites item 5)

**Checkpoint**: `stripInternalTokens` passes T025 in both locales against the real OI-126 string; D3's
outcome (default: regex-only) is recorded against OI-124; OI-129's measured rate is recorded;
`explanation_cache` truncation is documented with an explicit non-reversibility note.

---

## Phase 6: User Story 4 - A mistake's severity is stable across every view of the same game (Priority: P4)

**Goal**: the same move shows the same `quality` on first analysis and every later reconstructed view;
the "never filter `blunders` by `quality` when counting mistakes" rule is named in code and guarded by
tests at more than one call site.

**Independent Test**: exercise one boundary-case move through both `scoreMove` and
`reconstructAnalysisFromBlunders`/`classifyStoredMistake`, assert identical `quality` output.

### Implementation for User Story 4

- [x] T032 [US4] Establish the real call-site count for OI-125's invariant — do NOT assume "five".
  **This audit was already performed at source on 2026-08-04 and its results are recorded verbatim in
  T036 below (18 `from('blunders')` sites; 3 counting sites; ZERO live `.eq('quality', …)` filters).**
  This task is now a **re-measurement** of that recorded set, not a first discovery: re-run
  `/usr/bin/grep -rn "from('blunders')" connect-four/server connect-four/scripts` and
  `/usr/bin/grep -rn "eq('quality'" connect-four/server connect-four/src connect-four/scripts`
  (use `/usr/bin/grep`, not bare `grep` — bare `grep` is `ugrep` here and returns zero matches on
  multibyte files, per memory `project_grep_silent_zero_matches`), diff against T036's recorded list, and
  flag any drift. Also re-check `connect-four/server/blunderCountsForGames.js` (named directly in
  OI-125's own "Area" field in `docs/open_issues.md:4598`) — **verified 2026-08-04: it does not reference
  `quality` at all** (`/usr/bin/grep -n "quality" connect-four/server/blunderCountsForGames.js` returns
  only `:5`, a comment), so there is nothing to fix there beyond T036's guard test. Cross-check against
  `data-model.md`'s list of 8 in-process `quality`-touching sites — **note two of its line refs are
  approximate/stale: `index.js:2498-2499` is really `:2498-2500`, and `papergamesImporter.js:116` is the
  `if (quality === 'optimal') continue;` line whose `scoreMove` call is at `:115`.** `gameSampling.js:170`
  is confirmed (`      if (quality === 'optimal') continue;`, fed by `scoreMove` at `:169`). Record the
  true, current, verified set — this is the input to T036. (OI-125, the handoff's explicit "first task,
  not an assumed number" directive)
- [x] T033 [US4] Trace where `scoreMove` (`server/moveQualityScorer.js:9`) and `classifyStoredMistake`
  (`server/mistakeStorageRule.js:81`) actually diverge, given the epic's own note that "the two
  thresholds are mathematically identical" — this trace task answers D4 by evidence and is generated
  now, ungated, per the handoff's explicit D4 exemption (this task itself is what the D4 gate would
  otherwise circularly depend on). Confirm/refute `research.md`'s finding that
  `reconstructAnalysisFromBlunders` (`server/index.js:2223`, called at `:2378`) already reads from
  storage, making "stored authoritative" the smaller diff. Record the concrete divergence mechanism
  (not just "they can differ") as the evidence for the owner's D4 call. (FR-019 trace, D4, OI-104)
- [x] T034 [US4] Write a test exercising one real boundary-case move through both the live scoring path
  (`scoreMove`) and the cached-reconstruction path (`reconstructAnalysisFromBlunders` →
  `classifyStoredMistake`), asserting identical `quality` output. This test is written NOW (ungated) and
  is EXPECTED to fail before T035 lands — it documents the current divergence and becomes the FR-020
  regression test once T035 resolves it. Use a real move harvested from the existing test suite or KB
  per `CLAUDE.md`'s movestring-sourcing rules (never construct one by hand). **If D4 is still unresolved
  when US4's phase closes, this test MUST ship `skip`-marked with a new `OI-N` recording why**, so
  T018/T054/SC-008's zero-RED gate stays honest instead of silently carrying a permanent failure — do not
  leave it red and unexplained. (FR-020 — test only; the fix itself is T035)
- [x] T035 [US4] **(D4 RESOLVED 2026-08-03 by the owner — `scoreMove` IS AUTHORITATIVE. No longer gated;
  this task is mandatory. Governed by FR-019a, the owner's binding "exactly ONE criterion" directive.)**
  Make `scoreMove` (`server/moveQualityScorer.js:9`) the **sole** blunder/suboptimal grader for the
  **game-move** label in the repository. "Both paths now agree" is explicitly NOT acceptable — two rules
  that happen to agree are still two criteria and will drift again.

  **Verified at source 2026-08-04 — this task was previously UNDER-SCOPED.** It covered two producers;
  `/usr/bin/grep -rn "'blunder'" server src scripts` from `connect-four/` (excluding `*.test.*`/`tests/`)
  finds **six** code locations that decide or default this label. The full list, with the concrete
  remedy for each, is in `spec.md` §FR-019a items 1–8 — implement that list, not a paraphrase of it.
  Summary of what changed versus the earlier wording of this task:

  1. **Delete the grading expression from `classifyStoredMistake`.** **Line correction: the expression is
     at `server/mistakeStorageRule.js:102`, not `:81`** (`:81` is the function declaration —
     `export function classifyStoredMistake(bestScore, playedScore, movestring) {`). Verbatim at `:102`:
     `  return { quality: bestScore - playedScore > 4 ? 'blunder' : 'suboptimal' };` — this goes away.
     The function keeps ONLY its storage-**eligibility** job — the slower-win exclusion at `:86`
     (`  if (bestScore > 0 && playedScore > 0) return null;`) and the dead-position faster-loss exclusion
     at `:89-93` (`playerHasPotentialWin`). Narrow its return type accordingly (e.g. `boolean`, or
     `null | {}`), update its `@returns` JSDoc at `:79`, and update its header comment, which documents
     the now-deleted `>4` threshold at `:24-27` (verbatim `:26`:
     `//   bestScore - playedScore > 4  → 'blunder'`).
  2. **Update all three call sites** to take `quality` from `scoreMove` — but note the **seam asymmetry,
     verified at source; only two of the three are one-line diffs**:
     - `server/index.js:2417` — `scoreMove`'s `quality` is ALREADY in scope seven lines above at `:2410`
       (verbatim `      const { quality, bestCol } = scoreMove(scores, col);`). Smallest possible diff.
     - `server/papergamesImporter.js:125` — same shape, `scoreMove` at `:115` (verbatim
       `    const { quality, bestCol } = scoreMove(scores, col);`). One-line diff.
     - `server/index.js:1527` (`POST /api/blunders`) — **CORRECTION: there is NO solver `scores` array in
       scope here.** The handler destructures scalars from the request body (`server/index.js:1494`,
       verbatim: `  const { board_state, move_played, correct_move, pattern_category, score, best_score }
       = req.body;`) and `scoreMove(scores, playedCol)` requires a full 7-element array (it loops
       `scores[0..length)` at `:11-18`). So "take `quality` from `scoreMove`" is **not directly
       implementable** here. Pick ONE and record which: **(a)** export a score-pair entry point from
       `moveQualityScorer.js` that `scoreMove` itself delegates to (one rule, two entry points — still
       one criterion), and call it here; or **(b)** retire the endpoint. Evidence for (b): the only
       `POST /api/blunders` caller found in `connect-four/src` is **none** — `/usr/bin/grep -rn
       "api/blunders" connect-four/src` returns only `GET /api/blunders/:id` fetches
       (`MistakeDetailScreen.jsx:54,86`), and `server/insertGameBlunder.js:6` states verbatim
       `* the client no longer writes them via POST /api/blunders.` Confirm that before choosing (b).
       **Inlining a second threshold at this call site is forbidden.**
  3. **NEW — fix the write-seam coercion.** `server/insertGameBlunder.js:28`, verbatim:
     `  const quality = row.quality === 'suboptimal' ? 'suboptimal' : 'blunder';` — this turns
     `undefined`/`'optimal'`/any typo into a `'blunder'` row, i.e. it invents the label precisely when the
     real grader produced nothing. **Remedy:** take `row.quality` verbatim, validate against the two legal
     values, and **fail loudly** (`console.error` naming the offending value, `return false`, no INSERT)
     on missing/invalid. Do NOT default. Verified safe: all three callers already pass an explicit
     `quality` — `server/index.js:2484` (verbatim `          quality: storedMistake.quality,`) and
     `papergamesImporter.js:231`/`:363`, which spread a blunder object built by `extractBlunders`.
     `tests/blunder/insertGameBlunder.test.js` is already in `test:fast` — extend it with the loud-failure
     case rather than adding a new file.
  4. **NEW — remove the serve-seam fallback.** `server/index.js:2917`, verbatim
     `    quality: b.quality ?? 'blunder',` in the `GET /api/coach/queue` `enriched` mapping. **Verified
     unreachable today** on two independent grounds — state this in the change, since an unreachable
     fallback is a different disposition from a live one: (a)
     `server/migrations/051_blunders_quality.sql:7-8` declares
     `  ADD COLUMN IF NOT EXISTS quality text NOT NULL DEFAULT 'blunder'` /
     `  CHECK (quality IN ('suboptimal', 'blunder'));`, so the column cannot be NULL; and (b) the query at
     `server/index.js:2877-2878` explicitly selects `quality`, so the key is always present. **Remedy:**
     delete the `?? 'blunder'` → `quality: b.quality,`. Removed as dead code, not as a live bug.
  5. **Delete `src/lib/reviewChipQuality.js` and its call sites.** Verified call sites (line correction —
     `:428` was approximate): `src/screens/ReviewScreen.jsx:12` (`import { resolveChipQuality } from
     '../lib/reviewChipQuality.js';`), `:229`, and `:430` — **two** call sites, not one. That module
     exists solely to reconcile the two rules' disagreement — its own header says so at `:1-15`. With one
     criterion it is dead code, and Constitution II requires removing the divergence rather than leaving a
     no-op reconciliation layer. Verify the chip then renders the same `quality` the detail screen shows,
     which was the original symptom. **Deleting the test file has a trap:**
     `tests/unit/reviewChipQuality.test.js` is listed in **both** the `test` and `test:fast` script
     strings in `connect-four/package.json:16,17`. `node --test` errors on a missing file, and because
     `test:fast` is one long space-separated file list, that error means **zero tests run** — a green-
     looking gate that ran nothing. Remove the entry from both strings in the same commit.
     Also update `tests/unit/mistakeStorageRule.test.js` (also in both lists) for the narrowed return type.
  6. **NEW — replace the structural test requirement.** The previously-written bar ("assert no module
     other than `moveQualityScorer.js` maps a `(bestScore, playedScore)` pair to
     `'blunder'`/`'suboptimal'`") is **RETRACTED as too narrow**: items 3, 4, and the ChallengeScreen sites
     take no scores at all, so a test worded that way passes while five other criteria remain in the tree.
     The required shape: a **source scan of production code** (`connect-four/server/**` and
     `connect-four/src/**`; exclude `*.test.*`, `tests/`, `server/migrations/`, `server/scripts/`) for the
     string literals `'blunder'`/`'suboptimal'` **in a value-producing position**, asserted against an
     **explicit allowlist keyed by file path plus the matched line content, where each entry carries an
     inline comment stating why it is permitted**. A new emitter fails the test by default. The allowlist
     MUST include, with their stated reasons:
     - `server/moveQualityScorer.js` — *the sole game-move grader (FR-019a item 1).*
     - `src/screens/ChallengeScreen.jsx:586` — *puzzle-answer grading: a DIFFERENT question (did the
       player pick the right answer set?), deliberately not unified per the owner's 2026-08-03 scope
       ruling; documented in `docs/architecture/db-schema.md` — see T056.*
     - `src/screens/ChallengeScreen.jsx:386,407` and `:492` — *spec-049 accepted-gate display override +
       session-results fallback, client-side only, left in place and recorded as an OI-N — see T057.*
     - `src/lib/useGameBoard.js:286` (verbatim
       `        coachKey = trackPhrase(pickRandomKey(t, \`coach.spoken.generic.${data.quality ?? 'blunder'}\`, used));`)
       — *builds an i18n phrase-pool KEY, never a stored or served `quality` value.*
     Do **not** allowlist a bare `server/index.js` — allowlist only the specific surviving lines there
     (`:2851`, `:2984`, `:2753` are comments; `:2249-2250` and `:2498-2500` are reads/counters), so a
     future re-introduction of a producer in that file still fails.
  T034's test must pass after this task, and its `skip` marker (if any) and OI-N must be removed.
  **Deploy consequence**: existing `blunders` rows on staging/production were graded by the deleted
  magnitude rule and are now wrong under the single criterion. Per the owner's disposable-database
  directive this is a **documented regenerate** in `docs/deployment_steps.md` (T037), NOT repair tooling.
  (FR-019, FR-019a, D4)
- [x] T036 [US4] Name the "never filter `blunders` by `quality` when counting mistakes" invariant in code
  (a named constant/comment/helper, not five independently-written comments) using T032's verified
  call-site list, and add a guard test at more than one of those sites.
  **Verified at source 2026-08-04 — the real numbers, so the implementer does not have to re-derive them.
  Do NOT assume "five":**
  - **The invariant currently HOLDS everywhere.** `/usr/bin/grep -rn "eq('quality'" connect-four/server
    connect-four/src connect-four/scripts` returns **exactly one match, and it is a comment**:
    `server/index.js:2851` — verbatim
    `  // spec 042 T034/FR-005/FR-007: no \`.eq('quality', 'blunder')\` filter here — both`. There is **no
    live `quality` filter on `blunders` anywhere in the repository.** This task therefore *guards* an
    already-true property; it does not fix a live bug.
  - **`from('blunders')` query/insert sites: 18** (`/usr/bin/grep -rn "from('blunders')"
    connect-four/server connect-four/scripts`, excluding one comment at `blunderCountsForGames.js:5`) —
    `blunderDetailResponse.js:271`; `index.js:1546, 2367, 2647, 2789, 2877, 2892, 2942, 2962, 4235`;
    `userRoutes.js:566`; `insertGameBlunder.js:48`; `scripts/reprocess_blunders.mjs:103, 144`;
    `scripts/debug_blunder_severity.mjs:49`; `scripts/corpus_annotation_check.mjs:66`;
    `blunderCountsForGames.js:42`. Of these, the **mistake-COUNTING** sites the invariant is about are
    three: `blunderCountsForGames.js:42` (per-game counts), `index.js:2789` (`GET
    /api/coach/category-counts`, verbatim `      .select('pattern_category, count()')` at `:2790`), and
    `index.js:2892` (the `GET /api/coach/queue` `countQuery`).
  - **`blunderCountsForGames.js` does not touch `quality` at all** — `/usr/bin/grep -n "quality"
    connect-four/server/blunderCountsForGames.js` returns only `:5`, a comment. OI-125's "Area" field
    named it, but there is nothing to fix there beyond the guard.
  - **Line corrections for the in-process counters** (the old refs were off): the cached-reconstruction
    branch is at **`server/index.js:2249-2250`**, verbatim
    `      if (blunder.quality === 'suboptimal') cSuboptimal++;` / `      else cBlunder++;` (the task
    previously said `:2259-2261`); the live-analysis branch is at **`server/index.js:2498-2500`**, verbatim
    `        if (quality === 'optimal') optimalCount++;` / `        else if (quality === 'suboptimal')
    suboptimalCount++;` / `        else blunderCount++;` (previously `:2500-2502`). The two
    `summaryPhraseKey` assignments those feed are at `server/index.js:2284` and `:2516`.
  Extend `tests/unit/blunderCountsForGames.test.js`'s existing pattern — verified present, `:109-111`
  asserts `    supabase.calls[0].filters.quality,` is `undefined` with the message
  `    'the count() query must never filter on quality — both severities must be counted'` — to cover
  **at least** `/api/coach/category-counts` (`index.js:2789`) and the `/api/coach/queue` `countQuery`
  (`index.js:2892`). (FR-021, OI-125)
- [x] T037 [US4] `docs/architecture/db-schema.md` — update the `blunders` section documenting that
  **`scoreMove` is the sole grader of the game-move `quality` label** post-D4, that
  `classifyStoredMistake` now decides storage **eligibility only**, and that the write-seam coercion
  (`insertGameBlunder.js`) and serve-seam fallback (`index.js` `coach/queue`) were removed so no second
  place can invent the label (FR-019a items 2–5). **Also record the deploy consequence** in
  `docs/deployment_steps.md` per the owner directive's "simpler option, documented, not built as repair
  tooling" framing: existing `blunders` rows on staging/production were graded by the deleted magnitude
  rule and are now wrong under the single criterion, so the remedy is a **documented regenerate** (the
  databases are disposable pre-launch), NOT a repair script. That entry MUST carry all six of
  `docs/deployment_steps.md`'s mandated template fields (Status / When / Blocks / Applies to / What's
  wrong / **Run it** / **Verify — command AND success condition** / **Roll back, or an explicit "not
  reversible"**). D4 is RESOLVED, so the former "skip-and-record if D4 is still open" branch of this task
  no longer applies. (Plan's Documentation-as-First-Class-Deliverable checklist item, D4's `tasks.md`
  requirement, FR-019a)
- [x] T056 [US4] **(Owner scope ruling, 2026-08-03 — "game moves only, but NAME the boundary".)**
  `docs/architecture/db-schema.md` — in the same change as T037, add an explicit **domain-boundary note**
  next to the `blunders.quality` documentation stating that the `'optimal'|'suboptimal'|'blunder'`
  vocabulary is used by **two separate domains**, and that this is deliberate, not a defect:
  (a) the **game-move** label, graded solely by `scoreMove` (FR-019a); and
  (b) the **puzzle-answer** label, graded client-side by set-selection accuracy in
  `src/screens/ChallengeScreen.jsx:586` — verbatim
  `    const quality = allCorrect ? 'optimal' : noFalsePositives ? 'suboptimal' : 'blunder';` — which
  answers a different question (did the player pick the right answer set?), uses **no solver scores**, and
  is explicitly OUT of the single-criterion unification.
  Name the two related puzzle-domain sites in the same note so a future reader does not rediscover them
  either: `ChallengeScreen.jsx:492` (verbatim `      quality: evaluation?.quality ?? 'blunder',` — a
  session-results fallback feeding `PostSetSummaryScreen.jsx:76`), and **`server/index.js:2647-2654`, the
  puzzle-attempt `blunders` INSERT, which sets no `quality` column at all** and therefore takes the
  migration-051 column default `'blunder'` (verified: the insert payload at `:2648-2654` lists
  `user_id, puzzle_id, board_state, move_played, correct_move, pattern_category, severity` and no
  `quality`). State plainly that a puzzle-attempt row's `quality` is a DB default, not a grading verdict.
  This task's output is also the justification text the T035 structural test's allowlist entries point at.
  (FR-019a item 6, owner scope ruling)
- [x] T057 [US4] **(Owner scope ruling, 2026-08-03 — record, do not fix.)** `docs/open_issues.md` — add a
  **new `OI-N`** (next free number at the time of writing; do not reuse an existing one) recording that a
  **client-side override of the server's `quality` label** exists in the spec-049/Epic-9 accepted gate,
  and why it was deliberately left in place. Cite both lines verbatim:
  `src/screens/ChallengeScreen.jsx:386` —
  `          ? { ...data, quality: 'blunder', badge: 'bad', summaryLineKey: pickSummaryKeyOrNull('blunder') ?? data.summaryLineKey }`
  and `:407` —
  `        const coachQuality = acceptedPromoted ? 'optimal' : acceptedDemoted ? 'blunder' : (data.quality ?? 'blunder');`.
  Record the disposition as **deliberately-not-fixed**: it is a *display* correction in the puzzle domain
  (it makes the badge/coach line agree with the accepted-gate verdict — SC-002 of spec 049), it never
  writes a `blunders` row, and unifying it is out of this feature's owner-set scope. Note that it IS
  allowlisted in T035's structural test, with that reason inline, so the exemption is discoverable from
  the test as well as from here. This is a **new** OI-N, not folded into OI-104 or OI-125; T053's
  new-defect sweep and T052's traceability check must both account for it. (FR-028, FR-019a item 7,
  owner scope ruling)
- [x] T038 [US4] Close out OI-104 (per T035's actual resolution — fully-fixed if D4 landed, or
  deliberately-not-fixed with the trace evidence from T033 and a pointer to the pending owner decision if
  D4 is still unresolved when this closes) and OI-125 (fully-fixed — T032's verified call-site list +
  T036's named invariant + guard tests) in `docs/open_issues.md`. **Do NOT fold T057's accepted-gate
  `OI-N` into either of these** — per the owner's scope ruling it is a separate, deliberately-not-fixed
  entry. (FR-027, FR-028)

**Checkpoint**: T034's boundary-case test passes with identical `quality` from both paths; **T035's
structural allowlist test is green AND has been shown to go RED when a new `'blunder'` emitter is added
to a non-allowlisted file** (a green allowlist test that was never seen failing proves nothing —
`CLAUDE.md` §"A green test is not evidence"); `npm run test:fast` still runs its full file list (verify
`tests/unit/reviewChipQuality.test.js` was removed from **both** script strings in `package.json`, not
just deleted from disk); OI-125's invariant is named and guarded at ≥2 real call sites; T056's
domain-boundary note and T057's new `OI-N` both exist.

---

## Phase 7: User Story 3 - The paid-conversion and billing-recovery paths both complete (Priority: P5)

**Goal**: `/pricing` auto-opens checkout for a real `?_ptxn=`; a signed-out visitor and a free-tier
subscriber see distinguishable locked-lesson CTAs; OI-41 is re-confirmed or closed won't-fix.

**Independent Test**: open `/pricing?_ptxn=<real-id>` against a production build in a real browser,
confirm Paddle.js initializes on mount and checkout auto-opens, no CSP violation.

### Tests for User Story 3

- [x] T039 [P] [US3] Write a unit test asserting `PricingScreen.jsx`'s mount-time effect calls
  `getPaddle()` unconditionally (not only from a click handler) and, when a `?_ptxn=` query param is
  present, calls the checkout-open path for that transaction id. Cover the edge case explicitly: an
  expired/invalid `_ptxn` still initializes Paddle.js (page is never worse than today) and fails the
  auto-open gracefully. (FR-013)
- [x] T040 [P] [US3] Write/extend tests for `src/screens/sagaLock.js`'s three chained functions covering
  the new `'signin'` outcome threaded through all three.
  **Verified at source 2026-08-04 — two of the three line refs were stale; corrected here and in T044:**
  `deriveLockReason` is at **`:12`** (CONFIRMED — `export function deriveLockReason(lesson, lessons,
  progress, tier) {`), `dispatchLockAction` at **`:31`** (was `:30`; verbatim
  `export function dispatchLockAction(reason) {`), `deriveLessonAccess` at **`:47`** (was `:44`; verbatim
  `export function deriveLessonAccess(lessonId, lessons, progress, tier) {`). Current return sets are
  CONFIRMED as documented: `'none'|'tier'|'order'|'both'` (`:10`), `'upgrade'|'orderLock'|'navigate'`
  (`:29`), `'allowed'|'upgrade'|'orderLock'` (`:45`). The existing test file is
  `connect-four/tests/unit/deriveLockReason.test.js` (present in both the `test` and `test:fast` lists in
  `package.json:16,17`) — extend it rather than adding a new file.
  Cover the new `'signin'` outcome threaded through all three — specifically the interaction between `'signin'` and the existing
  `'both'` (tier-AND-order-locked) case flagged as unscrutinized in the handoff (FR-017's "Scrutinize"
  note: this is not an obvious substitution). Assert a signed-out visitor gets `'signin'` regardless of
  tier/order lock state, and a signed-in free-tier user still gets the existing `'upgrade'`/`'orderLock'`
  behavior unchanged. (FR-017)

### Implementation for User Story 3

- [x] T041 [US3] `src/lib/useUpgradeCheckout.js` / `src/screens/PricingScreen.jsx` — add a mount-time
  `useEffect` that calls `getPaddle()` and, if `?_ptxn=` is present in the URL, auto-opens the checkout
  for that transaction id once Paddle.js has initialized. `/pricing-legal` is untouched and stays
  JavaScript-free.
  **Verified at source 2026-08-04:**
  - `getPaddle` is defined at `src/lib/useUpgradeCheckout.js:32` (`async function getPaddle() {`) and
    called at **`:119` and `:160`** — CONFIRMED, both inside the async `handleUpgrade` /
    `handleCheckoutCompleted` paths, never at mount.
  - **CORRECTION — `getPaddle` is NOT exported.** `/usr/bin/grep -an "^export" src/lib/useUpgradeCheckout.js`
    returns only `:22` (`export const PADDLE_CHECKOUT_DISMISSED_EVENT = …`) and `:139`
    (`export function useUpgradeCheckout(returnPathOverride) {`). `PricingScreen.jsx` therefore **cannot
    call `getPaddle()` today**. Part of this task is exporting it (or adding a small exported
    `useInitPaddle()` / `initPaddle()` from the same module) — do not assume the import already resolves.
  - **`?_ptxn=` handling is genuinely new** — `/usr/bin/grep -arn "_ptxn" connect-four/src` returns
    **zero matches**. There is no existing param parser, route mapping, or checkout-by-transaction-id path
    to reuse.
  - `PricingScreen.jsx` already has two mount `useEffect`s (`:36` `/api/paddle/config`, `:53`
    `/api/limits`) using the `let cancelled = false; … return () => { cancelled = true; };` pattern —
    follow it. `useUpgradeCheckout()` is already called at `:31` (`const handleUpgrade =
    useUpgradeCheckout();`), and the hook returns an `async function handleUpgrade(plan)` that opens a
    checkout for a **price**, not a transaction id — the `_ptxn` auto-open is a distinct
    `paddle.Checkout.open({ transactionId })` call, not a reuse of `handleUpgrade`. Use the
    `paddle-docs` MCP server to confirm the current parameter name before writing it (`CLAUDE.md`
    §Paddle integration).
  (FR-013, FR-015)
- [x] T042 [US3] **(B2 — verify the corrected FR-017 file map, sequenced before T043.)**
  `specs/057-mvp-launch-gate/data-model.md` §"Entitlement signal" and `plan.md`'s `UpgradeModal.jsx`
  Source Code map annotation were already corrected this session to match FR-017 (the real chain is
  `useLessonLockGuard.js` → `sagaLock.js` → `SagaScreen.jsx`/`UpgradeModal.jsx`/`AuthModal.jsx`, NOT the
  three lesson screens — `ConceptScreen.jsx`/`SocraticScreen.jsx`/`CLChallengeScreen.jsx` never render
  locked-lesson copy at all, since `useLessonLockGuard.js` redirects to `'saga'` before any of them
  mount). Before T043-T046 implement against this map, spot-check `data-model.md` and `plan.md` once
  more for drift (e.g. a concurrent `/speckit-tasks` re-run reintroducing the superseded three-screen
  framing) — the artifacts must stay corrected so the contradiction cannot silently resurface. (FR-017)
- [x] T043 [US3] Thread the `GET /api/user/entitlement` response's existing `authenticated` signal into
  `sagaLock.js`. No change to the entitlement API contract.
  **Verified at source 2026-08-04 — two corrections; this task was under-scoped by one file and named the
  wrong parameter:**
  - **CORRECTION — there are TWO places that drop `authenticated`, not one.** `useLessonLockGuard.js:64`,
    verbatim `      getEntitlement().then(({ entitled }) => (entitled ? 'paid' : 'free')),`; **and**
    `src/screens/SagaScreen.jsx:200`, verbatim
    `    getEntitlement().then(({ entitled }) => setTier(entitled ? 'paid' : 'free'));`. SagaScreen calls
    `deriveLockReason` directly at `:213`, `:222`, and `:238` with its own `tier` state (`:154`
    `  const [tier, setTier] = useState('free');`) — if only the hook is threaded, the saga screen's own
    node taps still cannot distinguish signed-out from free-tier. **Both must be updated.**
  - **CORRECTION — do NOT thread it "into `sagaLock.js`'s `tier` parameter".** `tier` is consumed as
    `sagaLock.js:13` `  const tierLocked = lesson.free === false && tier !== 'paid';` — a two-valued
    `'paid'|'free'` string. Overloading it with a third value would silently change `tierLocked` for every
    existing caller. Add a **separate `authenticated` parameter** to the three functions instead (see
    T044), keeping `tier`'s meaning and call signature intact.
  - The signal itself is confirmed present in the client helper: `src/lib/entitlement.js` returns
    `{ entitled: false, authenticated: false }` at `:103` and `:109` and reads `fresh.authenticated` at
    `:141`. No API change is needed — only the two destructures above discard it. (FR-017)
  - **CORRECTION found during implementation (2026-08-04) — this task was under-scoped by a THIRD
    drop site.** `:103`/`:109`/`:141` are internal to `attemptSessionRefreshAndRetry`/the
    `isAmbiguousLapse` check; every one of `getEntitlement()`'s OWN `return` statements
    (`entitlement.js:128,138,154,172,177` before this change) returned only `{ entitled }` —
    `authenticated` never left the module. Verified with
    `/usr/bin/grep -n "return {" src/lib/entitlement.js` pre-change. Left unfixed, both
    `useLessonLockGuard.js` and `SagaScreen.jsx` would have destructured `authenticated: undefined`
    (falsy) for EVERY caller, including signed-in paid users, and every locked lesson would have
    routed to `'signin'` regardless of real auth state. Fixed as part of this task: widened
    `getEntitlement()`'s 5 return statements (and `lastKnownGood`'s shape) to include
    `authenticated`, additive-only, no change to the field's meaning or to the server contract.
    Updated `tests/unit/entitlementClient.test.js`'s `assert.deepEqual` expectations (9 call sites)
    to match the widened shape.
- [x] T044 [US3] `src/screens/sagaLock.js` — add the `'signin'` outcome to all three chained functions,
  not just the last one. **Line numbers corrected 2026-08-04 (see T040 for the verbatim declarations):**
  `deriveLockReason` (**`:12`**, extend its `'none'|'tier'|'order'|'both'` return set only if needed for
  the new distinction — verify against T040's test whether `'signin'` belongs on this function or is
  derived downstream), `dispatchLockAction` (**`:31`**, was `:30`; add `'signin'` alongside
  `'upgrade'|'orderLock'|'navigate'`), and `deriveLessonAccess` (**`:47`**, was `:44`; add `'signin'`
  alongside `'allowed'|'upgrade'|'orderLock'`). Take the signed-out signal as a **new parameter** per
  T043's correction, not by overloading `tier`. Note `deriveLessonAccess:51-52` short-circuits on a
  completed lesson (`  const isDone = progress.some(…); if (isDone) return 'allowed';`) — decide whether a
  signed-out visitor with local progress on a completed lesson should still be sent to sign-in, and state
  the choice. Also update the three JSDoc `@returns` lines (`:10`, `:29`, `:45`), which are the only
  contract these pure helpers publish. (FR-017)
- [x] T045 [US3] `src/screens/SagaScreen.jsx` — add a `lockAction:'signin'` branch that renders the
  existing `AuthModal.jsx` instead of `UpgradeModal.jsx`. No new component.
  **Verified at source 2026-08-04 — CONFIRMED, and `AuthModal` is more reusable than this task assumed:**
  - `SagaScreen.jsx:304-311` renders `<UpgradeModal onDismiss={…} onUpgrade={handleUpgrade}
    uiState={upgradeUiState} onUiStateChange={setUpgradeUiState} />` guarded by `{upgradeOpen && (`
    (`:304`) — the `:305` reference in the old wording pointed at the `<UpgradeModal` tag itself.
  - The `lockAction` prop enters at `:148` (`export function SagaScreen({ go, lockAction }) {`) and is
    consumed by **two** `useState` initializers that both need a `'signin'` sibling: `:155`
    `  const [upgradeOpen, setUpgradeOpen] = useState(lockAction === 'upgrade');` and `:157`
    `  const [orderLockOpen, setOrderLockOpen] = useState(lockAction === 'orderLock');`. The comment at
    `:145-147` documents `lockAction` as `('upgrade' | 'orderLock', session-only param)` and must be
    updated too.
  - **`AuthModal` already accepts a `reason` prop** — `src/components/AuthModal.jsx:9` verbatim
    `export function AuthModal({ onClose, reason }) {`. Use it to carry the locked-lesson context rather
    than adding a prop. Precedent CONFIRMED at `src/screens/HomeScreen.jsx:156`, verbatim
    `      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}` (imported at `HomeScreen.jsx:6`).
  (FR-017)
- [x] T046 [US3] `src/components/UpgradeModal.jsx` — confirm it does NOT need to distinguish "sign in"
  vs "upgrade" copy itself once T045 routes the signed-out case to `AuthModal.jsx` instead; if any
  residual ambiguity remains (e.g. a shared parent component choosing which modal copy to show before
  routing), resolve it there. **Verified 2026-08-04: `AuthModal`'s existing `reason` prop
  (`src/components/AuthModal.jsx:9`) is the intended seam for the locked-lesson copy variant** — check
  what `reason` values it already handles before introducing a new one. Reuse existing i18n keys/copy
  patterns per Constitution IV — no new terminology inconsistent with other locked-content cards in the
  app, and add any new key to **both** `en` and `es` (a missing `es` key ships English silently, memory
  `project_spanish_output_silent_fallback`). (FR-017)
- [x] T047 [US3] `docs/open_issues.md` — re-confirm OI-41 as an accepted risk scoped to
  `/pricing-legal`'s hardcoded price/quota literals, or close it won't-fix — this is the owner's call to
  make explicit in this closeout (agent proposes the recommended framing per the epic's Settled decision
  5, owner confirms). No pricing-page redesign work. (FR-018, OI-41)
- [x] T048 [US3] `docs/deployment_steps.md` — the FR-016 owner action (pointing Paddle's dashboard
  default-payment-link setting at `/pricing`) is the SAME action already queued in the existing
  Spec 053 entry ("Paddle dashboard config" §) — AMEND that existing PENDING entry to reference this
  story's `/pricing` mount-time-init change, do NOT add a second entry about the same setting. (FR-016,
  the handoff's explicit "amends the existing PENDING Spec 053 entry" directive)
- [x] T049 [US3] `staging_checks.md` (repo root) — add sign-off items for: (a) FR-014, CSP verified
  against a real production build (`npm run build && node server/index.js`, then a real browser check of
  `/pricing?_ptxn=<id>` for zero `Refused to ...` console lines — CSP is invisible under `npm run dev`);
  (b) FR-016, the owner's real sandbox transaction confirming the payment-method-update email reaches an
  open checkout. Neither is agent-run. (FR-014, FR-016)
- [x] T050 [US3] Close out OI-98 (partially-fixed — T041's agent-satisfiable half ships; T049's
  owner-gated half stays open until the owner signs off), OI-95 (fully-fixed — T043-T046 ship the
  client-side branch), and OI-41 (per T047's outcome) in `docs/open_issues.md`. (FR-027, FR-028)

**Checkpoint**: `/pricing?_ptxn=` auto-opens checkout on mount (verified locally against a production
build per `quickstart.md`); signed-out vs free-tier lock copy is distinguishable; OI-41 has a recorded
disposition.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Epic-wide requirements that only make sense once every story has landed.

- [x] T051 Sweep `docs/deployment_steps.md` against its own Standing Checklist (6 categories) one more
  time across all five stories' entries (T013, T014, T021, T031, T048, plus US1/US4's D1/D4-conditional
  entries) — confirm nothing was left as "N/A" without being explicitly walked, per the plan's Deploy
  Prerequisites section walking all six categories explicitly. Confirm every entry carries the six
  mandated template fields (T013/T014/T021/T031 in particular) and that T031's `explanation_cache`
  TRUNCATE entry states "not reversible" explicitly. Confirm the FR-016 Paddle entry amended the existing
  Spec 053 entry rather than duplicating it (T048). (FR-029)
- [x] T052 Full `docs/open_issues.md` traceability check: confirm all 16 in-scope issues (OI-92, OI-86,
  OI-83, OI-130, OI-126, OI-124, OI-129, OI-98, OI-95, OI-41, OI-104, OI-125, OI-82, OI-5, OI-31, OI-105)
  carry a disposition, using `quickstart.md`'s closing grep as a mechanical check, followed by a manual
  read of each entry (a grep count is not proof of correct disposition). (FR-027, SC-009)
- [x] T053 Confirm any new defect discovered during T001-T050 that was NOT one of the 16 in-scope issues
  got its own new `OI-N` in `docs/open_issues.md`, not a memory-file note. **This explicitly includes
  T057's accepted-gate override `OI-N`**, plus any of the out-of-scope findings recorded during the
  2026-08-04 verification pass that the implementer confirms still hold (notably: the never-executed
  `connect-four/server/reasonRenderGuard.locale.test.mjs`, absent from both `package.json` test lists —
  see T026(d); and `POST /api/blunders` having no client caller — see T035 item 2). (FR-028)
- [x] T054 Write the FR-030 launch-readiness statement: for each of the 5 user stories, state
  shipped-or-deferred-with-reason (explicitly noting every owner-gated item still pending: **T015's
  `fill-candidate-pools.mjs --apply` run against staging AND production (Decision D-b)**, T022's OI-5
  probe, T049's `staging_checks.md` sign-offs — **D3 and D4 are both RESOLVED, so T028 and T035 are
  shipped-or-not, never "pending an owner call"**), and give a direct answer to whether the owner can
  launch. State explicitly that the FR-019a single-criterion property holds for the **game-move** label
  only, and that the puzzle-answer domain is documented (T056) and the accepted-gate override recorded
  (T057) rather than unified — so "one criterion" is not overclaimed. This is a written closeout
  artifact (e.g. appended to `specs/057-mvp-launch-gate/quickstart.md` or a new closing section in
  `spec.md`), not a script output. (FR-030, SC-009, D-b)
- [x] T055 [P] Final `npm run test:fast` run from a clean checkout as the closing gate check — must match
  T018's recorded result (0 failures, or the same enumerated/justified set), confirming no later story's
  work regressed US5's clean baseline. (SC-008)

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependencies — run first.
- **Phase 2 (Foundational)**: empty — skip.
- **User stories (Phases 3–7)**: each is independently startable after Phase 1. The epic's recommended
  execution order is **US1 → US5 → US2 → US4 → US3** (this file's phase order) because US1 is the
  largest/most damaging and US5 makes every later story's "tests pass" claim trustworthy — but no story
  is blocked on another completing; they can run in parallel if capacity allows.
- **Phase 8 (Polish)**: depends on ALL FIVE stories (T051-T055 read/verify across all of them) — run
  last.

### Within each story

- US1: T004 (test) can be written before T005 (the B1 grader fix — makes T004 pass) lands; T005 is
  independent of T006-T008 and can run in parallel with them; T009 (fill-candidate-pools.mjs, also D1's
  retire-and-refill mechanism) depends on T008's audit for the stale-row list it must retire, and is
  otherwise independent of T004-T005; T010-T011 depend on T009; T012-T014 (docs) depend on
  T009/T010/T011's actual outputs; T015 (D-b staging_checks item) depends on T014's remedy report;
  T016 (closeout) is last.
- US5: T017 depends on T002; T018 depends on T017 (and on T034's skip/OI-N status if D4 is still open);
  T019/T020 (migration/pooler measurement, and the 6543 doc fix) are independent of T017/T018 and can run
  in parallel; T021 depends on T019; T022 is independent; T023 (closeout) depends on
  T018/T019/T020/T022.
- US2: T024 before T025 (test needs the harvested fixture); T025 before T026 (test must fail first);
  T027 is independent of T024-T026 and can run in parallel; T028 (D3-gated) depends on T026 shipping
  first (regex-only is the floor regardless of D3's outcome); T029-T031 depend on T026/T027/T028's actual
  outcomes; T030 (closeout) last.
- US4: T032 and T033 are independent and can run in parallel; T034 depends on T033's trace evidence for
  picking a real boundary-case move; T035 depends on T034's failing test and T033's trace;
  T036 depends on T032's verified call-site list; T037 depends on T035's actual resolution; **T056 (the
  ChallengeScreen domain-boundary note) is written alongside T037 in the same `db-schema.md` change and
  its text is what T035's structural-test allowlist comments point at, so T056 must land no later than
  T035; T057 (the accepted-gate `OI-N`) is independent of all of them and can run in parallel** — both
  T056 and T057 belong to the **T032–T038 (US4) implementation batch**; T038 (closeout) last, and it must
  reference T057's new `OI-N` without folding it into OI-104/OI-125.
- US3: T039/T040 (tests) can run in parallel and before their respective implementations; T041 is
  independent of T042-T046; T042 (B2 doc spot-check) runs before T043; T043 before T044 (sagaLock needs
  the entitlement signal threaded in first, or at minimum designed together); T044 before T045; T045
  before T046; T047/T048/T049 are independent docs/ops tasks; T050 (closeout) last.

### Parallel opportunities

- All of Phase 1's T002/T003 can run in parallel with T001.
- Across stories: US1, US5, US2, US4, US3 touch disjoint files (per `plan.md`'s Source Code map) and can
  all be worked in parallel once Phase 1 completes, EXCEPT that US1 and US2 both touch
  `server/predicates.js`-adjacent and `server/reasonRenderGuard.mjs`-adjacent surfaces the epic's own
  Lane note flags as needing to run alone relative to any *other concurrent branch* — within THIS
  feature's own task list that is not a conflict, since both stories are sequenced by one agent/session,
  not two competing branches.
- Within US1: T005, T006, T007, T008 are mutually parallel (different files/read-only, except T005 which
  edits `predicates.js` directly — still parallel-safe against T006-T008 since none of those write code).
- Within US2: T027 is parallel to T024/T025/T026.
- Within US3: T039, T040, T041 are mutually parallel; T047, T048, T049 are mutually parallel.

---

## Implementation Strategy

### MVP first

1. Phase 1 (Setup).
2. Phase 3 (US1) — the largest, most user-visible-damage story; ships pool-health fixes and the
   grading-correctness regression test (T004) plus the grader fix that makes it pass (T005),
   independently testable and independently valuable even before any other story lands.
3. **STOP and VALIDATE** against `quickstart.md` §US1 before continuing.

### Incremental delivery (epic's recommended order)

US1 → US5 → US2 → US4 → US3, each phase checkpointed and independently deployable per its own
`docs/deployment_steps.md` entries. Phase 8 only after all five.

### Gated tasks — NONE REMAIN

**All four design decisions are now RESOLVED. There is no `[GATED:…]` task left in this file.**

- **D1** — RESOLVED 2026-08-03: retire and refill. T009 implements the disposition directly.
- **D2** — RESOLVED: no serving-policy decision; every below-floor category is filled to N=20.
- **D3** — RESOLVED 2026-08-03 by the owner: **wire `validateAnnotation` into the live response seam and
  ENFORCE by stripping the offending span.** Retry was rejected (a second LLM call); serve-and-log was
  rejected (too weak). T028 is mandatory, not optional.
- **D4** — RESOLVED 2026-08-03 by the owner: **`scoreMove` is the sole grader**, under the binding
  FR-019a "exactly ONE criterion" directive — `classifyStoredMistake` stops grading (its threshold is
  deleted, keeping only storage eligibility) and `src/lib/reviewChipQuality.js` is removed. T035 is
  mandatory, not optional.

Consequently every task in this file is ungated and runs.

Every other task in these stories (audits, traces, tests-that-are-expected-to-fail, the mandatory
regex fix, the invariant-naming, the B1 grader fix) is ungated and should proceed regardless of whether
D3/D4 have been answered yet.
