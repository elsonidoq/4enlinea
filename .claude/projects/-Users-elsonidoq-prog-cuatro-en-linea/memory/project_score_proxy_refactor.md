---
name: project-score-proxy-refactor
description: Refactor removing bad score>0 proxy usages; only evalForcedWin guard was a real bug; others were latent/defensive
metadata: 
  node_type: memory
  type: project
  originSessionId: 76fd3bd7-ed3b-46b5-8646-3e7475484224
---

Completed 2026-05-22 on branch `007-interaction-mode`. Four classes of fix:

1. **evalImmediateThreat** (`predicates.js`): replaced `scores.reduce` with score gate removed — `checkWin` now called unconditionally over all legal columns. No behavioral change for valid puzzles (immediate win ↔ score > 0 is an invariant).

2. **classify() immediate_threat** (`classifier.js`): removed `if (score > 0)` wrapper; `checkWin` called unconditionally. No behavioral change for same reason.

3. **evalForcedWin guard** (`predicates.js` line 184): changed `> 0` to `>= 0` — drawing positions (max score = 0) now correctly return `wrong`. This is the **only fix with real behavioral impact**: a forced_win puzzle whose position has a drawing column would previously accept drawing moves as correct.

4. **Dead parameter removal**: `scores` removed from `evalForcedBlock` (predicates.js + callsite), `getForcedBlock` (candidate-generator.js — function is never called), `detectClaimeven` (classifier.js + 2 callsites: candidate-generator.js and debug-claimeven.js).

**Why:** `score > 0` means current player eventually wins with optimal play — not that the move wins immediately. `checkWin` is the correct test for immediacy. The score gate was a misleading assumption baked into the loop structure.

**KB audit result:** All 30 KB entries use solver scores correctly (Type 2 — eventual outcome). No KB edits were needed.

**Observable in frontend:** None for correctly-generated puzzles. The forced_win fix is only visible if a puzzle was generated in a drawing position (check `solver_scores` field in curation panel for any forced_win puzzle — if no column has score 0, the fix has no visible effect).
