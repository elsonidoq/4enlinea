---
name: project_stats_architecture
description: Stats-screen accuracy is PUZZLE accuracy from puzzle_attempts — no average-game-accuracy metric exists anywhere in the app
metadata: 
  node_type: memory
  type: project
  originSessionId: 38a71538-1257-4f4a-bc47-fb9ea7d2669c
  modified: 2026-08-01T23:40:45.381Z
---

## The Stats "avg accuracy" card is puzzle accuracy — game accuracy has no aggregate at all

`StatsScreen.jsx`'s `t('stats.avg_accuracy')` card renders the `accuracy` value set from
`store.getStats()` — i.e. **puzzle** accuracy over `puzzle_attempts`. It has nothing to do with
games, board-move optimality, or the per-game accuracy badge. `stats.avg_accuracy` is an **i18n
label key**, not a data field: grepping it across `src/`, `server/`, and `server/migrations/` finds
exactly one hit, the label itself.

**There is no average-game-accuracy metric anywhere in the app.** Game accuracy exists only as a
per-game badge (`PastGamesListScreen`, `ReviewScreen`). Nothing averages it.

**Why:** the label reads as though it were about games, and two independent agents in one session
assumed it was — one wrote a code citation for it into a spec review as a "game accuracy surface",
and a product decision to "filter that average to board-decided games" was taken before anyone
checked that such an average existed. Any request to change, filter, or exclude games from "the
accuracy stat" is a request to **build a new metric**, not to modify one.

**How to apply:** when a task mentions accuracy, first establish *which* accuracy — puzzle
(aggregated, on Stats) or game (per-game only, on Past Games / Review). See
[[feedback_verify_at_the_source_layer]]; the label is the representation layer, `getStats()` is
where the truth lives.

## Where challenge stats come from

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
