# Feature Specification: Patterns → Blunders Epic 2 — Production Wiring

**Feature Branch**: `024-patterns-blunders-epic2`
**Created**: 2026-06-07
**Status**: Draft
**Depends on**: Epic 1 (`specs/023-patterns-blunders-epic1`) — `tagBlunder`, `classifyPattern`, DB migrations, blunders truncation must all be deployed before this epic runs.

---

## Context and Goal

Epic 1 implemented the `tagBlunder` engine and updated the DB schema. Epic 2 wires that engine into every production code path that records blunders, eliminates the now-forbidden `'unknown'` tag everywhere it still appears in code, and runs a best-effort backfill of historical game rows.

After this epic every new authenticated sparring game blunder is stored with a meaningful pattern tag plus human-readable `reason` and `direction` columns — computed server-side, persisted atomically with the INSERT, never relying on a client round-trip.

**Source of truth**: `docs/mvp/patterns_blunders_challenges.md` (three-layer model, `tagBlunder` contract). Where this spec conflicts with that document, that document wins.

---

## Settled decisions (carry forward — do not re-derive)

- **Storage gate is independent of tagging.** `tagBlunder` runs after `scoreMove()` confirms a blunder; whether a named pattern matches does not affect whether the row is stored.
- **`unknown` is not a valid tag.** Any unmatched blunder falls through to `suboptimal_move`. The Epic 1 DB migration removes `'unknown'` from the CHECK constraint; any remaining callsite that inserts `'unknown'` causes a DB error.
- **`tagBlunder` never throws.** All failures resolve to `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: ...' }`.
- **Anon write prohibition.** `blunders.user_id` is `NOT NULL` at the DB level. The INSERT skip for unauthenticated requests matches this constraint — it is not a workaround.
- **`forced_win`, `drawing_move`, and `suboptimal_move` are stored.** They are excluded from challenge-set matching only; they are never dropped at insert.
- **`POST /api/blunders` is not removed.** It remains as a backward-compat endpoint for older clients. Epic 2 does not rely on it for new writes. However, the endpoint must be hardened: any `pattern_category` value not in `VALID_BLUNDER_TAGS` (e.g. stale-client `'unknown'`) must be substituted with `'suboptimal_move'` before INSERT, preventing a DB CHECK constraint 500. A `console.warn` is emitted when substitution fires.
- **`reprocess_blunders.mjs` is best-effort.** Not a release gate — Epic 2 ships when the wiring is done regardless of backfill completion.
- **`import_papergames_blunders.mjs` is compilability-only.** Papergames.io integration was cut from the product. No runtime tests or acceptance criteria cover this script beyond "importable without syntax errors."
- **No i18n work required.** All tag entries are already present in `en.json`.
- **`forbidden_columns` stays in all valid-tag sets.** Legacy-tolerated in the DB constraint. The new tagger no longer emits it, but all `VALID_BLUNDER_TAGS` / `VALID_PATTERN_CATEGORIES` uses must retain it for consistency.
- **Client-side blunder write is removed.** `ReviewScreen.jsx` lines 74-101 (the `POST /api/blunders` fire-and-forget loop) are removed for authenticated users. The analyze endpoint is the sole write path after this epic.
- **`server/blunderTags.js` is the single source of truth for valid tags.** It exports the 15-tag set that mirrors the DB CHECK constraint (migration 032). Both scripts (`reprocess_blunders.mjs`, `import_papergames_blunders.mjs`) and the analyze endpoint guard import from it. This fixes the current drift where `reprocess_blunders.mjs` is missing `odd_even_threat`, `claimodd`, and `drawing_move`.
- **Dedup via unique index.** Migration 030 created `idx_blunders_game_unique ON blunders(user_id, board_state, move_played) WHERE puzzle_id IS NULL`. The analyze endpoint INSERT must treat pg error code `23505` (unique violation) as success, not as a failure.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Authenticated Player Blunder Is Stored with Full Tag (Priority: P1)

An authenticated user plays a sparring game and makes a move that is classified as a blunder by the quality scorer. After the game ends, the system tags the blunder, assigns a direction and reason, and stores all three in the database as a single atomic operation — no client round-trip required.

**Why this priority**: This is the primary objective of the epic. Without it, `reason` and `direction` remain NULL forever for all new games, and the three-hop path (analyze → client → POST /api/blunders) remains the only write path.

**Independent Test**: Play a sparring game as an authenticated user, make a deliberate blunder (e.g., miss an immediate winning move). After game ends, query the `blunders` table and verify the row has non-null `pattern_category`, `reason`, and `direction`.

