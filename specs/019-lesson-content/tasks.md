# Tasks: Lesson Content (11 Lessons)

**Branch**: `019-lesson-content` | **Spec**: `specs/019-lesson-content/spec.md` | **Plan**: `specs/019-lesson-content/plan.md`

---

## Task conventions

- All file paths are relative to `connect-four/`.
- All coordinates are 0-indexed unless marked with `(1-indexed)`.
- `npm run test:fast` (inside `connect-four/`) omits candidate-generator.test.js.

---

## Phase 0 — Research findings (already captured in plan.md)

No further research needed. Plan.md Phase 0 resolved all 10 unknowns.

### Key research result: `detectFigure7` already populates `threat_cells`

`detectFigure7` in `classifier.js` line 767 already returns `categoryEvidence.threat_cells` (populated from `threatCells` variable). The Figure-7 narration template (Task 30) does **not** require a classifier.js change. The context note about `categoryEvidence` being empty was based on stale knowledge — the current code ships the field. Verify this before Task 30 by inspecting `classifier.js` around line 767.

---

## Phase 1 — Design & Contracts (already captured in plan.md)

No changes to the plan.md design decisions.

---

## Phase 2 — Implementation tasks

### Group A: Lesson JSON Content Files (11 lessons)

**Note on lesson `id` convention**: The existing `lesson-01-immediate-threat.json` uses `id: "immediate-threat"` (short semantic slug, not `"lesson-01-spot-the-win"`). All new lessons follow this convention: `id` is the short slug, filename is `lesson-NN-<slug>.json`. Do not use long-form spec titles as IDs.

**Note on `boardSpec` values**: `'g'` = green (player 1 / Red), `'d'` = gray (player 2 / Yellow). Arrays are 7 elements, one per column, strings from bottom row (index 0) to top row (index 5).

**Note on overlay types**: Only `tg`, `td`, `claim`, `win` are allowed. Do not use `tr`.

**Note on i18n**: All text fields (coachMessages.text, legendItems[*].label, infoProse) use literal English strings stored as `defaultValue` for `t('lesson.<id>.slide.<n>.<field>', { defaultValue: value })`. Store the English text directly in the JSON.

---

#### Task 1 — Author Lesson 1 content (immediate-threat) [1h]

**File**: `lessons/lesson-01-immediate-threat.json` (exists — verify and update)
**Depends on**: Nothing

1. Read the existing `lesson-01-immediate-threat.json`.
2. Verify it matches FR-004 and FR-005:
   - `id: "immediate-threat"`, `free: true`, `userPerspective: "yellow"`
   - 2+ concept slides with `tg` overlays on winning cells
   - non-null `socratic` where Yellow has an immediate win (`correctCol` is the winning column)
   - `confirmationCategory: "immediate_threat"`, `confirmationCount: 2`
   - All `boardSpec` arrays have exactly 7 elements
3. If board positions need more depth (e.g., slide showing opponent-must-block scenario with multiple pieces), enhance the `boardSpec` and overlays. The current slide 1 has only a single green disc in col 0 — consider making the position more realistic.
4. Run validation: load via `GET /api/lessons/lesson-01-immediate-threat.json` (actual endpoint uses `id` field).

**Existing state**: Lesson has 2 slides, socratic, confirmation fields. The file uses the correct schema and validates. Acceptable as-is or may need position enrichment.

---

#### Task 2 — Author Lesson 2 (block-before-build) [2h]

**File**: `lessons/lesson-02-block-before-build.json` (new)
**Depends on**: Nothing

1. Author per FR-006 and FR-007:
   - `id: "block-before-build"`, `free: true`, `userPerspective: "yellow"`
   - 2+ concept slides showing forced block scenarios
   - Slide 0: opponent (Red) has a threat at a reachable cell, Yellow must play the blocking column. `tg` overlay on the blocking cell. Coach message explains why blocking is urgent.
   - Slide 1: board where building vs blocking is contrasted — show the consequence of not blocking. Coach message about "block before you build" priority.
   - non-null `socratic`: board where opponent (Red) has an immediate threat and Yellow must play the exact blocking column. `correctCol` set to the blocking column.
   - `confirmationCategory: "forced_block"`, `confirmationCount: 2`
2. All overlays use only `tg`, `td`, `claim`, or `win` types.
3. Verify `boardSpec` arrays have exactly 7 elements.

**Design hint**: A simple position: col 3 has Red discs at rows 0,1,2 and empty at row 3 (immediate Red win). Yellow can block by playing col 3. Surrounding cells can be filled with additional discs for realism. Use `d` for Yellow's discs, `g` for Red's discs.

---

#### Task 3 — Author Lesson 3 (the-fork) [2h]

**File**: `lessons/lesson-03-the-fork.json` (new)
**Depends on**: Nothing

1. Author per FR-008 and FR-009:
   - `id: "the-fork"`, `free: true`, `userPerspective: "yellow"`
   - 2+ concept slides covering both fork flavours:
     - **Slide 0 (Case A)**: Two threats in separate columns. `tg` overlays on both threat columns' gravity-top cells. Coach message: "A fork creates two threats your opponent can't both block."
     - **Slide 1 (Case B)**: Same-column adjacent rows (T1). `tg` overlays showing both threat cells stacked vertically. Coach message: "Even in the same column, two consecutive threats win — blocking one still leaves the other."
   - non-null `socratic`: Yellow can play a move that creates a double threat (either Case A or B). `correctCol` is that column.
   - `confirmationCategory: "double_threat"`, `confirmationCount: 2`
