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
