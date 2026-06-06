# Research: Coach Explanation Rebuild (Epic B)

## R1. `preScores` and `score_coached` — current state

**Decision**: Add `score_coached(col) = -preScores[col]` sign flip inline in `buildExplainContext` after `preScores` is loaded. Reuse `preScores` — no new solver calls.

**Finding**: `preScores` is already computed at `index.js:619–622` via `solver.query(movestring)`. `selectContrastMove(preScores, col, board)` at `:624` already identifies the best alternative column. The sign flip is not currently applied — `selectContrastMove` uses raw solver scores (higher raw = better for current player = better for coached player who just moved, which already has the flip built in via negation semantics of "whose-move" scores). However, for the gap computation (`score_coached(B) - score_coached(A)`), the flip must be explicit.

**Alternatives considered**: Adding a new solver call for each column with the post-move perspective — rejected because FR-006 explicitly prohibits new solver calls.

---

## R2. `opponentResponseMovestring` — current state

**Decision**: Reuse `opponentResponseMovestring` already computed at `index.js:657–665` via `getOpponentResponseMs`. Available for Type 2 detection without new solver calls.

**Finding**: `getOpponentResponseMs(postMovestring, postBoard, opponentWinCols, perspective, solver)` is called in the current `buildExplainContext` and stores the result. It is the board state after move A + opponent's optimal reply. This is the "critical position" for Type 2 classification.

---

## R3. `collectLeaves` — current return shape and change required

**Decision**: Add `groups: GroupRecord[]` to all terminal leaf return objects. The aggregation is extended to maintain a `Map<string, AggregatedGroup>` keyed by `canonicalCells:owner`. Existing `outcomes` / `patterns` / `totalLeaves` / `timing` outputs are unchanged.

**Finding**: Terminal leaves at `explainSimulate.js:199–206` return `[{ leafType, patterns: null, currentPlayer }]`. The winning group is discarded. `aggregateLeaves` counts terminal leaves only as scalar outcome counters (`wonByPerspective`, `wonByOpponent`, `draws`).

**GroupRecord cell format**: Wire format `c${col+1}r${row+1}` (1-indexed) is used throughout the annotation layer (`zoneParser.js`, `annotatedText.js`). Using the same format in GroupRecord makes the allowedSet buildable without coordinate conversion.

**Winning group extraction**: `board.hasWon(player)` returns boolean only. A helper `findWinningGroup(board, player)` must scan all 4-windows (~70 windows for a 7×6 board) to find the first completed line. This is O(70) — negligible.

**Draw threat owner derivation**: At a draw leaf, for each 4-window with 3 discs of one color and 1 empty cell, the owner is the player who holds 3 discs. `board.board[row][col]` gives the disc color (1=Red/Green, 2=Yellow/Grey); perspective is passed into `collectLeaves`.

---

## R4. Board class — available methods (confirmed)

**Decision**: No new board utilities needed. Existing methods cover all required operations.

**Confirmed available**:
- `board.hasWon(player)` — Type 1 detection
- `board.colHeights[col]` — Type 3 parity computation, landing row calculation
- `board.board[row][col]` — occupant lookup for allowedSet
- `board.withMove(col)` — post-A board construction
- `getMajorThreatCells(board)` — Type 2 and Type 3 detection
- `getImmediateThreats(board.board, board.colHeights, player)` — Type 1 detection
- `detectFigure7(board, scores)` — Type 2 named-scaffold check
- `detectJShape(board, scores)` — Type 2 named-scaffold check

**Import audit**: `getMajorThreatCells` is defined in `classifier.js`. Its import in `index.js` needs verification; it may need to be added to the import list.

---

## R5. KB detectors for Type 2 — named-scaffold check without new solver calls

**Decision**: Apply `detectFigure7` and `detectJShape` to the critical-position board with `ZERO_SCORES = [0,0,0,0,0,0,0]` as dummy scores. Document this as a code comment.

**Rationale**: `detectFigure7` and `detectJShape` check structural patterns (presence of specific disc configurations). Their `scores` parameter is used for filtering by solver quality — passing zero scores means all structurally-matching columns pass the score filter, which is a conservative (over-detecting) behavior appropriate for classification. The key structural match (3-in-a-row configurations forming the J or Figure-7 shape) is independent of scores.

