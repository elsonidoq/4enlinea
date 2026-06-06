# Tasks: Coach Explanation Rebuild (Deep Reveal Epic B)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/internal-functions.md](./contracts/internal-functions.md)

## Task Dependency Graph (summary)

```
T01a ──┬─→ T01 ──→ T02 ──→ T03
       │
       ├─→ T06 ──→ T14 ──→ T07
       │
       ├─→ T09b ──────────────────────┐
       │                              │
T04 ──────────────────────────────┐   │
       │                          │   │
T08 (after T02) ──→ T09 ──→ T10 ─┤   │
                                  │   │
T11, T12, T13 (after T10/T14) ────┤   │
                                  │   │
                                  ▼   ▼
                              T15 (rebuild buildExplainContext)
                                  │
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
              T05            T16 (can start     T18 (after T15)
              (after T15)    after T09)         T19 (after T15/T16/T18)
                                  │               T20 (after T15/T16/T17)
                                  ▼
                              T17 (after T16)
```

**Parallelizable groups**:
- **Group A** (serial): T01a → T01 → T02 → T03
- **Group B** (after T01a): T04 || T06→T14→T07
- **Group C** (after T02): T08→T09→T10; T09b (parallel with T09); T11,T12,T13 (parallel after T10/T14)
- **Group D** (after T09): T16→T17 (can start before T15)
- T15 waits for: T04, T06, T08, T09, T09b, T10, T11, T12, T13
- T18, T19, T20 are final cleanup/hardening tasks

---

## Phase A: Simulation leaf data (prerequisite — must be first)

### T01a — Write `findMajorThreatWindows(board, perspective)` helper

**File**: `connect-four/server/llmCoachHelpers.js` (new export)

**Why here and not `explainSimulate.js`**: Needed in T06 (llmCoachHelpers) and T16 (annotationGate imports from llmCoachHelpers); a single location avoids circular imports.

**Signature**:
```js
export function findMajorThreatWindows(board, perspective)
// board: Board instance
// perspective: 1=Red, 2=Yellow (coached player's color)
// Returns: Array<{cells: string[], owner: 'player'|'opponent'}>
```

**Behavior**:
- Scan all 4-windows (horizontal, vertical, diagonal-up, diagonal-down) across the full 7×6 board — same window set as `getMajorThreatCells`.
- A window qualifies if it has exactly 3 discs of one color and 1 empty cell.
- `owner`: if the 3 discs match `perspective` → `'player'`; if they match `3-perspective` → `'opponent'`.
- Cell format: wire format `c${col+1}r${row+1}` (1-indexed) for ALL cells in the window (occupied cells included).
- Return value is an array — empty array when no windows qualify.
- Deterministic ordering: iterate columns outer, rows inner, directions in a fixed order so callers get stable output.

**NOT to use**: `getMajorThreatCells` returns a per-cell flag map `{rm, rn, ym, yn}` — it cannot yield 4-cell group objects with owners. This helper is the correct tool for all group-level major-threat operations.

**Acceptance**: Call on a board with a known major threat and verify the returned array contains a matching `{cells, owner}` object. Call on the `34` board and verify empty array (no major threats).

---

### T01 — Extend `collectLeaves` to record winning groups and draw threat groups

**File**: `connect-four/server/explainSimulate.js`

**Changes**:
1. **Add `findWinningGroup(board, player)` helper** (internal to `explainSimulate.js` — used only within `collectLeaves`):
   - Scan all 4-windows (same set as T01a/gMajorThreatCells). Return the first window where all 4 cells are occupied by `player`.
   - Returns `string[]` (4 wire-format coords, e.g. `["c3r2","c4r2","c5r2","c6r2"]`) or `null`.
   - Cell format: wire format `c${col+1}r${row+1}` (1-indexed) to match `allowedSet.cells` format.

2. **Modify `collectLeaves` terminal-leaf handling** (at `explainSimulate.js:199–206`):
   - At `wonByPerspective` leaves: call `findWinningGroup(board, perspective)`. If found, record `{ cells, owner: 'player', type: 'completed' }`. Set `groups: [group]`.
   - At `wonByOpponent` leaves: call `findWinningGroup(board, opponent)`. If found, record `{ cells, owner: 'opponent', type: 'completed' }`. Set `groups: [group]`.
   - At `draw` leaves: import and call `findMajorThreatWindows(board, perspective)` (from T01a in `llmCoachHelpers.js`). Record each returned window as `{ cells, owner, type: 'draw_threat' }`. Set `groups: [...]` (may be empty).
   - Non-terminal leaves (depth_limit, intermediate): set `groups: []` explicitly.

3. **Return shape addition**: Every leaf object now includes `groups: GroupRecord[]`.

4. **Import**: Add `import { findMajorThreatWindows } from './llmCoachHelpers.js';` at top of `explainSimulate.js`.

**Acceptance**: Unit test in T03 asserts won leaves carry `groups` with exactly one `completed` entry; draw leaves carry `draw_threat` entries.

---

### T02 — Extend `aggregateLeaves` to produce per-group frequency table and wire `groups` through `explainSimulate`

**File**: `connect-four/server/explainSimulate.js`

**Changes to `aggregateLeaves`**:
1. Add a `groups` Map (`Map<string, AggregatedGroup>`) initialized to empty.
2. Key construction: `canonicalCells = cells.slice().sort().join(',')` then key = `${canonicalCells}:${owner}`.
3. In the leaf loop (after the existing outcome counters), for each leaf: iterate `leaf.groups`. For each group:
   - Construct key as above.
   - If key not in map: initialize `{ cells, owner, completed_freq: 0, draw_freq: 0 }`.
   - If `group.type === 'completed'`: increment completed count for that key.
   - If `group.type === 'draw_threat'`: increment draw count for that key.
