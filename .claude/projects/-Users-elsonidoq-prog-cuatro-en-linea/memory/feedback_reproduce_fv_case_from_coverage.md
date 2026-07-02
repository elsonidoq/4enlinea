---
name: feedback_reproduce_fv_case_from_coverage
description: "to reproduce a single FV-sufficiency eval case, extract its row from the frozen coverage boards file — don't hand-build an input row"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0f207141-ad1a-4b24-85c2-71f0cd81ca0e
---

When reproducing ONE Feature-Vector Sufficiency case (e.g. `eval-28`) with `compute.mjs --llm`, extract that case's row from the **frozen coverage boards file** it came from (`server/scripts/boards_coverage_*.jsonl`) rather than hand-constructing an input row.

**Why:** the `id` (`eval-N`) is the row's 1-based index unless the row carries an explicit `id`. The coverage rows already carry `id` + the `selection.predicates` that produced them, so extracting the real row preserves the exact id/predicate provenance the grading run used. A hand-made row can silently get a different id and drops the predicate metadata.

**How to apply:** `sed -n '<N>p' boards_coverage_*.jsonl > one.jsonl` (or grep by movestring), then `compute.mjs --input one.jsonl --out … --llm`. The glossary is read fresh at prompt-build time, so a glossary edit takes effect without regenerating evidence. See [[project_reason_immediate_threat_phantom]], [[reference_eval_set_large_3_sparse_subset]].
