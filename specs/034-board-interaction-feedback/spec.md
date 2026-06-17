# Feature Specification: Board Interaction Feedback

**Feature Branch**: `034-board-interaction-feedback`
**Created**: 2026-06-16
**Status**: Draft

## Overview

Two board-UX improvements for `ChallengeScreen`:

1. **Disc drop animation fix** — a one-line code change in `Board.jsx` so the drop animation plays only for the disc that was just placed, not for every disc on every render.
2. **forced_win double-threat highlight** — a verification-only task confirming that both threat cells are already highlighted correctly when a forced-win sequence reaches its double-threat step.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Only the placed disc animates (Priority: P1)

A learner clicks a column during a challenge. The disc they placed drops with the familiar animation. All other discs on the board — already placed from earlier moves — remain still. No visual noise from irrelevant discs re-animating.

**Why this priority**: The current bug causes every disc on the board to re-animate on every board render (puzzle load, puzzle advance, sequence-continue advance). This is the most visible and disruptive visual defect in the challenge flow.

**Independent Test**: Open any challenge, make a move. Only the newly placed disc should show the drop animation. All pre-existing discs should be still.

**Acceptance Scenarios**:

1. **Given** a challenge board with existing discs, **when** the user clicks a column to place a disc, **then** only the newly placed disc plays the drop animation; all other discs display instantly with no animation.
2. **Given** a challenge board, **when** the next puzzle loads (challenge-set advance via "Next →"), **then** all discs on the new board appear instantly with no drop animation.
3. **Given** a lesson-confirmation challenge, **when** the board loads with pre-placed discs, **then** all discs appear instantly with no drop animation.

---

### User Story 2 — Forced-win double-threat cells are highlighted (Priority: P2)

A learner completes the final move in a `forced_win` sequence. At the double-threat step, both cells that now contain unstoppable threats light up with the pulsing win-type overlay, making the tactical result visually clear.

**Why this priority**: This is a verification task — the code is already implemented. Confirming it works correctly is prerequisite to marking this epic done, but requires no code change.

**Independent Test**: Run a live `forced_win` puzzle to the success step and observe the board. Both `threatCells` returned by the server must show the pulsing green ring overlay.

**Acceptance Scenarios**:

1. **Given** a `forced_win` puzzle in sequence mode, **when** the user places the move that reaches `outcome === 'success'`, **then** both cells identified by `data.threatCells` are highlighted with win-type overlays (pulsing green rings).
2. **Given** `data.threatCells` is empty or missing, **when** the success step completes, **then** no win overlays are added (graceful no-op — guard already present in code).

---

### Edge Cases

