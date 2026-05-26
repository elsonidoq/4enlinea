# API Contract: New Puzzle Categories

Covers only the fields that change or are added by this feature.
All other fields on existing endpoints are unchanged.

---

## GET /api/puzzles/:id — additional fields

The response gains two new fields:

```json
{
  "highlightMetadata": <object | null>,
  "correctCol": <int | null>
}
```

`highlightMetadata` matches the Highlight Metadata Schema defined in `spec.md`.
`correctCol` is the 0-indexed correct column, required by `evaluatePredicate` for
`claimeven`, `figure_7`, and `j_shape`; `null` for categories that derive the
correct column from solver scores or `highlightMetadata` at evaluation time.

Both fields must be added to the DB SELECT on `puzzles` and included in the
JSON response object.

Examples:

```json
// z_threat — highlightMetadata carries the column; correctCol is null
{ "highlightMetadata": { "type": "capsule", "column": 3, "fromRow": 2, "toRow": 4, "badgeCount": 3 }, "correctCol": null }

// undercut — correctCol is null; column derived from highlightMetadata at eval time
{ "highlightMetadata": { "type": "cells", "cells": [
  { "column": 3, "row": 3, "role": "killing_threat" },
  { "column": 3, "row": 5, "role": "dead_threat" }
]}, "correctCol": null }

// overcut
{ "highlightMetadata": { "type": "cells", "cells": [
  { "column": 3, "row": 2, "role": "neutralised_threat" },
  { "column": 3, "row": 4, "role": "major_threat" }
]}, "correctCol": null }

// claimeven — no highlight; correct column stored explicitly
{ "highlightMetadata": null, "correctCol": 2 }

// figure_7
{ "highlightMetadata": { "type": "cells", "cells": [
  { "column": 2, "row": 0, "role": "pattern_piece" }
]}, "correctCol": 4 }

// j_shape
{ "highlightMetadata": { "type": "cells", "cells": [
  { "column": 3, "row": 1, "role": "pattern_piece" }
]}, "correctCol": 4 }
```

---

## POST /api/admin/candidates/:id/approve — no new request body fields

The request body is **unchanged** for this feature. The server reads
`highlight_metadata` and `correct_col` directly from the candidate row (via its
existing SELECT on `candidates`) and copies them to the puzzle INSERT. The client
does not send these fields.

---

## DB changes required

```sql
ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS highlight_metadata jsonb DEFAULT NULL;
-- correct_col already exists on puzzles from earlier migrations
GRANT SELECT ON puzzles TO anon, authenticated;  -- follows migration 012 pattern
```

The `highlight_metadata` column must be included in the migration referenced by
FR-009. The approve endpoint must add `highlight_metadata` and `correct_col` to
its candidate SELECT and puzzle INSERT (FR-023).