**Acceptance Scenarios**:

1. **Given** an authenticated user completes a game containing a blunder, **When** `POST /api/games/analyze` is called, **Then** a row is inserted into `blunders` with `pattern_category` matching the `tagBlunder` result, `reason` non-null, and `direction` non-null.
2. **Given** `tagBlunder` returns `{ tag: 'forced_block', direction: 'defensive_miss', reason: 'matched defensive_miss: forced_block' }`, **When** the analyze endpoint processes that ply, **Then** the inserted row has `pattern_category = 'forced_block'`, `direction = 'defensive_miss'`, `reason = 'matched defensive_miss: forced_block'`.
3. **Given** `tagBlunder` encounters a solver error and resolves to `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: ...' }`, **When** the analyze endpoint processes that ply, **Then** the row is still inserted with `pattern_category = 'suboptimal_move'` — no exception is propagated.

---

### User Story 2 — Anonymous User Blunder Is Tagged But Not Stored (Priority: P1)

An anonymous (unauthenticated) user plays a sparring game. The analyze endpoint still computes the tag and returns it in the JSON response (so the frontend can display a review), but no row is written to `blunders` because `user_id` would be NULL, violating the DB constraint.

**Why this priority**: Equal priority with P1 — the DB constraint enforces this at the storage level. If the guard is missing, every anonymous game crashes the analyze endpoint with a constraint error.

**Independent Test**: Call `POST /api/games/analyze` without an `Authorization` header. Verify the response still contains `patternTag` per ply and that the `blunders` table has no new row.

**Acceptance Scenarios**:

1. **Given** no `Authorization` header on the analyze request, **When** `POST /api/games/analyze` processes a blunder ply, **Then** `tagBlunder` runs internally and `patternTag` appears in the JSON response, but no INSERT is attempted.
2. **Given** an anonymous request that would produce a DB constraint error if inserted, **When** the endpoint processes the ply, **Then** the endpoint returns 200 (not 500) with the computed tag in the response body.

---

### User Story 3 — `'unknown'` Tag Is Eliminated Across All Code Paths (Priority: P1)

No server or frontend code path can produce or accept `'unknown'` as a `pattern_category` value after this epic ships. The `VALID_BLUNDER_TAGS` shared constant in `server/blunderTags.js` is the single authoritative set; server scripts and the analyze endpoint guard import from it. `ReviewScreen.jsx` has one remaining `'unknown'` string literal at line 84 (the fallback) that must be replaced with `'suboptimal_move'`.

**Why this priority**: The Epic 1 DB migration already removed `'unknown'` from the CHECK constraint. Any remaining callsite that inserts `'unknown'` will hit a DB-level constraint error at runtime.

**Independent Test**: Run `rg "'unknown'" connect-four/server/ connect-four/src/` after all patches are applied and verify zero hits on pattern-category-related lines. Separately verify that attempting to insert `'unknown'` into the `blunders` table is rejected by the DB.

**Acceptance Scenarios**:

1. **Given** `ReviewScreen.jsx` processes a move with no pattern match, **When** it falls back to a default tag, **Then** the fallback value is `'suboptimal_move'`, not `'unknown'`.
2. **Given** the write block (lines 74–101) is removed from `ReviewScreen.jsx`, **When** dead-code cleanup runs, **Then** `VALID_CATEGORIES` and the `CATEGORY_ORDER` import are also removed (they are only used in the write block). Note: `VALID_CATEGORIES` is a puzzle-category set; it is NOT repurposed to hold blunder-specific tags — the blunder-tag allowlist lives exclusively in `server/blunderTags.js`.
3. **Given** the `VALID_PATTERN_CATEGORIES` set in `reprocess_blunders.mjs` (now imported from `server/blunderTags.js`), **When** inspected, **Then** it does not contain `'unknown'` and does contain `drawing_move`, `suboptimal_move`, `odd_even_threat`, `claimodd`, `forced_win`.
4. **Given** the analyze endpoint guard in `server/index.js`, **When** `tagBlunder` returns a tag not in `VALID_BLUNDER_TAGS`, **Then** it is substituted with `'suboptimal_move'` before INSERT.

---

### User Story 4 — `reprocess_blunders.mjs` Populates New Columns (Priority: P2)

When the operator runs the reprocess script against historical game rows, each reprocessed blunder row is populated with the `tagBlunder` result including `reason` and `direction`. The script is idempotent and can be safely re-run. Completion is not a release gate.

