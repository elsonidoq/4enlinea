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
-- research.md D4a): checked 2026-08-02 against all three reachable environments
-- (SELECT generation_run_id, move_string FROM candidates, grouped in application code):
--   local       (server/.env,          127.0.0.1:54321):       651 rows, 0 duplicate groups found.
--   staging     (server/.env.staging,  jkqilynpshutqcceopdn):  122 rows, 0 duplicate groups found.
--   production  (server/.env.production, kxtqwsumojtexokrtlfp): 645 rows, 0 duplicate groups found.
-- All three environments were reachable; none had a pre-existing (generation_run_id, move_string)
-- duplicate. `IF NOT EXISTS` on the CREATE UNIQUE INDEX below guards only against the index
-- already existing, NOT against duplicate rows — if any such group were live, index creation
-- would error, migrate.js:98 would call process.exit(1), and the Railway deploy's
-- `node server/migrate.js && node server/index.js` start command would never boot the server. The
-- dedupe step below is therefore NOT optional scaffolding; it runs before the index every time
-- this migration is applied, regardless of what the pre-check query found (same "must not
-- assume zero without recording that it checked" discipline as FR-017), so this migration stays
-- safe to re-run even if a duplicate is introduced between this check and the deploy that applies it.

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
