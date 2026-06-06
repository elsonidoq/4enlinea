# Feature Specification: Coach Explanation Rebuild (Deep Reveal Epic B)

**Feature Branch**: `022-coach-explanation-rebuild`
**Created**: 2026-06-04
**Status**: Draft
**Input**: Deep Reveal Epic B — rebuild what the coach LLM says in the Deep Reveal panel, replacing the always-Type-2 prompt with an evidence-driven taxonomy and a grounding contract, and producing the closed allowed-location set that upgrades Epic A's P5 gate to its strong form.

## User Scenarios & Testing

### User Story 1 - Coach gives honest early-game explanations (Priority: P1)

A user makes a reasonable opening move in a sparse-board position (no major threats). Today the coach invents a "concrete threat" on an occupied cell or fabricates a diagonal because the prompt forces a tactical narrative regardless of what the board shows. After Epic B ships, the coach selects a Type 4 (Development) explanation, pre-lists only legitimate cells and groups in the grounding contract, and delivers a 2–3 sentence explanation that names a real column and a real parity reason — without inventing any threat.

**Why this priority**: This is the root-cause fix for the two documented `llm_feedback` failures (`e86eeac9`, `8d83947e`). Both are early-game positions where the model fabricated spatial claims. Fixing Type 4 alone covers the majority of flagged cases because most Deep Reveal requests occur on early/mid-game positions.

**Independent Test**: Can be fully tested by replaying the movestrings `3444444335311110` and `34` through the rebuilt `buildExplainContext`, asserting the returned `allowedSet` contains no occupied cells in CONCRETE-ELIGIBLE entries and no cell corresponding to the Green disc at c5r2 appears in any entry's `cells` list. No HTTP server is required.

**Acceptance Scenarios**:

1. **Given** position `3444444335311110` (16 discs, no major threats), **When** `buildExplainContext` is called for the coached column, **Then** the returned `allowedSet` contains no CONCRETE-ELIGIBLE entry whose `cells` list includes c2r1 or c2r2 (both occupied), and the returned `prompt` is Type 4.
2. **Given** position `34` (2 discs, no major threats), **When** `buildExplainContext` is called, **Then** all groups in `allowedSet` are ABSTRACT-ONLY (no group has ≥2 player discs), and no entry's `cells` list includes c5r2 (the Green disc at that position).
3. **Given** an early-game position where the coached player's move is suboptimal with a small eval gap, **When** the LLM explanation is generated from the Type 4 template, **Then** the explanation says "both moves are reasonable" or equivalent without asserting a concrete threat.
4. **Given** an early-game position with a large eval gap, **When** the LLM explanation is generated from the Type 4 template, **Then** the explanation says the alternative "gives away real ground" or equivalent, framed as what the better move builds toward.

---

### User Story 2 - Coach correctly identifies and routes tactical positions (Priority: P1)

A user misses a fork or a named tactical scaffold (Figure-7, J-config) in a mid-game position. The coach selects a Type 2 (Tactical) explanation, identifies the fork or scaffold in the critical position (after the user's move + opponent's optimal reply), and describes the real cells involved rather than fabricating a threat on the current board.

**Why this priority**: Type 2 positions are the second-most common failure mode. Correct routing prevents the model from applying Type 4 "build toward" language when a concrete fork already exists in the critical position.

**Independent Test**: Can be tested by asserting `classifyExplanationType` returns `'type2'` for a known mid-game position with ≥2 opponent major threats in the critical position, using only the board state and `opponentResponseMovestring` (no new solver calls).

**Acceptance Scenarios**:

1. **Given** a critical position (after user's move A + opponent's reply) with ≥2 simultaneous opponent major threats, **When** the type classifier runs, **Then** it returns Type 2 without issuing new solver calls.
2. **Given** a critical position that matches a Figure-7 scaffold on the critical-position board, **When** the type classifier runs, **Then** it returns Type 2.
3. **Given** a critical position with ≥2 opponent major threats, **When** `buildExplainContext` runs, **Then** the `allowedSet` includes the threat cells as CONCRETE-ELIGIBLE entries (opponent has ≥2 discs in those groups).

