# DecodeC4 — MVP Technical Roadmap

**Role:** Principal Engineer  
**Constraint:** Solo founder + Claude Code. Optimize for shipping speed, low complexity, survivable execution.  
**Horizon:** 8 weeks to soft launch.

---

## What must be true for this product to succeed

Users must experience the "aha" moment — a position they failed, explained in human language grounded in solver truth — in the first session. Everything is sequenced to deliver that moment as early as possible and protect it from regressions.

The product risk is the Explanation Engine. If pattern classification is wrong, or the prose feels generic, there is no retention. Architecture decisions serve this risk.

---

## What the PoC already provides (keep, don't rewrite)

`connect-four/server/index.js` — Node.js backend with two endpoints that are production-worthy:
- `POST /api/scores` — serialized solver query, correct empty-board fallback, error handling.
- `POST /api/explain` — heatmap generation via `-x` mode solver.

Keep both endpoints as-is. The backend is the right shape; it just needs new endpoints added alongside.

**What the PoC does NOT provide (must be rebuilt or built from scratch):**
- The frontend is a 780-line monolith with no routing, no component architecture, and — critically — it calls the Anthropic API directly from the browser (API key exposed, no caching, no rate limiting). This must be rebuilt.
- No auth, no state abstraction, no persistence beyond React state.
- No puzzle infrastructure, no pattern classifier, no tier enforcement.
- UI is in Spanish; MVP ships in English with i18n wired for Spanish post-launch.

---

## Technical stack (locked)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React PWA, react-router-dom, react-i18next | Familiar, PoC reuse, i18n from day 1 |
| Solver | Pascal Pons `c4solver` via Node.js (existing) | Already built, keep |
| LLM | Claude Sonnet via server-side API call | Move out of browser; enables caching |
| Pattern classifier | Custom rule-based JS/TS module (server-side) | No ML overhead; bitboard + solver output |
| State | Storage-agnostic abstraction (IndexedDB anon → Supabase signed-in) | Locked decision |
| DB + Auth | Supabase (Postgres + Auth) | Managed, one service |
| Hosting | Railway (Node.js + static frontend) | One deployment target |
| DNS + DDoS | Cloudflare | Managed |
| Payments | Stripe Checkout + Customer Portal | Standard |
| Analytics | `tracks` table in Supabase | Locked schema |
| Error tracking | Sentry (free tier) | Minimal ops |

---

## Phase 1 — Foundation (Days 1–10)

> **Goal:** Everything the rest of the build depends on is live before feature work begins. No rework of infrastructure mid-build.

---

### Epic 1 — Infrastructure & Deployment Pipeline

**Delivers:**
- Railway project created; existing Node.js backend deployed and reachable at a stable URL.
- Supabase project provisioned: Postgres DB, Auth enabled, `tracks` table created, connection string in Railway env vars.
- Cloudflare DNS pointed at Railway.
- Sentry wired into the Node.js server (uncaught exceptions → alert).
- Secrets in Railway environment variables (no `.env` files in repo).
- A single `npm run deploy` or Railway auto-deploy from `main` branch.

**Why first:** Every subsequent epic ships into this pipeline. Setting it up last means every feature is developed against localhost and tested against prod for the first time at launch — a classic solo-founder trap.

**Effort:** 1–2 days.

---

### Epic 2 — Frontend Skeleton (Routing, i18n, Component Primitives, State Layer)

**Delivers:**
- New React app scaffolded (Vite + React 18), replacing the PoC single-file component. Served as static files from Railway alongside the API.
- React Router configured with three route shells: `/` (home/sparring), `/puzzles` (puzzle trainer), `/coach` (AI coach, paid).
- `react-i18next` wired with English translation file; all user-visible strings go through `t()` from day 1.
- Shared UI primitives: `<Board>`, `<Column>`, `<Piece>`, `<DeepRevealButton>`, `<PaywallModal>`. These are the atoms everything else composes from.
- Storage-agnostic state layer: `ProfileStore` interface with two implementations — `IndexedDBStore` (anonymous, device-bound UUID) and `SupabaseStore` (authenticated). All feature code calls `ProfileStore` only; it never knows which backend is active.
- `track(event, data)` helper that writes to `POST /api/track`, which inserts into the `tracks` table. Uid is always present (device hash); user_id is added when signed in.

