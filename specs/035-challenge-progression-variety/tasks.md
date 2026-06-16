# Tasks: Challenge Progression & Variety

**Input**: Design documents from `/specs/035-challenge-progression-variety/`
**Prerequisites**: plan.md (✓), spec.md (✓)

**Organization**: Tasks are grouped by phase following the build chain in plan.md. Phase 4 (Progress API + UI) is fully independent of Phases 1–3 and can begin at any time.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 0: Data Foundation (Prerequisite for almost everything)

**Purpose**: Migration 044 adds the three new columns. Candidate approval must copy highlight_cells starting immediately — otherwise newly approved forced_win puzzles will have NULL highlight_cells, forcing unnecessary board-replay fallbacks.

- [ ] T001 [P] [US2] Create and apply migration `044_shape_key_position.sql` in `connect-four/server/migrations/`. Add three columns to `public.puzzles`: `shape_key TEXT`, `position INTEGER DEFAULT NULL`, `highlight_cells JSONB`. Include `ADD COLUMN IF NOT EXISTS` for idempotency. Add explicit GRANT statements: `GRANT SELECT (shape_key, position, highlight_cells) ON public.puzzles TO anon, authenticated;` and `GRANT SELECT, INSERT, UPDATE ON public.puzzles TO service_role;`. Run `node server/migrate.js` from `connect-four/` to apply locally. Do NOT add an index on `(category, position)` — the query volume doesn't justify it (plan.md rationale).

- [ ] T002 [US3] Update candidate approval to copy `highlight_cells` from candidates to puzzles in `connect-four/server/index.js`. In `POST /api/admin/candidates/:id/approve` (line 2467): add `'highlight_cells'` to the `.select()` call. At line 2487: add `highlight_cells: candidate.highlight_cells ?? null` to the `.insert()` call. Apply the same two changes to `POST /api/admin/candidates/approve-batch` (lines 2528, 2552). Verify: approve a forced_win candidate, then query `SELECT highlight_cells FROM puzzles WHERE id = <new_id>` — the column must be non-null with the 5-cell role array.

**Checkpoint**: Migration applied, three new columns exist on puzzles. Newly approved forced_win puzzles carry highlight_cells. Old puzzles have NULL for all three new columns.

---

## Phase 1: Shape Descriptor Module (Prerequisite for reindex)

**Purpose**: `server/shapeDescriptor.js` is the single module for shape extraction (FR-029–FR-031). Every category's derivation logic lives here. The module is pure JS — no Express, no Supabase, no solver IPC. Board-replay categories use the existing `Board` class.

**⚠️ CRITICAL**: Phases 2–3 cannot proceed until this module exists and has passing tests.