---

### User Story 3 - Strong-form P5 gate rejects non-allowed highlights (Priority: P1)

After Epic B ships, the Epic A gate is extended with the `allowedSet` from `buildExplainContext`. Any zone that the LLM emits which references a cell not in the allowed set is rejected at the gate, preventing the `403a21c9` "non-existent threat" class of failures where the LLM highlights a geometrically valid but editorially unauthorized cell.

**Why this priority**: This closes the last remaining gap in the P5 gate. Epic A's board-only check passes `403a21c9` (the 4-window is live). Epic B's allowed-set check rejects it (the cell was never listed as mentionable for that position). Together they cover all known P5 failure modes.

**Independent Test**: Can be tested by running the regression harness with the `403a21c9` fixture, asserting the strong-P5 check now rejects the highlight (the cell is not in the `allowedSet` produced for that position). No HTTP server required.

**Acceptance Scenarios**:

1. **Given** a zone spec referencing a cell not in the `allowedSet` for the current position (e.g., the `403a21c9` fixture's non-existent threat cell), **When** `validateAnnotation` runs with the `allowedSet`, **Then** the output is rejected with a strong-P5 failure reason.
2. **Given** a `tg` (entire board) zone spec in the LLM output, **When** `validateAnnotation` runs with the `allowedSet`, **Then** the output is rejected unconditionally.
3. **Given** a `col4` zone spec for a position where any `allowedSet` entry (CONCRETE or ABSTRACT-ONLY) touches col 3 (0-indexed), **When** the gate runs, **Then** the zone passes the allowed-set check.
4. **Given** a `c4r3` zone spec for a position where no CONCRETE-ELIGIBLE `allowedSet` entry includes the cell col=3,row=2, **When** the gate runs, **Then** the zone is rejected even if an ABSTRACT-ONLY entry for col 3 exists.

---

### User Story 4 - All-moves-equal positions receive instant plain-text response (Priority: P2)

When all legal columns have the same coached score, the endpoint immediately returns a plain-text explanation without making an LLM call. No quota unit is consumed, no cache write occurs.

**Why this priority**: This avoids burning LLM quota and latency on positions where no explanation adds value. It is also a correctness requirement: calling the LLM in an all-moves-equal position would force it to invent a reason, repeating the root cause of Epic B.

**Independent Test**: Can be tested by asserting `buildExplainContext` returns early with the fixed string and a null `allowedSet` when all legal column scores are equal, without calling the LLM.

**Acceptance Scenarios**:

1. **Given** a position where all legal columns have raw solver score = 0 (genuinely settled/drawn position), **When** `buildExplainContext` is called, **Then** it returns `{ explanation: "All moves are roughly equivalent here — no single best move stands out.", allowedSet: null }` without making an LLM call.
2. **Given** a live opening position (e.g., movestring `34`) where columns share non-zero scores, **When** `buildExplainContext` is called, **Then** the short-circuit does NOT fire — the position proceeds to full Type 4 classification.
3. **Given** the all-moves-equal short-circuit fires, **When** the `POST /api/explain-move-llm` handler processes the result, **Then** no quota unit is decremented and no cache row is written.

---

### User Story 5 - Coached player whose move was optimal receives inverted framing (Priority: P2)

When the user's move A is already the optimal move (no alternative is better), the coach acknowledges this using inverted framing — it does not say "you should have played B" because A is B. The explanation describes what A preserves or builds toward, scaled by how much stronger A is than its nearest alternative.

**Why this priority**: Without inverted framing, an optimal user move would receive a "you should have played differently" explanation, which is both factually wrong and trust-eroding. The inverted-framing branch is a logical consequence of the score_coached computation.

**Independent Test**: Can be tested by asserting that when `score_coached(A) ≥ score_coached(col)` for all other legal cols, `buildExplainContext` sets the framing flag to `inverted` and the prompt uses the inverted tone ladder from `coach_explanation_principles.md` step 0b.

**Acceptance Scenarios**:

1. **Given** a position where the user's column A has the highest `score_coached` of all legal moves, **When** `buildExplainContext` runs, **Then** the prompt uses inverted-framing tone ("Your move is solid" or "Your move is the strongest here") rather than "B is preferable."
2. **Given** an inverted-framing position where gap between A and its nearest alternative is 0 (both equivalent), **When** the explanation is produced, **Then** it says "Both A and the alternative are equivalent; your move is fine" or equivalent.

---

### User Story 6 - Type 3 positions receive a stub explanation rather than wrong-type framing (Priority: P3)

A position where a move changes parity on a column adjacent to a real major threat is classified as Type 3 (Parity/structural). It receives a stub explanation that reuses the Type 4 grounding contract and adds one sentence acknowledging the parity flip, rather than defaulting to Type 4 language that ignores the parity change.

**Why this priority**: Type 3 detection prevents misclassification into Type 4 for parity-relevant positions. The stub template is intentionally minimal — bespoke Type 3 evidence blocks are deferred until Type 4 is validated in production.

**Independent Test**: Can be tested by asserting `classifyExplanationType` returns `'type3'` for a known parity-flip position and the resulting prompt contains a parity-acknowledging sentence.

**Acceptance Scenarios**:

1. **Given** a position where (1) at least one major threat exists after move A, (2) at least one column's empty-cell count changes parity between pre-A and post-A board, and (3) the parity-flipped column is the same as or adjacent to a major threat column, **When** the type classifier runs, **Then** it returns Type 3.
2. **Given** a Type 3 position, **When** the prompt is assembled, **Then** it uses the Type 4 grounding contract and includes one sentence about the parity flip.

---

### Edge Cases

- What happens when `collectLeaves` encounters a position where the same 4-window is both a completed win for the player and a draw_threat for the opponent across different leaves? Two separate records are created keyed by `cellSet:owner` — they are never merged.
- What happens when the union of A-branch and B-branch groups contains more than 10 groups? The top 5 per branch are taken by absolute `completed_freq`, merged (up to 10), and the discarded count + freq range is logged at debug level.
- What happens when `buildExplainContext` is called but the per-column `score_coached` sweep is missing from the current implementation? The spec requires Epic B to verify and add it; no new solver calls are permitted — it reuses the scores already computed at the explain endpoint.
- What happens when the Type 1 classifier detects the position but the simulation is expensive? Type 1 skips the simulation entirely — the winning line is identified directly from the board state via `getImmediateThreats` (not `checkWin`, which only checks for an already-won position; pre-move board is never won). Classification MUST run before simulation is started, so Type 1 detection is a simulation-bypass gate.
- What happens when `allowedSet` is `null` (all-moves-equal path)? `validateAnnotation` must accept `null` as a signal to skip the strong-P5 check (the response is plain text with no zone annotations).
- What happens when the Epic A gate is called before Epic B ships (no `allowedSet`)? `validateAnnotation` must remain backward-compatible: if `allowedSet` is absent/null, only the Epic A board-only checks run. The strong-P5 check is silently skipped. This preserves the Epic A gate's behavior during the transition.
- What happens when a CONCRETE-ELIGIBLE group contains an occupied disc of the coached player but also has ≥2 player discs? The occupied disc does not make the group invalid — it may legitimately appear as "your two green discs in column 4." The grounding contract lists the disc's actual occupant; the LLM is constrained to reference only what the occupants field says.
- What happens when the DELETE list functions are found to have live callsites on the Tier-1 path or other surfaces? The deletion is blocked until those surfaces are updated. No deletion proceeds without a confirmed callsite-free audit.

## Requirements

### Functional Requirements

**Simulation layer:**

- **FR-001**: At a won leaf, `collectLeaves` in `explainSimulate.js` MUST record the specific 4-cell winning group and its owner with shape `{ cells: string[], owner: 'player'|'opponent', type: 'completed' }`, instead of returning `patterns: null`.
- **FR-002**: At a draw leaf, `collectLeaves` MUST record every major threat group on the board (each 4-window with 3 discs of one color and 1 empty cell) with shape `{ cells: string[], owner: 'player'|'opponent', type: 'draw_threat' }`.
- **FR-003**: The aggregation MUST produce a per-group frequency table keyed by canonical cell set + owner (e.g., `"c3r2,c4r2,c5r2,c6r2:player"`): `{ completed_freq: N_won_leaves/total_leaves, draw_freq: N_draw_leaves_where_group_appeared/total_leaves, owner, cells }`. The denominator `total_leaves` is all leaves (won + draw + lost). The same 4-window with different owners MUST create two separate records — not merged.
- **FR-004**: Group selection (M3) MUST take the top 5 per branch (A and B independently) ranked by absolute `completed_freq`, then merge. The merge may yield up to 10 groups. Discarded groups MUST be logged at debug level: `[explain] discarded N groups (freq range [min–max]); kept 5 per branch.`
- **FR-005**: The existing search traversal (solver-optimal continuations, current depth, transposition cache) MUST remain unchanged. Only leaf handling and aggregation change.

**Step 0 — branch by A's quality:**

- **FR-006**: `buildExplainContext` MUST compute `score_coached(col) = −raw_score(col)` for every legal move column. If this sweep already exists, it MUST be reused — no additional solver calls are permitted. If it does not exist, it MUST be added.
- **FR-007**: If all legal columns share the same `score_coached` value AND all raw solver scores are zero (indicating a genuinely decided/drawn position), `buildExplainContext` MUST return immediately with `{ explanation: "All moves are roughly equivalent here — no single best move stands out.", allowedSet: null }`. No LLM call is made, no quota unit is consumed, no cache write occurs. Positions where scores are tied at a non-zero value (e.g., live opening columns sharing a non-zero score) MUST NOT trigger this short-circuit; they must proceed to the full explanation path. **NOTE**: `coach_explanation_principles.md` states a different all-moves-equal string ("Every column is equivalent here — the game state is already determined regardless of which column you pick."). The Epic B implementation doc wording is authoritative here; the principles doc wording is superseded for this path.
- **FR-008**: If the coached column A has the highest `score_coached` of all legal moves (A is optimal), `buildExplainContext` MUST use inverted-framing tone with the gap ladder from `coach_explanation_principles.md` step 0b: gap = 0 → "Both A and the alternative are equivalent; your move is fine"; −3 < gap < 0 → "Your move is solid; the alternative is a touch more flexible but the difference is minor"; gap < −3 → "Your move is the strongest here; [what it preserves or builds]." The explanation MUST NOT describe A as having a flaw or suggest B is superior. **This inverted branch is mutually exclusive with the standard FR-016 small/moderate/large gap buckets — the negative-gap (inverted) ladder applies only when A is optimal; the positive-gap (standard) ladder in FR-016 applies only when A is suboptimal (FR-009 path). A implementation MUST NOT consult FR-016 buckets when on the inverted branch.**
- **FR-009**: If A is suboptimal (B has a higher `score_coached` than A), `buildExplainContext` MUST proceed through steps 1–6 with standard framing.

**Type classifier:**

- **FR-010**: `buildExplainContext` MUST implement a deterministic type classifier with priority-order detection (Type 1 → 2 → 3 → 4, first match wins).
- **FR-011**: Type 1 (Immediate) MUST be detected using `getImmediateThreats` on the pre-move board: Type 1 fires when `getImmediateThreats(preMoveBoard, colHeights, perspective)` (coached player had a winning move) OR `getImmediateThreats(preMoveBoard, colHeights, 3-perspective)` (opponent had an immediate threat before A) returns non-empty. No `hasWon` check is needed or valid — the game had not ended before A was played. **Type 1 classification MUST happen before simulation is started**, and Type 1 MUST skip the continuation simulation entirely. The `allowedSet` for Type 1 is built directly from the immediate-threat windows on the pre-move board (each qualifying 4-window has ≥3 player discs + 1 empty cell, automatically CONCRETE-ELIGIBLE).
- **FR-012**: Type 2 (Tactical) MUST be detected using the critical position (`opponentResponseMovestring` — the board after move A + opponent's optimal reply, already computed in `buildExplainContext`). Type 2 fires when: ≥2 simultaneous opponent major threats exist in the critical position, OR the critical-position board matches a named scaffold (`allen-j-configuration` or `community-figure-7` detectors applied to the critical-position board). Reuse `opponentResponseMovestring` — no new solver calls.
- **FR-013**: Type 3 (Parity/structural) MUST be detected when ALL THREE of the following hold: (1) `findMajorThreatWindows(postABoard, perspective)` returns a non-empty result (at least one 4-window with 3 discs of one color + 1 empty); (2) at least one column's empty-cell count changes parity between the pre-A board and the post-A board; (3) the parity-flipped column is the same as, or adjacent to (±1), a column that appears in any of the threat windows from condition (1). **Note**: `getMajorThreatCells` MUST NOT be used here — it returns a per-cell flag map, not 4-cell group objects. Use `findMajorThreatWindows` (defined in the plan as T01a) for all group-level major-threat operations.
- **FR-014**: Type 4 (Development) is the default when none of Types 1–3 match.

**Eval gap:**

- **FR-015**: The eval gap MUST be computed as `gap = score_coached(B) − score_coached(A)` where `score_coached(col) = −raw_score(col)`. The JS off-by-1 correction is already applied by `c4solver-wrapper.js`; the sign flip is `buildExplainContext`'s responsibility.
- **FR-016**: Initial gap thresholds: small = gap ≤ 3 | moderate = 4–9 | large = ≥ 10. **Note**: solver scores are integers in [−18, 18], so `gap` is always an integer; no value can fall between buckets. These thresholds are exhaustive and mutually exclusive for all positive integer gaps. This ladder applies only on the FR-009 (standard/suboptimal) path; it is never consulted on the inverted (FR-008) path.**
- **FR-017**: SIGN-CHANGE OVERRIDE: if the sign of `raw_score(A)` and `raw_score(B)` differ (e.g. A is a loss, B is a win; or A is a draw, B is a win), the gap MUST be treated as at least moderate (win→draw or draw→loss) or large (win→loss), regardless of the numeric gap value.

**Grounding contract and context block:**

- **FR-018**: `buildExplainContext` MUST pre-list every mentionable cell with its actual occupant (`empty`/`Green`/`Grey`) before passing the context to the LLM.
- **FR-019**: Every mentionable group of 4 in the context block MUST carry: `cells`, `occupants` (per cell), `key_completing_cell`, that cell's row parity (odd/even), whether that parity is the coached player's winning parity, and `player_discs_in_group`.
- **FR-020**: Each group MUST be flagged CONCRETE-ELIGIBLE or ABSTRACT-ONLY per D2. CONCRETE-ELIGIBLE means ≥2 discs of the relevant player are in the group (coached player's discs for player groups; opponent's discs for opponent groups). A coached-player disc inside an opponent group does NOT contribute toward the opponent's eligibility count.
- **FR-021**: Player identity MUST be derived from `movestring.length` after appending A: odd length → coached player is Red → Green disc → winning parity = ODD rows (1,3,5); even length → coached player is Yellow → Grey disc → winning parity = EVEN rows (2,4,6).
- **FR-022**: If `findMajorThreatWindows(postABoard, perspective)` returns empty (no major threat windows on the post-A board), the LLM prompt MUST NOT allow the model to assert any current threat. The context block explicitly states "Major threats: none."
- **FR-023**: ASCII boards passed to the LLM MUST replace every `R` token with `Green` and every `Y` token with `Grey` before embedding. The `scr` row MUST be stripped.
- **FR-024**: KB entries MUST be loaded per the leverage map: `derived-parity-formula`, `allen-v1`, `allen-v3` (Red parity), `allen-v2`, `allen-v4` (Yellow parity), `community-claimodd`, `allis-claimeven` (for Type 4); `community-z-threat` (Type 4→mid); `allen-j-configuration`, `community-figure-7` (Type 2). KB entries `t1`–`t7`, `parity-trap`, `ghost-threat`, `overcut`, `sextuple-threat`, `baseclaim`, `before`, `specialbefore` MUST NOT be loaded for sparse boards (no major threats on the board).
- **FR-025**: `buildExplainContext` MUST return `{ prompt, allowedSet }` as its internal contract with the gate. `allowedSet` is never part of any HTTP response shape.

**allowedSet shape:**

- **FR-026**: CONCRETE-ELIGIBLE entries in `allowedSet` MUST have shape `{ cells: string[], zoneSpec: string }` where `cells` is the list of cell coordinates in wire format (e.g., `"c4r3"`).
- **FR-027**: ABSTRACT-ONLY entries in `allowedSet` MUST have shape `{ col: number, parity: 'odd'|'even', zoneSpec: string }` with NO `cells` field. The absence of the `cells` field is the structural enforcement of D2.

**Type 4 prompt template:**

- **FR-028**: The Type 4 prompt template MUST match the verbatim text in `coach_explanation_principles.md` (Role / Players / Hard grounding rules / Tone / Task sections). The "Hard grounding rules" section MUST include the distinction between ABSTRACT-ONLY (column + parity reference only) and CONCRETE-ELIGIBLE (may highlight listed empty cells).

**Type 3 stub template:**

- **FR-029**: The Type 3 stub MUST reuse the Type 4 grounding contract (same Role / Players / Hard grounding rules / Tone sections) and add exactly one sentence in the Task section acknowledging the parity flip on the relevant column. The frozen sentence to use is: "Playing in column [A] changes the number of empty squares in column [X], so [player] will now land on row [R] — the row that matters for winning there." Column/row values are filled in from the parity-flip data computed by the Type 3 classifier rule; [player] is 'you' or 'your opponent'. This exact sentence (with substituted values) MUST appear in the Type 3 stub output and can be asserted in SC-003 tests.

**Types 1 and 2 fallback:**

- **FR-030**: Types 1 and 2 MUST use the same grounding contract and prompt skeleton as Type 4 (same Players / Hard grounding rules / Tone / Task sections), without bespoke evidence blocks. Bespoke evidence blocks for Types 1 and 2 are explicitly out of scope for this epic. The Role section MUST use type-neutral wording for Types 1 and 2: "You are a Connect Four coach explaining why one move was stronger than another." (The Type 4 Role sentence — "in the opening, why one move develops better … There are no immediate threats" — is replaced because it is factually wrong for tactical and immediate-win positions.) Everything else in the skeleton stays verbatim.

**Strong-form P5 gate upgrade:**

- **FR-031**: `validateAnnotation` in `annotationGate.js` MUST accept `allowedSet` as a second parameter. When `allowedSet` is `null` or absent, the function MUST behave exactly as in Epic A (backward-compatible — only board-only checks run).
- **FR-032**: When `allowedSet` is provided, `validateAnnotation` MUST enforce the strong-P5 check for every zone spec in the LLM output:
  - `c\d+r\d+` and `cells:...` zones: every cell MUST appear in at least one CONCRETE-ELIGIBLE entry's `cells` list.
  - `col\d+` zones: passes if any `allowedSet` entry (CONCRETE or ABSTRACT-ONLY) touches the zone's column (0-indexed: `col4` → col 3).
  - `tg`: ALWAYS fails strong-P5. Reject unconditionally.
  - `row\d+`: passes if any CONCRETE-ELIGIBLE entry contains a cell in that row (0-indexed: `row3` → row 2).
- **FR-033**: An ABSTRACT-ONLY entry MUST NOT satisfy a `c\d+r\d+` or `cells:...` zone check — only CONCRETE-ELIGIBLE entries with a `cells` list can satisfy cell-level checks.

**DELETE list:**

- **FR-034**: Before deleting any function in the DELETE list, a callsite audit MUST be run: grep `computeDeltaTable`, `claimevenNarration`, `zThreatNarration`, `figure7Narration`, `jShapeNarration` across the codebase and confirm NONE are reached by: (a) `/api/explain-move` (Tier-1 one-liner path), (b) the in-game coach one-liner surface, or (c) any lesson or challenge surface.
- **FR-035**: After confirming zero live callsites on those paths, the following MUST be deleted (not left dormant): `computeDeltaTable`, `claimevenNarration`, `zThreatNarration`, `figure7Narration`, `jShapeNarration`, and the KB-section generation code that produces those narration strings.

**Regression harness extension:**

- **FR-036**: The Epic A regression harness MUST be extended to assert that fixture `403a21c9` (non-existent threat, 4-window live) is now REJECTED by the strong-P5 gate (the cell is not in the `allowedSet` for that position).
- **FR-037**: The regression harness MUST re-assert that fixtures `e86eeac9` (cells on occupied cells) and `8d83947e` (diagonal through own disc) fail STRUCTURALLY — the occupied cells never appear in any CONCRETE-ELIGIBLE entry's `cells` list — not just at the gate-level blocked-window check.

**API contracts:**

- **FR-038**: The response shape of `POST /api/explain-move-llm` MUST remain `{ explanation, prompt, cached? }` unchanged. The `allowedSet` is an internal contract only.
- **FR-039**: `explanation_cache.deep_reveal_json` shape MUST remain `{ explanation, prompt }` unchanged.
- **FR-040**: No changes are permitted to any of the three frontend surfaces (ChallengeScreen, ExplorerScreen, MistakeDetailScreen), the annotation rendering layer, or any gating/quota logic.

### Key Entities

- **`buildExplainContext`** (`llmCoachHelpers.js` / `index.js:609`): the function whose internals are replaced. Returns `{ prompt, allowedSet }`. Never changes the HTTP response shape.
- **`collectLeaves`** (`explainSimulate.js:190`): modified to record winning groups and draw threat groups at terminal leaves. Both record types use `owner: 'player'|'opponent'` — the field name is `owner` in all records regardless of type. Aggregates into a per-group frequency table keyed by `cellSet:owner`.
- **`validateAnnotation`** (`annotationGate.js`): extended to accept `allowedSet` and enforce strong-form P5 when present. Remains backward-compatible when `allowedSet` is absent.
- **`allowedSet`**: internal contract array. CONCRETE-ELIGIBLE entries have `{ cells, zoneSpec }`; ABSTRACT-ONLY entries have `{ col, parity, zoneSpec }` (no `cells` field). Never part of an HTTP response. For Type 1, built from `buildType1AllowedSet` (board-state only). For Types 2/3/4, built from simulation groups via `buildAllowedSet`.
- **`findMajorThreatWindows(board, perspective)`**: new helper (T01a) that scans all 4-windows and returns `{ cells: string[], owner: 'player'|'opponent' }[]` for windows with exactly 3 discs of one color + 1 empty. This is the correct tool for all group-level major-threat operations. `getMajorThreatCells` (which returns a per-cell flag map) MUST NOT be used for group-level operations.
- **CONCRETE-ELIGIBLE group**: a group of 4 cells with ≥2 discs of the relevant player. May be cited with explicit cell coordinates in the explanation.
- **ABSTRACT-ONLY group**: a group of 4 cells with fewer than 2 discs of the relevant player. May only be referenced as "a winning line in column X on an odd/even row."
- **`score_coached(col)`**: `−raw_score(col)`. Higher value = better move for the coached player.
- **`opponentResponseMovestring`**: already computed in `buildExplainContext`; the board state after move A + opponent's optimal reply. Reused for Type 2 detection without new solver calls.
- **`deep_reveal_failures` table**: existing table from Epic A. Epic B does not change it; failures from the rebuilt coach are logged there by the same Epic A gate logic.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Fixtures `e86eeac9` and `8d83947e` no longer appear in the `allowedSet` of their respective positions — the occupied cells are structurally absent from CONCRETE-ELIGIBLE entries. Measured by the extended regression harness asserting structural absence.
- **SC-002**: Fixture `403a21c9` is now rejected by the strong-P5 gate (the non-existent threat cell is not in `allowedSet`). Measured by the regression harness asserting a strong-P5 rejection for this fixture.
- **SC-003**: All four explanation types are correctly routed by the classifier for their canonical test positions. Measured by unit-testing `classifyExplanationType` (or equivalent) against a suite of at least one Type 1, one Type 2, one Type 3, and one Type 4 position.
- **SC-004**: The all-moves-equal short-circuit fires for positions where all legal columns have equal `score_coached`, consumes zero quota, and writes no cache row. Measured by a unit test asserting the early-return path.
- **SC-005**: The rebuilt coach produces no explanation that references `R`/`Y` tokens, player names (Red/Yellow/Black), or engine jargon (forced win, leaf, solver, etc.) in Type 4 positions. Measured by the existing P3 gate assertions passing on rebuilt-coach output in the regression harness.
- **SC-006**: Deleted functions (`computeDeltaTable`, narration helpers) are confirmed absent from the codebase after the callsite audit and deletion tasks complete. Measured by grep returning zero results.
- **SC-007**: The `POST /api/explain-move-llm` response shape remains `{ explanation, prompt, cached? }` with no new fields. Measured by a contract test asserting the response shape.

## Assumptions

- `opponentResponseMovestring` is confirmed to already be computed in `buildExplainContext` before this epic begins (per the Epic A verification). If it is not present, the Epic B planner must add it before the Type 2 classifier can run.
- The per-column `score_coached` sweep may or may not already exist in `buildExplainContext`. Epic B must verify at implementation time and add it if missing, using only scores already computed at the explain endpoint (no new solver calls).
- The `allen-j-configuration` and `community-figure-7` KB detectors can be applied to any board state represented as a `Board` instance without requiring a live solver call.
- The `findMajorThreatWindows(board, perspective)` helper (new in Epic B, task T01a) is needed for all group-level major-threat operations. `getMajorThreatCells` returns a per-cell flag map and MUST NOT be used for group-level operations — the plan explicitly documents this distinction.
- The existing regression harness from Epic A can be extended in place (same test file or test suite) rather than requiring a separate new harness.
- The `deep_reveal_failures` table already exists (created by Epic A migration 031). No new migration is needed for Epic B.
- ABSTRACT-ONLY entries without a `cells` field are sufficient structural enforcement of D2. No additional gate-level flag or runtime type tag is required.
- `tg` zone specs will not appear in output from the rebuilt coach. The unconditional strong-P5 rejection of `tg` is a safety net, not the primary prevention mechanism.
- The occupied-cell fixtures (`e86eeac9`, `8d83947e`) appearing in both Epic A and Epic B definitions of done is intentional defense-in-depth and must not be deduplicated across the two specs.
- Threshold tuning (gap buckets, CONCRETE-ELIGIBLE disc count) is explicitly deferred post-production validation and is not part of this epic's scope.