**Why second:** Every feature epic will render into these routes, use these components, call `ProfileStore`, and emit track events. Building these now means no rework when auth and paywall are added.

**Effort:** 3–4 days.

---

### Epic 3 — Supabase Auth & Account Tier Enforcement

**Delivers:**
- Sign-up and sign-in flows (email + magic link; no custom auth, no OAuth yet).
- JWT session handling; Supabase client wired in both frontend and backend.
- `users` table extended with `tier` column (`anonymous` | `free` | `paid`) and `deep_reveal_count` + `deep_reveal_reset_at` for daily cap tracking.
- On signup: anonymous `IndexedDB` state (puzzle progress, blunder log) migrated to Supabase; `IndexedDBStore` swapped for `SupabaseStore` transparently.
- `<AuthGate>` component: wraps any feature that requires sign-in; shows sign-in prompt if anonymous.
- `<PaywallGate>` component: wraps any paid feature; shows upgrade modal if free tier.
- Upgrade modal is wired but Stripe is a later epic — for now it shows a "coming soon" placeholder.

**Why third:** Auth must exist before puzzle gating, Deep Reveal caps, and Stripe can work. Building auth after features means retrofitting gate checks everywhere — expensive and error-prone with Claude Code assistance.

**Effort:** 2–3 days.

---

## Phase 2 — Core Value Loop (Days 11–25)

> **Goal:** A user can land, play a puzzle, and experience a Deep Reveal. This is the "aha" moment. It must ship as a unit — puzzles without explanations are just another solver.

---

### Epic 4 — Explanation Engine (Pattern Classifier + LLM + Caching)

**Delivers:**
- `POST /api/explain-move` server endpoint that accepts `{ moves: string, candidateCol: number, humanFirst: boolean }` and returns `{ oneLiner: string, deepReveal: DeepReveal | null }`.
- **Pattern classifier** (`server/classifier.js`): rule-based module that takes board state + solver scores and returns a pattern tag. Implements detection for all 7 categories:
  - Bitboard-only (cats 1–4): Immediate Threat, Forbidden Columns, Forced Block, Double Threat — detectable without additional solver calls. Forbidden Columns detection simulates each legal move and checks for an opponent immediate win on the next ply.
  - Solver-guided (cats 5–7): Fork Setup (multi-move double threat established), Zugzwang (any move is disadvantageous by solver), Parity Control (Claimeven/Lowinverse/Highinverse via row dominance).
- **LLM integration**: Claude Sonnet called server-side with the pattern tag, solver scores, and board state. Prompt caching keyed by `sha256(moves + candidateCol)` — computed once per unique position/move, shared across all users.
- Response cache stored in Supabase (`explanation_cache` table: `position_hash`, `one_liner`, `deep_reveal_json`, `created_at`). Cache hit skips the LLM call entirely.
- Deep Reveal daily cap enforced server-side: free users get 3/day (reset midnight UTC), anonymous users get 0, paid users unlimited. Cap is never decremented by auto-reveals (one-liners on wrong answers are always free).
- **Hallucination acceptance gate:** before this epic is "done", run 100 positions × 5 generations. Error rate must be < 2%. This is not optional — it is the definition of done.

**Why fourth:** This is the product. Everything downstream (puzzles, sparring reveal, coach) consumes this engine. Building puzzles before the engine would mean a placeholder "coming soon" explanation that trains users to ignore the explanation panel — fatal for habit formation.

**Effort:** 5–6 days. Budget extra iteration time on the classifier. This is the highest-risk epic in the roadmap.

---

### Epic 5 — Puzzle Trainer (50 Curated Positions + Game Loop)

