---
name: Classifier architecture and score convention
description: How the pattern classifier works, c4solver score encoding, and category detection logic
type: project
---

# Pattern classifier architecture

## File: `connect-four/server/classifier.js`

Classifies a Connect Four position given `(moves, candidateCol, scores)` where scores come from c4solver `-a` flag.

## c4solver score convention

Score from c4solver `-a` = from current player's perspective:
- Positive: current player wins eventually
- Negative: current player loses eventually
- `immediateWinScore(n) = floor((42 - n) / 2)` where n = number of moves already played
- If current player wins immediately (at move n+1): score = `floor((42 - n) / 2)`
- If opponent wins on their next turn (at move n+2 from current position): score = `-floor((41 - n) / 2)`

**Key invariant**: These are NOT symmetric around zero. `-(winScore - 1) ≠ opponentImmediateWin`.

## Category detection pipeline (in priority order)

**Original 5 categories:**
1. **immediate_threat**: `score >= floor((42-n)/2) && score > 0`
2. **forced_block**: `score >= 0` AND all other legal moves equal `opponentImmediateWin`
3. **double_threat**: `score > 0` AND after placing candidate, current player has ≥2 winning threats
4. **forced_win**: all scores ≤ 0, pick highest (losing slowest)
5. **forbidden_columns**: any column where opponent immediately wins if played directly above

**6 new tactical categories (added spec 008, phase 3):**
6. **z_threat**: unique column with odd empty-cell count to winning threat AND positive solver score
7. **undercut**: stacked threats in same column (current player R above, opponent R' below), scores[col] < 0
8. **overcut**: same structure as undercut but scores[col] > 0
9. **claimeven**: 1 or 2 odd-height columns; simulation confirms Yellow wins with baseinverse strategy
10. **figure_7**: 4-of-5 structural template match (4 variants); completing cell has positive score
11. **j_shape**: 3-of-4 structural template + guard (opponent not above completing row); positive score

**Key undercut/overcut distinction**: Both find same structural pattern (cross-player stacked threats in one column). Undercut: playing that column LOSES (scores[col] < 0). Overcut: playing that column WINS (scores[col] > 0).

**Claimeven parity rule**: Uses `heights[col] % 2 === 1` (odd *empty-space* count), NOT `col % 2` (column index). Common bug to watch for.

## highlight_metadata schema by category
- `z_threat`: `{ type: 'capsule', column, fromRow, toRow, badgeCount }` (badgeCount always odd)
- `undercut`: `{ type: 'cells', cells: [{ column, row, role: 'killing_threat' }, { column, row, role: 'dead_threat' }] }`
- `overcut`: `{ type: 'cells', cells: [{ column, row, role: 'neutralised_threat' }, { column, row, role: 'major_threat' }] }`
- `figure_7`: `{ type: 'cells', cells: [4 × { column, row, role: 'pattern_piece' }] }`
- `j_shape`: `{ type: 'cells', cells: [3 × { column, row, role: 'pattern_piece' }] }`
- `claimeven`: `null` (no visual highlight)

## correct_col storage
- Stored on `puzzles` and `candidates` tables (added by migration `016_correct_col.sql`)
- Needed by: claimeven, figure_7, j_shape evaluators
- undercut/overcut derive from `highlight_metadata` at eval time, `correct_col = null`

## Test fixtures

`connect-four/tests/classifier/fixtures/fixtures.json` — labeled positions per category (T020–T025 for new cats still pending).
`connect-four/tests/predicates/fixtures/fixtures.json` — 25 positions covering correct/wrong/tied for all categories.
Integration tests: `tests/integration/z_threat.test.js`, `claimeven.test.js`, `figure7_jshape.test.js`, `undercut_overcut.test.js`.

Run predicate tests: `node --test tests/predicates/predicates.test.js` (27 pass).
