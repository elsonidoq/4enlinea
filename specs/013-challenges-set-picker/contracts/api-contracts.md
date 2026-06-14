# API Contracts: Epic 2a — Challenges

All endpoints follow the conventions in `docs/architecture/api-conventions.md`.

---

## `GET /api/puzzles/counts`

Returns approved puzzle counts for all categories.

**Auth**: None required. `loadUser` middleware runs but result is not used.
**Rate limit**: 120 req/min (falls under `/api/` catch-all).

**Request**: No parameters.

**Response `200 OK`**:
```json
{
  "counts": {
    "immediate_threat": 12,
    "forced_block": 8,
    "double_threat": 5,
    "forced_win": 0,
    "forbidden_columns": 3,
    "z_threat": 7,
    "claimeven": 9,
    "undercut": 4,
    "overcut": 2,
    "figure_7": 6,
    "j_shape": 0
  },
  "sets": [
    { "slug": "immediate_threat", "displayName": "Spot the Win", "stars": 1, "description": "...", "free": true },
    { "slug": "forced_block", "displayName": "Block the Threat", "stars": 1, "description": "...", "free": true }
  ]
}
```

Notes:
- All categories in `CATEGORY_ORDER` are always present in `counts`, even if count is 0.
- `mixed` is NOT included in `counts` — it has no DB slug.
- Counts reflect `is_active = true` rows only.
- `sets` is the ordered array from `CHALLENGE_SETS` in `server/challengeSets.js`. The frontend renders SetCards from `sets`, filtering out slugs where `counts[slug] === 0`.
- This combined shape avoids a second API call for set metadata.

**Response `503`**: `{ "error": "database unavailable" }` when `supabase` is null.

**Route registration constraint**: Must appear before `GET /api/puzzles/:id` in `server/index.js`.

---

## `GET /api/puzzles/draw`

Returns a random draw of approved puzzles for a category session.

**Auth**: None required for free categories. Pro categories return 403 for unauthenticated/free-tier users.
**Rate limit**: 120 req/min.

**Query Parameters**:
| Param | Type | Default | Constraints |
|---|---|---|---|
| `category` | `string` | required | Must be in `VALID_CATEGORIES` OR equal `'mixed'` |
| `n` | `integer` | 8 | 1–8 inclusive |

**Validation flow**:
1. If `category === 'mixed'`: check Pro access → 403 if not Pro; else draw from all free-or-owned categories.
2. If `category` not in `VALID_CATEGORIES`: 400.
3. If `!userCanAccessCategory(req.user, category)`: 403.
4. Validate `n` is integer 1–8; default to 8 if absent.

**Response `200 OK`**:
```json
{
  "puzzles": [
    {
      "id": "uuid",
      "category": "immediate_threat",
      "move_string": "334455",
      "interaction_mode": "single_move",
      "highlight_metadata": null,
      "correct_col": null,
      "user_player": 1
    }
  ]
}
```

Notes:
- `puzzles` may have fewer than `n` entries if fewer approved puzzles exist for the category.
- Draws are without replacement within the response.
- Solved-puzzle exclusion is NOT applied server-side — client passes already-solved puzzle IDs to filter locally if needed (current design: no exclusion on draw; exclusion happens via `recordPuzzleAttempt` + filtering in future sessions).

**Errors**:
- `400 { "error": "invalid category" }` — not in `VALID_CATEGORIES` and not `'mixed'`
- `400 { "error": "invalid n" }` — n not integer or out of range
- `403 { "error": "Pro subscription required" }` — paid category or `mixed`, user is free/anonymous
- `503 { "error": "database unavailable" }` — supabase null

**Route registration constraint**: Must appear before `GET /api/puzzles/:id` in `server/index.js`.

---

## `POST /api/evaluate-move`

Evaluates a single move against solver scores and returns quality + i18n keys.

**Auth**: None required. `loadUser` middleware runs (result unused for gating).
**Rate limit**: 120 req/min.

**Request Body**:
```json
{
  "movestring": "334455",
  "col": 2,
  "category": "immediate_threat"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `movestring` | `string` | yes | `/^[0-6]{0,42}$/` |
| `col` | `integer` | yes | 0–6 inclusive |
| `category` | `string` | no | If present, used as phrase pool key. No server-side validation — unknown slugs silently fall through to `patternTag` fallback. |

**Server processing**:
1. Validate `movestring` against `/^[0-6]{0,42}$/` and `col` as integer 0–6.
2. If `movestring` is empty, use `EMPTY_BOARD_SCORES`; otherwise query persistent solver for scores.
3. Call `scoreMove(scores, col)` → `{ badge, quality, bestCol }`.
4. Call `classify(movestring, col, scores)` → `{ tag: patternTag }`.
5. Determine `phrasePoolKey`: if `category` present, use it; else use `patternTag`.
6. Randomly select one key from `coach.<phrasePoolKey>.<quality>.*` pool → `coachPhraseKey`.
7. Randomly select one key from `eval.<phrasePoolKey>.<quality>.summary.*` pool → `summaryLineKey`.
8. Set `coachMood`: `optimal` → `'happy'`; `suboptimal` → `'think'`; `blunder` → `'oops'`.

**Response `200 OK`**:
```json
{
  "badge": "good",
  "quality": "optimal",
  "coachPhraseKey": "coach.immediate_threat.optimal.0",
  "coachMood": "happy",
  "summaryLineKey": "eval.immediate_threat.optimal.summary.0",
  "patternTag": "immediate_threat"
}
```

Notes:
- `coachPhraseKey` and `summaryLineKey` are full dotted key strings. Client calls `t(coachPhraseKey)` to resolve English text.
- Server never returns resolved English strings in these fields.
- `patternTag` is the `classify()` output — display metadata only, not used for phrase-pool selection when `category` is present.

**Errors**:
- `400 { "error": "invalid movestring" }` — fails regex
- `400 { "error": "invalid col" }` — not integer 0–6
- `500 { "error": "solver error: ..." }` — solver IPC failure

---

## `GET /api/challenge-sets` (NOT a new endpoint)

The Set Picker does NOT have a dedicated server endpoint for challenge set metadata. Set card metadata (displayName, stars, description, free flag) is bundled into the `GET /api/puzzles/counts` response as the `sets` array (see above). This avoids a second API call.
