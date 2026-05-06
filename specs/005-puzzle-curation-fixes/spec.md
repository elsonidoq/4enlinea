# Feature Specification: Puzzle Curation & Classifier Fixes

**Feature Branch**: `005-puzzle-curation-fixes`  
**Created**: 2026-05-05  
**Status**: Draft  
**Input**: User description: "Create a spec following the feedback provided in docs/mvp/feedback_for_generate_v2.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Classifier Accuracy Fixes (Priority: P1)

As an annotator reviewing generated puzzles, I must only see puzzles that correctly match their stated category. False positives — positions classified as "Immediate Win" that are actually "Win in 2" or positions labelled "Forbidden Column" that have a winning move — break trust in the tool and waste review time.

**Why this priority**: Three systematic classifier bugs (C1, C2, C3) produce incorrect puzzle categories and broken highlight cells. They make the curation session unreliable before any UX improvements matter.

**Independent Test**: Can be tested by running the classifier against the eight known false-positive records in `false_positive_records` and confirming all are now correctly categorised or rejected. No UI changes required.

**Acceptance Scenarios**:

1. **Given** a position with odd `moveCount` where the best column score equals `immediateWinScore` but does not complete four-in-a-row, **When** the classifier runs, **Then** the position is NOT tagged `immediate_win`.
2. **Given** a position where the winning column score is strictly greater than `winScore`, **When** the classifier runs, **Then** the position IS tagged `immediate_win` (not `fork_setup` or `forced_block`).
3. **Given** a position in category 7 where the current player has at least one positive-score column, **When** the classifier runs, **Then** the candidate is rejected (not stored as `forbidden_column`).
4. **Given** a valid `forbidden_column` position (no positive-score moves), **When** the classifier runs, **Then** the position IS tagged `forbidden_column` using the `opponentWinScore` formula.

---

### User Story 2 - Correct Highlight Cell in Curation View (Priority: P1)

As an annotator, when I look at a puzzle the highlighted cell must mark the correct move. A missing or wrong highlight forces me to manually trace board states, which is slow and error-prone.

**Why this priority**: Without a correct highlight the curation session is nearly unusable for categories that depend on seeing the key move.

**Independent Test**: Open any of the two `58ebbed9`/`69dced55` positions in the curation UI and verify a cell is highlighted in the correct column.

**Acceptance Scenarios**:

1. **Given** a Cat 1 position where the winning column score equals `winScore`, **When** the curation view renders, **Then** that column's top-most empty cell is highlighted.
2. **Given** a Cat 1 position where the winning column score is strictly greater than `winScore`, **When** the curation view renders, **Then** that column's top-most empty cell is still highlighted.
3. **Given** any non-Cat-1 position with a valid highlight formula, **When** the curation view renders, **Then** the correct cell is highlighted (no regression).

---

### User Story 3 - Debug Trace Per Board (Priority: P2)

As an annotator trying to understand why a puzzle looks unusual, I can expand a debug panel that shows how the position was generated: solver scores per column, softmax weights, the temperature used, which column was sampled at each ply along with its probability, and the reason the rollout stopped (win, draw, max-moves reached).

**Why this priority**: Without a trace, unusual boards require manual external analysis; the trace converts a guessing exercise into a direct inspection.

**Independent Test**: Generate one board, open the curation view, expand the debug panel, and verify each of the listed fields is present.

**Acceptance Scenarios**:

1. **Given** a generated candidate, **When** the annotator opens the curation view, **Then** a collapsible debug section is visible.
2. **Given** the debug section is expanded, **Then** it shows per-column solver scores, per-column softmax weights, the temperature drawn, the sampled column at each ply, and the termination reason.
3. **Given** a candidate generated before the trace feature existed (legacy record), **When** the debug section is opened, **Then** it displays a "no trace available" message rather than crashing.

---

### User Story 4 - Skip Candidate Without Deciding (Priority: P2)

As an annotator, I can press a "Skip" button (or keyboard shortcut) to advance to the next candidate without recording any approve or reject decision.

**Why this priority**: The current forced-decision navigation blocks progress on uncertain or confusing boards, causing annotator fatigue and rushed decisions.

**Independent Test**: Load the curation view with at least two candidates; press Skip on the first; confirm the second is shown and the first remains in "pending" state.

**Acceptance Scenarios**:

1. **Given** multiple pending candidates, **When** the annotator activates Skip, **Then** the next candidate is shown.
2. **Given** the annotator skipped the current candidate, **When** reviewing the database, **Then** the skipped candidate still has status "pending" (no approve/reject recorded).
3. **Given** the annotator is on the last candidate and skips, **Then** the UI shows an appropriate "no more candidates" state without error.

