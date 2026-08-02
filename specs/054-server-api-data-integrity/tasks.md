# Tasks: Server/API Data Integrity & Environment Correctness

**Input**: Design documents from `/specs/054-server-api-data-integrity/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/api-changes.md

**Tests**: Included — FR-005, FR-011, FR-012b, and FR-023 explicitly mandate automated tests; this
epic follows `server/anonBlunderAccess.js`'s extraction pattern (pure module + `*.test.mjs`) since
`server/index.js` exports no testable `app` (research.md D10).

**Test-runner reality (read before writing any test task)**: `connect-four/package.json` does NOT
use globs anywhere. All three `node --test` scripts are explicit, hand-maintained file-path lists:
`test:dom` (`package.json:14`, 13 individually-named `tests/dom/*.dom.test.jsx` files), `test`
(`package.json:16`, the broadest list), and `test:fast` (`package.json:17`, excludes
`tests/integration/candidate-generator.test.js` and all `tests/dom/*`). A new `*.test.mjs` /
`*.dom.test.jsx` file that is not appended to the relevant list(s) simply never runs — this is not
hypothetical: `connect-four/tests/blunder/blunderTagConstraint.test.js` exists on disk today and
appears in NEITHER `test` nor `test:fast`, an already-dead guard test. Every task below that creates
a new test file is paired with an explicit registration task; do not treat "file exists" as
equivalent to "gate covers it."

**Organization**: Tasks are grouped by user story (US1–US4, matching spec.md's four independently
testable stories and the epic's US4.1–US4.4). All four stories are independently implementable in
any order — none blocks another (spec.md "Assumptions"). Per FR-033 ("closeout lands in the same
change that ships its fix or verification"), each story's `docs/open_issues.md` closeout(s) are that
story's own closing task(s), not batched at the end — see each phase below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 | US2 | US3 | US4
- File paths are relative to the repo root unless stated otherwise; all live under `connect-four/`
  except `docs/`, `docs/epics/`, `docs/open_issues.md`, and `staging_checks.md`.
- Task IDs with a letter suffix (e.g. `T003a`) are new tasks inserted during plan-critique
  remediation, added to avoid renumbering every downstream reference; they slot in immediately after
  the task they depend on.

---

## Phase 1: Setup

**Purpose**: Establish the two test-suite baselines FR-034's gate depends on, before any change in
this epic can be judged against them.

- [x] T001 [P] Run `npm run test:fast` from `connect-four/` on a clean checkout and record the
  current RED count/names in a scratch note (expected: 5 pre-existing RED per
  `project_repo_worktree_setup` memory §2d — confirm this still holds; do not assume it without
  running it). This is the baseline every later `test:fast` run in this epic is judged against, not 0.
- [x] T002 [P] Run `npm run test:dom` from `connect-four/` on a clean checkout and record its
  pre-existing pass/fail baseline (FR-034 amendment / Decision 3 — no baseline currently
  established). This is the baseline every later `test:dom` run in this epic is judged against.

**Checkpoint**: Both baselines recorded — every story's checkpoint below compares against these, not
against a zero-failure assumption.

---

## Phase 2: Foundational

**None.** Per spec.md's explicit design ("the four user stories are independently implementable and
testable in any order; no story in this epic requires another to land first"), there is no shared
blocking infrastructure — each story's own phase below is self-contained. (T001/T002 in Setup are
cross-cutting baselines, not story-blocking foundational work.)

---

## Phase 3: User Story 1 — Request context is always complete and never shared (Priority: P1) 🎯 MVP

**Goal**: Anonymous `device_uuid` writes are stable/reproducible per client and never the literal
`'anonymous'`; `req.user.email` is populated for signed-in users; `chooseSparringMove` never returns
`col: undefined`.

**Independent Test**: `POST /api/puzzles/:id/check` and the games-insert path with no `deviceUuid`
supplied write a stable, reproducible (never-`'anonymous'`, never-fresh-per-request) identifier;
signed-in `req.user.email` is populated and the Paddle checkout overlay pre-fills it;
`POST /api/scores` on a full board returns an explicit terminal signal.

### Tests for User Story 1 (write first, confirm they FAIL before implementation)

- [x] T003 [P] [US1] Write `connect-four/server/deviceIdentity.test.mjs` covering
  `resolveDeviceUuid(req, res, bodyValue)`'s three branches per research.md D1: (a) `bodyValue`
  supplied → returned unchanged, no cookie minted; (b) no `bodyValue` but
  `req.cookies.dc4_device_uuid` present → that value returned, no new mint; (c) neither present →
  `crypto.randomUUID()` minted, `res.cookie('dc4_device_uuid', uuid, { ...cookieOpts(), maxAge:
  REFRESH_TOKEN_MAX_AGE })` called once, the minted value returned. Follows
  `connect-four/server/anonBlunderAccess.test.mjs`'s precedent (pure module import, no HTTP
  harness). FR-005.
- [x] T003a [US1] Append `server/deviceIdentity.test.mjs` (T003) to both `connect-four/package.json`'s
  `test:fast` script (`:17`) and its broader `test` script (`:16`) — do NOT add it to `test:dom`
  (`:14`), which is a disjoint list for jsdom component tests only. `test:fast`'s file-path array has
  no glob support; a file left out never runs under `npm run test:fast`, silently making this story's
  FR-034 gate vacuous for T003. This is a hard precondition of this story's checkpoint below, not a
  polish item. Depends on T003.
- [x] T004 [P] [US1] Add a regression test to `connect-four/tests/unit/chooseSparringMove.test.js`
  for a full (42-move / no playable column) board: assert `chooseSparringMove` (or its caller) signals
  an explicit terminal/error condition, never returns a column with `col: undefined` silently
  reaching the response. FR-008. (`chooseSparringMove.test.js` is already registered in both `test`
  and `test:fast` — `package.json:16`/`:17` — no registration task needed.)

### Implementation for User Story 1

- [x] T005 [US1] Create `connect-four/server/deviceIdentity.js` exporting
  `resolveDeviceUuid(req, res, bodyValue)` per research.md D1: read `bodyValue`, else
  `req.cookies?.dc4_device_uuid`, else mint via `crypto.randomUUID()` and set the
  `dc4_device_uuid` cookie via the existing `cookieOpts()` helper (`server/index.js:335-342`) with
  `maxAge: REFRESH_TOKEN_MAX_AGE` (`server/index.js:345`); always return the identifier, never throw
  or produce a 400. Neither `cookieOpts()` nor `REFRESH_TOKEN_MAX_AGE` is currently exported from
  `server/index.js` (verified) — extract both to named exports there and import them into
  `deviceIdentity.js`; do not duplicate the cookie-shape literal. Makes T003 pass. FR-001, FR-002.
- [x] T006 [US1] In `server/index.js`'s `POST /api/puzzles/:id/check` handler (~:2514), replace
  `const deviceUuid = req.user?.device_uuid || req.body.deviceUuid || 'anonymous';` with a call to
  `resolveDeviceUuid(req, res, req.body.deviceUuid)`, and add `deviceUuid` to the handler's
  `res.json({...})` response (~:2542-2549), per `contracts/api-changes.md`'s
  `{ result, correctCol, tiedWith, threatCells, forbiddenCols, deviceUuid }` shape. FR-001.
- [x] T007 [US1] In `server/index.js`'s games-insert handler (~:1897), replace
  `device_uuid: device_uuid || req.user?.id || 'anonymous'` with
  `device_uuid: req.user?.id ?? resolveDeviceUuid(req, res, device_uuid)` (preserve the existing
  precedence: an authenticated `req.user.id` still wins; only the previously-`'anonymous'` fallback
  path changes). No new response field needed here (`GameScreen.jsx` already has
  `profile.device_uuid` to send in the normal case — contracts/api-changes.md `POST /api/games`
  section). FR-002.
- [x] T008 [US1] Audit `POST /api/puzzles/:id/sequence/move` (`server/index.js:2558-2625`) for any
  server-side `device_uuid`/`puzzle_attempts` write: as read during planning, this handler returns
  only `{ outcome, threatCells|aiCol|reason }` and does **not** insert into `puzzle_attempts` or
  reference `device_uuid` at all (unlike `/check`, which is the actual `~:2514` write site). Record
  this finding as part of FR-003's audit — no code change is needed at this handler for the
  device-identifier fix; do not add an unused `deviceUuid` response field here. This audit finding
  has also been recorded in `contracts/api-changes.md`'s `/sequence/move` section (struck of its
  earlier, aspirational `deviceUuid` claim) — keep that doc in sync if this audit changes. FR-003.
- [x] T009 [US1] Document FR-003's audit finding for both fixed endpoints: real no-`deviceUuid`
  callers are `ChallengeScreen.jsx:511` (`POST /api/puzzles/:id/check`, permanently relies on the
  server-minted cookie per Decision 2) and `GameScreen.jsx:60-77` (`POST /api/games`, only its `''`
  fallback path needs the cookie — it otherwise already sends `profile.device_uuid`).
  `SupabaseStore.recordPuzzleAttempt` → `POST /api/user/puzzle-attempts`
  (`server/userRoutes.js:343-344`) is confirmed always-authenticated and out of scope. Add this as a
  code comment near `resolveDeviceUuid`'s definition (T005) rather than only in this task list.
  FR-003.
- [x] T010 [US1] Check whether any existing `puzzle_attempts` or `games` rows hold the literal
  `'anonymous'` device identifier (a throwaway query against staging/production per
  `reference_supabase_connection.md`'s connection convention — `.env` at
  `connect-four/server/.env`, `cd connect-four` first, `SUPABASE_SERVICE_ROLE_KEY`). Record the
  count found and a decision on cleanup (or "none found, no cleanup needed") inline in this task or
  in the PR description. FR-004.
- [x] T011 [US1] In `server/index.js`'s `loadUser()` (~:506-531), add `email: data.user.email` to the
  `req.user` object construction. At source (~:531) this is a single-line ternary,
  `req.user = profile ? { id: data.user.id, ...profile } : { id: data.user.id, ...defaultUserProfile() };`
  — both the profile-found and `defaultUserProfile()` fallback branches are covered by one edit to
  this one line (add `email: data.user.email` to both object-spread literals in place), not two
  separate edits. No new DB column, per FR-006's "no new database column required." FR-006.
- [x] T012 [US1] Confirm `POST /api/paddle/create-checkout` (`server/paddleRoutes.js:50`, already
  reads `req.user.email` into `paymentProcessor.createCheckout({..., email: req.user.email, ...})`)
  now receives a real email post-T011, and that
  `server/userRoutes.js:109`'s `GET /api/user/profile` explicit-projection response (which never
  spreads `req.user` verbatim) is unaffected by the new field. Manually verify per
  quickstart.md US1 step 5 (log the received `email` argument locally, since Paddle-configured
  responses omit it). FR-007.
- [x] T013 [US1] In `connect-four/server/classifier.js`'s `chooseSparringMove` (~:518-549) and its
  caller in `server/index.js` (`POST /api/scores`, ~:990-1013), make a no-playable-column board
  return an explicit terminal/4xx signal (e.g. `{ error: 'no legal move' }` with a 4xx status, or an
  explicit `terminal: true` field) instead of a response containing `col: undefined`. Makes T004
  pass. FR-008.
- [x] T014 [US1] Document the full `req.user` shape (including the new `email` field from T011) in
  `docs/architecture/api-conventions.md`, updating its existing `req.user` description
  (`{ id, tier, deep_reveal_count, deep_reveal_reset_at, device_uuid, papergames_id, last_import_at,
  paddle_customer_id, onboarding_status }`) to add `email`, and noting the degrades-to-`undefined`
  case (no Supabase email on the account) per `contracts/api-changes.md`. FR-009.
- [x] T046 [US1] Close out **OI-40** in `docs/open_issues.md` (`## OI-40`, ~:938) — mark
  ✅ RESOLVED with today's date, describing the `resolveDeviceUuid`/`dc4_device_uuid` cookie fix
  (T005-T007) and citing the file/symbol. Depends on T006, T007.
- [x] T047 [US1] Close out **OI-53** in `docs/open_issues.md` (`## OI-53`, ~:1174) — mark ✅ RESOLVED,
  citing `loadUser()`'s new `email` field (T011) and the `api-conventions.md` doc update (T014).
  Depends on T011, T014.
- [x] T048 [US1] Close out **OI-17** in `docs/open_issues.md` (`## OI-17`, ~:371) — mark ✅ RESOLVED,
  citing `chooseSparringMove`'s terminal-signal fix (T013) and its regression test (T004). Depends on
  T013.

**Checkpoint (per quickstart.md US1 + FR-034)**: T003a has landed (T003 is runnable via
`npm run test:fast`). Run quickstart.md's US1 steps 1-6 manually; run `npm run test:fast` and
`npm run test:dom` from `connect-four/` and confirm no new failures beyond the T001/T002 baselines.
T046-T048 (this story's OI closeouts) are done.

---

## Phase 4: User Story 2 — Every paginated or retried write is provably safe to repeat (Priority: P2)

**Goal**: `GET /api/games` and `GET /api/admin/candidates` have deterministic sort keys across page
boundaries; a candidate-insert retry after a lost acknowledgment cannot duplicate rows.

**Independent Test**: Seed rows sharing identical sort-key values, page both endpoints across
separate requests, confirm no row is skipped/duplicated; force a candidate-insert retry and confirm
no duplicate row lands in `candidates`.

**Test-seam note (Blocking issue 2b, plan-critique step)**: every `tests/integration/*.js` file plus
`tests/unit/coachQueuePagination.test.js` and `server/anonBlunderAccess.test.mjs` was checked for
`createClient`/`SUPABASE_SERVICE_ROLE_KEY` — ZERO matches. This repo's fast suite is entirely
pure-module / source-parse based; it never seeds a live database. T016 and T017 below are therefore
written as CI-safe, DB-free assertions over (a) the query-shape/comparator source directly and (b) a
parse of the migration SQL — the same technique
`connect-four/tests/blunder/blunderTagConstraint.test.js` already uses to assert code-vs-constraint
parity by parsing the newest migration file, "without requiring a DB connection." A mock-based
DB-seeding test was explicitly rejected: it would test the test's own belief about Supabase's
`.order()`/`.range()` behavior, the same anti-pattern `tests/getGames.test.js` demonstrates and
research.md D10 warns against. This does **not** introduce a DB-backed integration-test category —
quickstart.md's manual US2 steps 2-3 remain the real-environment confirmation; these tests are
additional, not a replacement.

### Tests for User Story 2 (write first, confirm they FAIL before implementation)

- [x] T015 [P] [US2] Write `connect-four/server/gamesSort.test.mjs` seeding `unified`-shaped rows
  (mirroring `server/index.js:2058-2090`'s per-source shape) with tied primary-sort values (tied
  `created_at` for the `'recent'` comparator, tied `accuracy` for `'played_well'`, tied
  `blunder_count` for `'worst_blunders'`) across a simulated `slice(offset, offset+limit)` page
  boundary; assert the `id`-tiebreaker comparator produces a stable total order with no row skipped
  or duplicated across two successive slices. FR-011.
- [x] T016 [P] [US2] Write `connect-four/tests/unit/adminCandidatesPagination.test.js` as a **source-parse
  assertion, not a DB-seeded test** (per the test-seam note above): read
  `connect-four/server/index.js`'s source text and assert the `GET /api/admin/candidates` handler's
  query-builder chain contains `.order('created_at'` immediately followed by
  `.order('id'` before its `.range(...)` call — i.e. assert the query *shape* that guarantees
  every-row-exactly-once pagination exists in the shipped code, the same DB-free technique
  `blunderTagConstraint.test.js` uses to assert a constraint's shape without a live database. FR-012b.
- [x] T017 [P] [US2] Write `connect-four/server/candidatesUpsert.test.mjs` as two DB-free source-parse
  assertions (per the test-seam note above): (a) parse
  `connect-four/server/migrations/062_candidates_generation_run_unique.sql` and assert it contains
  `CREATE UNIQUE INDEX` on `public.candidates (generation_run_id, move_string)` — mirroring
  `blunderTagConstraint.test.js`'s migration-parsing precedent; (b) read `server/index.js`'s source
  text and assert the candidate-insert retry call site uses
  `.upsert(rows, { onConflict: 'generation_run_id,move_string', ignoreDuplicates: true })` rather than
  a bare `.insert(rows)`. Together these prove a retried insert cannot duplicate a row once T021/T022
  land, without seeding a live database. FR-012.
- [x] T015a [US2] Append `server/gamesSort.test.mjs` (T015), `tests/unit/adminCandidatesPagination.test.js`
  (T016), and `server/candidatesUpsert.test.mjs` (T017) to both `connect-four/package.json`'s
  `test:fast` (`:17`) and `test` (`:16`) scripts — none belong in `test:dom` (`:14`). Hard
  precondition of this story's checkpoint below. Depends on T015, T016, T017.

### Implementation for User Story 2

- [x] T018 [US2] Live-DB pre-check for FR-012a/D4a (BEFORE writing migration 062): query `candidates`
  on every reachable environment (staging/production, per `reference_supabase_connection.md`) for
  `(generation_run_id, move_string)` groups with `count > 1`. Record the exact count found in the
  migration comment (T021) — do not assume zero without recording that it was checked.
- [x] T019 [US2] Add a final deterministic `id`-based tiebreaker to each of `GET /api/games`'s three
  `unified.sort()` comparators (`server/index.js:2101-2114`, the `'played_well'`/`'worst_blunders'`/
  else branches) — when the primary key ties, break by `a.id` vs `b.id` string compare. This is a
  pure JS comparator change at the `unified.sort()` call site, no SQL `.order()` added (research.md
  D2 — audit-not-copy). Extract the sort logic into `connect-four/server/gamesSort.js` (exporting the
  three comparators) so T015's test can import it directly, and have `server/index.js` import from
  there instead of defining the comparators inline. Makes T015 pass. FR-010, FR-011.
- [x] T020 [US2] Add `.order('id', { ascending: true })` after the existing
  `.order('created_at', { ascending: true })` in `GET /api/admin/candidates`
  (`server/index.js:3142`), matching `/api/coach/queue`'s `severity DESC, created_at ASC, id ASC`
  precedent (`docs/architecture/api-conventions.md:324`). Makes T016 pass. FR-012a.
- [x] T021 [US2] Write `connect-four/server/migrations/062_candidates_generation_run_unique.sql` per
  `data-model.md`'s exact SQL: record T018's pre-check result in the migration comment; the
  deterministic dedupe `DELETE` ordered by `(c.created_at, c.ctid) > (dup.created_at, dup.ctid)`
  (NOT `id` — `candidates.id` is a random UUID, `007_puzzle_factory.sql:18`); then
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_run_move_unique ON public.candidates
  (generation_run_id, move_string)`. Makes T017(a) pass. FR-012, FR-012a.
- [x] T022 [US2] Switch the candidate-insert retry loop's `.insert(rows)` at `server/index.js:3002` to
  `supabase.from('candidates').upsert(rows, { onConflict: 'generation_run_id,move_string',
  ignoreDuplicates: true })`, per research.md D4's amended mechanism (not a bare `23505` catch — a
  batched multi-row `INSERT` fails atomically on one conflict, so `upsert`/`ignoreDuplicates` is the
  viable no-op). Makes T017(b) pass. Sequenced after T021 (the unique index must exist before the
  `onConflict` target is valid). FR-012.
- [x] T049 [US2] Close out **OI-47** in `docs/open_issues.md` (`## OI-47`, ~:1085) — mark
  ✅ RESOLVED, citing the `gamesSort.js` `id`-tiebreaker fix (T019) and its test (T015). Depends on
  T019.
- [x] T050 [US2] Close out **OI-50** in `docs/open_issues.md` (`## OI-50`, ~:1139) — mark
  ✅ RESOLVED, citing migration 062's unique index + the `upsert`/`ignoreDuplicates` retry fix (T021,
  T022) and its test (T017). Depends on T021, T022.

**Checkpoint (per quickstart.md US2 + FR-034)**: T015a has landed. Run quickstart.md's US2 steps 1-3
manually; run `npm run test:fast` and `npm run test:dom` and confirm no new failures beyond baseline.
T049-T050 (this story's OI closeouts) are done.

---

## Phase 5: User Story 3 — Anonymous review cost is bounded and outcomes are recorded accurately (Priority: P2)

**Goal**: Anonymous re-analysis short-circuits like the authenticated path; every wrong Challenge
answer (including sequence puzzles) is recorded as `'incorrect'`, never silently dropped or
mislabeled `'abandoned'`; the `outcome` CHECK constraint is narrowed to match.

**Independent Test**: Re-opening the same anonymous game's review twice short-circuits without a
second solver run; a wrong answer on each puzzle type (including sequence) stores `outcome =
'incorrect'`.

**Sequencing note (FR-023a, hard constraint)**: migration 063 (T026) MUST be applied in every
environment before T028 (server writer), T029/T030 (`ChallengeScreen.jsx` writers) ship — those three
changes start emitting `'incorrect'`, which the *current* CHECK constraint rejects, and the rejected
insert would be silently dropped by the existing fire-and-forget `.catch`. Order the implementation
tasks below accordingly; do not parallelize T026 with T028-T030.

### Tests for User Story 3 (write first, confirm they FAIL before implementation)

- [x] T023 [P] [US3] Write a pure outcome-vocabulary map test (e.g.
  `connect-four/server/outcomeVocabulary.test.mjs`) asserting `'correct'→'correct_first'`,
  `'wrong'→'incorrect'`, `'tied'→'tied'`. FR-023 (server-writer normalization half).
- [x] T024 [P] [US3] Add DOM tests under `connect-four/tests/dom/challengeScreenOutcome.dom.test.jsx`
  (new file, run via `npm run test:dom`) covering: a wrong single-answer submission writes
  `outcome: 'incorrect'` (site ~:408); a wrong `forbidden_columns` submission writes `'incorrect'`
  (site ~:584); a wrong sequence-puzzle submission writes `'incorrect'` via the new call at ~:668
  (today calls `recordPuzzleAttempt` not at all); the unconditional success-only site (~:659) is
  unchanged. FR-023 (client-writer half). Per research.md D10, these are component tests, NOT a
  pure-helper extraction — they must exercise `ChallengeScreen.jsx` itself.
- [x] T025 [P] [US3] Write `connect-four/tests/blunder/outcomeConstraint.test.js` (co-located with the
  existing constraint-test precedent — see below) copying
  `connect-four/tests/blunder/blunderTagConstraint.test.js`'s technique exactly: parse the newest
  `server/migrations/*.sql` file (`063_puzzle_attempts_outcome_narrow.sql`, post-T026) for its
  `ADD CONSTRAINT ... CHECK (outcome IN (...))` block and assert the extracted set equals
  `{'correct_first', 'tied', 'incorrect', 'abandoned'}` — i.e. explicitly assert `'revealed'` and
  `'correct_retry'` are NOT in that set. This is a DB-free parity assertion, the same shape
  `blunderTagConstraint.test.js` already uses ("mirrors the live constraint without requiring a DB
  connection") — `blunderTagConstraint.test.js` is direct precedent for a migration-constraint test in
  this repo (Blocking issue 2a, plan-critique step: the earlier belief that "no precedent exists" was
  a false negative). FR-023 (constraint half).
- [x] T023a [US3] Append `server/outcomeVocabulary.test.mjs` (T023) and
  `tests/blunder/outcomeConstraint.test.js` (T025) to both `connect-four/package.json`'s `test:fast`
  (`:17`) and `test` (`:16`) scripts; append `tests/dom/challengeScreenOutcome.dom.test.jsx` (T024) to
  the `test:dom` script (`:14`) — `test:dom`'s script has no glob and names all 13 of its files
  individually, so this file must be added as a 14th explicit entry. Hard precondition of this
  story's checkpoint below. Depends on T023, T024, T025.
  DONE (this batch): `test:dom` script now names `tests/dom/challengeScreenOutcome.dom.test.jsx` as a
  14th explicit entry (verified `node -e "require('./package.json')"` still parses; `test:dom` rose
  45→49, i.e. +4 for the new file's 4 tests). `test`/`test:fast` entries for T023/T025 already landed
  in the previous batch.

### Implementation for User Story 3

- [x] T026 [US3] Live-DB pre-check for FR-017 (BEFORE finalizing migration 063): query
  `puzzle_attempts` on every reachable environment for rows where `outcome NOT IN
  ('correct_first','tied','incorrect','abandoned')`. Record the count found in the migration
  comment. Then write `connect-four/server/migrations/063_puzzle_attempts_outcome_narrow.sql` per
  `data-model.md`'s exact SQL: split remap (`'correct_retry'→'correct_first'` first, THEN the
  catch-all `NOT IN (...) → 'abandoned'` which now only catches `'revealed'`/unforeseen values — do
  NOT collapse `'correct_retry'` into the catch-all, per Decision 1/D5); `DROP CONSTRAINT IF EXISTS
  puzzle_attempts_outcome_check`; `ADD CONSTRAINT ... CHECK (outcome IN ('correct_first', 'tied',
  'incorrect', 'abandoned')) NOT VALID`; `VALIDATE CONSTRAINT`. Confirm the constraint name against
  the live schema (`\d puzzle_attempts`) before applying, per data-model.md's caveat. Makes T025 pass
  (once the file exists with the correct constraint text — T025 does not require the migration to be
  *applied*, only written). FR-016, FR-017.
- [x] T027 [US3] Apply migration 063 (T026) to the local dev database and confirm (via `\d
  puzzle_attempts` or `information_schema.check_constraints`) the narrowed constraint is live, BEFORE
  starting T028-T030 (FR-023a gate).
- [x] T028 [US3] Normalize `server/index.js`'s writer at `POST /api/puzzles/:id/check` (~:2520,
  `outcome: evaluation.result`) to translate `evaluatePredicate`'s raw `'correct'|'wrong'|'tied'`
  vocabulary into the stored enum via the map from T023 (extract that map into a small shared module,
  e.g. `connect-four/server/outcomeVocabulary.js`, imported by both `index.js` and T023's test — do
  not inline it only at the call site). Makes T023's assertions exercised in production. FR-015.
- [x] T029 [US3] Fix `src/screens/ChallengeScreen.jsx`'s two existing conditional `outcome:` sites:
  `~:408` (`outcome: isCorrect ? 'correct_first' : 'abandoned'`) and `~:584` (`outcome: quality ===
  'optimal' ? 'correct_first' : 'abandoned'`) — change the `: 'abandoned'` branch to `: 'incorrect'`
  in both. Read each site fresh before editing (line numbers are approximate per project
  convention). Leave `~:659` (unconditional success-only write) unchanged. FR-018, FR-020.
- [x] T030 [US3] Add a fourth `recordPuzzleAttempt` call in `src/screens/ChallengeScreen.jsx`'s
  `handleSequenceClick` failure (`else`) branch (~:668, currently only plays a sound and pushes a
  coach message — see the block starting `} else { playSfx('wrong_move'); ... }`), writing
  `outcome: 'incorrect'` with the same shape as the sibling success-branch call at ~:659 (`puzzle_id:
  current.id, device_uuid: 'local', moves_tried: ..., outcome: 'incorrect', first_attempt_correct:
  false, time_ms: Date.now() - startTimeRef.current, ...(sessionIdRef.current ? { session_id:
  sessionIdRef.current } : {})`). Makes T024 pass. FR-019.
- [x] T031 [US3] Extend the `POST /api/games/analyze` cache-check (`server/index.js:2190`) from
  `if (req.user) { ... }` to `if (req.user || gameDeviceUuid) { ... }`, branching the `blunders`
  filter: `req.user` → unchanged `.eq('user_id', req.user.id)`; else →
  `.is('user_id', null).eq('device_uuid', gameDeviceUuid)` (`gameDeviceUuid` already captured at
  ~:2169). Per Constitution Principle II / research.md D6, extract the ~70-line reconstruction block
  (`server/index.js:2202-2269`) into one shared function called from both branches — do not
  copy-paste it. FR-013.
- [x] T032 [US3] Confirm (no code change) that `GET /api/puzzles/draw`'s filter set (`category`,
  `is_active`, non-null `position`) is unchanged by this epic — read the handler once more after
  T028-T031 land and record that no attempt-history join, exhaustion policy, or unseen-first
  ordering was introduced. FR-014.
- [x] T033 [US3] Record in migration 063's comment (T026) or the PR description, explicitly and
  separately from FR-017's remap note, that existing rows are NOT backfilled for the
  `'incorrect'`-vs-`'abandoned'` distinction — this is the unrecoverable historical gap, distinct
  from the lossless FR-017 value remap. FR-022.
- [x] T034 [US3] Replace `docs/architecture/data-model.md`'s "Puzzle Attempts — `outcome` values and
  the serving pool" section (~line 402-406) with the replacement text drafted in `data-model.md`'s
  own "docs/architecture/data-model.md update" section: state the four-value enum
  (`'correct_first'|'tied'|'incorrect'|'abandoned'`), state the serving-pool non-exclusion as a
  deliberate closed decision (not open per OI-49) citing the exact filter set, and note
  `'correct_retry'`'s retirement in favor of `first_attempt_correct`. FR-021.
- [x] T051 [US3] Close out **OI-22** in `docs/open_issues.md` (search for `## OI-22`, ~:486) — mark
  ✅ RESOLVED, citing the anonymous analyze cache-check extension (T031). Depends on T031.
- [x] T052 [US3] Close out **OI-49** in `docs/open_issues.md` (`## OI-49`, ~:1132) — mark
  ✅ RESOLVED, citing the never-exclude decision confirmation (T032), the narrowed enum (T026/T027),
  and the `data-model.md` rewrite (T034). Depends on T032, T034.

**Checkpoint (per quickstart.md US3 + FR-034)**: T023a has landed. Run quickstart.md's US3 steps 1-4
manually; run `npm run test:fast` and `npm run test:dom` and confirm no new failures beyond baseline.
T051-T052 (this story's OI closeouts) are done.

---

## Phase 6: User Story 4 — Deferred environment and ops risks are verified or fixed (Priority: P3)

**Goal**: A linked worktree whose port self-derive fails refuses to start (never silently binds the
main checkout's ports); leaked stderr is suppressed; migration 057's carryover, the staging pooler
port, and the refresh-rotation probe are each verified with a dated, recorded result.

**Independent Test**: Failure-injection from both a linked worktree and the main checkout; migration
057 apply + carryover quickstart; a real staging migration check; the refresh-rotation probe (or its
"not run, owner-gated" record) — each result recorded with a date in `staging_checks.md`.

**Testability seam (Blocking issue 3, plan-critique step)**: `connect-four/server/index.js` has NO
exports at all, `resolveWorktreePortEnv()` is an unexported top-level function invoked unconditionally
at module load (`server/index.js:78`), and `app.listen(PORT, ...)` is also called unconditionally at
module scope (`server/index.js:4203`) — importing `server/index.js` to reach
`resolveWorktreePortEnv()` in isolation boots the Express server and binds a port, which a test file
cannot do. T039 below therefore extracts a new shared module, `connect-four/server/worktreePorts.js`,
holding the `GIT_DIR`/`GIT_COMMON` detection plus the fatal-vs-fallback decision (research.md D7,
amended 2026-08-02) — imported by BOTH `server/index.js` and `vite.config.js`. This does **not**
violate the epic's Out-of-Scope boundary: that boundary forbids rewriting `worktree-ports.sh` itself,
and a Node-side module consumed by its two self-derive consumers is a different artifact. It also
removes what would otherwise be duplicated (not merely parallel-language) detection logic between the
two JS call sites. See `plan.md`'s Source Code map, which now names this module.

### Tests for User Story 4

- [x] T035 [P] [US4] Write `connect-four/server/worktreePorts.test.mjs` unit-testing the shared
  module's (T039) exported decision function directly, both branches: given a simulated linked-worktree
  `GIT_DIR !== GIT_COMMON` result and a forced self-derive failure, assert it throws/refuses rather
  than returning the `3001`/`5173` defaults (FR-025); given a simulated main-checkout
  (`GIT_DIR === GIT_COMMON`) result, or a detection call that itself throws (no `.git`, e.g. the
  Railway build container), with the same forced self-derive failure, assert the existing
  default-fallback behavior is unchanged (FR-026, FR-027).
- [x] T036 [P] [US4] Write `connect-four/tests/unit/worktreePortsConsumers.test.js` as a source-parse
  wiring check (not a re-test of the decision logic T035 already covers): assert both
  `connect-four/vite.config.js`'s `resolvePorts()` and `connect-four/server/index.js`'s
  `resolveWorktreePortEnv()` import from and delegate their fatal-vs-fallback decision to
  `server/worktreePorts.js` (T039), rather than each re-implementing the `GIT_DIR`/`GIT_COMMON` check
  independently. FR-025, FR-026.
- [x] T035a [US4] Append `server/worktreePorts.test.mjs` (T035) and
  `tests/unit/worktreePortsConsumers.test.js` (T036) to both `connect-four/package.json`'s `test:fast`
  (`:17`) and `test` (`:16`) scripts. Hard precondition of this story's checkpoint below. Depends on
  T035, T036.

### Implementation for User Story 4

- [x] T037 [US4] Pass `stdio: ['ignore', 'pipe', 'ignore']` to the `execSync` call in
  `connect-four/vite.config.js`'s `resolvePorts()` (~:18) so only stdout (the `export` lines) is
  captured and `worktree-ports.sh`'s ownership-probe stderr is suppressed. FR-024.
- [x] T038 [US4] Pass the same `stdio: ['ignore', 'pipe', 'ignore']` to the `execSync` call in
  `connect-four/server/index.js`'s `resolveWorktreePortEnv()` (~:68). FR-024.
- [x] T039 [US4] Create `connect-four/server/worktreePorts.js` (per the Testability seam note above
  and research.md D7's amendment), exporting a function that re-implements `worktree-ports.sh`'s exact
  detection —
  ```bash
  GIT_DIR=$(cd "$(git rev-parse --git-dir)" && pwd -P)
  GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" && pwd -P)
  ```
  (`worktree-ports.sh:16-17`) — as an `execSync('git rev-parse --git-dir')` /
  `execSync('git rev-parse --git-common-dir')` pair, wrapped in its own try/catch separate from the
  port-derivation try/catch: (a) if the `git rev-parse` calls themselves throw (no `.git` at all,
  e.g. the Railway build container) → not a worktree / not a git checkout → fall through to today's
  existing non-fatal default path, unchanged (FR-026); (b) if they succeed and `GIT_DIR !==
  GIT_COMMON` → linked worktree → a subsequent self-derive failure is fatal — throw rather than
  returning `3001`/`5173` (FR-025); (c) if they succeed and `GIT_DIR === GIT_COMMON` → main checkout
  → unchanged (FR-026). Makes T035 pass.
- [x] T040 [US4] Wire both `resolvePorts()` (`connect-four/vite.config.js`) and
  `resolveWorktreePortEnv()` (`connect-four/server/index.js:64-78`) to import and delegate to
  `server/worktreePorts.js` (T039) for the detection + fatal-vs-fallback decision, replacing what
  would otherwise be independently-duplicated detection logic in each file. Makes T036 pass. FR-025,
  FR-026.
- [x] T041 [US4] Manually verify FR-025/FR-026/FR-024 per quickstart.md US4 steps 1-3 (failure
  injection from a linked worktree; failure injection from the main checkout; direct
  `node server/index.js` run with no stderr leakage) and record each result with a date in
  `staging_checks.md` under a new Epic 4 section. FR-027, FR-031.
- [x] T042 [US4] Document the fail-loudly guarantee (worktree-scoped fatal behavior, main-checkout
  behavior unchanged) in `docs/architecture/worktree-conventions.md`. FR-027.
- [x] T043 [US4] Apply migration `057_users_onboarding_status.sql` to a running database, restart the
  server process (no hot-reload — `project_user_column_propagation` memory), then run
  `specs/048-onboarding-experience/quickstart.md`'s account-carryover section end-to-end; confirm the
  account row's `onboarding_status` reflects the migrated anonymous value; record the result with a
  date in `staging_checks.md`'s Epic 4 section. FR-028, FR-031.
- [x] T044 [US4] Determine what `DATABASE_URL` the staging Railway deploy actually injects for
  migrations (Railway dashboard/CLI, NOT just the local `connect-four/server/.env.staging` file,
  which research.md D9 already confirms is on the forbidden 6543 transaction pooler for any *local*
  run). If Railway's injected value is also 6543, correct `.env.staging` or the deploy path per
  `docs/architecture/server-conventions.md`'s Migration Runner section (session pooler, port 5432,
  `sslmode=no-verify`). Record the finding with a date in `staging_checks.md`. FR-029, FR-031.
- [x] T045 [US4] If a real test account's credentials are available, run
  `node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>` and record
  "rotation detected" (build the de-dup Map as a follow-up) or "no rotation" (close OI-5) in
  `staging_checks.md` with a date. If credentials are unavailable within this epic's execution
  window, record "not run, owner-gated" explicitly — do not silently omit it — per FR-032's carve-out.
  FR-030, FR-031, FR-032.
- [x] T053 [US4] Close out **OI-5** in `docs/open_issues.md` (`## OI-5`, ~:100) — either ✅ RESOLVED
  (if T045 found "no rotation") or leave open with a dated `**UPDATE**` block stating "not run,
  owner-gated" per FR-032, or "rotation detected, de-dup Map is a follow-up" if applicable. Depends
  on T045.
- [x] T054 [US4] Close out **OI-14** in `docs/open_issues.md` (`## OI-14`, ~:315) — mark
  ✅ RESOLVED, citing T043's end-to-end carryover verification and its `staging_checks.md` entry.
  Depends on T043.
- [x] T055 [US4] Close out **OI-31** in `docs/open_issues.md` (`## OI-31`, ~:723) — mark
  ✅ RESOLVED (if the Railway-injected value was confirmed safe or corrected) or leave open with a
  dated `**UPDATE**` naming exactly what remains verified vs. not, per T044's finding.
- [x] T056 [US4] Close out **OI-51** in `docs/open_issues.md` (`## OI-51`, ~:1152) — mark
  ✅ RESOLVED, citing the `stdio` suppression fix (T037, T038). Depends on T037, T038.
- [x] T057 [US4] Close out **OI-52** in `docs/open_issues.md` (`## OI-52`, ~:1163) — mark
  ✅ RESOLVED, citing the fatal-in-worktree detection fix (T039, T040) and its tests (T035, T036).
  Depends on T039, T040.

**Checkpoint (per quickstart.md US4 + FR-034)**: T035a has landed. Run `npm run test:fast` and
`npm run test:dom` and confirm no new failures beyond baseline. All five `staging_checks.md` entries
(T041, T043, T044, T045, plus T041 covers both worktree-ports checks) are dated and recorded.
T053-T057 (this story's OI closeouts) are done.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cross-story test gate and end-to-end acceptance pass, once every story (including
its own OI closeout(s), each now completed within its own phase above per FR-033) has landed.

- [ ] T058 Final cross-story test gate: run `npm run test:fast` AND `npm run test:dom` from
  `connect-four/` once more after all of T001-T057 land; confirm the result set contains no failures
  beyond the T001/T002 baselines (FR-034, SC-010).
- [ ] T059 Run `quickstart.md` end-to-end (all four US sections) as the final acceptance pass, per
  the epic's acceptance-criteria list (`docs/epics/open-issues-epics.md` §Epic 4 "Acceptance
  criteria"): no shared-bucket identifier; every paginated endpoint has a provably unique sort key; a
  duplicate candidate batch is impossible; a worktree whose self-derive fails refuses to start; the
  narrowed CHECK constraint accepts exactly the four values; `data-model.md` states non-exclusion is
  deliberate; `npm run test:fast` green; every ops verification signed off in `staging_checks.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first so both test-gate baselines exist.
- **Foundational (Phase 2)**: Empty — no story is blocked on shared infrastructure.
- **User Stories (Phase 3-6)**: Each depends only on Setup (T001/T002) for its own checkpoint
  comparison; all four are independently implementable in parallel or in any order. Each story's own
  OI closeout task(s) are its final tasks, per FR-033.
- **Polish (Phase 7)**: T058/T059 depend on all of Phases 3-6, including each story's own OI closeout
  tasks.

### Within Each User Story

- Tests (T003/T004, T015-T017, T023-T025, T035/T036) written and confirmed failing before their
  paired implementation tasks; each story's `*a`-suffixed registration task (T003a, T015a, T023a,
  T035a) lands before that story's checkpoint, appending the new test file(s) to the correct
  `package.json` script(s) — without it, `npm run test:fast`/`test:dom` silently never runs the new
  file and FR-034's gate is vacuous for that story.
- US3's FR-023a sequencing is a hard constraint: T026 (migration) → T027 (applied + confirmed) must
  land before T028/T029/T030 (the `'incorrect'`-emitting writers) start.
- US2's T021 (unique index) must land before T022 (`upsert(..., onConflict: ...)`) per data-model.md's
  ordering note (the `ON CONFLICT` target must exist).
- US4's T039 (shared `worktreePorts.js` module) must land before T040 (wiring both consumers to it);
  T035/T036's tests may be written first (importing a module that doesn't yet exist, confirmed to fail
  on import) but cannot pass until T039 lands.
- Each story's OI-closeout task(s) (T046-T048 in US1, T049-T050 in US2, T051-T052 in US3, T053-T057
  in US4) are that story's last tasks, landing after their cited implementation/test tasks per their
  "Depends on" notes.

### Parallel Opportunities

- T001/T002 (Setup) run in parallel.
- All four user-story phases (3-6) can be worked in parallel by different agents/developers — no
  cross-story file overlap except `docs/open_issues.md` (each OI closeout edits a different section,
  safe to interleave), `connect-four/package.json` (each story's `*a` registration task edits the same
  two script strings — sequence these across stories or take care merging), and the two shared
  test-gate runs.
- Within US1: T003/T004 (tests) in parallel; T008/T009/T010 (audit/doc tasks) in parallel once T005
  lands.
- Within US2: T015/T016/T017 (tests) in parallel.
- Within US3: T023/T024/T025 (tests) in parallel.
- Within US4: T035/T036 (tests) in parallel; T037/T038 (stdio fix, two different files) in parallel.
- Each story's OI closeouts (e.g. US4's T053-T057) can be done by one agent sequentially or batched,
  but are logically independent of each other.

---

## Parallel Example: User Story 1

```bash
# Tests first (parallel — different files):
Task: "Write connect-four/server/deviceIdentity.test.mjs" (T003)
Task: "Add regression test to connect-four/tests/unit/chooseSparringMove.test.js" (T004)
# Then register the new file so the gate actually covers it:
Task: "Append server/deviceIdentity.test.mjs to package.json's test:fast/test scripts" (T003a)

# Then implementation (T005 first, others depend on it or are independent):
Task: "Create connect-four/server/deviceIdentity.js" (T005)
# T006, T007 depend on T005; T013 is independent and can run in parallel with T006/T007
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002).
2. Complete Phase 3: User Story 1 (T003-T014, T003a, T046-T048 — the OI closeouts are part of this
   phase, not a later add-on).
3. **STOP and VALIDATE**: run quickstart.md US1 steps + FR-034 gate.

### Incremental Delivery

1. Setup → US1 (P1, MVP, including its OI closeouts) → validate → US2 (P2, including its OI
   closeouts) → validate → US3 (P2, including its OI closeouts) → validate → US4 (P3, including its
   OI closeouts) → validate → Phase 7 final joint gate.
2. Because all four stories are independent, they may equally be delivered in parallel by separate
   agents/developers rather than strictly in priority order — priority order only matters for a
   single-threaded MVP-first delivery.

### Parallel Team Strategy

With four developers/agents: each takes one user-story phase (3-6) directly after Setup completes,
including that story's own registration task(s) and OI closeout(s) — no closeout work is deferred to
a later shared phase; T058/T059 run once as a final joint gate after all four stories land.
