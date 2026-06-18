# Research: Papergames Self-Service Import

All research questions were resolved by reading source files before writing plan.md.
No external lookup was required.

---

## Decision: Solver spawning per import job

**Question**: Can `createSolverProcess()` be called independently, or is it a singleton?

**Finding**: `c4solver-wrapper.js` exports `createSolverProcess()` as a stateless factory
function. The server's singleton is created once at startup by calling it. `importForUser()`
calls it again to get a dedicated child process, and calls `.destroy()` in a `finally` block
when the job finishes.

**Decision**: No new abstraction needed. Import job spawns its own process; interactive users
are never blocked.

**Alternatives considered**: Sharing the singleton — rejected because the solver serializes
concurrent queries via a promise chain, so import analysis would queue behind interactive
requests (violating FR-019 and constitution §V).

---

## Decision: Profile endpoint extension path

**Question**: Where does `GET /api/user/profile` read its data from, and what is the cheapest
way to add `papergames_id` + `last_import_at`?

**Finding**: The handler (userRoutes.js line 86) returns data from `req.user`, which is
populated by `loadUser` middleware in `index.js` (line 329). `loadUser` currently SELECTs
`tier, deep_reveal_count, deep_reveal_reset_at, device_uuid`. Extending this SELECT is the
only change needed — the profile GET handler simply adds the new fields to its response.

**Decision**: Extend `loadUser`'s SELECT. No new DB query in the profile handler.

**Alternatives considered**: Adding a separate SELECT in the profile handler — rejected because
it would add a redundant DB round-trip on every authenticated request.

---

## Decision: Dedup mechanism for papergames blunders

**Question**: The spec says unique index on `blunders(papergames_game_id, move_index)` — but
`move_index` does not exist as a column. How to implement?

**Finding**: `board_state` (the position movestring before the blunder) encodes the ply index
for any deterministic game: `board_state.length === move_index`. So `move_index` can be added
as a new nullable integer column computed at insert time from `board_state.length`.

**Decision**: Add `move_index integer` nullable to `blunders` in migration 047. Populate it
from `board_state.length` in `insertGameBlunder()`. Create partial unique index on
`(papergames_game_id, move_index) WHERE papergames_game_id IS NOT NULL`. Sparring blunders
have `papergames_game_id IS NULL` and are excluded from the index.

**Alternatives considered**: Using `(papergames_game_id, board_state)` as the unique key —
works but adds a text-column unique index which is larger and harder to introspect. The spec
explicitly names `move_index`.

---

## Decision: insertGameBlunder() raw vs. routed bulk insert

**Question**: The existing CLI script calls `supabase.from('blunders').insert(toInsert)` in
bulk. Should `papergamesImporter.js` do the same?

**Finding**: Bulk insert with a unique constraint causes silent full-batch loss when any single
row is a duplicate (the entire transaction rolls back per `feedback_bulk_insert_unique_constraint.md`).
`insertGameBlunder()` already catches `23505` per-row and silently skips. It also has the tag
guard and will gain the `move_index` population.

**Decision**: `papergamesImporter.js` calls `insertGameBlunder()` per blunder, never bulk.

---

## Decision: Migration split — 047 vs 047+048

**Question**: Should the users-column changes and the blunders-column + index changes go in the
same migration file?

**Finding**: The spec says "same migration (or a follow-on 048_)." All three changes are
additive and independent. They can safely coexist in one file.

**Decision**: Single file `047_papergames_user_columns.sql`. Rationale: fewer migration files,
all changes are additive. No `048` file is created unless the content grows unwieldy.

---

## Decision: `last_import_at` update timing

**Question**: When exactly should `last_import_at` be written?

**Finding**: The spec says: after a successful run, update to current timestamp; on API error,
do not update. "Successful run" means the job reaches `status: "done"` (even with some
skipped games).

**Decision**: Write `last_import_at = now()` at the end of `importForUser()` before returning
`{ imported, skipped }`, only if no fatal error occurred. If `importForUser()` throws, the
caller marks the job `error` and `last_import_at` is not updated.
