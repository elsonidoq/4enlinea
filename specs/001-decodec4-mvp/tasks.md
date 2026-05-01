---
description: "Task list for DecodeC4 MVP implementation"
---

# Tasks: DecodeC4 MVP

**Input**: Design documents from `specs/001-decodec4-mvp/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/api.md ✅, contracts/store.md ✅, research.md ✅, quickstart.md ✅

**Tests**: Integration tests are included for the pattern classifier and goal predicate evaluator (both use the real c4solver binary). UI testing is manual per quickstart.md phase gate checklists.

**Organization**: Tasks follow the 11-epic build plan. Phases 1–2 are foundational; Phases 3–6 map to user stories; Phase 7 is polish & launch.

**Implementation note on story ordering**: US4 (Account & Paywall) is implemented before US3 (Personal AI Coach) because the Coach is a paid-only feature — Stripe must be wired before Coach can ship. Spec priority P3/P4 refers to product importance; implementation order follows dependency.

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in this phase)
- **[Story]**: Which user story this task belongs to (US1 = Puzzle Trainer, US2 = Sparring, US3 = Coach, US4 = Account/Paywall)
- File paths are relative to the repo root

---

## Phase 1: Setup (Epic 1 — Infrastructure & Deployment)

**Purpose**: Get the backend live on Railway with the solver verified. Every subsequent epic deploys into this pipeline. Do not begin Phase 2 until the solver binary is confirmed working on Railway.

- [ ] T001 Create Railway project and configure auto-deploy from `main` branch; add all secrets as Railway env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SENTRY_DSN)
- [ ] T002 Create Supabase project; enable Postgres and Auth; copy SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY into Railway env vars
- [ ] T003 [P] Point Cloudflare DNS to Railway deployment URL
- [X] T004 [P] Wire Sentry to the Node.js server — add `@sentry/node` and initialize in `connect-four/server/index.js`; verify uncaught exceptions surface in Sentry dashboard
- [ ] T005 Verify c4solver binary runs on Railway Linux x64 by checking deployment logs for `[solver] binary:` startup line; cross-compile from `solver-src/` if the binary crashes

**Checkpoint**: `curl https://<railway-domain>/api/ping` returns `{"ok":true}` and solver responds to a `/api/scores` call.

---

## Phase 2: Foundational (Epics 2, 3, 4 — Frontend, Auth, Explanation Engine)

**Purpose**: Core infrastructure that ALL user stories depend on. No user story work begins until this phase is complete.

**⚠️ CRITICAL**: The Explanation Engine (Epic 4) has a hard quality gate — 100 positions × 5 LLM generations with < 2% error rate — that must pass before Phase 3 begins.

### Epic 2 — Frontend Skeleton

