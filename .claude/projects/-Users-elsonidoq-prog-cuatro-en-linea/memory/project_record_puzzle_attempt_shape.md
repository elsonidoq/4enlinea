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
