---
name: project-new-puzzle-categories
description: "Locked design decisions for z_threat, claimeven, undercut, overcut, figure_7, j_shape puzzle categories"
metadata: 
  node_type: memory
  type: project
  originSessionId: 453f3557-7e22-47f5-9dc9-88917ff53395
---

Six puzzle categories. All use `interaction_mode = "single_move"`.

**New categories:**
- `z_threat` — parity control; count empty cells below threat (inclusive), odd = Z-threat; solver confirms unique winning column
- `claimeven` — Black responds in same column as Red's last move; validity confirmed by simulation
- `undercut` — player's threat is dead because opponent has a lower threat in the same column
- `overcut` — player has major threat above opponent's minor threat; opponent can't activate theirs
- `figure_7` — learner plays the 5th cell that completes the Figure-7 trap (4 cells already on board); highlight = 4 existing cells as `pattern_piece`
- `j_shape` — learner plays the 4th cell that establishes the J-shape (3 cells already on board, e.g. {D1,D3,E2}→E3); highlight = 3 existing cells as `pattern_piece`

**Key implementation decisions (locked):**
- figure_7 and j_shape puzzles ask the learner to CREATE the trap, not to win the game with 4-in-a-row.
- Claimeven subtype A/B is stored in `candidates.category_evidence` for curation; not exposed in `puzzles` table or player-facing API.
- `puzzles` table and `candidates` table both need `highlight_metadata jsonb` column. `candidates` also needs `category_evidence jsonb`. Schema per category defined in spec (Highlight Metadata Schema table).
- `figure_7` and `j_shape` have `highlight_metadata = { type: "cells", cells: [...pattern_piece roles...] }` (NOT null).
- `claimeven` highlight_metadata = null; simulation trace shown in curation via `category_evidence.simulation_trace`.
- `undercut` highlight uses roles `killing_threat` / `dead_threat`; `overcut` uses `major_threat` / `neutralised_threat`.
- `category_evidence` column is curation-only (candidates table); not copied to puzzles on approve.
- Curation UI uses existing highlight_cells sequence rendering for claimeven (simulation trace → loser/winner roles); no category-specific UI components needed.
- Multi-category classifier priority order is deferred to implementation time.

[[project-forced-win-refactor]]
[[project-interaction-mode-architecture]]
