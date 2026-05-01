# Data Model: DecodeC4 MVP

**Feature**: `001-decodec4-mvp`
**Date**: 2026-04-30

All tables live in Supabase (Postgres). Anonymous user state lives in IndexedDB on the
device; the schema mirrors the Supabase tables so migration on signup is a direct insert.

---

## Entity Relationship Overview

```
users (1) ──── (N) puzzle_attempts
users (1) ──── (N) blunders
users (1) ──── (1) deep_reveal_quota  [denormalized on users table]
puzzles (1) ─── (N) puzzle_attempts
puzzles (1) ─── (N) blunders (via puzzle_id or board_state)
explanation_cache (1) ─── (N) puzzle_attempts [by position_hash]
tracks (standalone analytics)
stripe_events (standalone audit log)
```

---

## Tables

### `users` (extends Supabase Auth `auth.users`)

The Supabase Auth identity table is extended with app-specific columns via a
`public.users` table joined on `id = auth.users.id`.

```sql
CREATE TABLE public.users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  device_uuid     text UNIQUE,          -- device-bound UUID for anonymous sessions
  tier            text NOT NULL DEFAULT 'free'
                  CHECK (tier IN ('anonymous', 'free', 'paid')),
  deep_reveal_count      integer NOT NULL DEFAULT 0,
  deep_reveal_reset_at   timestamptz NOT NULL DEFAULT now(),
  stripe_customer_id     text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

**Notes**:
- `device_uuid` is set on first app load (anonymous or signed-in). Used as `uid` in
  `tracks` and as the IndexedDB key before signup.
- `tier` is the authoritative tier for server-side enforcement. Updated by Stripe webhook.
- `deep_reveal_count` and `deep_reveal_reset_at` track the daily quota for `free` tier.
  Server resets `deep_reveal_count = 0` when `now() > deep_reveal_reset_at` (midnight UTC).
- `anonymous` tier row does NOT exist in Supabase — anonymous state lives only in
  IndexedDB with the `device_uuid` as the key.

---

### `puzzles`

```sql
CREATE TABLE public.puzzles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category              integer NOT NULL CHECK (category BETWEEN 1 AND 6),
  -- 1=Immediate Threat, 2=Forced Block, 3=Double Threat,
  -- 4=Fork Setup, 5=Zugzwang, 6=Parity Control
  move_string           text NOT NULL,    -- e.g. "4433521" — the board state to present
  goal_prompt           text NOT NULL,    -- e.g. "You are Red — find the immediate win"
  goal_predicate_type   text NOT NULL
                        CHECK (goal_predicate_type IN (
                          'immediate_threat', 'forced_block', 'double_threat',
                          'fork_setup', 'zugzwang', 'parity_control'
                        )),
  goal_predicate_params jsonb NOT NULL DEFAULT '{}',
  -- For fork_setup: { "numMoves": 2 }
  -- For forced_block: { "opponentWinCol": 3 }
  cooperative_ai_moves  integer[] NOT NULL DEFAULT '{}',
  -- Pre-authored AI responses for multi-move puzzles, in order.
  -- Empty array for single-move puzzles.
  difficulty            integer NOT NULL DEFAULT 1
                        CHECK (difficulty BETWEEN 1 AND 3),
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_puzzles_category ON public.puzzles(category) WHERE is_active = true;
```

**Validation rules**:
- Every puzzle must be solver-verified before being inserted (human step in workflow).
- `move_string` must represent a legal game state (no more than 42 moves, no wins before
  the final move if multi-move).
- `cooperative_ai_moves` must be non-empty for `fork_setup` and `parity_control` puzzles.

---

### `puzzle_attempts`

```sql
CREATE TABLE public.puzzle_attempts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puzzle_id             uuid NOT NULL REFERENCES public.puzzles(id),
  user_id               uuid REFERENCES public.users(id),  -- NULL for anonymous
  device_uuid           text NOT NULL,                      -- always present
  moves_tried           integer[] NOT NULL DEFAULT '{}',    -- columns tried in order (0-indexed)
  outcome               text NOT NULL
                        CHECK (outcome IN ('correct_first', 'correct_retry',
                                           'revealed', 'tied', 'abandoned')),
  first_attempt_correct boolean NOT NULL,
  time_ms               integer,                            -- duration in ms
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_attempts_user ON public.puzzle_attempts(user_id, created_at);
CREATE INDEX idx_attempts_device ON public.puzzle_attempts(device_uuid, created_at);
```

**Notes**:
- `first_attempt_correct = false` triggers blunder capture (separate insert into `blunders`).
- `outcome = 'revealed'` means the user failed twice and the correct move was shown.
- `outcome = 'tied'` means the user's move is equally scored; counted as correct.

---

### `blunders`

```sql
CREATE TABLE public.blunders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  puzzle_id             uuid REFERENCES public.puzzles(id),  -- NULL if from sparring (Phase 2)
  board_state           text NOT NULL,    -- move_string representing the position
  move_played           integer NOT NULL, -- column the user played (0-indexed)
  correct_move          integer NOT NULL, -- column that satisfies the goal predicate
  pattern_category      integer NOT NULL CHECK (pattern_category BETWEEN 1 AND 6),
  resolved_at           timestamptz,      -- NULL = still in queue; set when solved correctly
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blunders_user_unresolved
  ON public.blunders(user_id, created_at)
  WHERE resolved_at IS NULL;
