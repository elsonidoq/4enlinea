---
name: project_sparring_games_table
description: games table design for Epic 3a Sparring — side enum, anonymous persistence rule, and Epic 3b dependency
metadata:
  type: project
---

The `games` table is created in Epic 3a (migration `026_games.sql`). Schema: `id, user_id, device_uuid, moves, difficulty, side, result, created_at`.

**`side` enum**: stored as `'first'`/`'second'` — never color words (`'green'`/`'gray'`). Display mapping: Green disc = `side='first'` = first-mover. The disc-color inversion quirk means `'red'` internal value renders as green.

**Anonymous persistence**: ALL completed games write a server row (anonymous users too, keyed by `device_uuid`). This supersedes the old "device-local only" row in `product_decisions.md` (updated 2026-06-01). Rationale: Epic 3b's `POST /api/games/analyze` fetches movestrings server-side by `game_id` — a localStorage-only record can't serve that.

**Supabase grant required**: `GRANT SELECT, INSERT ON games TO anon, authenticated;` must be in the migration or PostgREST returns 42501.

**Epic 3b dependency**: `go('review', { id })` navigates after game end. `id` may be `null` if the insert failed — Epic 3b must handle a missing game ID gracefully.

**Why:** resolved a contradiction between two sections of `product_decisions.md`; server table wins because it's architecturally required by Epic 3b.
