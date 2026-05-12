# Research: Category Slug Refactor

## Authoritative Slug Reference

**The canonical slug list lives in `data-model.md` § "Category Entity — Authoritative Slug List".** All other documents, including this one, defer to that section. Do not restate the list here; look it up there.

Quick mapping for in-text reference: `1→immediate_threat`, `2→forced_block`, `3→double_threat`, `4→fork_setup`, `5→zugzwang`, `6→parity_control`, `7→forbidden_columns`.

---

## Critical Bug: `forbidden_column` (singular) in `classifier.js`

`classifier.js` line 18 returns `tag: 'forbidden_column'` (singular). All other code — `server/index.js`, `PredicateChecklist.jsx`, the spec (FR-001), and the DB — uses `'forbidden_columns'` (plural). This must be fixed to `'forbidden_columns'` as part of this refactor.

- **Decision**: `forbidden_columns` everywhere (plural).
- **Rationale**: Spec FR-001 is authoritative; three of four sources already use plural; singular was a pre-existing bug.

---

## Migration Approach

**Decision**: Two-step process, in this order:

1. **Dump (pre-migration script, not SQL)**: Run a Node.js script (`scripts/dump-categories.js` or equivalent) that exports all rows from `puzzles`, `candidates`, `false_positive_records`, and `blunders` to JSON. Supabase migrations cannot run `COPY TO` or write to the filesystem, so this step must happen outside the migration file. (Note: the spec calls the last table `coach_blunders` — the actual DB table is `public.blunders`.)

2. **SQL migration `011_category_slugs.sql`**: Drop and recreate the four affected tables with `TEXT NOT NULL CHECK (category IN (...slugs...))` columns. No backfill. The migration file is the only change applied via Supabase's migration runner.

**Rationale**: The spec mandates dump → drop+recreate → run updated code. The simpler drop+recreate eliminates any risk of residual integer rows.

**Alternative considered**: `ALTER TABLE ... ALTER COLUMN TYPE text USING CASE ... END`. Rejected — the spec explicitly discards existing data; drop+recreate is cleaner and leaves no residual state.

---

## Shared Constants Files

**Decision**:
- `server/categories.js` — new file imported by `server/index.js` and `server/candidate-generator.js`. Avoids circular dependency since neither imports the other.
- `src/lib/categories.js` — new file imported by all four frontend components.

Full content for both files is in `data-model.md` § "Constants Files".

**Rationale**: `src/lib/` already has `aiDifficulty.js` and `track.js`; the pattern is established.

**Existing code to remove**: `server/index.js` already has a `CATEGORY_NAMES_MAP` (integer-keyed). Delete it and replace with the import from `server/categories.js`.

---

## Complete Inventory of Numeric Category References

### `server/classifier.js`
- Line 18: `tag: 'forbidden_column'` → `'forbidden_columns'` (bug fix, see above)
- Lines 8–18: `category: 1` through `category: 7` return values → **drop the `category` field entirely**; callers must use `tag` only (FR-003)

### `server/predicates.js`
- `switch (puzzle.category)` with `case 1` through `case 7` → switch on slug strings: `case 'immediate_threat'` etc.
- Function names `evalCat1` through `evalCat7` → rename to `evalImmediateThreat`, `evalForcedBlock`, `evalDoubleThreat`, `evalForkSetup`, `evalZugzwang`, `evalParityControl`, `evalForbiddenColumns` (FR-008)

### `server/candidate-generator.js`
All occurrences, in order:

| Line (approx) | Current | After |
|---|---|---|
| `computeHighlightCells` | `if (category >= 1 && category <= 3)` | `if (['immediate_threat','forced_block','double_threat'].includes(category))` |
| `computeHighlightCells` | `if (category === 4)` | `if (category === 'fork_setup')` |
| `computeHighlightCells` | `if (category === 5)` | `if (category === 'zugzwang')` |
| `computeHighlightCells` | `if (category === 6)` | `if (category === 'parity_control')` |
| `computeHighlightCells` | `if (category === 7)` | `if (category === 'forbidden_columns')` |
| `checkPredicate` | `if (category === 5)` | `if (category === 'zugzwang')` |
| `checkPredicate` | `if (category === 7)` | `if (category === 'forbidden_columns')` |
| `isClean` | `if (category === 1)` | `if (category === 'immediate_threat')` |
| `generateCandidates` | `category <= 2 ? 20 : ...` | `['immediate_threat','forced_block'].includes(category) ? 20 : ...` |
| Function names | `computeCat123Highlight`, `computeCat4Highlight`, etc. | `computeLowCategoryHighlight`, `computeForkSetupHighlight`, `computeZugzwangHighlight`, `computeParityControlHighlight`, `computeForbiddenColumnsHighlight` (FR-008) |

