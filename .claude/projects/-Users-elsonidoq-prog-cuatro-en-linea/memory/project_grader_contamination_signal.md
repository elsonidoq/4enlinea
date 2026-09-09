---
name: project_grader_contamination_signal
description: "Two dispatched graders returning near-identical prose about the SAME cell for DIFFERENT records means one graded the wrong board — a contaminated grade is well-formed and passes every schema check"
metadata:
  node_type: memory
  type: project
  modified: 2026-09-01
---

**Trigger: you are reading per-case grade files from a fan-out of dispatched grader agents, and two
different cases come back citing the same cell / the same movestring / near-identical wording.**

That is not coincidence and not two records sharing a defect. It means **one grader read the wrong
rows** and graded another case's board while writing your case's id into the output.

**How it failed, measured (2026-09-01, 14-case smoke run).** `eval-29`'s grade file cited `c1r5`,
`entryCell=c1r5`, `tie.sharedCells=["c1r5"]`, `"double at c1r5, window c1r5-c2r6"`, column 2 height 3,
`pliesToEnd 8`. `eval-29`'s ACTUAL vector is `entryCell=c3r2`, `tie.sharedCells=[]`,
`lostResource.completingCell=null`. Every cited fact belonged to `pin-L6-lost-win-and-gave-one` —
which had been graded by a different agent in the same wave and whose own summary used the same cells.

**Why it is expensive and hides.** The grade file is schema-valid, has the right `id`, the right
`n_runs`, plausible per-run verdicts, and a confident, detailed `failure_summary`. Nothing downstream
can detect it. Consequences that session: a phantom **regression** (`eval-29` reported as A7b 1/3 →
3/3 when a clean re-grade returned **0/3** — it had IMPROVED), a corrupted headline (smoke A7 reported
25/42 instead of **22/42**), a wrong entry written into the append-only D-log, and a wrong
prioritisation built on top.

**The check, and it costs nothing:** cross the grade's cited cells against the record's own
`feature_vector` (`entryCell`, `completingCell`, `tie.sharedCells`, `requiredSet` specs). A cited cell
that appears nowhere in the record's vector is proof. Re-grade to a FRESH path and keep the
contaminated file as evidence rather than overwriting it.

**Do not read past a duplicate-looking summary.** In that session the two near-identical `c1r5`
paragraphs were both read and neither triggered a check; the contamination was only caught days-of-work
later when the owner asked a question about that specific case.

Related: [[project_eval_run_comparison_traps]] (triage labels are hypotheses, graders disagree ±20% on
A4/A7/G1), [[feedback_verify_at_the_source_layer]], [[project_fv_suff_answers_layer_trap]].
