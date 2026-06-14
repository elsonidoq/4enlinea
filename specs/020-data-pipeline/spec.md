# Feature Specification: Data Pipeline & Puzzle Counts (Epic 6)

**Feature Branch**: `101-new-design`
**Created**: 2026-06-03
**Status**: Draft
**Spec directory**: `specs/020-data-pipeline`

---

## Overview

This epic is primarily about **data population**: ensuring the puzzle DB has sufficient approved positions for all active challenge sets. The only code-producing deliverables are: the `odd_even_threat` category (new generation predicate + category registration), the Figure-7/J-Shape concept-slide `boardSpec` derivation from real positions, and a validation script. Everything else is puzzle factory pipeline runs and count audits.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Learner can practice every active challenge set (Priority: P1)

A learner opens the Set Picker and sees all active challenge sets with their real approved puzzle counts. No set shows a count of 0 (sets with 0 approved puzzles are automatically hidden). When the learner enters any visible set, they encounter at least one puzzle.

**Why this priority**: Without approved puzzles, the challenge sets are invisible and the app ships with empty content. This is the foundational deliverable.

**Independent Test**: Call `GET /api/puzzles/counts`; verify every category in `CHALLENGE_SETS` with `free: true` (or accessible to the current tier) has count ≥ 1. Enter each visible set; confirm at least one puzzle loads.

**Acceptance Scenarios**:

1. **Given** the puzzle factory has been run for all active categories, **When** `GET /api/puzzles/counts` is called, **Then** every active category returns a count ≥ 1.
2. **Given** a category has count = 0, **When** the Set Picker loads, **Then** that set card is not displayed (existing Gap 6a mechanism, no new code required).
3. **Given** a category has count between 1 and 7 (below the aspirational 8), **When** the Set Picker loads, **Then** the actual count is displayed without any blocking behavior.

---

### User Story 2 — Learner can practice "Odd & Even Threats" challenge set (Priority: P1)