- [ ] T003 [US2] Create `connect-four/server/shapeDescriptor.js` with the following exports:
  1. `bucketColZone(col)` — 0-1 → `'left'`, 2-4 → `'center'`, 5-6 → `'right'`
  2. `bucketRowZone(row)` — 0-1 → `'low'`, 2-3 → `'mid'`, 4-5 → `'high'`
  3. `serialize(descriptor)` — canonical deterministic serializer: sort keys alphabetically with `Object.keys(obj).sort()`, format each as `key=value`, join with `|`. For nested object values, recursively serialize and wrap in `(...)`. All four fields (orientation, subtype, col_zone, row_zone) must appear in output even when null. See FR-015a for the serialization contract.
  4. `descriptorForPuzzle(puzzle)` — dispatches per `puzzle.category`:
     - **Storage-metadata categories** (z_threat, undercut, overcut, figure_7, j_shape): derive from `puzzle.highlight_metadata` without board replay. Follow the per-category derivation rules in spec.md Appendix A exactly.
     - **Board-replay categories** (immediate_threat, forced_block, double_threat, forbidden_columns, claimeven, claimodd, odd_even_threat): construct `new Board(puzzle.move_string)` internally. For immediate_threat/forced_block: play `correct_col`, find the winning 4-window(s), derive orientation/subtype/col_zone/row_zone. For double_threat: find both resulting threat cells, compute one arm descriptor per cell, sort arms by col_zone then row_zone then orientation then subtype, return `{ arm1: {...}, arm2: {...} }`. For forbidden_columns/odd_even_threat/claimeven/claimodd: orientation=null, subtype=null, col_zone=bucket(correct_col), row_zone=bucket(landing row).
     - **forced_win**: read from `puzzle.highlight_cells` (cells[0] and cells[4] column comparison for orientation). When `puzzle.highlight_cells` is NULL, fall back to board replay: `import { computeForcedWinHighlight } from './candidate-generator.js'`, call with `(puzzle.move_string, [puzzle.correct_col])`, derive descriptor from the resulting cells.
  5. `shapeKeyForPuzzle(puzzle)` — convenience: `serialize(descriptorForPuzzle(puzzle))`

  **double_threat arm descriptor**: Each arm is `{ orientation, subtype, col_zone, row_zone }` computed via the same logic as immediate_threat for that threat cell's winning window. The top-level descriptor object is `{ arm1: {...}, arm2: {...} }`. The serializer handles nested objects generically — any object value triggers recursive `(...)` wrapping.

  **figure_7 derivation** (from spec.md Appendix A):
  - Anchor = the cell at a row not shared with any other cell
  - Junction = the cell in the horizontal group whose column is closest to anchor's column
  - orientation = `'D↗'` if junction.col > anchor.col, `'D↘'` if junction.col < anchor.col
  - col_zone = bucket(centroid column of all 4 cells, rounded)
  - row_zone = bucket(centroid row of all 4 cells, rounded)

  **j_shape derivation** (from spec.md Appendix A):
  - Spine cells = the two cells sharing the same column (rows r and r+2)
  - Bridge cell = remaining cell (col = spine_col ± 1, row = r+1)
  - orientation = `'canonical'` if bridge.col > spine_col, `'mirror'` if bridge.col < spine_col
  - col_zone = bucket(spine column), row_zone = bucket(lower spine row r)

- [ ] T004 [US2] Write unit tests for `shapeDescriptor.js` at `connect-four/tests/unit/shapeDescriptor.test.js` using `node:test`.
  1. **Serializer determinism**: `serialize({orientation: "H", subtype: "run3", col_zone: "center", row_zone: "mid"})` must equal `serialize({subtype: "run3", col_zone: "center", row_zone: "mid", orientation: "H"})` — different JS key insertion order produces identical output.
  2. **Null field inclusion**: verify that `serialize({orientation: null, subtype: null, col_zone: "left", row_zone: "low"})` produces `col_zone=left|orientation=null|row_zone=low|subtype=null` (all four keys present, alphabetically sorted).
  3. **Nested serialization**: verify that a double_threat descriptor with two arms serializes correctly with parenthesized nested values, e.g., `arm1=(col_zone=left|orientation=H|row_zone=mid|subtype=run3)|arm2=(col_zone=right|orientation=V|row_zone=low|subtype=gap)`.
  4. **Per-category extraction**: test at least one fixture puzzle per category (use move_strings from `tests/predicates/fixtures/fixtures.json` or from the knowledge base). Verify descriptor output fields match expected values.
  5. **forced_win fallback**: supply a forced_win puzzle with NULL highlight_cells — verify the descriptor is computed via board replay and produces valid orientation/col_zone/row_zone.
  6. **Edge cases**: empty highlight_cells (forced_win fallback returns null fields), forced_win with only 1 correct_col, double_threat with same-col_zone arms.
  Add `tests/unit/shapeDescriptor.test.js` to both `test` and `test:fast` scripts in `connect-four/package.json`.

**Checkpoint**: `shapeDescriptor.js` exists with passing unit tests. All 14 categories can produce a shape_key. The serializer is proven order-independent.

---

## Phase 2: Reindex Endpoint + Curation Tool UI (Prerequisite for draw change)