- [X] T006 Replace the monolith `connect-four/src/App.jsx` with a Vite + React 18 root that configures react-router-dom with three route shells: `/` (HomePage), `/puzzles` (PuzzlesPage), `/coach` (CoachPage) — `connect-four/src/App.jsx` and `connect-four/src/main.jsx`
- [X] T007 [P] Configure react-i18next with an English translation file; wrap the app with `<I18nextProvider>`; verify `t('key')` is callable in any component — `connect-four/src/i18n/en.json` and `connect-four/src/i18n/index.js`
- [X] T008 [P] Build `<Board>` component that renders a 6×7 grid of `<Column>` components and accepts `board` (2D array), `onColumnClick`, `hoverCol`, `highlightedCells` props — `connect-four/src/components/Board.jsx`
- [X] T009 [P] Build `<Column>` and `<Piece>` components: Column renders 6 stacked Piece slots; Piece accepts `color` ('red'|'yellow'|'empty') and `highlight` ('winning'|'heatmap'|null) — `connect-four/src/components/Column.jsx` and `connect-four/src/components/Piece.jsx`
- [X] T010 [P] Build `<DeepRevealButton>` component: shows "See why" button; accepts `tier`, `quotaRemaining`, `onReveal` props; renders sign-in gate modal if anonymous, paywall gate if quota=0 — `connect-four/src/components/DeepRevealButton.jsx`
- [X] T011 [P] Build `<PaywallModal>` component: modal with upgrade prompt, plan options ($4.99/mo · $39/yr), and a CTA button that calls `onUpgrade` prop; renders "coming soon" placeholder until Stripe is wired (Phase 5) — `connect-four/src/components/PaywallModal.jsx`
- [X] T012 [P] Build `<ErrorBoundary>` component that catches React errors, shows a friendly fallback UI, and reports to Sentry — `connect-four/src/components/ErrorBoundary.jsx`
- [X] T013 Implement `IndexedDBStore` class: `getProfile()`, `saveSessionStats()`, `getSessionStats()`, `recordPuzzleAttempt()`, `migrateToSupabase()` — `connect-four/src/store/IndexedDBStore.js`
- [X] T014 Implement `SupabaseStore` class with the same interface (minus `migrateToSupabase`); all writes use the Supabase JS client with the user's JWT — `connect-four/src/store/SupabaseStore.js`
- [X] T015 Implement `ProfileStore` factory and React context: `createProfileStore(supabaseSession)` selects the active implementation; `<ProfileStoreProvider>` wraps the app; `useStore()` hook for consumers — `connect-four/src/store/ProfileStore.js`
- [X] T016 [P] Implement `track(event, data)` helper that POSTs to `/api/track` fire-and-forget (never throws, never awaited by callers) — `connect-four/src/lib/track.js`
- [X] T017 Add `POST /api/track` endpoint to the Express server: extracts `uid` from request/session, adds `user_id` from JWT if present, inserts into `tracks` table; always returns 204 — `connect-four/server/index.js`

### Epic 3 — Auth & Tier Enforcement

- [X] T018 Write Supabase migration `001_initial.sql`: create `public.users` table (id, device_uuid, tier, deep_reveal_count, deep_reveal_reset_at, stripe_customer_id, created_at), `tracks` table, `stripe_events` table, and RLS policies; **HUMAN REVIEW REQUIRED before applying** — `connect-four/server/migrations/001_initial.sql`
- [X] T019 Implement Supabase Auth magic-link sign-up/sign-in: build `<AuthModal>` component with email input that calls `supabase.auth.signInWithOtp()`; wire into `<AuthGate>` — `connect-four/src/components/AuthModal.jsx` and `connect-four/src/components/AuthGate.jsx`
- [X] T020 Implement server-side JWT validation middleware: extract and verify Supabase JWT on every request; attach `req.user` (id, tier, deepRevealCount, deepRevealResetAt) or null for anonymous — `connect-four/server/index.js`
- [X] T021 Implement `migrateToSupabase()` in `IndexedDBStore`: bulk-insert all `puzzle_attempts` from IndexedDB into Supabase `puzzle_attempts` table; clear IndexedDB on success; throw on partial failure — `connect-four/src/store/IndexedDBStore.js`
- [X] T022 Wire `ProfileStoreProvider` to switch from `IndexedDBStore` to `SupabaseStore` on Supabase auth state change; call `migrateToSupabase()` on first sign-in — `connect-four/src/store/ProfileStore.js`

### Epic 4 — Explanation Engine

- [X] T023 Write deterministic board fixtures (JSON) for all 6 pattern categories: at least 3 positions per category, each with the move string, expected pattern tag, and correct/incorrect candidate moves — `connect-four/tests/classifier/fixtures/` and `connect-four/tests/predicates/fixtures/`
- [X] T024 Implement pattern classifier for categories 1–3 (bitboard-only) in `server/classifier.js`: `classifyPosition(boardState, solverScores)` returns `{ tag, confidence }`; cat 1 = immediate threat (solver score ≥ WIN_THRESHOLD), cat 2 = forced block (opponent has immediate threat), cat 3 = double threat (≥2 simultaneous winning threats) — `connect-four/server/classifier.js`
- [X] T025 Implement pattern classifier for categories 4–6 (solver-guided) in `server/classifier.js`: cat 4 = fork setup (multi-move double threat established by solver continuation), cat 5 = zugzwang (any move disadvantageous), cat 6 = parity control (row dominance per Allis rules) — `connect-four/server/classifier.js`
- [X] T026 Write classifier integration tests using real c4solver binary and fixtures from T023; run with `node --test`; must cover correct classification and no misclassification for all 6 categories — `connect-four/tests/classifier/classifier.test.js`
- [X] T027 Write Supabase migration `002_explanation_cache.sql`: create `explanation_cache` table (position_hash, one_liner, deep_reveal_json, created_at); **HUMAN REVIEW REQUIRED** — `connect-four/server/migrations/002_explanation_cache.sql`
- [X] T028 Implement `POST /api/explain-move` endpoint: (1) run classifier, (2) check `explanation_cache` by `sha256(moves+candidateCol)`, (3) on cache miss call Claude Sonnet server-side with classifier output, (4) write result to cache, (5) enforce Deep Reveal quota (anon=0, free=3/day with midnight UTC reset, paid=unlimited) — `connect-four/server/index.js`

