---
name: project_draw_endpoint_snake_case
description: GET /api/puzzles/draw returns raw DB snake_case fields — components expecting camelCase need a callsite adapter
metadata:
  type: project
---

`GET /api/puzzles/draw` returns raw DB rows in snake_case: `move_string`, `interaction_mode`, `highlight_metadata`, `correct_col`, `user_player`, etc. It does NOT camelCase-transform the response.

Contrast with `GET /api/puzzles/:id`, which returns camelCase (`moveString`, `goalPrompt`, etc.).

**Why:** Epic 2b discovered this when planning to pass a `/draw` row directly to `SequenceHandler`, which reads `puzzle.moveString` and `puzzle.goalPrompt` — both undefined from a `/draw` row, silently breaking the sequence board.

**How to apply:** Any component that consumes a `/draw` row and passes it to a sub-component expecting camelCase needs a callsite adapter (e.g. `toSequenceHandlerShape(drawRow)`). Read the consuming component's field accesses before writing the adapter to catch all fields.
