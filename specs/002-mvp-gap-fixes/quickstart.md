# Quickstart: MVP Gap Fixes

**Date**: 2026-04-30

---

## Prerequisites

Same as the existing app setup. The app must already run with `npm run dev` from `connect-four/`.

---

## Running the App Locally

```bash
cd connect-four
npm run dev          # starts Vite (port 5173) + Express (port 3001) concurrently
```

---

## Seeding Placeholder Puzzles

After the server is running, seed the placeholder puzzles once:

```bash
curl -X POST http://localhost:3001/api/admin/seed-puzzles
# {"inserted":6,"skipped":0}
```

Re-running is safe — already-inserted puzzles are skipped.

---

## Accessing the Puzzle Curation Tool

Navigate to `http://localhost:5173/admin/curate` directly (no nav link).

Workflow:
1. Paste a move string (e.g. `4431`) into the input — the board renders live.
2. Click "Run solver" — per-column scores appear below the board.
3. Select category, enter goal prompt, select predicate type.
4. Click "Save puzzle" — calls `POST /api/admin/puzzles`.

---

## Running Migrations

Migrations live in `connect-four/server/migrations/`. Apply in order:

```
001_initial.sql
002_explanation_cache.sql
003_puzzles.sql
005_coach.sql          ← intentionally empty (ordering placeholder)
006_session_stats.sql  ← creates session_stats table
```

`004_seed_puzzles.sql` is not needed when using the seed endpoint above.

---

## Running Tests

```bash
cd connect-four
node --test tests/
```

All existing tests must pass. New test added for blunder capture:

```bash
node --test tests/blunder/blunder-capture.test.js
```

This test verifies:
- Blunder is inserted on `attemptNumber: 1` + failure.
- Blunder is NOT inserted on `attemptNumber: 2` + failure.
- No blunder inserted on success (any attempt number).

---

## Verifying Analytics Events

Events to verify manually after login/upgrade:

| Event | How to trigger |
|---|---|
| `signup_completed` | Open app, click Sign In, complete magic link |
| `upgrade_completed` | Complete Stripe checkout (use test card in Stripe test mode) |
| `paywall_viewed` | Use all 3 Deep Reveals on a free account, attempt a 4th |

Check `tracks` table in Supabase dashboard after each action.

---

## Environment Variables

All variables are documented in `connect-four/.env.example`. Copy it and fill in real values:

```bash
cp connect-four/.env.example connect-four/.env
```

Minimum required for local dev (Supabase optional if using IndexedDB only):
- `ANTHROPIC_API_KEY`
- `C4_SOLVER_PATH` (path to the compiled `c4solver` binary)
