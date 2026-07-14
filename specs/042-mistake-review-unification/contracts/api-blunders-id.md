# Contract: `GET /api/blunders/:id` (extended)

Public blunder/mistake permalink endpoint. No auth required (unlisted-but-public, per spec 037 —
unchanged by this feature). This document supersedes the prior response shape recorded in
`docs/architecture/api-conventions.md`'s "Coach Endpoints" section for this one route; tasks.md
includes a documentation task to update that doc once this ships.

## Request

`GET /api/blunders/:id`

- `id` (path param, required): UUID of a `blunders` row. 400 `{ "error": "invalid id" }` if it fails
  `UUID_REGEX`.

No query params. No request body.

## Response — 200

```json
{
  "id": "uuid",
  "board_state": "<movestring>",
  "move_played": 3,
  "correct_move": 4,
  "pattern_category": "immediate_threat",
  "quality": "blunder",
  "created_at": "2026-05-01T12:00:00Z",
  "resolved_at": null,
  "severity": 12,
  "blunder_severity": 0.28,
  "game_id": "uuid | null",
  "papergames_game_id": "uuid | null",
  "moveIndex": 8,
  "threat_cells": [{ "col": 4, "row": 2 }],
  "patternCells": [],
  "is_owner": true,
  "totalMoves": 41,
  "siblingMistakes": [
    { "id": "uuid", "moveIndex": 16, "quality": "suboptimal", "resolved_at": null },
    { "id": "uuid", "moveIndex": 18, "quality": "blunder", "resolved_at": null },
    { "id": "uuid", "moveIndex": 28, "quality": "suboptimal", "resolved_at": "2026-06-01T00:00:00Z" },
    { "id": "uuid", "moveIndex": 32, "quality": "suboptimal", "resolved_at": null }
  ]
}
```

**New fields** (this feature — additive, backward compatible):
- `papergames_game_id` — previously omitted from the `.select()`; now always included (mutually
  exclusive with `game_id`; exactly one of the two is non-null for any real row).
- `totalMoves` — the parent game's total ply count (`moves.length` on the `games` or
  `papergames_games` row matching whichever of `game_id`/`papergames_game_id` is set). `null` only if
  neither FK is set on the blunder row (should not occur in practice).
- `siblingMistakes` — every `blunders` row sharing the same parent game (matched on whichever of
  `game_id`/`papergames_game_id` is set on the requested row), ordered by `move_index` ascending,
  **including the row being requested**. Each entry carries only `id`, `moveIndex`, `quality`,
  `resolved_at` — enough for the client to render a full stepper/chip row and compute "X of Y" without
  a second request. No `user_id` filter is applied (consistent with this endpoint's existing
  public-permalink contract — a visitor sees the same sibling set the owner would). **Deliberately
  carries no `board_state`/`move_played`/`correct_move`** — resolved (plan-review) as: each entry is
  itself a permalink id, so stepping Prev/Next/chip to a sibling within a cold-boot navList issues its
  own lazy `GET /api/blunders/:id` for that sibling's id at the moment of navigation, reusing this same
  endpoint (see `research.md` §10). This is a deliberate design choice, not an open implementation
  detail — no bulk/eager sibling fetch is planned.
- `patternCells` — `[{ col, row }]`, 0-indexed, pattern-agnostic (Decision 3 — generalizes an earlier
  `double_threat`-only `doubleThreatCells` design; the owner flagged that focusing on one pattern tag
  ignored `figure_7`/`j_shape`/etc.). Computed by looking up `pattern_category` in the existing
  tag→detector map (`classifier.js:1536`) and, if a mapping exists, running that pattern's detector —
  every registered detector returns the shared `{ matched, cells }` shape (`cells` as 1-indexed
  `"cXrY"` strings; see `figure_7`/`j_shape` at `classifier.js:934`/`:970` for two other examples of
  the same shape) — against the board state/perspective that pattern tag requires (per the per-pattern
  audit, tasks.md T049A). For `pattern_category === 'double_threat'` specifically: run
  `detectDoubleThreat` (`classifier.js:1328`) on the board **after `correct_move`** (not `move_played`),
  from the blunderer's own perspective — mirroring `classifier.js:1703`'s own
  `detectDoubleThreat(boardAfterCorrect, blunderer)` call. Convert the detector's 1-indexed `"cXrY"`
  cell strings to `{col, row}` 0-indexed to match `threat_cells`'s shape. Empty array (`[]`) when
  `pattern_category` has no detector mapping, the detector doesn't match, or the detector legitimately
  returns no cells (e.g. score-consuming/solver-based detectors) — no special-casing per tag. This is a
  *different* computation from `threat_cells` (which uses `move_played`, not `correct_move`, and the
  opponent's perspective, not the blunderer's, for `double_threat`) — see `research.md` §9 for the full
  rationale. Feeds the same client highlight channel as `threat_cells` (FR-020, SC-008). **Verified
  fixtures remain limited to `double_threat`**: the two solver-verified Assumptions boards
  (`41442625312235115445550126400` P1 `c1r4`/`c4r3`; `3333364101252113121524` P2 `c5r3`/`c7r2`) are the
  only pattern-tag/board combinations with an asserted expected-cells value; other tags' board-state
  derivation is recorded by the audit (T049A) but not asserted against a solver-verified board unless
  one already exists. **Trap** (per project memory, immediate_threat phantom-cell case): `immediate_threat`
  /`missed_own` detect on the **pre-move** `board_state`, never on the board after `correct_move` —
  running the wrong board state produces a phantom cell one row up; `double_threat` (and any other
  fork-shaped pattern) keeps the board-after-correct-move derivation.

