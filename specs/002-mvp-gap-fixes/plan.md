# Implementation Plan: MVP Gap Fixes

**Branch**: `main` | **Date**: 2026-04-30 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/002-mvp-gap-fixes/spec.md`  
**Gap source**: `docs/mvp/v1_gaps.md`

## Summary

Twenty-four gaps were identified by comparing the running app against the MVP product spec. This plan resolves the code-fixable gaps (G1–G16) in four epics, ordered by dependency. G17–G24 are human-only tasks (infrastructure provisioning, Stripe dashboard, production quality gates) that are documented but not implemented by this plan.

The approach is deliberately additive: existing API contracts and component interfaces are preserved wherever possible; only specific functions, handlers, and render paths are modified.

---

## Technical Context

**Language/Version**: JavaScript (ES2022 modules) — Node.js 23 (server), React 18 (client)  
**Primary Dependencies**: Express 4, Supabase JS v2, Anthropic SDK, Stripe SDK, React Router v6, react-i18next, Vite 5, express-rate-limit, @sentry/node  
**Storage**: IndexedDB (anonymous/free, client-side), Supabase Postgres (signed-in, server-side)  
**Testing**: `node --test` (built-in Node.js test runner) for integration tests; manual UI testing per golden-path checklists  
**Target Platform**: Web PWA — mobile-first React SPA + Node.js/Express API server  
**Project Type**: Full-stack web application  
**Performance Goals**: Explanation Engine <2 s end-to-end; analytics writes fire-and-forget (non-blocking); puzzle predicate evaluation <100 ms (cats 1–3), <3 s (cats 4–6)  
**Constraints**: Storage-agnostic interface must be honored; no component references a concrete storage backend directly; server-side tier enforcement mandatory  
**Scale/Scope**: MVP launch; single-engineer codebase; all changes in `connect-four/` monorepo

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Notes |
|---|---|---|
| I. Explanation Engine as single source of truth | ✅ PASS | Post-commit reveal (G7) adds a `/api/scores` call alongside the existing explain-move call — it does not bypass the engine |
| II. Code quality & simplicity | ✅ PASS | All fixes are targeted patches to existing functions; no new abstraction layers introduced |
| III. Testing standards | ✅ PASS | New blunder-capture logic (G15) requires a new integration test fixture; placeholder puzzles (G1) are solver-verified |
| IV. UX consistency & progressive disclosure | ✅ PASS | Coach gate (G8/G10) surfaces a locked card before any modal — no automatic full disclosure |
| V. Performance requirements | ✅ PASS | `/api/scores` call in post-commit reveal is non-blocking from the user's perspective; analytics writes remain fire-and-forget |
| Tier gating | ✅ PASS | All new tier gates are server-enforced; client changes are presentational only |

No violations. No complexity tracking required.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-mvp-gap-fixes/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api.md           ← Phase 1 output (changed endpoints only)
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
connect-four/
├── server/
│   ├── index.js              # Express server — modified for G7, G12, G13, G15
│   ├── migrations/
│   │   ├── 005_coach.sql     # Created (G14)
│   │   └── 006_session_stats.sql  # Created (G16)
│   └── data/
│       └── placeholder_puzzles.json  # Created (G1, G2)
├── src/
│   ├── pages/
│   │   ├── PuzzlesPage.jsx   # Modified — empty state (G1)
│   │   ├── CoachPage.jsx     # Modified — sign-in CTA, locked state, review queue (G5, G8, G10)
│   │   └── HomePage.jsx      # Modified — hard difficulty, post-commit reveal (G7, G11)
│   ├── components/
│   │   ├── DeepRevealButton.jsx  # Modified — paywall_viewed tracking (G13)
│   │   └── AuthModal.jsx     # Modified — signup_completed event (G12)
│   └── pages/
│       └── AdminCuratePage.jsx  # Created — puzzle curation tool (G2)
├── .env.example              # Created (G3)
└── tests/
    └── blunder/
        └── blunder-capture.test.js  # Created (G15)
```

---

## Phase 0: Research

*Resolved via codebase inspection and existing documentation.*

See [research.md](research.md).

---

## Phase 1: Design

See [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md).

---

## Implementation Epics

### Epic A — Puzzle Content & Empty States (G1, G2)

**Goal**: All 6 categories are playable. A curation tool exists to author puzzles.

**A1 — PuzzlesPage empty state**: When `categoryPuzzles?.puzzles?.length === 0`, render a "No puzzles yet" card with a back button instead of entering the loading branch.

**A2 — Placeholder puzzles**: Create `connect-four/server/data/placeholder_puzzles.json` with at least 1 solver-verified puzzle per category (6 total). Add a seed endpoint `POST /api/admin/seed-puzzles` (no auth, localhost-only via middleware guard) that inserts them directly so the app can be tested without running Supabase migrations manually.

**A3 — Puzzle curation tool** (`/admin/curate`): A new React page with:
- Move string text input → board renders live (reuses `<Board>` component)
- "Run solver" button → calls `/api/scores` and displays per-column scores
- Category selector, goal prompt field, predicate type selector
- "Save puzzle" → calls `POST /api/admin/puzzles` (localhost-only guard)
- Error display for invalid move strings (validated client-side before API call)

### Epic B — Database Migrations (G14, G15, G16)

**Goal**: Supabase migrations apply cleanly to a fresh project.

**B1 — `005_coach.sql`**: Create the missing migration file. Content: `-- blunders table and index already created in 003_puzzles.sql; this migration is intentionally empty (placeholder for runner ordering).` Add a comment confirming the index `idx_blunders_user_unresolved` is present.

