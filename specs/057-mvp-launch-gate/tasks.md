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

- [ ] T001 Run `eval "$(./worktree-ports.sh)"` from repo root and confirm `connect-four/server/.env`,
  `.env.staging`, `.env.production` are all present and readable (per
  `docs/architecture/worktree-conventions.md` and memory `reference_supabase_connection.md` — parse
  `.env` manually, `dotenv` is not reliably available in `node -e`, `cd connect-four` first).
- [ ] T002 [P] Re-run `grep -rn "reason_evidence_boards_coverage_2026-07-0[23]" connect-four/server/tests/*.test.mjs`
  to confirm the exact set of files with the stale fixture-path literal is still the 5 named in
  `research.md` §"Re-measured baseline" (not 6, per the file's own "Verification note for tasks.md" —
  a concurrent session may have added a 6th file using the same broken pattern since that measurement).
- [ ] T003 [P] Re-run `npm run test:fast` (from `connect-four/`) once, and record the current pass/fail
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

- [ ] T004 [P] [US1] Write a regression test in `connect-four/server/tests/` (new or extended file,
  colocated with existing `predicates`/`classifier` test placement per
  `docs/architecture/testing-conventions.md` §Test Suite Layout) asserting that a puzzle row with a
  deliberately stale `highlight_metadata` (constructed from a real board + the *pre-widening* metadata
  shape) is graded correct when the player submits the mathematically correct column — i.e. the grader
  must not silently trust stale stored evidence. This test MUST fail against current `evalOvercut`
  before T005's fix lands (FR-006, OI-92). **No data repair (T009) can make this test pass** — only a
  grader change can, since the test's whole point is that the row's stored metadata is never
  repaired/retired in this scenario.

### Implementation for User Story 1

- [ ] T005 [US1] **(B1 — required for T004 to pass.)** Change `evalOvercut` (`connect-four/server/predicates.js:364-372`),
  `evalUndercut` (`:348-356`), and `evalZThreat` (`:308-314`) to cross-check the solver-gated
  `puzzle.correctCols` array before returning a `'wrong'` verdict derived only from
  `puzzle.highlightMetadata`, following the pattern already in `evalFigure7` (`:383`,
  `const correctCols = puzzle.correctCols ?? []; ... if (correctCols.includes(candidateCol)) ...`) and
  `evalJShape`. Verified at source: today `evalOvercut` reads only `puzzle.highlightMetadata?.cells` and
  never touches `correctCols`; `evalUndercut` reads `puzzle.highlightMetadata?.cells` plus live `scores`
  for the solver-safety floor and also never touches `correctCols`; `evalZThreat` reads only
  `puzzle.highlightMetadata?.column`. Concretely: if `puzzle.correctCols` is present and non-empty and
  contains `candidateCol`, the evaluator MUST return `{ result: 'correct', correctCol: candidateCol }`
  even when the `highlightMetadata`-derived computation would otherwise reject it — this is what makes a
  mathematically correct answer immune to stale stored evidence whether or not T009's retire-and-refill
  has run on that specific row. Do not weaken `evalUndercut`'s live solver-safety check in the process —
  the cross-check is an additional acceptance path, not a replacement for the existing rejection logic.
  (FR-006, OI-92, closes the B1 blocking issue)
- [ ] T006 [US1] Re-measure active-puzzle counts per category on local, staging, and production RIGHT
  NOW (the `research.md` numbers are dated the moment this task runs — Settled Decision 7). Use the
  read-only query shape in `research.md` §"Pool counts per environment" via `node -e` per memory
  `reference_supabase_connection.md`. Record the fresh counts (and any drift from `research.md`) in
  `specs/057-mvp-launch-gate/research.md` under a new dated subsection — do not silently overwrite the
  prior dated numbers. (FR-001, OI-86)
- [ ] T007 [US1] Fix `connect-four/scripts/verify-undercut-puzzles.mjs`'s `.eq('approved', true)` filter
  (`puzzles` has no `approved` column, only `is_active boolean`) to filter on `is_active` instead.
  Verify locally: `node scripts/verify-undercut-puzzles.mjs` must return the 25 known active local
  undercut rows, not zero. (FR-002, OI-130)