---

### User Story 5 - Minimum Move Count Enforcement (Priority: P2)

As a curator, trivially sparse boards (very few moves played) are never presented because the system enforces a hard minimum of moves drawn randomly per rollout (between 14 and 34 inclusive), regardless of the temperature setting.

**Why this priority**: Low-temperature rollouts still produce near-empty boards. A hard minimum prevents candidates that are meaningless as puzzles.

**Independent Test**: Generate a batch of 50 candidates and verify no candidate has fewer than 14 moves in its `move_string`.

**Acceptance Scenarios**:

1. **Given** any temperature value, **When** the generator produces a rollout, **Then** the resulting position has at least as many moves as the minimum drawn for that rollout.
2. **Given** the minimum is drawn as a random integer in [14, 34], **When** the rollout ends before reaching that count, **Then** the candidate is discarded and a new rollout starts.
3. **Given** the rollout reaches `max_moves` without finding a valid position meeting minimums, **Then** the generator logs a warning and moves to the next seed.

---

### User Story 6 - Human-Readable Category Name (Priority: P2)

As an annotator, the curation view shows the category's human-readable name (e.g., "Immediate Threat", "Forced Block") instead of a bare number, so I know what pattern to look for without consulting an external reference.

**Why this priority**: Category numbers are opaque; the name tells the annotator what to evaluate.

**Independent Test**: Load any candidate in the curation view and verify the category field shows text, not a digit.

**Acceptance Scenarios**:

1. **Given** a candidate tagged with category 1, **When** the curation view renders, **Then** it displays "Immediate Win" (or equivalent human-readable label), not "1".
2. **Given** any other valid category number, **Then** its corresponding label is shown.
3. **Given** an unknown or missing category, **Then** a fallback label (e.g., "Unknown") is shown rather than a blank or crash.

---

### User Story 7 - UI Polish: Escape Key & Button Labels (Priority: P3)

As an annotator, pressing Escape closes the reject modal, and the "Reject all" button is renamed "Delete all pending" with an updated confirmation message that makes clear it deletes un-reviewed candidates, not rejected ones.

**Why this priority**: Small friction reducers; important for usability but do not block curation.

**Independent Test**: Open the reject modal; press Escape; confirm it closes. Then verify the button label and confirmation text are updated.

**Acceptance Scenarios**:

1. **Given** the reject modal is open, **When** the user presses Escape, **Then** the modal closes without taking any action.
2. **Given** the curation view, **When** the user looks at the bulk-action button, **Then** its label reads "Delete all pending" (or equivalent).
3. **Given** the user clicks "Delete all pending", **When** the confirmation dialog appears, **Then** the message states that un-reviewed (pending) candidates will be permanently deleted.

---

### User Story 8 - Multi-Move Highlight for Complex Patterns (Priority: P3)

As an annotator reviewing Fork Setup (Cat 4), Zugzwang (Cat 5), or Parity Control (Cat 6) puzzles, the curation view highlights all cells that constitute the pattern, not just the first move. Each category has a different highlight shape: a two-move fork line for Cat 4, a forced game-end sequence for Cat 5, and the structural threat geometry for Cat 6.

**Why this priority**: Single-move highlights for multi-step patterns force manual tracing; complete highlights make complex positions reviewable at a glance.

**Independent Test**: Load one candidate of each multi-move category and verify the correct number of cells is highlighted per the algorithm below.

**Acceptance Scenarios**:

1. **Given** a Cat 4 (Fork Setup) candidate, **When** the curation view renders, **Then** the setup cell, the fork-creating cell (one ply later), and at least 2 resulting threat cells are highlighted.
2. **Given** a Cat 5 (Zugzwang) candidate, **When** the curation view renders, **Then** the full forced sequence from the puzzle position to game end (bounded at `K` plies) is highlighted, with loser-move cells and winner-move cells visually distinguished.
3. **Given** a Cat 6 (Parity Control) candidate, **When** the curation view renders, **Then** all live parity threat cells and their immediate support cells (the cells directly below each threat) are highlighted.
4. **Given** a Cat 1 or Cat 2 puzzle (single-move pattern), **Then** only one cell is highlighted (no regression).
5. **Given** any candidate whose `highlight_cells` field is null or empty (legacy record or algorithm fallback), **Then** a single-cell highlight is shown using the existing `deriveHighlightCol` logic.

---

### User Story 9 - Consolidate c4solver Wrappers (Priority: P3)

