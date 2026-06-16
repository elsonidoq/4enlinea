# Plan: Rewrite forced_win to be board-based and player-agnostic

## Goal

Remove all solver-score dependencies from the three forced_win implementations and make them work for both players (Red and Yellow as initiator). Replace solver-score heuristics with direct board-threat checks that match the tactical definition.

## Tactical definition (reference)

1. Player places a disk that generates **exactly one** immediate threat (gravity-top 3-in-a-row + empty).
2. Opponent is forced to block that threat.
3. The blocking disk does **not** give the opponent an immediate threat of their own.
4. Chain repeats until the player creates a **double threat** (two simultaneous threats) or wins immediately.

Key invariant: at each non-terminal step, the initiator creates exactly ONE new threat — not 0, not 2+.

## Files to change

| File | Functions | Change |
|------|-----------|--------|
| `server/classifier.js` | `detectForcedWin` | Review only — already player-agnostic; no changes needed |
| `server/predicates.js` | `evalForcedWin`, `evaluatePredicate` | Rewrite evalForcedWin to be board-based; update dispatcher |
| `server/candidate-generator.js` | `traceForcedWin`, `checkForcedWinPredicate`, `computeForcedWinHighlight`, `checkPredicate`, `computeHighlightCells` | Rewrite traceForcedWin (remove solver); make sync; update callers |
| `server/index.js` | Two call sites | Drop `solver` param and `await` from checkForcedWinPredicate calls |
| `tests/predicates/fixtures/fixtures.json` | forced_win fixtures | Update to work with board-based eval (keep scores for JSON compat, but eval ignores them) |
| `tests/predicates/predicates.test.js` | forced_win test | `evalForcedWin` now takes puzzle not scores; update test |

---

## Task 1: Verify `detectForcedWin` is player-agnostic (no code changes)

**File:** `server/classifier.js:1260-1299`

`detectForcedWin(board, perspective, maxDepth)` already takes a `perspective` parameter (1 or 2). All internal logic uses `perspective` and `opponent = 3 - perspective`:

- L1265: `detectDoubleThreat(board, perspective)` — player-agnostic ✓
- L1269: `board.immediateThreats(perspective)` — player-agnostic ✓
- L1275: `board.withMove(blockCol)` — opponent plays, correct because `board.currentPlayer` is the opponent when `perspective !== board.currentPlayer` ✓
- L1276: `opponent = 3 - perspective` ✓
- L1279: `afterBlock.immediateThreats(opponent)` — correct ✓
- L1289: `afterUser.checkWin(row, col, perspective)` — correct ✓
- L1292: `detectDoubleThreat(afterUser, perspective)` — correct ✓

**No changes needed.** The function correctly handles the case where `perspective` is not the board's current player.

---

## Task 2: Rewrite `evalForcedWin` — board-based

**File:** `server/predicates.js:183-200`

### Current (score-based):
```javascript
function evalForcedWin(candidateCol, scores) {
    if (Math.max(...scores) >= 0) return { result: 'wrong' };
    const maxScore = Math.max(...scores);
    const bestCols = scores.reduce((acc, s, i) => {
        if (s === maxScore) acc.push(i);
        return acc;
    }, []);
    if (bestCols.includes(candidateCol)) {
        const others = bestCols.filter(c => c !== candidateCol);
        return others.length > 0
            ? { result: 'tied', tiedWith: others, correctCol: bestCols[0] }
            : { result: 'correct', correctCol: candidateCol };
    }
    return { result: 'wrong', correctCol: bestCols[0] };
}
```