**Why this priority**: The `blunders` table was truncated in Epic 1. Without reprocessing, historical games have no blunder analytics until players replay them. This is a background operation with no user-visible dependency.

**Independent Test**: Run `reprocess_blunders.mjs` against a test DB with at least one game. Verify inserted rows have non-null `reason` and `direction`. Run again — verify no duplicate rows (idempotent).

**Acceptance Scenarios**:

1. **Given** historical game rows in the `games` table, **When** `reprocess_blunders.mjs` is run, **Then** `blunders` rows are inserted with `pattern_category`, `reason`, and `direction` populated from `tagBlunder`.
2. **Given** the script is run twice on the same data, **When** the second run completes, **Then** no duplicate rows are created (the upsert or conflict-handling logic prevents duplicates).
3. **Given** a game ply where `tagBlunder` returns `{ tag: 'suboptimal_move', ... }`, **When** the row is inserted, **Then** `pattern_category = 'suboptimal_move'` is stored — not dropped.

---

### User Story 5 — `classifyAll` / `classifyBestMove` Retirement (Priority: P3)

After all call-site migrations are complete, any functions that are now dead code are removed. This is conditional on zero remaining callers.

**Why this priority**: Cleanup — reduces confusion for future contributors who might use the wrong function. If callers remain on non-blunder paths, the functions stay.

**Independent Test**: After migration, run `rg 'classifyAll\|classifyBestMove' connect-four/server/`. If output is empty, verify both functions have been deleted from `classifier.js`. If output is non-empty, verify the functions are still present and document remaining callers.

**Acceptance Scenarios**:

1. **Given** `classifyAll` has active callers after Epic 2 wiring (confirmed callers: `/api/debug/classify-all` endpoint, `scripts/classify_all.mjs`, `explainSimulate.js`), **When** the epic is complete, **Then** `classifyAll` is **preserved** in `classifier.js` and each caller is documented; its removal is deferred to Epic 3 (coach explanation rebuild).
2. **Given** zero remaining callers of `classifyBestMove` after wiring (expected per research.md), **When** the epic is complete, **Then** `classifyBestMove` is deleted from `classifier.js`; if callers are found during the T006 audit, `classifyBestMove` is NOT deleted and the remaining callers are documented.

---

### Edge Cases

- What happens when the analyze endpoint is called with a game that has zero blunders? `tagBlunder` is not called (the loop only invokes it for plies flagged as blunders by `scoreMove()`); no INSERT occurs; response is 200 with empty blunder list.
- What happens when `tagBlunder` resolves to `'suboptimal_move'` (solver error)? The row is still inserted with `pattern_category = 'suboptimal_move'` — the error is captured in `reason`, not surfaced to the caller.
- What happens when the DB INSERT for a blunder fails (e.g., connection error)? The analyze endpoint logs the error but does not fail the entire request — the JSON response is still returned with `patternTag` values. Blunder storage is fire-and-forget relative to the analyze response.
- What if `reprocess_blunders.mjs` is interrupted mid-run? Because the script is idempotent, a re-run from the beginning is safe. No partial row state is left behind (each ply either inserts cleanly or conflicts are handled).
- What if `import_papergames_blunders.mjs` is imported by another module? It must be importable without syntax errors. It is never invoked at runtime in production; compilability is the only requirement.

---

## Requirements *(mandatory)*

### Functional Requirements

**Pre-implementation audit (must run before writing code):**

- **FR-001**: Before patching any call site, run `rg "'unknown'" connect-four/server/scripts/ connect-four/server/index.js connect-four/src/` and enumerate every site still emitting `'unknown'` as a `pattern_category` value. Every site found MUST be patched to use `'suboptimal_move'` instead.
- **FR-002**: Before retiring `classifyAll` / `classifyBestMove`, run `rg 'classifyAll' connect-four/server/` and `rg 'classifyBestMove' connect-four/server/` and enumerate all callers. Document which are on the blunder-tagging path (to be replaced) vs. other paths (to be preserved).

**`server/blunderTags.js` — shared constant (new file):**

- **FR-002a**: Create `connect-four/server/blunderTags.js` that exports `VALID_BLUNDER_TAGS` as a `Set` containing exactly the 15 tags that mirror the DB CHECK constraint from migration 032:
  `'immediate_threat'`, `'forced_block'`, `'forced_win'`, `'double_threat'`, `'undercut'`, `'overcut'`, `'figure_7'`, `'j_shape'`, `'z_threat'`, `'odd_even_threat'`, `'claimeven'`, `'claimodd'`, `'drawing_move'`, `'suboptimal_move'`, `'forbidden_columns'`.
