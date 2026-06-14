---
name: project_sequence_handler_ui
description: SequenceHandler owns its entire UI — dropping it inside another screen produces duplicated controls and SC-007 violations
metadata:
  type: project
---

`SequenceHandler.jsx` renders a complete self-contained UI: its own `Board`, goal-prompt header, success/fail banners, Reset button, and "Next puzzle →" button. The banners are **hardcoded English strings** (SC-007 violation, tracked as known deviation). `onNext` is a plain `onClick` with zero arguments — it fires only on success.

**Why:** Epic 2b discovered this when T006 planned to drop SequenceHandler inside `ChallengeScreen`'s full Toolbar/Coach/strip layout, which produced duplicated Next buttons and prompts.

**How to apply:** Any epic reusing SequenceHandler must decide on an integration boundary:
- **Takeover mode (MVP default):** ChallengeScreen suppresses its Toolbar, Tier-1 strip, and CoachDialog when `interaction_mode === 'sequence'`. SequenceHandler renders standalone.
- **Refactor mode:** Add i18n'd prompt/banner props and an external `onComplete(passed)` callback to SequenceHandler — removes its internal Next button and English banners. Required if the fail path needs to be recorded.

The fail path (`onNext(false)`) is unimplementable without refactoring — `onNext` has no args. Fail-recording for sequence puzzles is deferred post-MVP.
