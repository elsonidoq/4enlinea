# Implementation Plan: New Puzzle Categories (008)

**Branch**: `008-new-puzzle-categories` | **Date**: 2026-05-14 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/008-new-puzzle-categories/spec.md`

---

## Summary

Add six single-move puzzle categories (`z_threat`, `claimeven`, `undercut`,
`overcut`, `figure_7`, `j_shape`) to DecodeC4. Each category requires: a
server-side detection predicate computed during candidate generation, a DB slug
constraint extension, a pre-computed `highlight_metadata` column stored on
`puzzles`, per-category goal predicate evaluation logic, and frontend highlight
overlays with textual explanations.

---

## Technical Context

**Language/Version**: Node.js (ES modules, v18+), React 18, JSX  
**Primary Dependencies**: Express 4, Supabase (PostgreSQL 15), c4solver binary (C++ CLI), Vitest  
**Storage**: PostgreSQL via Supabase; `puzzles`, `candidates`, `false_positive_records`, `blunders` tables  
**Testing**: Vitest (unit), Node integration tests exercising real c4solver binary (per Principle III)  
**Target Platform**: Linux server (Supabase-hosted); browser (Chrome/Firefox/Safari)  
**Project Type**: Web service + web application (Express API + React SPA)  
**Performance Goals**: Goal predicate evaluation ≤100ms (bitboard); ≤3s for solver-required predicates; claimeven simulation runs offline at generation time only  
**Constraints**: All six new categories use `interaction_mode = 'single_move'`; no multi-move interaction required; spec 007 migration must be applied first  
**Scale/Scope**: 6 new categories; ~20 labeled positions per category for classifier precision gate; frontend affects Board.jsx and CurationWorkspace.jsx

---

## Constitution Check

*GATE: Must pass before implementation. Re-checked after Phase 1 design (below).*

### Principle I — Explanation Engine as Single Source of Truth

✅ All new predicate evaluation goes through `evaluatePredicate()` in
`predicates.js`. `highlight_metadata` is stored on `puzzles` and returned by
`GET /api/puzzles/:id` alongside solver scores. No feature computes pattern
labels independently.

FR-021 requires standard correct/wrong feedback after each answer. This uses the
existing hardcoded i18n strings — no explanation layer or LLM involvement.

### Principle II — Code Quality & Simplicity

✅ Each new category gets its own detection function and its own predicate
evaluator — parallel to the existing five categories. No speculative
abstractions. The three similar detection patterns (figure_7, j_shape, pattern
matching) are implemented as separate functions rather than a premature helper.

### Principle III — Testing Standards

✅ **Gate**: SC-002 requires ≥20 manually reviewed positions per category with
classifier precision ≥90%. These fixtures must be checked into
`tests/classifier/fixtures/fixtures.json` before merge. At least one positive
and one negative fixture per category required in `tests/predicates/fixtures/`.
Integration tests must exercise the real c4solver binary.

⚠️ **Claimeven simulation** runs ~20 solver queries per candidate. The solver
integration test for claimeven must use a real solver process and a known
position with a documented expected outcome.

### Principle IV — UX Consistency

✅ New role names (`killing_threat`, `dead_threat`, `major_threat`,
`neutralised_threat`, `pattern_piece`, `z_range`) must be consistently used
across server `highlight_metadata`, curation workspace rendering, and
player-facing board overlays. Color assignments (orange/purple/teal) must be
added to the shared color legend.

### Principle V — Performance

✅ At play time: predicate evaluation for all six new categories uses only
pre-stored `correct_col` or `highlight_metadata` — no solver call. Latency
budget for solver-required predicates (≤3s) applies only at candidate generation
time (offline).

✅ Claimeven simulation (~20 queries) runs offline at generation time. No
latency risk to the learner path.

### Principle VI — Implementation & Debugging Methodology

✅ **Data dependency map** (traced before implementation):

| UI field | Source table | Column | API field |
|---|---|---|---|
| Highlight overlay type | `puzzles` | `highlight_metadata` | `highlightMetadata` |
| Count badge (z_threat) | `puzzles` | `highlight_metadata.badgeCount` | `highlightMetadata.badgeCount` |
| Correct column | `puzzles` | `correct_col` | `correctCol` |
| Simulation trace (curation) | `candidates` | `category_evidence` | (curation endpoint only) |
| Baseinverse pair (curation) | `candidates` | `category_evidence.baseinverse_pair` | (curation endpoint only) |

The approve endpoint (`POST /api/admin/candidates/:id/approve`) must SELECT
`highlight_metadata` and `correct_col` from the candidate row before inserting
the puzzle row. Both are currently absent from the candidate SELECT in `index.js`
(line 1036) and from the puzzle INSERT (lines 1049–1060) — this is the canonical
missing-join process failure (Principle VI). The GET endpoint (line 455) also
omits both fields from its SELECT and response.

✅ **Signal validation**: For z_threat, the solver score confirms the column is
a winner. For forced_win terminal detection, direct board `checkWin` must be
used (not flat solver scores). This pattern is already documented; apply it to
figure_7/j_shape completion cell validation.

✅ **Load-bearing assumptions** made explicit:
- `interaction_mode = 'single_move'` on new puzzle rows (enforced by migration 014 default).
- `correct_col` is 0-indexed throughout (matches existing predicates.js convention).
- `highlight_metadata` rows: 0-indexed from bottom (row 0 = bottom), 0-indexed columns.

### Post-Phase-1 Constitution Re-Check

After Phase 1 design (research.md, data-model.md, contracts/api.md):

- The API contract is documented and the `highlightMetadata` field propagation
  is traced end-to-end (candidate → approve → puzzles → GET endpoint → frontend).
- The data model explicitly calls out which columns are candidates-only vs.
  puzzles+candidates.
- No new principles are violated by the design.

---

## Project Structure

### Documentation (this feature)

```text
specs/008-new-puzzle-categories/
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output (below)
├── contracts/
│   └── api.md           # Pre-existing ✅
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
connect-four/
├── server/
│   ├── categories.js            # Add 6 new slugs
│   ├── classifier.js            # Add 6 new detect* functions
│   ├── candidate-generator.js   # Add 6 new check* functions; populate highlight_metadata + category_evidence
│   ├── predicates.js            # Add 6 new eval* functions; extend evaluatePredicate switch
│   ├── index.js                 # approve endpoint: copy highlight_metadata; GET puzzle: return highlightMetadata
│   └── migrations/
│       └── 015_new_puzzle_categories.sql
├── src/
│   ├── components/
│   │   ├── Board.jsx            # Capsule overlay + cell role highlights + count badge
│   │   └── CurationWorkspace.jsx # category_evidence rendering; simulation trace; z_range; pattern_piece
│   └── lib/
│       └── categories.js        # Mirror server categories.js (6 new slugs)
└── tests/
    ├── predicates/
    │   ├── predicates.test.js   # Extend with 6 new categories (positive + negative per category)
    │   └── fixtures/fixtures.json
    ├── classifier/
    │   ├── classifier.test.js   # Precision gate: ≥20 labeled positions per new category
    │   └── fixtures/fixtures.json
    └── integration/
        ├── z_threat.test.js     # End-to-end: detect → candidate → evaluate
        ├── claimeven.test.js    # Subtype A + B; real solver
        └── figure7_jshape.test.js
