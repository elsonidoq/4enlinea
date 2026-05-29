# Feature Specification: Classifier Board Refactor

**Feature Branch**: `009-classifier-board-refactor`
**Created**: 2026-05-26
**Status**: Draft

## Context

`connect-four/server/classifier.js` accumulates significant technical debt documented in `reports/classifier_technical_debt.md` (problems P1–P9). This refactor introduces a `Board` class as a single shared entry point, establishes a layered primitive hierarchy, eliminates mutable board mutation patterns, and removes duplicate utilities from `candidate-generator.js`. The external `classify()` API remains unchanged.

---

## User Scenarios & Testing

### User Story 1 — No-regression: classify() produces identical results (Priority: P1)

A developer runs the existing classifier test suite against the refactored code. Every test that passed before passes after. The external signature `classify(moves, candidateCol, scores) → { tag }` is unchanged. All `detect*` functions return identical `{ matched, highlightMetadata, categoryEvidence }` structures.

**Why this priority**: This is the correctness gate. The refactor has zero value if it breaks detection behaviour.

**Independent Test**: Run `npm test` in `connect-four/`. All classifier and candidate-generator tests pass without modification to the tests themselves.

**Acceptance Scenarios**:

1. **Given** the current test suite in `connect-four/tests/classifier/classifier.test.js`, **When** the refactored `classifier.js` is substituted, **Then** every test passes with the same result.
2. **Given** a position where `detectUndercut` previously returned `{ matched: true }`, **When** the refactored detector is called with the same movestring and scores, **Then** it returns `matched: true` with the same `highlightMetadata` cells.
3. **Given** a position where `detectOvercut` returned `matched: false`, **When** the same position is passed to the refactored version, **Then** it returns `matched: false`.

---

### User Story 2 — Board caching: single parse per classify() call (Priority: P2)

A developer profiling the puzzle generator observes that `parseBoardState` is no longer called more than once per `classify()` invocation. The `Board` instance created inside `classify()` is shared across all category checks and all detector calls.

**Why this priority**: Eliminates the four redundant parses (P1) and the per-call re-parses in each `detect*` function (P9), which together account for 5–7 `parseBoardState` calls per `classify()` today.

**Independent Test**: Instrument `parseBoardState` with a counter. For any single `classify(moves, candidateCol, scores)` call, the counter increments exactly once.

**Acceptance Scenarios**:

1. **Given** any valid movestring, **When** `classify()` is called, **Then** `parseBoardState` is called exactly once for that invocation.
2. **Given** a `Board` instance `b`, **When** `b.reachableThreats(player)` is called twice for the same `player`, **Then** the underlying free function `getReachableThreats` runs only once (result is cached on first call).
3. **Given** `b.withMove(col)`, **When** the returned `Board` is used, **Then** it parses independently and does not share cache state with `b`.

---

### User Story 3 — Immutability: no mutable board patterns remain (Priority: P2)

A developer reviewing the refactored code finds no instances of `board[r][c] = player` followed by `board[r][c] = 0` (the mutation+undo pattern). Hypothetical positions are obtained via `board.withMove(col)`.

**Why this priority**: Eliminates the class of correctness bugs where a missing undo leaves a corrupted board state (P7). Any code path that exits early without executing the undo is now safe by construction.

**Independent Test**: `grep -n 'board\[.*\]\[.*\] = [^0]' connect-four/server/classifier.js` returns no results inside any `detect*` function or `classify()`.

**Acceptance Scenarios**:

1. **Given** the refactored `classifier.js`, **When** grepped for the mutation+undo pattern (`board[r][c] = player; ... board[r][c] = 0`), **Then** no occurrences exist inside `detect*` functions or `classify()`.
2. **Given** any `Board` instance `b`, **When** any of its methods are called, **Then** `b.board` and `b.colHeights` are identical before and after the call.

---

### User Story 4 — T-rule predicates: named, shared, KB-referenced (Priority: P3)

