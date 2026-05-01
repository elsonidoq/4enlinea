# Implementation Plan: DecodeC4 MVP

**Branch**: `main` | **Date**: 2026-04-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-decodec4-mvp/spec.md`
**Technical authority**: `docs/mvp/technical_roadmap.md`

---

## Summary

Build the DecodeC4 MVP: a Connect Four training web application whose core value is
explaining *why* moves are good in human language grounded in exact solver truth. The
product ships three features — Puzzle Trainer (50 curated positions across 6 pattern
categories), Commit-first Sparring (self-testing mode with post-move Deep Reveals), and
Personal AI Coach (paid-only blunder queue + weakness map) — all sharing a single
Explanation Engine (solver → pattern classifier → LLM annotation with prompt caching).

The existing `connect-four/server/` backend (two solver endpoints) is kept as-is. The
existing single-file React frontend is rebuilt from scratch with routing, component
architecture, auth, storage abstraction, and i18n. The backend gains new endpoints
alongside the existing ones without modifying them.

---

## Technical Context

**Language/Version**: Node.js 20 (server), React 18 (frontend)
**Primary Dependencies**: Express (server), Vite + react-router-dom + react-i18next (frontend), Supabase JS client, Stripe SDK, Anthropic SDK (server-side only), Sentry
**Storage**: Supabase Postgres (authenticated users), IndexedDB (anonymous, device-bound UUID)
**Testing**: Manual golden-path testing for UI; automated integration tests for goal predicate evaluator and pattern classifier using real c4solver binary; board fixtures in JSON checked into repo
**Target Platform**: Mobile-first PWA; Node.js 20 on Railway (Linux x64)
**Project Type**: Web application (React PWA frontend + Node.js/Express backend)
**Performance Goals**: `/api/scores` < 300ms p95; `/api/explain-move` < 2s p95 (cache miss), < 100ms (cache hit); heatmap < 500ms; goal predicates (cats 1–3) < 100ms, (cats 4–6) < 3s
**Constraints**: Solo founder + Claude Code; 8-week horizon; solver binary must run on Railway Linux x64; no admin panel; Stripe, Supabase Auth, and Cloudflare are managed services
**Scale/Scope**: Soft launch to Papergames.io community + Reddit r/connectfour; 50 hand-curated puzzles; launch KPIs: D7 retention ≥ 20%, 8 puzzles/session, ≥ 2% 30-day conversion

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Explanation Engine as Single Source of Truth | ✅ PASS | All explanations route through `POST /api/explain-move`. No feature generates pattern labels or LLM prose independently. |
| II. Code Quality & Simplicity | ✅ PASS | PoC backend kept as-is. New endpoints added alongside, not replacing. Storage abstraction is a locked decision (not a speculative addition). No other abstractions added without concrete need. |
| III. Testing Standards | ✅ PASS | Goal predicate evaluator tested with correct + incorrect fixtures for all 6 categories. Pattern classifier tests run against real c4solver binary. Tier gating tested for all 3 tiers on every gated feature. |
| IV. UX Consistency | ✅ PASS | Shared `<Board>`, `<DeepRevealButton>`, `<PaywallModal>` primitives. Pattern labels always come from classifier (single source), so terminology is structurally consistent. |
| V. Performance | ✅ PASS | Explanation cache skips LLM on hit (< 100ms). Loading indicators required within 200ms. Rate limits on explain endpoint. Existing heatmap endpoint unchanged. |

**Post-design re-check**: Required after data-model.md and contracts/ are complete.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-decodec4-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── api.md           # Backend REST API contracts
│   └── store.md         # ProfileStore interface contract
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
connect-four/
├── server/
│   ├── index.js              # Existing — keep, add new endpoints
│   ├── heatmap.js            # Existing — keep
│   ├── classifier.js         # NEW: pattern classifier (rule-based, server-side)
│   ├── predicates.js         # NEW: goal predicate evaluator
│   └── migrations/           # NEW: Supabase SQL migrations
│       ├── 001_initial.sql
│       ├── 002_puzzles.sql
│       └── 003_coach.sql
├── src/
│   ├── main.jsx              # Rebuilt: React 18 + Router entry
│   ├── App.jsx               # Rebuilt: route shell only
│   ├── i18n/
│   │   └── en.json           # All user-visible strings
│   ├── components/           # Shared UI primitives
│   │   ├── Board.jsx
│   │   ├── Column.jsx
│   │   ├── Piece.jsx
│   │   ├── DeepRevealButton.jsx
│   │   ├── PaywallModal.jsx
│   │   ├── AuthGate.jsx
│   │   └── ErrorBoundary.jsx
│   ├── pages/
│   │   ├── HomePage.jsx      # / (sparring)
│   │   ├── PuzzlesPage.jsx   # /puzzles
│   │   └── CoachPage.jsx     # /coach (paid)
│   ├── store/
│   │   ├── ProfileStore.js   # Interface + factory
│   │   ├── IndexedDBStore.js # Anonymous implementation
│   │   └── SupabaseStore.js  # Authenticated implementation
│   └── lib/
│       └── track.js          # track(event, data) helper
├── public/
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
└── tests/
    ├── classifier/
    │   └── classifier.test.js
    └── predicates/
        ├── predicates.test.js
        └── fixtures/         # Deterministic board fixtures (JSON)
```

