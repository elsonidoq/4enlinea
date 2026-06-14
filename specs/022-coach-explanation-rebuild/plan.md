# Implementation Plan: Coach Explanation Rebuild (Deep Reveal Epic B)

**Branch**: `101-new-design` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-coach-explanation-rebuild/spec.md`

## Summary

Rebuild the `buildExplainContext` prompt-construction pipeline (in `connect-four/server/index.js:610`) from the current always-Type-2 prompt into a four-type evidence-driven taxonomy (Type 1 Immediate / Type 2 Tactical / Type 3 Parity / Type 4 Development), with a grounding contract that pre-lists every mentionable cell and group, and produce the `allowedSet` that upgrades Epic A's annotation gate to its strong form (P5 cell-level check). The simulation layer (`explainSimulate.js:collectLeaves`) is extended to record winning groups and draw threat groups at leaves so that group-completion frequencies can drive context block assembly.

## Technical Context

**Language/Version**: Node.js 20.10+ (ES modules, `with { type: 'json' }` syntax already in use)  
**Primary Dependencies**: `explainSimulate.js`, `llmCoachHelpers.js`, `annotationGate.js`, `zoneParser.js`, `classifier.js` (Board class), OpenAI API via `callLLM`  
**Storage**: PostgreSQL via Supabase; `explanation_cache` and `deep_reveal_failures` tables (both exist). No new migrations needed.  
**Testing**: `npm run test:fast` in `connect-four/`; test files alongside source in `server/`; `annotationGate.test.js` already exists as a model  
**Target Platform**: Node server (`connect-four/server/index.js`)  
**Project Type**: Web service (server-side only; no frontend changes)  
**Performance Goals**: `buildExplainContext` stays within 6 s LLM timeout; `validateAnnotation` extension adds O(M×N) allowed-set lookup (M zones × N allowedSet entries), negligible vs LLM latency  
**Constraints**: Zero new solver calls beyond what already exists in `buildExplainContext`; no changes to HTTP response shape `{ explanation, prompt, cached? }`; no changes to three frontend surfaces; `allowedSet` is internal-only (never in HTTP response)  
**Scale/Scope**: Server-only change; affects every call to `POST /api/explain-move-llm`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I — Explanation Engine as Single Source of Truth
- [x] All changes are internal to `buildExplainContext` and the gate. The LLM annotation layer is grounded in classifier output (winning groups from simulation, major threat windows from `findMajorThreatWindows`, solver scores). No speculative content is generated outside the grounding contract.
- [x] Epic B does not add a new explanation surface — it rebuilds what the existing surface produces.

### Principle II — Code Quality & Simplicity
- [x] The DELETE list (`computeDeltaTable`, narration helpers) is removed after callsite audit. No dormant code left.
- [x] `allowedSet` is a flat array with two structural variants (CONCRETE-ELIGIBLE / ABSTRACT-ONLY) — no inheritance or wrapper classes.
- [x] `collectLeaves` change is focused: leaf handling and aggregation shape only; search traversal is unchanged.

### Principle III — Testing Standards
- [x] All classifier routing (Types 1–4) is tested with concrete board fixtures (`classifyExplanationType` against known positions).
- [x] Regression harness extension asserts `403a21c9` is now rejected and `e86eeac9`/`8d83947e` fail structurally.
- [x] All-moves-equal short-circuit is tested with a unit test asserting no LLM call.
- [x] No random boards used — all test fixtures sourced from `llm_feedback` table or verified spec movestrings.

### Principle VI — Implementation & Debugging Methodology
- [x] `opponentResponseMovestring` existence in current `buildExplainContext` is confirmed by reading `index.js:657–665` — it is already computed via `getOpponentResponseMs`. No assumption required.
- [x] Per-column `score_coached` sweep: `preScores` from `solver.query(movestring)` at `index.js:619–622` already provides the raw scores. `selectContrastMove` at `:624` already computes the best alternative. The sign flip `score_coached(col) = -raw_score(col)` must be added to `buildExplainContext` — this is the only missing piece.
- [x] DELETE list callsite audit is a mandatory pre-deletion task (FR-034), not skipped.

### Principle VIII — Documentation as First-Class Deliverable
- [x] Existing `docs/architecture/server-conventions.md` sections for Forward Simulation, LLM Coach Helpers, and Annotation Gate are read and plan is consistent.
- [x] `server-conventions.md` must be updated to document: (a) the new `collectLeaves` output shape, (b) the new `buildExplainContext` return value (`{ prompt, allowedSet }`), (c) `validateAnnotation`'s new optional second parameter.
- [x] `tasks.md` will include explicit documentation tasks for these changes.

**Re-check post-Phase 1**: All constitution principles satisfied. No violations requiring justification in the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/022-coach-explanation-rebuild/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (internal data shapes)
├── contracts/           # Phase 1 output (internal function contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (affected files)

```text
connect-four/server/
├── explainSimulate.js        # collectLeaves + aggregateLeaves changed
├── index.js                  # buildExplainContext replaced; validateAnnotation call updated
├── llmCoachHelpers.js        # computeDeltaTable + narration helpers deleted after audit;
│                             #   score_coached computation added;
│                             #   type classifier + grounding contract builder added
├── annotationGate.js         # validateAnnotation extended with allowedSet parameter
└── annotationGate.test.js    # regression harness extended

connect-four/server/scripts/
└── (no changes)

