---
name: project_patterns_blunders_done
description: "Patterns→Blunders pipeline — key traps and debugging guides"
metadata:
  type: project
---

## Debugging guide — blunders silently not populated

Check in order:
1. **Auth gate**: `insertGameBlunder()` returns silently when `row.user_id` is falsy. `loadUser` resolves to `req.user = null` on expired token/missing header/Supabase error — analyzed but never stored. Log `req.user` before the INSERT guard.
2. **Fire-and-forget**: INSERT errors go to server stdout only, never the browser.
3. **ReviewScreen session race**: analyze fetch runs in `useEffect` depending on `[id]`; if session is null on mount, no auth token. Log `session` before the fetch.
4. **scoreMove quality check**: if `quality === 'blunder'` never fires, `tagBlunder` never runs.

## Implementation traps

### `inverted` semantic confusion
`getGapAndFraming.inverted` is TRUE when the user played **SUBOPTIMALLY** (high penalty, scoreA ≥ scoreB). The spec's FR-008 said "inverted == true → optimal" — that was **wrong**. Use `contrast.isOptimal` from `selectContrastMove` to determine the path. Never rely on `inverted` to mean "optimal."

### `allowedSet = null` vs `allowedSet = []`
Passing `null` to `validateAnnotation` skips P5strong entirely. Passing `[]` **fails every `tg` zone** on P5strong. When all matched patterns are Tier 3 (position-global), pass `null`. When at least one Tier 1 or 2 entry exists, pass the normal array. Rule is in `explainContext.js` allowedSet derivation.

### classifyPattern inline list vs DETECTOR_REGISTRY
`classifyPattern` has an inline detector list (not imported from anywhere — would cause circular dep). It must stay in sync with the old DETECTOR_REGISTRY concept. A code comment marks this.

### classifyPattern returns Map — priority ordering
To pick one tag: `PRIORITY.find(tag => tagMap.has(tag))`. Do NOT use `[...tagMap.keys()]` (insertion order from Promise.all is non-deterministic).

