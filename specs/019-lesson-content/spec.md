# Feature Specification: Lesson Content (11 Lessons)

**Feature Branch**: `019-lesson-content`
**Created**: 2026-06-02
**Status**: Draft
**Epic**: Epic 5 — Lesson Content (11 Lessons)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Read Concept Slides for a Lesson (Priority: P1)

A user navigates from the Saga Map to any lesson and reads through its concept slides. Each slide presents Coach messages, a static annotated board diagram (with player-colored overlays and a legend), and an info prose card. The user taps Continue to advance through the slide sequence.

**Why this priority**: Concept slides are the primary pedagogical vehicle for all 11 lessons. Without authored content, no lesson has instructional value. This story covers the content that the Epic 4 ConceptScreen renders.

**Independent Test**: For each of the 11 lesson JSON files, load the `concept` screen with a mocked `GET /api/lessons/:id` response and verify: all `coachMessages` render in correct order; `boardSpecToBoard` produces a valid 6x7 board; all `overlays` appear at the specified cells; the legend renders matching swatches; `infoProse` text appears; the slide counter shows "N / M" correctly. This test can be run by loading any single lesson JSON and does not require any other lesson to exist.

**Acceptance Scenarios**:

1. **Given** a lesson JSON with 2 concept slides, **When** the ConceptScreen loads, **Then** slide 0 renders all coachMessages, boardSpec board, overlays, legendItems, and infoProse correctly.
2. **Given** a lesson JSON with `boardSpec` elements containing `'g'` and `'d'` characters, **When** the board renders, **Then** each `'g'` appears as a green disc (player 1) and each `'d'` as a gray disc (player 2) on the correct column and row.
3. **Given** a lesson with overlay types `tg`, `td`, `claim`, or `win` in `slide.overlays`, **When** the board renders, **Then** each overlay appears at the specified `(c, r)` coordinate with the correct visual token.
4. **Given** a legend with multiple `legendItems`, **When** the board renders, **Then** each legend entry shows the colored swatch matching the overlay type and the corresponding label text.
5. **Given** the user is on the last slide of Lesson 4 (reading-only, no socratic, no confirmation challenges), **When** they tap Continue, **Then** the lesson is marked complete and the user returns to the Saga Map.

---

### User Story 2 — Complete the Socratic Board for a Lesson (Priority: P1)

A user reaches the Socratic board in a lesson that includes one. The Coach announces a mistake on the board. The user must identify and play the winning column. They get two attempts; on the second wrong answer the correct column is highlighted before auto-advancing.

The Socratic state machine has four phases: `ask` (initial), `wrong1` (first mistake), `wrong2` (second mistake with auto-advance), and `correct` (user found the right column).

> **Note**: The mockup's Socratic screen shows a simplified 2-outcome model (`ask | wrong | correct`); this spec follows the authoritative 4-phase state machine (`ask | wrong1 | wrong2 | correct`) defined in Epic 4 and implemented in `src/lib/socraticReducer.js`.

**Why this priority**: 10 of the 11 lessons include a Socratic board. The Socratic interaction is the practice component that bridges concept slides to confirmation challenges. Without authored Socratic positions, these lessons cannot advance through the full lesson flow.

**Independent Test**: For each of the 10 lessons with a non-null `socratic` field, load the `socratic` screen with the lesson's `socratic.boardSpec` and `socratic.correctCol`. Verify all three phase transitions. This test needs only the lesson JSON; no API calls or puzzles are required.

**Acceptance Scenarios**:

1. **Given** the Socratic screen opens from a lesson with `socratic.boardSpec` and `socratic.correctCol: 4`, **When** the user taps column 4, **Then** the correct phase transitions to `correct`, the correct column receives a `win` overlay, and Continue appears.
2. **Given** phase = `ask`, **When** the user taps a wrong column, **Then** phase transitions to `wrong1` with the appropriate Coach message and the board remains interactive.
3. **Given** phase = `wrong1`, **When** the user taps the correct column, **Then** phase transitions to `correct`.
4. **Given** phase = `wrong1`, **When** the user taps another wrong column, **Then** phase transitions to `wrong2` and the correct column is briefly highlighted before auto-advancing after ~1500 ms.
5. **Given** phase = `wrong2`, **When** the auto-advance timer completes after ~1500 ms, **Then** the screen advances past the Socratic phase.
6. **Given** a completed Socratic on a lesson with `confirmationCategory`, **When** the user taps Continue, **Then** they navigate to the confirmation challenges screen.

