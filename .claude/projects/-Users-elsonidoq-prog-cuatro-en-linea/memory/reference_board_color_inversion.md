---
name: reference_board_color_inversion
description: Board disc color values are named opposite to their visual appearance — 'red' renders green, 'yellow' renders gray; production Board.jsx takes a board[][] array, not cols/mkCols
metadata:
  type: reference
---

In `Board.jsx` (line ~191), disc rendering is inverted from the value names:

- `value === 'red'` → renders with `var(--disc-green)` (bright green disc)
- `value === 'yellow'` → renders with `var(--disc-gray)` (dark navy/gray disc)

This means any code that maps board values to UI labels, colors, or icons must use the **opposite** mapping:

- even move_string length → 'red' board value → **Green** disc visually
- odd move_string length → 'yellow' board value → **Gray** disc visually

This inversion tripped up the player-color indicator in ChallengeScreen (2026-05-31) — the coach initially showed "You're playing Gray" when the player was actually Green.

## Production Board props vs mockup

The **mockup** (`docs/mvp/mockup/project/board.jsx`) uses a `cols` prop (array[7] of `'g'`/`'d'` char arrays) and a `mkCols(boardSpec)` helper. **Neither exists in the production `Board.jsx`.**

Production `Board.jsx` takes:
- `board` — `board[row][col]` 2D array of `'empty'`/`'red'`/`'yellow'`
- `onColumnClick` — column tap handler
- `canPlay` — boolean

When converting a lesson `boardSpec` (array of `'g'`/`'d'` strings) for production, use `boardSpecToBoard(boardSpec)` in `src/lib/board.js`:
- `'g'` → `'red'` (renders green disc)
- `'d'` → `'yellow'` (renders gray disc)
- absent chars → `'empty'`

Any spec written from the mockup will reference `cols`/`mkCols`/`onColumn` — these must be corrected to the production API before implementation.
