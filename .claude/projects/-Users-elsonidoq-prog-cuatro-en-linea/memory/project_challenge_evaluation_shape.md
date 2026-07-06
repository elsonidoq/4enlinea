---
name: project_challenge_evaluation_shape
description: "ChallengeScreen evaluation state shape is polymorphic — forbidden_columns uses summaryLine (pre-rendered), others use summaryLineKey (i18n key)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 40af3bb0-5c87-41a4-8c01-3200a52676f6
---

`ChallengeScreen.jsx` uses an `evaluation` state object. Its shape differs by category:

- **Standard single-move categories** (immediate_threat, forced_block, etc.): `{ quality, badge, summaryLineKey, patternTag?, coachMood? }` — `summaryLineKey` is an i18n key passed to `t()` at render time.
- **forbidden_columns**: `{ quality, badge, summaryLine }` — `summaryLine` is a **pre-rendered string** (because the suboptimal case needs `{{found}}/{{total}}` interpolation that can't be deferred). No `summaryLineKey` field.

**Why:** `t(evaluation.summaryLineKey)` at render time can't pass interpolation values unless you also store them in evaluation. The pre-render approach avoids extending the evaluation shape further.

**How to apply:** The Tier-1 strip renders `evaluation.summaryLine ?? t(evaluation.summaryLineKey)` — always use this fallback pattern, never assume one field or the other is present. Any new category that needs i18n interpolation in its summary line should follow the `summaryLine` (pre-rendered) approach.


---

## (merged from `feedback_challenge_screen_mode_extensions` — When adding mode props to ChallengeScreen, audit all direct uses of `category` — they need an effectiveCategory local)

When `ChallengeScreen` is extended with a new mode that replaces the `category` prop (e.g. `lessonMode` using `confirmationCategory`), audit every direct reference to `category` inside the component and replace with `const effectiveCategory = newMode ? altCategory : category`.

**Why:** `category` is `undefined` in the new mode, causing i18n key construction to produce raw strings like `coach.undefined.prompt.0`. The bug is silent at prop-passing time and only surfaces at runtime in the UI.

**How to apply:** Grep `ChallengeScreen.jsx` for bare `category` references (not `drawCategory` or `effectiveCategory`) before shipping any new mode extension.


---

## (merged from `project_sequence_handler_ui` — SequenceHandler component is GONE — forced_win sequence logic lives inline in ChallengeScreen.handleSequenceClick)

`SequenceHandler.jsx` no longer exists. All forced_win multi-move interaction is handled inline in `ChallengeScreen.handleSequenceClick`.

`handleSequenceClick` drives a server-side state machine via `POST /api/puzzles/:id/sequence/move`:
- **`outcome === 'continue'`**: user's move correct but sequence unfinished. Rebuilds board, will animate both user's disc and AI's response disc via staged `setLastDrop` (spec 034 adds this behavior).
- **`outcome === 'success'`**: double-threat reached. Reads `data.threatCells` and maps them to `win` overlays. `win` overlays render as pulsing rings.
- **`outcome === 'wrong'`**: incorrect move.

`threatCells` from `/sequence/move` uses `{ c, r }` — **not** `{ col, row }` as the `/check` endpoint uses.

**Why:** SequenceHandler was removed during a prior refactor; `ChallengeScreen` absorbed its UI. The old memory described SequenceHandler as a live component with takeover-mode integration — that is fully stale.

**How to apply:** Any epic or spec touching forced_win interaction must look at `ChallengeScreen.handleSequenceClick`, not a standalone component. `frontend-conventions.md` was updated 2026-06-16 to document this. See also [[project_spec034_board_interaction]].