2. Keep board positions focused — 4-8 discs per board is sufficient for demonstration.

**Design hint for Case A socratic**: Board where Red has played low (rows 0-1) across several columns, Yellow has discs at rows 0-1 of cols 2 and 4. Playing col 2 or 4 creates two simultaneous threats. Or use a well-known fork position from immediate_threat puzzles.

---

#### Task 4 — Author Lesson 4 (odd-rows-belong-to-red) [1.5h]

**File**: `lessons/lesson-04-odd-rows-belong-to-red.json` (new)
**Depends on**: Nothing

1. Author per FR-010 and FR-011:
   - `id: "odd-rows-belong-to-red"`, `free: true`, `userPerspective: "red"`
   - **Reading-only**: `socratic: null`, `confirmationCategory: null`, `confirmationCount: 0`
   - 2-3 concept slides:
     - **Slide 0**: Parity diagram showing which rows belong to whom. Use a minimal board (empty or near-empty) with overlays: e.g., mark odd rows (0-indexed 0,2,4 = 1-indexed 1,3,5) with a `claim` overlay for Red, even rows (0-indexed 1,3,5 = 1-indexed 2,4,6) with `claim` for Yellow. Coach: "In Connect Four, odd rows belong to Red, even rows to Yellow. This is because the first piece in any column goes to row 0, which is odd (1-indexed)."
     - **Slide 1**: Why parity matters — the natural move order fills columns bottom-up. Show a column with pieces filling from row 0 upward. Coach: "Gravity means pieces fill from the bottom up. Red gets the bottom (row 0), Yellow gets row 1, Red gets row 2, and so on."
     - **Slide 2 (optional)**: How parity sets up advanced tactics (Claimeven, Z-Threats, undercut/overcut). Coach: "Understanding which rows belong to which player is the foundation for Claimeven, Z-Threats, and all advanced tactics."

2. No overlays needed beyond `claim` for parity demonstration. Legend items should explain the parity color coding.
3. `infoProse` on each slide should summarize the parity rule in a single paragraph.

---

#### Task 5 — Author Lesson 5 (claimeven) [2h]

**File**: `lessons/lesson-05-claimeven.json` (new)
**Depends on**: Nothing

1. Author per FR-012, FR-013, FR-014:
   - `id: "claimeven"`, `free: true`, `userPerspective: "yellow"`
   - 2+ concept slides:
     - **Slide 0**: Red plays into a column at an even (0-indexed) row. The even square directly above (the claimeven response cell) is shown with `claim` overlay. Coach: "When Red plays on an even row, Yellow can 'claim' the next cell above by playing there immediately."
     - **Slide 1**: After multiple claimeven responses, the board shows Yellow controlling multiple even-row cells with `claim` overlays. Coach: "Yellow's claimeven strategy: always respond above Red's even-row move."
   - non-null `socratic`: **Important**: Claimeven is Yellow's strategy. The Socratic board must be from Yellow's perspective — show a position where a claimeven move is the correct response. `correctCol` is the claimeven column.
   - `confirmationCategory: "claimeven"`, `confirmationCount: 2`
