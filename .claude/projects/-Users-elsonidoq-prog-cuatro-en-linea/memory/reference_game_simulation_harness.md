---
name: reference_game_simulation_harness
description: "Before writing any game-simulation / random-position loop, use server/gameSampling.js — don't hand-roll one"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 0e333f7b-7643-4eee-959f-2f5b34c43c45
---

When you need real Connect Four game positions (eval sets, test fixtures, blunder
coverage, position sampling), do NOT write a new self-play loop. Every self-play loop is
now centralized in `server/gameSampling.js` — `generate_eval_set.mjs` and
`generate_tagblunder_fixtures.mjs` use `harvestBlunders`, and `candidate-generator.js`'s
`generateCandidates` consumes `playGame`. The old hand-rolled loops (`solverWeightedPosition`,
`solverWeightedPositionSoftmax`, `softmaxSample`, `diag_figure7.js`) were DELETED — don't
resurrect them. Use the canonical module:

- `playGame(solver, rng = Math.random, { maxMistakeProb = 0.5 })` — THE primitive. Async
  generator yielding `{ ms, scores, player, movePlayed, plyIndex }` per ply before the
  move; `break` early to find a board with a given property (no callbacks, no whole-game
  cost). `maxMistakeProb` caps each player's mistake probability; candidate-generation
  passes `0.25`, everything else uses the default `0.5`.
- `simulateGame(solver, rng)` → `{ ms, scoresCache }` — drains playGame into a full game.
- `harvestBlunders(solver, { maxGames, rng })` — async generator yielding every
  non-optimal ply as `{ boardState, movePlayed, correctCol, scores, severity,
  perspective, quality, gameIndex, ... }`, ready for [[project_explain_system]]'s
  tagBlunder / blunder recording.

Pass a seeded `rng` for deterministic runs. Authoritative docs:
docs/architecture/server-conventions.md → "Simulating games".
