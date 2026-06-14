# Implementation Plan: Data Pipeline & Puzzle Counts (Epic 6)

**Branch**: `101-new-design` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-data-pipeline/spec.md`

---

## Summary

Epic 6 populates the puzzle DB for all active challenge sets and wires in one new category (`odd_even_threat`). The deliverables split into two lanes: **code changes** (category registration, i18n, predicate, validation script, lesson JSON updates) and **pipeline operations** (factory runs, curation, boardSpec derivation). The code lane is a prerequisite for `odd_even_threat` generation; the lesson JSON updates are sequentially gated on human curation producing at least one approved figure_7 and j_shape puzzle.

---

## Technical Context

**Language/Version**: Node 20+ (ESM); React 18 (frontend i18n only)
**Primary Dependencies**: `@supabase/supabase-js` (validation script direct DB), `classifier.js` (Board class, `getImmediateThreats`, `detectUndercut`, `detectClaimodd`), `predicates.js` (new `evalOddEvenThreat`), puzzle factory scripts in `connect-four/scripts/`
**Storage**: Supabase PostgreSQL via pooler (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`); no new migrations required — `puzzles` table already has all needed columns (`category`, `move_string`, `correct_col`, `approved`, `highlight_metadata`, `interaction_mode`)
**Testing**: `npm run test:fast` (inside `connect-four/`); new unit tests for `odd_even_threat` predicate; integration test for validation script exit code
**Target Platform**: Node server + pipeline scripts (no new frontend surfaces)
**Project Type**: Web application (server + React frontend)
**Performance Goals**: Predicate sync; ≤ O(7) candidate moves × O(42) threat scan per position — well under 100 ms
**Constraints**: No new API endpoints; no DB migrations; `claimodd`/`undercut` pipeline gated on Epic 5; star ratings locked (FR-021)
**Scale/Scope**: ~10 categories × ~50 candidate positions per factory run

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] `odd_even_threat` predicate uses `getImmediateThreats` (solver-free, bitboard only) — consistent with how other single-move categories work. No new explanation-engine path needed. Coach prompts are i18n pool strings drawn by the existing `pickFromPool` mechanism.

**Principle II — Code Quality & Simplicity**:
- [x] Predicate is a pure sync function mirroring the style of `detectDoubleThreat`/`detectForbiddenColumns`. No speculative abstraction.
- [x] Validation script is a standalone Node script; no new modules.

**Principle III — Testing Standards**:
- [x] `odd_even_threat` predicate MUST have at least one positive and one negative board fixture.
- [x] Validation script exit-code behavior MUST be tested with at least one real DB state.
- [x] Board fixtures must be sourced from the DB or KB — never hand-constructed.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Architecture docs (`server-conventions.md`, `data-model.md`, `api-conventions.md`, `testing-conventions.md`) were read before this plan was drafted.
- [x] `odd_even_threat` as a new category slug MUST be documented in `docs/architecture/data-model.md` (valid category list) and `docs/architecture/server-conventions.md` (Category Registry section) as part of the registration task's definition of done.
- [x] tasks.md will include explicit documentation tasks for every new architectural decision.

**Gate violations**: None. `odd_even_threat` is a free category (FR-001 says `free: true`), consistent with the constitution's tier table. Constitution tier table lists `immediate_threat`, `forced_block`, `double_threat` as the anonymous-tier set; all others are signed-in or paid. `odd_even_threat` will be gated as signed-in (free: true, not paid) — consistent with how `z_threat`, `claimeven`, `forbidden_columns`, `forced_win` are gated. No principle violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/020-data-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (affected files)

```text
connect-four/
├── server/
│   ├── categories.js                    # FR-001: add odd_even_threat
│   ├── challengeSets.js                 # FR-003: add odd_even_threat entry
│   ├── classifier.js                    # FR-006–FR-009: add detectOddEvenThreat()
│   ├── predicates.js                    # add evalOddEvenThreat() case
│   └── llmCoachHelpers.js               # FR-004: add odd_even_threat to PATTERN_KB
├── scripts/
│   └── candidate-generator.js          # register odd_even_threat in checkPredicate + isClean/computeHighlightCells
├── src/
│   ├── lib/
│   │   └── categories.js               # FR-002: mirror server/categories.js update
│   └── i18n/
│       └── en.json                     # FR-005: add odd_even_threat key pools
├── scripts/
│   └── validate-puzzle-counts.js       # FR-020: new validation script
└── lessons/
    ├── lesson-10-figure-7-trap.json    # FR-015, FR-017: boardSpec + overlay update
    └── lesson-11-j-shape.json          # FR-016, FR-017: boardSpec + overlay update

tests/
└── classifier/
    └── classifier.test.js              # new odd_even_threat predicate fixtures
```

