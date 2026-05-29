# classifier.js — Technical Debt Report

_2026-05-26_

---

## Section 1 — Analysis

### 1.1 What the file does well

- **Primitives exist:** `parseBoardState`, `checkWin`, `buildThreatMap`, `countWinningThreats` are
  genuine board-level building blocks that are named clearly and have correct, focused
  implementations.
- **Win detection is incremental:** `checkWin(board, row, col, player)` tests only the four
  windows that pass through the newly placed piece. That is the right design — O(1) per move.
- **`buildThreatMap` is correct:** The O(board × windows) scan covers all four directions and all
  offsets correctly, so the threat data is authoritative.

---

### 1.2 Problems

#### P1 — `parseBoardState` is called multiple times inside `classify()`

`classify()` calls `parseBoardState(moves)` four separate times — once for Cat 1, once for Cat 3,
once for Cat 2, and once for Cat 5. Each call rebuilds the same `board` and `colHeights` from
scratch. The board representation is the most fundamental shared state; there is no reason to
rebuild it more than once per call.

#### P2 — `hasMajorThreatAt` builds the full threat map to answer a single-cell query

```js
export function hasMajorThreatAt(board, row, col, player) {
  const threatMap = buildThreatMap(board);          // O(6×7×4×4) = O(672)
  const t = threatMap[`${row},${col}`];             // then uses only one entry
  ...
}
```

`buildThreatMap` scans the entire board (all 42 cells × 4 directions × 4 offsets = 672 window
checks) to answer a question about one cell. The function should instead check only the 16 windows
(4 directions × 4 offsets) that include `(row, col)`.

#### P3 — `detectUndercut` and `detectOvercut` duplicate the same O(board) threat-collection loop

Both detectors open with the identical 25-line block that populates `currentThreats[col]` and
`opponentThreats[col]` for every column, iterating over every empty cell and calling `checkWin`
for both players. The only difference between the two functions is the guard on `scores[col]`
(negative vs. positive) and the interaction-rule logic that follows. A single helper,
`getReachableThreats(board, colHeights, player)`, would replace both copies.

#### P4 — T2/T4/T5 interaction logic is duplicated and hard to reason about

`detectUndercut` and `detectOvercut` each contain their own inline version of the same Allen
transformation rules (T2, T4, T5). In `detectUndercut` this is a chain of three `continue`
guards. In `detectOvercut` the conditions are inverted and combined into `sameParity`,
`t5Exception`, and `chainT2` booleans. The two copies are not identical — `detectOvercut` adds a
`chainT2` path that `detectUndercut` does not have — but the duplicated guards make it very easy
to diverge further without noticing. Named predicate functions (`isT4SameParity(R, Rp)`,
`isT5Exception(R, Rp)`, `isT2Adjacent(R, Rp)`) would make both detectors self-documenting and
shareable.

#### P5 — `getWinningWindows` is a private helper inside `detectFigure7` that should be a primitive

`getWinningWindows(board, threatRow, threatCol, player)` returns all 4-window completions for a
given cell. That is a fundamental board query — "which 4-in-a-row windows does placing here
complete?" — and belongs in the primitive layer. It is currently unreachable from other detectors
even though e.g. `detectJShape` and `detectOvercut` implicitly need the same concept.

#### P6 — `detectFigure7` and `detectJShape` re-implement their own threat scanning

Both detectors contain their own nested loop over `(col, row >= colHeight)` that places a piece,
calls `checkWin`, then undoes the placement. This is the same pattern as `countWinningThreats` but
without the gravity-top restriction. There is no shared primitive for "all reachable winning cells
for a player" (i.e. cells at or above the column height). The result is that the same board-walking
pattern exists in at least four separate places: `countWinningThreats`, the Cat-3 block in
`classify()`, `detectFigure7`, and `detectJShape`.

#### P7 — Mutable board/colHeights mutation throughout `classify()`

