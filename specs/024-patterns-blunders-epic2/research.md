# Research: Patterns → Blunders Epic 2 — Production Wiring

**Phase 0 findings — all unknowns resolved**

---

## Decision: `tagBlunder` is already exported from `classifier.js`

Epic 1 is confirmed complete. `tagBlunder` and `classifyPattern` are exported from
`connect-four/server/classifier.js` (lines 1374 and 1422 respectively). No new classifier
work is required in this epic.

---

## Decision: `server/blunderTags.js` does not yet exist

Confirmed by `ls connect-four/server/blunderTags.js` returning NOT EXISTS. The file must be
created in this epic as the single source of truth for the 15-tag set.

**Tags to include** (mirrors migration 032 CHECK constraint):
`immediate_threat`, `forced_block`, `forced_win`, `double_threat`, `undercut`, `overcut`,
`figure_7`, `j_shape`, `z_threat`, `odd_even_threat`, `claimeven`, `claimodd`,
`drawing_move`, `suboptimal_move`, `forbidden_columns`

Both scripts (`reprocess_blunders.mjs`, `import_papergames_blunders.mjs`) currently maintain
a local `VALID_PATTERN_CATEGORIES` Set with 12 entries — missing `odd_even_threat`, `claimodd`,
and `drawing_move`. The shared module corrects this drift.

---

## Decision: `classifyAll` has active callers — PRESERVE

`rg classifyAll connect-four/server/` found two callers:
1. `server/scripts/classify_all.mjs` — a debug script that calls `classifyAll` directly
2. `server/index.js` — the `/api/debug/classify-all` endpoint calls `classifyAll`

Neither is on the blunder-tagging path. Both must be preserved unchanged.

---

## Decision: `classifyBestMove` has zero callers — ELIGIBLE FOR DELETION

`rg classifyBestMove connect-four/server/` found only the definition in `classifier.js`.
The function is exported but not imported anywhere in the server codebase. It is a dead export
and can be deleted per FR-021. Conditional on the pre-implementation audit confirming zero callers.

`classifyAll` is the peer function but has active callers, so only `classifyBestMove` is deleted.

---

## Decision: `'unknown'` appears only in `ReviewScreen.jsx` line 84 (frontend-only)

`rg "'unknown'" connect-four/server/scripts/ connect-four/server/index.js` returns zero hits
in server paths (the two `'unknown'` hits in `server/index.js` are for `device_uuid` and
Stripe plan fields — not `pattern_category`).

The only `pattern_category`-related `'unknown'` is in `ReviewScreen.jsx` line 84:
`? move.patternTag : 'unknown'`. This line is inside the client-side blunder-write block
(lines 74–101) that is being removed entirely by FR-019. The `'unknown'` is therefore removed
as a side-effect of the block removal, with FR-018 serving as an explicit guard confirming
the value is gone.

---

## Decision: `movesBeforeThisPly` is a string (movestring prefix)

In the analyze endpoint, `const movesBeforeThisPly = moves.slice(0, i)` operates on `moves`
which is a string column from the `games` table (confirmed by `data.fullMovestring` usage in
ReviewScreen: `data.fullMovestring.slice(0, plyIndex)` returns a string used directly as
`board_state`). String `.slice()` returns a string. `tagBlunder`'s `moves` parameter expects
a movestring string. No conversion needed.

---

## Decision: `computeSeverity` is a local helper in `server/index.js` — do not share

The `computeSeverity(bestScore, score)` function appears identically in `server/index.js`,
`reprocess_blunders.mjs`, and `import_papergames_blunders.mjs`. The handoff context
explicitly states: "do not DRY it". The analyze endpoint wiring must reuse the existing local
definition in `server/index.js`, confirmed by looking at the `POST /api/blunders` endpoint
(~line 1661) which already uses this helper.

---

## Decision: Analyze endpoint INSERT is fire-and-forget relative to HTTP response

Per spec edge case: "a DB failure on INSERT (other than 23505) is logged but does not cause
a 500 response". This pattern already exists in the server for analytics writes. The INSERT
must be wrapped in a try/catch that logs and continues — never propagating the error to
`res.status(500)`.

---

## Decision: `reprocess_blunders.mjs` keeps its delete-all-then-insert idempotency pattern

The current script deletes all game blunders (`puzzle_id IS NULL`) before inserting. This
makes a second run idempotent without needing per-row conflict handling. The `23505` conflict
handling required by FR-006a is for the analyze endpoint only (where client and server could
write the same blunder concurrently). The reprocess script does not need `23505` handling
because its delete-all first pass removes any pre-existing conflicts.

---

## Decision: `ReviewScreen.jsx` — `VALID_CATEGORIES` must NOT be modified

`VALID_CATEGORIES` in ReviewScreen.jsx is derived from `CATEGORY_ORDER` (puzzle-category
module). Adding blunder-only tags (`drawing_move`, `suboptimal_move`, etc.) to this set
would contaminate puzzle candidate generation, the `/draw` endpoint, and the SetPicker lock
icons. The blunder-tag allowlist lives exclusively in `server/blunderTags.js`. Per FR-020,
no change is made to `VALID_CATEGORIES`.

---

## Decision: Documentation required for `server/blunderTags.js` module

Constitution Principle VIII requires new architectural conventions to be documented in
`docs/architecture/server-conventions.md`. The new "Category Registry" section already
documents `server/categories.js`. A parallel entry for `server/blunderTags.js` must be
added alongside it.
