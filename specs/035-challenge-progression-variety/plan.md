# Implementation Plan: Challenge Progression & Variety

**Feature**: 035-challenge-progression-variety
**Created**: 2026-06-16
**Status**: Draft
**Related epic**: Epic 6 in TODOs_epics.md

## Summary

Four independent workstreams that together deliver Challenge Progression & Variety:
1. **Progress API + UI** (P1) — New `GET /api/user/challenge-progress` endpoint and SetCard visual enhancements (progress bar, accuracy bar, cleared badge). Fully independent of the shape-reordering work.
2. **Shape Descriptor + Serializer** (P2 enabler) — New `server/shapeDescriptor.js` module that extracts per-puzzle shape descriptors from stored metadata or board analysis. Includes a deterministic canonical serializer (FR-015a).
3. **Reindex** (P2) — New `POST /api/admin/puzzles/reindex` endpoint, migration 044 (shape_key, position, highlight_cells columns), curation-tool warnings + reindex button, and draw-endpoint switch to position-based ordering.
4. **forced_win highlight_cells** (P2 enabler) — Copy `highlight_cells` from candidates to puzzles during approval, plus board-replay fallback for pre-migration puzzles during reindex.

## Technical Context

**Key files touched**:
- `server/index.js` — new endpoints, draw-endpoint refactor
- `server/shapeDescriptor.js` — NEW: shape extraction + serializer
- `server/categories.js` — no change (validates against existing VALID_CATEGORIES)
- `server/challengeSets.js` — no change (CHALLENGE_SETS constant used as source of truth for progress)
- `server/migrations/044_shape_key_position.sql` — NEW: three new columns
- `server/candidate-generator.js` — import `computeForcedWinHighlight` in reindex fallback path
- `src/store/SupabaseStore.js` — if Epic 1 is not done, direct DB query required; if done, server endpoint
- `src/store/ProfileStore.jsx` — provide `isAuthenticated` flag to SetPickerScreen
- `src/screens/SetPickerScreen.jsx` — fetch progress, pass to SetCard
- `src/components/SetCard.jsx` — render progress bar, accuracy bar, cleared badge
- `src/pages/AdminCuratePage.jsx` — no change (pass-through)
- `src/components/CandidateDashboard.jsx` — add reindex button + unindexed warning per category
- `src/i18n/en.json` — new i18n keys for progress UI
- `connect-four/package.json` — `test` and `test:fast` scripts: add new test files

**Node.js / runtime context**: Express 5, `node:test`. Module system: ESM. Supabase service-role key server-side only. Migration runner: `server/migrate.js` (hand-rolled, sequential-numeric filenames).

**Current draw endpoint state** (lines 1051–1142 in `server/index.js`):
- Uses `Math.random() - 0.5` shuffle on oversampled result (n*4 limit)
- No `position` or `shape_key` columns exist on puzzles table
- Resume path re-fetches by stored `puzzle_ids` and restores original order

**Current candidate approval** (lines 2453–2515 in `server/index.js`):
- Copies `highlight_metadata`, `correct_col`, `category_evidence.simulation_trace` to puzzles
- Does NOT copy `highlight_cells` (candidates table has it; puzzles table does not)
- `interaction_mode` defaults to `'sequence'` for forced_win, `'single_move'` otherwise

**Current SetPickerScreen** (84 lines): renders only `set.stars` and `positionCount` — no progress, accuracy, or cleared indicator.

## Architecture Decisions

### D1: Progress API is auth-required, returns all CHALLENGE_SETS categories

The endpoint returns entries for every category in `CHALLENGE_SETS`, not just categories with active puzzles. A category with zero active puzzles returns `{ attempted: 0, correct: 0, total: 0, accuracy: 0, cleared: false }`. This matches FR-013.

Implementation uses two supabase-js queries with JS-side aggregation (raw SQL with FILTER clause is not expressible in the supabase-js fluent API; parameterized JOIN ON clauses are also unsupported):

**Query 1 — Total active puzzles per category**:
```js
supabase.from('puzzles').select('category', { count: 'exact' }).eq('is_active', true).in('category', CHALLENGE_SETS_CATEGORIES)
// Group by category in JS; supabase-js .select() with count returns per-row, aggregate by iterating rows.
```
Actually uses `supabase.from('puzzles').select('category, id').eq('is_active', true).in('category', CHALLENGE_SETS_CATEGORIES)` and counts rows per category in JS.