**Delivers:**
- **Puzzle data model**: each puzzle is a JSON record with `{ id, category, moveString, goalPredicateType, goalPredicateParams, cooperativeAiMoves, difficulty }`. Stored in Supabase `puzzles` table, seeded at migration time.
- **50 hand-curated positions** (~8 per category) authored and validated. This is content work, not code — each position must be verified by the solver before committing to the table.
- **Goal predicate evaluator** (`server/predicates.js`): implements per-category evaluation combining solver score + classifier output:
  - Immediate Threat: move scores as forced win.
  - Forbidden Columns: user-submitted set of columns matches exactly the set of columns where playing grants opponent an immediate win. Both false positives and false negatives fail the predicate.
  - Forced Block: move eliminates opponent's immediate win (equal-score non-blocking move is rejected).
  - Double Threat: ≥ 2 distinct winning threats exist after the move.
  - Fork Setup: after the full multi-move sequence, a double threat is established.
  - Zugzwang / Parity Control: solver confirms control is preserved.
- **Multi-move puzzle flow**: user plays, server returns the cooperative AI response (pre-authored, not solver-picked), user plays again. Goal predicate evaluated after user's final move.
- **Puzzle UI** (`/puzzles` route):
  - Board with prompt ("You are Red — find the immediate win").
  - Feedback: correct first attempt → green flash + one-liner (Deep Reveal on tap). Wrong → "not the best move, try again". After 2 failures → reveal correct move with Deep Reveal.
  - Tied move: "also works — ties with col X in the engine's analysis".
  - Session accuracy by category displayed at top.
- **Category gating**: cats 1–4 free (anonymous + free + paid), cats 5–7 paid only. Free users see locked preview cards for cats 5–7 with upgrade prompt.
- Track events: `puzzle_attempted`, `puzzle_solved_correct`, `puzzle_solved_wrong`, `deep_reveal_viewed`.

**Why fifth:** This is the primary retention driver and the first complete user value loop. It depends on the Explanation Engine (Epic 4) and Auth gating (Epic 3).

**Effort:** 5–6 days (3 days code + 2–3 days content authoring).

---

## Phase 3 — Sparring + Monetization (Days 26–36)

> **Goal:** Close the monetization loop. Users hit the paywall naturally during sparring Deep Reveals; Stripe converts them.

---

### Epic 6 — Sparring Mode (Rebuilt from PoC + Commit-first Toggle)

**Delivers:**
- Full sparring game rebuilt in the new component architecture (Board, Column, Piece, turn management, AI difficulty via `/api/scores`).
- Difficulty levels: easy (random among legal moves), medium (greedy best), hard (solver best with occasional suboptimal moves — configurable depth), perfect (solver best always). Difficulty controls the AI column-selection logic, not a separate code path.
- **Commit-first toggle**: when enabled, all hints, solver scores, and heatmaps are hidden until the user commits a move. Clicking a column immediately commits — no confirmation step. After commit: score of move played, engine's best move + score, pattern tag from Explanation Engine (if meaningful difference). This is a Deep Reveal and counts against the daily cap for free users.
- Hints-on mode (existing PoC behavior) preserved and accessible when commit-first is off.
- Contextual suggestions in hints-on mode: "Warning: opponent can create a double threat", "Immediate threat available in col X".
- Track events: `session_start`, `deep_reveal_viewed`.

**Why sixth:** Sparring is lower retention risk than puzzles (it exists in the PoC). Placing it after the puzzle trainer means the Explanation Engine is already validated before being integrated into the more complex sparring flow. Commit-first mode also reuses Deep Reveal infrastructure directly.

**Effort:** 3–4 days.

---

### Epic 7 — Stripe Paywall & Subscription

**Delivers:**
- Stripe Checkout sessions for two plans: $4.99/month and $39/year.
- `POST /api/stripe/create-checkout` creates a Checkout session for the authenticated user.
- `POST /api/stripe/webhook` handles `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated` → updates `tier` in Supabase `users` table.
- Customer portal link (`POST /api/stripe/portal`) for self-service subscription management.
- Paywall modal wires up the Checkout link: triggers when a free user hits a cat 5–7 puzzle, exhausts their 3 Deep Reveals, or tries to access the AI Coach.
- Stripe customer ID stored on the user record.

**Why seventh:** Stripe depends on auth being solid (Epic 3) and paywall triggers being wired (Epic 5, 6). Building it after those features means the paywall moments are already instrumented and the upgrade flow is complete in one shot.

**Effort:** 2–3 days.

---

## Phase 4 — Retention Systems (Days 37–44)