**Structure Decision**: Monorepo — single project. Server and frontend are peers under `connect-four/`. All changes are file edits to existing modules; no new modules except the validation script.

---

## Complexity Tracking

> No constitution violations to justify.

---

# Phase 0: Research

## R-001 — `getImmediateThreats` signature (RESOLVED)

**Decision**: Use `board.immediateThreats(player)` (the `Board` class method) for the `odd_even_threat` predicate. It calls `getImmediateThreats(board.board, board.colHeights, player)` internally and is cached per-board.

**Exact signature** (from `classifier.js:262`):
```js
export function getImmediateThreats(board, colHeights, player) // → number[] (0-indexed columns)
```
`Board` method: `board.immediateThreats(player)` → `number[]`

**What it returns**: Array of 0-indexed column numbers where placing `player` at the gravity-top row creates an immediate four-in-a-row.

**OET predicate usage**: For each candidate column `c` (where `board.colHeights[c] < 6`), simulate `board.withMove(c)` (which places `currentPlayer`), then call `.immediateThreats(currentPlayer)` on the resulting board. A non-empty result means column `c` is a column where Red can win immediately right now — the placement created a major threat (a complete four-in-a-row window). The landing row for Red's disc is the column's height BEFORE the move (`board.colHeights[c]`).

**Important**: The threat row for column `c` is `board.colHeights[c]` (the row where the piece lands). For parity check: `row % 2 === 0` → odd row (0-indexed; rows 0, 2, 4 are Red's natural parity). Spec FR-006 says "odd row (0-indexed: rows 0, 2, or 4)": `row % 2 === 0` means the row index is even (0, 2, 4) which the spec calls "odd row" (Red's parity). This is the established project parity convention.

**Rationale**: `board.withMove(c)` is safe (throws on full column — guard with `board.colHeights[c] < 6`), immutable, and consistent with the Board class convention documented in `server-conventions.md`.

---

## R-002 — `detectClaimodd` availability (RESOLVED)

**Decision**: `detectClaimodd` already exists in `classifier.js:878`. The spec's FR-013 predicate is already implemented verbatim. No new code required for the claimodd predicate. However, the puzzle factory pipeline for claimodd still requires human review of whether `detectClaimodd` matches Epic 5's final form — this is a pipeline-run gate, not a code gate.

**Finding**: `detectClaimodd` at line 878 checks: (1) `board.currentPlayer !== 1` → return false; (2) all `colHeights[col] % 2 !== 0` → return false; (3) `colHeights[3] >= 6` → return false; (4) `!scores || scores[3] <= 0` → return false; (5) `scores[3] !== maxLegal` → return false. This matches FR-013 verbatim.

**Rationale**: No new code needed. The pipeline can use this detector once Epic 5 signs off on it.

---

## R-003 — `detectUndercut` availability (RESOLVED)

**Decision**: `detectUndercut` exists at `classifier.js:538`. Before using it in the pipeline, verify its output against Epic 5's final contract. The spec says "verify it matches Epic 5's final form before use." This is a pipeline-run gate — the code already exists.

**Finding**: The function returns `{ matched, highlightMetadata: { type: 'cells', cells: [...] } }`. `cells[0].role = 'killing_threat'`, `cells[1].role = 'dead_threat'`. The framing in FR-014 — "detectUndercut fires on the non-correct_col column" — is consistent with existing behavior (the function finds the column where playing there is *losing* for the current player because an undercut trap exists).

---

## R-004 — Supabase client pattern for validation script (RESOLVED)

**Decision**: Use the pattern from `connect-four/scripts/verify-undercut-puzzles.mjs`:
```js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
```
The env var is `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_KEY`). The existing script uses `.mjs` extension and dynamic `await import()`. The validation script should follow the same pattern.

**Rationale**: Reuses the established project pattern. The pooler URL is already in `SUPABASE_URL` by convention; no separate pooler config needed.

---

## R-005 — `odd_even_threat` correct_col storage (RESOLVED)

