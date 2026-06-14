# Research: Server-Mediated Data Access

**Feature**: 030-server-mediated-data-access  
**Date**: 2026-06-12

All unknowns were resolved by inspecting existing code and the live schema. No external research was required.

---

## Decision 1: session_stats schema — flat columns vs jsonb

**Question**: `SupabaseStore.saveSessionStats(stats)` does `.upsert({ user_id, ...stats })` which looks like it spreads stats into top-level columns. But `db-schema.md` says the table only has `(user_id, date, stats jsonb)`.

**Resolution**: The table has exactly 3 columns. The Supabase JS client silently drops unknown keys in upsert payloads when using the service-role key. The spread works because the incoming `stats` object has shape `{ date, stats: {...} }` — only `date` and `stats` match real columns. No schema contradiction; Supabase ignores the extra keys.

**Impact on endpoints**:
- `POST /api/user/session-stats` accepts `{ date, ...statsFields }` and stores `{ user_id, date, stats: body }` — the entire body becomes the `stats` jsonb.
- `GET /api/user/session-stats` returns the full row `{ user_id, date, stats }`. Callers access `.stats` from the returned value. This is unchanged behavior since SupabaseStore.getSessionStats() already returned the full DB row object.

---

## Decision 2: Full-replace vs jsonb merge for session_stats upserts

**Question**: Should `POST /api/user/session-stats` and `POST /api/user/challenge-session` merge the incoming body into the existing `stats` column or fully replace it?

**Resolution**: Full-replace. The two endpoints write different blob shapes to the same `stats` jsonb column. If both run on the same `(user_id, date)`, last writer wins. Merging with the `||` operator would produce a corrupted hybrid blob. This matches current production behavior and is the accepted trade-off per FR-019 and the spec's edge case section.

**Supabase upsert syntax**:
```js
await supabase
  .from('session_stats')
  .upsert({ user_id: req.user.id, date, stats: body }, { onConflict: 'user_id,date' });
```

---

## Decision 3: Atomicity in POST /api/user/migrate

**Question**: Should the migrate endpoint use a Postgres transaction across all 5 writes?

**Resolution**: No. The Supabase JS client does not expose multi-table Postgres transactions without a custom PL/pgSQL RPC function. Adding a custom function would require a schema migration, which violates the spec's "No new tables or columns" assumption. Instead, the endpoint wraps all 5 writes in a `try/catch`. Any failure returns 500 and IndexedDB is NOT cleared (client-side guard in `IndexedDBStore`). Since this endpoint is only called once at sign-in and the user must be authenticated, the failure window is narrow and acceptable.

---

## Decision 4: Route registration order for session-stats endpoints

**Question**: Should `GET /api/user/session-stats/all` be registered before or after `GET /api/user/session-stats`?

**Resolution**: BEFORE. Express uses first-match routing. If `/api/user/session-stats` is registered first with no path params, a request to `/api/user/session-stats/all` would be captured by it only if defined as a prefix — but in Express, exact paths and query-parameterized paths don't capture sub-paths. However, if `/api/user/session-stats` were registered as `/api/user/session-stats/:something`, then `/all` would be captured. Since we use `?date=` query param (not path param), the order doesn't matter for Express matching. But we register `/all` first as a defensive measure consistent with the api-conventions.md route ordering principle.

---

## Decision 5: SupabaseStore — default values on missing token

**Question**: If `auth.getSession()` returns no token, what should each method return?

**Resolution**: Return the same default as the current implementation (pre-refactor). Never throw. This mirrors how `getStats()` already behaves — it guards on `if (!token) return null`. The defaults per method:

| Method | Default when no token |
|---|---|
| `getProfile()` | `{ device_uuid: null, tier: 'free', deep_reveal_count: 0, deep_reveal_reset_at: new Date().toISOString() }` |
| `getSessionStats(date)` | `null` |
| `saveSessionStats(stats)` | `void` (silent no-op) |
| `getAllSessionStats()` | `{ rows: [], byPattern: {} }` |
| `recordPuzzleAttempt(attempt)` | `void` (silent no-op) |
| `getLessonProgress()` | `[]` |
| `saveLessonProgress(lessonId, status)` | `void` (silent no-op) |
| `getSparringRecord()` | `{ W: 0, L: 0, D: 0 }` |
| `saveSparringRecord(result)` | `void` (silent no-op) |
| `getLastChallengeSession()` | `null` |
| `saveChallengeSession(session)` | `void` (silent no-op) |
| `getStreak()` | `{ streak_count: 0, last_active_date: null }` |
| `recordActivityDay()` | `void` (silent no-op) |

---

## Decision 6: duplicate puzzle_attempts in migrate

**Question**: If the same puzzle attempt is uploaded twice (e.g., network retry), should the insert fail or silently succeed?

**Resolution**: Use `ignoreDuplicates: true` option in Supabase bulk upsert, equivalent to `INSERT ... ON CONFLICT DO NOTHING`. The `puzzle_attempts` table has no unique constraint on `(user_id, puzzle_id)` — duplicates here are at the row level (same PK, which can't happen on insert). The realistic scenario is a network retry sending the same batch twice. Guard with try/catch; ignore `23505` errors on the batch insert. The spec explicitly allows this pattern.

---

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Extract routes to `server/userRoutes.js` | Not required by spec; single-file server is the existing convention; refactor deferred |
| Postgres transaction for migrate | Requires new RPC function (schema change) for a non-realistic failure mode |
| jsonb merge (`||`) for session_stats | Two endpoints write incompatible shapes; merge produces corrupted blob |
| Validate all 5 migrate fields strictly | Spec allows empty arrays — no-op per data type; strict validation would break the empty-IndexedDB edge case |
