# Feature Specification: Allis Puzzle Category Expansion

**Feature Branch**: `007-allis-puzzle-categories`  
**Created**: 2026-05-12  
**Status**: Draft  
**Input**: Expand the puzzle category system for DecodeC4 to include all tactical patterns from Victor Allis's VICTOR solver, as documented in docs/allis_thesis_report.md, except Aftereven, Before, and Specialbefore.

## Clarifications

### Session 2026-05-12

- Q: Should the `vertical` puzzle follow the Allis reactive model (opponent plays lower even square → user plays upper odd square) or a proactive model (user plays lower square pre-emptively)? → A: Reactive — Allis is the source of truth. Opponent plays the lower (even-row) square first; user responds with the upper (odd-row) square directly above.
- Q: Should `highinverse` require a verified opponent threat intersecting the structure's guarantee pairs (consistent with lowinverse), or is the structural condition alone sufficient? → A: Require opponent threat — at least one opponent group must intersect the highinverse guarantee pairs (top-square pair, middle-square pair, or column-local verticals).
- Q: For `zugzwang` (new), what does "most alternatives lose zugzwang control" mean precisely? → A: All legal moves except the correct move(s) must score ≤ 0. Strict threshold; guarantees one unambiguous correct answer.
- Q: Are `b1/b2/b3` and `e2` in the baseclaim spec abstract placeholders or literal board coordinates? → A: Abstract placeholders — renamed to `left`/`mid`/`right` (any three adjacent empty row-1 squares) and `above_mid` (the empty row-2 square directly above `mid`).
- Q: Should the new `zugzwang` category (find the move maintaining control, all others lose it) be kept or removed? → A: Removed. Any position where exactly one move maintains zugzwang control will also satisfy a specific Allis structural predicate (Claimeven, Lowinverse, etc.), making a score-only `zugzwang` category redundant and its explanation weaker than the structural alternative. Zugzwang awareness is taught implicitly by all paid-tier Allis categories.
- Q: For `lowinverse`, does "exactly 2 consecutive empty squares" mean the entire column has 2 empties, or just the pair? → A: Just the pair — the Lowinverse pair is any 2 consecutive empty squares (upper odd) within the column; additional empties above are allowed. Restricting to whole-column empties would limit detection to near-full boards only, inconsistent with the Allis report.
- Q: Should "useless threat" (Aftereven concept) be a puzzle category or a classifier tag? → A: Classifier tag only (`useless_threat`). Aftereven as a solving rule remains out of scope; the tag lets the Explanation Engine name the pattern without adding a new predicate or candidate-generation target.
- Q: For `vertical`, how many opponent discs in the column and what is the vertical pair? → A: 1 disc at row 1; pair is {row 2 (even, lower), row 3 (odd, upper)}; trigger = opponent plays row 2; correct response = row 3. Upper must be odd per Allis; 2-disc variant places upper at row 4 (even) which Claimeven handles instead.
- Q: Should `vertical` be generalised to allow the {row 4, row 5} variant (opponent has 3 discs at rows 1–3)? → A: No — restrict to {row 2, row 3} for this feature. The {row 4, row 5} case is a known out-of-scope simplification noted in FR-006; the restricted case is sufficient for pedagogical purposes and candidate generation targets.
- Q: Should `baseinverse` be restricted to row-1 squares or generalised to any directly playable squares? → A: Generalised — the thesis defines Baseinverse as any two directly playable squares (lowest empty in their columns) belonging to the same opponent threat group; row-1-only is overly restrictive and excludes valid mid-board pairs like {c4, d3}.
- Q: Should `baseclaim` require the three base squares to be adjacent columns? → A: No — the thesis example uses non-adjacent columns (b1, c1, e1). The three squares need only be directly playable (lowest empty in their columns); adjacency is not a thesis requirement.
- Q: What is the exact parity constraint for empty squares above Lowinverse/Highinverse pairs? → A: Deferred — the thesis states "the number of extra squares available must be even/odd" for zugzwang to be preserved, but geometric analysis shows the per-column direction cannot be encoded without thesis PDF verification (valid Lowinverse positions always have odd squares above the pair; valid Highinverse positions always have even squares above, which conflicts with naive per-column formulations). The planning phase must verify the exact constraint from the thesis before implementing.
- Q: Should the `lowinverse` predicate exclude positions where a Claimeven pair exists in the same column below the Lowinverse pair? → A: Yes — add as an explicit exclusion. A below-pair Claimeven shifts that column's parity and breaks the forcing guarantee that makes Lowinverse valid. Consistent with Allis: "no other Claimeven can be placed below the squares involved in the Lowinverse."
- Q: Are the baseclaim branch parentheticals correct? → A: Two fixes applied: (1) left-trigger branch adds "(then Claimeven applies to {mid, above_mid})" — after left→right, remaining {mid, above_mid} are same-column row-1/row-2 = valid Claimeven pair. (2) mid-trigger changes "Claimeven" to "Baseinverse" for {left, above_mid} — left (col L row 1) and above_mid (col M row 2) are in different columns, so Claimeven cannot apply; consistent with the Allis report's "Baseinverse logic for {b1, c2}."
- Q: In baseclaim, when the opponent plays `right`, should the correct response be `left` or `mid`? → A: `mid` — consistent with the Allis report ("If White plays e1 → Black plays c1"), leaving {`left`, `above_mid`} as the remaining Baseinverse pair. The previous `left` response was wrong because it left {`mid`, `above_mid`} (same-column pair = Claimeven, not Baseinverse).
- Q: How many opponent discs must already be in the column for a valid `vertical` puzzle? → A: Exactly 1 disc at row 1. The Vertical pair is {row 2 (even, lower), row 3 (odd, upper)}. The trigger is the opponent playing row 2; the correct response is row 3 (odd). This is the only configuration consistent with the Allis rule that "the upper square must be odd (row 3 or 5)." A configuration with 2 discs at rows 1–2 would place the pair at {row 3, row 4} with an even upper square — which Claimeven handles, not Vertical.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Play a Baseinverse or Vertical puzzle (Priority: P1)

