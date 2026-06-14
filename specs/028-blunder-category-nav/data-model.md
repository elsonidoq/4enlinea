# Data Model: Blunder Category Navigation & Two-Way Links

**Feature**: spec 028  
**Branch**: `101-new-design`  
**Date**: 2026-06-10

---

## No new DB migrations

Epic A (migration 036) already added `game_id uuid nullable FK games(id)` to the `blunders` table. No new schema changes are required for spec 028.

---

## Extended API response shape: `GET /api/coach/queue`

The existing endpoint gains two optional query params and two new fields per blunder object.

### New query params

| Param | Type | Validation | Behavior |
|---|---|---|---|
| `category` | string | Must be in `VALID_BLUNDER_TAGS` (blunderTags.js); returns 400 for invalid slug | Filters `WHERE pattern_category = $category` |
| `game_id` | UUID string | Basic UUID format; returns 400 for invalid format | Filters `WHERE game_id = $game_id` |

Both params are optional and independent. When absent, existing behavior is preserved.

### New fields per blunder object

| Field | Type | Source | Notes |
|---|---|---|---|
| `game_id` | `string \| null` | `blunders.game_id` (added in Epic A) | Added to SELECT |
| `moveIndex` | `integer` | `board_state.length` computed at response time | 0-indexed global ply count; join key for ReviewScreen |

The full blunder object after this change:

```json
{
  "id": "uuid",
  "board_state": "<movestring>",
  "move_played": 3,
  "correct_move": 4,
  "pattern_category": "immediate_threat",
  "created_at": "2026-05-01T12:00:00Z",
  "resolved_at": null,
  "severity": 7,
  "blunder_severity": 0.42,
  "threat_cells": [{ "col": 4, "row": 2 }],
  "game_id": "uuid-or-null",
  "moveIndex": 14
}
```

---

## Client-side entities (not persisted)

### `CategoryEntry` (derived in `CategoryListScreen`)

Computed client-side from the full blunder list fetched at Level 1. Not transmitted over the wire.

```ts
{
  slug: string,           // DB slug, e.g. "claimeven"
  items: Blunder[],       // all blunders in this category
  unreviewed: Blunder[],  // items where resolved_at === null
  maxSev: number,         // max severity among unreviewed; 0 if all reviewed
  thumb: Blunder,         // most-critical unreviewed, or most-critical overall if all reviewed
}
```

Sort rule: by `maxSev` descending. `maxSev === 0` categories sorted to the bottom. Within equal `maxSev`, preserve insertion order.

### `MistakeSource` (navigation param)

Passed from `ReviewScreen` to `MistakeDetailScreen` when navigating from the game timeline.

```ts
{
  date: string,        // formatted game date, e.g. "Jun 7"
  gameId: string,      // UUID of the source game (= props.id in ReviewScreen)
  totalMoves: number,  // analysis.fullMovestring.length
}
```

### `BlunderNavList` (navigation param)

Ordered `Blunder[]` array passed from either:
- `MistakesListScreen` (context: `'list'`) — category-filtered, severity-desc order
- `ReviewScreen` (context: `'game'`) — game blunders sorted by `moveIndex` asc

Not serialised to URL. `blunderDetail` is in `SESSION_ONLY_SCREENS`.

---

## Navigation param shapes summary

| Route | Component | Nav params (props) |
|---|---|---|
| `mistakes` | `CategoryListScreen` | `go, goBack` only |
| `mistakeDetail` | `MistakesListScreen` | `go, goBack, category: string \| null` |
| `blunderDetail` | `MistakeDetailScreen` | `go, goBack, blunderNavList: Blunder[], index: number, mistakeContext: 'list' \| 'game', mistakeSource: MistakeSource \| null` |

---

## i18n additions (en.json)

All under `mistakes` namespace. New keys only — existing keys are not modified.

| Key | Value |
|---|---|
| `mistakes.to_review` | `"{{count}} to review"` |
| `mistakes.cat.done` | `"done"` |
| `mistakes.cat.new` | `"{{count}} new"` |
| `mistakes.detail.tab_unreviewed` | `"Unreviewed"` |
| `mistakes.detail.tab_reviewed` | `"Reviewed"` |
| `mistakes.detail.all_caught_up` | `"All caught up in this category!"` |
| `mistakes.detail.none_reviewed` | `"None reviewed yet — tap a blunder to study it."` |
| `mistakes.detail.meta_count` | `"{{count}} blunder"` |
| `mistakes.detail.meta_count_pl` | `"{{count}} blunders"` |
| `mistakes.detail.source_game` | `"{{date}} game"` |
| `mistakes.pattern.suboptimal_move` | `"Suboptimal move"` |
| `mistakes.pattern.drawing_move` | `"Drawing move"` |
