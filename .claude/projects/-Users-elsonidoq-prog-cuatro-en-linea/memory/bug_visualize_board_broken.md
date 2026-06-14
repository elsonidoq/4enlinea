---
name: bug_visualize_board_broken
description: visualize_board.mjs imports buildThreatMap which was renamed to getMajorThreatCells in 009 refactor — script crashes on startup
metadata:
  type: project
---

`connect-four/server/scripts/visualize_board.mjs` line 1 imports `buildThreatMap` from `../classifier.js`, but that name was renamed to `getMajorThreatCells` during the 009 board refactor (spec complete 2026-05-26).

**Fix**: change the import to `getMajorThreatCells` and update the single call site inside the script.

**Status**: Verified working as of 2026-06-11 — `./visualize_board.sh` ran successfully. This bug has been fixed at some point; memory can be disregarded.

