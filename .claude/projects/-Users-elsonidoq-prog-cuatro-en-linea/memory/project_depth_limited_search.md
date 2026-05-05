---
name: AI difficulty — softmax sampling (depth approach abandoned)
description: How sparring difficulty is implemented; depth-limited approach was tried but abandoned; current approach uses softmax over perfect scores
type: project
---

**Current implementation (2026-05-01)**: softmax sampling over full solver scores.

- `src/lib/aiDifficulty.js`: `sampleColumnFromScores(scores, temperature)` — numerically stable softmax, masks INVALID_MOVE (≤ -1000), argmax at T=0
- Temperatures: `{ easy: 5.0, medium: 3.5, hard: 2.5, perfect: 0 }`
- `getAiColumn` in `HomePage.jsx` always calls `/api/scores` with no depth, then delegates to `sampleColumnFromScores`
- Tests: `connect-four/tests/difficulty/difficulty.test.js` — 8 tests (argmax, tie-breaking, INVALID masking, empirical vs theoretical distribution, monotonicity, convergence to uniform)

**Depth-limited approach (abandoned, left as tech debt)**:

Depth-limited negamax (`-d N` flag in c4solver) was fully implemented but produces all-zero scores in early-game positions. Forced outcomes from a 2-move position require 32–38 plies (smallest book score -4 → forced loss at move 34 = 32 plies away). Depth=30 falls short; any depth that reaches terminal nodes would be prohibitively slow without the book.

C++ infrastructure remains: `queryDepth` in server, `-d N -nb` flag, `test_depth.cpp`, `depth-scores.test.js`. Server still accepts optional `depth` body field on `/api/scores`.

**Why:** Depth-limited play cannot differentiate moves in early game without a heuristic evaluation function. Softmax temperature is a cleaner mechanism: uses perfect scores but randomizes selection proportionally.
**How to apply:** To tune difficulty, adjust temperatures in `DIFFICULTY_TEMPERATURES` in `aiDifficulty.js`.