**Purpose**: The reindex endpoint assigns position values. The curation tool gains a reindex button and unindexed warning badge. Without this, position stays NULL and the draw endpoint returns empty (by design — FR acceptance scenario 2).

- [ ] T005 [US4] Create `POST /api/admin/puzzles/reindex` in `connect-four/server/index.js`. Use `requireLocalhost` middleware (matching the existing pattern at line 2265+). Validate `req.body.category` against `VALID_CATEGORIES` (Set from `server/categories.js`). Reject `'mixed'` with 400 (pseudo-category). Processing:
  1. Fetch all active puzzles in the category: `.select('id, move_string, highlight_metadata, correct_col, highlight_cells').eq('category', category).eq('is_active', true)`
  2. For each puzzle, compute `shape_key` via `shapeKeyForPuzzle(puzzle)` from `shapeDescriptor.js`
  3. Group puzzles by shape_key (preserve first-seen order of group keys)
  4. Shuffle within each group using `Math.random() - 0.5` sort
  5. Assign round-robin positions using the formula from Appendix B: `position = groupIndex + sortedGroupPosition * numGroups`
  6. Batch UPDATE all puzzles: iterate rows and call `.update({ shape_key, position }).eq('id', id)` sequentially (supabase-js has no transaction API; sequential updates are acceptable for admin-only localhost operation)
  7. Return `{ category, indexed: <count of puzzles updated>, shapeGroups: <number of distinct shape_keys> }`
  Edge cases: empty category returns `{ indexed: 0, shapeGroups: 0 }` (200, not 404). claimodd with zero puzzles: silently returns indexed: 0 (FR-034). All puzzles with same shape_key: one group, sequential positions — no error.

- [ ] T006 [US4] Update `GET /api/admin/candidates/stats` in `connect-four/server/index.js` (line 2313) to include `unindexed_count` per category. For each category in the stats response, query: `supabase.from('puzzles').select('id', { count: 'exact' }).eq('category', cat).eq('is_active', true).is('position', null)` to get the count. Add `unindexed_count` as a field in each category entry object returned to the frontend. This task is independent of T005 (no reindex endpoint needed to count NULL positions).

- [ ] T007 [US4] Add reindex button and unindexed warning badge to `connect-four/src/components/CandidateDashboard.jsx`:
  1. **Unindexed warning**: In the category row (inside the `<Fragment key={row.category}>` around line 135), add an orange badge next to the category name when `row.unindexed_count > 0`. Style: small pill with orange background (`#ff9800`), white text, showing the count. Tooltip: "Puzzles need reindexing".
  2. **Reindex button**: Add a button (label: "Reindex") in the Actions cell for each category row. On click: call `POST /api/admin/puzzles/reindex` with `{ category: row.category }`. Show loading state while in-flight (disable button, show "…"). On success: display a brief toast/alert with `{ indexed: N, shapeGroups: M }`, then call `loadStats()` to refresh unindexed_count. On error: alert the error message.
  3. **Button styling**: Use a neutral style (not red/green like Generate/Approve) — e.g., border: `1.5px solid var(--border)`, background: transparent, color: `var(--text)`. Position: add it before the "Approved (N)" button in the action button row (around line 170).
  4. **Reindex state**: Track `reindexLoading` per-category with `useState({})` to prevent double-clicks.

**Checkpoint**: Admin can reindex a category from the curation tool. Unindexed categories show a warning badge. After reindex, all active puzzles have non-null `shape_key` and `position`.

---

## Phase 3: Draw Endpoint Switch

**Purpose**: Replace random shuffle with position-based ordering. After this, the draw endpoint enforces the shape-variety guarantee (no consecutive same-shape within a draw).

