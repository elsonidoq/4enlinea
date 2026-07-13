---
name: reference-i18n-english-only
description: "UPDATED 2026-07-12: switcher now exists (useLanguage hook + Settings selector, es bundle registered), but es.json is still a 2-of-24-section stub — app is still effectively English until the separate translation effort lands"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 95d8f10b-efa5-4c4c-9f32-ebfe0b76221d
---

**UPDATE 2026-07-12 (OI-15 Theme E, code half SHIPPED):** the claim below that `es.json` is "never wired in" / "dead code" is now only HALF true. `src/i18n/index.js` registers both `en` and `es` resource bundles and reads the initial `lng` from `readStoredLang()` (`connect-four/src/lib/useLanguage.js`, localStorage key `app_language`). Settings has a working language `<select>` (`SettingsScreen.jsx`, authenticated stack) wired to `useLanguage().changeLanguage`. Switching to `es` in the UI now genuinely works and persists.

**Remaining trap:** `es.json` is still only a 2-of-24-section stub (`setcard`, `onboarding`, plus the new `settings.language.*` keys added alongside the switcher). `fallbackLng: 'en'` means selecting `es` renders those few sections in Spanish and **everything else falls back to English** — so the app is still effectively English-only in practice, just for a different reason now (missing translations, not missing wiring). Full Spanish translation of the other 22 sections is a separate content effort (see `docs/open_issues.md` OI-15, now status PARTIAL, and Theme H). Do not assume adding an `es.json` key alone gives you a reachable Spanish string without checking it's under a section that's actually populated — and don't assume the switcher existing means the translation is complete.

**Original context (still true):** pre-existing, app-wide limitation surfaced during Epic 8 QA (2026-07-12); route all new copy through `t('...')` keys in `en.json` (required, works); keep `es.json` in lockstep only for keys you actually add — do not attempt to backfill the other 22 sections as a side effect of unrelated work. Unrelated to [[reference_en_json_duplicate_mistakes]] (that's a duplicate-key gotcha within `en.json`).
