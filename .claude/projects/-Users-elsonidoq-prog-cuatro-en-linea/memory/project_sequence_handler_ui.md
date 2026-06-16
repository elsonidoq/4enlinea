---
name: project_sequence_handler_ui
description: SequenceHandler component is GONE — forced_win sequence logic lives inline in ChallengeScreen.handleSequenceClick
metadata:
  type: project
---

`SequenceHandler.jsx` no longer exists. All forced_win multi-move interaction is handled inline in `ChallengeScreen.handleSequenceClick`.

`handleSequenceClick` drives a server-side state machine via `POST /api/puzzles/:id/sequence/move`:
- **`outcome === 'continue'`**: user's move correct but sequence unfinished. Rebuilds board, will animate both user's disc and AI's response disc via staged `setLastDrop` (spec 034 adds this behavior).
- **`outcome === 'success'`**: double-threat reached. Reads `data.threatCells` and maps them to `win` overlays. `win` overlays render as pulsing rings.
- **`outcome === 'wrong'`**: incorrect move.

`threatCells` from `/sequence/move` uses `{ c, r }` — **not** `{ col, row }` as the `/check` endpoint uses.

**Why:** SequenceHandler was removed during a prior refactor; `ChallengeScreen` absorbed its UI. The old memory described SequenceHandler as a live component with takeover-mode integration — that is fully stale.

**How to apply:** Any epic or spec touching forced_win interaction must look at `ChallengeScreen.handleSequenceClick`, not a standalone component. `frontend-conventions.md` was updated 2026-06-16 to document this. See also [[project_spec034_board_interaction]].
