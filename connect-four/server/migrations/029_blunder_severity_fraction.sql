-- Migration 029: add blunder_severity (tree-scan fraction) to blunders
-- blunder_severity = fraction of depth-3 continuations from the post-blunder
-- position where the opponent wins (range [0.0, 1.0]). NULL = not yet computed.
ALTER TABLE blunders ADD COLUMN blunder_severity real;
