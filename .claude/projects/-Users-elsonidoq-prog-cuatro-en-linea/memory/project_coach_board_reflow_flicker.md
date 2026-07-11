---
name: project_coach_board_reflow_flicker
description: "The 'board flicker when coach speaks' is a LAYOUT REFLOW from accumulating CoachDialog bubbles, NOT a disc re-render — fix is the CoachDialog `fixed` prop"
metadata: 
  node_type: memory
  type: project
  originSessionId: aff1c763-adc9-4a00-bba8-7a49da992f08
---

The reported "board flickers / moves down when the coach speaks" (spec 046 US5) is a **layout reflow**, not
a React re-render/remount of discs. `ChallengeScreen` renders `<CoachDialog>` above the board in a
`flex column`; `CoachDialog` stacks **all** `messages`, so screens that **accumulate** them (append a
post-move feedback bubble under the prompt) grow the coach region and push the board — the next flow
sibling — down (measured: +37px). Concept/Socratic don't shift only because they *replace* their single
message.

**Fix = pass `fixed` to CoachDialog** (`<CoachDialog fixed …>`) — reserves a stable `height:140`
(inner `overflowY:auto`) so appended bubbles scroll instead of growing. Precedent: GameScreen/ReviewScreen
already do this. Documented in `frontend-conventions.md` ("Coach-message accumulation must not reflow the
board").

**Trap:** spec 046 Batch 4 misdiagnosed this as disc re-render and shipped `Board = memo(BoardImpl,
boardPropsAreEqual)` + `deriveBoardSignature` — a harmless perf/referential-stability change that does NOT
address the reflow. That memoization is retained but is not the flicker fix; don't cite it as such. Root
cause was only found by reproducing in a real browser and measuring `board.getBoundingClientRect().top`
before/after the feedback bubble appends (Constitution VI: reproduce-first — Batch 4 had no browser and
guessed). See [[OI-8]] (resolved) and [[project_lesson_progression_audio_traps]].
