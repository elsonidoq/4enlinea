# Implementation Plan: Category Slug Refactor

**Branch**: `main` | **Date**: 2026-05-12 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/006-category-slugs/spec.md`

## Summary

Replace all integer category IDs (1–7) with string slugs end-to-end: DB schema, server logic, and frontend display. The migration strategy is dump → recreate → run updated code; no backfill is required. The primary risk surface is `predicates.js` (switch cases on integers), `candidate-generator.js` (numeric comparisons), and the four frontend components that each define their own local `CATEGORY_NAMES` map.

**Authoritative slug list**: `data-model.md` § "Category Entity — Authoritative Slug List". Every implementation step that needs a slug name must look it up there, not derive it independently.

## Technical Context

**Language/Version**: Node.js 22 (ESM, `--env-file`), React 18 / Vite 5  
**Primary Dependencies**: Express, Supabase JS client, Node `--test` runner  
**Storage**: PostgreSQL via Supabase. Affected tables: `puzzles`, `candidates`, `false_positive_records`, `blunders` (note: spec incorrectly calls this `coach_blunders`; the actual DB table is `public.blunders`)  
**Testing**: Node built-in `--test` runner; files in `tests/` and `server/test_explain_parity.js`  
**Target Platform**: Linux server (Supabase-hosted DB) + macOS dev  
**Project Type**: Web application (Express API + React SPA)  
**Performance Goals**: No change — predicate evaluation budgets unchanged (see Constitution §V)  
**Constraints**: Migration is destructive; tables start empty after step 2. Old server code must never run against the new schema.  
**Scale/Scope**: 4 DB tables, ~7 server files, ~5 frontend components/pages, 31 existing tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I — Explanation Engine as SSoT** | ✅ PASS | Refactor is naming-only; classifier still routes through the same engine layers. `classify()` drops the integer `category` field; the caller chain is unchanged. |
| **II — Code Quality & Simplicity** | ✅ PASS | The shared constants files replace four local `CATEGORY_NAMES` copies — net reduction in duplication. `CATEGORY_PREDICATE` map deleted (redundant after refactor). No new abstractions beyond FR-006. |
| **III — Testing Standards** | ✅ PASS | FR-009 mandates all 31 tests pass with slug-based assertions. P1 executes tests before DB migration. Integration tests in `tests/integration/` exercise the real solver. |
| **IV — UX Consistency** | ✅ PASS | Single constants file (FR-006) guarantees uniform labels and chip styling across all surfaces. |
| **V — Performance** | ✅ PASS | String equality vs integer equality has no meaningful latency impact. All predicate budgets unchanged. |
| **VI — Implementation & Debugging Methodology** | ✅ PASS | Implementation order (§ below) is bottom-up: deepest engine layer first, DB migration only after tests pass, UI last. All DB fields traced in `data-model.md`. |

**Tier & Access Control**: `PAID_CATEGORIES` changes from `new Set([4, 5, 6])` to `new Set(['fork_setup', 'zugzwang', 'parity_control'])` — sourced from `server/categories.js`. `userCanAccessCategory` logic is structurally unchanged.

No constitution violations. No complexity tracking required.

## Implementation Order

The implementation is bottom-up: deepest engine layer (pure functions, no DB) first, then API layer, then DB migration, then frontend. **Tests must pass before the DB migration runs.** Generation is verified after migration. UI is verified last.

### Phase A — Pure server layer (no DB, no frontend)

These changes are purely functional — no HTTP, no database. Each step builds on the last and can be tested by running `npm test` after step 5.

**Step 1 — Create `server/categories.js`** (new file)

Foundation for everything else. Full content in `data-model.md` § "Constants Files — server/categories.js". Exports: `VALID_CATEGORIES`, `PAID_CATEGORIES`, `CATEGORY_ORDER`, `CATEGORY_NAMES`.

**Step 2 — Update `server/classifier.js`**

- Fix `forbidden_column` → `forbidden_columns` bug (see `research.md` § "Critical Bug")
- Drop the `category` integer field from all return values; return only `{ tag }` (FR-003)
- No callers in the test suite rely on `result.category`; this will be confirmed by step 5

**Step 3 — Update `server/predicates.js`**

- `switch (puzzle.category)`: change all cases from integers to slug strings using the mapping in `data-model.md` § "Category Entity"
- Rename `evalCat1`…`evalCat7` to `evalImmediateThreat`, `evalForcedBlock`, `evalDoubleThreat`, `evalForkSetup`, `evalZugzwang`, `evalParityControl`, `evalForbiddenColumns` (FR-008)

**Step 4 — Update `server/candidate-generator.js`**

Full change inventory in `research.md` § "candidate-generator.js". Key changes:
- All numeric comparisons in `computeHighlightCells`, `checkPredicate`, `isClean`, and `generateCandidates` (maxMoves logic) → slug comparisons
- Rename `computeCat123Highlight`, `computeCat4Highlight`, etc. → slug-based names (FR-008)
- Import `VALID_CATEGORIES` and `CATEGORY_ORDER` from `server/categories.js`

**Step 5 — Update test files and fixture JSON**

Full per-file inventory in `research.md` § "Test Files Requiring Updates". Key points:
- `tests/classifier/classifier.test.js`: all `result.category` assertions (both in main loop and in regression tests) → `result.tag` assertions; regression tests use integer values 1 and 7 that must become slugs
- `tests/classifier/fixtures/fixtures.json`: `"expectedCategory"` fields become irrelevant (can be left or removed)
- `tests/predicates/fixtures/fixtures.json`: all `"category"` integer fields in puzzle objects → slug strings (this is a JSON file, not a JS file)
- `tests/predicates/predicates.test.js`: hardcoded inline fixtures with `category: 1` and `category: 5` → slugs
- `tests/predicates/forbidden_columns.test.js`: hardcoded `{ category: 7 }` fixtures → `'forbidden_columns'`
- `tests/integration/candidate-generator.test.js`: `generateCandidates(1, ...)` → `generateCandidates('immediate_threat', ...)`
- `server/test_explain_parity.js`: no changes needed (confirmed no integer category references)

**Step 6 — Run `npm test`**

All 31 tests must pass (SC-001 / spec P1). **Gate: do not proceed until this is clean.**

### Phase B — API layer (HTTP routing, no DB migration yet)

**Step 7 — Update `server/index.js`**

Full change inventory in `research.md` § "index.js". Key changes grouped by concern:

*Constants and helpers*:
- Import `VALID_CATEGORIES`, `PAID_CATEGORIES`, `CATEGORY_ORDER` from `server/categories.js`; delete local `PAID_CATEGORIES` and `CATEGORY_PREDICATE` definitions
- `CATEGORY_PREDICATE` is deleted entirely — after refactor `candidate.category` is already a slug, so `predicateType = candidate.category` directly (line 987 simplification)

*Remove all `parseInt` on category params*: `GET /api/puzzles`, `GET /api/admin/candidates`, `GET /api/admin/scores`, `GET /api/admin/false-positives` — see full inventory in `research.md`

*Update all validation guards* from integer range checks to `VALID_CATEGORIES.has()`: applies to `POST /api/admin/generate`, `GET /api/admin/candidates`, `GET /api/admin/scores`, `POST /api/admin/candidates/reject-batch`, `GET /api/admin/false-positives`

*Fix remaining numeric comparisons*:
- Mock-mode `[1,2,3,4,5,6].map(...)` branches (×2) → `CATEGORY_ORDER.map(...)`
- `category === 5` / `category === 7` in `/api/admin/scores` predicate dispatch → slug strings
- Stats endpoint `for (let cat = 1; cat <= 7; cat++)` → `for (const slug of CATEGORY_ORDER)`
- Approve endpoint `[4, 6].includes(candidate.category)` → `['fork_setup', 'parity_control'].includes(...)`
- `/api/admin/puzzles` category validation (`![1,2,3,4,5,6]`) and insert (`Number(category)`) → slug string handling; also add `forbidden_columns` to `validPredicates`

**Step 8 — Update `server/data/placeholder_puzzles.json`**

Change all `"category": 1` … `"category": 7` integer values to their slug equivalents from `data-model.md` § "Category Entity". The `goal_predicate_type` field already uses slug strings and is unchanged.

### Phase C — DB migration

**Step 9 — Write and run the dump script**

Pre-migration, outside SQL. Export all rows from `puzzles`, `candidates`, `false_positive_records`, and `blunders` to JSON reference files. See `research.md` § "Migration Approach" for why this cannot live inside the SQL migration file.

**Step 10 — Write `server/migrations/011_category_slugs.sql`**

Drop and recreate the four tables with `TEXT NOT NULL CHECK` constraints. Full schema from `data-model.md` § "Affected DB Tables". Recreate all indexes. Apply via Supabase migration runner.

### Phase D — Frontend

**Step 11 — Create `src/lib/categories.js`**

Full content (fully spelled out, no placeholders) from `data-model.md` § "Constants Files — src/lib/categories.js".

**Step 12 — Update `src/components/PredicateChecklist.jsx`**

Integer object keys `1:` … `7:` → slug keys `immediate_threat:` … `forbidden_columns:`. The `category` prop is now a slug string; callers must pass a slug.

**Step 13 — Update frontend components**

`src/pages/PuzzlesPage.jsx` and `src/pages/CoachPage.jsx`: remove local `CATEGORY_NAMES` / `CATEGORY_CHIPS` definitions; import from `src/lib/categories.js`.

`src/components/CandidateDashboard.jsx`:
- Remove local `CATEGORY_NAMES`; import from `src/lib/categories.js`
- Line 123: `{row.category}` renders in a 20px numeric badge — replace with the 1-indexed position: `{CATEGORY_ORDER.indexOf(row.category) + 1}` so the badge still shows a short number

`src/components/CurationWorkspace.jsx` — four changes beyond `CATEGORY_NAMES` (see `research.md` § "CurationWorkspace.jsx — beyond CATEGORY_NAMES"):
- Remove local `CATEGORY_NAMES`; import from `src/lib/categories.js` — also fixes "Immediate Win" → "Immediate Threat"
- `GOAL_PROMPTS` map: replace integer keys 1–7 with slug keys (or move to `src/lib/categories.js`)
- `deriveHighlightCol` switch: replace `case 1:` … `case 7:` with slug-based if/else chain
- `[4, 6].includes(category)` (line 370): → `['fork_setup', 'parity_control'].includes(category)`
- Category label display (line 314): `Cat {category} — ...` → remove the integer prefix, just show the name

### Phase E — End-to-end verification

**Step 14 — Verify generation** (spec P2): trigger candidate generation for at least `zugzwang` and `forbidden_columns`; confirm rows have slug values and pass the DB CHECK constraint.

**Step 15 — Verify curation UI** (spec P3): open Candidate Dashboard and Curation Workspace; confirm slug labels, filters, approve/reject flow.

**Step 16 — Verify Puzzles page** (spec P4): confirm all 7 category chips render correctly, including `forbidden_columns`.

**Step 17 — Verify Coach page** (spec P5): confirm category breakdown uses slug labels.

## Project Structure

### Documentation (this feature)

```text
specs/006-category-slugs/
├── plan.md              # This file
├── research.md          # Phase 0 — slug inventory, complete numeric-reference inventory, migration approach
├── data-model.md        # Phase 1 — authoritative slug list, DB schema, full constants file content
├── contracts/api.md     # Phase 1 — endpoint contracts showing before/after shapes
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (affected files)