docs/architecture/
└── server-conventions.md     # updated: collectLeaves shape, buildExplainContext return, 
                              #          validateAnnotation signature, type classifier
```

**Structure Decision**: Single project, server-only. All changes are in `connect-four/server/`. No new files — changes are in-place edits of existing modules.

---

## Phase 0: Research

### R1. `preScores` and `score_coached` — current state

**Finding**: `buildExplainContext` (`index.js:619–622`) already calls `solver.query(movestring)` and stores the result as `preScores`. `selectContrastMove(preScores, col, board)` at `:624` already finds the best alternative column. The `score_coached(col) = -raw_score(col)` sign flip is **not** currently applied; `selectContrastMove` uses raw solver scores directly (higher = better for current-player = lower for coached player). 

**Decision**: Add `score_coached` computation inline in `buildExplainContext` immediately after `preScores` is loaded. Reuse `preScores` — no new solver calls. The all-moves-equal check and the A-quality branch run on `score_coached` values.

**Implementation note**: `selectContrastMove` in `llmCoachHelpers.js:319` already returns `{ contrastCol, isOptimal }`. It uses raw scores but its `isOptimal` field correctly reflects whether the user played the globally best move. The sign flip for gap computation must be done in `buildExplainContext` after extracting `contrastCol` from `selectContrastMove`'s output.

### R2. `opponentResponseMovestring` — current state

**Finding**: Already computed at `index.js:657–665` via `getOpponentResponseMs(postMovestring, postBoard, opponentWinCols, perspective, solver)`. It is the movestring after move A + opponent's optimal reply. Available for Type 2 detection without new solver calls. ✓

### R3. `collectLeaves` — current return shape

**Finding**: Terminal leaves (`isTerminal === true`) at `explainSimulate.js:199–206` currently return `[{ leafType, patterns: null, currentPlayer }]`. The winning group is **discarded**. The `aggregateLeaves` function (`index.js:269`) counts terminal leaves only as scalar outcome counters. The new shape must add `groups: Array<GroupRecord>` alongside the existing `leafType`, `patterns`, `currentPlayer` — backward-compatible if aggregation is updated atomically in the same task.

**Decision**: `GroupRecord` shape (spec FR-001/FR-002):
```js
// won leaf
{ cells: string[], owner: 'player'|'opponent', type: 'completed' }
// draw leaf  
{ cells: string[], owner: 'player'|'opponent', type: 'draw_threat' }
```
Key insight: spec uses `owner` not `winner` (handoff context note #1). The aggregation key is `canonicalCellSet:owner` per FR-003.

### R4. Board class — available methods

**Finding** (from `server-conventions.md` and classifier.js):
- `new Board(movestring)` — constructs from movestring
- `board.hasWon(player)` — checks if `player` has 4-in-a-row (useful for won-leaf detection in `collectLeaves`, but NOT for Type 1 classifier — see T06 note)
- `board.colHeights[col]` — top empty row per column (for parity computation)
- `board.board[row][col]` — cell value 0/1/2
- `board.withMove(col)` — returns new Board after placing in col (for post-A board)
- `getMajorThreatCells(board)` — returns a per-cell flag map `{rm, rn, ym, yn}` indicating which cells are part of major threats; does **not** return 4-cell group objects with owners
- `getImmediateThreats(board.board, board.colHeights, player)` — immediate threats

**New utility needed**: `getMajorThreatCells` returns a cell-level flag map, not an array of `{ cells: string[], owner }` 4-window objects. Tasks T01 (draw-leaf recording), T06 (Type 3 / Type 2 detection), and T16 (strong-P5 column check) all require iterating over 4-cell groups with owners. A new helper `findMajorThreatWindows(board)` must be written that scans all 4-windows, finds those with exactly 3 discs of one color + 1 empty cell, and returns `{ cells: string[], owner: 'player'|'opponent' }[]` — see sub-task in T01a. This replaces all direct uses of `getMajorThreatCells` for group-level operations.

### R5. KB detector functions — availability

**Finding** (from `explainSimulate.js:DETECTOR_REGISTRY` and `llmCoachHelpers.js`):
- `detectFigure7(board, scores)` — available, sync, imported from `classifier.js`
- `detectJShape(board, scores)` — available, sync, imported from `classifier.js`
- Both return `{ matched, ... }` shapes

These are the "named scaffold" detectors for Type 2. They must be applied to the **critical-position board** (`new Board(opponentResponseMovestring)`), not the current board. Scores for the critical position: use `preScores` from the post-A board (already computed in `buildExplainContext`). Actually scores for the critical position are the scores after the opponent's move — these would require a new solver call. 

**Decision (per FR-012)**: For the Figure-7/J-config named-scaffold check, apply the detectors to the critical-position board using the ALREADY-COMPUTED `opponentResponseMovestring` board. For scores, use `EMPTY_BOARD_SCORES` (all zeros) as a dummy — `detectFigure7` and `detectJShape` use scores only for threat-type filtering which doesn't affect the structural match. This avoids new solver calls. Document this assumption as a code comment.

### R6. `allowedSet` construction — winning groups from simulation vs. KB parity entries

**Finding**: The grounding contract requires groups from two sources:
1. **Simulation groups** (from the new `collectLeaves` aggregation) — the top 5 per branch by `completed_freq`, merged up to 10 (M3). These are the "empirical" groups.
2. **KB parity groups** — for sparse boards with no simulation groups, the KB `allen-v1`/`allen-v3` (Red odd rows) and `allen-v2`/`allen-v4` (Yellow even rows) should guide which column + parity to reference.

**Decision**: `allowedSet` is built from the simulation groups only. Each group is assessed for CONCRETE-ELIGIBLE vs ABSTRACT-ONLY (D2: ≥2 player discs in group). KB parity entries inform the **prompt text** (which parity rule justifies mentioning this group) but do not add additional entries to `allowedSet`. This keeps `allowedSet` deterministic and testable.

### R7. Type 3 — parity flip detection

**Finding**: The Type 3 rule (FR-013) requires:
1. `findMajorThreatWindows(postABoard, perspective)` returns non-empty
2. At least one column's empty-cell count changes parity between pre-A and post-A board
3. The parity-flipped column is same or adjacent to a major threat column

Empty-cell count per column = `ROWS - colHeights[col]`. Parity = `(ROWS - colHeights[col]) % 2`. The parity of column `c` changes after placing in column `A` only if `c === A` (placing decrements the empty count in that column by 1, flipping parity). So condition (2) is satisfied only if the played column `A` flips parity (which it always does). The real constraint is condition (3): the played column must be same or adjacent to a major threat column.

**Decision**: Type 3 rule simplifies to: `findMajorThreatWindows(postABoard, perspective)` is non-empty AND the played column `A` is within ±1 of any column appearing in a threat window. This is equivalent to FR-013 but expressed more directly. (`getMajorThreatCells` cannot be used here — it returns a per-cell flag map without group structure.)

### R8. DELETE list callsite audit — pre-plan

**Finding** (grep results):
- `computeDeltaTable` — called only in `index.js:637` (inside `buildExplainContext`)
- `claimevenNarration`, `zThreatNarration`, `figure7Narration`, `jShapeNarration` — computed in `buildExplainContext` (`index.js:676–693`) and passed to `buildExplainPrompt` (`:702–711`)
- `buildExplainPrompt` — called only in `buildExplainContext` at `index.js:702`
- None of these are called from: `/api/explain-move` (Tier-1 path at `index.js:436`), in-game coach one-liner, lessons, challenges

**Conclusion**: The callsite audit result is already confirmed. All DELETE list functions have exactly one callsite, inside `buildExplainContext`, which is being fully replaced. Deletion is safe after `buildExplainContext` is rebuilt (FR-034 satisfied).

---

## Phase 1: Design & Contracts

### Data model — internal shapes

See `data-model.md` for full schema. Key shapes:

**GroupRecord** (leaf-level, internal to `collectLeaves`):
```js
{
  cells: string[],          // e.g. ["c3r2","c4r2","c5r2","c6r2"] (1-indexed wire format)
  owner: 'player'|'opponent',
  type: 'completed'|'draw_threat'
}
```

**AggregatedGroup** (after `aggregateLeaves`, per `cellSet:owner` key):
```js
{
  cells: string[],
  owner: 'player'|'opponent',
  completed_freq: number,   // N_won_leaves_with_group / total_leaves
  draw_freq: number,        // N_draw_leaves_with_group / total_leaves
}
```

**AllowedSetEntry** — two structural variants (FR-026/FR-027):
```js
// CONCRETE-ELIGIBLE (≥2 owner discs in group)
{ cells: string[], zoneSpec: string }

