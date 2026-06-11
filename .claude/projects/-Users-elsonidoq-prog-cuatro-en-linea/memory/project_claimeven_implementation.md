---
name: project_claimeven_implementation
description: "Claimeven puzzle implementation notes — player perspective (always Yellow), cooperative AI moves empty, highlight roles"
metadata:
  type: project
---

## Player perspective — always Yellow

Claimeven is a second-player (Yellow) strategy. In all UI views (curation and learner), the human player must be Yellow regardless of movestring length.

**In `CurationWorkspace.jsx`:**
- `userIsYellow = category === 'claimeven' || moveString.length % 2 === 1` drives the label. Claimeven always shows YELLOW (detector enforces odd movecount; the OR is redundant but explicit).
- `buildBoard` uses physical colors only (`i % 2 === 0 → 'red', else → 'yellow'`). No color-flip.

**Learner view:** apply the same `userIsYellow` pattern. Goal prompt should reference Yellow.

## cooperativeAiMoves is always empty

All claimeven puzzles in `puzzles` have `cooperative_ai_moves = {}` (empty array). The claimeven mirror move (Yellow plays same column as Red) is derivable algorithmically. Do not assume this field is populated for claimeven — derive from board state instead.

## Highlight cell roles

The claimeven simulation trace block assigns roles based on who physically plays in the simulation (Red always moves first there), which is always correct. It does NOT use `userIsYellow`.

The generic `highlight_cells` processing block (for other categories) must use `userIsYellow` for role assignment:
- Odd step (user's move): `userIsYellow ? 'winner' : 'loser'`
- Even step (opponent's move): `userIsYellow ? 'loser' : 'winner'`

**Why:** Old code hardcoded odd=loser (red), even=winner (yellow). When user is Yellow, their moves (odd steps) were drawn in red — wrong color.
