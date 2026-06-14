---
name: project_patterns_blunders_done
description: "Patterns→Blunders pipeline Epics 1–3 done — classifyPattern/tagBlunder/explainContext shipped; key traps and debugging guides"
metadata:
  type: project
---

All three patterns-blunders epics are complete on branch `101-new-design`.

- **Epic 1** (spec 023): `classifyPattern` + `tagBlunder` exported; migrations 032–034 applied
- **Epic 2** (spec 024): production wiring; server-side INSERT via `insertGameBlunder`; `blunderTags.js`
- **Epic 3** (spec 025): `explainSimulate.js` deleted; `buildExplainContext` extracted to `explainContext.js`; 48/48 corpus gate

## Current architecture

- `server/classifier.js` — exports `classify()` (sync, 8 tags, user-move path) and `classifyPattern(ms, perspective, solver)` (async, Map result, 12 tags, AI-move path)
- `server/explainContext.js` — `buildExplainContext` with unified two-sided grounding
- `server/llmCoachHelpers.js` — `buildBlunderExplainPrompt`; old type-dispatch deleted
- `server/blunderTags.js` — `VALID_BLUNDER_TAGS` 15-tag Set, single source of truth
- `server/insertGameBlunder.js` — extracted INSERT helper: auth gate, 15-tag guard, 23505-as-success
- `server/blunderReasons.js` — `REASON_TEMPLATES` (23 entries) + `POSITIVE_TEMPLATES` (12 entries)

**Deleted in Epic 3:** `explainSimulate.js`, `/api/recommend-move`, `/api/coach/explain-simulate`, `src/pages/HomePage.jsx`, `RecommendCoach.jsx`, 4 CLI scripts.

## Epic 2 — debugging guide (blunders silently not populated)

Check in order:
1. **Auth gate**: `insertGameBlunder()` returns silently when `row.user_id` is falsy. `loadUser` resolves to `req.user = null` on expired token/missing header/Supabase error — analyzed but never stored. Log `req.user` before the INSERT guard.
2. **Fire-and-forget**: INSERT errors go to server stdout only, never the browser.
3. **ReviewScreen session race**: analyze fetch runs in `useEffect` depending on `[id]`; if session is null on mount, no auth token. Log `session` before the fetch.
4. **scoreMove quality check**: if `quality === 'blunder'` never fires, `tagBlunder` never runs.

## Epic 3 — implementation traps

### `inverted` semantic confusion
`getGapAndFraming.inverted` is TRUE when the user played **SUBOPTIMALLY** (high penalty, scoreA ≥ scoreB). The spec's FR-008 said "inverted == true → optimal" — that was **wrong**. Use `contrast.isOptimal` from `selectContrastMove` to determine the path. Never rely on `inverted` to mean "optimal."

### `allowedSet = null` vs `allowedSet = []`
Passing `null` to `validateAnnotation` skips P5strong entirely. Passing `[]` **fails every `tg` zone** on P5strong. When all matched patterns are Tier 3 (position-global), pass `null`. When at least one Tier 1 or 2 entry exists, pass the normal array. Rule is in `explainContext.js` allowedSet derivation.

### classifyPattern inline list vs DETECTOR_REGISTRY
`classifyPattern` has an inline detector list (not imported from anywhere — would cause circular dep). It must stay in sync with the old DETECTOR_REGISTRY concept. A code comment marks this.

### classifyPattern returns Map — priority ordering
To pick one tag: `PRIORITY.find(tag => tagMap.has(tag))`. Do NOT use `[...tagMap.keys()]` (insertion order from Promise.all is non-deterministic).

## Epic 1 — open items (minor)

- Pre-existing `classifier.test.js:83` failure (forbidden_columns → suboptimal_move) unrelated to these epics.
- T010 backfill: `node --env-file=connect-four/server/.env connect-four/server/scripts/reprocess_blunders.mjs` (best-effort, not a release gate).
- Migration 035 (`explanation_cache.template_version TEXT`) may not be applied to live DB.