**⚠️ HALLUCINATION GATE — must pass before Phase 3**:
- [X] T029 Run hallucination acceptance test: call `/api/explain-move` for 100 distinct positions × 5 generations each; manually review 500 responses for explanations that reference patterns not confirmed by the classifier; error rate must be < 2% (≤ 10 errors) before proceeding — `connect-four/tests/hallucination/run_hallucination_test.js`

**Checkpoint**: All tests in `connect-four/tests/` pass. Hallucination gate cleared. A call to `/api/explain-move` returns a correct pattern tag and one-liner in < 2s.

---

## Phase 3: User Story 1 — Puzzle Trainer (Priority: P1) 🎯 MVP

**Goal**: A user can land, pick a puzzle category, attempt to solve a puzzle, and receive feedback and optionally a Deep Reveal — the complete core learning loop.

**Independent Test**: An anonymous user opens `/puzzles`, selects a cat 1 puzzle, submits a move, receives feedback, and (after signing in) taps "See why" to get a Deep Reveal. All steps work without visiting any other page.

### Infrastructure for US1

- [X] T030 Write Supabase migration `003_puzzles.sql`: create `puzzles` table (id, category, move_string, goal_prompt, goal_predicate_type, goal_predicate_params, cooperative_ai_moves, difficulty, is_active, created_at) and `puzzle_attempts` table; RLS: users can only read their own attempts; **HUMAN REVIEW REQUIRED** — `connect-four/server/migrations/003_puzzles.sql`
- [ ] T031 [P] Author and solver-verify ~15 hand-curated puzzle positions for categories 1–3 (≥5 per category); record as JSON with move_string, goal_prompt, goal_predicate_type, cooperative_ai_moves — `connect-four/server/data/puzzles_cat1_3.json` **[HUMAN CONTENT WORK — can run in parallel with T032]**
- [ ] T032 [P] Author and solver-verify ~12 hand-curated puzzle positions for categories 4–6 (≥4 per category); include cooperative_ai_moves arrays for multi-move puzzles — `connect-four/server/data/puzzles_cat4_6.json` **[HUMAN CONTENT WORK — can run in parallel with T031]**

### Server implementation for US1

- [X] T033 Implement goal predicate evaluator for all 6 categories: `evaluatePredicate(puzzleId, candidateCol, moveHistory)` returns `{ result: 'correct'|'wrong'|'tied'|'await_next', aiMove?, tiedWith? }`; calls real c4solver via existing solver class — `connect-four/server/predicates.js`
- [X] T034 Write goal predicate integration tests with correct + incorrect fixtures for all 6 categories; must pass before T035 — `connect-four/tests/predicates/predicates.test.js`
- [X] T035 [P] [US1] Add `GET /api/puzzles` endpoint: returns category list with `locked` flag based on requesting user's tier (cats 4–6 locked for anon/free) — `connect-four/server/index.js`
- [X] T036 [P] [US1] Add `GET /api/puzzles/:id` endpoint: returns puzzle data; validates tier can access this category; returns 403 if locked — `connect-four/server/index.js`
- [X] T037 [US1] Add `POST /api/puzzles/:id/check` endpoint: calls predicate evaluator, records `puzzle_attempt` (device_uuid always present, user_id if signed in), emits `puzzle_solved_correct` or `puzzle_solved_wrong` track event; on first-attempt failure inserts into `blunders` table if user is signed in — `connect-four/server/index.js`
- [ ] T038 Write Supabase seed migration for the 50 curated puzzles from T031/T032; **HUMAN REVIEW REQUIRED** — `connect-four/server/migrations/004_seed_puzzles.sql`

