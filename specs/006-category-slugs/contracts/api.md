# API Contracts: Category Slug Refactor

All endpoints that accept or return `category` values change from integers to slug strings. No new endpoints are added.

---

## `GET /api/puzzles`

**Query params (changed)**:
- `category` — now a slug string (e.g. `?category=zugzwang`). Previously an integer. Required only when fetching puzzles for a specific category.

**Response (changed)**:
```json
{
  "categories": [
    {
      "id": "immediate_threat",
      "locked": false,
      "puzzles": [
        { "id": 42, "category": "immediate_threat", "goal_prompt": "...", "difficulty": 1 }
      ]
    },
    {
      "id": "forbidden_columns",
      "locked": true,
      "puzzles": []
    }
  ]
}
```

Previously `id` was an integer (1–6, missing 7). Now it is a slug string. All 7 categories are always present.

---

## `GET /api/puzzles/:id`

**Response (changed)**:
```json
{
  "id": 42,
  "category": "fork_setup",
  "move_string": "...",
  "goal_prompt": "...",
  ...
}
```

`category` was an integer; now a slug.

---

## `POST /api/puzzles/:id/check`

No change to request or response shape — `category` is not part of this payload.

---

## `POST /api/admin/generate`

**Request body (changed)**:
```json
{ "category": "zugzwang", "count": 5 }
```

`category` was an integer; now a slug. Server validates against `VALID_CATEGORIES` set.

---

## `GET /api/admin/candidates`

**Query params (changed)**:
- `category` — now a slug string filter. Previously integer.

**Response (changed)**:
```json
[
  { "id": 1, "category": "forbidden_columns", "status": "pending", ... }
]
```

---

## `GET /api/admin/candidates/stats`

**Response (changed)**:
```json
{
  "byCategory": {
    "immediate_threat": { "pending": 3, "approved": 10, "rejected": 2 },
    "forbidden_columns": { "pending": 0, "approved": 0, "rejected": 0 }
  }
}
```

Keys are now slug strings. Previously integer keys.

---

## `POST /api/admin/candidates/:id/approve`

No change — `category` is not part of the approval request. The candidate's stored `category` slug is copied to `puzzles.category` on approval.

---

## `POST /api/admin/candidates/:id/reject`

No change.

---

## `POST /api/admin/seed-puzzles`

**Request body (changed)**: any `category` fields in puzzle seed data must be slug strings.

---

## Error responses

Any endpoint that validates `category` now returns:
```json
{ "error": "invalid category" }
```
with HTTP 400 if the value is not in the valid slug set. Previously returned `"category must be integer 1–7"`.