### New (board-based):
```javascript
function evalForcedWin(candidateCol, puzzle) {
    const board = new Board(puzzle.moveString);
    const player = board.currentPlayer;
    const row = board.colHeights[candidateCol];
    if (row >= ROWS) return { result: 'wrong' };

    const afterMove = board.withMove(candidateCol);

    // Can't initiate forced win by winning immediately — that's immediate_threat.
    if (afterMove.checkWin(row, candidateCol, player)) return { result: 'wrong' };

    // First move creating double threat is Category 3 (double_threat), not forced_win.
    if (detectDoubleThreat(afterMove, player).matched) return { result: 'wrong' };

    // Core check: does candidateCol initiate a forced-win chain?
    if (!detectForcedWin(afterMove, player).matched) return { result: 'wrong' };

    // Scan other legal columns for ties.
    const otherInitCols = [];
    for (let c = 0; c < COLS; c++) {
        if (c === candidateCol) continue;
        if (board.colHeights[c] >= ROWS) continue;
        const otherAfter = board.withMove(c);
        const otherRow = board.colHeights[c];
        if (otherAfter.checkWin(otherRow, c, player)) continue;
        if (detectDoubleThreat(otherAfter, player).matched) continue;
        if (detectForcedWin(otherAfter, player).matched) {
            otherInitCols.push(c);
        }
    }

    if (otherInitCols.length > 0) {
        return { result: 'tied', tiedWith: otherInitCols, correctCol: candidateCol };
    }
    return { result: 'correct', correctCol: candidateCol };
}
```

### Key decisions:
- **No scores used.** Detection is purely via `detectForcedWin` on `board.withMove(col)`.
- **Both players work** because `board.currentPlayer` gives the initiator at the puzzle position, and `detectForcedWin` is player-agnostic.
- **Tie detection**: scans all other columns, each requiring `detectForcedWin`. Worst case: 7 × O(7^maxDepth) ≈ 7 × 2400 ≈ 16800 board operations. Acceptable — much faster than solver IPC.

---

## Task 3: Update `evaluatePredicate` dispatcher

**File:** `server/predicates.js:37`

Change:
```javascript
case 'forced_win': return evalForcedWin(candidateCol, scores);
```
To:
```javascript
case 'forced_win': return evalForcedWin(candidateCol, puzzle);
```

The `puzzle` object (with `.moveString`) is already passed to `evaluatePredicate` as the first argument. No call-site changes needed.

---

## Task 4: Rewrite `traceForcedWin` — board-based, no solver

**File:** `server/candidate-generator.js:66-131`

Replace the entire function. The new version mirrors `detectForcedWin`'s logic but returns a column-sequence trace instead of a boolean.

### New signature:
```javascript
function traceForcedWin(ms, initiatorCol, depth, maxInitiatorMoves = 4)
```

### Algorithm:
```
1. ms1 = ms + initiatorCol
2. If game over at ms1 → return null
3. board = new Board(ms1)
4. initiator = board.opponent        // player who just played initiatorCol
5. opponent = board.currentPlayer     // player who must respond

6. threats = board.immediateThreats(initiator)
7. If threats.length !== 1 → return null
8. If detectDoubleThreat(board, initiator).matched → return null

9. blockCol = threats[0]
10. If col full → return null
11. afterBlock = board.withMove(blockCol)
12. If game over → return null

13. // Opponent's block must NOT create a counter-threat
14. If afterBlock.immediateThreats(opponent).length > 0 → return null

15. If depth >= maxInitiatorMoves → return null

16. Try each continuation col c:
    a. If full → skip
    b. afterInit = afterBlock.withMove(c)
    c. Terminal 1: afterInit.checkWin(row, c, initiator) → return [initiatorCol, blockCol, c]
    d. Terminal 2: detectDoubleThreat(afterInit, initiator).matched → return [initiatorCol, blockCol, c]
    e. Recurse: subTrace = traceForcedWin(ms + initiatorCol + blockCol, c, depth+1)
       If subTrace → return [initiatorCol, blockCol, ...subTrace]

17. Return null
```

### Key differences from old solver-based version:
- **No solver queries.** All checks use `Board.immediateThreats()`, `checkWin()`, `detectDoubleThreat()`.
- **Counter-threat check** added (step 14) — matches `detectForcedWin`.
- **Cross-column double threats** now handled correctly: the trace's terminal step returns the actual continuation column `c` and block column `blockCol`, not the same column twice. When the terminal is a double threat in a different column than the block, the trace correctly shows initiator playing the unblocked column.
- **Synchronous** — no more `await`.

---

## Task 5: Rewrite `checkForcedWinPredicate` — sync, board-based

**File:** `server/candidate-generator.js:133-152`

### New signature:
```javascript
export function checkForcedWinPredicate(ms)
```

(Remove `solver` param, remove `async`.)

