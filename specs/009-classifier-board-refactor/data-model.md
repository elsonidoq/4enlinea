# Data Model: Classifier Board Refactor (009)

This refactor introduces no new database entities. The entities below are JavaScript
in-memory objects whose design is the primary structural change.

---

## Board (new class)

**File**: `connect-four/server/classifier.js`  
**Purpose**: Immutable value object wrapping a board position. Created once per
`classify()` call. Shared across all category checks and all detector calls for that
position.

### Fields

| Field | Type | Description |
|---|---|---|
| `movestring` | `string` | Source move string (digits `0–6`, no separator). |
| `board` | `number[][]` | `board[row][col]`, row 0 = bottom. Values 0/1/2. Read-only after construction. |
| `colHeights` | `number[]` | `colHeights[col]` = count of filled cells in column. Read-only after construction. |
| `currentPlayer` | `number` | `movestring.length % 2 === 0 ? 1 : 2`. Derived once in constructor. |
| `opponent` | `number` | `3 - currentPlayer`. Derived once in constructor. |
| `_cache` | `Map<string, any>` | Lazy write-once cache. Keys: `'hasWon_1'`, `'hasWon_2'`, `'immediateThreats_1'`, `'immediateThreats_2'`, `'reachableThreats_1'`, `'reachableThreats_2'`, `'majorThreatCells'`, `'hasActiveDoubleThreat_1'`, `'hasActiveDoubleThreat_2'`. |

### Constructor

```js
constructor(movestring) {
  const { board, colHeights } = parseBoardState(movestring);
  this.movestring   = movestring;
  this.board        = board;
  this.colHeights   = colHeights;
  this.currentPlayer = movestring.length % 2 === 0 ? 1 : 2;
  this.opponent     = 3 - this.currentPlayer;
  this._cache       = new Map();
}
```

### Cache pattern (applied to every cached method)

```js
someMethod(player) {
  const key = `someMethod_${player}`;
  if (!this._cache.has(key)) {
    this._cache.set(key, someFreeFunction(this.board, this.colHeights, player));
  }
  return this._cache.get(key);
}
```

For player-independent methods (`majorThreatCells`), the key is just `'majorThreatCells'`.

### Methods

| Method | Cached | Delegates to | Notes |
|---|---|---|---|
| `checkWin(row, col, player)` | No | free `checkWin` | O(1) |
| `hasWon(player)` | Per player | free `hasWon` | Used for game-over checks |
| `immediateThreats(player)` | Per player | free `getImmediateThreats` | Returns `col[]` |
| `reachableThreats(player)` | Per player | free `getReachableThreats` | Returns `Map<col, row[]>` |
| `winningWindows(row, col, player)` | No | free `getWinningWindows` | Called with varying (row,col) |
| `majorThreatCells()` | Yes (player-independent) | free `getMajorThreatCells` | Returns threat map |
| `hasActiveDoubleThreat(player)` | Per player | free `hasActiveDoubleThreat` | |
| `withMove(col)` | No | `new Board(movestring + col)` | Throws `RangeError` if col invalid or full |

### `withMove` contract

```js
withMove(col) {
  if (col < 0 || col >= COLS || this.colHeights[col] >= ROWS) {
    throw new RangeError(`withMove: column ${col} is full or out of range`);
  }
  return new Board(this.movestring + col.toString());
}
```

The returned `Board` starts with an empty cache and satisfies the cache invariant
independently. It does NOT inherit any cache entries from the parent.

---

## DetectorResult (unchanged type)

Return type of all `detect*` functions. Shape is unchanged from the current implementation.

```ts
type DetectorResult = {
  matched: boolean;
  highlightMetadata?: HighlightMetadata | null;
  categoryEvidence?: Record<string, unknown>;
  correctCol?: number;
}
```

---

## Allen predicate functions (new named exports)

Pure functions of numeric row arguments only. No board state, no cache.

### `isT4SameParity(R, Rp) → bool`

```js
// Returns true when two threats in the same column have the same row parity.
// Same parity → T4 applies → no interaction between the threats.
// @see allen-t4
function isT4SameParity(R, Rp) {
  return R % 2 === Rp % 2;
}
```

Row values are 0-indexed. The parity condition is invariant under the 0-indexed ↔
1-indexed translation (shifting by 1 flips parity, so "same parity" is preserved).

### `isT5Exception(R, Rp) → bool`

```js
// Returns true when two threats are at 0-indexed rows 5 and 2 (Allen 1-indexed rows 6 and 3).
// T5 overrides T2 for this specific pair: they do NOT interact despite opposite parity.
// @see allen-t5
function isT5Exception(R, Rp) {
  return (R === 5 && Rp === 2) || (R === 2 && Rp === 5);
}
```

Row 5 (0-indexed) = Allen row 6 (1-indexed). Row 2 (0-indexed) = Allen row 3 (1-indexed).
This is the only row pair where T2 cross-parity undercut logic is overridden.

### `isT2Blocking(colThreats, R, Rp) → bool`

```js
// Returns true if a current-player threat at Rpp < Rp neutralizes the opponent threat at Rp via T2.
// Parameters (all 0-indexed):
//   colThreats: current-player threat rows in this column
//   R:  current player's threat row (upper, R > Rp)
//   Rp: opponent's threat row (lower)
// @see allen-t2
function isT2Blocking(colThreats, R, Rp) {
  return colThreats.some(Rpp => {
    if (Rpp >= Rp) return false;
    // Sub-case 2: CP even (0-indexed) below opp odd — any distance
    if (Rpp % 2 === 0 && Rp % 2 === 1) return true;
    // Sub-case 3: CP odd (0-indexed) immediately below opp even — must be adjacent
    if (Rpp % 2 === 1 && Rp % 2 === 0 && Rpp + 1 === Rp) return true;
    return false;
  });
}
```

