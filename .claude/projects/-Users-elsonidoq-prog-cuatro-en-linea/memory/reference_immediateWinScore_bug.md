---
name: immediateWinScore-bug
description: immediateWinScore formula is ambiguous for odd moveCount — deleted from codebase; use checkWin at gravity-top instead
metadata:
  type: reference
---

## The bug

`Math.floor((42 - moveCount) / 2)` produces the same integer for two different endings when `moveCount` is odd:

- `movesWhenGameEnds = moveCount+1` (immediate win): `floor((43 - (moveCount+1)) / 2)` = `floor((42-moveCount)/2)`
- `movesWhenGameEnds = moveCount+2` (win in 2 plies): `floor((43 - (moveCount+2)) / 2)` = same value when `moveCount` is odd

Example: `moveCount=19` → `winScore = floor(23/2) = 11`. The c4solver returns score=11 for a column that is NOT an immediate 4-in-a-row win (it's a double-threat win in 2 plies). Position `0116034064222505306` is a concrete regression case.

## The fix (2026-05-21)

`immediateWinScore` was **deleted** from `predicates.js` and `candidate-generator.js`. Any future caller will get a ReferenceError rather than a silent wrong answer.

Affected functions replaced with board-level `checkWin` at gravity-top:

- `predicates.js → evalImmediateThreat`: now calls `parseBoard` + `checkWin(board, heights[i], i, player)` for each positive-score column.
- `candidate-generator.js → isClean`: now calls `parseBoardState` + `countWinningThreats(board, colHeights, player) === 0`.

`classifier.js` had already been fixed earlier (same approach).

## Rule

Never use a score threshold to detect immediate wins. Always verify with `checkWin` at the gravity-top cell.
