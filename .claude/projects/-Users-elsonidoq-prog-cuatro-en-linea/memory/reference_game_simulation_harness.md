---
name: reference_game_simulation_harness
description: "Before writing any game-simulation / random-position loop, use server/gameSampling.js — don't hand-roll one"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 0e333f7b-7643-4eee-959f-2f5b34c43c45
---

When you need real Connect Four game positions (eval sets, test fixtures, blunder
coverage, position sampling), do NOT write a new self-play loop. The mistake-weighted
game simulator has already been duplicated 3+ times (candidate-generator.js,
generate_eval_set.mjs, and more) — use the canonical module `server/gameSampling.js`:

- `playGame(solver, rng = Math.random)` — THE primitive. Async generator yielding
  `{ ms, scores, player, movePlayed, plyIndex }` per ply before the move; `break`
  early to find a board with a given property (no callbacks, no whole-game cost).
- `simulateGame(solver, rng)` → `{ ms, scoresCache }` — drains playGame into a full game.
- `harvestBlunders(solver, { maxGames, rng })` — async generator yielding every
  non-optimal ply as `{ boardState, movePlayed, correctCol, scores, severity,
  perspective, quality, gameIndex, ... }`, ready for [[project_explain_system]]'s
  tagBlunder / blunder recording.

Pass a seeded `rng` for deterministic runs. Authoritative docs:
docs/architecture/server-conventions.md → "Simulating games".