### Algorithm:
```
1. board = new Board(ms)
2. initiator = board.currentPlayer
3. correctCols = []
4. For each legal col c:
    a. afterMove = board.withMove(c)
    b. row = board.colHeights[c]
    c. Skip if afterMove.checkWin(row, c, initiator)          // immediate win → not forced_win
    d. Skip if detectDoubleThreat(afterMove, initiator).matched // double threat → Category 3
    e. If !detectForcedWin(afterMove, initiator).matched → skip
    f. trace = traceForcedWin(ms, c, 1)
    g. If trace === null → skip
    h. If trace.length < 5 → skip  // trivial: initial move already creates double threat
    i. Build msEnd from trace
    j. If hasWon(boardEnd, initiator) → correctCols.push(c)
5. Return { passes: correctCols.length === 1, correctCols }
```

### De-duplication note:
`detectForcedWin(afterMove, initiator)` at step 4e is the exhaustive check. `traceForcedWin` at step 4f is for building the trace and verifying it leads to a win. If they ever disagree, the column is skipped (conservative). In practice they should always agree since they use the same board logic.

---

## Task 6: Update `computeForcedWinHighlight` — sync, no solver

**File:** `server/candidate-generator.js:184-215`

### Changes:
- Remove `solver` parameter.
- Remove `async`/`await`.
- Rename `isRedTurn` variable to `isInitiatorTurn` for clarity (logic unchanged — index 0 is always initiator).

### New signature:
```javascript
export function computeForcedWinHighlight(moveString, correctCols)
```

---

## Task 7: Update `checkPredicate` and `computeHighlightCells` call sites

**File:** `server/candidate-generator.js`

- **L235:** `computeForcedWinHighlight(moveString, correctCols)` — drop `solver` param.
- **L444:** `checkForcedWinPredicate(moveString)` — drop `solver` param.

`checkPredicate` itself still receives `solver` (used by `checkClaimevenPredicate`), but forced_win no longer consumes it.

---

## Task 8: Update `index.js` call sites

**File:** `server/index.js`

### L2428-2430:
```javascript
// Before:
const { correctCols } = await checkForcedWinPredicate(preClickMoves, solver);
// After:
const { correctCols } = checkForcedWinPredicate(preClickMoves);
```

### L1310 and L1837:
No changes needed — `evaluatePredicate` still takes `(puzzle, candidateCol, scores)`. The `scores` param is ignored by the new `evalForcedWin` but still used by other categories.

---

## Task 9: Update test fixtures and tests

### `tests/predicates/fixtures/fixtures.json`

The two forced_win fixtures (L142-181) use `"3333344455"`. Currently they pass `scores` arrays. After the change, `evalForcedWin` ignores scores and uses the board. The fixtures need the `moveString` field (already present in `puzzle.moveString`). Verify the test position `"3333344455"` with col6 still evaluates as `correct` under the board-based checker.

If `detectForcedWin` rejects this position (0 immediate threats at the puzzle position), the fixture needs a new move string that passes board-based detection. Run the check manually first.

### `tests/predicates/predicates.test.js`

L42-48: The test uses hardcoded scores. After the change, `evalForcedWin` ignores scores. Update the test to use a board position where the board-based check produces the expected result (tied or correct).

---

## Task 10: Integration verification

1. Run `npm run test:fast` in `connect-four/` — all existing tests should pass.
2. Manually verify with `visualize_board.sh` on the test fixture position to confirm board-based detection matches expectations.
3. Spot-check: find a forced_win puzzle in the DB (`SELECT move_string FROM puzzles WHERE category = 'forced_win' LIMIT 3`) and verify `detectForcedWin` returns true for the correct column.
4. Verify both-player support: construct or find a position where Yellow (Player 2) is the initiator and verify detection works.

---

## Files NOT changed

| File | Reason |
|------|--------|
| `server/classifier.js` L1260-1299 (`detectForcedWin`) | Already player-agnostic, already board-based |
| `server/classifier.js` L1164-1198 (`detectDoubleThreat`) | No changes needed — used as-is by forced_win code |
| `server/classifier.js` L1370 (`classifyPattern` wired to `detectForcedWin`) | No changes — still uses `detectForcedWin(board, perspective)` |
| `server/c4solver-wrapper.js` | No changes — forced_win code no longer calls the solver |
| Frontend files | No changes — forced_win evaluation goes through server API |
