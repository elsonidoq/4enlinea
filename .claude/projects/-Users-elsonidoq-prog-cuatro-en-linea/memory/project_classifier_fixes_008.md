---
name: project_classifier_fixes_008
description: Four targeted classify() fixes landed 2026-05-21 — Cat1 outer gate, Cat2 board scan, Cat3 rewrite (Case A/B), Cat5 board scan; ordering: Cat3 before Cat2
metadata:
  type: project
---

Four fixes to `connect-four/server/classifier.js` landed 2026-05-21 on branch `007-interaction-mode`.

**Why:** score-equality checks for Cat1/Cat2/Cat5 diverge from c4solver's integer division at odd/even moveCount boundaries; Cat3 `countAllReachableThreats` overcounts by including non-gravity threats and shared-cell duplicates.

**Changes:**

- **Cat 1** — removed outer `score >= winScore` gate (was firing on odd moveCount at win-in-2 score); removed `immediateWinScore()` and dead `isImmediateWin()`.
- **Cat 2** — replaced score-equality heuristic (`s >= opponentImmediateWin`) with three board checks: (1) opponent has gravity-top threat before candidate, (2) placing candidate eliminates it, (3) placing any other column leaves it alive.
- **Cat 3** — deleted `countAllReachableThreats`; full rewrite with Case A (≥2 distinct gravity-top-threat columns) and Case B (two consecutive-row threats in same column, no gravity-top requirement). **Cat 3 is now checked BEFORE Cat 2** — figure-7 positions that simultaneously block a forced threat must classify as `double_threat`, not `forced_block`.
- **Cat 5** — replaced `Math.ceil` score comparison with `countWinningThreats` board scan (checks if placing candidate gives opponent a gravity-top win).
- `parseBoardState` — added bounds guard for out-of-range col/row (prevents crash on move strings with digit `7`).

**Case B gravity-top note:** spec said "lower at gravity-top" but `3333344044114 col0` has consecutive threats at rows 1,2 in col2 with gravity-top=0. Generalized to "any two consecutive rows" — opponent needs 2 turns to block regardless of offset.

**How to apply:** when editing classifier.js category order matters: Cat3 > Cat2 > Cat4 > Cat5. Board-check functions (`countWinningThreats`, `checkWin`) are the ground truth; never use score arithmetic to infer immediate wins.