**Decision**: `odd_even_threat` stores `correct_col` as a scalar in `puzzles.correct_col` (0-indexed column), same as `claimeven`, `figure_7`, `j_shape`. The predicate evaluator reads `puzzle.correctCol` (camelCase after the `/draw` snake→camelCase adapter).

**Rationale**: The answer is a single column (the odd-row threat column). No `highlight_metadata` needed — the board already shows the position. Consistent with `evalClaimeven` pattern in `predicates.js`.

---

## R-006 — `odd_even_threat` interaction_mode (RESOLVED)

**Decision**: `interaction_mode = 'single_move'`. The learner plays one column; the predicate checks it against `correct_col`.

**Rationale**: All non-`forced_win` categories use `single_move`. Nothing in the spec suggests sequence-mode.

---

## R-007 — boardSpec derivation for lessons 10 and 11 (RESOLVED)

**Decision**: Derive `boardSpec` from a real approved puzzle's `move_string` using the existing column-major bottom-to-top encoding: `'g'` = current player's disc, `'d'` = opponent's disc. Parse the movestring using `parseBoardState`; for each column, walk rows 0→top; emit `'g'` or `'d'` for occupied cells, stop at the first empty.

**Who**: The task implementer runs the DB query, selects a movestring that shows the canonical pattern shape clearly (not just any approved puzzle), derives the boardSpec manually (or via a small script), and updates the JSON. The source movestring is documented in the JSON as `"_sourceMovestringForBoardSpec": "..."`.

**Prerequisite**: At least one approved figure_7 / j_shape puzzle must exist — blocked on factory run + curation.

---

# Phase 1: Design & Contracts

## Data Model

No new tables or columns are required. All changes are to existing application data:

| Entity | Changes |
|---|---|
| `puzzles` table | New rows with `category = 'odd_even_threat'`, `correct_col` set, `interaction_mode = 'single_move'` |
| `puzzles` table | Existing rows for figure_7/j_shape must exist (human curation) |
| `VALID_CATEGORIES` | Add `'odd_even_threat'` |
| `CATEGORY_ORDER` | Add `'odd_even_threat'` (position: after `'forbidden_columns'`, before `'z_threat'` — by difficulty stars: 2 stars) |
| `challengeSets.js` | New entry for `'odd_even_threat'` |
| `PATTERN_KB` | New inline entry for `'odd_even_threat'` |
| `en.json` | New key pools for `odd_even_threat` |
| `lesson-10-figure-7-trap.json` | `boardSpec` and `overlays` updated |
| `lesson-11-j-shape.json` | `boardSpec` and `overlays` updated |

**No DB migration needed.** The `puzzles` table already has `correct_col` (migration 016), `category` (text slug), `approved`, `interaction_mode`.

**`odd_even_threat` slug registration**: `data-model.md` valid slug list MUST be updated to include `'odd_even_threat'`.

## `odd_even_threat` Predicate Design

```
detectOddEvenThreat(board, scores) → { matched, correctCol, categoryEvidence }
```

Algorithm (verbatim from FR-006–FR-009):
1. Guard: `board.currentPlayer !== 1` → `{ matched: false }` (Red-only)
2. For each legal column `c` (where `board.colHeights[c] < 6`):
   - `afterBoard = board.withMove(c)`
   - `threats = afterBoard.immediateThreats(board.currentPlayer)` — columns with a new immediate win
   - If `threats.length > 0`: record `(col: c, landingRow: board.colHeights[c])`
3. Collect `threatMoves = [{ col, landingRow }, ...]` — one entry per qualifying column
4. Partition into `oddRowMoves` (`landingRow % 2 === 0`, i.e., rows 0/2/4) and `evenRowMoves` (`landingRow % 2 === 1`, i.e., rows 1/3/5)
5. Guard: need at least 1 in each partition and they come from distinct columns → `{ matched: false }` otherwise
6. `correctCol = oddRowMoves[0].col` (the odd-parity threat column)
7. Guard: `oddRowMoves.length === 0 || evenRowMoves.length === 0` → `{ matched: false }`. FR-008 (the "both on odd rows" tie-break) has been removed from the spec as unreachable: FR-006 condition 4 requires one odd AND one even threat, so a position with both threats on odd rows fails condition 4 and is filtered out here. Implement FR-006 strictly.