---

### User Story 3 — Complete Confirmation Challenges and Finish a Lesson (Priority: P1)

After concept slides and the Socratic board, the user completes N confirmation challenges for the lesson's designated category. Correctly answering at least one completes the lesson and marks it done on the Saga Map. Reading-only lessons (Lesson 4) complete on the last slide without challenges.

**Why this priority**: Confirmation challenges are the final gate for lesson completion. They validate that the user can apply the lesson concept to real puzzle positions.

**Independent Test**: For each lesson with a non-null `confirmationCategory`, verify that the `clchallenge` screen can draw `confirmationCount` puzzles from `GET /api/puzzles/draw?category=<confirmationCategory>&n=<confirmationCount>`. This requires the puzzle DB to have approved positions for that category. For lessons where puzzle population is deferred (claimodd, overcut, undercut, figure_7, j_shape), this test will fail until Epic 6 — this is expected and documented.

**Acceptance Scenarios**:

1. **Given** a lesson with `confirmationCategory: "immediate_threat"` and `confirmationCount: 2`, **When** the user completes one puzzle correctly and taps Next on the second, **Then** the lesson is marked complete and the Saga Map node shows as done.
2. **Given** a lesson with `confirmationCategory: null` (Lesson 4), **When** the user taps Continue on the last concept slide, **Then** the lesson completes without any confirmation challenge screen.
3. **Given** a lesson with `confirmationCategory: "claimodd"` and `confirmationCount: 2`, **When** Epic 6 has populated the claimodd puzzle pool, **Then** the user can complete this lesson's confirmation challenges. (This scenario is blocked until Epic 6 for claimodd, undercut, overcut, figure_7, j_shape — see Assumptions.)
4. **Given** a lesson with `confirmationCount: 0` and a non-null `confirmationCategory`, **When** the user finishes the Socratic phase, **Then** the lesson completes without puzzles (treated as reading-only).

---

### Edge Cases

- **Lesson JSON missing required fields (`boardSpec` length != 7, missing `id`, etc.)**: The server logs an error and excludes that lesson; it does not crash. Affected lessons are not returned by `GET /api/lessons`.
- **Lesson 4 (reading-only) Socratic and confirmationCategory are both null**: The Epic 4 infrastructure handles this by advancing from last slide directly to completion.
- **Pro-category coach phrase pool is empty**: The Coach phrase selection falls back gracefully (missing pool = no coach phrase for that quality bucket for Pro patterns).
- **`detectClaimodd` fires before claimodd puzzles exist in the DB**: The detector itself works on any board; puzzles are simply not drawable via `GET /api/puzzles/draw` until Epic 6 populates the pool.
- **Undercut verification step finds zero approved puzzles with distinct undercut column**: Nothing blocks the lesson JSON content; Epic 6 receives the flag and populates the undercut pool with positions meeting the distinct-trap-column predicate.
- **Overcut `reason` field added without corresponding KB statement for each sub-case**: The reason string is exposed in the detector result for downstream consumption (LLM prompt) but does not require individual KB entries; the existing `community-overcut` KB article covers all sub-cases.
- **Socratic position is trivial (board is already solved before the user plays)**: The boardSpec positions must be authored to require exactly one move to win; if the board is already won, the Socratic interaction is skipped (the Epic 4 screen checks for a non-null `socratic` field, but the position itself must present a solvable challenge).
- **Pro-category lesson (Lessons 8–11) replayed by a paid user**: The full lesson content plays as normal; the paid tier gate is enforced by the Saga Map, not by the lesson JSON.
- **Lesson JSON has `confirmationCount` greater than available puzzles for that category**: `GET /api/puzzles/draw?n=<confirmationCount>` returns as many as available (fewer than requested); the clchallenge screen draws what it can and completes after the last drawn puzzle.

---

## Requirements *(mandatory)*

### Functional Requirements

**Lesson JSON Content Files (all 11)**