### UI for US1

- [X] T039 [US1] Build `PuzzlesPage` route shell at `/puzzles`: renders category list or active puzzle; manages puzzle session state (current puzzle, attempt count, session accuracy by category) — `connect-four/src/pages/PuzzlesPage.jsx`
- [X] T040 [US1] Build `PuzzleCategoryList` component: renders 6 category cards; cats 4–6 show locked state (preview card + upgrade prompt) for anon/free users; tracks `paywall_viewed` on lock card click — `connect-four/src/components/PuzzleCategoryList.jsx`
- [X] T041 [US1] Build `PuzzleBoard` component: renders `<Board>` with the puzzle position, goal prompt, move input; manages attempt count (max 2 before auto-reveal); handles correct/wrong/tied/reveal feedback states with appropriate flash animations — `connect-four/src/components/PuzzleBoard.jsx`
- [X] T042 [US1] Wire `<DeepRevealButton>` into PuzzleBoard: appears after correct move or auto-reveal; calls `POST /api/explain-move` with `requestDeepReveal: true`; shows inline Deep Reveal panel on success — `connect-four/src/components/PuzzleBoard.jsx`
- [X] T043 [US1] Build session accuracy display at top of PuzzlesPage: shows per-category correct/attempted counts for the current session; updates after each puzzle_attempt — `connect-four/src/pages/PuzzlesPage.jsx`

**Checkpoint**: User Story 1 is fully functional. An anonymous user can play a cat 1–3 puzzle; a signed-in free user can use 3 Deep Reveals per day; a paid user can access cat 4–6 puzzles.

---

## Phase 4: User Story 2 — Commit-first Sparring (Priority: P2)

**Goal**: A user enables Commit-first mode in sparring; all evaluative UI disappears until they commit a move; a post-commit reveal shows score, best move, and pattern tag.

**Independent Test**: A user starts a sparring game, enables Commit-first, makes a move, and sees the post-move reveal — without having attempted any puzzle first.

### Implementation for US2

- [X] T044 [US2] Rebuild sparring game engine in `HomePage`: replace the monolith `connect-four/src/App.jsx` sparring logic with clean components; manage board state, turn, game-over, move history; call `POST /api/scores` for AI moves — `connect-four/src/pages/HomePage.jsx`
- [X] T045 [US2] Implement AI difficulty levels using `/api/scores`: easy (random among legal moves), medium (best score), hard (best with configurable error rate), perfect (always best); difficulty selection lives in UI only — `connect-four/src/pages/HomePage.jsx`
- [X] T046 [US2] Implement Commit-first toggle: when enabled, suppress `<Board>` highlight overlays, hint suggestions, and score displays during deliberation; preserve toggle state across moves within a game — `connect-four/src/pages/HomePage.jsx`
- [X] T047 [US2] Implement post-commit reveal panel: after user commits in Commit-first mode, call `POST /api/explain-move` (with `requestDeepReveal: true` if eligible); display score of move played, engine's best move + score, pattern tag and one-liner if meaningful delta — `connect-four/src/pages/HomePage.jsx`
- [X] T048 [US2] Wire hints-on mode contextual suggestions: when Commit-first is OFF, call `/api/explain-move` on hover to surface "Warning: opponent can create a double threat" style contextual hints using the classifier output — `connect-four/src/pages/HomePage.jsx`
- [X] T049 [US2] Track `session_start` on game start and `deep_reveal_viewed` on each post-commit reveal in sparring — `connect-four/src/pages/HomePage.jsx`

**Checkpoint**: User Story 2 is fully functional. Commit-first toggle hides all evaluative UI; post-move reveal works; Deep Reveal quota is shared correctly with puzzles.

---

## Phase 5: User Story 4 — Account & Paywall Gating (Priority: P4, prerequisite for US3)

**Goal**: Stripe can collect money. Paywall moments exist at natural conversion points. Tier changes take effect immediately.

