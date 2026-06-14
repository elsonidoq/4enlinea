---
name: project-interaction-mode-architecture
description: New interaction_mode field on puzzles — single_move (current) and sequence (multi-move with AI opponent) — foundation for future puzzle types
metadata: 
  node_type: memory
  type: project
  originSessionId: 453f3557-7e22-47f5-9dc9-88917ff53395
---

Add `interaction_mode` to puzzle schema: `single_move` (current default, all existing categories) and `sequence` (multi-move with AI opponent, for `forced_win` refactor and future types).

`PuzzlesPage` routes to different interaction handlers based on mode. This is a cross-cutting architectural change that enables extensible puzzle completion criteria.

**Why:** The current model hardcodes single-move evaluation everywhere. As categories like forced_win (sequence of moves) and claimeven simulation (post-solve demo) are added, the page needs to handle different interaction flows without a full rewrite.

**How to apply:** This must be in place before implementing `forced_win` refactor or any future multi-move puzzle category. New DB migration needed to add the column.

[[project-forced-win-refactor]]
[[project-new-puzzle-categories]]