As a developer maintaining the generation pipeline, there is a single canonical Node.js wrapper around the `c4solver` binary. Both `candidate-generator.js` and `index.js` import it. The wrapper always returns exactly 7 scores, never echoing the move string.

**Why this priority**: Duplicate IPC implementations diverge over time and the inconsistent output format (scores vs. scores + move string) creates silent bugs upstream.

**Independent Test**: Run the full test suite for the server; both generation and curation paths invoke the shared wrapper, and all existing tests pass.

**Acceptance Scenarios**:

1. **Given** the shared wrapper module, **When** a position is solved, **Then** it returns exactly an array of 7 numbers (one per column).
2. **Given** `candidate-generator.js` and `index.js`, **Then** neither contains its own IPC loop for `c4solver`; both import from the shared wrapper.
3. **Given** the book is loaded (O(1) lookup path), **When** the wrapper is called, **Then** it still returns 7 scores without the move string.

---

### Edge Cases

- What happens when a candidate was generated before debug-trace storage existed (legacy record) and the annotator opens its debug panel?
- How does the classifier handle a position where every column is `−1000` (draw or all columns full)?
- What happens when a `forbidden_column` candidate has scores that are all negative but not equal to `opponentWinScore`?
- How does the UI handle a category number that has no entry in the label map?
- Cat 4 only: what if applying the setup move and scanning all follow-up columns finds no move that creates ≥2 threats? (The Cat 4 heuristic is loose; a fallback to single-cell highlight must exist.)
- Cat 5 only: what if the solver returns equal scores for multiple columns at a ply in the PV trace? (Tiebreaker must be deterministic; see FR-015b.)
- Cat 6 only: what if no live parity threats are found (e.g., the Cat 6 heuristic matched a position with no parity structure)? (Fall back to single-cell highlight.)

## Requirements *(mandatory)*

### Functional Requirements

**Classifier fixes:**

- **FR-001**: The Cat 1 classifier MUST verify an actual four-in-a-row via a board-level `checkWin` call after finding `score >= winScore && score > 0`; score comparison alone is insufficient.
- **FR-002**: The Cat 1 classifier condition MUST use `>=` (not `===`) when comparing a column score to `winScore`.
- **FR-003**: The `deriveHighlightCol` function in the curation UI MUST use `>=` (not `===`) when matching a column score to `winScore` for category 1.
- **FR-004**: The classifier MUST include a `case 7` branch that tags positions as `forbidden_column` when at least one legal column has `score === opponentWinScore` AND no column has a positive score.
- **FR-005**: The candidate generator MUST reject any Cat 7 candidate where `scores.some(s => s > 0)`.

**Debug trace:**

- **FR-006**: The generator MUST record a debug trace for each generated candidate containing: per-column solver scores, per-column softmax weights, temperature drawn, per-ply (column sampled + scores + probabilities), and termination reason.
- **FR-007**: The debug trace MUST be persisted alongside the candidate record so it is retrievable in the curation view.
- **FR-008**: The curation view MUST display the debug trace in a collapsible section per candidate; legacy candidates with no trace MUST show a "no trace available" message.

**Navigation:**

- **FR-009**: The curation view MUST provide a Skip action that advances to the next candidate without recording any decision.
- **FR-010**: A skipped candidate MUST retain its existing status (pending) unchanged.

**Generation quality:**

- **FR-011**: The generator MUST draw a minimum move count from `randint(14, 34)` per rollout and discard any candidate that does not meet it.

**UI labelling:**

- **FR-012**: The curation view MUST display the human-readable category name, not the category number.
- **FR-013**: The bulk-delete button MUST be labelled "Delete all pending" and its confirmation message MUST state that un-reviewed (pending) candidates will be deleted.
- **FR-014**: The reject modal MUST close when the user presses Escape.

**Multi-move highlight — data model:**

- **FR-015**: The candidate record MUST store a `highlight_cells` field: an ordered array of `{col, row}` objects (0-indexed) computed at generation time. The curation view renders this array directly; it performs no pattern detection at render time. If the field is absent or empty, the UI falls back to the existing single-cell `deriveHighlightCol` logic.

**Multi-move highlight — Cat 4 (Fork Setup):**

