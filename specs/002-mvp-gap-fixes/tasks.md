# Tasks: MVP Gap Fixes

**Input**: Design documents from `specs/002-mvp-gap-fixes/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/api.md ✓, quickstart.md ✓

**Organization**: Tasks are grouped by user story. All stories are patches to the existing codebase — no new infrastructure setup is required.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no in-flight dependencies)
- **[Story]**: Maps to user story in spec.md (US1–US10)

---

## Phase 1: Foundational — Database Migrations (US5)

**Purpose**: Create the two missing migration files. US7 (Coach Review Queue) cannot be exercised without `005_coach.sql` ordering and the `session_stats` table, so these ship first.

**Independent Test**: Apply all migrations in order to a fresh Supabase project; verify zero "relation does not exist" errors.

- [x] T001 [US5] Create connect-four/server/migrations/005_coach.sql — intentionally minimal file confirming blunders table + index exist in 003_puzzles.sql; add `SELECT 1;` for syntactic validity
- [x] T002 [P] [US5] Create connect-four/server/migrations/006_session_stats.sql — `session_stats` table with `(user_id, date)` primary key, `stats JSONB`, RLS policy allowing users to manage own rows

**Checkpoint**: Migration sequence is complete and gap-free (001–003, 005–006).

---

## Phase 2: User Story 1 — Playable Puzzle Trainer with Placeholder Content (Priority: P1) 🎯

**Goal**: All 6 categories show real puzzles and no category ever shows an infinite loading state.

**Independent Test**: Seed placeholder puzzles, open `/puzzles` as anonymous, select each category, make a move, see feedback — all without auth.

- [x] T003 [US1] Fix empty-state bug in connect-four/src/pages/PuzzlesPage.jsx: in `loadPuzzle()`, when `categoryPuzzles.puzzles.length === 0` return early and set `emptyCategory = true`; render a "No puzzles yet" card with a back button when `emptyCategory` is true
- [x] T004 [P] [US1] Create connect-four/server/data/placeholder_puzzles.json with ≥1 solver-verified puzzle per category (6 total) — run each `move_sequence` through `/api/scores` to confirm score ≥ 0 for the intended move before including
- [x] T005 [US1] Add `POST /api/admin/seed-puzzles` to connect-four/server/index.js — localhost-only middleware guard, reads `placeholder_puzzles.json`, inserts puzzles skipping duplicates (matched on `move_sequence + category`), responds `{ inserted, skipped }`

**Checkpoint**: `curl -X POST http://localhost:3001/api/admin/seed-puzzles` returns `{"inserted":6,"skipped":0}`; all 6 categories show a puzzle in the UI.

---

## Phase 3: User Story 2 — Puzzle Curation Tool (Priority: P1)

**Goal**: A content author can create and verify a new puzzle in under 5 minutes without touching SQL or JSON files.

**Independent Test**: Open `/admin/curate`, enter a move string, verify board renders, click "Run solver", verify scores appear, save — confirm puzzle visible via `GET /api/puzzles?category=...`.

- [x] T006 [US2] Create connect-four/src/pages/AdminCuratePage.jsx with: move string text input → live `<Board>` render; "Run solver" button → calls `GET /api/scores?moves=:moveString`, displays per-column scores and recommended predicate type; category selector; goal prompt text field; predicate type selector; "Save puzzle" button → calls `POST /api/admin/puzzles`; client-side move string validation (columns 1–7, length ≤ 42) with inline error display
- [x] T007 [P] [US2] Add `POST /api/admin/puzzles` to connect-four/server/index.js — localhost-only middleware guard, validates required fields (`category`, `move_sequence`, `goal_prompt`, `predicate_type`, `difficulty`), inserts into `puzzles` table, responds `{ id, verified: false }` or `{ error }` on 400
- [x] T008 [US2] Add `/admin/curate` route to connect-four/src/App.jsx pointing to `AdminCuratePage`

**Checkpoint**: Author flow works end-to-end; saved puzzle appears in API response.

---

## Phase 4: User Story 3 — External Services Connected (Priority: P1)

**Goal**: Developer can configure all three external services via a documented `.env` file and verify they work.

**Independent Test**: Copy `.env.example`, fill in real credentials, restart server — no "database unavailable" in logs; magic link sign-in creates a Supabase `users` row.

