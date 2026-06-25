---
name: c4solver-score-universality
description: max(scores)<0 means ALL moves lose (forced loss); min(scores)<0 means SOME move loses — these are different and confusing them causes false positives
metadata: 
  node_type: memory
  type: reference
  originSessionId: 37103333-1107-4c69-b8e9-34517fb99659
---

c4solver scores from `solver.query(ms)` are always from the perspective of the player **to move** at `ms`. Sign semantics:

- `max(scores) > 0` — current player has at least one winning move (can force a win)
- `max(scores) < 0` — **ALL** moves lose for current player (opponent has a forced win regardless)
- `max(scores) === 0` — best achievable is a draw
- `min(scores) < 0` — **SOME** move loses for current player (not the same as a forced loss)

**The critical trap:** when checking a score-based pattern for a non-moving player (e.g. `forbidden_columns` / `forced_block` for `opponent` at a position where `blunderer` is to move), you cannot simply negate the scores and check `max(-scores) > 0`. That is equivalent to `min(scores) < 0` — only SOME move is bad. The correct check is `max(scores) < 0` — ALL moves are bad. (Note: this trap is about score-consuming detectors. The `forced_win` PATTERN is **not** score-based — it is the structural `detectForcedWin`; do not reach for a score check to detect it. See [[project_classifier_architecture]].)

More generally, for any pattern predicate `P(ms, perspective)` where `perspective ≠ currentPlayer`: a simple score sign flip produces **existential** semantics ("some opponent move leads to the pattern") when you need **universal** semantics ("all opponent moves lead to the pattern"). Use the recursive approach instead: for all playable columns `c` for the current player, check `P(ms + c, perspective)`. This is encoded in FR-033 of `specs/023-patterns-blunders-epic1/spec.md`.

**Why this matters:** affects the score-consuming detectors in classifier.js — `detectForbiddenColumns`, `detectForcedBlock`, `detectZThreat`, `detectOddEvenThreat` (each takes a `scores` arg). NOT `detectForcedWin`: its signature is `detectForcedWin(board, perspective)` — it consumes no scores and handles the `perspective ≠ currentPlayer` case structurally via internal `withMove` recursion, so the negate-the-scores trap does not apply to it.
