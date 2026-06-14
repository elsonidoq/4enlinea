---
name: project_spec030_session_stats_bypattern_mismatch
description: "getAllSessionStats byPattern computation reads fields that don't exist in the actual stored data shape — always returns empty"
metadata: 
  node_type: memory
  type: project
  originSessionId: b8bee7ba-4574-4977-b206-f07b49fe5ae2
---

`GET /api/user/session-stats/all` computes `byPattern` from fields that don't exist in the stored jsonb shape. Both the old `SupabaseStore.getAllSessionStats()` and the new server endpoint are affected.

**Stored shape** (from `saveSessionStats` via PuzzlesPage.updateStats):
```json
{ "immediate_threat": { "attempted": 5, "correct": 3 }, "forced_block": { "attempted": 3, "correct": 2 } }
```
This is stored as the `stats` jsonb column in `session_stats`.

**Old SupabaseStore code** read `stats.category` (singular string) and `stats.accuracy` (number) — neither exists → `byPattern` always empty.

**New server endpoint** (userRoutes.js T009) reads `stats.byPattern` (nested object) — doesn't exist → `byPattern` always empty.

**Why:** `byPattern` has always been effectively `{}` in production. The computation should iterate `Object.entries(stats)` where each key is a category slug and each value is `{ attempted, correct }`, computing `accuracy = correct / attempted`.

**How to apply:** When fixing, update the `byPattern` computation in `userRoutes.js` T009 to match the actual stored shape. The `byPattern` keys ARE the category slugs directly in the `stats` object. Weight per session row should use `sum(values.attempted)` or just `1` per row.

See also: [[project_spec030_server_mediated_data_access]]