> **Goal:** Give paid users a reason to return beyond session novelty. The coach compounds in value the longer they train.

---

### Epic 8 — Personal AI Coach (Paid)

**Delivers:**
- **Blunder capture**: auto-log on every puzzle first-attempt failure to `blunders` table (`user_id`, `puzzle_id` or `board_state`, `move_played`, `correct_move`, `pattern_category`, `created_at`, `resolved_at`). Silent — no UI notification.
- **Weakness map**: aggregate failures by pattern category; surface the user's weakest area. Stored as a materialized view or computed on-demand from the `blunders` table.
- **Review queue**: failed positions re-served as fresh puzzles (no indication they were previously failed). Queue is ordered oldest-unreviewed first. Solving correctly sets `resolved_at`; failing again leaves it in queue.
- **Coach UI** (`/coach` route, paid gate):
  - Weakness map: bar chart or card list showing miss rate by category (e.g., "Fork Setup: missed 5 of 8").
  - Queue entry: "You have 12 positions to review" → button to start queue session.
  - Queue session uses the same Puzzle UI as Epic 5 but draws from the blunder queue instead of the curated set.
- No spaced-repetition scheduler. Queue is always available, served oldest first. SR is Phase 2, gated on blunder review rate ≥ 40%.

**Why eighth:** Coach depends on blunder data, which only accumulates once puzzles ship. Building it here ensures paid users who sign up at launch have a reason to return in week 2.

**Effort:** 3–4 days.

---

### Epic 9 — Persistent Stats & Cross-device Sync

**Delivers:**
- Puzzle accuracy per category persisted to Supabase for paid users (in-session only for anonymous/free).
- "Delta vs. last session" computed and displayed for paid users: e.g., "Fork Setup: 62% → 71% (+9% since last session)".
- Cross-device sync is automatic: paid users' `SupabaseStore` implementation already covers this. No additional work — this epic is about exposing the stats to the UI.
- Session stats (in-memory) visible to all tiers. Persistent stats and delta are paywalled.

**Why ninth:** Stats surface only after data exists. Building this before the puzzle loop would display zeros. Placing it here means first-session data is already accumulated by the time the UI exists.

**Effort:** 1–2 days.

---

## Phase 5 — Analytics, Mobile Polish & Launch (Days 45–56)

> **Goal:** Verify the instrumentation is complete, harden the mobile experience, confirm quality bar, and ship.

---

### Epic 10 — Analytics Instrumentation & Funnel Verification

**Delivers:**
- All 8 KPI events firing correctly and verifiable in the `tracks` table:
  `session_start`, `puzzle_attempted`, `puzzle_solved_correct`, `puzzle_solved_wrong`, `deep_reveal_viewed`, `signup_completed`, `paywall_viewed`, `upgrade_completed`.
- Each event includes the correct `uid` (always present), `user_id` (when signed in), `path`, and `event_data` JSON.
- Manual funnel walkthrough: anonymous → sign-in gate → free → paywall → paid. Every conversion event fires once and only once.
- A simple SQL query per KPI metric confirmed working against the `tracks` table (these become the launch dashboard).

**Why tenth:** Analytics must be verified before launch, not after. Missing events during the launch window means the critical validation data for Phase 2 gates (D7 retention, conversion rate, blunder review rate) will be incomplete and unrecoverable.

**Effort:** 1–2 days.

---

### Epic 11 — Mobile Polish, Security Hardening & Launch Readiness

**Delivers:**
- **Mobile-first polish**: touch target sizes (≥ 44px), PWA manifest + service worker for installability, no horizontal scroll on 375px viewport, board scales correctly on small screens.
- **Rate limiting**: express-rate-limit on all `/api/` endpoints. `/api/explain-move` limited to 30 req/min per IP; `/api/scores` to 60 req/min.
- **Input validation**: all API endpoints validate input types and ranges. Board move strings validated (length, character set, no illegal positions) before passing to solver.
- **Error boundaries**: React `<ErrorBoundary>` around Puzzle UI and Sparring UI. Solver errors degrade gracefully (disable hint display, show toast).
- **Quality bar confirmation:**
  - Explanation Engine: < 2% error rate across 100 positions × 5 generations (must have passed in Epic 4; re-verify on final build).
  - All 6 goal predicates tested against known-correct and known-wrong moves for each category.
  - Stripe webhook tested via Stripe CLI for all subscription lifecycle events.
  - Auth state migration (anon → signed-in) tested end-to-end with IndexedDB data present.