A developer reading `detectUndercut` or `detectOvercut` sees clearly named predicate calls (`isT4SameParity`, `isT5Exception`, `isT2Blocking`) rather than inline boolean expressions, and can follow the `@see` JSDoc links to the KB entries that justify each guard.

**Why this priority**: Makes the Allen-rule logic self-documenting and prevents future divergence between the two detectors (P4).

**Independent Test**: Search for `isT4SameParity`, `isT5Exception`, `isT2Blocking` in `classifier.js` — all three exist as named exports. Both `detectUndercut` and `detectOvercut` reference all three. Each carries a `@see allen-t4`, `@see allen-t5`, `@see allen-t2` JSDoc tag respectively.

**Acceptance Scenarios**:

1. **Given** the refactored `classifier.js`, **When** grepped for `isT4SameParity`, **Then** it appears as a function definition with `@see allen-t4` in its JSDoc and is called in both `detectUndercut` and `detectOvercut`.
2. **Given** the refactored `classifier.js`, **When** grepped for `isT5Exception`, **Then** it appears with `@see allen-t5` and is called in both detectors.
3. **Given** the refactored `classifier.js`, **When** grepped for `isT2Blocking`, **Then** it appears with `@see allen-t2` and is called in both detectors.

---

### User Story 5 — candidate-generator.js deduplication (Priority: P3)

A developer examining `candidate-generator.js` finds that `buildBoard`, `getHeights`, `hasWon`, and `getForcedBlock` no longer exist as local functions. Their callers use a `Board` instance from `classifier.js` instead.

**Why this priority**: Removes the maintenance burden of keeping two independent implementations consistent (P8).

**Independent Test**: `grep -n 'function buildBoard\|function getHeights\|function hasWon\|function getForcedBlock' connect-four/server/candidate-generator.js` returns no results.

**Acceptance Scenarios**:

1. **Given** the refactored `candidate-generator.js`, **When** searched for local `buildBoard`, `getHeights`, `hasWon` definitions, **Then** none exist.
2. **Given** any call site that previously used `buildBoard(ms)`, **When** the refactored code runs, **Then** it constructs a `Board` instance and accesses equivalent state via `Board` methods.

---

### Edge Cases

- What happens when `withMove(col)` is called on a full column or an out-of-range index? `Board.withMove` throws a `RangeError` (see FR-004). All internal callers (detectors iterating columns) MUST skip full columns via `colHeights[col] >= ROWS` before calling `withMove`.
- What happens when the same `Board` method is called concurrently (if ever used in async contexts)? The lazy-write-once cache is single-threaded JavaScript; no lock is needed, but the spec must not assume thread safety.
- What happens when `getReachableThreats` is called on a full board? All columns have `colHeight == ROWS`; the function returns an empty map.
- What happens when `detectClaimeven` receives a `Board` instead of a movestring? The function must access `board.movestring` to construct the simulation movestring.

---

## Requirements

### Functional Requirements

#### Board class

- **FR-001**: The `Board` class MUST parse the movestring exactly once — in the constructor — by delegating to the existing `parseBoardState` free function.
- **FR-002**: The `Board` class MUST be immutable after construction: no method may mutate `this.board`, `this.colHeights`, or any cache entry after the constructor returns.
- **FR-003**: The `Board` class MUST enforce the following cache invariant:

  > Every cached value on a `Board` instance equals the result of calling the corresponding free function with the `board` and `colHeights` arrays produced by parsing `this.movestring` from scratch.

  This invariant is established by lazy write-once population on first access and preserved by immutability: no method mutates `this.board`, `this.colHeights`, or any cache entry after construction.

