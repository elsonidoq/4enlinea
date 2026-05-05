---
name: MVP implementation status — DecodeC4
description: Full implementation state of the DecodeC4 MVP as of 2026-04-30; which tasks are done, which remain, key file locations
type: project
---

# DecodeC4 MVP implementation status (as of 2026-04-30)

Full SpecKit workflow was run: speckit-specify → speckit-plan → speckit-tasks → speckit-implement.
Spec lives at `specs/001-decodec4-mvp/` (plan.md, spec.md, tasks.md, data-model.md, contracts/, research.md, quickstart.md).

## What is built (all code tasks done)

### Backend (`connect-four/server/`)
- `index.js` — Express ESM server with all endpoints:
  - Legacy: GET /api/ping, POST /api/scores, POST /api/explain (unchanged)
  - New: POST /api/track, POST /api/explain-move (Explanation Engine with LLM + cache + quota)
  - New: GET /api/puzzles, GET /api/puzzles/:id, POST /api/puzzles/:id/check
  - New: GET /api/coach/weakness-map, GET /api/coach/queue, POST /api/coach/queue/:id/resolve
  - New: POST /api/stripe/create-checkout, POST /api/stripe/webhook, POST /api/stripe/portal
  - Rate limiting via `express-rate-limit` on all routes
  - Supabase JWT auth middleware (`loadUser`) on all requests
- `classifier.js` — Pattern classifier, all 6 categories (1=immediate_threat, 2=forced_block, 3=double_threat, 4=fork_setup, 5=zugzwang, 6=parity_control)
- `predicates.js` — Goal predicate evaluator for all 6 puzzle categories; returns correct/wrong/tied
- `migrations/001_initial.sql` — users, tracks, stripe_events tables + RLS
- `migrations/002_explanation_cache.sql` — explanation_cache table
- `migrations/003_puzzles.sql` — puzzles, puzzle_attempts, blunders tables

### Frontend (`connect-four/src/`)
- `App.jsx` — React Router shell: ProfileStoreProvider + BrowserRouter + NavBar + ErrorBoundary + lazy pages
- `i18n/en.json` + `i18n/index.js` — full i18next setup, all UI strings in English
- `store/IndexedDBStore.js` — anonymous local store
- `store/SupabaseStore.js` — authenticated Supabase store (with session stats for paid users)
- `store/ProfileStore.js` — context provider; switches stores on auth, migrates on first sign-in
- `lib/track.js` — fire-and-forget analytics helper
- `components/Board.jsx`, `Column.jsx`, `Piece.jsx` — game board
- `components/DeepRevealButton.jsx` — "See why" button with auth/quota gating
- `components/PaywallModal.jsx` — Stripe checkout modal
- `components/AuthModal.jsx` + `AuthGate` — magic-link sign-in
- `components/ErrorBoundary.jsx` — Sentry-reporting error boundary
- `pages/HomePage.jsx` — Sparring: AI difficulty, commit-first mode, post-commit reveal panel
- `pages/PuzzlesPage.jsx` — Puzzle trainer: category list, board, feedback, session accuracy with delta vs prev day
- `pages/CoachPage.jsx` — Coach: weakness map, review queue, paywall gate

### PWA
- `public/manifest.json` — PWA manifest
- `public/sw.js` — shell-only service worker

### Tests (`connect-four/tests/`)
- `classifier/fixtures/fixtures.json` + `classifier/classifier.test.js` — 13 tests, all pass
- `predicates/fixtures/fixtures.json` + `predicates/predicates.test.js` — 16 tests, all pass
- `hallucination/run_hallucination_test.js` — 100-position × 5-generation hallucination gate runner (needs live API)

## What still requires human action

- T001-T003: Railway project setup, Supabase project, Cloudflare DNS
- T005: Verify c4solver binary on Railway Linux x64
- T031-T032: Hand-curate puzzle content (27 puzzles for cats 1-6)
- T038: Supabase seed migration (after T031-T032)
- T050: Set up Stripe products in Stripe dashboard
- T073: Mobile layout audit in DevTools
- T074: Analytics funnel verification
- T075: Re-run hallucination gate on final build
- T076: Stripe webhook lifecycle test
- T077: Auth migration end-to-end test
- T078-T079: Supabase backups + Sentry alerts verification
- T080: Launch post

## Key bugs fixed during implementation

1. `classifier.js` opponentImmediateWin formula was wrong: `-(winScore-1)` → `-Math.floor((41-moveCount)/2)` (off-by-one in the opponent win score convention)
2. `ProfileStore.js` had JSX in a `.js` file — Vite doesn't process JSX in `.js`; fixed by using `StoreContext.Provider({ value, children })` instead

**Why:** These are non-obvious issues not visible from the code description; the first caused Cat 2 classifier tests to fail.
**How to apply:** When reading classifier scores, remember: losing score for "opponent wins in 1 ply" = `-floor((41-n)/2)` where n = moves already played.
