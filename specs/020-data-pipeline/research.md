# Research: Data Pipeline & Puzzle Counts (Epic 6)

## R-001 — `getImmediateThreats` signature

**Decision**: Use `board.immediateThreats(player)` (Board class method) for the `odd_even_threat` predicate.

**Exact location**: `classifier.js:262` (free function), `classifier.js:326` (Board method).

**Signature**: `getImmediateThreats(board, colHeights, player) → number[]` — returns 0-indexed column numbers where placing `player` at the gravity-top row creates an immediate four-in-a-row (checkWin returns true).

**Usage pattern for OET**: For each candidate column `c`:
1. Guard `board.colHeights[c] < 6`
2. `afterBoard = board.withMove(c)` — places `currentPlayer` (Red)
3. `afterBoard.immediateThreats(board.currentPlayer)` — if non-empty, column `c` creates a major threat
4. Threat landing row = `board.colHeights[c]` (the row where the piece lands before the move)

**Parity check**: `landingRow % 2 === 0` → odd row (rows 0, 2, 4 — Red's parity per project convention). `landingRow % 2 === 1` → even row (rows 1, 3, 5 — Yellow's parity).

**Alternatives considered**: `getMajorThreatCells` — rejected per FR-006 (returns all existing threat cells globally, not threats created by a specific move). `getReachableThreats` — returns all future threats, not immediate ones; wrong semantics.

---

## R-002 — `detectClaimodd` availability

**Decision**: `detectClaimodd` already exists in `classifier.js:878`. The FR-013 predicate is already implemented verbatim. No new code required.

**Rationale**: The existing implementation matches the spec exactly. The pipeline gate is human verification that Epic 5 has signed off on this detector before running a factory batch.

---

## R-003 — `detectUndercut` availability

**Decision**: `detectUndercut` exists at `classifier.js:538`. The pipeline can use it after Epic 5 verification of final contract. Returns `{ matched, highlightMetadata: { type: 'cells', cells: [{ column, row, role }, ...] } }`.

**Framing note (FR-014)**: "detectUndercut fires on the non-correct_col column" — the column where it is *losing* to play (the trap column), which is distinct from `correct_col` (the safe column). This is consistent with the existing function's logic.

---

## R-004 — Supabase client pattern for validation script

**Decision**: Use `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_KEY`). Verified from existing script `connect-four/scripts/verify-undercut-puzzles.mjs`.

**Pattern**:
```js
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
```

**File extension**: `.mjs` (ESM). Use `await import()` for dynamic imports. No `dotenv` package — use `--env-file connect-four/server/.env` flag if running via shell wrapper, or set env vars externally.

---

## R-005 — `odd_even_threat` correct_col storage

**Decision**: Store as scalar `puzzles.correct_col` (0-indexed integer). Same pattern as `claimeven`, `figure_7`, `j_shape`. No `highlight_metadata` needed.

**Rationale**: Single-column answer. The existing `/draw` endpoint returns `correct_col` in snake_case; the frontend adapter converts to camelCase. `evalOddEvenThreat` reads `puzzle.correctCol`.

---

## R-006 — `odd_even_threat` interaction_mode

**Decision**: `interaction_mode = 'single_move'`. The learner plays one column; the predicate checks against `correct_col`.

---

## R-007 — boardSpec derivation for lessons 10 and 11

**Decision**: Derive `boardSpec` from a real approved puzzle's `move_string` using the existing column-major bottom-to-top encoding. The `boardSpec` array has 7 elements (one per column); each element is a string of `'g'` (current player's disc) and `'d'` (opponent's disc) from bottom to top. Parse using `parseBoardState`; walk each column from row 0 upward; emit `'g'` for player 1 (Red, userPerspective=yellow means the learner is Yellow, so Red discs are `'d'` and Yellow discs are `'g'`).

**Wait — perspective clarification**: Both lesson-10 and lesson-11 have `"userPerspective": "yellow"`. In `boardSpec`, `'g'` = "good" (the user's discs = Yellow) and `'d'` = "dangerous" (opponent's discs = Red). Verify this against the lesson loader and ConceptScreen before updating.

**Prerequisite gate**: At least one approved figure_7 puzzle AND at least one approved j_shape puzzle must exist in the DB before these JSON files are updated. The factory run + curation checkpoint (Phase B3) must complete first.

---

## R-008 — CATEGORY_ORDER position for `odd_even_threat`

**Decision**: Insert `'odd_even_threat'` after `'forbidden_columns'` and before `'z_threat'` in `CATEGORY_ORDER` in both `server/categories.js` and `src/lib/categories.js`. This places it at 2-star difficulty, consistent with `forbidden_columns` (2 stars) and before `z_threat` (3 stars).

**Spec star ratings (FR-021, locked)**: `forbidden_columns=2`, `odd_even_threat=2`, `z_threat=3` (but z_threat is already registered; odd_even_threat is new between them by star count grouping). Exact position within same-star group doesn't affect functionality — chosen for logical grouping.

---

## R-009 — FR-008 edge case (both threats on odd rows)

**Decision**: Per strict reading of FR-006 (condition 4: "one on even row"), the predicate does NOT fire when both threats land on odd rows. FR-008 is therefore unreachable under the FR-006 conditions. Implement FR-006 strictly. Document FR-008 in a code comment as "unreachable under current predicate conditions; documented for future reference if predicate is ever relaxed."

**Rationale**: The spec is internally contradictory on this edge case. FR-006 requires one even-row threat as a firing condition; FR-008 assumes the predicate fires when both are odd-row. The safe implementation requires the even-row threat (FR-006 takes precedence as the primary predicate definition). This eliminates the contradiction cleanly.