```

**Structure Decision**: Single web-application structure (server + frontend under
`connect-four/`). No new top-level directories. New files only for integration
tests; all other changes extend existing files.

---

## Quickstart: Implementing a New Category (example: z_threat)

This walkthrough traces the full stack for one category as the reference pattern.
Repeat for each of the other five.

### 1. Migration

In `connect-four/server/migrations/015_new_puzzle_categories.sql`:
- Drop and re-add the `category` CHECK constraint on `puzzles`, `candidates`,
  `false_positive_records`, `blunders` to include the six new slugs.
- `ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS highlight_metadata jsonb DEFAULT NULL;`
- `ALTER TABLE candidates ADD COLUMN highlight_metadata jsonb DEFAULT NULL;`
- `ALTER TABLE candidates ADD COLUMN category_evidence jsonb DEFAULT NULL;`
- Add explicit GRANTs for new columns and all four tables.

### 2. categories.js

Add `'z_threat'` to `VALID_CATEGORIES`, `CATEGORY_ORDER`, `CATEGORY_NAMES`, and
`PAID_CATEGORIES` (all six new pattern categories and the two existing paid
categories — `forced_win`, `forbidden_columns` — are paid; add all eight to
`PAID_CATEGORIES`).

Mirror in `connect-four/src/lib/categories.js`.

### 3. Classifier: detectZThreat

In `classifier.js`, add `detectZThreat(moves, scores)`:
```
board, heights = parseBoardState(moves)
for each col 0..6:
  if heights[col] >= ROWS: skip
  for each empty cell in col from heights[col] up:
    if cell is a solver-winning threat (i.e. scores[col] > 0 and is the threat cell row):
      count = threat_row - heights[col] + 1  // inclusive
      if count is odd: mark col as z_threat candidate
