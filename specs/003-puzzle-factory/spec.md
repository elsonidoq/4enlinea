# Feature Specification: Puzzle Factory (Internal Tool)

**Feature Branch**: `003-puzzle-factory`  
**Created**: 2026-05-04  
**Status**: Draft  
**Input**: User description: "Specify the puzzle internal tool according to @docs/mvp/internal_tool.md"

## Clarifications

### Session 2026-05-04

- Q: Should "mark as false positive" be a distinct action from "Reject", or a subtype? → A: Subtype of rejection — same Reject flow, annotator picks reason "False Positive / Classifier Bug".
- Q: What metadata is saved with a false-positive rejection? → A: Board state + misclassified category + optional free-text note from annotator.
- Q: How does a developer access the flagged boards? → A: No dedicated view — flagged boards are saved to persistent storage; a developer retrieves them via export or direct data access.
- Q: Is the Cleanliness Check (distractor detection) a UI toggle or automated? → A: Automated at generation time — the generator rejects any non-category-1 candidate with an immediate winning move, and any candidate where the predicate is satisfied by more than one move. No manual toggle needed. A lightweight visual hint for shortcutting moves is retained only inside the MultiMoveSequencer.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Candidate Generation (Priority: P1)

An internal operator triggers the tool to generate a batch of candidate puzzle positions for a given category (e.g., "Forbidden Columns"). The tool simulates games, evaluates board states against category-specific predicates, and produces a ranked list of candidates — all without human intervention.

**Why this priority**: The entire workflow depends on having a pool of candidates. Without automated generation, the curator has nothing to review. This is the foundational layer of the pipeline.

**Independent Test**: Can be tested by invoking the generation process for a single category and verifying that the output list contains board positions that satisfy the predicate for that category.

**Acceptance Scenarios**:

1. **Given** an empty candidate queue for "Forbidden Columns", **When** the operator runs a generation job for that category, **Then** the system produces a list of board positions where at least one legal column results in an immediate opponent win.
2. **Given** a generation job for "Double Threat", **When** the job completes, **Then** every returned position has at least 2 distinct winning threats for the active player after the flagged move.
3. **Given** a generation job for any category, **When** the job completes, **Then** each candidate is tagged with the category name and solver metadata (scores per column).

---

### User Story 2 - Candidate Review Dashboard (Priority: P2)

A human annotator opens the tool's web interface and sees per-category counts of pending candidates. They can navigate into a category queue, scan the list, and discard an entire batch if the generator produced low-quality results.

**Why this priority**: Annotators need visibility into queue health before committing time to individual review. Batch rejection prevents wasted effort on noisy generation runs.

**Independent Test**: Can be tested by pre-populating a category queue and verifying that the dashboard displays correct counts and that "Reject All" removes all pending items from that queue.

**Acceptance Scenarios**:

1. **Given** the dashboard is open, **When** the annotator views it, **Then** each puzzle category shows a count of pending candidates.
2. **Given** a category with 14 pending candidates, **When** the annotator clicks "Reject All", **Then** all 14 candidates are removed from the queue and the count drops to 0.
3. **Given** zero pending candidates in a category, **When** the annotator views the dashboard, **Then** the count shows 0 and the category entry is visually distinct (e.g., greyed out or marked empty).

---

### User Story 3 - Individual Curation Workspace (Priority: P2)

An annotator opens a candidate position and interacts with it: clicking columns to inspect solver scores and classifier tags, verifying that the predicate is satisfied, and approving or rejecting the puzzle.

**Why this priority**: This is the core human-in-the-loop step that determines puzzle quality. It must be efficient and provide all information needed to make an accurate pedagogical judgment.

**Independent Test**: Can be tested end-to-end by presenting a known candidate, simulating annotator interactions (column clicks, approval), and verifying the puzzle appears in the approved set with correct metadata.

**Acceptance Scenarios**:

