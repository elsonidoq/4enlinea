---
name: puzzle-quality-nav-fixes
description: Puzzle generation quality guards and navigation stability — durable gotchas
metadata: 
  node_type: memory
  type: project
  originSessionId: 81c0298e-6bbc-426b-b974-9ee346edaceb
---

## `isClean()` rules in `candidate-generator.js`

Per-category invariants that must hold for a puzzle to be accepted:

- `immediate_threat`: `countWinningThreats(player) === 1` AND `!hasActiveDoubleThreat(board, colHeights, player)`
- `forced_block`: `countWinningThreats(player) === 0` AND `countWinningThreats(opponent) === 1` AND `!hasActiveDoubleThreat(board, colHeights, opponent)`
- `forbidden_columns`: `!hasActiveDoubleThreat(board, colHeights, opponent)`
- All other categories: `countWinningThreats(player) === 0`

**When adding a new category**: add its guard to `isClean()`. New sequence categories should enforce a minimum trace depth (see below).

## Forced-win minimum trace length

`checkForcedWinPredicate()` rejects any trace shorter than 5 plies. A 3-element trace means the first move already creates a double threat (depth-1 trivial) — not educational. Minimum: `[R1, Y1, R2, Y2, R3]`.

## Stacked double threat — non-obvious definition

A position with exactly 1 immediately playable winning column is still a "stacked double threat" if there is a major threat for the same player directly above the winning cell (same column, row+1). The opponent cannot stop the win. These positions must be excluded from `immediate_threat`, `forced_block`, and `forbidden_columns` puzzles.

Functions in `connect-four/server/classifier.js`:
- `buildThreatMap(board)` — returns map of empty cells with major/minor threat flags per player
- `hasMajorThreatAt(board, row, col, player)` — checks a single cell without board mutation
- `hasActiveDoubleThreat(board, colHeights, player)` — returns true for ≥2 immediate winning columns OR exactly 1 with a stacked major threat above it

Regression test movestring: `03630015223512113` (Yellow stacked double threat at col5 rows 1+2) — must return true from `hasActiveDoubleThreat`.

## Solved puzzle exclusion behavior

Puzzles where the user gave up (`revealed` feedback) are intentionally NOT excluded from the selection pool — users should re-encounter their missed puzzles. Only `correct_first`, `correct_retry`, and `tied` outcomes are treated as solved and excluded.
