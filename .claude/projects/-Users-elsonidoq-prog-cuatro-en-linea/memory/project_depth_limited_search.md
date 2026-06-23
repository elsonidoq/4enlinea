---
name: ai-difficulty-softmax-sampling-depth-approach-abandoned
description: How sparring difficulty is implemented; depth-limited approach was tried but abandoned; current approach uses softmax over perfect scores
metadata: 
  node_type: memory
  type: project
  originSessionId: 57444168-0988-4f85-98d9-67fe50bdff48
---

**Current implementation**: softmax sampling over full solver scores.

- `src/lib/aiDifficulty.js`: `sampleColumnFromScores(scores, temperature)` — numerically stable softmax, masks INVALID_MOVE (≤ -1000), argmax at T=0
- Temperatures: `{ easy: 5.0, medium: 3.5, hard: 2.5, perfect: 0 }`
- To tune difficulty, adjust `DIFFICULTY_TEMPERATURES` in `aiDifficulty.js`.

**Depth-limited approach — abandoned, do not revive without reading this**:

Depth-limited negamax (`-d N` flag in c4solver) produces all-zero scores in early-game positions. Forced outcomes from a 2-move position require 32–38 plies (smallest book score -4 → forced loss at move 34 = 32 plies away). Depth=30 falls short; any depth that reaches terminal nodes would be prohibitively slow without the opening book. Depth-limited play cannot differentiate moves in early game without a heuristic evaluation function.

Tech debt: the server still accepts an optional `depth` body field on `/api/scores` and `queryDepth` infrastructure remains in the server code.
