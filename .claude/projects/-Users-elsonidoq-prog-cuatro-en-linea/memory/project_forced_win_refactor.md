---
name: project-forced-win-refactor
description: forced_win category refactor — replace pre-stored sequence with parametrizable CompletionStrategy validated by solver at each step
metadata: 
  node_type: memory
  type: project
  originSessionId: 453f3557-7e22-47f5-9dc9-88917ff53395
---

## Durable gotchas

**`POST /api/puzzles/:id/check` returns 400 for sequence puzzles.** If `interaction_mode='sequence'`, the single-move check endpoint is disabled. Use `POST /api/puzzles/:id/sequence/move` instead.

**AI response is bitboard-only (no solver).** `ForcedWinStrategy` returns only the forced-block column via bitboard; no solver call is made for the AI response. Solver-guided AI was explicitly deferred.

**`interaction_mode` is set automatically by the approve endpoint** based on category — forced_win → `'sequence'`, everything else → `'single_move'`. Do not set it manually in puzzle data.

**`GET /api/puzzles/:id` returns `interactionMode` (camelCase)** — routing logic keys off this field to decide which interaction flow to use.

[[project-interaction-mode-architecture]]
[[project_new_category_wiring_checklist]]
