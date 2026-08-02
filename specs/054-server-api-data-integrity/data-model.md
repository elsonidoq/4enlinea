# Phase 1 Data Model: Server/API Data Integrity & Environment Correctness

This feature changes no table shape except `puzzle_attempts.outcome`'s CHECK constraint and adds one
new index to `candidates`. Everything else is behavioral (identifier derivation, sort order, cache
scope) over existing columns. This doc covers only the two migrations; the full current schema is
`docs/architecture/db-schema.md` (authoritative, not duplicated here).

## Migration `062_candidates_generation_run_unique.sql` (FR-012)

```sql
-- Migration 062: Unique index on (generation_run_id, move_string) so a candidate-insert
-- retry after a lost post-commit acknowledgment is a provable no-op, not a silent duplicate.
-- HUMAN REVIEW REQUIRED before applying to production.
--
-- OI-50: the /api/admin/generate retry loop (server/index.js, `MAX_INSERT_ATTEMPTS`) re-sends
-- the identical `rows` batch on any insert error, including one that arrives after Postgres
-- already committed the first attempt. `idx_candidates_move_string` (007_puzzle_factory.sql)
-- is non-unique and does not prevent this. The batch already carries `generation_run_id` +
-- `move_string`, an existing natural dedupe key — no new column needed.
--
-- Pre-migration live-DB check (mirrors FR-017's discipline for migration 063 — see
-- research.md D4a): [RECORD RESULT HERE BEFORE APPLYING. Query run against
-- <staging|production>, <date>: N groups of (generation_run_id, move_string) found with
-- count > 1.] `IF NOT EXISTS` on the CREATE UNIQUE INDEX below guards only against the index
-- already existing, NOT against duplicate rows — if any such group is live, index creation
-- errors, migrate.js:98 calls process.exit(1), and the Railway deploy's
-- `node server/migrate.js && node server/index.js` start command never boots the server. The
-- dedupe step below is therefore NOT optional scaffolding; it MUST run before the index, every
-- time this migration is applied, regardless of what the pre-check query found (same "must not
-- assume zero without recording that it checked" discipline as FR-017).

-- Deterministic dedupe: for any (generation_run_id, move_string) pair with more than one row,
-- keep ONE row and delete the rest. Lossless with respect to the batch's intent — the retry
-- re-sent the SAME row data, so whichever row survives already carries the correct
-- move_string/generation_run_id/etc.
--
-- Ordering key: do NOT order by `id`. `candidates.id` is `uuid PRIMARY KEY DEFAULT
-- gen_random_uuid()` (007_puzzle_factory.sql:18, re-declared 011_category_slugs.sql:56), so
-- "keep the lowest id" would pick a RANDOM row, not the earliest insert. `created_at` is the
-- semantically correct key (007_puzzle_factory.sql:28, `timestamptz NOT NULL DEFAULT now()`),
-- but a retried batch is inserted inside one statement and can share an identical `created_at`
-- — the same timestamp-collision property that makes GET /api/admin/candidates' pagination
-- unstable (FR-012a). `ctid` (the physical row locator, unique within a table at any instant)
-- is therefore the final tiebreaker. Since the duplicate rows are byte-identical apart from
-- `id`, WHICH one survives does not matter; only that exactly one does.
DELETE FROM public.candidates c
  USING public.candidates dup
  WHERE c.generation_run_id = dup.generation_run_id
    AND c.move_string = dup.move_string
    AND (c.created_at, c.ctid) > (dup.created_at, dup.ctid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_run_move_unique
  ON public.candidates (generation_run_id, move_string);
```

**Paired code change** (not part of the migration file, tracked in tasks.md): the insert at
`server/index.js:3002` (`supabase.from('candidates').insert(rows)`) switches to
`supabase.from('candidates').upsert(rows, { onConflict: 'generation_run_id,move_string',
ignoreDuplicates: true })`. **Mechanism amended from the spec's original FR-012 wording**
("catch `23505` and treat as a successful no-op") to `upsert`/`ignoreDuplicates` — see `research.md`
D4 for why: the insert is a single batched, atomic multi-row `INSERT`, so a bare `.insert(rows)`
retry that hits the new unique constraint fails the *entire* statement on one `23505`, discarding
every good row in the batch, not just the duplicate one. `upsert(..., ignoreDuplicates: true)`
expresses the same idempotent-replay intent without that failure mode. FR-012's spec text records
this substitution and why (see `spec.md` FR-012).

**Migration ordering**: unlike 063 below, this migration has no cross-*writer* sequencing
dependency — the code change (upsert) and the migration (index) can land in either order without a
window where a legitimate write is silently dropped, but the index should exist before the
`upsert(..., onConflict: ...)` call is deployed, since Postgres's `ON CONFLICT` target requires a
matching unique index/constraint to exist or the upsert itself errors. It DOES, however, share 063's
*migration-safety* dependency: the dedupe step above must run, and be confirmed to have found and
resolved every duplicate group, before `CREATE UNIQUE INDEX` runs in any environment — a failure
here blocks the entire Railway boot, unlike 063 where a stray non-conforming `outcome` value is
lower-severity (an `ADD CONSTRAINT ... NOT VALID` followed by `VALIDATE CONSTRAINT` fails loudly
but does not block index creation itself the same way).

## Migration `063_puzzle_attempts_outcome_narrow.sql` (FR-016, FR-017)

