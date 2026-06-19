---
name: project_classifier_current_state
description: "Classifier.js current design, post-convolution refactor of detectFigure7/detectJShape, and remaining discrepancies"
metadata: 
  node_type: memory
  type: project
  originSessionId: 78ca6d92-72fb-4121-b9ce-acf936d1b8e7
---

## Convolution refactor (2026-06-19)

`detectFigure7` and `detectJShape` were rewritten with a convolution-based approach. Key changes:

- **Added `convolve(board, perspective, kernel)`** — slides a binary kernel over every valid anchor position. Kernel has `playerCells` (must be occupied by perspective) and `emptyCells` (must be vacant). Returns all matches.
- **Added `flipKernel(kernel)`** — returns the horizontal mirror.
- **Added 4 kernel constants**: `F7`, `F7_FLIPPED`, `J`, `J_FLIPPED` — each 4×4 template with ASCII diagrams.
- **`detectFigure7`**: Now detects the **fully-formed 5-piece** Figure-7 shape (was: 4-of-5 with gravity-top completing cell). Removed gravity-top gate, score gate, placement simulation, zugzwang verification (F1/F2/consecutive-pair), `correctCol`, and `threat_cells`. Returns 5 `pattern_piece` highlight cells.
- **`detectJShape`**: Now detects the **fully-formed 4-piece** J-shape (was: 3-of-4 with gravity-top completing cell). Removed gravity-top gate, score gate, anchor parity (J1), opponent far-col check (J4), opponent odd-threat scan (J3), and `correctCol`. Returns 4 `pattern_piece` highlight cells.
- **`checkFigure7Predicate` and `checkJShapePredicate`** in `candidate-generator.js`: implement transition logic — iterate legal columns, simulate `ms + col`, run the new detector on the simulated position, verify pattern was absent on `ms`. Returns `correctCol` = completing column. Preserves puzzle semantics (pre-completion `move_string` + `correct_col` in DB).
- **`diag_figure7.js`**: Simplified — no scores needed, no internal diag counters. isClean approximated via `board.immediateThreats(currentPlayer).length === 0`.
- **`scores` parameter**: Kept as `_scores` in both detectors for caller signature compatibility (`classifyPattern` still passes it).

## Spec 008 discrepancies — resolved

The old T037–T048 discrepancies (J1–J4, F1–F3, U1–U3, O1) were in the old pre-completion detector code. With the convolution rewrite:
- J1–J4: all resolved (replaced by kernel constraints)
- F1–F3: all resolved (zugzwang verification removed)
- U1–U3, O1: these were previously fixed, unaffected by this change

## Classifier purpose — changed

The classifier previously operated in "pre-completion mode" (detecting one-move-away states for puzzle generation). `detectFigure7` and `detectJShape` now evaluate the board **as-is** — patterns are either present or they aren't. The transition logic for puzzle generation moved to `candidate-generator.js` predicates.

## Pre-existing test failures

The following tests were failing before this change and remain failing:
- `insertGameBlunder` tests in `tests/blunder/insertGameBlunder.test.js`
- `forbidden_columns` classifier test at `tests/classifier/classifier.test.js:85`
- `suboptimal_move` tag guard test in `tests/blunder/insertGameBlunder.test.js:44`
