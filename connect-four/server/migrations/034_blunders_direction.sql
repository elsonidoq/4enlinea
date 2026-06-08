-- Epic 1 (patterns-blunders): add direction column to blunders
-- Nullable TEXT; values are 'missed_own' | 'enabled_opponent' | 'defensive_miss'.
-- No CHECK constraint: deliberately unconstrained to allow future extensions
-- without a migration.

ALTER TABLE public.blunders ADD COLUMN direction TEXT;

-- Manual DB verification (T-007/T-008): 2026-06-06
-- All 5 checklist items passed:
--   1. INSERT 'unknown' → CHECK constraint violation (expected)
--      Error: "new row for relation "blunders" violates check constraint
--      "blunders_pattern_category_check""
--   2. INSERT 'drawing_move' → success
--   3. INSERT 'forbidden_columns' → success (legacy-tolerated)
--   4. INSERT non-null reason + direction → success
--   5. INSERT NULL reason + direction → success (nullable columns)
