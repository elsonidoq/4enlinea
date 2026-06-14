---
name: reference_api_scores_endpoint
description: POST /api/scores — HTTP method, request body, response shape, and sentinel value for invalid columns
metadata:
  type: reference
---

`POST /api/scores` (NOT GET) — `server/index.js`

**Request body**: `{ moves: string }` (the movestring so far)

**Response**: `{ scores: number[7] }` — per-column solver scores from the current player's perspective. Invalid/full columns are masked with `INVALID_MOVE = -1000` (exported from `aiDifficulty.js`).

**Filtering rule**: always filter `score > INVALID_MOVE` (strictly greater) before ranking columns. Never treat a masked column as a candidate.

**Callers**: used by the deliberate-mistake mechanic (`secondBestColumn`) and the Hint overlay. Both must filter sentinel before ranking.

**Related**: [[reference_c4solver_scores]] for score semantics; `INVALID_MOVE` is at the top of `src/lib/aiDifficulty.js`.
