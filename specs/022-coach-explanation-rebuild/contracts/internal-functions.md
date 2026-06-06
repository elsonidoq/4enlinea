# Internal Function Contracts: Coach Explanation Rebuild (Epic B)

These are server-side internal contracts. None are HTTP endpoints.

---

## `findWinningGroup(board, player)` — new helper in `explainSimulate.js`

```js
/**
 * Finds the first 4-cell winning line for `player` on `board`.
 * Returns null if player has no winning line (should not occur on won leaves).
 *
 * @param {Board} board
 * @param {number} player  1 or 2
 * @returns {string[]|null}  4 wire-format coords e.g. ["c3r2","c4r2","c5r2","c6r2"]
 */
function findWinningGroup(board, player)
```

**Behavior**: Scans all horizontal, vertical, and diagonal 4-windows on the 7×6 board. Returns the first window where all 4 cells are occupied by `player`. Cell coordinates converted to 1-indexed wire format `c${col+1}r${row+1}`.

**Error behavior**: Returns null if no winning group found (caller must guard). In practice only called when `board.hasWon(player)` is true.

---

## `collectLeaves` — modified return shape in `explainSimulate.js`

Existing function, extended output.

```js
// Return type (per leaf object):
{
  leafType: 'won_by_perspective'|'won_by_opponent'|'draw'|'depth_limit'|'intermediate',
  patterns: Array|null,
  currentPlayer: number,
  ms?: string,
  groups: GroupRecord[],  // NEW — empty [] for non-terminal leaves; populated at terminals
}
```

**Backward compatibility**: `groups` is additive. Callers that ignore it are unaffected.

---

## `aggregateLeaves` — modified return value in `explainSimulate.js`

```js
// New field added to existing return object:
{
  patterns: object,           // existing
  outcomes: object,           // existing
  groups: Map<string, AggregatedGroup>,  // NEW — keyed by "canonicalCells:owner"
  totalLeaves: number,        // existing (now also used as denominator for group freq)
  timing: object              // existing
}
```

**`total_leaves` definition**: `wonByPerspective + wonByOpponent + draws + perspectiveLeaves + opponentLeaves + depthLimitLeaves`. All leaves, regardless of `currentPlayer`.

---

## `classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol)` — new in `llmCoachHelpers.js`

```js
/**
 * Deterministic type classifier. Priority order: Type 1 → 2 → 3 → 4 (first match wins).
 * No solver calls.
 *
 * @param {Board} preMoveBoard        Board before move A
 * @param {Board} postABoard          Board after move A (board.withMove(col))
 * @param {string|null} criticalPositionMs  Movestring after A + opponent's reply; null if unavailable
 * @param {number} perspective        1 or 2 (coached player)
 * @param {number} playedCol          Column that was played for move A (0-indexed)
 * @returns {ExplainTypeResult}
 */
export function classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol)
```

**Type 1 detection**: 
- Player immediate threats on pre-A board: `getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, perspective).length > 0`
- Opponent immediate threats on pre-A board: `getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, 3-perspective).length > 0`
- Either condition → Type 1

**Type 2 detection** (only if `criticalPositionMs != null`):
- `criticalBoard = new Board(criticalPositionMs)`
- `opponentThreatWindows = findMajorThreatWindows(criticalBoard, perspective).filter(g => g.owner === 'opponent')`
- `opponentThreatWindows.length >= 2` → Type 2
- OR `detectFigure7(criticalBoard, ZERO_SCORES).matched` → Type 2
- OR `detectJShape(criticalBoard, ZERO_SCORES).matched` → Type 2
- `ZERO_SCORES = [0,0,0,0,0,0,0]` (avoids solver call; conservative over-detection acceptable)