- **FR-002b**: Both scripts (`reprocess_blunders.mjs`, `import_papergames_blunders.mjs`) MUST replace their local `VALID_PATTERN_CATEGORIES` set with `import { VALID_BLUNDER_TAGS } from '../blunderTags.js'` and use `VALID_BLUNDER_TAGS` in their guard checks.
- **FR-002c**: The analyze endpoint guard MUST also import `VALID_BLUNDER_TAGS` from `blunderTags.js` for the pre-INSERT tag substitution check.

**`POST /api/games/analyze` — primary wiring:**

- **FR-003**: The analyze endpoint MUST replace the `classify(movesBeforeThisPly, col, scores)` call used for blunder tagging with `await tagBlunder(movesBeforeThisPly, col, bestCol, solver)`. The `tagBlunder` call MUST be placed after `scoreMove()` and only invoked when `quality === 'blunder'`.
- **FR-004**: The result destructure MUST be `const { tag, reason, direction } = result` (all three fields).
- **FR-005**: `tagBlunder` MUST run on every blunder ply regardless of whether the request is authenticated (the tag is still returned in the response for anonymous users).
- **FR-006**: IF `req.user` is set, THEN the endpoint MUST INSERT into `blunders` with the following columns sourced from the analyze loop:
  - `user_id` = `req.user.id`
  - `board_state` = `movesBeforeThisPly` (the array/string of moves before this ply)
  - `move_played` = `col` (the column the user played, 0-indexed integer)
  - `correct_move` = `bestCol` (the column with the best score, 0-indexed integer)
  - `pattern_category` = `tag` (after the `VALID_BLUNDER_TAGS` guard substitution)
  - `reason` = `reason` (from `tagBlunder` result, TEXT)
  - `direction` = `direction` (from `tagBlunder` result)
  - `severity` = `computeSeverity(bestScore, score)` (integer, NOT NULL)
  - `blunder_severity` = `blunderSeverity` (real, nullable — from the existing `computeBlunderSeverity` call already in the loop)
  - `puzzle_id` is NOT set (left NULL — this is a game blunder, not a puzzle blunder)
  
  The INSERT shape above matches the existing `POST /api/blunders` endpoint (server/index.js ~line 1661) and the `reprocess_blunders.mjs` `toInsert` object, which are the ground-truth templates. Do NOT include `game_id` or `move_number` — these columns do not exist in the `blunders` table.
- **FR-006a**: The INSERT MUST treat pg error code `23505` (unique_violation on `idx_blunders_game_unique`) as success, not as a failure. Log the conflict at debug level and continue. This prevents double-write failures if the client retries.
- **FR-007**: IF `req.user` is not set, THEN the INSERT MUST be skipped entirely (no attempt, no error).
- **FR-008**: The `tag` value MUST be returned in the JSON response as `patternTag` (same key as before) so the frontend can display it in ReviewScreen without a separate API call. `reason` and `direction` MUST also be included in each analyzed move entry.
- **FR-009**: Before inserting, an explicit guard MUST substitute `'suboptimal_move'` if `tag` is not in `VALID_BLUNDER_TAGS`. This guard prevents any future `tagBlunder` regression from inserting a DB-rejected value.
- **FR-010**: The analyze endpoint MUST NOT call `classify()` for blunder tagging after this change. `classify()` remains in use for other non-blunder code paths in the same file.

**`scripts/reprocess_blunders.mjs` — script wiring:**

- **FR-011**: The reprocess script MUST replace `classify(movesBeforeThisPly, col, scores)` with `await tagBlunder(movesBeforeThisPly, col, bestCol, solver)`.
- **FR-012**: The `toInsert` object MUST include `reason` and `direction` fields from the `tagBlunder` result.
- **FR-013**: The script's local `VALID_PATTERN_CATEGORIES` constant MUST be removed and replaced with `VALID_BLUNDER_TAGS` imported from `../blunderTags.js` (see FR-002b). The guard logic `raw && VALID_BLUNDER_TAGS.has(raw) ? raw : 'suboptimal_move'` replaces the old check.
- **FR-014**: (Subsumed by FR-002a) `forbidden_columns` is already in `VALID_BLUNDER_TAGS`; no separate action required.

**`scripts/import_papergames_blunders.mjs` — compilability only:**