```

**Notes**:
- Served oldest-unreviewed first (`ORDER BY created_at ASC WHERE resolved_at IS NULL`).
- Silently inserted — no UI notification to the user that a position was captured.
- `resolved_at` is set only when the user solves the review puzzle on first attempt.
  Failing again leaves `resolved_at = NULL`.

---

### `explanation_cache`

```sql
CREATE TABLE public.explanation_cache (
  position_hash         text PRIMARY KEY,   -- sha256(moves + candidateCol)
  one_liner             text NOT NULL,
  deep_reveal_json      jsonb NOT NULL,
  -- { patternTag, continuationLine, boardAnnotation: [{row, col, highlight}] }
  created_at            timestamptz NOT NULL DEFAULT now()
);
```

**Notes**:
- Cache hit: return `one_liner` and `deep_reveal_json` without calling Claude.
- Cache miss: call Claude Sonnet, write result, return to caller.
- No TTL at MVP. Bulk-clear if classifier changes significantly.
- `deep_reveal_json` shape:
  ```json
  {
    "patternTag": "double_threat",
    "continuationLine": ["col4", "col3", "col4"],
    "boardAnnotation": [
      { "row": 3, "col": 3, "highlight": "winning" },
      { "row": 3, "col": 4, "highlight": "winning" }
    ],
    "fullText": "Optimal move. Creates a double threat at columns 4 and 5..."
  }
  ```

---

### `tracks`

```sql
CREATE TABLE public.tracks (
  id            bigserial PRIMARY KEY,
  uid           text NOT NULL,          -- device hash; always present
  user_id       uuid,                   -- Supabase user ID when signed in; NULL otherwise
  path          text NOT NULL,          -- feature area, e.g. '/puzzles', '/coach'
  event         text NOT NULL,          -- e.g. 'puzzle_attempted'
  event_data    jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracks_uid ON public.tracks(uid, created_at);
CREATE INDEX idx_tracks_event ON public.tracks(event, created_at);
```

**Launch KPI events and their `event_data` schemas**:

| Event | Key fields in `event_data` |
|---|---|
| `session_start` | `{ mode: 'puzzle'|'sparring' }` |
| `puzzle_attempted` | `{ puzzleId, category, outcome }` |
| `puzzle_solved_correct` | `{ puzzleId, category, firstAttempt: bool }` |
| `puzzle_solved_wrong` | `{ puzzleId, category, attemptNumber }` |
| `deep_reveal_viewed` | `{ context: 'puzzle'|'sparring', puzzleId? }` |
| `signup_completed` | `{ method: 'magic_link' }` |
| `paywall_viewed` | `{ trigger: 'category_lock'|'quota_exceeded'|'coach_access' }` |
| `upgrade_completed` | `{ plan: 'monthly'|'annual' }` |

---

### `stripe_events`

```sql
CREATE TABLE public.stripe_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  type            text NOT NULL,
  payload         jsonb NOT NULL,
  processed_at    timestamptz,   -- NULL = not yet processed / failed
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

**Notes**:
- Every incoming webhook payload is inserted here before processing.
- `processed_at` is set on successful processing. NULL rows can be re-processed on restart.
- Protects against silent subscription downgrades on Stripe webhook failures.

---

## IndexedDB Schema (anonymous users)

Mirrors the Supabase schema using the same field names. Stored under the device UUID key.

```
IDBDatabase: "decodec4"
  ObjectStore: "profile"
    Key: device_uuid (string)
    Value: { device_uuid, deep_reveal_count, deep_reveal_reset_at, tier: 'anonymous' }

  ObjectStore: "puzzle_attempts"
    KeyPath: id (auto-increment)
    Indexes: [puzzle_id, created_at]
    Value: { id, puzzle_id, device_uuid, moves_tried, outcome, first_attempt_correct, time_ms, created_at }

  ObjectStore: "session_stats"
    Key: date (ISO date string, today)
    Value: { date, byCategory: { 1: { attempted, correct }, ... } }
```

**Migration on signup**: All `puzzle_attempts` records are bulk-inserted into Supabase.
`profile` record becomes the Supabase `users` row. `session_stats` is summarized into
`puzzle_attempts` aggregate. IndexedDB is cleared after successful migration.

---

## State Transitions

### User tier transitions

```
anonymous (IndexedDB only)
  → [signup] → free (Supabase, tier='free')
  → [payment] → paid (Supabase, tier='paid')
  → [subscription cancelled] → free
```

### Blunder lifecycle

```
puzzle_attempt (first_attempt_correct=false)
  → [auto-capture] → blunder (resolved_at=NULL)
  → [re-served in review queue, solved correctly] → blunder (resolved_at=now())
  → [re-served in review queue, failed again] → blunder (resolved_at=NULL, stays)
```

### Deep Reveal quota

```
free user, quota=3
  → [user taps "See why", server grants] → quota=2
  → [user taps "See why"] → quota=1
  → [user taps "See why"] → quota=0
  → [user taps "See why"] → PaywallModal shown; quota unchanged
  → [midnight UTC] → quota reset to 3
```