- [ ] T008 [US1] Read-only audit (no writes): re-derive `highlight_metadata` for every live `overcut`,
  `undercut`, and `z_threat` row on staging and production against the current detectors
  (`evalOvercut`/`evalUndercut`/`evalZThreat` in `server/predicates.js`, as changed by T005), reusing
  `repair-overcut-highlight-metadata.js`'s dry-run/diff logic as the pattern (it already implements this
  for `overcut`; extend the read-only diff to `undercut`/`z_threat`, accounting for the shape
  differences noted in `data-model.md` — `z_threat` reads `.column`, `undercut`/`overcut` read
  `.cells[].role` with different role names, and `evalUndercut` additionally consults live solver
  `scores`). Record counts of match / stale / to-retire per category per environment — this is the input
  to T009's retire-and-refill pass. This task is read-only. (FR-005, OI-92, Decision 2 in spec.md
  widening the audit to all three metadata-graded categories)
- [ ] T009 [US1] Author `connect-four/server/scripts/fill-candidate-pools.mjs` — the one new script this
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
- [ ] T010 [US1] Per FR-003/FR-004's per-(category, environment) split (not per-category-globally,
  per `research.md`'s explicit correction): for every category below the N=20 floor on **local**
  (agent-run is fine — `requireLocalhost` admin endpoints are reachable), promote existing queued
  candidates via `POST /api/admin/candidates/approve-batch` where `correct_cols` is already populated,
  or generate fresh via `node server/scripts/generate_all_candidates.mjs --category <cat> --count N`
  where the environment's pending-candidate count is insufficient (re-check T006's fresh counts, not
  the epic's dated ones) — watch the 120 req/min rate limiter on bulk promotion loops (plain-text 429,
  opaque as a JSON decode error). Re-verify the floor immediately before considering a category cleared,
  per spec.md's Edge Cases ("every measurement expires"). `forced_win` specifically needs fresh
  generation, not promotion (OI-83 — its only puzzle was retired as AMBIGUOUS). (FR-003, FR-004, OI-83)
- [ ] T011 [US1] Dry-run `fill-candidate-pools.mjs --env staging` and `--env production` (dry-run only —
  no `--apply`, no agent write to live environments) to produce the exact per-category-per-environment
  remedy report (generate vs promote vs retire-and-refill), using T006's freshly re-measured counts and
  T008's audit output as the source of truth, not `research.md`'s dated snapshot. This report is the
  input to T014's `deployment_steps.md` entry. (FR-003, FR-004)
