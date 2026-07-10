# Contract: `SplitReveal` board-zoom stability across divider drag

Frontend behavior contract for `src/components/SplitReveal.jsx` and `src/lib/useDragSplit.js` (FR-022,
SC-009).

## Current mechanism (root cause of the bug, not a one-line typo)

- `useDragSplit.js` tracks `splitPct` (updated live on every `pointermove` during a drag) and derives
  `topPx = containerH * splitPct / 100`.
- `SplitReveal.jsx` derives the board's rendered `maxWidth` (`boardW`) **directly from `topPx`**:
  ```js
  const targetH = topPx ? topPx - 32 : 0;
  const boardW = targetH > 57 ? (7 * (targetH - 57)) / 6 + 64 : 0;
  ```
  Because `topPx` changes continuously while dragging, `boardW` — and therefore the board's on-screen
  zoom level — changes continuously while dragging. This is the component's existing, intentional
  "board fits the available pane height" behavior, not an edge-case glitch.

## Required behavior (this feature)

1. **`boardW` MUST be computed independently of live drag state.** It is recomputed only when the
   *container's real height* changes for a reason other than an active drag — i.e. on mount, and on a
   genuine container resize (window resize, orientation change, `ResizeObserver` firing for a reason
   other than the drag interaction itself already covers in `useDragSplit`). It is **not** recomputed
   inside `handleMove` (the pointermove handler) and **not** derived from `splitPct` while
   `isDragging === true`.
2. **Freezing mechanism**: compute `boardW` once from the pane height implied by `initialSplitPct` (the
   panel's opening split, before any user drag) and store it in a ref (or equivalent stable value);
   read from that frozen value for the board's `maxWidth` at all times, including during and after any
   drag gesture.
3. **The pane itself keeps resizing.** Only the *board's* rendered size is frozen — the top pane's
   `flex: 0 0 ${topPx}px` sizing is unchanged, so the divider still visibly moves and the pane still
   grows/shrinks with the drag exactly as today. When the pane becomes smaller than the frozen board
   width, the board area crops/scrolls (or the existing `overflow: hidden` + centered `margin: '0 auto'`
   simply leaves the board visually anchored) rather than shrinking the board; when the pane becomes
   larger, extra space appears around the board rather than the board growing to fill it.
4. **Full-range guarantee**: this must hold across the *entire* configured drag range (`minTopPct` to
   `maxTopPct`, i.e. the full 30–75%/30–80% band already defined in `useDragSplit`'s options), not just
   near the previously-buggy top of the range — SC-009 requires zoom stability "across the full range of
   the split-divider drag."

## Explicitly out of scope

- Changing `minTopPct`/`maxTopPct`/`initialSplitPct` defaults.
- Removing the pane's own resizing behavior (only the *board's* size decouples from the drag; the
  divider and pane heights keep responding to drag exactly as today).
- Any change to `useDragSplit`'s pointer/mouse event handling, drag-start/end lifecycle, or its
  `dividerProps` (`aria-*`, `role="separator"`) accessibility contract.

## Test strategy

- A drag-simulation test (or a manual QA step per `quickstart.md` US6) that drags the divider from
  `minTopPct` to `maxTopPct` and back, sampling the board's rendered width/zoom at several points;
  assert it is constant across all samples once the fix lands (SC-009: "100% of sampled drag
  sequences").
- A regression check that the pane's own height (`topPx`/`flex-basis`) still changes with the drag —
  confirming the fix decouples zoom specifically, not divider responsiveness generally.