**Structure Decision**: Web application layout. Backend lives in `connect-four/server/`
(existing); frontend in `connect-four/src/` (rebuilt). Tests co-located in
`connect-four/tests/`. Supabase migrations in `connect-four/server/migrations/`. No
separate backend/ or api/ directory — the single Node.js process serves both static
files and API routes as in the PoC.

---

## Build Phases (from technical_roadmap.md)

### Phase 1 — Foundation (Days 1–10)

**Goal**: Everything downstream depends on this being live. No rework mid-build.

**Epic 1 — Infrastructure & Deployment Pipeline** *(1–2 days)*
- Railway project: existing Node.js backend deployed at stable URL.
- Supabase project: Postgres, Auth, `tracks` table, `users` extension.
- Cloudflare DNS → Railway.
- Sentry wired to Node.js server.
- Secrets in Railway env vars only (no `.env` in repo).
- Single deploy path: push to `main` → Railway auto-deploy.
- **Hard stop**: verify c4solver binary runs on Railway Linux x64. Cross-compile if not.

**Epic 2 — Frontend Skeleton** *(3–4 days)*
- New React 18 + Vite app replacing the monolith `App.jsx`.
- React Router: `/` (sparring), `/puzzles`, `/coach`.
- react-i18next wired; all strings through `t()`.
- Shared primitives: `<Board>`, `<Column>`, `<Piece>`, `<DeepRevealButton>`, `<PaywallModal>`.
- Storage-agnostic `ProfileStore` with `IndexedDBStore` (anon) and `SupabaseStore` (auth) implementations.
- `track(event, data)` → `POST /api/track` → `tracks` table; uid always present.

**Epic 3 — Supabase Auth & Tier Enforcement** *(2–3 days)*
- Sign-up / sign-in: email + magic link only.
- `users` table: `tier` (`anonymous|free|paid`), `deep_reveal_count`, `deep_reveal_reset_at`.
- On signup: IndexedDB state migrates to Supabase transparently.
- `<AuthGate>`: shows sign-in prompt if anonymous.
- `<PaywallGate>`: shows upgrade modal if free tier.
- Upgrade modal wired but Stripe is Epic 7 — placeholder "coming soon" for now.

**Phase 1 gate**: Backend live on Railway, auth working, state layer in place.

---

### Phase 2 — Core Value Loop (Days 11–25)

**Goal**: User can land, play a puzzle, and experience a Deep Reveal. Ships as a unit.

**Epic 4 — Explanation Engine** *(5–6 days; highest-risk epic)*
- `POST /api/explain-move`: `{ moves, candidateCol, humanFirst }` → `{ oneLiner, deepReveal }`.
- **Pattern classifier** (`server/classifier.js`): rule-based, server-side.
  - Cats 1–3 (bitboard): Immediate Threat, Forced Block, Double Threat — no extra solver calls.
  - Cats 4–6 (solver-guided): Fork Setup, Zugzwang, Parity Control.