- **FR-004**: `Board.withMove(col)` MUST return a **new** `Board` instance constructed from `this.movestring + col.toString()`. It MUST NOT mutate the current instance. The new instance starts with an empty cache and satisfies the cache invariant independently. If `col < 0`, `col >= COLS`, or `this.colHeights[col] >= ROWS` (column full), `withMove` MUST throw a `RangeError` with a descriptive message (e.g., `"withMove: column <col> is full or out of range"`).
- **FR-005**: The `Board` class MUST expose the following methods with the caching behaviour noted:
  - `checkWin(row, col, player)` — delegates to free function; not cached (O(1) already).
  - `hasWon(player)` — cached per player.
  - `immediateThreats(player)` — cached per player; delegates to `getImmediateThreats`.
  - `reachableThreats(player)` — cached per player; delegates to `getReachableThreats`.
  - `winningWindows(row, col, player)` — not cached (varies by row/col).
  - `majorThreatCells()` — cached (player-independent); delegates to `getMajorThreatCells`.
  - `hasActiveDoubleThreat(player)` — cached per player.
  - `withMove(col)` — returns a new `Board`; see FR-004.
- **FR-006**: The `Board` class MUST expose `currentPlayer` (derived from `movestring.length % 2`) and `opponent` as readable properties, so detectors do not recompute them.

#### Layer 1 — Win detection free functions

- **FR-007**: `checkWin(board, row, col, player)` MUST remain a free export. Its implementation is unchanged.
- **FR-008**: `hasWon(board, player)` MUST be added as a free export that performs a full-board scan. It consolidates `hasWon` from `candidate-generator.js`. The `candidate-generator.js` local definition is removed.

#### Layer 2 — Threat primitive free functions

- **FR-009**: `getImmediateThreats(board, colHeights, player)` MUST be a free export (renamed from `countWinningThreats`). It returns a list of columns where `player` can win on the very next move (gravity-top check only). Complexity O(7).
- **FR-010**: `getReachableThreats(board, colHeights, player)` MUST be a new free export returning a `Map<col, row[]>` of all empty cells at or above `colHeights[col]` where placing `player` would win. Complexity O(42). This replaces the duplicated threat-collection loops in `detectUndercut`, `detectOvercut`, `detectFigure7`, and `detectJShape`.
- **FR-011**: `getWinningWindows(board, row, col, player)` MUST be promoted from a private helper inside `detectFigure7` to a free export. Its implementation is unchanged.
- **FR-012**: `getMajorThreatCells(board)` MUST be a free export (renamed from `buildThreatMap`). API unchanged; only the name changes.
- **FR-013**: `hasMajorThreatAt` MUST be removed. All callers must use `board.majorThreatCells()` or `board.reachableThreats()` instead.

#### Layer 3 — Interaction-rule predicates

- **FR-014**: `isT4SameParity(R, Rp)` MUST be a named free export implementing `R % 2 === Rp % 2`. It MUST carry a JSDoc `@see allen-t4` reference. Used by both `detectUndercut` and `detectOvercut`.
- **FR-015**: `isT5Exception(R, Rp)` MUST be a named free export implementing `(R === 5 && Rp === 2) || (R === 2 && Rp === 5)` (0-indexed rows 5 and 2 = 1-indexed rows 6 and 3). It MUST carry a JSDoc `@see allen-t5` reference. Used by both `detectUndercut` and `detectOvercut`.
- **FR-016**: `isT2Blocking(colThreats, R, Rp)` MUST be a named free export returning `true` when a current-player threat below `Rp` blocks via T2. Parameters: `colThreats` = array of current-player threat rows in the column (all rows where placing currentPlayer would win), `R` = current player's upper threat row, `Rp` = opponent's lower threat row (`Rp < R`). It MUST carry a JSDoc `@see allen-t2` reference. Implementation MUST check `colThreats.some(Rpp => Rpp < Rp && (sub-case 2 || sub-case 3))` where:
  - **Sub-case 2**: `Rpp % 2 === 0 && Rp % 2 === 1` — even current-player threat below odd opponent threat, any row distance.
  - **Sub-case 3**: `Rpp % 2 === 1 && Rp % 2 === 0 && Rpp + 1 === Rp` — odd current-player threat adjacent (immediately below) even opponent threat.
  Used by `detectOvercut` only. (`detectUndercut` applies U3 inline because it needs the single-column Rpp = R case.)
- **FR-017**: `hasActiveDoubleThreat(board, colHeights, player)` MUST be rewritten to use `getImmediateThreats` and `getMajorThreatCells` rather than inline mutation+undo loops. It remains a free export.