### `server/index.js`
All occurrences, in order:

| Location | Current | After |
|---|---|---|
| `PAID_CATEGORIES` | `new Set([4, 5, 6])` | Import from `server/categories.js` |
| `CATEGORY_PREDICATE` map | `{ 1: 'immediate_threat', ... }` integer-keyed map used to derive `predicateType` in approve endpoint | **Delete entirely** — after refactor, `candidate.category` is already the slug; `predicateType = candidate.category` directly |
| `GET /api/puzzles` — query param | `parseInt(req.query.category, 10)` | `req.query.category` (string, no parse) |
| `GET /api/puzzles` — mock-mode branch (×2) | `[1,2,3,4,5,6].map(id => ...)` | `CATEGORY_ORDER.map(slug => ...)` |
| `POST /api/admin/generate` — validation | `Number.isInteger(category) && category >= 1 && category <= 7` | `VALID_CATEGORIES.has(category)` |
| `POST /api/admin/generate` — `category === 7` branch | `} else if (category === 7)` | `} else if (category === 'forbidden_columns')` |
| `GET /api/admin/candidates/stats` — manual loop | `for (let cat = 1; cat <= 7; cat++) stats[cat] = ...` | `for (const slug of CATEGORY_ORDER) stats[slug] = ...` |
| `GET /api/admin/candidates` — query param | `parseInt(req.query.category, 10)` | `req.query.category` (string) |
| `GET /api/admin/candidates` — validation | `!category \|\| category < 1 \|\| category > 7` | `!VALID_CATEGORIES.has(category)` |
| `GET /api/admin/scores` — query param | `parseInt(req.query.category, 10)` | `req.query.category` (string) |
| `GET /api/admin/scores` — validation | `!category \|\| category < 1 \|\| category > 7` | `!VALID_CATEGORIES.has(category)` |
| `GET /api/admin/scores` — predicate dispatch | `if (category === 5)` / `else if (category === 7)` | `if (category === 'zugzwang')` / `else if (category === 'forbidden_columns')` |
| `POST /api/admin/candidates/reject-batch` — validation | `Number.isInteger(category) && category < 1 \|\| category > 7` | `VALID_CATEGORIES.has(category)` |
| `POST /api/admin/candidates/:id/approve` — `cooperative_ai_moves` check | `[4, 6].includes(candidate.category)` | `['fork_setup', 'parity_control'].includes(candidate.category)` |
| `GET /api/admin/false-positives` — query param | `parseInt(req.query.category, 10)` | `req.query.category` (string) |
| `GET /api/admin/false-positives` — filter | `category && category >= 1 && category <= 7` | `category && VALID_CATEGORIES.has(category)` |
| `POST /api/admin/puzzles` — category validation | `![1,2,3,4,5,6].includes(Number(category))` (missing 7) | `!VALID_CATEGORIES.has(category)` |
| `POST /api/admin/puzzles` — predicate validation | `validPredicates` array missing `forbidden_columns` | Add `'forbidden_columns'` to list (or remove check since `VALID_CATEGORIES` covers it) |
| `POST /api/admin/puzzles` — insert | `category: Number(category)` | `category` (already a string) |

### `src/components/PredicateChecklist.jsx`
- Object keys `1:` through `7:` → slug keys `immediate_threat:` through `forbidden_columns:`
- The `category` prop passed to this component changes from an integer to a slug string; callers must pass the slug

### `src/components/CurationWorkspace.jsx` — beyond CATEGORY_NAMES

Three additional integer-keyed structures, all missed in the first two passes:

