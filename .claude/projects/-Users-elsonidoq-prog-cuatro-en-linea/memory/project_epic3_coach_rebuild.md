---
name: project_epic3_coach_rebuild
description: Epic 3 (coach explanation rebuild) — DONE 2026-06-08; 26/26 tasks; explainSimulate/classifyAll deleted
metadata: 
  node_type: memory
  type: project
  originSessionId: 18e36403-0088-4fe9-ac8f-9e73494f9b72
---

Epic 3 is **DONE** (2026-06-08). All 26 tasks completed at `specs/025-patterns-blunders-epic3/`.
Corpus gate: 48/48 (100%) — 2 rows short of 50 but far exceeds 95% threshold.
Manual gate FR-T06b: PENDING (human review of 10 LLM explanations vs cached).

**Why:** Replaced `explainSimulate`'s heuristic simulation with `tagBlunder`+`classifyPattern` grounding.

## What shipped

- `server/blunderReasons.js` — REASON_TEMPLATES (23 entries) + POSITIVE_TEMPLATES (12 entries)
- `server/explainContext.js` — extracted `buildExplainContext` with unified two-sided grounding
- `server/llmCoachHelpers.js` — `buildBlunderExplainPrompt` added; 8 old type-dispatch functions removed
- `server/classifier.js` — `classifyPattern` returns `Map<string, {cells}>`; `tagBlunder` P() adapted; `classifyAll` deleted
- Migration 035 — `explanation_cache.template_version TEXT` (nullable, no default)
- `server/scripts/corpus_annotation_check.mjs` — FR-T06 automated gate

## Deleted

- `explainSimulate.js` + `explainSimulate.test.js`
- `/api/recommend-move` endpoint (and rate-limiter line) + `/api/coach/explain-simulate`
- `src/pages/HomePage.jsx` + `src/components/RecommendCoach.jsx`
- 4 CLI scripts: `review_feedback.mjs`, `explain_move.mjs`, `explain_simulate.mjs`, `recommend_next_move.mjs`
- `tests/integration/explain_simulate.test.js`

## Traps discovered during implementation

### `inverted` semantic confusion
`getGapAndFraming.inverted` is TRUE when the user played **SUBOPTIMALLY** (high penalty, scoreA ≥ scoreB). The spec's FR-008 says "inverted == true → optimal" — this is **wrong**. The new `explainContext.js` correctly uses `contrast.isOptimal` from `selectContrastMove` to determine the path. Never rely on `inverted` to mean "optimal."

### `allowedSet = null` vs `allowedSet = []`
Passing `null` to `validateAnnotation` skips P5strong entirely. Passing `[]` **fails every `tg` zone** on P5strong. When all matched patterns are Tier 3 (position-global), always pass `null`. When at least one Tier 1 or Tier 2 entry exists, pass the normal array. This rule is in `explainContext.js`'s allowedSet derivation.

### explainContext.js extraction
`buildExplainContext` was extracted to `server/explainContext.js` for testability. Tests import from there directly. `server/index.js` has a thin `buildExplainContextActive` wrapper that injects the module-level solver. Don't inline it back.

## DB state
48 blunders with tag/direction in DB. Corpus gate passes at 100%. Migration 035 NOT yet applied to live DB.
`template_version = 'v2'` set on all new `explanation_cache` inserts (code change done).

## NOT in Epic 3
LLM model changes, annotation gate changes, Deep Reveal UI changes, explanation_cache reprocessing.
