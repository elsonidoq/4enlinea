# Feature Specification: Puzzle Generator Improvements

**Feature Branch**: `004-puzzle-gen-improvements`  
**Created**: 2026-05-05  
**Status**: Draft  
**Input**: Improve puzzle generation — realistic board sampling via solver-weighted play with opening book, and normalised player perspective (always RED).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Realistic Board Sampling (Priority: P1)

The puzzle generator currently samples positions by making purely random moves, producing unrealistically sparse boards that rarely contain the tactical patterns needed for interesting puzzles. This story replaces the random move-selection step with solver-weighted sampling: at each ply the generator queries solver scores, converts them to a probability distribution via softmax with a randomly sampled temperature, and draws the next move from that distribution.

The opening book must be loaded before generation begins so that the first ~8 plies are resolved in O(1) without solver queries, keeping generation time acceptable.

Temperature is sampled uniformly from [1, 3] per game using the seeded PRNG already used for move selection, ensuring full end-to-end determinism.

**Why this priority**: Sparse, unrealistic boards produce trivial or nonsensical puzzles. All downstream quality improvements depend on boards that resemble real competitive play. This is the foundational fix.

**Independent Test**: Run `generateCandidates(1, 10, <fixed_seed>)` and verify that returned boards have a median move count ≥ 14; no returned board has fewer than 8 moves; re-running with the same seed returns identical `move_string` values (determinism preserved).

**Acceptance Scenarios**:

1. **Given** a generation request with a fixed seed, **When** `generateCandidates` runs, **Then** all produced boards have ≥ 8 moves.
2. **Given** a generation request with a fixed seed, **When** `generateCandidates` is called twice with the same seed, **Then** the resulting `move_string` arrays are identical.
3. **Given** the opening book is loaded, **When** generating 30 candidates, **Then** generation completes in a reasonable time (no individual game rollout exceeds 30 seconds).
4. **Given** a temperature drawn from [1, 3] per game, **When** the PRNG state is seeded from the same global seed, **Then** temperature values are fully deterministic and within [1, 3].

---

### User Story 2 - Normalised Player Perspective (Priority: P2)

Puzzles are currently displayed with the user's color varying from puzzle to puzzle — sometimes RED, sometimes YELLOW — depending on whether the puzzle's `move_string` has an even or odd number of moves. This is confusing and makes Category 7 (Forbidden Columns) puzzles ambiguous.

This story normalises the visual representation so the user is always displayed as RED. When the current player at the puzzle position is actually player 2, piece colors are swapped in the renderer: player-2 pieces display as RED and player-1 pieces display as YELLOW. The solver scores, predicates, and `move_string` are untouched.

A persistent badge "You are RED ●" is shown on every puzzle board.

**Why this priority**: The board sampling fix (P1) improves candidate quality; this fix makes existing and new puzzles unambiguous and is a prerequisite for a trustworthy user experience. Can ship independently once P1 is done or in parallel on the UI layer.

**Independent Test**: Open a puzzle where `moveCount % 2 === 1` (user is player 2) and confirm the current player's pieces are rendered RED. Open a puzzle where `moveCount % 2 === 0` and confirm the same. Both boards must show the badge "You are RED ●".

**Acceptance Scenarios**:

1. **Given** a puzzle with an odd `moveCount` (user is player 2), **When** the board is rendered, **Then** player-2 pieces appear RED, player-1 pieces appear YELLOW, and the badge "You are RED ●" is visible.
2. **Given** a puzzle with an even `moveCount` (user is player 1), **When** the board is rendered, **Then** player-1 pieces appear RED, player-2 pieces appear YELLOW, and the badge "You are RED ●" is visible.
3. **Given** the display is normalised, **When** the user evaluates a Category 7 puzzle, **Then** the forbidden columns are visually consistent: they are columns that hand YELLOW (the opponent) an immediate win.
4. **Given** any puzzle, **When** the user submits a move, **Then** solver scores and predicate results are computed identically to before the display change (no regression in game logic).

