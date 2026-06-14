---
name: reference-tactical-pattern-definitions
description: "Formal definitions for figure_7, j_shape, undercut, overcut puzzle detection — canonical coordinates and predicates"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 453f3557-7e22-47f5-9dc9-88917ff53395
---

**J-shape** (category slug: `j_shape`):
- Canonical: player owns {D1, D3, E2, E3} = {col=3 row=0, col=3 row=2, col=4 row=1, col=4 row=2}
- Mirror: {D1, D3, C2, C3} = {col=3 row=0, col=3 row=2, col=2 row=1, col=2 row=2}
- Mirror transform: f(col) = 6 - col
- Generates minor threats at F3 (horizontal) and G4 (diagonal) from canonical anchor
- Failure: required completion cells off-board, or opponent controls pivot row (overcutting)
- Full definitions in `docs/Connect_4_Training_Material_Design_2026-05-14.md` Section D

**Figure-7** (category slug: `figure_7`):
- Diagonal: {(x,y), (x+1,y+1), (x+2,y+2)} owned by player
- Horizontal: {(x+2,y+2), (x+3,y+2), (x+4,y+2)} owned by player
- Intersection: (x+2,y+2) is owned (not empty)
- Mirror: f(col) = 6 - col applied to all coordinates
- Full definitions in `docs/Connect_4_Training_Material_Design_2026-05-14.md` Section E

**Figure-7 detector invariants (hard-derived, costly to re-derive):**
- **Valid completing cells**: either the junction (x+2,y+2) when empty, OR the arm cell immediately adjacent to an already-placed junction (e.g. (x+3,y+2) if (x+2,y+2) is placed). The far arm end (x+4,y+2) is NOT a valid completing cell — it creates a horizontal-extension above-gravity threat that passes the gravity check but is not a figure-7 trap.
- **Zugzwang vs fork**: After placing the completing cell, count gravity-top threats (t.row == colHeights[t.column] with incremented height). **At most 1 gravity-top threat** is allowed. Two or more means it's a direct fork — the figure-7 shape is present but the win mechanism is a plain double-threat, not zugzwang. Example false-positive: `41432254553` — the horizontal arm extends to an empty far column, producing 2 gravity-top + 1 above-gravity threat.
- **Above-gravity required**: at least 1 threat must be strictly above gravity (t.row > colHeights[t.column]). Without this, both threats are immediately playable (pure fork, no zugzwang element).

**Undercut** (category slug: `undercut`):
- Player has threat at (col, R); opponent has threat at (col, R-i) where i > 0, same column
- Player's threat is dead: building toward it hands opponent their win first
- Puzzle: avoid playing in that column; correct = any column not activating opponent's kill
- Highlight: dead threat cell (player's) + killing threat cell below (opponent's), distinct roles

**Overcut** (category slug: `overcut`):
- Player has major threat at (col, R+i); opponent has minor threat at (col, R), same column
- Opponent cannot activate their lower threat without enabling player's win above
- Puzzle: play into the column to exploit this
- Highlight: both threat cells with distinct roles

**KB entries (2026-05-17):**
- J-shape: `docs/knowledge-base/allen-j-configuration.md` (canonical, Allen-sourced). Supersedes the J-shape section above for implementation work.
- Figure-7: `docs/knowledge-base/community-figure-7.md` (canonical: false). Hard-derived invariants are in `known_limitations` and `formal_predicate`. Solver-verified worked example: `54333541514` (Red wins). Solver-verified false positives: `41432254553` (far-arm-end), `33344646555` (direct fork / both threats gravity-top).

**Research documents:**
- `docs/Connect_4_Training_Material_Design_2026-05-14.md` — Sections D (J-shape), E (Figure-7), G/H (under/overcut)
- `docs/Connect_4_Training_Material_Generation_2026-05-14.md` — Allen's T1-T7 transformation rules for threat interactions
