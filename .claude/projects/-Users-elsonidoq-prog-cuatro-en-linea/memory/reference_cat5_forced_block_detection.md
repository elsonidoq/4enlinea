---
name: Cat 4 forced_win — solver scores insufficient for forced-block detection
description: In forced-win terminal positions, all opponent scores are equal so solver scores cannot identify which column is the forced block; use direct board threat detection instead
type: reference
originSessionId: fc1fb961-5695-4a98-a66a-009449178618
---
## Key finding

In a true forced-win terminal (Case A in `traceForcedWin`), the initiator has **multiple immediate winning threats**. The opponent loses equally fast no matter which column they play — so all opponent scores are identical, and you **cannot use solver scores** to identify which column is the "forced block" to highlight.

## Concrete example

Position: `77435634165667374673756` (length 23, Cat 5 puzzle, correct sequence [3,4,4,5,5]).

After Red plays col 3 → Yellow forced col 4 → Red plays col 4, the board reaches `77435634165667374673756344` (length 26, Yellow to play).

```
echo 77435634165667374673756344 | ./c4solver -a -nb
77435634165667374673756344 -8 -8 -8 -8 -8 -1000 -1000
```

All Yellow scores are -8 — identical. Yet col 5 is the correct forced block (Red has an immediate winning threat there). The score gives no signal.

Why: Red has a winning threat at col 5. If Yellow plays col 5 (blocking), Red wins col 5 from above (one row higher). If Yellow plays anywhere else, Red also wins col 5 immediately. All paths reach the same game-end move count, so the score is flat.

**Note**: c4solver also rejects input strings that pass through a winning alignment:
```
echo 7743563416566737467375634445 | ./c4solver -a -nb
Invalid move at position 27: move in column 5 would create a winning alignment
```
This confirms col 5 is an immediate threat, but only via the error — not via scores.

## Correct approach

Use direct board analysis: place the initiator's piece at each legal column height and call `checkWin`. The first column where this creates a win is the forced block. Return `[redCol, wc, wc]` — opponent plays `wc`, initiator wins `wc`.

Implemented in `candidate-generator.js` `traceForcedWin` Case A branch:

```js
const board1 = buildBoard(ms1);
const redPlayer = ms.length % 2 === 0 ? 1 : 2;
for (let wc = 0; wc < COLS; wc++) {
  if (heights1[wc] >= ROWS) continue;
  board1[heights1[wc]][wc] = redPlayer;
  const wins = checkWin(board1, heights1[wc], wc, redPlayer);
  board1[heights1[wc]][wc] = 0;
  if (wins) return [redCol, wc, wc];
}
```

## Related latent bug

JS `immediateWinScore(moveCount) = floor((42-moveCount)/2)` differs from the solver's `(43-nbMoves)/2` by 1 when `moveCount` is odd. Doesn't break current logic (checks use `>=`) but is semantically wrong. Not fixed yet.
