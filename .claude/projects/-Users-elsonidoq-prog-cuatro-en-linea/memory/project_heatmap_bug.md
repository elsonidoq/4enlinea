---
name: Heatmap bug — fixed
description: explainSearch showed forcing-threat cells instead of actual winning cells; fixed in Solver.cpp by recursing through forced responses.
type: project
originSessionId: b0f55ba3-5d89-4123-8903-e23bf84def14
---

**Status: FIXED** (2026-04-23)

The heatmap was marking the *forcing-threat* cells as human winning cells instead of the *actual winning line* that materializes after the opponent is forced to respond.

**Root cause:** In `explainSearch` (`Solver.cpp`), the `possibleNonLosingMoves() == 0` branch used to call `getOpponentWinningMovesMask()` and record those cells directly. But those are the *forcing* cells (the immediate threats that make the opponent have no safe move) — not the actual 4-in-a-row the human wins with. The actual winning line appears only after the opponent makes their forced response.

**Concrete example:** `moves = "444444777777166662661322222535111133335"` (hover Col5):
- Human has a double threat: diagonal at (row=3,col=4) and horizontal at row=4 cols 2-5.
- AI is forced to block the diagonal. Then human wins horizontally.
- Old code showed the diagonal cells (including (row=3,col=4) which the AI occupies). New code shows the horizontal cells (row=4, cols 2-5 in C++ coords = user row 2, cols 3-6).

**Fix:** When `possibleNonLosingMoves() == 0`, recurse through all playable moves instead of recording the forcing threat. This logic is preserved in the 2026-04-29 refactor (see `project_explain_best_moves.md`); the signature of `explainSearch` changed but the forced-response branch is the same.

**Test:** `solver-src/test_explain.cpp` — asserts horizontal cells hot and (row=3,col=4) zero.

**How to apply:** Bug is fixed. If heatmap issues resurface, check the `possible == 0` branch in `explainSearch` in `Solver.cpp` and re-run `make test` in `solver-src/`.
