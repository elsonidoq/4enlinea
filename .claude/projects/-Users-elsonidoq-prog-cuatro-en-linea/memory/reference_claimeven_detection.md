---
name: reference-claimeven-detection
description: "Claimeven board detection algorithm — simulation-based, exact, no false positives"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 453f3557-7e22-47f5-9dc9-88917ff53395
---

**Algorithm:** Run a full-game simulation from the candidate position:
1. Red plays solver-optimal move
2. Black responds in the same column, one row above (claimeven response)
3. If Red plays the last cell of a column (Black cannot respond there) → NOT claimeven
4. Repeat until game over
5. If Black wins → position IS claimeven

This is the ground truth — no static structural check needed. The simulation is exact because it tests the actual strategy against optimal opposition.

**Performance:** O(remaining moves) solver queries per candidate (~20 queries for mid-game). Acceptable for puzzle generation.

**Puzzle format:** Single-move, Black to move. Correct answer = column Red played in on the previous move. UI highlights Red's last cell as `trigger` role so the user sees why that column is the answer.

**No uniqueness enforcement** — positions where multiple columns are valid claimeven responses are acceptable. Prefer unique-answer positions first during curation (future filter).
