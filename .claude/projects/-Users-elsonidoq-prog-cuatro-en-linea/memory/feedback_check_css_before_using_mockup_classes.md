---
name: feedback_check_css_before_using_mockup_classes
description: "Before using a CSS class name from the mockup, verify it exists in the app's CSS files — many mockup classes are not yet ported."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 40af3bb0-5c87-41a4-8c01-3200a52676f6
---

Before writing JSX that references a CSS class OR a CSS custom property (`var(--token-name)`) from the mockup or spec, grep for it in:
- `connect-four/src/styles/tokens.css`
- `connect-four/src/index.css`
- `connect-four/src/App.css`

If absent, use the correct app token or add inline styles. Do NOT assume names from mockups or spec text exist verbatim.

**Why (classes):** During Epic 7, an agent used `.modal-card`, `.sheet-backdrop`, `.btn`, `.btn-primary`, `.btn-ghost` from the mockup. None existed in the app.

**Why (tokens):** During Epic 2b, `PostSetSummaryScreen` was written with `var(--bg-challenges)` (spec wording). The actual token is `var(--bg-chal)` — screen rendered with no background. Always confirm token names in `tokens.css` before using them.

**Known token names** (confirm before using others):
- Challenges background: `--bg-chal` (NOT `--bg-challenges`)
- CSS animation keyframes: `backdropFade`, `modalPopIn`, `spin` exist in `index.css` as of Epic 2b

**How to apply:** Run `grep -n "token-name" connect-four/src/styles/tokens.css connect-four/src/index.css` before using any token. If missing, add it or use an inline value.