**Note**: US4 is implemented before US3 (Coach) because the Coach is a paid-only feature.

**Independent Test**: An anonymous user can trigger the sign-in gate, create an account, and exhaust their quota; a free user can hit the paywall and complete Stripe Checkout with a test card; tier updates immediately.

### Implementation for US4

- [ ] T050 [US4] Set up Stripe products in Stripe dashboard: monthly plan ($4.99) and annual plan ($39); copy price IDs into Railway env vars (STRIPE_MONTHLY_PRICE_ID, STRIPE_ANNUAL_PRICE_ID) — **[HUMAN TASK — Stripe dashboard]**
- [X] T051 [US4] Implement `POST /api/stripe/create-checkout`: creates a Stripe Checkout session for the authenticated user; accepts `{ plan: 'monthly'|'annual' }`; returns `{ checkoutUrl }` — `connect-four/server/index.js`
- [X] T052 [US4] Implement `POST /api/stripe/webhook`: validate `Stripe-Signature` header; insert event into `stripe_events` before processing; handle `checkout.session.completed` (set tier='paid', store stripe_customer_id), `customer.subscription.deleted` (set tier='free'), `customer.subscription.updated`; **HUMAN REVIEW REQUIRED** — `connect-four/server/index.js`
- [X] T053 [US4] Implement `POST /api/stripe/portal`: create Stripe Customer Portal session; return `{ portalUrl }` — `connect-four/server/index.js`
- [X] T054 [US4] Wire `<PaywallModal>` upgrade button to call `POST /api/stripe/create-checkout` and redirect to Stripe Checkout; replace "coming soon" placeholder from Phase 2 — `connect-four/src/components/PaywallModal.jsx`
- [X] T055 [US4] Add paywall trigger to PuzzlesPage: free user clicking a cat 4–6 locked card opens `<PaywallModal>` and tracks `paywall_viewed` — `connect-four/src/components/PuzzleCategoryList.jsx`
- [X] T056 [US4] Add paywall trigger to DeepRevealButton: quota=0 opens `<PaywallModal>` and tracks `paywall_viewed` — `connect-four/src/components/DeepRevealButton.jsx`
- [X] T057 [US4] Track `signup_completed` event after successful Supabase magic-link auth; track `upgrade_completed` after Stripe webhook sets tier='paid' — `connect-four/server/index.js` and `connect-four/src/components/AuthModal.jsx`

**Checkpoint**: User Story 4 is fully functional. Test card `4242 4242 4242 4242` completes checkout; Supabase `users.tier` updates to 'paid' immediately; `stripe_events` table has the event record.

---

## Phase 6: User Story 3 — Personal AI Coach (Priority: P3, Paid Only)

**Goal**: A paid user sees their weakness map (miss rate by category) and can work through their blunder review queue. Each review puzzle appears as a fresh board with no indication of prior failure.

**Independent Test**: A paid user who has failed at least one puzzle opens `/coach`, sees the weakness map, starts a review, and the resolved position disappears from the queue on correct solve.

### Infrastructure for US3

- [X] T058 Write Supabase migration `005_coach.sql`: if `blunders` table not yet created in earlier migration, add it here (user_id, puzzle_id, board_state, move_played, correct_move, pattern_category, resolved_at, created_at, index on user_id + created_at WHERE resolved_at IS NULL); **HUMAN REVIEW REQUIRED** — `connect-four/server/migrations/005_coach.sql`

### Server implementation for US3

- [X] T059 [US3] Implement `GET /api/coach/weakness-map` endpoint: aggregate first-attempt failure rates from `puzzle_attempts` grouped by puzzle category; sort by miss_rate descending; require tier='paid' (403 otherwise) — `connect-four/server/index.js`
- [X] T060 [US3] Implement `GET /api/coach/queue` endpoint: return oldest unresolved blunder for the user; require tier='paid'; return `{ hasItems, queueCount, puzzle }` — `connect-four/server/index.js`
- [X] T061 [US3] Implement `POST /api/coach/queue/:blunderId/resolve` endpoint: set `resolved_at = now()` on the blunder record; require tier='paid' and ownership — `connect-four/server/index.js`
- [X] T062 [US3] Wire blunder capture in `POST /api/puzzles/:id/check`: on first-attempt failure for signed-in users, insert blunder record (board_state, move_played, correct_move, pattern_category) — already stubbed in T037, implement the insert here — `connect-four/server/index.js`

