---
name: project_reason_engine_reorg
description: "2026-06-30 reorg — reason_audit→reason_engine, from-vector eval on the reason vector, old FV still in production"
metadata: 
  node_type: memory
  type: project
  originSessionId: 61e88999-b069-486a-ad42-b45dc5c3d949
---

2026-06-30 reorg of the blunder-reason tooling (commit on branch `stagging`):

- **`reason_audit/` → `server/scripts/reason_engine/`.** The live pieces moved (`reasonEngine.mjs`,
  `lib/`, `build_fixture.mjs`, `build_evidence.mjs`, `reason_fixture.jsonl`, `TOOLS/`); the research
  scaffolding (`cases/`, `verify_cases/`, `golden/`, `GOLDEN.jsonl`, `HANDOFF*`, `REPORT*`,
  `AUDITOR_BRIEF*`, `CATALOG.md`, `_QUARANTINE.md`, `PROMPT_verify_*`) was **deleted**. The move was
  depth-preserving so internal `../../` imports stayed valid. `reason_evidence_all.jsonl` did NOT move
  (stays at `server/scripts/`; the `/api/admin/reason` endpoint + `build_evidence` write/read it there).

- **The from-vector eval runs on the REASON vector, not the old `toFeatureVector`.** As of the
  **2026-06-30 consolidation** the 5 eval scripts collapsed to **2** (the old ones were DELETED):
  `select_boards.mjs --strategy {fixture|coverage}` (fixture = the old `build_fixture.mjs`, regenerates
  the SAMPLED rows of `reason_engine/reason_fixture.jsonl` — NOT byte-identical: the committed fixture
  also carries `route`/`expectedTag`/`expectedDirection` + a `d19-witness` row added by the D19/D20
  test commits, which the fixture strategy does not re-emit; coverage = the old predicate-harvest
  `build_reason_eval_set.mjs`, emits a board list — UPGRADED by D22 to a NAMED predicate universe with
  REQUIRED/PROVISIONAL partition, see [[project_reason_eval_set_selector]]) → `compute.mjs` (the SOLE place `computeReason`
  runs: writes `reason_evidence_<stem>.jsonl`; with `--llm` also `fv_suff_answers_<stem>_<ts>.jsonl`,
  reusing an existing evidence file so iterating the prompt/glossary never re-runs the solver) →
  `grade-fv-sufficiency` (UNCHANGED; `--vectors <answers file>` — each answers row embeds its
  `feature_vector`). Deleted: `build_fixture.mjs`, `build_evidence.mjs`, `build_reason_eval_set.mjs`,
  `build_fv_eval_set.mjs`, `explain_from_vector.mjs`. RUNBOOK: `server/scripts/RUNBOOK_fv_sufficiency.md`.
- **Evidence rows are now NESTED**: `{ id:"eval-N", evidence:{computeReason output incl raw scores},
  groundTruth:{case,gate,exhaustive,bucket,matches}|null }`. Because research labels live OUTSIDE
  `evidence`, `toNarratorVector(row.evidence)` strips ONLY `scores` — the old `RESEARCH_LABELS`
  strip-list was DELETED. The projection (`reasonNarratorVector.mjs::toNarratorVector`) is **shared
  with production** (production will call `computeReason` live + the same projection).

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
