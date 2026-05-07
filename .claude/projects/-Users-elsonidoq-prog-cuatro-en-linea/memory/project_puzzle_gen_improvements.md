---
name: Puzzle gen improvements — spec 004 complete + spec 005 gen refactor
description: Softmax generation, player-perspective colors, callback-based predicate matching during simulation
type: project
---

All tasks in `specs/004-puzzle-gen-improvements/tasks.md` are complete as of 2026-05-05.

**Phase 1–3 (T001–T009)**: Solver-weighted softmax generation
- Migration 008 adds `user_player` column to `candidates` and `puzzles`
- `softmaxSample(legalCols, scores, T, rng)` exported from `candidate-generator.js`
- `randomPosition` replaced by `solverWeightedPosition` with per-player temperatures T1, T2 ∈ (0.1, 4.1]
- Opening book loaded at startup (`-b 7x6.book`); constructor throws if missing
- `isClean()` off-by-one fixed: `>=` instead of `===` for winScore
- `minMoves` raised to 10 for all categories
- Integration tests cover density (median ≥ 14), determinism, book fail-fast

**Phase 4 (T010–T011)**: Player-perspective color normalization in `CurationWorkspace.jsx`
- `buildBoard(moves, userPlayer)` — second param added; color formula: `(i % 2 === 0) === (userPlayer === 1) ? 'red' : 'yellow'`
- Call site derives `userPlayer = move_string.length % 2 === 0 ? 1 : 2`
- "You are RED ●" badge added below metaRow using `var(--red)`

**Phase 5 (T012)**: Manually verified both even-length (player 1 = RED) and odd-length (player 2 = RED) boards; solver scores and predicate evaluation unaffected.

**Why:** board color conventions need no context — the current player is always RED so the user knows which pieces are theirs regardless of move count parity.

---

**Spec 005 generator refactor (2026-05-06)**: Callback-based predicate matching

`solverWeightedPosition` now takes an `onPosition(moveString, scores)` callback called at every step BEFORE making each move. Returns `{ moveString, scores, trace }` on first match, `null` otherwise.

Key insight: checking the predicate only on the final game position gave near-zero acceptance rates because the matching position (e.g. cat 1's pre-win state, cat 2's forced-block state) occurs *during* the game, not just at the end. With the callback, every solver query already being paid for does double duty as a predicate check — effectively multiplying acceptance rate by ~maxMoves with no extra solver cost.

`generateCandidates` builds `onPosition` as a closure capturing `minMoves` and `matchedCorrectCols`. All post-processing slice hacks removed. Softmax scores also normalized to [-1, 1] per-position before temperature scaling so T is semantically consistent across positions.
