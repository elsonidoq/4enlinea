---
name: project_epic_a_annotation_gate
description: Annotation gate (annotationGate.js) + coach explanation rebuild (llmCoachHelpers.js) — key internal contracts
metadata: 
  node_type: memory
  type: project
  originSessionId: 9d259a9e-bf72-4cc1-8334-5bb5bdb1e9c6
---

**Key internal contracts**:
- `buildExplainContext` returns `{ prompt, allowedSet, allMovesEqual }`. `allowedSet` is never in any HTTP response.
- AllowedSet shapes: CONCRETE-ELIGIBLE = `{ cells, zoneSpec }` (≥2 owner discs); ABSTRACT-ONLY = `{ col, parity, zoneSpec }` (no `cells` field).
- `findMajorThreatWindows` is the canonical group-level threat scanner — never use `getMajorThreatCells` for group operations.
- `classifyExplanationType` must run BEFORE simulation; Type 1 bypasses simulation entirely.

**Open**: Migration `031_deep_reveal_failures.sql` may still need to be applied to Supabase if not done during Epic A.
