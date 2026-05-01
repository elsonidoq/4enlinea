# Feature Specification: MVP Gap Fixes

**Feature Branch**: `002-mvp-gap-fixes`  
**Created**: 2026-04-30  
**Status**: Draft  
**Input**: User description: "There are many gaps in the implementation of the MVP documented in docs/mvp/v1_gaps.md to be fixed"

## Overview

The DecodeC4 MVP has been built but contains 24 documented gaps (see `docs/mvp/v1_gaps.md`) that prevent end-to-end use of the product. This feature covers the fixes required to bring the implementation into alignment with `docs/mvp/mvp_product_spec.md`. Gaps are grouped by theme and ordered so that each story can be validated independently.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Playable Puzzle Trainer with Placeholder Content (Priority: P1)

An anonymous user can open `/puzzles`, select any of the three free categories, attempt a puzzle, receive correct/wrong/tied feedback, and see a one-line explanation. No category shows "0 puzzles" and no screen gets stuck on "Loading…".

**Why this priority**: The puzzle loop is the core MVP value proposition. Nothing else can be validated without at least one playable puzzle per category.

**Independent Test**: Create ≥1 solver-verified placeholder puzzle per category (all 6). Open `/puzzles` as an anonymous user, click each category, attempt a move, and receive feedback — all without touching the auth or coach flows.

**Acceptance Scenarios**:

1. **Given** the `/puzzles` page is loaded, **When** a category with 0 puzzles is selected, **Then** a clear "no puzzles yet" empty state is shown with a back button — not an infinite "Loading…" spinner.
2. **Given** placeholder puzzles exist in at least one free category, **When** a user selects the category and makes a move, **Then** the board updates and feedback (correct / wrong / tied) is displayed immediately.
3. **Given** a user clicks "wrong" column twice, **When** the second wrong attempt is submitted, **Then** the correct column is highlighted and a one-line explanation is shown automatically.
4. **Given** a user selects a free category with puzzles, **When** they click "Next puzzle →", **Then** a new puzzle from the same category is loaded.

---

### User Story 2 - Puzzle Curation Tool (Priority: P1)

A content author (the product owner) can author a puzzle by entering a move string, visually inspect the board, run the solver to confirm the goal predicate, and save the puzzle to the database — without editing SQL or JSON files by hand.

**Why this priority**: Without a curation tool the placeholder puzzles (US1) and final 50 hand-curated puzzles cannot be created at an acceptable pace or quality.

**Independent Test**: Open the curation tool, enter a valid move string for a category 1 (Immediate Threat) position, verify the board renders, verify the solver returns the expected winning column, save the puzzle, and confirm it appears in `/api/puzzles?category=1`.

**Acceptance Scenarios**:

1. **Given** the curation tool is open, **When** a move string is entered, **Then** the 6×7 board updates in real time to reflect the position.
2. **Given** a move string is entered, **When** the author clicks "Run solver", **Then** all column scores are displayed alongside a recommended goal predicate type.
3. **Given** all required fields are filled (move string, category, goal prompt, predicate type), **When** the author saves, **Then** the puzzle is persisted and immediately visible via the public API.
4. **Given** the author enters an invalid move string (illegal column sequence or too many moves), **When** the solver is run, **Then** a clear validation error is shown and the record is not saved.

---

### User Story 3 - External Services Connected (Priority: P1)

A developer can start the app locally with all three external services (Supabase, Anthropic, Stripe) configured via environment variables. Auth, LLM explanations, and payment flows all work end-to-end.

**Why this priority**: Auth, analytics, explanations, and payments are all blocked without this. Every other user story after US1 depends on at least one of these services.

**Independent Test**: With `.env` files populated, sign in via magic link, view a Deep Reveal that contains real LLM text (not the template fallback), and verify the `tracks` table row is written in Supabase.

**Acceptance Scenarios**:

1. **Given** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ANTHROPIC_API_KEY` are set, **When** the app starts, **Then** no "database unavailable" or "solver unavailable" errors appear in server logs.
2. **Given** a user sends a magic-link email, **When** they click the link, **Then** they are signed in and the Supabase `users` row exists with `tier='free'`.
3. **Given** a signed-in free user requests a Deep Reveal, **When** the response arrives, **Then** the explanation is LLM-generated prose (not the `"Move in column N. Pattern: <tag>."` template string).
4. **Given** any page is visited, **When** `session_start` fires, **Then** a row appears in the Supabase `tracks` table.

---

### User Story 4 - Analytics KPI Events Complete (Priority: P2)

All 8 required KPI events fire at the correct moments and reach the `tracks` table: `session_start`, `puzzle_attempted`, `puzzle_solved_correct`, `puzzle_solved_wrong`, `deep_reveal_viewed`, `signup_completed`, `paywall_viewed`, `upgrade_completed`.

**Why this priority**: Without complete analytics the launch success metrics (D7 retention, conversion rate) cannot be measured.

**Independent Test**: Walk the full anonymous → sign-in → exhaust quota → paywall → upgrade path and verify all 8 events appear exactly once in the `tracks` table in the correct sequence.

**Acceptance Scenarios**:

1. **Given** a user completes magic-link sign-in, **When** the session is established, **Then** a `signup_completed` event is recorded in `tracks`.
2. **Given** a paid upgrade completes via Stripe webhook, **When** `tier` is set to `'paid'`, **Then** an `upgrade_completed` event is recorded in `tracks`.
3. **Given** a free user's Deep Reveal quota is exhausted and they open the paywall modal via `DeepRevealButton`, **When** the modal appears, **Then** a `paywall_viewed` event is recorded in `tracks`.
4. **Given** any of the 8 KPI events occurs, **When** the event fires, **Then** the `tracks` table row contains `uid` (always), `user_id` (when signed in), `path`, and `event_data`.

---

### User Story 5 - Missing Database Tables in Migrations (Priority: P2)

When Supabase migrations are applied in order, all tables referenced by the application exist: `session_stats`, and the `005_coach.sql` migration file is created so the migration runner completes without errors.

**Why this priority**: Production deploy will fail if migrations are incomplete. `session_stats` is actively written to by the store layer and would cause silent data loss.

**Independent Test**: Apply all migrations to a fresh Supabase project and verify the app starts without any "relation does not exist" errors when exercising auth, puzzle, and coach flows.

**Acceptance Scenarios**:

1. **Given** all migration files are applied in order, **When** `SupabaseStore.saveSessionStats()` is called, **Then** the write succeeds and can be read back by `getSessionStats()`.
2. **Given** all migration files are applied, **When** the app boots and a user signs in, **Then** no 500 errors occur related to missing tables or columns.
3. **Given** the `005_coach.sql` file exists, **When** it is applied after `003_puzzles.sql`, **Then** the migration runner reports success (the blunders table and its index exist as expected).

---

### User Story 6 - Blunder Capture Fixed to First Attempt Only (Priority: P2)

A signed-in user who fails a puzzle on the first attempt gets exactly one blunder record. A user who fails on the second attempt does not add a second blunder for the same puzzle session.

**Why this priority**: Duplicate blunders corrupt the Personal AI Coach's weakness map and queue, degrading the paid feature.

**Independent Test**: Fail a puzzle on the first attempt and verify one blunder row is inserted. Cancel and retry the same puzzle, fail again on the first attempt — a second distinct blunder row is added (for the new attempt session). Then fail a puzzle on the second attempt — no blunder row is added.

**Acceptance Scenarios**:

1. **Given** a signed-in user fails a puzzle on their first click, **When** `POST /api/puzzles/:id/check` is called, **Then** exactly one blunder row is inserted in the `blunders` table.
2. **Given** a signed-in user fails a puzzle on their second click (having already failed once in the same session), **When** `POST /api/puzzles/:id/check` is called, **Then** no additional blunder row is inserted.
3. **Given** a signed-in user solves a puzzle correctly on their first attempt, **When** `POST /api/puzzles/:id/check` is called, **Then** no blunder row is inserted.

---

### User Story 7 - Coach Review Queue Functional (Priority: P2)

A paid user who has blunders in their queue can click "Start review", see each blunder presented as a fresh puzzle board (with no indication it was previously failed), solve it correctly to remove it from the queue, or fail twice to advance to the next without removing it.

**Why this priority**: The review queue is the core paid-tier retention flywheel. It is currently completely non-functional (`onClick={() => {}}`).

**Independent Test**: As a paid user with at least one blunder, click "Start review", verify the board matches the blunder position, solve correctly, verify the blunder is resolved (`resolved_at` set), and verify the queue count decreases by 1.

**Acceptance Scenarios**:

1. **Given** a paid user has ≥1 unresolved blunder, **When** they click "Start review", **Then** a puzzle board is shown for the oldest unresolved blunder position.
2. **Given** the review board is active, **When** the user solves it correctly, **Then** `POST /api/coach/queue/:id/resolve` is called, the queue count decreases by 1, and the next blunder (if any) is loaded.
3. **Given** the review board is active, **When** the user fails twice, **Then** the blunder stays in the queue and the next blunder is loaded.
4. **Given** the queue is exhausted, **When** the last blunder is resolved, **Then** the empty-queue message is shown: "No positions in queue — keep training to build your personal curriculum."

---

### User Story 8 - Coach Page Gate and Sign-in CTA (Priority: P3)

An anonymous user visiting `/coach` sees a sign-in button that opens the auth modal. A signed-in free user sees a clear "paid feature" locked state with an upgrade prompt — not an abrupt paywall modal fire.

**Why this priority**: Currently the page is a dead-end for anonymous and free users. Fixing the gates turns dead-ends into conversion moments.

**Independent Test**: Visit `/coach` as anonymous → sign-in button visible and functional. Sign in (free tier) → locked state with upgrade CTA visible before any modal. No automatic modal fires on page load.

**Acceptance Scenarios**:

1. **Given** an anonymous user visits `/coach`, **When** the page loads, **Then** a "Sign in" button is visible and clicking it opens the auth modal.
2. **Given** a signed-in free user visits `/coach`, **When** the page loads, **Then** a locked card is shown with label "Personal AI Coach — Paid Feature" and an "Upgrade" CTA button; no modal fires automatically.
3. **Given** a signed-in free user clicks "Upgrade" on the coach locked state, **When** the button is clicked, **Then** the `PaywallModal` opens and a `paywall_viewed` event is tracked.

---

### User Story 9 - Sparring Post-Commit Reveal with Score Comparison (Priority: P3)

After committing a move in Commit-first mode, the reveal panel shows: the score of the move played, the engine's best move and its score, and the pattern one-liner if there was a meaningful delta.

**Why this priority**: The current reveal only shows a one-liner with no score context, making it hard for users to understand how bad or good their move was.

**Independent Test**: Enable Commit-first, make a clearly suboptimal move, commit it, and verify the reveal panel shows the score of the played move, the column of the best move, and the best move's score side by side with the played move's score.

**Acceptance Scenarios**:

1. **Given** Commit-first mode is enabled and a user commits a move, **When** the post-reveal panel appears, **Then** it shows the solver score of the move played and the solver score of the engine's best move.
2. **Given** the played move is the engine's best move, **When** the reveal panel appears, **Then** it shows "Best move played" and no separate "best move" column is highlighted.
3. **Given** the played move is suboptimal, **When** the reveal panel appears, **Then** the engine's best column is indicated alongside its score, and the pattern one-liner is shown.

---

### User Story 10 - `hard` Difficulty Distinct from `perfect` (Priority: P3)

In Sparring, the `hard` AI makes meaningful mistakes at a rate that is noticeably weaker than `perfect` but stronger than `medium`, so that the difficulty labels convey truthful expectations.

**Why this priority**: Currently `hard` and `perfect` are identical. Players choosing `hard` expect a challenge with occasional AI errors — not a perfect solver.

**Independent Test**: Play 20 games on `hard` and 20 on `perfect`. The `hard` win rate for the human should be statistically higher than on `perfect`.

**Acceptance Scenarios**:

1. **Given** the user selects `hard` difficulty, **When** the AI moves, **Then** it plays the best move approximately 80% of the time and a random legal move the remaining 20%.
2. **Given** the user selects `perfect` difficulty, **When** the AI moves, **Then** it always plays the highest-scored move (ties broken randomly), same behaviour as before.
3. **Given** the user switches difficulty mid-game, **When** subsequent AI moves are made, **Then** they reflect the new difficulty immediately.

---

### Edge Cases

- What happens if the solver returns an error during puzzle check? → Error is surfaced as "unable to check move, try again" without crashing.
- What happens if Anthropic API is unreachable during a Deep Reveal request? → The one-liner fallback is shown; no 500 is returned to the client.
- What happens if a blunder's `puzzle_id` no longer exists (puzzle deleted)? → The blunder is silently skipped and the next queue item is loaded.
- What happens if the Stripe webhook fires but the `users` table update fails? → The raw event is preserved in `stripe_events` so it can be replayed; the user sees no change until retry.
- What happens if the curation tool is used without DB access? → A clear "database unavailable" message is shown; no partial save occurs.

---

## Requirements *(mandatory)*

### Functional Requirements

**Puzzle Content & Empty States**

- **FR-001**: The system MUST display a "no puzzles available" empty state with a working back button when a selected category has zero puzzles.
- **FR-002**: The system MUST include at least 1 solver-verified placeholder puzzle per category (all 6) that exercises the full puzzle flow end-to-end.

**Puzzle Curation Tool**

- **FR-003**: The curation tool MUST render a live 6×7 board from a move string entered by the author.
- **FR-004**: The curation tool MUST invoke the solver and display per-column scores when the author requests it.
- **FR-005**: The curation tool MUST persist a valid puzzle record (move string, category, goal prompt, predicate type) to the database on save.
- **FR-006**: The curation tool MUST reject and display errors for invalid move strings before allowing a save.

**External Services**

- **FR-007**: The project MUST include documented `.env.example` files listing all required environment variables for both server and frontend.
- **FR-008**: When `ANTHROPIC_API_KEY` is set, the explanation engine MUST return LLM-generated prose rather than the template fallback for Deep Reveals.
- **FR-009**: When `SUPABASE_URL` and keys are set, all DB writes (tracks, blunders, session_stats, puzzle_attempts) MUST reach Supabase without silent failures.

**Analytics**

- **FR-010**: The system MUST fire `signup_completed` when a Supabase auth session is first established after magic-link verification.
- **FR-011**: The system MUST fire `upgrade_completed` in the Stripe webhook handler after `tier` is set to `'paid'`.
- **FR-012**: The system MUST fire `paywall_viewed` when the `DeepRevealButton` opens `PaywallModal` due to exhausted quota.

**Database Migrations**

- **FR-013**: A `session_stats` table MUST be defined in a migration and support per-user, per-date stats rows.
- **FR-014**: A `005_coach.sql` migration file MUST exist and be idempotent when applied after `003_puzzles.sql`.

**Blunder Capture**

- **FR-015**: The system MUST insert a blunder record only on the user's first failed attempt for a given puzzle session; subsequent failed attempts in the same session MUST NOT insert additional blunder rows.

**Coach Review Queue**

- **FR-016**: The "Start review" button MUST load the oldest unresolved blunder as a playable puzzle board.
- **FR-017**: A correct solve during review MUST call `POST /api/coach/queue/:id/resolve` and load the next blunder.
- **FR-018**: Two failed attempts during review MUST advance to the next blunder without resolving the current one.

**Coach Page Gates**

- **FR-019**: Anonymous users on `/coach` MUST see a visible "Sign in" button that opens the auth modal.
- **FR-020**: Signed-in free users on `/coach` MUST see a locked-state card with an upgrade CTA; no paywall modal fires automatically on page load.

**Sparring Post-Commit Reveal**

- **FR-021**: The post-commit reveal panel MUST display the solver score of the move played and the solver score of the engine's best move.
- **FR-022**: When the played move equals the engine's best, the reveal MUST say "Best move played" rather than showing a separate best-move column.

**AI Difficulty**

- **FR-023**: The `hard` AI difficulty MUST play the best move approximately 80% of the time and a random legal move the remaining 20%, making it statistically distinguishable from `perfect`.

### Key Entities

- **Puzzle**: move string, category (1–6), goal prompt, goal predicate type, solver-verified, active flag
- **Blunder**: links a user to a puzzle session failure; records move played, correct move, pattern category, resolved timestamp
- **Session Stats**: per-user per-date accuracy counts by category; persisted for paid users, local-only for free
- **Track Event**: uid (always), user_id (when signed in), event name, event data JSON, timestamp

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 6 puzzle categories are playable end-to-end (select → attempt → feedback) with placeholder content before any hand-curated puzzles are authored.
- **SC-002**: A content author can create and verify a new puzzle in under 5 minutes using the curation tool, without editing any SQL or JSON files.
- **SC-003**: All 8 KPI events appear in the `tracks` table for a complete anonymous → free → paid conversion walkthrough, with zero missing events.
- **SC-004**: Deep Reveal explanations contain LLM-generated prose (not template strings) for 100% of requests when Anthropic is connected.
- **SC-005**: The coach review queue session completes a full cycle (fail → blunder captured → start review → solve → resolved) without any dead-end UI state.
- **SC-006**: Blunder records in the database are 1-to-1 with first-attempt failures; no duplicate blunder rows exist for a single puzzle session.
- **SC-007**: A human playing 20 games on `hard` achieves a statistically higher win rate than on `perfect` (at least 2× more wins in aggregate).
- **SC-008**: All Supabase migrations apply cleanly to a fresh project with zero errors and all referenced tables exist.

---

## Assumptions

- Placeholder puzzles (FR-002) will be authored by Claude Code using the solver binary already present in the repo — they do not need to be hand-curated but must be solver-verified.
- The curation tool is an internal-only page (not publicly reachable without knowing the URL or an admin flag); no authentication system for the tool itself is required for MVP.
- The `hard` difficulty error rate of ~20% is a reasonable default; the exact value can be adjusted post-launch based on user feedback without a spec change.
- The `session_stats` migration will be added to an existing migration file or a new `006_session_stats.sql` — whichever keeps the runner ordering clean.
- Environment variable documentation (FR-007) is a `.env.example` file, not a hosted secrets manager.
- The post-commit reveal score data will be obtained by making an additional `/api/scores` call at reveal time rather than modifying the `/api/explain-move` response schema, to avoid breaking existing callers.
- The curation tool will be a route within the existing React app (e.g., `/admin/curate`) rather than a separate application.
