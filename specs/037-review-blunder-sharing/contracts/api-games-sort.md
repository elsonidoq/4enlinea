# Contract: GET /api/games — sort param and side field

## Changes to existing endpoint

Two additive changes to `GET /api/games` (no breaking changes):

1. New optional `?sort=` query parameter.
2. `side` field added to every game object in the response.

All existing callers remain valid — `?sort=` defaults to `recent` (current behavior) and `side` is additive.

## New query parameter: `?sort=`

| Value | Sort order | Notes |
|---|---|---|
| `recent` (default) | `created_at DESC` | Current behavior — no change |
| `played_well` | `accuracy DESC NULLS LAST`, then `created_at DESC` | Null-accuracy games sorted after all non-null |
| `worst_blunders` | `blunder_count DESC`, then `created_at DESC` | |

**Missing / absent**: Defaults to `recent`. No error.

**Invalid value** (any string other than the three valid values):
```json
HTTP 400
{ "error": "invalid sort" }
```

## Implementation note

Sorting is applied **in JavaScript** on the merged array of AI + paper games (after both tables are fetched and blunder counts are computed). This is required because the two tables are fetched separately in parallel — no SQL UNION is used.

JS comparator for `played_well`:
```js
const a_acc = a.accuracy ?? -Infinity;
const b_acc = b.accuracy ?? -Infinity;
if (b_acc !== a_acc) return b_acc - a_acc;
return new Date(b.created_at) - new Date(a.created_at);
```

JS comparator for `worst_blunders`:
```js
if (b.blunder_count !== a.blunder_count) return b.blunder_count - a.blunder_count;
return new Date(b.created_at) - new Date(a.created_at);
```

## New field: `side`

Added to every game object in the response:

```json
{
  "id": "...",
  "outcome": "won",
  "created_at": "...",
  "source": "ai",
  "difficulty": "medium",
  "accuracy": 82,
  "blunder_count": 2,
  "cols": [...],
  "side": "first"
}
```

- `"first"` — user moved first (Green discs)
- `"second"` — user moved second (Gray discs)
- `null` — legacy rows that predate the `side` column

`side` is already selected in both the `games` and `papergames_games` queries; this change only forwards it into the unified push object.
