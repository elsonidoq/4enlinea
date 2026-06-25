---
name: reference_split_reveal_min_height
description: "SplitReveal silently breaks (board fills viewport, divider vanishes) if its containing flex item lacks minHeight:0"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 556308c8-ba9b-4921-a37e-198546d88a6b
---

Any flex item that contains `SplitReveal` (or any component backed by `useDragSplit`) **must** have `minHeight: 0` set explicitly.

**Why:** Flex items default to `minHeight: auto`, which prevents them from shrinking below their natural content size. Without `minHeight: 0`, the board area expands to the natural (unscrolled) content height instead of its flex-allocated height. `useDragSplit`'s `ResizeObserver` then measures this inflated height, computes an oversized `topPx`, and the board pane fills the entire visible viewport — the draggable divider is there, just scrolled out of sight.

**How to apply:** Whenever you nest `SplitReveal` inside a `flex: 1` (or any flex) item in a bounded-height column (e.g. `height: 100vh, overflow: hidden`), add `minHeight: 0` to that wrapping div:

```jsx
<div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
  <SplitReveal ... />
</div>
```

**Second gotcha — sibling competition:** If the outer bounded-height flex column has siblings adjacent to the `SplitReveal` wrapper (e.g. a glossary section, a footer), those siblings eat into the `100vh` budget AND can be clipped by `overflow: hidden` on the outer container. Move any such siblings **inside** the scrollable content area of `SplitReveal`'s bottom pane, or (for Mode 1 / no-split layouts) inside a `overflowY: auto` wrapper inside the flex item — never as a sibling of the flex item that contains `SplitReveal`.

**Related:** [[reference_css_flex_basis_percentage_height_trap]] — the separate issue where `flex-basis: %` fails on non-definite heights (solved by `useDragSplit`'s ResizeObserver); `minHeight: 0` is an additional required companion fix.