**B2 — `006_session_stats.sql`**: Create `session_stats` table:
```sql
CREATE TABLE IF NOT EXISTS public.session_stats (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (user_id, date)
);
ALTER TABLE public.session_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own session stats"
  ON public.session_stats FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**B3 — Blunder capture fix** (`index.js`): The `POST /api/puzzles/:id/check` handler currently guards on `moveHistory.length === 0` as a first-attempt proxy. Change the request body to accept `attemptNumber: 1|2` from the client. Insert the blunder only when `attemptNumber === 1 && !isSuccess`. Update `PuzzlesPage.jsx` to pass `attemptNumber: attemptCount + 1` in the request body.

### Epic C — Analytics Events (G12, G13)

**Goal**: All 8 KPI events fire correctly.

**C1 — `signup_completed`** (`ProfileStore.jsx`): In `switchToSupabase()`, after the store switch and before `setSession(newSession)`, call `track('signup_completed', { method: 'magic_link' })` — but only when the event is `'SIGNED_IN'` (not `'TOKEN_REFRESHED'` or `'INITIAL_SESSION'`). The `onAuthStateChange` callback receives the event name as its first argument; pass it through to `switchToSupabase`.

**C2 — `upgrade_completed`** (`server/index.js`): In the `checkout.session.completed` webhook handler, after the Supabase `users` update succeeds, call the internal `/api/track` logic (or insert directly into the `tracks` table) with `event: 'upgrade_completed'` and `user_id` from the Stripe customer metadata.

**C3 — `paywall_viewed` in DeepRevealButton** (`DeepRevealButton.jsx`): When the 429 response is received and `setShowPaywall(true)` is called, also call `track('paywall_viewed', { trigger: 'quota_exceeded' })`.

### Epic D — Feature Fixes (G5, G7, G8, G10, G11)

**Goal**: Coach review queue works; sparring reveal shows scores; coach gates correct; hard difficulty weaker than perfect.

**D1 — Coach "Start review"** (`CoachPage.jsx`): Replace `onClick={() => {}}` with a handler that:
1. Calls `GET /api/coach/queue` to fetch the next blunder.
2. Sets local state `{ reviewMode: true, currentBlunder: data.puzzle }`.
3. When in `reviewMode`, renders a `<PuzzleBoard>`-style board for the blunder position.
4. On correct solve: calls `POST /api/coach/queue/:blunderId/resolve`, decrements `queueCount`, fetches next.
5. On 2 failures: skips to next blunder without resolving.

**D2 — Coach anonymous sign-in CTA** (`CoachPage.jsx`): In the `!session` render branch, add a `<button onClick={() => setShowAuth(true)}>Sign in</button>` alongside the existing text. Import and render `<AuthModal>` for this page.

**D3 — Coach free-tier locked state** (`CoachPage.jsx`): Remove the auto-firing `PaywallModal` on 403. Instead, check `req.user?.tier !== 'paid'` in the `loadCoachData` fallback and set a `isPaidGated` flag. When `isPaidGated`, render a locked card (same visual pattern as `PuzzleCategoryList` locked cards) with label "Personal AI Coach — Paid Feature" and an "Upgrade" button that opens `PaywallModal` on click and fires `paywall_viewed`.

**D4 — Post-commit reveal scores** (`HomePage.jsx` + `server/index.js`): After the user commits a move:
1. Call `POST /api/scores` with `moves = movesBeforeCommit + (candidateCol+1)` to get scores for the resulting position? Actually no — the scores for the comparison need to be for the position **before** the move, so we can show "you played col N (score X), best was col M (score Y)".
2. Call `GET /api/scores` with `moves = movesBeforeCommit` to get pre-move scores (this is the same data the board would have shown in hints-on mode).
3. Store `{ playedScore: scores[candidateCol], bestCol, bestScore: max(scores), playedCol: candidateCol }` alongside `oneLiner` in `postReveal` state.
4. Render in the reveal panel: two side-by-side score cards — "Your move: Col N (score X)" and "Best move: Col M (score Y)". Show the one-liner below. If `playedCol === bestCol`, show "Best move played ✓".
5. The existing `explain-move` call remains unchanged (still provides `oneLiner`).

**D5 — `hard` difficulty error rate** (`HomePage.jsx`): In `getAiColumn()`, after resolving the best column for `hard` and `perfect`:
- `perfect`: existing behaviour (pick randomly among tied best)
- `hard`: with 20% probability, pick a random legal column instead of the best; otherwise pick the best (with tie-breaking). The 20% value is a constant `HARD_ERROR_RATE = 0.2` defined at the top of the file.

### Human-only tasks (out of scope for code implementation)

- **G17**: Create Railway project, configure auto-deploy, add env vars — human task.
- **G18**: Create Supabase project, apply migrations, configure RLS — human task.
- **G19**: Create Stripe products, copy price IDs to Railway env vars — human task.
- **G3**: Populate `.env` and `.env.local` files with real credentials after services are set up — human task (env files created by this plan document what's needed).
- **G20–G24**: Mobile audit, analytics verification, hallucination re-run, Stripe webhook test, auth migration test — human tasks after infrastructure is live.

---

## Dependency Order

```
B1 (005_coach.sql)        ← no deps
B2 (006_session_stats.sql) ← no deps
A1 (empty state)           ← no deps
A2 (placeholder puzzles)   ← no deps
D5 (hard difficulty)       ← no deps
C3 (paywall_viewed)        ← no deps
A3 (curation tool)         ← A2 (uses same admin endpoint)
B3 (blunder capture fix)   ← B1 complete
C1 (signup_completed)      ← no deps
C2 (upgrade_completed)     ← no deps
D2 (coach sign-in CTA)     ← no deps
D3 (coach free gate)       ← no deps
D4 (post-commit scores)    ← no deps
D1 (coach review queue)    ← B1, B2 (blunders + session_stats tables exist)
```

All items except D1 are independent and can be implemented in any order.
