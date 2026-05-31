---
name: c4solver behavioral quirks
description: c4solver rejects input strings containing winning moves; scores at won positions are unreliable
type: reference
originSessionId: fc1fb961-5695-4a98-a66a-009449178618
---
## c4solver silently hangs on strings that contain a winning move

If a move string ends on (or passes through) a position where the player who just moved created 4-in-a-row, c4solver produces **no output at all** — it does not write a result line, it does not print an error. The c4solver-wrapper.js Promise queue entry is never resolved, and because queries are chained via `pending`, **all subsequent queries in that solver process also hang forever**.

This surfaces as a test suite that "runs for 15 minutes" with no failures — tests are just frozen waiting on solver.query().

**How to validate test fixtures**: before using a move string in a test, race `solver.query(ms)` against a short timeout and reject if it times out:

```js
const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('HANG')), 2000));
await Promise.race([solver.query(ms), timeout]);  // throws if invalid
```

Known-bad positions discovered during 008 integration tests: `'44334455667711223355'`, `'445566332211'`, `'44556633221144'`, `'4455663'`, `'112233445566'`.

Known-good positions (≥10 moves, verified): `'765432176543'`, `'12345671234567'`, `'12345677654321'`, `'44554433'`, `'441133'`.

## Score formula vs JS implementation

Solver C++ (Solver.cpp line 140):
```cpp
scores[col] = (WIDTH * HEIGHT + 1 - P.nbMoves()) / 2;  // immediate win
```
= `(43 - nbMoves) / 2` (integer division)

JS code:
```js
immediateWinScore(moveCount) = Math.floor((42 - moveCount) / 2)
```

These differ by 1 when `moveCount` is odd. The JS formula underestimates by 1 in those cases. Current code works around this via `>=` comparisons, but the formula itself is wrong.

## Scores at forced-win terminals are flat

When the opponent faces a forced-win position (all moves lose at the same speed), all opponent column scores are identical. Do not use scores to pick which column to highlight — use direct board threat detection instead. See `reference_cat5_forced_block_detection.md`.

## Never use score threshold to detect immediate wins

`immediateWinScore` was deleted from `predicates.js` and `candidate-generator.js` (2026-05-21) because the formula `Math.floor((42 - moveCount) / 2)` produces the same integer for an immediate win and a win-in-2 when `moveCount` is odd.

**Rule**: always use `checkWin` at the gravity-top cell to detect immediate wins — never infer immediacy from a score value. This applies everywhere: `classifier.js`, `predicates.js`, `candidate-generator.js`.
