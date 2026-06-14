---
name: reference-z-threat-detection
description: Z-threat (zugzwang parity) detection algorithm and UI visualization spec
metadata: 
  node_type: memory
  type: reference
  originSessionId: 453f3557-7e22-47f5-9dc9-88917ff53395
---

**Detection:** For each column c with a winning threat at row T:
- Count = number of empty cells from current column height up to and including row T (inclusive)
- If Count is odd → Z-threat column (playing here forces opponent to eventually yield the winning cell)
- If Count is even → 0-threat (neutral, does not shift zugzwang)
- Solver must confirm the Z-threat column is a winning move
- Exactly one Z-threat column should be winning for puzzle uniqueness (filter during generation)

**UI visualization (decided, do not reopen):**
- Vertical capsule/stadium shape as border outline spanning all highlighted cells in the column:
  - Bottom: semicircle (mirrors bottom of a cell)
  - Middle: straight vertical sides
  - Top: semicircle (closes the shape)
- Pieces inside remain visible (outline only, not fill)
- Count badge floats above the board frame above that column
- Text explanation embeds the count: "Column X has N cells — an odd number forces your opponent's hand"

**Context:** Near-endgame positions (move_string.length >= ~28). Teaches parity manipulation without requiring full zugzwang theory.
