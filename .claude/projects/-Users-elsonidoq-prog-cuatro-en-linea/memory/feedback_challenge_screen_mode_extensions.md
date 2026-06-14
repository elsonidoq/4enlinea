---
name: feedback_challenge_screen_mode_extensions
description: When adding mode props to ChallengeScreen, audit all direct uses of `category` — they need an effectiveCategory local
metadata:
  type: feedback
---

When `ChallengeScreen` is extended with a new mode that replaces the `category` prop (e.g. `lessonMode` using `confirmationCategory`), audit every direct reference to `category` inside the component and replace with `const effectiveCategory = newMode ? altCategory : category`.

**Why:** `category` is `undefined` in the new mode, causing i18n key construction to produce raw strings like `coach.undefined.prompt.0`. The bug is silent at prop-passing time and only surfaces at runtime in the UI.

**How to apply:** Grep `ChallengeScreen.jsx` for bare `category` references (not `drawCategory` or `effectiveCategory`) before shipping any new mode extension.