A free-tier user encounters a puzzle tagged `baseinverse` or `vertical`. The board shows a position where the salient tactic is pairing two base squares (baseinverse) or claiming the odd square above an opponent's vertical trigger (vertical). The user selects a move, and the Explanation Engine explains the relevant Allis rule.

**Why this priority**: These are free-tier categories that introduce players to Allis's zugzwang-independent rules. They are simpler to detect and serve as the entry point to the tactical system.

**Independent Test**: A candidate generator run produces ≥ 5 valid baseinverse candidates and ≥ 5 valid vertical candidates within 400 attempts each. The correct-move checker accepts the paired square(s) for baseinverse and the upper (odd) vertical square for vertical.

**Acceptance Scenarios**:

1. **Given** a position with two directly playable squares (lowest empty in their columns) belonging to the same opponent 4-in-a-row line and no immediate win for either player, **When** the user plays either of those two squares, **Then** the move is marked correct.
2. **Given** the same baseinverse position, **When** the user plays any other column, **Then** the move is marked incorrect.
3. **Given** a position where the opponent has exactly 1 disc at row 1 of a column and has just played row 2 of that column (the trigger), row 3 is empty (the correct response, odd row), the vertical pair {row 2, row 3} belongs to the opponent's 4-in-a-row group, and no immediate win is available, **When** the user plays row 3 (the odd square directly above the trigger), **Then** the move is marked correct.
4. **Given** the same vertical position, **When** the user plays any other column, **Then** the move is marked incorrect.

---

### User Story 2 — Play a Claimeven puzzle (Priority: P2)

A paid-tier user encounters a position tagged `claimeven`. The opponent just played into an odd square of a claimeven column and the user must respond directly above, claiming the even square.

