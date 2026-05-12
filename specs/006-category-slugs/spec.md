# Feature Specification: Category Slug Refactor

**Feature Branch**: `006-category-slugs`  
**Created**: 2026-05-11  
**Status**: Draft  
**Input**: User description: "Refactor: replace integer puzzle category IDs with string slugs end-to-end."

## Migration Strategy

The migration is executed in three sequential steps, each of which must succeed before proceeding to the next:

1. **Dump**: Export all rows from `puzzles`, `candidates`, `false_positive_records`, and `coach_blunders` to a reference file (JSON or CSV). This is the only backup of existing data.
2. **Empty and recreate**: Drop and recreate all four affected tables with the new schema (text slug columns, updated CHECK constraints). All existing rows are discarded.
3. **Run the updated code**: Start the server and frontend with the slug-based changes in place. No data backfill is required — the tables start empty and are repopulated through normal candidate generation and curation.

Steps 1 and 2 happen at the database level before the updated code is started. The old server code never runs against the new schema.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated tests pass with slug-based assertions (Priority: P1)

Before the database migration runs, the full automated test suite is updated to use slugs and executed against the refactored server code. All tests pass.

**Why this priority**: The most bug-prone changes are deep in the server — `predicates.js` (switch cases), `candidate-generator.js` (`checkPredicate` uses numeric equality like `category === 5`, `category === 7`; `computeHighlightCells` uses `category >= 1 && category <= 3`). These are validated by the test suite without touching the database. Catching failures here costs nothing; catching them after the DB migration means the tables are empty and you have no data to work with.

**Independent Test**: Run `npm test` in the server directory; all 31 tests pass with slug-based inputs and no `result.category` assertions.

**Acceptance Scenarios**:

1. **Given** the refactored server code with slugs, **When** the test suite runs, **Then** all tests in classifier.test.js, predicates.test.js, forbidden_columns.test.js, and candidate-generator.test.js pass.
2. **Given** a test that previously asserted `result.category === 4`, **When** run against the refactored classifier, **Then** the test asserts `result.tag === 'fork_setup'` and `result.category` does not exist.

---

### User Story 2 - Candidate generator produces correctly-slugged candidates (Priority: P2)

After the database migration, a curator triggers candidate generation for any category. The generator completes without error and writes candidates with the correct slug in the `category` column.

**Why this priority**: Generation exercises the slug comparisons that replaced the numeric ones in `candidate-generator.js`. A misnamed slug (e.g. `'forbidden_column'` vs `'forbidden_columns'`) would silently produce wrong candidates or fail the DB CHECK constraint. This must be verified before any candidates enter the curation queue.

**Independent Test**: Trigger generation for at least two categories (including `zugzwang` and `forbidden_columns`); verify the resulting rows have slug values and pass the DB CHECK constraint.

**Acceptance Scenarios**:

1. **Given** the migrated database and updated server, **When** the curator generates candidates for `zugzwang`, **Then** the created rows have `category = 'zugzwang'` and are accepted by the database.
2. **Given** generation for `forbidden_columns` (previously unreachable), **When** the generator runs, **Then** candidates are created and stored with `category = 'forbidden_columns'`.

---

### User Story 3 - Curator works with readable category names (Priority: P3)

A puzzle curator opens the curation dashboard and workspace. Every place that previously showed a raw integer (e.g. "4") now shows the human-readable slug (e.g. "fork_setup"). Filtering, approving, and rejecting puzzles all continue to work identically.

**Why this priority**: Once generation is confirmed correct, this validates the full read/write cycle through the curation UI — including the approve endpoint which persists to the `puzzles` table.

**Independent Test**: Open the Candidate Dashboard and Curation Workspace; verify that category labels render as slugs, all filters work, and approve/reject actions save correctly.

**Acceptance Scenarios**:

1. **Given** a candidate with `category = 'fork_setup'`, **When** the curator views the Candidate Dashboard, **Then** the category column displays `fork_setup` (not `4`).
2. **Given** a curator filtering by category, **When** they select any category filter, **Then** the filter returns the correct puzzles and the displayed category labels match the slug names.
3. **Given** a curator approving a candidate, **When** the approval is submitted, **Then** the resulting puzzle record stores the slug string and is accepted by the database.

---

### User Story 4 - Puzzle player sees correct category chip and learns correct skill (Priority: P4)

A player on the Puzzles page sees a category chip for each puzzle. The chip label and styling are unchanged visually; the chip still correctly indicates the puzzle type (e.g. "Zugzwang", "Fork Setup").

**Why this priority**: Pure read path — lower risk than the write paths above, but essential for end-user correctness.

