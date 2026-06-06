---
name: project_epic_a_annotation_gate
description: Specs 021 (Epic A) + 022 (Epic B) — annotation gate & coach explanation rebuild both shipped
metadata: 
  node_type: memory
  type: project
  originSessionId: 9d259a9e-bf72-4cc1-8334-5bb5bdb1e9c6
---

## Epic A (spec 021) — shipped on branch `021-annotation-integrity`

**New files**:
- `server/migrations/031_deep_reveal_failures.sql` — append-only failure log table.
- `server/zoneParser.js` — ES module; exports `parseZoneSpecs`, `expandSpec`, `isValidSpec`.
- `server/annotationGate.js` — ES module; exports `validateAnnotation` (P1–P6, P5strong), `checkP1`–`checkP6`, `checkP5Strong`, `getWindowsThroughCell`, `isWindowBlocked`.
- `server/annotationGate.test.js` — 40+ tests via `node:test`.

**Modified**: `server/index.js`, `docs/architecture/{data-model,server-conventions}.md`.

## Epic B (spec 022) — shipped on branch `101-new-design`, 2026-06-04

All 20 tasks (T01a–T20) shipped. 311 tests pass (1 pre-existing classifier failure unrelated).

**Core changes**:
- `server/llmCoachHelpers.js` — added `findMajorThreatWindows`, `checkAllMovesEqual`, `getGapAndFraming`, `classifyExplanationType` (Types 1–4 priority-order), `selectTopGroups`, `buildAllowedSet`, `buildType1AllowedSet`, `buildGroupContextBlock`, `buildType4Prompt`, `buildType12Prompt`, `buildType3Prompt`. Deleted: `computeDeltaTable`, `buildExplainPrompt`, `buildPatternNarrative`, `PATTERN_NAMES`.
- `server/explainSimulate.js` — `collectLeaves` now records winning/draw-threat groups; `aggregateLeaves` produces per-group frequency Map; `explainSimulate()` returns `groups`. Added `findWinningGroup` helper.
- `server/annotationGate.js` — `validateAnnotation(explanation, board, allowedSet?)` extended with strong-P5 check; `checkP5Strong(zones, allowedSet)` exported.
- `server/index.js` — `buildExplainContext` fully rebuilt: classify-first flow (Type 1 skips simulation), all-moves-equal short-circuit, `allowedSet` passed to gate.
- `server/explainSimulate.test.js` — new, 7 tests.
- `server/llmCoachHelpers.test.js` — new, 37 tests.
- `docs/architecture/server-conventions.md` — updated with new function contracts, type classifier, allowedSet parameter.

**Key internal contracts**:
- `buildExplainContext` returns `{ prompt, allowedSet, allMovesEqual }`. `allowedSet` is never in any HTTP response.
- AllowedSet shapes: CONCRETE-ELIGIBLE = `{ cells, zoneSpec }` (≥2 owner discs); ABSTRACT-ONLY = `{ col, parity, zoneSpec }` (no `cells` field).
- `findMajorThreatWindows` is the canonical group-level threat scanner — never use `getMajorThreatCells` for group operations.
- `classifyExplanationType` must run BEFORE simulation; Type 1 bypasses simulation entirely.

**Open**: Migration `031_deep_reveal_failures.sql` may still need to be applied to Supabase if not done during Epic A.
