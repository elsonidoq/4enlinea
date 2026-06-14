---
name: reference-css-flex-basis-percentage-height-trap
description: "flex-basis as percentage doesn't resolve in flex containers without definite height"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 78676487-5228-49c6-b237-b6f52b85d9b1
---

Chrome does not treat a flex container's algorithmically-determined height as "definite" for resolving child `flex-basis: N%`. A child with `flex: 0 0 60%` inside a flex column container with `flex: 1` will not get 60% of the computed height — it falls back to content size.

Fix in useDragSplit.js: track container height in pixels via ResizeObserver and pass `topPx = containerH * splitPct / 100`, then use `flex: 0 0 ${topPx}px` on the child.

See also [[useDragSplit-implementation]] and [[SplitReveal-implementation]].