Used by `detectOvercut` only. `detectUndercut` encodes the T2 adjacency check (sub-case 3)
inline as the U3 guard because it needs the single-column `Rpp === R` case.

---

## Layer organization (file layout in classifier.js)

```
// Layer 0 — Board parsing (internal)
parseBoardState(moves)                         // unchanged free export

// Layer 1 — Win detection
checkWin(board, row, col, player)              // unchanged free export
hasWon(board, player)                          // NEW free export (was local in candidate-generator.js)

// Layer 2 — Threat primitives
getImmediateThreats(board, colHeights, player) // renamed from countWinningThreats
getReachableThreats(board, colHeights, player) // NEW
getWinningWindows(board, row, col, player)     // promoted from private in detectFigure7
getMajorThreatCells(board)                     // renamed from buildThreatMap

// Layer 3 — Interaction-rule predicates
hasActiveDoubleThreat(board, colHeights, player) // rewritten (no mutation)
isT4SameParity(R, Rp)                            // NEW named export
isT5Exception(R, Rp)                             // NEW named export
isT2Blocking(colThreats, R, Rp)                  // NEW named export

// Board class (wraps Layers 0–3)
class Board { ... }

// Layer 4 — Pattern detectors (signature change: moves→board)
detectZThreat(board, scores)
detectUndercut(board, scores)
detectOvercut(board, scores)
detectFigure7(board, scores)
detectJShape(board, scores)
detectClaimeven(board, solver)

// Layer 5 — Public API
classify(moves, candidateCol, scores)          // signature unchanged
classifyBestMove(moves, scores)                // signature unchanged
classifyAll(moves, scores, solver?)            // NEW export
```

---

## candidate-generator.js call-site inventory

### Functions removed

| Removed local function | Replacement |
|---|---|
| `buildBoard(moveString)` | `new Board(ms).board` (per FR-027 — callers MUST construct a Board instance) |
| `getHeights(moveString)` | `new Board(moveString).colHeights` |
| `hasWon(board, player)` | `import { hasWon } from './classifier.js'` |
| `getForcedBlock(moveString)` | Dead code — remove with no replacement |

### Call sites

| Call site | File:line (approx) | Current call | Replacement |
|---|---|---|---|
| `isGameOver` | candidate-generator.js | `buildBoard(ms)`, local `hasWon` | `const board = new Board(ms).board` + `import hasWon`; remove `if (!board) return true` null guard (Board never returns null) |
| `traceForcedWin` — ms1 board | candidate-generator.js | `buildBoard(ms1)` | `const board1 = new Board(ms1).board` |
| `traceForcedWin` — heights | candidate-generator.js | `getHeights(ms)`, `getHeights(ms1)`, `getHeights(ms2)` | `new Board(ms).colHeights` |
| `traceForcedWin` — won check | candidate-generator.js | local `hasWon(boardEnd, redPlayer)` | `import { hasWon }` |
| `checkForcedWinPredicate` — board | candidate-generator.js | `buildBoard(msEnd)` | `const boardEnd = new Board(msEnd).board`; remove `if (!boardEnd) return true` null guard |
| `checkForcedWinPredicate` — heights | candidate-generator.js | `getHeights(ms)` | `new Board(ms).colHeights` |
| `checkForcedWinPredicate` — won check | candidate-generator.js | local `hasWon(boardEnd, redPlayer)` | `import { hasWon }` |
| `checkForbiddenColumnsPredicate` | candidate-generator.js | `buildBoard(ms)` | `const board = new Board(ms).board` |
| `computeForcedWinHighlight` | candidate-generator.js | `getHeights(ms)` in loop | `new Board(ms).colHeights` per iteration |
| `computeForbiddenColumnsHighlight` | candidate-generator.js | `getHeights(moveString)` | `new Board(moveString).colHeights` |
| `computeLowCategoryHighlight` | candidate-generator.js | `getHeights(moveString)` | `new Board(moveString).colHeights` |
| `checkZThreatPredicate` | candidate-generator.js | `detectZThreat(ms, scores)` | `detectZThreat(new Board(ms), scores)` |
| `checkClaimevenPredicate` | candidate-generator.js | `detectClaimeven(ms, solver)` | `detectClaimeven(new Board(ms), solver)` |
| `checkUndercutPredicate` | candidate-generator.js | `detectUndercut(ms, scores)` + `getHeights(ms)` | `detectUndercut(new Board(ms), scores)` + `new Board(ms).colHeights` |
| `checkOvercutPredicate` | candidate-generator.js | `detectOvercut(ms, scores)` | `detectOvercut(new Board(ms), scores)` |
| `checkFigure7Predicate` | candidate-generator.js | `detectFigure7(ms, scores)` | `detectFigure7(new Board(ms), scores)` |
| `checkJShapePredicate` | candidate-generator.js | `detectJShape(ms, scores)` | `detectJShape(new Board(ms), scores)` |
| `isClean` | candidate-generator.js | `parseBoardState(ms)` + `countWinningThreats` | `parseBoardState(ms)` + `getImmediateThreats` (rename only) |
| `solverWeightedPosition` | candidate-generator.js | local `hasWon(board, player)` | `import { hasWon }` |

Note: `checkUndercutPredicate` calls `getHeights(ms)` separately (to find `killingCol` legal columns). This stays as `new Board(ms).colHeights`. Since a Board is already constructed to call `detectUndercut`, reuse it: `const b = new Board(ms); detectUndercut(b, scores); ...; b.colHeights`.
