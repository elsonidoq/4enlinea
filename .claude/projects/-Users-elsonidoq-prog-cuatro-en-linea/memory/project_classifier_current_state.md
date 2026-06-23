---
name: project_classifier_current_state
description: "Classifier.js current design, post-convolution refactor of detectFigure7/detectJShape, and remaining discrepancies"
metadata: 
  node_type: memory
  type: project
  originSessionId: 78ca6d92-72fb-4121-b9ce-acf936d1b8e7
---

## Classifier semantic — evaluate board as-is

`detectFigure7` and `detectJShape` evaluate the board **as-is** — patterns are either fully present or they aren't. They do NOT detect one-move-away states. The transition logic for puzzle generation (iterate legal columns, simulate, verify pattern was absent before) lives in `checkFigure7Predicate` / `checkJShapePredicate` in `candidate-generator.js`.

## `_scores` caller-signature trap

Both `detectFigure7` and `detectJShape` accept `_scores` as a parameter but ignore it. `classifyPattern` still passes it. Do not remove the parameter — it would break the call site.

## Pre-existing test failures

The following tests were failing before this change and remain failing:
- `insertGameBlunder` tests in `tests/blunder/insertGameBlunder.test.js`
- `forbidden_columns` classifier test at `tests/classifier/classifier.test.js:85`
- `suboptimal_move` tag guard test in `tests/blunder/insertGameBlunder.test.js:44`