A learner opens the Set Picker and sees the "Odd & Even Threats" free challenge set with 2 stars. When they enter it, they are presented with positions where Red has two distinct major-threat moves — one landing on an odd row (Red's parity), one on an even row. The correct answer is always the column landing on the odd row.

**Why this priority**: This is the only genuinely new category added in this epic. It requires code changes in both the server and frontend, plus puzzle generation.

**Independent Test**: The `odd_even_threat` slug appears in `VALID_CATEGORIES`, `CATEGORY_ORDER`, `challengeSets.js` (free, 2 stars), and `en.json` (all required key pools). The generation predicate correctly identifies the `correct_col` per the predicate contract below.

**Acceptance Scenarios**:

1. **Given** the `odd_even_threat` category is registered, **When** the Set Picker calls `GET /api/puzzles/counts`, **Then** a count for `odd_even_threat` is returned (0 or more).
2. **Given** the puzzle factory is run with the `odd_even_threat` predicate, **When** a candidate position passes the predicate, **Then** it satisfies: Red's turn, ≥2 distinct legal moves each creating a major threat, one threat lands on an odd row (0-indexed: 0, 2, or 4), one on an even row (0-indexed: 1, 3, or 5), and `correct_col` is the column whose threat lands on the odd row.
3. ~~**Given** both candidate threat-landing cells are on odd rows, **When** the predicate assigns `correct_col`, **Then** it picks the column with the higher solver score.~~ **REMOVED** — unreachable: FR-006 condition 4 requires one odd-row and one even-row threat; a position with both threats on odd rows fails the predicate entirely (see FR-008 removal note).
4. **Given** an approved `odd_even_threat` puzzle, **When** the learner enters the set, **Then** the coach prompt is drawn from the `coach.odd_even_threat.prompt.*` i18n pool and no category label is displayed on the board.

---

### User Story 3 — Educator sees faithful concept-slide diagrams for Lessons 10 and 11 (Priority: P2)

When a learner views the concept slides for Lesson 10 (Figure-7 Trap) or Lesson 11 (J-Shape), the board diagrams are sourced from real approved puzzle positions rather than hand-approximated `boardSpec` arrays. The diagrams faithfully show the canonical pattern shape.

**Why this priority**: Lessons 10 and 11 have geometrically complex patterns. Inaccurate diagrams undermine pedagogical trust. This requires no new infrastructure — only content updates to JSON files.

**Independent Test**: Load `GET /api/lessons/lesson-10-figure-7-trap` and `GET /api/lessons/lesson-11-j-shape`. Verify the concept slide `boardSpec` arrays were derived from DB-sourced movestrings (movestring is documented in the JSON). Visually confirm the ConceptScreen renders the correct pattern shape.

**Acceptance Scenarios**:

1. **Given** at least one approved figure_7 puzzle exists in the DB, **When** `lesson-10-figure-7-trap.json` is updated, **Then** its concept slide `boardSpec` is derived from that real movestring (column-major, bottom-to-top `'g'`/`'d'` strings) and the source movestring is documented as a comment or field in the JSON.
2. **Given** at least one approved j_shape puzzle exists in the DB, **When** `lesson-11-j-shape.json` is updated, **Then** its concept slide `boardSpec` faithfully represents the L-cluster pattern with three threat directions.
3. **Given** updated lesson JSON files, **When** `GET /api/lessons/:id` is called for lessons 10 and 11, **Then** the response parses without error and the ConceptScreen renders without crashes.

---

### User Story 4 — Validation script confirms lesson confirmation coverage (Priority: P2)

A developer runs the validation script and gets a clear per-category count table plus a pass/fail report indicating whether every lesson's `confirmationCategory` has at least 1 approved puzzle.

**Why this priority**: Prevents shipping a lesson whose confirmation challenges draw from an empty pool, which would cause a silent runtime failure.

**Independent Test**: Run `node connect-four/scripts/validate-puzzle-counts.js` (or equivalent). Output includes a table of all categories with approved counts and a PASS/FAIL line per `confirmationCategory`.

**Acceptance Scenarios**:

1. **Given** all lesson JSON files are loaded, **When** the validation script runs, **Then** it prints a table showing approved puzzle count per category.
2. **Given** a category has 0 approved puzzles and is used as a `confirmationCategory` in any lesson, **When** the script runs, **Then** it exits non-zero and prints a FAIL message naming the lesson and category.
3. **Given** all `confirmationCategory` values have ≥ 1 approved puzzle, **When** the script runs, **Then** it exits zero and prints PASS.

---

### Edge Cases

- What happens when the puzzle factory produces fewer than 8 approved positions for a category? The set card shows the actual count; entry is not blocked. The ≥ 8 target is aspirational only.
- What happens if both candidate threat moves for `odd_even_threat` land on odd rows? The predicate does not fire — FR-006 condition 4 requires one even-row threat. This case is filtered out at predicate evaluation time; no tie-break logic is needed (FR-008 removed as unreachable).
- What happens if the puzzle factory produces zero approved positions for a category after running? The set is hidden from the Set Picker automatically via the existing `GET /api/puzzles/counts` mechanism; no new code required.
- Claimodd and undercut generation predicates depend on `detectClaimodd` and `detectUndercut` from Epic 5. If Epic 5 is not yet shipped, these two categories cannot be populated. The pipeline must skip them gracefully.

---

## Requirements *(mandatory)*

### Functional Requirements

**Category registration (`odd_even_threat`):**

- **FR-001**: `odd_even_threat` MUST be added to `VALID_CATEGORIES` and `CATEGORY_ORDER` in `server/categories.js` (free, not paid), with the same slug used consistently across all files.
- **FR-002**: `src/lib/categories.js` MUST be updated atomically to mirror `server/categories.js` (both files always in sync per project convention).
- **FR-003**: `server/challengeSets.js` MUST include an entry for `odd_even_threat` with `stars: 2`, `free: true`, `displayNameKey: 'challengeSet.odd_even_threat.displayName'`, and `descriptionKey: 'challengeSet.odd_even_threat.description'`.
- **FR-004**: `server/llmCoachHelpers.js` `PATTERN_KB` MUST include an `odd_even_threat` inline entry (short description of the parity-alignment concept; no separate KB file required for MVP).

**i18n key pools (`odd_even_threat`):**

- **FR-005**: `src/i18n/en.json` MUST include the following key pools for `odd_even_threat`, each with at least one string variant:
  - `coach.odd_even_threat.prompt.*` — coach prompt shown before the move (no category label on board)
  - `coach.odd_even_threat.hint.*` — hint text naming the task without revealing the column
  - `coach.odd_even_threat.optimal.*` — coach phrase for correct answer
  - `coach.odd_even_threat.suboptimal.*` — coach phrase for wrong column but not worst
  - `coach.odd_even_threat.blunder.*` — coach phrase for worst move
  - `challengeSet.odd_even_threat.displayName` = "Odd & Even Threats"
  - `challengeSet.odd_even_threat.description` — short set description

**`odd_even_threat` generation predicate (exact contract — implement verbatim):**

- **FR-006**: The `odd_even_threat` predicate MUST fire when ALL of the following are true:
  1. It is Red's turn (odd move count).
  2. Red has at least two distinct legal moves, in two distinct columns, that each create a major threat (3-in-a-row + 1 empty in a 4-window). Per-move threat enumeration MUST use `getImmediateThreats`: for each candidate column, simulate playing Red there and check whether that placement creates at least one new 3+empty window. (`getMajorThreatCells` MUST NOT be used for this check — it returns all existing threat cells on the board, not threats created by a specific move.)
  3. One of those threat-landing cells is on an odd row (0-indexed: rows 0, 2, or 4 — Red's natural parity).
  4. One of those threat-landing cells is on an even row (0-indexed: rows 1, 3, or 5 — Yellow's natural parity).
  5. The odd-row threat and the even-row threat come from two distinct columns (ensuring `correct_col` is unambiguous).
- **FR-007**: When the predicate fires, `correct_col` MUST be the column whose threat lands on the odd row.
- **FR-008**: ~~Edge case — if both candidate threat-landing cells are on odd rows, `correct_col` MUST be the column with the higher solver score.~~ **REMOVED — unreachable by definition.** FR-006 condition 4 requires one threat on an odd row AND one on an even row. A position where both threats are on odd rows fails FR-006 condition 4 and the predicate does not fire. FR-008 was contradictory with FR-006 and has been deleted from the active contract.
- **FR-009**: The `odd_even_threat` predicate is Red-only; it MUST NOT fire on Yellow's turn.

**Puzzle factory pipeline runs:**

- **FR-010**: The puzzle factory MUST be run for all under-populated active categories. The aspirational target is ≥ 8 approved puzzles per category; the hard acceptance criterion is ≥ 1.
- **FR-011**: Claimeven puzzle generation MUST apply a pre-filter: discard candidate positions where `colHeights` has more than 2 odd-height columns before running the expensive simulation check.
- **FR-012**: Forbidden Columns puzzle generation MUST require: ≥ 1 column where playing immediately gives the opponent an immediate win, AND ≥ 1 safe column (otherwise no puzzle exists).
- **FR-013**: Claimodd generation predicate (exact contract — implement verbatim, gated on Epic 5):
  - The claimodd predicate MUST fire when ALL of the following are true:
    1. All columns have even parity (every column has an even number of empty cells remaining).
    2. It is Red's turn.
    3. The center column (col 3) is not full.
    4. `scores[3]` is the maximum solver score among all legal moves and is positive (col 3 is the best move and is winning for Red).
  - This predicate MUST NOT be attempted until `detectClaimodd` from Epic 5 is available. The pipeline MUST skip claimodd gracefully (log a warning and continue to next category) if the detector is absent.
- **FR-014**: Undercut generation MUST NOT be attempted until `detectUndercut` from Epic 5 is available (this detector already exists at `classifier.js:538` — verify it matches Epic 5's final form before use). The framing: `detectUndercut` fires on the non-`correct_col` column.

**Figure-7 and J-Shape concept-slide boardSpec:**

- **FR-015**: `lesson-10-figure-7-trap.json` concept slide `boardSpec` arrays MUST be replaced with ones derived from a real approved figure_7 puzzle position sourced from the DB (`SELECT move_string FROM puzzles WHERE category = 'figure_7' AND approved = true LIMIT 1`), using the column-major bottom-to-top `'g'`/`'d'` encoding. The source movestring MUST be documented in the JSON (as a `_source` comment field or equivalent). **Prerequisite**: at least one approved figure_7 puzzle must exist in the DB; the factory run for figure_7 must be completed before this step.
- **FR-016**: `lesson-11-j-shape.json` concept slide `boardSpec` arrays MUST be replaced similarly from a real approved j_shape puzzle position sourced from the DB (`SELECT move_string FROM puzzles WHERE category = 'j_shape' AND approved = true LIMIT 1`). **Prerequisite**: at least one approved j_shape puzzle must exist in the DB.
- **FR-017**: Overlay `(c, r)` coordinates in both lesson files MUST be updated to match the new board positions after `boardSpec` replacement.
- **FR-018**: Both updated lesson files MUST be verified by calling `GET /api/lessons/:id` and confirming the response is valid JSON with no parse errors.

**Socratic positions:**

- **FR-019**: Socratic board positions for applicable lessons MUST be sourced from the DB or KB — never hand-constructed. The movestring used as the Socratic position source MUST be documented in the lesson JSON.

**Validation script:**

- **FR-020**: A validation script MUST be created at `connect-four/scripts/validate-puzzle-counts.js` (or `.mjs`). It MUST:
  1. Load all lesson JSON files from `connect-four/lessons/`.
  2. Query approved puzzle counts per category via **direct DB query** (Supabase pooler — see `docs/architecture/db-schema.md` for connection details; the script requires `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` env vars). No server process is required; the script connects directly.
  3. Print a per-category count table.
  4. For each lesson's `confirmationCategory` (non-null), assert ≥ 1 approved puzzle exists with that category; print PASS or FAIL per lesson.
  5. Exit non-zero if any `confirmationCategory` has count = 0.
  6. Exclude `claimodd` and `undercut` from the count-gate check (these are deferred to Epic 5; they are already hidden from users via the count=0 mechanism). The exclusion list MUST be hardcoded and documented in the script.

**Star ratings (locked — no action required):**

- **FR-021**: Star ratings for all categories are locked design decisions. Epic 6 MUST NOT change any existing star rating. The locked values are: `immediate_threat=1`, `forced_block=1`, `double_threat=2`, `forbidden_columns=2`, `forced_win=3`, `odd_even_threat=2`, `mixed=3`, `undercut=4`, `overcut=4`, `figure_7=4`, `j_shape=4`.

### Key Entities

- **PuzzleRecord**: A row in the `puzzles` table with `category` (slug), `move_string`, `correct_col`, `approved` (boolean), and optional `highlight_metadata`. The generation pipeline produces candidates; human curation approves them.
- **ChallengeSet**: An entry in `challengeSets.js` mapping `slug → { displayNameKey, descriptionKey, stars, free }`. The Set Picker reads this + live counts from `GET /api/puzzles/counts`.
- **LessonJSON**: A `lessons/lesson-NN-*.json` file. Contains `boardSpec` (display-only column-height encoding), `overlays`, `socratic`, `confirmationCategory`. Epic 6 updates the `boardSpec` and overlay fields for lessons 10 and 11.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every active challenge set (all slugs in `challengeSets.js` with `free: true`) except `claimodd` and `undercut` (deferred to Epic 5) has ≥ 1 approved puzzle in the DB after pipeline runs. Validated by the validation script exiting 0. The script's exclusion list for `claimodd` and `undercut` is an explicit, hardcoded, documented constant — not a silent omission.
- **SC-002**: Every lesson whose `confirmationCategory` is non-null has ≥ 1 approved puzzle for that category. Validated by the validation script exiting 0.
- **SC-003**: The `odd_even_threat` category is fully wired end-to-end: registered in `VALID_CATEGORIES`, listed in `challengeSets.js`, has i18n key pools in `en.json`, has a `PATTERN_KB` entry, and has ≥ 1 approved puzzle in the DB.
- **SC-004**: Lessons 10 and 11 concept slides display board positions that faithfully show the Figure-7 and J-Shape patterns respectively (verified visually via the ConceptScreen after updating the JSON).
- **SC-005**: The validation script runs to completion without crashing for any valid DB state and correctly differentiates PASS vs FAIL per `confirmationCategory`.

---

## Assumptions

- Epic 5 (`detectClaimodd`, `detectUndercut`) may not be complete when stable-category work begins. This epic assumes claimodd and undercut puzzle generation will be deferred to a later pipeline run once Epic 5 ships. The script must not crash when these detectors are absent.
- The existing puzzle factory infrastructure (`connect-four/scripts/`) is functional and can be invoked per-category. No new factory infrastructure is created in this epic.
- The movestring→boardSpec conversion pipeline already exists from Epic 4/5's lesson authoring work and can be reused without modification.
- The `odd_even_threat` Set Picker display (hiding at 0 approved puzzles) works automatically via the existing `GET /api/puzzles/counts` mechanism. No new hiding logic is needed.
- Lesson 4 (Odd Rows Belong to Red) has `confirmationCategory: null` and `socratic: null` by design (Gap 7). The validation script treats null `confirmationCategory` as "no check needed."
- All movestrings used for Socratic positions and `boardSpec` derivation are sourced from the DB or existing KB examples — never hand-constructed (project-wide invariant).
- `detectUndercut` already exists in `classifier.js` (line 538). Before using it in the pipeline, verify its output matches the finalized Epic 5 contract.

---

## Scope Boundaries

### In scope

- Adding `odd_even_threat` to all required files (categories, challengeSets, llmCoachHelpers, en.json)
- Writing the `odd_even_threat` generation predicate (sync; parity check + major-threat enumeration)
- Running puzzle factory for under-populated categories (claimeven, forbidden_columns, figure_7, j_shape, odd_even_threat; claimodd/undercut after Epic 5)
- Replacing concept-slide `boardSpec` arrays in lessons 10 and 11 with DB-derived positions
- Writing the validation script
- Sourcing and documenting Socratic board movestrings in lesson JSON files

### Out of scope

- Re-rating any category (all ratings are locked)
- Adding any minimum-count blocking logic (the hide-at-0 mechanism is the only gate)
- Adding confirmation challenges to Lesson 4 (Gap 7 — reading-only lesson)
- Building `detectClaimodd` or `detectUndercut` (Epic 5 deliverables)
- Adding a second new category beyond `odd_even_threat`
- Making `odd_even_threat` symmetric (Yellow's turn) — Red-only predicate
- Any new lesson infrastructure (Epic 4 deliverable)
- Any new API endpoints (all puzzle counts come from the existing `GET /api/puzzles/counts`)

---

## Dependencies

- **Epic 4**: Lesson JSON schema, `boardSpec` format, and lesson loader must be in place before concept-slide boardSpec updates.
- **Epic 5**: `detectClaimodd` and the finalized `detectUndercut` contract are required before claimodd/undercut puzzle generation. Stable-category work (claimeven, forbidden_columns, figure_7, j_shape, `odd_even_threat`) is independent of Epic 5.
- **Existing infrastructure**: `GET /api/puzzles/counts`, `GET /api/puzzles/draw`, `challengeSets.js`, `server/categories.js`, `src/lib/categories.js`, puzzle factory scripts, and the `getMajorThreatCells` / `getImmediateThreats` functions in `classifier.js`.