**Query 2 — User attempts per category**:
```js
supabase.from('puzzle_attempts')
  .select('puzzle_id, first_attempt_correct, puzzles!inner(category)')
  .eq('user_id', req.user.id)
// Filter results to puzzles.is_active = true (handled by inner join to active-only sub-filter, or JS-side filter after fetch)
```
The `.select('puzzles!inner(category)')` pattern uses PostgREST resource embedding to join puzzle_attempts → puzzles, bringing the category along on each row. Results are grouped by category in JS to compute `attempted` (COUNT DISTINCT puzzle_id) and `correct` (COUNT DISTINCT puzzle_id WHERE first_attempt_correct = true).

**JS merge**:
1. Build a totals map: `{ [category]: activePuzzleCount }` from Query 1.
2. Build an attempts map: `{ [category]: { attempted: Set<puzzle_id>, correct: Set<puzzle_id> } }` from Query 2.
3. For each category in CHALLENGE_SETS: pull total from totals map (default 0), pull attempted/correct set sizes from attempts map (default 0/0), compute accuracy/cleared.
4. Return the assembled progress object.

Rationale: Two queries (total + attempts) regardless of the number of categories — important because the endpoint is called on every SetPickerScreen mount.

### D2: shapeDescriptor.js is the single module for shape extraction

All shape extraction logic (FR-029–FR-031) lives in `server/shapeDescriptor.js`. Exports:
- `descriptorForPuzzle(puzzle)` → `{ orientation, subtype, col_zone, row_zone }` — extracts shape from stored metadata or board analysis. Always constructs its own `Board` internally for board-replay categories; no external board parameter needed.
- `serialize(descriptor)` → `string` — canonical deterministic serializer
- `shapeKeyForPuzzle(puzzle)` → `string` — convenience: `serialize(descriptorForPuzzle(puzzle))`

Board-replay categories (immediate_threat, forced_block, double_threat, forbidden_columns, claimeven, claimodd, odd_even_threat) construct `new Board(puzzle.move_string)` internally. Categories with stored metadata (z_threat, undercut, overcut, figure_7, j_shape) read from `puzzle.highlight_metadata`. forced_win reads from `puzzle.highlight_cells` with board-replay fallback when NULL.

### D3: Serializer MUST be order-independent (load-bearing decision)

The `serialize` function must produce identical output for identical descriptors regardless of JS engine key-insertion order. Implementation:
1. Sort keys alphabetically with `Object.keys(descriptor).sort()`
2. For each key: format as `key=value`
3. Join with `|`
4. For nested object values (e.g., double_threat arm descriptors), recursively serialize and wrap in `(...)`

```js
function serialize(obj) {
  return Object.keys(obj).sort().map(k => {
    const v = obj[k];
    if (v !== null && typeof v === 'object') return `${k}=(${serialize(v)})`;
    return `${k}=${v}`;
  }).join('|');
}
```

**A unit test MUST verify**: `serialize({orientation: "H", subtype: "run3"}) === serialize({subtype: "run3", orientation: "H"})`.

All four fields (orientation, subtype, col_zone, row_zone) are always present in the output, even when null. Example with null fields: `col_zone=left|orientation=null|row_zone=low|subtype=null`.

### D4: DRAW endpoint switches to position-based ordering (NO serve-time algorithm)

`GET /api/puzzles/draw` replaces `Math.random() - 0.5` shuffle with `ORDER BY position ASC` and adds `WHERE position IS NOT NULL`. No shape comparison, no heap, no greedy algorithm at serve time — the reorder is purely curation-time.

