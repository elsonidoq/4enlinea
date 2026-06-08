---
name: c4solver-score-universality
description: max(scores)<0 means ALL moves lose (forced loss); min(scores)<0 means SOME move loses — these are different and confusing them causes false positives
metadata:
  type: reference
---

c4solver scores from `solver.query(ms)` are always from the perspective of the player **to move** at `ms`. Sign semantics:

- `max(scores) > 0` — current player has at least one winning move (can force a win)
- `max(scores) < 0` — **ALL** moves lose for current player (opponent has a forced win regardless)
- `max(scores) === 0` — best achievable is a draw
- `min(scores) < 0` — **SOME** move loses for current player (not the same as a forced loss)

**The critical trap:** when checking if a non-moving player holds `forced_win` (e.g. checking `forced_win` for `opponent` at a position where `blunderer` is to move), you cannot simply negate the scores and check `max(-scores) > 0`. That is equivalent to `min(scores) < 0` — only SOME move is bad. The correct check is `max(scores) < 0` — ALL moves are bad.

More generally, for any pattern predicate `P(ms, perspective)` where `perspective ≠ currentPlayer`: a simple score sign flip produces **existential** semantics ("some opponent move leads to the pattern") when you need **universal** semantics ("all opponent moves lead to the pattern"). Use the recursive approach instead: for all playable columns `c` for the current player, check `P(ms + c, perspective)`. This is encoded in FR-033 of `specs/023-patterns-blunders-epic1/spec.md`.

**Why this matters:** affects `detectForcedWin`, `detectForbiddenColumns`, `detectForcedBlock`, `detectZThreat`, `detectOddEvenThreat` — all score-consuming detectors in classifier.js.