| Location | Current | After |
|---|---|---|
| `GOAL_PROMPTS` map (lines 21–28) | `{ 1: 'Find the winning move.', ... 7: '...' }` | Replace integer keys with slug keys; or move to `src/lib/categories.js` as `CATEGORY_GOAL_PROMPTS` |
| `deriveHighlightCol` switch (lines 61–96) | `switch (category) { case 1: ... case 7: }` | Replace with slug-keyed if/else chain (switch doesn't work on slugs in a readable way) |
| `MultiMoveSequencer` render guard (line 370) | `[4, 6].includes(category)` | `['fork_setup', 'parity_control'].includes(category)` |
| Category label display (line 314) | `Cat {category} — {CATEGORY_NAMES[category]}` | Remove "Cat N —" prefix; category is now a slug so the prefix is meaningless |

### `src/components/CandidateDashboard.jsx` — badge display

Line 123: `<span style={catNum}>{row.category}</span>` renders the category value in a 20px-wide numeric badge. After the refactor `row.category` is a slug string — it will overflow. Options: (a) derive the 1-indexed position from `CATEGORY_ORDER.indexOf(row.category) + 1`, or (b) remove the badge entirely and rely on the text label. Either is valid; option (a) preserves the visual structure.

### Frontend components — CATEGORY_NAMES removal
Each of the four components has a local `CATEGORY_NAMES` definition to be deleted and replaced with an import from `src/lib/categories.js`. See `plan.md` for the full file list.

---

### `server/data/placeholder_puzzles.json`

The seed puzzle file has integer `category` values (e.g. `"category": 1`). This file must be updated to slug strings before the `POST /api/admin/seed-puzzles` endpoint can work against the migrated schema. The `goal_predicate_type` field already uses slug strings and is unchanged.

---

## Server Validation Change

All `parseInt` calls on incoming `category` query/body params must be removed. After removing them, the value is already a string from `req.query` or `req.body`; pass it directly to `VALID_CATEGORIES.has()`.

---

## `/api/puzzles` Category List Bug

The endpoint currently iterates `[1,2,3,4,5,6]` (missing 7). After refactor it iterates `CATEGORY_ORDER` from `server/categories.js`, which includes all 7 slugs (fixes SC-003).

---

## Test Files Requiring Updates

### `tests/classifier/classifier.test.js` + `tests/classifier/fixtures/fixtures.json`

The main test loop asserts `result.category === fix.expectedCategory`. After the refactor `classify()` no longer returns `category` — drop the `result.category` assertion entirely; only assert `result.tag`.

Fixture JSON `"expectedCategory"` fields become irrelevant; they can be left in place or removed.

Regression tests assert integers directly and must be rewritten:
- `assert.notEqual(result.category, 1)` (×4) → `assert.notEqual(result.tag, 'immediate_threat')`
- `assert.equal(result.category, 1)` (×2) → `assert.equal(result.tag, 'immediate_threat')`
- `assert.equal(result.category, 7)` → `assert.equal(result.tag, 'forbidden_columns')`
- `assert.notEqual(result.tag, 'forbidden_column')` (×2 in C3 regressions) → `'forbidden_columns'` (fix singular/plural bug at the same time)

### `tests/predicates/predicates.test.js` + `tests/predicates/fixtures/fixtures.json`

- `fixtures/fixtures.json`: all `"category"` integer fields in puzzle objects → slug strings (13 fixtures, categories 1–6)
- Hardcoded inline fixtures in edge cases:
  - `{ category: 1, ... }` (line 34) → `{ category: 'immediate_threat', ... }`
  - `{ category: 5, ... }` (line 41) → `{ category: 'zugzwang', ... }`
- `{ category: 99 }` edge case (line 27) — tests the `default:` branch; 99 is not a valid slug either, keep as-is

### `tests/predicates/forbidden_columns.test.js`

- Line 40: `{ category: 7, ... }` → `{ category: 'forbidden_columns', ... }`
- Line 67: `{ category: 7, ... }` → `{ category: 'forbidden_columns', ... }`

### `tests/integration/candidate-generator.test.js`

All `generateCandidates(1, ...)` calls → `generateCandidates('immediate_threat', ...)`. No other category integer references.

### `server/test_explain_parity.js`

No category integer references found. No changes needed.

---

## No New Dependencies

No new npm packages required.
