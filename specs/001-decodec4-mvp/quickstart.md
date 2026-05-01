# Quickstart: DecodeC4 MVP

**Feature**: `001-decodec4-mvp`
**Date**: 2026-04-30

Step-by-step guide for a developer to go from a fresh checkout to the full development
environment running locally, and to validate each phase gate before moving on.

---

## Prerequisites

- Node.js 20+ installed
- The `connect-four/server/c4solver` binary present and executable on your machine
  (Linux x64; if on macOS, you need the macOS build in `solver-src/`)
- Supabase account (free tier is fine for development)
- Stripe account (test mode)
- Anthropic API key
- Railway account (for deployment validation only — not required for local dev)

---

## Local Development Setup

### 1. Install dependencies

```bash
cd connect-four
npm install
```

### 2. Configure environment

Create `connect-four/server/.env` (never commit this file):

```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENTRY_DSN=https://...@sentry.io/...   # optional for local dev
PORT=3000
```

Create `connect-four/.env.local` (Vite frontend):

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Run Supabase migrations

```bash
# Apply migrations in order
psql $DATABASE_URL -f connect-four/server/migrations/001_initial.sql
psql $DATABASE_URL -f connect-four/server/migrations/002_puzzles.sql
psql $DATABASE_URL -f connect-four/server/migrations/003_coach.sql
```

Or use the Supabase dashboard SQL editor.

### 4. Start the development server

```bash
# From connect-four/
npm run dev
```

This starts:
- Vite dev server on `http://localhost:5173` (frontend with HMR)
- Express API server on `http://localhost:3000`

The Vite dev config proxies `/api/*` to `http://localhost:3000/api/*`.

### 5. Verify solver works

```bash
curl -X POST http://localhost:3000/api/ping
# → {"ok":true}

curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -d '{"moves": "4"}'
# → [0, 0, 2, 3, 2, 0, 0]  (center-weighted after one move)
```

If the solver hangs or returns nothing, check:
- `connect-four/server/c4solver` is executable (`chmod +x`)
- The binary architecture matches your OS (use `file c4solver` to verify)

---

## Phase Gate Validation

### Phase 1 Gate: Backend live, auth working, state layer in place

```bash
# 1. Verify all three base routes render without errors
open http://localhost:5173/          # dashboard
open http://localhost:5173/sparring  # sparring shell
open http://localhost:5173/puzzles   # puzzle shell
open http://localhost:5173/coach     # coach shell (should show PaywallGate)

# 2. Verify anonymous state persists across page reload
# - Open the app, play a move in sparring, reload → state survives (IndexedDB)

# 3. Verify sign-up flow
# - Click sign-in, enter email, receive magic link, click it → signed in
# - Verify anonymous puzzle_attempts migrated to Supabase (check Supabase dashboard)

# 4. Verify track events firing
# Check the tracks table in Supabase after a session_start
```

---

### Phase 2 Gate: User can play a puzzle and receive a Deep Reveal

```bash
# 1. Verify explanation engine
curl -X POST http://localhost:3000/api/explain-move \
  -H "Content-Type: application/json" \
  -d '{"moves": "4", "candidateCol": 3, "humanFirst": true}'
# → { oneLiner: "...", patternTag: "...", deepReveal: null }

# 2. Verify cache is written (check explanation_cache table in Supabase)
# Second request to the same position should return < 100ms

# 3. Verify goal predicate evaluator — run automated tests
cd connect-four
npm test  # runs tests in tests/predicates/ and tests/classifier/

# Expected: all 6 categories have at least one correct + one incorrect fixture passing

# 4. Manual golden path
# - Open /puzzles as anonymous user
# - Solve a cat 1 puzzle (Immediate Threat) correctly
# - Verify green flash + one-liner appear
# - Tap "See why" → sign-in gate appears (anonymous)
# - Sign in, tap "See why" → Deep Reveal expands
# - Repeat 3 times → quota exhausted message on 4th tap
# - Verify cats 4-6 show locked preview cards, not errors

# 5. HALLUCINATION GATE (must pass before shipping Epic 5)
# Run 100 positions × 5 LLM generations
# Count responses where the explanation references a pattern
# not confirmed by the classifier output
# Error rate must be < 2% (i.e., ≤ 10 errors in 500 generations)
```

