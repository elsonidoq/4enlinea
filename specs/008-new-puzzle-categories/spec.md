# Feature Specification: New Puzzle Categories

**Feature Branch**: `008-new-puzzle-categories`  
**Created**: 2026-05-14  
**Status**: Ready for Plan  

---

## Overview

DecodeC4 currently has five puzzle categories: `immediate_threat`, `forced_block`, `double_threat`, `forced_win`, `forbidden_columns`. This feature adds six new single-move categories — `z_threat`, `claimeven`, `undercut`, `overcut`, `figure_7`, `j_shape` — each with server-side detection predicates, DB slug constraints, per-category correct-answer logic, and visual highlights and explanations.

All six categories use the existing single-move model (`interaction_mode = "single_move"`, delivered by spec 007).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single-Move Tactical Puzzles (P1)

A learner encounters a puzzle from any of the new categories. The board is presented with an appropriate visual highlight. The learner clicks a column. The system immediately responds with correct, wrong, or tied, and shows an explanation of why.

**Why this priority**: Single-move puzzles are the core interaction model. Delivering at least one new working category validates the full pipeline (detection → storage → presentation → feedback).

**Independent Test**: A tester opens a `z_threat` puzzle, clicks the highlighted column, and receives "correct" with a count badge and text explanation showing the Z-threat cell count.

**Acceptance Scenarios**:

1. **Given** a `z_threat` puzzle is loaded, **when** the learner clicks the Z-threat column (the unique odd-count column confirmed winning by the solver), **then** the system responds "correct" and displays the capsule highlight covering all cells from the current column height up to the threat cell, plus a count badge above the board.
2. **Given** a `z_threat` puzzle is loaded, **when** the learner clicks any other column, **then** the system responds "wrong" and reveals the correct column with its highlight.
3. **Given** a `figure_7` puzzle is loaded, **when** the learner clicks the column that completes the Figure-7 structure, **then** the system responds "correct".
4. **Given** a `j_shape` puzzle is loaded, **when** the learner clicks the completing column, **then** the system responds "correct".
5. **Given** an `undercut` puzzle is loaded, **when** the learner clicks a column that does not activate the opponent's undercutting threat, **then** the system responds "correct".
6. **Given** an `overcut` puzzle is loaded, **when** the learner clicks the contested column (exploiting the overcut), **then** the system responds "correct".
7. **Given** a `claimeven` subtype A puzzle is loaded, **when** the learner clicks the unique equalising move, **then** the system responds "correct".
8. **Given** a `claimeven` subtype B puzzle is loaded, **when** the learner clicks the other odd column (not above Red's last move), **then** the system responds "correct".

---

### User Story 2 — Puzzle Highlights and Explanations (P2)

Visual highlights and textual explanations help learners understand why a move is correct. Each category has a defined highlight style and goal prompt.

**Why this priority**: Highlights and explanations are the primary pedagogical value of the training app; without them puzzles are bare exercises with no learning signal.

**Independent Test**: A tester opens a `z_threat` puzzle; a vertical capsule border outline is visible over the Z-threat column, spanning from the current column height to the threat cell. No interaction is required.

**Acceptance Scenarios**:

1. **Given** a `z_threat` puzzle, **when** the puzzle loads, **then** a vertical capsule (bottom semicircle, straight sides, top semicircle) is rendered as a border outline over all cells in the Z-threat column from the current height up to the threat cell, and a numeric badge floats above the board frame above that column.
2. **Given** an `undercut` puzzle, **when** the puzzle loads, **then** the dead threat cell and the killing threat cell below it are highlighted with visually distinct roles (e.g., different colours or icons).
3. **Given** an `overcut` puzzle, **when** the puzzle loads, **then** both the major threat cell and the opponent's neutralised lower threat are highlighted with distinct roles.
4. **Given** any new single-move puzzle, **when** the learner answers correctly or incorrectly, **then** the standard correct/wrong feedback text is shown (same hardcoded i18n strings used by existing categories).

---

### Edge Cases

- What happens if a `claimeven` puzzle has multiple correct answers? By construction this cannot occur: subtype A requires a *unique* equalising move (FR-002(b)); subtype B has exactly one baseinverse partner column (FR-003). No multi-accept logic is needed in the evaluator.
- What happens when a `z_threat` puzzle has no Z-threat column with exactly one solver-winning move? The position is rejected by the classifier and not stored as a `z_threat` puzzle.
- What happens if a `j_shape` completion cell is off-board? The classifier rejects the position; it is not stored as `j_shape`.

---

## Requirements *(mandatory)*

### Functional Requirements

**Detection & Classification**

- **FR-001**: The classifier MUST detect `z_threat` positions by identifying all columns where the count of empty cells from the current column height up to and including the threat cell (inclusive) is odd; exactly one such column must be confirmed winning by the solver. The threat cell row for a column is identified by scanning the column upward from `heights[col]` and bitboard-testing each empty cell: the first (lowest) cell whose placement completes a four-in-a-row for the current player is the threat cell. The empty-cell count is `threatRow - heights[col] + 1` (inclusive on both ends, 0-indexed from bottom).
- **FR-002**: The classifier MUST detect `claimeven` subtype A positions by verifying: (a) the board is not yet claimeven-valid before the move, (b) there exists a unique move after which all columns have even empty-space counts, and (c) the FR-004 claimeven simulation confirms Yellow wins after that move. Note: the simulation in FR-004 is the definitive correctness test — if Yellow wins the simulation, all parity conditions (including every Red odd-row winning line being undercut) are implicitly satisfied. No separate winning-line enumeration is required.
- **FR-003**: The classifier MUST detect `claimeven` subtype B positions by verifying: (a) exactly two columns have an odd number of empty spaces (the baseinverse pair), (b) Red just played in one of those two columns, and (c) the claimeven simulation from the resulting position confirms Yellow wins when Yellow responds in the other odd column.
- **FR-004**: The claimeven simulation algorithm MUST run as follows: identify the baseinverse pair (0 or 2 odd columns; any other count = not claimeven); simulate Red playing solver-optimal; Yellow plays above Red if Red played in a column whose empty-space count is even (`heights[col] % 2 === 0`), or plays the other paired column if Red played in a baseinverse-paired column (`heights[col] % 2 === 1`); if Yellow has no valid response the position is not claimeven; continue until a player wins; if Yellow wins the position is claimeven.
- **FR-005**: The classifier MUST detect `undercut` positions where the current player has a threat at row R in column C, and the opponent has a threat at a lower row R' < R in the same column C, making the current player's threat dead under perfect play. The position MUST additionally be confirmed as a winning position for the current player by the solver (pipeline-level pre-filter, consistent with all other categories).
- **FR-006**: The classifier MUST detect `overcut` positions where the current player has a threat at row R in column C that is above the opponent's lower threat at row R' < R in the same column C, and where the opponent cannot activate their lower threat without enabling the current player's win above. The position MUST additionally be confirmed as a winning position for the current player by the solver (pipeline-level pre-filter, consistent with all other categories).
- **FR-007**: The classifier MUST detect `figure_7` positions where the current player occupies **4 of the 5** cells of a Figure-7 structure, with one legal playable cell from that set still empty, and the solver confirming a win after the learner plays that missing cell. The puzzle asks the learner to create the Figure-7 trap, not to win immediately. All four structural variants MUST be checked:
  1. **Ascending + right** (Generation doc canonical): diagonal `{(x,y),(x+1,y+1),(x+2,y+2)}` + horizontal `{(x+2,y+2),(x+3,y+2),(x+4,y+2)}`.
  2. **Ascending + left** (Design doc canonical, e.g. `{C1,D2,E3}` + `{C3,D3,E3}`): diagonal `{(x,y),(x+1,y+1),(x+2,y+2)}` + horizontal `{(x+2,y+2),(x+1,y+2),(x,y+2)}`.
  3. **Descending + right**: diagonal `{(x,y),(x-1,y+1),(x-2,y+2)}` + horizontal `{(x-2,y+2),(x-1,y+2),(x,y+2)}`.
  4. **Descending + left**: diagonal `{(x,y),(x-1,y+1),(x-2,y+2)}` + horizontal `{(x-2,y+2),(x-3,y+2),(x-4,y+2)}`.
  The horizontal mirror transform is `f(col, row) = (6 - col, row)` (0-indexed), per Design doc Q20. The `highlight_metadata.cells` array contains the 4 already-placed cells as `pattern_piece` entries; `correctCol` is the column of the one empty template cell. No ordering requirement on the cells array.
- **FR-008**: The classifier MUST detect `j_shape` positions where the current player occupies **3 of the 4** cells of a J-shape structure — e.g., `{D1, D3, E2}` with E3 still empty and legal (or the horizontal mirror `{D1, D3, C2}` with C3 empty) — the completing cell is on-board and playable (at the column's current height), the opponent does not occupy the row immediately above the completing cell in any column that appears in the full J-shape template at the completing cell's row (formally: for each column `col` present in the template at row `completingRow`, `!Occupied(opponent, col, completingRow+1)`; e.g., for completing cell E3 in the canonical J-shape `{D1,D3,E2,E3}`, check `!Occupied(opponent, D, 4)` and `!Occupied(opponent, E, 4)` in 1-indexed notation — this matches Design doc Q17's guard against Black controlling d4/e4), and the solver confirms a win after the learner plays that completing cell. The puzzle asks the learner to establish the J-shape trap, not to win immediately. The horizontal mirror transform is `f(col, row) = (6 - col, row)` (0-indexed columns), per Design doc Q15.
- **FR-009**: All new category slugs (`z_threat`, `claimeven`, `undercut`, `overcut`, `figure_7`, `j_shape`) MUST be added to the DB constraint on the `category` column across the `puzzles`, `candidates`, `false_positive_records`, and `blunders` tables via a migration. The same migration MUST add a `highlight_metadata jsonb` column to both `candidates` and `puzzles`, and a `category_evidence jsonb` column to `candidates`, with explicit GRANTs for all new columns.

**Puzzle Answers**

- **FR-010**: For `z_threat` puzzles, the correct answer MUST be the unique Z-threat column confirmed winning by the solver.
- **FR-011**: For `claimeven` subtype A puzzles, the correct answer MUST be the unique equalising move column.
- **FR-012**: For `claimeven` subtype B puzzles, the correct answer MUST be the column of the baseinverse partner (the odd column Red did not just play in).
- **FR-013**: For `undercut` puzzles, any column that does not activate the opponent's undercutting threat MUST be accepted as correct. Playing in column C (the column identified by FR-005) is the only wrong answer: doing so advances the column toward the `killing_threat` row, which the opponent can then claim, permanently rendering the current player's `dead_threat` unreachable. Any other column avoids this and is therefore correct.
- **FR-014**: For `overcut` puzzles, the correct answer MUST be the column containing the overcut (where the current player's major threat sits above the opponent's neutralised threat).
- **FR-015**: For `figure_7` puzzles, the correct answer MUST be the column of the missing cell that completes the Figure-7 trap (the 5th cell that establishes the full structure).
- **FR-016**: For `j_shape` puzzles, the correct answer MUST be the column of the missing cell that establishes the J-shape trap (the 4th cell that completes the structure).

**Highlights and Explanations**

- **FR-017**: `z_threat` puzzles MUST render a vertical capsule/stadium border outline on the Z-threat column spanning all cells from the current column height up to the threat cell (bottom semicircle → straight sides → top semicircle), plus a numeric count badge above the board frame.
- **FR-018**: The `goal_prompt` text for `z_threat` puzzles MUST embed the cell count as a number. The `goal_prompt` is authored by the curator and stored in the DB; no LLM generation is involved.
- **FR-019**: `undercut` puzzles MUST highlight the dead threat cell and the killing threat cell using two named semantic roles: `killing_threat` (the opponent's cell that prevents the dead threat from ever being reached) and `dead_threat` (the current player's cell that is rendered unreachable).
- **FR-020**: `overcut` puzzles MUST highlight the major threat cell and the opponent's neutralised lower threat cell using two named semantic roles: `major_threat` (the current player's cell above) and `neutralised_threat` (the opponent's cell below that cannot be activated without enabling the current player's win).
- **FR-021**: After the learner answers, the standard correct/wrong feedback text MUST be shown using the existing hardcoded i18n strings (same as all other puzzle categories). No LLM-generated or category-specific explanation text is required.

**Curation Support**

- **FR-022**: `highlight_metadata` MUST be computed during candidate generation and stored in a new `highlight_metadata` jsonb column on the `candidates` table, using the same schema as `puzzles.highlight_metadata`.
- **FR-023**: The approve endpoint (`POST /api/admin/candidates/:id/approve`) MUST fetch the candidate row with `highlight_metadata` and `correct_col` included in the SELECT, then copy both fields to the created puzzle row. The request body does NOT carry these fields; the server reads them directly from the candidate row.
- **FR-024**: A new `category_evidence` jsonb column MUST be added to the `candidates` table. Its schema is category-dependent:
  - **`claimeven`**: `{ "subtype": "A"|"B", "baseinverse_pair": [col_index, col_index], "correct_col": col_index, "simulation_trace": [{ "col": int, "row": int, "player": 1|2 }, …] }` — full simulation trace as an ordered list of filled cells.
  - **`figure_7`**: `{ "pattern_cells": [{ "column": int, "row": int }, …] }` — the 4 already-placed cells forming the partial Figure-7.
  - **`j_shape`**: `{ "pattern_cells": [{ "column": int, "row": int }, …] }` — the 3 already-placed cells forming the partial J-shape.
  - All other new categories: `{}` (no extra evidence needed beyond `highlight_cells` and `solver_scores`).
- **FR-025**: The curation workspace MUST display `claimeven` candidates using the existing highlight_cells sequence rendering: the `simulation_trace` from `category_evidence` is converted to `highlight_cells` entries (player 1 moves → `role: "loser"`, player 2 moves → `role: "winner"`), showing how the board fills under the claimeven simulation. The baseinverse pair columns are shown as `role: "hint"` cells at their current playable height.
- **FR-026**: The curation workspace MUST render `z_threat` candidates by highlighting all cells in the Z-threat column between `fromRow` and `toRow` (inclusive) using `role: "z_range"`, and showing the badge count as a numeric label above that column.
- **FR-027**: The curation workspace MUST render `undercut` and `overcut` highlight cells with two visually distinct colors by role: `killing_threat` / `neutralised_threat` in orange; `dead_threat` / `major_threat` in purple.
- **FR-028**: The curation workspace MUST render `figure_7` and `j_shape` candidates by highlighting the partial pattern cells (`role: "pattern_piece"`) from `category_evidence.pattern_cells`, using a teal outline distinct from threat and hint highlights.
- **FR-029**: `GET /api/puzzles/:id` MUST include `highlight_metadata` in the DB SELECT and return it as `highlightMetadata` in the JSON response. It MUST also include `correct_col` in the SELECT and return it as `correctCol`. Both fields are required by `evaluatePredicate` for the new categories.

### Key Entities

- **Puzzle**: A board position (move string), category slug, correct answer(s), interaction mode, highlight metadata, and goal prompt text. Uses `interaction_mode = "single_move"` (delivered by spec 007).
- **Category**: A slug string constraining how a puzzle is classified, displayed, and evaluated. New slugs: `z_threat`, `claimeven`, `undercut`, `overcut`, `figure_7`, `j_shape`.
- **Claimeven Simulation**: A deterministic server-side simulation to determine if a position is claimeven-valid. Inputs: board position, baseinverse pair. Output: boolean (Yellow wins or not).

### Highlight Metadata Schema

Stored as a JSON object in the `highlight_metadata` column on the `puzzles` table and returned by `GET /api/puzzles/:id` as `highlightMetadata`. All row and column values are 0-indexed (column 0 = leftmost, row 0 = bottom row).

| Category | Schema |
|---|---|
| `z_threat` | `{ "type": "capsule", "column": <int>, "fromRow": <int>, "toRow": <int>, "badgeCount": <int> }` — `fromRow` is the current column height (first empty cell), `toRow` is the threat cell row, `badgeCount = toRow - fromRow + 1`. |
| `undercut` | `{ "type": "cells", "cells": [{ "column": <int>, "row": <int>, "role": "killing_threat" }, { "column": <int>, "row": <int>, "role": "dead_threat" }] }` |
| `overcut` | `{ "type": "cells", "cells": [{ "column": <int>, "row": <int>, "role": "neutralised_threat" }, { "column": <int>, "row": <int>, "role": "major_threat" }] }` |
| `claimeven` | `null` (no highlight rendered; simulation trace shown in curation only via `category_evidence`) |
| `figure_7` | `{ "type": "cells", "cells": [{ "column": <int>, "row": <int>, "role": "pattern_piece" }, …] }` — the 4 already-placed cells forming the partial Figure-7. |
| `j_shape` | `{ "type": "cells", "cells": [{ "column": <int>, "row": <int>, "role": "pattern_piece" }, …] }` — the 3 already-placed cells forming the partial J-shape. |

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six new puzzle categories are accessible in the puzzle trainer; learners can complete at least one puzzle from each category without encountering an error.
- **SC-002**: Classifier precision for each new category is at least 90%: fewer than 10% of stored puzzles per category are false positives. Measurement process: the project maintainer creates candidates via the curation frontend and gives a green light after manual review; those approved positions constitute the labeled set. The automated test in `tests/classifier/` runs the classifier against the labeled set and records precision. The merge gate fails if any category is below 90%.
- **SC-003**: The Z-threat capsule highlight and count badge are visible and correctly positioned for 100% of `z_threat` puzzle loads in supported browsers.
- **SC-004**: Learners presented with an `undercut` or `overcut` puzzle can correctly identify the highlighted cells' strategic roles without additional instruction. Measurement: one QA reviewer who has not read the goal_prompt must, on first viewing, correctly name which highlighted cell is the "killing" / "neutralised" cell and which is the "dead" / "major" cell for at least one undercut puzzle and one overcut puzzle. Pass = both roles identified correctly on both puzzles; record result in PR description.

---

## Out of Scope

- Admin UI for inspecting or tuning the classifier
- A standalone web interface or dedicated page for visualising the claimeven simulation (curation-time debug display via `category_evidence` is in scope)
- Performance optimisation of solver call batching in the classifier pipeline
- Multi-language explanations or goal prompts
- Difficulty ratings or ordering within new categories
- Any `interaction_mode` other than `single_move` for these six categories
- Exposing claimeven subtype (A/B) in the player-facing API or puzzles table

---

## Assumptions

- The `c4solver` binary is available on the server and is not modified; all solver calls follow existing integration patterns.
- Positions are encoded as move strings compatible with the existing server API; no new encoding format is needed.
- The existing `puzzles`, `candidates`, `false_positive_records`, and `blunders` tables accept new slug values without requiring a full table rebuild.
- `interaction_mode = "single_move"` and its DB column are already in place (delivered by spec 007); this spec depends on that migration being applied first.
- `claimeven` subtype A and subtype B puzzles share the same `claimeven` slug; subtype is stored in `candidates.category_evidence` for curation purposes but is not exposed in the `puzzles` table or the player-facing API.
- Mirror/reflection variants of `figure_7` and `j_shape` are handled by the classifier at detection time; the stored puzzle represents the canonical or mirrored position transparently.
- The frontend Board component supports additional highlight overlays (capsule shape) without requiring a fundamental rewrite of the rendering layer.
- The baseinverse pair in claimeven always consists of exactly 0 or 2 odd columns; positions with any other count are classified as non-claimeven and excluded.
- When a position matches multiple classifiers, the first matching category in the following priority order is used: `z_threat` > `undercut` > `overcut` > `claimeven` > `figure_7` > `j_shape`. All six new categories run after the five existing categories.
- Grants for new DB structures must be added explicitly, following the pattern established in migration 012.
- The claimeven integration test MUST include at least one subtype-B fixture where the baseinverse partner column has a different column-index parity than the column Red plays in, to distinguish empty-space-count parity from column-index parity. The known fixture is move string `4344444667` (10 moves, Red to play): baseinverse pair is columns 3 and 7 (1-indexed); if Red plays column 3 Yellow must respond in column 7, and vice versa. Column 3 (odd index) and column 7 (odd index) have the same index parity, so a correct subtype-B test must additionally use a pair with mixed index parity — this fixture alone does not cover that case. **The implementation MUST use `heights[col] % 2 === 1` (odd empty-space count), never `col % 2` (column index parity), to identify baseinverse columns.**
