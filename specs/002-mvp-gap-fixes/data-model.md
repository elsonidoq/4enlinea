# Data Model: MVP Gap Fixes

**Date**: 2026-04-30  
**Source**: Feature spec + codebase inspection

---

## Entities Modified or Created

### 1. Puzzle

Existing table `puzzles` in `003_puzzles.sql`. No schema changes. New field usage:

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| category | TEXT | One of: `forcing_moves`, `defensive_moves`, `combination_play`, `fork_setup`, `parity_control`, `zugzwang` |
| move_sequence | TEXT | Encoded as column numbers 1–7, e.g. `"4431"` |
| goal_prompt | TEXT | Human-readable instruction shown to player |
| predicate_type | TEXT | Evaluator key used by `predicates.js` |
| difficulty | INTEGER | 1–3 |
| verified | BOOLEAN | `true` only after solver confirms score ≥ 0 |

**New**: `connect-four/server/data/placeholder_puzzles.json` — an array of objects matching this schema (minus `id`/`created_at`). Used by the seed endpoint.

---

### 2. Blunder

Existing table `blunders` in `003_puzzles.sql`. Schema unchanged; fix is behavioral (first-attempt guard).

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users |
| puzzle_id | UUID | FK → puzzles |
| move_played | TEXT | Column number played |
| resolved_at | TIMESTAMP | NULL until coach resolves |

**Request body change** for `POST /api/puzzles/:id/check`: new `attemptNumber` integer field (1 or 2). Server inserts blunder only when `attemptNumber === 1 && !isSuccess`.

---

### 3. Session Stats

New table `session_stats` in `006_session_stats.sql`.

| Field | Type | Notes |
|---|---|---|
| user_id | UUID | PK (composite with `date`) |
| date | DATE | PK (composite with `user_id`) |
| stats | JSONB | Arbitrary per-session metrics (puzzles solved, accuracy, etc.) |

**RLS**: Users can only read and write their own rows (`auth.uid() = user_id`).

---

### 4. Track Event

Existing table `tracks`. Schema unchanged. New events added to the set of valid values:

| Event | Trigger point | Extra payload |
|---|---|---|
| `signup_completed` | `onAuthStateChange` fires `'SIGNED_IN'` | `{ method: 'magic_link' }` |
| `upgrade_completed` | Stripe `checkout.session.completed` webhook | `{ user_id }` from Stripe customer metadata |
| `paywall_viewed` | 429 response received in `DeepRevealButton` | `{ trigger: 'quota_exceeded' }` |

**Existing events already tracked** (no changes): `signup_initiated`, `puzzle_started`, `puzzle_completed`, `sparring_started`, `deep_reveal_clicked`.

---

## State Transitions

### Puzzle Attempt Flow (updated)

```
User views puzzle
  → client sets attemptCount = 0
  → user plays move → POST /api/puzzles/:id/check { attemptNumber: 1, ... }
      ├── success  → puzzle_completed; no blunder
      └── failure  → blunder inserted (attemptNumber === 1 && !isSuccess)
                   → client sets attemptCount = 1
                   → user plays second move → POST /api/puzzles/:id/check { attemptNumber: 2, ... }
                       ├── success  → puzzle_completed; no blunder
                       └── failure  → no blunder (attemptNumber !== 1); show answer
```

### Coach Review Queue Flow

```
User clicks "Start review"
  → GET /api/coach/queue → { puzzle, blunderId }
  → user plays move
      ├── correct → POST /api/coach/queue/:blunderId/resolve → queue shrinks
      └── 2 failures → skip (no resolve call) → fetch next
```

---

## No New Migrations for Analytics

`signup_completed`, `upgrade_completed`, `paywall_viewed` all write to the existing `tracks` table. No schema changes required.
