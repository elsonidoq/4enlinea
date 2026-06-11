---
name: reference-valid-blunder-tags
description: VALID_BLUNDER_TAGS (server/blunderTags.js) is the source of truth for blunder pattern slugs — distinct from VALID_CATEGORIES; determines which mistakes.pattern.* i18n keys are required
metadata:
  type: reference
---

`server/blunderTags.js` exports `VALID_BLUNDER_TAGS` — 15 slugs including `suboptimal_move` and `drawing_move` (the most frequent classifier fallbacks). This is a **different set** from `VALID_CATEGORIES` (puzzle categories). Confusing them causes:
- Silent backend validation errors (rejecting valid blunder tags that aren't puzzle categories)
- Missing i18n labels: `mistakes.pattern.suboptimal_move` and `mistakes.pattern.drawing_move` are not in the default `en.json`; `CategoryListScreen` renders the raw key string for the most common blunder bucket if these are absent.

**Rule:** When adding or auditing `mistakes.pattern.*` i18n keys, iterate `VALID_BLUNDER_TAGS`, not `VALID_CATEGORIES`. The full key for each tag is `mistakes.pattern.<slug>`.