1. **Given** a candidate is open in the workspace, **When** the annotator clicks any legal column, **Then** the interface displays the solver score for that column and the resulting classifier tags.
2. **Given** the annotator selects the move identified by the engine as the pattern-satisfying move, **Then** the Predicate Checklist shows green for all relevant goal criteria.
3. **Given** the annotator clicks "Approve", **Then** the puzzle is exported in the standard puzzle data format and removed from the pending queue.
4. **Given** the annotator clicks "Reject", **Then** the annotator is prompted to select a rejection reason (e.g., "Not educational", "Too close to end-game", "False Positive / Classifier Bug"); upon confirmation, the candidate is discarded and the next candidate is shown.
5. **Given** the annotator selects "False Positive / Classifier Bug" as the rejection reason, **Then** the system saves the board state, the misclassified category, and an optional free-text note provided by the annotator to persistent storage for developer review.
6. **Given** the annotator has submitted a false-positive rejection, **When** a developer exports or directly accesses the false-positive records, **Then** each record contains the board state, category, and note (if provided).
7. **Given** a Fork Setup or Parity sequence is being defined, **When** the annotator plays a move at an intermediate step, **Then** the interface visually flags any column that would immediately win the game (shortcutting the sequence) so the annotator can choose a move that keeps the sequence intact.

---

### User Story 4 - Multi-Move Sequence Definition (Priority: P3)

For Fork Setup and Parity puzzles, an annotator defines the start and end of the puzzle sequence and selects "cooperative" AI response moves — moves the AI makes that are legal but do not prematurely block the pattern being taught.

**Why this priority**: Multi-move puzzles require additional authoring beyond single-move approval, but they are only needed for two categories. Single-move categories (the majority) do not depend on this.

**Independent Test**: Can be tested by creating a Fork Setup candidate, walking through a 3-move sequence with manually selected AI responses, approving it, and verifying the exported puzzle contains the full move sequence.

**Acceptance Scenarios**:

1. **Given** a Fork Setup candidate is open, **When** the annotator marks a start position, plays through moves, and marks an end position, **Then** the sequence is recorded with the selected moves in order.
2. **Given** a sequence is being defined, **When** the annotator selects an AI response move, **Then** only legal columns that do not immediately block the pattern are offered as cooperative options (others are shown but visually flagged as non-cooperative).
3. **Given** a complete sequence is defined, **When** the annotator approves it, **Then** the exported puzzle contains the start position, all moves in order, and the cooperative response designations.

---

### Edge Cases