- [ ] T008 [US2] Update `GET /api/puzzles/draw` in `connect-four/server/index.js` (lines 1052–1142) to position-based ordering:
  1. **Single-category** path (else branch, line 1089): Replace the `.limit(n * 4)` + `Math.random() - 0.5` shuffle + `.slice(0, n)` with position-based ordering + random offset:
	     a. First query: `SELECT count(*)` of active puzzles with non-null position in the category to get `totalIndexed`.
	     b. Compute `offset = Math.floor(Math.random() * Math.max(0, totalIndexed - n + 1))`.
	     c. Fetch puzzles: `.not('position', 'is', null).order('position', { ascending: true }).range(offset, offset + n - 1)`.
	     d. If fewer than `n` puzzles returned (near-end scenario where `totalIndexed - offset < n`), fill the remainder by wrapping around: fetch from position 0 via `.range(0, n - result.length - 1)`. Concat and deduplicate (position-based dedup is sufficient).
	     e. Remove the `shuffled` variable — the result is already in (wrapped) draw order.
  2. **Mixed category** path (line 1077): Replace oversampling + shuffle with an interleaving algorithm:
     - For each category in `CATEGORY_ORDER`, fetch active puzzles ordered by position ASC: `.select('...').eq('category', cat).eq('is_active', true).not('position', 'is', null).order('position', { ascending: true }).limit(n)`
     - Interleave: iterate `posIdx` from 0 to n-1, for each `catIdx` from 0 to CATEGORY_ORDER.length-1, if `posIdx < pool[catIdx].length`, push `pool[catIdx][posIdx]` to result. Stop when result length reaches n.
  3. **SELECT columns**: In BOTH the single-category path and the mixed-category sub-queries, add `shape_key, highlight_cells` to the `.select()` string. Also in the resume re-fetch path (line 1115): add `shape_key, highlight_cells` to its `.select()`.
  4. **Resume path** (lines 1111–1121): Unchanged logic — still re-fetches by stored `puzzle_ids` and restores original order. Only add new columns to SELECT.
  5. No other changes to session creation, advance, or anonymous paths.

**Checkpoint**: Drawing puzzles from a reindexed category returns puzzles in position order with no consecutive same-shape. Each session sees a different random offset into the global position sequence. Drawing from an un-reindexed category returns an empty array (by design).

---

## Phase 4: Progress API + UI (Independent of Phases 1–3)

**Purpose**: SetCard progress bars, accuracy bars, and cleared badges. This workstream touches only `userRoutes.js`, `SetPickerScreen.jsx`, `SetCard.jsx`, and i18n files. It can be developed and tested independently of the shape-reordering work.

- [ ] T009 [US1] Create `GET /api/user/challenge-progress` endpoint. Register it inside `registerUserRoutes()` in `connect-four/server/userRoutes.js` (alongside all 14 existing `/api/user/*` endpoints — this keeps the module pattern consistent). Use the existing `requireUser(req, res)` guard (returns 401 if no session). Implementation follows plan.md D1:
  1. **Query 1 — total active puzzles per category**: `supabase.from('puzzles').select('category, id').eq('is_active', true).in('category', CHALLENGE_SETS_CATEGORIES)`. Iterate rows in JS to build a map `{ [category]: count }`.
  2. **Query 2 — user attempts per category**: `supabase.from('puzzle_attempts').select('puzzle_id, first_attempt_correct, puzzles!inner(category)').eq('user_id', req.user.id)`. The `puzzles!inner(category)` uses PostgREST resource embedding to bring the category along on each row. Filter results in JS to only include rows where the joined puzzle `is_active = true` (the inner join may include attempts on deactivated puzzles if the FK still exists — guard in JS).
  3. **JS merge**: Build an attempts map `{ [category]: { attempted: Set<puzzle_id>, correct: Set<puzzle_id where first_attempt_correct=true> } }`. For each category slug in `CHALLENGE_SETS` (from `server/challengeSets.js`): pull total from Query 1 map (default 0), pull attempted/correct set sizes from attempts map (default 0/0), compute `accuracy = attempted > 0 ? correct / attempted : 0`, `cleared = correct >= total && total > 0`. Return `{ progress: { [slug]: { attempted, correct, total, accuracy, cleared } } }`.
  4. Include entries for ALL categories in CHALLENGE_SETS (FR-013), even those with zero active puzzles (total=0). The `CHALLENGE_SETS_CATEGORIES` array should be derived as `CHALLENGE_SETS.map(s => s.slug)`.
  Do NOT import dotenv or parse `.env` manually — the `supabase` client is already passed to `registerUserRoutes`.