#### Layer 4 — Pattern detectors

- **FR-018**: All `detect*` functions MUST change signature from `(moves, scores)` to `(board: Board, scores)`. They MUST call `board.reachableThreats(player)` etc. rather than calling `parseBoardState` internally.
- **FR-019**: `detectUndercut(board, scores)` MUST use `isT4SameParity`, `isT5Exception`, and the sub-case 3 adjacency check (encoded in `isT2Blocking` or inline, see FR-016) to filter threats. The guard logic MUST be behaviourally identical to the current implementation. Specifically:
  - U1 guard: skip if `isT4SameParity(R, kill)` (same parity → T4, no interaction). `@see allen-t4`
  - U2 guard: skip if `isT5Exception(R, kill)` (rows 5+2 → T5, no interaction). `@see allen-t5`
  - U3 guard: skip if `R % 2 === 1 && kill % 2 === 0 && R !== kill + 1` (T2 sub-case 3 requires adjacency). `@see allen-t2`
- **FR-020**: `detectOvercut(board, scores)` MUST use `isT4SameParity`, `isT5Exception`, and `isT2Blocking` to determine if the opponent's threat is neutralised. The guard logic MUST be behaviourally identical to the current implementation. Specifically:
  - O1 guard: match only if at least one of `isT4SameParity`, `isT5Exception`, or `isT2Blocking` holds. `@see allen-t2`, `@see allen-t4`, `@see allen-t5`
- **FR-021**: `detectClaimeven(board, solver)` MUST accept a `Board` instance. It accesses `board.movestring` and `board.colHeights` directly.
- **FR-022**: Inside `detect*` functions, hypothetical placements MUST be computed via `board.withMove(col)` rather than in-place mutation of `board.board`. The mutation+undo pattern (`board[r][c] = player; ... board[r][c] = 0`) MUST NOT appear inside any detector.

#### Layer 5 — Public API

- **FR-023**: `classify(moves, candidateCol, scores)` MUST retain its current external signature and return type. Internally it MUST construct a single `new Board(moves)` and pass it to each category check. It MUST NOT call `parseBoardState` directly.
- **FR-024**: `classifyBestMove(moves, scores)` MUST retain its current external signature.
- **FR-025**: `classifyAll(moves, scores, solver?)` MUST be added as an exported function that constructs a single `new Board(moves)` and runs all detectors against it, returning an array of `DetectorResult` objects (one per detector, in the same order as the detector list in `classify()`). It MUST NOT call `parseBoardState` directly. It shares the single `Board` across all detectors.

#### Documentation

- **FR-026**: Every public method on `Board` and every exported free function MUST have a JSDoc comment that includes: (1) a one-line description of what the function computes, (2) a `@complexity` tag (e.g., `@complexity O(42)`), (3) a `@cache` tag stating `cached` or `not cached`, and (4) for any function encoding a strategic rule — a `@see` tag referencing the relevant KB entry slug (e.g., `@see allen-t2`). The presence of `@complexity` tags is the machine-verifiable proxy for SC-006.

#### candidate-generator.js deduplication

- **FR-027**: The local `buildBoard` function in `candidate-generator.js` MUST be removed. Callers MUST construct a `Board` instance and use `board.board` / `board.colHeights` where the raw arrays are needed.
- **FR-028**: The local `getHeights` function in `candidate-generator.js` MUST be removed. Callers MUST use `new Board(movestring).colHeights`.
- **FR-029**: The local `hasWon` function in `candidate-generator.js` MUST be removed. Callers MUST use the free `hasWon` export from `classifier.js`.
- **FR-030**: The local `getForcedBlock` function in `candidate-generator.js` MUST be removed. Its callers already have access to the classifier-level `forced_block` detection; or, if the function is still needed, it MUST be moved to `classifier.js` as a free export using `Board` primitives.

### Key Entities

