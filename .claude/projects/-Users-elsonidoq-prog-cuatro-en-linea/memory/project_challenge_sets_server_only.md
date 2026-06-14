---
name: project_challenge_sets_server_only
description: challengeSets.js is server-side only — no frontend counterpart exists; SetPickerScreen reads from the API response
metadata:
  type: project
---

The challenge set registry lives at `connect-four/server/challengeSets.js` only. There is no `connect-four/src/lib/challengeSets.js`.

`SetPickerScreen.jsx` reads set data from the `GET /api/puzzles/counts` API response (which returns `challengeSets.js` entries verbatim). As of Epic 2b, entries use `displayNameKey`/`descriptionKey` (i18n keys resolved via `t()`) rather than literal `displayName`/`description` strings.

**Why:** Epic 2b's plan initially referenced a nonexistent frontend file, which would have caused a silent miss during implementation.

**How to apply:** When adding a new challenge set or modifying set metadata, edit `connect-four/server/challengeSets.js`. Do not create a frontend mirror. SetPickerScreen resolves display strings via `t(set.displayNameKey)`.
