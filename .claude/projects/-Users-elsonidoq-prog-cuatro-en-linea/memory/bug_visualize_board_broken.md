---
name: bug_visualize_board_broken
description: visualize_board.mjs imports buildThreatMap which was renamed to getMajorThreatCells in 009 refactor — script crashes on startup
metadata:
  type: project
---

`connect-four/server/scripts/visualize_board.mjs` line 1 imports `buildThreatMap` from `../classifier.js`, but that name was renamed to `getMajorThreatCells` during the 009 board refactor (spec complete 2026-05-26).

**Fix**: change the import to `getMajorThreatCells` and update the single call site inside the script.

**Status**: NOT yet fixed as of 2026-05-26. Causes `SyntaxError: does not provide an export named 'buildThreatMap'` when running `./visualize_board.sh`.

This is a **prerequisite** for the LLM explain PoC (`explain_move.sh`) which captures `visualize_board.mjs` output as part of the LLM prompt context.