- **FR-001**: 11 lesson JSON files MUST be authored at `connect-four/lessons/lesson-NN-<slug>.json` where NN is the 2-digit lesson order (01–11) and slug matches the lesson's semantic identifier.
- **FR-002**: Each lesson JSON MUST validate against the Epic 4 schema: required fields `id`, `title`, `free`, `userPerspective`, `slides` (non-empty array), `socratic` (object or null), `confirmationCategory` (string or null), `confirmationCount` (integer >= 0). Each `boardSpec` MUST be an array of exactly 7 strings. Each string consists of `'g'` (green/player-1) and `'d'` (gray/player-2) characters from bottom to top.
- **FR-003**: All overlay `type` values in `slides.overlays` and `legendItems.type` MUST be drawn from the locked overlay enum (`tg`, `td`, `claim`, `win`). The `tr` overlay type (used in Position Explorer) MUST NOT appear in lesson content.

**Lesson 1 — Spot the Win (order: 1, free, userPerspective: "yellow")**

- **FR-004**: Lesson 1 MUST have 2+ concept slides. Slide 0: diagram showing three discs in a row with an open space at either end, `tg` overlay on the winning cell(s), Coach message introducing immediate threats. Slide 1: diagram where the opponent must block, `tg` overlays, Coach message about opponent blocking.
- **FR-005**: Lesson 1 MUST have a non-null `socratic` with a board where the user (Yellow) has an immediate win. `confirmationCategory` MUST be `"immediate_threat"`, `confirmationCount` MUST be 2.

**Lesson 2 — Block Before You Build (order: 2, free, userPerspective: "yellow")**

- **FR-006**: Lesson 2 MUST have 2+ concept slides showing forced block scenarios. Slide 0: opponent has a threat, the user must play in the blocking column. Slide 1: illustrating why blocking precedes building.
- **FR-007**: Lesson 2 MUST have a non-null `socratic` where the user must block an immediate opponent win. `confirmationCategory` MUST be `"forced_block"`, `confirmationCount` MUST be 2.

**Lesson 3 — The Fork (Double Threat) (order: 3, free, userPerspective: "yellow")**

- **FR-008**: Lesson 3 MUST have 2+ concept slides covering both fork flavours: (A) two threats in separate columns, (B) same column adjacent rows. Slide 0: Case A diagram with `tg` overlays on both threat columns. Slide 1: Case B diagram with `tg` overlays showing adjacent-row threats.
- **FR-009**: Lesson 3 MUST have a non-null `socratic` where the user creates a double threat. `confirmationCategory` MUST be `"double_threat"`, `confirmationCount` MUST be 2.

**Lesson 4 — Odd Rows Belong to Red (order: 4, free, userPerspective: "red", reading-only)**

- **FR-010**: Lesson 4 MUST have 2–3 concept slides. Slide 0: parity diagram showing which rows (1, 3, 5) belong to Red and which rows (2, 4, 6) belong to Yellow. Slide 1: why parity matters — the natural move order fills columns bottom-up. Slide 2 (optional): how parity sets up the foundation for Claimeven, Z-Threats, undercut/overcut.
- **FR-011**: Lesson 4 MUST have `socratic: null`, `confirmationCategory: null`, `confirmationCount: 0`. Lesson 4 completes on the last concept slide.

**Lesson 5 — Claimeven (order: 5, free, userPerspective: "yellow")**

