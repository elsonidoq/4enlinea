---
name: puzzle-quality-nav-fixes
description: Puzzle generation quality guards and navigation stability fixes applied 2026-05-26
metadata: 
  node_type: memory
  type: project
  originSessionId: 81c0298e-6bbc-426b-b974-9ee346edaceb
---

Four bugs fixed on 2026-05-26 (branch 009-puzzles-v1):

## Generation quality

**File:** `connect-four/server/candidate-generator.js`

**`isClean()` rewrite** — old code skipped all checks for `immediate_threat` and had no opponent-threat guard for `forced_block`. New logic:
- `immediate_threat`: require `countWinningThreats(player) === 1` (exactly one winning column)
- `forced_block`: require `countWinningThreats(player) === 0` AND `countWinningThreats(opponent) === 1`
- All other categories: require `countWinningThreats(player) === 0` (unchanged)

**`checkForcedWinPredicate()`** — added `if (trace.length < 5) continue` guard. A 3-element trace means Case A fired at depth 1 (first move already creates a double threat → trivial 3-ply puzzle). Minimum accepted sequence is 5 plies: [R1, Y1, R2, Y2, R3].

**Why:** double-threat boards are invalid inputs for single-threat categories; 3-ply forced-win sequences are too trivial to be educational.

## Navigation / state

**File:** `connect-four/src/pages/PuzzlesPage.jsx`

**Deterministic puzzle selection:** added `categoryPuzzleRef = useRef({})` to remember chosen puzzle ID per category. On re-entry to a category (back → forward), the same puzzle is shown. On "Next" after solving, the solved puzzle is excluded from the pool, so the ref reselects a fresh puzzle.

**Solved puzzle exclusion:** `loadPuzzle()` now calls `store.getAllPuzzleAttempts()` and builds `solvedIds` (outcomes: `correct_first`, `correct_retry`, `tied`). Pool is filtered before selection. If all puzzles are solved, falls back to full pool. Puzzles where the user gave up (`revealed` feedback) are NOT excluded — intentional, so users re-encounter their missed puzzles.

**How to apply:** if touching puzzle selection or generation, be aware these guards exist. Adding a new simple category should add its guard to `isClean()`. New sequence categories should inherit the `trace.length < 5` logic or similar depth check.

## Active double-threat filter (2026-05-26, same session)

**Files:** `connect-four/server/classifier.js`, `connect-four/server/candidate-generator.js`

**Problem:** a position with a single immediately playable winning column can still be a "stacked double threat" — the winning cell in col C at row R is a major threat, AND there is another major threat for the same player at (R+1, C) directly above. The opponent cannot stop Yellow from winning. These positions are visually confusing and should not appear as `immediate_threat`, `forced_block`, or `forbidden_columns` puzzles.

**New functions in `classifier.js`:**
- `buildThreatMap(board)` — moved here from `visualize_board.mjs` (no duplication); returns map of all empty cells with major/minor threat flags per player
- `hasMajorThreatAt(board, row, col, player)` — checks a single cell for a major threat without board mutation
- `hasActiveDoubleThreat(board, colHeights, player)` — returns true if player has ≥2 immediate winning columns (traditional double threat) OR exactly 1 winning column with a major threat stacked directly above it (stacked case)

**`isClean()` update:**
- `immediate_threat`: also requires `!hasActiveDoubleThreat(board, colHeights, player)`
- `forced_block`: also requires `!hasActiveDoubleThreat(board, colHeights, opponent)`
- `forbidden_columns`: new guard — requires `!hasActiveDoubleThreat(board, colHeights, opponent)`

**Regression test:** `tests/classifier/classifier.test.js` — `hasActiveDoubleThreat()` describe block; movestring `03630015223512113` (Yellow stacked double threat at col5 viz rows 1+2) must return true.
