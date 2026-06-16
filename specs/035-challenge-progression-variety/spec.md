# Feature Specification: Challenge Progression & Variety

**Feature Branch**: `035-challenge-progression-variety`
**Created**: 2026-06-16
**Status**: Draft
**Input**: User description: "Epic 6 — Challenge Progression & Variety: The challenges view shows a learner's progress and accuracy at a glance, and consecutive puzzles never repeat the same visual shape."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Progress at a Glance (Priority: P1)

As a learner browsing challenge sets, I want to see my progress and accuracy on each set card so I know which sets I've completed and where I need more practice — without seeing any raw numbers that might discourage me.

**Why this priority**: This is the primary user-facing deliverable. The SetPickerScreen is the entry point to all challenge activity; without progress visibility, learners have no sense of advancement and no signal about where to focus next. This story can ship independently and deliver immediate value even without the shape-reordering system.

**Independent Test**: Can be fully tested by opening SetPickerScreen as an authenticated user with prior puzzle attempts. Each SetCard displays a progress bar, accuracy bar, and a cleared indicator based on stored attempt data. Unauthenticated users see no progress UI (the cards appear as they do today). The test validates both the presence of UI elements and the correctness of progress/accuracy/cleared computation.

**Acceptance Scenarios**:

1. **Given** an authenticated user who has completed 6 of 10 immediate_threat puzzles correctly on first attempt, **When** they view SetPickerScreen, **Then** the immediate_threat SetCard shows a progress bar at ~60% fill, an accuracy bar colored green (accuracy 100%), and no "cleared" state indicator.
2. **Given** an authenticated user who has completed all active puzzles in a category with at least one correct attempt each, **When** they view SetPickerScreen, **Then** that SetCard displays a distinct "cleared" visual state (e.g., checkmark badge, green tint, or special border) alongside the progress bar at 100%.
3. **Given** an authenticated user with 50% accuracy in a category (e.g., 4 correct out of 8 attempted), **When** they view SetPickerScreen, **Then** the accuracy bar is colored yellow (#ffc107) and fills 50% of its width. No numeric percentage text is displayed — the bar is visual-only.
4. **Given** an unauthenticated user, **When** they view SetPickerScreen, **Then** SetCards render with stars and position counts only (current behavior). No progress bars, accuracy bars, or cleared indicators are shown.
5. **Given** a category with zero puzzle attempts by the user, **When** they view SetPickerScreen, **Then** that SetCard shows an empty progress bar, no accuracy bar, and no cleared state.
6. **Given** an authenticated user with accuracy below 50% in a category, **When** they view SetPickerScreen, **Then** the accuracy bar is colored red (#f44336). The constitution's "no raw scores surfaced" rule is respected — no number appears.

---

### User Story 2 — No Identical Consecutive Puzzles (Priority: P1)

As a learner practicing a challenge set, I should never see two consecutive puzzles with the same visual shape, so that each puzzle feels distinct and I stay engaged.

**Why this priority**: Shape repetition was reported as the most noticeable quality issue in challenge sets — users seeing three consecutive horizontal immediate_threat puzzles in the same zone called the experience "broken." Fixing this directly impacts perceived quality and retention. This story depends on the shape_key/position columns and the reindex endpoint (User Stories 3 and 4), but the draw-endpoint change can ship independently once data is migrated.

**Independent Test**: Can be tested by running the reindex on a category known to have many same-shape puzzles, then drawing a set and confirming no two consecutive puzzles share a shape_key. A fixture category with three consecutive identical-shape immediate_threat puzzles is used as the repro case. After reindex, the same fixture produces zero back-to-back same-shape puzzles in the draw.

**Acceptance Scenarios**:

1. **Given** a category where the reindex has been run and all active puzzles have a non-null position, **When** a user draws a set of 8 puzzles, **Then** no two consecutive puzzles in the drawn set have the same shape_key.
2. **Given** a category where the reindex has NOT been run (all positions are NULL), **When** a user attempts to draw a set, **Then** the draw endpoint returns an empty puzzle list (no puzzles are served when position IS NULL).
3. **Given** a category with only one distinct shape (e.g., all puzzles are single-shape), **When** reindex runs, **Then** it assigns sequential positions without error — the round-robin degrades gracefully to one group.
4. **Given** a resumed challenge session (user returns to an in-progress session), **When** the draw endpoint re-fetches the puzzles in original order from the stored session, **Then** the shape adjacency guarantee still holds because the reindex established a stable global order.
5. **Given** a "mixed" category draw, **When** puzzles from different categories are selected, **Then** each puzzle carries its real category's shape_key and position. The draw samples by position ASC within each category pool, then interleaves categories.

---

### User Story 3 — forced_win Highlight Cells on Puzzles Table (Priority: P2)

As a developer maintaining the puzzle pipeline, I need forced_win highlight_cells stored on the puzzles table so that forced_win shape extraction works from stored data without replaying boards at reindex time.

**Why this priority**: This is an enabler for User Story 2. Without stored highlight_cells for forced_win, the shape extractor cannot compute shape_key for forced_win puzzles (their highlight_metadata is always null). However, forced_win puzzles are a minority of the total puzzle pool, so this ships before the reindex but is scoped as P2.

**Independent Test**: Verify that after approving a forced_win candidate, the resulting puzzle row has a non-null highlight_cells column containing the 5-cell role structure from computeForcedWinHighlight. Verify that existing approved forced_win puzzles (from before the migration) get their highlight_cells populated via a backfill query or re-approval.

**Acceptance Scenarios**:

1. **Given** a forced_win candidate with highlight_cells populated on the candidates table, **When** an admin approves it, **Then** the new puzzle row stores that same highlight_cells data.
2. **Given** a forced_win puzzle that was approved before the migration (highlight_cells is NULL on puzzles), **When** the shape extractor encounters it, **Then** it either computes the shape via board replay fallback or returns an "unindexable" shape_key so the puzzle is flagged for admin attention.

---

### User Story 4 — Curation Tool Reindex (Priority: P2)

As an admin managing puzzle quality, I want a "Reindex puzzles" button per category on the curation page that assigns shape-aware positions, plus warnings when puzzles have not been indexed.

**Why this priority**: The reindex is the operational control that makes User Story 2 possible. It ships after the shape_key/position columns exist (migration) but before the draw endpoint switches to position-based ordering.

**Independent Test**: Click the reindex button for a category, verify the response reports the number of puzzles indexed and number of distinct shape groups. Query the database to confirm all active puzzles in that category have non-null, sequential position values. Verify the curation tool shows a warning badge for categories with unindexed puzzles.

**Acceptance Scenarios**:

1. **Given** an admin on the curation page, **When** they click "Reindex" for the immediate_threat category, **Then** the system computes shape descriptors for all active puzzles, assigns sequential positions via round-robin, and returns `{ category: "immediate_threat", indexed: 50, shapeGroups: 8 }`.
2. **Given** a category with active puzzles that all have NULL position, **When** the admin views the curation page, **Then** a warning indicator (e.g., orange badge) is visible next to that category's name, with a count of unindexed puzzles.
3. **Given** an admin attempting to reindex a category that has zero active puzzles, **When** the reindex runs, **Then** it returns `{ category: "...", indexed: 0, shapeGroups: 0 }` without error.
4. **Given** a claimodd category that has no dedicated candidate generation path, **When** claimodd has no active puzzles, **Then** the reindex silently skips it. If claimodd has manually curated puzzles, they are indexed normally via board analysis (claimodd has stored correct_col but null highlight_metadata).

---

### Edge Cases

- **All puzzles same shape**: If a category has only one distinct shape_key (e.g., a newly added category with few puzzles), the round-robin degrades to sequential ordering — all puzzles get sequential positions from the single group. The draw will serve consecutive same-shape puzzles because there is no alternative. This is acceptable and not an error.
- **Empty category (zero active puzzles)**: The reindex returns `indexed: 0, shapeGroups: 0`. The draw endpoint returns an empty puzzle list. The curation tool shows no warning (an empty category is not "unindexed" — it simply has nothing to index).
- **Massive deactivation**: An admin deactivates 90% of puzzles in a category after reindex. The remaining active puzzles still have their position values but may now be consecutive if they came from the same shape group. The admin should re-run the reindex after bulk deactivations. The curation tool warns if any active puzzle has NULL position, not about suboptimal ordering.
- **Unauthenticated progress query**: GET /api/user/challenge-progress returns 401. The frontend handles this by not rendering progress UI (current behavior preserved for anonymous users).
- **User with zero puzzle attempts**: All progress entries return `{ attempted: 0, correct: 0, total: N, accuracy: 0, cleared: false }`. No accuracy bar is rendered (accuracy is undefined/0 when no attempts exist).
- **Race condition during reindex**: If two admins trigger reindex for the same category simultaneously, the second update overwrites the first. This is acceptable for an admin-only operation on localhost. No locking is required.
- **forced_win puzzles approved before migration**: Their highlight_cells column is NULL. The shape extractor computes the shape via board replay using the existing Board class and computeForcedWinHighlight as a fallback. This fallback runs during reindex only, not at draw time.
- **Cross-draw adjacency**: When a user finishes a challenge session and starts a new one, the first puzzle of the new draw might have the same shape as the last puzzle of the previous draw. This is acceptable — the adjacency guarantee applies within a single draw, not across sessions.
- **Resumed session with deactivated puzzles**: If a puzzle in a saved session was deactivated since the session was created, it is filtered out by `eq('is_active', true)`. The remaining puzzles maintain their original relative order.

## Requirements *(mandatory)*

### Functional Requirements

**Progress & Accuracy UI**

- **FR-001**: The SetCard component MUST render a progress bar showing fill proportional to `correct / total` for the category, alongside the existing stars and positionCount elements without removing them.
- **FR-002**: The SetCard component MUST render a horizontal accuracy bar whose fill width is proportional to accuracy (correct / attempted) and whose color is green (#4caf50) for accuracy >= 80%, yellow (#ffc107) for 50-79%, and red (#f44336) for < 50%.
- **FR-003**: The SetCard accuracy bar MUST NOT display any numeric text — it is a purely visual indicator.
- **FR-004**: When a category is "cleared" (user has at least one correct attempt on every active puzzle in that category), the SetCard MUST display a distinct visual cleared state (e.g., checkmark badge, green tinted border, or similar).
- **FR-005**: SetCards MUST render without progress/accuracy/cleared UI when the user is not authenticated (current behavior preserved).
- **FR-006**: The SetPickerScreen MUST fetch progress data from GET /api/user/challenge-progress when the user is authenticated and pass relevant fields to each SetCard.

**Challenge Progress API**

- **FR-007**: GET /api/user/challenge-progress MUST require authentication (return 401 if req.user is null).
- **FR-008**: The endpoint MUST return a `progress` object keyed by category slug, where each entry contains `{ attempted: number, correct: number, total: number, accuracy: number, cleared: boolean }`.
- **FR-009**: `total` MUST be the count of active puzzles (`is_active = true`) in the category.
- **FR-010**: `attempted` MUST be the count of distinct puzzle_ids with a puzzle_attempt row for this user in this category, for active puzzles only (`is_active = true`).
- **FR-011**: `correct` MUST be the count of distinct puzzle_ids with at least one puzzle_attempt row where `first_attempt_correct = true` for this user in this category, for active puzzles only (`is_active = true`).
- **FR-012**: `cleared` MUST be true when `correct = total AND total > 0` (the user has at least one correct first-attempt on every active puzzle in the category, and the category is non-empty).
- **FR-013**: The response MUST include an entry for every category in CHALLENGE_SETS (from server/challengeSets.js). Missing categories default to `{ attempted: 0, correct: 0, total: <live count>, accuracy: 0, cleared: false }`.
- **FR-014**: The endpoint MUST filter all DB queries by `user_id = req.user.id` (following the /api/user/* ownership invariant).

**Shape Descriptor & Reindex**

- **FR-015**: The system MUST store a per-category shape descriptor for each puzzle in a new `shape_key TEXT` column on the puzzles table.
- **FR-015a**: The `shape_key` column MUST use a deterministic canonical serializer (not `JSON.stringify`), defined as: (a) sort the descriptor's top-level keys alphabetically; (b) format each entry as `key=value`; (c) join entries with `|`; (d) for any value that is itself an object (e.g., double_threat arm descriptors), recursively apply the same serializer and wrap the result in parentheses. Examples:
  - Simple single-threat: `col_zone=center|orientation=H|row_zone=top|subtype=run3`
  - Double-threat with nested arms: `arm1=(col_zone=left|orientation=H|row_zone=mid|subtype=run3)|arm2=(col_zone=right|orientation=V|row_zone=low|subtype=gap)`
  - Positional-only (forbidden_columns, claimeven, etc.): `col_zone=left|orientation=null|row_zone=low|subtype=null`
- **FR-016**: The system MUST store a global round-robin index in a new `position INTEGER` column on the puzzles table, defaulting to NULL.
- **FR-017**: The shape descriptor MUST include four fields: `orientation`, `subtype`, `col_zone`, `row_zone`. Specific valid values and derivation rules are defined per category in the Shape Descriptor appendix.
- **FR-018**: The reindex algorithm MUST group puzzles by `shape_key` within a category, then assign sequential `position` values using round-robin interleaving: `position = groupIndex + sortedGroupPosition * numGroups`.
- **FR-019**: Groups MUST be ordered by first-seen (the order shape_keys are encountered during extraction). Within each group, puzzles MUST be shuffled per reindex invocation for unpredictability.
- **FR-020**: The reindex endpoint (POST /api/admin/puzzles/reindex) MUST be admin-only (requireLocalhost) and accept `{ category: string }`, validating against VALID_CATEGORIES. Note: The existing `GET /api/admin/puzzles` uses `requireAdmin` while `POST /api/admin/puzzles/reindex` uses `requireLocalhost`. Both checks pass on localhost where the curation tool runs. This split is intentional: the read endpoint supports broader admin access patterns while the destructive reindex is restricted to the local curation machine.
- **FR-021**: The reindex endpoint MUST return `{ category, indexed: number, shapeGroups: number }` on success.
- **FR-022**: The curation tool MUST display a per-category warning when any active puzzle in that category has a NULL position.
- **FR-023**: The draw endpoint MUST order puzzles by `position ASC` and exclude puzzles where `position IS NULL`.
- **FR-023a**: The draw endpoint MUST select a random starting offset within the valid position range per draw request, so that different sessions see different puzzle sequences. The offset is computed as `randomInt(0, max(0, totalIndexed - n))` where `totalIndexed` is the count of active puzzles with non-null position in the category. Puzzles are then fetched via `.range(offset, offset + n - 1)` ordered by `position ASC`. If the remaining puzzles from offset to end are fewer than `n` (near-end scenario), wrap around by continuing from position 0. This preserves round-robin adjacency within each draw while varying which range of the global sequence users encounter each session.

**forced_win highlight_cells**

- **FR-024**: The puzzles table MUST gain a `highlight_cells jsonb` column (matching the existing candidates.highlight_cells type).
- **FR-025**: The candidate approval endpoint MUST copy `candidate.highlight_cells` to `puzzle.highlight_cells` during promotion (alongside the existing highlight_metadata and correct_col copies).
- **FR-026**: The draw endpoint MUST include `highlight_cells` in its SELECT statement so shape extraction can read it.
- **FR-027**: The shape extractor for forced_win MUST derive `orientation` from the stored highlight_cells: `returning` (cells[0].col == cells[4].col), `ascending` (cells[0].col < cells[4].col), or `descending` (cells[0].col > cells[4].col).
- **FR-028**: For forced_win puzzles approved before the migration (highlight_cells IS NULL), the shape extractor MUST compute the shape via board replay using the existing Board class and computeForcedWinHighlight as a fallback during reindex.

**Shape Extraction**

- **FR-029**: Categories with stored highlight_metadata (z_threat, undercut, overcut, figure_7, j_shape) MUST derive their shape descriptor directly from the stored metadata without board replay.
- **FR-030**: Categories without stored spatial metadata (immediate_threat, forced_block, double_threat, forbidden_columns, claimeven, claimodd, odd_even_threat) MUST compute their shape descriptor via board analysis using the stored move_string and correct_col with the existing Board class.
- **FR-031**: The shape extraction logic MUST live in a new dedicated module (server/shapeDescriptor.js), not inlined in the reindex endpoint or draw endpoint.

**Data Integrity**

- **FR-032**: A new migration (044) MUST add `shape_key TEXT` and `position INTEGER` columns to the puzzles table, plus `highlight_cells jsonb`.
- **FR-033**: The migration MUST include explicit GRANT statements for any new columns accessed by frontend roles.
- **FR-034**: claimodd puzzles (which have no automated candidate generation path) MUST be handled gracefully by the reindex: if claimodd has active puzzles, they are indexed via board analysis; if claimodd has zero active puzzles, it is silently skipped.

### Key Entities

- **Challenge Progress**: Represents a user's performance in a single challenge category. Key attributes: category slug, attempted count, correct count, total puzzle count, accuracy ratio, cleared boolean. Derived from puzzle_attempts and puzzles tables, not stored independently.
- **Shape Descriptor**: A categorization of a puzzle's visual configuration. Key attributes: orientation (H, V, diagonal direction, or null), subtype (run3, gap, or null), col_zone (left/center/right), row_zone (low/mid/high). Stored as shape_key TEXT on the puzzles table. For double_threat, the shape_key encodes both arm descriptors as a sorted pair.
- **Puzzle Position**: A global round-robin index (INTEGER) within a category that determines draw ordering. Assigned by the reindex algorithm. NULL means the puzzle has not been indexed and is excluded from draws.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authenticated learner can identify which challenge sets they have completed (cleared) and which need more practice within 5 seconds of viewing the SetPickerScreen — without reading any numeric accuracy text.
- **SC-002**: Within any drawn challenge set (after reindex), no two consecutive puzzles share the same shape_key. Verified against a fixture category that previously produced three consecutive identical-shape immediate_threat puzzles.
- **SC-003**: The reindex endpoint processes a category of 100 puzzles in under 3 seconds (shape extraction + round-robin assignment + DB update).
- **SC-004**: The draw endpoint response time does not regress by more than 50ms compared to the pre-reindex baseline (the only change is ORDER BY position ASC instead of random shuffle; position is indexed).
- **SC-005**: 100% of forced_win puzzles approved after the migration have non-null highlight_cells on the puzzles table, enabling shape extraction from stored data.

## Assumptions

- The existing `challenge_sessions` table and session-resume logic remain unchanged. Resume re-fetches puzzles in the stored order, which after reindex follows the round-robin sequence.
- The draw endpoint currently uses `Math.random() - 0.5` shuffle. After reindex, this is replaced by `ORDER BY position ASC` with a WHERE clause excluding NULL positions. The oversampling (n * 4) and shuffle are removed.
- claimodd will remain a manually curated category with no automated candidate generation. The reindex handles it gracefully whether or not puzzles exist.
- The accuracy bar uses the same three-threshold color encoding (green >= 80%, yellow 50-79%, red < 50%) described in the epic. These thresholds are a product decision, not a technical constant.
- The "cleared" badge is a binary visual state per category, not a progressive indicator. A category is cleared or it is not.
- Unauthenticated users continue to see SetCards with stars and position counts only. The GET /api/user/challenge-progress endpoint is not called for them.
- The reindex endpoint is localhost-only (requireLocalhost), matching the existing admin endpoint pattern.
- The new `shape_key` column stores a deterministically-serialized descriptor using a canonical `key=value` format with alphabetically-sorted keys joined by `|`. Nested objects (e.g., double_threat arm descriptors) are wrapped in parentheses and serialized recursively. See FR-015a for the serialization contract.
- Migration 044 follows the existing pattern: sequential numeric prefix, comment block, ALTER TABLE with ADD COLUMN IF NOT EXISTS, service_role GRANT.

## Out of Scope

- New challenge categories or changes to existing category definitions.
- Changing star thresholds or introducing a global difficulty curve.
- New overlay types or Board component API changes.
- Sound effects (Epic 10).
- Fixes to SocraticScreen or ConceptScreen disc-drop behavior.
- Migration of the shape reorder algorithm to draw-time (the curation-time round-robin approach is locked).
- Guaranteeing cross-draw adjacency (the first puzzle of a new draw may match the last puzzle of the previous draw).

---

## Appendix A: Shape Descriptor Per Category

### Zone Bucketing (shared across all categories)

| Field | Range | Value |
|-------|-------|-------|
| col_zone | cols 0-1 | `'left'` |
| col_zone | cols 2-4 | `'center'` |
| col_zone | cols 5-6 | `'right'` |
| row_zone | rows 0-1 | `'low'` |
| row_zone | rows 2-3 | `'mid'` |
| row_zone | rows 4-5 | `'high'` |

"Landing row" = `board.colHeights[correct_col]` **before** placing the disc (derived by parsing `move_string` with the existing `Board` class). All coordinates are 0-indexed.

### Orientation values

- `'H'` — horizontal 4-window
- `'V'` — vertical 4-window
- `'D↗'` — diagonal rising (bottom-left to top-right)
- `'D↘'` — diagonal falling (top-left to bottom-right)
- `'multi'` — winning in more than one direction simultaneously
- `'canonical'` / `'mirror'` — j_shape orientation (bridge right / bridge left)
- `'ascending'` / `'descending'` / `'returning'` — forced_win sequence shape
- `null` — not applicable (positional-only categories)

### Subtype values

- `'run3'` — disc extends a contiguous run at one end of the 4-window (position 0 or 3)
- `'gap'` — disc fills a hole inside the 4-window (position 1 or 2)
- `null` — not applicable (no threat-window analysis for this category)

Vertical threats are always subtype `'run3'` by gravity — a disc cannot float above a gap in the same column.

### Per-category derivation

**immediate_threat**: Apply `correct_col`, find the winning 4-window(s). orientation = direction of winning window (H/V/D↗/D↘/multi). subtype = run3 or gap based on disc position within the window. col_zone = bucket(correct_col). row_zone = bucket(landing row).

**forced_block**: Apply `correct_col`, find the opponent's winning 4-window that the correct move blocks. Same field derivation as immediate_threat.

**double_threat**: Apply `correct_col`, find the two resulting threat cells. Shape descriptor = sorted pair of arm descriptors `{arm1: {orientation, subtype, col_zone, row_zone}, arm2: {orientation, subtype, col_zone, row_zone}}`. Each arm computed as per immediate_threat for that threat cell's winning window. Sort order: col_zone then row_zone then orientation then subtype.

**forbidden_columns**: orientation = null. subtype = null. col_zone = bucket(correct_col). row_zone = bucket(landing row).

**odd_even_threat**: orientation = null. subtype = null. col_zone = bucket(correct_col). row_zone = bucket(landing row).

**claimeven**: orientation = null. subtype = null. col_zone = bucket(correct_col). row_zone = bucket(landing row).

**claimodd**: orientation = null. subtype = null. col_zone = bucket(correct_col). row_zone = bucket(landing row).

**z_threat** (capsule metadata): Source = highlight_metadata `{type:'capsule', column, fromRow, toRow}`. orientation = null. subtype = null. col_zone = bucket(column). row_zone = bucket(Math.round((fromRow + toRow) / 2)).

**undercut** (cells metadata): Source = highlight_metadata.cells `[{role:'killing_threat'}, {role:'dead_threat'}]` — always same column. orientation = null. subtype = null. col_zone = bucket(killing_threat.column). row_zone = bucket(killing_threat.row).

**overcut** (cells metadata): Source = highlight_metadata.cells `[{role:'neutralised_threat'}, {role:'major_threat'}]` — always same column. orientation = null. subtype = null. col_zone = bucket(major_threat.column). row_zone = bucket(major_threat.row).

**figure_7** (cells metadata): Source = highlight_metadata.cells — 4 cells with pattern_piece roles.
1. Anchor cell = the cell at a row not shared with any other cell.
2. Junction cell = the cell in the horizontal group (max-row cells) whose column is closest to the anchor's column.
3. orientation = `'D↗'` if junction.col > anchor.col, `'D↘'` if junction.col < anchor.col.
4. col_zone = bucket(centroid column of all 4 cells, rounded to nearest integer).
5. row_zone = bucket(centroid row of all 4 cells, rounded to nearest integer).

**j_shape** (cells metadata): Source = highlight_metadata.cells — 3 cells with pattern_piece roles.
1. Spine cells = the two cells sharing the same column (rows r and r+2). Spine column = their column.
2. Bridge cell = the remaining cell (column = spine_col ± 1, row = r+1).
3. orientation = `'canonical'` if bridge.col > spine_col, `'mirror'` if bridge.col < spine_col.
4. col_zone = bucket(spine column).
5. row_zone = bucket(lower spine row r).

**forced_win** (highlight_cells): Source = puzzles.highlight_cells — 5 entries with roles hint/loser/hint/loser/winner.
1. orientation = `'returning'` if cells[0].col == cells[4].col, `'ascending'` if cells[0].col < cells[4].col, `'descending'` if cells[0].col > cells[4].col.
2. subtype = null.
3. col_zone = bucket(cells[0].column) — initiating hint column.
4. row_zone = bucket(cells[4].row) — winning cell row.

## Appendix B: Reindex Algorithm Specification

**Input**: A category slug and all active puzzles in that category (each with an id and shape_key).

**Output**: Each puzzle assigned a `position` integer (0, 1, 2, ... in global round-robin order).

**Algorithm** (pseudocode):

```
function reindex(puzzles):
  // 1. Group puzzles by shape_key
  groups = Map<shapeKey, Puzzle[]>
  // Preserve first-seen ordering of group keys
  groupKeys = []  // ordered array of distinct shape_keys

  for puzzle in puzzles:
    key = puzzle.shape_key
    if key not in groups:
      groups[key] = []
      groupKeys.push(key)
    groups[key].push(puzzle)

  // 2. Shuffle within each group
  for key in groupKeys:
    shuffle(groups[key])

  // 3. Round-robin interleave (matches FR-018 formula)
  numGroups = groupKeys.length
  maxGroupSize = max(groups.values().map(g => g.length))

  for sortedGroupPosition in 0..maxGroupSize-1:
    for groupIndex in 0..numGroups-1:
      if sortedGroupPosition < groups[groupKeys[groupIndex]].length:
        puzzleAt = groups[groupKeys[groupIndex]][sortedGroupPosition]
        puzzleAt.position = groupIndex + sortedGroupPosition * numGroups
```

**Result**: Puzzles from shape group A occupy positions 0, numGroups, 2*numGroups, ...; group B occupies 1, numGroups+1, 2*numGroups+1, ...; etc. This guarantees no two consecutive positions share the same shape_key.

**DB update**: After computing all positions, issue a batched UPDATE for all puzzles in the category in a single transaction. This is an admin-only, localhost-only operation — no concurrent-draw safety is needed.
