 You are working in /Users/elsonidoq/prog/cuatro_en_linea (a Connect Four training
  app; server code under connect-four/server/). Work in PLAN MODE: investigate and
  produce an implementation plan. Do NOT edit code in this session.

  ## Goal

  `connect-four/server/gameSampling.js` was recently created to be the SINGLE,
  canonical game-simulation harness. It currently exposes:

    - `playGame(solver, rng = Math.random)` — THE primitive: an async generator that
      plays one mistake-weighted self-play game, yielding
      `{ ms, scores, player, movePlayed, plyIndex }` at each ply before the move is
      applied. Callers `break` to stop early once they find a position they want.
    - `simulateGame(solver, rng)` — drains `playGame` into `{ ms, scoresCache }`.
    - `harvestBlunders(solver, { maxGames, rng })` — generator yielding every
      non-optimal ply, for blunder classification/recording.

  Right now gameSampling.js only has TWO of its three intended consumers wired up
  (`generate_eval_set.mjs` uses `harvestBlunders`). The codebase still contains
  hand-rolled, duplicated game-simulation loops elsewhere. Your task is to plan the
  PORT of every remaining simulation loop onto gameSampling.js so that this one module
  genuinely centralizes all game simulation across the codebase — eliminating the
  duplicates.

  ## What to investigate
  1. Read `connect-four/server/gameSampling.js` end to end to understand the current
     API, the sampling policy (`sampleColMP` — mistake-weighted), and the rng
     contract.
  2. Find EVERY other place that simulates / self-plays games or samples random
     positions. Start with `connect-four/server/candidate-generator.js`, which has at
     least `solverWeightedPosition` and `solverWeightedPositionSoftmax` (plus
     `softmaxSample`) — but search the whole repo (server/, scripts/, tests/) for
     other loops that call `solver.query` in a play loop, sample columns, or build
     movestrings move-by-move.
  3. For each duplicate, characterize exactly what it does that `playGame` does not
     yet support. Known gaps to resolve in your plan:
       - candidate-generator uses TWO sampling policies: softmax-with-temperature AND
         mistake-probability. gameSampling currently hard-codes mistake-probability.
         Centralizing requires a pluggable sampling strategy — design that interface.
       - candidate-generator's `solverWeightedPosition*` take an `onPosition` callback
         and stop on first predicate match, returning rich `trace` metadata
         (temperatures, per-ply plies array, termination reason). Plan how callers
         recover this via the generator (`break` + reading yielded fields) without
  - These simulators feed PRODUCTION puzzle-candidate generation. The port must be
    behavior-preserving. Identify anything that could change sampling outcomes
    (especially the ORDER of `rng()` calls — it determines which games are produced
    for a given seed) and call it out explicitly.
  - TESTING TRAP: `candidate-generator.test.js` calls the real c4solver up to 400×
    and frequently hangs 10+ minutes due to solver IPC deadlock. Use `npm run
    test:fast` (from connect-four/) for normal verification; only run the full
    candidate-generator test deliberately and never in a loop. Plan verification
    accordingly.
  - Coordinates are 0-indexed project-wide. Movestrings must never be hand-fabricated;
    rely on the simulator (see CLAUDE.md "When you need a concrete movestring").
  - Authoritative references to read first:
      - docs/architecture/server-conventions.md → "Simulating games" and "Solver
        Score Semantics"
      - docs/architecture/testing-conventions.md
      - CLAUDE.md (project root) — running tests, movestring rules
      - memory: reference_game_simulation_harness

  ## Deliverable

  A step-by-step implementation plan that includes:
    - The full inventory of simulation duplicates found (file:line) and what each does.
    - The proposed `gameSampling.js` API changes (e.g. pluggable sampling strategy)
      needed to absorb them, with the exact new signatures.
    - A per-file porting plan (what gets deleted, what gets rewritten to consume
      gameSampling.js), ordered low-risk → high-risk.
    - An explicit behavior-equivalence / determinism argument for each port.
    - A verification strategy that respects the IPC-hang constraint.
    - Risks and open questions for the user to decide before implementation.

