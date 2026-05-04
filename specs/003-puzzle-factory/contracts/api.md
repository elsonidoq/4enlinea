# API Contracts: Puzzle Factory

All endpoints are guarded by `requireLocalhost` — accessible only from 127.0.0.1.

---

## POST /api/admin/generate

Trigger a candidate generation job for one category.

**Request body**:
```json
{
  "category": 3,
  "count": 30,
  "seed": 42
}
```
- `category`: integer 1–7 (required)
- `count`: integer 1–100, default 30 — target number of candidates to produce before stopping
- `seed`: integer (optional) — PRNG seed for reproducibility. If omitted, the server picks a random seed and returns it in the response. Re-running with the same seed and category produces the same candidate positions.

**Response 200**:
```json
{
  "generation_run_id": "2026-05-04T10:23:00Z-cat3-seed42",
  "inserted": 28,
  "seed": 42,
  "duration_ms": 4200
}
```
- `inserted` may be less than `count` if the simulation exhausts positions meeting the predicate.
- `seed` is always returned so the annotator can record it for later reproduction.

**Response 400**: invalid category or count.

---

## GET /api/admin/candidates/stats

Dashboard counts per category.

**Response 200**:
```json
{
  "categories": [
    { "category": 1, "pending": 14, "approved": 3, "rejected": 7 },
    { "category": 2, "pending": 0,  "approved": 0, "rejected": 0 },
    ...
  ]
}
```

---

## GET /api/admin/candidates

List candidates for a given category. Defaults to pending only.

**Query params**:
- `category` (required): integer 1–7
- `status` (optional): `pending` | `approved` | `rejected`, default `pending`
- `limit` (optional): integer 1–100, default 50
- `offset` (optional): integer, default 0

**Response 200**:
```json
{
  "candidates": [
    {
      "id": "uuid",
      "category": 3,
      "move_string": "4453362",
      "solver_scores": [-5, -3, 0, 18, -2, -1, -4],
      "classifier_tags": ["double_threat", "diagonal_fork"],
      "status": "pending",
      "created_at": "2026-05-04T10:23:01Z"
    }
  ],
  "total": 14
}
```

---

## POST /api/admin/candidates/:id/approve

Approve a candidate, export it as a puzzle, and mark it reviewed.

**Request body**:
```json
{
  "goal_prompt": "Find the move that creates two simultaneous threats.",
  "difficulty": 2,
  "cooperative_ai_moves": []
}
```
- `goal_prompt`: string (required)
- `difficulty`: integer 1–3 (required)
- `cooperative_ai_moves`: integer array of 0-indexed columns (required; empty for single-move puzzles)

**Response 201**:
```json
{
  "puzzle_id": "uuid",
  "candidate_id": "uuid"
}
```

**Response 404**: candidate not found.  
**Response 409**: candidate already reviewed.

---

## POST /api/admin/candidates/:id/reject

Reject a candidate with a reason. If reason is `false_positive`, also creates a `false_positive_records` entry.

**Request body**:
```json
{
  "reason": "false_positive",
  "note": "The double threat is an artefact — column 4 is blocked by the opponent's piece above."
}
```
- `reason`: one of `not_educational` | `end_game` | `false_positive` | `other` (required)
- `note`: string, optional (used only when reason is `false_positive`, ignored otherwise)

**Response 200**:
```json
{
  "candidate_id": "uuid",
  "false_positive_record_id": "uuid"
}
```
`false_positive_record_id` is present only when `reason === 'false_positive'`.

**Response 404**: candidate not found.  
**Response 409**: candidate already reviewed.

---

## POST /api/admin/candidates/reject-batch

Reject all pending candidates for a category (batch reject).

**Request body**:
```json
{
  "category": 3,
  "reason": "end_game"
}
```

**Response 200**:
```json
{
  "rejected": 14
}
```

---

## GET /api/admin/false-positives

Export all false-positive records, optionally filtered by category.

**Query params**:
- `category` (optional): integer 1–7

**Response 200**:
```json
{
  "false_positives": [
    {
      "id": "uuid",
      "candidate_id": "uuid",
      "category": 3,
      "move_string": "4453362",
      "solver_scores": [-5, -3, 0, 18, -2, -1, -4],
      "annotator_note": "Double threat is not real — col 4 blocked.",
      "created_at": "2026-05-04T11:00:00Z"
    }
  ],
  "total": 3
}
```

---

## GET /api/admin/scores

Fetch solver scores for a board position (used by workspace column-click interaction). Reuses the existing solver infrastructure.

**Query params**:
- `moves`: string of column digits 1–7 (required)

**Query params**:
- `moves`: string of column digits 1–7 (required) — the board state AFTER the annotator's clicked column is appended
- `category`: integer 1–7 (required) — used to evaluate the goal predicate server-side

**Response 200**:
```json
{
  "scores": [-5, -3, 0, 18, -2, -1, -4],
  "classifier_tags": ["double_threat"],
  "predicate_pass": true
}
```
- `predicate_pass`: whether the position (with the clicked column played) satisfies the goal predicate for the given category. Evaluated by `evaluatePredicate` in `predicates.js`. Used by `PredicateChecklist` to show green/red — predicate logic is NOT duplicated in the browser.

**Performance budget**: response within 2 seconds (aligned with SC-005 and Constitution Principle V).