**Independent Test**: Load the Puzzles page and verify category chips display correctly for all 7 categories, including `forbidden_columns` which was previously missing.

**Acceptance Scenarios**:

1. **Given** a puzzle of category `zugzwang`, **When** a player views the puzzle, **Then** the category chip displays the correct label with correct styling.
2. **Given** the Puzzles page category list, **When** a player browses all categories, **Then** all 7 categories appear including `forbidden_columns`.

---

### User Story 5 - Coach page shows correct category breakdown (Priority: P5)

A player reviewing their performance in the Coach page sees blunders categorized by slug. The category breakdown is accurate and human-readable.

**Why this priority**: Lowest-risk read path — the `coach_blunders` table has the same slug migration applied and the UI just displays the value.

**Independent Test**: Navigate to the Coach page with blunder data present; verify category names render as slugs correctly.

**Acceptance Scenarios**:

1. **Given** blunder records with `pattern_category` stored as a slug, **When** the player views the Coach page, **Then** the category label renders as the corresponding slug (not an integer).

---

### Edge Cases

- What happens when an existing database row has an integer value during migration? The migration dumps data to a reference file and recreates tables; old integer rows are discarded.
- How does the system handle a category value that is not one of the 7 valid slugs? The server rejects it with a validation error (VALID_CATEGORIES set check).
- What happens for a puzzle of category `forbidden_columns` that was previously unreachable due to the bug where 7 was missing from validation? It is now accepted and processed correctly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The database MUST store category values as text slugs (`immediate_threat`, `forced_block`, `double_threat`, `fork_setup`, `zugzwang`, `parity_control`, `forbidden_columns`) in the `puzzles`, `candidates`, `false_positive_records`, and `coach_blunders` tables.
- **FR-002**: The database CHECK constraint on all affected tables MUST reject any value not in the 7 valid slugs.
- **FR-003**: The server classifier MUST return only `{ tag }` (dropping `category`) from `classify()`; no caller may rely on the integer `category` field.
- **FR-004**: The server MUST validate incoming category values against the full set of 7 slugs; `forbidden_columns` (previously category 7) MUST be accepted.
- **FR-005**: The server `/api/puzzles` endpoint MUST return counts for all 7 categories including `forbidden_columns` (fixing the previous omission).
- **FR-006**: The frontend MUST derive all category display names, chips, and ordering from a single shared constants file; no component may define its own local `CATEGORY_NAMES` map.
- **FR-007**: `PAID_CATEGORIES` MUST be defined using slugs (`fork_setup`, `zugzwang`, `parity_control`) everywhere it is referenced.
- **FR-008**: All server-side function names and frontend component identifiers that referenced numeric category numbers MUST be renamed to use descriptive slug-based names (e.g. `computeCat4Highlight` → `computeForkSetupHighlight`).
- **FR-009**: All automated tests MUST pass after the refactor with slug-based assertions replacing integer-based assertions.

### Key Entities

- **Category**: A text slug identifying a puzzle pattern type. Valid values: `immediate_threat`, `forced_block`, `double_threat`, `fork_setup`, `zugzwang`, `parity_control`, `forbidden_columns`. Ordered list is authoritative for display ordering.
- **Puzzle / Candidate / False Positive Record / Coach Blunder**: Existing entities whose `category` (or `pattern_category`) column changes type from integer to text slug.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 31 existing automated tests pass after the refactor with no test failures or skips.
- **SC-002**: All 7 puzzle categories are reachable and correctly labeled in every UI surface — Puzzles page, Curation Dashboard, Curation Workspace, Coach page — with zero surfaces still showing raw integers.
- **SC-003**: The `forbidden_columns` category, previously unreachable due to validation and listing bugs, is now fully accessible through all API endpoints and UI flows.
- **SC-004**: A single shared constants file is the sole definition of category names and chips; grep for `CATEGORY_NAMES` finds definitions only in `categories.js`, not in individual component files.
- **SC-005**: No behavioral change is observable by end users — existing puzzle layouts, scoring, and coaching flows work identically before and after the refactor.

## Assumptions

- Existing data in affected tables is considered expendable; the migration dumps current data to a reference file for audit purposes but does not attempt to preserve or migrate live records.
- The slug strings are stable identifiers — they will not be renamed again in the near future, so renaming function names to match slugs is a long-term improvement.
- The 7 slugs and their ordering (1→7) are fixed for this refactor; adding new categories is out of scope.
- The `coach_blunders.pattern_category` column naming difference (vs. `category` in other tables) is pre-existing and is not changed by this refactor.
- Tests that currently assert on integer values are the complete set needing update; no other test files reference numeric categories.