4. After the leaf loop, compute `total_leaves = wonByPerspective + wonByOpponent + draws + perspectiveLeaves + (count of non-perspective depth_limit/intermediate leaves)`. NOTE: the existing `perspectiveLeaves` counter is still used for pattern ratios; this new `total_leaves` is a separate denominator for group frequencies.
5. Convert counts to frequencies: for each map entry, `completed_freq = completedCount / total_leaves`, `draw_freq = drawCount / total_leaves`.
6. Return the Map as a new field `groups` on the existing return object: `{ patterns, outcomes, groups: Map<string, AggregatedGroup>, totalLeaves, timing }`.

**Changes to `explainSimulate` wrapper** (the public exported function at `explainSimulate.js:376`):
1. Destructure `groups` from the `aggregateLeaves` result.
2. Return `groups` alongside existing fields: `{ patterns, outcomes, totalLeaves, timing, groups }`.

**Discard logging note**: The M3 discard logging is NOT done here — it belongs to `selectTopGroups` in T08. The caller is responsible.

**Acceptance**: T03 unit tests assert `explainSimulate(...).groups` is a `Map` with correctly-keyed `AggregatedGroup` entries.

---

### T03 — Unit tests for new simulation output

**File**: `connect-four/server/explainSimulate.test.js` (new file)

**Test framework**: `node:test` + `node:assert/strict` (project convention).

**Tests**:
1. **Won leaf produces `groups`**: Simulate a movestring that ends in a win within the search depth. Assert at least one leaf has `groups` with a `completed` entry whose `cells` match the winning line.
2. **Draw leaf produces `groups`**: Simulate a position that reaches a draw. Assert draw leaves produce `groups` with `draw_threat` entries for every major threat on the board.
3. **`total_leaves` denominator**: Assert `total_leaves` equals the sum of won + draw + all depth-limit leaves (not just perspective-to-move).
4. **Separate records for different owners**: Assert that the same 4-window with owner `'player'` and owner `'opponent'` produces two separate Map entries.
5. **Sparse fixture**: Use movestring `34` (2 discs) — assert simulation runs without errors and returns the expected `groups` shape (likely empty for such a sparse position).

**Fixture source**: Use movestring `34` and a known near-terminal position from the DB. All fixtures from spec movestrings or `llm_feedback` DB rows — no random boards.

---

## Phase B: Step 0 — branch by A's quality

### T04 — Add `score_coached` computation and all-moves-equal short-circuit

**File**: `connect-four/server/llmCoachHelpers.js` (new exported helper function)

**New function**: `checkAllMovesEqual(preScores, board)`
```js
/**
 * Returns { isSettled, allMovesEqual } where:
 * - allMovesEqual: true if all legal columns share the same score_coached value
 * - isSettled: allMovesEqual AND all raw scores are zero (genuinely decided/drawn)
 *
 * @param {number[]} preScores  raw solver scores (sign = current-player perspective)
 * @param {Board} board
 * @returns {{ isSettled: boolean, allMovesEqual: boolean }}
 */
export function checkAllMovesEqual(preScores, board)
```
- Compute legal columns: `colHeights[c] < ROWS`.
- `scoreCoached(col) = -preScores[col]`.
- `allMovesEqual`: every legal column has the same `scoreCoached`.
- `isSettled`: `allMovesEqual && legalCols.every(c => preScores[c] === 0)`.

**Also in this function or a companion export**:
```js
export function getGapAndFraming(preScores, col, contrastCol)
```
- `gap = scoreCoached(contrastCol) - scoreCoached(col)` (positive = B better, negative = A optimal).
- `inverted = scoreCoached(col) >= scoreCoached(contrastCol)`.
- Sign-change override (FR-017): if `Math.sign(preScores[col]) !== Math.sign(preScores[contrastCol])`, force the gap bucket upward. Return `{ gap, inverted, forceBucket: 'moderate'|'large'|null }`.
- Gap buckets (FR-016): small = gap ≤ 3 | moderate = 4–9 | large = ≥ 10. These apply only on the standard (non-inverted) path. The inverted path uses the ladder from FR-008.

**Integration note**: This function must be imported and called in `buildExplainContext` (T15). It does NOT modify `index.js` directly — T04 only creates the helper. T15 wires it in.

**Acceptance**: Unit test in T05 asserts `isSettled=true` for a genuinely settled position; `isSettled=false` for a live opening like `34`.

---

## Phase C: Type classifier

### T06 — Implement `classifyExplanationType`

**File**: `connect-four/server/llmCoachHelpers.js` (new export)

**Signature**:
```js
export function classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol)
```

**Imports needed**:
- `getImmediateThreats`, `detectFigure7`, `detectJShape` from `classifier.js`
- `findMajorThreatWindows` from `llmCoachHelpers.js` (T01a)
- `Board` from `classifier.js`

**Classification logic** (priority order, first match wins):

**Type 1** (FR-011):
- `playerThreats = getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, perspective)`
- `opponentThreats = getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, 3 - perspective)`
- If `playerThreats.length > 0 || opponentThreats.length > 0` → return `{ type: 'type1' }`.
- Do NOT call `board.hasWon()` — the game had not ended before move A (server accepted the move), so it is always false.

