---
name: feedback_plan_can_contradict_its_own_research
description: "In a speckit pipeline the artifacts drift from each other: plan.md paraphrased research.md and inverted it — and /speckit-tasks reads plan.md"
metadata:
  node_type: memory
  type: feedback
---

**Trigger: reviewing a `plan.md` (or generating tasks from one) when the same session also produced
`research.md` / `data-model.md`.**

Spec 059 (Epic 12, 2026-08-27): the planning agent wrote `research.md` first — correctly, citing
`mechanismExplainer.mjs:221`, matching the spec's acceptance criterion. It then restated the same
decision in `plan.md` **with the ordering inverted** (guard-aware check *after* the retry instead of
before), added a justification appealing to a settled decision that did not apply, and described
editing a call site that does not exist. `data-model.md` inherited the plan's version. Under it, the
bug the story exists to fix was **not fixed** — only its measurement improved.

**Why this is dangerous rather than merely untidy:** `/speckit-tasks` reads `plan.md`, not
`research.md`. The correct artifact is the one nobody downstream consumes. And the drift is invisible
to any single-artifact review: each file is internally coherent and confidently written.

**How to apply.**
- **Diff the plan against its own research on every load-bearing decision** — same seam, same ordering,
  same call site. Paraphrase between two files the same agent wrote is where inversions hide.
- **When they disagree, research is usually right** and the plan is the paraphrase. Reconcile the plan
  *to* the research, not the reverse — and check whether the same drift hit the other decisions.
- **A justification citing a rule is a claim about that rule.** Here "Settled decision 4 forbids it"
  was checkable in one read and false: the decision forbids a *second* retry/budget/trigger, and the
  fix changed which records trip the *existing* one. Open the rule before accepting that it blocks the
  correct design.
- **`plan.md`'s Source Code / file map is the coverage frontier** — `/speckit-tasks` reads the map, not
  the prose. In the same session a requirement (FR-011) had a fix task and no test task purely because
  it was absent from that map. Patch the map and `tasks.md` together, or the next regeneration
  reopens the hole. See [[feedback_plan_file_map_is_coverage_frontier]].

Related: [[feedback_verify_at_the_source_layer]] (the layer discipline this is an instance of),
[[feedback_subagent_reports_are_scoped_claims]].