- [x] T009 [US3] Create connect-four/.env.example documenting all required server and Vite environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`, `C4_SOLVER_PATH` — include a one-line comment for each describing its purpose and where to find the value

**Checkpoint**: New contributor can follow `.env.example` to get all services running.

---

## Phase 5: User Story 4 — Analytics KPI Events Complete (Priority: P2)

**Goal**: All 8 KPI events fire at the correct moment and reach the `tracks` table.

**Independent Test**: Walk anonymous → sign-in → exhaust quota → upgrade path; verify all 8 events in `tracks` in order.

- [x] T010 [US4] In connect-four/src/store/ProfileStore.jsx, update `switchToSupabase()` to accept the `onAuthStateChange` event type as a parameter; call `track('signup_completed', { method: 'magic_link' })` only when `event === 'SIGNED_IN'` (not on `TOKEN_REFRESHED` or `INITIAL_SESSION`)
- [x] T011 [P] [US4] In connect-four/server/index.js Stripe webhook `checkout.session.completed` handler, after the `users` table `tier: 'paid'` update succeeds, insert a row into `tracks` with `event: 'upgrade_completed'` and `user_id` from Stripe customer metadata
- [x] T012 [P] [US4] In connect-four/src/components/DeepRevealButton.jsx, when the 429 response is received and `setShowPaywall(true)` is called, also call `track('paywall_viewed', { trigger: 'quota_exceeded' })`

**Checkpoint**: Three new events (`signup_completed`, `upgrade_completed`, `paywall_viewed`) appear in `tracks` for the described flows.

---

## Phase 6: User Story 6 — Blunder Capture Fixed to First Attempt Only (Priority: P2)

**Goal**: Blunders table has exactly 1 row per first-attempt failure; no duplicates.

**Independent Test**: Fail puzzle on attempt 1 → 1 blunder row; fail on attempt 2 → still 1 blunder row total; solve on attempt 1 → 0 blunder rows.

- [x] T013 [US6] In connect-four/server/index.js `POST /api/puzzles/:id/check` handler, change the blunder insert guard from `moveHistory.length === 0` to `req.body.attemptNumber === 1 && !isSuccess`
- [x] T014 [US6] In connect-four/src/pages/PuzzlesPage.jsx, pass `attemptNumber: attemptCount + 1` in the `POST /api/puzzles/:id/check` request body (before incrementing `attemptCount`)
- [x] T015 [US6] Create connect-four/tests/blunder/blunder-capture.test.js using `node --test`: three test cases — (1) `attemptNumber: 1` + failure → blunder inserted, (2) `attemptNumber: 2` + failure → no blunder, (3) `attemptNumber: 1` + success → no blunder; mock the DB insert and verify call count

**Checkpoint**: `node --test connect-four/tests/blunder/blunder-capture.test.js` passes all 3 cases; manual test confirms no duplicate rows.

---

## Phase 7: User Story 7 — Coach Review Queue Functional (Priority: P2)

**Goal**: Paid users can work through their blunder queue — one board per blunder, resolve on correct, skip after 2 failures.

**Depends on**: Phase 1 (migrations must be applied).

**Independent Test**: As paid user with ≥1 blunder, click "Start review", solve correctly, verify `resolved_at` set and queue count decrements.

- [x] T016 [US7] In connect-four/src/pages/CoachPage.jsx, replace `onClick={() => {}}` on "Start review" with a handler that: (1) calls `GET /api/coach/queue` and stores `{ reviewMode: true, currentBlunder, queueCount }`; (2) in `reviewMode` renders a puzzle board for the blunder position; (3) on correct solve calls `POST /api/coach/queue/:blunderId/resolve`, decrements `queueCount`, and fetches next; (4) after 2 failures skips to next without resolving; (5) when queue is empty shows "No positions in queue — keep training to build your personal curriculum."

**Checkpoint**: Full review cycle (fail → blunder captured via T013–T014 → start review → solve → resolved) completes without dead-end UI state.

---

## Phase 8: User Story 8 — Coach Page Gate and Sign-in CTA (Priority: P3)

**Goal**: Anonymous users see a sign-in button; free users see a locked card with upgrade CTA — no auto-modal.

**Independent Test**: Visit `/coach` as anonymous → sign-in button present. Sign in as free → locked card visible, no modal fires automatically.

- [x] T017 [US8] In connect-four/src/pages/CoachPage.jsx, add `<button onClick={() => setShowAuth(true)}>Sign in</button>` in the `!session` render branch; import and render `<AuthModal>` conditional on `showAuth` state
- [x] T018 [US8] In connect-four/src/pages/CoachPage.jsx, replace the 403-triggered auto-`PaywallModal` with a `isPaidGated` flag; when `isPaidGated` is true render a locked card with "Personal AI Coach — Paid Feature" label and an "Upgrade" button that opens `PaywallModal` on click and calls `track('paywall_viewed', { trigger: 'coach_gate' })`

**Checkpoint**: No modal fires on page load for free user; upgrade button fires modal and tracks event.

---

## Phase 9: User Story 9 — Sparring Post-Commit Reveal with Score Comparison (Priority: P3)

**Goal**: Reveal panel shows played move score, best move score, and "Best move played" when applicable.

**Independent Test**: Make a suboptimal move in commit-first mode; reveal shows played score, best column, best score side by side.

- [x] T019 [US9] In connect-four/src/pages/HomePage.jsx `commitMove()`, add a parallel `GET /api/scores?moves=:movesBeforeCommit` call alongside the existing `/api/explain-move` call (use `Promise.all`); extract `playedScore = scores[candidateCol]`, `bestCol = argmax(scores)`, `bestScore = max(scores)`; store alongside `oneLiner` in `postReveal` state
- [x] T020 [US9] In connect-four/src/pages/HomePage.jsx reveal panel JSX, render two side-by-side score cards — "Your move: Col N (score X)" and "Best move: Col M (score Y)"; when `playedCol === bestCol` show "Best move played ✓" instead of a separate best-move card; show `oneLiner` below the score cards

**Checkpoint**: Commit a clearly suboptimal move; reveal shows both scores and correct best-move column.

---

## Phase 10: User Story 10 — `hard` Difficulty Distinct from `perfect` (Priority: P3)

**Goal**: `hard` AI plays best move 80% of the time and a random legal move 20%, making it measurably weaker than `perfect`.

**Independent Test**: Play 20 games on `hard`; human win rate should be statistically higher than on `perfect`.

- [x] T021 [US10] In connect-four/src/pages/HomePage.jsx, add `const HARD_ERROR_RATE = 0.2` at file top; in `getAiColumn()`, after computing the best column(s), for `difficulty === 'hard'` add: `if (Math.random() < HARD_ERROR_RATE) { return random legal column } else { pick best with tie-breaking }`; `perfect` difficulty remains unchanged

**Checkpoint**: `hard` and `perfect` code paths diverge; `HARD_ERROR_RATE` constant is at file top.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational / Migrations)**: No dependencies — start immediately
- **Phase 2–4 (US1, US2, US3)**: No dependencies on Phase 1 — can start in parallel
- **Phase 5 (US4 Analytics)**: No dependencies — parallel
- **Phase 6 (US6 Blunder fix)**: No dependencies — parallel
- **Phase 7 (US7 Coach Queue)**: **Depends on Phase 1** (migrations must be applied)
- **Phase 8–10 (US8, US9, US10)**: No inter-story dependencies — parallel

### Parallel Opportunities

All tasks within a phase that touch different files are marked `[P]`. Cross-phase parallelism:

- T001 + T002 (two migration files) — parallel
- T004 + T007 (placeholder JSON, admin endpoint) — parallel
- T010 + T011 + T012 (three analytics events, different files) — parallel
- T017 + T018 (two coach gate changes — both in CoachPage.jsx, must be sequential within that file)
- T019 + T021 (different features in HomePage.jsx — sequential within file)

---

## Implementation Strategy

### Minimum Playable Increment (US1 only)

1. T003 — fix loading bug
2. T004 — write placeholder JSON
3. T005 — seed endpoint
4. **Validate**: Seed puzzles, open `/puzzles`, all 6 categories playable

### Full P1 Delivery (US1 + US2 + US3)

Add T006–T009 after US1 validates. Enables content authoring workflow.

### Full P2 Delivery (add US4 + US5 + US6 + US7)

Run migrations (T001–T002), fix analytics (T010–T012), fix blunder capture (T013–T015), wire coach queue (T016). Enables paid-tier coach feature.

### Full Gap Fix (add US8 + US9 + US10)

Add T017–T021. Polishes conversion funnels and difficulty balance.

---

## Notes

- T015 (blunder test) is required by the plan — it uses `node --test` with mock DB insert, not a live database
- T004 requires running the solver binary; verify `C4_SOLVER_PATH` is set before generating the JSON
- T005 and T007 both require the same localhost-only middleware guard — reuse the same middleware function
- The `.env.example` (T009) is documentation only; real credentials are filled in manually by the developer
