---
name: Board class refactor — spec 009 complete
description: Spec 009 (Board class in classifier.js) fully implemented and documented as of 2026-05-26; one signature divergence from spec.
metadata:
  type: project
---

Board class refactor (spec 009) is **done** (2026-05-26). All tests pass.

**Why:** Eliminate P1–P9 technical debt: redundant parseBoardState calls, mutable board patterns, duplicate utilities in candidate-generator.js.

**How to apply:** `classifier.js` now exports `Board` as the standard entry point. `classify()` constructs one `new Board(moves)` and shares it. `detect*` functions all take `(board: Board, scores)`. `candidate-generator.js` uses `new Board(ms).colHeights` / `.board` / imported `hasWon` instead of removed local helpers.

**Spec divergence — `isT2Blocking` signature**: The spec (FR-016) listed `(colThreats, R, Rp)` but `R` was never used in the implementation. The deployed signature is `(colThreats, Rp)`. The spec is wrong; the code is correct. Do not re-add `R`.

**Complexity note**: `getMajorThreatCells` is O(672) (42 cells × 4 dirs × 4 offsets), not O(42) as the spec plan stated. The JSDoc was corrected in the implementation.
