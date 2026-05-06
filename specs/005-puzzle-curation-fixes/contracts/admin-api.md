# Admin API Contracts — Feature 005

Only endpoints that change in this feature are documented here. Unchanged endpoints are omitted.

---

## POST /api/admin/generate

Generates puzzle candidates and stores them in the `candidates` table.

**No change to request schema.**

**Response — candidate object now includes new fields:**

```jsonc
// Each element of data.candidates
{
  "id": "uuid",
  "category": 1,
  "move_string": "4455...",
  "solver_scores": [3, 5, 7, 8, 7, 5, 3],
  "classifier_tags": ["immediate_threat"],
  "status": "pending",
  "highlight_cells": [                    // NEW — null for legacy records
    { "col": 3, "row": 2, "role": "hint" }
  ],
  "debug_trace": {                        // NEW — null for legacy records
    "temperature_p1": 1.23,
    "temperature_p2": 0.87,
    "termination": "win",
    "plies": [
      { "ply": 0, "player": 1, "scores": [...], "weights": [...], "sampled_col": 3 }
    ]
  }
}
```

---

## GET /api/admin/candidates

Returns pending candidates for curation review.

**No change to request schema.**

**Response — candidate objects include `highlight_cells` and `debug_trace` fields** (same shape as above; null if legacy record).

---

## POST /api/admin/candidates/reject-batch

Deletes (or rejects) all pending candidates for a category.

**No API change.** UI-only rename: button label changes from "Reject All" to "Delete all pending"; confirmation text updated. The endpoint behavior is unchanged.

---

## Notes on backward compatibility

- Legacy candidate records (inserted before this feature) have `highlight_cells = null` and `debug_trace = null`.
- The curation UI handles null gracefully: falls back to `deriveHighlightCol` for highlights, shows "no trace available" for the debug panel.
- No existing API callers outside the admin curation flow consume `highlight_cells` or `debug_trace`.