- **FR-015a**: At generation time, after a candidate is classified as Cat 4, the generator MUST compute `highlight_cells` using the following board-level algorithm (no extra solver calls required):

  1. Let `P` = current board, `C` = candidate column (0-indexed), `heights` = column heights.
  2. `setup_cell = {col: C, row: heights[C]}`. Apply piece at `setup_cell` → board state `B1`; update heights to `H1`.
  3. For each legal column `f` in `B1` (i.e., `H1[f] < 6`): temporarily apply the current player's piece at `{col: f, row: H1[f]}` → board state `B2_f`; count immediate wins for the current player in `B2_f` using `countWinningThreats(B2_f, currentPlayer)`. Collect all `f` where this count ≥ 2 into `fork_candidates`.
  4. If `fork_candidates` is empty: `highlight_cells = [setup_cell]` (fallback; no fork line found).
  5. Otherwise: pick `fork_col` from `fork_candidates` by most threats (highest count), breaking ties by closest to center column (col 3), then lower index. `fork_cell = {col: fork_col, row: H1[fork_col]}`. Apply piece at `fork_cell` → `B2`; update heights to `H2`.
  6. For each legal column `t` in `B2`: temporarily apply the current player's piece at `{col: t, row: H2[t]}`; call `checkWin`. Collect all `t` where `checkWin` returns true → `threat_cells = [{col: t, row: H2[t]} for each t]`.
  7. `highlight_cells = [setup_cell, fork_cell] + threat_cells`.

  *Note*: Step 3 advances to `B2_f` as if the current player plays `f` in `B1`, ignoring that it is actually the opponent's turn. This deliberately skips the opponent's response to expose the intended fork structure. The highlight shows "setup move → intended fork move → resulting threats", not a legal game line.

**Multi-move highlight — Cat 5 (Zugzwang):**

- **FR-015b**: Cat 5 candidates MUST pass a depth filter at generation time before being stored. Let `maxScore = max(scores)` where `scores` excludes illegal columns (score = −1000). The remaining plies to game end is `R = (43 − 2×|maxScore|) − moveCount`. Only store as Cat 5 if `R ≤ K` where `K = 6`. Candidates with `R > K` are too deep to produce a useful highlight and MUST be discarded.

- **FR-015c**: For candidates passing the depth filter, the generator MUST compute `highlight_cells` by tracing the principal variation (PV) forward from the puzzle position, alternating loser and winner, until the game ends. The algorithm:

  1. Initialise `move_string = candidate.move_string`, `heights` = computed from move string. `cells = []`.
  2. **Loser ply** (current player has all-negative scores): call solver on `move_string` → `scores`. Pick `best_col = argmax(scores)` excluding illegal columns, breaking ties by closest to center (col 3), then lower index. `row = heights[best_col]`. Append `{col: best_col, row, role: 'loser'}` to `cells`. Append `(best_col + 1)` to `move_string`; update `heights`.
  3. If game over (four-in-a-row or board full): stop.
  4. **Winner ply**: call solver on `move_string` → `scores`. Pick `best_col = argmax(scores)` (highest positive score), same tiebreaker. `row = heights[best_col]`. Append `{col: best_col, row, role: 'winner'}` to `cells`. Append `(best_col + 1)` to `move_string`; update `heights`.
  5. If game over or `cells.length ≥ K`: stop. Else go to step 2.
  6. `highlight_cells = cells`.

  The `role` field (`'loser'` / `'winner'`) is stored so the UI can colour the two players' cells differently. The tiebreaker must be identical at generation time and in any future re-computation to guarantee reproducibility.

**Multi-move highlight — Cat 6 (Parity Control):**

- **FR-015d**: At generation time, after a candidate is classified as Cat 6, the generator MUST compute `highlight_cells` using the following board-level algorithm (no extra solver calls required):

  1. Let `P` = current board, `moveCount` = move string length, `heights` = column heights. Since the classifier only assigns Cat 6 when `score > 0`, the current player (to move) is always the controller.
  2. **Parity formula**: cell `(r, c)` (0-indexed row, 0-indexed column) is the **controller's natural cell** if `(r − heights[c]) % 2 == 0` (even distance from the current column height). It is the opponent's natural cell if the distance is odd. Derivation: the controller moves next (move `moveCount+1`); in the isolated-column model the controller fills rows `heights[c]`, `heights[c]+2`, `heights[c]+4`, … (every other row starting from the next available one).
  3. For each column `c` (0 to 6): for each row `r` from `heights[c]` to 5 (empty rows in column c):
     - Check if `(r, c)` is the controller's natural cell (parity formula).
     - If yes: temporarily set `board[r][c] = controller`; call `checkWin(board, r, c, controller)`; restore. This "floating piece" placement is valid for threat detection even though rows below `r` may be empty — `checkWin` only examines neighbours in the four win directions.
     - If `checkWin` returns true: candidate parity threat at `(r, c)`.
     - **Undercut check**: if `r > heights[c]` (cell is not immediately playable), cell `(r−1, c)` is the opponent's natural cell (parity always alternates). Temporarily set `board[r−1][c] = opponent`; call `checkWin(board, r−1, c, opponent)`; restore. If this returns true, the threat at `(r, c)` is directly undercut (opponent wins before the controller reaches row `r`) — discard it.
  4. `live_threats` = all candidate parity threats that survived the undercut check.
  5. If `live_threats` is empty: `highlight_cells = []` (fallback to single-cell highlight).
  6. Otherwise: for each threat `{col: c, row: r}` in `live_threats`:
     - Add `{col: c, row: r, role: 'threat'}` to `highlight_cells`.
     - If `r > heights[c]` (has a support cell): add `{col: c, row: r−1, role: 'support'}` to `highlight_cells`.
  7. The `role` field (`'threat'` / `'support'`) is stored so the UI can render threat cells and their forced-opponent-support cells in different colours.

  *Caveat*: only direct (one-level) undercuts are checked. Transitive undercuts (opponent threat two or more rows below) are not detected. This is an acceptable approximation: it may retain some threats that are neutralised by deeper tactics, but the solver score already confirms the position is winning overall.

