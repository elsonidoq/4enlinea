---
name: project_highlight_cell_colors
description: "Highlight cell step roles (loser/winner) must reflect the active player's color, not hardcoded red-for-odd/yellow-for-even."
metadata: 
  node_type: memory
  type: project
  originSessionId: fab31139-eb5c-4d6d-8c13-ff33752888f2
---

In `CurationWorkspace.jsx` (and the future learner's view), sequence highlight cells use `loser` (red) and `winner` (yellow) roles. Odd steps are the user's moves; even steps are the opponent's.

The role assignment must use `userIsYellow`:
- Odd step: `userIsYellow ? 'winner' : 'loser'`
- Even step: `userIsYellow ? 'loser' : 'winner'`

**Why:** The old code hardcoded odd=loser (red), even=winner (yellow). When the user is Yellow, their moves (odd steps) were drawn in red — wrong color.

**How to apply:**
- This applies to the generic `highlight_cells` processing block (for immediate_threat, forced_block, double_threat, forced_win, forbidden_columns).
- The claimeven simulation trace block is separate and unaffected — it assigns roles based on who physically plays in the simulation (Red always moves first there), which is always correct.
- Apply the same `userIsYellow`-aware role assignment in the learner's view.
