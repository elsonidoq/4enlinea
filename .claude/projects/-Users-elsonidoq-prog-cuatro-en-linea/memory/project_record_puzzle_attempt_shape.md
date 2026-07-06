---
name: project_record_puzzle_attempt_shape
description: Canonical shape for recordPuzzleAttempt — 6-field snake_case; wrong shapes silently corrupt stats
metadata:
  type: project
---

`store.recordPuzzleAttempt()` spreads its argument directly into IndexedDB. The canonical shape is:

```js
{ puzzle_id, device_uuid, moves_tried, outcome, first_attempt_correct, time_ms }
```

**Why:** The store does no schema validation — passing a different shape (e.g. `{ puzzleId, category, correct }`) silently writes an incompatible record that breaks Stats/accuracy aggregation. Discovered during Epic 2b spec review when FR-022 specified a compact shape that conflicted with the existing single-move caller at `ChallengeScreen.jsx:153`.

**How to apply:** Any new code path that records a puzzle attempt (Forbidden Columns, forced_win, future categories) must use this 6-field shape. Do not introduce a new shape without migrating all callers and the store simultaneously.

**Spec 030 change (not yet implemented):** After spec 030 ships, `device_uuid` is removed from the `POST /api/user/puzzle-attempts` server endpoint request body — the server derives it from `req.user.device_uuid`. The store method signature `recordPuzzleAttempt({ puzzle_id, device_uuid, ... })` is preserved, but the store's fetch call omits `device_uuid` from the body. See [[project_spec030_server_mediated_data_access]].


---

## (merged from `project_puzzle_advancement` — store.recordPuzzleAttempt must be called on correct answers for loadPuzzle to advance past the current puzzle)

`loadPuzzle` filters the puzzle pool by `solvedIds` from `store.getAllPuzzleAttempts()` and keeps `categoryPuzzleRef` pointing to the current puzzle ID. If `store.recordPuzzleAttempt` is not called after a correct answer, the puzzle is never added to `solvedIds`, the pool still contains it, and "Next puzzle" reloads the same puzzle forever.

**Why:** Discovered when implementing `handleForbiddenSubmit` — the function omitted the `store.recordPuzzleAttempt` call, causing the same forbidden_columns puzzle to reload on every "Next puzzle" click.

**How to apply:** Every correct-answer branch in `PuzzlesPage.jsx` (normal `handleColumnClick`, `handleForbiddenSubmit`, and any future submit handlers) MUST call `store.recordPuzzleAttempt` with `outcome: 'correct_first'` or similar. Wrong-answer attempts do not need recording for advancement, only for blunder tracking.