- [ ] T010 [US1] Update `connect-four/src/components/SetCard.jsx` to render progress and accuracy UI:
  1. **New props**: `progress` (`{ attempted, correct, total, accuracy, cleared } | undefined`) and `isAuthenticated` (`boolean`).
  2. **When NOT authenticated** (`isAuthenticated === false` or `progress === undefined`): render exactly as today (stars + positionCount + chevron). No progress bars, no accuracy bar, no cleared badge.
  3. **When authenticated with progress**:
     a. **Progress bar**: thin horizontal bar (height: 4px, border-radius: 2px) below the stars row. Background track: `var(--line)`. Fill width: `${(correct / total) * 100}%`. Fill color: `var(--ink)`. When `total === 0`, bar is empty (0% fill).
     b. **Accuracy bar**: below the progress bar, same dimensions. Fill width: `${accuracy * 100}%`. Fill color: green `#4caf50` when `accuracy >= 0.8`, yellow `#ffc107` when `accuracy >= 0.5`, red `#f44336` when `accuracy < 0.5`. Hidden entirely when `attempted === 0` (return null for this element).
     c. **Cleared badge**: when `cleared === true`, show a green checkmark icon (`Icon name="check"`) on the right side, replacing or supplementing the chevron. Use green tinted styling (e.g., a small green circle background).
  4. **NO numeric text** anywhere — purely visual indicators (FR-003).
  5. **i18n**: use `t('setcard.progress')` as aria-label for the progress bar, `t('setcard.cleared')` as alt text for the cleared checkmark.

- [ ] T011 [US1] Update `connect-four/src/screens/SetPickerScreen.jsx` to fetch and pass progress data:
  1. Import `useStore` from `'../store/ProfileStore.jsx'` (already available, returns `{ store, session, supabase }`)
  2. Derive `isAuthenticated = !!session`
  3. When authenticated, fetch `GET /api/user/challenge-progress` (with credentials: `'include'` for the auth cookie). Fetch in parallel with the existing `GET /api/puzzles/counts` call using `Promise.all`. When not authenticated, skip the progress fetch entirely.
  4. Pass `isAuthenticated={isAuthenticated}` and `progress={progressData?.[set.slug]}` to each `<SetCard>` in the `sets.map()`.
  5. Handle fetch errors gracefully: if progress fetch fails, pass `progress={undefined}` so cards render without progress UI (degraded, not broken).

- [ ] T012 [P] [US1] Add i18n keys for progress UI in `connect-four/src/i18n/en.json` and `connect-four/src/i18n/es.json`:
  - `"setcard.progress"`: English "Puzzle progress", Spanish "Progreso del puzzle"
  - `"setcard.cleared"`: English "Cleared", Spanish "Completado"

**Checkpoint**: Authenticated users see progress bars, accuracy bars, and cleared badges on SetPickerScreen. Unauthenticated users see the current (unchanged) SetCards. No numeric text appears in the UI.

---

## Phase 5: Verification

**Purpose**: Integration tests and regression checks. All tests use `node:test` with stubbed supabase clients (following the pattern in `tests/integration/`).

- [ ] T013 [P] [US1] Write integration tests for challenge progress at `connect-four/tests/integration/challenge-progress.test.js` using `node:test`:
  1. Extract the progress handler logic into a thin testable function (following the `insertGameBlunder.test.js` pattern). Mock supabase `.from()` chains returning controlled data.
  2. Test: returns 401 when `req.user` is null.
  3. Test: returns correct progress shape for a user with mixed attempts (some correct, some not).
  4. Test: returns defaults (`{ attempted: 0, correct: 0, accuracy: 0, cleared: false }`) for CHALLENGE_SETS categories with no attempt data.
  5. Test: `cleared` is true when `correct === total && total > 0`.
  6. Test: `cleared` is false when `total === 0` (empty category).
  7. Test: `accuracy` is `correct / attempted` when attempted > 0, 0 when attempted === 0.
  Add to `test:fast` script.