if exactly one z_threat candidate and scores[col] > 0: match
highlight_metadata = { type:'capsule', column, fromRow:heights[col], toRow:threat_row, badgeCount:count }
```

> See spec FR-001 for the exact algorithm.

### 4. Candidate generator: checkZThreat

In `candidate-generator.js`, add `checkZThreatPredicate(moves, scores, solver)`:
- Call `detectZThreat(moves, scores)`.
- If matched, set `correct_col`, `highlight_metadata`, `category_evidence: {}`.

### 5. Goal predicate: evalZThreat

In `predicates.js`, add `evalZThreat(candidateCol, puzzle)`:
```javascript
const correctCol = puzzle.highlightMetadata?.column;
if (candidateCol === correctCol) return { result: 'correct', correctCol };
return { result: 'wrong', correctCol };
```

Extend the `switch` in `evaluatePredicate` with `case 'z_threat'`.

### 6. Approve endpoint

In `index.js`, in `POST /api/admin/candidates/:id/approve`:
- Add `highlight_metadata` and `correct_col` to the candidate SELECT (currently only `'id, category, move_string, status'`).
- Copy both `highlight_metadata` and `correct_col` from the candidate row to the `puzzles` INSERT.
- Do NOT accept these fields from the request body — read them from the DB only.

### 7. GET /api/puzzles/:id

- Add `highlight_metadata` and `correct_col` to the puzzle SELECT (currently missing both).
- Return them as `highlightMetadata` and `correctCol` in the JSON response object.

### 8. Board.jsx — Capsule highlight

When `puzzle.highlightMetadata?.type === 'capsule'`:
- Render a `<div>` overlay absolutely positioned over the board column, spanning
  rows `fromRow` to `toRow` (both inclusive, 0 = bottom).
- Style: `border-radius: 9999px`, full border outline, no fill (transparent interior).
- Render a count badge `<span>` above the board frame above the column.

### 9. Tests

Add a z_threat fixture to `tests/predicates/fixtures/fixtures.json` (one positive,
one negative). Add ≥20 labeled z_threat positions to
`tests/classifier/fixtures/fixtures.json`. Add `tests/integration/z_threat.test.js`
running the real solver.

---

## Complexity Tracking

No constitution violations. No complexity justification needed.

---

## Classifier Bug Fixes (post-audit)

Cross-check of the spec against the KB revealed 11 discrepancies (J1–J4, U1–U3, O1, F1–F3). All affect detection functions in `classifier.js`. Each entry names the discrepancy ID, the current wrong behaviour, the required change, and whether a DB fix is also needed.

---

### detectJShape — fixes J1, J2, J3, J4

**J1 — Missing anchor parity**
- Current: iterates `for (let r = 0; r <= ROWS - 3; r++)` with no parity guard.
- Required: add `if (r % 2 !== 0) continue;` (0-indexed even = 1-indexed odd). The canonical J Configuration has lower anchor D1 (0-indexed row 0, even); odd 0-indexed anchor rows are parity-wrong and produce false positives.

**J2 — Missing edge proximity**
- Current: `for (let c = 0; c < COLS - 1; c++)` permits `c+2 == COLS` (off-board far column); `r <= ROWS - 3` permits `r+3 == ROWS` (off-board diagonal extension row).
- Required: tighten loop bounds to `c < COLS - 2` (canonical) / `c >= 2` (mirror) and `r <= ROWS - 4`, so far column `c+2` and diagonal extension row `r+3` are always in bounds.

**J3 — Missing parity cancellation**
- Current: no check for opponent odd-row major threats in the far column.
- Required: before returning a match, enumerate opponent major threats in column `c+2` (canonical) / `c-2` (mirror); if any sit at an odd 1-indexed row (= even 0-indexed row), reject this anchor.

**J4 — Guard checks wrong cell**
- Current: `tryTemplate` checks `board[completing.row + 1][tc]` for `tc ∈ {c, c+1}` — i.e., the row above the completing row in the two template columns (rows r+3 in columns c and c+1).
- Required: replace with a single check `board[completing.row][c+2] === opponent` (canonical) / `board[completing.row][c-2] === opponent` (mirror) — i.e., the far-column cell at the same row as the completing cell (`board[r+2][c+2]` in row-major 0-indexed), per `allen-j-configuration.md` `board[far_col][far_row] != opponent`.

**DB fix**: No — no undercut/j_shape puzzles exist yet (classifier fixtures are manually curated and T020–T025 are still pending).

---

### detectUndercut — fixes U1, U2, U3

**U1 — Missing opposite-parity requirement**
- Current: `opponentThreats[col].find(rp => rp < R)` — finds any opponent threat below R with no parity check.
- Required: add `if (R % 2 === kill % 2) continue;` after finding `kill`. Same 0-indexed parity means same 1-indexed parity → T4 (no interaction), not undercut.

**U2 — Missing T5 exception**
- Current: no exclusion for the row-3+row-6 pair.
- Required: add `if (R === 5 && kill === 2) continue;` (0-indexed: 1-indexed rows 6 and 3). T5 overrides T2 for this specific pair; neither threat undercuts the other.

**U3 — Missing adjacency constraint for sub-case 3**
- Current: any distance between R (even 0-indexed = odd 1-indexed... wait no) and kill is accepted.
- Required: add `if (R % 2 === 1 && kill % 2 === 0 && R !== kill + 1) continue;` — when current player's R is odd 0-indexed (= even 1-indexed) and opponent's kill is even 0-indexed (= odd 1-indexed), T2 sub-case 3 requires adjacency (R = kill + 1).

**DB fix**: Needed for U1 — any stored `undercut` candidates or puzzles with same-parity R/R′ do not satisfy T2 and should be re-reviewed. Flag for manual curation review after the code fix lands.

---

### detectOvercut — fix O1

**O1 — No parity analysis / T2-blocking mechanism check**
- Current: returns any column where current player has R > opponent R′ and `scores[col] > 0`, with no check that T2 is actually blocked.
- Required: after finding `(R, neutralised)` pair, verify that exactly one of the four T2-blocking mechanisms holds:
  - (a) `!opponentMajorThreats[col].includes(neutralised)` — opponent's threat is minor (not a major 4-in-a-row threat);
  - (b) `R % 2 === neutralised % 2` — same parity (T4);
  - (c) `(R === 5 && neutralised === 2) || (R === 2 && neutralised === 5)` — T5 exception (0-indexed rows 5 and 2 = 1-indexed 6 and 3);
  - (d) any current-player major threat at R″ < neutralised satisfies the T2 condition against neutralised (even current + odd opponent at any distance, or odd current + even opponent adjacent).
  The solver gate (`scores[col] > 0`) provides a strong backstop, but without the explicit check the detector may fire on positions where the win is unrelated to the overcut pattern in that column.

**DB fix**: No — no overcut puzzles exist yet.

---

### detectFigure7 — fixes F1, F2, F3

**F1 — gravityTopCount computed but not checked**
- Current: `gravityTopCount` is computed but the code does not `continue` when it is ≥ 2.
- Required: add `if (gravityTopCount >= 2) continue;` immediately after the `gravityTopCount` assignment. Two gravity-top threats is a direct fork, not a Figure-7 zugzwang.

**F2 — hasAboveGravity computed but not checked**
- Current: `hasAboveGravity` is computed but the code does not `continue` when it is false.
- Required: add `if (!hasAboveGravity) continue;` immediately after the `hasAboveGravity` assignment. At least one threat must be above gravity for the zugzwang element.

**F3 — Variant 1 (ascending + right) is structurally wrong**
- Current: variants 1 and 1b (ascending + right) enumerate the horizontal arm extending to `x+4,y+2`, placing threat cells in different columns (diagonal at x+3, horizontal at x+5 or x+1). This violates the same-column property and is self-filtered by `hasConsecutivePair`, but the dead code is misleading and wastes iterations.
- Required: remove the two variant-1 branches (`if (x + 4 < COLS && y + 2 < ROWS) { variants.push([...]) }` and its `1b` sibling) from the loop body.

**DB fix**: No — F3 was self-filtering (hasConsecutivePair rejects cross-column pairs) so no false positives reached the DB. F1/F2 tighten the filter; any stored figure_7 puzzles that pass F1/F2 are already correct (the filter only rejects cases that were borderline).
