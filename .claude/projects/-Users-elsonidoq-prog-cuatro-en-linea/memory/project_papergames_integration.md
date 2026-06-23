---
name: project-papergames-integration
description: "Durable gotchas for papergames import and blunders FK"
metadata: 
  node_type: memory
  type: project
  originSessionId: bd59bb82-d7ac-4e59-995b-ea65d067be38
---

# Papergames integration — gotchas

## FK separation

`blunders.papergames_game_id` FK is separate from `blunders.game_id` (which links to AI sparring games). Never conflate the two when querying blunders.

## Import script API path bug

In `server/scripts/import_papergames_blunders.mjs`, the game result is at `replayData.game.outcome.winnerAccountId`, NOT `replayData.outcome.winnerAccountId`. The wrong path silently returns `undefined`.

## Bulk insert dedup trap (migration 041 fixed the constraint)

Before migration 041, a single `insert(allBlunders)` per game would silently roll back the entire batch if any row hit a unique constraint on `board_state`. The script swallowed the error and reported success — leaving 0 blunders in the DB while `accuracy` on the game row appeared correct. If blunder counts look wrong but accuracy looks right, suspect a dedup rollback.