2. Use `claim` overlay type for claimeven response cells.
3. Verify `userPerspective` is `"yellow"` (claimeven is always taught as Yellow's strategy).

**Design hint**: Start with a board where Red has 2-3 pieces at even (0-indexed) rows in different columns. Yellow has pieces below or adjacent. The correct move is to play directly above one of Red's even-row pieces.

---

#### Task 6 — Author Lesson 6 (z-threats) [2h]

**File**: `lessons/lesson-06-z-threats.json` (new)
**Depends on**: Nothing

1. Author per FR-015 and FR-016:
   - `id: "z-threats"`, `free: true`, `userPerspective: "yellow"`
   - 2+ concept slides:
     - **Slide 0**: A board with a Z-Threat column showing odd count of empty cells between column top and threat cell. Coach: "The gap above the threat is odd — that means you own this threat. Your opponent cannot block it because they'd need an even number of moves to reach it."
     - **Slide 1**: How the opponent being forced to play the column fills the odd cells and enables the threat. Coach: "When your opponent is forced to fill this column, they fill the odd cells, leaving even cells (your turn) for you to complete the threat."
   - non-null `socratic`: Board where Yellow has a Z-Threat at a specific column. `correctCol` is the Z-Threat column. **Do not use `tg` overlays in socratic boardSpec** (the Epic 4 socratic screen handles overlays programmatically).
   - `confirmationCategory: "z_threat"`, `confirmationCount: 2`
2. Legend items should explain the Z-threat column marking.

**Design hint**: Position where a column has 2 empty cells above Yellow's threat row (count=2, even → not Z) vs 3 empty cells (count=3, odd → Z). Use multiple discs to show parity dynamics.

---

#### Task 7 — Author Lesson 7 (claimodd) [2h]

**File**: `lessons/lesson-07-claimodd.json` (new)
**Depends on**: Nothing

1. Author per FR-017, FR-018, FR-019:
   - `id: "claimodd"`, `free: true`, `userPerspective: "red"` (important: Red's perspective)
   - 2+ concept slides:
     - **Slide 0**: An all-even parity board diagram showing the problem for Red (Claimeven gives Yellow even rows). Coach: "When every column has an even height, Yellow's claimeven strategy dominates — Red gets the even rows, which are the wrong rows to win."
     - **Slide 1**: Playing center column (col 3) to establish an odd-row anchor and create a Z-Threat. `claim` overlay on the center column anchor cell. Coach: "Red can break the claimeven lock by playing the center column (col 3). This creates an odd-row anchor and sets up a Z-Threat."
   - non-null `socratic`: Board from Red's perspective where the correct move creates an odd-row anchor (usually col 3). `correctCol` is that column.
   - `confirmationCategory: "claimodd"`, `confirmationCount: 2`
2. `userPerspective` must be `"red"` (FR-018).
3. `free` must be `true` (claimodd is a free lesson, FR-018).

**Design hint for socratic**: Board where all columns have even colHeights (e.g., 2 discs per column), it's Red's turn. Center col 3 has even height and is not full. The correct move is col 3.

---

#### Task 8 — Author Lesson 8 (undercut) [2h]

**File**: `lessons/lesson-08-undercut.json` (new)
**Depends on**: Nothing

1. Author per FR-020 and FR-021:
   - `id: "undercut"`, `free: false`, `userPerspective: "yellow"`
   - 2+ concept slides:
     - **Slide 0**: A board showing two threats in the same column (one upper, one lower) where the lower opposite-parity threat is reached first. Overlays: `td` on the killing threat cell (lower), `tg` on the dead upper threat cell. Coach: "The undercut: a lower threat in the same column kills the upper threat because gravity fills bottom-up."
     - **Slide 1**: The undercut concept — compare with a non-undercut same-column pair. Coach: "The undercut only works when the lower threat is on a different parity row than the upper threat. Same-parity threats don't interact (T4 rule)."
   - non-null `socratic`: Board where Yellow's correct move avoids the undercut column (playing in it is losing). `correctCol` is a non-undercut winning column.
   - `confirmationCategory: "undercut"`, `confirmationCount: 2`
2. `free: false` (Pro-gated).
3. **Important**: The undercut column itself is a losing move (`scores[col] < 0`). The `correctCol` is NOT the undercut column — the correct move avoids it.

---

#### Task 9 — Author Lesson 9 (overcut) [2h]

**File**: `lessons/lesson-09-overcut.json` (new)
**Depends on**: Nothing

1. Author per FR-022 and FR-023:
   - `id: "overcut"`, `free: false`, `userPerspective: "yellow"`
   - 2+ concept slides:
     - **Slide 0**: Same-parity scenario where the upper threat beats the lower threat (T4 rule). Overlays: `tg` on the winning upper threat cell. Coach: "The overcut: when both threats are on the same parity row, the upper threat wins. Same-parity threats don't interact — the upper one reaches the win first."
     - **Slide 1**: Active-forcing case (T5 exception) where column parity makes the upper threat reachable first. Coach: "In the overcut, Yellow's upper threat neutralises Red's lower threat. The parity advantage flips the column."
   - non-null `socratic`: Board where Yellow's winning move is the overcut column (playing in it is winning — `scores[col] > 0`). `correctCol` is the overcut column.
   - `confirmationCategory: "overcut"`, `confirmationCount: 2`
2. `free: false` (Pro-gated).

**Design hint**: Board where both players have threats in the same column. Yellow's threat is at an upper row, Red's threat is below it. Both threats are on the same parity (T4) or the T5 exception applies. Yellow's correct move is that column.

---

#### Task 10 — Author Lesson 10 (figure-7-trap) [2h]

**File**: `lessons/lesson-10-figure-7-trap.json` (new)
**Depends on**: Nothing

1. Author per FR-024 and FR-025:
   - `id: "figure-7"`, `free: false`, `userPerspective: "yellow"`
   - 2+ concept slides:
     - **Slide 0**: A board with the five-disc Figure-7 configuration (4 pattern pieces + 1 completing cell). Overlays: `tg` on all five pattern cells and both threat rows. Coach: "The Figure 7 pattern: an L-shape of 4 discs plus one key cell that creates two threats the opponent cannot both block."
     - **Slide 1**: Why the opponent cannot block both threats in sequence — the zugzwang property. Coach: "The opponent can only block one threat at a time. Blocking one leaves the other exposed — and the turn order means you always get the winning move."
   - non-null `socratic`: Board where Yellow has a Figure-7 pattern that can be completed. `correctCol` is the completing cell.
   - `confirmationCategory: "figure_7"`, `confirmationCount: 2`
2. `free: false` (Pro-gated).

**Design hint**: Use the canonical Figure-7 shape: 4 Yellow discs forming an ascending diagonal (cols c,c+1,c+2 at rows r,r+1,r+2) plus horizontal arm (cols c+1,c+2 at row r+2, or col c at row r+2). The completing cell is the junction (col c+1, row r+2). Refer to `detectFigure7` variants in `classifier.js` for exact template shapes.

---

#### Task 11 — Author Lesson 11 (j-shape) [1.5h]

**File**: `lessons/lesson-11-j-shape.json` (new)
**Depends on**: Nothing

1. Author per FR-026 and FR-027:
   - `id: "j-shape"`, `free: false`, `userPerspective: "yellow"`
   - 2+ concept slides:
     - **Slide 0**: A board with the four-disc J-Shape L-configuration. Overlays: `tg` on all four pattern cells showing the three threat directions. Coach: "The J-Shape: an L-shaped cluster of 4 discs that creates three winning continuations. Your opponent can block one, maybe two — but not all three."
     - **Slide 1**: Why triple threats are strategically unblockable. Coach: "With threats in three directions (vertical, horizontal, diagonal), the opponent would need three moves to block all of them. They only get one."
   - non-null `socratic`: Board where Yellow has a J-Shape that can be completed. `correctCol` is the completing cell.
   - `confirmationCategory: "j_shape"`, `confirmationCount: 2`
2. `free: false` (Pro-gated).

**Design hint**: Use the canonical J-Shape: two Yellow discs in the same column at rows r and r+2, one disc at (c+1, r+1), completing cell is (c+1, r+2). Or mirror: (c-1, r+1) completing cell. Refer to `detectJShape` in `classifier.js` for exact template shapes.

---

### Group B: Backend — Category Registration

---

#### Task 12 — Add `claimodd` to server categories.js [10min]

**File**: `server/categories.js`
**Depends on**: Nothing

1. Add `'claimodd'` to `VALID_CATEGORIES` set (between `z_threat` and `undercut`).
2. Add `'claimodd'` to `CATEGORY_ORDER` array (between `z_threat` and `undercut`).
3. Add `'claimodd'` to `CATEGORY_NAMES` map: `claimodd: 'Claimodd'`.
4. **Do NOT** add `'claimodd'` to `PAID_CATEGORIES` — it is a free category (FR-033). Verify by reading the current `PAID_CATEGORIES` set before editing.

---

#### Task 13 — Add `claimodd` to frontend categories.js [10min]

**File**: `src/lib/categories.js`
**Depends on**: Task 12 (must mirror server changes)

1. Add `'claimodd'` to `CATEGORY_ORDER` array (between `z_threat` and `undercut`), matching Task 12's order exactly.
2. Add `'claimodd'` to `CATEGORY_NAMES` map.
3. Add `'claimodd'` to `CATEGORY_CHIPS` map (use a new color distinct from existing chips; e.g., `#a3e635` green or `#2dd4bf` teal).
4. Add `'claimodd'` to `GOAL_PROMPTS` map (e.g., "Break the claimeven lock by creating an odd-row anchor.").

---

#### Task 14 — Add `claimodd` entry to challengeSets.js [10min]

**File**: `server/challengeSets.js`
**Depends on**: Task 27 (i18n keys) — the `displayNameKey` and `descriptionKey` must exist in `en.json` before this entry is resolvable.

1. Add entry to `CHALLENGE_SETS` array:
   ```js
   { slug: 'claimodd', displayNameKey: 'challengeSet.claimodd.displayName', descriptionKey: 'challengeSet.claimodd.description', stars: 3, free: true },
   ```
2. Place the entry between `z_threat` and `forbidden_columns` (matching the spec's order).

**Note**: Challenge sets order mirrors the Saga Map display order. Position `claimodd` between `z_threat` (free, 3 stars) and `forbidden_columns` (free, 2 stars).

---

#### Task 15 — Verify Pro entries already exist in challengeSets.js [5min]

**File**: `server/challengeSets.js` (read-only check)
**Depends on**: Nothing

1. Verify these entries are present with correct `free: false` and star ratings:
   - `undercut` — `stars: 4, free: false`
   - `overcut` — `stars: 4, free: false`
   - `figure_7` — `stars: 4, free: false`
   - `j_shape` — `stars: 4, free: false`
2. If any entry is missing or has wrong values, fix it.
3. **Current state** (verified in plan.md Phase 0): All 4 entries exist and are correct. No changes needed.

---

### Group C: Backend — Detector and PATTERN_KB Additions

---

#### Task 16 — Add `immediate_threat` PATTERN_KB entry to llmCoachHelpers.js [10min]

**File**: `server/llmCoachHelpers.js`
**Depends on**: Nothing

1. Add to the `PATTERN_KB` map (~50 lines from file start):
   ```js
   immediate_threat: { inline: 'An immediate threat is a move that creates four-in-a-row on the very next turn. When a player has three discs in a row with an open space at either end, that space is their winning cell. Immediate threats are decisive because they end the game before the opponent can respond.' },
   ```
2. Position alphabetically in the map (before `baseclaim`).

---

#### Task 17 — Add `forced_block` PATTERN_KB entry to llmCoachHelpers.js [10min]

**File**: `server/llmCoachHelpers.js`
**Depends on**: Nothing

1. Add to the `PATTERN_KB` map:
   ```js
   forced_block: { inline: 'A forced block occurs when the opponent has an immediate winning threat and only a specific set of columns can neutralise it while all other legal moves leave the threat unanswered. Blocking a forced threat is the only legal good move — any other move loses immediately.' },
   ```
2. Position alphabetically in the map (after `figure_7`, before `forced_win`).

---

#### Task 18 — Add `claimodd` PATTERN_KB entry to llmCoachHelpers.js [10min]

**File**: `server/llmCoachHelpers.js`
**Depends on**: Nothing

1. Add to the `PATTERN_KB` map. Check if a `community-claimodd.md` KB article exists in `docs/knowledge-base/`. If yes, use `{ id: 'community-claimodd' }`. If not, use inline prose:
   ```js
   claimodd: { inline: 'Claimodd is Red\'s response to Claimeven: when every column has an even height, Red breaks the parity lock by playing the center column (col 3) to establish an odd-row anchor. This creates a Z-Threat that flips the column\'s parity and gives Red a winning threat that Yellow cannot claim.' },
   ```
2. Position alphabetically in the map (after `claimeven`, before `double_threat`).

---

#### Task 19 — Build `detectClaimodd(board, scores)` in classifier.js [30min]

**File**: `server/classifier.js`
**Depends on**: Nothing

1. Add a new synchronous function `detectClaimodd(board, scores)` (~25 lines):
   - Signature: `(board, scores)` — both parameters are passed; `board` is a `Board` instance, `scores` is `number[7]`
   - Detection predicate (all must be true):
     - All columns have even `colHeights` (each `colHeights[col] % 2 === 0`)
     - `board.currentPlayer === 1` (it is Red's turn)
     - Center column is not full (`board.colHeights[3] < 6`)
     - `scores[3] > 0 && scores[3] === Math.max(...legalScores)` (col 3 is winning and ties the maximum)
   - Return value per FR-038:
     ```js
     { matched: true, correctCol: 3 }
     ```
     or `{ matched: false }` when unmatched.
   - **No solver calls needed** — synchronous O(7) parity check + scores comparison.
2. Export the function alongside existing detectors.
3. **Important**: This is `detectClaimodd` (Red's strategy), NOT `detectClaimeven` (Yellow's strategy). These are separate detectors with different predicates.

**Test locator**: A test file will be added in Task 33. The function can be manually tested after this task:
- Positive: board where all colHeights are even, Red's turn, scores[3] > 0 and ties max
- Negative: board with any odd colHeight, OR not Red's turn, OR scores[3] <= 0 or not max

---

#### Task 20 — Register `detectClaimodd` in DETECTOR_REGISTRY [5min]

**File**: `server/explainSimulate.js`
**Depends on**: Task 19 (detectClaimodd must exist)

1. Import `detectClaimodd` from `./classifier.js` in the existing import block (line 16-29).
2. Add to `DETECTOR_REGISTRY` array (around line 60, after the `j_shape` entry):
   ```js
   { name: 'claimodd', fn: detectClaimodd, isAsync: false, histType: 'col' },
   ```
3. `isAsync: false` (synchronous), `histType: 'col'` (column-based histogram).

---

#### Task 21 — Add `reason` field to `detectOvercut` return object [15min]

**File**: `server/classifier.js`
**Depends on**: Nothing

1. Locate `detectOvercut` function (line ~581). The function has three OR-connected predicates inside the inner loop (lines 596-598):
   - `isT4SameParity(R, neutralised)` → `"same_parity_t4"`
   - `isT5Exception(R, neutralised)` → `"active_forcing"`
   - `isT2Blocking(colRows, neutralised)` → `"chain_t2"`
2. Add a `reason` field to the return object (line ~599-609) that identifies which sub-case applied:
   ```js
   reason: isT4SameParity(R, neutralised) ? 'same_parity_t4'
         : isT5Exception(R, neutralised) ? 'active_forcing'
         : 'chain_t2',
   ```
3. The three predicates are already evaluated on lines 596-598. The `reason` field just names the one that passed. No new logic or solver calls needed.
4. **Contract**: When `matched === true`, `reason` must never be `null` or `undefined`. One of the three predicates is always true (the guard on line 596 ensures at least one holds before returning).
5. **Manual verification**: Load a board where `detectOvercut` returns `matched: true` and confirm `result.reason` is one of `'same_parity_t4'`, `'active_forcing'`, or `'chain_t2'`.

---

### Group D: i18n — Coach Phrase Pools and Challenge Set Keys

---

#### Task 22 — Add coach phrase pools for `claimodd` in en.json [20min]

**File**: `src/i18n/en.json`
**Depends on**: Nothing (can run in parallel with Group A)

1. Add blocks under the `coach` namespace with key `coach.claimodd.*`:
   - `prompt` (3-4 variants): "As Red, break the claimeven lock — find the odd-row anchor.", "Red is stuck on even rows. Create an odd-row threat.", etc.
   - `hint` (2-3 variants): "Look for a column where playing gives Red an odd-row anchor.", "Check if center column creates a parity shift.", etc.
   - `optimal` (2-4 variants): "Perfect — you broke the claimeven lock.", "That odd-row anchor shifts the parity.", etc.
   - `suboptimal` (2-4 variants): "You're staying on even rows — try center column.", "Good effort, but an odd-row anchor was stronger.", etc.
   - `blunder` (2-4 variants): "That keeps Red on even rows — Yellow's claimeven still dominates.", "You need an odd-row anchor — this column doesn't provide it.", etc.
2. Position `claimodd` block alphabetically alongside other category blocks (between `claimeven` and `double_threat` in the existing structure).
3. Per FR-042: each pool must have at least 2 variants; 4+ recommended for optimal/blunder.

---

#### Task 23 — Add coach phrase pools for `undercut` (Pro) in en.json [15min]

**File**: `src/i18n/en.json`
**Depends on**: Nothing

1. Add blocks under `coach.undercut.*`:
   - `prompt` (3-4 variants)
   - `hint` (2-3 variants)
   - `optimal` (2-4 variants)
   - `suboptimal` (2-4 variants)
   - `blunder` (2-4 variants)
2. Position alphabetically — note: `undercut` comes before `z_threat` alphabetically in the file. Insert with correct ordering.
3. Per FR-042: at least 2 variants each, 4+ recommended for optimal/blunder.

---

#### Task 24 — Add coach phrase pools for `overcut` (Pro) in en.json [15min]

**File**: `src/i18n/en.json`
**Depends on**: Nothing

1. Add blocks under `coach.overcut.*` for all 5 pool types.
2. Minimum 2 variants each, 4+ recommended for optimal/blunder.

---

#### Task 25 — Add coach phrase pools for `figure_7` (Pro) in en.json [15min]

**File**: `src/i18n/en.json`
**Depends on**: Nothing

1. Add blocks under `coach.figure_7.*` for all 5 pool types.
2. Minimum 2 variants each, 4+ recommended for optimal/blunder.

---

#### Task 26 — Add coach phrase pools for `j_shape` (Pro) in en.json [15min]

**File**: `src/i18n/en.json`
**Depends on**: Nothing

1. Add blocks under `coach.j_shape.*` for all 5 pool types.
2. Minimum 2 variants each, 4+ recommended for optimal/blunder.

---

#### Task 27 — Add claimodd challengeSet i18n keys [5min]

**File**: `src/i18n/en.json`
**Depends on**: Nothing

1. Add these keys in the `challengeSet` namespace (alongside existing `challengeSet.claimeven.*` keys):
   ```json
   "challengeSet": {
     "claimodd": {
       "displayName": "Claimodd",
       "description": "Break the parity lock — find Red's odd-row anchor against Claimeven"
     }
   }
   ```
2. This is a prerequisite for Task 14 (challengeSets.js `claimodd` entry).

---

### Group E: Backend — Narration Templates for Deep Reveal

**Important pre-requisite knowledge**: The narration templates are wired as named optional parameters on `buildExplainPrompt()` in `llmCoachHelpers.js`. Data for each parameter is assembled in `buildExplainContext()` in `server/index.js` (the function that calls `buildExplainPrompt`). Each parameter is appended to the prompt's pattern section when non-null.

---

#### Task 28 — Add claimeven narration template [20min]

**Files**: `server/index.js` (buildExplainContext), `server/llmCoachHelpers.js` (buildExplainPrompt)
**Depends on**: Nothing (narration is textual, not category-dependent for wiring)

1. **In `server/llmCoachHelpers.js`**:
   - Add optional parameter `claimevenNarration` to `buildExplainPrompt()`'s destructured parameter list.
   - In the prompt body, append the narration to the pattern section when non-null. Add after the `patternSection` and `kbSection` but before forcedWin examples:
     ```js
     const narrationSection = [claimevenNarration, zThreatNarration, figure7Narration, jShapeNarration]
       .filter(Boolean)
       .join('\n\n');
     ```
     (This assumes all 4 narration params share the same optional naming convention. Adjust if only claimeven exists at this point.)

2. **In `server/index.js`**: Inside `buildExplainContext()`, after the `kbSection` is computed and before the prompt is assembled, add:
   ```js
   const claimevenNarration = classificationResult?.detectClaimeven?.matched
     ? 'Yellow wins by always responding above Red. The claimeven strategy guarantees Yellow controls every even-row cell that Red plays into — Red cannot escape the parity lock.'
     : null;
   ```
   The exact matching syntax depends on how `buildExplainContext` accesses detector results. Inspect the function to determine the correct access path.

3. **Data flow**: `buildExplainContext()` assembles the narration string, passes it as `claimevenNarration` to `buildExplainPrompt({...})`, which appends it to the prompt when non-null.

**Note**: The plan mentions four narration parameters (`claimevenNarration`, `zThreatNarration`, `figure7Narration`, `jShapeNarration`). It is acceptable to add them incrementally per task.

---

#### Task 29 — Add Z-Threat narration template [20min]

**Files**: `server/index.js`, `server/llmCoachHelpers.js`
**Depends on**: Task 28 (establishes the narration wiring pattern)

1. **In `server/index.js`**: Inside `buildExplainContext()`, assemble a `zThreatNarration` string:
   - Read `badgeCount` from `highlightMetadata.badgeCount` (returned by `detectZThreat` as part of the capsule metadata — see `classifier.js` line 522).
   - Citation: `"The odd gap count of ${badgeCount} means Yellow's opponent cannot block this threat — every move they make in this column fills an odd cell, advancing Yellow toward the winning even row."`
   - Optionally cite the `community-z-threat` KB prose by referencing the loaded KB statement.
   - Pass as `zThreatNarration` parameter to `buildExplainPrompt()`.

2. **In `server/llmCoachHelpers.js`**: Add `zThreatNarration` to the destructured parameters and the narration section assembly (from Task 28).

3. **Guard**: Only emit when `detectZThreat` matches and `highlightMetadata` has a non-null `badgeCount`.

---

#### Task 30 — Add Figure-7 narration template [20min]

**Files**: `server/index.js`, `server/llmCoachHelpers.js`
**Depends on**: Task 28 (establishes the narration wiring pattern)

1. **Pre-requisite check**: `detectFigure7` in `classifier.js` returns `categoryEvidence.threat_cells` populated (verified in Phase 0 Research — line 767 populates it). **No classifier.js change needed.**
2. **In `server/index.js`**: Inside `buildExplainContext()`, assemble a `figure7Narration` string:
   - Read `categoryEvidence.threat_cells` from the Figure-7 detection result.
   - Both threat rows are available as `{ column, row }` objects. Extract the two distinct row values.
   - Template: `"The Figure-7 creates threats at rows ${row1+1} and ${row2+1} (1-indexed) that cannot both be blocked. Blocking one leaves the other exposed — and turn order guarantees Yellow plays the winning move."`
   - Pass as `figure7Narration` parameter to `buildExplainPrompt()`.

3. **In `server/llmCoachHelpers.js`**: Add `figure7Narration` to destructured params and narration section assembly.

---

#### Task 31 — Add J-Shape narration template [20min]

**Files**: `server/index.js`, `server/llmCoachHelpers.js`
**Depends on**: Task 28 (establishes the narration wiring pattern)

1. **In `server/index.js`**: Inside `buildExplainContext()`, assemble a `jShapeNarration` string:
   - The J-Shape creates three winning continuations (vertical, horizontal, diagonal). Cite the pattern cells from `categoryEvidence.pattern_cells` (returned by `detectJShape`).
   - Reference the KB statement from `allen-j-configuration` (loaded via `loadKBStatement`).
   - Template: `"The J-Shape cluster creates three simultaneous winning threats: vertical, horizontal, and diagonal. Your opponent would need three moves to block all three — they only get one."`
   - Pass as `jShapeNarration` parameter to `buildExplainPrompt()`.

2. **In `server/llmCoachHelpers.js`**: Add `jShapeNarration` to destructured params and narration section assembly.

---

### Group F: Verification

---

#### Task 32 — Write undercut puzzle existence verification [30min]

**File**: `scripts/verify-undercut-puzzles.mjs` (new one-shot script)
**Depends on**: Nothing

1. Create a read-only verification script at `connect-four/scripts/verify-undercut-puzzles.mjs`:
   - Query `GET /api/puzzles/draw?category=undercut&n=10` (or query Supabase DB directly: `SELECT * FROM puzzles WHERE category='undercut' AND approved=true LIMIT 10`).
   - For each puzzle, simulate the position and run `detectUndercut` to verify the undercut trap column is distinct from the correct column (the column the learner should play).
   - Flag any puzzle where the undercut trap column equals the correct column (these won't work as confirmation challenges).
   - Report: total approved undercut puzzles, count with distinct trap column, count where trap == correct.
   - **Read-only** — no inserts, updates, or deletes (FR-048).
2. Document the verification command in a comment at the top of the script.
3. This script is a manual QA tool — it does not run at startup or in CI.

**Note**: Puzzle population is Epic 6 scope. If zero approved undercut puzzles exist, the script should report "No approved puzzles — Epic 6 flag" and exit cleanly (FR-047).

---

#### Task 33 — Write detectClaimodd unit test [15min]

**File**: `tests/unit/detectClaimodd.test.js` (new)
**Depends on**: Task 19 (detectClaimodd must exist)

1. Create `connect-four/tests/unit/detectClaimodd.test.js`:
   - **Positive fixture**: Construct a board where all 7 columns have even colHeights (e.g., 2 discs each), it's Red's turn, center col 3 is not full, and scores[3] is positive and ties the maximum score. Verify `{ matched: true, correctCol: 3 }`.
   - **Negative fixture 1**: Same board but any column has odd colHeight. Verify `{ matched: false }`.
   - **Negative fixture 2**: Board with all even colHeights, but it's Yellow's turn (currentPlayer = 2). Verify `{ matched: false }`.
   - **Negative fixture 3**: Board with all even colHeights, Red's turn, but scores[3] <= 0. Verify `{ matched: false }`.
   - **Negative fixture 4**: Board with all even colHeights, Red's turn, scores[3] > 0 but not the maximum. Verify `{ matched: false }`.
2. Use `import { Board, detectClaimodd } from '../../server/classifier.js'` for imports.
3. Boards can be constructed via movestrings or direct Board manipulation. For movestring construction, use strings that produce the required parity state (e.g., a string of even-length placements to keep colHeights even).

---

#### Task 34 — Run validation: all 11 lesson JSON files load [10min]

**Files**: All lesson JSON files in `lessons/`
**Depends on**: Tasks 1-11 (all lesson files must exist)

1. Start the server: `node server/index.js` or via the app's start script.
2. Verify no `[lessonLoader] invalid lesson file` or `[lessonLoader] failed to parse` errors appear in the server logs.
3. Call `GET /api/lessons` and verify all 11 lessons are returned.
4. Call `GET /api/lessons/<id>` for each of the 11 lesson IDs and verify the response is valid JSON with all required fields.
5. If any lesson is excluded, fix the JSON file (check FR-002 fields and `boardSpec` array lengths).

---

#### Task 35 — Run existing test suite — confirm no regressions [10min]

**File**: (entire test suite)
**Depends on**: Tasks 12-31 (all backend and frontend changes)

1. Run `npm run test:fast` inside `connect-four/`.
2. Verify all existing tests pass (FR-050: all backend additions are purely additive — no existing behavior changes).
3. If any test fails, investigate whether the failure is caused by this epic's changes and fix it.
4. **Note**: The candidate-generator test is intentionally skipped by `test:fast`. Do not run `npm test` (which includes it) unless explicitly instructed.

---

## Dependency graph summary

```
Task 1-11 (lessons, parallel) ──┐
                                 ├── Task 34 (validate loading)
Task 16-18 (PATTERN_KB) ────────┤
Task 19 (detectClaimodd) ───────┼── Task 35 (test:fast)
     └── Task 20 (registry) ────┤
Task 21 (overcut reason) ───────┤
Task 12-15 (cat registration) ──┤
     └── i18n for Task 14: Tasks 22-27 ──┐
     └── ──────────────────────────────┘  
Task 28-31 (narration) ─────────┤
Task 32 (verify undercut) ──────┤
Task 33 (detectClaimodd test) ──┘ (depends on Task 19)
```

**Parallel-friendly groups**:
- Group A (lessons 1-11) and Group C (PATTERN_KB entries) and Group D (i18n) are fully independent — can be authored in parallel.
- Group B (cat registration) is independent from Group A but the `claimodd` challenge set entry depends on i18n keys from Task 27.
- Group E (narration templates) depends only on understanding the `buildExplainContext`/`buildExplainPrompt` flow — can begin after Tasks 16-18 are done.
- Group F must run after all other groups complete.

## Handoff context

### Task ordering decisions

- **Lesson files (Tasks 1-11) are fully parallel** because each is a standalone JSON file with no shared dependencies. However, the review pass (Task 34) must wait for all 11 to exist.
- **Category registration (Tasks 12-15) is ordered**: server categories.js -> frontend mirror -> challengeSets.js. The frontend must exactly mirror the server (atomic update constraint from spec).
- **Task 14 blocked on Task 27**: The `challengeSet.claimodd.displayName` and `.description` i18n keys must exist in `en.json` before the challengeSets.js entry is resolvable at runtime. If the i18n keys are missing, the frontend will show broken translation keys.
- **detectClaimodd built (Task 19) before registry (Task 20)**: The function must exist before it can be referenced in DETECTOR_REGISTRY. This is a require-time dependency — the import will fail if detectClaimodd is not exported.

### Non-obvious dependencies and judgements

- **Task 30 (Figure-7 narration) does NOT need a classifier.js change**: The context note in the plan referenced stale knowledge. `detectFigure7` in `classifier.js` line 767 already returns `categoryEvidence.threat_cells` populated. Verify this at Task 30 start by inspecting line 767 of classifier.js, but the change is unnecessary.
- **detectClaimodd vs detectClaimeven**: These are different detectors. `detectClaimeven` already exists (async, solver-based, Yellow's strategy). `detectClaimodd` is new (sync, parity-based, Red's strategy). Do not confuse them.
- **Lesson 4 (reading-only) edge case**: Must have `socratic: null` AND `confirmationCategory: null` AND `confirmationCount: 0`. The Epic 4 infrastructure handles this by advancing from last slide to completion. If any of these three fields is wrong, the lesson flow breaks.
- **Lesson 7 (claimodd) is `free: true`**: Despite being lesson 7 (the boundary between free and Pro content in the Saga Map), claimodd is a free lesson. Only lessons 8-11 are `free: false`. This is documented in the spec but is easy to get wrong.

### Verification blind spots

- **Socratic board quality is not machine-verifiable**: Task 34 can validate JSON schema, but cannot verify that a Socratic position actually has one correct answer. Each Socratic board should be manually tested: load the lesson, verify the correct column is indeed winning, and wrong columns are not.
- **Coach phrase quality**: Task 22-26 add the minimum required variants (2 per pool). The spec recommends 4+ for optimal/blunder. If implementers want better variety, add more variants now — the pool is expensive to edit later (many files touched per phrase change).
- **Board positions are display-only**: The lesson boardSpec arrays are static diagrams, not solver-verified. They don't need to be playable — they are concept illustrations. However, Socratic boardSpec positions should be verified: the `correctCol` must actually be a winning column from that position.
