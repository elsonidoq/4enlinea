---
name: feedback_artifacts_are_detritus_not_baselines
description: "Accumulated timestamped eval artifacts are usually debugging detritus, not curated baselines — the owner prefers one canonical file, regenerated clean"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 27fa7982-3633-4667-b874-6e6635ff6e81
  modified: 2026-08-06T15:54:28.968Z
---

When a directory holds many near-identical timestamped artifacts (eval sets, board corpora, answer
and grade files), do **not** default to treating them as a curated historical baseline worth
preserving. The owner's reading, 2026-08-06:

> *"the fact that there are several files tells me that it made sense to create those files in the
> first place, that might have been because the script was being developed and we found bugs along
> the way. I prefer to delete all old grades, as well as all old boards and start clean"*

He was right and I was wrong. I had argued for preserving 8 board corpora as the comparability
baseline the experiment doc's frozen-set invariant calls for. The direct evidence contradicted me:
two of them were generated **two minutes apart**, sharing 1 board out of ~32 — a re-run after a fix,
not a second baseline.

**How to tell the difference:** diff them. Near-identical timestamps + near-disjoint content =
debugging detritus. Genuinely different *purpose* = keep (of the 8, only two were real: one covering
the reason predicate universe, one covering the later, separate RENDER universe).

**Preference:** one canonical file at a **stable, non-timestamped path**, regenerated wholesale when
the inputs change. A timestamped filename can never be a source of truth — the next regeneration
renames it and breaks every consumer. Now realised as `connect-four/server/scripts/reason_corpus/`
(`boards.jsonl` + `evidence.jsonl` + README).

**Cheap de-risking beats preservation.** His actual worry was "I don't want to discover the boards
had an issue after paying for compute + grading". The answer was not keeping old files — it was the
free evidence-only pass (`compute.mjs` without `--llm`), which validates every board through the
current engine before a single LLM call.

Related: [[project_deep_reveal_eval_harness_gap]], [[feedback_measurement_expires]],
[[project_coverage_sampler_rarefill_trap]]
