# Contract: Papergames per-user ownership migration (US1.4, US1.5, US1.6)

## Migration

See `data-model.md` § Migration `053_papergames_ownership_and_blunder_index.sql` for the full SQL,
the DROP-before-ADD rationale, the verified constraint/index names (confirmed against a live
reachable DB 2026-07-07, re-verification against production required as a pre-flight step), and
the post-drop `DO` block guard that hard-fails the migration if a stray global
`UNIQUE(papergames_room_uid)` constraint is still present under an unexpected name. Summary of the
two constraint changes:

- `papergames_games`: `UNIQUE(papergames_room_uid)` → `UNIQUE(user_id, papergames_room_uid)`.
- `blunders`: `idx_blunders_papergames_unique` from `(papergames_game_id, move_index)` →
  `(user_id, papergames_game_id, move_index)`, both partial `WHERE papergames_game_id IS NOT
  NULL`.

Both ship in the same migration/PR — the epic frames the blunder-index change alone as
"necessary but not sufficient" for the fix.

## Code change: `upsertGame()` (`server/papergamesImporter.js:163`)

```diff
- .upsert(gameRow, { onConflict: 'papergames_room_uid', ignoreDuplicates: false })
+ .upsert(gameRow, { onConflict: 'user_id,papergames_room_uid', ignoreDuplicates: false })
```

Shared by both `importForUser` (self-service batch import) and `saveLiveGame` (live-game save) —
one change point fixes both call paths (confirmed in `research.md`).

**Post-migration behavior**:
- User A imports room X → gets game row `{id: G1, user_id: A, papergames_room_uid: X}`.
- User B imports the same room X → **no conflict** on `(user_id, papergames_room_uid)` since
  `user_id` differs → INSERT creates a **new** row `{id: G2, user_id: B, papergames_room_uid:
  X}`. A's row `G1` is untouched.
- User A re-imports room X → conflict on `(A, X)` → UPDATE of the same row `G1` (upsert
  semantics), not a new row. Idempotent.
- Each user's blunders for their own game row insert cleanly under the new
  `(user_id, papergames_game_id, move_index)` index — no cross-user collision is possible even
  though `move_index` values will legitimately repeat across A's and B's rows for the same
  imported position (different `papergames_game_id` per user now, since each user has their own
  row).

## US1.5 — Import result reporting

`GET /api/user/papergames/import/status`'s response gets `blunderErrors` added to its documented
contract in `api-conventions.md` (the value is already computed and stored on the job map per
`server/userRoutes.js:648` — `blunderErrors: job.blunderErrors ?? 0` — this task surfaces an
existing field in the documented/client-consumed shape, it does not compute anything new):

```json
{ "status": "done", "imported": 12, "skipped": 3, "capReached": false, "blunderErrors": 0 }
```

- `skipped`: already means "already-imported room for this user" (genuine same-user duplicate).
- `blunderErrors`: count of blunder rows that failed to write for a non-dedup reason (see
  `insertGameBlunder`'s `false`-return contract in `server-conventions.md`).
- **Regression check (post-US1.4)**: before this migration, a second user importing a room
  already imported by someone else would silently succeed at the game-upsert level (the game row
  just got reassigned) while blunder inserts for the *previous* owner's now-orphaned rows became
  invisible — no `23505` was raised at the game level, so `skipped`/`blunderErrors` never
  reflected the collision. After the migration, a second user's import is a completely normal
  first-time import: `skipped: 0` (unless they've imported before) — verifying this is exactly
  Acceptance Scenario 2 of User Story 5.

`SettingsScreen.jsx` import copy is updated to render `blunderErrors` and `skipped` distinctly
(e.g. "N blunders skipped as duplicates" vs. a genuine error count) — i18n keys added under the
existing import-result copy namespace.

## US1.6 — Post-import CTA

`SettingsScreen.jsx`'s import success state gets an interactive element (button/link) that
navigates to the Past Games screen (`go('pastGames')` or equivalent per the existing screen
registry, no new navigation param contract required — Past Games already lists all of a user's
games without needing an "imported-only" filter param, per spec's Acceptance Scenario 1 for US6
which only requires landing on Past Games, not a filtered view). Present in both full-success and
partial-success (`skipped > 0` or `blunderErrors > 0`) states — the CTA is never hidden.
