---
name: project-claimeven-cooperative-ai-moves
description: cooperativeAiMoves is empty for all claimeven puzzles in the DB — no sequence data stored
metadata: 
  node_type: memory
  type: project
  originSessionId: b9f8f8e6-5d30-4a8e-965d-bb516d5e5874
---

All claimeven puzzles in the `puzzles` table have `cooperative_ai_moves = {}` (empty array). Any feature that relies on this field to build a post-answer sequence overlay will have no data to work with.

**Why:** The puzzle factory never populated this field for claimeven puzzles. The claimeven mirror move (Yellow plays same column as Red) is derivable algorithmically without stored data.

**How to apply:** For claimeven overlay features, derive the mirror sequence from the board state rather than reading `cooperativeAiMoves`. Do not assume this field is populated.
