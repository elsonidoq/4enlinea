# Data Model: Puzzle Factory

**Phase 1 output** | Feature: `003-puzzle-factory` | Date: 2026-05-04

---

## New Tables

### `candidates`

Holds board positions produced by a generation job and awaiting annotator review.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `category` | integer | NOT NULL, 1–7 | Puzzle category that flagged this position |
| `move_string` | text | NOT NULL | Sequence of column digits (1–7) encoding the board state |
| `solver_scores` | jsonb | NOT NULL | Array of 7 solver scores for each column at this position |
| `classifier_tags` | jsonb | NOT NULL DEFAULT '[]' | List of pattern tag strings from the classifier |
| `status` | text | NOT NULL DEFAULT 'pending' | `pending` \| `approved` \| `rejected` |
| `rejection_reason` | text | nullable | Set on rejection: e.g. `'not_educational'`, `'end_game'`, `'false_positive'` |
| `generation_run_id` | text | NOT NULL | Opaque identifier for the generation batch (e.g. ISO timestamp + category + seed) |
| `seed` | integer | NOT NULL | PRNG seed used for the generation run. Stored for reproducibility — re-running with the same seed and category produces the same candidate positions. |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |
| `reviewed_at` | timestamptz | nullable | Set when status changes from pending |

**Indexes**:
- `(category, status)` — dashboard count queries
- `(generation_run_id)` — batch reject operations
- `(move_string)` — duplicate detection

**Constraints**:
- `CHECK (category BETWEEN 1 AND 7)`
- `CHECK (status IN ('pending', 'approved', 'rejected'))`

**State transitions**:
```
pending → approved   (annotator clicks Approve)
pending → rejected   (annotator clicks Reject with any reason)
```
No transitions out of `approved` or `rejected` — records are immutable once reviewed.

---

### `false_positive_records`

Append-only log of board positions where the classifier incorrectly tagged a category. Created when an annotator rejects a candidate with reason `'false_positive'`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `candidate_id` | uuid | NOT NULL, FK → candidates(id) | The rejected candidate this record derives from |
| `category` | integer | NOT NULL, 1–7 | Category that incorrectly classified this board |
| `move_string` | text | NOT NULL | Board state (copied from candidate for fast export) |
| `solver_scores` | jsonb | NOT NULL | Copied from candidate for developer context |
| `annotator_note` | text | nullable | Optional free-text explanation from the annotator |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | |

**Indexes**:
- `(category)` — filter by category when investigating a specific predicate bug
- `(created_at)` — chronological export

**Notes**:
- Records are never updated or deleted.
- A developer exports this table (or queries it directly) to investigate false positives; no UI is provided.

---

## Modified Tables

### `puzzles` — extend category range

The existing `CHECK (category BETWEEN 1 AND 6)` must be widened to `BETWEEN 1 AND 7` to accommodate the new Forbidden Columns category.

The `goal_predicate_type` CHECK constraint must be extended to include `'forbidden_columns'`.

---

## Migration File

**Path**: `connect-four/server/migrations/007_puzzle_factory.sql`

```sql
-- Migration 007: Puzzle Factory — candidates, false positive records, category 7

-- Extend puzzles table for category 7 (Forbidden Columns)
ALTER TABLE public.puzzles
  DROP CONSTRAINT IF EXISTS puzzles_category_check,
  ADD CONSTRAINT puzzles_category_check CHECK (category BETWEEN 1 AND 7);

ALTER TABLE public.puzzles
  DROP CONSTRAINT IF EXISTS puzzles_goal_predicate_type_check,
  ADD CONSTRAINT puzzles_goal_predicate_type_check
    CHECK (goal_predicate_type IN (
      'immediate_threat','forced_block','double_threat',
      'fork_setup','zugzwang','parity_control','forbidden_columns'
    ));

-- Candidate queue
CREATE TABLE IF NOT EXISTS public.candidates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category         integer NOT NULL CHECK (category BETWEEN 1 AND 7),
  move_string      text NOT NULL,
  solver_scores    jsonb NOT NULL,
  classifier_tags  jsonb NOT NULL DEFAULT '[]',
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  generation_run_id text NOT NULL,
  seed              integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  reviewed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_candidates_category_status
  ON public.candidates(category, status);
CREATE INDEX IF NOT EXISTS idx_candidates_run
  ON public.candidates(generation_run_id);
CREATE INDEX IF NOT EXISTS idx_candidates_move_string
  ON public.candidates(move_string);

-- False positive log (append-only)
CREATE TABLE IF NOT EXISTS public.false_positive_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id   uuid NOT NULL REFERENCES public.candidates(id),
  category       integer NOT NULL CHECK (category BETWEEN 1 AND 7),
  move_string    text NOT NULL,
  solver_scores  jsonb NOT NULL,
  annotator_note text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_false_positives_category
  ON public.false_positive_records(category);
CREATE INDEX IF NOT EXISTS idx_false_positives_created_at
  ON public.false_positive_records(created_at);
```

---

## Entity Relationships

```
Generation Job (runtime concept, no table)
  └── produces N → candidates

candidates (1)
  └── on false_positive rejection → creates 1 → false_positive_records

candidates (approved, 1)
  └── exports to → puzzles (1)
```

---

## Category Reference

| Category ID | Name | Predicate Type String |
|---|---|---|
| 1 | Immediate Threat | `immediate_threat` |
| 2 | Forced Block | `forced_block` |
| 3 | Double Threat | `double_threat` |
| 4 | Fork Setup | `fork_setup` |
| 5 | Zugzwang | `zugzwang` |
| 6 | Parity Control | `parity_control` |
| 7 | Forbidden Columns | `forbidden_columns` *(new)* |