- What happens when the solver returns a draw or undefined score for a generated position?
- How does the system handle a generation job that produces zero candidates for a category (empty result)?
- What happens if the annotator navigates away mid-sequence without saving?
- How are duplicate candidate positions (same board state appearing in multiple generation runs) handled?
- What if the Predicate Checklist cannot verify a condition because the solver times out on a deep position?
- What happens if an annotator submits a false-positive rejection without providing a note — is the record still saved?
- Can the same board position be submitted as a false positive multiple times across different generation runs?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST generate candidate board positions by simulating games using a seeded PRNG, producing different boards across runs by default. An optional seed may be supplied to reproduce a previous batch exactly. The seed used MUST be stored with every candidate and returned in the generation response.
- **FR-001b**: The dashboard MUST provide a "Generate" control per category with a count input and an optional seed field. When no seed is entered, a random seed is used and displayed after the run completes.
- **FR-002**: The system MUST evaluate every candidate position against the Goal Predicate for the target category using the solver and bitboard classifier.
- **FR-003**: The system MUST attach solver scores for all 7 columns and applicable classifier tags to every candidate record.
- **FR-004**: The system MUST provide a dashboard view showing pending candidate counts per puzzle category.
- **FR-005**: The system MUST allow an annotator to reject an entire batch of candidates for a category in a single action.
- **FR-006**: The system MUST provide a per-candidate workspace showing the board position with the predicate-satisfying column pre-highlighted on initial render (derived from stored solver scores, no extra server call), a progress indicator showing how many candidates remain in the current batch, and a link to generate more when the batch is exhausted.
- **FR-006b**: The workspace MUST pre-populate the `goal_prompt` field with a category-specific default template that the annotator can edit before approving. Keyboard shortcuts (A = Approve, R = Reject, Enter = confirm) MUST be supported.
- **FR-007**: When an annotator clicks a column in the workspace, the system MUST display the solver score for that column and the resulting classifier tags.
- **FR-008**: The system MUST display a Predicate Checklist that indicates whether the annotator's selected move satisfies the category's goal predicate.
- **FR-009**: The candidate generator MUST reject any position for non-category-1 categories where an immediate winning move exists, and any position where the goal predicate is satisfied by more than one move. Cleanliness is enforced automatically at generation time, not by the annotator.
- **FR-009b**: During multi-move sequence definition (Fork Setup / Parity), the workspace MUST visually flag any column that would immediately win the game at an intermediate step, so the annotator can avoid shortcutting moves when selecting the human player's moves.
- **FR-010**: The system MUST allow an annotator to approve or reject each individual candidate. When rejecting, the annotator MUST select a rejection reason from a predefined list that includes "False Positive / Classifier Bug".
- **FR-014**: When an annotator rejects a candidate with reason "False Positive / Classifier Bug", the system MUST save a false-positive record containing the board state, the misclassified category, and an optional free-text note.
- **FR-015**: False-positive records MUST be persisted to storage in an exportable format accessible to a developer without requiring a dedicated UI view.
- **FR-011**: Approved puzzles MUST be exported in the standard puzzle data format defined in `specs/001-decodec4-mvp/data-model.md`.
- **FR-012**: For Fork Setup and Parity categories, the system MUST allow an annotator to define a multi-move sequence with a designated start position, end position, and per-turn AI cooperative response moves.
- **FR-013**: The system MUST NOT use LLM-generated natural language during candidate generation or the curation workflow.

### Key Entities

- **Candidate**: A board position flagged as potentially matching a category predicate. Has a board state, category tag, solver scores per column, classifier tags, and review status (pending / approved / rejected).
- **Puzzle**: An approved candidate enriched with pedagogical metadata (category, correct move(s), sequence for multi-move types). Stored in the standard export format.
- **Generation Job**: A parameterized run of the simulation and filter pipeline targeting one or more categories. Produces a batch of Candidates.
- **Move Sequence**: For Fork Setup and Parity puzzles — an ordered list of (player move, AI cooperative response) pairs with a defined start and end board state.
- **FalsePositiveRecord**: A board position rejected as a classifier false positive. Contains board state, the category that incorrectly matched it, and an optional annotator note. Used by developers to diagnose and fix category predicates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A human annotator can curate 50 MVP-quality puzzles in under 4 hours of total work.
- **SC-002**: The generator achieves a candidate-to-approval ratio of no worse than 3:1 across all categories (i.e., no more than 150 candidates need to be reviewed to yield 50 approved puzzles).
- **SC-003**: All 7 puzzle categories defined in the MVP spec have at least one approved puzzle produced by the tool within a single generation session.
- **SC-004**: Every approved puzzle passes predicate verification — 0 approved puzzles fail the goal predicate check on re-evaluation.
- **SC-005**: The curation workspace presents solver scores and classifier tags for a selected column within 2 seconds of the annotator's click.

## Assumptions

- The `c4solver` binary and bitboard classifier are available as callable services from the tool's backend — no re-implementation is needed.
- The puzzle data format is already specified in `specs/001-decodec4-mvp/data-model.md`; this tool must export to that format without modification.
- Only one annotator uses the tool at a time; no concurrent multi-user curation session support is required.
- The tool is an internal web application accessible only within the development environment; no authentication or access control is required beyond network isolation.
- Generation jobs may run asynchronously; the annotator does not need to wait for generation to complete before reviewing already-queued candidates.
- "Cooperative response" moves for multi-move sequences are selected manually by the annotator; the tool does not auto-generate them.