```sql
-- Migration 063: Narrow puzzle_attempts.outcome's CHECK constraint to the four values
-- actually written today, plus the new 'incorrect' value (spec 054 US3).
-- HUMAN REVIEW REQUIRED before applying to production.
--
-- Drops 'revealed' and 'correct_retry' (written by no current code path) and adds
-- 'incorrect' (a wrong submitted answer, distinct from 'abandoned' — reserved for the user
-- leaving without answering). 'tied' is KEPT — it is live, written by
-- POST /api/puzzles/:id/check via evaluatePredicate's 'tied' result.
--
-- Pre-migration live-DB check (FR-017): [RECORD RESULT HERE BEFORE APPLYING — see
-- research.md D5. Query run against <staging|production>, <date>: N rows found outside
-- ('correct_first','tied','incorrect','abandoned').]
--
-- The remap below is a lossless, mechanical value substitution for any stray non-conforming
-- row (not the forbidden incorrect/abandoned backfill, which stays historical and unrecoverable
-- — see FR-022). Safe no-op if zero such rows exist. The remap is SPLIT by source value, not a
-- single catch-all NOT IN(...) -> 'abandoned' (Decision 1, plan-critique step): a pre-existing
-- 'correct_retry' row recorded a SUCCESS (a correct answer, on retry), so collapsing it into
-- 'abandoned' would relabel a success as an abandonment — the opposite semantic, and exactly
-- what the epic's Settled decision #3 (remaps must carry no information loss) forbids. The
-- retry-vs-first distinction is already carried by the separate `first_attempt_correct` boolean
-- column, so mapping 'correct_retry' -> 'correct_first' loses nothing that isn't already
-- preserved elsewhere. 'revealed' (the user gave up and was shown the answer) has no conforming
-- value that preserves its meaning any better than 'abandoned', so it remains the closest fit.
UPDATE public.puzzle_attempts
  SET outcome = 'correct_first'
  WHERE outcome = 'correct_retry';

UPDATE public.puzzle_attempts
  SET outcome = 'abandoned'
  WHERE outcome NOT IN ('correct_first', 'tied', 'incorrect', 'abandoned');
  -- At this point 'correct_retry' rows have already been remapped above, so this catch-all only
  -- catches 'revealed' (and, defensively, any other unforeseen non-conforming value).

-- Two-step constraint swap (NOT VALID + VALIDATE) avoids a full-table lock during validation,
-- per docs/architecture/db-schema.md's general safe-migration guidance.
ALTER TABLE public.puzzle_attempts
  DROP CONSTRAINT IF EXISTS puzzle_attempts_outcome_check;

ALTER TABLE public.puzzle_attempts
  ADD CONSTRAINT puzzle_attempts_outcome_check
  CHECK (outcome IN ('correct_first', 'tied', 'incorrect', 'abandoned'))
  NOT VALID;

ALTER TABLE public.puzzle_attempts
  VALIDATE CONSTRAINT puzzle_attempts_outcome_check;
```

**Constraint name**: `003_puzzles.sql`'s original CHECK is inline/unnamed, so Postgres auto-named it
`puzzle_attempts_outcome_check` (the standard `<table>_<column>_check` pattern). Confirm this exact
name against the live schema (`\d puzzle_attempts` or `information_schema.check_constraints`) before
applying — if migration `003` was ever re-applied with an explicit name, the `DROP CONSTRAINT IF
EXISTS` guards against a name mismatch failing the migration, but the intended constraint must still
be the one that ends up narrowed (verify via `\d` after applying, not just "it didn't error").

**FR-023a sequencing (hard constraint, not a suggestion)**: this migration MUST be applied before
any of FR-015 (`server/index.js:2520` writer normalization), FR-018 (`ChallengeScreen.jsx` `~:408`/
`~:584`), or FR-019 (`ChallengeScreen.jsx` `~:668` new write) ship — those three changes are the ones
that start emitting `'incorrect'`, and against the *current* (wider-but-`'incorrect'`-excluding)
CHECK constraint, an `'incorrect'` insert fails and is silently dropped by the existing
`.catch(err => console.error(...))` fire-and-forget pattern at `:2527` and by whatever
`recordPuzzleAttempt` client-store path underlies the `ChallengeScreen.jsx` writes. tasks.md's
ordering must reflect this: 063 lands and is confirmed applied (dev + staging) before any FR-015/018/019
task starts.

## `docs/architecture/data-model.md` update (FR-021)

The existing "Puzzle Attempts — `outcome` values and the serving pool" section (`data-model.md`
around line 402-406, quoted below verbatim) is replaced — not appended to — since its current text
both understates what's settled (calls the constraint "constrained... to" the old five-value list)
and punts the exclusion question to OI-49 as if still open:

Current text (to be replaced):
```
## Puzzle Attempts — `outcome` values and the serving pool

`puzzle_attempts.outcome` is constrained (migration `003_puzzles.sql`) to `'correct_first' | 'correct_retry' | 'revealed' | 'tied' | 'abandoned'`.

See `docs/open_issues.md` OI-49 for the open question of whether the serving pool should filter on this column — currently it does not.
```

Replacement content (drafted here, finalized as part of the FR-021 task, not this plan):
- States the four-value enum post-migration-063: `'correct_first' | 'tied' | 'incorrect' | 'abandoned'`.
- States plainly that `GET /api/puzzles/draw`'s non-exclusion of solved/revealed puzzles is a
  **deliberate, closed design decision** (OI-49), not an open question — cites the query's exact
  filter set (`category`, `is_active`, non-null `position`) so a future reader does not need to
  re-derive it from the handler.
- Notes `'correct_retry'` is retired: a correct-on-retry attempt is now stored as `'correct_first'`,
  and `first_attempt_correct` (already a separate boolean column) is the sole first-vs-retry signal
  — matching the epic's Settled decision #3 and this spec's own "Context this spec inherits" section,
  so a future reader does not mistake the collapse for a bug.
