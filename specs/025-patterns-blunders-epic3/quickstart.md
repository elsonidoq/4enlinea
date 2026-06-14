# Quickstart: Epic 3 Implementation

## Overview

This epic replaces `explainSimulate`-based LLM grounding with a unified two-sided approach
using `tagBlunder` + `classifyPattern`. There are 18 implementation tasks plus quality gates.

## Task Ordering Summary

```
T01  Audits A–E (document removal surfaces — no code changes)
T02  Migration 035 (explanation_cache.template_version)
T03  Create server/blunderReasons.js (REASON_TEMPLATES + POSITIVE_TEMPLATES)
T04  Unit test FR-T01 (blunderReasons.test.js) — add to package.json
T05  Extend detectors — add cells to each detect* function
T06  Atomic: classifyPattern Map return + tagBlunder P() adapter + all callers
T07  Unit tests FR-T02 + FR-T03 — add to package.json
T08  Add buildBlunderExplainPrompt to llmCoachHelpers.js
T09  Rework buildExplainContext (do NOT delete old functions yet)
T10  Integration tests FR-T04 + FR-T05 — add to package.json
T11  Wire template_version='v2' in explanation_cache INSERT
T12  Remove old prompt builders from llmCoachHelpers.js (after T09+T10 pass)
T13  Adapt debug endpoint /api/debug/classify-all
T14  Adapt scripts/classify_all.mjs
T15  Confirm zero classifyAll hits → delete classifyAll from classifier.js
T16  Confirm zero explainSimulate hits → delete explainSimulate.js + test file
T17  Write corpus_annotation_check.mjs and run FR-T06 gate (≥95% on ≥50 positions)
T18  Update docs (server-conventions.md, db-schema.md, testing-conventions.md)
```

## Critical Constraints

1. **T05 before T06**: Detector cells output must exist before classifyPattern builds the Map.
2. **T06 is atomic**: classifyPattern change + P() adapter + all callers in one commit.
   Split commits break tagBlunder silently at runtime.
3. **T08 before T09**: buildBlunderExplainPrompt must exist before buildExplainContext calls it.
4. **T09 + T10 before T12**: Test the new path before deleting the old path.
5. **T13 + T14 before T15**: All classifyAll callers must be adapted before deletion.
6. **T16 last**: explainSimulate deletion requires zero-caller re-audit + DETECTOR_REGISTRY
   reconciliation (read both lists side-by-side, confirm parity).

## Test Commands

```bash
# Run a single test file:
node --test connect-four/tests/blunder/blunderReasons.test.js

# Run all fast tests (excludes candidate-generator):
cd connect-four && npm run test:fast
```

New test files must be added to both `test` and `test:fast` scripts in `connect-four/package.json`.

## Key Files

| File | Role |
|---|---|
| `connect-four/server/blunderReasons.js` | NEW — REASON_TEMPLATES + POSITIVE_TEMPLATES |
| `connect-four/server/classifier.js` | MODIFY — classifyPattern Map return; detector cells; P() |
| `connect-four/server/llmCoachHelpers.js` | MODIFY — add buildBlunderExplainPrompt; remove old builders |
| `connect-four/server/index.js` | MODIFY — buildExplainContext rework; debug endpoint; v2 insert |
| `connect-four/server/explainSimulate.js` | DELETE (T16) |
| `connect-four/server/explainSimulate.test.js` | DELETE (T16) |
| `connect-four/server/scripts/classify_all.mjs` | MODIFY (T14) |
| `connect-four/server/scripts/corpus_annotation_check.mjs` | NEW (T17) |
| `connect-four/server/migrations/035_explanation_cache_template_version.sql` | NEW (T02) |

## Verification Gates

- **FR-T01** (T04): REASON_TEMPLATES has exactly 23 entries, all non-empty.
- **FR-T02** (T07): classifyPattern returns non-empty cells for immediate_threat and double_threat.
- **FR-T03** (T07): tagBlunder cascade identical before and after P() adaptation.
- **FR-T04** (T10): buildExplainContext blunder path returns validateAnnotation-passing prompt.
- **FR-T05** (T10): buildExplainContext optimal path returns valid prompt; tagBlunder not called.
- **SC-003** (T16): `rg explainSimulate connect-four/server/` returns zero hits.
- **SC-004** (T15): `rg classifyAll connect-four/server/` returns zero hits.
- **FR-T06** (T17): ≥95% validateAnnotation pass rate over ≥50 DB-sourced blunder positions.
- **FR-T06b**: Manual quality gate — 10 sampled positions, no regression vs. cached explanations.