```js
export function detectOddEvenThreat(board, scores) {
  if (board.currentPlayer !== 1) return { matched: false };

  const oddRowMoves  = []; // { col, landingRow } where landingRow % 2 === 0 (Red parity)
  const evenRowMoves = []; // { col, landingRow } where landingRow % 2 === 1 (Yellow parity)

  for (let col = 0; col < 7; col++) {
    if (board.colHeights[col] >= 6) continue;
    const landingRow = board.colHeights[col];
    const afterBoard = board.withMove(col);
    if (afterBoard.immediateThreats(board.currentPlayer).length > 0) {
      if (landingRow % 2 === 0) oddRowMoves.push({ col, landingRow });
      else                       evenRowMoves.push({ col, landingRow });
    }
  }

  if (oddRowMoves.length === 0 || evenRowMoves.length === 0) return { matched: false };
  // Distinct columns guaranteed because oddRowMoves and evenRowMoves are disjoint partitions.
  // FR-008 (both-on-odd-row tie-break) is unreachable: FR-006 condition 4 requires one even-row
  // threat, so any position where all threats are odd-row is filtered out above.

  // correctCol = the column whose threat lands on the odd row (Red's parity)
  const correctCol = oddRowMoves[0].col;
  return {
    matched: true,
    correctCol,
    categoryEvidence: {
      oddRowCol: oddRowMoves[0].col,
      oddRow: oddRowMoves[0].landingRow,
      evenRowCol: evenRowMoves[0].col,
      evenRow: evenRowMoves[0].landingRow,
    },
  };
}
```

**Placement**: Add as `export function detectOddEvenThreat(board, scores)` in `classifier.js`, after `detectForcedWin`. Register in `classify()` switch.

## `evalOddEvenThreat` in `predicates.js`

```js
function evalOddEvenThreat(candidateCol, puzzle) {
  return candidateCol === puzzle.correctCol ? 'correct' : 'wrong';
}
```

Register in the `switch (puzzle.category)` dispatch in `evaluatePredicate`.

## i18n Key Pools (`en.json`)

```json
"coach": {
  "odd_even_threat": {
    "prompt": {
      "0": "Red has two threat moves. One lands on an odd row (Red's home row) — that's the winner. Which column do you choose?",
      "1": "Both moves create threats, but one lands on an odd row — Red's natural parity. That's the move that gives Red lasting control. Play it."
    },
    "hint": {
      "0": "One of the threat moves lands on an odd row. Odd rows belong to Red — that's the correct target."
    },
    "optimal": {
      "0": "Correct! The odd-row threat gives Red parity control — it can't be neutralised by Yellow's claimeven strategy.",
      "1": "Exactly right. Playing to the odd row aligns with Red's natural parity advantage."
    },
    "suboptimal": {
      "0": "That move creates a threat, but it lands on an even row — Yellow's parity. The odd-row threat in the other column is stronger."
    },
    "blunder": {
      "0": "That column doesn't create a threat at all. Look for the moves that create an immediate winning window."
    }
  }
}
```

```json
"challengeSet": {
  "odd_even_threat": {
    "displayName": "Odd & Even Threats",
    "description": "Red has two threat moves. Pick the one that lands on an odd row — Red's natural parity — to guarantee control."
  }
}
```

## `PATTERN_KB` inline entry

```js
odd_even_threat: { inline: 'An odd-even threat position occurs when Red has two candidate moves each creating an immediate threat, but one lands on an odd row (rows 0, 2, or 4 — Red\'s natural parity) and the other on an even row. The odd-row threat is strategically superior because Yellow\'s claimeven strategy cannot neutralise threats on odd rows. Red must always prefer the odd-row threat move.' },
```

## Validation Script Design

**Path**: `connect-four/scripts/validate-puzzle-counts.mjs`

```
DEFERRED_CATEGORIES = ['claimodd', 'undercut']  // explicit constant with comment

Algorithm:
1. Load all lesson JSON files from connect-four/lessons/
2. Connect to Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
3. Query: SELECT category, COUNT(*) FROM puzzles WHERE approved = true GROUP BY category
4. Print per-category table
5. For each lesson with non-null confirmationCategory:
   a. If confirmationCategory in DEFERRED_CATEGORIES: skip (log note)
   b. Else if count[confirmationCategory] >= 1: print PASS
   c. Else: print FAIL (lesson id, category), set exitCode=1
6. Exit with exitCode
```

