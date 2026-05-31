---
name: project_classifier_current_state
description: "Classifier.js current design, post-008 code fixes, pending spec discrepancies (T037–T048), and FP rates from v2 candidate review"
metadata: 
  node_type: memory
  type: project
  originSessionId: 04c4bf45-005f-4617-8eae-aeefaab3b257
---

## What was fixed (2026-05-21, branch 007-interaction-mode)

Four structural fixes to `classifier.js`:

- **Cat1 (immediate_threat)** — removed outer `score >= winScore` gate (fired on odd moveCount at win-in-2 score); removed dead `immediateWinScore()` and `isImmediateWin()`.
- **Cat2 (forced_block)** — replaced score-equality heuristic with three board checks: (1) opponent has gravity-top threat before candidate, (2) placing candidate eliminates it, (3) placing any other column leaves it alive.
- **Cat3 (double_threat)** — deleted `countAllReachableThreats`; rewritten with Case A (≥2 distinct gravity-top-threat columns) and Case B (two consecutive-row threats in same column, no gravity-top requirement). **Cat3 checked BEFORE Cat2** — figure-7 positions that simultaneously block a forced threat classify as `double_threat`, not `forced_block`.
- **Cat5 (forbidden_columns)** — replaced `Math.ceil` score comparison with `countWinningThreats` board scan.

**Board-check principle**: never use score arithmetic to infer immediate wins. `checkWin` at gravity-top is always the correct test. `countWinningThreats` is ground truth.

**Category evaluation order** (matters): Cat3 > Cat2 > Cat4 > Cat5.

## Spec 008 discrepancies — T037–T048 (pattern detectors, NOT yet applied to classifier.js)

11 spec discrepancies found in cross-check against KB (2026-05-19). Spec was fixed; `classifier.js` pattern detectors remain uncorrected. Phase 6 tasks T037–T048 in `specs/008-new-puzzle-categories/tasks.md`.

**detectJShape** (T037–T040):
- J1: Missing anchor parity — add `if (r % 2 !== 0) continue`
- J2: Loop bounds allow off-board — fix `c < COLS - 2`, `r <= ROWS - 4`
- J3: No opponent odd-row threat check in far column
- J4: Wrong guard cell — should be `board[completing.row][c+2]` (far column), not row above completing

**detectUndercut** (T041–T043):
- U1: No parity check — add `if (R % 2 === kill % 2) continue` (same parity = T4, not undercut)
- U2: No T5 exception — add `if (R === 5 && kill === 2) continue`
- U3: No adjacency for sub-case 3

**detectOvercut** (T044):
- O1: No T2-blocking mechanism check; need to verify at least one of: (a) neutralised is minor threat, (b) same parity (T4), (c) T5 exception, (d) chain-T2

**detectFigure7** (T045–T047):
- F1: `gravityTopCount >= 2` check computed but never used
- F2: `hasAboveGravity` check computed but never used
- F3: Variants 1/1b are dead code (structurally wrong, self-filtered)

## v2 candidate-review FP rates (2026-05-20)

Full report at `reports/candidate-review-v2-2026-05-20.md`.

| Category | FP/8 sampled | Status |
|---|---|---|
| j_shape | 8/8 | CRITICAL — all three J guards missing |
| overcut | 2/8 | Moderate — T5 column-position bug |
| claimeven | 1/8 + 1 uncertain | Low — wrong player guard missing |
| z_threat | 0/8 | Healthy |
| undercut | 0/8 | Healthy |
| figure_7 | 0/8 | Healthy (KB/classifier framing misalignment: classifier implements `find_incomplete_figure7`, KB documents `find_figure7`) |

**Candidates to reject**: 11 total — 2a729f66 (claimeven), af435cd2 + ae22abd4 (overcut), 8 j_shape IDs in §3 of the report.

## Classifier purpose vs KB predicate

The classifier's role is **puzzle generation** — finding positions where playing `correct_col` *creates* the pattern. The KB documents the complete strategic pattern. These are different predicates. For figure_7/j_shape: classifier correctly detects incomplete configurations (4/3 discs placed, completing disc at gravity-top); KB documents the full 5-disc pattern.