- **FR-015**: The script MUST be updated so it does not reference `'unknown'` in its valid-tags set or as a fallback pattern category.
- **FR-016**: The script's `tagBlunder` call MUST use the correct 4-argument signature: `tagBlunder(movesBefore, col, bestCol, solver)`.
- **FR-017**: The script MUST be importable without syntax errors. No runtime test is required.

**`src/screens/ReviewScreen.jsx` — frontend patch:**

- **FR-018**: The `'unknown'` fallback at line 84 (`? move.patternTag : 'unknown'`) MUST be replaced with `'suboptimal_move'`. This is the **only** change required in `ReviewScreen.jsx` related to the valid-tag list.
- **FR-019**: The client-side blunder-write block (lines 74-101 of ReviewScreen.jsx — the `POST /api/blunders` fire-and-forget loop and its guard ref) MUST be removed entirely. The analyze endpoint is the sole write path; the client no longer writes blunders.
- **FR-020**: `VALID_CATEGORIES` and the `CATEGORY_ORDER` import in `ReviewScreen.jsx` MUST be removed as dead code: they are only consumed by the write block (FR-019) and have no remaining callers once that block is deleted. ESLint 9 `no-unused-vars` will break `npm run lint` if they are left in place. `VALID_CATEGORIES` MUST NOT be repurposed to hold blunder-specific tags such as `drawing_move`, `suboptimal_move`, `odd_even_threat`, `claimodd`, or `forced_win` — the blunder-tag allowlist lives exclusively in `server/blunderTags.js`. Additionally, the `useRef` import MUST be removed if `blundersWrittenRef` was its only consumer.

**`POST /api/blunders` stale-client hardening:**

- **FR-023**: The `POST /api/blunders` backward-compat endpoint MUST add a `VALID_BLUNDER_TAGS` guard before the INSERT: if `req.body.pattern_category` is not in `VALID_BLUNDER_TAGS`, substitute `'suboptimal_move'` and emit `console.warn`. This prevents stale clients still sending `pattern_category: 'unknown'` from receiving a 500 due to the Epic 1 DB CHECK constraint change. The substituted value is stored; the HTTP response is 200/201.

**Conditional retirement:**

- **FR-021**: After all call-site migrations above are applied, re-run `rg 'classifyBestMove' connect-four/server/`. IF zero callers, THEN delete `classifyBestMove` from `classifier.js`. IF callers remain, THEN preserve it and document callers.
- **FR-021a**: Re-run `rg 'classifyAll' connect-four/server/`. `classifyAll` MUST be preserved — it has confirmed active callers (the `/api/debug/classify-all` endpoint, `scripts/classify_all.mjs`, and `explainSimulate.js`). Document all callers. Do NOT delete `classifyAll` in Epic 2. Its removal is deferred to Epic 3.

**Reprocess backfill:**

- **FR-022**: After FR-011–FR-014 are applied, the operator MUST run `reprocess_blunders.mjs` to re-analyze all historical games. This step is idempotent and best-effort; Epic 2 shipping is not gated on its completion.

### Key Entities

- **`blunders` row (game blunder shape)**: Columns written by the analyze endpoint and reprocess script:
  - `id` uuid PK (auto)
  - `user_id` uuid NOT NULL — `req.user.id` / `games.user_id`
  - `puzzle_id` uuid NULLABLE — NULL for game blunders (puzzle blunders set this)
  - `board_state` text NOT NULL — `movesBeforeThisPly` (the movestring up to but not including this ply)
  - `move_played` integer NOT NULL — `col` (0-indexed column the user played)
  - `correct_move` integer NOT NULL — `bestCol` (0-indexed column with best solver score)
  - `pattern_category` text NOT NULL (CHECK constraint, migration 032) — `tag` from `tagBlunder`
  - `reason` text NULLABLE (migration 033) — `reason` from `tagBlunder`
  - `direction` text NULLABLE (migration 034) — `direction` from `tagBlunder`
  - `severity` integer NOT NULL DEFAULT 0 (migration 028) — `computeSeverity(bestScore, score)`
  - `blunder_severity` real NULLABLE (migration 029) — fraction from `computeBlunderSeverity`
  - `created_at` timestamptz NOT NULL DEFAULT now()
  
  Columns that do NOT exist: `game_id`, `move_number`. Do not include them in any INSERT.
  
  Unique constraint: `idx_blunders_game_unique ON (user_id, board_state, move_played) WHERE puzzle_id IS NULL` (migration 030). Treat pg error `23505` on this index as success (idempotent upsert).

