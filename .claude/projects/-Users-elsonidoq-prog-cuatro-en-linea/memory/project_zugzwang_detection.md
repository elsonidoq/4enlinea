---
name: Cat 5 Zugzwang detection — traceZugzwang design
description: How zugzwang detection works in candidate-generator.js, the two cases, and why the sign-flip relationship matters
type: project
---

`traceZugzwang(ms, redCol, depth, solver)` in `candidate-generator.js` has two cases:

**Case A (terminal — double/multi-threat)**: After Red plays `redCol`, ALL Yellow legal columns have `score = opponentImmediateWin = -floor((41 - ms1.length) / 2)`. Then for ANY Yellow move to ms2, Red wins immediately at ms2 because the sign-flip gives Red's win score = `immediateWinScore(ms2.length)`. This is the terminal state: `allForced = true`.

**Case B (single forced block — recurse)**: Exactly ONE Yellow column has `score > opponentImmediateWin` (all others = oiw). Yellow MUST play that column, and we recurse on the resulting position.

**Key mathematical relationship**: `score_ms1[yc] = -Red_win_score_ms2`. If `score1[yc] > oiw1`, then `Red_win_score_ms2 = -score1[yc] < immediateWinScore(ms2)` — Red cannot win immediately. This is why Case B cannot terminate with "Red wins immediately" — only Case A can.

**getForcedBlock threshold**: Changed from `scores[c] >= 0` to `scores[c] > opponentImmediateWin`. Yellow may be losing (negative score) but if it's better than immediate loss, it counts as Yellow's forced block.

**Why:** Original code tried `getForcedBlock (>= 0) then Red wins immediately`, which is mathematically impossible by the sign-flip. Zero candidates generated until this was redesigned.

**How to apply:** If revisiting zugzwang logic, verify Case A vs Case B distinction. Terminal is always Case A (allForced). Recursion is Case B (exactly 1 col better than oiw). Any design that tries to win immediately after a forced block (Case B terminal) is wrong.
