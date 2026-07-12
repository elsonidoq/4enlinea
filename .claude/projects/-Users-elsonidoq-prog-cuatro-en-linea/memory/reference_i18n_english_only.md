---
name: reference-i18n-english-only
description: "App is English-only at runtime: i18n hardcodes lng:'en' and registers only the en bundle; es.json exists but is dead code"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 95d8f10b-efa5-4c4c-9f32-ebfe0b76221d
---

The app ships an `src/i18n/es.json` but it is **never wired in**: `src/i18n/index.js` hardcodes `lng: 'en'` and registers **only** the `en` resource bundle, and there is no in-app language switcher. Every Spanish string in the repo is dead code — adding/updating `es.json` keys does nothing at runtime.

**Trap:** when adding user-facing copy, don't assume translating into `es.json` "adds Spanish support" — it doesn't, and time spent keeping `es.json` in lockstep is wasted until the switcher exists (Epic 8 dutifully added `onboarding.*` keys to both `en.json` and `es.json`; the `es` ones are unreachable). Any acceptance scenario of the form "copy shown in the selected language" is only satisfiable *in principle* (copy correctly routes through `t()` keys) — it cannot be exercised because language selection doesn't exist.

**Why:** pre-existing, app-wide limitation (surfaced during Epic 8 QA, 2026-07-12) — not a per-feature gap.

**How to apply:** route all new copy through `t('...')` keys in `en.json` (that IS required and works); treat `es.json` edits as optional/speculative until a switcher lands. Wiring it up (register `es`, add a Settings language selector) is tracked in `docs/open_issues.md` OI-15. Unrelated to [[reference_en_json_duplicate_mistakes]] (that's a duplicate-key gotcha within `en.json`).
