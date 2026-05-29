---
name: feedback-spec-existing-apis
description: When speccing a redesign, always audit existing component APIs before writing prop shapes — only change what is strictly necessary
metadata:
  type: feedback
---

When writing a spec that redesigns or replaces an existing component, read the current implementation first and preserve its API wherever the change is not strictly required by the new design.

**Why:** The Epic 1a spec was written with a completely new Board API (`cols[col]` column-major array with `'g'`/`'d'` encoding, `onColumn` handler) when the existing `Board.jsx` uses `board[row][col]` row-major with `'red'`/`'yellow'`/`'empty'` and `onColumnClick`. This would have forced migration of every caller — `PuzzlesPage.jsx`, `HomePage.jsx`, etc. — as part of a component-library-only epic, adding scope that served no product purpose. The disc encoding is just a player-1/player-2 semantic label; the visual rendering (green vs dark-gray) can change without touching the data model at all.

**How to apply:** Before speccing any component that already exists:
1. Read its current file and note the prop names, data encoding, and handler signatures.
2. In the spec, preserve every prop that doesn't *need* to change for the feature to work.
3. Flag explicitly which props *are* changing and why they are strictly necessary (e.g., `highlightedCells`→`overlays` was necessary because the new overlay type enum is a cross-epic contract that the old system couldn't express).
4. Mark preserved props in the spec with a note like "**Preserved from existing API — no caller migration required.**"