`classify()` places pieces, checks conditions, and manually undoes each placement with
`board[r][c] = 0` and `colHeights[c]--`. The Cat-2 block goes further — it embeds a `.some()`
callback that also mutates and restores `board` and `colHeights`. This pattern is correct only if
every code path that enters the mutation block also exits through the restore path. It makes the
function fragile: adding a new early-return path is a latent bug.

#### P8 — `classify()` and `candidate-generator.js` duplicate board utilities

`candidate-generator.js` defines its own `buildBoard`, `hasWon`, `getHeights`, and
`getForcedBlock` functions. `buildBoard` / `getHeights` overlap with `parseBoardState`.
`hasWon` is a full-board win scanner that overlaps with `checkWin`. `getForcedBlock` reimplements
forced-block detection that `classify()` also handles. Because the two files evolved independently
the implementations have slight differences (e.g. `hasWon` scans all cells; `checkWin` checks from
a specific cell), making it unclear which to trust.

#### P9 — The `detect*` functions have an inconsistent input contract

`classify(moves, candidateCol, scores)` takes a movestring and returns `{tag}`.
All `detect*` functions (`detectZThreat`, `detectUndercut`, …) also take a movestring and call
`parseBoardState` themselves. The board is re-parsed on every entry. If these functions are
eventually composed (e.g. in a single `classifyAll(moves, scores)` pass), each will rebuild the
board redundantly.

---

## Section 2 — Proposed Structure

The idea is to establish a layered primitive hierarchy where:
- **Each layer only knows about the layers below it.**
- **Board traversal lives in exactly one place per query type.**
- **A single `Board` class is the shared entry point; all consumers parse the movestring exactly once.**

---

### The `Board` class

All layers below are implemented as free functions. The `Board` class is a thin wrapper that:

1. Parses the movestring once on construction.
2. Exposes each primitive as a method.
3. Caches computed results so repeated calls within the same position are free.

```js
class Board {
  constructor(movestring) { ... }  // calls parseBoardState once

  // Layer 1
  checkWin(row, col, player)       // no cache — O(1) already
  hasWon(player)                   // cached per player

  // Layer 2
  immediateThreats(player)         // cached per player
  reachableThreats(player)         // cached per player
  winningWindows(row, col, player) // no cache — called with varying (row,col)
  majorThreatCells()               // cached (player-independent)

  // Layer 3
  hasActiveDoubleThreat(player)    // cached per player

  // Simulation
  withMove(col) → Board            // returns a NEW Board; does not mutate this
}
```

#### Cache invariant

> **Every cached value on a `Board` instance equals the result of calling the corresponding
> free function with the raw `board` and `colHeights` arrays that were produced by parsing
> `this.movestring` from scratch.**

In other words: a cache entry is valid if and only if `this.movestring` has not changed since
the entry was written. This invariant is maintained by construction:

- **Caches are populated lazily on first access** and never updated after that.
- **`Board` instances are immutable after construction.** No method mutates `this.board`,
  `this.colHeights`, or any cache entry.
- **Simulation (`withMove`) creates a new `Board`** from the extended movestring. The new
  instance starts with an empty cache and satisfies the invariant independently.

The consequence is that "cache invalidation" is not a problem: there is nothing to invalidate.
Any code that needs to reason about a hypothetical position creates a new `Board` via `withMove`
rather than mutating the current one. This replaces the entire class of
`board[r][c] = player; ...; board[r][c] = 0` mutation+undo patterns in the current code.

#### `withMove` performance note

`withMove(col)` appends one character to the movestring and calls `new Board(...)`, which
re-parses all previous moves. For a 6×7 board (at most 42 moves) this is O(42) — negligible.
If profiling ever shows it matters, the constructor can accept a pre-built state object so
`withMove` can copy-and-increment rather than re-parse; that is an internal optimisation and
does not change the external invariant.

---

### Layer 0 — Board parsing (internal to `Board`)

```
parseBoardState(moves) → { board, colHeights }
```

