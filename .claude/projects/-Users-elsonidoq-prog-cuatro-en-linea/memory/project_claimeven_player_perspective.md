---
name: project_claimeven_player_perspective
description: "Claimeven puzzles must be shown from Yellow's perspective (player 2), not Red's — affects board coloring and player label in both curation and learner views."
metadata: 
  node_type: memory
  type: project
  originSessionId: fab31139-eb5c-4d6d-8c13-ff33752888f2
---

Claimeven is a second-player (Yellow) strategy. In all UI views that show a claimeven puzzle, the human player must be Yellow regardless of movestring length.

**Why:** Claimeven lets Yellow neutralize Red's threats by claiming even rows. Showing the board from Red's perspective inverts the disc colors and confuses the annotator/learner about which side they are playing.

**How to apply:**
- In `CurationWorkspace.jsx` (done 2026-05-22):
  - `userIsYellow = category === 'claimeven' || moveString.length % 2 === 1` drives the label.
  - Claimeven always shows YELLOW (detector enforces odd movecount, so the OR is redundant but explicit).
  - All other categories: even movestring → "You are RED", odd movestring → "You are YELLOW".
  - `buildBoard` uses **physical colors only** (`i % 2 === 0 → 'red', else → 'yellow'`). No color-flip.
- When implementing the **learner's view**: apply the same `userIsYellow` pattern exactly.
- The goal prompt should reference Yellow, not Red: "identify which columns Yellow can claim to guarantee a draw."