**Alternatives considered**: Making a new solver call for the critical position to get real scores — rejected because FR-012 explicitly prohibits new solver calls ("Reuse `opponentResponseMovestring` — no new solver calls").

---

## R6. `allowedSet` — groups from simulation vs. KB parity entries

**Decision**: `allowedSet` is built from simulation groups only. KB parity entries inform the prompt text but do not add `allowedSet` entries.

**Rationale**: `allowedSet` is consumed by the gate for mechanical cell-level checks. KB entries describe parity rules in prose — they don't enumerate specific 4-windows. Mixing them would make the allowed set unpredictable and hard to test. The grounding contract (what the LLM may cite) is enforced via `allowedSet`; the explanation quality (why those cells matter) is enforced via the KB section in the prompt.

---

## R7. Type 3 — parity flip detection (simplified)

**Decision**: Type 3 rule simplifies to: `getMajorThreatCells(postABoard)` non-empty AND the played column `A` is within ±1 of any major threat column.

**Derivation**: Placing a disc in column A reduces `colHeights[A]` by 1 (the empty count decreases by 1, flipping parity). No other column's parity changes. So "at least one column's empty-cell count changes parity" is equivalent to "the played column A has its parity flipped" — which is always true. The real constraint is condition (3): the parity-flipped column (always A) must be same or adjacent (±1) to a major threat column. This is the complete Type 3 test.

**Frozen sentence slots**: `colA` = played column (A+1, 1-indexed), `colX` = parity-flipped column (always A, so also A+1), `rowR` = `ROWS - board.colHeights[A]` after placing (the landing row, 1-indexed). `playerLabel`: if the major threat is the coached player's threat, use 'you'; if it's the opponent's, use 'your opponent'.

---

## R8. DELETE list callsite audit (pre-confirmed)

**Decision**: All DELETE list functions are safe to remove after `buildExplainContext` is rebuilt. No live callsites on Tier-1 path, in-game coach, lessons, or challenges.

**Confirmed callsites**:
- `computeDeltaTable`: `index.js:637` (inside `buildExplainContext` only)
- `claimevenNarration`: `index.js:676` (inside `buildExplainContext` only)
- `zThreatNarration`: `index.js:680` (inside `buildExplainContext` only)
- `figure7Narration`: `index.js:684` (inside `buildExplainContext` only)
- `jShapeNarration`: `index.js:691` (inside `buildExplainContext` only)
- `buildExplainPrompt`: `index.js:702` (inside `buildExplainContext` only)

The Tier-1 path (`/api/explain-move`, `index.js:436`) uses `buildExplainContext` as well — wait, let me re-check. Line 436 is the old `/api/explain-move` endpoint which uses a different path. Lines 885+ use `buildExplainContext` in the newer endpoint. Grep at `index.js:885` confirms `buildExplainContext` is called in the `/api/explain-move-llm` handler only.

**Tier-1 one-liner path** (`/api/explain-move`): uses `buildExplainContext` per `index.js:885`. This IS the same function being rebuilt. After the rebuild, it remains on the call path — the function's behavior changes, not its presence. No DELETE list function is called from the Tier-1 endpoint independently.

**Note**: `PATTERN_NAMES` array in `llmCoachHelpers.js` is used only by `computeDeltaTable`. Safe to delete with it.

---

## All NEEDS CLARIFICATION items — resolved

All unknowns were resolved through code inspection. No external research required.

| Item | Status |
|------|--------|
| `preScores` / `score_coached` existence | Resolved — R1 |
| `opponentResponseMovestring` existence | Resolved — R2, confirmed at index.js:657 |
| `collectLeaves` current shape | Resolved — R3, patterns:null at terminals |
| Board utilities availability | Resolved — R4, all present |
| KB detector solver dependency | Resolved — R5, ZERO_SCORES safe for classification |
| `allowedSet` source of truth | Resolved — R6, simulation groups only |
| Type 3 parity simplification | Resolved — R7 |
| DELETE list safety | Resolved — R8, confirmed single callsite per function |