// ABSTRACT-ONLY (< 2 owner discs)
{ col: number, parity: 'odd'|'even', zoneSpec: string }
// NO cells field — structural enforcement of D2
```

**ExplainContext** (return value of `buildExplainContext`):
```js
{
  prompt: string,
  allowedSet: AllowedSetEntry[] | null  // null on all-moves-equal path
}
```
Note: `allowedSet` is **never** in any HTTP response.

**ExplainType**:
```js
'type1' | 'type2' | 'type3' | 'type4'
```

### Function contracts

See `contracts/` directory. Key contracts:

**`classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol)`**
- Returns: `{ type: ExplainType }` for Types 1/2/4; `{ type: 'type3', parityFlipData: { colA, colX, rowR, playerLabel } }` for Type 3 (after T14).
- No solver calls. Uses only board state, `findMajorThreatWindows`, `getImmediateThreats`, `detectFigure7`, `detectJShape`. Does NOT call `board.hasWon` (dead code on pre-move board) or `getMajorThreatCells` (wrong return type for group-level work).
- Priority: type1 → type2 → type3 → type4 (first match wins).
- MUST be called BEFORE simulation is started in `buildExplainContext` — the result determines whether to run simulation at all.

**`findMajorThreatWindows(board, perspective)`**
- Returns: `Array<{ cells: string[], owner: 'player'|'opponent' }>` — one entry per qualifying 4-window (exactly 3 discs of one color + 1 empty).
- New helper (T01a). Replaces `getMajorThreatCells` for all group-level operations across T01, T06, T16.

**`buildAllowedSet(groups, board, perspective)`**
- Returns: `AllowedSetEntry[]`
- Takes the merged top-5-per-branch group list (AggregatedGroup[])
- For each group, computes occupants and CONCRETE-ELIGIBLE flag
- CONCRETE-ELIGIBLE: ≥2 discs of the **owner** (not opposite player) in the group

**`buildGroundingContextBlock(allowedSet, board, perspective, explainType, gap)`**
- Returns: `string` (the context block section to embed in the prompt)
- Includes: Move context, boards (R→Green, Y→Grey, scr stripped), winning-line comparison, KB parity entries

**`validateAnnotation(explanation, board, allowedSet?)`**
- Extended signature: `allowedSet` is optional
- When `allowedSet` is null/undefined: existing Epic A behavior (backward-compatible)
- When `allowedSet` is provided: runs strong-P5 check in addition to all existing checks
- Returns: `{ valid: boolean, failures: string[] }` — shape unchanged

---

## Implementation Phases

### Phase A: Simulation leaf data (prerequisite — must be first)

**Why first**: All downstream prompt construction relies on group-frequency data from `collectLeaves`. This is the foundation.

**Tasks**:

**T01a — Write `findMajorThreatWindows(board, perspective)` helper**
- File: `connect-four/server/explainSimulate.js` (or `llmCoachHelpers.js` — single location, imported wherever needed)
- Signature: `findMajorThreatWindows(board: Board, perspective: number): Array<{ cells: string[], owner: 'player'|'opponent' }>`
- Scan all 4-windows (horizontal, vertical, diagonal — same set as `getMajorThreatCells`).
- A window qualifies if it has exactly 3 discs of one color and 1 empty cell.
- `owner`: if the 3 discs belong to `perspective` → `'player'`; if they belong to `3-perspective` → `'opponent'`.
- Cell format: wire format `c${col+1}r${row+1}` (1-indexed) for every cell in the window (including occupied cells).
- This helper is used in: T01 (draw-leaf recording), T06 (Type 2/3 detection), T16 (strong-P5 column check). Do **not** use `getMajorThreatCells` for any group-level operation — it returns a per-cell flag map, not 4-cell group objects.

**T01 — Extend `collectLeaves` to record winning groups and draw threat groups**
- File: `connect-four/server/explainSimulate.js`
- At won leaves (`wonByPerspective` / `wonByOpponent`): find the 4-cell winning line by scanning all 4-windows for `player` color. Add `findWinningGroup(board, player)` helper (returns the first 4-cell winning window for `player` or null, pure board scan ~O(63) windows). Record as `{ cells, owner, type: 'completed' }`.
- At draw leaves: call `findMajorThreatWindows(board, perspective)` (from T01a) and record each returned group as `{ cells, owner, type: 'draw_threat' }`. Do **not** call `getMajorThreatCells` here.
- Return shape addition: `groups: GroupRecord[]` alongside existing `leafType`, `patterns`, `currentPlayer`.
- Cell format: use wire format `c${col+1}r${row+1}` (1-indexed) to match `allowedSet.cells` format.
- **Owner perspective**: both `wonByPerspective` and the simulation pass the same `perspective` value (the coached player's color). `owner: 'player'` always means the coached player; `owner: 'opponent'` always means the other player. This holds for both A-branch and B-branch simulations — both use the same `perspective`. Draw threat leaf: `owner` = the player whose 3 discs appear in the window (use `findMajorThreatWindows` which encodes `perspective`).

**T02 — Extend `aggregateLeaves` to produce per-group frequency table and wire `groups` through `explainSimulate`**
- File: `connect-four/server/explainSimulate.js`
- New output field on `aggregateLeaves` result: `groups: Map<string, AggregatedGroup>` keyed by `canonicalCells:owner`.
  - `canonicalCells`: cells sorted alphabetically and joined with `,` (order-independent key).
  - `completed_freq`: N_won_leaves_where_group_appeared / total_leaves (all leaves: won + draw + depth_limit).
  - `draw_freq`: N_draw_leaves_where_group_appeared / total_leaves.
  - `total_leaves` = `wonByPerspective + wonByOpponent + draws + perspectiveLeaves + (other depth_limit leaves)`. Must count ALL leaves, not just perspective-to-move leaves.
- **Wire `groups` through the `explainSimulate` wrapper**: the public `explainSimulate(...)` function currently returns `{ patterns, outcomes, totalLeaves, timing, ... }`. It MUST be extended to return `groups` from the `aggregateLeaves` result. This is not backward-compatible with callers that destructure only the old fields — all callers are inside `buildExplainContext` which is being fully replaced, so no backward-compat shim is needed.
- Existing `outcomes`, `patterns`, `totalLeaves`, `timing` outputs remain unchanged.
- **Discard logging** (M3): after group selection (done in Phase B), log discarded count at debug level. Logging is the caller's responsibility, not `aggregateLeaves`.

**T03 — Unit tests for new simulation output**
- File: `connect-four/server/explainSimulate.test.js` (new or extending existing if present)
- Test: won leaf produces `groups` with exactly one `completed` entry whose `cells` match the winning line.
- Test: draw leaf produces `groups` with `draw_threat` entries for every major threat on the board.
- Test: `total_leaves` denominator includes won, draw, and depth-limit leaves.
- Test: same 4-window with different owners produces two separate records.
- Use movestring `34` (2 discs) as a sparse fixture and a known near-terminal position from the DB or spec.

---

### Phase B: Step 0 — branch by A's quality

**T04 — Add `score_coached` computation and all-moves-equal short-circuit**
- File: `connect-four/server/index.js` (`buildExplainContext`)
- Immediately after `preScores` is loaded (line ~622), compute:
  ```js
  const legalCols = [];
  for (let c = 0; c < 7; c++) { if (board.colHeights[c] < 6) legalCols.push(c); }
  const scoreCoached = col => -preScores[col];  // sign flip: FR-006/FR-015
  const allEqual = legalCols.every(c => scoreCoached(c) === scoreCoached(legalCols[0]));
  const isSettled = allEqual && legalCols.every(c => preScores[c] === 0);
  ```
- If `isSettled` (all scores are zero, confirming a genuine draw or fully-explored equal position): return `{ prompt: null, allowedSet: null, allMovesEqual: true }` immediately. No LLM call, no quota.
  - **Rationale**: Gating on all-scores-zero prevents the short-circuit from firing in live openings where scores happen to tie at non-zero values (e.g., a complex mid-game with two equally-losing columns). Real Type 4 positions where columns share a positive score should still reach the full explanation path. Regression test in T05 MUST assert that the headline Type 4 fixture (2-disc board, movestring `34`) does NOT hit the short-circuit — it must reach Type 4 classification.
- The caller at `index.js:764` must handle `allMovesEqual: true` by returning the frozen string (FR-007): `"All moves are roughly equivalent here — no single best move stands out."` with `allowedSet: null`.
- Determine A-quality branch: `const aIsOptimal = scoreCoached(col) >= scoreCoached(contrastCol)`.
- Store `gap = scoreCoached(contrastCol) - scoreCoached(col)` (positive = B better; negative = A optimal). FR-015.
- Compute sign-change override (FR-017): if `Math.sign(preScores[col]) !== Math.sign(preScores[contrastCol])`, force gap into moderate or large bucket.

**T05 — Unit test: all-moves-equal short-circuit**
- Assert `buildExplainContext` returns early with the frozen string and `allowedSet: null` for a position where all legal columns have raw score = 0 (genuinely settled/drawn position).
- Assert no LLM call is made (mock/spy `callLLM`).
- Assert quota is not decremented.
- **Regression assertion**: assert that the headline Type 4 fixture (movestring `34`, 2-disc board) does NOT hit the short-circuit — `preScores` for this position are non-zero for most columns, so `isSettled` is false and the position must proceed to Type 4 classification. This prevents accidental over-triggering on live openings.

---

### Phase C: Type classifier

**T06 — Implement `classifyExplanationType`**
- File: `connect-four/server/llmCoachHelpers.js` (new exported function)
- Signature: `classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol)`
- **IMPORTANT**: Classification MUST run before any simulation is started (see T15 sequence note). The result determines whether simulation is needed at all — Type 1 skips it entirely.
- Priority 1 → Type 1: Use `getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, perspective)` (player had a winning move they missed) and `getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, 3-perspective)` (opponent had an immediate threat before A). Type 1 fires if either set is non-empty. **No `hasWon` check** — the game has not ended before A was played (the move was accepted by the server), so `preMoveBoard.hasWon(any)` is always false and would be dead code.
- Priority 2 → Type 2: Apply to `criticalBoard = new Board(criticalPositionMs)`. Count opponent major-threat windows using `findMajorThreatWindows(criticalBoard, perspective)` filtered to `owner === 'opponent'` — Type 2 fires if count ≥ 2. Also fires if `detectFigure7(criticalBoard, ZERO_SCORES).matched` OR `detectJShape(criticalBoard, ZERO_SCORES).matched`. `ZERO_SCORES = [0,0,0,0,0,0,0]` (dummy, avoids new solver call per R5 decision). **Use `findMajorThreatWindows`, not `getMajorThreatCells`**, to get countable group objects.
- Priority 3 → Type 3: Use `findMajorThreatWindows(postABoard, perspective)` — Type 3 fires if result is non-empty AND `playedCol` is within ±1 of any threat window's column (simplified from R7). **Use `findMajorThreatWindows`, not `getMajorThreatCells`**.
- Priority 4 → Type 4: default.
- Returns `{ type: 'type1'|'type2'|'type3'|'type4' }` (extended to return parityFlipData for Type 3 in T14).

**T07 — Unit tests for type classifier**
- File: `connect-four/server/annotationGate.test.js` or new `llmCoachHelpers.test.js`
- At minimum: one fixture per type with known board state.
- SC-003 requirement: ≥1 each of Type 1, 2, 3, 4.
- Type 2 fixture: a known position with ≥2 simultaneous opponent major threats after move + reply.
- Type 3 fixture: a position satisfying all three conditions of FR-013.
- Source fixtures from spec movestrings or `llm_feedback` DB rows — no random boards.

---

### Phase D: Group selection and `allowedSet` construction

**T08 — Implement `selectTopGroups` (M3)**
- File: `connect-four/server/llmCoachHelpers.js`
- Signature: `selectTopGroups(aGroups: Map, bGroups: Map, debug=false): AggregatedGroup[]`
- Takes the `groups` Maps from A-branch and B-branch simulation results (`userResult.groups` and `contrastResult.groups` — populated after T02 wires the field through `explainSimulate`).
- Ranks within each branch by absolute `completed_freq` descending; takes top 5 per branch.
- Merges (up to 10 distinct groups by `canonicalCells:owner` key).
- Debug logging: `console.debug('[explain] discarded N groups (freq range [min–max]); kept 5 per branch.')` when `debug=true` or `process.env.DEBUG_EXPLAIN`.
- Returns: `AggregatedGroup[]`.

**T09 — Implement `buildAllowedSet`**
- File: `connect-four/server/llmCoachHelpers.js`
- Signature: `buildAllowedSet(groups: AggregatedGroup[], board: Board, perspective: number): AllowedSetEntry[]`
- For each group:
  1. Determine each cell's occupant: parse wire coord, call `board.board[row-1][col-1]` (convert 1-indexed wire to 0-indexed).
  2. Count `ownerDiscs`: number of cells in group occupied by the owner (perspective player or opponent, depending on `group.owner`).
  3. If `ownerDiscs >= 2`: CONCRETE-ELIGIBLE → `{ cells: group.cells, zoneSpec: buildZoneSpec(group.cells) }`.
  4. Else ABSTRACT-ONLY: determine `col` (most common column in group), compute `parity` (odd/even row of the key completing cell = first empty cell in group) → `{ col, parity, zoneSpec: 'col' + (col+1) }`.
  5. A coached-player disc inside an opponent group does NOT count toward opponent's eligibility (FR-020).
- `buildZoneSpec`: if all cells in same column → `col${col+1}`; else `cells:${cells.join(',')}`.

**T09b — Implement `buildType1AllowedSet`**
- File: `connect-four/server/llmCoachHelpers.js`
- Signature: `buildType1AllowedSet(preMoveBoard: Board, perspective: number): AllowedSetEntry[]`
- Called only on the Type 1 path (where simulation is skipped).
- `getImmediateThreats` returns `Array<number>` (column indices only), not 4-cell windows. To produce CONCRETE-ELIGIBLE entries with 4-cell arrays:
  1. Call `getImmediateThreats(preMoveBoard.board, preMoveBoard.colHeights, perspective)` to get the qualifying column list.
  2. Call `findMajorThreatWindows(preMoveBoard, perspective)` (T01a) and filter to windows where the empty cell's row matches `colHeights[col]` — i.e., the window anchored at the topmost empty cell in that column.
  3. Do the same for `getImmediateThreats(..., 3-perspective)` with `findMajorThreatWindows(..., perspective)` filtered to `owner='opponent'`.
- Each filtered window is already a CONCRETE-ELIGIBLE 4-cell array — convert to `{ cells, zoneSpec }` directly. These windows always qualify as CONCRETE-ELIGIBLE (≥3 discs of the owner in a 4-window is more than the ≥2 threshold in D2).
- Cell format: wire format `c${col+1}r${row+1}` (1-indexed).
- Owner: `perspective` player's threats → `owner='player'`; `3-perspective` player's threats → `owner='opponent'`.
- Returns: `AllowedSetEntry[]`. If `getImmediateThreats` returns nothing for either player (should not happen on a Type 1 path but guard it), return empty array.

**T10 — Implement group context block builder**
- File: `connect-four/server/llmCoachHelpers.js`
- Signature: `buildGroupContextBlock(groups: AggregatedGroup[], allowedSet: AllowedSetEntry[], board: Board, perspective: number): string`
- Formats the "Winning-line comparison" section per the M2 format in `coach_explanation_principles.md`.
- For each group: output `GROUP_k:` with cells, occupants (Green/Grey/empty), key completing cell, row parity, IS/NOT winning parity, `player_discs_in_group`, CONCRETE-ELIGIBLE/ABSTRACT-ONLY flag, `completed_freq` and `draw_freq` for A and B branches.
- KB parity rule reference: for each group, load the relevant parity KB entry (from leverage map in spec FR-024) and append one line.
- ASCII board replacement: replace `R` → `Green`, `Y` → `Grey`, strip `scr` row. Reuse `getBoardVisualization` output (already strips `scr` per `llmCoachHelpers.js:186` — verify this is actually done or add it).

---

### Phase E: Prompt templates

**T11 — Implement Type 4 prompt template**
- File: `connect-four/server/llmCoachHelpers.js`
- Function: `buildType4Prompt({ playerName, gap, gapBucket, contextBlock, inverted })`
- Template is verbatim from `coach_explanation_principles.md` Type 4 template (Role / Players / Hard grounding rules / Tone / Task sections).
- `inverted=true`: use inverted framing from FR-008 (gap < 0 ladder).
- `inverted=false`: use standard FR-016 bucket ladder (small/moderate/large).
- Move context section (FR-021): derive player identity from perspective, not hardcoded.
- "Major threats: none" when `findMajorThreatWindows(postABoard, perspective)` returns empty (FR-022).
- ASCII boards: embed pre-A, post-A, post-opponent-reply boards with Green/Grey substitution (FR-023).
- KB section loaded per leverage map (FR-024): `derived-parity-formula`, `allen-v1/v3` (Red) or `allen-v2/v4` (Yellow), `community-claimodd`, `allis-claimeven`. Conditionally add `community-z-threat` for mid-game positions with Z-threats present.

**T12 — Implement Types 1, 2 prompt template (FR-030)**
- File: `connect-four/server/llmCoachHelpers.js`
- Function: `buildType12Prompt({ playerName, gap, gapBucket, contextBlock, explainType })`
- Same skeleton as Type 4 **except** Role section uses type-neutral wording: "You are a Connect Four coach explaining why one move was stronger than another." (FR-030).
- Everything else (Players / Hard grounding rules / Tone / Task) identical to Type 4.
- No bespoke evidence blocks for Types 1 and 2 in this epic.

**T13 — Implement Type 3 stub template (FR-029)**
- File: `connect-four/server/llmCoachHelpers.js`
- Function: `buildType3Prompt({ playerName, gap, gapBucket, contextBlock, parityFlipData })`
- `parityFlipData`: `{ colA: number, colX: number, rowR: number, playerLabel: 'you'|'your opponent' }` — the three substitution slots for the frozen sentence.
- Task section adds exactly one sentence: "Playing in column [A] changes the number of empty squares in column [X], so [player] will now land on row [R] — the row that matters for winning there."
- Role, Players, Hard grounding rules, Tone: same as Type 4.
- The classifier (T06) must expose `colA`, `colX`, `rowR` for Type 3. `colX` = the column whose parity changed (= the played column `A` per R7 finding). `rowR` = `ROWS - board.colHeights[colX]` after placing (the new landing row, 1-indexed).

**T14 — Extract parity flip data from Type 3 classifier path**
- Modify `classifyExplanationType` (T06) to return not just the type string, but also an object for Type 3: `{ type: 'type3', parityFlipData: { colA, colX, rowR, playerLabel } }`.
- For other types: `{ type: 'type1'|'type2'|'type4' }`.
- This allows the prompt assembler to fill the Type 3 frozen sentence.

---

### Phase F: Rebuild `buildExplainContext`

**T15 — Replace `buildExplainContext` internals**
- File: `connect-four/server/index.js`
- Keep the function signature (`movestring, col, rounds`) and the return shape `{ prompt, allowedSet }`.
- Remove: `computeDeltaTable`, narration variable computation, `buildExplainPrompt` call.
- Add: `score_coached` computation (T04), all-moves-equal short-circuit (T04), type classification (T06/T14), group selection (T08), `allowedSet` construction (T09), context block builder (T10), prompt template dispatch (T11/T12/T13).
- **Sequence in new `buildExplainContext`** — the three-path flow is:
  1. Load `preScores` (existing)
  2. Compute `score_coached`, check all-moves-equal (T04)
  3. **Classify type first** (T06/T14) — classification uses only board state, no simulation
  4. **If Type 1**: build `allowedSet` directly from the pre-move board's immediate threat lines (identified by `getImmediateThreats`) — no simulation is run for Type 1. Skip to step 7.
  5. **If Types 2/3/4**: run simulations for A and B branches (`userResult` and `contrastResult`; now include `result.groups` from T02). Groups come from `userResult.groups` and `contrastResult.groups`.
  6. Select top groups and build `allowedSet` from simulation groups (T08, T09) — only for Types 2/3/4.
  7. Build context block (T10)
  8. Dispatch prompt template (T11/T12/T13)
  9. Return `{ prompt, allowedSet }`
- **Type 1 `allowedSet` construction**: For Type 1, `allowedSet` is built from `getImmediateThreats` results on the pre-move board. Each 4-cell immediate-threat window is converted to a CONCRETE-ELIGIBLE entry (the coached player or opponent already has ≥3 discs in it). Do **not** call `buildAllowedSet` (which expects `AggregatedGroup[]` from simulation) — use a dedicated `buildType1AllowedSet(preMoveBoard, perspective)` helper in `llmCoachHelpers.js`.
- **Quota handling update**: The endpoint handler at `index.js:764+` already calls `buildExplainContext` and checks for null return. The all-moves-equal path must now return `{ explanation: FROZEN_STRING, allowedSet: null }` from the **handler**, not from `buildExplainContext`. `buildExplainContext` returns `{ prompt: null, allowedSet: null, allMovesEqual: true }` as a signal; the handler converts it.
- Update `validateAnnotation` call at `:778` to pass `allowedSet`: `validateAnnotation(explanation, board, context.allowedSet)`.

---

### Phase G: Strong-form P5 gate upgrade

**T16 — Extend `validateAnnotation` with `allowedSet` parameter**
- File: `connect-four/server/annotationGate.js`
- New signature: `validateAnnotation(explanation, board, allowedSet = null)`
- When `allowedSet` is null/undefined: behavior unchanged (Epic A backward-compat — FR-031).
- When `allowedSet` is provided: add `checkP5Strong(zones, allowedSet)` to the failures array.
- `checkP5Strong(zones, allowedSet)` per FR-032:
  - `tg` zones: always fail strong-P5.
  - `col\d+` zones: pass if any `allowedSet` entry (CONCRETE or ABSTRACT-ONLY) has `col` matching the zone's column (0-indexed: `col4` → col 3) OR has a `cells` entry containing a cell in that column. Determine which column a `cells`-based entry touches by parsing the `c${col}r${row}` format of each cell in its `cells` array.
  - `c\d+r\d+` and `cells:...` zones: every cell must appear in at least one CONCRETE-ELIGIBLE entry's `cells` list. ABSTRACT-ONLY entries cannot satisfy cell-level checks (FR-033). **Note**: This check uses the `allowedSet` array directly (CONCRETE-ELIGIBLE = entries with a `cells` field); it does NOT call `getMajorThreatCells` or `findMajorThreatWindows` — those are simulation-time helpers, not gate-time.
  - `row\d+` zones: pass if any CONCRETE-ELIGIBLE entry contains a cell in that row.
- Failure code: `P5strong:tg`, `P5strong:cell_not_allowed:${spec}`, `P5strong:col_not_allowed:${spec}`.
- Export `checkP5Strong` for unit testing.

**T17 — Unit tests for strong-P5 gate**
- File: `connect-four/server/annotationGate.test.js`
- SC-001: `e86eeac9` fixture: occupied cells structurally absent from CONCRETE-ELIGIBLE entries' `cells` lists (these cells are occupied, hence `getOccupant` returns non-empty → ABSTRACT-ONLY treatment or excluded).
- SC-002: `403a21c9` fixture: strong-P5 now rejects the non-existent threat cell.
- Test: `tg` zone fails strong-P5 unconditionally.
- Test: `col4` zone passes if an ABSTRACT-ONLY entry has `col: 3`.
- Test: `c4r3` zone fails if no CONCRETE-ELIGIBLE entry contains that cell, even if an ABSTRACT-ONLY entry for col 3 exists.
- Test: `validateAnnotation(explanation, board)` (no `allowedSet`) — backward-compat: strong-P5 check is silently skipped.
- Test: `validateAnnotation(explanation, board, null)` — same, skipped.

---

### Phase H: DELETE list and documentation

**T18 — Callsite audit and deletion (FR-034, FR-035)**
- Run: `rg "computeDeltaTable|claimevenNarration|zThreatNarration|figure7Narration|jShapeNarration|buildExplainPrompt" connect-four/server/`
- Confirm zero callsites on Tier-1 path (`/api/explain-move`, `index.js:436`), in-game coach, lessons, challenges.
- Delete from `llmCoachHelpers.js`: `computeDeltaTable`, `PATTERN_NAMES` array (if only used by `computeDeltaTable`).
- Delete from `index.js` (`buildExplainContext`): `claimevenNarration`, `zThreatNarration`, `figure7Narration`, `jShapeNarration` variable computations.
- Delete the `buildExplainPrompt` function from `llmCoachHelpers.js` only after confirming it has no remaining callers.
- SC-006: grep returns zero results post-deletion.

**T19 — Update `server-conventions.md`**
- Add to "Forward Simulation" section: new `collectLeaves` output shape (groups field), total_leaves denominator definition.
- Update "LLM Coach Helpers" section: replace `computeDeltaTable` / narration helper references with new exported functions (`classifyExplanationType`, `buildAllowedSet`, `selectTopGroups`, `buildGroupContextBlock`). Document that `buildExplainContext` now returns `{ prompt, allowedSet }`.
- Update "Annotation Gate" section: document new optional `allowedSet` parameter, strong-P5 check behavior, backward-compat guarantee.

---

### Phase I: Regression harness extension

**T20 — Extend regression harness (FR-036, FR-037)**
- File: `connect-four/server/annotationGate.test.js` (or a dedicated `deepRevealRegression.test.js`)
- SC-001 assertion: for fixture `e86eeac9` (movestring `3444444335311110`), call `buildAllowedSet` with the groups from the simulation result and assert: no CONCRETE-ELIGIBLE entry's `cells` list contains `c2r1` or `c2r2`.
- SC-001 assertion: for fixture `8d83947e` (movestring `34`), assert no CONCRETE-ELIGIBLE entry's `cells` list contains `c5r2`.
- SC-002 assertion: for fixture `403a21c9`, assert `validateAnnotation(explanation, board, allowedSet)` returns `valid: false` with a `P5strong:` failure reason.
- SC-007 assertion: mock `POST /api/explain-move-llm` response shape is `{ explanation, prompt, cached? }` — no new fields.

---

## Task Ordering Summary

```
T01a (findMajorThreatWindows helper)
T01 (collectLeaves groups)     ← depends on T01a
T02 (aggregateLeaves groups + wire groups through explainSimulate) ← depends on T01
T03 (simulation tests)         ← depends on T01, T02
T04 (score_coached + isSettled allEqual) ← independent of simulation tasks
T06 (classifyExplanationType)  ← depends on T01a (uses findMajorThreatWindows)
T14 (parity flip from T3)      ← extends T06
T07 (classifier tests)         ← depends on T06, T14
T08 (selectTopGroups)          ← depends on T02 (groups wired through explainSimulate)
T09 (buildAllowedSet)          ← depends on T08
T09b (buildType1AllowedSet)    ← depends on T01a; can parallel T09
T10 (context block builder)    ← depends on T09
T11 (Type 4 prompt)            ← depends on T10
T12 (Types 1/2 prompt)         ← depends on T10; can parallel T11
T13 (Type 3 prompt)            ← depends on T10, T14; can parallel T11/T12
T15 (rebuild buildExplainContext) ← depends on T04, T06, T08, T09, T09b, T10, T11, T12, T13
                                   NOTE: T15 must implement classify-first flow (Type 1 skips simulation)