**Code consolidation:**

- **FR-016**: There MUST be a single shared `c4solver` wrapper module; `GeneratorSolver` and `Connect4Solver` MUST be removed and replaced by this shared module.
- **FR-017**: The shared wrapper MUST return exactly 7 numeric scores per invocation, never including the move string echo.

### Key Entities

- **Candidate**: A generated board position stored in the `candidates` table, with a move string, classifier tags, scores, category, `highlight_cells`, and debug trace.
- **highlight_cells**: A JSON array of `{col, row, role}` objects (0-indexed) stored on the candidate record. `role` is `'hint'` (single-move categories), `'loser'`/`'winner'` (Cat 5), or `'threat'`/`'support'` (Cat 6). Absent or empty → UI falls back to single-cell logic.
- **Debug Trace**: Per-candidate generation metadata (scores, weights, temperature, per-ply choices, termination reason) stored alongside the candidate.
- **False Positive Record**: An annotator-flagged record in `false_positive_records` joined to a candidate; used as the regression test set for classifier fixes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 8 known false-positive records are correctly handled after the fixes — either reclassified to the correct category or rejected at generation time — with zero remaining misclassifications among them.
- **SC-002**: No candidate is presented to an annotator with fewer than 14 moves in its move string.
- **SC-003**: Every candidate shown in the curation view has a visible, non-null highlight cell for categories that define one.
- **SC-004**: An annotator can complete a curation session of 30 candidates without needing to consult any external reference to understand a category or a generation trace.
- **SC-005**: The existing server test suite passes without modification after the c4solver wrapper consolidation.

## Assumptions

- The `checkWin` helper already exists in `classifier.js` and is correct; it requires only integration into the Cat 1 branch.
- The `opponentWinScore` formula `−Math.ceil((41 − moveCount) / 2)` is correct for Cat 7; it is already implemented in the UI but missing from the classifier.
- Debug trace data volume per candidate is small enough to store in an existing JSONB or text column in the `candidates` table (no separate table needed).
- The `highlight_cells` array is also small enough to store in a JSONB column on the `candidates` table alongside the debug trace.
- The move-string echo from `c4solver` is never consumed by any downstream code path; the consolidation step verifies this before removing it.
- The minimum move count range [14, 34] is the agreed default; it replaces the current hardcoded value of 10.
- For Cat 4 and Cat 6, `highlight_cells` is computed entirely with board-level operations (`checkWin`, `countWinningThreats`); no additional solver calls are required.
- For Cat 5, the depth filter `K = 6` will reject most mid-game zugzwang positions. The yield of short zugzwang candidates from the random rollout stream is unknown; if yield is too low, the rollout policy may need adjustment in a future iteration.
- The parity formula `(r − heights[c]) % 2 == 0` identifies the controller's natural cells under the isolated-column model (controller fills even-distance rows, opponent fills odd-distance rows, counting from current column height). This is the standard approximation in Connect Four theory and covers the majority of live parity threats; cross-column parity interactions (Aftereven, Lowinverse) are not handled and may leave some undercuts undetected. The solver score confirms the position is winning overall regardless.
- The c4solver score convention is `score = floor((43 − movesWhenGameEnds) / 2)` where `movesWhenGameEnds` is the total stone count when the game terminates. The Cat 5 depth formula `R = (43 − 2×|maxScore|) − moveCount` may be off by 1 due to the floor; the filter is therefore slightly conservative, which is acceptable.
