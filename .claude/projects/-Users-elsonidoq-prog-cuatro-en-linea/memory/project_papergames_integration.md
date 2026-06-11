---
name: project-papergames-integration
description: "papergames_games table, import script, GET /api/games merge, PastGamesListScreen board thumbnail + chips"
metadata: 
  node_type: memory
  type: project
  originSessionId: bd59bb82-d7ac-4e59-995b-ea65d067be38
---

# Papergames integration (2026-06-11)

## DB schema

`papergames_games` table (migrations 038 + 039): stores games imported from papergames.io. Key columns: `papergames_room_uid` UNIQUE (dedup key), `side`, `result`, `accuracy`, `opponent_name`, `opponent_avatar` (UUID), `opponent_elo`, `finish_reason`, `duration_ms`, `played_at`.

`blunders.papergames_game_id` FK (migration 038) — separate from `game_id` which links to AI sparring games.

## Import script

`server/scripts/import_papergames_blunders.mjs` — fetches rooms + replays from papergames API, runs solver on all user plies, writes to both `papergames_games` (with accuracy) and `blunders` (with `papergames_game_id`).

**Key API path bug**: result is at `replayData.game.outcome.winnerAccountId`, NOT `replayData.outcome.winnerAccountId`.

Accuracy is computed in the same solver pass as blunder extraction (optimal/scored ratio). Re-import needed for rows before migration 039.

## GET /api/games

Queries both `games` and `papergames_games` in parallel, fetches blunder counts via `game_id` and `papergames_game_id` respectively, merges + sorts by date, paginates with `offset`/`limit`. Returns `{ games, total }`. AI rows include `difficulty`; papergames rows include `opponent_name`, `opponent_avatar`.

## PastGamesListScreen

- `BoardThumb`: renders real `Board` component at 252px then CSS-scales to 72px with `transform: scale + overflow:hidden`. Height computed from Board's compact layout constants (pad=9, gap=6, aspectRatio:1 cells).
- `GameCard` row 2: AI → colored difficulty chip (DIFF_STYLES map, perfect = indigo `#e0e7ff`/`#3730a3`, label "Perfect AI") + accuracy span. Papergames → opponent avatar (SVG with initials fallback) + name + accuracy.
- `GameCard` row 3: `.gc-blunder-chip` (amber pill, flag icon) or `.gc-no-blunder-chip` (green pill). Both need `alignSelf: flex-start` to avoid stretching in column flex container.
