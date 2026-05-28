ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS simulation_trace JSONB NOT NULL DEFAULT '[]';

-- Backfill from candidates using move_string as the join key
UPDATE puzzles p
SET simulation_trace = COALESCE(
  (
    SELECT c.category_evidence->'simulation_trace'
    FROM candidates c
    WHERE c.move_string = p.move_string
      AND c.category_evidence ? 'simulation_trace'
    LIMIT 1
  ),
  '[]'
)
WHERE p.category = 'claimeven';
