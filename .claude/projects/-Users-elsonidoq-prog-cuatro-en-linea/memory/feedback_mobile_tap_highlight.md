---
name: feedback-mobile-tap-highlight
description: Any tappable non-button element needs WebkitTapHighlightColor + userSelect to avoid mobile selection highlight
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 56eea91c-1745-45da-a5fb-91adfc8dcc4d
---

Any clickable `<div>`, `<span>`, or `<a>` (i.e. non-native `<button>`) must include:

```js
WebkitTapHighlightColor: 'transparent',
userSelect: 'none',
```

**Why:** On mobile WebKit/Chrome, tapping a non-button interactive element shows a blue/gray tap flash (`-webkit-tap-highlight-color`) and can trigger a text-selection gesture (`user-select`). Seen on Column.jsx (board columns) and the DecodeC4 `<Link>` header.

**How to apply:** Add both properties whenever creating a new tappable div/span/link. Native `<button>` elements are exempt — browsers handle them correctly by default.
