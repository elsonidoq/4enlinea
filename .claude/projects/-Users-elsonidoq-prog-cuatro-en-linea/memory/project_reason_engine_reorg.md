---
name: project_reason_engine_reorg
description: 2026-06-30 reorg — reason_audit→reason_engine, from-vector eval on the reason vector, old FV still in production
metadata:
  type: project
---

2026-06-30 reorg of the blunder-reason tooling (commit on branch `stagging`):

- **`reason_audit/` → `server/scripts/reason_engine/`.** The live pieces moved (`reasonEngine.mjs`,
  `lib/`, `build_fixture.mjs`, `build_evidence.mjs`, `reason_fixture.jsonl`, `TOOLS/`); the research
  scaffolding (`cases/`, `verify_cases/`, `golden/`, `GOLDEN.jsonl`, `HANDOFF*`, `REPORT*`,
  `AUDITOR_BRIEF*`, `CATALOG.md`, `_QUARANTINE.md`, `PROMPT_verify_*`) was **deleted**. The move was
  depth-preserving so internal `../../` imports stayed valid. `reason_evidence_all.jsonl` did NOT move
  (stays at `server/scripts/`; the `/api/admin/reason` endpoint + `build_evidence` write/read it there).

- **The from-vector eval now runs on the REASON vector, not the old `toFeatureVector`.** Flow:
  `build_reason_eval_set.mjs` (predicate-coverage harvest) or `build_fv_eval_set.mjs` (freeze corpus
  subset) → `explain_from_vector.mjs` → `grade-fv-sufficiency`. The LLM-facing projection is
  `reasonNarratorVector.mjs::toNarratorVector` (strips raw per-column `scores` + fixture labels) —
  **shared with production** (production will call `computeReason` live + the same projection).

- **GOTCHA: the OLD feature vector still feeds PRODUCTION.** `toFeatureVector`/`buildExplainContext`
  in `server/explainContext.js` is the live coach behind `/api/explain*` (see [[project_explain_system]]).
  Do **not** delete it as "old FV" — only the *eval's* use of it was replaced. Migrating production to
  the reason engine is a separate, deferred effort.

- **`/admin/fv-suff` page = reason browser** (`/api/admin/reason` ← `reason_evidence_all.jsonl`); the
  legacy `/api/admin/fv-suff` endpoint is kept but dead (its frozen-vectors file was deleted). See
  [[project_admin_fv_suff_repurposed]].

- **`reasonEngine*.test.mjs` are now in `npm run test:fast`** (were run manually before).

Two script folders kept under one principle: `connect-four/scripts/` = DB/ops/asset (no `server/`
imports); `connect-four/server/scripts/` = server-runtime + eval (imports `server/`). Catalogue:
repo-root `README.md` "Scripts & tooling".