- [ ] T014 [P] [US4] Write integration tests for reindex at `connect-four/tests/integration/puzzles-reindex.test.js` using `node:test`:
  1. Extract the reindex handler logic into a thin testable function. Mock supabase.
  2. Test: returns 403 for non-localhost (mock `req.ip` to non-localhost).
  3. Test: returns 400 for invalid category (including `'mixed'`).
  4. Test: returns correct `{ category, indexed, shapeGroups }` for a category with multiple distinct shapes.
  5. Test: handles empty category (`indexed: 0, shapeGroups: 0`, status 200).
  6. Test: handles claimodd with zero puzzles gracefully (status 200, indexed: 0).
  7. Test: round-robin assigns interleaved positions (verify two puzzles with same shape_key are not consecutive in position order).
  Add to `test:fast` script.

- [ ] T015 Run existing test suite and manual verification:
  1. `cd connect-four && npm run test:fast` — must pass with no regressions.
  2. **Manual**: Approve a forced_win candidate → verify `puzzles.highlight_cells` is populated in DB.
  3. **Manual**: Run reindex on `immediate_threat` category → draw 8 puzzles → confirm no two consecutive puzzles share `shape_key`.
  4. **Manual**: Open SetPickerScreen as authenticated user → verify progress bars, accuracy bars, cleared badge render.
  5. **Manual**: Open SetPickerScreen in incognito (unauthenticated) → verify no progress UI (stars + positionCount only).
  6. **Manual**: Run reindex on a category, then draw with `n=8` → verify draw returns exactly 8 puzzles (not fewer).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (T001–T002)**: No dependencies — start immediately. T001 must complete before T002 (migration must be applied before approval code references the new column).
- **Phase 1 (T003–T004)**: Independent of Phase 0 — can start in parallel. T004 depends on T003 (tests need the module).
- **Phase 2 (T005–T007)**: Depends on Phase 0 (T001) for columns, Phase 1 (T003) for shapeKeyForPuzzle.
  - T005 depends on T001 + T003
  - T006 is independent of T005 but needs T001 (queries new position column)
  - T007 depends on T005 + T006
- **Phase 3 (T008)**: Depends on T001 (position column must exist). Structure change only — can be coded before T005 runs, but acceptance tests need T005 to populate positions.
- **Phase 4 (T009–T012)**: FULLY INDEPENDENT of Phases 1–3. Can start at any time.
  - T009 (progress endpoint) must complete before T011 (SetPickerScreen fetch)
  - T010 (SetCard) and T012 (i18n) are parallel to T009
  - T011 depends on T009
- **Phase 5 (T013–T015)**: Depends on T009 (progress tests) and T005 (reindex tests). T015 depends on all.

### Within Each Phase

```
Phase 0:  T001 ──► T002
Phase 1:  T003 ──► T004
Phase 2:  T001 + T003 ──► T005 ──┐
          T001 ──► T006 ────────► T007
Phase 3:  T001 ──► T008
Phase 4:  T009 ──► T011
          T010 (parallel to T009)
          T012 (parallel to T009, T010, T011)
Phase 5:  T009 ──► T013
          T005 ──► T014
          All ──► T015
```

### Parallel Opportunities

- **Phase 0 + Phase 1 + Phase 4** can all begin simultaneously (different files, no shared state).
- Within Phase 4: T009, T010, and T012 can proceed in parallel (different files).
- Within Phase 5: T013 and T014 can proceed in parallel.
- T008 (draw endpoint switch) can begin after T001 — it does not need T003 or T005 to exist for the code change, though T005 must run before the draw produces non-empty results.

---

## Parallel Example

