# API Contract: Lesson Endpoints

## `GET /api/lessons`

Returns the lesson catalog. No authentication required.

**Request**: No params, no body.

**Response 200**:
```json
[
  { "id": "lesson-01-spot-the-win", "title": "Spot the Win", "order": 1, "free": true },
  { "id": "lesson-02-block-before-build", "title": "Block Before You Build", "order": 2, "free": true }
]
```

- Array sorted ascending by `order` (integer derived from filename prefix).
- Returns empty array `[]` if no lesson files are present.
- Node state (`done`/`current`/`unlocked`/`locked`) is NOT included — computed client-side.

---

## `GET /api/lessons/:id`

Returns full lesson JSON for the given `id`. No authentication required.

**Path param**: `id` — lesson slug string (e.g. `"lesson-05-claimeven"`).

**Response 200** — full lesson object:
```json
{
  "id": "lesson-05-claimeven",
  "title": "Claimeven",
  "order": 5,
  "free": true,
  "userPerspective": "yellow",
  "slides": [
    {
      "coachMessages": [
        { "text": "Red just played low.", "faded": true },
        { "lead": "Yellow's secret:", "text": "claim the even square above Red." }
      ],
      "boardSpec": ["dg", "g", "dgd", "gdg", "dg", "d", ""],
      "overlays": [
        { "c": 2, "r": 3, "type": "claim" }
      ],
      "legendItems": [
        { "type": "claim", "label": "Even square Yellow should own" }
      ],
      "infoProse": "By answering above each Red disc, Yellow guarantees the even rows."
    }
  ],
  "socratic": {
    "boardSpec": ["d", "g", "dg", "gd", "d", "", ""],
    "correctCol": 4
  },
  "confirmationCategory": "claimeven",
  "confirmationCount": 3
}
```

**Response 404**:
```json
{ "error": "not_found" }
```

---

## Notes

- Both endpoints load from in-memory cache populated at server startup via `lessonLoader.js`.
- No DB query at request time — latency is O(1) (SC-006: < 50 ms).
- `order` is derived from filename (e.g. `lesson-05-claimeven.json` → `order: 5`) and attached
  to the in-memory object at load time.
- Validation failures during load are logged to `console.error`; the server does NOT crash.
