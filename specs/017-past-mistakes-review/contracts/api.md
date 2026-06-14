# API Contracts: Past Mistakes Review (Epic 3c)

---

## `GET /api/coach/queue`

**Purpose**: Returns the authenticated user's blunders, filtered by status. Replaces the old "next unresolved blunder" shape with a list shape.

**Auth**: `requireAuth` (inline check — `if (!req.user) return res.status(401).json({ error: 'unauthorized' })`). `requirePaid` guard REMOVED.

**Query params**:

| Param | Values | Default | Effect |
|---|---|---|---|
| `status` | `all`, `unreviewed`, `reviewed` | `all` | Filters by `resolved_at IS NULL` / `IS NOT NULL` |

**Supabase query**:
```js
let q = supabase
  .from('blunders')
  .select('id, board_state, move_played, correct_move, pattern_category, created_at, resolved_at')
  .eq('user_id', req.user.id)
  .order('created_at', { ascending: true })
  .limit(50);

if (status === 'unreviewed') q = q.is('resolved_at', null);
if (status === 'reviewed')   q = q.not('resolved_at', 'is', null);
```

Note: `puzzle_id` and the puzzles join are NOT selected (FR-024).

**`threat_cells` computation** (per blunder):
```js
function computeThreatCells(board_state, move_played) {
  const postBoard = new Board(board_state + String(move_played));
  const opponent = postBoard.currentPlayer;  // opponent's turn after blunder move
  const threatMap = postBoard.majorThreatCells();  // { "row,col": { rm, rn, ym, yn } }
  return Object.entries(threatMap)
    .filter(([, flags]) => opponent === 1 ? flags.rm : flags.ym)
    .map(([key]) => {
      const [row, col] = key.split(',').map(Number);
      return { col, row };
    });
}
```

Edge case: if `board_state` is empty string and `move_played` is valid, the computation still works (single-disc board). If `board_state + String(move_played)` would be an invalid movestring (e.g., full column), `new Board()` does not throw — colHeights handles it gracefully.

**Response shape** (`200 OK`):
```json
{
  "blunders": [
    {
      "id": "uuid",
      "board_state": "3344",
      "move_played": 2,
      "correct_move": 4,
      "pattern_category": "forced_block",
      "created_at": "2026-05-24T10:00:00Z",
      "resolved_at": null,
      "threat_cells": [{ "col": 5, "row": 0 }]
    }
  ],
  "total": 1
}
```

**Errors**:
- `401` — no `req.user`
- `503` — Supabase unavailable

---

## `POST /api/coach/queue/:blunderId/resolve`

**Purpose**: Marks a blunder as reviewed. Sets `resolved_at` to current UTC timestamp.

**Auth**: `requireAuth` (inline). `requirePaid` guard REMOVED.

**Path param**: `blunderId` — UUID string. Validation: `if (!blunderId || typeof blunderId !== 'string') return res.status(400).json({ error: 'invalid blunder id' })`. The old `parseInt` + `isNaN` check is REPLACED.

**Supabase query**:
```js
const { error } = await supabase
  .from('blunders')
  .update({ resolved_at: new Date().toISOString() })
  .eq('id', blunderId)
  .eq('user_id', req.user.id);  // ownership check preserved
```

**Response**: `204 No Content`

**Errors**:
- `400` — missing or empty `blunderId`
- `401` — no `req.user`
- `500` — Supabase error
- `503` — Supabase unavailable

**Note on ownership failure**: If the blunder belongs to a different user, Supabase returns 0 rows updated and no error. The endpoint returns `204` in this case (silent no-op). This matches the intent of the ownership check (adversary cannot learn whether a blunder ID exists).

---

## Frontend API Calls

### `MistakesListScreen` — fetch blunders

```js
GET /api/coach/queue?status=all
Authorization: Bearer <session.access_token>
```

Called: once on mount. Tab filtering (`all`/`unreviewed`/`reviewed`) is performed client-side by filtering the in-memory `blunders` array on `resolved_at`. No re-fetch on filter change.

### `MistakeDetailScreen` — mark reviewed

```js
POST /api/coach/queue/:blunderId/resolve
Authorization: Bearer <session.access_token>
```

On success (`204`): update local `isReviewed` state to `true`.
On error: revert the button to "Mark as reviewed" state (no silent failure per spec edge case).

### `MistakeDetailScreen` — Deep Reveal

```js
// Delegated entirely to <DeepRevealButton moves={blunder.board_state} candidateCol={blunder.correct_move} />
// The component handles POST /api/explain-move-llm internally.
```

### `MistakeDetailScreen` — LLM feedback flag

```js
// Delegated entirely to DeepRevealButton's internal "Flag this explanation" button.
// The component calls POST /api/llm-feedback with feature: 'explain-move-llm' (internal to the component).
```

Note: `DeepRevealButton` accepts an optional `feature` prop (defaults to `'explain-move-llm'`). `MistakeDetailScreen` passes `feature='past_mistakes'` to satisfy FR-015.