- **LLM integration**: Claude Sonnet, server-side only. Prompt caching keyed by `sha256(moves + candidateCol)`.
- **Explanation cache**: Supabase `explanation_cache` table (`position_hash`, `one_liner`, `deep_reveal_json`, `created_at`). Cache hit skips LLM call entirely.
- **Deep Reveal cap** enforced server-side: anonymous = 0, free = 3/day (midnight UTC reset), paid = unlimited. Auto-reveals (wrong-answer one-liners) never decrement the cap.
- **Definition of done**: run 100 positions × 5 generations; error rate MUST be < 2%. This is a hard stop — not optional.

**Epic 5 — Puzzle Trainer** *(5–6 days: 3 days code + 2–3 days content)*
- Puzzle data: JSON records `{ id, category, moveString, goalPredicateType, goalPredicateParams, cooperativeAiMoves, difficulty }` seeded via Supabase migration.
- **50 hand-curated positions** (~8/category); each verified by solver before migration.
- **Goal predicate evaluator** (`server/predicates.js`): per-category evaluation (solver + classifier).
- Multi-move flow: user plays, server returns pre-authored cooperative AI response, user plays again; predicate evaluated after final user move.
- Puzzle UI at `/puzzles`:
  - Board + goal prompt.
  - Feedback: correct first → green flash + one-liner + "See why" button. Wrong → retry. 2 failures → reveal + Deep Reveal (no quota consumed). Tied → "also works — ties with col X".
  - Session accuracy by category at top.
- Category gating: cats 1–3 free, cats 4–6 paid. Free users see locked preview cards with upgrade prompt.
- Track events: `puzzle_attempted`, `puzzle_solved_correct`, `puzzle_solved_wrong`, `deep_reveal_viewed`.

**Phase 2 gate**: User can play a puzzle and receive a Deep Reveal.

---

### Phase 3 — Sparring + Monetization (Days 26–36)

**Goal**: Close the monetization loop. Paywall moments exist; Stripe converts.

**Epic 6 — Sparring Mode** *(3–4 days)*
- Sparring rebuilt in new component architecture (replacing PoC monolith).
- Difficulty: easy (random legal), medium (greedy best), hard (solver with configurable depth), perfect (solver always). Difficulty controls AI column selection only.
- **Commit-first toggle**: hides all hints/scores/heatmaps until user commits. Post-commit reveal: score played, best move + score, pattern tag (if meaningful delta). Counts against Deep Reveal cap for free users.
- Hints-on mode (PoC behavior) preserved; contextual suggestions wired from classifier output.
- Track events: `session_start`, `deep_reveal_viewed`.

**Epic 7 — Stripe Paywall** *(2–3 days)*
- `POST /api/stripe/create-checkout`: creates Stripe Checkout session (monthly $4.99 / annual $39).
- `POST /api/stripe/webhook`: handles `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated` → updates `tier` in Supabase `users`.
- Every webhook event logged to `stripe_events` table; re-process on failure.
- `POST /api/stripe/portal`: Stripe Customer Portal for self-service management.
- Stripe customer ID stored on user record.
- Paywall modal triggers: cat 4–6 puzzle attempt (free tier), Deep Reveal quota exhausted, Coach access (free tier).

**Phase 3 gate**: Stripe can collect money; sparring with commit-first ships.

---

### Phase 4 — Retention Systems (Days 37–44)

**Goal**: Paid users have a reason to return beyond session novelty.

**Epic 8 — Personal AI Coach** *(3–4 days)*
- **Blunder capture**: every puzzle first-attempt failure → `blunders` table (silent, no UI).
- **Weakness map**: aggregate first-attempt failure rates by category; computed from `blunders` on demand.
- **Review queue**: failed positions re-served as fresh puzzles. Ordered oldest-unreviewed first. Correct = `resolved_at` set. Failure again = stays in queue.
- Coach UI at `/coach` (paid gate):
  - Weakness map: miss rate by category, sorted descending.
  - Queue entry: count + "Start review" button.
  - Queue session reuses Puzzle UI, drawing from blunder queue instead of curated set.
- No spaced-repetition scheduler. SR is Phase 2, gated on blunder review rate ≥ 40%.

**Epic 9 — Persistent Stats** *(1–2 days)*
- Puzzle accuracy per category persisted to Supabase for paid users.
- "Delta vs. last session" displayed for paid users (e.g., "Fork Setup: 62% → 71%").
- Cross-device sync is automatic: paid users' SupabaseStore already covers this — no extra code.
- In-session stats visible to all tiers.