```bash
# After migration (T001) is applied, these can run concurrently:
Task T002: "Update candidate approval to copy highlight_cells"
Task T003: "Create shapeDescriptor.js"
Task T009: "Create GET /api/user/challenge-progress endpoint"
Task T010: "Update SetCard component"
Task T012: "Add i18n keys"

# After T003 completes:
Task T004: "Write unit tests for shapeDescriptor.js"

# After T001 + T003 complete:
Task T005: "Create POST /api/admin/puzzles/reindex"
Task T006: "Update GET /api/admin/candidates/stats to include unindexed_count"
Task T008: "Update draw endpoint to position-based ordering"

# After T005 + T006 complete:
Task T007: "Add reindex button + unindexed warning to CandidateDashboard"

# After T009 completes:
Task T011: "Update SetPickerScreen to fetch and pass progress"
Task T013: "Write integration tests for challenge progress"

# After T005 completes:
Task T014: "Write integration tests for reindex"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 0 T001 (migration) — unblocks everything
2. Complete Phase 4 (T009–T012) — Progress API + UI ships independently
3. **STOP and VALIDATE**: Test SetPickerScreen with authenticated and unauthenticated users
4. Proceed to shape-work if US1 passes

### Shape Variety Second (User Stories 2–4)

1. Complete Phase 0 T002 (candidate approval)
2. Complete Phase 1 (T003–T004) — shape descriptor module with tests
3. Complete Phase 2 (T005–T007) — reindex endpoint + curation UI
4. Complete Phase 3 (T008) — draw endpoint switch
5. Complete Phase 5 (T013–T015) — integration tests + manual verification

### Incremental Delivery

1. T001 — Migration applied → new columns exist
2. T002 — Candidate approval copies highlight_cells → new forced_win puzzles have stored shapes
3. T009–T012 — Progress UI ships → no dependency on shape work
4. T003–T004 — Shape descriptor module with passing unit tests
5. T005–T007 — Reindex endpoint + curation tool UI → positions populated
6. T008 — Draw endpoint switches to position ordering → shape variety guarantee
7. T013–T015 — Tests and verification → ship

---

## Notes

- [P] tasks = different files, no shared state dependencies
- T003 (shapeDescriptor.js): The 14 categories have very different derivation logic. Each category must be implemented following spec.md Appendix A exactly. Double_threat has nested arm descriptors. forced_win has a cross-module fallback import from `candidate-generator.js`. figure_7 and j_shape require cell-coordinate geometry analysis from highlight_metadata.
- T005 (reindex): The round-robin formula is `position = groupIndex + sortedGroupPosition * numGroups` — not the other way around. Groups are ordered first-seen, shuffled within. supabase-js has no transaction API; sequential `.update()` calls are acceptable for this admin-only localhost operation.
- T008 (draw endpoint): Mixed category interleaving must maintain intra-category adjacency. Each category's pool is already position-ordered; interleaving at each position index preserves this. The interleaving iterates positions 0..n-1, taking one puzzle from each category at that index until n puzzles are collected.
- T009 (progress endpoint): The `puzzles!inner(category)` PostgREST embedding requires the FK relationship between `puzzle_attempts.puzzle_id` and `puzzles.id` to exist in the PostgREST schema. This relationship should already exist (puzzle_attempts references puzzles). Verify with a quick test query before wiring the endpoint.
- T011 (SetPickerScreen): `useStore()` returns `{ store, session, supabase }` — `isAuthenticated` is derived as `!!session`, NOT read as a direct property. The profile's tier is on `store.getProfile().tier` (see memory `reference_tier_source.md`), but tier is not needed for progress display.
- The `CHALLENGE_SETS` import in `server/challengeSets.js` exports the canonical array used as the source of truth for category ordering and the list of categories to include in progress responses (FR-013).
- Migration 044 uses `ADD COLUMN IF NOT EXISTS` for idempotency. The `GRANT SELECT (shape_key, position, highlight_cells)` must list columns explicitly (following the migration 012/040 pattern).
- The reindex endpoint uses `requireLocalhost` while `GET /api/admin/puzzles` uses `requireAdmin`. This is intentional (D5) — DO NOT unify them.
