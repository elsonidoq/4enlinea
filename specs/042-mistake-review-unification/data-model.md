# Data Model — Mistake Review Unification & Deep-Reveal Overhaul

No new tables, columns, or migrations. This feature reshapes what an existing endpoint *returns* and
how existing fields are *labeled/rendered*; the underlying `blunders`/`games`/`papergames_games`
schema (see `docs/architecture/db-schema.md`) is unchanged, per Out of Scope.

## Entities (as surfaced to the client — no DB changes)

### Mistake (client-facing shape, extends existing `blunders` row)

A single non-optimal move, either `quality: 'blunder'` or `quality: 'suboptimal'` — both rendered by
the same `MistakeDetailScreen` (FR-001). Fields already returned by `GET /api/coach/queue` /
`GET /api/blunders/:id` today:

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `board_state` | text | movestring immediately before the mistake; internal, never shown raw (FR-016) |
| `move_played` | int (0-indexed col) | |
| `correct_move` | int (0-indexed col) | |
| `pattern_category` | text | tactical category slug |
| `quality` | `'blunder' \| 'suboptimal'` | drives the severity chip only (FR-001) |
| `severity`, `blunder_severity` | int, float | internal scoring — never rendered raw (FR-016) |
| `game_id` | uuid, nullable | set for AI-sparring mistakes |
| `moveIndex` | int (derived: `board_state.length`) | 0-indexed ply count |
| `threat_cells` | `[{ col, row }]` | derived, for highlighting |
| `is_owner` | bool | derived server-side; `is_owner !== false` gates "Mark as reviewed" |
| `resolved_at` | timestamptz, nullable | drives "reviewed" state |

**New fields added by this feature** (additive, on `GET /api/blunders/:id` only — see contract):

| Field | Type | Notes |
|---|---|---|
| `papergames_game_id` | uuid, nullable | previously omitted from this endpoint's `.select()`; now included so papergames-owned cold-boot permalinks can resolve "Start new game from here" and sibling lookups (FR-010, FR-015) |
| `totalMoves` | int, nullable | `moves.length` of the parent `games`/`papergames_games` row; `null` only in the defensive case where neither FK is set |
| `siblingMistakes` | `[{ id, moveIndex, quality, resolved_at }]` | every mistake in the same parent game, ordered by `move_index` ascending, including the current row; powers "X of Y" and lets cold-boot construct a real multi-item nav list. Deliberately carries no `board_state` — stepping to a sibling issues its own lazy `GET /api/blunders/:id` (see research.md §10); this is by design, not a gap. |
| `patternCells` | `[{ col, row }]` | additive, render-only, pattern-agnostic (Decision 3, generalized from an earlier `double_threat`-only `doubleThreatCells` design). Computed by looking up `pattern_category` in the existing tag→detector map (`classifier.js:1536`) and, if a mapping exists, running that pattern's detector — every detector shares the `{ matched, cells }` return shape (`cells` as 1-indexed `"cXrY"` strings) — against the board state/perspective appropriate to that tag (per the per-pattern audit; `double_threat` runs `detectDoubleThreat(boardAfterCorrect, blunderer)` on the board after `correct_move`, from the blunderer's own perspective — a different board state/perspective than `threat_cells`' `computeThreatCells(board_state, move_played)`, so it cannot be derived from that field). Converted to `{col, row}` 0-indexed. Empty array/absent when `pattern_category` has no detector mapping, the detector doesn't match, or the detector legitimately returns no cells (e.g. solver-based detectors) — no special-casing per tag. Feeds the same client highlight channel as `threat_cells` (FR-020, SC-008; see research.md §9). Only `double_threat` has solver-verified fixture boards today (the two Assumptions boards); other pattern tags' board-state derivation is recorded by an explicit audit task (tasks.md T049A) before being trusted for any tag beyond `double_threat`. **Non-obvious trap** (audit must respect): `immediate_threat`/`missed_own` detect on the **pre-move** `board_state`, not the board after `correct_move` — running the wrong board state produces a phantom cell one row up; forks like `double_threat` keep the board-after-correct-move derivation. |

### Parent game (unchanged entity, newly *queried from* this endpoint)

Either a `games` row (AI sparring) or a `papergames_games` row (imported). Only `moves` (text
movestring) is read for this feature — `moves.length` is the total move count. No other parent-game
field is newly consumed.

### Explanation ("deep reveal")

Unchanged data shape (`server/explainContext.js`/`mechanismExplainer.mjs` output). This feature only
changes: (a) the text and `terms` map that reach the client are post-processed by the new shared guard
(`stripInternalTokens` for prose, `sanitizeTermsMap` for the `terms` map's keys) at the response
boundary in `server/index.js` — covering both cache-hit and freshly-generated responses — before being
returned (FR-017, FR-018, FR-019) — a rendering step, not a schema or field change; (b) **the client
derives every board-square highlight solely from structured detector output — `threat_cells` (existing)
plus the new `patternCells` (this feature) — never by parsing prose** (Decision A, plan-review).
The prose guard rewrites `cXrY` → "column N," dropping the row; this is safe precisely because no
highlight is ever derived from text, only from these two structured fields (FR-020, SC-008).

## State transitions

None new. `resolved_at` transitions null → timestamp on "Mark as reviewed" exactly as today
(`POST /api/coach/queue/:id/resolve`); this feature does not touch that write path.

## Validation rules

- `GET /api/blunders/:id`'s `id` path param continues to be validated against `UUID_REGEX` before any
  query (unchanged, FR-018 of spec 037).
- No new user input is accepted by this feature — the endpoint extension is read-only additive data,
  and the `/mistakeDetail/:category` URL param reuses the existing `VALID_BLUNDER_TAGS` validation
  already applied when `MistakesListScreen` fetches by category.
