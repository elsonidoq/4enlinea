---
name: reference-i18n-english-only
description: "UPDATED 2026-07-13: switcher shipped AND es.json now has FULL key-parity with en.json (spec 049), in Argentinian voseo — Spanish is genuinely complete except for lesson-slide content (OI-18) and stray hardcoded strings (OI-19)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 95d8f10b-efa5-4c4c-9f32-ebfe0b76221d
---

**UPDATE 2026-07-12 (OI-15 Theme E, code half SHIPPED):** the claim below that `es.json` is "never wired in" / "dead code" is now only HALF true. `src/i18n/index.js` registers both `en` and `es` resource bundles and reads the initial `lng` from `readStoredLang()` (`connect-four/src/lib/useLanguage.js`, localStorage key `app_language`). Settings has a working language `<select>` (`SettingsScreen.jsx`, authenticated stack) wired to `useLanguage().changeLanguage`. Switching to `es` in the UI now genuinely works and persists.

**UPDATE 2026-07-13 (spec 049, OI-15 CLOSED):** `es.json` now has **full nested key-parity** with `en.json` — all sections translated, guarded by `tests/unit/i18nKeyParity.test.js` (fails on any key divergence). The translation is **Argentinian/Rioplatense voseo** (see [[project_spanish_is_argentinian_voseo]]) — do NOT regress it to neutral tú-Spanish. Two remaining Spanish gaps are backlogged, NOT in `es.json`: lesson-slide body content has no i18n mechanism (OI-18), and some hardcoded-English JSX strings were never wired to `t()` so the parity guard can't see them (OI-19). Rule for new copy: add the key to BOTH `en.json` and `es.json` (Spanish in voseo) — the parity test enforces this.

**Original context (still true):** pre-existing, app-wide limitation surfaced during Epic 8 QA (2026-07-12); route all new copy through `t('...')` keys in `en.json` (required, works); keep `es.json` in lockstep only for keys you actually add — do not attempt to backfill the other 22 sections as a side effect of unrelated work. Unrelated to [[reference_en_json_duplicate_mistakes]] (that's a duplicate-key gotcha within `en.json`).
