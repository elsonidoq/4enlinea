# Research: Classifier Board Refactor (009)

All design questions resolved from existing code and spec. No external unknowns.

---

## Decision 1 — `checkWin` does not read `board[row][col]`

**Decision**: `getReachableThreats` and `getImmediateThreats` are fully mutation-free.

**Rationale**: `checkWin(board, row, col, player)` starts `count = 1` (the hypothetical piece) and only reads `board[r±dr][c±dc]` for `d = 1..3`. It never reads `board[row][col]`. Therefore calling it on an empty cell correctly answers "would placing `player` here win?" without placing the piece first. This eliminates the mutation+undo pattern from all threat-scanning free functions.

**Consequence**: FR-002 (Board immutability) is achievable without copying the board array inside `getReachableThreats`. The free functions do direct reads only.

---

## Decision 2 — `withMove` is needed only in two places

**Decision**: Only `classify()` (for Cat 1/2/3/5) and `detectFigure7` (for the completing-move check) require `board.withMove(col)`. All other detectors use `board.reachableThreats(player)` directly.

**Rationale**: `detectZThreat`, `detectUndercut`, `detectOvercut`, and `detectJShape` only need to know which cells are already winning threats — not the state after a hypothetical move. `detectFigure7` needs to simulate placing `comp.col` to collect threats in the resulting position. `classify()` needs to simulate `candidateCol` for each category check.

**Performance**: `classify()` calls `withMove` at most ~8 times (1 for Cat1, 1 for Cat3, 1 + up to 6 for Cat2, 1 for Cat5). `detectFigure7` calls `withMove` at most once per matching template (in practice 0–3 times). Each `withMove` is O(42). Negligible.

---

## Decision 3 — `getReachableThreats` scan range

**Decision**: Iterate `row` from `colHeights[col]` to `ROWS-1` inclusive per column. No `board[row][col] !== 0` guard needed (cells below `colHeights[col]` are occupied; cells at/above are always empty by board invariant).

**Rationale**: The current `detectUndercut` scans all rows 0..5 with an `!== 0` guard. Since occupied cells are precisely those at `row < colHeights[col]`, starting from `colHeights[col]` is equivalent and avoids the guard.

---

## Decision 4 — `getForcedBlock` in candidate-generator.js is dead code

**Decision**: Remove without replacement. No callers exist in the file.

**Rationale**: `grep 'getForcedBlock' connect-four/server/candidate-generator.js` shows the function definition but no call sites. The forced-block detection for puzzle generation uses `evaluatePredicate` (via the old category path) or `classify()` directly.

---

## Decision 5 — `countWinningThreats` rename strategy

**Decision**: Rename to `getImmediateThreats` in `classifier.js`. Update all callers in `candidate-generator.js` simultaneously. Do not export an alias.

**Rationale**: `countWinningThreats` is imported by `candidate-generator.js` (for `isClean`). The rename is one-step with an import update. No external callers outside these two files. Aliases add noise.

---

## Decision 6 — `buildThreatMap` rename strategy

**Decision**: Rename to `getMajorThreatCells` in `classifier.js`. Update `hasMajorThreatAt` (which is removed) and `hasActiveDoubleThreat` (which is rewritten). No other callers.

**Rationale**: `buildThreatMap` is not imported by `candidate-generator.js`. Only internal callers exist. One-step rename is clean.

---

## Decision 7 — `hasWon` free export replaces local `hasWon` in candidate-generator.js

**Decision**: Add `export function hasWon(board, player)` to `classifier.js`. The implementation is the same as the local `hasWon` in `candidate-generator.js` (full-board scan). `candidate-generator.js` removes its local definition and imports the export.

**Rationale**: Both implementations are identical full-board scanners. The `classifier.js` version consolidates both.

---

## Decision 8 — `parseBoardState` stays exported; `runClaimevenSimulation` keeps using it

**Decision**: `parseBoardState` remains a free export from `classifier.js`. The `runClaimevenSimulation` loop continues calling `parseBoardState(currentMs)` on each step because each step is a different position.

**Rationale**: The Board class is for sharing a single position across multiple detectors. The simulation loop advances through many positions sequentially. Using `new Board(currentMs)` in the loop is equivalent but adds no value over `parseBoardState`.

---

## Decision 9 — `classifyAll` return shape

**Decision**: `classifyAll(moves, scores, solver?) → Promise<Array<{tag: string, detectorName: string, result: DetectorResult}>>` — an array, one entry per detector in category-priority order.

**Rationale**: The spec says "returns an array of `DetectorResult` objects (one per detector, in the same order as the detector list in `classify()`)". Array is simpler than a keyed object and matches the detector-list ordering.

---

## Decision 10 — candidate-generator.js `isClean` uses `parseBoardState` directly

**Decision**: `isClean(category, ms)` in candidate-generator.js continues to call `parseBoardState(ms)` to get mutable `board` and `colHeights` for passing to `getImmediateThreats` and `hasActiveDoubleThreat`. It does NOT construct a `Board`.

**Rationale**: The function is called once per position check, not inside a multi-detector pass. `parseBoardState` is still exported. Constructing a `Board` here gains nothing (no caching benefit) and would require updating the free-function calls to Board-method calls for no correctness benefit.
