# Feature Specification: Interaction Mode & forced_win Refactor

**Feature Branch**: `007-interaction-mode`  
**Created**: 2026-05-14  
**Status**: Draft  

---

## Overview

DecodeC4 currently validates `forced_win` puzzles by replaying a pre-stored move sequence. This feature replaces that fragile model with stateless per-move solver validation and introduces a parametrizable `CompletionStrategy` interface. To support multi-move sequence puzzles alongside existing single-click puzzles, an `interaction_mode` field is added to the puzzle schema and the frontend is wired to route each puzzle type to the correct handler.

Existing `forced_win` puzzles will be dropped and regenerated under the new model.

This is a prerequisite for the new puzzle categories in spec 008.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Forced-Win Sequence Puzzle (P1)

A learner opens a `forced_win` puzzle. They make a move; the AI immediately responds. The learner continues until they win or make a non-forcing move. The system reports success only if every learner move (except the final winning move) created an immediate four-in-a-row threat, and the final move creates a double threat that the AI cannot block.

**Why this priority**: This is the primary deliverable — replacing the stored-sequence model with live solver validation. Everything else in this spec is infrastructure to support it.

**Independent Test**: A tester opens a `forced_win` puzzle, plays a sequence of moves that each create an immediate threat, observes the AI blocking each time, wins the game, and sees a success screen.

**Acceptance Scenarios**:

1. **Given** a `forced_win` puzzle (sequence mode), **when** the learner plays a move that creates an immediate four-in-a-row threat, **then** the AI immediately responds and the board updates.
2. **Given** a `forced_win` puzzle, **when** the learner plays a final move that creates a double threat (two simultaneous immediate threats), **then** the system recognises the learner has won and shows a success screen.
3. **Given** a `forced_win` puzzle, **when** the learner plays a non-final move that does not create an immediate threat (fails the forced-block criterion), **then** the system ends the puzzle and shows a failure message explaining that the move was not forcing.
4. **Given** a `forced_win` puzzle, **when** the AI plays its response, **then** the AI move selection strategy is not specified in this feature — the exact AI response behaviour is deferred and out of scope here.

---

### User Story 2 — Interaction Mode Routing (P2)

The puzzle schema includes an `interaction_mode` field. The frontend routes `single_move` puzzles to the existing click-and-respond handler and `sequence` puzzles to the new multi-step handler.

**Why this priority**: This is the infrastructure layer. Without it, the sequence flow cannot coexist with existing single-move puzzles.

**Independent Test**: A tester observes that a `forced_win` puzzle opens the multi-step handler while any other category opens the existing single-move handler unchanged.

**Acceptance Scenarios**:

1. **Given** a puzzle with `interaction_mode = "single_move"`, **when** it loads, **then** the existing single-click evaluation flow is used with no behaviour change.
2. **Given** a puzzle with `interaction_mode = "sequence"`, **when** it loads, **then** the multi-step flow activates — the board accepts repeated moves until the puzzle is resolved.
3. **Given** all existing categories before this feature, **when** they load, **then** they behave exactly as before (zero regressions).

---

### Edge Cases

- What happens if the solver is unavailable during sequence play? The system shows an error state and does not record a blunder or a completion.
- What happens when the learner plays a move that completes four-in-a-row directly (without building up a forcing chain)? This is always a **fail**. A direct win implies an immediate winning opportunity already existed for the learner before the move, which violates FR-006(a) — "no immediate threat existed before the move." The failure reason is: "You had an immediate win available — play through the forcing sequence instead." There is no exception: even the very first move of the sequence cannot be a direct four-in-a-row.

---

## Requirements *(mandatory)*

### Functional Requirements

**Interaction Mode Field**

- **FR-001**: The puzzle schema MUST include an `interaction_mode` field with allowed values `single_move` and `sequence`, enforced by a DB migration.
- **FR-002**: All existing puzzles MUST be migrated to `interaction_mode = "single_move"` as the default.
- **FR-003**: All new non-`forced_win` categories (delivered in spec 008) MUST default to `interaction_mode = "single_move"`.
- **FR-004**: `forced_win` puzzles MUST use `interaction_mode = "sequence"`.
- **FR-005**: The frontend MUST route to different interaction handlers based on `interaction_mode`, with no change in behaviour for `single_move` puzzles.

**Forced-Win Refactor**

- **FR-006**: Each learner move in a `forced_win` sequence MUST be validated statelessly: the server receives the full move history (column sequence) up to and including the learner's move and checks the forced-block criterion using the existing `immediateWin` predicate: (a) before the learner's move, no immediate threat existed; (b) after the learner's move, at least one immediate threat exists. If either condition fails, the puzzle is immediately failed.
- **FR-007**: A `forced_win` puzzle is considered solved if and only if: (a) every learner move except the last satisfies FR-006, AND (b) the last learner move creates a double threat (two simultaneous immediate threats) that the AI cannot both block, resulting in the learner winning the game.
- **FR-008**: The `CompletionStrategy` interface MUST define a single method: `validateMove(position, col)` where `position` is the column-sequence string representing the board state *before* the learner's move and `col` is the column played. It returns `{ valid: bool, reason?: string }`. Future sequence categories implement this interface without changing the puzzle data model or the sequence handler.
- **FR-009**: The AI move selection strategy for sequence mode is **out of scope for this feature**. The exact mechanism for computing the AI's response move is deferred to a future spec.
- **FR-010**: Existing `forced_win` puzzles MUST be dropped and regenerated; stored move sequences are no longer used.

### Key Entities

- **Interaction Mode**: A field on each puzzle (`single_move` | `sequence`) that determines which client-side and server-side handler processes the learner's input.
- **CompletionStrategy**: An interface with a single method `validateMove(position, col) → { valid, reason? }`. `position` is the column-sequence string before the learner's move; `col` is the column played. The `forced_win` strategy checks the forced-block criterion (no prior threat, at least one new threat). Future strategies implement this interface without touching the data model or sequence handler.
- **Puzzle**: Unchanged data model except for the addition of the `interaction_mode` field.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The `forced_win` sequence flow accepts a correct multi-move forced sequence and rejects a non-forcing move within 2 seconds per move on average.
- **SC-002**: All existing puzzle categories (`immediate_threat`, `forced_block`, `double_threat`, `forced_win` pre-refactor, `forbidden_columns`) continue to function correctly with zero regressions after the interaction mode migration.

---

## Assumptions

- The `c4solver` binary is available on the server and is not modified; all solver calls follow existing integration patterns.
- Sequence mode is stateless on the server: each move request includes the full move history (column sequence), and the server validates the move independently without any session or stored game state.
- The exact AI response move selection strategy is out of scope for this feature (see FR-009).
- Grants for any new DB structures must be added explicitly, following the pattern established in migration 012.
- The six new single-move categories (spec 008) are not in scope here; they depend on the `interaction_mode` field delivered by this spec.
