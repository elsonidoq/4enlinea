---
name: feedback_check_css_before_using_mockup_classes
description: Before using a CSS class name from the mockup, verify it exists in the app's CSS files — many mockup classes are not yet ported.
metadata:
  type: feedback
---

Before writing JSX that references a CSS class from `docs/mvp/mockup/project/styles.css`, grep for that class in:
- `connect-four/src/styles/tokens.css`
- `connect-four/src/index.css`
- `connect-four/src/App.css`

If the class is absent, port it from the mockup or add inline styles. Do NOT assume that class names used in the mockup exist in the app.

**Why:** During Epic 7 implementation, an agent used `.modal-card`, `.sheet-backdrop`, `.btn`, `.btn-primary`, `.btn-ghost` from the mockup. None of them existed in the app's CSS. The modal rendered broken (inline, no overlay, dark inputs) until the classes were ported manually.

**How to apply:** Any agent implementing UI from the mockup should run `grep -rn "\.class-name" connect-four/src --include="*.css"` before relying on a mockup class. If missing, copy the rule from `docs/mvp/mockup/project/styles.css` and adapt as needed (see [[project_dark_global_theme]]).