- **Board**: Immutable value object wrapping a movestring. Created once per `classify()` call or per simulation step. Owns the parsed `board[row][col]` grid and `colHeights[col]` array; exposes them read-only. Caches layer-2 and layer-3 results keyed by player.
- **DetectorResult**: `{ matched: bool, highlightMetadata?, categoryEvidence?, correctCol? }` — return type of all `detect*` functions. Shape is unchanged from current implementation.
- **Allen predicate functions** (`isT4SameParity`, `isT5Exception`, `isT2Blocking`): Pure functions of numeric row arguments only; no board state. Shared between `detectUndercut` and `detectOvercut`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: All existing classifier tests pass without modification after the refactor.
- **SC-002**: `parseBoardState` is called exactly once per `classify()` invocation, as verified by an instrumented counter in a test or by code inspection.
- **SC-003**: No `board[r][c] = player` mutation (followed by undo) exists inside any `detect*` function or inside `classify()` after the refactor — verifiable by `grep`.
- **SC-004**: `isT4SameParity`, `isT5Exception`, and `isT2Blocking` each appear in both `detectUndercut` and `detectOvercut` — verifiable by `grep`.
- **SC-005**: `buildBoard`, `getHeights`, `hasWon`, and `getForcedBlock` no longer appear as local function definitions in `candidate-generator.js` — verifiable by `grep`.
- **SC-006**: Every exported free function and every public `Board` method carries a `@complexity` JSDoc tag — verifiable by `grep -c '@complexity' connect-four/server/classifier.js` and confirming the count equals the number of exports + public `Board` methods.
- **SC-007**: The `getReachableThreats` free function exists and replaces the duplicated threat-collection loop that previously appeared in `detectUndercut`, `detectOvercut`, `detectFigure7`, and `detectJShape` — verifiable by `grep` confirming the old loop is absent from all four detectors.
- **SC-008**: `classifyAll` is exported from `classifier.js` and, for any valid movestring, returns the same per-detector results as calling each `detect*` function individually with the same arguments — verifiable by a test that compares `classifyAll` output against individual detector calls on a representative set of positions.

---

## Clarifications

### Session 2026-05-26

- Q: How should the three T2 sub-cases be specified in FR-016? → A: Add explicit IF-THEN table to FR-016 copied from current classifier.js (sub-cases 2 and 3 within the chainT2 logic, with precise parameter names).
- Q: How should SC-006 be made objectively verifiable (currently says "code review")? → A: Require a `@complexity` JSDoc tag on every exported function/Board method; verifiable by grep count.
- Q: Should `classifyAll` be in scope for this refactor or deferred? → A: Include it — it's trivial post-refactor; promoted from optional (MAY) to required (MUST) in FR-025; SC-008 added.
- Q: What should `withMove(col)` do when called on a full or out-of-range column? → A: Throw a `RangeError` with a descriptive message; FR-004 and Edge Cases updated accordingly.
- Q: Should the 0-indexed row convention be promoted to an FR for this spec? → A: No — it is a project-wide invariant (only frontend display and c4solver calls translate; both are encapsulated outside classifier.js). Assumption reframed to reference the project invariant explicitly.

---

## Assumptions

- The existing test suite in `connect-four/tests/classifier/classifier.test.js` is sufficient to catch regressions; no new integration tests are required as part of this refactor (though they are welcome).
- JavaScript is single-threaded; no concurrency guards are required for the lazy cache population.
- The `withMove(col)` O(42) re-parse cost is acceptable for the current puzzle-generation workload. No pre-built state optimisation is in scope.
- `candidate-generator.js` callers that use the raw `board` array can be updated to access `new Board(ms).board` without API-level changes visible to callers of `generateCandidates`.
- Row coordinates throughout are 0-indexed (row 0 = bottom, row 5 = top) — this is a project-wide invariant. The two exceptions (frontend display, c4solver calls) are both outside this module. The Allen T-rule KB entries use 1-indexed rows in their source quotes; predicate implementations translate once at the KB boundary. Specifically, Allen's "row 3" = 0-indexed row 2, Allen's "row 6" = 0-indexed row 5. The `isT5Exception` check `(R === 5 && Rp === 2)` uses 0-indexed values. No translation is needed inside `classifier.js`.
