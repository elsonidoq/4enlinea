-- Migration 028: add severity column to blunders
-- severity = round((best_score - score) / 36 * 10), normalized to [0, 10].
-- DEFAULT 0 keeps existing rows valid (unknown severity).
ALTER TABLE blunders ADD COLUMN severity INTEGER NOT NULL DEFAULT 0;

-- Supports ORDER BY severity DESC in GET /api/coach/queue without a full table scan.
CREATE INDEX idx_blunders_severity ON blunders (user_id, severity DESC) WHERE resolved_at IS NULL;
