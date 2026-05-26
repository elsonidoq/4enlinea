# API Contracts: Interaction Mode & forced_win Refactor

## Modified: GET /api/puzzles/:id

### Validation

- IF `:id` is not a valid UUID THEN 400 `{ "error": "invalid puzzle id" }`.

### Responses

**200 — success**
```json
{
  "id": "uuid",
  "category": "forced_win",
  "moveString": "4437...",
  "goalPrompt": "...",
  "goalPredicateType": "forced_win",
  "cooperativeAiMoves": [],
  "difficulty": 2,
  "interactionMode": "sequence"
}
```

`interactionMode` is `"single_move"` for all existing categories; `"sequence"` for `forced_win`.

**403 — access denied**
```json
{ "error": "This category requires a paid subscription" }
```

**404 — not found**
```json
{ "error": "puzzle not found" }
```

**503 — database unavailable**
```json
{ "error": "database unavailable" }
```

---

## New: POST /api/puzzles/:id/sequence/move

Stateless per-move validation for sequence-mode puzzles.

### Request

```json
{
  "position": "443712...",
  "col": 3
}
```

- `position`: Full column-sequence string (1-indexed columns) representing the board state **before** this move. Must start with the puzzle's `move_string`.
- `col`: 0-indexed column the learner is playing (0–6).

### Validation

- IF `position` does not match `^[1-7]{0,41}$` THEN 400 `{ "error": "position must be a string of 0–41 digits 1–7" }`.
- IF `col` is not an integer 0–6 THEN 400 `{ "error": "col must be an integer 0–6" }`.
- IF the puzzle has `interaction_mode != 'sequence'` THEN 400 `{ "error": "Use /sequence/move for sequence-mode puzzles" }`.
- IF the specified column is full THEN 400 `{ "error": "Column is full" }`.
- IF the caller does not have paid access and `category = 'forced_win'` THEN 403 `{ "error": "This category requires a paid subscription" }`.
- IF an immediate winning opportunity for the learner already exists in `position` before the move (FR-006a) THEN 200 `{ "outcome": "fail", "reason": "You had an immediate win available — play through the forcing sequence instead." }`. This covers direct four-in-a-row attempts: a move that would complete a four-in-a-row implies the winning column was already an immediate threat before the move.

### Responses

**200 — continue**
```json
{ "outcome": "continue", "aiCol": 2 }
```

**200 — success**
```json
{ "outcome": "success" }
```

**200 — fail**
```json
{ "outcome": "fail", "reason": "Move was not forcing: no new immediate threat created." }
```

**400 — bad request**
```json
{ "error": "position must be a string of 0–41 digits 1–7" }
```

**400 — bad request** (see Validation above for all 400 cases)

**403 — access denied**
```json
{ "error": "This category requires a paid subscription" }
```

**404 — puzzle not found**
```json
{ "error": "puzzle not found" }
```

Note: no solver is called in this endpoint — all validation and AI response are bitboard-only. There is no 500 "solver unavailable" path.

---

## Modified: POST /api/puzzles/:id/check (guard)

Returns 400 if the puzzle has `interaction_mode = 'sequence'`:
```json
{ "error": "Use /sequence/move for sequence-mode puzzles" }
```

Existing single-move behaviour is unchanged.

---

## Modified: POST /api/admin/candidates/:id/approve

The server now computes and sets `interaction_mode` during approval:
- IF `category === 'forced_win'` THEN `interaction_mode = 'sequence'`
- Otherwise THEN `interaction_mode = 'single_move'`

No new fields required in the request body. The `interaction_mode` value is added to the Supabase `puzzles` insert call (alongside `category`, `move_string`, `goal_prompt`, etc.).

### Request (existing fields, unchanged)

```json
{
  "goal_prompt": "string (required)",
  "difficulty": 1 | 2 | 3,
  "cooperative_ai_moves": []
}
```

### Responses

**201 — created**
```json
{ "puzzle_id": "uuid", "candidate_id": "uuid" }
```

**400 — validation error**
```json
{ "error": "goal_prompt is required" }
```
Other 400 messages: `"difficulty must be 1–3"`, `"cooperative_ai_moves must be an array"`.

**404 — candidate not found**
```json
{ "error": "candidate not found" }
```

**409 — already approved**
```json
{ "error": "candidate already approved" }
```

**500 — database error**
```json
{ "error": "<supabase error message>" }
```

**503 — database unavailable**
```json
{ "error": "database unavailable" }
```
