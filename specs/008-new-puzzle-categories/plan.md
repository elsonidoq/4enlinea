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