- [ ] T012 [US1] Add `docs/architecture/db-schema.md` documentation for the `puzzles`/`candidates`
  sections stating: (a) `is_active` is the real serving gate, not `approved` (which never existed —
  OI-130's root cause); (b) D1's resolved disposition policy — stale `overcut`/`undercut`/`z_threat` rows
  are retired (`is_active=false`) and the category refilled by `fill-candidate-pools.mjs`, never repaired
  in place — as the named policy for future detector changes. (Plan's Documentation-as-First-Class-Deliverable
  checklist item, D1's resolved `tasks.md` requirement)
- [ ] T013 [US1] `docs/deployment_steps.md` — add the collapsed, one-line-remedy entry for D1's retire-and-refill
  disposition (`overcut`/`undercut`/`z_threat`), following the "Spec 052 — overcut pool repair" entry's
  template verbatim but collapsed per the owner directive: data on staging/production is disposable, so
  the remedy is simply "retire the stale rows and refill via `fill-candidate-pools.mjs --apply`," not a
  multi-phase repair. This entry MUST still carry all six of `docs/deployment_steps.md`'s mandated
  template fields (Status / When / Blocks / Applies to / What's wrong / **Run it** / **Verify — command
  AND success condition** / **Roll back, or an explicit "not reversible"**) even though the body is
  short. (FR-005, FR-007, Deploy Prerequisites item 2)
- [ ] T014 [US1] `docs/deployment_steps.md` — add the content-pools entry naming, per category per
  environment (from T011's dry-run report), whether the remedy is promote, generate, or retire-and-refill,
  and pointing at `fill-candidate-pools.mjs --env <env> --apply` as the owner-run command, run **after**
  the corresponding code deploy (re-deriving against the current detector requires the current detector
  to be live — same ordering logic as the existing Spec 052 entry). This entry MUST carry all six of the
  file's mandated template fields explicitly (Status / When / Blocks / Applies to / What's wrong / **Run
  it** / **Verify — command AND success condition** / **Roll back, or an explicit "not reversible"**).
  (FR-003, FR-004, Deploy Prerequisites item 3)
- [ ] T015 [US1] **(Decision D-b — pool fill is a named launch gate.)** Add a `staging_checks.md` (repo
  root, NOT under `docs/`) sign-off item recording: the owner's `fill-candidate-pools.mjs --apply` run
  against staging AND production (referencing T014's remedy report), and the post-fill per-category
  active-puzzle counts for both environments, re-queried after the owner's run — not the pre-fill counts
  from T006/T011. Without this, the epic could close with a "launch-ready" statement while a category is
  still below floor on a live environment; SC-001's wording requires the counts to be measured directly
  against staging/production, not inferred from the mechanism shipping. This task only prepares the
  sign-off item — the agent does not and cannot run `--apply` against staging/production. (FR-003, FR-004, D-b)
- [ ] T016 [US1] Close out OI-92, OI-86, OI-83, and OI-130 in `docs/open_issues.md`, in this same
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

- [ ] T017 [US5] Fix the 5 stale fixture-path literals identified in T002 (add the missing `fv_suff/`
  directory segment): `connect-four/server/tests/branchInvariance.test.mjs:12`,
  `causalLinksComposers.test.mjs:11`, `reasonRenderFixes.test.mjs:10`, `renderCoverageCorpus.test.mjs:10`,
  and `renderCoverageUniverse.test.mjs:14` (the last one is `EVIDENCE_FILE`, not `CORPUS`, but the same
  missing segment). Fix all 5, not just the 2 the spec names as the FR-023 floor — identical root cause,
  identical one-line fix, no cost difference (`research.md`'s explicit decision). If T002 found a 6th
  file, fix that one too. (FR-022, FR-023, OI-82)
- [ ] T018 [US5] Re-run `npm run test:fast` and confirm 0 failures (or, for any failure that remains and
  is NOT one of the 5 fixed above, add its own justified `OI-N` per FR-022's "zero, or each carries an
  OI-N" bar — do not silently accept new red). Confirm the two "test #1"/"test #2" files
  (`renderCoverageCorpus.test.mjs`, `renderCoverageUniverse.test.mjs`) actually execute their assertions
  against the real corpus and pass, not merely stop dying before their first assertion. **If T035's
  boundary-case test (US4) is still `skip`-marked because D4 is unresolved when this task runs, its
  `skip` + accompanying `OI-N` (per T034) counts as "justified," not as new red** — confirm that OI-N
  exists before treating the suite as clean; do not silently accept an un-annotated skip either.
  (FR-022, FR-023)
- [ ] T019 [US5] Reconcile the migration ledger against disk and against what's actually applied on
  staging and production. Read-only: `ls connect-four/server/migrations/` plus
  `psql "$DATABASE_URL" -c "SELECT filename FROM schema_migrations WHERE filename LIKE '06%' ORDER BY filename;"`
  against both `.env.staging`/`.env.production`. Confirm/re-measure `research.md`'s finding: both `061`
  files coexist without conflict (filename-keyed, not numeric-prefix-keyed — `server/migrate.js:22,28-29`);
  the real gap is a 4-migration backlog (`061_correct_cols.sql`, `062_candidates_generation_run_unique.sql`,
  `063_puzzle_attempts_outcome_narrow.sql`, `064_drop_correct_col.sql`) never applied to either
  environment. Correct the "061_security_lints.sql absent from disk" premise in the OI-105 closeout text
  — that claim is false (it's on disk, git-committed `1fbcd4f`). (FR-026, OI-105)
- [ ] T020 [US5] Close OI-31 as a documentation-sync task: `docs/architecture/server-conventions.md:1501`
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
- [ ] T021 [US5] `docs/deployment_steps.md` — add/extend the schema-migration entry (Standing Checklist
  item 1) recording that the pre-existing, already-authored `061_correct_cols.sql`/`062`/`063`/`064`
  backlog is being cleared as part of this feature's close, cross-referencing (not restating)
  `064_drop_correct_col.sql`'s existing documented ordering constraint under "Spec 056 — Legacy
  `correct_col` scalar retirement" and `063`'s existing ordering under the Spec 054 entry. This entry MUST
  carry all six of the file's mandated template fields explicitly (Status / When / Blocks / Applies to /
  What's wrong / **Run it** / **Verify — command AND success condition** / **Roll back, or an explicit
  "not reversible"**). No new migration file is authored by this feature. (FR-029, Deploy Prerequisites
  item 1)
- [ ] T022 [US5] Add a `staging_checks.md` (repo root, NOT under `docs/`) sign-off item for OI-5: the
  owner runs `cd connect-four && node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>`
  against a real account, and records the result. State both outcomes' consequence explicitly: "rotation
  detected" → build the de-dup Map (new follow-on `OI-N`); "no rotation" → close OI-5 outright. This task
  only prepares the sign-off item — the agent does not and cannot run the probe (needs real credentials).
  (FR-024, OI-5)
- [ ] T023 [US5] Close out OI-82, OI-31, and OI-105 in `docs/open_issues.md` (fully-fixed, since T017-T021
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

- [ ] T024 [US2] Harvest the real served explanation string reproducing OI-126 for board
  `455c5272-3143-43d4-aa3f-c10f9d061666` — per `docs/open_issues.md`'s OI-126 repro steps — and check it
  into a test fixture. Do NOT invent a string containing `c3-c6`; it must be the real served text
  (`CLAUDE.md` §"Harvest fixtures; never invent them"). (FR-009)
- [ ] T025 [P] [US2] Write a regression test in `connect-four/server/tests/reasonRenderGuard.test.mjs`
  (new, or extended if the file already exists) asserting `stripInternalTokens` strips bare (`c3`),
  ranged (`c3-c6`), and paired (`c3r4`) forms from T024's harvested string, in both `locale='en'` and
  `locale='es'`, and does NOT corrupt legitimate prose containing a lone "c" followed by a digit outside
  a coordinate context. This test MUST fail against the current `CXRY_RE` (`server/reasonRenderGuard.mjs:25`,
  `/\bc(\d+)r\d+\b/gi` — paired form only) before T026 lands. (FR-008, FR-009, OI-126)

### Implementation for User Story 2

- [ ] T026 [US2] Widen `stripInternalTokens`/`CXRY_RE` in `connect-four/server/reasonRenderGuard.mjs` to
  also match bare (`c3`) and ranged (`c3-c6`) internal-coordinate forms, reusing the existing
  `columnWord(col)` mapping for the replacement text and adding a locale-aware connector for the ranged
  form (Spanish degrades to English silently on any new untranslated string — verify the connector has
  an `es` translation, not just `en`, per memory `project_spanish_output_silent_fallback`). Confirm the
  regex still does not eat legitimate prose (e.g. "column 3" or a sentence ending in "c." followed by a
  digit in an unrelated context) — add a negative-case assertion to T025's test. (FR-008)
- [ ] T027 [US2] Sample at least 50 recent `explanation_cache` rows that name a board region (or the full
  set if fewer than 50 exist — state this explicitly in the OI-129 closeout if so) and check each for a
  corresponding `[zone:…]` annotation. Record the measured failure rate AND the sample size (a 0% result
  must carry a stated floor, per FR-011's explicit requirement — not an unfloored "0 failures found").
  This measurement is read-only against `explanation_cache` (local or staging read is fine; do not
  write). (FR-011, OI-129)
- [ ] T028 [GATED:D3] [US2] Only if the owner's D3 resolution selects "wire `validateAnnotation` into
  the live path" (see `research.md` §D3 — the plan's recommended default is regex-only, i.e. do NOT
  wire the gate in unless the owner explicitly overrides that default): wire `annotationGate.js`'s
  `validateAnnotation` (`server/annotationGate.js:486`) into `guardExplainMovePayload`/
  `guardExplainMoveLlmPayload` (`server/reasonRenderGuard.mjs:80,99`), choose a failure policy (strip
  the offending span / retry the LLM / serve-and-log), and MEASURE the added latency against the
  Explanation Engine's <2s budget (Constitution V) as part of this task's own acceptance — do not assume
  it's free. If the owner has not resolved D3 by the time this task would run, SKIP this task and record
  the regex-only outcome (T026) as the shipped answer in the OI-124 closeout (T030), per FR-010's
  "or the fix stays regex-only with the gap recorded against OI-124" branch. (FR-010, D3)
- [ ] T029 [US2] `docs/architecture/server-conventions.md` — update the existing Annotation Gate section
  (`:1166-1209`) to record D3's outcome (regex-only-for-now, or wired-in per T028), whichever actually
  shipped. (Plan's Documentation-as-First-Class-Deliverable checklist item, D3's `tasks.md` requirement)
- [ ] T030 [US2] Close out OI-126 (fully-fixed — T026/T025 ship code + a real-fixture regression test),
  OI-124 (per T028/T029's actual outcome — either fully-fixed if the gate got wired, or
  deliberately-not-fixed with D3's regex-only rationale and a pointer to the latency-measurement
  follow-on if the owner later reverses the default), and OI-129 (per T027's measured rate — either
  extended detection if the rate warrants it, or deliberately-not-fixed with the measured rate AND
  sample size as the stated rationale) in `docs/open_issues.md`. (FR-027, FR-028)
- [ ] T031 [US2] `docs/deployment_steps.md` — add the caches entry (Standing Checklist item 5) stating
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

- [ ] T032 [US4] Establish the real call-site count for OI-125's invariant — do NOT assume "five".
  `grep -rn "from('blunders')" connect-four/server/` for every `.eq('quality', ...)`-shaped filter
  (there should be none — that's the invariant), AND explicitly check
  `connect-four/server/blunderCountsForGames.js` (named directly in OI-125's own "Area" field in
  `docs/open_issues.md:4598`, never grepped in the epic's original research). Cross-check against
  `data-model.md`'s already-found list of 8 in-process `quality`-touching sites (`evaluateMoveHandler.js:109`,
  `index.js:2249`, `index.js:2498-2499`, `gameSampling.js:170`, `insertGameBlunder.js:28`,
  `moveQualityScorer.js:39,55`, `papergamesImporter.js:116`, plus two offline scripts) and record the
  true, current, verified set — this is the input to T036. (OI-125, the handoff's explicit "first task,
  not an assumed number" directive)
- [ ] T033 [US4] Trace where `scoreMove` (`server/moveQualityScorer.js:9`) and `classifyStoredMistake`
  (`server/mistakeStorageRule.js:81`) actually diverge, given the epic's own note that "the two
  thresholds are mathematically identical" — this trace task answers D4 by evidence and is generated
  now, ungated, per the handoff's explicit D4 exemption (this task itself is what the D4 gate would
  otherwise circularly depend on). Confirm/refute `research.md`'s finding that
  `reconstructAnalysisFromBlunders` (`server/index.js:2223`, called at `:2378`) already reads from
  storage, making "stored authoritative" the smaller diff. Record the concrete divergence mechanism
  (not just "they can differ") as the evidence for the owner's D4 call. (FR-019 trace, D4, OI-104)
- [ ] T034 [US4] Write a test exercising one real boundary-case move through both the live scoring path
  (`scoreMove`) and the cached-reconstruction path (`reconstructAnalysisFromBlunders` →
  `classifyStoredMistake`), asserting identical `quality` output. This test is written NOW (ungated) and
  is EXPECTED to fail before T035 lands — it documents the current divergence and becomes the FR-020
  regression test once T035 resolves it. Use a real move harvested from the existing test suite or KB
  per `CLAUDE.md`'s movestring-sourcing rules (never construct one by hand). **If D4 is still unresolved
  when US4's phase closes, this test MUST ship `skip`-marked with a new `OI-N` recording why**, so
  T018/T054/SC-008's zero-RED gate stays honest instead of silently carrying a permanent failure — do not
  leave it red and unexplained. (FR-020 — test only; the fix itself is T035)
- [ ] T035 [GATED:D4] [US4] Once the owner confirms D4 (which label — `scoreMove` live judgment or
  `classifyStoredMistake` stored rule — is authoritative; `research.md`'s recommended default is
  `classifyStoredMistake`, the smaller diff since `reconstructAnalysisFromBlunders` already reads from
  storage), bring the losing path into line with the winning one — per Constitution II, this REMOVES the
  divergence (backfill/re-derive or stop the cached view from diverging), it does not add a permanent
  reconciliation layer alongside both. Per the owner directive, no backfill of already-stored `blunders`
  rows on staging/production is required if D4 resolves toward the stored rule (nothing there is stored
  under the "wrong" definition — it's already the storage rule); if D4 resolves toward the live rule
  instead, document the simpler remedy as a deploy step (T037), not repair tooling. T034's test must
  pass after this task, and its `skip` marker (if any) and OI-N must be removed. (FR-019, D4)
- [ ] T036 [US4] Name the "never filter `blunders` by `quality` when counting mistakes" invariant in code
  (a named constant/comment/helper, not five independently-written comments) using T032's verified
  call-site list, and add a guard test at more than one of those sites (extend
  `tests/unit/blunderCountsForGames.test.js`'s existing pattern — it already asserts
  `supabase.calls[0].filters.quality === undefined` for one site — to cover `/api/coach/category-counts`
  and the duplicated `summaryPhraseKey` branches at `server/index.js:2259-2261` and `:2500-2502`, per
  OI-125's own "If picked up" note). (FR-021, OI-125)
- [ ] T037 [US4] `docs/architecture/db-schema.md` — update the `blunders` section documenting which of
  `scoreMove`/`classifyStoredMistake` is authoritative post-D4 and why the other code path still exists
  (or was removed). If D4 resolved toward the live rule and a deploy step is needed, add it to
  `docs/deployment_steps.md` per the owner directive's "simpler option, documented, not built as repair
  tooling" framing. **If D4 is still unresolved when this task would run, give it the same skip-and-record
  treatment as T034**: document the trace evidence from T033 and the pending owner decision instead of a
  resolved policy, so Constitution VIII's documentation gate is not silently dropped while the gate stays
  open. (Plan's Documentation-as-First-Class-Deliverable checklist item, D4's `tasks.md` requirement)
- [ ] T038 [US4] Close out OI-104 (per T035's actual resolution — fully-fixed if D4 landed, or
  deliberately-not-fixed with the trace evidence from T033 and a pointer to the pending owner decision if
  D4 is still unresolved when this closes) and OI-125 (fully-fixed — T032's verified call-site list +
  T036's named invariant + guard tests) in `docs/open_issues.md`. (FR-027, FR-028)

**Checkpoint**: T034's boundary-case test passes with identical `quality` from both paths (or ships
`skip`-marked with a recorded `OI-N` if D4 is still open); OI-125's invariant is named and guarded at ≥2
real call sites.

---

## Phase 7: User Story 3 - The paid-conversion and billing-recovery paths both complete (Priority: P5)

**Goal**: `/pricing` auto-opens checkout for a real `?_ptxn=`; a signed-out visitor and a free-tier
subscriber see distinguishable locked-lesson CTAs; OI-41 is re-confirmed or closed won't-fix.

**Independent Test**: open `/pricing?_ptxn=<real-id>` against a production build in a real browser,
confirm Paddle.js initializes on mount and checkout auto-opens, no CSP violation.

### Tests for User Story 3

- [ ] T039 [P] [US3] Write a unit test asserting `PricingScreen.jsx`'s mount-time effect calls
  `getPaddle()` unconditionally (not only from a click handler) and, when a `?_ptxn=` query param is
  present, calls the checkout-open path for that transaction id. Cover the edge case explicitly: an
  expired/invalid `_ptxn` still initializes Paddle.js (page is never worse than today) and fails the
  auto-open gracefully. (FR-013)
- [ ] T040 [P] [US3] Write/extend tests for `src/screens/sagaLock.js`'s three chained functions
  (`deriveLockReason:12`, `dispatchLockAction:30`, `deriveLessonAccess:44`) covering the new `'signin'`
  outcome threaded through all three — specifically the interaction between `'signin'` and the existing
  `'both'` (tier-AND-order-locked) case flagged as unscrutinized in the handoff (FR-017's "Scrutinize"
  note: this is not an obvious substitution). Assert a signed-out visitor gets `'signin'` regardless of
  tier/order lock state, and a signed-in free-tier user still gets the existing `'upgrade'`/`'orderLock'`
  behavior unchanged. (FR-017)

### Implementation for User Story 3

- [ ] T041 [US3] `src/lib/useUpgradeCheckout.js` / `src/screens/PricingScreen.jsx` — add a mount-time
  `useEffect` that calls `getPaddle()` (currently only called at `useUpgradeCheckout.js:119,160` inside
  async click handlers) and, if `?_ptxn=` is present in the URL, auto-opens the checkout for that
  transaction id once Paddle.js has initialized. `/pricing-legal` is untouched and stays JavaScript-free.
  (FR-013, FR-015)
- [ ] T042 [US3] **(B2 — verify the corrected FR-017 file map, sequenced before T043.)**
  `specs/057-mvp-launch-gate/data-model.md` §"Entitlement signal" and `plan.md`'s `UpgradeModal.jsx`
  Source Code map annotation were already corrected this session to match FR-017 (the real chain is
  `useLessonLockGuard.js` → `sagaLock.js` → `SagaScreen.jsx`/`UpgradeModal.jsx`/`AuthModal.jsx`, NOT the
  three lesson screens — `ConceptScreen.jsx`/`SocraticScreen.jsx`/`CLChallengeScreen.jsx` never render
  locked-lesson copy at all, since `useLessonLockGuard.js` redirects to `'saga'` before any of them
  mount). Before T043-T046 implement against this map, spot-check `data-model.md` and `plan.md` once
  more for drift (e.g. a concurrent `/speckit-tasks` re-run reintroducing the superseded three-screen
  framing) — the artifacts must stay corrected so the contradiction cannot silently resurface. (FR-017)
- [ ] T043 [US3] `src/lib/useLessonLockGuard.js` — thread the `GET /api/user/entitlement` response's
  existing `authenticated` signal into `sagaLock.js`'s `tier` parameter (confirmed genuinely new wiring
  per the handoff — this signal is not currently threaded in). No change to the entitlement API
  contract. (FR-017)
- [ ] T044 [US3] `src/screens/sagaLock.js` — add the `'signin'` outcome to `deriveLockReason`
  (`:12`, extend its `'none'|'tier'|'order'|'both'` return set only if needed for the new distinction —
  verify against T040's test whether `'signin'` belongs on this function or is derived downstream),
  `dispatchLockAction` (`:30`, add `'signin'` alongside `'upgrade'|'orderLock'|'navigate'`), and
  `deriveLessonAccess` (`:44`, add `'signin'` alongside `'allowed'|'upgrade'|'orderLock'`) — all three,
  not just the last one. (FR-017)
- [ ] T045 [US3] `src/screens/SagaScreen.jsx` (`:305` renders `UpgradeModal` on `lockAction:'upgrade'`) —
  add a `lockAction:'signin'` branch that renders the existing `AuthModal.jsx` (precedent:
  `HomeScreen.jsx:156`) instead of `UpgradeModal.jsx`. No new component. (FR-017)
- [ ] T046 [US3] `src/components/UpgradeModal.jsx` — confirm it does NOT need to distinguish "sign in"
  vs "upgrade" copy itself once T045 routes the signed-out case to `AuthModal.jsx` instead; if any
  residual ambiguity remains (e.g. a shared parent component choosing which modal copy to show before
  routing), resolve it there. Reuse existing i18n keys/copy patterns per Constitution IV — no new
  terminology inconsistent with other locked-content cards in the app. (FR-017)
- [ ] T047 [US3] `docs/open_issues.md` — re-confirm OI-41 as an accepted risk scoped to
  `/pricing-legal`'s hardcoded price/quota literals, or close it won't-fix — this is the owner's call to
  make explicit in this closeout (agent proposes the recommended framing per the epic's Settled decision
  5, owner confirms). No pricing-page redesign work. (FR-018, OI-41)
- [ ] T048 [US3] `docs/deployment_steps.md` — the FR-016 owner action (pointing Paddle's dashboard
  default-payment-link setting at `/pricing`) is the SAME action already queued in the existing
  Spec 053 entry ("Paddle dashboard config" §) — AMEND that existing PENDING entry to reference this
  story's `/pricing` mount-time-init change, do NOT add a second entry about the same setting. (FR-016,
  the handoff's explicit "amends the existing PENDING Spec 053 entry" directive)
- [ ] T049 [US3] `staging_checks.md` (repo root) — add sign-off items for: (a) FR-014, CSP verified
  against a real production build (`npm run build && node server/index.js`, then a real browser check of
  `/pricing?_ptxn=<id>` for zero `Refused to ...` console lines — CSP is invisible under `npm run dev`);
  (b) FR-016, the owner's real sandbox transaction confirming the payment-method-update email reaches an
  open checkout. Neither is agent-run. (FR-014, FR-016)
- [ ] T050 [US3] Close out OI-98 (partially-fixed — T041's agent-satisfiable half ships; T049's
  owner-gated half stays open until the owner signs off), OI-95 (fully-fixed — T043-T046 ship the
  client-side branch), and OI-41 (per T047's outcome) in `docs/open_issues.md`. (FR-027, FR-028)

**Checkpoint**: `/pricing?_ptxn=` auto-opens checkout on mount (verified locally against a production
build per `quickstart.md`); signed-out vs free-tier lock copy is distinguishable; OI-41 has a recorded
disposition.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Epic-wide requirements that only make sense once every story has landed.

- [ ] T051 Sweep `docs/deployment_steps.md` against its own Standing Checklist (6 categories) one more
  time across all five stories' entries (T013, T014, T021, T031, T048, plus US1/US4's D1/D4-conditional
  entries) — confirm nothing was left as "N/A" without being explicitly walked, per the plan's Deploy
  Prerequisites section walking all six categories explicitly. Confirm every entry carries the six
  mandated template fields (T013/T014/T021/T031 in particular) and that T031's `explanation_cache`
  TRUNCATE entry states "not reversible" explicitly. Confirm the FR-016 Paddle entry amended the existing
  Spec 053 entry rather than duplicating it (T048). (FR-029)
- [ ] T052 Full `docs/open_issues.md` traceability check: confirm all 16 in-scope issues (OI-92, OI-86,
  OI-83, OI-130, OI-126, OI-124, OI-129, OI-98, OI-95, OI-41, OI-104, OI-125, OI-82, OI-5, OI-31, OI-105)
  carry a disposition, using `quickstart.md`'s closing grep as a mechanical check, followed by a manual
  read of each entry (a grep count is not proof of correct disposition). (FR-027, SC-009)
- [ ] T053 Confirm any new defect discovered during T001-T050 that was NOT one of the 16 in-scope issues
  got its own new `OI-N` in `docs/open_issues.md`, not a memory-file note. (FR-028)
- [ ] T054 Write the FR-030 launch-readiness statement: for each of the 5 user stories, state
  shipped-or-deferred-with-reason (explicitly noting every owner-gated item still pending: **T015's
  `fill-candidate-pools.mjs --apply` run against staging AND production (Decision D-b)**, T022's OI-5
  probe, T028's D3 call if unresolved, T035's D4 call if unresolved, T049's `staging_checks.md`
  sign-offs), and give a direct answer to whether the owner can launch. This is a written closeout
  artifact (e.g. appended to `specs/057-mvp-launch-gate/quickstart.md` or a new closing section in
  `spec.md`), not a script output. (FR-030, SC-009, D-b)
- [ ] T055 [P] Final `npm run test:fast` run from a clean checkout as the closing gate check — must match
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
  picking a real boundary-case move; T035 (D4-gated) depends on T034's failing test and T033's trace;
  T036 depends on T032's verified call-site list; T037 depends on T035's actual resolution (or T033's
  trace evidence if D4 is still open); T038 (closeout) last.
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

### Gated tasks — do not start without an owner answer

- **T028** [GATED:D3] — US2's optional `annotationGate.js` live-path wiring (default: skip, ship
  regex-only).
- **T035** [GATED:D4] — US4's `scoreMove`/`classifyStoredMistake` reconciliation implementation.

**D1 is RESOLVED (retire and refill, 2026-08-03) — no longer a gate.** T009 implements D1's disposition
directly; there is no `[GATED:D1]` task in this file.

Every other task in these stories (audits, traces, tests-that-are-expected-to-fail, the mandatory
regex fix, the invariant-naming, the B1 grader fix) is ungated and should proceed regardless of whether
D3/D4 have been answered yet.
