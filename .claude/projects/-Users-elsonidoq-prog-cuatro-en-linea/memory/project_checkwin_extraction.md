---
name: project_checkwin_extraction
description: checkWin is private in HomePage.jsx — must be extracted to src/lib/board.js before sparring game board can be implemented
metadata:
  type: project
---

`checkWin(board, row, col, color)` currently exists only as a **private, non-exported** function inside `connect-four/src/pages/HomePage.jsx` (line 39).

- Signature: `checkWin(board, row, col, color)` — checks whether the disc just placed at `(row, col)` completes a four. NOT `checkWin(board)`.
- Must be **extracted** to `src/lib/board.js` (which already exports `buildBoard`) before any new screen can import it.
- This extraction is Task 1 (T001) in `specs/015-sparring-game-board/tasks.md` and blocks all GameScreen work.
- After extraction, callers use `checkWin(board, row, col, color)` with last-move coordinates from `buildBoard`'s heights array.

**Why**: Epic 3a specced `checkWin(board)` (wrong API); the critique caught this. The correct signature requires the last-move position, not a full-board scan.