- What happens when `lastDrop` is null (puzzle just loaded)? All discs must appear with `animation: 'none'`.
- What happens when the user is in sequence mode and a `continue` response arrives? The `continue` branch must animate the user's placed disc first, then the AI's response disc. Both discs animate — not neither. See FR-006.
- What happens if `data.threatCells` contains only one cell instead of two? Each cell in the array gets a win overlay; the code does not require exactly two cells.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Board component MUST apply `animation: 'drop 0.5s ease-out'` only to the disc whose position matches the `lastDrop` prop (`col === lastDrop.c && r === lastDrop.r`). All other non-empty discs MUST render with `animation: 'none'`.
- **FR-002**: When `lastDrop` is null, ALL discs MUST render with `animation: 'none'`. This covers every static board load scenario: initial puzzle load, puzzle-set advance, and lesson-confirmation board entry.
- **FR-003**: The Board component API MUST NOT change. The `lastDrop` prop already exists and is already passed by `ChallengeScreen`. No new Board props. `ChallengeScreen` itself requires changes only in `handleSequenceClick` (FR-006) and the Deep Reveal pane Board render (FR-007).
- **FR-004**: At the `forced_win` sequence success step, the overlay array MUST include one `win`-type entry for each cell in `data.threatCells` (shape `{ c, r }`, 0-indexed). This requirement is already implemented and requires only verification. Verification: inspect `handleSequenceClick` in `ChallengeScreen.jsx` at the `outcome === 'success'` branch (currently around line 426); confirm that `data.threatCells` is mapped to `win` overlays. Cross-check with `frontend-conventions.md` section "Forced Win / sequence branch" (note: the arch doc describes inline handling in `handleSequenceClick` — there is no standalone `SequenceHandler` component in the current codebase).
- **FR-005**: The `win` overlay visual (pulsing green ring) MUST be clearly distinguishable at the double-threat step so the learner can identify both tactical threats without confusion.
- **FR-006**: In the `continue` branch of `ChallengeScreen.handleSequenceClick` (currently lines 420-425), `setLastDrop` MUST be called for BOTH the user's placed disc AND the AI's response disc. The intended behavior is a staged two-step render: (a) set board to include only the user's disc and call `setLastDrop` for the user's disc (animates it), keeping `isSubmitting=true`; then (b) after a short delay (~300 ms), set board to include the AI's disc, call `setLastDrop` for the AI's disc (animates it), update `seqPosition`, and THEN clear `isSubmitting`. `isSubmitting` MUST remain `true` throughout the entire 300 ms window — clearing it in the `finally` block before the `setTimeout` fires would leave the board tappable and allow submission of a stale `seqPosition`.
- **FR-007**: The Board instance rendered inside the Deep Reveal pane (`DeepRevealPane`'s `boardContent` prop at ChallengeScreen lines ~570-594) MUST NOT trigger drop animations for discs placed before the pane was opened. The correct implementation depends on whether the pane is interactive: (a) if `canPlay` is always `false` when Deep Reveal is open (non-interactive), pass `lastDrop={null}` — the board is a static reference view and must never animate; (b) if `canPlay` can be `true` when Deep Reveal is open (interactive), pass the live `lastDrop` normally — suppressing it would hide the animation for a move made while the pane is visible. The implementer MUST verify which case applies before changing the prop (see T004).

### Key Entities

- **`lastDrop`**: `{ c: number, r: number }` (0-indexed column and row). Non-null only when a disc was just placed during live gameplay. Set to null on every puzzle load.
- **`threatCells`**: Array of `{ c: number, r: number }` (0-indexed) returned by `/api/puzzles/:id/sequence/move` when `outcome === 'success'`. Distinct from the `/check` endpoint's `{ col, row }` shape — do not conflate.
- **Overlay type `'win'`**: Renders as a pulsing ring (`boxShadow` + `pulse` animation) on the affected cell, indicating a winning or threat position.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On any board advance (puzzle load, challenge-set advance, lesson entry), zero discs display a drop animation.
- **SC-002**: When a user places a disc during live gameplay (single-move mode or sequence success), exactly one disc — the just-placed disc — displays the drop animation.
- **SC-003**: When a `forced_win` puzzle completes successfully, both threat cells returned by the server are visually highlighted before the learner taps "Next →".
- **SC-004**: No regression to any other Board prop or overlay type (existing win/tg/td/tr/claim overlays continue to render correctly).
- **SC-005**: In sequence-mode `continue` advances, the user's placed disc animates, followed by the AI's response disc animating after the staged delay.
- **SC-006**: The Board inside the Deep Reveal pane never displays a drop animation, regardless of `lastDrop` state.

---

## Assumptions

- All five Board-rendering screens (GameScreen, ReviewScreen, ExplorerScreen, SocraticScreen, ChallengeScreen) must be audited for `lastDrop` handling after the Board animation gate change. At minimum, ReviewScreen must be fixed to pass `lastDrop={null}` — it currently passes a live `lastDrop` that would animate on every step-back through a reviewed game. Other callers are expected to be safe but must be confirmed.
- Sequence-mode `continue` advances are IN scope (see FR-006). The staged render uses a `setTimeout` (or equivalent) inside `handleSequenceClick`; no new state variables are required beyond the existing `lastDrop` / `board` / `heights` state. `isSubmitting` must be held `true` for the entire 300 ms staged window — it is cleared inside the `setTimeout` callback, not in `finally`.
- The `forced_win` verification step requires a live puzzle that reaches the double-threat step (i.e., `data.threatCells` contains ≥2 entries). The verifier must source a specific double-threat puzzle from the database — a randomly drawn `forced_win` puzzle may end in an immediate win rather than a double-threat, bypassing the path under test. Use movestring `1115222555577773663636617` (project KB, solver-verified) or query the DB explicitly. Never construct a random movestring by hand.
- The `drop` CSS keyframe animation is already defined globally and does not need to be added or changed.
- There is no standalone `SequenceHandler` component in the codebase. The sequence interaction is handled entirely inline inside `ChallengeScreen.handleSequenceClick`. The `frontend-conventions.md` "Forced Win / sequence branch" section has been updated to reflect this.
- The Board-internal self-detect approach (using an internal ref or board-diff to identify the newly placed disc without a prop) was evaluated and deliberately rejected in favor of the existing `lastDrop` prop gate, which is already wired from all callers and requires minimal change.

---

## Not Included

- New sound effects (Epic 10)
- New overlay types beyond the existing string literals: `'win'`, `'tg'`, `'td'`, `'tr'`, `'claim'`
- Changes to puzzle correctness logic
- Fixes to `SocraticScreen` / `ConceptScreen` disc-drop behavior (already resolved separately)
- Animation for sequence-mode `wrong` (incorrect move) outcomes — only `continue` and `success` animate
