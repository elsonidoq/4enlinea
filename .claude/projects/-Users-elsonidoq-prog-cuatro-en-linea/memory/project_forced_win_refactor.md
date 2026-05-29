---
name: project-forced-win-refactor
description: forced_win category refactor — replace pre-stored sequence with parametrizable CompletionStrategy validated by solver at each step
metadata: 
  node_type: memory
  type: project
  originSessionId: 453f3557-7e22-47f5-9dc9-88917ff53395
---

**IMPLEMENTED (2026-05-14)** — spec 007-interaction-mode, branch `007-interaction-mode`.

The `CompletionStrategy` refactor is complete. All tasks T001–T013 done; T014 (manual golden path) remains.

**What was built:**
- Migration 014 applied: `interaction_mode TEXT DEFAULT 'single_move'` on `public.puzzles`; all 5 existing `forced_win` puzzles deleted (they used stored sequences)
- `server/completionStrategies.js`: `ForcedWinStrategy.validateMove(position, col)` — bitboard-only, no solver. `getAiResponseCol(posAfterLearnerMove)` returns the forced-block column.
- `POST /api/puzzles/:id/sequence/move` endpoint: validates position, tier-gates forced_win, returns `{outcome: 'continue'|'success'|'fail', aiCol?, reason?}`
- `GET /api/puzzles/:id` now returns `interactionMode` field
- `POST /api/puzzles/:id/check` returns 400 if `interaction_mode='sequence'`
- Approve endpoint sets `interaction_mode` based on category
- `SequenceHandler.jsx`: multi-move React component that calls the endpoint and manages state
- `PuzzlesPage.jsx` routes to `SequenceHandler` when `puzzle.interactionMode === 'sequence'`
- All 58 tests pass

**Key implementation decision:** AI plays only the forced-block column (bitboard, no solver). FR-009 defers solver-guided or softmax AI response to a future iteration.

**Why:** Stored sequences were too strict (forced branching); bitboard validation accepts any valid forcing move.

**How to apply:** forced_win puzzles in `public.puzzles` will have `interaction_mode='sequence'`; approve endpoint sets this automatically.

[[project-interaction-mode-architecture]]
[[project-new-puzzle-categories]]