**Output format**:
```
Category counts (approved puzzles):
  immediate_threat:   12
  forced_block:        8
  ...
  odd_even_threat:     0

Lesson confirmation checks:
  [PASS] lesson-01-immediate-threat → immediate_threat (12)
  [PASS] lesson-05-claimeven → claimeven (8)
  [SKIP] lesson-07-claimodd → claimodd (deferred to Epic 5)
  [FAIL] lesson-10-figure-7-trap → figure_7 (0) ← blocks exit code
```

## Contracts

No new API endpoints or HTTP contracts — all puzzle data flows through the existing `GET /api/puzzles/draw?category=odd_even_threat` endpoint unchanged.

The only new "contract" is the `odd_even_threat` predicate output shape:
```
{ matched: boolean, correctCol?: number (0-indexed), categoryEvidence?: object }
```
This is consistent with all other single-column predicates in `classifier.js`.

---

## Sequencing & Dependencies

```
Phase A (Code changes — no prerequisites):
  A1. Register odd_even_threat in categories.js + src/lib/categories.js (atomic)
  A2. Add challengeSets.js entry
  A3. Add PATTERN_KB inline entry to llmCoachHelpers.js
  A4. Add i18n key pools to en.json
  A5. Implement detectOddEvenThreat in classifier.js
  A6. Add evalOddEvenThreat to predicates.js
  A6.5. Register odd_even_threat in candidate-generator.js: add a `checkPredicate` case that calls detectOddEvenThreat,
        add an isClean guard (same pattern as other single-move categories), and add a computeHighlightCells stub
        (returns empty array — no cell highlights needed for this category). Without this step the factory falls
        through to a generic fallback and generates invalid positions.
  A7. Write validate-puzzle-counts.mjs
  A8. Add odd_even_threat tests (positive + negative fixtures)
  A9. Update docs (data-model.md valid slug list, server-conventions.md Category Registry)

Phase B (Pipeline runs — sequential, human-in-loop):
  B1. Run factory for: immediate_threat, forced_block, double_threat, forbidden_columns,
      forced_win, z_threat, claimeven (using claimeven pre-filter per FR-011),
      figure_7, j_shape, odd_even_threat
      (claimodd + undercut: SKIP — log warning, deferred to Epic 5)
  B2. Human curation: approve/reject candidates per category
  B3. [CHECKPOINT] Verify figure_7 ≥ 1 approved AND j_shape ≥ 1 approved
      → If not: repeat B1/B2 for that category only

Phase C (Lesson updates — gated on B3 checkpoint passing):
  NOTE: Canonical movestring selection is a human decision made during the B3 curation checkpoint.
  The curator tags the preferred puzzle (best illustrates the canonical pattern shape) during curation.
  Phase C tasks use that human-tagged movestring — NOT an automated LIMIT 1 query.

  Concept-slide boardSpec updates:
  C1. Use the curator-tagged figure_7 movestring from B3. Derive boardSpec + update
      lesson-10-figure-7-trap.json (boardSpec, overlays, _sourceMovestringForBoardSpec).
  C2. Use the curator-tagged j_shape movestring from B3. Derive boardSpec + update
      lesson-11-j-shape.json (boardSpec, overlays, _sourceMovestringForBoardSpec).

  Socratic position updates (FR-019):
  C3. For lesson-10-figure-7-trap.json: query the DB for approved figure_7 puzzles and select a movestring
      whose Socratic position shows the full figure-7 geometry clearly (may be the same as C1 or a different
      approved puzzle if a cleaner Socratic position exists). If the lesson's Socratic position is an intentionally
      simplified teaching shape rather than a verbatim DB position, document that explicitly in the JSON with a
      `_socraticNote` field explaining the simplification. Update the lesson's `socratic.boardSpec` and document
      the source movestring in `_socraticSourceMovestring`.
  C4. For lesson-11-j-shape.json: same process as C3 but for the j_shape category. Update `socratic.boardSpec`
      and document the source movestring.

  C5. Visual verify: GET /api/lessons/lesson-10-figure-7-trap and GET /api/lessons/lesson-11-j-shape →
      ConceptScreen and SocraticScreen render correctly for both lessons.

Phase D (Validation):
  D1. Run validate-puzzle-counts.mjs → must exit 0
  D2. Run npm run test:fast → must pass
  D3. Spot-check: enter each active challenge set in the UI; confirm ≥ 1 puzzle loads
```

---

# Agent Context Update

<!-- SPECKIT START -->
Current plan: specs/020-data-pipeline/plan.md
<!-- SPECKIT END -->
