---
name: project_stats_architecture
description: Challenge stats are computed live from puzzle_attempts via GET /api/stats, not session_stats
metadata:
  type: project
---

Challenge accuracy stats (overall + by-pattern) come from `GET /api/stats`, which aggregates `puzzle_attempts JOIN puzzles` server-side for the authenticated user. `SupabaseStore.getStats()` calls this endpoint.

The `session_stats` table still exists in the DB but is no longer written to by the challenge flow — `PostSetSummaryScreen` no longer calls `saveChallengeSession`. The table is orphaned for challenge data (it may still be used by old `saveSessionStats` code paths elsewhere).

Anonymous users fall back to `IndexedDBStore.getLastChallengeSession()` for the accuracy card (requires completing a full set to land on PostSetSummaryScreen, which no longer saves anything either — so anonymous stats are effectively broken until Epic 3a/sparring writes to the store).

**Why:** `saveChallengeSession` was never populating `session_stats` because the session object lacked a `date` field (IDB keyPath) and Supabase upsert silently failed. Computing from `puzzle_attempts` (already reliably populated) was simpler and more correct.


---

## (merged from `project_spec030_session_stats_bypattern_mismatch` — getAllSessionStats byPattern computation reads fields that don't exist in the actual stored data shape — always returns empty)

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

See also: `docs/architecture/api-conventions.md` §`/api/user/*` ownership invariants + session_stats write asymmetry