- Oversampling (`n * 4` limit) is removed; exact `n` puzzles in position order.
- The shuffle is removed; the round-robin positions already guarantee no adjacent same-shape.
- Resume path is unchanged: re-fetches by stored `puzzle_ids` in original order (which was position-ordered at draw time).
- `mixed` category: interleave from per-category position-ordered pools (each category's puzzles are already in round-robin order; interleaving categories preserves intra-category adjacency guarantees).

### D5: Reindex is localhost-only, admin-only (intentional auth split)

`POST /api/admin/puzzles/reindex` uses `requireLocalhost` (matching all other POST/PUT/DELETE admin endpoints). The existing `GET /api/admin/puzzles` uses `requireAdmin` (broader access pattern for reads). Both checks pass on localhost where the curation tool runs. The plan MUST NOT "unify" these — get should remain `requireAdmin`, reindex must remain `requireLocalhost`.

### D6: forced_win shape extraction uses stored highlight_cells or board-replay fallback

For puzzles approved AFTER the migration: `puzzles.highlight_cells` is populated from `candidates.highlight_cells` during approval. The shape extractor reads it directly — no board replay.

For puzzles approved BEFORE the migration: `puzzles.highlight_cells` is NULL. During reindex, the shape extractor computes via board replay using `Board` class + `computeForcedWinHighlight(move_string, [correctCol])`. This is acceptable because reindex is infrequent (admin operation), not draw-time. The `computeForcedWinHighlight` function accepts a movestring and an array of correct columns — it does not require the candidate row.

### D7: No per-puzzle progress query in draw endpoint

Progress data (challenge-progress) and puzzle data (draw) are independent endpoints. The draw endpoint does not need to know whether the user has attempted each puzzle. SetPickerScreen calls the progress endpoint separately before draw, not bundled into the draw call.

## Data Model / Migration

### Migration 044: `shape_key`, `position`, `highlight_cells`

**File**: `server/migrations/044_shape_key_position.sql`

```sql
-- 044_shape_key_position.sql
-- Add shape_key, position, and highlight_cells columns to puzzles table
-- HUMAN REVIEW REQUIRED before applying to production.

ALTER TABLE public.puzzles
  ADD COLUMN IF NOT EXISTS shape_key TEXT,
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS highlight_cells JSONB;

-- Frontend anon/authenticated roles need SELECT on new columns for the draw endpoint
-- (server reads via service_role, but future-proofing)
GRANT SELECT (shape_key, position, highlight_cells) ON public.puzzles TO anon, authenticated;

-- Service role needs full access
GRANT SELECT, INSERT, UPDATE ON public.puzzles TO service_role;
```

**Notes**:
- `shape_key TEXT` — category-specific shape bucket identifier, nullable (NULL until reindex runs)
- `position INTEGER DEFAULT NULL` — global round-robin index within the category, NULL means unindexed
- `highlight_cells JSONB` — same shape as `candidates.highlight_cells`: `[{ column: int, row: int, role: string }]`, nullable
- No DEFAULT on shape_key (stays NULL until reindex); position defaults to NULL
- `ADD COLUMN IF NOT EXISTS` for idempotency
- Explicit GRANTs follow migration 012 / 040 pattern
- Index on `(category, position)` is deferred: the query volume doesn't justify it; `position` is only used in ORDER BY for draws limited to n≤8 from a per-category pool. Add later if performance data shows need.

### Update candidate approval to copy highlight_cells

In `POST /api/admin/candidates/:id/approve` (line 2487), add to the `.insert()` call:
```js
highlight_cells: candidate.highlight_cells ?? null,
```

Also add `highlight_cells` to the candidate `.select()` on line 2467:
```js
.select('id, category, move_string, status, highlight_metadata, correct_col, category_evidence, highlight_cells')
```

Same for `approve-batch` endpoint.

### Update draw endpoint SELECT to include new columns

Add `shape_key, highlight_cells` to the SELECT in `GET /api/puzzles/draw`:
```js
.select('id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player, shape_key, highlight_cells')
```

And in the resume re-fetch SELECT (line 1115):
```js
.select('id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player, shape_key, highlight_cells')
```

**Note**: `position` is not selected — it's only used for ORDER BY, not needed client-side.

## API Contracts

### `GET /api/user/challenge-progress`

- **Auth**: required (401 if `req.user` is null)
- **Response** (200):
  ```json
  {
    "progress": {
      "immediate_threat": { "attempted": 8, "correct": 6, "total": 10, "accuracy": 0.75, "cleared": false },
      "forced_win": { "attempted": 5, "correct": 5, "total": 5, "accuracy": 1.0, "cleared": true }
    }
  }
  ```
- **Implementation**: Registered in `registerUserRoutes()` in `server/userRoutes.js` (all 14 existing `/api/user/*` endpoints live there; adding progress there keeps the module pattern consistent and testable in isolation). Uses `requireAuth` guard: `if (!req.user) return res.status(401).json({ error: 'Authentication required' })`.
- **Query pattern** (see D1): Two queries — one for total active puzzle counts per category, one for user attempts per category (joining puzzle_attempts to puzzles to get category). Merge in JS, fill CHALLENGE_SETS defaults.

### `POST /api/admin/puzzles/reindex`

- **Auth**: localhost-only (`requireLocalhost`)
- **Body**: `{ category: string }`
- **Validation**: Must be in `VALID_CATEGORIES` (Set from `server/categories.js`). Returns 400 for invalid category including `'mixed'` (pseudo-category, checked first).
- **Processing**:
  1. Fetch all active puzzles in category with `id, move_string, highlight_metadata, correct_col, highlight_cells, shape_key`
  2. For each puzzle, compute shape_key via `shapeKeyForPuzzle(puzzle)` — replay board if needed
  3. Group by shape_key, shuffle within groups, round-robin assign positions
  4. Batch UPDATE all puzzles in a single transaction
- **Response** (200): `{ category: "immediate_threat", indexed: 50, shapeGroups: 8 }`
- **Empty category**: `{ category: "immediate_threat", indexed: 0, shapeGroups: 0 }` (200, not 404)
- **claimodd with zero puzzles**: silently returns indexed: 0 (FR-034)

### Modified: `GET /api/puzzles/draw`

Changes from current behavior:
- Single-category: `ORDER BY position ASC` + `.not('position', 'is', null)` + exact `.limit(n)` (remove oversampling and shuffle)
- mixed: per-category position-ordered sub-queries, interleave by position index
- Draw returns empty array when position IS NULL for all puzzles in category (FR acceptance scenario 2)
- `highlight_cells` included in response fields

### Modified: `POST /api/admin/candidates/:id/approve`

- SELECT now includes `highlight_cells`
- INSERT now includes `highlight_cells: candidate.highlight_cells ?? null`

## Component & Module Breakdown

### New: `server/shapeDescriptor.js`

**Exports**:

```js
// Zone bucketing helpers (shared, private to module)
function bucketColZone(col)  // 0-1 → 'left', 2-4 → 'center', 5-6 → 'right'
function bucketRowZone(row) // 0-1 → 'low', 2-3 → 'mid', 4-5 → 'high'

// Descriptor extraction — main function
function descriptorForPuzzle(puzzle) → { orientation, subtype, col_zone, row_zone }

// Serializer
function serialize(descriptor) → string

// Convenience
function shapeKeyForPuzzle(puzzle) → string
```

**Internal dispatch** (within `descriptorForPuzzle`):

| Category | Source | Derivation |
|---|---|---|
| immediate_threat | Board replay | Winning window via board analysis |
| forced_block | Board replay | Opponent's winning window via board analysis |
| double_threat | Board replay | Two arm descriptors from resulting threat cells |
| forbidden_columns | Board replay | col_zone + row_zone only; orientation/subtype null |
| odd_even_threat | Board replay | col_zone + row_zone only |
| claimeven | Board replay | col_zone + row_zone only |
| claimodd | Board replay | col_zone + row_zone only |
| z_threat | highlight_metadata | Capsule column + midpoint row |
| undercut | highlight_metadata | killing_threat cell |
| overcut | highlight_metadata | major_threat cell |
| figure_7 | highlight_metadata | 4-cell pattern_piece centroid |
| j_shape | highlight_metadata | 3-cell spine column + lower row |
| forced_win | highlight_cells | hint→loser→hint→loser→winner sequence |

**Board replay categories**: immediate_threat, forced_block, double_threat, forbidden_columns, claimeven, claimodd, odd_even_threat. These call `new Board(puzzle.move_string)` and analyze the position after `correct_col` is played.

**double_threat special case**: Returns a two-arm descriptor. Each arm is `{ orientation, subtype, col_zone, row_zone }`. Arms are sorted by col_zone then row_zone then orientation then subtype. The top-level descriptor is `{ arm1: {...}, arm2: {...} }` — a nested object that `serialize()` handles recursively.

**forced_win orientation**: From highlight_cells[0] and highlight_cells[4] column comparison:
- cells[0].col === cells[4].col → `'returning'`
- cells[0].col < cells[4].col → `'ascending'`
- cells[0].col > cells[4].col → `'descending'`

**forced_win fallback** (pre-migration puzzles, highlight_cells is NULL):
```js
import { computeForcedWinHighlight } from './candidate-generator.js';
const cells = computeForcedWinHighlight(puzzle.move_string, [puzzle.correct_col]);
// Then derive descriptor from cells as above
```

### New: `GET /api/user/challenge-progress` handler

Registered in `registerUserRoutes()` in `server/userRoutes.js`, alongside all other `/api/user/*` endpoints. This keeps the module pattern consistent (14 existing user endpoints live there) and makes the handler testable in isolation. The `registerUserRoutes()` call at line 193 of `index.js` runs before the `GET /api/puzzles/:id` wildcard route at line 1755, so no Express first-match ordering issue exists.

### Modified: `GET /api/puzzles/draw` handler

Replace oversampling + shuffle with position-based ordering:
```js
// Before (current):
.limit(n * 4)
// shuffle in JS: .sort(() => Math.random() - 0.5).slice(0, n)

// After:
.not('position', 'is', null)
.order('position', { ascending: true })
.limit(n)
```

For `mixed` category: iterate `position` index 0..n-1 across CATEGORY_ORDER pools, pick one puzzle per index, interleave.

### Modified: `src/components/SetCard.jsx`

**New props**:
| Prop | Type | Required | Description |
|---|---|---|---|
| `progress` | `{ attempted, correct, total, accuracy, cleared }` | No | Progress data for authenticated users; undefined/null = unauthenticated |
| `isAuthenticated` | `boolean` | Yes | Whether to render progress UI |

**New visual elements** (when `isAuthenticated && progress`):
1. **Progress bar**: thin horizontal bar, width proportional to `correct / total`. Color: `var(--ink)`. Empty track: `var(--line)`.
2. **Accuracy bar**: thin horizontal bar below progress bar, width proportional to `accuracy`. Color: green (#4caf50) >= 80%, yellow (#ffc107) 50-79%, red (#f44336) < 50%. NOT rendered when `attempted === 0`.
3. **Cleared badge**: when `cleared === true`, a checkmark icon on the right side with green tinted border or background.

Existing elements (stars, positionCount, title, chevron) remain unchanged.

**i18n keys needed**:
- `setcard.progress` — aria-label or tooltip for progress bar
- `setcard.cleared` — alt text for cleared checkmark

### Modified: `src/screens/SetPickerScreen.jsx`

**Changes**:
1. Import `useStore` to get `isAuthenticated`
2. Fetch `GET /api/user/challenge-progress` after `GET /api/puzzles/counts` (in parallel with `Promise.all`)
3. Pass `progress={progress[set.slug]}` and `isAuthenticated={isAuthenticated}` to each SetCard
4. Skip progress fetch when not authenticated (early exit in useEffect)

### Modified: `src/components/CandidateDashboard.jsx`

**Changes**:
1. Add per-category **"Reindex" button** in the category row UI. Calls `POST /api/admin/puzzles/reindex` with `{ category }`. Shows feedback: `{ indexed: N, shapeGroups: M }`.
2. Add **unindexed warning** badge when `GET /api/admin/candidates/stats` response includes `unindexed_count > 0` per category. The stats endpoint must be updated server-side to include this field.
3. Button disabled state: while reindex is in flight, prevent double-clicks.

### Updated: `GET /api/admin/candidates/stats`

Add `unindexed_count` per category to the response:
```json
{ "categories": [{ "category": "immediate_threat", "unindexed_count": 50, ... }] }
```

Computed as: `SELECT COUNT(*) FROM puzzles WHERE category = $1 AND is_active = true AND position IS NULL`.

## Implementation Tasks

Tasks are ordered within each phase by dependency. Phases are ordered by the build chain.

### Phase 0: Data Foundation (prerequisite for almost everything)

**T001**: Create migration `044_shape_key_position.sql`
- Adds shape_key TEXT, position INTEGER DEFAULT NULL, highlight_cells JSONB
- GRANT SELECT on new columns to anon, authenticated
- GRANT SELECT, INSERT, UPDATE on puzzles to service_role
- Run `node server/migrate.js` to apply locally

**T002**: Update candidate approval to copy highlight_cells
- Add `'highlight_cells'` to candidate `.select()` in single-approve endpoint (line 2467)
- Add `highlight_cells: candidate.highlight_cells ?? null` to puzzle `.insert()` (line 2487)
- Same changes for approve-batch endpoint (lines 2526, 2535)

### Phase 1: Shape Descriptor Module (prerequisite for reindex)

**T003**: Create `server/shapeDescriptor.js`
- `bucketColZone(col)`, `bucketRowZone(row)` helpers
- `serialize(descriptor)` — canonical serializer with sorted keys
- `descriptorForPuzzle(puzzle)` — dispatches per category
- Storage-metadata categories: z_threat, undercut, overcut, figure_7, j_shape → from highlight_metadata
- Board-replay categories: immediate_threat, forced_block, double_threat, forbidden_columns, claimeven, claimodd, odd_even_threat → Board analysis
- forced_win: from highlight_cells, with board-replay fallback when NULL
- `shapeKeyForPuzzle(puzzle)` convenience export

**T004**: Write unit tests for `shapeDescriptor.js`
- `tests/unit/shapeDescriptor.test.js` with node:test
- Test serializer determinism: same descriptor, different key order → same output
- Test each category derivation against known fixture puzzles
- Test forced_win fallback path (supply move_string but NULL highlight_cells)
- Test double_threat nested serialization
- Add to `test` and `test:fast` scripts in package.json

### Phase 2: Reindex Endpoint (prerequisite for draw change)

**T005**: Create `POST /api/admin/puzzles/reindex` endpoint
- `requireLocalhost` middleware
- Validate category against VALID_CATEGORIES
- Fetch active puzzles with all needed fields (move_string, highlight_metadata, correct_col, highlight_cells)
- For each puzzle: compute shape_key via `shapeKeyForPuzzle()`
- Group by shape_key (preserve first-seen order), shuffle within groups
- Assign round-robin positions using FR-018 formula
- Batch UPDATE in single transaction (or sequential UPDATEs — no transaction API in supabase-js)
- Return `{ category, indexed, shapeGroups }`

**T006**: Update `GET /api/admin/candidates/stats` to include `unindexed_count`
- Add subquery or separate query counting `position IS NULL AND is_active = true` per category
- Return as `unindexed_count` field per category entry

**T007**: Add reindex button + unindexed warning to CandidateDashboard
- "Reindex" button per category row
- Calls `POST /api/admin/puzzles/reindex` with `{ category }`
- Shows result feedback (indexed count, shape group count)
- Disables button during in-flight request
- Orange warning badge when `unindexed_count > 0`

### Phase 3: Draw Endpoint Switch

**T008**: Update `GET /api/puzzles/draw` to position-based ordering
- Single category: `.not('position', 'is', null).order('position', { ascending: true }).limit(n)`
- Remove oversampling (n*4) and Math.random shuffle
- mixed: interleave from per-category position-ordered pools
- Add `highlight_cells` to SELECT
- Resume path unchanged (already re-fetches by stored puzzle_ids)

**T009**: Update draw endpoint SELECT to include new columns
- Add `shape_key, highlight_cells` to SELECT in both fresh-draw and resume-re-fetch paths

### Phase 4: Progress API + UI (independent of Phases 1–3)

**T010**: Create `GET /api/user/challenge-progress` endpoint
- Auth-required (401 if no req.user)
- Two SQL queries: attempt counts per category, total puzzle counts per category
- Merge and fill defaults from CHALLENGE_SETS
- Return `{ progress: { [slug]: { attempted, correct, total, accuracy, cleared } } }`
- Registered in `registerUserRoutes()` in `server/userRoutes.js` (alongside all existing `/api/user/*` endpoints)

**T011**: Update SetCard component
- New props: `progress`, `isAuthenticated`
- Progress bar: width = `correct / total`, color ink, track line
- Accuracy bar: width = `correct / attempted`, color-encoded (green/yellow/red), hidden when `attempted === 0`
- Cleared badge: checkmark with green styling when `cleared === true`
- No numeric text anywhere — purely visual indicators
- Authenticated but no progress data: show empty progress bar, no accuracy bar

**T012**: Update SetPickerScreen
- Import `useStore()` to get `isAuthenticated`
- Fetch progress from `GET /api/user/challenge-progress` when authenticated
- Pass `progress` and `isAuthenticated` to each SetCard
- Parallel fetch: counts + progress via `Promise.all` when authenticated

**T013**: Add i18n keys for progress UI
- `setcard.progress` — "Puzzle progress" (en.json and es.json)
- `setcard.cleared` — "Cleared" (en.json and es.json)

### Phase 5: Verification

**T014**: Write integration tests
- `tests/integration/challenge-progress.test.js` — node:test, stub supabase
  - Returns 401 for unauthenticated
  - Returns correct progress shape for user with attempts
  - Returns defaults for CHALLENGE_SETS categories with no data
  - Returns correct cleared boolean
- `tests/integration/puzzles-reindex.test.js` — node:test, stub supabase
  - Returns 403 for non-localhost
  - Returns 400 for invalid category
  - Returns correct shape { category, indexed, shapeGroups }
  - Handles empty category (indexed: 0)
  - Handles claimodd with zero puzzles (indexed: 0, not error)

**T015**: Run existing test suite
- `npm run test:fast` must pass with no regressions
- Manual verification: approve a forced_win candidate and confirm puzzles.highlight_cells is populated
- Manual verification: run reindex on a category, draw puzzles, confirm no consecutive same shape_key

## Testing Strategy

**Unit tests** (`node:test`):
- `tests/unit/shapeDescriptor.test.js` — serializer determinism, per-category descriptor extraction, nested serialization, forced_win fallback
- These test pure functions — no Express, no Supabase, no solver needed for serializer tests. Board-replay tests need real move_strings from fixtures.

**Integration tests** (`node:test` with stubs):
- `tests/integration/challenge-progress.test.js` — auth gates, response shape, ownership enforcement
- `tests/integration/puzzles-reindex.test.js` — auth gates, validation, response shape

**Pattern for integration tests**: Extract thin handler functions, test with stub supabase clients following `insertGameBlunder.test.js` pattern. Mock supabase `.from()` chain returning controlled data.

**Manual verification**:
- Approve forced_win candidate → verify puzzles.highlight_cells column populated
- Run reindex on immediate_threat → verify no consecutive same-shape in draw
- Authenticated SetPickerScreen → verify progress bars, accuracy bars, cleared badge render correctly
- Unauthenticated SetPickerScreen → verify no progress UI (current behavior preserved)

**Test file additions to package.json**:
```json
"test:fast": "... tests/unit/shapeDescriptor.test.js tests/integration/challenge-progress.test.js tests/integration/puzzles-reindex.test.js",
"test": "... tests/unit/shapeDescriptor.test.js tests/integration/challenge-progress.test.js tests/integration/puzzles-reindex.test.js"
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| shapeDescriptor board replay is slow for large categories (100+ puzzles) | Medium | Medium | Reindex is admin-only, localhost-only, infrequent. SC-003 target (100 puzzles < 3s) is achievable with board analysis only (no solver calls needed for descriptor extraction). Board replay uses existing `Board` class — pure JS, no IPC. |
| forced_win pre-migration backfill fails on edge cases | Low | Low | `computeForcedWinHighlight` already handles empty correctCols (returns []). If fallback produces empty cells, shape_key will be `col_zone=null|orientation=null|row_zone=null|subtype=null` — a valid but non-descriptive key. These puzzles will be grouped together, satisfying the algorithm but not maximizing variety. |
| Draw endpoint returns empty when no reindex has been run | Medium (by design) | Low | This is the intended behavior — FR acceptance scenario 2 requires it. The curation tool warning badge (FR-022) ensures admins know to reindex before users hit empty draws. |
| Resume path breaks after position-based reorder | Low | Medium | Resume re-fetches by stored puzzle_ids in original order. If puzzles were deactivated since session creation, they're filtered out by `is_active` check. The remaining puzzles maintain their original relative order. No change needed. |
| Nested serialize() for double_threat produces different keys than expected | Low | Low | The serializer handles nested objects generically — any object value is recursively serialized. The FR-015a examples use `arm1`/`arm2` keys which will be sorted alphabetically by the serializer. |
