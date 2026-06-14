---
name: feedback_navigator_params_spread
description: "Navigator spreads params as direct props, not a params object — screens must destructure directly"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e9d31930-26a1-4d72-b1b0-1e2118984139
---

The Navigator in `App.jsx` renders screens as `<ScreenComponent go={go} goBack={goBack} {...params} />` — navigation params are **spread as direct props**, not wrapped in a `params` object.

**Do NOT** destructure like: `function MyScreen({ go, goBack, params })` — `params` will be undefined and all route params will be lost in the unnamed rest.

**DO** destructure directly: `function MyScreen({ go, goBack, blunders, index, status })`.

**Why:** Caused a "No data" blank screen bug in `MistakeDetailScreen` where `blunders` and `index` were silently undefined because they were destructured as `const { blunders, index } = params || {}` but `params` was never passed as a named prop.