**Why this priority**: Claimeven is the foundational Allis rule and the gateway paid-tier category. All higher-order Allis rules (Lowinverse, Highinverse, Baseclaim) build on it.

**Independent Test**: Candidate generator produces ≥ 5 valid claimeven candidates within 400 attempts, with correct highlight_cells populated.

**Acceptance Scenarios**:

1. **Given** a position where the current player has zugzwang control and the opponent just played an odd square in a claimeven column, **When** the user plays the even square directly above, **Then** the move is marked correct.
2. **Given** the same claimeven position, **When** the user plays any other column, **Then** the move is marked incorrect.

---

### User Story 3 — Play Lowinverse, Highinverse, or Baseclaim puzzles (Priority: P3)

A paid-tier user encounters advanced compound puzzles (`lowinverse`, `highinverse`, `baseclaim`). Each puzzle is presented at the moment the opponent has just triggered one of the paired columns; the user must supply the correct reactive response.

**Why this priority**: These are advanced paid-tier categories that build on claimeven and baseinverse. They are harder to detect and serve users who have already mastered the foundational rules.

**Independent Test**: Candidate generator produces ≥ 5 valid candidates per category within 400 attempts. Correct-move checker rejects any column other than the one directly above the opponent's trigger move.

**Acceptance Scenarios**:

1. **Given** a lowinverse position (two columns each containing a 2-consecutive-empty pair with odd upper squares, columns may have additional empties above the pair, opponent's threat requires both upper odd squares) where the opponent has just played the lower square of one of the two paired columns, **When** the user plays the upper (odd) square of that same column, **Then** the move is marked correct.
2. **Given** the same lowinverse position, **When** the user plays any other column, **Then** the move is marked incorrect.
3. **Given** a highinverse position (two columns each with exactly 3 consecutive empties, top squares even) where the opponent has just played the lowest square of one of the two stacks, **When** the user plays the square directly above it (the middle square of that stack), **Then** the move is marked correct.
4. **Given** the same highinverse position, **When** the user plays any other column, **Then** the move is marked incorrect.
5. **Given** a baseclaim position (three directly playable squares `left`/`mid`/`right` — not necessarily adjacent — and one empty square `above_mid` directly above `mid`) where the opponent has two staggered threats: **When** the opponent plays `left` → user plays `right` (then Claimeven applies to {`mid`, `above_mid`}); when the opponent plays `mid` → user plays `right` (then Baseinverse applies to {`left`, `above_mid`}); when the opponent plays `right` → user plays `mid` (then Baseinverse applies to {`left`, `above_mid`}), **Then** the respective response is marked correct.
6. **Given** a baseclaim position, **When** the user plays any column that is not the correct branch response, **Then** the move is marked incorrect.

---

### User Story 4 — Renamed and removed categories cause no regression (Priority: P1)

An existing user with saved progress, and the candidate database, are unaffected by the slug rename and removal.

**Why this priority**: Data integrity — any regression here silently corrupts existing puzzle ratings or breaks the classification pipeline.

**Independent Test**: After the rename, all existing puzzles classified as `forced_win_sequence` display correctly. No database rows reference `zugzwang` (old slug) or `parity_control`. No server or frontend file references the removed slug.

**Acceptance Scenarios**:

1. **Given** the server starts with the updated categories, **When** the API is queried for puzzle categories, **Then** `forced_win_sequence` appears and `zugzwang` (old) and `parity_control` do not.
2. **Given** a position previously matched by the old `zugzwang` predicate, **When** the classifier runs, **Then** it emits the `forced_win_sequence` tag instead.
3. **Given** a search of all server and frontend files, **When** looking for the string `parity_control`, **Then** zero matches are found.

---

### User Story 5 — 7_trap, zig_zag, and useless_threat classifier tags enrich explanations (Priority: P3)

When the classifier detects a 7-trap, zig-zag, or useless-threat pattern within a position, the generated candidate record includes those tags in `classifier_tags`. The Explanation Engine uses these tags to name the specific motif in its narrative.

**Why this priority**: These are explanation enrichments, not new puzzle categories. They add depth without changing the core puzzle loop.

**Independent Test**: At least one generated candidate contains `classifier_tags: ['7_trap']`, `['zig_zag']`, or `['useless_threat']` when the respective geometric or tactical pattern is present.

**Acceptance Scenarios**:

1. **Given** a fork_setup position where three horizontal discs have two diagonal discs branching off one end, **When** the classifier runs, **Then** `7_trap` appears in `classifier_tags`.
2. **Given** a double_threat position with alternating-column placement creating staggered diagonal threats, **When** the classifier runs, **Then** `zig_zag` appears in `classifier_tags`.
3. **Given** a position where the controller has a winning group completeable on even squares (Aftereven-style) and the opponent has a threat on a higher row in one of those same columns, **When** the classifier runs, **Then** `useless_threat` appears in `classifier_tags` and the Explanation Engine identifies the opponent threat as unreachable.

---

### Edge Cases

- What happens when a baseinverse position also has an immediate forced win? (Must be excluded from baseinverse candidates — the immediate win must not exist.)
- What happens when multiple lowinverse pairs exist simultaneously and the opponent triggers a column that belongs to more than one pair? (The correct move is uniquely determined by the trigger: play the upper square of whichever column the opponent just played into, regardless of which pair it belongs to.)
- What happens when the claimeven column's even square is already occupied? (Not a valid claimeven position — predicate must reject it.)
- What happens when highinverse columns have exactly 3 empties but the top square is odd? (Not highinverse — predicate must reject it.)
- How does the system handle a position where both `baseinverse` and `vertical` apply simultaneously? (The position is generated as a candidate for each matching category independently. The curation queue treats them as separate items; approving it for one category does not affect its status in the other.)
- What happens when the opponent's trigger move for a lowinverse or highinverse candidate does not uniquely determine one correct response column (e.g., both stacks are triggered simultaneously)? (This cannot occur in legal alternating play — the opponent makes exactly one move per turn; the candidate generator must validate that the stored trigger move is a single column.)

## Requirements *(mandatory)*

### Functional Requirements

**Slug rename and removal**

- **FR-001**: The slug `zugzwang` MUST be renamed to `forced_win_sequence` across categories.js, classifier.js, predicates.js, candidate-generator.js, and all frontend files. The predicate logic itself MUST NOT change.
- **FR-002**: The slug `parity_control` MUST be removed from categories.js, classifier.js, predicates.js, candidate-generator.js, and all frontend files. No stub or placeholder MUST remain.
- **FR-003**: The system MUST confirm that no database rows reference the old `zugzwang` slug or `parity_control` slug before or after migration.

**New free-tier categories**

- **FR-004**: The system MUST implement a `baseinverse` predicate that detects two directly playable squares (the lowest empty square in each of two different columns) belonging to the same opponent 4-in-a-row line, where the opponent already has ≥ 1 disc placed in that line, with no immediate winning move available for either player. Lines where the opponent has no discs must be excluded (the pairing would not be tactically motivated). The pair is not restricted to row 1; mid-board pairs (e.g., {c4, d3}) are valid provided both squares are currently the lowest empty in their column.
- **FR-005**: For `baseinverse`, both paired squares MUST be accepted as correct moves (tied). Any other column MUST be rejected.
- **FR-006**: The system MUST implement a `vertical` predicate that detects that the opponent has just played row 2 of a column where (a) the opponent has exactly 1 disc already placed at row 1 of that column, (b) row 3 of that column is empty (the correct response square, odd row), (c) the pair {row 2, row 3} belongs to the opponent's 4-in-a-row group, and (d) no immediate win is available. The candidate position is post-trigger (opponent's disc at row 2 is already placed). The candidate record MUST store `trigger_move` (the opponent's row-2 column) and `correct_response_column`. Note: Allis's rule also permits a {row 4, row 5} variant (opponent has 3 discs at rows 1–3, upper square = row 5, odd) but this variant is intentionally excluded from this feature as a scope simplification; the {row 2, row 3} case is sufficient for pedagogical purposes and candidate generation targets.
- **FR-007**: For `vertical`, the upper (odd) square directly above the opponent's trigger move MUST be accepted as the correct move. Any other column MUST be rejected.
- **FR-008**: `baseinverse` and `vertical` MUST be designated free-tier categories.

**New paid-tier categories**

- **FR-009**: The system MUST implement a `claimeven` predicate. The position MUST have zugzwang control for the current player and at least one column with an even number of empties where the next playable square is odd (the claimeven pair is live). The correct move is the even square directly above the opponent's last move in such a column. (Note: the thesis defines Claimeven as a general structural claim on all even squares — the immediate-response framing is a pedagogical constraint for puzzle generation, not a thesis requirement.)
- **FR-011**: The system MUST implement a `lowinverse` predicate. In each of the two paired columns, there MUST be two consecutive empty squares (the Lowinverse pair) where the upper square is on an odd row (row 3 or 5). The Lowinverse mechanism requires each paired column to have an **odd** total number of empty squares (per the thesis: "the controller of the Zugzwang will be forced to play the lowest, even square of a column which contains an odd number of empty squares"). Since the pair itself contributes 2 empty squares, the number of additional empty squares above the pair in each column must be odd (1, 3, 5, …). No active Claimeven pair MUST exist in either paired column below the Lowinverse pair; such a configuration would similarly invalidate the parity. The opponent MUST have a threat requiring both upper odd squares simultaneously (a threat that can be defeated by the controller occupying just one of the two odd squares is insufficient). The puzzle position is presented after the opponent has played the lower square of one of the two paired columns; the correct move is the upper (odd) square of that same triggered column. The candidate record MUST store `trigger_move` (the opponent's last move column) so the curation UI can display "opponent played column X → correct response is column X, row R+1."
- **FR-012**: `lowinverse` MUST be implemented after `claimeven` in dependency order.
- **FR-013**: The system MUST implement a `highinverse` predicate. Two columns MUST each have exactly 3 consecutive empty squares with the highest square on an even row. Each paired column therefore has an odd total of empty squares (3 base empties; any additional empties above must be even in count to preserve the odd total), satisfying the same Zugzwang parity principle as Lowinverse (FR-011). No active Claimeven pair MUST exist in either of the two paired columns below the 3-high stack; such a configuration shifts the column's parity and invalidates the forcing guarantee (same constraint as Lowinverse, FR-011). The opponent MUST have at least one group (horizontal or diagonal) whose squares intersect any of the highinverse guarantee pairs: the top-square pair {col_a_top, col_b_top}, the middle-square pair {col_a_mid, col_b_mid}, the column-local vertical pairs within each stack, or — when a column's lower square is directly playable — the cross-column pairs {col_a_lower, col_b_upper} and {col_b_lower, col_a_upper} (per the thesis: "If the lower square of the first column is directly playable: all groups which contain both the lower square of the first column and the upper square of the second column"). Positions where the structural condition is met but no opponent threat passes through any guaranteed pair MUST be excluded. The puzzle position is presented after the opponent has played the lowest square of one of the two three-high stacks; the correct move is the square directly above it (the middle square of that stack). The candidate record MUST store `trigger_move` so the curation UI can display the opponent's trigger and the expected response.
- **FR-014**: `highinverse` MUST be implemented after `lowinverse` in dependency order.
- **FR-015**: The system MUST implement a `baseclaim` predicate. The configuration MUST include three directly playable squares (`left`, `mid`, `right`) — the lowest empty square in each of three different columns, not required to be adjacent or on row 1 — and one empty square (`above_mid`) directly above `mid`; these are variable names, not literal board coordinates. The opponent MUST have two staggered threats — one whose group contains both `mid` and `right` (refuted by Baseinverse pairing) and one whose group contains both `left` and `above_mid` (refuted via the reactive pair that becomes available after each branch response). The puzzle position is presented after the opponent has played one of the three base squares; the correct response follows a deterministic three-way branch: if opponent plays `left` → respond `right` (enabling Claimeven for {`mid`, `above_mid`}); if opponent plays `mid` → respond `right` (enabling Baseinverse for {`left`, `above_mid`}); if opponent plays `right` → respond `mid` (enabling Baseinverse for {`left`, `above_mid`}). The candidate record MUST store `trigger_move` and `correct_response_column` explicitly, as the branch logic is not derivable from the board state alone.
- **FR-016**: `baseclaim` MUST be implemented after both `claimeven` and `baseinverse`.
- **FR-017**: `claimeven`, `lowinverse`, `highinverse`, and `baseclaim` MUST be designated paid-tier categories.

**highlight_cells and candidate generation**

- **FR-018**: Each new category MUST include a `highlight_cells` computation that identifies the salient squares for the Explanation Engine overlay. For `lowinverse` and `baseclaim`, highlight_cells MUST include not only the defensive paired squares but also the specific opponent 4-in-a-row group(s) that the structure refutes, so curators can verify the predicate was correctly applied without running the solver themselves. For `baseclaim`, the four squares are referred to as `left`, `mid`, `right` (three directly playable squares) and `above_mid` (the empty square directly above `mid`) — variable positions, not literal board coordinates.
- **FR-019**: The candidate generator MUST produce ≥ 5 valid candidates per new category within 400 attempts.
- **FR-020**: Each new category MUST have at least one test fixture with a solver-verified board position.

**Curation fields**

- **FR-025**: For all paid-tier categories that require zugzwang control (`claimeven`, `lowinverse`, `highinverse`, `baseclaim`), the candidate record MUST include `solver_scores_per_column` (a map of column → solver score) and a boolean `zugzwang_control` field. These fields are displayed in the curation UI so a curator can verify zugzwang status without domain expertise.
- **FR-026**: For reactive categories (`vertical`, `claimeven`, `lowinverse`, `highinverse`, `baseclaim`), the candidate record MUST include a `trigger_move` field (the column the opponent just played) and a `correct_response_column` field. The curation UI MUST display these alongside the board so the curator can verify the response without replaying the game.
- **FR-027**: For `baseinverse`, the candidate record MUST include the full 4-in-a-row group containing the two paired squares (not just the square coordinates), so the curator can see why the pair is tactically significant.

**Classifier tags (enrichments only)**

- **FR-021**: The classifier MUST detect a `7_trap` shape (three horizontal discs with two diagonal discs branching off one end) within `fork_setup` or `double_threat` positions and add `7_trap` to `classifier_tags`.
- **FR-022**: The classifier MUST detect a `zig_zag` shape (alternating-column disc placement across 2–3 columns creating staggered diagonal threats) within `fork_setup` or `double_threat` positions and add `zig_zag` to `classifier_tags`.
- **FR-028**: The classifier MUST detect a `useless_threat` pattern (an opponent threat group at a higher row whose required squares lie in columns where the controller already has Aftereven-style winning groups on even squares below them) and add `useless_threat` to `classifier_tags`. The Explanation Engine MUST use this tag to explain why the opponent's threat is unreachable.
- **FR-023**: `7_trap`, `zig_zag`, and `useless_threat` MUST NOT create new puzzle categories; they are tags only. Aftereven as a full solving rule remains out of scope (see FR-024).

**Out of scope**

- **FR-024**: Aftereven, Before, and Specialbefore MUST NOT be implemented, even as stubs or placeholders.

### Key Entities

- **PuzzleCategory**: Slug, display name, tier (free/paid), predicate function, highlight_cells function, candidate-generator check. Categories now include `baseinverse`, `vertical`, `claimeven`, `lowinverse`, `highinverse`, `baseclaim`, plus all existing non-removed categories renamed or unchanged.
- **ClassifierTag**: A string label added to a candidate's `classifier_tags` field. Not a category; used only by the Explanation Engine. Tags: `7_trap`, `zig_zag`, `useless_threat`.
- **CandidatePosition**: A board state (position string), correct move(s), category slug, highlight_cells, classifier_tags. For reactive categories (vertical, claimeven, lowinverse, highinverse, baseclaim): also `trigger_move` (the opponent's last move column) and `correct_response_column`. For zugzwang-dependent paid categories (claimeven, lowinverse, highinverse, baseclaim): also `solver_scores_per_column` and `zugzwang_control` (boolean). For baseinverse: also the full 4-in-a-row group containing the paired squares. Must pass predicate and solver verification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero references to `zugzwang` (old slug) or `parity_control` remain in any server or frontend file after the feature ships.
- **SC-002**: All 6 new categories (`baseinverse`, `vertical`, `claimeven`, `lowinverse`, `highinverse`, `baseclaim`) have at least one passing test fixture with a solver-verified board position.
- **SC-003**: The candidate generator produces ≥ 5 valid candidates per new category within 400 attempts for each category.
- **SC-004**: Free-tier designation: `baseinverse` and `vertical` appear in the free category set; paid-tier designation: `claimeven`, `lowinverse`, `highinverse`, `baseclaim` appear in the paid category set.
- **SC-005**: `7_trap`, `zig_zag`, and `useless_threat` tags each appear in `classifier_tags` for at least one generated candidate where the respective pattern is present.
- **SC-006**: All existing categories (`immediate_threat`, `forced_block`, `double_threat`, `fork_setup`, `forbidden_columns`, `forced_win_sequence`) continue to produce candidates without regression after the feature ships.
- **SC-007**: The Explanation Engine correctly names the Allis rule (baseinverse, vertical, claimeven, lowinverse, highinverse, baseclaim) in its narrative for positions tagged with those categories.

## Assumptions

- Row numbering follows the convention used in docs/allis_thesis_report.md: row 1 is the bottom row, row 6 is the top. "Odd row" means rows 1, 3, 5; "even row" means rows 2, 4, 6.
- "Zugzwang control" for paid-tier categories is operationalized via solver scores: the current player has control if at least one move scores positively. This is verified at candidate-generation time for claimeven, lowinverse, highinverse, and baseclaim.
- No database migration is needed for the slug rename because the feature description confirms there are no existing DB rows with `zugzwang` (old) or `parity_control`.
- The solver is available at runtime for candidate generation and verification; predicates that require solver scores (claimeven, lowinverse, highinverse, baseclaim) may call the solver synchronously during generation.
- Aftereven, Before, and Specialbefore will not be implemented now or later in this feature; they remain out of scope and no infrastructure for them will be added.
- The `highlight_cells` computation for each new category highlights the salient squares that make the pattern visible: for baseinverse, the two paired row-1 squares plus the opponent's 4-in-a-row group; for vertical, the opponent's trigger square (even-row disc just played) and the correct response square (upper odd-row empty); for claimeven, the odd square played and the even square above; for lowinverse, the two paired column stacks and the opponent threat group(s); for highinverse, the six squares across both stacks and the opponent group(s) they refute; for baseclaim, the `left`, `mid`, `right` directly playable squares plus `above_mid`.
- Mobile support and UI layout changes are out of scope; this feature affects only server-side category logic and the candidate generator.
- The `vertical` puzzle is restricted to the {row 2, row 3} pair configuration (opponent has 1 disc at row 1, trigger = row 2, response = row 3). The {row 4, row 5} variant permitted by Allis is out of scope for this feature (see FR-006 note).