---

### Phase 3 Gate: Stripe can collect money; sparring with commit-first ships

```bash
# 1. Test Stripe checkout flow (test mode)
# - Sign in as free user
# - Click a locked cat 4 puzzle → PaywallModal → "Upgrade" button
# - Complete Stripe Checkout with test card 4242 4242 4242 4242
# - Verify tier = 'paid' in Supabase users table immediately

# 2. Test Stripe webhook via CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
# → verify stripe_events table has the event, users.tier updated

# 3. Manual commit-first validation
# - Start sparring game, enable Commit-first toggle
# - Verify: no hints, no column highlights, no scores visible during deliberation
# - Commit a move → reveal appears with score + best move
# - Verify Deep Reveal in reveal counts against quota for free user
```

---

### Phase 4 Gate: Paid users have blunder queue and persistent stats

```bash
# 1. Blunder capture
# - Sign in as paid user
# - Fail a puzzle on first attempt
# - Check blunders table in Supabase → entry exists with resolved_at = NULL

# 2. Review queue
# - Open /coach → weakness map shows category with ≥1 miss
# - Click "Start review" → puzzle board loads (no indication it was failed)
# - Solve it → blunders.resolved_at set
# - Fail it again → stays in queue

# 3. Persistent stats
# - Complete a session as paid user
# - Start a new session → "Delta vs. last session" visible for each category
```

---

### Phase 5 Gate: Analytics verified, mobile tested, quality bar confirmed

```bash
# 1. Analytics funnel verification
# Walk the full conversion funnel manually:
#   anonymous → puzzle → "See why" → sign-in gate → sign up → free
#   → cat 4 puzzle → paywall → Stripe checkout → paid
# Verify these events fire exactly once in tracks table:
#   session_start, puzzle_attempted, deep_reveal_viewed,
#   signup_completed, paywall_viewed, upgrade_completed

# 2. Mobile layout check
# Open Chrome DevTools → iPhone SE (375px viewport)
# - Board fits without horizontal scroll
# - All tap targets ≥ 44px
# - "See why" button reachable with thumb

# 3. Explanation Engine re-verification (repeat from Phase 2 gate)
# Must still be < 2% error rate on the final build

# 4. Stripe lifecycle test
stripe trigger customer.subscription.deleted
# → verify tier reverts to 'free' for that user
```

---

## Production Deployment

```bash
# Railway auto-deploys from main branch push
# To verify:
git push origin main

# Check Railway dashboard → deployment logs
# Then verify:
curl https://<railway-domain>/api/ping
# → {"ok":true}

# Verify solver runs on Railway (check logs for "[solver] binary:" line)
# If solver fails: check binary architecture, cross-compile for Linux x64
```

---

## Running Tests

```bash
cd connect-four

# Goal predicate evaluator + pattern classifier integration tests
npm test

# Individual test files
node --test tests/predicates/predicates.test.js
node --test tests/classifier/classifier.test.js
```

Test fixtures are deterministic JSON files in `tests/predicates/fixtures/` and
`tests/classifier/fixtures/`. Every fixture must be solver-verified before being
added to the repo.

---

## Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| Solver hangs on query | Binary architecture mismatch | Run `file server/c4solver` — must match OS |
| `explain-move` returns generic prose | Classifier not providing enough signal | Debug classifier output first, not the LLM prompt |
| Deep Reveal quota not resetting | `deep_reveal_reset_at` not updated | Check midnight UTC logic in quota endpoint |
| Anonymous state lost on reload | IndexedDB not initialized | Check `IndexedDBStore.getProfile()` initialization path |
| Stripe webhook not received locally | Stripe CLI not forwarding | Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` |