Called only inside `Board` constructor. `candidate-generator.js`'s `buildBoard` + `getHeights`
are deleted and replaced with `new Board(movestring)`.

---

### Layer 1 — Win detection

```
checkWin(board, row, col, player) → bool
  "Does placing player at (row,col) complete a 4-in-a-row?"
  Checks only the 4 directions × windows through (row, col). O(1).

hasWon(board, player) → bool
  "Does player already have 4-in-a-row anywhere on the board?"
  Full scan. Used for game-over detection only.
  Consolidate the two existing implementations (classifier.js vs candidate-generator.js).
```

Both are free functions. `Board.checkWin` / `Board.hasWon` delegate to them directly.
`hasWon` result is cached per player because it is used in game-over checks that run in loops.

---

### Layer 2 — Threat primitives

These are the bottleneck; everything strategic is built on them.

```
getImmediateThreats(board, colHeights, player) → col[]
  "Which columns let player win on the very next move?"
  Checks only gravity-top cells. O(7). Replaces countWinningThreats.
  Cached per player.

getReachableThreats(board, colHeights, player) → Map<col, row[]>
  "For each column, which row(s) at or above colHeight[col] would win for player if reached?"
  Checks all empty cells reachable from the current gravity top upward.
  O(42). Replaces the duplicated threat-collection blocks in detectUndercut, detectOvercut,
  detectFigure7, and detectJShape.
  Cached per player.

getWinningWindows(board, row, col, player) → Cell[][]
  "Which 4-cell windows would be completed by placing player at (row, col)?"
  Already exists as a private function in detectFigure7. Export it and move it here.
  Not cached (called with varying (row,col)).

getMajorThreatCells(board) → { [key: string]: { rm, rn, ym, yn } }
  Rename buildThreatMap. API unchanged; the name change makes it clear this is a
  board-level primitive, not a pattern detector.
  Cached (result is player-independent).
```

---

### Layer 3 — Position evaluators

Composed entirely from Layer 2 — no direct board loops.

```
hasActiveDoubleThreat(board, colHeights, player) → bool
  Already exists. Rewrite internals to use getImmediateThreats +
  getReachableThreats instead of calling checkWin in its own loops.
  Cached per player.

isT4SameParity(R, Rp) → bool
  R % 2 === Rp % 2

isT5Exception(R, Rp) → bool
  (R === 5 && Rp === 2) || (R === 2 && Rp === 5)

isT2Blocking(currentThreatsInCol, R, Rp) → bool
  "Does player have a threat below Rp that interacts with it via T2?"
  Encodes the three T2 sub-cases. Used by both detectUndercut and detectOvercut.
```

`isT4SameParity`, `isT5Exception`, `isT2Blocking` are pure functions of their arguments — no
board state, no cache needed.

---

### Layer 4 — Pattern detectors

Signature: **all detectors receive `(board: Board, scores?)` instead of `(moves, scores)`**.
They call `board.reachableThreats(player)` etc., which are already cached by the time the
second detector runs.

```
detectZThreat(board, scores) → DetectorResult
detectUndercut(board, scores) → DetectorResult
detectOvercut(board, scores) → DetectorResult
detectFigure7(board, scores)  → DetectorResult
detectJShape(board, scores)   → DetectorResult
detectClaimeven(board, solver) → Promise<DetectorResult>
```

Internally, whenever a detector needs to reason about a hypothetical placement it calls
`board.withMove(col)` rather than mutating arrays. Example:

```
detectUndercut(board, scores):
  threats    = board.reachableThreats(board.currentPlayer)
  oppThreats = board.reachableThreats(board.opponent)
  for col where scores[col] < 0:
    for R in threats[col]:
      Rp = oppThreats[col].find(r => r < R)
      if Rp and not isT4SameParity(R,Rp) and not isT5Exception(R,Rp)
              and (R%2===1 && Rp%2===0 && R===Rp+1):  // T2 sub-case 3
        return matched(...)

detectOvercut(board, scores):
  threats    = board.reachableThreats(board.currentPlayer)
  oppThreats = board.reachableThreats(board.opponent)
  for col where scores[col] > 0:
    for R in threats[col]:
      Rp = oppThreats[col].find(r => r < R)
      if Rp and (isT4SameParity(R,Rp) or isT5Exception(R,Rp)
                 or isT2Blocking(threats[col], R, Rp)):
        return matched(...)
```