**Phase 4 gate**: Paid users have blunder queue and persistent stats.

---

### Phase 5 — Analytics, Polish & Launch (Days 45–56)

**Goal**: Verify instrumentation, harden mobile, confirm quality bar, ship.

**Epic 10 — Analytics Verification** *(1–2 days)*
- All 8 KPI events firing and verifiable: `session_start`, `puzzle_attempted`, `puzzle_solved_correct`, `puzzle_solved_wrong`, `deep_reveal_viewed`, `signup_completed`, `paywall_viewed`, `upgrade_completed`.
- Manual funnel walkthrough: anonymous → sign-in gate → free → paywall → paid.
- SQL queries per KPI metric confirmed against `tracks` table (become the launch dashboard).

**Epic 11 — Mobile Polish, Security & Launch** *(4–5 days)*
- Touch targets ≥ 44px; PWA manifest + service worker; no horizontal scroll at 375px.
- Rate limiting: `express-rate-limit` on all `/api/` endpoints.
- Input validation on all endpoints: board strings validated before passing to solver.
- React `<ErrorBoundary>` around Puzzle UI and Sparring UI.
- Quality bar confirmations:
  - Explanation Engine: < 2% error rate (re-verify on final build).
  - All 6 goal predicates: correct + incorrect fixtures passing.
  - Stripe webhook: all subscription lifecycle events tested via Stripe CLI.
  - Auth migration (anon → signed-in) tested end-to-end with IndexedDB data present.
- Supabase automatic backups confirmed enabled.
- Sentry alerts configured.
- Soft launch: Papergames.io community + Reddit r/connectfour.

**Phase 5 gate**: Analytics verified, mobile tested, quality bar confirmed.

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Pattern classifier mislabels positions | High | Validate each category against 20+ known positions. Hallucination gate (< 2%) is a hard stop before Epic 5. |
| LLM prose feels generic | Medium | Classifier output constrains every sentence. Generic prose = classifier insufficient signal. Fix classifier, not prompt. |
| Cooperative AI in multi-move puzzles too easy/hard | Medium | Hand-tune per puzzle during Epic 5 content authoring. |
| Solver binary fails on Railway (architecture mismatch) | Medium | Test in Epic 1 before any feature work. Cross-compile if needed. |
| Stripe webhook failures silently downgrade users | Low | Log every event to `stripe_events`. Re-process on failure. |
| 50-puzzle authoring takes longer than planned | High | Start authoring in parallel with Epic 4. Cats 1–3 first. |

---

## AI Coding Workflow

- **Human approves**: DB migrations, Stripe webhook logic, auth session handling, Supabase RLS policies.
- **Claude Code writes**: component scaffolding, API endpoint boilerplate, i18n extraction, test cases for predicates and classifier.
- **Human validates**: every puzzle position (solver-verify before committing), classifier output on edge cases, UX flows on mobile.
- **Rule**: Claude Code never touches `server/migrations/`, `server/stripe/webhook.js`, or Supabase RLS without human review of the diff.

---

## Quality Bar

| Area | Threshold |
|---|---|
| Explanation accuracy | < 2% error rate across 100 positions × 5 generations |
| API latency | `/api/scores` < 300ms p95; `/api/explain-move` < 2s p95 (miss), < 100ms (hit) |
| Mobile UI | No layout breakage at 375px; board playable with thumbs |
| Goal predicate tests | 100% of 6 categories covered, correct + incorrect fixtures |
| Launch blockers | No data-loss bugs |

---

## Post-MVP Upgrade Map

| Feature | Phase 2 Gate |
|---|---|
| Spaced-repetition scheduler | Blunder review rate ≥ 40% within 7 days |
| Post-game sparring review timeline | D30 retention ≥ 10% |
| Papergames.io integration | Confirmed data access path |
| Adaptive puzzle selection | After SR gate data exists |
| Premium analytics | 3+ months of coach data |
| Advanced training paths | Personal AI Coach data at scale (500+ active users) |
| Benchmarking vs. average users | 500+ active users at D30 |
| Spanish localization | i18n already wired; translate strings post-validation |