**Unchanged fields**: everything present in the current implementation — `id`, `board_state`,
`move_played`, `correct_move`, `pattern_category`, `quality`, `created_at`, `resolved_at`, `severity`,
`blunder_severity`, `game_id`, `moveIndex`, `threat_cells`, `is_owner`. `user_id` continues to be
stripped from the response (never exposed to clients).

## Response — errors (unchanged)

- 400 `{ "error": "invalid id" }` — malformed UUID.
- 404 `{ "error": "not found" }` — no matching row.
- 503 `{ "error": "Database not configured" }` — Supabase client not initialized.
- 500 `{ "error": "<message>" }` — unexpected DB error.

## Server-side query shape

1. Existing lookup, extended `.select()`:
   ```js
   .from('blunders')
   .select('id, board_state, move_played, correct_move, pattern_category, quality, created_at, resolved_at, severity, blunder_severity, game_id, papergames_game_id, user_id')
   .eq('id', id)
   .single()
   ```
2. Parent-game total move count (branch on which FK is set on the fetched row):
   ```js
   const parentTable = data.game_id ? 'games' : (data.papergames_game_id ? 'papergames_games' : null);
   const parentId = data.game_id ?? data.papergames_game_id;
   const totalMoves = parentTable
     ? (await supabase.from(parentTable).select('moves').eq('id', parentId).single()).data?.moves?.length ?? null
     : null;
   ```
3. Sibling mistakes (same FK-branch logic, filtered on whichever column is non-null):
   ```js
   const siblingCol = data.game_id ? 'game_id' : 'papergames_game_id';
   const { data: siblings } = await supabase
     .from('blunders')
     .select('id, move_index, quality, resolved_at')
     .eq(siblingCol, parentId)
     .order('move_index', { ascending: true });
   const siblingMistakes = (siblings ?? []).map(s => ({ id: s.id, moveIndex: s.move_index, quality: s.quality, resolved_at: s.resolved_at }));
   ```

Both added queries are indexed-FK point lookups (`games.id`/`papergames_games.id` are primary keys;
`blunders.game_id`/`blunders.papergames_game_id` are FK columns) — no full-table scan, no solver call.

4. Pattern cells (Decision 3 — generic dispatch via the tag→detector map, `classifier.js:1536`; no
   query, computed in-process by reusing the existing `Board` class and the production detectors).
   `index.js` today imports `Board` but **not** `detectDoubleThreat` or any other detector — the
   import(s) and a `parseCxRy` cell-string parser (neither exists anywhere in the repo today) must be
   added:
   ```js
   let patternCells = [];
   const detectorEntry = PATTERN_TAG_TO_DETECTOR[data.pattern_category]; // per-tag board-state table, T049A
   if (detectorEntry) {
     const { boardInput, detect } = detectorEntry; // boardInput resolves the correct board+perspective for this tag
     const { board, perspective } = boardInput(data);
     const result = detect(board, perspective);
     patternCells = result.matched ? result.cells.map(parseCxRy) : []; // "c1r4" -> { col: 0, row: 3 }
   }
   ```
   For `pattern_category === 'double_threat'` specifically, `boardInput` resolves to the board **after**
   `correct_move` from the blunderer's own perspective:
   ```js
   const blunderer = new Board(data.board_state).currentPlayer;
   const boardAfterCorrect = new Board(data.board_state + String(data.correct_move));
   const dt = detectDoubleThreat(boardAfterCorrect, blunderer);
   ```
   This is a pure in-memory computation (board replay + one classifier call per pattern tag), not a DB
   query or solver call — no new I/O beyond what `computeThreatCells` already does for `threat_cells`.
   This computation is applied **unconditionally** to both response builders that construct a blunder
   shape (see Consumers below) — not gated behind a conditional read of the other handler.

## Consumers

- `MistakeDetailScreen.jsx` cold-boot path (`src/screens/MistakeDetailScreen.jsx:39-59`): replaces the
  current single-item `[data]` `coldNavList` construction with a full `siblingMistakes`-derived list.
  **Resolved (plan-review)**: each `siblingMistakes` entry does NOT carry `board_state`; stepping
  Prev/Next/chip to a sibling issues its own lazy `GET /api/blunders/:id` for that sibling's `id` at the
  moment of navigation (each sibling is itself a permalink — no bulk/eager prefetch). `totalMoves`
  replaces the current `blunders.length` fallback used in the "Move N / M" header (FR-008) —
  computable immediately from the initial response, no extra fetch needed; `papergames_game_id` fixes
  "Start new game from here" for cold-opened papergames permalinks (FR-010); `patternCells` feeds
  the same highlight channel as `threat_cells` via `userMajorThreats`
  (`MistakeDetailScreen.jsx:84-85`), for any mistake whose `pattern_category` has a detector mapping
  (FR-020, SC-008).
- **In-app navigation path** (`ReviewScreen.jsx` → `blunderDetail` → `MistakeDetailScreen.jsx`'s
  `userMajorThreats` channel): reached via the **second, independent** blunder-response builder at
  `index.js:~2560` (confirmed by direct read, per the epic critique, to construct its own
  `threat_cells`/`game_id`/`papergames_game_id` shape and **not** delegate to the `:id` handler above).
  `patternCells` MUST be added to this builder too, unconditionally, or an in-app-reached
  `double_threat` (or any other mapped-pattern) mistake silently loses its fork highlighting while the
  cold-boot permalink path for the same mistake works correctly — the two paths must not diverge.