- **FR-012**: Lesson 5 MUST have 2+ concept slides. Slide 0: Red plays low, the even square directly above (the claimeven response cell) is shown with `claim` overlay. Slide 1: after multiple claimeven responses, the board shows Yellow controlling multiple even-row cells with `claim` overlays. Coach messages explain the systematic mirroring: "always respond above Red."
- **FR-013**: Lesson 5 MUST have a non-null `socratic`. `confirmationCategory` MUST be `"claimeven"`, `confirmationCount` MUST be 2.
- **FR-014**: Lesson 5 MUST include `userPerspective: "yellow"` (claimeven is always taught as Yellow's strategy).

**Lesson 6 — Z-Threats (order: 6, free, userPerspective: "yellow")**

- **FR-015**: Lesson 6 MUST have 2+ concept slides. Slide 0: a board with a Z-Threat column, showing the odd count of empty cells between column top and threat cell. Coach message explains why odd count = ownership. Slide 1: how the opponent being forced to play the column fills the odd cells and enables the threat.
- **FR-016**: Lesson 6 MUST have a non-null `socratic`. `confirmationCategory` MUST be `"z_threat"`, `confirmationCount` MUST be 2.

**Lesson 7 — Claimodd (order: 7, free, userPerspective: "red")**

- **FR-017**: Lesson 7 MUST have 2+ concept slides. Slide 0: an all-even parity board diagram showing the problem for Red (claimeven gives Red even rows, which are the wrong rows). Slide 1: playing center column (col 3) to establish an odd-row anchor and create a Z-Threat. `claim` overlay on the center column anchor cell.
- **FR-018**: Lesson 7 MUST have `free: true` (Claimodd is a free lesson, not Pro). `userPerspective` MUST be `"red"`.
- **FR-019**: Lesson 7 MUST have a non-null `socratic`. `confirmationCategory` MUST be `"claimodd"`, `confirmationCount` MUST be 2.

**Lesson 8 — The Undercut (order: 8, free: false, userPerspective: "yellow")**

- **FR-020**: Lesson 8 MUST have 2+ concept slides. Slide 0: a board showing two threats in the same column (one upper, one lower) where the lower opposite-parity threat is reached first. Overlays: `td` on the killing threat cell, `tg` on the dead upper threat cell. Slide 1: the undercut concept — the lower threat wins because gravity fills bottom-up.
- **FR-021**: Lesson 8 MUST have `free: false` (Pro-gated). `confirmationCategory` MUST be `"undercut"`, `confirmationCount` MUST be 2.

**Lesson 9 — The Overcut (order: 9, free: false, userPerspective: "yellow")**

- **FR-022**: Lesson 9 MUST have 2+ concept slides. Slide 0: a same-parity scenario where the upper threat beats the lower threat (T4 rule). Overlays: `tg` on the winning upper threat cell. Slide 1: the active-forcing case where column parity makes the upper threat reachable first.
- **FR-023**: Lesson 9 MUST have `free: false` (Pro-gated). `confirmationCategory` MUST be `"overcut"`, `confirmationCount` MUST be 2.

**Lesson 10 — The Figure-7 Trap (order: 10, free: false, userPerspective: "yellow")**

- **FR-024**: Lesson 10 MUST have 2+ concept slides. Slide 0: a board with the five-disc Figure-7 configuration. Overlays: `tg` on all five pattern cells and both threat rows. Slide 1: why the opponent cannot block both threats in sequence.
- **FR-025**: Lesson 10 MUST have `free: false` (Pro-gated). `confirmationCategory` MUST be `"figure_7"`, `confirmationCount` MUST be 2.

**Lesson 11 — The J-Shape Cluster (order: 11, free: false, userPerspective: "yellow")**

- **FR-026**: Lesson 11 MUST have 2+ concept slides. Slide 0: a board with the four-disc J-Shape L-configuration. Overlays: `tg` on all pattern cells showing the three threat directions. Slide 1: why triple threats are strategically unblockable.
- **FR-027**: Lesson 11 MUST have `free: false` (Pro-gated). `confirmationCategory` MUST be `"j_shape"`, `confirmationCount` MUST be 2.

**Backend: PATTERN_KB Additions (llmCoachHelpers.js)**

- **FR-028**: An inline `PATTERN_KB` entry for `immediate_threat` MUST be added to `llmCoachHelpers.js` with a short prose description (~1–2 sentences) of what an immediate threat is and why it is decisive.
- **FR-029**: An inline `PATTERN_KB` entry for `forced_block` MUST be added to `llmCoachHelpers.js` with a short prose description (~1–2 sentences) of what a forced block is and why it is the only legal good move.
- **FR-030**: A `PATTERN_KB` entry for `claimodd` MUST be added to `llmCoachHelpers.js`, referencing the existing `community-claimodd` KB article ID. If no `community-claimodd.md` entry file exists, the entry MAY use an inline string instead.

**Backend: Claimodd Category Registration**

- **FR-031**: The slug `"claimodd"` MUST be added to `VALID_CATEGORIES` in `server/categories.js`.
- **FR-032**: The slug `"claimodd"` MUST be added to `CATEGORY_ORDER` in `server/categories.js`, positioned after `z_threat` and before `undercut`.
- **FR-033**: The slug `"claimodd"` MUST NOT be added to `PAID_CATEGORIES` in `server/categories.js`. Claimodd is a free category.
- **FR-034**: The frontend mirror of categories (`src/lib/categories.js`) MUST be updated in sync with `server/categories.js` for the `claimodd` addition.

**Backend: Claimodd Challenge Set Entry**

- **FR-035**: A `claimodd` entry MUST be added to `server/challengeSets.js` with: `{ slug: 'claimodd', displayNameKey: 'challengeSet.claimodd.displayName', descriptionKey: 'challengeSet.claimodd.description', stars: 3, free: true }`. The `displayNameKey` and `descriptionKey` i18n keys must exist in `en.json`.

**Backend: detectClaimodd**

- **FR-036**: A new `detectClaimodd(board, scores)` synchronous function MUST be built (~25 lines max) in the classifier module. Detection predicate: all columns have even `colHeights` (each `colHeights[col] % 2 === 0`), it is Red's turn (`board.currentPlayer === 1`), the center column (col 3) is not full (`colHeights[3] < 6`), and the solver score for col 3 is positive and ties the maximum legal score.
- **FR-037**: `detectClaimodd` MUST be added to `DETECTOR_REGISTRY` in `explainSimulate.js` as: `{ name: 'claimodd', fn: detectClaimodd, isAsync: false, histType: 'col' }`.
- **FR-038**: The return value of `detectClaimodd` MUST include `{ matched: boolean, correctCol: number | null }`. When `matched === true`, `correctCol` MUST be `3` (the center column, 0-indexed).

**Backend: Overcut `reason` Field**

- **FR-039**: The `detectOvercut` function MUST be extended to return a `reason: string` field (~10 lines) in its result object that identifies which overcut sub-case applies (e.g., `"same_parity_t4"`, `"active_forcing"`, `"chain_t2"`). This field is exposed to the LLM via the pattern comparison pipeline; it does not change any classification logic.
- **FR-040**: Sub-case identification MUST map to the three documented overcut types: same-parity (T4), active-forcing, chain-T2. Sub-cases are derived from the three OR-connected predicates in `detectOvercut`: `isT4SameParity`→`"same_parity_t4"`, `isT5Exception`→`"active_forcing"`, `isT2Blocking`→`"chain_t2"`. No new solver calls or board analysis are required; no fourth sub-case exists in the code.

**Backend: Coach Phrase Pools for New and Pro Categories (i18n en.json)**

- **FR-041**: Coach phrase i18n key pools MUST be added to `en.json` for `undercut`, `overcut`, `figure_7`, `j_shape`, and `claimodd`. Each category gets the same 5 pool types as all other categories:
  - `coach.<category>.prompt.{0..N}` — challenge prompt text (randomly selected per puzzle)
  - `coach.<category>.hint.{0..N}` — hint text (names the task without revealing the column)
  - `coach.<category>.optimal.{0..N}` — coach phrase for optimal move (pool of variants)
  - `coach.<category>.suboptimal.{0..N}` — coach phrase for suboptimal move (pool of variants)
  - `coach.<category>.blunder.{0..N}` — coach phrase for blunder move (pool of variants)
- **FR-042**: Each pool MUST contain at least 2 key variants (4+ recommended for optimal/blunder) to provide variation per Gap 29. The `claimodd` pools follow the same convention despite being a free category.

**Backend: Narration Templates for Deep Reveal**

- **FR-043**: A basic narration prose template MUST be added for the claimeven simulation trace in the prompt-assembly module that builds the Deep Reveal LLM context. This template produces a sentence like "Yellow wins by always responding above Red" for use in Deep Reveal explanations when `detectClaimeven` matches.
- **FR-044**: A narration template MUST be added that cites `badgeCount` from `highlightMetadata` for Z-Threats (Lesson 6). The template explains why the odd gap count matters (zugzwang toggle argument) and references `community-z-threat` KB prose.
- **FR-045**: A narration template MUST be added that cites both threat rows from `categoryEvidence.threat_cells` for Figure-7 (Lesson 10). The template names the two threat rows and explains why they cannot both be blocked.
- **FR-046**: A narration template MUST be added that cites the triple-threat directions from the KB statement for J-Shape (Lesson 11). The template identifies the three winning continuations from the L-shaped cluster.

**Verification: Undercut Puzzle Existence**

- **FR-047**: A verification step MUST confirm that approved puzzles exist for `confirmationCategory: "undercut"` where the undercut trap column (the column where `detectUndercut` fires) is distinct from the correct column (the column the learner should play). If zero such puzzles exist, a flag MUST be raised for Epic 6 to generate them.
- **FR-048**: The verification step is a read-only query against the puzzles table; it does NOT generate new puzzles or modify data. Puzzle population for undercut (and all other categories) is exclusively Epic 6 scope.

**Cross-cutting**

- **FR-049**: All user-facing strings in lesson content (coachMessages text, legendItems labels, infoProse text) MUST support i18n via key-based lookup. The lesson JSON `title` field is wrapped with `t('lesson.<id>.title', { defaultValue: title })`. Slide fields follow the same pattern: `t('lesson.<id>.slide.<n>.<field>', { defaultValue: value })` where `<n>` is the 0-indexed slide number and `<field>` is `coachMessage.<idx>`, `legendLabel.<idx>`, or `infoProse`.
- **FR-050**: All backend additions (PATTERN_KB entries, detectors, challenge set entries) MUST be purely additive — they change no existing behavior and do not break any existing test.
- **FR-051**: The four Pro-category entries in `challengeSets.js` (undercut, overcut, figure_7, j_shape) MUST be confirmed present with correct `free: false` and star ratings. If already present, no changes are needed.

### Key Entities *(include if feature involves data)*

- **Lesson Content JSON**: A JSON file at `connect-four/lessons/lesson-NN-slug.json` containing all content for one lesson: `id` (slug), `title` (string), `free` (boolean), `userPerspective` ("red" | "yellow"), `slides` (array of Slide objects), `socratic` (SocraticConfig | null), `confirmationCategory` (string | null), `confirmationCount` (integer). Each Slide has `coachMessages` (array of CoachMessage), `boardSpec` (7-element string array), `overlays` (array of {c, r, type}), `legendItems` (array of {type, label}), `infoProse` (string).
- **PATTERN_KB Entry**: A record in the `PATTERN_KB` map in `llmCoachHelpers.js`, either an `{ inline: string }` or `{ id: string }` referencing a KB article file. Each entry provides prose for the LLM prompt's Pattern Definitions section.
- **Detector**: A function registered in `DETECTOR_REGISTRY` (`explainSimulate.js`) that classifies a board position as exhibiting a specific pattern. Sync detectors receive `(board, scores)`; async detectors receive `(board, solver)`.
- **Coach Phrase Pool**: A set of i18n keys in `en.json` under `coach.<category>.<quality>.*` that the client selects from randomly per interaction.
- **i18n Key Pool for Challenge Sets**: Translation keys for `displayNameKey` and `descriptionKey` in `en.json` under `challengeSet.*` namespace, used by `challengeSets.js` entries and resolved by the frontend via `t()`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can start Lesson 1, read 2 concept slides, complete the Socratic board, solve 2 confirmation challenges, and return to the Saga Map with Lesson 1 shown as complete — in a single session without errors.
- **SC-002**: A user can start Lesson 4 (reading-only), read all slides, and have it mark as complete on the last slide without any Socratic or puzzle interaction.
- **SC-003**: All 11 lesson JSON files load without validation errors at server startup. The server log shows no lesson-exclusion errors for valid JSON files.
- **SC-004**: The `detectClaimodd` function correctly identifies all-even parity positions where center column is the winning move, with no false positives on boards that have any odd-parity column.
- **SC-005**: The overcut `reason` field is present in the `detectOvercut` result for every matched position and maps to a known sub-case string; it never returns `null` or `undefined` when `matched === true`.
- **SC-006**: Pro-category and claimodd coach phrase pools have at least 2 variants each for optimal and blunder quality buckets. The `pickFromPool` function (or equivalent random-selection logic) never encounters an empty pool.
- **SC-007**: The PATTERN_KB entries for `immediate_threat`, `forced_block`, and `claimodd` load without error and appear in the LLM prompt's Pattern Definitions section when those detectors match.
- **SC-008**: The verification step for undercut puzzle existence completes in under 5 seconds (read-only query) and either confirms sufficient positions or produces a clear Epic 6 flag. It does not create, modify, or delete any data.
- **SC-009**: All 11 lessons in the Saga Map display correct node states after completion replay — re-entering a completed lesson and completing it again does not duplicate the completion record, and the checkmark remains present at all times.

---

## Assumptions

- **Epic 4 infrastructure is complete**: The Saga Map, Concept Screen, Socratic Screen, and Confirmation Challenges screens (from Epic 4) all function correctly including `boardSpecToBoard`, the phase state machine, `store.saveLessonProgress`, and `GET /api/lessons` / `GET /api/lessons/:id` endpoints. This epic adds no new screens or routes — only content files and backend additions.
- **Puzzle DB population is deferred**: Lessons 7 (claimodd), 8 (undercut), 9 (overcut), 10 (figure_7), and 11 (j_shape) have `confirmationCategory` values for which approved puzzles may not exist at Epic 5 delivery time. The lesson JSON content and Socratic boards are fully testable without puzzle population. The confirmation challenge gate will block lesson completion for these lessons until Epic 6 populates the puzzle pool. This is intentional and documented.
- **`boardSpec` positions are authored, not derived from DB movestrings**: Lesson board positions are hand-authored as `boardSpec` arrays in JSON files. They are display-only diagrams, not solver-validated game positions. Socratic `correctCol` values are authored alongside the `boardSpec` and assumed correct.
- **Reading-only lesson (Lesson 4)**: Lesson 4 has no Socratic board and no confirmation challenges. It completes by advancing past the last concept slide. This is by design (Gap 7).
- **Claimodd is a free category**: Despite being Lesson 7 (the boundary between free and Pro in the Saga Map), Claimodd is a free category accessible to all users. Lessons 8–11 are Pro-gated via the Saga Map `free: false` flag, not via puzzle category gating.
- **Narration templates are lightweight prose additions**: The narration templates (claimeven simulation trace, Z-Threat badgeCount, Figure-7 threat rows, J-Shape triple threats) are short prose sentences added to `buildPromptContext` or equivalent prompt-building function. They are not full interactive visualizations. Epic 5 authors the prose; the template wiring into the LLM prompt is part of this epic's scope.
- **Challenge set entries already exist for Pro categories**: The entries for `undercut`, `overcut`, `figure_7`, and `j_shape` are already present in `challengeSets.js` from Epic 2a. This epic verifies their presence and adds the `claimodd` entry only.
- **Socratic positions are static single-move**: The Socratic board shows a board where the AI has already made a mistake and the user plays the winning column. No dynamic AI mirroring occurs during the Socratic phase. The cooperative AI property of claimeven is taught in the concept slides, not replayed in the Socratic board.
- **All overlays use the established enum**: Lesson content uses only overlay types from the locked enum (`tg`, `td`, `claim`, `win`). No new overlay types are introduced in this epic.
- **Detection predicates for non-claimodd patterns are production-ready**: `detectImmediateThreat`, `detectForcedBlock`, `detectDoubleThreat`, `detectZThreat`, `detectClaimeven`, `detectUndercut`, `detectOvercut`, `detectFigure7`, and `detectJShape` are all already in `DETECTOR_REGISTRY` and require no changes (except the overcut `reason` field addition).
- **Frontend `categories.js` must be kept in sync**: The frontend mirror at `src/lib/categories.js` tracks `server/categories.js` for `claimodd` addition. Both files must be updated atomically.

---

## Out of Scope

- Puzzle DB population for any category, including claimodd generation predicates — Epic 6
- `odd_even_threat` category (new challenge set, detectors, i18n pools) — Epic 6
- Socratic position movestrings (boardSpec is the lesson format; movestring derivation from DB/KB is Epic 6)
- Dynamic AI mirroring or multi-move sequences in Socratic boards
- Changes to Epic 4 infrastructure screens, routes, or endpoints
- Lesson 12 (Zugzwang Basics) and Lesson 13 (Ghost Threats) — post-MVP
- Saga Map Variants A (winding path) and B (meadow stones)
- Lesson admin UI or CMS for editing content at runtime
- Spanish `es.json` i18n population — post-MVP content work
- Deep Reveal LLM improvements beyond the narration templates specified here
- Undercut predicate query optimization or new puzzle generation — Epic 6
- Cross-lesson analytics or adaptive ordering based on completion data
- Any changes to the `paid_categories` set (claimodd is already correctly absent from `PAID_CATEGORIES`)