**Type 2** (FR-012):
- Guard: if `criticalPositionMs == null`, skip to Type 3.
- `criticalBoard = new Board(criticalPositionMs)`.
- `opponentThreatWindows = findMajorThreatWindows(criticalBoard, perspective).filter(g => g.owner === 'opponent')`.
- If `opponentThreatWindows.length >= 2` → return `{ type: 'type2' }`.
- OR: `detectFigure7(criticalBoard, ZERO_SCORES).matched` → return `{ type: 'type2' }`.
- OR: `detectJShape(criticalBoard, ZERO_SCORES).matched` → return `{ type: 'type2' }`.
- `ZERO_SCORES = [0,0,0,0,0,0,0]` — avoids new solver call (per plan R5 decision). The detectors use scores only for threat-type filtering, which doesn't affect structural match detection. Document this as a code comment.

**Type 3** (FR-013, simplified per plan R7):
- `threatWindows = findMajorThreatWindows(postABoard, perspective)`.
- If `threatWindows.length === 0` → skip to Type 4.
- Build set of columns from threat windows: collect `col` from each cell in each window.
- If `playedCol` is same as or adjacent to (±1) any column in that set → return `{ type: 'type3', parityFlipData: { colA: playedCol+1, colX: playedCol+1, rowR: ROWS - preMoveBoard.colHeights[playedCol], playerLabel } }`.
- `playerLabel`: if any threat window has `owner === 'player'` → `'you'`; else `'your opponent'`. Logic: the parity story is about whoever owns the major threat.
- `rowR` is 1-indexed.

**Type 4** (default):
- Return `{ type: 'type4' }`.

**IMPORTANT**: Classification must NOT call `getMajorThreatCells` — use `findMajorThreatWindows` exclusively for all group-level threat detection.

**No solver calls**: The classifier uses only board state, `findMajorThreatWindows`, `getImmediateThreats`, and sync KB detectors. Zero solver calls.

**Acceptance**: T07 unit tests.

---

### T14 — Extract parity flip data from Type 3 classifier path

**File**: Same as T06 (`connect-four/server/llmCoachHelpers.js`)

**Change**: Modify `classifyExplanationType` (implemented in T06) so that when it returns Type 3, the return value includes `parityFlipData`:
```js
{ type: 'type3', parityFlipData: { colA, colX, rowR, playerLabel } }
```
For other types: `{ type: 'type1'|'type2'|'type4' }`.

