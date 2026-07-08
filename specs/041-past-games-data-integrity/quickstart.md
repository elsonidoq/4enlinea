# Quickstart: Verifying Epic 1 — Past Games & Mistakes: Server Data Integrity

Manual verification steps mapped to the spec's Success Criteria (SC-001–SC-006). Run
`npm run test:fast` (inside `connect-four/`) after implementation for the automated regression
gate — this quickstart covers the scenarios that need seeded data beyond what unit tests cover.

## Setup

Use a local or staging Supabase project seeded via the Node inline-script pattern
(`reference_supabase_connection` memory) — never hand-construct movestrings; source real
positions from `server/gameSampling.js` (`harvestBlunders`) if synthetic blunder rows need
realistic `board_state`/`pattern_category` values.

## SC-001 / SC-002 — 137 blunders, all reachable, all categories carded

1. Seed one test user with 137 `blunders` rows spanning every `VALID_BLUNDER_TAGS` category,
   including at least one `undercut` and one `forced_win` row, deliberately placing several of
   them past what a 50-row page would return under `severity DESC, created_at ASC` ordering.
2. `GET /api/coach/category-counts` → assert every category with ≥1 row appears, with the exact
   count.
3. Page `GET /api/coach/queue?limit=50&offset=0`, then `offset=50`, `offset=100` → concatenate
   `blunders` arrays, assert length 137 and no duplicate `id`.
4. Load `CategoryListScreen` in the app → assert an `undercut` card and a `forced_win` card are
   both visible with correct counts.
5. Click into the `undercut` category on `MistakesListScreen` → assert all `undercut` rows are
   shown (not just the first page).

## SC-003 — >1000 rows, aggregates correct

1. Seed >1200 `blunders` rows and >1200 `puzzle_attempts` rows for one test user.
2. `GET /api/stats` → compute expected `accuracy`/`byPattern` independently via a direct SQL
   `count()` query against the seeded data; assert match.
3. `GET /api/games?limit=50` for a user with >1000 blunders linked to games in the response page →
   assert `blunder_count` per game matches a direct SQL count for that `game_id`.
4. Weakness-map fallback (per `research.md` Decision 4 — cheap correctness fix, not a reliability
   investigation): covered by the unit test of the extracted `computeWeaknessMapFallback` pure
   function against a stubbed client with >1000 synthetic rows (see
   `contracts/scale-correct-aggregates.md` § Test strategy) — this quickstart does not require
   forcing the real RPC to fail against live infra.
5. `GET /api/coach/category-counts` at >1000 blunder rows → assert per-category counts match SQL.

## SC-004 — Cross-user import, no collision

1. As user A, import papergames room `X` (real or fixture room — see `docs/architecture/` for
   the papergames test fixture pattern, or use a recorded replay).
2. Confirm `papergames_games` has one row `{user_id: A, papergames_room_uid: X}` and A's
   blunders reference it.
3. As user B, import the same room `X`.
4. Confirm: a **new** `papergames_games` row exists `{user_id: B, papergames_room_uid: X}`; A's
   original row is untouched (`SELECT * FROM papergames_games WHERE papergames_room_uid = 'X'`
   returns 2 rows, one per user); A's blunders still reference A's original
   `papergames_game_id`; B's blunders reference B's new row.
5. A's Past Games list still shows the game; A's blunder queue is unchanged from step 2.

## SC-005 — Re-import same room, same user

1. As user A (from SC-004), re-import room `X`.
2. Confirm no new `papergames_games` row is created (still exactly 1 row for A + room X — the
   upsert updates in place).
3. Confirm no duplicate `blunders` rows for A (the `(user_id, papergames_game_id, move_index)`
   unique index prevents it; `insertGameBlunder`'s `23505`-as-success handling applies).
4. `GET /api/user/papergames/import/status` → `skipped > 0`, `blunderErrors: 0` (genuine
   duplicates, not errors).

## SC-006 — Post-import CTA

1. Complete an import (fresh or partial-with-skips) as any user.
2. On the `SettingsScreen` success state, confirm an interactive element is present and
   navigates to Past Games when activated.
3. Repeat with a partial-success result (some `skipped`/`blunderErrors` > 0) — confirm the CTA is
   still present and the copy accurately reflects partial results (not misrepresented as a full
   failure).

## Regression gate

```
cd connect-four && npm run test:fast
```
Must pass green, including any new tests added for the pure-function extractions described in
`contracts/scale-correct-aggregates.md` and the pagination logic in
`contracts/coach-queue-pagination.md`.