- **`tagBlunder` result**: `{ tag: string, direction: string, reason: string }` — all three fields always present (never null, never throws).
- **`VALID_BLUNDER_TAGS`**: The single authoritative allowed-tag set, exported from `server/blunderTags.js`. Mirrors the 15-tag DB CHECK constraint from migration 032. Imported by the analyze endpoint guard, `reprocess_blunders.mjs`, and `import_papergames_blunders.mjs`.
- **`VALID_CATEGORIES` (ReviewScreen.jsx)**: A `Set` derived from `CATEGORY_ORDER` (puzzle-category module) used only in the client-side write block. It is removed as dead code in this epic (FR-020). It is NOT a blunder-tag allowlist and MUST NOT be repurposed as one — `VALID_BLUNDER_TAGS` in `server/blunderTags.js` is that allowlist.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every authenticated-user blunder row inserted after this epic ships has non-null `pattern_category`, `reason`, and `direction`. Zero rows with NULL `reason` or NULL `direction` for games analyzed after deployment.
- **SC-002**: Zero instances of `'unknown'` in `pattern_category` in the `blunders` table after deployment (enforced at DB level by the Epic 1 CHECK constraint; any remaining callsite would produce an observable constraint error).
- **SC-003**: Anonymous-user game analysis requests return 200 with `patternTag` values in the response body and produce zero new rows in `blunders`.
- **SC-004**: `import_papergames_blunders.mjs` can be imported (Node `--check` or equivalent) without a syntax error or unresolved import error.
- **SC-005**: `server/blunderTags.js` exports `VALID_BLUNDER_TAGS` containing exactly the 15 tags from migration 032. Both scripts and the analyze endpoint import from it. Running `rg "VALID_PATTERN_CATEGORIES" connect-four/server/scripts/` returns zero hits (local sets removed).
- **SC-006**: `reprocess_blunders.mjs` completes a full run against the production DB without crashing, and the resulting `blunders` rows have non-null `reason` and `direction` (verifiable by sampling after the backfill run).
- **SC-007**: `ReviewScreen.jsx` no longer contains the blunder-write block (lines 74-101). `rg "POST.*api/blunders" connect-four/src/` returns zero hits.
- **SC-008**: A duplicate analyze call for the same game (same `user_id`, `board_state`, `move_played`) does not produce a 500 error — the `23505` conflict is handled and the endpoint returns 200.
- **SC-009**: A request to `POST /api/blunders` with `pattern_category: 'unknown'` (stale client) returns 200/201 (not 500) and the row is inserted with `pattern_category = 'suboptimal_move'`. A `console.warn` is emitted in server logs. Valid tags are stored as-is.

---

## Assumptions

- Epic 1 (`023-patterns-blunders-epic1`) is fully deployed: `tagBlunder` is exported from `classifier.js`, the `blunders` table has `reason` and `direction` columns, the CHECK constraint no longer includes `'unknown'`, and the table has been truncated.
- `server/blunderTags.js` is a new file created in this epic. Before this epic, each script maintained its own local `VALID_PATTERN_CATEGORIES` set (with drift — the reprocess script was missing `odd_even_threat`, `claimodd`, and `drawing_move`). The shared module replaces all local copies.
- The `POST /api/blunders` endpoint remains in place and continues to function for any backward-compat clients; it is not modified by this epic.
- The `classify()` function is retained unchanged for the puzzle-generation path (candidate generator, `/api/debug/classify-all`, etc.). Only its blunder-tagging usages are replaced.
- `bestCol` (the correct column) is already computed by `scoreMove()` before the blunder-tagging call at each call site; callers do not need to run an additional solver query to obtain it.
- The analyze endpoint's blunder INSERT is fire-and-forget relative to the HTTP response: a DB failure on INSERT (other than `23505`) is logged but does not cause a 500 response.
- The solver singleton used by the analyze endpoint is the same handle passed to `tagBlunder`. No new solver processes are spawned.
- Performance: `tagBlunder` may issue up to 60+ solver queries per blunder ply (due to `detectClaimeven`). This is acceptable because the analyze endpoint is called post-game (not on the hot path) and runs asynchronously.
- The unique index `idx_blunders_game_unique` (migration 030) is already applied in the DB. The dedup contract (treat `23505` as success) closes the double-write window that existed when both the analyze endpoint and `ReviewScreen.jsx` wrote blunders independently.