**`parityFlipData` fields**:
- `colA`: the played column, 1-indexed (for user display).
- `colX`: the parity-flipped column, 1-indexed. Per R7, this is always the same as `colA` (only the played column's empty-cell count changes between pre-A and post-A board; placing in `colA` decrements its empty count by 1, flipping parity).
- `rowR`: `ROWS - preMoveBoard.colHeights[playedCol]`. The landing row after placing in `colA`, 1-indexed.
- `playerLabel`: `'you'` or `'your opponent'` — whose parity story this is. Determined by inspecting who owns the major threat windows found in the Type 3 check.

**Acceptance**: T07 unit test for Type 3 asserts `parityFlipData` is present and fields have correct values.

---

### T07 — Unit tests for type classifier

**File**: `connect-four/server/llmCoachHelpers.test.js` (new file)

**Test framework**: `node:test` + `node:assert/strict`.

**Tests** (SC-003: ≥1 fixture per type):
1. **Type 1 fixture**: A position where the player missed an immediate winning move. Assert `classifyExplanationType` returns `{ type: 'type1' }`.
2. **Type 2 fixture**: A position with ≥2 simultaneous opponent major threats in the critical position. Assert returns `{ type: 'type2' }`.
3. **Type 2 fixture (named scaffold)**: A position where `detectFigure7` or `detectJShape` matches on the critical board. Assert returns `{ type: 'type2' }`.
4. **Type 3 fixture**: A position satisfying all three conditions of FR-013. Assert returns `{ type: 'type3', parityFlipData: {...} }` with correct `colA`, `colX`, `rowR`, `playerLabel`.
5. **Type 4 fixture**: A sparse early-game position (e.g., `34`). Assert returns `{ type: 'type4' }`.
6. **Type 1 before simulation**: Assert the classifier does NOT call any solver function (Type 1 uses only `getImmediateThreats` which is a pure board scan).
7. **Fallthrough order**: Assert that a position matching multiple type criteria resolves to the first match (Type 1 > 2 > 3 > 4).
8. **FR-008/FR-016 mutual exclusion** (added per critique resolution): For a position where the user's column A has the highest `score_coached` of all legal moves (optimal-A = inverted path), assert the prompt contains inverted-framing text (`"Your move is solid"` or `"Your move is the strongest here"`) and does NOT contain standard-ladder phrasing (`"B is preferable"` or `"slightly more principled"`). This proves the inverted and standard ladders are never consulted for the same position.

**Fixture source**: Source fixtures from spec movestrings or `llm_feedback` DB rows. No random boards.

---

## Phase D: Group selection and `allowedSet` construction

### T08 — Implement `selectTopGroups` (M3)

**File**: `connect-four/server/llmCoachHelpers.js` (new export)

**Signature**:
```js
export function selectTopGroups(aGroups, bGroups)
// aGroups: Map<string, AggregatedGroup> from A-branch simulation (userResult.groups)
// bGroups: Map<string, AggregatedGroup> from B-branch simulation (contrastResult.groups)
// Returns: Array<{cells, owner, aCompleted, aDraw, bCompleted, bDraw}>
```

**Algorithm**:
1. Convert each Map to array of `[key, {cells, owner, completed_freq, draw_freq}]`.
2. Sort A array by `completed_freq` descending; take first 5.
3. Sort B array by `completed_freq` descending; take first 5.
4. Union the key sets (by `canonicalCells:owner` key).
5. For each key in the union: build merged record:
   ```js
   {
     cells: cells from either Map (identical for same key),
     owner: 'player'|'opponent',
     aCompleted: aMap.get(key)?.completed_freq ?? 0,
     aDraw: aMap.get(key)?.draw_freq ?? 0,
     bCompleted: bMap.get(key)?.completed_freq ?? 0,
     bDraw: bMap.get(key)?.draw_freq ?? 0,
   }
   ```
6. **Discard logging**: If total groups in either Map > 5, compute min/max `completed_freq` of discarded groups and log: `console.debug('[explain] discarded N groups (freq range [min–max]); kept 5 per branch.')`.

**Returns**: Array of merged group records (≤ 10 entries).

**Acceptance**: Unit test with mock Maps asserting top-5 selection and merge behavior.

---

### T09 — Implement `buildAllowedSet`

**File**: `connect-four/server/llmCoachHelpers.js` (new export)

**Signature**:
```js
export function buildAllowedSet(groups, board, perspective)
// groups: output of selectTopGroups (Array of merged group records)
// board: Board instance (post-A board)
// perspective: 1 or 2 (coached player)
// Returns: AllowedSetEntry[]
```

**Algorithm** (per group):
1. **Parse cell coordinates**: For each cell in `group.cells` (wire format `cN rM`), compute `col = N-1`, `row = M-1` (0-indexed).
2. **Determine occupant**: `board.board[row][col]` — maps to `0=empty, 1=Red, 2=Yellow`. Convert to display name: `1→'Green'`, `2→'Grey'`, `0→'empty'`.
3. **Count owner discs**: For `owner='player'`: count cells where `board.board[row][col] === perspective`. For `owner='opponent'`: count cells where `board.board[row][col] === (3-perspective)`. A coached-player disc in an opponent group does NOT count (FR-020).
4. **CONCRETE-ELIGIBLE** if `ownerDiscs >= 2`:
   - `zoneSpec`: if all 4 cells share the same column → `col${col+1}` (1-indexed). Else → `cells:${cells.join(',')}` (keep original order).
   - Entry: `{ cells: group.cells, zoneSpec }`.
5. **ABSTRACT-ONLY** if `ownerDiscs < 2`:
   - `col`: most common column among the 4 cell coords (0-indexed).
   - `key completing cell`: first empty cell in the group (find where `board.board[row][col] === 0`). Its 1-indexed row: `parity = R % 2 === 0 ? 'even' : 'odd'`.
   - `zoneSpec`: `col${col+1}`.
   - Entry: `{ col, parity, zoneSpec }` — NO `cells` field. This is the structural enforcement of D2.

**Acceptance**: Unit test with known groups asserting correct CONCRETE/ABSTRACT classification and zoneSpec construction.

---

### T09b — Implement `buildType1AllowedSet`

**File**: `connect-four/server/llmCoachHelpers.js` (new export)

**Signature**:
```js
export function buildType1AllowedSet(preMoveBoard, perspective)
// preMoveBoard: Board instance (board before move A)
// perspective: 1 or 2 (coached player)
// Returns: AllowedSetEntry[]
```

**Behavior**:
1. Call `getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, perspective)` and `getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, 3-perspective)`.
2. Each threat returned by `getImmediateThreats` is a 4-cell window (≥3 player discs + 1 empty cell). These windows always qualify as CONCRETE-ELIGIBLE (≥3 is more than the ≥2 threshold in D2).
3. Convert each threat window to wire-format `cells` array: `c${col+1}r${row+1}` for each cell.
4. Build `zoneSpec`: if all cells in same column → `col${col+1}`; else → `cells:${cells.join(',')}`.
5. `perspective` player's threats get `owner='player'`; `3-perspective` player's threats get `owner='opponent'` in the implicit perspective (though `buildType1AllowedSet` output entries don't carry an `owner` field — they just use the `AllowedSetEntry` shape).
6. Return: `AllowedSetEntry[]`. If `getImmediateThreats` returns nothing for either player (should not happen on Type 1 path but guard it), return `[]`.

**IMPORTANT — `getImmediateThreats` shape workaround**: `getImmediateThreats` returns `Array<number>` (column indices only). To produce CONCRETE-ELIGIBLE entries with 4-cell arrays, T09b must:
1. Call `getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, perspective)` to get the qualifying column list.
2. Call `findMajorThreatWindows(preMoveBoard, perspective)` (from T01a) and filter to windows where the empty cell's row matches `colHeights[col]` — i.e., the window anchored at the topmost empty cell in that column. This reuses the new Phase A helper and avoids duplicating the 4-window scan here.
3. Do the same for `getImmediateThreats(..., 3-perspective)` and `findMajorThreatWindows(..., perspective)` filtered to `owner='opponent'`.
4. Each filtered window is already a CONCRETE-ELIGIBLE 4-cell array — convert to `{ cells, zoneSpec }` directly.

**Parallel note**: T09b can be implemented in parallel with T09 — both feed into T15 but neither depends on the other.

**Acceptance**: Unit test with a known Type 1 pre-move board asserting the returned `AllowedSetEntry[]` contains correct CONCRETE-ELIGIBLE entries.

---

### T10 — Implement group context block builder

**File**: `connect-four/server/llmCoachHelpers.js` (new export)

**Signature**:
```js
export function buildGroupContextBlock(groups, allowedSet, board, perspective)
// groups: output of selectTopGroups (merged Array)
// allowedSet: output of buildAllowedSet (or buildType1AllowedSet for Type 1)
// board: Post-A Board instance
// perspective: 1 or 2
// Returns: string (the context block section for LLM prompt)
```

**Behavior**:
1. **Winning-line comparison** section: for each group, format as:
   ```
   GROUP_k: cells=[c3r2,c4r2,c5r2,c6r2] occupants=[Green,Grey,empty,empty]
     key completing cell: c5r2 (row 2 = even, IS winning parity for Grey)
     player_discs_in_group: 1 — ABSTRACT-ONLY
     A-branch: completed=0.45 draw=0.15 | B-branch: completed=0.20 draw=0.40
   ```
   Fields: cells, occupants, key completing cell, row parity, IS/NOT winning parity, player_discs_in_group, CONCRETE-ELIGIBLE/ABSTRACT-ONLY, branch frequencies.

2. **KB parity rule reference**: For each group, load the relevant parity KB entry from the leverage map (FR-024) and append one reference line.

3. **ASCII board replacement** (FR-023):
   - Replace all `R` tokens with `Green`, `Y` tokens with `Grey`.
   - Strip the `scr` row (scores row).
   - Verify `getBoardVisualization` already strips `scr` (check `llmCoachHelpers.js:186`) — if not, add the strip here or in `getBoardVisualization`.

4. **"Major threats: none"** when `findMajorThreatWindows(board, perspective)` returns empty (FR-022).

5. **Move context section** (FR-021): derive player identity from `perspective` (not hardcoded). Odd `perspective` → Green → winning parity odd rows; even → Grey → winning parity even rows.

**Acceptance**: Unit test asserting the output string contains GROUP_k entries with correct occupants derived from the board.

---

## Phase E: Prompt templates

### T11 — Implement Type 4 prompt template

**File**: `connect-four/server/llmCoachHelpers.js` (new export)

**Signature**:
```js
export function buildType4Prompt({ playerName, gap, gapBucket, contextBlock, inverted })
```

**Template sources**:
- **Role / Players / Hard grounding rules / Tone / Task sections**: verbatim from `coach_explanation_principles.md` Type 4 template.
- **Hard grounding rules** section MUST include the distinction between ABSTRACT-ONLY (column + parity reference only) and CONCRETE-ELIGIBLE (may highlight listed empty cells) — per FR-028.

**Framing**:
- `inverted=true` (FR-008 path): use the inverted gap ladder. gap=0 → "Both A and the alternative are equivalent; your move is fine." −3<gap<0 → "Your move is solid; the alternative is a touch more flexible but the difference is minor." gap<−3 → "Your move is the strongest here; [what it preserves or builds]."
- `inverted=false` (FR-009/FR-016 path): use the standard gap buckets. small (gap≤3) → moderate (4–9) → large (≥10).

**KB section**: Load per leverage map (FR-024): `derived-parity-formula`, `allen-v1`/`allen-v3` (Red odd rows) or `allen-v2`/`allen-v4` (Yellow even rows), `community-claimodd`, `allis-claimeven`. Conditionally add `community-z-threat` for mid-game positions with Z-threats present.

**ASCII boards**: Embed pre-A, post-A, and post-opponent-reply boards with Green/Grey substitution and `scr` row stripped (FR-023).

**Return**: The full prompt string.

---

### T12 — Implement Types 1, 2 prompt template (FR-030)

**File**: `connect-four/server/llmCoachHelpers.js` (new export)

**Signature**:
```js
export function buildType12Prompt({ playerName, gap, gapBucket, contextBlock, explainType })
```

**Template**:
- Same skeleton as Type 4 prompt (same Players / Hard grounding rules / Tone / Task sections).
- **Role section difference** (FR-030): Use type-neutral wording: "You are a Connect Four coach explaining why one move was stronger than another." (The Type 4 Role sentence — "in the opening, why one move develops better … There are no immediate threats" — is replaced because it is factually wrong for tactical and immediate-win positions.)
- Everything else (Players, Hard grounding rules, Tone, Task) stays verbatim from Type 4.
- No bespoke evidence blocks for Types 1 and 2 in this epic.

**Return**: The full prompt string.

---

### T13 — Implement Type 3 stub template (FR-029)

**File**: `connect-four/server/llmCoachHelpers.js` (new export)

**Signature**:
```js
export function buildType3Prompt({ playerName, gap, gapBucket, contextBlock, parityFlipData })
```

**Template**:
- Same Role / Players / Hard grounding rules / Tone sections as Type 4.
- **Hard grounding rules**: reuse Type 4 grounding contract (same ABSTRACT-ONLY / CONCRETE-ELIGIBLE distinction).
- **Task section**: adds exactly one sentence acknowledging the parity flip: "Playing in column [colA] changes the number of empty squares in column [colX], so [playerLabel] will now land on row [rowR] — the row that matters for winning there." Column/row values substituted from `parityFlipData`. `[playerLabel]` is `'you'` or `'your opponent'`.
- This exact sentence (with substituted values) MUST appear in the output — SC-003 Type 3 acceptance scenario.

**Return**: The full prompt string.

---

## Phase F: Rebuild `buildExplainContext`

### T15 — Replace `buildExplainContext` internals

**File**: `connect-four/server/index.js`

**IMPORTANT — classify-first flow**: Classification MUST run before simulation. Type 1 skips simulation entirely. The three-path flow is:

**Sequence in the rebuilt function**:
1. Load `preScores` (existing code at line 619–621).
2. Compute `perspective`, `postMovestring`, `postBoard` (existing).
3. Build board objects: `preMoveBoard = new Board(movestring)`, `postBoard = new Board(postMovestring)`.
4. **Check all-moves-equal** (T04): call `checkAllMovesEqual(preScores, preMoveBoard)`. If `isSettled`: return `{ prompt: null, allowedSet: null, allMovesEqual: true }`.
5. **Get contrast column**: call `selectContrastMove(preScores, col, preMoveBoard)`. If `contrast === null`, return `null` (existing behavior).
6. **Compute gap and framing** (T04): call `getGapAndFraming(preScores, col, contrastCol)`.
7. **Compute opponentResponseMovestring** (existing code at line 657–665, moved BEFORE classifier, not after — needed for Type 2 detection).
8. **CLASSIFY FIRST** (T06/T14): `const classification = classifyExplanationType(preMoveBoard, postBoard, opponentResponseMovestring, perspective, col)`.
9. **If Type 1**:
   - Build `allowedSet` via `buildType1AllowedSet(preMoveBoard, perspective)` (T09b).
   - Build context block via `buildGroupContextBlock(groups=[], allowedSet, postBoard, perspective)`. Pass empty groups array — Type 1 has no simulation groups.
   - Dispatch prompt via `buildType12Prompt(...)`.
   - Return `{ prompt, allowedSet, allMovesEqual: false }`.
10. **If Types 2/3/4**:
    - Run A-branch simulation: `explainSimulate(postMovestring, numPlies, ...)`.
    - Run B-branch simulation: `explainSimulate(movestring + contrastCol, numPlies, ...)`.
    - Select top groups via `selectTopGroups(userResult.groups, contrastResult.groups)` (T08).
    - Build `allowedSet` via `buildAllowedSet(groups, postBoard, perspective)` (T09).
    - Build context block via `buildGroupContextBlock(groups, allowedSet, postBoard, perspective)` (T10).
    - Dispatch prompt:
      - Type 2: `buildType12Prompt(...)` (T12).
      - Type 3: `buildType3Prompt({ ..., parityFlipData: classification.parityFlipData })` (T13).
      - Type 4: `buildType4Prompt(...)` (T11).
    - Return `{ prompt, allowedSet, allMovesEqual: false }`.

**Remove from `buildExplainContext`** (the old code being replaced):
- `computeDeltaTable` call and `deltaRows` variable.
- `claimevenNarration`, `zThreatNarration`, `figure7Narration`, `jShapeNarration` variable computations.
- `buildExplainPrompt` call.
- `kbSection` variable (now built inside prompt templates).
- `userExamplesByPattern` computation (if no longer used).
- The old `activePatterns` / `insufficientTacticalData` / `allLinesDecided` logic.

**Add imports** to `index.js`:
```js
import {
  findMajorThreatWindows, checkAllMovesEqual, getGapAndFraming,
  classifyExplanationType, selectTopGroups, buildAllowedSet,
  buildType1AllowedSet, buildGroupContextBlock, buildType4Prompt,
  buildType12Prompt, buildType3Prompt,
} from './llmCoachHelpers.js';
```

**Update the handler** at `index.js:764+`:
- The caller must handle `allMovesEqual: true` by returning the frozen string (FR-007): `"All moves are roughly equivalent here — no single best move stands out."` with `allowedSet: null`.
- No quota decrement, no cache write on the all-moves-equal path.
- Update `validateAnnotation` call at `:778` to pass `allowedSet`: `validateAnnotation(explanation, board, context.allowedSet)`.

**Function return shape**: `{ prompt: string|null, allowedSet: AllowedSetEntry[]|null, allMovesEqual: boolean }`.

**Acceptance**: Integration test through `POST /api/explain-move-llm` for a Type 4 position returns correct explanation shape. The handler correctly short-circuits on `allMovesEqual`.

---

## Phase G: Strong-form P5 gate upgrade

### T16 — Extend `validateAnnotation` with `allowedSet` parameter

**File**: `connect-four/server/annotationGate.js`

**Changes**:

1. **New signature**:
```js
export function validateAnnotation(explanation, board, allowedSet = null)
```

2. **Backward-compat** (FR-031): When `allowedSet` is `null` or `undefined`, behavior is exactly as in Epic A — only `checkP1`, `checkP2`, `checkP3`, `checkP5`, `checkP6` run. No strong-P5 check.

3. **When `allowedSet` is provided**: After existing checks, call `checkP5Strong(zones, allowedSet)` and push failures to the failures array.

4. **Implement `checkP5Strong(zones, allowedSet)`** (new exported function, FR-032):
   - Accepts: `zones` (array of `{spec: string, innerText: string}` from `parseZoneSpecs`), `allowedSet` (AllowedSetEntry[]).
   - Returns: `string[]` — failure codes.
   - Zone rules:
     - **`tg`**: always fails → `'P5strong:tg'`.
     - **`col\d+`** (1-indexed wire): col N → 0-indexed `col = N-1`. Passes if any `allowedSet` entry has `entry.col === col` (ABSTRACT-ONLY) OR if any CONCRETE-ELIGIBLE entry's `cells` array contains a cell in column `col`. Fails → `'P5strong:col_not_allowed:colN'`.
     - **`c\d+r\d+`**: Passes if any CONCRETE-ELIGIBLE entry's `cells` includes the exact wire-format cell string. ABSTRACT-ONLY entries (no `cells` field) CANNOT satisfy this check (FR-033). Fails → `'P5strong:cell_not_allowed:SPEC'`.
     - **`cells:...`**: All listed cells must appear in at least one CONCRETE-ELIGIBLE entry's `cells` list. Fails → `'P5strong:cell_not_allowed:SPEC'`.
     - **`row\d+`** (1-indexed wire): row R → 0-indexed `row = R-1`. Passes if any CONCRETE-ELIGIBLE entry's `cells` contains a cell at that row. Fails → `'P5strong:cell_not_allowed:rowN'`.

5. **Export `checkP5Strong`** so T17 can unit-test it directly.

**Acceptance**: T17 unit tests.

---

### T17 — Unit tests for strong-P5 gate

**File**: `connect-four/server/annotationGate.test.js` (extend existing file)

**Tests**:
1. **SC-001 (`e86eeac9` fixture)**: Build `allowedSet` for movestring `3444444335311110`. Assert no CONCRETE-ELIGIBLE entry's `cells` contains `c2r1` or `c2r2` (both are occupied cells on that board).
2. **SC-001 (`8d83947e` fixture)**: Build `allowedSet` for movestring `34`. Assert no CONCRETE-ELIGIBLE entry's `cells` contains `c5r2` (the Green disc at that position).
3. **SC-002 (`403a21c9` fixture)**: Call `validateAnnotation(explanation, board, allowedSet)` and assert returns `valid: false` with a `P5strong:` failure reason for the non-existent threat cell.
4. **`tg` zone**: Assert `tg` fails strong-P5 unconditionally.
5. **`col4` zone passes**: Assert `col4` passes strong-P5 when an ABSTRACT-ONLY entry has `col: 3`.
6. **`c4r3` zone fails with ABSTRACT-ONLY only**: Assert a cell-level zone fails strong-P5 when only an ABSTRACT-ONLY entry (no `cells` field) touches the column — cell-level checks require CONCRETE-ELIGIBLE entries.
7. **`row3` zone passes**: Assert `row3` passes strong-P5 when a CONCRETE-ELIGIBLE entry contains a cell in row 2.
8. **Backward-compat**: `validateAnnotation(explanation, board)` (no `allowedSet`) — strong-P5 checks are silently skipped. `validateAnnotation(explanation, board, null)` — same.
9. **`checkP5Strong` directly**: Test the exported function with synthetic zones and a minimal `allowedSet`.

---

## Phase H: DELETE list and documentation

### T18 — Callsite audit and deletion (FR-034, FR-035)

**Steps**:

1. **Pre-deletion audit**: Confirm the audit from plan.md R8 is still current. Run:
   ```
   rg "computeDeltaTable|claimevenNarration|zThreatNarration|figure7Narration|jShapeNarration|buildExplainPrompt" connect-four/server/
   ```
   Confirm zero callsites on Tier-1 path (`/api/explain-move`, `index.js:436`), in-game coach, lessons, challenges. Document result.

2. **Delete from `llmCoachHelpers.js`**:
   - `computeDeltaTable` function.
   - `PATTERN_NAMES` array (if only used by `computeDeltaTable`).
   - `buildExplainPrompt` function (after confirming no remaining callers).
   - Any import that becomes unused as a result.

3. **Delete from `index.js`** (already removed in T15, but verify):
   - `claimevenNarration`, `zThreatNarration`, `figure7Narration`, `jShapeNarration` variable computations.
   - `kbSection` and `activePatterns` logic from old `buildExplainContext`.

4. **Post-deletion verification** (SC-006): Run the same grep command and assert zero results.

5. **Run `npm run test:fast`** to confirm no broken imports.

**Acceptance**: Grep returns zero results. All tests pass.

---

### T19 — Update `server-conventions.md`

**File**: `docs/architecture/server-conventions.md`

**Updates**:

1. **Forward Simulation section**:
   - Add new `collectLeaves` output shape: each leaf now has `groups: GroupRecord[]`.
   - Add new `aggregateLeaves` output: `groups: Map<string, AggregatedGroup>` keyed by `canonicalCells:owner`.
   - Document `total_leaves` denominator definition: all leaves (won + draw + depth_limit at any ply).
   - Document new `explainSimulate` return field: `groups`.
   - Document new helper `findWinningGroup(board, player)` inside `explainSimulate.js`.

2. **LLM Coach Helpers section**:
   - Remove references to `computeDeltaTable`, `buildExplainPrompt`, and narration helpers.
   - Add new exported functions: `findMajorThreatWindows`, `checkAllMovesEqual`, `getGapAndFraming`, `classifyExplanationType`, `selectTopGroups`, `buildAllowedSet`, `buildType1AllowedSet`, `buildGroupContextBlock`, `buildType4Prompt`, `buildType12Prompt`, `buildType3Prompt`.
   - Document that `buildExplainContext` now returns `{ prompt, allowedSet, allMovesEqual }`.

3. **Annotation Gate section**:
   - Document new optional `allowedSet` parameter on `validateAnnotation`.
   - Document `checkP5Strong` as a new exported function.
   - Document strong-P5 check behavior, failure codes, and backward-compat guarantee.
   - Document CONCRETE-ELIGIBLE vs ABSTRACT-ONLY distinction and how each interacts with zone types.

4. **Add Type Classifier section** (new):
   - Document `classifyExplanationType` priority order (Type 1 → 2 → 3 → 4, first match wins).
   - Document that classification runs before simulation — Type 1 bypasses simulation entirely.
   - Document `ExplainTypeResult` return shape (including `parityFlipData` for Type 3).

---

## Phase I: Regression harness extension

### T20 — Extend regression harness (FR-036, FR-037)

**File**: `connect-four/server/annotationGate.test.js` (extend existing)

**Tests**:

1. **SC-001 structural assertion (fixture `e86eeac9`)**: For movestring `3444444335311110`:
   - Call `buildExplainContext(movestring, col)` and extract `allowedSet`.
   - Assert no CONCRETE-ELIGIBLE entry's `cells` list contains `c2r1` or `c2r2` (both occupied).

2. **SC-001 structural assertion (fixture `8d83947e`)**: For movestring `34`:
   - Call `buildExplainContext(movestring, col)` and extract `allowedSet`.
   - Assert no CONCRETE-ELIGIBLE entry's `cells` list contains `c5r2`.

3. **SC-002 strong-P5 rejection (fixture `403a21c9`)**:
   - Call `buildExplainContext(movestring, col)` for the `403a21c9` position.
   - Call `validateAnnotation(explanation, board, allowedSet)`.
   - Assert `valid: false` with a `P5strong:` failure reason.

4. **SC-007 HTTP response shape contract**:
   - Mock a call to `POST /api/explain-move-llm` (or test the handler directly).
   - Assert response shape is `{ explanation, prompt, cached? }` — no new fields.
   - Assert `allowedSet` is NOT present in the HTTP response.

5. **All-moves-equal integration**:
   - Verify the handler returns the frozen string without making an LLM call for a genuinely settled position.
   - Assert quota is not decremented.

6. **FR-024 non-use list enforcement** (added per critique resolution):
   - For the sparse `34` fixture, call `buildExplainContext(movestring, col)` and extract the prompt.
   - Assert the prompt string does NOT contain any forbidden KB entry names: `t1`, `t2`, `t3`, `t4`, `t5`, `t6`, `t7`, `parity-trap`, `ghost-threat`, `overcut`, `sextuple-threat`, `baseclaim`, `before`, `specialbefore`.
   - This proves forbidden KB entries are structurally prevented from appearing in prompt output for a sparse position.

**Fixture source**: Use movestrings from spec SC-001/SC-002. All fixtures sourced from spec or `llm_feedback` DB — no random boards.

---

## Task summary

| ID | Phase | File | Description | Dependencies |
|----|-------|------|-------------|--------------|
| T01a | A | `llmCoachHelpers.js` | `findMajorThreatWindows` helper | None |
| T01 | A | `explainSimulate.js` | `collectLeaves` groups + `findWinningGroup` | T01a |
| T02 | A | `explainSimulate.js` | `aggregateLeaves` groups + wire through `explainSimulate` | T01 |
| T03 | A | `explainSimulate.test.js` | Unit tests for new simulation output | T01, T02 |
| T04 | B | `llmCoachHelpers.js` | `checkAllMovesEqual` + `getGapAndFraming` | T01a (for file location context only) |
| T06 | C | `llmCoachHelpers.js` | `classifyExplanationType` | T01a |
| T14 | C | `llmCoachHelpers.js` | Parity flip data in classifier (Type 3) | T06 |
| T07 | C | `llmCoachHelpers.test.js` | Classifier unit tests | T06, T14 |
| T08 | D | `llmCoachHelpers.js` | `selectTopGroups` (M3) | T02 |
| T09 | D | `llmCoachHelpers.js` | `buildAllowedSet` | T08 |
| T09b | D | `llmCoachHelpers.js` | `buildType1AllowedSet` | T01a (parallel with T09) |
| T10 | D | `llmCoachHelpers.js` | `buildGroupContextBlock` | T09 |
| T11 | E | `llmCoachHelpers.js` | Type 4 prompt template | T10 |
| T12 | E | `llmCoachHelpers.js` | Types 1/2 prompt template | T10 |
| T13 | E | `llmCoachHelpers.js` | Type 3 stub template | T10, T14 |
| T15 | F | `index.js` | Rebuild `buildExplainContext` | T04, T06, T08, T09, T09b, T10, T11, T12, T13 |
| T05 | B | `llmCoachHelpers.test.js` | All-moves-equal unit test | T15 |
| T16 | G | `annotationGate.js` | Extend `validateAnnotation` + `checkP5Strong` | T09 |
| T17 | G | `annotationGate.test.js` | Strong-P5 unit tests | T16 |
| T18 | H | `llmCoachHelpers.js`, `index.js` | Delete list + audit | T15 |
| T19 | H | `server-conventions.md` | Documentation update | T15, T16, T18 |
| T20 | I | `annotationGate.test.js` | Regression harness extension | T15, T16, T17 |

## Parallel execution strategy

1. **Start immediately**: T01a (no dependencies).
2. **After T01a completes**: Phase A serial chain (T01→T02→T03) can run in parallel with T04 and T06→T14→T07.
3. **After T02 completes**: T08→T09→T10 can run in parallel with T09b. T11, T12, T13 can run in parallel after T10+T14.
4. **After T09 completes**: T16→T17 can start immediately (gate work is independent of prompt template work).
5. **T15 is the integration point** — it needs all of T04, T06, T08, T09, T09b, T10, T11, T12, T13 complete before starting.
6. **After T15**: T05, T18, T19, T20 can all run (some parallelism possible, but T20 depends on T17).