**Type 3 detection**:
- `threatWindows = findMajorThreatWindows(postABoard, perspective)`
- `threatWindows.length === 0` → skip to Type 4
- Build `threatCols` set: collect unique columns from every cell `c${N}r${M}` in every threat window (extract `N-1` for 0-indexed column).
- `Math.abs(playedCol - threatCol) <= 1` for any `threatCol` in `threatCols` → Type 3
- `parityFlipData`: `colA = playedCol+1` (1-indexed for display), `colX = playedCol+1` (always same as `colA` — only the played column's empty-cell count changes; per R7), `rowR = ROWS - preMoveBoard.colHeights[playedCol]` (landing row after placing, 1-indexed), `playerLabel`: `'you'` if any threat window has `owner='player'`, else `'your opponent'`.

**Type 4**: default return.

---

## `selectTopGroups(aGroupMap, bGroupMap)` — new in `llmCoachHelpers.js`

```js
/**
 * M3: rank by absolute completed_freq, take top 5 per branch, merge (≤10).
 *
 * @param {Map<string, AggregatedGroup>} aGroupMap  groups from A-branch simulation
 * @param {Map<string, AggregatedGroup>} bGroupMap  groups from B-branch simulation
 * @returns {AggregatedGroup[]}  merged list, ≤10 entries
 */
export function selectTopGroups(aGroupMap, bGroupMap)
```

**Selection**: Sort each Map's values by `completed_freq` descending; take first 5 keys per branch. Union the key sets; fetch from both Maps (A and B) to get both branch frequencies for each selected group.

**Discard logging**: `console.debug('[explain] discarded N groups (freq range [min–max]); kept 5 per branch.')` when discarded > 0.

**Merged group shape** (for context block / allowedSet):
```js
{
  cells: string[],
  owner: 'player'|'opponent',
  aCompleted: number,    // completed_freq from A branch (0 if not in A)
  aDraw: number,         // draw_freq from A branch (0 if not in A)
  bCompleted: number,    // completed_freq from B branch (0 if not in B)
  bDraw: number,         // draw_freq from B branch (0 if not in B)
}
```

---

## `buildAllowedSet(groups, board, perspective)` — new in `llmCoachHelpers.js`

```js
/**
 * Builds the closed allowed-location set for the gate.
 *
 * @param {Array} groups        Output of selectTopGroups
 * @param {Board} board         Post-A board (for occupant lookup)
 * @param {number} perspective  1 or 2 (coached player)
 * @returns {AllowedSetEntry[]}
 */
export function buildAllowedSet(groups, board, perspective)
```

**CONCRETE-ELIGIBLE test**: For group with `owner='player'`: count cells where `board.board[row-1][col-1] === perspective`. For `owner='opponent'`: count cells where `board.board[row-1][col-1] === (3-perspective)`. Threshold ≥ 2 (D2). Coached-player disc in an opponent group does NOT count.

**Cell parsing**: Wire format `c${N}r${M}` → `col = N-1`, `row = M-1` (both 0-indexed internally).

**ABSTRACT-ONLY parity**: `key completing cell` = first empty cell in the group (scan cells, find `board.board[row-1][col-1] === 0`). Its 1-indexed row R: `parity = R % 2 === 0 ? 'even' : 'odd'` (wire format is 1-indexed, so odd wire row = odd parity row for Red's perspective per `coach_explanation_principles.md`).

---

## `validateAnnotation(explanation, board, allowedSet?)` — extended in `annotationGate.js`

```js
/**
 * Extended signature. allowedSet is optional.
 * When absent/null: existing Epic A behavior (board-only checks only).
 * When provided: also runs strong-P5 check.
 *
 * @param {string} explanation
 * @param {Board} board
 * @param {AllowedSetEntry[]|null} [allowedSet]
 * @returns {{ valid: boolean, failures: string[] }}
 */
export function validateAnnotation(explanation, board, allowedSet = null)
```

**Backward-compat**: Callers passing only `(explanation, board)` continue to work unchanged.

---

## `checkP5Strong(zones, allowedSet)` — new in `annotationGate.js`

```js
/**
 * Strong-form P5: zone must reference only allowed locations.
 *
 * @param {Array<{spec: string, innerText: string}>} zones
 * @param {AllowedSetEntry[]} allowedSet
 * @returns {string[]}  failure codes: 'P5strong:tg', 'P5strong:cell_not_allowed:SPEC', 'P5strong:col_not_allowed:SPEC'
 */
export function checkP5Strong(zones, allowedSet)
```

**Zone rules** (per FR-032):
- `tg`: always fails → `'P5strong:tg'`
- `col\d+`: 1-indexed wire column N → 0-indexed col = N-1. Passes if any allowedSet entry has: (CONCRETE-ELIGIBLE and a cell in that column) OR (ABSTRACT-ONLY and `entry.col === col-1`). Fails → `'P5strong:col_not_allowed:colN'`
- `c\d+r\d+`: passes if any CONCRETE-ELIGIBLE entry's `cells` includes this coord. ABSTRACT-ONLY entries never satisfy. Fails → `'P5strong:cell_not_allowed:SPEC'`
- `cells:...`: all listed cells must appear in CONCRETE-ELIGIBLE entries' `cells` lists. Fails → `'P5strong:cell_not_allowed:SPEC'`
- `row\d+`: 1-indexed wire row R → 0-indexed row = R-1. Passes if any CONCRETE-ELIGIBLE entry has a cell `c${N}r${R}` for any N. Fails → `'P5strong:cell_not_allowed:rowN'`
