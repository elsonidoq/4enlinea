---
name: project_dark_global_theme
description: The app's index.css sets a dark global theme — light-background components need color-scheme and scoped overrides.
metadata:
  type: project
---

`connect-four/src/index.css` applies a dark theme globally:
- `:root { color-scheme: dark; color: var(--text); }` where `--text: #e2eaf5` (light text)
- `h1, h2, h3 { color: var(--text); }` — headings are light-colored
- `input` elements inherit dark background from the browser's dark color-scheme

**Why:** The app has a dark UI overall; the mockup's light modal card was a new exception.

**How to apply:** Any light-background component (modal, card, bottom sheet) placed inside this dark context needs:
1. `color-scheme: light` on the container element — fixes inputs and browser-native controls
2. Scoped CSS overrides for headings: `.modal-card h1, .modal-card h2, .modal-card h3 { color: var(--ink); }`
3. Explicit `background: #fff; color: var(--ink)` on inputs if they don't inherit correctly

The fix for the AuthModal was adding these three lines to `.modal-card` in `index.css`:
```css
color-scheme: light;
/* and scoped rules: */
.modal-card h1, .modal-card h2, .modal-card h3 { color: var(--ink); }
.modal-card input { background: #fff; color: var(--ink); }
```

Also note: mockup `styles.css` uses `position: absolute` for overlays (works within the bounded mockup container). The real app needs `position: fixed` for full-viewport overlays.