The T-rule predicates are named, tested individually, and shared between both detectors.

---

### Layer 5 — Category classifiers (public API)

```
classify(moves, candidateCol, scores) → { tag }
  Constructs new Board(moves) once.
  Passes it to each category check — no internal parseBoardState calls.
  Retains existing category priority order.

classifyAll(moves, scores, solver?) → { [col]: DetectorResult }
  Future entry point for hint generation: one Board instance, all detectors run against it,
  caches are shared across the full pass. Callers (sparring hints, coach LLM prompt)
  consume this instead of calling each detector separately.
```

---

### Consolidated file structure

```
classifier.js
  // --- Board class (wraps Layers 0–3) ---
  class Board
    constructor(movestring)
    checkWin(row, col, player)
    hasWon(player)                       // cached
    immediateThreats(player)             // cached
    reachableThreats(player)             // cached
    winningWindows(row, col, player)
    majorThreatCells()                   // cached
    hasActiveDoubleThreat(player)        // cached
    withMove(col) → Board

  // --- Free functions: Layer 1 ---
  checkWin(board, row, col, player)
  hasWon(board, player)                  ← consolidated from candidate-generator.js

  // --- Free functions: Layer 2 ---
  getImmediateThreats(board, colHeights, player)   ← rename countWinningThreats
  getReachableThreats(board, colHeights, player)   ← NEW
  getWinningWindows(board, row, col, player)        ← promote from detectFigure7
  getMajorThreatCells(board)                        ← rename buildThreatMap

  // --- Free functions: Layer 3 ---
  hasActiveDoubleThreat(board, colHeights, player)
  isT4SameParity(R, Rp)
  isT5Exception(R, Rp)
  isT2Blocking(colThreats, R, Rp)

  // --- Layer 4 ---
  detectZThreat(board, scores)
  detectUndercut(board, scores)
  detectOvercut(board, scores)
  detectFigure7(board, scores)
  detectJShape(board, scores)
  detectClaimeven(board, solver)

  // --- Layer 5 ---
  classify(moves, candidateCol, scores)
  classifyAll(moves, scores, solver?)    ← future
```

`candidate-generator.js` removes its own `buildBoard`, `getHeights`, `hasWon`, `getForcedBlock`
duplicates and constructs a `Board` instance wherever it currently calls those helpers.

---

### Summary of changes vs. current code

| Issue | Fix |
|---|---|
| `parseBoardState` called 4× in `classify` | `new Board(moves)` once; methods share state |
| `detect*` re-parse movestring internally | Accept `Board` instance |
| `hasMajorThreatAt` builds full map for one cell | Remove; callers use `board.majorThreatCells()` or `board.reachableThreats()` |
| Threat collection loop duplicated in undercut/overcut | `board.reachableThreats(player)` — cached, computed once |
| T2/T4/T5 logic duplicated and inverted | `isT4SameParity`, `isT5Exception`, `isT2Blocking` |
| `getWinningWindows` trapped inside `detectFigure7` | Promote to Layer 2 / `Board` method |
| Figure7/JShape re-implement reachable-threat scan | Use `board.reachableThreats(player)` |
| Board mutation + manual undo throughout `classify` and detectors | `board.withMove(col)` returns a new immutable `Board`; mutation+undo pattern eliminated |
| `buildBoard`/`getHeights`/`hasWon` duplicated in candidate-generator.js | Replace with `new Board(movestring)` |
| Cache correctness | Invariant: each cached value equals the free-function result for the constructor movestring. Maintained by immutability: `Board` never mutates its own state after construction. |