### UI for US3

- [X] T063 [US3] Build `CoachPage` at `/coach` (wrapped in `<PaywallGate>`): fetches weakness map and queue count on mount; shows weakness map + "Start review" button; empty state: "No positions in queue — keep training to build your personal curriculum" — `connect-four/src/pages/CoachPage.jsx`
- [X] T064 [US3] Build `WeaknessMap` component: renders category miss rates as a sorted card list (e.g., "Fork Setup: missed 5 of 8 — 62%"); no bar chart required at MVP — `connect-four/src/components/WeaknessMap.jsx`
- [X] T065 [US3] Wire review queue session: "Start review" loads the next blunder as a `<PuzzleBoard>` puzzle; on correct solve calls `POST /api/coach/queue/:id/resolve` and loads the next; on 2 failures stays in queue and loads the next — `connect-four/src/pages/CoachPage.jsx`
- [X] T066 [US3] Implement persistent session stats for paid users: call `SupabaseStore.saveSessionStats()` at end of each puzzle session; retrieve previous session's stats to compute delta — `connect-four/src/store/SupabaseStore.js`
- [X] T067 [US3] Display "delta vs. last session" in PuzzlesPage accuracy bar for paid users: e.g., "Fork Setup: 62% → 71% (+9%)" — `connect-four/src/pages/PuzzlesPage.jsx`

**Checkpoint**: User Story 3 is fully functional. A paid user can see their weakness map, start a review session, and have resolved positions removed from the queue.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify instrumentation, harden mobile, confirm quality bar, and ship.

- [X] T068 Add `express-rate-limit` to all `/api/` endpoints: `/api/explain-move` → 30 req/min per IP, `/api/scores` and `/api/explain` → 60 req/min, `/api/stripe/create-checkout` → 10 req/min, all others → 120 req/min — `connect-four/server/index.js`
- [X] T069 Add input validation to all API endpoints: `moves` must match `/^[1-7]{0,42}$/`; `candidateCol` must be integer in [0, 6]; `plan` must be 'monthly'|'annual'; reject invalid input with 400 before touching the solver — `connect-four/server/index.js`
- [X] T070 Wrap `<PuzzlesPage>` and `<HomePage>` with `<ErrorBoundary>`; confirm solver errors degrade gracefully (disable hint display, show toast) without crashing the app — `connect-four/src/App.jsx`
- [X] T071 [P] Create PWA manifest with app name, icons, theme color, and `display: standalone` — `connect-four/public/manifest.json`
- [X] T072 [P] Create service worker for PWA installability (cache shell assets only; no offline puzzle content needed at MVP) — `connect-four/public/sw.js`
- [ ] T073 Mobile layout audit: verify no horizontal scroll at 375px viewport; all tap targets ≥ 44px; board scales correctly; run in Chrome DevTools iPhone SE preset
- [ ] T074 Analytics funnel verification: walk the full anonymous → sign-in → free → paywall → paid conversion path; confirm all 8 KPI events fire exactly once in the `tracks` table; write and verify the 5 launch KPI SQL queries against the table
- [ ] T075 Re-run hallucination gate on the final build (100 positions × 5 generations; error rate must still be < 2%)
- [ ] T076 Test Stripe webhook lifecycle via `stripe listen --forward-to localhost:3000/api/stripe/webhook` and `stripe trigger` for all 3 events; verify `stripe_events` table records each
- [ ] T077 Test auth migration end-to-end: create anonymous session with puzzle attempts in IndexedDB, complete sign-up, verify `puzzle_attempts` appear in Supabase and IndexedDB is cleared
- [ ] T078 [P] Verify Supabase automatic backups are enabled in the Supabase dashboard
- [ ] T079 [P] Verify Sentry alerts configured for server crashes and unhandled React errors; trigger a test error to confirm the alert fires
- [ ] T080 Write and publish soft launch post for Papergames.io community and Reddit r/connectfour **[HUMAN TASK]**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion. Blocks all user stories.
  - Within Phase 2: Epics 2 and 3 can run in parallel (different files). Epic 4 depends on Epic 2 (solver endpoint) and Epic 3 (auth middleware for quota enforcement).
  - The Hallucination Gate (T029) is a hard stop for Phase 3.