---

### Edge Cases

- What happens when all solver scores are equal (flat distribution)? The softmax should still produce a uniform distribution; a move is selected without crashing.
- What happens when the opening book returns a score for a position but the board is already in a terminal state? Generation should detect termination (board full or win detected) and end the rollout gracefully.
- What happens when a puzzle's `moveCount` is 0 (empty board)? The normalisation logic should treat this as player 1 (RED) with no swap needed.
- What if the opening book file is missing at generation startup? The generator should fail fast with a clear error rather than silently falling back to slow full-tree solver queries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game rollout in `generateCandidates` MUST select each move by sampling from a softmax distribution computed over the current-position solver scores.
- **FR-002**: The softmax temperature MUST be sampled uniformly from [1, 3] at the start of each game rollout using the seeded PRNG.
- **FR-003**: The opening book MUST be loaded once before any game rollout begins and used for O(1) score lookup for positions it covers.
- **FR-004**: If the opening book file is absent, generation MUST fail immediately with a descriptive error message.
- **FR-005**: The seeded PRNG MUST be the sole source of randomness for both temperature sampling and move sampling, so that providing the same seed reproduces identical `move_string` outputs.
- **FR-006**: The board renderer MUST compute `userPlayer = (moveCount % 2 === 0) ? 1 : 2` for each puzzle and map `userPlayer`'s pieces to RED and the opponent's pieces to YELLOW.
- **FR-007**: Every puzzle board MUST display a persistent badge identifying the user's color (e.g., "You are RED ●").
- **FR-008**: Solver score retrieval, predicate evaluation, and `move_string` storage MUST remain unchanged by the display normalisation.
- **FR-009**: The `candidates` and `puzzles` tables MUST store a `user_player` column (value 1 or 2) indicating which player the user controls, for completeness and potential future server-side use.

### Key Entities

- **Game Rollout**: A simulated game from an initial board state to a candidate position. Now driven by solver-weighted move selection rather than pure random play.
- **Opening Book**: A pre-computed lookup table mapping board positions (by move string prefix) to solver scores. Loaded once at generation startup.
- **Temperature**: A per-game scalar in [1, 3] controlling how closely move selection follows the solver's best-move recommendation. Drawn from the seeded PRNG.
- **Softmax Distribution**: A probability vector over legal moves derived from solver scores divided by temperature, then exponentiated and normalised.
- **Candidate**: A board position with associated solver scores, category tag, and now a `user_player` field indicating perspective.
- **Puzzle Board Renderer**: The UI component that draws the game board. Extended to accept `userPlayer` and swap piece colors accordingly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Generated boards have a median move count ≥ 14 across a batch of 30 candidates (versus current median which can be as low as 6–8).
- **SC-002**: No generated board in a batch of 30 has fewer than 8 moves.
- **SC-003**: Calling `generateCandidates` twice with the same seed produces byte-identical `move_string` arrays (100% reproducibility).
- **SC-004**: Generating 30 candidates completes without any single rollout exceeding 30 seconds wall-clock time when the opening book is loaded.
- **SC-005**: 100% of rendered puzzle boards display the "You are RED ●" badge and render the current player's pieces as RED regardless of `moveCount` parity.
- **SC-006**: Zero regressions in predicate evaluation results for any existing test fixture when the display normalisation is applied.

## Assumptions

- The opening book file (`7x6.book`) already exists at the path used by the server and is accessible at generation startup.
- The existing `mulberry32` PRNG implementation in `candidate-generator.js` is used for temperature sampling without replacing it.
- "Reasonable time" for a 30-candidate batch is defined as under 5 minutes total on the development machine.
- The "You are RED ●" badge is a minimal, unobtrusive UI element — no animation or additional onboarding flow is required.
- `user_player` does not affect puzzle scoring logic; it is stored for display and future filtering purposes only.
- The opening book covers approximately the first 8 plies; positions beyond that still require live solver queries per move.
