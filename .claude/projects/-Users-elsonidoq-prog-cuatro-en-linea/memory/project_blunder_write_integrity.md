---
name: blunder-write-integrity
description: /api/games/analyze is a WRITE+read vector scoped only when game has user_id; blunders game_id dedup is 3-layer; index-name-reuse silent no-op trap
metadata: 
  node_type: memory
  type: project
  originSessionId: d65bf268-f657-430b-8ce4-f35ac9997fb2
---

Gotchas around writing/deduping `blunders` rows (discovered spec-042 QA, 2026-07-09). The
endpoint contracts themselves live in `docs/architecture/api-conventions.md`; these are the traps.

**`POST /api/games/analyze` is a WRITE vector, not just a read.** For authenticated callers it
INSERTs blunder rows under `req.user.id`. So the ownership check is load-bearing: a game with a
non-null `user_id` is private (404 for non-owner) — otherwise any signed-in user could pass a
foreign `gameId` and pollute that game's sibling-mistake data. TRAP: anonymous/device-scoped
games (`user_id` null) intentionally stay OPEN (documented no-auth contract; the request body
carries only `gameId`, no device_uuid to authorize against, and logged-out callers write no
blunders). Do NOT "tighten" this by comparing `aiGame.device_uuid === req.user.id` — different id
namespaces, never matches, 404s every logged-out review of a just-played game (the original
QA-introduced regression).

**Blunder `game_id` (AI-sparring) dedup is defense-in-depth across 3 layers — don't remove one
thinking another covers it:** (1) DB unique index `idx_blunders_game_unique` on
`(user_id, game_id, move_index)` — added by migration `054` (mirrors 053's papergames index; note
migration 041 had DROPPED an earlier same-named index on a DIFFERENT column set — see next trap);
(2) `ReviewScreen.jsx` `analyzeStartedForId` useRef guard against StrictMode/double-tab double-fire
of the analyze POST; (3) read-layer dedup-by-`move_index` in `fetchBlunderDetailContext`
(`server/blunderDetailResponse.js`) so `siblingMistakes` "X of Y" is correct even against
pre-existing dup rows. Layer 3 MASKS dupes at read time — a clean-looking "X of Y" does not prove
the table is dup-free.

**`CREATE UNIQUE INDEX IF NOT EXISTS <name>` silently no-ops if an index by that NAME already
exists — even with a different definition.** The project reuses the name `idx_blunders_game_unique`
across migrations 030 (create, on `board_state,move_played`) → 041 (drop) → 054 (recreate, on
`game_id,move_index`). Always verify the prior same-named index was actually `DROP`ped before a
recreate, or the new definition never lands. Also: 054's preflight dedup DELETE tiebreaks on
`created_at >`, which can't separate two rows written in the same millisecond (StrictMode) — a rare
exact-timestamp dup can block the unique-index creation on a non-empty table.

Related: [[project_mistake_storage_rule]] (what gets written), [[project_blunder_serving_dual_paths]]
(two response builders), [[project_papergames_integration]] (053 ownership fix this mirrors).