- **US1 (Phase 3)**: Depends on Phase 2 completion (Explanation Engine must pass hallucination gate).
- **US2 (Phase 4)**: Depends on Phase 2 completion (borrows Explanation Engine). Can start in parallel with US1 if resources allow.
- **US4 (Phase 5)**: Depends on Phase 2 (auth) and Phase 3 (paywall trigger points wired in Puzzle UI).
- **US3 (Phase 6)**: Depends on Phase 5 (Stripe must be live for paid tier to exist) and Phase 3 (blunder capture requires puzzle attempts).
- **Polish (Phase 7)**: Depends on all user story phases being complete.

### User Story Dependencies

- **US1 (Puzzle Trainer)**: Depends on Foundational phase only.
- **US2 (Sparring)**: Depends on Foundational phase. Independent of US1.
- **US4 (Account/Paywall)**: Depends on US1 (paywall trigger points) and Phase 2 (auth). Must complete before US3.
- **US3 (Coach)**: Depends on US4 (paid tier via Stripe) and US1 (blunder data from puzzle attempts).

### Within Each Phase

- Models and migrations before server endpoints.
- Server endpoints before UI components that call them.
- All UI components before the page that composes them.
- Tests (predicates, classifier) before the Phase 2 hallucination gate.
- Content authoring (T031, T032) can run in parallel with any server implementation tasks.

### Critical Path

```
T001 → T002 → T005 (solver on Railway)
  → T006 → T013 → T014 → T015 (store layer)
    → T018 → T019 → T020 → T022 (auth)
      → T023 → T024 → T025 → T026 → T028 → T029 (Explanation Engine + Hallucination Gate)
        → T030 → T033 → T034 → T037 → T041 (Puzzle Trainer core loop)
```

---

## Parallel Opportunities

### Within Phase 2 (Foundational)

```
# Epic 2 components can all build in parallel once T006 route shell is done:
T007 (i18n)
T008 (Board)
T009 (Column + Piece)
T010 (DeepRevealButton)
T011 (PaywallModal)
T012 (ErrorBoundary)

# Epic 3 and Epic 4 can run in parallel (different files):
T018-T022 (Auth migration + AuthGate)
T023-T028 (Classifier + Explanation Engine)
```

### Within Phase 3 (US1)

```
# Content authoring and server implementation are independent:
T031 (Puzzle content cats 1-3) + T032 (Puzzle content cats 4-6)  ← parallel content work
T033 (Predicate evaluator) + T034 (Predicate tests)               ← parallel with content

# API endpoints can be parallel:
T035 (GET /api/puzzles) + T036 (GET /api/puzzles/:id)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — **wait for Hallucination Gate**
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Can an anonymous user play a puzzle and see a one-liner? Can a signed-in free user see a Deep Reveal?
5. Collect early feedback before investing in sparring, Stripe, and Coach.

### Incremental Delivery

1. Phase 1 + 2 → Foundation live
2. Phase 3 → Puzzle Trainer → validate core loop
3. Phase 4 → Commit-first Sparring → second conversion surface
4. Phase 5 → Stripe → monetization live
5. Phase 6 → Coach → paid retention flywheel starts
6. Phase 7 → Polish → ship

---

## Notes

- `[P]` = different files, no dependencies on incomplete tasks within this phase
- `[US#]` = maps task to specific user story for traceability
- Human-required tasks are marked `[HUMAN TASK]` or `[HUMAN REVIEW REQUIRED]`
- Migrations always require human review before applying to production
- Content authoring (T031, T032) is human work that can run in parallel with any code task
- Never modify `connect-four/server/index.js` routes `/api/scores`, `/api/explain`, `/api/ping` — add only
- Commit after each task or logical group; stop at any phase checkpoint to validate independently
