# Research: Board Interaction Feedback

**Feature**: 034-board-interaction-feedback  
**Date**: 2026-06-16  
**Status**: Complete — no NEEDS CLARIFICATION items remain

---

## Summary

All implementation decisions were resolved during spec authoring and handoff context review. No external research was required. This document records the decisions and their rationale for traceability.

---

## Decision 1: Animation conditional placement in Board.jsx

**Question**: Where to add the `lastDrop` check — inside the disc `<div>` style object, or via a wrapper element, or via a CSS class?

**Decision**: Inline ternary on the `animation` property inside the existing disc `<div>`.

**Rationale**:
- The disc render already has `col` (loop variable) and `r` (inner loop variable) in scope.
- `lastDrop` is already a prop on `Board`.
- No structural change to the JSX. No additional element wrapping.
- The ternary is readable and explicit: `animation: lastDrop && col === lastDrop.c && r === lastDrop.r ? 'drop 0.5s ease-out' : 'none'`.

**Alternatives rejected**:
- CSS class approach: would require adding a class name string to the element, which is inconsistent with the existing all-inline-style convention in Board.jsx.
- Wrapper element: unnecessary nesting; Constitution §VII "flat is better than nested".

---

## Decision 2: Staged render mechanism for FR-006

**Question**: What mechanism to use for the 300 ms delay between user disc animation and AI disc animation?

**Decision**: `setTimeout` (native Web API), delay constant ~300 ms.

**Rationale**:
- `setTimeout` is the simplest correct mechanism for a one-shot deferred state update.
- The existing `board`, `heights`, and `lastDrop` state variables carry both intermediate and final board states — no new state variable needed.
- 300 ms = 60% of the 500 ms drop keyframe: the user disc is visually settling (near the bottom of its drop) when the AI disc starts animating. This feels natural and sequential.
- The delay constant should be defined as `const STAGED_DELAY_MS = 300` at the module level or as an inline literal — either is fine; the spec does not require it to be configurable.

**Alternatives rejected**:
- `requestAnimationFrame` chain: unnecessarily complex for a fixed-duration delay.
- CSS animation chaining: not applicable — disc renders are React-controlled, not CSS-sequenced.
- New `useEffect` + `useRef` to track pending AI move: overengineered; `setTimeout` captures all needed values in its closure.

---

## Decision 3: Row calculation for AI disc in staged render

**Question**: How to get the correct row for the AI disc's `lastDrop` in the `setTimeout` callback, without a stale closure on `heights` state?

**Decision**: Capture the intermediate heights object `hUser` (returned by `buildBoard(userPos)`) as a local variable, then compute `aiRow = hUser[data.aiCol]` before the `setTimeout` call.

**Rationale**:
- `buildBoard` is a pure function returning `{ board, heights }`. The returned `heights` is a fresh object — not the React state. It can be safely captured in the closure without staleness risk.
- React `setHeights(hUser)` schedules a state update; reading `heights` state inside `setTimeout` would return the pre-update value. The local `hUser` variable bypasses this.

**Implementation contract**:
```js
const { board: bUser, heights: hUser } = buildBoard(userPos);
setBoard(bUser);
setHeights(hUser);
setLastDrop({ c: col, r: heights[col] }); // heights = pre-move state (still valid)

const aiRow = hUser[data.aiCol];           // computed BEFORE setTimeout
setTimeout(() => {
  const { board: bFull, heights: hFull } = buildBoard(fullPos);
  setSeqPosition(fullPos);
  setBoard(bFull);
  setHeights(hFull);
  setLastDrop({ c: data.aiCol, r: aiRow }); // aiRow captured above — not stale
}, 300);
```

---

## Decision 4: `isSubmitting` behavior during 300 ms window

**Question**: `isSubmitting` is cleared in the `finally` block of `handleSequenceClick`. This clears before the `setTimeout` callback fires. Should we extend `isSubmitting` to cover the delay window?

**Decision**: Accept the current behavior per the spec ("isSubmitting guard already gates clicks during staged render window; no additional guards needed").

**Rationale**:
- The spec explicitly states this. Extending `isSubmitting` would be out of scope.
- A user tapping during the 300 ms window would trigger another `handleSequenceClick` call. The board at that point shows only the user's disc (step a), so the second tap would be on an intermediate board — a visible UI state the user can see. This is an edge case that the spec accepts.
- If the product later decides to prevent re-entry during the 300 ms window, the change is a one-liner: move `setIsSubmitting(false)` from `finally` into the `setTimeout` callback.

---

## Decision 5: FR-004 verification approach

**Question**: How to verify that the forced-win success branch correctly highlights both threat cells?

**Decision**: Live manual verification — open a `forced_win` puzzle, play to the success step, observe pulsing green ring overlays on both threat cells.

**Rationale**:
- The code at ChallengeScreen.jsx lines 436–438 is already implemented:
  ```js
  if (data.threatCells && data.threatCells.length > 0) {
    setOverlays(data.threatCells.map(cell => ({ c: cell.c, r: cell.r, type: 'win' })));
  }
  ```
- No code change means no test to write. Manual observation confirms the end-to-end path (server returns `threatCells`, client maps them to overlays, Board renders `win` type).
- The verifier must source a real `forced_win` puzzle from the database — never hand-construct a movestring.

---

## No open questions

All implementation decisions are resolved. The `plan.md` implementation design section fully specifies each change.