T05 (allMovesEqual unit test)  ← depends on T15
T16 (validateAnnotation extension) ← can start as soon as allowedSet shape is finalized (after T09)
T17 (strong-P5 tests)          ← depends on T16
T18 (DELETE audit + deletion)  ← depends on T15 (buildExplainContext fully replaced first)
T19 (server-conventions.md)    ← depends on T15, T16, T18
T20 (regression harness)       ← depends on T15, T16, T17
```

**Parallelizable groups**:
- Group 1 (serial prerequisite): T01a → T01 → T02 → T03
- Group 2 (after T01a): T04 (independent); T06 → T14 → T07
- Group 3 (after T02): T08 → T09 → T10 → T11/T12/T13 (parallel); T09b (parallel with T09)
- Group 4 (after T09): T16 → T17
- T15 waits for Groups 2 and 3 to complete; T15 implements the three-path flow (classify first → Type 1 skips simulation → Types 2/3/4 run simulation)
- T18, T19, T20 are final cleanup and hardening tasks

**New tasks added vs original plan**:
- T01a — `findMajorThreatWindows` helper (replaces direct `getMajorThreatCells` use for group-level operations)
- T09b — `buildType1AllowedSet` helper (builds allowedSet from board state for Type 1, bypassing simulation groups)

## Complexity Tracking

> No violations of constitution principles were found. This section is empty by design.

No new database migrations, no new API endpoints, no new frontend components. All changes are internal server-side refactoring within existing module boundaries.