```text
connect-four/
├── server/
│   ├── categories.js              # NEW: VALID_CATEGORIES, PAID_CATEGORIES, CATEGORY_ORDER, CATEGORY_NAMES
│   ├── classifier.js              # Drop integer category field; fix forbidden_column → forbidden_columns
│   ├── predicates.js              # switch cases integer → slug; rename evalCatN functions (FR-008)
│   ├── candidate-generator.js     # All numeric category comparisons → slugs; rename computeCatN (FR-008)
│   ├── index.js                   # Remove parseInt; delete CATEGORY_PREDICATE; update all guards/comparisons
│   ├── test_explain_parity.js     # Scan and update any integer category references
│   ├── data/
│   │   └── placeholder_puzzles.json  # "category": 1–7 integers → slug strings
│   └── migrations/
│       └── 011_category_slugs.sql    # Drop+recreate 4 tables (blunders, candidates, false_positive_records, puzzles)
├── src/
│   ├── lib/
│   │   └── categories.js          # NEW: CATEGORY_ORDER, CATEGORY_NAMES, CATEGORY_CHIPS, PAID_CATEGORIES
│   ├── components/
│   │   ├── PredicateChecklist.jsx # Integer object keys 1–7 → slug keys
│   │   ├── CandidateDashboard.jsx # Remove local CATEGORY_NAMES; fix catNum badge overflow
│   │   └── CurationWorkspace.jsx  # CATEGORY_NAMES + GOAL_PROMPTS + deriveHighlightCol switch + [4,6] guard + Cat label
│   └── pages/
│       ├── PuzzlesPage.jsx        # Remove local CATEGORY_NAMES + CATEGORY_CHIPS; import from lib
│       └── CoachPage.jsx          # Same
└── tests/
    ├── classifier/classifier.test.js             # Drop result.category assertions; rewrite regressions to use result.tag
    ├── classifier/fixtures/fixtures.json         # "expectedCategory" fields become irrelevant
    ├── predicates/predicates.test.js             # Inline fixtures: category integers → slugs
    ├── predicates/fixtures/fixtures.json         # "category" integer fields → slug strings (JSON file)
    ├── predicates/forbidden_columns.test.js      # { category: 7 } → { category: 'forbidden_columns' }
    └── integration/candidate-generator.test.js  # generateCandidates(1,...) → generateCandidates('immediate_threat',...)
```

**Structure Decision**: Web application (Option 2). Both constants files follow established `src/lib/` and `server/` module patterns already in use.

## Complexity Tracking

> No constitution violations — section not required.
