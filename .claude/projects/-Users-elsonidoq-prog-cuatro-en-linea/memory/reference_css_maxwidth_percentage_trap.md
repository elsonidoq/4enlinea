---
name: reference-css-maxwidth-percentage-trap
description: "CSS width:100% resolves to auto when parent has only maxWidth, not explicit width"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 78676487-5228-49c6-b237-b6f52b85d9b1
---

`width: 100%` on a child resolves against its containing block's explicit `width`. If the containing block has only `maxWidth` (no `width` property), `width: 100%` resolves to `auto`. This causes flex children with `flex: 1 1 0` to collapse to 0px.

Observed in SplitReveal.jsx: the maxWidth wrapper had no `width`, so the Board's `width: 100%` resolved to `auto`, the 7 flex columns with `flex-basis: 0` collapsed, and the Board rendered at 64px (2×11px padding + 6×7px gaps only). Fix: always pair `maxWidth` with `width: '100%'` on the same element.