- Sentry error alerts configured for server crashes and unhandled React errors.
- Supabase automatic backups confirmed enabled.
- Soft launch: Papergames.io community post, Reddit r/connectfour.

**Effort:** 4–5 days.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pattern classifier mislabels positions | High | Fatal | Validate each category against 20+ known positions before shipping. Hallucination gate (< 2%) is a hard stop. |
| LLM prose feels generic | Medium | High | Tight prompt engineering: classifier output must constrain every sentence. Generic output = classifier not providing enough signal. Fix the classifier, not the prompt. |
| Cooperative AI in multi-move puzzles is too easy/hard | Medium | Medium | Hand-tune cooperative moves per puzzle during content authoring (Epic 5). |
| Solver binary fails on Railway (binary incompatibility) | Medium | High | Test solver binary on Railway in Epic 1. Cross-compile if needed. This must be confirmed before any feature work. |
| Stripe webhook failures silently downgrade users | Low | High | Log every webhook event to a `stripe_events` table. Re-process on failure. |
| 50-puzzle authoring takes longer than planned | High | Medium | Start authoring in parallel with Epic 4 (no code dependency). Cats 1–3 first — they ship sooner. |

---

## AI Coding Workflow

- **Human approves:** DB migrations, Stripe webhook logic, auth session handling, Supabase RLS policies.
- **Claude Code writes:** component scaffolding, API endpoint boilerplate, i18n string extraction, test cases for goal predicates and classifier.
- **Human validates:** every puzzle position (solver-verify before committing), pattern classifier output on edge cases, UX flows on mobile.
- **Claude Code refactors:** repetitive UI patterns, translation keys, route guards after human approves the pattern.

Rule: Claude Code never touches `migrations/`, `stripe/webhook.js`, or Supabase RLS without human review of the diff.

---

## Quality Bar (Defined, Not Implied)

| Area | Acceptable at launch |
|---|---|
| Explanation accuracy | < 2% error rate across 100 positions × 5 generations |
| API latency | `/api/scores` < 300ms p95. `/api/explain-move` < 2s p95 (LLM cache hit < 100ms) |
| Mobile UI | No layout breakage at 375px. Board playable with thumbs |
| Test coverage | Goal predicate evaluator: 100% of categories tested with correct + incorrect moves. Everything else: manual |
| Bugs at launch | No data-loss bugs. UI glitches acceptable if non-blocking |
| Manual ops | Admin = SQL queries on Supabase dashboard. No admin panel needed at launch |

---

## Timeline Summary

| Phase | Epics | Weeks | Gate |
|---|---|---|---|
| 1 — Foundation | 1, 2, 3 | 1–2 | Backend live on Railway, auth working, state layer in place |
| 2 — Core Value Loop | 4, 5 | 2–4 | User can play a puzzle and receive a Deep Reveal |
| 3 — Sparring + Monetization | 6, 7 | 4–5.5 | Stripe can collect money; sparring with commit-first ships |
| 4 — Retention Systems | 8, 9 | 5.5–6.5 | Paid users have blunder queue and persistent stats |
| 5 — Polish & Launch | 10, 11 | 6.5–8 | Analytics verified, mobile tested, soft launch |

---

## Post-MVP Upgrade Map (Phase 2 gates)

| Feature | Gate |
|---|---|
| Spaced-repetition scheduler | Blunder review rate ≥ 40% within 7 days of capture |
| Post-game sparring review timeline | D30 retention ≥ 10% |
| Papergames.io integration | Confirmed data access path (partnership, browser extension, or manual input) |
| Adaptive puzzle selection | Blunder review rate data exists (after SR gate) |
| Premium analytics (win rate, error trends, accuracy score) | 3+ months of coach data |
| Advanced training paths | Personal AI Coach data at scale (500+ active users) |
| Benchmarking vs. average users | 500+ active users at D30 |
| Spanish localization | i18n already wired; translate strings post-validation |
