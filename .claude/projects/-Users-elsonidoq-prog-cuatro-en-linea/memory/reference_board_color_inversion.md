---
name: reference_board_color_inversion
description: Board disc color values are named opposite to their visual appearance — 'red' renders green, 'yellow' renders gray
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
